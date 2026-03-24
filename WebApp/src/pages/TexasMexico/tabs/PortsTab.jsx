/**
 * PortsTab — Merged port-level analysis of TX-MX surface freight trade.
 * Combines former Overview, Ports, Modes, and Monthly tabs into one view.
 * Sections: Map, Trade Trends + Mode Donut, Port Rankings, Port Trends,
 *           Mode Composition, Monthly Patterns, Detail Table.
 */
import { useMemo, useEffect, useCallback } from 'react'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import BarChart from '@/components/charts/BarChart'
import LineChart from '@/components/charts/LineChart'
import DonutChart from '@/components/charts/DonutChart'
import StackedBarChart from '@/components/charts/StackedBarChart'
import DataTable from '@/components/ui/DataTable'
import PortMap from '@/components/maps/PortMap'
import { formatCurrency, formatNumber } from '@/lib/chartColors'
import { DL, PAGE_PORT_COLS } from '@/lib/downloadColumns'

const COVID_ANNOTATION = [{ x: 2019.5, x2: 2020.5, label: 'COVID-19', color: 'rgba(217,13,13,0.08)', labelColor: '#d90d0d' }]

const MONTH_LABELS = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export default function PortsTab({
  filteredPorts,
  filteredPortsNoYear,
  filteredMonthly,
  loadDataset,
  latestYear,
  datasetError,
}) {
  useEffect(() => { loadDataset('monthlyTrends') }, [loadDataset])

  /* ── Map markers ───────────────────────────────────────────────────── */
  const mapPorts = useMemo(() => {
    const byPort = new Map()
    filteredPorts.forEach((d) => {
      if (!d.Port || d.Lat == null || d.Lon == null) return
      if (!byPort.has(d.Port)) {
        byPort.set(d.Port, { name: d.Port, lat: d.Lat, lng: d.Lon, value: 0, portCode: d.PortCode })
      }
      byPort.get(d.Port).value += d.TradeValue || 0
    })
    return Array.from(byPort.values())
  }, [filteredPorts])

  /* ── Trade trend by Year + TradeType ───────────────────────────────── */
  const tradeTrend = useMemo(() => {
    const byYT = new Map()
    filteredPortsNoYear.forEach((d) => {
      if (!d.Year || !d.TradeType) return
      const key = `${d.Year}|${d.TradeType}`
      if (!byYT.has(key)) byYT.set(key, { year: d.Year, value: 0, TradeType: d.TradeType })
      byYT.get(key).value += d.TradeValue || 0
    })
    return Array.from(byYT.values()).sort((a, b) => a.year - b.year)
  }, [filteredPortsNoYear])

  /* ── Trade by mode (donut) ─────────────────────────────────────────── */
  const tradeByMode = useMemo(() => {
    const byMode = new Map()
    filteredPorts.forEach((d) => {
      if (!d.Mode) return
      byMode.set(d.Mode, (byMode.get(d.Mode) || 0) + (d.TradeValue || 0))
    })
    return Array.from(byMode, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredPorts])

  /* ── Port ranking (bar) ────────────────────────────────────────────── */
  const portRanking = useMemo(() => {
    const byPort = new Map()
    filteredPorts.forEach((d) => {
      if (!d.Port) return
      byPort.set(d.Port, (byPort.get(d.Port) || 0) + (d.TradeValue || 0))
    })
    return Array.from(byPort, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15)
  }, [filteredPorts])

  /* ── Top 5 port trends (multi-series line) ─────────────────────────── */
  const portTrends = useMemo(() => {
    const totals = new Map()
    filteredPortsNoYear.forEach((d) => {
      if (!d.Port) return
      totals.set(d.Port, (totals.get(d.Port) || 0) + (d.TradeValue || 0))
    })
    const top5 = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n)
    const top5Set = new Set(top5)

    const byYP = new Map()
    filteredPortsNoYear.forEach((d) => {
      if (!d.Port || !top5Set.has(d.Port)) return
      const key = `${d.Year}|${d.Port}`
      if (!byYP.has(key)) byYP.set(key, { year: d.Year, value: 0, Port: d.Port })
      byYP.get(key).value += d.TradeValue || 0
    })
    return Array.from(byYP.values()).sort((a, b) => a.year - b.year)
  }, [filteredPortsNoYear])

  /* ── Mode composition by year (stacked bar) ────────────────────────── */
  const modeByYear = useMemo(() => {
    const modes = new Set()
    const byYear = new Map()
    filteredPortsNoYear.forEach((d) => {
      if (!d.Mode || !d.Year) return
      modes.add(d.Mode)
      if (!byYear.has(d.Year)) byYear.set(d.Year, { year: d.Year })
      byYear.get(d.Year)[d.Mode] = (byYear.get(d.Year)[d.Mode] || 0) + (d.TradeValue || 0)
    })
    const modeTotals = new Map()
    modes.forEach((m) => {
      let total = 0
      byYear.forEach((row) => { total += row[m] || 0 })
      modeTotals.set(m, total)
    })
    const sortedModes = [...modes].sort((a, b) => modeTotals.get(b) - modeTotals.get(a))
    const data = Array.from(byYear.values())
      .map((row) => { sortedModes.forEach((m) => { if (!(m in row)) row[m] = 0 }); return row })
      .sort((a, b) => a.year - b.year)
    return { data, keys: sortedModes }
  }, [filteredPortsNoYear])

  /* ── Monthly time series ───────────────────────────────────────────── */
  const monthlyTimeSeries = useMemo(() => {
    if (!filteredMonthly?.length) return []
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
    sorted.forEach((d, i) => { d.idx = i })
    return sorted
  }, [filteredMonthly])

  const formatX = useCallback((idx) => {
    const d = monthlyTimeSeries[idx]
    return d ? d.date : ''
  }, [monthlyTimeSeries])

  /* ── Seasonal pattern (stacked bar) ────────────────────────────────── */
  const seasonalData = useMemo(() => {
    if (!filteredMonthly?.length) return { data: [], keys: [] }
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
      .map((row) => { sortedYears.forEach((yr) => { if (!(yr in row)) row[yr] = 0 }); return row })
      .sort((a, b) => a._order - b._order)
    data.forEach((row) => { delete row._order })
    return { data, keys: sortedYears }
  }, [filteredMonthly])

  /* ── Port detail table ─────────────────────────────────────────────── */
  const portTableData = useMemo(() => {
    const byKey = new Map()
    filteredPorts.forEach((d) => {
      const key = `${d.Year}|${d.Port}|${d.Mode}|${d.TradeType}`
      if (!byKey.has(key)) {
        byKey.set(key, {
          Year: d.Year, Port: d.Port || '—', Region: d.Region || '—',
          Mode: d.Mode || '—', TradeType: d.TradeType || '—',
          TradeValue: 0, Weight: 0,
        })
      }
      const row = byKey.get(key)
      row.TradeValue += d.TradeValue || 0
      row.Weight += d.Weight || 0
    })
    return Array.from(byKey.values()).sort((a, b) => b.TradeValue - a.TradeValue)
  }, [filteredPorts])

  const tableColumns = [
    { key: 'Year', label: 'Year' },
    { key: 'Port', label: 'Port', wrap: true },
    { key: 'Region', label: 'Region' },
    { key: 'Mode', label: 'Mode' },
    { key: 'TradeType', label: 'Trade Type' },
    { key: 'TradeValue', label: 'Trade Value ($)', render: (v) => formatCurrency(v) },
    { key: 'Weight', label: 'Weight (kg)', render: (v) => formatNumber(v) },
  ]

  return (
    <>
      {/* Port Map */}
      <SectionBlock>
        <div className="max-w-7xl mx-auto">
          <ChartCard title="Texas-Mexico Ports of Entry" subtitle="Bubble size reflects total trade value for selected filters">
            <PortMap ports={mapPorts} formatValue={formatCurrency} center={[28.5, -100.0]} zoom={6} height="520px" />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Trade Trends + Mode Donut (2-col) */}
      <SectionBlock alt>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
          <ChartCard title="TX-MX Trade Trends" subtitle="Annual trade value by direction"
            downloadData={{ summary: { data: tradeTrend, filename: 'tx-mx-trade-trends', columns: DL.tradeTrendSeries } }}>
            <LineChart data={tradeTrend} xKey="year" yKey="value" seriesKey="TradeType" formatValue={formatCurrency} annotations={COVID_ANNOTATION} />
          </ChartCard>
          <ChartCard title="Trade by Mode" subtitle="All selected years combined"
            downloadData={{ summary: { data: tradeByMode, filename: 'tx-mx-trade-by-mode', columns: DL.modeRank } }}>
            <DonutChart data={tradeByMode} nameKey="label" valueKey="value" formatValue={formatCurrency} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Port Ranking */}
      <SectionBlock>
        <div className="max-w-7xl mx-auto">
          <ChartCard title="Port Ranking" subtitle="Top 15 ports by total trade value"
            downloadData={{ summary: { data: portRanking, filename: 'tx-mx-port-ranking', columns: DL.portRank } }}>
            <BarChart data={portRanking} xKey="label" yKey="value" horizontal formatValue={formatCurrency} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Top 5 Port Trends */}
      <SectionBlock alt>
        <div className="max-w-7xl mx-auto">
          <ChartCard title="Top 5 Port Trends" subtitle="Annual trade value for the five largest ports"
            downloadData={{ summary: { data: portTrends, filename: 'tx-mx-top5-port-trends', columns: DL.tradeTrendSeries } }}>
            <LineChart data={portTrends} xKey="year" yKey="value" seriesKey="Port" formatValue={formatCurrency} annotations={COVID_ANNOTATION} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Mode Composition by Year */}
      <SectionBlock>
        <div className="max-w-7xl mx-auto">
          <ChartCard title="Mode Composition by Year" subtitle="Annual trade value stacked by transport mode">
            <StackedBarChart data={modeByYear.data} xKey="year" stackKeys={modeByYear.keys} formatValue={formatCurrency} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Monthly Patterns (if data loaded) */}
      {filteredMonthly && filteredMonthly.length > 0 && (
        <>
          <SectionBlock alt>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
              <ChartCard title="Monthly Trade Trends" subtitle="Continuous monthly time series"
                downloadData={{ summary: { data: monthlyTimeSeries, filename: 'tx-mx-monthly-trends', columns: DL.tradeTrend } }}>
                <LineChart data={monthlyTimeSeries} xKey="idx" yKey="value" formatValue={formatCurrency} formatX={formatX} />
              </ChartCard>
              <ChartCard title="Seasonal Patterns" subtitle="Trade value by month, stacked by year">
                <StackedBarChart data={seasonalData.data} xKey="month" stackKeys={seasonalData.keys} formatValue={formatCurrency} />
              </ChartCard>
            </div>
          </SectionBlock>
        </>
      )}

      {/* Port Detail Table */}
      <SectionBlock alt={!(filteredMonthly && filteredMonthly.length > 0)}>
        <div className="max-w-7xl mx-auto">
          <ChartCard title="Port Detail" subtitle="Aggregated by year, port, mode, and trade type"
            downloadData={{ summary: { data: portTableData, filename: 'tx-mx-port-detail', columns: PAGE_PORT_COLS } }}>
            <DataTable data={portTableData} columns={tableColumns} pageSize={15} />
          </ChartCard>
        </div>
      </SectionBlock>
    </>
  )
}
