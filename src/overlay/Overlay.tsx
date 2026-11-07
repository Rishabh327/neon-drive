import { useEffect, useRef } from 'react'
import { AboutLayer, ContactLayer, DistrictLayer, HeroLayer, IgnitionLayer, ProjectsLayer, RooftopLayer } from './Layers'
import { ProjectCards } from './ProjectCards'
import { SkillsHud } from './SkillsHud'
import { RegenHud } from './RegenHud'
import { SECTIONS, SCROLL_LENGTH_VH } from '../data/sections'
import { useExperience } from '../store'
import { scrollToProgress } from '../hooks/useSmoothScroll'

function useScrollLength() {
  const mobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  return mobile ? SCROLL_LENGTH_VH.mobile : SCROLL_LENGTH_VH.desktop
}

/**
 * The scroll track: a tall, empty document whose scroll position drives
 * everything. Anchors per beat make deep links / "skip to" work. The visible
 * HTML lives in fixed layers below, in story order (screen-reader order too).
 */
export function Overlay() {
  const length = useScrollLength()
  const travel = length - 100 // scrollable distance in vh
  return (
    <>
      <div className="relative" style={{ height: `${length}vh` }} aria-hidden="true">
        {SECTIONS.map((s) => (
          <span key={s.id} id={`at-${s.id}`} className="absolute left-0 h-px w-px" style={{ top: `${s.start * travel}vh` }} />
        ))}
      </div>
      <main className="contents">
        <HeroLayer />
        <IgnitionLayer />
        <AboutLayer />
        <ProjectsLayer />
        <ProjectCards />
        <SkillsHud />
        <RegenHud />
        <DistrictLayer />
        <RooftopLayer />
        <ContactLayer />
      </main>
    </>
  )
}

export function TopBar() {
  const active = useExperience((s) => s.activeSection)
  const district = SECTIONS.find((s) => s.id === active)?.district
  return (
    <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-4 sm:px-8">
      <button
        onClick={() => scrollToProgress(0)}
        className="font-display text-xl font-bold tracking-widest text-white"
        aria-label="Back to start"
      >
        RJ
      </button>
      <p className="font-mono text-xs tracking-[0.25em] text-haze uppercase" aria-live="polite">
        <span className="text-magenta">●</span> {district}
      </p>
      <button
        onClick={() => scrollToProgress(1, { duration: 3 })}
        className="font-mono text-xs tracking-[0.2em] text-cyan uppercase hover:text-white"
      >
        Skip to contact →
      </button>
    </header>
  )
}

/** Odometer-style progress bar. Written directly to the DOM via a transient subscription. */
export function ProgressBar() {
  const bar = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)
  useEffect(
    () =>
      useExperience.subscribe((s) => {
        if (bar.current) bar.current.style.transform = `scaleX(${s.progress})`
        if (label.current) label.current.textContent = `${(s.progress * 100).toFixed(1).padStart(5, '0')} km`
      }),
    [],
  )
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 px-4 pb-4 sm:px-8" aria-hidden="true">
      <div className="mb-1 flex justify-end">
        <span ref={label} className="font-mono text-[10px] tracking-widest text-cyan">
          000.0 km
        </span>
      </div>
      <div className="h-px w-full bg-white/10">
        <div
          ref={bar}
          className="h-full origin-left bg-gradient-to-r from-cyan via-violet to-magenta shadow-[0_0_12px_#05d9e8]"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>
    </div>
  )
}

export function DebugHud() {
  const progress = useRef<HTMLSpanElement>(null)
  useEffect(
    () =>
      useExperience.subscribe((s) => {
        if (progress.current)
          progress.current.textContent = `p ${s.progress.toFixed(4)} · v ${s.velocity.toFixed(3)} · ${s.activeSection}`
      }),
    [],
  )
  return (
    <div className="fixed top-14 left-4 z-30 rounded bg-black/60 px-2 py-1 font-mono text-[11px] leading-5 text-acid sm:left-8">
      <div id="debug-fps">— fps</div>
      <span ref={progress} />
    </div>
  )
}
