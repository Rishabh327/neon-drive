#include <common>
#include <fog_pars_vertex>

uniform mat4 textureMatrix;
varying vec4 vReflUv;
varying vec2 vUv;
varying vec3 vWorld;

void main() {
  vUv = uv;
  vReflUv = textureMatrix * vec4(position, 1.0);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
