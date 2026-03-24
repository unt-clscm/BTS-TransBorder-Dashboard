/**
 * ModesTab — Transport mode analysis for TX-MX surface freight trade.
 * Shows mode comparison, stacked composition by year, import/export
 * diverging bar, and mode detail table.
 */
import { useMemo } from 'react'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import BarChart from '@/components/charts/BarChart'
import StackedBarChart from '@/components/charts/StackedBarChart'
import DivergingBarChart from '@/components/charts/DivergingBarChart'
import DataTable from '@/components/ui/DataTable'
import { formatCurrency, formatCompact, formatNumber } from '@/lib/chartColors'

export default function ModesTab({ filteredPorts, filteredPortsNoYear, latestYear }) {
  /* ── Mode comparison (vertical bar) ──────────────────────────────── */
  const modeComparison = useMemo(() => {
    const byMode = new Map()
    filteredPorts.forEach((d) => {
      if (!d.Mode) return
      byMode.set(d.Mode, (byMode.get(d.Mode) || 0) + (d.TradeValue || 0))
    })
    return Array.from(byMode, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredPorts])

  /* ── Stacked: Mode composition by year ───────────────────────────── */
  const modeByYear = useMemo(() => {
    const modes = new Set()
    const byYear = new Map()
    filteredPortsNoYear.forEach((d) => {
      if (!d.Mode || !d.Year) return
      modes.add(d.Mode)
      if (!byYear.has(d.Year)) byYear.set(d.Year, { year: d.Year })
      byYear.get(d.Year)[d.Mode] = (byYear.get(d.Year)[d.Mode] || 0) + (d.TradeValue || 0)
    })
    // Sort modes by total descending for legend order
    const modeTotals = new Map()
    modes.forEach((m) => {
      let total = 0
      byYear.forEach((row) => { total += row[m] || 0 })
      modeTotals.set(m, total)
    })
    const sortedModes = [...modes].sort((a, b) => modeTotals.get(b) - modeTotals.get(a))

    const data = Array.from(byYear.values())
      .map((row) => {
        sortedModes.forEach((m) => { if (!(m in row)) row[m] = 0 })
        return row
      })
      .sort((a, b) => a.year - b.year)
    return { data, keys: sortedModes }
  }, [filteredPortsNoYear])

  /* ── Diverging bar: Import/Export balance by mode ─────────────────── */
  const modeImbalance = useMemo(() => {
    const byMode = new Map()
    filteredPorts.forEach((d) => {
      if (!d.Mode) return
      if (!byMode.has(d.Mode)) byMode.set(d.Mode, { label: d.Mode, exports: 0, imports: 0 })
      const row = byMode.get(d.Mode)
      if (d.TradeType === 'Export') row.exports += d.TradeValue || 0
      else if (d.TradeType === 'Import') row.imports += d.TradeValue || 0
    })
    return Array.from(byMode.values())
      .sort((a, b) => (b.exports + b.imports) - (a.exports + a.imports))
  }, [filteredPorts])

  /* ── Mode detail table ───────────────────────────────────────────── */
  const tableData = useMemo(() => {
    const byKey = new Map()
    filteredPorts.forEach((d) => {
      const key = `${d.Year}|${d.Mode}|${d.TradeType}`
      if (!byKey.has(key)) {
        byKey.set(key, {
          Year: d.Year,
          Mode: d.Mode || '—',
          TradeType: d.TradeType || '—',
          TradeValue: 0,
          Weight: 0,
          FreightCharges: 0,
        })
      }
      const row = byKey.get(key)
      row.TradeValue += d.TradeValue || 0
      row.Weight += d.Weight || 0
      row.FreightCharges += d.FreightCharges || 0
    })
    return Array.from(byKey.values()).sort((a, b) => b.TradeValue - a.TradeValue)
  }, [filteredPorts])

  const tableColumns = [
    { key: 'Year', label: 'Year' },
    { key: 'Mode', label: 'Mode' },
    { key: 'TradeType', label: 'Trade Type' },
    { key: 'TradeValue', label: 'Trade Value ($)', render: (v) => formatCurrency(v) },
    { key: 'Weight', label: 'Weight (kg)', render: (v) => formatNumber(v) },
    { key: 'FreightCharges', label: 'Freight Charges ($)', render: (v) => formatCurrency(v) },
  ]

  return (
    <>
      {/* Mode comparison bar chart */}
      <SectionBlock>
        <div className="max-w-7xl mx-auto">
          <ChartCard title="Mode Comparison" subtitle="Total trade value by transport mode">
            <BarChart
              data={modeComparison}
              xKey="label"
              yKey="value"
              formatValue={formatCurrency}
            />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Mode composition by year (stacked) */}
      <SectionBlock alt>
        <div className="max-w-7xl mx-auto">
          <ChartCard title="Mode Composition by Year" subtitle="Annual trade value stacked by transport mode">
            <StackedBarChart
              data={modeByYear.data}
              xKey="year"
              stackKeys={modeByYear.keys}
              formatValue={formatCurrency}
            />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Import/Export balance by mode (diverging) */}
      <SectionBlock>
        <div className="max-w-7xl mx-auto">
          <ChartCard title="Import/Export Balance by Mode" subtitle="Exports extend right, imports extend left">
            <DivergingBarChart
              data={modeImbalance}
              labelKey="label"
              leftKey="imports"
              rightKey="exports"
              leftLabel="Imports"
              rightLabel="Exports"
              formatValue={formatCurrency}
            />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Mode detail table */}
      <SectionBlock alt>
        <div className="max-w-7xl mx-auto">
          <ChartCard title="Mode Detail" subtitle="Aggregated by year, mode, and trade type">
            <DataTable data={tableData} columns={tableColumns} pageSize={15} />
          </ChartCard>
        </div>
      </SectionBlock>
    </>
  )
}
