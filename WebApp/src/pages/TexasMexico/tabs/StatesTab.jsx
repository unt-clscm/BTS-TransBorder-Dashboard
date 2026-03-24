/**
 * StatesTab — Mexican states trading through Texas border ports.
 * Uses texasMexicanStateTrade dataset (DOT1, filtered to TX ports).
 * Shows choropleth map of Mexico, rankings, trends, and detail table.
 */
import { useMemo, useEffect } from 'react'
import { formatCurrency, getAxisFormatter } from '@/lib/transborderHelpers'
import { CHART_COLORS, formatCompact } from '@/lib/chartColors'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import InteractiveFlowMap from '@/components/maps/InteractiveFlowMap'
import { usePortCoordinates, buildMapPorts } from '@/hooks/usePortMapData'
import SankeyDiagram from '@/components/charts/SankeyDiagram'
import BarChart from '@/components/charts/BarChart'
import LineChart from '@/components/charts/LineChart'
import DataTable from '@/components/ui/DataTable'
import InsightCallout from '@/components/ui/InsightCallout'
import { TrendingUp, Globe } from 'lucide-react'

const ANNOTATIONS = [
  { x: 2008, x2: 2009, label: '2008 Financial Crisis', color: 'rgba(217,13,13,0.06)', labelColor: '#b91c1c' },
  { x: 2019.5, x2: 2020.5, label: 'COVID-19', color: 'rgba(217,13,13,0.08)', labelColor: '#d90d0d' },
]
const BASE = import.meta.env.BASE_URL

export default function StatesTab({
  texasMexicanStateTrade,
  texasOdStateFlows,
  loadDataset,
  latestYear,
  yearFilter,
  tradeTypeFilter,
  modeFilter,
  datasetError,
}) {
  useEffect(() => { loadDataset('texasMexicanStateTrade'); loadDataset('texasOdStateFlows') }, [loadDataset])

  const { portCoords } = usePortCoordinates()

  /* ── filter data ───────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    if (!texasMexicanStateTrade) return []
    let data = texasMexicanStateTrade
    if (yearFilter?.length) data = data.filter((d) => yearFilter.includes(String(d.Year)))
    if (tradeTypeFilter) data = data.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter?.length) data = data.filter((d) => modeFilter.includes(d.Mode))
    return data
  }, [texasMexicanStateTrade, yearFilter, tradeTypeFilter, modeFilter])

  const filteredNoYear = useMemo(() => {
    if (!texasMexicanStateTrade) return []
    let data = texasMexicanStateTrade
    if (tradeTypeFilter) data = data.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter?.length) data = data.filter((d) => modeFilter.includes(d.Mode))
    return data
  }, [texasMexicanStateTrade, tradeTypeFilter, modeFilter])

  /* ── choropleth data ───────────────────────────────────────────────── */
  const mapData = useMemo(() => {
    const byState = new Map()
    filtered.forEach((d) => {
      const st = d.MexState || 'Unknown'
      byState.set(st, (byState.get(st) || 0) + (d.TradeValue || 0))
    })
    return Array.from(byState, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [filtered])

  /* ── port bubble data for the interactive map ─────────────────────── */
  const portMapData = useMemo(() => {
    if (!texasOdStateFlows || !portCoords) return []
    let data = texasOdStateFlows
    if (yearFilter?.length) data = data.filter((d) => yearFilter.includes(String(d.Year)))
    if (tradeTypeFilter) data = data.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter?.length) data = data.filter((d) => modeFilter.includes(d.Mode))
    return buildMapPorts(data, portCoords)
  }, [texasOdStateFlows, portCoords, yearFilter, tradeTypeFilter, modeFilter])

  /* ── connectivity: state ↔ port with per-pair trade values ──────── */
  const connections = useMemo(() => {
    const stateToPort = new Map()   // state → Map<portCode, tradeValue>
    const portToState = new Map()   // portCode → Map<state, tradeValue>
    if (!texasOdStateFlows) return { stateToPort, portToState }

    let data = texasOdStateFlows
    if (yearFilter?.length) data = data.filter((d) => yearFilter.includes(String(d.Year)))
    if (tradeTypeFilter) data = data.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter?.length) data = data.filter((d) => modeFilter.includes(d.Mode))

    for (const d of data) {
      if (!d.MexState || !d.PortCode) continue
      const code = d.PortCode.replace(/\D/g, '')
      const val = d.TradeValue || 0
      if (!stateToPort.has(d.MexState)) stateToPort.set(d.MexState, new Map())
      const sp = stateToPort.get(d.MexState)
      sp.set(code, (sp.get(code) || 0) + val)
      if (!portToState.has(code)) portToState.set(code, new Map())
      const ps = portToState.get(code)
      ps.set(d.MexState, (ps.get(d.MexState) || 0) + val)
    }
    return { stateToPort, portToState }
  }, [texasOdStateFlows, yearFilter, tradeTypeFilter, modeFilter])

  /* ── bar chart data ────────────────────────────────────────────────── */
  const barData = useMemo(
    () => mapData.slice(0, 15).map((d) => ({ label: d.name, value: d.value })),
    [mapData],
  )

  /* ── top 5 state trends ────────────────────────────────────────────── */
  const stateTrends = useMemo(() => {
    const totals = new Map()
    filteredNoYear.forEach((d) => {
      const st = d.MexState || 'Unknown'
      totals.set(st, (totals.get(st) || 0) + (d.TradeValue || 0))
    })
    const top5 = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n)
    const top5Set = new Set(top5)

    const byYearState = new Map()
    filteredNoYear.forEach((d) => {
      const st = d.MexState || 'Unknown'
      if (!top5Set.has(st)) return
      const key = `${d.Year}|${st}`
      if (!byYearState.has(key)) byYearState.set(key, { year: d.Year, value: 0, MexState: st })
      byYearState.get(key).value += (d.TradeValue || 0)
    })
    return Array.from(byYearState.values()).sort((a, b) => a.year - b.year)
  }, [filteredNoYear])

  /* ── detail table ──────────────────────────────────────────────────── */
  const tableData = useMemo(() => {
    const byState = new Map()
    filtered.forEach((d) => {
      const st = d.MexState || 'Unknown'
      if (!byState.has(st)) byState.set(st, { State: st, Total: 0, Exports: 0, Imports: 0 })
      const row = byState.get(st)
      row.Total += (d.TradeValue || 0)
      if (d.TradeType === 'Export') row.Exports += (d.TradeValue || 0)
      if (d.TradeType === 'Import') row.Imports += (d.TradeValue || 0)
    })
    return Array.from(byState.values()).sort((a, b) => b.Total - a.Total)
  }, [filtered])

  /* ── Sankey: Port → Mexican State ──────────────────────────────── */
  const sankeyData = useMemo(() => {
    if (!texasOdStateFlows) return { nodes: [], links: [] }
    let data = texasOdStateFlows
    if (yearFilter?.length) data = data.filter((d) => yearFilter.includes(String(d.Year)))
    if (tradeTypeFilter) data = data.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter?.length) data = data.filter((d) => modeFilter.includes(d.Mode))

    const portTotals = new Map()
    const mxTotals = new Map()
    data.forEach((d) => {
      portTotals.set(d.Port, (portTotals.get(d.Port) || 0) + (d.TradeValue || 0))
      mxTotals.set(d.MexState, (mxTotals.get(d.MexState) || 0) + (d.TradeValue || 0))
    })

    const topPorts = [...portTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n]) => n)
    const topMX = [...mxTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n]) => n)
    const topPortSet = new Set(topPorts)
    const topMXSet = new Set(topMX)

    const nodes = [
      ...topPorts.map((n) => ({ id: `port-${n}`, name: n, group: 'port' })),
      ...topMX.map((n) => ({ id: `mx-${n}`, name: n, group: 'mx' })),
    ]

    const linkMap = new Map()
    data.forEach((d) => {
      if (!topPortSet.has(d.Port) || !topMXSet.has(d.MexState)) return
      const key = `port-${d.Port}|mx-${d.MexState}`
      linkMap.set(key, (linkMap.get(key) || 0) + (d.TradeValue || 0))
    })

    const links = Array.from(linkMap, ([key, value]) => {
      const [source, target] = key.split('|')
      return { source, target, value }
    }).filter((l) => l.value > 0)

    return { nodes, links }
  }, [texasOdStateFlows, yearFilter, tradeTypeFilter, modeFilter])

  /* ── Mexican state growth rates (earliest vs latest 3-year avg) ── */
  const stateGrowth = useMemo(() => {
    if (!filteredNoYear.length) return []
    const byYearState = new Map()
    filteredNoYear.forEach((d) => {
      const st = d.MexState || 'Unknown'
      const key = `${d.Year}|${st}`
      if (!byYearState.has(key)) byYearState.set(key, { year: d.Year, state: st, value: 0 })
      byYearState.get(key).value += d.TradeValue || 0
    })
    const years = [...new Set(filteredNoYear.map((d) => d.Year))].sort((a, b) => a - b)
    if (years.length < 4) return []
    const earlyYears = years.slice(0, 3)
    const lateYears = years.slice(-3)

    const states = new Map()
    Array.from(byYearState.values()).forEach((d) => {
      if (!states.has(d.state)) states.set(d.state, { early: 0, late: 0, earlyCount: 0, lateCount: 0 })
      const s = states.get(d.state)
      if (earlyYears.includes(d.year)) { s.early += d.value; s.earlyCount++ }
      if (lateYears.includes(d.year)) { s.late += d.value; s.lateCount++ }
    })

    return Array.from(states, ([state, v]) => {
      const earlyAvg = v.earlyCount > 0 ? v.early / v.earlyCount : 0
      const lateAvg = v.lateCount > 0 ? v.late / v.lateCount : 0
      const growth = earlyAvg > 0 ? ((lateAvg - earlyAvg) / earlyAvg) * 100 : 0
      return { label: state, value: growth }
    })
      .filter((d) => d.value > 0 && d.value < 10000)
      .sort((a, b) => b.value - a.value)
      .slice(0, 15)
  }, [filteredNoYear])

  const tableColumns = [
    { key: 'State', label: 'Mexican State' },
    { key: 'Total', label: 'Total Trade', render: (v) => formatCurrency(v) },
    { key: 'Exports', label: 'Exports', render: (v) => formatCurrency(v) },
    { key: 'Imports', label: 'Imports', render: (v) => formatCurrency(v) },
  ]

  if (datasetError) {
    return (
      <SectionBlock>
        <div className="text-center py-12 text-text-secondary">
          Failed to load Mexican state data. Please try again.
        </div>
      </SectionBlock>
    )
  }

  if (!texasMexicanStateTrade) {
    return (
      <SectionBlock>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-brand-blue border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-text-secondary">Loading Mexican state trade data...</span>
        </div>
      </SectionBlock>
    )
  }

  const barMax = Math.max(...barData.map((d) => d.value), 0)
  const trendMax = Math.max(...stateTrends.map((d) => d.value), 0)

  return (
    <>
      {/* Narrative Intro */}
      <SectionBlock>
        <div className="max-w-4xl mx-auto">
          <p className="text-base text-text-secondary leading-relaxed">
            Each Texas port serves specific Mexican states, creating distinct trade corridors along the border.{' '}
            <strong>Chihuahua</strong> trades primarily through El Paso/Ysleta, <strong>Nuevo Le&oacute;n</strong> routes
            through Laredo, and <strong>Tamaulipas</strong> connects via Pharr and Brownsville. Beyond these traditional
            border partners, Mexico's emerging <strong>Baj&iacute;o corridor</strong> (Quer&eacute;taro, San Luis Potos&iacute;,
            Guanajuato) is growing rapidly — and Texas ports remain the gateway.
          </p>
        </div>
      </SectionBlock>

      {/* Interactive Mexican States + Port Bubbles Map */}
      <SectionBlock alt>
        <div className="max-w-7xl mx-auto">
          <ChartCard title="Mexican States & Border Ports" subtitle="Click a state or port to explore trade connections">
            <InteractiveFlowMap
              geojsonUrl={`${BASE}data/mexican_states.geojson`}
              stateData={mapData}
              portData={portMapData}
              connections={connections}
              formatValue={formatCurrency}
              metricLabel="Trade Value"
              colorRange={['#fee0d2', '#de2d26']}
              center={[26.0, -102.0]}
              zoom={5}
              height="520px"
              title="Mexican States"
            />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Port → Mexican State Sankey */}
      <SectionBlock>
        <div className="max-w-7xl mx-auto">
          <ChartCard title="Port–State Trade Flows" subtitle="How trade flows from Texas border ports to Mexican states">
            <SankeyDiagram
              nodes={sankeyData.nodes}
              links={sankeyData.links}
              formatValue={formatCompact}
              height={520}
              columnHeaders={['Border Ports', 'Mexican States']}
            />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Top 15 bar + Detail table side by side */}
      <SectionBlock>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
          <ChartCard title="Top 15 Mexican States" subtitle="Ranked by trade value through Texas ports">
            <BarChart data={barData} xKey="label" yKey="value" horizontal formatY={getAxisFormatter(barMax, '$')} color={CHART_COLORS[3]} />
          </ChartCard>
          <ChartCard title="Mexican State Detail" subtitle="Trade summary by Mexican state">
            <DataTable columns={tableColumns} data={tableData} />
          </ChartCard>
        </div>
        <div className="max-w-4xl mx-auto mt-6 space-y-3">
          <InsightCallout
            finding="Mexico's manufacturing base is expanding south from the traditional border zone into the Bajio corridor."
            context="Queretaro's trade through Texas ports has grown 5.5x since 2007, and San Luis Potosi 4.5x — driven by new auto manufacturing plants (BMW, GM, and others)."
            variant="highlight"
          />
          <InsightCallout
            finding="Each Texas port serves specific Mexican states, creating distinct trade corridors."
            context="Chihuahua trades through El Paso/Ysleta; Nuevo Leon through Laredo; Tamaulipas through Pharr and Brownsville."
            variant="default"
          />
        </div>
      </SectionBlock>

      {/* Mexican State Growth Rates */}
      {stateGrowth.length > 0 && (
        <SectionBlock alt>
          <div className="max-w-7xl mx-auto">
            <ChartCard title="Fastest-Growing Mexican States" subtitle="Growth in average annual trade value (earliest 3 years vs. latest 3 years)">
              <BarChart data={stateGrowth} xKey="label" yKey="value" horizontal formatValue={(v) => `${v.toFixed(0)}%`} color="#10b981" />
            </ChartCard>
            <div className="mt-4">
              <InsightCallout
                finding="Mexico's manufacturing base is expanding south from the traditional border zone into the Bajío corridor — Querétaro (5.5x growth), San Luis Potosí (4.5x), and Aguascalientes are all surging."
                context="Texas ports remain the gateway for this growing interior trade."
                icon={TrendingUp}
                variant="highlight"
              />
            </div>
          </div>
        </SectionBlock>
      )}

      {/* Top 5 State Trends */}
      <SectionBlock alt>
        <div className="max-w-7xl mx-auto">
          <ChartCard title="Top 5 State Trends" subtitle="Annual trade value through Texas ports">
            <LineChart data={stateTrends} xKey="year" yKey="value" seriesKey="MexState" formatY={getAxisFormatter(trendMax, '$')} annotations={ANNOTATIONS} />
          </ChartCard>
        </div>
      </SectionBlock>
    </>
  )
}
