// Astronaut Exploration: walk, hop, drive, fly and float at real mission sites.
// One 3D scene (#explore-canvas) that rebuilds itself for each site in data/simulator.js (SITES).
//
// Modes (each with its own controls and physics, not all "car-like"):
//   lm       Lunar Module landing: throttle the descent engine, nudge sideways with thrusters, land gently
//   foot     astronaut on foot: walk, run, jump; Moon gravity 1.62 m/s^2 (long, floaty hops), Mars 3.71 m/s^2
//   lrv      Lunar Roving Vehicle: front and rear wheels steer in opposite directions, low-gravity bounces
//   rover    Mars rover: slow, turns in place, mast camera and robotic arm
//   eva      zero gravity: the astronaut keeps drifting until thrusters (SAFER) push back
//   cockpit  inside a capsule: working switches, window and outside views
//
// Game helpers: a mini map (click it to travel there), auto walk / auto run, cruise control,
// auto-drive to the nearest unrecorded object (G), footprints and wheel tracks, dust, and shadows.
//
// Collecting only adds a virtual record (js/progress.js). The real objects stay where they are.

import * as THREE from "three";
import { createModel } from "./models.js";
import { createSuitedAstronaut } from "./astronaut.js";
import { SITES, EQUIPMENT, GRAVITY, SUITS } from "../data/simulator.js";
import {
  buildTerrainShape, heightAt as terrainHeight, terrainNormal, buildGround as buildTerrainGround,
  collideBoulders, boulderAhead, drawRelief, getTerrain
} from "./terrain.js";
import { uiIcon } from "./icons.js";
import { modelIcon } from "./explorer.js";
import { collectiblesForSite } from "../data/collectibles.js";
import { play, setLoop } from "./sounds.js";
import {
  recordObject, isRecorded, addPhoto, addSample, completeObjective, setMissionState, addDiscovery, getMission,
  showInfoCard, isInfoCardOpen, closeInfoCard
} from "./progress.js";

// ----- Page elements -----
const canvas = document.getElementById("explore-canvas");
const titleText = document.getElementById("explore-title");
const modeText = document.getElementById("explore-mode");
const fictionTag = document.getElementById("explore-fiction");
const promptBox = document.getElementById("explore-prompt");
const promptName = document.getElementById("explore-prompt-name");
const promptKeys = document.getElementById("explore-prompt-keys");
const hintBox = document.getElementById("explore-hint");
const gauges = document.getElementById("explore-gauges");
const messageBox = document.getElementById("explore-message");
const inventoryBar = document.getElementById("inventory-slots");
const inventoryInfo = document.getElementById("inventory-info");
const cockpitPanel = document.getElementById("cockpit-panel");
const labelLayer = document.getElementById("explore-labels");
const flash = document.getElementById("explore-flash");
const suitNote = document.getElementById("explore-suit");
const endButton = document.getElementById("explore-end");
const cameraButton = document.getElementById("explore-camera");
const resultsBox = document.getElementById("explore-results");
const resultsBody = document.getElementById("results-body");
const touchPad = document.getElementById("explore-touch");
const mapBox = document.getElementById("explore-map");
const mapCanvas = document.getElementById("explore-map-canvas");
const mapCaption = document.getElementById("map-caption");
const autoBox = document.getElementById("explore-auto");
const autoStatus = document.getElementById("auto-status");

// ----- Renderer, scene, camera -----
let renderer = null;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.05, 5000);
const sun = new THREE.DirectionalLight(0xffffff, 2.6);
sun.position.set(80, 60, 40);
scene.add(sun);
if (sun.target) scene.add(sun.target);
const sunDirection = new THREE.Vector3(0.8, 0.5, 0.35).normalize();
// Shadows follow the player: a small shadow box around whatever you control
if (sun.shadow) {
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -32; sc.right = 32; sc.top = 32; sc.bottom = -32; sc.near = 1; sc.far = 500;
  sun.shadow.bias = -0.0006;
  if ("normalBias" in sun.shadow) sun.shadow.normalBias = 0.04;
}
const hemi = THREE.HemisphereLight ? new THREE.HemisphereLight(0xffffff, 0x444444, 0) : null;
if (hemi) scene.add(hemi);
const ambient = new THREE.AmbientLight(0xffffff, 0.18);
scene.add(ambient);
const worldGroup = new THREE.Group();
scene.add(worldGroup);

function ensureRenderer() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  if (renderer.shadowMap) {
    renderer.shadowMap.enabled = true;
    if (THREE.PCFSoftShadowMap !== undefined) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
}

function castShadows(object) {
  if (!object || !object.traverse) return object;
  object.traverse(function (o) {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  return object;
}

// ----- Terrain (js/terrain.js): one height function, so physics, drawing and the mini map agree -----
let terrain = { world: "moon" };

export function heightAt(x, z) {
  return terrainHeight(x, z);
}

function buildSky(world) {
  // Stars (the Moon and orbit show a black sky; Mars has a dusty butterscotch sky)
  const positions = new Float32Array(1500 * 3);
  for (let i = 0; i < 1500; i++) {
    const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9 - 0.05, Math.random() - 0.5).normalize().multiplyScalar(1800);
    positions[i * 3] = v.x; positions[i * 3 + 1] = v.y; positions[i * 3 + 2] = v.z;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: world === "mars" ? 0 : 0.85 }));
  worldGroup.add(stars);

  if (hemi) hemi.intensity = 0;
  if (world === "mars") {
    // Mars: a dusty butterscotch sky, the Sun higher, soft light scattered by the dust
    scene.background = new THREE.Color(0xc89a72);
    scene.fog = new THREE.Fog(0xc89a72, 70, 520);
    sun.color.set(0xffe2c4);
    sun.intensity = 2.2;
    ambient.intensity = 0.3;
    sunDirection.set(0.6, 0.75, 0.3).normalize();
    if (hemi) { hemi.color.set(0xf0c49a); hemi.groundColor.set(0x5a2a14); hemi.intensity = 0.45; }
  } else if (world === "moon") {
    scene.background = new THREE.Color(0x000000);
    scene.fog = null;
    sun.color.set(0xffffff);
    sun.intensity = 3.2;
    ambient.intensity = 0.05; // no air: deep, sharp shadows
    // Apollo crews landed in the lunar morning, with the Sun low (about 10 to 15 degrees): long shadows
    sunDirection.set(0.85, 0.3, 0.42).normalize();
    if (hemi) { hemi.color.set(0x9aa7c0); hemi.groundColor.set(0x5e5c58); hemi.intensity = 0.12; }
    // Earth hanging in the black sky
    const earth = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 24), new THREE.MeshStandardMaterial({ color: 0x3d6fd1, emissive: 0x0a1a3a, roughness: 0.7 }));
    earth.position.set(-500, 420, -900);
    worldGroup.add(earth);
  } else {
    scene.background = new THREE.Color(0x000000);
    scene.fog = null;
    sun.color.set(0xffffff);
    sun.intensity = 2.8;
    ambient.intensity = 0.2;
    sunDirection.set(0.8, 0.5, 0.35).normalize();
    const earth = new THREE.Mesh(new THREE.SphereGeometry(900, 64, 48), new THREE.MeshStandardMaterial({ color: 0x2f62c6, emissive: 0x06132c, roughness: 0.8 }));
    earth.position.set(0, -1000, 0);
    worldGroup.add(earth);
    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(915, 64, 48), new THREE.MeshBasicMaterial({ color: 0x6fa8ff, transparent: true, opacity: 0.12, side: THREE.BackSide }));
    atmosphere.position.copy(earth.position);
    worldGroup.add(atmosphere);
  }
}

// ----- Small shapes for objects that have no full model -----
function smallShape(kind) {
  const group = new THREE.Group();
  if (kind === "rock") {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 1), new THREE.MeshStandardMaterial({ color: getTerrain().world === "mars" ? 0x6b4a3a : 0x55534f, roughness: 1, flatShading: true }));
    rock.scale.set(1.2, 0.7, 1);
    rock.position.y = 0.3;
    group.add(rock);
  } else if (kind === "orange-soil") {
    const patch = new THREE.Mesh(new THREE.CircleGeometry(1.4, 24), new THREE.MeshStandardMaterial({ color: 0xd2752e, roughness: 1 }));
    patch.rotation.x = -Math.PI / 2;
    patch.position.y = 0.03;
    group.add(patch);
  } else if (kind === "tube") {
    for (let i = 0; i < 10; i++) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 10), new THREE.MeshStandardMaterial({ color: 0xd8dade, metalness: 0.8, roughness: 0.3 }));
      tube.rotation.z = Math.PI / 2;
      tube.position.set((i % 5) * 1.6 - 3, 0.04, Math.floor(i / 5) * 1.4);
      group.add(tube);
    }
  } else if (kind === "flag-memorial") {
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.01, 0.1), new THREE.MeshStandardMaterial({ color: 0xc9c6bf, metalness: 0.6 }));
    plaque.position.y = 0.02;
    group.add(plaque);
    const figure = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.085), new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 0.9 }));
    figure.position.set(0.2, 0.02, 0);
    group.add(figure);
  } else {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0xc9c6bf }));
    post.position.y = 0.6;
    group.add(post);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.04), new THREE.MeshStandardMaterial({ color: 0xff8a3d, emissive: 0x3a1a05 }));
    sign.position.y = 1.25;
    group.add(sign);
  }
  return group;
}

// Scale a model so its biggest side is about `meters` long
function fitTo(model, meters) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  const biggest = Math.max(size.x, size.y, size.z) || 1;
  model.scale.multiplyScalar(meters / biggest);
  return model;
}

// ----- State -----
let site = null;
let siteId = null;
let mode = "foot";
let objects = [];        // { entry, group, label }
let lander = null;
let vehicle = null;      // { kind: "lrv" | "rover", model, ... }
let craft = null;        // spacecraft model in orbit
let interior = null;
let astronaut = null;
let cameraMode = 0;      // 0 = behind, 1 = close / first person, 2 = wide
const keys = {};
const player = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, onGround: true, odometer: 0, start: new THREE.Vector3() };
let lm = null;
let action = null;       // a short animation in progress: { type: "collect", t, entry }
let camYaw = 0;
let camPitch = 0.35;
let camDistance = 7;
let mastYaw = 0;
let mastPitch = 0;
let inventory = [];
let selected = 0;
let controlsUsed = {};
let animationId = null;
let lastTime = 0;
let messageTimer = null;
let auto = null;         // autopilot: { kind: "walk" | "run" | "cruise" | "goto", x, z, label, speed }
let lastDrag = -1e9;     // when the mouse last turned the camera (the chase camera waits before re-centering)
let shake = 0;           // camera shake after a bump
let boulders = [];
const trail = [];        // breadcrumbs for the mini map

function setMessage(text, seconds) {
  messageBox.textContent = text;
  messageBox.classList.remove("hidden");
  clearTimeout(messageTimer);
  messageTimer = setTimeout(function () { messageBox.classList.add("hidden"); }, (seconds || 4) * 1000);
}

function clearWorld() {
  while (worldGroup.children.length) worldGroup.remove(worldGroup.children[0]);
  labelLayer.innerHTML = "";
  objects = [];
  lander = vehicle = craft = interior = astronaut = null;
  boulders = [];
  trail.length = 0;
  auto = null;
  prints = tracks = dust = smoke = null;
}

// ----- Building a site -----
// options.suit (Sandbox only): wear a different suit from the one really used here (fictional)
let suitOverride = null;

export function loadSite(id, options) {
  site = SITES[id];
  siteId = id;
  suitOverride = options && options.suit && site && options.suit !== site.suit ? options.suit : null;
  if (!site) return;
  clearWorld();
  terrain = { world: site.world };
  buildTerrainShape(site.world, id, id.length * 97 + 13);
  if (site.world !== "orbit") {
    const keepClear = collectiblesForSite(id).map(function (e) { return { x: e.x, z: e.z }; }).concat([{ x: 6, z: 5 }, { x: 0, z: 4 }]);
    boulders = buildTerrainGround(worldGroup, site.world, keepClear);
    buildMarks(site.world);
  }
  buildSky(site.world);

  titleText.textContent = site.name;
  fictionTag.classList.toggle("hidden", !site.fictional && !(getMission() && getMission().mode === "sandbox"));
  const suit = SUITS[suitOverride || site.suit];
  suitNote.textContent = suit
    ? "Suit: " + suit.name + " (" + suit.era + ")" + (suitOverride ? " · sandbox choice, fictional here" : "")
    : "Robotic mission: no astronaut on this site";
  if (suitOverride) fictionTag.classList.remove("hidden");

  // The astronaut (robot-only sites have none)
  if (site.suit && site.world !== "mars" || site.fictional) {
    astronaut = castShadows(createSuitedAstronaut(suitOverride || site.suit || "axemu"));
    worldGroup.add(astronaut);
  }

  // The landed spacecraft (Apollo sites)
  if (site.start === "lm-landing" || (site.fictional && site.world === "moon")) {
    lander = createModel("lunar-module");
    fitTo(lander, 7);
    castShadows(lander);
    lander.position.set(0, heightAt(0, 0), 0);
    worldGroup.add(lander);
  }

  // Vehicles
  if (site.vehicle === "lrv") {
    const model = createModel("lrv");
    fitTo(model, 3.1);
    castShadows(model);
    vehicle = { kind: "lrv", model: model, speed: 0, steer: 0, yaw: 0.6, pos: new THREE.Vector3(6, 0, 5), vy: 0, y: 0, air: 0, slip: 0, bodyY: 0, suspVel: 0, pitch: 0, roll: 0 };
    worldGroup.add(model);
  } else if (site.vehicle === "rover") {
    const model = createModel(site.rover || "perseverance");
    fitTo(model, 3);
    const arm = buildRoverArm();
    model.add(arm);
    castShadows(model);
    vehicle = { kind: "rover", model: model, speed: 0, yaw: 0, pos: new THREE.Vector3(0, 0, 4), arm: arm, armOut: 0, armGoal: 0, pitch: 0, roll: 0 };
    worldGroup.add(model);
  }

  // Orbit: the spacecraft beside you, or the capsule interior
  if (site.world === "orbit") {
    craft = createModel(site.craft === "gemini" ? "gemini" : site.craft);
    fitTo(craft, site.craft === "hubble" ? 13 : site.craft === "dragon" ? 8 : 5.8);
    craft.position.set(0, 0, 14);
    worldGroup.add(craft);
    if (site.start === "cockpit") {
      interior = buildInterior();
      worldGroup.add(interior);
    }
  }

  // Historical objects and science targets
  collectiblesForSite(id).forEach(function (entry) {
    let group;
    if (entry.model === "lunar-module-descent" && lander) {
      group = lander; // the lander you just flew is the historical one at this site
    } else if (entry.model === "lrv" && vehicle && vehicle.kind === "lrv") {
      group = vehicle.model; // the rover you drive is this site's historical rover
    } else if (["rock", "orange-soil", "tube", "flag-memorial", "marker"].indexOf(entry.model) !== -1) {
      group = castShadows(smallShape(entry.model));
      group.position.set(entry.x, heightAt(entry.x, entry.z), entry.z);
      worldGroup.add(group);
    } else if (site.world === "orbit") {
      group = entry.id === "orbit-hubble" ? craft : createModel(entry.model);
      if (group !== craft) {
        fitTo(group, 45);
        group.position.set(entry.x + 30, 8, entry.z);
        worldGroup.add(group);
      }
    } else {
      group = castShadows(createModel(entry.model));
      fitTo(group, entry.model === "lrv" ? 3.1 : entry.model === "helicopter" ? 1.2 : entry.model === "lrrr" ? 0.8 : 1.3);
      group.position.set(entry.x, heightAt(entry.x, entry.z), entry.z);
      group.rotation.y = entry.x * 0.1;
      worldGroup.add(group);
    }
    const label = document.createElement("div");
    label.className = "explore-label" + (entry.kind === "target" ? " target" : "");
    label.textContent = entry.card.name;
    labelLayer.appendChild(label);
    objects.push({ entry: entry, group: group, label: label, radius: solidRadius(entry, group) });
  });

  // Inventory for this site
  inventory = site.equipment.map(function (key) { return Object.assign({ key: key }, EQUIPMENT[key]); });
  selected = 0;
  buildInventory();
  controlsUsed = {};
  action = null;
  player.odometer = 0;
  resultsBox.classList.add("hidden");
  closeInfoCard();

  // Starting mode
  if (site.start === "lm-landing") startLmLanding();
  else if (site.start === "rover") enterMode("rover");
  else if (site.start === "eva") enterMode("eva");
  else if (site.start === "cockpit") enterMode("cockpit");
  else enterMode("foot");
  setMissionState({ stage: "Exploration", status: "On site: " + site.name });
  buildMap();
}

// A simple robotic arm on the front of the rover: shoulder, two segments and a turret
function buildRoverArm() {
  const mat = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 0.7, roughness: 0.4 });
  const shoulder = new THREE.Group();
  shoulder.position.set(0.35, 0.7, 1.15);
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.9), mat);
  upper.position.z = 0.45;
  shoulder.add(upper);
  const elbow = new THREE.Group();
  elbow.position.z = 0.9;
  shoulder.add(elbow);
  const lower = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.8), mat);
  lower.position.z = 0.4;
  elbow.add(lower);
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.18, 12), mat);
  turret.position.z = 0.82;
  elbow.add(turret);
  shoulder.userData.elbow = elbow;
  return shoulder;
}

// The inside of a capsule: curved walls, seats, a control panel and a window
function buildInterior() {
  const group = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.8, 2.4, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0xd9dade, side: THREE.BackSide, roughness: 0.8 }));
  shell.position.y = 1.2;
  group.add(shell);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.8, 32), new THREE.MeshStandardMaterial({ color: 0x3a3c42 }));
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 0.1), new THREE.MeshStandardMaterial({ color: 0x15171c, emissive: 0x0b1c33 }));
  panel.position.set(0, 1.5, 1.05);
  panel.rotation.x = -0.5;
  group.add(panel);
  for (let i = 0; i < 3; i++) {
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.32), new THREE.MeshBasicMaterial({ color: 0x1d4f8f }));
    screen.position.set(-0.6 + i * 0.6, 1.52, 1.0);
    screen.rotation.x = -0.5;
    screen.rotation.y = Math.PI;
    group.add(screen);
    group.userData["screen" + i] = screen;
  }
  const windowPane = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), new THREE.MeshBasicMaterial({ color: 0x0b2a66 }));
  windowPane.position.set(0.9, 1.9, 0.75);
  windowPane.lookAt(2, 2.4, 2.5);
  group.add(windowPane);
  const cabinLight = new THREE.PointLight(0xfff1dc, 2.2, 6);
  cabinLight.position.set(0, 2.1, 0);
  group.add(cabinLight);
  group.userData.light = cabinLight;
  group.position.set(0, 0, 0);
  return group;
}

// ----- Modes -----
const HINTS = {
  lm: "W / S throttle · Arrow keys: side thrusters · Land below 3 m/s (game limit) · L auto-land",
  foot: "WASD move · Shift run · Space jump · T auto walk / run · G go to nearest · click the map to travel · E examine or board · F record · C camera",
  lrv: "W gas · S brake / reverse · A / D steer (both axles) · Shift boost · Space handbrake · B recharge (stopped) · T cruise · G auto-drive · click the map · E get out · F record",
  rover: "W / S drive · A / D turn in place · Shift boost · B recharge (stopped) · T cruise · G auto-drive · click the map · V mast camera · R robotic arm · F record · Q use",
  eva: "WASD thrust · R / V up / down · X stop drifting (SAFER) · P photograph · F record · E examine",
  cockpit: "Use the switches on the panel · C toggles window and outside views"
};

function enterMode(next) {
  mode = next;
  modeText.textContent = {
    lm: "Lunar Module landing", foot: "On foot", lrv: "Driving the Lunar Roving Vehicle",
    rover: "Driving the " + (site && site.rover === "curiosity" ? "Curiosity" : "Perseverance") + " rover",
    eva: "Spacewalk (zero gravity)", cockpit: "Inside the spacecraft"
  }[next];
  hintBox.textContent = HINTS[next];
  cockpitPanel.classList.toggle("hidden", next !== "cockpit");
  gauges.classList.toggle("hidden", next !== "lm" && next !== "lrv" && next !== "rover" && next !== "eva");
  if (astronaut) astronaut.visible = true;
  cameraMode = 0;
  auto = null;
  const onGround = next === "foot" || next === "lrv" || next === "rover";
  if (mapBox) mapBox.classList.toggle("hidden", !onGround);
  if (autoBox) {
    autoBox.classList.toggle("hidden", !onGround);
    (autoBox.querySelectorAll ? autoBox.querySelectorAll("[data-auto]") : []).forEach(function (button) {
      const kind = button.dataset.auto;
      const show = kind === "goto" || kind === "stop" || (next === "foot" ? kind === "walk" || kind === "run" : kind === "cruise");
      button.classList.toggle("hidden", !show);
    });
  }
  updateAutoStatus();

  if (next === "foot") {
    if (vehicle && vehicle.kind === "lrv" && astronaut.parent === vehicle.model) {
      vehicle.model.remove(astronaut);
      worldGroup.add(astronaut);
      astronaut.scale.setScalar(1);
      player.pos.copy(vehicle.pos).add(new THREE.Vector3(Math.cos(vehicle.yaw) * 2.2, 0, -Math.sin(vehicle.yaw) * 2.2));
    } else if (vehicle && vehicle.kind === "rover" && player.pos.distanceTo(vehicle.pos) < 1) {
      player.pos.copy(vehicle.pos).add(new THREE.Vector3(2.5, 0, 0));
    } else if (player.pos.lengthSq() === 0) {
      player.pos.set(2.5, 0, 3.5);
    }
    player.pos.y = heightAt(player.pos.x, player.pos.z);
    player.start.copy(player.pos);
    camDistance = 7;
  } else if (next === "lrv") {
    worldGroup.remove(astronaut);
    vehicle.model.add(astronaut);
    astronaut.position.set(-0.32, 0.55, -0.1);
    astronaut.rotation.set(0, 0, 0);
    astronaut.scale.setScalar(1 / vehicle.model.scale.x);
    camDistance = 9;
  } else if (next === "rover") {
    camDistance = 8;
  } else if (next === "eva") {
    player.pos.set(0, 0, 0);
    player.vel.set(0, 0, 0.05);
    player.start.copy(player.pos);
    camDistance = 6;
  } else if (next === "cockpit") {
    if (astronaut) {
      // Seated on the right, facing the panel; the camera takes the left seat
      astronaut.position.set(0.6, 0.15, -0.25);
      astronaut.rotation.set(0, -0.15, 0);
    }
  }
}

function startLmLanding() {
  const mission = getMission();
  const extraFuel = mission && mission.mode === "sandbox" && mission.upgrades ? (mission.upgrades.efficiency || 0) * 25 : 0; // fictional upgrade
  lm = { alt: 70, vy: -3, vx: 0.8, vz: -0.6, x: -14, z: 10, fuel: 100 + extraFuel, throttle: 0.45, done: false };
  if (astronaut) astronaut.visible = false;
  enterMode("lm");
  if (astronaut) astronaut.visible = false;
  setMessage("Simplified landing: keep the descent slow and level. Real Lunar Module landings were flown by the commander with computer help.", 6);
}

// ----- Input -----
function keyName(event) {
  return event.key.length === 1 ? event.key.toLowerCase() : event.key;
}

function onKeyDown(event) {
  if (!running) return;
  const tag = event.target && event.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  const k = keyName(event);
  if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(k) !== -1 && event.preventDefault) event.preventDefault();
  if (keys[k]) return;
  keys[k] = true;
  pressed(k);
}

function onKeyUp(event) {
  keys[keyName(event)] = false;
}

let jumpQueued = false;

function pressed(k) {
  if (isInfoCardOpen()) return;
  if (k === " ") jumpQueued = true; // a quick tap between two frames still jumps
  // Taking the controls back cancels the autopilot (steering keys still work during cruise and auto walk)
  if (auto && (k === "w" || k === "s" || ((k === "a" || k === "d") && auto.kind === "goto"))) stopAuto("You have the controls.");
  if (k === "t") { toggleAuto(); return; }
  if (k === "g") { goToNearest(); return; }
  if (k === "n") { toggleBigMap(); return; }
  if (k === "b") { startCharging(); return; }
  if (k === "c") cycleCamera();
  else if (k === "e") interact();
  else if (k === "f") collectNearest();
  else if (k === "q") useEquipment();
  else if (k === "p") useEquipment("camera");
  else if (k >= "1" && k <= "9" && Number(k) <= inventory.length) selectSlot(Number(k) - 1);
  else if (k === "r" && mode === "rover") toggleArm();
  else if (k === "v" && mode === "rover" && !keys.Shift) { cameraMode = cameraMode === 1 ? 0 : 1; mastYaw = 0; mastPitch = 0; play("click"); }
  else if (k === "l" && mode === "lm" && lm && !lm.done) { lm.auto = true; play("toggleOn"); }
  else if (k === "x" && mode === "eva") { player.vel.multiplyScalar(0); play("separation"); }
}

function cycleCamera() {
  if (mode === "cockpit") {
    cameraMode = cameraMode === 0 ? 2 : 0;
    useControl("view");
  } else {
    cameraMode = (cameraMode + 1) % 3;
  }
  play("click");
}
cameraButton.addEventListener("click", cycleCamera);

// Mouse drag turns the camera; the wheel zooms
let dragging = false;
let lastX = 0;
let lastY = 0;
canvas.addEventListener("pointerdown", function (event) {
  dragging = true;
  lastX = event.clientX;
  lastY = event.clientY;
});
window.addEventListener("pointerup", function () { dragging = false; });
window.addEventListener("pointermove", function (event) {
  if (!dragging || !running) return;
  lastDrag = lastTime;
  camYaw -= (event.clientX - lastX) * 0.006;
  camPitch = Math.max(-0.3, Math.min(1.3, camPitch + (event.clientY - lastY) * 0.005));
  lastX = event.clientX;
  lastY = event.clientY;
});
canvas.addEventListener("wheel", function (event) {
  camDistance = Math.max(2.5, Math.min(40, camDistance * (event.deltaY > 0 ? 1.1 : 0.9)));
});

// On-screen buttons for touch screens: holding one acts like holding the key
if (touchPad) {
  (touchPad.querySelectorAll ? touchPad.querySelectorAll("[data-key]") : []).forEach(function (button) {
    const k = button.dataset.key;
    button.addEventListener("pointerdown", function (event) {
      if (event.preventDefault) event.preventDefault();
      keys[k] = true;
      pressed(k);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach(function (type) {
      button.addEventListener(type, function () { keys[k] = false; });
    });
  });
}

// ----- Inventory -----
function buildInventory() {
  inventoryBar.innerHTML = "";
  inventory.forEach(function (item, i) {
    const slot = document.createElement("button");
    slot.className = "inv-slot" + (i === selected ? " active" : "");
    slot.setAttribute("data-silent", "");
    slot.title = item.name + ": " + item.text;
    slot.innerHTML = '<span class="inv-key"></span><span class="inv-icon"></span><span class="inv-name"></span>';
    if (slot.querySelector) {
      slot.querySelector(".inv-key").textContent = String(i + 1);
      const pic = document.createElement("img");
      pic.alt = "";
      slot.querySelector(".inv-icon").appendChild(pic);
      modelIcon({ type: "equipment", key: item.key }, pic);
      slot.querySelector(".inv-name").textContent = item.name;
    }
    slot.addEventListener("click", function () {
      if (selected === i) useEquipment();
      else selectSlot(i);
    });
    inventoryBar.appendChild(slot);
  });
  updateInventoryInfo();
}

function selectSlot(i) {
  selected = i;
  Array.from(inventoryBar.children).forEach(function (slot, n) { slot.classList.toggle("active", n === i); });
  updateInventoryInfo();
  play("tick");
}

function updateInventoryInfo() {
  const item = inventory[selected];
  inventoryInfo.textContent = item ? item.name + " · " + item.text + " (Q to use)" : "";
}

// ----- Finding what is near -----
function focusPosition() {
  if (mode === "lrv" || mode === "rover") return vehicle.pos;
  return player.pos;
}

function nearest(maxDistance, filter) {
  const from = focusPosition();
  let best = null;
  let bestDistance = maxDistance;
  objects.forEach(function (o) {
    if (filter && !filter(o)) return;
    const p = o.group.getWorldPosition ? o.group.getWorldPosition(new THREE.Vector3()) : o.group.position;
    const d = Math.hypot(p.x - from.x, p.z - from.z) - (o.entry.model === "lunar-module-descent" ? 3 : 0);
    if (d < bestDistance) {
      bestDistance = d;
      best = o;
    }
  });
  return best ? { object: best, distance: Math.max(0, bestDistance) } : null;
}

// E: examine the nearest object, or get in / out of a vehicle
function interact() {
  if (mode === "lm" || mode === "cockpit" || action) return; // nothing to touch while flying or busy
  if (mode === "lrv" || (mode === "rover" && astronaut)) { enterMode("foot"); play("thud"); return; }
  if (mode === "foot" && vehicle && vehicle.kind === "rover" && player.pos.distanceTo(vehicle.pos) < 3.5) {
    enterMode("rover");
    play("toggleOn");
    return;
  }
  if (mode === "foot" && vehicle && vehicle.kind === "lrv" && player.pos.distanceTo(vehicle.pos) < 3.2) {
    // Walk to the seat side, turn and sit down, then drive
    const side = new THREE.Vector3(Math.cos(vehicle.yaw) * -1.2, 0, -Math.sin(vehicle.yaw) * -1.2).add(vehicle.pos);
    action = { type: "board", t: 0, from: player.pos.clone(), to: side };
    play("open");
    return;
  }
  const near = nearest(mode === "eva" ? 25 : 6);
  if (near) {
    play("open");
    showInfoCard(near.object.entry, false);
    if (near.object.entry.kind === "target") completeObjective("examine");
  }
}

// F: record the nearest object into My Collection (with a short animation)
function collectNearest() {
  if (mode === "lm" || action) return;
  const range = mode === "rover" ? 5 : mode === "lrv" ? 7 : mode === "eva" ? 25 : 5;
  const near = nearest(range);
  if (!near) {
    setMessage("Nothing close enough to record. Move closer to a labelled object.", 3);
    play("noResults");
    return;
  }
  const entry = near.object.entry;
  if (isRecorded(entry.id)) {
    showInfoCard(entry, false);
    return;
  }
  action = { type: "collect", t: 0, entry: entry, object: near.object };
  play("confirm");
}

function finishCollect() {
  const entry = action.entry;
  recordObject(entry.id, "recorded on site");
  addDiscovery(entry.card.name);
  const count = objects.filter(function (o) { return isRecorded(o.entry.id) && o.entry.kind !== "target"; }).length;
  if (count >= 2) completeObjective("collect");
  if (entry.kind === "target") completeObjective("examine");
  play("success");
  burst(action.object);
  showInfoCard(entry, true);
}

// A ring of light where something was recorded
function burst(object) {
  const p = object.group.getWorldPosition ? object.group.getWorldPosition(new THREE.Vector3()) : object.group.position.clone();
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.0, 40), new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(p.x, p.y + 0.1, p.z);
  ring.userData.age = 0;
  worldGroup.add(ring);
  bursts.push(ring);
}
const bursts = [];

// Q: use the selected equipment
function useEquipment(forceUse) {
  const item = forceUse ? inventory.find(function (i) { return i.use === forceUse; }) : inventory[selected];
  if (!item) {
    setMessage("No camera in this kit.", 2);
    return;
  }
  if (item.use === "camera") takePhoto(item);
  else if (item.use === "scan") {
    const near = nearest(6);
    if (near) { showInfoCard(near.object.entry, false); if (near.object.entry.kind === "target") completeObjective("examine"); play("open"); }
    else setMessage("Field kit: nothing to examine within 6 m.", 3);
  } else if (item.use === "sample") {
    const near = nearest(6, function (o) { return o.entry.kind === "target"; });
    const where = near ? near.object.entry.card.name : (site.world === "moon" ? "lunar soil" : "Martian regolith") + " near " + site.name;
    addSample({ name: where, site: site.name, date: new Date().toISOString().slice(0, 10) });
    completeObjective("sample");
    setMessage("Virtual sample logged: " + where + ". (A record in this simulation, not a real sample.)", 4);
    play("pop");
  } else if (item.use === "radio") {
    radioUpdate();
  } else if (item.use === "arm") {
    toggleArm();
  } else if (item.use === "jet") {
    player.vel.multiplyScalar(0);
    setMessage("SAFER: drift stopped.", 2);
  }
}

function radioUpdate() {
  const mission = getMission();
  const near = nearest(1e9, function (o) { return !isRecorded(o.entry.id); });
  let text = "Mission Control (simulated): ";
  if (mission) {
    const next = mission.objectives.find(function (o) { return !o.done; });
    text += next ? "next objective: " + next.text.toLowerCase() + ". " : "all objectives complete. ";
  }
  if (near) text += near.object.entry.card.name + " is " + Math.round(near.distance) + " m away.";
  setMessage(text, 6);
  play("chirp");
}

// Camera equipment: saves a small picture of the current view into My Collection
function takePhoto(item) {
  render();
  let dataUrl = "";
  try {
    const small = document.createElement("canvas");
    small.width = 240; small.height = 150;
    const ctx = small.getContext("2d");
    if (ctx && ctx.drawImage) ctx.drawImage(renderer.domElement, 0, 0, 240, 150);
    dataUrl = small.toDataURL ? small.toDataURL("image/jpeg", 0.7) : "";
  } catch (error) {
    dataUrl = "";
  }
  const near = nearest(mode === "eva" || mode === "cockpit" ? 80 : 30);
  const subject = near ? near.object.entry.card.name : site.name;
  addPhoto({ name: subject, site: site.name, camera: item.name, date: new Date().toISOString().slice(0, 10), image: dataUrl });
  if (near) completeObjective("photograph");
  if (near && near.object.entry.kind === "observe") {
    recordObject(near.object.entry.id, "photographed");
    addDiscovery(near.object.entry.card.name);
  }
  flash.classList.remove("hidden");
  setTimeout(function () { flash.classList.add("hidden"); }, 160);
  setMessage("Photo saved to My Collection: " + subject + " (" + item.name + ").", 3);
  play("click");
}

function toggleArm() {
  if (!vehicle || vehicle.kind !== "rover") return;
  vehicle.armGoal = vehicle.armGoal > 0.5 ? 0 : 1;
  play("separation");
  if (vehicle.armGoal > 0.5) {
    const near = nearest(4.5, function (o) { return o.entry.kind === "target"; });
    if (near) {
      setTimeout(function () {
        if (!running) return;
        showInfoCard(near.object.entry, false);
        completeObjective("examine");
      }, 1400);
    } else {
      setMessage("Robotic arm out. Drive within 4 m of a science target (marked in blue) to study it.", 4);
    }
  }
}

// Cockpit switches
function useControl(name) {
  controlsUsed[name] = true;
  if (Object.keys(controlsUsed).length >= 2) completeObjective("controls");
}

(cockpitPanel.querySelectorAll ? cockpitPanel.querySelectorAll("[data-control]") : []).forEach(function (button) {
  button.addEventListener("click", function () {
    const control = button.dataset.control;
    useControl(control);
    if (control === "lights" && interior) {
      const light = interior.userData.light;
      light.intensity = light.intensity > 1 ? 0.25 : 2.2;
      button.classList.toggle("on", light.intensity > 1);
      play(light.intensity > 1 ? "toggleOn" : "toggleOff");
    } else if (control === "comm") {
      radioUpdate();
    } else if (control === "thrusters") {
      cockpitSpin += 0.6;
      play("separation");
      setMessage("Thruster pulse: the spacecraft turns slowly.", 2);
    } else if (control === "observe") {
      cameraMode = 2;
      useEquipment("camera");
    }
  });
});
let cockpitSpin = 0;

endButton.addEventListener("click", function () { endMission(); });

function endMission() {
  completeObjective("complete");
  const mission = getMission();
  const objectives = mission ? mission.objectives : [];
  const done = objectives.filter(function (o) { return o.done; }).length;
  resultsBody.innerHTML = "";
  const lines = [
    ["Site", site.name + (site.fictional ? " (fictional sandbox site)" : "")],
    ["Objectives", done + " of " + objectives.length + " complete"],
    ["Discoveries", mission && mission.discoveries.length ? mission.discoveries.join(", ") : "None"],
    ["Distance moved", Math.round(player.odometer + (vehicle ? vehicle.odometer || 0 : 0)) + " m"]
  ];
  lines.forEach(function (line) {
    const li = document.createElement("li");
    const label = document.createElement("strong");
    label.textContent = line[0];
    li.appendChild(label);
    li.appendChild(document.createTextNode(line[1]));
    resultsBody.appendChild(li);
  });
  resultsBox.classList.remove("hidden");
  setMissionState({ status: "Surface work complete" });
  document.dispatchEvent(new CustomEvent("exploration-ended", { detail: { siteId: siteId } }));
  play("success");
}

// ----- Physics and animation, every frame -----
function update(dt) {
  const g = GRAVITY[site.world] || 0;
  if (action && action.type === "board") {
    action.t += dt;
    const u = Math.min(1, action.t / 1.3);
    if (astronaut && astronaut.parent === worldGroup) {
      const p = action.from.clone().lerp(action.to, Math.min(1, u * 1.6));
      p.y = heightAt(p.x, p.z) + (u > 0.65 ? (u - 0.65) * 1.4 : 0);
      astronaut.position.copy(p);
      astronaut.rotation.y = vehicle.yaw;
      astronaut.userData.animate(u < 0.62 ? (site.world === "moon" ? "lunar-hop" : "walk") : "drive", dt, { steer: 0 });
      followCamera(p, 1.4, dt);
    }
    if (u >= 1) {
      action = null;
      enterMode("lrv");
      play("ignition");
    }
  } else if (action && action.type === "collect") {
    action.t += dt;
    if (astronaut && (mode === "foot")) astronaut.userData.animate("collect", dt, { progress: action.t / 1.4 });
    if (action.object.group.traverse) {
      const glow = 0.5 + 0.5 * Math.sin(action.t * 12);
      action.object.group.traverse(function (o) {
        if (o.isMesh && o.material && o.material.emissive && !o.material.userData.shared) {
          o.material = o.material.clone();
          o.material.userData.shared = true;
        }
        if (o.isMesh && o.material && o.material.emissive) o.material.emissive.setRGB(0.6 * glow, 0.25 * glow, 0.05 * glow);
      });
    }
    if (action.t >= 1.4) {
      action.object.group.traverse(function (o) {
        if (o.isMesh && o.material && o.material.emissive && o.material.userData.shared) o.material.emissive.setRGB(0, 0, 0);
      });
      finishCollect();
      action = null;
    }
  } else if (mode === "lm") updateLm(dt, g);
  else if (mode === "foot") updateFoot(dt, g);
  else if (mode === "lrv") updateLrv(dt, g);
  else if (mode === "rover") updateRover(dt);
  else if (mode === "eva") updateEva(dt);
  else if (mode === "cockpit") updateCockpit(dt);

  bursts.slice().forEach(function (ring) {
    ring.userData.age += dt;
    ring.scale.setScalar(1 + ring.userData.age * 4);
    ring.material.opacity = Math.max(0, 0.9 - ring.userData.age);
    if (ring.userData.age > 1) {
      worldGroup.remove(ring);
      bursts.splice(bursts.indexOf(ring), 1);
    }
  });
  updateObjectivesFromPosition();
}

function updateLm(dt, g) {
  if (lm.done) {
    // Climb down the ladder, then step onto the surface
    lm.climb += dt;
    if (astronaut) {
      astronaut.visible = true;
      const h = Math.max(0, 2.6 - lm.climb * 0.9);
      astronaut.position.set(0, heightAt(0, 0) + h, 2.1);
      astronaut.rotation.y = Math.PI;
      astronaut.userData.animate(h > 0 ? "climb" : "idle", dt);
      if (h <= 0 && lm.climb > 3.4) {
        player.pos.set(0, heightAt(0, 2.8), 2.8);
        enterMode("foot");
      }
    } else if (lm.climb > 1.5) enterMode("foot");
    return;
  }
  let throttle = lm.throttle;
  if (keys.w) throttle += dt * 0.6;
  if (keys.s) throttle -= dt * 0.6;
  let ax = 0;
  let az = 0;
  if (keys.ArrowLeft) ax -= 0.8;
  if (keys.ArrowRight) ax += 0.8;
  if (keys.ArrowUp) az -= 0.8;
  if (keys.ArrowDown) az += 0.8;
  if (lm.auto) {
    // A simple autopilot: aim for -1.5 m/s and no sideways drift
    const wanted = lm.alt > 25 ? -6 : lm.alt > 8 ? -2.5 : -1.2;
    throttle = Math.max(0, Math.min(1, 0.6 + (wanted - lm.vy) * 0.25));
    ax = -lm.vx * 0.8 - lm.x * 0.05;
    az = -lm.vz * 0.8 - lm.z * 0.05;
  }
  if (lm.fuel <= 0) throttle = 0;
  lm.throttle = Math.max(0, Math.min(1, throttle));
  const thrust = lm.throttle * 3.2;  // game value (m/s^2), enough to hover with throttle about 0.5
  lm.vy += (thrust - g) * dt;
  lm.vx += ax * dt;
  lm.vz += az * dt;
  lm.x += lm.vx * dt;
  lm.z += lm.vz * dt;
  lm.alt += lm.vy * dt;
  lm.fuel = Math.max(0, lm.fuel - (lm.throttle * 1.6 + (Math.abs(ax) + Math.abs(az)) * 0.4) * dt);
  setLoop("engine", 0.15 + lm.throttle * 0.4);
  const ground = heightAt(lm.x, lm.z);
  lander.position.set(lm.x, ground + Math.max(0, lm.alt), lm.z);
  gauges.innerHTML = gauge("Altitude", Math.max(0, lm.alt).toFixed(1) + " m") + gauge("Vertical", lm.vy.toFixed(1) + " m/s") +
    gauge("Sideways", Math.hypot(lm.vx, lm.vz).toFixed(1) + " m/s") + gauge("Throttle", Math.round(lm.throttle * 100) + "%") +
    gauge("Fuel (game)", Math.round(lm.fuel) + "%");

  if (lm.alt <= 0) {
    setLoop("engine", 0);
    const side = Math.hypot(lm.vx, lm.vz);
    if (-lm.vy < 3 && side < 1.5) {
      lm.done = true;
      lm.climb = 0;
      // Move the whole site so the landing spot becomes the new origin of the objects' layout
      lander.position.set(lm.x, ground, lm.z);
      relocateLanding(lm.x, lm.z);
      play("thud", 0.4);
      completeObjective("land");
      setMessage("Contact! A soft landing. Now step down the ladder.", 4);
    } else {
      play("boom");
      setMessage("Too fast (" + (-lm.vy).toFixed(1) + " m/s down, " + side.toFixed(1) + " m/s sideways). Try again, or press L for auto-land.", 6);
      lm.alt = 70; lm.vy = -3; lm.vx = 0.8; lm.vz = -0.6; lm.fuel = 100; lm.throttle = 0.45; lm.auto = false;
    }
  }
  // Camera behind and above the descending lander
  camera.position.set(lander.position.x + 18, lander.position.y + 10, lander.position.z + 24);
  camera.lookAt(lander.position.x, lander.position.y, lander.position.z);
}

// After a landing away from the planned spot, shift everything so the lander sits at the origin again
function relocateLanding(x, z) {
  lander.position.set(0, heightAt(0, 0), 0);
  void x; void z;
}

function gauge(label, value) {
  return '<span class="gauge"><em>' + label + "</em><b>" + value + "</b></span>";
}

// How big a solid object is on the ground (0 = you can walk or drive over it: soil, flat plaques, small tubes)
function solidRadius(entry, group) {
  if (group === lander || (vehicle && group === vehicle.model)) return 0;
  if (entry.model === "rock") return 0.65;
  if (entry.model === "marker") return 0.15;
  if (["orange-soil", "tube", "flag-memorial"].indexOf(entry.model) !== -1) return 0;
  if (!group || !group.position || getTerrain().world === "orbit") return 0;
  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  box.getSize(size);
  const r = Math.max(size.x, size.z) * 0.42;
  return Number.isFinite(r) ? Math.min(3, r) : 0;
}

// ----- Obstacles: boulders, the lander, every solid object, and (for walkers) the parked vehicle -----
// Returns what was hit: { r, name } (nothing passes through anything solid)
function collide(position, radius, includeVehicle) {
  let hit = collideBoulders(position, radius);
  if (hit) hit = { r: hit.r, name: "a boulder" };
  const blockers = [];
  if (lander && mode !== "lm") blockers.push([lander.position, 2.6, "the Lunar Module"]);
  if (includeVehicle && vehicle && vehicle.kind === "lrv") blockers.push([vehicle.pos, 1.3, "the rover"]);
  objects.forEach(function (o) {
    if (o.radius > 0) blockers.push([o.group.position, o.radius, o.entry.card.name]);
  });
  blockers.forEach(function (b) {
    const dx = position.x - b[0].x;
    const dz = position.z - b[0].z;
    const min = b[1] + radius;
    const d = Math.hypot(dx, dz);
    if (d < min) {
      const k = d > 0.001 ? min / d : 1;
      position.x = b[0].x + dx * k;
      position.z = b[0].z + (d > 0.001 ? dz * k : min);
      hit = hit || { r: b[1], name: b[2] };
    }
  });
  return hit;
}

// ----- Autopilot: auto walk / run, cruise control, and travel to a target -----
function toggleAuto() {
  if (mode === "foot") {
    const next = !auto ? "walk" : auto.kind === "walk" ? "run" : null;
    if (next) startAuto({ kind: next });
    else stopAuto("Auto off.");
  } else if (mode === "lrv" || mode === "rover") {
    if (auto && auto.kind === "cruise") stopAuto("Cruise off.");
    else {
      const max = mode === "lrv" ? LRV.max : ROVER.max;
      startAuto({ kind: "cruise", speed: Math.max(Math.abs(vehicle.speed), max * 0.7) });
    }
  }
}

function startAuto(next) {
  if (mode !== "foot" && mode !== "lrv" && mode !== "rover") return;
  auto = next;
  play("toggleOn");
  updateAutoStatus();
}

function stopAuto(message) {
  if (!auto) return;
  auto = null;
  play("toggleOff");
  updateAutoStatus(message);
}

export function goToNearest() {
  if (mode !== "foot" && mode !== "lrv" && mode !== "rover") return false;
  const near = nearest(1e9, function (o) { return !isRecorded(o.entry.id) && o.group !== (vehicle && vehicle.model); });
  if (!near) {
    setMessage("Everything here is already recorded. Click the map to travel anywhere.", 3);
    return false;
  }
  const p = near.object.group.getWorldPosition ? near.object.group.getWorldPosition(new THREE.Vector3()) : near.object.group.position;
  startAuto({ kind: "goto", x: p.x, z: p.z, label: near.object.entry.card.name, stopAt: near.object.entry.model === "lunar-module-descent" ? 6 : mode === "foot" ? 2.6 : 3.6 });
  return true;
}

export function travelTo(x, z, label) {
  startAuto({ kind: "goto", x: x, z: z, label: label || "map point", stopAt: mode === "foot" ? 1.5 : 3 });
}

function updateAutoStatus(message) {
  if (!autoStatus) return;
  if (autoBox && autoBox.querySelectorAll) {
    autoBox.querySelectorAll("[data-auto]").forEach(function (button) {
      button.classList.toggle("active", Boolean(auto) && auto.kind === button.dataset.auto);
    });
  }
  if (!auto) {
    autoStatus.textContent = message || "Manual control";
    autoStatus.classList.remove("on");
    return;
  }
  autoStatus.classList.add("on");
  if (auto.kind === "walk") autoStatus.textContent = "Auto walk · steer with A / D or the mouse · W / S to take over";
  else if (auto.kind === "run") autoStatus.textContent = "Auto run · steer with A / D or the mouse · W / S to take over";
  else if (auto.kind === "cruise") autoStatus.textContent = "Cruise " + speedText(auto.speed) + " · steer with A / D · W / S to take over";
  else {
    const from = focusPosition();
    autoStatus.textContent = (mode === "foot" ? "Walking" : "Auto-driving") + " to " + auto.label + " · " + Math.round(Math.hypot(auto.x - from.x, auto.z - from.z)) + " m";
  }
}

function speedText(speed) {
  return mode === "rover" ? Math.round(Math.abs(speed) * 100) + " cm/s" : (Math.abs(speed) * 3.6).toFixed(1) + " km/h";
}

// For "goto": the direction to the target (with boulders steered around) and the distance left
function autoSteerTo(x, z, dirX, dirZ) {
  const dx = auto.x - x;
  const dz = auto.z - z;
  const distance = Math.hypot(dx, dz);
  let ax = dx / (distance || 1);
  let az = dz / (distance || 1);
  const avoid = boulderAhead(x, z, dirX, dirZ, mode === "foot" ? 5 : 10, mode === "foot" ? 0.7 : 1.6);
  if (avoid) {
    // turn the wanted direction to the side away from the boulder
    const angle = avoid * 0.9;
    const c = Math.cos(angle);
    const sn = Math.sin(angle);
    const rx = ax * c + az * sn;
    const rz = -ax * sn + az * c;
    ax = rx; az = rz;
  }
  return { x: ax, z: az, distance: distance };
}

function arrive() {
  const label = auto.label;
  auto = null;
  play("chirp");
  updateAutoStatus("Arrived: " + label);
  setMessage("Arrived at " + label + ".", 2.5);
}

const UP = new THREE.Vector3(0, 1, 0);

function updateFoot(dt, g) {
  const world = site.world;
  const forward = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
  const right = new THREE.Vector3(-forward.z, 0, forward.x);
  const input = new THREE.Vector3();
  if (keys.w) input.add(forward);
  if (keys.s) input.sub(forward);
  if (keys.d) input.add(right);
  if (keys.a) input.sub(right);
  let running = Boolean(keys.Shift);
  if (auto && (auto.kind === "walk" || auto.kind === "run")) {
    input.add(forward);
    running = running || auto.kind === "run";
  } else if (auto && auto.kind === "goto") {
    const facing = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
    const steer = autoSteerTo(player.pos.x, player.pos.z, facing.x, facing.z);
    if (steer.distance < auto.stopAt) arrive();
    else {
      input.set(steer.x, 0, steer.z);
      running = steer.distance > 14;
      // The camera swings round behind you, like a game follow camera
      if (lastTime - lastDrag > 1500) camYaw += wrapAngle(Math.atan2(-steer.x, -steer.z) - camYaw) * Math.min(1, dt * 1.5);
      if (Math.random() < dt * 2) updateAutoStatus();
    }
  }
  const moving = input.lengthSq() > 0;
  // Suited walking speeds for the game (Moon: hops, Mars: heavier steps)
  const speed = world === "moon" ? (running ? 2.2 : 1.3) : (running ? 2.4 : 1.3);
  if (moving) {
    input.normalize();
    player.yaw = Math.atan2(input.x, input.z);
  }
  // On the ground, feet push; in the air, you keep your momentum (hardly any control)
  if (player.onGround) {
    const target = input.multiplyScalar(moving ? speed : 0);
    player.vel.x += (target.x - player.vel.x) * Math.min(1, dt * (world === "moon" ? 3 : 6));
    player.vel.z += (target.z - player.vel.z) * Math.min(1, dt * (world === "moon" ? 3 : 6));
    if (keys[" "] || jumpQueued) {
      jumpQueued = false;
      player.vel.y = 2.0; // the same push gives a ~1.2 m jump on the Moon but ~0.5 m on Mars and ~0.2 m on Earth
      player.onGround = false;
      play("whoosh");
    }
  }
  player.vel.y -= g * dt;
  const before = player.pos.clone();
  player.pos.addScaledVector(player.vel, dt);
  if (collide(player.pos, 0.45, true)) {
    // bumped into a boulder: lose the speed going into it
    player.vel.x *= 0.5;
    player.vel.z *= 0.5;
  }
  const ground = heightAt(player.pos.x, player.pos.z);
  if (player.pos.y <= ground) {
    if (!player.onGround && player.vel.y < -1.5) {
      play("thud", 0.2);
      puff(player.pos, 10);
      for (let i = 0; i < 4; i++) spawnSmoke(player.pos.x + (Math.random() - 0.5), player.pos.y + 0.15, player.pos.z + (Math.random() - 0.5), (Math.random() - 0.5) * 0.8, 0.2, (Math.random() - 0.5) * 0.8, 0.6);
    }
    player.pos.y = ground;
    player.vel.y = 0;
    player.onGround = true;
  } else if (player.pos.y > ground + 0.05) {
    player.onGround = false;
  }
  const step = Math.hypot(player.pos.x - before.x, player.pos.z - before.z);
  player.odometer += step;
  if (player.onGround && step > 0) footprint(step);
  addTrail(player.pos);

  astronaut.position.copy(player.pos);
  astronaut.rotation.y += (wrapAngle(player.yaw - astronaut.rotation.y)) * Math.min(1, dt * 8);
  let state = "idle";
  if (!player.onGround) state = "jump";
  else if (moving) state = world === "moon" ? (running ? "run" : "lunar-hop") : (running ? "run" : "mars-walk");
  astronaut.userData.animate(state, dt, { speed: 1, verticalSpeed: player.vel.y });

  followCamera(player.pos, 1.5, dt);
  setMissionState({ distance: nearestText() });
}

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function followCamera(target, height, dt) {
  if (cameraMode === 1) {
    // First person, from the helmet
    const dir = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
    camera.position.set(target.x, target.y + 1.75, target.z).addScaledVector(dir, 0.3);
    camera.lookAt(camera.position.clone().add(dir.setY(-Math.sin(camPitch - 0.35))));
    if (astronaut) astronaut.visible = false;
    return;
  }
  if (astronaut && mode !== "rover") astronaut.visible = true;
  const distance = cameraMode === 2 ? camDistance * 3 : camDistance;
  const goal = new THREE.Vector3(
    target.x + Math.sin(camYaw) * Math.cos(camPitch) * distance,
    target.y + height + Math.sin(camPitch) * distance,
    target.z + Math.cos(camYaw) * Math.cos(camPitch) * distance
  );
  const floor = heightAt(goal.x, goal.z) + 0.6;
  if (goal.y < floor) goal.y = floor;
  // Keep the camera outside the lander (it would show its insides)
  if (lander && mode !== "lm") {
    const dx = goal.x - lander.position.x;
    const dz = goal.z - lander.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 4.2 && goal.y < lander.position.y + 7.5) {
      const k = 4.2 / (d || 1);
      goal.x = lander.position.x + (d ? dx * k : 4.2);
      goal.z = lander.position.z + (d ? dz * k : 0);
    }
  }
  camera.position.lerp(goal, Math.min(1, dt * 6));
  if (shake > 0) {
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake;
    shake = Math.max(0, shake - dt * 1.5);
  }
  camera.lookAt(target.x, target.y + height, target.z);
}

// Wider view as you speed up (feels faster without changing the physics)
function speedFov(speed, max) {
  const goal = 60 + Math.min(1, Math.abs(speed) / max) * 8;
  if (Math.abs(camera.fov - goal) > 0.05) {
    camera.fov += (goal - camera.fov) * 0.05;
    camera.updateProjectionMatrix();
  }
}

// ----- Driving -----
// LRV values: real top speed was about 13 km/h (3.6 m/s); 2.3 m wheelbase, 1.8 m track; both axles steer.
// Game speeds are faster than the real LRV (about 13 km/h top speed); Shift = boost (fictional game feature).
const LRV = { max: 6.5, boost: 10.5, accel: 1.8, brake: 3.6, reverse: 2, base: 2.3, track: 1.8, maxSteer: 0.5, grip: 1.0, radius: 1.5 };
// Rover values are sped up for the game (Perseverance really drives at a few centimeters per second)
const ROVER = { max: 1.8, boost: 3.2, base: 2.6, track: 2.2, radius: 1.6 };

// A collision: a hard hit bounces the vehicle back with a jolt; a soft one just stops it
function crash(v, hit) {
  const impact = Math.abs(v.speed);
  if (impact > 2.5) {
    play("boom", Math.min(1, impact / 8));
    shake = Math.min(0.8, impact * 0.08);
    v.speed = -v.speed * 0.25;
    if (v.suspVel !== undefined) v.suspVel += impact * 0.5;
    v.pitchKick = Math.min(0.35, impact * 0.03);
    puff(v.pos, 20);
    setMessage("Crash! You hit " + (hit.name || "something") + " at " + (impact * 3.6).toFixed(0) + " km/h. Slow down near obstacles.", 3);
  } else {
    if (impact > 0.6) {
      play("thud", 0.4);
      shake = Math.min(0.3, impact * 0.1);
      if (v.kind === "rover") setMessage("Hazard cameras: " + (hit.name || "obstacle") + " ahead. Back up and drive around it.", 2.5);
    }
    v.speed *= 0.2;
  }
}

// ----- Battery (game): driving and boosting use charge; B recharges while stopped -----
// Real power: the LRV ran on two non-rechargeable 36-volt silver-zinc batteries; Curiosity and
// Perseverance recharge their batteries from a nuclear power source (MMRTG). The numbers here are for the game.
function powerLimit(v) {
  return v.battery <= 0 ? 0.25 : v.battery < 10 ? 0.6 : 1;
}

function isBoosting(v, input) {
  return Boolean(keys.Shift) && input.throttle > 0 && v.battery > 3;
}

function updateBattery(v, dt, max, boosting) {
  if (v.battery === undefined) v.battery = 100;
  const before = v.battery;
  if (v.charging) {
    if (Math.abs(v.speed) > 0.3 || keys.w || keys.s) {
      v.charging = false;
      setMessage("Charging stopped: you started driving.", 2);
    } else {
      v.battery = Math.min(100, v.battery + dt * 16);
      if (v.battery >= 100) {
        v.charging = false;
        play("success");
        setMessage("Battery full.", 2);
      }
      return;
    }
  }
  const load = Math.min(1.6, Math.abs(v.speed) / max);
  let drain = 0.05 + load * 0.4 + (boosting ? 1.8 : 0);
  // Slow top-up: the rover's MMRTG, or (game) the lander's power when the LRV is parked beside it
  let gain = v.kind === "rover" ? 0.15 : lander && v.pos.distanceTo(lander.position) < 12 && Math.abs(v.speed) < 0.2 ? 3 : 0;
  v.battery = Math.max(0, Math.min(100, v.battery - drain * dt + gain * dt));
  if (before >= 20 && v.battery < 20) setMessage("Battery low (20%). Stop and press B to recharge.", 4);
  if (before > 0 && v.battery <= 0) setMessage("Battery empty: crawling at low power. Press B to recharge.", 5);
}

export function startCharging() {
  if ((mode !== "lrv" && mode !== "rover") || !vehicle) return false;
  if (Math.abs(vehicle.speed) > 0.3) {
    setMessage("Stop first, then press B to recharge.", 2.5);
    return false;
  }
  vehicle.charging = !vehicle.charging;
  if (vehicle.charging) stopAuto();
  play(vehicle.charging ? "toggleOn" : "toggleOff");
  setMessage(vehicle.charging
    ? (vehicle.kind === "rover" ? "Recharging the batteries (sped up for the game)..." : "Recharging (game feature: the real LRV batteries could not be recharged)...")
    : "Charging paused.", 3);
  return true;
}

function batteryGauge(v) {
  const pct = Math.round(v.battery === undefined ? 100 : v.battery);
  const color = pct > 50 ? "#6fd08c" : pct > 20 ? "#ffd36e" : "#ff6a5a";
  return '<span class="gauge gauge-battery"><em>Battery' + (v.charging ? " · charging" : "") + "</em><b>" + pct + '%</b><i style="--b:' + (pct / 100) + ";--c:" + color + '"></i></span>';
}

function vehicleInput(v, max) {
  let throttle = (keys.w ? 1 : 0) - (keys.s ? 1 : 0);
  let steer = (keys.a ? 1 : 0) - (keys.d ? 1 : 0);
  if (auto && auto.kind === "cruise") {
    throttle = Math.max(-1, Math.min(1, (auto.speed - v.speed) * 2));
  } else if (auto && auto.kind === "goto") {
    const facing = { x: Math.sin(v.yaw), z: Math.cos(v.yaw) };
    const want = autoSteerTo(v.pos.x, v.pos.z, facing.x, facing.z);
    if (want.distance < auto.stopAt) {
      arrive();
      return { throttle: v.speed > 0.05 ? -1 : 0, steer: 0 };
    }
    const error = wrapAngle(Math.atan2(want.x, want.z) - v.yaw);
    steer = Math.max(-1, Math.min(1, error * 2.2));
    const wanted = Math.min(max, want.distance / 4) * (Math.abs(error) > 0.9 ? 0.25 : 1);
    throttle = Math.max(-1, Math.min(1, (wanted - v.speed) * 2));
    v.turnInPlace = Math.abs(error) > 0.6;
    if (lastTime - lastDrag > 1500) camYaw += 0; // the chase camera follows the vehicle anyway
    if (Math.random() < 0.05) updateAutoStatus();
  }
  return { throttle: throttle, steer: steer };
}

// Wheel contact heights at the four corners: they tilt the body (pitch and roll)
function corners(v, base, track) {
  const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw);
  const lx = fz, lz = -fx;
  const hb = base / 2, ht = track / 2;
  const front = (heightAt(v.pos.x + fx * hb + lx * ht, v.pos.z + fz * hb + lz * ht) + heightAt(v.pos.x + fx * hb - lx * ht, v.pos.z + fz * hb - lz * ht)) / 2;
  const rear = (heightAt(v.pos.x - fx * hb + lx * ht, v.pos.z - fz * hb + lz * ht) + heightAt(v.pos.x - fx * hb - lx * ht, v.pos.z - fz * hb - lz * ht)) / 2;
  const left = (heightAt(v.pos.x + lx * ht + fx * hb, v.pos.z + lz * ht + fz * hb) + heightAt(v.pos.x + lx * ht - fx * hb, v.pos.z + lz * ht - fz * hb)) / 2;
  const rightH = (heightAt(v.pos.x - lx * ht + fx * hb, v.pos.z - lz * ht + fz * hb) + heightAt(v.pos.x - lx * ht - fx * hb, v.pos.z - lz * ht - fz * hb)) / 2;
  return { pitch: Math.atan2(rear - front, base), roll: Math.atan2(left - rightH, track), avg: (front + rear) / 2 };
}

function orientVehicle(v, dt, base, track, softness) {
  const c = corners(v, base, track);
  v.pitch += (c.pitch - v.pitch) * Math.min(1, dt * softness);
  v.roll += (c.roll - v.roll) * Math.min(1, dt * softness);
  // Weight transfer: the body rolls outward in turns and dips when braking or accelerating
  v.bodyRoll = (v.bodyRoll || 0) + ((v.leanRoll || 0) - (v.bodyRoll || 0)) * Math.min(1, dt * 4);
  v.bodyPitch = (v.bodyPitch || 0) + ((v.leanPitch || 0) + (v.pitchKick || 0) - (v.bodyPitch || 0)) * Math.min(1, dt * 5);
  v.pitchKick = (v.pitchKick || 0) * (1 - Math.min(1, dt * 3));
  v.model.rotation.order = "YXZ";
  v.model.rotation.set(-v.pitch - v.bodyPitch, v.yaw, v.roll + v.bodyRoll);
  return c;
}

function updateLrv(dt, g) {
  const v = vehicle;
  const input = vehicleInput(v, LRV.max);
  const boosting = isBoosting(v, input);
  const top = (boosting ? LRV.boost : LRV.max) * powerLimit(v);
  if (v.charging) input.throttle = 0;
  const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw);
  const onGround = v.air <= 0;
  // Engine, brakes and the slope (going uphill slows you, downhill speeds you up)
  const slope = (heightAt(v.pos.x + fx * 1.2, v.pos.z + fz * 1.2) - heightAt(v.pos.x - fx * 1.2, v.pos.z - fz * 1.2)) / 2.4;
  let acc = 0;
  if (onGround) {
    if (input.throttle > 0) acc = v.speed < -0.05 ? LRV.brake : LRV.accel * (boosting ? 1.7 : 1) * input.throttle * Math.max(-1, 1 - Math.max(0, v.speed) / top);
    else if (input.throttle < 0) acc = v.speed > 0.05 ? -LRV.brake : -LRV.accel * 0.6 * (1 + Math.min(0, v.speed) / LRV.reverse);
    acc -= g * slope;
    if (Math.abs(v.speed) > 0.02) acc -= Math.sign(v.speed) * 0.1; // rolling resistance in loose soil
    if (keys[" "]) v.speed *= 1 - Math.min(1, dt * 3);
  }
  v.speed += acc * dt;
  if (input.throttle === 0 && Math.abs(v.speed) < 0.04 && Math.abs(slope) < 0.08) v.speed = 0;
  v.speed = Math.max(-LRV.reverse, Math.min(LRV.boost * 1.3, v.speed));
  updateBattery(v, dt, LRV.max, boosting);

  // Steering: front and rear wheels turn opposite ways (tight turns); less steering at speed
  const steerGoal = input.steer * LRV.maxSteer * (1 - 0.55 * Math.min(1, Math.abs(v.speed) / LRV.max));
  v.steer += (steerGoal - v.steer) * Math.min(1, dt * 2.6); // the steering wheel needs time to turn
  let yawRate = onGround ? (v.speed * Math.tan(v.steer)) / (LRV.base / 2) : 0;
  // Low gravity = little grip: turn too hard and the rover slides sideways
  const grip = LRV.grip * g;
  const lateral = v.speed * yawRate;
  if (onGround && Math.abs(lateral) > grip) {
    const allowed = grip / Math.max(0.1, Math.abs(v.speed));
    v.slip += (Math.abs(lateral) - grip) * Math.sign(lateral) * dt * 0.6;
    yawRate = Math.sign(yawRate) * allowed;
    if (Math.random() < dt * 4) puff(v.pos, 4);
  }
  v.slip *= 1 - Math.min(1, dt * (onGround ? 2.5 : 0.2));
  v.yaw += yawRate * dt;
  v.leanRoll = Math.max(-0.12, Math.min(0.12, -v.speed * yawRate / Math.max(1, g * 4)));
  v.leanPitch = Math.max(-0.06, Math.min(0.06, -acc * 0.012));

  const before = v.pos.clone();
  v.pos.x += Math.sin(v.yaw) * v.speed * dt - Math.cos(v.yaw) * v.slip * dt;
  v.pos.z += Math.cos(v.yaw) * v.speed * dt + Math.sin(v.yaw) * v.slip * dt;
  const hit = collide(v.pos, LRV.radius, false);
  if (hit) crash(v, hit);
  v.odometer = (v.odometer || 0) + Math.hypot(v.pos.x - before.x, v.pos.z - before.z);

  // Vertical: the body follows the ground, and over a crest it flies a little (low gravity)
  const ground = heightAt(v.pos.x, v.pos.z);
  const groundVel = Math.max(-4, Math.min(3, (ground - (v.lastGround === undefined ? ground : v.lastGround)) / Math.max(dt, 1e-3)));
  v.lastGround = ground;
  if (v.y === undefined || v.y < ground - 1 || v.y > ground + 30) { v.y = ground; v.vy = 0; }
  v.vy -= g * dt;
  v.y += v.vy * dt;
  if (v.y <= ground) {
    if (v.air > 0.25 && v.vy < -1) { play("thud", 0.25); shake = Math.min(0.35, -v.vy * 0.1); v.suspVel -= -v.vy * 0.6; puff(v.pos, 14); }
    v.y = ground;
    v.vy = Math.max(groundVel, 0);
    v.air = 0;
  } else if (v.y > ground + 0.06) {
    v.air += dt;
  }
  // Suspension: a soft spring between the wheels and the body
  v.suspVel += (-v.bodyY * 70 - v.suspVel * 7) * dt;
  v.bodyY += v.suspVel * dt;
  v.pos.y = v.y;
  v.model.position.set(v.pos.x, v.y + v.bodyY * 0.25, v.pos.z);
  orientVehicle(v, dt, LRV.base, LRV.track, onGround ? 8 : 1);

  (v.model.userData.wheels || []).forEach(function (wheel, i) {
    wheel.rotation.x += v.speed * dt / 0.41;
    wheel.rotation.y = (i < 2 ? 1 : -1) * v.steer;
  });
  if (onGround && Math.abs(v.speed) > 0.3) {
    wheelTracks(v, LRV.track, Math.abs(v.speed) * dt);
    if (Math.abs(v.speed) > 1.4 && Math.random() < dt * 18) roosterTail(v);
    wheelSmoke(v, dt, 1.1, LRV.track, boosting);
  }
  addTrail(v.pos);
  astronaut.userData.animate("drive", dt, { steer: v.steer });
  setLoop("engine", Math.abs(v.speed) > 0.1 ? 0.06 + Math.abs(v.speed) * 0.03 : 0);
  if (v.odometer > 150) completeObjective("drive");
  gauges.innerHTML = batteryGauge(v) + gauge("Speed (game)", (Math.abs(v.speed) * 3.6).toFixed(0) + " km/h" + (boosting ? " · BOOST" : "")) +
    gauge("Steering", Math.round(v.steer * 57) + "°") + gauge("Slope", Math.round(Math.atan(slope) * 57) + "°") + gauge("Odometer", Math.round(v.odometer) + " m") +
    gauge("Gravity", g + " m/s²") + (auto ? gauge("Auto", auto.kind === "cruise" ? "Cruise" : "Driving") : "");
  if (lastTime - lastDrag > 1500) camYaw += (wrapAngle(v.yaw + Math.PI - camYaw)) * Math.min(1, dt * 1.5);
  speedFov(v.speed, LRV.max * (boosting ? 0.8 : 1.3));
  followCamera(v.pos, 1.6, dt);
  setMissionState({ distance: nearestText() });
}

function updateRover(dt) {
  const v = vehicle;
  // Slow and careful: real rovers drive at a few centimeters per second; this is sped up for the game
  const input = vehicleInput(v, ROVER.max);
  const boosting = isBoosting(v, input);
  if (v.charging) { input.throttle = 0; input.steer = 0; }
  const top = (boosting ? ROVER.boost : ROVER.max) * powerLimit(v);
  const autoTurn = auto && auto.kind === "goto" && v.turnInPlace;
  const slope = (heightAt(v.pos.x + Math.sin(v.yaw), v.pos.z + Math.cos(v.yaw)) - heightAt(v.pos.x - Math.sin(v.yaw), v.pos.z - Math.cos(v.yaw))) / 2;
  let goal = input.throttle > 0 ? top * input.throttle : input.throttle < 0 ? 0.9 * input.throttle : 0;
  if (autoTurn) goal = 0;
  goal *= 1 - Math.min(0.6, Math.max(0, slope) * 2); // climbing slows the rover down
  v.speed += (goal - v.speed) * Math.min(1, dt * 2);
  updateBattery(v, dt, ROVER.max, boosting);
  // Turns in place when stopped; while moving it drives a smooth arc
  const turnRate = input.steer * (Math.abs(v.speed) < 0.2 ? 0.7 : 0.45);
  v.turnRate = (v.turnRate || 0) + (turnRate - (v.turnRate || 0)) * Math.min(1, dt * 3);
  v.yaw += v.turnRate * dt;
  v.leanRoll = Math.max(-0.06, Math.min(0.06, -v.speed * v.turnRate * 0.05));
  const before = v.pos.clone();
  v.pos.x += Math.sin(v.yaw) * v.speed * dt;
  v.pos.z += Math.cos(v.yaw) * v.speed * dt;
  const roverHit = collide(v.pos, ROVER.radius, false);
  if (roverHit) crash(v, roverHit);
  v.odometer = (v.odometer || 0) + Math.hypot(v.pos.x - before.x, v.pos.z - before.z);
  v.pos.y = heightAt(v.pos.x, v.pos.z);
  v.model.position.copy(v.pos);
  // Rocker-bogie suspension keeps all six wheels on the ground: the body tilts gently with the terrain
  orientVehicle(v, dt, ROVER.base, ROVER.track, 3);
  (v.model.userData.wheels || []).forEach(function (wheel) { wheel.rotation.x += v.speed * dt / 0.26; });
  if (Math.abs(v.speed) > 0.05) wheelTracks(v, ROVER.track, Math.abs(v.speed) * dt);
  if (Math.abs(v.speed) > 0.4) wheelSmoke(v, dt, 1.2, ROVER.track, boosting);
  addTrail(v.pos);
  // Robotic arm unfolds and folds
  v.armOut += (v.armGoal - v.armOut) * Math.min(1, dt * 2);
  v.arm.rotation.x = 0.9 - v.armOut * 1.4;
  v.arm.userData.elbow.rotation.x = -1.6 + v.armOut * 2.1;
  setLoop("engine", Math.abs(v.speed) > 0.05 ? 0.06 : 0);
  if (v.odometer > 40) completeObjective("drive");
  gauges.innerHTML = batteryGauge(v) + gauge("Speed (sped up)", (Math.abs(v.speed) * 3.6).toFixed(1) + " km/h" + (boosting ? " · BOOST" : "")) + gauge("Heading", Math.round(((v.yaw * 57) % 360 + 360) % 360) + "°") +
    gauge("Tilt", Math.round(Math.hypot(v.pitch, v.roll) * 57) + "°") + gauge("Odometer", v.odometer.toFixed(1) + " m") + gauge("Arm", v.armGoal > 0.5 ? "Deployed" : "Stowed");

  if (cameraMode === 1) {
    // Mast camera: arrow keys aim it
    if (keys.ArrowLeft) mastYaw += dt;
    if (keys.ArrowRight) mastYaw -= dt;
    if (keys.ArrowUp) mastPitch = Math.min(0.6, mastPitch + dt * 0.6);
    if (keys.ArrowDown) mastPitch = Math.max(-0.9, mastPitch - dt * 0.6);
    const head = v.pos.clone().add(new THREE.Vector3(Math.sin(v.yaw) * 0.6, 2.1, Math.cos(v.yaw) * 0.6));
    const dir = new THREE.Vector3(Math.sin(v.yaw + mastYaw) * Math.cos(mastPitch), Math.sin(mastPitch), Math.cos(v.yaw + mastYaw) * Math.cos(mastPitch));
    camera.position.copy(head);
    camera.lookAt(head.clone().add(dir));
  } else {
    if (lastTime - lastDrag > 1500) camYaw += (wrapAngle(v.yaw + Math.PI - camYaw)) * Math.min(1, dt * 1.2);
    followCamera(v.pos, 1.2, dt);
  }
  setMissionState({ distance: nearestText() });
}

// ----- Footprints, wheel tracks and dust -----
let prints = null;   // { mesh, next, since, side }
let tracks = null;
let dust = null;     // { points, items }
const MARK_COUNT = 5000;   // tracks and footprints stay for a long time

function buildMarks(world) {
  const color = world === "mars" ? 0x4a1e0c : 0x2a2a2a;
  function pool(width, length) {
    const material = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: world === "mars" ? 0.38 : 0.45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const geometry = new THREE.PlaneGeometry(width, length);
    geometry.rotateX(-Math.PI / 2);
    const mesh = new THREE.InstancedMesh(geometry, material, MARK_COUNT);
    mesh.count = 0;
    mesh.frustumCulled = false;
    worldGroup.add(mesh);
    return { mesh: mesh, next: 0, since: 0, side: 1 };
  }
  prints = pool(0.16, 0.3);
  tracks = pool(0.24, 0.55);
  // Dust: no air on the Moon, so it flies in clean arcs and falls straight back; on Mars it hangs a little
  const count = 260;
  const positions = new Float32Array(count * 3).fill(-1e4);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({ color: world === "mars" ? 0xc0764a : 0x9c9a95, size: 0.09, transparent: true, opacity: 0.8, depthWrite: false }));
  points.frustumCulled = false;
  worldGroup.add(points);
  const items = [];
  for (let i = 0; i < count; i++) items.push({ x: 0, y: -1e4, z: 0, vx: 0, vy: 0, vz: 0, life: 0 });
  dust = { points: points, items: items, next: 0 };
  buildSmoke(world);
}

// ----- Smoke: soft dust clouds kicked up behind the wheels (bigger with boost) -----
let smoke = null;

function smokeTexture() {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 64;
  const ctx = c.getContext("2d");
  if (!ctx || !ctx.createRadialGradient) return null;
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
  grad.addColorStop(0, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.45)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function buildSmoke(world) {
  const map = smokeTexture();
  const color = world === "mars" ? 0xc98a5e : 0xc9c6bf;
  const items = [];
  for (let i = 0; i < 140; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: map, color: color, transparent: true, opacity: 0, depthWrite: false }));
    sprite.visible = false;
    worldGroup.add(sprite);
    items.push({ sprite: sprite, life: 0, max: 1, vx: 0, vy: 0, vz: 0, size: 1 });
  }
  smoke = { items: items, next: 0, carry: 0, world: world };
}

function spawnSmoke(x, y, z, vx, vy, vz, size) {
  if (!smoke) return;
  const p = smoke.items[smoke.next];
  smoke.next = (smoke.next + 1) % smoke.items.length;
  // On Mars the thin air carries dust for a while; on the Moon (no air) it settles quickly
  const mars = smoke.world === "mars";
  p.life = p.max = (mars ? 2.6 : 1.3) * (0.7 + Math.random() * 0.6);
  p.vx = vx; p.vy = vy; p.vz = vz; p.size = size;
  p.sprite.position.set(x, y, z);
  p.sprite.visible = true;
}

function wheelSmoke(v, dt, back, track, boosting) {
  if (!smoke) return;
  const speed = Math.abs(v.speed);
  smoke.carry += dt * speed * (boosting ? 5 : 2.5);
  const bx = -Math.sin(v.yaw), bz = -Math.cos(v.yaw);
  while (smoke.carry >= 1) {
    smoke.carry -= 1;
    const side = Math.random() < 0.5 ? -1 : 1;
    const wx = v.pos.x + bx * back + Math.cos(v.yaw) * track * 0.5 * side;
    const wz = v.pos.z + bz * back - Math.sin(v.yaw) * track * 0.5 * side;
    spawnSmoke(wx, heightAt(wx, wz) + 0.25, wz, bx * speed * 0.25 + (Math.random() - 0.5) * 0.6, 0.3 + Math.random() * 0.5, bz * speed * 0.25 + (Math.random() - 0.5) * 0.6, (boosting ? 1.9 : 1.2) + Math.random() * 0.7);
  }
}

function updateSmoke(dt) {
  if (!smoke) return;
  const mars = smoke.world === "mars";
  smoke.items.forEach(function (p) {
    if (p.life <= 0) return;
    p.life -= dt;
    if (p.life <= 0) { p.sprite.visible = false; p.sprite.material.opacity = 0; return; }
    const age = 1 - p.life / p.max;
    if (mars) { p.vx += 0.4 * dt; p.vy *= 1 - dt; } else p.vy -= 1.62 * dt * 0.5;
    p.vx *= 1 - dt * 0.8; p.vz *= 1 - dt * 0.8;
    p.sprite.position.x += p.vx * dt;
    p.sprite.position.y = Math.max(p.sprite.position.y + p.vy * dt, heightAt(p.sprite.position.x, p.sprite.position.z) + 0.1);
    p.sprite.position.z += p.vz * dt;
    const s = p.size * (0.5 + age * 2.4);
    p.sprite.scale.set(s, s, s);
    p.sprite.material.opacity = 0.75 * (1 - age) * Math.min(1, age * 6);
  });
}

const markMatrix = new THREE.Matrix4();
const markQuat = new THREE.Quaternion();
const markYaw = new THREE.Quaternion();
const markScale = new THREE.Vector3(1, 1, 1);
const markPos = new THREE.Vector3();

function placeMark(pool, x, z, yaw) {
  if (!pool) return;
  const n = terrainNormal(x, z);
  markQuat.setFromUnitVectors(UP, n);
  markYaw.setFromAxisAngle(UP, yaw);
  markQuat.multiply(markYaw);
  markPos.set(x, heightAt(x, z) + 0.025, z);
  markMatrix.compose(markPos, markQuat, markScale);
  pool.mesh.setMatrixAt(pool.next, markMatrix);
  pool.next = (pool.next + 1) % MARK_COUNT;
  pool.mesh.count = Math.min(MARK_COUNT, Math.max(pool.mesh.count, pool.next === 0 ? MARK_COUNT : pool.next));
  if (pool.mesh.instanceMatrix) pool.mesh.instanceMatrix.needsUpdate = true;
}

function footprint(step) {
  if (!prints) return;
  prints.since += step;
  if (prints.since < 0.7) return;
  prints.since = 0;
  prints.side = -prints.side;
  const sx = Math.cos(player.yaw) * 0.13 * prints.side;
  const sz = -Math.sin(player.yaw) * 0.13 * prints.side;
  placeMark(prints, player.pos.x + sx, player.pos.z + sz, player.yaw);
}

function wheelTracks(v, track, step) {
  if (!tracks) return;
  tracks.since += step;
  if (tracks.since < 0.5) return;
  tracks.since = 0;
  const lx = Math.cos(v.yaw) * track / 2;
  const lz = -Math.sin(v.yaw) * track / 2;
  placeMark(tracks, v.pos.x + lx, v.pos.z + lz, v.yaw);
  placeMark(tracks, v.pos.x - lx, v.pos.z - lz, v.yaw);
}

function spawnDust(x, y, z, vx, vy, vz) {
  if (!dust) return;
  const p = dust.items[dust.next];
  dust.next = (dust.next + 1) % dust.items.length;
  p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.life = 1.6;
}

// A puff of dust around a point (a landing, a skid)
function puff(at, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 0.4 + Math.random() * 0.8;
    spawnDust(at.x + Math.cos(a) * 0.3, heightAt(at.x, at.z) + 0.05, at.z + Math.sin(a) * 0.3, Math.cos(a) * s, 0.5 + Math.random() * 1.2, Math.sin(a) * s);
  }
}

// Rooster tails: the LRV's wheels threw dust in high arcs (the fenders were there to stop it)
function roosterTail(v) {
  const bx = -Math.sin(v.yaw), bz = -Math.cos(v.yaw);
  [-1, 1].forEach(function (side) {
    const wx = v.pos.x + bx * 1.1 + Math.cos(v.yaw) * 0.9 * side;
    const wz = v.pos.z + bz * 1.1 - Math.sin(v.yaw) * 0.9 * side;
    const s = Math.abs(v.speed);
    spawnDust(wx, heightAt(wx, wz) + 0.2, wz, bx * s * 0.6 + (Math.random() - 0.5) * 0.5, 1 + Math.random() * s * 0.6, bz * s * 0.6 + (Math.random() - 0.5) * 0.5);
  });
}

function updateDust(dt) {
  if (!dust) return;
  const g = GRAVITY[site.world] || 0;
  const drag = site.world === "mars" ? 1.2 : 0;
  const array = dust.points.geometry.attributes.position.array;
  dust.items.forEach(function (p, i) {
    if (p.life > 0) {
      p.life -= dt;
      p.vy -= g * dt;
      if (drag) { p.vx *= 1 - drag * dt; p.vz *= 1 - drag * dt; p.vy *= 1 - drag * 0.5 * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < heightAt(p.x, p.z) || p.life <= 0) { p.life = 0; p.y = -1e4; }
    }
    array[i * 3] = p.x; array[i * 3 + 1] = p.y; array[i * 3 + 2] = p.z;
  });
  dust.points.geometry.attributes.position.needsUpdate = true;
}

// ----- Mini map -----
const RELIEF_RANGE = 230;
const relief = document.createElement("canvas");
relief.width = 400;
relief.height = 400;
let mapRange = 70;     // meters from the center to the edge
let mapDrawn = 0;

function buildMap() {
  if (!mapCanvas || site.world === "orbit") return;
  drawRelief(relief, RELIEF_RANGE);
  mapDrawn = 0;
}

function addTrail(p) {
  const last = trail[trail.length - 1];
  if (!last || Math.hypot(last.x - p.x, last.z - p.z) > 2) {
    trail.push({ x: p.x, z: p.z });
    if (trail.length > 3000) trail.shift();
  }
}

function toggleBigMap() {
  if (!mapBox) return;
  mapBox.classList.toggle("big");
  play("click");
}

function heading() {
  if ((mode === "lrv" || mode === "rover") && vehicle) return vehicle.yaw;
  return player.yaw;
}

function drawMap(force) {
  if (!mapCanvas || !mapBox || mapBox.classList.contains("hidden")) return;
  if (!force && lastTime - mapDrawn < 60) return;
  mapDrawn = lastTime;
  const ctx = mapCanvas.getContext ? mapCanvas.getContext("2d") : null;
  if (!ctx || !ctx.drawImage) return;
  const size = mapCanvas.width;
  const center = focusPosition();
  const scale = size / (mapRange * 2);
  const toX = function (x) { return size / 2 + (x - center.x) * scale; };
  const toY = function (z) { return size / 2 + (z - center.z) * scale; };
  ctx.save();
  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#08090c";
  ctx.fillRect(0, 0, size, size);
  // Relief picture: the part around you
  const k = relief.width / (RELIEF_RANGE * 2);
  ctx.globalAlpha = 0.95;
  ctx.drawImage(relief, (center.x - mapRange + RELIEF_RANGE) * k, (center.z - mapRange + RELIEF_RANGE) * k, mapRange * 2 * k, mapRange * 2 * k, 0, 0, size, size);
  ctx.globalAlpha = 1;
  // Boulders
  ctx.fillStyle = "rgba(15,15,18,0.65)";
  boulders.forEach(function (b) {
    const x = toX(b.x), y = toY(b.z);
    if (x < 0 || y < 0 || x > size || y > size) return;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1.5, b.r * scale), 0, Math.PI * 2);
    ctx.fill();
  });
  // Where you have been
  if (trail.length > 1) {
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    ctx.setLineDash && ctx.setLineDash([3, 4]);
    ctx.beginPath();
    trail.forEach(function (p, i) { if (i === 0) ctx.moveTo(toX(p.x), toY(p.z)); else ctx.lineTo(toX(p.x), toY(p.z)); });
    ctx.stroke();
    ctx.setLineDash && ctx.setLineDash([]);
  }
  // The lander and the parked vehicle
  if (lander && mode !== "lm") {
    ctx.fillStyle = "#e8e2d0";
    ctx.fillRect(toX(lander.position.x) - 5, toY(lander.position.z) - 5, 10, 10);
  }
  if (vehicle && mode === "foot") {
    ctx.fillStyle = "#8fd0ff";
    ctx.fillRect(toX(vehicle.pos.x) - 5, toY(vehicle.pos.z) - 3, 10, 6);
  }
  // Objects: orange = not recorded yet, green = recorded, blue = science target
  objects.forEach(function (o) {
    if (o.group === lander || (vehicle && o.group === vehicle.model)) return;
    const p = o.group.getWorldPosition ? o.group.getWorldPosition(new THREE.Vector3()) : o.group.position;
    let x = toX(p.x), y = toY(p.z);
    const r = size / 2 - 8;
    const dx = x - size / 2, dy = y - size / 2;
    const d = Math.hypot(dx, dy);
    const outside = d > r;
    if (outside) { x = size / 2 + dx / d * r; y = size / 2 + dy / d * r; } // pinned to the edge, pointing the way
    ctx.fillStyle = isRecorded(o.entry.id) ? "#6fd08c" : o.entry.kind === "target" ? "#5aa9ff" : "#ff8a3d";
    ctx.beginPath();
    ctx.arc(x, y, outside ? 3.5 : 5, 0, Math.PI * 2);
    ctx.fill();
    if (!outside) { ctx.strokeStyle = "#08090c"; ctx.lineWidth = 1.5; ctx.stroke(); }
  });
  // Autopilot target
  if (auto && auto.kind === "goto") {
    const tx = toX(auto.x), ty = toY(auto.z);
    ctx.strokeStyle = "#ffd36e";
    ctx.lineWidth = 2;
    ctx.setLineDash && ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(size / 2, size / 2); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.setLineDash && ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(tx - 6, ty - 6); ctx.lineTo(tx + 6, ty + 6); ctx.moveTo(tx + 6, ty - 6); ctx.lineTo(tx - 6, ty + 6); ctx.stroke();
  }
  // You: an arrow pointing where you face; a cone showing where the camera looks
  ctx.translate(size / 2, size / 2);
  ctx.save();
  ctx.rotate(Math.PI - camYaw);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, size * 0.3, Math.PI / 2 - 0.5, Math.PI / 2 + 0.5); ctx.closePath(); ctx.fill();
  ctx.restore();
  const h = heading();
  ctx.rotate(Math.atan2(Math.sin(h), -Math.cos(h)));
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#08090c";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6.5, 7); ctx.lineTo(0, 3.5); ctx.lineTo(-6.5, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  if (mapCaption) {
    const total = objects.filter(function (o) { return o.entry.kind !== "observe"; }).length;
    const done = objects.filter(function (o) { return isRecorded(o.entry.id); }).length;
    mapCaption.textContent = done + " / " + objects.length + " recorded · " + Math.round(mapRange * 2) + " m across";
    void total;
  }
}

if (mapCanvas) {
  mapCanvas.addEventListener("click", function (event) {
    if (!running || (mode !== "foot" && mode !== "lrv" && mode !== "rover")) return;
    const rect = mapCanvas.getBoundingClientRect ? mapCanvas.getBoundingClientRect() : { left: 0, top: 0, width: mapCanvas.width, height: mapCanvas.height };
    const size = mapCanvas.width;
    const px = (event.clientX - rect.left) / rect.width * size;
    const py = (event.clientY - rect.top) / rect.height * size;
    const center = focusPosition();
    const scale = size / (mapRange * 2);
    const x = center.x + (px - size / 2) / scale;
    const z = center.z + (py - size / 2) / scale;
    // Clicking near an object travels to that object
    let label = "map point";
    let best = 8 / scale + 3;
    objects.forEach(function (o) {
      const p = o.group.getWorldPosition ? o.group.getWorldPosition(new THREE.Vector3()) : o.group.position;
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < best) { best = d; label = o.entry.card.name; }
    });
    travelTo(x, z, label);
  });
  mapCanvas.addEventListener("wheel", function (event) {
    if (event.preventDefault) event.preventDefault();
    if (event.stopPropagation) event.stopPropagation();
    mapRange = Math.max(30, Math.min(200, mapRange * (event.deltaY > 0 ? 1.2 : 0.83)));
    drawMap(true);
  });
}
[["map-zoom-in", 0.75], ["map-zoom-out", 1.33]].forEach(function (pair) {
  const button = document.getElementById(pair[0]);
  if (button) button.addEventListener("click", function () { mapRange = Math.max(30, Math.min(200, mapRange * pair[1])); play("tick"); drawMap(true); });
});
const mapExpand = document.getElementById("map-expand");
if (mapExpand) mapExpand.addEventListener("click", toggleBigMap);

if (autoBox && autoBox.querySelectorAll) {
  autoBox.querySelectorAll("[data-auto]").forEach(function (button) {
    const icon = button.querySelector ? button.querySelector(".auto-icon") : null;
    if (icon) icon.innerHTML = uiIcon(button.dataset.icon || button.dataset.auto);
    button.addEventListener("click", function () {
      const kind = button.dataset.auto;
      if (kind === "stop") stopAuto("Auto off.");
      else if (kind === "goto") goToNearest();
      else if (kind === "cruise") toggleAuto();
      else if (auto && auto.kind === kind) stopAuto("Auto off.");
      else startAuto({ kind: kind });
    });
  });
}

function updateEva(dt) {
  // No gravity and no friction: thrust changes your speed, and you keep drifting
  const forward = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
  const right = new THREE.Vector3(-forward.z, 0, forward.x);
  const thrust = new THREE.Vector3();
  if (keys.w) thrust.add(forward);
  if (keys.s) thrust.sub(forward);
  if (keys.d) thrust.add(right);
  if (keys.a) thrust.sub(right);
  if (keys.r) thrust.y += 1;
  if (keys.v) thrust.y -= 1;
  if (thrust.lengthSq()) {
    thrust.normalize().multiplyScalar(0.35 * dt);
    player.vel.add(thrust);
    setLoop("wind", 0.05);
  } else setLoop("wind", 0);
  player.pos.addScaledVector(player.vel, dt);
  astronaut.position.copy(player.pos);
  astronaut.rotation.y += 0.05 * dt;
  astronaut.rotation.x = Math.sin(lastTime * 0.0004) * 0.2;
  astronaut.userData.animate("float", dt);
  const toCraft = craft.position.distanceTo(player.pos);
  if (toCraft < 9) completeObjective("eva");
  gauges.innerHTML = gauge("Drift speed", player.vel.length().toFixed(2) + " m/s") + gauge("To spacecraft", Math.max(0, toCraft - 5).toFixed(1) + " m") + gauge("Gravity", "Free fall (orbit)");
  followCamera(player.pos, 0.6, dt);
  setMissionState({ distance: "Spacecraft: " + Math.max(0, toCraft - 5).toFixed(0) + " m" });
}

function updateCockpit(dt) {
  if (astronaut) astronaut.userData.animate("seated", dt);
  if (interior) {
    for (let i = 0; i < 3; i++) {
      const screen = interior.userData["screen" + i];
      if (screen) screen.material.color.setHSL(0.6, 0.6, 0.25 + 0.05 * Math.sin(lastTime * 0.002 + i));
    }
  }
  craft.rotation.y += cockpitSpin * dt * 0.1;
  cockpitSpin *= 1 - Math.min(1, dt * 0.2);
  if (cameraMode === 2) {
    // Outside view: the spacecraft against Earth
    interior.visible = false;
    if (astronaut) astronaut.visible = false;
    camera.position.set(craft.position.x + 12, craft.position.y + 4, craft.position.z - 10);
    camera.lookAt(craft.position);
  } else {
    interior.visible = true;
    if (astronaut) astronaut.visible = true;
    camera.position.set(-1.0, 1.55, -1.15);
    camera.lookAt(0.15, 1.25, 1.1);
  }
}

function nearestText() {
  const near = nearest(1e9, function (o) { return !isRecorded(o.entry.id); });
  return near ? "Nearest unrecorded: " + near.object.entry.card.name + " · " + Math.round(near.distance) + " m" : "Everything here is recorded";
}

function updateObjectivesFromPosition() {
  const from = focusPosition();
  if (mode !== "lm" && mode !== "cockpit" && mode !== "eva" && Math.hypot(from.x - player.start.x, from.z - player.start.z) > 60) completeObjective("explore");
  if ((mode === "lrv" || mode === "rover") && vehicle.odometer > 60) completeObjective("explore");
}

// ----- Labels and the interaction prompt -----
const projected = new THREE.Vector3();

function updateLabels() {
  const width = canvas.clientWidth || 800;
  const height = canvas.clientHeight || 600;
  const near = mode === "lm" || mode === "cockpit" ? null : nearest(mode === "eva" ? 25 : mode === "foot" ? 5 : 7);
  objects.forEach(function (o) {
    const p = o.group.getWorldPosition ? o.group.getWorldPosition(new THREE.Vector3()) : o.group.position.clone();
    p.y += o.entry.model === "lunar-module-descent" ? 7 : 2;
    const distance = camera.position.distanceTo(p);
    projected.copy(p);
    if (projected.project) projected.project(camera);
    const visible = mode !== "cockpit" && distance < 70 && projected.z < 1 && Math.abs(projected.x) < 1.1 && Math.abs(projected.y) < 1.1;
    o.label.style.display = visible ? "block" : "none";
    if (visible) {
      o.label.style.transform = "translate(" + ((projected.x * 0.5 + 0.5) * width) + "px," + ((-projected.y * 0.5 + 0.5) * height) + "px) translate(-50%, -100%)";
      o.label.classList.toggle("recorded", isRecorded(o.entry.id));
      o.label.classList.toggle("near", Boolean(near && near.object === o));
    }
  });
  if (near && !action) {
    promptBox.classList.remove("hidden");
    promptName.textContent = near.object.entry.card.name;
    const recorded = isRecorded(near.object.entry.id);
    promptKeys.textContent = (recorded ? "Recorded ✓ · " : "[F] Record in My Collection · ") + "[E] Examine";
  } else if (mode === "foot" && vehicle && player.pos.distanceTo(vehicle.pos) < (vehicle.kind === "lrv" ? 3.2 : 3.5)) {
    promptBox.classList.remove("hidden");
    promptName.textContent = vehicle.kind === "lrv" ? "Lunar Roving Vehicle" : "Rover (sandbox: fictional)";
    promptKeys.textContent = vehicle.kind === "lrv" ? "[E] Get in and drive" : "[E] Take remote control";
  } else {
    promptBox.classList.add("hidden");
  }
}

// ----- Loop -----
let running = false;

function render() {
  if (renderer) renderer.render(scene, camera);
}

function frame(time) {
  if (!running) return;
  animationId = requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0, ((time || 0) - lastTime) / 1000)) || 1 / 60;
  lastTime = time || lastTime + 16;
  if (site && !isInfoCardOpen()) update(dt);
  if (site && site.world !== "orbit") {
    const f = focusPosition();
    sun.position.set(f.x + sunDirection.x * 150, f.y + sunDirection.y * 150, f.z + sunDirection.z * 150);
    if (sun.target) { sun.target.position.set(f.x, f.y, f.z); if (sun.target.updateMatrixWorld) sun.target.updateMatrixWorld(); }
    if (!isInfoCardOpen()) { updateDust(dt); updateSmoke(dt); }
    drawMap(false);
  } else {
    sun.position.copy(sunDirection).multiplyScalar(150);
  }
  updateLabels();
  render();
}

function resize() {
  if (!renderer) return;
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

window.addEventListener("resize", resize);
document.addEventListener("keydown", onKeyDown);
document.addEventListener("keyup", onKeyUp);

export function startExploration(id, options) {
  ensureRenderer();
  const suit = options && options.suit ? options.suit : null;
  // Reload if another scene (a mission replay) used the shared terrain in between
  if (id && (id !== siteId || !site || suit !== suitOverride || getTerrain().site !== id)) loadSite(id, options);
  running = true;
  resize();
  lastTime = 0;
  if (animationId === null) frame(0);
}

export function stopExploration() {
  running = false;
  Object.keys(keys).forEach(function (k) { keys[k] = false; });
  setLoop("engine", 0);
  setLoop("wind", 0);
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

export function getExplorationState() {
  return { mode: mode, siteId: siteId, player: player, vehicle: vehicle, lm: lm, objects: objects.length, keys: keys, auto: auto, boulders: boulders.length };
}

// Used by the tests and by the "Restart site" button
export function restartSite() {
  if (siteId) loadSite(siteId);
}
