import { lazy, Suspense } from 'react'
import { useSmoothScroll } from './hooks/useSmoothScroll'
import { DebugHud, Overlay, ProgressBar, TopBar } from './overlay/Overlay'
import { Loader } from './overlay/Loader'

// The 3D world is its own chunk so the loader paints first.
const Experience = lazy(() => import('./experience/Experience'))

const debug = import.meta.env.DEV || new URLSearchParams(location.search).has('debug')

export default function App() {
  useSmoothScroll()
  return (
    <>
      <Suspense fallback={null}>
        <Experience debug={debug} />
      </Suspense>
      <TopBar />
      <Overlay />
      <ProgressBar />
      {debug && <DebugHud />}
      <Loader />
    </>
  )
}
