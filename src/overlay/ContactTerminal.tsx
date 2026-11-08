import { useState, type FormEvent } from 'react'
import { PROFILE } from '../data/profile'
import { useBeatFade } from './useProgress'
import { scrollToProgress } from '../hooks/useSmoothScroll'
import { audio } from '../audio/engine'
import { useExperience } from '../store'

type Status = 'idle' | 'sending' | 'sent' | 'error'

const REWIND_S = 4

function replay() {
  const root = document.documentElement
  root.classList.add('rewinding')
  if (useExperience.getState().audioOn) audio.glitch()
  scrollToProgress(0, { duration: REWIND_S })
  window.setTimeout(() => root.classList.remove('rewinding'), REWIND_S * 1000 + 200)
}

/** 96–100%: the rooftop terminal — fades in at the end of the drive. */
export function ContactTerminal() {
  const ref = useBeatFade<HTMLDivElement>(0.958, 0.975, 2, 3)
  return (
    <div ref={ref} className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-10 sm:pb-14" style={{ visibility: 'hidden' }}>
      <ContactPanel className="max-h-[calc(100svh-6rem)]" replayable />
    </div>
  )
}

/** The terminal itself (form + links) — used by the drive and by simple mode. */
export function ContactPanel({ className = '', replayable = false }: { className?: string; replayable?: boolean }) {
  const { links, formspreeId } = PROFILE
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!formspreeId || status === 'sending') return
    const form = e.currentTarget
    setStatus('sending')
    setError('')
    try {
      const res = await fetch(`https://formspree.io/f/${formspreeId}`, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      })
      if (res.ok) {
        setStatus('sent')
        form.reset()
        if (useExperience.getState().audioOn) audio.click()
      } else {
        const data = (await res.json().catch(() => null)) as { errors?: { message: string }[] } | null
        setError(data?.errors?.map((x) => x.message).join(', ') || `Server said ${res.status}`)
        setStatus('error')
      }
    } catch {
      setError('Network error — check your connection')
      setStatus('error')
    }
  }

  return (
      <section
        id="transmit"
        aria-labelledby="contact-title"
        className={`hud terminal w-full max-w-2xl overflow-y-auto px-5 py-5 sm:px-7 ${className}`}
        data-lenis-prevent
      >
        <h2 id="contact-title" className="font-mono text-sm text-cyan">
          &gt; open channel to rishabh<span className="caret">_</span>
        </h2>

        {status === 'sent' ? (
          <div className="mt-4 font-mono text-sm" role="status">
            <p className="text-acid">&gt; transmission received.</p>
            <p className="mt-1 text-haze">Thanks — I'll get back to you soon.</p>
            <button className="mt-3 text-xs tracking-[0.2em] text-cyan uppercase hover:text-white" onClick={() => setStatus('idle')}>
              [ send another ]
            </button>
          </div>
        ) : formspreeId ? (
          <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="term-field">
              <label htmlFor="cf-name">name</label>
              <input id="cf-name" name="name" required autoComplete="name" maxLength={100} />
            </div>
            <div className="term-field">
              <label htmlFor="cf-email">email</label>
              <input id="cf-email" name="email" type="email" required autoComplete="email" maxLength={200} />
            </div>
            <div className="term-field sm:col-span-2">
              <label htmlFor="cf-message">message</label>
              <textarea id="cf-message" name="message" required rows={3} maxLength={5000} />
            </div>
            {/* honeypot: bots fill it, people never see it */}
            <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            <input type="hidden" name="_subject" value="Neon Drive — new message" />
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <button type="submit" className="card-btn is-primary" disabled={status === 'sending'} style={{ ['--accent' as string]: '#ff2a6d' }}>
                {status === 'sending' ? '[ transmitting… ]' : '[ transmit ]'}
              </button>
              {status === 'error' && (
                <p className="font-mono text-[12px] text-[#ff7a45]" role="alert">
                  &gt; failed: {error}.{' '}
                  {links.email && (
                    <a className="underline" href={`mailto:${links.email}`}>
                      Email me directly
                    </a>
                  )}
                </p>
              )}
            </div>
          </form>
        ) : (
          <p className="mt-3 font-mono text-[12px] text-haze/80">
            &gt; form offline — reach me directly below.
          </p>
        )}

        <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {links.email && (
            <li>
              <a className="card-btn w-full justify-center" href={`mailto:${links.email}`}>
                [ Email ]
              </a>
            </li>
          )}
          {links.linkedin && (
            <li>
              <a className="card-btn w-full justify-center" href={links.linkedin} target="_blank" rel="noreferrer">
                [ LinkedIn ]
              </a>
            </li>
          )}
          <li>
            <a className="card-btn w-full justify-center" href={links.github} target="_blank" rel="noreferrer">
              [ GitHub ]
            </a>
          </li>
          {links.resume && (
            <li>
              <a className="card-btn is-primary w-full justify-center" href={links.resume} download>
                [ Resume ↓ ]
              </a>
            </li>
          )}
        </ul>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
          <p className="font-display text-lg font-bold text-white sm:text-xl">End of the road. Start of something new.</p>
          {replayable && (
            <button onClick={replay} className="font-mono text-xs tracking-[0.25em] text-magenta uppercase hover:text-white">
              ↺ Replay drive
            </button>
          )}
        </div>
        {replayable && (
          <p className="mt-4 font-mono text-[10px] leading-relaxed text-haze/75">
            Car:{' '}
            <a className="underline underline-offset-2 hover:text-cyan" href="https://sketchfab.com/3d-models/2024-koenigsegg-jesko-attack-7378-e4e966bcfdf14a8dbc6c837764cb026b" target="_blank" rel="noreferrer">
              “2024 Koenigsegg Jesko Attack #7378”
            </a>{' '}
            by{' '}
            <a className="underline underline-offset-2 hover:text-cyan" href="https://sketchfab.com/HYPRIMPS3D" target="_blank" rel="noreferrer">
              HYPR:IMPS 3D
            </a>
            ,{' '}
            <a className="underline underline-offset-2 hover:text-cyan" href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
              CC BY 4.0
            </a>{' '}
            — restyled. Not affiliated with Koenigsegg.
          </p>
        )}
      </section>
  )
}

/** VHS-style overlay shown while the drive rewinds to the start. */
export function RewindFx() {
  return (
    <div className="rewind-fx pointer-events-none fixed inset-0 z-40" aria-hidden="true">
      <p className="absolute top-20 left-6 font-mono text-2xl tracking-[0.3em] text-white sm:left-10">◀◀ REWIND</p>
    </div>
  )
}
