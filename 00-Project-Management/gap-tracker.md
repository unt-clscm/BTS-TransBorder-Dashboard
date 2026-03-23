# Gap Tracker

Living document tracking known issues, missing pieces, and open questions across the BTS-TransBorder project. Updated as work progresses.

---

## Status Summary (as of 2026-03-22)

| Phase | Planning | Implementation |
|---|---|---|
| Phase 1 — Data Acquisition | Complete | **Complete** |
| Phase 2 — Data Processing | Complete | In progress |
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
| `04_create_db.py` | 2026-03-15 |
| `transborder.db` (modern era 2007-2025) | 2026-03-15 — 25.1M rows across 3 tables |

### Missing Deliverables

| Item | Priority | Blocked By |
|---|---|---|
| `03_normalize.py` | High | Phase 1 raw data + schema mappings |
| `05_build_dashboard_csvs.py` | High | SQLite database from `04_create_db.py` |
| `06_validate.py` | High | Dashboard CSVs |
| 6 dashboard CSVs in `03-Processed-Data/` | High | Full pipeline completion |
| Legacy data (1993-2006) loaded into DB | Medium | `03_normalize.py` for legacy DBF/CSV parsing |
| Recover Oct 2020 (all 3 tables) | Low | **Recoverable via subtraction** during normalization. Raw monthly file still missing but computable. |

### Open Questions

- [x] ~~Legacy-to-modern schema reconciliation~~ — Documented in `01-Raw-Data/data_dictionary/legacy-to-modern-mapping.md`. Key finding: DOT3 (Port×Commodity) has no legacy equivalent. Legacy tables map to DOT1/DOT2 via column renaming + filename-derived fields (TRDTYPE, COUNTRY, MONTH, YEAR).
- [ ] Weight data gaps: Weight is only available for imports (except air/vessel). How should missing weight values be handled — NULL, zero, or excluded?
- [x] ~~Commodity code changes~~ — TransBorder uses **HS 2-digit codes** throughout (1993–2025). SCTG is a different system (Commodity Flow Survey) and is NOT used here. No crosswalk needed.
- [ ] CSV size budget: Phase 2 plan mentions a ~10MB budget per CSV. Has this been validated against expected row counts?

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
| 2026-03-22 | Phase 2 plan updated with unknown code validation step (step 13). |
| 2026-03-15 | BTS raw data page reconnaissance completed. |
| 2026-03-15 | Historical format comparison Excel (now in `01-Raw-Data/data_dictionary/`). |

---

## Changelog

| Date | Update |
|---|---|
| 2026-03-14 | Initial gap tracker created. Full inventory of missing deliverables across all 4 phases. |
| 2026-03-15 | Phase 2 started: `04_create_db.py` created, `transborder.db` built with 25.1M rows (modern era 2007–2025). Discovered additional data gaps: 2023 Sep–Dec missing from BTS, 2009 DOT2 partial. 2020 DOT3 recovered from archives (XLSX). Phase 2 plan updated with YTD strategy, DOT1/DOT2/DOT3 table definitions, and 2020 handling. |
| 2026-03-15 | Major Phase 1 progress: raw data downloaded, config files created, gap tracker updated. Identified Oct–Dec 2020 data gap on BTS website. |
| 2026-03-22 | Nov/Dec 2020 recovered from BTS. Full audit: Oct 2020 is the ONLY monthly gap in entire 1993–2025 dataset. 2023 and 2009 gaps resolved (data was present). Raw data unpacked. Oct 2020 recoverable via subtraction. Config JSONs validated/fixed against official BTS PDF. Legacy-to-modern mapping documented. Data dictionary organized with provenance. |
