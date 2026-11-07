import { useRef } from 'react'
import { useExperience } from '../store'
import { REGEN } from '../data/profile'
import { useProgressEffect } from './useProgress'
import { window4 } from '../experience/beat'
import { recoveredWh, socPercent, speedKmh, WH_PER_KM } from '../experience/regenModel'

/** Regen-braking live demo panel (70–78%). Numbers are written straight to the DOM per frame. */
export function RegenHud() {
  const regenOn = useExperience((s) => s.regenOn)
  const setRegen = useExperience((s) => s.setRegen)
  const root = useRef<HTMLDivElement>(null)
  const speed = useRef<HTMLSpanElement>(null)
  const soc = useRef<HTMLSpanElement>(null)
  const socBar = useRef<HTMLSpanElement>(null)
  const wh = useRef<HTMLSpanElement>(null)
  const heat = useRef<HTMLSpanElement>(null)
  const range = useRef<HTMLSpanElement>(null)

  useProgressEffect((p) => {
    const el = root.current
    if (!el) return
    const o = window4(p, 0.698, 0.712, 0.79, 0.805)
    el.style.visibility = o > 0.01 ? 'visible' : 'hidden'
    el.style.opacity = o.toFixed(3)
    el.style.transform = `translate3d(0, ${((1 - o) * 16).toFixed(1)}px, 0)`
    const on = useExperience.getState().regenOn
    const e = recoveredWh(p, on)
    const s = socPercent(p, on)
    if (speed.current) speed.current.textContent = speedKmh(p).toFixed(0)
    if (soc.current) soc.current.textContent = s.toFixed(2)
    // the bar shows the gained slice magnified (0 → +0.15 %)
    if (socBar.current) socBar.current.style.transform = `scaleX(${Math.min(1, (s - REGEN.startSoC * 100) / 0.15).toFixed(4)})`
    if (wh.current) wh.current.textContent = e.regen.toFixed(1)
    if (heat.current) heat.current.textContent = e.heat.toFixed(1)
    if (range.current) range.current.textContent = ((e.regen / WH_PER_KM) * 1000).toFixed(0)
  })

  return (
    <div ref={root} className="fixed inset-x-0 bottom-[11vh] z-20 flex justify-center px-4" style={{ visibility: 'hidden' }}>
      <section className="hud regen-panel w-full max-w-3xl px-5 py-4 sm:px-7" aria-labelledby="regen-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="regen-title" className="font-mono text-[11px] tracking-[0.35em] text-cyan uppercase">
            Live demo · regenerative braking
          </h2>
          <button
            role="switch"
            aria-checked={regenOn}
            onClick={() => setRegen(!regenOn)}
            className={`regen-toggle font-mono text-xs tracking-[0.2em] uppercase ${regenOn ? 'is-on' : ''}`}
          >
            <span className="regen-knob" aria-hidden="true" />
            Regen {regenOn ? 'on' : 'off'}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="hud-label">Speed</p>
            <p className="hud-value">
              <span ref={speed}>80</span>
              <small> km/h</small>
            </p>
          </div>
          <div className="col-span-1 sm:col-span-1">
            <p className="hud-label">Battery SoC</p>
            <p className="hud-value">
              <span ref={soc}>{(REGEN.startSoC * 100).toFixed(2)}</span>
              <small> %</small>
            </p>
            <span className="mt-1 block h-1.5 w-full overflow-hidden bg-cyan/15" aria-hidden="true">
              <span ref={socBar} className="block h-full origin-left bg-cyan shadow-[0_0_10px_#05d9e8]" style={{ transform: 'scaleX(0)' }} />
            </span>
          </div>
          <div>
            <p className="hud-label">Back into the pack</p>
            <p className="hud-value text-cyan">
              <span ref={wh}>0.0</span>
              <small> Wh</small>
            </p>
            <p className="font-mono text-[11px] text-haze/70">
              ≈ <span ref={range}>0</span> m of range
            </p>
          </div>
          <div>
            <p className="hud-label">Lost as brake heat</p>
            <p className="hud-value text-[#ff7a45]">
              <span ref={heat}>0.0</span>
              <small> Wh</small>
            </p>
          </div>
        </div>

        <p className="mt-4 text-[13px] leading-snug text-haze/90">
          One stop from {REGEN.brakeFromKmh} km/h in a {REGEN.massKg.toLocaleString()} kg EV. With regen on, the motor
          works as a generator and returns ~{Math.round(REGEN.efficiency * 100)}% of the kinetic energy; with it off, all of
          it becomes heat. My{' '}
          <a className="text-cyan underline-offset-4 hover:underline" href={`https://github.com/Rishabh327/${REGEN.repo}`} target="_blank" rel="noreferrer">
            Software Defined Vehicles digital twin
          </a>{' '}
          runs this over a whole drive cycle.
        </p>
      </section>
    </div>
  )
}
