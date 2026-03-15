# Phase 4: Design Principles & Testing/Deployment

## Context

All design principles are inherited from the Airport Dashboard's Design Playbook (`Dashboard_Design_Playbook.md`, 118KB). Chart, filter, layout, and UI components are reused as-is from the fork -- only data and domain-specific labels change. This document serves as the authoritative reference for maintaining design consistency. Per project instructions: use the **Original BTS dashboard** (https://data.bts.gov/stories/s/myhq-rm6q) for **visualization inspiration** where applicable, in addition to the Airport Dashboard playbook.

**Source Playbook**: `c:/Users/UNT/UNT System/TxDOT IAC 2025-26 - General/Task 6 - Airport Connectivity/07_WebApp/Dashboard_Design_Playbook.md`

---

## A. Design Principles

### A.1 Color System

**Brand Palette (9 chart colors, assigned in order by D3 ordinal scale):**
| # | Name | Hex | Usage |
|---|---|---|---|
| 1 | TxDOT Blue | `#0056a9` | Primary, default single-series fill, links, buttons, U.S. markers |
| 2 | Dark Blue | `#002e69` | Nav background, gradient endpoint, hover states, active nav |
| 3 | Dark Green | `#196533` | Chart series 3, positive trends, highlight callouts |
| 4 | Light Orange | `#df5c16` | Chart series 4, warnings, Mexico markers, selected arcs |
| 5 | Dark Purple | `#5f0f40` | Chart series 5 |
| 6 | Light Green | `#8ec02d` | Chart series 6 |
| 7 | Light Yellow | `#f2ce1b` | Chart series 7, gold accents, map halos |
| 8 | Light Brown | `#c5bbaa` | Chart series 8 |
| 9 | Red | `#d90d0d` | Chart series 9 (use last), errors, negative trends, outliers |

**Semantic Colors:**
```
Surface:        #ffffff    Background, cards, tooltips
Surface Alt:    #f5f7f9    Section alternation, hover states, page header
Surface Dark:   #333f48    Dark backgrounds (rarely used)
Border:         #d1d5db    Standard borders, table lines, axis lines
Border Light:   #c4c9cf    Subtle borders (header, page header)
Text Primary:   #333f48    Headings, body text, chart values
Text Secondary: #5a6872    Labels, descriptions, axis text, muted content
Text Inverse:   #ffffff    Text on dark/colored backgrounds
```

**Chart Color Rules:**
- Single-series: Always TxDOT Blue (`#0056a9`)
- Multi-series: D3 ordinal scale cycling through 9-color palette in order
- Per-datum coloring via optional `colorAccessor(d)` function

**Opacity Conventions:**
```
100%  Active/selected, primary text
 85%  Map markers normal, scatter dots normal
 55%  Donut box fill, dim non-selected (color + '55')
 40%  Non-selected bar dim (color + '40')
 33%  Non-selected donut dim (color + '55')
 30%  Stacked bar hover dim
 10%  Icon badges, filter tag backgrounds, hover states
2-15% Area chart gradient fill (top to bottom)
```

**Gradients:**
```
gradient-blue:       linear-gradient(to right, #002e69, #0056a9)  -- Hero banners
gradient-blue-light: linear-gradient(135deg, #1a6fbe, #3a8fd4)   -- Highlighted stat card
```

**Map Marker Colors:**
| Category | Fill | Stroke |
|---|---|---|
| U.S./Texas | `#0056a9` | `#003d75` |
| U.S. Other | `#94c4de` | `#6d9bb8` |
| Mexico | `#df5c16` | `#a84410` |
| Border highlight | -- | `#E8B923` (gold, 2.5px) |

### A.2 Typography

**Font Stack:**
```
Primary:   'IBM Plex Sans', Verdana, Aptos, Arial, sans-serif
Condensed: 'IBM Plex Sans Condensed', Verdana, Arial, sans-serif
Monospace: 'IBM Plex Mono', 'JetBrains Mono', monospace
```

**Minimum Font Size: 16px** -- All text >= 16px. Exceptions only: map popups (13px), map attribution (10px).

**Type Scale:**
| Token | Pixels | Usage |
|---|---|---|
| xs-base | 16px | Body, labels, filter chips, chart labels |
| md | 18px | H6, emphasized text |
| lg | 20px | H5, section subheadings |
| xl | 24px | H4, section headings |
| 2xl | 30px | H3, stat values, page titles (desktop) |
| 3xl | 36px | H2, hero titles (desktop) |
| 4xl | 48px | H1, primary hero (rare) |

**Font Weights:** Light 300 (rare) | Normal 400 (body) | Medium 500 (labels, nav) | Semibold 600 (headings, axis labels) | Bold 700 (stat values, chart titles)

**Fullscreen Scaling:** `Math.round(Math.max(18, Math.min(22, 14 + width / 200)))` px

### A.3 Chart Components (9 Types)

All charts are **data-agnostic** -- they receive `data`, `xKey`, `yKey`, formatters as props.

| Chart | Use For | Default Height | Animation |
|---|---|---|---|
| **LineChart** | Time-series trends | 300px + legend | Draw (stroke-dashoffset), 600ms, 200ms/series |
| **BarChart** | Rankings (H/V) | H: max(220, count x 32+margins); V: 320px | Width/height grow, 600ms, 30ms/bar |
| **StackedBarChart** | Category breakdown over time | 320px | Upward growth, 600ms, 20ms col + 100ms layer |
| **DonutChart** | Proportional share | 300px max diameter | Fade 0->1, 600ms, 60ms/slice |
| **TreemapChart** | Hierarchical area comparison | Responsive | Fade 0->0.85, 500ms, 30ms/cell |
| **DivergingBarChart** | Bilateral (export/import) balance | max(240, count x 36+margins) | Center outward, 600ms, 30ms/bar |
| **LollipopChart** | Ranked data with long labels | Scales with data | Stem grow, 600ms, 30ms/item |
| **BoxPlotChart** | Statistical distribution | Responsive | Expand from center, 600ms |
| **ScatterPlot** | Two-variable relationships | Responsive | Fade 0->1, 500ms, 40ms/point |

**Key Behaviors:**
- Responsive via `useChartResize()` hook
- LineChart: zoom/pan with D3 brush, reports range to `ZoomRangeContext`
- Animations: run once per mount (tracked via `useRef`), disabled during zoom
- **Anti-pattern**: Never read `containerHeight` for normal SVG height -- causes feedback loop. Only use in fullscreen.

### A.4 ChartCard Wrapper

- **Header**: Title (bold 16px) + subtitle (normal, secondary) + action buttons (CSV, PNG, Fullscreen, Reset zoom)
- **Footnote**: Via `footnote` prop only -- never as children (causes clipping anti-pattern)
- **Empty state**: Centered italic message, 192px height
- **Zoom integration**: `ZoomRangeContext` -- CSV export auto-filters to visible range
- **Styling**: White bg, rounded-xl (12px), 1px border, xs shadow -> sm on hover (300ms)

### A.5 Filter Panes

**Desktop (>= 1024px):** Sticky right sidebar, 288px (w-72), border-left 1px, z-30
**Mobile (< 1024px):** Inline FilterBar, horizontal scroll, collapsible

**Filter Types:**
- `FilterSelect` -- Single-select dropdown (Country, TradeType, Region)
- `FilterMultiSelect` -- Checkbox dropdown, stays open (Year, Mode, State, CommodityGroup, Port)

**Active Tags:** Pill-shaped, gray bg, 16px text, X to remove
**Reset:** RotateCcw button, shown only when filters active
**Cascading:** `useCascadingFilters()` -- dependent filters auto-sanitized

**Four Filtered Data Variants:**
1. `filteredData` -- All filters (stat cards, rankings, tables, maps)
2. `filteredNoYear` -- All except year (trend line charts -- shows full time range)
3. `filteredWithDefaults` -- Fallback for empty selections
4. `globalMax` -- Across all years for stable axis scaling

### A.6 StatCard / KPI

**Structure:** Icon badge (top-right) | Uppercase label + year | Bold value (30/36px) | Trend arrow + %

**Variants:** Default (white, border), Primary (gradient-blue, white text), Secondary (gradient-blue-light, white text)

**Grid:** `sm:grid-cols-2 lg:grid-cols-4` with CSS subgrid alignment
**Animation:** Fade-up 12px, 500ms, 80ms stagger per card

### A.7 Layout System

**Page Shell:** SiteHeader (48px) -> MainNav (48px, sticky, brand-blue `#0056a9`) -> PageHeader (breadcrumbs, bg surface-alt) -> DashboardLayout -> Footer

**DashboardLayout:** `flex-col lg:flex-row` -- content `flex-1` + sidebar w-72 sticky

**SectionBlock:** 64px vertical padding, 32px horizontal. Alternating white / surface-alt for visual rhythm.

**Spacing Scale:**
```
space-1:  4px    space-2:  8px    space-3: 12px   space-4: 16px
space-5: 20px    space-6: 24px    space-8: 32px   space-10: 40px
space-12: 48px   space-16: 64px   space-24: 96px
```

**Responsive Breakpoints:**
| Break | Width | Changes |
|---|---|---|
| Default | <640px | Single column, hamburger nav, inline filters |
| sm | >=640px | 2-col stat grids |
| md | >=768px | Desktop nav, 2-col chart grids |
| lg | >=1024px | Filter sidebar appears, 3-4 col grids |
| xl | >=1280px | Full content width |

### A.8 Map

**Tech:** Leaflet + React-Leaflet, OpenStreetMap tiles

**Markers:** Circle, sized by value. U.S. `#0056a9`/stroke `#003d75`, Mexico `#df5c16`/stroke `#a84410`. Border highlight: gold `#E8B923` 2.5px halo.

**Interactions:** Hover 24->28px, opacity 85->100%. Click -> popup. Scroll wheel disabled (prevents accidental zoom).

**Popups:** Safe DOM APIs (no innerHTML). Port name, trade value, exports/imports, top modes.

### A.9 DataTable

- Sortable (single-column), paginated (10/25/50/100)
- Sizing: `w-fit max-w-full mx-auto` (never `w-full`)
- Alternating rows (#f5f7f9), hover gray
- Fullscreen page size: `Math.floor((containerHeight - 100) / 44)`
- Formatters: `formatCompact()` counts, `formatCurrency()` dollars, `fmtLbs()` weight

### A.10 Page Composition (Nine-Step Pattern)

1. **Hero Banner** -- gradient-blue, HeroStardust, white title/subtitle
2. **Narrative** -- Prose explaining why the data matters
3. **Insight Callouts** -- 2-3 key findings (highlight/warning/neutral variants)
4. **KPI Stat Cards** -- 4-5 headline metrics with trends
5. **Map** -- Spatial context (port locations)
6. **Trend Charts** -- Time-series using `filteredNoYear` (unaffected by year filter)
7. **Detail Charts** -- Rankings, breakdowns, comparisons
8. **Annotations** -- Bands for notable periods (NAFTA 1994, USMCA 2020, COVID 2020-2021)
9. **Data Table** -- Sortable, paginated raw data

### A.11 Interactions

**Hover:** Cards shadow xs->md (300ms), bars dim to 25%, donut expand 4px, markers grow 24->28px
**Click:** Donut explode 6px + dim 33%, bar `onBarClick`, map popup
**Zoom:** LineChart scroll+drag, reset at >1x (300ms transition)
**Tooltips:** Fixed on lines, floating on others, safe DOM only
**Fullscreen:** Portal z-50, ESC/click/close to exit

### A.12 Download & Export

**CSV:** Tab-separated for Excel. `Title_YYYY-MM-DD.csv`. Respects zoom range via ZoomRangeContext.
**PNG:** 2x DPI. Chart only. `Title_YYYY-MM-DD.png`.
**Column maps:** `downloadColumns.js` -- key->label per chart.

### A.13 Critical Anti-Patterns

1. **Chart height loop**: Never use `containerHeight` for normal SVG height -- use fixed defaults
2. **Text as ChartCard children**: Use `footnote` prop only -- children cause clipping
3. **Unicode escapes in JSX**: Use actual characters (en-dash, etc.) not `\u2013`
4. **Wrong formatter**: `formatCompact()` for counts, `formatCurrency()` for dollars, `fmtLbs()` for weight
5. **Full-width tables**: Use `w-fit max-w-full mx-auto`, not `w-full`
6. **Year-filtered trends**: Trend lines use `filteredNoYear` to show full time range
7. **innerHTML tooltips**: Use safe DOM APIs (`createElement`, `textContent`)
8. **Re-animation**: Track with `useRef`, run entrance animation once per mount only

---

## B. Testing

### B.1 Schema Validation
- Adapt `Scripts/schema-check.js` to validate the 6 new CSV columns (from `03-Processed-Data/`) match store expectations
- Run: `npm run check:schema`

### B.2 Visual Verification
- Adapt `Scripts/visual-check.js` for the 8 new routes
- Run: `npm run check:visual` (Playwright screenshots)
- Verify chart rendering for extreme date ranges (1993 data alongside 2025 data)

### B.3 Functional Testing
- Run: `npm run check:functional`
- Test: filter interactions, cascading filter behavior, CSV/PNG downloads, fullscreen mode, data table sorting/pagination
- Specific: verify `filteredNoYear` trend charts show full range when year filter is active

### B.4 Responsive Testing
- Run: `npm run check:responsive`
- Verify at all breakpoints: <640px, 640-767px, 768-1023px, >=1024px, >=1280px
- Verify FilterBar (mobile) and FilterSidebar (desktop) both work with the expanded filter set

### B.5 Performance
- If total CSV size exceeds ~10MB: pre-aggregate further or lazy-load per page
- Monitor initial load time (all 6 CSVs load on mount)
- Consider: Web Workers for heavy aggregation, loading waterfall (overview data first)
- Target: <3s initial load on broadband

### B.6 Cross-Browser
- Test in Chrome, Firefox, Edge (minimum)
- Verify D3 chart rendering consistency

---

## C. Deployment

### C.1 Build
```bash
npm run build    # produces dist/ folder
```

### C.2 Deploy
- Deploy to GitHub Pages (matching existing project patterns)
- Update `vite.config.js` base path to match deployment URL
- Verify all CSV paths resolve correctly after deployment

### C.3 Post-Deploy Verification
- Run visual check against deployed URL
- Verify all 8 pages load and render correctly
- Verify CSV/PNG exports work in production

---

## Deliverables Checklist

- [ ] Design principles documented and applied consistently
- [ ] schema-check.js adapted for new CSVs
- [ ] visual-check.js adapted for 8 new routes
- [ ] All check scripts pass: schema, visual, functional, responsive
- [ ] Performance acceptable (<3s initial load)
- [ ] Production build succeeds
- [ ] Deployed to GitHub Pages
- [ ] Post-deploy verification complete
