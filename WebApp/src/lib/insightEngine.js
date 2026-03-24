/**
 * insightEngine.js
 *
 * Data-driven insight generator for the TransBorder freight dashboard.
 * Produces human-readable insight strings from actual data so that
 * InsightCallout cards auto-update whenever the underlying dataset changes.
 *
 * Each insight is { text, variant, icon } where:
 *   variant: 'highlight' (green) | 'warning' (orange) | 'neutral' (blue)
 *   icon:    a lucide-react icon name string
 */

import { formatCurrency, formatPercent } from './transborderHelpers'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Safe summation — skips null / NaN rows. */
const safeSum = (rows, field) =>
  rows.reduce((acc, r) => {
    const v = Number(r[field])
    return isNaN(v) ? acc : acc + v
  }, 0)

/** Filter rows by a map of field === value conditions. */
const where = (rows, conditions) =>
  rows.filter((r) =>
    Object.entries(conditions).every(([k, v]) => {
      if (Array.isArray(v)) return v.includes(r[k])
      if (typeof v === 'function') return v(r[k])
      return r[k] === v
    }),
  )

/** Return the percentage (0–1) of fieldSum matching `cond` vs total in `rows`. */
const shareOf = (rows, cond, field = 'TradeValue') => {
  const total = safeSum(rows, field)
  if (!total) return null
  return safeSum(where(rows, cond), field) / total
}

/** Year-over-year growth rate (returns a ratio like 0.12 for +12%). */
const yoyGrowth = (rows, latestYear, cond = {}, field = 'TradeValue') => {
  const baseYear = latestYear - 1
  const latest = safeSum(where(rows, { ...cond, Year: String(latestYear) }), field) ||
    safeSum(where(rows, { ...cond, Year: latestYear }), field)
  const base = safeSum(where(rows, { ...cond, Year: String(baseYear) }), field) ||
    safeSum(where(rows, { ...cond, Year: baseYear }), field)
  if (!base) return null
  return (latest - base) / base
}

/** Find the year where Mexico first exceeded Canada by TradeValue (if ever). */
const findCrossoverYear = (rows) => {
  const years = [...new Set(rows.map((r) => r.Year))].sort()
  for (const yr of years) {
    const yearRows = where(rows, { Year: yr })
    const mx = safeSum(where(yearRows, { Country: 'Mexico' }), 'TradeValue')
    const ca = safeSum(where(yearRows, { Country: 'Canada' }), 'TradeValue')
    if (mx > ca && mx > 0) return yr
  }
  return null
}

/** Return top-N items sorted by descending aggregate of `field`. */
const topN = (rows, groupField, field = 'TradeValue', n = 1) => {
  const map = {}
  for (const r of rows) {
    const key = r[groupField]
    if (key == null) continue
    const v = Number(r[field])
    if (isNaN(v)) continue
    map[key] = (map[key] || 0) + v
  }
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, value]) => ({ name, value }))
}

/** Return the group with the highest yoy growth between latestYear-1 and latestYear. */
const fastestGrowing = (rows, groupField, latestYear, field = 'TradeValue') => {
  const groups = [...new Set(rows.map((r) => r[groupField]).filter(Boolean))]
  let best = null
  let bestRate = -Infinity
  for (const g of groups) {
    const cond = { [groupField]: g }
    const latest =
      safeSum(where(rows, { ...cond, Year: String(latestYear) }), field) ||
      safeSum(where(rows, { ...cond, Year: latestYear }), field)
    const base =
      safeSum(where(rows, { ...cond, Year: String(latestYear - 1) }), field) ||
      safeSum(where(rows, { ...cond, Year: latestYear - 1 }), field)
    if (!base || !latest) continue
    const rate = (latest - base) / base
    if (rate > bestRate) {
      bestRate = rate
      best = g
    }
  }
  if (best === null || !isFinite(bestRate)) return null
  return { name: best, rate: bestRate }
}

/** Check whether a computed value is valid for display. */
const isValid = (v) => v != null && isFinite(v) && !isNaN(v)

// ---------------------------------------------------------------------------
// Scope generators
// ---------------------------------------------------------------------------

function overviewInsights(data, latestYear) {
  const insights = []
  const yr = String(latestYear)
  const yearRows = where(data, { Year: yr }).length
    ? where(data, { Year: yr })
    : where(data, { Year: latestYear })

  // Truck share of US-Mexico trade
  const mxRows = where(yearRows, { Country: 'Mexico' })
  const truckShare = shareOf(mxRows, { Mode: (m) => /truck/i.test(m) })
  if (isValid(truckShare)) {
    insights.push({
      text: `Truck freight accounts for ${formatPercent(truckShare)} of US-Mexico trade in ${latestYear}`,
      variant: 'neutral',
      icon: 'Truck',
    })
  }

  // YoY growth for US-Mexico trade
  const growth = yoyGrowth(data, latestYear, { Country: 'Mexico' })
  if (isValid(growth)) {
    const direction = growth >= 0 ? 'grew' : 'declined'
    insights.push({
      text: `US-Mexico trade ${direction} ${formatPercent(Math.abs(growth))} from ${latestYear - 1} to ${latestYear}`,
      variant: growth >= 0 ? 'highlight' : 'warning',
      icon: growth >= 0 ? 'TrendingUp' : 'TrendingDown',
    })
  }

  // Mexico surpassed Canada crossover
  const crossover = findCrossoverYear(data)
  if (crossover) {
    insights.push({
      text: `Mexico surpassed Canada as #1 US trading partner in ${crossover}`,
      variant: 'highlight',
      icon: 'Award',
    })
  }

  return insights
}

function usMexicoInsights(data, latestYear) {
  const insights = []

  // Laredo share of surface trade
  const surfaceModes = ['Truck', 'Rail']
  const surfaceRows = where(data, { Mode: (m) => surfaceModes.some((s) => new RegExp(s, 'i').test(m)) })
  const laredoShare = shareOf(surfaceRows, { Port: (p) => /laredo/i.test(p) })
  if (isValid(laredoShare)) {
    insights.push({
      text: `Laredo handles ${formatPercent(laredoShare)} of all US-Mexico surface trade`,
      variant: 'neutral',
      icon: 'MapPin',
    })
  }

  // Top port by trade value
  const top = topN(data, 'Port', 'TradeValue', 1)
  if (top.length) {
    insights.push({
      text: `${top[0].name} is the top US-Mexico port with ${formatCurrency(top[0].value)} in trade`,
      variant: 'highlight',
      icon: 'DollarSign',
    })
  }

  // Fastest growing port
  const fastest = fastestGrowing(data, 'Port', latestYear)
  if (fastest && isValid(fastest.rate)) {
    const dir = fastest.rate >= 0 ? 'grew' : 'declined'
    insights.push({
      text: `${fastest.name} ${dir} ${formatPercent(Math.abs(fastest.rate))} year-over-year in ${latestYear}`,
      variant: fastest.rate >= 0 ? 'highlight' : 'warning',
      icon: fastest.rate >= 0 ? 'TrendingUp' : 'TrendingDown',
    })
  }

  return insights
}

function texasMexicoInsights(data, _latestYear) {
  const insights = []

  // Top region share
  const topRegion = topN(data, 'Region', 'TradeValue', 1)
  if (topRegion.length) {
    const share = shareOf(data, { Region: topRegion[0].name })
    if (isValid(share)) {
      insights.push({
        text: `${topRegion[0].name} accounts for ${formatPercent(share)} of Texas-Mexico trade`,
        variant: 'neutral',
        icon: 'Map',
      })
    }
  }

  // Dominant mode
  const topMode = topN(data, 'Mode', 'TradeValue', 1)
  if (topMode.length) {
    const share = shareOf(data, { Mode: topMode[0].name })
    if (isValid(share)) {
      insights.push({
        text: `${topMode[0].name} is the dominant mode at ${formatPercent(share)} of Texas-Mexico trade`,
        variant: 'neutral',
        icon: 'Truck',
      })
    }
  }

  // Export / import balance
  const exports = safeSum(where(data, { TradeType: (t) => /export/i.test(t) }), 'TradeValue')
  const imports = safeSum(where(data, { TradeType: (t) => /import/i.test(t) }), 'TradeValue')
  if (exports && imports) {
    const ratio = exports / imports
    const label = ratio >= 1 ? 'surplus' : 'deficit'
    const diff = Math.abs(exports - imports)
    insights.push({
      text: `Texas runs a trade ${label} of ${formatCurrency(diff)} with Mexico`,
      variant: ratio >= 1 ? 'highlight' : 'warning',
      icon: 'Scale',
    })
  }

  return insights
}

function modeInsights(data, latestYear) {
  const insights = []

  // Fastest growing mode
  const fastest = fastestGrowing(data, 'Mode', latestYear)
  if (fastest && isValid(fastest.rate)) {
    insights.push({
      text: `${fastest.name} is the fastest-growing mode at ${formatPercent(Math.abs(fastest.rate))} year-over-year in ${latestYear}`,
      variant: fastest.rate >= 0 ? 'highlight' : 'warning',
      icon: 'TrendingUp',
    })
  }

  // Mode share breakdown (top 3)
  const topModes = topN(data, 'Mode', 'TradeValue', 3)
  const total = safeSum(data, 'TradeValue')
  if (topModes.length && total) {
    const parts = topModes
      .map((m) => `${m.name} ${formatPercent(m.value / total)}`)
      .join(', ')
    insights.push({
      text: `Mode share breakdown: ${parts} (${latestYear})`,
      variant: 'neutral',
      icon: 'PieChart',
    })
  }

  // Rail vs truck growth comparison
  const truckGrowth = yoyGrowth(data, latestYear, { Mode: (m) => /truck/i.test(m) })
  const railGrowth = yoyGrowth(data, latestYear, { Mode: (m) => /rail/i.test(m) })
  if (isValid(truckGrowth) && isValid(railGrowth)) {
    const faster = railGrowth > truckGrowth ? 'Rail' : 'Truck'
    const diff = Math.abs(railGrowth - truckGrowth)
    insights.push({
      text: `${faster} outpaced the other mode by ${formatPercent(diff)} in ${latestYear}`,
      variant: 'neutral',
      icon: 'ArrowRightLeft',
    })
  }

  return insights
}

function commodityInsights(data, latestYear) {
  const insights = []
  const yr = String(latestYear)
  const yearRows = where(data, { Year: yr }).length
    ? where(data, { Year: yr })
    : where(data, { Year: latestYear })

  // Top commodity group
  const topGroup = topN(yearRows, 'CommodityGroup', 'TradeValue', 1)
  if (topGroup.length) {
    insights.push({
      text: `${topGroup[0].name} is the top commodity group with ${formatCurrency(topGroup[0].value)} in ${latestYear}`,
      variant: 'highlight',
      icon: 'Package',
    })
  }

  // Rank change — compare top group between years
  const prevYr = String(latestYear - 1)
  const prevRows = where(data, { Year: prevYr }).length
    ? where(data, { Year: prevYr })
    : where(data, { Year: latestYear - 1 })
  const prevTop = topN(prevRows, 'CommodityGroup', 'TradeValue', 1)
  if (topGroup.length && prevTop.length && topGroup[0].name !== prevTop[0].name) {
    insights.push({
      text: `${topGroup[0].name} overtook ${prevTop[0].name} as the top commodity group in ${latestYear}`,
      variant: 'highlight',
      icon: 'ArrowUpDown',
    })
  } else if (topGroup.length && prevTop.length) {
    const growth = yoyGrowth(data, latestYear, { CommodityGroup: topGroup[0].name })
    if (isValid(growth)) {
      insights.push({
        text: `${topGroup[0].name} ${growth >= 0 ? 'grew' : 'declined'} ${formatPercent(Math.abs(growth))} year-over-year`,
        variant: growth >= 0 ? 'highlight' : 'warning',
        icon: growth >= 0 ? 'TrendingUp' : 'TrendingDown',
      })
    }
  }

  // Concentration — top 5 share
  const topFive = topN(yearRows, 'CommodityGroup', 'TradeValue', 5)
  const total = safeSum(yearRows, 'TradeValue')
  if (topFive.length >= 2 && total) {
    const topFiveSum = topFive.reduce((a, g) => a + g.value, 0)
    const share = topFiveSum / total
    if (isValid(share)) {
      insights.push({
        text: `Top ${topFive.length} commodity groups account for ${formatPercent(share)} of trade in ${latestYear}`,
        variant: 'neutral',
        icon: 'Layers',
      })
    }
  }

  return insights
}

function stateInsights(data, latestYear) {
  const insights = []

  // Top state share
  const topState = topN(data, 'State', 'TradeValue', 1)
  const total = safeSum(data, 'TradeValue')
  if (topState.length && total) {
    const share = topState[0].value / total
    if (isValid(share)) {
      insights.push({
        text: `${topState[0].name} accounts for ${formatPercent(share)} of US-Mexico trade`,
        variant: 'highlight',
        icon: 'MapPin',
      })
    }
  }

  // Number of active trading states
  const activeStates = new Set(data.map((r) => r.State).filter(Boolean))
  if (activeStates.size > 0) {
    insights.push({
      text: `${activeStates.size} states actively trade with Mexico in ${latestYear}`,
      variant: 'neutral',
      icon: 'Globe',
    })
  }

  // Regional concentration — top 5 states share
  const topFive = topN(data, 'State', 'TradeValue', 5)
  if (topFive.length >= 2 && total) {
    const topFiveSum = topFive.reduce((a, s) => a + s.value, 0)
    const share = topFiveSum / total
    if (isValid(share)) {
      insights.push({
        text: `Top ${topFive.length} states account for ${formatPercent(share)} of US-Mexico trade`,
        variant: 'neutral',
        icon: 'BarChart3',
      })
    }
  }

  return insights
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const generators = {
  overview: overviewInsights,
  'us-mexico': usMexicoInsights,
  'texas-mexico': texasMexicoInsights,
  mode: modeInsights,
  commodity: commodityInsights,
  state: stateInsights,
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate data-driven insights for a given dashboard scope.
 *
 * @param {Array<Object>} data       — the row-level dataset for the scope
 * @param {Object}        options
 * @param {string}        options.scope       — one of overview | us-mexico | texas-mexico | mode | commodity | state
 * @param {number|string} options.latestYear  — the most recent data year
 * @param {number}        [options.maxInsights=3] — max insights to return
 * @returns {Array<{text: string, variant: string, icon: string}>}
 */
export function generateInsights(data, { scope, latestYear, maxInsights = 3 }) {
  if (!data || !data.length || !scope) return []

  const generator = generators[scope]
  if (!generator) {
    console.warn(`[insightEngine] Unknown scope "${scope}"`)
    return []
  }

  const year = typeof latestYear === 'string' ? Number(latestYear) : latestYear

  return generator(data, year)
    .filter((insight) => insight && insight.text && !insight.text.includes('NaN') && !insight.text.includes('undefined'))
    .slice(0, maxInsights)
}
