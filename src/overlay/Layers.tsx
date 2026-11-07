import { useRef } from 'react'
import { useExperience } from '../store'
import { PROFILE, BILLBOARDS } from '../data/profile'
import { GITHUB, LANG_COLOR, OTHER_REPOS, relativeTime } from '../data/projects'
import { useBeatFade, useProgressEffect } from './useProgress'
import { cameraZAt } from '../lib/cameraKeyframes'
import { activeBillboard } from '../experience/scenes/aboutLayout'

export function HeroLayer() {
  const ref = useBeatFade<HTMLDivElement>(-1, 0, 0.045, 0.075)
  return (
    <div ref={ref} className="pointer-events-none fixed inset-x-0 bottom-0 z-10 px-4 pb-20 sm:px-10">
      <h1 className="sr-only">{PROFILE.name}</h1>
      <p className="font-mono text-xs tracking-[0.3em] text-cyan uppercase">{PROFILE.role}</p>
      <p className="font-display mt-3 max-w-3xl text-3xl leading-tight font-bold text-white sm:text-5xl">{PROFILE.tagline}</p>
      <p className="scroll-hint mt-8 font-mono text-xs tracking-[0.35em] text-haze uppercase" aria-hidden="true">
        Scroll to drive <span className="inline-block">↓</span>
      </p>
    </div>
  )
}

export function IgnitionLayer() {
  const ref = useBeatFade<HTMLDivElement>(0.185, 0.2, 0.24, 0.255)
  return (
    <div ref={ref} className="pointer-events-none fixed inset-x-0 bottom-0 z-10 px-4 pb-20 sm:px-10" style={{ visibility: 'hidden' }}>
      <p className="font-mono text-xs tracking-[0.3em] text-magenta uppercase">// Ignition</p>
      <p className="font-display mt-2 max-w-2xl text-2xl font-bold text-white sm:text-4xl">
        Engine on. Let's take a drive through my work.
      </p>
    </div>
  )
}

/** Mirrors the billboards in real HTML; highlights whichever one is lit up ahead. */
export function AboutLayer() {
  const ref = useBeatFade<HTMLDivElement>(0.245, 0.262, 0.355, 0.37)
  const list = useRef<HTMLOListElement>(null)
  useProgressEffect((p) => {
    const active = activeBillboard(cameraZAt(p))
    list.current?.querySelectorAll('li').forEach((li, i) => li.classList.toggle('is-active', i === active))
  })
  return (
    <div ref={ref} className="pointer-events-none fixed bottom-16 left-4 z-10 max-w-sm sm:left-10" style={{ visibility: 'hidden' }}>
      <section aria-labelledby="about-title" className="hud px-5 py-4">
        <h2 id="about-title" className="font-mono text-[11px] tracking-[0.35em] text-cyan uppercase">
          About · the city talks
        </h2>
        <ol ref={list} className="about-list mt-3 space-y-1.5">
          {BILLBOARDS.map((b) => (
            <li key={b.title} className="text-[13px] leading-snug">
              <span className="font-display font-bold tracking-wide text-white">{b.title}</span>
              <span className="text-haze/80"> — {b.line}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

export function ProjectsLayer() {
  const ref = useBeatFade<HTMLDivElement>(0.355, 0.37, 0.585, 0.6)
  return (
    <div ref={ref} className="pointer-events-none fixed bottom-14 left-4 z-10 sm:left-10" style={{ visibility: 'hidden' }}>
      <h2 className="font-mono text-[11px] tracking-[0.35em] text-cyan uppercase">Downtown // featured builds</h2>
    </div>
  )
}

/** Languages present in the district, most common first. */
const DISTRICT_LANGS = Object.entries(
  OTHER_REPOS.reduce<Record<string, number>>((acc, r) => {
    const l = r.language ?? 'Other'
    acc[l] = (acc[l] ?? 0) + 1
    return acc
  }, {}),
).sort((a, b) => b[1] - a[1])

export function DistrictLayer() {
  const ref = useBeatFade<HTMLDivElement>(0.79, 0.805, 0.875, 0.89)
  const total = GITHUB.contributions?.total
  const filter = useExperience((s) => s.langFilter)
  const setFilter = useExperience((s) => s.setLangFilter)
  const openRepo = useExperience((s) => s.setOpenRepo)
  const shown = OTHER_REPOS.filter((r) => !filter || (r.language ?? 'Other') === filter)
  return (
    <div
      ref={ref}
      className="fixed top-[44svh] right-4 bottom-12 z-20 flex w-[min(360px,calc(100vw-2rem))] flex-col sm:top-20 sm:right-8 sm:bottom-16"
      style={{ visibility: 'hidden' }}
    >
      <section aria-labelledby="district-title" className="hud flex min-h-0 flex-col px-5 py-4">
        <h2 id="district-title" className="font-mono text-[11px] tracking-[0.35em] text-cyan uppercase">
          Data district · all repos
        </h2>
        <p className="mt-1 text-[12px] text-haze/80">
          {OTHER_REPOS.length} more public repos, newest first{total != null ? ` · ${total} contributions in the last year` : ''}.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter by language">
          <button className={`filter-chip ${!filter ? 'is-on' : ''}`} aria-pressed={!filter} onClick={() => setFilter(null)}>
            All <span className="opacity-60">{OTHER_REPOS.length}</span>
          </button>
          {DISTRICT_LANGS.map(([lang, n]) => (
            <button
              key={lang}
              className={`filter-chip ${filter === lang ? 'is-on' : ''}`}
              aria-pressed={filter === lang}
              onClick={() => setFilter(filter === lang ? null : lang)}
              style={{ ['--chip' as string]: LANG_COLOR[lang] ?? '#888' }}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: LANG_COLOR[lang] ?? '#888' }} />
              {lang} <span className="opacity-60">{n}</span>
            </button>
          ))}
        </div>
        <ul className="mt-3 min-h-0 space-y-1.5 overflow-y-auto pr-1" data-lenis-prevent aria-live="polite">
          {shown.map((r) => (
            <li key={r.name}>
              <button onClick={() => openRepo(r.name)} className="repo-row block w-full text-left">
                <span className="flex items-center justify-between gap-3">
                  <span className="truncate font-mono text-[13px] text-white">{r.name}</span>
                  <span className="shrink-0 font-mono text-[11px] text-haze/70">{relativeTime(r.pushedAt)}</span>
                </span>
                <span className="mt-0.5 flex items-center gap-2 text-[11px] text-haze/80">
                  {r.language && (
                    <>
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: LANG_COLOR[r.language] ?? '#888' }} />
                      {r.language}
                    </>
                  )}
                  {r.stars > 0 && <span>★ {r.stars}</span>}
                  {r.description && <span className="truncate text-haze/75">· {r.description}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 font-mono text-[10px] text-haze/75">Tip: click a kiosk on the street, too.</p>
      </section>
    </div>
  )
}

export function RooftopLayer() {
  const ref = useBeatFade<HTMLDivElement>(0.905, 0.92, 0.95, 0.962)
  return (
    <div ref={ref} className="pointer-events-none fixed inset-x-0 bottom-0 z-10 px-4 pb-20 sm:px-10" style={{ visibility: 'hidden' }}>
      <p className="font-mono text-xs tracking-[0.3em] text-violet uppercase">// The rooftop</p>
      <p className="font-display mt-2 max-w-2xl text-2xl font-bold text-white sm:text-4xl">The whole city. Every build, one view.</p>
    </div>
  )
}
