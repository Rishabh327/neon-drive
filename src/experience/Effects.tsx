import { Bloom, ChromaticAberration, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { Vector2 } from 'three'
import { useExperience } from '../store'
import { FLAGS } from '../debugFlags'

const CA_OFFSET = new Vector2(0.0007, 0.0005)

/**
 * Bloom is "selective" by luminance: only HDR emissives (signs, light bars,
 * lane dashes, roofline strips — colours pushed > 1 with toneMapped=false)
 * cross the threshold. Facades, windows and the road stay crisp.
 */
export function Effects() {
  const quality = useExperience((s) => s.quality)
  if (quality === 'low') {
    return (
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur luminanceThreshold={1} intensity={0.9} radius={0.6} levels={5} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    )
  }
  return (
    <EffectComposer multisampling={quality === 'high' && FLAGS.msaa ? 4 : 0}>
      <Bloom mipmapBlur luminanceThreshold={1.05} luminanceSmoothing={0.08} intensity={0.85} radius={0.6} />
      <ChromaticAberration offset={CA_OFFSET} radialModulation modulationOffset={0.35} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.28} darkness={0.72} />
      <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.32} />
    </EffectComposer>
  )
}
