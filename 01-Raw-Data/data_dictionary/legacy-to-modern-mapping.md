# Legacy-to-Modern Data Mapping

This document compares the legacy (1993–2006) and modern (2007–2025) TransBorder freight data formats, documents every column mapping, and identifies what information is gained or lost during normalization.

**Official BTS reference:** See `Historical and current data format comparison.xlsx` (in this same folder) for the BTS-published mapping of which old tables consolidated into the 3 new DOT tables. This markdown expands on that with column-level detail, caveats, and data loss analysis.

## 1. Table Structure Comparison

### Modern (2007–2025): 3 Tables

In January 2007, BTS consolidated all legacy tables into 3 unified tables. The "DOT" prefix stands for **Department of Transportation**. Each table represents a different cross-tabulation of trade dimensions:

| Table | Full Name | What It Answers | Key Dimensions | Columns (14/14/12) |
|-------|-----------|-----------------|----------------|---------------------|
| **DOT1** | Surface Table 1: State × Port | "How much trade flows through each port, broken down by state?" | USASTATE + DEPE (port code) | TRDTYPE, USASTATE, DEPE, DISAGMOT, MEXSTATE, CANPROV, COUNTRY, VALUE, SHIPWT, FREIGHT_CHARGES, DF, CONTCODE, MONTH, YEAR |
| **DOT2** | Surface Table 2: State × Commodity | "What commodities does each state trade?" | USASTATE + COMMODITY2 (HS 2-digit) | TRDTYPE, USASTATE, COMMODITY2, DISAGMOT, MEXSTATE, CANPROV, COUNTRY, VALUE, SHIPWT, FREIGHT_CHARGES, DF, CONTCODE, MONTH, YEAR |
| **DOT3** | Surface Table 3: Port × Commodity | "What commodities flow through each port?" | DEPE + COMMODITY2 | TRDTYPE, DEPE, COMMODITY2, DISAGMOT, COUNTRY, VALUE, SHIPWT, FREIGHT_CHARGES, DF, CONTCODE, MONTH, YEAR |

Each table contains **all countries** (Canada + Mexico), **all trade directions** (export + import), and **all transport modes** (surface + air/vessel + pipeline) in a single file. The `TRDTYPE` column distinguishes export (1) vs import (2), and `COUNTRY` distinguishes Canada (1220) vs Mexico (2010).

**Key difference between tables:** DOT1 has port but no commodity. DOT2 has commodity but no port. DOT3 has both port and commodity but no state. You cannot get all three dimensions (state + port + commodity) from any single table.

### Legacy (1993–2006): Up to 24 Tables

Before January 2007, the data was split into many separate tables. Instead of using columns to distinguish country, trade direction, and transport mode, these were encoded into **separate files**.

**⚠️ IMPORTANT: All D-prefix tables (D03–D12) are SURFACE-ONLY.** They contain DISAGMOT values 4 (mail), 5 (truck), 6 (rail), 7 (pipeline), 8 (other/unknown), 9 (FTZ). Air (1) and vessel (3) modes **never** appear in D-tables. This was verified against actual DBF files across all years 1993–2006. Air/vessel data was added to TransBorder starting November 2003 via a separate AV (air/vessel) table series — see section 1.1 below.

The legacy table numbering system uses **D-prefix numbers** that correspond to specific cross-tabulations. The table numbers represent the following concepts:

**Export tables (D03–D06) — surface only:**

| Table | Description | Dimensions | Modern Equivalent |
|-------|-------------|------------|-------------------|
| **D03** | Exports to Mexico — Commodity × Mexican State | Mode, Commodity, MexState | DOT2 (Mexico exports) |
| **D04** | Exports to Canada — Commodity × Canadian Province | Mode, Commodity, Province | DOT2 (Canada exports) |
| **D05** | Exports to Mexico — State × Port | Mode, State, Port, MexState | DOT1 (Mexico exports) |
| **D06** | Exports to Canada — State × Port | Mode, State, Port, Province | DOT1 (Canada exports) |

Export tables use `ORSTATE`/`EXSTATE` (origin/exporter state) and `SCH_B` (Schedule B export commodity classification). They do NOT have `CONTCODE`, `SHIPWT`, or `CHARGES`.

**Import tables (D09–D12) — surface only:**

| Table | Description | Dimensions | Modern Equivalent |
|-------|-------------|------------|-------------------|
| **D09** | Imports from Mexico — Commodity × State (no province) | Mode, Commodity, State, ContCode | DOT2 (Mexico imports) |
| **D10** | Imports from Canada — Commodity × State × Province | Mode, Commodity, State, Province, ContCode | DOT2 (Canada imports) |
| **D11** | Imports from Mexico — State × Port (no province) | Mode, State, Port, ContCode | DOT1 (Mexico imports) |
| **D12** | Imports from Canada — State × Port × Province | Mode, State, Port, Province, ContCode | DOT1 (Canada imports) |

Import tables use `DESTATE` (destination state) and `TSUSA` (Tariff Schedule USA import commodity classification). They carry additional fields: `CONTCODE` (containerization), `SHIPWT` (weight), and `CHARGES` (freight charges). D09–D12 contain surface modes only (DISAGMOT 4–9), not air or vessel.

**Why the export/import field differences?** Export tables (D03–D06) lack `CONTCODE`, `SHIPWT`, and `FREIGHT_CHARGES` (except Canada export tables D04/D06 which have `FREIGHT`). Import tables (D09–D12) have all of these. The 2007 consolidation unified both into single tables that include all fields (with blanks where not applicable).

**How trade direction and country are encoded:** The **table number** determines both trade direction and country. D03–D06 are exports; D09–D12 are imports. Odd-numbered tables within each group are Mexico (D03, D05, D09, D11); even-numbered are Canada (D04, D06, D10, D12). The `COUNTRY` column in the data confirms this.

**Table number** (what dimensions are crossed):

| Table | Description | Modern Equivalent |
|-------|-------------|-------------------|
| D03 / D3A,B | Exports to Mexico — Commodity × MexState | **DOT2** (partial — has MEXSTATE but uses MEXREGION in 1993) |
| D04 / D4A,B | Exports to Canada — Commodity × Province | **DOT2** (partial — has PROV but uses USREGION/DISTGROUP in 1993) |
| D05 / D5A,B | Exports to Mexico — State × Port | **DOT1** (partial — Mexico only) |
| D06 / D6A,B | Exports to Canada — State × Port | **DOT1** (partial — Canada only) |
| D09 | Imports from Mexico — Commodity × State (no province) | **DOT2** (partial) |
| D10 | Imports from Canada — Commodity × State × Province | **DOT2** (partial) |
| D11 | Imports from Mexico — State × Port (no province) | **DOT1** (partial) |
| D12 | Imports from Canada — State × Port × Province | **DOT1** (partial) |

**A/B suffix** (geographic methodology for export tables, Apr 1994–2002 only):

From April 1994, export tables were split into A/B variants. **Both A and B are EXPORTS** — the suffix encodes geographic methodology, NOT trade direction. Source: BTS README4.TXT (1994).

| Suffix | Meaning | State Column | Notes |
|--------|---------|-------------|-------|
| A | State of Origin | `ORSTATE` | Where goods entered the foreign trade pipeline |
| B | State/NTAR of Exporter | `EXSTATE` (D3B/D4B) or `NTAR` (D5B/D6B) | Where the exporting company is located |

BTS explanation: *"Neither measure provides a true representation of the production origin of exports, because the state of origin may be the state that contains a consolidation point."* B-variants were dropped in 2003.

**S suffix** (1993–early 1994 only): The trailing `S` denotes "State of Origin" — the predecessor to the `A` suffix. Files like `D5AUG93S.DBF` exist in 1993 and map to the `A` variant (State of Origin). `03_normalize.py` handles this automatically.

**⚠️ Suffixes D, J, M, N, O do NOT exist** in actual BTS legacy filenames. Previous documentation erroneously listed these. Import tables (D09–D12) have no letter suffix — the table number itself encodes trade direction and country.

**D5B/D6B exclusion**: These B-variant tables (1994–2002) use `NTAR` (89 multicounty regions) instead of state codes, making them incompatible with the DOT1 state×port structure. They are excluded from normalization. D5A/D6A already cover the same export flows with proper state geography.

### 1.1 AV (Air/Vessel) Tables — Nov 2003–Dec 2006

Starting November 2003, BTS added air and vessel freight data to the TransBorder dataset via a new **AV (air/vessel) table series**. These 12 tables mirror the D-table structure but contain only DISAGMOT values 1 (air) and 3 (vessel). AV files do not have a `STATMOYR` column — month and year are encoded in the filename.

**AV file naming conventions:**
- **2003 (Nov–Dec only):** `av{table}.dbf` (November), `av{table}12.dbf` (December)
- **2004–2006 (all 12 months):** `av{table}{MM}{YY}.dbf` (e.g., `av10104.dbf` = table 1, Jan 2004)

| AV Table | Description | Direction | Country | Modern Equiv |
|----------|-------------|-----------|---------|--------------|
| **AV1** | Commodity × US State | Export | Mexico | DOT2 |
| **AV2** | Commodity × US State | Export | Canada | DOT2 |
| **AV3** | US State × Port | Export | Mexico | DOT1 |
| **AV4** | Commodity × Port | Export | Mexico | **DOT3** |
| **AV5** | US State × Port | Export | Canada | DOT1 |
| **AV6** | Commodity × Port | Export | Canada | **DOT3** |
| **AV7** | Commodity × US State | Import | Mexico | DOT2 |
| **AV8** | Commodity × US State | Import | Canada | DOT2 |
| **AV9** | US State × Port | Import | Mexico | DOT1 |
| **AV10** | Commodity × Port | Import | Mexico | **DOT3** |
| **AV11** | US State × Port | Import | Canada | DOT1 |
| **AV12** | Commodity × Port | Import | Canada | **DOT3** |

**Key observations:**
- AV tables use the same column name conventions as D-tables: `ORSTATE`/`SCH_B` for exports, `DESTATE`/`TSUSA`/`HTS` for imports
- AV export tables include `SHIPWT` (unlike D-table exports which lack it)
- AV4/6/10/12 provide **Port × Commodity** (DOT3-equivalent) — this cross-tabulation did not exist in D-tables
- Before November 2003, air and vessel freight data was not part of the TransBorder dataset at all

### DOT3 Surface Has No Legacy Equivalent

**Surface DOT3 (Port × Commodity) did not exist before January 2007.** D-tables never cross-tabulated port and commodity in a single table. However, **air/vessel Port × Commodity** data is available from AV tables (AV4/6/10/12) for November 2003–December 2006. This means:

- Surface Port × Commodity analysis can only go back to 2007
- Air/vessel Port × Commodity goes back to November 2003 (via AV tables)
- For 1993–Oct 2003, you can get port-level data (from D05/D06/D11/D12) OR commodity-level data (from D03/D04/D09/D10), but **never both dimensions together at the record level**

## 2. Column-by-Column Mapping

### Columns that map directly (with renaming)

| Legacy Column | Modern Column | Notes |
|---------------|---------------|-------|
| `USSTATE` (1993) | `USASTATE` | Simple rename |
| `ORSTATE` (1994+ exports) | `USASTATE` | "Origin state" = US state for exports |
| `DESTATE` (1994+ D09-D12) | `USASTATE` | "Destination state" for imports |
| `EXSTATE` (1994+ B-tables) | `USASTATE` | "Export state" variant name |
| `SCH_B` (1994+) | `COMMODITY2` | HS 2-digit commodity code |
| `SCH_B_GRP` (1993) | `COMMODITY2` | Commodity group (1993 only — may be aggregated differently) |
| `TSUSA` (1994+ D09-D12) | `COMMODITY2` | Same codes, different column name |
| `TSUSA_GRP` (1993 D09-D10) | `COMMODITY2` | Commodity group (1993 only) |
| `PROV` | `CANPROV` | Canadian province code |
| `CHARGES` (D09-D12) | `FREIGHT_CHARGES` | Freight charges |
| `FREIGHT` (D04/D06) | `FREIGHT_CHARGES` | Same concept, different column name |
| `DISAGMOT` | `DISAGMOT` | Transportation mode — identical |
| `DF` | `DF` | Domestic/foreign indicator — identical |
| `CONTCODE` | `CONTCODE` | Containerized code — identical |
| `DEPE` | `DEPE` | Port of entry code — identical |
| `MEXSTATE` | `MEXSTATE` | Mexican state — identical |
| `COUNTRY` | `COUNTRY` | Country code — identical |
| `VALUE` | `VALUE` | Trade value in USD — identical |
| `SHIPWT` | `SHIPWT` | Shipping weight — identical |

### Columns derived from table number / filename (not present as columns in legacy)

| Modern Column | How to derive from legacy |
|---------------|--------------------------|
| `TRDTYPE` | From **table number**: D03–D06 (and D3A/B, D4A/B, etc.) = 1 (export), D09–D12 = 2 (import). The A/B suffix does NOT encode trade direction. |
| `COUNTRY` | From **table number**: D03/D05/D09/D11 = 2010 (Mexico), D04/D06/D10/D12 = 1220 (Canada). Also present as a `COUNTRY` column in most tables. |
| `MONTH` | Parse from `STATMOYR`: first 2 digits if MMYY (1993–1997), last 2 digits if YYYYMM (1998–2006) |
| `YEAR` | Parse from `STATMOYR`: last 2 digits → 19xx/20xx if MMYY (1993–1997), first 4 digits if YYYYMM (1998–2006) |

### Columns in legacy that DO NOT exist in modern (information lost)

| Legacy Column | Found In | Description | Impact |
|---------------|----------|-------------|--------|
| `COUNT` | All tables, 1993–1996 only | Number of individual trade transactions aggregated into the row | **Minor loss.** Dropped by BTS themselves in 1997. Only relevant for statistical analysis of transaction counts vs. values. |
| `USREGION` | D04, D09, D10 (1993 only) | US Census region grouping | **No loss.** Can be derived from `USASTATE` using a lookup table. |
| `MEXREGION` | D03 (1993 only) | Mexican region grouping | **No loss.** Can be derived from `MEXSTATE` using a lookup table. |
| `DISTGROUP` | D04, D10 (1993 only) | Customs district grouping | **No loss.** Can be derived from `DEPE` port codes. |
| `NTAR` | D5B, D6B (1994–2002 export tables) | National Transportation Analysis Region — 89 multicounty regions based on exporter ZIP code. Used in B-variant export tables as an alternative to state-level geography. | **Minor loss.** Only in B-variant (State of Exporter) export tables. Not available in modern data. |

### Columns in modern that DO NOT exist in legacy

| Modern Column | Implication for Legacy |
|---------------|----------------------|
| `CANPROV` (in DOT1) | Legacy D05 (Mexico ports) has no province column. Modern DOT1 has `CANPROV` but it's blank for Mexico records. **No loss** — legacy D06/D12 have `PROV` for Canada records. |
| `MEXSTATE` (in DOT2) | Legacy D04 (Canada commodity) has no MEXSTATE. Modern DOT2 has it but it's blank for Canada records. **No loss.** |
| `CONTCODE` (in D03-D06) | Legacy export tables don't have containerized codes. Present in import tables (D09-D12) and modern DOT1/DOT2. **Gap** — export containerization data only available from 2007+. |
| `SHIPWT` (in D03-D06) | Legacy export tables don't have shipping weight. Present in import tables (D09-D12) and modern DOT1/DOT2. **Gap** — export weight data only available from 2007+. |
| `FREIGHT_CHARGES` (in D03/D05) | Legacy Mexico export tables have no freight charges. Canada export tables (D04/D06) have `FREIGHT`. All import tables (D09-D12) have `CHARGES`. **Gap** — Mexico export freight only from 2007+. |

## 3. STATMOYR Date Field Parsing

The `STATMOYR` field changed format mid-stream:

| Period | Format | Example | Parse Rule |
|--------|--------|---------|------------|
| 1993–1997 | `MMYY` (4-digit) | `0493` = April 1993 | Month = first 2 digits, Year = 19xx from last 2 |
| 1998–2006 | `YYYYMM` (6-digit) | `199804` = April 1998 | Year = first 4 digits, Month = last 2 |

**Caveat:** 4 files in May 1993 (`D04MAY93`, `D06MAY93`, `D10MAY93`, `D12MAY93`) contain `STATMOYR=0493` (April), not `0593`. These are likely re-released April data with May filenames.

## 4. Legacy Table Type Evolution

The number of table types changed over the years:

| Period | Export Tables | Import Tables | Change |
|--------|--------------|---------------|--------|
| 1993 (Apr–Dec) | D03, D04, D05, D06 | D09, D10, D11, D12 | Original format |
| 1994 (transition) | Jan–Mar: D03-D06; Apr–Dec: D3A/B, D4A/B, D5A/B, D6A/B | D09, D10, D11, D12 | A/B split: State of Origin vs State of Exporter |
| 1995–2002 | D3A/B, D4A/B, D5A/B, D6A/B | D09, D10, D11, D12 | Stable era |
| 2003 (Nov–Dec) | D3A, D4A, D5A, D6A + **AV1-AV6** | D09, D10, D11, D12 + **AV7-AV12** | B-variants dropped; air/vessel tables added |
| 2004–2006 | D3A, D4A, D5A, D6A + AV1-AV6 | D09, D10, D11, D12 + AV7-AV12 | Surface (D-tables) + air/vessel (AV-tables) |
| 2007+ | DOT1, DOT2, DOT3 (unified) | DOT1, DOT2, DOT3 (unified) | Major consolidation — all modes in single tables |

When B-variants were dropped in 2003, the A-variant tables continued as **export-only** (confirmed by `ORSTATE` and `SCH_B` columns). Imports remained in D09–D12. The A-tables did NOT begin containing imports.

### Mode coverage timeline

| Period | Surface (truck, rail, pipeline, mail, other, FTZ) | Air & Vessel |
|--------|---------------------------------------------------|--------------|
| 1993–Oct 2003 | D-tables (D03–D12) | **Not in TransBorder** |
| Nov 2003–Dec 2006 | D-tables (D3A–D6A, D09–D12) | AV tables (AV1–AV12) |
| Jan 2007+ | DOT1/DOT2/DOT3 (all modes in single files) | DOT1/DOT2/DOT3 |

## 5. Additional Caveats

### Case sensitivity
- 2006 DBF files use **lowercase** column names (`disagmot`, `depe`). All other years use uppercase. Apply `.upper().strip()` during processing.

### Column name trailing spaces
- 2006 DBF files have **trailing spaces** in column names (e.g., `'disagmot  '`). Apply `.strip()` during processing.

### Baja California code error
- `MEXSTATE = 'BN'` (Baja California Norte) used erroneously from April 1994 to May 1998. Correct code is `'BC'`.

### 1993 commodity codes
- 1993 uses `SCH_B_GRP` and `TSUSA_GRP` — these may be **grouped/aggregated commodity codes** rather than individual HS 2-digit codes. Verify that the values match the same coding scheme used from 1994+.

### SCH_B vs TSUSA naming
- Export tables (D03/D04) use `SCH_B` (Schedule B — export classification)
- Import tables (D09/D10) use `TSUSA` (Tariff Schedule USA — import classification)
- Both are HS 2-digit codes in practice, but the column names reflect export vs. import nomenclature
- Modern `COMMODITY2` unifies both

### 1995 revision files
- 26 revision files (X-prefix and R-prefix) exist for Jan–Mar 1995 and Jul 1995. These should be used **instead of** the original files for those months.

## 6. Summary: What We Lose Normalizing Legacy → Modern

| Lost Data | Severity | Workaround |
|-----------|----------|------------|
| **Air/vessel data for 1993–Oct 2003** | **High** | Not available in TransBorder. The dataset was surface-only before Nov 2003. Air/vessel trade for this period requires a different Census source. |
| **Surface DOT3 (Port × Commodity) for 1993–2006** | **Medium** | Surface D-tables never cross-tabulated port and commodity. Air/vessel DOT3 data available from AV tables (Nov 2003–Dec 2006). |
| `COUNT` field (1993–1996) | Low | Dropped by BTS in 1997. Transaction count not needed for value/weight analysis. |
| `NTAR` exporter region (1994–2002 exports) | Low | Only in B-variant (State of Exporter) export tables. Not used in standard analysis. |
| `CONTCODE` for surface exports (1993–2006) | Medium | Containerization data for D-table exports only available from 2007+. D-table imports (D09-D12) have it. |
| `SHIPWT` for surface exports (1993–2006) | Medium | Weight data for D-table exports only available from 2007+. D-table imports (D09-D12) have it. AV export tables (Nov 2003+) do include `SHIPWT`. |
| `FREIGHT_CHARGES` for Mexico exports (1993–2006) | Medium | Freight costs for Mexico exports only from 2007+. Canada exports (D04/D06) have `FREIGHT`. All imports (D09-D12) have `CHARGES`. |

### What We Gain
| Gained Data | Notes |
|-------------|-------|
| `TRDTYPE` as explicit column | Derived from table number — no information created, just restructured |
| `MONTH` / `YEAR` as separate columns | Parsed from `STATMOYR` (D-tables) or filename (AV tables) |
| Unified file structure | All countries/directions/modes in one file instead of 8+ separate files |
| Air/vessel data (Nov 2003–Dec 2006) | AV tables incorporated into DOT1/DOT2/DOT3, extending mode coverage before 2007 |
