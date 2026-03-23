/**
 * transborderHelpers.js — Domain predicates, formatters, and filter helpers
 * for the TransBorder freight dashboard.
 */

// ---------------------------------------------------------------------------
// Texas FIPS codes (strings as they appear in the data)
// ---------------------------------------------------------------------------

const TX_STATE_CODES = new Set(['48', 48]);
const TX_STATE_NAMES = new Set(['Texas', 'TX']);

// ---------------------------------------------------------------------------
// Domain predicates
// ---------------------------------------------------------------------------

/**
 * True when a record involves Texas-Mexico trade.
 * Checks Country === 'Mexico' AND the state is Texas (by name or FIPS code).
 */
export function isTexasMexico(d) {
  if (!d || d.Country !== 'Mexico') return false;
  return TX_STATE_NAMES.has(d.State) || TX_STATE_CODES.has(d.StateCode);
}

/**
 * True when a record involves US-Mexico trade (any state).
 */
export function isUSMexico(d) {
  return d?.Country === 'Mexico';
}

// ---------------------------------------------------------------------------
// Number formatters
// ---------------------------------------------------------------------------

const BILLION  = 1e9;
const MILLION  = 1e6;
const THOUSAND = 1e3;

/**
 * Format a number compactly: 1.5B, 250M, 12.3K, or plain.
 * @param {number} value
 * @returns {string}
 */
export function formatCompact(value) {
  if (value == null || isNaN(value)) return '—';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= BILLION)  return `${sign}${(abs / BILLION).toFixed(1)}B`;
  if (abs >= MILLION)  return `${sign}${(abs / MILLION).toFixed(1)}M`;
  if (abs >= THOUSAND) return `${sign}${(abs / THOUSAND).toFixed(1)}K`;
  return `${sign}${Math.round(abs)}`;
}

/**
 * Format a trade value as currency: "$1.5B", "$250.0M", "$12.3K".
 */
export function formatCurrency(value) {
  if (value == null || isNaN(value)) return '—';
  return `$${formatCompact(Math.abs(value))}`;
}

/**
 * Format a weight value as metric tons: "1.5M tons", "250.0K tons".
 */
export function formatWeight(value) {
  if (value == null || isNaN(value)) return '—';
  return `${formatCompact(value)} tons`;
}

/**
 * Locale-aware number with commas (e.g. 1,234,567).
 */
export function formatNumber(value) {
  if (value == null || isNaN(value)) return '—';
  return Number(value).toLocaleString('en-US');
}

/**
 * Decimal to percentage string: 0.125 -> "12.5%".
 */
export function formatPercent(value) {
  if (value == null || isNaN(value)) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Returns a D3-compatible axis tick formatter function.
 *
 * The formatter picks a compact suffix based on `maxValue` and applies
 * an optional prefix/suffix (e.g. "$" / " tons").
 *
 * @param {number} maxValue  — largest value on the axis (determines scale)
 * @param {string} [prefix='']
 * @param {string} [suffix='']
 * @returns {(d: number) => string}
 */
export function getAxisFormatter(maxValue, prefix = '', suffix = '') {
  let divisor = 1;
  let tag = '';

  if (maxValue >= BILLION) {
    divisor = BILLION;
    tag = 'B';
  } else if (maxValue >= MILLION) {
    divisor = MILLION;
    tag = 'M';
  } else if (maxValue >= THOUSAND) {
    divisor = THOUSAND;
    tag = 'K';
  }

  return (d) => {
    const scaled = d / divisor;
    // Use integer display when the scaled value is whole.
    const formatted = scaled === Math.floor(scaled)
      ? scaled.toFixed(0)
      : scaled.toFixed(1);
    return `${prefix}${formatted}${tag}${suffix}`;
  };
}

// ---------------------------------------------------------------------------
// Filter helpers
// ---------------------------------------------------------------------------

/**
 * Test whether a record's field value is included in a filter array/string.
 * Returns true (pass) when the filter is empty/null/undefined.
 */
function matchesFilter(recordValue, filterValue) {
  if (filterValue == null) return true;
  if (Array.isArray(filterValue)) {
    return filterValue.length === 0 || filterValue.includes(recordValue);
  }
  if (typeof filterValue === 'string') {
    return filterValue === '' || filterValue === recordValue;
  }
  return true;
}

/**
 * Apply the standard filter object from the Svelte store to a dataset array.
 *
 * Recognised filter keys and their expected shapes:
 *   year            — number[]
 *   country         — string
 *   tradeType       — string
 *   mode            — (string | number)[]
 *   state           — string[]
 *   commodityGroup  — string[]
 *   port            — string[]
 *   region          — string
 *
 * @param {Array<Object>} data
 * @param {Object} filters
 * @returns {Array<Object>}
 */
export function applyFilters(data, filters) {
  if (!filters || !data) return data ?? [];
  return data.filter((d) => {
    if (!matchesFilter(d.Year,           filters.year))           return false;
    if (!matchesFilter(d.Country,        filters.country))        return false;
    if (!matchesFilter(d.TradeType,      filters.tradeType))      return false;
    if (!matchesFilter(d.Mode,           filters.mode))           return false;
    if (!matchesFilter(d.State,          filters.state))          return false;
    if (!matchesFilter(d.CommodityGroup, filters.commodityGroup)) return false;
    if (!matchesFilter(d.Port,           filters.port))           return false;
    if (!matchesFilter(d.Region,         filters.region))         return false;
    return true;
  });
}

/**
 * Same as `applyFilters` but skips the year filter — useful for trend/time
 * series charts that need the full temporal range.
 */
export function applyFiltersNoYear(data, filters) {
  if (!filters || !data) return data ?? [];
  const withoutYear = { ...filters, year: null };
  return applyFilters(data, withoutYear);
}

/**
 * Extract unique, sorted values for each requested key from a data array.
 *
 * @param {Array<Object>} data
 * @param {string[]} keys — column names to extract (e.g. ['Year', 'Mode'])
 * @returns {Object<string, Array>} — { Year: [2007, 2008, ...], Mode: ['Rail', 'Truck', ...] }
 */
export function buildFilterOptions(data, keys) {
  if (!data || !keys) return {};

  const sets = {};
  for (const key of keys) {
    sets[key] = new Set();
  }

  for (const d of data) {
    for (const key of keys) {
      const v = d[key];
      if (v != null && v !== '') sets[key].add(v);
    }
  }

  const result = {};
  for (const key of keys) {
    const arr = [...sets[key]];
    // Numbers sort numerically; strings sort alphabetically.
    arr.sort((a, b) =>
      typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b)),
    );
    result[key] = arr;
  }

  return result;
}
