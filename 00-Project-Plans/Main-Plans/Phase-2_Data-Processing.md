# Phase 2: Data Processing Pipeline

## Context

With raw BTS data downloaded (Phase 1) and schema differences documented, this phase normalizes all data into a unified format and produces 6 dashboard-ready datasets for the web application. Each dataset is output in two formats: **JSON** (optimized for the web app) and **CSV** (human-readable reference for the team).

**Deployment target:** The web application will be hosted on **GitHub Pages** — a static-only environment with no server-side processing. All data must be pre-aggregated and served as static files (JSON). This phase fulfills the project instruction to **create a unified database**: combine all years of raw data into a single database with multiple tables (one per BTS dataset type: port_commodity, mode_port, commodity, geographic).

## Directory Structure

```
01-Raw-Data/               <- Input (from Phase 1, never modified)
  legacy/
  modern/

02-Data-Staging/           <- Scripts, configs, intermediary data, database
  Scripts/
    03_normalize.py
    04_create_db.py
    05_build_dashboard_csvs.py
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
12. **Parse weight values**: `SHIPWT` in kilograms → convert to short tons (÷ 907.185), handle blanks
13. **Drop duplicates** and flag data quality issues
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
Weight        (float)   -- Weight in short tons (null for exports except air/vessel)
Lat           (float)   -- Port latitude (where available)
Lon           (float)   -- Port longitude (where available)
Region        (str)     -- Texas border region (for TX ports: El Paso, Laredo, Pharr)
```

## 2.2 SQLite Database (Intermediate)

**Script**: `02-Data-Staging/Scripts/04_create_db.py`

**Input**: `02-Data-Staging/cleaned/`
**Output**: `02-Data-Staging/transborder.db`

**Tables:**
- `port_commodity` -- Combined port and commodity (2006+)
- `mode_port` -- Mode and port (1993-2025)
- `commodity` -- Commodity detail (1993-2025)
- `geographic` -- Port + state origin/destination (1993-2025)

**Indexes** on: Year, Month, Mode, Port, State, Country, TradeType, CommodityGroup

**Purpose**: Validation and ad-hoc exploration only. Not consumed by the web app.

## 2.3 Generate Dashboard-Ready CSVs

**Script**: `02-Data-Staging/Scripts/05_build_dashboard_csvs.py`

**Input**: `02-Data-Staging/cleaned/` or `02-Data-Staging/transborder.db`
**Output**: 6 datasets, each in two formats, placed in `03-Processed-Data/`
- `03-Processed-Data/json/` — JSON files for the web app (loaded via `fetch()` + `JSON.parse()`)
- `03-Processed-Data/csv/` — CSV files for team reference (open in Excel, etc.)

| CSV File | Description | Aggregation Level | Key Columns | Store Property |
|---|---|---|---|---|
| `us_transborder.csv` | All US trade (Canada + Mexico) | Annual, by country/mode/commodity group | Year, Country, Mode, CommodityGroup, TradeType, TradeValue, Weight | `usTransborder` |
| `us_mexico.csv` | US-Mexico subset, port-level detail | Annual, by port/state/mode/commodity | Year, Port, State, Mode, CommodityGroup, Commodity, TradeType, TradeValue, Weight, Lat, Lon | `usMexico` |
| `texas_mexico.csv` | Texas-Mexico deep-dive | Annual, by port/mode/commodity/region | Year, Port, Mode, CommodityGroup, Commodity, TradeType, TradeValue, Weight, Region, Lat, Lon | `texasMexico` |
| `us_state_trade.csv` | State-level trade (all countries) | Annual, by state/country/mode | State, StateCode, Year, Country, TradeType, Mode, TradeValue | `usStateTrade` |
| `commodity_detail.csv` | Commodity-level detail | Annual, by commodity/country/mode | Year, Country, CommodityGroup, Commodity, HSCode, TradeType, Mode, TradeValue, Weight | `commodityDetail` |
| `monthly_trends.csv` | Monthly time-series | Monthly, by country/mode | Year, Month, YearMonth, Country, Mode, TradeType, TradeValue | `monthlyTrends` |

**Pre-Aggregation Strategy:**
- Annual aggregation for most views (reduces row count dramatically)
- Monthly granularity only for `monthly_trends.csv` (used only on Texas-Mexico Monthly tab)
- Trade values summed per group
- Weight summed per group (with null handling)

**Target Size Budget:** ~10MB total across all 6 JSON files (for acceptable browser load time). CSV equivalents may be slightly larger but are not performance-critical since they are for offline team use.

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
- [ ] `02-Data-Staging/Scripts/05_build_dashboard_csvs.py` -- Dashboard CSV generator
- [ ] 6 dashboard-ready JSON files in `03-Processed-Data/json/`
- [ ] 6 corresponding CSV files in `03-Processed-Data/csv/`
- [ ] `02-Data-Staging/Scripts/06_validate.py` -- Validation script
- [ ] Validation report (printed to console or saved to `02-Data-Staging/docs/validation_report.md`)
