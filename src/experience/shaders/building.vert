#include <common>
#include <fog_pars_vertex>

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vSeed;
varying float vHeight;

void main() {
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vNormal = normal; // boxes are axis-aligned, never rotated
  // seed from the instance's WORLD position (instances are chunk-relative)
  vec3 t = (modelMatrix * vec4(instanceMatrix[3].xyz, 1.0)).xyz;
  vSeed = fract(sin(dot(t.xz, vec2(12.9898, 78.233))) * 43758.5453);
  vHeight = length(instanceMatrix[1].xyz);
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
