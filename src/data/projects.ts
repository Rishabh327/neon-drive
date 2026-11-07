/**
 * Featured projects — hand-curated. Live stats (stars, languages, last push)
 * are merged in from github.json by `repo` name. Edit freely.
 */
import github from './github.json'

export type Accent = 'magenta' | 'cyan' | 'violet' | 'acid'

export interface FeaturedProject {
  id: string
  title: string
  pitch: string
  description: string
  stack: string[]
  /** GitHub repo name under the profile, or null if not public */
  repo: string | null
  /** overrides the repo homepage */
  demo?: string | null
  accent: Accent
  team?: boolean
  /** special scene moment in the 3D world */
  moment?: 'alertnet' | 'regen'
  /** ⚠️ images: drop files in /public/projects/<id>/ and list them here (Phase 4 panel) */
  images?: string[]
}

export const FEATURED: FeaturedProject[] = [
  {
    id: 'alertnet',
    title: 'AlertNet',
    pitch: 'Hyperlocal emergency & disaster alerts — with AI that catches the fakes.',
    description:
      'A citizen-powered alert network for emergencies and disasters. Every report runs through a custom Weighted Adaptive Scoring Algorithm, written in pure Python, that flags likely-fake alerts before they spread. Team project, built and deployed.',
    stack: ['Python', 'Weighted Adaptive Scoring', 'JavaScript', 'Fake-alert detection'],
    repo: 'hyperlocal-alert-network',
    accent: 'magenta',
    team: true,
    moment: 'alertnet',
  },
  {
    id: 'ev-regen',
    title: 'EV Regen-Braking Digital Twin',
    pitch: 'Simulating how much energy an EV wins back every time it brakes.',
    description:
      'A Software Defined Vehicles project: a digital twin that simulates battery State of Charge across a drive cycle, comparing regenerative braking against conventional friction braking.',
    stack: ['Python', 'Streamlit', 'Simulation', 'Software Defined Vehicles'],
    repo: 'ev-regen-twin',
    accent: 'cyan',
    moment: 'regen',
  },
  {
    id: 'buyanybike',
    title: 'BuyAnyBike',
    pitch: 'A vehicle marketplace for finding and buying your next ride.',
    description: 'A vehicle marketplace web app for browsing and buying bikes.',
    stack: ['HTML', 'CSS'],
    repo: 'BuyanyBike',
    accent: 'acid',
  },
  {
    id: 'sleep-monitor',
    title: 'AI Sleep Monitor',
    pitch: 'Track your sleep, see the patterns, get coached by a wellness bot.',
    description:
      'A MERN-stack app to log and analyse sleep, visualise patterns over time and improve rest quality — with an integrated AI chatbot that gives personalised wellness tips.',
    stack: ['MongoDB', 'Express', 'React', 'Node.js', 'AI chatbot'],
    repo: 'Sleep-Monitor',
    accent: 'violet',
  },
  {
    id: 'gov-finance',
    title: 'Government Financial Management System',
    pitch: 'Digitising budgets and expenses with role-based access control.',
    description:
      'A web system that digitises government financial operations: registration and authentication, budget allocation and expense tracking, with role-based access control for transparency and accuracy.',
    stack: ['Flask', 'MySQL', 'RBAC', 'Python'],
    repo: 'Government-Financial-Management-Systems',
    accent: 'cyan',
  },
  {
    id: 'foodflow',
    title: 'FoodFlow',
    pitch: 'A food delivery management system — built to be tested.',
    description:
      'A food delivery management system developed as a Software Testing & Quality Assurance project: test planning, test cases and defect tracking around a real ordering workflow.',
    stack: ['Software Testing', 'QA', 'Test design'],
    repo: null,
    accent: 'magenta',
  },
  {
    id: 'vehicle-rental',
    title: 'Vehicle Rental Management',
    pitch: 'Swappable pricing algorithms at runtime — the Strategy pattern, for real.',
    description:
      'A full-stack rental system with fleet management, customer records and smart rental creation. Pricing (daily, weekly, weekend) is implemented with the Strategy design pattern so algorithms swap at runtime — fully modelled in UML.',
    stack: ['React', 'Tailwind CSS', 'Strategy pattern', 'UML'],
    repo: 'Vehicle-Rental-Management-System',
    accent: 'violet',
  },
  {
    id: 'crop-advisor',
    title: 'Crop Rotation Advisor',
    pitch: 'Clustering soil nutrient data to recommend what to plant next.',
    description:
      'An ML project that groups soil samples by nutrient profile using K-Means and Hierarchical Clustering, and turns the clusters into crop-rotation recommendations.',
    stack: ['Python', 'K-Means', 'Hierarchical Clustering', 'Jupyter'],
    repo: 'AcreField-and-Co.',
    accent: 'acid',
  },
]

// ── GitHub merge ────────────────────────────────────────────

export interface RepoStats {
  name: string
  description: string | null
  url: string
  homepage: string | null
  language: string | null
  languages: { name: string; share: number }[]
  stars: number
  forks: number
  topics: string[]
  pushedAt: string
}

export const GITHUB = github as unknown as {
  fetchedAt: string | null
  repos: RepoStats[]
  contributions: { total: number | null; days: { date: string; level: number }[] } | null
}

const byName = new Map(GITHUB.repos.map((r) => [r.name, r]))

export function statsFor(p: FeaturedProject): RepoStats | null {
  return p.repo ? (byName.get(p.repo) ?? null) : null
}

export function demoFor(p: FeaturedProject): string | null {
  if (p.demo !== undefined) return p.demo
  return statsFor(p)?.homepage ?? null
}

/** Every other public repo, newest push first (Data District). */
export const OTHER_REPOS: RepoStats[] = GITHUB.repos
  .filter((r) => !FEATURED.some((f) => f.repo === r.name))
  .sort((a, b) => b.pushedAt.localeCompare(a.pushedAt))

/** GitHub's language colours for the ones that appear in the repos. */
export const LANG_COLOR: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  HTML: '#e34c26',
  CSS: '#663399',
  'Jupyter Notebook': '#DA5B0B',
  Nix: '#7e7eff',
  Shell: '#89e051',
}

export const ACCENT_HEX: Record<Accent, string> = {
  magenta: '#ff2a6d',
  cyan: '#05d9e8',
  violet: '#7b2cff',
  acid: '#f9f871',
}

export function relativeTime(iso: string): string {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days < 1) return 'today'
  if (days < 2) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.round(days / 30)
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`
  const years = Math.round(days / 365)
  return `${years} year${years > 1 ? 's' : ''} ago`
}
