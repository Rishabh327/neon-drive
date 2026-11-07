import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  type Group,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three'
import { useExperience, type QualityTier } from '../../store'
import { PROFILE } from '../../data/profile'
import { FONT, spacedText, useCanvasTexture, whenFontsReady } from '../canvasText'
import { range, smooth } from '../beat'
import basicVert from '../shaders/basic.vert'
import hologramFrag from '../shaders/hologram.frag'
import shatterVert from '../shaders/shatter.vert'
import shatterFrag from '../shaders/shatter.frag'
import { RAIN_LAYER } from '../objects/Rain'

// Name plane hanging in the sky (camera starts at (0,175,150) looking at (0,165,0))
const NAME_POS: [number, number, number] = [0, 165, -10]
const NAME_W = 128
const NAME_H = 20
const CANVAS_W = 2048
const CANVAS_H = 320

const PARTICLES: Record<QualityTier, number> = { high: 22000, medium: 12000, low: 6000 }

function drawName(g: CanvasRenderingContext2D, w: number, h: number) {
  g.fillStyle = '#fff'
  g.textBaseline = 'middle'
  g.font = `700 236px ${FONT.display}`
  spacedText(g, PROFILE.name.toUpperCase(), w / 2, h / 2 + 8, 14, 'center')
}

/** Random points inside the rendered letters (alpha > 50%), mapped onto the name plane in world space. */
function sampleName(canvas: HTMLCanvasElement, count: number) {
  const g = canvas.getContext('2d')!
  const { data, width, height } = g.getImageData(0, 0, canvas.width, canvas.height)
  const inside: number[] = []
  for (let y = 0; y < height; y += 2) for (let x = 0; x < width; x += 2) if (data[(y * width + x) * 4 + 3] > 128) inside.push(x, y)
  const out = new Float32Array(count * 3)
  const n = inside.length / 2
  for (let i = 0; i < count; i++) {
    const k = Math.floor(Math.random() * n) * 2
    const u = (inside[k] + Math.random() * 2) / width
    const v = (inside[k + 1] + Math.random() * 2) / height
    out[i * 3] = NAME_POS[0] + (u - 0.5) * NAME_W
    out[i * 3 + 1] = NAME_POS[1] + (0.5 - v) * NAME_H
    out[i * 3 + 2] = NAME_POS[2] + (Math.random() - 0.5) * 0.6
  }
  return out
}

/** Targets: the first ~230 m of highway lane dashes (x = ±3.4, 3 m long, every 8 m). */
function laneTargets(count: number) {
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const dash = Math.floor(Math.random() * 29)
    const side = Math.random() < 0.5 ? -3.4 : 3.4
    out[i * 3] = side + (Math.random() - 0.5) * 0.16
    out[i * 3 + 1] = 0.06
    out[i * 3 + 2] = 30 - dash * 8 + (Math.random() - 0.5) * 3
  }
  return out
}

export function Hero() {
  const quality = useExperience((s) => s.quality)
  const nameTex = useCanvasTexture(CANVAS_W, CANVAS_H, drawName)
  const group = useRef<Group>(null)
  const gl = useThree((s) => s.gl)

  const nameMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: basicVert,
        fragmentShader: hologramFrag,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uMap: { value: nameTex },
          uTime: { value: 0 },
          uOpacity: { value: 1 },
          uGlitch: { value: 0 },
          uColorA: { value: new Color('#ff2a6d') },
          uColorB: { value: new Color('#05d9e8') },
          uAspect: { value: new Vector2(NAME_W, NAME_H) },
        },
      }),
    [nameTex],
  )

  // Particle geometry is built once the real font is in, so particles sit exactly on the letters
  const [particles, setParticles] = useState<BufferGeometry | null>(null)
  useEffect(() => {
    let alive = true
    whenFontsReady().then(() => {
      if (!alive) return
      const count = PARTICLES[quality]
      const canvas = document.createElement('canvas')
      canvas.width = CANVAS_W
      canvas.height = CANVAS_H
      drawName(canvas.getContext('2d', { willReadFrequently: true })!, CANVAS_W, CANVAS_H)
      const geo = new BufferGeometry()
      const start = sampleName(canvas, count)
      geo.setAttribute('position', new BufferAttribute(start, 3)) // bounds only
      geo.setAttribute('aStart', new BufferAttribute(start, 3))
      geo.setAttribute('aEnd', new BufferAttribute(laneTargets(count), 3))
      const rand = new Float32Array(count * 4)
      for (let i = 0; i < rand.length; i++) rand[i] = Math.random()
      geo.setAttribute('aRand', new BufferAttribute(rand, 4))
      setParticles(geo)
    })
    return () => {
      alive = false
    }
  }, [quality])
  useEffect(() => () => particles?.dispose(), [particles])

  const particleMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: shatterVert,
        fragmentShader: shatterFrag,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uProgress: { value: 0 },
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
          uSize: { value: 1.6 },
          uNameCenter: { value: new Vector3(...NAME_POS) },
          uNameScale: { value: 1 },
        },
      }),
    [],
  )

  const nameMesh = useRef<import('three').Mesh>(null)
  const points = useRef<import('three').Points>(null)

  useFrame((state) => {
    const { clock } = state
    const p = useExperience.getState().progress
    const t = clock.elapsedTime
    // name: steady → glitch harder 0.085–0.105 → gone by 0.112 (particles take over at 0.1)
    const glitch = smooth(range(p, 0.075, 0.105))
    nameMat.uniforms.uTime.value = t
    nameMat.uniforms.uGlitch.value = glitch
    nameMat.uniforms.uOpacity.value = 1 - smooth(range(p, 0.098, 0.112))
    if (nameMesh.current) {
      nameMesh.current.visible = p < 0.115
      // fit the name to narrow (portrait) screens: ≤ 88% of the visible width at its distance
      const cam = state.camera as import('three').PerspectiveCamera
      const dist = cam.position.distanceTo(nameMesh.current.position)
      const visibleW = 2 * dist * Math.tan(((cam.fov * Math.PI) / 180) / 2) * cam.aspect
      const fit = Math.min(1, (visibleW * 0.88) / NAME_W)
      nameMesh.current.scale.setScalar(fit)
      particleMat.uniforms.uNameScale.value = fit
    }

    particleMat.uniforms.uProgress.value = p
    particleMat.uniforms.uTime.value = t
    particleMat.uniforms.uPixelRatio.value = gl.getPixelRatio()
    if (points.current) points.current.visible = p > 0.095 && p < 0.195
    if (group.current) group.current.visible = p < 0.2
  })

  return (
    <group ref={group}>
      <mesh ref={nameMesh} position={NAME_POS} material={nameMat} layers={RAIN_LAYER}>
        <planeGeometry args={[NAME_W, NAME_H]} />
      </mesh>
      {particles && (
        <points ref={points} geometry={particles} material={particleMat} frustumCulled={false} layers={RAIN_LAYER} />
      )}
    </group>
  )
}
