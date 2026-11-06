import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { CameraRig } from './CameraRig'
import { GreyboxCity } from './objects/GreyboxCity'
import { BeatMarkers } from './scenes/BeatMarkers'

const BG = '#05060f'

export default function Experience({ debug }: { debug: boolean }) {
  return (
    <Canvas
      style={{ position: 'fixed', inset: 0, zIndex: 0 }}
      // Rendering is driven from the GSAP ticker (see useSmoothScroll) so the
      // camera and the scroll value are always in the same frame.
      frameloop="never"
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
      camera={{ fov: 55, near: 0.5, far: 1400, position: [0, 175, 150] }}
      aria-hidden="true"
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 60, 520]} />
      <hemisphereLight args={['#5b6cff', '#05060f', 0.9]} />
      <directionalLight position={[80, 200, 60]} intensity={0.6} color="#a9b4ff" />
      <CameraRig />
      <GreyboxCity />
      <BeatMarkers debug={debug} />
      {debug && <FpsProbe />}
    </Canvas>
  )
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
