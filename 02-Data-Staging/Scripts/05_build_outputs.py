"""
05_build_outputs.py -- Generate chart-driven dashboard JSON + CSV files from SQLite DB.

Produces 7 datasets in two formats (JSON + CSV) in 03-Processed-Data/.
Each dataset draws from exactly ONE DOT table -- no joins between tables.
Datasets are designed to serve specific Phase 3 dashboard charts.

Year-range strategy:
  - us_transborder: ALL years (1993-2025) -- Overview page shows the full 33-year story
    at a high aggregation level (Year/Country/Mode/TradeType). Legacy data is reliable
    for trade value totals.
  - All other datasets: 2007+ ONLY -- Detail pages (ports, commodities, states, monthly)
    start at the Jan 2007 consolidation boundary. This avoids exposing legacy-era field
    gaps (NULL weight/freight for exports, no DOT3 surface data, mode discontinuity at
    Nov 2003) in drill-down charts. See 01-Raw-Data/data_dictionary/data_caveats.md.

Datasets:
  1. us_transborder           DOT2  Annual  Year/Country/Mode/TradeType summary (Overview, Trade by Mode) -- 1993-2025
  2. us_mexico_ports          DOT1  Annual  US-Mexico port-level with Mode (port map, rankings, trends) -- 2007+
  3. texas_mexico_ports       DOT1  Annual  TX border ports with region/coordinates (TX port tabs) -- 2007+
  4. texas_mexico_commodities DOT3  Annual  TX border port-commodity detail (TX Commodities tab) -- 2007+
  5. us_state_trade           DOT1  Annual  State-level trade (Trade by State, Overview Top 10 States) -- 2007+
  6. commodity_detail         DOT2  Annual  Commodity by country/mode (Commodities page + US-Mexico commodity charts) -- 2007+
  7. monthly_trends           DOT1  Monthly Country/mode time series (TX Monthly tab) -- 2007+

Design note: The previous us_mexico_commodities dataset (DOT2, Mexico-only with State
dimension) was eliminated. No US-Mexico chart needs commodities broken down by state.
commodity_detail already provides HSCode x CommodityGroup x Mode x TradeType, and
the browser filters to Country=Mexico as needed.

Usage:
  python 05_build_outputs.py
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

# Year boundary: detail datasets start at the Jan 2007 consolidation.
# Overview (us_transborder) uses all years for the full 33-year story.
MODERN_START_YEAR = 2007


def load_port_coordinates():
    """Load port coordinates from config JSON."""
    path = CONFIG_DIR / "port_coordinates.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    # Skip metadata keys starting with _
    return {k: v for k, v in data.items() if not k.startswith("_")}


def load_texas_border_ports():
    """Load Texas border port codes and region mappings from config JSON.

    Returns (port_set, region_map) where port_set is a set of port code strings
    and region_map is {port_code: region_name}.
    """
    path = CONFIG_DIR / "texas_border_ports.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    # Skip metadata keys starting with _
    ports = {k: v for k, v in data.items() if not k.startswith("_")}
    port_set = set(ports.keys())
    region_map = {k: v["region"] for k, v in ports.items()}
    return port_set, region_map


def run_query(conn, sql):
    """Execute SQL and return list of dicts."""
    cur = conn.cursor()
    cur.execute(sql)
    cols = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    return [dict(zip(cols, row)) for row in rows]


def write_outputs(name, records, json_dir, csv_dir):
    """Write records as JSON and CSV."""
    if not records:
        print(f"  WARNING: {name} has 0 records, removing stale outputs")
        for d, ext in [(json_dir, "json"), (csv_dir, "csv")]:
            stale = d / f"{name}.{ext}"
            if stale.exists():
                stale.unlink()
        return

    # JSON -- compact, no pretty-print
    json_path = json_dir / f"{name}.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(records, f, separators=(",", ":"), ensure_ascii=False)
    json_size = json_path.stat().st_size / (1024 * 1024)

    # CSV
    csv_path = csv_dir / f"{name}.csv"
    keys = list(records[0].keys())
    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        writer.writerows(records)
    csv_size = csv_path.stat().st_size / (1024 * 1024)

    print(f"  {name}: {len(records):,} rows  (JSON {json_size:.1f} MB, CSV {csv_size:.1f} MB)")


def build_us_transborder(conn):
    """Dataset 1: Year/Country/Mode/TradeType summary. Source: DOT2.

    Charts: Overview StatCards, LineChart, DonutChart, StackedBarChart.
            Trade by Mode: all charts.
    Note: CommodityGroup dropped — no chart on these pages needs it.
    """
    sql = """
        SELECT
            "Year",
            "Country",
            "Mode",
            COALESCE("TradeType", 'Unknown') AS "TradeType",
            ROUND(SUM("TradeValue"), 2) AS "TradeValue",
            CASE WHEN SUM(CASE WHEN "Weight" IS NOT NULL THEN 1 ELSE 0 END) > 0
                 THEN ROUND(SUM("Weight"), 2) ELSE NULL END AS "Weight"
        FROM dot2_state_commodity
        WHERE "Year" IS NOT NULL
        GROUP BY "Year", "Country", "Mode", COALESCE("TradeType", 'Unknown')
        ORDER BY "Year", "Country", "Mode", "TradeType"
    """
    return run_query(conn, sql)


def build_us_mexico_ports(conn):
    """Dataset 2: US-Mexico port-level trade with Mode. Source: DOT1, Mexico only, 2007+.

    Charts: US-Mexico BarChart (top ports), DataTable.
            US-Mexico Ports: PortMap, BarChart, LineChart, DataTable.
    Mode kept for port-by-mode filtering on the Ports page.
    """
    sql = f"""
        SELECT
            "Year",
            "PortCode",
            "Port",
            "StateCode",
            "State",
            "Mode",
            COALESCE("TradeType", 'Unknown') AS "TradeType",
            ROUND(SUM("TradeValue"), 2) AS "TradeValue",
            CASE WHEN SUM(CASE WHEN "Weight" IS NOT NULL THEN 1 ELSE 0 END) > 0
                 THEN ROUND(SUM("Weight"), 2) ELSE NULL END AS "Weight",
            CASE WHEN SUM(CASE WHEN "FreightCharges" IS NOT NULL THEN 1 ELSE 0 END) > 0
                 THEN ROUND(SUM("FreightCharges"), 2) ELSE NULL END AS "FreightCharges"
        FROM dot1_state_port
        WHERE "Country" = 'Mexico' AND "Year" >= {MODERN_START_YEAR}
        GROUP BY "Year", "PortCode", "Port", "StateCode", "State", "Mode", COALESCE("TradeType", 'Unknown')
        ORDER BY "Year", "PortCode", "Mode", "TradeType"
    """
    return run_query(conn, sql)


def build_texas_mexico_ports(conn, port_coords, tx_ports, port_region):
    """Dataset 3: Texas border port trade with region/coordinates. Source: DOT1, 2007+.

    Charts: TX Overview tab (StatCards, LineChart, DonutChart, BarChart).
            TX Ports tab (PortMap, BarChart, LineChart, DataTable).
            TX Modes tab (all mode charts).
    """
    port_list = ",".join(f"'{p}'" for p in tx_ports)
    sql = f"""
        SELECT
            "Year",
            "PortCode",
            "Port",
            "Mode",
            COALESCE("TradeType", 'Unknown') AS "TradeType",
            ROUND(SUM("TradeValue"), 2) AS "TradeValue",
            CASE WHEN SUM(CASE WHEN "Weight" IS NOT NULL THEN 1 ELSE 0 END) > 0
                 THEN ROUND(SUM("Weight"), 2) ELSE NULL END AS "Weight",
            CASE WHEN SUM(CASE WHEN "FreightCharges" IS NOT NULL THEN 1 ELSE 0 END) > 0
                 THEN ROUND(SUM("FreightCharges"), 2) ELSE NULL END AS "FreightCharges"
        FROM dot1_state_port
        WHERE "Country" = 'Mexico'
          AND "PortCode" IN ({port_list})
          AND "Year" >= {MODERN_START_YEAR}
        GROUP BY "Year", "PortCode", "Port", "Mode", COALESCE("TradeType", 'Unknown')
        ORDER BY "Year", "PortCode", "Mode", "TradeType"
    """
    records = run_query(conn, sql)
    # Enrich with region and coordinates
    for r in records:
        code = r["PortCode"]
        r["Region"] = port_region.get(code, "")
        coords = port_coords.get(code, {})
        r["Lat"] = coords.get("lat")
        r["Lon"] = coords.get("lon")
    return records


def build_texas_mexico_commodities(conn, tx_ports):
    """Dataset 4: TX border port commodity detail. Source: DOT3, 2007+.

    Charts: TX Commodities tab TreemapChart, BarChart, LineChart, DataTable.
    Note: DOT3 surface data doesn't exist before 2007 anyway, but the explicit
    year filter keeps this consistent with other detail datasets.
    """
    port_list = ",".join(f"'{p}'" for p in tx_ports)
    sql = f"""
        SELECT
            "Year",
            "PortCode",
            "Port",
            "HSCode",
            "Commodity",
            "CommodityGroup",
            "Mode",
            COALESCE("TradeType", 'Unknown') AS "TradeType",
            ROUND(SUM("TradeValue"), 2) AS "TradeValue",
            CASE WHEN SUM(CASE WHEN "Weight" IS NOT NULL THEN 1 ELSE 0 END) > 0
                 THEN ROUND(SUM("Weight"), 2) ELSE NULL END AS "Weight"
        FROM dot3_port_commodity
        WHERE "Country" = 'Mexico'
          AND "PortCode" IN ({port_list})
          AND "Year" >= {MODERN_START_YEAR}
        GROUP BY "Year", "PortCode", "Port", "HSCode", "Commodity",
                 "CommodityGroup", "Mode", COALESCE("TradeType", 'Unknown')
        ORDER BY "Year", "PortCode", "HSCode", "Mode", "TradeType"
    """
    return run_query(conn, sql)


def build_us_state_trade(conn):
    """Dataset 5: State-level trade by country/mode. Source: DOT1, 2007+.

    Charts: Trade by State BarChart, LineChart, DataTable.
            Overview Top 10 States BarChart.
    """
    sql = f"""
        SELECT
            "Year",
            "StateCode",
            "State",
            "Country",
            "Mode",
            COALESCE("TradeType", 'Unknown') AS "TradeType",
            ROUND(SUM("TradeValue"), 2) AS "TradeValue"
        FROM dot1_state_port
        WHERE "Year" >= {MODERN_START_YEAR}
        GROUP BY "Year", "StateCode", "State", "Country", "Mode", COALESCE("TradeType", 'Unknown')
        ORDER BY "Year", "StateCode", "Country", "Mode", "TradeType"
    """
    return run_query(conn, sql)


def build_commodity_detail(conn):
    """Dataset 6: Commodity detail by country/mode. Source: DOT2, 2007+.

    Charts: Commodity Analysis TreemapChart, BarChart, LineChart, DataTable.
            US-Mexico commodity TreemapChart, BarChart, DataTable (filtered to Mexico in browser).
    """
    sql = f"""
        SELECT
            "Year",
            "Country",
            "HSCode",
            "Commodity",
            "CommodityGroup",
            "Mode",
            COALESCE("TradeType", 'Unknown') AS "TradeType",
            ROUND(SUM("TradeValue"), 2) AS "TradeValue",
            CASE WHEN SUM(CASE WHEN "Weight" IS NOT NULL THEN 1 ELSE 0 END) > 0
                 THEN ROUND(SUM("Weight"), 2) ELSE NULL END AS "Weight"
        FROM dot2_state_commodity
        WHERE "Year" >= {MODERN_START_YEAR}
        GROUP BY "Year", "Country", "HSCode", "Commodity", "CommodityGroup",
                 "Mode", COALESCE("TradeType", 'Unknown')
        ORDER BY "Year", "Country", "HSCode", "Mode", "TradeType"
    """
    return run_query(conn, sql)


def build_monthly_trends(conn):
    """Dataset 7: Monthly time series by country/mode. Source: DOT1, 2007+.

    Charts: TX Monthly tab LineChart, Heatmap/StackedBarChart, DataTable.
    """
    sql = f"""
        SELECT
            "Year",
            "Month",
            "Country",
            "Mode",
            COALESCE("TradeType", 'Unknown') AS "TradeType",
            ROUND(SUM("TradeValue"), 2) AS "TradeValue"
        FROM dot1_state_port
        WHERE "Year" >= {MODERN_START_YEAR} AND "Month" IS NOT NULL
        GROUP BY "Year", "Month", "Country", "Mode", COALESCE("TradeType", 'Unknown')
        ORDER BY "Year", "Month", "Country", "Mode", "TradeType"
    """
    return run_query(conn, sql)


def main():
    if not DB_PATH.exists():
        print(f"ERROR: Database not found: {DB_PATH}")
        print("Run 04_create_db.py first.")
        sys.exit(1)

    # Create output directories
    JSON_DIR.mkdir(parents=True, exist_ok=True)
    CSV_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Database: {DB_PATH}")
    print(f"Output:   {OUTPUT_DIR}")
    print()

    # Load config
    port_coords = load_port_coordinates()
    tx_ports, port_region = load_texas_border_ports()

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA cache_size=-200000")

    datasets = [
        ("us_transborder", lambda: build_us_transborder(conn)),
        ("us_mexico_ports", lambda: build_us_mexico_ports(conn)),
        ("texas_mexico_ports", lambda: build_texas_mexico_ports(conn, port_coords, tx_ports, port_region)),
        ("texas_mexico_commodities", lambda: build_texas_mexico_commodities(conn, tx_ports)),
        ("us_state_trade", lambda: build_us_state_trade(conn)),
        ("commodity_detail", lambda: build_commodity_detail(conn)),
        ("monthly_trends", lambda: build_monthly_trends(conn)),
    ]

    print("Building datasets...")
    total_rows = 0
    for name, builder in datasets:
        print(f"\n  [{name}]")
        records = builder()
        write_outputs(name, records, JSON_DIR, CSV_DIR)
        total_rows += len(records)

    conn.close()

    # Clean up removed datasets from previous runs
    for old_name in ["us_mexico_commodities"]:
        for d in [JSON_DIR, CSV_DIR]:
            ext = "json" if d == JSON_DIR else "csv"
            old_file = d / f"{old_name}.{ext}"
            if old_file.exists():
                old_file.unlink()
                print(f"\n  Removed obsolete: {old_file.name}")

    # Print summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"  Total rows across all datasets: {total_rows:,}")

    json_total = sum(f.stat().st_size for f in JSON_DIR.glob("*.json")) / (1024 * 1024)
    csv_total = sum(f.stat().st_size for f in CSV_DIR.glob("*.csv")) / (1024 * 1024)
    print(f"  JSON total: {json_total:.1f} MB ({len(list(JSON_DIR.glob('*.json')))} files)")
    print(f"  CSV total:  {csv_total:.1f} MB ({len(list(CSV_DIR.glob('*.csv')))} files)")
    print(f"\n  Output: {OUTPUT_DIR}")
    print("Done.")


if __name__ == "__main__":
    main()
