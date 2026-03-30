/**
 * LollipopChart — Horizontal lollipop chart (stem + dot) rendered with D3.
 *
 * A cleaner alternative to horizontal bar charts for ranked data, especially
 * when labels are long (e.g., route names). Thin stems with dots reduce visual
 * clutter and the 2-line label layout accommodates "Origin → Destination" routes.
 *
 * PROPS
 * @param {Array<Object>} data       Array of objects with xKey (label) and yKey (value)
 * @param {string}  [xKey='label']   Category key (route label)
 * @param {string}  [yKey='value']   Numeric value key
 * @param {string}  [color]          Stem and dot color (default: brand blue)
 * @param {Function} [formatValue]   Formatter for value labels
 * @param {number}  [maxBars=10]     Maximum items to display
 * @param {boolean} [animate=true]   Animate stems and dots on mount
 * @param {number}  [dotRadius=7]    Radius of the lollipop dot
 */
import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import { useChartResize, getResponsiveFontSize } from '@/lib/useChartResize'
import { CHART_COLORS, formatCompact } from '@/lib/chartColors'

function LollipopChart({
  data = [],
  xKey = 'label',
  yKey = 'value',
  color = CHART_COLORS[0],
  colorAccessor,
  formatValue = formatCompact,
  maxBars = 10,
  animate = true,
  dotRadius = 7,
}) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const tooltipRef = useRef(null)
  const { width, height: containerHeight, isFullscreen } = useChartResize(containerRef)

  useEffect(() => {
    if (!data.length || !width) return

    const FS = getResponsiveFontSize(width, isFullscreen)
    const charW = FS * 0.55
    const displayData = data.slice(0, maxBars)

    // Row height accommodates 2-line labels
    const rowHeight = 52
    // Generous label space for "Origin → Destination" two-line layout
    const labelWidth = Math.min(width * 0.45, Math.max(200, 280))
    const margin = { top: 12, right: 72, bottom: 12, left: labelWidth }
    const height = displayData.length * rowHeight + margin.top + margin.bottom
    const innerW = Math.max(1, width - margin.left - margin.right)
    const innerH = Math.max(1, height - margin.top - margin.bottom)

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height)

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // Scales
    const maxVal = d3.max(displayData, (d) => d[yKey]) || 1
    const x = d3.scaleLinear().domain([0, maxVal]).nice().range([0, innerW])
    const y = d3.scaleBand()
      .domain(displayData.map((d) => d[xKey]))
      .range([0, innerH])
      .padding(0.35)

    // Subtle horizontal guide lines for each row
    g.selectAll('.guide').data(displayData).enter()
      .append('line')
      .attr('x1', 0).attr('x2', innerW)
      .attr('y1', (d) => y(d[xKey]) + y.bandwidth() / 2)
      .attr('y2', (d) => y(d[xKey]) + y.bandwidth() / 2)
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 1)

    // Stems (thin lines)
    g.selectAll('.stem').data(displayData).enter()
      .append('line')
      .attr('class', 'stem')
      .attr('y1', (d) => y(d[xKey]) + y.bandwidth() / 2)
      .attr('y2', (d) => y(d[xKey]) + y.bandwidth() / 2)
      .attr('x1', 0).attr('x2', 0)
      .attr('stroke', (d) => colorAccessor ? colorAccessor(d) : color)
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round')
      .transition()
      .duration(animate ? 600 : 0)
      .delay((d, i) => (animate ? i * 50 : 0))
      .attr('x2', (d) => x(d[yKey]))

    // Dots at end of stems
    g.selectAll('.dot').data(displayData).enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cy', (d) => y(d[xKey]) + y.bandwidth() / 2)
      .attr('cx', 0)
      .attr('r', 0)
      .attr('fill', (d) => colorAccessor ? colorAccessor(d) : color)
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .transition()
      .duration(animate ? 600 : 0)
      .delay((d, i) => (animate ? i * 50 : 0))
      .attr('cx', (d) => x(d[yKey]))
      .attr('r', dotRadius)

    // Value labels (right of dot)
    g.selectAll('.val-label').data(displayData).enter()
      .append('text')
      .attr('y', (d) => y(d[xKey]) + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('x', (d) => x(d[yKey]) + dotRadius + 8)
      .attr('font-size', `${FS}px`)
      .attr('font-weight', '600')
      .attr('fill', 'var(--color-text-primary)')
      .text((d) => formatValue(d[yKey]))
      .attr('opacity', 0)
      .transition()
      .delay(animate ? 500 : 0)
      .duration(300)
      .attr('opacity', 1)

    // Route labels — split on " → " for two-line display
    const maxCharsPerLine = Math.floor((labelWidth - 28) / charW)
    const tooltip = tooltipRef.current

    displayData.forEach((d) => {
      const fullLabel = d[xKey] || ''
      const parts = fullLabel.split(' → ')
      const cy = y(d[xKey]) + y.bandwidth() / 2

      const textEl = g.append('text')
        .attr('text-anchor', 'end')
        .attr('font-size', `${FS - 1}px`)
        .attr('fill', 'var(--color-text-secondary)')
        .style('cursor', 'default')

      if (parts.length === 2) {
        const line1Raw = parts[0]
        const line2Raw = parts[1]
        const line1 = line1Raw.length > maxCharsPerLine
          ? line1Raw.slice(0, maxCharsPerLine - 1) + '…'
          : line1Raw
        const line2 = line2Raw.length > maxCharsPerLine
          ? line2Raw.slice(0, maxCharsPerLine - 1) + '…'
          : line2Raw

        textEl.append('tspan')
          .attr('x', -16)
          .attr('y', cy - FS * 0.5)
          .text(line1 + ' →')
        textEl.append('tspan')
          .attr('x', -10)
          .attr('y', cy + FS * 0.65)
          .text(line2)
      } else {
        const truncated = fullLabel.length > maxCharsPerLine * 2
          ? fullLabel.slice(0, maxCharsPerLine * 2 - 1) + '…'
          : fullLabel
        textEl.attr('y', cy).attr('dy', '0.35em').attr('x', -16).text(truncated)
      }

      // Tooltip on hover for full route name
      textEl
        .on('mouseover', function (_event) {
          if (!tooltip) return
          tooltip.textContent = fullLabel
          tooltip.style.opacity = '1'
          const containerRect = containerRef.current.getBoundingClientRect()
          const textRect = this.getBoundingClientRect()
          tooltip.style.left = `${textRect.right - containerRect.left + 8}px`
          tooltip.style.top = `${textRect.top - containerRect.top + textRect.height / 2}px`
          tooltip.style.transform = 'translateY(-50%)'
        })
        .on('mouseout', function () {
          if (!tooltip) return
          tooltip.style.opacity = '0'
        })
    })

  }, [data, width, containerHeight, isFullscreen, xKey, yKey, color, colorAccessor, maxBars, animate, dotRadius, formatValue])

  const displayCount = Math.min(data.length, maxBars)
  const minH = Math.max(220, displayCount * 52 + 24)

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ minHeight: minH }}>
      <svg ref={svgRef} className="w-full" role="img" aria-label="Lollipop chart visualization" />
      <div
        ref={tooltipRef}
        role="tooltip"
        style={{
          position: 'absolute',
          pointerEvents: 'none',
          opacity: 0,
          transition: 'opacity 0.15s',
          background: '#1f2937',
          color: '#fff',
          padding: '6px 10px',
          borderRadius: '6px',
          fontSize: '16px',
          lineHeight: '1.3',
          maxWidth: '400px',
          whiteSpace: 'normal',
          zIndex: 50,
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        }}
      />
    </div>
  )
}

export default React.memo(LollipopChart)
