<!-- INTENT: This file catalogs public GitHub repos that directly analyze or visualize
BTS TransBorder Freight Data. Its purpose is to find reusable code patterns, data cleaning
approaches, and visualization techniques for the Task 1.3 dashboard. ONLY include repos
where the TransBorder dataset itself is the subject of analysis — do NOT include repos that
use other datasets (Border Crossing/Entry, FAF, Census trade) even if the subject matter
overlaps. Repos may use additional datasets alongside TransBorder. -->

# Public GitHub Repositories Using the BTS TransBorder Freight Dataset

> **Last reviewed:** 2026-03-15
>
> This document catalogs public GitHub repositories and related projects that directly
> analyze or visualize the [BTS TransBorder Freight Data](https://www.bts.gov/transborder)
> published by the Bureau of Transportation Statistics. The goal is to identify analytical
> approaches, visualization patterns, and data handling techniques that can inform and
> improve the Task 1.3 TransBorder Freight Dashboard.

---

## Summary of Findings

The BTS TransBorder Freight dataset is **under-represented on public GitHub**. Only a
handful of repositories directly consume and analyze TransBorder Freight data. Most public
work with this dataset lives in Medium articles, Power BI projects, or internal/private
analyses rather than open-source repos.

| Category | Count |
|---|---|
| Repos directly using TransBorder Freight data | 3 |
| Related articles with linked code | 2 |

---

## 1. Repositories Directly Using TransBorder Freight Data

### 1.1 Afra233/TransBorder-Freight-Analysis-Project

| Field | Detail |
|---|---|
| **URL** | https://github.com/Afra233/TransBorder-Freight-Analysis-Project |
| **Language** | Jupyter Notebook (100%) |
| **License** | MIT |
| **Stars / Forks** | 2 / 0 |
| **Last Updated** | March 2025 |

**Description:** Applies the CRISP-DM framework to analyze cross-border freight transportation
data. Examines patterns, trends, and correlations to generate business insights.

**Key Features:**
- Data cleaning and preparation workflows
- Exploratory data analysis with statistical summaries
- Multiple visualization types: line plots, bar charts, heatmaps
- Monthly data aggregated into yearly consolidated datasets
- Results exported as cleaned datasets and image files

**Tech Stack:** Python, Pandas, NumPy, Matplotlib, Seaborn, Jupyter Notebook

**Companion Article:** [Analyzing Transborder Freight: How Python Helps Unlock North America's Trade Dynamics](https://medium.com/@naaowusu.addo/analyzing-transborder-freight-how-python-helps-unlock-north-americas-trade-dynamics-a795f6bbd2a3) (Medium)

**Relevance to Our Project:** Closest match to our work. Uses the same raw BTS TransBorder
Freight data, performs schema consolidation across monthly files, and produces freight trend
visualizations by mode and trading partner. Worth reviewing their data cleaning approach.

---

### 1.2 Manoel Vuu — TransBorder Freight Data Analysis (Power BI)

| Field | Detail |
|---|---|
| **Article** | https://medium.com/@manoelvuu/transborder-freight-data-analysis-d9ec94a6c568 |
| **GitHub** | Referenced in article (not independently discoverable via search) |
| **Tool** | Power BI Desktop, DAX Studio, Power Query Editor |
| **Data Scope** | 36 million rows, 2020–2024 |

**Description:** Large-scale analysis of BTS TransBorder Freight data (2020–2024) combining
all monthly files into a single unified dataset (16 columns, 36,347,182 rows).

**Key Findings:**
- Vessel leads freight volume at 33%, Pipeline at 30%
- Commodity 27 (Mineral Fuels) drives 56% of freight volume
- Trucks account for 53% of CO2 emissions
- Rail at 21%, Pipeline 16%, Vessel 9% of emissions

**Relevance to Our Project:** Demonstrates a Power BI approach to the same dataset. Their
unified schema (16 columns) is a useful reference point for our normalization plan. The
emissions analysis is a novel angle not in the original BTS dashboard.

---

### 1.3 Data Rescue Project — TransBorder Freight Program Data

| Field | Detail |
|---|---|
| **Portal Entry** | https://portal.datarescueproject.org/datasets/transborder-freight-program-data-dashbord/ |
| **GitHub (Portal)** | https://github.com/datarescueproject/portal |
| **Data Mirror** | https://www.datalumos.org/datalumos/project/239021 |
| **Formats** | DBF, CSV, ZIP |
| **Last Modified** | 2025-11-09 |

**Description:** The Data Rescue Project archived the BTS TransBorder Freight dashboard data
as part of its broader mission to preserve government datasets. The portal repo (MIT license,
5 stars) provides a searchable front-end to the rescued data catalog.

**Relevance to Our Project:** Provides an alternative download mirror for TransBorder data.
The DataLumos archive may contain historical snapshots useful for verifying data integrity
across our 1993–2025 collection.

---

## 2. Gaps and Opportunities

Based on this review, the following gaps exist in the public GitHub landscape for TransBorder
Freight data:

### What's Missing
1. **No comprehensive multi-year schema documentation** — None of the existing repos document
   the schema changes across the 1993–2025 time range that we are tackling.
2. **No unified database solution** — Existing projects work with subsets (e.g., 2020–2024)
   or single monthly files. Nobody has published a full 30+ year consolidated database.
3. **No interactive web dashboard on GitHub** — The only TransBorder Freight dashboards are
   the official BTS Socrata dashboard and Power BI projects. No open-source web app exists.
4. **No Texas-Mexico focused analysis** — All existing repos analyze the full U.S. dataset
   or U.S.–Canada/Mexico broadly. None drill into Texas-specific border trade patterns.
5. **No API or automated download tools** — Unlike the BTS aviation data (which has
   `sherwinhlee/bts` for automated downloads), there is no equivalent tool for TransBorder
   Freight data.

### Our Project's Differentiation
Our project fills every gap listed above:
- Full 1993–2025 data collection with schema change documentation
- Unified multi-table database
- Interactive web dashboard (planned)
- Three-tier analysis: Full U.S. → U.S.–Mexico → Texas–Mexico
- Automated data download and processing pipeline

---

## 3. Useful Patterns to Borrow

| Pattern | Source | Applicability |
|---|---|---|
| CRISP-DM analysis framework | Afra233 | Structure for our exploratory analysis phase |
| Power Query for 36M row unification | Manoel Vuu | Reference for schema normalization approach |
| Data archival/rescue patterns | Data Rescue Project | Data preservation and mirroring strategy |

---

## References

- **BTS TransBorder Freight Data Portal:** https://www.bts.gov/transborder
- **BTS Raw Data Archive:** https://www.bts.gov/topics/transborder-raw-data
- **BTS Interactive Dashboard:** https://data.bts.gov/stories/s/myhq-rm6q
- **BTS TransBorder Codes Reference:** https://www.bts.gov/browse-statistical-products-and-data/transborder-freight-data/transborder-codes
- **DataLumos Archive Mirror:** https://www.datalumos.org/datalumos/project/239021
