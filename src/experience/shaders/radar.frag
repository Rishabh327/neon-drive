// AlertNet moment: a radar sweeps the city map; alert pings pop up (amber, unverified);
// as the AI scanner beam passes, real alerts turn red and pulse, fakes are rejected (grey ✕, fade).
uniform float uTime;
uniform float uOn;
uniform float uRadius;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

const float TAU = 6.2831853;
const float SWEEP = 1.15; // rad / s

void main() {
  vec2 p = (vUv - 0.5) * 2.0 * uRadius;       // metres from the centre
  float r = length(p);
  if (r > uRadius) discard;
  float ang = atan(p.y, p.x);
  float sweepA = mod(uTime * SWEEP, TAU);

  vec3 red = vec3(1.0, 0.12, 0.25);
  vec3 cyan = vec3(0.02, 0.85, 0.91);
  vec3 amber = vec3(0.98, 0.9, 0.35);
  vec3 col = vec3(0.0);

  // range rings + faint grid
  float rings = smoothstep(0.12, 0.0, abs(fract(r / 15.0 + 0.5) - 0.5) * 15.0) * 0.25;
  vec2 g = abs(fract(p / 10.0) - 0.5) * 10.0;
  float grid = smoothstep(0.06, 0.0, min(g.x, g.y)) * 0.08;
  col += cyan * (rings + grid);

  // expanding alert pulse from the centre
  float pulseR = fract(uTime * 0.28) * uRadius;
  col += red * smoothstep(0.9, 0.0, abs(r - pulseR)) * (1.0 - pulseR / uRadius) * 1.6;

  // scanner beam (trailing wedge)
  float behind = mod(sweepA - ang, TAU);
  col += cyan * exp(-behind * 5.0) * smoothstep(uRadius, uRadius * 0.2, r) * 1.4;
  col += cyan * smoothstep(0.02, 0.0, behind) * 2.5;

  // pings on a jittered 9 m grid (check the 3×3 neighbourhood)
  vec2 cell = floor(p / 9.0);
  for (int j = -1; j <= 1; j++)
  for (int i = -1; i <= 1; i++) {
    vec2 c = cell + vec2(float(i), float(j));
    float h = hash(c);
    if (h > 0.42) continue;
    vec2 pp = (c + 0.2 + 0.6 * vec2(hash(c + 3.7), hash(c + 9.1))) * 9.0;
    if (length(pp) > uRadius - 2.0 || length(pp) < 6.0) continue;
    float d = length(p - pp);
    float pa = atan(pp.y, pp.x);
    float since = mod(sweepA - pa, TAU) / SWEEP;          // seconds since the beam passed
    float period = TAU / SWEEP;
    bool fake = hash(c + 5.3) < 0.4;
    float dot_ = smoothstep(0.9, 0.5, d);
    if (since < 0.35) {
      // being scanned: white flash
      col += vec3(1.0) * dot_ * 3.0;
    } else if (!fake) {
      float pr = fract(uTime * 0.9 + h * 7.0) * 3.0;
      col += red * (dot_ * 2.6 + smoothstep(0.25, 0.0, abs(d - pr)) * (1.0 - pr / 3.0) * 1.8);
    } else {
      float fade = 1.0 - smoothstep(0.35, 2.2, since);
      vec2 q = p - pp;
      float x = smoothstep(0.18, 0.0, min(abs(q.x - q.y), abs(q.x + q.y))) * step(d, 1.1);
      col += vec3(0.5, 0.52, 0.6) * (dot_ * 0.6 + x * 1.6) * fade;
      // before the next scan, it re-appears as an unverified (amber) report
      col += amber * dot_ * 1.4 * smoothstep(period * 0.65, period * 0.8, since);
    }
  }

  float edgeFade = smoothstep(uRadius, uRadius * 0.85, r);
  col *= uOn * edgeFade;
  float a = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
  if (!(a > 0.003)) discard;
  gl_FragColor = vec4(col, a);
}
