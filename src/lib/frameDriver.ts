/**
 * The scroll loop (useSmoothScroll) renders the 3D frame on its own tick. The 3D
 * chunk registers its render function here when it mounts, so the scroll/UI code
 * never imports three.js / R3F and the loader can paint before the 3D downloads.
 */
let renderFrame: (timeSeconds: number) => void = () => {}
export const setRenderFrame = (fn: (timeSeconds: number) => void) => void (renderFrame = fn)
export const runRenderFrame = (t: number) => renderFrame(t)
