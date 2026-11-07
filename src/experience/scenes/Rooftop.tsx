import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, type Group, type MeshBasicMaterial } from 'three'
import { TOWER } from '../cityLayout'
import { FONT, spacedText, useCanvasTexture } from '../canvasText'

const TOP = TOWER.h
const X0 = TOWER.x - TOWER.w / 2
const X1 = TOWER.x + TOWER.w / 2
const Z0 = TOWER.z - TOWER.d / 2
const Z1 = TOWER.z + TOWER.d / 2

/** Terminal kiosk in front of the final camera, the rest of the roof dressing around it. */
export function Rooftop() {
  const group = useRef<Group>(null)
  const beacon = useRef<MeshBasicMaterial>(null)
  const magenta = useMemo(() => new Color('#ff2a6d').multiplyScalar(2.2), [])
  const cyan = useMemo(() => new Color('#05d9e8').multiplyScalar(2.2), [])
  const acid = useMemo(() => new Color('#f9f871').multiplyScalar(1.4), [])
  const red = useMemo(() => new Color('#ff2030').multiplyScalar(4), [])
  const off = useMemo(() => new Color('#300008'), [])

  const screen = useCanvasTexture(512, 320, (g, w, h) => {
    g.fillStyle = '#04050c'
    g.fillRect(0, 0, w, h)
    g.strokeStyle = '#05d9e8'
    g.lineWidth = 6
    g.strokeRect(10, 10, w - 20, h - 20)
    g.fillStyle = '#05d9e8'
    g.font = `600 30px ${FONT.mono}`
    g.fillText('> open channel', 36, 84)
    g.fillText('  to rishabh_', 36, 128)
    g.fillStyle = 'rgba(201,205,230,0.7)'
    g.font = `400 22px ${FONT.mono}`
    g.fillText('status ........ online', 36, 196)
    g.fillText('uplink ........ ready', 36, 232)
    g.fillStyle = '#ff2a6d'
    g.font = `700 30px ${FONT.display}`
    spacedText(g, 'TRANSMIT', 36, 286, 8)
  })

  useFrame(({ camera, clock }) => {
    if (group.current) group.current.visible = camera.position.y > 30 && camera.position.x > 150
    if (beacon.current) beacon.current.color.copy(Math.sin(clock.elapsedTime * 3.2) > 0.55 ? red : off)
  })

  const rails: [number, number, number, number, number][] = [
    // x, z, length, rotY, colour index
    [TOWER.x, Z0, TOWER.w, 0, 0],
    [TOWER.x, Z1, TOWER.w, 0, 1],
    [X0, TOWER.z, TOWER.d, Math.PI / 2, 1],
    [X1, TOWER.z, TOWER.d, Math.PI / 2, 0],
  ]

  return (
    <group ref={group} visible={false}>
      {/* roof slab + glowing parapet edges */}
      <mesh position={[TOWER.x, TOP + 0.4, TOWER.z]}>
        <boxGeometry args={[TOWER.w, 0.8, TOWER.d]} />
        <meshStandardMaterial color="#0c0d16" roughness={0.8} metalness={0.3} />
      </mesh>
      {rails.map(([x, z, len, ry, ci], i) => (
        <mesh key={i} position={[x, TOP + 1.05, z]} rotation-y={ry}>
          <boxGeometry args={[len, 0.06, 0.06]} />
          <meshBasicMaterial color={ci ? cyan : magenta} toneMapped={false} />
        </mesh>
      ))}

      {/* helipad */}
      <mesh position={[TOWER.x + 4, TOP + 0.82, TOWER.z - 4]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[5.4, 5.7, 64]} />
        <meshBasicMaterial color={acid} toneMapped={false} />
      </mesh>
      <mesh position={[TOWER.x + 4, TOP + 0.82, TOWER.z - 4]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[3.6, 3.75, 64]} />
        <meshBasicMaterial color={acid} toneMapped={false} transparent opacity={0.5} />
      </mesh>

      {/* antenna mast + beacon */}
      <mesh position={[X1 - 3, TOP + 9, Z0 + 3]}>
        <cylinderGeometry args={[0.12, 0.25, 18, 8]} />
        <meshStandardMaterial color="#1a1c2a" metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[X1 - 3, TOP + 18.3, Z0 + 3]}>
        <sphereGeometry args={[0.35, 12, 12]} />
        <meshBasicMaterial ref={beacon} color={red} toneMapped={false} />
      </mesh>

      {/* HVAC blocks */}
      {[
        [X1 - 6, Z1 - 6],
        [X1 - 11, Z1 - 5],
        [X0 + 5, Z0 + 6],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, TOP + 1.6, z]}>
          <boxGeometry args={[3.4, 1.6, 2.4]} />
          <meshStandardMaterial color="#12141e" roughness={0.6} metalness={0.5} />
        </mesh>
      ))}

      {/* transmit terminal — in frame for the final camera at (238,156,−614) */}
      <group position={[231, TOP + 0.8, -603]} rotation-y={2.57}>
        <mesh position-y={0.7}>
          <boxGeometry args={[1.9, 1.4, 0.5]} />
          <meshStandardMaterial color="#10121c" metalness={0.7} roughness={0.35} />
        </mesh>
        <mesh position={[0, 1.55, 0.05]} rotation-x={-0.35}>
          <boxGeometry args={[2.1, 1.35, 0.12]} />
          <meshStandardMaterial color="#0a0b12" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.57, 0.13]} rotation-x={-0.35}>
          <planeGeometry args={[1.9, 1.19]} />
          <meshBasicMaterial map={screen} toneMapped={false} color={new Color(1.6, 1.6, 1.6)} />
        </mesh>
      </group>
    </group>
  )
}
