/**
 * BarChartRace — Animated horizontal bar chart that transitions between yearly
 * frames, showing how ranked items change position and value over time.
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
 * Renders a horizontal bar chart that smoothly animates between "frames"
 * (typically years). Bars reorder, grow/shrink, enter from below, and exit
 * downward — the classic "bar chart race" pattern. A large watermark year
 * label is displayed in the bottom-right corner.
 *
 * PROPS
 * @param {Array<{year: number, routes: Array<{route: string, value: number, origin: string}>}>} frames
 *   All year frames with sorted route data.
 * @param {number} currentYear
 *   Which year to display.
 * @param {number} globalMax
 *   Global max value across all frames for stable X-axis scale.
 * @param {number} [maxBars=12]
 *   Top N routes to show per frame.
 * @param {Function} [formatValue=formatCompact]
 *   Value formatter for bar labels and axis.
 * @param {Object} [originColors={}]
 *   Map of airport code → hex color for bar fill.
 */
import React, { useRef, useEffect, useCallback } from 'react'
import * as d3 from 'd3'
import { useChartResize, getResponsiveFontSize } from '@/lib/useChartResize'
import { CHART_COLORS, formatCompact } from '@/lib/chartColors'

const TICK_HALF = 5
const TRANSITION_MS = 750

function BarChartRaceInner({
  frames = [],
  currentYear,
  globalMax = 1,
  maxBars = 12,
  formatValue = formatCompact,
  originColors = {},
  fillContainer = false,
}) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const tooltipRef = useRef(null)
  const structureRef = useRef(null) // tracks current SVG structure dimensions
  const { width, height: containerHeight, isFullscreen } = useChartResize(containerRef)

  const getColor = useCallback(
    (d) => originColors[d.origin] || CHART_COLORS[0],
    [originColors]
  )

  // ── Structure + Data effect ──────────────────────────────────────────────
  // We combine structure setup and data rendering in a single effect.
  // When width changes, we clear and rebuild. When only currentYear changes,
  // we use D3 transitions on the persistent SVG elements.
  useEffect(() => {
    if (!frames.length || !width || currentYear == null) return

    const frame = frames.find((f) => f.year === currentYear)
    if (!frame) return

    const displayData = frame.routes.slice(0, maxBars)
    const FS = getResponsiveFontSize(width, isFullscreen)
    const labelFS = Math.max(11, FS * 0.8)
    const charW = labelFS * 0.55
    const ROW_H = Math.max(38, FS * 2.6)

    // Measure label width — use longest single line (split on →)
    const maxLineLabelLen = d3.max(displayData, (d) => {
      const parts = (d.route || '').split(' → ')
      return d3.max(parts, (p) => p.length) || 0
    }) || 0
    const dynamicLeft = Math.min(width * 0.5, Math.max(140, maxLineLabelLen * charW + 24))
    const margin = { top: 8, right: 80, bottom: 40, left: dynamicLeft }

    const defaultH = Math.max(280, maxBars * ROW_H + margin.top + margin.bottom)
    const height = isFullscreen || fillContainer
      ? Math.max(defaultH, containerHeight > 100 ? containerHeight : defaultH)
      : defaultH
    const innerW = Math.max(1, width - margin.left - margin.right)
    const innerH = Math.max(1, height - margin.top - margin.bottom)

    const svg = d3.select(svgRef.current)

    // Check if structure needs rebuilding (width, height, or maxBars changed)
    const prevStruct = structureRef.current
    const structChanged =
      !prevStruct ||
      prevStruct.width !== width ||
      prevStruct.height !== height ||
      prevStruct.maxBars !== maxBars ||
      prevStruct.innerW !== innerW ||
      prevStruct.innerH !== innerH

    if (structChanged) {
      // Full rebuild
      svg.selectAll('*').remove()
      svg.attr('width', width).attr('height', height)

      svg.append('g').attr('class', 'axis-group').attr('transform', `translate(${margin.left},${margin.top})`)
      svg.append('g').attr('class', 'bars-group').attr('transform', `translate(${margin.left},${margin.top})`)
      svg.append('g').attr('class', 'labels-group').attr('transform', `translate(${margin.left - 8},${margin.top})`)
      svg.append('g').attr('class', 'values-group').attr('transform', `translate(${margin.left},${margin.top})`)
      structureRef.current = { width, height, maxBars, innerW, innerH, margin }
    }

    const { margin: m } = structureRef.current
    const shouldAnimate = !structChanged
    const dur = shouldAnimate ? TRANSITION_MS : 0
    const t = d3.transition().duration(dur)

    // ── Scales ───────────────────────────────────────────────────────────
    const x = d3.scaleLinear().domain([0, globalMax || 1]).nice().range([0, innerW])

    const y = d3.scaleBand()
      .domain(displayData.map((d) => d.route))
      .range([0, innerH])
      .padding(0.25)

    // ── Axis ─────────────────────────────────────────────────────────────
    const axisG = svg.select('.axis-group')
    axisG.selectAll('*').remove()

    // X-axis baseline
    axisG
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', innerH)
      .attr('y2', innerH)
      .attr('stroke', '#9ca3af')

    // Y-axis baseline
    axisG
      .append('line')
      .attr('x1', 0)
      .attr('x2', 0)
      .attr('y1', 0)
      .attr('y2', innerH)
      .attr('stroke', '#9ca3af')

    // X-axis ticks
    const xAxisG = axisG
      .append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(Math.max(2, Math.floor(innerW / 100)))
          .tickSize(0)
          .tickFormat((v) => formatValue(v))
      )
    xAxisG.select('.domain').remove()
    xAxisG.selectAll('.tick').append('line').attr('y1', 0).attr('y2', TICK_HALF).attr('stroke', '#9ca3af')
    xAxisG.selectAll('.tick text').attr('font-size', `${FS}px`).attr('fill', 'var(--color-text-secondary)').attr('dy', '1.2em')

    // ── Bars (keyed join) ────────────────────────────────────────────────
    const barsG = svg.select('.bars-group')
    const tooltip = tooltipRef.current

    barsG
      .selectAll('.bar')
      .data(displayData, (d) => d.route)
      .join(
        (enter) =>
          enter
            .append('rect')
            .attr('class', 'bar')
            .attr('x', 0)
            .attr('y', shouldAnimate ? innerH : (d) => y(d.route))
            .attr('height', y.bandwidth())
            .attr('width', shouldAnimate ? 0 : (d) => Math.max(0, x(d.value)))
            .attr('rx', 3)
            .attr('fill', getColor)
            .attr('opacity', shouldAnimate ? 0 : 1)
            .on('mouseenter', function (event, d) {
              if (!tooltip) return
              tooltip.textContent = `${d.route}: ${formatValue(d.value)}`
              tooltip.style.opacity = '1'
              const cr = containerRef.current.getBoundingClientRect()
              const br = this.getBoundingClientRect()
              tooltip.style.left = `${br.right - cr.left + 8}px`
              tooltip.style.top = `${br.top - cr.top + br.height / 2}px`
              tooltip.style.transform = 'translateY(-50%)'
            })
            .on('mouseleave', function () {
              if (tooltip) tooltip.style.opacity = '0'
            })
            .call((sel) =>
              sel
                .transition(t)
                .attr('y', (d) => y(d.route))
                .attr('width', (d) => Math.max(0, x(d.value)))
                .attr('height', y.bandwidth())
                .attr('opacity', 1)
            ),
        (update) =>
          update.call((sel) =>
            sel
              .transition(t)
              .attr('y', (d) => y(d.route))
              .attr('width', (d) => Math.max(0, x(d.value)))
              .attr('height', y.bandwidth())
              .attr('fill', getColor)
          ),
        (exit) =>
          exit.call((sel) =>
            sel
              .transition(t)
              .attr('y', innerH)
              .attr('width', 0)
              .attr('opacity', 0)
              .remove()
          )
      )

    // ── Route labels (left side, keyed join) ─────────────────────────────
    const labelsG = svg.select('.labels-group')
    const labelSpace = m.left - 20

    const maxChars = Math.floor(labelSpace / charW)
    const truncLine = (s) => s.length > maxChars ? s.slice(0, maxChars - 1) + '…' : s

    const renderLabel = function (d) {
      const el = d3.select(this)
      el.selectAll('tspan').remove()
      const parts = (d.route || '').split(' → ')
      if (parts.length === 2) {
        el.append('tspan')
          .attr('x', 0)
          .attr('dy', '-0.4em')
          .attr('font-weight', '600')
          .text(truncLine(parts[0]))
        el.append('tspan')
          .attr('x', 0)
          .attr('dy', '1.15em')
          .text('→ ' + truncLine(parts[1]))
      } else {
        el.text(truncLine(d.route))
      }
    }

    labelsG
      .selectAll('.route-label')
      .data(displayData, (d) => d.route)
      .join(
        (enter) =>
          enter
            .append('text')
            .attr('class', 'route-label')
            .attr('x', 0)
            .attr('y', shouldAnimate ? innerH : (d) => y(d.route) + y.bandwidth() / 2)
            .attr('text-anchor', 'end')
            .attr('font-size', `${labelFS}px`)
            .attr('fill', 'var(--color-text-secondary)')
            .attr('opacity', shouldAnimate ? 0 : 1)
            .each(renderLabel)
            .call((sel) =>
              sel
                .transition(t)
                .attr('y', (d) => y(d.route) + y.bandwidth() / 2)
                .attr('opacity', 1)
            ),
        (update) =>
          update
            .each(renderLabel)
            .call((sel) =>
              sel
                .transition(t)
                .attr('y', (d) => y(d.route) + y.bandwidth() / 2)
            ),
        (exit) =>
          exit.call((sel) =>
            sel
              .transition(t)
              .attr('y', innerH)
              .attr('opacity', 0)
              .remove()
          )
      )

    // ── Value labels (right of bars, keyed join) ─────────────────────────
    const valuesG = svg.select('.values-group')

    valuesG
      .selectAll('.val-label')
      .data(displayData, (d) => d.route)
      .join(
        (enter) =>
          enter
            .append('text')
            .attr('class', 'val-label')
            .attr('x', shouldAnimate ? 0 : (d) => Math.max(0, x(d.value)) + 4)
            .attr('y', shouldAnimate ? innerH : (d) => y(d.route) + y.bandwidth() / 2)
            .attr('dy', '0.35em')
            .attr('font-size', `${FS}px`)
            .attr('fill', 'var(--color-text-secondary)')
            .attr('opacity', shouldAnimate ? 0 : 1)
            .text((d) => formatValue(d.value))
            .call((sel) =>
              sel
                .transition(t)
                .attr('x', (d) => Math.max(0, x(d.value)) + 4)
                .attr('y', (d) => y(d.route) + y.bandwidth() / 2)
                .attr('opacity', 1)
            ),
        (update) =>
          update.call((sel) =>
            sel
              .transition(t)
              .attr('x', (d) => Math.max(0, x(d.value)) + 4)
              .attr('y', (d) => y(d.route) + y.bandwidth() / 2)
              .tween('text', function (d) {
                const prev = parseFloat(this.textContent?.replace(/[^0-9.]/g, '')) || 0
                const target = d.value
                const i = d3.interpolateNumber(prev, target)
                return (t2) => {
                  this.textContent = formatValue(i(t2))
                }
              })
          ),
        (exit) =>
          exit.call((sel) =>
            sel
              .transition(t)
              .attr('y', innerH)
              .attr('opacity', 0)
              .remove()
          )
      )

    // (year watermark removed — parent handles year display)
  }, [frames, currentYear, globalMax, maxBars, formatValue, originColors, getColor, width, containerHeight, isFullscreen, fillContainer])

  // Min height for the container (bar-count-based, not containerHeight)
  const minH = Math.max(280, maxBars * 32 + 48)

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ minHeight: minH }}>
      <svg ref={svgRef} className="w-full" role="img" aria-label={`Animated bar chart race showing ranked items over time, currently displaying year ${currentYear}`} />
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
          fontSize: '14px',
          lineHeight: '1.3',
          maxWidth: '320px',
          whiteSpace: 'normal',
          zIndex: 50,
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        }}
      />
    </div>
  )
}

export default React.memo(BarChartRaceInner)
