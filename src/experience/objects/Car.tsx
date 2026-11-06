import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  Color,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Shape,
  ShaderMaterial,
  Vector3,
} from 'three'
import { useExperience } from '../../store'
import { carRoadParam, roadAt, roadParamOf } from '../carPath'
import { carState } from '../carState'

/**
 * "NEON-01" — an original single-seat EV wedge, built procedurally (no model
 * download, no brand). Local axes: +Z is the nose, +Y up, origin on the ground.
 */
function profileShape(points: [number, number][]) {
  const s = new Shape()
  s.moveTo(points[0][0], points[0][1])
  for (const [x, y] of points.slice(1)) s.lineTo(x, y)
  s.closePath()
  return s
}

function extrudeAcross(shape: Shape, width: number, bevel: number) {
  const g = new ExtrudeGeometry(shape, {
    depth: width - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 4,
  })
  // shape is drawn in (z, y); extrusion runs along +Z → rotate so it runs across X
  g.translate(0, 0, -(width - bevel * 2) / 2)
  g.rotateY(-Math.PI / 2) // shape-x (length) → +Z
  g.computeVertexNormals()
  return g
}

function useCarGeometry() {
  return useMemo(() => {
    // side profile (z, y): long low nose, fastback tail
    const body = extrudeAcross(
      profileShape([
        [-2.3, 0.32],
        [2.2, 0.3],
        [2.36, 0.46],
        [2.3, 0.66],
        [1.25, 0.9],
        [-1.95, 0.96],
        [-2.36, 0.84],
        [-2.38, 0.5],
      ]),
      1.96,
      0.07,
    )
    const cabin = extrudeAcross(
      profileShape([
        [1.2, 0.9],
        [0.25, 1.27],
        [-1.15, 1.25],
        [-1.95, 0.96],
      ]),
      1.62,
      0.05,
    )
    return { body, cabin }
  }, [])
}

const trailVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
const trailFrag = /* glsl */ `
  uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
  void main() {
    float a = pow(1.0 - vUv.y, 2.2) * (1.0 - abs(vUv.x - 0.5) * 2.0) * uOpacity;
    gl_FragColor = vec4(uColor * a, a);
  }
`

const _pos = new Vector3()

export function Car() {
  const { body, cabin } = useCarGeometry()
  const root = useRef<Group>(null)
  const wheels = useRef<Object3D[]>([])
  const trails = useRef<Mesh[]>([])
  const state = useRef({ s: 25, speed: 0, wheelAngle: 0 })

  const mats = useMemo(() => {
    const headColor = new Color('#bff8ff')
    const tailColor = new Color('#ff2a6d')
    return {
      head: new MeshBasicMaterial({ color: headColor.clone().multiplyScalar(0.05), toneMapped: false }),
      tail: new MeshBasicMaterial({ color: tailColor.clone().multiplyScalar(4), toneMapped: false }),
      rim: new MeshBasicMaterial({ color: new Color('#05d9e8').multiplyScalar(2.2), toneMapped: false }),
      headOn: headColor.multiplyScalar(6),
      headOff: new Color('#bff8ff').multiplyScalar(0.05),
      trail: new ShaderMaterial({
        vertexShader: trailVert,
        fragmentShader: trailFrag,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uColor: { value: tailColor.clone().multiplyScalar(3) }, uOpacity: { value: 0 } },
      }),
      underglow: new ShaderMaterial({
        vertexShader: trailVert,
        fragmentShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            float d = length((vUv - 0.5) * vec2(1.0, 0.55)) * 2.0;
            float a = smoothstep(1.0, 0.1, d) * 0.55;
            gl_FragColor = vec4(vec3(0.48, 0.17, 1.0) * 2.0 * a, a);
          }`,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    }
  }, [])

  useFrame(({ camera }, delta) => {
    const g = root.current
    if (!g) return
    const { progress } = useExperience.getState()
    const st = state.current

    const s = carRoadParam(progress, roadParamOf(camera.position))
    const ds = s - st.s
    st.s = s
    const instSpeed = delta > 0 ? Math.abs(ds) / delta : 0
    st.speed += (instSpeed - st.speed) * Math.min(1, delta * 5)

    const yaw = roadAt(s, _pos)
    g.position.copy(_pos)
    g.rotation.y = yaw
    // hide the shell once the camera is inside the cabin (HUD takes over in Phase 3)
    g.visible = camera.position.distanceTo(_pos) > 3.2

    st.wheelAngle += ds / 0.36
    for (const w of wheels.current) if (w) w.rotation.x = st.wheelAngle

    // headlights flick on just after ignition (18%)
    let on = 0
    if (progress > 0.205) on = 1
    else if (progress > 0.18) on = Math.sin(progress * 2600) > 0.2 ? 1 : 0.1
    mats.head.color.copy(on > 0.5 ? mats.headOn : mats.headOff)
    // share with the road shader (headlight pool + tail glow)
    carState.position.copy(_pos)
    carState.direction.set(Math.sin(yaw), 0, Math.cos(yaw))
    carState.headlights.value = on
    carState.speed = st.speed

    // tail-light streaks stretch with speed
    const len = Math.min(st.speed * 0.06, 9)
    for (const t of trails.current) {
      if (!t) continue
      t.scale.y = Math.max(len, 0.001)
      t.position.z = -2.4 - len / 2
    }
    mats.trail.uniforms.uOpacity.value = Math.min(1, st.speed / 25)
  })

  const wheelPositions: [number, number, number][] = [
    [0.86, 0.36, 1.45],
    [-0.86, 0.36, 1.45],
    [0.86, 0.36, -1.45],
    [-0.86, 0.36, -1.45],
  ]

  return (
    <group>
      <group ref={root}>
        <mesh geometry={body}>
          <meshPhysicalMaterial
            color="#3a4058"
            metalness={0.65}
            roughness={0.24}
            clearcoat={1}
            clearcoatRoughness={0.06}
            envMapIntensity={1.4}
          />
        </mesh>
        <mesh geometry={cabin}>
          <meshPhysicalMaterial color="#03040a" metalness={0.9} roughness={0.04} envMapIntensity={2} />
        </mesh>

        {/* full-width front light bar + rear light blade */}
        <mesh position={[0, 0.6, 2.36]} material={mats.head}>
          <boxGeometry args={[1.7, 0.045, 0.04]} />
        </mesh>
        <mesh position={[0, 0.8, -2.42]} material={mats.tail}>
          <boxGeometry args={[1.84, 0.06, 0.04]} />
        </mesh>
        {/* roof light-pipes — keep the silhouette readable against the dark road */}
        {[1, -1].map((side) => (
          <mesh key={`roof${side}`} position={[side * 0.74, 1.24, -0.45]} rotation-x={0.02} material={mats.rim}>
            <boxGeometry args={[0.025, 0.025, 1.35]} />
          </mesh>
        ))}
        {/* side accent lines */}
        {[1, -1].map((side) => (
          <mesh key={side} position={[side * 1.0, 0.5, 0.1]} material={mats.rim}>
            <boxGeometry args={[0.02, 0.025, 3.4]} />
          </mesh>
        ))}

        {wheelPositions.map((p, i) => (
          <group key={i} position={p} ref={(o) => void (wheels.current[i] = o!)}>
            <mesh rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.36, 0.36, 0.28, 20]} />
              <meshStandardMaterial color="#07080d" roughness={0.7} />
            </mesh>
            <mesh rotation-y={Math.PI / 2} position-x={Math.sign(p[0]) * 0.145} material={mats.rim}>
              <torusGeometry args={[0.24, 0.012, 6, 24]} />
            </mesh>
          </group>
        ))}

        {/* violet underglow */}
        <mesh rotation-x={-Math.PI / 2} position-y={0.04} scale={[2.8, 5.6, 1]} material={mats.underglow}>
          <planeGeometry />
        </mesh>

        {/* tail-light streaks (flat ribbons trailing behind) */}
        {[0.75, -0.75].map((x, i) => (
          <mesh
            key={x}
            ref={(m) => void (trails.current[i] = m!)}
            rotation-x={-Math.PI / 2}
            position={[x, 0.8, -2.5]}
            material={mats.trail}
          >
            <planeGeometry args={[0.09, 1]} />
          </mesh>
        ))}

      </group>
    </group>
  )
}
