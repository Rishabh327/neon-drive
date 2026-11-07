import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Color, type Group, InstancedBufferAttribute, type InstancedMesh, Object3D, ShaderMaterial } from 'three'
import { GITHUB, LANG_COLOR, OTHER_REPOS, relativeTime } from '../../data/projects'
import { FONT, spacedText, useCanvasTexture } from '../canvasText'
import { kioskLayout, WALL } from './districtLayout'
import { useExperience } from '../../store'
import { cursorState } from '../../overlay/Cursor'

const TILE_W = 512
const TILE_H = 320
const COLS = 4

const screenVert = /* glsl */ `
  attribute vec4 aTile; // uv offset (xy) + scale (zw) into the atlas
  varying vec2 vUv;
  void main() {
    vUv = aTile.xy + uv * aTile.zw;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
  }
`
const screenFrag = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(uAtlas, vUv).rgb;
    float scan = 0.85 + 0.15 * sin(vUv.y * 2600.0 - uTime * 3.0);
    gl_FragColor = vec4(c * scan * 1.45, 1.0);
  }
`

function drawAtlas(g: CanvasRenderingContext2D) {
  OTHER_REPOS.forEach((r, i) => {
    const x = (i % COLS) * TILE_W
    const y = Math.floor(i / COLS) * TILE_H
    const lang = r.language ? (LANG_COLOR[r.language] ?? '#888') : '#05d9e8'
    g.save()
    g.translate(x, y)
    g.fillStyle = '#070815'
    g.fillRect(0, 0, TILE_W, TILE_H)
    g.fillStyle = lang
    g.fillRect(0, 0, TILE_W, 10)
    g.strokeStyle = 'rgba(5,217,232,0.55)'
    g.lineWidth = 4
    g.strokeRect(6, 16, TILE_W - 12, TILE_H - 22)

    g.fillStyle = '#05d9e8'
    g.font = `600 22px ${FONT.mono}`
    spacedText(g, `REPO // ${String(i + 1).padStart(2, '0')}`, 28, 58, 3)

    let size = 52
    g.font = `700 ${size}px ${FONT.display}`
    while (g.measureText(r.name).width > TILE_W - 56 && size > 24) {
      size -= 2
      g.font = `700 ${size}px ${FONT.display}`
    }
    g.fillStyle = '#ffffff'
    g.fillText(r.name, 28, 72 + size)

    g.font = `400 24px ${FONT.mono}`
    g.fillStyle = lang
    g.beginPath()
    g.arc(36, 214, 9, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#c9cde6'
    g.fillText(r.language ?? '—', 56, 222)
    g.fillText(`★ ${r.stars}`, TILE_W - 120, 222)
    g.fillStyle = 'rgba(201,205,230,0.7)'
    g.font = `400 22px ${FONT.mono}`
    g.fillText(`pushed ${relativeTime(r.pushedAt)}`, 28, 278)
    g.restore()
  })
}

function Kiosks() {
  const n = OTHER_REPOS.length
  const rows = Math.max(1, Math.ceil(n / COLS))
  const atlas = useCanvasTexture(TILE_W * COLS, TILE_H * rows, drawAtlas, [n])
  const bodies = useRef<InstancedMesh>(null)
  const screens = useRef<InstancedMesh>(null)
  const strips = useRef<InstancedMesh>(null)
  const mat = useMemo(
    () => new ShaderMaterial({ vertexShader: screenVert, fragmentShader: screenFrag, uniforms: { uAtlas: { value: atlas }, uTime: { value: 0 } }, toneMapped: false }),
    [atlas],
  )

  // per-kiosk visibility factor (1 = standing, 0 = sunk into the pavement by the language filter)
  const fac = useRef(new Float32Array(n).fill(1))
  const langFilter = useExperience((s) => s.langFilter)

  const writeMatrices = () => {
    const o = new Object3D()
    OTHER_REPOS.forEach((_, i) => {
      const k = kioskLayout(i)
      const f = fac.current[i]
      const sink = (1 - f) * 5
      o.rotation.set(0, k.rotY, 0)
      o.position.set(k.x, 2.3 - sink, k.z)
      o.scale.set(3.4, 4.6, 0.9).multiplyScalar(Math.max(f, 0.001))
      o.updateMatrix()
      bodies.current!.setMatrixAt(i, o.matrix)
      o.scale.set(1, 1, 1)
      o.position.set(k.x, 2.75 - sink, k.z)
      o.translateZ(0.46)
      o.scale.set(3.0, 1.875, 1).multiplyScalar(Math.max(f, 0.001))
      o.updateMatrix()
      screens.current!.setMatrixAt(i, o.matrix)
      o.position.set(k.x, 4.65 - sink, k.z)
      o.scale.set(3.4, 0.12, 0.95).multiplyScalar(Math.max(f, 0.001))
      o.updateMatrix()
      strips.current!.setMatrixAt(i, o.matrix)
    })
    for (const m of [bodies.current!, screens.current!, strips.current!]) m.instanceMatrix.needsUpdate = true
  }

  useLayoutEffect(() => {
    const tiles = new Float32Array(n * 4)
    const c = new Color()
    OTHER_REPOS.forEach((r, i) => {
      strips.current!.setColorAt(i, c.set(r.language ? (LANG_COLOR[r.language] ?? '#05d9e8') : '#05d9e8').multiplyScalar(2.2))
      // atlas tile (texture v runs bottom → top)
      const col = i % COLS
      const row = Math.floor(i / COLS)
      tiles.set([col / COLS, 1 - (row + 1) / rows, 1 / COLS, 1 / rows], i * 4)
    })
    screens.current!.geometry.setAttribute('aTile', new InstancedBufferAttribute(tiles, 4))
    if (strips.current!.instanceColor) strips.current!.instanceColor.needsUpdate = true
    writeMatrices()
    for (const m of [bodies.current!, screens.current!, strips.current!]) m.computeBoundingSphere()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, rows])

  useFrame(({ clock }, delta) => {
    mat.uniforms.uTime.value = clock.elapsedTime
    let moving = false
    OTHER_REPOS.forEach((r, i) => {
      const target = !langFilter || (r.language ?? 'Other') === langFilter ? 1 : 0
      const f = fac.current[i]
      if (Math.abs(f - target) > 0.002) {
        fac.current[i] = f + (target - f) * Math.min(1, delta * 6)
        moving = true
      } else fac.current[i] = target
    })
    if (moving && bodies.current) writeMatrices()
  })

  const handlers = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      cursorState.over3D = e.instanceId !== undefined && fac.current[e.instanceId] > 0.5
    },
    onPointerOut: () => {
      cursorState.over3D = false
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      const i = e.instanceId
      if (i !== undefined && fac.current[i] > 0.5) useExperience.getState().setOpenRepo(OTHER_REPOS[i].name)
    },
  }

  if (!n) return null
  return (
    <group>
      <instancedMesh ref={bodies} args={[undefined, undefined, n]} {...handlers}>
        <boxGeometry />
        <meshStandardMaterial color="#10121c" metalness={0.7} roughness={0.35} />
      </instancedMesh>
      <instancedMesh ref={screens} args={[undefined, mat, n]} {...handlers}>
        <planeGeometry />
      </instancedMesh>
      <instancedMesh ref={strips} args={[undefined, undefined, n]}>
        <boxGeometry />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

/** GitHub contribution calendar as a wall of city lights (one instanced mesh). */
function ContributionWall() {
  const data = GITHUB.contributions
  const cells = useMemo(() => {
    if (!data?.days.length) return []
    const first = new Date(data.days[0].date + 'T00:00:00Z')
    const offset = first.getUTCDay() // 0 = Sunday → top row
    return data.days.map((d, i) => ({ week: Math.floor((i + offset) / 7), day: (i + offset) % 7, level: d.level }))
  }, [data])
  const weeks = cells.length ? cells[cells.length - 1].week + 1 : 0
  const ref = useRef<InstancedMesh>(null)

  const title = useCanvasTexture(1024, 128, (g) => {
    g.fillStyle = '#05d9e8'
    g.font = `600 44px ${FONT.mono}`
    spacedText(g, `${data?.total ?? '—'} CONTRIBUTIONS · LAST 12 MONTHS`, 8, 60, 4)
    g.fillStyle = 'rgba(201,205,230,0.75)'
    g.font = `400 30px ${FONT.mono}`
    g.fillText('github.com/Rishabh327', 8, 112)
  })

  useLayoutEffect(() => {
    const m = ref.current
    if (!m || !cells.length) return
    const o = new Object3D()
    const c = new Color()
    const ramp = [new Color('#0e2a33').multiplyScalar(0.6), new Color('#05d9e8').multiplyScalar(0.45), new Color('#05d9e8'), new Color('#05d9e8').multiplyScalar(1.8), new Color('#bff8ff').multiplyScalar(2.8)]
    cells.forEach((cell, i) => {
      o.position.set(WALL.x0 + cell.week * WALL.cell, WALL.topY - cell.day * WALL.cell, WALL.z + 0.2)
      o.scale.set(WALL.cell * 0.78, WALL.cell * 0.78, 0.08)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      m.setColorAt(i, c.copy(ramp[Math.min(4, cell.level)]))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.computeBoundingSphere()
  }, [cells])

  if (!cells.length) return null
  const width = weeks * WALL.cell
  const cx = WALL.x0 + width / 2 - WALL.cell / 2
  return (
    <group>
      {/* backing slab on two legs */}
      <mesh position={[cx, WALL.topY - 3 * WALL.cell + 0.7, WALL.z - 0.1]}>
        <boxGeometry args={[width + 1.6, 7 * WALL.cell + 3.2, 0.4]} />
        <meshStandardMaterial color="#0b0c14" metalness={0.6} roughness={0.5} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[cx + s * (width / 2 - 2), (WALL.topY - 6 * WALL.cell) / 2 - 0.6, WALL.z - 0.1]}>
          <boxGeometry args={[0.5, WALL.topY - 6 * WALL.cell - 1.2, 0.5]} />
          <meshStandardMaterial color="#141622" metalness={0.8} roughness={0.4} />
        </mesh>
      ))}
      <instancedMesh ref={ref} args={[undefined, undefined, cells.length]}>
        <boxGeometry />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <mesh position={[WALL.x0 - WALL.cell / 2 + 8, WALL.topY + 1.55, WALL.z + 0.12]}>
        <planeGeometry args={[16, 2]} />
        <meshBasicMaterial map={title} transparent toneMapped={false} />
      </mesh>
    </group>
  )
}

export function DataDistrict() {
  const group = useRef<Group>(null)
  useFrame(({ camera }) => {
    if (group.current) group.current.visible = camera.position.z < -380
  })
  return (
    <group ref={group}>
      <Kiosks />
      <ContributionWall />
    </group>
  )
}
