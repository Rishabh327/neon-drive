// Paste into the dev-server page console (or run via a browser tool).
// Renders frames synchronously at fixed scroll positions and times them with a
// GPU sync (readPixels), so results are valid even if the tab is throttled.
// Usage: await window.__bench([0, 0.2, 0.5])
window.__bench = async (points = [0, 0.05, 0.15, 0.2, 0.27, 0.4, 0.5, 0.62, 0.67, 0.75, 0.82, 0.88, 0.93, 0.98]) => {
  const { state, advance, store } = window.__neon
  const gl = state.gl.getContext()
  const px = new Uint8Array(4)
  const out = {}
  let t = performance.now() / 1000
  for (const p of points) {
    store.getState().setScroll(p, 0)
    for (let i = 0; i < 5; i++) advance((t += 1 / 60)) // warm
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
    const n = 20
    const t0 = performance.now()
    for (let i = 0; i < n; i++) {
      advance((t += 1 / 60))
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
    }
    out[p] = +((performance.now() - t0) / n).toFixed(1)
  }
  return out
}
