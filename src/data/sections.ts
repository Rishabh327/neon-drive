/**
 * Story beats mapped onto the master scroll progress (0 → 1).
 * Single source of truth for: camera keyframes, overlay sections,
 * the top-bar district indicator and scene lazy-loading.
 */
export type SectionId =
  | 'hero'
  | 'shatter'
  | 'ignition'
  | 'about'
  | 'projects'
  | 'skills'
  | 'regen'
  | 'district'
  | 'rooftop'
  | 'contact'

export interface Section {
  id: SectionId
  /** Name shown in the top-bar district indicator */
  district: string
  start: number
  end: number
}

export const SECTIONS: Section[] = [
  { id: 'hero', district: 'Skyline', start: 0.0, end: 0.1 },
  { id: 'shatter', district: 'Descent', start: 0.1, end: 0.18 },
  { id: 'ignition', district: 'Ignition', start: 0.18, end: 0.25 },
  { id: 'about', district: 'Billboard Row', start: 0.25, end: 0.35 },
  { id: 'projects', district: 'Downtown', start: 0.35, end: 0.6 },
  { id: 'skills', district: 'Cockpit', start: 0.6, end: 0.7 },
  { id: 'regen', district: 'Intersection', start: 0.7, end: 0.78 },
  { id: 'district', district: 'Data District', start: 0.78, end: 0.88 },
  { id: 'rooftop', district: 'Rooftop', start: 0.88, end: 0.96 },
  { id: 'contact', district: 'Transmit', start: 0.96, end: 1.0 },
]

export function sectionAt(progress: number): Section {
  for (const s of SECTIONS) if (progress < s.end) return s
  return SECTIONS[SECTIONS.length - 1]
}

/** Total scroll length in viewport heights. Shorter path on phones. */
export const SCROLL_LENGTH_VH = { desktop: 1400, mobile: 1000 }
