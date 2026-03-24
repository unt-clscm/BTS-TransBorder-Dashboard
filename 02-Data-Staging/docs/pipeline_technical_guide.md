# Data Pipeline Technical Guide

End-to-end reference for the BTS TransBorder data pipeline. Covers raw data sourcing, normalization, database creation, output generation, and validation. Written for anyone who needs to understand, reproduce, or extend the pipeline.

---

## Pipeline Architecture

```
01-Raw-Data/unpacked/
  legacy/ (1993-2006, DBF files)     03_normalize.py     04_create_db.py     05_build_outputs.py
  modern/ (2007-2025, CSV files)  -->  3 cleaned CSVs  -->  SQLite DB      -->  7 JSON + 7 CSV
                                       (5.7 GB)            (10.1 GB)            (43.5 MB JSON)
                                                                                 (20.4 MB CSV)
                                                            06_validate.py  -->  57 internal checks
                                                            07_cross_validate.py --> 1,812 BTS comparisons
```

All scripts are in `02-Data-Staging/Scripts/`. All lookup tables are in `02-Data-Staging/config/`.

---

## 1. Raw Data Sources

### Modern Era (2007-2025)

BTS publishes three CSV tables per month:

| Table | Cross-tabulation | Key dimensions |
|-------|-----------------|----------------|
| DOT1 | State x Port | State, Port, Mode, Country, TradeType |
| DOT2 | State x Commodity | State, HSCode, Mode, Country, TradeType |
| DOT3 | Port x Commodity | Port, HSCode, Mode, Country, TradeType |

Each monthly ZIP contains individual monthly files, year-to-date (YTD) cumulative files, and (in December) annual files. **The pipeline uses YTD files from the latest month of each year** to avoid merging individual monthly files.

**October 2020:** The only monthly gap in the entire 1993-2025 dataset. The raw file is permanently missing from BTS. Three raw CSV files (`dot1_1020.csv`, `dot2_1020.csv`, `dot3_1020.csv`) were provided by Jason Jindrich at the U.S. Census Bureau (International Trade Macro Analysis Branch) on 2026-03-23.

### Legacy Era (1993-2006)

Before the January 2007 consolidation, BTS published up to 24 separate table types per month. The pipeline reads DBF files from `01-Raw-Data/unpacked/legacy/`.

**Export tables (D03-D06, surface modes only):**

| Table | Description | Maps to |
|-------|-------------|---------|
| D03 / D3A | Mexico exports, Commodity x MexState | DOT2 |
| D04 / D4A | Canada exports, Commodity x Province | DOT2 |
| D05 / D5A | Mexico exports, State x Port | DOT1 |
| D06 / D6A | Canada exports, State x Port | DOT1 |

**Import tables (D09-D12, surface modes only):**

| Table | Description | Maps to |
|-------|-------------|---------|
| D09 | Mexico imports, Commodity x State | DOT2 |
| D10 | Canada imports, Commodity x State x Province | DOT2 |
| D11 | Mexico imports, State x Port | DOT1 |
| D12 | Canada imports, State x Port x Province | DOT1 |

**Air/Vessel tables (AV1-AV12, November 2003 - December 2006):**

Starting November 2003, BTS added a separate AV table series for air and vessel freight. D-tables contain **only surface modes** (truck, rail, pipeline, mail, other, FTZ). Air/vessel modes **never** appear in D-tables.

| AV Tables | Direction | Country | Maps to |
|-----------|-----------|---------|---------|
| AV1, AV2 | Export | Mexico, Canada | DOT2 |
| AV3, AV5 | Export | Mexico, Canada | DOT1 |
| AV4, AV6 | Export | Mexico, Canada | DOT3 |
| AV7, AV8 | Import | Mexico, Canada | DOT2 |
| AV9, AV11 | Import | Mexico, Canada | DOT1 |
| AV10, AV12 | Import | Mexico, Canada | DOT3 |

AV4/6/10/12 are the only source of Port x Commodity data before 2007 (for air/vessel only). No legacy table ever cross-tabulated port and commodity for surface modes, which is why surface DOT3 data only starts in 2007.

### Legacy Table Evolution

| Period | What changed |
|--------|-------------|
| Apr 1993 - Mar 1994 | Original D03-D12 tables. S-suffix files (e.g., `D5AUG93S.DBF`) denote State of Origin variant. |
| Apr 1994 onward | A/B suffix split introduced. A = State of Origin, B = alternative geography. Import tables (D09-D12) unchanged. |
| Nov 2003 | AV tables added (air/vessel modes). B-variants of export tables dropped. |
| Jan 2007 | Everything consolidated into DOT1/DOT2/DOT3. |

### Legacy File Anomalies (handled automatically by 03_normalize.py)

| Anomaly | Details |
|---------|---------|
| **S-suffix files** (1993-Mar 1994) | `D5AUG93S.DBF` = State of Origin. Auto-mapped to A-variant. |
| **DO9 typo** (May 1994) | Letter O instead of digit 0. Auto-corrected to D09. |
| **R-files** (1995) | Revised replacement files for Jan-Mar and Jul 1995. Preferred over originals. |
| **X-files** (1995) | Delta corrections. Skipped (R-files contain complete data). |
| **D5B/D6B** (1994-2002) | Use NTAR regions instead of state codes. **Excluded** - incompatible with DOT1. D5A/D6A cover the same exports with proper state geography. |
| **Baja California code** (Apr 1994-May 1998) | `BN` auto-corrected to `BC`. |
| **2017 data in 2006 folder** | BTS packaging error. Correctly ignored (doesn't match legacy filename pattern). |

---

## 2. Normalization (03_normalize.py)

Reads all raw files and produces three cleaned CSVs in `02-Data-Staging/cleaned/`:

| Output file | Rows | Size | Coverage |
|-------------|------|------|----------|
| `dot1_state_port.csv` | 10.3M | 906 MB | 1993-2025 |
| `dot2_state_commodity.csv` | 25.4M | 4.4 GB | 1993-2025 |
| `dot3_port_commodity.csv` | 3.9M | 656 MB | 2007-2025 (surface); Nov 2003-2025 (air/vessel) |

Also produces `02-Data-Staging/docs/unknown_codes_report.txt` logging any code values not found in config JSONs.

### Output Schema

| Column | Type | DOT1 | DOT2 | DOT3 | Notes |
|--------|------|:----:|:----:|:----:|-------|
| Year | int | x | x | x | 1993-2025 |
| Month | int | x | x | x | 1-12 |
| TradeType | str | x | x | x | Export or Import |
| StateCode | str | x | x | | 2-letter USPS |
| State | str | x | x | | Full name from state_codes.json |
| PortCode | str | x | | x | 4-digit Schedule D |
| Port | str | x | | x | Name from schedule_d_port_codes.json |
| HSCode | str | | x | x | HS 2-digit (01-99) |
| Commodity | str | | x | x | Description from commodity_codes.json |
| CommodityGroup | str | | x | x | 22 high-level HS chapter groups |
| Mode | str | x | x | x | Decoded from mode_codes.json |
| MexState | str | x | x | | Mexican state code |
| CanProv | str | x | x | | Canadian province code |
| Country | str | x | x | x | Canada or Mexico |
| TradeValue | float | x | x | x | USD |
| Weight | float | x | x | x | Short tons (converted from kg). NULL if unavailable. |
| FreightCharges | float | x | x | x | USD. NULL if unavailable. |
| DF | str | x | x | x | Domestic/Foreign indicator |
| ContCode | str | x | x | x | Containerization (0/1/X) |

### Key Normalization Steps

1. **Legacy column renaming** - Maps legacy field names to modern equivalents (e.g., `ORSTATE`/`EXSTATE`/`DESTATE` -> `USASTATE`, `SCH_B`/`TSUSA` -> `COMMODITY2`)
2. **Trade direction from table number** - D03-D06 = Export, D09-D12 = Import, AV1-AV6 = Export, AV7-AV12 = Import
3. **Date parsing** - `STATMOYR` field: `MMYY` format (1993-1997), `YYYYMM` format (1998-2006)
4. **Code decoding** - All numeric codes resolved to human-readable names via 8 JSON lookup files in `02-Data-Staging/config/`
5. **Unit conversion** - Weight: kilograms to short tons (/ 907.185)
6. **NULL handling** - Missing weight/freight stored as NULL, not zero

### Configuration Files (02-Data-Staging/config/)

| File | Decodes field | Entries | Source |
|------|--------------|---------|--------|
| `mode_codes.json` | DISAGMOT | 9 | BTS All Codes PDF |
| `commodity_codes.json` | COMMODITY2 | 99 | BTS All Codes PDF (HS 2-digit) |
| `country_codes.json` | COUNTRY | 2 | 1220=Canada, 2010=Mexico |
| `trade_type_codes.json` | TRDTYPE | 2 | 1=Export, 2=Import |
| `state_codes.json` | USASTATE | 57 | 50 states + DC + territories + DU |
| `canadian_province_codes.json` | CANPROV | 15 | X-prefix codes + OT + DU |
| `mexican_state_codes.json` | MEXSTATE | 35 | 31 states + OT + XX |
| `schedule_d_port_codes.json` | DEPE | 501 | Census Schedule D + historical ports |
| `port_coordinates.json` | (enrichment) | 28 | US-Mexico border POEs, from BTS Socrata `keg4-3bc2` |
| `canadian_port_coordinates.json` | (enrichment) | 89 | Canadian border POEs, from BTS Socrata `keg4-3bc2` |
| `texas_border_ports.json` | (enrichment) | 13 | TX port-to-region mapping (El Paso, Laredo, Pharr) |

All config JSONs were transcribed from official BTS sources and validated against the raw data on 2026-03-22. Corrections applied: Canadian provinces (completely wrong initially), Mexican states (BN->BC, added OT), mode labels. 73 port codes added from raw data audit.

---

## 3. Database Creation (04_create_db.py)

Loads the three cleaned CSVs into `02-Data-Staging/transborder.db` (SQLite, 10.1 GB).

**Three tables:** `dot1_state_port`, `dot2_state_commodity`, `dot3_port_commodity` - schema matches the cleaned CSVs exactly.

**Indexes** on high-cardinality filter columns: Year, Month, TradeType, StateCode, PortCode, HSCode, CommodityGroup, Mode, Country.

**Performance settings:** WAL journal mode, 200 MB cache, 50K-row batch inserts.

**Row counts:** DOT1: 10.3M, DOT2: 25.4M, DOT3: 4.0M (total: 39.7M).

---

## 4. Output Generation (05_build_outputs.py)

Generates 7 chart-driven datasets in `03-Processed-Data/` (both JSON and CSV).

### Design Principles

- **One DOT table per dataset** - No joins between DOT1/DOT2/DOT3 (they are parallel aggregations, not joinable subsets)
- **Annual aggregation** for 6 datasets, monthly for `monthly_trends`
- **Year-range strategy**: `us_transborder` shows 1993-2025 (full history at high aggregation); all other datasets show 2007+ only (avoids legacy field gaps and the Nov 2003 mode discontinuity)

### Dataset Definitions

| Dataset | Source | Years | Rows | JSON Size | What it serves |
|---------|--------|-------|------|-----------|----------------|
| `us_transborder` | DOT2 | 1993-2025 | 897 | 0.1 MB | Overview: stat cards, trend line, mode donut, country stacked bar |
| `us_mexico_ports` | DOT1 | 2007-2025 | 114,195 | 21.0 MB | US-Mexico page: port rankings, map, trends, data table |
| `us_canada_ports` | DOT1 | 2007-2025 | ~223,000 | ~41 MB | Overview map: Canadian border port markers |
| `texas_mexico_ports` | DOT1 | 2007-2025 | 1,427 | 0.3 MB | Texas-Mexico tabs: stats, port map, charts. Enriched with lat/lon and region. |
| `texas_mexico_commodities` | DOT3 | 2007-2025 | 41,737 | 10.6 MB | Texas-Mexico Commodities tab: treemap, bar, line, table |
| `us_state_trade` | DOT1 | 2007-2025 | 21,777 | 2.8 MB | Trade by State: rankings, trends, table |
| `commodity_detail` | DOT2 | 2007-2025 | 33,936 | 8.1 MB | Commodity analysis: treemap, bar, line, table |
| `monthly_trends` | DOT1 | 2007-2025 | 6,530 | 0.7 MB | Texas-Mexico Monthly tab: seasonal patterns, heatmap |

### Aggregation

- `TradeValue`: SUM (USD)
- `Weight`: SUM with NULL preservation (NULL only if all inputs NULL)
- `FreightCharges`: SUM with NULL preservation
- All dimension columns: GROUP BY

### Enrichment (Texas datasets only)

`texas_mexico_ports` is enriched with:
- Lat/Lon coordinates from `port_coordinates.json`
- Border region assignment from `texas_border_ports.json` (El Paso, Laredo, Pharr)

---

## 5. Validation

### Internal Validation (06_validate.py)

57 automated checks. Key categories:

- All 7 JSON and CSV files exist with nonzero size
- JSON row counts match CSV row counts
- Year ranges correct (`us_transborder`: 1993-2025; others: 2007-2025)
- Total trade values match direct database queries
- No NULL TradeType values
- Texas datasets contain only expected port codes
- `texas_mexico_ports` has Lat/Lon and Region fields
- No obsolete files from previous dataset designs

**Result:** 57 passed, 0 failed, 0 warnings.

### Cross-Validation (07_cross_validate.py)

Compares pipeline outputs against independently downloaded BTS Tableau dashboard exports (stored outside the pipeline). 1,812 comparisons at 0.1% tolerance across multiple dimensions:

| Comparison | Dimensions | Our source | BTS source | Checks |
|------------|-----------|------------|------------|--------|
| Country x TradeType | Annual | DOT2 | DOT3 (Tableau) | 72 |
| Country x Mode x TradeType | Annual | DOT2 | DOT3 (Tableau) | 360 |
| Country x TradeType | Annual | DOT2 | DOT2 (Tableau) | 20 |
| State x Country x TradeType | Annual | DOT1 | DOT2 (Tableau) | 1,040 |
| Country x CommodityGroup x TradeType | Annual | DOT2 | DOT2 (Tableau) | 320 |

This validates across **all three DOT table types** against an independent source. Any normalization, decoding, or aggregation error would surface.

**Result:** 1,812 / 1,812 within tolerance. Zero mismatches.

---

## 6. Data Coverage and Structural Boundaries

### Time Coverage by Table

| Table | Surface modes | Air/Vessel modes | Notes |
|-------|:------------:|:----------------:|-------|
| DOT1 (State x Port) | 1993-2025 | Nov 2003-2025 | Air/vessel via AV tables before 2007 |
| DOT2 (State x Commodity) | 1993-2025 | Nov 2003-2025 | Air/vessel via AV tables before 2007 |
| DOT3 (Port x Commodity) | **2007-2025 only** | Nov 2003-2025 | No legacy surface equivalent |

### Field Availability Asymmetries

| Field | Exports (1993-2006) | Imports (1993-2006) | 2007+ (all) |
|-------|:------------------:|:------------------:|:-----------:|
| Weight | NULL (surface); available (air/vessel Nov 2003+) | Available | Available |
| FreightCharges | NULL (Mexico); partial (Canada) | Available | Available |
| ContCode | NULL | Available | Available |

**Surface export weight is NULL for all years (1993-2025)** - this is BTS policy, not a data gap. Weight for exports is only recorded for air and vessel modes.

---

## 7. Data Caveats (required on dashboard)

These must be surfaced in the dashboard or About page:

1. **Export weight (surface modes):** "Shipment weight for exports is available for Air & Vessel modes only. Surface export weight is not recorded." Applies to all years.

2. **Air/vessel boundary:** "Air and vessel freight data was added to TransBorder in November 2003. Totals before this date reflect surface modes only."

3. **Port x Commodity coverage:** "Port x Commodity data is available from January 2007 (surface) and November 2003 (air/vessel)."

4. **El Paso / Ysleta split:** "Ysleta was separated from El Paso beginning March 2020. Pre-2020 El Paso values include Ysleta activity."

5. **October 2020:** "October 2020 data was obtained directly from the U.S. Census Bureau."

6. **Freight charges:** "Freight charge data is near-complete for imports but only partially available (~50%) for exports."

7. **Commodity codes:** TransBorder uses **HS (Harmonized Schedule) 2-digit codes**, not SCTG. HS is the international classification; SCTG is the U.S. Commodity Flow Survey system.

---

## 8. Glossary

| Term | Definition |
|------|-----------|
| DOT1 | State x Port cross-tabulation. Legacy equivalents: D05/D06 (exports), D11/D12 (imports), AV3/5/9/11. |
| DOT2 | State x Commodity cross-tabulation. Legacy equivalents: D03/D04 (exports), D09/D10 (imports), AV1/2/7/8. |
| DOT3 | Port x Commodity cross-tabulation. No surface legacy equivalent. Air/vessel: AV4/6/10/12. |
| YTD | Year-to-Date. Cumulative data from January through the report month. |
| HS Code | Harmonized Schedule. International commodity classification. 2-digit codes (01-99) in TransBorder. |
| DISAGMOT | Disaggregated Mode of Transport. Numeric code: 1=Vessel, 3=Air, 4=Mail, 5=Truck, 6=Rail, 7=Pipeline, 8=Other, 9=FTZ. |
| DEPE | 4-digit Census Schedule D port code. |
| NTAR | National Transportation Analysis Regions. 89 multicounty exporter regions used in D5B/D6B (excluded). |
| DF | Domestic/Foreign indicator. 1=domestic origin, 2=re-export/foreign origin. NULL for imports. |
| CONTCODE | Containerization. 0=not containerized, 1=containerized, X=unknown. |
| R-file | Revised replacement file (1995). Contains complete corrected data. Preferred over originals. |
| X-file | Delta correction file (1995). Skipped - R-files contain complete data. |
| TRDTYPE | Trade Type. 1=Export, 2=Import. |
| Modern era | 2007-2025. Unified DOT table format. |
| Legacy era | 1993-2006. Pre-consolidation format with up to 24 table types per month. |

---

## References

**BTS contacts:**
- Sean Jahanmir (sean.jahanmir@dot.gov, 202-760-1007) - BTS TransBorder data program. Confirmed A/B suffix semantics, R-file strategy, and legacy table structure on 2026-03-23.

**Census contacts:**
- Jason Jindrich (International Trade Macro Analysis Branch, 301-763-2311) - Provided October 2020 raw files on 2026-03-23.

**Data sources:**
- BTS raw data: bts.gov/topics/transborder-raw-data
- BTS Tableau dashboard: data.bts.gov
- Census Schedule D: census.gov/foreign-trade/schedules/d/

**In-repo documentation:**
- Gap tracker: `00-Project-Management/gap-tracker.md`
- Phase plans: `00-Project-Management/Main-Plans/Phase-{1..4}_*.md`
- Data caveats: `01-Raw-Data/data_dictionary/data_caveats.md`
- Legacy-to-modern mapping: `01-Raw-Data/data_dictionary/legacy-to-modern-mapping.md`
- Config README: `02-Data-Staging/config/README.md`
- Validation report: `02-Data-Staging/docs/validation_report.md`
