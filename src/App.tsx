import { Component, lazy, Suspense, type ReactNode } from 'react'
import { useSmoothScroll } from './hooks/useSmoothScroll'
import { DebugHud, Overlay, ProgressBar, TopBar } from './overlay/Overlay'
import { Loader } from './overlay/Loader'
import { FLAGS } from './debugFlags'
import { useAudio } from './audio/useAudio'
import { Cursor } from './overlay/Cursor'
import { resolveMode, switchMode } from './lib/mode'

// The 3D world is its own chunk so the loader paints first.
const Experience = lazy(() => import('./experience/Experience'))
// The accessible 2D site (no-WebGL / reduced motion / by choice) — only loaded when used.
const SimpleSite = lazy(() => import('./simple/SimpleSite').then((m) => ({ default: m.SimpleSite })))

const MODE = resolveMode()

/** If the 3D world can't start (e.g. WebGL context creation fails), never show a blank page. */
class WebGLBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.error('[neon-drive] 3D failed to start — switching to the simple site', error)
    Object.assign(window, { __neonError: String((error as Error)?.stack ?? error) })
    if (FLAGS.debug && location.search.includes('stay')) return // debugging: keep the page
    const url = new URL(location.href)
    url.searchParams.set('simple', 'webgl-error')
    location.replace(url.toString())
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export default function App() {
  if (MODE.mode === 'simple') {
    document.documentElement.classList.add('is-simple')
    return (
      <Suspense fallback={null}>
        <SimpleSite reason={MODE.reason} canDrive={MODE.canDrive} />
      </Suspense>
    )
  }
  return <Drive />
}

function Drive() {
  useSmoothScroll()
  useAudio()
  return (
    <>
      <button className="skip-link" onClick={() => switchMode('simple')}>
        Skip the 3D drive — open the simple, accessible version
      </button>
      <WebGLBoundary>
        <Suspense fallback={null}>
          <Experience debug={FLAGS.debug} />
        </Suspense>
      </WebGLBoundary>
      <TopBar />
      <Overlay />
      <ProgressBar />
      {FLAGS.debug && <DebugHud />}
      <Loader />
      <Cursor />
    </>
  )
}
