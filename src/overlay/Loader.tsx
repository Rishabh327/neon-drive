import { useEffect, useRef, useState } from 'react'
import { useAssetProgress } from '../hooks/useAssetProgress'
import { LOAD_STAGES, useExperience } from '../store'

/** Types a line out character by character. */
function TypeLine({ text, speed = 16, className = '' }: { text: string; speed?: number; className?: string }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return void setN(text.length)
    const id = setInterval(() => setN((v) => (v >= text.length ? (clearInterval(id), v) : v + 1)), speed)
    return () => clearInterval(id)
  }, [text, speed])
  return (
    <p className={className} aria-hidden="true">
      {text.slice(0, n)}
      {n < text.length && <span className="animate-pulse">▌</span>}
    </p>
  )
}

const MIN_SHOW_MS = 1800

export function Loader() {
  const loaded = useExperience((s) => s.loaded)
  const markLoaded = useExperience((s) => s.markLoaded)
  const start = useExperience((s) => s.start)
  const audioPreference = useExperience((s) => s.audioPreference)
  const { progress: assetProgress, total: assetTotal } = useAssetProgress()

  const [shown, setShown] = useState(0) // displayed %, eased toward the real value
  const [minTimeDone, setMinTimeDone] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [gone, setGone] = useState(false)
  const ignition = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    document.fonts.ready.then(() => markLoaded('fonts'))
    const t = setTimeout(() => setMinTimeDone(true), MIN_SHOW_MS)
    return () => clearTimeout(t)
  }, [markLoaded])

  // Real progress: each boot stage + any streamed 3D assets (GLTF/KTX2) via drei's loading manager
  const stagesDone = LOAD_STAGES.filter((s) => loaded[s]).length
  const parts = LOAD_STAGES.length + (assetTotal > 0 ? 1 : 0)
  const target = ((stagesDone + (assetTotal > 0 ? assetProgress / 100 : 0)) / parts) * 100

  useEffect(() => {
    let raf = 0
    const step = () => {
      setShown((v) => {
        const next = v + (target - v) * 0.12 + (target > v ? 0.4 : 0)
        return Math.min(target, next)
      })
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target])

  const ready = target >= 100 && shown >= 99.5 && minTimeDone

  useEffect(() => {
    if (ready) ignition.current?.focus({ preventScroll: true })
  }, [ready])

  // If the experience is started from elsewhere (e.g. a deep link later), get out of the way.
  const started = useExperience((s) => s.started)
  useEffect(() => {
    if (started && !leaving) {
      setLeaving(true)
      setTimeout(() => setGone(true), 1100)
    }
  }, [started, leaving])

  const go = (withAudio: boolean) => {
    if (leaving) return
    start(withAudio)
    setLeaving(true)
    setTimeout(() => setGone(true), 1100)
  }

  if (gone) return null

  const pct = Math.round(shown)
  const bar = 24
  const filled = Math.round((shown / 100) * bar)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="loader-title"
      className={`loader fixed inset-0 z-50 flex items-center justify-center bg-night px-4 ${leaving ? 'is-leaving' : ''}`}
    >
      <div className="loader-scan pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative w-full max-w-xl font-mono text-[13px] leading-7 text-haze sm:text-sm">
        <h1 id="loader-title" className="sr-only">
          Neon Drive — portfolio of Rishabh Jalori. Loading.
        </h1>
        <TypeLine text="> initializing NEON_DRIVE.exe" className="text-cyan" />
        {(loaded.scene || shown > 2) && <TypeLine text="> loading city assets" />}
        <div
          role="progressbar"
          aria-label="Loading city"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="text-white"
        >
          <span className="text-magenta">[</span>
          <span className="text-cyan">{'█'.repeat(filled)}</span>
          <span className="text-white/15">{'░'.repeat(bar - filled)}</span>
          <span className="text-magenta">]</span> <span className="tabular-nums">{String(pct).padStart(3, ' ')}%</span>
        </div>
        {loaded.shaders && <TypeLine text="> compiling shaders .......... ok" />}
        {loaded.frames && <TypeLine text="> calibrating rain ........... ok" />}
        {ready && <TypeLine text="> all systems nominal. awaiting driver_" className="text-acid" />}

        <div
          className={`mt-10 flex flex-col items-start gap-4 transition-opacity duration-500 sm:flex-row sm:items-center sm:gap-8 ${
            ready ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <button
            ref={ignition}
            disabled={!ready}
            onClick={() => go(true)}
            className="ignition font-display relative border border-magenta px-8 py-3 text-lg font-bold tracking-[0.35em] text-white uppercase"
          >
            [ Ignition ]
          </button>
          <button
            disabled={!ready}
            onClick={() => go(false)}
            className="text-xs tracking-[0.25em] text-haze/70 uppercase underline-offset-4 hover:text-cyan hover:underline"
          >
            enter silently
          </button>
        </div>
        <p className={`mt-4 text-[11px] text-haze/50 transition-opacity ${ready ? 'opacity-100' : 'opacity-0'}`}>
          {audioPreference ? 'Sound was on last time.' : 'Ignition turns on sound.'} Best with headphones.
        </p>
      </div>
    </div>
  )
}
