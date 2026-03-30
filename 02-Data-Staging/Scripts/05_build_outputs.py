"""
05_build_outputs.py -- Generate chart-driven dashboard JSON + CSV files from SQLite DB.

Produces 19 datasets in two formats (JSON + CSV) in 03-Processed-Data/.
Each dataset draws from exactly ONE DOT table -- no joins between tables.
Datasets are designed to serve specific Phase 3 dashboard charts.

Year-range strategy:
  All datasets now use the full year range (1993-2025) so that trend lines, Texas
  overlays, and national summaries are consistent. The Jan 2007 schema consolidation
  is a structural boundary but NOT a data-availability boundary — DOT1 and DOT2 have
  reliable state/port/commodity data going back to 1993. DOT3 surface data starts at
  2003 (naturally limited by the source). Weight and FreightCharges are NULL for most
  pre-2007 exports; the frontend already handles NULL gracefully (displays "N/A").

Datasets:
  1. us_transborder           DOT2  Annual  Year/Country/Mode/TradeType summary (Overview, Trade by Mode) -- 1993+
  2. us_mexico_ports          DOT1  Annual  US-Mexico port-level with Mode (port map, rankings, trends) -- 1993+
  3. texas_mexico_ports       DOT1  Annual  TX border ports with region/coordinates (TX port tabs) -- 1993+
  4. texas_mexico_commodities DOT3  Annual  TX border port-commodity detail (TX Commodities tab) -- 2003+ (DOT3 starts 2003)
  5. us_state_trade           DOT1  Annual  State-level trade (Trade by State, Overview Top 10 States) -- 1993+
  6. commodity_detail         DOT2  Annual  Commodity by country/mode (Commodities page + US-Mexico commodity charts) -- 1993+
  7. monthly_trends           DOT1  Monthly Country/mode time series (TX Monthly tab) -- 1993+
  8. us_canada_ports          DOT1  Annual  US-Canada port-level with Mode (Overview map, future Canada page) -- 1993+
  9. mexican_state_trade      DOT1  Annual  Mexican state trade (US-Mexico States tab choropleth) -- 1993+
 10. texas_mexican_state_trade DOT1  Annual  Mexican states via TX ports (TX-Mexico States tab choropleth) -- 1993+

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

# Year boundary: all datasets now use the full year range (1993+) so that
# trend lines and Texas overlays match the national summary. The Jan 2007
# schema consolidation is noted in comments but does not limit extraction.
MODERN_START_YEAR = 1993

# Conversion factor: 1 kg = 2.20462 lb
KG_TO_LB = 2.20462


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


BORDER_STATES = {"TX": "Texas", "CA": "California", "AZ": "Arizona", "NM": "New Mexico"}


def load_port_state_map():
    """Load port-code → border state name mapping from Schedule D port codes.

    Only maps ports in the four US-Mexico border states (TX, CA, AZ, NM)
    to their full state names. Non-border-state ports get empty string.
    """
    path = CONFIG_DIR / "schedule_d_port_codes.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return {k: BORDER_STATES.get(v.get("state", ""), "")
            for k, v in data.items() if not k.startswith("_")}


def run_query(conn, sql):
    """Execute SQL and return list of dicts."""
    cur = conn.cursor()
    cur.execute(sql)
    cols = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    return [dict(zip(cols, row)) for row in rows]


NO_WEIGHT_EXPORT_MODES = {
    "Truck", "Rail", "Pipeline",
    "Mail (U.S. Postal Service)", "Other/Unknown",
}


def add_weight_lb(records):
    """Add WeightLb (pounds) column to records that have a non-null Weight (kg).

    Also nullifies Weight/WeightLb for export modes that don't report weight
    (Truck, Rail, Pipeline, Mail, Other/Unknown) where the source data has 0
    meaning 'not reported' rather than 'zero kg'.
    """
    for r in records:
        w = r.get("Weight")
        # Safety net: nullify unreported export weights that slipped through
        # as 0 from the database (should already be NULL from 03_normalize).
        if (w is not None and w == 0
                and r.get("TradeType") == "Export"
                and r.get("Mode") in NO_WEIGHT_EXPORT_MODES):
            r["Weight"] = None
            w = None
        r["WeightLb"] = round(w * KG_TO_LB, 2) if w is not None else None
    return records


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


def build_us_mexico_ports(conn, port_state_map):
    """Dataset 2: US-Mexico port-level trade with Mode. Source: DOT1, Mexico only, 2007+.

    Charts: US-Mexico BarChart (top ports), DataTable.
            US-Mexico Ports: PortMap, BarChart, LineChart, DataTable.
    Mode kept for port-by-mode filtering on the Ports page.
    PortState derived from Schedule D port codes (physical state of the port).
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
    records = run_query(conn, sql)
    for r in records:
        r["PortState"] = port_state_map.get(r["PortCode"], "")
    return records


def build_us_canada_ports(conn):
    """Dataset 8: US-Canada port-level trade with Mode. Source: DOT1, Canada only, 2007+.

    Charts: Overview page PortMap (Canadian border ports).
    Same aggregation as us_mexico_ports but filtered to Country='Canada'.
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
        WHERE "Country" = 'Canada' AND "Year" >= {MODERN_START_YEAR}
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


def build_texas_mexico_port_states(conn, port_coords, tx_ports, port_region):
    """Dataset 3b: Texas border port trade broken down by U.S. state. Source: DOT1, 2007+.

    Same as texas_mexico_ports but with StateCode/State in the GROUP BY,
    giving per-state granularity for the State (Origin/Dest) sidebar filter.
    Loaded lazily on the Ports tab only when a state filter is active.
    """
    port_list = ",".join(f"'{p}'" for p in tx_ports)
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
        WHERE "Country" = 'Mexico'
          AND "PortCode" IN ({port_list})
          AND "Year" >= {MODERN_START_YEAR}
        GROUP BY "Year", "PortCode", "Port", "StateCode", "State",
                 "Mode", COALESCE("TradeType", 'Unknown')
        ORDER BY "Year", "PortCode", "State", "Mode", "TradeType"
    """
    records = run_query(conn, sql)
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
            ROUND(SUM("TradeValue"), 2) AS "TradeValue",
            CASE WHEN SUM(CASE WHEN "Weight" IS NOT NULL THEN 1 ELSE 0 END) > 0
                 THEN ROUND(SUM("Weight"), 2) ELSE NULL END AS "Weight"
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


def build_mexican_state_trade(conn):
    """Dataset 9: Mexican state-level trade by mode. Source: DOT1, Mexico only, 2007+.

    Charts: US-Mexico States tab (ChoroplethMap, BarChart, LineChart, DataTable).
            Shows which Mexican states are trading partners with the US.
    """
    sql = f"""
        SELECT
            "Year",
            "MexState",
            "Mode",
            COALESCE("TradeType", 'Unknown') AS "TradeType",
            ROUND(SUM("TradeValue"), 2) AS "TradeValue",
            CASE WHEN SUM(CASE WHEN "Weight" IS NOT NULL THEN 1 ELSE 0 END) > 0
                 THEN ROUND(SUM("Weight"), 2) ELSE NULL END AS "Weight"
        FROM dot1_state_port
        WHERE "Country" = 'Mexico' AND "Year" >= {MODERN_START_YEAR}
          AND "MexState" IS NOT NULL AND "MexState" != ''
          AND "MexState" NOT IN ('State Unknown', 'Unknown')
        GROUP BY "Year", "MexState", "Mode", COALESCE("TradeType", 'Unknown')
        ORDER BY "Year", "MexState", "Mode", "TradeType"
    """
    return run_query(conn, sql)


def build_texas_mexican_state_trade(conn, tx_ports):
    """Dataset 10: Mexican states trading through Texas border ports. Source: DOT1, 2007+.

    Charts: Texas-Mexico States tab (ChoroplethMap, BarChart, LineChart, DataTable).
            Shows which Mexican states trade through Texas border ports.
    """
    port_list = ",".join(f"'{p}'" for p in tx_ports)
    sql = f"""
        SELECT
            "Year",
            "MexState",
            "Mode",
            COALESCE("TradeType", 'Unknown') AS "TradeType",
            ROUND(SUM("TradeValue"), 2) AS "TradeValue",
            CASE WHEN SUM(CASE WHEN "Weight" IS NOT NULL THEN 1 ELSE 0 END) > 0
                 THEN ROUND(SUM("Weight"), 2) ELSE NULL END AS "Weight"
        FROM dot1_state_port
        WHERE "Country" = 'Mexico'
          AND "PortCode" IN ({port_list})
          AND "Year" >= {MODERN_START_YEAR}
          AND "MexState" IS NOT NULL AND "MexState" != ''
          AND "MexState" NOT IN ('State Unknown', 'Unknown')
        GROUP BY "Year", "MexState", "Mode", COALESCE("TradeType", 'Unknown')
        ORDER BY "Year", "MexState", "Mode", "TradeType"
    """
    return run_query(conn, sql)


def build_od_state_flows(conn):
    """Dataset 11: Origin-destination flows US State x MX State x Port. Source: DOT1, 2007+.

    Charts: US-Mexico Trade Flows tab (ChordDiagram, SankeyDiagram, HeatmapTable).
            Shows which US states trade with which Mexican states through which ports.
    """
    sql = f"""
        SELECT
            "Year",
            "State",
            "MexState",
            "PortCode",
            "Port",
            "Mode",
            COALESCE("TradeType", 'Unknown') AS "TradeType",
            ROUND(SUM("TradeValue"), 2) AS "TradeValue",
            CASE WHEN SUM(CASE WHEN "Weight" IS NOT NULL THEN 1 ELSE 0 END) > 0
                 THEN ROUND(SUM("Weight"), 2) ELSE NULL END AS "Weight"
        FROM dot1_state_port
        WHERE "Country" = 'Mexico' AND "Year" >= {MODERN_START_YEAR}
          AND "State" IS NOT NULL AND "State" != ''
          AND "MexState" IS NOT NULL AND "MexState" != ''
          AND "MexState" NOT IN ('State Unknown', 'Unknown')
        GROUP BY "Year", "State", "MexState", "PortCode", "Port",
                 "Mode", COALESCE("TradeType", 'Unknown')
        ORDER BY "Year", "State", "MexState", "PortCode", "Mode", "TradeType"
    """
    return run_query(conn, sql)


def build_od_canada_prov_flows(conn):
    """Dataset 13: Aggregated origin-destination flows US State x Canadian Province x Port.
    Source: DOT1, 2007+.

    Aggregated to State x CanProv x Port totals (no year/mode/tradetype breakdown)
    to keep the JSON small enough for browser use (~2-3 MB vs 87 MB).
    Used for: Overview map connections for Canadian border ports.
    """
    sql = f"""
        SELECT
            "State",
            "CanProv",
            "PortCode",
            "Port",
            ROUND(SUM("TradeValue"), 2) AS "TradeValue"
        FROM dot1_state_port
        WHERE "Country" = 'Canada' AND "Year" >= {MODERN_START_YEAR}
          AND "State" IS NOT NULL AND "State" != ''
          AND "CanProv" IS NOT NULL AND "CanProv" != ''
          AND "CanProv" NOT IN ('Province Unknown', 'Unknown')
        GROUP BY "State", "CanProv", "PortCode", "Port"
        ORDER BY "State", "CanProv", "PortCode"
    """
    return run_query(conn, sql)


def build_texas_od_state_flows(conn, tx_ports):
    """Dataset 12: OD flows through Texas border ports. Source: DOT1, 2007+.

    Charts: Texas-Mexico Trade Flows tab (ChordDiagram, SankeyDiagram, HeatmapTable).
    """
    port_list = ",".join(f"'{p}'" for p in tx_ports)
    sql = f"""
        SELECT
            "Year",
            "State",
            "MexState",
            "PortCode",
            "Port",
            "Mode",
            COALESCE("TradeType", 'Unknown') AS "TradeType",
            ROUND(SUM("TradeValue"), 2) AS "TradeValue",
            CASE WHEN SUM(CASE WHEN "Weight" IS NOT NULL THEN 1 ELSE 0 END) > 0
                 THEN ROUND(SUM("Weight"), 2) ELSE NULL END AS "Weight"
        FROM dot1_state_port
        WHERE "Country" = 'Mexico'
          AND "PortCode" IN ({port_list})
          AND "Year" >= {MODERN_START_YEAR}
          AND "State" IS NOT NULL AND "State" != ''
          AND "MexState" IS NOT NULL AND "MexState" != ''
          AND "MexState" NOT IN ('State Unknown', 'Unknown')
        GROUP BY "Year", "State", "MexState", "PortCode", "Port",
                 "Mode", COALESCE("TradeType", 'Unknown')
        ORDER BY "Year", "State", "MexState", "PortCode", "Mode", "TradeType"
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
            ROUND(SUM("TradeValue"), 2) AS "TradeValue",
            CASE WHEN SUM(CASE WHEN "Weight" IS NOT NULL THEN 1 ELSE 0 END) > 0
                 THEN ROUND(SUM("Weight"), 2) ELSE NULL END AS "Weight"
        FROM dot1_state_port
        WHERE "Year" >= {MODERN_START_YEAR} AND "Month" IS NOT NULL
        GROUP BY "Year", "Month", "Country", "Mode", COALESCE("TradeType", 'Unknown')
        ORDER BY "Year", "Month", "Country", "Mode", "TradeType"
    """
    return run_query(conn, sql)


def build_monthly_commodity_trends(conn):
    """Dataset 14: Monthly commodity trends by group. Source: DOT2, Mexico only, 2007+.

    Charts: Seasonal commodity patterns (vegetables peak in winter, energy stable).
    Aggregated by Year/Month/CommodityGroup/Mode/TradeType to keep size manageable.
    """
    sql = f"""
        SELECT
            "Year",
            "Month",
            "CommodityGroup",
            "Mode",
            COALESCE("TradeType", 'Unknown') AS "TradeType",
            ROUND(SUM("TradeValue"), 2) AS "TradeValue",
            CASE WHEN SUM(CASE WHEN "Weight" IS NOT NULL THEN 1 ELSE 0 END) > 0
                 THEN ROUND(SUM("Weight"), 2) ELSE NULL END AS "Weight"
        FROM dot2_state_commodity
        WHERE "Country" = 'Mexico' AND "Year" >= {MODERN_START_YEAR} AND "Month" IS NOT NULL
        GROUP BY "Year", "Month", "CommodityGroup", "Mode", COALESCE("TradeType", 'Unknown')
        ORDER BY "Year", "Month", "CommodityGroup", "Mode", "TradeType"
    """
    return run_query(conn, sql)


def build_state_commodity_trade(conn):
    """Dataset 15: State-level commodity trade. Source: DOT2, Mexico only, 2007+.

    Charts: Texas vs other states by commodity — what Texas specializes in
    relative to Michigan, California, Illinois.
    Aggregated by Year/State/CommodityGroup/Mode/TradeType.
    """
    sql = f"""
        SELECT
            "Year",
            "StateCode",
            "State",
            "CommodityGroup",
            "Mode",
            COALESCE("TradeType", 'Unknown') AS "TradeType",
            ROUND(SUM("TradeValue"), 2) AS "TradeValue",
            CASE WHEN SUM(CASE WHEN "Weight" IS NOT NULL THEN 1 ELSE 0 END) > 0
                 THEN ROUND(SUM("Weight"), 2) ELSE NULL END AS "Weight"
        FROM dot2_state_commodity
        WHERE "Country" = 'Mexico' AND "Year" >= {MODERN_START_YEAR}
          AND "State" IS NOT NULL AND "State" != ''
        GROUP BY "Year", "StateCode", "State", "CommodityGroup", "Mode",
                 COALESCE("TradeType", 'Unknown')
        ORDER BY "Year", "State", "CommodityGroup", "Mode", "TradeType"
    """
    return run_query(conn, sql)


def build_commodity_mexstate_trade(conn):
    """Dataset 16: Commodity trade by Mexican state. Source: DOT2, Mexico only, 2007+.

    Charts: What each Mexican state trades — Nuevo Leon is machinery-heavy,
    Tamaulipas is mixed, Queretaro is auto.
    Aggregated by Year/MexState/CommodityGroup/Mode/TradeType.
    """
    sql = f"""
        SELECT
            "Year",
            "MexState",
            "CommodityGroup",
            "Mode",
            COALESCE("TradeType", 'Unknown') AS "TradeType",
            ROUND(SUM("TradeValue"), 2) AS "TradeValue",
            CASE WHEN SUM(CASE WHEN "Weight" IS NOT NULL THEN 1 ELSE 0 END) > 0
                 THEN ROUND(SUM("Weight"), 2) ELSE NULL END AS "Weight"
        FROM dot2_state_commodity
        WHERE "Country" = 'Mexico' AND "Year" >= {MODERN_START_YEAR}
          AND "MexState" IS NOT NULL AND "MexState" != ''
          AND "MexState" NOT IN ('State Unknown', 'Unknown')
        GROUP BY "Year", "MexState", "CommodityGroup", "Mode",
                 COALESCE("TradeType", 'Unknown')
        ORDER BY "Year", "MexState", "CommodityGroup", "Mode", "TradeType"
    """
    return run_query(conn, sql)


def build_containerization_trade(conn):
    """Dataset 17: Containerization and domestic/foreign status. Source: DOT1, Mexico only, 2007+.

    Charts: Containerized vs non-containerized trade by mode over time.
    DF field: 1=domestic origin, 2=foreign origin/re-export (exports only; NULL for imports).
    ContCode: 0=not containerized, 1=containerized, X=not applicable (pipeline, other).
    Aggregated by Year/Mode/TradeType/ContCode/DF to keep size small.
    """
    sql = f"""
        SELECT
            "Year",
            "Mode",
            COALESCE("TradeType", 'Unknown') AS "TradeType",
            COALESCE("ContCode", 'U') AS "ContCode",
            COALESCE("DF", 'U') AS "DF",
            ROUND(SUM("TradeValue"), 2) AS "TradeValue",
            CASE WHEN SUM(CASE WHEN "Weight" IS NOT NULL THEN 1 ELSE 0 END) > 0
                 THEN ROUND(SUM("Weight"), 2) ELSE NULL END AS "Weight"
        FROM dot1_state_port
        WHERE "Country" = 'Mexico' AND "Year" >= {MODERN_START_YEAR}
        GROUP BY "Year", "Mode", COALESCE("TradeType", 'Unknown'),
                 COALESCE("ContCode", 'U'), COALESCE("DF", 'U')
        ORDER BY "Year", "Mode", "TradeType", "ContCode", "DF"
    """
    return run_query(conn, sql)


def build_texas_monthly_port_commodity(conn, tx_ports):
    """Dataset 18: Monthly port-by-commodity for TX ports. Source: DOT3, Mexico only, 2007+.

    Charts: Port-level seasonal commodity patterns (Pharr produce winter peaks).
    Aggregated by Year/Month/Port/CommodityGroup/Mode/TradeType.
    """
    port_list = ",".join(f"'{p}'" for p in tx_ports)
    sql = f"""
        SELECT
            "Year",
            "Month",
            "PortCode",
            "Port",
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
        GROUP BY "Year", "Month", "PortCode", "Port", "CommodityGroup",
                 "Mode", COALESCE("TradeType", 'Unknown')
        ORDER BY "Year", "Month", "PortCode", "CommodityGroup", "Mode", "TradeType"
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
    port_state_map = load_port_state_map()

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA cache_size=-200000")

    datasets = [
        ("us_transborder", lambda: build_us_transborder(conn)),
        ("us_mexico_ports", lambda: build_us_mexico_ports(conn, port_state_map)),
        ("us_canada_ports", lambda: build_us_canada_ports(conn)),
        ("texas_mexico_ports", lambda: build_texas_mexico_ports(conn, port_coords, tx_ports, port_region)),
        ("texas_mexico_port_states", lambda: build_texas_mexico_port_states(conn, port_coords, tx_ports, port_region)),
        ("texas_mexico_commodities", lambda: build_texas_mexico_commodities(conn, tx_ports)),
        ("us_state_trade", lambda: build_us_state_trade(conn)),
        ("commodity_detail", lambda: build_commodity_detail(conn)),
        ("monthly_trends", lambda: build_monthly_trends(conn)),
        ("mexican_state_trade", lambda: build_mexican_state_trade(conn)),
        ("texas_mexican_state_trade", lambda: build_texas_mexican_state_trade(conn, tx_ports)),
        ("od_state_flows", lambda: build_od_state_flows(conn)),
        ("od_canada_prov_flows", lambda: build_od_canada_prov_flows(conn)),
        ("texas_od_state_flows", lambda: build_texas_od_state_flows(conn, tx_ports)),
        ("monthly_commodity_trends", lambda: build_monthly_commodity_trends(conn)),
        ("state_commodity_trade", lambda: build_state_commodity_trade(conn)),
        ("commodity_mexstate_trade", lambda: build_commodity_mexstate_trade(conn)),
        ("containerization_trade", lambda: build_containerization_trade(conn)),
        ("texas_monthly_port_commodity", lambda: build_texas_monthly_port_commodity(conn, tx_ports)),
    ]

    print("Building datasets...")
    total_rows = 0
    for name, builder in datasets:
        print(f"\n  [{name}]")
        records = builder()
        # Add WeightLb (pounds) wherever Weight (kg) exists
        if records and "Weight" in records[0]:
            add_weight_lb(records)
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
