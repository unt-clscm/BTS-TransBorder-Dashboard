# Gap Tracker

Living document tracking known issues, missing pieces, and open questions across the BTS-TransBorder project. Updated as work progresses.

---

## Status Summary (as of 2026-03-14)

| Phase | Planning | Implementation |
|---|---|---|
| Phase 1 — Data Acquisition | Complete | Not started |
| Phase 2 — Data Processing | Complete | Not started |
| Phase 3 — WebApp & Pages | Complete | Not started |
| Phase 4 — Design & Testing | Complete | Not started |

---

## Phase 1: Data Acquisition

### Missing Deliverables

| Item | Priority | Notes |
|---|---|---|
| `.gitignore` | High | Needed before any data downloads or commits |
| `requirements.txt` | High | `requests`, `pandas`, `dbfread`, `python-dotenv` |
| `00_check_availability.py` | High | Queries SODA API for month completeness |
| `01a_download_legacy.py` | High | One-time download of 1993-2005 CSV/DBF files |
| `01b_download_modern.py` | High | SODA API download for 2006-2025 |
| `01_download_bts.py` | Medium | Combined wrapper for both tracks |
| `02_document_schemas.py` | Medium | Schema analysis across eras |
| `update_year.py` | Low | Yearly update wrapper (not needed until ~March 2027) |
| `02-Data-Staging/config/.env` | High | Socrata app token (must be manually created) |
| `02-Data-Staging/config/schema_mappings.json` | Medium | Depends on schema analysis |
| `02-Data-Staging/config/port_aliases.json` | Medium | Depends on schema analysis |
| `02-Data-Staging/config/mode_codes.json` | Medium | Depends on schema analysis |
| `01-Raw-Data/legacy/` data | High | No data downloaded yet |
| `01-Raw-Data/modern/` data | High | No data downloaded yet |
| `02-Data-Staging/docs/schema_analysis.md` | Medium | Output of schema documentation script |

### Open Questions

- [ ] Legacy download page structure: Has anyone done reconnaissance on https://www.bts.gov/topics/transborder-raw-data to catalog file links, formats, and naming conventions? This is a prerequisite for `01a_download_legacy.py`.
- [ ] Socrata app token: Has an account been registered at https://data.bts.gov/ to obtain an app token?
- [ ] DBF file handling: Are there known issues with `dbfread` for BTS-specific DBF files (encoding, field types)?

---

## Phase 2: Data Processing

### Missing Deliverables

| Item | Priority | Blocked By |
|---|---|---|
| `03_normalize.py` | High | Phase 1 raw data + schema mappings |
| `04_create_db.py` | High | Normalized data from `03_normalize.py` |
| `05_build_dashboard_csvs.py` | High | SQLite database from `04_create_db.py` |
| `06_validate.py` | High | Dashboard CSVs |
| SQLite database (`transborder.db`) | High | Processing scripts |
| 6 dashboard CSVs in `03-Processed-Data/` | High | Full pipeline completion |

### Open Questions

- [ ] Legacy-to-modern schema reconciliation: How will the 3 separate legacy dataset types (ModePort, Commodity, Geographic) map into the single modern combined schema? Normalization plan needs to be finalized.
- [ ] Weight data gaps: Weight is only available for imports (except air/vessel). How should missing weight values be handled — NULL, zero, or excluded?
- [ ] Commodity code changes: SCTG vs HS code systems differ across eras. Is a crosswalk table available or does one need to be built?
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
- [ ] Deployment target: Where will the dashboard be hosted? GitHub Pages, UNT server, TxDOT infrastructure?
- [ ] Map visualizations: Phase 3 mentions geographic/port maps — are GeoJSON boundaries available for Texas border ports?

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
| No `.gitignore` — risk of committing data files or secrets | High | Not created |
| No `requirements.txt` — Python env not reproducible | Medium | Not created |
| `02-Data-Staging/config/` directory does not exist | Medium | Needs to be created with scripts |
| `02-Data-Staging/docs/` directory does not exist | Low | Needs to be created with schema docs |
| No version control initialized | High | Project directory is not a git repo |

---

## Resolved Issues

_None yet — project is in planning phase._

---

## Changelog

| Date | Update |
|---|---|
| 2026-03-14 | Initial gap tracker created. Full inventory of missing deliverables across all 4 phases. |
