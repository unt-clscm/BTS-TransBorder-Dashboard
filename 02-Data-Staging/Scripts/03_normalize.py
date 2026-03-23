#!/usr/bin/env python3
"""
03_normalize.py — Normalize BTS TransBorder raw data into cleaned CSVs.

Handles:
  - Modern era (2007-2025): CSV files from 01-Raw-Data/unpacked/modern/
  - Legacy era (1993-2006): DBF files from 01-Raw-Data/unpacked/legacy/
  - 2020 special case: Oct derived via subtraction from annual totals
  - Legacy anomalies:
    * D5...S files (1993-Mar 1994): State of Origin variant, mapped to D5A
    * DO9 typo (May 1994): letter O instead of digit 0, auto-corrected
    * R-files (1995): revised replacements for erroneous D-files, preferred over originals
    * X-files (1995): delta/missing records, skipped (R-files contain full corrected data)
    * D5B/D6B (1994-2002): EXCLUDED — use NTAR regions instead of state codes,
      incompatible with DOT1 state×port structure. D5A/D6A cover the same exports.

Output (in 02-Data-Staging/cleaned/):
  - dot1_state_port.csv       (State × Port, 1993-2025)
  - dot2_state_commodity.csv   (State × Commodity, 1993-2025)
  - dot3_port_commodity.csv    (Port × Commodity, 2007-2025 only)
  - ../docs/unknown_codes_report.txt

Usage:
  python 03_normalize.py
"""

import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

import pandas as pd
from dbfread import DBF

# --- Paths -----------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
STAGING_DIR = SCRIPT_DIR.parent
PROJECT_ROOT = STAGING_DIR.parent
UNPACKED_MODERN = PROJECT_ROOT / "01-Raw-Data" / "unpacked" / "modern"
UNPACKED_LEGACY = PROJECT_ROOT / "01-Raw-Data" / "unpacked" / "legacy"
CONFIG_DIR = STAGING_DIR / "config"
CLEANED_DIR = STAGING_DIR / "cleaned"
DOCS_DIR = STAGING_DIR / "docs"

# --- Constants ----------------------------------------------------------------

KG_PER_SHORT_TON = 907.185

# Modern raw column names per DOT table
DOT1_RAW_COLS = [
    "TRDTYPE", "USASTATE", "DEPE", "DISAGMOT", "MEXSTATE", "CANPROV",
    "COUNTRY", "VALUE", "SHIPWT", "FREIGHT_CHARGES", "DF", "CONTCODE",
    "MONTH", "YEAR",
]
DOT2_RAW_COLS = [
    "TRDTYPE", "USASTATE", "COMMODITY2", "DISAGMOT", "MEXSTATE", "CANPROV",
    "COUNTRY", "VALUE", "SHIPWT", "FREIGHT_CHARGES", "DF", "CONTCODE",
    "MONTH", "YEAR",
]
DOT3_RAW_COLS = [
    "TRDTYPE", "DEPE", "COMMODITY2", "DISAGMOT", "COUNTRY", "VALUE",
    "SHIPWT", "FREIGHT_CHARGES", "DF", "CONTCODE", "MONTH", "YEAR",
]

# Dimension columns (non-value) per DOT table — used for Oct 2020 derivation
DOT1_DIM_COLS = [
    "TRDTYPE", "USASTATE", "DEPE", "DISAGMOT", "MEXSTATE", "CANPROV",
    "COUNTRY", "DF", "CONTCODE",
]
DOT2_DIM_COLS = [
    "TRDTYPE", "USASTATE", "COMMODITY2", "DISAGMOT", "MEXSTATE", "CANPROV",
    "COUNTRY", "DF", "CONTCODE",
]
DOT3_DIM_COLS = [
    "TRDTYPE", "DEPE", "COMMODITY2", "DISAGMOT", "COUNTRY", "DF", "CONTCODE",
]

VALUE_COLS = ["VALUE", "SHIPWT", "FREIGHT_CHARGES"]

# Cleaned output column names per DOT table
DOT1_OUT_COLS = [
    "Year", "Month", "TradeType", "StateCode", "State", "PortCode", "Port",
    "Mode", "MexState", "CanProv", "Country", "TradeValue", "Weight",
    "FreightCharges", "DF", "ContCode",
]
DOT2_OUT_COLS = [
    "Year", "Month", "TradeType", "StateCode", "State", "HSCode",
    "Commodity", "CommodityGroup", "Mode", "MexState", "CanProv", "Country",
    "TradeValue", "Weight", "FreightCharges", "DF", "ContCode",
]
DOT3_OUT_COLS = [
    "Year", "Month", "TradeType", "PortCode", "Port", "HSCode",
    "Commodity", "CommodityGroup", "Mode", "Country", "TradeValue", "Weight",
    "FreightCharges", "DF", "ContCode",
]

# Month name to number mapping for legacy filenames
MONTH_NAME_MAP = {
    "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6,
    "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12,
}

# --- HS Commodity Groups -----------------------------------------------------

HS_GROUP_RANGES = [
    ((1, 5), "Live Animals & Animal Products"),
    ((6, 14), "Vegetable Products"),
    ((15, 15), "Animal or Vegetable Fats & Oils"),
    ((16, 24), "Foodstuffs, Beverages & Tobacco"),
    ((25, 27), "Mineral Products"),
    ((28, 38), "Chemical Products"),
    ((39, 40), "Plastics & Rubber"),
    ((41, 43), "Raw Hides, Skins & Leather"),
    ((44, 46), "Wood & Wood Products"),
    ((47, 49), "Pulp, Paper & Paperboard"),
    ((50, 63), "Textiles & Apparel"),
    ((64, 67), "Footwear, Headwear & Umbrellas"),
    ((68, 70), "Stone, Ceramic & Glass Products"),
    ((71, 71), "Precious Metals & Stones"),
    ((72, 83), "Base Metals & Articles"),
    ((84, 85), "Machinery & Electrical Equipment"),
    ((86, 89), "Transportation Equipment"),
    ((90, 92), "Optical, Medical & Precision Instruments"),
    ((93, 93), "Arms & Ammunition"),
    ((94, 96), "Miscellaneous Manufactured Articles"),
    ((97, 97), "Works of Art & Antiques"),
    ((98, 99), "Special Classification Provisions"),
]


def get_commodity_group(hs_code):
    """Map HS 2-digit code string to commodity group name."""
    try:
        code = int(str(hs_code).strip())
    except (ValueError, TypeError):
        return None
    for (lo, hi), name in HS_GROUP_RANGES:
        if lo <= code <= hi:
            return name
    return None


# --- Config loading -----------------------------------------------------------

def load_json(name):
    with open(CONFIG_DIR / name, encoding="utf-8") as f:
        return json.load(f)


def load_configs():
    """Load all lookup config files. Returns a dict of lookup dicts."""
    return {
        "mode": load_json("mode_codes.json"),
        "commodity": load_json("commodity_codes.json"),
        "country": load_json("country_codes.json"),
        "trade_type": load_json("trade_type_codes.json"),
        "state": load_json("state_codes.json"),
        "port": load_json("schedule_d_port_codes.json"),
        "can_prov": load_json("canadian_province_codes.json"),
        "mex_state": load_json("mexican_state_codes.json"),
        # NOTE: schema_mappings.json is a reference data dictionary, not a config
        # driver. Normalization logic is hardcoded (FIELD_MAPPINGS, DROP_FIELDS,
        # LEGACY_TABLE_INFO, etc.) because the conditional behavior is too complex
        # for a flat config. The JSON documents field semantics and known issues.
    }


# Track unknown codes globally
unknown_codes = defaultdict(set)


def lookup(configs, category, code, field="name"):
    """Look up a code in configs. Track unknowns. Return decoded value or raw code."""
    if code is None or (isinstance(code, float) and pd.isna(code)):
        return None
    key = str(code).strip()
    if key == "" or key.lower() == "nan":
        return None
    table = configs[category]
    if category == "port":
        entry = table.get(key)
        if entry:
            return entry.get(field, key)
        unknown_codes["port"].add(key)
        return key
    value = table.get(key)
    if value is not None:
        return value
    unknown_codes[category].add(key)
    return key


# ===============================================================================
#  MODERN DATA (2007-2025)
# ===============================================================================

def find_modern_ytd(year_dir, dot_prefix, year):
    """Find the best YTD CSV for a given dot prefix and year.
    Returns (filepath, source_description) or (None, None)."""
    files = os.listdir(year_dir)
    # Pattern: dot1_ytd_MMYY.csv (month digits + 2-digit year)
    yy = str(year)[-2:]
    pattern = re.compile(
        rf"^{re.escape(dot_prefix)}_ytd_(\d{{2}}){re.escape(yy)}\.csv$",
        re.IGNORECASE,
    )
    best_month = -1
    best_file = None
    for f in files:
        m = pattern.match(f)
        if m:
            month = int(m.group(1))
            if month > best_month:
                best_month = month
                best_file = f
    if best_file:
        return year_dir / best_file, f"{best_file} (YTD month {best_month})"
    return None, None


def load_modern_csv(filepath, expected_cols=None):
    """Load a modern-era CSV into a DataFrame."""
    df = pd.read_csv(filepath, encoding="utf-8-sig", dtype=str, low_memory=False)
    df.columns = df.columns.str.strip().str.upper()
    # Ensure numeric columns are numeric
    for col in VALUE_COLS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    for col in ["TRDTYPE", "DISAGMOT", "MONTH", "YEAR"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").astype("Int64")
    return df


def find_monthly_files(year_dir, dot_prefix, year, start_month):
    """Find individual monthly CSV files for months >= start_month.
    Returns list of (filepath, month_num) tuples."""
    yy = str(year)[-2:]
    results = []
    for month in range(start_month, 13):
        mm = f"{month:02d}"
        pattern = f"{dot_prefix}_{mm}{yy}.csv"
        for f in os.listdir(year_dir):
            if f.lower() == pattern.lower():
                results.append((year_dir / f, month))
                break
    return results


def load_modern_year(year, dot_prefix, raw_cols):
    """Load one year of modern data for a given DOT table.
    Returns DataFrame with raw column names, or None.

    Strategy:
      1. If year is 2020, use special Oct-derivation logic.
      2. Otherwise, find the best (highest-month) YTD file.
      3. If the YTD doesn't cover all 12 months, supplement with
         individual monthly files for the remaining months.
    """
    year_dir = UNPACKED_MODERN / str(year)
    if not year_dir.exists():
        return None

    if year == 2020:
        return load_2020_data(dot_prefix, raw_cols)

    filepath, desc = find_modern_ytd(year_dir, dot_prefix, year)
    if filepath is None:
        print(f"  WARNING: No YTD file for {dot_prefix} in {year}")
        return None

    df = load_modern_csv(filepath)
    # Determine which month the YTD covers
    yy = str(year)[-2:]
    ytd_month = 12  # default
    m = re.search(r"_ytd_(\d{2})" + re.escape(yy), filepath.name, re.IGNORECASE)
    if m:
        ytd_month = int(m.group(1))

    if ytd_month < 12:
        # Need to supplement with monthly files for remaining months
        monthly = find_monthly_files(year_dir, dot_prefix, year, ytd_month + 1)
        if monthly:
            monthly_frames = []
            for mpath, mnum in monthly:
                mdf = load_modern_csv(mpath)
                monthly_frames.append(mdf)
            supplemental = pd.concat(monthly_frames, ignore_index=True)
            months_added = [m for _, m in monthly]
            print(f"  {dot_prefix} {year}: {len(df):,} rows from {desc} "
                  f"+ {len(supplemental):,} rows from monthly files (months {months_added})")
            df = pd.concat([df, supplemental], ignore_index=True)
        else:
            print(f"  {dot_prefix} {year}: {len(df):,} rows from {desc} "
                  f"(PARTIAL: only months 1-{ytd_month})")
    else:
        print(f"  {dot_prefix} {year}: {len(df):,} rows from {desc}")

    return df


def load_2020_data(dot_prefix, raw_cols):
    """Handle 2020 special case: Sep YTD + Nov/Dec monthly + Oct derived."""
    year_dir = UNPACKED_MODERN / "2020"
    yy = "20"

    # Determine dimension columns for this DOT table
    if dot_prefix == "dot1":
        dim_cols = DOT1_DIM_COLS
    elif dot_prefix == "dot2":
        dim_cols = DOT2_DIM_COLS
    else:
        dim_cols = DOT3_DIM_COLS

    # 1. Load Sep YTD (months 1-9)
    sep_ytd_file = year_dir / f"{dot_prefix}_ytd_09{yy}.csv"
    if not sep_ytd_file.exists():
        print(f"  WARNING: {dot_prefix} 2020 Sep YTD not found")
        return None
    df_sep = load_modern_csv(sep_ytd_file)
    print(f"  {dot_prefix} 2020: {len(df_sep):,} rows from Sep YTD (months 1-9)")

    # 2. Load Nov and Dec monthly files
    nov_file = year_dir / f"{dot_prefix}_11{yy}.csv"
    dec_file = year_dir / f"{dot_prefix}_12{yy}.csv"
    frames = [df_sep]
    for mf, label in [(nov_file, "Nov"), (dec_file, "Dec")]:
        if mf.exists():
            df_m = load_modern_csv(mf)
            frames.append(df_m)
            print(f"  {dot_prefix} 2020: {len(df_m):,} rows from {label} monthly")
        else:
            print(f"  WARNING: {dot_prefix} 2020 {label} monthly not found")

    known_months = pd.concat(frames, ignore_index=True)

    # 3. Load annual aggregate (no MONTH column)
    annual_file = year_dir / f"{dot_prefix}_ytd_20{yy}.csv"
    if not annual_file.exists():
        # Try alternate naming
        annual_file = year_dir / f"{dot_prefix}_20{yy}.csv"
    if not annual_file.exists():
        print(f"  WARNING: {dot_prefix} 2020 annual file not found, skipping Oct derivation")
        return known_months

    df_annual = load_modern_csv(annual_file)
    print(f"  {dot_prefix} 2020: {len(df_annual):,} rows from annual aggregate")

    # 4. Derive October via subtraction
    # Fill NaN in dimension columns with sentinel for groupby
    sentinel = "__NA__"
    for col in dim_cols:
        if col in known_months.columns:
            known_months[col] = known_months[col].fillna(sentinel)
        if col in df_annual.columns:
            df_annual[col] = df_annual[col].fillna(sentinel)

    # Sum known months by dimension columns
    present_dim_cols = [c for c in dim_cols if c in known_months.columns]
    known_summed = (
        known_months.groupby(present_dim_cols, as_index=False)[VALUE_COLS]
        .sum(min_count=1)
    )

    # Merge annual with summed known months
    annual_dim_cols = [c for c in present_dim_cols if c in df_annual.columns]
    merged = df_annual.merge(
        known_summed, on=annual_dim_cols, how="left", suffixes=("_annual", "_known")
    )

    # Subtract: October = Annual - Known
    oct_rows = merged.copy()
    for vc in VALUE_COLS:
        annual_col = f"{vc}_annual"
        known_col = f"{vc}_known"
        if annual_col in oct_rows.columns and known_col in oct_rows.columns:
            oct_rows[vc] = oct_rows[annual_col].fillna(0) - oct_rows[known_col].fillna(0)
            oct_rows.drop(columns=[annual_col, known_col], inplace=True)
        elif annual_col in oct_rows.columns:
            oct_rows.rename(columns={annual_col: vc}, inplace=True)

    oct_rows["MONTH"] = 10
    oct_rows["YEAR"] = 2020

    # Restore NaN sentinels
    for col in present_dim_cols:
        if col in oct_rows.columns:
            oct_rows[col] = oct_rows[col].replace(sentinel, pd.NA)
        if col in known_months.columns:
            known_months[col] = known_months[col].replace(sentinel, pd.NA)

    # Check for negative values
    for vc in VALUE_COLS:
        if vc in oct_rows.columns:
            neg_count = (oct_rows[vc] < 0).sum()
            if neg_count > 0:
                print(f"  WARNING: {neg_count} negative {vc} values in Oct 2020 derivation")

    # Drop rows where all value columns are 0 or NaN (no October activity)
    value_mask = False
    for vc in VALUE_COLS:
        if vc in oct_rows.columns:
            value_mask = value_mask | (oct_rows[vc].fillna(0) != 0)
    oct_rows = oct_rows[value_mask]

    print(f"  {dot_prefix} 2020: {len(oct_rows):,} rows derived for October")

    # Combine known months + derived October
    result = pd.concat([known_months, oct_rows], ignore_index=True)
    return result


def load_all_modern(configs):
    """Load all modern era data (2007-2025). Returns dict of DataFrames."""
    results = {"dot1": [], "dot2": [], "dot3": []}
    table_info = [
        ("dot1", DOT1_RAW_COLS),
        ("dot2", DOT2_RAW_COLS),
        ("dot3", DOT3_RAW_COLS),
    ]

    years = sorted(
        int(d)
        for d in os.listdir(UNPACKED_MODERN)
        if (UNPACKED_MODERN / d).is_dir() and d.isdigit()
    )
    years = [y for y in years if 2007 <= y <= 2025]

    for year in years:
        print(f"\n--- {year} ---")
        for dot_prefix, raw_cols in table_info:
            df = load_modern_year(year, dot_prefix, raw_cols)
            if df is not None and len(df) > 0:
                results[dot_prefix].append(df)

    # Concatenate per table
    for key in results:
        if results[key]:
            results[key] = pd.concat(results[key], ignore_index=True)
        else:
            results[key] = pd.DataFrame()

    return results


# ===============================================================================
#  LEGACY DATA (1993-2006)
# ===============================================================================

# Legacy table classification: maps table prefix to (modern_equivalent, trdtype_rule)
# trdtype_rule: 'export', 'import'
# country_scope: 'Mexico', 'Canada'
#
# Per the original BTS README (1993):
#   D03-D06 = EXPORTS (commodity/geography emphasis, Mexico/Canada)
#   D09-D12 = IMPORTS (commodity/geography emphasis, Mexico/Canada)
# The table number encodes trade direction, NOT transport mode.
#
# IMPORTANT: D-tables are SURFACE-ONLY (DISAGMOT 4-9: mail, truck, rail,
# pipeline, other, FTZ). They NEVER contain air (1) or vessel (3) modes.
# Air/vessel data was added to TransBorder starting Nov 2003 via the
# AV (air/vessel) table series — see AV_TABLE_INFO below.
LEGACY_TABLE_INFO = {
    # --- Export tables ---
    # D03-D06: 1993 (pre-A/B split). Single table per country/dimension.
    "D03":  {"modern": "dot2", "trdtype": "export", "country": "Mexico"},
    "D04":  {"modern": "dot2", "trdtype": "export", "country": "Canada"},
    "D05":  {"modern": "dot1", "trdtype": "export", "country": "Mexico"},
    "D06":  {"modern": "dot1", "trdtype": "export", "country": "Canada"},
    # A/B split (Apr 1994–2002): A = State of Origin, B = State of Exporter.
    # Both A and B are EXPORTS — the suffix encodes geographic methodology,
    # NOT trade direction. Source: README4.TXT (1994), README5.TXT (1995).
    # B-tables dropped in 2003; A-tables continued as export-only through 2006.
    "D3A":  {"modern": "dot2", "trdtype": "export", "country": "Mexico"},
    "D3B":  {"modern": "dot2", "trdtype": "export", "country": "Mexico"},
    "D4A":  {"modern": "dot2", "trdtype": "export", "country": "Canada"},
    "D4B":  {"modern": "dot2", "trdtype": "export", "country": "Canada"},
    "D5A":  {"modern": "dot1", "trdtype": "export", "country": "Mexico"},
    # D5B EXCLUDED — uses NTAR (89 multicounty regions) instead of state codes.
    # Cannot map to DOT1 which requires USASTATE. D5A already covers these exports
    # with proper state-level geography, so including D5B would double-count.
    "D6A":  {"modern": "dot1", "trdtype": "export", "country": "Canada"},
    # D6B EXCLUDED — same NTAR issue as D5B (Canada-bound exports).
    # --- Import tables (D09-D12) ---
    # Surface imports only (no air/vessel). Carry additional fields (CONTCODE,
    # CHARGES, SHIPWT) not present in export tables.
    # Source: README_9.TXT (1993), README4.TXT (1994).
    "D09":  {"modern": "dot2", "trdtype": "import", "country": "Mexico"},
    "D10":  {"modern": "dot2", "trdtype": "import", "country": "Canada"},
    "D11":  {"modern": "dot1", "trdtype": "import", "country": "Mexico"},
    "D12":  {"modern": "dot1", "trdtype": "import", "country": "Canada"},
}

# AV (Air/Vessel) table classification.
# AV files exist only from Nov 2003 to Dec 2006. Before Nov 2003, TransBorder
# was surface-only. From Jan 2007, air/vessel data merged into DOT1/DOT2/DOT3.
#
# The 12 AV tables mirror the D-table structure but for air/vessel modes only:
#   AV1-AV6  = exports (1=Mexico commodity×state, 2=Canada commodity×state,
#              3=Mexico state×port, 4=Mexico commodity×port, 5=Canada state×port,
#              6=Canada commodity×port)
#   AV7-AV12 = imports (7=Mexico commodity×state, 8=Canada commodity×state,
#              9=Mexico state×port, 10=Mexico commodity×port, 11=Canada state×port,
#              12=Canada commodity×port)
#
# AV4/6/10/12 are Port×Commodity — these map to DOT3, providing limited pre-2007
# DOT3 data (air/vessel modes only, Nov 2003–Dec 2006).
AV_TABLE_INFO = {
    "1":  {"modern": "dot2", "trdtype": "export", "country": "Mexico"},
    "2":  {"modern": "dot2", "trdtype": "export", "country": "Canada"},
    "3":  {"modern": "dot1", "trdtype": "export", "country": "Mexico"},
    "4":  {"modern": "dot3", "trdtype": "export", "country": "Mexico"},
    "5":  {"modern": "dot1", "trdtype": "export", "country": "Canada"},
    "6":  {"modern": "dot3", "trdtype": "export", "country": "Canada"},
    "7":  {"modern": "dot2", "trdtype": "import", "country": "Mexico"},
    "8":  {"modern": "dot2", "trdtype": "import", "country": "Canada"},
    "9":  {"modern": "dot1", "trdtype": "import", "country": "Mexico"},
    "10": {"modern": "dot3", "trdtype": "import", "country": "Mexico"},
    "11": {"modern": "dot1", "trdtype": "import", "country": "Canada"},
    "12": {"modern": "dot3", "trdtype": "import", "country": "Canada"},
}

# Column name mappings from legacy to modern
FIELD_MAPPINGS = {
    "USSTATE": "USASTATE",
    "ORSTATE": "USASTATE",
    "DESTATE": "USASTATE",
    "EXSTATE": "USASTATE",
    "SCH_B": "COMMODITY2",
    "SCH_B_GRP": "COMMODITY2",
    "TSUSA": "COMMODITY2",
    "TSUSA_GRP": "COMMODITY2",
    "HTS": "COMMODITY2",
    "PROV": "CANPROV",
    "VAL": "VALUE",
    "VALU": "VALUE",
    "CHARGES": "FREIGHT_CHARGES",
    "FREIGHT": "FREIGHT_CHARGES",
    "FREIGHT_CH": "FREIGHT_CHARGES",
    "FREIGES": "FREIGHT_CHARGES",
}

# Fields that should be dropped during normalization.
# NOTE: NTAR is NOT in this set. D5B/D6B (which use NTAR) are excluded from
# LEGACY_TABLE_INFO entirely. If NTAR appears in an unexpected table, we want
# to know about it rather than silently dropping geographic data.
DROP_FIELDS = {"COUNT", "USREGION", "MEXREGION", "DISTGROUP", "MERGE"}


def parse_legacy_filename(filename):
    """Parse a legacy DBF filename to extract table type and month.

    Examples:
      D03AUG93.DBF   -> ('D03', 'AUG', 93)
      D3AJAN04.dbf   -> ('D3A', 'JAN', 4)
      d5bFEB02.DBF   -> ('D5B', 'FEB', 2)
      d09MAY00.dbf   -> ('D09', 'MAY', 0)
      D5AUG93S.DBF   -> ('D5A', 'AUG', 93)   # S = State of Origin -> D5A
      DO9MAY94.DBF   -> ('D09', 'MAY', 94)    # O/o typo for 0
      r3afeb95.dbf   -> ('D3A', 'FEB', 95)    # R = revised replacement
      R09JUL95.DBF   -> ('D09', 'JUL', 95)    # R = revised replacement

    Returns (table_type, month_name, year_2digit) or None if not a data file.
    """
    base = Path(filename).stem.upper()

    # Fix known typo: DO9 -> D09 (letter O instead of digit 0)
    base = re.sub(r"^DO(\d)", r"D0\1", base)

    # Match D-files and R-files (revised replacements).
    # R-files have same structure as D-files but replace erroneous originals.
    # Optional trailing S = State of Origin variant (1993-early 1994), maps to A suffix.
    m = re.match(
        r"^[DR](\d{1,2}[AB]?)(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(\d{2})(S?)$",
        base,
    )
    if m:
        table_num = m.group(1)
        month_name = m.group(2)
        year_2d = int(m.group(3))
        s_suffix = m.group(4)

        # S suffix (e.g., D5AUG93S) = State of Origin, equivalent to A variant
        if s_suffix == "S":
            # Strip any existing A/B from table_num, add A
            table_num = re.sub(r"[AB]$", "", table_num)
            table = f"D{table_num}A"
        else:
            table = f"D{table_num}"

        return table, month_name, year_2d
    return None


def parse_av_filename(filename, year):
    """Parse an AV (air/vessel) DBF filename.

    Naming conventions:
      2003: av{table}.dbf (Nov) or av{table}12.dbf (Dec)
      2004-2006: av{table}{MM}{YY}.dbf

    Returns (table_num_str, month_int) or None if not an AV data file.
    """
    base = Path(filename).stem.upper()
    if not base.startswith("AV"):
        return None

    suffix = base[2:]  # everything after "AV"
    if not suffix or not suffix.isdigit():
        return None

    if year == 2003:
        # December files: table number + "12" suffix
        if suffix.endswith("12") and len(suffix) > 2:
            table_part = suffix[:-2]
            if table_part.isdigit() and 1 <= int(table_part) <= 12:
                return table_part, 12
        # November files: just the table number
        if 1 <= int(suffix) <= 12:
            return suffix, 11
        return None
    else:
        # 2004-2006: last 2 digits = year, 2 before = month, rest = table
        if len(suffix) < 5:
            return None
        table_part = suffix[:-4]
        mm = suffix[-4:-2]
        # yy = suffix[-2:]  # not needed; year comes from directory
        if (table_part.isdigit() and 1 <= int(table_part) <= 12
                and mm.isdigit() and 1 <= int(mm) <= 12):
            return table_part, int(mm)
        return None


def parse_statmoyr(value, year_hint=None):
    """Parse STATMOYR field into (month, year).

    Formats:
      MMYY   (1993-1997): e.g. '0493' = April 1993
      YYYYMM (1998-2006): e.g. '200401' = January 2004
    """
    s = str(value).strip()
    if len(s) == 4:
        # MMYY format
        month = int(s[:2])
        yy = int(s[2:])
        year = 1900 + yy if yy >= 90 else 2000 + yy
        return month, year
    elif len(s) == 6:
        # YYYYMM format
        year = int(s[:4])
        month = int(s[4:])
        return month, year
    else:
        return None, None


def read_legacy_dbf(filepath):
    """Read a DBF file into a DataFrame with standardized column names."""
    try:
        table = DBF(str(filepath), encoding="latin1", char_decode_errors="replace")
        records = [dict(rec) for rec in table]
        if not records:
            return pd.DataFrame()
        df = pd.DataFrame(records)
    except Exception as e:
        print(f"  WARNING: Could not read {filepath}: {e}")
        return pd.DataFrame()

    # Standardize column names: upper + strip
    df.columns = df.columns.str.upper().str.strip()

    # Drop fields we don't need
    drop = [c for c in df.columns if c in DROP_FIELDS]
    if drop:
        df.drop(columns=drop, inplace=True)

    # Apply field name mappings
    rename = {}
    for col in df.columns:
        if col in FIELD_MAPPINGS:
            rename[col] = FIELD_MAPPINGS[col]
    if rename:
        df.rename(columns=rename, inplace=True)

    return df


def normalize_legacy_record(df, table_type, info, year_hint):
    """Normalize a legacy DataFrame to match modern column structure.

    Adds TRDTYPE, MONTH, YEAR. Fills missing columns with NaN.
    """
    if df.empty:
        return df

    # Parse STATMOYR -> MONTH, YEAR
    if "STATMOYR" in df.columns:
        parsed = df["STATMOYR"].apply(lambda v: parse_statmoyr(v, year_hint))
        df["MONTH"] = parsed.apply(lambda x: x[0]).astype("Int64")
        df["YEAR"] = parsed.apply(lambda x: x[1]).astype("Int64")
        df.drop(columns=["STATMOYR"], inplace=True)
    else:
        if "MONTH" not in df.columns:
            df["MONTH"] = pd.NA
        if "YEAR" not in df.columns:
            df["YEAR"] = year_hint

    # Set TRDTYPE from table classification (export=1, import=2)
    trdtype_rule = info["trdtype"]
    if trdtype_rule == "export":
        df["TRDTYPE"] = 1
    elif trdtype_rule == "import":
        df["TRDTYPE"] = 2

    # Set COUNTRY if known from table scope
    country_scope = info["country"]
    if "COUNTRY" not in df.columns:
        if country_scope == "Mexico":
            df["COUNTRY"] = "2010"
        elif country_scope == "Canada":
            df["COUNTRY"] = "1220"
    else:
        df["COUNTRY"] = df["COUNTRY"].astype(str).str.strip()

    # Ensure all string columns are string type
    for col in ["USASTATE", "DEPE", "COMMODITY2", "DISAGMOT", "MEXSTATE",
                 "CANPROV", "DF", "CONTCODE"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()
            df[col] = df[col].replace({"nan": pd.NA, "None": pd.NA, "": pd.NA})

    # Numeric columns
    for col in VALUE_COLS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # DISAGMOT to string for lookup consistency
    if "DISAGMOT" in df.columns:
        df["DISAGMOT"] = df["DISAGMOT"].astype(str).str.strip().str.replace(".0", "", regex=False)

    # Fix known errata: MEXSTATE BN -> BC (Apr 1994 - May 1998)
    if "MEXSTATE" in df.columns:
        df.loc[df["MEXSTATE"] == "BN", "MEXSTATE"] = "BC"

    return df


def load_all_legacy(configs):
    """Load all legacy era data (1993-2006). Returns dict of DataFrames.

    Processes two categories of files:
      1. D-tables (D03-D12, A/B variants): Surface freight, 1993-2006
      2. AV-tables (AV1-AV12): Air/vessel freight, Nov 2003-Dec 2006
    """
    results = {"dot1": [], "dot2": [], "dot3": []}

    if not UNPACKED_LEGACY.exists():
        print("\nNo legacy data directory found, skipping 1993-2006")
        return {"dot1": pd.DataFrame(), "dot2": pd.DataFrame(), "dot3": pd.DataFrame()}

    years = sorted(
        int(d)
        for d in os.listdir(UNPACKED_LEGACY)
        if (UNPACKED_LEGACY / d).is_dir() and d.isdigit()
    )

    for year in years:
        year_dir = UNPACKED_LEGACY / str(year)
        print(f"\n--- {year} (legacy) ---")

        # Find all DBF files
        dbf_files = [
            f for f in os.listdir(year_dir)
            if f.upper().endswith(".DBF")
        ]

        processed_tables = defaultdict(int)

        # --- Build R-file (revised) priority set ---
        # R-files are corrected replacements for erroneous D-files (seen in 1995).
        # When an R-file exists, process it instead of the corresponding D-file.
        # X-files (deltas) are ignored entirely — R-files contain the full corrected data.
        revised_set = set()  # (table_type, month_name) tuples that have R replacements
        for dbf_file in dbf_files:
            if dbf_file.upper().startswith("R"):
                parsed = parse_legacy_filename(dbf_file)
                if parsed:
                    revised_set.add((parsed[0], parsed[1]))  # (table, month)

        if revised_set:
            print(f"  Found {len(revised_set)} revised (R) files — will use instead of originals")

        # --- Process D-tables and R-tables (surface freight) ---
        for dbf_file in sorted(dbf_files):
            stem_upper = Path(dbf_file).stem.upper()

            # Skip X-files (deltas) — R-files already contain full corrected data
            if stem_upper.startswith("X"):
                continue

            parsed = parse_legacy_filename(dbf_file)
            if parsed is None:
                continue  # Skip lookup/reference DBFs and AV files

            table_type, month_name, year_2d = parsed

            # If this is a D-file and a revised R-file exists, skip the bad original
            if stem_upper.startswith("D") and (table_type, month_name) in revised_set:
                continue

            # Look up table info
            info = LEGACY_TABLE_INFO.get(table_type)
            if info is None:
                # Log excluded NTAR tables so the skip is visible
                if table_type in ("D5B", "D6B"):
                    processed_tables[f"{table_type}(skipped-NTAR)"] = 0
                continue  # Unknown or excluded table type

            filepath = year_dir / dbf_file
            df = read_legacy_dbf(filepath)
            if df.empty:
                continue

            source = "revised" if stem_upper.startswith("R") else "original"
            df = normalize_legacy_record(df, table_type, info, year)
            modern_table = info["modern"]

            results[modern_table].append(df)
            processed_tables[table_type] += len(df)

        # --- Process AV-tables (air/vessel, Nov 2003–Dec 2006) ---
        if year >= 2003:
            for dbf_file in sorted(dbf_files):
                parsed = parse_av_filename(dbf_file, year)
                if parsed is None:
                    continue

                table_num_str, month = parsed

                info = AV_TABLE_INFO.get(table_num_str)
                if info is None:
                    continue

                filepath = year_dir / dbf_file
                df = read_legacy_dbf(filepath)
                if df.empty:
                    continue

                # AV files have no STATMOYR — set MONTH/YEAR from filename
                df["MONTH"] = month
                df["YEAR"] = year

                label = f"AV{table_num_str}"
                df = normalize_legacy_record(df, label, info, year)
                modern_table = info["modern"]

                results[modern_table].append(df)
                processed_tables[label] += len(df)

        for table, count in sorted(processed_tables.items()):
            info = LEGACY_TABLE_INFO.get(table) or AV_TABLE_INFO.get(
                table.replace("AV", ""), {}
            )
            direction = info.get("trdtype", "?")
            modern = info.get("modern", "?")
            print(f"  {table} -> {modern}: {count:,} rows (direction: {direction})")

    # Concatenate
    for key in results:
        if results[key]:
            results[key] = pd.concat(results[key], ignore_index=True)
        else:
            results[key] = pd.DataFrame()

    return results


# ===============================================================================
#  DECODE & NORMALIZE
# ===============================================================================

def decode_dataframe(df, table_type, configs):
    """Decode coded fields and produce the final cleaned DataFrame.

    Takes a DataFrame with raw BTS column names and returns one with
    decoded, human-readable column names.
    """
    if df.empty:
        return df

    out = pd.DataFrame()

    # Year and Month
    out["Year"] = pd.to_numeric(df.get("YEAR"), errors="coerce").astype("Int64")
    out["Month"] = pd.to_numeric(df.get("MONTH"), errors="coerce").astype("Int64")

    # Trade Type
    if "TRDTYPE" in df.columns:
        df["TRDTYPE"] = df["TRDTYPE"].astype(str).str.strip().str.replace(".0", "", regex=False)
        out["TradeType"] = df["TRDTYPE"].map(
            lambda x: lookup(configs, "trade_type", x)
        )
    else:
        out["TradeType"] = pd.NA

    # State (DOT1 and DOT2 only)
    if table_type in ("dot1", "dot2") and "USASTATE" in df.columns:
        out["StateCode"] = df["USASTATE"].str.strip()
        out["State"] = df["USASTATE"].map(
            lambda x: lookup(configs, "state", str(x).strip())
        )
    elif table_type in ("dot1", "dot2"):
        out["StateCode"] = pd.NA
        out["State"] = pd.NA

    # Port (DOT1 and DOT3)
    if table_type in ("dot1", "dot3") and "DEPE" in df.columns:
        out["PortCode"] = df["DEPE"].str.strip()
        out["Port"] = df["DEPE"].map(
            lambda x: lookup(configs, "port", str(x).strip(), field="port")
        )
    elif table_type in ("dot1", "dot3"):
        out["PortCode"] = pd.NA
        out["Port"] = pd.NA

    # Commodity (DOT2 and DOT3)
    if table_type in ("dot2", "dot3") and "COMMODITY2" in df.columns:
        hs = df["COMMODITY2"].astype(str).str.strip().str.zfill(2)
        out["HSCode"] = hs
        out["Commodity"] = hs.map(
            lambda x: lookup(configs, "commodity", x)
        )
        out["CommodityGroup"] = hs.map(get_commodity_group)
    elif table_type in ("dot2", "dot3"):
        out["HSCode"] = pd.NA
        out["Commodity"] = pd.NA
        out["CommodityGroup"] = pd.NA

    # Mode
    if "DISAGMOT" in df.columns:
        mode_str = df["DISAGMOT"].astype(str).str.strip().str.replace(".0", "", regex=False)
        out["Mode"] = mode_str.map(lambda x: lookup(configs, "mode", x))
    else:
        out["Mode"] = pd.NA

    # Mexican State (DOT1 and DOT2 only)
    if table_type in ("dot1", "dot2"):
        if "MEXSTATE" in df.columns:
            out["MexState"] = df["MEXSTATE"].map(
                lambda x: lookup(configs, "mex_state", str(x).strip())
                if pd.notna(x) and str(x).strip() != "" else None
            )
        else:
            out["MexState"] = pd.NA

    # Canadian Province (DOT1 and DOT2 only)
    if table_type in ("dot1", "dot2"):
        if "CANPROV" in df.columns:
            out["CanProv"] = df["CANPROV"].map(
                lambda x: lookup(configs, "can_prov", str(x).strip())
                if pd.notna(x) and str(x).strip() != "" else None
            )
        else:
            out["CanProv"] = pd.NA

    # Country
    if "COUNTRY" in df.columns:
        out["Country"] = df["COUNTRY"].astype(str).str.strip().map(
            lambda x: lookup(configs, "country", x)
        )
    else:
        out["Country"] = pd.NA

    # Trade Value (USD)
    if "VALUE" in df.columns:
        out["TradeValue"] = pd.to_numeric(df["VALUE"], errors="coerce")
    else:
        out["TradeValue"] = pd.NA

    # Weight (convert kg -> short tons; NULL if missing)
    if "SHIPWT" in df.columns:
        shipwt = pd.to_numeric(df["SHIPWT"], errors="coerce")
        # Treat 0 as actual 0 (not as missing)
        out["Weight"] = shipwt / KG_PER_SHORT_TON
        # But preserve true NaN
        out.loc[shipwt.isna(), "Weight"] = pd.NA
    else:
        out["Weight"] = pd.NA

    # Freight Charges
    if "FREIGHT_CHARGES" in df.columns:
        out["FreightCharges"] = pd.to_numeric(df["FREIGHT_CHARGES"], errors="coerce")
    else:
        out["FreightCharges"] = pd.NA

    # DF (Domestic/Foreign indicator)
    if "DF" in df.columns:
        out["DF"] = df["DF"].astype(str).str.strip()
        out.loc[out["DF"].isin(["nan", "None", ""]), "DF"] = pd.NA
    else:
        out["DF"] = pd.NA

    # Container Code
    if "CONTCODE" in df.columns:
        out["ContCode"] = df["CONTCODE"].astype(str).str.strip()
        out.loc[out["ContCode"].isin(["nan", "None", ""]), "ContCode"] = pd.NA
    else:
        out["ContCode"] = pd.NA

    return out


# ===============================================================================
#  MAIN
# ===============================================================================

def write_unknown_codes_report(filepath):
    """Write a report of codes found in data but not in config files."""
    with open(filepath, "w", encoding="utf-8") as f:
        f.write("Unknown Codes Report\n")
        f.write("=" * 60 + "\n")
        f.write("Codes found in raw data but not in config lookup files.\n")
        f.write("These records are kept with the raw code value.\n\n")

        any_unknown = False
        for category in sorted(unknown_codes.keys()):
            codes = sorted(unknown_codes[category])
            if codes:
                any_unknown = True
                f.write(f"\n{category.upper()} ({len(codes)} unknown codes):\n")
                for code in codes:
                    f.write(f"  {code}\n")

        if not any_unknown:
            f.write("No unknown codes found. All codes matched config lookups.\n")

    return any_unknown


def main():
    print("=" * 60)
    print("BTS TransBorder Data Normalization")
    print("=" * 60)

    # Load configs
    print("\nLoading config files...")
    configs = load_configs()

    # Create output directories
    CLEANED_DIR.mkdir(parents=True, exist_ok=True)
    DOCS_DIR.mkdir(parents=True, exist_ok=True)

    # -- Load Modern Data --------------------------------------------------
    print("\n" + "-" * 60)
    print("MODERN ERA (2007-2025)")
    print("-" * 60)
    modern = load_all_modern(configs)

    # -- Load Legacy Data --------------------------------------------------
    print("\n" + "-" * 60)
    print("LEGACY ERA (1993-2006)")
    print("-" * 60)
    legacy = load_all_legacy(configs)

    # -- Combine Modern + Legacy -------------------------------------------
    print("\n" + "-" * 60)
    print("COMBINING & DECODING")
    print("-" * 60)

    combined = {}
    for key in ["dot1", "dot2", "dot3"]:
        frames = []
        if key in modern and not modern[key].empty:
            frames.append(modern[key])
        if key in legacy and not legacy[key].empty:
            frames.append(legacy[key])
        combined[key] = pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()

    # Decode all tables
    decoded = {}
    for key, out_cols in [("dot1", DOT1_OUT_COLS), ("dot2", DOT2_OUT_COLS), ("dot3", DOT3_OUT_COLS)]:
        print(f"\nDecoding {key}...")
        df = decode_dataframe(combined[key], key, configs)
        if not df.empty:
            # Reorder columns to match expected output (only keep columns that exist)
            available = [c for c in out_cols if c in df.columns]
            df = df[available]
            # Drop complete duplicates
            before = len(df)
            df.drop_duplicates(inplace=True)
            dupes = before - len(df)
            if dupes > 0:
                print(f"  Dropped {dupes:,} duplicate rows")
            # Sort by Year, Month
            sort_cols = [c for c in ["Year", "Month"] if c in df.columns]
            if sort_cols:
                df.sort_values(sort_cols, inplace=True, na_position="last")
        decoded[key] = df
        print(f"  {key}: {len(df):,} total rows")

    # -- Write Output CSVs -------------------------------------------------
    print("\n" + "-" * 60)
    print("WRITING OUTPUT FILES")
    print("-" * 60)

    filenames = {
        "dot1": "dot1_state_port.csv",
        "dot2": "dot2_state_commodity.csv",
        "dot3": "dot3_port_commodity.csv",
    }
    for key, fname in filenames.items():
        outpath = CLEANED_DIR / fname
        decoded[key].to_csv(outpath, index=False)
        size_mb = outpath.stat().st_size / (1024 * 1024)
        print(f"  {fname}: {len(decoded[key]):,} rows, {size_mb:.1f} MB")

    # -- Unknown Codes Report ----------------------------------------------
    report_path = DOCS_DIR / "unknown_codes_report.txt"
    has_unknowns = write_unknown_codes_report(report_path)
    if has_unknowns:
        print(f"\n  Unknown codes found — see {report_path}")
    else:
        print(f"\n  No unknown codes (all matched config lookups)")

    # -- Summary -----------------------------------------------------------
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    for key in ["dot1", "dot2", "dot3"]:
        df = decoded[key]
        if df.empty:
            print(f"  {key}: empty")
            continue
        yr_min = df["Year"].min()
        yr_max = df["Year"].max()
        yr_count = df["Year"].nunique()
        print(f"  {key}: {len(df):,} rows, {yr_min}-{yr_max} ({yr_count} years)")
        # Trade type breakdown
        if "TradeType" in df.columns:
            tt = df["TradeType"].value_counts(dropna=False)
            for val, cnt in tt.items():
                label = val if pd.notna(val) else "UNKNOWN"
                print(f"    {label}: {cnt:,}")

    print(f"\nOutput: {CLEANED_DIR}")
    print("Done.")


if __name__ == "__main__":
    main()
