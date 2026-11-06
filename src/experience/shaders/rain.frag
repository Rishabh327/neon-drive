uniform vec3 uColor;
varying float vAlpha;
varying float vV;

void main() {
  float a = vAlpha * vV * vV * 0.6; // bright head, fading tail
  gl_FragColor = vec4(uColor * a, a);
}
