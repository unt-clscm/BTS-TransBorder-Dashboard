/**
 * BoxPlotChart — Vertical box-and-whisker chart rendered with D3 into an SVG.
 *
 * ── BOILERPLATE: NO CHANGES NEEDED ─────────────────────────────────────────
 * Chart components are data-agnostic — they render whatever data array is
 * passed via props. When swapping datasets, update the page components
 * (src/pages/) that prepare and pass data to these charts, not the charts
 * themselves. The only reason to modify a chart is to change its visual
 * style or add new interactive features.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 * Renders a vertical box plot showing distribution statistics for each
 * category (e.g. year). Each box displays Q1–Q3 range, median line,
 * whiskers to min/max, and outlier dots.
 *
 * PROPS
 * @param {Array<Object>} data
 *   Pre-computed box statistics. Each object must have: [xKey], min, q1,
 *   median, q3, max, count, and optionally outliers (array of {value, label}).
 *
 * @param {string} [xKey='year']   - Category axis property
 * @param {string} [color]         - Fill color for boxes
 * @param {Function} [formatValue] - Formatter for Y-axis labels and tooltip
 * @param {boolean} [animate=true] - Entrance animation
 * @param {Array} [annotations=[]] - Optional annotation bands (same format as LineChart)
 */
import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import { useChartResize, getResponsiveFontSize } from '@/lib/useChartResize'
import { CHART_COLORS, formatCompact } from '@/lib/chartColors'

const TICK_HALF = 5

function BoxPlotChartInner({
  data = [],
  xKey = 'year',
  color = CHART_COLORS[0],
  formatValue = formatCompact,
  animate = true,
  annotations = [],
}) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const { width, height: containerHeight, isFullscreen } = useChartResize(containerRef)

  useEffect(() => {
    if (!data.length || !width) return

    const FS = getResponsiveFontSize(width, isFullscreen)

    // Dynamic left margin based on Y-axis label width
    // Domain extends to 110 for breathing room above 100%; explicit ticks stop at 100
    const yDomain = [0, 110]
    const yTickValues = [0, 20, 40, 60, 80, 100]
    const yTicksEst = yTickValues
    const maxYLabelLen = d3.max(yTicksEst, (v) => (v === 0 ? '' : formatValue(v)).length) || 4
    const dynamicLeft = Math.max(48, maxYLabelLen * (FS * 0.6) + 16)

    const margin = isFullscreen
      ? { top: 20, right: 28, bottom: 72, left: Math.max(100, dynamicLeft) }
      : { top: 16, right: 16, bottom: 48, left: dynamicLeft }

    // In normal mode, use fixed height to prevent feedback loops in CSS grid layouts.
    // In fullscreen mode, fill the available container height.
    const height = isFullscreen
      ? Math.max(340, containerHeight > 100 ? containerHeight : 340)
      : 340
    const innerW = Math.max(1, width - margin.left - margin.right)
    const innerH = Math.max(1, height - margin.top - margin.bottom)

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height)

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // ── Scales ─────────────────────────────────────────────────────
    const x = d3.scaleBand()
      .domain(data.map((d) => d[xKey]))
      .range([0, innerW])
      .padding(0.35)

    const y = d3.scaleLinear()
      .domain(yDomain)
      .range([innerH, 0])

    // ── Grid lines ─────────────────────────────────────────────────
    const yTicks = yTickValues
    yTicks.forEach((t) => {
      if (t === 0) return
      g.append('line')
        .attr('x1', 0).attr('x2', innerW)
        .attr('y1', y(t)).attr('y2', y(t))
        .attr('stroke', '#9ca3af')
        .attr('stroke-dasharray', '4,4')
        .attr('stroke-width', 0.5)
    })

    // ── Annotation bands ───────────────────────────────────────────
    // Annotations use numeric x values (e.g. 2019.5); map them to band positions
    const xDomain = data.map((d) => d[xKey])
    annotations.forEach((ann) => {
      if (ann.x == null) return
      // Find the band positions that fall within the annotation range
      const bandW = x.bandwidth()
      const step = x.step()

      if (ann.x2 != null) {
        // Shaded band: find left edge and right edge
        let leftPx = innerW, rightPx = 0
        xDomain.forEach((cat) => {
          const catNum = Number(cat)
          const catLeft = x(cat)
          const catRight = catLeft + bandW
          // Include this band if it falls strictly within (ann.x, ann.x2)
          if (catNum + 0.5 > ann.x && catNum - 0.5 < ann.x2) {
            leftPx = Math.min(leftPx, catLeft - step * 0.175)
            rightPx = Math.max(rightPx, catRight + step * 0.175)
          }
        })
        if (rightPx > leftPx) {
          g.append('rect')
            .attr('x', leftPx).attr('width', rightPx - leftPx)
            .attr('y', 0).attr('height', innerH)
            .attr('fill', ann.color || 'rgba(217,13,13,0.08)')
            .attr('pointer-events', 'none')
        }
        if (ann.label) {
          g.append('text')
            .attr('x', (leftPx + rightPx) / 2)
            .attr('y', 14)
            .attr('text-anchor', 'middle')
            .attr('font-size', `${FS * 0.8}px`)
            .attr('fill', ann.labelColor || '#d90d0d')
            .attr('pointer-events', 'none')
            .text(ann.label)
        }
      }
    })

    // ── Axes ────────────────────────────────────────────────────────
    // X-axis
    const xAxisG = g.append('g').attr('transform', `translate(0,${innerH})`)
    // Baseline
    xAxisG.append('line')
      .attr('x1', 0).attr('x2', innerW)
      .attr('stroke', '#9ca3af').attr('stroke-width', 1)
    // Ticks + labels
    xDomain.forEach((cat) => {
      const cx = x(cat) + x.bandwidth() / 2
      xAxisG.append('line')
        .attr('x1', cx).attr('x2', cx)
        .attr('y1', -TICK_HALF).attr('y2', TICK_HALF)
        .attr('stroke', '#9ca3af').attr('stroke-width', 1)
      xAxisG.append('text')
        .attr('x', cx).attr('y', TICK_HALF + FS + 4)
        .attr('text-anchor', 'middle')
        .attr('font-size', `${FS}px`)
        .attr('fill', 'var(--color-text-secondary)')
        .text(cat)
    })

    // Y-axis
    const yAxisG = g.append('g')
    yAxisG.append('line')
      .attr('x1', 0).attr('x2', 0)
      .attr('y1', 0).attr('y2', innerH)
      .attr('stroke', '#9ca3af').attr('stroke-width', 1)
    yTicks.forEach((t) => {
      const ty = y(t)
      yAxisG.append('line')
        .attr('x1', -TICK_HALF).attr('x2', TICK_HALF)
        .attr('y1', ty).attr('y2', ty)
        .attr('stroke', '#9ca3af').attr('stroke-width', 1)
      yAxisG.append('text')
        .attr('x', -TICK_HALF - 6)
        .attr('y', ty)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'end')
        .attr('font-size', `${FS}px`)
        .attr('fill', 'var(--color-text-secondary)')
        .text(t === 0 ? '' : formatValue(t))
    })

    // ── Tooltip ────────────────────────────────────────────────────
    const tipId = `box-chart-tooltip-${Math.random().toString(36).slice(2, 9)}`
    let tipDiv = document.getElementById(tipId)
    if (!tipDiv) {
      tipDiv = document.createElement('div')
      tipDiv.id = tipId
      tipDiv.setAttribute('role', 'tooltip')
      Object.assign(tipDiv.style, {
        position: 'fixed', pointerEvents: 'none', display: 'none',
        background: 'white', border: '1px solid #e2e5e9', borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.10)', padding: '12px 14px',
        fontSize: '16px', lineHeight: '1.6', zIndex: '9999', whiteSpace: 'nowrap',
        fontFamily: 'inherit', color: '#333f48', maxWidth: '360px',
      })
      document.body.appendChild(tipDiv)
    }

    const showTooltip = (event, d) => {
      tipDiv.textContent = ''

      // Header: year
      const header = document.createElement('div')
      Object.assign(header.style, { fontWeight: '700', fontSize: '16px', marginBottom: '6px' })
      header.textContent = d[xKey]
      tipDiv.appendChild(header)

      // Stats table
      const body = document.createElement('div')
      Object.assign(body.style, { borderTop: '1px solid #e5e7eb', paddingTop: '6px' })
      const stats = [
        ['Routes', String(d.count)],
        ['Max', formatValue(d.max)],
        ['Q3 (75th)', formatValue(d.q3)],
        ['Median', formatValue(d.median)],
        ['Q1 (25th)', formatValue(d.q1)],
        ['Min', formatValue(d.min)],
      ]
      if (d.outliers && d.outliers.length > 0) {
        stats.push(['Outliers', String(d.outliers.length)])
      }
      stats.forEach(([label, value]) => {
        const row = document.createElement('div')
        Object.assign(row.style, { display: 'flex', justifyContent: 'space-between', gap: '16px' })
        const labelSpan = document.createElement('span')
        labelSpan.style.color = '#6b7280'
        labelSpan.textContent = label
        const valSpan = document.createElement('span')
        valSpan.style.fontWeight = '600'
        valSpan.textContent = value
        row.appendChild(labelSpan)
        row.appendChild(valSpan)
        body.appendChild(row)
      })
      tipDiv.appendChild(body)
      tipDiv.style.display = 'block'

      // Position
      const tipW = tipDiv.offsetWidth
      const tipH = tipDiv.offsetHeight
      const pad = 12
      let tx = event.clientX + 16
      if (tx + tipW + pad > window.innerWidth) tx = event.clientX - tipW - 16
      let ty = event.clientY - tipH - 10
      if (ty < pad) ty = event.clientY + 16
      tx = Math.max(pad, Math.min(tx, window.innerWidth - tipW - pad))
      ty = Math.max(pad, Math.min(ty, window.innerHeight - tipH - pad))
      tipDiv.style.left = `${tx}px`
      tipDiv.style.top = `${ty}px`
    }

    const hideTooltip = () => { tipDiv.style.display = 'none' }

    // ── Box plots ──────────────────────────────────────────────────
    const boxW = x.bandwidth()
    const whiskerW = boxW * 0.4

    data.forEach((d, i) => {
      const cx = x(d[xKey]) + boxW / 2
      const bx = x(d[xKey])
      const delay = animate ? i * 50 : 0
      const dur = animate ? 600 : 0

      // Whisker: vertical line from min to max
      g.append('line')
        .attr('x1', cx).attr('x2', cx)
        .attr('y1', y(d.median)).attr('y2', y(d.median))
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .transition().duration(dur).delay(delay)
        .attr('y1', y(d.max)).attr('y2', y(d.min))

      // Whisker caps (top)
      g.append('line')
        .attr('x1', cx - whiskerW / 2).attr('x2', cx + whiskerW / 2)
        .attr('y1', y(d.median)).attr('y2', y(d.median))
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .transition().duration(dur).delay(delay)
        .attr('y1', y(d.max)).attr('y2', y(d.max))

      // Whisker caps (bottom)
      g.append('line')
        .attr('x1', cx - whiskerW / 2).attr('x2', cx + whiskerW / 2)
        .attr('y1', y(d.median)).attr('y2', y(d.median))
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .transition().duration(dur).delay(delay)
        .attr('y1', y(d.min)).attr('y2', y(d.min))

      // Box (Q1 to Q3)
      const boxH = Math.max(1, y(d.q1) - y(d.q3))
      g.append('rect')
        .attr('x', bx)
        .attr('y', y(d.median))
        .attr('width', boxW)
        .attr('height', 0)
        .attr('fill', color)
        .attr('fill-opacity', 0.55)
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .attr('rx', 2)
        .transition().duration(dur).delay(delay)
        .attr('y', y(d.q3))
        .attr('height', boxH)

      // Median line
      g.append('line')
        .attr('x1', bx + 1).attr('x2', bx + boxW - 1)
        .attr('y1', y(d.median)).attr('y2', y(d.median))
        .attr('stroke', 'white')
        .attr('stroke-width', 2.5)
        .attr('stroke-linecap', 'round')
        .style('opacity', 0)
        .transition().duration(dur).delay(delay + 200)
        .style('opacity', 1)

      // Outlier dots
      if (d.outliers && d.outliers.length > 0) {
        d.outliers.forEach((o) => {
          g.append('circle')
            .attr('cx', cx)
            .attr('cy', y(d.median))
            .attr('r', 3.5)
            .attr('fill', CHART_COLORS[8])
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .style('opacity', 0)
            .transition().duration(dur).delay(delay + 300)
            .attr('cy', y(o.value))
            .style('opacity', 0.8)
        })
      }

      // Invisible hover target per box
      g.append('rect')
        .datum(d)
        .attr('x', bx - x.step() * 0.175)
        .attr('y', 0)
        .attr('width', x.step())
        .attr('height', innerH)
        .attr('fill', 'transparent')
        .attr('cursor', 'pointer')
        .on('mousemove', function (event) { showTooltip(event, d) })
        .on('mouseleave', hideTooltip)
    })

    return () => { document.getElementById(tipId)?.remove() }
  }, [data, width, containerHeight, isFullscreen, xKey, color, formatValue, animate, annotations])

  return (
    <div ref={containerRef} className="w-full" style={{ minHeight: 340 }}>
      <svg ref={svgRef} className="w-full" role="img" aria-label="Box plot chart showing distribution statistics per category" />
    </div>
  )
}

export default React.memo(BoxPlotChartInner)
