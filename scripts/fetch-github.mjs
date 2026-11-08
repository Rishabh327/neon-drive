#!/usr/bin/env node
/**
 * Build-time GitHub snapshot → src/data/github.json
 *
 *   node scripts/fetch-github.mjs            (60 req/h unauthenticated — enough for ~50 repos)
 *   GITHUB_TOKEN=ghp_xxx node scripts/fetch-github.mjs   (5000 req/h)
 *
 * The live site never calls the GitHub API; it imports the JSON this writes.
 * On any failure the previous JSON is kept, so a flaky API never breaks a deploy.
 */
import { writeFile, readFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const USER = process.env.GITHUB_USER || 'Rishabh327'
const TOKEN = process.env.GITHUB_TOKEN
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/github.json')

const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'neon-drive-portfolio-build',
  'X-GitHub-Api-Version': '2022-11-28',
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
}

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers })
  if (!res.ok) throw new Error(`GitHub ${res.status} for ${path}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

/** Public contribution calendar (no token needed): [{ date, level 0–4 }] + yearly total. */
async function fetchContributions() {
  try {
    const res = await fetch(`https://github.com/users/${USER}/contributions`, {
      headers: { 'User-Agent': headers['User-Agent'] },
    })
    if (!res.ok) return null
    const html = await res.text()
    const days = []
    for (const m of html.matchAll(/<td[^>]*?data-date="(\d{4}-\d{2}-\d{2})"[^>]*?data-level="(\d)"/g)) {
      days.push({ date: m[1], level: Number(m[2]) })
    }
    days.sort((a, b) => a.date.localeCompare(b.date))
    const total = Number((html.match(/([\d,]+)\s+contributions?\s+in the last year/) || [])[1]?.replace(/,/g, '') ?? NaN)
    return days.length ? { total: Number.isFinite(total) ? total : null, days } : null
  } catch {
    return null
  }
}

async function main() {
  const [user, repos] = await Promise.all([
    gh(`/users/${USER}`),
    gh(`/users/${USER}/repos?per_page=100&type=owner&sort=pushed`),
  ])

  const publicRepos = repos.filter((r) => !r.fork && !r.private && !r.archived && r.name.toLowerCase() !== USER.toLowerCase())

  const withLanguages = []
  for (const r of publicRepos) {
    let languages = {}
    try {
      languages = await gh(`/repos/${USER}/${r.name}/languages`)
    } catch (e) {
      console.warn(`  ! languages for ${r.name}: ${e.message}`)
    }
    const total = Object.values(languages).reduce((a, b) => a + b, 0) || 1
    withLanguages.push({
      name: r.name,
      description: r.description,
      url: r.html_url,
      homepage: r.homepage || null,
      language: r.language,
      languages: Object.entries(languages)
        .map(([name, bytes]) => ({ name, share: +(bytes / total).toFixed(4) }))
        .sort((a, b) => b.share - a.share),
      stars: r.stargazers_count,
      forks: r.forks_count,
      topics: r.topics ?? [],
      pushedAt: r.pushed_at,
      createdAt: r.created_at,
    })
  }

  const contributions = await fetchContributions()

  const data = {
    fetchedAt: new Date().toISOString(),
    user: {
      login: user.login,
      name: user.name,
      avatar: user.avatar_url,
      url: user.html_url,
      publicRepos: user.public_repos,
      followers: user.followers,
    },
    repos: withLanguages,
    contributions,
  }

  // Only rewrite when something other than the timestamp changed, so the daily
  // workflow doesn't commit (and redeploy) when nothing on GitHub moved.
  try {
    const prev = JSON.parse(await readFile(OUT, 'utf8'))
    const strip = (d) => JSON.stringify({ ...d, fetchedAt: null })
    if (strip(prev) === strip(data)) {
      console.log('✓ github.json unchanged — nothing to write')
      return
    }
  } catch {
    /* no previous snapshot */
  }
  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(data, null, 2) + '\n')
  console.log(
    `✓ github.json — ${withLanguages.length} repos, ${contributions ? contributions.days.length + ' contribution days' : 'no contribution calendar'}`,
  )
}

main().catch(async (e) => {
  console.error(`✗ GitHub fetch failed: ${e.message}`)
  try {
    await readFile(OUT)
    console.error('  keeping the existing src/data/github.json')
    process.exit(0)
  } catch {
    // no previous snapshot: write an empty one so the build still succeeds
    await mkdir(dirname(OUT), { recursive: true })
    await writeFile(OUT, JSON.stringify({ fetchedAt: null, user: null, repos: [], contributions: null }, null, 2) + '\n')
    console.error('  wrote an empty snapshot')
    process.exit(0)
  }
})
