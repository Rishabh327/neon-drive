/**
 * Deterministic city layout shared by buildings, signs and street furniture.
 * World layout (units ≈ metres) — see cameraPath.ts for the camera side.
 *   Highway along −Z at x = 0 (z +40 … −570), cross street along +X at z = −560.
 */
import { TOWER_LAYOUT } from './scenes/projectsLayout'
export const ROAD_HALF = 10
export const STREET_Z = -560
export const TOWER = { x: 240, z: -610, w: 30, d: 30, h: 150 }

/** Plots kept free of buildings for set pieces: billboards (aboutLayout) and project towers. */
const CLEAR_PLOTS = [
  ...Array.from({ length: 6 }, (_, i) => ({ x: (i % 2 ? 1 : -1) * 16, z: -78 - i * 31, r: 11 })),
  ...TOWER_LAYOUT.map((t) => ({ x: t.x, z: t.z, r: 6 })),
  { x: 197, z: -584, r: 23 }, // contribution wall (districtLayout.ts)
]

export function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface Building {
  x: number
  z: number
  w: number
  d: number
  h: number
}

export interface Sign {
  x: number
  y: number
  z: number
  w: number
  h: number
  rotY: number
  color: [number, number, number]
  seed: number
}

const NEON: [number, number, number][] = [
  [1.0, 0.165, 0.427], // magenta
  [0.02, 0.85, 0.91], // cyan
  [0.48, 0.17, 1.0], // violet
  [1.0, 0.165, 0.427],
  [0.02, 0.85, 0.91],
  [0.98, 0.97, 0.44], // acid (rare)
]

function generate() {
  const rand = mulberry32(1337)
  const buildings: Building[] = []
  const cell = 16
  const CLEAR = ROAD_HALF + 4 // sidewalk
  const FRONT = 13 // depth band owned by the frontage rows
  const blocked = (x: number, z: number, w: number, d: number) =>
    (Math.abs(x - TOWER.x) < TOWER.w / 2 + w / 2 + 4 && Math.abs(z - TOWER.z) < TOWER.d / 2 + d / 2 + 4) ||
    CLEAR_PLOTS.some((c) => Math.abs(x - c.x) < c.r + w / 2 && Math.abs(z - c.z) < c.r + d / 2)
  const heightAt = (z: number, base: number) => {
    const downtown = z < -250 && z > -520 ? 1 : 0
    return base + rand() * (26 + downtown * 70)
  }

  // 1) Street frontage: a continuous (gappy) wall of buildings lining both roads
  for (const side of [-1, 1]) {
    for (let z = 70; z > -575; ) {
      const w = 7 + rand() * 6 // depth away from the road
      const d = 8 + rand() * 9 // length along the road
      const x = side * (CLEAR + w / 2 + rand() * 1.2)
      const zc = z - d / 2
      z -= d + 0.6 + rand() * 1.8
      // left side caps the T-junction; right side must stop short of the cross street
      if (zc - d / 2 < (side > 0 ? STREET_Z + CLEAR : -575)) break
      if (rand() < 0.1 || blocked(x, zc, w, d)) continue
      buildings.push({ x, z: zc, w, d, h: heightAt(zc, 12) })
    }
  }
  for (const side of [-1, 1]) {
    for (let x = CLEAR + FRONT + 2; x < 340; ) {
      const d = 7 + rand() * 6
      const w = 8 + rand() * 9
      const z = STREET_Z + side * (CLEAR + d / 2 + rand() * 1.2)
      const xc = x + w / 2
      x += w + 0.6 + rand() * 1.8
      if (rand() < 0.1 || blocked(xc, z, w, d)) continue
      buildings.push({ x: xc, z, w, d, h: 12 + rand() * 40 })
    }
  }

  // 2) The grid behind the frontage
  for (let gx = -300; gx <= 360; gx += cell) {
    for (let gz = 80; gz >= -780; gz -= cell) {
      const x = gx + (rand() - 0.5) * 4
      const z = gz + (rand() - 0.5) * 4
      const w = 7 + rand() * 7
      const d = 7 + rand() * 7
      if (Math.abs(x) < CLEAR + FRONT + w / 2 && z > -580 - FRONT) continue
      if (Math.abs(z - STREET_Z) < CLEAR + FRONT + d / 2 && x > -20 - FRONT) continue
      if (blocked(x, z, w, d)) continue
      if (rand() < 0.12) continue
      const distFromRoad = Math.min(Math.abs(x), 200) / 200
      buildings.push({ x, z, w, d, h: heightAt(z, 10) + distFromRoad * 45 * rand() })
    }
  }
  buildings.push(TOWER)

  // Neon signs on the facades that face the roads
  const signs: Sign[] = []
  const addSign = (b: Building, faceX: number | null, faceZ: number | null, rotY: number) => {
    const vertical = rand() < 0.65
    const w = vertical ? 1.6 + rand() * 1.8 : 5 + rand() * 5
    const h = vertical ? 5 + rand() * 9 : 1.4 + rand() * 1.4
    const maxY = Math.max(6, Math.min(b.h - h / 2 - 1, 34))
    const y = Math.min(maxY, 5 + h / 2 + rand() * 22)
    const along = (rand() - 0.5) * ((faceX !== null ? b.d : b.w) - w - 0.5)
    signs.push({
      x: faceX ?? b.x + along,
      y,
      z: faceZ ?? b.z + along,
      w,
      h,
      rotY,
      color: NEON[Math.floor(rand() * NEON.length)],
      seed: rand(),
    })
  }
  for (const b of buildings) {
    if (b === TOWER) continue
    // facing the highway
    if (Math.abs(b.x) - b.w / 2 < CLEAR + 10 && b.z > -580 && rand() < 0.6) {
      const s = Math.sign(b.x)
      addSign(b, b.x - s * (b.w / 2 + 0.06), null, s > 0 ? -Math.PI / 2 : Math.PI / 2)
    }
    // facing the cross street
    if (Math.abs(b.z - STREET_Z) - b.d / 2 < CLEAR + 10 && b.x > 10 && rand() < 0.6) {
      const s = Math.sign(b.z - STREET_Z)
      addSign(b, null, b.z - s * (b.d / 2 + 0.06), s > 0 ? Math.PI : 0)
    }
  }

  // Streetlights along both roads
  const lights: { x: number; z: number; rotY: number }[] = []
  for (let z = 20; z > -540; z -= 30) {
    lights.push({ x: -ROAD_HALF - 1, z, rotY: 0 }, { x: ROAD_HALF + 1, z: z - 15, rotY: Math.PI })
  }
  for (let x = 30; x < 330; x += 30) {
    lights.push({ x, z: STREET_Z - ROAD_HALF - 1, rotY: -Math.PI / 2 }, { x: x + 15, z: STREET_Z + ROAD_HALF + 1, rotY: Math.PI / 2 })
  }

  return { buildings, signs, lights }
}

export const CITY = generate()
