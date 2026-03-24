# Web App Story: BTS TransBorder Freight Dashboard

> *What this document is:* A narrative description of the web app as it exists today — what it shows, what story it tells, and what could still be improved. Written so that someone who cannot see the screen could fully understand the dashboard's purpose, structure, and findings.
>
> *Last updated:* March 2026 (after the storytelling enhancement sprint)

---

## Part 1: What the Web App Tells You Today

### The Big Picture (Overview Page)

The dashboard opens with a panoramic view of **U.S. TransBorder freight data from 1993 to 2025** — thirty-two years of goods crossing America's land borders with Mexico and Canada. The page greets you with a hero banner and four large stat cards showing the latest year's total trade, exports, imports, and trade balance for the entire U.S. border.

Below the stats, an **interactive map of the United States** shows every border port of entry as a circle. Bigger circles mean more trade. Texas ports glow amber — they are highlighted because they are the focus of this project. Other Mexico-border ports (California, Arizona, New Mexico) appear in blue. Canada-border ports appear in green. Even at a glance, the amber circles along Texas are enormous compared to everything else, silently arguing that Texas *is* the U.S.–Mexico trade story.

A **line chart** traces annual exports and imports from 1993 to 2025. You can see the story of NAFTA's early acceleration in the late 1990s, the 2009 Great Recession dip, steady growth through the 2010s, the sharp COVID notch in 2020, and then a steep climb to record highs. A **donut chart** shows the mode split (truck, rail, pipeline) for the latest year, and a **stacked bar** shows the Canada-vs-Mexico trade share over time — Mexico's share has been steadily growing.

At the bottom, two navigation cards invite you deeper: **"U.S.–Mexico Trade"** for the national view, and **"Texas–Mexico Trade"** for the regional deep dive.

*The story being told:* "U.S. border trade has grown enormously over three decades, and Texas is the dominant gateway."

---

### U.S.–Mexico Trade (National View)

This page focuses on all trade between the U.S. and Mexico across all border states (Texas, California, Arizona, New Mexico). It has four tabs.

#### Tab 1: Ports — *Where Trade Happens*

Five stat cards sit atop the page: Total Trade, Exports, Imports, Texas Share, and Active Ports. The Texas Share stat is telling — it consistently shows around **65–66%**, meaning nearly two-thirds of all U.S.–Mexico trade flows through Texas.

A **map** shows U.S.–Mexico border ports sized by trade volume. Laredo's circle dominates the Texas border. A **line chart** shows annual export and import trends with a COVID-19 annotation marking the 2020 disruption. Two charts sit side by side: a **donut** showing truck's ~80% mode dominance and a **stacked bar** showing mode composition year over year (truck, rail, pipeline — remarkably stable). A **horizontal bar chart** ranks the top 20 ports — Laredo sits alone at the top, followed by El Paso (Ysleta), then Detroit and Buffalo on the Canada border. Below that, a **multi-line chart** tracks the top 5 ports' trade over time, and a **sortable table** provides exact figures.

*The story being told:* "U.S.–Mexico trade is geographically concentrated in a handful of ports, with Laredo handling more trade than any other port on either border."

#### Tab 2: Commodities — *What Crosses the Border*

A **treemap** fills the screen with colored rectangles representing commodity groups. The biggest rectangle — by far — is **Machinery & Electrical Equipment**, reflecting the deep cross-border manufacturing integration (electronics, appliances, industrial machinery). **Transportation Equipment** (vehicles and parts) is the second-largest block. You can click any group to drill down into individual HS codes within it.

A **bar chart** ranks the top 10 commodities, and a **line chart** tracks the top 5 commodity groups over time, showing how machinery and vehicles have pulled away from everything else. A **detail table** lets you explore exact figures by year, HS code, and trade type.

*The story being told:* "U.S.–Mexico trade is dominated by manufactured goods — this is a manufacturing partnership, not just a raw-materials exchange."

#### Tab 3: States — *Who's Trading*

Two **choropleth maps** appear side by side. The left map colors U.S. states by their trade with Mexico — Texas is the darkest (most trade), followed by Michigan, California, and Illinois. The right map colors Mexican states — Estado de México, Chihuahua, and Nuevo León are the darkest. Below the maps, **bar charts** rank the top 15 U.S. and Mexican states, and **line charts** track the top 5 over time.

*The story being told:* "Trade with Mexico isn't just a border phenomenon — it reaches deep into both countries, with manufacturing states dominating on both sides."

#### Tab 4: Trade Flows — *How Trade Routes Through the Border*

A **Sankey diagram** shows the flow: U.S. states on the left feed into border ports in the middle, which connect to Mexican states on the right. The ribbons' thickness represents trade volume. A **heatmap matrix** shows the full origin-destination table of U.S. state × Mexican state trade pairs.

*The story being told:* "Trade flows through specific corridors — Texas-to-Nuevo León via Laredo, Michigan parts flowing to Chihuahua assembly plants, California produce to Mexico City."

---

### Texas–Mexico Trade (Regional Deep Dive)

This is the heart of the dashboard. It focuses exclusively on the 14 Texas border ports and their trade with Mexico. Five stat cards: Total TX-MX Trade, Exports, Imports, Active Ports, Top Mode.

#### Tab 1: Ports — *Texas's Border Gateways*

A **map** zooms into the Texas-Mexico border showing port bubbles in three color-coded regions: **El Paso** (west), **Laredo** (central), and **Pharr/Rio Grande Valley** (east). Laredo's bubble dwarfs the rest.

A **line chart** shows Texas-Mexico trade trends. Two charts show the mode split. A **bar chart** ranks all Texas ports. Where monthly data is available, a **monthly trend line** and **seasonal pattern chart** appear, showing that trade is fairly consistent year-round with a slight dip in January/February and a peak in October.

A **detail table** includes port, region, mode, trade type, value, and weight for granular analysis.

*The story being told:* "Texas's trade with Mexico is concentrated in Laredo, runs on trucks, and has grown from $211B (2007) to over $600B (2025)."

#### Tab 2: Commodities — *What Flows Through Texas*

Same structure as the U.S.–Mexico commodities tab but filtered to Texas ports only. The **treemap** reveals the same machinery-and-vehicles dominance but with a Texas twist: **Mineral Products** (petroleum, natural gas) appears more prominently because of pipeline exports. **Vegetable Products** and **Foodstuffs** are also more visible — reflecting the Pharr/Progreso/Roma agricultural corridor.

*The story being told:* "Texas ports handle the nation's manufacturing trade AND are uniquely important for energy exports and fresh produce imports."

#### Tab 3: States — *Mexico's Trading Partners Through Texas*

An **interactive flow map** combines a Mexican states choropleth with port bubbles overlaid. Click a Mexican state and its connected ports highlight; click a port and its connected states light up. This reveals geographic trade corridors: Chihuahua trades through El Paso/Ysleta, Nuevo León through Laredo, Tamaulipas through Pharr/Brownsville.

A **bar chart** ranks the top 15 Mexican states, and a **line chart** tracks trends for the top 5.

*The story being told:* "Each Texas port serves specific Mexican states, creating distinct trade corridors along the border."

#### Tab 4: Trade Flows — *Origin-Destination Connections*

A **Sankey diagram** and **heatmap** show how trade flows from origin states through Texas ports to Mexican destination states (or vice versa for imports).

*The story being told:* "Texas ports are not interchangeable — they serve specific origin-destination corridors."

---

### About Page — *Methodology and Context*

A well-structured documentation page with sticky sidebar navigation explaining the data source (BTS), coverage (1993–2025, 39.5M records), the schema change at January 2007, HS code terminology, known data limitations, and port history. This page serves as the credibility anchor for the entire dashboard.

---

## Part 2: Stories Now Told (Implemented in March 2026)

The following stories were identified as gaps and have now been **implemented** in the dashboard.

### 2.1 The Widening Trade Deficit — NOW SHOWN

**Added:** Trade Balance Trend chart in both TX-MX and US-MX Ports tabs. Area chart showing exports minus imports with the deficit clearly visible as a growing negative area. Paired with an InsightCallout explaining the 4× widening from -$30B to -$125B.

### 2.2 The Maquiladora / Cross-Border Manufacturing Pattern — NOW SHOWN

**Added:** "Cross-Border Manufacturing Pattern" DivergingBarChart in both TX-MX and US-MX Commodities tabs. Shows imports on the left, exports on the right, for each commodity group — instantly revealing which groups flow south (chemicals, plastics = inputs) vs. north (vehicles, electronics = finished goods). Paired with InsightCallouts about the 3.9:1 Transportation Equipment import ratio and energy export dominance.

### 2.3 The Laredo Concentration Risk — NOW SHOWN

**Added:** "Laredo's Share of TX-MX Trade" line chart in the TX-MX Ports tab. Shows Laredo's share growing from 52% to ~60% with an InsightCallout about $900M/day disruption risk.

### 2.4 The COVID Resilience Story — NOW SHOWN

**Added:** "COVID-19 Impact & Recovery" monthly zoom panel in TX-MX Ports tab (inside the monthly patterns section). Shows the V-shaped recovery from April-May 2020, with InsightCallout about the 49% single-month plunge and four-month full recovery.

### 2.5 The Mexican Industrial Corridor Shift — NOW SHOWN

**Added:** "Fastest-Growing Mexican States" bar chart in TX-MX States tab. Shows growth rates from earliest 3-year average to latest 3-year average, highlighting the Bajío corridor (Querétaro 5.5×, San Luis Potosí 4.5×). InsightCallout explains the nearshoring trend.

### 2.6 Narrative Voice — NOW ADDED

**Added:** Every tab across both US-Mexico and Texas-Mexico pages now has:
- A **narrative intro paragraph** at the top framing what the user is about to see
- **2–3 InsightCallouts** highlighting the most important findings from that tab's data
- **Historical annotations** on all line charts (Great Recession 2008–09, USMCA 2018, COVID-19 2020)

### 2.7 Animated Commodity Rankings — NOW SHOWN

**Added:** "Commodity Rankings Over Time" animated bar chart race in TX-MX Commodities tab. Play/pause button and year slider let users watch commodity groups shift in importance from 2007 to present. Machinery & Electrical and Transportation Equipment visibly pull away from everything else.

---

## Part 3: Remaining Opportunities

### 3.1 The Energy Export Story

**What the data shows:** Pipeline trade is 100% **Mineral Products** (petroleum and natural gas), and it's almost entirely one-directional: **$41.2B in exports vs $295M in imports** (2020–2024). Texas is Mexico's energy lifeline. When you add truck and rail shipments of mineral products, the total Texas→Mexico energy export is approximately **$59B cumulative**, making it the single largest export commodity group.

**Why it matters:** The energy relationship is strategically significant and often misunderstood. Texas doesn't just trade manufactured goods with Mexico — it fuels Mexico's economy. This story is partially visible in the commodity treemap but never explicitly highlighted.

**Recommendation:** Add a callout or annotation: *"Texas exports more energy products to Mexico ($12B/year) than most U.S. states export in total goods. Nearly all pipeline trade is Texas sending petroleum and natural gas south."* Consider a small pipeline-specific visualization showing the one-directional flow.

### 2.4 The Port Specialization Story

**What the data shows:** Texas ports have distinct economic personalities:
- **Laredo:** The manufacturing corridor — $321B in machinery/electrical, $240B in transportation equipment
- **Ysleta (El Paso):** Electronics and medical devices — $140B in machinery, $24B in optical/precision instruments
- **Eagle Pass:** The auto port — $54B in transportation equipment (highest concentration of any port)
- **Hidalgo/Pharr:** Mixed manufacturing + agriculture — $57B machinery, $19B vegetables
- **Progreso & Roma:** Pure agriculture — vegetables and foodstuffs
- **Presidio:** Cattle crossing — $338M in live animals (its primary commodity)
- **Brownsville:** Heavy industry — machinery, minerals, base metals

**Why it matters:** The current dashboard shows port rankings by total value but not *what each port carries*. A user can't see that Progreso is an avocado port and Eagle Pass is a car port. This specialization has policy implications — infrastructure investments, inspection capacity, and trade disruption risks differ by port.

**Recommendation:** Add a **port profile view** — when you click a port on the map (or in the ranking), show its commodity breakdown as a small donut or bar chart. Alternatively, add a **port × commodity heatmap** showing which ports handle which goods. Add narrative: *"Texas's 14 border ports aren't interchangeable. Each serves a distinct role in the cross-border economy, from Laredo's manufacturing corridor to Presidio's cattle crossing."*

### 2.5 The Laredo Concentration Risk Story

**What the data shows:** Laredo's share of Texas-Mexico trade has grown from **52.3% in 2007 to 59.9% in 2024**. In dollar terms, **$331 billion** flows through a single port — more than the GDP of many countries. Three-fifths of Texas-Mexico trade (and two-fifths of ALL U.S.-Mexico trade) funnels through one city.

**Why it matters:** This is both an economic triumph and a vulnerability. A disruption at Laredo (weather, infrastructure failure, policy change, congestion) would have outsized impact on U.S.-Mexico trade. The current dashboard shows Laredo at the top of the bar chart, but doesn't frame the *concentration risk*.

**Recommendation:** Add a **concentration metric** — perhaps a running share chart showing Laredo's % over time with a callout: *"Laredo handles $331B/year — 60% of all Texas-Mexico trade. A single day of disruption at Laredo costs an estimated $900M in delayed freight."* (This calculation: $331B ÷ 365 days ≈ $907M/day.)

### 2.6 The COVID Resilience Story

**What the data shows:**
- **April 2020:** Trade plunged **49%** in a single month (from $32.1B in March to $16.9B)
- **May 2020:** Hit bottom at $16.1B
- **June 2020:** Already 85% recovered ($28.0B)
- **September 2020:** Fully back to pre-COVID levels
- **Full year 2020:** Only 10.3% below 2019
- **Full year 2021:** 9.3% ABOVE 2019 — a textbook V-shaped recovery

**Why it matters:** The current dashboard marks COVID with an annotation on charts, but doesn't tell the *speed of recovery* story. The two-month shock and rapid bounce-back is remarkable and tells an important story about supply chain resilience (or dependence).

**Recommendation:** Add a **monthly zoom-in chart** for the COVID period (Jan 2020 – Dec 2021) showing the V-shape. Add narrative: *"COVID-19 caused the sharpest single-month trade drop in the database's 32-year history — but recovery was equally dramatic. Within four months, Texas-Mexico trade had fully rebounded, underscoring how tightly integrated these economies are."*

### 2.7 The Mexican Industrial Corridor Shift

**What the data shows:** Traditional border states (Tamaulipas, Chihuahua, Nuevo León) still dominate, but interior states are growing much faster:
- **Querétaro:** 5.5× growth (from $1.3B to $7.4B) — new auto manufacturing hub
- **San Luis Potosí:** 4.5× growth (from $1.2B to $5.5B) — BMW, GM plants
- **Aguascalientes:** significant growth — Nissan manufacturing
- **Campeche:** 27× growth ($97M to $2.6B) — offshore energy

**Why it matters:** Mexico's industrial base is shifting south from the border, and Texas ports are still the gateway. This tells a story about nearshoring, the Bajío automotive corridor, and Mexico's economic development strategy. The current dashboard's Mexican state choropleth shows the *current* picture but not the *shift* over time.

**Recommendation:** Add a **growth rate view** for Mexican states — not just absolute trade values but % change over time. Highlight the emerging Bajío corridor (Querétaro, Guanajuato, San Luis Potosí, Aguascalientes) with narrative: *"Mexico's manufacturing base is expanding south from the traditional border zone into the Bajío corridor — and Texas ports remain the gateway for this growing interior trade."*

### 2.8 The Rail-vs-Truck Mode Competition

**What the data shows:** Truck's ~80% mode share has been remarkably stable, but within specific commodities, there's been significant mode shifting:
- **Rail lost ground in:** Transportation Equipment (56% → 38%), Vegetables (56% → 33%), Animal Fats/Oils (80% → 51%), Live Animals (12% → 0.3%)
- **Rail gained only in:** Mineral Products (24% → 41%) — bulk energy commodities

**Why it matters:** The overall mode split looks static, but underneath, rail is consolidating around bulk commodities while losing manufactured goods to truck. This has infrastructure implications — should Texas invest in rail or road capacity? The current dashboard shows overall mode composition but not commodity-level mode shifts.

**Recommendation:** Add a **mode-by-commodity analysis** — a stacked bar or small multiples showing how each major commodity group's truck/rail split has changed. Narrative: *"While truck dominates overall, the rail-vs-truck competition is playing out differently across commodity types. Rail is losing manufactured goods to truck but gaining bulk commodity share."*

### 2.9 The Weight-vs-Value Story (Bulk vs. Precision)

**What the data shows:** The value-per-kilogram spread is dramatic:
- **Cheapest per kg:** Stone/Ceramic ($1,442/kg), Wood ($1,874/kg), Foodstuffs ($2,270/kg)
- **Most expensive per kg:** Precious Metals ($558,111/kg), Optical/Medical ($55,027/kg), Footwear ($37,609/kg)

**Why it matters:** This helps explain why truck dominates (high-value, time-sensitive goods) and why some ports handle enormous dollar values with relatively few physical trucks. It also matters for infrastructure planning — weight damages roads, not dollar values.

**Recommendation:** Add a **bubble chart** with value on one axis, weight on the other, and bubble size representing the number of commodity categories. This reveals the "two economies" crossing the border: heavy bulk goods and lightweight precision goods. Narrative: *"A single truck carrying semiconductor equipment from Ysleta can be worth more than an entire train of gravel from Brownsville."*

### 2.10 Year-over-Year Growth Acceleration

**What the data shows:** Texas-Mexico trade milestones:
- **1993–2007:** $0 → $211B (first $200B)
- **2007–2014:** $211B → $285B (14 years to add ~$75B)
- **2014–2019:** $285B → $392B (5 years to add ~$107B)
- **2019–2024:** $392B → $553B (5 years to add ~$161B, through a pandemic)
- **2025:** $601B (crossed $600B for the first time)

**Why it matters:** The acceleration is itself a story. Trade isn't just growing — it's growing *faster*. The current line charts show this visually, but no one calls it out explicitly.

**Recommendation:** Add milestone callouts on the trend chart or in an insight card: *"It took 14 years (1993–2007) for Texas-Mexico trade to reach $200B. It took just 5 years (2019–2024) to add the next $160B."*

---

## Part 3: Storytelling Improvements

### ~~3.2 Port Specialization Profiles~~ — NOW SHOWN

**Added:** "Port Specialization" stacked bar chart in TX-MX Commodities tab. Shows top 5 commodity groups broken down by port, revealing each port's distinct economic personality (Laredo = manufacturing, Pharr = agriculture, Presidio = cattle). InsightCallout explains that Texas's 14 ports are not interchangeable.

### 3.3 Rail-vs-Truck Mode Competition by Commodity

The overall truck/rail mode split looks stable at ~80/20, but commodity-level data shows rail losing manufactured goods to truck while gaining bulk mineral share. A mode-by-commodity stacked bar or small multiples chart would reveal this hidden competition.

### 3.4 Weight-vs-Value Bubble Chart

The value-per-kilogram spread across commodities is dramatic ($1,442/kg for stone vs. $558,111/kg for precious metals). A bubble chart would reveal the "two economies" crossing the border — heavy bulk goods vs. lightweight precision goods.

### 3.5 Contextual Dollar Comparisons

Values shown in billions lack human scale. Adding occasional contextual comparisons in callouts would help:
- *"Texas-Mexico trade ($553B) exceeds the GDP of Sweden."*
- *"Laredo's daily trade volume (~$900M) is larger than the annual budget of the City of Austin."*

### 3.6 Guided Tour / Story Mode

A toggle or separate entry point that walks users through key findings in sequence (gateway → concentration → manufacturing → deficit → recovery → corridor shift) would serve users who want to be *told* the story rather than explore it.

---

## Part 4: Implementation Notes

### 4.1 Data Pipeline

The `05_build_outputs.py` script did **not** need any changes. All new visualizations derive their data from the existing 12 datasets through frontend `useMemo` aggregations:
- Trade balance = sum exports - sum imports by year (from `texas_mexico_ports`)
- Laredo share = Laredo trade / total trade by year (from `texas_mexico_ports`)
- Maquiladora pattern = group by CommodityGroup, split Export/Import (from `texas_mexico_commodities`)
- Bar chart race = group by Year × CommodityGroup (from `texas_mexico_commodities`)
- State growth = earliest 3-year avg vs latest 3-year avg (from `texas_mexican_state_trade`)
- COVID zoom = filter monthly_trends to 2019–2021

### 4.2 Components Used

All new visualizations used **existing chart components** — no new chart types were needed:
- `DivergingBarChart` — maquiladora supply chain pattern
- `BarChartRace` — animated commodity ranking over time
- `LineChart` (with `showArea`) — trade balance, Laredo concentration, COVID zoom
- `BarChart` — Mexican state growth rates
- `InsightCallout` — narrative callouts throughout

---

## Part 5: Summary — What We Now Tell

### Stories the Dashboard Tells (after enhancements)
- Texas is the dominant U.S.–Mexico trade gateway — 66% share (map + stats + narrative)
- Trade has grown enormously over 30+ years (trend charts + historical annotations)
- Truck is the dominant mode at ~83% (donut + stacked bar + callout)
- Laredo handles ~60% of TX-MX trade and is growing in concentration (dedicated share chart + warning callout)
- **The trade deficit is widening** — from -$30B to -$125B (trade balance area chart)
- **This is a cross-border assembly line** — parts flow south, finished goods flow north (diverging bar chart + maquiladora callouts)
- **COVID was a 2-month blip** — 49% drop, full recovery in 4 months (monthly zoom panel)
- **Mexico's manufacturing is shifting south** — Bajío corridor surging (growth rate bar chart)
- **Commodity leadership is evolving** — animated bar chart race shows the shift over time
- Mexican states connect to specific Texas ports via distinct corridors (interactive flow maps + Sankey)
- Historical events shaped trade — Great Recession, USMCA, COVID all annotated on line charts

### What Could Still Be Added
- Port specialization profiles (what each port carries, not just how much)
- Rail-vs-truck competition at the commodity level
- Weight-vs-value analysis (the "two economies" at the border)
- Contextual dollar comparisons for human-scale understanding
- Guided tour mode for narrative-first users

### The Bottom Line

The dashboard has evolved from a **data exploration tool** into a **data storytelling platform**. Every tab now opens with a narrative frame, key insights are called out alongside visualizations, historical context is woven into every time series, and the most important untold stories (deficit, maquiladora pattern, Laredo concentration, COVID resilience, Bajío corridor shift) are now explicitly visualized. The animated bar chart race for commodity rankings adds a dynamic dimension that static charts cannot match.

The remaining opportunities (port specialization, mode-by-commodity, weight-vs-value) are refinements. The core story — **Texas as the gateway, manufacturing integration as the engine, and Laredo as the linchpin** — is now clearly told.
