# Web App Story: BTS TransBorder Freight Dashboard

> What this document is: a current-state narrative of the live web app, checked against `WebApp/src/`, the extraction pipeline in `02-Data-Staging/Scripts/05_build_outputs.py`, and the full SQLite database in `02-Data-Staging/transborder.db`.
>
> Last updated: March 28, 2026

---

## Part 1: What the Web App Tells Today

### Overview Page

The app opens with a large hero section built around a North American border-trade map. A blind user would experience it as a map-first explanation of scale and geography: the United States, Mexico, and Canada are shaded by trade intensity, while ports of entry appear as sized circles. Texas-Mexico ports are visually separated from other Mexico-border ports and from Canada-border ports so the eye is immediately drawn to Texas as the main gateway.

Below the map are high-level controls for Trading Partner, Trade Type, Mode, and Metric, followed by headline cards for total trade, exports, imports, and trade balance. The next layer is interpretation: automatically generated insight cards summarize the biggest patterns in plain language. Then the page moves into trend and composition: a long-run annual trend chart with historical markers, a donut for mode share, and a stacked comparison of Mexico versus Canada.

The message is clear: North American border trade is large, long-running, and concentrated, and Texas matters most on the Mexico side.

### U.S.-Mexico Page

This page turns the big-picture story into a national U.S.-Mexico story with a right-side filter panel and four tabs: Ports, Commodities, States, and Trade Flows. The page hero and KPI cards already state the main finding directly: Texas handles roughly two-thirds of U.S.-Mexico trade.

#### Ports tab

This tab tells a concentration story. It shows where trade crosses, how dominant Laredo is, how stable truck's lead remains, and how the bilateral deficit has widened over time. The visual sequence moves from map to trends to rankings to tables, so the user can first see the geography, then the time pattern, then the ordered port hierarchy.

#### Commodities tab

This tab tells a manufacturing-integration story. The treemap and top-commodity charts show what moves, the diverging chart shows which groups skew south as inputs versus north as finished goods, and the trend lines show how those groups rise or fall over time.

#### States tab

This tab broadens the story beyond the border. On the U.S. side, it shows that Mexico trade reaches far into the interior. On the Mexican side, it highlights industrial geography, including the traditional northern manufacturing belt and the growing Bajio corridor.

#### Trade Flows tab

This tab tells the corridor story. It shows that trade does not move randomly; it moves through persistent state-port-state relationships. Sankey and matrix views reinforce that specific U.S. states, Mexican states, and border ports are linked in repeatable supply-chain corridors.

### Texas-Mexico Page

This is the app's strongest storytelling page. It keeps the same four-tab structure, but narrows the story to Texas as the central land bridge between the U.S. and Mexico.

#### Ports tab

This tab is the gateway story in its strongest form. It shows that Texas border trade is concentrated in a few clusters, that Laredo dominates the system, that truck carries most value, and that shocks such as COVID caused sharp short-term drops but not lasting structural collapse. It also already includes a freight charges trend and an FTZ growth callout, which means the page now goes beyond simple value rankings and begins to say something about logistics structure.

Using the live database, the current underlying story is real and strong: in 2025 Texas ports handled about 68.9% of all U.S.-Mexico trade by value, and the top Texas ports were led by Laredo at about $344.6B, followed by Ysleta at about $112.4B, then Eagle Pass and Hidalgo/Pharr at roughly $43B each.

#### Commodities tab

This tab is no longer just a treemap-and-table page. It already tells several layered stories:

- Manufacturing integration through the diverging import/export view
- Commodity rankings over time through the animated bar chart race
- Port specialization through port-by-commodity comparison
- Trade balance by commodity group
- Mode of transport by commodity group
- Weight versus value through the scatter plot

The live data behind this tab is also rich. In 2025, Texas-Mexico trade showed its largest deficits in Machinery and Electrical Equipment and Transportation Equipment, while the strongest surpluses were in Mineral Products, Plastics and Rubber, Base Metals, and Chemical Products. Pipeline trade through Texas in 2025 was essentially a Mineral Products export story, at about $7.7B.

#### States tab

This tab tells the Mexican-partner geography story through a Texas lens. It shows that Texas ports connect to specific Mexican states rather than to "Mexico" in the abstract, and that growth is not evenly distributed. The narrative emphasis on Nuevo Leon, Chihuahua, Tamaulipas, and the Bajio is appropriate for what the app currently visualizes.

#### Trade Flows tab

This tab tells the corridor story for Texas specifically. The strongest message is that Texas ports are not interchangeable. Different ports serve different state-to-state corridors and different industrial networks. One copy issue remains: some text implies a timeline-style interaction, but the map control is a year selector rather than a true animation timeline.

### About Page

The About page works as a methodology page. It explains the data source, coverage period, the 2007+ detail strategy, terminology, limitations, and port-history caveats. This is important because the rest of the app is narrative and visual; the About page anchors that story in data reality.

---

## Part 2: Stories Already Implemented

Several items that were previously described as missing are now live in the app and should no longer be listed as gaps:

- Freight charges are shown on the Texas-Mexico Ports tab.
- FTZ growth is already surfaced as a Texas-Mexico Ports callout.
- Trade balance by commodity group is already shown on the Texas-Mexico Commodities tab.
- Mode of transport by commodity group is already shown on the Texas-Mexico Commodities tab.
- Weight versus value is already shown through the scatter plot on the Texas-Mexico Commodities tab.
- Port specialization is already shown on the Texas-Mexico Commodities tab.
- The monthly commodity dataset already exists in the pipeline as `monthly_commodity_trends`; it is just not yet used by the UI.

This matters because the current app is stronger than the earlier documentation suggested. The remaining work is less about inventing the story and more about making the strongest available stories more consistent, more explicit, and easier to navigate.

---

## Part 3: Additional Stories the App Is Not Yet Telling

These are the most valuable stories that are supported by the full database but are not fully communicated in the current UI.

### 3.1 Texas versus other U.S. states by commodity

The current app can show U.S. states and it can show commodities, but it cannot yet show which commodities define Texas relative to Michigan, California, Illinois, or other major U.S.-Mexico states. That means one important argument is still missing: not just that Texas is biggest, but what Texas is biggest in.

Why it matters: this would sharpen the difference between Texas as an energy-plus-manufacturing gateway and other states as more specialized manufacturing nodes.

Data status: supported in the full database through `dot2_state_commodity`, not available in current processed outputs.

### 3.2 Commodity relationships by Mexican state

The app currently shows Mexican states as trade partners, but not which commodities tie each Mexican state to the U.S. or to Texas. Nuevo Leon, Chihuahua, Tamaulipas, Guanajuato, and Queretaro do not trade the same baskets of goods, and that is a story worth showing.

Why it matters: this would turn the "industrial corridor" story from a geographic statement into an economic one.

Data status: supported in `dot2_state_commodity` via `MexState`, not available in current processed outputs.

### 3.3 Fastest-growing corridors over time

The Trade Flows tabs show corridor structure, but they do not yet show which corridors are rising fastest and which are losing relative importance. The extracted OD datasets already contain the ingredients for that analysis.

Why it matters: this would add time and change to a section that currently emphasizes structure more than momentum.

Data status: can be built from existing `od_state_flows` and `texas_od_state_flows` with no pipeline change.

### 3.4 Seasonal commodity patterns

The app has monthly trade patterns, but not monthly commodity patterns. That leaves out one of the clearest stories in the data: produce and other seasonal goods have strong calendar effects. Using the live database, average Mexico vegetable-product imports in 2021-2025 were roughly $2.1B in January and about $1.1B in August, a near 2:1 swing.

Why it matters: this connects commodity story, seasonality, and specific port pressure in a way the current app does not.

Data status: the required dataset already exists as `monthly_commodity_trends`. This is now a UI gap, not a pipeline gap.

### 3.5 Containerization and domestic/foreign status

Two fields remain almost completely untapped: `ContCode` and `DF`. These could support niche but valuable logistics stories such as containerized versus non-containerized trade, or domestic-origin versus foreign-origin composition where BTS definitions support it.

Why it matters: these fields are not central to the main public-facing story, but they could support an infrastructure, logistics, or policy appendix.

Data status: present in the full database, not extracted today.

### 3.6 Pre-2007 detailed history

The app correctly uses 2007+ as the clean detail boundary, but that means detailed port, state, and commodity stories before 2007 are not visualized. The long-run overview exists, but the long-run detailed story does not.

Why it matters: if the project eventually wants a true NAFTA-to-USMCA detailed story, the current processed outputs are not enough.

Data status: present in the database with caveats; excluded by current pipeline design on purpose.

---

## Part 4: Data Pipeline Changes Required

### Bottom line

No change is required in `05_build_outputs.py` for seasonal commodity analysis. The file already builds `monthly_commodity_trends`, and the store already knows about `monthly_commodity_trends.json`. That story is blocked in the UI, not in the pipeline.

### Pipeline changes that would be required for the missing stories above

#### Required if we want state-by-commodity storytelling

Add a new builder from `dot2_state_commodity` that groups by:

- `Year`
- `StateCode`
- `State`
- `Country`
- `HSCode`
- `Commodity`
- `CommodityGroup`
- `Mode`
- `TradeType`

Recommended output name: `state_commodity_trade`

This would enable Texas-versus-other-states commodity comparisons and state-specific commodity filtering.

#### Required if we want commodity-by-Mexican-state storytelling

Add a new builder from `dot2_state_commodity` that groups by:

- `Year`
- `MexState`
- optionally `State` or `StateCode`
- `HSCode`
- `Commodity`
- `CommodityGroup`
- `Mode`
- `TradeType`

Recommended output name: `commodity_mexstate_trade`

This would enable pages or callouts such as "Nuevo Leon is machinery-heavy while Tamaulipas is more mixed."

#### Required if we want containerization or DF analysis

Add one or more focused extracts exposing:

- `ContCode`
- `DF`

These should probably be narrow datasets rather than very large all-purpose files.

#### Optional if we want monthly port-by-commodity seasonality

If the project wants seasonality at the Texas-port-plus-commodity level, add a targeted monthly extract from `dot3_port_commodity` grouped by:

- `Year`
- `Month`
- `PortCode`
- `Port`
- `CommodityGroup`
- `Mode`
- `TradeType`

That is not required for a first seasonal commodity story, but it would support a stronger Pharr/Hidalgo produce narrative.

---

## Part 5: Storytelling Recommendations

### 5.1 Align the written story with the live app

The first improvement is documentation accuracy. Any statement that FreightCharges, FTZ growth, trade-balance-by-commodity, mode-by-commodity, or the scatter plot are "not currently shown" should be removed.

### 5.2 Make the flow pages more interpretive

The Ports and Commodities tabs are strong because they combine charts with interpretation. The Trade Flows tabs are visually rich, but they would benefit from one or two explicit insight callouts so the user is not left to interpret the Sankey and matrix alone.

### 5.3 Use the existing hero subtitles as true narrative framing

The page heroes already contain good one-sentence takeaways. Keep them, and make sure the written documentation treats them as already implemented rather than proposed future work.

### 5.4 Standardize historical annotations

The app does not use the same annotation set on every line chart. Where appropriate, align the major milestone markers so similar charts tell time in the same language.

### 5.5 Explain caveats where users encounter them

The app already documents weight caveats and export-only OD limitations, but these should be surfaced exactly where users are likely to misread the charts, especially on flow and weight-related views.

### 5.6 Break the Texas commodities tab into visible narrative sections

That tab is one of the strongest in the app, but it is also one of the densest. Simple section headers such as "What moves," "How rankings change," "Which ports specialize," and "How value differs from weight" would make the storytelling easier to follow.

---

## Part 6: Filter Recommendations by Page and Tab

The current filter architecture is already good. The best next step is not "more filters everywhere," but filters that match the question each page is helping the user answer.

### Overview

- Make Mode a true multi-select control in the UI, not a single-select dropdown feeding an array.
- Consider preset chips such as "Mexico only," "Texas focus," or "Truck only" for users who want guided entry points rather than full filter exploration.

### U.S.-Mexico Ports

- Add a border-state or border-region convenience filter above Port so users can jump quickly between Texas, California, Arizona, and New Mexico.

### U.S.-Mexico Commodities

- No urgent change is required.
- If `state_commodity_trade` is added later, then add U.S. State as a dynamic optional filter on this tab.

### U.S.-Mexico States

- Consider adding Port as an optional filter so users can ask which states are tied specifically to Laredo or another major crossing.

### U.S.-Mexico Trade Flows

- Filters are already strong.
- The highest-value improvement here is better guided presets, not necessarily more raw filter controls.

### Texas-Mexico Ports

- Current Region and Port filters are appropriate.
- Add preset region shortcuts if you want faster storytelling entry points.

### Texas-Mexico Commodities

- Add Region as a convenience filter so users can move from individual ports to port clusters without manually selecting multiple ports.

### Texas-Mexico States

- Current Port and Mexican State filtering is useful.
- Add Region as a convenience layer above Port.

### Texas-Mexico Trade Flows

- Add U.S. State as a dynamic filter. This is the most important missing flow filter in the Texas section because it would let users isolate corridors such as Michigan-through-Laredo or Illinois-through-Eagle Pass.
- Add Region as a convenience filter above Port.

---

## Part 7: Visual Improvement Recommendations

- Use `LollipopChart` for growth-rate comparisons so those charts are visually distinct from rank-order bar charts.
- Add small trend indicators or sparklines to the headline cards where the extra context is helpful.
- Give the flow pages a stronger explanatory legend and one or two narrative callouts.
- Use section labels inside the Texas Commodities tab to reduce scroll fatigue.
- Keep wording aligned with controls: if a map uses a year dropdown, do not describe it as a timeline animation.

---

## Part 8: The Bottom Line

The app already tells a strong story: Texas is the dominant U.S.-Mexico gateway, manufacturing integration is the central economic pattern, and a small number of ports, especially Laredo, anchor the system.

The biggest remaining opportunities are not the ones the older story file emphasized. The app already covers freight charges, FTZ growth, commodity trade balance, mode-by-commodity structure, and weight-versus-value on the Texas side. The biggest real gaps now are:

- state-by-commodity storytelling
- commodity-by-Mexican-state storytelling
- fastest-growing corridor storytelling
- seasonal commodity storytelling in the UI
- optional logistics deep dives using `ContCode` and `DF`

In short, the foundation is strong. The next step is to connect geography, commodity detail, and time more tightly so the dashboard moves from "Texas is the gateway" to "here is exactly how different industries and corridors make Texas the gateway."
