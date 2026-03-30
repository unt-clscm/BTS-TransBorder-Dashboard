/**
 * SankeyDiagram — D3 Sankey layout showing trade flows: US State → Port → MX State.
 *
 * Props:
 *   nodes       — Array of { id, name, group } where group is 'us', 'port', or 'mx'
 *   links       — Array of { source, target, value } using node ids
 *   formatValue — Formatter function (default formatCompact)
 *   height      — Chart height (default 500)
 */
import { useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'
import { sankey as d3Sankey, sankeyLinkHorizontal } from 'd3-sankey'
import { useChartResize } from '@/lib/useChartResize'
import { formatCompact } from '@/lib/chartColors'

const GROUP_COLORS = {
  us: '#0056a9',
  port: '#df5c16',
  mx: '#d90d0d',
}

export default function SankeyDiagram({
  nodes = [],
  links = [],
  formatValue = formatCompact,
  height: chartHeight = 500,
  columnHeaders,
  highlightNodes = null,  // Set of node ids to highlight with a distinct border
  highlightColor = '#bf5700',
}) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const { width } = useChartResize(containerRef)
  const [tooltip, setTooltip] = useState(null)
  const [hoveredNode, setHoveredNode] = useState(null)

  useEffect(() => {
    // Use observed width, or fall back to container's measured width
    const effectiveWidth = width || (containerRef.current?.getBoundingClientRect().width ?? 0)
    if (!svgRef.current || !nodes.length || !links.length || effectiveWidth < 200) return

    const margin = { top: 10, right: 120, bottom: 10, left: 120 }
    const w = effectiveWidth - margin.left - margin.right
    const h = chartHeight - margin.top - margin.bottom

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', effectiveWidth).attr('height', chartHeight)

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // Determine column order from groups present in data
    const defaultOrder = ['us', 'port', 'mx']
    const presentGroups = [...new Set(nodes.map((n) => n.group))]
    const groupOrder = defaultOrder.filter((g) => presentGroups.includes(g))
    // Fallback: append any groups not in default order
    presentGroups.forEach((g) => { if (!groupOrder.includes(g)) groupOrder.push(g) })
    const groupIndex = Object.fromEntries(groupOrder.map((g, i) => [g, i]))

    // Build sankey
    const sankeyLayout = d3Sankey()
      .nodeId((d) => d.id)
      .nodeWidth(18)
      .nodePadding(6)
      .nodeAlign((node) => groupIndex[node.group] ?? 0)
      .extent([[0, 0], [w, h]])

    // Deep copy nodes/links to avoid mutation
    const sNodes = nodes.map((n) => ({ ...n }))
    const sLinks = links.map((l) => ({ ...l }))

    let graph
    try {
      graph = sankeyLayout({ nodes: sNodes, links: sLinks })
    } catch {
      return // invalid data
    }

    // Links
    const linkG = g.selectAll('.sankey-link')
      .data(graph.links)
      .join('path')
      .attr('class', 'sankey-link')
      .attr('d', sankeyLinkHorizontal())
      .attr('fill', 'none')
      .attr('stroke', (d) => {
        const sourceColor = GROUP_COLORS[d.source.group] || '#999'
        return d3.color(sourceColor).copy({ opacity: 0.35 })
      })
      .attr('stroke-width', (d) => Math.max(1, d.width))
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        const rect = containerRef.current.getBoundingClientRect()
        setTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top - 12,
          source: d.source.name,
          target: d.target.name,
          value: d.value,
        })
        d3.select(event.currentTarget)
          .attr('stroke', GROUP_COLORS[d.source.group] || '#999')
          .attr('stroke-opacity', 0.7)
      })
      .on('mousemove', (event) => {
        const rect = containerRef.current.getBoundingClientRect()
        setTooltip((prev) => prev ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top - 12 } : null)
      })
      .on('mouseout', (event, d) => {
        setTooltip(null)
        d3.select(event.currentTarget)
          .attr('stroke', d3.color(GROUP_COLORS[d.source.group] || '#999').copy({ opacity: 0.35 }))
          .attr('stroke-opacity', 1)
      })

    // Nodes
    const nodeG = g.selectAll('.sankey-node')
      .data(graph.nodes)
      .join('g')
      .attr('class', 'sankey-node')

    nodeG.append('rect')
      .attr('x', (d) => d.x0)
      .attr('y', (d) => d.y0)
      .attr('width', (d) => d.x1 - d.x0)
      .attr('height', (d) => Math.max(1, d.y1 - d.y0))
      .attr('fill', (d) => highlightNodes?.has(d.id) ? highlightColor : GROUP_COLORS[d.group] || '#999')
      .attr('stroke', (d) => highlightNodes?.has(d.id) ? highlightColor : '#fff')
      .attr('stroke-width', (d) => highlightNodes?.has(d.id) ? 3 : 1)
      .attr('rx', 2)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        setHoveredNode(d.id)
        const rect = containerRef.current.getBoundingClientRect()
        const total = (d.sourceLinks || []).reduce((s, l) => s + l.value, 0)
          + (d.targetLinks || []).reduce((s, l) => s + l.value, 0)
        setTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top - 12,
          source: d.name,
          target: null,
          value: total / (d.sourceLinks?.length && d.targetLinks?.length ? 2 : 1),
        })
      })
      .on('mouseout', () => {
        setHoveredNode(null)
        setTooltip(null)
      })

    // Node labels — first column labels go left, last column labels go right
    const firstGroup = groupOrder[0]
    const lastGroup = groupOrder[groupOrder.length - 1]
    nodeG.append('text')
      .attr('x', (d) => {
        if (d.group === firstGroup) return d.x0 - 6   // left of bar
        if (d.group === lastGroup) return d.x1 + 6    // right of bar
        return d.x1 + 6                               // middle columns: right of bar
      })
      .attr('y', (d) => (d.y0 + d.y1) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d) => d.group === firstGroup ? 'end' : 'start')
      .attr('font-size', '11px')
      .attr('fill', '#333')
      .text((d) => {
        const name = d.name
        return name.length > 22 ? name.slice(0, 20) + '...' : name
      })

    // Column headers
    const headerY = -2
    const defaultHeaders = { us: 'U.S. States', port: 'Border Ports', mx: 'Mexican States' }
    const headers = columnHeaders || groupOrder.map((g) => defaultHeaders[g] || g)
    const colCount = headers.length
    headers.forEach((label, i) => {
      const x = colCount === 1 ? 0 : (i / (colCount - 1)) * w
      g.append('text')
        .attr('x', x)
        .attr('y', headerY)
        .attr('text-anchor', i === 0 ? 'start' : i === colCount - 1 ? 'end' : 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', 600)
        .attr('fill', '#666')
        .text(label)
    })
  }, [nodes, links, width, chartHeight])

  // Hover highlight
  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    if (hoveredNode != null) {
      svg.selectAll('.sankey-link')
        .transition().duration(100)
        .attr('stroke-opacity', (d) =>
          d.source.id === hoveredNode || d.target.id === hoveredNode ? 0.8 : 0.08
        )
    } else {
      svg.selectAll('.sankey-link')
        .transition().duration(100)
        .attr('stroke-opacity', 1)
    }
  }, [hoveredNode])

  if (!nodes.length || !links.length) {
    return <div className="text-center py-8 text-text-secondary">No trade flow data available.</div>
  }

  return (
    <div ref={containerRef} className="relative w-full" style={{ minHeight: chartHeight }}>
      <svg ref={svgRef} style={{ overflow: 'visible' }} />
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
          {tooltip.target ? (
            <>
              <strong>{tooltip.source}</strong> &rarr; <strong>{tooltip.target}</strong>
              <br />
            </>
          ) : (
            <>
              <strong>{tooltip.source}</strong>
              <br />
            </>
          )}
          ${formatValue(tooltip.value)}
        </div>
      )}
    </div>
  )
}
