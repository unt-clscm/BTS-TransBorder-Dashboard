/**
 * USMexico Commodities Tab — Treemap, rankings, trends, and detail table.
 * Uses the commodityDetail dataset (DOT2) filtered to Country='Mexico'.
 */
import { useMemo, useState, useEffect } from 'react'
import { formatCurrency, getAxisFormatter } from '@/lib/transborderHelpers'
import { CHART_COLORS } from '@/lib/chartColors'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import TreemapChart from '@/components/charts/TreemapChart'
import BarChart from '@/components/charts/BarChart'
import LineChart from '@/components/charts/LineChart'
import DataTable from '@/components/ui/DataTable'

const COVID_ANNOTATION = [{ x: 2019.5, x2: 2020.5, label: 'COVID-19', color: 'rgba(217,13,13,0.08)', labelColor: '#d90d0d' }]

export default function CommoditiesTab({
  filteredCommodities,
  loadDataset,
  latestYear,
  datasetError,
}) {
  const [drillGroup, setDrillGroup] = useState(null)

  useEffect(() => { loadDataset('commodityDetail') }, [loadDataset])

  /* ── treemap data (commodity groups, or drilled HS codes) ────────── */
  const treemapData = useMemo(() => {
    if (!filteredCommodities?.length) return []
    if (drillGroup) {
      const drilled = filteredCommodities.filter((d) => d.CommodityGroup === drillGroup)
      const byComm = new Map()
      drilled.forEach((d) => {
        const key = d.Commodity || d.HSCode
        byComm.set(key, (byComm.get(key) || 0) + (d.TradeValue || 0))
      })
      return Array.from(byComm, ([name, value]) => ({ name, value }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 20)
    }
    const byGroup = new Map()
    filteredCommodities.forEach((d) => {
      const grp = d.CommodityGroup || 'Other'
      byGroup.set(grp, (byGroup.get(grp) || 0) + (d.TradeValue || 0))
    })
    return Array.from(byGroup, ([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [filteredCommodities, drillGroup])

  /* ── top 10 commodities (bar) ─────────────────────────────────────── */
  const topCommodities = useMemo(() => {
    if (!filteredCommodities?.length) return []
    const byComm = new Map()
    filteredCommodities.forEach((d) => {
      const key = d.Commodity || d.HSCode
      byComm.set(key, (byComm.get(key) || 0) + (d.TradeValue || 0))
    })
    return Array.from(byComm, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filteredCommodities])

  /* ── top 5 commodity group trends (line) ──────────────────────────── */
  const groupTrends = useMemo(() => {
    if (!filteredCommodities?.length) return []
    const totals = new Map()
    filteredCommodities.forEach((d) => {
      const grp = d.CommodityGroup || 'Other'
      totals.set(grp, (totals.get(grp) || 0) + (d.TradeValue || 0))
    })
    const top5 = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n)
    const top5Set = new Set(top5)

    const byYearGroup = new Map()
    filteredCommodities.forEach((d) => {
      const grp = d.CommodityGroup || 'Other'
      if (!top5Set.has(grp)) return
      const key = `${d.Year}|${grp}`
      if (!byYearGroup.has(key)) byYearGroup.set(key, { year: d.Year, value: 0, CommodityGroup: grp })
      byYearGroup.get(key).value += (d.TradeValue || 0)
    })
    return Array.from(byYearGroup.values()).sort((a, b) => a.year - b.year)
  }, [filteredCommodities])

  /* ── detail table ─────────────────────────────────────────────────── */
  const tableData = useMemo(() => {
    if (!filteredCommodities?.length) return []
    const byKey = new Map()
    filteredCommodities.forEach((d) => {
      const key = `${d.Year}|${d.HSCode}|${d.TradeType}`
      if (!byKey.has(key)) {
        byKey.set(key, {
          Year: d.Year, HSCode: d.HSCode, Commodity: d.Commodity,
          CommodityGroup: d.CommodityGroup, TradeType: d.TradeType,
          TradeValue: 0, Weight: 0,
        })
      }
      const row = byKey.get(key)
      row.TradeValue += (d.TradeValue || 0)
      row.Weight += (d.Weight || 0)
    })
    return Array.from(byKey.values()).sort((a, b) => b.TradeValue - a.TradeValue)
  }, [filteredCommodities])

  const tableColumns = [
    { key: 'Year', label: 'Year' },
    { key: 'HSCode', label: 'HS Code' },
    { key: 'Commodity', label: 'Commodity' },
    { key: 'CommodityGroup', label: 'Group' },
    { key: 'TradeType', label: 'Type' },
    { key: 'TradeValue', label: 'Trade Value', render: (v) => formatCurrency(v) },
  ]

  if (datasetError) {
    return (
      <SectionBlock>
        <div className="text-center py-12 text-text-secondary">
          Failed to load commodity data. Please try again.
        </div>
      </SectionBlock>
    )
  }

  if (!filteredCommodities) {
    return (
      <SectionBlock>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-brand-blue border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-text-secondary">Loading commodity data...</span>
        </div>
      </SectionBlock>
    )
  }

  const barMax = Math.max(...topCommodities.map((d) => d.value), 0)
  const trendMax = Math.max(...groupTrends.map((d) => d.value), 0)

  return (
    <>
      {/* Treemap */}
      <SectionBlock alt>
        <ChartCard
          title={drillGroup ? `${drillGroup} — HS Detail` : 'Commodity Groups'}
          subtitle={drillGroup ? 'Click background to go back' : 'Click a group to drill into individual HS codes'}
        >
          {drillGroup && (
            <button onClick={() => setDrillGroup(null)} className="mb-2 text-sm text-brand-blue hover:underline">
              &larr; Back to all groups
            </button>
          )}
          <TreemapChart
            data={treemapData}
            nameKey="name"
            valueKey="value"
            formatValue={formatCurrency}
            onTileClick={drillGroup ? undefined : (d) => setDrillGroup(d.name)}
          />
        </ChartCard>
      </SectionBlock>

      {/* Top 10 Commodities */}
      <SectionBlock>
        <ChartCard title="Top 10 Commodities" subtitle="Individual commodities ranked by trade value">
          <BarChart data={topCommodities} xKey="label" yKey="value" horizontal formatY={getAxisFormatter(barMax, '$')} color={CHART_COLORS[1]} />
        </ChartCard>
      </SectionBlock>

      {/* Commodity Group Trends */}
      <SectionBlock alt>
        <ChartCard title="Top 5 Commodity Group Trends" subtitle="Annual trade value for the five largest commodity groups">
          <LineChart data={groupTrends} xKey="year" yKey="value" seriesKey="CommodityGroup" formatY={getAxisFormatter(trendMax, '$')} annotations={COVID_ANNOTATION} />
        </ChartCard>
      </SectionBlock>

      {/* Detail Table */}
      <SectionBlock>
        <ChartCard title="Commodity Detail" subtitle="Trade by commodity, year, and trade type">
          <DataTable columns={tableColumns} data={tableData} />
        </ChartCard>
      </SectionBlock>
    </>
  )
}
