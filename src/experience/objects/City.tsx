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
import buildingVert from '../shaders/building.vert'
import buildingFrag from '../shaders/building.frag'
import signVert from '../shaders/sign.vert'
import signFrag from '../shaders/sign.frag'

/** All buildings: 1 draw call. Windows + roofline neon are procedural in the shader. */
function Buildings() {
  const ref = useRef<InstancedMesh>(null)
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
  useLayoutEffect(() => {
    const mesh = ref.current!
    const o = new Object3D()
    CITY.buildings.forEach((b, i) => {
      o.position.set(b.x, b.h / 2, b.z)
      o.scale.set(b.w, b.h, b.d)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [])
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime
  })
  return (
    <instancedMesh ref={ref} args={[undefined, material, CITY.buildings.length]} frustumCulled={false}>
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
  }, [])
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
  }, [])
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
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, dashes.length]} frustumCulled={false}>
      <planeGeometry />
      <meshBasicMaterial color={color} toneMapped={false} />
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
