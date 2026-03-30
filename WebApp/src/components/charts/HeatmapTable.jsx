/**
 * HeatmapTable — Color-intensity grid table for O-D matrices.
 *
 * Renders an HTML table where cell background color intensity is proportional
 * to the cell value. Used for origin-destination matrices (e.g., border
 * airport ↔ Mexico airport passenger/freight flows).
 *
 * Features:
 * - Crosshair hover: highlights the entire row + column with amber borders
 * - Cell pop: hovered cell gets an elevated shadow and amber outline
 * - Sticky header: column headers stay visible during vertical scroll
 * - Sticky first column: row labels stay visible during horizontal scroll
 *
 * PROPS
 * @param {Object} data
 *   { rowLabels: string[], colLabels: string[], cells: number[][] }
 *   cells[r][c] is the value at row r, column c
 *
 * @param {Function} [formatValue] — formatter for cell values
 * @param {Map} [airportIndex] — IATA → {name, lat, lng} lookup for tooltips
 */
import React, { useMemo, useState, useRef, useCallback } from 'react'
import { formatCompact as fmtCompact } from '@/lib/chartColors'

/* Shared opaque background for sticky cells (must not be transparent) */
const STICKY_BG = 'var(--color-surface-primary, #ffffff)'
const BRAND_BLUE = '0, 86, 169' /* rgb components for brand-blue */

/* Crosshair uses warm amber/gold — contrasts clearly with blue heatmap */
const HL_COLOR = '232, 185, 35'           /* rgb components for #E8B923 */
const HL_BORDER = `rgba(${HL_COLOR}, 0.6)` /* visible border lines */
const HL_BG     = `rgba(${HL_COLOR}, 0.10)` /* subtle warm tint on empty cells */
const HL_HEADER = `rgba(${HL_COLOR}, 0.18)` /* header cell highlight */

function HeatmapTableInner({
  data = { rowLabels: [], colLabels: [], cells: [] },
  formatValue = fmtCompact,
  airportIndex,
  highlightRow = null,  // Row label to highlight
  highlightColor = '#bf5700',
}) {
  const { rowLabels, colLabels, cells } = data
  const [hovered, setHovered] = useState(null) // { ri, ci } or null
  const containerRef = useRef(null)
  const [tooltip, setTooltip] = useState(null) // { x, y, rowCode, colCode, value, below }

  /** Look up full airport name from airportIndex, fall back to code */
  const airportName = useCallback(
    (code) => airportIndex?.get(code)?.name || code,
    [airportIndex],
  )

  const maxVal = useMemo(() => {
    let max = 0
    cells.forEach((row) => row.forEach((v) => { if (v > max) max = v }))
    return max
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  }, [cells])

  if (!rowLabels.length || !colLabels.length) {
    return <p className="text-base text-text-secondary italic py-4 text-center">No border airport routes found for current filters.</p>
  }

  const getCellBg = (v) => {
    if (!v || !maxVal) return 'transparent'
    const intensity = Math.min(1, v / maxVal)
    const alpha = 0.08 + intensity * 0.72
    return `rgba(${BRAND_BLUE}, ${alpha})`
  }

  const getTextColor = (v) => {
    if (!v || !maxVal) return 'inherit'
    const intensity = Math.min(1, v / maxVal)
    return intensity > 0.45 ? 'white' : 'inherit'
  }

  /**
   * Build box-shadow for crosshair border lines on data cells.
   * Row cells get top+bottom amber lines; column cells get left+right.
   * The hovered cell gets all four sides (full border).
   */
  const getCrosshairShadow = (ri, ci) => {
    if (!hovered) return undefined
    const isRow = hovered.ri === ri
    const isCol = hovered.ci === ci
    const isCell = isRow && isCol
    if (isCell) return undefined // hovered cell uses outline instead
    const shadows = []
    if (isRow) {
      shadows.push(`inset 0 2px 0 ${HL_BORDER}`)  // top
      shadows.push(`inset 0 -2px 0 ${HL_BORDER}`) // bottom
    }
    if (isCol) {
      shadows.push(`inset 2px 0 0 ${HL_BORDER}`)  // left
      shadows.push(`inset -2px 0 0 ${HL_BORDER}`) // right
    }
    return shadows.length ? shadows.join(', ') : undefined
  }

  return (
    <div
      ref={containerRef}
      className="overflow-auto max-h-[70vh]"
      style={{ position: 'relative' }}
      onMouseLeave={() => { setHovered(null); setTooltip(null) }}
    >
      <table className="border-collapse text-base" role="table" aria-label="Heatmap table showing origin-destination flow intensity" style={{ position: 'relative' }}>
        {/* ── Header row (sticky top) ── */}
        <thead>
          <tr>
            {/* Corner cell: sticky in BOTH axes */}
            <th
              className="px-3 py-2 text-left font-semibold text-text-secondary border-b border-border whitespace-nowrap"
              style={{
                position: 'sticky',
                top: 0,
                left: 0,
                zIndex: 30,
                backgroundColor: STICKY_BG,
              }}
            >
              TX Airport
            </th>
            {colLabels.map((col, ci) => {
              const isColHL = hovered?.ci === ci
              return (
                <th
                  key={col}
                  className="px-3 py-2 text-center font-semibold border-b border-border whitespace-nowrap"
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                    backgroundColor: isColHL ? HL_HEADER : STICKY_BG,
                    color: isColHL ? '#8B6914' : 'var(--color-text-secondary)',
                    fontWeight: isColHL ? 700 : undefined,
                    transition: 'background-color 0.15s, color 0.15s',
                    boxShadow: isColHL
                      ? `inset 2px 0 0 ${HL_BORDER}, inset -2px 0 0 ${HL_BORDER}, inset 0 -2px 0 ${HL_BORDER}`
                      : undefined,
                  }}
                  title={airportIndex?.get(col)?.name || col}
                >
                  {col}
                </th>
              )
            })}
          </tr>
        </thead>

        {/* ── Data rows ── */}
        <tbody>
          {rowLabels.map((row, ri) => {
            const isRowHL = hovered?.ri === ri
            const isTXRow = highlightRow && row === highlightRow
            return (
              <tr key={row}>
                {/* Row header: sticky left */}
                <td
                  className="px-3 py-2 font-medium border-b border-border whitespace-nowrap"
                  style={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 10,
                    backgroundColor: isRowHL ? HL_HEADER : isTXRow ? `${highlightColor}15` : STICKY_BG,
                    color: isRowHL ? '#8B6914' : isTXRow ? highlightColor : 'var(--color-text-primary)',
                    fontWeight: isRowHL || isTXRow ? 700 : undefined,
                    transition: 'background-color 0.15s, color 0.15s',
                    boxShadow: isRowHL
                      ? `inset 0 2px 0 ${HL_BORDER}, inset 0 -2px 0 ${HL_BORDER}, inset -2px 0 0 ${HL_BORDER}`
                      : undefined,
                  }}
                  title={airportIndex?.get(row)?.name || row}
                >
                  {row}
                </td>

                {colLabels.map((col, ci) => {
                  const v = cells[ri]?.[ci] || 0
                  const isThisCell = hovered?.ri === ri && hovered?.ci === ci
                  const inCrosshair = isRowHL || hovered?.ci === ci
                  const crosshairShadow = getCrosshairShadow(ri, ci)

                  /* Cell background: heatmap color, crosshair tint, or transparent */
                  let bg
                  if (v > 0) {
                    bg = getCellBg(v)
                  } else if (inCrosshair) {
                    bg = HL_BG
                  }

                  return (
                    <td
                      key={col}
                      className="px-3 py-2 text-center border-b border-border font-medium whitespace-nowrap"
                      style={{
                        backgroundColor: bg,
                        color: v > 0 ? getTextColor(v) : undefined,
                        transition: 'background-color 0.15s, box-shadow 0.15s, transform 0.15s',
                        position: 'relative',
                        boxShadow: crosshairShadow,
                        /* Pop effect on the hovered cell */
                        ...(isThisCell && v > 0
                          ? {
                              zIndex: 15,
                              boxShadow: `0 4px 16px rgba(0,0,0,0.2)`,
                              outline: `2.5px solid rgb(${HL_COLOR})`,
                              outlineOffset: '-1px',
                              borderRadius: '3px',
                              transform: 'scale(1.08)',
                            }
                          : {}),
                        /* Outline for hovered empty cell */
                        ...(isThisCell && v === 0
                          ? {
                              zIndex: 15,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              outline: `2px solid rgba(${HL_COLOR}, 0.5)`,
                              outlineOffset: '-1px',
                              borderRadius: '3px',
                            }
                          : {}),
                      }}
                      onMouseEnter={(e) => {
                        setHovered({ ri, ci })
                        if (!containerRef.current) return
                        const cellRect = e.currentTarget.getBoundingClientRect()
                        const boxRect = containerRef.current.getBoundingClientRect()
                        const x = cellRect.left - boxRect.left + cellRect.width / 2 + containerRef.current.scrollLeft
                        const yAbove = cellRect.top - boxRect.top + containerRef.current.scrollTop
                        const spaceAbove = cellRect.top - boxRect.top
                        const below = spaceAbove < 60 // flip below if near top
                        const y = below
                          ? yAbove + cellRect.height + 8
                          : yAbove - 8
                        setTooltip({ x, y, rowCode: row, colCode: col, value: v, below })
                      }}
                    >
                      {v > 0 ? formatValue(v) : <span className="text-text-secondary/40">&ndash;</span>}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* ── Custom floating tooltip ── */}
      {tooltip && airportIndex && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            transform: tooltip.below
              ? 'translateX(-50%)'            // below: top-left anchor
              : 'translate(-50%, -100%)',     // above: bottom-center anchor
            zIndex: 50,
            pointerEvents: 'none',
          }}
        >
          <div
            role="tooltip"
            className="rounded-lg shadow-lg border border-border-light text-base leading-snug"
            style={{
              background: 'rgba(255,255,255,0.97)',
              padding: '8px 12px',
              maxWidth: 360,
            }}
          >
            <div className="font-semibold text-text-primary">
              {airportName(tooltip.rowCode)}{' '}
              <span className="text-text-secondary font-normal">({tooltip.rowCode})</span>
              <span className="mx-1 text-text-secondary">&harr;</span>
              {airportName(tooltip.colCode)}{' '}
              <span className="text-text-secondary font-normal">({tooltip.colCode})</span>
            </div>
            {tooltip.value > 0 && (
              <div className="text-brand-blue font-bold mt-0.5">
                {formatValue(tooltip.value)}
              </div>
            )}
            {tooltip.value === 0 && (
              <div className="text-text-secondary italic mt-0.5">No service</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default React.memo(HeatmapTableInner)
