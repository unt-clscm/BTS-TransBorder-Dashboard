/**
 * TexasMexico Trade Flows Tab — OD analysis for trade through Texas border ports.
 * Choropleth flow map + bar chart + Sankey + heatmap.
 */
import { useState, useMemo, useEffect } from 'react'
import { formatCurrency } from '@/lib/transborderHelpers'
import { formatCompact, formatWeight, getMetricField, getMetricFormatter, getMetricLabel, getDataSubsetLabel, hasSurfaceExports, isAllSurfaceExports } from '@/lib/chartColors'
import WeightCaveatBanner from '@/components/ui/WeightCaveatBanner'
import TopNSelector from '@/components/filters/TopNSelector'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import BarChart from '@/components/charts/BarChart'
import LollipopChart from '@/components/charts/LollipopChart'
import SankeyDiagram from '@/components/charts/SankeyDiagram'
import HeatmapTable from '@/components/charts/HeatmapTable'
import TradeFlowChoropleth from '@/components/maps/TradeFlowChoropleth'
import InsightCallout from '@/components/ui/InsightCallout'
import GlossaryTerm from '@/components/ui/GlossaryTerm'

export default function TradeFlowsTab({
  texasOdStateFlows,
  loadDataset,
  yearFilter,
  tradeTypeFilter,
  modeFilter,
  stateFilter = [],
  portFilter,
  mexStateFilter,
  datasetError,
  metric = 'value',
}) {
  useEffect(() => { loadDataset('texasOdStateFlows') }, [loadDataset])

  const valueField = getMetricField(metric)
  const fmtValue = getMetricFormatter(metric)
  const metricLabel = getMetricLabel(metric)
  const [topPairsN, setTopPairsN] = useState(15)

  /* ── map-local year selector (independent of page filters) ─────── */
  const mapYears = useMemo(() => {
    if (!texasOdStateFlows) return []
    return [...new Set(texasOdStateFlows.map((d) => d.Year).filter(Boolean))].sort((a, b) => a - b)
  }, [texasOdStateFlows])
  const [mapYear, setMapYear] = useState('')
  // default to latest year once data loads
  useEffect(() => {
    if (mapYears.length && !mapYear) setMapYear(String(mapYears[mapYears.length - 1]))
  }, [mapYears])

  /* ── filter without year (for map animation) ──────────────────────── */
  const filteredNoYear = useMemo(() => {
    if (!texasOdStateFlows) return []
    let data = texasOdStateFlows
    if (tradeTypeFilter) data = data.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter?.length) data = data.filter((d) => modeFilter.includes(d.Mode))
    if (stateFilter?.length) data = data.filter((d) => stateFilter.includes(d.State))
    if (portFilter?.length) data = data.filter((d) => portFilter.includes(d.Port))
    if (mexStateFilter?.length) data = data.filter((d) => mexStateFilter.includes(d.MexState))
    return data
  }, [texasOdStateFlows, tradeTypeFilter, modeFilter, stateFilter, portFilter, mexStateFilter])

  const filtered = useMemo(() => {
    if (!filteredNoYear.length) return []
    if (yearFilter?.length) return filteredNoYear.filter((d) => yearFilter.includes(String(d.Year)))
    return filteredNoYear
  }, [filteredNoYear, yearFilter])

  const filters = { tradeTypeFilter, modeFilter }
  const subsetLabel = getDataSubsetLabel(filteredNoYear, filters)
  const weightAllNA = metric === 'weight' && isAllSurfaceExports(filtered)
  const weightPartial = !weightAllNA && metric === 'weight' && hasSurfaceExports(filtered)
  const subsetLabelWithYear = getDataSubsetLabel(filtered, filters)

  /* ── Top trading pairs ────────────────────────────────────────────── */
  const topPairsData = useMemo(() => {
    if (!filtered.length) return []
    const pairMap = new Map()
    filtered.forEach((d) => {
      const key = `${d.State}|${d.MexState}`
      pairMap.set(key, (pairMap.get(key) || 0) + (d[valueField] || 0))
    })
    return Array.from(pairMap, ([key, value]) => {
      const [source, target] = key.split('|')
      return { label: `${source} ↔ ${target}`, value }
    })
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, topPairsN)
  }, [filtered, valueField, topPairsN])

  /* ── Sankey data ───────────────────────────────────────────────────── */
  const sankeyData = useMemo(() => {
    if (!filtered.length) return { nodes: [], links: [] }

    const usTotals = new Map()
    const mxTotals = new Map()
    const portTotals = new Map()
    filtered.forEach((d) => {
      usTotals.set(d.State, (usTotals.get(d.State) || 0) + (d[valueField] || 0))
      mxTotals.set(d.MexState, (mxTotals.get(d.MexState) || 0) + (d[valueField] || 0))
      portTotals.set(d.Port, (portTotals.get(d.Port) || 0) + (d[valueField] || 0))
    })

    const topUS = [...usTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n]) => n)
    const topMX = [...mxTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n]) => n)
    const topPorts = [...portTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n]) => n)

    const topUSSet = new Set(topUS)
    const topMXSet = new Set(topMX)
    const topPortSet = new Set(topPorts)

    const nodes = [
      ...topUS.map((n) => ({ id: `us-${n}`, name: n, group: 'us' })),
      ...topPorts.map((n) => ({ id: `port-${n}`, name: n, group: 'port' })),
      ...topMX.map((n) => ({ id: `mx-${n}`, name: n, group: 'mx' })),
    ]

    const usPortMap = new Map()
    const portMxMap = new Map()
    filtered.forEach((d) => {
      if (!topUSSet.has(d.State) || !topPortSet.has(d.Port) || !topMXSet.has(d.MexState)) return
      const upKey = `us-${d.State}|port-${d.Port}`
      const pmKey = `port-${d.Port}|mx-${d.MexState}`
      usPortMap.set(upKey, (usPortMap.get(upKey) || 0) + (d[valueField] || 0))
      portMxMap.set(pmKey, (portMxMap.get(pmKey) || 0) + (d[valueField] || 0))
    })

    const links = [
      ...Array.from(usPortMap, ([key, value]) => {
        const [source, target] = key.split('|')
        return { source, target, value }
      }),
      ...Array.from(portMxMap, ([key, value]) => {
        const [source, target] = key.split('|')
        return { source, target, value }
      }),
    ].filter((l) => l.value > 0)

    return { nodes, links }
  }, [filtered, valueField])

  /* ── Heatmap data ──────────────────────────────────────────────────── */
  const heatmapData = useMemo(() => {
    if (!filtered.length) return null
    const pairMap = new Map()
    const usTotals = new Map()
    const mxTotals = new Map()
    filtered.forEach((d) => {
      const key = `${d.State}|${d.MexState}`
      const val = d[valueField] || 0
      pairMap.set(key, (pairMap.get(key) || 0) + val)
      usTotals.set(d.State, (usTotals.get(d.State) || 0) + val)
      mxTotals.set(d.MexState, (mxTotals.get(d.MexState) || 0) + val)
    })
    const rowLabels = [...usTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([n]) => n)
    const colLabels = [...mxTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([n]) => n)
    const cells = rowLabels.map((us) => colLabels.map((mx) => pairMap.get(`${us}|${mx}`) || 0))
    return { rowLabels, colLabels, cells }
  }, [filtered, valueField])

  /* ── Fastest-growing corridors ──────────────────────────────────── */
  const fastestCorridors = useMemo(() => {
    if (!filteredNoYear.length) return []
    const years = [...new Set(filteredNoYear.map((d) => d.Year).filter(Number.isFinite))].sort((a, b) => a - b)
    if (years.length < 6) return [] // need at least 3 early + 3 late years
    const earlyYears = new Set(years.slice(0, 3))
    const lateYears = new Set(years.slice(-3))
    const earlyMap = new Map()
    const lateMap = new Map()
    filteredNoYear.forEach((d) => {
      if (!d.State || !d.MexState || d.State === 'Unknown' || d.MexState === 'Unknown') return
      const key = `${d.State} ↔ ${d.MexState}`
      const val = d[valueField] || 0
      if (earlyYears.has(d.Year)) earlyMap.set(key, (earlyMap.get(key) || 0) + val)
      if (lateYears.has(d.Year)) lateMap.set(key, (lateMap.get(key) || 0) + val)
    })
    // Compute growth for corridors that existed in both periods
    const results = []
    lateMap.forEach((lateVal, key) => {
      const earlyVal = earlyMap.get(key)
      if (!earlyVal || earlyVal < 1e6) return // need meaningful baseline
      const avgEarly = earlyVal / 3
      const avgLate = lateVal / 3
      const growth = ((avgLate / avgEarly) - 1) * 100
      if (growth > 0) results.push({ label: key, value: Math.round(growth) })
    })
    return results.sort((a, b) => b.value - a.value).slice(0, 15)
  }, [filteredNoYear, valueField])

  if (datasetError) {
    return (
      <SectionBlock><div className="text-center py-12 text-text-secondary">Failed to load trade flow data.</div></SectionBlock>
    )
  }

  if (!texasOdStateFlows) {
    return (
      <SectionBlock>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-brand-blue border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-text-secondary">Loading trade flow data...</span>
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
            This tab reveals the specific corridors that define Texas–Mexico trade. <strong>Laredo</strong> connects
            Monterrey's industrial base to the U.S. heartland. <strong>El Paso/Ysleta</strong> links
            Ju&aacute;rez's <GlossaryTerm term="maquiladora" display="maquiladoras" /> to American markets. Each port-state pairing represents
            a supply chain built over decades — use the interactive maps below to explore how trade
            flows through the border.
          </p>
          <p className="text-sm text-text-tertiary mt-2 italic">
            Note: Origin-destination data is available for exports only — BTS does not record the Mexican state of origin for imports.
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

      {/* Interactive Trade Flow Map */}
      <SectionBlock>
        <div className="max-w-7xl mx-auto">
          <ChartCard
            title="Trade Flow Map"
            subtitle="Click a state or port to see flow arcs — use the timeline to animate through years"
            headerRight={
              <div className="flex items-center gap-2 text-sm">
                <label className="text-text-secondary font-medium">Year</label>
                <select
                  value={mapYear}
                  onChange={(e) => setMapYear(e.target.value)}
                  className="appearance-none px-2 py-1 pr-6 rounded border border-border bg-white text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue/30 cursor-pointer"
                >
                  {mapYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            }
          >
            <TradeFlowChoropleth
              data={filteredNoYear}
              yearFilter={mapYear ? [mapYear] : []}
              valueField={valueField}
              formatValue={fmtValue}
              center={[28, -100]}
              zoom={5}
              height="580px"
            />
          </ChartCard>
        </div>
      </SectionBlock>

      <SectionBlock alt>
        <ChartCard title={`Top Trading Partners${subsetLabelWithYear}`} subtitle={`Largest bilateral ${metricLabel.toLowerCase()} flows between U.S. and Mexican states through Texas ports`} headerRight={<TopNSelector value={topPairsN} onChange={setTopPairsN} />}>
          <BarChart data={topPairsData} horizontal formatValue={fmtValue} maxBars={topPairsN} />
        </ChartCard>
        <div className="max-w-4xl mx-auto mt-6">
          <InsightCallout
            finding="Trade routes through Texas ports are not interchangeable — each corridor serves specific industries and supply chains."
            context="Disrupting one corridor (e.g., Laredo-Nuevo Leon) would affect different sectors than disrupting another (e.g., El Paso-Chihuahua)."
            variant="default"
          />
        </div>
      </SectionBlock>

      <SectionBlock>
        <ChartCard title={`Trade Routes${subsetLabelWithYear}`} subtitle="How trade flows from U.S. states through Texas border ports to Mexican states">
          <SankeyDiagram nodes={sankeyData.nodes} links={sankeyData.links} formatValue={fmtValue} height={550} />
        </ChartCard>
      </SectionBlock>

      <SectionBlock>
        <div className="max-w-4xl mx-auto">
          <InsightCallout
            finding="The Sankey diagram reveals that Laredo doesn't just carry the most trade — it connects the widest range of U.S. and Mexican states. El Paso/Ysleta, by contrast, routes mostly to Chihuahua's maquiladoras."
            context="This concentration pattern means Laredo disruptions cascade across many supply chains, while El Paso disruptions are more contained but deeper in the auto sector."
            variant="highlight"
          />
        </div>
      </SectionBlock>

      <SectionBlock alt>
        <ChartCard title={`Trade Matrix${subsetLabelWithYear}`} subtitle="U.S. states (rows) vs. Mexican states (columns) through Texas ports">
          {heatmapData ? (
            <HeatmapTable data={heatmapData} formatValue={fmtValue} />
          ) : (
            <div className="text-center py-8 text-text-secondary">No data to display.</div>
          )}
        </ChartCard>
      </SectionBlock>

      {/* Fastest-Growing Corridors */}
      {fastestCorridors.length > 0 && (
        <SectionBlock>
          <div className="max-w-7xl mx-auto">
            <ChartCard
              title="Fastest-Growing Trade Corridors"
              subtitle="Growth in average annual trade value (earliest 3 years vs. latest 3 years through Texas ports)"
            >
              <LollipopChart data={fastestCorridors} formatValue={(v) => `${v}%`} color="#10b981" />
            </ChartCard>
            <div className="mt-4">
              <InsightCallout
                finding="The fastest-growing corridors are not the biggest ones. Emerging corridors connecting U.S. interior states to Mexico's Baj\u00edo region are growing much faster than the established Texas-Nuevo Leon route — reflecting the geographic expansion of cross-border manufacturing."
                context="Baj\u00edo refers to central Mexico (Guanajuato, Quer\u00e9taro, Aguascalientes, San Luis Potos\u00ed) — a fast-growing auto and aerospace hub. Growth is measured as the percentage increase in average annual trade between the first 3 years and last 3 years of available data."
              />
            </div>
          </div>
        </SectionBlock>
      )}
    </>
  )
}
