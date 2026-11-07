import { create } from 'zustand'
import { sectionAt, type SectionId } from './data/sections'
import { FLAGS } from './debugFlags'

export type QualityTier = 'high' | 'medium' | 'low'
export type LoadStage = 'scene' | 'shaders' | 'frames' | 'fonts'
export const LOAD_STAGES: LoadStage[] = ['scene', 'shaders', 'frames', 'fonts']

const AUDIO_KEY = 'neon-drive:audio'

function readAudioPref(): boolean {
  try {
    return localStorage.getItem(AUDIO_KEY) === 'on'
  } catch {
    return false
  }
}

function initialQuality(): QualityTier {
  // Placeholder heuristic — replaced by real GPU detection in Phase 6
  if (FLAGS.quality) return FLAGS.quality
  if (typeof window === 'undefined') return 'high'
  return window.matchMedia('(max-width: 767px), (pointer: coarse)').matches ? 'medium' : 'high'
}

interface ExperienceState {
  /** Master scroll progress 0 → 1. Updated every frame — read it via
   *  `useExperience.getState()` inside useFrame, never as a React subscription. */
  progress: number
  /** Signed scroll velocity (progress units / second), smoothed. */
  velocity: number
  /** Changes only at section boundaries — safe to subscribe to in React. */
  activeSection: SectionId
  /** Remembered audio choice from a previous visit (pre-selects the loader button). */
  audioPreference: boolean
  audioOn: boolean
  quality: QualityTier
  loaded: Record<LoadStage, boolean>
  /** True once the visitor pressed IGNITION / enter silently. */
  started: boolean
  /** Regen-braking demo toggle */
  regenOn: boolean
  setRegen: (on: boolean) => void
  /** Featured project index under the pointer (3D tower or HTML card), −1 if none */
  hoveredProject: number
  setHoveredProject: (i: number) => void
  /** Open detail panels (ids / repo names) */
  openProject: string | null
  openRepo: string | null
  setOpenProject: (id: string | null) => void
  setOpenRepo: (name: string | null) => void
  /** Data District language filter (null = all) */
  langFilter: string | null
  setLangFilter: (lang: string | null) => void
  setScroll: (progress: number, velocity: number) => void
  setAudio: (on: boolean) => void
  setQuality: (q: QualityTier) => void
  markLoaded: (stage: LoadStage) => void
  start: (withAudio: boolean) => void
}

export const useExperience = create<ExperienceState>()((set, get) => ({
  progress: 0,
  velocity: 0,
  activeSection: 'hero',
  audioPreference: readAudioPref(),
  audioOn: false,
  quality: initialQuality(),
  loaded: { scene: false, shaders: false, frames: false, fonts: false },
  started: false,
  regenOn: true,
  setRegen: (regenOn) => set({ regenOn }),
  hoveredProject: -1,
  setHoveredProject: (hoveredProject) => {
    if (get().hoveredProject !== hoveredProject) set({ hoveredProject })
  },
  openProject: null,
  openRepo: null,
  setOpenProject: (openProject) => set({ openProject, openRepo: null }),
  setOpenRepo: (openRepo) => set({ openRepo, openProject: null }),
  langFilter: null,
  setLangFilter: (langFilter) => set({ langFilter }),
  setScroll: (progress, velocity) => {
    const id = sectionAt(progress).id
    if (id !== get().activeSection) set({ progress, velocity, activeSection: id })
    else set({ progress, velocity })
  },
  setAudio: (audioOn) => {
    try {
      localStorage.setItem(AUDIO_KEY, audioOn ? 'on' : 'off')
    } catch {
      /* storage unavailable — choice just isn't remembered */
    }
    set({ audioOn, audioPreference: audioOn })
  },
  setQuality: (quality) => set({ quality }),
  markLoaded: (stage) => {
    if (!get().loaded[stage]) set({ loaded: { ...get().loaded, [stage]: true } })
  },
  start: (withAudio) => {
    get().setAudio(withAudio)
    set({ started: true })
  },
}))
