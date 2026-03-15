<!-- INTENT: This file is a landscape review of existing dashboards and visualizations that
directly analyze or visualize BTS TransBorder Freight Data. Its purpose is to help the team
borrow design ideas (chart types, interaction models, filter patterns, layout) for the
Task 1.3 TransBorder Freight Dashboard. ONLY include entries where the TransBorder dataset
itself is analyzed or visualized — do NOT include tools that merely incorporate TransBorder
as one input to a larger model (e.g., FAF5), or that only "reference" it in passing. Entries
may use additional datasets alongside TransBorder. -->

# Existing Visualizations, Dashboards, and Analytical Tools Using BTS TransBorder Freight Data

**Research Date:** 2026-03-14

This document catalogs dashboards, visualizations, and analytical tools that directly analyze or visualize BTS TransBorder Freight Data. The goal is to identify design patterns, chart types, and interaction models that can inform and improve the Task 1.3 TransBorder Freight Dashboard.

---

## 1. OFFICIAL BTS / DOT TOOLS AND DASHBOARDS

### 1.1 BTS TransBorder Freight Data Landing Page & Dashboards (data.bts.gov)
- **Organization:** Bureau of Transportation Statistics (BTS), U.S. DOT
- **URL:** https://data.bts.gov/stories/s/TransBorder-Freight-Data/kijm-95mr/
- **Description:** The primary landing page for TransBorder Freight Data on the BTS open data platform (powered by Socrata/Tyler Technologies). Serves as a hub linking to three sub-dashboards (identified by Socrata story IDs: `myhq-rm6q`, `cd4n-nq6m`, `h73b-4dgk`). Provides interactive data on value and weight of shipments by mode of transportation, commodity, and U.S. port of entry/exit. Users can filter by country (Canada/Mexico), mode, commodity, port, and time period.
- **Data Used:** All TransBorder data elements -- mode, commodity (HS codes), port, state, value, weight
- **Interactive/Static:** Interactive (Socrata-based dashboards with filters, charts, maps)
- **Last Updated:** Continuously updated with monthly data releases (data available Jan 2006 to present, typically with 2-month lag)

### 1.2 BTS TransBorder Freight Forecast Dashboard
- **Organization:** BTS, U.S. DOT
- **URL:** https://data.bts.gov/stories/s/Forecast/h73b-4dgk
- **Description:** BTS has developed a model for projecting forecasts/nowcasts to address the 2-month data release lag in TransBorder freight data. This dashboard presents those projections to improve timeliness of critical transportation data.
- **Data Used:** TransBorder freight value data with forecast projections
- **Interactive/Static:** Interactive
- **Last Updated:** Ongoing with monthly releases

### 1.3 TranStats TransBorder Freight Query Tool
- **Organization:** BTS, U.S. DOT
- **URL:** https://www.transtats.bts.gov/Tables.asp?DB_ID=111
- **Description:** The TranStats data portal provides direct query access to TransBorder Freight data tables. The database includes two sets of tables: one commodity-based and another providing geographic detail. Users can create custom queries, select specific fields, filter by date ranges, and download raw data in various formats.
- **Data Used:** Full TransBorder database -- all fields including mode, commodity, port, state, value, weight, freight charges
- **Interactive/Static:** Interactive query tool (tabular output, downloadable)
- **Last Updated:** Monthly releases, data from Jan 2006 to present

### 1.4 BTS TransBorder Freight Data Main Page
- **Organization:** BTS, U.S. DOT
- **URL:** https://www.bts.gov/transborder
- **Description:** The main BTS webpage for the TransBorder Freight program. Provides access to data, documentation, codes/FAQs, monthly statistical releases, and links to dashboards and query tools.
- **Data Used:** All TransBorder data
- **Interactive/Static:** Portal/gateway page
- **Last Updated:** Ongoing

### 1.5 BTS Data Spotlights (TransBorder-related)
- **Organization:** BTS, U.S. DOT
- **URL:** https://www.bts.gov/data-spotlights
- **Description:** Individual static data stories published by BTS highlighting specific TransBorder freight trends. Notable spotlights include:
  - **"Transborder Trends: The Weight of Freight"** -- https://www.bts.gov/data-spotlight/transborder-trends-weight-freight
  - **"March 2025 Marks Record in Value of U.S. Freight with Canada and Mexico"** -- https://www.bts.gov/data-spotlight/march-2025-marks-record-value-us-freight-canada-and-mexico
  - **"North American Freight Data Reveals Growth in Unsung Trade Modes"** -- https://www.bts.gov/data-spotlight/north-american-freight-data-reveals-growth-unsung-trade-modes
  - **"BTS Data Reveals Long-term Trend Emerging in North American Freight Trucking"** -- https://www.bts.gov/data-spotlight/bts-data-reveals-long-term-trend-emerging-north-american-freight-trucking
  - **"Pandemic Alters Profile of U.S.-North America Trade and Border Crossings"** -- https://www.bts.gov/data-spotlight/pandemic-alters-profile-us-north-america-trade-and-border-crossings
  - **"TransBorder Data Mid-Year Report 2023"** -- https://www.bts.gov/data-spotlight/transborder-data-mid-year-report-2023
- **Data Used:** TransBorder freight data (value, weight, mode, port, commodity depending on spotlight)
- **Interactive/Static:** Static (individual stories with charts/graphs; not updated after publication)
- **Last Updated:** Various dates (2021-2025)

### 1.6 BTS TransBorder Freight Annual Reports
- **Organization:** BTS, U.S. DOT
- **URL (2025 report):** https://www.bts.gov/newsroom/transborder-freight-data-annual-report-2025-0
- **Description:** Annual summary reports with charts and tables on TransBorder freight trends. Published annually. Reports include breakdowns by mode, country, top ports, top commodities, and year-over-year changes.
- **Data Used:** Full TransBorder dataset summarized annually
- **Interactive/Static:** Static (PDF/web reports with charts)
- **Last Updated:** 2025 Annual Report is latest (covering 2025 data)

### 1.7 BTS Monthly TransBorder Statistical Releases (Press Releases)
- **Organization:** BTS, U.S. DOT
- **URL (example):** https://www.bts.gov/newsroom/north-american-transborder-freight-rose-84-march-2025-march-2024
- **Description:** Monthly press releases with summary charts showing month-over-month and year-over-year changes in TransBorder freight. Include breakdowns by mode and country.
- **Data Used:** Monthly TransBorder freight value and mode data
- **Interactive/Static:** Static (press release format with charts)
- **Last Updated:** Monthly

### 1.8 DOT National Transportation Data Hub -- TransBorder Freight Database
- **Organization:** U.S. DOT
- **URL:** https://datahub.transportation.gov/w/b9pq-w56f/default
- **Description:** The TransBorder Freight database hosted on the DOT's open data hub (data.transportation.gov), providing another access point for the data with built-in visualization capabilities.
- **Data Used:** Full TransBorder dataset
- **Interactive/Static:** Interactive (Socrata-based)
- **Last Updated:** Periodic

---

## 2. STATE DOT AND REGIONAL GOVERNMENT DASHBOARDS

### 2.1 TxDOT -- Border District Trade Transportation Report & Dashboard
- **Organization:** Texas Department of Transportation (TxDOT)
- **URL:** https://www.txdot.gov/projects/planning/international-trade-border-planning.html
- **Report:** https://ftp.dot.state.tx.us/pub/txdot/gov/trade-transportation-activities.pdf
- **Border Sheets:** https://www.txdot.gov/content/dam/docs/division/tpp/international-trade/border-sheets-combined.pdf
- **Description:** TxDOT maintains a Border District Trade Report Dashboard for navigating trade projects in three border districts. Includes port-specific fact sheets (Laredo, El Paso, Pharr, etc.) with freight value, truck crossing volumes, and commodity data. References BTS TransBorder Freight Data and Border Crossing Data as primary sources.
- **Data Used:** BTS TransBorder freight data, BTS Border Crossing data, CBP data
- **Interactive/Static:** Mix (dashboard is interactive; fact sheets are static PDFs)
- **Last Updated:** 2024-2025

### 2.2 TxDOT -- Texas-Mexico Border Transportation Master Plan (BTMP)
- **Organization:** TxDOT
- **URL:** https://www.txdot.gov/projects/planning/international-trade-border-planning/btmp.html
- **Description:** Binational, comprehensive, multimodal long-range transportation plan. Includes trade flow visualizations and maps showing freight corridors, port capacity, and infrastructure needs along the Texas-Mexico border.
- **Data Used:** BTS TransBorder data, Border Crossing data, and other sources
- **Interactive/Static:** Static (report/presentation format)
- **Last Updated:** 2025 update cycle

### 2.3 SANDAG -- Border Crossing and Trade Dashboard
- **Organization:** San Diego Association of Governments (SANDAG)
- **URL:** https://opendata.sandag.org/stories/s/Border-Crossing-and-Trade/adfp-wjae/
- **Description:** Interactive dashboard tracking flows of people, vehicles, and trade through the seven California-Baja California land ports of entry (San Ysidro, Otay Mesa, Tecate, Calexico, etc.). Visualizes four categories: individual crossings, POV crossings, commercial vehicle crossings, and bilateral trade value via truck. Data spans 2000 to present.
- **Data Used:** BTS TransBorder Freight Data (truck trade value) and BTS Border Crossing Data; sourced from CBP and Census
- **Interactive/Static:** Interactive (Socrata-based with temporal filters)
- **Last Updated:** Ongoing (data from 2000 to present)

### 2.4 Florida DOT -- BTS North American TransBorder Freight Data Summary
- **Organization:** Florida DOT
- **URL:** https://www.fdot.gov/docs/default-source/statistics/multimodaldata/multimodal/BTS-North-American-Transborder-Freight-Data.pdf
- **Description:** Summary document presenting BTS TransBorder freight data in context of Florida's multimodal transportation data program. Includes charts and tables summarizing national TransBorder freight trends.
- **Data Used:** BTS TransBorder freight data (national summary)
- **Interactive/Static:** Static (PDF)
- **Last Updated:** Publication date not confirmed

### 2.5 Virginia Open Data Portal -- TransBorder Freight Data
- **Organization:** Commonwealth of Virginia
- **URL:** https://data.virginia.gov/dataset/transborder-freight-data
- **Description:** Republication of BTS TransBorder Freight data on Virginia's open data portal.
- **Data Used:** BTS TransBorder freight data
- **Interactive/Static:** Interactive (open data portal format)
- **Last Updated:** Periodic sync with BTS data

---

## 3. ACADEMIC AND RESEARCH INSTITUTIONS

### 3.1 UTEP Hunt Institute for Global Competitiveness -- Border Data & Maps
- **Organization:** University of Texas at El Paso, Hunt Institute
- **URL:** https://www.utep.edu/hunt-institute/data/databases/
- **Maps:** https://www.utep.edu/hunt-institute/data/maps/
- **Description:** The Hunt Institute produces static and dynamic maps portraying trade routes and supply chains for the Paso del Norte region (El Paso, Las Cruces, Ciudad Juarez). Maintains databases including "Truck and Rail Imports from Mexico to Texas by Weight" and "Truck, Freight, Trade, Containers Border Crossing Data" for El Paso. Partnership with Wilson Center to produce supply chain maps.
- **Data Used:** DOT TransBorder data, CBP border crossing data, Census trade data
- **Interactive/Static:** Mix (interactive maps and static reports)
- **Last Updated:** Ongoing (institute founded 2014)

### 3.2 Manoel Vuu -- "Unpacking Cross-Border Freight" Data Analysis Project
- **Organization:** Independent data analyst (published on Medium, project on GitHub)
- **URL:** https://medium.com/@manoelvuu/transborder-freight-data-analysis-d9ec94a6c568
- **Description:** Analysis of 36 million rows of BTS TransBorder freight data (2020-2024) using dynamic visualizations (Treemaps, Line Charts). Examines cross-border freight patterns, proposes transportation optimization strategies. Uses Excel, SQL, and Power BI.
- **Data Used:** Full BTS TransBorder freight dataset (2020-2024)
- **Interactive/Static:** Static (Medium article with embedded visualizations)
- **Last Updated:** Published circa 2024

---

## 4. PRIVATE SECTOR AND CONSULTING

### 4.1 Gain Consulting -- North American TransBorder Freight Updates
- **Organization:** Gain Consulting LLC
- **URL:** https://www.gain.consulting/post/north-american-transborder-freight-update-november-2025-insights-from-bts-data
- **Description:** Regular analysis reports with visualizations of BTS TransBorder freight data. Provides strategic insights on supply chain optimization, risk assessments, corridor feasibility studies, and nearshoring advisory. Published monthly/periodically.
- **Data Used:** BTS TransBorder freight data -- value by mode, port, commodity
- **Interactive/Static:** Static (blog posts with charts)
- **Last Updated:** November 2025 (most recent found)

---

## 5. DATA ARCHIVE AND PRESERVATION

### 5.1 Data Rescue Project -- TransBorder Freight Program Data Dashboard
- **Organization:** Data Rescue Project
- **URL:** https://portal.datarescueproject.org/datasets/transborder-freight-program-data-dashbord/
- **Description:** Archived version of the BTS TransBorder Freight Data Dashboard, preserved as part of the Data Rescue Project's effort to safeguard government data.
- **Data Used:** BTS TransBorder freight data (archived)
- **Interactive/Static:** Archive reference
- **Last Updated:** Archive date varies

### 5.2 DataLumos (ICPSR) -- TransBorder Freight Program Data Dashboard
- **Organization:** ICPSR / DataLumos
- **URL:** https://www.datalumos.org/datalumos/project/239021
- **Description:** Archived in the ICPSR DataLumos archive, which safekeeps valuable government data resources.
- **Data Used:** BTS TransBorder freight data (archived)
- **Interactive/Static:** Archive
- **Last Updated:** Archive

---

## 6. THIS PROJECT -- UNT/TxDOT TASK 1.3 TEXAS-MEXICO BORDER DATABASE

### 6.1 TxDOT IAC Task 1.3 -- TransBorder Freight Dashboard (In Development)
- **Organization:** University of North Texas (UNT) for TxDOT IAC 2025-26
- **URL (prior version):** https://tiger-unt.github.io/Data-Dashboard-Boilerplate/#/border-ports
- **Description:** A comprehensive interactive web dashboard being developed as part of the TxDOT IAC Task 1 -- Bridges and Border Crossings Guide. The application will feature 8 dashboard pages with 9 D3 chart types, Leaflet-based port maps, and cascading filters. Covers three analytical layers: full U.S. dataset, U.S.-Mexico subset, and Texas-Mexico deep dive. Built on React 19, D3 7, Leaflet, Vite 7, and TailwindCSS 4. Design system cloned from the UNT Airport Connectivity Dashboard.
- **Data Used:** BTS TransBorder Freight Data (1993-2025), all modes, commodities, and ports
- **Interactive/Static:** Interactive (9 chart types, maps, filters, CSV/PNG export)
- **Status:** Planning complete (Phases 1-4 documented); implementation pending

---

## SUMMARY TABLE

| # | Tool/Dashboard | Organization | Interactive? | Status |
|---|---------------|-------------|-------------|--------|
| 1.1 | TransBorder Freight Dashboards (data.bts.gov) | BTS | Yes | Active |
| 1.2 | TransBorder Forecast Dashboard | BTS | Yes | Active |
| 1.3 | TranStats Query Tool | BTS | Yes | Active |
| 1.4 | TransBorder Main Page | BTS | Portal | Active |
| 1.5 | Data Spotlights (6+ TransBorder) | BTS | No | Active |
| 1.6 | Annual Reports | BTS | No | Active |
| 1.7 | Monthly Statistical Releases | BTS | No | Active |
| 1.8 | DOT Data Hub TransBorder | DOT | Yes | Active |
| 2.1 | TxDOT Border Trade Dashboard | TxDOT | Mixed | Active |
| 2.2 | TxDOT BTMP | TxDOT | No | Active |
| 2.3 | SANDAG Border Crossing & Trade | SANDAG | Yes | Active |
| 2.4 | Florida DOT TransBorder Summary | FDOT | No | Published |
| 2.5 | Virginia Open Data TransBorder | Virginia | Yes | Active |
| 3.1 | Hunt Institute Border Data | UTEP | Mixed | Active |
| 3.2 | Cross-Border Freight Analysis | Vuu (independent) | No | Published |
| 4.1 | TransBorder Freight Updates | Gain Consulting | No | Active |
| 5.1 | Data Rescue Archive | Data Rescue Project | No | Archive |
| 5.2 | DataLumos Archive | ICPSR | No | Archive |
| 6.1 | Task 1.3 TransBorder Dashboard | UNT/TxDOT | Yes | In Dev |

---

## KEY FINDINGS

1. **BTS itself is the dominant provider** of TransBorder data visualizations, with multiple interactive tools (Socrata dashboards, TranStats query tool, forecast dashboard, DOT Data Hub) plus 6+ static Data Spotlights and annual reports.

2. **No single comprehensive third-party dashboard** exists that fully replicates or enhances the BTS TransBorder tools. Most external users create point-in-time analyses rather than maintained dashboards.

3. **SANDAG** stands out as the most notable regional government entity with a maintained interactive dashboard that directly visualizes BTS TransBorder freight data.

4. **TxDOT** uses TransBorder data extensively but primarily in static report/factsheet format rather than a live interactive dashboard.

5. **Academic use** of TransBorder data for maintained, public-facing visualizations is limited. The UTEP Hunt Institute is the most notable academic institution with border-specific data tools.

6. **There is a clear gap** for a comprehensive, interactive, border-focused dashboard that directly visualizes TransBorder freight data with commodity detail, port-level analysis, and temporal trends -- which is what the Task 1.3 project aims to fill.
