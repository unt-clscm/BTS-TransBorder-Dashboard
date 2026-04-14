/**
 * MonthlyTab — Monthly time-series analysis for TX-MX freight trade.
 * Loads monthlyTrends on mount and filters to Country=Mexico.
 * Shows continuous monthly line chart, seasonal stacked bar, and detail table.
 */
import { useMemo, useEffect, useCallback } from 'react'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import LineChart from '@/components/charts/LineChart'
import StackedBarChart from '@/components/charts/StackedBarChart'
import DataTable from '@/components/ui/DataTable'
import { formatCurrency } from '@/lib/chartColors'
import DatasetError from '@/components/ui/DatasetError'
import { DL, PAGE_MONTHLY_COLS } from '@/lib/downloadColumns'

const MONTH_LABELS = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export default function MonthlyTab({ filteredMonthly, loadDataset, _latestYear, datasetError }) {
  /* ── ensure dataset is loaded ────────────────────────────────────── */
  useEffect(() => {
    loadDataset('monthlyTrends')
  }, [loadDataset])

  /* ── Continuous monthly time series ──────────────────────────────── */
  const monthlyTimeSeries = useMemo(() => {
    if (!filteredMonthly) return []
    const byYM = new Map()
    filteredMonthly.forEach((d) => {
      if (!d.Year || !d.Month) return
      const key = `${d.Year}|${d.Month}`
      if (!byYM.has(key)) {
        const monthStr = String(d.Month).padStart(2, '0')
        byYM.set(key, { date: `${d.Year}-${monthStr}`, value: 0 })
      }
      byYM.get(key).value += d.TradeValue || 0
    })
    const sorted = Array.from(byYM.values()).sort((a, b) => a.date.localeCompare(b.date))
    // Assign sequential numeric index — LineChart requires numeric xKey
    sorted.forEach((d, i) => { d.idx = i })
    return sorted
  }, [filteredMonthly])

  /* ── Format index → date label for x-axis ticks / tooltip ──────── */
  const formatX = useCallback((idx) => {
    const d = monthlyTimeSeries[idx]
    return d ? d.date : ''
  }, [monthlyTimeSeries])

  /* ── Seasonal pattern: month x year stacked bar ──────────────────── */
  const seasonalData = useMemo(() => {
    if (!filteredMonthly) return { data: [], keys: [] }
    const years = new Set()
    const byMonth = new Map()
    filteredMonthly.forEach((d) => {
      if (!d.Year || !d.Month) return
      const yr = String(d.Year)
      years.add(yr)
      const monthLabel = MONTH_LABELS[d.Month] || `M${d.Month}`
      if (!byMonth.has(monthLabel)) byMonth.set(monthLabel, { month: monthLabel, _order: d.Month })
      byMonth.get(monthLabel)[yr] = (byMonth.get(monthLabel)[yr] || 0) + (d.TradeValue || 0)
    })
    const sortedYears = [...years].sort()
    const data = Array.from(byMonth.values())
      .map((row) => {
        sortedYears.forEach((yr) => { if (!(yr in row)) row[yr] = 0 })
        return row
      })
      .sort((a, b) => a._order - b._order)
    // Remove _order helper before passing to chart
    data.forEach((row) => { delete row._order })
    return { data, keys: sortedYears }
  }, [filteredMonthly])

  /* ── Monthly detail table ────────────────────────────────────────── */
  const tableData = useMemo(() => {
    if (!filteredMonthly) return []
    const byKey = new Map()
    filteredMonthly.forEach((d) => {
      const key = `${d.Year}|${d.Month}|${d.Mode}|${d.TradeType}`
      if (!byKey.has(key)) {
        byKey.set(key, {
          Year: d.Year,
          Month: MONTH_LABELS[d.Month] || d.Month,
          Mode: d.Mode || '—',
          TradeType: d.TradeType || '—',
          TradeValue: 0,
        })
      }
      byKey.get(key).TradeValue += d.TradeValue || 0
    })
    return Array.from(byKey.values()).sort((a, b) => {
      if (a.Year !== b.Year) return b.Year - a.Year
      return b.TradeValue - a.TradeValue
    })
  }, [filteredMonthly])

  /* ── early returns AFTER all hooks ──────────────────────────────── */
  if (datasetError) {
    return <DatasetError datasetName="Monthly Trends" error={datasetError} onRetry={() => loadDataset('monthlyTrends')} />
  }

  /* ── spinner while loading ───────────────────────────────────────── */
  if (!filteredMonthly) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-base text-text-secondary">Loading monthly trend data...</p>
        </div>
      </div>
    )
  }

  const tableColumns = [
    { key: 'Year', label: 'Year' },
    { key: 'Month', label: 'Month' },
    { key: 'Mode', label: 'Mode' },
    { key: 'TradeType', label: 'Trade Type' },
    { key: 'TradeValue', label: 'Trade Value ($)', render: (v) => formatCurrency(v) },
  ]

  return (
    <>
      {/* Continuous monthly trend */}
      <SectionBlock>
        <ChartCard title="Monthly Trade Trends" subtitle="Continuous monthly time series of TX-MX trade value"
            downloadData={{ summary: { data: monthlyTimeSeries, filename: 'tx-mx-monthly-trends', columns: DL.tradeTrend } }}>
            <LineChart
              data={monthlyTimeSeries}
              xKey="idx"
              yKey="value"
              formatValue={formatCurrency}
              formatX={formatX}
            />
        </ChartCard>
      </SectionBlock>

      {/* Seasonal pattern stacked bar */}
      <SectionBlock alt>
        <ChartCard title="Seasonal Patterns" subtitle="Trade value by month, stacked by year">
          <StackedBarChart
            data={seasonalData.data}
            xKey="month"
            stackKeys={seasonalData.keys}
            formatValue={formatCurrency}
          />
        </ChartCard>
      </SectionBlock>

      {/* Monthly detail table */}
      <SectionBlock>
        <div className="max-w-7xl mx-auto">
          <ChartCard title="Monthly Detail" subtitle="Aggregated by year, month, mode, and trade type"
            downloadData={{ summary: { data: tableData, filename: 'tx-mx-monthly-detail', columns: PAGE_MONTHLY_COLS } }}>
            <DataTable data={tableData} columns={tableColumns} pageSize={15} />
          </ChartCard>
        </div>
      </SectionBlock>
    </>
  )
}
