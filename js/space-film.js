// The space part of a mission replay, filmed like a documentary: one "shot" at a time.
//   orbit     the spacecraft circles Earth (and can fire its engine to leave)
//   depart    the departure burn: the spacecraft speeds away and Earth falls behind
//   cruise    the long quiet coast, with small course corrections
//   flyby     a planet swings past; the path bends around it (never through it)
//   arrive    the spacecraft turns around, fires its engine to slow down, and drops into orbit
//   orbitAt   circling a world (and releasing a probe, if there is one)
//   deploy    a telescope or station unfolds
//   descend   the start of a landing: undocking, cruise-stage separation, the first glow of entry
//   surface   on the ground, on the same realistic terrain used for exploring (js/terrain.js)
//   sample    touching an asteroid to collect a sample
//   sun       a close pass by the Sun, heat shield first
//   ret       the trip home: departure burn, Earth growing ahead, capsule separation, the edge of the atmosphere
//   finale    the final view
// Every motion follows smooth curves; cameras glide; paths are checked so nothing passes through a planet.
// Sizes, distances and timing are illustrative (compressed), not to scale.

import * as THREE from "three";
import { createModel } from "./models.js";
import { createSuitedAstronaut } from "./astronaut.js";
import { createParticleSystem } from "./particles.js";
import { buildTerrainShape, buildGround, heightAt } from "./terrain.js";
import { play, setLoop } from "./sounds.js";
import { getPlaybackSpeed } from "./playback.js";
import { PLANET_LOOKS, planetMaterial as lookMaterial, cloudMaterial, cityLights, ringMaterial as lookRingMaterial, ringGeometry, smallWorldMap, addSurfaceDetail } from "./planet-look.js";
import { createGlow } from "./glow.js";

const canvas = document.getElementById("film-canvas");

let renderer = null;
let scene = null;
let camera = null;
let particles = null;
let sunLight = null;
let ambient = null;
let stars = null;
let sunSprite = null;
let shotGroup = null;
let shot = null;
let running = false;
let paused = false;
let rafId = null;
let lastTime = 0;
let elapsed = 0;
let doneCallback = null;
let finished = false;
const camLook = new THREE.Vector3();
// Sunlight comes from the side where the spacecraft flies in most shots, so the planet below it is in
// daylight. (Before, the craft started over Earth's night side, and Earth looked like a black ball.)
const SUN_DIR = new THREE.Vector3(0.6, 0.3, 0.74).normalize();

// ----- Helpers -----
function V(x, y, z) { return new THREE.Vector3(x, y, z); }
function smooth(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function ease(u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }
function random(a, b) { return a + Math.random() * (b - a); }
function lerpV(a, b, t) { return a.clone().lerp(b, t); }

// ----- Setup -----
function glowTexture(inner, outer) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  if (ctx && ctx.createRadialGradient) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, inner);
    g.addColorStop(0.25, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}

function init() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5)); // sharp: the screen's real pixel density
  if (renderer.shadowMap) renderer.shadowMap.enabled = true;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 60000);
  sunLight = new THREE.DirectionalLight(0xffffff, 3);
  sunLight.position.copy(SUN_DIR).multiplyScalar(1000);
  scene.add(sunLight);
  if (sunLight.target) scene.add(sunLight.target);
  ambient = new THREE.AmbientLight(0xffffff, 0.06);
  scene.add(ambient);
  // Stars
  const positions = new Float32Array(4000 * 3);
  for (let i = 0; i < 4000; i++) {
    const v = V(random(-1, 1), random(-1, 1), random(-1, 1)).normalize().multiplyScalar(30000);
    positions[i * 3] = v.x; positions[i * 3 + 1] = v.y; positions[i * 3 + 2] = v.z;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0.85, depthWrite: false }));
  scene.add(stars);
  sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(255,250,235,1)", "rgba(255,200,120,0)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sunSprite.scale.set(1500, 1500, 1);
  scene.add(sunSprite);
  shotGroup = new THREE.Group();
  scene.add(shotGroup);
  particles = createParticleSystem(scene, 700);
  resize();
}

function resize() {
  if (!renderer) return;
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);

// ----- Worlds -----
const TEXTURES = {
  earth: "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/earth_atmos_2048.jpg",
  moon: "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/moon_1024.jpg",
  mars: "assets/textures/mars.jpg", venus: "assets/textures/venus.jpg", mercury: "assets/textures/mercury.jpg",
  jupiter: "assets/textures/jupiter.jpg", saturn: "assets/textures/saturn.jpg", uranus: "assets/textures/uranus.jpg",
  neptune: "assets/textures/neptune.jpg", sun: "assets/textures/sun.jpg"
};
const LOOKS = {
  earth: ["#2d5fa8", "#3f7a4a", 0, "#9fd0ff"], moon: ["#8c8a85", "#6d6b67", 0, null], mars: ["#b8582e", "#7a3518", 0, "#e0a070"],
  venus: ["#e2c27c", "#b8934a", 1, "#f6d9a0"], mercury: ["#8f8984", "#5f5a55", 0, null], jupiter: ["#d9b88a", "#a7704a", 1, null],
  saturn: ["#e7d3a5", "#bfa16a", 1, null], uranus: ["#a8dde6", "#8cc8d4", 1, "#c9f0f6"], neptune: ["#4a6fd8", "#2f4fb0", 1, "#7f9ff0"],
  titan: ["#d79a3c", "#a8722a", 1, "#f2b860"], pluto: ["#d9c3a6", "#8f7458", 0, null], sun: ["#ffd36e", "#ff8a1f", 0, null],
  bennu: ["#4a4642", "#2c2a28", 0, null], comet: ["#5c5852", "#38352f", 0, null], arrokoth: ["#a2614a", "#6e3e2e", 0, null]
};
const texCache = {};

function proceduralTexture(name) {
  const look = LOOKS[name] || LOOKS.moon;
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const ctx = c.getContext("2d");
  if (!ctx || !ctx.fillRect) return null;
  ctx.fillStyle = look[0];
  ctx.fillRect(0, 0, 512, 256);
  if (look[2]) {
    for (let y = 0; y < 256; y += 4) {
      ctx.fillStyle = Math.sin(y * 0.11) > 0.2 ? look[1] : look[0];
      ctx.globalAlpha = 0.35 + 0.3 * Math.abs(Math.sin(y * 0.37));
      ctx.fillRect(0, y, 512, 4);
    }
    ctx.globalAlpha = 1;
  } else {
    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? look[1] : "rgba(255,255,255,0.08)";
      ctx.globalAlpha = 0.25;
      const r = random(1, name === "earth" ? 26 : 10);
      if (ctx.beginPath) { ctx.beginPath(); ctx.arc(random(0, 512), random(0, 256), r, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// The same planet look as the Solar System (js/planet-look.js): real photo maps, Earth's ocean shine
// and relief, and for rocky worlds fine close-up detail so they stay sharp in low orbit.
const SHARED_LOOK = { earth: "Earth", moon: "Moon", mars: "Mars", venus: "Venus", mercury: "Mercury", jupiter: "Jupiter",
  saturn: "Saturn", uranus: "Uranus", neptune: "Neptune" };
const ROCKY = { moon: true, mars: true, mercury: true };
function planetMaterial(name, radius) {
  const shared = SHARED_LOOK[name];
  if (shared && PLANET_LOOKS[shared]) {
    const r = radius || R;
    return lookMaterial(shared, null, {
      hd: name === "earth",
      detail: ROCKY[name] ? { repeat: Math.round(48 * Math.max(0.5, Math.min(2, r / 60))), near: r * 0.25, far: r * 2.2, strength: 0.4, bump: 0.9 } : false
    });
  }
  // small worlds without a photo map: a painted map that follows the real world's look, plus close-up relief
  const small = { titan: true, pluto: true, bennu: true, comet: true, arrokoth: true };
  if (small[name]) {
    const r = radius || R;
    const painted = new THREE.MeshStandardMaterial({ map: smallWorldMap(name) || proceduralTexture(name), roughness: name === "titan" ? 1 : 0.95, metalness: 0 });
    if (name !== "titan") addSurfaceDetail(painted, { repeat: name === "pluto" ? 40 : 24, near: r * 0.25, far: r * 2.2, strength: 0.45, bump: name === "pluto" ? 0.8 : 1.4 });
    return painted;
  }
  const material = new THREE.MeshStandardMaterial({ map: texCache[name] || proceduralTexture(name), roughness: 0.9, metalness: 0 });
  if (name === "sun") {
    material.emissive = new THREE.Color(0xffa040);
    material.emissiveIntensity = 1.2;
    if (material.emissiveMap !== undefined) material.emissiveMap = material.map;
  }
  if (!texCache[name] && TEXTURES[name] && THREE.TextureLoader) {
    try {
      new THREE.TextureLoader().load(TEXTURES[name], function (texture) {
        texture.colorSpace = THREE.SRGBColorSpace;
        texCache[name] = texture;
        material.map = texture;
        if (name === "sun" && material.emissiveMap !== undefined) material.emissiveMap = texture;
        material.needsUpdate = true;
      }, undefined, function () { /* keep the painted texture */ });
    } catch (error) { /* keep the painted texture */ }
  }
  return material;
}

// A world: sphere, clouds and a glowing rim of air if it has one, rings for Saturn
function makeWorld(name, radius) {
  const g = new THREE.Group();
  const lumpy = name === "bennu" || name === "comet" || name === "arrokoth";
  const geometry = lumpy ? new THREE.IcosahedronGeometry(radius, 3) : new THREE.SphereGeometry(radius, 96, 64);
  if (lumpy && geometry.attributes && geometry.attributes.position && geometry.attributes.position.setXYZ) {
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = V(p.getX(i), p.getY(i), p.getZ(i));
      const k = 1 + Math.sin(v.x * 0.21) * 0.08 + Math.cos(v.y * 0.17 + v.z * 0.13) * 0.1;
      p.setXYZ(i, v.x * k, v.y * k * (name === "arrokoth" ? 0.7 : 0.92), v.z * k);
    }
    geometry.computeVertexNormals();
  }
  const ball = new THREE.Mesh(geometry, planetMaterial(name, radius));
  ball.receiveShadow = true;
  g.add(ball);
  g.userData.ball = ball;
  const look = LOOKS[name];
  const shared = PLANET_LOOKS[SHARED_LOOK[name]];
  if (name === "earth") {
    // the real cloud map (not painted ovals), city lights on the night side
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.008, 128, 96), cloudMaterial());
    g.add(clouds);
    g.userData.clouds = clouds;
    const lights = cityLights(radius, SUN_DIR);
    g.add(lights);
    g.userData.lights = lights;
  }
  if (shared && shared.air) {
    g.add(createGlow(radius, { color: shared.air, strength: name === "earth" ? 1 : 0.6, size: name === "earth" ? 1.05 : 1.035 }));
  } else if (look && look[3]) {
    g.add(rimGlow(radius * 1.025, look[3], 0.8));
  }
  if (name === "saturn") {
    const ring = new THREE.Mesh(ringGeometry(radius * 1.24, radius * 2.27), lookRingMaterial());
    ring.rotation.x = -Math.PI / 2;
    g.add(ring);
  }
  if (name === "comet") {
    const coma = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(200,230,255,0.6)", "rgba(200,230,255,0)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    coma.scale.set(radius * 8, radius * 8, 1);
    g.add(coma);
  }
  if (name === "sun") {
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(255,220,150,0.9)", "rgba(255,140,40,0)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.set(radius * 5, radius * 5, 1);
    g.add(glow);
  }
  shotGroup.add(g);
  g.userData.radius = radius;
  worldsInShot.push(g);
  return g;
}
const worldsInShot = [];
const craftsInShot = [];

function cloudTexture() {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 512;
  const ctx = c.getContext("2d");
  if (!ctx || !ctx.clearRect) return null;
  ctx.clearRect(0, 0, 1024, 512);
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = "rgba(255,255,255," + random(0.08, 0.3) + ")";
    if (ctx.ellipse) { ctx.beginPath(); ctx.ellipse(random(0, 1024), random(30, 482), random(20, 90), random(5, 20), random(-0.4, 0.4), 0, Math.PI * 2); ctx.fill(); }
  }
  return new THREE.CanvasTexture(c);
}

// A soft glowing edge of atmosphere (brighter toward the limb)
function rimGlow(radius, color, strength) {
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uStrength: { value: strength } },
    vertexShader: "varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }",
    fragmentShader: "uniform vec3 uColor; uniform float uStrength; varying vec3 vN; varying vec3 vV; void main(){ float i = pow(clamp(1.0 - abs(dot(vN, vV)), 0.0, 1.0), 2.5) * uStrength; gl_FragColor = vec4(uColor * i, i); }"
  });
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 64), material);
}

// ----- Spacecraft -----
function makeCraft(name, size) {
  const model = createModel(name);
  const holder = new THREE.Group();
  const box = new THREE.Box3().setFromObject(model);
  const s = V(0, 0, 0);
  box.getSize(s);
  const biggest = Math.max(s.x, s.y, s.z) || 1;
  model.scale.multiplyScalar(size / biggest);
  if (model.userData.chutes) model.userData.chutes.visible = false;
  holder.add(model);
  holder.userData.model = model;
  holder.userData.size = size;
  model.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  shotGroup.add(holder);
  craftsInShot.push(holder);
  return holder;
}

// Point the craft's nose (+Z) along a direction, smoothly
const aimer = new THREE.Object3D();
function aim(object, direction, rate, dt) {
  aimer.position.copy(object.position);
  aimer.lookAt(object.position.clone().add(direction));
  if (object.quaternion.slerp && rate < 1) object.quaternion.slerp(aimer.quaternion, Math.min(1, rate * dt));
  else object.quaternion.copy(aimer.quaternion);
}

// Engine fire behind the craft (along -Z of the craft)
function engineFire(craft, strength, color) {
  if (strength <= 0.02) return;
  const back = V(0, 0, -1).applyQuaternion(craft.quaternion);
  const size = craft.userData.size || 2;
  const at = craft.position.clone().addScaledVector(back, size * 0.55);
  for (let i = 0; i < 2; i++) {
    const velocity = back.clone().multiplyScalar(random(8, 14) * size).add(V(random(-1, 1), random(-1, 1), random(-1, 1)).multiplyScalar(size * 0.6));
    particles.emit(true, at, velocity, size * 0.35 * strength, size * 1.4 * strength, random(0.15, 0.3), 0.85, color || 0xbfd6ff, 0);
  }
  setLoop("engine", 0.25 * strength);
}

// A short puff of the small steering thrusters
function thrusterPuff(craft) {
  const size = craft.userData.size || 2;
  for (let i = 0; i < 6; i++) {
    const dir = V(random(-1, 1), random(-1, 1), random(-1, 1)).normalize();
    particles.emit(false, craft.position.clone().addScaledVector(dir, size * 0.45), dir.multiplyScalar(size * 1.5), size * 0.05, size * 0.4, 0.6, 0.5, 0xffffff, 1);
  }
  play("tick");
}

function glowAround(craft, strength, heading) {
  if (strength <= 0.02) return;
  const size = craft.userData.size || 2;
  const front = craft.position.clone().addScaledVector(heading, size * 0.45);
  for (let i = 0; i < 3; i++) {
    const velocity = heading.clone().multiplyScalar(-random(6, 12) * size).add(V(random(-1, 1), random(-1, 1), random(-1, 1)).multiplyScalar(size));
    particles.emit(true, front, velocity, size * 0.6 * strength, size * 1.8 * strength, random(0.2, 0.4), 0.8, 0xff8a3a, 0);
  }
  setLoop("wind", 0.4 * strength);
}

// The chase camera: glides to a goal and looks at a point; never goes inside a world
function glide(goal, look, dt, rate, world, radius) {
  if (world && radius) {
    const off = goal.clone().sub(world.position);
    const min = radius * 1.08;
    if (off.length() < min) goal.copy(world.position).add(off.normalize().multiplyScalar(min));
  }
  const k = 1 - Math.exp(-(rate || 2.5) * dt);
  camera.position.lerp(goal, k);
  if (world && radius) {
    const off = camera.position.clone().sub(world.position);
    if (off.length() < radius * 1.06) camera.position.copy(world.position).add(off.normalize().multiplyScalar(radius * 1.06));
  }
  camLook.lerp(look, Math.min(1, k * 1.6));
  camera.lookAt(camLook);
}

// A camera that rides with a fast-moving spacecraft: only its offset from the craft is smoothed, so it
// never falls behind. (glide() smooths the camera's absolute position, which lagged tens of meters
// behind a fast craft and left it out of the picture.)
function ride(state, target, goal, look, dt, rate, world, radius) {
  const offset = goal.clone().sub(target);
  const lookOffset = look.clone().sub(target);
  if (!state.offset) { state.offset = offset.clone(); state.lookOffset = lookOffset.clone(); }
  const k = 1 - Math.exp(-(rate || 3) * dt);
  state.offset.lerp(offset, k);
  state.lookOffset.lerp(lookOffset, Math.min(1, k * 1.6));
  camera.position.copy(target).add(state.offset);
  if (world && radius) {
    const off = camera.position.clone().sub(world.position);
    if (off.length() < radius * 1.06) camera.position.copy(world.position).add(off.normalize().multiplyScalar(radius * 1.06));
  }
  camLook.copy(target).add(state.lookOffset);
  camera.lookAt(camLook);
}

function snapCamera(goal, look) {
  camera.position.copy(goal);
  camLook.copy(look);
  camera.lookAt(camLook);
}

// Keep a path outside a world (pushes points out to at least `clear` from the center)
function keepOut(points, center, clear) {
  points.forEach(function (p) {
    const off = p.clone().sub(center);
    if (off.length() < clear) p.copy(center).add(off.normalize().multiplyScalar(clear));
  });
  return points;
}

// ----- Shots -----
const R = 60; // radius of the main world in a shot

// Parking orbit, then the departure burn. It opens on the whole Earth (where the launch scene ended,
// so the two scenes join up), glides in behind the spacecraft, and keeps it in view the whole time,
// with enough of Earth below to see the globe curve away (not a blurred close-up of the ground).
function orbitShot(o) {
  const earth = makeWorld(o.world || "earth", R);
  const craft = makeCraft(o.craft, 2.2);
  const r = R * 1.12;
  const burn = Boolean(o.burn);
  const far = V(-0.35, 0.78, 0.92).normalize().multiplyScalar(R * 2.6); // where the launch scene ended
  return {
    duration: o.duration || 14,
    start: function () { setSun(V(0.66, 0.62, 0.42)); snapCamera(far, V(0, 0, 0)); }, // daylight on both the opening view and the orbit
    update: function (t, u, dt) {
      const extra = burn ? smooth(0.55, 1, u) : 0;
      const a = -0.3 + 0.32 * u + extra * extra * 0.5;
      const radius = r + extra * extra * 14;
      craft.position.set(Math.cos(a) * radius, Math.sin(a * 0.7) * 3, Math.sin(a) * radius);
      const dir = V(-Math.sin(a), 0.02 + extra * 0.08, Math.cos(a)).normalize();
      aim(craft, dir, 3, dt);
      if (o.roll) craft.userData.model.rotation.z += dt * 0.12;
      if (burn && u > 0.55 && u < 0.97) engineFire(craft, 1);
      if (!burn && Math.abs(u - 0.5) < 0.01) thrusterPuff(craft);
      const outward = craft.position.clone().normalize();
      // chase position: behind the craft and well above it, so Earth's curve and the craft both show
      const chase = craft.position.clone().addScaledVector(dir, -12 - extra * 6).addScaledVector(outward, 7 + extra * 4);
      const look = craft.position.clone().addScaledVector(dir, 6).addScaledVector(outward, -1.5);
      // the first three seconds fly in from the whole-Earth view
      const arrive = ease(smooth(0, 0.36, u)); // about five seconds: no rushed zoom
      // "up" on screen turns to point away from Earth: Earth below, its horizon ahead, space above
      camera.up.copy(V(0, 1, 0).lerp(outward, arrive)).normalize();
      glide(lerpV(far, chase, arrive), lerpV(V(0, 0, 0), look, arrive), dt, 3, earth, R);
      if (earth.userData.clouds) earth.userData.clouds.rotation.y += dt * 0.004;
      earth.rotation.y += dt * 0.006;
    }
  };
}

// Leaving Earth: the departure burn, seen from just ahead of the spacecraft looking back at it, with
// Earth behind it getting smaller. The craft stays in the picture the whole time.
function departShot(o) {
  const earth = makeWorld(o.world || "earth", R);
  const craft = makeCraft(o.craft, 2.2);
  const curve = new THREE.CatmullRomCurve3(keepOut([V(R * 1.2, 4, R * 0.25), V(R * 1.6, 9, R * 1.1), V(R * 3, 16, R * 3), V(R * 8, 30, R * 7.5)], V(0, 0, 0), R * 1.12));
  const follow = {};
  return {
    duration: o.duration || 13,
    start: function () {
      setSun(V(0.81, 0.35, 0.46)); // looking back, Earth is almost full
      const p = curve.getPoint(0);
      const d = curve.getTangent(0).normalize();
      craft.position.copy(p);
      snapCamera(p.clone().addScaledVector(d, -10).add(V(0, 4, 0)), p.clone().addScaledVector(d, 4));
    },
    update: function (t, u, dt) {
      const s = ease(u) * 0.92 + u * 0.08;
      craft.position.copy(curve.getPoint(s));
      const dir = curve.getTangent(Math.min(0.999, s + 0.001)).normalize();
      aim(craft, dir, 3, dt);
      if (u < 0.6) engineFire(craft, 1);   // the departure burn (trans-lunar injection for the Moon)
      const side = dir.clone().cross(V(0, 1, 0)).normalize();
      // behind the craft at first (the burn), then swinging round ahead of it to look back at Earth
      const turn = ease(smooth(0.25, 0.65, u));
      const behind = craft.position.clone().addScaledVector(dir, -10).addScaledVector(side, 3).add(V(0, 3.5, 0));
      const ahead = craft.position.clone().addScaledVector(dir, 9 + u * 6).addScaledVector(side, 6).add(V(0, 3, 0));
      const lookAhead = craft.position.clone().addScaledVector(dir, 4);
      const lookBack = craft.position.clone().lerp(earth.position, 0.06); // the craft in front, Earth behind it
      // swing round on a wide arc (out to the side), not past the craft at close range
      const swingPos = lerpV(behind, ahead, turn).addScaledVector(side, Math.sin(Math.PI * turn) * 9);
      ride(follow, craft.position, swingPos, lerpV(lookAhead, lookBack, turn), dt, 4, earth, R);
    }
  };
}

function cruiseShot(o) {
  const craft = makeCraft(o.craft, 2.2);
  craft.position.set(0, 0, 0);
  let target = null;
  if (o.world) {
    target = makeWorld(o.world, R);
    target.position.set(0, -200, 9000);
  }
  let rocks = null;
  if (o.belt) {
    rocks = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: 0x77706a, roughness: 1, flatShading: true });
    for (let i = 0; i < 60; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(random(0.3, 2.5), 0), material);
      rock.position.set(random(-120, 120), random(-40, 40), random(-200, 400));
      if (rock.position.length() < 15) rock.position.x += 40;
      rocks.add(rock);
    }
    shotGroup.add(rocks);
  }
  let puffed = false;
  return {
    duration: o.duration || 13,
    start: function () { snapCamera(V(7, 2.5, -6), V(0, 0, 0)); },
    update: function (t, u, dt) {
      aim(craft, V(0, 0, 1), 1, dt);
      if (o.roll) craft.userData.model.rotation.z += dt * 0.15; // slow "barbecue" roll spreads the Sun's heat
      if (!puffed && u > 0.55) { puffed = true; thrusterPuff(craft); }
      if (target) target.position.z = 9000 - 3500 * ease(u);
      if (rocks) rocks.position.z -= dt * 18;
      const a = 0.9 + t * 0.12;
      glide(V(Math.sin(a) * 8, 2.5 + Math.sin(t * 0.2), Math.cos(a) * -8), V(0, 0, 0), dt, 1.5);
    }
  };
}

function flybyShot(o) {
  const ringed = o.world === "saturn";
  const world = makeWorld(o.world, R);
  world.rotation.z = ringed ? 0.35 : 0;
  const craft = makeCraft(o.craft, 2.2);
  const h = ringed ? R * 1.2 : 0;
  const pts = keepOut([V(-R * 10, h + 30, R * 4), V(-R * 3, h + 10, R * 2), V(0, h, R * 1.6), V(R * 3, h - 10, R * 2.4), V(R * 9, h - 40, R * 7)], V(0, 0, 0), R * 1.45);
  const curve = new THREE.CatmullRomCurve3(pts);
  return {
    duration: o.duration || 15,
    start: function () {
      const p = curve.getPoint(0);
      snapCamera(p.clone().add(V(-8, 3, -6)), p);
    },
    update: function (t, u, dt) {
      const s = 0.04 + 0.92 * ease(u);
      craft.position.copy(curve.getPoint(s));
      const dir = curve.getTangent(s).normalize();
      aim(craft, dir, 2, dt);
      const outward = craft.position.clone().normalize();
      const goal = craft.position.clone().addScaledVector(dir, -10).addScaledVector(outward, 5).add(V(0, 2, 0));
      const look = craft.position.clone().lerp(world.position, 0.18);
      glide(goal, look, dt, 2, world, R * (ringed ? 2.4 : 1));
      world.rotation.y += dt * 0.02;
    }
  };
}

// Points the sunlight (and the Sun's glow, and Earth's city-light shell) along a direction
function setSun(dir) {
  const d = dir.clone().normalize();
  sunLight.position.copy(d).multiplyScalar(1000);
  sunSprite.position.copy(d).multiplyScalar(20000);
  worldsInShot.forEach(function (w) { if (w.userData.lights) w.userData.lights.userData.setSun(d); });
}

// Arriving: like the trip home, the world grows ahead while the spacecraft coasts toward it; then
// the craft turns around and fires its engine against its direction of travel (the braking burn) and
// swings around the world into orbit. The camera follows closely, so the craft never leaves the picture.
function arriveShot(o) {
  const ringed = o.world === "saturn";
  const world = makeWorld(o.world, o.radius || R);
  const radius = o.radius || R;
  const craft = makeCraft(o.craft, 2.2);
  const r = radius * (o.far ? 2.6 : ringed ? 2.6 : 1.35);
  const h = ringed ? radius * 0.6 : 0;
  const phiQ = -0.9;
  const Q = V(r * Math.sin(phiQ), h, r * Math.cos(phiQ));
  const tan = V(Math.cos(phiQ), 0, -Math.sin(phiQ)).normalize();
  const lineLength = radius * 7;
  const arcLength = r * 2.2; // well around the world, not just touching it
  const follow = {};
  function at(sDist) {
    if (sDist < lineLength) return { p: Q.clone().addScaledVector(tan, -(lineLength - sDist)), d: tan.clone() };
    const phi = phiQ + (sDist - lineLength) / r;
    return { p: V(r * Math.sin(phi), h, r * Math.cos(phi)), d: V(Math.cos(phi), 0, -Math.sin(phi)) };
  }
  return {
    duration: o.duration || 18,
    start: function () {
      const p = at(0).p;
      setSun(V(-0.18, 0.7, 0.69)); // daylight over the arrival point, low enough to cast crater shadows
      craft.position.copy(p);
      snapCamera(p.clone().addScaledVector(tan, -11).add(V(0, 3.5, 0)), p.clone().lerp(world.position, 0.2));
    },
    update: function (t, u, dt) {
      // a steady coast at first, slowing after the braking burn
      const sDist = (lineLength + arcLength) * (u < 0.5 ? u * 1.25 : 0.625 + (1 - Math.pow(1 - (u - 0.5) / 0.5, 1.6)) * 0.375);
      const state = at(sDist);
      craft.position.copy(state.p);
      const flip = smooth(0.3, 0.4, u) * (1 - smooth(0.78, 0.88, u));
      aim(craft, flip > 0.5 ? state.d.clone().negate() : state.d, 2.2, dt);
      if (u < 0.12) engineFire(craft, 0.5);            // a last course correction
      if (u > 0.4 && u < 0.76) engineFire(craft, 1);   // the braking burn
      const outward = craft.position.clone().sub(world.position).normalize();
      // close behind and above the craft; it looks ahead past the craft toward the world
      const goal = craft.position.clone().addScaledVector(state.d, -10).addScaledVector(outward, 4.5).add(V(0, 2, 0));
      const look = craft.position.clone().addScaledVector(state.d, 3).lerp(world.position, 0.08);
      ride(follow, craft.position, goal, look, dt, 4, world, radius * (ringed ? 2.4 : 1));
      world.rotation.y += dt * 0.01;
    }
  };
}

function orbitAtShot(o) {
  const ringed = o.world === "saturn";
  const radius = o.radius || R;
  const world = makeWorld(o.world, radius);
  const craft = makeCraft(o.craft, 2.2);
  const r = radius * (ringed ? 2.6 : o.far ? 2.4 : 1.3);
  const h = ringed ? radius * 0.6 : 0;
  let released = null;
  let puffed = false;
  return {
    duration: o.duration || 14,
    start: function () { snapCamera(V(r + 8, h + 4, -8), V(r, h, 0)); },
    update: function (t, u, dt) {
      const a = 0.2 + 0.45 * u;
      craft.position.set(Math.cos(a) * r, h + Math.sin(a) * 2, Math.sin(a) * r);
      const dir = V(-Math.sin(a), 0, Math.cos(a));
      aim(craft, dir, 2, dt);
      if (o.release && !released && u > 0.35) {
        released = makeCraft(o.release, 1);
        released.position.copy(craft.position);
        play("separation");
      }
      if (released) {
        released.position.addScaledVector(craft.position.clone().sub(world.position).normalize(), -dt * 0.7).addScaledVector(dir, dt * 1.2);
        released.rotation.y += dt * 0.6;
      }
      if (o.puff && !puffed && u > 0.5) { puffed = true; thrusterPuff(craft); }
      const outward = craft.position.clone().sub(world.position).normalize();
      glide(craft.position.clone().addScaledVector(dir, -9).addScaledVector(outward, 4).add(V(0, 1.5, 0)), craft.position.clone().lerp(world.position, 0.12), dt, 2, world, radius * (ringed ? 2.4 : 1));
      world.rotation.y += dt * 0.008;
    }
  };
}

function deployShot(o) {
  const craft = makeCraft(o.craft, 4);
  const model = craft.userData.model;
  let world = null;
  if (o.place === "earth") {
    world = makeWorld("earth", R);
    world.position.set(0, -R - 14, 0);
  } else {
    const earth = makeWorld("earth", 4);
    earth.position.set(-300, -40, -600);
    const moon = makeWorld("moon", 1.1);
    moon.position.set(-330, -30, -560);
  }
  return {
    duration: o.duration || 15,
    start: function () { if (o.place === "earth") setSun(V(0.5, 0.7, 0.5)); snapCamera(V(9, 3, 9), V(0, 0, 0)); if (model.userData.setDeploy) model.userData.setDeploy(o.from || 0); },
    update: function (t, u, dt) {
      if (model.userData.setDeploy) model.userData.setDeploy((o.from || 0) + ((o.to === undefined ? 1 : o.to) - (o.from || 0)) * smooth(0.1, 0.85, u));
      craft.rotation.y += dt * 0.05;
      const a = 0.7 + t * 0.1;
      glide(V(Math.sin(a) * 10, 3 + Math.sin(t * 0.3), Math.cos(a) * 10), V(0, 0, 0), dt, 1.6);
      if (world) world.rotation.y += dt * 0.004;
    }
  };
}

// The descent opens on the whole world with the real landing site marked (a red dot, a ring and a
// label with the name and coordinates), then the camera flies in toward it and the descent begins.
// The world is turned so the marked spot is right where the spacecraft comes down.
const SITE_INTRO = 7;
function siteDirection(lat, lon) {
  // the same mapping as the planet maps on a three.js sphere (longitude -180 at the texture's left edge)
  const phi = (lon + 180) / 360 * Math.PI * 2;
  const theta = (90 - lat) / 180 * Math.PI;
  return V(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta)).normalize();
}

function siteLabel(lines) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 160;
  const ctx = c.getContext && c.getContext("2d");
  if (ctx && ctx.fillText) {
    ctx.fillStyle = "rgba(6,10,20,0.82)";
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(4, 4, 504, 152, 18); ctx.fill(); } else ctx.fillRect(4, 4, 504, 152);
    ctx.fillStyle = "#ff3b30";
    ctx.fillRect(4, 4, 8, 152);
    ctx.fillStyle = "#ff8a80";
    ctx.font = "600 22px Inter, Arial, sans-serif";
    ctx.fillText("REAL LANDING SITE", 30, 40);
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 34px Inter, Arial, sans-serif";
    ctx.fillText(lines[0], 30, 86, 460);
    ctx.fillStyle = "#9cc8ff";
    ctx.font = "500 26px Inter, Arial, sans-serif";
    ctx.fillText(lines[1], 30, 128, 460);
  }
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false }));
}

function descendShot(o) {
  if (!o.site || typeof o.site.lat !== "number" || typeof o.site.lon !== "number") return descendCore(o, null);
  const core = descendCore(o, o.site);
  const intro = SITE_INTRO;
  return {
    duration: core.duration + intro,
    start: function () { core.start(); core.introStart(); },
    update: function (t, u, dt) {
      if (t < intro) core.intro(t / intro, dt);
      else core.update(t - intro, (t - intro) / core.duration, dt);
    }
  };
}

function descendCore(o, site) {
  const world = makeWorld(o.world, R);
  const parts = [];
  let craft;
  let mother = null;
  if (o.style === "lm") {
    // the lander undocks from the mission's own spacecraft (the Apollo CSM on Apollo missions; in a Free
    // Build, the spacecraft that was built), so the descent shows the same craft as the rest of the film
    mother = makeCraft(o.mother || "apollo-csm", 2.4);
    craft = makeCraft("lunar-module", 1.6);
  } else {
    craft = makeCraft(o.craft || "capsule", 1.8);
    if (o.cruiseStage) {
      const stage = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.35, 24), new THREE.MeshStandardMaterial({ color: 0x9aa3ae, metalness: 0.6, roughness: 0.4 }));
      stage.rotation.x = Math.PI / 2;
      const holder = new THREE.Group();
      holder.add(stage);
      holder.userData.size = 2.2;
      shotGroup.add(holder);
      parts.push(holder);
    }
  }
  const start = V(-R * 0.3, R * 0.25, R * 1.25);
  const end = V(R * 0.08, R * 0.55, R * 0.86); // grazing the top of the atmosphere / the surface
  // the real landing site: the world turns so it lies under the end of the descent, with a marker on it
  let marker = null;
  const toSite = end.clone().normalize();
  if (site) {
    world.quaternion.setFromUnitVectors(siteDirection(site.lat, site.lon), toSite);
    marker = new THREE.Group();
    const dot = new THREE.Mesh(new THREE.SphereGeometry(R * 0.012, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
    marker.add(dot);
    const ring = new THREE.Mesh(new THREE.RingGeometry(R * 0.022, R * 0.03, 40), new THREE.MeshBasicMaterial({ color: 0xff5a4e, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    ring.quaternion.setFromUnitVectors(V(0, 0, 1), toSite);
    marker.add(ring);
    marker.userData.ring = ring;
    const label = siteLabel([site.label || "Landing site",
      Math.abs(site.lat).toFixed(2) + "° " + (site.lat >= 0 ? "N" : "S") + ", " + Math.abs(site.lon).toFixed(2) + "° " + (site.lon >= 0 ? "E" : "W") + (site.mission ? " · " + site.mission : "")]);
    label.scale.set(R * 0.62, R * 0.195, 1);
    label.center.set(0, 0);
    label.position.copy(toSite).multiplyScalar(R * 0.08).add(V(R * 0.04, R * 0.04, 0));
    marker.add(label);
    marker.userData.label = label;
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), label.position.clone()]), new THREE.LineBasicMaterial({ color: 0xff8a80, transparent: true, opacity: 0.9 }));
    marker.add(line);
    marker.userData.line = line;
    marker.position.copy(toSite).multiplyScalar(R * 1.002);
    shotGroup.add(marker);
  }
  const dir0 = V(1, -0.1, -0.25).normalize();
  let separated = false;
  const introFrom = toSite.clone().multiplyScalar(R * 4.2).add(V(-R * 0.6, R * 0.5, R * 0.9));
  const introTo = start.clone().add(V(-6, 2, 6));
  function setMarker(fade, pulse) {
    if (!marker) return;
    marker.visible = fade > 0.01;
    marker.userData.label.material.opacity = fade;
    marker.userData.line.material.opacity = 0.9 * fade;
    marker.userData.ring.material.opacity = 0.9 * fade;
    marker.userData.ring.scale.setScalar(1 + 0.5 * pulse);
  }
  return {
    introStart: function () {
      snapCamera(introFrom, V(0, 0, 0));
      craft.visible = false;
      if (mother) mother.visible = false;
      setMarker(1, 0);
    },
    intro: function (u, dt) {
      // hold on the whole world with the site marked, then fly in toward it
      const k = ease(smooth(0.35, 1, u));
      const goal = lerpV(introFrom, introTo, k);
      const look = lerpV(V(0, 0, 0), start, k);
      glide(goal, look, dt, 3.2, world, R);
      setMarker(1 - smooth(0.7, 0.95, u), (u * 2.5) % 1);
      if (u > 0.8) { craft.visible = true; if (mother) mother.visible = true; }
    },
    duration: o.duration || 13,
    start: function () {
      setMarker(0, 0);
      craft.visible = true;
      if (mother) mother.visible = true;
      craft.position.copy(start);
      if (mother) mother.position.copy(start).add(V(0, 0.6, -4.4));
      parts.forEach(function (p) { p.position.copy(start).addScaledVector(dir0, -1.4); });
      snapCamera(start.clone().add(V(-6, 2, 6)), start);
    },
    update: function (t, u, dt) {
      const s = ease(u);
      craft.position.copy(start).lerp(end, s * s);
      const travel = end.clone().sub(start).normalize();
      if (o.style === "lm") {
        // Undocking: the LM backs away from the Command and Service Module, then fires its descent engine
        if (mother) {
          mother.position.copy(start).add(V(0, 0.6, -4.4)).addScaledVector(dir0, u * 6);
          aim(mother, dir0, 2, dt);
        }
        aim(craft, V(0, 1, 0).lerp(travel.clone().negate(), smooth(0.3, 0.6, u)).normalize(), 1.5, dt);
        if (u > 0.4) {
          const down = V(0, -1, 0).applyQuaternion(craft.quaternion);
          particles.emit(true, craft.position.clone().addScaledVector(down, 1), down.multiplyScalar(14), 0.3, 1.4, 0.25, 0.4, 0xcfe0ff, 0);
        }
      } else {
        if (!separated && u > 0.22) { separated = true; play("separation"); }
        parts.forEach(function (p) {
          if (separated) p.position.addScaledVector(dir0, -dt * 2).add(V(0, dt * 0.6, 0));
          else p.position.copy(craft.position).addScaledVector(dir0, -1.4);
          p.rotation.x += separated ? dt * 0.3 : 0;
        });
        // Turn heat shield first, then glow as the air thickens
        aim(craft, travel.clone().lerp(V(0, 1, 0), 0.0), 1.5, dt);
        glowAround(craft, smooth(0.7, 1, u), travel);
      }
      const goal = craft.position.clone().add(V(-6, 2.2, 5)).addScaledVector(travel, -3);
      glide(goal, craft.position.clone().addScaledVector(travel, 4), dt, 2.2, world, R);
    }
  };
}

// On the ground: the same terrain as the exploration sites
function surfaceShot(o) {
  const mars = o.world === "mars";
  buildTerrainShape(o.world, o.site || "", (o.site || "x").length * 97 + 13);
  const ground = new THREE.Group();
  buildGround(ground, o.world, [{ x: 0, z: 0 }]);
  shotGroup.add(ground);
  scene.background = new THREE.Color(mars ? 0xc89a72 : 0x000000);
  scene.fog = mars ? new THREE.Fog(0xc89a72, 80, 520) : null;
  stars.visible = !mars;
  sunSprite.visible = !mars;
  sunLight.position.set(mars ? 300 : 500, mars ? 400 : 160, mars ? 200 : 260);
  sunLight.intensity = mars ? 2.3 : 3.1;
  ambient.intensity = mars ? 0.4 : 0.05;
  if (!mars) {
    const earth = makeWorld("earth", 40);
    earth.position.set(-600, 520, -1100);
  }
  function place(model, x, z, size) {
    const g = makeCraft(model, size);
    g.position.set(x, heightAt(x, z), z);
    return g;
  }
  const actors = [];
  let main = null;
  let ascent = null;
  if (o.model) main = place(o.model, 0, 0, o.model === "lunar-module" ? 7 : o.model.indexOf("helicopter") === 0 ? 1.2 : 3);
  if (o.liftoff) {
    // The descent stage stays behind; the ascent stage lifts off from it
    const gold = new THREE.MeshStandardMaterial({ color: 0xc9a13b, metalness: 0.7, roughness: 0.35 });
    const stage = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 1.6, 8), gold);
    stage.position.set(0, heightAt(0, 0) + 1.9, 0);
    shotGroup.add(stage);
    [0, 1, 2, 3].forEach(function (i) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 6), gold);
      const a = i * Math.PI / 2 + Math.PI / 4;
      leg.position.set(Math.cos(a) * 2.6, heightAt(0, 0) + 1.2, Math.sin(a) * 2.6);
      leg.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
      shotGroup.add(leg);
    });
    ascent = place("lm-ascent", 0, 0, 4);
    ascent.position.y += 2.7;
  }
  if (o.astronauts) {
    for (let i = 0; i < 2; i++) {
      const a = createSuitedAstronaut(o.suit || "a7l");
      a.traverse(function (m) { if (m.isMesh) m.castShadow = true; });
      shotGroup.add(a);
      actors.push({ body: a, angle: i * 2.4, radius: 6 + i * 2 });
    }
  }
  let heli = null;
  if (o.helicopter) heli = place("helicopter-flying", 5, 4, 1.2);
  const base = main ? main.position.clone() : V(0, heightAt(0, 0), 0);
  let lifted = false;
  return {
    duration: o.duration || 15,
    start: function () { snapCamera(base.clone().add(V(14, 3, 10)), base.clone().add(V(0, 1.5, 0))); },
    update: function (t, u, dt) {
      actors.forEach(function (a) {
        a.angle += dt * 0.12;
        const x = Math.cos(a.angle) * a.radius;
        const z = Math.sin(a.angle) * a.radius;
        a.body.position.set(x, heightAt(x, z), z);
        a.body.rotation.y = -a.angle;
        a.body.userData.animate("lunar-hop", dt, { speed: 1 });
      });
      if (o.drive && main) {
        main.position.x = base.x + u * 10;
        main.position.y = heightAt(main.position.x, main.position.z);
        main.rotation.y = Math.PI / 2;
      }
      if (heli) {
        const lift = Math.sin(Math.min(1, u * 1.3) * Math.PI);
        heli.position.y = heightAt(5, 4) + lift * 5;
        if (heli.userData.model.userData.update) heli.userData.model.userData.update(dt);
        if (lift > 0.1 && Math.random() < 0.4) particles.emit(false, V(5 + random(-1, 1), heightAt(5, 4) + 0.1, 4 + random(-1, 1)), V(random(-2, 2), 0.3, random(-2, 2)), 0.3, 1.4, 1.2, 0.35, 0xc98a5e, 1);
      }
      if (ascent && u > 0.35) {
        if (!lifted) { lifted = true; play("ignition"); }
        const k = u - 0.35;
        ascent.position.y = heightAt(0, 0) + 2.7 + k * k * 120;
        particles.emit(true, ascent.position.clone().add(V(0, -0.4, 0)), V(random(-1, 1), -12, random(-1, 1)), 0.4, 1.8, 0.2, 0.6, 0xffd59a, 0);
      }
      const focus = ascent && u > 0.35 ? ascent.position : main && o.drive ? main.position : base;
      const a = 0.6 + t * 0.06;
      const dist = ascent && u > 0.45 ? 26 : 14;
      const goal = V(base.x + Math.cos(a) * dist, 0, base.z + Math.sin(a) * dist);
      goal.y = Math.max(heightAt(goal.x, goal.z) + 2.2, focus.y + 1.2);
      glide(goal, focus.clone().add(V(0, 1.4, 0)), dt, 1.6);
    }
  };
}

function sampleShot(o) {
  const world = makeWorld(o.world || "bennu", 40);
  const craft = makeCraft(o.craft, 2.6);
  const top = V(0, 41, 0);
  let touched = false;
  return {
    duration: o.duration || 14,
    start: function () { snapCamera(V(10, 60, 14), V(0, 50, 0)); },
    update: function (t, u, dt) {
      const down = 1 - Math.abs(u - 0.5) * 2; // down, touch, back up
      craft.position.set(0, 41 + 12 * (1 - ease(Math.max(0, down))) + 1.6, 0);
      aim(craft, V(0, -1, 0.001), 2, dt);
      if (!touched && u > 0.48) {
        touched = true;
        play("pop");
        for (let i = 0; i < 80; i++) particles.emit(false, top.clone().add(V(random(-1, 1), 0.3, random(-1, 1))), V(random(-3, 3), random(1, 5), random(-3, 3)), 0.3, 1.2, random(1, 2.5), 0.7, 0x8a8178, 0.3);
      }
      if (u > 0.55 && u < 0.7) engineFire(craft, 0.6, 0xffffff);
      glide(V(Math.sin(t * 0.1) * 12, 50, 12), craft.position.clone().add(V(0, -2, 0)), dt, 1.5, world, 42);
      world.rotation.y += dt * 0.02;
    }
  };
}

function sunShot(o) {
  const sunWorld = makeWorld("sun", R);
  const craft = makeCraft(o.craft, 2.2);
  sunSprite.visible = false;
  sunLight.position.set(0, 0, 0);
  const light = new THREE.PointLight(0xffe2b0, 6, 0, 0);
  shotGroup.add(light);
  const curve = new THREE.CatmullRomCurve3(keepOut([V(-R * 6, 10, R * 3), V(-R * 2, 4, R * 1.8), V(0, 0, R * 1.6), V(R * 2, -4, R * 1.8), V(R * 6, -10, R * 3)], V(0, 0, 0), R * 1.5));
  return {
    duration: o.duration || 14,
    start: function () { const p = curve.getPoint(0); snapCamera(p.clone().add(V(-6, 3, 8)), p); },
    update: function (t, u, dt) {
      const s = 0.05 + 0.9 * ease(u);
      craft.position.copy(curve.getPoint(s));
      aim(craft, V(0, 0, 0).sub(craft.position).normalize().negate(), 2, dt); // heat shield (front) toward the Sun
      const outward = craft.position.clone().normalize();
      glide(craft.position.clone().addScaledVector(outward, 8).add(V(0, 3, 0)), craft.position.clone().lerp(V(0, 0, 0), 0.2), dt, 2, sunWorld, R);
      sunWorld.rotation.y += dt * 0.01;
    }
  };
}

// The trip home, all the way to the top of the atmosphere (no sudden cut to the ocean)
function returnShot(o) {
  const fromOrbit = Boolean(o.fromOrbit);
  const earth = makeWorld("earth", R);
  let from = null;
  if (!fromOrbit && o.from) {
    from = makeWorld(o.from, o.from === "moon" ? 16 : 10);
    from.position.set(-40, 10, -900);
  }
  let craft = makeCraft(o.craft, 2.2);
  let capsule = null;
  let module = null;
  const end = V(R * 0.12, R * 1.02, R * 0.05);           // just above the atmosphere
  const startPos = fromOrbit ? V(-R * 0.5, R * 1.0, R * 0.6) : V(-30, 18, -800);
  const curve = new THREE.CatmullRomCurve3(keepOut(fromOrbit
    ? [startPos, V(-R * 0.25, R * 1.06, R * 0.35), V(0, R * 1.04, R * 0.18), end]
    : [startPos, V(-20, 60, -500), V(-10, 90, -220), V(0, R * 1.3, -60), end], V(0, 0, 0), R * 1.02));
  return {
    duration: o.duration || 18,
    start: function () {
      const p = curve.getPoint(0);
      craft.position.copy(p);
      setSun(V(0.3, 0.8, 0.5)); // the capsule meets the atmosphere over the day side
      snapCamera(p.clone().add(V(-6, 3, -8)), p);
    },
    update: function (t, u, dt) {
      const s = 1 - Math.pow(1 - ease(u), 1.3);
      const p = curve.getPoint(s);
      const dir = curve.getTangent(Math.min(0.999, s)).normalize();
      const active = capsule || craft;
      active.position.copy(p);
      // Departure burn (or the de-orbit burn), then the capsule separates and turns its heat shield forward
      if (u < 0.22) engineFire(craft, 1);
      if (!capsule && u > 0.68 && o.capsule) {
        capsule = makeCraft(o.capsule, 1.8);
        capsule.position.copy(p);
        module = craft;
        play("separation");
      }
      if (module) {
        module.position.addScaledVector(dir, dt * 2).add(V(dt * 1.2, dt * 0.8, 0));
        module.rotation.x += dt * 0.2;
      }
      if (capsule) {
        // capsule models stand upright (+Y up, heat shield at the bottom): point the bottom along the travel
        aimer.position.copy(capsule.position);
        aimer.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().negate());
        if (capsule.quaternion.slerp) capsule.quaternion.slerp(aimer.quaternion, Math.min(1, dt * 1.5)); else capsule.quaternion.copy(aimer.quaternion);
        glowAround(capsule, smooth(0.86, 1, u), dir);
      } else {
        aim(craft, dir, 2.5, dt);
      }
      const goal = active.position.clone().addScaledVector(dir, -9 + smooth(0.6, 1, u) * 3).add(V(-3, 2.5, 0));
      glide(goal, active.position.clone().addScaledVector(dir, 6).lerp(earth.position, smooth(0.2, 0.6, u) * 0.12), dt, 2, earth, R);
      if (earth.userData.clouds) earth.userData.clouds.rotation.y += dt * 0.004;
    }
  };
}

function finaleShot(o) {
  let world = null;
  if (o.world) {
    world = makeWorld(o.world, R);
    world.position.set(0, -R * 1.4, -R * 0.5);
  }
  const craft = o.craft ? makeCraft(o.craft, 2.4) : null;
  if (craft && craft.userData.model.userData.setDeploy) craft.userData.model.userData.setDeploy(1);
  return {
    duration: o.duration || 12,
    start: function () { setSun(V(0.4, 0.8, 0.45)); snapCamera(V(5, 1.5, 6), V(0, 0, 0)); },
    update: function (t, u, dt) {
      if (craft) craft.rotation.y += dt * 0.05;
      const d = 7 + ease(u) * 26;
      glide(V(d * 0.6, 1.5 + u * 8, d), V(0, -u * R * 0.3, 0), dt, 1.2);
      if (world) world.rotation.y += dt * 0.006;
    }
  };
}

const SHOTS = {
  orbit: orbitShot, depart: departShot, cruise: cruiseShot, flyby: flybyShot, arrive: arriveShot, orbitAt: orbitAtShot,
  deploy: deployShot, descend: descendShot, surface: surfaceShot, sample: sampleShot, sun: sunShot, ret: returnShot, finale: finaleShot
};

// ----- Running a shot -----
function clearShot() {
  if (camera) camera.up.set(0, 1, 0);
  while (shotGroup.children.length) shotGroup.remove(shotGroup.children[0]);
  worldsInShot.length = 0;
  craftsInShot.length = 0;
  particles.clear();
  scene.background = new THREE.Color(0x000000);
  scene.fog = null;
  stars.visible = true;
  sunSprite.visible = true;
  sunSprite.position.copy(SUN_DIR).multiplyScalar(20000);
  sunLight.position.copy(SUN_DIR).multiplyScalar(1000);
  sunLight.intensity = 3;
  ambient.intensity = 0.06;
  setLoop("engine", 0);
  setLoop("wind", 0);
}

function frame(now) {
  if (!running) return;
  rafId = requestAnimationFrame(frame);
  const dt = (Math.min(0.05, Math.max(0, (now - lastTime) / 1000)) || 1 / 60) * getPlaybackSpeed(); // 0.5x / 2x playback
  lastTime = now;
  if (!paused && shot) {
    elapsed += dt;
    const u = Math.min(1, elapsed / shot.duration);
    setLoop("engine", 0);
    shot.update(elapsed, u, dt);
    particles.update(dt);
    if (u >= 1 && !finished) {
      finished = true;
      if (doneCallback) doneCallback();
    }
  }
  // When the shot has ended, the camera keeps floating slowly around what it was looking at (shown behind
  // the next scene's card), so the picture never freezes. The drift is added for drawing only and taken
  // off again, so the shot's own camera moves are not disturbed.
  let restore = null;
  if (finished) {
    if (!paused) idleTime += dt;
    const k = Math.min(1, idleTime / 1.5);
    restore = { p: camera.position.clone(), q: camera.quaternion.clone() };
    const off = camera.position.clone().sub(camLook);
    off.applyAxisAngle(V(0, 1, 0), idleTime * 0.045 * k).multiplyScalar(1 - Math.min(0.1, idleTime * 0.015));
    camera.position.copy(camLook).add(off);
    camera.lookAt(camLook);
  }
  stars.position.copy(camera.position);
  renderer.render(scene, camera);
  if (restore) { camera.position.copy(restore.p); camera.quaternion.copy(restore.q); }
}
let idleTime = 0;

// shotSpec: { kind, craft, world, ... }. onDone runs when the shot's time is up (the last frame keeps showing).
let lastSpec = null;
export function startFilm(shotSpec, onDone) {
  init();
  resize();
  clearShot();
  lastSpec = shotSpec;
  const make = SHOTS[shotSpec.kind] || cruiseShot;
  shot = make(shotSpec);
  elapsed = 0;
  idleTime = 0;
  finished = false;
  paused = false;
  doneCallback = onDone || null;
  if (shot.start) shot.start();
  running = true;
  lastTime = performance.now();
  if (rafId === null) rafId = requestAnimationFrame(frame);
}

export function stopFilm() {
  running = false;
  doneCallback = null;
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  setLoop("engine", 0);
  setLoop("wind", 0);
}

export function pauseFilm(on) {
  paused = Boolean(on);
}

// Jump to a point in the shot (0 to 1), for the mission player's progress bar. The shot is rebuilt
// and played forward quickly without drawing, so the spacecraft and camera are where they should be.
export function seekFilm(fraction) {
  if (!lastSpec || !running) return;
  clearShot();
  shot = (SHOTS[lastSpec.kind] || cruiseShot)(lastSpec);
  elapsed = 0;
  finished = false;
  if (shot.start) shot.start();
  const goal = Math.max(0, Math.min(0.995, fraction)) * shot.duration;
  const step = 1 / 30;
  while (elapsed < goal) {
    elapsed = Math.min(goal, elapsed + step);
    shot.update(elapsed, elapsed / shot.duration, step);
  }
  particles.clear();
  lastTime = performance.now();
}

export function filmProgress() {
  return shot ? Math.min(1, elapsed / shot.duration) : 0;
}

export const SHOT_KINDS = Object.keys(SHOTS);

// Checks a shot: the closest any spacecraft (and the camera) gets to any world, in world radii (1 = touching the surface)
export function checkClearance(shotSpec) {
  init();
  clearShot();
  const s = (SHOTS[shotSpec.kind] || cruiseShot)(shotSpec);
  if (s.start) s.start();
  let craftMin = Infinity;
  let cameraMin = Infinity;
  const steps = 240;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * s.duration;
    s.update(t, i / steps, s.duration / steps);
    worldsInShot.forEach(function (w) {
      const r = w.userData.radius;
      if (w.parent !== shotGroup || r < 5) return;
      craftsInShot.forEach(function (c) { craftMin = Math.min(craftMin, c.position.distanceTo(w.position) / r); });
      cameraMin = Math.min(cameraMin, camera.position.distanceTo(w.position) / r);
    });
  }
  particles.clear();
  return { craft: craftMin, camera: cameraMin };
}
