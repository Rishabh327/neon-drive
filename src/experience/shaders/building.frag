#include <common>
#include <fog_pars_fragment>

uniform float uTime;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vSeed;
varying float vHeight;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec3 n = vNormal;
  float side = 1.0 - step(0.5, abs(n.y));

  // Base facade: near-black navy, lit from below by the street's neon haze
  vec3 col = vec3(0.012, 0.014, 0.032);
  float ground = exp(-vWorldPos.y * 0.15);
  col += ground * mix(vec3(0.22, 0.02, 0.12), vec3(0.0, 0.12, 0.18), vSeed) * 0.1;

  // Window grid — computed outside any branch so derivatives stay valid
  float h = abs(n.x) > 0.5 ? vWorldPos.z : vWorldPos.x;
  vec2 uv = vec2(h / 2.6, (vWorldPos.y - 1.0) / 3.4);
  vec2 cell = floor(uv);
  vec2 f = fract(uv);
  vec2 fw = fwidth(uv);
  vec2 lo = smoothstep(vec2(0.2, 0.28) - fw, vec2(0.2, 0.28) + fw, f);
  vec2 hi = 1.0 - smoothstep(vec2(0.8, 0.76) - fw, vec2(0.8, 0.76) + fw, f);
  float win = lo.x * lo.y * hi.x * hi.y;

  vec2 key = cell + vec2(vSeed * 97.0 + n.x * 13.0, n.z * 7.0);
  float r = hash21(key);
  float lit = step(0.7, r) * step(0.0, uv.y); // ground floor stays dark
  float r2 = hash21(key * 1.37 + 3.1);
  vec3 wc = vec3(1.0, 0.7, 0.42);
  wc = mix(wc, vec3(0.35, 0.85, 1.0), step(0.72, r2));
  wc = mix(wc, vec3(1.0, 0.3, 0.6), step(0.94, r2));
  // a handful of windows slowly breathe (TVs, screens)
  float breathe = mix(1.0, 0.6 + 0.4 * sin(uTime * (1.0 + r2 * 3.0) + r * 40.0), step(0.97, r));
  vec3 windows = wc * lit * (0.12 + 0.42 * hash21(key + 9.7)) * breathe;

  // When window cells shrink below a few pixels, fade to their average to kill moiré
  float far = clamp(max(fw.x, fw.y) * 2.5 - 0.6, 0.0, 1.0);
  vec3 avgWin = vec3(1.0, 0.75, 0.55) * 0.36 * 0.36 * 0.43;
  col += side * mix(windows * win, avgWin, far);

  // Roofline neon strip on ~1 in 6 buildings (blooms)
  float top = vHeight - vWorldPos.y;
  float strip = step(0.83, vSeed) * side * (1.0 - smoothstep(0.25, 0.6, top));
  vec3 neon = mix(vec3(1.0, 0.165, 0.427), vec3(0.02, 0.85, 0.91), step(0.92, vSeed));
  col += neon * strip * 2.6;

  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
}
