import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  Color,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
} from 'three'
import { useExperience, type QualityTier } from '../../store'
import rainVert from '../shaders/rain.vert'
import rainFrag from '../shaders/rain.frag'
import splashVert from '../shaders/splash.vert'
import splashFrag from '../shaders/splash.frag'

/** Rain lives on layer 1 so the road's reflection pass doesn't render it twice. */
export const RAIN_LAYER = 1

const COUNTS: Record<QualityTier, { drops: number; splashes: number }> = {
  high: { drops: 14000, splashes: 500 },
  medium: { drops: 8000, splashes: 250 },
  low: { drops: 3500, splashes: 0 },
}

function instancedQuad(count: number, attrs: Record<string, { size: number; fill: () => number }>) {
  const base = new PlaneGeometry(1, 1)
  const g = new InstancedBufferGeometry()
  g.index = base.index
  g.setAttribute('position', base.getAttribute('position'))
  g.instanceCount = count
  for (const [name, { size, fill }] of Object.entries(attrs)) {
    const arr = new Float32Array(count * size)
    for (let i = 0; i < arr.length; i++) arr[i] = fill()
    g.setAttribute(name, new InstancedBufferAttribute(arr, size))
  }
  return g
}

export function Rain() {
  const quality = useExperience((s) => s.quality)
  const { drops, splashes } = COUNTS[quality]
  const prevCam = useRef(new Vector3())
  const camVel = useRef(new Vector3())

  const rain = useMemo(() => {
    const geometry = instancedQuad(drops, { aRand: { size: 4, fill: Math.random } })
    const material = new ShaderMaterial({
      vertexShader: rainVert,
      fragmentShader: rainFrag,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uCam: { value: new Vector3() },
        uBox: { value: new Vector3(64, 44, 64) },
        uCamVel: { value: new Vector3() },
        uDensity: { value: 1 },
        uFall: { value: 26 },
        uWind: { value: new Vector3(2.2, 0, 0.8) },
        uColor: { value: new Color(0.55, 0.68, 0.95) },
      },
    })
    return { geometry, material }
  }, [drops])

  const splash = useMemo(() => {
    if (!splashes) return null
    const geometry = instancedQuad(splashes, { aRand: { size: 3, fill: Math.random } })
    // lie flat: shader builds xz from position.xy
    const material = new ShaderMaterial({
      vertexShader: splashVert,
      fragmentShader: splashFrag,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uCam: { value: new Vector3() },
        uRadius: { value: 18 },
        uVisible: { value: 0 },
        uColor: { value: new Color(0.6, 0.8, 1.0) },
      },
    })
    return { geometry, material }
  }, [splashes])

  useFrame(({ camera, clock }, delta) => {
    const { progress } = useExperience.getState()
    const t = clock.elapsedTime
    // camera velocity (m/s), smoothed and clamped so streaks never go silly
    if (delta > 0) {
      const inst = camera.position.clone().sub(prevCam.current).divideScalar(delta)
      if (inst.length() > 60) inst.setLength(60)
      camVel.current.lerp(inst, Math.min(1, delta * 6))
    }
    prevCam.current.copy(camera.position)

    const u = rain.material.uniforms
    u.uTime.value = t
    u.uCam.value.copy(camera.position)
    u.uCamVel.value.copy(camVel.current)
    // rooftop: rain thins out as we climb above the city
    u.uDensity.value = 1 - Math.min(1, Math.max(0, (progress - 0.88) / 0.08)) * 0.65

    if (splash) {
      const s = splash.material.uniforms
      s.uTime.value = t
      // centre splashes a little ahead of the camera, on the ground
      s.uCam.value.set(camera.position.x, 0, camera.position.z - 10)
      s.uVisible.value = 1 - Math.min(1, Math.max(0, (camera.position.y - 8) / 20))
    }
  })

  return (
    <group>
      <mesh geometry={rain.geometry} material={rain.material} frustumCulled={false} layers={RAIN_LAYER} />
      {splash && (
        <mesh geometry={splash.geometry} material={splash.material} frustumCulled={false} layers={RAIN_LAYER} />
      )}
    </group>
  )
}
