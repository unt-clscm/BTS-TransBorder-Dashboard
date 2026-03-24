/**
 * CommoditiesTab — Commodity analysis of TX-MX surface freight trade.
 * Loads texasMexicoCommodities on mount. Shows treemap, top-10 bar,
 * top-5 commodity group trends, and detail table.
 */
import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import TreemapChart from '@/components/charts/TreemapChart'
import BarChart from '@/components/charts/BarChart'
import LineChart from '@/components/charts/LineChart'
import StackedBarChart from '@/components/charts/StackedBarChart'
import DataTable from '@/components/ui/DataTable'
import DivergingBarChart from '@/components/charts/DivergingBarChart'
import BarChartRace from '@/components/charts/BarChartRace'
import InsightCallout from '@/components/ui/InsightCallout'
import { Factory, Play, Pause, SkipBack, SkipForward, ArrowRight } from 'lucide-react'
import { formatCurrency, formatNumber, formatWeight, getMetricField, getMetricFormatter, getMetricLabel } from '@/lib/chartColors'
import YearRangeFilter from '@/components/filters/YearRangeFilter'
import TopNSelector from '@/components/filters/TopNSelector'
import DatasetError from '@/components/ui/DatasetError'
import { DL, PAGE_COMMODITY_COLS } from '@/lib/downloadColumns'

const ANNOTATIONS = [
  { x: 2008, x2: 2009, label: '2008 Financial Crisis', color: 'rgba(217,13,13,0.06)', labelColor: '#b91c1c' },
  { x: 2019.5, x2: 2020.5, label: 'COVID-19', color: 'rgba(217,13,13,0.08)', labelColor: '#d90d0d' },
]

export default function CommoditiesTab({ filteredCommodities, loadDataset, _latestYear, datasetError, metric = 'value' }) {
  /* ── ensure dataset is loaded ────────────────────────────────────── */
  useEffect(() => {
    loadDataset('texasMexicoCommodities')
  }, [loadDataset])

  const valueField = getMetricField(metric)
  const fmtValue = getMetricFormatter(metric)
  const metricLabel = getMetricLabel(metric)

  if (datasetError) {
    return <DatasetError datasetName="Commodity Data" error={datasetError} onRetry={() => loadDataset('texasMexicoCommodities')} />
  }

  const [treemapDrill, setTreemapDrill] = useState(null)
  const [topCommodityN, setTopCommodityN] = useState(10)
  const [groupTrendTopN, setGroupTrendTopN] = useState(5)
  const [divergingTopN, setDivergingTopN] = useState(12)

  const allCommodityYears = useMemo(() => {
    if (!filteredCommodities) return []
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

  /* ── Treemap: top commodity groups or drilled-down HS codes ─────── */
  const commodityGroups = useMemo(() => {
    if (!filteredCommodities) return []
    if (treemapDrill) {
      const map = new Map()
      filteredCommodities.forEach((d) => {
        if (d.CommodityGroup !== treemapDrill) return
        const label = d.Commodity || d.HSCode || 'Unknown'
        map.set(label, (map.get(label) || 0) + (d[valueField] || 0))
      })
      return Array.from(map, ([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
    }
    const byGroup = new Map()
    filteredCommodities.forEach((d) => {
      if (!d.CommodityGroup) return
      byGroup.set(d.CommodityGroup, (byGroup.get(d.CommodityGroup) || 0) + (d[valueField] || 0))
    })
    return Array.from(byGroup, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredCommodities, treemapDrill, valueField])

  /* ── Top N individual commodities (bar) ──────────────────────────── */
  const topCommodities = useMemo(() => {
    if (!filteredCommodities) return []
    const byCommodity = new Map()
    filteredCommodities.forEach((d) => {
      if (!d.Commodity) return
      byCommodity.set(d.Commodity, (byCommodity.get(d.Commodity) || 0) + (d[valueField] || 0))
    })
    return Array.from(byCommodity, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, topCommodityN)
  }, [filteredCommodities, valueField, topCommodityN])

  /* ── Top N commodity group trends (multi-series line) ───────────── */
  const groupTrends = useMemo(() => {
    if (!filteredCommodities) return []
    const totals = new Map()
    filteredCommodities.forEach((d) => {
      if (!d.CommodityGroup) return
      totals.set(d.CommodityGroup, (totals.get(d.CommodityGroup) || 0) + (d[valueField] || 0))
    })
    const topN = Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, groupTrendTopN)
      .map(([name]) => name)
    const topNSet = new Set(topN)

    const byYG = new Map()
    filteredCommodities.forEach((d) => {
      if (!d.CommodityGroup || !topNSet.has(d.CommodityGroup)) return
      if (d.Year < trendYearRange.startYear || d.Year > trendYearRange.endYear) return
      const key = `${d.Year}|${d.CommodityGroup}`
      if (!byYG.has(key)) byYG.set(key, { year: d.Year, value: 0, CommodityGroup: d.CommodityGroup })
      byYG.get(key).value += d[valueField] || 0
    })
    return Array.from(byYG.values()).sort((a, b) => a.year - b.year || a.CommodityGroup.localeCompare(b.CommodityGroup))
  }, [filteredCommodities, valueField, groupTrendTopN, trendYearRange])

  /* ── Import/export direction by commodity group (diverging bar) ── */
  const directionData = useMemo(() => {
    if (!filteredCommodities) return []
    const byGroup = new Map()
    filteredCommodities.forEach((d) => {
      if (!d.CommodityGroup) return
      if (!byGroup.has(d.CommodityGroup)) byGroup.set(d.CommodityGroup, { label: d.CommodityGroup, exports: 0, imports: 0 })
      const row = byGroup.get(d.CommodityGroup)
      if (d.TradeType === 'Export') row.exports += d[valueField] || 0
      if (d.TradeType === 'Import') row.imports += d[valueField] || 0
    })
    return Array.from(byGroup.values())
      .filter((d) => d.exports + d.imports > 0)
      .sort((a, b) => (b.exports + b.imports) - (a.exports + a.imports))
      .slice(0, divergingTopN)
  }, [filteredCommodities, valueField, divergingTopN])

  /* ── Bar chart race: commodity group rankings by year ──────────── */
  const [raceYear, setRaceYear] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)

  /* ── year pop overlay state ─────────────────────────────────────── */
  const [popYear, setPopYear] = useState(null)
  const popTimerRef = useRef(null)
  const prevRaceYearRef = useRef(raceYear)

  const raceFrames = useMemo(() => {
    if (!filteredCommodities) return []
    const years = new Set()
    const byYearGroup = new Map()
    filteredCommodities.forEach((d) => {
      if (!d.CommodityGroup || !d.Year) return
      years.add(d.Year)
      const key = `${d.Year}|${d.CommodityGroup}`
      if (!byYearGroup.has(key)) byYearGroup.set(key, { year: d.Year, group: d.CommodityGroup, value: 0 })
      byYearGroup.get(key).value += d[valueField] || 0
    })
    const sortedYears = [...years].sort((a, b) => a - b)
    return sortedYears.map((year) => {
      const yearData = Array.from(byYearGroup.values())
        .filter((d) => d.year === year)
        .sort((a, b) => b.value - a.value)
      return {
        year,
        routes: yearData.map((d) => ({ route: d.group, value: d.value, origin: d.group })),
      }
    })
  }, [filteredCommodities, valueField])

  const raceGlobalMax = useMemo(() => {
    let max = 0
    raceFrames.forEach((f) => f.routes.forEach((r) => { if (r.value > max) max = r.value }))
    return max
  }, [raceFrames])

  // Initialize race year
  useEffect(() => {
    if (raceFrames.length && raceYear == null) {
      setRaceYear(raceFrames[raceFrames.length - 1].year)
    }
  }, [raceFrames]) // eslint-disable-line react-hooks/exhaustive-deps

  const raceYears = useMemo(() => raceFrames.map((f) => f.year), [raceFrames])

  // Play animation via useEffect (no stale closure)
  useEffect(() => {
    if (!isPlaying || !raceYears.length) return
    const timer = setInterval(() => {
      setRaceYear((y) => {
        const idx = raceYears.indexOf(y ?? raceYears[0])
        if (idx + 1 >= raceYears.length) { setIsPlaying(false); return raceYears[raceYears.length - 1] }
        return raceYears[idx + 1]
      })
    }, 1200)
    return () => clearInterval(timer)
  }, [isPlaying, raceYears])

  const handlePlayPause = useCallback(() => {
    if (isPlaying) { setIsPlaying(false); return }
    if (raceYear == null || raceYear === raceYears[raceYears.length - 1]) setRaceYear(raceYears[0])
    setIsPlaying(true)
  }, [isPlaying, raceYear, raceYears])

  const handleSkipBack = useCallback(() => {
    setIsPlaying(false)
    setRaceYear((y) => {
      const idx = raceYears.indexOf(y)
      return idx > 0 ? raceYears[idx - 1] : raceYears[0]
    })
  }, [raceYears])

  const handleSkipForward = useCallback(() => {
    setIsPlaying(false)
    setRaceYear((y) => {
      const idx = raceYears.indexOf(y)
      return idx < raceYears.length - 1 ? raceYears[idx + 1] : raceYears[raceYears.length - 1]
    })
  }, [raceYears])

  // Year pop overlay effect
  useEffect(() => {
    if (raceYear != null && raceYear !== prevRaceYearRef.current) {
      prevRaceYearRef.current = raceYear
      setPopYear(raceYear)
      clearTimeout(popTimerRef.current)
      popTimerRef.current = setTimeout(() => setPopYear(null), 800)
    }
    return () => clearTimeout(popTimerRef.current)
  }, [raceYear])

  /* ── Commodity detail table ──────────────────────────────────────── */
  const tableData = useMemo(() => {
    if (!filteredCommodities) return []
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
          WeightLb: 0,
        })
      }
      const row = byKey.get(key)
      row.TradeValue += d.TradeValue || 0
      row.WeightLb += d.WeightLb || 0
    })
    return Array.from(byKey.values()).sort((a, b) => b.TradeValue - a.TradeValue)
  }, [filteredCommodities])

  /* ── Port specialization: top commodity groups per port ──────────── */
  const portSpecialization = useMemo(() => {
    if (!filteredCommodities) return { data: [], keys: [] }
    const portGroupMap = new Map()
    const allGroups = new Map()
    filteredCommodities.forEach((d) => {
      if (!d.Port || !d.CommodityGroup) return
      if (!portGroupMap.has(d.Port)) portGroupMap.set(d.Port, new Map())
      const gm = portGroupMap.get(d.Port)
      gm.set(d.CommodityGroup, (gm.get(d.CommodityGroup) || 0) + (d[valueField] || 0))
      allGroups.set(d.CommodityGroup, (allGroups.get(d.CommodityGroup) || 0) + (d[valueField] || 0))
    })
    // Top 5 commodity groups overall
    const topGroups = [...allGroups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n)
    // Build stacked data per port
    const portTotals = new Map()
    portGroupMap.forEach((gm, port) => {
      let total = 0
      gm.forEach((v) => { total += v })
      portTotals.set(port, total)
    })
    const sortedPorts = [...portTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n]) => n)
    const data = sortedPorts.map((port) => {
      const gm = portGroupMap.get(port)
      const row = { port }
      topGroups.forEach((g) => { row[g] = gm.get(g) || 0 })
      // 'Other' bucket
      let other = 0
      gm.forEach((v, g) => { if (!topGroups.includes(g)) other += v })
      if (other > 0) row['Other'] = other
      return row
    })
    const keys = [...topGroups]
    if (data.some((d) => d['Other'] > 0)) keys.push('Other')
    return { data, keys }
  }, [filteredCommodities, valueField])

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

  const tableColumns = [
    { key: 'Year', label: 'Year', width: '5%' },
    { key: 'HSCode', label: 'HS Code', width: '6%' },
    { key: 'Commodity', label: 'Commodity', wrap: true, width: '32%' },
    { key: 'CommodityGroup', label: 'Group', wrap: true, width: '16%' },
    { key: 'Port', label: 'Port', wrap: true, width: '12%' },
    { key: 'TradeType', label: 'Trade Type', width: '7%' },
    { key: 'TradeValue', label: 'Trade Value ($)', render: (v) => formatCurrency(v), width: '12%' },
    { key: 'WeightLb', label: 'Weight (lb)', render: (v) => v ? formatWeight(v) : '—', width: '10%' },
  ]

  return (
    <>
      {/* Narrative Intro */}
      <SectionBlock>
        <div className="max-w-4xl mx-auto">
          <p className="text-lg text-text-secondary leading-relaxed">
            What crosses the Texas–Mexico border tells the story of an integrated manufacturing economy.{' '}
            <strong>Machinery and vehicle parts</strong> flow south to Mexican assembly plants;{' '}
            <strong>finished vehicles, electronics, and consumer goods</strong> flow north.
            Meanwhile, Texas sends <strong>energy products</strong> south via pipeline
            and imports <strong>fresh produce</strong> from Mexican farms. This isn't simple buying and
            selling — it's a cross-border assembly line.
          </p>
        </div>
      </SectionBlock>

      {/* Treemap of commodity groups with drilldown */}
      <SectionBlock>
        <ChartCard
          title={treemapDrill ? `${treemapDrill} — HS 2-Digit Detail` : 'Commodity Groups'}
          subtitle={treemapDrill ? 'Individual commodities within group' : `${metricLabel} by commodity group — click to drill down`}
          downloadData={{ summary: { data: commodityGroups, filename: 'tx-mx-commodity-groups', columns: DL.commodityGroupRank } }}
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
            formatValue={fmtValue}
            onCellClick={treemapDrill ? undefined : (name) => setTreemapDrill(name)}
          />
        </ChartCard>
        <div className="max-w-4xl mx-auto mt-6">
          <InsightCallout
            finding="Energy is Texas's biggest export to Mexico. Nearly all pipeline trade is petroleum and natural gas flowing south — over $12 billion per year."
            context="Texas exports more energy to Mexico than most U.S. states export in total goods."
            variant="default"
          />
        </div>
      </SectionBlock>

      {/* Top 10 individual commodities */}
      <SectionBlock alt>
        <div className="max-w-7xl mx-auto">
          <ChartCard title={`Top ${topCommodityN} Commodities`} subtitle={`Individual commodities ranked by ${metricLabel}`}
            headerRight={<TopNSelector value={topCommodityN} onChange={setTopCommodityN} />}
            downloadData={{ summary: { data: topCommodities, filename: 'tx-mx-top-commodities', columns: DL.commodityRank } }}>
            <BarChart
              data={topCommodities}
              xKey="label"
              yKey="value"
              horizontal
              formatValue={fmtValue}
            />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Maquiladora Pattern — Export vs Import by Commodity */}
      {directionData.length > 0 && (
        <SectionBlock>
          <div className="max-w-7xl mx-auto">
            <ChartCard
              title="Cross-Border Manufacturing Pattern"
              subtitle="Imports (left) vs. exports (right) by commodity group — reveals supply chain direction"
              headerRight={<TopNSelector value={divergingTopN} onChange={setDivergingTopN} />}
            >
              <DivergingBarChart
                data={directionData}
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
                finding="Transportation Equipment has a 3.9:1 import ratio — Texas sends $67B in parts south and receives $259B in finished vehicles north."
                context="This is the clearest maquiladora signal in the data."
                icon={Factory}
              />
              <InsightCallout
                finding="Chemicals (73% exports) and Plastics (67% exports) flow predominantly south — these are manufacturing inputs heading to Mexican factories."
                variant="highlight"
                icon={ArrowRight}
              />
            </div>
          </div>
        </SectionBlock>
      )}

      {/* Top 5 commodity group trends */}
      <SectionBlock alt>
        <div className="max-w-7xl mx-auto">
          <ChartCard title={`Top ${groupTrendTopN} Commodity Group Trends`} subtitle={`Annual ${metricLabel} for leading groups`}
            headerRight={<><TopNSelector value={groupTrendTopN} onChange={setGroupTrendTopN} /><YearRangeFilter years={allCommodityYears} startYear={trendYearRange.startYear} endYear={trendYearRange.endYear} onChange={setTrendYearRange} /></>}
            downloadData={{ summary: { data: groupTrends, filename: 'tx-mx-commodity-group-trends', columns: DL.tradeTrendSeries } }}>
            <LineChart
              data={groupTrends}
              xKey="year"
              yKey="value"
              seriesKey="CommodityGroup"
              formatValue={fmtValue}
              annotations={ANNOTATIONS}
            />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Animated Bar Chart Race — Commodity Groups Over Time */}
      {raceFrames.length > 0 && raceYear != null && (
        <SectionBlock alt>
          <div className="max-w-7xl mx-auto">
            <ChartCard
              title="Commodity Rankings Over Time"
              subtitle="Watch how commodity groups have shifted in importance since 2007"
            >
              {/* Playback controls */}
              <div className="flex flex-wrap items-center gap-3 mb-4 bg-white rounded-xl border border-border-light px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleSkipBack}
                    disabled={!raceYears.length || raceYear === raceYears[0]}
                    className="p-2 rounded-lg hover:bg-surface-alt disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Previous year"
                  >
                    <SkipBack size={18} className="text-text-primary" />
                  </button>
                  <button
                    type="button"
                    onClick={handlePlayPause}
                    className="p-2 rounded-lg bg-brand-blue text-white hover:bg-brand-blue/90 transition-colors"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                  <button
                    type="button"
                    onClick={handleSkipForward}
                    disabled={!raceYears.length || raceYear === raceYears[raceYears.length - 1]}
                    className="p-2 rounded-lg hover:bg-surface-alt disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Next year"
                  >
                    <SkipForward size={18} className="text-text-primary" />
                  </button>
                </div>
                <div className="flex-1 min-w-[200px] flex items-center gap-3">
                  <span className="text-base text-text-secondary whitespace-nowrap">{raceYears[0]}</span>
                  <input
                    type="range"
                    min={0}
                    max={raceYears.length - 1}
                    value={raceYears.indexOf(raceYear)}
                    onChange={(e) => {
                      setIsPlaying(false)
                      setRaceYear(raceYears[Number(e.target.value)])
                    }}
                    className="flex-1 accent-brand-blue cursor-pointer"
                    style={{ height: '6px' }}
                  />
                  <span className="text-base text-text-secondary whitespace-nowrap">{raceYears[raceYears.length - 1]}</span>
                </div>
                <div className="text-2xl font-bold text-brand-blue tabular-nums min-w-[60px] text-center">
                  {raceYear}
                </div>
              </div>

              {/* Year pop overlay */}
              <div className="relative">
                {popYear != null && (
                  <div
                    key={popYear}
                    className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
                  >
                    <span
                      className="text-brand-blue font-extrabold tabular-nums select-none"
                      style={{
                        fontSize: 'clamp(80px, 12vw, 160px)',
                        opacity: 0,
                        animation: 'yearPop 0.8s ease-out forwards',
                      }}
                    >
                      {popYear}
                    </span>
                  </div>
                )}
              <BarChartRace
                frames={raceFrames}
                currentYear={raceYear}
                globalMax={raceGlobalMax}
                maxBars={10}
                formatValue={fmtValue}
              />
              </div>
            </ChartCard>
          </div>
        </SectionBlock>
      )}

      {/* Port Specialization — What each port carries */}
      {portSpecialization.data.length > 0 && (
        <SectionBlock>
          <div className="max-w-7xl mx-auto">
            <ChartCard
              title="Port Specialization"
              subtitle="Top commodity groups by port — each port has a distinct economic personality"
            >
              <StackedBarChart
                data={portSpecialization.data}
                xKey="port"
                stackKeys={portSpecialization.keys}
                formatValue={fmtValue}
              />
            </ChartCard>
            <div className="mt-4">
              <InsightCallout
                finding="Texas's 14 border ports are not interchangeable. Laredo and Ysleta dominate manufacturing trade. Hidalgo/Pharr, Progreso, and Roma are the agricultural ports. Presidio is primarily a cattle crossing."
                context="Infrastructure investments, inspection capacity, and trade disruption risks differ by port based on what they carry."
              />
            </div>
          </div>
        </SectionBlock>
      )}

      {/* Commodity detail table */}
      <SectionBlock alt>
        <ChartCard title="Commodity Detail" subtitle="Aggregated by year, commodity, port, and trade type"
          downloadData={{ summary: { data: tableData, filename: 'tx-mx-commodity-detail', columns: PAGE_COMMODITY_COLS } }}>
          <DataTable data={tableData} columns={tableColumns} pageSize={15} fullWidth />
        </ChartCard>
      </SectionBlock>
    </>
  )
}
