/**
 * PortsTab — Merged port-level analysis of TX-MX surface freight trade.
 * Combines former Overview, Ports, Modes, and Monthly tabs into one view.
 * Sections: Map, Trade Trends + Mode Donut, Port Rankings, Port Trends,
 *           Mode Composition, Monthly Patterns, Detail Table.
 */
import { useMemo, useState, useEffect, useCallback } from 'react'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import BarChart from '@/components/charts/BarChart'
import LineChart from '@/components/charts/LineChart'
import DonutChart from '@/components/charts/DonutChart'
import StackedBarChart from '@/components/charts/StackedBarChart'
import DataTable from '@/components/ui/DataTable'
import PortMap from '@/components/maps/PortMap'
import { formatCurrency, formatNumber, formatWeight, getMetricField, getMetricFormatter, getMetricLabel } from '@/lib/chartColors'
import YearRangeFilter from '@/components/filters/YearRangeFilter'
import TopNSelector from '@/components/filters/TopNSelector'
import InsightCallout from '@/components/ui/InsightCallout'
import { TrendingDown, AlertTriangle, Zap } from 'lucide-react'
import { DL, PAGE_PORT_COLS } from '@/lib/downloadColumns'

const HISTORICAL_ANNOTATIONS = [
  { x: 2008.5, x2: 2009.5, label: '2008 Financial Crisis', color: 'rgba(245,158,11,0.08)', labelColor: '#b45309' },
  { x: 2019.5, x2: 2020.5, label: 'COVID-19', color: 'rgba(217,13,13,0.08)', labelColor: '#d90d0d' },
]

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
  metric = 'value',
}) {
  useEffect(() => { loadDataset('monthlyTrends') }, [loadDataset])

  const valueField = getMetricField(metric)
  const fmtValue = getMetricFormatter(metric)
  const metricLabel = getMetricLabel(metric)

  // Chart-level controls
  const allYears = useMemo(() => {
    const ys = new Set()
    filteredPortsNoYear.forEach((d) => { if (d.Year) ys.add(d.Year) })
    return [...ys].sort((a, b) => a - b)
  }, [filteredPortsNoYear])
  const [trendYearRange, setTrendYearRange] = useState({ startYear: 0, endYear: 9999 })
  const [portTopN, setPortTopN] = useState(15)
  const [portTrendTopN, setPortTrendTopN] = useState(5)

  // Initialize year range when years change
  useEffect(() => {
    if (allYears.length) {
      setTrendYearRange({ startYear: allYears[0], endYear: allYears[allYears.length - 1] })
    }
  }, [allYears])

  /* ── Map markers ───────────────────────────────────────────────────── */
  const mapPorts = useMemo(() => {
    const byPort = new Map()
    filteredPorts.forEach((d) => {
      if (!d.Port || d.Lat == null || d.Lon == null) return
      if (!byPort.has(d.Port)) {
        byPort.set(d.Port, { name: d.Port, lat: d.Lat, lng: d.Lon, value: 0, portCode: d.PortCode })
      }
      byPort.get(d.Port).value += d[valueField] || 0
    })
    return Array.from(byPort.values())
  }, [filteredPorts, valueField])

  /* ── Trade trend by Year + TradeType ───────────────────────────────── */
  const tradeTrend = useMemo(() => {
    const byYT = new Map()
    filteredPortsNoYear.forEach((d) => {
      if (!d.Year || !d.TradeType) return
      const key = `${d.Year}|${d.TradeType}`
      if (!byYT.has(key)) byYT.set(key, { year: d.Year, value: 0, TradeType: d.TradeType })
      byYT.get(key).value += d[valueField] || 0
    })
    return Array.from(byYT.values()).sort((a, b) => a.year - b.year)
      .filter(d => d.year >= trendYearRange.startYear && d.year <= trendYearRange.endYear)
  }, [filteredPortsNoYear, valueField, trendYearRange])

  /* ── Trade by mode (donut) ─────────────────────────────────────────── */
  const tradeByMode = useMemo(() => {
    const byMode = new Map()
    filteredPorts.forEach((d) => {
      if (!d.Mode) return
      byMode.set(d.Mode, (byMode.get(d.Mode) || 0) + (d[valueField] || 0))
    })
    return Array.from(byMode, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredPorts, valueField])

  /* ── Port ranking (bar) ────────────────────────────────────────────── */
  const portRanking = useMemo(() => {
    const byPort = new Map()
    filteredPorts.forEach((d) => {
      if (!d.Port) return
      byPort.set(d.Port, (byPort.get(d.Port) || 0) + (d[valueField] || 0))
    })
    return Array.from(byPort, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, portTopN)
  }, [filteredPorts, valueField, portTopN])

  /* ── Top 5 port trends (multi-series line) ─────────────────────────── */
  const portTrends = useMemo(() => {
    const totals = new Map()
    filteredPortsNoYear.forEach((d) => {
      if (!d.Port) return
      totals.set(d.Port, (totals.get(d.Port) || 0) + (d[valueField] || 0))
    })
    const topN = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).slice(0, portTrendTopN).map(([n]) => n)
    const topNSet = new Set(topN)

    const byYP = new Map()
    filteredPortsNoYear.forEach((d) => {
      if (!d.Port || !topNSet.has(d.Port)) return
      const key = `${d.Year}|${d.Port}`
      if (!byYP.has(key)) byYP.set(key, { year: d.Year, value: 0, Port: d.Port })
      byYP.get(key).value += d[valueField] || 0
    })
    return Array.from(byYP.values()).sort((a, b) => a.year - b.year)
      .filter(d => d.year >= trendYearRange.startYear && d.year <= trendYearRange.endYear)
  }, [filteredPortsNoYear, valueField, portTrendTopN, trendYearRange])

  /* ── Mode composition by year (stacked bar) ────────────────────────── */
  const modeByYear = useMemo(() => {
    const modes = new Set()
    const byYear = new Map()
    filteredPortsNoYear.forEach((d) => {
      if (!d.Mode || !d.Year) return
      modes.add(d.Mode)
      if (!byYear.has(d.Year)) byYear.set(d.Year, { year: d.Year })
      byYear.get(d.Year)[d.Mode] = (byYear.get(d.Year)[d.Mode] || 0) + (d[valueField] || 0)
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
      .filter(d => d.year >= trendYearRange.startYear && d.year <= trendYearRange.endYear)
    return { data, keys: sortedModes }
  }, [filteredPortsNoYear, valueField, trendYearRange])

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
      byYM.get(key).value += d[valueField] || 0
    })
    const sorted = Array.from(byYM.values()).sort((a, b) => a.date.localeCompare(b.date))
    sorted.forEach((d, i) => { d.idx = i })
    return sorted
  }, [filteredMonthly, valueField])

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
      byMonth.get(monthLabel)[yr] = (byMonth.get(monthLabel)[yr] || 0) + (d[valueField] || 0)
    })
    const sortedYears = [...years].sort()
    const data = Array.from(byMonth.values())
      .map((row) => { sortedYears.forEach((yr) => { if (!(yr in row)) row[yr] = 0 }); return row })
      .sort((a, b) => a._order - b._order)
    data.forEach((row) => { delete row._order })
    return { data, keys: sortedYears }
  }, [filteredMonthly, valueField])

  /* ── COVID monthly zoom (2019-2021) ────────────────────────────── */
  const covidZoom = useMemo(() => {
    if (!filteredMonthly?.length) return []
    const covidData = filteredMonthly.filter((d) => d.Year >= 2019 && d.Year <= 2021)
    const byYM = new Map()
    covidData.forEach((d) => {
      if (!d.Year || !d.Month) return
      const key = `${d.Year}|${d.Month}`
      if (!byYM.has(key)) {
        const monthStr = String(d.Month).padStart(2, '0')
        byYM.set(key, { date: `${d.Year}-${monthStr}`, value: 0 })
      }
      byYM.get(key).value += d[valueField] || 0
    })
    const sorted = Array.from(byYM.values()).sort((a, b) => a.date.localeCompare(b.date))
    sorted.forEach((d, i) => { d.idx = i })
    return sorted
  }, [filteredMonthly, valueField])

  const formatCovidX = useCallback((idx) => {
    const d = covidZoom[idx]
    return d ? d.date : ''
  }, [covidZoom])

  /* ── Port detail table ─────────────────────────────────────────────── */
  const portTableData = useMemo(() => {
    const byKey = new Map()
    filteredPorts.forEach((d) => {
      const key = `${d.Year}|${d.Port}|${d.Mode}|${d.TradeType}`
      if (!byKey.has(key)) {
        byKey.set(key, {
          Year: d.Year, Port: d.Port || '—', Region: d.Region || '—',
          Mode: d.Mode || '—', TradeType: d.TradeType || '—',
          TradeValue: 0, WeightLb: 0,
        })
      }
      const row = byKey.get(key)
      row.TradeValue += d.TradeValue || 0
      row.WeightLb += d.WeightLb || 0
    })
    return Array.from(byKey.values()).sort((a, b) => b.TradeValue - a.TradeValue)
  }, [filteredPorts])

  /* ── Trade balance by year ─────────────────────────────────────── */
  const tradeBalance = useMemo(() => {
    const byYear = new Map()
    filteredPortsNoYear.forEach((d) => {
      if (!d.Year) return
      if (!byYear.has(d.Year)) byYear.set(d.Year, { year: d.Year, Exports: 0, Imports: 0, Balance: 0 })
      const row = byYear.get(d.Year)
      if (d.TradeType === 'Export') row.Exports += d.TradeValue || 0
      if (d.TradeType === 'Import') row.Imports += d.TradeValue || 0
    })
    const result = []
    byYear.forEach((row) => {
      row.Balance = row.Exports - row.Imports
      result.push({ year: row.year, value: row.Balance, TradeType: 'Trade Balance' })
    })
    return result.sort((a, b) => a.year - b.year)
  }, [filteredPortsNoYear])

  /* ── Laredo share of total trade ─────────────────────────────── */
  const laredoShare = useMemo(() => {
    const byYear = new Map()
    filteredPortsNoYear.forEach((d) => {
      if (!d.Year) return
      if (!byYear.has(d.Year)) byYear.set(d.Year, { total: 0, laredo: 0 })
      const row = byYear.get(d.Year)
      row.total += d.TradeValue || 0
      if (d.Port === 'Laredo') row.laredo += d.TradeValue || 0
    })
    return Array.from(byYear, ([year, row]) => ({
      year, value: row.total > 0 ? (row.laredo / row.total) * 100 : 0,
    })).sort((a, b) => a.year - b.year)
  }, [filteredPortsNoYear])

  const tableColumns = [
    { key: 'Year', label: 'Year' },
    { key: 'Port', label: 'Port', wrap: true },
    { key: 'Region', label: 'Region' },
    { key: 'Mode', label: 'Mode' },
    { key: 'TradeType', label: 'Trade Type' },
    { key: 'TradeValue', label: 'Trade Value ($)', render: (v) => formatCurrency(v) },
    { key: 'WeightLb', label: 'Weight (lb)', render: (v) => v ? formatWeight(v) : '—' },
  ]

  return (
    <>
      {/* Narrative Intro */}
      <SectionBlock>
        <div className="max-w-4xl mx-auto">
          <p className="text-lg text-text-secondary leading-relaxed">
            Texas's 14 border ports of entry are the backbone of U.S.–Mexico trade, handling roughly two-thirds
            of all freight crossing the border. Three port clusters — <strong>Laredo</strong> (central),{' '}
            <strong>El Paso/Ysleta</strong> (west), and <strong>Hidalgo/Pharr</strong> (east) — account
            for over 85% of that total. Laredo alone processes nearly 60% of all Texas–Mexico trade,
            making it the single busiest international freight gateway in the Western Hemisphere.
          </p>
        </div>
      </SectionBlock>

      {/* Port Map */}
      <SectionBlock>
        <div className="max-w-7xl mx-auto">
          <ChartCard title="Texas-Mexico Ports of Entry" subtitle={`Bubble size reflects total ${metricLabel.toLowerCase()} for selected filters`}>
            <PortMap ports={mapPorts} formatValue={fmtValue} center={[28.5, -100.0]} zoom={6} height="520px" />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Key Insights */}
      <SectionBlock alt>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-7xl mx-auto">
          <InsightCallout
            finding="Laredo handles more trade than the next 5 Texas ports combined — over $330B annually."
            context="This makes Laredo the busiest land port in the Western Hemisphere."
          />
          <InsightCallout
            finding="Truck carries ~83% of Texas-Mexico trade by value, with rail handling most of the remainder."
            context="The truck-rail split has been remarkably stable over nearly two decades."
            variant="highlight"
          />
        </div>
      </SectionBlock>

      {/* Trade Trends + Mode Donut (2-col) */}
      <SectionBlock alt>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
          <ChartCard title="TX-MX Trade Trends" subtitle={`Annual ${metricLabel.toLowerCase()} by direction`}
            headerRight={<YearRangeFilter years={allYears} startYear={trendYearRange.startYear} endYear={trendYearRange.endYear} onChange={setTrendYearRange} />}
            downloadData={{ summary: { data: tradeTrend, filename: 'tx-mx-trade-trends', columns: DL.tradeTrendSeries } }}>
            <LineChart data={tradeTrend} xKey="year" yKey="value" seriesKey="TradeType" formatValue={fmtValue} annotations={HISTORICAL_ANNOTATIONS} />
          </ChartCard>
          <ChartCard title="Trade by Mode" subtitle="All selected years combined"
            downloadData={{ summary: { data: tradeByMode, filename: 'tx-mx-trade-by-mode', columns: DL.modeRank } }}>
            <DonutChart data={tradeByMode} nameKey="label" valueKey="value" formatValue={fmtValue} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Trade Balance Trend */}
      <SectionBlock>
        <div className="max-w-7xl mx-auto">
          <ChartCard title="Trade Balance Trend" subtitle="Exports minus imports — negative values indicate a trade deficit">
            <LineChart data={tradeBalance} xKey="year" yKey="value" formatValue={formatCurrency} showArea annotations={HISTORICAL_ANNOTATIONS} />
          </ChartCard>
          <div className="mt-4">
            <InsightCallout
              finding="Texas's trade deficit with Mexico has widened from roughly -$30B in 2007 to over -$125B in 2024 — a 4x increase driven by imports of finished vehicles, electronics, and consumer goods."
              icon={TrendingDown}
              variant="warning"
            />
          </div>
        </div>
      </SectionBlock>

      {/* Port Ranking */}
      <SectionBlock alt>
        <div className="max-w-7xl mx-auto">
          <ChartCard title="Port Ranking" subtitle={`Top ${portTopN} ports by ${metricLabel.toLowerCase()}`}
            headerRight={<TopNSelector value={portTopN} onChange={setPortTopN} />}
            downloadData={{ summary: { data: portRanking, filename: 'tx-mx-port-ranking', columns: DL.portRank } }}>
            <BarChart data={portRanking} xKey="label" yKey="value" horizontal formatValue={fmtValue} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Laredo Concentration */}
      <SectionBlock alt>
        <div className="max-w-7xl mx-auto">
          <ChartCard title="Laredo's Share of TX-MX Trade" subtitle="Percentage of total Texas-Mexico trade flowing through Laredo">
            <LineChart data={laredoShare} xKey="year" yKey="value" formatValue={(v) => `${v.toFixed(1)}%`} showArea annotations={HISTORICAL_ANNOTATIONS} />
          </ChartCard>
          <div className="mt-4">
            <InsightCallout
              finding="Laredo's share has grown from 52% in 2007 to nearly 60% in 2024. At current volumes, a single day of disruption at Laredo delays an estimated $900M in freight."
              icon={AlertTriangle}
              variant="warning"
            />
          </div>
        </div>
      </SectionBlock>

      {/* Top 5 Port Trends */}
      <SectionBlock alt>
        <div className="max-w-7xl mx-auto">
          <ChartCard title={`Top ${portTrendTopN} Port Trends`} subtitle={`Annual ${metricLabel.toLowerCase()} for the largest ports`}
            headerRight={<><TopNSelector value={portTrendTopN} onChange={setPortTrendTopN} /><YearRangeFilter years={allYears} startYear={trendYearRange.startYear} endYear={trendYearRange.endYear} onChange={setTrendYearRange} /></>}
            downloadData={{ summary: { data: portTrends, filename: 'tx-mx-top5-port-trends', columns: DL.tradeTrendSeries } }}>
            <LineChart data={portTrends} xKey="year" yKey="value" seriesKey="Port" formatValue={fmtValue} annotations={HISTORICAL_ANNOTATIONS} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Mode Composition by Year */}
      <SectionBlock>
        <div className="max-w-7xl mx-auto">
          <ChartCard title="Mode Composition by Year" subtitle={`Annual ${metricLabel.toLowerCase()} stacked by transport mode`}
            headerRight={<YearRangeFilter years={allYears} startYear={trendYearRange.startYear} endYear={trendYearRange.endYear} onChange={setTrendYearRange} />}>
            <StackedBarChart data={modeByYear.data} xKey="year" stackKeys={modeByYear.keys} formatValue={fmtValue} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Monthly Patterns (if data loaded) */}
      {filteredMonthly && filteredMonthly.length > 0 && (
        <>
          {covidZoom.length > 0 && (
            <SectionBlock>
              <div className="max-w-7xl mx-auto">
                <ChartCard title="COVID-19 Impact & Recovery" subtitle="Monthly trade, January 2019 – December 2021">
                  <LineChart data={covidZoom} xKey="idx" yKey="value" formatValue={fmtValue} formatX={formatCovidX} showArea />
                </ChartCard>
                <div className="mt-4">
                  <InsightCallout
                    finding="Trade plunged 49% in April 2020 — from $32B to $17B in a single month. But within four months, Texas-Mexico trade had fully rebounded, underscoring how tightly integrated these economies are."
                    icon={Zap}
                    variant="highlight"
                  />
                </div>
              </div>
            </SectionBlock>
          )}
          <SectionBlock alt>
            <div className="flex flex-col gap-6 max-w-7xl mx-auto">
              <ChartCard title="Monthly Trade Trends" subtitle="Continuous monthly time series"
                downloadData={{ summary: { data: monthlyTimeSeries, filename: 'tx-mx-monthly-trends', columns: DL.tradeTrend } }}>
                <LineChart data={monthlyTimeSeries} xKey="idx" yKey="value" formatValue={fmtValue} formatX={formatX} />
              </ChartCard>
              <ChartCard title="Seasonal Patterns" subtitle={`${metricLabel} by month, stacked by year`}>
                <StackedBarChart data={seasonalData.data} xKey="month" stackKeys={seasonalData.keys} formatValue={fmtValue} />
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
