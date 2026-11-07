/**
 * Explicit frame order (useFrame priorities). Anything > 0 disables R3F's
 * automatic render, so the final render always happens at RENDER.
 *
 *   0  UPDATE      camera rig, car, rain, uniforms (default)
 *   1  REFLECTION  road reflection pass — its own render, never nested in another
 *   2  RENDER      post-processing composer (or a plain render when fx are off)
 */
export const PRIORITY = { UPDATE: 0, REFLECTION: 1, RENDER: 2 } as const
