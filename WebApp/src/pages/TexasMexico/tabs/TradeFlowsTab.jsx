/**
 * TexasMexico Trade Flows Tab — OD analysis for trade through Texas border ports.
 * Choropleth flow map + bar chart + Sankey + heatmap.
 */
import { useState, useMemo, useEffect } from 'react'
import { formatCurrency } from '@/lib/transborderHelpers'
import { formatCompact, formatWeight, getMetricField, getMetricFormatter, getMetricLabel } from '@/lib/chartColors'
import TopNSelector from '@/components/filters/TopNSelector'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import BarChart from '@/components/charts/BarChart'
import SankeyDiagram from '@/components/charts/SankeyDiagram'
import HeatmapTable from '@/components/charts/HeatmapTable'
import TradeFlowChoropleth from '@/components/maps/TradeFlowChoropleth'
import InsightCallout from '@/components/ui/InsightCallout'

export default function TradeFlowsTab({
  texasOdStateFlows,
  loadDataset,
  yearFilter,
  tradeTypeFilter,
  modeFilter,
  mexStateFilter,
  datasetError,
  metric = 'value',
}) {
  useEffect(() => { loadDataset('texasOdStateFlows') }, [loadDataset])

  const valueField = getMetricField(metric)
  const fmtValue = getMetricFormatter(metric)
  const metricLabel = getMetricLabel(metric)
  const [topPairsN, setTopPairsN] = useState(15)

  /* ── filter without year (for map animation) ──────────────────────── */
  const filteredNoYear = useMemo(() => {
    if (!texasOdStateFlows) return []
    let data = texasOdStateFlows
    if (tradeTypeFilter) data = data.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter?.length) data = data.filter((d) => modeFilter.includes(d.Mode))
    if (mexStateFilter?.length) data = data.filter((d) => mexStateFilter.includes(d.MexState))
    return data
  }, [texasOdStateFlows, tradeTypeFilter, modeFilter, mexStateFilter])

  const filtered = useMemo(() => {
    if (!filteredNoYear.length) return []
    if (yearFilter?.length) return filteredNoYear.filter((d) => yearFilter.includes(String(d.Year)))
    return filteredNoYear
  }, [filteredNoYear, yearFilter])

  /* ── Top trading pairs ────────────────────────────────────────────── */
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

  /* ── Sankey data ───────────────────────────────────────────────────── */
  const sankeyData = useMemo(() => {
    if (!filtered.length) return { nodes: [], links: [] }

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

    const nodes = [
      ...topUS.map((n) => ({ id: `us-${n}`, name: n, group: 'us' })),
      ...topPorts.map((n) => ({ id: `port-${n}`, name: n, group: 'port' })),
      ...topMX.map((n) => ({ id: `mx-${n}`, name: n, group: 'mx' })),
    ]

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

  /* ── Heatmap data ──────────────────────────────────────────────────── */
  const heatmapData = useMemo(() => {
    if (!filtered.length) return null
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
    const rowLabels = [...usTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([n]) => n)
    const colLabels = [...mxTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([n]) => n)
    const cells = rowLabels.map((us) => colLabels.map((mx) => pairMap.get(`${us}|${mx}`) || 0))
    return { rowLabels, colLabels, cells }
  }, [filtered, valueField])

  if (datasetError) {
    return (
      <SectionBlock><div className="text-center py-12 text-text-secondary">Failed to load trade flow data.</div></SectionBlock>
    )
  }

  if (!texasOdStateFlows) {
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
            This tab reveals the specific corridors that define Texas–Mexico trade. <strong>Laredo</strong> connects
            Monterrey's industrial base to the U.S. heartland. <strong>El Paso/Ysleta</strong> links
            Ju&aacute;rez's maquiladoras to American markets. Each port-state pairing represents
            a supply chain built over decades — use the interactive maps below to explore how trade
            flows through the border.
          </p>
        </div>
      </SectionBlock>

      {/* Interactive Trade Flow Map */}
      <SectionBlock>
        <div className="max-w-7xl mx-auto">
          <ChartCard
            title="Trade Flow Map"
            subtitle="Click a state or port to see flow arcs — use the timeline to animate through years"
          >
            <TradeFlowChoropleth
              data={filteredNoYear}
              yearFilter={yearFilter}
              formatValue={fmtValue}
              center={[28, -100]}
              zoom={5}
              height="580px"
            />
          </ChartCard>
        </div>
      </SectionBlock>

      <SectionBlock alt>
        <ChartCard title="Top Trading Partners" subtitle={`Largest bilateral ${metricLabel.toLowerCase()} flows between U.S. and Mexican states through Texas ports`} headerRight={<TopNSelector value={topPairsN} onChange={setTopPairsN} />}>
          <BarChart data={topPairsData} horizontal formatValue={fmtValue} maxBars={topPairsN} />
        </ChartCard>
        <div className="max-w-4xl mx-auto mt-6">
          <InsightCallout
            finding="Trade routes through Texas ports are not interchangeable — each corridor serves specific industries and supply chains."
            context="Disrupting one corridor (e.g., Laredo-Nuevo Leon) would affect different sectors than disrupting another (e.g., El Paso-Chihuahua)."
            variant="default"
          />
        </div>
      </SectionBlock>

      <SectionBlock>
        <ChartCard title="Trade Routes" subtitle="How trade flows from U.S. states through Texas border ports to Mexican states">
          <SankeyDiagram nodes={sankeyData.nodes} links={sankeyData.links} formatValue={fmtValue} height={550} />
        </ChartCard>
      </SectionBlock>

      <SectionBlock alt>
        <ChartCard title="Trade Matrix" subtitle="U.S. states (rows) vs. Mexican states (columns) through Texas ports">
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
