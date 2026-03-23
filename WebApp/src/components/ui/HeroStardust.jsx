import { useMemo } from 'react'

const PLANE_R = 16 // plane bounding radius at scale 1.0
const PLANE_PATH =
  'M0-16 C1.2-16 1.8-14.4 1.8-11.2 L1.8 0 L13.2 8 L13.2 11.2 L1.8 5.6 L1.8 20 L5.4 24 L5.4 26.4 L0 23.2 L-5.4 26.4 L-5.4 24 L-1.8 20 L-1.8 5.6 L-13.2 11.2 L-13.2 8 L-1.8 0 L-1.8-11.2 C-1.8-14.4-1.2-16 0-16Z'
const DEG2RAD = Math.PI / 180
const W = 2400, DEFAULT_H = 200
const MARGIN = 30 // extra space so plane fully exits before wrapping

/**
 * Find how far along heading (hx,hy) from (px,py) until exiting the padded box.
 * Returns smallest positive t where the ray leaves [-MARGIN, W+MARGIN] × [-MARGIN, H+MARGIN].
 */
function rayExit(px, py, hx, hy, h) {
  let tMin = Infinity
  if (hx > 0) tMin = Math.min(tMin, (W + MARGIN - px) / hx)
  else if (hx < 0) tMin = Math.min(tMin, (-MARGIN - px) / hx)
  if (hy > 0) tMin = Math.min(tMin, (h + MARGIN - py) / hy)
  else if (hy < 0) tMin = Math.min(tMin, (-MARGIN - py) / hy)
  return tMin === Infinity ? 300 : tMin // fallback for perfectly axis-aligned edge cases
}

/**
 * Stardust airplane background overlay for hero banners.
 * Renders a field of tiny scattered airplane silhouettes with optional jet trails.
 * Uses a seeded PRNG + jittered grid for deterministic, non-overlapping placement.
 *
 * When `animate` is true, each plane flies in a straight line along its heading
 * from one edge of the banner to the opposite edge, entering and exiting cleanly.
 *
 * @param {number} seed - PRNG seed for unique pattern per page
 * @param {boolean} animate - Enable straight-line flight animation (home page only)
 */
export default function HeroStardust({ seed = 7, animate = false, tall = false }) {
  const H = tall ? 800 : DEFAULT_H
  const planes = useMemo(() => {
    let s = seed
    const rand = () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647 }

    const GAP = 3
    const cellSize = 24
    const cols = Math.floor(W / cellSize)
    const rows = Math.floor(H / cellSize)
    const cellW = W / cols, cellH = H / rows
    const result = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rand() < 0.12) continue
        const maxScale = (Math.min(cellW, cellH) / 2 - GAP) / PLANE_R
        const t = rand()
        const scale = t < 0.70 ? 0.10 + rand() * 0.12
                    : t < 0.92 ? 0.22 + rand() * 0.15
                    :            0.37 + rand() * (maxScale - 0.37)
        const pad = PLANE_R * scale + GAP
        const xRange = cellW - 2 * pad
        const yRange = cellH - 2 * pad
        if (xRange <= 0 || yRange <= 0) continue
        const x = c * cellW + pad + rand() * xRange
        const y = r * cellH + pad + rand() * yRange
        const rotation = Math.floor(rand() * 360)
        const opacity = t < 0.70 ? 0.04 + rand() * 0.05
                      : t < 0.92 ? 0.07 + rand() * 0.07
                      :            0.12 + rand() * 0.10
        const trail = t >= 0.70 && rand() < 0.15
          ? 20 + Math.floor(rand() * 40)
          : 0

        // Edge-to-edge flight path along heading direction
        const rad = rotation * DEG2RAD
        const hx = Math.sin(rad)
        const hy = -Math.cos(rad)
        // Distance backward to entry edge, forward to exit edge
        const tBack = rayExit(x, y, -hx, -hy, H)
        const tFwd = rayExit(x, y, hx, hy, H)
        const totalDist = tBack + tFwd
        // Translate offsets (additive to the base translate(x,y))
        const startX = +(-tBack * hx).toFixed(1)
        const startY = +(-tBack * hy).toFixed(1)
        const endX = +(tFwd * hx).toFixed(1)
        const endY = +(tFwd * hy).toFixed(1)
        // Speed: wide spread so every plane feels unique (halved for gentle drift)
        // Trails = slightly faster (7.5–14 u/s), no trail = slow cruise (4–11 u/s)
        const speed = trail
          ? 7.5 + rand() * 6.5
          : 4 + rand() * 7
        const flyDur = Math.round(totalDist / speed)
        // Negative begin so each plane starts mid-flight (stagger)
        const flyBegin = -Math.floor(rand() * Math.max(flyDur, 1))

        result.push({ x: Math.round(x), y: Math.round(y), scale: +scale.toFixed(2), rotation, opacity: +opacity.toFixed(3), trail, flyDur, flyBegin, startX, startY, endX, endY })
      }
    }
    return result
  }, [seed, H])

  // Unique IDs so multiple instances don't clash
  const planeId = `plane-${seed}`
  const gradId = `trail-fade-${seed}`

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      overflow={animate ? 'visible' : undefined}
    >
      <defs>
        <path id={planeId} d={PLANE_PATH} />
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.6" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      {planes.map((p, i) => (
        <g key={i} transform={`translate(${p.x},${p.y})`}>
          {animate && (
            <animateTransform
              attributeName="transform"
              type="translate"
              values={`${p.startX},${p.startY};${p.endX},${p.endY}`}
              dur={`${p.flyDur}s`}
              begin={`${p.flyBegin}s`}
              repeatCount="indefinite"
              additive="sum"
              calcMode="linear"
            />
          )}
          {p.trail > 0 && (
            <rect
              x={-1}
              y={0}
              width={2}
              height={p.trail}
              rx={1}
              fill={`url(#${gradId})`}
              opacity={0.15}
              transform={`rotate(${p.rotation}) translate(0,${PLANE_R * p.scale})`}
            />
          )}
          <g transform={`rotate(${p.rotation}) scale(${p.scale})`}>
            <use href={`#${planeId}`} fill="white" opacity={p.opacity} />
          </g>
        </g>
      ))}
    </svg>
  )
}
