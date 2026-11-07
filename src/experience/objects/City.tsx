import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  Object3D,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from 'three'
import { CITY, STREET_Z } from '../cityLayout'
import { useExperience } from '../../store'
import buildingVert from '../shaders/building.vert'
import buildingFrag from '../shaders/building.frag'
import signVert from '../shaders/sign.vert'
import signFrag from '../shaders/sign.frag'

const CHUNK = 120 // metres

/**
 * Buildings, split into ~120 m spatial chunks. Each chunk is one InstancedMesh
 * positioned at its centre with a real bounding sphere, so three.js can
 * frustum-cull whole chunks and sort them front-to-back (far fewer overdrawn
 * pixels in both the main and the reflection pass). Windows + roofline neon
 * are procedural in the shader.
 */
function Buildings() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: buildingVert,
        fragmentShader: buildingFrag,
        uniforms: UniformsUtils.merge([UniformsLib.fog, { uTime: { value: 0 } }]),
        fog: true,
      }),
    [],
  )
  const chunks = useMemo(() => {
    const map = new Map<string, typeof CITY.buildings>()
    for (const b of CITY.buildings) {
      const key = `${Math.floor(b.x / CHUNK)},${Math.floor(b.z / CHUNK)}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(b)
    }
    return [...map.values()].map((list) => {
      const cx = list.reduce((a, b) => a + b.x, 0) / list.length
      const cz = list.reduce((a, b) => a + b.z, 0) / list.length
      return { list, cx, cz }
    })
  }, [])
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime
  })
  return (
    <group>
      {chunks.map((c, i) => (
        <BuildingChunk key={i} chunk={c} material={material} />
      ))}
    </group>
  )
}

function BuildingChunk({ chunk, material }: { chunk: { list: typeof CITY.buildings; cx: number; cz: number }; material: ShaderMaterial }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current!
    const o = new Object3D()
    chunk.list.forEach((b, i) => {
      o.position.set(b.x - chunk.cx, b.h / 2, b.z - chunk.cz)
      o.scale.set(b.w, b.h, b.d)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [chunk])
  return (
    <instancedMesh ref={ref} args={[undefined, material, chunk.list.length]} position={[chunk.cx, 0, chunk.cz]}>
      <boxGeometry />
    </instancedMesh>
  )
}

/** Neon signs on road-facing facades: 1 draw call, flicker in shader. */
function Signs() {
  const ref = useRef<InstancedMesh>(null)
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: signVert,
        fragmentShader: signFrag,
        uniforms: UniformsUtils.merge([UniformsLib.fog, { uTime: { value: 0 } }]),
        fog: true,
        side: DoubleSide,
        toneMapped: false,
      }),
    [],
  )
  useLayoutEffect(() => {
    const mesh = ref.current!
    const o = new Object3D()
    const colors = new Float32Array(CITY.signs.length * 3)
    const seeds = new Float32Array(CITY.signs.length)
    CITY.signs.forEach((s, i) => {
      o.position.set(s.x, s.y, s.z)
      o.rotation.set(0, s.rotY, 0)
      o.scale.set(s.w, s.h, 1)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      colors.set(s.color, i * 3)
      seeds[i] = s.seed
    })
    mesh.geometry.setAttribute('aColor', new InstancedBufferAttribute(colors, 3))
    mesh.geometry.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 1))
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [CITY.signs])
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime
  })
  return (
    <instancedMesh ref={ref} args={[undefined, material, CITY.signs.length]} frustumCulled={false}>
      <planeGeometry />
    </instancedMesh>
  )
}

/** Streetlight poles + glowing heads: 2 draw calls. */
function StreetLights() {
  const poles = useRef<InstancedMesh>(null)
  const heads = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const o = new Object3D()
    CITY.lights.forEach((l, i) => {
      o.rotation.set(0, l.rotY, 0)
      o.position.set(l.x, 4.5, l.z)
      o.scale.set(0.16, 9, 0.16)
      o.updateMatrix()
      poles.current!.setMatrixAt(i, o.matrix)
      // head overhangs toward the road
      o.position.set(l.x, 9, l.z)
      o.translateX(1.4)
      o.scale.set(2.8, 0.14, 0.4)
      o.updateMatrix()
      heads.current!.setMatrixAt(i, o.matrix)
    })
    for (const m of [poles.current!, heads.current!]) {
      m.instanceMatrix.needsUpdate = true
      m.computeBoundingSphere()
    }
  }, [CITY.lights])
  const headColor = useMemo(() => new Color('#9ff6ff').multiplyScalar(3), [])
  return (
    <group>
      <instancedMesh ref={poles} args={[undefined, undefined, CITY.lights.length]} frustumCulled={false}>
        <boxGeometry />
        <meshStandardMaterial color="#1a1c2a" roughness={0.5} metalness={0.8} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, CITY.lights.length]} frustumCulled={false}>
        <boxGeometry />
        <meshBasicMaterial color={headColor} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

/** Glowing lane dashes on both roads (these are what the hero particles re-form into). */
function LaneMarkings() {
  const dashes = useMemo(() => {
    const list: [number, number, number][] = []
    for (let z = 30; z > -545; z -= 8) list.push([-3.4, z, 0], [3.4, z, 0])
    for (let x = 16; x < 330; x += 8) list.push([x, STREET_Z - 3.4, Math.PI / 2], [x, STREET_Z + 3.4, Math.PI / 2])
    return list
  }, [])
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current!
    const o = new Object3D()
    dashes.forEach(([x, z, r], i) => {
      o.position.set(x, 0.03, z)
      o.rotation.set(-Math.PI / 2, 0, r)
      o.scale.set(0.16, 3, 1)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [dashes])
  const color = useMemo(() => new Color('#05d9e8').multiplyScalar(1.8), [])
  const mat = useRef<import('three').MeshBasicMaterial>(null)
  // hidden while the name is still in the sky; they "form" as the shatter particles land (≈17–19%)
  useFrame(() => {
    const p = useExperience.getState().progress
    const o = Math.min(1, Math.max(0, (p - 0.168) / 0.022))
    if (mat.current) mat.current.opacity = o
    if (ref.current) ref.current.visible = o > 0.001
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, dashes.length]} frustumCulled={false}>
      <planeGeometry />
      <meshBasicMaterial ref={mat} color={color} toneMapped={false} transparent />
    </instancedMesh>
  )
}

export function City() {
  return (
    <group>
      <Buildings />
      <Signs />
      <StreetLights />
      <LaneMarkings />
    </group>
  )
}
