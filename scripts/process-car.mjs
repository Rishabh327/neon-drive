#!/usr/bin/env node
/**
 * Hypercar model → web-ready GLB.
 *
 *   node scripts/process-car.mjs [source] [--tris 130000] [--tex 1024]
 *
 * source: a .gltf/.glb file or a folder containing one (default assets-src/jesko)
 * output: public/models/jesko.glb
 *
 * Steps: dedup → prune → weld → simplify to a triangle budget (meshoptimizer) →
 * WebP textures capped at --tex px → meshopt-compressed geometry (+ quantization).
 * Prints triangle counts, materials and meshes so the neon restyle can map parts.
 */
import { readdirSync, statSync } from 'node:fs'
import { join, extname, resolve } from 'node:path'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions'
import { dedup, prune, weld, simplify, textureCompress, meshopt, resample, flatten, join as joinMeshes, getSceneVertexCount, VertexCountMethod } from '@gltf-transform/functions'
import { MeshoptSimplifier, MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer'
import sharp from 'sharp'

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? Number(args[i + 1]) : def
}
const TRIS = opt('tris', 130_000)
const TEX = opt('tex', 512)
let src = resolve(args.find((a) => !a.startsWith('--') && isNaN(Number(a))) ?? 'assets-src/jesko')
const OUT = resolve('public/models/jesko.glb')

function findModel(path) {
  if (statSync(path).isFile()) return path
  for (const f of readdirSync(path)) {
    const p = join(path, f)
    if (statSync(p).isDirectory()) {
      const inner = findModel(p)
      if (inner) return inner
    } else if (['.gltf', '.glb'].includes(extname(f).toLowerCase())) return p
  }
  return null
}

function triangles(doc) {
  let n = 0
  for (const mesh of doc.getRoot().listMeshes())
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices()
      const pos = prim.getAttribute('POSITION')
      n += idx ? idx.getCount() / 3 : pos ? pos.getCount() / 3 : 0
    }
  return Math.round(n)
}

const file = findModel(src)
if (!file) {
  console.error(`✗ No .gltf/.glb found under ${src}`)
  process.exit(1)
}
console.log(`• source: ${file}`)

await MeshoptDecoder.ready
await MeshoptEncoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptDecoder,
  'meshopt.encoder': MeshoptEncoder,
})
const doc = await io.read(file)
const before = triangles(doc)
console.log(`• triangles before: ${before.toLocaleString()}`)

const ratio = Math.min(1, TRIS / Math.max(1, before))
await doc.transform(
  dedup(),
  flatten(),
  // merge everything that shares a material → ~1 draw call per material
  joinMeshes({ keepNamed: false }),
  weld({ tolerance: 0.0001 }),
  simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.01, lockBorder: false }),
  resample(),
  prune(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [TEX, TEX], quality: 82 }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
)
doc.createExtension(EXTMeshoptCompression).setRequired(true)

console.log(`• triangles after:  ${triangles(doc).toLocaleString()} (target ${TRIS.toLocaleString()})`)
console.log(`• vertices after:   ${getSceneVertexCount(doc.getRoot().listScenes()[0], VertexCountMethod.UPLOAD).toLocaleString()}`)
console.log('• materials:')
for (const m of doc.getRoot().listMaterials()) {
  const c = m.getBaseColorFactor().map((v) => v.toFixed(2)).join(',')
  console.log(`   - ${JSON.stringify(m.getName())}  color(${c}) metal ${m.getMetallicFactor()} rough ${m.getRoughnessFactor()} emissive(${m.getEmissiveFactor().map((v) => v.toFixed(2))}) alpha ${m.getAlphaMode()}${m.getBaseColorTexture() ? ' +tex' : ''}`)
}
console.log(`• meshes: ${doc.getRoot().listMeshes().length}, primitives (draw calls): ${doc.getRoot().listMeshes().reduce((a, m) => a + m.listPrimitives().length, 0)}`)

await io.write(OUT, doc)
console.log(`✓ wrote ${OUT} (${(statSync(OUT).size / 1024 / 1024).toFixed(2)} MB)`)
