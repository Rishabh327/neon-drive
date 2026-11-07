/**
 * ─────────────────────────────────────────────────────────────
 *  EDIT ME — everything personal on the site comes from here
 *  (plus projects.ts). No 3D code needs to change.
 * ─────────────────────────────────────────────────────────────
 */

export const PROFILE = {
  name: 'Rishabh Jalori',
  firstName: 'Rishabh',
  role: 'Full-Stack Developer · Information Science & Engineering student',
  tagline: 'Full-Stack Developer · Building things that move',
  location: 'Mysuru, India',

  links: {
    github: 'https://github.com/Rishabh327',
    email: 'rishabh.jalori37@gmail.com' as string | null,
    linkedin: 'https://www.linkedin.com/in/rishabh-jalori' as string | null,
    /** file in /public */
    resume: '/Rishabh_Jalori_Resume.pdf' as string | null,
  },

  /** Formspree form id (formspree.io/f/<id>). The contact form posts here. */
  formspreeId: 'meokbvld' as string | null,

  /** Canonical site URL — set VITE_SITE_URL at build time (see vite.config.ts). */
  siteUrl: import.meta.env.VITE_SITE_URL as string,

  /** Short bio used for SEO description + JSON-LD. */
  summary:
    'Information Science & Engineering undergraduate at NIE Mysuru building full-stack and AI-powered applications — Flask, MERN, MySQL/MongoDB. Interested in AI/ML and data science.',
}

/** The billboards along the road (About beat). Short, punchy — they're read at speed. */
export interface Billboard {
  kicker: string
  title: string
  line: string
  /** neon accent */
  color: 'magenta' | 'cyan' | 'violet' | 'acid'
}

export const BILLBOARDS: Billboard[] = [
  { kicker: 'EDUCATION', title: 'NIE MYSURU', line: 'The National Institute of Engineering', color: 'cyan' },
  { kicker: 'CLASS OF', title: "ISE '27", line: 'B.E. Information Science & Engineering', color: 'magenta' },
  { kicker: 'EXPERIENCE', title: 'SAASKART', line: 'Associate Full Stack Developer · Jul–Aug 2025', color: 'violet' },
  { kicker: 'LEADERSHIP', title: 'GEEKSFORGEEKS', line: 'Campus Mantri (Campus Ambassador) · 2026', color: 'cyan' },
  { kicker: 'COMPETITIVE', title: 'GOLDMAN SACHS', line: 'India Hackathon · C++ competitive programming', color: 'magenta' },
  { kicker: 'NEXT EXIT', title: 'AI · ML · DATA', line: 'Aiming for graduate studies in Germany', color: 'acid' },
]

/**
 * Skills HUD. Tiers, never fake percentages:
 *   3 = Daily driver · 2 = Comfortable · 1 = Exploring
 * ⚠️ Inferred from your repos — adjust tiers / items to taste.
 */
export type Tier = 1 | 2 | 3
export const TIER_LABEL: Record<Tier, string> = { 3: 'Daily driver', 2: 'Comfortable', 1: 'Exploring' }

export interface SkillGroup {
  id: string
  label: string
  items: { name: string; tier: Tier }[]
}

export const SKILLS: SkillGroup[] = [
  {
    id: 'frontend',
    label: 'Frontend',
    items: [
      { name: 'React', tier: 3 },
      { name: 'JavaScript', tier: 3 },
      { name: 'TypeScript', tier: 2 },
      { name: 'Tailwind CSS', tier: 3 },
      { name: 'HTML / CSS', tier: 3 },
    ],
  },
  {
    id: 'backend',
    label: 'Backend',
    items: [
      { name: 'Node.js / Express', tier: 3 },
      { name: 'Flask', tier: 2 },
      { name: 'REST APIs', tier: 3 },
      { name: 'Auth & RBAC', tier: 2 },
    ],
  },
  {
    id: 'data',
    label: 'Databases',
    items: [
      { name: 'MySQL', tier: 3 },
      { name: 'MongoDB', tier: 3 },
      { name: 'SQL', tier: 3 },
    ],
  },
  {
    id: 'ml',
    label: 'ML · Data',
    items: [
      { name: 'Python', tier: 3 },
      { name: 'pandas / NumPy', tier: 2 },
      { name: 'scikit-learn', tier: 2 },
      { name: 'Streamlit', tier: 2 },
      { name: 'Gemini API', tier: 1 },
    ],
  },
  {
    id: 'dsa',
    label: 'DSA · Languages',
    items: [
      { name: 'C++ (competitive)', tier: 3 },
      { name: 'Data structures & algorithms', tier: 3 },
      { name: 'Java', tier: 2 },
      { name: 'C', tier: 2 },
    ],
  },
  {
    id: 'quality',
    label: 'Testing · Tools',
    items: [
      { name: 'Git & GitHub', tier: 3 },
      { name: 'Software testing & QA', tier: 2 },
      { name: 'UML & design patterns', tier: 2 },
      { name: 'Linux basics', tier: 1 },
    ],
  },
]

/**
 * Regenerative-braking demo (70–78%). Physics is computed live from these;
 * numbers are illustrative of the method, not results from the project.
 */
export const REGEN = {
  massKg: 1650,
  brakeFromKmh: 80,
  /** fraction of kinetic energy returned to the pack with regen on */
  efficiency: 0.65,
  packKWh: 60,
  startSoC: 0.62,
  repo: 'ev-regen-twin',
}
