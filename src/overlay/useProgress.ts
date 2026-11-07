import { useEffect, useRef } from 'react'
import { useExperience } from '../store'
import { window4 } from '../experience/beat'

/** Run `cb(progress)` on every scroll update without re-rendering React. */
export function useProgressEffect(cb: (p: number) => void) {
  const ref = useRef(cb)
  ref.current = cb
  useEffect(() => {
    ref.current(useExperience.getState().progress)
    return useExperience.subscribe((s, prev) => {
      if (s.progress !== prev.progress) ref.current(s.progress)
    })
  }, [])
}

/**
 * Fades an element in over a→b and out over c→d (scroll progress), with a small
 * rise. Hidden elements get visibility:hidden so they leave the tab order.
 */
export function useBeatFade<T extends HTMLElement>(a: number, b: number, c: number, d: number, rise = 14) {
  const ref = useRef<T>(null)
  useProgressEffect((p) => {
    const el = ref.current
    if (!el) return
    const o = window4(p, a, b, c, d)
    el.style.opacity = o.toFixed(3)
    el.style.transform = `translate3d(0, ${((1 - o) * rise).toFixed(1)}px, 0)`
    const vis = o > 0.01 ? 'visible' : 'hidden'
    if (el.style.visibility !== vis) el.style.visibility = vis
  })
  return ref
}
