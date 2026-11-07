import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import glsl from 'vite-plugin-glsl'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

/** Canonical URL. Override per deploy: VITE_SITE_URL=https://your.domain npm run build */
const SITE_URL = (process.env.VITE_SITE_URL || 'https://rishabh-jalori.vercel.app').replace(/\/$/, '')

/**
 * SEO plumbing:
 *  - replaces %SITE_URL% in index.html (canonical, Open Graph, JSON-LD)
 *  - emits robots.txt + sitemap.xml with the same URL at build time
 *  - dev only: POST /__save-og writes the rendered hero still to public/og.jpg
 */
function seo(): Plugin {
  return {
    name: 'neon-seo',
    transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', SITE_URL),
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n` })
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${SITE_URL}/</loc>\n    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>\n`,
      })
    },
    configureServer(server) {
      server.middlewares.use('/__save-og', (req, res) => {
        if (req.method !== 'POST') return void (res.statusCode = 405, res.end())
        const chunks: Buffer[] = []
        req.on('data', (c: Buffer) => chunks.push(c))
        req.on('end', async () => {
          const body = Buffer.concat(chunks)
          if (body.length < 1000 || body[0] !== 0xff || body[1] !== 0xd8) return void (res.statusCode = 400, res.end('expected a JPEG'))
          await writeFile(resolve(process.cwd(), 'public/og.jpg'), body)
          res.end(`saved ${body.length} bytes`)
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), glsl({ minify: true }), seo()],
  define: { 'import.meta.env.VITE_SITE_URL': JSON.stringify(SITE_URL) },
  server: { port: 5173 },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // React in its own small chunk (the loader needs it); three/R3F/post-processing
        // only load with the lazy 3D chunk, so the loader paints before they arrive.
        manualChunks(rawId: string) {
          const id = rawId.split('\\').join('/')
          if (/node_modules\/(react|react-dom|scheduler|zustand|use-sync-external-store)\//.test(id)) return 'react'
          if (/node_modules\/(three|@react-three|postprocessing|three-stdlib|its-fine|suspend-react|react-reconciler)\//.test(id)) return 'three'
          if (id.includes('node_modules/lenis')) return 'motion'
        },
      },
    },
  },
})
