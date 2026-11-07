import { Vector3 } from 'three'
import { positionCurve, progressToU } from './cameraPath'

export { range, smooth, easeOutCubic, easeInOutCubic, window4, hash } from '../lib/timing'

const _v = new Vector3()
/** Camera position at a given progress (pure — same everywhere, overlay included). */
export function cameraAt(p: number, out = _v) {
  return positionCurve.getPoint(progressToU(p), out)
}
