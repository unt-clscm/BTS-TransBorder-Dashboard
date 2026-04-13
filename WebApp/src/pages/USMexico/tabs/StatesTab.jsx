/**
 * USMexico States Tab — US states + Mexican states choropleth maps, rankings, trends.
 * Uses usStateTrade (DOT1) and mexicanStateTrade (DOT1) datasets.
 */
import { useMemo, useEffect, useState } from 'react'
import { getAxisFormatter } from '@/lib/transborderHelpers'
import { CHART_COLORS, getMetricField, getMetricFormatter, getMetricLabel, hasSurfaceExports, isAllSurfaceExports } from '@/lib/chartColors'
import WeightCaveatBanner from '@/components/ui/WeightCaveatBanner'
import TopNSelector from '@/components/filters/TopNSelector'
import YearRangeFilter from '@/components/filters/YearRangeFilter'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import ChoroplethMap from '@/components/maps/ChoroplethMap'
import BarChart from '@/components/charts/BarChart'
import LollipopChart from '@/components/charts/LollipopChart'
import LineChart from '@/components/charts/LineChart'
import StackedBarChart from '@/components/charts/StackedBarChart'
import DataTable from '@/components/ui/DataTable'
import InsightCallout from '@/components/ui/InsightCallout'
import { ANNOTATIONS_MODERN as HISTORICAL_ANNOTATIONS } from '@/lib/annotations'
import { TEXAS_COLOR } from '@/hooks/useTexasOverlay'
import { Star } from 'lucide-react'
const BASE = import.meta.env.BASE_URL

export default function StatesTab({
  usStateTrade,
  mexicanStateTrade,
  stateCommodityTrade,
  loadDataset,
  _latestYear,
  yearFilter,
  tradeTypeFilter,
  modeFilter,
  stateFilter,
  mexStateFilter,
  _datasetErrors,
  metric = 'value',
  showTexas = true,
}) {
  useEffect(() => {
    loadDataset('usStateTrade')
    loadDataset('mexicanStateTrade')
  }, [loadDataset])

  const valueField = getMetricField(metric)
  const fmtValue = getMetricFormatter(metric)
  const metricLabel = getMetricLabel(metric)

  // Weight caveat flags — computed after filtered data (below)
  const [usTopN, setUsTopN] = useState(15)
  const [mxTopN, setMxTopN] = useState(15)
  const [usTrendTopN, setUsTrendTopN] = useState(5)
  const [mxTrendTopN, setMxTrendTopN] = useState(5)
  const [growthTopN, setGrowthTopN] = useState(15)

  /* ── filter US state data to Mexico only ──────────────────────────── */
  const filteredUS = useMemo(() => {
    if (!usStateTrade) return []
    let data = usStateTrade.filter((d) => d.Country === 'Mexico')
    if (yearFilter?.length) data = data.filter((d) => yearFilter.includes(String(d.Year)))
    if (tradeTypeFilter) data = data.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter?.length) data = data.filter((d) => modeFilter.includes(d.Mode))
    if (stateFilter?.length) data = data.filter((d) => stateFilter.includes(d.State))
    return data
  }, [usStateTrade, yearFilter, tradeTypeFilter, modeFilter, stateFilter])

  const filteredUSNoYear = useMemo(() => {
    if (!usStateTrade) return []
    let data = usStateTrade.filter((d) => d.Country === 'Mexico')
    if (tradeTypeFilter) data = data.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter?.length) data = data.filter((d) => modeFilter.includes(d.Mode))
    if (stateFilter?.length) data = data.filter((d) => stateFilter.includes(d.State))
    return data
  }, [usStateTrade, tradeTypeFilter, modeFilter, stateFilter])

  /* ── filter Mexican state data ────────────────────────────────────── */
  const filteredMX = useMemo(() => {
    if (!mexicanStateTrade) return []
    let data = mexicanStateTrade
    if (yearFilter?.length) data = data.filter((d) => yearFilter.includes(String(d.Year)))
    if (tradeTypeFilter) data = data.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter?.length) data = data.filter((d) => modeFilter.includes(d.Mode))
    if (mexStateFilter?.length) data = data.filter((d) => mexStateFilter.includes(d.MexState))
    return data
  }, [mexicanStateTrade, yearFilter, tradeTypeFilter, modeFilter, mexStateFilter])

  const filteredMXNoYear = useMemo(() => {
    if (!mexicanStateTrade) return []
    let data = mexicanStateTrade
    if (tradeTypeFilter) data = data.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter?.length) data = data.filter((d) => modeFilter.includes(d.Mode))
    if (mexStateFilter?.length) data = data.filter((d) => mexStateFilter.includes(d.MexState))
    return data
  }, [mexicanStateTrade, tradeTypeFilter, modeFilter, mexStateFilter])

  const weightAllNA = metric === 'weight' && isAllSurfaceExports(filteredUS)
  const weightPartial = !weightAllNA && metric === 'weight' && hasSurfaceExports(filteredUS)

  /* ── year ranges for trend charts ───────────────────────────────── */
  const allUSYears = useMemo(() => {
    const ys = new Set()
    filteredUSNoYear.forEach((d) => { if (d.Year) ys.add(d.Year) })
    return [...ys].sort((a, b) => a - b)
  }, [filteredUSNoYear])

  const allMXYears = useMemo(() => {
    const ys = new Set()
    filteredMXNoYear.forEach((d) => { if (d.Year) ys.add(d.Year) })
    return [...ys].sort((a, b) => a - b)
  }, [filteredMXNoYear])

  const [usTrendYearRange, setUsTrendYearRange] = useState({ startYear: 0, endYear: 9999 })
  const [mxTrendYearRange, setMxTrendYearRange] = useState({ startYear: 0, endYear: 9999 })
  useEffect(() => {
    if (allUSYears.length) setUsTrendYearRange({ startYear: allUSYears[0], endYear: allUSYears[allUSYears.length - 1] })
  }, [allUSYears])
  useEffect(() => {
    if (allMXYears.length) setMxTrendYearRange({ startYear: allMXYears[0], endYear: allMXYears[allMXYears.length - 1] })
  }, [allMXYears])

  /* ── US state choropleth data ─────────────────────────────────────── */
  const usMapData = useMemo(() => {
    const byState = new Map()
    filteredUS.forEach((d) => {
      const st = d.State || 'Unknown'
      byState.set(st, (byState.get(st) || 0) + (d[valueField] || 0))
    })
    return Array.from(byState, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [filteredUS, valueField])

  /* ── Mexican state choropleth data ────────────────────────────────── */
  const mxMapData = useMemo(() => {
    const byState = new Map()
    filteredMX.forEach((d) => {
      const st = d.MexState || 'Unknown'
      byState.set(st, (byState.get(st) || 0) + (d[valueField] || 0))
    })
    return Array.from(byState, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [filteredMX, valueField])

  /* ── US top N states bar data ───────────────────────────────────── */
  const usBarData = useMemo(() => usMapData.slice(0, usTopN).map((d) => ({ label: d.name, value: d.value })), [usMapData, usTopN])

  /* ── MX top N states bar data ───────────────────────────────────── */
  const mxBarData = useMemo(() => mxMapData.slice(0, mxTopN).map((d) => ({ label: d.name, value: d.value })), [mxMapData, mxTopN])

  /* ── US top N state trends ──────────────────────────────────────── */
  const usStateTrends = useMemo(() => {
    const rangeData = filteredUSNoYear.filter((d) => d.Year >= usTrendYearRange.startYear && d.Year <= usTrendYearRange.endYear)
    const totals = new Map()
    rangeData.forEach((d) => {
      const st = d.State || 'Unknown'
      totals.set(st, (totals.get(st) || 0) + (d[valueField] || 0))
    })
    const topN = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, usTrendTopN).map(([n]) => n)
    const topNSet = new Set(topN)

    const byYearState = new Map()
    rangeData.forEach((d) => {
      const st = d.State || 'Unknown'
      if (!topNSet.has(st)) return
      const key = `${d.Year}|${st}`
      if (!byYearState.has(key)) byYearState.set(key, { year: d.Year, value: 0, State: st })
      byYearState.get(key).value += (d[valueField] || 0)
    })
    return Array.from(byYearState.values()).sort((a, b) => a.year - b.year)
  }, [filteredUSNoYear, valueField, usTrendTopN, usTrendYearRange])

  /* ── MX top N state trends ─────────────────────────────────────── */
  const mxStateTrends = useMemo(() => {
    const rangeData = filteredMXNoYear.filter((d) => d.Year >= mxTrendYearRange.startYear && d.Year <= mxTrendYearRange.endYear)
    const totals = new Map()
    rangeData.forEach((d) => {
      const st = d.MexState || 'Unknown'
      totals.set(st, (totals.get(st) || 0) + (d[valueField] || 0))
    })
    const topN = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, mxTrendTopN).map(([n]) => n)
    const topNSet = new Set(topN)

    const byYearState = new Map()
    rangeData.forEach((d) => {
      const st = d.MexState || 'Unknown'
      if (!topNSet.has(st)) return
      const key = `${d.Year}|${st}`
      if (!byYearState.has(key)) byYearState.set(key, { year: d.Year, value: 0, MexState: st })
      byYearState.get(key).value += (d[valueField] || 0)
    })
    return Array.from(byYearState.values()).sort((a, b) => a.year - b.year)
  }, [filteredMXNoYear, valueField, mxTrendTopN, mxTrendYearRange])

  /* ── US state growth rates (earliest vs latest 3-year avg) ─────── */
  const usStateGrowth = useMemo(() => {
    if (!filteredUSNoYear.length) return []
    const byYearState = new Map()
    filteredUSNoYear.forEach((d) => {
      const st = d.State || 'Unknown'
      const key = `${d.Year}|${st}`
      if (!byYearState.has(key)) byYearState.set(key, { year: d.Year, state: st, value: 0 })
      byYearState.get(key).value += d[valueField] || 0
    })
    const years = [...new Set(filteredUSNoYear.map((d) => d.Year))].sort((a, b) => a - b)
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
      .slice(0, growthTopN)
  }, [filteredUSNoYear, valueField, growthTopN])

  /* ── MX state growth rates (earliest vs latest 3-year avg) ─────── */
  const mxStateGrowth = useMemo(() => {
    if (!filteredMXNoYear.length) return []
    const byYearState = new Map()
    filteredMXNoYear.forEach((d) => {
      const st = d.MexState || 'Unknown'
      const key = `${d.Year}|${st}`
      if (!byYearState.has(key)) byYearState.set(key, { year: d.Year, state: st, value: 0 })
      byYearState.get(key).value += d[valueField] || 0
    })
    const years = [...new Set(filteredMXNoYear.map((d) => d.Year))].sort((a, b) => a - b)
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
      .slice(0, growthTopN)
  }, [filteredMXNoYear, valueField, growthTopN])

  /* ── US detail table ──────────────────────────────────────────────── */
  const usTableData = useMemo(() => {
    const byState = new Map()
    filteredUS.forEach((d) => {
      const st = d.State || 'Unknown'
      if (!byState.has(st)) byState.set(st, { State: st, Total: 0, Exports: 0, Imports: 0 })
      const row = byState.get(st)
      row.Total += (d[valueField] || 0)
      if (d.TradeType === 'Export') row.Exports += (d[valueField] || 0)
      if (d.TradeType === 'Import') row.Imports += (d[valueField] || 0)
    })
    return Array.from(byState.values()).sort((a, b) => b.Total - a.Total)
  }, [filteredUS, valueField])

  /* ── MX detail table ──────────────────────────────────────────────── */
  const mxTableData = useMemo(() => {
    const byState = new Map()
    filteredMX.forEach((d) => {
      const st = d.MexState || 'Unknown'
      if (!byState.has(st)) byState.set(st, { State: st, Total: 0, Exports: 0, Imports: 0 })
      const row = byState.get(st)
      row.Total += (d[valueField] || 0)
      if (d.TradeType === 'Export') row.Exports += (d[valueField] || 0)
      if (d.TradeType === 'Import') row.Imports += (d[valueField] || 0)
    })
    return Array.from(byState.values()).sort((a, b) => b.Total - a.Total)
  }, [filteredMX, valueField])

  const usTableColumns = [
    { key: 'State', label: 'U.S. State' },
    { key: 'Total', label: `Total ${metricLabel}`, render: (v) => fmtValue(v) },
    { key: 'Exports', label: 'Exports', render: (v) => fmtValue(v) },
    { key: 'Imports', label: 'Imports', render: (v) => fmtValue(v) },
  ]

  const mxTableColumns = [
    { key: 'State', label: 'Mexican State' },
    { key: 'Total', label: `Total ${metricLabel}`, render: (v) => fmtValue(v) },
    { key: 'Exports', label: 'Exports', render: (v) => fmtValue(v) },
    { key: 'Imports', label: 'Imports', render: (v) => fmtValue(v) },
  ]

  /* ── State-by-commodity specialization ── must be above early return for hook order */
  const stateSpecialization = useMemo(() => {
    if (!stateCommodityTrade?.length) return { data: [], keys: [] }
    let data = stateCommodityTrade
    if (yearFilter?.length) data = data.filter((d) => yearFilter.includes(String(d.Year)))
    if (tradeTypeFilter) data = data.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter?.length) data = data.filter((d) => modeFilter.includes(d.Mode))
    // Get top 8 states by total trade
    const stateTotals = new Map()
    data.forEach((d) => {
      if (!d.State || d.State === 'Unknown') return
      stateTotals.set(d.State, (stateTotals.get(d.State) || 0) + (d[valueField] || 0))
    })
    const topStates = [...stateTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n]) => n)
    const topStateSet = new Set(topStates)
    // Get top 5 commodity groups globally
    const groupTotals = new Map()
    data.forEach((d) => {
      if (!d.CommodityGroup || !topStateSet.has(d.State)) return
      groupTotals.set(d.CommodityGroup, (groupTotals.get(d.CommodityGroup) || 0) + (d[valueField] || 0))
    })
    const topGroups = [...groupTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n)
    // Build stacked data
    const stateGroupMap = new Map()
    data.forEach((d) => {
      if (!topStateSet.has(d.State) || !d.CommodityGroup) return
      if (!stateGroupMap.has(d.State)) stateGroupMap.set(d.State, new Map())
      const gm = stateGroupMap.get(d.State)
      gm.set(d.CommodityGroup, (gm.get(d.CommodityGroup) || 0) + (d[valueField] || 0))
    })
    const chartData = topStates.map((state) => {
      const gm = stateGroupMap.get(state) || new Map()
      const row = { state }
      topGroups.forEach((g) => { row[g] = gm.get(g) || 0 })
      let other = 0
      gm.forEach((v, g) => { if (!topGroups.includes(g)) other += v })
      if (other > 0) row['Other'] = other
      return row
    })
    const keys = [...topGroups]
    if (chartData.some((d) => d['Other'] > 0)) keys.push('Other')
    return { data: chartData, keys }
  }, [stateCommodityTrade, yearFilter, tradeTypeFilter, modeFilter, valueField])

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
  const axisPrefix = metric === 'weight' ? '' : '$'
  const axisSuffix = metric === 'weight' ? ' lb' : ''

  return (
    <>
      {/* Narrative Intro */}
      <SectionBlock>
        <div className="max-w-4xl mx-auto">
          <p className="text-lg text-text-secondary leading-relaxed">
            Trade with Mexico reaches far beyond the border. On the U.S. side, <strong>Texas</strong> is
            the dominant origin and destination, but <strong>Michigan</strong> (auto parts),{' '}
            <strong>California</strong> (electronics, agriculture), and <strong>Illinois</strong> (machinery)
            are major players. On the Mexican side, manufacturing powerhouses like <strong>Chihuahua</strong>,{' '}
            <strong>Nuevo Le&oacute;n</strong>, and the emerging Baj&iacute;o corridor drive the flows.
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

      {/* Choropleth Maps — side by side */}
      <SectionBlock alt>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ChartCard title="U.S. States" subtitle={`${metricLabel} with Mexico by U.S. state`}>
            <ChoroplethMap
              geojsonUrl={`${BASE}data/us_states.geojson`}
              data={usMapData}
              nameProperty="name"
              formatValue={fmtValue}
              metricLabel={metricLabel}
              colorRange={['#deebf7', '#08519c']}
              center={[39.5, -98.0]}
              zoom={4}
              height="400px"
              title="U.S. States"
              highlightFeature={showTexas ? 'Texas' : null}
            />
          </ChartCard>
          <ChartCard title="Mexican States" subtitle={`${metricLabel} with the U.S. by Mexican state`}>
            <ChoroplethMap
              geojsonUrl={`${BASE}data/mexican_states.geojson`}
              data={mxMapData}
              nameProperty="name"
              formatValue={fmtValue}
              metricLabel={metricLabel}
              colorRange={['#fee0d2', '#de2d26']}
              center={[23.5, -102.0]}
              zoom={5}
              height="400px"
              title="Mexican States"
              highlightFeature={showTexas ? 'Nuevo León' : null}
            />
          </ChartCard>
        </div>
      </SectionBlock>

      <SectionBlock>
        <div className="max-w-7xl mx-auto">
          <InsightCallout
            finding="Trade with Mexico isn't just a border phenomenon — 38 of 50 U.S. states have Mexico as a top-3 trading partner, and Mexican manufacturing reaches into interior states far from the border."
          />
        </div>
      </SectionBlock>

      {/* US Top N States + MX Top N States */}
      <SectionBlock>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ChartCard title={`Top ${usTopN} U.S. States`} subtitle={`Ranked by ${metricLabel.toLowerCase()} with Mexico`} headerRight={<TopNSelector value={usTopN} onChange={setUsTopN} />}>
            <BarChart data={usBarData} xKey="label" yKey="value" horizontal formatY={getAxisFormatter(usBarMax, axisPrefix, axisSuffix)} color={CHART_COLORS[0]} colorAccessor={showTexas ? (d) => d.label === 'Texas' ? TEXAS_COLOR : CHART_COLORS[0] : undefined} />
          </ChartCard>
          <ChartCard title={`Top ${mxTopN} Mexican States`} subtitle={`Ranked by ${metricLabel.toLowerCase()} with the U.S.`} headerRight={<TopNSelector value={mxTopN} onChange={setMxTopN} />}>
            <BarChart data={mxBarData} xKey="label" yKey="value" horizontal formatY={getAxisFormatter(mxBarMax, axisPrefix, axisSuffix)} color={CHART_COLORS[3]} colorAccessor={showTexas ? (d) => ['Nuevo León', 'Chihuahua', 'Tamaulipas'].includes(d.label) ? TEXAS_COLOR : CHART_COLORS[3] : undefined} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Texas callouts for state rankings — grouped into one block to avoid excess spacing */}
      {showTexas && (usBarData.length > 0 || mxBarData.length > 0) && (() => {
        const txRow = usBarData.find((d) => d.label === 'Texas')
        const total = usBarData.reduce((s, d) => s + d.value, 0)
        const pct = total > 0 && txRow ? ((txRow.value / total) * 100).toFixed(0) : 0
        const rank = txRow ? usBarData.findIndex((d) => d.label === 'Texas') + 1 : null
        const texasPartners = ['Nuevo León', 'Chihuahua', 'Tamaulipas']
        const hasPartners = texasPartners.some(s => mxBarData.some(d => d.label === s))
        if (!txRow && !hasPartners) return null
        return (
          <SectionBlock>
            <div className="max-w-7xl mx-auto flex flex-col gap-3">
              {txRow && (
                <InsightCallout
                  finding={`Texas ranks #${rank} among U.S. states for trade with Mexico, handling ${fmtValue(txRow.value)} — ${pct}% of the total across the top ${usBarData.length} states (highlighted in burnt orange).`}
                  icon={Star}
                  variant="texas"
                />
              )}
              {hasPartners && (
                <InsightCallout
                  finding={`Nuevo León, Chihuahua, and Tamaulipas (highlighted in orange on the Mexican chart) are Texas's primary trading partners — together they carry the bulk of Texas's cross-border commerce. Nuevo León alone, home to Monterrey's industrial hub, anchors the Laredo corridor.`}
                  icon={Star}
                  variant="texas"
                />
              )}
            </div>
          </SectionBlock>
        )
      })()}

      {/* US State Trends + MX State Trends */}
      <SectionBlock alt>
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
          <ChartCard title={`Top ${usTrendTopN} U.S. State Trends`} subtitle={`Annual ${metricLabel.toLowerCase()} with Mexico`} headerRight={<><TopNSelector value={usTrendTopN} onChange={setUsTrendTopN} /><YearRangeFilter years={allUSYears} startYear={usTrendYearRange.startYear} endYear={usTrendYearRange.endYear} onChange={setUsTrendYearRange} /></>}>
            <LineChart data={usStateTrends} xKey="year" yKey="value" seriesKey="State" formatY={getAxisFormatter(usTrendMax, axisPrefix, axisSuffix)} annotations={HISTORICAL_ANNOTATIONS} colorOverrides={showTexas ? { Texas: TEXAS_COLOR } : undefined} />
          </ChartCard>
          <ChartCard title={`Top ${mxTrendTopN} Mexican State Trends`} subtitle={`Annual ${metricLabel.toLowerCase()} with the U.S.`} headerRight={<><TopNSelector value={mxTrendTopN} onChange={setMxTrendTopN} /><YearRangeFilter years={allMXYears} startYear={mxTrendYearRange.startYear} endYear={mxTrendYearRange.endYear} onChange={setMxTrendYearRange} /></>}>
            <LineChart data={mxStateTrends} xKey="year" yKey="value" seriesKey="MexState" formatY={getAxisFormatter(mxTrendMax, axisPrefix, axisSuffix)} annotations={HISTORICAL_ANNOTATIONS} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Growth Rates */}
      {(usStateGrowth.length > 0 || mxStateGrowth.length > 0) && (
        <SectionBlock>
          <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
            {usStateGrowth.length > 0 && (
              <ChartCard title="Fastest-Growing U.S. States" subtitle="Growth in avg annual trade value (earliest 3 yrs vs. latest 3 yrs)" headerRight={<TopNSelector value={growthTopN} onChange={setGrowthTopN} />}>
                <LollipopChart data={usStateGrowth} xKey="label" yKey="value" formatValue={(v) => `${v.toFixed(0)}%`} color="#10b981" colorAccessor={showTexas ? (d) => d.label === 'Texas' ? TEXAS_COLOR : '#10b981' : undefined} />
              </ChartCard>
            )}
            {mxStateGrowth.length > 0 && (
              <ChartCard title="Fastest-Growing Mexican States" subtitle="Growth in avg annual trade value (earliest 3 yrs vs. latest 3 yrs)" headerRight={<TopNSelector value={growthTopN} onChange={setGrowthTopN} />}>
                <LollipopChart data={mxStateGrowth} xKey="label" yKey="value" formatValue={(v) => `${v.toFixed(0)}%`} color="#10b981" />
              </ChartCard>
            )}
          </div>
        </SectionBlock>
      )}

      {/* State Commodity Specialization */}
      {stateSpecialization.data.length > 0 && (
        <SectionBlock>
          <div className="max-w-7xl mx-auto">
            <ChartCard
              title="What Each State Trades with Mexico"
              subtitle="Top commodity groups per state — reveals what makes Texas different from Michigan, California, and others"
            >
              <StackedBarChart
                data={stateSpecialization.data}
                xKey="state"
                stackKeys={stateSpecialization.keys}
                formatValue={fmtValue}
              />
            </ChartCard>
            <div className="mt-4">
              <InsightCallout
                finding="Texas trades broadly across all commodity groups — it is the gateway for everything. Michigan is narrowly focused on Transportation Equipment (auto parts and vehicles). California mixes electronics with agriculture."
                context="This explains why a disruption at a Texas port has wider economic impact than a disruption elsewhere — Texas carries all industries, not just one."
              />
              {showTexas && (() => {
                const txRow = stateSpecialization.data.find((d) => d.state === 'Texas')
                if (!txRow) return null
                const txTotal = stateSpecialization.keys.reduce((s, k) => s + (txRow[k] || 0), 0)
                const topKey = stateSpecialization.keys.reduce((best, k) => (txRow[k] || 0) > (txRow[best] || 0) ? k : best, stateSpecialization.keys[0])
                return (
                  <div className="mt-3">
                    <InsightCallout
                      finding={`Texas's commodity mix totals ${fmtValue(txTotal)}, with "${topKey}" as the largest group. Unlike other states, no single group dominates Texas — it is the most diversified trade gateway.`}
                      icon={Star}
                      variant="texas"
                    />
                  </div>
                )
              })()}
            </div>
          </div>
        </SectionBlock>
      )}

      {/* Detail Tables */}
      <SectionBlock alt>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ChartCard title="U.S. State Detail" subtitle="State-level trade summary">
            <DataTable columns={usTableColumns} data={usTableData} rowClassAccessor={showTexas ? (row) => row.State === 'Texas' ? 'bg-[#bf5700]/[0.06] font-medium' : '' : undefined} />
          </ChartCard>
          <ChartCard title="Mexican State Detail" subtitle="State-level trade summary">
            <DataTable columns={mxTableColumns} data={mxTableData} />
          </ChartCard>
        </div>
      </SectionBlock>
    </>
  )
}
