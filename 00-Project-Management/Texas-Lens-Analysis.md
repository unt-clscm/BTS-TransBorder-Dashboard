# Texas Lens Toggle — Current State Analysis

**Last updated**: 2026-04-13 (revised to match implemented code)  
**Purpose**: Document what each chart currently does when the Texas Lens toggle is ON vs. OFF.

---

## How the Toggle Works (Technical)

- Default state: **ON** (true) — the `texas=0` URL parameter must be present to turn it off.
- Stored in the URL query string so the state persists across page reloads and is shareable.
- Affects **visualization and overlays only** — it never filters out data from the base dataset. All data is always present; the toggle adds/removes Texas-specific layers on top.
- The toggle button is burnt orange (#bf5700) when ON, gray/white when OFF.

---

## Tab 1 — Ports

| Chart / Element | Texas Lens OFF | Texas Lens ON | Change Type |
|---|---|---|---|
| **Port map — marker colors** | All ports rendered uniformly | Texas ports are burnt orange (#bf5700); other U.S. ports are blue (#0056a9) | Color coding |
| **Port map — legend** | No legend | "Texas Port" vs "Other U.S. Port" legend appears with color swatches | Legend added |
| **Port map — marker layering** | Default rendering order | Texas ports drawn last (rendered on top of other markers) | Draw order |
| **Trade Trends line chart** | National Import and Export lines only | Adds "Texas Export" and "Texas Import" as additional orange overlay series | Overlay series added |
| **Trade Balance line chart** | U.S. national balance line only (with shaded area) | Adds "Texas" balance line as orange overlay series; removes shaded area | Overlay series added |
| **Mode bar chart — bar colors** | All bars uniform blue | Bars where Texas handles ≥60% of freight are orange; national share % appears in bar labels | Color coding + labels |
| **Mode Composition by Year chart** | National stacked bar by mode | Chart switches to show Texas-only mode breakdown by year | Chart data switched |
| **Texas mode handling callout** | Hidden | Appears: states Texas's % share for Truck mode and specialized modes (energy/geography context) | Callout shown/hidden |
| **Top Ports bar chart — bar colors** | All bars uniform blue | Texas ports are orange; non-Texas ports are blue | Color coding |
| **Top Ports — "X of top Y ports are Texas" callout** | Hidden | Appears: count and % of top-ranked ports that are in Texas | Callout shown/hidden |
| **Containerization Status donut** | Single national donut | Side-by-side "National" and "Texas" comparison donuts with labels | Chart comparison |
| **Export Origin donut** | Single national donut | Side-by-side "National" and "Texas" comparison donuts with labels | Chart comparison |
| **Containerization trend chart** | National containerization line only | Adds "Texas" line overlay in orange | Overlay series added |
| **Containerization callout** | Hidden | Appears: Texas's share of logistics freight, containerization rate vs. national average, re-export share | Callout shown/hidden |
| **Port Detail table — row highlighting** | No highlighting | Texas rows get a light orange background and medium font weight | Row highlighting |

---

## Tab 2 — Commodities

| Chart / Element | Texas Lens OFF | Texas Lens ON | Change Type |
|---|---|---|---|
| **Treemap** | National commodity group breakdown | Switches to Texas-only commodity breakdown (title changes to "Texas Commodity Groups") | Chart data switched |
| **Texas commodity group share callout** | Hidden | Appears: "Texas handles X% of all U.S.-Mexico commodity trade. Top groups through Texas: [list]" | Callout shown/hidden |
| **Texas Contribution by Commodity Group table** | Hidden | Full table appears: each top commodity group with national total, Texas total, and Texas share % | Chart shown/hidden |
| **Top N Commodities callout (follow-up)** | Hidden | Appears: contextualizes that rankings are national but Texas handles X% of the group-level total | Callout shown/hidden |
| **Maquiladora chart** | National import vs. export diverging bar by commodity group | Chart switches to Texas-only cross-border manufacturing pattern | Chart data switched |
| **Maquiladora callout** | Hidden | Appears: Texas is the primary maquiladora supply chain gateway (Machinery, Transportation Equipment) | Callout shown/hidden |
| **Commodity Group Trends line chart** | National trend lines for each commodity group only | Adds "TX: [GroupName]" overlay series in orange for each group | Overlay series added |

---

## Tab 3 — States

| Chart / Element | Texas Lens OFF | Texas Lens ON | Change Type |
|---|---|---|---|
| **U.S. States choropleth map** | No state highlighted | Texas is visually highlighted on the map | Map highlight |
| **Mexican States choropleth map** | No state highlighted | Nuevo León is highlighted on the map | Map highlight |
| **Top U.S. States bar chart — bar colors** | All bars uniform blue | Texas bar is orange; other state bars are blue | Color coding |
| **Top Mexican States bar chart — bar colors** | All bars uniform teal/green | Nuevo León, Chihuahua, and Tamaulipas bars are orange; other Mexican state bars remain teal | Color coding |
| **Texas state ranking callout** | Hidden | Appears: "Texas ranks #X among U.S. states, handling [amount] — X% of the top Y states total" | Callout shown/hidden |
| **Texas–Mexico partner callout** | Hidden | Appears: names Nuevo León, Chihuahua, and Tamaulipas as Texas's primary trading partners; contextualizes the Laredo–Monterrey corridor | Callout shown/hidden |
| **U.S. State Trends line chart — line colors** | All state lines use default color palette | Texas line is orange; other states use default colors | Color coding |
| **Mexican State Trends line chart — line colors** | All state lines use default color palette | Nuevo León, Chihuahua, and Tamaulipas lines are orange; others use default colors | Color coding |
| **State Growth Rates (lollipop chart) — colors** | All bars uniform green | Texas bar is orange; all other state bars are green | Color coding |
| **Texas growth context callout** | Hidden | If Texas doesn't appear in the fastest-growing list, a callout explains why (dominant baseline, large absolute gains) | Callout shown/hidden |
| **State Commodity Specialization callout (Texas context)** | Hidden | Appears: Texas's commodity mix and total; notes Texas is the most diversified trade gateway with no single dominant group | Callout shown/hidden |
| **U.S. State Detail table — row highlighting** | No highlighting | Texas rows get a light orange background and medium font weight | Row highlighting |
| **Mexican states data** | Unaffected | Primary Texas trading partners (Nuevo León, Chihuahua, Tamaulipas) highlighted in orange on bar and trend charts | Color coding |

---

## Tab 4 — Trade Flows

| Chart / Element | Texas Lens OFF | Texas Lens ON | Change Type |
|---|---|---|---|
| **Trade Flow choropleth map** | No state highlighted | Texas is highlighted on the map | Map highlight |
| **Texas Trade Over Time chart** | Hidden | Dedicated line chart appears: Texas annual export trade over time in burnt orange | Chart shown/hidden |
| **Top Trading Partners bar chart — bar colors** | All bars uniform blue | Bars for pairs where Texas is the U.S. side are orange; others are blue | Color coding |
| **Trading Partners callout** | Hidden | Appears: "X of the top Y bilateral trading pairs involve Texas (shown in burnt orange), representing Z% of trade across these top corridors" | Callout shown/hidden |
| **Texas's Top Mexican State Partners chart** | Hidden | Dedicated bar chart appears: Texas's top Mexican state trading partners in burnt orange | Chart shown/hidden |
| **Texas corridor concentration callout** | Hidden | Appears inside the corridors chart: top corridor and its % of Texas's total bilateral trade | Callout shown/hidden |
| **Sankey diagram — node highlighting** | No nodes highlighted | Texas node (`us-Texas`) is highlighted in the Sankey diagram | Node highlight |
| **Trade Matrix heatmap** | No row highlighted | Texas row is highlighted | Row highlight |

---

## Summary: Change Types Used

| Change Type | Count Across All Tabs | Notes |
|---|---|---|
| Callout shown/hidden | ~15 callouts | The most common Texas Lens effect — adds contextual insight text blocks |
| Color coding (bars, lines, markers, nodes) | ~12 instances | Colors Texas elements orange, non-Texas blue/green |
| Chart comparison (side-by-side) | 2 charts | Containerization Status donut, Export Origin donut (Ports) |
| Chart data switched | 3 charts | Treemap (Commodities), Maquiladora chart (Commodities), Mode Composition by Year (Ports) |
| Chart shown/hidden | 3 charts | Texas Contribution by Commodity Group table, Texas Trade Over Time, Texas's Top Mexican State Partners |
| Overlay series added (trend lines) | 5 line charts | Ports: trade trends + balance + containerization; Commodities: group trends; Trade Flows: none (replaced by dedicated chart) |
| Map highlight | 3 maps | States choropleth (Texas), States choropleth (Nuevo León), Trade Flows choropleth (Texas) |
| Table row highlighting | 2 tables | Ports detail, States detail |
| Map legend + layering | 1 map | Port map only |

---

## Observations & Potential Gaps

### What the toggle does well
- Visually distinguishes Texas from non-Texas across nearly every chart type
- Adds contextual callouts that tell a story (ranking, share, maquiladora context)
- Switches charts to Texas-specific data where a national view would obscure Texas's story (treemap, maquiladora, mode composition)
- Covers both sides of the border: highlights Texas's primary Mexican trading partners (Nuevo León, Chihuahua, Tamaulipas) not just Texas itself
- URL persistence means the state is shareable

### All gaps resolved

All previously identified gaps have been addressed:

1. **Toggle tooltip** ✅ — The button carries a `title` attribute that describes the toggle state in plain language. The sidebar above the button also has a label and a description that changes based on ON/OFF state.

2. **Texas share stat card** ✅ — A "Texas Share" KPI card appears in the header stat row and updates with all sidebar filters.

3. **Toggle story not told** ✅ — The sidebar description now reads different text depending on the toggle state: when ON it explains what is being shown; when OFF it explains what turning it on will do.

4. **Filter consistency** ✅ — The "Texas handles X% of U.S.-Mexico freight" callout in the Ports tab is now computed dynamically from the filtered dataset (not hardcoded to ~66%). If the user filters to California ports only, the callout correctly reflects 0% Texas share in that filtered view.

---

*All gaps from both the original and revised analysis have been resolved. No open items remain.*
