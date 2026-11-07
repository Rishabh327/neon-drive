import { FEATURED, LANG_COLOR, ACCENT_HEX, demoFor, relativeTime, statsFor, type FeaturedProject } from '../data/projects'
import { CARD_BASE_W, projectCardEls } from './projectCardRegistry'
import { useExperience } from '../store'

function LangBar({ project }: { project: FeaturedProject }) {
  const s = statsFor(project)
  if (!s || !s.languages.length) return null
  const top = s.languages.filter((l) => l.share >= 0.02).slice(0, 4)
  return (
    <div className="min-w-0 flex-1">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        {top.map((l) => (
          <span key={l.name} style={{ width: `${l.share * 100}%`, background: LANG_COLOR[l.name] ?? '#888' }} />
        ))}
      </div>
      <p className="mt-1 truncate font-mono text-[11px] text-haze/80">
        {top.map((l) => `${l.name} ${Math.round(l.share * 100)}%`).join(' · ')}
      </p>
    </div>
  )
}

function Card({ project, index }: { project: FeaturedProject; index: number }) {
  const setHovered = useExperience((st) => st.setHoveredProject)
  const openPanel = useExperience((st) => st.setOpenProject)
  const s = statsFor(project)
  const demo = demoFor(project)
  const accent = ACCENT_HEX[project.accent]
  const titleId = `project-${project.id}`
  return (
    <article
      ref={(el) => void (projectCardEls[index] = el)}
      aria-labelledby={titleId}
      data-on="0"
      onPointerEnter={() => setHovered(index)}
      onPointerLeave={() => setHovered(-1)}
      className="project-card fixed top-0 left-0 flex flex-col p-7"
      style={{ width: CARD_BASE_W, height: (CARD_BASE_W * 10) / 16, visibility: 'hidden', opacity: 0, ['--accent' as string]: accent }}
    >
      <p className="font-mono text-[11px] tracking-[0.28em] uppercase" style={{ color: accent }}>
        Project {String(index + 1).padStart(2, '0')} / {String(FEATURED.length).padStart(2, '0')}
        {project.team && <span className="ml-3 text-haze/70">· team build</span>}
      </p>
      <h3 id={titleId} className="font-display mt-2 text-[34px] leading-[1.05] font-bold text-white uppercase">
        {project.title}
      </h3>
      <p className="mt-2 text-[15px] leading-snug text-haze">{project.pitch}</p>

      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Tech stack">
        {project.stack.map((t) => (
          <li key={t} className="chip">
            {t}
          </li>
        ))}
      </ul>

      {project.moment === 'alertnet' && (
        <p className="mt-3 font-mono text-[11px] text-haze/80" aria-hidden="true">
          <span className="text-acid">●</span> report&nbsp;&nbsp;<span className="text-cyan">◜</span> AI scan&nbsp;&nbsp;
          <span className="text-[#ff1f40]">●</span> verified&nbsp;&nbsp;<span className="text-haze/60">✕</span> fake, rejected
        </p>
      )}
      {project.moment === 'regen' && (
        <p className="mt-3 font-mono text-[11px] text-cyan">↓ live demo at the next intersection</p>
      )}

      <div className="mt-auto flex items-end gap-4 pt-3">
        {s ? (
          <>
            <p className="shrink-0 font-mono text-[12px] text-haze">
              <span aria-label={`${s.stars} stars`}>★ {s.stars}</span>
              <span className="mx-2 text-white/20">|</span>
              <span>pushed {relativeTime(s.pushedAt)}</span>
            </p>
            <LangBar project={project} />
          </>
        ) : (
          <p className="font-mono text-[12px] text-haze/70">Source not public yet</p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button className="card-btn is-primary" onClick={() => openPanel(project.id)}>
          [ Details ]
        </button>
        {s ? (
          <a className="card-btn" href={s.url} target="_blank" rel="noreferrer">
            [ View code ]
          </a>
        ) : (
          <span className="card-btn is-disabled" aria-disabled="true">
            [ View code ]
          </span>
        )}
        {demo ? (
          <a className="card-btn" href={demo} target="_blank" rel="noreferrer">
            [ Live demo ]
          </a>
        ) : (
          <span className="card-btn is-disabled" aria-disabled="true">
            [ Live demo ]
          </span>
        )}
      </div>
    </article>
  )
}

/** All featured project cards. Positioned every frame by the 3D scene (ProjectTowers). */
export function ProjectCards() {
  return (
    <div aria-label="Featured projects" role="region">
      {FEATURED.map((p, i) => (
        <Card key={p.id} project={p} index={i} />
      ))}
    </div>
  )
}
