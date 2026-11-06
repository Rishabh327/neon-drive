/**
 * URL switches for diagnosing rendering issues on a visitor's machine, e.g.
 *   /?fx=off            no post-processing (bloom, CA, grain…)
 *   /?reflect=off       plain road, no reflection pass
 *   /?rain=off          no rain / splashes
 *   /?msaa=off          no multisampled post-processing buffers
 *   /?quality=low       force a quality tier (low | medium | high)
 *   /?debug             FPS + scroll HUD (always on in dev)
 * Combine with &: /?fx=off&rain=off
 */
const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
const off = (k: string) => ['off', '0', 'false', 'no'].includes((params.get(k) ?? '').toLowerCase())

export const FLAGS = {
  fx: !off('fx'),
  reflect: !off('reflect'),
  rain: !off('rain'),
  msaa: !off('msaa'),
  quality: (['low', 'medium', 'high'] as const).find((q) => q === params.get('quality')) ?? null,
  debug: import.meta.env.DEV || params.has('debug'),
}
