import { create } from 'zustand'
import { sectionAt, type SectionId } from './data/sections'

export type QualityTier = 'high' | 'medium' | 'low'

interface ExperienceState {
  /** Master scroll progress 0 → 1. Updated every frame — read it via
   *  `useExperience.getState()` inside useFrame, never as a React subscription. */
  progress: number
  /** Signed scroll velocity (progress units / second), smoothed. */
  velocity: number
  /** Changes only at section boundaries — safe to subscribe to in React. */
  activeSection: SectionId
  audioOn: boolean
  quality: QualityTier
  setScroll: (progress: number, velocity: number) => void
  setAudio: (on: boolean) => void
  setQuality: (q: QualityTier) => void
}

export const useExperience = create<ExperienceState>()((set, get) => ({
  progress: 0,
  velocity: 0,
  activeSection: 'hero',
  audioOn: false,
  quality: 'high',
  setScroll: (progress, velocity) => {
    const id = sectionAt(progress).id
    if (id !== get().activeSection) set({ progress, velocity, activeSection: id })
    else set({ progress, velocity })
  },
  setAudio: (audioOn) => set({ audioOn }),
  setQuality: (quality) => set({ quality }),
}))
