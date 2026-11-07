import { useMemo } from 'react'

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

/**
 * Static neon city for simple mode: two layers of skyline silhouettes with lit
 * windows, a few roofline neon strips and a wet-street glow. Pure SVG + CSS —
 * works without WebGL and never moves.
 */
export function CityBackdrop() {
  const layers = useMemo(() => {
    const r = rng(42)
    const make = (count: number, minH: number, maxH: number, y0: number) => {
      const out: { x: number; w: number; h: number; neon: string | null; windows: [number, number, string][] }[] = []
      let x = -20
      for (let i = 0; i < count && x < 1620; i++) {
        const w = 40 + r() * 70
        const h = minH + r() * (maxH - minH)
        const neon = r() < 0.18 ? (r() < 0.6 ? '#ff2a6d' : '#05d9e8') : null
        const windows: [number, number, string][] = []
        for (let wy = y0 - h + 12; wy < y0 - 10; wy += 14)
          for (let wx = x + 6; wx < x + w - 8; wx += 11) {
            const v = r()
            if (v < 0.22) windows.push([wx, wy, v < 0.03 ? '#ff2a6d' : v < 0.07 ? '#05d9e8' : '#ffb36b'])
          }
        out.push({ x, w, h, neon, windows })
        x += w + 2 + r() * 10
      }
      return out
    }
    return { back: make(60, 180, 460, 720), front: make(50, 80, 300, 760) }
  }, [])

  return (
    <div className="city-backdrop pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      <svg viewBox="0 0 1600 800" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#05060f" />
            <stop offset="0.65" stopColor="#0b0b22" />
            <stop offset="1" stopColor="#1a0820" />
          </linearGradient>
          <linearGradient id="street" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff2a6d" stopOpacity="0.25" />
            <stop offset="1" stopColor="#05060f" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="1600" height="800" fill="url(#sky)" />
        <g opacity="0.55">
          {layers.back.map((b, i) => (
            <g key={i}>
              <rect x={b.x} y={720 - b.h} width={b.w} height={b.h} fill="#0a0b1a" />
              {b.windows.map(([x, y, c], j) => (
                <rect key={j} x={x} y={y} width="5" height="7" fill={c} opacity="0.55" />
              ))}
            </g>
          ))}
        </g>
        <g>
          {layers.front.map((b, i) => (
            <g key={i}>
              <rect x={b.x} y={760 - b.h} width={b.w} height={b.h} fill="#06070f" />
              {b.neon && <rect x={b.x} y={760 - b.h} width={b.w} height="3" fill={b.neon} className="neon-strip" />}
              {b.windows.map(([x, y, c], j) => (
                <rect key={j} x={x} y={y + 40} width="5" height="7" fill={c} opacity="0.8" />
              ))}
            </g>
          ))}
        </g>
        <rect y="760" width="1600" height="40" fill="url(#street)" />
        <rect y="759" width="1600" height="1.5" fill="#05d9e8" opacity="0.6" />
      </svg>
      <div className="absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_100%,rgba(123,44,255,0.18),transparent_70%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-night/40 via-night/60 to-night/85" />
    </div>
  )
}
