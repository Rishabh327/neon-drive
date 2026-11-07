import { REGEN } from '../data/profile'
import { range, smooth } from '../lib/timing'

/** Braking window (scroll progress) at the intersection. */
export const BRAKE_A = 0.705
export const BRAKE_B = 0.772

/** Speed (km/h) during the stop — a pure function of scroll. */
export function speedKmh(p: number) {
  return REGEN.brakeFromKmh * (1 - smooth(range(p, BRAKE_A, BRAKE_B)))
}

/** 0 → 1 → 0: how hard we're braking right now (drives particles + brake lights). */
export function brakeIntensity(p: number) {
  const t = range(p, BRAKE_A, BRAKE_B)
  return t > 0 && t < 1 ? Math.sin(t * Math.PI) ** 0.6 : 0
}

/**
 * Energy returned to the pack so far (Wh): η · ½·m·(v₀² − v²).
 * With regen off it's 0 — all of it becomes heat in the friction brakes.
 */
export function recoveredWh(p: number, regenOn: boolean) {
  const v0 = REGEN.brakeFromKmh / 3.6
  const v = speedKmh(p) / 3.6
  const kineticJ = 0.5 * REGEN.massKg * (v0 * v0 - v * v)
  return { regen: regenOn ? (REGEN.efficiency * kineticJ) / 3600 : 0, heat: ((regenOn ? 1 - REGEN.efficiency : 1) * kineticJ) / 3600 }
}

export function socPercent(p: number, regenOn: boolean) {
  return (REGEN.startSoC + recoveredWh(p, regenOn).regen / (REGEN.packKWh * 1000)) * 100
}

/** Typical EV consumption used to translate Wh into distance. */
export const WH_PER_KM = 160
