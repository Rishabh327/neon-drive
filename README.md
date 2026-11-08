# Neon Drive — Rishabh Jalori

A scroll-driven 3D drive through a rain-soaked neon city — my portfolio.
Your name shatters into the highway, billboards tell the story, project towers unfold into
holographic screens backed by live GitHub data, the windshield becomes a skills HUD, the car
demos regenerative braking, every other repo is a kiosk in the Data District, and the drive ends
on a rooftop with a working contact terminal.

**Stack:** Vite · React 19 · TypeScript · three.js + React Three Fiber · custom GLSL · Lenis ·
Zustand · Tailwind CSS 4 · Web Audio (synthesized sound) · deployed on Vercel.

---

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # type-check + production build → dist/
npm run preview      # serve the production build
```

Node 20+ (developed on Node 24).

## Edit the content (no 3D code needed)

| What | Where |
|---|---|
| Name, role, tagline, links (email, LinkedIn, GitHub, resume), Formspree form id, site URL | `src/data/profile.ts` |
| Billboards (About), skill groups & tiers, regen-demo parameters | `src/data/profile.ts` |
| Featured projects (title, pitch, description, stack, repo, accent, screenshots) | `src/data/projects.ts` |
| Story beats (scroll ranges) | `src/data/sections.ts` |
| Resume PDF | `public/Rishabh_Jalori_Resume.pdf` |

**Project screenshots:** drop images in `public/projects/<project-id>/` and list them in that
project's `images: ['/projects/<id>/1.webp', …]` — the detail panel shows them instead of the
placeholders.

## GitHub data

Live stats come from a build-time snapshot — the site never calls the GitHub API.

```bash
npm run fetch:github            # writes src/data/github.json (60 req/h unauthenticated)
GITHUB_TOKEN=ghp_xxx npm run fetch:github   # optional, higher rate limit
```

It records every public, non-fork repo (languages, stars, forks, last push, topics, homepage) and
the public contribution calendar. If GitHub is unreachable it keeps the previous snapshot, and it
doesn't rewrite the file when nothing changed.

**Daily refresh:** `.github/workflows/refresh-github-data.yml` runs every day at 03:17 UTC (and
on demand from the Actions tab), commits `github.json` only if something changed, and that push
triggers a Vercel redeploy.

## The car

`public/models/jesko.glb` is built from the CC BY 4.0 model credited in [CREDITS.md](CREDITS.md):

```bash
npm run process:car             # assets-src/jesko → public/models/jesko.glb
npm run process:car -- --tris 100000 --tex 512   # tweak the budgets
```

(`assets-src/` holds the raw download and is git-ignored.) The neon restyle, hidden emblems and
wheel splitting happen at load time in `src/experience/objects/jesko.ts`. The lowest quality tier
uses a lightweight procedural car instead.

## Deploy (Vercel)

The repo is a standard Vite app; `vercel.json` sets caching and security headers.

1. Import the GitHub repo in Vercel (framework preset: Vite).
2. Set the environment variable `VITE_SITE_URL` to the production URL (e.g.
   `https://your-domain.dev`) — it's used for the canonical URL, Open Graph tags, `sitemap.xml`
   and `robots.txt`. Default: `https://rishabh-jalori.vercel.app`.
3. Every push to `main` deploys; the daily data workflow keeps the GitHub stats fresh.

## Modes, quality & debugging

- **Quality tiers** (high / medium / low) are chosen from the real GPU, then an adaptive monitor
  steps down (resolution, then tier) if frames are slow.
- **Simple mode** — an accessible 2D version with the same content — is used when WebGL2 is
  missing, when the visitor prefers reduced motion, from the "Skip the 3D drive" link (appears on
  Tab), or if the 3D fails to start.

URL switches:

| | |
|---|---|
| `?simple` / `?drive` | force a mode for this visit |
| `?quality=low\|medium\|high` | force a quality tier |
| `?fx=off` | no post-processing |
| `?reflect=off` | no road reflection |
| `?rain=off` | no rain |
| `?msaa=on` | MSAA instead of FXAA |
| `?debug` | FPS / scroll HUD (always on in dev); `&path` draws the camera spline |

## How it's put together

```
src/
  App.tsx                 mode switch: the drive or the simple site
  store.ts                Zustand: master scroll progress, section, audio, quality, panels
  data/                   ← all editable content + github.json
  hooks/useSmoothScroll   one rAF clock: Lenis → progress → renders the 3D frame
  experience/             everything 3D (lazy chunk)
    Experience.tsx        canvas, staged mounting + async shader compile, quality monitor
    cameraPath.ts         camera keyframes pinned to scroll progress (CatmullRom)
    post/NeonPost.ts      own post pipeline: bloom, ACES, CA, vignette, grain, FXAA
    objects/              city, wet road (reflector), rain, car (+ Jesko loader), cockpit
    scenes/               hero, billboards, project towers, regen FX, data district, rooftop
    shaders/              GLSL
  overlay/                HTML layers synced to scroll (cards, HUDs, panels, contact)
  simple/                 accessible 2D site
  audio/                  synthesized Web Audio engine
scripts/                  fetch-github.mjs, process-car.mjs, bench.js (dev perf probe)
```

Every animation is a pure function of the scroll progress (0 → 1), so scrubbing backwards
replays everything in reverse and the HTML overlay and the 3D scene never disagree.

## Credits

See [CREDITS.md](CREDITS.md).
