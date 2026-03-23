/**
 * ── DOWNLOAD COLUMN MAPS ─────────────────────────────────────────────────
 *
 * Reusable column-rename maps for CSV downloads. Each map specifies which
 * data keys to include and what header name to use in the exported CSV.
 *
 * Usage: pass as `columns` in the downloadData spec:
 *   downloadData={{ summary: { data, filename, columns: DL.tradeTrend } }}
 *
 * When `columns` is provided, only the listed keys are exported (implicitly
 * excluding internal fields like `color`). When omitted, all keys export
 * as-is (backward compatible).
 */

/* ═══════════════════════════════════════════════════════════════════════════
   CHART-LEVEL COLUMN MAPS  (DL)
   ═══════════════════════════════════════════════════════════════════════════ */

export const DL = {
  /* ── Single-series trends { year, value } ──────────────────────────── */
  tradeTrend:       { year: 'Year', value: 'Trade Value ($)' },

  /* ── Multi-series trends { year, value, series } ──────────────────── */
  tradeTrendSeries: { year: 'Year', value: 'Trade Value ($)', series: 'Series' },

  /* ── Rankings / bar charts { label, value } ────────────────────────── */
  portRank:             { label: 'Port', value: 'Trade Value ($)' },
  stateRank:            { label: 'State', value: 'Trade Value ($)' },
  modeRank:             { label: 'Mode', value: 'Trade Value ($)' },
  commodityRank:        { label: 'Commodity', value: 'Trade Value ($)' },
  commodityGroupRank:   { label: 'Commodity Group', value: 'Trade Value ($)' },

  /* ── Shares ────────────────────────────────────────────────────────── */
  modeShare:        { label: 'Mode', value: 'Share (%)' },
  countryShare:     { label: 'Country', value: 'Trade Value ($)' },

  /* ── Detail tables ─────────────────────────────────────────────────── */
  portDetail: {
    Port: 'Port', State: 'State',
    Total: 'Total ($)', Exports: 'Exports ($)', Imports: 'Imports ($)',
  },
  stateDetail: {
    State: 'State',
    Total: 'Total ($)', Exports: 'Exports ($)', Imports: 'Imports ($)',
  },
  modeDetail: {
    Mode: 'Mode',
    Total: 'Total ($)', Exports: 'Exports ($)', Imports: 'Imports ($)', Share: 'Share (%)',
  },
  commodityDetail: {
    CommodityGroup: 'Commodity Group', Commodity: 'Commodity', HSCode: 'HS Code',
    Total: 'Total ($)', Exports: 'Exports ($)', Imports: 'Imports ($)',
  },
  monthlyDetail: {
    Year: 'Year', Month: 'Month',
    Total: 'Total ($)', Exports: 'Exports ($)', Imports: 'Imports ($)',
  },

  /* ── Balance charts ────────────────────────────────────────────────── */
  balanceByMode: { label: 'Mode', Exports: 'Exports ($)', Imports: 'Imports ($)' },
}


/* ═══════════════════════════════════════════════════════════════════════════
   PAGE-LEVEL DOWNLOAD COLUMN MAPS
   ═══════════════════════════════════════════════════════════════════════════ */

/** US–Mexico TransBorder overview (usTransborder rows) */
export const PAGE_TRANSBORDER_COLS = {
  Year:       'Year',
  Country:    'Country',
  Mode:       'Mode',
  TradeType:  'Trade Type',
  TradeValue: 'Trade Value ($)',
  Weight:     'Weight',
}

/** Port-level data (usMexicoPorts / texasMexicoPorts rows) */
export const PAGE_PORT_COLS = {
  Year:           'Year',
  PortCode:       'Port Code',
  Port:           'Port',
  StateCode:      'State Code',
  State:          'State',
  Mode:           'Mode',
  TradeType:      'Trade Type',
  TradeValue:     'Trade Value ($)',
  Weight:         'Weight',
  FreightCharges: 'Freight Charges ($)',
  Region:         'Region',
  Lat:            'Latitude',
  Lon:            'Longitude',
}

/** Commodity-level data (texasMexicoCommodities / commodityDetail rows) */
export const PAGE_COMMODITY_COLS = {
  Year:           'Year',
  PortCode:       'Port Code',
  Port:           'Port',
  Country:        'Country',
  HSCode:         'HS Code',
  Commodity:      'Commodity',
  CommodityGroup: 'Commodity Group',
  Mode:           'Mode',
  TradeType:      'Trade Type',
  TradeValue:     'Trade Value ($)',
  Weight:         'Weight',
}

/** State-level trade data (usStateTrade rows) */
export const PAGE_STATE_COLS = {
  Year:       'Year',
  StateCode:  'State Code',
  State:      'State',
  Country:    'Country',
  Mode:       'Mode',
  TradeType:  'Trade Type',
  TradeValue: 'Trade Value ($)',
}

/** Monthly trends data (monthlyTrends rows) */
export const PAGE_MONTHLY_COLS = {
  Year:       'Year',
  Month:      'Month',
  Country:    'Country',
  Mode:       'Mode',
  TradeType:  'Trade Type',
  TradeValue: 'Trade Value ($)',
}
