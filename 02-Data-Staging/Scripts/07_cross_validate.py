"""
Cross-validate our processed outputs against BTS Tableau dashboard exports.

Two independent BTS sources:
  1. BTS_Tableau_Historical_Trend.csv  (DOT3-like: Port × Commodity, 2006-2025)
  2. BTS_US_State(2015-2024).csv       (DOT2-like: State × Commodity, 2015-2025)

Comparisons:
  A. Annual total trade value by Country × TradeType (both sources → us_transborder)
  B. Annual total by Country × Mode × TradeType (Historical Trend → us_transborder)
  C. Annual total by State × Country × TradeType (US State → us_state_trade)
  D. Annual total by Country × CommodityGroup × TradeType (US State → commodity_detail)

Tolerance: 0.1% relative difference (BTS Tableau may use slightly different rounding).
"""

import json
import sys
from pathlib import Path

import pandas as pd

# --- Paths ---
PROJECT_ROOT = Path(__file__).resolve().parents[2]
RAW_BASE = PROJECT_ROOT.parent / "01 - Raw Data" / "TX-MX Trade (BTS)"
HIST_TREND = RAW_BASE / "BTS_Tableau_Historical_Trend.csv"
US_STATE = RAW_BASE / "BTS US State" / "BTS_US_State(2015 - 2024).csv"
OUTPUT_JSON = PROJECT_ROOT / "03-Processed-Data" / "json"

TOLERANCE = 0.001  # 0.1% relative difference

# BTS Tableau uses HS chapter range prefixes; we use descriptive names.
# Map BTS groups → our groups so we can compare at the group level.
# BTS "90-97 Miscellaneous" merges several of our groups, so we map
# our groups to BTS groups (many-to-one) for a fair comparison.
COMMODITY_GROUP_TO_BTS = {
    "Live Animals & Animal Products":       "01 - 05",
    "Vegetable Products":                   "06 - 15",
    "Animal or Vegetable Fats & Oils":      "06 - 15",  # HS 15 falls in BTS 06-15
    "Foodstuffs, Beverages & Tobacco":      "16 - 24",
    "Mineral Products":                     "25 - 27",
    "Chemical Products":                    "28 - 38",
    "Plastics & Rubber":                    "39 - 40",
    "Raw Hides, Skins & Leather":           "41 - 43",
    "Wood & Wood Products":                 "44 - 49",
    "Pulp, Paper & Paperboard":             "44 - 49",  # HS 47-49 in BTS 44-49
    "Textiles & Apparel":                   "50 - 63",
    "Footwear, Headgear & Umbrellas":       "64 - 67",
    "Stone, Ceramic & Glass Products":      "68 - 71",
    "Precious Metals & Stones":             "68 - 71",  # HS 71 in BTS 68-71
    "Base Metals & Articles":               "72 - 83",
    "Machinery & Electrical Equipment":     "84 - 85",
    "Transportation Equipment":             "86 - 89",
    "Optical, Medical & Precision Instruments": "90 - 97",
    "Arms & Ammunition":                    "90 - 97",
    "Miscellaneous Manufactured Articles":  "90 - 97",
    "Works of Art & Antiques":              "90 - 97",
    "Special Classification Provisions":    "98 - 99",
}


def load_json(name):
    path = OUTPUT_JSON / f"{name}.json"
    with open(path, "r", encoding="utf-8") as f:
        return pd.DataFrame(json.load(f))


def pct_diff(ours, theirs):
    """Signed percentage difference: (ours - theirs) / theirs."""
    if theirs == 0:
        return float("inf") if ours != 0 else 0.0
    return (ours - theirs) / abs(theirs)


def compare_tables(label, ours, theirs, keys, value_col="TradeValue"):
    """Compare two DataFrames on shared keys, report value differences."""
    merged = pd.merge(ours, theirs, on=keys, suffixes=("_ours", "_bts"), how="inner")

    ours_col = f"{value_col}_ours"
    bts_col = f"{value_col}_bts"

    merged["pct_diff"] = merged.apply(
        lambda r: pct_diff(r[ours_col], r[bts_col]), axis=1
    )
    merged["abs_pct"] = merged["pct_diff"].abs()

    total_rows = len(merged)
    mismatches = merged[merged["abs_pct"] > TOLERANCE]
    match_rate = (total_rows - len(mismatches)) / total_rows * 100 if total_rows else 0

    print(f"\n{'='*70}")
    print(f"  {label}")
    print(f"{'='*70}")
    print(f"  Matched rows: {total_rows}")
    print(f"  Within {TOLERANCE*100:.1f}% tolerance: {total_rows - len(mismatches)}/{total_rows} ({match_rate:.1f}%)")

    if len(mismatches) > 0:
        print(f"\n  MISMATCHES ({len(mismatches)} rows beyond tolerance):")
        # Show worst mismatches
        worst = mismatches.nlargest(20, "abs_pct")
        for _, row in worst.iterrows():
            key_vals = " | ".join(str(row[k]) for k in keys)
            print(f"    {key_vals}: ours=${row[ours_col]:,.0f}  bts=${row[bts_col]:,.0f}  diff={row['pct_diff']:+.2%}")
    else:
        print("  ALL MATCH")

    return total_rows, len(mismatches)


def main():
    print("Cross-Validation: Our Outputs vs BTS Tableau Exports")
    print("=" * 70)

    total_checks = 0
    total_mismatches = 0

    # ---- Load our outputs ----
    us_trans = load_json("us_transborder")
    us_state_trade = load_json("us_state_trade")
    commodity_detail = load_json("commodity_detail")

    # ================================================================
    # SOURCE 1: Historical Trend (DOT3-like, Port × Commodity)
    # ================================================================
    print("\n\nLoading BTS Historical Trend (~627 MB)...")
    hist = pd.read_csv(HIST_TREND, encoding="utf-8-sig", usecols=[
        "Country Name", "Disagmot Name", "Commodity Name Group",
        "Port State Name", "Ddate", "Value", "Trd Type"
    ])
    hist["Ddate"] = pd.to_datetime(hist["Ddate"])
    hist["Year"] = hist["Ddate"].dt.year
    hist.rename(columns={
        "Country Name": "Country",
        "Disagmot Name": "Mode",
        "Trd Type": "TradeType",
        "Commodity Name Group": "CommodityGroup",
        "Port State Name": "State",
    }, inplace=True)
    hist["Mode"] = hist["Mode"].str.strip()
    # Exclude 2025 partial and 2006 (our data starts 2007 for detail datasets)
    hist_full = hist[(hist["Year"] >= 2007) & (hist["Year"] <= 2024)]

    # --- A1: Annual total by Country × TradeType (Hist Trend vs us_transborder) ---
    bts_a1 = (hist_full.groupby(["Year", "Country", "TradeType"])["Value"]
              .sum().reset_index().rename(columns={"Value": "TradeValue"}))
    ours_a1 = (us_trans[(us_trans["Year"] >= 2007) & (us_trans["Year"] <= 2024)]
               .groupby(["Year", "Country", "TradeType"])["TradeValue"]
               .sum().reset_index())
    n, m = compare_tables(
        "A1: Annual Total by Country × TradeType\n  (Historical Trend [DOT3] vs us_transborder [DOT2])",
        ours_a1, bts_a1, ["Year", "Country", "TradeType"]
    )
    total_checks += n; total_mismatches += m

    # --- B: Annual total by Country × Mode × TradeType ---
    # Map BTS mode names to our mode names
    mode_map = {
        "Air": "Air", "Vessel": "Vessel", "Mail": "Mail",
        "Truck": "Truck", "Rail": "Rail", "Pipeline": "Pipeline",
        "Other and Unknown": "Other/Unknown",
        "Foreign Trade Zones": "FTZ",
    }
    hist_full_mapped = hist_full.copy()
    hist_full_mapped["Mode"] = hist_full_mapped["Mode"].map(mode_map)
    hist_full_mapped = hist_full_mapped.dropna(subset=["Mode"])

    bts_b = (hist_full_mapped.groupby(["Year", "Country", "Mode", "TradeType"])["Value"]
             .sum().reset_index().rename(columns={"Value": "TradeValue"}))
    ours_b = (us_trans[(us_trans["Year"] >= 2007) & (us_trans["Year"] <= 2024)]
              .groupby(["Year", "Country", "Mode", "TradeType"])["TradeValue"]
              .sum().reset_index())
    n, m = compare_tables(
        "B: Annual Total by Country × Mode × TradeType\n  (Historical Trend [DOT3] vs us_transborder [DOT2])",
        ours_b, bts_b, ["Year", "Country", "Mode", "TradeType"]
    )
    total_checks += n; total_mismatches += m

    del hist, hist_full, hist_full_mapped  # free memory

    # ================================================================
    # SOURCE 2: US State (DOT2-like, State × Commodity)
    # ================================================================
    print("\n\nLoading BTS US State (~805 MB)...")
    uss = pd.read_csv(US_STATE, encoding="utf-8-sig", usecols=[
        "Country Name", "Disagmot Name", "USASTATE", "USASTATE_NAME",
        "Commodity Name Group", "Ddate", "Value", "Trd Type"
    ])
    uss["Ddate"] = pd.to_datetime(uss["Ddate"])
    uss["Year"] = uss["Ddate"].dt.year
    uss.rename(columns={
        "Country Name": "Country",
        "Disagmot Name": "Mode",
        "Trd Type": "TradeType",
        "USASTATE": "StateCode",
        "USASTATE_NAME": "State",
        "Commodity Name Group": "CommodityGroup",
    }, inplace=True)
    uss["Mode"] = uss["Mode"].str.strip()
    # Use only complete years present in both datasets
    uss_full = uss[(uss["Year"] >= 2015) & (uss["Year"] <= 2024)]

    # --- A2: Annual total by Country × TradeType (US State vs us_transborder) ---
    bts_a2 = (uss_full.groupby(["Year", "Country", "TradeType"])["Value"]
              .sum().reset_index().rename(columns={"Value": "TradeValue"}))
    ours_a2 = (us_trans[(us_trans["Year"] >= 2015) & (us_trans["Year"] <= 2024)]
               .groupby(["Year", "Country", "TradeType"])["TradeValue"]
               .sum().reset_index())
    n, m = compare_tables(
        "A2: Annual Total by Country × TradeType\n  (US State [DOT2] vs us_transborder [DOT2])",
        ours_a2, bts_a2, ["Year", "Country", "TradeType"]
    )
    total_checks += n; total_mismatches += m

    # --- C: Annual total by State × Country × TradeType ---
    bts_c = (uss_full.groupby(["Year", "StateCode", "Country", "TradeType"])["Value"]
             .sum().reset_index().rename(columns={"Value": "TradeValue"}))
    ours_c = (us_state_trade[(us_state_trade["Year"] >= 2015) & (us_state_trade["Year"] <= 2024)]
              .groupby(["Year", "StateCode", "Country", "TradeType"])["TradeValue"]
              .sum().reset_index())
    n, m = compare_tables(
        "C: Annual Total by State × Country × TradeType\n  (US State [DOT2] vs us_state_trade [DOT1])",
        ours_c, bts_c, ["Year", "StateCode", "Country", "TradeType"]
    )
    total_checks += n; total_mismatches += m

    # --- D: Annual total by Country × CommodityGroup × TradeType ---
    # Map both sides to BTS chapter-range codes for comparable grouping
    bts_d_raw = uss_full.copy()
    bts_d_raw["GroupCode"] = bts_d_raw["CommodityGroup"].str.extract(r"^(\d+ - \d+)")
    bts_d_raw = bts_d_raw.dropna(subset=["GroupCode"])
    bts_d = (bts_d_raw.groupby(["Year", "Country", "GroupCode", "TradeType"])["Value"]
             .sum().reset_index().rename(columns={"Value": "TradeValue"}))

    ours_d_raw = commodity_detail[(commodity_detail["Year"] >= 2015) & (commodity_detail["Year"] <= 2024)].copy()
    ours_d_raw["GroupCode"] = ours_d_raw["CommodityGroup"].map(COMMODITY_GROUP_TO_BTS)
    ours_d_raw = ours_d_raw.dropna(subset=["GroupCode"])
    ours_d = (ours_d_raw.groupby(["Year", "Country", "GroupCode", "TradeType"])["TradeValue"]
              .sum().reset_index())

    n, m = compare_tables(
        "D: Annual Total by Country x CommodityGroup x TradeType\n  (US State [DOT2] vs commodity_detail [DOT2])",
        ours_d, bts_d, ["Year", "Country", "GroupCode", "TradeType"]
    )
    total_checks += n; total_mismatches += m

    # ================================================================
    # Summary
    # ================================================================
    print(f"\n\n{'='*70}")
    print(f"  SUMMARY")
    print(f"{'='*70}")
    print(f"  Total comparisons: {total_checks}")
    print(f"  Within tolerance:  {total_checks - total_mismatches}")
    print(f"  Mismatches:        {total_mismatches}")
    if total_mismatches == 0:
        print(f"\n  PASSED: ALL CHECKS WITHIN TOLERANCE ({TOLERANCE*100:.1f}%)")
    else:
        print(f"\n  FAILED: {total_mismatches} MISMATCHES FOUND -- review above")

    return 0 if total_mismatches == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
