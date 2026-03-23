# Data Dictionary — Provenance

## Files in This Folder

### `codes-north-american-transborder-freight-raw-data.pdf`
- **Source**: Downloaded manually from BTS website on 2025-03-22
- **URL**: https://www.bts.gov/sites/bts.dot.gov/files/docs/browse-statistical-products-and-data/transborder-freight-data/220171/codes-north-american-transborder-freight-raw-data.pdf
- **What it is**: The official BTS code reference for the modern (2007+) TransBorder raw data format. Defines all coded fields used in DOT1 (Table 1), DOT2 (Table 2), and DOT3 (Table 3) CSV files.
- **Status**: This is the current, authoritative data dictionary. Our JSON lookup files in `02-Data-Staging/config/` were derived from this document and the legacy reference files below.

### `legacy-reference/` (subfolder)

These files were bundled by BTS inside the legacy raw data ZIPs (extracted from the 2006/2007 transition archive `1701.zip`). They document the pre-2007 table structure (D03–D12 format). The code values (mode, commodity, port, state, country) are the same as the modern PDF — only the table structure differs. Kept as historical reference; not required for Phase 2 processing.

- **`codes_all.xls`** — Legacy code tables (same codes as modern PDF, just in context of old table format)
- **`Data Fields for all Tables.xls`** — Column definitions per legacy table type (D03, D04, D05, etc.)
- **`Table Structure and Data Fields for Raw Data.doc`** — Prose description of field meanings for pre-2007 format
- **`Major Changes.doc`** — History of schema changes leading up to January 2007 consolidation

## Relationship to Config Files

The JSON lookup files in `02-Data-Staging/config/` are machine-readable versions of the codes in these documents:

| Config JSON | Based On |
|-------------|----------|
| `mode_codes.json` | DISAGMOT codes from the PDF |
| `commodity_codes.json` | COMMODITY2 codes from the PDF |
| `country_codes.json` | COUNTRY codes from the PDF |
| `trade_type_codes.json` | TRDTYPE codes from the PDF |
| `state_codes.json` | USASTATE codes from the PDF |
| `canadian_province_codes.json` | CANPROV codes from the PDF |
| `mexican_state_codes.json` | MEXSTATE codes from the PDF |
| `schedule_d_port_codes.json` | DEPE codes from the PDF + Census Schedule D |
| `port_coordinates.json` | BTS Border Crossing Entry Data (see below) |

## Port Coordinate Data

`02-Data-Staging/config/port_coordinates.json` provides geographic coordinates (latitude/longitude) for all 28 US-Mexico land border ports of entry. These coordinates are **not** part of the TransBorder freight data itself — they come from a separate BTS dataset.

**Source:** BTS Border Crossing Entry Data
- **Socrata dataset ID:** `keg4-3bc2`
- **API endpoint:** `https://data.bts.gov/resource/keg4-3bc2.json`
- **Query used:** `$select=port_name,port_code,state,latitude,longitude&$where=border='US-Mexico Border'&$group=port_name,port_code,state,latitude,longitude&$order=port_name`
- **Retrieved:** 2026-03-22
- **Coverage:** All 28 US-Mexico land border POEs (13 Texas, 3 New Mexico, 5 California, 6 Arizona, 1 Cross Border Xpress)
- **Not covered:** Interior ports used for air/vessel freight (e.g., 2407 Albuquerque, 2605 Phoenix, 2501 San Diego) — these are not border crossings and have no crossing coordinates

**Known naming discrepancies** between `port_coordinates.json` (BTS Border Crossing data) and `schedule_d_port_codes.json` (Census Schedule D):

| Port Code | Schedule D Name | BTS Border Crossing Name |
|-----------|----------------|--------------------------|
| 2305 | Hidalgo/Pharr | Hidalgo |
| 2404 | Fabens | Tornillo |
| 2507 | Calexico-East | Calexico East |

The normalization pipeline uses `schedule_d_port_codes.json` for canonical port names and `port_coordinates.json` only for lat/lon, joining on `port_code` to avoid these naming conflicts.
