// How each planet looks: real photo-based texture maps when they are available, and a painted
// stand-in (made from 3D noise, so it has no seam) while they load or if the file is missing.
// Used by the home-screen tour and by the planet pictures on the destination cards.
//
// Real textures:
//   - Earth (day map, normal map, ocean shine map, clouds) and the Moon come from the three.js examples on the jsDelivr CDN.
//   - The other planets need the Solar System Scope maps (CC BY 4.0) in assets/textures/ (see docs/ASSETS.md).

import * as THREE from "three";

const CDN = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/";
const LOCAL = "assets/textures/";

// colors: [base, dark, light] used by the painted stand-in. bands = gas or ice giant.
// radius: relative size used by the home tour (not to scale, but in the right order).
// air: the color of the thin atmosphere at the edge (null = no air). tilt in degrees.
export const PLANET_LOOKS = {
  Mercury: { map: LOCAL + "mercury.jpg", colors: ["#8d8781", "#5b5651", "#b9b3ab"], bands: false, radius: 1.6, air: null, tilt: 0 },
  Venus: { map: LOCAL + "venus_atmosphere.jpg", alt: LOCAL + "venus.jpg", colors: ["#d9bb7e", "#b28d4e", "#efdcae"], bands: true, soft: true, radius: 3.8, air: 0xf3d6a0, tilt: 3 },
  Earth: {
    map: CDN + "earth_atmos_2048.jpg", normal: CDN + "earth_normal_2048.jpg", specular: CDN + "earth_specular_2048.jpg",
    clouds: CDN + "earth_clouds_1024.png", colors: ["#1f4f8f", "#2f5d34", "#c9b98d"], earth: true, radius: 4, air: 0x6aa8ff, tilt: 23.4
  },
  Moon: { map: CDN + "moon_1024.jpg", alt: LOCAL + "moon.jpg", colors: ["#8f8c86", "#5f5d59", "#b4b1aa"], bands: false, radius: 1.1, air: null, tilt: 6.7 },
  Mars: { map: LOCAL + "mars.jpg", colors: ["#b5562c", "#6e2f17", "#d99a6c"], bands: false, radius: 2.2, air: 0xe8a27a, tilt: 25.2 },
  Jupiter: { map: LOCAL + "jupiter.jpg", colors: ["#d4b48a", "#9b6a47", "#efe2c8"], bands: true, radius: 13, air: null, tilt: 3.1 },
  Saturn: { map: LOCAL + "saturn.jpg", ring: LOCAL + "saturn_ring.png", colors: ["#e2cd9e", "#b9995f", "#f3e6c4"], bands: true, radius: 11, air: null, tilt: 26.7 },
  Uranus: { map: LOCAL + "uranus.jpg", colors: ["#a6dbe3", "#86c3cf", "#c6eef3"], bands: true, soft: true, radius: 6.5, air: 0xbdeef5, tilt: 97.8 },
  Neptune: { map: LOCAL + "neptune.jpg", colors: ["#3f63c9", "#2a46a0", "#7896ea"], bands: true, radius: 6.3, air: 0x86a6ff, tilt: 28.3 }
};

// ----- Seamless 3D value noise -----
function hash(x, y, z) {
  let h = x * 374761393 + y * 668265263 + z * 1274126177;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  function L(a, b, t) { return a + (b - a) * t; }
  return L(
    L(L(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), L(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v),
    L(L(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), L(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v),
    w
  );
}
function fbm(x, y, z, octaves) {
  let sum = 0, amp = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise3(x * f, y * f, z * f);
    f *= 2.03; amp *= 0.5;
  }
  return sum;
}
function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

const painted = {};

// A painted map (equirectangular), sampled on the sphere so the left and right edges join without a seam
export function paintedMap(name, width) {
  const key = name + (width || 512);
  if (painted[key]) return painted[key];
  const look = PLANET_LOOKS[name] || PLANET_LOOKS.Moon;
  const W = width || 512, H = W / 2;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext && c.getContext("2d");
  if (!ctx || !ctx.createImageData) return null;
  const img = ctx.createImageData(W, H);
  const base = hex(look.colors[0]), dark = hex(look.colors[1]), light = hex(look.colors[2]);
  const seed = name.length * 7.3;
  for (let y = 0; y < H; y++) {
    const lat = (0.5 - y / H) * Math.PI;
    const cl = Math.cos(lat), sl = Math.sin(lat);
    for (let x = 0; x < W; x++) {
      const lon = (x / W) * Math.PI * 2;
      const px = cl * Math.cos(lon), py = sl, pz = cl * Math.sin(lon);
      let col;
      if (look.earth) {
        const land = fbm(px * 2.2 + seed, py * 2.2, pz * 2.2, 5);
        const ice = Math.abs(sl) > 0.9 ? 1 : 0;
        col = land > 0.55 ? mix(dark, light, Math.min(1, (land - 0.55) * 4)) : mix([12, 40, 92], base, land);
        if (ice) col = [235, 240, 245];
      } else if (look.bands) {
        const turb = fbm(px * 3 + seed, py * 3, pz * 3, 4);
        const band = Math.sin(sl * (look.soft ? 9 : 22) + turb * (look.soft ? 1.2 : 3.4));
        const t = band * 0.5 + 0.5;
        col = t > 0.5 ? mix(base, light, (t - 0.5) * 2 * (look.soft ? 0.5 : 1)) : mix(dark, base, t * 2 + (look.soft ? 0.5 : 0));
      } else {
        const n = fbm(px * 3 + seed, py * 3, pz * 3, 5);
        const crater = Math.pow(fbm(px * 9 + seed, py * 9, pz * 9, 3), 3) * 1.6;
        col = mix(dark, light, Math.max(0, Math.min(1, n * 1.4 - 0.2 - crater * 0.4)));
        if (name === "Mars" && Math.abs(sl) > 0.93) col = [236, 228, 220];
        col = mix(col, base, 0.35);
      }
      const i = (y * W + x) * 4;
      img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  painted[key] = texture;
  return texture;
}

// ----- Loading real maps (each file only once) -----
const loaded = {};
const waiting = {};
function loadMap(url, onLoad, srgb) {
  if (!url || !THREE.TextureLoader) { onLoad(null); return; }
  if (loaded[url] !== undefined) { onLoad(loaded[url]); return; }
  if (waiting[url]) { waiting[url].push(onLoad); return; }
  waiting[url] = [onLoad];
  try {
    new THREE.TextureLoader().load(url, function (texture) {
      if (srgb !== false) texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 16; // three.js limits this to what the graphics card supports
      loaded[url] = texture;
      waiting[url].forEach(function (f) { f(texture); });
      delete waiting[url];
    }, undefined, function () {
      loaded[url] = null;
      waiting[url].forEach(function (f) { f(null); });
      delete waiting[url];
    });
  } catch (error) {
    loaded[url] = null;
    onLoad(null);
  }
}

// A physically based material: painted map first, then the real one when it arrives
export function planetMaterial(name, onReady) {
  const look = PLANET_LOOKS[name] || PLANET_LOOKS.Moon;
  const material = new THREE.MeshStandardMaterial({ map: paintedMap(name, look.earth ? 1024 : 512), roughness: look.bands ? 0.95 : 0.88, metalness: 0 });
  function useMap(texture) {
    if (texture) { material.map = texture; material.needsUpdate = true; if (onReady) onReady(true); }
  }
  loadMap(look.map, function (texture) {
    if (texture) useMap(texture);
    else if (look.alt) loadMap(look.alt, useMap);
  });
  if (look.normal) loadMap(look.normal, function (t) { if (t) { material.normalMap = t; material.normalScale = new THREE.Vector2(0.85, 0.85); material.needsUpdate = true; } }, false);
  if (look.specular) {
    // Oceans are smooth and shiny, land is rough: the specular map tells which is which
    loadMap(look.specular, function (t) {
      if (!t) return;
      material.roughnessMap = t;
      material.roughness = 1;
      material.onBeforeCompile = function (shader) {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <roughnessmap_fragment>",
          "float roughnessFactor = roughness;\n#ifdef USE_ROUGHNESSMAP\n  vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );\n  roughnessFactor = mix(0.95, 0.4, texelRoughness.g);\n#endif"
        );
      };
      material.needsUpdate = true;
    }, false);
  }
  return material;
}

// Earth's cloud layer (real map from the CDN, painted wisps until then)
export function cloudMaterial() {
  const material = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.85, depthWrite: false, roughness: 1, map: paintedClouds() });
  loadMap(PLANET_LOOKS.Earth.clouds, function (t) {
    if (!t) return;
    material.map = t;
    material.alphaMap = t;
    material.needsUpdate = true;
  });
  return material;
}
function paintedClouds() {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 512;
  const ctx = c.getContext && c.getContext("2d");
  if (!ctx || !ctx.createImageData) return null;
  const img = ctx.createImageData(1024, 512);
  for (let y = 0; y < 512; y++) {
    const lat = (0.5 - y / 512) * Math.PI;
    for (let x = 0; x < 1024; x++) {
      const lon = (x / 1024) * Math.PI * 2;
      const n = fbm(Math.cos(lat) * Math.cos(lon) * 4, Math.sin(lat) * 8, Math.cos(lat) * Math.sin(lon) * 4, 5);
      const a = Math.max(0, Math.min(1, (n - 0.52) * 4));
      const i = (y * 1024 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = a * 230;
    }
  }
  ctx.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(c);
}

// Saturn's rings: the real ring photo if present, otherwise painted bands (with the Cassini Division gap)
export function ringMaterial() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 8;
  const ctx = c.getContext && c.getContext("2d");
  if (ctx && ctx.fillRect) {
    for (let x = 0; x < 512; x++) {
      const t = x / 512;
      let a = 0.25 + 0.5 * fbm(t * 40, 0.5, 0.5, 3);
      if (t < 0.12) a *= t / 0.12 * 0.4;       // faint C ring
      if (t > 0.58 && t < 0.64) a *= 0.08;     // Cassini Division
      if (t > 0.92) a *= 0.3;
      const shade = 190 + 50 * fbm(t * 90, 2, 2, 2);
      ctx.fillStyle = "rgba(" + Math.round(shade) + "," + Math.round(shade * 0.9) + "," + Math.round(shade * 0.74) + "," + a.toFixed(3) + ")";
      ctx.fillRect(x, 0, 1, 8);
    }
  }
  const material = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(c), transparent: true, side: THREE.DoubleSide, roughness: 1, depthWrite: false });
  loadMap(PLANET_LOOKS.Saturn.ring, function (t) { if (t) { material.map = t; material.needsUpdate = true; } });
  return material;
}

// Ring geometry whose texture runs from the inner edge to the outer edge
export function ringGeometry(inner, outer) {
  const geometry = new THREE.RingGeometry(inner, outer, 160, 1);
  const position = geometry.attributes && geometry.attributes.position;
  const uv = geometry.attributes && geometry.attributes.uv;
  if (position && uv && uv.setXY && position.count) {
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), y = position.getY(i);
      uv.setXY(i, (Math.sqrt(x * x + y * y) - inner) / (outer - inner), 0.5);
    }
  }
  return geometry;
}

// A whole planet: sphere, clouds and air for Earth, rings for Saturn
export function makePlanet(name, radius, createGlow, onReady) {
  const look = PLANET_LOOKS[name] || PLANET_LOOKS.Moon;
  const group = new THREE.Group();
  const tilt = new THREE.Group();
  tilt.rotation.z = THREE.MathUtils.degToRad(look.tilt || 0);
  group.add(tilt);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(radius, 128, 96), planetMaterial(name, onReady));
  tilt.add(ball);
  group.userData.ball = ball;
  if (look.earth) {
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.012, 128, 96), cloudMaterial());
    tilt.add(clouds);
    group.userData.clouds = clouds;
  }
  if (look.air && createGlow) group.add(createGlow(radius, { color: look.air, strength: look.earth ? 1 : 0.6, size: look.earth ? 1.06 : 1.04 }));
  if (look.ring) {
    const ring = new THREE.Mesh(ringGeometry(radius * 1.24, radius * 2.27), ringMaterial());
    ring.rotation.x = -Math.PI / 2;
    tilt.add(ring);
  }
  return group;
}
