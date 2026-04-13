/**
 * DivergingBarChart — Bilateral horizontal bar chart (left/right from center).
 *
 * Renders a horizontal bar chart where each row has two bars extending in
 * opposite directions from a central axis. Useful for showing import/export
 * or departure/arrival imbalances per category.
 *
 * PROPS
 * @param {Array<Object>} data
 *   Array of objects, each with `labelKey`, `leftKey`, and `rightKey` values.
 *   Example: [{ label: 'DFW', imports: 12000, exports: 8500 }, ...]
 *
 * @param {string} [labelKey='label'] — row label field
 * @param {string} [leftKey='left']   — value extending left
 * @param {string} [rightKey='right'] — value extending right
 * @param {string} [leftLabel='Left']  — legend label for left bars
 * @param {string} [rightLabel='Right'] — legend label for right bars
 * @param {string} [leftColor]  — fill for left bars (default CHART_COLORS[3])
 * @param {string} [rightColor] — fill for right bars (default CHART_COLORS[0])
 * @param {Function} [formatValue] — formatter for value labels
 * @param {number} [maxBars=15]
 * @param {boolean} [animate=true]
 */
import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import { useChartResize, getResponsiveFontSize } from '@/lib/useChartResize'
import { CHART_COLORS, formatCompact } from '@/lib/chartColors'

const TICK_HALF = 5

function DivergingBarChartInner({
  data = [],
  labelKey = 'label',
  leftKey = 'left',
  rightKey = 'right',
  leftLabel = 'Left',
  rightLabel = 'Right',
  leftColor = CHART_COLORS[3],
  rightColor = CHART_COLORS[0],
  formatValue = formatCompact,
  maxBars = 15,
  animate = true,
}) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const { width, height: containerHeight, isFullscreen } = useChartResize(containerRef)

  useEffect(() => {
    if (!data.length || !width) return

    const FS = getResponsiveFontSize(width, isFullscreen)
    const charW = FS * 0.55
    const displayData = data.slice(0, maxBars)

    // Measure label width
    const maxLabelLen = d3.max(displayData, (d) => (d[labelKey] || '').length) || 0
    const labelW = Math.min(width * 0.3, Math.max(100, maxLabelLen * charW + 16))

    const margin = { top: 8, right: 56, bottom: 48, left: labelW }
    const defaultH = Math.max(240, displayData.length * 36 + margin.top + margin.bottom)
    // Use computed default height in normal mode to prevent feedback loops.
    const height = isFullscreen
      ? Math.max(defaultH, containerHeight > 100 ? containerHeight : defaultH)
      : defaultH
    const innerW = Math.max(1, width - margin.left - margin.right)
    const innerH = Math.max(1, height - margin.top - margin.bottom)

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height)

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // Scales
    const maxVal = d3.max(displayData, (d) => Math.max(d[leftKey] || 0, d[rightKey] || 0)) || 1
    const halfW = innerW / 2

    const xLeft = d3.scaleLinear().domain([0, maxVal]).nice().range([halfW, 0])
    const xRight = d3.scaleLinear().domain([0, maxVal]).nice().range([halfW, innerW])

    const y = d3.scaleBand()
      .domain(displayData.map((d) => d[labelKey]))
      .range([0, innerH])
      .padding(0.3)

    // Center axis line
    g.append('line')
      .attr('x1', halfW).attr('x2', halfW)
      .attr('y1', 0).attr('y2', innerH)
      .attr('stroke', '#9ca3af').attr('stroke-width', 1)

    // Bottom axis line
    g.append('line')
      .attr('x1', 0).attr('x2', innerW)
      .attr('y1', innerH).attr('y2', innerH)
      .attr('stroke', '#9ca3af').attr('stroke-width', 1)

    // Left bars (imports)
    g.selectAll('.bar-left').data(displayData).enter()
      .append('rect')
      .attr('y', (d) => y(d[labelKey]))
      .attr('height', y.bandwidth())
      .attr('x', halfW)
      .attr('width', 0)
      .attr('rx', 3)
      .attr('fill', leftColor)
      .transition()
      .duration(animate ? 600 : 0)
      .delay((d, i) => animate ? i * 30 : 0)
      .attr('x', (d) => xLeft(d[leftKey] || 0))
      .attr('width', (d) => halfW - xLeft(d[leftKey] || 0))

    // Right bars (exports)
    g.selectAll('.bar-right').data(displayData).enter()
      .append('rect')
      .attr('y', (d) => y(d[labelKey]))
      .attr('height', y.bandwidth())
      .attr('x', halfW)
      .attr('width', 0)
      .attr('rx', 3)
      .attr('fill', rightColor)
      .transition()
      .duration(animate ? 600 : 0)
      .delay((d, i) => animate ? i * 30 : 0)
      .attr('width', (d) => xRight(d[rightKey] || 0) - halfW)

    // Value labels — left side
    // If the bar is so long that placing the label outside would push it into the
    // category-label margin, flip it inside the bar instead.
    const leftLabelProps = (d) => {
      const val = d[leftKey] || 0
      const barEnd = xLeft(val)
      const labelText = val > 0 ? formatValue(val) : ''
      const estimatedLabelW = labelText.length * FS * 0.495
      const fitsOutside = barEnd > estimatedLabelW + 8
      return { x: fitsOutside ? barEnd - 4 : barEnd + 4, anchor: fitsOutside ? 'end' : 'start', fill: fitsOutside ? 'var(--color-text-secondary)' : '#ffffff' }
    }
    g.selectAll('.val-left').data(displayData).enter()
      .append('text')
      .attr('y', (d) => y(d[labelKey]) + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('font-size', `${FS * 0.9}px`)
      .attr('fill', (d) => leftLabelProps(d).fill)
      .attr('text-anchor', (d) => leftLabelProps(d).anchor)
      .attr('x', (d) => leftLabelProps(d).x)
      .text((d) => (d[leftKey] || 0) > 0 ? formatValue(d[leftKey]) : '')
      .attr('opacity', 0)
      .transition().delay(animate ? 400 : 0).duration(300).attr('opacity', 1)

    // Value labels — right side
    // Same logic as left: if the bar is so long that the label would overflow the
    // right margin, flip it inside the bar.
    const rightLabelProps = (d) => {
      const val = d[rightKey] || 0
      const barEnd = xRight(val)
      const labelText = val > 0 ? formatValue(val) : ''
      const estimatedLabelW = labelText.length * FS * 0.495
      const fitsOutside = barEnd + estimatedLabelW + 8 < innerW
      return { x: fitsOutside ? barEnd + 4 : barEnd - 4, anchor: fitsOutside ? 'start' : 'end', fill: fitsOutside ? 'var(--color-text-secondary)' : '#ffffff' }
    }
    g.selectAll('.val-right').data(displayData).enter()
      .append('text')
      .attr('y', (d) => y(d[labelKey]) + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('font-size', `${FS * 0.9}px`)
      .attr('fill', (d) => rightLabelProps(d).fill)
      .attr('text-anchor', (d) => rightLabelProps(d).anchor)
      .attr('x', (d) => rightLabelProps(d).x)
      .text((d) => (d[rightKey] || 0) > 0 ? formatValue(d[rightKey]) : '')
      .attr('opacity', 0)
      .transition().delay(animate ? 400 : 0).duration(300).attr('opacity', 1)

    // Y Axis labels (centered)
    const yAxisG = g.append('g')
      .attr('transform', `translate(${halfW},0)`)
      .call(d3.axisLeft(y).tickSize(0))
    yAxisG.select('.domain').remove()
    yAxisG.selectAll('.tick text').remove()

    // Draw labels at left margin instead
    const labelG = g.append('g')
    displayData.forEach((d) => {
      const text = d[labelKey] || ''
      const maxChars = Math.floor((labelW - 12) / charW)
      const truncated = text.length > maxChars ? text.slice(0, maxChars - 1) + '…' : text
      labelG.append('text')
        .attr('x', -8)
        .attr('y', y(d[labelKey]) + y.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'end')
        .attr('font-size', `${FS}px`)
        .attr('fill', 'var(--color-text-secondary)')
        .text(truncated)
    })

    // Legend at bottom
    const legendY = innerH + 28
    const legendItems = [
      { label: leftLabel, color: leftColor },
      { label: rightLabel, color: rightColor },
    ]
    const legendG = svg.append('g')
    let xOff = margin.left + (innerW - legendItems.reduce((s, l) => s + l.label.length * charW + 36, 0)) / 2
    legendItems.forEach((item) => {
      const ig = legendG.append('g').attr('transform', `translate(${xOff}, ${margin.top + legendY})`)
      ig.append('rect')
        .attr('width', 14).attr('height', 14)
        .attr('rx', 3).attr('fill', item.color)
        .attr('y', -7)
      ig.append('text')
        .attr('x', 20).attr('y', 5)
        .attr('font-size', `${FS}px`)
        .attr('fill', 'var(--color-text-primary)')
        .text(item.label)
      xOff += item.label.length * charW + 36
    })

  }, [data, width, containerHeight, isFullscreen, labelKey, leftKey, rightKey, leftColor, rightColor, leftLabel, rightLabel, formatValue, maxBars, animate])

  const displayCount = Math.min(data.length, maxBars)
  const minH = Math.max(240, displayCount * 36 + 56)

  return (
    <div ref={containerRef} className="w-full" style={{ minHeight: minH }}>
      <svg ref={svgRef} className="w-full" role="img" aria-label={`Diverging bar chart comparing ${leftLabel} and ${rightLabel}`} />
    </div>
  )
}

export default React.memo(DivergingBarChartInner)
