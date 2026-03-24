import { useMemo, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, DollarSign, ArrowRight, Database, Layers,
  ArrowRightLeft, MapPin, BarChart3, Truck, Package, Award, PieChart,
  Globe, Map, Scale, ArrowUpDown, Lightbulb,
} from 'lucide-react'
import { useTransborderStore } from '@/stores/transborderStore'
import { formatCurrency } from '@/lib/chartColors'
import { generateInsights } from '@/lib/insightEngine'
import { PORT_REGION_MAP } from '@/lib/portUtils'
import { usePortCoordinates, useCanadianPortCoordinates, buildMapPorts } from '@/hooks/usePortMapData'
import HeroStardust from '@/components/ui/HeroStardust'
import InsightCallout from '@/components/ui/InsightCallout'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import StatCard from '@/components/ui/StatCard'
import LineChart from '@/components/charts/LineChart'
import DonutChart from '@/components/charts/DonutChart'
import StackedBarChart from '@/components/charts/StackedBarChart'
import PortMap from '@/components/maps/PortMap'
import { DL, PAGE_TRANSBORDER_COLS } from '@/lib/downloadColumns'

/* ── Icon lookup for insightEngine string → component ────────────────── */
const ICON_MAP = {
  TrendingUp, TrendingDown, DollarSign, ArrowRight, Database, Layers,
  ArrowRightLeft, MapPin, BarChart3, Truck, Package, Award, PieChart,
  Globe, Map, Scale, ArrowUpDown, Lightbulb,
}

/* ── Country filter options ──────────────────────────────────────────── */
const COUNTRY_OPTIONS = [
  { value: '', label: 'All (Mexico + Canada)' },
  { value: 'Mexico', label: 'Mexico' },
  { value: 'Canada', label: 'Canada' },
]

/* ── Inline country select for chart headers ───────────────────────── */
function CountrySelect({ value, onChange, id }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-border-light bg-white px-2 py-1 text-sm text-text-primary
                 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue"
      aria-label="Filter by trading partner"
    >
      {COUNTRY_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

/* ── Map color scheme ────────────────────────────────────────────────── */
const MAP_GROUP_COLORS = {
  texas:  { fill: '#d97706', stroke: '#92400e' },  // amber — TX-Mexico ports (focus)
  mexico: { fill: '#0056a9', stroke: '#003d75' },  // blue — other Mexico border ports
  canada: { fill: '#16a34a', stroke: '#166534' },  // green — Canada border ports
}
const MAP_LEGEND = [
  { label: 'Texas-Mexico Port', color: '#d97706' },
  { label: 'Other Mexico Border Port', color: '#0056a9' },
  { label: 'Canada Border Port', color: '#16a34a' },
]

export default function OverviewPage() {
  const { usTransborder, usMexicoPorts, usCanadaPorts, loading, loadDataset } = useTransborderStore()

  /* ── country filter state (per-section) ───────────────────────── */
  const [countryFilter, setCountryFilter] = useState('')      // stat cards
  const [trendCountry, setTrendCountry] = useState('')         // line chart
  const [modeCountry, setModeCountry] = useState('')           // donut chart

  /* ── lazy-load port data for map ───────────────────────────────── */
  useEffect(() => {
    loadDataset('usMexicoPorts')
    loadDataset('usCanadaPorts')
  }, [loadDataset])

  const { portCoords: mxCoords } = usePortCoordinates()
  const { portCoords: caCoords } = useCanadianPortCoordinates()

  /* ── Build map markers with group labels ───────────────────────── */
  const mapPorts = useMemo(() => {
    const mx = usMexicoPorts?.length ? buildMapPorts(usMexicoPorts, mxCoords) : []
    const ca = usCanadaPorts?.length ? buildMapPorts(usCanadaPorts, caCoords) : []

    // Tag Mexico ports: Texas ones get 'texas', others get 'mexico'
    for (const p of mx) {
      p.group = PORT_REGION_MAP[p.name] ? 'texas' : 'mexico'
    }
    for (const p of ca) {
      p.group = 'canada'
    }
    return [...mx, ...ca]
  }, [usMexicoPorts, usCanadaPorts, mxCoords, caCoords])

  /* ── filtered data based on country selection ──────────────────── */
  const filteredData = useMemo(() => {
    if (!usTransborder?.length) return []
    if (!countryFilter) return usTransborder
    return usTransborder.filter((d) => d.Country === countryFilter)
  }, [usTransborder, countryFilter])

  /* ── Derived year bounds (always from full dataset) ──────────────── */
  const latestYear = useMemo(() => {
    if (!usTransborder?.length) return null
    return Math.max(...usTransborder.map((d) => d.Year).filter(Number.isFinite))
  }, [usTransborder])

  const minYear = useMemo(() => {
    if (!usTransborder?.length) return null
    return Math.min(...usTransborder.map((d) => d.Year).filter(Number.isFinite))
  }, [usTransborder])

  /* ── Insight cards ───────────────────────────────────────────────── */
  const insights = useMemo(() => {
    if (!usTransborder?.length || !latestYear) return []
    try {
      return generateInsights(usTransborder, { scope: 'overview', latestYear })
    } catch {
      return []
    }
  }, [usTransborder, latestYear])

  /* ── StatCard computations ───────────────────────────────────────── */
  const stats = useMemo(() => {
    if (!filteredData.length || !latestYear) return null
    const latestRows = filteredData.filter((d) => d.Year === latestYear)

    const sum = (rows) => rows.reduce((s, d) => s + (d.TradeValue || 0), 0)

    const totalLatest = sum(latestRows)
    const exports = sum(latestRows.filter((d) => /export/i.test(d.TradeType)))
    const imports = sum(latestRows.filter((d) => /import/i.test(d.TradeType)))
    const tradeBalance = exports - imports

    return { totalLatest, exports, imports, tradeBalance }
  }, [filteredData, latestYear])

  /* ── Per-chart filtered data ─────────────────────────────────────── */
  const trendFiltered = useMemo(() => {
    if (!usTransborder?.length) return []
    if (!trendCountry) return usTransborder
    return usTransborder.filter((d) => d.Country === trendCountry)
  }, [usTransborder, trendCountry])

  const modeFiltered = useMemo(() => {
    if (!usTransborder?.length) return []
    if (!modeCountry) return usTransborder
    return usTransborder.filter((d) => d.Country === modeCountry)
  }, [usTransborder, modeCountry])

  /* ── LineChart: Annual trade trends (Exports vs Imports) ─────────── */
  const trendData = useMemo(() => {
    if (!trendFiltered.length) return []
    const map = {}
    for (const d of trendFiltered) {
      const yr = d.Year
      const type = /export/i.test(d.TradeType) ? 'Exports' : /import/i.test(d.TradeType) ? 'Imports' : null
      if (!yr || !type) continue
      const key = `${yr}_${type}`
      if (!map[key]) map[key] = { year: yr, value: 0, series: type }
      map[key].value += d.TradeValue || 0
    }
    return Object.values(map).sort((a, b) => a.year - b.year || a.series.localeCompare(b.series))
  }, [trendFiltered])

  /* ── DonutChart: Trade by Mode (latest year) ─────────────────────── */
  const modeData = useMemo(() => {
    if (!modeFiltered.length || !latestYear) return []
    const map = {}
    for (const d of modeFiltered) {
      if (d.Year !== latestYear || !d.Mode) continue
      map[d.Mode] = (map[d.Mode] || 0) + (d.TradeValue || 0)
    }
    return Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [modeFiltered, latestYear])

  /* ── StackedBarChart: Canada vs Mexico trade by year ─────────────── */
  const countryStackData = useMemo(() => {
    if (!usTransborder?.length) return { data: [], keys: [] }
    const map = {}
    const countries = new Set()
    for (const d of usTransborder) {
      if (!d.Year || !d.Country) continue
      countries.add(d.Country)
      if (!map[d.Year]) map[d.Year] = { year: d.Year }
      map[d.Year][d.Country] = (map[d.Year][d.Country] || 0) + (d.TradeValue || 0)
    }
    const keys = [...countries].sort()
    const data = Object.values(map).sort((a, b) => a.year - b.year)
    // Ensure every row has every key
    for (const row of data) {
      for (const k of keys) {
        if (!(k in row)) row[k] = 0
      }
    }
    return { data, keys }
  }, [usTransborder])

  /* ── Loading state ───────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-base text-text-secondary">Loading TransBorder freight data...</p>
        </div>
      </div>
    )
  }

  /* ── Navigation page cards ───────────────────────────────────────── */
  const navPages = [
    {
      path: '/us-mexico',
      title: 'U.S.--Mexico Trade',
      desc: 'All U.S. ports of entry on the Mexican border — trade totals, port rankings, mode breakdown, and trends. Covers Arizona, California, New Mexico, and Texas.',
      Icon: ArrowRightLeft,
    },
    {
      path: '/texas-mexico',
      title: 'Texas--Mexico Trade',
      desc: 'Deep dive into Texas border ports: port analysis, commodity flows, transportation modes, monthly patterns, and Mexican state trading partners.',
      Icon: MapPin,
    },
  ]

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="gradient-blue text-white relative overflow-visible">
        <HeroStardust seed={42} animate tall />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-14 relative">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-balance">
            U.S. TransBorder Freight Data ({minYear || 1993}--{latestYear || 2025})
          </h2>
          <p className="text-white/80 mt-3 text-base md:text-lg max-w-3xl">
            A comprehensive look at surface, air, vessel, and pipeline freight flows between
            the United States, Mexico, and Canada -- built on the BTS TransBorder Freight
            Data program, the only publicly available data source with port-level detail on
            North American trade.
          </p>
        </div>
      </div>

      {/* ── Stat Cards + Country Filter (grouped) ────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-2">
        <section className="rounded-xl border border-border-light bg-surface-alt/50 p-5">
          <div className="flex items-center gap-3 mb-4">
            <label htmlFor="country-filter" className="text-base font-semibold text-text-primary">
              Trading Partner
            </label>
            <select
              id="country-filter"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="rounded-lg border border-border-light bg-white px-3 py-1.5 text-base text-text-primary
                         shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue"
            >
              {COUNTRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label={`Total Trade (${latestYear})`}
                value={formatCurrency(stats.totalLatest)}
                icon={DollarSign}
                highlight
                variant="primary"
                delay={0}
              />
              <StatCard
                label="Exports"
                value={formatCurrency(stats.exports)}
                icon={ArrowRight}
                delay={100}
              />
              <StatCard
                label="Imports"
                value={formatCurrency(stats.imports)}
                icon={ArrowRight}
                delay={200}
              />
              <StatCard
                label={`Trade Balance (${latestYear})`}
                value={formatCurrency(Math.abs(stats.tradeBalance))}
                trend={stats.tradeBalance >= 0 ? 'up' : 'down'}
                trendLabel={stats.tradeBalance >= 0 ? 'Surplus (Exports > Imports)' : 'Deficit (Imports > Exports)'}
                icon={Scale}
                delay={300}
              />
            </div>
          )}
        </section>
      </div>

      {/* ── Key Insights (always visible, independent of filter) ──── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {insights.length > 0 && (
          <section className="py-6">
            <div className="flex items-center gap-2.5 mb-5">
              <TrendingUp size={20} className="text-brand-blue" />
              <h3 className="text-xl font-bold text-text-primary">Key Insights</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {insights.map((ins, i) => {
                const IconComp = ICON_MAP[ins.icon] || Lightbulb
                return (
                  <InsightCallout
                    key={i}
                    finding={ins.text}
                    variant={ins.variant || 'default'}
                    icon={IconComp}
                  />
                )
              })}
            </div>
          </section>
        )}
      </div>

      {/* ── Border Ports Map ────────────────────────────────────────── */}
      {mapPorts.length > 0 && (
        <SectionBlock>
          <ChartCard title="U.S. Border Ports of Entry" subtitle="All ports sized by total trade value — Texas-Mexico ports highlighted">
            <PortMap
              ports={mapPorts}
              formatValue={formatCurrency}
              center={[42.0, -97.0]}
              zoom={4}
              height="520px"
              groupColors={MAP_GROUP_COLORS}
              legendGroups={MAP_LEGEND}
            />
          </ChartCard>
        </SectionBlock>
      )}

      {/* ── Annual Trade Trends ────────────────────────────────────── */}
      <SectionBlock>
        <div className="flex items-center gap-2.5 mb-5">
          <TrendingUp size={20} className="text-brand-blue" />
          <h3 className="text-xl font-bold text-text-primary">Annual Trade Trends</h3>
        </div>
        <div className="grid grid-cols-1 gap-6">
          <ChartCard
            title={`${trendCountry || 'U.S. TransBorder'} Exports vs Imports`}
            subtitle={`Annual trade value, ${minYear || 1993}\u2013${latestYear || 2025}`}
            headerRight={<CountrySelect value={trendCountry} onChange={setTrendCountry} id="trend-country" />}
            downloadData={{
              summary: { data: trendData, filename: 'us-transborder-exports-vs-imports', columns: DL.tradeTrendSeries },
              detail:  { data: trendFiltered, filename: 'us-transborder-detail', columns: PAGE_TRANSBORDER_COLS },
            }}
          >
            <LineChart
              data={trendData}
              xKey="year"
              yKey="value"
              seriesKey="series"
              formatValue={formatCurrency}
            />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* ── Trade by Mode + Country Share ──────────────────────────── */}
      <SectionBlock alt>
        <div className="flex items-center gap-2.5 mb-5">
          <Layers size={20} className="text-brand-blue" />
          <h3 className="text-xl font-bold text-text-primary">Trade Composition</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title={`${modeCountry || 'All'} Trade by Mode (${latestYear || ''})`}
            subtitle="Share of total trade value by transportation mode"
            headerRight={<CountrySelect value={modeCountry} onChange={setModeCountry} id="mode-country" />}
            downloadData={{
              summary: { data: modeData, filename: 'trade-by-mode', columns: DL.modeRank },
            }}
          >
            <DonutChart
              data={modeData}
              nameKey="label"
              valueKey="value"
              formatValue={formatCurrency}
            />
          </ChartCard>

          <ChartCard
            title="Canada vs Mexico Trade Share"
            subtitle={`Annual trade value by country, ${minYear || 1993}\u2013${latestYear || 2025}`}
            downloadData={{
              summary: { data: countryStackData.data, filename: 'canada-vs-mexico-trade-share' },
            }}
          >
            <StackedBarChart
              data={countryStackData.data}
              xKey="year"
              stackKeys={countryStackData.keys}
              formatValue={formatCurrency}
            />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* ── Navigation Cards ──────────────────────────────────────── */}
      <SectionBlock>
        <div className="flex items-center gap-2.5 mb-5">
          <Database size={20} className="text-brand-blue" />
          <h3 className="text-xl font-bold text-text-primary">Explore the Data</h3>
        </div>
        <p className="text-base text-text-secondary leading-relaxed mb-5">
          Each page below offers a focused lens on U.S. TransBorder freight data.
          Use the filter bar on any page to slice the data by year, country, mode, or trade type.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {navPages.map((p) => (
            <Link
              key={p.path}
              to={p.path}
              className="text-left relative rounded-xl border border-border-light bg-white p-5 flex flex-col
                         hover:shadow-md hover:-translate-y-0.5 hover:border-brand-blue/30
                         transition-all duration-200 group"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <p.Icon size={18} className="text-brand-blue" />
                <span className="text-base font-bold text-text-primary">{p.title}</span>
                <ArrowRight size={14} className="ml-auto text-text-secondary group-hover:text-brand-blue transition-colors" />
              </div>
              <p className="text-base text-text-secondary leading-relaxed">{p.desc}</p>
            </Link>
          ))}
        </div>
      </SectionBlock>

      {/* ── Data Source (pre-footer) ──────────────────────────────── */}
      <section className="bg-surface-alt border-t border-border-light mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-2.5 mb-4">
            <Database size={20} className="text-text-secondary" />
            <h3 className="text-xl font-bold text-text-primary">Data Source</h3>
          </div>
          <p className="text-base text-text-secondary leading-relaxed mb-3">
            All data in this dashboard comes from the{' '}
            <strong className="text-text-primary">Bureau of Transportation Statistics (BTS) TransBorder Freight Data</strong> program.
            TransBorder is the only public data source that provides port-level detail on U.S. trade
            with Canada and Mexico by surface mode (truck, rail, pipeline) as well as air and vessel.
            Data is collected from U.S. Customs declarations and covers all commercial freight shipments
            crossing U.S. borders with its NAFTA/USMCA partners.
          </p>
          <p className="text-base text-text-secondary leading-relaxed mb-3">
            The dataset spans {minYear || 1993} to {latestYear || 2025} and is released monthly by BTS.
            Raw data files are available at{' '}
            <a
              href="https://www.bts.gov/topics/transborder-raw-data"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-blue hover:underline"
            >
              bts.gov/topics/transborder-raw-data
            </a>.
          </p>
          <Link
            to="/about"
            className="inline-flex items-center gap-1.5 text-base font-semibold text-brand-blue hover:underline mt-2"
          >
            Data details, methodology & limitations
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </>
  )
}
