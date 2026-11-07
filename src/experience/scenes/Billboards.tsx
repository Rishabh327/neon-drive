import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { type Group, ShaderMaterial } from 'three'
import { BILLBOARDS, type Billboard } from '../../data/profile'
import { ACCENT_HEX } from '../../data/projects'
import { FONT, spacedText, useCanvasTexture } from '../canvasText'
import { BILLBOARD_LAYOUT, billboardLevel } from './aboutLayout'
import basicVert from '../shaders/basic.vert'

const W = 15
const H = 7.5

const frag = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOn;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec4 t = texture2D(uMap, vUv);
    float scan = 0.82 + 0.18 * sin(vUv.y * 420.0 - uTime * 4.0);
    float hum = 0.95 + 0.05 * sin(uTime * 60.0 + vUv.y * 3.0);
    // neon (bright) pixels light up; the dark panel stays dark
    float lum = max(t.r, max(t.g, t.b));
    vec3 col = t.rgb * mix(0.05, 1.9, uOn) * scan * hum * (0.6 + lum * 0.6);
    col += vec3(0.01, 0.012, 0.03); // panel never fully black
    gl_FragColor = vec4(col, 1.0);
  }
`

function drawBillboard(b: Billboard) {
  return (g: CanvasRenderingContext2D, w: number, h: number) => {
    const accent = ACCENT_HEX[b.color]
    g.fillStyle = '#05060f'
    g.fillRect(0, 0, w, h)
    // frame: double neon tube with corner notches
    g.strokeStyle = accent
    g.lineWidth = 10
    g.strokeRect(22, 22, w - 44, h - 44)
    g.globalAlpha = 0.35
    g.lineWidth = 3
    g.strokeRect(44, 44, w - 88, h - 88)
    g.globalAlpha = 1
    g.fillStyle = accent
    for (const [x, y] of [[22, 22], [w - 62, 22], [22, h - 30], [w - 62, h - 30]]) g.fillRect(x, y, 40, 8)

    g.textBaseline = 'alphabetic'
    g.fillStyle = accent
    g.font = `600 34px ${FONT.mono}`
    spacedText(g, `// ${b.kicker}`, 80, 128, 6)

    // title: shrink to fit
    let size = 150
    g.font = `700 ${size}px ${FONT.display}`
    while (g.measureText(b.title).width + b.title.length * 6 > w - 160 && size > 60) {
      size -= 6
      g.font = `700 ${size}px ${FONT.display}`
    }
    g.fillStyle = '#ffffff'
    g.shadowColor = accent
    g.shadowBlur = 30
    spacedText(g, b.title, 80, 128 + size + 16, 6)
    g.shadowBlur = 0

    g.fillStyle = '#c9cde6'
    g.font = `500 38px ${FONT.sans}`
    g.fillText(b.line, 82, h - 86)
  }
}

function Sign({ index }: { index: number }) {
  const b = BILLBOARDS[index]
  const L = BILLBOARD_LAYOUT[index]
  const tex = useCanvasTexture(1024, 512, drawBillboard(b), [b])
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: basicVert,
        fragmentShader: frag,
        uniforms: { uMap: { value: tex }, uOn: { value: 0 }, uTime: { value: 0 } },
        toneMapped: false,
      }),
    [tex],
  )
  useFrame(({ camera, clock }) => {
    mat.uniforms.uOn.value = billboardLevel(index, camera.position.z)
    mat.uniforms.uTime.value = clock.elapsedTime
  })
  return (
    <group position={[L.x, 0, L.z]} rotation-y={L.rotY}>
      {/* pole + backing */}
      <mesh position-y={L.y / 2 - 1}>
        <boxGeometry args={[0.45, L.y + 2 - H / 2, 0.45]} />
        <meshStandardMaterial color="#141622" metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[0, L.y, -0.22]}>
        <boxGeometry args={[W + 0.5, H + 0.5, 0.35]} />
        <meshStandardMaterial color="#0b0c14" metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh position-y={L.y} material={mat}>
        <planeGeometry args={[W, H]} />
      </mesh>
    </group>
  )
}

export function Billboards() {
  const group = useRef<Group>(null)
  useFrame(({ camera }) => {
    // only around the About stretch of road
    if (group.current) group.current.visible = camera.position.z < 40 && camera.position.z > -300
  })
  return (
    <group ref={group}>
      {BILLBOARDS.map((_, i) => (
        <Sign key={i} index={i} />
      ))}
    </group>
  )
}
