# Gap Tracker

Living document tracking known issues, missing pieces, and open questions across the BTS-TransBorder project. Updated as work progresses.

---

## Status Summary (as of 2026-03-24)

| Phase | Planning | Implementation |
|---|---|---|
| Phase 1 — Data Acquisition | Complete | **Complete** |
| Phase 2 — Data Processing | Complete | **Complete** |
| Phase 3 — WebApp & Pages | Complete | **Complete** |
| Phase 4 — Design & Testing | Complete | **Complete** |

---

## Phase 1: Data Acquisition

### Completed Deliverables

| Item | Date |
|---|---|
| `requirements.txt` | 2026-03-15 (in `02-Data-Staging/Scripts/`) |
| `02-Data-Staging/config/mode_codes.json` | 2026-03-15 |
| `02-Data-Staging/config/country_codes.json` | 2026-03-15 |
| `02-Data-Staging/config/trade_type_codes.json` | 2026-03-15 |
| `02-Data-Staging/config/canadian_province_codes.json` | 2026-03-15 |
| `02-Data-Staging/config/mexican_state_codes.json` | 2026-03-15 |
| `02-Data-Staging/config/state_codes.json` | 2026-03-15 |
| `02-Data-Staging/config/commodity_codes.json` | 2026-03-15 |
| `02-Data-Staging/config/schedule_d_port_codes.json` | 2026-03-15 (from Census Schedule D) |
| `02-Data-Staging/config/schema_mappings.json` | 2026-03-15 |
| `02-Data-Staging/config/port_aliases.json` | 2026-03-15 (empty starter) |
| `01-Raw-Data/download/legacy/` data | 2026-03-15 (1993–2006, 14 ZIPs organized by year) |
| `01-Raw-Data/download/modern/` data | 2026-03-15 (2007–2025, organized by year; Nov/Dec 2020 recovered 2026-03-22; Oct 2020 recovered from Census 2026-03-23) |
| BTS raw data page reconnaissance | 2026-03-15 |
| Historical format comparison | 2026-03-15 (in `01-Raw-Data/data_dictionary/Historical and current data format comparison.xlsx`) |
| Config JSON validation against BTS PDF | 2026-03-22 (all config files verified/corrected against official codes PDF) |
| Legacy-to-modern mapping documentation | 2026-03-22 (in `01-Raw-Data/data_dictionary/legacy-to-modern-mapping.md`) |
| Data dictionary provenance documentation | 2026-03-22 (in `01-Raw-Data/data_dictionary/README.md`) |
| `02-Data-Staging/config/port_coordinates.json` | 2026-03-22 (28 US-Mexico border POEs with lat/lon, from BTS Border Crossing Entry Data, Socrata dataset `keg4-3bc2`) |
| `02-Data-Staging/config/texas_border_districts.geojson` | 2026-03-22 (simplified TxDOT district boundaries for El Paso, Laredo, Pharr — 17 KB, from `01-Raw-Data/Texas_District_Boundaries.geojson`) |
| `01-Raw-Data/Texas_Ports.csv` cleaned | 2026-03-22 (port names matched to `schedule_d_port_codes.json`, port codes added, region assignments for 13 border POEs) |
| `schedule_d_port_codes.json` updated | 2026-03-22 (added 73 missing port codes: 46 `XX` n.e.c. catch-alls, 1 Edinburg, 18 from legacy `codes_all.xls`, 8 from Census Schedule D online. Now 501 entries, zero unknowns.) |
| `state_codes.json` updated | 2026-03-22 (added `DU`=Unknown, found in raw data via `unknown_codes_report.txt`) |
| `canadian_province_codes.json` updated | 2026-03-22 (added `DU`=Unknown) |
| `mexican_state_codes.json` updated | 2026-03-22 (added `XX`=Unknown) |

### Phase 1 — Complete

All Phase 1 deliverables are done. Download scripts were not needed (data downloaded manually due to BTS CDN blocking). Schema documentation scripts were replaced by the manually written `legacy-to-modern-mapping.md`. See updated [Phase-1_Data-Acquisition.md](Main-Plans/Phase-1_Data-Acquisition.md) for full checklist.

### Known Data Gaps

| Gap | Impact | Action |
|---|---|---|
| 2026 data (partial) | None | Jan 2026 available but excluded per policy — only complete years (all 12 months) are incorporated. |

### Resolved Data Gaps (verified 2026-03-22)

| Gap | Resolution |
|---|---|
| **2023 all tables: Sep–Dec** | Full audit confirmed all 12 months present for DOT1, DOT2, DOT3. Data was in the downloaded ZIPs. |
| **2009 DOT2: Sep–Dec** | Full audit confirmed all 12 months present for DOT1, DOT2, DOT3 in Revised 2009 bundle. |
| **2020 Nov–Dec all tables** | Provided directly by Sean Jahanmir (BTS) via email on 2026-03-22. See `01-Raw-Data/download/modern/2020/README.md`. |
| **2020 Oct all tables** | Raw files (`dot1_1020.csv`, `dot2_1020.csv`, `dot3_1020.csv`) provided by Jason Jindrich (Census Bureau, International Trade Macro Analysis Branch) on 2026-03-23. Aggregate totals verified to match derivation values exactly (0% difference). Pipeline updated to use actual Census files instead of subtraction method. |

### Open Questions

- [x] ~~Legacy download page structure~~ — Completed. Links cataloged in `02-Data-Staging/config/transborder_url_manifest.json`.
- [x] ~~Socrata app token~~ — No public API exists for TransBorder freight data. Not applicable.
- [ ] DBF file handling: Are there known issues with `dbfread` for BTS-specific DBF files (encoding, field types)?
- [x] ~~**Missing data request to BTS**~~: Sean Jahanmir responded 2026-03-22 — provided Nov/Dec 2020. Oct 2020 unavailable at BTS. 2023 and 2009 gaps were false alarms (data verified present in full audit). Oct 2020 recovered from Census (Jason Jindrich, 2026-03-23).

---

## Phase 2: Data Processing

### Completed Deliverables

| Item | Date |
|---|---|
| `04_create_db.py` | 2026-03-15 (rewritten 2026-03-22 to read from cleaned CSVs) |
| `03_normalize.py` | 2026-03-22 (updated 2026-03-23: Oct 2020 now from Census files, derivation logic removed) — handles modern (2007-2025) + legacy (1993-2006), unknown code tracking |
| 3 cleaned CSVs in `02-Data-Staging/cleaned/` | 2026-03-22 — DOT1: 10.3M rows (906 MB), DOT2: 25.4M rows (4.4 GB), DOT3: 3.9M rows (656 MB) |
| `transborder.db` (full 1993-2025) | 2026-03-22 — 39.6M rows across 3 tables, 10.1 GB |
| Legacy data (1993-2006) loaded | 2026-03-22 — via `03_normalize.py` legacy DBF/CSV parsing |
| Oct 2020 loaded (all 3 tables) | 2026-03-23 — actual Census files from Jason Jindrich (DOT1: 26,790, DOT2: 74,243, DOT3: 17,259 rows). Replaced subtraction-based derivation. |
| `unknown_codes_report.txt` | 2026-03-22 — 73 unknown port codes, DU state, XX MexState, nan trade type documented. Re-run after config update: only `nan` (NULL values) remain. |
| Data caveats documented | 2026-03-22 — weight/freight availability, Ysleta/El Paso split, port terminology in Phase 2 and Phase 3 plans |
| `05_build_outputs.py` | 2026-03-22 (rewritten 2026-03-23: chart-driven redesign, 8→7 datasets, eliminated `us_mexico_commodities`, slimmed `us_transborder`) |
| `06_validate.py` | 2026-03-22 (updated 2026-03-23 for 7-dataset schema) |
| 7 output datasets in `03-Processed-Data/` | 2026-03-23 — 296K rows total, 57.6 MB JSON, 26.6 MB CSV (down from 8 datasets / 167.5 MB) |
| `validation_report.md` | 2026-03-22 — in `02-Data-Staging/docs/` |
| `data_caveats.md` | 2026-03-23 — in `01-Raw-Data/data_dictionary/`. Consolidated reference for all data limitations, structural breaks, field gaps, and required dashboard footnotes. |
| Chrome extension validation prompt | 2026-03-22 — in `02-Data-Staging/docs/chrome_extension_validation_prompt.md` |

### Phase 2 — Requires Re-Run (critical normalization fixes 2026-03-23)

**⚠️ CRITICAL FIXES (2026-03-23):** Multiple legacy data corrections discovered by verifying against actual DBF file contents:

1. **D3B/D4B/D5B/D6B mislabeled as imports** — These are EXPORT tables (State of Exporter variant), not imports. A/B suffix encodes geographic methodology, not trade direction. Fixed in `03_normalize.py` and `schema_mappings.json`. Source: BTS README4.TXT (1994), confirmed by actual DBF column names (`EXSTATE`, `SCH_B`).

2. **D-tables are SURFACE-ONLY** — All D-prefix tables (D03-D12) contain only DISAGMOT 4-9 (mail, truck, rail, pipeline, other, FTZ). Air (1) and vessel (3) modes **never** appear. Previous documentation incorrectly stated D09-D12 "contain ALL transport modes." Verified against actual DBF files across all years 1993-2006.

3. **AV (air/vessel) files discovered and added** — 12 AV tables (AV1-AV12) exist from Nov 2003 to Dec 2006, providing air and vessel freight data. Before Nov 2003, TransBorder was surface-only. AV4/6/10/12 provide Port×Commodity (DOT3-equivalent) for air/vessel modes. Added to `03_normalize.py`, `schema_mappings.json`, and `legacy-to-modern-mapping.md`.

4. **Fictional filename suffixes D/J/M/N/O removed** — These were documented but never existed in actual BTS filenames. Removed from `schema_mappings.json`. (Note: S suffix DOES exist — see fix #6 below.)

5. **2003-2006 "A-tables contain both exports and imports" corrected** — A-tables remained export-only through 2006 (confirmed by `ORSTATE` and `SCH_B` columns in 2003 data). Imports stayed in D09-D12.

6. **D5...S files missing (1993–Mar 1994)** — Before the A/B suffix system (introduced Apr 1994), BTS used a trailing `S` suffix for State of Origin files (e.g., `D5AUG93S.DBF`). The parser regex didn't match these, silently dropping all State of Origin data for the first year of the dataset. Fixed: `S` suffix now mapped to `D5A` (State of Origin). Affects 12 files (9 in 1993, 3 in 1994).

7. **R-files (revised replacements) ignored in 1995** — BTS issued corrected `R`-prefix files (e.g., `r3afeb95.dbf`) to replace erroneous original `D` files for Jan–Mar and Jul 1995. The pipeline was processing the bad originals. Fixed: R-files now detected and preferred; corresponding D-files skipped. X-files (deltas) ignored. Affects 14 table×month combinations across D3A/B, D5A/B, D09, D11.

8. **DO9 typo (May 1994)** — File `DO9MAY94.DBF` uses letter O instead of digit 0. Regex `D\d{1,2}` couldn't match it, silently dropping May 1994 Mexico imports (Table 09). Fixed: auto-corrected `DO` → `D0` before parsing.

9. **2017 data in 2006 folder (BTS packaging error)** — Files `DOT10117.DBF`, `DOT20117.DBF`, `DOT30117.DBF` in the 2006 legacy folder contain January 2017 modern data (YEAR=2017). No fix needed — these don't match the legacy filename regex and are correctly ignored. The 2017 data is already loaded from the modern 2017 folder.

10. **D5B/D6B tables producing malformed DOT1 records** — D5B (Mexico) and D6B (Canada) use `NTAR` (89 multicounty regions) instead of state codes. They were routed to DOT1 which requires `USASTATE`, producing rows with blank state fields (1.4M malformed rows across 1994–2002). Fixed: D5B/D6B excluded from `LEGACY_TABLE_INFO` entirely. D5A/D6A already cover the same exports with proper state geography. NTAR removed from `DROP_FIELDS` — no longer silently discarded.

11. **`schema_mappings.json` loaded but unused** — `03_normalize.py` loaded the schema config but never read it. Normalization logic is hardcoded (FIELD_MAPPINGS, DROP_FIELDS, LEGACY_TABLE_INFO, etc.) because the conditional behavior is too complex for flat config. Fixed: removed the dead load; added note clarifying the JSON is a reference data dictionary, not a code driver. Updated JSON header with `_role` field.

12. **Phase 2 doc drift — normalization vs enrichment** — Phase 2 plan described enrichment steps (`Lat`, `Lon`, `Region`, `YearMonth`, `port_aliases.json`) as normalization responsibilities. In reality these happen in `05_build_outputs.py`. Fixed: Phase 2 plan section 2.1 rewritten to match actual `03_normalize.py` behavior, output schema split into normalization vs. enrichment columns.

**Files corrected:** `03_normalize.py`, `schema_mappings.json`, `legacy-to-modern-mapping.md`, `Phase-2_Data-Processing.md`. **Pending:** full pipeline re-run (`03_normalize.py` → `04_create_db.py` → `05_build_outputs.py` → `06_validate.py`).

### Low-Severity Doc/Data Items (from 2026-03-23 code review)

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 6 | **`01-Raw-Data/README.md` mode-coverage description outdated** — Describes dataset as "surface freight trade from April 1993 to present." Incomplete: pre-Nov 2003 is surface-only, Nov 2003–Dec 2006 includes AV air/vessel, 2007+ all modes. README is okay as origin story but not reliable as mode-coverage description. | Low | Open |
| 7 | **Raw-data dictionary docs reference absent source assets** — `01-Raw-Data/data_dictionary/README.md` and `02-Data-Staging/config/README.md` reference `codes-north-american-transborder-freight-raw-data.pdf`, `legacy-reference/`, and `Historical and current data format comparison.xlsx`. These are not in the repo. Docs may be historically accurate but not fully reproducible from this checkout. | Low | Open |
| 8 | **Legacy normalizer only ingests DBF, may miss CSV-only records** — `03_normalize.py` only reads `.DBF` files from legacy years. Some docs describe legacy unpacked contents as DBF/TAB/CSV. If any required analytical records live only in CSV for some years, they would be silently missed. Needs verification against actual unpacked legacy year folders. | Low–Med | Open — verify |

### Open Questions (all resolved)

- [x] ~~Legacy-to-modern schema reconciliation~~ — Documented in `01-Raw-Data/data_dictionary/legacy-to-modern-mapping.md`. Key finding: DOT3 (Port×Commodity) has no legacy equivalent. Legacy tables map to DOT1/DOT2 via column renaming + table-number-derived fields (TRDTYPE, COUNTRY) and STATMOYR-parsed fields (MONTH, YEAR).
- [x] ~~Weight data gaps~~ — Resolved: weight kept as NULL where unavailable. Documented in Phase 2 plan section 2.3.1: export weight unavailable in legacy export tables (D03-D06); import weight available in legacy import tables (D09-D12). Dashboard must show footnotes.
- [x] ~~Commodity code changes~~ — TransBorder uses **HS 2-digit codes** throughout (1993–2025). SCTG is a different system (Commodity Flow Survey) and is NOT used here. No crosswalk needed.
- [x] ~~CSV size budget~~ — Removed. No size cap on output files per user decision. Both JSON and CSV carry full HS-code detail.
- [x] ~~Output dataset structure~~ — Resolved: chart-driven design. 7 datasets, each serving specific dashboard charts. Eliminated `us_mexico_commodities` (no chart needs state×commodity); `commodity_detail` serves US-Mexico commodity charts filtered to Mexico in browser. `us_transborder` slimmed by dropping CommodityGroup (no chart needs it). Total: 57.6 MB JSON (down from 167.5 MB). GitHub Pages serves with automatic gzip (~10 MB over the wire).

---

## Phase 3: WebApp & Pages

### Completed Deliverables

| Item | Date |
|---|---|
| WebApp directory (forked from Task 6 Airport Dashboard) | 2026-03-23 |
| `transborderStore.js` — Zustand store with lazy-loading for 7 datasets | 2026-03-23 |
| `portUtils.js` — El Paso/Ysleta split handling, Mexican crossings, port-region map | 2026-03-23 |
| `transborderHelpers.js` — Filter utilities, formatters, data helpers | 2026-03-23 |
| `insightEngine.js` — Data-driven insight generator (6 scopes) | 2026-03-23 |
| `downloadColumns.js` — Chart-level column maps for CSV export | 2026-03-23 |
| `TreemapChart.jsx` — D3 treemap with click-to-drill-down support | 2026-03-23 |
| `PortMap.jsx` — Leaflet map with CircleMarkers + trade flow arcs | 2026-03-23 |
| `EmbedModal.jsx` — iframe/SVG embed snippet generator | 2026-03-23 |
| Overview page — Hero + stats + trade trends (1993–2025) + mode donut + stacked bar + nav cards | 2026-03-23 |
| US-Mexico page — DashboardLayout + filters + stats + port/commodity charts | 2026-03-23 |
| US-Mexico Ports page — Port analysis with map, bar chart, line chart, data table | 2026-03-23 |
| Texas-Mexico page — 5-tab dashboard (Overview, Ports, Commodities, Modes, Monthly) with lazy-loading | 2026-03-23 |
| Trade by Mode page — DonutChart, BarChart, LineChart, StackedBar, DivergingBar, DataTable | 2026-03-23 |
| Trade by Commodity page — Treemap drilldown + bar + line + data table | 2026-03-23 |
| Trade by State page — State rankings, trends, data table | 2026-03-23 |
| About page — Data source, coverage, terminology, limitations, port history | 2026-03-23 |
| EmbedPage — Chrome-free chart renderer for iframe embeds | 2026-03-23 |
| Navigation updated — 7 nav items (Overview, US-Mexico, Texas-Mexico, By Mode, Commodities, By State, About) | 2026-03-23 |
| Branding updated — SiteHeader, Footer, index.html (title, meta, no GA4) | 2026-03-23 |
| 7 JSON datasets + port_coordinates + districts GeoJSON copied to `WebApp/public/data/` | 2026-03-23 |
| Build verified — `vite build` succeeds (492 KB JS, 48 KB CSS), dev server responds HTTP 200 | 2026-03-23 |

### Phase 3 — Complete

All Phase 3 deliverables implemented. WebApp forked from Airport Dashboard (Task 6), all aviation-specific code replaced with TransBorder freight visualizations. 8 page components + 5 TexasMexico tabs + embed system built. Treemap drilldown, lazy-loading data store, port map with trade flow arcs, and data-driven insight engine all functional. Build succeeds cleanly.

### Open Questions (all resolved)

- [x] ~~Airport Dashboard source~~ — Confirmed at `D:/UNT/UNT System/TxDOT IAC 2025-26 - General/Task 6 - Airport Connectivity/07_WebApp/` (updated 2026-03-23).
- [x] ~~Deployment target~~ — GitHub Pages (static-only). Confirmed in Phase 2 plan.
- [x] ~~Map visualizations~~ — Resolved: lat/lon coordinates for all 28 US-Mexico border POEs from BTS Border Crossing Entry Data (Socrata `keg4-3bc2`). Point markers sized by trade value.

---

## Phase 4: Design & Testing

### Completed Deliverables

| Item | Date |
|---|---|
| Testing scripts suite (`check-all.js`, `schema-check.js`, `visual-check.js`, `deep-functional-check.js`, `responsive-check.js`, `cross-browser-check.js`) | 2026-03-24 |
| Unit tests (`transborderHelpers.test.js`, `regressions.test.js`) with Vitest | 2026-03-24 |
| Cross-browser testing (Chromium, Firefox, WebKit) | 2026-03-24 |
| Responsive testing (desktop, tablet, mobile viewports) | 2026-03-24 |
| Deep functional testing (chart rendering, filter interactions, data tables) | 2026-03-24 |
| Visual regression screenshot baselines | 2026-03-24 |
| Deployed to GitHub Pages | 2026-03-24 |
| Pipeline review fixes (decouple datasets, fix arc math, add tests) | 2026-03-24 |
| WebApp review fixes (perf, a11y, data layer, dead code cleanup) | 2026-03-24 |
| Maps added to all pages, Canadian port data, country filter on Overview | 2026-03-24 |
| Trade by Mode and Trade by Commodity standalone pages removed (consolidated) | 2026-03-24 |
| `us_canada_ports` dataset added (223K rows) | 2026-03-24 |
| `canadian_port_coordinates.json` (89 Canadian border ports) | 2026-03-24 |

### Phase 4 — Complete

All Phase 4 deliverables implemented. Testing suite covers schema validation, visual regression, deep functional checks, responsive design, and cross-browser compatibility. Dashboard deployed to GitHub Pages. Final review fixes applied to both pipeline and webapp.

### Open Questions

- [ ] Accessibility requirements: Are there specific WCAG/Section 508 compliance requirements from TxDOT?
- [ ] Browser support: What browsers/versions must be supported?

---

## Cross-Cutting Issues

| Issue | Impact | Status |
|---|---|---|
| ~~Oct 2020 raw file missing~~ | Resolved | Oct 2020 raw data recovered from Census Bureau (Jason Jindrich, 2026-03-23). Pipeline updated to use actual files instead of subtraction-based derivation. |

---

## Resolved Issues

| Date | Item |
|---|---|
| 2026-03-15 | `requirements.txt` created in `02-Data-Staging/Scripts/` |
| 2026-03-15 | All 10 config JSON files created in `02-Data-Staging/config/` |
| 2026-03-15 | Raw data downloaded and organized: `01-Raw-Data/download/legacy/` (1993–2006) and `01-Raw-Data/download/modern/` (2007–2025) |
| 2026-03-22 | Nov/Dec 2020 data recovered from BTS (Sean Jahanmir). Oct 2020 confirmed missing at BTS — Census is next fallback. |
| 2026-03-22 | Full data audit completed: 2023 Sep–Dec and 2009 DOT2 gaps were false alarms — all data present. Only gap: Oct 2020. |
| 2026-03-22 | All raw data unpacked to `01-Raw-Data/unpacked/` for easier inspection. |
| 2026-03-22 | Oct 2020 recovery method confirmed: derivable via subtraction from annual aggregates. Zero negative values verified across all 3 tables. |
| 2026-03-22 | Config JSONs validated and corrected against official BTS codes PDF. Fixed: canadian_province_codes (completely wrong), mexican_state_codes (missing OT, wrong MX label), mode_codes (label corrections). |
| 2026-03-22 | Legacy-to-modern mapping documented in `01-Raw-Data/data_dictionary/legacy-to-modern-mapping.md`. |
| 2026-03-22 | Data dictionary organized in `01-Raw-Data/data_dictionary/` with provenance README. |
| 2026-03-22 | Port coordinates obtained: `port_coordinates.json` created with lat/lon for all 28 US-Mexico border POEs from BTS Border Crossing Entry Data (Socrata `keg4-3bc2`). Phase 3 map question resolved. |
| 2026-03-22 | `schedule_d_port_codes.json` updated: added 46 `XX` n.e.c. catch-all codes and code 2381 (Edinburg Intl Airport) — all found in raw data but missing from config. |
| 2026-03-22 | `Texas_Ports.csv` cleaned: port names matched to `schedule_d_port_codes.json` canonical names, port codes added, region assignments preserved. |
| 2026-03-22 | `texas_border_districts.geojson` extracted: simplified TxDOT district boundaries (El Paso, Laredo, Pharr) for dashboard map overlay, 17 KB. |
| 2026-03-22 | Phase 2 plan updated with unknown code validation step (step 13). |
| 2026-03-22 | `03_normalize.py` created and run: full 1993-2025 normalization including legacy DBF/CSV, Oct 2020 derivation, unknown code tracking. |
| 2026-03-22 | 3 cleaned CSVs generated: DOT1 (10.3M rows), DOT2 (25.4M rows), DOT3 (3.9M rows). |
| 2026-03-22 | `04_create_db.py` rewritten to read from cleaned CSVs. `transborder.db` rebuilt: 39.6M rows, 10.1 GB, full 1993-2025. |
| 2026-03-22 | Data caveats documented in Phase 2 plan (section 2.3.1) and Phase 3 plan (About Data page): weight availability, Ysleta/El Paso split, port terminology. |
| 2026-03-22 | `05_build_outputs.py` created: 8 datasets (JSON + CSV) from SQLite DB. Each sourced from exactly one DOT table — no joins. Split us_mexico and texas_mexico into port + commodity views. |
| 2026-03-22 | `06_validate.py` created and run: 59 checks, all passed. Trade values match DB exactly. |
| 2026-03-22 | 8 output datasets generated in `03-Processed-Data/`: 734K rows, 167.5 MB JSON, 86.7 MB CSV. |
| 2026-03-22 | Chrome extension validation prompt created in `02-Data-Staging/docs/`. |
| 2026-03-23 | Output datasets redesigned: chart-driven, 8→7 datasets, 167.5→57.6 MB JSON. `us_mexico_commodities` eliminated, `us_transborder` slimmed. Phase 2 & 3 plans updated. |
| 2026-03-22 | **Phase 2 complete.** Full pipeline: normalize -> DB -> outputs -> validate. |
| 2026-03-15 | BTS raw data page reconnaissance completed. |
| 2026-03-15 | Historical format comparison Excel (now in `01-Raw-Data/data_dictionary/`). |

---

## Changelog

| Date | Update |
|---|---|
| 2026-03-24 | **Phase 4 complete.** Testing suite built (schema, visual, functional, responsive, cross-browser). Dashboard deployed to GitHub Pages. Pipeline and webapp review fixes applied. Maps added to all pages. Canadian port data (89 ports) and `us_canada_ports` dataset (223K rows) added. Trade by Mode/Commodity standalone pages consolidated. Per-chart country filter dropdowns added to Overview. Root `README.md` created for project onboarding. |
| 2026-03-23 | **Phase 3 complete.** WebApp built: 8 pages + 5 TexasMexico tabs + embed system. Forked from Airport Dashboard, all aviation code replaced. Treemap drilldown, lazy-loading store, port map, insight engine. Build: 492 KB JS, 48 KB CSS. |
| 2026-03-23 | **BTS confirmation from Sean Jahanmir on legacy file semantics.** (1) A/B suffix = alternative geographic pivots from same raw ledger, not additive — validates D5B/D6B exclusion. (2) R-files = full replacements, X-files = supplemental deltas — validates R-file preference logic. (3) NAFTA-era carry-over context documented. Updated `legacy-to-modern-mapping.md` with authoritative quotes. |
| 2026-03-23 | **Code review fixes (D5B/D6B, schema_mappings, doc drift).** D5B/D6B excluded from normalization (NTAR regions incompatible with DOT1 state×port). schema_mappings.json reclassified as reference doc (was loaded but unused). Phase 2 plan section 2.1 rewritten to match actual code behavior. S-suffix doc corrected in legacy-to-modern-mapping.md. |
| 2026-03-23 | **Output datasets redesigned (chart-driven).** Eliminated `us_mexico_commodities` (108 MB, 423K rows) — no chart needs state×commodity. `commodity_detail` serves US-Mexico commodity charts filtered in browser. Slimmed `us_transborder` by dropping CommodityGroup (15K→954 rows). 8→7 datasets, 167.5→57.6 MB JSON (65% reduction). ~10 MB gzipped over the wire via GitHub Pages. Phase 2 & 3 plans updated. |
| 2026-03-23 | **Legacy data year-range strategy decided.** Overview page shows all years (1993–2025) at aggregate level; all detail pages (ports, commodities, states, monthly) show 2007+ only. `05_build_outputs.py` updated with `MODERN_START_YEAR = 2007`. `data_caveats.md` created consolidating all limitations. Phase 3 plan updated with per-page year ranges. |
| 2026-03-22 | **Phase 2 completed.** Full pipeline: `03_normalize.py` -> `04_create_db.py` -> `05_build_outputs.py` -> `06_validate.py`. 39.6M rows in DB, 8 output datasets (734K aggregated rows), 59/59 validation checks passed. |
| 2026-03-14 | Initial gap tracker created. Full inventory of missing deliverables across all 4 phases. |
| 2026-03-15 | Phase 2 started: `04_create_db.py` created, `transborder.db` built with 25.1M rows (modern era 2007–2025). Discovered additional data gaps: 2023 Sep–Dec missing from BTS, 2009 DOT2 partial. 2020 DOT3 recovered from archives (XLSX). Phase 2 plan updated with YTD strategy, DOT1/DOT2/DOT3 table definitions, and 2020 handling. |
| 2026-03-15 | Major Phase 1 progress: raw data downloaded, config files created, gap tracker updated. Identified Oct–Dec 2020 data gap on BTS website. |
| 2026-03-22 | Nov/Dec 2020 recovered from BTS. Full audit: Oct 2020 is the ONLY monthly gap in entire 1993–2025 dataset. 2023 and 2009 gaps resolved (data was present). Raw data unpacked. Oct 2020 recoverable via subtraction. Config JSONs validated/fixed against official BTS PDF. Legacy-to-modern mapping documented. Data dictionary organized with provenance. |
