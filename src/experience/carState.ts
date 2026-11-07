import { Vector3 } from 'three'

/**
 * Live car state shared with other shaders (road headlight pool, later the HUD).
 * Objects are mutated in place by <Car/>; uniforms hold references to them, so
 * every consumer sees the current frame's values at render time.
 */
export const carState = {
  position: new Vector3(0, 0, -5),
  direction: new Vector3(0, 0, -1),
  headlights: { value: 0 },
  speed: 0,
  /** 0 … 1 brake intensity (regen stop) */
  braking: 0,
}
