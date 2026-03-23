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
import { formatCurrency, formatCompact } from '@/lib/chartColors'

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
          <p className="text-base text-text-secondary leading-relaxed">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
          <ChartCard title="TX-MX Trade Trends" subtitle="Annual trade value by direction">
            <LineChart
              data={tradeTrend}
              xKey="year"
              yKey="value"
              seriesKey="TradeType"
              formatValue={formatCurrency}
            />
          </ChartCard>

          <ChartCard title="Trade by Mode" subtitle="All selected years combined">
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
          <ChartCard title="Top Ports of Entry" subtitle="Ranked by total trade value">
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
