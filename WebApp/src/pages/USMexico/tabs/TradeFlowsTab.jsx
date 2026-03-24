/**
 * USMexico Trade Flows Tab — Origin-destination analysis with three visualizations:
 * 1. Chord Diagram — "Who trades with whom?"
 * 2. Sankey Diagram — "How does trade route through the border?"
 * 3. Heatmap Matrix — "Explore the full trade matrix"
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
  odStateFlows,
  loadDataset,
  yearFilter,
  tradeTypeFilter,
  modeFilter,
  datasetError,
}) {
  useEffect(() => { loadDataset('odStateFlows') }, [loadDataset])

  /* ── filter data ───────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    if (!odStateFlows) return []
    let data = odStateFlows
    if (yearFilter?.length) data = data.filter((d) => yearFilter.includes(String(d.Year)))
    if (tradeTypeFilter) data = data.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter?.length) data = data.filter((d) => modeFilter.includes(d.Mode))
    return data
  }, [odStateFlows, yearFilter, tradeTypeFilter, modeFilter])

  /* ── Chord data: aggregate US State x MX State ────────────────────── */
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

  /* ── Sankey data: US State → Port → MX State ──────────────────────── */
  const sankeyData = useMemo(() => {
    if (!filtered.length) return { nodes: [], links: [] }

    // Get top 10 US states, all ports, top 10 MX states
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

  /* ── Heatmap data: US State x MX State matrix ─────────────────────── */
  const heatmapData = useMemo(() => {
    if (!filtered.length) return null

    // Aggregate by US State x MX State
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

    // Sort by total trade, take top 20 each for readability
    const rowLabels = [...usTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([n]) => n)
    const colLabels = [...mxTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([n]) => n)

    const cells = rowLabels.map((us) =>
      colLabels.map((mx) => pairMap.get(`${us}|${mx}`) || 0)
    )

    return { rowLabels, colLabels, cells }
  }, [filtered])

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
      {/* Section 1: Trading Partners (Chord Diagram) */}
      <SectionBlock alt>
        <ChartCard
          title="Trading Partners"
          subtitle="Bilateral trade flows between U.S. and Mexican states — hover a state to highlight its connections"
        >
          <ChordDiagram data={chordData} formatValue={formatCompact} maxGroups={12} />
        </ChartCard>
      </SectionBlock>

      {/* Section 2: Trade Routes (Sankey Diagram) */}
      <SectionBlock>
        <ChartCard
          title="Trade Routes"
          subtitle="How trade flows from U.S. states through border ports to Mexican states (top 10 each)"
        >
          <SankeyDiagram
            nodes={sankeyData.nodes}
            links={sankeyData.links}
            formatValue={formatCompact}
            height={550}
          />
        </ChartCard>
      </SectionBlock>

      {/* Section 3: Trade Matrix (Heatmap) */}
      <SectionBlock alt>
        <ChartCard
          title="Trade Matrix"
          subtitle="U.S. states (rows) vs. Mexican states (columns) — darker = higher trade value"
        >
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
