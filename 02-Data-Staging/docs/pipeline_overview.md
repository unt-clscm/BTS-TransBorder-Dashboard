# TransBorder Data Pipeline Overview

A high-level summary of the steps used to transform raw BTS TransBorder freight data into dashboard-ready datasets.

---

## Step 1 — Download Raw Data

Raw data files are downloaded from the Bureau of Transportation Statistics (BTS):

**https://www.bts.gov/topics/transborder-raw-data**

BTS publishes monthly data archives containing freight flow records for all U.S.–Mexico and U.S.–Canada border crossings. The dataset spans from 1993 to the present.

## Step 2 — Unpack Archives

Each downloaded archive is extracted and organized by year. No modifications are made to the original files.

## Step 3 — Normalize

The raw data format changed significantly over the years. In this step, all files — regardless of era or format — are standardized into three consistent tables:

| Table | What it captures |
|-------|-----------------|
| **DOT 1** | Trade by U.S. state and port of entry |
| **DOT 2** | Trade by U.S. state and commodity group |
| **DOT 3** | Trade by port of entry and commodity group |

Each record includes the year, month, trade direction (import/export), transportation mode (truck, rail, etc.), trade value in U.S. dollars, and shipment weight. All coded fields are translated into plain-language labels (e.g., port names, commodity descriptions, state names).

## Step 4 — Load into Database

The three standardized tables are loaded into a single database containing approximately 39.7 million records. This database serves as the authoritative source for all analysis.

## Step 5 — Generate Dashboard Datasets

The database is queried to produce focused, pre-summarized datasets tailored to each section of the dashboard:

| Dataset | What it covers |
|---------|---------------|
| U.S. TransBorder Overview | National-level trade trends, 1993–2025 |
| U.S.–Mexico Ports | All U.S.–Mexico border crossings |
| U.S.–Canada Ports | All U.S.–Canada border crossings |
| Texas–Mexico Ports | Texas border crossings with map coordinates |
| Texas–Mexico Commodities | What goods move through Texas border ports |
| U.S. State Trade | State-level trade rankings and trends |
| Commodity Detail | National breakdown by commodity group |
| Monthly Trends | Month-by-month patterns for seasonal analysis |

## Step 6 — Validate

Two rounds of automated quality checks confirm data accuracy:

- **Internal checks** — Verify that all output datasets are complete, cover the expected date ranges, and that dollar totals match the database.
- **Cross-checks against BTS** — Data is independently downloaded from the BTS Tableau dashboard and compared against our pipeline results to ensure they agree.

## Step 7 — Publish to Dashboard

The prepared datasets feed an interactive web dashboard with maps, charts, and filterable data tables for exploring TransBorder freight flows.

---

## Summary

| Step | Input | Output |
|------|-------|--------|
| 1. Download | BTS website | Raw data archives (1993–2025) |
| 2. Unpack | Archives | Individual data files organized by year |
| 3. Normalize | Raw data files | 3 standardized tables (DOT 1, DOT 2, DOT 3) |
| 4. Load | 3 standardized tables | Database with 39.7 million records |
| 5. Generate | Database queries | 8 focused datasets for the dashboard |
| 6. Validate | Pipeline outputs + BTS published figures | All internal and external checks passing |
| 7. Publish | Dashboard datasets | Interactive web dashboard |
