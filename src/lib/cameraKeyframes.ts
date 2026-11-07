/**
 * Camera keyframes (three-free) — see cameraPath.ts for the world layout notes.
 * Each keyframe pins a camera position + look target to an exact scroll progress.
 */
export interface Keyframe {
  p: number
  pos: [number, number, number]
  look: [number, number, number]
}

export const KEYFRAMES: Keyframe[] = [
  // Hero — high above the city, name hanging in the sky ahead
  { p: 0.0, pos: [0, 175, 150], look: [0, 165, 0] },
  { p: 0.08, pos: [0, 160, 105], look: [0, 150, -20] },
  // Shatter — dive with the particle river down to the road
  { p: 0.14, pos: [0, 70, 50], look: [0, 0, -70] },
  { p: 0.18, pos: [0, 10, 5], look: [0, 1, -80] },
  // Ignition — settle behind the car
  { p: 0.25, pos: [0, 4.2, -30], look: [0, 1.6, -80] },
  // About — billboard row, slight weave
  { p: 0.3, pos: [-1.5, 4.6, -110], look: [1, 2.5, -170] },
  { p: 0.35, pos: [1.2, 4.6, -200], look: [0, 3, -260] },
  // Projects — downtown towers
  { p: 0.47, pos: [-1.5, 6, -310], look: [2, 6, -370] },
  { p: 0.6, pos: [0, 5, -430], look: [0, 3, -490] },
  // Skills HUD — inside the car
  // eye height 1.1 m: below the 1.27 m roofline of the car
  { p: 0.65, pos: [0, 1.1, -470], look: [0, 1.0, -520] },
  { p: 0.7, pos: [0, 1.1, -510], look: [0, 1.0, -560] },
  // Regen — braking hard into the intersection
  { p: 0.78, pos: [0, 3.5, -540], look: [10, 2, -565] },
  // Data District — turn right, cruise along +X
  { p: 0.83, pos: [50, 5, -555], look: [110, 4, -562] },
  { p: 0.88, pos: [170, 6, -555], look: [230, 20, -600] },
  // Rooftop — rise up the tallest tower's west face (tower spans x 225…255, z −625…−595),
  // staying outside it, then crest the roof edge
  { p: 0.92, pos: [216, 70, -590], look: [232, 110, -606] },
  { p: 0.945, pos: [218, 148, -600], look: [236, 152, -612] },
  { p: 0.96, pos: [232, 158, -609], look: [120, 90, -400] },
  // Transmit — settle over the roof, terminal in front, the whole city beyond
  { p: 1.0, pos: [238, 156, -614], look: [100, 70, -390] },
]


const last = KEYFRAMES.length - 1

/** Map scroll progress → curve parameter so each keyframe sits at its exact progress. */
export function progressToU(progress: number): number {
  const p = Math.min(1, Math.max(0, progress))
  for (let i = 0; i < last; i++) {
    const a = KEYFRAMES[i]
    const b = KEYFRAMES[i + 1]
    if (p <= b.p) {
      const t = (p - a.p) / (b.p - a.p)
      // smoothstep inside a segment keeps velocity continuous-looking at keyframes
      const s = t * t * (3 - 2 * t)
      const blend = 0.35 // 0 = linear, 1 = full ease (would stop at every keyframe)
      return (i + t + (s - t) * blend) / last
    }
  }
  return 1
}

/** Camera z at progress p — linear between keyframes (good enough for UI sync). */
export function cameraZAt(progress: number): number {
  const u = progressToU(progress) * last
  const i = Math.min(last - 1, Math.floor(u))
  const t = u - i
  return KEYFRAMES[i].pos[2] * (1 - t) + KEYFRAMES[i + 1].pos[2] * t
}
