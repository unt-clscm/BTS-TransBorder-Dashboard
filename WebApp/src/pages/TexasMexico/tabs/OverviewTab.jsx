/**
 * OverviewTab — High-level summary of TX-MX surface freight trade.
 * Shows aggregate trade trends, trade by mode donut, and top ports bar chart.
 */
import { useMemo } from 'react'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import LineChart from '@/components/charts/LineChart'
import DonutChart from '@/components/charts/DonutChart'
import BarChart from '@/components/charts/BarChart'
import { formatCurrency } from '@/lib/chartColors'
import { DL } from '@/lib/downloadColumns'

const HISTORICAL_ANNOTATIONS = [
  { x: 2008.5, x2: 2009.5, label: '2008 Financial Crisis', color: 'rgba(245,158,11,0.08)', labelColor: '#b45309' },
  { x: 2019.5, x2: 2020.5, label: 'COVID-19', color: 'rgba(217,13,13,0.08)', labelColor: '#d90d0d' },
]

export default function OverviewTab({ filteredPorts, filteredPortsNoYear, latestYear }) {
  /* ── Trade trend by Year + TradeType (year-agnostic for trend) ────── */
  const tradeTrend = useMemo(() => {
    const byYT = new Map()
    filteredPortsNoYear.forEach((d) => {
      if (!d.Year || !d.TradeType) return
      const key = `${d.Year}|${d.TradeType}`
      if (!byYT.has(key)) byYT.set(key, { year: d.Year, value: 0, TradeType: d.TradeType })
      byYT.get(key).value += d.TradeValue || 0
    })
    return Array.from(byYT.values()).sort((a, b) => a.year - b.year || a.TradeType.localeCompare(b.TradeType))
  }, [filteredPortsNoYear])

  /* ── Trade by mode (donut) ───────────────────────────────────────── */
  const tradeByMode = useMemo(() => {
    const byMode = new Map()
    filteredPorts.forEach((d) => {
      if (!d.Mode) return
      byMode.set(d.Mode, (byMode.get(d.Mode) || 0) + (d.TradeValue || 0))
    })
    return Array.from(byMode, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredPorts])

  /* ── Top ports (bar) ─────────────────────────────────────────────── */
  const topPorts = useMemo(() => {
    const byPort = new Map()
    filteredPorts.forEach((d) => {
      if (!d.Port) return
      byPort.set(d.Port, (byPort.get(d.Port) || 0) + (d.TradeValue || 0))
    })
    return Array.from(byPort, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filteredPorts])

  return (
    <>
      {/* Narrative introduction */}
      <SectionBlock>
        <div className="space-y-4">
          <p className="text-lg text-text-secondary leading-relaxed">
            Texas and Mexico share the busiest land border in the Western Hemisphere for
            commercial freight. Truck, rail, and pipeline shipments flow through major ports
            of entry concentrated in three regions &mdash; El Paso, Laredo, and the Lower
            Rio Grande Valley (Pharr). This overview captures the scale, direction, and modal
            composition of that trade from 2007 to {latestYear || '…'}.
          </p>
        </div>
      </SectionBlock>

      {/* Trade trend line chart */}
      <SectionBlock alt>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="TX-MX Trade Trends" subtitle="Annual trade value by direction"
            downloadData={{ summary: { data: tradeTrend, filename: 'tx-mx-trade-trends', columns: DL.tradeTrendSeries } }}>
            <LineChart
              data={tradeTrend}
              xKey="year"
              yKey="value"
              seriesKey="TradeType"
              formatValue={formatCurrency}
              annotations={HISTORICAL_ANNOTATIONS}
            />
          </ChartCard>

          <ChartCard title="Trade by Mode" subtitle="All selected years combined"
            downloadData={{ summary: { data: tradeByMode, filename: 'tx-mx-trade-by-mode', columns: DL.modeRank } }}>
            <DonutChart
              data={tradeByMode}
              nameKey="label"
              valueKey="value"
              formatValue={formatCurrency}
            />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Top ports bar chart */}
      <SectionBlock>
        <div className="max-w-7xl mx-auto">
          <ChartCard title="Top Ports of Entry" subtitle="Ranked by total trade value"
            downloadData={{ summary: { data: topPorts, filename: 'tx-mx-top-ports', columns: DL.portRank } }}>
            <BarChart
              data={topPorts}
              xKey="label"
              yKey="value"
              horizontal
              formatValue={formatCurrency}
            />
          </ChartCard>
        </div>
      </SectionBlock>
    </>
  )
}
