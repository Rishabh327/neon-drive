/**
 * Initial quality tier from the GPU's name + device hints (no network, no
 * benchmark DB). The adaptive monitor (AdaptiveQuality) then steps down at
 * runtime if frames are actually slow.
 */
export type Tier = 'high' | 'medium' | 'low'

let cached: { renderer: string; webgl2: boolean } | null = null

/** Creating a WebGL context is expensive — do it once per page. */
export function detectGpu(): { renderer: string; webgl2: boolean } {
  if (!cached) cached = probeGpu()
  return cached
}

/** Reads the GPU name from an existing context (no extra context creation). */
export function rendererName(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  const ext = gl.getExtension('WEBGL_debug_renderer_info')
  return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER))
}

function probeGpu(): { renderer: string; webgl2: boolean } {
  try {
    const c = document.createElement('canvas')
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null
    if (!gl) return { renderer: '', webgl2: false }
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER))
    const webgl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return { renderer, webgl2 }
  } catch {
    return { renderer: '', webgl2: false }
  }
}

const LOW = [
  /swiftshader|llvmpipe|softpipe|software/i,
  /mali-[2-4]\d\d|mali-t\d/i,
  /adreno \(tm\) [2-5]\d\d|adreno [2-5]\d\d/i,
  /powervr/i,
  /intel.*hd graphics( [2-5]\d{2,3})?\b(?!.*(iris|uhd))/i,
]
const HIGH = [/nvidia|geforce|rtx|gtx|quadro/i, /radeon(?!.*(vega 3|vega 6|vega 8|graphics\b))/i, /apple m\d/i]

/** Cheap pre-check (no context): is WebGL2 even in this browser? */
export const hasWebGL2 = () => typeof window !== 'undefined' && 'WebGL2RenderingContext' in window

/** Device-only guess used before the canvas exists (no WebGL context created). */
export function preliminaryTier(): Tier {
  return 'medium'
}

/** Tier from the real renderer's GPU name (called once the R3F canvas exists). */
export function tierFromRenderer(renderer: string, webgl2 = true): Tier {
  if (!webgl2) return 'low'
  const mobile = window.matchMedia('(pointer: coarse)').matches || /android|iphone|ipad|mobile/i.test(navigator.userAgent)
  const nav = navigator as Navigator & { deviceMemory?: number }
  const weakCpu = (navigator.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory ?? 8) <= 4

  let tier: Tier = 'medium' // integrated GPUs (Intel Iris/UHD, AMD APUs, Adreno 6xx+, Mali-G, Apple iOS GPUs)
  if (LOW.some((r) => r.test(renderer))) tier = 'low'
  else if (HIGH.some((r) => r.test(renderer))) tier = 'high'
  if ((mobile || weakCpu) && tier === 'high') tier = 'medium'
  return tier
}
