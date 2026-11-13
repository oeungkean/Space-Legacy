// The launch cinematic.
// Full intro ("Begin Exploration"): crew walkout, then the view from inside the spacecraft, then liftoff.
// Liftoff only (before every mission replay): just the liftoff part, with the mission's name as the caption.
// Mission launches ("mission: true"): liftoff, then the climb to orbit, following NASA's usual sequence:
//   gravity turn, Max Q, booster separation, main engine cutoff and stage separation, second-stage burn,
//   fairing (or launch escape tower) separation, and orbit insertion. Times are typical and compressed.
// The vehicle is the mission's rocket model (simplified), or a generic one.
// The camera shakes in the cabin and liftoff parts only.

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createLauncher, createAstronaut, strut } from "./models.js";
import { createRocket } from "./rockets.js";
import { createParticleSystem } from "./particles.js";
import { planetMaterial, cloudMaterial, addSurfaceDetail } from "./planet-look.js";
import { createGlow } from "./glow.js";
import { play, isSoundOn, setSoundOn, onSoundChange, isGroupOn } from "./sounds.js";
import { wantsReducedMotion } from "./settings.js";
import { getPlaybackSpeed } from "./playback.js";

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
// Rollout, before the countdown: how each rocket really got from its assembly building to the pad
const ROLLOUT_SCENE = { id: "rollout", caption: "Rollout.", duration: 11 };
const ROLLOUT_STYLE = {
  // carried upright with its launch platform by a crawler-transporter
  "saturn-v": "crawler", "saturn-v-skylab": "crawler", "sls": "crawler", "shuttle": "crawler", "shuttle-sts31": "crawler", "shuttle-sts88": "crawler",
  // standing on a launch platform that rolls along rails
  "atlas-v-401": "rail", "atlas-v-411": "rail", "atlas-v-541": "rail", "atlas-v-551": "rail", "titan-3e": "rail", "titan-4b": "rail", "ariane-5": "rail",
  // lying down on a transporter-erector, raised upright at the pad
  "falcon-9": "horizontal", "delta-4-heavy": "horizontal", "proton": "horizontal"
  // Delta II, Titan II and Atlas-Centaur were stacked on the pad itself: no rollout
};
const ROLLOUT_CAPTION = {
  crawler: "Rollout: a crawler-transporter carries the rocket, standing on its launch platform, out of the assembly building to the pad. The real crawler moves at about 1.6 km/h (1 mph), so it takes hours; this is sped up.",
  rail: "Rollout: the rocket stands on its launch platform, which rolls along rails from the assembly building to the pad (sped up).",
  horizontal: "Rollout: the rocket lies on its transporter-erector and rolls out of the hangar; at the pad it is raised upright (sped up)."
};
const BUILDING = new THREE.Vector3(-2400, 0, -1300); // the assembly building (see buildCoast)
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
// Where the nose comes off, in meters up the model (measured from js/rockets.js), and the model's height:
// the escape tower above the capsule, or the bottom of the payload fairing.
const NOSE_CUT = {
  "saturn-v": [112.3, 119.5], "saturn-v-skylab": [99, 108], "sls": [89.3, 98.1],
  "titan-3e": [39, 56.5], "titan-4b": [36, 60], "delta-4-heavy": [42.8, 64], "atlas-centaur": [32.2, 42.8],
  "delta-2": [33.1, 42], "delta-2-heavy": [33.1, 42], "atlas-v-401": [44.1, 57.4], "atlas-v-411": [44.1, 57.4],
  "atlas-v-541": [34, 57], "atlas-v-551": [34, 57], "falcon-9": [55, 70], "proton": [41.5, 54.5], "ariane-5": [35.4, 53]
};

const LIFTOFF_AT = 2.5;          // seconds into the liftoff part
const BOOSTER_SEPARATION = 4.5;  // seconds after liftoff
const ROCKET_SCALE = 8;
const PAD_Y = 0.6;
let restY = PAD_Y;     // height of the rocket's origin when it stands on its mount (set per rocket)
let mountGroup = null; // the hold-down posts under the rocket
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

// How many particles to start this frame for a steady rate (per second), whatever the frame rate.
// The fraction left over is carried to the next frame, so "60 per second" stays 60 per second
// at 30, 60 or 144 frames per second (before, emission was counted per frame).
function perSecond(key, rate, dt) {
  carry[key] = (carry[key] || 0) + rate * dt;
  const count = Math.floor(carry[key]);
  carry[key] -= count;
  return count;
}

// Spreads puffs started in the same frame along their path, so a plume looks continuous
// instead of coming out in clumps (one clump per frame).
function spread(position, velocity, dt) {
  return position.addScaledVector(velocity, -Math.random() * dt);
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
let reflections = null;       // environment map for metal and paint (built once in init)
let padGroup = null;
let earthBall = null;
let ascent = null;            // state of the climb to orbit
let ascentTrail = null;       // the path flown, drawn on Earth
let ascentMarker = null;      // a glow on the rocket for the pull-back
let cloudDeck = null;         // clouds the rocket climbs through
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
  ground.receiveShadow = true;
  padGroup.add(ground);

  const padMaterial = new THREE.MeshStandardMaterial({ color: 0x8e8c87, roughness: 0.92 }); // weathered concrete, not white
  const padMesh = new THREE.Mesh(new THREE.CylinderGeometry(24, 26, PAD_Y, 64), padMaterial);
  padMesh.position.y = PAD_Y / 2;
  padMesh.receiveShadow = true;
  padMesh.userData.lc39 = true;
  padGroup.add(padMesh);

  const trench = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 7, PAD_Y + 0.04, 40),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 1 })
  );
  trench.position.y = PAD_Y / 2;
  trench.userData.lc39 = true;
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
    pole.userData.lc39 = true;
    padGroup.add(pole);

    const light = new THREE.Sprite(redLight);
    light.scale.set(4, 4, 1);
    light.position.set(p[0], 91, p[1]);
    light.userData.lc39 = true;
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

// Dry steppe grass (Baikonur): tan and straw, with darker patches
function steppeTexture() {
  const drawing = document.createElement("canvas");
  drawing.width = 512;
  drawing.height = 512;
  const ctx = drawing.getContext("2d");
  ctx.fillStyle = "#a8956a";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const g = Math.floor(random(120, 180));
    ctx.fillStyle = Math.random() < 0.3 ? "rgba(" + (g - 40) + "," + (g - 50) + "," + (g - 80) + ",0.35)" : "rgba(" + (g + 20) + "," + (g + 5) + "," + (g - 40) + ",0.3)";
    ctx.fillRect(Math.random() * 512, Math.random() * 512, random(1, 4), random(1, 4));
  }
  const texture = new THREE.CanvasTexture(drawing);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(160, 160);
  return texture;
}

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

// One soft cloud puff: a few overlapping round blobs that fade out at the edges
function cloudPuffTexture() {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const ctx = c.getContext("2d");
  if (!ctx || !ctx.createRadialGradient) return null;
  for (let i = 0; i < 9; i++) {
    const x = 64 + random(-26, 26);
    const y = 68 + random(-14, 10);
    const r = random(22, 40);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,0.55)");
    g.addColorStop(0.6, "rgba(255,255,255,0.25)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildCoast() {
  coastGroup = new THREE.Group();
  coastGroup.visible = false;
  scene.add(coastGroup);
  const land = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshStandardMaterial({ map: coastTexture(), roughness: 1 }));
  land.rotation.x = -Math.PI / 2;
  land.position.y = -0.05;
  land.receiveShadow = true;
  coastGroup.add(land);
  coastGroup.userData.land = land;
  // The Atlantic Ocean, just east of the pad: small waves (a moving ripple map) that catch the sun,
  // turquoise shallows and a line of surf along the beach
  const waves = waveNormalTexture();
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshStandardMaterial({
    color: 0x1d5a80, roughness: 0.22, metalness: 0.2, normalMap: waves, normalScale: new THREE.Vector2(0.55, 0.55)
  }));
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(4500 + 520, 0.02, 0);
  ocean.receiveShadow = true;
  coastGroup.add(ocean);
  coastGroup.userData.sea = [ocean];
  coastGroup.userData.waves = waves;
  const shallows = new THREE.Mesh(new THREE.PlaneGeometry(70, 9000), new THREE.MeshStandardMaterial({
    color: 0x4fa6a6, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.75, normalMap: waves, normalScale: new THREE.Vector2(0.3, 0.3)
  }));
  shallows.rotation.x = -Math.PI / 2;
  shallows.position.set(555, 0.03, 0);
  coastGroup.add(shallows);
  coastGroup.userData.sea.push(shallows);
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(5, 9000), new THREE.MeshBasicMaterial({ color: 0xf2f6f8, transparent: true, opacity: 0.8 }));
  surf.rotation.x = -Math.PI / 2;
  surf.position.set(523, 0.04, 0);
  coastGroup.add(surf);
  coastGroup.userData.surf = surf;
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(60, 9000), new THREE.MeshStandardMaterial({ color: 0xd9c9a0, roughness: 1 }));
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(500, 0.01, 0);
  coastGroup.add(beach);
  coastGroup.userData.sea.push(beach, surf);
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
  building.position.set(-2400, 80, -1300); // off to the side of the long-lens shot, not right behind the rocket
  coastGroup.add(building);
  // the high bay door stands open: a dark doorway (the rocket comes out of it during rollout)
  const doors = new THREE.Mesh(new THREE.PlaneGeometry(60, 150), new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 1 }));
  doors.position.set(-2400, 75, -1219);
  coastGroup.add(doors);
  [-1, 1].forEach(function (side) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(3, 152, 3), new THREE.MeshStandardMaterial({ color: 0x8a9099, roughness: 0.6, metalness: 0.4 }));
    frame.position.set(-2400 + side * 31, 76, -1218);
    coastGroup.add(frame);
  });
  const lifted = new THREE.Mesh(new THREE.BoxGeometry(62, 8, 2), new THREE.MeshStandardMaterial({ color: 0x9aa2ad, roughness: 0.7 }));
  lifted.position.set(-2400, 154, -1218); // the door panels, raised
  coastGroup.add(lifted);
  // the crawlerway out of the door: two wide gravel lanes
  [-1, 1].forEach(function (side) {
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(14, 700), new THREE.MeshStandardMaterial({ color: 0xbab3a4, roughness: 1 }));
    lane.rotation.x = -Math.PI / 2;
    lane.position.set(-2400 + side * 13, 0.04, -1219 + 350);
    lane.receiveShadow = true;
    coastGroup.add(lane);
  });
  doors.userData.rollout = true;
  // Launch Complex 39 (Kennedy): its own group, so other launch sites can look different
  const lc39 = new THREE.Group();
  coastGroup.add(lc39);
  coastGroup.userData.padStyles = { lc39: lc39 };
  // Water tower for the sound suppression system
  const steel = new THREE.MeshStandardMaterial({ color: 0xc9ccd0, roughness: 0.5, metalness: 0.5 });
  for (let i = 0; i < 4; i++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 70, 6), steel);
    leg.position.set(170 + (i % 2) * 14 - 7, 35, -230 + Math.floor(i / 2) * 14 - 7);
    lc39.add(leg);
  }
  const tank = new THREE.Mesh(new THREE.SphereGeometry(14, 20, 14), steel);
  tank.position.set(170, 80, -230);
  lc39.add(tank);
  buildPadComplex();
  buildRoadsAndBuildings();
  buildVegetation();
  // Low clouds far away: each is a cluster of soft, overlapping puffs (billboards) with a flatter,
  // greyer base, instead of one hard-edged ellipsoid
  const puffTop = new THREE.SpriteMaterial({ map: cloudPuffTexture(), color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false });
  const puffBase = new THREE.SpriteMaterial({ map: puffTop.map, color: 0xc9d3de, transparent: true, opacity: 0.7, depthWrite: false });
  for (let i = 0; i < 18; i++) {
    const cloud = new THREE.Group();
    const width = random(160, 320);
    const puffs = 5 + Math.floor(random(0, 4));
    for (let p = 0; p < puffs; p++) {
      const across = (p / (puffs - 1) - 0.5) * width;
      const size = width * random(0.35, 0.55) * (1 - Math.abs(across) / width);
      const top = new THREE.Sprite(puffTop);
      top.scale.set(size * 1.4, size * 0.75, 1);
      top.position.set(across, size * random(0.12, 0.3), random(-20, 20));
      cloud.add(top);
      const base = new THREE.Sprite(puffBase);
      base.scale.set(size * 1.6, size * 0.4, 1);
      base.position.set(across * 1.05, -size * 0.05, random(-20, 20));
      cloud.add(base);
    }
    const angle = random(0, Math.PI * 2);
    cloud.position.set(Math.cos(angle) * random(2400, 3400), random(380, 650), Math.sin(angle) * random(2400, 3400));
    coastGroup.add(cloud);
    (coastGroup.userData.clouds = coastGroup.userData.clouds || []).push(cloud);
  }
}


// Small ripples for the ocean (a tiling normal map drawn from overlapping sine waves)
function waveNormalTexture() {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext && c.getContext("2d");
  if (!ctx || !ctx.createImageData) return null;
  const img = ctx.createImageData(size, size);
  const h = function (x, y) {
    const a = Math.PI * 2 / size;
    return Math.sin(x * a * 3 + y * a * 1) * 0.5 + Math.sin(x * a * -2 + y * a * 5) * 0.35 +
      Math.sin(x * a * 7 + y * a * 4) * 0.2 + Math.sin(x * a * -9 + y * a * 11) * 0.12;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = h(x + 1, y) - h(x - 1, y);
      const dy = h(x, y + 1) - h(x, y - 1);
      const n = new THREE.Vector3(-dx * 2.2, -dy * 2.2, 1).normalize();
      const i = (y * size + x) * 4;
      img.data[i] = (n.x * 0.5 + 0.5) * 255;
      img.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
      img.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const texture = new THREE.CanvasTexture(c);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(600, 600);
  return texture;
}

// The pad itself: a wide concrete hardstand, the flame trench running out to one side, a perimeter
// road and fence, and the two big spherical propellant tanks (liquid oxygen and fuel) with pipes to the pad
function buildPadComplex() {
  const pad = coastGroup.userData.padStyles.lc39;
  const concrete = new THREE.MeshStandardMaterial({ color: 0x86837d, roughness: 0.95 });
  const apron = new THREE.Mesh(new THREE.CylinderGeometry(78, 82, 0.4, 8), concrete);
  apron.rotation.y = Math.PI / 8;
  apron.position.y = 0.05;
  apron.receiveShadow = true;
  pad.add(apron);
  const trench = new THREE.Mesh(new THREE.PlaneGeometry(16, 120), new THREE.MeshStandardMaterial({ color: 0x4a4740, roughness: 1 }));
  trench.rotation.x = -Math.PI / 2;
  trench.position.set(0, 0.28, -60);
  pad.add(trench);
  const road = new THREE.MeshStandardMaterial({ color: 0x3b3d40, roughness: 0.9 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(118, 126, 64), road);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  ring.receiveShadow = true;
  pad.add(ring);
  // fence posts around the pad (a dashed silver ring)
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc2, roughness: 0.6, metalness: 0.6 });
  const fence = new THREE.InstancedMesh(new THREE.BoxGeometry(0.25, 2.4, 0.25), fenceMat, 120);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    m.makeTranslation(Math.cos(a) * 140, 1.2, Math.sin(a) * 140);
    fence.setMatrixAt(i, m);
  }
  pad.add(fence);
  // propellant spheres on short legs, white with a dark band, and pipes running to the pad
  const white = new THREE.MeshStandardMaterial({ color: 0xeef0f2, roughness: 0.5, metalness: 0.2 });
  const pipe = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.5, metalness: 0.6 });
  [[-95, -75, 13], [90, -80, 11]].forEach(function (t) { // behind the pad, away from the cameras
    const ball = new THREE.Mesh(new THREE.SphereGeometry(t[2], 28, 18), white);
    ball.position.set(t[0], t[2] + 3, t[1]);
    ball.castShadow = true;
    pad.add(ball);
    const band = new THREE.Mesh(new THREE.TorusGeometry(t[2] * 1.0, 0.5, 6, 40), pipe);
    band.rotation.x = Math.PI / 2;
    band.position.copy(ball.position);
    pad.add(band);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, t[2] + 3, 6), pipe);
      leg.position.set(t[0] + Math.cos(a) * t[2] * 0.8, (t[2] + 3) / 2, t[1] + Math.sin(a) * t[2] * 0.8);
      pad.add(leg);
    }
    const length = Math.hypot(t[0], t[1]) - 26;
    const run = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, length, 8), pipe);
    run.rotation.z = Math.PI / 2;
    run.rotation.y = -Math.atan2(t[1], t[0]);
    const mid = new THREE.Vector3(t[0], 0, t[1]).normalize().multiplyScalar(26 + length / 2);
    run.position.set(mid.x, 1.2, mid.z);
    pad.add(run);
  });
}

// Roads to the pad, a launch control building, workshops, and another launch tower down the coast
function buildRoadsAndBuildings() {
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x35373a, roughness: 0.9 });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xe9e2c8 });
  [[0, 0.07, -760, 9, 1300, 0], [-520, 0.07, 160, 9, 1100, Math.PI / 2], [300, 0.07, -500, 7, 900, 0.3]].forEach(function (r) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(r[3], r[4]), asphalt);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = r[5];
    road.position.set(r[0], r[1], r[2]);
    road.receiveShadow = true;
    coastGroup.add(road);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.3, r[4]), lineMat);
    line.rotation.x = -Math.PI / 2;
    line.rotation.z = r[5];
    line.position.set(r[0], r[1] + 0.01, r[2]);
    coastGroup.add(line);
  });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd9dbdc, roughness: 0.8 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2e3a48, roughness: 0.3, metalness: 0.4 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x8d9298, roughness: 0.9 });
  // [x, z, width, height, depth, window rows]
  [[-640, 330, 70, 16, 34, 3], [-420, -260, 40, 9, 26, 2], [-470, -320, 26, 7, 20, 1], [260, -560, 34, 10, 22, 2],
    [-760, -120, 50, 12, 30, 2], [380, 360, 30, 8, 18, 1]].forEach(function (b) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(b[2], b[3], b[4]), wallMat);
    box.position.set(b[0], b[3] / 2, b[1]);
    box.castShadow = true;
    box.receiveShadow = true;
    coastGroup.add(box);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(b[2] + 1, 0.6, b[4] + 1), roofMat);
    roof.position.set(b[0], b[3] + 0.3, b[1]);
    coastGroup.add(roof);
    for (let row = 0; row < b[5]; row++) {
      const windows = new THREE.Mesh(new THREE.BoxGeometry(b[2] * 0.9, 1.4, b[4] + 0.2), darkMat);
      windows.position.set(b[0], 2.5 + row * (b[3] - 3) / Math.max(1, b[5]), b[1]);
      coastGroup.add(windows);
    }
  });
  // another launch pad down the coast: its own tower and a rocket-less mount (simplified)
  const far = buildTower(70);
  far.position.set(260, 0, -1500);
  far.scale.setScalar(0.9);
  coastGroup.add(far);
  const farPad = new THREE.Mesh(new THREE.CylinderGeometry(50, 54, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0xaeaaa2, roughness: 0.95 }));
  farPad.position.set(250, 0.05, -1500);
  coastGroup.add(farPad);
}

// Florida scrub, palmettos and pine stands: thousands of low bushes and trees drawn as a few
// instanced meshes (cheap to draw), kept off the pad, the roads and the beach
function buildVegetation() {
  const keepClear = function (x, z) {
    const d = Math.hypot(x, z);
    if (d < 150) return true;                                   // pad, apron, fence
    if (x > 470) return true;                                   // beach and ocean
    if (Math.abs(x) < 12 && z < 0 && z > -1420) return true;     // road north
    if (Math.abs(z - 160) < 12 && x < -60) return true;          // road west
    return false;
  };
  const shrubGeo = new THREE.IcosahedronGeometry(1, 0);
  const shrubMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
  const shrubs = new THREE.InstancedMesh(shrubGeo, shrubMat, 2600);
  const pineGeo = new THREE.ConeGeometry(1, 3, 7);
  const pineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
  const pines = new THREE.InstancedMesh(pineGeo, pineMat, 700);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const color = new THREE.Color();
  let n = 0;
  let tries = 0;
  while (n < 2600 && tries < 20000) {
    tries++;
    const a = random(0, Math.PI * 2);
    const d = 150 + Math.pow(Math.random(), 0.8) * 1500;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (keepClear(x, z)) continue;
    const r = random(1.4, 4.2);
    pos.set(x, r * 0.35, z);
    scale.set(r * random(1, 1.6), r * random(0.45, 0.7), r * random(1, 1.6));
    q.setFromAxisAngle(UP_AXIS, random(0, Math.PI));
    m.compose(pos, q, scale);
    shrubs.setMatrixAt(n, m);
    color.setHSL(random(0.2, 0.27), random(0.25, 0.4), random(0.2, 0.32));
    shrubs.setColorAt(n, color);
    n++;
  }
  shrubs.count = n;
  let k = 0;
  tries = 0;
  while (k < 700 && tries < 20000) {
    tries++;
    // pines grow in stands: pick a stand center, then scatter around it
    const a = random(0, Math.PI * 2);
    const d = 260 + Math.random() * 1600;
    const cx = Math.cos(a) * d;
    const cz = Math.sin(a) * d;
    for (let j = 0; j < 12 && k < 700; j++) {
      const x = cx + random(-40, 40);
      const z = cz + random(-40, 40);
      if (keepClear(x, z)) continue;
      const h = random(9, 18);
      pos.set(x, h * 0.5 + 2, z);
      scale.set(h * 0.22, h / 3, h * 0.22);
      q.identity();
      m.compose(pos, q, scale);
      pines.setMatrixAt(k, m);
      color.setHSL(random(0.25, 0.33), random(0.3, 0.45), random(0.14, 0.22));
      pines.setColorAt(k, color);
      k++;
    }
  }
  pines.count = k;
  coastGroup.userData.plants = [shrubs, pines];
  [shrubs, pines].forEach(function (mesh) {
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    coastGroup.add(mesh);
  });
}
const UP_AXIS = new THREE.Vector3(0, 1, 0);

// ----- Launch pads: each rocket's real kind of pad -----
// lc39: Kennedy Launch Complex 39 (octagonal pad, propellant spheres, water tower)
// slc41: Cape Canaveral Space Launch Complex 41, a "clean pad": the rocket arrives on its platform from
//        a tall integration building nearby, with lightning towers around the pad and no tower at the rocket
// mst: pads with a mobile service tower that rolls back before launch (Delta II, Delta IV, Atlas-Centaur)
// erector: the Titan II Gemini pad, where the erector tower was lowered away from the rocket
// ela3: Kourou, a launch table between concrete exhaust walls, with lightning towers
// baikonur: a launch stand over a deep flame pit; the service tower is moved away
const PAD_STYLE = {
  "saturn-v": "lc39", "saturn-v-skylab": "lc39", sls: "lc39", shuttle: "lc39", "shuttle-sts31": "lc39", "shuttle-sts88": "lc39", "falcon-9": "lc39",
  "atlas-v-401": "slc41", "atlas-v-411": "slc41", "atlas-v-541": "slc41", "atlas-v-551": "slc41", "titan-3e": "slc41", "titan-4b": "slc41",
  "delta-2": "mst", "delta-2-heavy": "mst", "delta-4-heavy": "mst", "atlas-centaur": "mst",
  "titan-2": "erector", "ariane-5": "ela3", proton: "baikonur"
};
// What the countdown says about the pad (the first caption), in each style
const PAD_CAPTION = {
  slc41: "T-10 seconds. The rocket stands on its mobile platform on a clean pad, rolled out from its integration building. Lightning towers surround it.",
  mst: "T-10 seconds. The mobile service tower has rolled back on its rails; the rocket stands beside its umbilical tower.",
  erector: "T-10 seconds. The erector that held the rocket has been lowered away. Only the umbilicals still connect it to the pad.",
  ela3: "T-10 seconds. The rocket stands on its launch table between the concrete exhaust walls, surrounded by lightning towers.",
  baikonur: "T-10 seconds. The rocket stands over a deep flame pit. Its service tower has been moved away along its rails."
};
let padStyle = "lc39";
let padProps = {};

function concrete(color) {
  return new THREE.MeshStandardMaterial({ color: color || 0x86837d, roughness: 0.95 });
}
function lightningTower(height) {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.6, metalness: 0.6 });
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.35, height, 0.35), steel);
    leg.position.set(c[0] * 1.4, height / 2, c[1] * 1.4);
    g.add(leg);
  });
  for (let y = 6; y < height; y += 8) {
    const ring = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.25, 3.1), steel);
    ring.position.y = y;
    g.add(ring);
  }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, height * 0.25, 6), steel);
  mast.position.y = height * 1.12;
  g.add(mast);
  return g;
}
function rails(group, fromZ, toZ, x) {
  const steel = new THREE.MeshStandardMaterial({ color: 0x5e6268, roughness: 0.5, metalness: 0.7 });
  [-3, 3].forEach(function (dx) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, Math.abs(toZ - fromZ)), steel);
    rail.position.set((x || 0) + dx, 0.15, (fromZ + toZ) / 2);
    group.add(rail);
  });
}

function buildPadStyle(style) {
  const styles = coastGroup.userData.padStyles;
  if (styles[style]) return styles[style];
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xdfe2e5, roughness: 0.6, metalness: 0.15 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x8c9199, roughness: 0.6, metalness: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2c2f, roughness: 1 });
  if (style === "slc41") {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(70, PAD_Y, 50), concrete());
    slab.position.y = PAD_Y / 2;
    g.add(slab);
    [[-45, -35], [45, -35], [-45, 35], [45, 35]].forEach(function (c) {
      const tower = lightningTower(85);
      tower.position.set(c[0], 0, c[1]);
      g.add(tower);
    });
    rails(g, -560, -10);
    // the Vertical Integration Facility up the rails (simplified: a tall plain building)
    const vif = new THREE.Mesh(new THREE.BoxGeometry(40, 90, 36), white);
    vif.position.set(0, 45, -580);
    g.add(vif);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(18, 80), dark);
    door.position.set(0, 40, -561.9);
    g.add(door);
  } else if (style === "mst") {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(60, PAD_Y, 60), concrete());
    slab.position.y = PAD_Y / 2;
    g.add(slab);
    rails(g, 0, 0, 0);
    const track = new THREE.Group();
    [-6, 6].forEach(function (dz) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(220, 0.3, 0.4), steel);
      rail.position.set(-110, 0.15, dz);
      track.add(rail);
    });
    g.add(track);
    // the mobile service tower: a tall boxy structure that rolls back along its rails
    const mst = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(22, 80, 22), new THREE.MeshStandardMaterial({ color: 0xc9ccd1, roughness: 0.6, metalness: 0.3 }));
    frame.position.y = 40;
    mst.add(frame);
    for (let y = 8; y < 80; y += 10) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(22.4, 0.6, 22.4), steel);
      band.position.y = y;
      mst.add(band);
    }
    g.add(mst);
    g.userData.mst = mst;
  } else if (style === "erector") {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(50, PAD_Y, 40), concrete());
    slab.position.y = PAD_Y / 2;
    g.add(slab);
    // the erector: a lattice frame hinged at its base that is lowered away from the rocket
    const hinge = new THREE.Group();
    hinge.position.set(-6, PAD_Y, 0);
    const frame = buildTower(42);
    frame.scale.set(0.6, 1, 0.6);
    frame.position.set(-2, 0, 0);
    hinge.add(frame);
    g.add(hinge);
    g.userData.erector = hinge;
    // the blockhouse: a domed concrete bunker for the launch crew
    const dome = new THREE.Mesh(new THREE.SphereGeometry(16, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), concrete(0xa4a19a));
    dome.position.set(-160, 0, 140);
    g.add(dome);
  } else if (style === "ela3") {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(40, PAD_Y, 40), concrete());
    slab.position.y = PAD_Y / 2;
    g.add(slab);
    // concrete walls on both sides where the exhaust ducts come out
    [-1, 1].forEach(function (side) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.lineTo(70, 0); shape.lineTo(0, 22); shape.lineTo(0, 0);
      const wall = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 30, bevelEnabled: false }), concrete(0x9b988f));
      wall.position.set(side * 26, 0, -15);
      wall.scale.x = side;
      g.add(wall);
    });
    [[-55, -45], [55, -45], [-55, 45], [55, 45]].forEach(function (c) {
      const tower = lightningTower(75);
      tower.position.set(c[0], 0, c[1]);
      g.add(tower);
    });
    rails(g, -900, -10);
  } else if (style === "baikonur") {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(60, PAD_Y, 50), concrete(0x8a8579));
    slab.position.y = PAD_Y / 2;
    g.add(slab);
    // the flame pit: a deep opening in front of the launch stand
    const pit = new THREE.Mesh(new THREE.PlaneGeometry(26, 60), dark);
    pit.rotation.x = -Math.PI / 2;
    pit.position.set(0, PAD_Y + 0.02, -30);
    g.add(pit);
    rails(g, -800, -10, 40);
    // the service tower, moved away along its rails
    const tower = buildTower(60);
    tower.position.set(40, 0, -200);
    g.add(tower);
    g.userData.serviceTower = tower;
  }
  g.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  coastGroup.add(g);
  styles[style] = g;
  return g;
}

function applyPadStyle(style) {
  padStyle = style;
  padProps = {};
  const styles = coastGroup.userData.padStyles;
  if (style !== "lc39") buildPadStyle(style);
  Object.keys(styles).forEach(function (key) { styles[key].visible = key === style; });
  padProps = styles[style].userData || {}; // the moving parts of this pad (service tower, erector)
  padGroup.children.forEach(function (child) { if (child.userData.lc39) child.visible = style === "lc39"; });
  // the fixed tower with the crew arm: at Kennedy (39) and at the pads with an umbilical tower
  const tower = style === "lc39" || style === "mst" || style === "erector";
  if (towerGroup) towerGroup.visible = tower;
  if (armPivot) armPivot.visible = style === "lc39";
}

// The pad's own steps during the countdown (sped up): the service tower rolls back, the erector lowers
function updatePadProcess(t) {
  const k = smoothstep(0.2, 2.0, t); // done before the caption says so (it appears at 2 s)
  if (padProps.mst) padProps.mst.position.x = -30 - 130 * k;
  if (padProps.erector) padProps.erector.rotation.z = (Math.PI / 2) * k;
}

// ----- Rollout rigs -----
let rollout = null;

function trackUnit(width, length, height, material, tread) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, length), material);
  body.position.y = height / 2;
  g.add(body);
  for (let i = 0; i < 9; i++) {
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(width * 1.04, height * 0.12, length / 11), tread);
    shoe.position.set(0, height * 0.06, -length / 2 + (i + 1) * length / 10);
    g.add(shoe);
  }
  return g;
}

function buildRollout(style) {
  if (rollout) { scene.remove(rollout.group); rollout = null; }
  if (!style) return;
  const group = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x8f959c, roughness: 0.6, metalness: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.8, metalness: 0.4 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x7e848c, roughness: 0.75, metalness: 0.3 });
  const heightMeters = rocketModel.userData.height * ROCKET_SCALE;
  const radiusMeters = (rocketModel.userData.radius || 1) * ROCKET_SCALE;
  let deck = 0;
  if (style === "crawler") {
    // crawler-transporter: about 40 x 35 m, 6 m tall, four double-tracked trucks at the corners
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
      const truck = trackUnit(10, 12, 3, dark, steel);
      truck.position.set(c[0] * 14, 0, c[1] * 13);
      group.add(truck);
    });
    const crawler = new THREE.Mesh(new THREE.BoxGeometry(40, 3, 35), grey);
    crawler.position.y = 4.5;
    group.add(crawler);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 4), new THREE.MeshStandardMaterial({ color: 0xd7dade, roughness: 0.5 }));
    cab.position.set(-18, 7.5, 16);
    group.add(cab);
    // the mobile launcher on top, with its tower
    const platformWidth = Math.max(40, radiusMeters * 2 + 16);
    const platform = new THREE.Mesh(new THREE.BoxGeometry(platformWidth, 7.6, 40), dark);
    platform.position.y = 6 + 3.8;
    group.add(platform);
    deck = 6 + 7.6;
    const tower = buildTower(Math.max(60, Math.ceil(heightMeters + 6)));
    tower.position.set(-(radiusMeters + 9), deck, 0);
    group.add(tower);
  } else if (style === "rail") {
    // launch platform on rail bogies, on two rails
    const platform = new THREE.Mesh(new THREE.BoxGeometry(Math.max(26, radiusMeters * 2 + 10), 6, 22), dark);
    platform.position.y = 4;
    group.add(platform);
    [-1, 1].forEach(function (side) {
      [-1, 1].forEach(function (end) {
        const bogie = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 6), steel);
        bogie.position.set(side * 9, 1, end * 7);
        group.add(bogie);
      });
    });
    deck = 7;
  } else {
    // transporter-erector: a long frame on wheels, the rocket lying on it base first
    const length = heightMeters + 8;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(radiusMeters * 1.6 + 4, 2, length), grey);
    frame.position.set(0, 3, -length / 2 + 4);
    group.add(frame);
    for (let i = 0; i < 6; i++) {
      [-1, 1].forEach(function (side) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1, 16), dark);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * (radiusMeters * 0.8 + 2.5), 1.2, 2 - i * (length - 6) / 5);
        group.add(wheel);
      });
    }
    deck = 4;
  }
  group.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  group.visible = false; // shown (and moved to the building) only during the rollout scene
  scene.add(group);
  rollout = { group: group, style: style, deck: deck, height: heightMeters, radius: radiusMeters };
}

function endRollout() {
  if (rollout) rollout.group.visible = false;
  if (!rocketRoot) return;
  // the rocket stands on its pad mount again, lit by the pad's sun
  rocketRoot.position.set(0, restY, 0);
  rocketRoot.rotation.set(0, 0, 0);
  const heightMeters = rocketModel.userData.height * ROCKET_SCALE;
  sunLight.position.copy(missionSun || new THREE.Vector3(-200, 320, 400));
  sunLight.target.position.set(0, heightMeters * 0.35, 0);
  sunLight.target.updateMatrixWorld();
}

function updateRollout(t, dt) {
  if (!rollout) return;
  const d = ROLLOUT_SCENE.duration;
  fadeBox.style.transition = "none";
  fadeBox.style.opacity = String(Math.max(1 - smoothstep(0, 0.8, t), smoothstep(d - 0.7, d, t)));
  rollout.group.visible = true;
  // from inside the building, out through the door and along the crawlerway
  const travel = 300;
  const k = t / d;
  const z = BUILDING.z + 10 + travel * k; // the front of the crawler reaches the door after about 2 seconds
  rollout.group.position.set(BUILDING.x, 0, z);
  const lift = restY - PAD_Y;
  if (rollout.style === "horizontal") {
    // lying down, engines first (the end that is raised at the pad)
    rocketRoot.rotation.set(-Math.PI / 2, 0, 0);
    rocketRoot.position.set(BUILDING.x, rollout.deck + rollout.radius * 0.55, z + 4);
  } else {
    rocketRoot.rotation.set(0, 0, 0);
    rocketRoot.position.set(BUILDING.x, rollout.deck + lift, z);
  }
  // the sun's shadows follow the rig
  const sunAt = missionSun || new THREE.Vector3(-200, 320, 400);
  sunLight.position.set(BUILDING.x + sunAt.x, sunAt.y, z + sunAt.z);
  sunLight.target.position.set(BUILDING.x, rollout.height * 0.35, z);
  sunLight.target.updateMatrixWorld();
  // dust from the tracks
  if (rollout.style === "crawler") {
    for (let n = perSecond("rolldust", 10, dt); n > 0; n--) {
      particles.emit(false, new THREE.Vector3(BUILDING.x + random(-20, 20), 1, z + 18), new THREE.Vector3(random(-1, 1), random(0.5, 1.5), random(0, 1)), 2, random(6, 10), random(1.5, 2.5), 0.25, 0xd8cfbf, 0.8);
    }
  }
  // Camera: low by the crawlerway as the rocket comes out of the door, then a long lens beside it
  const s = Math.max(1, rollout.height / 70);
  let target;
  // (framed a little low, so the top of the rocket stays clear of the player's title bar)
  if (t < 5.5) {
    camera.fov = 36;
    camera.position.set(BUILDING.x + 170 * s, 6, BUILDING.z + 80 + 330 * s);
    target = new THREE.Vector3(BUILDING.x, rollout.height * 0.62, BUILDING.z + 80);
  } else {
    camera.fov = 22;
    const pan = (t - 5.5) / (d - 5.5);
    camera.position.set(BUILDING.x - 520 * s, 18, z + 220 * s - pan * 60 * s);
    target = new THREE.Vector3(BUILDING.x, rollout.height * 0.62, z);
  }
  camera.updateProjectionMatrix();
  camera.lookAt(target);
  setRumble(0.08, 200);
}

// Where each rocket really launched from, and how the place looks
const SITE_LOOKS = {
  florida: {
    name: "Florida", lat: 28.6, lon: -80.6, land: 0xffffff, sea: true, plants: [1, 1], plantTint: null, cloudy: 0,
    horizon: 0xd6e7f6, mid: 0x86b6ea, zenith: 0x2c64c4, fog: 0xcfe0f2
  },
  // Guiana Space Centre: tropical rainforest close to the Atlantic, often under big cumulus clouds
  kourou: {
    name: "Kourou", lat: 5.2, lon: -52.8, land: 0x8fbf7a, sea: true, plants: [1.25, 1.6], plantTint: 0x2f6a2c, cloudy: 1,
    horizon: 0xc9d4de, mid: 0x8fa8c2, zenith: 0x3d5f8e, fog: 0xc4ced8
  },
  // Baikonur: flat, dry steppe far from any sea
  baikonur: {
    name: "Baikonur", lat: 45.9, lon: 63.3, ground: "steppe", land: 0xffffff, sea: false, plants: [0.35, 0], plantTint: 0x9a8d5c, cloudy: 0,
    horizon: 0xe4e6e2, mid: 0xa9c4e2, zenith: 0x4677bb, fog: 0xe0e2dc
  }
};
const ROCKET_SITE = { "ariane-5": "kourou", proton: "baikonur" };
let siteLook = SITE_LOOKS.florida;

function applySiteLook(look) {
  siteLook = look;
  const u = coastGroup.userData;
  if (u.land) {
    if (!u.landMaps) u.landMaps = { grass: u.land.material.map, steppe: null };
    if (look.ground === "steppe" && !u.landMaps.steppe) u.landMaps.steppe = steppeTexture();
    u.land.material.map = look.ground === "steppe" ? u.landMaps.steppe : u.landMaps.grass;
    u.land.material.color.set(look.land);
    u.land.material.needsUpdate = true;
  }
  (u.sea || []).forEach(function (mesh) { mesh.visible = look.sea; });
  (u.plants || []).forEach(function (mesh, i) {
    mesh.visible = look.plants[i] > 0;
    mesh.scale.set(1, look.plants[i] || 1, 1);
    if (mesh.material) mesh.material.color.set(look.plantTint || 0xffffff);
  });
  (u.clouds || []).forEach(function (cloud, i) {
    // more and lower clouds at Kourou; a few high ones elsewhere
    cloud.visible = look.cloudy > 0 || i % 2 === 0;
    cloud.scale.setScalar(look.cloudy ? 1.3 : 1);
    if (cloud.userData.baseY === undefined) cloud.userData.baseY = cloud.position.y;
    cloud.position.y = cloud.userData.baseY * (look.cloudy ? 0.85 : 1);
  });
  skyMaterial.uniforms.uHorizon.value.set(look.horizon);
  skyMaterial.uniforms.uMid.value.set(look.mid);
  skyMaterial.uniforms.uZenith.value.set(look.zenith);
  scene.fog = new THREE.Fog(look.fog, look.cloudy ? 380 : 400, look.cloudy ? 4600 : 5200);
  // the Earth of the climb turns so this site is under the rocket
  if (earthBall && earthBall.children[0]) earthBall.children[0].quaternion.copy(siteOnTop(look.lat, look.lon));
}

// A number made from the mission's name and rocket: picks this mission's own camera shots, sun angle
// and weather, so two missions never look the same (but the same mission always plays the same way)
let missionSeed = 0;
function seedFrom(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}
function pick(list, salt) {
  return list[Math.floor(seedFrom(String(missionSeed) + salt) * list.length) % list.length];
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
  sunLight.intensity = coast ? 2.2 : 2.4; // natural daylight (3.0 washed the pad out to white)
  if (renderer) renderer.toneMappingExposure = coast ? 0.95 : 1.2;
  sunLight.position.set(coast ? -200 : -300, coast ? 320 : 70, coast ? 400 : 500);
  sunSprite.visible = !coast;
}

// Earth seen from high up during the climb to orbit. It uses the same Earth as the Solar System
// (js/planet-look.js): the real day map, surface relief and ocean shine from the CDN, with a real cloud
// layer above it. Offline, both fall back to painted maps, so the scene still works.
const EARTH_R = 6000;   // display units (about 1 unit per km at this scale)
// The launch site at the top of the globe: Kennedy Space Center, Florida (28.6 N, 80.6 W).
// Every launch in this simulator shares this view; it is an illustration of the climb, not a
// trajectory for the specific mission.
const LAUNCH_SITE = { lat: 28.6, lon: -80.6 };

// Turns the globe so a latitude/longitude point faces straight up (+Y), with east along +X,
// which is the direction the rocket pitches over toward.
function siteOnTop(lat, lon) {
  // three.js SphereGeometry: u = longitude from -180, v = latitude; this is the matching direction
  const phi = (lon + 180) / 360 * Math.PI * 2;
  const theta = (90 - lat) / 180 * Math.PI;
  const up = new THREE.Vector3(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
  const east = new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi)).normalize();
  const toTop = new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3(0, 1, 0));
  east.applyQuaternion(toTop);
  const spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(east.z, east.x));
  return spin.multiply(toTop);
}

function buildEarthBall() {
  earthBall = new THREE.Group();
  const globe = new THREE.Group();
  globe.quaternion.copy(siteOnTop(LAUNCH_SITE.lat, LAUNCH_SITE.lon));
  earthBall.add(globe);
  const surface = planetMaterial("Earth", null, { hd: true }); // the 4096 px day map: much sharper this close
  // fine grain on the ground for the close views early in the climb (fades out with distance)
  addSurfaceDetail(surface, { repeat: 900, near: 400, far: 3500, strength: 0.28, bump: 0.25 });
  surface.fog = false;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 192, 128), surface);
  globe.add(ball);
  const cloudLayer = cloudMaterial();
  cloudLayer.fog = false;
  cloudLayer.opacity = 0.55; // thin, so the coast and the ocean show through
  addSurfaceDetail(cloudLayer, { repeat: 700, near: 400, far: 3500, strength: 0.35, bump: 0.6 }); // puffy texture up close
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.002, 192, 128), cloudLayer);
  globe.add(clouds);
  // The air: the same soft glow as the Solar System's Earth (bright, thin blue haze at the horizon that
  // fades into black space), instead of a flat colored shell
  const air = createGlow(EARTH_R, { color: 0x6aa8ff, strength: 0.8, size: 1.018 });
  air.traverse(function (o) { if (o.material) o.material.fog = false; });
  earthBall.add(air);
  earthBall.visible = false;
  scene.add(earthBall);
  // The path flown so far, drawn on the turning Earth (it starts at the launch site), and a glowing
  // marker on the rocket: in the final pull-back the rocket itself is far too small to see
  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(600 * 3), 3));
  trailGeometry.setDrawRange(0, 0);
  ascentTrail = new THREE.Line(trailGeometry, new THREE.LineBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  ascentTrail.frustumCulled = false;
  earthBall.add(ascentTrail);
  // a deck of clouds a little above the ground, which the rocket climbs up through early in the climb
  cloudDeck = new THREE.Group();
  const deckMap = cloudPuffTexture();
  for (let i = 0; i < 70; i++) {
    const puff = new THREE.Sprite(new THREE.SpriteMaterial({ map: deckMap, color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
    const a = random(0, Math.PI * 2);
    const d = Math.pow(Math.random(), 0.6) * 900;
    puff.position.set(Math.cos(a) * d, random(-6, 6), Math.sin(a) * d);
    const size = random(90, 220);
    puff.scale.set(size * 1.6, size * 0.6, 1);
    cloudDeck.add(puff);
  }
  cloudDeck.visible = false;
  scene.add(cloudDeck);
  ascentMarker = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeSunTexture(), color: 0xfff1d6, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false }));
  scene.add(ascentMarker);
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
    starPositions[i * 3] = direction.x * 18000;
    starPositions[i * 3 + 1] = direction.y * 18000;
    starPositions[i * 3 + 2] = direction.z * 18000;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      color: 0xffffff, size: 2, sizeAttenuation: false,
      transparent: true, opacity: 0, depthWrite: false, depthTest: true, fog: false
    })
  );
  // Stars sit far beyond Earth and test depth, so Earth hides them. (They were drawn with no depth test
  // after Earth, which put stars on top of the planet.)
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

// Gives a standard material soft studio reflections, so painted and metal parts show highlights
// instead of looking flat. strength 0-1 (kept low: the sun and sky stay the main light).
function litLikeMetal(material, strength) {
  if (!reflections || !material || !material.isMeshStandardMaterial) return;
  material.envMap = reflections;
  material.envMapIntensity = strength;
  material.needsUpdate = true;
}

function spawnRocket(rocketType, look) {
  if (rocketRoot) scene.remove(rocketRoot);
  detached.forEach(function (booster) { scene.remove(booster); });
  detached = [];

  rocketRoot = new THREE.Group();
  rocketModel = createRocket(rocketType, look) || createLauncher(); // the mission's real rocket, or the generic one
  rocketModel.scale.setScalar(ROCKET_SCALE);
  rocketModel.traverse(function (o) {
    if (o.isMesh && o.material && o.material.clone) {
      o.material = o.material.clone();
      litLikeMetal(o.material, 0.55);
      o.castShadow = true;
      o.receiveShadow = true;
    }
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
  [towerGroup, armPivot].forEach(function (group) {
    group.traverse(function (o) {
      if (o.isMesh) {
        o.castShadow = true;
        if (o.material) litLikeMetal(o.material, 0.35);
      }
    });
  });

  // The sun's shadow camera covers the pad and the tallest rocket (sizes grow with the rocket)
  const reach = Math.max(90, heightMeters * 1.3);
  const shadowCam = sunLight.shadow.camera;
  shadowCam.left = -reach;
  shadowCam.right = reach;
  shadowCam.top = reach * 1.4;
  shadowCam.bottom = -reach * 0.6;
  shadowCam.near = 10;
  shadowCam.far = 1500;
  shadowCam.updateProjectionMatrix();
  sunLight.target.position.set(0, heightMeters * 0.35, 0);
  rocketRoot.add(rocketModel);

  // Stand the rocket on its hold-down posts above the flame trench. The models hang their engine
  // nozzles a few metres below their origin, so without this lift the engines (and their fire)
  // were buried inside the pad. The lift is measured from the model, so it fits every rocket.
  rocketModel.updateMatrixWorld(true);
  const nozzles = Math.max(0, -new THREE.Box3().setFromObject(rocketModel).min.y);
  const lift = nozzles + 1.2; // clearance between the nozzles and the trench opening
  restY = PAD_Y + lift;
  rocketRoot.position.set(0, restY, 0);
  buildMount(lift, radiusMeters);

  boosters = rocketModel.userData.boosters.slice();
  scene.add(rocketRoot);
}

// The launch mount: four hold-down posts on the pad, just outside the engines, that the rocket rests on
// until liftoff (they stay behind on the pad)
function buildMount(lift, radius) {
  if (mountGroup) padGroup.remove(mountGroup);
  mountGroup = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x5f656e, roughness: 0.55, metalness: 0.6 });
  litLikeMetal(steel, 0.35);
  const r = Math.max(radius * 0.92, 3.5);
  for (let i = 0; i < 4; i++) {
    const angle = Math.PI / 4 + (i * Math.PI) / 2;
    const post = new THREE.Mesh(new THREE.BoxGeometry(1.4, lift, 1.4), steel);
    post.position.set(Math.cos(angle) * r, PAD_Y + lift / 2, Math.sin(angle) * r);
    post.castShadow = true;
    post.receiveShadow = true;
    mountGroup.add(post);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 2.2), steel);
    cap.position.set(post.position.x, PAD_Y + lift - 0.25, post.position.z);
    cap.castShadow = true;
    mountGroup.add(cap);
  }
  padGroup.add(mountGroup);
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5)); // sharp: the screen's real pixel density
  // Filmic tone mapping, like the Solar System, landing and Mission Builder scenes: bright engine light
  // and sunlit paint roll off smoothly instead of clipping to flat white
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  // Soft sun shadows on the pad (the rocket, tower and arm cast them)
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf0b98a, 120, 2600);

  camera = new THREE.PerspectiveCamera(50, 1, 0.5, 40000);

  // Reflections for metal and paint: a soft studio environment built in code (no download)
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    reflections = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  } catch (error) {
    reflections = null; // optional
  }

  scene.add(new THREE.HemisphereLight(0x9fb4e8, 0x4a3d33, 0.9));
  sunLight = new THREE.DirectionalLight(0xffc48a, 2.4);
  sunLight.position.set(-300, 70, 500);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.4;
  scene.add(sunLight);
  scene.add(sunLight.target);

  padLight = new THREE.PointLight(0xff9a45, 0, 240, 1.2);
  padLight.position.set(0, 5, 0);
  scene.add(padLight);

  buildSky();
  buildEnvironment();
  buildEarthBall();
  // 1200 sprites: enough for the thick pad smoke at liftoff; when it is full, the oldest smoke is
  // reused so the engine fire never drops out (see js/particles.js)
  particles = createParticleSystem(scene, 1200);
  particles.setCamera(camera); // smoke right in front of the lens fades instead of whiting out the view
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
window.addEventListener("resize", resize);

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
  // Every scene after the rollout puts the rocket back on its pad and hides the crawler, before the
  // scene sets itself up. (Jumping straight to the climb skipped the countdown, so the crawler and
  // its tower stayed beside the rocket and flew up into space with it.)
  if (id !== "rollout") endRollout();

  captionBox.textContent =
    id === "liftoff" && captionOverride ? captionOverride : activeScenes[index].caption;
  cabin.classList.toggle("visible", id === "cabin");
  countdownBox.classList.toggle("hidden", id === "walkout");

  rocketRoot.visible = id !== "cabin"; // in the cabin we are inside the spacecraft
  if (id === "ascent") beginAscent();
  if (id === "launch") {
    ignitionPlayed = false;
    countdownBox.classList.remove("hidden");
  }

  if (id === "rollout" && rollout) {
    captionBox.textContent = ROLLOUT_CAPTION[rollout.style];
    countdownBox.textContent = "ROLLOUT";
    countdownBox.classList.remove("hidden");
  }
  astronauts.forEach(function (astronaut) {
    astronaut.visible = id === "walkout"; // the crew is inside the vehicle after the walkout
  });
  camera.fov = id === "cabin" ? 62 : id === "liftoff" ? 40 : id === "ascent" ? 45 : id === "launch" ? 30 : id === "rollout" ? 38 : 50;
  camera.updateProjectionMatrix();

  Object.keys(carry).forEach(function (key) { carry[key] = 0; });
  lastBeep = -1;

  blink();
}

// ----- Camera shake -----
// A smooth, rumbling shake made of a few sine waves at unrelated speeds. Before, every frame jumped to a
// new random offset, which looked like jitter (and got worse on fast screens). This moves continuously,
// like a camera on a tripod near a launch.
function shakeCamera(amount, target) {
  if (reduceMotion || wantsReducedMotion() || amount <= 0) return;
  const s = performance.now() / 1000;
  const wave = function (a, b, c) { return Math.sin(s * a) * 0.55 + Math.sin(s * b + 1.7) * 0.3 + Math.sin(s * c + 4.1) * 0.15; };
  camera.position.x += wave(23.1, 37.7, 61.3) * amount;
  camera.position.y += wave(29.3, 43.9, 71.9) * amount;
  target.x += wave(19.7, 33.1, 53.3) * amount * 0.6;
  target.y += wave(26.9, 41.3, 67.1) * amount * 0.6;
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

function emitFire(base, power, dt) {
  // 60 puffs per second from each engine
  const count = perSecond("fire", 60, dt);
  for (let k = 0; k < count; k++) {
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
        position.y -= size * 0.4; // start just below the nozzle, so the bell does not cut the flame's shape
        particles.emit(true, spread(position, velocity, dt), velocity, size, 1.5, random(0.22, 0.42), 0.7, undefined, 0);
      });
      continue;
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
      position.y -= size * 0.4; // start just below the nozzle
      particles.emit(true, spread(position, velocity, dt), velocity, size, 1.5, random(0.22, 0.42), 0.7, undefined, 0);
    });
  }
}

function emitSmoke(base, rocketY, power, t, dt) {
  // Smoke and steam spreading over the pad (covers the bottom of the screen)
  if (rocketY < 160) {
    carry.smoke += (t < LIFTOFF_AT ? 40 + 60 * power : 150) * dt;
    while (carry.smoke >= 1) {
      carry.smoke -= 1;
      const angle = random(0, Math.PI * 2);
      const speed = random(6, t < LIFTOFF_AT ? 16 : 26);
      const position = new THREE.Vector3(random(-6, 6), PAD_Y + 1.5, random(-6, 6));
      const velocity = new THREE.Vector3(Math.cos(angle) * speed, random(0.5, 3), Math.sin(angle) * speed);
      // steam near the engines is lit from below by the fire: more of it is warm at full thrust
      const tint = Math.random() < 0.25 + 0.3 * power ? (power > 0.6 ? 0xffc690 : 0xffd9b0) : 0xffffff;
      particles.emit(false, position, velocity, random(12, 20), random(55, 90), random(6, 9), random(0.5, 0.7), tint, 0.3);
    }
  }

  // Exhaust deflected down the flame trench comes out to both sides in big rolling clouds
  if (power > 0.3 && rocketY < 220) {
    carry.trench = (carry.trench || 0) + 24 * power * dt;
    while (carry.trench >= 1) {
      carry.trench -= 1;
      const side = Math.random() < 0.5 ? -1 : 1;
      const position = new THREE.Vector3(side * random(35, 55), PAD_Y + random(1, 4), random(-6, 6));
      const velocity = new THREE.Vector3(side * random(14, 26), random(2, 7), random(-3, 3));
      particles.emit(false, position, velocity, random(10, 16), random(36, 64), random(4.5, 6.5), random(0.45, 0.65), 0xf3f1ec, 0.4);
    }
  }

  // A trail left behind the rising vehicle
  if (rocketY > 6 && rocketY < 700) {
    carry.trail += 60 * dt;
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

  let rocketY = restY;
  if (sinceLiftoff > 0) {
    rocketY += 0.5 * 8 * sinceLiftoff * sinceLiftoff + 2.2 * sinceLiftoff * sinceLiftoff * sinceLiftoff;
  }
  rocketRoot.position.y = rocketY;
  const base = rocketRoot.position;

  if (power > 0.02) {
    emitFire(base, power, dt);
    emitSmoke(base, rocketY, power, t, dt);
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
function emitDeluge(power, dt) {
  // The sound suppression system floods the pad with water just before ignition (240 sprays a second)
  const count = perSecond("deluge", 240, dt);
  for (let i = 0; i < count; i++) {
    const angle = random(0, Math.PI * 2);
    const r = random(6, 12);
    const position = new THREE.Vector3(Math.cos(angle) * r, PAD_Y + 0.5, Math.sin(angle) * r);
    const velocity = new THREE.Vector3(Math.cos(angle) * random(2, 6), random(6, 14), Math.sin(angle) * random(2, 6)).multiplyScalar(power);
    particles.emit(false, position, velocity, random(1.5, 3), random(6, 10), random(1, 1.8), 0.55, 0xe8f2ff, 0.8);
  }
}

function updateMissionLaunch(t, dt) {
  updatePadProcess(t);
  const waves = coastGroup && coastGroup.userData.waves;
  if (waves) { waves.offset.x += dt * 0.012; waves.offset.y += dt * 0.005; }
  if (coastGroup && coastGroup.userData.surf) coastGroup.userData.surf.material.opacity = 0.6 + 0.25 * Math.sin(t * 1.3);
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
  let rocketY = restY;
  if (sinceLiftoff > 0) rocketY += 0.5 * 2.2 * sinceLiftoff * sinceLiftoff + 0.25 * sinceLiftoff * sinceLiftoff * sinceLiftoff;
  rocketRoot.position.y = rocketY;
  rocketRoot.rotation.z = -smoothstep(LAUNCH_LIFTOFF + 4, SCENES[4].duration, t) * 0.08; // the roll and pitch program begins
  const base = rocketRoot.position;
  if (t > 2 && t < LAUNCH_LIFTOFF + 4) emitDeluge(t < LAUNCH_IGNITION ? 0.6 : 1, dt);
  if (ignition > 0.01) {
    emitFire(base, ignition * (sinceLiftoff > 0 ? 1 : 0.85), dt);
    emitSmoke(base, rocketY, ignition, sinceLiftoff > 0 ? LIFTOFF_AT + 0.1 : 0, dt);
  }
  const flicker = 0.85 + Math.random() * 0.3;
  padLight.intensity = 320 * ignition * flicker * (1 - smoothstep(10, 140, rocketY));
  padLight.position.set(0, base.y + 4, 0);

  // Camera shots: four moments (venting, ignition, liftoff, climb), each filmed with one of several
  // shots chosen for this mission (see shotPlan), so every mission's launch looks different
  const s = frameScale;
  let shake = 0;
  let target;
  const plan = shotPlan || { venting: "water", ignition: "engines", liftoff: "tower", climb: "tracking" };
  const lift = Math.max(0, rocketY - restY);
  if (t < LAUNCH_IGNITION - 0.5) {
    if (plan.venting === "front") {
      // straight down the approach road: the pad, the rocket and its tower in the middle
      camera.fov = 30;
      camera.position.set(0, 6, 360 * s - t * 6);
      target = new THREE.Vector3(0, 40 * s, 0);
    } else if (plan.venting === "drone") {
      // a slow drone circle high above the pad
      const a = 0.6 + t * 0.05;
      camera.fov = 40;
      camera.position.set(Math.cos(a) * 160 * s, 150 * s, Math.sin(a) * 160 * s);
      target = new THREE.Vector3(0, 20 * s, 0);
    } else {
      // long lens across the water (or the plain), steam venting
      camera.fov = 16;
      camera.position.set(620 * s, 12, 820 * s);
      target = new THREE.Vector3(0, 32 * s, 0);
    }
    for (let v = perSecond("vent", 18, dt); v > 0; v--) particles.emit(false, new THREE.Vector3(random(-2, 2), random(20, 50) * s, random(-2, 2)), new THREE.Vector3(random(1, 3), random(-0.5, 0.5), 0), random(1.5, 3), random(6, 10), 2.5, 0.4, 0xffffff, 0.5); // venting
  } else if (t < LAUNCH_LIFTOFF + 1.2) {
    if (plan.ignition === "under") {
      // a camera beside the flame trench, looking up past the engines at the whole rocket
      camera.fov = 70;
      camera.position.set(-9 * s, 1.2, 9 * s);
      target = new THREE.Vector3(0, 30 * s + lift, 0);
      shake = 0.1 + 0.35 * ignition;
    } else {
      // close on the engines, from in front of the pad: the trench smoke rolls out to both sides
      camera.fov = 38;
      camera.position.set(10 * s, 4, 58 * s);
      target = new THREE.Vector3(0, 3.5 * s + lift * 0.6, 0);
      shake = 0.05 + 0.25 * ignition;
    }
  } else if (t < LAUNCH_LIFTOFF + 4.2) {
    if (plan.liftoff === "front") {
      // head-on from the approach road: smoke rolling out to both sides, the rocket rising in the middle
      camera.fov = 34;
      camera.position.set(0, 5, 300 * s);
      target = new THREE.Vector3(0, 35 * s + lift * 0.8, 0);
      shake = 0.15;
    } else if (plan.liftoff === "drone") {
      // looking straight down from above: the rocket climbs toward the camera out of its own smoke
      camera.fov = 50;
      camera.position.set(6 * s, rocketY + 140 * s - (t - LAUNCH_LIFTOFF) * 6 * s, 30 * s);
      target = new THREE.Vector3(0, 0, 0);
      shake = 0.05;
    } else {
      // from the base of the tower looking up as the rocket clears it
      camera.fov = 55;
      camera.position.set(22 * s, 3, 18 * s);
      target = new THREE.Vector3(0, rocketY + 30 * s, 0);
      shake = 0.35;
    }
  } else {
    if (plan.climb === "clouds") {
      // closer, from the side, as it climbs toward the clouds
      camera.fov = 30;
      camera.position.set(-260 * s, rocketY * 0.7 + 40, 380 * s);
      target = new THREE.Vector3(0, rocketY + 10 * s, 0);
      shake = 0.03;
    } else if (plan.climb === "below") {
      // from near the pad, looking almost straight up at the rising flame
      camera.fov = 45;
      camera.position.set(60 * s, 4, 90 * s);
      target = new THREE.Vector3(0, rocketY + 10 * s, 0);
      shake = 0.08;
    } else {
      // a tracking camera far away follows the rocket up into the sky
      camera.fov = 24;
      camera.position.set(-520 * s, 20, 760 * s);
      target = new THREE.Vector3(0, rocketY + 20 * s, 0);
      shake = 0.04;
    }
  }
  if (camera.position.distanceTo(target) < 1) target.x += 1; // (never look from a point at itself)
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
      PAD_CAPTION[padStyle] || "T-10 seconds. The water deluge floods the pad to absorb the sound and heat of the engines.",
      "Ignition sequence start. The engines build up to full thrust while the hold-down arms keep the rocket on the pad.",
      "Liftoff! The hold-down arms release. A heavy rocket rises slowly at first.",
      "The rocket has cleared the tower. The roll and pitch program turns it toward its path to orbit."
    ][step];
    blink();
  }
}
let launchStep = -1;
let shotPlan = null;
let missionSun = null; // this mission's sun position at the pad

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
  sunLight.castShadow = false; // nothing below the rocket to receive a shadow up here
  sunSprite.visible = false;
  if (cloudDeck) cloudDeck.visible = true;
  detached.forEach(function (part) { scene.remove(part); });
  detached = [];
  rocketRoot.position.set(0, 0, 0);
  rocketRoot.rotation.set(0, 0, 0);
  const split = STAGE_SPLIT[rocketKey];
  if (ascentTrail) { ascentTrail.geometry.setDrawRange(0, 0); ascentTrail.material.opacity = 0; }
  if (ascentMarker) ascentMarker.material.opacity = 0;
  ascent = {
    trailCount: 0,
    trailTimer: 0,
    step: -1,
    split: split ? split * rocketModel.userData.height : 0,
    lower: null,
    nose: [],
    clips: [],
    frame: 0,
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

// ----- Separations -----
// A part comes off by cloning the rocket and cutting both copies with clipping planes (in the model's
// own space, so the cut follows every tumble). Each cut face gets a dark cap, so no part looks hollow.
function clipPart(object, localPlanes) {
  const entry = { object: object, locals: localPlanes, worlds: localPlanes.map(function () { return new THREE.Plane(); }) };
  ascent.clips = (ascent.clips || []).filter(function (c) { return c.object !== object; });
  ascent.clips.push(entry);
  object.traverse(function (o) { if (o.isMesh && o.material && !o.userData.cap) o.material.clippingPlanes = entry.worlds; });
  return entry;
}

function updateClipping() {
  if (!ascent || !ascent.clips) return;
  ascent.clips.forEach(function (c) {
    c.object.updateMatrixWorld(true);
    c.locals.forEach(function (local, i) { c.worlds[i].copy(local).applyMatrix4(c.object.matrixWorld); });
  });
}

// The rocket body's radius (model units) at a height, measured from the core's cylinders
function radiusAt(model, y) {
  model.updateMatrixWorld(true);
  const toModel = new THREE.Matrix4().copy(model.matrixWorld).invert();
  const box = new THREE.Box3();
  let best = 0;
  model.traverse(function (o) {
    if (!o.isMesh || !o.geometry || !o.geometry.parameters || o.geometry.parameters.radiusTop === undefined) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    box.copy(o.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(toModel, o.matrixWorld));
    const cx = (box.min.x + box.max.x) / 2;
    const cz = (box.min.z + box.max.z) / 2;
    const r = (box.max.x - box.min.x) / 2;
    if (box.min.y <= y && box.max.y >= y && Math.hypot(cx, cz) < r * 0.5) best = Math.max(best, r);
  });
  return best || (model.userData.radius || 1) * 0.4;
}

// A dark disc that closes a cut (the inside of the interstage: tanks' domes and plumbing, simplified)
function capAt(model, y, facingUp) {
  const cap = new THREE.Mesh(
    new THREE.CircleGeometry(radiusAt(model, y) * 0.99, 40),
    new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.75, metalness: 0.4, side: THREE.DoubleSide })
  );
  cap.userData.cap = true;
  cap.rotation.x = facingUp ? -Math.PI / 2 : Math.PI / 2;
  cap.position.y = y;
  model.add(cap);
  return cap;
}

function cloneForSeparation() {
  const copy = rocketModel.clone(true);
  const caps = [];
  copy.traverse(function (o) { if (o.userData.cap && o.parent === copy) caps.push(o); });
  caps.forEach(function (o) { copy.remove(o); }); // earlier cut faces and the payload stay with the rocket
  copy.traverse(function (o) {
    if (o.isMesh && o.material && o.material.clone) {
      o.material = o.material.clone();
      o.material.clippingPlanes = null;
    }
  });
  rocketRoot.updateMatrixWorld(true);
  copy.matrixAutoUpdate = true;
  scene.add(copy);
  // Copy where the rocket is and which way it points. (Reading the rotation straight from the matrix
  // went wrong, because the matrix also holds the model's x8 scale: the dropped stage came out turned
  // sideways and swung across the camera, looking huge.)
  rocketModel.matrixWorld.decompose(copy.position, copy.quaternion, copy.scale);
  return copy;
}

// A short puff of gas and a flash in the gap between two separating parts
function separationPuff(localY, radius, count, warm) {
  rocketRoot.updateMatrixWorld(true);
  const center = rocketModel.localToWorld(new THREE.Vector3(0, localY, 0));
  const r = radius * ROCKET_SCALE;
  for (let i = 0; i < count; i++) {
    const angle = random(0, Math.PI * 2);
    const out = new THREE.Vector3(Math.cos(angle), random(-0.2, 0.2), Math.sin(angle)).applyQuaternion(rocketRoot.quaternion);
    const position = center.clone().addScaledVector(out, r);
    const velocity = out.clone().multiplyScalar(random(6, 16));
    particles.emit(warm && i % 3 === 0, position, velocity, random(1, 2) * (r / 4 + 0.5), random(6, 12) * (r / 4 + 0.5), random(0.6, 1.4), 0.6, warm ? 0xffd6a8 : 0xe6eef8, 1.2);
  }
}

// Staging: the first stage is cut off at the stage line and falls away, tumbling slowly, while the
// upper stage carries on. Simplified, but in the real order: engines off, a short coast, the stages
// part (a puff of gas between them), then the next engine lights.
function separateStage() {
  if (!ascent.split || ascent.lower) return;
  const lower = cloneForSeparation();
  clipPart(rocketModel, [new THREE.Plane(new THREE.Vector3(0, 1, 0), -ascent.split)]);
  clipPart(lower, [new THREE.Plane(new THREE.Vector3(0, -1, 0), ascent.split)]);
  capAt(rocketModel, ascent.split + 0.002, false);
  capAt(lower, ascent.split - 0.002, true);
  // relative speed: a few meters per second at first; the gap then grows as the upper stage accelerates
  lower.userData.velocity = new THREE.Vector3(0, -3, 0).applyQuaternion(rocketRoot.quaternion);
  lower.userData.spin = random(0.04, 0.09) * (Math.random() < 0.5 ? -1 : 1);
  lower.userData.tumble = random(0.02, 0.05);
  lower.userData.age = 0;
  ascent.lower = lower;
  separationPuff(ascent.split, radiusAt(rocketModel, ascent.split), 70, true);
  play("separation");
}

// The nose comes off: the launch escape tower flies away on its own motor, or the payload fairing
// opens like a clamshell and its two halves fall away to the sides.
function separateNose() {
  const cut = NOSE_CUT[rocketKey];
  if (!cut) return;
  const y = (cut[0] / cut[1]) * rocketModel.userData.height;
  const tower = Boolean(ESCAPE_TOWER[rocketKey]);
  const keepBelow = new THREE.Plane(new THREE.Vector3(0, -1, 0), y);
  const existing = (ascent.clips || []).find(function (c) { return c.object === rocketModel; });
  clipPart(rocketModel, (existing ? existing.locals : []).concat([keepBelow]));
  const r = radiusAt(rocketModel, y + 0.01);
  if (tower) {
    const piece = cloneForSeparation();
    clipPart(piece, [new THREE.Plane(new THREE.Vector3(0, 1, 0), -y)]);
    piece.userData.kind = "tower";
    piece.userData.age = 0;
    piece.userData.velocity = new THREE.Vector3(0, 6, 0).applyQuaternion(rocketRoot.quaternion);
    piece.userData.localY = y;
    ascent.nose = [piece];
  } else {
    // the payload inside, now in view (an illustrative stand-in: a foil-wrapped spacecraft on an adapter)
    const top = rocketModel.userData.height;
    const inner = new THREE.Group();
    const foil = new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.35, metalness: 0.85 });
    const white = new THREE.MeshStandardMaterial({ color: 0xdedfe2, roughness: 0.6, metalness: 0.2 });
    const adapter = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.8, (top - y) * 0.12, 24), white);
    adapter.position.y = (top - y) * 0.06;
    inner.add(adapter);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, (top - y) * 0.42, 8), foil);
    body.position.y = (top - y) * 0.33;
    inner.add(body);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(r * 0.38, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.4), white);
    dish.position.y = (top - y) * 0.56;
    inner.add(dish);
    inner.position.y = y;
    inner.userData.cap = true;
    inner.traverse(function (o) { o.userData.cap = true; });
    rocketModel.add(inner);
    capAt(rocketModel, y, true);
    // two halves: cut above the fairing base, then split down the middle
    ascent.nose = [-1, 1].map(function (side) {
      const half = cloneForSeparation();
      clipPart(half, [new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), new THREE.Plane(new THREE.Vector3(side, 0, 0), 0)]);
      half.userData.kind = "fairing";
      half.userData.side = side;
      half.userData.age = 0;
      half.userData.localY = y;
      half.userData.velocity = new THREE.Vector3(side * 2.5, 0.5, 0).applyQuaternion(rocketRoot.quaternion);
      return half;
    });
  }
  separationPuff(y, r, tower ? 18 : 30, tower);
  play("separation");
}

// Moves the separated parts. Everything is seen from the upper stage, which keeps accelerating,
// so dropped parts fall back ("back" = down the rocket's axis) and drift slowly to the side.
function updateSeparatedParts(dt) {
  const back = new THREE.Vector3(0, -1, 0).applyQuaternion(rocketRoot.quaternion);
  const up = back.clone().negate();
  if (ascent.lower) {
    const lower = ascent.lower;
    lower.userData.age += dt;
    lower.userData.velocity.addScaledVector(back, dt * 9);
    lower.position.addScaledVector(lower.userData.velocity, dt);
    lower.rotateZ(dt * lower.userData.spin);
    lower.rotateX(dt * lower.userData.tumble);
  }
  (ascent.nose || []).forEach(function (piece) {
    piece.userData.age += dt;
    const age = piece.userData.age;
    if (piece.userData.kind === "tower") {
      // its own solid motor burns for about a second and a half, pulling it ahead and to one side
      if (age < 1.6) {
        piece.userData.velocity.addScaledVector(up, dt * 60).addScaledVector(new THREE.Vector3(1, 0, 0).applyQuaternion(rocketRoot.quaternion), dt * 14);
        piece.updateMatrixWorld(true);
        const nozzle = piece.localToWorld(new THREE.Vector3(0, piece.userData.localY + 0.5, 0));
        for (let k = perSecond("towerFire", 90, dt); k > 0; k--) {
          const angle = random(0, Math.PI * 2);
          const v = back.clone().multiplyScalar(random(30, 50)).add(new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(random(6, 12)));
          particles.emit(true, nozzle.clone(), v, 1.2, 4, random(0.25, 0.4), 0.9, undefined, 0);
        }
      } else {
        piece.userData.velocity.addScaledVector(back, dt * 9);
      }
      piece.rotateZ(dt * 0.15);
    } else {
      // fairing halves swing open on their base hinge, then tumble away to the side
      piece.userData.velocity.addScaledVector(back, dt * (age > 0.6 ? 9 : 2));
      const open = Math.min(1, age / 1.4);
      piece.rotateZ(-piece.userData.side * dt * (0.35 + open * 0.4));
    }
    piece.position.addScaledVector(piece.userData.velocity, dt);
  });
}

function emitAscentFire(power, altitude, dt) {
  const count = perSecond("ascentFire", 120, dt);  // 120 puffs per second from each engine
  const trail = perSecond("ascentTrail", 60, dt);
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
    for (let k = 0; k < count; k++) {
      const velocity = up.clone().multiplyScalar(-random(70, 110)).add(new THREE.Vector3(random(-4, 4), random(-4, 4), random(-4, 4)).multiplyScalar(1 + vacuum * 4));
      const size = engine.size * 3.2 * power * (1 + vacuum * 2.5);
      particles.emit(true, spread(world.clone(), velocity, dt), velocity, size, size * (2 + vacuum * 4), random(0.25, 0.45) * (1 + vacuum), 0.85 - vacuum * 0.35, vacuum > 0.5 ? 0xbfd6ff : undefined, 0);
    }
  });
  // A white smoke trail in the lower atmosphere only
  if (altitude < 45 && !ascent.secondStage) {
    const tail = rocketModel.localToWorld(new THREE.Vector3(0, 0, 0));
    for (let k = 0; k < trail; k++) {
      const velocity = up.clone().multiplyScalar(-random(60, 80));
      particles.emit(false, spread(tail.clone(), velocity, dt), velocity, random(6, 10), random(26, 40), random(2.5, 4), 0.35 * (1 - altitude / 45), 0xffffff, 0.4);
    }
  }
}

// Max Q: a cone of condensed vapor can form around the rocket for a moment
function vaporCone(dt) {
  rocketRoot.updateMatrixWorld(true);
  const mid = rocketModel.localToWorld(new THREE.Vector3(0, rocketModel.userData.height * 0.55, 0));
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(rocketRoot.quaternion);
  const count = perSecond("vapor", 250, dt);
  for (let i = 0; i < count; i++) {
    const angle = random(0, Math.PI * 2);
    const out = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).applyQuaternion(rocketRoot.quaternion).multiplyScalar(random(3, 7));
    particles.emit(false, mid, out.addScaledVector(up, -random(40, 60)), random(2, 4), random(8, 14), random(0.35, 0.6), 0.5, 0xffffff, 1.5);
  }
}

function updateAscent(t, dt) {
  // fades in; no fade to black at the end: the next scene takes over from the whole-Earth view
  fadeBox.style.opacity = String(1 - smoothstep(0, 0.6, t));

  // Height above Earth in display units. Not to scale: the rocket is drawn hundreds of times too big,
  // so Earth is moved much farther away than the real altitude, until the whole planet is in view and
  // looks like the Solar System's Earth (same maps), instead of a blurred close-up of the ground.
  const climb = smoothstep(0, 25, t);
  const altitude = 10 + 1500 * Math.pow(climb, 1.6);
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
  if (ascent.engineOff <= 0) emitAscentFire(throttle, altitude, dt);
  if (ascent.step === 1) vaporCone(dt);
  countdownBox.textContent = steps[Math.max(0, ascent.step)][1];

  // Earth below: farther away and curving as we climb; it slides backward as we gain speed
  ascent.downrange += dt * (0.002 + 0.01 * smoothstep(0, 20, t));
  earthBall.position.set(0, -(EARTH_R + altitude * 0.94), 0);
  earthBall.rotation.z = ascent.downrange;
  skyMaterial.uniforms.uSpace.value = smoothstep(15, 160, altitude);
  stars.material.opacity = smoothstep(120, 420, altitude);
  // the cloud layer sits about 30 units above the ground: the rocket passes up through it, and it drops away
  if (cloudDeck) {
    cloudDeck.visible = altitude < 400;
    cloudDeck.position.set(0, earthBall.position.y + EARTH_R + 30, 0);
    const fade = 1 - smoothstep(200, 400, altitude);
    cloudDeck.children.forEach(function (puff) { puff.material.opacity = 0.85 * fade * (siteLook.cloudy ? 1 : 0.7); });
  }
  // above the air the Sun shines in a black sky
  sunSprite.visible = altitude > 150;
  sunSprite.position.copy(sunLight.position).normalize().multiplyScalar(2600).add(camera.position);
  sunSprite.scale.setScalar(700);
  updateAscentTrail(dt);

  // Parts that have separated fall behind (in the rocket's frame they drift back and down)
  const back = new THREE.Vector3(0, -1, 0).applyQuaternion(rocketRoot.quaternion);
  detached.forEach(function (part) {
    if (!part.userData.velocity) part.userData.velocity = back.clone().multiplyScalar(10);
    part.userData.velocity.addScaledVector(back, dt * 18);
    part.position.addScaledVector(part.userData.velocity, dt);
    part.rotation.z += dt * (part.userData.spin || 0.5);
  });
  updateSeparatedParts(dt);
  updateClipping();

  // Chase camera beside and a little below the rocket; it slowly swings round
  const fullSize = rocketModel.userData.height * ROCKET_SCALE;
  // after staging the camera eases in on the upper stage (the part still flying)
  if (ascent.lower) ascent.frame = Math.min(1, (ascent.frame || 0) + dt / 3);
  const f = ascent.frame ? ascent.frame * ascent.frame * (3 - 2 * ascent.frame) : 0;
  const splitAt = ascent.split * ROCKET_SCALE;
  const size = fullSize - f * splitAt * 0.7;
  const middle = fullSize * 0.45 + f * (splitAt + (fullSize - splitAt) * 0.5 - fullSize * 0.45);
  const swing = t * 0.035;
  // Early in the climb the camera stays low and looks out toward the horizon and the sky, so the rocket
  // is seen leaving Earth (not skimming over a blurred ground). By the separations (which keep the
  // camera they had) it is beside and a little above the rocket.
  const low = 1 - smoothstep(6, 9.5, t);
  const offset = new THREE.Vector3(Math.sin(swing) * size * 1.6 - size * 0.4, size * (0.9 - low * 0.75), Math.cos(swing) * size * 2.2);
  offset.add(new THREE.Vector3(0, middle - fullSize * 0.45, 0).applyQuaternion(rocketRoot.quaternion));
  const target = new THREE.Vector3(0, middle, 0).applyQuaternion(rocketRoot.quaternion);
  target.y -= low * size * 0.45; // aimed a little down: the horizon and Earth in the lower part, the rocket climbing above

  // The end of the climb: a long, smooth pull-back to the whole Earth (the same Earth as the Solar
  // System), with the path flown traced on it and a glow on the rocket
  const away = smoothstep(16.5, 25, t); // slow and steady (team feedback: no fast zooms)
  const earthCenter = earthBall.position;
  const farPos = earthCenter.clone().add(new THREE.Vector3(-0.35, 0.78, 0.92).normalize().multiplyScalar(EARTH_R * 2.6));
  const farTarget = earthCenter.clone().lerp(new THREE.Vector3(0, 0, 0), 0.4);
  if (away > 0) {
    const nearDir = offset.clone().normalize();
    const farDir = farPos.clone().normalize();
    const k = away * away * (3 - 2 * away);
    const distance = Math.exp(Math.log(offset.length()) * (1 - k) + Math.log(farPos.length()) * k);
    // first straight out and up, away from Earth (never down close to the ground), keeping the rocket
    // in the middle; the look only turns to the whole planet near the end
    const up = new THREE.Vector3(0, 1, 0);
    const dir = nearDir.lerp(farDir, k).add(up.multiplyScalar(Math.sin(Math.PI * k) * 0.8)).normalize();
    camera.position.copy(dir.multiplyScalar(distance));
    target.lerp(farTarget, Math.pow(k, 2.5));
  } else {
    camera.position.copy(offset);
  }
  if (ascentTrail) ascentTrail.material.opacity = 0.85 * smoothstep(16.5, 19.5, t);
  if (ascentMarker) {
    ascentMarker.material.opacity = smoothstep(18, 20.5, t);
    ascentMarker.position.set(0, size * 0.5, 0);
    const d = camera.position.distanceTo(ascentMarker.position);
    ascentMarker.scale.setScalar(d * 0.028); // about the same size on screen however far the camera is
  }
  shakeCamera(away > 0.05 ? 0 : ascent.step === 1 ? 0.35 : ascent.engineOff > 0 ? 0 : 0.08, target);
  camera.lookAt(target);
  setRumble(ascent.engineOff > 0 ? 0.05 : 0.3 * (1 - smoothstep(20, 120, altitude)) + 0.05, 300);
}

// Records where the rocket is, in Earth's own (turning) frame, a few times a second
function updateAscentTrail(dt) {
  if (!ascentTrail || !ascent) return;
  ascent.trailTimer -= dt;
  if (ascent.trailTimer > 0 || ascent.trailCount >= 600) return;
  ascent.trailTimer = 0.08;
  earthBall.updateMatrixWorld(true);
  const local = earthBall.worldToLocal(new THREE.Vector3(0, 0, 0));
  const array = ascentTrail.geometry.attributes.position.array;
  if (ascent.trailCount === 0) {
    // start at the launch site on the ground, straight below the rocket's first position
    const ground = local.clone().setLength(EARTH_R * 1.001);
    array[0] = ground.x; array[1] = ground.y; array[2] = ground.z;
    ascent.trailCount = 1;
  }
  array[ascent.trailCount * 3] = local.x;
  array[ascent.trailCount * 3 + 1] = local.y;
  array[ascent.trailCount * 3 + 2] = local.z;
  ascent.trailCount += 1;
  ascentTrail.geometry.attributes.position.needsUpdate = true;
  ascentTrail.geometry.setDrawRange(0, ascent.trailCount);
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
  else if (id === "rollout") updateRollout(local, dt);
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
let lastOptions = null;
export function startCinematic(onFinish, options) {
  options = options || {};
  lastOptions = options;
  finishCallback = onFinish;

  rocketKey = options.rocket || null;
  const rollStyle = options.mission && !options.noRollout ? ROLLOUT_STYLE[rocketKey] : null;
  activeScenes = options.mission ? (rollStyle ? [ROLLOUT_SCENE, SCENES[4], SCENES[3]] : [SCENES[4], SCENES[3]]) : options.liftoffOnly ? [SCENES[2]] : SCENES.slice(0, 3);
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
    if (ascent && ascent.nose) ascent.nose.forEach(function (piece) { scene.remove(piece); });
    padGroup.visible = true;
    rocketRoot.rotation.set(0, 0, 0);
    earthBall.visible = false;
    sunLight.castShadow = true; // switched off during the climb to orbit
    setLaunchSite(Boolean(options.mission));
    if (!options.mission && coastGroup.userData.padStyles) applyPadStyle("lc39");
    missionSeed = seedFrom((options.caption || "") + "|" + (rocketKey || ""));
    missionSun = null;
    shotPlan = null;
    if (options.mission) {
      applySiteLook(SITE_LOOKS[ROCKET_SITE[rocketKey]] || SITE_LOOKS.florida);
      applyPadStyle(PAD_STYLE[rocketKey] || "lc39");
      // the sun's height and direction differ from mission to mission (morning, midday, afternoon)
      const sunAngle = -0.6 + seedFrom(missionSeed + "sun") * 1.4;
      const sunHeight = 220 + seedFrom(missionSeed + "high") * 260;
      sunLight.position.set(Math.sin(sunAngle) * 450, sunHeight, Math.cos(sunAngle) * 450);
      missionSun = sunLight.position.clone();
      shotPlan = {
        venting: pick(["water", "front", "drone"], "a"),
        ignition: pick(["engines", "under"], "b"),
        liftoff: pick(["tower", "front", "drone"], "c"),
        climb: pick(["tracking", "clouds", "below"], "d")
      };
    }
    buildRollout(rollStyle);
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
  return { index: index, count: activeScenes.length, id: activeScenes[index].id, progress: Math.min(1, local / activeScenes[index].duration) };
}

// Jump to a point (0 to 1, each scene an equal share, like the player's progress bar). The launch is
// restarted and its clock moved forward, so every separation happens in order.
export function seekCinematic(fraction) {
  if (!running || !lastOptions) return;
  const callback = finishCallback;
  const wasPaused = pausedAt !== null;
  stopCinematic(); // one animation loop only
  const f = Math.max(0, Math.min(0.995, fraction)) * activeScenes.length;
  const sceneIndex = Math.floor(f);
  let time = 0;
  for (let i = 0; i < sceneIndex; i++) time += activeScenes[i].duration;
  time += (f - sceneIndex) * activeScenes[sceneIndex].duration;
  startCinematic(callback, lastOptions);
  startTime -= time * 1000;
  if (wasPaused) pauseCinematic(true);
}

export function isCinematicRunning() {
  return running;
}

skipButton.addEventListener("click", skipCinematic);