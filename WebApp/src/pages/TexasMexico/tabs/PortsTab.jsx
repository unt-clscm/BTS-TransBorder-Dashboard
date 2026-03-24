/**
 * PortsTab — Port-level analysis of TX-MX surface freight trade.
 * Includes interactive port map, port ranking, top-5 port trends, and data table.
 */
import { useMemo } from 'react'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import BarChart from '@/components/charts/BarChart'
import LineChart from '@/components/charts/LineChart'
import DataTable from '@/components/ui/DataTable'
import PortMap from '@/components/maps/PortMap'
import { MEXICAN_CROSSINGS } from '@/lib/portUtils'
import { formatCurrency, formatCompact, formatNumber } from '@/lib/chartColors'
import { DL, PAGE_PORT_COLS } from '@/lib/downloadColumns'

export default function PortsTab({ filteredPorts, filteredPortsNoYear, latestYear }) {
  /* ── Map markers (aggregate trade by port, attach coords) ────────── */
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

  /* ── Port ranking (bar) ──────────────────────────────────────────── */
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

  /* ── Top 5 port trends (multi-series line) ───────────────────────── */
  const portTrends = useMemo(() => {
    // Find top 5 ports by total trade
    const totals = new Map()
    filteredPortsNoYear.forEach((d) => {
      if (!d.Port) return
      totals.set(d.Port, (totals.get(d.Port) || 0) + (d.TradeValue || 0))
    })
    const top5 = Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name)
    const top5Set = new Set(top5)

    // Build time series for top 5
    const byYP = new Map()
    filteredPortsNoYear.forEach((d) => {
      if (!d.Port || !top5Set.has(d.Port)) return
      const key = `${d.Year}|${d.Port}`
      if (!byYP.has(key)) byYP.set(key, { year: d.Year, value: 0, Port: d.Port })
      byYP.get(key).value += d.TradeValue || 0
    })
    return Array.from(byYP.values()).sort((a, b) => a.year - b.year || a.Port.localeCompare(b.Port))
  }, [filteredPortsNoYear])

  /* ── Port detail table ───────────────────────────────────────────── */
  const portTableData = useMemo(() => {
    const byKey = new Map()
    filteredPorts.forEach((d) => {
      const key = `${d.Year}|${d.Port}|${d.Mode}|${d.TradeType}`
      if (!byKey.has(key)) {
        byKey.set(key, {
          Year: d.Year,
          Port: d.Port || '—',
          Region: d.Region || '—',
          Mode: d.Mode || '—',
          TradeType: d.TradeType || '—',
          TradeValue: 0,
          Weight: 0,
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
      {/* Interactive port map */}
      <SectionBlock>
        <div className="max-w-7xl mx-auto">
          <ChartCard title="Texas-Mexico Ports of Entry" subtitle="Bubble size reflects total trade value for selected filters">
            <PortMap
              ports={mapPorts}
              mexicanCrossings={MEXICAN_CROSSINGS}
              formatValue={formatCurrency}
              center={[28.5, -100.0]}
              zoom={6}
              height="520px"
            />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Port ranking bar chart */}
      <SectionBlock alt>
        <div className="max-w-7xl mx-auto">
          <ChartCard title="Port Ranking" subtitle="Top 15 ports by total trade value"
            downloadData={{ summary: { data: portRanking, filename: 'tx-mx-port-ranking', columns: DL.portRank } }}>
            <BarChart
              data={portRanking}
              xKey="label"
              yKey="value"
              horizontal
              formatValue={formatCurrency}
            />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Top 5 port trends */}
      <SectionBlock>
        <div className="max-w-7xl mx-auto">
          <ChartCard title="Top 5 Port Trends" subtitle="Annual trade value for the five largest ports"
            downloadData={{ summary: { data: portTrends, filename: 'tx-mx-top5-port-trends', columns: DL.tradeTrendSeries } }}>
            <LineChart
              data={portTrends}
              xKey="year"
              yKey="value"
              seriesKey="Port"
              formatValue={formatCurrency}
            />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Port detail table */}
      <SectionBlock alt>
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
