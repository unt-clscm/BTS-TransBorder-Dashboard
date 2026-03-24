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
import DivergingBarChart from '@/components/charts/DivergingBarChart'
import DataTable from '@/components/ui/DataTable'
import InsightCallout from '@/components/ui/InsightCallout'
import { Factory, ArrowRight } from 'lucide-react'

const HISTORICAL_ANNOTATIONS = [
  { x: 2008.5, x2: 2009.5, label: '2008 Financial Crisis', color: 'rgba(245,158,11,0.08)', labelColor: '#b45309' },
  { x: 2019.5, x2: 2020.5, label: 'COVID-19', color: 'rgba(217,13,13,0.08)', labelColor: '#d90d0d' },
]

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

  /* ── Maquiladora pattern: export vs import per commodity group ── */
  const maquiladoraData = useMemo(() => {
    if (!filteredCommodities?.length) return []
    const byGroup = new Map()
    filteredCommodities.forEach((d) => {
      if (!d.CommodityGroup) return
      const g = d.CommodityGroup
      if (!byGroup.has(g)) byGroup.set(g, { label: g, exports: 0, imports: 0 })
      const row = byGroup.get(g)
      if (d.TradeType === 'Export') row.exports += d.TradeValue || 0
      else if (d.TradeType === 'Import') row.imports += d.TradeValue || 0
    })
    return Array.from(byGroup.values())
      .filter((d) => d.exports + d.imports > 0)
      .sort((a, b) => (b.exports + b.imports) - (a.exports + a.imports))
      .slice(0, 12)
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
      {/* Narrative Intro */}
      <SectionBlock>
        <div className="max-w-4xl mx-auto">
          <p className="text-base text-text-secondary leading-relaxed">
            U.S.–Mexico trade is dominated by <strong>manufactured goods</strong> — this is a manufacturing
            partnership, not just a raw-materials exchange. <strong>Machinery & Electrical Equipment</strong> and{' '}
            <strong>Transportation Equipment</strong> (vehicles and parts) together account for more than
            half of all cross-border freight value, reflecting the deep integration of cross-border supply chains.
          </p>
        </div>
      </SectionBlock>

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

      {/* Cross-Border Manufacturing Pattern */}
      {maquiladoraData.length > 0 && (
        <SectionBlock alt>
          <div className="max-w-7xl mx-auto">
            <ChartCard
              title="Cross-Border Manufacturing Pattern"
              subtitle="Imports (left) vs. exports (right) by commodity group — reveals maquiladora supply chains"
            >
              <DivergingBarChart
                data={maquiladoraData}
                labelKey="label"
                leftKey="imports"
                rightKey="exports"
                leftLabel="Imports (from Mexico)"
                rightLabel="Exports (to Mexico)"
                formatValue={formatCurrency}
                maxBars={12}
              />
            </ChartCard>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <InsightCallout
                finding="U.S.–Mexico trade isn't simple buying and selling — it's a cross-border assembly line. Parts and components flow south; finished products flow north."
                icon={Factory}
              />
              <InsightCallout
                finding="Energy products (Mineral Fuels) are heavily export-dominated — the U.S. supplies petroleum and natural gas to Mexico at a 26:1 export ratio."
                variant="highlight"
                icon={ArrowRight}
              />
            </div>
          </div>
        </SectionBlock>
      )}

      {/* Commodity Group Trends */}
      <SectionBlock alt>
        <ChartCard title="Top 5 Commodity Group Trends" subtitle="Annual trade value for the five largest commodity groups">
          <LineChart data={groupTrends} xKey="year" yKey="value" seriesKey="CommodityGroup" formatY={getAxisFormatter(trendMax, '$')} annotations={HISTORICAL_ANNOTATIONS} />
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
