/**
 * portUtils.js — Port data helpers for the TransBorder freight dashboard.
 *
 * Static lookups, region mappings, and the El Paso / Ysleta combination logic.
 */

// ---------------------------------------------------------------------------
// Mexican crossing lookup  (US port name -> Mexican counterpart + coords)
// ---------------------------------------------------------------------------

export const MEXICAN_CROSSINGS = {
  'Laredo':              { name: 'Nuevo Laredo',              lat: 27.4767, lon: -99.5075 },
  'El Paso':             { name: 'Ciudad Juarez',             lat: 31.6904, lon: -106.4245 },
  'Hidalgo/Pharr':       { name: 'Reynosa',                   lat: 26.0508, lon: -98.2279 },
  'Brownsville':         { name: 'Matamoros',                  lat: 25.8796, lon: -97.5044 },
  'Eagle Pass':          { name: 'Piedras Negras',             lat: 28.7000, lon: -100.5236 },
  'Del Rio':             { name: 'Ciudad Acuna',               lat: 29.3236, lon: -100.9317 },
  'Presidio':            { name: 'Ojinaga',                    lat: 29.5603, lon: -104.4083 },
  'Nogales':             { name: 'Nogales, Son.',              lat: 31.3024, lon: -110.9559 },
  'San Ysidro':          { name: 'Tijuana',                    lat: 32.5347, lon: -117.0234 },
  'Otay Mesa':           { name: 'Tijuana (Otay)',             lat: 32.5536, lon: -116.9390 },
  'Calexico':            { name: 'Mexicali',                   lat: 32.6633, lon: -115.4989 },
  'Ysleta':              { name: 'Ciudad Juarez (Ysleta)',     lat: 31.6700, lon: -106.3000 },
  'Roma':                { name: 'Ciudad Miguel Aleman',       lat: 26.4050, lon: -99.0200 },
  'Rio Grande City':     { name: 'Camargo',                    lat: 26.3333, lon: -98.8333 },
  'Progreso':            { name: 'Nuevo Progreso',             lat: 26.0600, lon: -97.9600 },
  'Los Indios':          { name: 'Lucio Blanco',               lat: 26.0500, lon: -97.7400 },
  'Falcon Dam':          { name: 'Presa Falcon',               lat: 26.5600, lon: -99.1400 },
  'Fabens':              { name: 'Caseta',                     lat: 31.5100, lon: -106.1600 },
  'Santa Teresa':        { name: 'San Jeronimo',               lat: 31.8619, lon: -106.6389 },
  'Anzalduas':           { name: 'Reynosa (Anzalduas)',        lat: 26.1400, lon: -98.3200 },
  'Donna':               { name: 'Rio Bravo',                  lat: 26.1700, lon: -98.0500 },
  'World Trade Bridge':  { name: 'Nuevo Laredo (WTB)',         lat: 27.5000, lon: -99.5400 },
  'Colombia':            { name: 'Colombia, NL',               lat: 27.7200, lon: -99.8100 },
  'Tornillo-Guadalupe':  { name: 'El Porvenir',                lat: 31.4400, lon: -105.9900 },
};

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
 * Return the Mexican crossing info for a US port name, or null.
 * @param {string} portName
 * @returns {{ name: string, lat: number, lon: number } | null}
 */
export function getMexicanCrossing(portName) {
  return MEXICAN_CROSSINGS[portName] ?? null;
}

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
