/**
 * USMexico Commodities Tab — Treemap, rankings, trends, and detail table.
 * Uses the commodityDetail dataset (DOT2) filtered to Country='Mexico'.
 */
import { useMemo, useState, useEffect } from 'react'
import { formatCurrency, formatNumber } from '@/lib/transborderHelpers'
import { CHART_COLORS, formatWeight, getMetricField, getMetricFormatter, getMetricLabel, isSurfaceExport, hasSurfaceExports, isAllSurfaceExports } from '@/lib/chartColors'
import WeightCaveatBanner from '@/components/ui/WeightCaveatBanner'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import TreemapChart from '@/components/charts/TreemapChart'
import BarChart from '@/components/charts/BarChart'
import LineChart from '@/components/charts/LineChart'
import DivergingBarChart from '@/components/charts/DivergingBarChart'
import DataTable from '@/components/ui/DataTable'
import InsightCallout from '@/components/ui/InsightCallout'
import YearRangeFilter from '@/components/filters/YearRangeFilter'
import TopNSelector from '@/components/filters/TopNSelector'
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
  metric = 'value',
}) {
  const valueField = getMetricField(metric)
  const fmtValue = getMetricFormatter(metric)
  const metricLabel = getMetricLabel(metric)
  const weightAllNA = metric === 'weight' && isAllSurfaceExports(filteredCommodities || [])
  const weightPartial = !weightAllNA && metric === 'weight' && hasSurfaceExports(filteredCommodities || [])

  const [drillGroup, setDrillGroup] = useState(null)
  const [treemapView, setTreemapView] = useState('groups') // 'groups' | 'commodities'
  const [topCommodityN, setTopCommodityN] = useState(10)
  const [groupTrendTopN, setGroupTrendTopN] = useState(5)
  const [divergingTopN, setDivergingTopN] = useState(12)

  useEffect(() => { loadDataset('commodityDetail') }, [loadDataset])

  /* ── all years for trend range filter ─────────────────────────────── */
  const allCommodityYears = useMemo(() => {
    if (!filteredCommodities?.length) return []
    const ys = new Set()
    filteredCommodities.forEach((d) => { if (d.Year) ys.add(d.Year) })
    return [...ys].sort((a, b) => a - b)
  }, [filteredCommodities])
  const [trendYearRange, setTrendYearRange] = useState({ startYear: 0, endYear: 9999 })

  useEffect(() => {
    if (allCommodityYears.length) {
      setTrendYearRange({ startYear: allCommodityYears[0], endYear: allCommodityYears[allCommodityYears.length - 1] })
    }
  }, [allCommodityYears])

  // Reset drill when switching to commodities view
  useEffect(() => {
    if (treemapView === 'commodities') setDrillGroup(null)
  }, [treemapView])

  /* ── treemap data (groups with drill, or flat commodities) ──────── */
  const treemapData = useMemo(() => {
    if (!filteredCommodities?.length) return []
    if (treemapView === 'commodities') {
      const byComm = new Map()
      filteredCommodities.forEach((d) => {
        const key = d.Commodity || d.HSCode
        byComm.set(key, (byComm.get(key) || 0) + (d[valueField] || 0))
      })
      return Array.from(byComm, ([name, value]) => ({ name, value }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 30)
    }
    if (drillGroup) {
      const drilled = filteredCommodities.filter((d) => d.CommodityGroup === drillGroup)
      const byComm = new Map()
      drilled.forEach((d) => {
        const key = d.Commodity || d.HSCode
        byComm.set(key, (byComm.get(key) || 0) + (d[valueField] || 0))
      })
      return Array.from(byComm, ([name, value]) => ({ name, value }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 20)
    }
    const byGroup = new Map()
    filteredCommodities.forEach((d) => {
      const grp = d.CommodityGroup || 'Other'
      byGroup.set(grp, (byGroup.get(grp) || 0) + (d[valueField] || 0))
    })
    return Array.from(byGroup, ([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [filteredCommodities, drillGroup, treemapView, valueField])

  /* ── top N commodities (bar) ────────────────────────────────────── */
  const topCommodities = useMemo(() => {
    if (!filteredCommodities?.length) return []
    const byComm = new Map()
    filteredCommodities.forEach((d) => {
      const key = d.Commodity || d.HSCode
      byComm.set(key, (byComm.get(key) || 0) + (d[valueField] || 0))
    })
    return Array.from(byComm, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, topCommodityN)
  }, [filteredCommodities, valueField, topCommodityN])

  /* ── top N commodity group trends (line) ─────────────────────────── */
  const groupTrends = useMemo(() => {
    if (!filteredCommodities?.length) return []
    const totals = new Map()
    filteredCommodities.forEach((d) => {
      const grp = d.CommodityGroup || 'Other'
      totals.set(grp, (totals.get(grp) || 0) + (d[valueField] || 0))
    })
    const topN = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, groupTrendTopN).map(([n]) => n)
    const topNSet = new Set(topN)

    const byYearGroup = new Map()
    filteredCommodities.forEach((d) => {
      const grp = d.CommodityGroup || 'Other'
      if (!topNSet.has(grp)) return
      if (d.Year < trendYearRange.startYear || d.Year > trendYearRange.endYear) return
      const key = `${d.Year}|${grp}`
      if (!byYearGroup.has(key)) byYearGroup.set(key, { year: d.Year, value: 0, CommodityGroup: grp })
      byYearGroup.get(key).value += (d[valueField] || 0)
    })
    return Array.from(byYearGroup.values()).sort((a, b) => a.year - b.year || a.CommodityGroup.localeCompare(b.CommodityGroup))
  }, [filteredCommodities, valueField, groupTrendTopN, trendYearRange])

  /* ── detail table ─────────────────────────────────────────────────── */
  const tableData = useMemo(() => {
    if (!filteredCommodities?.length) return []
    const byKey = new Map()
    filteredCommodities.forEach((d) => {
      const key = `${d.Year}|${d.HSCode}|${d.TradeType}`
      if (!byKey.has(key)) {
        byKey.set(key, {
          Year: d.Year,
          HSCode: d.HSCode || '—',
          Commodity: d.Commodity || '—',
          CommodityGroup: d.CommodityGroup || '—',
          TradeType: d.TradeType || '—',
          TradeValue: 0,
          WeightLb: null,
        })
      }
      const row = byKey.get(key)
      row.TradeValue += (d[valueField] || 0)
      if (d.WeightLb != null) row.WeightLb = (row.WeightLb || 0) + d.WeightLb
    })
    return Array.from(byKey.values()).sort((a, b) => b.TradeValue - a.TradeValue)
  }, [filteredCommodities, valueField])

  /* ── Maquiladora pattern: export vs import per commodity group ── */
  const maquiladoraData = useMemo(() => {
    if (!filteredCommodities?.length) return []
    const byGroup = new Map()
    filteredCommodities.forEach((d) => {
      if (!d.CommodityGroup) return
      const g = d.CommodityGroup
      if (!byGroup.has(g)) byGroup.set(g, { label: g, exports: 0, imports: 0 })
      const row = byGroup.get(g)
      if (d.TradeType === 'Export') row.exports += d[valueField] || 0
      else if (d.TradeType === 'Import') row.imports += d[valueField] || 0
    })
    return Array.from(byGroup.values())
      .filter((d) => d.exports + d.imports > 0)
      .sort((a, b) => (b.exports + b.imports) - (a.exports + a.imports))
      .slice(0, divergingTopN)
  }, [filteredCommodities, valueField, divergingTopN])

  const tableColumns = [
    { key: 'Year', label: 'Year', width: '5%' },
    { key: 'HSCode', label: 'HS Code', width: '6%' },
    { key: 'Commodity', label: 'Commodity', wrap: true, width: '32%' },
    { key: 'CommodityGroup', label: 'Group', wrap: true, width: '18%' },
    { key: 'TradeType', label: 'Trade Type', width: '7%' },
    { key: 'TradeValue', label: 'Trade Value ($)', render: (v) => formatCurrency(v), width: '16%' },
    { key: 'WeightLb', label: 'Weight (lb)', render: (v) => formatWeight(v), width: '16%' },
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

  return (
    <>
      {/* Narrative Intro */}
      <SectionBlock>
        <div className="max-w-4xl mx-auto">
          <p className="text-lg text-text-secondary leading-relaxed">
            U.S.–Mexico trade is dominated by <strong>manufactured goods</strong> — this is a manufacturing
            partnership, not just a raw-materials exchange. <strong>Machinery & Electrical Equipment</strong> and{' '}
            <strong>Transportation Equipment</strong> (vehicles and parts) together account for more than
            half of all cross-border freight value, reflecting the deep integration of cross-border supply chains.
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

      {/* Treemap */}
      <SectionBlock alt>
        <ChartCard
          title={drillGroup ? `${drillGroup} — HS Detail` : treemapView === 'commodities' ? 'Top 30 Commodities' : 'Commodity Groups'}
          subtitle={drillGroup ? 'Individual commodities within group' : treemapView === 'commodities' ? `${metricLabel} by individual commodity (HS 2-digit)` : `${metricLabel} by commodity group — click to drill down`}
          headerRight={
            <div className="inline-flex rounded-lg border border-border-light overflow-hidden text-sm">
              <button
                onClick={() => setTreemapView('groups')}
                className={`px-3 py-1.5 font-medium transition-colors ${treemapView === 'groups' ? 'bg-brand-blue text-white' : 'bg-white text-text-secondary hover:bg-surface-alt'}`}
              >
                Groups
              </button>
              <button
                onClick={() => setTreemapView('commodities')}
                className={`px-3 py-1.5 font-medium transition-colors ${treemapView === 'commodities' ? 'bg-brand-blue text-white' : 'bg-white text-text-secondary hover:bg-surface-alt'}`}
              >
                Commodities
              </button>
            </div>
          }
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
            formatValue={fmtValue}
            onCellClick={treemapView === 'groups' && !drillGroup ? (name) => setDrillGroup(name) : undefined}
          />
        </ChartCard>
      </SectionBlock>

      {/* Top N Commodities */}
      <SectionBlock>
        <ChartCard
          title={`Top ${topCommodityN} Commodities`}
          subtitle={`Individual commodities ranked by ${metricLabel}`}
          headerRight={<TopNSelector value={topCommodityN} onChange={setTopCommodityN} />}
        >
          <BarChart data={topCommodities} xKey="label" yKey="value" horizontal formatValue={fmtValue} color={CHART_COLORS[1]} />
        </ChartCard>
      </SectionBlock>

      {/* Cross-Border Manufacturing Pattern */}
      {maquiladoraData.length > 0 && (
        <SectionBlock alt>
          <div className="max-w-7xl mx-auto">
            <ChartCard
              title="Cross-Border Manufacturing Pattern"
              subtitle={`Imports (left) vs. exports (right) by commodity group — reveals maquiladora supply chains`}
              headerRight={<TopNSelector value={divergingTopN} onChange={setDivergingTopN} />}
            >
              <DivergingBarChart
                data={maquiladoraData}
                labelKey="label"
                leftKey="imports"
                rightKey="exports"
                leftLabel="Imports (from Mexico)"
                rightLabel="Exports (to Mexico)"
                formatValue={fmtValue}
                maxBars={divergingTopN}
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
        <ChartCard
          title={`Top ${groupTrendTopN} Commodity Group Trends`}
          subtitle={`Annual ${metricLabel} for leading groups`}
          headerRight={
            <>
              <TopNSelector value={groupTrendTopN} onChange={setGroupTrendTopN} />
              <YearRangeFilter years={allCommodityYears} startYear={trendYearRange.startYear} endYear={trendYearRange.endYear} onChange={setTrendYearRange} />
            </>
          }
        >
          <LineChart data={groupTrends} xKey="year" yKey="value" seriesKey="CommodityGroup" formatValue={fmtValue} annotations={HISTORICAL_ANNOTATIONS} />
        </ChartCard>
      </SectionBlock>

      {/* Detail Table */}
      <SectionBlock>
        <ChartCard title="Commodity Detail" subtitle="Trade by commodity, year, and trade type">
          <DataTable data={tableData} columns={tableColumns} pageSize={15} fullWidth />
        </ChartCard>
      </SectionBlock>
    </>
  )
}
