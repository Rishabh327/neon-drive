uniform vec3 uColor;
varying float vAlpha;
varying float vV;

void main() {
  float a = vAlpha * vV * vV * 0.6; // bright head, fading tail
  // Never let a NaN/Inf reach the HDR buffer (NaN comparisons are false → discard)
  if (!(a > 0.0) || a > 4.0) discard;
  gl_FragColor = vec4(uColor * a, a);
}
