// Name → river of light → lane markings. Every particle's whole flight is a
// pure function of scroll progress, so scrubbing backwards re-assembles the name.
attribute vec3 aStart;
attribute vec3 aEnd;
attribute vec4 aRand;

uniform float uProgress;
uniform float uTime;
uniform float uPixelRatio;
uniform float uSize;

varying float vAlpha;
varying vec3 vColor;

vec3 bezier(vec3 a, vec3 b, vec3 c, vec3 d, float t) {
  float u = 1.0 - t;
  return u * u * u * a + 3.0 * u * u * t * b + 3.0 * u * t * t * c + t * t * t * d;
}

void main() {
  float t = clamp((uProgress - 0.1 - aRand.w * 0.028) / 0.068, 0.0, 1.0);
  float e = t * t * (3.0 - 2.0 * t);

  vec3 burst = aStart + vec3((aRand.x - 0.5) * 30.0, -4.0 - aRand.y * 12.0, (aRand.z - 0.5) * 18.0 + 8.0);
  vec3 river = vec3((aRand.x - 0.5) * 9.0, 40.0 + aRand.y * 18.0, 28.0 - aRand.z * 34.0);
  vec3 pos = bezier(aStart, burst, river, aEnd, e);

  // a little turbulence mid-flight
  float mid = sin(e * 3.14159);
  pos += mid * vec3(sin(aRand.x * 40.0 + uTime * 1.7), cos(aRand.y * 30.0 + uTime * 1.3) * 0.6, cos(aRand.z * 50.0 + uTime * 2.1)) * 2.2;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  float size = uSize * (0.6 + aRand.y * 0.8) * (1.0 + mid * 1.6);
  gl_PointSize = clamp(size * uPixelRatio * (140.0 / -mv.z), 1.0, 28.0);

  float fadeIn = smoothstep(0.097, 0.104, uProgress);
  float fadeOut = 1.0 - smoothstep(0.176, 0.192, uProgress);
  float twinkle = 0.75 + 0.25 * sin(uTime * (6.0 + aRand.x * 10.0) + aRand.z * 30.0);
  vAlpha = fadeIn * fadeOut * twinkle;

  vec3 magenta = vec3(1.0, 0.165, 0.427);
  vec3 cyan = vec3(0.02, 0.85, 0.91);
  vColor = mix(magenta, cyan, smoothstep(0.25, 0.9, e)) * (2.0 + mid * 1.5);

  if (vAlpha <= 0.001) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}
