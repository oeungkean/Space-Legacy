// A soft, glowing atmosphere around a planet (instead of a flat colored circle).
// It is made of two thin shells around the planet:
//   - an outer glow that is brightest right at the planet's edge and fades smoothly into space
//   - an inner rim that lights up the edge of the planet itself, like haze seen from the side
// Works with every renderer in the project (including the one with a logarithmic depth buffer).

import * as THREE from "three";

const vertexShader = [
  "#include <common>",
  "#include <logdepthbuf_pars_vertex>",
  "varying vec3 vNormal;",
  "varying vec3 vViewPosition;",
  "void main() {",
  "  vNormal = normalize(normalMatrix * normal);",
  "  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);",
  "  vViewPosition = -mvPosition.xyz;",
  "  gl_Position = projectionMatrix * mvPosition;",
  "  #include <logdepthbuf_vertex>",
  "}"
].join("\n");

// Outer glow: on the back of a bigger sphere. uEdge = how the planet's edge looks from this shell.
const outerFragment = [
  "#include <logdepthbuf_pars_fragment>",
  "uniform vec3 uColor;",
  "uniform float uStrength;",
  "uniform float uEdge;",
  "varying vec3 vNormal;",
  "varying vec3 vViewPosition;",
  "void main() {",
  "  #include <logdepthbuf_fragment>",
  "  float facing = -dot(normalize(vNormal), normalize(vViewPosition));",
  "  float glow = smoothstep(0.0, uEdge, facing);",
  "  glow = pow(glow, 2.6) * 0.85;",
  "  gl_FragColor = vec4(uColor * glow * uStrength, 1.0);",
  "}"
].join("\n");

// Inner rim: on the front of a sphere just above the surface; bright at the edge, clear in the middle
const innerFragment = [
  "#include <logdepthbuf_pars_fragment>",
  "uniform vec3 uColor;",
  "uniform float uStrength;",
  "varying vec3 vNormal;",
  "varying vec3 vViewPosition;",
  "void main() {",
  "  #include <logdepthbuf_fragment>",
  "  float facing = max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0);",
  "  float rim = pow(1.0 - facing, 2.0);",
  "  gl_FragColor = vec4(uColor * rim * uStrength, 1.0);",
  "}"
].join("\n");

function material(fragmentShader, uniforms, side) {
  return new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: side,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
}

// radius = the planet's radius. options: color, strength (brightness), size (how far the glow reaches, 1.1 to 1.6)
export function createGlow(radius, options) {
  options = options || {};
  const size = options.size || 1.18;
  const group = new THREE.Group();

  const outerUniforms = {
    uColor: { value: new THREE.Color(options.color || 0xffffff) },
    uStrength: { value: options.strength === undefined ? 1 : options.strength },
    uEdge: { value: Math.sqrt(1 - 1 / (size * size)) } // where the planet's edge falls on this shell
  };
  const outer = new THREE.Mesh(
    new THREE.SphereGeometry(radius * size, 64, 48),
    material(outerFragment, outerUniforms, THREE.BackSide)
  );
  group.add(outer);

  const innerUniforms = {
    uColor: { value: new THREE.Color(options.color || 0xffffff) },
    uStrength: { value: (options.strength === undefined ? 1 : options.strength) * (options.rim === undefined ? 0.3 : options.rim) }
  };
  const inner = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.006, 64, 48),
    material(innerFragment, innerUniforms, THREE.FrontSide)
  );
  group.add(inner);

  // Change the color or brightness later (for example when the home planet changes)
  group.userData.setColor = function (color) {
    outerUniforms.uColor.value.set(color);
    innerUniforms.uColor.value.set(color);
  };
  group.userData.setStrength = function (strength) {
    outerUniforms.uStrength.value = strength;
    innerUniforms.uStrength.value = strength * (options.rim === undefined ? 0.3 : options.rim);
  };
  return group;
}
