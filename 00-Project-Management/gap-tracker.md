# Gap Tracker

Living document tracking known issues, missing pieces, and open questions across the BTS-TransBorder project. Updated as work progresses.

---

## Status Summary (as of 2026-03-22)

| Phase | Planning | Implementation |
|---|---|---|
| Phase 1 — Data Acquisition | Complete | **Complete** |
| Phase 2 — Data Processing | Complete | **In progress** (normalize + DB done, outputs pending) |
| Phase 3 — WebApp & Pages | Complete | Not started |
| Phase 4 — Design & Testing | Complete | Not started |

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
| `01-Raw-Data/download/modern/` data | 2026-03-15 (2007–2025, organized by year; Nov/Dec 2020 recovered 2026-03-22; **Oct 2020 still missing**) |
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
| **2020 all tables: Oct (month 10) raw file missing** | Low | Raw file not available from BTS. **No analytical gap:** October values derived via subtraction (Annual aggregates − Sep YTD − Nov − Dec). Verified: zero negative values across all 3 tables (DOT1: 26,789 records, DOT2: 74,243, DOT3: 17,258). Implemented during Phase 2 normalization. Alternatively: contact Census at https://www.census.gov/foreign-trade/contact.html for raw file. |
| 2026 data (partial) | None | Jan 2026 available but excluded per policy — only complete years (all 12 months) are incorporated. |

### Resolved Data Gaps (verified 2026-03-22)

| Gap | Resolution |
|---|---|
| **2023 all tables: Sep–Dec** | Full audit confirmed all 12 months present for DOT1, DOT2, DOT3. Data was in the downloaded ZIPs. |
| **2009 DOT2: Sep–Dec** | Full audit confirmed all 12 months present for DOT1, DOT2, DOT3 in Revised 2009 bundle. |
| **2020 Nov–Dec all tables** | Provided directly by Sean Jahanmir (BTS) via email on 2026-03-22. See `01-Raw-Data/download/modern/2020/README.md`. |

### Open Questions

- [x] ~~Legacy download page structure~~ — Completed. Links cataloged in `02-Data-Staging/config/transborder_url_manifest.json`.
- [x] ~~Socrata app token~~ — No public API exists for TransBorder freight data. Not applicable.
- [ ] DBF file handling: Are there known issues with `dbfread` for BTS-specific DBF files (encoding, field types)?
- [x] ~~**Missing data request to BTS**~~: Sean Jahanmir responded 2026-03-22 — provided Nov/Dec 2020. Oct 2020 unavailable at BTS. 2023 and 2009 gaps were false alarms (data verified present in full audit). Next step for Oct 2020: contact Census.

---

## Phase 2: Data Processing

### Completed Deliverables

| Item | Date |
|---|---|
| `04_create_db.py` | 2026-03-15 (rewritten 2026-03-22 to read from cleaned CSVs) |
| `03_normalize.py` | 2026-03-22 — handles modern (2007-2025) + legacy (1993-2006), Oct 2020 derivation, unknown code tracking |
| 3 cleaned CSVs in `02-Data-Staging/cleaned/` | 2026-03-22 — DOT1: 10.3M rows (906 MB), DOT2: 25.4M rows (4.4 GB), DOT3: 3.9M rows (656 MB) |
| `transborder.db` (full 1993-2025) | 2026-03-22 — 39.6M rows across 3 tables, 10.1 GB |
| Legacy data (1993-2006) loaded | 2026-03-22 — via `03_normalize.py` legacy DBF/CSV parsing |
| Oct 2020 derived (all 3 tables) | 2026-03-22 — subtraction method, zero negative values verified (DOT1: 26,790, DOT2: 74,243, DOT3: 17,259 rows) |
| `unknown_codes_report.txt` | 2026-03-22 — 73 unknown port codes, DU state, XX MexState, nan trade type documented |
| Data caveats documented | 2026-03-22 — weight/freight availability, Ysleta/El Paso split, port terminology in Phase 2 and Phase 3 plans |

### Missing Deliverables

| Item | Priority | Blocked By |
|---|---|---|
| `05_build_outputs.py` | High | Output strategy decision (dataset definitions, aggregation approach) |
| `06_validate.py` | High | Output files |
| 6 output datasets in `03-Processed-Data/` (JSON + CSV) | High | `05_build_outputs.py` |

### Open Questions

- [x] ~~Legacy-to-modern schema reconciliation~~ — Documented in `01-Raw-Data/data_dictionary/legacy-to-modern-mapping.md`. Key finding: DOT3 (Port×Commodity) has no legacy equivalent. Legacy tables map to DOT1/DOT2 via column renaming + filename-derived fields (TRDTYPE, COUNTRY, MONTH, YEAR).
- [x] ~~Weight data gaps~~ — Resolved: weight kept as NULL where unavailable. Documented in Phase 2 plan section 2.3.1: export weight only for air/vessel modes; import weight available for all modes. Dashboard must show footnotes.
- [x] ~~Commodity code changes~~ — TransBorder uses **HS 2-digit codes** throughout (1993–2025). SCTG is a different system (Commodity Flow Survey) and is NOT used here. No crosswalk needed.
- [x] ~~CSV size budget~~ — Removed. No size cap on output files per user decision. Both JSON and CSV carry full HS-code detail.
- [ ] **Output dataset structure**: The 6 planned datasets have a structural issue — `us_mexico` and `texas_mexico` datasets want port + commodity in the same row, but no single BTS table has state + port + commodity. DOT1 has state+port (no commodity), DOT3 has port+commodity (no state). Need to decide how to handle this.

---

## Phase 3: WebApp & Pages

### Missing Deliverables

| Item | Priority | Blocked By |
|---|---|---|
| WebApp directory (fork from Airport Dashboard) | High | Phase 2 processed CSVs |
| `transborderStore.js` (Zustand data store) | High | WebApp fork |
| 8 page components | High | Data store |
| Navigation and branding updates | Medium | WebApp fork |
| CSV loading utilities | Medium | WebApp fork |

### Open Questions

- [ ] Airport Dashboard source: Is `c:/Users/UNT/UNT System/TxDOT IAC 2025-26 - General/Task 6 - Airport Connectivity/07_WebApp/` still the correct path for the fork source?
- [x] ~~Deployment target~~ — GitHub Pages (static-only). Confirmed in Phase 2 plan.
- [x] ~~Map visualizations: Phase 3 mentions geographic/port maps — are GeoJSON boundaries available for Texas border ports?~~ Resolved: lat/lon coordinates for all 28 US-Mexico border POEs obtained from BTS Border Crossing Entry Data (Socrata `keg4-3bc2`). Saved to `02-Data-Staging/config/port_coordinates.json`. GeoJSON boundaries not needed — point markers sized by trade value are sufficient.

---

## Phase 4: Design & Testing

### Missing Deliverables

| Item | Priority | Blocked By |
|---|---|---|
| Testing scripts | Medium | WebApp implementation |
| Deployment configuration | Medium | Hosting decision |
| Design playbook application | Low | WebApp implementation |

### Open Questions

- [ ] Accessibility requirements: Are there specific WCAG/Section 508 compliance requirements from TxDOT?
- [ ] Browser support: What browsers/versions must be supported?

---

## Cross-Cutting Issues

| Issue | Impact | Status |
|---|---|---|
| Oct 2020 raw file missing (all 3 tables) | Low | No analytical gap — October derived via subtraction during Phase 2 normalization. Only the raw source file is absent. |

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
| 2026-03-15 | BTS raw data page reconnaissance completed. |
| 2026-03-15 | Historical format comparison Excel (now in `01-Raw-Data/data_dictionary/`). |

---

## Changelog

| Date | Update |
|---|---|
| 2026-03-22 | Phase 2 major progress: `03_normalize.py` + `04_create_db.py` complete. Full 1993-2025 database built (39.6M rows). Data caveats documented. Output strategy discussion pending before `05_build_outputs.py`. |
| 2026-03-14 | Initial gap tracker created. Full inventory of missing deliverables across all 4 phases. |
| 2026-03-15 | Phase 2 started: `04_create_db.py` created, `transborder.db` built with 25.1M rows (modern era 2007–2025). Discovered additional data gaps: 2023 Sep–Dec missing from BTS, 2009 DOT2 partial. 2020 DOT3 recovered from archives (XLSX). Phase 2 plan updated with YTD strategy, DOT1/DOT2/DOT3 table definitions, and 2020 handling. |
| 2026-03-15 | Major Phase 1 progress: raw data downloaded, config files created, gap tracker updated. Identified Oct–Dec 2020 data gap on BTS website. |
| 2026-03-22 | Nov/Dec 2020 recovered from BTS. Full audit: Oct 2020 is the ONLY monthly gap in entire 1993–2025 dataset. 2023 and 2009 gaps resolved (data was present). Raw data unpacked. Oct 2020 recoverable via subtraction. Config JSONs validated/fixed against official BTS PDF. Legacy-to-modern mapping documented. Data dictionary organized with provenance. |
