# Phase 2: Data Processing Pipeline

## Context

With raw BTS data downloaded (Phase 1) and schema differences documented, this phase normalizes all data into a unified format and produces 6 datasets in two formats: **JSON** files for the dashboard and **CSV** files for human review. Both formats carry the same full level of detail including individual HS commodity codes — no aggregation to CommodityGroup, no size cap. If browser performance becomes an issue with the JSON files, optimization will be addressed later.

**Deployment target:** The web application will be hosted on **GitHub Pages** — a static-only environment with no server-side processing. All data must be pre-aggregated and served as static files (JSON). This phase fulfills the project instruction to **create a unified database**: combine all years of raw data into a single database with multiple tables (one per BTS dataset type).

## Raw Data Source Strategy

### Modern Era (2007–2025): Use YTD Files

Each monthly BTS ZIP contains both monthly files (`dot{1,2,3}_MMYY.csv`) and cumulative year-to-date files (`dot{1,2,3}_ytd_MMYY.csv`). December ZIPs also contain annual summary files (`dot{1,2,3}_YYYY.csv`).

**Preferred source: YTD files from the latest available month of each year.** These contain all months' data in a single file, eliminating the need to merge individual monthly files.

| Year Range | Source | Notes |
|---|---|---|
| 2007–2019, 2021–2025 | December YTD files (`dot{1,2,3}_ytd_12YY.csv`) | Complete 12-month data. Full audit (2026-03-22) confirmed all months present including 2009 and 2023. |
| **2020** | Sep YTD (months 1–9) + Nov/Dec monthly files (months 11–12) + **Oct derived via subtraction** | Nov/Dec 2020 recovered from BTS (Sean Jahanmir) on 2026-03-22. Dec 2020 "YTD" files are annual aggregates (no MONTH column). **Oct 2020 recovery:** Annual totals - (Sep YTD + Nov + Dec) = October. Verified: zero negative values across all 3 tables. |
| 2026 | Excluded | Only Jan available; policy is complete years only |

### Missing Data — Recovery Plan

**No true gaps remain (as of 2026-03-22 full audit):**

| Year | Tables Affected | Status |
|---|---|---|
| 2020 | DOT1, DOT2, DOT3 | Oct raw file missing, but **recoverable via subtraction**: Annual aggregates - (Sep YTD + Nov + Dec) = October. Verified zero negative values (DOT1: 26,789 Oct records, DOT2: 74,243, DOT3: 17,258). |

Previously suspected gaps in 2009 DOT2 and 2023 Sep–Dec were **false alarms** — full audit confirmed all months present.

**Oct 2020 recovery approach (implemented in normalization):**
1. Load Dec 2020 annual aggregate files (no MONTH column — these contain full-year totals)
2. Load Sep 2020 YTD (months 1–9) + Nov/Dec 2020 monthly files
3. Subtract known months from annual totals to derive October values
4. Assign MONTH=10 to the derived records

**Alternative:** Contact Census at https://www.census.gov/foreign-trade/contact.html for the raw Oct 2020 file.

**Current status:** Database to be rebuilt with corrected data including Nov/Dec 2020 and derived Oct 2020. See `01-Raw-Data/download/modern/2020/README.md` for provenance details.

### Legacy Era (1993–2006): Monthly DBF/CSV Files

Legacy data uses a different table numbering scheme (d03–d12) with up to 24 tables per month. These are nested ZIPs (year → month → data files). Pre-2007 files use DBF format (early years) transitioning to CSV. Column name mappings are hardcoded in `03_normalize.py` (documented in `schema_mappings.json` for reference). D5B/D6B tables (1994–2002) are excluded — they use NTAR regions instead of state codes, incompatible with DOT1.

**Important:** All D-prefix tables (D03–D12) are **surface-only** (DISAGMOT 4–9: mail, truck, rail, pipeline, other, FTZ). Air (1) and vessel (3) modes are provided by **AV tables (AV1–AV12)**, which exist only from November 2003 to December 2006. Before Nov 2003, TransBorder did not include air/vessel freight data. From Jan 2007, all modes merged into DOT1/DOT2/DOT3.

### BTS Raw Dataset Types (DOT1/DOT2/DOT3)

The post-2007 modern data is published in 3 complementary cross-tabulations of the same underlying trade records. Each provides a different dimensional breakdown:

| Table | Cross-Tab | Unique Dimensions | Shared Dimensions | Missing |
|---|---|---|---|---|
| **DOT1** (State × Port) | US state + port of entry | `USASTATE`, `DEPE` | `TRDTYPE`, `DISAGMOT`, `MEXSTATE`, `CANPROV`, `COUNTRY`, `VALUE`, `SHIPWT`, `FREIGHT_CHARGES`, `DF`, `CONTCODE`, `MONTH`, `YEAR` | No commodity |
| **DOT2** (State × Commodity) | US state + commodity | `USASTATE`, `COMMODITY2` | (same shared) | No port |
| **DOT3** (Port × Commodity) | Port + commodity | `DEPE`, `COMMODITY2` | `TRDTYPE`, `DISAGMOT`, `COUNTRY`, `VALUE`, `SHIPWT`, `FREIGHT_CHARGES`, `DF`, `CONTCODE`, `MONTH`, `YEAR` | No state, no MexState/CanProv |

**Important:** These are NOT subsets of each other — they are parallel aggregations. You cannot join them to get state+port+commodity in a single row because BTS does not publish that level of detail. Each table must be stored and queried independently.

The annual summary files (`dot{1,2,3}_YYYY.csv`) have the same columns but drop `MONTH` (13 → 11-13 columns).

## Directory Structure

```
01-Raw-Data/               <- Input (from Phase 1, never modified)
  download/
    legacy/                <- Raw yearly ZIPs (1993-2006)
    modern/                <- Raw monthly/yearly ZIPs (2007-2025)
  unpacked/
    legacy/                <- Extracted legacy DBF/TAB/CSV files
    modern/                <- Extracted modern CSV/DBF/XLSX files

02-Data-Staging/           <- Scripts, configs, intermediary data, database
  Scripts/
    03_normalize.py
    04_create_db.py
    05_build_outputs.py
    06_validate.py
  config/
    schema_mappings.json
    port_aliases.json
    mode_codes.json
    commodity_codes.json
    country_codes.json
    trade_type_codes.json
    schedule_d_port_codes.json
    state_codes.json
    canadian_province_codes.json
    mexican_state_codes.json
  cleaned/                 <- Normalized intermediary CSVs
  transborder.db           <- SQLite database (intermediate)
  docs/
    validation_report.md

03-Processed-Data/         <- Final dashboard-ready outputs
  json/                    <- JSON files for GitHub Pages web app
    us_transborder.json
    us_mexico_ports.json
    texas_mexico_ports.json
    texas_mexico_commodities.json
    us_state_trade.json
    commodity_detail.json
    monthly_trends.json
  csv/                     <- CSV files for human/team reference
    us_transborder.csv
    us_mexico_ports.csv
    texas_mexico_ports.csv
    texas_mexico_commodities.csv
    us_state_trade.csv
    commodity_detail.csv
    monthly_trends.csv
```

## 2.1 Normalize & Clean

**Script**: `02-Data-Staging/Scripts/03_normalize.py`

**Input**: `01-Raw-Data/` (from Phase 1)
**Output**: `02-Data-Staging/cleaned/` -- one normalized CSV per dataset type

**Normalization Steps:**
1. **Rename legacy columns** to modern equivalents using hardcoded mappings in the script (e.g., `TSUSA`/`SCH_B` → `COMMODITY2`, `DESTATE`/`ORSTATE`/`EXSTATE` → `USASTATE`). The mapping rules are also documented in `schema_mappings.json` for reference, but the script uses internal dicts (`FIELD_MAPPINGS`, `DROP_FIELDS`, `LEGACY_TABLE_INFO`)
2. **Classify legacy tables**: Route each legacy file to the correct modern table (DOT1/DOT2/DOT3) based on table number, set trade direction from table number (D03–D06 = Export, D09–D12 = Import), and handle legacy anomalies (S-suffix, DO9 typo, R-file priority, X-file skip, **D5B/D6B exclusion** — these use NTAR regions instead of state codes and are incompatible with DOT1)
3. **Standardize dates**: Parse `STATMOYR` (pre-2007) into consistent integer `MONTH` and `YEAR`. Handle format change: MMYY (1993–1997) vs YYYYMM (1998–2006)
4. **Decode mode codes**: Map `DISAGMOT` codes to names using `mode_codes.json`
5. **Decode commodity codes**: Map HS 2-digit `COMMODITY2` codes to descriptions using `commodity_codes.json`. Derive `CommodityGroup` from HS chapter groupings
6. **Decode port codes**: Map 4-digit `DEPE` Schedule D codes to port names using `schedule_d_port_codes.json`
7. **Decode state codes**: Map `USASTATE` USPS codes to full names using `state_codes.json`
8. **Decode country codes**: Map 4-digit `COUNTRY` codes to names using `country_codes.json`
9. **Decode trade direction**: Map `TRDTYPE` codes using `trade_type_codes.json`
10. **Decode Canadian provinces**: Map `CANPROV` codes using `canadian_province_codes.json`
11. **Decode Mexican states**: Map `MEXSTATE` codes using `mexican_state_codes.json`. Fix known errata: `BN` → `BC` (Baja California)
12. **Parse trade values**: `VALUE` field to numeric (US dollars)
13. **Parse weight values**: `SHIPWT` in kilograms → convert to short tons (÷ 907.185). **Missing weight policy: store as NULL** (not zero)
14. **Unknown code validation**: Log any code not found in config JSONs. Records are kept with raw code values, mismatches written to `unknown_codes_report.txt`
15. **Drop duplicates** and flag data quality issues
16. **Derive Oct 2020**: Annual totals − (Sep YTD + Nov + Dec) = October

**Normalization Output Schema** (per DOT table — not all columns in every table):
```
Year          (int)     -- 1993-2025
Month         (int)     -- 1-12
TradeType     (str)     -- Export, Import
StateCode     (str)     -- 2-letter state code (DOT1, DOT2 only)
State         (str)     -- U.S. state full name (DOT1, DOT2 only)
PortCode      (str)     -- 4-digit Schedule D port code (DOT1, DOT3 only)
Port          (str)     -- Decoded port name (DOT1, DOT3 only)
HSCode        (str)     -- HS 2-digit commodity code (DOT2, DOT3 only)
Commodity     (str)     -- HS 2-digit commodity description (DOT2, DOT3 only)
CommodityGroup(str)     -- High-level commodity category (DOT2, DOT3 only)
Mode          (str)     -- Vessel, Air, Mail, Truck, Rail, Pipeline, Other/Unknown, FTZ
MexState      (str)     -- Mexican state code (DOT1, DOT2 only)
CanProv       (str)     -- Canadian province code (DOT1, DOT2 only)
Country       (str)     -- Canada, Mexico
TradeValue    (float)   -- Value in US dollars
Weight        (float)   -- Weight in short tons; NULL when not reported
FreightCharges(float)   -- Freight charges in US dollars; NULL when not reported
DF            (str)     -- Domestic/Foreign indicator
ContCode      (str)     -- Containerization code
```

**Enrichment columns added downstream** (by `05_build_outputs.py`, not normalization):
```
Lat           (float)   -- Port latitude (from port_coordinates config)
Lon           (float)   -- Port longitude (from port_coordinates config)
Region        (str)     -- Texas border region (El Paso, Laredo, Pharr)
```

## 2.2 SQLite Database (Intermediate)

**Script**: `02-Data-Staging/Scripts/04_create_db.py`

**Input**: `01-Raw-Data/download/modern/`
**Output**: `02-Data-Staging/transborder.db`

**Tables (mirroring BTS dataset types):**

| Table | Source | Description | Key Columns |
|---|---|---|---|
| `dot1_state_port` | DOT1 YTD files | Trade by US state and port | TRDTYPE, USASTATE, DEPE, DISAGMOT, MEXSTATE, CANPROV, COUNTRY, VALUE, SHIPWT, FREIGHT_CHARGES, DF, CONTCODE, MONTH, YEAR |
| `dot2_state_commodity` | DOT2 YTD files | Trade by US state and commodity | TRDTYPE, USASTATE, COMMODITY2, DISAGMOT, MEXSTATE, CANPROV, COUNTRY, VALUE, SHIPWT, FREIGHT_CHARGES, DF, CONTCODE, MONTH, YEAR |
| `dot3_port_commodity` | DOT3 YTD files | Trade by port and commodity | TRDTYPE, DEPE, COMMODITY2, DISAGMOT, COUNTRY, VALUE, SHIPWT, FREIGHT_CHARGES, DF, CONTCODE, MONTH, YEAR |
| `legacy_combined` | Pre-2007 DBF/CSV | Legacy data (d03–d12 tables normalized) | Mapped to modern column names via hardcoded mappings in 03_normalize.py |

**Note on 2020:** Months 1–9 from Sep YTD, months 11–12 from recovered monthly files, month 10 derived via subtraction from annual aggregates.

**Indexes** on: Year, Month, DISAGMOT, DEPE, USASTATE, COUNTRY, TRDTYPE, COMMODITY2

**Purpose**: Validation, ad-hoc exploration, and source for dashboard CSV/JSON generation.

## 2.3 Generate Dashboard JSON + Reference CSVs

**Script**: `02-Data-Staging/Scripts/05_build_outputs.py`

**Input**: `02-Data-Staging/cleaned/` or `02-Data-Staging/transborder.db`
**Output**: 7 datasets, each in two formats (JSON + CSV), placed in `03-Processed-Data/`

### Two output formats, two purposes

| Format | Location | Purpose |
|---|---|---|
| **JSON** | `03-Processed-Data/json/` | Dashboard — loaded via `fetch()` + `JSON.parse()` in the browser. GitHub Pages serves these with automatic gzip compression (~5:1 ratio for JSON), so a 28 MB file transfers as ~5 MB over the wire. |
| **CSV** | `03-Processed-Data/csv/` | Human review — open in Excel, spot-check data, share with team |

### Dataset design principles

**Chart-driven:** Each dataset is designed to serve specific dashboard charts. The minimum number of tables covers all Phase 3 charts. Shared tables serve multiple pages where their grain is sufficient; larger tables are split only when necessary to avoid loading data no chart needs.

**No joins:** The BTS publishes 3 parallel cross-tabulations (DOT1=State×Port, DOT2=State×Commodity, DOT3=Port×Commodity). These are independent aggregations. Each output dataset draws from exactly one DOT table.

**Evolving:** This dataset list is tuned to the Phase 3 chart plan as of initial design. As Phase 3 development reveals new chart needs or performance issues, `05_build_outputs.py` is updated to add or restructure datasets.

**Legacy trade direction:** All pre-2007 records have known trade direction derived from the table number: D03–D06 = Export, D09–D12 = Import. There are no "Unknown" TradeType records in the dataset.

### Dataset definitions

| # | Dataset | Source | Grain | Key Columns | Store Property | Dashboard Pages & Charts |
|---|---|---|---|---|---|---|
| 1 | `us_transborder` | DOT2 | Annual | Year, Country, Mode, TradeType, TradeValue, Weight | `usTransborder` | **Overview:** StatCards, LineChart (annual trends), DonutChart (by mode), StackedBarChart (Canada vs Mexico). **Trade by Mode:** all mode charts. Loaded at app init (~0.2 MB). |
| 2 | `us_mexico_ports` | DOT1 (Mexico) | Annual | Year, PortCode, Port, StateCode, State, Mode, TradeType, TradeValue, Weight, FreightCharges | `usMexicoPorts` | **US-Mexico:** BarChart (top ports), DataTable (port detail). **US-Mexico Ports:** PortMap, BarChart (port ranking), LineChart (port trends), DataTable. Mode kept for port-by-mode filtering. |
| 3 | `texas_mexico_ports` | DOT1 (TX border ports) | Annual | Year, PortCode, Port, Mode, TradeType, TradeValue, Weight, FreightCharges, Region, Lat, Lon | `texasMexicoPorts` | **Texas-Mexico Overview tab:** StatCards, LineChart, DonutChart, BarChart. **Ports tab:** PortMap, BarChart, LineChart, DataTable. **Modes tab:** all mode charts. |
| 4 | `texas_mexico_commodities` | DOT3 (TX border ports, 2007+) | Annual | Year, PortCode, Port, HSCode, Commodity, CommodityGroup, Mode, TradeType, TradeValue, Weight | `texasMexicoCommodities` | **Texas-Mexico Commodities tab:** TreemapChart, BarChart (top commodities), LineChart (commodity trends), DataTable. |
| 5 | `us_state_trade` | DOT1 | Annual | Year, StateCode, State, Country, Mode, TradeType, TradeValue | `usStateTrade` | **Trade by State:** BarChart (state ranking), LineChart (state trends), DataTable. **Overview:** BarChart (Top 10 States). |
| 6 | `commodity_detail` | DOT2 | Annual | Year, Country, HSCode, Commodity, CommodityGroup, Mode, TradeType, TradeValue, Weight | `commodityDetail` | **Commodity Analysis:** TreemapChart, BarChart, LineChart, DataTable. **US-Mexico** (commodity section): TreemapChart, BarChart, DataTable (filtered to Country=Mexico in browser). |
| 7 | `monthly_trends` | DOT1 | Monthly | Year, Month, Country, Mode, TradeType, TradeValue | `monthlyTrends` | **Texas-Mexico Monthly tab:** LineChart (monthly trends), Heatmap/StackedBarChart (month×year), DataTable. |

**Why 7 and not 8:** The previous `us_mexico_commodities` dataset (DOT2, Mexico-only with State dimension, 423K rows / 108 MB) was eliminated. No US-Mexico page chart breaks down commodities by state — the TreemapChart and commodity BarChart only need HSCode × CommodityGroup × Mode × TradeType, which `commodity_detail` already provides (54K rows / 13 MB). Filter to Country=Mexico in the browser.

**Why `us_transborder` dropped CommodityGroup:** No chart on the Overview or Trade by Mode pages uses CommodityGroup. Commodity charts on the Commodity Analysis and US-Mexico pages pull from `commodity_detail`. Dropping the dimension collapses ~15K rows to ~1.6K rows (33 years × 2 countries × 8 modes × 3 trade types).

### Estimated sizes

| Dataset | Source | Rows (est) | JSON Raw | JSON gzipped (est) | Loaded When |
|---|---|---|---|---|---|
| `us_transborder` | DOT2 | ~1,600 | ~0.2 MB | ~0.05 MB | App init |
| `us_mexico_ports` | DOT1 | ~153,000 | ~28 MB | ~5 MB | Lazy (US-Mexico page) |
| `texas_mexico_ports` | DOT1 | ~2,500 | ~0.5 MB | ~0.1 MB | Lazy (Texas-Mexico page) |
| `texas_mexico_commodities` | DOT3 | ~42,000 | ~10.6 MB | ~1.8 MB | Lazy (TX Commodities tab) |
| `us_state_trade` | DOT1 | ~32,000 | ~4.1 MB | ~0.8 MB | Lazy (Trade by State / Overview) |
| `commodity_detail` | DOT2 | ~54,000 | ~13 MB | ~2.5 MB | Lazy (Commodities / US-Mexico) |
| `monthly_trends` | DOT1 | ~11,000 | ~1.1 MB | ~0.2 MB | Lazy (TX Monthly tab) |
| **Total** | | **~296,000** | **~58 MB** | **~10 MB** | |

**Pre-Aggregation Strategy:**
- Annual aggregation for 6 of 7 datasets (reduces row count dramatically)
- Monthly granularity only for `monthly_trends` (used only on Texas-Mexico Monthly tab)
- Trade values summed per group; Weight summed per group (NULLs preserved — `SUM` skips NULLs; result is NULL only if all inputs are NULL)
- No joins between DOT tables — each dataset sourced from exactly one table

**Future optimization (if needed in Phase 3):** If `us_mexico_ports` (28 MB) causes slow page loads despite gzip, it can be split into a port-summary table (without Mode, ~3 MB) loaded immediately, and a port-by-mode table (28 MB) loaded only when the Mode filter is applied.

## 2.3.1 Data Caveats (for dashboard display)

The following caveats were confirmed by querying the normalized database (2026-03-22). These match the notes shown on the BTS TransBorder dashboard and must be surfaced in our dashboard wherever the affected fields are displayed.

### Weight & Freight Caveats

| Caveat | Scope | Details |
|---|---|---|
| **Shipment weight for exports: only Air & Vessel modes** | All export records for Truck, Rail, Pipeline, Mail, Other/Unknown | Weight = 0 for these modes. Applies 1993-2025. Dashboard should show "N/A" or a note when displaying export weight for surface modes. |
| **Shipment weight for imports: available for all modes** | All import records | Near-100% availability across all modes. No caveat needed for import weight. |
| **Freight charges: partial for exports** | Export records (~50% have nonzero values) | Imports have near-100% freight charge data. Export freight charges are less reliable. |

### Geographic Terminology (from BTS)

| Term | BTS Definition |
|---|---|
| **Port State** | The U.S. state where the Port of Entry is located. |
| **Port Coast** | The U.S. coast where the Port of Entry is located. |
| **Port Border** | The border (Canadian or Mexican) where the Port of Entry is located. |

These terms should be used consistently in the dashboard and defined in the About Data page.

### Port History Changes

| Change | Date | Details |
|---|---|---|
| **Ysleta separated from El Paso** | March 2020 | Customs and Border Protection separated the Ysleta Port of Entry from the El Paso Port of Entry beginning with March 2020 data. Historical data before March 2020 includes Ysleta activity under El Paso. This affects time-series comparisons for both ports. |

### Other Caveats

| Caveat | Scope | Details |
|---|---|---|
| **DF (Domestic/Foreign) only meaningful for exports** | Export records | DF=1 (domestic origin), DF=2 (re-export/foreign origin). For imports, DF is NULL in modern data. |
| **Surface Port x Commodity data starts Jan 2007** | DOT3-sourced views (us_mexico, texas_mexico with commodity detail) | Surface Port x Commodity (D-tables) did not exist before Jan 2007. Air/vessel Port x Commodity available from AV tables (Nov 2003–Dec 2006). Views combining port + commodity are limited to Nov 2003+ (air/vessel) or Jan 2007+ (all modes). |
| **Legacy trade direction is known** | All pre-2007 rows | Trade direction is derived from table number: D03–D06 = Export, D09–D12 = Import, AV1–AV6 = Export, AV7–AV12 = Import. No records have unknown TradeType. |
| **Air/vessel data starts Nov 2003** | All pre-Nov-2003 rows | TransBorder was surface-only (truck, rail, pipeline, mail, other) before November 2003. Air and vessel modes were added via AV tables (Nov 2003–Dec 2006), then merged into DOT tables from Jan 2007. Mode totals for 1993–Oct 2003 exclude air/vessel freight. |
| **Containerization code values** | All modes, modern data | 0 = not containerized, 1 = containerized, X = not applicable/unknown. Pipeline always 0 or X. |

### How to surface these caveats

1. **JSON output files**: Encode caveats as a `_notes` metadata array per dataset so the dashboard can display them contextually.
2. **Dashboard UI (Phase 3)**: Show relevant notes as footnotes or info-tooltips wherever the affected fields are displayed (e.g., a note under any chart showing export weight).
3. **About Data page (Phase 3)**: Dedicate a section to data limitations and terminology. Include all caveats above, the BTS geographic terminology definitions, port history changes, and the HS commodity code system explanation.

## 2.4 Validation

**Script**: `02-Data-Staging/Scripts/06_validate.py`

**Automated Checks (in script):**
- Row counts per year (no missing years in 1993-2025 range)
- Total trade value per year cross-checked against BTS published summaries
- All expected modes present per year
- No null values in required columns (Year, Country, TradeType, TradeValue)
- Null rate report for optional columns (Weight, Lat, Lon)
- Year coverage: all 6 CSVs cover expected year ranges
- Dimension value validation: only expected values for Country, Mode, TradeType

### 2.4.1 Cross-Validation Against BTS Tableau Exports

**Script**: `02-Data-Staging/Scripts/07_cross_validate.py`

**Independent sources** (downloaded from the BTS Tableau dashboard, stored outside the pipeline):
1. `BTS_Tableau_Historical_Trend.csv` (627 MB) — DOT3-like: Port × Commodity, 2006–2025, ~3M rows
2. `BTS_US_State(2015 - 2024).csv` (805 MB) — DOT2-like: State × Commodity, 2015–2025, ~2.9M rows

**Location**: `../01 - Raw Data/TX-MX Trade (BTS)/` (outside the pipeline directory; not processed by our scripts)

**Comparisons (1,812 total, tolerance: 0.1%):**

| Check | Dimensions | BTS Source | Our Dataset | Rows | Years |
|---|---|---|---|---|---|
| A1 | Country × TradeType | Historical Trend [DOT3] | `us_transborder` [DOT2] | 72 | 2007–2024 |
| B | Country × Mode × TradeType | Historical Trend [DOT3] | `us_transborder` [DOT2] | 360 | 2007–2024 |
| A2 | Country × TradeType | US State [DOT2] | `us_transborder` [DOT2] | 20 | 2015–2024 |
| C | State × Country × TradeType | US State [DOT2] | `us_state_trade` [DOT1] | 1,040 | 2015–2024 |
| D | Country × CommodityGroup × TradeType | US State [DOT2] | `commodity_detail` [DOT2] | 320 | 2015–2024 |

**Why this is strong validation:**
- Tests across all three DOT table types (DOT1, DOT2, DOT3) — not just the table each output was built from
- BTS Tableau exports are an independent pre-aggregated source; any error in our normalization, decoding, or aggregation would surface as a mismatch
- CommodityGroup comparison maps our descriptive names to BTS HS chapter-range codes (many-to-one) for fair grouping
- Covers multiple dimensions: country, state, mode, commodity group, trade type

**Result (2026-03-23):** 1,812/1,812 comparisons within tolerance. Zero mismatches.

## Recommended Implementation Order

To reduce rework and avoid validating the wrong intermediate outputs, Phase 2 should be executed in this order:

1. **Implement `03_normalize.py` first**
   - This is the core dependency for the rest of the pipeline.
   - It handles schema reconciliation, code decoding, unknown-code logging, weight/null handling, and October 2020 derivation.

2. **Generate and verify `02-Data-Staging/cleaned/`**
   - Confirm year coverage, month coverage, and key edge cases before loading to SQLite.
   - Spot-check 2020, legacy date parsing, and known code corrections such as `BN` → `BC`.

3. **Run `04_create_db.py`**
   - Build `02-Data-Staging/transborder.db` only after normalized outputs are trusted.
   - Use the database for validation, exploration, and downstream output generation.

4. **Implement and run `05_build_outputs.py`**
   - Generate the 7 dashboard JSON files and 7 reference CSVs.
   - Datasets are chart-driven: each serves specific Phase 3 dashboard charts.

5. **Implement and run `06_validate.py`**
   - Validate normalized data, database tables, and final outputs.
   - Confirm year coverage, expected dimensions, null-rate behavior, and consistency with BTS annual totals.

6. **Implement and run `07_cross_validate.py`**
   - Cross-validate our outputs against independent BTS Tableau dashboard exports.
   - Compare annual totals across multiple dimensions (country, state, mode, commodity group, trade type) at 0.1% tolerance.

7. **Mark Phase 2 complete only after all stages pass:**
   - Normalize → Database build → Output generation → Internal validation → Cross-validation

## Deliverables Checklist

- [x] `02-Data-Staging/Scripts/03_normalize.py` -- Normalization script (completed 2026-03-22)
- [x] `02-Data-Staging/cleaned/` -- Normalized CSVs: dot1 (10.3M rows, 906 MB), dot2 (25.4M rows, 4.4 GB), dot3 (3.9M rows, 656 MB)
- [x] `02-Data-Staging/Scripts/04_create_db.py` -- SQLite creation script (completed 2026-03-22)
- [x] `02-Data-Staging/transborder.db` -- SQLite database (10.1 GB, 3 tables, 1993-2025)
- [x] `02-Data-Staging/Scripts/05_build_outputs.py` -- Chart-driven dashboard JSON + reference CSV generator (completed 2026-03-23)
- [x] 7 dashboard-ready JSON files in `03-Processed-Data/json/` (43.5 MB raw)
- [x] 7 reference CSV files in `03-Processed-Data/csv/` (20.4 MB, 220,499 total rows)
- [x] `02-Data-Staging/Scripts/06_validate.py` -- Internal validation script (completed 2026-03-23, 57 passed / 0 failed)
- [x] `02-Data-Staging/docs/validation_report.md` -- Internal validation report
- [x] `02-Data-Staging/Scripts/07_cross_validate.py` -- Cross-validation against BTS Tableau exports (completed 2026-03-23, 1,812 passed / 0 mismatches)

**Phase 2 status: COMPLETE** (2026-03-23)
