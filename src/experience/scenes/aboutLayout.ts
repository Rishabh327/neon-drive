import { BILLBOARDS } from '../../data/profile'
import { hash } from '../beat'

/** Billboards along the highway; even = left, odd = right. */
export const BILLBOARD_LAYOUT = BILLBOARDS.map((_, i) => {
  const side = i % 2 ? 1 : -1
  return { x: side * 13, y: 10.5, z: -78 - i * 31, rotY: side * -0.75 }
})

/**
 * Light level for billboard i given the camera z. Pure function of scroll
 * (camera z), so 3D signs and the HTML mirror always agree.
 *   far: dark · 80→64 m ahead: flickering on · closer: fully lit
 */
export function billboardLevel(i: number, camZ: number) {
  const d = camZ - BILLBOARD_LAYOUT[i].z // metres ahead of the camera
  if (d > 82) return 0.06
  if (d > 64) return hash(Math.floor(d * 1.6) + i * 13.7) > 0.5 ? 1 : 0.12
  return 1
}

/** Index of the sign the visitor is currently "reading" (nearest lit one ahead), or −1. */
export function activeBillboard(camZ: number) {
  let best = -1
  let bestD = Infinity
  BILLBOARD_LAYOUT.forEach((b, i) => {
    const d = camZ - b.z
    if (d > -8 && d < 70 && d < bestD) {
      best = i
      bestD = d
    }
  })
  return best
}
