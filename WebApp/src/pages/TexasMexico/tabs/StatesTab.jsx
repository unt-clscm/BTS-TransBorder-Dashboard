/**
 * StatesTab — Mexican states trading through Texas border ports.
 * Uses texasMexicanStateTrade dataset (DOT1, filtered to TX ports).
 * Shows choropleth map of Mexico, rankings, trends, and detail table.
 */
import { useMemo, useEffect } from 'react'
import { formatCurrency, getAxisFormatter } from '@/lib/transborderHelpers'
import { CHART_COLORS } from '@/lib/chartColors'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import ChoroplethMap from '@/components/maps/ChoroplethMap'
import BarChart from '@/components/charts/BarChart'
import LineChart from '@/components/charts/LineChart'
import DataTable from '@/components/ui/DataTable'

const COVID_ANNOTATION = [{ x: 2019.5, x2: 2020.5, label: 'COVID-19', color: 'rgba(217,13,13,0.08)', labelColor: '#d90d0d' }]
const BASE = import.meta.env.BASE_URL

export default function StatesTab({
  texasMexicanStateTrade,
  loadDataset,
  latestYear,
  yearFilter,
  tradeTypeFilter,
  modeFilter,
  datasetError,
}) {
  useEffect(() => { loadDataset('texasMexicanStateTrade') }, [loadDataset])

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
      {/* Mexican States Choropleth */}
      <SectionBlock alt>
        <div className="max-w-7xl mx-auto">
          <ChartCard title="Mexican States Trading Through Texas" subtitle="Trade value by Mexican state of origin/destination">
            <ChoroplethMap
              geojsonUrl={`${BASE}data/mexican_states.geojson`}
              data={mapData}
              nameProperty="name"
              formatValue={formatCurrency}
              metricLabel="Trade Value"
              colorRange={['#fee0d2', '#de2d26']}
              center={[23.5, -102.0]}
              zoom={5}
              height="480px"
              title="Mexican States"
            />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Top 15 + Trends side by side */}
      <SectionBlock>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
          <ChartCard title="Top 15 Mexican States" subtitle="Ranked by trade value through Texas ports">
            <BarChart data={barData} xKey="label" yKey="value" horizontal formatY={getAxisFormatter(barMax, '$')} color={CHART_COLORS[3]} />
          </ChartCard>
          <ChartCard title="Top 5 State Trends" subtitle="Annual trade value through Texas ports">
            <LineChart data={stateTrends} xKey="year" yKey="value" seriesKey="MexState" formatY={getAxisFormatter(trendMax, '$')} annotations={COVID_ANNOTATION} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Detail Table */}
      <SectionBlock alt>
        <div className="max-w-7xl mx-auto">
          <ChartCard title="Mexican State Detail" subtitle="Trade summary by Mexican state">
            <DataTable columns={tableColumns} data={tableData} />
          </ChartCard>
        </div>
      </SectionBlock>
    </>
  )
}
