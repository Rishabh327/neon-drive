import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { advance } from '@react-three/fiber'
import { useExperience } from '../store'

gsap.registerPlugin(ScrollTrigger)

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
 * One clock for everything: GSAP's ticker drives Lenis, and the same tick
 * publishes the master progress value to the store. The R3F canvas reads it
 * in its own frame loop (same rAF), so camera, overlay and ScrollTriggers
 * never disagree about where we are.
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
    lenis.on('scroll', ScrollTrigger.update)

    let last = lenis.progress || 0
    let velocity = 0
    const tick = (time: number, deltaMs: number) => {
      lenis.raf(time * 1000)
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
      advance(time) // seconds: R3F computes delta as timestamp − elapsedTime
    }
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
      lenisInstance = null
    }
  }, [])
}
