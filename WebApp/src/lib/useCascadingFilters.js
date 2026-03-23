/**
 * useCascadingFilters.js — Cross-filter hook for interdependent dropdowns
 * -----------------------------------------------------------------------
 * For each filter key, computes a "pool" = baseData filtered by ALL other
 * active filters EXCEPT that key.  Dropdown options derived from pools
 * automatically narrow to only contextually valid values.
 *
 * Also auto-prunes selected filter values that become invalid when other
 * filters change (e.g. selecting Year=2024 removes a carrier that only
 * flew in 2023).
 */
import { useMemo, useEffect, useRef } from 'react'

/**
 * @param {Array}    baseData         Page-level base dataset (after page predicate)
 * @param {Function} buildApplicators (filters) => { key: (data) => filteredData }
 *                                    Each applicator applies ONE filter; must be
 *                                    a stable reference (module-level function).
 * @param {Object}   extractors       { key: (row) => string } — extracts the
 *                                    comparable value for each filter key.
 *                                    Must be a stable reference (module-level object).
 * @param {Object}   filters          Current filter state from the store
 * @param {Function} setFilters       Batch filter update (store.setFilters)
 * @returns {Object} pools            { key: filteredData[] }
 */
export function useCascadingFilters(baseData, buildApplicators, extractors, filters, setFilters) {
  const pools = useMemo(() => {
    const applicators = buildApplicators(filters)
    const keys = Object.keys(applicators)
    const result = {}
    for (const excludeKey of keys) {
      let data = baseData
      for (const key of keys) {
        if (key === excludeKey) continue
        data = applicators[key](data)
      }
      result[excludeKey] = data
    }
    return result
  }, [baseData, filters, buildApplicators])

  // Stable ref — extractors are defined at module level and never change
  const extractorsRef = useRef(extractors)

  // Auto-prune stale filter values in a single batched update
  useEffect(() => {
    const exts = extractorsRef.current
    const updates = {}
    for (const [key, extractor] of Object.entries(exts)) {
      const selected = filters[key]
      if (!Array.isArray(selected) || !selected.length) continue
      if (!pools[key]) continue
      const validSet = new Set(pools[key].map(extractor).filter(Boolean))
      const pruned = selected.filter((v) => validSet.has(v))
      if (pruned.length !== selected.length) {
        updates[key] = pruned
      }
    }
    if (Object.keys(updates).length) {
      setFilters(updates)
    }
  }, [pools, filters, setFilters])

  return pools
}
