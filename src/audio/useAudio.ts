import { useEffect } from 'react'
import { useExperience } from '../store'
import { SECTIONS } from '../data/sections'
import { carSignals } from '../lib/carSignals'
import { audio } from './engine'

const INTERACTIVE = 'a[href], button:not([disabled]), [role="switch"], [data-sfx]'

/**
 * Connects the synthesized sound engine to the experience:
 *  - audio on/off (always toggled from a user gesture, so the AudioContext may start)
 *  - per-frame scroll state → engine parameters
 *  - glitch blip on every district change
 *  - hover / click ticks on anything interactive (one delegated listener)
 */
export function useAudio() {
  useEffect(() => {
    const unsubToggle = useExperience.subscribe((s, prev) => {
      if (s.audioOn !== prev.audioOn) audio.setEnabled(s.audioOn)
    })

    const unsubFrame = useExperience.subscribe((s, prev) => {
      if (!s.audioOn) return
      if (s.progress === prev.progress && s.velocity === prev.velocity && s.regenOn === prev.regenOn) return
      audio.update({
        progress: s.progress,
        velocity: s.velocity,
        sectionIndex: SECTIONS.findIndex((x) => x.id === s.activeSection),
        regenOn: s.regenOn,
        braking: carSignals.braking,
        inCabin: s.progress > 0.625 && s.progress < 0.705,
      })
      if (s.activeSection !== prev.activeSection && s.started) audio.glitch()
    })

    let last: Element | null = null
    const onOver = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.(INTERACTIVE) ?? null
      if (el && el !== last && useExperience.getState().audioOn) audio.hover()
      last = el
    }
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.(INTERACTIVE) && useExperience.getState().audioOn) audio.click()
    }
    document.addEventListener('pointerover', onOver)
    document.addEventListener('click', onClick)
    return () => {
      unsubToggle()
      unsubFrame()
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('click', onClick)
    }
  }, [])
}
