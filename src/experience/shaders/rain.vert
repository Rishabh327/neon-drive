attribute vec4 aRand; // xyz: position in box (0..1), w: per-drop seed

uniform float uTime;
uniform vec3 uCam;
uniform vec3 uBox;
uniform vec3 uCamVel;
uniform float uDensity;
uniform float uFall;
uniform vec3 uWind;

varying float vAlpha;
varying float vV;

void main() {
  float speed = uFall * (0.8 + 0.4 * aRand.w);
  vec3 p = aRand.xyz * uBox + uWind * uTime;
  p.y -= uTime * speed;

  // Infinite rain: wrap every drop into a box that travels with the camera
  vec3 rel = mod(p - uCam + 0.5 * uBox, uBox) - 0.5 * uBox;
  vec3 world = uCam + rel;

  // Streak follows the drop's velocity relative to the camera → slants when driving fast
  vec3 vel = vec3(0.0, -speed, 0.0) + uWind - uCamVel;
  float vlen = max(length(vel), 0.001);
  vec3 axis = vel / vlen;
  float len = clamp(vlen * 0.03, 0.4, 3.5);
  vec3 toCam = normalize(cameraPosition - world);
  vec3 side = normalize(cross(axis, toCam));
  float w = 0.016 * (0.7 + 0.6 * aRand.w);
  world += side * position.x * w + axis * position.y * len;

  vV = position.y + 0.5;
  float d = length(rel);
  vAlpha = smoothstep(1.2, 4.0, d) * (1.0 - smoothstep(0.3 * uBox.x, 0.5 * uBox.x, d));

  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  // thin the rain (rooftop) by collapsing culled drops outside the clip volume
  if (aRand.w > uDensity) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}
