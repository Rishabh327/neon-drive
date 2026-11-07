import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, Vector3, type PerspectiveCamera } from 'three'
import { useExperience } from '../store'
import { positionCurve, lookCurve, progressToU } from './cameraPath'

const _pos = new Vector3()
const _look = new Vector3()

/**
 * Camera follows the spline 1:1 with the (already Lenis-smoothed) progress —
 * no second smoothing layer, so there's no rubber-band lag. Only the small
 * pointer parallax and the speed-FOV kick are damped.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const pointer = useThree((s) => s.pointer)
  const parallax = useRef(new Vector3())
  const size = useThree((s) => s.size)

  useFrame((_, delta) => {
    const { progress, velocity } = useExperience.getState()
    const u = progressToU(progress)
    positionCurve.getPoint(u, _pos)
    lookCurve.getPoint(u, _look)

    // pointer parallax — a few % of a metre, scaled down when inside the car
    const k = 1 - Math.exp(-delta * 3)
    // less sway when low (inside the car), full sway in the open
    const sway = MathUtils.clamp((_pos.y - 1.2) / 3, 0.08, 1)
    parallax.current.x += (pointer.x * 0.6 * sway - parallax.current.x) * k
    parallax.current.y += (pointer.y * 0.35 * sway - parallax.current.y) * k
    _pos.x += parallax.current.x
    _pos.y += parallax.current.y

    camera.position.copy(_pos)
    camera.lookAt(_look)

    // portrait screens get a wider vertical FOV so the world isn't a keyhole
    const aspect = size.width / Math.max(1, size.height)
    const baseFov = aspect >= 1 ? 55 : 55 + (1 - aspect) * 42
    // widen FOV slightly with scroll speed (sense of acceleration)
    const targetFov = baseFov + MathUtils.clamp(Math.abs(velocity) * 120, 0, 10)
    camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-delta * 4))
    camera.updateProjectionMatrix()
  })

  return null
}
