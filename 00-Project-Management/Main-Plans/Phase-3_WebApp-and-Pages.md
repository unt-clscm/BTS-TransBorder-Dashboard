# Phase 3: Web Application Setup & Dashboard Pages

## Context

The web application is built by forking the Airport Dashboard (`Task 6 - Airport Connectivity/07_WebApp`) and replacing aviation-specific data/pages with TransBorder freight data/pages. The Airport Dashboard provides the full tech stack, all reusable components, and design system. Per project instructions: the dashboard must be **more comprehensive than the older TxDOT version** and **support broader analysis**. Incorporate **visualization concepts** from the **Original BTS dashboard** (https://data.bts.gov/stories/s/myhq-rm6q), **analytical components** from the **TxDOT dashboard** (https://tiger-unt.github.io/Data-Dashboard-Boilerplate/#/border-ports), and **design system + UI features** from the Airport Dashboard (project clone). Data usage follows the hierarchical approach: full U.S. dataset → subset U.S.–Mexico → deep dive Texas–Mexico (mirroring the airport dashboard).

**Source to fork**: `c:/Users/UNT/UNT System/TxDOT IAC 2025-26 - General/Task 6 - Airport Connectivity/07_WebApp/`

**Deployment target:** **GitHub Pages** — static hosting only, no server-side processing. The app loads pre-aggregated JSON files from `03-Processed-Data/json/` at runtime.

**Tech Stack (inherited):** React 19, Vite 7, Zustand, D3 7, TailwindCSS 4, React-Leaflet, Lucide React

## 3.0 Post-Phase-2 Cleanup

Before starting dashboard development, clean up the large staging artifacts from Phase 2 that are no longer needed. The ZIPs in `01-Raw-Data/download/` remain the source of truth and can be re-unpacked at any time via `unpack_raw_data.py`.

| Action | Path | Size | Rationale |
|---|---|---|---|
| **Delete** | `01-Raw-Data/unpacked/` | ~20 GB | Raw files have been normalized into `02-Data-Staging/cleaned/` and loaded into `transborder.db`. Re-unpackable from ZIPs if ever needed. |
| **Delete** | `02-Data-Staging/cleaned/` | TBD | Intermediate normalized CSVs. The database and final outputs in `03-Processed-Data/` supersede these. |
| **Keep** | `01-Raw-Data/download/` | ~2 GB (ZIPs) | Source of truth. Compact. Required for reproducibility. |
| **Keep** | `02-Data-Staging/transborder.db` | TBD | Working database for ad-hoc queries and future re-generation. |
| **Keep** | `03-Processed-Data/` | <100 MB | Final outputs (JSON + CSV). |

**Verification before deleting:** Confirm that `06_validate.py` passed and that all 6 JSON + 6 CSV files exist in `03-Processed-Data/` with expected row counts. Only then proceed with cleanup.

## 3.1 Fork the Airport Dashboard

- **Review the cloned project structure** (routing, stores, components, design playbook) to understand the web application setup before forking.
- Copy entire `07_WebApp/` into `BTS-TransBorder/WebApp/`
- Update `package.json`: name -> `bts-transborder-dashboard`, update version
- Update `vite.config.js`: change `base` path for deployment
- Run `npm install` to verify clean setup
- Run `npm run dev` to verify the forked app starts

**What We Get For Free (reuse as-is):**
- 9 D3 chart components (BarChart, LineChart, StackedBarChart, DonutChart, TreemapChart, DivergingBarChart, LollipopChart, BoxPlotChart, ScatterPlot)
- DashboardLayout (two-column content + filter sidebar)
- FilterSidebar + FilterBar (desktop/mobile filter panes)
- FilterSelect + FilterMultiSelect (single/multi select dropdowns)
- ChartCard (universal wrapper with CSV/PNG export, fullscreen, zoom integration)
- DataTable (sortable, paginated)
- StatCard (KPI cards with trend indicators)
- HeroStardust (animated hero background)
- InsightCallout (key findings cards)
- PageHeader, PageWrapper, SectionBlock
- ErrorBoundary, FullscreenChart, DownloadButton
- useChartResize, useCascadingFilters hooks
- chartColors.js (9-color palette + formatters)
- downloadCsv.js, downloadColumns.js (export logic)

## 3.2 Replace Data Layer

**Rename store**: `src/stores/aviationStore.js` -> `src/stores/transborderStore.js`

**Data source**: The WebApp reads pre-aggregated JSON files from `03-Processed-Data/json/` (copied to `WebApp/public/data/` for deployment). JSON is used instead of CSV for faster browser parsing and smaller payload (no repeated header names per row).

**Lazy-loading strategy**: Instead of fetching all 6 datasets upfront (which could be 50-80 MB total), datasets are loaded on-demand when the user first navigates to a page that needs them. Once loaded, they stay in memory — no re-fetching.

| Dataset | Est. Size | Loaded When | Used By |
|---|---|---|---|
| `usTransborder` | ~0.8 MB | **App startup** (landing page data) | Overview, US-Mexico (filtered), Trade by Mode |
| `usMexico` | ~30-54 MB | First visit to US-Mexico or US-Mexico Ports | US-Mexico, US-Mexico Ports |
| `texasMexico` | ~5-18 MB | First visit to Texas-Mexico | Texas-Mexico (all tabs except Monthly) |
| `usStateTrade` | ~2.8 MB | First visit to Trade by State | Trade by State |
| `commodityDetail` | ~5.6 MB | First visit to Commodities | Commodity Analysis |
| `monthlyTrends` | ~0.6 MB | First visit to Texas-Mexico Monthly tab | Texas-Mexico Monthly tab |

**Store implementation:**

Each dataset has three states: `null` (not yet requested), loading (promise in flight), or loaded (array in memory). The store exposes a `loadDataset(name)` action that pages call on mount.

```js
// Store state — datasets start as null (not loaded)
usTransborder: [],       // loaded at app init (small, needed for landing page)
usMexico: null,          // lazy
texasMexico: null,       // lazy
usStateTrade: null,      // lazy
commodityDetail: null,   // lazy
monthlyTrends: null,     // lazy
datasetLoading: {},      // { usMexico: true, ... } tracks in-flight requests

// Generic lazy-loader (called by pages on mount)
loadDataset: async (name) => {
  const state = get()
  if (state[name] !== null || state.datasetLoading[name]) return  // already loaded or in-flight
  set({ datasetLoading: { ...state.datasetLoading, [name]: true } })
  const raw = await fetch(`${base}data/${toFilename(name)}.json`).then(r => r.json())
  set({
    [name]: raw.map(normalize),
    datasetLoading: { ...get().datasetLoading, [name]: false },
  })
}
```

**App init** loads only `usTransborder` (~0.8 MB) so the Overview page renders immediately:
```js
init: async () => {
  const raw = await fetch(`${base}data/us_transborder.json`).then(r => r.json())
  set({ usTransborder: raw.map(normalize), loading: false })
}
```

**Page usage pattern:**
```jsx
export default function USMexico() {
  const { usMexico, loadDataset } = useTransborderStore()
  useEffect(() => { loadDataset('usMexico') }, [])

  if (!usMexico) return <LoadingSpinner />
  // ... render page with usMexico data
}
```

**Update normalize function** for TransBorder columns:
- Parse numeric: TradeValue, Weight, Year, Month, Lat, Lon
- Trim strings: Port, State, Mode, CommodityGroup, Commodity, Country, TradeType, Region
- Collapse empty strings to null

**Year range (per project instructions):** Include all available years (1993–2025) for now. The dashboard reads min/max year from the data (dynamic). We may decide later whether to limit the timeline shown in visualizations (e.g., via filter default or config).

**Remove aviation-specific code:**
- Remove `airportUtils.js` (GeoJSON indexing, airport enrichment)
- Remove `aviationHelpers.js` (aviation predicates like `isTxDomestic`)
- Remove `chatStore.js` and AI chat components (unless desired)

**Create new utilities:**
- `src/lib/portUtils.js` -- Port data helpers (aggregate by port, region grouping, coordinate lookup from `port_coordinates.json`, Mexican crossing lookup, El Paso/Ysleta combination logic)
- `src/lib/transborderHelpers.js` -- Domain predicates (`isTexasMexico(d)`, `isUSMexico(d)`), formatters (`formatCurrency`, `formatWeight`)
- `src/lib/insightEngine.js` -- Data-driven insight generator (see section 3.8)

## 3.2.1 El Paso / Ysleta Port Split Handling

**Background:** CBP separated Ysleta (port code 2401) from El Paso (port code 2402) as a distinct port of entry beginning **March 2020**. Prior to this, all Ysleta trade was reported under El Paso. This creates a discontinuity: El Paso drops from ~$77B (2019) to ~$29B (2020) while Ysleta appears at ~$41B — the total is consistent, but the individual port trends are misleading if shown naively.

**Strategy — combined by default, with optional split:**

The split boundary differs by chart granularity:
- **Monthly charts** (`monthlyTrends`): March 2020 is the exact split point. Ysleta data begins March 2020.
- **Annual charts** (all other datasets): 2021 is the effective split year. 2020 annual totals are a hybrid (Jan–Feb at old combined level + Mar–Dec at split level), making 2020 unreliable for port-level comparison. 2021 is the first full calendar year with clean separate data.

| Date Range | Default Display | Split Display |
|---|---|---|
| **Before split point only** | "El Paso + Ysleta" (single combined series) | Not available — Ysleta data doesn't exist separately |
| **After split point only** | "El Paso" and "Ysleta" (separate) | Same as default |
| **Mixed (spans split point)** | "El Paso + Ysleta" (combined into one series for continuity) | Split: "El Paso" and "Ysleta" shown separately, with a vertical annotation line at the split point explaining the change |

*Split point = March 2020 for monthly charts, 2021 for annual charts.*

**Implementation in `portUtils.js`:**

```js
/**
 * Combine El Paso (2402) and Ysleta (2401) into a single "El Paso + Ysleta" entry.
 * Used as default view to provide consistent trends across the 2020 split.
 *
 * @param {Array} data - array of data records with PortCode and Port fields
 * @param {boolean} combined - true = merge Ysleta into El Paso; false = keep separate
 * @returns {Array} data with Ysleta records relabeled (combined) or unchanged (split)
 */
function combineElPasoYsleta(data, combined = true) {
  if (!combined) return data
  return data.map(d => {
    if (d.PortCode === '2401' || d.PortCode === '2402') {
      return { ...d, Port: 'El Paso + Ysleta', PortCode: '2402' }
    }
    return d
  })
}
```

After relabeling, the calling code aggregates (sums TradeValue/Weight) by the grouped key as usual — the aggregation logic doesn't need to change.

**UI control:**
- A toggle switch on pages showing El Paso port data: "Show El Paso & Ysleta separately"
- Default: **off** (combined) — provides continuous trend line
- When toggled **on** (split mode) and the date range spans the split point:
  - Monthly trend charts show a vertical dashed line at March 2020 with tooltip: "CBP separated Ysleta from El Paso reporting beginning March 2020"
  - Annual trend charts show a vertical dashed line at 2021 with tooltip: "2021 is the first full year with El Paso and Ysleta reported separately"
  - Bar charts and tables show both ports as separate rows
- When the date range is entirely after the split point, the toggle defaults to **on** (split) since both ports naturally exist

**Affected pages:** US-Mexico Ports, Texas-Mexico (Ports tab, Overview tab), and any chart/table showing port-level data in the El Paso region.

**Map behavior:** In combined mode, the map shows a single marker at El Paso's coordinates labeled "El Paso + Ysleta". In split mode, both markers appear at their respective coordinates (2401 and 2402 from `port_coordinates.json`).

## 3.3 Update Filters

**Replace filter state in store:**
```js
filters: {
  year: [],            // multi-select (1993-2025)
  country: '',         // single-select: Canada, Mexico, or '' (All)
  tradeType: '',       // single-select: Export, Import, or '' (All)
  mode: [],            // multi-select: Rail, Truck, Pipeline, Air, Vessel, Other
  state: [],           // multi-select: US state names
  commodityGroup: [],  // multi-select: commodity group names
  port: [],            // multi-select: port names
  region: '',          // single-select: El Paso, Laredo, Pharr, or '' (All)
}
```

**Adapt `useCascadingFilters` dependencies** for TransBorder:
- Country selection limits available ports and states
- Region selection limits available ports (Texas pages only)

**Region filter** (Texas-Mexico pages only):
- Values: El Paso, Laredo, Pharr — these correspond to TxDOT districts along the Texas-Mexico border
- Port-to-region mapping defined in `01-Raw-Data/Texas_Ports.csv` (authoritative source for which ports belong to which region)
- Selecting a region filters to only the ports within that TxDOT district

## 3.4 Adapt Map Component

**Rename**: `AirportMap.jsx` -> `PortMap.jsx`

**Changes:**
- Replace airport markers with port-of-entry markers sized by trade value
- **Highlight border POEs**: Ports flagged as `BorderPOE=Yes` in `Texas_Ports.csv` are shown as primary markers. Non-border ports (airports, customs district catch-alls) are shown as smaller, muted markers or excluded from the map
- **Repurpose flight route arcs as trade flow arcs** (see below)
- **TxDOT district overlay** (Texas-Mexico pages): Load `02-Data-Staging/config/texas_border_districts.geojson` (17 KB, simplified from TxDOT boundaries) to render the 3 border district regions (El Paso, Laredo, Pharr) as semi-transparent polygon overlays on the map. Each district uses a distinct fill color at low opacity (~0.1) with a labeled centroid. When the Region filter is active, the selected district is highlighted (higher opacity) and non-selected districts are dimmed. This layer is togglable via a map control button.
- Update marker colors: U.S. ports `#0056a9`, Mexican ports `#df5c16`
- Update popups: port name, total trade value, exports/imports breakdown, top modes
- Default bounds: Texas-Mexico border region for Texas pages, full US-Mexico border for national view

**Trade Flow Arcs (adapted from Airport Dashboard flight route arcs):**

The Airport Dashboard renders curved SVG arcs between origin/destination airports. Repurpose this rendering code for trade flow visualization:

- **Data**: Each port has a U.S.-side coordinate (from `02-Data-Staging/config/port_coordinates.json` — sourced from BTS Border Crossing Entry Data, Socrata dataset `keg4-3bc2`) and a corresponding Mexican-side crossing point. For ports where the Mexican counterpart is known (e.g., Laredo <-> Nuevo Laredo, El Paso <-> Ciudad Juarez), draw arcs between the pair.
- **Arc width**: Proportional to trade value at that port (min 1.5px, max 6px, scaled linearly within the visible ports)
- **Arc color**: Export arcs `#0056a9` (blue, flowing south), Import arcs `#df5c16` (orange, flowing north). When showing both, use export color with 70% opacity.
- **Arc style**: Quadratic Bezier curve (same as airport arcs) with curvature offset proportional to distance, so short-distance pairs don't overlap markers
- **Interaction**: Hover highlights the arc (full opacity + 2px stroke increase) and shows tooltip with port pair name, trade value, and top commodity
- **Toggle**: `showFlowArcs` prop (default `true` on US-Mexico Ports and Texas-Mexico Ports tab, `false` elsewhere). User can toggle via a map control button (layers icon).
- **Performance**: Only render arcs for ports currently visible after filtering (not all 300+ ports). Limit to top 15 ports by trade value if total count exceeds 20.
- **Mexican crossing coordinates**: Maintain a static lookup in `src/lib/portUtils.js`:
  ```js
  const MEXICAN_CROSSINGS = {
    'Laredo':       { name: 'Nuevo Laredo',    lat: 27.4767, lon: -99.5075 },
    'El Paso':      { name: 'Ciudad Juarez',   lat: 31.6904, lon: -106.4245 },
    'Hidalgo/Pharr':{ name: 'Reynosa',         lat: 26.0508, lon: -98.2279 },
    'Brownsville':  { name: 'Matamoros',        lat: 25.8796, lon: -97.5044 },
    'Eagle Pass':   { name: 'Piedras Negras',   lat: 28.7000, lon: -100.5236 },
    'Del Rio':      { name: 'Ciudad Acuna',     lat: 29.3236, lon: -100.9317 },
    'Presidio':     { name: 'Ojinaga',          lat: 29.5603, lon: -104.4083 },
    'Nogales':      { name: 'Nogales, Son.',    lat: 31.3024, lon: -110.9559 },
    'San Ysidro':   { name: 'Tijuana',          lat: 32.5347, lon: -117.0234 },
    'Otay Mesa':    { name: 'Tijuana (Otay)',   lat: 32.5536, lon: -116.9390 },
    'Calexico':     { name: 'Mexicali',         lat: 32.6633, lon: -115.4989 },
    // ... extend as needed
  }
  ```
  Ports without a matching Mexican crossing simply show markers without arcs.

## 3.5 Update Navigation & Branding

**MainNav.jsx** -- Replace `navItems`:
```js
const navItems = [
  { to: '/',              label: 'Overview' },
  { to: '/us-mexico',     label: 'US-Mexico' },
  { to: '/texas-mexico',  label: 'Texas-Mexico' },
  { to: '/trade-by-mode', label: 'By Mode' },
  { to: '/commodities',   label: 'Commodities' },
  { to: '/trade-by-state',label: 'By State' },
  { to: '/about',         label: 'About' },
]
```

**SiteHeader.jsx** -- Update title to "BTS TransBorder Freight Dashboard"
**Footer.jsx** -- Add BTS data attribution and source links

## 3.6 App Router

**App.jsx** -- Replace routes:
```jsx
<Route path="/" element={<Overview />} />
<Route path="/us-mexico" element={<USMexico />} />
<Route path="/us-mexico/ports" element={<USMexicoPorts />} />
<Route path="/texas-mexico" element={<TexasMexico />} />
<Route path="/trade-by-mode" element={<TradeByMode />} />
<Route path="/commodities" element={<TradeByCommodity />} />
<Route path="/trade-by-state" element={<TradeByState />} />
<Route path="/about" element={<About />} />
<Route path="/embed/:pageId/:chartId" element={<EmbedPage />} />
```

---

## Dashboard Pages

### Page Architecture
```
/                    Overview (Full US, both countries)
/us-mexico           US-Mexico Trade
/us-mexico/ports     US-Mexico Port Analysis (with map)
/texas-mexico        Texas-Mexico Deep-Dive (tabbed)
/trade-by-mode       Mode Analysis (full dataset)
/commodities         Commodity Analysis (full dataset)
/trade-by-state      State-Level Trade (full dataset)
/about               Data Documentation
```

### Page Template Pattern (from Airport Dashboard)

Every page follows this structure. Pages that use lazy-loaded datasets call `loadDataset()` on mount and show a spinner until the data arrives. Pages using `usTransborder` (loaded at app init) skip this step.

```jsx
export default function SomePage() {
  const { datasetName, loadDataset, filters } = useTransborderStore()
  const [localFilters, setLocalFilters] = useState({})

  // 0. Lazy-load dataset on mount (skip for pages using usTransborder)
  useEffect(() => { loadDataset('datasetName') }, [])
  if (!datasetName) return <LoadingSpinner />

  // 1. Compute filter options
  const years = useMemo(() => [...new Set(data.map(d => d.Year))].sort(), [data])
  const modes = useMemo(() => [...new Set(data.map(d => d.Mode))].sort(), [data])

  // 2. Apply filters -> filtered data
  const filtered = useMemo(() => data.filter(d => {
    if (localFilters.year.length && !localFilters.year.includes(d.Year)) return false
    // ... more filters
    return true
  }), [data, localFilters])

  // 3. filteredNoYear for trend charts (all filters EXCEPT year)
  const filteredNoYear = useMemo(() => data.filter(d => {
    // same as filtered but skip year check
  }), [data, localFilters])

  // 4. Aggregate for each visualization
  const stats = useMemo(() => computeStats(filtered), [filtered])
  const barData = useMemo(() => aggregateForBar(filtered), [filtered])
  const trendData = useMemo(() => aggregateForTrend(filteredNoYear), [filteredNoYear])

  // 5. Build active filter tags
  const activeTags = buildActiveTags(localFilters)

  return (
    <DashboardLayout
      hero={<HeroBanner title="..." subtitle="..." />}
      filters={<FilterSidebar tags={activeTags} onReset={resetFilters}>
        <FilterMultiSelect label="Year" options={years} ... />
        <FilterSelect label="Trade Type" options={['Export','Import']} ... />
      </FilterSidebar>}
    >
      <SectionBlock>
        <StatCardGrid stats={stats} />
      </SectionBlock>
      <SectionBlock alt>
        <ChartCard title="Trade Trends" footnote="...">
          <LineChart data={trendData} xKey="Year" yKey="TradeValue" />
        </ChartCard>
      </SectionBlock>
      <SectionBlock>
        <ChartCard title="Top Ports">
          <BarChart data={barData} xKey="Port" yKey="TradeValue" horizontal />
        </ChartCard>
      </SectionBlock>
    </DashboardLayout>
  )
}
```

---

### Page 1: Overview (`pages/Overview/index.jsx`)

**Template**: Adapt from Airport's `Overview/index.jsx`
**Data**: `usTransborder` (full US, both countries)
**Layout**: No filter sidebar (landing page pattern)

**Sections:**
1. **Hero** with HeroStardust animation -- "U.S. TransBorder Freight Data (1993-2025)"
2. **Narrative intro** -- Brief context about the TransBorder program
3. **InsightCallout cards** -- 2-3 data-driven findings computed at runtime by `insightEngine.js` (see section 3.8)
4. **StatCards** (4): Total Trade, Total Exports, Total Imports, Year-over-Year Change
5. **LineChart**: Annual trade trends 1993-2025 (Exports vs Imports, two series)
6. **DonutChart**: Trade by Transportation Mode (interactive)
7. **StackedBarChart**: Canada vs Mexico trade share by year
8. **BarChart**: Top 10 States by trade value (horizontal)
9. **Navigation cards** -- "Our Approach" linking to US-Mexico, Texas-Mexico, analytical pages
10. **Data Source section** with download buttons

---

### Page 2: US-Mexico Trade (`pages/USMexico/index.jsx`)

**Template**: New page, modeled on Airport's `USMexico/index.jsx`
**Data**: `usMexico` + `usTransborder` filtered to Country=Mexico
**Filters**: Year (multi), TradeType (single), Mode (multi)

**Sections:**
1. **Hero banner** -- "U.S.-Mexico TransBorder Freight"
2. **StatCards** (4): Total US-Mexico Trade, Exports, Imports, Port Count
3. **LineChart**: US-Mexico trade trends over time (filteredNoYear)
4. **DonutChart**: Trade by Mode
5. **BarChart**: Top 15 Ports of Entry (horizontal)
6. **TreemapChart**: Top commodity groups (click to drill into HS 2-digit codes within group -- see section 3.9)
7. **StackedBarChart**: Mode composition by year
8. **DataTable**: Port-level detail (Port, State, Total, Exports, Imports)

---

### Page 3: US-Mexico Ports (`pages/USMexicoPorts/index.jsx`)

**Template**: New page
**Data**: `usMexico`
**Filters**: Year (multi), TradeType (single), Mode (multi), State (multi)

**Sections:**
1. **Hero banner** -- "U.S.-Mexico Ports of Entry"
2. **StatCards** (4): Total Port Trade, Port Count, Top Port Name, Top Mode
3. **PortMap** (Leaflet): Port locations with proportional markers sized by trade value
4. **BarChart**: Ports ranked by trade value (horizontal)
5. **LineChart**: Top 5 port trends over time (multi-series, filteredNoYear)
6. **DataTable**: All ports with State, Total, Exports, Imports, Top Mode

---

### Page 4: Texas-Mexico Deep-Dive (`pages/TexasMexico/index.jsx`)

**Template**: Adapt from Airport's `TexasMexico/index.jsx` (tabbed structure)
**Data**: `texasMexico` + `monthlyTrends` (for Monthly tab)
**Filters**: Year (multi), TradeType (single), Mode (multi), Region (single)

**Tabs** (each in `pages/TexasMexico/tabs/`):

**Overview Tab** (`OverviewTab.jsx`):
- StatCards (5): Total TX-MX Trade, Exports, Imports, Port Count, Top Mode
- LineChart: TX-MX trade trends
- DonutChart: Trade by mode
- BarChart: Top ports

**Ports Tab** (`PortsTab.jsx`):
- PortMap: Texas border ports with markers
- BarChart: Port ranking
- LineChart: Top 5 port trends
- DataTable: Port detail

**Commodities Tab** (`CommoditiesTab.jsx`):
- TreemapChart: Top commodity groups (click to drill into HS 2-digit codes within group -- see section 3.9)
- BarChart: Top 10 individual commodities
- LineChart: Top 5 commodity group trends
- DataTable: Commodity detail

**Modes Tab** (`ModesTab.jsx`):
- BarChart: Mode comparison
- StackedBarChart: Mode composition by year
- DivergingBarChart: Import/Export balance by mode
- DataTable: Mode detail

**Monthly Tab** (`MonthlyTab.jsx`):
- LineChart: Monthly trends (uses `monthlyTrends` dataset)
- Heatmap or StackedBarChart: Month x Year matrix
- DataTable: Monthly detail

---

### Page 5: Trade by Mode (`pages/TradeByMode/index.jsx`)

**Template**: New page
**Data**: `usTransborder`
**Filters**: Year (multi), TradeType (single), Country (single)

**Sections:**
1. **Hero banner** -- "TransBorder Trade by Transportation Mode"
2. **StatCards** (4): Total Trade, Top Mode Name + Value, 2nd Mode, 3rd Mode
3. **DonutChart**: Mode share
4. **BarChart**: Mode comparison (vertical)
5. **LineChart**: Mode trends over time (multi-series, filteredNoYear)
6. **StackedBarChart**: Mode composition by year
7. **DivergingBarChart**: Import/Export balance by mode
8. **DataTable**: Mode detail (Mode, Total, Exports, Imports, % Share)

---

### Page 6: Commodity Analysis (`pages/TradeByCommodity/index.jsx`)

**Template**: New page
**Data**: `commodityDetail`
**Filters**: Year (multi), TradeType (single), Mode (multi), Country (single)

**Sections:**
1. **Hero banner** -- "TransBorder Trade by Commodity"
2. **StatCards** (4): Total Trade, Commodity Group Count, Top Group Name, Top Individual Commodity
3. **TreemapChart**: Top 12 commodity groups (click to drill into HS 2-digit codes within group -- see section 3.9)
4. **BarChart**: Top 10 individual commodities (horizontal)
5. **LineChart**: Top 5 commodity group trends (multi-series, filteredNoYear)
6. **DataTable**: Commodity detail (Group, Commodity, SCTG Code, Total, Exports, Imports)

---

### Page 7: Trade by State (`pages/TradeByState/index.jsx`)

**Template**: New page
**Data**: `usStateTrade`
**Filters**: Year (multi), TradeType (single), Mode (multi), Country (single)

**Sections:**
1. **Hero banner** -- "TransBorder Trade by U.S. State"
2. **StatCards** (4): Total Trade, State Count, Top State Name, Top State Value
3. **BarChart**: States ranked by trade value (horizontal, top 15)
4. **LineChart**: Top 5 state trends (multi-series, filteredNoYear)
5. **DataTable**: State detail (State, Total, Exports, Imports, Top Mode)

---

### Page 8: About / Data Documentation (`pages/About/index.jsx`)

**Template**: New page (informational, no charts)
**Layout**: Single column, no filter sidebar

**Content:**

- **Data source**: BTS TransBorder program overview, link to BTS source data
- **Data coverage**: April 1993 - 2025 (monthly, ~39.5M records across 3 cross-tabulation tables)
- **Schema documentation**: Legacy (1993-2006, up to 24 tables) vs Modern (2007+, 3 tables) format differences
- **BTS Terminology** (must match BTS definitions exactly):
  - Port State: The U.S. state where the Port of Entry is located
  - Port Coast: The U.S. coast where the Port of Entry is located
  - Port Border: The border (Canadian or Mexican) where the Port of Entry is located
  - HS Codes: Harmonized Schedule 2-digit commodity codes (NOT SCTG)
- **Known data limitations** (confirmed from actual data, see Phase 2 section 2.3.1):
  - Shipment weight for exports is only available for Air and Vessel modes. For Truck, Rail, Pipeline, Mail, and Other/Unknown exports, weight is zero/unavailable. Import weight is available for all modes.
  - Freight charges are partially available for exports (~50%) but near-complete for imports.
  - Port x Commodity cross-tabulation (DOT3) only exists from January 2007 onward.
  - Legacy air/vessel records (1993-2006, ~3.6M rows) have unknown trade direction (Export vs Import).
  - DF (Domestic/Foreign) indicator is only meaningful for exports (1=domestic origin, 2=re-export).
- **Port history changes**:
  - CBP separated the Ysleta Port of Entry (code 2401) from El Paso (code 2402) beginning with March 2020 data. Pre-March 2020, Ysleta activity is included under El Paso. Time-series comparisons for these ports must account for this split.
  - Document any other port renames/splits discovered during processing.
- **Methodology**: How raw data was processed and aggregated (link to Phase 2 plan)
- **Links**: BTS source data, BTS data dictionary, Census Schedule D port codes
- **Download section**: Links to download the processed CSVs

**Dashboard footnotes requirement**: Every chart or table in the dashboard that displays weight, freight charges, or port-level data must include a contextual footnote or info-tooltip referencing the relevant caveat above. These notes are NOT optional -- they match what BTS shows on their own dashboard and are critical for correct interpretation.

---

## 3.7 Embeddable Widget Export

**Enhancement to ChartCard** -- Add an "Embed" action button alongside existing CSV/PNG/Fullscreen buttons.

**Purpose:** Allow TxDOT districts, MPOs, and partner agencies to embed individual charts from the dashboard into their own reports or websites without rebuilding the visualization.

**Two export formats:**

1. **Static SVG** -- Self-contained SVG file with embedded styles. No dependencies. Opens in browsers, Illustrator, PowerPoint. Generated from the existing PNG export pipeline but outputting SVG instead of rasterizing.
   - File: `Title_YYYY-MM-DD.svg`
   - Includes: chart content, axis labels, legend, title, footnote, BTS attribution
   - Does NOT include: filters, interactivity, animations

2. **Iframe snippet** -- Copyable HTML `<iframe>` tag pointing to the deployed dashboard with query params that isolate a single chart in a minimal chrome-free layout.
   - URL pattern: `https://{deploy-url}/#/embed/{pageId}/{chartId}?year=2024&mode=Truck`
   - Route: `/embed/:pageId/:chartId` renders only the ChartCard content (no nav, no sidebar, no hero)
   - Query params map to filter state, allowing pre-filtered embeds
   - Responsive: iframe scales to container width

**Implementation:**

- **New component**: `src/components/ui/EmbedModal.jsx` -- Modal with two tabs (SVG / Iframe), preview, and copy-to-clipboard button
- **New route**: Add `/embed/:pageId/:chartId` to App.jsx -- renders `EmbedPage.jsx` which loads the store, applies query-param filters, and renders a single ChartCard
- **ChartCard change**: Add `embedId` prop (string). When present, adds an Embed button (Code icon from Lucide) to the action bar. Clicking opens EmbedModal.
- **SVG export**: Extend the existing PNG export function. Instead of `canvas.toDataURL()`, serialize the SVG node via `new XMLSerializer().serializeToString(svgEl)`, inject computed styles inline, and trigger download.

**Embed route structure:**
```jsx
<Route path="/embed/:pageId/:chartId" element={<EmbedPage />} />
```

`EmbedPage.jsx`:
```jsx
export default function EmbedPage() {
  const { pageId, chartId } = useParams()
  const searchParams = useSearchParams()
  // Apply filters from query params
  // Render only the matching ChartCard in a minimal wrapper (no DashboardLayout)
  // Include small "Powered by BTS TransBorder Dashboard" attribution footer
}
```

## 3.8 Data-Driven Insight Engine

**File**: `src/lib/insightEngine.js`

**Purpose:** Generate human-readable insight strings from the actual data, so InsightCallout cards auto-update when new data years are added. Replaces hardcoded insight text.

**API:**
```js
import { generateInsights } from '../lib/insightEngine'

// Returns array of { text, variant, icon } objects
const insights = useMemo(() => generateInsights(filteredData, {
  scope: 'overview',    // 'overview' | 'us-mexico' | 'texas-mexico' | 'mode' | 'commodity' | 'state'
  latestYear: 2025,
}), [filteredData])
```

**Insight templates per scope:**

| Scope | Example Output | Computation |
|---|---|---|
| `overview` | "Truck freight accounts for 67% of US-Mexico trade in 2025" | `sum(TradeValue where Mode=Truck & Country=Mexico) / sum(TradeValue where Country=Mexico)` |
| `overview` | "US-Mexico trade grew 34% from 2020 to 2025" | `(sum(latest year) - sum(base year)) / sum(base year)` |
| `overview` | "Mexico surpassed Canada as the #1 U.S. trading partner in 2023" | Compare `sum(TradeValue)` by country per year, find crossover |
| `us-mexico` | "Laredo handles 38% of all US-Mexico surface trade" | `sum(TradeValue where Port=Laredo & Mode in [Truck,Rail]) / sum(TradeValue where Mode in [Truck,Rail])` |
| `texas-mexico` | "Mineral fuels (HS 27) account for 41% of Texas-Mexico imports by weight" | `sum(Weight where HSCode=27 & TradeType=Import) / sum(Weight where TradeType=Import)` |
| `mode` | "Rail freight has grown 2.8x since 2007, the fastest growth of any mode" | Growth rate per mode across available years |
| `commodity` | "Vehicles (HS 87) overtook Electrical machinery (HS 85) as the top export in 2019" | Compare top commodity rankings across years, find rank changes |
| `state` | "Texas accounts for 52% of all US-Mexico trade by value" | State share of total |

**Variant mapping:** Insights auto-assign variants based on content:
- `highlight` (green) -- growth, records, milestones
- `warning` (orange) -- declines, disruptions
- `neutral` (blue) -- structural facts, proportions

**Rules:**
- Each scope returns 2-3 insights (configurable via `maxInsights` option)
- Insights use `formatCurrency`, `formatCompact`, and percentage formatters from `transborderHelpers.js`
- All insights include the year(s) they reference, so they remain meaningful as data updates
- If filtered data is too sparse to compute an insight, that insight is skipped (never show "NaN%" or "undefined")

## 3.9 Treemap Drilldown

**Enhancement to TreemapChart usage** -- Add click-to-drill behavior on commodity treemaps.

**Concept:** HS commodity codes are hierarchical. The dashboard groups ~98 HS 2-digit codes into ~15 high-level `CommodityGroup` categories. The treemap initially shows commodity groups. Clicking a group cell drills into its constituent HS 2-digit codes.

**Behavior:**

1. **Level 1 (default):** Treemap shows `CommodityGroup` cells sized by `TradeValue`. Each cell labeled with group name + formatted value. This is the current plan.

2. **Click a cell:** Treemap transitions to **Level 2**, showing only the HS 2-digit commodities within the clicked group. A breadcrumb appears above the chart: `All Groups > [clicked group name]`. Cell labels show individual commodity descriptions + values.

3. **Click breadcrumb "All Groups"** or press **Back button**: Returns to Level 1 with reverse transition.

4. **No deeper drilling:** Two levels only (group -> HS 2-digit). HS 2-digit is the finest granularity in TransBorder data.

**Implementation:**

- **State**: Each page that uses a drillable treemap maintains `const [treemapDrill, setTreemapDrill] = useState(null)` where `null` = Level 1, and a string value = the selected CommodityGroup name for Level 2.
- **Data switching**: When `treemapDrill` is set, filter `commodityDetail` (or equivalent dataset) to `CommodityGroup === treemapDrill`, then aggregate by individual `Commodity` for the treemap data.
- **TreemapChart component**: No changes to the component itself. It remains data-agnostic. The drilldown is handled by the page passing different data + an `onCellClick` callback.
- **Transition**: D3's treemap layout recalculates on data change. The existing fade animation (500ms, 30ms/cell) handles the visual transition naturally.
- **Breadcrumb**: Render above the ChartCard as a small text link: `All Groups` (clickable) ` > Mineral fuels, oils, waxes` (current). Use `text-sm text-secondary` styling.
- **ChartCard title**: Updates dynamically -- Level 1: "Trade by Commodity Group", Level 2: "Mineral fuels, oils, waxes -- HS 2-Digit Detail"

**Pages with drillable treemaps:**
- US-Mexico Trade (Page 2, section 6)
- Texas-Mexico Commodities Tab (Page 4)
- Commodity Analysis (Page 6, section 3)

---

## File Structure

```
WebApp/src/
  stores/
    transborderStore.js          (adapted from aviationStore)
  lib/
    portUtils.js                 (new - port data helpers + MEXICAN_CROSSINGS lookup)
    transborderHelpers.js        (new - domain predicates/formatters)
    insightEngine.js             (new - data-driven insight generator)
    useCascadingFilters.js       (reuse as-is)
    useChartResize.js            (reuse as-is)
    chartColors.js               (reuse, may update palette)
    downloadCsv.js               (reuse as-is)
    downloadColumns.js           (update column maps for new data)
  pages/
    Overview/index.jsx           (adapt from Airport)
    USMexico/index.jsx           (new)
    USMexicoPorts/index.jsx      (new)
    TexasMexico/
      index.jsx                  (adapt from Airport)
      tabs/OverviewTab.jsx       (new)
      tabs/PortsTab.jsx          (new)
      tabs/CommoditiesTab.jsx    (new)
      tabs/ModesTab.jsx          (new)
      tabs/MonthlyTab.jsx        (new)
    TradeByMode/index.jsx        (new)
    TradeByCommodity/index.jsx   (new)
    TradeByState/index.jsx       (new)
    About/index.jsx              (new)
  components/
    charts/                      (all 9 reused as-is from Airport)
    maps/PortMap.jsx             (adapted from AirportMap, with trade flow arcs + district overlay)
    layout/                      (reused: DashboardLayout, SiteHeader, MainNav, Footer)
    filters/                     (reused: FilterSidebar, FilterBar, FilterSelect, FilterMultiSelect)
    ui/                          (reused: ChartCard, DataTable, StatCard, InsightCallout, etc.)
    ui/EmbedModal.jsx            (new - embed export modal with SVG/Iframe tabs)
  pages/
    EmbedPage.jsx                (new - minimal chrome-free single-chart renderer for iframe embeds)
```

## Critical Reference Files

All paths relative to `c:/Users/UNT/UNT System/TxDOT IAC 2025-26 - General/`

**Project instruction references (UI/UX + visualizations):**
| Reference | Purpose |
|-----------|---------|
| **Original BTS dashboard** (https://data.bts.gov/stories/s/myhq-rm6q) | Visualization inspiration |
| **TxDOT Dashboard** (https://tiger-unt.github.io/Data-Dashboard-Boilerplate/#/border-ports) | Analytical components to re-implement (border ports, trade views) |
| **Airport Dashboard (07_WebApp)** | UI design patterns and architecture (project clone) |

| File | Purpose |
|---|---|
| `Task 6/.../07_WebApp/src/stores/aviationStore.js` | Core store to fork -> `transborderStore.js` |
| `Task 6/.../07_WebApp/src/App.jsx` | Router to adapt |
| `Task 6/.../07_WebApp/src/pages/Overview/index.jsx` | Overview page template |
| `Task 6/.../07_WebApp/src/pages/TexasMexico/index.jsx` | Tabbed page template |
| `Task 6/.../07_WebApp/src/components/maps/AirportMap.jsx` | Map component to adapt |
| `Task 6/.../07_WebApp/src/lib/useCascadingFilters.js` | Cascading filter hook |
| `Task 6/.../07_WebApp/src/lib/airportUtils.js` | Utility patterns to adapt |
| `Task 6/.../07_WebApp/src/components/charts/*.jsx` | All 9 chart types (data-agnostic) |
| `Data-Dashboard-Boilerplate/.../pages/BorderPorts/index.jsx` | Reference: border port analytics |
| `Data-Dashboard-Boilerplate/.../stores/tradeStore.js` | Reference: trade data normalization |

## Deliverables Checklist

- [ ] Post-Phase-2 cleanup complete (`01-Raw-Data/unpacked/` and `02-Data-Staging/cleaned/` deleted after validation)
- [ ] WebApp/ directory created (forked from Airport Dashboard)
- [ ] package.json and vite.config.js updated
- [ ] transborderStore.js -- new data store with 6 datasets
- [ ] portUtils.js + transborderHelpers.js -- new utility files
- [ ] insightEngine.js -- data-driven insight generator with templates per scope
- [ ] PortMap.jsx -- adapted map component with trade flow arcs
- [ ] MainNav, SiteHeader, Footer -- updated branding and navigation
- [ ] App.jsx -- updated router with 9 routes (8 pages + embed route)
- [ ] 8 page components implemented
- [ ] EmbedPage.jsx + EmbedModal.jsx -- embeddable widget export system
- [ ] Treemap drilldown -- click-to-drill on commodity treemaps (3 pages)
- [ ] downloadColumns.js -- updated export column maps
- [ ] `npm run dev` runs successfully with all pages
