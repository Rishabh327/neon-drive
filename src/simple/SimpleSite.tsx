import { useEffect, useMemo, useState } from 'react'
import { PROFILE, BILLBOARDS, SKILLS, TIER_LABEL, REGEN, type Tier } from '../data/profile'
import { ACCENT_HEX, FEATURED, GITHUB, LANG_COLOR, OTHER_REPOS, demoFor, relativeTime, statsFor } from '../data/projects'
import { recoveredWh, WH_PER_KM } from '../experience/regenModel'
import { ContactPanel } from '../overlay/ContactTerminal'
import { ProjectPanel, RepoPanel } from '../overlay/Panels'
import { useExperience } from '../store'
import { switchMode, type ModeReason } from '../lib/mode'
import { CityBackdrop } from './CityBackdrop'

/** Gentle fade-in as sections enter the viewport (opacity only under reduced motion). */
function useReveal() {
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>('.reveal')]
    if (!('IntersectionObserver' in window)) return void els.forEach((e) => e.classList.add('is-in'))
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in')
            io.unobserve(e.target)
          }
        }),
      { rootMargin: '0px 0px -8% 0px' },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [])
}

function TierBar({ tier }: { tier: Tier }) {
  return (
    <span className="flex gap-[3px]" aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <span key={n} className={`h-2 w-4 skew-x-[-20deg] ${n <= tier ? 'bg-cyan' : 'bg-cyan/20'}`} />
      ))}
    </span>
  )
}

const REASON_COPY: Record<Exclude<ModeReason, null>, string> = {
  'no-webgl': "Your browser can't run the 3D drive (no WebGL2), so here's the same portfolio as a regular page.",
  'reduced-motion': "You've asked your system to reduce motion, so the 3D drive is replaced with this calm version.",
  choice: "You're viewing the simple version.",
}

export function SimpleSite({ reason, canDrive }: { reason: ModeReason; canDrive: boolean }) {
  useReveal()
  const { links } = PROFILE
  const openProject = useExperience((s) => s.setOpenProject)
  const openRepo = useExperience((s) => s.setOpenRepo)
  const [lang, setLang] = useState<string | null>(null)
  const langs = useMemo(
    () =>
      Object.entries(
        OTHER_REPOS.reduce<Record<string, number>>((a, r) => ((a[r.language ?? 'Other'] = (a[r.language ?? 'Other'] ?? 0) + 1), a), {}),
      ).sort((a, b) => b[1] - a[1]),
    [],
  )
  const regen = recoveredWh(1, true)

  return (
    <div className="simple relative min-h-screen">
      <CityBackdrop />
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-white/5 bg-night/80 backdrop-blur">
        <nav aria-label="Primary" className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <a href="#top" className="font-display text-xl font-bold tracking-widest text-white">
            RJ
          </a>
          <ul className="hidden gap-6 font-mono text-xs tracking-[0.2em] text-haze uppercase md:flex">
            {[
              ['about', 'About'],
              ['projects', 'Projects'],
              ['skills', 'Skills'],
              ['repos', 'Repos'],
              ['contact', 'Contact'],
            ].map(([id, label]) => (
              <li key={id}>
                <a className="hover:text-cyan" href={`#${id}`}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
          {canDrive && (
            <button onClick={() => switchMode('drive')} className="font-mono text-xs tracking-[0.2em] text-magenta uppercase hover:text-white">
              Start the 3D drive →
            </button>
          )}
        </nav>
      </header>

      <main id="main" className="relative z-10 mx-auto max-w-6xl px-4 sm:px-8">
        {/* Hero */}
        <section id="top" className="reveal flex min-h-[78svh] flex-col justify-end pt-24 pb-16" aria-labelledby="name">
          {reason && <p className="mb-6 max-w-xl font-mono text-xs text-haze">{REASON_COPY[reason]}</p>}
          <p className="font-mono text-xs tracking-[0.3em] text-cyan uppercase">{PROFILE.role}</p>
          <h1 id="name" className="font-display neon-title mt-3 text-5xl font-bold text-white uppercase sm:text-7xl lg:text-8xl">
            {PROFILE.name}
          </h1>
          <p className="font-display mt-4 max-w-2xl text-2xl font-bold text-haze sm:text-3xl">{PROFILE.tagline}</p>
          <ul className="mt-8 flex flex-wrap gap-3">
            {links.email && (
              <li>
                <a className="card-btn" href={`mailto:${links.email}`}>
                  [ Email ]
                </a>
              </li>
            )}
            {links.linkedin && (
              <li>
                <a className="card-btn" href={links.linkedin} target="_blank" rel="noreferrer">
                  [ LinkedIn ]
                </a>
              </li>
            )}
            <li>
              <a className="card-btn" href={links.github} target="_blank" rel="noreferrer">
                [ GitHub ]
              </a>
            </li>
            {links.resume && (
              <li>
                <a className="card-btn is-primary" href={links.resume} download>
                  [ Resume ↓ ]
                </a>
              </li>
            )}
          </ul>
        </section>

        {/* About */}
        <section id="about" className="reveal py-16" aria-labelledby="about-h">
          <h2 id="about-h" className="section-kicker">About</h2>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-haze">{PROFILE.summary}</p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BILLBOARDS.map((b) => (
              <li key={b.title} className="hud px-5 py-4" style={{ borderColor: `${ACCENT_HEX[b.color]}55` }}>
                <p className="font-mono text-[11px] tracking-[0.3em] uppercase" style={{ color: ACCENT_HEX[b.color] }}>
                  {b.kicker}
                </p>
                <p className="font-display mt-1 text-2xl font-bold text-white">{b.title}</p>
                <p className="mt-1 text-sm text-haze">{b.line}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Projects */}
        <section id="projects" className="reveal py-16" aria-labelledby="projects-h">
          <h2 id="projects-h" className="section-kicker">Featured projects</h2>
          <ul className="mt-8 grid gap-5 md:grid-cols-2">
            {FEATURED.map((p, i) => {
              const s = statsFor(p)
              const demo = demoFor(p)
              const accent = ACCENT_HEX[p.accent]
              return (
                <li key={p.id} className="project-tile hud flex flex-col p-6" style={{ ['--accent' as string]: accent, borderColor: `${accent}55` }}>
                  <p className="font-mono text-[11px] tracking-[0.28em] uppercase" style={{ color: accent }}>
                    Project {String(i + 1).padStart(2, '0')}
                    {p.team && <span className="ml-2 text-haze">· team build</span>}
                  </p>
                  <h3 className="font-display mt-2 text-2xl font-bold text-white uppercase">{p.title}</h3>
                  <p className="mt-2 text-haze">{p.pitch}</p>
                  <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Tech stack">
                    {p.stack.map((t) => (
                      <li key={t} className="chip">
                        {t}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 font-mono text-[12px] text-haze">
                    {s ? (
                      <>
                        ★ {s.stars} · {s.language ?? '—'} · pushed {relativeTime(s.pushedAt)}
                      </>
                    ) : (
                      'Source not public yet'
                    )}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3 pt-1">
                    <button className="card-btn is-primary" onClick={() => openProject(p.id)}>
                      [ Details ]
                    </button>
                    {s && (
                      <a className="card-btn" href={s.url} target="_blank" rel="noreferrer">
                        [ Code ]
                      </a>
                    )}
                    {demo && (
                      <a className="card-btn" href={demo} target="_blank" rel="noreferrer">
                        [ Live demo ]
                      </a>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        {/* Skills */}
        <section id="skills" className="reveal py-16" aria-labelledby="skills-h">
          <h2 id="skills-h" className="section-kicker">Skills</h2>
          <p className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[12px] text-haze" aria-hidden="true">
            {([3, 2, 1] as Tier[]).map((t) => (
              <span key={t} className="flex items-center gap-2">
                <TierBar tier={t} /> {TIER_LABEL[t]}
              </span>
            ))}
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SKILLS.map((g) => (
              <section key={g.id} className="hud px-5 py-4" aria-label={g.label}>
                <h3 className="font-display border-b border-cyan/30 pb-1 font-bold tracking-[0.2em] text-white uppercase">{g.label}</h3>
                <ul className="mt-3 space-y-2">
                  {g.items.map((it) => (
                    <li key={it.name} className="flex items-center justify-between gap-3 font-mono text-[13px] text-haze">
                      <span>{it.name}</span>
                      <span className="flex items-center gap-2">
                        <TierBar tier={it.tier} />
                        <span className="sr-only">{TIER_LABEL[it.tier]}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>

        {/* Regen (static explanation) */}
        <section className="reveal py-16" aria-labelledby="regen-h">
          <h2 id="regen-h" className="section-kicker">Regenerative braking, in numbers</h2>
          <div className="hud mt-6 grid gap-6 p-6 md:grid-cols-[1fr_1.4fr]">
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="hud-label">Back into the pack</dt>
                <dd className="hud-value text-cyan">{regen.regen.toFixed(1)} Wh</dd>
              </div>
              <div>
                <dt className="hud-label">≈ extra range</dt>
                <dd className="hud-value">{Math.round((regen.regen / WH_PER_KM) * 1000)} m</dd>
              </div>
              <div>
                <dt className="hud-label">Lost as heat (regen on)</dt>
                <dd className="hud-value text-[#ff9b6e]">{regen.heat.toFixed(1)} Wh</dd>
              </div>
              <div>
                <dt className="hud-label">Lost as heat (regen off)</dt>
                <dd className="hud-value text-[#ff9b6e]">{recoveredWh(1, false).heat.toFixed(1)} Wh</dd>
              </div>
            </dl>
            <p className="leading-relaxed text-haze">
              One stop from {REGEN.brakeFromKmh} km/h in a {REGEN.massKg.toLocaleString()} kg EV: with regenerative braking the motor
              works as a generator and returns ~{Math.round(REGEN.efficiency * 100)}% of the kinetic energy to the battery; with friction
              brakes, all of it becomes heat. My{' '}
              <a className="text-cyan underline underline-offset-4" href={`https://github.com/Rishabh327/${REGEN.repo}`} target="_blank" rel="noreferrer">
                Software Defined Vehicles digital twin
              </a>{' '}
              simulates this across a whole drive cycle.
            </p>
          </div>
        </section>

        {/* All repos */}
        <section id="repos" className="reveal py-16" aria-labelledby="repos-h">
          <h2 id="repos-h" className="section-kicker">All other repos</h2>
          <p className="mt-3 text-haze">
            {OTHER_REPOS.length} more public repos
            {GITHUB.contributions?.total != null && ` · ${GITHUB.contributions.total} contributions in the last year`}.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Filter by language">
            <button className={`filter-chip ${!lang ? 'is-on' : ''}`} aria-pressed={!lang} onClick={() => setLang(null)}>
              All
            </button>
            {langs.map(([l, n]) => (
              <button
                key={l}
                className={`filter-chip ${lang === l ? 'is-on' : ''}`}
                aria-pressed={lang === l}
                onClick={() => setLang(lang === l ? null : l)}
                style={{ ['--chip' as string]: LANG_COLOR[l] ?? '#888' }}
              >
                {l} <span className="opacity-75">{n}</span>
              </button>
            ))}
          </div>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2" aria-live="polite">
            {OTHER_REPOS.filter((r) => !lang || (r.language ?? 'Other') === lang).map((r) => (
              <li key={r.name}>
                <button onClick={() => openRepo(r.name)} className="repo-row hud block w-full px-4 py-3 text-left">
                  <span className="flex items-center justify-between gap-3">
                    <span className="truncate font-mono text-sm text-white">{r.name}</span>
                    <span className="shrink-0 font-mono text-[11px] text-haze">{relativeTime(r.pushedAt)}</span>
                  </span>
                  <span className="mt-1 flex items-center gap-2 text-[12px] text-haze">
                    {r.language && <span className="inline-block h-2 w-2 rounded-full" style={{ background: LANG_COLOR[r.language] ?? '#888' }} />}
                    {r.language ?? '—'}
                    {r.description && <span className="truncate">· {r.description}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Contact */}
        <section id="contact" className="reveal flex justify-center py-20" aria-label="Contact">
          <ContactPanel />
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-8 text-center font-mono text-[11px] text-haze">
        © {new Date().getFullYear()} {PROFILE.name} · built with three.js
      </footer>

      <ProjectPanel />
      <RepoPanel />
    </div>
  )
}
