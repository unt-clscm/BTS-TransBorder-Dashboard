# Phase 2: Data Processing Pipeline

## Context

With raw BTS data downloaded (Phase 1) and schema differences documented, this phase normalizes all data into a unified format and produces 6 datasets in two formats: **JSON** files optimized for the dashboard (compact, aggregated to CommodityGroup at the port level, targeting ~10 MB total) and **CSV** files for human review (full detail including individual HS commodity codes, no size constraint — meant for Excel/team inspection).

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

Legacy data uses a different table numbering scheme (d03–d12) with up to 24 tables per month. These are nested ZIPs (year → month → data files). Pre-2007 files use DBF format (early years) transitioning to CSV. Schema mappings in `schema_mappings.json` handle the column name differences.

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
  legacy/
  modern/

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
    us_mexico.json
    texas_mexico.json
    us_state_trade.json
    commodity_detail.json
    monthly_trends.json
  csv/                     <- CSV files for human/team reference
    us_transborder.csv
    us_mexico.csv
    texas_mexico.csv
    us_state_trade.csv
    commodity_detail.csv
    monthly_trends.csv
```

## 2.1 Normalize & Clean

**Script**: `02-Data-Staging/Scripts/03_normalize.py`

**Input**: `01-Raw-Data/` (from Phase 1)
**Output**: `02-Data-Staging/cleaned/` -- one normalized CSV per dataset type

**Normalization Steps:**
1. **Apply schema mappings** from `02-Data-Staging/config/schema_mappings.json` to unify pre/post-consolidation column names (e.g., `TSUSA`/`SCH_B` → `COMMODITY`, `DESTATE`/`ORSTATE` → `USASTATE`, `STATMOYR` → `STATMO`+`STATYR`)
2. **Standardize dates**: Parse `STATMO`/`STATYR` (or `STATMOYR` for pre-2007) into consistent integer Year and Month
3. **Decode mode codes**: Map `DISAGMOT` codes to names using `mode_codes.json`: 1=Vessel, 3=Air, 4=Mail, 5=Truck, 6=Rail, 7=Pipeline, 8=Other/Unknown, 9=FTZ
4. **Decode commodity codes**: Map HS 2-digit `COMMODITY` codes to descriptions using `commodity_codes.json` (e.g., "27" → "Mineral fuels, oils, waxes"). Derive high-level `CommodityGroup` from HS chapter groupings
5. **Decode port codes**: Map 4-digit `DEPE` Schedule D codes to port names, districts, and states using `schedule_d_port_codes.json`. Apply `port_aliases.json` to reconcile spelling variations
6. **Decode state codes**: Map `USASTATE` USPS codes to full names using `state_codes.json`
7. **Decode country codes**: Map 4-digit `COUNTRY` codes to names using `country_codes.json` (1220=Canada, 2010=Mexico)
8. **Decode trade direction**: Map `TRDTYPE` codes using `trade_type_codes.json` (1=Export, 2=Import). For pre-2007 data where direction was implicit in file structure, infer from file metadata
9. **Decode Canadian provinces**: Map `CANPROV` X-prefix codes using `canadian_province_codes.json`
10. **Decode Mexican states**: Map `MEXSTATE` codes using `mexican_state_codes.json`. Fix known errata: code `BN` (Apr 1994 - May 1998) → `BC` (Baja California)
11. **Parse trade values**: `VALUE` field to numeric (US dollars)
12. **Parse weight values**: `SHIPWT` in kilograms → convert to short tons (÷ 907.185). **Missing weight policy: store as NULL** (not zero). Weight is unavailable for most exports (except air/vessel) and some legacy records. NULLs are preserved through aggregation — sums skip NULLs, and dashboard displays "N/A" where weight is unavailable.
13. **Unknown code validation**: For every decode step (mode, commodity, port, state, country, trade type, province), log any code value found in the raw data that is not present in the corresponding config JSON. Do not silently drop these records — keep them with the raw code value and log the mismatch to a report file. This catches retired port codes, historical codes not in the current BTS data dictionary, or data entry errors.
14. **Drop duplicates** and flag data quality issues
14. **Add computed columns**: `YearMonth` (YYYY-MM format for time series)

**Unified Column Schema:**
```
Year          (int)     -- 1993-2025
Month         (int)     -- 1-12
Country       (str)     -- Canada, Mexico
Port          (str)     -- Standardized port name
State         (str)     -- U.S. state full name
StateCode     (str)     -- 2-letter state code
Mode          (str)     -- Vessel, Air, Mail, Truck, Rail, Pipeline, Other/Unknown, FTZ
CommodityGroup(str)     -- High-level commodity category (derived from HS chapter groupings)
Commodity     (str)     -- HS 2-digit commodity description (decoded from commodity_codes.json)
HSCode        (str)     -- HS 2-digit commodity code (01-99)
TradeType     (str)     -- Export, Import
TradeValue    (float)   -- Value in US dollars
Weight        (float)   -- Weight in short tons; NULL when not reported (exports except air/vessel, and some legacy records)
Lat           (float)   -- Port latitude (where available)
Lon           (float)   -- Port longitude (where available)
Region        (str)     -- Texas border region (for TX ports: El Paso, Laredo, Pharr)
```

## 2.2 SQLite Database (Intermediate)

**Script**: `02-Data-Staging/Scripts/04_create_db.py`

**Input**: `02-Data-Staging/cleaned/`
**Output**: `02-Data-Staging/transborder.db`

**Tables (mirroring BTS dataset types):**

| Table | Source | Description | Key Columns |
|---|---|---|---|
| `dot1_state_port` | DOT1 YTD files | Trade by US state and port | TRDTYPE, USASTATE, DEPE, DISAGMOT, MEXSTATE, CANPROV, COUNTRY, VALUE, SHIPWT, FREIGHT_CHARGES, DF, CONTCODE, MONTH, YEAR |
| `dot2_state_commodity` | DOT2 YTD files | Trade by US state and commodity | TRDTYPE, USASTATE, COMMODITY2, DISAGMOT, MEXSTATE, CANPROV, COUNTRY, VALUE, SHIPWT, FREIGHT_CHARGES, DF, CONTCODE, MONTH, YEAR |
| `dot3_port_commodity` | DOT3 YTD files | Trade by port and commodity | TRDTYPE, DEPE, COMMODITY2, DISAGMOT, COUNTRY, VALUE, SHIPWT, FREIGHT_CHARGES, DF, CONTCODE, MONTH, YEAR |
| `legacy_combined` | Pre-2007 DBF/CSV | Legacy data (d03–d12 tables normalized) | Mapped to modern column names via schema_mappings.json |

**Note on 2020:** Months 1–9 from Sep YTD, months 11–12 from recovered monthly files, month 10 derived via subtraction from annual aggregates.

**Indexes** on: Year, Month, DISAGMOT, DEPE, USASTATE, COUNTRY, TRDTYPE, COMMODITY2

**Purpose**: Validation, ad-hoc exploration, and source for dashboard CSV/JSON generation.

## 2.3 Generate Dashboard JSON + Reference CSVs

**Script**: `02-Data-Staging/Scripts/05_build_outputs.py`

**Input**: `02-Data-Staging/cleaned/` or `02-Data-Staging/transborder.db`
**Output**: 6 datasets, each in two formats, placed in `03-Processed-Data/`

### Two output formats, two purposes

| Format | Location | Purpose | Size Constraint |
|---|---|---|---|
| **CSV** | `03-Processed-Data/csv/` | Human review — open in Excel, spot-check data, share with team | None (can be large) |
| **JSON** | `03-Processed-Data/json/` | Dashboard — loaded via `fetch()` + `JSON.parse()` in the browser | ~10 MB total across all 6 files |

**CSV files** are the full-detail reference copies. They include individual HS commodity codes at every aggregation level, making them useful for analysis but potentially large (50+ MB for port-level files). These are not served to the browser.

**JSON files** are optimized for the dashboard. To stay within the ~10 MB browser budget:
- Port-level files (`us_mexico.json`, `texas_mexico.json`) aggregate to **CommodityGroup** only (not individual HS codes). Individual commodity detail is available in `commodity_detail.json` separately.
- If a JSON file still exceeds ~5 MB after CommodityGroup aggregation, apply **top-N filtering**: keep the top 10 commodity groups per port (by trade value), roll the rest into an "Other" group.
- JSON uses compact formatting (no pretty-print) with short key names where appropriate.

### Dataset definitions

| Dataset | Description | CSV Aggregation | JSON Aggregation | Key Columns | Store Property |
|---|---|---|---|---|---|
| `us_transborder` | All US trade (Canada + Mexico) | Annual, by country/mode/commodity group | Same as CSV | Year, Country, Mode, CommodityGroup, TradeType, TradeValue, Weight | `usTransborder` |
| `us_mexico` | US-Mexico subset, port-level detail | Annual, by port/state/mode/**commodity** | Annual, by port/state/mode/**CommodityGroup** | Year, Port, State, Mode, CommodityGroup, [Commodity, HSCode — CSV only], TradeType, TradeValue, Weight, Lat, Lon | `usMexico` |
| `texas_mexico` | Texas-Mexico deep-dive | Annual, by port/mode/**commodity**/region | Annual, by port/mode/**CommodityGroup**/region | Year, Port, Mode, CommodityGroup, [Commodity, HSCode — CSV only], TradeType, TradeValue, Weight, Region, Lat, Lon | `texasMexico` |
| `us_state_trade` | State-level trade (all countries) | Annual, by state/country/mode | Same as CSV | State, StateCode, Year, Country, TradeType, Mode, TradeValue | `usStateTrade` |
| `commodity_detail` | Commodity-level detail | Annual, by commodity/country/mode | Same as CSV | Year, Country, CommodityGroup, Commodity, HSCode, TradeType, Mode, TradeValue, Weight | `commodityDetail` |
| `monthly_trends` | Monthly time-series | Monthly, by country/mode | Same as CSV | Year, Month, YearMonth, Country, Mode, TradeType, TradeValue | `monthlyTrends` |

### Estimated sizes

| Dataset | CSV (full detail) | JSON (dashboard) |
|---|---|---|
| `us_transborder` | ~0.8 MB | ~0.8 MB |
| `us_mexico` | ~30–54 MB | ~5–12 MB (CommodityGroup only) |
| `texas_mexico` | ~5–18 MB | ~2–5 MB (CommodityGroup only) |
| `us_state_trade` | ~2.8 MB | ~2.8 MB |
| `commodity_detail` | ~5.6 MB | ~5.6 MB |
| `monthly_trends` | ~0.6 MB | ~0.6 MB |
| **Total** | **~45–82 MB** | **~12–27 MB** (with top-N: **<10 MB**) |

**Pre-Aggregation Strategy:**
- Annual aggregation for most views (reduces row count dramatically)
- Monthly granularity only for `monthly_trends` (used only on Texas-Mexico Monthly tab)
- Trade values summed per group
- Weight summed per group (NULLs preserved — `SUM` skips NULLs; result is NULL only if all inputs are NULL)

**Target Size Budget:** ~10 MB total across all 6 JSON files (for acceptable browser load time on GitHub Pages). CSV files have no size constraint — they are for offline team use only.

## 2.4 Validation

**Script**: `02-Data-Staging/Scripts/06_validate.py`

**Checks:**
- Row counts per year (no missing years in 1993-2025 range)
- Total trade value per year cross-checked against BTS published summaries
- All expected modes present per year
- No null values in required columns (Year, Country, TradeType, TradeValue)
- Null rate report for optional columns (Weight, Lat, Lon)
- Year coverage: all 6 CSVs cover expected year ranges
- Dimension value validation: only expected values for Country, Mode, TradeType

## Deliverables Checklist

- [ ] `02-Data-Staging/Scripts/03_normalize.py` -- Normalization script
- [ ] `02-Data-Staging/cleaned/` -- Normalized CSVs
- [ ] `02-Data-Staging/Scripts/04_create_db.py` -- SQLite creation script
- [ ] `02-Data-Staging/transborder.db` -- Validation database
- [ ] `02-Data-Staging/Scripts/05_build_outputs.py` -- Dashboard JSON + reference CSV generator
- [ ] 6 dashboard-ready JSON files in `03-Processed-Data/json/` (optimized for browser, ~10 MB total)
- [ ] 6 full-detail CSV files in `03-Processed-Data/csv/` (for human review in Excel)
- [ ] `02-Data-Staging/Scripts/06_validate.py` -- Validation script
- [ ] Validation report (printed to console or saved to `02-Data-Staging/docs/validation_report.md`)
