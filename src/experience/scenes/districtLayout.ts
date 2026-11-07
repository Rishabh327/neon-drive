import { STREET_Z } from '../cityLayout'

/** Repo kiosks line both sidewalks of the cross street, newest first (nearest the corner). */
export function kioskLayout(i: number) {
  const north = i % 2 === 0
  const z = STREET_Z + (north ? 12.5 : -12.5)
  // face the street and the oncoming (+X travelling) camera
  const nx = -0.62
  const nz = north ? -0.78 : 0.78
  return { x: 34 + i * 12.5, z, rotY: Math.atan2(nx, nz) }
}

/** Contribution "city lights" wall on the south sidewalk, facing the street. */
export const WALL = { x0: 176, z: STREET_Z - 14.6, cell: 0.78, topY: 12 }
