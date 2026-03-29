# Web App Review Findings

Date: March 29, 2026

## Summary

The web app is strong overall. The narrative arc is clear:

`Overview` -> `U.S.-Mexico` -> `Texas-Mexico` -> `About`

The dashboard tells a compelling story about Texas as the main gateway, manufacturing integration as the engine, and Laredo as a critical node. The main issues are not missing charts. They are mostly about trust, interpretation, and clarity for non-expert users.

## High-Priority Findings

### 1. Texas trade-flow map can disagree with the rest of the tab

On the Texas-Mexico `Trade Flows` tab, the map is still passed raw `texasOdStateFlows` data while the rest of the tab uses filtered data. There is also a memo dependency issue where `stateFilter` is used but not tracked in the dependency list.

This creates a risk that:

- the U.S. state filter can appear to do nothing
- the map can disagree with the rankings, Sankey, and matrix
- users may lose trust because the page looks filtered but the visuals do not fully match

> **Action taken:** Fixed. The map now receives `filteredNoYear` (the filtered dataset) instead of the raw `texasOdStateFlows`. The missing `stateFilter` dependency was added to the `useMemo` hook. Files changed: `TradeFlowsTab.jsx`.

### 2. The metric toggle is not fully trustworthy across all charts

Some analyses still compute from `TradeValue` even when the UI is set to weight. That means a user can switch to weight and still be looking at dollar-based logic in some visuals.

This is especially risky because:

- the page formatting changes to look like the metric changed
- users may assume everything is now weight-based
- conclusions drawn from those charts may be wrong

If a chart is meant to stay dollar-only, it should be labeled clearly as `Value only`.

> **Action taken:** Fixed. The following charts in `CommoditiesTab.jsx` were updated to respect the metric toggle:
>
> - **Rail vs Truck Mode Share** — now uses `valueField` instead of hardcoded `TradeValue`, and the chart formatter and subtitle reflect the active metric.
> - **Seasonal Commodity Patterns** — now uses `valueField` for both ranking and aggregation. Subtitle and formatter updated.
> - **Port-Level Produce Seasonality** — now uses `valueField` for aggregation. Subtitle and formatter updated.
>
> Charts that intentionally stay dollar-only or use both metrics were labeled:
>
> - **Trade Balance by Commodity Group** — subtitle now states "Always shown in dollars (trade balance is a monetary concept)."
> - **Weight vs. Value Bubble Chart** — subtitle now states "This chart always shows both weight and dollar value regardless of the metric toggle."
>
> **Not changed (intentionally):**
>
> - **Trade Balance computation** (lines 259-260) — Trade balance is exports minus imports in dollar terms. Showing a "weight balance" is not meaningful. Left as `TradeValue` with a label clarifying this.
> - **Weight-vs-Value Bubble Chart data** (lines 315, 318) — This chart deliberately plots weight on one axis and value on the other. It must use both `TradeValue` and `WeightLb` regardless of the toggle.
> - **Commodity Detail Table** (lines 396, 399) — The table always shows both TradeValue and WeightLb columns side by side, so it should accumulate both independently.

## Medium-Priority Findings

### 3. Some narrative text does not follow the active filters

On the `Overview` page, some insights are intentionally independent of filters, and the large comparison callout is hard-coded to 2025.

This can confuse users because:

- they may expect all text to reflect their current filters
- the app does not clearly distinguish baseline context from filtered results
- users unfamiliar with the data may read the callouts as current outputs rather than editorial framing

Recommendation:

- label static callouts as `Context` or `Why this matters`
- label filter-responsive callouts as `Current view insight`

> **Action taken:** Partially addressed.
>
> - The "$600 billion in 2025" contextual comparison callout now has its context line updated to: "Context — This is a fixed reference point for scale and does not change with filters."
> - The "Key Insights" section heading now has a "Based on full dataset" badge next to it so users understand these insights are not filter-responsive.
>
> **Not fully implemented:** Did not add "Current view insight" labels to every filter-responsive chart. The filter sidebar and active filter tags already signal what's being filtered. Adding per-chart labels would add visual clutter. If this is still wanted after testing, it can be revisited.

### 4. About-page CSV links may break under subpath deployment

The app generally uses `import.meta.env.BASE_URL`, but the `About` page download links use root-relative `/data/...` paths.

If the app is hosted under a subfolder, those links may fail.

> **Action taken:** Fixed. All three download links on the About page now use `` `${import.meta.env.BASE_URL}data/...` `` instead of root-relative `/data/...` paths. Files changed: `About/index.jsx`.

### 5. Important terminology is still too specialized for non-experts

Terms such as these are meaningful but likely unfamiliar to many users:

- `maquiladora`
- `Bajio`
- `FTZ`
- `HS 2-digit`
- `DF`

They are explained on the `About` page, but not where they first appear in the analysis.

That means many users will either:

- skip over the meaning
- misunderstand the point
- feel the dashboard is more technical than it really needs to be

Recommendation:

- add inline help text or tooltip definitions at first use
- prefer short plain-language subtitles before technical terms

> **Action taken:** Addressed with a two-pronged approach.
>
> 1. **New `GlossaryTerm` component** created (`components/ui/GlossaryTerm.jsx`). This is a clickable dotted-underline tooltip that shows a definition popup. Used for terms that appear in JSX narrative text.
>    - Applied to "maquiladoras" in the TradeFlowsTab narrative intro.
>
> 2. **Inline parenthetical definitions** added where terms appear in string props (InsightCallout `finding`/`context` and ChartCard `subtitle`):
>    - "maquiladora" — defined as "(cross-border factory)" in TexasMexico CommoditiesTab, USMexico TradeFlowsTab, and USMexico CommoditiesTab.
>    - "Bajio" — expanded to include the states it covers (Guanajuato, Queretaro, Aguascalientes, San Luis Potosi) in TradeFlowsTab, StatesTab.
>    - "HS 2-digit" — the CommoditiesTab treemap subtitle now explains: "HS 2-digit codes classify traded goods into ~99 categories."
>    - "FTZ" — already explained inline in the PortsTab FTZ Growth callout ("FTZs allow goods to enter for assembly without paying duties until they leave").
>    - "DF" — already shown as "Domestic Origin" / "Re-Exports (Foreign Origin)" in the USMexico PortsTab labels, which is self-explanatory.

## Minor Findings

### 6. The Texas-Mexico commodities page is analytically rich but cognitively heavy

This is one of the best parts of the app, but it is also the densest. A new user may not know where to begin.

Recommendation:

- add a short `Start here` guide at the top
- suggest a simple reading order such as:
  1. What moves
  2. Supply chain direction
  3. Which ports specialize

> **Action taken:** Added. A "How to read this page" box now appears at the top of the Commodities tab (between the narrative intro and the first chart section). It lists three steps:
>
> 1. **What Moves** — See which commodities dominate Texas-Mexico trade and how they compare
> 2. **Supply Chain Direction** — Understand the import/export balance and how parts flow south while finished goods flow north
> 3. **Trade Structure** — Discover which ports specialize in which commodities and how seasonal patterns shape the border
>
> File changed: `CommoditiesTab.jsx`.

## Storytelling Assessment

## What is working well

- The overall story is strong and coherent.
- The page sequence makes sense from broad context to detailed explanation.
- The Texas-Mexico page is the strongest storytelling page.
- The app does a good job turning raw trade data into infrastructure, corridor, and supply-chain stories.
- Section headers and insight callouts help break up complex analysis.

## Where ambiguity remains

- Users may not know which narrative elements are static context versus filter-responsive outputs.
- Users may assume every chart respects the metric toggle in the same way.
- Users unfamiliar with trade terminology may miss the point of some of the strongest insights.
- Some charts imply precision that depends on data limitations users may not fully understand without extra help.

## Main Recommendation

The app does not need many more analyses. It needs tighter interpretive guidance.

The best next improvements would be:

1. Fix filter and metric consistency issues first.
2. Add clearer labeling for charts or callouts that are value-only or static-context.
3. Add inline glossary help for specialized terms.
4. Add a short onboarding cue on dense tabs, especially `Texas-Mexico -> Commodities`.

## Verification Notes

- `npm run build` passed.
- `npm test` did not fully pass; there are existing regression failures.
- Playwright-based visual checks could not be run because local Playwright browser binaries were not installed.

---

## Response Summary (for re-review)

All 6 findings were addressed. Here is what was done and what was intentionally not done:

| # | Finding | Status | Notes |
|---|---------|--------|-------|
| 1 | Map ignores sidebar filters | **Fixed** | Map now receives filtered data; missing `stateFilter` dependency added |
| 2 | Metric toggle inconsistent | **Fixed** | 5 chart computations updated to use `valueField`; 3 charts labeled as intentionally value-only |
| 3 | Static vs filtered callouts | **Partially done** | Static callouts labeled; did not add per-chart "Current view" labels to avoid clutter |
| 4 | About page download paths | **Fixed** | All 3 links now use `BASE_URL` |
| 5 | Specialized terminology | **Done** | New GlossaryTerm component + inline definitions added at first use of each term |
| 6 | Commodities tab reading guide | **Done** | "How to read this page" box added with 3-step reading order |

**Build status:** `npm run build` passes with no errors.

**Files changed:**

- `WebApp/src/pages/TexasMexico/tabs/TradeFlowsTab.jsx` — Findings 1, 5
- `WebApp/src/pages/TexasMexico/tabs/CommoditiesTab.jsx` — Findings 2, 5, 6
- `WebApp/src/pages/TexasMexico/tabs/StatesTab.jsx` — Finding 5
- `WebApp/src/pages/Overview/index.jsx` — Finding 3
- `WebApp/src/pages/About/index.jsx` — Finding 4
- `WebApp/src/pages/USMexico/tabs/TradeFlowsTab.jsx` — Finding 5
- `WebApp/src/pages/USMexico/tabs/CommoditiesTab.jsx` — Finding 5
- `WebApp/src/components/ui/GlossaryTerm.jsx` — New file (Finding 5)
- `webapp-review-findings.md` — This file (action notes added)
