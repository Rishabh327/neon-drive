attribute vec3 aRand;
uniform float uTime;
uniform vec3 uCam;
uniform float uRadius;
varying vec2 vUv;
varying float vPhase;

float hash(float n) { return fract(sin(n) * 43758.5453); }

void main() {
  float t = uTime * 1.7 + aRand.z * 9.0;
  float cycle = floor(t);
  vPhase = fract(t);
  // new random spot every cycle, wrapped around the camera
  vec2 o = vec2(hash(cycle + aRand.x * 113.0), hash(cycle * 1.3 + aRand.y * 71.0)) * 2.0 - 1.0;
  vec2 xz = uCam.xz + o * uRadius;
  float s = 0.08 + vPhase * 0.32;
  vec3 world = vec3(xz.x + position.x * s * 2.0, 0.05, xz.y + position.y * s * 2.0);
  vUv = position.xy + 0.5;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
