import { useMemo } from 'react'
import { Color, Quaternion, Vector3 } from 'three'

/** A strut between two points in car-local space (for A-pillars). */
function Strut({ from, to, thickness = 0.06, color = '#0b0c14' }: { from: [number, number, number]; to: [number, number, number]; thickness?: number; color?: string }) {
  const { pos, quat, len } = useMemo(() => {
    const a = new Vector3(...from)
    const b = new Vector3(...to)
    const dir = b.clone().sub(a)
    const len = dir.length()
    const quat = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), dir.normalize())
    return { pos: a.add(b).multiplyScalar(0.5), quat, len }
  }, [from, to])
  return (
    <mesh position={pos} quaternion={quat}>
      <boxGeometry args={[thickness, thickness, len]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

/**
 * What you see from the (centre) driver's seat: dashboard, yoke, A-pillars and
 * roof liner framing the windshield. The skills HUD itself is HTML.
 * Car-local: +Z forward, eye at ≈ (0, 1.1, −0.2).
 */
export function Cockpit() {
  const glow = useMemo(() => new Color('#05d9e8').multiplyScalar(2), [])
  const dim = useMemo(() => new Color('#05d9e8').multiplyScalar(0.5), [])
  const magenta = useMemo(() => new Color('#ff2a6d').multiplyScalar(1.6), [])
  return (
    <group>
      {/* dashboard */}
      <mesh position={[0, 0.88, 0.78]}>
        <boxGeometry args={[1.75, 0.16, 0.62]} />
        <meshBasicMaterial color="#06070c" />
      </mesh>
      {/* ambient light strip along the dash */}
      <mesh position={[0, 0.965, 0.48]}>
        <boxGeometry args={[1.5, 0.008, 0.008]} />
        <meshBasicMaterial color={glow} toneMapped={false} />
      </mesh>
      {/* instrument screen */}
      <mesh position={[0, 1.0, 0.56]} rotation-x={-0.5}>
        <planeGeometry args={[0.46, 0.16]} />
        <meshBasicMaterial color={dim} toneMapped={false} />
      </mesh>
      {/* yoke */}
      <mesh position={[0, 0.94, 0.36]} rotation-x={0.35}>
        <torusGeometry args={[0.17, 0.016, 8, 32, Math.PI * 1.25]} />
        <meshStandardMaterial color="#14161f" roughness={0.5} metalness={0.5} envMapIntensity={0.25} />
      </mesh>
      <mesh position={[0, 1.02, 0.39]} rotation-x={0.35}>
        <boxGeometry args={[0.05, 0.008, 0.008]} />
        <meshBasicMaterial color={magenta} toneMapped={false} />
      </mesh>
      {/* A-pillars and windshield header */}
      <Strut from={[0.8, 0.95, 1.15]} to={[0.66, 1.26, 0.25]} />
      <Strut from={[-0.8, 0.95, 1.15]} to={[-0.66, 1.26, 0.25]} />
      <Strut from={[-0.68, 1.26, 0.27]} to={[0.68, 1.26, 0.27]} thickness={0.07} />
      <mesh position={[0, 1.235, 0.28]}>
        <boxGeometry args={[1.3, 0.006, 0.006]} />
        <meshBasicMaterial color={glow} toneMapped={false} />
      </mesh>
      {/* roof liner + door tops */}
      <mesh position={[0, 1.28, -0.45]}>
        <boxGeometry args={[1.5, 0.03, 1.45]} />
        <meshBasicMaterial color="#040509" />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={s} position={[s * 0.82, 0.92, -0.2]}>
          <boxGeometry args={[0.08, 0.1, 2.4]} />
          <meshBasicMaterial color="#06070c" />
        </mesh>
      ))}
    </group>
  )
}
