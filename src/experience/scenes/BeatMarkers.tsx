import { useMemo } from 'react'
import { BufferGeometry, Line, LineBasicMaterial } from 'three'
import { positionCurve } from '../cameraPath'

/**
 * Phase-1 placeholders that mark where each story beat will live.
 * Every one of these gets replaced by the real scene in Phase 2/3.
 */
export function BeatMarkers({ debug }: { debug: boolean }) {
  return (
    <group>
      {/* Hero: name slab hanging in the sky */}
      <mesh position={[0, 165, -10]}>
        <boxGeometry args={[90, 14, 2]} />
        <meshBasicMaterial color="#ff2a6d" toneMapped={false} />
      </mesh>

      {/* About: billboards along the road */}
      {[-90, -125, -160, -195, -230].map((z, i) => (
        <mesh key={z} position={[i % 2 ? 16 : -16, 12, z]} rotation-y={i % 2 ? -0.5 : 0.5}>
          <boxGeometry args={[14, 7, 0.4]} />
          <meshBasicMaterial color="#7b2cff" toneMapped={false} />
        </mesh>
      ))}

      {/* Projects: 7 hologram towers downtown */}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[i % 2 ? 15 : -15, 20, -290 - i * 28]}>
          <boxGeometry args={[6, 40, 6]} />
          <meshBasicMaterial color="#05d9e8" toneMapped={false} wireframe />
        </mesh>
      ))}

      {/* Regen: intersection marker */}
      <mesh position={[0, 0.05, -560]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[9, 10, 48]} />
        <meshBasicMaterial color="#f9f871" toneMapped={false} />
      </mesh>

      {/* Data District kiosks */}
      {Array.from({ length: 16 }, (_, i) => (
        <mesh key={i} position={[30 + i * 12, 2, i % 2 ? -572 : -548]}>
          <boxGeometry args={[4, 4, 4]} />
          <meshBasicMaterial color="#05d9e8" toneMapped={false} wireframe />
        </mesh>
      ))}

      {/* Rooftop terminal */}
      <mesh position={[240, 153, -600]}>
        <boxGeometry args={[3, 2, 0.3]} />
        <meshBasicMaterial color="#ff2a6d" toneMapped={false} />
      </mesh>

      {debug && <PathLine />}
    </group>
  )
}


function PathLine() {
  const line = useMemo(() => {
    const g = new BufferGeometry().setFromPoints(positionCurve.getPoints(600))
    return new Line(g, new LineBasicMaterial({ color: '#f9f871' }))
  }, [])
  return <primitive object={line} />
}
