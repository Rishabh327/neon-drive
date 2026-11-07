import { useMemo } from 'react'
import { BufferGeometry, Line, LineBasicMaterial } from 'three'
import { positionCurve } from '../cameraPath'

/** Debug only (?debug / dev): the camera's spline. */
export function PathLine() {
  const line = useMemo(() => {
    const g = new BufferGeometry().setFromPoints(positionCurve.getPoints(800))
    return new Line(g, new LineBasicMaterial({ color: '#f9f871' }))
  }, [])
  return <primitive object={line} />
}
