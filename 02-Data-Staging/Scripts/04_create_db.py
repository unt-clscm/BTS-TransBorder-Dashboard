"""
04_create_db.py — Load BTS TransBorder raw data into SQLite database.

Strategy:
  - Modern (2007-2025): Use YTD files from the latest available month per year.
    YTD files contain all months' data in one file, avoiding duplicates.
    For 2020: Sep YTD (months 1-9) + Nov/Dec monthly files recovered from BTS.
              Oct 2020 raw file missing — derived via subtraction in 03_normalize.py.
    All other years (including 2009, 2023) verified complete in full audit (2026-03-22).
  - Legacy (1993-2006): Handled separately (see 03_normalize.py, future).

Tables created:
  - dot1_state_port       (State x Port cross-tab)
  - dot2_state_commodity   (State x Commodity cross-tab)
  - dot3_port_commodity    (Port x Commodity cross-tab)
  - data_inventory         (metadata: which years/months/sources were loaded)

Usage:
  python 04_create_db.py
"""

import csv
import io
import os
import re
import sqlite3
import sys
import tempfile
import zipfile
from pathlib import Path

# Resolve paths relative to this script
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
RAW_MODERN = PROJECT_ROOT / "01-Raw-Data" / "download" / "modern"
DB_PATH = SCRIPT_DIR.parent / "transborder.db"

# Column definitions for each table (matching actual BTS CSV headers)
DOT1_COLUMNS = [
    ("TRDTYPE", "INTEGER"),
    ("USASTATE", "TEXT"),
    ("DEPE", "TEXT"),
    ("DISAGMOT", "INTEGER"),
    ("MEXSTATE", "TEXT"),
    ("CANPROV", "TEXT"),
    ("COUNTRY", "TEXT"),
    ("VALUE", "REAL"),
    ("SHIPWT", "REAL"),
    ("FREIGHT_CHARGES", "REAL"),
    ("DF", "TEXT"),
    ("CONTCODE", "TEXT"),
    ("MONTH", "INTEGER"),
    ("YEAR", "INTEGER"),
]

DOT2_COLUMNS = [
    ("TRDTYPE", "INTEGER"),
    ("USASTATE", "TEXT"),
    ("COMMODITY2", "TEXT"),
    ("DISAGMOT", "INTEGER"),
    ("MEXSTATE", "TEXT"),
    ("CANPROV", "TEXT"),
    ("COUNTRY", "TEXT"),
    ("VALUE", "REAL"),
    ("SHIPWT", "REAL"),
    ("FREIGHT_CHARGES", "REAL"),
    ("DF", "TEXT"),
    ("CONTCODE", "TEXT"),
    ("MONTH", "INTEGER"),
    ("YEAR", "INTEGER"),
]

DOT3_COLUMNS = [
    ("TRDTYPE", "INTEGER"),
    ("DEPE", "TEXT"),
    ("COMMODITY2", "TEXT"),
    ("DISAGMOT", "INTEGER"),
    ("COUNTRY", "TEXT"),
    ("VALUE", "REAL"),
    ("SHIPWT", "REAL"),
    ("FREIGHT_CHARGES", "REAL"),
    ("DF", "TEXT"),
    ("CONTCODE", "TEXT"),
    ("MONTH", "INTEGER"),
    ("YEAR", "INTEGER"),
]

TABLE_DEFS = {
    "dot1_state_port": DOT1_COLUMNS,
    "dot2_state_commodity": DOT2_COLUMNS,
    "dot3_port_commodity": DOT3_COLUMNS,
}

DOT_PREFIX_MAP = {
    "dot1": "dot1_state_port",
    "dot2": "dot2_state_commodity",
    "dot3": "dot3_port_commodity",
}


def create_tables(conn):
    """Create all tables and indexes."""
    cur = conn.cursor()
    for table_name, columns in TABLE_DEFS.items():
        col_defs = ", ".join(f"{name} {dtype}" for name, dtype in columns)
        cur.execute(f"DROP TABLE IF EXISTS {table_name}")
        cur.execute(f"CREATE TABLE {table_name} ({col_defs})")

    cur.execute("DROP TABLE IF EXISTS data_inventory")
    cur.execute("""
        CREATE TABLE data_inventory (
            year INTEGER,
            source_file TEXT,
            table_name TEXT,
            row_count INTEGER,
            months_covered TEXT,
            is_partial INTEGER DEFAULT 0
        )
    """)
    conn.commit()


def create_indexes(conn):
    """Create indexes after all data is loaded."""
    cur = conn.cursor()
    indexes = {
        "dot1_state_port": ["YEAR", "MONTH", "DISAGMOT", "DEPE", "USASTATE", "COUNTRY", "TRDTYPE"],
        "dot2_state_commodity": ["YEAR", "MONTH", "DISAGMOT", "USASTATE", "COMMODITY2", "COUNTRY", "TRDTYPE"],
        "dot3_port_commodity": ["YEAR", "MONTH", "DISAGMOT", "DEPE", "COMMODITY2", "COUNTRY", "TRDTYPE"],
    }
    for table, cols in indexes.items():
        for col in cols:
            idx_name = f"idx_{table}_{col.lower()}"
            cur.execute(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table} ({col})")
    conn.commit()


def parse_value(val, col_type):
    """Parse a string value into the appropriate type."""
    if val is None:
        return None
    val = str(val).strip()
    if val == "":
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


def read_csv_from_zip(zip_path, csv_name, expected_columns):
    """Read a CSV from inside a ZIP and return rows as dicts."""
    with zipfile.ZipFile(zip_path) as z:
        with z.open(csv_name) as f:
            text = io.TextIOWrapper(f, encoding="utf-8-sig")
            reader = csv.DictReader(text)
            rows = []
            for raw_row in reader:
                row = {}
                for col_name, col_type in expected_columns:
                    row[col_name] = parse_value(raw_row.get(col_name, ""), col_type)
                rows.append(row)
            return rows


def insert_rows(conn, table_name, columns, rows):
    """Bulk insert rows into a table."""
    if not rows:
        return 0
    col_names = [c[0] for c in columns]
    placeholders = ", ".join(["?"] * len(col_names))
    sql = f"INSERT INTO {table_name} ({', '.join(col_names)}) VALUES ({placeholders})"
    cur = conn.cursor()
    cur.executemany(sql, [[row.get(c) for c in col_names] for row in rows])
    conn.commit()
    return len(rows)


def collect_all_csvs(year_dir):
    """Recursively collect all CSV files from a year directory, handling nested ZIPs.
    Returns a list of (csv_basename_lower, zip_path, csv_name_in_zip) tuples."""
    results = []
    zip_files = sorted([f for f in os.listdir(year_dir) if f.lower().endswith(".zip")])

    for zf_name in zip_files:
        zf_path = os.path.join(year_dir, zf_name)
        try:
            with zipfile.ZipFile(zf_path) as z:
                names = z.namelist()
                # Check for CSVs directly in this ZIP
                csvs = [n for n in names if n.lower().endswith(".csv") and not os.path.basename(n).startswith("._")]
                for csv_name in csvs:
                    results.append((os.path.basename(csv_name).lower(), zf_path, csv_name))

                # Check for nested ZIPs
                inner_zips = [n for n in names if n.lower().endswith(".zip") and not os.path.basename(n).startswith("._")]
                for inner_zip_name in inner_zips:
                    try:
                        with z.open(inner_zip_name) as inner_data:
                            inner_bytes = inner_data.read()
                        # Write to temp file and scan
                        with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp:
                            tmp.write(inner_bytes)
                            tmp_path = tmp.name
                        try:
                            with zipfile.ZipFile(tmp_path) as inner_z:
                                inner_csvs = [n for n in inner_z.namelist()
                                              if n.lower().endswith(".csv") and not os.path.basename(n).startswith("._")]
                                for csv_name in inner_csvs:
                                    results.append((os.path.basename(csv_name).lower(), tmp_path, csv_name))
                            # Don't delete tmp yet — we may need to read from it later
                            # Store the path so we can clean up after processing
                        except zipfile.BadZipFile:
                            os.unlink(tmp_path)
                    except (zipfile.BadZipFile, Exception) as e:
                        print(f"    WARNING: Could not read inner ZIP {inner_zip_name}: {e}")
        except zipfile.BadZipFile as e:
            print(f"    WARNING: Bad ZIP {zf_name}: {e}")

    return results


def find_best_source(csv_entries, dot_prefix):
    """From a list of (basename, zip_path, csv_name) entries, find the best
    YTD or annual file for a given dot prefix. Returns (zip_path, csv_name, is_partial) or None."""
    ytd_pattern = re.compile(re.escape(dot_prefix) + r"_ytd_(\d{2})(\d{2})\.csv$", re.IGNORECASE)
    annual_pattern = re.compile(re.escape(dot_prefix) + r"_(\d{4})\.csv$", re.IGNORECASE)

    best_ytd_month = -1
    best_ytd = None

    annual_match_entry = None

    for basename, zip_path, csv_name in csv_entries:
        m = ytd_pattern.match(basename)
        if m:
            month = int(m.group(1))
            if month > best_ytd_month:
                best_ytd_month = month
                best_ytd = (zip_path, csv_name)

        m2 = annual_pattern.match(basename)
        if m2:
            annual_match_entry = (zip_path, csv_name)

    if best_ytd:
        return best_ytd[0], best_ytd[1], best_ytd_month < 12
    if annual_match_entry:
        return annual_match_entry[0], annual_match_entry[1], False
    return None, None, False


def log_insert(conn, year, source_desc, table_name, rows, is_partial):
    """Insert rows and log to data_inventory."""
    columns = TABLE_DEFS[table_name]
    count = insert_rows(conn, table_name, columns, rows)
    months = sorted(set(r.get("MONTH") for r in rows if r.get("MONTH") is not None))
    months_str = ",".join(str(m) for m in months) if months else "annual"
    print(f"  {table_name}: {count:,} rows from {source_desc} (months: {months_str})")
    conn.execute(
        "INSERT INTO data_inventory VALUES (?, ?, ?, ?, ?, ?)",
        (year, source_desc, table_name, count, months_str, 1 if is_partial else 0),
    )
    conn.commit()
    return count


def process_year(conn, year_dir, year):
    """Process a single year's data directory."""
    # Collect all CSVs from all ZIPs (including nested)
    csv_entries = collect_all_csvs(year_dir)

    if not csv_entries:
        print(f"  WARNING: No data files found in {year_dir}")
        return

    # Track temp files to clean up
    temp_files = set()
    for _, zip_path, _ in csv_entries:
        if tempfile.gettempdir() in zip_path:
            temp_files.add(zip_path)

    try:
        for dot_prefix, table_name in DOT_PREFIX_MAP.items():
            columns = TABLE_DEFS[table_name]
            zip_path, csv_name, is_partial = find_best_source(csv_entries, dot_prefix)
            if zip_path and csv_name:
                rows = read_csv_from_zip(zip_path, csv_name, columns)
                # Build source description
                source_desc = os.path.basename(zip_path) + "/" + csv_name
                if tempfile.gettempdir() in zip_path:
                    # For nested ZIPs, show the outer ZIP name
                    source_desc = f"(nested)/{csv_name}"
                log_insert(conn, year, source_desc, table_name, rows, is_partial)
            else:
                print(f"  WARNING: No data found for {table_name} in {year}")
    finally:
        # Clean up temp files
        for tmp in temp_files:
            try:
                os.unlink(tmp)
            except OSError:
                pass


def main():
    if not RAW_MODERN.exists():
        print(f"ERROR: Raw data directory not found: {RAW_MODERN}")
        sys.exit(1)

    print(f"Database: {DB_PATH}")
    print(f"Source:   {RAW_MODERN}")
    print()

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")

    print("Creating tables...")
    create_tables(conn)

    years = sorted(
        int(d) for d in os.listdir(RAW_MODERN)
        if os.path.isdir(os.path.join(RAW_MODERN, d)) and d.isdigit()
    )
    # Exclude 2026 (incomplete year — only Jan available)
    years = [y for y in years if y <= 2025]

    for year in years:
        year_dir = os.path.join(RAW_MODERN, str(year))
        print(f"\n--- {year} ---")
        process_year(conn, year_dir, year)

    print("\nCreating indexes...")
    create_indexes(conn)

    # Summary
    print("\n=== SUMMARY ===")
    cur = conn.cursor()
    for table_name in TABLE_DEFS:
        cur.execute(f"SELECT COUNT(*) FROM {table_name}")
        total = cur.fetchone()[0]
        cur.execute(f"SELECT MIN(YEAR), MAX(YEAR) FROM {table_name}")
        min_yr, max_yr = cur.fetchone()
        cur.execute(f"SELECT COUNT(DISTINCT YEAR) FROM {table_name}")
        year_count = cur.fetchone()[0]
        print(f"  {table_name}: {total:,} rows ({min_yr}-{max_yr}, {year_count} years)")

    cur.execute("SELECT year, table_name, months_covered FROM data_inventory WHERE is_partial = 1")
    partials = cur.fetchall()
    if partials:
        print("\n  PARTIAL YEARS:")
        for year, table, months in partials:
            print(f"    {year} {table}: months {months}")

    # Show any years with missing tables
    all_years = set(y for y in years)
    for table_name in TABLE_DEFS:
        cur.execute(f"SELECT DISTINCT YEAR FROM {table_name}")
        loaded_years = set(r[0] for r in cur.fetchall())
        missing = all_years - loaded_years
        if missing:
            print(f"\n  MISSING YEARS for {table_name}: {sorted(missing)}")

    conn.close()
    print(f"\nDone. Database saved to: {DB_PATH}")


if __name__ == "__main__":
    main()
