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
}) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const { width } = useChartResize(containerRef)
  const [tooltip, setTooltip] = useState(null)
  const [hoveredNode, setHoveredNode] = useState(null)

  useEffect(() => {
    if (!svgRef.current || !nodes.length || !links.length || width < 200) return

    const margin = { top: 10, right: 10, bottom: 10, left: 10 }
    const w = width - margin.left - margin.right
    const h = chartHeight - margin.top - margin.bottom

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', chartHeight)

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // Build sankey
    const sankeyLayout = d3Sankey()
      .nodeId((d) => d.id)
      .nodeWidth(18)
      .nodePadding(6)
      .nodeAlign((node, n) => {
        // Force 3-column layout: us=0, port=1, mx=2
        if (node.group === 'us') return 0
        if (node.group === 'port') return 1
        return 2
      })
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
      .attr('fill', (d) => GROUP_COLORS[d.group] || '#999')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
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

    // Node labels
    nodeG.append('text')
      .attr('x', (d) => d.group === 'mx' ? d.x0 - 6 : d.x1 + 6)
      .attr('y', (d) => (d.y0 + d.y1) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d) => d.group === 'mx' ? 'end' : 'start')
      .attr('font-size', '11px')
      .attr('fill', '#333')
      .text((d) => {
        const name = d.name
        return name.length > 18 ? name.slice(0, 16) + '...' : name
      })

    // Column headers
    const headerY = -2
    const cols = [
      { label: 'U.S. States', x: 0 },
      { label: 'Border Ports', x: w / 2 },
      { label: 'Mexican States', x: w },
    ]
    cols.forEach((col) => {
      g.append('text')
        .attr('x', col.x)
        .attr('y', headerY)
        .attr('text-anchor', col.x === 0 ? 'start' : col.x === w ? 'end' : 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', 600)
        .attr('fill', '#666')
        .text(col.label)
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
      <svg ref={svgRef} />
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
