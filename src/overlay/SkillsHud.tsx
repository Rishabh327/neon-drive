import { useEffect, useRef } from 'react'
import { SKILLS, TIER_LABEL, type Tier } from '../data/profile'
import { useProgressEffect } from './useProgress'
import { range, window4 } from '../lib/timing'

/** Beat window (scroll progress) for the HUD. */
const IN_A = 0.618
const IN_B = 0.64
const OUT_C = 0.692
const OUT_D = 0.708

function TierBar({ tier }: { tier: Tier }) {
  return (
    <span className="flex gap-[3px]" aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <span key={n} className={`h-2 w-4 skew-x-[-20deg] ${n <= tier ? 'bg-cyan shadow-[0_0_8px_#05d9e8]' : 'bg-cyan/15'}`} />
      ))}
    </span>
  )
}

const easeOut = (t: number) => 1 - (1 - t) * (1 - t)

/** One staggered reveal step: element animates over [start, start + dur] of the local timeline (0 → 1). */
interface Step {
  el: HTMLElement
  start: number
  dur: number
  apply: (el: HTMLElement, k: number) => void
}

/**
 * The windshield becomes a HUD. Its staggered reveal is a tiny timeline that is
 * scrubbed by scroll progress — reversible, no animation library.
 */
export function SkillsHud() {
  const root = useRef<HTMLDivElement>(null)
  const steps = useRef<Step[]>([])

  useEffect(() => {
    const el = root.current!
    const q = <T extends HTMLElement>(sel: string) => [...el.querySelectorAll<T>(sel)]
    const fade = (dy: number) => (e: HTMLElement, k: number) => {
      e.style.opacity = k.toFixed(3)
      e.style.transform = `translate3d(0, ${((1 - k) * dy).toFixed(1)}px, 0)`
    }
    steps.current = [
      ...q('.hud-frame').map((e) => ({ el: e, start: 0, dur: 0.25, apply: (x: HTMLElement, k: number) => ((x.style.opacity = k.toFixed(3)), (x.style.transform = `scaleX(${(0.2 + 0.8 * k).toFixed(3)})`)) })),
      ...q('.hud-title').map((e) => ({ el: e, start: 0.15, dur: 0.2, apply: fade(-12) })),
      ...q('.hud-group').map((e, i) => ({ el: e, start: 0.3 + i * 0.07, dur: 0.3, apply: fade(24) })),
      ...q('.hud-legend').map((e) => ({ el: e, start: 0.85, dur: 0.15, apply: fade(0) })),
    ]
  }, [])

  useProgressEffect((p) => {
    const el = root.current
    if (!el) return
    const o = window4(p, IN_A, IN_B, OUT_C, OUT_D)
    el.style.visibility = o > 0.01 ? 'visible' : 'hidden'
    el.style.opacity = String(Math.min(1, o * 1.4))
    const t = range(p, IN_A, 0.66)
    for (const st of steps.current) st.apply(st.el, easeOut(Math.min(1, Math.max(0, (t - st.start) / st.dur))))
  })

  return (
    <div ref={root} className="pointer-events-none fixed inset-x-0 top-[9vh] z-20 flex justify-center px-4" style={{ visibility: 'hidden' }}>
      <div className="hud w-full max-w-5xl">
        <div className="hud-frame relative px-5 pt-4 pb-5 sm:px-8">
          <h2 className="hud-title text-center font-mono text-[11px] tracking-[0.4em] text-cyan uppercase sm:text-xs">
            ◢ Systems check — skills ◣
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
            {SKILLS.map((g) => (
              <section key={g.id} className="hud-group" aria-label={g.label}>
                <h3 className="font-display border-b border-cyan/30 pb-1 text-sm font-bold tracking-[0.2em] text-white uppercase">
                  {g.label}
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {g.items.map((it) => (
                    <li key={it.name} className="flex items-center justify-between gap-3 font-mono text-[12px] text-haze">
                      <span className="truncate">{it.name}</span>
                      <span className="flex items-center gap-2">
                        <TierBar tier={it.tier} />
                        <span className="sr-only">{TIER_LABEL[it.tier]}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <p className="hud-legend mt-4 flex flex-wrap justify-center gap-x-6 gap-y-1 font-mono text-[11px] text-haze/80" aria-hidden="true">
            {([3, 2, 1] as Tier[]).map((t) => (
              <span key={t} className="flex items-center gap-2">
                <TierBar tier={t} /> {TIER_LABEL[t]}
              </span>
            ))}
          </p>
        </div>
      </div>
    </div>
  )
}
