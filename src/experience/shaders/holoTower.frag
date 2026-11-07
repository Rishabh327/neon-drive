// Wireframe-ish hologram box: glowing edges, floor lines, rising scan band.
uniform vec3 uColor;
uniform vec3 uSize;     // box size in metres
uniform float uTime;
uniform float uActive;  // 0 … 1 (unfold)
varying vec3 vLocal;    // metres, box-centred (BoxGeometry is built at full size)
varying vec3 vWorld;

void main() {
  vec3 q = abs(vLocal) * 2.0 / uSize;         // 1 at faces
  vec3 edgeW = vec3(0.16) / uSize;            // ~8 cm tubes
  vec3 fw = fwidth(q) * 1.2;
  vec3 e = smoothstep(1.0 - edgeW - fw, 1.0 - edgeW + fw, q);
  float edge = clamp(e.x * e.y + e.y * e.z + e.z * e.x, 0.0, 1.0);

  // floor lines every 3 m
  float fy = abs(fract(vWorld.y / 3.0) - 0.5) * 2.0;
  float floors = smoothstep(0.94, 0.985, fy) * 0.5;

  // a scan band climbing the tower
  float y01 = vLocal.y / uSize.y + 0.5;
  float band = exp(-pow((fract(y01 - uTime * 0.18) - 0.5) * 9.0, 2.0));

  float glow = edge * 2.2 + floors * 0.6 + band * 0.25 + 0.012;
  glow *= 0.35 + 0.65 * uActive + uActive * band * 0.8;
  float a = clamp(glow, 0.0, 4.0) * 0.55;
  if (!(a > 0.003)) discard;
  gl_FragColor = vec4(uColor * a, a);
}
