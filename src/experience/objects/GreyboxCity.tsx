import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, InstancedMesh, Object3D } from 'three'

/** Deterministic PRNG so the city is identical on every load. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Building {
  x: number
  z: number
  w: number
  d: number
  h: number
}

const ROAD_HALF = 12 // keep this clear either side of the highway
const STREET_Z = -560
const TOWER = { x: 240, z: -610, w: 30, d: 30, h: 150 }

function generateCity(): Building[] {
  const rand = mulberry32(1337)
  const out: Building[] = []
  const cell = 16
  for (let gx = -280; gx <= 340; gx += cell) {
    for (let gz = 80; gz >= -760; gz -= cell) {
      const x = gx + (rand() - 0.5) * 4
      const z = gz + (rand() - 0.5) * 4
      const w = 6 + rand() * 8
      const d = 6 + rand() * 8
      // corridors: highway, cross street, tower plot
      if (Math.abs(x) < ROAD_HALF + w / 2 && z > -575) continue
      if (Math.abs(z - STREET_Z) < ROAD_HALF + d / 2 && x > -20) continue
      if (Math.abs(x - TOWER.x) < 26 && Math.abs(z - TOWER.z) < 26) continue
      if (rand() < 0.18) continue
      // downtown (z −260 … −500) is taller; height also rises away from the road
      const downtown = z < -250 && z > -520 ? 1 : 0
      const distFromRoad = Math.min(Math.abs(x), 200) / 200
      const h = 8 + rand() * (30 + downtown * 70) + distFromRoad * 40 * rand()
      out.push({ x, z, w, d, h })
    }
  }
  out.push(TOWER)
  return out
}

export function GreyboxCity() {
  const buildings = useMemo(generateCity, [])
  const ref = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current!
    const o = new Object3D()
    const c = new Color()
    buildings.forEach((b, i) => {
      o.position.set(b.x, b.h / 2, b.z)
      o.scale.set(b.w, b.h, b.d)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      const tone = 0.16 + (i % 7) * 0.025
      mesh.setColorAt(i, c.setRGB(tone, tone, tone * 1.15))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [buildings])

  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, buildings.length]}>
        <boxGeometry />
        <meshStandardMaterial roughness={0.85} metalness={0.1} />
      </instancedMesh>
      <Roads />
    </group>
  )
}

/** Ground, highway, cross street and instanced lane markings. */
function Roads() {
  const dashes = useMemo(() => {
    const list: [number, number, number, number][] = [] // x, z, rotY, len
    for (let z = 30; z > -575; z -= 8) list.push([-3.5, z, 0, 3], [3.5, z, 0, 3])
    for (let x = 14; x < 320; x += 8) list.push([x, STREET_Z - 3.5, Math.PI / 2, 3], [x, STREET_Z + 3.5, Math.PI / 2, 3])
    return list
  }, [])
  const ref = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current!
    const o = new Object3D()
    dashes.forEach(([x, z, r, len], i) => {
      o.position.set(x, 0.03, z)
      o.rotation.set(-Math.PI / 2, 0, r)
      o.scale.set(0.18, len, 1)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [dashes])

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[30, -0.02, -340]}>
        <planeGeometry args={[800, 1000]} />
        <meshStandardMaterial color="#0b0d18" roughness={1} />
      </mesh>
      {/* highway */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -270]}>
        <planeGeometry args={[ROAD_HALF * 2 - 4, 640]} />
        <meshStandardMaterial color="#14161f" roughness={0.6} />
      </mesh>
      {/* cross street */}
      <mesh rotation-x={-Math.PI / 2} position={[150, 0.005, STREET_Z]}>
        <planeGeometry args={[340, ROAD_HALF * 2 - 4]} />
        <meshStandardMaterial color="#14161f" roughness={0.6} />
      </mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, dashes.length]}>
        <planeGeometry />
        <meshBasicMaterial color="#05d9e8" toneMapped={false} />
      </instancedMesh>
    </group>
  )
}
