import { useEffect, useRef, useState } from 'react'
import { advance, Canvas, useFrame, useThree } from '@react-three/fiber'
import { HalfFloatType, WebGLRenderTarget, type Camera, type Object3D, type Scene, type WebGLRenderer } from 'three'
import { useExperience, type QualityTier } from '../store'
import { CameraRig } from './CameraRig'
import { City } from './objects/City'
import { WetGround } from './objects/WetGround'
import { Rain, RAIN_LAYER } from './objects/Rain'
import { Car } from './objects/Car'
import { PathLine } from './scenes/BeatMarkers'
import { Hero } from './scenes/Hero'
import { Billboards } from './scenes/Billboards'
import { ProjectTowers } from './scenes/ProjectTowers'
import { DataDistrict } from './scenes/DataDistrict'
import { Rooftop } from './scenes/Rooftop'
import { Effects, postRegistry } from './Effects'
import { loadJesko } from './objects/jesko'
import { NeonEnvironment } from './NeonEnvironment'
import { FLAGS } from '../debugFlags'
import { setRenderFrame } from '../lib/frameDriver'
import { rendererName, tierFromRenderer } from '../lib/gpuTier'
import { DefaultLoadingManager } from 'three'

const BG = '#05060f'
/** Render-pixel budget per tier: DPR is chosen so width×height×dpr² stays under it. */
const PIXEL_BUDGET: Record<QualityTier, number> = { high: 2.1e6, medium: 1.3e6, low: 0.8e6 }

function useBudgetDpr(quality: QualityTier) {
  const pixelScale = useExperience((s) => s.pixelScale)
  const compute = () =>
    Math.max(0.5, Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt((PIXEL_BUDGET[quality] * pixelScale) / (innerWidth * innerHeight))))
  const [dpr, setDpr] = useState(compute)
  useEffect(() => {
    const on = () => setDpr(compute())
    on()
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quality, pixelScale])
  return dpr
}

/**
 * Cold start without long main-thread stalls:
 *  - the world mounts in stages (one per idle slice) instead of one big commit;
 *  - after each stage, its shaders are compiled with compileAsync (KHR parallel
 *    shader compile → polled, not blocking) — including objects that start hidden;
 *  - nothing is rendered until every stage is compiled (the loader covers it),
 *    so no first render ever compiles synchronously. Only then does the gate open.
 */
const STAGE_COUNT = 10
const renderGate = { open: false }

type IdleWin = { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
const onIdle = (cb: () => void) => {
  const w = window as unknown as IdleWin
  if (w.requestIdleCallback) w.requestIdleCallback(cb, { timeout: 150 })
  else window.setTimeout(cb, 16)
}

/**
 * compileAsync, but for every object — temporarily un-hiding the ones that start
 * invisible — and for the right program variant: real frames render into the
 * post-processing (linear, half-float) buffer, not the screen, and three.js keys
 * programs on that. Compiling against the screen would mean a second, synchronous
 * compile of every shader on the first real frame.
 */
const compileTarget = new WebGLRenderTarget(1, 1, { type: HalfFloatType })
/**
 * `wait=false` only *issues* the compiles (no status queries — those are sync
 * round-trips to the GPU process that stall while it's busy); the GPU links in
 * the background while the next stages mount. The last stage waits once.
 */
async function compileEverything(gl: WebGLRenderer, scene: Scene, camera: Camera, wait: boolean) {
  const hidden: Object3D[] = []
  scene.traverse((o) => {
    if (!o.visible) {
      hidden.push(o)
      o.visible = true
    }
  })
  const prevTarget = gl.getRenderTarget()
  try {
    if (FLAGS.fx) gl.setRenderTarget(compileTarget)
    // both kick off compilation synchronously, so state can be restored right away
    const p = wait ? gl.compileAsync(scene, camera) : (gl.compile(scene, camera), Promise.resolve())
    gl.setRenderTarget(prevTarget)
    hidden.forEach((o) => (o.visible = false))
    await Promise.all([p, postRegistry.current?.precompile(gl, wait)])
  } catch {
    gl.setRenderTarget(prevTarget)
    hidden.forEach((o) => (o.visible = false))
  }
}

export default function Experience({ debug }: { debug: boolean }) {
  const quality = useExperience((s) => s.quality)
  const dpr = useBudgetDpr(quality)
  return (
    <Canvas
      style={{ position: 'fixed', inset: 0, zIndex: 0 }}
      // Rendering is driven from the scroll loop (see useSmoothScroll) so the
      // camera and the scroll value are always in the same frame.
      frameloop="never"
      dpr={dpr}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false }}
      // far: fog fully hides everything beyond 480 m, so don't pay for it
      camera={{ fov: 55, near: 0.3, far: 700, position: [0, 175, 150] }}
      onCreated={(state) => {
        state.camera.layers.enable(RAIN_LAYER)
        // Shader error checks call getProgramInfoLog on each program's first use, which
        // blocks the main thread until the GPU finishes linking (~0.5 s for a cold shader).
        // Keep them in dev; in production let the GPU process link asynchronously.
        state.gl.debug.checkShaderErrors = import.meta.env.DEV
        useExperience.getState().markLoaded('scene')
        // refine the quality tier from the real GPU name (no separate probe context)
        if (!FLAGS.quality) {
          const tier = tierFromRenderer(rendererName(state.gl.getContext()), state.gl.capabilities.isWebGL2)
          if (FLAGS.debug) console.info(`[neon-drive] GPU tier: ${tier}`)
          useExperience.getState().setQuality(tier)
        }
        // the scroll loop renders our frames on its own tick — once everything is compiled
        setRenderFrame((t) => {
          if (renderGate.open) advance(t)
        })
        // streamed-asset progress for the loader (same source drei's useProgress reads)
        const report = (_u: string, loaded: number, total: number) =>
          useExperience.setState({ assets: { progress: total ? (loaded / total) * 100 : 100, total } })
        DefaultLoadingManager.onStart = report
        DefaultLoadingManager.onProgress = report
        if (debug) Object.assign(window, { __neon: { state, advance, store: useExperience } })
        // three.js already preventDefault()s and restores a lost context; we just make it visible.
        const canvas = state.gl.domElement
        canvas.addEventListener('webglcontextlost', () => {
          const n = ((window as unknown as { __ctxLost?: number }).__ctxLost ?? 0) + 1
          Object.assign(window, { __ctxLost: n })
          console.warn(`[neon-drive] WebGL context lost (#${n}) — the GPU reset or ran out of memory`)
        })
        canvas.addEventListener('webglcontextrestored', () => console.warn('[neon-drive] WebGL context restored'))
      }}
      // the HTML overlay sits on top, so listen on the root and map client coords
      eventSource={document.getElementById('root')!}
      eventPrefix="client"
      aria-hidden="true"
    >
      <World debug={debug} />
    </Canvas>
  )
}

function World({ debug }: { debug: boolean }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const [stage, setStage] = useState(0)
  const [ready, setReady] = useState(false)

  // start downloading the hypercar right away (≈3 MB); the loader's bar tracks it
  useEffect(() => {
    if (useExperience.getState().quality !== 'low') loadJesko().catch(() => undefined)
  }, [])

  useEffect(() => {
    let alive = true
    if (FLAGS.debug) performance.mark(`neon:stage-${stage}`)
    // let this stage's layout effects run, compile its shaders off-thread, then move on
    const raf = requestAnimationFrame(() => {
      compileEverything(gl, scene, camera, stage >= STAGE_COUNT).then(() =>
        onIdle(() => {
          if (!alive) return
          if (stage < STAGE_COUNT) setStage(stage + 1)
          else {
            setReady(true)
            renderGate.open = true
            useExperience.getState().markLoaded('shaders')
          }
        }),
      )
    })
    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
  }, [stage, gl, scene, camera])

  return (
    <>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 50, 480]} />
      <hemisphereLight args={['#3b2a8a', '#05060f', 0.35]} />


      <CameraRig />
      <City />
      {stage >= 1 && <WetGround />}
      {stage >= 2 && <Effects />}
      {stage >= 4 && FLAGS.rain && <Rain />}
      {stage >= 4 && <Car />}
      {stage >= 5 && <Hero />}
      {stage >= 6 && <Billboards />}
      {stage >= 7 && <ProjectTowers />}
      {stage >= 8 && <DataDistrict />}
      {stage >= 9 && <Rooftop />}
      {/* procedural neon environment for the car's paint + glass. Its PMREM bake renders
          synchronously, so it goes last — after every other shader has finished linking —
          otherwise its first draw would queue behind all of them in the GPU process. */}
      {ready && <NeonEnvironment />}
      {debug && new URLSearchParams(location.search).has('path') && <PathLine />}
      <FirstFrames />
      {!FLAGS.quality && <AdaptiveQuality />}
      {debug && <FpsProbe />}
    </>
  )
}

/**
 * Runtime safety net: if the visitor's frames are genuinely slow, step down one
 * rung (resolution first, then tier). Only ever steps down — with vsync we can't
 * measure headroom to step back up. Ignores hidden tabs and stalls.
 */
const RUNGS: { q: QualityTier; s: number }[] = [
  { q: 'high', s: 1 },
  { q: 'high', s: 0.78 },
  { q: 'medium', s: 1 },
  { q: 'medium', s: 0.75 },
  { q: 'low', s: 1 },
  { q: 'low', s: 0.7 },
]
function AdaptiveQuality() {
  const acc = useRef({ sum: 0, n: 0, windowStart: 0, cooldownUntil: 0 })
  useFrame(({ clock }, delta) => {
    const st = useExperience.getState()
    const now = clock.elapsedTime
    const a = acc.current
    if (!st.started || document.hidden || delta > 0.25 || delta <= 0) return
    if (a.cooldownUntil === 0) a.cooldownUntil = now + 3 // warm-up after IGNITION
    if (now < a.cooldownUntil) return
    if (a.n === 0) a.windowStart = now
    a.sum += delta
    a.n++
    if (now - a.windowStart < 2 || a.n < 60) return
    const avgMs = (a.sum / a.n) * 1000
    a.sum = 0
    a.n = 0
    if (avgMs <= 24) return // ≥ ~42 fps: fine
    const i = RUNGS.findIndex((r) => r.q === st.quality && Math.abs(r.s - st.pixelScale) < 0.01)
    const next = RUNGS[Math.min(RUNGS.length - 1, (i < 0 ? RUNGS.findIndex((r) => r.q === st.quality) : i) + 1)]
    if (next.q === st.quality && Math.abs(next.s - st.pixelScale) < 0.01) return // already at the floor
    if (FLAGS.debug) console.info(`[neon-drive] avg ${avgMs.toFixed(1)} ms → stepping down to ${next.q} @ ${next.s}`)
    st.setQuality(next.q)
    st.setPixelScale(next.s)
    a.cooldownUntil = now + 3
  })
  return null
}

/** The loader's last step: a dozen real frames rendered (post-processing passes included). */
function FirstFrames() {
  const frames = useRef(0)
  useFrame(() => {
    if (frames.current < 12 && ++frames.current === 12) useExperience.getState().markLoaded('frames')
  })
  return null
}

/** Writes FPS straight into the debug HUD's DOM node — no React re-renders. */
function FpsProbe() {
  const acc = useRef({ t: 0, n: 0, worst: 0 })
  useFrame((_, delta) => {
    const a = acc.current
    a.t += delta
    a.n++
    a.worst = Math.max(a.worst, delta)
    if (a.t >= 0.5) {
      const el = document.getElementById('debug-fps')
      if (el) el.textContent = `${Math.round(a.n / a.t)} fps · worst ${(a.worst * 1000).toFixed(1)} ms`
      a.t = 0
      a.n = 0
      a.worst = 0
    }
  })
  return null
}
