/**
 * Central Zustand store for BTS TransBorder freight data.
 * Loads pre-aggregated JSON datasets with lazy-loading per page.
 * Only usTransborder is loaded at app init; all others load on demand.
 */
import { create } from 'zustand'

const base = import.meta.env.BASE_URL

const DATASET_FILES = {
  usTransborder: 'us_transborder.json',
  usMexicoPorts: 'us_mexico_ports.json',
  usCanadaPorts: 'us_canada_ports.json',
  texasMexicoPorts: 'texas_mexico_ports.json',
  texasMexicoCommodities: 'texas_mexico_commodities.json',
  usStateTrade: 'us_state_trade.json',
  commodityDetail: 'commodity_detail.json',
  monthlyTrends: 'monthly_trends.json',
  mexicanStateTrade: 'mexican_state_trade.json',
  texasMexicanStateTrade: 'texas_mexican_state_trade.json',
  odStateFlows: 'od_state_flows.json',
  odCanadaProvFlows: 'od_canada_prov_flows.json',
  texasOdStateFlows: 'texas_od_state_flows.json',
}

const FETCH_TIMEOUT_MS = 30_000

const NUMERIC_FIELDS = ['TradeValue', 'Weight', 'WeightLb', 'FreightCharges', 'Year', 'Month', 'Lat', 'Lon']
const STRING_FIELDS = ['Port', 'State', 'Mode', 'CommodityGroup', 'Commodity', 'Country', 'TradeType', 'Region', 'HSCode', 'PortCode', 'StateCode', 'MexState', 'CanProv']

function normalizeRow(d) {
  const out = { ...d }
  for (const key of NUMERIC_FIELDS) {
    if (key in out) {
      const v = out[key]
      out[key] = v === null || v === '' ? null : +v
    }
  }
  for (const key of STRING_FIELDS) {
    if (typeof out[key] === 'string') {
      out[key] = out[key].trim() || null
    }
  }
  return out
}

/** Fetch with an AbortSignal and a timeout. Rejects on timeout with a user-friendly message. */
function fetchWithTimeout(url, signal) {
  const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS)
  const combined = AbortSignal.any([signal, timeout])
  return fetch(url, { signal: combined }).catch((err) => {
    if (err.name === 'TimeoutError') {
      throw new Error('Request timed out — the server took too long to respond. Please try again.')
    }
    throw err
  })
}

// Active AbortControllers keyed by dataset name (or '__init__' for init)
const abortControllers = {}

function getOrReplaceController(key) {
  if (abortControllers[key]) {
    abortControllers[key].abort()
  }
  const controller = new AbortController()
  abortControllers[key] = controller
  return controller
}

export const useTransborderStore = create((set, get) => ({
  // Data — usTransborder loaded at init, rest lazy
  usTransborder: [],
  usMexicoPorts: null,
  usCanadaPorts: null,
  texasMexicoPorts: null,
  texasMexicoCommodities: null,
  usStateTrade: null,
  commodityDetail: null,
  monthlyTrends: null,
  mexicanStateTrade: null,
  texasMexicanStateTrade: null,
  odStateFlows: null,
  odCanadaProvFlows: null,
  texasOdStateFlows: null,

  // Loading state
  loading: true,
  error: null,
  datasetLoading: {},
  datasetErrors: {},

  // Init — load only usTransborder (~0.2 MB)
  init: async () => {
    const controller = getOrReplaceController('__init__')
    set({ loading: true, error: null })
    try {
      const resp = await fetchWithTimeout(
        `${base}data/${DATASET_FILES.usTransborder}`,
        controller.signal,
      )
      if (!resp.ok) throw new Error(`Failed to load us_transborder.json: ${resp.status}`)
      const raw = await resp.json()
      const normalized = raw.map(normalizeRow)
      set({ usTransborder: normalized, loading: false })
    } catch (err) {
      if (err.name === 'AbortError') return // silently ignore cancelled requests
      console.error('Failed to load initial data:', err)
      set({ error: err.message, loading: false })
    }
  },

  // Lazy-load any dataset on demand
  loadDataset: async (name) => {
    // Guard: already loaded or already in-flight
    const state = get()
    if (state[name] !== null || state.datasetLoading[name]) return

    const controller = getOrReplaceController(name)

    // Use functional set() to avoid stale state when clearing prior error
    set((s) => {
      const nextErrors = { ...s.datasetErrors }
      delete nextErrors[name]
      return {
        datasetLoading: { ...s.datasetLoading, [name]: true },
        datasetErrors: nextErrors,
      }
    })

    try {
      const file = DATASET_FILES[name]
      if (!file) throw new Error(`Unknown dataset: ${name}`)
      const resp = await fetchWithTimeout(`${base}data/${file}`, controller.signal)
      if (!resp.ok) throw new Error(`Failed to load ${file}: ${resp.status}`)
      const raw = await resp.json()
      const normalized = raw.map(normalizeRow)

      // Functional set() reads fresh state — no stale-state race
      set((s) => {
        const nextErrors = { ...s.datasetErrors }
        delete nextErrors[name]
        return {
          [name]: normalized,
          datasetLoading: { ...s.datasetLoading, [name]: false },
          datasetErrors: nextErrors,
        }
      })
    } catch (err) {
      if (err.name === 'AbortError') return // silently ignore cancelled requests
      console.error(`Failed to load dataset ${name}:`, err)
      set((s) => ({
        datasetLoading: { ...s.datasetLoading, [name]: false },
        datasetErrors: { ...s.datasetErrors, [name]: err.message },
      }))
    }
  },
}))
