/**
 * DataTable.jsx — Sortable, paginated data table (data-agnostic)
 * ---------------------------------------------------------------
 * A generic table component that supports:
 *   - Click-to-sort on any column (ascending / descending toggle)
 *   - Pagination with Prev/Next controls and a "Showing X-Y of Z" indicator
 *   - Dynamic page size in fullscreen mode: a ResizeObserver measures the
 *     available container height and calculates how many rows fit, so the
 *     table fills the viewport without scrolling
 *   - Alternating row backgrounds and hover highlights
 *
 * Column Definition
 *   Columns are defined by the parent via the `columns` prop — an array of:
 *     { key: string, label: string, render?, wrap?, minWidth? }
 *   - `key`      — Property name on each data row object
 *   - `label`    — Display text for the column header
 *   - `render`   — Optional custom render function for the cell content;
 *                  receives the cell value and the full row object.
 *                  If omitted, the raw cell value is displayed as-is.
 *   - `wrap`     — If true, cell text is allowed to wrap (whitespace-normal)
 *                  instead of forcing a single line.  Use for long-text
 *                  columns (airport names, carrier names) to avoid
 *                  horizontal scrolling.
 *   - `minWidth` — Minimum column width in px when `wrap` is true (default 140).
 *
 * Props
 *   @param {Array<{ key: string, label: string, render?: Function }>} columns — Column definitions
 *   @param {object[]}  data                — Array of row objects to display
 *   @param {number}   [pageSize]           — Fixed page size (overrides dynamic sizing)
 *
 * Fullscreen Detection
 *   The component checks whether it is inside a `.fullscreen-chart-area` ancestor
 *   (rendered by FullscreenChart). If so, it switches to dynamic page sizing via
 *   ResizeObserver; otherwise it uses the default of 10 rows per page.
 *
 * BOILERPLATE NOTE:
 *   This component is fully data-agnostic. No changes are needed when adapting
 *   this boilerplate for a new project or dataset. Simply pass different `columns`
 *   and `data` from the parent.
 */
import { useState, useMemo, useRef, useCallback, useLayoutEffect } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

const DEFAULT_PAGE_SIZE = 10
const HEADER_HEIGHT = 45   // thead row height (px)
const ROW_HEIGHT = 41      // tbody row height (px) — single-line rows
const WRAP_ROW_HEIGHT = 72 // tbody row height (px) — multi-line wrapped rows
const FOOTER_HEIGHT = 49   // pagination bar height (px)

export default function DataTable({ columns, data, pageSize: fixedPageSize }) {
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(0)
  const [dynamicPageSize, setDynamicPageSize] = useState(fixedPageSize || DEFAULT_PAGE_SIZE)
  const [colWidths, setColWidths] = useState(null)
  const [nowrapWidths, setNowrapWidths] = useState(null) // non-wrap header widths for wrap-mode tables
  const rootRef = useRef(null)
  const measureRef = useRef(null)
  const nowrapMeasureRef = useRef(null)

  const hasWrapCols = columns.some(c => c.wrap)
  const effectiveRowHeight = hasWrapCols ? WRAP_ROW_HEIGHT : ROW_HEIGHT

  // In fullscreen, fit as many rows as the viewport allows (using the
  // fullscreen overlay's height, not the table's own auto-height).
  // In normal mode use a sensible default page size.
  const recalcPageSize = useCallback(() => {
    if (fixedPageSize) return
    const el = rootRef.current
    if (!el) return

    const fsArea = el.closest('.fullscreen-chart-area')
    if (!fsArea) {
      setDynamicPageSize(DEFAULT_PAGE_SIZE)
      return
    }

    // Subtract the fullscreen area's padding so we only count usable space
    const style = getComputedStyle(fsArea)
    const padY = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0)
    const available = fsArea.clientHeight - padY
    if (available <= 0) return
    // 2 extra px for the DataTable's own top+bottom border
    const bodySpace = available - HEADER_HEIGHT - FOOTER_HEIGHT - 2
    const rows = Math.max(1, Math.floor(bodySpace / effectiveRowHeight))
    setDynamicPageSize(rows)
  }, [fixedPageSize, effectiveRowHeight])

  useLayoutEffect(() => {
    recalcPageSize()
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(recalcPageSize)
    ro.observe(el)
    const fsArea = el.closest('.fullscreen-chart-area')
    if (fsArea) ro.observe(fsArea)
    return () => ro.disconnect()
  }, [recalcPageSize])

  const pageSize = fixedPageSize || dynamicPageSize

  // Reset to page 0 when page size or data changes (e.g. entering/exiting
  // fullscreen, or applying a filter that reduces available pages)
  useLayoutEffect(() => {
    setPage(0)
  }, [pageSize, data])

  const sorted = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
  }, [data, sortKey, sortDir])

  const totalPages = Math.ceil(sorted.length / pageSize)
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize)
  const isPaginated = totalPages > 1

  // Reset measured column widths when data or columns change
  useLayoutEffect(() => {
    setColWidths(null)
    setNowrapWidths(null)
  }, [data, columns])

  // For paginated tables, measure column widths across ALL data so widths
  // stay consistent when switching pages
  useLayoutEffect(() => {
    if (hasWrapCols || !isPaginated || colWidths !== null) return
    const el = measureRef.current
    if (!el) return
    const ths = el.querySelectorAll('thead th')
    if (!ths.length) return
    setColWidths(Array.from(ths).map(th => th.getBoundingClientRect().width))
  }, [hasWrapCols, isPaginated, colWidths, sorted, columns])

  // For tables with wrap columns, measure non-wrap column header widths so
  // table-layout:fixed can give them exact space while wrap cols share the rest
  useLayoutEffect(() => {
    if (!hasWrapCols || nowrapWidths) return
    const el = nowrapMeasureRef.current
    if (!el) return
    const items = el.children
    if (!items.length) return
    const nowrapCols = columns.filter(c => !c.wrap)
    const wrapColCount = columns.length - nowrapCols.length
    const widths = new Map()
    let totalNowrap = 0
    for (let i = 0; i < items.length; i++) {
      const w = Math.ceil(items[i].getBoundingClientRect().width)
      widths.set(nowrapCols[i].key, w)
      totalNowrap += w
    }
    // Safety: if remaining space per wrap col < 80px, skip fixed layout
    // (accept horizontal scroll at very narrow viewports)
    const container = rootRef.current?.clientWidth || 0
    if (container > 0 && wrapColCount > 0) {
      const perWrap = (container - totalNowrap) / wrapColCount
      if (perWrap < 80) return // don't set widths — table stays auto layout
    }
    setNowrapWidths(widths)
  }, [hasWrapCols, nowrapWidths, columns])

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(0)
  }

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ChevronsUpDown size={12} className="text-text-secondary/40" />
    return sortDir === 'asc' ? (
      <ChevronUp size={12} className="text-brand-blue" />
    ) : (
      <ChevronDown size={12} className="text-brand-blue" />
    )
  }

  return (
    <div ref={rootRef} className={`data-table-root bg-white rounded-xl border border-border-light shadow-xs overflow-hidden flex flex-col mx-auto max-w-full${hasWrapCols ? '' : ' w-fit'}`}>
      {/* Off-screen table for measuring max column widths across all data */}
      {/* Off-screen measurement for non-wrap column header widths (wrap-mode tables) */}
      {hasWrapCols && !nowrapWidths && (
        <div
          ref={nowrapMeasureRef}
          aria-hidden="true"
          style={{ position: 'fixed', top: -10000, left: -10000, visibility: 'hidden', pointerEvents: 'none' }}
        >
          {columns.filter(c => !c.wrap).map(col => (
            <span
              key={col.key}
              className="px-4 py-3 inline-flex items-center gap-1 text-base font-semibold uppercase tracking-wider whitespace-nowrap"
            >
              {col.label}
              <ChevronsUpDown size={12} />
            </span>
          ))}
        </div>
      )}
      {/* Off-screen table for measuring max column widths across all data */}
      {isPaginated && !hasWrapCols && colWidths === null && (
        <div
          ref={measureRef}
          aria-hidden="true"
          style={{ position: 'fixed', top: -10000, left: -10000, visibility: 'hidden', pointerEvents: 'none' }}
        >
          <table className="text-base">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 text-left text-base font-semibold uppercase tracking-wider whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      <ChevronsUpDown size={12} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-2.5 whitespace-nowrap">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div
        className="overflow-x-auto overflow-y-hidden flex-1 min-h-0 data-table-scroll"
        style={totalPages > 1 && !hasWrapCols ? { minHeight: HEADER_HEIGHT + pageSize * ROW_HEIGHT } : undefined}
      >
        <table
          className={`text-base${hasWrapCols ? ' w-full' : ''}`}
          style={
            hasWrapCols && nowrapWidths
              ? { tableLayout: 'fixed' }
              : colWidths && isPaginated && !hasWrapCols
                ? { tableLayout: 'fixed', width: colWidths.reduce((s, w) => s + w, 0) }
                : undefined
          }
        >
          {/* Wrap-mode: non-wrap cols get measured header width, wrap cols share remainder */}
          {hasWrapCols && nowrapWidths && (
            <colgroup>
              {columns.map(col => (
                <col key={col.key} style={col.wrap ? undefined : { width: nowrapWidths.get(col.key) }} />
              ))}
            </colgroup>
          )}
          {/* Non-wrap mode: all cols get measured content width */}
          {!hasWrapCols && colWidths && isPaginated && (
            <colgroup>
              {colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}
            </colgroup>
          )}
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface-alt border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className="px-4 py-3 text-left whitespace-nowrap"
                >
                  <button
                    type="button"
                    onClick={() => handleSort(col.key)}
                    className="inline-flex items-center gap-1 text-base font-semibold text-text-secondary
                             uppercase tracking-wider cursor-pointer select-none
                             hover:text-brand-blue focus-visible:text-brand-blue
                             focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue
                             transition-colors bg-transparent border-none p-0"
                    aria-label={`Sort by ${col.label}${sortKey === col.key ? (sortDir === 'asc' ? ', currently ascending' : ', currently descending') : ''}`}
                  >
                    {col.label}
                    <SortIcon col={col.key} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-border-light/60 transition-colors duration-100
                  ${i % 2 === 0 ? 'bg-white' : 'bg-surface-alt/40'}
                  hover:bg-brand-blue/[0.03]`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 ${col.wrap ? 'py-3' : 'py-2.5 whitespace-nowrap'} text-text-primary`}
                    style={col.wrap ? { overflowWrap: 'anywhere', minWidth: col.minWidth || 80 } : undefined}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-light bg-surface-alt/30">
          <p className="text-base text-text-secondary">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of{' '}
            {sorted.length.toLocaleString()} records
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2.5 py-1 text-base font-medium rounded-md border border-border
                         disabled:opacity-40 disabled:cursor-not-allowed
                         hover:bg-surface-alt transition-colors"
            >
              Prev
            </button>
            <span className="px-2 text-base text-text-secondary">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-2.5 py-1 text-base font-medium rounded-md border border-border
                         disabled:opacity-40 disabled:cursor-not-allowed
                         hover:bg-surface-alt transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
