import { Vector3 } from 'three'
import { STREET_Z } from './cityLayout'

/**
 * The car drives a 1-D road parameter `s` (metres):
 *   highway  : (0, z = 20 − s)                     s ∈ [0, S1]
 *   corner   : quarter-circle right turn, radius R  s ∈ [S1, S2]
 *   street   : (x = R + (s − S2), z = STREET_Z)     s ≥ S2
 * Its position is derived from the camera's position (projected onto the road)
 * plus a "lead" distance, so the camera–car relationship never drifts.
 */
const R = 12
const HWY_START = 20
const S1 = HWY_START - (STREET_Z + R) // 568
const ARC = (Math.PI / 2) * R
const S2 = S1 + ARC
const CORNER_C = { x: R, z: STREET_Z + R } // (12, −548)
export const PARK_S = S2 + 190 // near the tallest tower

export function roadAt(s: number, out: Vector3): number {
  if (s <= S1) {
    out.set(0, 0, HWY_START - s)
    return Math.PI // facing −Z
  }
  if (s <= S2) {
    const a = (s - S1) / R
    out.set(CORNER_C.x - R * Math.cos(a), 0, CORNER_C.z - R * Math.sin(a))
    return Math.atan2(Math.sin(a), -Math.cos(a)) // tangent (sin a, −cos a)
  }
  out.set(R + (s - S2), 0, STREET_Z)
  return Math.PI / 2 // facing +X
}

/** Nearest road parameter for a world position (used for the camera). */
export function roadParamOf(p: Vector3): number {
  if (p.z > CORNER_C.z && p.x < CORNER_C.x) return HWY_START - p.z
  if (p.x > CORNER_C.x && p.z < CORNER_C.z) return S2 + (p.x - R)
  const vx = p.x - CORNER_C.x
  const vz = p.z - CORNER_C.z
  const a = Math.min(Math.PI / 2, Math.max(0, Math.atan2(-vz, -vx)))
  return S1 + a * R
}

/** How far ahead of the camera the car sits, per scroll progress. */
const LEAD: [number, number][] = [
  [0.18, 10],
  [0.6, 10],
  [0.65, 0.2], // camera slides into the cabin
  [0.7, 0.2],
  [0.78, 12], // hard brake: camera keeps drifting, car stops ahead
  [0.88, 14],
]

export function carRoadParam(progress: number, cameraS: number): number {
  if (progress < 0.18) return 25 // parked at the start line
  let lead = LEAD[LEAD.length - 1][1]
  for (let i = 0; i < LEAD.length - 1; i++) {
    const [p0, l0] = LEAD[i]
    const [p1, l1] = LEAD[i + 1]
    if (progress <= p1) {
      const t = (progress - p0) / (p1 - p0)
      lead = l0 + (l1 - l0) * t * t * (3 - 2 * t)
      break
    }
  }
  return Math.min(Math.max(cameraS + lead, 25), PARK_S)
}
