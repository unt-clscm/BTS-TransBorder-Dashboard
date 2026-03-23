# Raw Data — Download Provenance

## Source

All raw data comes from the **Bureau of Transportation Statistics (BTS) TransBorder Freight Data** program:
https://www.bts.gov/topics/transborder-raw-data

The dataset covers U.S.–Canada and U.S.–Mexico surface freight trade from April 1993 to present.

## How the Data Was Downloaded

### Automated download attempts (failed)

We initially wrote Python scripts to programmatically crawl and download the ZIP files from the BTS TransBorder Raw Data page. However, **BTS uses a CDN (content delivery network) that blocks all non-browser HTTP requests** — both the landing pages and direct file URLs return 403 Forbidden errors. This applies to `requests`, `urllib`, `wget`, `curl`, and all other automated tools we tested.

No public API endpoint exists for TransBorder freight data. The BTS website is the only source for raw data downloads.

### Manual download via Claude Cursor extension

Since automated downloads were blocked, the data was **manually downloaded using the Claude Chrome Browser Extension**. The extension navigated the BTS download page and downloaded all available ZIP files. This covered:

- **Legacy data (1993–2006):** 14 yearly ZIP archives, each containing monthly data in DBF format
- **Modern data (2007–2025):** Monthly ZIP archives containing DOT1, DOT2, DOT3 CSV files

All files were initially saved to a dump folder, then organized into `download/legacy/{year}/` and `download/modern/{year}/` subfolders using `01-Raw-Data/Scripts/01c_organize_manual_downloads.py`.

### Download date

Bulk download completed on **2026-03-21**.

## Missing Data and Recovery

After downloading, a comprehensive audit identified files that were missing from the BTS download page.

### October 2020 (all tables) — RAW FILE MISSING, ANALYTICALLY RECOVERABLE

- The BTS download page had no ZIP files for October, November, or December 2020.
- We emailed the BTS data contact, **Sean Jahanmir** (sean.jahanmir@dot.gov, 202-760-1007).
- Sean provided **November and December 2020** ZIPs via email on **2026-03-22**.
- He confirmed that **October 2020 raw data is not available at BTS**.
- BTS suggested contacting **Census** as a fallback: https://www.census.gov/foreign-trade/contact.html
- October 2020 is the **only confirmed monthly raw-file gap** in the entire 1993–2025 dataset.
- **No analytical gap remains:** October values are derived during Phase 2 normalization by subtracting known months (Sep YTD + Nov + Dec) from annual aggregates. Verified: zero negative values across all 3 tables.
- See `download/modern/2020/README.md` for detailed provenance of the 2020 files.

### 2023 and 2009 — Resolved (false alarms)

- Initially we suspected 2023 Sep–Dec and 2009 DOT2 Sep–Dec were missing based on the BTS download page layout.
- A full audit of the downloaded ZIPs (2026-03-22) confirmed **all months are present** for both years. The data was in the downloaded files all along — the BTS page just didn't list them clearly.

## Directory Structure

```
01-Raw-Data/
  download/          <- Original ZIP files as downloaded from BTS
    legacy/          <- 1993–2006, one ZIP per year, DBF format
      1993/
      ...
      2006/
    modern/          <- 2007–2025, monthly ZIPs, CSV format (DOT1/DOT2/DOT3)
      2007/
      ...
      2025/
  unpacked/          <- Extracted contents of the ZIPs (never modified)
    legacy/          <- DBF/TAB/CSV files extracted from legacy ZIPs
      1993/
      ...
      2006/
    modern/          <- DOT1/DOT2/DOT3 CSVs extracted from modern ZIPs
      2007/
      ...
      2025/
  data_dictionary/   <- Schema docs, code tables, format references
  Scripts/           <- Utility scripts used during data acquisition
  README.md          <- This file
```

## Data Completeness Summary

| Era | Years | Monthly Coverage | Gaps |
|-----|-------|-----------------|------|
| Legacy | 1993–2006 | Apr 1993 – Dec 2006 (program started Apr 1993) | None |
| Modern | 2007–2025 | Jan 2007 – Dec 2025 | Oct 2020 raw file missing (analytically recovered via subtraction) |
