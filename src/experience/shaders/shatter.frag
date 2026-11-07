varying float vAlpha;
varying vec3 vColor;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.05, d) * vAlpha;
  if (!(a > 0.002)) discard;
  gl_FragColor = vec4(vColor * a, a);
}
