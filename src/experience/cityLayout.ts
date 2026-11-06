/**
 * Deterministic city layout shared by buildings, signs and street furniture.
 * World layout (units ≈ metres) — see cameraPath.ts for the camera side.
 *   Highway along −Z at x = 0 (z +40 … −570), cross street along +X at z = −560.
 */
export const ROAD_HALF = 10
export const STREET_Z = -560
export const TOWER = { x: 240, z: -610, w: 30, d: 30, h: 150 }

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
  for (let gx = -300; gx <= 360; gx += cell) {
    for (let gz = 80; gz >= -780; gz -= cell) {
      const x = gx + (rand() - 0.5) * 4
      const z = gz + (rand() - 0.5) * 4
      const w = 7 + rand() * 7
      const d = 7 + rand() * 7
      if (Math.abs(x) < CLEAR + w / 2 && z > -580) continue
      if (Math.abs(z - STREET_Z) < CLEAR + d / 2 && x > -20) continue
      if (Math.abs(x - TOWER.x) < 26 && Math.abs(z - TOWER.z) < 26) continue
      if (rand() < 0.12) continue
      const downtown = z < -250 && z > -520 ? 1 : 0
      const distFromRoad = Math.min(Math.abs(x), 200) / 200
      const h = 10 + rand() * (28 + downtown * 75) + distFromRoad * 45 * rand()
      buildings.push({ x, z, w, d, h })
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
