# Web App Story: BTS TransBorder Freight Dashboard

> *What this document is:* A narrative description of the web app as it exists today — what it shows, what story it tells, and what could still be improved. Written so that someone who cannot see the screen could fully understand the dashboard's purpose, structure, and findings.
>
> *Last updated:* March 28, 2026 (comprehensive review against live code + full database audit)

---

## Part 1: What the Web App Tells You Today

### The Big Picture (Overview Page)

The dashboard opens with a large **hero banner** in a deep blue gradient with animated particle effects. The banner title reads "U.S. TransBorder Freight Data (1993--2025)" with a subtitle explaining this is the only public data source with port-level detail on North American trade. Embedded directly in the hero is an **interactive choropleth map** of the entire United States, Mexico, and Canada.

The map is the visual centerpiece of the landing page. It shows every border port of entry as a circle, sized by trade volume. The ports are color-coded into three groups:
- **Amber circles** = Texas-Mexico ports (the project's focus)
- **Blue circles** = Other Mexico-border ports (California, Arizona, New Mexico)
- **Green circles** = Canada-border ports

Behind the port bubbles, the map paints U.S. states, Mexican states, and Canadian provinces as **choropleths** — darker shading means more trade. A **year selector** at the top-left of the map lets you view any single year from 2007 to 2025. Clicking a state or port on the map highlights its trade connections: lines arc from states to their connected ports.

Below the map, a grouped section contains a **Trading Partner** dropdown (All / Mexico / Canada), a **Metric Toggle** (Value $ / Weight lb), and four **stat cards** for the selected year:
1. **Total Trade** — the headline number for all U.S. border freight
2. **Exports** — outbound value
3. **Imports** — inbound value
4. **Trade Balance** — with an up/down indicator showing surplus or deficit

Below the stats, a **Key Insights** section shows 2--4 auto-generated insight cards (from the insightEngine) highlighting noteworthy patterns in the data — things like which country or mode grew fastest.

The **Annual Trade Trends** section shows a **line chart** of exports vs. imports from 1993 to 2025. Each line is a different color. Historical event annotations mark the **2008 Financial Crisis** and **COVID-19** as shaded bands on the chart. A year-range slider and country dropdown sit in the chart header, letting users zoom into any time window or filter to Mexico-only or Canada-only.

The **Trade Composition** section has two charts side by side:
- A **donut chart** showing the mode split for the latest year (truck, rail, pipeline, vessel, air, etc.) with a country dropdown
- A **stacked bar chart** showing Canada vs. Mexico trade share by year, with its own year-range slider

At the bottom, two **navigation cards** invite you deeper: "U.S.--Mexico Trade" (all border states) and "Texas--Mexico Trade" (regional deep dive). A **Data Source** footer explains where the numbers come from and links to the BTS website and the About page.

*The story being told:* "U.S. border trade has grown enormously over three decades, and Texas is the dominant gateway."

---

### U.S.--Mexico Trade (National View)

This page focuses on all trade between the U.S. and Mexico across all border states. It opens with a **hero banner** and **five stat cards**: Total Trade, Exports, Imports, Texas Share, and Active Ports. The Texas Share stat consistently shows ~65--66%, meaning nearly two-thirds of all U.S.--Mexico trade flows through Texas. A YoY percentage change appears on the Total Trade card.

The page has a **collapsible filter sidebar** on the right with: Metric Toggle, Year (multi-select), Trade Type (single-select, "Export" disabled when metric=weight), and Mode (multi-select). Additional filters appear depending on which tab is active. Active filter tags show at the top with a "Reset all" button.

The page has **four tabs**: Ports, Commodities, States, and Trade Flows.

#### Tab 1: Ports — *Where Trade Happens*

Opens with a narrative paragraph: *"U.S.--Mexico surface freight trade exceeded $840 billion in 2024... Roughly 66% of this trade flows through Texas border ports, with Laredo alone handling more freight than any other land port on either the Mexican or Canadian border."*

**Three InsightCallouts:**
1. Texas handles as much U.S.-Mexico trade as all other border states combined (Texas ~66%, CA+AZ+NM ~34%)
2. Truck moves ~80% of U.S.--Mexico surface freight — remarkably stable since 2007
3. The U.S. trade deficit with Mexico has grown from -$74B in 2007 to over -$190B in 2024 (warning callout)

**Seven charts:**
1. **Port Map** — bubble map of U.S.--Mexico border ports sized by trade
2. **Line Chart** — "U.S.-Mexico Trade Trends" (exports vs imports) with year-range slider and historical annotations (2008 crisis, COVID)
3. **Line Chart** — "U.S.--Mexico Trade Balance" showing the widening deficit as an area chart
4. **Donut Chart** — "Trade by Mode" for the latest year
5. **Stacked Bar Chart** — "Mode Composition by Year" with year-range slider
6. **Bar Chart** — "Top N Ports" (horizontal ranking, default top 20) with top-N selector
7. **Line Chart** — "Top N Port Trends" (multi-series, default top 5) with top-N and year-range selectors
8. **Data Table** — sortable table with Port, State, Total Trade, Exports, Imports, Weight

**Sidebar filters for this tab:** Year, Trade Type, Mode, State, Port

*The story being told:* "U.S.--Mexico trade is geographically concentrated in a handful of ports, with Laredo handling more trade than any other port on either border."

#### Tab 2: Commodities — *What Crosses the Border*

Opens with: *"U.S.--Mexico trade is dominated by manufactured goods — this is a manufacturing partnership, not just a raw-materials exchange. Machinery & Electrical Equipment and Transportation Equipment together account for more than half of all cross-border freight value..."*

**Two InsightCallouts:**
1. U.S.--Mexico trade isn't simple buying and selling — it's a cross-border assembly line (parts south, finished goods north)
2. Energy products (Mineral Fuels) are heavily export-dominated — the U.S. supplies petroleum and natural gas to Mexico at a 26:1 export ratio

**Four charts:**
1. **Treemap** — "Commodity Groups" with click-to-drill into HS 2-digit codes within each group
2. **Bar Chart** — "Top N Commodities" (default top 10) with top-N selector
3. **Diverging Bar Chart** — "Cross-Border Manufacturing Pattern" showing imports (left) vs exports (right) per commodity group (default top 12)
4. **Line Chart** — "Top N Commodity Group Trends" (default top 5) with year-range slider
5. **Data Table** — Year, HS Code, Commodity, Group, Trade Type, Trade Value, Weight

**Sidebar filters:** Year, Trade Type, Mode, Commodity Group, Commodity

*The story being told:* "U.S.--Mexico trade is dominated by manufactured goods — this is a manufacturing partnership, not just a raw-materials exchange."

#### Tab 3: States — *Who's Trading*

Opens with: *"Trade with Mexico reaches far beyond the border. On the U.S. side, Texas is the dominant origin and destination, but Michigan (auto parts), California (electronics, agriculture), and Illinois (machinery) are major players. On the Mexican side, Chihuahua, Nuevo Leon, and the emerging Bajio corridor drive the flows."*

**One InsightCallout:**
1. 38 of 50 U.S. states have Mexico as a top-3 trading partner

**Ten charts:**
1. **Choropleth Map** — U.S. states colored by trade with Mexico
2. **Choropleth Map** — Mexican states colored by trade with U.S.
3. **Bar Chart** — "Top N U.S. States" (default 15)
4. **Bar Chart** — "Top N Mexican States" (default 15)
5. **Line Chart** — "Top N U.S. State Trends" (default 5)
6. **Line Chart** — "Top N Mexican State Trends" (default 5)
7. **Bar Chart** — "Fastest-Growing U.S. States" (growth %, default 15, conditional)
8. **Bar Chart** — "Fastest-Growing Mexican States" (growth %, default 15, conditional)
9. **Data Table** — U.S. State Detail
10. **Data Table** — Mexican State Detail

**Sidebar filters:** Year, Trade Type, Mode, U.S. State, Mexican State

*The story being told:* "Trade with Mexico isn't just a border phenomenon — it reaches deep into both countries, with manufacturing states dominating on both sides."

#### Tab 4: Trade Flows — *How Trade Routes Through the Border*

Opens with: *"Trade between the U.S. and Mexico flows through specific corridors built over decades. The Texas--Nuevo Leon corridor via Laredo is the single largest trade relationship..."*

Note displayed: *"Origin-destination data is available for exports only — BTS does not record the Mexican state of origin for imports."*

**Four charts:**
1. **Trade Flow Choropleth** — interactive map with animated flow arcs, year animation controls
2. **Bar Chart** — "Top Trading Partners" (bilateral US State <-> MX State pairs, default 15)
3. **Sankey Diagram** — "Trade Routes" (U.S. State -> Port -> Mexican State, top 10 each)
4. **Heatmap Table** — "Trade Matrix" (U.S. states as rows, Mexican states as columns, top 20 each)

**No InsightCallouts on this tab.**

**Sidebar filters:** Year, Trade Type, Mode, Port, U.S. State, Mexican State

*The story being told:* "Trade flows through specific corridors — Texas-to-Nuevo Leon via Laredo, Michigan parts flowing to Chihuahua assembly plants."

---

### Texas--Mexico Trade (Regional Deep Dive)

This is the heart of the dashboard. It opens with a hero banner: "Texas--Mexico Surface Freight Trade" and five stat cards: Total TX-MX Trade, Exports, Imports, Active Ports, and Top Mode. The stat cards include YoY change on Total Trade.

The page has the same collapsible filter sidebar pattern. The page has **four tabs**: Ports, Commodities, States, and Trade Flows.

#### Tab 1: Ports — *Texas's Border Gateways*

Opens with: *"Texas's 14 border ports of entry are the backbone of U.S.--Mexico trade, handling roughly two-thirds of all freight crossing the border. Three port clusters — Laredo (central), El Paso/Ysleta (west), and Hidalgo/Pharr (east) — account for over 85% of that total. Laredo alone processes nearly 60% of all Texas--Mexico trade, making it the single busiest international freight gateway in the Western Hemisphere."*

**Five InsightCallouts:**
1. Laredo handles more trade than the next 5 Texas ports combined — over $330B annually
2. Truck carries ~83% of Texas-Mexico trade by value, with rail handling most of the remainder
3. Texas's trade deficit with Mexico has widened from -$30B in 2007 to over -$125B in 2024 (warning)
4. Laredo's share has grown from 52% in 2007 to nearly 60% in 2024 — a single day of disruption delays ~$900M in freight (warning)
5. Trade plunged 49% in April 2020, but within four months Texas-Mexico trade had fully rebounded

**Twelve charts (the most of any tab):**
1. **Port Map** — Texas-Mexico border with port bubbles in three color-coded regions (El Paso, Laredo, Pharr/RGV)
2. **Line Chart** — "TX-MX Trade Trends" (exports vs imports) with year-range slider and annotations
3. **Donut Chart** — "Trade by Mode" for latest year
4. **Line Chart** — "Trade Balance Trend" showing widening deficit
5. **Bar Chart** — "Port Ranking" (default top 15)
6. **Line Chart** — "Laredo's Share of TX-MX Trade" (% over time)
7. **Line Chart** — "Top N Port Trends" (default top 5)
8. **Stacked Bar Chart** — "Mode Composition by Year"
9. **Line Chart** — "COVID-19 Impact & Recovery" (monthly zoom, 2019--2021, conditional on monthly data loading)
10. **Line Chart** — "Monthly Trade Trends" (continuous monthly series)
11. **Stacked Bar Chart** — "Seasonal Patterns" (by calendar month, stacked by year)
12. **Data Table** — Year, Port, Region, Mode, Trade Type, Trade Value, Weight

**Sidebar filters:** Year, Trade Type, Mode, Region (single-select), Port

*The story being told:* "Texas's trade with Mexico is concentrated in Laredo, runs on trucks, and has grown from $211B (2007) to over $600B (2025)."

#### Tab 2: Commodities — *What Flows Through Texas*

Opens with: *"What crosses the Texas--Mexico border tells the story of an integrated manufacturing economy. Machinery and vehicle parts flow south to Mexican assembly plants; finished vehicles, electronics, and consumer goods flow north. Meanwhile, Texas sends energy products south via pipeline and imports fresh produce from Mexican farms. This isn't simple buying and selling — it's a cross-border assembly line."*

**Four InsightCallouts:**
1. Energy is Texas's biggest export to Mexico — nearly all pipeline trade is petroleum/natural gas, over $12B/year
2. Transportation Equipment has a 3.9:1 import ratio — $67B in parts south, $259B in finished vehicles north
3. Chemicals (73% exports) and Plastics (67% exports) flow predominantly south — manufacturing inputs heading to Mexican factories
4. Texas's 14 border ports are not interchangeable — Laredo/Ysleta dominate manufacturing, Pharr/Progreso/Roma are agricultural, Presidio is cattle

**Seven charts:**
1. **Treemap** — "Commodity Groups" with drill-down to HS 2-digit codes
2. **Bar Chart** — "Top N Commodities" (default top 10)
3. **Diverging Bar Chart** — "Cross-Border Manufacturing Pattern" (default top 12)
4. **Line Chart** — "Top N Commodity Group Trends" (default top 5) with year-range slider
5. **Bar Chart Race** — "Commodity Rankings Over Time" with play/pause, skip controls, and year slider (animated from 2007 to present)
6. **Stacked Bar Chart** — "Port Specialization" showing top 5 commodity groups broken down by port (top 10 ports)
7. **Data Table** — Year, HS Code, Commodity, Group, Port, Trade Type, Trade Value, Weight

**Sidebar filters:** Year, Trade Type, Mode, Commodity Group, Commodity, Port

*The story being told:* "Texas ports handle the nation's manufacturing trade AND are uniquely important for energy exports and fresh produce imports."

#### Tab 3: States — *Mexico's Trading Partners Through Texas*

Opens with: *"Each Texas port serves specific Mexican states, creating distinct trade corridors along the border. Chihuahua trades primarily through El Paso/Ysleta, Nuevo Leon routes through Laredo, and Tamaulipas connects via Pharr and Brownsville. Beyond these traditional border partners, Mexico's emerging Bajio corridor (Queretaro, San Luis Potosi, Guanajuato) is growing rapidly — and Texas ports remain the gateway."*

Note: *"Mexican state data is available for exports only."*

**Three InsightCallouts:**
1. Mexico's manufacturing base is expanding south into the Bajio corridor
2. Each Texas port serves specific Mexican states, creating distinct trade corridors
3. Queretaro (5.5x growth), San Luis Potosi (4.5x), Aguascalientes — all surging

**Six charts:**
1. **Interactive Flow Map** — Mexican states choropleth with port bubbles overlaid; click a state or port to see connections
2. **Sankey Diagram** — "Port--State Trade Flows" (ports -> Mexican states, top 10 each)
3. **Bar Chart** — "Top N Mexican States" (default 15)
4. **Data Table** — Mexican State Detail
5. **Bar Chart** — "Fastest-Growing Mexican States" (growth %, default 15, conditional)
6. **Line Chart** — "Top N State Trends" (default 5) with year-range slider

**Sidebar filters:** Year, Trade Type, Mode, Mexican State

*The story being told:* "Each Texas port serves specific Mexican states, creating distinct trade corridors along the border."

#### Tab 4: Trade Flows — *Origin-Destination Connections*

Opens with: *"This tab reveals the specific corridors that define Texas--Mexico trade. Laredo connects Monterrey's industrial base to the U.S. heartland. El Paso/Ysleta links Juarez's maquiladoras to American markets."*

Note: *"Origin-destination data is available for exports only."*

**One InsightCallout:**
1. Trade routes through Texas ports are not interchangeable — each corridor serves specific industries and supply chains

**Four charts:**
1. **Trade Flow Choropleth** — interactive map with year dropdown selector
2. **Bar Chart** — "Top Trading Partners" (bilateral pairs, default 15)
3. **Sankey Diagram** — "Trade Routes" (U.S. State -> Port -> Mexican State)
4. **Heatmap Table** — "Trade Matrix" (U.S. states vs. Mexican states, top 20 each)

**Sidebar filters:** Year, Trade Type, Mode, Port, Mexican State

*The story being told:* "Texas ports are not interchangeable — they serve specific origin-destination corridors."

---

### About Page — *Methodology and Context*

A documentation page with a sticky quick-jump navigation bar across the top linking to seven sections:

1. **Data Source** — Explains BTS TransBorder, U.S. Customs origin, monthly publication
2. **Data Coverage** — April 1993 through 2025, 37.5M+ records, 3 core tables
3. **Year Range Strategy** — Why most pages show 2007+ (schema consolidation in January 2007)
4. **BTS Terminology** — HS codes, trade types, modes, ports explained in plain English
5. **Known Limitations** — Weight not reported for most export modes, port history changes
6. **Port History** — Ysleta/El Paso split, port code changes over time
7. **Downloads** — Links to raw BTS data

---

## Part 2: Stories Now Told (Implemented)

### 2.1 The Widening Trade Deficit -- SHOWN
Trade Balance Trend charts on both TX-MX and US-MX Ports tabs. The deficit grew from -$30B to -$125B (TX-MX) and -$74B to -$190B (US-MX).

### 2.2 The Maquiladora / Cross-Border Manufacturing Pattern -- SHOWN
DivergingBarChart on both Commodities tabs showing which commodity groups flow south (chemicals, plastics = inputs) vs. north (vehicles, electronics = finished goods).

### 2.3 The Laredo Concentration Risk -- SHOWN
Dedicated "Laredo's Share" line chart on TX-MX Ports tab, growing from 52% to ~60%, with InsightCallout about $900M/day disruption risk.

### 2.4 The COVID Resilience Story -- SHOWN
Monthly zoom panel on TX-MX Ports tab (2019--2021) showing the 49% single-month plunge and four-month full recovery.

### 2.5 The Mexican Industrial Corridor Shift -- SHOWN
"Fastest-Growing Mexican States" bar charts on both States tabs, highlighting Bajio corridor (Queretaro 5.5x, San Luis Potosi 4.5x).

### 2.6 Narrative Voice -- ADDED
Every tab has: a narrative intro paragraph, 2--5 InsightCallouts, and historical annotations (2008 crisis, COVID) on all line charts.

### 2.7 Animated Commodity Rankings -- SHOWN
Bar chart race on TX-MX Commodities tab with play/pause, skip, and year slider controls.

### 2.8 Port Specialization -- PARTIALLY SHOWN
"Port Specialization" stacked bar chart on TX-MX Commodities tab showing top 5 commodity groups by port.

---

## Part 3: New Stories the Database Can Tell (Not Currently Shown)

These stories exist in the full `transborder.db` database but are not yet visualized in the dashboard.

### 3.1 The Energy Export Story
**What the database shows:** Pipeline trade is 100% Mineral Products and almost entirely one-directional: **$44.5B in exports vs $0.3B in imports** (2020--2024). Texas is Mexico's energy lifeline. The pipeline mode grew 470% ($1.0B in 2007 to $5.7B in 2024). When truck and rail petroleum shipments are added, total Texas-to-Mexico energy exports are much larger.

**Why it matters:** The energy relationship is strategically significant and often misunderstood. The current dashboard mentions energy in a callout but has no dedicated visualization isolating pipeline/energy flows.

**What's needed:** No new data extraction — the data is already in `texas_mexico_commodities` (filter to Pipeline mode + Mineral Products). Add a dedicated energy flow visualization or expanded callout.

### 3.2 Freight Charges — The Cost of Shipping
**What the database shows:** The `FreightCharges` column exists in all three database tables. Mexico freight charges grew from $2.1B (2007) to $4.1B (2024) — nearly doubling. The data is already extracted in `texas_mexico_ports` and `us_mexico_ports`, but **no chart in the entire dashboard uses FreightCharges**.

**Why it matters:** Shipping cost trends add a logistics dimension to the trade story. Rising freight costs can signal congestion, infrastructure bottlenecks, or modal shifts. This is especially relevant for policy discussions about border infrastructure investment.

**What's needed:** No new extraction. Add a freight charges trend line or overlay to existing charts.

### 3.3 Foreign Trade Zone (FTZ) Explosion
**What the database shows:** FTZ mode trade with Mexico grew from $0.8B (2007) to $6.6B (2024) — an **8x increase**, the fastest growth rate of any mode. FTZs allow goods to enter the U.S. for assembly/processing without paying duties until they leave the zone.

**Why it matters:** FTZ growth reflects the deepening of cross-border manufacturing integration. It's a "stealth story" hidden inside the mode breakdown donut chart.

**What's needed:** No new extraction. Add an InsightCallout or small highlight chart calling out FTZ growth.

### 3.4 Seasonal Commodity Patterns
**What the database shows:** Strong seasonal patterns exist at the commodity level. For example, vegetable imports (HS 07) from Mexico peak in winter months (January: $1.2B, February: $1.2B) and drop in summer (July: $0.6B) — a 2:1 ratio. This reflects the U.S. dependence on Mexican produce during the off-season.

**Why it matters:** Seasonal patterns tell the story of agricultural dependence and help explain why certain ports (Pharr, Progreso) are busiest in winter. The current monthly charts show total trade seasonality but not commodity-level patterns.

**What's needed:** **New extraction required** — a `monthly_commodity_trends` dataset from dot2 or dot3, aggregated by Year/Month/CommodityGroup/Mode/TradeType, filtered to Mexico and 2007+. Estimated ~10K--30K rows.

### 3.5 Fastest-Growing Trade Corridors
**What the database shows:** The origin-destination flow data (already extracted in `texas_od_state_flows` and `od_state_flows`) contains the building blocks, but no visualization shows which specific U.S.-state-to-Mexican-state corridors have grown fastest or declined over time.

**Why it matters:** A "fastest corridors" chart would complement the existing Sankey and heatmap by adding a temporal dimension — showing which trade relationships are surging (e.g., Michigan-to-Queretaro for auto) and which are fading.

**What's needed:** No new extraction — compute growth rates from existing OD flow data on the frontend.

### 3.6 Trade Balance by Commodity Group
**What the database shows:** The diverging bar chart shows import/export direction, but not the actual dollar deficit or surplus per commodity group over time. Some groups have massive, growing deficits (Transportation Equipment), while others are strongly surplus-positive (Mineral Products/energy).

**Why it matters:** Breaking the trade deficit into commodity-level components sharpens the maquiladora story. It answers: "Where exactly is the deficit coming from?"

**What's needed:** No new extraction — compute from existing commodity datasets.

### 3.7 Port Concentration Index (HHI)
**What the database shows:** Beyond Laredo's share, a Herfindahl-Hirschman Index across all Texas ports would quantify whether trade is becoming more or less concentrated. If HHI is rising, the system is becoming more fragile.

**What's needed:** No new extraction — compute from `texas_mexico_ports`.

### 3.8 Rail-vs-Truck by Commodity
**What the database shows:** The overall truck/rail split looks stable at ~80/20, but the existing commodity data (which includes Mode) shows rail losing manufactured goods to truck while gaining bulk mineral share.

**What's needed:** No new extraction — already in commodity datasets with Mode column. Add a mode-by-commodity stacked bar or small multiples chart.

### 3.9 Weight-vs-Value Bubble Chart (Two Economies)
**What the database shows:** Dramatic value-per-kilogram spread across commodity groups (imports, where weight is reliable):
- Precious Metals: ~$1,000,000/kg
- Optical/Medical: ~$34,000/kg
- Machinery: ~$14,000/kg
- Mineral Products: ~$300/kg
- Stone/Ceramic: ~$900/kg

**Why it matters:** This reveals the "two economies" crossing the border — heavy bulk goods vs. lightweight precision goods — and explains why truck dominates (high-value, time-sensitive) and why weight data tells a completely different story than dollar values.

**What's needed:** No new extraction. The **ScatterPlot** chart component already exists in the codebase (built but unused). Use it for this purpose.

### 3.10 Unused Database Columns
Two columns in the database are completely untapped:
- **DF** (Domestic/Foreign indicator): Values 1, 2, or NULL. Could show what share of trade is domestic-origin vs. foreign-origin goods.
- **ContCode** (Containerization code): Values 0, 1, X, or NULL. Could indicate containerized vs. non-containerized freight.

These may be too niche for the main dashboard but are worth noting as available dimensions.

---

## Part 4: Storytelling Improvement Recommendations

### 4.1 Add Story Summary Banners
Each page's hero section currently has a title and date range but no insight sentence. Add a one-line summary of the key takeaway before any charts:
- Overview: *"U.S. border trade has grown 5x since NAFTA began — and Texas handles two-thirds of the Mexico side."*
- US-Mexico: *"The U.S. and Mexico trade $840B+ annually — more than most countries' entire GDP."*
- TX-Mexico: *"Texas handles two-thirds of all U.S.-Mexico trade — over $600 billion in 2025 — making it the single most important trade gateway on the continent."*

### 4.2 Add Milestone Annotations on Trend Charts
Current annotations: 2008 Financial Crisis, COVID-19. Add:
- NAFTA Implementation (1994)
- NAFTA Fully Phased In (2008)
- USMCA Takes Effect (2020) — currently listed in code but only on some charts
- TX-MX Trade Milestones: $200B, $400B, $600B markers on the trend line

### 4.3 Add Contextual Dollar Comparisons
People struggle to grasp billions. Add InsightCallouts with comparisons:
- *"TX-MX trade ($601B in 2025) exceeds the GDP of Sweden, Poland, or Thailand."*
- *"Laredo processes ~$900M per day — more than the annual city budget of Houston."*
- *"A single day's disruption at Laredo equals the total annual trade of the Port of Presidio."*

### 4.4 Improve the About Page
Add a "How to Read This Dashboard" section for non-expert users:
- What "HS 2-digit codes" mean in plain English
- What "Trade Value" represents (customs declaration value, not retail price)
- Why export weight shows "N/A" (BTS doesn't collect it for most surface modes)
- What "mode" means and how to interpret the mode donut chart

### 4.5 Visual Improvements
- Use the **LollipopChart** component (already built, unused) for growth rate comparisons — visually distinct from the regular bar charts used for rankings
- Consider **sparklines in stat cards** — a tiny 5-year trend line next to the headline number would add temporal context without scrolling
- The **BoxPlotChart** component also exists unused — could show distribution of port trade values or seasonal spreads

### 4.6 Guided Tour Mode (Longer-Term)
A "Key Findings" toggle at the top of each page that, when activated, scrolls the user through the 5--6 most important charts with overlay explanation boxes. This serves users who want to be *told* the story rather than explore it. Start simple: a button that scrolls to each InsightCallout in sequence.

---

## Part 5: Filter Recommendations by Page/Tab

### Current Filter Architecture
Every page except Overview uses a collapsible right sidebar with: Metric Toggle, Year (multi-select), Trade Type (single-select), Mode (multi-select), plus tab-specific filters. All filters are cross-filtered — each filter's available options update based on all other active filter selections.

### Recommended Additions

| Page/Tab | Filter to Add | Type | Why |
|---|---|---|---|
| **Overview** | Mode | Multi-select | Let users isolate truck-only or pipeline-only trends on the Overview without navigating to a detail page |
| **Overview** | Trade Type | Single-select | See exports-only or imports-only on the landing page |
| **US-MX Ports** | Border Region | Multi-select | Quick grouping: "Texas", "California", "Arizona", "New Mexico" above the Port filter |
| **TX-MX Ports** | Region: change to multi-select | Multi-select (currently single) | Compare two regions side by side (e.g., El Paso + Laredo) |
| **TX-MX Commodities** | Region | Single-select | Filter to "all Laredo-region ports" in one click instead of selecting individual ports |
| **TX-MX States** | Port | Multi-select | Answer "which Mexican states trade through Laredo?" — currently only MexState filter exists |
| **TX-MX States** | Region | Single-select | Convenience grouping above the Port filter |
| **TX-MX Trade Flows** | U.S. State | Multi-select | Filter to "show me flows from Michigan through Texas ports" to see the automotive corridor |
| **TX-MX Trade Flows** | Region | Single-select | Convenience grouping above Port |

**No changes needed:** US-MX Commodities, US-MX States, US-MX Trade Flows — these tabs are already well-filtered.

---

## Part 6: Data Pipeline Changes Required

### Current Pipeline
`05_build_outputs.py` extracts 13 datasets. Most new stories can be built from existing extractions via frontend calculations.

### One New Extraction Needed

**`monthly_commodity_trends`** — For seasonal commodity analysis (Story 3.4):
- Source: `dot2_state_commodity` or `dot3_port_commodity`
- Aggregation: Year, Month, CommodityGroup, Mode, TradeType
- Filter: Country = Mexico, Year >= 2007
- Estimated size: 10K--30K rows, under 1 MB JSON
- Add to `05_build_outputs.py` as a new `build_monthly_commodity_trends()` function

### Stories Achievable Without Pipeline Changes

| Story | Existing Dataset | Compute On Frontend |
|---|---|---|
| Energy Export | `texas_mexico_commodities` | Filter Mode=Pipeline + CommodityGroup=Mineral Products |
| Freight Charges | `texas_mexico_ports`, `us_mexico_ports` | Sum FreightCharges by year |
| FTZ Growth | `us_transborder`, port-level datasets | Filter Mode=FTZ, aggregate by year |
| Fastest Corridors | `texas_od_state_flows`, `od_state_flows` | Compute growth rates |
| Trade Balance by Commodity | `texas_mexico_commodities`, `commodity_detail` | Exports - Imports per group per year |
| Port Concentration (HHI) | `texas_mexico_ports` | Sum of squared port shares |
| Rail-vs-Truck by Commodity | `texas_mexico_commodities` | Group by Mode + CommodityGroup |
| Weight-vs-Value Bubble | `commodity_detail`, `texas_mexico_commodities` | Value / Weight per group |

---

## Part 7: Implementation Summary

### Component Inventory (current state)
- **54 charts** across 8 tabs + Overview page
- **20 InsightCallouts** with narrative findings
- **10 data tables** with sortable columns
- **8 narrative intro paragraphs** (one per tab)
- **16 historical annotations** (2008 crisis + COVID on all applicable charts)
- **12 chart types** in the component library (3 unused: ScatterPlot, LollipopChart, BoxPlotChart)
- **13 extracted datasets** loaded on demand

### What Could Still Be Added (Priority Order)
1. **Energy export visualization** — high impact, no pipeline changes
2. **Freight charges trend** — novel dimension, no pipeline changes
3. **FTZ growth callout** — quick win, just an InsightCallout
4. **Trade balance by commodity** — sharpens the deficit story
5. **Weight-vs-value bubble chart** — uses existing unused ScatterPlot component
6. **Rail-vs-truck by commodity** — reveals hidden mode competition
7. **Filter additions** — better drill-down across all pages
8. **Monthly commodity extraction + seasonal analysis** — needs pipeline change
9. **Fastest-growing corridors** — temporal dimension for flow analysis
10. **Story summary banners + milestone annotations** — storytelling polish
11. **Guided tour mode** — largest effort, lowest priority

### The Bottom Line

The dashboard has evolved from a data exploration tool into a data storytelling platform. Every tab has narrative framing, key findings are called out alongside visualizations, and historical context is woven into every time series. The core story — **Texas as the gateway, manufacturing integration as the engine, and Laredo as the linchpin** — is clearly told.

The remaining opportunities (energy deep dive, freight charges, FTZ growth, seasonal commodity patterns, weight-vs-value) are refinements that would strengthen specific angles of the story. Most require no data pipeline changes — they can be built from data that is already extracted but not yet visualized.
