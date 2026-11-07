import { hasWebGL2 } from './gpuTier'

/**
 * Which experience to show:
 *   'drive'  — the full scroll-driven 3D drive
 *   'simple' — accessible 2D site (same content), used when WebGL2 is missing,
 *              when the visitor prefers reduced motion, or by choice.
 * Explicit choices persist in localStorage; ?simple / ?drive override for a visit.
 */
export type Mode = 'drive' | 'simple'
export type ModeReason = 'no-webgl' | 'reduced-motion' | 'choice' | null

const KEY = 'neon-drive:mode'

function readPref(): Mode | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'drive' || v === 'simple' ? v : null
  } catch {
    return null
  }
}

export function resolveMode(): { mode: Mode; reason: ModeReason; canDrive: boolean } {
  // cheap check only — creating a probe WebGL context costs ~0.5 s on first use.
  // If the real context then fails, the drive's error boundary falls back to simple mode.
  const canDrive = hasWebGL2()
  if (!canDrive) return { mode: 'simple', reason: 'no-webgl', canDrive }
  const params = new URLSearchParams(location.search)
  if (params.has('simple')) return { mode: 'simple', reason: 'choice', canDrive }
  if (params.has('drive')) return { mode: 'drive', reason: null, canDrive }
  const pref = readPref()
  if (pref) return { mode: pref, reason: pref === 'simple' ? 'choice' : null, canDrive }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return { mode: 'simple', reason: 'reduced-motion', canDrive }
  return { mode: 'drive', reason: null, canDrive }
}

/** Remember the choice and reload into it (clean teardown of WebGL/audio/scroll). */
export function switchMode(mode: Mode) {
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    /* not persisted — the URL param below still applies for this visit */
  }
  const url = new URL(location.href)
  url.searchParams.delete('simple')
  url.searchParams.delete('drive')
  url.searchParams.set(mode, '')
  location.replace(url.toString().replace(/=(&|$)/, '$1'))
}
