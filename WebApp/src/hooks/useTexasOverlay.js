/**
 * useTexasOverlay — Shared hook for computing Texas-vs-national comparison data.
 *
 * Given a dataset with a State field and a value field, computes:
 *   - texasTotal: sum of the value field for Texas rows
 *   - nationalTotal: sum of the value field for all rows
 *   - texasShare: texasTotal / nationalTotal (0-1)
 *   - texasData: the filtered Texas-only rows
 *
 * Also exports the standard Texas color constant used across all charts.
 */
import { useMemo } from 'react'

/** Burnt orange — distinct from the chart palette, unmistakably "Texas". */
export const TEXAS_COLOR = '#bf5700'

/**
 * Compute Texas overlay data from a dataset that has a State column.
 * @param {Array} data - Full dataset (all states)
 * @param {string} valueField - 'TradeValue' or 'WeightLb'
 * @param {boolean} enabled - Whether the overlay is active
 * @param {string} [stateField='State'] - Column name for state
 */
export function useTexasOverlay(data, valueField, enabled, stateField = 'State') {
  return useMemo(() => {
    if (!enabled || !data?.length) {
      return { texasTotal: 0, nationalTotal: 0, texasShare: 0, texasData: [] }
    }
    let texasTotal = 0
    let nationalTotal = 0
    const texasData = []
    for (let i = 0; i < data.length; i++) {
      const d = data[i]
      const val = d[valueField] || 0
      nationalTotal += val
      if (d[stateField] === 'Texas') {
        texasTotal += val
        texasData.push(d)
      }
    }
    const texasShare = nationalTotal > 0 ? texasTotal / nationalTotal : 0
    return { texasTotal, nationalTotal, texasShare, texasData }
  }, [data, valueField, enabled, stateField])
}

/**
 * Check whether a port belongs to Texas, given the ports dataset.
 * Returns a Set of port names that are in Texas.
 */
export function useTexasPorts(portsData, enabled) {
  return useMemo(() => {
    if (!enabled || !portsData?.length) return new Set()
    const txPorts = new Set()
    portsData.forEach((d) => {
      if (d.State === 'Texas' && d.Port) txPorts.add(d.Port)
    })
    return txPorts
  }, [portsData, enabled])
}

/**
 * Format a Texas share value as a readable string.
 * @param {number} share - 0-1 decimal
 * @param {Function} fmtValue - formatter for the absolute value
 * @param {number} texasTotal - absolute Texas value
 */
export function formatTexasShare(share, fmtValue, texasTotal) {
  const pct = (share * 100).toFixed(1)
  return `Texas: ${fmtValue(texasTotal)} (${pct}% of U.S. total)`
}
