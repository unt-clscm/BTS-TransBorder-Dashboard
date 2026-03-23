# Phase 1 and Phase 2 Readiness Gaps

Review date: 2026-03-22
Project: BTS-TransBorder

## Purpose

This note captures the main gaps, inconsistencies, and readiness risks identified during a review of:

- `00-Project-Management/Main-Plans/Phase-1_Data-Acquisition.md`
- `00-Project-Management/Main-Plans/Phase-2_Data-Processing.md`
- `00-Project-Management/gap-tracker.md`
- `01-Raw-Data/README.md`
- `01-Raw-Data/data_dictionary/README.md`
- `01-Raw-Data/Scripts/01c_organize_manual_downloads.py`
- `01-Raw-Data/Scripts/unpack_raw_data.py`
- `02-Data-Staging/Scripts/04_create_db.py`
- `02-Data-Staging/config/*.json`

## Executive Summary

Phase 1 is substantively in good shape. The raw download inventory, unpacked data, and core config files are present and largely consistent with the intended 1993-2025 scope.

The main risks are not missing core acquisition work, but documentation drift and Phase 2 handoff problems. In particular, the documented raw-data layout, the existing database-loading script, and the stated Phase 2 workflow are not fully aligned yet.

## Verified Strengths

- The local raw-data inventory appears complete for the target 1993-2025 scope except for `October2020TransBorderRawData.zip`.
- `November2020TransBorderRawData.zip` and `December2020TransBorderRawData.zip` are present locally.
- `01-Raw-Data/download/modern/2020/README.md` exists locally and documents 2020 provenance.
- Core config files exist and look structurally correct:
  - `mode_codes.json`
  - `commodity_codes.json`
  - `country_codes.json`
  - `trade_type_codes.json`
  - `schedule_d_port_codes.json`
  - `state_codes.json`
  - `canadian_province_codes.json`
  - `mexican_state_codes.json`
  - `port_aliases.json`
  - `schema_mappings.json`
  - `transborder_url_manifest.json`
- `transborder_url_manifest.json` matches the on-disk download inventory except for:
  - `modern/2020/October2020TransBorderRawData.zip`
  - `modern/2026/January2026.zip`

## High Severity Gaps

### 1. ~~Phase 2 input path does not match the Phase 1 folder structure~~ RESOLVED

`04_create_db.py` updated to use `01-Raw-Data/download/modern/` — the canonical location for raw ZIP files. Path now matches the documented Phase 1 structure.

### 2. Phase 2 is not fully implemented yet

The Phase 2 plan expects these scripts:

- `02-Data-Staging/Scripts/03_normalize.py`
- `02-Data-Staging/Scripts/04_create_db.py`
- `02-Data-Staging/Scripts/05_build_dashboard_csvs.py`
- `02-Data-Staging/Scripts/06_validate.py`

Only these are currently present:

- `02-Data-Staging/Scripts/04_create_db.py`
- `02-Data-Staging/Scripts/requirements.txt`

This means the project is not yet ready to truthfully claim full Phase 2 execution readiness.

### 3. ~~The current database-loading script reflects an older data-status story~~ RESOLVED

`04_create_db.py` docstring updated to reflect current data status. Stale 2020 XLSX workaround removed. 2023 partial-year assumption removed. Script now accurately describes: 2020 Sep YTD + Nov/Dec recovery + Oct derivation in normalization; all other years verified complete.

## Medium Severity Gaps

### 4. ~~The 2020 gap narrative is inconsistent across documents~~ RESOLVED

All documents now consistently distinguish between "raw file missing" and "analytically recoverable via subtraction." Both READMEs and the gap tracker updated.

### 5. ~~Important provenance documentation is local-only, not safely shared in git~~ RESOLVED

`.gitignore` updated to unignore `01-Raw-Data/download/modern/2020/README.md` so it is tracked in git and available to collaborators.

### 6. A referenced source file for the URL manifest is missing from the repo

`02-Data-Staging/config/transborder_url_manifest.json` says its source is:

- `transborder_raw_data_links.md`

That file was not found in the repository review. This weakens reproducibility of how the manifest was assembled.

### 7. ~~The gap tracker contains outdated or conflicting references~~ RESOLVED

- Legacy-to-modern mapping path corrected to `01-Raw-Data/data_dictionary/legacy-to-modern-mapping.md`.
- Deployment target marked as resolved (GitHub Pages).
- `transborder_raw_data_links.md` reference corrected to `transborder_url_manifest.json`.
- October 2020 wording now clearly distinguishes raw-file absence from analytical coverage.

## Low Severity Gaps

### 8. ~~Date inconsistency in raw-data provenance~~ RESOLVED

Corrected `2025-03-21` to `2026-03-21` in `01-Raw-Data/README.md`.

### 9. ~~Minor wording and terminology drift~~ PARTIALLY RESOLVED

- Mode 8 label standardized to `Other/Unknown` in `mode_codes.json` and Phase 1 plan.
- `COMMODITY` vs `COMMODITY2` naming is inherent to the schema (pre-2007 vs post-2007) — `schema_mappings.json` handles the translation. No action needed.
- Path conventions resolved via Gap 1 fix.

### 10. `unpack_raw_data.py` clears the full unpacked directory on rerun

This is acceptable if `01-Raw-Data/unpacked/` is treated as purely generated output, but it should be explicitly understood as destructive to any manually added notes or non-generated files placed there.

## Readiness Assessment

### Phase 1

Status: Functionally ready, with documentation cleanup recommended.

Reasoning:

- Raw files appear acquired for the intended production scope.
- Config files and schema references are present.
- The main issues are documentation consistency and reproducibility details, not missing core acquisition work.

### Phase 2

Status: Not fully ready to start end-to-end implementation without clarification.

Reasoning:

- The documented input layout and current script path assumptions do not match.
- Required scripts listed in the Phase 2 plan are still missing.
- The current database-loading script reflects an older understanding of data availability.

## Recommended Next Actions

1. ~~Define one canonical raw-data input contract for Phase 2.~~ **RESOLVED 2026-03-22:** `04_create_db.py` updated to use `01-Raw-Data/download/modern/` (ZIPs). Phase 2 normalization will read from the same path.

2. ~~Reconcile the 2020 narrative everywhere.~~ **RESOLVED 2026-03-22:** All docs now consistently distinguish between "raw file missing" and "analytically recoverable." READMEs at `01-Raw-Data/README.md`, `01-Raw-Data/download/modern/2020/README.md`, and gap tracker updated.

3. ~~Bring `04_create_db.py` documentation in line with the current audit findings.~~ **RESOLVED 2026-03-22:** Docstring updated, stale 2020 XLSX workaround and 2023 partial-year assumptions removed.

4. ~~Add or preserve provenance artifacts needed for reproducibility.~~ **RESOLVED 2026-03-22:** `.gitignore` updated to unignore `01-Raw-Data/download/modern/2020/README.md`. `transborder_raw_data_links.md` reference in gap tracker corrected to point to actual file (`transborder_url_manifest.json`).

5. ~~Update the gap tracker to remove stale paths and settled open questions.~~ **RESOLVED 2026-03-22:** Fixed legacy-to-modern mapping path, marked deployment target as resolved (GitHub Pages), corrected `transborder_raw_data_links.md` reference, normalized 2020 gap wording.

6. Do not claim full Phase 2 readiness until the missing Phase 2 scripts are in place or the plan is revised to reflect the actual current state. **STILL OPEN:** `03_normalize.py`, `05_build_dashboard_csvs.py`, and `06_validate.py` are not yet written.

## Remaining Open Items

- **Gap 2 (High):** Phase 2 scripts `03_normalize.py`, `05_build_dashboard_csvs.py`, `06_validate.py` still need to be implemented.
- **Gap 6 (Medium):** `transborder_raw_data_links.md` source file still does not exist. The URL manifest JSON serves the same purpose, but the original markdown file referenced in early docs was never created. Low impact since `transborder_url_manifest.json` is the authoritative source.
- **Gap 10 (Low):** `unpack_raw_data.py` destructive rerun behavior is acknowledged but acceptable.

## Bottom Line

Documentation consistency issues identified in this review have been resolved as of 2026-03-22. Path mismatches, stale assumptions, terminology drift, and narrative inconsistencies are fixed. Phase 1 is now in a clean, review-proof state.

Phase 2 readiness depends on implementing the remaining processing scripts (`03_normalize.py`, `05_build_dashboard_csvs.py`, `06_validate.py`).
