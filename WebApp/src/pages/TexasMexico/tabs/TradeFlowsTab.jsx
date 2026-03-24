/**
 * TexasMexico Trade Flows Tab — OD analysis for trade through Texas border ports.
 * Same three visualizations as US-Mexico but filtered to Texas port flows.
 */
import { useMemo, useEffect } from 'react'
import { formatCurrency } from '@/lib/transborderHelpers'
import { formatCompact } from '@/lib/chartColors'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import ChordDiagram from '@/components/charts/ChordDiagram'
import SankeyDiagram from '@/components/charts/SankeyDiagram'
import HeatmapTable from '@/components/charts/HeatmapTable'

export default function TradeFlowsTab({
  texasOdStateFlows,
  loadDataset,
  yearFilter,
  tradeTypeFilter,
  modeFilter,
  datasetError,
}) {
  useEffect(() => { loadDataset('texasOdStateFlows') }, [loadDataset])

  const filtered = useMemo(() => {
    if (!texasOdStateFlows) return []
    let data = texasOdStateFlows
    if (yearFilter?.length) data = data.filter((d) => yearFilter.includes(String(d.Year)))
    if (tradeTypeFilter) data = data.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter?.length) data = data.filter((d) => modeFilter.includes(d.Mode))
    return data
  }, [texasOdStateFlows, yearFilter, tradeTypeFilter, modeFilter])

  /* ── Chord data ────────────────────────────────────────────────────── */
  const chordData = useMemo(() => {
    if (!filtered.length) return []
    const pairMap = new Map()
    filtered.forEach((d) => {
      const key = `${d.State}|${d.MexState}`
      pairMap.set(key, (pairMap.get(key) || 0) + (d.TradeValue || 0))
    })
    return Array.from(pairMap, ([key, value]) => {
      const [source, target] = key.split('|')
      return { source, target, value }
    }).filter((d) => d.value > 0)
  }, [filtered])

  /* ── Sankey data ───────────────────────────────────────────────────── */
  const sankeyData = useMemo(() => {
    if (!filtered.length) return { nodes: [], links: [] }

    const usTotals = new Map()
    const mxTotals = new Map()
    const portTotals = new Map()
    filtered.forEach((d) => {
      usTotals.set(d.State, (usTotals.get(d.State) || 0) + (d.TradeValue || 0))
      mxTotals.set(d.MexState, (mxTotals.get(d.MexState) || 0) + (d.TradeValue || 0))
      portTotals.set(d.Port, (portTotals.get(d.Port) || 0) + (d.TradeValue || 0))
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
      usPortMap.set(upKey, (usPortMap.get(upKey) || 0) + (d.TradeValue || 0))
      portMxMap.set(pmKey, (portMxMap.get(pmKey) || 0) + (d.TradeValue || 0))
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
  }, [filtered])

  /* ── Heatmap data ──────────────────────────────────────────────────── */
  const heatmapData = useMemo(() => {
    if (!filtered.length) return null
    const pairMap = new Map()
    const usTotals = new Map()
    const mxTotals = new Map()
    filtered.forEach((d) => {
      const key = `${d.State}|${d.MexState}`
      const val = d.TradeValue || 0
      pairMap.set(key, (pairMap.get(key) || 0) + val)
      usTotals.set(d.State, (usTotals.get(d.State) || 0) + val)
      mxTotals.set(d.MexState, (mxTotals.get(d.MexState) || 0) + val)
    })
    const rowLabels = [...usTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([n]) => n)
    const colLabels = [...mxTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([n]) => n)
    const cells = rowLabels.map((us) => colLabels.map((mx) => pairMap.get(`${us}|${mx}`) || 0))
    return { rowLabels, colLabels, cells }
  }, [filtered])

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
      <SectionBlock alt>
        <ChartCard title="Trading Partners" subtitle="Bilateral trade flows between U.S. and Mexican states through Texas ports">
          <ChordDiagram data={chordData} formatValue={formatCompact} maxGroups={12} />
        </ChartCard>
      </SectionBlock>

      <SectionBlock>
        <ChartCard title="Trade Routes" subtitle="How trade flows from U.S. states through Texas border ports to Mexican states">
          <SankeyDiagram nodes={sankeyData.nodes} links={sankeyData.links} formatValue={formatCompact} height={550} />
        </ChartCard>
      </SectionBlock>

      <SectionBlock alt>
        <ChartCard title="Trade Matrix" subtitle="U.S. states (rows) vs. Mexican states (columns) through Texas ports">
          {heatmapData ? (
            <HeatmapTable data={heatmapData} formatValue={formatCurrency} />
          ) : (
            <div className="text-center py-8 text-text-secondary">No data to display.</div>
          )}
        </ChartCard>
      </SectionBlock>
    </>
  )
}
