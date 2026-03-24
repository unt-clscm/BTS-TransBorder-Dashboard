/**
 * ScatterPlot — Reusable scatter / bubble chart rendered with D3.
 *
 * Plots data points on two numeric axes with optional categorical color
 * encoding and bubble-size encoding. Supports symlog, linear, and log
 * scales. Shows permanent labels for the top-N points and tooltips on hover.
 *
 * PROPS
 * @param {Array<Object>} data
 * @param {string} [xKey='x']          — field for x-axis value
 * @param {string} [yKey='y']          — field for y-axis value
 * @param {string} [labelKey='label']  — field for point label text
 * @param {string} [colorKey]          — field for categorical color grouping
 * @param {string} [sizeKey]           — field for bubble size encoding
 * @param {Function} [formatX]         — x-axis / tooltip formatter
 * @param {Function} [formatY]         — y-axis / tooltip formatter
 * @param {Object}   [colorMap]        — { categoryValue: '#hex' }
 * @param {number}   [labelThreshold=0]— show permanent labels for top N points
 * @param {string}   [xLabel]            — x-axis label (defaults to xKey)
 * @param {string}   [yLabel]            — y-axis label (defaults to yKey)
 * @param {string}   [scaleType='symlog'] — 'symlog' | 'linear' | 'log'
 * @param {boolean}  [animate=true]
 */
import React, { useRef, useEffect, useMemo, useCallback } from 'react'
import * as d3 from 'd3'
import { useChartResize, getResponsiveFontSize } from '@/lib/useChartResize'
import { CHART_COLORS, formatCompact } from '@/lib/chartColors'

const TICK_HALF = 5

function ScatterPlotInner({
  data = [],
  xKey = 'x',
  yKey = 'y',
  labelKey = 'label',
  nameKey,
  colorKey,
  sizeKey,
  formatX = formatCompact,
  formatY = formatCompact,
  colorMap,
  xLabel,
  yLabel,
  labelThreshold = 0,
  scaleType = 'symlog',
  animate = true,
}) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const { width, height: containerHeight, isFullscreen } = useChartResize(containerRef)

  // Memoize categories and color scale to avoid recreating on every render/getColor call
  const categories = useMemo(
    () => (colorKey ? [...new Set(data.map((d) => d[colorKey]))] : []),
    [data, colorKey],
  )

  const colorScale = useMemo(
    () => (categories.length ? d3.scaleOrdinal().domain(categories).range(CHART_COLORS) : null),
    [categories],
  )

  const getColor = useCallback(
    (d) => {
      if (!colorKey) return CHART_COLORS[0]
      if (colorMap) return colorMap[d[colorKey]] || CHART_COLORS[0]
      return colorScale(d[colorKey])
    },
    [colorKey, colorMap, colorScale],
  )

  useEffect(() => {
    if (!data.length || !width) return

    const FS = getResponsiveFontSize(width, isFullscreen)
    const charW = FS * 0.55

    const xAxisLabel = xLabel || xKey
    const yAxisLabel = yLabel || yKey

    /* ── margins & dimensions ─────────────────────────────────────── */
    const margin = isFullscreen
      ? { top: 24, right: 48, bottom: 88, left: 112 }
      : { top: 20, right: 32, bottom: 80, left: 104 }

    // Reserve space for legend if colorKey has categories
    const legendSpace = categories.length >= 2 ? 48 : 0

    const defaultH = 380 + legendSpace
    // Use computed default height in normal mode to prevent feedback loops.
    const height = isFullscreen
      ? Math.max(defaultH, containerHeight > 100 ? containerHeight : defaultH)
      : defaultH
    const innerW = Math.max(1, width - margin.left - margin.right)
    const innerH = Math.max(1, height - margin.top - margin.bottom - legendSpace)

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height)

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    /* ── scales ────────────────────────────────────────────────────── */
    const makeScale = (type) => {
      switch (type) {
        case 'log':    return d3.scaleLog().clamp(true)
        case 'linear': return d3.scaleLinear()
        default:       return d3.scaleSymlog().constant(1)
      }
    }

    const xMax = d3.max(data, (d) => d[xKey]) || 1
    const yMax = d3.max(data, (d) => d[yKey]) || 1

    const x = makeScale(scaleType)
      .domain([0, xMax])
      .range([0, innerW])
      .nice()

    const y = makeScale(scaleType)
      .domain([0, yMax])
      .range([innerH, 0])
      .nice()

    // Bubble size scale (sqrt so area scales linearly with value)
    const maxR = isFullscreen ? 20 : 14
    const minR = 4
    const sizeExtent = sizeKey ? d3.extent(data, (d) => d[sizeKey]) : null
    const rScale = sizeKey
      ? d3.scaleSqrt().domain([0, sizeExtent[1] || 1]).range([minR, maxR])
      : null
    const getR = (d) => rScale ? rScale(d[sizeKey]) : 6

    /* ── tick generation (avoid symlog overlap) ─────────────────── */
    const makeTicks = (scale, maxVal, _pixelRange) => {
      if (scaleType === 'linear') return scale.ticks(6)
      // For symlog/log: use powers of 10 within domain, filtered by min pixel spacing
      const ticks = []
      const minPxGap = FS * 4 // minimum pixel gap between ticks
      for (let p = 1; p <= maxVal; p *= 10) ticks.push(p)
      // Filter ticks that are too close in pixel space
      const filtered = []
      let lastPx = -Infinity
      for (const t of ticks) {
        const px = scale(t)
        if (Math.abs(px - lastPx) >= minPxGap) {
          filtered.push(t)
          lastPx = px
        }
      }
      return filtered
    }
    const xTicks = makeTicks(x, xMax, innerW)
    const yTicks = makeTicks(y, yMax, innerH)

    // Horizontal grid
    g.selectAll('.grid-h')
      .data(yTicks.filter((t) => t !== 0))
      .enter()
      .append('line')
      .attr('x1', 0).attr('x2', innerW)
      .attr('y1', (d) => y(d)).attr('y2', (d) => y(d))
      .attr('stroke', '#e5e7eb').attr('stroke-dasharray', '3,3')

    // Vertical grid
    g.selectAll('.grid-v')
      .data(xTicks.filter((t) => t !== 0))
      .enter()
      .append('line')
      .attr('x1', (d) => x(d)).attr('x2', (d) => x(d))
      .attr('y1', 0).attr('y2', innerH)
      .attr('stroke', '#e5e7eb').attr('stroke-dasharray', '3,3')

    /* ── axis lines ───────────────────────────────────────────────── */
    // X axis baseline
    g.append('line')
      .attr('x1', 0).attr('x2', innerW)
      .attr('y1', innerH).attr('y2', innerH)
      .attr('stroke', '#9ca3af')

    // Y axis left edge
    g.append('line')
      .attr('x1', 0).attr('x2', 0)
      .attr('y1', 0).attr('y2', innerH)
      .attr('stroke', '#9ca3af')

    /* ── axes ──────────────────────────────────────────────────────── */
    // X axis
    const xAxisG = g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(
        d3.axisBottom(x)
          .tickValues(xTicks)
          .tickFormat((v) => (v === 0 ? '' : formatX(v)))
          .tickSize(0)
      )
    xAxisG.select('.domain').remove()
    xAxisG.selectAll('.tick').append('line')
      .attr('y1', -TICK_HALF).attr('y2', TICK_HALF)
      .attr('stroke', '#9ca3af')
    xAxisG.selectAll('.tick text')
      .attr('font-size', `${FS}px`)
      .attr('fill', 'var(--color-text-secondary)')
      .attr('dy', '1.2em')
    xAxisG.selectAll('.tick').filter((d) => d === 0).remove()

    // X axis label
    g.append('text')
      .attr('x', innerW / 2)
      .attr('y', innerH + (isFullscreen ? 52 : 44))
      .attr('text-anchor', 'middle')
      .attr('font-size', `${FS}px`)
      .attr('fill', 'var(--color-text-secondary)')
      .attr('font-weight', '600')
      .text(xAxisLabel)

    // Y axis
    const yAxisG = g.append('g')
      .call(
        d3.axisLeft(y)
          .tickValues(yTicks)
          .tickFormat((v) => (v === 0 ? '' : formatY(v)))
          .tickSize(0)
      )
    yAxisG.select('.domain').remove()
    yAxisG.selectAll('.tick').append('line')
      .attr('x1', -TICK_HALF).attr('x2', TICK_HALF)
      .attr('stroke', '#9ca3af')
    yAxisG.selectAll('.tick text')
      .attr('font-size', `${FS}px`)
      .attr('fill', 'var(--color-text-secondary)')
      .attr('dx', '-0.5em')

    // Y axis label
    g.append('text')
      .attr('transform', `translate(${-(margin.left - 16)},${innerH / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .attr('font-size', `${FS}px`)
      .attr('fill', 'var(--color-text-secondary)')
      .attr('font-weight', '600')
      .text(yAxisLabel)

    /* ── tooltip ───────────────────────────────────────────────────── */
    const tipId = 'scatter-tooltip'
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

    /* ── dots ──────────────────────────────────────────────────────── */
    const dots = g.selectAll('.scatter-dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'scatter-dot')
      .attr('cx', (d) => x(d[xKey]))
      .attr('cy', (d) => y(d[yKey]))
      .attr('r', (d) => getR(d))
      .attr('fill', (d) => getColor(d))
      .attr('stroke', 'white')
      .attr('stroke-width', 1.5)
      .attr('cursor', 'pointer')
      .attr('opacity', 0)

    // Animate in
    dots.transition()
      .delay((d, i) => (animate ? i * 25 : 0))
      .duration(animate ? 400 : 0)
      .attr('opacity', 0.85)

    // Tooltip interactions (applied after animation)
    dots
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('stroke', '#333f48').attr('stroke-width', 2.5).attr('opacity', 1)

        tipDiv.textContent = ''
        // Header: label
        const header = document.createElement('div')
        header.style.fontWeight = '700'
        header.style.marginBottom = '4px'
        header.textContent = d[labelKey]
        tipDiv.appendChild(header)

        // Name (e.g. airport name)
        if (nameKey && d[nameKey]) {
          const nameEl = document.createElement('div')
          nameEl.style.color = '#6b7280'
          nameEl.style.marginBottom = '2px'
          nameEl.textContent = d[nameKey]
          tipDiv.appendChild(nameEl)
        }

        // Category
        if (colorKey && d[colorKey]) {
          const cat = document.createElement('div')
          cat.style.color = getColor(d)
          cat.style.fontWeight = '600'
          cat.textContent = d[colorKey]
          tipDiv.appendChild(cat)
        }

        // X value
        const xRow = document.createElement('div')
        xRow.textContent = `${xAxisLabel}: ${formatX(d[xKey])}`
        tipDiv.appendChild(xRow)

        // Y value
        const yRow = document.createElement('div')
        yRow.textContent = `${yAxisLabel}: ${formatY(d[yKey])}`
        tipDiv.appendChild(yRow)

        tipDiv.style.display = 'block'
      })
      .on('mousemove', function (event) {
        const tipW = tipDiv.offsetWidth
        const tipH = tipDiv.offsetHeight
        let tx = event.clientX + 16
        let ty = event.clientY - tipH / 2
        if (tx + tipW + 12 > window.innerWidth) tx = event.clientX - tipW - 16
        tx = Math.max(12, Math.min(tx, window.innerWidth - tipW - 12))
        ty = Math.max(12, Math.min(ty, window.innerHeight - tipH - 12))
        tipDiv.style.left = `${tx}px`
        tipDiv.style.top = `${ty}px`
      })
      .on('mouseleave', function () {
        d3.select(this).attr('stroke', 'white').attr('stroke-width', 1.5).attr('opacity', 0.85)
        tipDiv.style.display = 'none'
      })

    /* ── permanent labels (top N) ─────────────────────────────────── */
    if (labelThreshold > 0) {
      const ranked = [...data].sort((a, b) => {
        const aVal = sizeKey ? a[sizeKey] : (a[xKey] + a[yKey])
        const bVal = sizeKey ? b[sizeKey] : (b[xKey] + b[yKey])
        return bVal - aVal
      })
      const labelData = ranked.slice(0, labelThreshold)

      const labelFontSize = FS * 0.85
      const labelMaxPx = innerW * 0.85 // beyond this x-position, place label to the left

      // Compute label positions with collision avoidance
      // Strategy: for clustered dots, alternate labels above/below
      const minVGap = labelFontSize + 4

      // First, detect clusters (dots within clusterPx of each other)
      const clusterPx = maxR * 3
      const visited = new Set()
      const clusters = []
      for (let i = 0; i < labelData.length; i++) {
        if (visited.has(i)) continue
        const cluster = [i]
        visited.add(i)
        for (let j = i + 1; j < labelData.length; j++) {
          if (visited.has(j)) continue
          const dx = Math.abs(x(labelData[i][xKey]) - x(labelData[j][xKey]))
          const dy = Math.abs(y(labelData[i][yKey]) - y(labelData[j][yKey]))
          if (dx < clusterPx && dy < clusterPx) {
            cluster.push(j)
            visited.add(j)
          }
        }
        clusters.push(cluster)
      }

      const labelPositions = labelData.map((d) => {
        const cx = x(d[xKey])
        const cy = y(d[yKey])
        const r = getR(d)
        const rightSide = cx <= labelMaxPx
        const labelW = d[labelKey].length * charW
        return {
          d, cx, cy, r,
          lx: rightSide ? cx + r + 4 : cx - r - 4,
          ly: cy - r - 3, // default: above
          anchor: rightSide ? 'start' : 'end',
          labelW,
        }
      })

      // For clusters with 2+ members, alternate above/below
      for (const cluster of clusters) {
        if (cluster.length < 2) continue
        // Sort by y position (top to bottom)
        cluster.sort((a, b) => labelPositions[a].cy - labelPositions[b].cy)
        cluster.forEach((idx, rank) => {
          const lp = labelPositions[idx]
          if (rank % 2 === 0) {
            // Above the dot
            lp.ly = lp.cy - lp.r - 4
          } else {
            // Below the dot
            lp.ly = lp.cy + lp.r + minVGap
          }
        })
      }

      // Clamp labels to chart bounds
      for (const lp of labelPositions) {
        lp.ly = Math.max(labelFontSize, Math.min(lp.ly, innerH - 2))
      }

      g.selectAll('.scatter-label')
        .data(labelPositions)
        .enter()
        .append('text')
        .attr('class', 'scatter-label')
        .attr('x', (lp) => lp.lx)
        .attr('y', (lp) => lp.ly)
        .attr('text-anchor', (lp) => lp.anchor)
        .attr('font-size', `${labelFontSize}px`)
        .attr('fill', 'var(--color-text-secondary)')
        .attr('font-weight', '600')
        .text((lp) => lp.d[labelKey])
        .attr('opacity', 0)
        .transition()
        .delay(animate ? 500 : 0)
        .duration(300)
        .attr('opacity', 1)
    }

    /* ── legend ────────────────────────────────────────────────────── */
    if (categories.length >= 2) {
      const legendY = margin.top + innerH + (isFullscreen ? 80 : 74)
      const legendItems = categories.map((cat) => ({
        label: cat,
        color: colorMap ? (colorMap[cat] || CHART_COLORS[0]) : CHART_COLORS[categories.indexOf(cat) % CHART_COLORS.length],
      }))

      const totalLegendW = legendItems.reduce((s, l) => s + l.label.length * charW + 36, 0)
      let xOff = margin.left + (innerW - totalLegendW) / 2

      const legendG = svg.append('g')
      legendItems.forEach((item) => {
        const ig = legendG.append('g').attr('transform', `translate(${xOff},${legendY})`)
        ig.append('circle')
          .attr('r', 6)
          .attr('cx', 6).attr('cy', 0)
          .attr('fill', item.color)
          .attr('opacity', 0.85)
        ig.append('text')
          .attr('x', 18).attr('y', 5)
          .attr('font-size', `${FS}px`)
          .attr('fill', 'var(--color-text-primary)')
          .text(item.label)
        xOff += item.label.length * charW + 36
      })
    }

    /* ── cleanup ───────────────────────────────────────────────────── */
    return () => {
      document.getElementById(tipId)?.remove()
    }
  }, [data, width, containerHeight, isFullscreen, xKey, yKey, labelKey, nameKey, colorKey, sizeKey, formatX, formatY, colorMap, xLabel, yLabel, labelThreshold, scaleType, animate, getColor, categories])

  return (
    <div ref={containerRef} className="w-full" style={{ minHeight: 380 }}>
      <svg ref={svgRef} className="w-full" role="img" aria-label="Scatter plot chart showing data point distributions across two axes" />
    </div>
  )
}

export default React.memo(ScatterPlotInner)
