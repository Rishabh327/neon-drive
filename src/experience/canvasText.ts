import { useEffect, useMemo } from 'react'
import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three'

export const FONT = {
  display: '"Chakra Petch", "Orbitron", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
  sans: '"Inter", system-ui, sans-serif',
}

const FACES = ['700 64px "Chakra Petch"', '500 64px "Chakra Petch"', '400 32px "JetBrains Mono"', '600 32px "JetBrains Mono"', '500 32px "Inter"']
let fontsReady: Promise<unknown> | null = null
/** Resolves once every face the canvases use is loaded (they aren't all used by the DOM). */
export function whenFontsReady() {
  if (!fontsReady) {
    fontsReady = Promise.all(FACES.map((f) => document.fonts.load(f).catch(() => null))).then(() => document.fonts.ready)
  }
  return fontsReady
}

/**
 * A texture drawn with the 2D canvas API in our own web fonts — crisp text in
 * 3D without a font-atlas library. Draws once immediately (fallback fonts) and
 * again as soon as the real fonts are available.
 */
export function useCanvasTexture(
  width: number,
  height: number,
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
  deps: unknown[] = [],
) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = width
    c.height = height
    const t = new CanvasTexture(c)
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 4
    t.minFilter = LinearFilter
    t.generateMipmaps = false
    return t
  }, [width, height])

  useEffect(() => {
    let alive = true
    const c = texture.image as HTMLCanvasElement
    const g = c.getContext('2d')!
    const render = () => {
      g.clearRect(0, 0, width, height)
      draw(g, width, height)
      texture.needsUpdate = true
    }
    render()
    whenFontsReady().then(() => alive && render())
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texture, ...deps])

  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

/** Draw text with manual letter-spacing (canvas letterSpacing isn't everywhere yet). */
export function spacedText(g: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, align: 'left' | 'center' = 'left') {
  const widths = [...text].map((ch) => g.measureText(ch).width)
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1)
  let cx = align === 'center' ? x - total / 2 : x
  const prevAlign = g.textAlign
  g.textAlign = 'left'
  ;[...text].forEach((ch, i) => {
    g.fillText(ch, cx, y)
    cx += widths[i] + spacing
  })
  g.textAlign = prevAlign
  return total
}
