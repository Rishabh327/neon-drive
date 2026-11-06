uniform vec3 uColor;
uniform float uVisible;
varying vec2 vUv;
varying float vPhase;

void main() {
  float r = length(vUv - 0.5) * 2.0;
  float ring = smoothstep(0.7, 0.88, r) * (1.0 - smoothstep(0.88, 1.0, r));
  float a = ring * (1.0 - vPhase) * 0.5 * uVisible;
  gl_FragColor = vec4(uColor * a, a);
}
