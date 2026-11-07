import { useCallback } from 'react'
import { useExperience } from '../store'
import { Dialog } from './Dialog'
import {
  ACCENT_HEX,
  FEATURED,
  GITHUB,
  LANG_COLOR,
  demoFor,
  relativeTime,
  statsFor,
  type FeaturedProject,
} from '../data/projects'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Stylised stand-ins until real screenshots are dropped into /public/projects/<id>/. */
function ScreenshotPlaceholder({ project, n }: { project: FeaturedProject; n: number }) {
  const accent = ACCENT_HEX[project.accent]
  return (
    <figure className="shot-placeholder" style={{ ['--accent' as string]: accent }}>
      <div className="shot-grid" aria-hidden="true" />
      <span className="font-display text-5xl font-bold text-white/80" aria-hidden="true">
        {project.title
          .split(/\s+/)
          .slice(0, 2)
          .map((w) => w[0])
          .join('')}
      </span>
      <figcaption className="absolute inset-x-3 bottom-2 font-mono text-[10px] tracking-[0.2em] text-haze/70 uppercase">
        Screenshot {n} · coming soon
      </figcaption>
    </figure>
  )
}

export function ProjectPanel() {
  const openId = useExperience((s) => s.openProject)
  const setOpen = useExperience((s) => s.setOpenProject)
  const close = useCallback(() => setOpen(null), [setOpen])
  const project = FEATURED.find((p) => p.id === openId)
  const index = project ? FEATURED.indexOf(project) : -1
  const s = project ? statsFor(project) : null
  const demo = project ? demoFor(project) : null
  const accent = project ? ACCENT_HEX[project.accent] : '#05d9e8'

  return (
    <Dialog open={!!project} onClose={close} labelledBy="panel-title" accent={accent}>
      {project && (
        <div className="p-6 sm:p-9">
          <p className="font-mono text-[11px] tracking-[0.3em] uppercase" style={{ color: accent }}>
            Project {String(index + 1).padStart(2, '0')} / {String(FEATURED.length).padStart(2, '0')}
            {project.team && <span className="ml-3 text-haze/70">· team build</span>}
          </p>
          <h2 id="panel-title" className="font-display mt-2 pr-24 text-3xl leading-tight font-bold text-white uppercase sm:text-5xl">
            {project.title}
          </h2>
          <p className="mt-3 text-lg text-haze">{project.pitch}</p>

          <div className="mt-6 grid gap-6 md:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="leading-relaxed text-haze/90">{project.description}</p>
              <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tech stack">
                {project.stack.map((t) => (
                  <li key={t} className="chip">
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                {s ? (
                  <a className="card-btn" href={s.url} target="_blank" rel="noreferrer">
                    [ View code ]
                  </a>
                ) : (
                  <span className="card-btn is-disabled" aria-disabled="true">
                    [ Source not public yet ]
                  </span>
                )}
                {demo && (
                  <a className="card-btn is-primary" href={demo} target="_blank" rel="noreferrer">
                    [ Live demo ]
                  </a>
                )}
              </div>
            </div>

            <dl className="hud-stats grid grid-cols-2 gap-x-4 gap-y-3 self-start p-4">
              {s ? (
                <>
                  <div>
                    <dt className="hud-label">Stars</dt>
                    <dd className="hud-value text-2xl">★ {s.stars}</dd>
                  </div>
                  <div>
                    <dt className="hud-label">Forks</dt>
                    <dd className="hud-value text-2xl">{s.forks}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="hud-label">Last push</dt>
                    <dd className="font-mono text-sm text-white">
                      {relativeTime(s.pushedAt)} <span className="text-haze/60">· {fmtDate(s.pushedAt)}</span>
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="hud-label">Languages</dt>
                    <dd>
                      <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                        {s.languages.map((l) => (
                          <span key={l.name} style={{ width: `${l.share * 100}%`, background: LANG_COLOR[l.name] ?? '#888' }} />
                        ))}
                      </div>
                      <ul className="mt-2 space-y-0.5 font-mono text-[12px] text-haze">
                        {s.languages.slice(0, 5).map((l) => (
                          <li key={l.name} className="flex items-center gap-2">
                            <span className="inline-block h-2 w-2 rounded-full" style={{ background: LANG_COLOR[l.name] ?? '#888' }} />
                            {l.name} <span className="text-haze/60">{(l.share * 100).toFixed(1)}%</span>
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                </>
              ) : (
                <div className="col-span-2 font-mono text-sm text-haze/70">This one isn't on GitHub yet.</div>
              )}
            </dl>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(project.images?.length ? project.images : [1, 2, 3]).map((img, i) =>
              typeof img === 'string' ? (
                <img key={img} src={img} alt={`${project.title} screenshot ${i + 1}`} className="aspect-video w-full object-cover" loading="lazy" />
              ) : (
                <ScreenshotPlaceholder key={i} project={project} n={i + 1} />
              ),
            )}
          </div>
          {GITHUB.fetchedAt && (
            <p className="mt-6 font-mono text-[10px] tracking-[0.2em] text-haze/50 uppercase">
              GitHub data · {fmtDate(GITHUB.fetchedAt)}
            </p>
          )}
        </div>
      )}
    </Dialog>
  )
}

export function RepoPanel() {
  const name = useExperience((s) => s.openRepo)
  const setOpen = useExperience((s) => s.setOpenRepo)
  const close = useCallback(() => setOpen(null), [setOpen])
  const r = GITHUB.repos.find((x) => x.name === name)
  return (
    <Dialog open={!!r} onClose={close} labelledBy="repo-title" size="sm">
      {r && (
        <div className="p-6">
          <p className="font-mono text-[11px] tracking-[0.3em] text-cyan uppercase">Repo // data district</p>
          <h2 id="repo-title" className="font-display mt-2 pr-20 text-2xl font-bold break-words text-white">
            {r.name}
          </h2>
          {r.description && <p className="mt-2 text-sm leading-relaxed text-haze">{r.description}</p>}
          <dl className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <dt className="hud-label">Stars</dt>
              <dd className="hud-value text-xl">★ {r.stars}</dd>
            </div>
            <div>
              <dt className="hud-label">Forks</dt>
              <dd className="hud-value text-xl">{r.forks}</dd>
            </div>
            <div>
              <dt className="hud-label">Pushed</dt>
              <dd className="font-mono text-[12px] text-white">{relativeTime(r.pushedAt)}</dd>
            </div>
          </dl>
          {r.languages.length > 0 && (
            <>
              <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                {r.languages.map((l) => (
                  <span key={l.name} style={{ width: `${l.share * 100}%`, background: LANG_COLOR[l.name] ?? '#888' }} />
                ))}
              </div>
              <p className="mt-1.5 font-mono text-[11px] text-haze/80">
                {r.languages
                  .slice(0, 4)
                  .map((l) => `${l.name} ${Math.round(l.share * 100)}%`)
                  .join(' · ')}
              </p>
            </>
          )}
          {r.topics.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Topics">
              {r.topics.map((t) => (
                <li key={t} className="chip">
                  {t}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <a className="card-btn is-primary" href={r.url} target="_blank" rel="noreferrer">
              [ Open on GitHub ]
            </a>
            {r.homepage && (
              <a className="card-btn" href={r.homepage} target="_blank" rel="noreferrer">
                [ Live ]
              </a>
            )}
          </div>
        </div>
      )}
    </Dialog>
  )
}
