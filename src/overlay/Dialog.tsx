import { useEffect, useRef, type ReactNode } from 'react'
import { audio } from '../audio/engine'
import { useExperience } from '../store'

/**
 * Accessible modal: focus moves in on open, Tab is trapped, Esc / backdrop /
 * close button dismiss, focus returns to whatever opened it. Scroll is frozen
 * by useSmoothScroll while any panel is open.
 */
export function Dialog({
  open,
  onClose,
  labelledBy,
  accent = '#05d9e8',
  size = 'lg',
  children,
}: {
  open: boolean
  onClose: () => void
  labelledBy: string
  accent?: string
  size?: 'lg' | 'sm'
  children: ReactNode
}) {
  const panel = useRef<HTMLDivElement>(null)
  const opener = useRef<Element | null>(null)

  useEffect(() => {
    if (!open) return
    opener.current = document.activeElement
    if (useExperience.getState().audioOn) audio.glitch()
    const el = panel.current!
    requestAnimationFrame(() => el.querySelector<HTMLElement>('[data-autofocus]')?.focus())

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const focusables = [...el.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      if (!focusables.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      ;(opener.current as HTMLElement | null)?.focus?.({ preventScroll: true })
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="dialog-root fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8" data-lenis-prevent>
      <div className="dialog-backdrop absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`dialog-panel hud relative max-h-full w-full overflow-y-auto ${size === 'lg' ? 'max-w-4xl' : 'max-w-md'}`}
        style={{ ['--accent' as string]: accent, borderColor: `${accent}66` }}
      >
        <button data-autofocus onClick={onClose} className="dialog-close font-mono text-xs tracking-[0.2em] uppercase" aria-label="Close">
          [ esc ✕ ]
        </button>
        {children}
      </div>
    </div>
  )
}
