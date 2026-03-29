/**
 * USMexico Trade Flows Tab — Origin-destination analysis with four visualizations:
 * 1. Choropleth Flow Map — Interactive map with flow arcs + year animation
 * 2. Top Trading Partners — Bar chart
 * 3. Sankey Diagram — "How does trade route through the border?"
 * 4. Heatmap Matrix — "Explore the full trade matrix"
 */
import { useState, useMemo, useEffect } from 'react'
import { formatCurrency } from '@/lib/transborderHelpers'
import { formatCompact, formatWeight, getMetricField, getMetricFormatter, getMetricLabel, hasSurfaceExports, isAllSurfaceExports } from '@/lib/chartColors'
import WeightCaveatBanner from '@/components/ui/WeightCaveatBanner'
import TopNSelector from '@/components/filters/TopNSelector'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import BarChart from '@/components/charts/BarChart'
import SankeyDiagram from '@/components/charts/SankeyDiagram'
import HeatmapTable from '@/components/charts/HeatmapTable'
import TradeFlowChoropleth from '@/components/maps/TradeFlowChoropleth'
import InsightCallout from '@/components/ui/InsightCallout'

export default function TradeFlowsTab({
  odStateFlows,
  loadDataset,
  yearFilter,
  tradeTypeFilter,
  modeFilter,
  stateFilter,
  portFilter,
  mexStateFilter,
  datasetError,
  metric = 'value',
}) {
  useEffect(() => { loadDataset('odStateFlows') }, [loadDataset])

  const valueField = getMetricField(metric)
  const fmtValue = getMetricFormatter(metric)
  const metricLabel = getMetricLabel(metric)
  const [topPairsN, setTopPairsN] = useState(15)

  /* ── filter data (without year — for map animation) ───────────────── */
  const filteredNoYear = useMemo(() => {
    if (!odStateFlows) return []
    let data = odStateFlows
    if (tradeTypeFilter) data = data.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter?.length) data = data.filter((d) => modeFilter.includes(d.Mode))
    if (stateFilter?.length) data = data.filter((d) => stateFilter.includes(d.State))
    if (portFilter?.length) data = data.filter((d) => portFilter.includes(d.Port))
    if (mexStateFilter?.length) data = data.filter((d) => mexStateFilter.includes(d.MexState))
    return data
  }, [odStateFlows, tradeTypeFilter, modeFilter, stateFilter, portFilter, mexStateFilter])

  /* ── filter data ───────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    if (!filteredNoYear.length) return []
    if (yearFilter?.length) return filteredNoYear.filter((d) => yearFilter.includes(String(d.Year)))
    return filteredNoYear
  }, [filteredNoYear, yearFilter])

  const weightAllNA = metric === 'weight' && isAllSurfaceExports(filtered)
  const weightPartial = !weightAllNA && metric === 'weight' && hasSurfaceExports(filtered)

  /* ── Top trading pairs: US State ↔ MX State ─────────────────────── */
  const topPairsData = useMemo(() => {
    if (!filtered.length) return []
    const pairMap = new Map()
    filtered.forEach((d) => {
      const key = `${d.State}|${d.MexState}`
      pairMap.set(key, (pairMap.get(key) || 0) + (d[valueField] || 0))
    })
    return Array.from(pairMap, ([key, value]) => {
      const [source, target] = key.split('|')
      return { label: `${source} ↔ ${target}`, value }
    })
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, topPairsN)
  }, [filtered, valueField, topPairsN])

  /* ── Sankey data: US State → Port → MX State ──────────────────────── */
  const sankeyData = useMemo(() => {
    if (!filtered.length) return { nodes: [], links: [] }

    // Get top 10 US states, all ports, top 10 MX states
    const usTotals = new Map()
    const mxTotals = new Map()
    const portTotals = new Map()
    filtered.forEach((d) => {
      usTotals.set(d.State, (usTotals.get(d.State) || 0) + (d[valueField] || 0))
      mxTotals.set(d.MexState, (mxTotals.get(d.MexState) || 0) + (d[valueField] || 0))
      portTotals.set(d.Port, (portTotals.get(d.Port) || 0) + (d[valueField] || 0))
    })

    const topUS = [...usTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n]) => n)
    const topMX = [...mxTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n]) => n)
    const topPorts = [...portTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n]) => n)

    const topUSSet = new Set(topUS)
    const topMXSet = new Set(topMX)
    const topPortSet = new Set(topPorts)

    // Build nodes
    const nodes = [
      ...topUS.map((n) => ({ id: `us-${n}`, name: n, group: 'us' })),
      ...topPorts.map((n) => ({ id: `port-${n}`, name: n, group: 'port' })),
      ...topMX.map((n) => ({ id: `mx-${n}`, name: n, group: 'mx' })),
    ]

    // Build links: US→Port and Port→MX
    const usPortMap = new Map()
    const portMxMap = new Map()
    filtered.forEach((d) => {
      if (!topUSSet.has(d.State) || !topPortSet.has(d.Port) || !topMXSet.has(d.MexState)) return
      const upKey = `us-${d.State}|port-${d.Port}`
      const pmKey = `port-${d.Port}|mx-${d.MexState}`
      usPortMap.set(upKey, (usPortMap.get(upKey) || 0) + (d[valueField] || 0))
      portMxMap.set(pmKey, (portMxMap.get(pmKey) || 0) + (d[valueField] || 0))
    })

    const links = [
      ...Array.from(usPortMap, ([key, value]) => {
        const [source, target] = key.split('|')
        return { source, target, value }
      }),
      ...Array.from(portMxMap, ([key, value]) => {
        const [source, target] = key.split('|')
        return { source, target, value }
      }),
    ].filter((l) => l.value > 0)

    return { nodes, links }
  }, [filtered, valueField])

  /* ── Heatmap data: US State x MX State matrix ─────────────────────── */
  const heatmapData = useMemo(() => {
    if (!filtered.length) return null

    // Aggregate by US State x MX State
    const pairMap = new Map()
    const usTotals = new Map()
    const mxTotals = new Map()
    filtered.forEach((d) => {
      const key = `${d.State}|${d.MexState}`
      const val = d[valueField] || 0
      pairMap.set(key, (pairMap.get(key) || 0) + val)
      usTotals.set(d.State, (usTotals.get(d.State) || 0) + val)
      mxTotals.set(d.MexState, (mxTotals.get(d.MexState) || 0) + val)
    })

    // Sort by total trade, take top 20 each for readability
    const rowLabels = [...usTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([n]) => n)
    const colLabels = [...mxTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([n]) => n)

    const cells = rowLabels.map((us) =>
      colLabels.map((mx) => pairMap.get(`${us}|${mx}`) || 0)
    )

    return { rowLabels, colLabels, cells }
  }, [filtered, valueField])

  if (datasetError) {
    return (
      <SectionBlock>
        <div className="text-center py-12 text-text-secondary">Failed to load trade flow data. Please try again.</div>
      </SectionBlock>
    )
  }

  if (!odStateFlows) {
    return (
      <SectionBlock>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-brand-blue border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-text-secondary">Loading trade flow data...</span>
        </div>
      </SectionBlock>
    )
  }

  return (
    <>
      {/* Narrative Intro */}
      <SectionBlock>
        <div className="max-w-4xl mx-auto">
          <p className="text-lg text-text-secondary leading-relaxed">
            Trade between the U.S. and Mexico flows through specific corridors built over decades.
            The <strong>Texas–Nuevo Le&oacute;n corridor</strong> via Laredo is the single largest
            trade relationship. <strong>Michigan–Chihuahua</strong> reflects the auto industry's
            cross-border integration. Click on the maps below to explore how states connect through
            border ports.
          </p>
          <p className="text-sm text-text-tertiary mt-2 italic">
            Note: Origin-destination data is available for exports only — BTS does not record the Mexican state of origin for imports.
          </p>
        </div>
      </SectionBlock>

      {/* Weight caveat banner */}
      {(weightAllNA || weightPartial) && (
        <SectionBlock>
          <div className="max-w-4xl mx-auto">
            <WeightCaveatBanner allNA={weightAllNA} />
          </div>
        </SectionBlock>
      )}

      {/* Interactive Trade Flow Map */}
      <SectionBlock alt>
        <div className="max-w-7xl mx-auto">
          <ChartCard
            title="Trade Flow Map"
            subtitle="Click a state or port to see flow arcs — use the timeline to animate through years"
          >
            <TradeFlowChoropleth
              data={filteredNoYear}
              yearFilter={yearFilter}
              formatValue={fmtValue}
              center={[30, -100]}
              zoom={4}
              height="580px"
            />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Flow Insights */}
      <SectionBlock>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-7xl mx-auto">
          <InsightCallout
            finding="The Texas-to-Nuevo Leon corridor via Laredo is the single largest bilateral trade relationship on the U.S.-Mexico border — larger than many countries' total trade."
            context="This corridor carries automotive, machinery, and electronics traffic for the maquiladora (cross-border factory) manufacturing network."
          />
          <InsightCallout
            finding="Trade corridors are not interchangeable. Disrupting Laredo affects manufacturing supply chains, while disrupting Nogales affects agriculture. Each port serves a different economic function."
            context="Infrastructure investment and contingency planning should be tailored to each corridor's specific commodity mix."
            variant="highlight"
          />
        </div>
      </SectionBlock>

      {/* Section 2: Trading Partners */}
      <SectionBlock>
        <ChartCard
          title="Top Trading Partners"
          subtitle={`Largest bilateral ${metricLabel.toLowerCase()} flows between U.S. and Mexican states`}
          headerRight={<TopNSelector value={topPairsN} onChange={setTopPairsN} />}
        >
          <BarChart data={topPairsData} horizontal formatValue={fmtValue} maxBars={topPairsN} />
        </ChartCard>
      </SectionBlock>

      {/* Section 3: Trade Routes (Sankey Diagram) */}
      <SectionBlock alt>
        <ChartCard
          title="Trade Routes"
          subtitle="How trade flows from U.S. states through border ports to Mexican states (top 10 each)"
        >
          <SankeyDiagram
            nodes={sankeyData.nodes}
            links={sankeyData.links}
            formatValue={fmtValue}
            height={550}
          />
        </ChartCard>
      </SectionBlock>

      {/* Section 4: Trade Matrix (Heatmap) */}
      <SectionBlock>
        <ChartCard
          title="Trade Matrix"
          subtitle={`U.S. states (rows) vs. Mexican states (columns) — darker = higher ${metricLabel.toLowerCase()}`}
        >
          {heatmapData ? (
            <HeatmapTable data={heatmapData} formatValue={fmtValue} />
          ) : (
            <div className="text-center py-8 text-text-secondary">No data to display.</div>
          )}
        </ChartCard>
      </SectionBlock>
    </>
  )
}
