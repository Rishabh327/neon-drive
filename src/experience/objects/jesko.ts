import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Vector3,
  type Material,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

/**
 * "2024 Koenigsegg Jesko Attack #7378" by HYPR:IMPS 3D — CC BY 4.0
 * https://sketchfab.com/3d-models/2024-koenigsegg-jesko-attack-7378-e4e966bcfdf14a8dbc6c837764cb026b
 * Optimised by scripts/process-car.mjs → public/models/jesko.glb (≈140k tris, meshopt, WebP).
 *
 * Restyled for the neon city: midnight-violet clearcoat, dark chrome rims, black
 * glass, magenta tail lights; centre-line emblems and the rear plate are hidden.
 * Local axes match the procedural car: +Z nose, +Y up, origin on the ground.
 */
const M = (n: number | '') => `MI_Engine_Grid_A.001${n === '' ? '' : '_' + n}`
const PART = {
  paint: M(12),
  carbon: M(8),
  rims: M(9),
  glass: M(11),
  tail: [M(28), M(27)],
  hidden: [M(16), M(14), M(53)],
  /** everything that turns with the wheel (rims, tyres, discs) */
  spin: [M(9), M(41), M(42), M(43), M(44)],
  tyres: M(41),
}

export interface JeskoParts {
  /** static body (everything except the spinning wheel parts) */
  body: Group
  /** four wheel pivots (front-right, front-left, rear-right, rear-left), positioned at their axles */
  wheels: Group[]
  wheelCenters: Vector3[]
  wheelRadius: number
  tail: MeshBasicMaterial
  tailBase: Color
}

/** Convert a (possibly quantized/indexed) geometry to plain float, non-indexed, world-space triangles. */
function worldTriangles(mesh: Mesh) {
  const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry
  const out: Record<string, { size: number; data: Float32Array }> = {}
  const count = g.attributes.position.count
  for (const name of ['position', 'normal', 'uv']) {
    const a = g.attributes[name] as BufferAttribute | undefined
    if (!a) continue
    const data = new Float32Array(count * a.itemSize)
    for (let i = 0; i < count; i++)
      for (let c = 0; c < a.itemSize; c++) data[i * a.itemSize + c] = a.getComponent(i, c)
    out[name] = { size: a.itemSize, data }
  }
  const geo = new BufferGeometry()
  for (const [name, { size, data }] of Object.entries(out)) geo.setAttribute(name, new BufferAttribute(data, size))
  geo.applyMatrix4(mesh.matrixWorld)
  return geo
}

/** Copy the triangles whose index passes `keep` into a new geometry (optionally recentred). */
function subset(geo: BufferGeometry, tris: number[], offset?: Vector3) {
  const out = new BufferGeometry()
  for (const name of Object.keys(geo.attributes)) {
    const a = geo.attributes[name] as BufferAttribute
    const data = new Float32Array(tris.length * 3 * a.itemSize)
    tris.forEach((t, k) => data.set(a.array.subarray(t * 3 * a.itemSize, (t + 1) * 3 * a.itemSize) as Float32Array, k * 3 * a.itemSize))
    out.setAttribute(name, new BufferAttribute(data, a.itemSize))
  }
  if (offset) out.translate(-offset.x, -offset.y, -offset.z)
  out.computeBoundingSphere()
  return out
}

function restyle(mat: Material, tail: MeshBasicMaterial): Material {
  const name = mat.name
  const std = mat as MeshStandardMaterial
  if (name === PART.paint)
    return new MeshPhysicalMaterial({
      name,
      color: new Color('#2a2142'),
      metalness: 0.72,
      roughness: 0.24,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.6,
    })
  if (name === PART.carbon) {
    std.color.multiplyScalar(0.55)
    std.envMapIntensity = 1.2
    return std
  }
  if (name === PART.rims) {
    std.color.set('#3a3f4c')
    std.metalness = 1
    std.roughness = 0.22
    std.envMapIntensity = 1.5
    return std
  }
  if (name === PART.glass) {
    std.color.set('#04050c')
    std.metalness = 0.9
    std.roughness = 0.04
    std.envMapIntensity = 2
    std.opacity = 0.82
    return std
  }
  if (PART.tail.includes(name)) return tail
  return mat
}

let pending: Promise<JeskoParts> | null = null

/** Starts loading on first call; later calls share the same promise. */
export function loadJesko(): Promise<JeskoParts> {
  if (pending) return pending
  pending = new Promise((resolve, reject) => {
    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    loader.load(
      '/models/jesko.glb',
      (gltf) => {
        const scene = gltf.scene
        scene.updateMatrixWorld(true)
        const tailBase = new Color('#ff2a6d').multiplyScalar(4)
        const tail = new MeshBasicMaterial({ color: tailBase.clone(), toneMapped: false })

        const meshes: Mesh[] = []
        scene.traverse((o) => (o as Mesh).isMesh && meshes.push(o as Mesh))

        // 1) wheel centres from the tyres: split their triangles into the 4 quadrants
        const tyre = meshes.find((m) => (m.material as Material).name === PART.tyres)
        const centers: Vector3[] = []
        let radius = 0.36
        if (tyre) {
          const geo = worldTriangles(tyre)
          const pos = geo.attributes.position
          const min = [0, 1, 2, 3].map(() => new Vector3(Infinity, Infinity, Infinity))
          const max = [0, 1, 2, 3].map(() => new Vector3(-Infinity, -Infinity, -Infinity))
          const v = new Vector3()
          for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i)
            const q = (v.x > 0 ? 0 : 1) + (v.z > 0 ? 0 : 2)
            min[q].min(v)
            max[q].max(v)
          }
          for (let q = 0; q < 4; q++) centers.push(min[q].clone().add(max[q]).multiplyScalar(0.5))
          radius = (max[0].y - min[0].y) / 2
        }

        // 2) rebuild: static body + four spinning wheel groups
        const body = new Group()
        const wheels = centers.map((c) => {
          const g = new Group()
          g.position.copy(c)
          return g
        })
        const triCount = (m: Mesh) => (m.geometry.index?.count ?? m.geometry.attributes.position.count) / 3
        for (const m of meshes) {
          const original = m.material as Material
          if (PART.hidden.includes(original.name)) continue
          // tiny details (bolts, interior trinkets) are invisible at the car's on-screen
          // size but each costs a draw call (twice, with the road reflection)
          if (triCount(m) < 150 && !PART.tail.includes(original.name) && !PART.spin.includes(original.name)) continue
          const mat = restyle(original, tail)
          if (centers.length === 4 && PART.spin.includes(original.name)) {
            const geo = worldTriangles(m)
            const pos = geo.attributes.position
            const buckets: number[][] = [[], [], [], []]
            const rest: number[] = []
            const c = new Vector3()
            const a = new Vector3()
            for (let t = 0; t < pos.count / 3; t++) {
              c.set(0, 0, 0)
              for (let k = 0; k < 3; k++) c.add(a.fromBufferAttribute(pos, t * 3 + k))
              c.multiplyScalar(1 / 3)
              const q = (c.x > 0 ? 0 : 1) + (c.z > 0 ? 0 : 2)
              const w = centers[q]
              const r = Math.hypot(c.y - w.y, c.z - w.z)
              if (r <= radius * 1.08 && Math.abs(c.x - w.x) < 0.3) buckets[q].push(t)
              else rest.push(t)
            }
            buckets.forEach((tris, q) => {
              if (!tris.length) return
              const wm = new Mesh(subset(geo, tris, centers[q]), mat)
              wheels[q].add(wm)
            })
            if (rest.length) body.add(new Mesh(subset(geo, rest), mat))
            geo.dispose()
          } else {
            // static part: keep the compact (quantized, indexed) geometry, carry its transform
            const mm = new Mesh(m.geometry, mat)
            m.matrixWorld.decompose(mm.position, mm.quaternion, mm.scale)
            body.add(mm)
          }
        }
        for (const g of [body, ...wheels])
          g.traverse((o) => {
            const m = o as Mesh
            if (m.isMesh) m.frustumCulled = true
          })
        resolve({ body, wheels, wheelCenters: centers, wheelRadius: radius, tail, tailBase })
      },
      undefined,
      (err) => reject(err),
    )
  })
  return pending
}
