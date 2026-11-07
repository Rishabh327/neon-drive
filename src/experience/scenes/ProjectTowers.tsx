import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  type Group,
  LineBasicMaterial,
  type Mesh,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three'
import { ACCENT_HEX, FEATURED } from '../../data/projects'
import { useExperience } from '../../store'
import { CARD_BASE_W, projectCardEls } from '../../overlay/projectCardRegistry'
import { cursorState } from '../../overlay/Cursor'
import { easeOutCubic } from '../beat'
import { radarAt, TOWER_LAYOUT, unfoldAt } from './projectsLayout'
import { RAIN_LAYER } from '../objects/Rain'
import basicVert from '../shaders/basic.vert'
import holoTowerVert from '../shaders/holoTower.vert'
import holoTowerFrag from '../shaders/holoTower.frag'
import holoPanelFrag from '../shaders/holoPanel.frag'
import radarFrag from '../shaders/radar.frag'

const PANEL_W = 16
const PANEL_H = 10 // 16:10, same as the HTML card
const TOWER_W = 5

const _a = new Vector3()
const _b = new Vector3()
const _c = new Vector3()

function Project({ index }: { index: number }) {
  const P = FEATURED[index]
  const L = TOWER_LAYOUT[index]
  const color = useMemo(() => new Color(ACCENT_HEX[P.accent]), [P.accent])
  const group = useRef<Group>(null)
  const panel = useRef<Mesh>(null)
  const pivot = useRef<Group>(null)
  const hover = useRef(0)

  const towerMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: holoTowerVert,
        fragmentShader: holoTowerFrag,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        uniforms: {
          uColor: { value: color },
          uSize: { value: new Vector3(TOWER_W, L.height, TOWER_W) },
          uTime: { value: 0 },
          uActive: { value: 0 },
        },
      }),
    [color, L.height],
  )
  const panelMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: basicVert,
        fragmentShader: holoPanelFrag,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        uniforms: {
          uColor: { value: color },
          uTime: { value: 0 },
          uUnfold: { value: 0 },
          uSize: { value: new Vector2(PANEL_W, PANEL_H) },
        },
      }),
    [color],
  )
  // projector beams: tower top → panel corners
  const beams = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(12), 3))
    const m = new LineBasicMaterial({ color: color.clone().multiplyScalar(2), transparent: true, blending: AdditiveBlending, depthWrite: false })
    return { g, m }
  }, [color])

  const towerTop = useMemo(() => new Vector3(L.x - L.side * TOWER_W * 0.5, L.height, L.z), [L])
  const hoverPos = useMemo(() => new Vector3(...L.hover), [L])

  useFrame(({ camera, clock, size, pointer }, delta) => {
    const st = useExperience.getState()
    const p = st.progress
    const u = unfoldAt(index, p)
    const t = clock.elapsedTime
    // hover (3D tower or its HTML card): brighten + lean toward the cursor
    const hv = (hover.current += ((st.hoveredProject === index ? 1 : 0) - hover.current) * Math.min(1, delta * 8))
    towerMat.uniforms.uTime.value = t
    towerMat.uniforms.uActive.value = Math.min(1.6, u + hv * 0.9)
    if (pivot.current) {
      pivot.current.rotation.z = -pointer.x * 0.07 * hv
      pivot.current.rotation.x = -pointer.y * 0.05 * hv
    }
    panelMat.uniforms.uTime.value = t
    const e = easeOutCubic(u)
    panelMat.uniforms.uUnfold.value = e

    const g = group.current
    if (g) g.visible = camera.position.z < L.z + 220 && camera.position.z > L.z - 30
    const pm = panel.current
    const el = projectCardEls[index]
    if (!pm) return

    if (u < 0.002) {
      pm.visible = false
      beams.m.opacity = 0
      if (el && el.dataset.on !== '0') {
        el.dataset.on = '0'
        el.style.visibility = 'hidden'
        el.style.opacity = '0'
      }
      return
    }

    // unfold: slide from the tower top to the hover point, scale out from a sliver
    pm.visible = true
    pm.position.lerpVectors(towerTop, hoverPos, e)
    pm.lookAt(camera.position)
    // lean toward the pointer while hovered
    _c.copy(pm.position).project(camera)
    const tiltY = Math.max(-1, Math.min(1, pointer.x - _c.x)) * 0.22 * hv
    const tiltX = Math.max(-1, Math.min(1, pointer.y - _c.y)) * 0.16 * hv
    pm.rotateY(tiltY)
    pm.rotateX(-tiltX)
    pm.scale.set(Math.max(0.02, e), 0.25 + 0.75 * e, 1)
    pm.updateMatrixWorld()

    // beams to the two near corners
    const pos = beams.g.getAttribute('position') as BufferAttribute
    _a.set(-PANEL_W / 2, -PANEL_H / 2, 0).applyMatrix4(pm.matrixWorld)
    _b.set(-PANEL_W / 2, PANEL_H / 2, 0).applyMatrix4(pm.matrixWorld)
    pos.setXYZ(0, towerTop.x, towerTop.y, towerTop.z)
    pos.setXYZ(1, _a.x, _a.y, _a.z)
    pos.setXYZ(2, towerTop.x, towerTop.y, towerTop.z)
    pos.setXYZ(3, _b.x, _b.y, _b.z)
    pos.needsUpdate = true
    beams.m.opacity = 0.5 * (1 - Math.abs(e - 0.5) * 1.2)

    // pin the HTML card onto the panel (screen-space centre + width from the two side midpoints)
    if (el) {
      _a.set(0, 0, 0).applyMatrix4(pm.matrixWorld).project(camera)
      _b.set(-PANEL_W / 2, 0, 0).applyMatrix4(pm.matrixWorld).project(camera)
      _c.set(PANEL_W / 2, 0, 0).applyMatrix4(pm.matrixWorld).project(camera)
      // keep the card fully on screen (shrink on narrow viewports, clamp to the edges)
      const margin = 12
      const s = Math.min((Math.abs(_c.x - _b.x) * 0.5 * size.width) / CARD_BASE_W, (size.width - margin * 2) / CARD_BASE_W)
      const halfW = (CARD_BASE_W * s) / 2
      const halfH = (CARD_BASE_W * 0.625 * s) / 2
      const x = Math.min(size.width - halfW - margin, Math.max(halfW + margin, (_a.x * 0.5 + 0.5) * size.width))
      const y = Math.min(size.height - halfH - margin, Math.max(halfH + 64, (-_a.y * 0.5 + 0.5) * size.height))
      const behind = _a.z > 1
      el.dataset.on = '1'
      el.style.visibility = behind ? 'hidden' : 'visible'
      el.style.opacity = String(Math.max(0, (e - 0.35) / 0.65))
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${s.toFixed(4)}) perspective(1100px) rotateY(${((tiltY * 180) / Math.PI).toFixed(2)}deg) rotateX(${((tiltX * 180) / Math.PI).toFixed(2)}deg)`
      el.style.pointerEvents = e > 0.7 ? 'auto' : 'none'
    }
  })

  return (
    <group ref={group}>
      <group ref={pivot} position={[L.x, 0, L.z]}>
        <mesh
          position-y={L.height / 2}
          material={towerMat}
          onPointerOver={(e) => {
            e.stopPropagation()
            useExperience.getState().setHoveredProject(index)
            cursorState.over3D = true
          }}
          onPointerOut={() => {
            useExperience.getState().setHoveredProject(-1)
            cursorState.over3D = false
          }}
          onClick={(e) => {
            e.stopPropagation()
            useExperience.getState().setOpenProject(P.id)
          }}
        >
          <boxGeometry args={[TOWER_W, L.height, TOWER_W]} />
        </mesh>
      </group>
      {/* a little emissive plinth so the tower reads as standing on the street */}
      <mesh position={[L.x, 0.15, L.z]}>
        <boxGeometry args={[TOWER_W + 1.2, 0.3, TOWER_W + 1.2]} />
        <meshBasicMaterial color={color.clone().multiplyScalar(1.6)} toneMapped={false} />
      </mesh>
      <mesh ref={panel} material={panelMat} visible={false}>
        <planeGeometry args={[PANEL_W, PANEL_H]} />
      </mesh>
      <lineSegments geometry={beams.g} material={beams.m} />
    </group>
  )
}

/** AlertNet: radar sweep + alert pings on the ground around its tower. */
function AlertNetRadar() {
  const L = TOWER_LAYOUT[0]
  const R = 70
  const mesh = useRef<Mesh>(null)
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: basicVert,
        fragmentShader: radarFrag,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uOn: { value: 0 }, uRadius: { value: R } },
      }),
    [],
  )
  useFrame(({ clock }) => {
    const on = radarAt(useExperience.getState().progress)
    mat.uniforms.uOn.value = on
    mat.uniforms.uTime.value = clock.elapsedTime
    if (mesh.current) mesh.current.visible = on > 0.002
  })
  return (
    <mesh ref={mesh} position={[0, 0.07, L.z + 4]} rotation-x={-Math.PI / 2} material={mat} layers={RAIN_LAYER} visible={false}>
      <planeGeometry args={[R * 2, R * 2]} />
    </mesh>
  )
}

export function ProjectTowers() {
  return (
    <group>
      {FEATURED.map((p, i) => (
        <Project key={p.id} index={i} />
      ))}
      <AlertNetRadar />
    </group>
  )
}
