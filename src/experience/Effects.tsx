import { useFrame } from '@react-three/fiber'
import { Bloom, ChromaticAberration, EffectComposer, FXAA, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { Vector2 } from 'three'
import { useExperience } from '../store'
import { FLAGS } from '../debugFlags'
import { PRIORITY } from './renderOrder'

const CA_OFFSET = new Vector2(0.0007, 0.0005)

/**
 * Bloom is "selective" by luminance: only HDR emissives (signs, light bars,
 * lane dashes, roofline strips — colours pushed > 1 with toneMapped=false)
 * cross the threshold. Facades, windows and the road stay crisp.
 *
 * Anti-aliasing is FXAA (a cheap post effect), not MSAA: multisampled half-float
 * buffers caused intermittent black frames on some Intel/ANGLE drivers and
 * cost more on integrated GPUs. `?msaa=on` re-enables MSAA for comparison.
 */
export function Effects() {
  const quality = useExperience((s) => s.quality)
  if (!FLAGS.fx) return <PlainRender />

  if (quality === 'low') {
    return (
      <EffectComposer multisampling={0} renderPriority={PRIORITY.RENDER}>
        <Bloom mipmapBlur luminanceThreshold={1} intensity={0.9} radius={0.6} levels={5} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    )
  }
  const chain = [
    <Bloom key="bloom" mipmapBlur luminanceThreshold={1.05} luminanceSmoothing={0.08} intensity={0.85} radius={0.6} />,
    <ChromaticAberration key="ca" offset={CA_OFFSET} radialModulation modulationOffset={0.35} />,
    <ToneMapping key="tone" mode={ToneMappingMode.ACES_FILMIC} />,
    <Vignette key="vig" offset={0.28} darkness={0.72} />,
    <Noise key="grain" premultiply blendFunction={BlendFunction.SCREEN} opacity={0.32} />,
  ]
  if (!FLAGS.msaa) chain.push(<FXAA key="fxaa" />)
  return (
    <EffectComposer multisampling={FLAGS.msaa ? 4 : 0} renderPriority={PRIORITY.RENDER}>
      {chain}
    </EffectComposer>
  )
}

/** With post-processing off we still own the render (priorities > 0 disable R3F's auto-render). */
function PlainRender() {
  useFrame(({ gl, scene, camera }) => {
    gl.setRenderTarget(null)
    gl.render(scene, camera)
  }, PRIORITY.RENDER)
  return null
}
