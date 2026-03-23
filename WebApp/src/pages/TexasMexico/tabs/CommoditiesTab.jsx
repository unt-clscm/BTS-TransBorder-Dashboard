/**
 * CommoditiesTab — Commodity analysis of TX-MX surface freight trade.
 * Loads texasMexicoCommodities on mount. Shows treemap, top-10 bar,
 * top-5 commodity group trends, and detail table.
 */
import { useMemo, useState, useEffect } from 'react'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import TreemapChart from '@/components/charts/TreemapChart'
import BarChart from '@/components/charts/BarChart'
import LineChart from '@/components/charts/LineChart'
import DataTable from '@/components/ui/DataTable'
import { formatCurrency, formatCompact, formatNumber } from '@/lib/chartColors'

export default function CommoditiesTab({ filteredCommodities, loadDataset, latestYear }) {
  /* ── ensure dataset is loaded ────────────────────────────────────── */
  useEffect(() => {
    loadDataset('texasMexicoCommodities')
  }, [loadDataset])

  /* ── spinner while loading ───────────────────────────────────────── */
  if (!filteredCommodities) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-base text-text-secondary">Loading commodity data...</p>
        </div>
      </div>
    )
  }

  /* eslint-disable react-hooks/rules-of-hooks */
  const [treemapDrill, setTreemapDrill] = useState(null)

  /* ── Treemap: top commodity groups or drilled-down HS codes ─────── */
  const commodityGroups = useMemo(() => {
    if (treemapDrill) {
      const map = new Map()
      filteredCommodities.forEach((d) => {
        if (d.CommodityGroup !== treemapDrill) return
        const label = d.Commodity || d.HSCode || 'Unknown'
        map.set(label, (map.get(label) || 0) + (d.TradeValue || 0))
      })
      return Array.from(map, ([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
    }
    const byGroup = new Map()
    filteredCommodities.forEach((d) => {
      if (!d.CommodityGroup) return
      byGroup.set(d.CommodityGroup, (byGroup.get(d.CommodityGroup) || 0) + (d.TradeValue || 0))
    })
    return Array.from(byGroup, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredCommodities, treemapDrill])

  /* ── Top 10 individual commodities (bar) ─────────────────────────── */
  const topCommodities = useMemo(() => {
    const byCommodity = new Map()
    filteredCommodities.forEach((d) => {
      if (!d.Commodity) return
      byCommodity.set(d.Commodity, (byCommodity.get(d.Commodity) || 0) + (d.TradeValue || 0))
    })
    return Array.from(byCommodity, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filteredCommodities])

  /* ── Top 5 commodity group trends (multi-series line) ────────────── */
  const groupTrends = useMemo(() => {
    // Find top 5 groups by total
    const totals = new Map()
    filteredCommodities.forEach((d) => {
      if (!d.CommodityGroup) return
      totals.set(d.CommodityGroup, (totals.get(d.CommodityGroup) || 0) + (d.TradeValue || 0))
    })
    const top5 = Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name)
    const top5Set = new Set(top5)

    const byYG = new Map()
    filteredCommodities.forEach((d) => {
      if (!d.CommodityGroup || !top5Set.has(d.CommodityGroup)) return
      const key = `${d.Year}|${d.CommodityGroup}`
      if (!byYG.has(key)) byYG.set(key, { year: d.Year, value: 0, CommodityGroup: d.CommodityGroup })
      byYG.get(key).value += d.TradeValue || 0
    })
    return Array.from(byYG.values()).sort((a, b) => a.year - b.year || a.CommodityGroup.localeCompare(b.CommodityGroup))
  }, [filteredCommodities])

  /* ── Commodity detail table ──────────────────────────────────────── */
  const tableData = useMemo(() => {
    const byKey = new Map()
    filteredCommodities.forEach((d) => {
      const key = `${d.Year}|${d.HSCode}|${d.Port}|${d.TradeType}`
      if (!byKey.has(key)) {
        byKey.set(key, {
          Year: d.Year,
          HSCode: d.HSCode || '—',
          Commodity: d.Commodity || '—',
          CommodityGroup: d.CommodityGroup || '—',
          Port: d.Port || '—',
          TradeType: d.TradeType || '—',
          TradeValue: 0,
          Weight: 0,
        })
      }
      const row = byKey.get(key)
      row.TradeValue += d.TradeValue || 0
      row.Weight += d.Weight || 0
    })
    return Array.from(byKey.values()).sort((a, b) => b.TradeValue - a.TradeValue)
  }, [filteredCommodities])

  const tableColumns = [
    { key: 'Year', label: 'Year' },
    { key: 'HSCode', label: 'HS Code' },
    { key: 'Commodity', label: 'Commodity', wrap: true },
    { key: 'CommodityGroup', label: 'Group', wrap: true },
    { key: 'Port', label: 'Port', wrap: true },
    { key: 'TradeType', label: 'Trade Type' },
    { key: 'TradeValue', label: 'Trade Value ($)', render: (v) => formatCurrency(v) },
    { key: 'Weight', label: 'Weight (kg)', render: (v) => formatNumber(v) },
  ]

  return (
    <>
      {/* Treemap of commodity groups with drilldown */}
      <SectionBlock>
        <div className="max-w-7xl mx-auto">
          <ChartCard
            title={treemapDrill ? `${treemapDrill} — HS 2-Digit Detail` : 'Commodity Groups'}
            subtitle={treemapDrill ? 'Individual commodities within group' : 'Trade value by commodity group — click to drill down'}
          >
            {treemapDrill && (
              <div className="text-sm text-text-secondary mb-2">
                <button onClick={() => setTreemapDrill(null)} className="text-brand-blue hover:underline font-medium">
                  All Groups
                </button>
                <span className="mx-1.5">&gt;</span>
                <span className="text-text-primary font-medium">{treemapDrill}</span>
              </div>
            )}
            <TreemapChart
              data={commodityGroups}
              nameKey="label"
              valueKey="value"
              formatValue={formatCurrency}
              onCellClick={treemapDrill ? undefined : (name) => setTreemapDrill(name)}
            />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Top 10 individual commodities */}
      <SectionBlock alt>
        <div className="max-w-7xl mx-auto">
          <ChartCard title="Top 10 Commodities" subtitle="Individual commodities ranked by trade value">
            <BarChart
              data={topCommodities}
              xKey="label"
              yKey="value"
              horizontal
              formatValue={formatCurrency}
            />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Top 5 commodity group trends */}
      <SectionBlock>
        <div className="max-w-7xl mx-auto">
          <ChartCard title="Top 5 Commodity Group Trends" subtitle="Annual trade value for leading groups">
            <LineChart
              data={groupTrends}
              xKey="year"
              yKey="value"
              seriesKey="CommodityGroup"
              formatValue={formatCurrency}
            />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Commodity detail table */}
      <SectionBlock alt>
        <div className="max-w-7xl mx-auto">
          <ChartCard title="Commodity Detail" subtitle="Aggregated by year, commodity, port, and trade type">
            <DataTable data={tableData} columns={tableColumns} pageSize={15} />
          </ChartCard>
        </div>
      </SectionBlock>
    </>
  )
}
