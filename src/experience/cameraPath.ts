import { CatmullRomCurve3, Vector3 } from 'three'
import { KEYFRAMES } from '../lib/cameraKeyframes'
export { KEYFRAMES, progressToU } from '../lib/cameraKeyframes'

/**
 * World layout (units ≈ metres)
 *   Main highway runs along −Z at x = 0, from z = +40 to z = −600.
 *   Cross street (Data District) runs along +X at z = −560.
 *   Tallest tower (rooftop finale) stands at (240, 0, −610), 150 tall.
 *
 * Each keyframe pins a camera position + look target to an exact scroll
 * progress, so beats land exactly where sections.ts says they do.
 */
const toV = (a: [number, number, number]) => new Vector3(...a)

export const positionCurve = new CatmullRomCurve3(KEYFRAMES.map((k) => toV(k.pos)), false, 'centripetal')
export const lookCurve = new CatmullRomCurve3(KEYFRAMES.map((k) => toV(k.look)), false, 'centripetal')

