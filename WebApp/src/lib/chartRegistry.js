/**
 * Chart registry — maps pageId/chartId to chart component + data builder.
 * Used by EmbedPage to render standalone charts from URL parameters.
 */
import { formatCurrency } from '@/lib/chartColors'

/* ── Data builder helpers ──────────────────────────────────────────────── */

function buildTrendData(rows) {
  const map = {}
  for (const d of rows) {
    const yr = d.Year
    const type = /export/i.test(d.TradeType) ? 'Exports' : /import/i.test(d.TradeType) ? 'Imports' : null
    if (!yr || !type) continue
    const key = `${yr}_${type}`
    if (!map[key]) map[key] = { year: yr, value: 0, series: type }
    map[key].value += d.TradeValue || 0
  }
  return Object.values(map).sort((a, b) => a.year - b.year || a.series.localeCompare(b.series))
}

function buildModeDonut(rows, latestYear) {
  const map = {}
  for (const d of rows) {
    if (d.Year !== latestYear || !d.Mode) continue
    map[d.Mode] = (map[d.Mode] || 0) + (d.TradeValue || 0)
  }
  return Object.entries(map)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

function buildCountryStack(rows) {
  const map = {}
  const countries = new Set()
  for (const d of rows) {
    if (!d.Year || !d.Country) continue
    countries.add(d.Country)
    if (!map[d.Year]) map[d.Year] = { year: d.Year }
    map[d.Year][d.Country] = (map[d.Year][d.Country] || 0) + (d.TradeValue || 0)
  }
  const keys = [...countries].sort()
  const data = Object.values(map).sort((a, b) => a.year - b.year)
  for (const row of data) {
    for (const k of keys) {
      if (!(k in row)) row[k] = 0
    }
  }
  return { data, keys }
}

function buildTopPorts(rows, latestYear, limit = 15) {
  const map = {}
  for (const d of rows) {
    if (d.Year !== latestYear || !d.Port) continue
    map[d.Port] = (map[d.Port] || 0) + (d.TradeValue || 0)
  }
  return Object.entries(map)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

function buildTopStates(rows, latestYear, limit = 15) {
  const map = {}
  for (const d of rows) {
    if (d.Year !== latestYear || !d.State) continue
    map[d.State] = (map[d.State] || 0) + (d.TradeValue || 0)
  }
  return Object.entries(map)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

function getLatestYear(rows) {
  let max = 0
  for (const d of rows) {
    if (d.Year > max) max = d.Year
  }
  return max || null
}

/* ── Registry ──────────────────────────────────────────────────────────── */

export const CHART_REGISTRY = {
  overview: {
    'exports-vs-imports': {
      title: 'U.S. TransBorder Exports vs Imports',
      dataset: 'usTransborder',
      chartType: 'LineChart',
      build: (rows) => ({ data: buildTrendData(rows) }),
      props: { xKey: 'year', yKey: 'value', seriesKey: 'series', formatValue: formatCurrency },
    },
    'trade-by-mode': {
      title: 'Trade by Mode',
      dataset: 'usTransborder',
      chartType: 'DonutChart',
      build: (rows) => ({ data: buildModeDonut(rows, getLatestYear(rows)) }),
      props: { nameKey: 'label', valueKey: 'value', formatValue: formatCurrency },
    },
    'country-share': {
      title: 'Canada vs Mexico Trade Share',
      dataset: 'usTransborder',
      chartType: 'StackedBarChart',
      build: (rows) => {
        const { data, keys } = buildCountryStack(rows)
        return { data, extraProps: { stackKeys: keys } }
      },
      props: { xKey: 'year', formatValue: formatCurrency },
    },
  },
  'us-mexico': {
    'trade-trends': {
      title: 'U.S.-Mexico Trade Trends',
      dataset: 'usTransborder',
      chartType: 'LineChart',
      build: (rows) => {
        const mx = rows.filter((d) => /mexico/i.test(d.Country))
        return { data: buildTrendData(mx) }
      },
      props: { xKey: 'year', yKey: 'value', seriesKey: 'series', formatValue: formatCurrency },
    },
    'top-ports': {
      title: 'Top 15 U.S.-Mexico Ports',
      dataset: 'usTransborder',
      chartType: 'BarChart',
      build: (rows) => {
        const mx = rows.filter((d) => /mexico/i.test(d.Country))
        return { data: buildTopPorts(mx, getLatestYear(mx)) }
      },
      props: { xKey: 'label', yKey: 'value', horizontal: true, formatValue: formatCurrency },
    },
  },
  'trade-by-state': {
    'top-states': {
      title: 'Top 15 States by Trade Value',
      dataset: 'usTransborder',
      chartType: 'BarChart',
      build: (rows) => ({ data: buildTopStates(rows, getLatestYear(rows)) }),
      props: { xKey: 'label', yKey: 'value', horizontal: true, formatValue: formatCurrency },
    },
  },
}
