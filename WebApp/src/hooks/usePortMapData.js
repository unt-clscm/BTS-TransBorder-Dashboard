/**
 * usePortMapData.js — Shared hook + helper for PortMap integration across pages.
 *
 * Handles fetching port coordinate files and building the markers array
 * that PortMap expects.
 */
import { useState, useEffect } from 'react'

/**
 * Fetch a coordinate JSON file once and cache in state.
 * @param {string} filename — e.g. 'port_coordinates.json' or 'canadian_port_coordinates.json'
 * @returns {{ portCoords: Object|null, portCoordsError: string|null }}
 */
function useCoordFile(filename) {
  const [portCoords, setPortCoords] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/${filename}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setPortCoords)
      .catch((err) => {
        console.error(`Failed to load ${filename}:`, err)
        setError(err.message || 'Unknown error')
        setPortCoords({})
      })
  }, [filename])

  return { portCoords, portCoordsError: error }
}

/**
 * Fetch US-Mexico port coordinates (port_coordinates.json).
 */
export function usePortCoordinates() {
  return useCoordFile('port_coordinates.json')
}

/**
 * Fetch US-Canada port coordinates (canadian_port_coordinates.json).
 */
export function useCanadianPortCoordinates() {
  return useCoordFile('canadian_port_coordinates.json')
}

/**
 * Aggregate filtered port rows into the shape PortMap expects:
 *   [{ name, lat, lng, value, portCode, group }]
 *
 * @param {Array} filteredPorts — rows from usMexicoPorts or usCanadaPorts (already filtered)
 * @param {Object|null} portCoords — { portCode: { lat, lon } }
 * @param {string} [group] — optional group label (e.g. 'mexico', 'canada', 'texas')
 * @returns {Array}
 */
export function buildMapPorts(filteredPorts, portCoords, group) {
  if (!portCoords || !filteredPorts?.length) return []
  const byPort = new Map()
  for (const d of filteredPorts) {
    if (!d.Port) continue
    const code = d.PortCode?.replace(/\D/g, '')
    if (!byPort.has(d.Port)) {
      const coords = portCoords[code]
      byPort.set(d.Port, {
        name: d.Port,
        lat: coords?.lat ?? null,
        lng: coords?.lon ?? null,
        value: 0,
        portCode: d.PortCode,
        group: group || undefined,
      })
    }
    byPort.get(d.Port).value += d.TradeValue || 0
  }
  return Array.from(byPort.values()).filter((p) => p.lat != null)
}
