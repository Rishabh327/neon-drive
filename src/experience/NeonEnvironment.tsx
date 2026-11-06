import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Color, DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry, PMREMGenerator, Scene } from 'three'

/**
 * Bakes a tiny procedural "neon street" environment once with PMREM and sets
 * it as scene.environment — gives car paint and glass their neon reflections.
 * Replaces drei's <Environment> (which bundles HDR/EXR loaders we never use).
 */
export function NeonEnvironment() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)

  useLayoutEffect(() => {
    const env = new Scene()
    env.background = new Color('#020308')
    const plane = new PlaneGeometry(1, 1)
    const add = (hex: string, intensity: number, pos: [number, number, number], scale: [number, number], lookAt: [number, number, number]) => {
      const m = new Mesh(plane, new MeshBasicMaterial({ color: new Color(hex).multiplyScalar(intensity), side: DoubleSide }))
      m.position.set(...pos)
      m.scale.set(scale[0], scale[1], 1)
      m.lookAt(...lookAt)
      env.add(m)
    }
    add('#ff2a6d', 4, [-6, 2, 0], [2, 8], [0, 2, 0])
    add('#05d9e8', 4, [6, 2, 0], [2, 8], [0, 2, 0])
    add('#7b2cff', 2, [0, 6, 0], [10, 2], [0, 0, 0])
    add('#8fa4ff', 0.6, [0, 9, 0], [30, 30], [0, 0, 0]) // soft sky glow
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      add(i % 2 ? '#05d9e8' : '#ff2a6d', 2.5, [Math.sin(a) * 9, 1.2, Math.cos(a) * 9], [4, 0.4], [0, 1.2, 0])
    }

    const pmrem = new PMREMGenerator(gl)
    const rt = pmrem.fromScene(env, 0.02)
    scene.environment = rt.texture
    pmrem.dispose()
    env.traverse((o) => (o as Mesh).isMesh && ((o as Mesh).material as MeshBasicMaterial).dispose())
    plane.dispose()
    return () => {
      scene.environment = null
      rt.dispose()
    }
  }, [gl, scene])

  return null
}
