import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { SKILLS, TIER_LABEL, type Tier } from '../data/profile'
import { useProgressEffect } from './useProgress'
import { range, window4 } from '../experience/beat'

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

/**
 * The windshield becomes a HUD. A GSAP timeline (paused) is scrubbed by scroll
 * progress — no ScrollTrigger needed, one source of truth.
 */
export function SkillsHud() {
  const root = useRef<HTMLDivElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)

  useEffect(() => {
    const el = root.current!
    const ctx = gsap.context(() => {
      tl.current = gsap
        .timeline({ paused: true, defaults: { ease: 'power2.out' } })
        .from('.hud-frame', { scaleX: 0.2, opacity: 0, duration: 0.25 })
        .from('.hud-title', { y: -12, opacity: 0, duration: 0.2 }, '-=0.1')
        .from('.hud-group', { y: 24, opacity: 0, stagger: 0.07, duration: 0.3 }, '-=0.05')
        .from('.hud-legend', { opacity: 0, duration: 0.2 }, '-=0.1')
    }, el)
    return () => ctx.revert()
  }, [])

  useProgressEffect((p) => {
    const el = root.current
    if (!el) return
    const o = window4(p, IN_A, IN_B, OUT_C, OUT_D)
    el.style.visibility = o > 0.01 ? 'visible' : 'hidden'
    el.style.opacity = String(Math.min(1, o * 1.4))
    tl.current?.progress(range(p, IN_A, 0.66))
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
