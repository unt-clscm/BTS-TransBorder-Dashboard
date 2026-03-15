
# Project Instructions for BTS Transported Data Web Application

## Overview
This document outlines the instructions for building a new web application using the BTS transported dataset, integrating design elements from the project clone, analytics from the TxDOT dashboard, and visualization patterns from the original BTS dashboard.

## Application Goals
- Review the cloned project structure to understand its web application setup.
- Create a new web application using the BTS transported (raw + cleaned) dataset.
- Incorporate visualization concepts from:
  - **Original BTS dashboard**
  - **TxDOT dashboard** (previously built)
  - **Design system + UI features from the Airport Dashboard**

## Data Requirements
### 1. Download Raw Data
- Download BTS transported data for **1993–2025**.
- Do **not** download 2026 data.
- Download all process complete datasets. Within Transporter, the data is reported in different formats.

### 2. Create a Unified Database
- Combine all years of raw data into a single database with multiple tables. Each table for the different datasets available within BTS.

### 3. Document Data Format Differences per dataset
- Identify the difference between the different datasets
- Early years (1993–early 2000s) use different structures.
- Later years have a standardized schema.
- Produce thorough documentation including:
  - Field differences by year
  - Missing/extra variables
  - Variations in file organization (BTS splits the same dataset into multiple files in some years)

### 4. Data Normalization Plan
- Propose a clear strategy to:
  - Normalize schemas
  - Merge files across all years
  - Ensure compatibility for dashboard analytics

## Dashboard Requirements
### High-Level Structure
The dashboard should be more comprehensive than the older TxDOT version and support broader analysis.

### Data Usage Strategy
- The full dataset includes **U.S.–Mexico** and **U.S–Canada** trade.
- For analytical layers:
  1. **Full U.S. dataset**
  2. **Subset: U.S. → Mexico**
  3. **Deep dive: Texas → Mexico**

This mirrors the hierarchical approach used in the airport dashboard.

### Year Range
- Include **all available years** for now (1993–2025).
- We may decide later whether to limit the timeline shown in visualizations.

## References for UI/UX + Visualizations
- **Original BTS dashboard** → Visualization inspiration
- **TxDOT dashboard** → Analytical components to re‑implement
- **Project clone** → UI design patterns and architecture

---

## Directory Structure

```
BTS-TransBorder/
  00-Project-Plans/        <- Project planning documents (this folder)
  01-Raw-Data/             <- Raw data from source, never modified after download
  02-Data-Staging/         <- Scripts, configs, intermediary/in-progress data
    Scripts/               <- All processing scripts live here
    config/                <- Schema mappings, env files, lookup tables
    cleaned/               <- Normalized intermediary CSVs
    docs/                  <- Schema analysis, validation reports
  03-Processed-Data/       <- Final, cleaned, dashboard-ready data
  BTS-Datasets/            <- BTS dataset files
  WebApp/                  <- Dashboard web application (Phase 3)
```

---

## References
- **Original Dashboard**: https://data.bts.gov/stories/s/myhq-rm6q
- **TxDOT Dashboard**: https://tiger-unt.github.io/Data-Dashboard-Boilerplate/#/border-ports
- **Raw Data**: https://www.bts.gov/topics/transborder-raw-data
- **Airport Dashboard (Project Clone)**: https://github.com/tiger-unt/TX-MX-AirportConnectivity
