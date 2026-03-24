/**
 * portUtils.js — Port data helpers for the TransBorder freight dashboard.
 *
 * Static lookups, region mappings, and the El Paso / Ysleta combination logic.
 */

// ---------------------------------------------------------------------------
// El Paso / Ysleta split constants
// ---------------------------------------------------------------------------

/** Year BTS began reporting Ysleta separately from El Paso. */
export const YSLETA_SPLIT_YEAR = 2021;

/** Month (1-indexed) the split took effect. */
export const YSLETA_SPLIT_MONTH = 3;

// ---------------------------------------------------------------------------
// TxDOT district mapping  (13 TX border ports -> 3 districts)
// ---------------------------------------------------------------------------

export const PORT_REGION_MAP = {
  'El Paso':            'El Paso',
  'Ysleta':             'El Paso',
  'Fabens':             'El Paso',
  'Presidio':           'El Paso',
  'Tornillo-Guadalupe': 'El Paso',
  'Laredo':             'Laredo',
  'World Trade Bridge': 'Laredo',
  'Colombia':           'Laredo',
  'Eagle Pass':         'Laredo',
  'Del Rio':            'Laredo',
  'Falcon Dam':         'Laredo',
  'Hidalgo/Pharr':      'Pharr',
  'Brownsville':        'Pharr',
  'Progreso':           'Pharr',
  'Rio Grande City':    'Pharr',
  'Roma':               'Pharr',
  'Los Indios':         'Pharr',
  'Anzalduas':          'Pharr',
  'Donna':              'Pharr',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Combine El Paso (2402) and Ysleta (2401) records into a single
 * "El Paso + Ysleta" entry by summing TradeValue, Weight, and
 * FreightCharges.  Non-numeric fields are taken from the El Paso record
 * (or whichever is present).
 *
 * When `combined` is false the data is returned unchanged.
 *
 * @param {Array<Object>} data  — array of record objects
 * @param {boolean} [combined=true]
 * @returns {Array<Object>} — new array (original is not mutated)
 */
export function combineElPasoYsleta(data, combined = true) {
  if (!combined) return data;

  // Group key: everything that identifies a unique row *except* the port.
  const keyOf = (d) =>
    `${d.Year}|${d.Month}|${d.Country}|${d.Mode}|${d.TradeType}|${d.HSCode}|${d.State}`;

  const EP_CODE = 2402;
  const YS_CODE = 2401;
  const COMBINED_NAME = 'El Paso + Ysleta';

  // Separate into three buckets.
  const elPasoMap = new Map();   // key -> record
  const ysletaMap = new Map();   // key -> record
  const others = [];

  for (const d of data) {
    const code = Number(d.PortCode);
    if (code === EP_CODE) {
      elPasoMap.set(keyOf(d), d);
    } else if (code === YS_CODE) {
      ysletaMap.set(keyOf(d), d);
    } else {
      others.push(d);
    }
  }

  // Merge: iterate all keys from both maps.
  const allKeys = new Set([...elPasoMap.keys(), ...ysletaMap.keys()]);
  const merged = [];

  for (const key of allKeys) {
    const ep = elPasoMap.get(key);
    const ys = ysletaMap.get(key);
    const base = ep ?? ys;

    merged.push({
      ...base,
      Port: COMBINED_NAME,
      PortCode: EP_CODE,
      TradeValue:     (Number(ep?.TradeValue ?? 0))     + (Number(ys?.TradeValue ?? 0)),
      Weight:         (Number(ep?.Weight ?? 0))         + (Number(ys?.Weight ?? 0)),
      FreightCharges: (Number(ep?.FreightCharges ?? 0)) + (Number(ys?.FreightCharges ?? 0)),
    });
  }

  return [...others, ...merged];
}
