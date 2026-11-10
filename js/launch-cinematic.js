// The launch cinematic.
// Full intro ("Begin Exploration"): crew walkout, then the view from inside the spacecraft, then liftoff.
// Liftoff only (before every mission replay): just the liftoff part, with the mission's name as the caption.
// Mission launches ("mission: true"): liftoff, then the climb to orbit, following NASA's usual sequence:
//   gravity turn, Max Q, booster separation, main engine cutoff and stage separation, second-stage burn,
//   fairing (or launch escape tower) separation, and orbit insertion. Times are typical and compressed.
// The vehicle is the mission's rocket model (simplified), or a generic one.
// The camera shakes in the cabin and liftoff parts only.

import * as THREE from "three";
import { createLauncher, createAstronaut, strut } from "./models.js";
import { createRocket } from "./rockets.js";
import { createParticleSystem } from "./particles.js";
import { play, isSoundOn, setSoundOn, onSoundChange, isGroupOn } from "./sounds.js";
import { wantsReducedMotion } from "./settings.js";
import { getPlaybackSpeed } from "./playback.js";
import { guardContextLoss } from "./webgl-context.js";
import { onResizeDebounced } from "./resize.js";

const launchScreen = document.getElementById("launch-screen");
const canvas = document.getElementById("launch-canvas");
const cabin = document.getElementById("cabin-overlay");
const captionBox = document.getElementById("cinema-caption");
const countdownBox = document.getElementById("cinema-countdown");
const fadeBox = document.getElementById("cinema-fade");
const skipButton = document.getElementById("cinema-skip");
const soundButton = document.getElementById("cinema-sound");
const progressBar = launchScreen.querySelector(".cinema-progress span");
const noteBox = document.getElementById("cinema-note");

// duration = seconds. Shorten these to make the intro faster.
const SCENES = [
  {
    id: "walkout",
    caption: "The crew walks out to the launch tower to board the spacecraft.",
    duration: 5
  },
  {
    id: "cabin",
    caption: "Final checks. Outside the window, the crew access arm swings away.",
    duration: 4.5
  },
  {
    id: "liftoff",
    caption: "Ignition... and liftoff. The vehicle climbs toward space.",
    duration: 9
  },
  {
    id: "ascent",
    caption: "Climbing to orbit.",
    duration: 25
  },
  {
    id: "launch",
    caption: "Final countdown.",
    duration: 16
  }
];
const LAUNCH_IGNITION = 6.2;   // seconds into the mission launch scene: engines start
const LAUNCH_LIFTOFF = 9;      // hold-down arms release

// Where the first stage separates, as a share of the model's height (simplified)
const STAGE_SPLIT = {
  "saturn-v": 0.38, "saturn-v-skylab": 0.38, "titan-2": 0.62, "titan-3e": 0.55, "titan-4b": 0.55, "atlas-centaur": 0.62,
  "delta-2": 0.66, "delta-2-heavy": 0.66, "atlas-v-401": 0.6, "atlas-v-411": 0.6, "atlas-v-541": 0.58, "atlas-v-551": 0.58,
  "delta-4-heavy": 0.66, "falcon-9": 0.68, "sls": 0.66, "proton": 0.45, "ariane-5": 0.62
};
// Crewed rockets drop a launch escape tower instead of a payload fairing
const ESCAPE_TOWER = { "saturn-v": true, "sls": true };

const LIFTOFF_AT = 2.5;          // seconds into the liftoff part
const BOOSTER_SEPARATION = 4.5;  // seconds after liftoff
const ROCKET_SCALE = 8;
const PAD_Y = 0.6;
const reduceMotion =
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ----- Small helpers -----
function random(min, max) {
  return min + Math.random() * (max - min);
}

function smoothstep(a, b, x) {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}

function pad2(n) {
  return n < 10 ? "0" + n : String(n);
}

function formatCountdown(seconds) {
  const total = Math.max(0, Math.round(Math.abs(seconds)));
  return (seconds > 0.5 ? "T-" : "T+") + "00:" + pad2(Math.floor(total / 60)) + ":" + pad2(total % 60);
}

// ----- State -----
let renderer = null;
let scene = null;
let camera = null;
let particles = null;
let sky = null;
let skyMaterial = null;
let stars = null;
let padLight = null;
let armPivot = null;
let towerGroup = null;
let frameScale = 1; // bigger for tall rockets, so the camera stands farther back
let rocketRoot = null;
let rocketModel = null;
let boosters = [];
let detached = [];
const astronauts = [];

let activeScenes = SCENES;   // all three, or only the liftoff (plus the climb to orbit for missions)
let rocketKey = null;
let sunLight = null;
let sunSprite = null;
let padGroup = null;
let earthBall = null;
let ascent = null;            // state of the climb to orbit
let totalTime = 0;
let captionOverride = null;  // the mission name and date, in liftoff-only mode

let running = false;
let rafId = null;
let startTime = 0;
let lastTime = 0;
let currentScene = -1;
let finishCallback = null;
let soundOn = isSoundOn() && isGroupOn("effects"); // follows Sound on/off and the "Spacecraft" group
let audio = null;
let lastBeep = -1;
const carry = { fire: 0, smoke: 0, trail: 0 };

// ----- Building the world -----
function makeGroundTexture() {
  const drawing = document.createElement("canvas");
  drawing.width = 256;
  drawing.height = 256;
  const ctx = drawing.getContext("2d");
  ctx.fillStyle = "#6e6a50";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3500; i++) {
    const shade = Math.floor(random(60, 130));
    ctx.fillStyle = "rgba(" + shade + "," + (shade - 6) + "," + (shade - 30) + ",0.35)";
    ctx.fillRect(Math.random() * 256, Math.random() * 256, random(1, 4), random(1, 4));
  }
  const texture = new THREE.CanvasTexture(drawing);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(200, 200);
  return texture;
}

function makeSunTexture() {
  const drawing = document.createElement("canvas");
  drawing.width = 128;
  drawing.height = 128;
  const ctx = drawing.getContext("2d");
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,240,200,1)");
  gradient.addColorStop(0.25, "rgba(255,190,110,0.6)");
  gradient.addColorStop(1, "rgba(255,150,60,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(drawing);
}

// The service tower beside the rocket. height in meters.
function buildTower(height) {
  const tower = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x8c9199, roughness: 0.7, metalness: 0.5 });
  const half = 3.5;

  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (c) {
    const column = new THREE.Mesh(new THREE.BoxGeometry(1.1, height, 1.1), steel);
    column.position.set(c[0] * half, height / 2, c[1] * half);
    tower.add(column);
  });

  for (let y = 8; y <= height; y += 9) {
    [-half, half].forEach(function (offset) {
      const beamX = new THREE.Mesh(new THREE.BoxGeometry(half * 2, 0.6, 0.6), steel);
      beamX.position.set(0, y, offset);
      tower.add(beamX);

      const beamZ = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, half * 2), steel);
      beamZ.position.set(offset, y, 0);
      tower.add(beamZ);
    });
  }

  for (let y = 8; y < height - 9; y += 9) {
    tower.add(strut(new THREE.Vector3(-half, y, half), new THREE.Vector3(half, y + 9, half), 0.28, steel));
    tower.add(strut(new THREE.Vector3(half, y, -half), new THREE.Vector3(-half, y + 9, -half), 0.28, steel));
  }

  return tower;
}

function buildEnvironment() {
  padGroup = new THREE.Group();
  scene.add(padGroup);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(8000, 8000),
    new THREE.MeshStandardMaterial({ map: makeGroundTexture(), roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.userData.intro = true;
  padGroup.add(ground);

  const padMaterial = new THREE.MeshStandardMaterial({ color: 0xb8b8b4, roughness: 0.9 });
  const padMesh = new THREE.Mesh(new THREE.CylinderGeometry(24, 26, PAD_Y, 64), padMaterial);
  padMesh.position.y = PAD_Y / 2;
  padGroup.add(padMesh);

  const trench = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 7, PAD_Y + 0.04, 40),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 1 })
  );
  trench.position.y = PAD_Y / 2;
  padGroup.add(trench);

  const walkway = new THREE.Mesh(
    new THREE.BoxGeometry(160, 0.12, 5),
    new THREE.MeshStandardMaterial({ color: 0x2b2e33, roughness: 0.95 })
  );
  walkway.position.set(0, 0.06, 14);
  padGroup.add(walkway);

  // Service tower and the crew access arm (rebuilt to fit each rocket in spawnRocket)
  towerGroup = buildTower(82);
  towerGroup.position.set(15, 0, 0);
  padGroup.add(towerGroup);

  armPivot = new THREE.Group();
  armPivot.position.set(11.5, 61, 0);
  const armMaterial = new THREE.MeshStandardMaterial({ color: 0x8c9199, roughness: 0.7, metalness: 0.5 });
  const arm = new THREE.Mesh(new THREE.BoxGeometry(9, 1.6, 2.2), armMaterial);
  arm.position.x = -4.5;
  armPivot.add(arm);
  const whiteRoom = new THREE.Mesh(
    new THREE.BoxGeometry(3, 3, 3),
    new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.7 })
  );
  whiteRoom.position.set(-8.3, 0.2, 0);
  armPivot.add(whiteRoom);
  padGroup.add(armPivot);

  // Lightning towers with red lights
  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.6, roughness: 0.6 });
  const redLight = new THREE.SpriteMaterial({
    map: makeSunTexture(), color: 0xff3030, transparent: true, depthWrite: false, fog: false
  });
  [[-70, -40], [60, 70], [-25, 100]].forEach(function (p) {
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.6, 90, 0.6), poleMaterial);
    pole.position.set(p[0], 45, p[1]);
    padGroup.add(pole);

    const light = new THREE.Sprite(redLight);
    light.scale.set(4, 4, 1);
    light.position.set(p[0], 91, p[1]);
    padGroup.add(light);
  });

  // Hills on the horizon
  const hillMaterial = new THREE.MeshStandardMaterial({ color: 0x46566a, roughness: 1, flatShading: true });
  for (let i = 0; i < 28; i++) {
    const angle = (i / 28) * Math.PI * 2;
    const hillHeight = random(40, 110);
    const hill = new THREE.Mesh(new THREE.ConeGeometry(random(220, 420), hillHeight, 7), hillMaterial);
    hill.position.set(Math.cos(angle) * 1700, hillHeight / 2, Math.sin(angle) * 1700);
    hill.userData.intro = true;
    padGroup.add(hill);
  }
  buildCoast();
}

// ----- The mission launch site: a coastal launch complex in the morning (different from the intro) -----
// Flat scrubland, a crawlerway, an assembly building in the distance, a water tower and the ocean beside the pad.
let coastGroup = null;

function coastTexture() {
  const drawing = document.createElement("canvas");
  drawing.width = 512;
  drawing.height = 512;
  const ctx = drawing.getContext("2d");
  ctx.fillStyle = "#6d7a4a";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const g = Math.floor(random(70, 130));
    ctx.fillStyle = Math.random() < 0.25 ? "rgba(" + (g + 50) + "," + (g + 40) + "," + (g - 10) + ",0.4)" : "rgba(" + (g - 20) + "," + g + "," + (g - 45) + ",0.35)";
    ctx.fillRect(Math.random() * 512, Math.random() * 512, random(1, 4), random(1, 4));
  }
  const texture = new THREE.CanvasTexture(drawing);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(160, 160);
  return texture;
}

function buildCoast() {
  coastGroup = new THREE.Group();
  coastGroup.visible = false;
  scene.add(coastGroup);
  const land = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshStandardMaterial({ map: coastTexture(), roughness: 1 }));
  land.rotation.x = -Math.PI / 2;
  land.position.y = -0.05;
  coastGroup.add(land);
  // The Atlantic Ocean, just east of the pad, with a sandy beach
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshStandardMaterial({ color: 0x2a6c94, roughness: 0.18, metalness: 0.35 }));
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(4500 + 520, 0.02, 0);
  coastGroup.add(ocean);
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(60, 9000), new THREE.MeshStandardMaterial({ color: 0xd9c9a0, roughness: 1 }));
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(500, 0.01, 0);
  coastGroup.add(beach);
  // Crawlerway: two gravel lanes leading to the assembly building
  const gravel = new THREE.MeshStandardMaterial({ color: 0xbab3a4, roughness: 1 });
  [-9, 9].forEach(function (offset) {
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(12, 2400), gravel);
    lane.rotation.x = -Math.PI / 2;
    lane.rotation.z = -0.62;
    lane.position.set(-700 + offset, 0.03, -900);
    coastGroup.add(lane);
  });
  // A large assembly building on the horizon (simple shape, no logos)
  const building = new THREE.Mesh(new THREE.BoxGeometry(220, 160, 160), new THREE.MeshStandardMaterial({ color: 0xd5d8dc, roughness: 0.8 }));
  building.position.set(-1500, 80, -1900);
  coastGroup.add(building);
  const doors = new THREE.Mesh(new THREE.PlaneGeometry(40, 140), new THREE.MeshStandardMaterial({ color: 0x9aa2ad, roughness: 0.7 }));
  doors.position.set(-1500, 72, -1819);
  coastGroup.add(doors);
  // Water tower for the sound suppression system
  const steel = new THREE.MeshStandardMaterial({ color: 0xc9ccd0, roughness: 0.5, metalness: 0.5 });
  for (let i = 0; i < 4; i++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 70, 6), steel);
    leg.position.set(170 + (i % 2) * 14 - 7, 35, -230 + Math.floor(i / 2) * 14 - 7);
    coastGroup.add(leg);
  }
  const tank = new THREE.Mesh(new THREE.SphereGeometry(14, 20, 14), steel);
  tank.position.set(170, 80, -230);
  coastGroup.add(tank);
  // Low clouds far away
  const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 18; i++) {
    const cloud = new THREE.Mesh(new THREE.SphereGeometry(random(60, 140), 10, 8), cloudMaterial);
    const angle = random(0, Math.PI * 2);
    cloud.scale.set(1.8, 0.35, 1);
    cloud.position.set(Math.cos(angle) * random(2400, 3400), random(380, 650), Math.sin(angle) * random(2400, 3400));
    coastGroup.add(cloud);
  }
}

// Day or sunset: the intro uses the sunset hills, mission launches the coastal site in daylight
function setLaunchSite(coast) {
  padGroup.children.forEach(function (child) { if (child.userData.intro) child.visible = !coast; });
  coastGroup.visible = coast;
  skyMaterial.uniforms.uHorizon.value.set(coast ? 0xd6e7f6 : 0xffb27a);
  skyMaterial.uniforms.uMid.value.set(coast ? 0x86b6ea : 0x6f86c6);
  skyMaterial.uniforms.uZenith.value.set(coast ? 0x2c64c4 : 0x14214f);
  scene.fog = coast ? new THREE.Fog(0xcfe0f2, 400, 5200) : new THREE.Fog(0xf0b98a, 120, 2600);
  sunLight.color.set(coast ? 0xfff6e8 : 0xffc48a);
  sunLight.intensity = coast ? 3.0 : 2.4;
  sunLight.position.set(coast ? -200 : -300, coast ? 320 : 70, coast ? 400 : 500);
  sunSprite.visible = !coast;
}

// Earth seen from high up during the climb to orbit: oceans, clouds and a thin blue atmosphere
function earthTexture() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const ctx = c.getContext("2d");
  if (!ctx || !ctx.fillRect) return null;
  ctx.fillStyle = "#1d4f8a";
  ctx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? "rgba(70,110,60,0.85)" : "rgba(150,130,90,0.8)";
    ctx.beginPath && ctx.beginPath();
    if (ctx.ellipse) { ctx.ellipse(random(0, 512), random(40, 216), random(20, 70), random(10, 35), random(0, 3), 0, Math.PI * 2); ctx.fill(); }
  }
  for (let i = 0; i < 140; i++) {
    ctx.fillStyle = "rgba(255,255,255," + random(0.25, 0.7) + ")";
    if (ctx.ellipse) { ctx.beginPath(); ctx.ellipse(random(0, 512), random(0, 256), random(10, 45), random(3, 10), random(-0.3, 0.3), 0, Math.PI * 2); ctx.fill(); }
  }
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const EARTH_R = 6000;   // display units (about 1 unit per km at this scale)
function buildEarthBall() {
  earthBall = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 96, 64), new THREE.MeshStandardMaterial({ map: earthTexture(), roughness: 0.8, fog: false }));
  earthBall.add(ball);
  const air = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.012, 96, 64), new THREE.MeshBasicMaterial({
    color: 0x6fb2ff, transparent: true, opacity: 0.28, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, fog: false
  }));
  earthBall.add(air);
  earthBall.visible = false;
  scene.add(earthBall);
}

function buildSky() {
  skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uSpace: { value: 0 },
      uHorizon: { value: new THREE.Color(0xffb27a) },
      uMid: { value: new THREE.Color(0x6f86c6) },
      uZenith: { value: new THREE.Color(0x14214f) }
    },
    vertexShader:
      "varying vec3 vDir;" +
      "void main() { vDir = normalize(position);" +
      " gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader:
      "uniform float uSpace; uniform vec3 uHorizon; uniform vec3 uMid; uniform vec3 uZenith;" +
      "varying vec3 vDir;" +
      "void main() {" +
      " float h = clamp(vDir.y, 0.0, 1.0);" +
      " vec3 sky = mix(uHorizon, uMid, smoothstep(0.0, 0.25, h));" +
      " sky = mix(sky, uZenith, smoothstep(0.15, 0.9, h));" +
      " vec3 space = vec3(0.005, 0.01, 0.03);" +
      " gl_FragColor = vec4(mix(sky, space, uSpace), 1.0); }"
  });
  sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), skyMaterial);
  sky.renderOrder = -2;
  scene.add(sky);

  const starPositions = new Float32Array(2500 * 3);
  for (let i = 0; i < 2500; i++) {
    const direction = new THREE.Vector3(random(-1, 1), random(-1, 1), random(-1, 1)).normalize();
    starPositions[i * 3] = direction.x * 2500;
    starPositions[i * 3 + 1] = direction.y * 2500;
    starPositions[i * 3 + 2] = direction.z * 2500;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      color: 0xffffff, size: 2, sizeAttenuation: false,
      transparent: true, opacity: 0, depthWrite: false, depthTest: false, fog: false
    })
  );
  stars.renderOrder = -1;
  scene.add(stars);

  // The low sun, in the direction the sun light comes from
  sunSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeSunTexture(), transparent: true, depthWrite: false, depthTest: false,
      blending: THREE.AdditiveBlending, fog: false
    })
  );
  sunSprite.scale.set(900, 900, 1);
  sunSprite.position.set(-300, 70, 500).normalize().multiplyScalar(2200);
  sunSprite.renderOrder = -0.5;
  scene.add(sunSprite);
}

function spawnRocket(rocketType, look) {
  if (rocketRoot) scene.remove(rocketRoot);
  detached.forEach(function (booster) { scene.remove(booster); });
  detached = [];

  rocketRoot = new THREE.Group();
  rocketModel = createRocket(rocketType, look) || createLauncher(); // the mission's real rocket, or the generic one
  rocketModel.scale.setScalar(ROCKET_SCALE);
  rocketModel.traverse(function (o) {
    if (o.isMesh && o.material && o.material.clone) o.material = o.material.clone();
  });

  // Fit the tower and the camera to this rocket (sizes in meters)
  const heightMeters = rocketModel.userData.height * ROCKET_SCALE;
  const radiusMeters = (rocketModel.userData.radius || 0.95) * ROCKET_SCALE;
  frameScale = Math.max(1, heightMeters / 71);
  const towerX = Math.max(15, radiusMeters + 7);
  padGroup.remove(towerGroup);
  towerGroup = buildTower(Math.max(60, Math.ceil(heightMeters + 6)));
  towerGroup.position.set(towerX, 0, 0);
  padGroup.add(towerGroup);
  armPivot.position.set(towerX - 3.5, Math.min(61, heightMeters * 0.86), 0);
  rocketRoot.add(rocketModel);
  rocketRoot.position.set(0, PAD_Y, 0);
  boosters = rocketModel.userData.boosters.slice();
  scene.add(rocketRoot);
}

function spawnAstronauts() {
  astronauts.forEach(function (astronaut) { scene.remove(astronaut); });
  astronauts.length = 0;

  for (let i = 0; i < 4; i++) {
    const astronaut = createAstronaut();
    astronaut.rotation.y = Math.PI / 2; // face +x
    scene.add(astronaut);
    astronauts.push(astronaut);
  }
}

function init() {
  if (renderer) return;

  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  guardContextLoss(canvas);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5)); // sharp: the screen's real pixel density

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf0b98a, 120, 2600);

  camera = new THREE.PerspectiveCamera(50, 1, 0.5, 20000);

  scene.add(new THREE.HemisphereLight(0x9fb4e8, 0x4a3d33, 0.9));
  sunLight = new THREE.DirectionalLight(0xffc48a, 2.4);
  sunLight.position.set(-300, 70, 500);
  scene.add(sunLight);

  padLight = new THREE.PointLight(0xff9a45, 0, 240, 1.2);
  padLight.position.set(0, 5, 0);
  scene.add(padLight);

  buildSky();
  buildEnvironment();
  buildEarthBall();
  particles = createParticleSystem(scene, 900);
  if (renderer) renderer.localClippingEnabled = true;

  resize();
}

function resize() {
  if (!renderer) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
onResizeDebounced(resize);

// ----- Sound (made with the browser's audio, no sound files) -----
function startAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const ctx = new AudioContextClass();
    const master = ctx.createGain();
    master.gain.value = soundOn ? 0.8 : 0;
    master.connect(ctx.destination);

    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 200;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    noise.start();

    audio = { ctx: ctx, master: master, filter: filter, gain: gain };
  } catch (error) {
    audio = null;
  }
}

function stopAudio() {
  if (audio) {
    try { audio.ctx.close(); } catch (error) { /* ignore */ }
    audio = null;
  }
}

function setRumble(level, brightness) {
  if (!audio) return;
  audio.gain.gain.setTargetAtTime(level, audio.ctx.currentTime, 0.15);
  audio.filter.frequency.setTargetAtTime(brightness, audio.ctx.currentTime, 0.15);
}

function beep() {
  if (!audio || !soundOn) return;
  const oscillator = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.0001, audio.ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.2, audio.ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.ctx.currentTime + 0.12);
  oscillator.connect(gain);
  gain.connect(audio.master);
  oscillator.start();
  oscillator.stop(audio.ctx.currentTime + 0.15);
}

function updateSoundButton() {
  soundButton.textContent = soundOn ? "Sound: On" : "Sound: Off";
  soundButton.setAttribute("aria-pressed", String(soundOn));
}

soundButton.setAttribute("data-silent", "");
soundButton.addEventListener("click", function () {
  setSoundOn(!isSoundOn()); // the same switch as the top bars
});
onSoundChange(function () {
  soundOn = isSoundOn() && isGroupOn("effects");
  if (audio) audio.master.gain.value = soundOn ? 0.8 : 0;
  updateSoundButton();
});
updateSoundButton();

// ----- Screen fade between scenes -----
function blink() {
  fadeBox.style.transition = "none";
  fadeBox.style.opacity = "1";
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      fadeBox.style.transition = "opacity 0.5s ease";
      fadeBox.style.opacity = "0";
    });
  });
}

function enterScene(index) {
  currentScene = index;
  const id = activeScenes[index].id;

  captionBox.textContent =
    id === "liftoff" && captionOverride ? captionOverride : activeScenes[index].caption;
  cabin.classList.toggle("visible", id === "cabin");
  countdownBox.classList.toggle("hidden", id === "walkout");

  rocketRoot.visible = id !== "cabin"; // in the cabin we are inside the spacecraft
  if (id === "ascent") beginAscent();
  if (id === "launch") { ignitionPlayed = false; countdownBox.classList.remove("hidden"); }
  astronauts.forEach(function (astronaut) {
    astronaut.visible = id === "walkout"; // the crew is inside the vehicle after the walkout
  });
  camera.fov = id === "cabin" ? 62 : id === "liftoff" ? 40 : id === "ascent" ? 45 : id === "launch" ? 30 : 50;
  camera.updateProjectionMatrix();

  carry.fire = 0;
  carry.smoke = 0;
  carry.trail = 0;
  lastBeep = -1;

  blink();
}

// ----- Camera shake -----
function shakeCamera(amount, target) {
  if (reduceMotion || wantsReducedMotion() || amount <= 0) return;
  camera.position.x += random(-1, 1) * amount;
  camera.position.y += random(-1, 1) * amount;
  target.x += random(-1, 1) * amount * 0.6;
  target.y += random(-1, 1) * amount * 0.6;
}

// ----- Scene 1: crew walkout -----
function updateScene1(t) {
  const progress = t / SCENES[0].duration;
  const leadX = -34 + 1.5 * t;

  astronauts.forEach(function (astronaut, i) {
    const phase = t * 5.2 + i * 0.7;
    astronaut.position.set(leadX - i * 2.3, Math.abs(Math.sin(phase)) * 0.04, 14 + (i % 2 === 0 ? 0.55 : -0.55));
    astronaut.userData.walk(phase);
  });

  camera.position.set(
    leadX - 9.5 + Math.sin(t * 1.7) * 0.1,
    1.5 + 1.8 * progress,
    7.5 - 1.5 * progress
  );
  camera.lookAt(leadX + 8 + 8 * progress, 5 + 26 * progress, 2 - 6 * progress);

  setRumble(0.03, 160);
}

// ----- Scene 2: inside the spacecraft -----
function updateScene2(t) {
  const progress = t / SCENES[1].duration;

  armPivot.rotation.y = smoothstep(0.3, 3.8, t) * 1.55; // the crew access arm swings away

  camera.position.set(0.2 + Math.sin(t * 1.3) * 0.03, 60.8, 0.4);
  const target = new THREE.Vector3(-45 - 20 * progress, 46, 400);
  shakeCamera(0.01 + 0.07 * progress, target);
  camera.lookAt(target);

  const countdown = 30 - 26 * progress; // T-30 ... T-4
  countdownBox.textContent = formatCountdown(countdown);

  const whole = Math.ceil(countdown);
  if (whole <= 10 && whole !== lastBeep) {
    lastBeep = whole;
    beep();
  }

  setRumble(0.05 + 0.1 * progress, 180 + 120 * progress);
}

// ----- Scene 3: liftoff -----
const cameraTarget = new THREE.Vector3(0, 32, 0);

function emitFire(base, power) {
  // The mission rockets list their engines in userData.exhaust (with a size for each)
  const exhaust = rocketModel.userData.exhaust;
  if (exhaust) {
    const separated = boosters.length === 0;
    exhaust.forEach(function (engine) {
      if (engine.booster && separated) return; // the boosters have dropped away
      const position = new THREE.Vector3(
        base.x + engine.point.x * ROCKET_SCALE,
        base.y + engine.point.y * ROCKET_SCALE,
        base.z + engine.point.z * ROCKET_SCALE
      );
      const velocity = new THREE.Vector3(random(-3, 3), -random(26, 46) * power, random(-3, 3));
      const size = engine.size * 3.2 * (0.6 + 0.6 * power);
      particles.emit(true, position, velocity, size, 1.5, random(0.22, 0.42), 0.85, undefined, 0);
    });
    return;
  }

  const points = rocketModel.userData.exhaustPoints;
  points.forEach(function (point, index) {
    const isBooster = index >= 4;
    const position = new THREE.Vector3(
      base.x + point.x * ROCKET_SCALE,
      base.y + point.y * ROCKET_SCALE,
      base.z + point.z * ROCKET_SCALE
    );
    const velocity = new THREE.Vector3(random(-3, 3), -random(26, 46) * power, random(-3, 3));
    const size = (isBooster ? 8 : 6) * (0.6 + 0.6 * power);
    particles.emit(true, position, velocity, size, 1.5, random(0.22, 0.42), 0.85, undefined, 0);
  });
}

function emitSmoke(base, rocketY, power, t) {
  // Smoke and steam spreading over the pad (covers the bottom of the screen)
  if (rocketY < 160) {
    carry.smoke += (t < LIFTOFF_AT ? 40 + 60 * power : 150) * (1 / 60);
    while (carry.smoke >= 1) {
      carry.smoke -= 1;
      const angle = random(0, Math.PI * 2);
      const speed = random(6, t < LIFTOFF_AT ? 16 : 26);
      const position = new THREE.Vector3(random(-6, 6), PAD_Y + 1.5, random(-6, 6));
      const velocity = new THREE.Vector3(Math.cos(angle) * speed, random(0.5, 3), Math.sin(angle) * speed);
      const tint = Math.random() < 0.3 ? 0xffd9b0 : 0xffffff;
      particles.emit(false, position, velocity, random(12, 20), random(55, 90), random(6, 9), random(0.5, 0.7), tint, 0.3);
    }
  }

  // A trail left behind the rising vehicle
  if (rocketY > 6 && rocketY < 700) {
    carry.trail += 60 * (1 / 60);
    while (carry.trail >= 1) {
      carry.trail -= 1;
      const position = new THREE.Vector3(base.x + random(-2, 2), base.y - 2, base.z + random(-2, 2));
      const velocity = new THREE.Vector3(random(-2, 2), -random(0, 6), random(-2, 2));
      particles.emit(false, position, velocity, random(7, 11), random(30, 42), random(4, 6), 0.4, 0xffffff, 0.2);
    }
  }
}

function separateBoosters() {
  if (boosters.length > 0) play("separation");
  boosters.forEach(function (booster, index) {
    scene.attach(booster);
    // Push each booster outward, away from the core
    const out = new THREE.Vector3(booster.position.x, 0, booster.position.z);
    if (out.lengthSq() < 1e-6) out.set(index === 0 ? -1 : 1, 0, 0);
    out.normalize().multiplyScalar(10);
    booster.userData.velocity = new THREE.Vector3(out.x, 4, out.z);
    detached.push(booster);
  });
  boosters = [];
}

let ignitionPlayed = false;

function updateScene3(t, dt) {
  const sinceLiftoff = t - LIFTOFF_AT;
  if (sinceLiftoff > 0 && !ignitionPlayed) {
    ignitionPlayed = true;
    play("ignition"); // the deep boom of liftoff
  }
  const power = t < LIFTOFF_AT ? smoothstep(0.4, 2.6, t) * 0.8 : 1;

  let rocketY = PAD_Y;
  if (sinceLiftoff > 0) {
    rocketY += 0.5 * 8 * sinceLiftoff * sinceLiftoff + 2.2 * sinceLiftoff * sinceLiftoff * sinceLiftoff;
  }
  rocketRoot.position.y = rocketY;
  const base = rocketRoot.position;

  if (power > 0.02) {
    emitFire(base, power);
    emitSmoke(base, rocketY, power, t);
  }

  if (!hasAscent() && sinceLiftoff > BOOSTER_SEPARATION && boosters.length > 0) separateBoosters();

  // Boosters that have separated drift away
  detached.forEach(function (booster) {
    booster.position.addScaledVector(booster.userData.velocity, dt);
    booster.userData.velocity.y -= 6 * dt;
    booster.rotation.z += dt * 0.5;
  });

  // Light from the fire on the pad and the vehicle
  const flicker = 0.85 + Math.random() * 0.3;
  const nearGround = 1 - smoothstep(10, 120, rocketY);
  padLight.intensity = 320 * power * flicker * nearGround;
  padLight.position.set(0, base.y + 4, 0);

  // Sky turns to space as we climb
  const space = smoothstep(350, 1100, rocketY);
  skyMaterial.uniforms.uSpace.value = space;
  stars.material.opacity = space;

  // Camera: stays low and tilts up to follow the vehicle
  const desiredY = Math.max(32 * frameScale, rocketY * 0.85 + 10);
  cameraTarget.y += (desiredY - cameraTarget.y) * (1 - Math.exp(-3 * dt));

  camera.position.set(-58 * frameScale, 4 + Math.min(rocketY * 0.02, 25), 95 * frameScale);
  const target = cameraTarget.clone();

  let shake;
  if (t < 0.4) shake = 0.02;
  else if (t < LIFTOFF_AT) shake = 0.05 + 0.35 * smoothstep(0.4, LIFTOFF_AT, t);
  else shake = 0.05 + 0.4 * Math.exp(-sinceLiftoff * 0.45);
  shakeCamera(shake, target);
  camera.lookAt(target);

  countdownBox.textContent = formatCountdown(LIFTOFF_AT - t);

  setRumble(t < LIFTOFF_AT ? 0.1 + 0.4 * power : 0.7 * Math.exp(-sinceLiftoff * 0.18), 250 + 700 * power);

  // Fade to black at the end (a quick cut when the climb to orbit follows)
  const fadeOut = hasAscent() ? smoothstep(SCENES[2].duration - 0.5, SCENES[2].duration, t) : smoothstep(SCENES[2].duration - 1.6, SCENES[2].duration, t);
  if (fadeOut > 0) {
    fadeBox.style.transition = "none";
    fadeBox.style.opacity = String(fadeOut);
  }
}

// ----- Mission launch: countdown, water deluge, ignition, hold-down release, tower clear -----
// Camera shots like a launch broadcast: a long lens across the water, the engines, the tower, then tracking.
function emitDeluge(power) {
  // The sound suppression system floods the pad with water just before ignition
  for (let i = 0; i < 4; i++) {
    const angle = random(0, Math.PI * 2);
    const r = random(6, 12);
    const position = new THREE.Vector3(Math.cos(angle) * r, PAD_Y + 0.5, Math.sin(angle) * r);
    const velocity = new THREE.Vector3(Math.cos(angle) * random(2, 6), random(6, 14), Math.sin(angle) * random(2, 6)).multiplyScalar(power);
    particles.emit(false, position, velocity, random(1.5, 3), random(6, 10), random(1, 1.8), 0.55, 0xe8f2ff, 0.8);
  }
}

function updateMissionLaunch(t, dt) {
  const fadeIn = 1 - smoothstep(0, 0.8, t);
  const fadeOut = smoothstep(SCENES[4].duration - 0.5, SCENES[4].duration, t);
  fadeBox.style.transition = "none";
  fadeBox.style.opacity = String(Math.max(fadeIn, fadeOut));
  const sinceLiftoff = t - LAUNCH_LIFTOFF;
  const ignition = smoothstep(LAUNCH_IGNITION, LAUNCH_IGNITION + 2, t);
  if (sinceLiftoff > 0 && !ignitionPlayed) {
    ignitionPlayed = true;
    play("ignition");
  }
  // A heavy rocket climbs slowly at first, then faster and faster
  let rocketY = PAD_Y;
  if (sinceLiftoff > 0) rocketY += 0.5 * 2.2 * sinceLiftoff * sinceLiftoff + 0.25 * sinceLiftoff * sinceLiftoff * sinceLiftoff;
  rocketRoot.position.y = rocketY;
  rocketRoot.rotation.z = -smoothstep(LAUNCH_LIFTOFF + 4, SCENES[4].duration, t) * 0.08; // the roll and pitch program begins
  const base = rocketRoot.position;
  if (t > 2 && t < LAUNCH_LIFTOFF + 4) emitDeluge(t < LAUNCH_IGNITION ? 0.6 : 1);
  if (ignition > 0.01) {
    emitFire(base, ignition * (sinceLiftoff > 0 ? 1 : 0.85));
    emitSmoke(base, rocketY, ignition, sinceLiftoff > 0 ? LIFTOFF_AT + 0.1 : 0);
  }
  const flicker = 0.85 + Math.random() * 0.3;
  padLight.intensity = 320 * ignition * flicker * (1 - smoothstep(10, 140, rocketY));
  padLight.position.set(0, base.y + 4, 0);

  // Camera shots
  const s = frameScale;
  let shake = 0;
  let target;
  if (t < LAUNCH_IGNITION - 0.5) {
    // 1. Long lens across the water: the rocket on the pad, steam venting
    camera.fov = 16;
    camera.position.set(620 * s, 12, 820 * s);
    target = new THREE.Vector3(0, 32 * s, 0);
    if (Math.random() < 0.3) particles.emit(false, new THREE.Vector3(random(-2, 2), random(20, 50) * s, random(-2, 2)), new THREE.Vector3(random(1, 3), random(-0.5, 0.5), 0), random(1.5, 3), random(6, 10), 2.5, 0.4, 0xffffff, 0.5); // venting
  } else if (t < LAUNCH_LIFTOFF + 1.2) {
    // 2. Close on the engines: ignition, flames into the flame trench
    camera.fov = 38;
    camera.position.set(-34 * s, 4, 46 * s);
    target = new THREE.Vector3(0, 8 * s + Math.max(0, rocketY - PAD_Y) * 0.6, 0);
    shake = 0.05 + 0.25 * ignition;
  } else if (t < LAUNCH_LIFTOFF + 4.2) {
    // 3. From the base of the tower looking up as the rocket clears it
    camera.fov = 55;
    camera.position.set(22 * s, 3, 18 * s);
    target = new THREE.Vector3(0, rocketY + 30 * s, 0);
    shake = 0.35;
  } else {
    // 4. A tracking camera far away follows the rocket up into the sky
    camera.fov = 24;
    camera.position.set(-520 * s, 20, 760 * s);
    target = new THREE.Vector3(0, rocketY + 20 * s, 0);
    shake = 0.04;
  }
  camera.updateProjectionMatrix();
  shakeCamera(shake, target);
  camera.lookAt(target);

  const clock = LAUNCH_LIFTOFF - t;
  countdownBox.textContent = formatCountdown(clock);
  if (Math.floor(clock) !== lastBeep && clock > 0 && clock < 10) {
    lastBeep = Math.floor(clock);
    beep();
  }
  const space = smoothstep(500, 1600, rocketY);
  skyMaterial.uniforms.uSpace.value = space;
  setRumble(sinceLiftoff > 0 ? 0.75 * Math.exp(-sinceLiftoff * 0.12) : 0.05 + 0.5 * ignition, 250 + 700 * ignition);

  // Captions like a launch broadcast
  const step = t < 2 ? 0 : t < LAUNCH_IGNITION - 0.5 ? 1 : t < LAUNCH_LIFTOFF ? 2 : t < LAUNCH_LIFTOFF + 4 ? 3 : 4;
  if (step !== launchStep) {
    launchStep = step;
    captionBox.textContent = [
      captionOverride || "Final countdown.",
      "T-10 seconds. The water deluge floods the pad to absorb the sound and heat of the engines.",
      "Ignition sequence start. The engines build up to full thrust while the hold-down arms keep the rocket on the pad.",
      "Liftoff! The hold-down arms release. A heavy rocket rises slowly at first.",
      "The rocket has cleared the tower. The roll and pitch program turns it toward its path to orbit."
    ][step];
    blink();
  }
}
let launchStep = -1;

// ----- Scene 4: the climb to orbit -----
function hasAscent() {
  return activeScenes.some(function (scene) { return scene.id === "ascent"; });
}

// The steps of the climb: [time in this scene (s), typical mission time, caption]
function ascentSteps() {
  const tower = ESCAPE_TOWER[rocketKey];
  const shuttle = rocketKey === "shuttle" || rocketKey === "shuttle-sts31";
  return [
    [0, "T+0:40", "Gravity turn: the rocket tilts over and starts building the sideways speed needed for orbit."],
    [3.5, "T+1:15", "Max Q: the moment of maximum air pressure on the vehicle. The engines throttle down for a few seconds."],
    [7, "T+2:00", shuttle ? "The two solid rocket boosters burn out and separate." : "Side boosters burn out and separate (if the rocket has them)."],
    [10, "T+2:40", shuttle ? "The main engines keep firing as the Shuttle climbs." : "MECO: main engine cutoff. The first stage separates and falls away."],
    [11.6, "T+2:45", shuttle ? "Climbing above almost all of the air." : "Second-stage ignition. In near-vacuum the exhaust plume spreads wide."],
    [14.5, "T+3:20", tower ? "The launch escape tower is jettisoned: the crew no longer needs it." : "Fairing separation: the payload is above most of the air."],
    [20, "T+8:40", shuttle ? "MECO and external tank separation: the Shuttle is in orbit." : "Engine cutoff: orbit reached. Next comes the journey."]
  ];
}

function beginAscent() {
  particles.clear();
  padGroup.visible = false;
  coastGroup.visible = false;
  padLight.intensity = 0;
  scene.fog = null;
  earthBall.visible = true;
  // Above the air the sunlight is white, not orange
  sunLight.color.set(0xffffff);
  sunLight.intensity = 2.8;
  sunSprite.visible = false;
  detached.forEach(function (part) { scene.remove(part); });
  detached = [];
  rocketRoot.position.set(0, 0, 0);
  rocketRoot.rotation.set(0, 0, 0);
  const split = STAGE_SPLIT[rocketKey];
  ascent = {
    step: -1,
    split: split ? split * rocketModel.userData.height : 0,
    lower: null,
    upperPlane: null,
    engineOff: 0,
    secondStage: false,
    fairing: [],
    downrange: 0
  };
  fadeBox.style.transition = "none";
  fadeBox.style.opacity = "1";
}

const UPV = new THREE.Vector3(0, 1, 0);

// Cut the rocket in two at the stage line: the upper part keeps flying, the lower part falls away
function separateStage() {
  if (!ascent.split || ascent.lower) return;
  const localUpper = new THREE.Plane(new THREE.Vector3(0, 1, 0), -ascent.split);
  const localLower = new THREE.Plane(new THREE.Vector3(0, -1, 0), ascent.split);
  const lower = rocketModel.clone(true);
  lower.traverse(function (o) {
    if (o.isMesh && o.material && o.material.clone) o.material = o.material.clone();
  });
  rocketRoot.updateMatrixWorld(true);
  lower.matrixAutoUpdate = true;
  scene.add(lower);
  lower.position.setFromMatrixPosition(rocketModel.matrixWorld);
  lower.quaternion.setFromRotationMatrix(rocketModel.matrixWorld);
  lower.scale.setScalar(ROCKET_SCALE);
  lower.userData.velocity = new THREE.Vector3(0, -14, 0).applyQuaternion(rocketRoot.quaternion);
  lower.userData.spin = random(-0.25, 0.25);
  ascent.lower = lower;
  ascent.planes = [
    { object: rocketModel, local: localUpper, world: new THREE.Plane() },
    { object: lower, local: localLower, world: new THREE.Plane() }
  ];
  ascent.planes.forEach(function (p) {
    p.object.traverse(function (o) { if (o.isMesh && o.material) o.material.clippingPlanes = [p.world]; });
  });
  updateClipping();
  play("separation");
}

function updateClipping() {
  if (!ascent || !ascent.planes) return;
  ascent.planes.forEach(function (p) {
    p.object.updateMatrixWorld(true);
    p.world.copy(p.local).applyMatrix4(p.object.matrixWorld);
  });
}

// Two halves of the nose shell drift apart (fairing or escape tower)
function separateNose() {
  const top = rocketModel.userData.height * ROCKET_SCALE;
  const radius = Math.max(1.5, (rocketModel.userData.radius || 1) * ROCKET_SCALE * 0.5);
  const material = new THREE.MeshStandardMaterial({ color: 0xe8e8e4, roughness: 0.6, side: THREE.DoubleSide });
  const pieces = ESCAPE_TOWER[rocketKey]
    ? [new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.12, radius * 0.25, top * 0.08, 8), material)]
    : [-1, 1].map(function () { return new THREE.Mesh(new THREE.CylinderGeometry(0.01, radius, top * 0.1, 16, 1, true, 0, Math.PI), material); });
  pieces.forEach(function (piece, i) {
    const local = new THREE.Vector3(0, top * 0.95, 0);
    piece.position.copy(local.applyQuaternion(rocketRoot.quaternion));
    piece.quaternion.copy(rocketRoot.quaternion);
    if (pieces.length > 1) piece.rotateY(i * Math.PI);
    const side = new THREE.Vector3(i === 0 ? -1 : 1, 0, 0).applyQuaternion(rocketRoot.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(rocketRoot.quaternion);
    piece.userData.velocity = pieces.length > 1 ? side.multiplyScalar(6).addScaledVector(up, -8) : up.multiplyScalar(12).add(side.multiplyScalar(3));
    piece.userData.spin = random(0.5, 1.2) * (i === 0 ? -1 : 1);
    scene.add(piece);
    detached.push(piece);
  });
  play("separation");
}

function emitAscentFire(power, altitude) {
  rocketRoot.updateMatrixWorld(true);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(rocketRoot.quaternion);
  const vacuum = smoothstep(30, 140, altitude); // the plume spreads out as the air thins
  const points = [];
  if (ascent.secondStage) points.push({ point: new THREE.Vector3(0, ascent.split, 0), size: (rocketModel.userData.radius || 1) * 0.9 });
  else if (rocketModel.userData.exhaust) {
    rocketModel.userData.exhaust.forEach(function (engine) {
      if (engine.booster && boosters.length === 0) return;
      points.push(engine);
    });
  } else (rocketModel.userData.exhaustPoints || []).forEach(function (p) { points.push({ point: p, size: 0.8 }); });
  points.forEach(function (engine) {
    const world = rocketModel.localToWorld(engine.point.clone());
    for (let k = 0; k < 2; k++) {
      const velocity = up.clone().multiplyScalar(-random(70, 110)).add(new THREE.Vector3(random(-4, 4), random(-4, 4), random(-4, 4)).multiplyScalar(1 + vacuum * 4));
      const size = engine.size * 3.2 * power * (1 + vacuum * 2.5);
      particles.emit(true, world, velocity, size, size * (2 + vacuum * 4), random(0.25, 0.45) * (1 + vacuum), 0.85 - vacuum * 0.35, vacuum > 0.5 ? 0xbfd6ff : undefined, 0);
    }
  });
  // A white smoke trail in the lower atmosphere only
  if (altitude < 45 && !ascent.secondStage) {
    const tail = rocketModel.localToWorld(new THREE.Vector3(0, 0, 0));
    particles.emit(false, tail, up.clone().multiplyScalar(-random(60, 80)), random(6, 10), random(26, 40), random(2.5, 4), 0.35 * (1 - altitude / 45), 0xffffff, 0.4);
  }
}

// Max Q: a cone of condensed vapor can form around the rocket for a moment
function vaporCone() {
  rocketRoot.updateMatrixWorld(true);
  const mid = rocketModel.localToWorld(new THREE.Vector3(0, rocketModel.userData.height * 0.55, 0));
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(rocketRoot.quaternion);
  for (let i = 0; i < 6; i++) {
    const angle = random(0, Math.PI * 2);
    const out = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).applyQuaternion(rocketRoot.quaternion).multiplyScalar(random(3, 7));
    particles.emit(false, mid, out.addScaledVector(up, -random(40, 60)), random(2, 4), random(8, 14), random(0.35, 0.6), 0.5, 0xffffff, 1.5);
  }
}

function updateAscent(t, dt) {
  const fadeIn = 1 - smoothstep(0, 0.6, t);
  const fadeOut = smoothstep(SCENES[3].duration - 1.4, SCENES[3].duration, t);
  fadeBox.style.opacity = String(Math.max(fadeIn, fadeOut));

  // Altitude in km (compressed): from about 10 km to about 200 km
  const altitude = 10 + 190 * smoothstep(0, 22, t) * (0.6 + 0.4 * smoothstep(0, 22, t));
  const pitch = 0.25 + 1.0 * smoothstep(0, 21, t);          // the gravity turn (radians from vertical)
  rocketRoot.rotation.set(0, 0, -pitch);

  // Steps of the climb
  const steps = ascentSteps();
  while (ascent.step + 1 < steps.length && t >= steps[ascent.step + 1][0]) {
    ascent.step += 1;
    const step = steps[ascent.step];
    captionBox.textContent = step[1] + " · " + step[2];
    blink();
    if (ascent.step === 2 && boosters.length > 0) separateBoosters();
    if (ascent.step === 3 && ascent.split) { ascent.engineOff = 1.4; play("event"); }
    if (ascent.step === 4 && ascent.split) { separateStage(); ascent.secondStage = true; }
    if (ascent.step === 5) separateNose();
    if (ascent.step === 6) { ascent.engineOff = 99; play("success"); }
  }
  ascent.engineOff = Math.max(0, ascent.engineOff - dt);
  const throttle = ascent.step === 1 ? 0.7 : 1;
  if (ascent.engineOff <= 0) emitAscentFire(throttle, altitude);
  if (ascent.step === 1 && Math.random() < 0.7) vaporCone();
  countdownBox.textContent = steps[Math.max(0, ascent.step)][1];

  // Earth below: farther away and curving as we climb; it slides backward as we gain speed
  ascent.downrange += dt * (0.002 + 0.01 * smoothstep(0, 20, t));
  earthBall.position.set(0, -(EARTH_R + altitude * 0.94), 0);
  earthBall.rotation.z = ascent.downrange;
  skyMaterial.uniforms.uSpace.value = smoothstep(15, 90, altitude);
  stars.material.opacity = smoothstep(50, 140, altitude);

  // Parts that have separated fall behind (in the rocket's frame they drift back and down)
  const back = new THREE.Vector3(0, -1, 0).applyQuaternion(rocketRoot.quaternion);
  detached.forEach(function (part) {
    if (!part.userData.velocity) part.userData.velocity = back.clone().multiplyScalar(10);
    part.userData.velocity.addScaledVector(back, dt * 18);
    part.position.addScaledVector(part.userData.velocity, dt);
    part.rotation.z += dt * (part.userData.spin || 0.5);
  });
  if (ascent.lower) {
    ascent.lower.userData.velocity.addScaledVector(back, dt * 14);
    ascent.lower.position.addScaledVector(ascent.lower.userData.velocity, dt);
    ascent.lower.rotateZ(dt * ascent.lower.userData.spin);
  }
  updateClipping();

  // Chase camera beside and a little below the rocket; it slowly swings round
  const size = rocketModel.userData.height * ROCKET_SCALE;
  const swing = t * 0.035;
  const offset = new THREE.Vector3(Math.sin(swing) * size * 1.6 - size * 0.4, size * 0.9, Math.cos(swing) * size * 2.2);
  camera.position.copy(offset);
  const target = new THREE.Vector3(0, size * 0.45, 0).applyQuaternion(rocketRoot.quaternion);
  shakeCamera(ascent.step === 1 ? 0.35 : ascent.engineOff > 0 ? 0 : 0.08, target);
  camera.lookAt(target);
  setRumble(ascent.engineOff > 0 ? 0.05 : 0.3 * (1 - smoothstep(20, 120, altitude)) + 0.05, 300);
}

// ----- Main loop -----
function frame(now) {
  if (!running) return;
  rafId = requestAnimationFrame(frame);

  if (pausedAt !== null) {
    lastTime = now;
    renderer.render(scene, camera);
    return;
  }
  // Faster playback (2x or 4x from the mission player): move the start time back so the clock runs faster
  const speed = getPlaybackSpeed();
  if (speed !== 1) startTime -= (now - lastTime) * (speed - 1);
  const time = (now - startTime) / 1000;
  const dt = Math.min((now - lastTime) / 1000, 0.05) * speed;
  lastTime = now;

  if (time >= totalTime) {
    finish();
    return;
  }

  let index = 0;
  let local = time;
  while (index < activeScenes.length - 1 && local >= activeScenes[index].duration) {
    local -= activeScenes[index].duration;
    index++;
  }

  if (index !== currentScene) enterScene(index);

  const id = activeScenes[index].id;
  if (id === "walkout") updateScene1(local);
  else if (id === "cabin") updateScene2(local);
  else if (id === "ascent") updateAscent(local, dt);
  else if (id === "launch") updateMissionLaunch(local, dt);
  else updateScene3(local, dt);

  particles.update(dt);
  sky.position.copy(camera.position);
  stars.position.copy(camera.position);

  progressBar.style.setProperty("--fill", String(time / totalTime));

  renderer.render(scene, camera);
}

// ----- Functions that main.js uses -----
function finish() {
  if (!running) return;
  const callback = finishCallback;
  stopCinematic();
  if (callback) callback();
}

// options (optional):
//   liftoffOnly: true = play only the liftoff (used before a mission replay)
//   caption: text shown during the liftoff, for example "Voyager 1 · Launch from Earth · September 5, 1977"
//   rocket: which real rocket to show ("saturn-v", "titan-3e", "titan-4b", "delta-4-heavy", "atlas-v-541", "shuttle")
export function startCinematic(onFinish, options) {
  options = options || {};
  finishCallback = onFinish;

  activeScenes = options.mission ? [SCENES[4], SCENES[3]] : options.liftoffOnly ? [SCENES[2]] : SCENES.slice(0, 3);
  rocketKey = options.rocket || null;
  totalTime = activeScenes.reduce(function (sum, scene) { return sum + scene.duration; }, 0);
  captionOverride = options.caption || null;
  skipButton.textContent = options.liftoffOnly || options.mission ? "Skip launch" : "Skip intro";
  progressBar.style.setProperty("--fill", "0");

  try {
    init();
    spawnRocket(options.rocket, options.look);
    spawnAstronauts();
    particles.clear();
    if (ascent && ascent.lower) scene.remove(ascent.lower);
    padGroup.visible = true;
    rocketRoot.rotation.set(0, 0, 0);
    earthBall.visible = false;
    setLaunchSite(Boolean(options.mission));
    ascent = null;
    pausedAt = null;
    armPivot.rotation.y = options.liftoffOnly || options.mission ? 1.55 : 0; // the crew arm is already swung away
    skyMaterial.uniforms.uSpace.value = 0;
    stars.material.opacity = 0;
    cameraTarget.set(0, 32 * frameScale, 0);
    ignitionPlayed = false;
    currentScene = -1;
    launchStep = -1;
    fadeBox.style.transition = "none";
    fadeBox.style.opacity = "0";

    const rocketName = rocketModel.userData.name;
    noteBox.innerHTML = rocketName
      ? "Simplified model of the real " + rocketName + ". Press <kbd>Esc</kbd> to skip."
      : "Illustrative launch vehicle, not the real rocket. Press <kbd>Esc</kbd> to skip.";

    startAudio();

    running = true;
    startTime = performance.now();
    lastTime = startTime;
    rafId = requestAnimationFrame(frame);
  } catch (error) {
    // If 3D cannot start, skip the cinematic so the app still works
    console.error("Launch cinematic could not start:", error);
    running = false;
    stopCinematic();
    if (onFinish) onFinish();
  }
}

export function stopCinematic() {
  running = false;
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  stopAudio();
  cabin.classList.remove("visible");
  fadeBox.style.transition = "none";
  fadeBox.style.opacity = "0";
  if (particles) particles.clear();
}

export function skipCinematic() {
  finish();
}

// For the mission player: pause, jump to the next part, and report progress
let pausedAt = null;
export function pauseCinematic(on) {
  if (!running) return;
  if (on && pausedAt === null) pausedAt = performance.now();
  else if (!on && pausedAt !== null) {
    startTime += performance.now() - pausedAt;
    lastTime = performance.now();
    pausedAt = null;
  }
}

export function nextCinematicScene() {
  if (!running) return;
  let time = (performance.now() - startTime) / 1000;
  let end = 0;
  for (let i = 0; i < activeScenes.length; i++) {
    end += activeScenes[i].duration;
    if (time < end) break;
  }
  if (end >= totalTime) { finish(); return; }
  startTime -= (end - time + 0.01) * 1000;
}

export function cinematicInfo() {
  if (!running) return null;
  const time = ((pausedAt !== null ? pausedAt : performance.now()) - startTime) / 1000;
  let index = 0;
  let local = time;
  while (index < activeScenes.length - 1 && local >= activeScenes[index].duration) {
    local -= activeScenes[index].duration;
    index++;
  }
  return { index: index, id: activeScenes[index].id, progress: Math.min(1, local / activeScenes[index].duration) };
}

export function isCinematicRunning() {
  return running;
}

skipButton.addEventListener("click", skipCinematic);