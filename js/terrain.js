// Terrain for the exploration sites: one height function, so the drawing, the physics and the mini map agree.
//   - rolling ground from layered noise (big hills, small bumps, fine roughness)
//   - craters with raised rims (big ones get a central peak), fresh small craters near the landing site
//   - Mars: wind-blown dune ripples, darker basalt patches and rocky outcrops
//   - site landforms (representative, not exact maps):
//       Tranquility Base: a flat, dark mare plain
//       Hadley-Apennine: Hadley Rille, a winding channel to the west; mountains on the horizon
//       Taurus-Littrow: a valley between the North and South Massifs
//       Jezero: the river-delta front to the west
//       Gale: the slopes of Mount Sharp (Aeolis Mons) rising to the south
//   - vertex colors by height and slope, rocks and boulders (boulders block vehicles and walkers)

import * as THREE from "three";

export const TERRAIN_SIZE = 600;

// ----- Deterministic noise -----
function hash(ix, iz, seed) {
  let h = Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

function noise(x, z, seed) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz, seed);
  const b = hash(ix + 1, iz, seed);
  const c = hash(ix, iz + 1, seed);
  const d = hash(ix + 1, iz + 1, seed);
  return (a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz) * 2 - 1; // -1..1
}

function fbm(x, z, octaves, seed) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * freq, z * freq, seed + i * 31);
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum;
}

function smooth(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function seeded(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ----- Per-world and per-site settings -----
const PROFILES = {
  moon: { hills: 3.2, bumps: 0.55, rough: 0.08, craters: 85, smallCraters: 170, depth: 0.22, base: [0.56, 0.55, 0.53] },
  mars: { hills: 2.6, bumps: 0.5, rough: 0.07, craters: 22, smallCraters: 40, depth: 0.13, base: [0.62, 0.33, 0.18] }
};

const SITE_FEATURES = {
  tranquility: { mare: true },
  hadley: { rille: true, horizon: [[260, -380, 140, 120], [-90, 470, 120, 90], [420, 160, 90, 70]] },
  "taurus-littrow": { valley: true, horizon: [[0, -430, 190, 150], [0, 440, 190, 140], [-420, -120, 110, 80]] },
  jezero: { delta: true, horizon: [[-420, -260, 220, 55], [430, 300, 200, 45], [80, 470, 220, 50]] },
  gale: { sharp: true, horizon: [[40, 520, 340, 190], [-460, -200, 200, 50]] }
};

let terrain = { world: "moon", site: "", craters: [], grid: new Map(), profile: PROFILES.moon, features: {}, boulders: [] };
const CELL = 40;

function cellKey(cx, cz) { return cx * 10007 + cz; }

// Build the crater list for a site (call before heightAt)
export function buildTerrainShape(world, siteId, seed) {
  const profile = PROFILES[world] || PROFILES.moon;
  const features = SITE_FEATURES[siteId] || {};
  const rand = seeded(seed || 1234);
  const craters = [];
  const big = features.mare ? Math.round(profile.craters * 0.6) : profile.craters;
  for (let i = 0; i < big; i++) {
    const r = world === "moon" ? 3 + Math.pow(rand(), 2.6) * 30 : 5 + Math.pow(rand(), 2) * 24;
    const x = (rand() - 0.5) * 560;
    const z = (rand() - 0.5) * 560;
    if (Math.hypot(x, z) < r + 24) continue; // keep the landing area clear
    craters.push({ x: x, z: z, r: r, d: r * profile.depth * (0.7 + rand() * 0.5), peak: r > 18 && world === "moon", fresh: rand() < 0.25 });
  }
  // Many small craters, especially near the landing site (what astronauts walked between)
  for (let i = 0; i < profile.smallCraters; i++) {
    const r = 0.8 + Math.pow(rand(), 2) * 3.2;
    const a = rand() * Math.PI * 2;
    const dist = 14 + Math.pow(rand(), 0.8) * 230;
    const x = Math.cos(a) * dist;
    const z = Math.sin(a) * dist;
    craters.push({ x: x, z: z, r: r, d: r * profile.depth * 1.2, peak: false, fresh: rand() < 0.4 });
  }
  const grid = new Map();
  craters.forEach(function (c, index) {
    const reach = c.r * 1.6;
    for (let cx = Math.floor((c.x - reach) / CELL); cx <= Math.floor((c.x + reach) / CELL); cx++) {
      for (let cz = Math.floor((c.z - reach) / CELL); cz <= Math.floor((c.z + reach) / CELL); cz++) {
        const k = cellKey(cx, cz);
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(index);
      }
    }
  });
  terrain = { world: world, site: siteId, craters: craters, grid: grid, profile: profile, features: features, seed: seed || 1234, boulders: [] };
}

export function getTerrain() { return terrain; }

// The ground height at (x, z), in meters
export function heightAt(x, z) {
  if (terrain.world === "orbit") return -1e6;
  const p = terrain.profile;
  const f = terrain.features;
  const seed = terrain.seed;
  const flatten = f.mare ? 0.45 : 1;
  let h = fbm(x / 95, z / 95, 3, seed) * p.hills * 2 * flatten +
    fbm(x / 20, z / 20, 3, seed + 7) * p.bumps * flatten +
    noise(x / 3.2, z / 3.2, seed + 3) * p.rough;

  if (terrain.world === "mars") {
    // Dune ripples: long crests across the wind, only in sandy patches
    const sand = smooth(-0.05, 0.25, fbm(x / 140, z / 140, 2, seed + 11));
    const wave = Math.sin((x * 0.8 + z * 0.6) / 6.5 + fbm(x / 50, z / 50, 2, seed + 13) * 4);
    h += Math.pow(Math.abs(wave), 2.5) * 0.9 * sand;
    // Rocky outcrops (ridged noise)
    const ridge = 1 - Math.abs(fbm(x / 60, z / 60, 3, seed + 17));
    h += Math.pow(Math.max(0, ridge - 0.72), 2) * 28;
  }

  // Craters: bowl, raised rim, and a central peak on big ones
  const list = terrain.grid.get(cellKey(Math.floor(x / CELL), Math.floor(z / CELL)));
  if (list) {
    for (let i = 0; i < list.length; i++) {
      const c = terrain.craters[list[i]];
      const d = Math.hypot(x - c.x, z - c.z) / c.r;
      if (d < 1) {
        h -= c.d * (1 - d * d);
        if (c.peak && d < 0.25) h += c.d * 0.55 * (1 - d / 0.25) * (1 - d / 0.25);
      } else if (d < 1.6) {
        const t = 1 - (d - 1) / 0.6;
        h += c.d * 0.32 * t * t;
      }
    }
  }

  // Site landforms
  if (f.rille) {
    // Hadley Rille: a winding channel about 1 km wide in reality; scaled down here, west of the landing site
    const center = -150 + Math.sin(z / 70) * 28 + Math.sin(z / 23) * 6;
    const dx = Math.abs(x - center);
    h -= 22 * (1 - smooth(10, 34, dx));
  }
  if (f.valley) {
    // Taurus-Littrow: the valley floor is flat; the massifs rise steeply to the north and south
    const az = Math.abs(z);
    h += smooth(150, 290, az) * 70 + smooth(150, 290, az) * fbm(x / 30, z / 30, 3, seed + 21) * 12;
  }
  if (f.delta) {
    // Jezero: layered delta front, stepping up to the west
    const rise = smooth(-120, -230, x + Math.sin(z / 45) * 20);
    h += Math.round(rise * 5) * 2.2 + rise * fbm(x / 25, z / 25, 2, seed + 23) * 1.5;
  }
  if (f.sharp) {
    // Gale: the lower slopes of Mount Sharp, rising toward the south
    h += smooth(60, 300, z) * 30 + smooth(60, 300, z) * fbm(x / 40, z / 40, 3, seed + 29) * 4;
  }

  // A flat, level landing zone around the origin, and a gentle fade to the far plain at the edge of the map
  const flat = smooth(10, 26, Math.hypot(x, z));
  const edge = 1 - smooth(255, 298, Math.max(Math.abs(x), Math.abs(z)));
  return h * flat * edge;
}

export function terrainNormal(x, z) {
  const e = 0.6;
  const n = new THREE.Vector3(heightAt(x - e, z) - heightAt(x + e, z), 2 * e, heightAt(x, z - e) - heightAt(x, z + e));
  return n.normalize();
}

// ----- Drawing -----
function detailTexture(world) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 512;
  const ctx = c.getContext("2d");
  if (!ctx || !ctx.fillRect) return null;
  ctx.fillStyle = "#e6e6e6";
  ctx.fillRect(0, 0, 512, 512);
  // Fine grains and small pebbles (gray, so the vertex colors give the hue)
  for (let i = 0; i < 9000; i++) {
    const v = 150 + Math.random() * 105 | 0;
    ctx.fillStyle = "rgba(" + v + "," + v + "," + v + ",0.45)";
    const s = Math.random() < 0.96 ? 1 + Math.random() * 1.5 : 2 + Math.random() * 4;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, s, s);
  }
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 1 + Math.random() * 3.5;
    ctx.fillStyle = "rgba(90,90,90,0.35)";
    ctx.beginPath && ctx.beginPath();
    if (ctx.arc) { ctx.arc(x + 1, y + 1, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = world === "mars" ? "rgba(255,235,220,0.35)" : "rgba(255,255,255,0.3)";
    if (ctx.arc) { ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, Math.PI * 2); ctx.fill(); }
  }
  const texture = new THREE.CanvasTexture(c);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(70, 70);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (texture.anisotropy !== undefined) texture.anisotropy = 4;
  return texture;
}

// The color of the ground at a point: the base color, varied by noise, slope and craters
function groundColor(x, z, h, slope, out) {
  const p = terrain.profile;
  const seed = terrain.seed;
  let r = p.base[0];
  let g = p.base[1];
  let b = p.base[2];
  const n = fbm(x / 35, z / 35, 3, seed + 41);
  if (terrain.world === "moon") {
    const mare = terrain.features.mare ? 0.82 : 1;
    const v = (1 + n * 0.12) * mare;
    r *= v; g *= v; b *= v;
    // Steep slopes and fresh crater rims are brighter (fresh, less weathered soil)
    const bright = Math.min(0.12, slope * 0.35);
    r += bright; g += bright; b += bright;
  } else {
    // Mars: dark basalt patches, brighter dust on high ground, darker rock on steep slopes
    const basalt = smooth(0.1, 0.35, fbm(x / 70, z / 70, 3, seed + 43));
    r = r * (1 - basalt * 0.35) + n * 0.04;
    g = g * (1 - basalt * 0.3);
    b = b * (1 - basalt * 0.15);
    const dust = Math.max(0, Math.min(1, h / 8)) * 0.08;
    r += dust; g += dust * 0.6;
    const rock = Math.min(0.3, slope * 0.7);
    r -= rock * 0.25; g -= rock * 0.12; b -= rock * 0.05;
  }
  out[0] = Math.max(0, Math.min(1, r));
  out[1] = Math.max(0, Math.min(1, g));
  out[2] = Math.max(0, Math.min(1, b));
}

// Adds the ground, horizon, rocks and boulders to `group`. Returns the boulders (for collisions and the mini map).
export function buildGround(group, world, keepClear) {
  const size = TERRAIN_SIZE;
  const segments = 220;
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) position.setY(i, heightAt(position.getX(i), position.getZ(i)));
  geometry.computeVertexNormals();
  const normals = geometry.attributes.normal;
  const colors = new Float32Array(position.count * 3);
  const rgb = [0, 0, 0];
  for (let i = 0; i < position.count; i++) {
    const ny = normals ? normals.getY(i) : 1;
    groundColor(position.getX(i), position.getZ(i), position.getY(i), 1 - ny, rgb);
    colors[i * 3] = rgb[0]; colors[i * 3 + 1] = rgb[1]; colors[i * 3 + 2] = rgb[2];
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, map: detailTexture(world), roughness: 1, metalness: 0 });
  const ground = new THREE.Mesh(geometry, material);
  ground.receiveShadow = true;
  ground.name = "ground";
  group.add(ground);

  // Far terrain all the way to the horizon: rolling hills and crater rims with the same colors and texture,
  // so the detailed area blends in and its square edge is never visible (it sits just under the detailed ground)
  group.add(farTerrain(world, material.map));

  // Mountains on the horizon (site landforms)
  const base = terrain.profile.base;
  (terrain.features.horizon || []).forEach(function (m, i) { group.add(horizonMountain(m, new THREE.Color(base[0] * 0.97, base[1] * 0.97, base[2] * 0.97), i)); });

  // Rocks: lots of small ones (no collision) and fewer boulders (they block you)
  const rand = seeded(world === "mars" ? 77 : 33);
  const rockMat = new THREE.MeshStandardMaterial({ color: world === "mars" ? 0x6e3a20 : 0x77756f, roughness: 1, flatShading: true });
  const small = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.5, 0), rockMat, 900);
  const matrix = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const pos = new THREE.Vector3();
  for (let i = 0; i < 900; i++) {
    const x = (rand() - 0.5) * 440;
    const z = (rand() - 0.5) * 440;
    const s = 0.06 + Math.pow(rand(), 3) * 0.45;
    q.setFromEuler(new THREE.Euler(rand() * 3, rand() * 3, rand() * 3));
    scale.set(s, s * 0.6, s * (0.7 + rand() * 0.6));
    pos.set(x, heightAt(x, z) + s * 0.12, z);
    matrix.compose(pos, q, scale);
    small.setMatrixAt(i, matrix);
  }
  small.castShadow = true;
  small.receiveShadow = true;
  group.add(small);

  const boulders = [];
  const tries = world === "mars" ? 160 : 220;
  for (let i = 0; i < tries && boulders.length < 95; i++) {
    let x;
    let z;
    // Most boulders sit on crater rims (thrown out by the impact)
    if (rand() < 0.65 && terrain.craters.length) {
      const c = terrain.craters[Math.floor(rand() * Math.min(terrain.craters.length, 85))];
      const a = rand() * Math.PI * 2;
      const d = c.r * (0.95 + rand() * 0.7);
      x = c.x + Math.cos(a) * d;
      z = c.z + Math.sin(a) * d;
    } else {
      x = (rand() - 0.5) * 460;
      z = (rand() - 0.5) * 460;
    }
    const r = 0.55 + Math.pow(rand(), 2) * 1.6;
    if (Math.hypot(x, z) < 30 || Math.abs(x) > 280 || Math.abs(z) > 280) continue;
    if (keepClear && keepClear.some(function (p) { return Math.hypot(p.x - x, p.z - z) < 6 + r; })) continue;
    boulders.push({ x: x, z: z, r: r, ry: rand() * 6, tilt: rand() });
  }
  const boulderMesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 1), rockMat, Math.max(1, boulders.length));
  boulders.forEach(function (b, i) {
    q.setFromEuler(new THREE.Euler(b.tilt * 0.6, b.ry, b.tilt * 0.4));
    scale.set(b.r, b.r * 0.72, b.r * 0.9);
    pos.set(b.x, heightAt(b.x, b.z) + b.r * 0.25, b.z);
    matrix.compose(pos, q, scale);
    boulderMesh.setMatrixAt(i, matrix);
  });
  boulderMesh.count = boulders.length;
  boulderMesh.castShadow = true;
  boulderMesh.receiveShadow = true;
  group.add(boulderMesh);
  terrain.boulders = boulders;
  return boulders;
}

function farTerrain(world, map) {
  const size = 6000;
  const segments = 140;
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const rgb = [0, 0, 0];
  const seed = terrain.seed;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const edge = Math.max(Math.abs(x), Math.abs(z));
    const out = smooth(250, 900, edge);
    let h = fbm(x / 420, z / 420, 4, seed + 51) * 70 * out + fbm(x / 90, z / 90, 3, seed + 53) * 6 * out;
    if (world === "mars") h += Math.pow(Math.max(0, 1 - Math.abs(fbm(x / 600, z / 600, 3, seed + 55)) - 0.6), 2) * 300 * out; // mesas and ridges
    h = h - 2.5 * (1 - out);                       // under the detailed ground near the middle
    if (position.setY) position.setY(i, h);
    groundColor(x, z, Math.max(0, h), out * 0.15, rgb);
    colors[i * 3] = rgb[0] * 0.96; colors[i * 3 + 1] = rgb[1] * 0.96; colors[i * 3 + 2] = rgb[2] * 0.96;
  }
  geometry.computeVertexNormals();
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  let farMap = null;
  if (map && map.clone) {
    farMap = map.clone();
    farMap.wrapS = farMap.wrapT = THREE.RepeatWrapping;
    if (farMap.repeat) farMap.repeat.set(500, 500);
    farMap.needsUpdate = true;
  }
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, map: farMap, roughness: 1 }));
  mesh.receiveShadow = true;
  mesh.name = "far-terrain";
  return mesh;
}

function horizonMountain(m, color, index) {
  const geometry = new THREE.ConeGeometry(m[2], m[3], 48, 10, true);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const k = 1 + fbm(x / 40 + index * 9, z / 40, 3, 91) * 0.35 + fbm(y / 25, x / 25, 2, 97) * 0.1;
    position.setX(i, x * k);
    position.setZ(i, z * k);
    position.setY(i, y * (1 + fbm(x / 60, z / 60, 2, 93 + index) * 0.25));
  }
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: color, roughness: 1 }));
  mesh.position.set(m[0], m[3] / 2 - 4, m[1]);
  mesh.scale.set(1, 1, 0.8);
  mesh.rotation.y = index * 1.3;
  return mesh;
}

// Push a circle of radius `radius` out of every boulder. Returns the boulder it hit (or null).
export function collideBoulders(position, radius) {
  let hit = null;
  const list = terrain.boulders;
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    const dx = position.x - b.x;
    const dz = position.z - b.z;
    const min = b.r * 0.85 + radius;
    const d2 = dx * dx + dz * dz;
    if (d2 < min * min) {
      const d = Math.sqrt(d2);
      if (d < 0.001) { position.x = b.x + min; position.z = b.z; }
      else {
        position.x = b.x + (dx / d) * min;
        position.z = b.z + (dz / d) * min;
      }
      hit = b;
    }
  }
  return hit;
}

// Is there a boulder in front of (x, z) going in direction (dx, dz) within `range`? Returns the side to steer away.
export function boulderAhead(x, z, dx, dz, range, width) {
  let steer = 0;
  terrain.boulders.forEach(function (b) {
    const rx = b.x - x;
    const rz = b.z - z;
    const along = rx * dx + rz * dz;
    if (along < 0 || along > range) return;
    const side = rx * dz - rz * dx; // > 0: boulder on the left
    if (Math.abs(side) < b.r + width) steer += (side > 0 ? -1 : 1) * (1 - along / range);
  });
  return steer;
}

// The mini map background: shaded relief of the area, drawn once per site
export function drawRelief(canvas, range) {
  const ctx = canvas.getContext ? canvas.getContext("2d") : null;
  if (!ctx || !ctx.createImageData) return;
  const w = canvas.width;
  const h = canvas.height;
  const image = ctx.createImageData(w, h);
  const rgb = [0, 0, 0];
  const step = (range * 2) / w;
  // Heights first (one sample per pixel), then light them from the north-west like a relief map
  const heights = new Float32Array(w * h);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) heights[py * w + px] = heightAt(-range + px * step, -range + py * step);
  }
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = py * w + px;
      const hc = heights[i];
      const hx = px + 1 < w ? heights[i + 1] : hc;
      const hz = py + 1 < h ? heights[i + w] : hc;
      const shade = Math.max(0.35, Math.min(1.25, 0.85 + ((hc - hx) * 0.9 + (hc - hz) * 0.6) / step * 0.9));
      groundColor(-range + px * step, -range + py * step, hc, 0, rgb);
      image.data[i * 4] = Math.min(255, rgb[0] * 255 * shade);
      image.data[i * 4 + 1] = Math.min(255, rgb[1] * 255 * shade);
      image.data[i * 4 + 2] = Math.min(255, rgb[2] * 255 * shade);
      image.data[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
}
