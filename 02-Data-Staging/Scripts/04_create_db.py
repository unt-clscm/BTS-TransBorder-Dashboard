"""
04_create_db.py -- Load cleaned/normalized CSVs into a SQLite database.

Reads from 02-Data-Staging/cleaned/ (output of 03_normalize.py).
Creates 3 tables mirroring the BTS DOT table structure, plus a summary table.

Tables created:
  - dot1_state_port       (State x Port, 1993-2025)
  - dot2_state_commodity   (State x Commodity, 1993-2025)
  - dot3_port_commodity    (Port x Commodity, Nov 2003-2025: air/vessel Nov 2003-2006 via AV tables, all modes 2007+)
  - load_summary           (metadata about what was loaded)

Usage:
  python 04_create_db.py
"""

import csv
import os
import sqlite3
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
STAGING_DIR = SCRIPT_DIR.parent
CLEANED_DIR = STAGING_DIR / "cleaned"
DB_PATH = STAGING_DIR / "transborder.db"

# Table definitions: (csv_filename, table_name, columns_with_types)
TABLES = {
    "dot1_state_port": {
        "csv": "dot1_state_port.csv",
        "columns": [
            ("Year", "INTEGER"), ("Month", "INTEGER"), ("TradeType", "TEXT"),
            ("StateCode", "TEXT"), ("State", "TEXT"), ("PortCode", "TEXT"),
            ("Port", "TEXT"), ("Mode", "TEXT"), ("MexState", "TEXT"),
            ("CanProv", "TEXT"), ("Country", "TEXT"), ("TradeValue", "REAL"),
            ("Weight", "REAL"), ("FreightCharges", "REAL"), ("DF", "TEXT"),
            ("ContCode", "TEXT"),
        ],
        "indexes": ["Year", "Month", "TradeType", "StateCode", "PortCode",
                     "Mode", "Country"],
    },
    "dot2_state_commodity": {
        "csv": "dot2_state_commodity.csv",
        "columns": [
            ("Year", "INTEGER"), ("Month", "INTEGER"), ("TradeType", "TEXT"),
            ("StateCode", "TEXT"), ("State", "TEXT"), ("HSCode", "TEXT"),
            ("Commodity", "TEXT"), ("CommodityGroup", "TEXT"), ("Mode", "TEXT"),
            ("MexState", "TEXT"), ("CanProv", "TEXT"), ("Country", "TEXT"),
            ("TradeValue", "REAL"), ("Weight", "REAL"),
            ("FreightCharges", "REAL"), ("DF", "TEXT"), ("ContCode", "TEXT"),
        ],
        "indexes": ["Year", "Month", "TradeType", "StateCode", "HSCode",
                     "CommodityGroup", "Mode", "Country"],
    },
    "dot3_port_commodity": {
        "csv": "dot3_port_commodity.csv",
        "columns": [
            ("Year", "INTEGER"), ("Month", "INTEGER"), ("TradeType", "TEXT"),
            ("PortCode", "TEXT"), ("Port", "TEXT"), ("HSCode", "TEXT"),
            ("Commodity", "TEXT"), ("CommodityGroup", "TEXT"), ("Mode", "TEXT"),
            ("Country", "TEXT"), ("TradeValue", "REAL"), ("Weight", "REAL"),
            ("FreightCharges", "REAL"), ("DF", "TEXT"), ("ContCode", "TEXT"),
        ],
        "indexes": ["Year", "Month", "TradeType", "PortCode", "HSCode",
                     "CommodityGroup", "Mode", "Country"],
    },
}

BATCH_SIZE = 50_000


def parse_value(val, col_type):
    """Parse a CSV string value into the appropriate SQLite type."""
    if val is None or val == "" or val == "nan":
        return None
    if col_type == "INTEGER":
        try:
            return int(float(val))
        except (ValueError, TypeError):
            return None
    elif col_type == "REAL":
        try:
            return float(val)
        except (ValueError, TypeError):
            return None
    return val


def load_table(conn, table_name, table_def):
    """Load a cleaned CSV into a SQLite table."""
    csv_path = CLEANED_DIR / table_def["csv"]
    if not csv_path.exists():
        print(f"  WARNING: {csv_path} not found, skipping {table_name}")
        return 0

    columns = table_def["columns"]
    col_names = [c[0] for c in columns]
    col_types = {c[0]: c[1] for c in columns}

    # Create table
    cur = conn.cursor()
    cur.execute(f"DROP TABLE IF EXISTS {table_name}")
    col_defs = ", ".join(f'"{name}" {dtype}' for name, dtype in columns)
    cur.execute(f"CREATE TABLE {table_name} ({col_defs})")
    conn.commit()

    # Load CSV in batches
    placeholders = ", ".join(["?"] * len(col_names))
    col_list = ", ".join(f'"{c}"' for c in col_names)
    sql = f"INSERT INTO {table_name} ({col_list}) VALUES ({placeholders})"

    total_rows = 0
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        batch = []
        for row in reader:
            values = [parse_value(row.get(c, ""), col_types[c]) for c in col_names]
            batch.append(values)
            if len(batch) >= BATCH_SIZE:
                cur.executemany(sql, batch)
                total_rows += len(batch)
                batch = []
                if total_rows % 500_000 == 0:
                    print(f"    ... {total_rows:,} rows loaded")
        if batch:
            cur.executemany(sql, batch)
            total_rows += len(batch)
    conn.commit()

    # Create indexes
    for col in table_def["indexes"]:
        idx_name = f"idx_{table_name}_{col.lower()}"
        cur.execute(f'CREATE INDEX IF NOT EXISTS {idx_name} ON {table_name} ("{col}")')
    conn.commit()

    return total_rows


def main():
    if not CLEANED_DIR.exists():
        print(f"ERROR: Cleaned data directory not found: {CLEANED_DIR}")
        print("Run 03_normalize.py first.")
        sys.exit(1)

    print(f"Database: {DB_PATH}")
    print(f"Source:   {CLEANED_DIR}")
    print()

    # Remove old database if it exists
    if DB_PATH.exists():
        DB_PATH.unlink()
        print("Removed existing database.")

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=-200000")  # 200MB cache

    results = {}
    for table_name, table_def in TABLES.items():
        print(f"\nLoading {table_name} from {table_def['csv']}...")
        count = load_table(conn, table_name, table_def)
        results[table_name] = count
        print(f"  {table_name}: {count:,} rows loaded")

    # Create summary table
    cur = conn.cursor()
    cur.execute("DROP TABLE IF EXISTS load_summary")
    cur.execute("""
        CREATE TABLE load_summary (
            table_name TEXT,
            row_count INTEGER,
            min_year INTEGER,
            max_year INTEGER,
            year_count INTEGER
        )
    """)
    for table_name in TABLES:
        cur.execute(f'SELECT COUNT(*), MIN("Year"), MAX("Year"), COUNT(DISTINCT "Year") FROM {table_name}')
        count, min_yr, max_yr, yr_count = cur.fetchone()
        cur.execute(
            "INSERT INTO load_summary VALUES (?, ?, ?, ?, ?)",
            (table_name, count, min_yr, max_yr, yr_count),
        )
    conn.commit()

    # Print summary
    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    for table_name in TABLES:
        cur.execute(f'SELECT COUNT(*), MIN("Year"), MAX("Year"), COUNT(DISTINCT "Year") FROM {table_name}')
        count, min_yr, max_yr, yr_count = cur.fetchone()
        print(f"  {table_name}: {count:,} rows ({min_yr}-{max_yr}, {yr_count} years)")

    db_size = DB_PATH.stat().st_size / (1024 * 1024)
    print(f"\nDatabase size: {db_size:.1f} MB")
    print(f"Saved to: {DB_PATH}")

    conn.close()
    print("Done.")


if __name__ == "__main__":
    main()
