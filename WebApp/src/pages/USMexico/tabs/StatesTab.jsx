/**
 * USMexico States Tab — US states + Mexican states choropleth maps, rankings, trends.
 * Uses usStateTrade (DOT1) and mexicanStateTrade (DOT1) datasets.
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
  usStateTrade,
  mexicanStateTrade,
  loadDataset,
  latestYear,
  yearFilter,
  tradeTypeFilter,
  modeFilter,
  datasetErrors,
}) {
  useEffect(() => {
    loadDataset('usStateTrade')
    loadDataset('mexicanStateTrade')
  }, [loadDataset])

  /* ── filter US state data to Mexico only ──────────────────────────── */
  const filteredUS = useMemo(() => {
    if (!usStateTrade) return []
    let data = usStateTrade.filter((d) => d.Country === 'Mexico')
    if (yearFilter?.length) data = data.filter((d) => yearFilter.includes(String(d.Year)))
    if (tradeTypeFilter) data = data.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter?.length) data = data.filter((d) => modeFilter.includes(d.Mode))
    return data
  }, [usStateTrade, yearFilter, tradeTypeFilter, modeFilter])

  const filteredUSNoYear = useMemo(() => {
    if (!usStateTrade) return []
    let data = usStateTrade.filter((d) => d.Country === 'Mexico')
    if (tradeTypeFilter) data = data.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter?.length) data = data.filter((d) => modeFilter.includes(d.Mode))
    return data
  }, [usStateTrade, tradeTypeFilter, modeFilter])

  /* ── filter Mexican state data ────────────────────────────────────── */
  const filteredMX = useMemo(() => {
    if (!mexicanStateTrade) return []
    let data = mexicanStateTrade
    if (yearFilter?.length) data = data.filter((d) => yearFilter.includes(String(d.Year)))
    if (tradeTypeFilter) data = data.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter?.length) data = data.filter((d) => modeFilter.includes(d.Mode))
    return data
  }, [mexicanStateTrade, yearFilter, tradeTypeFilter, modeFilter])

  const filteredMXNoYear = useMemo(() => {
    if (!mexicanStateTrade) return []
    let data = mexicanStateTrade
    if (tradeTypeFilter) data = data.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter?.length) data = data.filter((d) => modeFilter.includes(d.Mode))
    return data
  }, [mexicanStateTrade, tradeTypeFilter, modeFilter])

  /* ── US state choropleth data ─────────────────────────────────────── */
  const usMapData = useMemo(() => {
    const byState = new Map()
    filteredUS.forEach((d) => {
      const st = d.State || 'Unknown'
      byState.set(st, (byState.get(st) || 0) + (d.TradeValue || 0))
    })
    return Array.from(byState, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [filteredUS])

  /* ── Mexican state choropleth data ────────────────────────────────── */
  const mxMapData = useMemo(() => {
    const byState = new Map()
    filteredMX.forEach((d) => {
      const st = d.MexState || 'Unknown'
      byState.set(st, (byState.get(st) || 0) + (d.TradeValue || 0))
    })
    return Array.from(byState, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [filteredMX])

  /* ── US top 15 states bar data ────────────────────────────────────── */
  const usBarData = useMemo(() => usMapData.slice(0, 15).map((d) => ({ label: d.name, value: d.value })), [usMapData])

  /* ── MX top 15 states bar data ────────────────────────────────────── */
  const mxBarData = useMemo(() => mxMapData.slice(0, 15).map((d) => ({ label: d.name, value: d.value })), [mxMapData])

  /* ── US top 5 state trends ────────────────────────────────────────── */
  const usStateTrends = useMemo(() => {
    const totals = new Map()
    filteredUSNoYear.forEach((d) => {
      const st = d.State || 'Unknown'
      totals.set(st, (totals.get(st) || 0) + (d.TradeValue || 0))
    })
    const top5 = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n)
    const top5Set = new Set(top5)

    const byYearState = new Map()
    filteredUSNoYear.forEach((d) => {
      const st = d.State || 'Unknown'
      if (!top5Set.has(st)) return
      const key = `${d.Year}|${st}`
      if (!byYearState.has(key)) byYearState.set(key, { year: d.Year, value: 0, State: st })
      byYearState.get(key).value += (d.TradeValue || 0)
    })
    return Array.from(byYearState.values()).sort((a, b) => a.year - b.year)
  }, [filteredUSNoYear])

  /* ── MX top 5 state trends ───────────────────────────────────────── */
  const mxStateTrends = useMemo(() => {
    const totals = new Map()
    filteredMXNoYear.forEach((d) => {
      const st = d.MexState || 'Unknown'
      totals.set(st, (totals.get(st) || 0) + (d.TradeValue || 0))
    })
    const top5 = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n)
    const top5Set = new Set(top5)

    const byYearState = new Map()
    filteredMXNoYear.forEach((d) => {
      const st = d.MexState || 'Unknown'
      if (!top5Set.has(st)) return
      const key = `${d.Year}|${st}`
      if (!byYearState.has(key)) byYearState.set(key, { year: d.Year, value: 0, MexState: st })
      byYearState.get(key).value += (d.TradeValue || 0)
    })
    return Array.from(byYearState.values()).sort((a, b) => a.year - b.year)
  }, [filteredMXNoYear])

  /* ── US detail table ──────────────────────────────────────────────── */
  const usTableData = useMemo(() => {
    const byState = new Map()
    filteredUS.forEach((d) => {
      const st = d.State || 'Unknown'
      if (!byState.has(st)) byState.set(st, { State: st, Total: 0, Exports: 0, Imports: 0 })
      const row = byState.get(st)
      row.Total += (d.TradeValue || 0)
      if (d.TradeType === 'Export') row.Exports += (d.TradeValue || 0)
      if (d.TradeType === 'Import') row.Imports += (d.TradeValue || 0)
    })
    return Array.from(byState.values()).sort((a, b) => b.Total - a.Total)
  }, [filteredUS])

  /* ── MX detail table ──────────────────────────────────────────────── */
  const mxTableData = useMemo(() => {
    const byState = new Map()
    filteredMX.forEach((d) => {
      const st = d.MexState || 'Unknown'
      if (!byState.has(st)) byState.set(st, { State: st, Total: 0, Exports: 0, Imports: 0 })
      const row = byState.get(st)
      row.Total += (d.TradeValue || 0)
      if (d.TradeType === 'Export') row.Exports += (d.TradeValue || 0)
      if (d.TradeType === 'Import') row.Imports += (d.TradeValue || 0)
    })
    return Array.from(byState.values()).sort((a, b) => b.Total - a.Total)
  }, [filteredMX])

  const stateTableColumns = [
    { key: 'State', label: 'State' },
    { key: 'Total', label: 'Total Trade', render: (v) => formatCurrency(v) },
    { key: 'Exports', label: 'Exports', render: (v) => formatCurrency(v) },
    { key: 'Imports', label: 'Imports', render: (v) => formatCurrency(v) },
  ]

  const isLoading = !usStateTrade || !mexicanStateTrade

  if (isLoading) {
    return (
      <SectionBlock>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-brand-blue border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-text-secondary">Loading state trade data...</span>
        </div>
      </SectionBlock>
    )
  }

  const usBarMax = Math.max(...usBarData.map((d) => d.value), 0)
  const mxBarMax = Math.max(...mxBarData.map((d) => d.value), 0)
  const usTrendMax = Math.max(...usStateTrends.map((d) => d.value), 0)
  const mxTrendMax = Math.max(...mxStateTrends.map((d) => d.value), 0)

  return (
    <>
      {/* Choropleth Maps — side by side */}
      <SectionBlock alt>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="U.S. States" subtitle="Trade value with Mexico by U.S. state">
            <ChoroplethMap
              geojsonUrl={`${BASE}data/us_states.geojson`}
              data={usMapData}
              nameProperty="name"
              formatValue={formatCurrency}
              metricLabel="Trade Value"
              colorRange={['#deebf7', '#08519c']}
              center={[39.5, -98.0]}
              zoom={4}
              height="400px"
              title="U.S. States"
            />
          </ChartCard>
          <ChartCard title="Mexican States" subtitle="Trade value with the U.S. by Mexican state">
            <ChoroplethMap
              geojsonUrl={`${BASE}data/mexican_states.geojson`}
              data={mxMapData}
              nameProperty="name"
              formatValue={formatCurrency}
              metricLabel="Trade Value"
              colorRange={['#fee0d2', '#de2d26']}
              center={[23.5, -102.0]}
              zoom={5}
              height="400px"
              title="Mexican States"
            />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* US Top 15 States + MX Top 15 States */}
      <SectionBlock>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Top 15 U.S. States" subtitle="Ranked by trade value with Mexico">
            <BarChart data={usBarData} xKey="label" yKey="value" horizontal formatY={getAxisFormatter(usBarMax, '$')} color={CHART_COLORS[0]} />
          </ChartCard>
          <ChartCard title="Top 15 Mexican States" subtitle="Ranked by trade value with the U.S.">
            <BarChart data={mxBarData} xKey="label" yKey="value" horizontal formatY={getAxisFormatter(mxBarMax, '$')} color={CHART_COLORS[3]} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* US State Trends + MX State Trends */}
      <SectionBlock alt>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Top 5 U.S. State Trends" subtitle="Annual trade with Mexico">
            <LineChart data={usStateTrends} xKey="year" yKey="value" seriesKey="State" formatY={getAxisFormatter(usTrendMax, '$')} annotations={COVID_ANNOTATION} />
          </ChartCard>
          <ChartCard title="Top 5 Mexican State Trends" subtitle="Annual trade with the U.S.">
            <LineChart data={mxStateTrends} xKey="year" yKey="value" seriesKey="MexState" formatY={getAxisFormatter(mxTrendMax, '$')} annotations={COVID_ANNOTATION} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Detail Tables */}
      <SectionBlock>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="U.S. State Detail" subtitle="State-level trade summary">
            <DataTable columns={stateTableColumns} data={usTableData} />
          </ChartCard>
          <ChartCard title="Mexican State Detail" subtitle="State-level trade summary">
            <DataTable columns={stateTableColumns} data={mxTableData} />
          </ChartCard>
        </div>
      </SectionBlock>
    </>
  )
}
