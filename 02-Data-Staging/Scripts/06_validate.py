"""
06_validate.py -- Validate dashboard output files against the SQLite database.

Checks:
  1. All 7 JSON + 7 CSV files exist with nonzero size
  2. JSON row counts match CSV row counts
  3. Year ranges match the output-builder contract:
       - us_transborder: 1993-2025 (full legacy + modern)
       - All other datasets: 2007-2025 (modern era only)
  4. Total trade values from outputs match direct DB queries
     (using the same WHERE filters as 05_build_outputs.py)
  5. No NULL TradeType in outputs (should be 'Unknown')
  6. Texas port datasets only contain expected port codes
     (loaded dynamically from config/texas_border_ports.json)
  7. texas_mexico_ports has coordinates and regions
  8. us_transborder schema: no CommodityGroup column
  9. Sample value cross-checks against DB
 10. Weight NULL handling spot-check
 11. No obsolete files remain (us_mexico_commodities removed)

Usage:
  python 06_validate.py
"""

import csv
import json
import sqlite3
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
STAGING_DIR = SCRIPT_DIR.parent
DB_PATH = STAGING_DIR / "transborder.db"
OUTPUT_DIR = STAGING_DIR.parent / "03-Processed-Data"
JSON_DIR = OUTPUT_DIR / "json"
CSV_DIR = OUTPUT_DIR / "csv"
CONFIG_DIR = STAGING_DIR / "config"

# Year boundary matching 05_build_outputs.py
MODERN_START_YEAR = 2007

DATASETS = [
    "us_transborder",
    "us_mexico_ports",
    "texas_mexico_ports",
    "texas_mexico_commodities",
    "us_state_trade",
    "commodity_detail",
    "monthly_trends",
]

# Datasets that use all years (1993+); everything else starts at MODERN_START_YEAR
FULL_RANGE_DATASETS = {"us_transborder"}

passed = 0
failed = 0
warnings = 0


def check(condition, label, warn_only=False):
    global passed, failed, warnings
    if condition:
        passed += 1
        print(f"  PASS  {label}")
    elif warn_only:
        warnings += 1
        print(f"  WARN  {label}")
    else:
        failed += 1
        print(f"  FAIL  {label}")


def load_json(name):
    path = JSON_DIR / f"{name}.json"
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def count_csv(name):
    path = CSV_DIR / f"{name}.csv"
    if not path.exists():
        return -1
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        return sum(1 for _ in reader) - 1  # subtract header


def load_texas_border_ports():
    """Load TX border port codes from config (same source as 05_build_outputs.py)."""
    path = CONFIG_DIR / "texas_border_ports.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return {k for k in data if not k.startswith("_")}


def main():
    if not DB_PATH.exists():
        print(f"ERROR: Database not found: {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(str(DB_PATH))
    tx_border_ports = load_texas_border_ports()

    print("=" * 60)
    print("VALIDATION REPORT")
    print("=" * 60)

    # --- Check 1: File existence ---
    print("\n--- File Existence ---")
    for ds in DATASETS:
        json_path = JSON_DIR / f"{ds}.json"
        csv_path = CSV_DIR / f"{ds}.csv"
        check(json_path.exists() and json_path.stat().st_size > 0,
              f"{ds}.json exists and is non-empty")
        check(csv_path.exists() and csv_path.stat().st_size > 0,
              f"{ds}.csv exists and is non-empty")

    # --- Check 1b: No obsolete files ---
    print("\n--- Obsolete File Check ---")
    for old_name in ["us_mexico_commodities"]:
        old_json = JSON_DIR / f"{old_name}.json"
        old_csv = CSV_DIR / f"{old_name}.csv"
        check(not old_json.exists(), f"{old_name}.json removed (obsolete)")
        check(not old_csv.exists(), f"{old_name}.csv removed (obsolete)")

    # --- Check 2: JSON/CSV row count match ---
    print("\n--- Row Count Consistency (JSON vs CSV) ---")
    json_data = {}
    for ds in DATASETS:
        data = load_json(ds)
        if data is None:
            check(False, f"{ds}: JSON loadable")
            continue
        json_data[ds] = data
        csv_count = count_csv(ds)
        check(len(data) == csv_count,
              f"{ds}: JSON ({len(data):,}) == CSV ({csv_count:,})")

    # --- Check 3: Year ranges ---
    print("\n--- Year Ranges ---")
    for ds in DATASETS:
        if ds not in json_data:
            continue
        data = json_data[ds]
        years = sorted(set(r["Year"] for r in data))
        min_yr, max_yr = years[0], years[-1]
        if ds in FULL_RANGE_DATASETS:
            check(min_yr == 1993, f"{ds}: starts 1993 (got {min_yr})")
        else:
            check(min_yr == MODERN_START_YEAR,
                  f"{ds}: starts {MODERN_START_YEAR} (got {min_yr})")
        check(max_yr == 2025, f"{ds}: ends 2025 (got {max_yr})")

    # --- Check 4: Trade value totals vs DB ---
    # Each query mirrors the exact WHERE clause used in 05_build_outputs.py
    print("\n--- Trade Value Totals (output vs DB) ---")

    # us_transborder: DOT2, all years (Year IS NOT NULL)
    if "us_transborder" in json_data:
        out_total = sum(r["TradeValue"] for r in json_data["us_transborder"])
        cur = conn.execute(
            'SELECT SUM("TradeValue") FROM dot2_state_commodity WHERE "Year" IS NOT NULL'
        )
        db_total = cur.fetchone()[0]
        pct_diff = abs(out_total - db_total) / db_total * 100
        check(pct_diff < 0.01,
              f"us_transborder total: ${out_total/1e12:.3f}T vs DB ${db_total/1e12:.3f}T (diff {pct_diff:.4f}%)")

    # us_mexico_ports: DOT1, Mexico only, Year >= 2007
    if "us_mexico_ports" in json_data:
        out_total = sum(r["TradeValue"] for r in json_data["us_mexico_ports"])
        cur = conn.execute(
            f'SELECT SUM("TradeValue") FROM dot1_state_port '
            f'WHERE "Country"=\'Mexico\' AND "Year" >= {MODERN_START_YEAR}'
        )
        db_total = cur.fetchone()[0]
        pct_diff = abs(out_total - db_total) / db_total * 100
        check(pct_diff < 0.01,
              f"us_mexico_ports total: ${out_total/1e12:.3f}T vs DB ${db_total/1e12:.3f}T (diff {pct_diff:.4f}%)")

    # monthly_trends: DOT1, Year >= 2007 AND Month IS NOT NULL
    if "monthly_trends" in json_data:
        out_total = sum(r["TradeValue"] for r in json_data["monthly_trends"])
        cur = conn.execute(
            f'SELECT SUM("TradeValue") FROM dot1_state_port '
            f'WHERE "Year" >= {MODERN_START_YEAR} AND "Month" IS NOT NULL'
        )
        db_total = cur.fetchone()[0]
        pct_diff = abs(out_total - db_total) / db_total * 100
        check(pct_diff < 0.01,
              f"monthly_trends total: ${out_total/1e12:.3f}T vs DB ${db_total/1e12:.3f}T (diff {pct_diff:.4f}%)")

    # commodity_detail: DOT2, Year >= 2007
    if "commodity_detail" in json_data:
        out_total = sum(r["TradeValue"] for r in json_data["commodity_detail"])
        cur = conn.execute(
            f'SELECT SUM("TradeValue") FROM dot2_state_commodity '
            f'WHERE "Year" >= {MODERN_START_YEAR}'
        )
        db_total = cur.fetchone()[0]
        pct_diff = abs(out_total - db_total) / db_total * 100
        check(pct_diff < 0.01,
              f"commodity_detail total: ${out_total/1e12:.3f}T vs DB ${db_total/1e12:.3f}T (diff {pct_diff:.4f}%)")

    # --- Check 5: No NULL TradeType ---
    print("\n--- TradeType Values ---")
    for ds in DATASETS:
        if ds not in json_data:
            continue
        data = json_data[ds]
        null_tt = sum(1 for r in data if r.get("TradeType") is None or r.get("TradeType") == "")
        check(null_tt == 0, f"{ds}: no NULL/empty TradeType ({null_tt} found)")
        trade_types = sorted(set(r.get("TradeType", "") for r in data))
        print(f"         TradeType values: {trade_types}")

    # --- Check 6: Texas port codes ---
    print("\n--- Texas Port Filtering ---")
    for ds in ["texas_mexico_ports", "texas_mexico_commodities"]:
        if ds not in json_data:
            continue
        data = json_data[ds]
        port_codes = set(r["PortCode"] for r in data)
        unexpected = port_codes - tx_border_ports
        check(len(unexpected) == 0,
              f"{ds}: only TX border ports (unexpected: {unexpected or 'none'})")

    # --- Check 7: texas_mexico_ports has coordinates ---
    print("\n--- Coordinate Enrichment ---")
    if "texas_mexico_ports" in json_data:
        data = json_data["texas_mexico_ports"]
        null_coords = sum(1 for r in data if r.get("Lat") is None or r.get("Lon") is None)
        check(null_coords == 0,
              f"texas_mexico_ports: all records have coordinates ({null_coords} missing)")
        null_region = sum(1 for r in data if not r.get("Region"))
        check(null_region == 0,
              f"texas_mexico_ports: all records have Region ({null_region} missing)")

    # --- Check 8: us_transborder schema (no CommodityGroup) ---
    print("\n--- Schema Checks ---")
    if "us_transborder" in json_data:
        data = json_data["us_transborder"]
        has_cg = "CommodityGroup" in data[0] if data else False
        check(not has_cg,
              f"us_transborder: no CommodityGroup column (chart-driven: dropped)")
        expected_cols = {"Year", "Country", "Mode", "TradeType", "TradeValue", "Weight"}
        actual_cols = set(data[0].keys()) if data else set()
        check(actual_cols == expected_cols,
              f"us_transborder: columns match expected {sorted(expected_cols)} (got {sorted(actual_cols)})")

    # --- Check 9: Specific value cross-checks ---
    print("\n--- Sample Value Cross-Checks ---")

    # Laredo 2024 exports from texas_mexico_ports
    if "texas_mexico_ports" in json_data:
        data = json_data["texas_mexico_ports"]
        laredo_exp = sum(r["TradeValue"] for r in data
                         if r["Port"] == "Laredo" and r["Year"] == 2024 and r["TradeType"] == "Export")
        cur = conn.execute("""
            SELECT SUM("TradeValue") FROM dot1_state_port
            WHERE "PortCode"='2304' AND "Year"=2024 AND "TradeType"='Export' AND "Country"='Mexico'
        """)
        db_val = cur.fetchone()[0]
        pct_diff = abs(laredo_exp - db_val) / db_val * 100
        check(pct_diff < 0.01,
              f"Laredo 2024 exports: ${laredo_exp/1e9:.1f}B vs DB ${db_val/1e9:.1f}B")

    # US-Mexico 2024 total from commodity_detail (DOT2, filtered to Mexico, 2007+)
    if "commodity_detail" in json_data:
        data = json_data["commodity_detail"]
        mex_2024 = sum(r["TradeValue"] for r in data
                       if r.get("Country") == "Mexico" and r["Year"] == 2024)
        cur = conn.execute("""
            SELECT SUM("TradeValue") FROM dot2_state_commodity
            WHERE "Country"='Mexico' AND "Year"=2024
        """)
        db_val = cur.fetchone()[0]
        pct_diff = abs(mex_2024 - db_val) / db_val * 100
        check(pct_diff < 0.01,
              f"US-Mexico 2024 total (commodity_detail): ${mex_2024/1e9:.1f}B vs DB ${db_val/1e9:.1f}B")

    # --- Check 10: Weight NULL handling ---
    print("\n--- Weight NULL Handling ---")
    if "us_transborder" in json_data:
        data = json_data["us_transborder"]
        # Export + surface mode should have NULL weight
        exp_truck = [r for r in data if r["TradeType"] == "Export" and r["Mode"] == "Truck"]
        null_weight = sum(1 for r in exp_truck if r.get("Weight") is None)
        check(null_weight > 0,
              f"Export Truck records with NULL weight: {null_weight}/{len(exp_truck)}", warn_only=True)

    conn.close()

    # --- Summary ---
    print("\n" + "=" * 60)
    print(f"RESULTS: {passed} passed, {failed} failed, {warnings} warnings")
    print("=" * 60)

    if failed > 0:
        print("\nValidation FAILED. Review failures above.")
        sys.exit(1)
    else:
        print("\nValidation PASSED.")

    # Write report
    report_path = STAGING_DIR / "docs" / "validation_report.md"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# Validation Report\n\n")
        f.write(f"**Status:** {'PASSED' if failed == 0 else 'FAILED'}\n")
        f.write(f"**Results:** {passed} passed, {failed} failed, {warnings} warnings\n\n")
        f.write("## Output File Summary\n\n")
        f.write("| Dataset | JSON Size | CSV Size | Rows |\n")
        f.write("|---|---|---|---|\n")
        total_json = 0
        total_csv = 0
        total_rows = 0
        for ds in DATASETS:
            jp = JSON_DIR / f"{ds}.json"
            cp = CSV_DIR / f"{ds}.csv"
            js = jp.stat().st_size / (1024 * 1024) if jp.exists() else 0
            cs = cp.stat().st_size / (1024 * 1024) if cp.exists() else 0
            rows = len(json_data.get(ds, []))
            f.write(f"| `{ds}` | {js:.1f} MB | {cs:.1f} MB | {rows:,} |\n")
            total_json += js
            total_csv += cs
            total_rows += rows
        f.write(f"| **Total** | **{total_json:.1f} MB** | **{total_csv:.1f} MB** | **{total_rows:,}** |\n")
    print(f"\nReport saved to: {report_path}")


if __name__ == "__main__":
    main()
