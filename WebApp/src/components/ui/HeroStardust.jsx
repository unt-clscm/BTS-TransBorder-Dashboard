import { useEffect, useRef } from 'react'

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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    // Check prefers-reduced-motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const prefersReduced = motionQuery.matches

    // Size canvas to container
    function resize() {
      const parent = canvas.parentElement
      if (!parent) return
      const dpr = window.devicePixelRatio || 1
      const rect = parent.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const W = () => (canvas.parentElement?.getBoundingClientRect().width || canvas.width)
    const H = () => (canvas.parentElement?.getBoundingClientRect().height || canvas.height)

    // Seeded PRNG for deterministic layout per page
    let s = seed
    const rand = () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647 }

    const COUNT = tall ? 500 : 250
    const particles = []
    const initW = W()
    const initH = H()
    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: rand() * initW,
        y: rand() * initH,
        r: 0.5 + rand() * 1.8,
        speed: 0.12 + rand() * 0.35,
        opacity: 0.06 + rand() * 0.18,
        drift: (rand() - 0.5) * 0.15,
      })
    }

    // Static render (no animation requested or reduced motion)
    function drawStatic() {
      const w = W()
      const h = H()
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${p.opacity})`
        ctx.fill()
      }
    }

    if (!animate || prefersReduced) {
      drawStatic()
      // Still listen for resize to redraw static particles
      const ro = new ResizeObserver(() => { resize(); drawStatic() })
      if (canvas.parentElement) ro.observe(canvas.parentElement)
      return () => ro.disconnect()
    }

    let raf
    function draw() {
      const w = W()
      const h = H()
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        p.x += p.speed
        p.y += Math.sin(p.x * 0.003 + p.drift * 10) * 0.3
        if (p.x > w + 10) { p.x = -10; p.y = (p.y + h * 0.3 * (Math.random() - 0.5)) % h; if (p.y < 0) p.y += h }
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${p.opacity})`
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    draw()

    // Pause animation if user changes reduced-motion preference mid-session
    const handleMotionChange = (e) => {
      if (e.matches) {
        cancelAnimationFrame(raf)
        drawStatic()
      } else {
        draw()
      }
    }
    motionQuery.addEventListener('change', handleMotionChange)

    // Resize observer to keep canvas dimensions in sync
    const ro = new ResizeObserver(() => resize())
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    return () => {
      cancelAnimationFrame(raf)
      motionQuery.removeEventListener('change', handleMotionChange)
      ro.disconnect()
    }
  }, [seed, animate, tall])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: 'none' }}
      aria-hidden="true"
    />
  )
}
