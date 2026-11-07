import { useEffect } from 'react'
import Lenis from 'lenis'
import { runRenderFrame } from '../lib/frameDriver'
import { useExperience } from '../store'

let lenisInstance: Lenis | null = null
/** Imperative access for "skip to contact", "replay drive", etc. */
export const getLenis = () => lenisInstance

/** Scroll to a progress value (0 → 1) along the drive. */
export function scrollToProgress(p: number, opts: { duration?: number; immediate?: boolean } = {}) {
  const lenis = lenisInstance
  if (!lenis) return
  lenis.scrollTo(p * lenis.limit, { duration: opts.duration ?? 2.5, immediate: opts.immediate })
}

/**
 * One clock for everything: a single requestAnimationFrame loop drives Lenis,
 * publishes the master progress value to the store, and renders the R3F frame
 * on the same tick (frameloop="never") — camera and overlay never disagree.
 * (GSAP/ScrollTrigger were dropped: every animation is a pure function of
 * progress, so a library clock added ~32 KB and nothing else.)
 */
export function useSmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const lenis = new Lenis({
      lerp: reduced ? 1 : 0.085,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.4,
      smoothWheel: !reduced,
    })
    lenisInstance = lenis

    // Every visit starts at the top of the drive; scrolling is locked until IGNITION.
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    if (!useExperience.getState().started) lenis.stop()
    const unsubStart = useExperience.subscribe((s, prev) => {
      if (s.started && !prev.started) lenis.start()
      // freeze the drive while a detail panel is open
      const open = !!(s.openProject || s.openRepo)
      const wasOpen = !!(prev.openProject || prev.openRepo)
      if (open && !wasOpen) lenis.stop()
      if (!open && wasOpen && s.started) lenis.start()
    })

    let last = lenis.progress || 0
    let velocity = 0
    const tick = (time: number, deltaMs: number) => {
      lenis.raf(time * 1000)
      // (time in seconds)
      const p = Math.min(1, Math.max(0, lenis.progress || 0))
      const dt = Math.max(deltaMs, 1) / 1000
      const instant = (p - last) / dt
      // critically-damped-ish smoothing so speed effects don't jitter
      velocity += (instant - velocity) * Math.min(1, dt * 8)
      if (Math.abs(velocity) < 1e-5) velocity = 0
      const s = useExperience.getState()
      if (p !== s.progress || velocity !== s.velocity) s.setScroll(p, velocity)
      last = p
      // Render the 3D frame on this same tick (Canvas uses frameloop="never"),
      // so the camera always sees this frame's progress — zero cross-loop jitter.
      runRenderFrame(time) // seconds — registered by the 3D chunk (R3F advance)
    }
    let raf = 0
    let prevNow = performance.now()
    const loop = (now: number) => {
      tick(now / 1000, now - prevNow)
      prevNow = now
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      unsubStart()
      lenis.destroy()
      lenisInstance = null
    }
  }, [])
}
