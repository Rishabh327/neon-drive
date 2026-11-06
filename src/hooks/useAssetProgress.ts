import { useEffect, useState } from 'react'
import { DefaultLoadingManager } from 'three'

/**
 * Streamed-asset progress (GLTF / KTX2 / textures) from three's default loading
 * manager — the same source drei's useProgress reads, without pulling drei
 * into the initial bundle.
 */
export function useAssetProgress() {
  const [state, setState] = useState({ progress: 0, total: 0 })
  useEffect(() => {
    const prevStart = DefaultLoadingManager.onStart
    const prevProgress = DefaultLoadingManager.onProgress
    const update = (_url: string, loaded: number, total: number) =>
      setState({ progress: total ? (loaded / total) * 100 : 100, total })
    DefaultLoadingManager.onStart = update
    DefaultLoadingManager.onProgress = update
    return () => {
      DefaultLoadingManager.onStart = prevStart
      DefaultLoadingManager.onProgress = prevProgress
    }
  }, [])
  return state
}
