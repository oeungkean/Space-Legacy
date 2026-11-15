// The home-screen hero: a slow, continuous camera tour of the Solar System.
// It starts at Earth (turning on its axis, with clouds, ocean shine and a thin blue atmosphere),
// then glides out past Mars, Jupiter, Saturn, Uranus and Neptune, comes back in past Mercury and Venus,
// and arrives at Earth again. There are no cuts: the camera follows one smooth closed path.
//
// The planets sit around the Sun (a light at the centre), so each one is lit from the correct side.
// Sizes are in the right order but not to scale, and the distances are shortened so the trip takes about two minutes.

import * as THREE from "three";
import { createGlow } from "./glow.js";
import { makePlanet, PLANET_LOOKS } from "./planet-look.js";

// The tour order. angle = where the planet sits around the Sun (degrees).
const TOUR = [
  { name: "Earth", angle: 0 },
  { name: "Mars", angle: 40 },
  { name: "Jupiter", angle: 86 },
  { name: "Saturn", angle: 136 },
  { name: "Uranus", angle: 186 },
  { name: "Neptune", angle: 232 },
  { name: "Mercury", angle: 282 },
  { name: "Venus", angle: 322 }
];
export const HOME_PLANETS = TOUR.map(function (stop) { return { name: stop.name }; });

const ORBIT = 220;          // distance of every planet from the Sun in this scene
const SEGMENT_SECONDS = 24; // time from one planet to the next: slow and calm (it was 15, which felt rushed)

// ----- Renderer, scene and camera -----
const canvas = document.getElementById("space-canvas");
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
if (THREE.ACESFilmicToneMapping !== undefined) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02030a);

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 5000);

// ----- The Sun: one white light at the centre (sunlight is white in space), plus a faint fill so night sides are not pure black -----
const sunLight = new THREE.PointLight(0xffffff, 3.2, 0, 0);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0x8899bb, 0.035));

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext && c.getContext("2d");
  if (ctx && ctx.createRadialGradient) {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(255,255,250,1)");
    g.addColorStop(0.12, "rgba(255,246,220,0.95)");
    g.addColorStop(0.35, "rgba(255,210,150,0.25)");
    g.addColorStop(1, "rgba(255,180,100,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  }
  return new THREE.CanvasTexture(c);
}
const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
sun.scale.set(60, 60, 1);
scene.add(sun);

// ----- Planets around the Sun -----
const stops = TOUR.map(function (stop) {
  const look = PLANET_LOOKS[stop.name];
  const a = THREE.MathUtils.degToRad(stop.angle);
  const center = new THREE.Vector3(Math.cos(a) * ORBIT, 0, Math.sin(a) * ORBIT);
  const planet = makePlanet(stop.name, look.radius, createGlow);
  planet.position.copy(center);
  scene.add(planet);

  // Where the camera waits: on the Sun's side of the planet but off to one side,
  // so we see the day side with the terminator (the line between day and night) on the edge.
  const toSun = center.clone().multiplyScalar(-1).normalize();
  const ahead = new THREE.Vector3(toSun.z, 0, -toSun.x); // the direction the tour travels
  const distance = look.radius * (look.ring ? 4.6 : 3.6) + 2;
  const view = center.clone()
    .addScaledVector(toSun, distance * 0.84)
    .addScaledVector(ahead, distance * 0.5)
    .add(new THREE.Vector3(0, look.radius * 0.55, 0));
  // Look above the planet so it rises from the bottom of the screen like a horizon, under the title and button
  const look_at = center.clone().add(new THREE.Vector3(0, look.radius * (look.ring ? 1.35 : 1.22), 0));
  return { name: stop.name, planet: planet, center: center, view: view, target: look_at, radius: look.radius };
});

// One smooth closed path through every waiting point
const viewCurve = new THREE.CatmullRomCurve3(stops.map(function (s) { return s.view; }), true, "centripetal");

// ----- Stars: a deep, faint field with a few bright ones -----
(function addStars() {
  const count = 5000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const d = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(2400 + Math.random() * 600);
    positions[i * 3] = d.x; positions[i * 3 + 1] = d.y; positions[i * 3 + 2] = d.z;
    const warm = Math.random();
    const b = 0.45 + Math.random() * 0.55;
    colors[i * 3] = b * (warm > 0.8 ? 1 : 0.85);
    colors[i * 3 + 1] = b * 0.9;
    colors[i * 3 + 2] = b * (warm < 0.3 ? 1 : 0.85);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  scene.add(new THREE.Points(geometry, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false })));
})();

// ----- Which planet we are at (main.js shows its name on the home screen) -----
let currentIndex = 0;
const listeners = [];

export function getHomePlanet() {
  return stops[currentIndex].name;
}
export function onHomePlanetChange(listener) {
  listeners.push(listener);
}
// Jump the tour to a planet (kept for other code; the tour itself never cuts)
export function setHomePlanet(name) {
  const index = stops.findIndex(function (s) { return s.name === name; });
  if (index >= 0) tourTime = index * SEGMENT_SECONDS;
}

// ----- Launch mode: main.js switches this on when the visitor enters -----
let isLaunching = false;
let launchBlend = 0;
export function setLaunching(value) {
  isLaunching = value;
}

// ----- The tour -----
// Within each segment the speed is slow at the planets and faster in between, and it never stops,
// so there is never a jolt: progress = f - k*sin(2*pi*f)/(2*pi).
const SLOW = 0.95; // close to 1: the camera almost pauses at each planet
function easeSegment(f) {
  return f - SLOW * Math.sin(2 * Math.PI * f) / (2 * Math.PI);
}

let tourTime = 0;
let lastTime = 0;
const camPos = new THREE.Vector3();
const camTarget = new THREE.Vector3();
const reduceMotion = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

const lookDir = new THREE.Vector3();
const dirA = new THREE.Vector3();
const dirB = new THREE.Vector3();

function place(time) {
  const total = stops.length;
  const segment = Math.floor(time / SEGMENT_SECONDS);
  const f = (time / SEGMENT_SECONDS) - segment;
  const from = stops[segment % total];
  const to = stops[(segment + 1) % total];
  const u = (((segment % total) + easeSegment(f)) / total) % 1;
  camPos.copy(viewCurve.getPoint(u));
  // Keep the planet we are leaving in view, then turn smoothly toward the next one (the turn has no jolt)
  const k = Math.max(0, Math.min(1, (f - 0.18) / 0.64)); // a long, gentle turn: the planet behind stays in view longer
  const w = k * k * (3 - 2 * k);
  dirA.copy(from.target).sub(camPos).normalize();
  dirB.copy(to.target).sub(camPos).normalize();
  lookDir.copy(dirA).multiplyScalar(1 - w).addScaledVector(dirB, w).normalize();
  camTarget.copy(camPos).add(lookDir);
  const nearest = Math.round(segment + f) % total;
  if (nearest !== currentIndex) {
    currentIndex = nearest;
    listeners.forEach(function (listener) { listener(stops[nearest].name); });
  }
}

function animate(now) {
  requestAnimationFrame(animate);
  now = (now || 0) / 1000;
  const dt = lastTime ? Math.min(0.1, now - lastTime) : 0.016;
  lastTime = now;

  // The hero only draws while the home screen (or the hand-over to the launch) can be seen
  const welcome = document.getElementById("welcome-screen");
  const homeHidden = welcome && welcome.classList.contains("hidden");
  if (homeHidden && (!isLaunching || launchBlend > 0.98)) return;

  const still = reduceMotion && reduceMotion.matches;
  tourTime += dt * (still ? 0.15 : 1);
  stops.forEach(function (s) {
    if (s.planet.userData.ball) s.planet.userData.ball.rotation.y += dt * (s.name === "Earth" ? 0.05 : 0.035);
    if (s.planet.userData.clouds) s.planet.userData.clouds.rotation.y += dt * 0.062;
  });

  place(tourTime);
  // Entering: the camera eases back and up, away from the planet
  launchBlend += ((isLaunching ? 1 : 0) - launchBlend) * Math.min(1, dt * 1.5);
  if (launchBlend > 0.001) {
    const back = lookDir.clone().multiplyScalar(-launchBlend * 60).add(new THREE.Vector3(0, launchBlend * 20, 0));
    camPos.add(back);
    camTarget.add(back);
  }
  camera.position.copy(camPos);
  camera.lookAt(camTarget);
  renderer.render(scene, camera);
}
place(0);
requestAnimationFrame(animate);

window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
