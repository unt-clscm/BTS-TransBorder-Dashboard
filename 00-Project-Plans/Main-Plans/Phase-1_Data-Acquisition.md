# Phase 1: Data Acquisition & Documentation

## Context

The BTS North American TransBorder Freight Data spans April 1993 to 2025 with a major schema change in January 2007. Data must be downloaded, cataloged, and mapped before processing. Per project instructions: download **all process complete** datasets (BTS reports data in different formats within TransBorder); do **not** download 2026 data. The **unified database** (single database with multiple tables, one per dataset type) is produced in **Phase 2** from the raw data acquired here.

**Source**: https://www.bts.gov/topics/transborder-raw-data

## Directory Structure

```
.gitignore                 <- Exclude raw data, .env, SQLite DB, etc.
requirements.txt           <- Python dependencies

01-Raw-Data/               <- Raw data from source (never modified after download)
  legacy/                  (Apr 1993 - Dec 2006, pre-consolidation files)
  modern/                  (Jan 2007 - 2025, consolidated format)

02-Data-Staging/           <- Scripts + intermediary data + configs
  Scripts/
    00_check_availability.py
    01a_download_legacy.py
    01b_download_modern.py
    01_download_bts.py
    02_document_schemas.py
    03_extract_code_tables.py
    update_year.py
  config/
    .env
    schema_mappings.json
    port_aliases.json
    mode_codes.json
    commodity_codes.json
    country_codes.json
    trade_type_codes.json
    state_codes.json
    canadian_province_codes.json
    mexican_state_codes.json
    schedule_d_port_codes.json
  docs/
    schema_analysis.md
    data_dictionary/       <- Source PDFs and reference documents
```

## 1.1 Download Strategy: Raw File Downloads (All Eras)

### API Status (as of March 2026)

The Socrata SODA API dataset `yrut-prtq` (Port and Commodity TransBorder Freight Data) has been **removed** from all BTS/DOT Socrata portals (`data.bts.gov`, `data.transportation.gov`, `datahub.transportation.gov`). The only TransBorder assets remaining on Socrata are story/visualization wrappers (`kijm-95mr`, `myhq-rm6q`) with no underlying queryable dataset. The old `transborder.bts.gov` interactive query tool is also offline.

**Consequence**: Both legacy and modern data must be acquired via raw file downloads from the BTS website. The download strategy is now **unified raw file downloads** for all eras.

**API monitoring**: Before each yearly update, check whether BTS has re-published TransBorder data on Socrata. If an API endpoint becomes available, the download script should prefer it for new years. Contact: Sean Jahanmir (sean.jahanmir@dot.gov, 202-760-1007).

| Era | Method | Source | Notes |
|---|---|---|---|
| **Pre-consolidation (Apr 1993 - Dec 2006)** | Raw CSV/DBF/ZIP download | https://www.bts.gov/topics/transborder-raw-data | Up to 24 separate tables per month; data split by mode, direction, surface/air |
| **Post-consolidation (Jan 2007 - 2025)** | Raw CSV/ZIP download | https://www.bts.gov/topics/transborder-raw-data | 3 consolidated tables (Surface, Air/Vessel, Pipeline) |
| **Future years (2026+)** | Raw file download (or API if re-published) | Same page | Check API availability first; fall back to raw files |

### Major Schema Change: January 2007

Before January 2007, TransBorder data was published as up to **24 separate tables** (split by mode, trade direction, surface/air/vessel). In January 2007, BTS consolidated these into **3 unified tables** with new/renamed fields:

| Change | Pre-2007 | Post-2007 |
|---|---|---|
| Table structure | Up to 24 separate tables | 3 tables: Surface, Air/Vessel, Pipeline |
| Commodity field | `TSUSA` (imports) / `SCH_B` (exports) | `COMMODITY` (unified) |
| State field | `DESTATE` / `ORSTATE` | `USASTATE` (unified) |
| Province field | `PROV` | `CANPROV` |
| Date fields | `STATMOYR` (6-digit MMYYYY) | `STATMO` + `STATYR` (separate) |
| Trade direction | Implicit (separate import/export files) | `TRDTYPE` field (1=Export, 2=Import) |
| Air/vessel data | Added January 2004 | Included |

### Track A: Pre-Consolidation Data Download (Apr 1993 - Dec 2006) -- One-Time

**Script**: `02-Data-Staging/Scripts/01a_download_legacy.py`

**Action**: Download raw CSV/DBF/ZIP files from the BTS website for April 1993 through December 2006.

**Source**: https://www.bts.gov/topics/transborder-raw-data

**Output**: `01-Raw-Data/legacy/` preserving original file organization:
```
01-Raw-Data/legacy/
  (files organized as downloaded -- by year, dataset type, or as-is from BTS)
```

**Key Considerations:**
- This is a **one-time download** -- pre-consolidation data does not change
- Files use varied formats: CSV, DBF, ZIP archives (script must handle all)
- Some years split data across multiple files per dataset type
- Earlier years use different column names and file naming conventions
- Air/vessel data only available from January 2004 onward
- Download all "process complete" datasets

**Reconnaissance Step (before writing the script):**
The BTS raw data page blocks automated access (403 via CDN). Before implementing `01a_download_legacy.py`:
1. Manually inspect https://www.bts.gov/topics/transborder-raw-data in a browser to catalog available files
2. Document the actual file links, naming conventions, and organization per year
3. Note which years use CSV vs DBF vs ZIP formats
4. Record whether files are direct downloads or require navigating sub-pages
5. Save this inventory as a URL manifest or hardcoded link map for the download script
6. Test whether direct file URLs (e.g., `bts.gov/sites/bts.dot.gov/files/...`) bypass the CDN block

This reconnaissance is critical because the page structure is static and unlikely to change, so a hardcoded approach is acceptable and more reliable than fragile web scraping.

**Dependencies**: Python 3, `requests`, `pandas`, `dbfread` (for DBF files)

### Track B: Post-Consolidation Data Download (Jan 2007 - 2025)

**Script**: `02-Data-Staging/Scripts/01b_download_modern.py`

**Action**: Download raw CSV/ZIP files from the BTS website for January 2007 through 2025.

**Source**: https://www.bts.gov/topics/transborder-raw-data

**Output**: `01-Raw-Data/modern/` preserving original file organization:
```
01-Raw-Data/modern/
  (files organized as downloaded -- by year/month or as-is from BTS)
```

**Post-consolidation file structure:**
Starting January 2007, BTS publishes 3 consolidated tables per month:
1. **Surface** -- Truck and rail freight
2. **Air/Vessel** -- Air and vessel freight
3. **Pipeline** -- Pipeline freight

Each file contains all ports, commodities, states, and trade directions in a single table with standardized field names.

**Key Considerations:**
- Same CDN access issues as Track A -- may require hardcoded URL manifest
- Files are typically monthly CSVs or ZIPs containing CSVs
- Field names are consistent across all post-2007 files
- Supports `--year 2025` flag to download a specific year only

### Combined Download Wrapper

**Script**: `02-Data-Staging/Scripts/01_download_bts.py`

Runs both tracks in sequence:
```bash
# Full initial download (one-time)
python 02-Data-Staging/Scripts/01_download_bts.py

# Downloads only a specific year (for yearly updates)
python 02-Data-Staging/Scripts/01_download_bts.py --year 2026
```

**Behavior:**
1. If `01-Raw-Data/legacy/` is empty or `--force-legacy`: runs Track A (one-time legacy download)
2. For modern data: runs Track B for each year not yet in `01-Raw-Data/modern/`
3. With `--year YYYY`: only downloads that specific year (skips legacy entirely)
4. Prints summary: files downloaded, total size, years covered

**Output directory structure:**
```
01-Raw-Data/
  legacy/              (Apr 1993 - Dec 2006, pre-consolidation -- one-time)
  modern/              (Jan 2007 - 2025, post-consolidation)
```

**Dependencies**: Python 3, `requests`, `pandas`, `dbfread` (for legacy DBF files), `python-dotenv`

## 1.2 Data Dictionary & Code Table Acquisition

TransBorder data uses numeric and character codes for most fields. These must be decoded into human-readable values for the dashboard. BTS publishes official code tables, and additional reference tables come from Census and CBP.

### 1.2.1 Source Documents

The following reference documents must be downloaded manually (BTS blocks automated access) and saved to `02-Data-Staging/docs/data_dictionary/`:

| Document | URL | Content |
|---|---|---|
| **All Codes for TransBorder Freight Data** (PDF) | https://www.bts.gov/sites/bts.dot.gov/files/docs/browse-statistical-products-and-data/transborder-freight-data/220171/all-codes-north-american-transborder-freight-raw-data.pdf | Complete code tables for all TransBorder fields |
| **Codes for TransBorder Freight Data** (PDF) | https://www.bts.gov/sites/bts.dot.gov/files/docs/browse-statistical-products-and-data/transborder-freight-data/220171/codes-north-american-transborder-freight-raw-data.pdf | Partial codes reference |
| **TransBorder Codes** (web page) | https://www.bts.gov/browse-statistical-products-and-data/transborder-freight-data/transborder-codes | Online code tables |
| **TransBorder FAQ** | https://www.bts.gov/statistical-products/transborder-freight-data/north-american-transborder-freight-data-faqs | Field descriptions and data notes |
| **TransBorder Documentation** (ROSA P archive) | https://rosap.ntl.bts.gov/view/dot/38978/dot_38978_DS1.pdf | Archived program documentation |
| **Schedule D Port Codes** (CBP, current) | https://www.cbp.gov/sites/default/files/2026-02/ace_appendix_e_schedule_d_feb_3_2026_508c_0.pdf | Official port-of-entry codes |
| **Schedule D Port Codes** (Census) | https://www.census.gov/foreign-trade/schedules/d/distcode.html | Port district/code reference |

### 1.2.2 Coded Fields in TransBorder Data

TransBorder uses **HS (Harmonized Schedule) 2-digit commodity codes**, NOT SCTG. SCTG is used by the Commodity Flow Survey (CFS) and FAF -- a separate classification system. At the 2-digit level, HS, HTSUSA (imports), and Schedule B (exports) are functionally identical.

| Field Name | Code Type | Values | Source |
|---|---|---|---|
| `DISAGMOT` | Mode of transportation | 1-digit numeric (1-9) | BTS internal |
| `COMMODITY` | HS 2-digit commodity | 2-digit character (01-99) | HTSUSA / Schedule B |
| `TRDTYPE` | Trade direction | 1=Export, 2=Import | BTS (post-2007 only) |
| `COUNTRY` | Country | 4-digit numeric (1220=Canada, 2010=Mexico) | BTS/Census |
| `DEPE` | District/Port of Entry | 4-digit numeric (Schedule D) | Census/CBP |
| `USASTATE` | U.S. state | 2-letter USPS code | Standard |
| `CANPROV` | Canadian province | 2-letter with X prefix (XA=Alberta, etc.) | BTS custom |
| `MEXSTATE` | Mexican state | 2-letter BTS code (exports only) | BTS custom |
| `CONTCODE` | Container code | 1=Containerized, blank=Not | BTS |
| `DF` | Domestic/Foreign | 1=Domestic, 2=Foreign | BTS |

**Numeric (non-coded) fields:**

| Field | Description | Unit |
|---|---|---|
| `VALUE` | Trade value | US dollars |
| `SHIPWT` | Shipping weight | Kilograms |
| `CHARGES` | Shipping charges (imports only) | US dollars |
| `FREIGHT` | Freight costs (exports only) | US dollars |
| `STATMO` | Statistical month | 01-12 |
| `STATYR` | Statistical year | 4-digit |

### 1.2.3 Code Table Extraction

**Script**: `02-Data-Staging/Scripts/03_extract_code_tables.py`

**Action**: Parse the BTS code PDFs and reference documents to produce machine-readable JSON lookup files in `02-Data-Staging/config/`.

**Output files:**

| File | Content | Entries |
|---|---|---|
| `mode_codes.json` | `DISAGMOT` code → mode name | 9 codes |
| `commodity_codes.json` | HS 2-digit code → commodity description | ~98 codes |
| `country_codes.json` | 4-digit code → country name | 2 codes (Canada, Mexico) |
| `trade_type_codes.json` | `TRDTYPE` code → direction name | 2 codes (Export, Import) |
| `schedule_d_port_codes.json` | 4-digit DEPE → port name, district, state | ~300+ codes |
| `state_codes.json` | USPS code → state full name | 50+ entries |
| `canadian_province_codes.json` | BTS X-prefix code → province name | 14 entries |
| `mexican_state_codes.json` | BTS 2-letter code → state name | 33 entries |
| `port_aliases.json` | Spelling variations → canonical port name | As discovered |

**Mode codes (complete):**
```json
{
  "1": "Vessel",
  "3": "Air",
  "4": "Mail",
  "5": "Truck",
  "6": "Rail",
  "7": "Pipeline",
  "8": "Other/Unknown",
  "9": "Foreign Trade Zone"
}
```

**HS 2-digit commodity codes (sample):**
```json
{
  "01": "Live animals",
  "27": "Mineral fuels, oils, waxes",
  "84": "Nuclear reactors, boilers, machinery",
  "85": "Electrical machinery and equipment",
  "87": "Vehicles other than railway/tramway",
  "99": "Special classification provisions"
}
```

**Schedule D port codes -- Texas-Mexico border (sample):**
```json
{
  "2301": {"port": "Brownsville", "district": "Laredo", "state": "TX"},
  "2302": {"port": "Del Rio", "district": "Laredo", "state": "TX"},
  "2303": {"port": "Eagle Pass", "district": "Laredo", "state": "TX"},
  "2304": {"port": "Laredo", "district": "Laredo", "state": "TX"},
  "2305": {"port": "Hidalgo/Pharr", "district": "Laredo", "state": "TX"},
  "2307": {"port": "Rio Grande City", "district": "Laredo", "state": "TX"},
  "2309": {"port": "Progreso", "district": "Laredo", "state": "TX"},
  "2310": {"port": "Roma", "district": "Laredo", "state": "TX"},
  "2402": {"port": "El Paso", "district": "El Paso", "state": "TX"},
  "2403": {"port": "Presidio", "district": "El Paso", "state": "TX"}
}
```

**Approach:**
1. The mode codes, trade type codes, country codes, Canadian province codes, and Mexican state codes are small and stable -- these can be hardcoded directly from the BTS documentation
2. The HS 2-digit commodity codes (98 entries) are stable and can be hardcoded from the BTS PDF
3. The Schedule D port codes (~300+ entries) change over time as ports open/close -- source from the latest CBP edition and supplement with historical port codes found in legacy data
4. Port aliases should be built iteratively during Phase 2 normalization as spelling variations are discovered in the actual data

**Note on SCTG crosswalk:** If FAF (Freight Analysis Framework) compatibility is needed in the future, Census publishes an HS-to-SCTG crosswalk mapping ~98 HS 2-digit codes to 43 SCTG codes. This is NOT needed for the TransBorder dashboard but can be added as an optional lookup.

## 1.3 Document Schema Differences

**Script**: `02-Data-Staging/Scripts/02_document_schemas.py`

**Action**: Read headers from every downloaded CSV, catalog differences between two major eras.

**Output**: `02-Data-Staging/docs/schema_analysis.md`

**Two Eras:**
| Era | Period | Characteristics |
|---|---|---|
| Pre-consolidation | Apr 1993 - Dec 2006 | Up to 24 separate tables, different column names, TSUSA/SCH_B commodity fields, split import/export files, air/vessel added Jan 2004 |
| Post-consolidation | Jan 2007 - 2025 | 3 consolidated tables (Surface, Air/Vessel, Pipeline), unified column names, TRDTYPE field, standardized schema |

**Documentation Must Include:**
- Field names per year per dataset type
- Column data types
- Missing/extra variables by year
- Naming variations (e.g., `TSUSA` vs `SCH_B` vs `COMMODITY`)
- Pre/post-consolidation field mappings (documented in section 1.1)
- File organization differences (24 tables vs 3 tables; split files within years)
- Weight data: `SHIPWT` in kilograms (conversion to short tons in Phase 2)
- Commodity classification: HS 2-digit codes throughout, but field names differ by era
- Mode encoding: `DISAGMOT` codes 1-9 (see section 1.2.2)
- Historical note: `MEXSTATE` code `BN` (Baja California Norte) was used erroneously Apr 1994 - May 1998; correct code is `BC`

**Data Normalization Plan (per project instructions):** The same documentation must propose a clear strategy to: (1) normalize schemas across eras via mapping configs, (2) merge files across all years in the processing pipeline (Phase 2), and (3) ensure compatibility for dashboard analytics. This strategy is implemented in Phase 2 (normalization script + unified schema).

**Available Dimensions:**
- Modes: Vessel, Air, Mail, Truck, Rail, Pipeline, Other/Unknown, Foreign Trade Zone (codes 1, 3-9)
- Commodities: HS 2-digit codes (01-99)
- Ports: U.S. ports of entry/exit (Schedule D 4-digit codes)
- States: U.S. state (USPS 2-letter), Canadian province (BTS X-prefix), Mexican state (BTS 2-letter)
- Trade direction: Export (1), Import (2)
- Countries: Canada (1220), Mexico (2010)
- Metrics: Value (US dollars), Shipping weight (kilograms), Charges/Freight (US dollars)

## 1.4 Schema Mapping Config

**Files:**
- `02-Data-Staging/config/schema_mappings.json` -- Machine-readable `{pre_consolidation_column -> post_consolidation_column}` per dataset type
- `02-Data-Staging/config/port_aliases.json` -- Port name spelling variations across decades
- All code table JSON files listed in section 1.2.3

**Example schema_mappings.json structure:**
```json
{
  "field_mappings": {
    "TSUSA": "COMMODITY",
    "SCH_B": "COMMODITY",
    "DESTATE": "USASTATE",
    "ORSTATE": "USASTATE",
    "PROV": "CANPROV",
    "VAL": "VALUE"
  },
  "date_mappings": {
    "pre_2007": {
      "source": "STATMOYR",
      "format": "MMYYYY",
      "target_month": "STATMO",
      "target_year": "STATYR"
    },
    "post_2007": {
      "source_month": "STATMO",
      "source_year": "STATYR"
    }
  }
}
```

## 1.5 BTS Data Release Schedule & 2026 Data Availability

### How BTS Publishes Data
- BTS releases TransBorder data **monthly** on a fixed schedule mandated by the Office of Management and Budget
- There is a consistent **~2-month lag** between the end of a reporting month and data publication
- Example: November 2025 data was released January 30, 2026
- BTS also publishes an **annual summary report** ~3 months after year-end (e.g., 2024 annual report released March 20, 2025)

### 2026 Data Timeline
| Milestone | Expected Date |
|---|---|
| 2025 full-year data (all 12 months) | Available now (Dec 2025 data released ~Feb 2026) |
| 2026 monthly data begins appearing | ~March 2026 (Jan 2026 data) |
| 2026 December data published | ~Late February 2027 |
| 2026 full-year annual report | ~March-April 2027 |

### Update Policy
- **Only incorporate a new year when all 12 months are available** -- no partial years
- Current build: 1993-2025 (complete)
- 2026 data: Wait until ~March 2027 when December 2026 data is published
- The download script and pipeline are designed so adding a new year is a single config change + re-run

## 1.6 Yearly Update Pipeline (End-to-End)

The entire data-to-dashboard pipeline is designed to be **re-runnable** so that adding a new year of data flows seamlessly through to the live dashboard.

### Update Workflow (run annually, ~March of the following year)

```
Step 1: Check availability
  02-Data-Staging/Scripts/00_check_availability.py
  -> Checks BTS raw data page for the target year's files (all 12 months)
  -> Also checks if Socrata API has been re-published (tries known dataset IDs)
  -> Outputs: "Year YYYY: 12/12 months available -- ready to update" or abort

Step 2: Download new year
  02-Data-Staging/Scripts/01_download_bts.py --year 2026
  -> Downloads raw files for the new year into 01-Raw-Data/modern/
  -> Prefers API if available; falls back to raw file download
  -> Existing years are not re-downloaded (idempotent)

Step 3: Normalize new year
  02-Data-Staging/Scripts/03_normalize.py --year 2026
  -> Applies schema mappings and code table lookups
  -> Decodes all coded fields to human-readable values
  -> Outputs to 02-Data-Staging/cleaned/ (or regenerates full set)

Step 4: Rebuild database
  02-Data-Staging/Scripts/04_create_db.py
  -> Rebuilds SQLite with all years including the new one
  -> Output: 02-Data-Staging/transborder.db

Step 5: Generate final processed CSVs
  02-Data-Staging/Scripts/05_build_dashboard_csvs.py
  -> Generates all 6 dashboard CSVs
  -> Output goes to 03-Processed-Data/

Step 6: Validate
  02-Data-Staging/Scripts/06_validate.py
  -> Confirms new year is present, row counts correct, no regressions

Step 7: Rebuild & deploy dashboard
  cd WebApp && npm run build
  -> Dashboard reads CSVs from 03-Processed-Data/
  -> No code changes needed -- charts, filters, and stat cards adapt dynamically
```

### One-Command Update Script

**Script**: `02-Data-Staging/Scripts/update_year.py`

A wrapper that runs Steps 1-6 in sequence with a single command:
```bash
python 02-Data-Staging/Scripts/update_year.py --year 2026
```

**Behavior:**
1. Checks BTS for 12/12 months available -- aborts if incomplete
2. Downloads only the specified year (API if available, raw files otherwise)
3. Normalizes and appends to cleaned data
4. Rebuilds SQLite DB
5. Regenerates all 6 dashboard CSVs
6. Runs validation
7. Prints summary: rows added, year range now covered, CSV sizes
8. Exits with success/failure code for CI integration

### Availability Check Script

**Script**: `02-Data-Staging/Scripts/00_check_availability.py`

**Action**: Check BTS for data availability for a target year.

**Strategy (multi-method):**
1. **Check Socrata API** -- Try known dataset IDs (`yrut-prtq` and any newly discovered IDs) to see if API has been re-published
2. **Check raw data page** -- If API unavailable, verify raw file availability on BTS website (may require manual confirmation due to CDN blocking)
3. **Check Monthly Transportation Statistics** -- The Socrata dataset `crem-w557` includes TransBorder summary columns and can confirm whether a year's data has been released

```python
# Pseudocode
import requests

# Method 1: Check if SODA API is back
KNOWN_IDS = ["yrut-prtq"]  # Add new IDs if discovered
for dataset_id in KNOWN_IDS:
    try:
        resp = requests.get(
            f"https://data.bts.gov/resource/{dataset_id}.json",
            params={"$select": "DISTINCT STATYR", "$limit": 50000}
        )
        if resp.status_code == 200 and resp.json():
            print(f"API available at {dataset_id}!")
            years = {r['STATYR'] for r in resp.json()}
            # Check target year
    except:
        pass

# Method 2: Check Monthly Transportation Statistics for TransBorder columns
resp = requests.get(
    "https://data.bts.gov/resource/crem-w557.json",
    params={
        "$select": "date",
        "$where": f"date >= '{year}-01-01' AND date <= '{year}-12-31'",
        "$limit": 50000
    }
)
# If rows exist for all 12 months, data is likely available for download

# Method 3: Manual check prompt
print(f"Visit https://www.bts.gov/topics/transborder-raw-data in a browser")
print(f"Confirm files for year {year} are listed as 'process complete'")
```

### Design Principles for Seamless Updates

1. **Year range is dynamic**: Dashboard reads min/max year from the data, not hardcoded
   - Filter dropdowns auto-populate from `[...new Set(data.map(d => d.Year))].sort()`
   - StatCard year labels use the latest year in the data
   - Line charts extend automatically to cover new years
2. **No code changes required**: Adding a year only means re-running the pipeline and rebuilding
3. **Idempotent downloads**: `01_download_bts.py` skips years already in `01-Raw-Data/` unless `--force` is passed
4. **Incremental normalization**: `03_normalize.py` can process a single year (`--year 2026`) or all years
5. **Validation gates**: `06_validate.py` must pass before dashboard CSVs are considered ready
6. **CSV size monitoring**: The update script reports final CSV sizes to flag if they exceed the ~10MB budget

### Yearly Update Calendar

| When | Action |
|---|---|
| ~March each year | Run `00_check_availability.py` to see if previous year is complete |
| Once confirmed | Run `update_year.py --year YYYY` to add the new year |
| After pipeline | Run `npm run build` in WebApp/ and deploy |
| Ongoing | No action needed until next March |

---

## Deliverables Checklist

### Data Downloads
- [ ] `.gitignore` -- Exclude raw data, `.env`, SQLite DB, and other generated files from version control
- [ ] `requirements.txt` -- Python dependencies (`requests`, `pandas`, `dbfread`, `python-dotenv`)
- [ ] `02-Data-Staging/Scripts/01a_download_legacy.py` -- Pre-consolidation downloader (Apr 1993 - Dec 2006, one-time)
- [ ] `02-Data-Staging/Scripts/01b_download_modern.py` -- Post-consolidation downloader (Jan 2007 - 2025)
- [ ] `02-Data-Staging/Scripts/01_download_bts.py` -- Combined wrapper (runs both tracks, supports `--year`)
- [ ] `01-Raw-Data/legacy/` -- Pre-consolidation raw files (Apr 1993 - Dec 2006)
- [ ] `01-Raw-Data/modern/` -- Post-consolidation raw files (Jan 2007 - 2025)

### Data Dictionary & Code Tables
- [ ] `02-Data-Staging/docs/data_dictionary/` -- BTS code PDFs and reference documents (manual download)
- [ ] `02-Data-Staging/Scripts/03_extract_code_tables.py` -- Code table extraction script
- [ ] `02-Data-Staging/config/mode_codes.json` -- Mode code-to-name lookup (9 entries)
- [ ] `02-Data-Staging/config/commodity_codes.json` -- HS 2-digit code-to-description lookup (~98 entries)
- [ ] `02-Data-Staging/config/country_codes.json` -- Country code-to-name lookup (2 entries)
- [ ] `02-Data-Staging/config/trade_type_codes.json` -- Trade type code-to-name lookup (2 entries)
- [ ] `02-Data-Staging/config/schedule_d_port_codes.json` -- Schedule D port code-to-name/district/state lookup (~300+ entries)
- [ ] `02-Data-Staging/config/state_codes.json` -- USPS state code-to-name lookup (50+ entries)
- [ ] `02-Data-Staging/config/canadian_province_codes.json` -- BTS province code-to-name lookup (14 entries)
- [ ] `02-Data-Staging/config/mexican_state_codes.json` -- BTS Mexican state code-to-name lookup (33 entries)
- [ ] `02-Data-Staging/config/port_aliases.json` -- Port name spelling variations (built iteratively)

### Schema Documentation
- [ ] `02-Data-Staging/Scripts/02_document_schemas.py` -- Schema analysis script
- [ ] `02-Data-Staging/docs/schema_analysis.md` -- Complete schema documentation
- [ ] `02-Data-Staging/config/schema_mappings.json` -- Pre/post-consolidation column mapping config
- [ ] Data normalization plan documented in schema analysis

### Update Pipeline
- [ ] `02-Data-Staging/Scripts/00_check_availability.py` -- Data availability checker (multi-method: API probe + raw file check)
- [ ] `02-Data-Staging/Scripts/update_year.py` -- One-command yearly update wrapper (Steps 1-6)
- [ ] `02-Data-Staging/config/.env` -- API token if Socrata API is re-published (gitignored)
