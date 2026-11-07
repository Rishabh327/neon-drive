import { Vector3 } from 'three'
import { positionCurve, progressToU } from './cameraPath'

/** 0 → 1 as p goes a → b (clamped). */
export const range = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)))
export const smooth = (t: number) => t * t * (3 - 2 * t)
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Fade in a→b, hold, fade out c→d. */
export const window4 = (p: number, a: number, b: number, c: number, d: number) =>
  smooth(range(p, a, b)) * (1 - smooth(range(p, c, d)))

export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

const _v = new Vector3()
/** Camera position at a given progress (pure — same everywhere, overlay included). */
export function cameraAt(p: number, out = _v) {
  return positionCurve.getPoint(progressToU(p), out)
}
