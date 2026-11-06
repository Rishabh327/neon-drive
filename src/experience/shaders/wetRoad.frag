#include <common>
#include <fog_pars_fragment>

uniform sampler2D tDiffuse;   // mirrored scene (mipmapped → cheap blur)
uniform sampler2D uLayout;    // asphalt / pavement albedo
uniform sampler2D uPuddles;   // tiling roughness: dark = puddle
uniform vec3 color;           // required by Reflector, unused
uniform float uTime;
uniform float uRipples;
uniform float uMaxLod;
uniform vec3 uCarPos;
uniform vec3 uCarDir;
uniform float uHeadOn;

varying vec4 vReflUv;
varying vec2 vUv;
varying vec3 vWorld;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Expanding rain-drop rings on a grid — returns a 2D slope for distortion
vec2 ripples(vec2 p, float t) {
  vec2 grad = vec2(0.0);
  for (int k = 0; k < 2; k++) {
    vec2 q = p * (k == 0 ? 1.0 : 1.7) + float(k) * 13.1;
    vec2 cell = floor(q);
    vec2 f = fract(q);
    float h = hash12(cell + float(k) * 7.0);
    vec2 c = vec2(0.25) + 0.5 * vec2(hash12(cell + 1.3), hash12(cell + 4.7));
    float phase = fract(t * (0.9 + 0.5 * h) + h);
    vec2 d = f - c;
    float r = length(d);
    float ring = sin((r - phase * 0.45) * 60.0) * smoothstep(0.45, 0.0, abs(r - phase * 0.45) * 6.0) * (1.0 - phase);
    grad += normalize(d + 1e-4) * ring;
  }
  return grad;
}

void main() {
  vec3 base = texture2D(uLayout, vUv).rgb;
  float puddle = texture2D(uPuddles, vWorld.xz / 14.0).r;
  float rough = smoothstep(0.05, 0.75, puddle);   // 0 = mirror puddle, 1 = rough wet asphalt

  vec3 viewDir = normalize(cameraPosition - vWorld);
  float ndv = clamp(viewDir.y, 0.0, 1.0);
  float fresnel = 0.18 + 0.82 * pow(1.0 - ndv, 4.0);

  // distortion: rain ripples (near camera only) + rougher = more wobble
  float near = 1.0 - smoothstep(10.0, 40.0, length(cameraPosition.xz - vWorld.xz));
  vec2 dist = ripples(vWorld.xz * 0.9, uTime) * 0.006 * near * uRipples;
  vec4 proj = vReflUv;
  vec2 ruv = proj.xy / max(proj.w, 1e-4) + dist;

  // wet-tarmac streaking: several taps stretched vertically in reflection space
  float lod = rough * uMaxLod;
  float stretch = mix(0.004, 0.03, rough);
  vec3 refl = vec3(0.0);
  refl += textureLod(tDiffuse, ruv, lod).rgb * 0.30;
  refl += textureLod(tDiffuse, ruv + vec2(0.0, stretch), lod).rgb * 0.22;
  refl += textureLod(tDiffuse, ruv - vec2(0.0, stretch), lod).rgb * 0.22;
  refl += textureLod(tDiffuse, ruv + vec2(0.0, stretch * 2.2), lod + 1.0).rgb * 0.13;
  refl += textureLod(tDiffuse, ruv - vec2(0.0, stretch * 2.2), lod + 1.0).rgb * 0.13;

  float reflStrength = mix(0.95, 0.4, rough) * fresnel;
  vec3 col = base * 0.35 + refl * reflStrength;

  // Headlight pool from the car (shader-faked: no per-pixel spot light cost)
  vec3 toP = vWorld - uCarPos;
  float along = dot(toP.xz, uCarDir.xz);
  float across = abs(dot(toP.xz, vec2(-uCarDir.z, uCarDir.x)));
  float cone = smoothstep(0.0, 4.0, along) * (1.0 - smoothstep(0.0, 1.2 + along * 0.38, across)) * (1.0 - smoothstep(10.0, 34.0, along));
  col += vec3(0.75, 0.93, 1.0) * cone * uHeadOn * mix(0.32, 0.12, rough);
  // tail-light glow behind the car
  float tail = smoothstep(0.0, -1.0, along + 2.4) * (1.0 - smoothstep(0.0, 5.0, -along - 2.4)) * (1.0 - smoothstep(0.0, 1.6, across));
  col += vec3(1.0, 0.16, 0.43) * tail * 0.5;

  // never let NaN/Inf reach the HDR buffer — bloom would smear it across the frame
  if (any(isnan(col)) || any(isinf(col))) col = vec3(0.0);
  col = max(col, vec3(0.0));
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
}
