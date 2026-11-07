// The holographic "screen" behind each project's HTML card: tinted glass,
// scanlines, glowing frame with corner brackets, unfold sweep.
uniform vec3 uColor;
uniform float uTime;
uniform float uUnfold;
uniform vec2 uSize;
varying vec2 vUv;

void main() {
  vec2 m = vUv * uSize;                       // metres
  vec2 e2 = min(m, uSize - m);
  float edge = min(e2.x, e2.y);
  float frame = smoothstep(0.09, 0.0, edge);
  // corner brackets
  float corner = step(edge, 0.18) * step(min(max(e2.x, e2.y), 9.0), 1.1);
  float scan = 0.65 + 0.35 * sin(vUv.y * uSize.y * 70.0 - uTime * 5.0);
  // unfold: a bright seam sweeping outward from the centre
  float seam = smoothstep(0.06, 0.0, abs(abs(vUv.x - 0.5) * 2.0 - uUnfold)) * (1.0 - uUnfold);
  vec3 col = uColor * (frame * 2.4 + corner * 3.0 + seam * 4.0) + uColor * 0.05 * scan;
  float a = (0.42 * scan * 0.6 + frame + corner + seam) * uUnfold;
  vec3 glass = vec3(0.02, 0.025, 0.06);
  gl_FragColor = vec4(glass * 0.5 * a + col * a, clamp(a, 0.0, 1.0));
}
