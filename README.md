# BTS TransBorder Freight Data — Texas-Mexico Border Database

A comprehensive data pipeline and interactive dashboard for the **Bureau of Transportation Statistics (BTS) TransBorder Freight Data** program, covering all U.S. surface, air, vessel, and pipeline freight trade with Mexico and Canada from **1993 to 2025**.

Built as part of **TxDOT IAC Task 1.3** (Texas-Mexico Border Database) at the University of North Texas.

---

## Quick Start

### View the Dashboard

The web dashboard is deployed on GitHub Pages. To run locally:

```bash
cd WebApp
npm install
npm run dev
```

### Re-run the Data Pipeline

```bash
cd 02-Data-Staging/Scripts
pip install -r requirements.txt
python 03_normalize.py      # Raw data -> cleaned CSVs
python 04_create_db.py      # Cleaned CSVs -> SQLite database
python 05_build_outputs.py  # Database -> 7 output datasets (JSON + CSV)
python 06_validate.py       # Validate output datasets
```

---

## Directory Structure

```
BTS-TransBorder/
|
|-- 00-Project-Management/      Project planning and documentation
|   |-- Main-Plans/             Phase plans (1-4) and project instructions
|   |-- Data-Requests/          BTS data request emails and prompts
|   |-- GitHub-Research-.../    Landscape research on existing dashboards
|   +-- gap-tracker.md          Living doc of known issues and open questions
|
|-- 01-Raw-Data/                Raw data as received from BTS (do not modify)
|   |-- download/               Downloaded ZIP files by year
|   |   |-- legacy/             1993-2006 (pre-consolidation format)
|   |   +-- modern/             2007-2025 (post-consolidation format)
|   |-- unpacked/               Extracted raw data files (DBF, CSV)
|   |-- data_dictionary/        Data documentation, code tables, format mappings
|   |-- Scripts/                Download and organization scripts
|   +-- Texas_Ports.csv         Texas border port reference data
|
|-- 02-Data-Staging/            Intermediate processing and transformation
|   |-- Scripts/                Pipeline scripts (03-07, numbered by step)
|   |-- config/                 16 JSON lookup tables (mode, commodity, port, etc.)
|   |-- cleaned/                Intermediate cleaned CSVs (~5.7 GB, git-ignored)
|   |-- docs/                   Validation reports, review findings
|   +-- transborder.db          SQLite database (~10 GB, git-ignored)
|
|-- 03-Processed-Data/          Final output datasets (analysis-ready)
|   |-- csv/                    8 CSV files for analysis tools
|   +-- json/                   8 JSON files for the web dashboard
|
+-- WebApp/                     Interactive dashboard (Vite + React)
    |-- src/
    |   |-- pages/              Page components (Overview, US-Mexico, Texas-Mexico, etc.)
    |   |-- components/         Reusable UI: charts/, filters/, layout/, maps/, ui/
    |   |-- lib/                Utilities, helpers, design tokens
    |   |-- stores/             Zustand data store with lazy-loading
    |   +-- hooks/              Custom React hooks
    |-- public/data/            JSON datasets served to the browser
    |-- scripts/                Build validation and testing scripts
    +-- dist/                   Production build output (git-ignored)
```

---

## Data Overview

**Source:** BTS TransBorder Freight Data — the only public dataset with port-level detail on U.S.-Mexico and U.S.-Canada trade by transportation mode.

**Coverage:** April 1993 to December 2025 (384 months, all complete).

**Key facts:**
- ~39.6 million raw records across 3 normalized tables (DOT1, DOT2, DOT3)
- Pre-2007 data uses a legacy multi-table format (up to 24 tables per month); post-2007 uses 3 consolidated tables
- All coded fields (mode, commodity, port, state, country, trade type) are decoded via JSON lookup files in `02-Data-Staging/config/`
- Commodity codes are **HS 2-digit** (Harmonized Schedule), not SCTG

**Output datasets (7 total):**

| Dataset | Rows | Description |
|---------|------|-------------|
| `us_transborder` | ~950 | National annual trade by country/mode/trade type (1993-2025) |
| `us_mexico_ports` | ~17K | All US-Mexico border ports, annual totals |
| `us_canada_ports` | ~223K | All US-Canada border ports, annual totals |
| `texas_mexico_ports` | ~3K | Texas border ports only, annual totals |
| `texas_mexico_commodities` | ~16K | Texas-Mexico trade by HS-2 commodity |
| `us_state_trade` | ~5K | Trade by US state |
| `commodity_detail` | ~30K | Commodity breakdown by port and mode |
| `monthly_trends` | ~6K | Monthly time series for seasonality analysis |

---

## Web Dashboard

Built with **Vite + React** and **D3.js** for visualizations. Features:

- **9 chart types:** Line, Bar, StackedBar, Donut, Treemap (with drilldown), Lollipop, BoxPlot, DivergingBar, HeatmapTable
- **Interactive maps:** Leaflet with trade flow arcs and port markers
- **Per-chart controls:** Country filter, CSV/PNG export, fullscreen mode
- **5 main pages:** Overview, US-Mexico Trade, Texas-Mexico Trade (5 tabs), Trade by State, About
- **Lazy-loading:** Only loads data as pages are visited
- **Responsive:** Works on desktop, tablet, and mobile

---

## Pipeline Scripts (in order)

| Step | Script | What it does |
|------|--------|-------------|
| 1 | `01c_organize_manual_downloads.py` | Organizes manually downloaded ZIP files by year |
| 2 | `unpack_raw_data.py` | Extracts ZIPs to `01-Raw-Data/unpacked/` |
| 3 | `03_normalize.py` | Normalizes legacy + modern raw data into 3 cleaned CSVs |
| 4 | `04_create_db.py` | Loads cleaned CSVs into SQLite database |
| 5 | `05_build_outputs.py` | Generates 7 aggregated datasets from the database |
| 6 | `06_validate.py` | Runs validation checks on output datasets |
| 7 | `07_cross_validate.py` | Cross-validates against BTS published aggregates |

---

## Key Technical Notes

- **No public API:** BTS TransBorder data must be downloaded as raw files from [bts.gov/topics/transborder-raw-data](https://www.bts.gov/topics/transborder-raw-data).
- **Schema change in January 2007:** Pre-2007 data uses up to 24 legacy tables; post-2007 uses 3 consolidated tables (Surface, Air/Vessel, Pipeline).
- **Large files are git-ignored:** The SQLite database (~10 GB), cleaned CSVs (~5.7 GB), and raw data ZIPs are excluded from git. A pre-commit hook blocks files >99 MB.
- **Oct 2020 data:** The only monthly gap in the 1993-2025 dataset. Recovered from the Census Bureau (not BTS).

---

## Project Status

| Phase | Status |
|-------|--------|
| Phase 1 — Data Acquisition | Complete |
| Phase 2 — Data Processing | Complete |
| Phase 3 — WebApp & Pages | Complete |
| Phase 4 — Design & Testing | Complete |

See [gap-tracker.md](00-Project-Management/gap-tracker.md) for detailed issue tracking and the [phase plans](00-Project-Management/Main-Plans/) for implementation details.

---

## Data Source & Citation

> Bureau of Transportation Statistics. *North American TransBorder Freight Data.* U.S. Department of Transportation. [bts.gov/topics/transborder-raw-data](https://www.bts.gov/topics/transborder-raw-data)
