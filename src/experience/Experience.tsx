import { useEffect, useRef, useState } from 'react'
import { advance, Canvas, useFrame, useThree } from '@react-three/fiber'
import { useExperience, type QualityTier } from '../store'
import { CameraRig } from './CameraRig'
import { City } from './objects/City'
import { WetGround } from './objects/WetGround'
import { Rain, RAIN_LAYER } from './objects/Rain'
import { Car } from './objects/Car'
import { BeatMarkers } from './scenes/BeatMarkers'
import { Effects } from './Effects'
import { NeonEnvironment } from './NeonEnvironment'

const BG = '#05060f'
/** Render-pixel budget per tier: DPR is chosen so width×height×dpr² stays under it. */
const PIXEL_BUDGET: Record<QualityTier, number> = { high: 2.1e6, medium: 1.3e6, low: 0.8e6 }

function useBudgetDpr(quality: QualityTier) {
  const compute = () =>
    Math.max(0.6, Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(PIXEL_BUDGET[quality] / (innerWidth * innerHeight))))
  const [dpr, setDpr] = useState(compute)
  useEffect(() => {
    const on = () => setDpr(compute())
    on()
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quality])
  return dpr
}

export default function Experience({ debug }: { debug: boolean }) {
  const quality = useExperience((s) => s.quality)
  const dpr = useBudgetDpr(quality)
  return (
    <Canvas
      style={{ position: 'fixed', inset: 0, zIndex: 0 }}
      // Rendering is driven from the GSAP ticker (see useSmoothScroll) so the
      // camera and the scroll value are always in the same frame.
      frameloop="never"
      dpr={dpr}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false }}
      camera={{ fov: 55, near: 0.3, far: 1400, position: [0, 175, 150] }}
      onCreated={(state) => {
        state.camera.layers.enable(RAIN_LAYER)
        useExperience.getState().markLoaded('scene')
        if (debug) Object.assign(window, { __neon: { state, advance, store: useExperience } })
      }}
      aria-hidden="true"
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 50, 480]} />
      <hemisphereLight args={['#3b2a8a', '#05060f', 0.35]} />

      {/* Procedural neon environment for glossy car paint + glass — no HDR download */}
      <NeonEnvironment />

      <CameraRig />
      <City />
      <WetGround />
      <Rain />
      <Car />
      <BeatMarkers debug={debug} />
      <Effects />
      <Warmup />
      {debug && <FpsProbe />}
    </Canvas>
  )
}

/** Pre-compiles every shader before the visitor can scroll, so nothing hitches on first sight. */
function Warmup() {
  const { gl, scene, camera } = useThree()
  const frames = useRef(0)
  useEffect(() => {
    let alive = true
    gl.compileAsync(scene, camera)
      .catch(() => undefined)
      .then(() => alive && useExperience.getState().markLoaded('shaders'))
    return () => {
      alive = false
    }
  }, [gl, scene, camera])
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
