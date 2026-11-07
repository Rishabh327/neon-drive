import { FEATURED } from '../../data/projects'
import { cameraAt, range, smooth } from '../beat'

/** Scroll progress at which project i's screen is fully unfolded (35–60% downtown stretch). */
export const PROJECT_CENTER = FEATURED.map((_, i) => 0.385 + i * 0.0265)

/** Towers stand beside the highway ~34 m ahead of where the camera is at their centre. */
export const TOWER_LAYOUT = FEATURED.map((_, i) => {
  const side = i % 2 ? 1 : -1
  const z = cameraAt(PROJECT_CENTER[i]).z - 34
  return {
    side,
    x: side * 17,
    z,
    height: 34 + (i % 3) * 5,
    /** where the unfolded screen hovers: beside the road, near eye level */
    hover: [side * 5.2, 6.8, z + 12] as [number, number, number],
  }
})

/** 0 → 1 unfold amount for project i. */
export function unfoldAt(i: number, p: number) {
  const c = PROJECT_CENTER[i]
  return smooth(range(p, c - 0.017, c - 0.008)) * (1 - smooth(range(p, c + 0.005, c + 0.0115)))
}

/** AlertNet's radar sweeps the ground a little before and after its screen. */
export function radarAt(p: number) {
  const c = PROJECT_CENTER[0]
  return smooth(range(p, c - 0.03, c - 0.012)) * (1 - smooth(range(p, c + 0.008, c + 0.018)))
}
