// The close-up landing scene: shows HOW a piece of hardware reached the surface.
// Each landing uses the real method of that mission:
//   "retro"    = rocket engines all the way down (Apollo, Surveyor, Blue Ghost; Viking, Phoenix and InSight
//                first use a heat shield and a parachute)
//   "skycrane" = heat shield, parachute, rocket descent, then the rover is lowered on cables (Curiosity, Perseverance)
//   "airbag"   = heat shield, parachute, then the lander bounces inside airbags (Pathfinder, Spirit, Opportunity)
//   "impact"   = the spacecraft crashes on purpose (LCROSS, MESSENGER)
//   "probe"    = an atmosphere probe falls through thick air to the ground (Pioneer Venus, Huygens on Titan)
//   "atmosphere" = a probe sinks into a giant planet that has no ground (Galileo probe at Jupiter)
//   "plunge"   = a spacecraft dives into a giant planet at the end of its mission (Cassini at Saturn)
//   "splashdown" = a crew capsule comes home: entry heat, drogue parachutes, main parachutes, splashdown (Earth)
// The terrain, models, distances and timing are simplified and illustrative. 1 unit = about 1 meter.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createModel, createParachute, createBackshell, createAstronaut } from "./models.js";
import { nasaUsableInScene, upgradeToNasaModel, announceNasaModel } from "./nasa-models.js";
import { createParticleSystem } from "./particles.js";
import { buildTerrainShape, buildGround as buildRealGround, heightAt as realHeight, stepGround } from "./terrain.js";
import { getPlaybackSpeed } from "./playback.js";
import { planetMaterial as lookMaterial, cloudMaterial } from "./planet-look.js";
import { createGlow } from "./glow.js";

// The real exploration terrain is used for these landings (same craters, rilles and dunes as when you explore)
const LANDING_SITE = { apollo11: "tranquility", apollo15: "hadley", apollo17: "taurus-littrow", curiosity: "gale", perseverance: "jezero" };
import { play, setLoop } from "./sounds.js";

// Sound levels for this frame (0 to 1): rocket engines and rushing air
let engineLevel = 0;
let windLevel = 0;
let touchdownPlayed = false; // so a touchdown thud plays only once

// ----- Page elements -----
const canvas = document.getElementById("landing-canvas");
const titleBox = document.getElementById("landing-title");
const phaseBox = document.getElementById("landing-phase");
const captionBox = document.getElementById("landing-caption");
const progressBar = document.querySelector("#landing-screen .landing-progress span");
const pauseButton = document.getElementById("landing-pause");
const againButton = document.getElementById("landing-again");
const hintBox = document.getElementById("landing-hint");
const cameraButton = document.getElementById("landing-camera");

// ----- What each world looks like on the ground (illustrative) -----
const ENVIRONMENTS = {
  Earth: {
    ocean: true, ground: "#1d4f73", groundDark: "#123552", rock: 0x555555,
    skyTop: 0x2c6bd0, skyHorizon: 0xc4dcf2, stars: false, fog: { color: 0xb3cde8, near: 400, far: 3200 },
    sunColor: 0xfff4e2, sunIntensity: 3.0, sunDirection: [-0.6, 0.7, 0.4], ambient: 0.55,
    air: true, dust: 0xffffff, gravity: 9.81, flameColor: 0xffd59a, flameOpacity: 0.3
  },
  Moon: {
    ground: "#8f8c87", groundDark: "#5c5a56", rock: 0x77746f,
    skyTop: 0x000000, skyHorizon: 0x05060a, stars: true, fog: null,
    sunColor: 0xffffff, sunIntensity: 3.4, sunDirection: [-1, 0.45, 0.35], ambient: 0.12,
    air: false, dust: 0xb8b4ad, gravity: 1.62,
    hills: 14, bumps: 2.2, craters: 70, craterMax: 40, rocks: 260, flameColor: 0xcfe0ff, flameOpacity: 0.22
  },
  Mars: {
    ground: "#b4673e", groundDark: "#7a3f22", rock: 0x6e3d26,
    skyTop: 0xb9906c, skyHorizon: 0xe2b58d, stars: false, fog: { color: 0xd8a47c, near: 380, far: 2200 },
    sunColor: 0xfff0dd, sunIntensity: 2.6, sunDirection: [-0.8, 0.6, 0.5], ambient: 0.5,
    air: true, dust: 0xc78458, gravity: 3.71,
    hills: 22, bumps: 1.6, craters: 22, craterMax: 30, rocks: 520, flameColor: 0xffd59a, flameOpacity: 0.32
  },
  Mercury: {
    ground: "#7e7771", groundDark: "#4c4744", rock: 0x6a645f,
    skyTop: 0x000000, skyHorizon: 0x05060a, stars: true, fog: null,
    sunColor: 0xffffff, sunIntensity: 4.6, sunDirection: [-1, 0.35, 0.2], ambient: 0.08,
    air: false, dust: 0x9a938c, gravity: 3.7,
    hills: 16, bumps: 2.4, craters: 80, craterMax: 45, rocks: 220, flameColor: 0xcfe0ff, flameOpacity: 0.22
  },
  Venus: {
    ground: "#8d6b3d", groundDark: "#4e3a20", rock: 0x5a4527,
    skyTop: 0x8f6326, skyHorizon: 0xd6a05a, stars: false, fog: { color: 0xa87632, near: 25, far: 300 },
    sunColor: 0xffc87d, sunIntensity: 0.9, sunDirection: [0.2, 1, 0.1], ambient: 0.65,
    air: true, dust: 0x8d6b3d, gravity: 8.87,
    hills: 8, bumps: 0.9, craters: 2, craterMax: 20, rocks: 360, flameColor: 0xffd59a, flameOpacity: 0.3
  },
  // Titan: thick orange haze, dim light, a soft sandy riverbed where Huygens landed
  Titan: {
    ground: "#7a6246", groundDark: "#4a3b29", rock: 0x6b5a46,
    skyTop: 0xa8702c, skyHorizon: 0xd8a35a, stars: false, fog: { color: 0xc08a45, near: 30, far: 380 },
    sunColor: 0xffd29a, sunIntensity: 0.7, sunDirection: [-0.4, 1, 0.3], ambient: 0.75,
    air: true, dust: 0x8a7050, gravity: 1.35,
    hills: 10, bumps: 0.5, craters: 0, craterMax: 10, rocks: 140, rockRound: true, flameColor: 0xffd59a, flameOpacity: 0.3
  },
  // Giant planets: no ground. Layers of cloud, getting darker and denser with depth.
  Jupiter: {
    gas: true, skyTop: 0x0a1630, skyHorizon: 0x7e8fb0, deepColor: 0x4a2f1c, stars: false,
    fog: { color: 0xbfae94, near: 200, far: 3500 },
    sunColor: 0xfff2dd, sunIntensity: 2.2, sunDirection: [-0.6, 0.8, 0.3], ambient: 0.6,
    air: true, gravity: 24.8, flameColor: 0xffd59a, flameOpacity: 0.3,
    layers: [
      { y: 520, colors: ["#f4ead8", "#d9c3a0"] },  // high, pale clouds
      { y: 300, colors: ["#d29a62", "#9a6438"] },  // tan and brown clouds
      { y: 110, colors: ["#8c7f78", "#5c4c44"] }   // deeper, darker clouds
    ],
    fogTop: 600, fogBottom: -150
  },
  Saturn: {
    gas: true, skyTop: 0x000000, skyHorizon: 0x2a2a3a, deepColor: 0x6a5a3a, stars: true,
    fog: { color: 0xd8c48f, near: 2500, far: 9000 },
    sunColor: 0xfff2dd, sunIntensity: 2.0, sunDirection: [-0.7, 0.55, 0.4], ambient: 0.55,
    air: false, gravity: 10.4, flameColor: 0xcfe0ff, flameOpacity: 0.25, rings: true,
    layers: [
      { y: 0, colors: ["#efdcab", "#c9ad74"] },
      { y: -60, colors: ["#d8bd86", "#a78b58"] }
    ],
    fogTop: 900, fogBottom: -300
  }
};

// ----- Small helpers -----
function V(x, y, z) {
  return new THREE.Vector3(x, y, z);
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

function smoothstep(a, b, x) {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}

function easeOut(u) {
  return 1 - Math.pow(1 - u, 3);
}

function easeInOut(u) {
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
}

// A random number generator that gives the same numbers every time for the same seed,
// so each world always gets the same terrain.
function makeRandom(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// Smooth random bumps (value noise), and several layers of it (fbm) for natural-looking hills
function noise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x, y) {
  let total = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < 5; i++) {
    total += amplitude * noise(x * frequency, y * frequency);
    frequency *= 2.03;
    amplitude *= 0.5;
  }
  return total;
}

// ----- State -----
let renderer = null;
let scene = null;
let camera = null;
let controls = null;
let particles = null;
let sunLight = null;
let ambientLight = null;
let skyMaterial = null;
let stars = null;
let sunSprite = null;
let flashLight = null;
let terrainGroup = null;
let actorRoot = null;
let flameMaterial = null;

let env = ENVIRONMENTS.Moon;
let terrain = null;      // { heightAt(x, z) }
let item = null;         // the hardware being shown
let phases = [];
let phaseIndex = 0;
let phaseTime = 0;
let elapsed = 0;
let totalTime = 0;
let running = false;
let paused = false;
let finished = false;
let rafId = null;
let lastTime = 0;
let autoCamera = true;
let dustCarry = 0;
let fireCarry = 0;
let flameCarry = 0;
let frameDt = 1 / 60;
let engineLight = null;
let coreFlameMaterial = null;

const cameraGoal = V(0, 10, 30);
const lookGoal = V(0, 0, 0);
const lookNow = V(0, 0, 0);
const lastLookGoal = V(0, 0, 0); // used to keep following when the user steers the camera
const AUTO_HINT = "Drag with the left or right mouse button to look around \u00B7 Scroll to zoom";

// ----- Setting up the 3D view (only once) -----
function init() {
  if (renderer) return;

  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  // Sharp picture: draw at the screen's real pixel density (capped so very dense phones stay smooth)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
  if (THREE.ACESFilmicToneMapping !== undefined) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
  }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, 1, 0.2, 8000);

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 1.5;
  controls.maxDistance = 900;
  controls.maxPolarAngle = Math.PI * 0.49; // do not go under the ground
  controls.enablePan = false;
  // Left or right mouse button: look around. Middle button or scroll wheel: zoom.
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  controls.addEventListener("start", function () {
    play("drag");
    if (!autoCamera) return;
    autoCamera = false; // the user is steering now; the camera still follows the spacecraft
    cameraButton.classList.remove("hidden");
    hintBox.textContent = "You are steering the camera. It keeps following the spacecraft. \u201CAuto camera\u201D hands control back.";
  });
  // Stop the browser menu from opening on right-click, so right-drag can turn the view
  canvas.addEventListener("contextmenu", function (event) { event.preventDefault(); });

  ambientLight = new THREE.HemisphereLight(0xffffff, 0x3a3530, 0.4);
  scene.add(ambientLight);

  sunLight = new THREE.DirectionalLight(0xffffff, 3);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -40;
  sunLight.shadow.camera.right = 40;
  sunLight.shadow.camera.top = 40;
  sunLight.shadow.camera.bottom = -40;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 500;
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight);
  scene.add(sunLight.target);

  // Sky: a big sphere colored from the horizon to the top
  skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(0x000000) },
      uHorizon: { value: new THREE.Color(0x000000) }
    },
    vertexShader:
      "varying vec3 vDir;" +
      "void main() { vDir = normalize(position);" +
      " gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader:
      "uniform vec3 uTop; uniform vec3 uHorizon; varying vec3 vDir;" +
      "void main() { float h = clamp(vDir.y, 0.0, 1.0);" +
      " gl_FragColor = vec4(mix(uHorizon, uTop, pow(h, 0.55)), 1.0); }"
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(5000, 32, 16), skyMaterial);
  sky.renderOrder = -2;
  scene.add(sky);

  const starPositions = new Float32Array(3000 * 3);
  for (let i = 0; i < 3000; i++) {
    const direction = V(random(-1, 1), random(0.02, 1), random(-1, 1)).normalize();
    starPositions[i * 3] = direction.x * 4500;
    starPositions[i * 3 + 1] = direction.y * 4500;
    starPositions[i * 3 + 2] = direction.z * 4500;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false })
  );
  scene.add(stars);

  // The Sun as a bright disk in the sky
  const glow = document.createElement("canvas");
  glow.width = 128;
  glow.height = 128;
  const ctx = glow.getContext("2d");
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.15, "rgba(255,250,235,0.95)");
  gradient.addColorStop(0.4, "rgba(255,230,190,0.25)");
  gradient.addColorStop(1, "rgba(255,220,180,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(glow), transparent: true, depthWrite: false, fog: false,
    blending: THREE.AdditiveBlending
  }));
  scene.add(sunSprite);

  flashLight = new THREE.PointLight(0xfff2dd, 0, 600, 1.4);
  scene.add(flashLight);
  engineLight = new THREE.PointLight(0xffd8a8, 0, 60, 1.6);
  scene.add(engineLight);
  coreFlameMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });

  flameMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd59a, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending
  });

  actorRoot = new THREE.Group();
  scene.add(actorRoot);
  particles = createParticleSystem(scene, 900);

  window.addEventListener("resize", resize);
}

function resize() {
  if (!renderer) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width === 0 || height === 0) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

// ----- Building the ground for a world -----
function makeGroundTexture(world) {
  const drawing = document.createElement("canvas");
  // 1024 px with fine grains, so the ground stays crisp close to the lander
  const S = 1024;
  drawing.width = S;
  drawing.height = S;
  const ctx = drawing.getContext("2d");
  ctx.fillStyle = world.ground;
  ctx.fillRect(0, 0, S, S);

  for (let i = 0; i < 420; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? world.groundDark : "rgba(255,255,255,0.5)";
    ctx.globalAlpha = random(0.03, 0.09);
    ctx.beginPath();
    ctx.arc(Math.random() * S, Math.random() * S, random(14, 110), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 36000; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.2)";
    ctx.fillRect(Math.random() * S, Math.random() * S, random(1, 2.5), random(1, 2.5));
  }

  const texture = new THREE.CanvasTexture(drawing);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(70, 70);
  texture.anisotropy = renderer && renderer.capabilities && renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 8;
  return texture;
}

function buildTerrain(worldName) {
  const world = ENVIRONMENTS[worldName];
  const rand = makeRandom(worldName.length * 7919 + worldName.charCodeAt(0));

  // Craters: kept away from the landing spot in the middle
  const craters = [];
  for (let i = 0; i < world.craters; i++) {
    const radius = 2 + Math.pow(rand(), 2.2) * world.craterMax;
    const distance = radius + 18 + rand() * 260;
    const angle = rand() * Math.PI * 2;
    craters.push({ x: Math.cos(angle) * distance, z: Math.sin(angle) * distance, r: radius, depth: radius * 0.22 });
  }

  function heightAt(x, z) {
    const flat = smoothstep(12, 50, Math.hypot(x, z));
    let h = (fbm(x * 0.006 + 11, z * 0.006 + 7) - 0.5) * world.hills;
    h += (fbm(x * 0.05 + 3, z * 0.05 + 5) - 0.5) * world.bumps;
    h *= flat;
    for (let i = 0; i < craters.length; i++) {
      const c = craters[i];
      const q = Math.hypot(x - c.x, z - c.z) / c.r;
      if (q > 1.8) continue;
      if (q < 1) h -= c.depth * (1 - q * q);
      h += c.depth * 0.3 * Math.exp(-Math.pow((q - 1) / 0.2, 2));
    }
    return h;
  }

  const group = new THREE.Group();

  const size = 900;
  const geometry = new THREE.PlaneGeometry(size, size, 256, 256);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), z = position.getZ(i);
    // near its edges the detailed ground slopes gently down into the wide, curved ground around it,
    // so no edge can be seen (it used to end in a square edge floating in space)
    const edge = smoothstep(320, 440, Math.max(Math.abs(x), Math.abs(z)));
    position.setY(i, heightAt(x, z) * (1 - edge) + HORIZON_TOP * edge - 2.5 * edge);
  }
  geometry.computeVertexNormals();

  const groundTexture = makeGroundTexture(world);
  const ground = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ map: groundTexture, roughness: 1, metalness: 0 })
  );
  ground.receiveShadow = true;
  group.add(ground);
  group.add(buildHorizonGround(groundTexture));

  // Rocks: many small ones, a few big ones
  const rockGeometry = world.rockRound ? new THREE.SphereGeometry(1, 10, 8) : new THREE.DodecahedronGeometry(1, 1);
  const rocks = new THREE.InstancedMesh(
    rockGeometry,
    new THREE.MeshStandardMaterial({ color: world.rock, roughness: 0.95, flatShading: !world.rockRound }),
    world.rocks
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < world.rocks; i++) {
    const distance = 6 + Math.pow(rand(), 0.7) * 160;
    const angle = rand() * Math.PI * 2;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const s = 0.08 + Math.pow(rand(), 5) * 1.8;
    dummy.position.set(x, heightAt(x, z) + s * 0.15, z);
    dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    dummy.scale.set(s * (0.8 + rand() * 0.5), s * (0.45 + rand() * 0.3), s * (0.8 + rand() * 0.5));
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
  }
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  group.add(rocks);

  return { group: group, heightAt: heightAt };
}

// The wide ground around the landing area, out to the horizon: it curves down like the surface of a
// real planet (radius 40 km here, so the horizon is a few kilometres away, as seen from the descent),
// with the same ground texture, so the world no longer looks like a flat square in space
const HORIZON_TOP = -12;
function buildHorizonGround(groundTexture) {
  const R = 40000;
  const outer = 26000;
  const geometry = new THREE.RingGeometry(400, outer, 160, 72);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const d = Math.hypot(position.getX(i), position.getZ(i));
    position.setY(i, HORIZON_TOP - (d * d) / (2 * R));
  }
  geometry.computeVertexNormals();
  const texture = groundTexture.clone();
  texture.needsUpdate = true;
  texture.repeat.set((outer * 2) / 12.9, (outer * 2) / 12.9); // the same scale as the detailed ground
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 }));
  mesh.receiveShadow = true;
  return mesh;
}

// ----- Moon and Mars: the realistic exploration terrain (js/terrain.js) -----
function buildRealTerrain(worldName) {
  const world = worldName.toLowerCase();
  const site = item ? LANDING_SITE[item.id] || "" : "";
  buildTerrainShape(world, site, (site || worldName).length * 97 + 13);
  const group = new THREE.Group();
  // the landing is seen from high above: a big detailed area (2.6 km) and a wide, curved far ground
  buildRealGround(group, world, [{ x: 0, z: 0 }], { reach: 6, wide: true });
  group.traverse(function (o) { if (o.isMesh) o.receiveShadow = true; });
  return { group: group, heightAt: realHeight };
}

// ----- Earth on land: the Utah desert (sample return capsules) -----
function buildDesert() {
  const group = new THREE.Group();
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  if (ctx && ctx.fillRect) {
    ctx.fillStyle = "#b9a27a";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = Math.random() < 0.2 ? "rgba(95,105,70,0.5)" : "rgba(150,125,90,0.3)";
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }
  }
  const texture = new THREE.CanvasTexture(c);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(300, 300);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshStandardMaterial({ map: texture, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);
  const hills = new THREE.MeshStandardMaterial({ color: 0x8f7a5c, roughness: 1, flatShading: true });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const h = 60 + Math.random() * 120;
    const hill = new THREE.Mesh(new THREE.ConeGeometry(300 + Math.random() * 300, h, 6), hills);
    hill.position.set(Math.cos(a) * 2400, h / 2, Math.sin(a) * 2400);
    group.add(hill);
  }
  return { group: group, heightAt: function () { return 0; } };
}

// A ship's outline seen from above: a pointed bow at +x, a square stern at -x
function hullShape(length, beam) {
  const shape = new THREE.Shape();
  shape.moveTo(-length / 2, -beam / 2);
  shape.lineTo(length * 0.22, -beam / 2);
  shape.quadraticCurveTo(length * 0.45, -beam * 0.35, length / 2, 0);
  shape.quadraticCurveTo(length * 0.45, beam * 0.35, length * 0.22, beam / 2);
  shape.lineTo(-length / 2, beam / 2);
  shape.lineTo(-length / 2, -beam / 2);
  return shape;
}
function shipSlab(length, beam, height, material, y) {
  const geometry = new THREE.ExtrudeGeometry(hullShape(length, beam), { depth: height, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = y || 0;
  return mesh;
}
function buildShip(kind) {
  const ship = new THREE.Group();
  const haze = new THREE.MeshStandardMaterial({ color: 0x737b85, roughness: 0.75, metalness: 0.25 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.8, metalness: 0.2 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x4c5158, roughness: 0.9 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe8ebee, roughness: 0.6 });
  const red = new THREE.MeshStandardMaterial({ color: 0x7a2a22, roughness: 0.8 });
  if (kind === "carrier") {
    // waterline stripe, hull, a wide flight deck that overhangs, and the island on the starboard side
    ship.add(shipSlab(250, 30, 3, red, -1));
    ship.add(shipSlab(250, 30, 16, haze, 2));
    const flightDeck = shipSlab(262, 40, 1.2, deckMat, 18);
    ship.add(flightDeck);
    const island = new THREE.Mesh(new THREE.BoxGeometry(32, 14, 7), haze);
    island.position.set(10, 25, -17);
    ship.add(island);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 7.5), haze);
    bridge.position.set(12, 35, -17);
    ship.add(bridge);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 18, 8), dark);
    mast.position.set(12, 47, -17);
    ship.add(mast);
    const radar = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 0.6), dark);
    radar.position.set(12, 52, -17);
    ship.add(radar);
    // deck markings and helicopters on deck
    const line = new THREE.Mesh(new THREE.PlaneGeometry(220, 0.8), new THREE.MeshBasicMaterial({ color: 0xd8d8d0 }));
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 19.3, 4);
    ship.add(line);
    [-60, -20, 40].forEach(function (x) {
      const heli = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(1.6, 7, 4, 8) : new THREE.BoxGeometry(3, 3, 10), dark);
      body.rotation.z = Math.PI / 2;
      heli.add(body);
      const rotor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.2, 0.6), dark);
      rotor.position.y = 2.2;
      heli.add(rotor);
      heli.position.set(x, 21, 8);
      ship.add(heli);
    });
  } else if (kind === "dock") {
    // an amphibious transport dock: a long grey hull, a big block superstructure forward, a flight deck aft
    ship.add(shipSlab(200, 32, 3, red, -1));
    ship.add(shipSlab(200, 32, 14, haze, 2));
    const block = new THREE.Mesh(new THREE.BoxGeometry(70, 16, 26), haze);
    block.position.set(30, 24, 0);
    ship.add(block);
    const mastA = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 22, 8), haze);
    mastA.position.set(40, 43, 0);
    ship.add(mastA);
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(80, 26), deckMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(-50, 16.2, 0);
    ship.add(pad);
  } else {
    // a recovery vessel: dark hull, white superstructure forward, a helipad and a crane over the stern
    ship.add(shipSlab(90, 18, 2, red, -1));
    ship.add(shipSlab(90, 18, 8, dark, 1));
    const house = new THREE.Mesh(new THREE.BoxGeometry(26, 10, 15), white);
    house.position.set(18, 14, 0);
    ship.add(house);
    const wheelhouse = new THREE.Mesh(new THREE.BoxGeometry(12, 5, 15.5), white);
    wheelhouse.position.set(22, 21.5, 0);
    ship.add(wheelhouse);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 0.6, 24), deckMat);
    pad.position.set(18, 19.4, 0);
    ship.add(pad);
    const crane = new THREE.Mesh(new THREE.BoxGeometry(1.2, 18, 1.2), new THREE.MeshStandardMaterial({ color: 0xe6a21c, roughness: 0.6 }));
    crane.position.set(-34, 16, 0);
    crane.rotation.z = 0.5;
    ship.add(crane);
    // bridge windows, a mast with radar, a funnel and two orange lifeboats
    const glass = new THREE.MeshStandardMaterial({ color: 0x16202c, roughness: 0.2, metalness: 0.5 });
    const windows = new THREE.Mesh(new THREE.BoxGeometry(12.2, 1.6, 15.8), glass);
    windows.position.set(22, 22.4, 0);
    ship.add(windows);
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 13), glass);
    front.position.set(28.1, 22.4, 0);
    ship.add(front);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 10, 8), white);
    mast.position.set(20, 29, 0);
    ship.add(mast);
    const radar = new THREE.Mesh(new THREE.BoxGeometry(5, 0.6, 0.8), dark);
    radar.position.set(20, 32, 0);
    ship.add(radar);
    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.2, 6, 12), dark);
    funnel.position.set(8, 21, 0);
    ship.add(funnel);
    const lifeboatMat = new THREE.MeshStandardMaterial({ color: 0xf06a1c, roughness: 0.5 });
    [-1, 1].forEach(function (side) {
      const boat = new THREE.Mesh(new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(1.1, 4, 4, 8) : new THREE.BoxGeometry(6, 2, 2), lifeboatMat);
      boat.rotation.z = Math.PI / 2;
      boat.position.set(14, 15, side * 8.4);
      ship.add(boat);
    });
    // a white band along the hull and a row of portholes
    const band = shipSlab(90.4, 18.4, 0.8, white, 7);
    ship.add(band);
  }
  ship.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return ship;
}

// ----- Earth: an ocean with moving waves and a recovery ship -----
function buildOcean() {
  const group = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(1600, 1600, 140, 140);
  geometry.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x1c5a80, roughness: 0.28, metalness: 0.25 }));
  water.receiveShadow = true;
  group.add(water);
  const far = new THREE.Mesh(new THREE.CircleGeometry(9000, 48), new THREE.MeshStandardMaterial({ color: 0x1a5275, roughness: 0.35, metalness: 0.2 }));
  far.rotation.x = -Math.PI / 2;
  far.position.y = -0.4;
  group.add(far);
  // The recovery ship waiting nearby, shaped like a ship (a pointed bow, a deck, a superstructure):
  // an aircraft carrier for Apollo and Gemini (USS Hornet, USS Intrepid), a grey dock ship for Orion,
  // a recovery vessel with a helipad for Dragon. Simplified shapes, not detailed models.
  const capsuleKey = item && item.landing ? item.landing.capsule : "apollo-cm";
  const ship = buildShip(capsuleKey === "dragon" ? "recovery" : capsuleKey === "orion-cm" ? "dock" : "carrier");
  ship.position.set(150, 0, -280);
  ship.rotation.y = -0.6; // side-on to the camera, so its shape reads as a ship
  group.add(ship);
  const position = geometry.attributes.position;
  function wave(x, z, t) {
    return Math.sin(x * 0.045 + t * 0.9) * 0.35 + Math.sin(z * 0.06 - t * 1.1) * 0.25 + Math.sin((x + z) * 0.12 + t * 1.7) * 0.1;
  }
  let clock = 0;
  return {
    group: group,
    heightAt: function () { return 0; },
    update: function (dt) {
      clock += dt;
      if (!position.setY) return;
      for (let i = 0; i < position.count; i++) position.setY(i, wave(position.getX(i), position.getZ(i), clock));
      position.needsUpdate = true;
      geometry.computeVertexNormals();
    }
  };
}

function applyEnvironment(worldName) {
  env = ENVIRONMENTS[worldName] || ENVIRONMENTS.Moon;

  if (terrainGroup) {
    scene.remove(terrainGroup);
    terrainGroup.traverse(function (object) {
      if (object.geometry) object.geometry.dispose();
    });
  }
  terrain = env.gas ? buildCloudWorld(env) : env.ocean ? (item && item.landing && item.landing.ground === "desert" ? buildDesert() : buildOcean()) : (worldName === "Moon" || worldName === "Mars") ? buildRealTerrain(worldName) : buildTerrain(worldName);
  terrainGroup = terrain.group;
  scene.add(terrainGroup);
  controls.maxPolarAngle = env.gas ? Math.PI : Math.PI * 0.49; // no ground to hit in a gas giant
  camera.far = env.gas || env.ocean ? 20000 : 30000; // far enough to see the curved horizon
  camera.updateProjectionMatrix();
  sunLight.castShadow = !env.gas;

  skyMaterial.uniforms.uTop.value.set(env.skyTop);
  skyMaterial.uniforms.uHorizon.value.set(env.skyHorizon);
  scene.fog = env.fog ? new THREE.Fog(env.fog.color, env.fog.near, env.fog.far) : null;
  stars.visible = env.stars;

  const sunDirection = V(env.sunDirection[0], env.sunDirection[1], env.sunDirection[2]).normalize();
  sunLight.color.set(env.sunColor);
  sunLight.intensity = env.sunIntensity;
  sunLight.position.copy(sunDirection).multiplyScalar(200);
  ambientLight.intensity = env.ambient;
  sunSprite.position.copy(sunDirection).multiplyScalar(4000);
  sunSprite.scale.setScalar(env.air ? 260 : 180);
  sunSprite.visible = !env.fog || env.fog.far > 500; // the Sun is hidden in Venus's thick clouds

  flameMaterial.color.set(env.flameColor);
  flameMaterial.opacity = Math.min(0.75, env.flameOpacity * 2.4); // visible on purpose (see addFlames)
}

// ----- Giant planets: layers of cloud instead of ground -----
function makeCloudTexture(colors, seed) {
  const size = 256;
  const drawing = document.createElement("canvas");
  drawing.width = size;
  drawing.height = size;
  const ctx = drawing.getContext("2d");
  const image = ctx.createImageData(size, size);
  const a = new THREE.Color(colors[0]);
  const b = new THREE.Color(colors[1]);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Stretched noise plus soft stripes looks like the banded clouds of a giant planet
      let n = fbm(x * 0.025 + seed, y * 0.07 + seed * 2);
      n += Math.sin(y * 0.09 + n * 3) * 0.12;
      const t = Math.min(1, Math.max(0, n));
      const i = (y * size + x) * 4;
      image.data[i] = (a.r + (b.r - a.r) * t) * 255;
      image.data[i + 1] = (a.g + (b.g - a.g) * t) * 255;
      image.data[i + 2] = (a.b + (b.b - a.b) * t) * 255;
      image.data[i + 3] = 255 * smoothstep(0.32, 0.62, n);
    }
  }
  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(drawing);
  texture.colorSpace = THREE.SRGBColorSpace;
  // mirrored tiling, so the tiles meet without seams (the plain repeat showed square joins)
  texture.wrapS = THREE.MirroredRepeatWrapping;
  texture.wrapT = THREE.MirroredRepeatWrapping;
  texture.repeat.set(6, 6);
  return texture;
}

// The real cloud bands of the giant planets (the same Solar System Scope maps as the globes), used as
// the deepest, solid cloud deck under the moving cloud layers
const CLOUD_MAPS = { Jupiter: "assets/textures/jupiter_4k.jpg", Saturn: "assets/textures/saturn_4k.jpg" };
function buildCloudWorld(world) {
  const group = new THREE.Group();
  const worldName = Object.keys(ENVIRONMENTS).find(function (k) { return ENVIRONMENTS[k] === world; });
  if (CLOUD_MAPS[worldName]) {
    const geometry = new THREE.PlaneGeometry(40000, 40000, 96, 96);
    geometry.rotateX(-Math.PI / 2);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const d = Math.hypot(position.getX(i), position.getZ(i));
      position.setY(i, -(d * d) / (2 * 60000));
    }
    const deck = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }));
    new THREE.TextureLoader().load(CLOUD_MAPS[worldName], function (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping;
      texture.repeat.set(1.5, 1.5);
      texture.anisotropy = 8;
      deck.material.map = texture;
      deck.material.needsUpdate = true;
    });
    const lowest = world.layers[world.layers.length - 1].y;
    deck.position.y = lowest - 40;
    group.add(deck);
  }

  world.layers.forEach(function (layer, index) {
    // Two sheets close together give each cloud layer some thickness
    [0, 14].forEach(function (offset, k) {
      // a cloud sheet that curves down with distance (like the top of a planet-sized cloud deck) and
      // fades out toward its edge, so no square edge or end can be seen
      const geometry = new THREE.PlaneGeometry(16000, 16000, 64, 64);
      geometry.rotateX(-Math.PI / 2);
      const position = geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const d = Math.hypot(position.getX(i), position.getZ(i));
        position.setY(i, -(d * d) / (2 * 60000));
      }
      const material = new THREE.MeshStandardMaterial({
        map: makeCloudTexture(layer.colors, index * 7.3 + k * 3.1),
        transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 1
      });
      material.onBeforeCompile = function (shader) {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <opaque_fragment>",
          "diffuseColor.a *= 1.0 - smoothstep(0.3, 0.5, length(vMapUv / 6.0 - 0.5));\n#include <opaque_fragment>"
        );
      };
      const sheet = new THREE.Mesh(geometry, material);
      sheet.position.y = layer.y - offset;
      sheet.renderOrder = 1;
      group.add(sheet);
    });
  });

  // Saturn's rings, seen from just above the cloud tops as a bright arch across the sky (illustrative)
  if (world.rings) {
    const ringTexture = document.createElement("canvas");
    ringTexture.width = 512;
    ringTexture.height = 8;
    const ctx = ringTexture.getContext("2d");
    for (let x = 0; x < 512; x++) {
      const shade = 170 + Math.random() * 70;
      const gap = x > 300 && x < 320 ? 0.1 : 1; // a dark gap like the Cassini Division
      ctx.fillStyle = "rgba(" + shade + "," + (shade - 15) + "," + (shade - 45) + "," + (0.55 * gap + Math.random() * 0.25 * gap) + ")";
      ctx.fillRect(x, 0, 1, 8);
    }
    const ringGeometry = new THREE.RingGeometry(3200, 5200, 128, 1);
    const position = ringGeometry.attributes.position;
    const uv = ringGeometry.attributes.uv;
    const point = V(0, 0, 0);
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i);
      uv.setXY(i, (point.length() - 3200) / 2000, 0.5);
    }
    const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(ringTexture), transparent: true, side: THREE.DoubleSide,
      depthWrite: false, fog: false
    }));
    // far away and above the cloud tops, arching across the sky (it used to cut through the clouds)
    ring.rotation.x = 0.22;
    ring.scale.setScalar(2.2);
    ring.position.set(0, -900, -11000);
    ring.renderOrder = -1;
    group.add(ring);
  }

  return { group: group, heightAt: function () { return -100000; } };
}

// Inside a giant planet, the deeper you go the darker and foggier it gets
const deepColor = new THREE.Color();
const skyTopColor = new THREE.Color();
const skyHorizonColor = new THREE.Color();
function updateDepth() {
  const depth = smoothstep(env.fogTop, env.fogBottom, camera.position.y); // 0 = above the clouds, 1 = deep inside
  deepColor.set(env.deepColor);
  scene.fog.color.set(env.fog.color).lerp(deepColor, depth);
  scene.fog.near = env.fog.near * (1 - depth) + 5 * depth;
  scene.fog.far = env.fog.far * (1 - depth) + 160 * depth;
  skyMaterial.uniforms.uTop.value.copy(skyTopColor.set(env.skyTop).lerp(deepColor, depth));
  skyMaterial.uniforms.uHorizon.value.copy(skyHorizonColor.set(env.skyHorizon).lerp(deepColor, depth));
  sunLight.intensity = env.sunIntensity * (1 - depth * 0.85);
  ambientLight.intensity = env.ambient * (1 - depth * 0.6);
  sunSprite.visible = depth < 0.4;
  stars.visible = env.stars && depth < 0.05;
}

// ----- Actors (the models in the scene) -----
function clearActors() {
  while (actorRoot.children.length > 0) actorRoot.remove(actorRoot.children[0]);
  particles.clear();
  flashLight.intensity = 0;
}

function addActor(object) {
  object.traverse(function (child) {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  actorRoot.add(object);
  return object;
}

function makeModel(name, scale) {
  const model = createModel(name);
  model.scale.setScalar(scale || 1);
  addFlames(model);
  // NASA's official model where NASA has one and none of its parts move here (Master Doc 14); landers
  // that unfold, rovers with turning wheels and the Lunar Module keep the project's model
  if (nasaUsableInScene(model, name)) {
    upgradeToNasaModel(model, name).then(function (shown) { if (shown) announceNasaModel(name); });
  }
  return addActor(model);
}

// Faint engine plumes. Rocket exhaust is almost invisible in a vacuum, so on the Moon and Mercury it is very faint.
// The burn is drawn brighter than a real vacuum plume would look (the Apollo descent engine's exhaust
// was nearly invisible on camera), so you can see when and how hard the engine fires: a hot glow at the
// nozzle, a translucent cone, a stream of exhaust and a warm light on the ground.
let nozzleGlowMap = null;
function nozzleGlow() {
  if (nozzleGlowMap) return nozzleGlowMap;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext && c.getContext("2d");
  if (ctx && ctx.createRadialGradient) {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.3, "rgba(255,220,170,0.7)");
    g.addColorStop(1, "rgba(255,160,80,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  nozzleGlowMap = new THREE.CanvasTexture(c);
  return nozzleGlowMap;
}

function addFlames(model) {
  const engines = model.userData.engines || [];
  model.userData.flames = engines.map(function (point) {
    const holder = new THREE.Group();
    holder.userData.keepWithNasa = true; // the flames stay when the official NASA model is shown
    holder.position.copy(point);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.1, 14, 1, true), flameMaterial);
    cone.rotation.x = Math.PI;
    cone.position.y = -0.55;
    holder.add(cone);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.5, 12, 1, true), coreFlameMaterial);
    core.rotation.x = Math.PI;
    core.position.y = -0.25;
    holder.add(core);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: nozzleGlow(), color: 0xffe2b8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.set(0.7, 0.7, 1);
    glow.position.y = -0.05;
    holder.add(glow);
    holder.visible = false;
    model.add(holder);
    return holder;
  });
}

const flameDown = V(0, -1, 0);
const flameWorld = V(0, 0, 0);
function setFlames(model, strength) {
  if (model.visible !== false) engineLevel = Math.max(engineLevel, strength);
  const on = strength > 0.02 && model.visible !== false;
  const flames = model.userData.flames || [];
  flames.forEach(function (holder) {
    holder.visible = on;
    const flicker = 0.85 + Math.random() * 0.3;
    holder.scale.set(1 + strength * 0.25, 0.5 + strength * 1.6 * flicker, 1 + strength * 0.25);
  });
  if (!on || !flames.length || paused) return;
  // exhaust stream and the light it throws on the ground
  model.updateMatrixWorld(true);
  const scale = model.getWorldScale ? model.getWorldScale(V(1, 1, 1)).x : 1;
  const down = flameDown.set(0, -1, 0).applyQuaternion(model.getWorldQuaternion ? model.getWorldQuaternion(new THREE.Quaternion()) : model.quaternion);
  flameCarry += 90 * strength * frameDt;
  while (flameCarry >= 1) {
    flameCarry -= 1;
    const holder = flames[Math.floor(Math.random() * flames.length)];
    holder.getWorldPosition(flameWorld);
    const velocity = down.clone().multiplyScalar(random(9, 16) * scale).add(V(random(-1, 1), random(-1, 1), random(-1, 1)).multiplyScalar(scale * 0.8));
    particles.emit(true, flameWorld.clone().addScaledVector(down, 0.1 * scale), velocity, 0.35 * scale, 1.4 * scale, random(0.18, 0.32), 0.75, env.air ? 0xffc890 : 0xd8e6ff, 0);
  }
  flames[0].getWorldPosition(flameWorld);
  engineLight.position.copy(flameWorld).addScaledVector(down, 1.5 * scale);
  engineLight.intensity = Math.max(engineLight.intensity, 60 * strength * (0.85 + Math.random() * 0.3));
}

// Points the model's "up" (+Y) in a direction (used to tilt landers during the braking burn)
const UP = V(0, 1, 0);
function pointUp(model, direction) {
  model.quaternion.setFromUnitVectors(UP, direction.clone().normalize());
}

// Points the model's nose (+Z) along a direction (used for capsules, probes and impactors)
const FORWARD = V(0, 0, 1);
function pointForward(model, direction) {
  model.quaternion.setFromUnitVectors(FORWARD, direction.clone().normalize());
}

function groundY(x, z) {
  return terrain.heightAt(x, z);
}

// Dust blown off the ground by engines, airbags or wheels.
// With air (Mars, Venus) it billows and hangs. Without air (Moon, Mercury) it shoots out flat and fast.
function kickDust(center, strength, dt, spread) {
  if (strength <= 0) return;
  dustCarry += (env.air ? 70 : 110) * strength * dt;
  while (dustCarry >= 1) {
    dustCarry -= 1;
    const angle = Math.random() * Math.PI * 2;
    const r = random(0.3, spread || 2.5);
    const x = center.x + Math.cos(angle) * r;
    const z = center.z + Math.sin(angle) * r;
    const position = V(x, groundY(x, z) + 0.15, z);
    if (env.air) {
      const speed = random(3, 9) * strength;
      const velocity = V(Math.cos(angle) * speed, random(0.4, 2.2), Math.sin(angle) * speed);
      particles.emit(false, position, velocity, random(0.8, 1.6), random(5, 10), random(2.5, 4.5), 0.5, env.dust, 0.9);
    } else {
      const speed = random(14, 30) * strength;
      const velocity = V(Math.cos(angle) * speed, random(0.1, 1.2), Math.sin(angle) * speed);
      particles.emit(false, position, velocity, random(0.3, 0.6), random(1.2, 2.4), random(0.7, 1.3), 0.42, env.dust, 0);
    }
  }
}

// Glowing hot gas around a heat shield during atmospheric entry
function entryGlow(position, direction, dt, size) {
  windLevel = 1;
  fireCarry += 70 * dt;
  while (fireCarry >= 1) {
    fireCarry -= 1;
    const velocity = direction.clone().multiplyScalar(-random(20, 45))
      .add(V(random(-4, 4), random(-4, 4), random(-4, 4)));
    particles.emit(true, position, velocity, size * random(0.8, 1.4), size * 0.2, random(0.25, 0.5), 0.85, 0xff8a3a, 0);
  }
}

// A flash, a crater and a fan of thrown-up material when something hits the ground
function impact(point, size, craterRadius, firstFrame) {
  if (firstFrame) {
    play("boom");
    flashLight.position.copy(point).add(V(0, 5, 0));
    flashLight.intensity = 6000 * size;

    const crater = new THREE.Mesh(
      new THREE.CircleGeometry(1, 40),
      new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 1, transparent: true, opacity: 0.85 })
    );
    crater.rotation.x = -Math.PI / 2;
    crater.position.set(point.x, groundY(point.x, point.z) + 0.06, point.z);
    crater.scale.setScalar(0.01);
    crater.userData.goal = craterRadius; // final crater radius in meters
    crater.name = "crater";
    actorRoot.add(crater);

    for (let i = 0; i < 260; i++) {
      const angle = Math.random() * Math.PI * 2;
      const tilt = random(0.35, 1.2); // a cone-shaped curtain
      const speed = random(20, 60) * size;
      const velocity = V(Math.cos(angle) * Math.cos(tilt) * speed, Math.sin(tilt) * speed, Math.sin(angle) * Math.cos(tilt) * speed);
      particles.emit(false, point.clone().add(V(0, 0.5, 0)), velocity, random(0.6, 1.4) * size, random(4, 9) * size, random(2, 4), 0.6, 0xd9d4c8, env.air ? 0.6 : 0);
    }
    for (let i = 0; i < 40; i++) {
      const velocity = V(random(-1, 1), random(0.2, 1), random(-1, 1)).multiplyScalar(30 * size);
      particles.emit(true, point.clone().add(V(0, 1, 0)), velocity, 4 * size, 1, random(0.2, 0.5), 1, 0xffffff, 0);
    }
  }
}

// ----- Phases -----
// Each phase: { title, caption, duration (seconds), enter(), update(u, dt) }, where u goes from 0 to 1.
function caption(id, fallback) {
  const custom = item.landing.captions && item.landing.captions[id];
  return custom || fallback;
}

function follow(target, offset) {
  lookGoal.copy(target);
  cameraGoal.copy(target).add(offset);
  const minY = groundY(cameraGoal.x, cameraGoal.z) + 1.5;
  if (cameraGoal.y < minY) cameraGoal.y = minY;
}

// Entry, parachute and backshell, used by every Mars landing. Returns the shared parts.
function marsEntryPhases(cargo, shellRadius, chuteRadius) {
  const shell = addActor(createBackshell(shellRadius));
  const chute = addActor(createParachute(chuteRadius));
  chute.visible = false;
  const shield = shell.userData.heatShield;
  const shieldFall = { active: false, velocity: V(0, 0, 0) };

  const entryStart = V(-520, 420, -300);
  const chuteStart = V(-70, 150, -40);
  const chuteEnd = V(-10, 60, -6);
  const parts = { shell: shell, chute: chute, chuteEnd: chuteEnd };

  function placeCargo() {
    cargo.position.copy(shell.position).add(V(0, shellRadius * 0.35, 0));
    cargo.quaternion.copy(shell.quaternion);
  }

  const list = [
    {
      title: "Entry",
      caption: caption("entry", "Protected by its heat shield, the spacecraft plunges into the thin Martian air. Friction heats the shield until it glows."),
      duration: 5,
      update: function (u, dt) {
        const position = entryStart.clone().lerp(chuteStart, easeOut(u));
        const direction = chuteStart.clone().sub(entryStart).normalize();
        shell.position.copy(position);
        pointUp(shell, direction.clone().negate()); // heat shield first
        placeCargo();
        if (u < 0.8) entryGlow(position.clone().addScaledVector(direction, shellRadius * 0.5), direction, dt, shellRadius * 1.2);
        follow(position, V(-shellRadius * 9, shellRadius * 3, shellRadius * 12));
      }
    },
    {
      title: "Parachute",
      caption: caption("parachute", "A supersonic parachute opens and slows the spacecraft. Then the heat shield drops away."),
      duration: 6,
      enter: function () {
        chute.visible = true;
        chute.scale.setScalar(0.05);
        play("pop");
      },
      update: function (u, dt) {
        const sway = Math.sin(u * 9) * 0.06;
        shell.position.copy(chuteStart).lerp(chuteEnd, u);
        pointUp(shell, V(sway, 1, sway * 0.5));
        chute.position.copy(shell.position).add(V(0, shellRadius * 0.9, 0));
        chute.quaternion.copy(shell.quaternion);
        chute.scale.setScalar(Math.min(1, 0.05 + u * 4));
        placeCargo();

        if (u > 0.35 && !shieldFall.active) {
          shieldFall.active = true;
          play("separation");
          shell.attach(shield);
          actorRoot.attach(shield);
        }
        if (shieldFall.active) {
          shieldFall.velocity.y -= env.gravity * dt * 3;
          shield.position.addScaledVector(shieldFall.velocity, dt);
          shield.rotation.z += dt * 0.8;
        }
        follow(shell.position, V(-chuteRadius * 2.2, -chuteRadius * 0.4, chuteRadius * 2.6));
      }
    }
  ];

  parts.phases = list;
  return parts;
}

// Backshell and parachute drift away after the lander leaves them
function driftAway(parts, dt) {
  parts.shell.position.add(V(6 * dt, 2 * dt, 3 * dt));
  parts.chute.position.copy(parts.shell.position).add(V(0, parts.shell.userData.size * 0.45, 0));
}

// RETRO: rocket engines down to the ground
function retroPhases() {
  const landing = item.landing;
  const lander = makeModel(landing.lander, landing.scale);
  if (lander.userData.setArrays) lander.userData.setArrays(0); // solar arrays stay folded until landing
  const list = [];
  let start;

  if (landing.parachute) {
    const parts = marsEntryPhases(lander, landing.shellRadius || 1.4, landing.chuteRadius || 7);
    list.push.apply(list, parts.phases);
    start = parts.chuteEnd;
    list.push({
      title: "Powered descent",
      caption: caption("powered", "The lander drops out of the backshell and fires its descent engines."),
      duration: 6,
      update: function (u, dt) {
        driftAway(parts, dt);
        const height = 22 + (start.y - 22) * (1 - easeOut(u));
        lander.position.set(start.x * (1 - u), height, start.z * (1 - u));
        lander.quaternion.identity();
        setFlames(lander, 1);
        follow(lander.position, V(-14, 2, 18));
      }
    });
  } else {
    // No air: the lander brakes with its engine, tilted back, then turns upright
    const brakeStart = V(-300, 240, -140);
    const brakeEnd = V(-60, 70, -28);
    const retro = lander.userData.retro;

    list.push({
      title: "Braking burn",
      caption: caption("braking", "With no air to slow it down, the lander fires its engine against its direction of travel."),
      duration: 5,
      update: function (u, dt) {
        const position = brakeStart.clone().lerp(brakeEnd, easeOut(u));
        const direction = brakeEnd.clone().sub(brakeStart).normalize();
        lander.position.copy(position);
        pointUp(lander, direction.clone().negate());
        setFlames(lander, 1);

        // Surveyor: its big solid retro-rocket burns first, then is dropped
        if (retro) {
          if (u < 0.85) {
            fireCarry += 60 * dt;
            while (fireCarry >= 1) {
              fireCarry -= 1;
              const nozzle = lander.localToWorld(lander.userData.retroEngine.clone());
              particles.emit(true, nozzle, direction.clone().multiplyScalar(random(25, 40)), 1.6, 0.3, 0.35, 0.9, undefined, 0);
            }
          } else if (retro.parent === lander) {
            actorRoot.attach(retro);
            play("separation");
            retro.userData.velocity = direction.clone().multiplyScalar(30);
          }
        }
        follow(position, V(-20, 6, 26));
      }
    });
  }

  list.push({
    title: landing.parachute ? "Final descent" : "Final approach",
    caption: caption("approach", "The lander turns upright and slows down, searching for a safe spot."),
    duration: 6,
    enter: function () { start = lander.position.clone(); },
    update: function (u, dt) {
      const position = start.clone().lerp(V(0, 14, 0), easeInOut(u));
      lander.position.copy(position);
      const tilt = V(-1, 1, -0.45).lerp(UP, landing.parachute ? 1 : smoothstep(0, 0.7, u));
      pointUp(lander, tilt);
      setFlames(lander, 0.8);
      kickDust(V(0, 0, 0), smoothstep(30, 10, position.y) * 0.6, dt, 6);
      dropRetro(dt);
      follow(position, V(-15, 3, 19));
    }
  });

  const cutoff = landing.engineCutoff || 0; // Surveyor's engines stopped 3.4 m above the ground
  list.push({
    title: "Touchdown",
    caption: caption("touchdown", "Engines stir up the dust as the lander settles onto its footpads."),
    duration: 4,
    update: function (u, dt) {
      const height = 14 * (1 - easeOut(u));
      lander.position.set(0, height, 0);
      lander.quaternion.identity();
      const firing = height > cutoff + 0.05 && u < 0.97;
      setFlames(lander, firing ? 0.7 : 0);
      if (firing) kickDust(V(0, 0, 0), 1, dt, 3);
      dropRetro(dt);
      follow(lander.position, V(-12, 2.5, 15));
    }
  });

  function dropRetro(dt) {
    const retro = lander.userData.retro;
    if (!retro || retro.parent === lander || !retro.userData.velocity) return;
    retro.userData.velocity.y -= env.gravity * dt;
    retro.position.addScaledVector(retro.userData.velocity, dt);
    retro.rotation.x += dt * 2;
    if (retro.position.y < groundY(retro.position.x, retro.position.z)) {
      retro.visible = false;
      retro.userData.velocity = null;
    }
  }

  list.push(surfacePhase(lander));
  if (landing.rover) list.push(roverDrivePhase(lander));
  return list;
}

// The calm moment after landing. Unfolds solar arrays, and places InSight's instruments.
function surfacePhase(lander) {
  const landing = item.landing;
  const crew = [];

  return {
    title: "On the surface",
    caption: caption("surface", "Landed. The dust settles, and the mission on the surface begins."),
    duration: 6,
    enter: function () {
      setFlames(lander, 0);
      if (!touchdownPlayed) play("thud"); // the sky crane rover already touched down earlier
      touchdownPlayed = true;
      if (lander.userData.setArrays) lander.userData.setArrays(0);
      if (landing.crew) {
        for (let i = 0; i < 2; i++) {
          const astronaut = addActor(createAstronaut());
          astronaut.position.set(2.5 + i * 2.2, groundY(3, 4), 4 + i * 1.5);
          crew.push(astronaut);
        }
      }
    },
    update: function (u, dt) {
      if (lander.userData.setArrays) lander.userData.setArrays(smoothstep(0.1, 0.6, u));
      if (u > 0.65 && lander.userData.deployInstruments) lander.userData.deployInstruments();
      crew.forEach(function (astronaut, i) {
        const angle = u * 1.2 + i * 2;
        astronaut.position.x = 3 + Math.cos(angle) * (3 + i);
        astronaut.position.z = 4 + Math.sin(angle) * (3 + i);
        astronaut.position.y = groundY(astronaut.position.x, astronaut.position.z) + Math.abs(Math.sin(u * 40 + i)) * 0.15;
        astronaut.rotation.y = -angle;
        astronaut.userData.walk(u * 30 + i);
      });
      const angle = -0.9 + u * 0.9;
      follow(V(0, 1.5, 0), V(Math.sin(angle) * 18, 4, Math.cos(angle) * 18));
    }
  };
}

// The Lunar Roving Vehicle drives a loop near the lunar module
function roverDrivePhase(lander) {
  const landing = item.landing;
  let rover = null;
  const center = V(10, 0, 4);
  const radius = 9;

  return {
    title: "Driving the rover",
    caption: caption("drive", "The astronauts unfold the rover from the lunar module and drive off to explore."),
    duration: 9,
    enter: function () {
      rover = makeModel(landing.rover, landing.roverScale || 1);
    },
    update: function (u, dt) {
      const angle = -Math.PI / 2 + u * Math.PI * 1.6;
      const x = center.x + Math.cos(angle) * radius;
      const z = center.z + Math.sin(angle) * radius;
      rover.position.set(x, groundY(x, z), z);
      rover.rotation.y = -angle; // face along the circle
      (rover.userData.wheels || []).forEach(function (wheel) { wheel.rotation.x += dt * 6; });
      kickDust(V(x, 0, z), 0.12, dt, 1.5);
      follow(rover.position, V(-10, 4, 10));
    }
  };
}

// SKY CRANE: Curiosity and Perseverance
function skyCranePhases() {
  const landing = item.landing;
  const rover = makeModel(landing.rover, landing.roverScale || 1);
  const crane = makeModel("sky-crane", 1);
  const parts = marsEntryPhases(crane, landing.shellRadius || 2.25, landing.chuteRadius || 10.5);
  const list = parts.phases.slice();

  const cables = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([V(), V(), V(), V(), V(), V()]),
    new THREE.LineBasicMaterial({ color: 0xdddddd })
  );
  cables.visible = false;
  actorRoot.add(cables);

  const hoverHeight = 20;
  const finalCraneHeight = 9;
  let cableLength = 0;

  function hangRover() {
    rover.position.copy(crane.position).add(V(0, -2.3 - cableLength, 0));
    rover.quaternion.copy(crane.quaternion);
  }

  function drawCables() {
    const top = crane.position;
    const bottom = rover.position.clone().add(V(0, 1.4, 0));
    const points = [
      V(top.x - 0.5, top.y + 0.2, top.z), V(bottom.x - 0.4, bottom.y, bottom.z),
      V(top.x + 0.5, top.y + 0.2, top.z), V(bottom.x + 0.4, bottom.y, bottom.z),
      V(top.x, top.y + 0.2, top.z + 0.6), V(bottom.x, bottom.y, bottom.z + 0.5)
    ];
    cables.geometry.setFromPoints(points);
  }

  // During entry and parachute, the rover rides tucked under the descent stage
  const originalUpdates = list.map(function (phase) { return phase.update; });
  list.forEach(function (phase, i) {
    phase.update = function (u, dt) {
      originalUpdates[i](u, dt);
      hangRover();
    };
  });

  let start;
  list.push({
    title: "Powered descent",
    caption: caption("powered", "The descent stage, with the rover tucked underneath, drops free and fires eight rocket engines."),
    duration: 5,
    enter: function () { start = crane.position.clone(); },
    update: function (u, dt) {
      driftAway(parts, dt);
      crane.position.copy(start).lerp(V(0, hoverHeight, 0), easeOut(u));
      crane.quaternion.identity();
      setFlames(crane, 1);
      hangRover();
      kickDust(V(0, 0, 0), smoothstep(40, 18, crane.position.y) * 0.5, dt, 8);
      follow(crane.position, V(-16, 1, 20));
    }
  });

  list.push({
    title: "Sky crane",
    caption: caption("skycrane", "About 20 meters up, the descent stage hovers and lowers the rover on cables. Its wheels touch the ground."),
    duration: 7,
    enter: function () { cables.visible = true; },
    update: function (u, dt) {
      crane.position.y = hoverHeight + (finalCraneHeight - hoverHeight) * u;
      cableLength = (crane.position.y - 2.3) * smoothstep(0, 1, u);
      hangRover();
      if (u > 0.95) {
        rover.position.y = groundY(0, 0);
        if (!touchdownPlayed) play("thud", 0.6); // wheels touch down gently
        touchdownPlayed = true;
      }
      drawCables();
      setFlames(crane, 0.8);
      kickDust(V(0, 0, 0), 0.8, dt, 7);
      follow(V(0, crane.position.y * 0.5, 0), V(-15, 1, 19));
    }
  });

  const flyVelocity = V(0, 0, 0);
  list.push({
    title: "Flyaway",
    caption: caption("flyaway", "The cables are cut. The descent stage flies away and crashes a safe distance from the rover."),
    duration: 5,
    enter: function () {
      cables.visible = false;
      flyVelocity.set(6, 7, -4);
      play("separation"); // the cables are cut
    },
    update: function (u, dt) {
      flyVelocity.add(V(4 * dt, 1 * dt, -3 * dt));
      crane.position.addScaledVector(flyVelocity, dt);
      crane.rotation.z = -0.5 * smoothstep(0, 0.3, u);
      setFlames(crane, u < 0.85 ? 1 : 0);
      if (u > 0.85 && crane.visible) {
        crane.visible = false;
        play("thud", 0.5); // the descent stage crashes far away
      }
      follow(V(0, 1.5, 0), V(-12, 3, 14));
    }
  });

  list.push(surfacePhase(rover));
  return list;
}

// AIRBAGS: Mars Pathfinder, Spirit and Opportunity
function airbagPhases() {
  const landing = item.landing;
  const lander = makeModel("pathfinder-lander", landing.scale || 1.2);
  const bags = makeModel("airbags", landing.airbagScale || 1.6);
  const rover = makeModel(landing.rover, landing.roverScale || 1);
  const parts = marsEntryPhases(bags, landing.shellRadius || 1.3, landing.chuteRadius || 6.5);
  const list = parts.phases.slice();

  bags.userData.setDeflate(1);
  rover.visible = false;
  lander.visible = false;

  // Bouncing physics state
  const ball = { position: V(), velocity: V(), spin: 0, bounces: 0 };
  const restPoint = V();

  list.push({
    title: "Airbags inflate",
    caption: caption("inflate", "Seconds before reaching the ground, giant airbags inflate around the lander. Rockets on the backshell fire to stop the fall."),
    duration: 4,
    enter: function () {
      ball.position.copy(bags.position);
    },
    update: function (u, dt) {
      bags.userData.setDeflate(1 - smoothstep(0, 0.6, u));
      parts.shell.position.copy(ball.position).add(V(0, 9 - u * 3, 0));
      parts.chute.position.copy(parts.shell.position).add(V(0, parts.shell.userData.size * 0.45, 0));
      bags.position.copy(ball.position).add(V(0, -u * 18, 0));
      bags.quaternion.identity();
      if (u > 0.6) {
        fireCarry += 50 * dt;
        while (fireCarry >= 1) {
          fireCarry -= 1;
          particles.emit(true, parts.shell.position, V(random(-3, 3), -random(8, 15), random(-3, 3)), 1.2, 0.2, 0.3, 0.8, undefined, 0);
        }
      }
      follow(bags.position, V(-16, 2, 20));
    }
  });

  list.push({
    title: "Bouncing",
    caption: caption("bounce", "The bridle is cut. Wrapped in airbags, the lander falls, then bounces and rolls across the surface until it stops."),
    duration: 9,
    enter: function () {
      ball.position.copy(bags.position);
      ball.velocity.set(9, -6, 3);
    },
    update: function (u, dt) {
      const radius = 1.57 * (landing.airbagScale || 1.6);
      ball.velocity.y -= env.gravity * dt * 2.5; // sped up so the bouncing fits in the time
      ball.position.addScaledVector(ball.velocity, dt);
      const floor = groundY(ball.position.x, ball.position.z) + radius;
      if (ball.position.y < floor) {
        ball.position.y = floor;
        if (ball.velocity.y < -1.5) {
          kickDust(V(ball.position.x, 0, ball.position.z), 1.2, 0.08, radius);
          play("thud", Math.min(1, -ball.velocity.y / 12)); // each bounce
        }
        ball.velocity.y = Math.abs(ball.velocity.y) * 0.55;
        ball.velocity.x *= 0.82;
        ball.velocity.z *= 0.82;
      }
      ball.velocity.x *= 1 - 0.15 * dt;
      ball.velocity.z *= 1 - 0.15 * dt;
      ball.spin += Math.hypot(ball.velocity.x, ball.velocity.z) * dt / radius;
      bags.position.copy(ball.position); // the airbag ball is centered on its middle
      bags.rotation.set(0, 0, -ball.spin);
      parts.shell.position.add(V(0, 12 * dt, 0)); // the backshell flies off
      parts.chute.position.copy(parts.shell.position).add(V(0, parts.shell.userData.size * 0.45, 0));
      restPoint.set(ball.position.x, groundY(ball.position.x, ball.position.z), ball.position.z);
      follow(ball.position, V(-14, 4, 18));
    }
  });

  list.push({
    title: "Airbags retract, petals open",
    caption: caption("open", "The airbags deflate and are pulled in. Then the lander opens its petals, turning itself upright."),
    duration: 7,
    enter: function () {
      bags.rotation.set(0, 0, 0);
      lander.visible = true;
      lander.position.copy(restPoint);
      rover.visible = true;
      rover.position.copy(restPoint).add(V(0, 0.15 * (landing.scale || 1.2), 0));
      lander.userData.setPetals(0);
    },
    update: function (u, dt) {
      bags.userData.setDeflate(smoothstep(0, 0.4, u));
      bags.position.copy(restPoint).add(V(0, 0.3 + 2.2 * (1 - smoothstep(0, 0.4, u)), 0));
      if (u > 0.4) bags.visible = false;
      lander.userData.setPetals(smoothstep(0.4, 1, u));
      follow(restPoint.clone().add(V(0, 1, 0)), V(-6, 3, 8));
    }
  });

  list.push({
    title: "Rover drives off",
    caption: caption("drive", "The rover rolls down off the lander onto the ground and starts exploring."),
    duration: 6,
    update: function (u, dt) {
      const distance = 4 * easeInOut(u);
      const x = restPoint.x;
      const z = restPoint.z + distance;
      const onLander = 0.15 * (landing.scale || 1.2) * (1 - smoothstep(0.3, 0.6, u));
      rover.position.set(x, groundY(x, z) + onLander, z);
      (rover.userData.wheels || []).forEach(function (wheel) { wheel.rotation.x += dt * 3; });
      follow(rover.position.clone().add(V(0, 0.5, 0)), V(-5, 2.5, 7));
    }
  });

  return list;
}

// IMPACT: LCROSS and MESSENGER
function impactPhases() {
  const landing = item.landing;
  const list = [];
  const impactors = landing.impactors;

  impactors.forEach(function (spec, index) {
    const model = makeModel(spec.model, spec.scale || 1);
    const start = V(spec.from[0], spec.from[1], spec.from[2]);
    const hit = V(spec.at[0], 0, spec.at[2]);
    hit.y = groundY(hit.x, hit.z);
    model.position.copy(start);
    model.visible = index === 0;
    const direction = hit.clone().sub(start).normalize();
    pointForward(model, direction);
    let struck = false;

    list.push({
      title: spec.title,
      caption: caption("impact" + index, spec.caption),
      duration: spec.duration || 6,
      enter: function () { model.visible = true; },
      update: function (u, dt) {
        const travel = Math.min(1, u / 0.7);
        if (travel < 1) {
          model.position.copy(start).lerp(hit, travel * travel);
          follow(model.position, direction.clone().multiplyScalar(-(spec.cameraBack || 40)).add(V(-30, 15, 30)));
        } else {
          if (!struck) {
            struck = true;
            model.visible = false;
            impact(hit, spec.blast || 1, spec.craterRadius || 8, true);
          }
          follow(hit.clone().add(V(0, 10, 0)), V(-70, 30, 90));
        }
        // Grow the crater
        actorRoot.children.forEach(function (child) {
          if (child.name === "crater") {
            const goal = child.userData.goal;
            child.scale.setScalar(child.scale.x + (goal - child.scale.x) * Math.min(1, dt * 4));
          }
        });
        flashLight.intensity *= Math.exp(-dt * 6);
      }
    });
  });

  list.push({
    title: "What it found",
    caption: caption("findings", "The impact was watched by other spacecraft and telescopes, and the results were studied by scientists."),
    duration: 7,
    update: function (u, dt) {
      flashLight.intensity *= Math.exp(-dt * 6);
      const angle = u * 0.8;
      follow(V(0, 4, 0), V(Math.sin(angle) * 110, 45, Math.cos(angle) * 110));
    }
  });
  return list;
}

// PROBE: an atmosphere probe falling to the surface of Venus
function probePhases() {
  const landing = item.landing;
  const probe = makeModel(landing.lander, landing.scale || 1);
  const chute = landing.parachute ? addActor(createParachute(landing.chuteRadius || 2.5)) : null;
  if (chute) chute.visible = false;

  const top = V(-140, 420, -60);
  const middle = V(-20, 120, -8);
  const list = [];

  list.push({
    title: "Entry",
    caption: caption("entry", "The probe enters the thick atmosphere behind its heat shield, glowing hot."),
    duration: 5,
    update: function (u, dt) {
      const direction = middle.clone().sub(top).normalize();
      probe.position.copy(top).lerp(middle, easeOut(u));
      pointForward(probe, direction);
      if (u < 0.8) entryGlow(probe.position, direction, dt, 1.4);
      follow(probe.position, V(-10, 3, 12));
    }
  });

  list.push({
    title: "Falling through the clouds",
    caption: caption("descent", "Deep in the dense, hot air, the probe sinks slowly and sends its measurements back to Earth."),
    duration: 8,
    enter: function () {
      if (chute) {
        chute.visible = true;
        chute.scale.setScalar(0.05);
        play("pop");
      }
      if (probe.userData.heatShield) dropPart(probe, probe.userData.heatShield, V(0, -20, 0));
    },
    update: function (u, dt) {
      updateDroppedParts(dt);
      probe.position.copy(middle).lerp(V(0, 6, 0), u);
      pointForward(probe, V(Math.sin(u * 12) * 0.05, -1, 0));
      if (chute) {
        chute.position.copy(probe.position).add(V(0, 1, 0));
        chute.scale.setScalar(Math.min(1, 0.05 + u * 5));
        if (u > 0.5 && !landing.keepParachute) chute.position.y += (u - 0.5) * 80; // released
      }
      follow(probe.position, V(-8, 2, 10));
    }
  });

  list.push({
    title: "Reaching the surface",
    caption: caption("touchdown", "The probe hits the ground. It was not built to survive the landing."),
    duration: 4,
    update: function (u, dt) {
      probe.position.set(0, Math.max(0.6, 6 * (1 - u * 1.6)), 0);
      if (chute && landing.keepParachute) {
        chute.position.copy(probe.position).add(V(3 * u, 1 + 2 * (1 - u), 0)); // the chute settles beside the probe
      }
      if (u > 0.6 && u < 0.7) kickDust(V(0, 0, 0), 1, dt, 2);
      if (u > 0.6 && !touchdownPlayed) {
        touchdownPlayed = true;
        play("thud");
      }
      follow(probe.position, V(-7, 2, 9));
    }
  });

  list.push({
    title: "On the surface",
    caption: caption("surface", "The probe rests on the surface of Venus."),
    duration: 6,
    update: function (u, dt) {
      const angle = u * 0.8;
      follow(V(0, 0.8, 0), V(Math.sin(angle) * 9, 2.5, Math.cos(angle) * 9));
    }
  });
  return list;
}

// Drops a part (like a heat shield) so it falls away on its own
function dropPart(model, part, velocity) {
  if (!part || part.parent === actorRoot) return;
  play("separation");
  actorRoot.attach(part);
  part.userData.velocity = velocity.clone();
}

function updateDroppedParts(dt) {
  actorRoot.traverse(function (object) {
    if (!object.userData.velocity) return;
    object.userData.velocity.y -= env.gravity * dt;
    object.position.addScaledVector(object.userData.velocity, dt);
    object.rotation.x += dt * 1.5;
  });
}

// ATMOSPHERE: Galileo's probe sinks into Jupiter until the heat and pressure stop it
function atmospherePhases() {
  const landing = item.landing;
  const probe = makeModel(landing.lander, landing.scale || 1);
  const chute = addActor(createParachute(landing.chuteRadius || 2.5));
  chute.visible = false;
  const shield = probe.userData.heatShield;

  const start = V(-1600, 1900, -500);
  const chutePoint = V(-60, 680, -20);
  const list = [];

  list.push({
    title: "Entry",
    caption: caption("entry", "The probe hits the top of the atmosphere at tremendous speed, protected by its heat shield."),
    duration: 6,
    update: function (u, dt) {
      const direction = chutePoint.clone().sub(start).normalize();
      probe.position.copy(start).lerp(chutePoint, easeOut(u));
      pointForward(probe, direction);
      if (u < 0.85) entryGlow(probe.position, direction, dt, 2.2);
      follow(probe.position, V(-12, 4, 15));
    }
  });

  list.push({
    title: "Parachute opens",
    caption: caption("parachute", "A parachute opens and the heat shield is released. The probe starts sending data."),
    duration: 5,
    enter: function () {
      chute.visible = true;
      chute.scale.setScalar(0.05);
      play("pop");
      dropPart(probe, shield, V(0, -25, 0));
    },
    update: function (u, dt) {
      probe.position.copy(chutePoint).add(V(0, -60 * u, 0));
      pointForward(probe, V(Math.sin(u * 8) * 0.04, -1, 0));
      chute.position.copy(probe.position).add(V(0, 1.2, 0));
      chute.scale.setScalar(Math.min(1, 0.05 + u * 4));
      updateDroppedParts(dt);
      follow(probe.position, V(-9, 2, 11));
    }
  });

  const depthSteps = landing.depthSteps || [];
  const depthStart = 620;
  const depthEnd = -120;
  depthSteps.forEach(function (step, index) {
    const from = depthStart + ((depthEnd - depthStart) * index) / depthSteps.length;
    const to = depthStart + ((depthEnd - depthStart) * (index + 1)) / depthSteps.length;
    list.push({
      title: step.title,
      caption: step.caption,
      duration: step.duration || 7,
      update: function (u, dt) {
        probe.position.set(Math.sin(u * 3 + index) * 4, from + (to - from) * u, 0);
        pointForward(probe, V(Math.sin(u * 10) * 0.05, -1, 0));
        chute.position.copy(probe.position).add(V(0, 1.2, 0));
        updateDroppedParts(dt);
        follow(probe.position, V(-8, 2.5, 10));
      }
    });
  });

  list.push({
    title: "Signal lost",
    caption: caption("end", "The probe's transmitter stops. Heat and pressure end the mission."),
    duration: 6,
    enter: function () { play("signalLost"); },
    update: function (u, dt) {
      probe.position.y = depthEnd - 20 * u;
      chute.position.copy(probe.position).add(V(0, 1.2, 0));
      // Fade the probe into the dark, hot depths
      const fade = 1 - smoothstep(0.2, 0.9, u);
      probe.visible = fade > 0.05;
      chute.visible = fade > 0.05;
      follow(probe.position, V(-8 - u * 10, 3, 10 + u * 12));
    }
  });
  return list;
}

// PLUNGE: Cassini dives into Saturn at the end of its mission
function plungePhases() {
  const landing = item.landing;
  const craft = makeModel(landing.lander, landing.scale || 1);
  const start = V(-5200, 2600, -1400);
  const entry = V(-900, 1250, -240);
  const end = V(300, 700, 80);
  const list = [];
  let thrusterCarry = 0;

  function aimAntennaAtEarth() {
    pointForward(craft, V(-0.5, 0.8, 0.3)); // the dish stays pointed toward Earth to send data
  }

  function thrusters(dt, strength) {
    thrusterCarry += 30 * strength * dt;
    while (thrusterCarry >= 1) {
      thrusterCarry -= 1;
      const side = V(random(-1, 1), random(-0.3, 0.3), random(-1, 1)).normalize();
      particles.emit(false, craft.position.clone().addScaledVector(side, 2), side.multiplyScalar(random(4, 8)), 0.4, 2, 0.6, 0.5, 0xffffff, 0);
    }
  }

  list.push({
    title: "Final approach",
    caption: caption("approach", "The spacecraft heads toward the planet on its final orbit."),
    duration: 7,
    update: function (u, dt) {
      craft.position.copy(start).lerp(entry, u);
      aimAntennaAtEarth();
      follow(craft.position, V(-26, 8, 30));
    }
  });

  list.push({
    title: "Entering the atmosphere",
    caption: caption("entry", "The spacecraft enters the upper atmosphere, firing its thrusters to keep its antenna pointed at Earth."),
    duration: 7,
    update: function (u, dt) {
      craft.position.copy(entry).lerp(end, u * 0.7);
      aimAntennaAtEarth();
      craft.rotation.z += Math.sin(u * 40) * 0.002;
      thrusters(dt, 1);
      if (u > 0.4) entryGlow(craft.position, end.clone().sub(entry).normalize(), dt, 2.5 * smoothstep(0.4, 1, u));
      follow(craft.position, V(-22, 6, 26));
    }
  });

  list.push({
    title: "Loss of signal",
    caption: caption("end", "The atmosphere overpowers the thrusters, the antenna turns away from Earth, and contact is lost."),
    duration: 7,
    enter: function () { play("signalLost"); },
    update: function (u, dt) {
      craft.position.copy(entry).lerp(end, 0.7 + 0.3 * u);
      craft.rotation.x += dt * 2 * u;
      craft.rotation.y += dt * 1.3 * u;
      entryGlow(craft.position, end.clone().sub(entry).normalize(), dt, 3 + 3 * u);
      craft.visible = u < 0.75;
      follow(craft.position, V(-24 - 20 * u, 8, 28 + 20 * u));
    }
  });

  list.push({
    title: "Mission complete",
    caption: caption("after", "The mission is over."),
    duration: 7,
    update: function (u, dt) {
      const angle = u * 0.6;
      follow(end.clone().add(V(0, 120, 0)), V(Math.sin(angle) * 500, 200, Math.cos(angle) * 500));
    }
  });
  return list;
}

// ----- Running the timeline -----
// SPLASHDOWN: a crew capsule comes home. Facts per capsule (from NASA mission pages); motion is illustrative.
const CAPSULE_FACTS = {
  "apollo-cm": {
    entry: "The Command Module meets the top of the atmosphere at about 11 kilometers per second, heat shield first. The air around it turns into glowing plasma and blocks radio contact for a few minutes.",
    drogue: "At about 7 kilometers up, two drogue parachutes open to steady the capsule.",
    main: "At about 3 kilometers, three main parachutes open and slow the capsule to roughly 35 km/h.",
    splash: "Splashdown in the Pacific Ocean. Navy swimmers and helicopters reach the crew, and a recovery ship lifts the capsule aboard."
  },
  "orion-cm": {
    entry: "Orion returns from the Moon at about 11 kilometers per second. On Artemis I it used a skip entry: it dipped into the atmosphere, skipped back up, then made its final descent, heat shield first.",
    drogue: "At about 7.6 kilometers, two drogue parachutes open to slow and steady Orion.",
    main: "Three main parachutes open at about 2.9 kilometers and slow Orion to under 32 km/h.",
    splash: "Splashdown in the Pacific Ocean, off Baja California. A U.S. Navy ship recovers the capsule."
  },
  "dragon": {
    entry: "Crew Dragon comes back from low Earth orbit at about 7.5 kilometers per second, heat shield first.",
    drogue: "At about 5.5 kilometers, two drogue parachutes open.",
    main: "At about 2 kilometers, the main parachutes open and slow Dragon down for splashdown.",
    splash: "Splashdown. Demo-2 landed in the Gulf of Mexico in 2020; a recovery ship lifted the capsule aboard with the crew inside."
  },
  "gemini-cm": {
    entry: "Gemini returns from Earth orbit at about 7.8 kilometers per second, heat shield first.",
    drogue: "High in the atmosphere, a small drogue parachute opens to steady the capsule.",
    main: "Gemini then opens a single large main parachute.",
    splash: "Splashdown in the Atlantic Ocean. Gemini III was recovered by the aircraft carrier USS Intrepid."
  }
};

function fitSize(model, meters) {
  const box = new THREE.Box3().setFromObject(model);
  const size = V(0, 0, 0);
  box.getSize(size);
  const biggest = Math.max(size.x, size.y, size.z) || 1;
  model.scale.multiplyScalar(meters / biggest);
}

// High above Earth: the curved planet below with its glowing air, so the entry starts in space, not over the sea
function earthFromAbove() {
  const g = new THREE.Group();
  const radius = 6000;
  // the real Earth (same maps as the Solar System), real clouds and the soft glow of the air
  const surface = lookMaterial("Earth", null, { hd: true });
  surface.fog = false;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(radius, 128, 96), surface);
  ball.rotation.y = 1.4; // the Pacific below (splashdowns were in the Pacific or Atlantic)
  g.add(ball);
  const cloudLayer = cloudMaterial();
  cloudLayer.fog = false;
  cloudLayer.opacity = 0.6;
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.003, 128, 96), cloudLayer);
  clouds.rotation.y = 1.4;
  g.add(clouds);
  const air = createGlow(radius, { color: 0x6aa8ff, strength: 0.9, size: 1.02 });
  air.traverse(function (o) { if (o.material) o.material.fog = false; });
  g.add(air);
  g.position.set(0, -radius - 2200, 0);
  actorRoot.add(g);
  return g;
}

function splashdownPhases() {
  const landing = item.landing;
  const key = CAPSULE_FACTS[landing.capsule] ? landing.capsule : "apollo-cm";
  const facts = CAPSULE_FACTS[key];
  // Crew Dragon's flying model points nose-forward; for the splashdown the upright capsule (no trunk) is used
  const capsule = makeModel(landing.capsule === "dragon" ? "dragon-cm" : (landing.capsule || "apollo-cm"), 1);
  fitSize(capsule, landing.size || 4);
  const R = landing.size || 4;
  let mains = capsule.userData.chutes;
  if (!mains) {
    mains = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const chute = createParachute(R * 2.2);
      chute.position.set((i - 1) * R * 1.6, R * 6, 0);
      mains.add(chute);
    }
    actorRoot.add(mains);
    mains.userData.loose = true;
  }
  mains.visible = false;
  const drogues = new THREE.Group();
  for (let i = 0; i < (key === "gemini-cm" ? 1 : 2); i++) {
    const chute = addActor(createParachute(R * 0.55));
    chute.position.set((i - 0.5) * R * 0.8, 0, 0);
    drogues.add(chute);
  }
  actorRoot.add(drogues);
  drogues.visible = false;
  const drogueDrift = { active: false, velocity: V(4, 2, 1) };

  const entryStart = V(-900, 760, -520);
  const drogueAt = V(-120, 190, -70);
  const above = earthFromAbove();
  const savedFog = scene.fog;
  const skyTop = new THREE.Color(env.skyTop);
  const skyHorizon = new THREE.Color(env.skyHorizon);
  const mainAt = V(-30, 75, -16);
  const sea = V(0, R * 0.25, 0);
  let splashed = false;
  let released = []; // the main parachutes after release: each one settles flat on the water

  function placeLoose() {
    if (mains.userData.loose) {
      mains.position.copy(capsule.position);
      mains.quaternion.copy(capsule.quaternion);
    }
  }

  return [
    {
      title: "Entry interface",
      caption: facts.entry,
      duration: 6,
      update: function (u, dt) {
        const position = entryStart.clone().lerp(drogueAt, easeOut(u));
        const direction = drogueAt.clone().sub(entryStart).normalize();
        capsule.position.copy(position);
        pointUp(capsule, direction.clone().negate()); // heat shield first
        if (u < 0.85) entryGlow(position.clone().addScaledVector(direction, R * 0.5), direction, dt, R * 1.3);
        // From the black of space to a blue sky: Earth curves away below, then the capsule drops through the clouds
        const deep = 1 - smoothstep(0.15, 0.8, u);
        above.visible = u < 0.9;
        terrainGroup.visible = u >= 0.9;
        skyMaterial.uniforms.uTop.value.copy(skyTop).lerp(new THREE.Color(0x02040a), deep);
        skyMaterial.uniforms.uHorizon.value.copy(skyHorizon).lerp(new THREE.Color(0x3a6fb8), deep);
        const cloud = smoothstep(0.78, 0.9, u) * (1 - smoothstep(0.9, 1, u));
        scene.fog = cloud > 0.01 ? new THREE.Fog(0xf2f5fa, 2, 60 + (1 - cloud) * 900) : (u >= 0.9 ? savedFog : null);
        follow(position, V(-R * 8, R * 2.5, R * 11));
      }
    },
    {
      title: "Drogue parachutes",
      caption: facts.drogue,
      duration: 4,
      enter: function () {
        above.visible = false;
        terrainGroup.visible = true;
        scene.fog = savedFog;
        skyMaterial.uniforms.uTop.value.copy(skyTop);
        skyMaterial.uniforms.uHorizon.value.copy(skyHorizon);
        drogues.visible = true;
        play("pop");
      },
      update: function (u) {
        const sway = Math.sin(u * 10) * 0.08;
        capsule.position.copy(drogueAt).lerp(mainAt, u);
        pointUp(capsule, V(sway, 1, sway * 0.4));
        drogues.position.copy(capsule.position).add(V(0, R * 3.2, 0));
        drogues.scale.setScalar(Math.min(1, 0.1 + u * 3));
        follow(capsule.position, V(-R * 5, R * 0.5, R * 7));
      }
    },
    {
      title: "Main parachutes",
      caption: facts.main,
      duration: 6.5,
      enter: function () {
        mains.visible = true;
        mains.scale.setScalar(0.05);
        drogueDrift.active = true;
        play("separation");
      },
      update: function (u, dt) {
        const sway = Math.sin(u * 7) * 0.05;
        capsule.position.copy(mainAt).lerp(sea, easeInOut(u));
        pointUp(capsule, V(sway, 1, sway * 0.5));
        const open = Math.min(1, 0.05 + u * 2.5);
        if (mains.userData.loose) mains.scale.setScalar(open);
        else mains.scale.set(open, open, open);
        placeLoose();
        if (drogueDrift.active) {
          drogues.position.addScaledVector(drogueDrift.velocity, dt);
          drogues.rotation.z += dt * 0.4;
        }
        follow(capsule.position, V(-R * 9, R * 2.5, R * 12));
      }
    },
    {
      title: "Splashdown",
      caption: facts.splash,
      duration: 6,
      enter: function () {
        splashed = false;
      },
      update: function (u, dt) {
        if (!splashed) {
          splashed = true;
          play("thud", 0.5);
          for (let i = 0; i < 220; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = random(3, 12);
            particles.emit(false, V(Math.cos(angle) * R * 0.5, 0.3, Math.sin(angle) * R * 0.5), V(Math.cos(angle) * speed, random(3, 11), Math.sin(angle) * speed), random(0.4, 1.1), random(2, 4), random(1.2, 2.4), 0.8, 0xffffff, 0.5);
          }
          // The crew releases the main parachutes: each one is taken off the capsule (keeping where it
          // is) so it can fall and lie flat on the water
          released = mains.children.slice().map(function (chute, i) {
            actorRoot.attach(chute);
            return { chute: chute, i: i, pos: chute.position.clone(), quat: chute.quaternion.clone(), scale: chute.scale.clone() };
          });
        }
        // Bobbing on the waves; the parachutes are released and fall onto the water
        capsule.position.set(0, R * 0.15 + Math.sin(u * 9) * 0.25, 0);
        pointUp(capsule, V(Math.sin(u * 6) * 0.08, 1, Math.cos(u * 5) * 0.06));
        // The released parachutes fall over and settle flat on the water behind the capsule (away from
        // the camera), going limp: lines toward the capsule, the canopy spread out like a wet sheet
        const fall = easeOut(Math.min(1, u * 1.3));
        const away = Math.atan2(1, 1.4);                       // direction away from the camera, on the water
        const lieQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, away, -Math.PI / 2, "YXZ"));
        released.forEach(function (r) {
          const k = r.i - (released.length - 1) / 2;
          const along = R * 0.9 + Math.abs(k) * R * 0.5;
          const side = k * R * 2.6;
          const lie = V(Math.cos(away) * along + Math.sin(away) * side, 0.35, -Math.sin(away) * along + Math.cos(away) * side);
          r.chute.position.lerpVectors(r.pos, lie, fall);
          r.chute.quaternion.slerpQuaternions(r.quat, lieQuat, fall);
          r.chute.scale.set(r.scale.x * (1 - 0.94 * fall), r.scale.y * (1 - 0.25 * fall), r.scale.z);
        });
        if (drogues.visible && u > 0.2) drogues.visible = false;
        if (u < 0.5 && Math.random() < 0.5) {
          particles.emit(false, V(random(-R, R), 0.2, random(-R, R)), V(random(-1, 1), random(0.5, 2), random(-1, 1)), random(0.6, 1.4), random(2, 5), random(1.5, 3), 0.5, 0xffffff, 0.8);
        }
        follow(capsule.position, V(-R * 6 - u * R * 4, R * 2 + u * R, R * 8 + u * R * 3));
      }
    }
  ];
}

function buildPhases() {
  const style = item.landing.style;
  if (style === "splashdown") return splashdownPhases();
  if (style === "atmosphere") return atmospherePhases();
  if (style === "plunge") return plungePhases();
  if (style === "skycrane") return skyCranePhases();
  if (style === "airbag") return airbagPhases();
  if (style === "impact") return impactPhases();
  if (style === "probe") return probePhases();
  return retroPhases();
}

function enterPhase(index) {
  phaseIndex = index;
  phaseTime = 0;
  const phase = phases[index];
  phaseBox.textContent = "Step " + (index + 1) + " of " + phases.length + " · " + phase.title;
  captionBox.textContent = phase.caption;
  if (index > 0) play("event");
  if (phase.enter) phase.enter();
}

function restart() {
  touchdownPlayed = false;
  hideAfterLanding();
  if (terrainGroup) terrainGroup.visible = true;
  clearActors();
  dustCarry = 0;
  fireCarry = 0;
  setAutoCamera();
  finished = false;
  paused = false;
  pauseButton.textContent = "Pause";

  phases = buildPhases();
  totalTime = phases.reduce(function (sum, phase) { return sum + phase.duration; }, 0);
  elapsed = 0;
  enterPhase(0);
  phases[0].update(0, 0);

  camera.position.copy(cameraGoal);
  lookNow.copy(lookGoal);
  lastLookGoal.copy(lookGoal);
  controls.target.copy(lookNow);
}

function setAutoCamera() {
  autoCamera = true;
  cameraButton.classList.add("hidden");
  hintBox.textContent = AUTO_HINT;
}

const UP_AXIS = new THREE.Vector3(0, 1, 0);
function frame(now) {
  if (!running) return;
  stepGround(3); // the rest of the detailed Moon or Mars ground, a few tiles per frame
  rafId = requestAnimationFrame(frame);
  const dt = Math.min((now - lastTime) / 1000, 0.05) * getPlaybackSpeed(); // 0.5x / 2x playback
  lastTime = now;
  frameDt = dt;
  if (engineLight) engineLight.intensity *= 0.5; // fades unless an engine keeps it lit this frame

  if (!paused && !finished) {
    phaseTime += dt;
    elapsed += dt;
    const phase = phases[phaseIndex];
    const u = Math.min(phaseTime / phase.duration, 1);
    phase.update(u, dt);

    if (phaseTime >= phase.duration) {
      if (phaseIndex < phases.length - 1) {
        enterPhase(phaseIndex + 1);
      } else {
        finished = true;
        phaseBox.textContent = "Complete · " + phase.title;
        showAfterLanding();
        document.dispatchEvent(new CustomEvent("landing-finished", { detail: { id: item ? item.id : null } }));
      }
    }
    progressBar.style.setProperty("--fill", String(Math.min(1, elapsed / totalTime)));
    updateSiteCard();
  }

  if (!paused) particles.update(dt);
  if (!paused && terrain && terrain.update) terrain.update(dt);

  // Sound follows what is happening: engines firing, air rushing past
  setLoop("engine", paused || finished ? 0 : engineLevel * (env.air ? 0.8 : 0.5));
  setLoop("wind", paused || finished ? 0 : windLevel * (env.air ? 1 : 0));
  engineLevel = 0;
  windLevel *= 0.9; // fades out after the glowing entry ends

  // Auto camera: glide toward the planned camera position.
  // User camera: keep the angle and distance the user chose, but move along with the spacecraft.
  if (autoCamera) {
    if (finished && !paused) cameraGoal.sub(lookGoal).applyAxisAngle(UP_AXIS, dt * 0.06).add(lookGoal);
    // the farther behind the camera is, the faster it catches up, so the spacecraft stays in the picture
    const behind = camera.position.distanceTo(cameraGoal);
    const lookBehind = lookNow.distanceTo(lookGoal);
    camera.position.lerp(cameraGoal, 1 - Math.exp(-(2.2 + Math.min(8, behind * 0.03)) * dt));
    lookNow.lerp(lookGoal, 1 - Math.exp(-(3.5 + Math.min(10, lookBehind * 0.05)) * dt)); // steady, no jitter
    controls.target.copy(lookNow);
  } else {
    const moved = lookGoal.clone().sub(lastLookGoal);
    camera.position.add(moved);
    controls.target.add(moved);
    lookNow.copy(controls.target);
  }
  lastLookGoal.copy(lookGoal);
  controls.update();
  if (env.gas) updateDepth();

  // The shadow box follows the camera's target so shadows stay sharp where we look
  sunLight.target.position.copy(controls.target);
  sunLight.position.copy(controls.target).add(
    V(env.sunDirection[0], env.sunDirection[1], env.sunDirection[2]).normalize().multiplyScalar(200)
  );

  renderer.render(scene, camera);
}

// After the landing: what happened next (the site's real status and its main findings), so the scene
// doesn't just stop. The pause button is not needed any more; "Go back" and the replay button stay.
const afterBox = document.getElementById("landing-after");
function showAfterLanding() {
  pauseButton.classList.add("hidden");
  if (!afterBox || !item) return;
  const lines = [item.status && item.status.text].concat((item.contributions || []).slice(0, 2)).filter(Boolean);
  afterBox.innerHTML = "";
  if (!lines.length) return;
  const title = document.createElement("p");
  title.className = "la-title";
  title.textContent = "What happened next";
  afterBox.appendChild(title);
  const list = document.createElement("ul");
  lines.forEach(function (text) {
    const li = document.createElement("li");
    li.textContent = text;
    list.appendChild(li);
  });
  afterBox.appendChild(list);
  afterBox.classList.remove("hidden");
}
function hideAfterLanding() {
  pauseButton.classList.remove("hidden");
  if (afterBox) afterBox.classList.add("hidden");
}
const goBackButton = document.getElementById("landing-goback");
if (goBackButton) goBackButton.addEventListener("click", function () {
  const back = document.getElementById("landing-back");
  if (back) back.click();
});

pauseButton.addEventListener("click", function () {
  if (finished) return;
  paused = !paused;
  pauseButton.textContent = paused ? "Resume" : "Pause";
  play(paused ? "pause" : "resume");
});

againButton.addEventListener("click", function () {
  if (item) restart();
});

cameraButton.addEventListener("click", function () {
  play("toggleOn");
  setAutoCamera();
});

// ----- Functions that main.js uses -----

// Returns true if this hardware has a landing scene
export function hasLanding(hardware) {
  return Boolean(hardware && hardware.landing && ENVIRONMENTS[hardware.destination]);
}

// ----- The real landing site: a card with a map of the world, a dot at the real coordinates, the
// place name, the coordinates and the date. It appears as the spacecraft reaches the ground, so you can
// see at once that this is where the real mission landed. -----
const SITE_MAPS = {
  Moon: "assets/textures/moon.jpg", Mars: "assets/textures/mars.jpg", Mercury: "assets/textures/mercury.jpg",
  Venus: "assets/textures/venus_surface.jpg", Jupiter: "assets/textures/jupiter.jpg", Saturn: "assets/textures/saturn.jpg",
  Earth: "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/earth_atmos_2048.jpg"
};
const siteCard = document.getElementById("landing-site");
function formatCoordinate(value, positive, negative) {
  return Math.abs(value).toFixed(2) + "° " + (value >= 0 ? positive : negative);
}
function fillSiteCard(hardware) {
  if (!siteCard) return false;
  siteCard.classList.add("hidden");
  siteCard.classList.remove("on");
  if (!hardware || typeof hardware.lat !== "number" || typeof hardware.lon !== "number") return false;
  const mapBox = siteCard.querySelector(".ls-map");
  const img = siteCard.querySelector(".ls-map img");
  const dot = siteCard.querySelector(".ls-dot");
  const url = SITE_MAPS[hardware.destination];
  mapBox.classList.toggle("hidden", !url);
  if (url) {
    img.src = url;
    img.alt = "Map of " + hardware.destination + " with the landing site marked";
    // the maps are equirectangular: longitude -180 to 180 left to right, latitude 90 to -90 top to bottom
    const lon = ((hardware.lon + 540) % 360) - 180;
    dot.style.left = ((lon + 180) / 360 * 100).toFixed(2) + "%";
    dot.style.top = ((90 - hardware.lat) / 180 * 100).toFixed(2) + "%";
  }
  siteCard.querySelector(".ls-place").textContent = hardware.location || hardware.destination;
  siteCard.querySelector(".ls-coords").textContent = formatCoordinate(hardware.lat, "N", "S") + ", " + formatCoordinate(hardware.lon, "E", "W");
  siteCard.querySelector(".ls-mission").textContent = [hardware.mission, hardware.landingDate].filter(Boolean).join(" · ");
  siteCard.title = hardware.coordinateNote || "";
  return true;
}
let siteCardReady = false;
function updateSiteCard() {
  if (!siteCard || !siteCardReady) return;
  const show = totalTime > 0 && elapsed / totalTime > 0.62;
  if (show && siteCard.classList.contains("hidden")) {
    // in the mission player, just above its scene bar (it used to sit behind the controls)
    const bar = document.getElementById("mp-timeline");
    if (document.body.classList.contains("player-on") && bar && bar.getBoundingClientRect && bar.getBoundingClientRect().top > 0) {
      // above the subtitle too (Master Doc 13), with room for a two-line subtitle
      const cap = document.getElementById("mp-caption");
      let top = bar.getBoundingClientRect().top;
      if (cap && cap.getBoundingClientRect && window.innerWidth > 760) top = Math.min(top, cap.getBoundingClientRect().bottom - 84);
      siteCard.style.bottom = Math.round(window.innerHeight - top + 12) + "px";
    } else {
      siteCard.style.bottom = "";
    }
    siteCard.classList.remove("hidden");
    requestAnimationFrame(function () { siteCard.classList.add("on"); });
  } else if (!show && !siteCard.classList.contains("hidden")) {
    siteCard.classList.add("hidden");
    siteCard.classList.remove("on");
  }
}

// Jump to a point in the landing (0 to 1), for the mission player's progress bar: the scene is
// replayed quickly from the start without drawing, so every part is where it should be
export function seekLanding(fraction) {
  if (!item || !phases.length) return;
  restart();
  const goal = Math.max(0, Math.min(0.995, fraction)) * totalTime;
  const step = 1 / 30;
  frameDt = step;
  while (elapsed < goal) {
    phaseTime += step;
    elapsed += step;
    const phase = phases[phaseIndex];
    phase.update(Math.min(phaseTime / phase.duration, 1), step);
    if (phaseTime >= phase.duration && phaseIndex < phases.length - 1) enterPhase(phaseIndex + 1);
  }
  particles.clear();
  camera.position.copy(cameraGoal);
  lookNow.copy(lookGoal);
  controls.target.copy(lookNow);
  updateSiteCard();
}

export function startLanding(hardware) {
  init();
  resize();
  item = hardware;
  titleBox.textContent = hardware.name;
  applyEnvironment(hardware.destination);
  siteCardReady = fillSiteCard(hardware);
  restart();

  running = true;
  lastTime = performance.now();
  if (rafId === null) rafId = requestAnimationFrame(frame);
}

// For the mission player
export function pauseLanding(on) {
  if (finished) return;
  paused = Boolean(on);
  pauseButton.textContent = paused ? "Resume" : "Pause";
}

export function landingProgress() {
  return totalTime ? Math.min(1, elapsed / totalTime) : 0;
}

export function stopLanding() {
  running = false;
  if (siteCard) { siteCard.classList.add("hidden"); siteCard.classList.remove("on"); }
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (particles) particles.clear();
  setLoop("engine", 0);
  setLoop("wind", 0);
}
