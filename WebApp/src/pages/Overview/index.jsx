import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, DollarSign, ArrowRight, Database, Layers,
  ArrowRightLeft, MapPin, BarChart3, Truck, Package, Award, PieChart,
  Globe, Map, Scale, ArrowUpDown, Lightbulb,
} from 'lucide-react'
import { useTransborderStore } from '@/stores/transborderStore'
import { formatCurrency, formatCompact, formatPercent } from '@/lib/chartColors'
import { generateInsights } from '@/lib/insightEngine'
import HeroStardust from '@/components/ui/HeroStardust'
import InsightCallout from '@/components/ui/InsightCallout'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import StatCard from '@/components/ui/StatCard'
import LineChart from '@/components/charts/LineChart'
import DonutChart from '@/components/charts/DonutChart'
import StackedBarChart from '@/components/charts/StackedBarChart'

/* ── Icon lookup for insightEngine string → component ────────────────── */
const ICON_MAP = {
  TrendingUp, TrendingDown, DollarSign, ArrowRight, Database, Layers,
  ArrowRightLeft, MapPin, BarChart3, Truck, Package, Award, PieChart,
  Globe, Map, Scale, ArrowUpDown, Lightbulb,
}

export default function OverviewPage() {
  const { usTransborder, loading } = useTransborderStore()

  /* ── Derived year bounds ─────────────────────────────────────────── */
  const latestYear = useMemo(() => {
    if (!usTransborder?.length) return null
    return Math.max(...usTransborder.map((d) => d.Year).filter(Number.isFinite))
  }, [usTransborder])

  const minYear = useMemo(() => {
    if (!usTransborder?.length) return null
    return Math.min(...usTransborder.map((d) => d.Year).filter(Number.isFinite))
  }, [usTransborder])

  const previousYear = latestYear ? latestYear - 1 : null

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
    if (!usTransborder?.length || !latestYear) return null
    const latestRows = usTransborder.filter((d) => d.Year === latestYear)
    const prevRows = previousYear
      ? usTransborder.filter((d) => d.Year === previousYear)
      : []

    const sum = (rows) => rows.reduce((s, d) => s + (d.TradeValue || 0), 0)

    const totalLatest = sum(latestRows)
    const totalPrev = sum(prevRows)
    const exports = sum(latestRows.filter((d) => /export/i.test(d.TradeType)))
    const imports = sum(latestRows.filter((d) => /import/i.test(d.TradeType)))
    const yoyChange = totalPrev ? ((totalLatest - totalPrev) / totalPrev) * 100 : null

    return { totalLatest, exports, imports, yoyChange }
  }, [usTransborder, latestYear, previousYear])

  /* ── LineChart: Annual trade trends (Exports vs Imports) ─────────── */
  const trendData = useMemo(() => {
    if (!usTransborder?.length) return []
    const map = {}
    for (const d of usTransborder) {
      const yr = d.Year
      const type = /export/i.test(d.TradeType) ? 'Exports' : /import/i.test(d.TradeType) ? 'Imports' : null
      if (!yr || !type) continue
      const key = `${yr}_${type}`
      if (!map[key]) map[key] = { year: yr, value: 0, series: type }
      map[key].value += d.TradeValue || 0
    }
    return Object.values(map).sort((a, b) => a.year - b.year || a.series.localeCompare(b.series))
  }, [usTransborder])

  /* ── DonutChart: Trade by Mode (latest year) ─────────────────────── */
  const modeData = useMemo(() => {
    if (!usTransborder?.length || !latestYear) return []
    const map = {}
    for (const d of usTransborder) {
      if (d.Year !== latestYear || !d.Mode) continue
      map[d.Mode] = (map[d.Mode] || 0) + (d.TradeValue || 0)
    }
    return Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [usTransborder, latestYear])

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
      desc: 'National-level U.S.--Mexico trade by port of entry, mode, and direction.',
      Icon: ArrowRightLeft,
    },
    {
      path: '/texas-mexico',
      title: 'Texas--Mexico Trade',
      desc: 'Deep dive into Texas border ports, trade flows, and regional patterns.',
      Icon: MapPin,
    },
    {
      path: '/trade-by-mode',
      title: 'Trade by Mode',
      desc: 'Compare truck, rail, pipeline, air, and vessel freight over time.',
      Icon: Truck,
    },
    {
      path: '/commodities',
      title: 'Commodities',
      desc: 'Top commodity groups by value and weight across trade partners.',
      Icon: Package,
    },
    {
      path: '/trade-by-state',
      title: 'Trade by State',
      desc: 'Which U.S. states drive the most cross-border trade with Mexico?',
      Icon: BarChart3,
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* ── Insight Callouts ──────────────────────────────────────── */}
        {insights.length > 0 && (
          <section className="py-8">
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

        {/* ── Stat Cards ───────────────────────────────────────────── */}
        {stats && (
          <section className="pb-8">
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
                label="Year-over-Year Change"
                value={stats.yoyChange != null ? `${stats.yoyChange >= 0 ? '+' : ''}${stats.yoyChange.toFixed(1)}%` : 'N/A'}
                trend={stats.yoyChange != null ? (stats.yoyChange >= 0 ? 'up' : 'down') : 'neutral'}
                trendLabel={stats.yoyChange != null ? `${previousYear} to ${latestYear}` : ''}
                icon={TrendingUp}
                delay={300}
              />
            </div>
          </section>
        )}
      </div>

      {/* ── Annual Trade Trends ────────────────────────────────────── */}
      <SectionBlock>
        <div className="flex items-center gap-2.5 mb-5">
          <TrendingUp size={20} className="text-brand-blue" />
          <h3 className="text-xl font-bold text-text-primary">Annual Trade Trends</h3>
        </div>
        <div className="grid grid-cols-1 gap-6">
          <ChartCard
            title="U.S. TransBorder Exports vs Imports"
            subtitle={`Annual trade value, ${minYear || 1993}--${latestYear || 2025}`}
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
            title={`Trade by Mode (${latestYear || ''})`}
            subtitle="Share of total trade value by transportation mode"
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
            subtitle={`Annual trade value by country, ${minYear || 1993}--${latestYear || 2025}`}
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
            to="/about-data"
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
