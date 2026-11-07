import {
  Camera,
  HalfFloatType,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  WebGLRenderTarget,
  type WebGLRenderer,
} from 'three'

/**
 * Neon Drive's own post-processing — five small shader passes:
 *
 *   scene ─► HDR target (half-float, linear)
 *            ├─► prefilter (bright emissives only, soft knee) ─► mip 0 (½ res)
 *            │     └─► 13-tap downsample ─► mip 1 … N
 *            │           └─► tent upsample, added back up ─► mip 0 = bloom
 *            └─► composite: + bloom → ACES → radial chromatic aberration → vignette
 *                           → grain → sRGB  ─► LDR target ─► FXAA ─► screen
 *
 * Owning the materials means every one of them can be compiled with
 * compileAsync before the first frame (see precompile) — no main-thread stalls.
 */

const FULLSCREEN_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`

const PREFILTER = /* glsl */ `
  uniform sampler2D tSrc;
  uniform vec2 uTexel;
  uniform float uThreshold;
  uniform float uKnee;
  varying vec2 vUv;
  void main() {
    // 4-tap box (anti-flicker) then soft-knee threshold on luminance
    vec3 c = texture2D(tSrc, vUv + uTexel * vec2(-0.5, -0.5)).rgb
           + texture2D(tSrc, vUv + uTexel * vec2( 0.5, -0.5)).rgb
           + texture2D(tSrc, vUv + uTexel * vec2(-0.5,  0.5)).rgb
           + texture2D(tSrc, vUv + uTexel * vec2( 0.5,  0.5)).rgb;
    c *= 0.25;
    float l = max(c.r, max(c.g, c.b));
    float soft = clamp(l - uThreshold + uKnee, 0.0, 2.0 * uKnee);
    soft = soft * soft / (4.0 * uKnee + 1e-4);
    float w = max(soft, l - uThreshold) / max(l, 1e-4);
    vec3 o = c * w;
    gl_FragColor = vec4(min(o, vec3(64.0)), 1.0); // clamp fireflies
  }
`

const DOWNSAMPLE = /* glsl */ `
  uniform sampler2D tSrc;
  uniform vec2 uTexel; // of the source
  varying vec2 vUv;
  void main() {
    // CoD:AW 13-tap downsample
    vec2 t = uTexel;
    vec3 a = texture2D(tSrc, vUv + t * vec2(-2.0, 2.0)).rgb;
    vec3 b = texture2D(tSrc, vUv + t * vec2(0.0, 2.0)).rgb;
    vec3 c = texture2D(tSrc, vUv + t * vec2(2.0, 2.0)).rgb;
    vec3 d = texture2D(tSrc, vUv + t * vec2(-2.0, 0.0)).rgb;
    vec3 e = texture2D(tSrc, vUv).rgb;
    vec3 f = texture2D(tSrc, vUv + t * vec2(2.0, 0.0)).rgb;
    vec3 g = texture2D(tSrc, vUv + t * vec2(-2.0, -2.0)).rgb;
    vec3 h = texture2D(tSrc, vUv + t * vec2(0.0, -2.0)).rgb;
    vec3 i = texture2D(tSrc, vUv + t * vec2(2.0, -2.0)).rgb;
    vec3 j = texture2D(tSrc, vUv + t * vec2(-1.0, 1.0)).rgb;
    vec3 k = texture2D(tSrc, vUv + t * vec2(1.0, 1.0)).rgb;
    vec3 l = texture2D(tSrc, vUv + t * vec2(-1.0, -1.0)).rgb;
    vec3 m = texture2D(tSrc, vUv + t * vec2(1.0, -1.0)).rgb;
    vec3 o = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
    gl_FragColor = vec4(o, 1.0);
  }
`

const UPSAMPLE = /* glsl */ `
  uniform sampler2D tSrc;   // smaller mip (being upsampled)
  uniform sampler2D tBase;  // this mip's own downsample result
  uniform vec2 uTexel;      // of the smaller mip
  uniform float uRadius;
  varying vec2 vUv;
  void main() {
    vec2 t = uTexel * uRadius;
    vec3 s = texture2D(tSrc, vUv + vec2(-t.x, t.y)).rgb + texture2D(tSrc, vUv + vec2(0.0, t.y)).rgb * 2.0 + texture2D(tSrc, vUv + t).rgb
           + texture2D(tSrc, vUv + vec2(-t.x, 0.0)).rgb * 2.0 + texture2D(tSrc, vUv).rgb * 4.0 + texture2D(tSrc, vUv + vec2(t.x, 0.0)).rgb * 2.0
           + texture2D(tSrc, vUv - t).rgb + texture2D(tSrc, vUv - vec2(0.0, t.y)).rgb * 2.0 + texture2D(tSrc, vUv + vec2(t.x, -t.y)).rgb;
    gl_FragColor = vec4(texture2D(tBase, vUv).rgb + s / 16.0, 1.0);
  }
`

const COMPOSITE = /* glsl */ `
  uniform sampler2D tScene;
  uniform sampler2D tBloom;
  uniform float uBloom;
  uniform float uCA;        // chromatic aberration strength (uv units at the edge)
  uniform float uVignette;
  uniform float uGrain;
  uniform float uTime;
  uniform vec2 uResolution;
  varying vec2 vUv;

  vec3 ACESFilmic(vec3 x) {
    // Narkowicz fit
    x *= 0.6;
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  }
  vec3 toSRGB(vec3 c) {
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
  }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  void main() {
    vec2 d = vUv - 0.5;
    float r2 = dot(d, d);
    vec2 off = d * uCA * smoothstep(0.02, 0.5, r2) * 4.0;
    vec3 col;
    col.r = texture2D(tScene, vUv + off).r;
    col.g = texture2D(tScene, vUv).g;
    col.b = texture2D(tScene, vUv - off).b;
    col += texture2D(tBloom, vUv).rgb * uBloom;
    col = ACESFilmic(col);
    col *= mix(1.0, smoothstep(0.85, 0.2, sqrt(r2) * 1.25), uVignette);
    vec3 outc = toSRGB(col);
    // film grain (screen-ish, scaled by brightness so blacks stay black)
    float g = hash(vUv * uResolution + fract(uTime * 13.7) * 91.0) - 0.5;
    outc += g * uGrain * (0.25 + 0.75 * outc);
    gl_FragColor = vec4(clamp(outc, 0.0, 1.0), 1.0);
  }
`

// Compact FXAA ("console" variant, Lottes): 5 taps, cheap to compile and to run.
const FXAA = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 resolution; // 1 / size
  varying vec2 vUv;
  float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  void main() {
    vec2 r = resolution;
    vec3 rgbNW = texture2D(tDiffuse, vUv + vec2(-0.5, -0.5) * r).rgb;
    vec3 rgbNE = texture2D(tDiffuse, vUv + vec2( 0.5, -0.5) * r).rgb;
    vec3 rgbSW = texture2D(tDiffuse, vUv + vec2(-0.5,  0.5) * r).rgb;
    vec3 rgbSE = texture2D(tDiffuse, vUv + vec2( 0.5,  0.5) * r).rgb;
    vec4 rgbM = texture2D(tDiffuse, vUv);
    float lNW = luma(rgbNW), lNE = luma(rgbNE), lSW = luma(rgbSW), lSE = luma(rgbSE), lM = luma(rgbM.rgb);
    float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
    float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
    if (lMax - lMin < max(0.0312, lMax * 0.125)) { gl_FragColor = rgbM; return; } // no edge
    vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), ((lNW + lSW) - (lNE + lSE)));
    float reduce = max((lNW + lNE + lSW + lSE) * 0.03125, 1.0 / 128.0);
    float rcpMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + reduce);
    dir = clamp(dir * rcpMin, vec2(-8.0), vec2(8.0)) * r;
    vec3 a = 0.5 * (texture2D(tDiffuse, vUv + dir * (1.0 / 3.0 - 0.5)).rgb + texture2D(tDiffuse, vUv + dir * (2.0 / 3.0 - 0.5)).rgb);
    vec3 b = a * 0.5 + 0.25 * (texture2D(tDiffuse, vUv - dir * 0.5).rgb + texture2D(tDiffuse, vUv + dir * 0.5).rgb);
    float lB = luma(b);
    gl_FragColor = vec4((lB < lMin || lB > lMax) ? a : b, 1.0);
  }
`

export interface PostSettings {
  bloom: number
  threshold: number
  mips: number
  ca: number
  vignette: number
  grain: number
  fxaa: boolean
}

export class NeonPost {
  readonly sceneTarget: WebGLRenderTarget
  private ldr: WebGLRenderTarget
  private mipsDown: WebGLRenderTarget[] = []
  private mipsUp: WebGLRenderTarget[] = []
  private quad: Mesh
  private quadScene = new Scene()
  private quadCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  readonly materials: { prefilter: ShaderMaterial; down: ShaderMaterial; up: ShaderMaterial; composite: ShaderMaterial; fxaa: ShaderMaterial }
  private w = 1
  private h = 1

  constructor(private settings: PostSettings) {
    const opts = { type: HalfFloatType, depthBuffer: false, minFilter: LinearFilter, magFilter: LinearFilter }
    this.sceneTarget = new WebGLRenderTarget(1, 1, { type: HalfFloatType, depthBuffer: true })
    this.ldr = new WebGLRenderTarget(1, 1, { type: UnsignedByteType, depthBuffer: false })
    for (let i = 0; i < settings.mips; i++) {
      this.mipsDown.push(new WebGLRenderTarget(1, 1, opts))
      this.mipsUp.push(new WebGLRenderTarget(1, 1, opts))
    }
    const mk = (frag: string, uniforms: Record<string, { value: unknown }>) =>
      new ShaderMaterial({ vertexShader: FULLSCREEN_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false })
    this.materials = {
      prefilter: mk(PREFILTER, { tSrc: { value: null }, uTexel: { value: new Vector2() }, uThreshold: { value: settings.threshold }, uKnee: { value: 0.35 } }),
      down: mk(DOWNSAMPLE, { tSrc: { value: null }, uTexel: { value: new Vector2() } }),
      up: mk(UPSAMPLE, { tSrc: { value: null }, tBase: { value: null }, uTexel: { value: new Vector2() }, uRadius: { value: 1 } }),
      composite: mk(COMPOSITE, {
        tScene: { value: this.sceneTarget.texture },
        tBloom: { value: null },
        uBloom: { value: settings.bloom },
        uCA: { value: settings.ca },
        uVignette: { value: settings.vignette },
        uGrain: { value: settings.grain },
        uTime: { value: 0 },
        uResolution: { value: new Vector2(1, 1) },
      }),
      fxaa: mk(FXAA, { tDiffuse: { value: this.ldr.texture }, resolution: { value: new Vector2() } }),
    }
    this.quad = new Mesh(new PlaneGeometry(2, 2), this.materials.composite)
    this.quad.frustumCulled = false
    this.quadScene.add(this.quad)
  }

  setSize(width: number, height: number) {
    const w = Math.max(1, Math.floor(width))
    const h = Math.max(1, Math.floor(height))
    if (w === this.w && h === this.h) return
    this.w = w
    this.h = h
    this.sceneTarget.setSize(w, h)
    this.ldr.setSize(w, h)
    let mw = w
    let mh = h
    for (let i = 0; i < this.mipsDown.length; i++) {
      mw = Math.max(1, Math.floor(mw / 2))
      mh = Math.max(1, Math.floor(mh / 2))
      this.mipsDown[i].setSize(mw, mh)
      this.mipsUp[i].setSize(mw, mh)
    }
    ;(this.materials.composite.uniforms.uResolution.value as Vector2).set(w, h)
    ;(this.materials.fxaa.uniforms.resolution.value as Vector2).set(1 / w, 1 / h)
  }

  private pass(material: ShaderMaterial, target: WebGLRenderTarget | null, gl: WebGLRenderer) {
    this.quad.material = material
    gl.setRenderTarget(target)
    gl.render(this.quadScene, this.quadCam)
  }

  render(gl: WebGLRenderer, scene: Scene, camera: Camera, time: number) {
    const m = this.materials
    // 1) scene → HDR target
    gl.setRenderTarget(this.sceneTarget)
    gl.render(scene, camera)

    // 2) bloom: prefilter → downsample chain → upsample chain
    const n = this.mipsDown.length
    m.prefilter.uniforms.tSrc.value = this.sceneTarget.texture
    ;(m.prefilter.uniforms.uTexel.value as Vector2).set(1 / this.w, 1 / this.h)
    this.pass(m.prefilter, this.mipsDown[0], gl)
    for (let i = 1; i < n; i++) {
      const src = this.mipsDown[i - 1]
      m.down.uniforms.tSrc.value = src.texture
      ;(m.down.uniforms.uTexel.value as Vector2).set(1 / src.width, 1 / src.height)
      this.pass(m.down, this.mipsDown[i], gl)
    }
    let bloomTex = this.mipsDown[n - 1].texture
    for (let i = n - 2; i >= 0; i--) {
      const smaller = i + 1 === n - 1 ? this.mipsDown[n - 1] : this.mipsUp[i + 1]
      m.up.uniforms.tSrc.value = smaller.texture
      m.up.uniforms.tBase.value = this.mipsDown[i].texture
      ;(m.up.uniforms.uTexel.value as Vector2).set(1 / smaller.width, 1 / smaller.height)
      this.pass(m.up, this.mipsUp[i], gl)
      bloomTex = this.mipsUp[i].texture
    }

    // 3) composite → (FXAA) → screen
    m.composite.uniforms.tBloom.value = bloomTex
    m.composite.uniforms.uTime.value = time
    if (this.settings.fxaa) {
      this.pass(m.composite, this.ldr, gl)
      this.pass(m.fxaa, null, gl)
    } else {
      this.pass(m.composite, null, gl)
    }
  }

  /**
   * Compile every post material asynchronously, against the same kind of target
   * it will draw into (three keys programs on that), before the first frame.
   */
  async precompile(gl: WebGLRenderer, wait = true) {
    const prev = gl.getRenderTarget()
    const jobs: Promise<unknown>[] = []
    const compileOn = (mats: ShaderMaterial[], target: WebGLRenderTarget | null) => {
      const s = new Scene()
      for (const mat of mats) {
        const q = new Mesh(this.quad.geometry, mat)
        q.frustumCulled = false
        s.add(q)
      }
      gl.setRenderTarget(target)
      if (wait) jobs.push(gl.compileAsync(s, this.quadCam))
      else gl.compile(s, this.quadCam)
    }
    compileOn([this.materials.prefilter, this.materials.down, this.materials.up], this.mipsDown[0])
    if (this.settings.fxaa) {
      compileOn([this.materials.composite], this.ldr)
      compileOn([this.materials.fxaa], null)
    } else compileOn([this.materials.composite], null)
    gl.setRenderTarget(prev)
    await Promise.all(jobs)
  }

  dispose() {
    ;[this.sceneTarget, this.ldr, ...this.mipsDown, ...this.mipsUp].forEach((t) => t.dispose())
    Object.values(this.materials).forEach((m) => m.dispose())
    this.quad.geometry.dispose()
  }
}
