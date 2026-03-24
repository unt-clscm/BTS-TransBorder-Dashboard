/**
 * ChordDiagram — D3 chord layout showing bilateral trade flows between states.
 *
 * Props:
 *   data        — Array of { source, target, value } OD pairs
 *   formatValue — Formatter function (default formatCompact)
 *   maxGroups   — Max number of groups per side (default 12)
 *   animate     — Boolean (default true)
 */
import { useRef, useEffect, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { useChartResize } from '@/lib/useChartResize'
import { CHART_COLORS, formatCompact } from '@/lib/chartColors'

export default function ChordDiagram({
  data = [],
  formatValue = formatCompact,
  maxGroups = 12,
  animate = true,
}) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const { width } = useChartResize(containerRef)
  const [tooltip, setTooltip] = useState(null)
  const [hovered, setHovered] = useState(null)

  // Prepare matrix from OD pairs
  const { matrix, names, colorScale } = useMemo(() => {
    if (!data.length) return { matrix: [], names: [], colorScale: () => '#ccc' }

    // Aggregate by source+target
    const pairMap = new Map()
    data.forEach((d) => {
      const key = `${d.source}|${d.target}`
      pairMap.set(key, (pairMap.get(key) || 0) + d.value)
    })

    // Get top groups by total volume
    const srcTotals = new Map()
    const tgtTotals = new Map()
    pairMap.forEach((val, key) => {
      const [s, t] = key.split('|')
      srcTotals.set(s, (srcTotals.get(s) || 0) + val)
      tgtTotals.set(t, (tgtTotals.get(t) || 0) + val)
    })

    const topSources = [...srcTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxGroups).map(([n]) => n)
    const topTargets = [...tgtTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxGroups).map(([n]) => n)
    const allNames = [...new Set([...topSources, ...topTargets])]

    // Build NxN matrix
    const n = allNames.length
    const mat = Array.from({ length: n }, () => Array(n).fill(0))
    const nameIdx = new Map(allNames.map((nm, i) => [nm, i]))

    pairMap.forEach((val, key) => {
      const [s, t] = key.split('|')
      const si = nameIdx.get(s)
      const ti = nameIdx.get(t)
      if (si != null && ti != null) {
        mat[si][ti] += val
      }
    })

    const cs = d3.scaleOrdinal().domain(allNames).range(CHART_COLORS)
    return { matrix: mat, names: allNames, colorScale: cs }
  }, [data, maxGroups])

  // D3 render
  useEffect(() => {
    if (!svgRef.current || !matrix.length || width < 100) return

    const size = Math.min(width, 600)
    const outerRadius = size / 2 - 40
    const innerRadius = outerRadius - 20

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', size).attr('height', size)

    const g = svg.append('g').attr('transform', `translate(${size / 2},${size / 2})`)

    const chordLayout = d3.chord().padAngle(0.04).sortSubgroups(d3.descending)
    const chords = chordLayout(matrix)

    const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius)
    const ribbon = d3.ribbon().radius(innerRadius)

    // Groups (arcs)
    const groupG = g.selectAll('.group')
      .data(chords.groups)
      .join('g')
      .attr('class', 'group')

    groupG.append('path')
      .attr('d', arc)
      .attr('fill', (d) => colorScale(names[d.index]))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        setHovered(d.index)
      })
      .on('mouseout', () => setHovered(null))

    // Group labels
    groupG.append('text')
      .each((d) => { d.angle = (d.startAngle + d.endAngle) / 2 })
      .attr('dy', '0.35em')
      .attr('transform', (d) =>
        `rotate(${(d.angle * 180) / Math.PI - 90}) translate(${outerRadius + 8})${d.angle > Math.PI ? ' rotate(180)' : ''}`
      )
      .attr('text-anchor', (d) => (d.angle > Math.PI ? 'end' : 'start'))
      .attr('font-size', '11px')
      .attr('fill', '#333')
      .text((d) => {
        const name = names[d.index]
        return name.length > 14 ? name.slice(0, 12) + '...' : name
      })

    // Ribbons
    g.selectAll('.ribbon')
      .data(chords)
      .join('path')
      .attr('class', 'ribbon')
      .attr('d', ribbon)
      .attr('fill', (d) => colorScale(names[d.source.index]))
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .style('opacity', 0.7)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        const rect = containerRef.current.getBoundingClientRect()
        setTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top - 12,
          source: names[d.source.index],
          target: names[d.target.index],
          value: matrix[d.source.index][d.target.index],
        })
      })
      .on('mousemove', (event) => {
        const rect = containerRef.current.getBoundingClientRect()
        setTooltip((prev) => prev ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top - 12 } : null)
      })
      .on('mouseout', () => setTooltip(null))

    // Animate entrance
    if (animate) {
      g.selectAll('.ribbon')
        .attr('opacity', 0)
        .transition()
        .duration(600)
        .attr('opacity', 0.7)
    }
  }, [matrix, names, colorScale, width, animate])

  // Hover highlight effect
  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    if (hovered != null) {
      svg.selectAll('.ribbon')
        .transition().duration(150)
        .style('opacity', (d) =>
          d.source.index === hovered || d.target.index === hovered ? 0.85 : 0.08
        )
      svg.selectAll('.group path')
        .transition().duration(150)
        .style('opacity', (d) => d.index === hovered ? 1 : 0.3)
    } else {
      svg.selectAll('.ribbon').transition().duration(150).style('opacity', 0.7)
      svg.selectAll('.group path').transition().duration(150).style('opacity', 1)
    }
  }, [hovered])

  if (!data.length) {
    return <div className="text-center py-8 text-text-secondary">No trade flow data available.</div>
  }

  const size = Math.min(width || 400, 600)

  return (
    <div ref={containerRef} className="relative w-full" style={{ minHeight: size }}>
      <svg ref={svgRef} className="mx-auto" />
      {tooltip && (
        <div
          style={{
            position: 'absolute', left: tooltip.x, top: tooltip.y,
            transform: 'translate(-50%, -100%)', zIndex: 10,
            pointerEvents: 'none', background: 'white', border: '1px solid #d1d5db',
            borderRadius: 6, padding: '6px 10px', fontSize: 13, lineHeight: 1.4,
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)', whiteSpace: 'nowrap',
          }}
        >
          <strong>{tooltip.source}</strong> &rarr; <strong>{tooltip.target}</strong>
          <br />
          ${formatValue(tooltip.value)}
        </div>
      )}
    </div>
  )
}
