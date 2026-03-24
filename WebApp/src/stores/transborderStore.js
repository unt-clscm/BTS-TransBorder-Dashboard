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
  texasMexicoPorts: 'texas_mexico_ports.json',
  texasMexicoCommodities: 'texas_mexico_commodities.json',
  usStateTrade: 'us_state_trade.json',
  commodityDetail: 'commodity_detail.json',
  monthlyTrends: 'monthly_trends.json',
}

const NUMERIC_FIELDS = ['TradeValue', 'Weight', 'FreightCharges', 'Year', 'Month', 'Lat', 'Lon']
const STRING_FIELDS = ['Port', 'State', 'Mode', 'CommodityGroup', 'Commodity', 'Country', 'TradeType', 'Region', 'HSCode', 'PortCode', 'StateCode']

function normalizeRow(d) {
  for (const key of NUMERIC_FIELDS) {
    if (key in d) {
      const v = d[key]
      d[key] = v === null || v === '' ? null : +v
    }
  }
  for (const key of STRING_FIELDS) {
    if (typeof d[key] === 'string') {
      d[key] = d[key].trim() || null
    }
  }
  return d
}

export const useTransborderStore = create((set, get) => ({
  // Data — usTransborder loaded at init, rest lazy
  usTransborder: [],
  usMexicoPorts: null,
  texasMexicoPorts: null,
  texasMexicoCommodities: null,
  usStateTrade: null,
  commodityDetail: null,
  monthlyTrends: null,

  // Loading state
  loading: true,
  error: null,
  datasetLoading: {},
  datasetErrors: {},

  // Filter state
  filters: {
    year: [],
    country: '',
    tradeType: '',
    mode: [],
    state: [],
    commodityGroup: [],
    port: [],
    region: '',
  },

  setFilter: (key, value) => {
    set((s) => ({ filters: { ...s.filters, [key]: value } }))
  },

  setFilters: (updates) => {
    set((s) => ({ filters: { ...s.filters, ...updates } }))
  },

  resetFilters: () => {
    set({
      filters: {
        year: [], country: '', tradeType: '', mode: [],
        state: [], commodityGroup: [], port: [], region: '',
      },
    })
  },

  // Init — load only usTransborder (~0.2 MB)
  init: async () => {
    set({ loading: true, error: null })
    try {
      const resp = await fetch(`${base}data/${DATASET_FILES.usTransborder}`)
      if (!resp.ok) throw new Error(`Failed to load us_transborder.json: ${resp.status}`)
      const raw = await resp.json()
      raw.forEach(normalizeRow)
      set({ usTransborder: raw, loading: false })
    } catch (err) {
      console.error('Failed to load initial data:', err)
      set({ error: err.message, loading: false })
    }
  },

  // Lazy-load any dataset on demand
  loadDataset: async (name) => {
    const state = get()
    if (state[name] !== null || state.datasetLoading[name]) return
    const nextErrors = { ...state.datasetErrors }
    delete nextErrors[name]
    set({ datasetLoading: { ...state.datasetLoading, [name]: true }, datasetErrors: nextErrors })
    try {
      const file = DATASET_FILES[name]
      if (!file) throw new Error(`Unknown dataset: ${name}`)
      const resp = await fetch(`${base}data/${file}`)
      if (!resp.ok) throw new Error(`Failed to load ${file}: ${resp.status}`)
      const raw = await resp.json()
      raw.forEach(normalizeRow)
      const { datasetErrors, ...rest } = get()
      const nextErrors = { ...datasetErrors }
      delete nextErrors[name]
      set({
        [name]: raw,
        datasetLoading: { ...rest.datasetLoading, [name]: false },
        datasetErrors: nextErrors,
      })
    } catch (err) {
      console.error(`Failed to load dataset ${name}:`, err)
      set({
        datasetLoading: { ...get().datasetLoading, [name]: false },
        datasetErrors: { ...get().datasetErrors, [name]: err.message },
      })
    }
  },
}))
