#include <common>
#include <fog_pars_fragment>

uniform float uTime;
varying vec2 vUv;
varying vec3 vColor;
varying float vSeed;
varying vec2 vSize;

float hash(float n) { return fract(sin(n) * 43758.5453); }

void main() {
  // Glowing border tube
  vec2 px = vUv * vSize;              // metres across the sign
  vec2 e = min(px, vSize - px);
  float border = 1.0 - smoothstep(0.06, 0.14, min(e.x, e.y));

  // "Text": rows of blocky glyph bars, unique per sign
  bool vertical = vSize.y > vSize.x;
  vec2 g = vertical ? vec2(px.x / vSize.x, px.y / 0.9) : vec2(px.x / 0.55, px.y / vSize.y);
  float glyphId = vertical ? floor(g.y) : floor(g.x);
  vec2 gf = vertical ? vec2(g.x, fract(g.y)) : vec2(fract(g.x), g.y);
  float present = step(0.25, hash(glyphId + vSeed * 91.0));
  float inner = step(0.22, gf.x) * step(gf.x, 0.78) * step(0.2, gf.y) * step(gf.y, 0.8);
  float stroke = step(0.5, hash(glyphId * 7.0 + floor(gf.y * 4.0) + floor(gf.x * 3.0) * 13.0 + vSeed * 17.0));
  float textMask = present * inner * stroke * (1.0 - border) * step(0.18, min(e.x, e.y));

  // Flicker: a few signs stutter, all hum slightly
  float t = uTime * (6.0 + vSeed * 9.0);
  float stutter = step(0.88, vSeed) * step(0.92, hash(floor(t) + vSeed * 3.0));
  float hum = 0.94 + 0.06 * sin(uTime * 40.0 + vSeed * 50.0);
  float on = (1.0 - stutter) * hum;

  vec3 panel = vColor * 0.06;
  vec3 col = panel + vColor * (border * 2.4 + textMask * 1.7) * on;
  // never let NaN/Inf reach the HDR buffer — bloom would smear it across the frame
  if (any(isnan(col)) || any(isinf(col))) col = vec3(0.0);
  col = max(col, vec3(0.0));
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
}
