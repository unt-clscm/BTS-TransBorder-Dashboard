import { useEffect, useRef } from 'react'

const W = 2400

/**
 * Flowing Particle Field hero background.
 * Hundreds of tiny dots drift across the banner like a current of goods.
 * Uses canvas for smooth 60fps animation.
 *
 * @param {number}  seed    - PRNG seed for deterministic initial positions
 * @param {boolean} animate - When false, particles are static
 * @param {boolean} tall    - Use taller canvas (overview hero)
 */
export default function HeroStardust({ seed = 7, animate = true, tall = false }) {
  const canvasRef = useRef(null)
  const H = tall ? 800 : 200

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = W
    canvas.height = H

    // Seeded PRNG for deterministic layout per page
    let s = seed
    const rand = () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647 }

    const COUNT = tall ? 500 : 250
    const particles = []
    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: rand() * W,
        y: rand() * H,
        r: 0.5 + rand() * 1.8,
        speed: 0.12 + rand() * 0.35,
        opacity: 0.06 + rand() * 0.18,
        drift: (rand() - 0.5) * 0.15,
      })
    }

    if (!animate) {
      // Static render
      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${p.opacity})`
        ctx.fill()
      }
      return
    }

    let raf
    function draw() {
      ctx.clearRect(0, 0, W, H)
      for (const p of particles) {
        p.x += p.speed
        p.y += Math.sin(p.x * 0.003 + p.drift * 10) * 0.3
        if (p.x > W + 10) { p.x = -10; p.y = (p.y + H * 0.3 * (Math.random() - 0.5)) % H; if (p.y < 0) p.y += H }
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${p.opacity})`
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [seed, H, animate])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: 'none' }}
      aria-hidden="true"
    />
  )
}
