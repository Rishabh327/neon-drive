import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, type Group, ShaderMaterial, Vector3 } from 'three'
import { useExperience } from '../../store'
import { brakeIntensity, BRAKE_A, BRAKE_B, recoveredWh } from '../regenModel'
import { window4 } from '../beat'
import { REGEN } from '../../data/profile'
import basicVert from '../shaders/basic.vert'

const COUNT = 900
const WHEELS = [
  new Vector3(0.86, 0.36, 1.45),
  new Vector3(-0.86, 0.36, 1.45),
  new Vector3(0.86, 0.36, -1.45),
  new Vector3(-0.86, 0.36, -1.45),
]
const BATTERY = new Vector3(0, 2.6, -0.2)

const particleVert = /* glsl */ `
  attribute vec3 aRand;
  uniform vec3 uWheels[4];
  uniform vec3 uBattery;
  uniform float uTime;
  uniform float uIntensity;
  uniform float uRegen;       // 1 = energy flows to the battery, 0 = brake heat sparks
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;

  vec3 bezier(vec3 a, vec3 b, vec3 c, vec3 d, float t) {
    float u = 1.0 - t;
    return u*u*u*a + 3.0*u*u*t*b + 3.0*u*t*t*c + t*t*t*d;
  }

  void main() {
    int wi = int(aRand.z * 3.999);
    vec3 w = uWheels[wi];
    float ph = fract(uTime * (0.7 + aRand.y * 0.5) + aRand.x);
    // regen: wheel → up and inward → battery
    vec3 c1 = w + vec3(-sign(w.x) * 0.2, 0.9 + aRand.y * 0.5, 0.0);
    vec3 c2 = uBattery + vec3(sin(aRand.x * 40.0) * 0.6, -0.9, cos(aRand.y * 30.0) * 0.4);
    vec3 regenPos = bezier(w, c1, c2, uBattery + vec3((aRand.y - 0.5) * 0.9, 0.0, 0.0), ph);
    // heat: sparks shed off the brake discs and rise / fall away
    vec3 heatPos = w + vec3(sign(w.x) * (0.18 + ph * 0.5), (aRand.y - 0.3) * ph * 1.2, (aRand.x - 0.5) * 0.6 * ph - ph * 0.8);
    vec3 pos = mix(heatPos, regenPos, uRegen);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(5.5 * uPixelRatio * (8.0 / -mv.z), 1.0, 14.0);
    vAlpha = uIntensity * sin(ph * 3.14159) * step(aRand.y, 0.25 + 0.75 * uIntensity);
    vColor = mix(vec3(1.0, 0.42, 0.12) * 3.0, vec3(0.15, 0.6, 1.0) * 3.2, uRegen);
    if (vAlpha <= 0.002) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  }
`
const particleFrag = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vAlpha;
    if (!(a > 0.002)) discard;
    gl_FragColor = vec4(vColor * a, a);
  }
`

/** Battery hologram floating over the car: outline + charge level + pulse when charging. */
const batteryFrag = /* glsl */ `
  uniform float uFill;
  uniform float uOn;
  uniform float uCharging;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * vec2(2.2, 1.0);
    // body 0.1–2.0 × 0.15–0.85, nub on the right
    vec2 lo = vec2(0.1, 0.15), hi = vec2(2.0, 0.85);
    vec2 dLo = p - lo, dHi = hi - p;
    float inside = step(0.0, min(min(dLo.x, dLo.y), min(dHi.x, dHi.y)));
    float border = inside * (1.0 - step(0.045, min(min(dLo.x, dLo.y), min(dHi.x, dHi.y))));
    float nub = step(2.0, p.x) * step(p.x, 2.12) * step(0.36, p.y) * step(p.y, 0.64);
    float level = lo.x + 0.06 + (hi.x - lo.x - 0.12) * uFill;
    float fillM = inside * (1.0 - border) * step(p.x, level) * step(0.21, p.y) * step(p.y, 0.79);
    float cells = 0.8 + 0.2 * step(0.08, fract((p.x - lo.x) * 6.0));
    float pulse = 0.7 + 0.3 * sin(uTime * 8.0 - p.x * 6.0) * uCharging;
    vec3 col = vec3(0.05, 0.85, 0.91) * (border * 2.2 + nub * 2.2) + vec3(0.15, 0.6, 1.0) * fillM * cells * pulse * 1.9;
    float a = clamp(border + nub + fillM * 0.9, 0.0, 1.0) * uOn;
    if (!(a > 0.002)) discard;
    gl_FragColor = vec4(col * a, a);
  }
`

/** Regen-braking stop (70–78%): energy particles wheels → battery, or brake-heat sparks with regen off. */
export function RegenFX() {
  const gl = useThree((s) => s.gl)
  const group = useRef<Group>(null)

  const particles = useMemo(() => {
    const g = new BufferGeometry()
    const rand = new Float32Array(COUNT * 3)
    for (let i = 0; i < rand.length; i++) rand[i] = Math.random()
    g.setAttribute('aRand', new BufferAttribute(rand, 3))
    g.setAttribute('position', new BufferAttribute(new Float32Array(COUNT * 3), 3))
    const m = new ShaderMaterial({
      vertexShader: particleVert,
      fragmentShader: particleFrag,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uWheels: { value: WHEELS },
        uBattery: { value: BATTERY },
        uTime: { value: 0 },
        uIntensity: { value: 0 },
        uRegen: { value: 1 },
        uPixelRatio: { value: 1 },
      },
    })
    return { g, m }
  }, [])

  const battery = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: basicVert,
        fragmentShader: batteryFrag,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uFill: { value: 0.5 }, uOn: { value: 0 }, uCharging: { value: 0 }, uTime: { value: 0 } },
      }),
    [],
  )

  useFrame(({ clock }) => {
    const { progress: p, regenOn } = useExperience.getState()
    const show = window4(p, BRAKE_A - 0.006, BRAKE_A + 0.004, 0.785, 0.8)
    if (group.current) group.current.visible = show > 0.002
    if (show <= 0.002) return
    const brake = brakeIntensity(p)
    const u = particles.m.uniforms
    u.uTime.value = clock.elapsedTime
    u.uIntensity.value = brake
    u.uRegen.value = regenOn ? 1 : 0
    u.uPixelRatio.value = gl.getPixelRatio()

    // fill: the recovered energy, magnified so the stop is visible (exact numbers live in the HUD)
    const gained = recoveredWh(p, regenOn).regen
    const maxGain = recoveredWh(BRAKE_B + 0.01, true).regen
    battery.uniforms.uFill.value = REGEN.startSoC * 0.6 + 0.35 * (gained / maxGain)
    battery.uniforms.uOn.value = show
    battery.uniforms.uCharging.value = regenOn ? brake : 0
    battery.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <group ref={group} visible={false}>
      <points geometry={particles.g} material={particles.m} frustumCulled={false} />
      {/* faces backwards (−Z local) toward the chase camera */}
      <mesh position={BATTERY} rotation-y={Math.PI} material={battery}>
        <planeGeometry args={[1.76, 0.8]} />
      </mesh>
    </group>
  )
}
