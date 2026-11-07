import { useEffect, useRef } from 'react'

/** Set by the 3D scene when the pointer is over something clickable (towers, kiosks). */
export const cursorState = { over3D: false, label: '' as string }

const INTERACTIVE = 'a[href], button:not([disabled]), [role="switch"], [data-cursor]'

/**
 * Neon reticle that trails the pointer and grows over anything interactive —
 * DOM or 3D. Only on fine pointers (mouse/trackpad); touch keeps the OS default.
 */
export function Cursor() {
  const ring = useRef<HTMLDivElement>(null)
  const dot = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.documentElement.classList.add('has-reticle')
    const target = { x: innerWidth / 2, y: innerHeight / 2 }
    const pos = { ...target }
    let overDom = false
    let visible = false
    let scale = 1

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return
      target.x = e.clientX
      target.y = e.clientY
      if (!visible) {
        visible = true
        pos.x = target.x
        pos.y = target.y
        ring.current?.classList.add('is-visible')
        dot.current?.classList.add('is-visible')
      }
    }
    const onOver = (e: PointerEvent) => {
      overDom = !!(e.target as Element | null)?.closest?.(INTERACTIVE)
    }
    const onLeave = () => {
      visible = false
      ring.current?.classList.remove('is-visible')
      dot.current?.classList.remove('is-visible')
    }
    const onDown = () => ring.current?.classList.add('is-down')
    const onUp = () => ring.current?.classList.remove('is-down')

    let raf = 0
    const tick = () => {
      const k = reduced ? 1 : 0.22
      pos.x += (target.x - pos.x) * k
      pos.y += (target.y - pos.y) * k
      const hot = overDom || cursorState.over3D
      scale += ((hot ? 1.9 : 1) - scale) * (reduced ? 1 : 0.2)
      if (ring.current) {
        ring.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`
        ring.current.classList.toggle('is-hot', hot)
      }
      if (dot.current) dot.current.style.transform = `translate3d(${target.x}px, ${target.y}px, 0) translate(-50%, -50%)`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    window.addEventListener('pointermove', onMove)
    document.addEventListener('pointerover', onOver)
    document.documentElement.addEventListener('pointerleave', onLeave)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    return () => {
      cancelAnimationFrame(raf)
      document.documentElement.classList.remove('has-reticle')
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerover', onOver)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  return (
    <>
      <div ref={ring} className="reticle" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div ref={dot} className="reticle-dot" aria-hidden="true" />
    </>
  )
}
