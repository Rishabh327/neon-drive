import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  CanvasTexture,
  Color,
  LinearMipmapLinearFilter,
  Matrix4,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  UniformsLib,
  UniformsUtils,
  type ShaderMaterial,
} from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { useExperience, type QualityTier } from '../../store'
import { ROAD_HALF, STREET_Z, mulberry32 } from '../cityLayout'
import { carState } from '../carState'
import wetRoadVert from '../shaders/wetRoad.vert'
import wetRoadFrag from '../shaders/wetRoad.frag'

// Ground plane covers x −370…430, z −840…160 (800 × 1000 m)
const SIZE_X = 800
const SIZE_Z = 1000
const CENTER: [number, number, number] = [30, 0, -340]
const PX = 1.28 // canvas pixels per metre

const RESOLUTION: Record<QualityTier, number> = { high: 1024, medium: 512, low: 256 }

/** Albedo layout: asphalt roads vs. pavement blocks. Canvas row 0 = far end (z −840). */
function makeLayoutTexture() {
  const c = document.createElement('canvas')
  c.width = SIZE_X * PX
  c.height = SIZE_Z * PX
  const g = c.getContext('2d')!
  const toX = (x: number) => (x - (CENTER[0] - SIZE_X / 2)) * PX
  const toY = (z: number) => (z - (CENTER[2] - SIZE_Z / 2)) * PX
  g.fillStyle = '#151722' // pavement
  g.fillRect(0, 0, c.width, c.height)
  g.fillStyle = '#08090e' // asphalt
  g.fillRect(toX(-ROAD_HALF), toY(STREET_Z - ROAD_HALF), ROAD_HALF * 2 * PX, (40 - STREET_Z + ROAD_HALF) * PX)
  g.fillRect(toX(-ROAD_HALF), toY(STREET_Z - ROAD_HALF), (340 + ROAD_HALF) * PX, ROAD_HALF * 2 * PX)
  g.fillStyle = '#2a2d3d' // kerbs
  for (const x of [-ROAD_HALF, ROAD_HALF]) g.fillRect(toX(x) - 1, toY(STREET_Z + ROAD_HALF), 2, (40 - STREET_Z - ROAD_HALF) * PX)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** Tiling roughness: dark = smooth puddle (mirror), light = rough wet asphalt. */
function makePuddleTexture() {
  const s = 256
  const c = document.createElement('canvas')
  c.width = c.height = s
  const g = c.getContext('2d')!
  g.fillStyle = '#a0a0a0'
  g.fillRect(0, 0, s, s)
  const rand = mulberry32(7)
  for (let i = 0; i < 90; i++) {
    const x = rand() * s
    const y = rand() * s
    const r = 6 + rand() * 30
    const v = Math.floor(rand() * 60)
    const grad = g.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, `rgba(${v},${v},${v},0.95)`)
    grad.addColorStop(1, `rgba(${v},${v},${v},0)`)
    g.fillStyle = grad
    for (const dx of [-s, 0, s])
      for (const dy of [-s, 0, s]) {
        g.beginPath()
        g.ellipse(x + dx, y + dy, r * 1.6, r, 0, 0, Math.PI * 2)
        g.fill()
      }
  }
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  return t
}

/**
 * Wet ground: three's planar Reflector + a custom unlit shader. The reflection
 * target is mipmapped, so roughness → blur is just a texture LOD (no blur passes).
 * Rain lives on layer 1 and is not rendered into the reflection.
 */
export function WetGround() {
  const quality = useExperience((s) => s.quality)
  const layout = useMemo(makeLayoutTexture, [])
  const puddles = useMemo(makePuddleTexture, [])

  const reflector = useMemo(() => {
    const res = RESOLUTION[quality]
    const r = new Reflector(new PlaneGeometry(SIZE_X, SIZE_Z), {
      textureWidth: res,
      textureHeight: res,
      multisample: 0,
      clipBias: 0.003,
      shader: {
        name: 'WetRoad',
        uniforms: UniformsUtils.merge([
          UniformsLib.fog,
          {
            color: { value: new Color() },
            tDiffuse: { value: null },
            textureMatrix: { value: new Matrix4() },
            uLayout: { value: null },
            uPuddles: { value: null },
            uTime: { value: 0 },
            uRipples: { value: 1 },
            uMaxLod: { value: Math.log2(res) - 3 },
            uCarPos: { value: null },
            uCarDir: { value: null },
            uHeadOn: { value: 0 },
          },
        ]),
        vertexShader: wetRoadVert,
        fragmentShader: wetRoadFrag,
      },
    })
    const rt = r.getRenderTarget()
    rt.texture.generateMipmaps = true
    rt.texture.minFilter = LinearMipmapLinearFilter
    const m = r.material as ShaderMaterial
    m.fog = true
    m.uniforms.uLayout.value = layout
    m.uniforms.uPuddles.value = puddles
    // live references — mutated by <Car/> each frame, read at render time
    m.uniforms.uCarPos.value = carState.position
    m.uniforms.uCarDir.value = carState.direction
    m.uniforms.uHeadOn = carState.headlights
    r.rotation.x = -Math.PI / 2
    r.position.set(...CENTER)
    return r
  }, [quality, layout, puddles])

  useEffect(
    () => () => {
      reflector.getRenderTarget().dispose()
      reflector.geometry.dispose()
      ;(reflector.material as ShaderMaterial).dispose()
    },
    [reflector],
  )

  useFrame(({ clock }) => {
    ;(reflector.material as ShaderMaterial).uniforms.uTime.value = clock.elapsedTime
  })

  return <primitive object={reflector} />
}
