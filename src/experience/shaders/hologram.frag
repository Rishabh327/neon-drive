// Holographic neon text: chromatic split, scanlines, slice glitch, rain hits.
uniform sampler2D uMap;      // white text on transparent
uniform float uTime;
uniform float uOpacity;
uniform float uGlitch;       // 0 … 1 extra glitch (ramps up as the name shatters)
uniform vec3 uColorA;        // core
uniform vec3 uColorB;        // chromatic fringe
uniform vec2 uAspect;        // plane size in metres, for round ripples

varying vec2 vUv;

float hash(float n) { return fract(sin(n) * 43758.5453); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }

void main() {
  vec2 uv = vUv;

  // --- slice glitch: rare horizontal tears, constant when shattering
  float gt = floor(uTime * 14.0);
  float slice = floor(uv.y * 18.0);
  float tear = step(0.94 - uGlitch * 0.6, hash(gt * 1.7)) * (hash(slice * 3.1 + gt) - 0.5);
  uv.x += tear * (0.035 + uGlitch * 0.12);

  // --- raindrops hitting the letters: expanding rings on a jittered grid
  vec2 p = uv * uAspect / 3.0;           // ~3 m cells
  vec2 cell = floor(p);
  vec2 f = fract(p);
  float h = hash2(cell);
  vec2 c = 0.2 + 0.6 * vec2(hash2(cell + 7.1), hash2(cell + 3.3));
  float phase = fract(uTime * (0.6 + 0.6 * h) + h * 9.0);
  float r = length((f - c) * vec2(1.0, 1.0));
  float ringR = phase * 0.55;
  float ring = smoothstep(0.06, 0.0, abs(r - ringR)) * (1.0 - phase);
  vec2 rippleOff = normalize(f - c + 1e-4) * ring * 0.006;
  float splash = smoothstep(0.08, 0.0, r) * smoothstep(0.25, 0.0, phase); // bright impact point

  // --- chromatic aberration
  float ca = 0.0028 + uGlitch * 0.01 + abs(tear) * 0.02;
  float aR = texture2D(uMap, uv + rippleOff + vec2(ca, 0.0)).a;
  float aG = texture2D(uMap, uv + rippleOff).a;
  float aB = texture2D(uMap, uv + rippleOff - vec2(ca, 0.0)).a;
  float a = max(aG, max(aR, aB));

  vec3 col = uColorA * aG + uColorB * max(aB - aG, 0.0) * 1.4 + vec3(1.0, 0.6, 0.9) * max(aR - aG, 0.0) * 0.8;

  // --- scanlines + slow vertical sweep band
  float scan = 0.78 + 0.22 * sin(uv.y * 520.0 + uTime * 6.0);
  float band = smoothstep(0.08, 0.0, abs(fract(uv.y * 0.5 - uTime * 0.12) - 0.5) - 0.42);
  col *= scan * (1.0 + band * 0.6);

  // --- rain: ripple rings brighten the letters, impacts flash
  col += vec3(0.7, 0.9, 1.0) * (ring * 0.9 + splash * 2.0) * aG;

  // --- neon hum + rare dropout
  float hum = 0.93 + 0.07 * sin(uTime * 50.0);
  float dropout = 1.0 - 0.6 * step(0.985, hash(floor(uTime * 9.0) + 4.0));
  col *= hum * dropout * 2.4; // > 1 → blooms

  float alpha = a * uOpacity;
  if (!(alpha > 0.002)) discard;
  gl_FragColor = vec4(col * alpha, alpha);
}
