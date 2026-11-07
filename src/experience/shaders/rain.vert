attribute vec4 aRand; // xyz: position in box (0..1), w: per-drop seed

uniform float uTime;
uniform vec3 uCam;
uniform vec3 uBox;
uniform vec3 uCamVel;
uniform float uDensity;
uniform float uFall;
uniform vec3 uWind;
uniform vec2 uPointer;      // NDC
uniform float uPointerForce; // 0 outside the hero
uniform float uAspect;

varying float vAlpha;
varying float vV;

void main() {
  float speed = uFall * (0.8 + 0.4 * aRand.w);
  vec3 p = aRand.xyz * uBox + uWind * uTime;
  p.y -= uTime * speed;

  // Infinite rain: wrap every drop into a box that travels with the camera
  vec3 rel = mod(p - uCam + 0.5 * uBox, uBox) - 0.5 * uBox;
  vec3 world = uCam + rel;

  // Cursor parts the rain: push drops away from the pointer, in screen space
  if (uPointerForce > 0.0) {
    vec4 clip = projectionMatrix * viewMatrix * vec4(world, 1.0);
    vec2 ndc = clip.xy / max(clip.w, 1e-3);
    vec2 d = (ndc - uPointer) * vec2(uAspect, 1.0);
    float f = uPointerForce * exp(-dot(d, d) / 0.035) * step(0.0, clip.w);
    vec2 dir = d / max(length(d), 1e-4);
    vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    world += (camRight * dir.x + camUp * dir.y) * f * clip.w * 0.16;
  }

  // Streak follows the drop's velocity relative to the camera → slants when driving fast
  vec3 vel = vec3(0.0, -speed, 0.0) + uWind - uCamVel;
  float vlen = max(length(vel), 0.001);
  vec3 axis = vel / vlen;
  float len = clamp(vlen * 0.03, 0.4, 3.5);
  // NaN-safe basis. When the camera moves fast, drops near the centre of motion
  // fly straight at the lens (axis ∥ toCam) and drops can pass through the camera
  // (toCam ≈ 0). A plain normalize() there yields NaN → black pixels that bloom
  // then smears across the whole frame. Guard both.
  vec3 toCamRaw = cameraPosition - world;
  float toCamLen = length(toCamRaw);
  vec3 toCam = toCamLen > 1e-4 ? toCamRaw / toCamLen : vec3(0.0, 0.0, 1.0);
  vec3 c = cross(axis, toCam);
  float cl = length(c);
  vec3 fallback = abs(toCam.y) < 0.99 ? normalize(cross(vec3(0.0, 1.0, 0.0), toCam)) : vec3(1.0, 0.0, 0.0);
  vec3 side = cl > 1e-3 ? c / cl : fallback;
  float w = 0.016 * (0.7 + 0.6 * aRand.w);
  world += side * position.x * w + axis * position.y * len;

  vV = position.y + 0.5;
  float d = length(rel);
  vAlpha = smoothstep(1.2, 4.0, d) * (1.0 - smoothstep(0.3 * uBox.x, 0.5 * uBox.x, d));

  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  // thin the rain (rooftop) by collapsing culled drops outside the clip volume
  // (also drop anything right at the lens — invisible anyway, and degenerate)
  if (aRand.w > uDensity || d < 1.2) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}
