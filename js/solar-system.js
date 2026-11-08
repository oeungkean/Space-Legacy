// This file builds the 3D solar system, lets the user move the camera,
// handles clicking and searching, labels, view options, and plays mission replays with voice narration.
// NOTE: sizes, distances and speeds are simplified for display, not to scale.
// NOTE: spacecraft positions, paths and 3D models (including every replay) are illustrative.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { planetInfo } from "../data/planets.js";
import { spacecraftInfo } from "../data/spacecraft.js";
import { hardwareList } from "../data/hardware.js";
import { hardwareReplays, replayVisuals } from "../data/hardware-replays.js";
import { missions, STAGES, STAGE_TAGS, EVENT_ACTIONS } from "../data/missions.js";
import { catalog, itemsForBody, CATEGORIES } from "../data/catalog.js";
import { createModel, createLauncher, UPRIGHT_MODELS } from "./models.js";
import { createParticleSystem } from "./particles.js";
import { createGlow } from "./glow.js";
import { PLANET_LOOKS, planetMaterial as lookMaterial, cloudMaterial, ringMaterial as lookRingMaterial } from "./planet-look.js";
import { play, setLoop, isSoundOn, isGroupOn, setGroupOn, onSoundChange } from "./sounds.js";
import { accentCss, accentNumber, onThemeChange } from "./theme.js";
import { speak, stopSpeaking, speechSupported } from "./narrator.js";

// ----- Find the page elements we need -----
const solarScreen = document.getElementById("solar-system-screen");
const canvas = document.getElementById("solar-canvas");
const breadcrumb = document.getElementById("breadcrumb");
const infoPanel = document.getElementById("info-panel");
const panelName = document.getElementById("planet-name");
const panelKind = document.getElementById("planet-kind");
const panelSummary = document.getElementById("planet-summary");
const panelFacts = document.getElementById("planet-facts");
const panelNote = document.getElementById("planet-note");
const panelSources = document.getElementById("planet-sources");
const exploreButton = document.getElementById("explore-button");
const replayButton = document.getElementById("replay-button");
const exploreMessage = document.getElementById("explore-message");
const panelClose = document.getElementById("panel-close");
const resetButton = document.getElementById("reset-button");
const sidebar = document.getElementById("planet-sidebar");
const sidebarList = document.getElementById("sidebar-list");

const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");

const bodyTooltip = document.getElementById("body-tooltip");
const toastBox = document.getElementById("toast");
const dockLabels = document.getElementById("toggle-labels");
const dockOrbits = document.getElementById("toggle-orbits");
const dockMotion = document.getElementById("toggle-motion");
const dockShadows = document.getElementById("toggle-shadows");
const dockSpeed = document.getElementById("toggle-speed");
const speedPanel = document.getElementById("speed-panel");
const orbitSlider = document.getElementById("orbit-speed");
const spinSlider = document.getElementById("spin-speed");
const orbitValue = document.getElementById("orbit-speed-value");
const spinValue = document.getElementById("spin-speed-value");
const linkSpeeds = document.getElementById("link-speeds");
const speedReset = document.getElementById("speed-reset");
const zoomInButton = document.getElementById("zoom-in");
const zoomOutButton = document.getElementById("zoom-out");

const replayBar = document.getElementById("replay-bar");
const replayStep = document.getElementById("replay-step");
const replayToggle = document.getElementById("replay-toggle");
const replayProgress = document.getElementById("replay-progress");
const replayDate = document.getElementById("replay-date");
const replayCaption = document.getElementById("replay-caption");
const replayPause = document.getElementById("replay-pause");
const replayNext = document.getElementById("replay-next");
const replayVoice = document.getElementById("replay-voice");
const replaySite = document.getElementById("replay-site");
const replayStop = document.getElementById("replay-stop");
const replayStages = document.getElementById("replay-stages");
const relatedLabel = document.getElementById("related-label");
const relatedList = document.getElementById("related-hardware");
const explorerLink = document.getElementById("explorer-link-button");
const replayView = document.getElementById("replay-view");
const replayContinue = document.getElementById("replay-continue");

// Text shown in the panel for planets, the Moon and the Sun
const PLANET_NOTE =
  "Rounded values. AU = distance from Earth to the Sun. Moon counts change as new moons are found.";
const PLANET_SOURCES = [
  { label: "NASA Solar System Exploration", url: "https://science.nasa.gov/solar-system/" }
];

// ----- Small helpers -----
function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

let toastTimer = null;
function showToast(message) {
  toastBox.textContent = message;
  toastBox.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toastBox.classList.add("hidden"); }, 2600);
}

// ----- Texture settings -----
// Textures you download go in assets/textures (see the earlier instructions).
// If a file is missing, the planet keeps its generated pattern.
const TEXTURE_FOLDER = "assets/textures/";

const EARTH_TEXTURE_URL =
  "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/earth_atmos_2048.jpg";
const MOON_TEXTURE_URL =
  "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/moon_1024.jpg";

const textureLoader = new THREE.TextureLoader();

function applyTexture(material, url) {
  if (!url) return;
  textureLoader.load(
    url,
    function (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      material.map = texture;
      material.color.set(0xffffff);
      material.needsUpdate = true;
    },
    undefined,
    function () {
      console.warn("Texture not found: " + url + ". Using the generated pattern instead.");
    }
  );
}

function makeProceduralTexture(colorHex, style) {
  const drawing = document.createElement("canvas");
  drawing.width = 512;
  drawing.height = 256;
  const ctx = drawing.getContext("2d");

  ctx.fillStyle = "#" + new THREE.Color(colorHex).getHexString();
  ctx.fillRect(0, 0, 512, 256);

  if (style === "bands") {
    let y = 0;
    while (y < 256) {
      const bandHeight = 4 + Math.random() * 14;
      const shade = (Math.random() - 0.5) * 0.35;
      ctx.fillStyle =
        shade > 0 ? "rgba(255, 255, 255, " + shade + ")" : "rgba(0, 0, 0, " + -shade + ")";
      ctx.fillRect(0, y, 512, bandHeight);
      y += bandHeight;
    }
  } else {
    for (let i = 0; i < 350; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 256;
      const size = 3 + Math.random() * 22;
      ctx.fillStyle = Math.random() < 0.5 ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.09)";
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(drawing);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ----- Basic setup -----
// logarithmicDepthBuffer lets the camera get very close to the tiny launch craft without glitches
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
if (THREE.ACESFilmicToneMapping !== undefined) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // film-like highlights, so the Sun side does not burn out
  renderer.toneMappingExposure = 1.1;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02030a);

const camera = new THREE.PerspectiveCamera(45, 1, 0.02, 3000);
const START_CAMERA_POSITION = new THREE.Vector3(0, 55, 110);
camera.position.copy(START_CAMERA_POSITION);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 0.08;
controls.maxDistance = 300;

// ----- Lights -----
// The Sun's light makes the day side bright and the night side dark (the "shadow").
// The ambient light is a soft light from every direction.
// Space has almost no light from other directions, so the night sides stay dark (a little is kept so they can still be seen)
const ambientLight = new THREE.AmbientLight(0x8899bb, 0.12);
scene.add(ambientLight);
const sunLight = new THREE.PointLight(0xffffff, 4, 0, 0);
scene.add(sunLight);

// ----- Labels that float above bodies -----
const labelEntries = [];
let labelsOn = true;

// Label colors (match the page design: muted white text, orange for the selected object)
// (the highlight color comes from the chosen planet theme, see js/theme.js)
const LABEL_FONT = '500 22px "IBM Plex Mono", ui-monospace, Consolas, monospace';

function makeLabel(text, color) {
  const drawing = document.createElement("canvas");
  drawing.width = 320;
  drawing.height = 64;

  const texture = new THREE.CanvasTexture(drawing);
  texture.colorSpace = THREE.SRGBColorSpace;

  const label = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
  );
  label.renderOrder = 5;
  label.userData = { drawing: drawing, texture: texture, color: color || "#e8e6e1", text: text, highlight: false };

  setLabel(label, text);
  return label;
}

function setLabel(label, text) {
  label.userData.text = text;
  const shown = text.toUpperCase();
  const ctx = label.userData.drawing.getContext("2d");
  ctx.clearRect(0, 0, 320, 64);
  ctx.font = LABEL_FONT;
  ctx.letterSpacing = "2px"; // ignored by browsers that do not support it
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = label.userData.highlight ? accentCss() : label.userData.color;
  ctx.fillText(shown, 160, 32);
  label.userData.texture.needsUpdate = true;
}

// Turns a label orange (selected) or back to its normal color
function highlightLabel(label, on) {
  if (!label || label.userData.highlight === on) return;
  label.userData.highlight = on;
  setLabel(label, label.userData.text);
}

// The label font is downloaded from the web. When it arrives, redraw every label with it.
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(function () {
    labelEntries.forEach(function (entry) { setLabel(entry.label, entry.label.userData.text); });
  });
}

function addBodyLabel(parent, text, color, radius) {
  const label = makeLabel(text, color);
  parent.add(label);
  labelEntries.push({ label: label, parent: parent, radius: radius });
  return label;
}

// ----- The Sun -----
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(4, 48, 48),
  new THREE.MeshBasicMaterial({ color: 0xffc933 })
);
scene.add(sun);
applyTexture(sun.material, TEXTURE_FOLDER + "sun.jpg");

// The Sun's glow: bright at its edge, fading softly into space
const sunGlow = createGlow(4, { color: 0xff9a1f, strength: 1.3, size: 1.55, rim: 0.5 });
scene.add(sunGlow);
const sunLabel = addBodyLabel(sun, "Sun", "#ffb36b", 4);

// Everything the user can select or search for goes in this list.
// Each entry has: name, kind, group (what moves), hitArea (invisible click target), focus (camera distance).
const bodies = [];

const sunHitArea = new THREE.Mesh(
  new THREE.SphereGeometry(5.2, 16, 16),
  new THREE.MeshBasicMaterial({ visible: false })
);
sun.add(sunHitArea);
bodies.push({ name: "Sun", kind: "Star", group: sun, hitArea: sunHitArea, focus: 24, label: sunLabel, color: 0xffb36b });

// A soft glow texture, used to make planets shine a little
const glowTexture = (function () {
  const drawing = document.createElement("canvas");
  drawing.width = 64;
  drawing.height = 64;
  const ctx = drawing.getContext("2d");
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.25)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(drawing);
})();

// ----- Planet display settings -----
// size = display size, distance = distance from the Sun, orbitSpeed = how fast it circles.
// All three are simplified and NOT to scale. The real facts are in data/planets.js.
// The Moon has parentName: it circles Earth (orbitRadius) instead of the Sun.
const planetData = [
  { name: "Mercury", size: 0.7, distance: 10, color: 0xb5b5b5, orbitSpeed: 0.80,
    texture: TEXTURE_FOLDER + "mercury.jpg", style: "blotches" },
  { name: "Venus",   size: 1.0, distance: 14, color: 0xe6c07b, orbitSpeed: 0.60,
    texture: TEXTURE_FOLDER + "venus.jpg", style: "blotches" },
  { name: "Earth",   size: 1.1, distance: 19, color: 0x2f6fdb, orbitSpeed: 0.50,
    texture: EARTH_TEXTURE_URL, style: "blotches" },
  { name: "Mars",    size: 0.9, distance: 24, color: 0xc1440e, orbitSpeed: 0.40,
    texture: TEXTURE_FOLDER + "mars.jpg", style: "blotches" },
  { name: "Jupiter", size: 2.6, distance: 33, color: 0xd9a066, orbitSpeed: 0.25,
    texture: TEXTURE_FOLDER + "jupiter.jpg", style: "bands" },
  { name: "Saturn",  size: 2.2, distance: 43, color: 0xe3cf9a, orbitSpeed: 0.18, hasRing: true,
    texture: TEXTURE_FOLDER + "saturn.jpg", ringTexture: TEXTURE_FOLDER + "saturn_ring.png", style: "bands" },
  { name: "Uranus",  size: 1.6, distance: 52, color: 0x7fdbe0, orbitSpeed: 0.12,
    texture: TEXTURE_FOLDER + "uranus.jpg", style: "bands" },
  { name: "Neptune", size: 1.5, distance: 60, color: 0x3f54ba, orbitSpeed: 0.09,
    texture: TEXTURE_FOLDER + "neptune.jpg", style: "bands" },
  { name: "Moon",    size: 0.3, color: 0xaaaaaa, orbitSpeed: 1.8,
    parentName: "Earth", orbitRadius: 4, focus: 4,
    texture: MOON_TEXTURE_URL, style: "blotches" },
  // Titan circles Saturn outside its rings. No map picture: a drawn orange haze (illustrative).
  { name: "Titan",   size: 0.32, color: 0xd29a4a, orbitSpeed: 1.0,
    parentName: "Saturn", orbitRadius: 6, focus: 4,
    texture: null, style: "bands" }
];

const orbitLines = [];

function addOrbitLine(radius, colorHex, opacity) {
  const points = [];
  for (let i = 0; i <= 128; i++) {
    const angle = (i / 128) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  const line = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: opacity })
  );
  line.userData.baseColor = colorHex;
  line.userData.baseOpacity = opacity;
  scene.add(line);
  orbitLines.push(line);
  return line;
}

function makeRingGeometry(inner, outer) {
  const geometry = new THREE.RingGeometry(inner, outer, 64);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const point = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i);
    uv.setXY(i, (point.length() - inner) / (outer - inner), 0.5);
  }
  return geometry;
}

// Build every planet (and the Moon)
const planets = []; // bodies that move along orbits

planetData.forEach(function (data) {
  const isMoon = Boolean(data.parentName);

  const orbitLine = isMoon
    ? addOrbitLine(data.orbitRadius, 0xd9d6cf, 0.16)
    : addOrbitLine(data.distance, 0xd9d6cf, 0.2);

  const group = new THREE.Group();

  // Real texture maps (and Earth's normal and ocean-shine maps) from js/planet-look.js; the old painted pattern otherwise
  let material;
  if (PLANET_LOOKS[data.name]) {
    material = lookMaterial(data.name);
  } else {
    material = new THREE.MeshStandardMaterial({ color: 0xffffff, map: makeProceduralTexture(data.color, data.style), roughness: 0.9 });
    applyTexture(material, data.texture);
  }

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(data.size, 96, 64), material);
  group.add(mesh);

  // Earth: a cloud layer and a thin blue atmosphere at the edge; other worlds with air get a faint haze
  if (data.name === "Earth") {
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(data.size * 1.015, 96, 64), cloudMaterial());
    mesh.add(clouds);
  }
  if (PLANET_LOOKS[data.name] && PLANET_LOOKS[data.name].air) {
    group.add(createGlow(data.size, { color: PLANET_LOOKS[data.name].air, strength: data.name === "Earth" ? 0.9 : 0.5, size: 1.08 }));
  }

  const hitArea = new THREE.Mesh(
    new THREE.SphereGeometry(data.size * 1.8 + 0.6, 16, 16),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  group.add(hitArea);

  if (data.hasRing) {
    const ringMaterial = lookRingMaterial(); // lit by the Sun, with the Cassini Division

    const ring = new THREE.Mesh(makeRingGeometry(data.size * 1.4, data.size * 2.2), ringMaterial);
    ring.rotation.x = Math.PI / 2 - 0.45;
    group.add(ring);
  }

  scene.add(group);
  const label = addBodyLabel(group, data.name, isMoon ? "#a3a19b" : "#e8e6e1", data.size);

  // A faint glow in the planet's own color
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture, color: data.color, transparent: true, opacity: 0.14,
    depthWrite: false, blending: THREE.AdditiveBlending
  }));
  glow.scale.setScalar(data.size * 4.2);
  group.add(glow);

  const body = {
    name: data.name,
    kind: isMoon ? "Moon" : "Planet",
    data: data,
    size: data.size,
    group: group,
    mesh: mesh,
    hitArea: hitArea,
    angle: Math.random() * Math.PI * 2,
    parent: null,
    orbitLine: orbitLine,
    label: label,
    color: data.color,
    focus: data.focus || Math.max(data.size * 6, 10)
  };

  planets.push(body);
  bodies.push(body);
});

planets.forEach(function (planet) {
  if (planet.data.parentName) {
    planet.parent = planets.find(function (other) {
      return other.name === planet.data.parentName;
    });
  }
});

// ----- Spacecraft (illustrative positions and paths) -----
// path "outbound" = drifts away from the Sun in a straight line, then restarts.
// path "sun-orbit" = circles the Sun on an oval inside Venus's orbit.
const OUTBOUND_RESET_DISTANCE = 130;

const spacecraftData = [
  { name: "Voyager 1", model: "voyager", path: "outbound", startDistance: 72, speed: 0.25,
    direction: new THREE.Vector3(0.8, 0.5, -0.35).normalize(),
    scale: 0.7, hitRadius: 2.6, focus: 9 },
  { name: "Voyager 2", model: "voyager", path: "outbound", startDistance: 78, speed: 0.22,
    direction: new THREE.Vector3(-0.55, -0.6, 0.55).normalize(),
    scale: 0.7, hitRadius: 2.6, focus: 9 },
  { name: "Parker Solar Probe", model: "parker", path: "sun-orbit",
    scale: 0.4, hitRadius: 1.5, focus: 4.5 }
];

// Oval path for the Sun-orbiting probe. The Sun sits at one focus of the oval.
const OVAL_A = 9;
const OVAL_C = 3;
const OVAL_B = Math.sqrt(OVAL_A * OVAL_A - OVAL_C * OVAL_C);

function ovalPoint(angle) {
  return new THREE.Vector3(Math.cos(angle) * OVAL_A - OVAL_C, 0, Math.sin(angle) * OVAL_B);
}

const spacecraft = [];

spacecraftData.forEach(function (data) {
  const holder = new THREE.Group();   // moved around, never rotated
  const model = createModel(data.model);
  model.scale.setScalar(data.scale);
  holder.add(model);                  // rotated to face the Sun

  const label = addBodyLabel(holder, data.name, "#f0c7a2", 1);

  const hitArea = new THREE.Mesh(
    new THREE.SphereGeometry(data.hitRadius, 12, 12),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  holder.add(hitArea);

  scene.add(holder);

  const craft = {
    data: data, holder: holder, model: model, label: label,
    distance: data.startDistance || 0, angle: 0, radius: 6
  };
  spacecraft.push(craft);

  bodies.push({
    name: data.name, kind: "Spacecraft", craft: craft,
    group: holder, hitArea: hitArea, focus: data.focus, label: label, color: 0xf0c7a2
  });

  if (data.path === "sun-orbit") {
    const points = [];
    for (let i = 0; i <= 128; i++) {
      points.push(ovalPoint((i / 128) * Math.PI * 2));
    }
    const line = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: accentNumber(), transparent: true, opacity: 0.22 })
    );
    line.userData.themed = true; // takes the theme color
    // (No path line is drawn for spacecraft: only the craft itself is shown)
    void line;
    holder.position.copy(ovalPoint(0));
  }
});

// ----- The craft used for hardware mission replays (Apollo 11, Curiosity, Perseverance) -----
// It holds one model at a time. The models are made when first needed.
const hardwareHolder = new THREE.Group();
const hardwareLabel = makeLabel("Mission", "#9fe3ff");
hardwareHolder.add(hardwareLabel);
hardwareHolder.visible = false;
scene.add(hardwareHolder);

const hardwareModels = {};

function getHardwareModel(name) {
  if (!hardwareModels[name]) {
    const model = createModel(name);
    model.visible = false;
    hardwareHolder.add(model);
    hardwareModels[name] = model;
  }
  return hardwareModels[name];
}

// ----- The launch vehicle shown when anything launches from Earth in a replay -----
const LAUNCHER_SCALE = 0.04;
const launcherWrapper = new THREE.Group();
const launcherModel = createLauncher(); // nose on +Y
launcherModel.rotation.x = Math.PI / 2; // nose on +Z
launcherWrapper.add(launcherModel);
launcherWrapper.scale.setScalar(LAUNCHER_SCALE);
launcherWrapper.visible = false;
scene.add(launcherWrapper);

// ----- Smoke and fire -----
const particles = createParticleSystem(scene, 260);

// ----- Stars -----
const STAR_COUNT = 3000;
const starPositions = new Float32Array(STAR_COUNT * 3);

for (let i = 0; i < STAR_COUNT; i++) {
  const direction = new THREE.Vector3(
    Math.random() - 0.5,
    Math.random() - 0.5,
    Math.random() - 0.5
  ).normalize();
  const distance = 600 + Math.random() * 300;

  starPositions[i * 3]     = direction.x * distance;
  starPositions[i * 3 + 1] = direction.y * distance;
  starPositions[i * 3 + 2] = direction.z * distance;
}

const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
scene.add(
  new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({ color: 0xd9dce4, size: 1.2, sizeAttenuation: false, transparent: true, opacity: 0.8 })
  )
);

// ----- View options (labels, orbit lines, pause motion) -----
let motionPaused = false;

// Dock buttons are an icon plus a short label; the tooltip says what they do
function setDockLabel(button, label, tip) {
  const span = button.querySelector ? button.querySelector(".dock-label") : null;
  if (span) span.textContent = label;
  else button.textContent = label;
  if (tip) button.title = tip;
}

function setDockButton(button, active) {
  button.classList.toggle("active", active);
  button.setAttribute("aria-pressed", String(active));
  play(active ? "toggleOn" : "toggleOff");
}

function toggleLabels() {
  labelsOn = !labelsOn;
  setDockButton(dockLabels, labelsOn);
  showToast(labelsOn ? "Labels on" : "Labels off");
}

function toggleOrbits() {
  const visible = !orbitLines[0].visible;
  orbitLines.forEach(function (line) { line.visible = visible; });
  setDockButton(dockOrbits, visible);
  showToast(visible ? "Orbit lines on" : "Orbit lines off");
}

function toggleMotion() {
  motionPaused = !motionPaused;
  setDockButton(dockMotion, motionPaused);
  setDockLabel(dockMotion, motionPaused ? "Resume" : "Pause", motionPaused ? "Resume motion (Space)" : "Pause motion (Space)");
  showToast(motionPaused ? "Motion paused" : "Motion resumed");
}

dockLabels.addEventListener("click", toggleLabels);
dockOrbits.addEventListener("click", toggleOrbits);
dockMotion.addEventListener("click", toggleMotion);

// Shadows on: night sides are dark. Shadows off: every side is lit evenly.
let shadowsOn = true;

function toggleShadows() {
  shadowsOn = !shadowsOn;
  ambientLight.intensity = shadowsOn ? 0.12 : 1.6;
  sunLight.intensity = shadowsOn ? 4 : 1.2;
  setDockButton(dockShadows, shadowsOn);
  showToast(shadowsOn ? "Shadows on: night sides are dark" : "Shadows off: planets fully lit");
}

dockShadows.addEventListener("click", toggleShadows);

// ----- Speed: how fast bodies go around their orbits, and how fast they spin -----
// 1 = normal, 2 = twice as fast, 0 = stopped. When "Link" is ticked, both sliders move together.
let orbitSpeed = 1;
let spinSpeed = 1;

function formatSpeed(value) {
  return Math.round(value * 100) / 100 + "x";
}

function setSpeeds(newOrbit, newSpin) {
  orbitSpeed = newOrbit;
  spinSpeed = newSpin;

  orbitSlider.value = String(newOrbit);
  spinSlider.value = String(newSpin);
  orbitValue.textContent = formatSpeed(newOrbit);
  spinValue.textContent = formatSpeed(newSpin);

  setDockLabel(dockSpeed,
    newOrbit === newSpin ? formatSpeed(newOrbit) : formatSpeed(newOrbit) + " / " + formatSpeed(newSpin),
    "Orbit and spin speed: " + formatSpeed(newOrbit) + " / " + formatSpeed(newSpin));
}

orbitSlider.addEventListener("input", function () {
  const value = Number(orbitSlider.value);
  setSpeeds(value, linkSpeeds.checked ? value : spinSpeed);
});

spinSlider.addEventListener("input", function () {
  const value = Number(spinSlider.value);
  setSpeeds(linkSpeeds.checked ? value : orbitSpeed, value);
});

// Ticking "Link" makes the spin match the orbit speed right away
linkSpeeds.addEventListener("change", function () {
  play(linkSpeeds.checked ? "toggleOn" : "toggleOff");
  if (linkSpeeds.checked) setSpeeds(orbitSpeed, orbitSpeed);
});

// A tick for each step of a speed slider
[orbitSlider, spinSlider].forEach(function (slider) {
  slider.addEventListener("input", function () { play("tick"); });
});

speedReset.addEventListener("click", function () {
  setSpeeds(1, 1);
});

function closeSpeedPanel() {
  if (!speedPanel.classList.contains("hidden")) play("close");
  speedPanel.classList.add("hidden");
  dockSpeed.classList.remove("active");
  dockSpeed.setAttribute("aria-expanded", "false");
}

dockSpeed.addEventListener("click", function () {
  const opening = speedPanel.classList.contains("hidden");
  play(opening ? "open" : "close");
  speedPanel.classList.toggle("hidden", !opening);
  dockSpeed.classList.toggle("active", opening);
  dockSpeed.setAttribute("aria-expanded", String(opening));
});

// Clicking anywhere else closes the speed panel
document.addEventListener("pointerdown", function (event) {
  if (speedPanel.classList.contains("hidden")) return;
  if (speedPanel.contains(event.target) || dockSpeed.contains(event.target)) return;
  closeSpeedPanel();
});

// ----- Selection logic -----
// Selecting something moves the camera to it, opens its panel,
// and turns its label, its orbit line and its row in the sidebar orange.
let selectedBody = null;
let isZooming = false;
let focusDistance = 12;

// The Solar System tab is underlined already, so the path starts below it
function breadcrumbFor(body) {
  if (body.kind === "Spacecraft") return "Spacecraft › " + body.name;
  if (body.data && body.data.parentName) {
    return body.data.parentName + " › " + body.name;
  }
  return body.name;
}

function selectBody(body) {
  if (replay) stopReplay(false);

  setHighlight(selectedBody, false);
  if (selectedBody !== body) play("select");
  selectedBody = body;
  setHighlight(body, true);
  focusDistance = body.focus;
  isZooming = true;

  breadcrumb.textContent = breadcrumbFor(body);
  showInfoPanel(body);
}

function deselectBody() {
  stopReplay(false);
  setHighlight(selectedBody, false);
  selectedBody = null;
  isZooming = false;
  infoPanel.classList.add("hidden");
  breadcrumb.textContent = "";
  updateSidebarActive();
}

function setHighlight(body, on) {
  if (!body) return;
  highlightLabel(body.label, on);
  const line = body.orbitLine;
  if (line) {
    line.material.color.set(on ? accentNumber() : line.userData.baseColor);
    line.material.opacity = on ? 0.6 : line.userData.baseOpacity;
  }
  updateSidebarActive();
}

// ----- Left sidebar: every star, planet, moon and spacecraft -----
const sidebarRows = [];

// Short technical detail on the right of each row
function sidebarMeta(body) {
  if (body.kind === "Spacecraft") {
    const launch = (spacecraftInfo[body.name].facts.find(function (f) { return f[0] === "Launch"; }) || [])[1] || "";
    const year = launch.match(/\d{4}/);
    return year ? year[0] : "";
  }
  if (body.kind === "Moon") return body.data.parentName.toUpperCase();
  if (body.kind === "Star") return "G-TYPE";
  const fact = planetInfo[body.name].facts.find(function (f) { return f[0] === "Distance from Sun"; });
  return fact ? fact[1].replace("about ", "") : "";
}

function buildSidebar() {
  // Navigation only, in four groups: Star, Planets, Moons, Spacecraft.
  // Everything ABOUT a world is in the panel on the right, not here.
  const groups = [
    { title: "Star", kinds: ["Star"] },
    { title: "Planets", kinds: ["Planet"] },
    { title: "Moons", kinds: ["Moon"] },
    { title: "Spacecraft", kinds: ["Spacecraft"] }
  ];
  sidebarList.innerHTML = "";

  groups.forEach(function (group) {
    const heading = document.createElement("p");
    heading.className = "sidebar-heading";
    heading.textContent = group.title;
    sidebarList.appendChild(heading);
    bodies
      .filter(function (body) { return group.kinds.indexOf(body.kind) !== -1; })
      .forEach(function (body) {
        const row = document.createElement("button");
        row.className = "sidebar-item" + (body.kind === "Spacecraft" ? " sb-craft" : "");
        row.setAttribute("aria-label", body.name + ", " + body.kind);
        row.innerHTML = '<span class="sb-dot"></span><span class="sb-name"></span><span class="sb-meta"></span>';
        if (row.querySelector) {
          row.querySelector(".sb-name").textContent = body.name;
          row.querySelector(".sb-meta").textContent = sidebarMeta(body);
          row.querySelector(".sb-dot").style.setProperty("--dot", "#" + new THREE.Color(body.color || 0xd9d6cf).getHexString());
        }
        row.addEventListener("click", function () {
          if (replay) return; // use Stop Replay first
          selectBody(body);
          sidebar.classList.remove("open"); // on phones, close the list after choosing
        });
        sidebarList.appendChild(row);
        sidebarRows.push({ body: body, row: row });
      });
  });
}

function updateSidebarActive() {
  // The moons of a planet open up under it while that planet (or one of its moons) is selected
  const family = selectedBody ? (selectedBody.kind === "Moon" ? selectedBody.data.parentName : selectedBody.name) : "";
  sidebarRows.forEach(function (entry) {
    const active = entry.body === selectedBody;
    entry.row.classList.toggle("active", active);
    entry.row.setAttribute("aria-current", active ? "true" : "false");
    entry.row.classList.toggle("sb-family", !active && entry.body.name === family);
  });
}

buildSidebar();

// When the theme changes: recolor the selected label and orbit, and Parker's path
onThemeChange(function () {
  if (selectedBody) {
    if (selectedBody.label) setLabel(selectedBody.label, selectedBody.label.userData.text);
    if (selectedBody.orbitLine) selectedBody.orbitLine.material.color.set(accentNumber());
  }
  orbitLines.forEach(function (line) {
    if (line.userData.themed) line.material.color.set(accentNumber());
  });
});

function resetView() {
  play("whoosh");
  deselectBody();
  camera.position.copy(START_CAMERA_POSITION);
  controls.target.set(0, 0, 0);
}

function fillList(listElement, rows, makeRow) {
  listElement.innerHTML = "";
  rows.forEach(function (row) {
    listElement.appendChild(makeRow(row));
  });
}

// ----- The panel about the selected world: Overview, Data, Moons, Missions -----
const paneTabs = infoPanel.querySelectorAll ? Array.from(infoPanel.querySelectorAll(".bp-tab")) : [];
const panes = infoPanel.querySelectorAll ? Array.from(infoPanel.querySelectorAll(".bp-pane")) : [];
const moonList = document.getElementById("planet-moons");
let activePane = "overview";

function showPane(name) {
  activePane = name;
  paneTabs.forEach(function (tab) {
    const on = tab.dataset.pane === name;
    tab.classList.toggle("active", on);
    tab.setAttribute("aria-selected", String(on));
  });
  panes.forEach(function (pane) { pane.classList.toggle("hidden", pane.dataset.pane !== name); });
}
paneTabs.forEach(function (tab) {
  tab.addEventListener("click", function () { play("tick"); showPane(tab.dataset.pane); });
});

function fillMoons(body) {
  moonList.innerHTML = "";
  const moons = bodies.filter(function (other) { return other.kind === "Moon" && other.data.parentName === body.name; });
  const parent = body.kind === "Moon" ? bodies.find(function (other) { return other.name === body.data.parentName; }) : null;
  const rows = parent ? [parent] : moons;
  rows.forEach(function (other) {
    const button = document.createElement("button");
    button.className = "bp-moon";
    button.innerHTML = '<span class="sb-dot"></span><span class="bp-moon-name"></span><span class="bp-moon-meta"></span>';
    if (button.querySelector) {
      button.querySelector(".sb-dot").style.setProperty("--dot", "#" + new THREE.Color(other.color || 0xd9d6cf).getHexString());
      button.querySelector(".bp-moon-name").textContent = other.name;
      button.querySelector(".bp-moon-meta").textContent = parent ? "the planet it orbits" : "moon \u00B7 fly there";
    }
    button.addEventListener("click", function () { if (!replay) selectBody(other); });
    moonList.appendChild(button);
  });
  if (moons.length) {
    const note = document.createElement("p");
    note.className = "bp-empty";
    note.textContent = "Only the moons modelled in this view are listed.";
    moonList.appendChild(note);
  }
  if (!rows.length) {
    const none = document.createElement("p");
    none.className = "bp-empty";
    none.textContent = body.kind === "Spacecraft" ? "" : body.name + " has no moons in this model" + (body.name === "Mercury" || body.name === "Venus" ? " (and none in reality)." : ".");
    moonList.appendChild(none);
  }
  // Tab label: "Moons" for planets, "Parent" for a moon; hidden for the Sun and spacecraft
  const tab = paneTabs.find(function (t) { return t.dataset.pane === "moons"; });
  if (tab) {
    tab.textContent = parent ? "Orbits" : "Moons";
    tab.classList.toggle("hidden", body.kind === "Spacecraft" || body.kind === "Star");
  }
}

function showInfoPanel(body) {
  const isCraft = body.kind === "Spacecraft";
  const info = isCraft ? spacecraftInfo[body.name] : planetInfo[body.name];

  panelName.textContent = body.name;
  panelKind.textContent = body.kind;
  panelSummary.textContent = info.summary;

  fillList(panelFacts, info.facts, function (fact) {
    const item = document.createElement("li");
    const label = document.createElement("strong");
    label.textContent = fact[0]; // shown as a small caption above the value
    item.appendChild(label);
    item.appendChild(document.createTextNode(fact[1]));
    return item;
  });

  panelNote.textContent = isCraft ? info.note : PLANET_NOTE;

  fillList(panelSources, isCraft ? info.sources : info.sources || PLANET_SOURCES, function (source) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = source.label;
    item.appendChild(link);
    return item;
  });

  exploreMessage.textContent = "";
  showRelatedHardware(body);
  fillMoons(body);
  if (activePane === "moons" && (isCraft || body.kind === "Star")) activePane = "overview";
  showPane(activePane);

  if (isCraft) {
    exploreButton.classList.add("hidden");
    replayButton.classList.remove("hidden");
  } else {
    replayButton.classList.add("hidden");
    exploreButton.classList.remove("hidden");

    if (info.explore) {
      exploreButton.textContent = info.explore;
      exploreButton.disabled = false;
    } else {
      exploreButton.textContent = "Exploration not available yet";
      exploreButton.disabled = true;
      exploreMessage.textContent = info.exploreNote || "Exploration is not available here yet.";
    }
  }

  infoPanel.classList.remove("hidden");
}

// "Related hardware": catalog items linked to this body, each opens its page in the Hardware Explorer
function showRelatedHardware(body) {
  const items = itemsForBody(body.name).filter(function (item) {
    return item.category !== "rockets" || body.kind === "Spacecraft";
  });
  relatedList.innerHTML = "";
  relatedLabel.classList.toggle("hidden", items.length === 0);
  relatedList.classList.toggle("hidden", items.length === 0);
  explorerLink.dataset.body = body.name;

  const missionsTab = paneTabs.find(function (t) { return t.dataset.pane === "missions"; });
  if (missionsTab) missionsTab.textContent = "Missions" + (items.length ? " \u00B7 " + items.length : "");
  items.slice(0, 10).forEach(function (item) {
    const chip = document.createElement("button");
    chip.className = "related-chip";
    chip.textContent = item.name;
    const category = CATEGORIES.find(function (c) { return c.id === item.category; });
    chip.title = (category ? category.name + " \u00B7 " : "") + (item.launchDate || "");
    chip.addEventListener("click", function () {
      document.dispatchEvent(new CustomEvent("open-explorer", { detail: { itemId: item.id } }));
    });
    relatedList.appendChild(chip);
  });
  if (items.length > 10) {
    const more = document.createElement("span");
    more.className = "related-more";
    more.textContent = "+" + (items.length - 10) + " more in Missions";
    relatedList.appendChild(more);
  }
}

explorerLink.addEventListener("click", function () {
  document.dispatchEvent(new CustomEvent("open-explorer", { detail: { body: explorerLink.dataset.body || "" } }));
});

exploreButton.addEventListener("click", function () {
  if (!selectedBody) return;

  const destination = selectedBody.name === "Earth" ? "Moon" : selectedBody.name;

  document.dispatchEvent(
    new CustomEvent("explore-destination", { detail: { destination: destination } })
  );
});

panelClose.addEventListener("click", deselectBody);
resetButton.addEventListener("click", resetView);

// ----- Voice narration (the browser's built-in text-to-speech) -----
let narrationOn = isSoundOn() && isGroupOn("voice"); // follows Sound on/off and the "Voice" group in Settings
// (Voice choice, natural pacing and spoken-style text live in js/narrator.js)
function updateVoiceButton() {
  if (!speechSupported) {
    replayVoice.textContent = "Narration unavailable";
    replayVoice.disabled = true;
    return;
  }
  replayVoice.textContent = narrationOn ? "Narration: On" : "Narration: Off";
}
updateVoiceButton();

window.addEventListener("beforeunload", stopSpeaking);

// ----- Mission replay (simplified and illustrative) -----
// One replay engine plays two kinds of missions:
//   - a spacecraft in the solar system (Voyager 1, Voyager 2, Parker Solar Probe)
//   - a hardware mission to the Moon or Mars (Apollo 11, Curiosity, Perseverance)
const REPLAY_TRAVEL_SECONDS = 6;           // time to fly between two events
const REPLAY_HOLD_SECONDS = 7;             // time at each event when narration is off
const AFTER_NARRATION_SECONDS = 2.5;       // a short pause after the voice finishes
const REPLAY_OUTBOUND_DISTANCE = 95;       // where "outbound" events are placed
const LAUNCH_GAP = 2.2;                    // default height above Earth where the launch ends
const MAX_REPLAY_SPACECRAFT_SCALE = 0.22;  // Voyager and Parker are never drawn bigger than this in a replay
let replay = null;                         // null when no replay is running
const REPLAY_VIEWS = [{ name: "Chase", scale: 1 }, { name: "Wide", scale: 4 }, { name: "System", scale: 18 }];
let replayViewIndex = 0;                   // the camera perspective chosen with the View button
let captionsHidden = false;                // the user's choice to hide the caption box

const ASTEROID_BELT_DISTANCE = 28.5;      // between Mars and Jupiter in this view
const MINI_BODY_SIZE = 0.14;               // asteroids and comets are drawn much bigger than they are

// Where a "deep" body sits: event.radius from the Sun, turned event.angle from Earth's direction
function deepBodyCenter(event) {
  const earth = planets.find(function (item) { return item.name === "Earth"; });
  const direction = earth.group.position.clone().setY(0).normalize();
  direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), event.angle || 0);
  return direction.multiplyScalar(event.radius || 22);
}

// Where in the 3D scene an event happens
function replayTargetPosition(event, outboundDirection) {
  if (event.target === "outbound") {
    return outboundDirection.clone().multiplyScalar(REPLAY_OUTBOUND_DISTANCE * (event.far || 1));
  }
  if (event.target === "belt") {
    return outboundDirection.clone().multiplyScalar(ASTEROID_BELT_DISTANCE);
  }
  if (event.target === "deep") {
    // A small body that the solar system view does not show (an asteroid or a comet)
    const center = deepBodyCenter(event);
    const out = center.clone().setY(0).normalize();
    return center.add(out.multiplyScalar(MINI_BODY_SIZE + (event.gap === undefined ? 0.3 : event.gap)));
  }
  if (event.target === "oval") {
    return ovalPoint(event.ovalAngle);
  }

  // A planet or the Moon: a spot just outside it, on the side facing away from the Sun.
  // "around" turns that spot around the body, and "gap" sets the height above its surface.
  const planet = planets.find(function (item) { return item.name === event.target; });
  const position = planet.group.position.clone();
  const away = position.clone().setY(0).normalize();

  if (event.around) {
    away.applyAxisAngle(new THREE.Vector3(0, 1, 0), event.around);
  }

  let gap = event.isLaunch ? LAUNCH_GAP : 1.8;
  if (event.gap !== undefined) gap = event.gap;

  return position.add(away.multiplyScalar(planet.size + gap));
}

function segmentPassesTooCloseToSun(a, b, minDistance) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSquared = dx * dx + dz * dz;
  let t = lengthSquared === 0 ? 0 : -(a.x * dx + a.z * dz) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(a.x + dx * t, a.z + dz * t) < minDistance;
}

// Builds a list of points to fly through. If a straight line would cross the Sun,
// an extra point is added to curve around it.
function buildReplayPath(events, outboundDirection) {
  const points = [];
  const stopIndexes = [];

  events.forEach(function (event, i) {
    const target = replayTargetPosition(event, outboundDirection);

    if (i > 0) {
      const nearSun = event.target === "oval" || events[i - 1].target === "oval";
      const previous = points[points.length - 1];

      if (!nearSun && segmentPassesTooCloseToSun(previous, target, 8)) {
        const direction = target.clone().sub(previous);
        direction.y = 0;
        const sideways = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
        const middle = previous.clone().add(target).multiplyScalar(0.5);
        if (middle.dot(sideways) < 0) sideways.negate();
        points.push(middle.add(sideways.multiplyScalar(14)));
      }
    }

    stopIndexes.push(points.length);
    points.push(target);
  });

  return { points: points, stopIndexes: stopIndexes };
}

// Shows or hides the caption text (the thin bar with buttons always stays)
function applyCaptionsState() {
  replayBar.classList.toggle("collapsed", captionsHidden);
  replayToggle.textContent = captionsHidden ? "Show captions" : "Hide captions";
  replayToggle.setAttribute("aria-expanded", String(!captionsHidden));
}

// One small bar segment for each event, so you can see how far the replay has gone
function buildReplayProgress(events) {
  replayProgress.innerHTML = "";
  events.forEach(function (event) {
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.title = event.title;
    replayProgress.appendChild(dot);
  });
}

function updateReplayProgress(allDone) {
  Array.from(replayProgress.children).forEach(function (dot, i) {
    dot.classList.toggle("done", allDone || i < replay.eventIndex);
    dot.classList.toggle("current", !allDone && i === replay.eventIndex);
  });
  updateStageChips(allDone);
}

// ----- Mission stages (A Launch, B Journey, C Landing/Deployment, D Return, E Completion) -----
// Only the stages a mission really had are shown. E (the final status) is always last.
const STAGE_ORDER = ["A", "B", "C", "D", "E"];

function stageOf(index) {
  const event = replay.events[index];
  return (event && event.stage) || (replay.stageTags && replay.stageTags[index]) || null;
}

function actionOf(index) {
  const event = replay.events[index];
  return (event && event.action) || (replay.actions && replay.actions[index]) || null;
}

function buildStageChips() {
  replayStages.innerHTML = "";
  const present = {};
  replay.events.forEach(function (event, i) {
    const stage = stageOf(i);
    if (stage) present[stage] = true;
  });
  present.E = true;
  replay.stageList = STAGE_ORDER.filter(function (letter) { return present[letter]; });

  replay.stageList.forEach(function (letter) {
    const chip = document.createElement("span");
    chip.className = "stage-chip";
    chip.dataset.stage = letter;
    chip.title = "Stage " + letter + ": " + STAGES[letter].name;
    chip.innerHTML = "<b></b><span></span>";
    if (chip.querySelector) {
      chip.querySelector("b").textContent = letter;
      chip.querySelector("span").textContent = STAGES[letter].name;
    } else {
      chip.textContent = letter + " " + STAGES[letter].name;
    }
    replayStages.appendChild(chip);
  });
}

function updateStageChips(allDone) {
  if (!replay.stageList) return;
  const current = allDone ? "E" : stageOf(replay.eventIndex);
  const currentRank = STAGE_ORDER.indexOf(current);
  Array.from(replayStages.children).forEach(function (chip) {
    const rank = STAGE_ORDER.indexOf(chip.dataset.stage);
    chip.classList.toggle("current", chip.dataset.stage === current);
    chip.classList.toggle("done", currentRank !== -1 && rank < currentRank);
  });
}

// Where the camera goes during a launch: close beside the launch spot, so Earth does not hide the vehicle
function launchCameraGoal(zoom) {
  const launch = replay.launch;
  const side = new THREE.Vector3(-launch.away.z, 0, launch.away.x);
  const distance = Math.min(zoom || 1.4, 3.2);

  return launch.start.clone()
    .add(launch.away.clone().multiplyScalar(0.3))
    .add(side.multiplyScalar(distance))
    .add(new THREE.Vector3(0, 0.2, 0));
}

// Starts reading the current event's story aloud (if narration is on)
function startNarration() {
  const event = replay.events[replay.eventIndex];
  const text = event.narration;
  const estimatedSeconds = text ? text.split(/\s+/).length / 2.3 : 0;

  replay.narrationElapsed = 0;
  replay.narrationLimit = estimatedSeconds * 1.8 + 10; // safety: stop waiting if the voice never ends
  replay.ascentSeconds = Math.min(18, Math.max(10, estimatedSeconds * 0.45)); // how long the launch rise takes

  if (speechSupported && narrationOn && text) {
    replay.narrating = true;
    replay.hold = AFTER_NARRATION_SECONDS;

    const thisReplay = replay;
    const thisEvent = replay.eventIndex;
    speak(text, function () {
      if (replay === thisReplay && replay.eventIndex === thisEvent) {
        replay.narrating = false;
      }
    });
  } else {
    stopSpeaking();
    replay.narrating = false;
    replay.hold = REPLAY_HOLD_SECONDS;
  }
}

// Switches the hardware replay to the 3D model for the current event
function selectReplayModel() {
  if (!replay.isHardware) return;

  const name = replay.modelNames[replay.eventIndex];
  if (!name) return;

  if (replay.model) replay.model.visible = false;
  replay.model = getHardwareModel(name);
  replay.modelName = name;
}

function showReplayEvent() {
  const event = replay.events[replay.eventIndex];

  const stage = stageOf(replay.eventIndex);
  replayStep.textContent =
    (stage ? "Stage " + stage + " \u00B7 " + STAGES[stage].name + " \u00B7 " : "") +
    "Event " + (replay.eventIndex + 1) + "/" + replay.events.length + " \u00B7 " + event.title;
  replayDate.textContent = event.date;
  replayCaption.textContent = event.caption;
  play("event");
  updateReplayProgress(false);

  selectReplayModel();
  startEventEffects();

  const zoom = replay.zooms[replay.eventIndex];
  replay.cameraGoal = null;

  if (event.isLaunch && replay.launch) {
    isZooming = false;
    replay.cameraGoal = launchCameraGoal(zoom);
  } else {
    focusDistance = (zoom || 16) * REPLAY_VIEWS[replayViewIndex].scale;
    isZooming = true;
  }

  startNarration();
  document.dispatchEvent(new CustomEvent("replay-event", {
    detail: { stage: stage, title: event.title, index: replay.eventIndex, total: replay.events.length, label: replay.label ? replay.label.userData.text : "" }
  }));
}

// Starts any replay. options: events, holder, model, modelNames, label, direction, baseScale, restoreScale,
// visuals, isHardware, item, restart
function beginReplay(options) {
  stopSpeaking();
  particles.clear();

  const path = buildReplayPath(options.events, options.direction);
  const visuals = options.visuals || {};

  // For a launch, the vehicle rises from Earth's surface to the first point of the path
  let launch = null;
  if (options.events[0].isLaunch) {
    const earth = planets.find(function (item) { return item.name === options.events[0].target; });
    const away = earth.group.position.clone().setY(0).normalize();
    launch = {
      away: away,
      start: earth.group.position.clone().add(away.clone().multiplyScalar(earth.size + 0.01)),
      end: path.points[0].clone()
    };
  }

  // The size of the craft and the camera distance at each event
  const scales = options.events.map(function (event, i) {
    if (visuals.scales && visuals.scales[i] !== undefined) return visuals.scales[i];
    if (event.scale !== undefined) return event.scale;
    return options.baseScale;
  });
  const zooms = options.events.map(function (event, i) {
    if (visuals.zooms && visuals.zooms[i] !== undefined) return visuals.zooms[i];
    return event.zoom;
  });

  replay = {
    holder: options.holder,
    model: options.model,
    modelName: options.modelNames ? options.modelNames[0] : null,
    modelNames: options.modelNames || null,
    label: options.label,
    restoreScale: options.restoreScale,
    isHardware: Boolean(options.isHardware),
    item: options.item || null,
    restart: options.restart,
    events: options.events,
    scales: scales,
    zooms: zooms,
    curve: new THREE.CatmullRomCurve3(path.points, false, "catmullrom", 0.5),
    stops: path.stopIndexes.map(function (index) { return index / (path.points.length - 1); }),
    launch: launch,
    ascent: 0,            // 0 to 1: how far the launch has risen
    ascentSeconds: 12,
    groundCarry: 0,       // leftovers for the smoke and fire emitters
    fireCarry: 0,
    trailCarry: 0,
    eventIndex: 0,
    t: 0,
    phase: "holding",     // "holding" (showing a caption), "moving", or "done"
    hold: REPLAY_HOLD_SECONDS,
    narrating: false,
    narrationElapsed: 0,
    narrationLimit: 0,
    cameraGoal: null,
    paused: false,
    stageTags: options.stageTags || null,
    travelSeconds: options.travelSeconds || REPLAY_TRAVEL_SECONDS,
    source: options.source || null,
    actions: options.actions || null,
    outcome: options.outcome || null,
    deployFrom: [],
    deployTo: [],
    deployClock: 0,
    effectClock: 0,
    extras: [],           // small bodies, the orbit ring and the splash ring, removed when the replay stops
    orbitRing: null,
    splash: null,
    // A close-up scene played in the middle of the replay: the landing, and the splashdown for crews coming home
    landingHardware: options.landingHardware !== undefined ? options.landingHardware : (options.item && options.item.landing ? options.item.id : null),
    landingIndex: -1,
    scenesPlayed: {}
  };
  if (replay.landingHardware) {
    replay.landingIndex = options.landingIndex !== undefined ? options.landingIndex
      : options.events.findIndex(function (event) { return /landing|entry, descent|enters|plunge/i.test(event.title); });
  }
  planDeployment(options.events);
  buildTrail(path.points);
  addMiniBodies(options.events, options.direction);
  buildStageChips();

  infoPanel.classList.add("hidden");
  replayBar.classList.remove("hidden");
  replayContinue.classList.add("hidden");
  solarScreen.classList.add("replaying");
  replaySite.classList.toggle("hidden", !(replay.isHardware && replay.item));
  replayPause.textContent = "Pause";
  buildReplayProgress(options.events);
  applyCaptionsState();

  replay.holder.position.copy(launch ? launch.start : replay.curve.getPoint(0));
  showReplayEvent();
}

// Asks main.js to play the liftoff scene first. main.js then calls startSpacecraftReplayByName.
function requestSpacecraftReplay(body) {
  const info = spacecraftInfo[body.name];
  if (!info || !info.replay) return;

  const launch = info.replay[0];
  document.dispatchEvent(
    new CustomEvent("replay-spacecraft", {
      detail: {
        name: body.name,
        caption: body.name + " · " + launch.title + " · " + launch.date,
        rocket: launch.rocket
      }
    })
  );
}

// Replay for a spacecraft in the solar system (the craft must already be selected)
function startSpacecraftReplay(body) {
  const info = spacecraftInfo[body.name];
  if (!info || !info.replay) return;

  beginReplay({
    events: info.replay,
    holder: body.craft.holder,
    model: body.craft.model,
    label: body.craft.label,
    direction: body.craft.data.direction,
    baseScale: Math.min(body.craft.data.scale, MAX_REPLAY_SPACECRAFT_SCALE),
    restoreScale: body.craft.data.scale,
    isHardware: false,
    stageTags: STAGE_TAGS[body.name],
    outcome: spacecraftOutcome(body.name, info),
    restart: function () { requestSpacecraftReplay(body); }
  });

  // The liftoff scene already showed the launch, so start with the craft above Earth
  finishLaunch();
}

// The Hardware Explorer's "Show in Solar System" button: select a planet, moon or spacecraft by name
export function focusBodyByName(name) {
  const body = bodies.find(function (item) { return item.name === name; });
  if (body) selectBody(body);
}

// main.js calls this after the liftoff scene
export function startSpacecraftReplayByName(name) {
  const body = bodies.find(function (item) { return item.kind === "Spacecraft" && item.name === name; });
  if (!body) return;

  selectBody(body); // the camera follows this craft
  startSpacecraftReplay(body);
}

// Replay for Moon and Mars hardware. main.js calls this when "Replay Mission" is clicked.
export function startHardwareReplay(id) {
  const item = hardwareList.find(function (entry) { return entry.id === id; });
  const data = hardwareReplays[id];
  const visuals = replayVisuals[id];
  if (!item || !data || !visuals) return;

  deselectBody(); // clears any earlier selection, panel or replay

  setLabel(hardwareLabel, data.label);
  hardwareHolder.visible = true;

  // The camera follows the craft, so it acts as the "selected" object
  selectedBody = { name: item.name, kind: "Mission replay", group: hardwareHolder, focus: 8 };
  breadcrumb.textContent = item.destination + " › " + item.breadcrumbName + " › Mission replay";

  beginReplay({
    events: data.events,
    holder: hardwareHolder,
    model: getHardwareModel(visuals.models[0]),
    modelNames: visuals.models,
    label: hardwareLabel,
    direction: null,
    baseScale: data.craftScale || 0.02,
    visuals: visuals,
    isHardware: true,
    item: item,
    stageTags: STAGE_TAGS[id],
    actions: EVENT_ACTIONS[id],
    outcome: item.status ? { label: catalogStatus(function (c) { return c.hardware === id; }), text: item.status.text } : null,
    // "Replay again" goes through main.js, so the liftoff scene plays again too
    restart: function () {
      document.dispatchEvent(new CustomEvent("replay-hardware", { detail: { hardwareId: id } }));
    }
  });

  // The liftoff scene already showed the launch, so start with the craft above Earth
  finishLaunch();
}

// The final status of Voyager 1, Voyager 2 or Parker, taken from the "Status" fact in data/spacecraft.js
function spacecraftOutcome(name, info) {
  const fact = info.facts.find(function (f) { return f[0].indexOf("Status") === 0; });
  return fact ? { label: catalogStatus(function (c) { return c.spacecraft === name; }), text: fact[1] } : null;
}

// The short status word (Operating, Ended, On the surface...) of the first matching catalog item
function catalogStatus(match) {
  const item = catalog.find(match);
  return item && item.status && item.status.label ? item.status.label : "See profile";
}

// Replay of a mission from data/missions.js (Hubble, Webb, Pioneer, New Horizons, Artemis I and more).
// main.js calls this after the liftoff scene.
export function startMissionReplay(id) {
  const mission = missions[id];
  if (!mission) return;

  deselectBody();
  setLabel(hardwareLabel, mission.label);
  hardwareHolder.visible = true;
  selectedBody = { name: mission.label, kind: "Mission replay", group: hardwareHolder, focus: 8 };
  breadcrumb.textContent = mission.label + " › Mission replay";

  const modelNames = mission.events.map(function (event) { return event.model; });
  const scales = mission.events.map(function (event) {
    const model = getHardwareModel(event.model);
    return (event.size || 0.05) / (model.userData.size || 1);
  });
  const direction = mission.direction
    ? new THREE.Vector3(mission.direction[0], 0, mission.direction[1]).normalize()
    : new THREE.Vector3(1, 0, 0);

  beginReplay({
    events: mission.events,
    holder: hardwareHolder,
    model: getHardwareModel(modelNames[0]),
    modelNames: modelNames,
    label: hardwareLabel,
    direction: direction,
    baseScale: scales[0],
    visuals: { scales: scales, zooms: mission.events.map(function (event) { return event.zoom; }) },
    isHardware: true,
    item: null,
    outcome: mission.outcome,
    travelSeconds: mission.travelSeconds,
    landingHardware: mission.landingHardware || null,
    landingIndex: mission.landingIndex,
    source: { type: "mission", id: id },
    restart: function () {
      document.dispatchEvent(new CustomEvent("replay-mission", { detail: { missionId: id } }));
    }
  });

  finishLaunch();
}

// ----- Unfolding models (Hubble's solar wings, Webb's sunshield and mirror, Skylab, Zarya and Unity) -----
// For each event: how folded the model is when the event starts (deployFrom) and ends (deployTo).
function planDeployment(events) {
  const first = events.find(function (event) { return event.deploy; });
  let state = first ? first.deploy[0] : 1;
  events.forEach(function (event, i) {
    const range = event.deploy || [state, state];
    replay.deployFrom[i] = range[0];
    replay.deployTo[i] = range[1];
    state = range[1];
  });
}

const DEPLOY_SECONDS = 4.5;

function currentDeployAmount() {
  const i = replay.eventIndex;
  if (replay.phase === "moving") return replay.deployTo[i];
  if (replay.phase === "done") return replay.deployTo[replay.events.length - 1];
  const progress = Math.min(1, replay.deployClock / DEPLOY_SECONDS);
  const eased = progress * progress * (3 - 2 * progress);
  return replay.deployFrom[i] + (replay.deployTo[i] - replay.deployFrom[i]) * eased;
}

// ----- The trajectory: a faint dashed line for the whole path and a bright line for the part flown -----
const TRAIL_POINTS = 480;

function buildTrail(points) {
  const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
  const sampled = curve.getPoints(TRAIL_POINTS).map(function (point) { return keepOutsideBodies(point.clone()); });
  const geometry = new THREE.BufferGeometry().setFromPoints(sampled);

  const plan = new THREE.Line(geometry, new THREE.LineDashedMaterial({
    color: accentNumber(), dashSize: 0.35, gapSize: 0.35, transparent: true, opacity: 0.28, depthWrite: false
  }));
  if (plan.computeLineDistances) plan.computeLineDistances();
  const flown = new THREE.Line(geometry.clone(), new THREE.LineBasicMaterial({
    color: accentNumber(), transparent: true, opacity: 0.9, depthWrite: false
  }));
  flown.geometry.setDrawRange(0, 0);
  scene.add(plan);
  scene.add(flown);
  replay.trail = { plan: plan, flown: flown };
  replay.extras.push(plan, flown);
}

// Small rocks with labels for places the solar system view does not draw (Bennu, comet Wild 2, Pluto, Arrokoth)
const miniBodyMaterial = new THREE.MeshStandardMaterial({ color: 0x8f877d, roughness: 1, flatShading: true });

function addMiniBodies(events, outboundDirection) {
  const done = {};
  events.forEach(function (event) {
    if (!event.body || done[event.body]) return;
    done[event.body] = true;

    let center;
    if (event.target === "deep") center = deepBodyCenter(event);
    else if (event.target === "outbound" && outboundDirection) {
      center = outboundDirection.clone().multiplyScalar(REPLAY_OUTBOUND_DISTANCE * (event.far || 1) + 0.6);
    } else return;

    const group = new THREE.Group();
    group.position.copy(center);
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(MINI_BODY_SIZE, 1), miniBodyMaterial);
    rock.scale.set(1, 0.75, 0.85);
    group.add(rock);
    const label = makeLabel(event.body, "#c9c6bf");
    group.add(label);
    scene.add(group);
    const entry = { label: label, parent: group, radius: MINI_BODY_SIZE };
    labelEntries.push(entry);
    group.userData.labelEntry = entry;
    replay.extras.push(group);
  });
}

function clearOrbitRing() {
  if (!replay || !replay.orbitRing) return;
  scene.remove(replay.orbitRing);
  replay.orbitRing.geometry.dispose();
  replay.orbitRing = null;
}

function clearReplayExtras() {
  clearOrbitRing();
  replay.extras.forEach(function (object) {
    scene.remove(object);
    if (object.userData.labelEntry) {
      const index = labelEntries.indexOf(object.userData.labelEntry);
      if (index !== -1) labelEntries.splice(index, 1);
    }
    if (object.geometry) object.geometry.dispose();
  });
  replay.extras = [];
}

// The body an event happens at: a planet or moon, or a small body (center only)
function eventCenter(event) {
  const planet = planets.find(function (item) { return item.name === event.target; });
  if (planet) return { position: planet.group.position, radius: planet.size, planet: planet };
  if (event.target === "deep") return { position: deepBodyCenter(event), radius: MINI_BODY_SIZE, planet: null };
  return null;
}

// Called when an event starts: sounds and one-off effects
function startEventEffects() {
  replay.deployClock = 0;
  replay.effectClock = 0;
  replay.splash = null;
  clearOrbitRing();

  const action = actionOf(replay.eventIndex);
  const event = replay.events[replay.eventIndex];

  if (action === "deploy") play("separation");
  if (action === "orbit") {
    const center = eventCenter(event);
    if (center) {
      const radius = replay.holder.position.distanceTo(center.position) || center.radius * 1.3;
      const points = [];
      for (let k = 0; k <= 96; k++) {
        const angle = (k / 96) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius).add(center.position));
      }
      replay.orbitRing = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: accentNumber(), transparent: true, opacity: 0.55, depthWrite: false })
      );
      scene.add(replay.orbitRing);
    }
  }
}

// Every frame: unfolding, parachutes, plasma, dust and the splash
function updateEventEffects(delta) {
  const model = replay.model;
  const holding = replay.phase === "holding";
  const i = replay.eventIndex;
  const done = replay.phase === "done";
  const action = holding ? actionOf(i) : null;
  const nextAction = replay.phase === "moving" ? actionOf(i + 1) : null;
  const finalAction = done ? actionOf(replay.events.length - 1) : null;

  if (holding) {
    replay.deployClock += delta;
    replay.effectClock += delta;
  }

  // The trajectory flown so far
  if (replay.trail) {
    const count = replay.launch && !replay.launchDone ? 0 : Math.floor(replay.t * TRAIL_POINTS) + 1;
    replay.trail.flown.geometry.setDrawRange(0, Math.min(count, TRAIL_POINTS + 1));
  }

  if (model.userData.setDeploy) model.userData.setDeploy(currentDeployAmount());

  // Parachutes (after a short moment, as if they just opened)
  const chutesOpen = ((action === "splashdown" || action === "parachute") && replay.effectClock > 0.8) ||
    finalAction === "splashdown" || finalAction === "parachute"; // they stay open on the last picture
  if (model.userData.chutes) {
    if (chutesOpen && !model.userData.chutes.visible) play("pop");
    model.userData.chutes.visible = chutesOpen;
  }

  // Re-entry plasma: while heading into a re-entry event and while it is shown
  const event = replay.events[holding ? i : Math.min(i + 1, replay.events.length - 1)];
  const reentering = (action === "reentry" && replay.effectClock < 6) ||
    (nextAction === "reentry" && replay.moveProgress > 0.55);
  setLoop("wind", reentering ? 0.45 : 0);
  if (reentering) emitPlasma(delta, event);

  // Touch-and-go: a puff of dust for the first two seconds
  if (action === "sample" && replay.effectClock < 2.2) emitDust(delta);

  // Splashdown: a ring spreading on the water
  if (action === "splashdown" && replay.effectClock > 2.6 && !replay.splash) {
    const center = eventCenter(event);
    if (center) {
      const up = replay.holder.position.clone().sub(center.position).normalize();
      const size = model.scale.x * (model.userData.size || 1);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(size * 0.4, size * 0.55, 40),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })
      );
      ring.position.copy(center.position).addScaledVector(up, center.radius + 0.002);
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), up);
      scene.add(ring);
      replay.extras.push(ring);
      replay.splash = { mesh: ring, age: 0 };
      play("thud");
    }
  }
  if (replay.splash) {
    replay.splash.age += delta;
    const grow = 1 + replay.splash.age * 1.6;
    replay.splash.mesh.scale.setScalar(grow);
    replay.splash.mesh.material.opacity = Math.max(0, 0.8 - replay.splash.age * 0.25);
  }

  if (replay.orbitRing) replay.orbitRing.material.opacity = 0.35 + 0.2 * Math.sin(replay.effectClock * 2);
}

function emitPlasma(delta, event) {
  const center = eventCenter(event);
  if (!center) return;
  const position = replay.holder.position;
  const up = position.clone().sub(center.position).normalize();
  const size = replay.model.scale.x * (replay.model.userData.size || 1);

  replay.fireCarry += 55 * delta;
  while (replay.fireCarry >= 1) {
    replay.fireCarry -= 1;
    const start = position.clone().addScaledVector(up, -size * 0.35);
    const velocity = up.clone().multiplyScalar(size * randomBetween(2, 4))
      .add(new THREE.Vector3(randomBetween(-1, 1), randomBetween(-1, 1), randomBetween(-1, 1)).multiplyScalar(size * 0.6));
    particles.emit(true, start, velocity, size * 1.1, size * 0.15, randomBetween(0.18, 0.32), 0.9, undefined, 0);
  }
}

function emitDust(delta) {
  const position = replay.holder.position;
  const size = replay.model.scale.x * (replay.model.userData.size || 1);
  replay.groundCarry += 30 * delta;
  while (replay.groundCarry >= 1) {
    replay.groundCarry -= 1;
    const velocity = new THREE.Vector3(randomBetween(-1, 1), randomBetween(-1, 1), randomBetween(-1, 1)).multiplyScalar(size * 0.8);
    particles.emit(false, position.clone(), velocity, size * 0.3, size * 0.9, randomBetween(1.2, 2), 0.55, undefined, 0);
  }
}

function stopReplay(showPanelAgain) {
  if (!replay) return;

  stopSpeaking();
  setLoop("engine", 0);
  particles.clear();

  launcherWrapper.visible = false;

  const flame = replay.model.userData.flame;
  if (flame) flame.visible = false;

  const wasHardware = replay.isHardware;
  const holder = replay.holder;

  if (wasHardware) {
    Object.keys(hardwareModels).forEach(function (name) {
      hardwareModels[name].visible = false;
    });
  } else {
    // Put the craft's normal size back
    replay.model.visible = true;
    replay.model.scale.setScalar(replay.restoreScale);
  }

  clearReplayExtras();
  if (replay.model.userData.chutes) replay.model.userData.chutes.visible = false;
  Object.keys(hardwareModels).forEach(function (name) {
    const model = hardwareModels[name];
    if (model.userData.chutes) model.userData.chutes.visible = false;
    if (model.userData.setDeploy) model.userData.setDeploy(1);
  });
  setLoop("wind", 0);

  replay = null;
  replayBar.classList.add("hidden");
  solarScreen.classList.remove("replaying");

  if (wasHardware) {
    holder.visible = false;
    selectedBody = null;
    isZooming = false;
    breadcrumb.textContent = "";
  } else if (showPanelAgain !== false && selectedBody) {
    infoPanel.classList.remove("hidden");
  }
}

// Smoke and fire for a launch from Earth's surface. base = where the vehicle's engines are.
function emitLaunchEffects(delta, base, direction) {
  const launch = replay.launch;
  const side = new THREE.Vector3(-launch.away.z, 0, launch.away.x);
  const up = new THREE.Vector3(0, 1, 0);
  const behind = direction.clone().multiplyScalar(-1);
  const s = LAUNCHER_SCALE;

  // Smoke clouds spreading over the ground (only while the vehicle is still low)
  if (replay.ascent < 0.5) {
    replay.groundCarry += 16 * delta;
    while (replay.groundCarry >= 1) {
      replay.groundCarry -= 1;

      const spread = side.clone().multiplyScalar(randomBetween(-1, 1))
        .add(up.clone().multiplyScalar(randomBetween(-1, 1)));
      const position = launch.start.clone()
        .addScaledVector(spread, 0.1)
        .addScaledVector(launch.away, 0.02);
      const velocity = spread.clone().normalize().multiplyScalar(randomBetween(0.08, 0.3))
        .addScaledVector(launch.away, randomBetween(0.03, 0.1));

      particles.emit(false, position, velocity, 0.14, randomBetween(0.6, 0.9), randomBetween(3.5, 5), 0.6, undefined, 0);
    }
  }

  // Fire from the engines
  replay.fireCarry += 50 * delta;
  while (replay.fireCarry >= 1) {
    replay.fireCarry -= 1;

    const velocity = behind.clone().multiplyScalar(randomBetween(0.5, 0.9))
      .add(new THREE.Vector3(randomBetween(-0.08, 0.08), randomBetween(-0.08, 0.08), randomBetween(-0.08, 0.08)));

    particles.emit(true, base, velocity, 0.2, 0.03, randomBetween(0.25, 0.4), 0.9, undefined, 0);
  }

  // Smoke trail left behind
  replay.trailCarry += 32 * delta;
  while (replay.trailCarry >= 1) {
    replay.trailCarry -= 1;

    const velocity = behind.clone().multiplyScalar(0.1)
      .add(new THREE.Vector3(randomBetween(-0.04, 0.04), randomBetween(-0.04, 0.04), randomBetween(-0.04, 0.04)));

    particles.emit(false, base, velocity, 0.1, randomBetween(0.4, 0.55), randomBetween(2.5, 3.5), 0.45, undefined, 0);
  }
}

// Fire only (no smoke): used when leaving the Moon, which has no air
function emitFireOnly(delta, position, direction) {
  const behind = direction.clone().multiplyScalar(-1);
  const tail = position.clone().addScaledVector(behind, replay.model.scale.x * 0.5);
  const size = replay.model.scale.x * 2;

  replay.fireCarry += 40 * delta;
  while (replay.fireCarry >= 1) {
    replay.fireCarry -= 1;

    const velocity = behind.clone().multiplyScalar(size * randomBetween(3, 6))
      .add(new THREE.Vector3(randomBetween(-1, 1), randomBetween(-1, 1), randomBetween(-1, 1)).multiplyScalar(size));

    particles.emit(true, tail, velocity, size, size * 0.2, randomBetween(0.2, 0.35), 0.9, undefined, 0);
  }
}

// ----- Playing the replay, frame by frame -----
const PAD_WAIT_SECONDS = 2;                     // engines fire on the pad for a moment before liftoff
const MODEL_UP = new THREE.Vector3(0, 1, 0);
const MODEL_FORWARD = new THREE.Vector3(0, 0, 1);
const ORIGIN = new THREE.Vector3(0, 0, 0);

// Starts slow, speeds up, then slows down again (0 to 1)
function easeInOut(x) {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

// True while the launch vehicle is still on its way up from Earth
function launchInProgress() {
  return Boolean(replay.launch) && replay.eventIndex === 0 && replay.phase === "holding" && !replay.launchDone;
}

// The launch is over: hide the launch vehicle and show the craft at the top of the climb
function finishLaunch() {
  if (!replay.launch || replay.launchDone) return;

  replay.launchDone = true;
  replay.ascent = 1;
  launcherWrapper.visible = false;
  replay.holder.position.copy(replay.launch.end);

  replay.cameraGoal = null;
  focusDistance = replay.zooms[0] || 16;
  isZooming = true;
  setLoop("engine", 0);
}

function updateLaunch(delta) {
  const launch = replay.launch;

  replay.launchClock = (replay.launchClock || 0) + delta;
  replay.ascent = Math.min(1, Math.max(0, replay.launchClock - PAD_WAIT_SECONDS) / replay.ascentSeconds);

  const direction = launch.end.clone().sub(launch.start).normalize();
  const position = launch.start.clone().lerp(launch.end, replay.ascent * replay.ascent); // speeds up as it climbs

  launcherWrapper.position.copy(position);
  launcherWrapper.lookAt(position.clone().add(direction));
  launcherWrapper.visible = true;
  replay.holder.position.copy(position);

  emitLaunchEffects(delta, position, direction);
  setLoop("engine", replay.ascent > 0 ? 0.55 : 0.3); // engines roar on the pad, then louder at liftoff

  if (replay.ascent >= 1) finishLaunch();
}

function startMoving() {
  const from = replay.eventIndex;
  const next = replay.events[from + 1];

  stopSpeaking();
  replay.narrating = false;
  replay.phase = "moving";
  replay.moveFrom = replay.stops[from];
  replay.moveTo = replay.stops[from + 1];
  replay.moveProgress = 0;
  replay.moveEase = 0;
  replay.cameraGoal = null;

  // When leaving the Moon, switch to the ascent stage before it starts rising
  if (replay.isHardware && next.liftoff && replay.modelNames[from + 1]) {
    replay.model.visible = false;
    replay.modelName = replay.modelNames[from + 1];
    replay.model = getHardwareModel(replay.modelName);
  }

  replayStep.textContent = "Traveling \u00B7 Next: " + next.title;
  play("whoosh");
}

function finishReplay() {
  replay.phase = "done";
  replay.narrating = false;
  replay.paused = false;
  updateReplayProgress(true);
  replayStep.textContent = "Stage E \u00B7 Completion \u00B7 " + replay.events.length + " events replayed";
  if (replay.outcome) {
    replayDate.textContent = "Final status: " + replay.outcome.label;
    replayCaption.textContent = replay.outcome.text;
  }
  replayPause.textContent = "Replay again";
  clearOrbitRing();
  play("success");
  document.dispatchEvent(new CustomEvent("replay-finished", { detail: { source: replay.source || null, hardwareId: replay.item ? replay.item.id : null } }));
}

// Called when the current event has been shown long enough
// The close-up scene for this event, if it has one
function sceneFor(index) {
  const event = replay.events[index];
  const action = (replay.actions && replay.actions[index]) || event.action;
  if (action === "splashdown") {
    const name = event.model || (replay.modelNames && replay.modelNames[index]) || "apollo-cm";
    return { kind: "splashdown", capsule: name, title: event.title, date: event.date, label: replay.label ? replay.label.userData.text : "", index: index };
  }
  if (index === replay.landingIndex && replay.landingHardware) {
    return { kind: "landing", hardwareId: replay.landingHardware, title: event.title, index: index };
  }
  return null;
}

// main.js plays the scene (a cancelled event means "I am playing it, wait"), then calls resumeReplayAfterScene
function leaveHold() {
  const scene = sceneFor(replay.eventIndex);
  if (scene && !replay.scenesPlayed[replay.eventIndex]) {
    replay.scenesPlayed[replay.eventIndex] = true;
    const message = new CustomEvent("replay-scene", { detail: scene, cancelable: true });
    if (!document.dispatchEvent(message) || message.defaultPrevented) {
      stopSpeaking();
      replay.narrating = false;
      replay.paused = true;
      replay.waitingScene = true;
      return;
    }
  }
  if (replay.eventIndex < replay.events.length - 1) {
    startMoving();
  } else {
    finishReplay();
  }
}

function updateHolding(delta) {
  if (launchInProgress()) updateLaunch(delta);

  if (replay.narrating) {
    replay.narrationElapsed += delta;
    if (replay.narrationElapsed > replay.narrationLimit) {
      // Safety: the voice never reported that it finished
      stopSpeaking();
      replay.narrating = false;
    }
    return;
  }

  replay.hold -= delta;
  if (replay.hold <= 0 && !launchInProgress()) leaveHold();
}

// ----- Keep spacecraft from flying through the Sun or a planet -----
// If a point on the path is inside a body, it is pushed out to just above the surface.
const SUN_CLEARANCE = 5.6;     // just outside the Sun's glow
const BODY_CLEARANCE = 0.05;   // a little above a planet's surface (landers sit higher than this)

function keepOutsideBodies(point) {
  const sunDistance = point.length();
  if (sunDistance < SUN_CLEARANCE && sunDistance > 0.000001) {
    point.multiplyScalar(SUN_CLEARANCE / sunDistance);
  }

  planets.forEach(function (planet) {
    // Saturn's rings count as part of Saturn
    const radius = planet.data.hasRing ? planet.size * 2.2 : planet.size;
    const minDistance = radius + BODY_CLEARANCE;
    const offset = point.clone().sub(planet.group.position);
    const distance = offset.length();

    if (distance < minDistance && distance > 0.000001) {
      point.copy(planet.group.position).add(offset.multiplyScalar(minDistance / distance));
    }
  });

  return point;
}

function updateMoving(delta) {
  replay.moveProgress = Math.min(1, replay.moveProgress + delta / (replay.travelSeconds || REPLAY_TRAVEL_SECONDS));
  replay.moveEase = easeInOut(replay.moveProgress);
  replay.t = THREE.MathUtils.lerp(replay.moveFrom, replay.moveTo, replay.moveEase);

  const previous = replay.holder.position.clone();
  replay.holder.position.copy(keepOutsideBodies(replay.curve.getPoint(replay.t)));

  // Remember which way the craft is really moving (used to point its nose)
  const step = replay.holder.position.clone().sub(previous);
  if (step.lengthSq() > 1e-10) replay.heading = step.normalize();

  if (replay.moveProgress >= 1) {
    replay.eventIndex += 1;
    replay.phase = "holding";
    replay.t = replay.moveTo;
    showReplayEvent();
  }
}

// Size, direction, flames and visibility of the craft
function updateReplayLooks(delta) {
  const model = replay.model;
  const launching = launchInProgress();
  const i = replay.eventIndex;
  const moving = replay.phase === "moving";

  model.visible = !launching;
  if (!launching) launcherWrapper.visible = false;

  let scale = replay.scales[i];
  if (moving) scale = THREE.MathUtils.lerp(replay.scales[i], replay.scales[i + 1], replay.moveEase);
  model.scale.setScalar(scale);

  // The body the craft is at (or heading to)
  const event = moving ? replay.events[i + 1] : replay.events[i];
  const nearBody = planets.find(function (planet) { return planet.name === event.target; });
  const liftingOff = moving && Boolean(event.liftoff);

  if (!replay.isHardware) {
    // Voyager and Parker keep facing the Sun, like in the normal view
    model.lookAt(sun.position);
  } else if (UPRIGHT_MODELS.has(replay.modelName) && nearBody) {
    // Landers and rovers stand on the surface: their "up" points away from the body's center
    const up = replay.holder.position.clone().sub(nearBody.group.position).normalize();
    model.quaternion.setFromUnitVectors(MODEL_UP, up);
    if (liftingOff) emitFireOnly(delta, replay.holder.position, up);
  } else {
    // Capsules and the Apollo stack point their nose the way they are moving
    const heading = replay.heading ||
      replay.curve.getTangent(THREE.MathUtils.clamp(replay.t, 0, 1)).normalize();
    model.quaternion.setFromUnitVectors(MODEL_FORWARD, heading);
  }

  const flame = model.userData.flame;
  if (flame) flame.visible = liftingOff || (moving && replay.moveProgress < 0.2);

  if (model.userData.update) model.userData.update(delta); // spins the helicopter rotors
}

function updateReplay(delta) {
  if (!replay) return;

  const nextDisabled = replay.phase === "done";
  if (replayNext.disabled !== nextDisabled) replayNext.disabled = nextDisabled;

  if (replay.paused) {
    setLoop("engine", 0);
    return;
  }

  if (replay.phase === "holding") updateHolding(delta);
  else if (replay.phase === "moving") updateMoving(delta);

  updateReplayLooks(delta);
  if (replay) updateEventEffects(delta);
}

// Back from a landing or splashdown scene: carry on with the next part of the journey
export function resumeReplayAfterScene() {
  if (!replay || !replay.waitingScene) return false;
  replay.waitingScene = false;
  replay.paused = false;
  replayPause.textContent = "Pause";
  leaveHold();
  return true;
}

function restartReplay() {
  const restart = replay.restart;
  stopReplay(false);
  restart();
}

// ----- Replay buttons -----
replayButton.addEventListener("click", function () {
  if (selectedBody && selectedBody.kind === "Spacecraft") {
    requestSpacecraftReplay(selectedBody); // the liftoff scene plays first
  }
});

replayPause.addEventListener("click", function () {
  if (!replay) return;

  if (replay.phase === "done") {
    restartReplay();
    return;
  }

  replay.paused = !replay.paused;
  replayPause.textContent = replay.paused ? "Resume" : "Pause";
  play(replay.paused ? "pause" : "resume");

  if (speechSupported) {
    if (replay.paused) window.speechSynthesis.pause();
    else window.speechSynthesis.resume();
  }
});

replayNext.addEventListener("click", function () {
  if (!replay || replay.phase === "done") return;

  if (replay.paused) {
    replay.paused = false;
    replayPause.textContent = "Pause";
  }

  stopSpeaking();
  replay.narrating = false;

  if (replay.phase === "moving") {
    replay.moveProgress = 1; // arrive on the next frame
    return;
  }

  finishLaunch(); // does nothing if there is no launch running
  leaveHold();
});

// The Narration button switches the "Voice" sound group (the same switch as in Settings)
replayVoice.addEventListener("click", function () {
  if (!speechSupported) return;
  play(narrationOn ? "toggleOff" : "toggleOn");
  if (!narrationOn && !isSoundOn()) return; // sound is switched off everywhere: nothing to turn on
  setGroupOn("voice", !narrationOn);
});

onSoundChange(function () {
  const on = isSoundOn() && isGroupOn("voice");
  if (on === narrationOn) return;
  narrationOn = on;
  updateVoiceButton();

  if (!replay || replay.phase !== "holding") {
    if (!narrationOn) stopSpeaking();
    return;
  }

  if (narrationOn) {
    startNarration(); // read the current event from the start
  } else {
    stopSpeaking();
    if (replay.narrating) {
      replay.narrating = false;
      replay.hold = AFTER_NARRATION_SECONDS;
    }
  }
});

replaySite.addEventListener("click", function () {
  if (!replay || !replay.item) return;

  const item = replay.item;
  document.dispatchEvent(
    new CustomEvent("explore-destination", {
      detail: { destination: item.destination, hardwareId: item.id }
    })
  );
});

replayView.addEventListener("click", function () {
  replayViewIndex = (replayViewIndex + 1) % REPLAY_VIEWS.length;
  replayView.textContent = "View: " + REPLAY_VIEWS[replayViewIndex].name;
  play("zoom", replayViewIndex === 0 ? 1 : -1);
  if (replay && !replay.cameraGoal) {
    const zoom = replay.zooms[Math.min(replay.eventIndex, replay.zooms.length - 1)] || 16;
    focusDistance = zoom * REPLAY_VIEWS[replayViewIndex].scale;
    isZooming = true;
  }
});

replayStop.addEventListener("click", function () {
  stopReplay(true);
});

replayToggle.addEventListener("click", function () {
  captionsHidden = !captionsHidden;
  play(captionsHidden ? "close" : "open");
  applyCaptionsState();
});

// ----- Moving the planets, the Moon and the spacecraft -----
const ORBIT_TIME_SCALE = 0.12; // bigger = faster orbits

function updateBodies(delta) {
  // Planets stand still during a replay, so the replay path stays correct
  const orbiting = !motionPaused && !replay;

  if (!motionPaused) sun.rotation.y += delta * 0.03 * spinSpeed;

  planets.forEach(function (planet) {
    if (orbiting) planet.angle += planet.data.orbitSpeed * ORBIT_TIME_SCALE * orbitSpeed * delta;
    if (!motionPaused) planet.mesh.rotation.y += delta * 0.25 * spinSpeed;

    const center = planet.parent ? planet.parent.group.position : ORIGIN;
    const radius = planet.parent ? planet.data.orbitRadius : planet.data.distance;

    planet.group.position.set(
      center.x + Math.cos(planet.angle) * radius,
      center.y,
      center.z + Math.sin(planet.angle) * radius
    );

    // The Moon's orbit line travels with Earth
    if (planet.parent) planet.orbitLine.position.copy(planet.parent.group.position);
  });

  spacecraft.forEach(function (craft) {
    if (replay && replay.holder === craft.holder) return; // the replay moves this one

    if (craft.data.path === "outbound") {
      if (!motionPaused) {
        craft.distance += craft.data.speed * orbitSpeed * delta;
        if (craft.distance > OUTBOUND_RESET_DISTANCE) craft.distance = craft.data.startDistance;
      }
      craft.holder.position.copy(craft.data.direction).multiplyScalar(craft.distance);
    } else {
      if (!motionPaused) craft.angle += 0.35 * orbitSpeed * delta;
      // Parker's oval crosses Mercury's orbit, so make sure it never goes through Mercury
      craft.holder.position.copy(keepOutsideBodies(ovalPoint(craft.angle)));
    }

    craft.model.lookAt(sun.position);
  });
}

// ----- Labels: keep them above each body and about the same size on screen -----
const LABEL_SCALE = 0.025;
const labelWorldPosition = new THREE.Vector3();

labelEntries.push({ label: hardwareLabel, parent: hardwareHolder, radius: 0 });

function updateLabels() {
  labelEntries.forEach(function (entry) {
    entry.label.visible = labelsOn;
    if (!labelsOn) return;

    entry.parent.getWorldPosition(labelWorldPosition);
    const height = camera.position.distanceTo(labelWorldPosition) * LABEL_SCALE;

    entry.label.scale.set(height * 5, height, 1); // the label picture is 5 times wider than tall
    entry.label.position.set(0, entry.radius + height * 0.75, 0);
  });
}

// ----- Camera: fly to the selected body and follow it as it moves -----
let followPosition = null;
const bodyPosition = new THREE.Vector3();

function updateCamera(delta) {
  // During a launch the camera waits beside the pad and tilts up to watch the vehicle
  const goal = replay && replay.cameraGoal;
  if (goal) {
    camera.position.lerp(goal, 1 - Math.exp(-2.5 * delta));
    const look = launcherWrapper.visible ? launcherWrapper.position : replay.holder.position;
    controls.target.lerp(look, 1 - Math.exp(-6 * delta));
    followPosition = null;
    return;
  }

  if (!selectedBody) {
    followPosition = null;
    return;
  }

  selectedBody.group.getWorldPosition(bodyPosition);

  // Move the camera by however much the body moved since the last frame
  if (followPosition) {
    const moved = bodyPosition.clone().sub(followPosition);
    camera.position.add(moved);
    controls.target.add(moved);
  } else {
    followPosition = new THREE.Vector3();
  }
  followPosition.copy(bodyPosition);

  if (isZooming) {
    const k = 1 - Math.exp(-3 * delta);
    controls.target.lerp(bodyPosition, k);

    const offset = camera.position.clone().sub(controls.target);
    let distance = offset.length();
    if (distance < 0.000001) {
      offset.set(0, 0.3, 1);
      distance = offset.length();
    }

    const newDistance = THREE.MathUtils.lerp(distance, focusDistance, k);
    camera.position.copy(controls.target).add(offset.multiplyScalar(newDistance / distance));

    if (
      controls.target.distanceTo(bodyPosition) < focusDistance * 0.01 &&
      Math.abs(newDistance - focusDistance) < focusDistance * 0.02
    ) {
      isZooming = false;
      if (!replay) play("arrive"); // the camera has locked on
    }
  }
}

// ----- Zoom buttons: glide the camera closer to or farther from what it looks at -----
const ZOOM_STEP = 0.7; // each click goes 30% closer (or back out)
let zoomGoal = null;   // the camera distance we are gliding to, or null

function zoomBy(factor) {
  const distance = camera.position.distanceTo(controls.target);
  const start = zoomGoal !== null ? zoomGoal : distance; // quick clicks add up
  zoomGoal = THREE.MathUtils.clamp(start * factor, controls.minDistance, controls.maxDistance);
  isZooming = false; // stop any fly-to so it does not fight the zoom
  play("zoom", factor < 1 ? 1 : -1);
}

function applyZoomGoal(delta) {
  if (zoomGoal === null) return;
  if (isZooming) {
    zoomGoal = null; // a new selection started flying the camera
    return;
  }

  const offset = camera.position.clone().sub(controls.target);
  const distance = offset.length();
  if (distance < 0.000001) {
    zoomGoal = null;
    return;
  }

  const newDistance = THREE.MathUtils.lerp(distance, zoomGoal, 1 - Math.exp(-8 * delta));
  camera.position.copy(controls.target).add(offset.multiplyScalar(newDistance / distance));

  if (Math.abs(newDistance - zoomGoal) < zoomGoal * 0.005) zoomGoal = null;
}

zoomInButton.addEventListener("click", function () { zoomBy(ZOOM_STEP); });
zoomOutButton.addEventListener("click", function () { zoomBy(1 / ZOOM_STEP); });

// When the user drags, they take over the camera
let lastDragSound = 0;
controls.addEventListener("start", function () {
  const now = performance.now();
  if (now - lastDragSound > 500) {
    lastDragSound = now;
    play("drag");
  }
  isZooming = false;
  zoomGoal = null;
  if (replay) replay.cameraGoal = null;
});

// ----- Clicking and hovering on bodies -----
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function getBodyAtPointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObjects(bodies.map(function (body) { return body.hitArea; }), false);
  if (hits.length === 0) return null;

  return bodies.find(function (body) { return body.hitArea === hits[0].object; }) || null;
}

let downX = 0;
let downY = 0;

canvas.addEventListener("pointerdown", function (event) {
  downX = event.clientX;
  downY = event.clientY;
});

canvas.addEventListener("pointerup", function (event) {
  // During a replay clicks are ignored, so a stray click does not stop it (use Stop Replay)
  if (event.button !== 0 || replay) return;
  if (Math.hypot(event.clientX - downX, event.clientY - downY) > 5) return; // that was a drag

  const body = getBodyAtPointer(event);
  if (body) selectBody(body);
});

canvas.addEventListener("pointermove", function (event) {
  if (event.buttons !== 0 || replay) {
    bodyTooltip.classList.add("hidden");
    canvas.style.cursor = "default";
    return;
  }

  const body = getBodyAtPointer(event);
  if (body !== hoveredBody) {
    hoveredBody = body;
    if (body) play("hoverBody");
  }
  if (body) {
    canvas.style.cursor = "pointer";
    bodyTooltip.textContent = body.name + " \u00B7 " + body.kind;
    bodyTooltip.style.left = event.clientX + 14 + "px";
    bodyTooltip.style.top = event.clientY + 14 + "px";
    bodyTooltip.classList.remove("hidden");
  } else {
    canvas.style.cursor = "default";
    bodyTooltip.classList.add("hidden");
  }
});

canvas.addEventListener("pointerleave", function () {
  bodyTooltip.classList.add("hidden");
  hoveredBody = null;
});

let hoveredBody = null;

// Scrolling to zoom: a soft tick now and then
let lastScrollSound = 0;
canvas.addEventListener("wheel", function () {
  const now = performance.now();
  if (now - lastScrollSound > 90) {
    lastScrollSound = now;
    play("scroll");
  }
}, { passive: true });

// ----- Search -----
const searchItems = bodies
  .map(function (body) {
    return { label: body.name, kind: body.kind, body: body, extra: "" };
  })
  .concat(
    hardwareList.map(function (item) {
      return {
        label: item.name,
        kind: "Hardware \u00B7 " + item.destination,
        hardware: item,
        extra: item.mission + " " + item.breadcrumbName
      };
    })
  );

let searchMatches = [];
let activeResult = -1;

function highlightResult() {
  Array.from(searchResults.children).forEach(function (row, i) {
    const active = i === activeResult;
    row.classList.toggle("active", active);
    row.setAttribute("aria-selected", String(active));
    if (active) row.scrollIntoView({ block: "nearest" });
  });
}

function renderSearch() {
  const query = searchInput.value.trim().toLowerCase();

  searchMatches = searchItems.filter(function (item) {
    if (!query) return true;
    return (item.label + " " + item.kind + " " + item.extra).toLowerCase().includes(query);
  });
  activeResult = searchMatches.length > 0 ? 0 : -1;
  const searchWasEmpty = searchResults.querySelector ? Boolean(searchResults.querySelector(".search-empty")) : false;

  searchResults.innerHTML = "";

  if (searchMatches.length === 0) {
    if (!searchWasEmpty) play("noResults");
    const empty = document.createElement("li");
    empty.className = "search-empty";
    empty.textContent = "No matches";
    searchResults.appendChild(empty);
  }

  searchMatches.forEach(function (item, i) {
    const row = document.createElement("li");
    row.setAttribute("role", "option");

    const name = document.createElement("span");
    name.textContent = item.label;
    const kind = document.createElement("span");
    kind.className = "result-kind";
    kind.textContent = item.kind;

    row.appendChild(name);
    row.appendChild(kind);

    // pointerdown (not click) so the search box does not lose focus first
    row.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      chooseResult(i);
    });

    searchResults.appendChild(row);
  });

  searchResults.classList.remove("hidden");
  highlightResult();
}

function closeSearch() {
  searchResults.classList.add("hidden");
  activeResult = -1;
}

function chooseResult(index) {
  const item = searchMatches[index];
  if (!item) return;

  searchInput.value = "";
  closeSearch();
  searchInput.blur();

  if (item.body) {
    selectBody(item.body);
  } else {
    document.dispatchEvent(
      new CustomEvent("explore-destination", {
        detail: { destination: item.hardware.destination, hardwareId: item.hardware.id }
      })
    );
  }
}

searchInput.addEventListener("input", renderSearch);
searchInput.addEventListener("focus", function () {
  play("open");
  renderSearch();
});
searchInput.addEventListener("blur", function () {
  setTimeout(closeSearch, 150);
});

searchInput.addEventListener("keydown", function (event) {
  if (event.key.length === 1 || event.key === "Backspace") play("type");
  if (event.key === "ArrowDown" && searchMatches.length > 0) {
    event.preventDefault();
    play("tick");
    activeResult = (activeResult + 1) % searchMatches.length;
    highlightResult();
  } else if (event.key === "ArrowUp" && searchMatches.length > 0) {
    event.preventDefault();
    play("tick");
    activeResult = (activeResult - 1 + searchMatches.length) % searchMatches.length;
    highlightResult();
  } else if (event.key === "Enter") {
    event.preventDefault();
    chooseResult(activeResult);
  } else if (event.key === "Escape") {
    searchInput.value = "";
    closeSearch();
    searchInput.blur();
  }
});

// ----- Keyboard shortcuts for this screen -----
const helpDialog = document.getElementById("help-dialog");
const settingsDialog = document.getElementById("settings-dialog");

document.addEventListener("keydown", function (event) {
  if (solarScreen.classList.contains("hidden")) return;
  if (!helpDialog.classList.contains("hidden")) return;
  if (!settingsDialog.classList.contains("hidden")) return;

  const tag = event.target && event.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  const key = event.key.toLowerCase();
  if (entry) {
    if (event.key === "Escape" || event.key === "Enter" || event.key === " ") { event.preventDefault(); skipEntry(); }
    return;
  }

  if (event.key === "/") {
    event.preventDefault();
    searchInput.focus();
  } else if (key === "l") {
    toggleLabels();
  } else if (key === "o") {
    toggleOrbits();
  } else if (key === "s") {
    toggleShadows();
  } else if (event.key === "+" || event.key === "=") {
    zoomBy(ZOOM_STEP);
  } else if (event.key === "-" || event.key === "_") {
    zoomBy(1 / ZOOM_STEP);
  } else if (event.key === " ") {
    event.preventDefault();
    if (replay) replayPause.click();
    else toggleMotion();
  } else if (key === "r") {
    resetView();
  } else if (event.key === "Escape") {
    if (!speedPanel.classList.contains("hidden")) closeSpeedPanel();
    else if (replay) stopReplay(true);
    else if (selectedBody) {
      play("close");
      deselectBody();
    }
  }
});

// ----- Keep the drawing the right size -----
function resizeRenderer() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width === 0 || height === 0) return;

  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resizeRenderer);

// ----- Entering the site: one continuous camera move from Earth, out through orbit, to the whole Solar System -----
// Minimal subtitles sit low on the screen and never cover the planets; Skip and CC (captions on/off) are always visible.
const entryUi = document.getElementById("entry-ui");
const entrySub = document.getElementById("entry-sub");
const entrySkip = document.getElementById("entry-skip");
const entryCc = document.getElementById("entry-cc");
const ENTRY_SECONDS = 11;
const ENTRY_LINES = [
  [0.4, 3.4, "Earth. Home, 150 million km from the Sun."],
  [3.9, 6.9, "Leaving orbit. The Moon is about 384,000 km away."],
  [7.4, 10.6, "The Solar System: one star, eight planets."]
];
let entry = null;
let entryCaptions = true;
try { entryCaptions = localStorage.getItem("space-legacy-entry-cc") !== "off"; } catch (error) { entryCaptions = true; }

function entryEase(u) {
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; // slow start, slow arrival
}

export function playEntry(onDone) {
  const earth = bodies.find(function (b) { return b.name === "Earth"; });
  if (!earth) { if (onDone) onDone(); return; }
  deselectBody();
  const e = new THREE.Vector3();
  earth.group.getWorldPosition(e);
  const toSun = e.clone().multiplyScalar(-1).normalize();
  const side = new THREE.Vector3(-toSun.z, 0, toSun.x);
  const size = earth.size;
  // The path is stored relative to Earth for the first part, so Earth's own motion is followed
  entry = {
    t: 0,
    onDone: onDone || null,
    earth: earth,
    near: toSun.clone().multiplyScalar(size * 3.2).addScaledVector(side, size * 1.1).add(new THREE.Vector3(0, size * 0.5, 0)),
    orbit: toSun.clone().multiplyScalar(size * 9).addScaledVector(side, size * 6).add(new THREE.Vector3(0, size * 5, 0)),
    line: -1
  };
  controls.enabled = false;
  solarScreen.classList.add("in-entry");
  entryUi.classList.remove("hidden");
  entryCc.setAttribute("aria-pressed", String(entryCaptions));
  entrySub.textContent = "";
  entrySub.classList.remove("on");
  updateEntry(0);
}

function finishEntry() {
  if (!entry) return;
  const done = entry.onDone;
  entry = null;
  controls.enabled = true;
  controls.target.set(0, 0, 0);
  camera.position.copy(START_CAMERA_POSITION);
  solarScreen.classList.remove("in-entry");
  solarScreen.classList.add("entry-done");
  setTimeout(function () { solarScreen.classList.remove("entry-done"); }, 1600);
  entryUi.classList.add("hidden");
  entrySub.classList.remove("on");
  if (done) done();
}

export function isEntryPlaying() {
  return Boolean(entry);
}

export function skipEntry() {
  if (!entry) return;
  // Skip does not cut: the rest of the move is played quickly (about one second)
  entry.fast = true;
}

const entryA = new THREE.Vector3();
const entryB = new THREE.Vector3();
const entryEarth = new THREE.Vector3();
function updateEntry(delta) {
  entry.t += delta * (entry.fast ? 6 : 1);
  const u = Math.min(1, entry.t / ENTRY_SECONDS);
  const k = entryEase(u);
  entry.earth.group.getWorldPosition(entryEarth);
  // Three waypoints: close to Earth (day side) -> high above it (orbit, the Moon in view) -> the full view
  const near = entryEarth.clone().add(entry.near);
  const orbit = entryEarth.clone().add(entry.orbit);
  const far = START_CAMERA_POSITION;
  // A smooth quadratic Bezier through "orbit": no corners, so no visible jolt
  entryA.copy(near).lerp(orbit, k);
  entryB.copy(orbit).lerp(far, k);
  camera.position.copy(entryA.lerp(entryB, k));
  // Look at Earth first, then turn smoothly to the Sun at the centre
  const w = Math.max(0, Math.min(1, (k - 0.35) / 0.5));
  const look = entryEarth.clone().lerp(new THREE.Vector3(0, 0, 0), w * w * (3 - 2 * w));
  controls.target.copy(look);
  camera.lookAt(look);

  // Subtitles: one short line at a time, fading in and out
  let line = -1;
  ENTRY_LINES.forEach(function (entryLine, i) { if (entry.t >= entryLine[0] && entry.t < entryLine[1]) line = i; });
  if (entry.fast) line = -1;
  if (line !== entry.line) {
    entry.line = line;
    entrySub.classList.remove("on");
    if (line >= 0) {
      entrySub.textContent = ENTRY_LINES[line][2];
      if (entryCaptions) entrySub.classList.add("on");
    }
  }
  if (u >= 1) finishEntry();
}

entrySkip.addEventListener("click", function () { play("click"); skipEntry(); });
entryCc.addEventListener("click", function () {
  entryCaptions = !entryCaptions;
  entryCc.setAttribute("aria-pressed", String(entryCaptions));
  entrySub.classList.toggle("on", entryCaptions && entry !== null && entry.line >= 0);
  try { localStorage.setItem("space-legacy-entry-cc", entryCaptions ? "on" : "off"); } catch (error) { /* not remembered */ }
  play(entryCaptions ? "toggleOn" : "toggleOff");
});

// ----- Sun lens flare: soft rings along the line from the Sun through the middle of the screen -----
function flareTexture(inner, outer, ring) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext && c.getContext("2d");
  if (ctx && ctx.createRadialGradient) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    if (ring) {
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(0.72, "rgba(0,0,0,0)");
      g.addColorStop(0.86, inner);
      g.addColorStop(1, "rgba(0,0,0,0)");
    } else {
      g.addColorStop(0, inner);
      g.addColorStop(1, outer);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}
const flare = new THREE.Group();
[
  [0.0, 0.22, flareTexture("rgba(255,244,220,0.5)", "rgba(255,200,140,0)")],
  [0.45, 0.05, flareTexture("rgba(140,190,255,0.35)", "rgba(140,190,255,0)")],
  [0.8, 0.09, flareTexture("rgba(180,220,255,0.28)", "rgba(0,0,0,0)", true)],
  [1.25, 0.035, flareTexture("rgba(255,210,170,0.3)", "rgba(255,210,170,0)")],
  [1.6, 0.12, flareTexture("rgba(150,200,255,0.16)", "rgba(0,0,0,0)", true)]
].forEach(function (spec) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: spec[2], transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  sprite.userData.along = spec[0];
  sprite.userData.size = spec[1];
  sprite.renderOrder = 999;
  flare.add(sprite);
});
camera.add(flare);
scene.add(camera);
const sunScreen = new THREE.Vector3();
function updateFlare() {
  sunScreen.set(0, 0, 0);
  if (!sunScreen.project) { flare.visible = false; return; }
  sunScreen.project(camera);
  const onScreen = sunScreen.z < 1 && Math.abs(sunScreen.x) < 1.15 && Math.abs(sunScreen.y) < 1.15;
  flare.visible = onScreen && shadowsOn;
  if (!flare.visible) return;
  const fade = Math.max(0, 1 - Math.max(Math.abs(sunScreen.x), Math.abs(sunScreen.y)));
  const h = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  flare.children.forEach(function (sprite) {
    const t = sprite.userData.along;
    // Flare pieces sit on a plane 1 unit in front of the camera, mirrored through the screen centre
    const x = sunScreen.x * (1 - 2 * t) * h * camera.aspect;
    const y = sunScreen.y * (1 - 2 * t) * h;
    sprite.position.set(x, y, -1);
    sprite.scale.setScalar(sprite.userData.size * h * 2);
    sprite.material.opacity = 0.35 + 0.65 * fade;
  });
}

// ----- Animation loop -----
const clock = new THREE.Clock();
let animationId = null;

function animate() {
  animationId = requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);

  updateBodies(delta);
  updateReplay(delta);
  particles.update(delta);
  if (entry) {
    updateEntry(delta);
  } else {
    updateCamera(delta);
    applyZoomGoal(delta);
    controls.update();
  }
  updateLabels();
  updateFlare();

  sunGlow.scale.setScalar(1 + 0.03 * Math.sin(clock.elapsedTime * 1.5)); // gentle glow pulse

  renderer.render(scene, camera);
}

// ----- Functions that main.js uses -----
// While a landing or splashdown scene plays in the middle of a replay, the replay waits instead of stopping
let keepReplay = false;
export function keepReplayWhileAway(on) {
  keepReplay = Boolean(on);
}

export function startSolarSystem() {
  if (animationId !== null) return;
  resizeRenderer();
  clock.getDelta(); // forget the time that passed while this screen was hidden
  animate();
}

export function stopSolarSystem() {
  if (entry) finishEntry();
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  if (!keepReplay) stopReplay(true);
  stopSpeaking();
  closeSearch();
  closeSpeedPanel();
  bodyTooltip.classList.add("hidden");
}

// Put everything in its starting place before the first frame
updateBodies(0);
