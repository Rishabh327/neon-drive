import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector2 } from 'three'
import { useExperience, type QualityTier } from '../store'
import { FLAGS } from '../debugFlags'
import { PRIORITY } from './renderOrder'
import { NeonPost, type PostSettings } from './post/NeonPost'

/**
 * Bloom is "selective" by luminance: only HDR emissives (signs, light bars,
 * lane dashes, roofline strips — colours pushed > 1) cross the threshold.
 * Facades, windows and the road stay crisp.
 */
const SETTINGS: Record<QualityTier, PostSettings> = {
  high: { bloom: 0.3, threshold: 1.05, mips: 6, ca: 0.0016, vignette: 0.75, grain: 0.05, fxaa: true },
  medium: { bloom: 0.32, threshold: 1.05, mips: 5, ca: 0.0016, vignette: 0.75, grain: 0.05, fxaa: true },
  low: { bloom: 0.36, threshold: 1.05, mips: 4, ca: 0, vignette: 0.6, grain: 0, fxaa: false },
}

/** The live pipeline, so the world's compile stage can precompile its shaders too. */
export const postRegistry: { current: NeonPost | null } = { current: null }

const _size = new Vector2()

/** Owns the final render each frame: our post pipeline, or a plain render with ?fx=off. */
export function Effects() {
  const quality = useExperience((s) => s.quality)
  const post = useMemo(() => (FLAGS.fx ? new NeonPost(SETTINGS[quality]) : null), [quality])

  useEffect(() => {
    postRegistry.current = post
    return () => {
      if (postRegistry.current === post) postRegistry.current = null
      post?.dispose()
    }
  }, [post])

  useFrame(({ gl, scene, camera, clock }) => {
    if (!post) {
      gl.setRenderTarget(null)
      gl.render(scene, camera)
      return
    }
    gl.getDrawingBufferSize(_size)
    post.setSize(_size.x, _size.y)
    post.render(gl, scene, camera, clock.elapsedTime)
  }, PRIORITY.RENDER)

  return null
}
