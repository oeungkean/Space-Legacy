// Procedural 3D models (built in code, no model files needed):
// a launch vehicle, spacecraft, rovers, a helicopter and astronauts.
// The models are detailed but simplified. They are not exact copies of real hardware.
//
// Conventions:
//   "forward" models (stack, voyager, parker, capsule) have their nose or front on the +Z side.
//   "upright" models (lunar-module, lm-ascent, rover, helicopter) stand on the ground with +Y up.
//   The launch vehicle (createLauncher) stands upright with its nose on +Y.
// Each model has userData.size (about how big it is) and sometimes userData.flame (an exhaust flame).

import * as THREE from "three";
import { createSuitedAstronaut } from "./astronaut.js";

export const UPRIGHT_MODELS = new Set([
  "lunar-module", "lm-ascent", "rover", "curiosity", "perseverance", "helicopter", "helicopter-flying",
  "mer-rover", "sojourner", "pathfinder-lander", "viking-lander", "phoenix", "insight", "surveyor",
  "lrv", "blue-ghost", "sky-crane",
  "apollo-cm", "orion-cm", "src", "gemini-cm", "lrrr", "pse", "moxie", "seis",
  "alsep" // NLC-2 (new — safe to remove on request)
]);

// Short helper: a 3D point
function V(x, y, z) {
  return new THREE.Vector3(x, y, z);
}

// ---------- Small helpers ----------
function makeTexture(width, height, draw, repeatX, repeatY) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d"), width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX || 1, repeatY || 1);
  texture.anisotropy = 4;
  return texture;
}

function speckle(ctx, w, h, count, lightAlpha, darkAlpha) {
  for (let i = 0; i < count; i++) {
    const size = 0.6 + Math.random() * 1.8;
    ctx.fillStyle =
      Math.random() < 0.5
        ? "rgba(255,255,255," + lightAlpha + ")"
        : "rgba(0,0,0," + darkAlpha + ")";
    ctx.fillRect(Math.random() * w, Math.random() * h, size, size);
  }
}

function between(min, max) {
  return min + Math.random() * (max - min);
}

function cyl(radiusTop, radiusBottom, height, material, segments) {
  return new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments || 32),
    material
  );
}

function box(width, height, depth, material) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
}

function put(mesh, x, y, z) {
  mesh.position.set(x, y, z);
  return mesh;
}

// A thin rod from point a to point b
export function strut(a, b, radius, material, segments) {
  const direction = new THREE.Vector3().subVectors(b, a);
  const length = direction.length();

  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, segments || 8),
    material
  );
  mesh.position.copy(a).addScaledVector(direction, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

// Turns a model built along +Y into one whose front points to +Z
function forward(inner, size) {
  const outer = new THREE.Group();
  inner.rotation.x = Math.PI / 2;
  outer.add(inner);
  outer.userData.size = size;
  return outer;
}

// ---------- Materials (made once, when first needed) ----------
let cache = null;

function getMaterials() {
  if (cache) return cache;

  const white = new THREE.MeshStandardMaterial({
    map: makeTexture(256, 256, function (ctx, w, h) {
      ctx.fillStyle = "#eef1f6";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(60,70,90,0.35)";
      ctx.lineWidth = 2;
      for (let y = 0; y <= h; y += 64) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      for (let row = 0; row < 4; row++) {
        for (let x = (row % 2) * 64; x < w; x += 128) {
          ctx.beginPath(); ctx.moveTo(x, row * 64); ctx.lineTo(x, row * 64 + 64); ctx.stroke();
        }
      }
      speckle(ctx, w, h, 700, 0.12, 0.08);
    }, 2, 2),
    roughness: 0.55, metalness: 0.1
  });

  const foam = new THREE.MeshStandardMaterial({
    map: makeTexture(512, 512, function (ctx, w, h) {
      ctx.fillStyle = "#c7662b";
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, 5000, 0.1, 0.16);
      ctx.strokeStyle = "rgba(60,25,5,0.35)";
      ctx.lineWidth = 2;
      for (let x = 0; x < w; x += 128) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      ctx.save();
      ctx.translate(w * 0.25, h * 0.5);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = "rgba(250,250,250,0.92)";
      ctx.font = "bold 40px Arial";
      ctx.textAlign = "center";
      ctx.fillText("SPACE LEGACY", 0, 0);
      ctx.restore();
    }, 1, 1),
    roughness: 0.85, metalness: 0.0
  });

  const gold = new THREE.MeshStandardMaterial({
    map: makeTexture(256, 256, function (ctx, w, h) {
      ctx.fillStyle = "#b78e22";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        ctx.fillStyle =
          "hsla(" + between(36, 48) + "," + between(55, 85) + "%," + between(35, 70) + "%,0.55)";
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + between(8, 26), y + between(-8, 8));
        ctx.lineTo(x + between(-8, 18), y + between(10, 26));
        ctx.closePath();
        ctx.fill();
      }
    }, 2, 2),
    roughness: 0.4, metalness: 0.65
  });

  const solar = new THREE.MeshStandardMaterial({
    map: makeTexture(128, 128, function (ctx, w, h) {
      ctx.fillStyle = "#0d2a6e";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(150,190,255,0.5)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= w; i += 16) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
      }
    }, 3, 3),
    roughness: 0.35, metalness: 0.4, side: THREE.DoubleSide
  });

  const heat = new THREE.MeshStandardMaterial({
    map: makeTexture(128, 128, function (ctx, w, h) {
      ctx.fillStyle = "#3a2b24";
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, 900, 0.1, 0.25);
    }, 2, 2),
    roughness: 0.9, metalness: 0.0
  });

  cache = {
    white: white,
    foam: foam,
    gold: gold,
    solar: solar,
    heat: heat,
    silver: new THREE.MeshStandardMaterial({ color: 0xc9ccd2, metalness: 0.8, roughness: 0.35 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x8d939c, metalness: 0.85, roughness: 0.4 }),
    black: new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.6, metalness: 0.2 }),
    bell: new THREE.MeshStandardMaterial({ color: 0x2b2d33, metalness: 0.9, roughness: 0.45 }),
    dish: new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5, metalness: 0.2, side: THREE.DoubleSide }),
    wheel: new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.9, roughness: 0.35 }),
    suit: new THREE.MeshStandardMaterial({ color: 0xf4f6fa, roughness: 0.75 }),
    visor: new THREE.MeshStandardMaterial({ color: 0xd9ae4f, metalness: 1, roughness: 0.12 }),
    accent: new THREE.MeshStandardMaterial({ color: 0x2f6fdb, roughness: 0.6 }),
    airbag: new THREE.MeshStandardMaterial({ color: 0xe9e2cf, roughness: 0.95 }),
    mesh: new THREE.MeshStandardMaterial({ color: 0x6f747c, metalness: 0.7, roughness: 0.55 }),
    line: new THREE.MeshBasicMaterial({ color: 0xd8d8d8 }),
    // Parachute canopy: orange and white panels
    parachute: new THREE.MeshStandardMaterial({
      map: makeTexture(256, 64, function (ctx, w, h) {
        for (let i = 0; i < 16; i++) {
          ctx.fillStyle = i % 2 === 0 ? "#f2f2ee" : "#d8692b";
          ctx.fillRect((i * w) / 16, 0, w / 16 + 1, h);
        }
      }, 1, 1),
      roughness: 0.9,
      side: THREE.DoubleSide
    })
  };
  return cache;
}

// An exhaust flame cone. pointsDown = true for upright models (flame goes toward -Y).
function makeFlame(radius, length, z, pointsDown) {
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(radius, length, 14),
    new THREE.MeshBasicMaterial({ color: 0xffa930, transparent: true, opacity: 0.9 })
  );
  if (pointsDown) {
    flame.rotation.x = Math.PI;
    flame.position.set(0, z, 0);
  } else {
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(0, 0, z);
  }
  flame.visible = false;
  return flame;
}

// ---------- The launch vehicle (generic, not a real vehicle) ----------
export function createLauncher() {
  const m = getMaterials();
  const rocket = new THREE.Group();

  // Core stage with black bands
  rocket.add(put(cyl(0.42, 0.42, 5.2, m.foam, 48), 0, 2.6, 0));
  [0.9, 2.8, 4.6].forEach(function (y) {
    rocket.add(put(cyl(0.425, 0.425, 0.08, m.black, 48), 0, y, 0));
  });

  // Upper stage and adapter
  rocket.add(put(cyl(0.34, 0.42, 0.3, m.white, 48), 0, 5.35, 0));
  rocket.add(put(cyl(0.34, 0.34, 1.2, m.white, 48), 0, 6.1, 0));
  rocket.add(put(cyl(0.2, 0.34, 0.45, m.white, 48), 0, 6.925, 0));

  // Spacecraft on top, with an escape tower
  rocket.add(put(cyl(0.13, 0.22, 0.8, m.white, 40), 0, 7.55, 0));
  rocket.add(put(cyl(0.09, 0.09, 0.45, m.black, 20), 0, 8.1, 0));
  rocket.add(put(cyl(0.03, 0.03, 0.8, m.metal, 12), 0, 8.35, 0));
  rocket.add(put(cyl(0, 0.05, 0.2, m.metal, 12), 0, 8.85, 0));

  // Two side boosters
  const boosters = [];
  [-1, 1].forEach(function (side) {
    const booster = new THREE.Group();
    booster.add(put(cyl(0.25, 0.25, 3.9, m.white, 36), 0, 2.15, 0));
    booster.add(put(cyl(0, 0.25, 0.8, m.white, 36), 0, 4.5, 0));
    booster.add(put(cyl(0.255, 0.255, 0.1, m.black, 36), 0, 4.1, 0));
    booster.add(put(cyl(0.12, 0.2, 0.4, m.bell, 24), 0, 0, 0));
    booster.position.set(side * 0.68, 0, 0);
    rocket.add(booster);
    boosters.push(booster);
  });
  rocket.add(put(box(1.5, 0.07, 0.12, m.metal), 0, 3.9, 0));
  rocket.add(put(box(1.5, 0.07, 0.12, m.metal), 0, 0.9, 0));

  // Four main engines under the core
  const exhaustPoints = [];
  [[0.17, 0.17], [-0.17, 0.17], [0.17, -0.17], [-0.17, -0.17]].forEach(function (p) {
    rocket.add(put(cyl(0.09, 0.17, 0.45, m.bell, 24), p[0], 0, p[1]));
    exhaustPoints.push(new THREE.Vector3(p[0], -0.22, p[1]));
  });
  exhaustPoints.push(new THREE.Vector3(-0.68, -0.2, 0));
  exhaustPoints.push(new THREE.Vector3(0.68, -0.2, 0));

  rocket.userData = { height: 8.9, boosters: boosters, exhaustPoints: exhaustPoints, size: 8.9 };
  return rocket;
}

// ---------- An astronaut (forward = +Z, feet at y = 0) ----------
// The astronaut now comes from js/astronaut.js (jointed, with researched suits). suit defaults to the Apollo A7-L.
export function createAstronaut(suit) {
  return createSuitedAstronaut(suit || "a7l");
}

// ---------- Spacecraft ----------

// Apollo-style command and service module stack (forward = +Z)
function createApolloStack() {
  const m = getMaterials();
  const inner = new THREE.Group();

  inner.add(put(cyl(0.65, 0.65, 1.5, m.white, 40), 0, 0.75, 0));               // service module
  [0.35, 1.15].forEach(function (y) {
    inner.add(put(cyl(0.66, 0.66, 0.06, m.black, 40), 0, y, 0));
  });
  inner.add(put(cyl(0.12, 0.65, 1.1, m.silver, 40), 0, 2.05, 0));               // command module
  inner.add(put(cyl(0.03, 0.03, 0.35, m.metal, 10), 0, 2.78, 0));               // docking probe
  inner.add(put(cyl(0.2, 0.55, 0.8, m.bell, 32), 0, -0.4, 0));                  // engine bell

  [0, 1, 2, 3].forEach(function (i) {                                           // thruster quads
    const angle = (i * Math.PI) / 2;
    inner.add(put(box(0.18, 0.3, 0.18, m.metal), Math.cos(angle) * 0.68, 1.2, Math.sin(angle) * 0.68));
  });
  inner.add(put(cyl(0.3, 0.05, 0.14, m.dish, 20), 0.4, -0.1, 0.55));

  const stack = forward(inner, 3.5);
  const flame = makeFlame(0.4, 1.2, -1.3, true);   // inside the rotated group, "down" = backward
  inner.add(flame);
  stack.userData.flame = flame;
  return stack;
}

// Apollo-style lunar module (upright)
function createLunarModule() {
  const m = getMaterials();
  const lm = new THREE.Group();

  // Descent stage: an eight-sided box wrapped in gold foil, with a black band below
  lm.add(put(cyl(0.85, 0.85, 0.7, m.gold, 8), 0, 1.0, 0));
  lm.add(put(cyl(0.86, 0.8, 0.12, m.black, 8), 0, 0.62, 0));
  lm.add(put(cyl(0.16, 0.34, 0.4, m.bell, 20), 0, 0.42, 0));      // descent engine bell
  lm.add(put(cyl(0.64, 0.64, 0.08, m.gold, 8), 0, 1.4, 0));

  // Ascent stage (the crew cabin): faceted silver body with a black front and two triangular windows
  lm.add(put(cyl(0.62, 0.62, 0.95, m.silver, 8), 0, 1.82, 0));
  lm.add(put(box(0.75, 0.55, 0.12, m.black), 0, 1.92, 0.58));
  [-1, 1].forEach(function (side) {
    const pane = new THREE.Mesh(new THREE.CircleGeometry(0.14, 3), m.visor);
    pane.position.set(side * 0.18, 2.0, 0.645);
    pane.rotation.z = side > 0 ? Math.PI / 6 : -Math.PI / 6;
    lm.add(pane);
  });
  lm.add(put(box(0.3, 0.32, 0.06, m.silver), 0, 1.55, 0.66));    // front hatch
  lm.add(put(cyl(0.12, 0.12, 0.12, m.metal, 12), 0, 2.35, 0));    // docking hatch on top
  lm.add(put(cyl(0.3, 0.05, 0.14, m.dish, 20), 0.5, 2.4, -0.2));  // S-band antenna
  lm.add(put(cyl(0.18, 0.04, 0.1, m.dish, 16), -0.45, 2.38, 0.3)); // rendezvous radar dish

  // Four groups of small steering thrusters (RCS quads) on the corners of the cabin
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (c) {
    const quad = new THREE.Group();
    quad.add(box(0.14, 0.14, 0.14, m.silver));
    [[0.1, 0, 0], [-0.1, 0, 0], [0, 0.1, 0], [0, -0.1, 0]].forEach(function (p) {
      quad.add(put(cyl(0.025, 0.04, 0.08, m.bell, 8), p[0], p[1], p[2]));
    });
    quad.position.set(c[0] * 0.52, 2.15, c[1] * 0.52);
    lm.add(quad);
  });

  // Four legs: main strut, two braces, a footpad, and a long contact probe (not on the front leg)
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (c, index) {
    const top = V(c[0] * 0.55, 0.95, c[1] * 0.55);
    const foot = V(c[0] * 1.4, 0.06, c[1] * 1.4);
    lm.add(strut(top, foot, 0.05, m.gold));
    lm.add(strut(V(c[0] * 0.75, 0.7, c[1] * 0.2), foot.clone().lerp(top, 0.35), 0.025, m.metal));
    lm.add(strut(V(c[0] * 0.2, 0.7, c[1] * 0.75), foot.clone().lerp(top, 0.35), 0.025, m.metal));
    lm.add(put(cyl(0.22, 0.24, 0.07, m.gold, 16), foot.x, 0.035, foot.z));
    if (index !== 0) lm.add(strut(V(foot.x, 0.05, foot.z), V(foot.x * 1.05, -0.55, foot.z * 1.05), 0.012, m.metal));
  });

  // Ladder on the front leg
  const ladderTop = V(0.5, 0.9, 0.62);
  const ladderBottom = V(1.25, 0.15, 1.3);
  lm.add(strut(ladderTop.clone().add(V(-0.12, 0, 0.1)), ladderBottom.clone().add(V(-0.12, 0, 0.1)), 0.012, m.metal));
  lm.add(strut(ladderTop.clone().add(V(0.12, 0, -0.1)), ladderBottom.clone().add(V(0.12, 0, -0.1)), 0.012, m.metal));
  for (let i = 1; i < 8; i++) {
    const p = ladderTop.clone().lerp(ladderBottom, i / 8);
    lm.add(strut(p.clone().add(V(-0.12, 0, 0.1)), p.clone().add(V(0.12, 0, -0.1)), 0.01, m.metal));
  }

  lm.userData.size = 3;
  lm.userData.engines = [V(0, 0.2, 0)]; // where the descent engine flame comes out
  return lm;
}

// Only the top half of the lunar module, lifting off (upright, flame points down)
function createLmAscent() {
  const m = getMaterials();
  const stage = new THREE.Group();

  stage.add(put(cyl(0.62, 0.62, 0.95, m.silver, 8), 0, 0.5, 0));
  stage.add(put(cyl(0.64, 0.64, 0.08, m.gold, 8), 0, 0.05, 0));
  stage.add(put(box(0.3, 0.2, 0.06, m.black), -0.2, 0.65, 0.6));
  stage.add(put(box(0.3, 0.2, 0.06, m.black), 0.2, 0.65, 0.6));
  stage.add(put(cyl(0.12, 0.12, 0.12, m.metal, 12), 0, 1.03, 0));
  stage.add(put(cyl(0.3, 0.05, 0.14, m.dish, 20), 0.5, 1.1, -0.2));
  stage.add(put(cyl(0.12, 0.28, 0.4, m.bell, 20), 0, -0.2, 0));

  const flame = makeFlame(0.28, 0.9, -0.75, true);
  stage.add(flame);
  stage.userData.flame = flame;
  stage.userData.size = 1.6;
  return stage;
}

// Voyager-style probe: big dish facing +Z (toward the Sun or Earth), booms behind it
function createVoyager() {
  const m = getMaterials();
  const probe = new THREE.Group();

  const profile = [];
  for (let r = 0; r <= 1.2; r += 0.1) profile.push(new THREE.Vector2(r, 0.35 * r * r));
  const dish = new THREE.Mesh(new THREE.LatheGeometry(profile, 40), m.dish);
  dish.rotation.x = Math.PI / 2;
  probe.add(dish);

  const bus = cyl(0.45, 0.45, 0.5, m.gold, 10);
  bus.rotation.x = Math.PI / 2;
  probe.add(put(bus, 0, 0, -0.3));

  const back = -0.4;
  probe.add(strut(new THREE.Vector3(0.3, 0, back), new THREE.Vector3(1.9, 0.1, back - 0.2), 0.03, m.metal));
  [0.9, 1.3, 1.7].forEach(function (x) {
    const rtg = cyl(0.09, 0.09, 0.3, m.black, 12);
    rtg.rotation.z = Math.PI / 2;
    probe.add(put(rtg, x, 0.05, back - 0.1));
  });

  probe.add(strut(new THREE.Vector3(-0.3, -0.1, back), new THREE.Vector3(-1.6, -0.7, back - 0.2), 0.03, m.metal));
  probe.add(put(box(0.35, 0.25, 0.3, m.gold), -1.6, -0.7, back - 0.2));

  probe.add(strut(new THREE.Vector3(0, 0.3, back), new THREE.Vector3(-0.1, 2.5, back - 0.5), 0.02, m.metal));
  probe.add(put(box(0.12, 0.12, 0.12, m.black), -0.1, 2.5, back - 0.5));

  // Scan platform with the cameras, at the end of the science boom
  probe.add(put(box(0.3, 0.22, 0.3, m.white), -1.6, -0.45, back - 0.2));
  [-0.08, 0.08].forEach(function (x) {
    const camera = cyl(0.05, 0.05, 0.3, m.black, 12);
    camera.rotation.x = Math.PI / 2;
    probe.add(put(camera, -1.6 + x, -0.3, back));
  });

  // Golden Record on the side of the body, and the long, thin magnetometer boom
  const record = cyl(0.16, 0.16, 0.02, m.gold, 32);
  record.rotation.z = Math.PI / 2;
  probe.add(put(record, 0.46, 0, -0.3));
  probe.add(strut(V(0, -0.2, back), V(0.3, -3.6, back - 0.6), 0.008, m.metal));

  probe.userData.size = 3.8;
  return probe;
}

// Parker-style probe: heat shield toward +Z (the Sun)
function createParker() {
  const m = getMaterials();
  const probe = new THREE.Group();

  const shield = cyl(0.85, 1.05, 0.16, m.white, 6);
  shield.rotation.x = Math.PI / 2;
  probe.add(put(shield, 0, 0, 0.6));

  const shieldEdge = cyl(0.88, 0.88, 0.04, m.black, 6);
  shieldEdge.rotation.x = Math.PI / 2;
  probe.add(put(shieldEdge, 0, 0, 0.5));

  const body = cyl(0.4, 0.45, 0.9, m.gold, 6);
  body.rotation.x = Math.PI / 2;
  probe.add(put(body, 0, 0, 0));

  [-1, 1].forEach(function (side) {
    const wing = box(0.9, 0.025, 0.45, m.solar);
    wing.position.set(side * 0.78, 0, 0.05);
    wing.rotation.z = side * 0.15;
    probe.add(wing);
    probe.add(strut(new THREE.Vector3(side * 0.4, 0, 0.05), new THREE.Vector3(side * 0.5, 0, 0.05), 0.03, m.metal));
  });

  const profile = [];
  for (let r = 0; r <= 0.4; r += 0.08) profile.push(new THREE.Vector2(r, 0.5 * r * r));
  const dish = new THREE.Mesh(new THREE.LatheGeometry(profile, 24), m.dish);
  dish.rotation.x = -Math.PI / 2;
  probe.add(put(dish, 0, 0.1, -0.55));

  probe.add(strut(new THREE.Vector3(0.2, 0, -0.45), new THREE.Vector3(1.0, 0.2, -1.3), 0.02, m.metal));

  // Cooling radiators on top, and the cup that measures the solar wind (it peeks past the shield)
  [-0.25, 0.25].forEach(function (x) {
    probe.add(put(box(0.35, 0.3, 0.03, m.white), x, 0.55, 0.15));
  });
  probe.add(strut(V(0.35, 0.3, 0.1), V(0.75, 0.75, 0.9), 0.012, m.metal));
  probe.add(put(cyl(0.05, 0.05, 0.08, m.silver, 12), 0.75, 0.75, 0.92));

  probe.userData.size = 2.7;
  return probe;
}

// A Mars cruise capsule: aeroshell with heat shield at the front and a cruise stage with a solar ring behind
function createCapsule() {
  const m = getMaterials();
  const inner = new THREE.Group();

  inner.add(put(cyl(0.35, 1.1, 0.5, m.heat, 48), 0, 0.25, 0));      // heat shield (blunt nose)
  inner.add(put(cyl(1.1, 0.5, 0.9, m.white, 48), 0, -0.45, 0));      // backshell
  inner.add(put(cyl(0.55, 0.55, 0.25, m.gold, 32), 0, -1.0, 0));     // cruise stage

  const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 1.05, 48), m.solar);
  ring.rotation.x = -Math.PI / 2;
  inner.add(put(ring, 0, -1.0, 0));

  [0, 1, 2, 3].forEach(function (i) {
    const angle = (i * Math.PI) / 2;
    inner.add(put(box(0.1, 0.14, 0.1, m.metal), Math.cos(angle) * 0.9, -0.78, Math.sin(angle) * 0.9));
  });

  return forward(inner, 2.2);
}

// ---------- Parts shared by several models ----------

// A wheel with raised treads (grousers) around it. The wheel turns around its X axis.
function treadWheel(radius, width, material, treadMaterial) {
  const wheel = new THREE.Group();

  const tire = cyl(radius, radius, width, material, 24);
  tire.rotation.z = Math.PI / 2;
  wheel.add(tire);

  const count = 18;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const tread = box(width * 1.02, radius * 0.07, radius * 0.16, treadMaterial);
    tread.position.set(0, Math.cos(angle) * radius, Math.sin(angle) * radius);
    tread.rotation.x = angle;
    wheel.add(tread);
  }

  const hub = cyl(radius * 0.35, radius * 0.35, width * 1.06, treadMaterial, 12);
  hub.rotation.z = Math.PI / 2;
  wheel.add(hub);
  return wheel;
}

// A dish antenna that opens toward +Y
function dish(radius, depth, material, segments) {
  const profile = [];
  for (let i = 0; i <= 10; i++) {
    const r = (i / 10) * radius;
    profile.push(new THREE.Vector2(r, depth * (r / radius) * (r / radius)));
  }
  return new THREE.Mesh(new THREE.LatheGeometry(profile, segments || 32), material);
}

// A flat triangle (used for the Mars Pathfinder petals)
function triangle(a, b, c, material) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([
    a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z
  ], 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

// Three or four legs with footpads, from a ring under the body down to the ground
function landingLegs(group, count, topRadius, topY, footRadius, padRadius, legMaterial, padMaterial, startAngle) {
  for (let i = 0; i < count; i++) {
    const angle = (startAngle || 0) + (i / count) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const top = V(cos * topRadius, topY, sin * topRadius);
    const foot = V(cos * footRadius, padRadius * 0.4, sin * footRadius);

    group.add(strut(top, foot, 0.04, legMaterial));
    group.add(strut(V(cos * topRadius * 0.6, topY * 0.75, sin * topRadius * 0.6), foot.clone().lerp(top, 0.4), 0.025, legMaterial));
    group.add(put(cyl(padRadius, padRadius * 1.1, padRadius * 0.35, padMaterial, 16), foot.x, padRadius * 0.17, foot.z));
  }
}

// ---------- Mars rovers ----------

// Curiosity and Perseverance (upright, about 3 m long). variant = "curiosity" or "perseverance".
// They share one design; Perseverance has a bigger arm turret (with a coring drill) and a sample caching box.
function createMarsRover(variant) {
  const m = getMaterials();
  const rover = new THREE.Group();
  const isPerseverance = variant === "perseverance";

  // Body ("warm electronics box") and top deck
  rover.add(put(box(1.4, 0.55, 2.0, m.white), 0, 1.05, 0));
  rover.add(put(box(1.5, 0.06, 2.1, m.metal), 0, 1.36, 0));
  rover.add(put(box(0.5, 0.25, 0.35, m.gold), -0.35, 1.52, 0.35));
  if (isPerseverance) rover.add(put(box(0.6, 0.3, 0.5, m.white), 0.1, 0.9, 0.95)); // sample caching system

  // Power source at the back (radioisotope generator) with cooling fins
  const rtg = new THREE.Group();
  rtg.add(cyl(0.2, 0.2, 0.7, m.black, 16));
  for (let i = 0; i < 8; i++) {
    const fin = box(0.03, 0.66, 0.52, m.black);
    fin.rotation.y = (i * Math.PI) / 8;
    rtg.add(fin);
  }
  rtg.rotation.x = Math.PI / 2 - 0.45;
  rtg.position.set(0, 1.25, -1.2);
  rover.add(rtg);

  // Mast with the camera head
  rover.add(strut(V(0.45, 1.38, 0.75), V(0.45, 2.1, 0.75), 0.05, m.white));
  const head = new THREE.Group();
  head.position.set(0.45, 2.2, 0.75);
  head.add(box(0.46, 0.2, 0.26, m.white));
  [-0.15, 0.15].forEach(function (x) {
    const lens = cyl(0.045, 0.045, 0.06, m.black, 12);
    lens.rotation.x = Math.PI / 2;
    head.add(put(lens, x, -0.02, 0.15));
  });
  const laserEye = cyl(isPerseverance ? 0.07 : 0.09, isPerseverance ? 0.07 : 0.09, 0.08, m.visor, 16);
  laserEye.rotation.x = Math.PI / 2;
  head.add(put(laserEye, 0, 0.17, 0.08));
  head.add(put(box(0.2, 0.12, 0.18, m.white), 0, 0.17, 0));
  rover.add(head);

  // High-gain antenna (six-sided plate) and a small UHF antenna
  const hga = cyl(0.22, 0.22, 0.05, m.silver, 6);
  hga.rotation.x = -0.5;
  rover.add(put(hga, -0.5, 1.62, -0.45));
  rover.add(strut(V(-0.5, 1.39, -0.45), V(-0.5, 1.58, -0.45), 0.03, m.metal));
  rover.add(put(cyl(0.06, 0.06, 0.25, m.white, 10), 0.55, 1.5, -0.8));

  // Robotic arm folded in front, with its tool turret
  rover.add(strut(V(0.55, 0.95, 1.0), V(0.6, 1.0, 1.6), 0.05, m.metal));
  rover.add(strut(V(0.6, 1.0, 1.6), V(0.15, 0.8, 1.75), 0.045, m.metal));
  const turret = new THREE.Group();
  turret.position.set(0.15, 0.68, 1.8);
  turret.add(box(isPerseverance ? 0.34 : 0.26, 0.22, 0.26, m.metal));
  turret.add(put(cyl(0.035, 0.02, isPerseverance ? 0.3 : 0.2, m.silver, 10), 0, -0.22, 0));
  rover.add(turret);

  // Hazard-avoidance cameras on the front
  [-0.25, 0.25].forEach(function (x) {
    const cam = cyl(0.04, 0.04, 0.06, m.black, 10);
    cam.rotation.x = Math.PI / 2;
    rover.add(put(cam, x, 0.9, 1.02));
  });

  // Rocker-bogie suspension and six wheels with treads
  const wheels = [];
  [-1, 1].forEach(function (side) {
    const x = side * 0.97;
    const pivot = V(side * 0.78, 0.95, 0.15);
    const bogie = V(side * 0.92, 0.62, -0.42);
    const front = V(x, 0.3, 1.0);
    const middle = V(x, 0.3, 0.05);
    const rear = V(x, 0.3, -0.95);

    rover.add(strut(pivot, front.clone().add(V(0, 0.2, 0)), 0.045, m.metal));
    rover.add(strut(pivot, bogie, 0.045, m.metal));
    rover.add(strut(bogie, middle.clone().add(V(0, 0.2, 0)), 0.04, m.metal));
    rover.add(strut(bogie, rear.clone().add(V(0, 0.2, 0)), 0.04, m.metal));

    [front, middle, rear].forEach(function (p) {
      const wheel = treadWheel(0.26, 0.4, m.wheel, m.metal);
      wheel.position.copy(p);
      rover.add(wheel);
      wheels.push(wheel);
    });
  });

  rover.userData.size = 3;
  rover.userData.wheels = wheels;
  return rover;
}

// Spirit and Opportunity (Mars Exploration Rovers): solar-powered, about 1.6 m long
function createMerRover() {
  const m = getMaterials();
  const rover = new THREE.Group();

  rover.add(put(box(0.85, 0.32, 1.05, m.white), 0, 0.5, 0));
  rover.add(put(box(1.35, 0.03, 1.35, m.solar), 0, 0.7, 0));          // main solar deck
  rover.add(put(box(1.1, 0.03, 0.45, m.solar), 0, 0.7, -0.88));       // rear solar wing
  [-1, 1].forEach(function (side) {
    rover.add(put(box(0.38, 0.03, 0.9, m.solar), side * 0.85, 0.7, 0.05)); // side solar wings
  });

  // Pancam mast at the front
  rover.add(strut(V(0, 0.72, 0.5), V(0, 1.45, 0.5), 0.03, m.white));
  const head = new THREE.Group();
  head.position.set(0, 1.5, 0.5);
  head.add(box(0.36, 0.1, 0.12, m.white));
  [-0.13, 0.13].forEach(function (x) {
    const lens = cyl(0.025, 0.025, 0.05, m.black, 10);
    lens.rotation.x = Math.PI / 2;
    head.add(put(lens, x, 0, 0.07));
  });
  rover.add(head);

  // Antennas
  const hga = cyl(0.14, 0.14, 0.03, m.silver, 16);
  rover.add(put(hga, -0.35, 0.82, -0.3));
  rover.add(strut(V(0.4, 0.72, -0.45), V(0.4, 1.15, -0.45), 0.01, m.metal));

  // Arm (instrument deployment device) folded under the front
  rover.add(strut(V(0.25, 0.42, 0.55), V(-0.2, 0.36, 0.62), 0.03, m.metal));
  rover.add(put(box(0.12, 0.12, 0.12, m.metal), -0.25, 0.33, 0.62));

  // Rocker-bogie and six wheels
  const wheels = [];
  [-1, 1].forEach(function (side) {
    const x = side * 0.62;
    const pivot = V(side * 0.48, 0.5, 0.05);
    const bogie = V(side * 0.56, 0.35, -0.28);
    rover.add(strut(pivot, V(x, 0.22, 0.55), 0.025, m.metal));
    rover.add(strut(pivot, bogie, 0.025, m.metal));
    rover.add(strut(bogie, V(x, 0.22, -0.02), 0.022, m.metal));
    rover.add(strut(bogie, V(x, 0.22, -0.55), 0.022, m.metal));

    [0.55, -0.02, -0.55].forEach(function (z) {
      const wheel = treadWheel(0.13, 0.16, m.wheel, m.metal);
      wheel.position.set(x, 0.13, z);
      rover.add(wheel);
      wheels.push(wheel);
    });
  });

  rover.userData.size = 1.6;
  rover.userData.wheels = wheels;
  return rover;
}

// Sojourner: the small Mars Pathfinder rover, about 65 cm long
function createSojourner() {
  const m = getMaterials();
  const rover = new THREE.Group();

  rover.add(put(box(0.36, 0.12, 0.42, m.white), 0, 0.19, 0));
  rover.add(put(box(0.44, 0.015, 0.52, m.solar), 0, 0.27, -0.02));
  rover.add(strut(V(0.12, 0.27, -0.2), V(0.12, 0.55, -0.2), 0.005, m.metal)); // antenna
  [-0.06, 0.06].forEach(function (x) {
    rover.add(put(box(0.03, 0.03, 0.02, m.black), x, 0.19, 0.22));             // front cameras
  });

  const wheels = [];
  [-1, 1].forEach(function (side) {
    rover.add(strut(V(side * 0.2, 0.18, 0.2), V(side * 0.22, 0.07, -0.2), 0.01, m.metal));
    [0.2, 0, -0.2].forEach(function (z) {
      const wheel = treadWheel(0.065, 0.07, m.wheel, m.metal);
      wheel.position.set(side * 0.24, 0.065, z);
      rover.add(wheel);
      wheels.push(wheel);
    });
  });

  rover.userData.size = 0.65;
  rover.userData.wheels = wheels;
  return rover;
}

// Mars Pathfinder lander: a base with three solar-panel petals that fold open.
// userData.setPetals(0) = closed (a pyramid), setPetals(1) = open flat.
function createPathfinderLander() {
  const m = getMaterials();
  const lander = new THREE.Group();
  const R = 0.6;
  const corners = [0, 1, 2].map(function (k) {
    const angle = (k * Math.PI * 2) / 3 + Math.PI / 2;
    return V(Math.cos(angle) * R, 0.12, Math.sin(angle) * R);
  });

  lander.add(put(cyl(R * 1.02, R * 1.02, 0.12, m.white, 3), 0, 0.06, 0));
  lander.add(put(cyl(0.28, 0.32, 0.3, m.gold, 12), 0, 0.28, 0));          // electronics in the middle

  // Camera mast (it rose up after landing)
  const mast = new THREE.Group();
  mast.add(strut(V(0, 0, 0), V(0, 0.55, 0), 0.02, m.metal));
  mast.add(put(box(0.18, 0.1, 0.1, m.white), 0, 0.6, 0));
  mast.position.set(0, 0.4, 0);
  lander.add(mast);

  const hinges = [];
  for (let k = 0; k < 3; k++) {
    const a = corners[k];
    const b = corners[(k + 1) % 3];
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const edge = b.clone().sub(a);
    const length = edge.length();

    const hinge = new THREE.Group();
    hinge.position.copy(mid);
    let turn = -Math.atan2(edge.z, edge.x);
    const outward = V(Math.sin(turn), 0, Math.cos(turn));
    if (outward.dot(mid) < 0) turn += Math.PI;
    hinge.rotation.y = turn;

    const fold = new THREE.Group(); // turns around the hinge line
    const h = length * 0.86;
    const solar = triangle(V(-length / 2, 0.012, 0), V(length / 2, 0.012, 0), V(0, 0.012, h), m.solar);
    const back = triangle(V(-length / 2, 0, 0), V(length / 2, 0, 0), V(0, 0, h), m.white);
    solar.material = m.solar;
    fold.add(back);
    fold.add(solar);
    hinge.add(fold);
    lander.add(hinge);
    hinges.push(fold);
  }

  lander.userData.setPetals = function (open) {
    const closedAngle = -1.15;
    hinges.forEach(function (fold) { fold.rotation.x = closedAngle * (1 - open); });
    mast.scale.y = Math.max(0.05, open);
  };
  lander.userData.setPetals(0);
  lander.userData.size = 1.8;
  return lander;
}

// The ball of airbags around Mars Pathfinder, Spirit and Opportunity.
// userData.setDeflate(0) = fully inflated, setDeflate(1) = flat.
function createAirbagBall() {
  const m = getMaterials();
  const ball = new THREE.Group();
  const lobes = [];
  const count = 24;

  for (let i = 0; i < count; i++) {
    // Spread the lobes evenly over a sphere (golden-angle spiral)
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = i * 2.39996;
    const direction = V(Math.cos(theta) * r, y, Math.sin(theta) * r);

    const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12), m.airbag);
    lobe.position.copy(direction).multiplyScalar(0.95);
    lobe.userData.direction = direction;
    ball.add(lobe);
    lobes.push(lobe);
  }

  ball.userData.setDeflate = function (amount) {
    lobes.forEach(function (lobe) {
      lobe.scale.setScalar(Math.max(0.08, 1 - amount * 0.92));
      lobe.position.copy(lobe.userData.direction).multiplyScalar(0.95 - amount * 0.35);
      if (lobe.userData.direction.y < -0.3) lobe.position.y -= amount * 0.3;
    });
  };
  ball.userData.size = 3.2;
  return ball;
}

// ---------- Mars landers ----------

// Viking lander (1976): six-sided body, three legs, dish antenna, two camera towers, sampler arm
function createVikingLander() {
  const m = getMaterials();
  const lander = new THREE.Group();

  lander.add(put(cyl(0.75, 0.75, 0.4, m.silver, 6), 0, 1.0, 0));
  lander.add(put(cyl(0.76, 0.76, 0.05, m.white, 6), 0, 1.22, 0));
  [-1, 1].forEach(function (side) {
    lander.add(put(box(0.32, 0.28, 0.4, m.black), side * 0.5, 1.4, -0.15)); // power generator covers
  });

  // Dish antenna on a mast
  lander.add(strut(V(0.1, 1.25, -0.35), V(0.25, 1.85, -0.35), 0.03, m.metal));
  const antenna = dish(0.38, 0.12, m.dish);
  antenna.position.set(0.25, 1.9, -0.35);
  antenna.rotation.x = -0.6;
  lander.add(antenna);

  // Two camera towers
  [-0.35, 0.35].forEach(function (x) {
    lander.add(put(cyl(0.07, 0.07, 0.35, m.white, 12), x, 1.42, 0.55));
    lander.add(put(cyl(0.08, 0.08, 0.1, m.metal, 12), x, 1.63, 0.55));
  });

  // Weather boom and the soil sampler arm
  lander.add(strut(V(-0.6, 1.25, 0.2), V(-0.95, 1.75, 0.55), 0.02, m.metal));
  lander.add(put(box(0.12, 0.08, 0.08, m.white), -0.97, 1.78, 0.57));
  lander.add(strut(V(0.55, 1.0, 0.45), V(1.3, 0.45, 1.15), 0.035, m.metal));
  lander.add(put(box(0.14, 0.1, 0.18, m.metal), 1.33, 0.4, 1.2));

  landingLegs(lander, 3, 0.62, 0.95, 1.35, 0.17, m.metal, m.silver, Math.PI / 6);

  // Three groups of descent engines under the body
  const engines = [];
  [0, 1, 2].forEach(function (k) {
    const angle = (k * Math.PI * 2) / 3 + Math.PI / 2;
    const x = Math.cos(angle) * 0.45;
    const z = Math.sin(angle) * 0.45;
    lander.add(put(cyl(0.05, 0.1, 0.18, m.bell, 12), x, 0.72, z));
    engines.push(V(x, 0.6, z));
  });

  lander.userData.size = 2.4;
  lander.userData.engines = engines;
  return lander;
}

// Phoenix (2008) and InSight (2018): a deck on three legs with two round, fan-shaped solar arrays.
// userData.setArrays(0) = folded, setArrays(1) = open. InSight also places its seismometer on the ground.
function createDeckLander(kind) {
  const m = getMaterials();
  const lander = new THREE.Group();
  const isInsight = kind === "insight";
  const arrayRadius = isInsight ? 1.08 : 0.9;

  lander.add(put(cyl(0.72, 0.72, 0.32, m.gold, 12), 0, 1.0, 0));
  lander.add(put(cyl(0.75, 0.75, 0.05, m.white, 12), 0, 1.18, 0));

  // Camera mast and weather mast
  lander.add(strut(V(-0.3, 1.2, 0.35), V(-0.3, 2.0, 0.35), 0.03, m.white));
  lander.add(put(box(0.22, 0.12, 0.14, m.white), -0.3, 2.05, 0.35));
  lander.add(strut(V(0.35, 1.2, -0.3), V(0.35, 2.1, -0.3), 0.015, m.metal));

  // Robotic arm (with a scoop on Phoenix, a grapple on InSight)
  lander.add(strut(V(0.45, 1.15, 0.5), V(0.85, 1.6, 1.2), 0.04, m.metal));
  lander.add(strut(V(0.85, 1.6, 1.2), V(1.15, 0.7, 1.75), 0.035, m.metal));
  lander.add(put(box(0.16, 0.12, 0.2, m.metal), 1.18, 0.6, 1.8));

  // Round solar arrays: they unfold like paper fans
  const arrays = [];
  [-1, 1].forEach(function (side) {
    const holder = new THREE.Group();
    holder.position.set(side * 0.75, 1.1, 0);
    const panel = cyl(arrayRadius, arrayRadius, 0.03, m.solar, 10);
    panel.position.set(side * (arrayRadius + 0.05), 0, 0);
    const rim = cyl(arrayRadius + 0.02, arrayRadius + 0.02, 0.02, m.white, 10);
    rim.position.copy(panel.position);
    rim.position.y -= 0.02;
    holder.add(rim);
    holder.add(panel);
    lander.add(holder);
    arrays.push({ holder: holder, side: side });
  });

  landingLegs(lander, 3, 0.6, 0.95, 1.2, 0.16, m.metal, m.silver, Math.PI / 6);

  // InSight's instruments: the seismometer under its dome-shaped shield, and the heat probe
  let instruments = null;
  if (isInsight) {
    instruments = new THREE.Group();
    const shield = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      m.white
    );
    shield.position.set(-0.4, 0, 1.9);
    instruments.add(shield);
    instruments.add(put(cyl(0.38, 0.4, 0.05, m.gold, 24), -0.4, 0.02, 1.9));
    instruments.add(put(box(0.3, 0.25, 0.3, m.gold), 0.6, 0.12, 1.9));
    instruments.visible = false;
    lander.add(instruments);
  }

  lander.userData.setArrays = function (open) {
    arrays.forEach(function (array) {
      array.holder.scale.set(Math.max(0.05, open), 1, Math.max(0.15, open));
      array.holder.rotation.z = array.side * (1 - open) * 1.2;
    });
  };
  lander.userData.deployInstruments = function () {
    if (instruments) instruments.visible = true;
  };
  lander.userData.setArrays(1);

  const engines = [];
  [0, 1, 2].forEach(function (k) {
    const angle = (k * Math.PI * 2) / 3 + Math.PI / 2;
    const x = Math.cos(angle) * 0.4;
    const z = Math.sin(angle) * 0.4;
    lander.add(put(cyl(0.04, 0.08, 0.15, m.bell, 12), x, 0.78, z));
    engines.push(V(x, 0.68, z));
  });

  lander.userData.size = isInsight ? 6 : 5.5;
  lander.userData.engines = engines;
  return lander;
}

// ---------- Moon landers and the rover ----------

// Surveyor (1966-68): a three-sided frame on three legs, with a solar panel and flat antenna on a mast.
// It carried a big solid retro-rocket under it (userData.retro) that was dropped during the descent.
function createSurveyor() {
  const m = getMaterials();
  const lander = new THREE.Group();

  // Triangular frame
  const top = [0, 1, 2].map(function (k) {
    const angle = (k * Math.PI * 2) / 3;
    return V(Math.cos(angle) * 0.55, 1.6, Math.sin(angle) * 0.55);
  });
  const bottom = [0, 1, 2].map(function (k) {
    const angle = (k * Math.PI * 2) / 3;
    return V(Math.cos(angle) * 0.75, 0.75, Math.sin(angle) * 0.75);
  });
  for (let k = 0; k < 3; k++) {
    lander.add(strut(top[k], top[(k + 1) % 3], 0.025, m.metal));
    lander.add(strut(bottom[k], bottom[(k + 1) % 3], 0.025, m.metal));
    lander.add(strut(top[k], bottom[k], 0.025, m.metal));
    lander.add(strut(top[k], bottom[(k + 1) % 3], 0.02, m.metal));
  }

  // Mast with the solar panel and the flat antenna
  lander.add(strut(V(0, 0.8, 0), V(0, 2.9, 0), 0.03, m.metal));
  const panel = box(0.85, 0.02, 0.6, m.solar);
  panel.position.set(0.25, 2.9, 0);
  panel.rotation.z = 0.5;
  lander.add(panel);
  const antenna = box(0.6, 0.02, 0.6, m.silver);
  antenna.position.set(-0.25, 2.7, 0.1);
  antenna.rotation.z = -0.7;
  lander.add(antenna);

  // Two white electronics boxes and the TV camera with its mirror
  lander.add(put(box(0.45, 0.35, 0.35, m.white), 0.25, 1.35, -0.35));
  lander.add(put(box(0.45, 0.35, 0.35, m.white), -0.35, 1.35, 0.15));
  lander.add(put(cyl(0.08, 0.08, 0.45, m.white, 12), 0.35, 1.85, 0.45));
  lander.add(put(box(0.12, 0.08, 0.1, m.silver), 0.35, 2.1, 0.5));

  landingLegs(lander, 3, 0.7, 0.85, 1.6, 0.16, m.metal, m.white, Math.PI / 3);

  // Three small vernier engines (used all the way down)
  const engines = [];
  [0, 1, 2].forEach(function (k) {
    const angle = (k * Math.PI * 2) / 3;
    const x = Math.cos(angle) * 0.5;
    const z = Math.sin(angle) * 0.5;
    lander.add(put(cyl(0.04, 0.08, 0.16, m.bell, 10), x, 0.68, z));
    engines.push(V(x, 0.58, z));
  });

  // The big retro-rocket (a ball with a nozzle) under the frame
  const retro = new THREE.Group();
  retro.add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16), m.silver));
  retro.add(put(cyl(0.12, 0.24, 0.3, m.bell, 16), 0, -0.5, 0));
  retro.position.set(0, 0.95, 0);
  lander.add(retro);

  lander.userData.size = 3;
  lander.userData.engines = engines;
  lander.userData.retro = retro;
  lander.userData.retroEngine = V(0, 0.25, 0);
  return lander;
}

// Lunar Roving Vehicle (Apollo 15, 16, 17): open frame, four wire-mesh wheels, two seats, umbrella antenna
function createLunarRover() {
  const m = getMaterials();
  const lrv = new THREE.Group();

  lrv.add(put(box(1.15, 0.08, 2.9, m.metal), 0, 0.55, 0));
  lrv.add(put(box(1.0, 0.25, 0.6, m.silver), 0, 0.72, 1.1));    // front box (batteries and electronics)
  lrv.add(put(box(1.0, 0.2, 0.55, m.silver), 0, 0.68, -1.15));  // rear tool carrier

  // Two seats
  [-0.28, 0.28].forEach(function (x) {
    lrv.add(put(box(0.45, 0.05, 0.45, m.accent), x, 0.68, 0));
    lrv.add(put(box(0.45, 0.42, 0.05, m.accent), x, 0.9, -0.25));
  });

  // Control console with the hand controller, between the seats
  lrv.add(strut(V(0, 0.6, 0.4), V(0, 1.05, 0.55), 0.025, m.metal));
  lrv.add(put(box(0.3, 0.2, 0.06, m.black), 0, 1.1, 0.58));

  // Umbrella-shaped high-gain antenna and TV camera at the front
  lrv.add(strut(V(0.3, 0.8, 1.3), V(0.3, 1.65, 1.3), 0.02, m.metal));
  const umbrella = dish(0.45, 0.2, m.dish, 12);
  umbrella.position.set(0.3, 1.66, 1.3);
  umbrella.rotation.x = 0.4;
  lrv.add(umbrella);
  lrv.add(strut(V(-0.3, 0.8, 1.35), V(-0.3, 1.35, 1.35), 0.02, m.metal));
  lrv.add(put(box(0.2, 0.15, 0.25, m.white), -0.3, 1.4, 1.38));
  lrv.add(strut(V(-0.45, 0.8, 1.2), V(-0.5, 1.9, 1.2), 0.006, m.metal)); // low-gain antenna

  // Four wheels (zinc-coated wire mesh with titanium treads) under fenders
  const wheels = [];
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (c) {
    const wheel = treadWheel(0.41, 0.23, m.mesh, m.silver);
    wheel.position.set(c[0] * 0.95, 0.41, c[1] * 1.15);
    lrv.add(wheel);
    wheels.push(wheel);
    lrv.add(put(box(0.3, 0.02, 0.95, m.silver), c[0] * 0.95, 0.86, c[1] * 1.15));
  });

  lrv.userData.size = 3.1;
  lrv.userData.wheels = wheels;
  return lrv;
}

// Firefly Blue Ghost (2025): a wide, squat four-legged lander with side solar panels
function createBlueGhost() {
  const m = getMaterials();
  const lander = new THREE.Group();

  lander.add(put(box(1.5, 1.1, 1.5, m.gold), 0, 1.25, 0));
  lander.add(put(box(1.55, 0.06, 1.55, m.white), 0, 1.83, 0));
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (c) {
    const panel = box(c[0] ? 0.03 : 1.2, 0.85, c[1] ? 0.03 : 1.2, m.solar);
    panel.position.set(c[0] * 0.77, 1.25, c[1] * 0.77);
    lander.add(panel);
  });

  // Instruments and cameras on the top deck
  lander.add(put(box(0.3, 0.25, 0.3, m.silver), 0.4, 2.0, 0.4));
  lander.add(put(cyl(0.12, 0.12, 0.3, m.white, 12), -0.45, 2.0, 0.35));
  lander.add(strut(V(-0.4, 1.86, -0.4), V(-0.4, 2.5, -0.4), 0.025, m.metal));
  lander.add(put(box(0.16, 0.1, 0.14, m.black), -0.4, 2.55, -0.4));
  const antenna = dish(0.22, 0.07, m.dish);
  antenna.position.set(0.45, 1.95, -0.45);
  antenna.rotation.x = -0.4;
  lander.add(antenna);

  // Four legs and the main engine
  landingLegs(lander, 4, 0.72, 0.85, 1.75, 0.2, m.metal, m.silver, Math.PI / 4);
  lander.add(put(cyl(0.12, 0.24, 0.35, m.bell, 16), 0, 0.55, 0));

  lander.userData.size = 3.5;
  lander.userData.engines = [V(0, 0.35, 0)];
  return lander;
}

// ---------- Impactors and atmosphere probes ----------

// LCROSS: the spent Centaur upper stage (nose forward = +Z)
function createCentaurStage() {
  const m = getMaterials();
  const inner = new THREE.Group();
  inner.add(put(cyl(1.5, 1.5, 9.5, m.silver, 32), 0, 0, 0));
  inner.add(put(cyl(1.0, 1.5, 1.2, m.silver, 32), 0, 5.35, 0));
  [-0.5, 0.5].forEach(function (x) {
    inner.add(put(cyl(0.3, 0.65, 1.4, m.bell, 20), x, -5.4, 0));
  });
  return forward(inner, 12);
}

// LCROSS shepherding spacecraft: a ring structure with instruments and a solar panel (nose forward = +Z)
function createLcross() {
  const m = getMaterials();
  const inner = new THREE.Group();
  inner.add(new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.6, 24, 1, true), m.silver));
  inner.add(put(box(0.7, 0.5, 0.5, m.gold), 0, 0, 0.85));
  inner.add(put(box(0.6, 0.4, 0.6, m.white), 0.75, 0, -0.3));
  const panel = box(1.2, 0.03, 0.8, m.solar);
  panel.position.set(-1.4, 0, 0);
  inner.add(panel);
  inner.add(put(cyl(0.12, 0.12, 0.25, m.black, 12), 0, 0.42, 0.3));     // instrument cameras
  return forward(inner, 2.6);
}

// MESSENGER (Mercury): a white sunshade at the front, gold body, two solar panels (nose forward = +Z)
function createMessenger() {
  const m = getMaterials();
  const craft = new THREE.Group();
  const shade = box(2.5, 1.9, 0.08, m.white);
  shade.position.set(0, 0, 0.85);
  craft.add(shade);
  craft.add(put(box(1.3, 1.3, 1.4, m.gold), 0, 0, 0));
  [-1, 1].forEach(function (side) {
    craft.add(strut(V(side * 0.65, 0, 0), V(side * 1.2, 0, 0), 0.04, m.metal));
    craft.add(put(box(1.5, 0.03, 0.7, m.solar), side * 2.0, 0, 0));
  });
  craft.add(strut(V(0, 0.65, -0.3), V(0, 0.65, -3.6), 0.02, m.metal)); // magnetometer boom
  craft.userData.size = 5;
  return craft;
}

// Pioneer Venus probe: a cone-shaped heat shield with a round pressure vessel inside (nose forward = +Z)
function createVenusProbe(large) {
  const m = getMaterials();
  const inner = new THREE.Group();
  const scale = large ? 1.0 : 0.55;
  inner.add(put(cyl(0.2 * scale, 0.75 * scale, 0.45 * scale, m.heat, 32), 0, 0.2 * scale, 0));
  inner.add(put(new THREE.Mesh(new THREE.SphereGeometry(0.4 * scale, 24, 16), m.silver), 0, -0.25 * scale, 0));
  return forward(inner, 1.6 * scale);
}

// ---------- Outer planet spacecraft ----------

// Galileo orbiter: a big umbrella-like antenna on top, spinning body, two power booms and a science boom.
// Forward (+Z) = the antenna side.
function createGalileoOrbiter() {
  const m = getMaterials();
  const craft = new THREE.Group();

  // The 4.8 m antenna was meant to open like an umbrella (it never fully opened in flight)
  const antenna = new THREE.Group();
  const ribs = 18;
  for (let i = 0; i < ribs; i++) {
    const angle = (i / ribs) * Math.PI * 2;
    antenna.add(strut(V(0, 0, 0), V(Math.cos(angle) * 1.6, 0.55, Math.sin(angle) * 1.6), 0.02, m.gold));
  }
  const mesh = dish(1.6, 0.55, m.dish, 18);
  antenna.add(mesh);
  antenna.position.y = 1.7;
  craft.add(antenna);

  craft.add(put(cyl(0.12, 0.12, 0.8, m.white, 12), 0, 1.3, 0));          // antenna mast
  craft.add(put(cyl(0.75, 0.75, 0.7, m.gold, 10), 0, 0.6, 0));            // spinning section
  craft.add(put(cyl(0.6, 0.75, 0.45, m.black, 10), 0, 0, 0));             // despun section
  craft.add(put(cyl(0.18, 0.3, 0.35, m.bell, 12), 0, -0.4, 0));           // main engine

  // Two booms with the radioisotope power generators
  [-1, 1].forEach(function (side) {
    craft.add(strut(V(side * 0.6, 0.6, 0), V(side * 2.4, 0.4, 0.4 * side), 0.035, m.metal));
    const rtg = cyl(0.17, 0.17, 0.9, m.black, 12);
    rtg.rotation.z = Math.PI / 2;
    craft.add(put(rtg, side * 2.3, 0.4, 0.4 * side));
  });

  // Science boom with the magnetometers, and the scan platform with cameras underneath
  craft.add(strut(V(0, 0.6, 0.6), V(0.3, 0.9, 5.5), 0.025, m.metal));
  craft.add(strut(V(0, -0.1, -0.5), V(0, -0.9, -0.9), 0.04, m.metal));
  craft.add(put(box(0.5, 0.35, 0.4, m.white), 0, -1.0, -0.95));

  // Point the antenna forward (+Z)
  const outer = new THREE.Group();
  craft.rotation.x = Math.PI / 2;
  outer.add(craft);
  outer.userData.size = 5;
  return outer;
}

// Galileo's atmosphere probe: a blunt cone-shaped heat shield (front, +Z) and the descent module behind it.
// userData.heatShield is the part that drops off after entry.
function createGalileoProbe() {
  const m = getMaterials();
  const inner = new THREE.Group();

  const shield = new THREE.Group();
  shield.add(put(cyl(0.18, 0.62, 0.42, m.heat, 40), 0, 0.2, 0));          // forebody heat shield
  shield.add(put(cyl(0.62, 0.5, 0.2, m.heat, 40), 0, -0.08, 0));          // aft cover
  inner.add(shield);

  // Descent module: a squat drum with antenna and instrument ports
  const module = new THREE.Group();
  module.add(put(cyl(0.33, 0.36, 0.4, m.silver, 24), 0, -0.25, 0));
  module.add(put(cyl(0.12, 0.12, 0.12, m.black, 12), 0, -0.5, 0));
  module.add(put(box(0.08, 0.06, 0.08, m.gold), 0.3, -0.2, 0.1));
  inner.add(module);

  const outer = forward(inner, 1.3);
  outer.userData.heatShield = shield;
  return outer;
}

// Cassini: tall body with a 4 m dish on top, the gold-wrapped Huygens probe on one side,
// three power generators, and a long magnetometer boom. Forward (+Z) = the dish side.
function createCassini(withHuygens) {
  const m = getMaterials();
  const craft = new THREE.Group();

  const antenna = dish(1.95, 0.5, m.dish, 40);
  antenna.position.y = 3.0;
  craft.add(antenna);
  craft.add(put(cyl(0.1, 0.25, 0.4, m.metal, 12), 0, 3.1, 0));            // feed
  craft.add(put(cyl(0.75, 0.75, 0.6, m.black, 12), 0, 2.6, 0));           // electronics bus
  craft.add(put(cyl(0.7, 0.75, 1.9, m.gold, 24), 0, 1.25, 0));            // propellant tanks in gold blanket
  craft.add(put(cyl(0.55, 0.7, 0.4, m.gold, 24), 0, 0.1, 0));
  [-0.35, 0.35].forEach(function (x) {
    craft.add(put(cyl(0.16, 0.32, 0.55, m.bell, 16), x, -0.35, 0));       // two main engines
  });

  // Three radioisotope power generators near the bottom
  [0, 1, 2].forEach(function (k) {
    const angle = (k * Math.PI * 2) / 3 + 0.4;
    const rtg = cyl(0.16, 0.16, 1.1, m.black, 12);
    rtg.rotation.z = Math.PI / 2;
    rtg.rotation.y = -angle;
    rtg.position.set(Math.cos(angle) * 0.95, 0.15, Math.sin(angle) * 0.95);
    craft.add(rtg);
  });

  // Remote sensing pallet (cameras) and the 11 m magnetometer boom
  craft.add(put(box(0.6, 0.9, 0.35, m.white), 0, 2.0, -0.85));
  craft.add(strut(V(0.7, 2.6, 0), V(5.5, 2.9, 0.2), 0.02, m.metal));

  // Huygens, attached on the side
  let huygens = null;
  if (withHuygens) {
    huygens = new THREE.Group();
    huygens.add(put(cyl(0.18, 1.0, 0.35, m.gold, 40), 0, 0, 0));
    huygens.rotation.x = Math.PI / 2;
    huygens.position.set(0, 1.4, 0.95);
    craft.add(huygens);
  }

  const outer = new THREE.Group();
  craft.rotation.x = Math.PI / 2;
  craft.position.z = -1.5;
  outer.add(craft);
  outer.userData.size = 6.7;
  outer.userData.huygens = huygens;
  outer.userData.engines = [];
  return outer;
}

// Huygens probe (ESA): a wide, shallow heat shield in front (+Z) and the descent module behind.
// userData.heatShield is the front shield that drops off before the descent on parachutes.
function createHuygens() {
  const m = getMaterials();
  const inner = new THREE.Group();

  const shield = new THREE.Group();
  shield.add(put(cyl(0.25, 1.35, 0.35, m.heat, 48), 0, 0.15, 0));
  inner.add(shield);

  const module = new THREE.Group();
  module.add(put(cyl(0.65, 0.65, 0.35, m.silver, 32), 0, -0.2, 0));
  module.add(put(cyl(0.5, 0.65, 0.2, m.gold, 32), 0, -0.45, 0));
  module.add(put(box(0.12, 0.1, 0.12, m.black), 0.45, -0.25, 0.2));       // camera
  inner.add(module);

  const outer = forward(inner, 2.7);
  outer.userData.heatShield = shield;
  return outer;
}

// ---------- Landing hardware: parachute, backshell, sky crane ----------

// A Mars-style parachute. The canopy is above (+Y) and the lines meet at the origin.
export function createParachute(radius) {
  const m = getMaterials();
  const chute = new THREE.Group();
  const height = radius * 2.2;

  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 10, 0, Math.PI * 2, 0, Math.PI * 0.32),
    m.parachute
  );
  canopy.position.y = height - radius * 0.6;
  chute.add(canopy);

  // The "band" below the gap (disk-gap-band design)
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.92, radius * 0.95, radius * 0.25, 32, 1, true),
    m.parachute
  );
  band.position.y = height - radius * 0.95;
  chute.add(band);

  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    chute.add(strut(V(0, 0, 0), V(Math.cos(angle) * radius * 0.94, height - radius * 1.07, Math.sin(angle) * radius * 0.94), radius * 0.004, m.line, 4));
  }

  chute.userData.size = height;
  return chute;
}

// The backshell (cone) and heat shield (userData.heatShield) that carry a Mars lander through the atmosphere.
// The heat shield is at the bottom (-Y), so the cone points up.
export function createBackshell(radius) {
  const m = getMaterials();
  const shell = new THREE.Group();
  shell.add(put(cyl(radius * 0.4, radius, radius * 0.9, m.white, 40), 0, radius * 0.45, 0));
  const shield = new THREE.Group();
  shield.add(put(cyl(radius, radius * 0.3, radius * 0.3, m.heat, 40), 0, -radius * 0.15, 0));
  shell.add(shield);
  shell.userData.heatShield = shield;
  shell.userData.size = radius * 2;
  return shell;
}

// Sky crane descent stage (Curiosity, Perseverance): a frame with fuel tanks and eight engines pointing down
function createSkyCrane() {
  const m = getMaterials();
  const stage = new THREE.Group();

  stage.add(put(box(2.2, 0.35, 2.6, m.metal), 0, 0.5, 0));
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (c) {
    stage.add(put(new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), m.silver), c[0] * 0.65, 0.85, c[1] * 0.75));
  });
  stage.add(put(cyl(0.18, 0.18, 0.3, m.white, 12), 0, 0.9, 0));

  const engines = [];
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (c) {
    [0.15, -0.15].forEach(function (offset) {
      const x = c[0] * 1.15;
      const z = c[1] * 1.3 + offset * c[1];
      const bell = cyl(0.06, 0.12, 0.25, m.bell, 12);
      bell.position.set(x, 0.25, z);
      bell.rotation.x = c[1] * 0.25;
      stage.add(bell);
      engines.push(V(x, 0.1, z));
    });
  });

  stage.userData.size = 3;
  stage.userData.engines = engines;
  return stage;
}

// A small Mars helicopter (upright). Its rotors spin only when flying = true.
function createHelicopter(flying) {
  const m = getMaterials();
  const copter = new THREE.Group();

  copter.add(put(box(0.3, 0.28, 0.3, m.gold), 0, 0.8, 0));
  copter.add(put(box(0.56, 0.02, 0.56, m.solar), 0, 1.06, 0));
  copter.add(put(cyl(0.02, 0.02, 0.35, m.metal, 8), 0, 1.25, 0));

  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (c) {
    copter.add(strut(
      new THREE.Vector3(c[0] * 0.1, 0.68, c[1] * 0.1),
      new THREE.Vector3(c[0] * 0.38, 0.02, c[1] * 0.38),
      0.015, m.metal
    ));
  });

  const rotorTop = new THREE.Group();
  rotorTop.position.y = 1.4;
  rotorTop.add(box(1.25, 0.012, 0.09, m.black));
  rotorTop.add(box(0.09, 0.012, 1.25, m.black));
  copter.add(rotorTop);

  const rotorBottom = new THREE.Group();
  rotorBottom.position.y = 1.3;
  rotorBottom.add(box(1.25, 0.012, 0.09, m.black));
  rotorBottom.add(box(0.09, 0.012, 1.25, m.black));
  rotorBottom.rotation.y = Math.PI / 4;
  copter.add(rotorBottom);

  copter.userData.spinning = Boolean(flying);
  copter.userData.update = function (delta) {
    if (!copter.userData.spinning) return;
    rotorTop.rotation.y += 38 * delta;
    rotorBottom.rotation.y -= 38 * delta;
  };
  copter.userData.size = 1.4;
  return copter;
}


// =====================================================================
// Added for the Spacecraft & Hardware Explorer and the new mission replays.
// All are representative models built in code (not official NASA 3D models).
// Models that unfold have userData.setDeploy(f), f = 0 (stowed) to 1 (deployed).
// Return capsules have userData.chutes (a group shown during splashdown or landing).
// =====================================================================

// Three (or one) parachutes above an upright capsule
function addChutes(group, count, radius, height) {
  const chutes = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const chute = createParachute(radius);
    const angle = (i / count) * Math.PI * 2;
    const spread = count > 1 ? radius * 0.9 : 0;
    chute.position.set(Math.cos(angle) * spread * 0.4, height, Math.sin(angle) * spread * 0.4);
    chute.rotation.set(Math.sin(angle) * 0.25 * (count > 1 ? 1 : 0), 0, -Math.cos(angle) * 0.25 * (count > 1 ? 1 : 0));
    chutes.add(chute);
  }
  chutes.visible = false;
  group.add(chutes);
  group.userData.chutes = chutes;
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

// Pioneer 10 / 11: a 2.74 m dish in front (+Z), a hexagonal equipment box behind it,
// two power-generator booms and a long magnetometer boom.
function createPioneer() {
  const m = getMaterials();
  const probe = new THREE.Group();

  const antenna = dish(1.37, 0.32, m.dish, 40);
  antenna.rotation.x = Math.PI / 2;
  probe.add(antenna);
  probe.add(put(cyl(0.05, 0.12, 0.7, m.metal, 10), 0, 0, 0.45).rotateX(Math.PI / 2));   // feed on a tripod
  [0, 1, 2].forEach(function (k) {
    const a = (k / 3) * Math.PI * 2;
    probe.add(strut(V(Math.cos(a) * 0.9, Math.sin(a) * 0.9, 0.3), V(0, 0, 0.8), 0.012, m.metal));
  });

  const bus = cyl(0.45, 0.45, 0.36, m.gold, 6);
  bus.rotation.x = Math.PI / 2;
  probe.add(put(bus, 0, 0, -0.35));
  probe.add(put(box(0.36, 0.22, 0.25, m.silver), 0, -0.5, -0.35));            // science compartment

  [-1, 1].forEach(function (side) {                                          // two RTG booms, 120 degrees apart
    const end = V(side * 1.5, 0.75, -0.45);
    probe.add(strut(V(side * 0.35, 0.18, -0.35), end, 0.02, m.metal));
    const rtg = cyl(0.1, 0.1, 0.45, m.black, 12);
    rtg.rotation.z = Math.PI / 2;
    probe.add(put(rtg, end.x, end.y, end.z));
  });
  probe.add(strut(V(0, -0.4, -0.35), V(0, -3.2, -0.6), 0.008, m.metal));     // magnetometer boom
  probe.add(put(box(0.12, 0.12, 0.12, m.white), 0, -3.2, -0.6));
  probe.add(put(box(0.16, 0.002, 0.1, m.gold), 0.46, 0.0, -0.35).rotateZ(Math.PI / 2)); // the plaque

  probe.userData.size = 4.2;
  return probe;
}

// New Horizons: a triangular, gold-wrapped body, a 2.1 m dish in front (+Z), and one power generator on a corner
function createNewHorizons() {
  const m = getMaterials();
  const craft = new THREE.Group();

  const body = cyl(0.75, 0.75, 0.55, m.gold, 3);
  body.rotation.x = Math.PI / 2;
  craft.add(put(body, 0, 0, -0.25));
  const antenna = dish(1.05, 0.25, m.dish, 40);
  antenna.rotation.x = Math.PI / 2;
  craft.add(put(antenna, 0, 0, 0.12));
  craft.add(put(cyl(0.03, 0.08, 0.35, m.metal, 10).rotateX(Math.PI / 2), 0, 0, 0.35));

  const rtg = cyl(0.13, 0.13, 1.0, m.black, 12);                              // RTG sticking out of one corner
  rtg.rotation.z = Math.PI / 2.6;
  craft.add(put(rtg, 0.95, -0.55, -0.25));
  for (let i = 0; i < 6; i++) {                                              // cooling fins
    const fin = box(0.02, 0.3, 0.22, m.black);
    fin.position.set(0.95 + Math.cos(Math.PI / 2.6) * (i - 2.5) * 0.15, -0.55 + Math.sin(Math.PI / 2.6) * (i - 2.5) * 0.15, -0.25);
    fin.rotation.z = Math.PI / 2.6;
    craft.add(fin);
  }
  craft.add(put(cyl(0.11, 0.11, 0.3, m.black, 16).rotateX(Math.PI / 2), -0.35, 0.45, -0.05));   // LORRI telescope
  craft.add(put(box(0.25, 0.18, 0.2, m.silver), 0.3, 0.45, -0.1));             // Ralph
  craft.userData.size = 2.6;
  return craft;
}

// Hubble: a 13 m silver tube with the aperture door at the front (+Z), two solar wings and two antenna booms.
// setDeploy: the solar wings swing out from the body and unroll; the door opens.
function createHubble() {
  const m = getMaterials();
  const scope = new THREE.Group();

  const tubeMesh = cyl(1.1, 1.1, 6.5, m.silver, 32);
  tubeMesh.rotation.x = Math.PI / 2;
  scope.add(put(tubeMesh, 0, 0, 0.6));
  const aft = cyl(1.4, 1.4, 3.6, m.silver, 32);                               // wider equipment section at the back
  aft.rotation.x = Math.PI / 2;
  scope.add(put(aft, 0, 0, -4.2));
  [-2.4, -5.8].forEach(function (z) {
    const band = cyl(1.42, 1.42, 0.12, m.black, 32);
    band.rotation.x = Math.PI / 2;
    scope.add(put(band, 0, 0, z));
  });
  const ring = cyl(1.2, 1.2, 0.3, m.black, 32);
  ring.rotation.x = Math.PI / 2;
  scope.add(put(ring, 0, 0, 3.85));

  const door = new THREE.Group();                                             // aperture door, hinged on top
  door.position.set(0, 1.1, 4.0);
  const doorPanel = cyl(1.15, 1.15, 0.08, m.white, 32);
  doorPanel.position.set(0, -1.1, 0.0);
  doorPanel.rotation.x = Math.PI / 2;
  door.add(doorPanel);
  scope.add(door);

  const wings = [];
  [-1, 1].forEach(function (side) {
    const hinge = new THREE.Group();
    hinge.position.set(side * 1.45, 0, -2.4);
    const mast = strut(V(0, 0, 0), V(side * 0.8, 0, 0), 0.04, m.metal);
    hinge.add(mast);
    const panel = box(5.4, 0.03, 2.2, m.solar);                                // rolled-out blanket
    panel.position.set(side * 3.5, 0, 0);
    hinge.add(panel);
    scope.add(hinge);
    wings.push({ hinge: hinge, panel: panel, side: side });
  });

  [-1, 1].forEach(function (side) {                                          // two high-gain antennas on booms
    scope.add(strut(V(0, side * 1.1, -1.5), V(0, side * 2.6, -1.5), 0.04, m.metal));
    const a = dish(0.4, 0.1, m.dish, 20);
    a.position.set(0, side * 2.65, -1.5);
    a.rotation.x = side > 0 ? 0 : Math.PI;
    scope.add(a);
  });

  scope.userData.size = 13;
  scope.userData.setDeploy = function (f) {
    const swing = clamp01(f * 2);
    const unroll = clamp01(f * 2 - 0.6);
    wings.forEach(function (w) {
      w.hinge.rotation.z = 0;
      w.hinge.rotation.y = w.side * (1 - swing) * (Math.PI / 2);   // folded along the tube, then out
      w.panel.scale.x = 0.08 + 0.92 * unroll;
      w.panel.position.x = w.side * (0.8 + 2.7 * (0.08 + 0.92 * unroll));
    });
    door.rotation.x = -clamp01(f * 1.6 - 0.6) * 1.75;
  };
  scope.userData.setDeploy(1);
  return scope;
}

// James Webb Space Telescope: 18 gold hexagonal mirror segments, a secondary mirror on three struts,
// and a five-layer, kite-shaped sunshield below. Forward (+Z) = where the mirror looks.
// setDeploy: first the sunshield spreads out (0 to 0.6), then the two mirror wings swing into place (0.6 to 1).
function createJwst() {
  const m = getMaterials();
  const inner = new THREE.Group();

  const shield = new THREE.Group();
  const shieldShape = new THREE.Shape();
  shieldShape.moveTo(0, 7.1); shieldShape.lineTo(10.5, 0); shieldShape.lineTo(0, -7.1); shieldShape.lineTo(-10.5, 0);
  shieldShape.closePath();
  const layerGeometry = new THREE.ShapeGeometry(shieldShape);
  const layerMaterial = new THREE.MeshStandardMaterial({ color: 0xc9a9d6, metalness: 0.7, roughness: 0.35, side: THREE.DoubleSide });
  for (let i = 0; i < 5; i++) {
    const layer = new THREE.Mesh(layerGeometry, layerMaterial);
    layer.rotation.x = -Math.PI / 2;
    layer.position.y = -i * 0.18;
    layer.scale.setScalar(1 - i * 0.03);
    shield.add(layer);
  }
  inner.add(shield);

  inner.add(put(box(2.2, 1.0, 2.2, m.black), 0, -1.6, 0));                    // spacecraft bus (under the shield)
  inner.add(put(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.04, 1.2), m.solar), 0, -2.2, -1.6));

  const optics = new THREE.Group();                                           // the telescope, standing on the shield
  optics.position.y = 0.6;
  inner.add(optics);
  optics.add(put(box(1.2, 4.2, 1.2, m.black), 0, 2.1, -1.0));                 // backplane tower

  const hexGeometry = new THREE.CylinderGeometry(0.66, 0.66, 0.08, 6);
  // Not fully metallic: with nothing around to reflect, a pure metal would look black
  const goldMirror = new THREE.MeshStandardMaterial({ color: 0xe2b23c, metalness: 0.45, roughness: 0.28, emissive: 0x3d2a06 });
  const centerSegments = new THREE.Group();
  const wingL = new THREE.Group();
  const wingR = new THREE.Group();
  // 18 segments in two hexagonal rings around an empty center. The three segments at each far side
  // sit on the two "wings" that were folded back for launch.
  const R = 0.69;
  for (let q = -2; q <= 2; q++) {
    for (let r = -2; r <= 2; r++) {
      const ring = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
      if (ring < 1 || ring > 2) continue;
      const hex = new THREE.Mesh(hexGeometry, goldMirror);
      hex.rotation.x = Math.PI / 2;
      hex.rotation.y = Math.PI / 6; // flat-top hexagons
      const x = 1.5 * R * q;
      const y = Math.sqrt(3) * R * (r + q / 2);
      const group = q === -2 ? wingL : q === 2 ? wingR : centerSegments;
      hex.position.set(x, 2.4 + y, 0);
      group.add(hex);
    }
  }
  optics.add(centerSegments);
  // Wings hinge between the center and the outer column, and fold backward when stowed
  [[wingL, -1], [wingR, 1]].forEach(function (entry) {
    const hinge = new THREE.Group();
    const hingeX = entry[1] * 2.25 * R;
    hinge.position.set(hingeX, 0, -0.05);
    entry[0].position.x = -hingeX;
    hinge.add(entry[0]);
    optics.add(hinge);
    entry[0].userData.hinge = hinge;
  });

  const secondary = new THREE.Group();                                        // secondary mirror on a tripod
  secondary.position.set(0, 2.4, 0);
  const secondaryMirror = cyl(0.37, 0.37, 0.08, goldMirror, 6);
  secondaryMirror.rotation.x = Math.PI / 2;
  secondaryMirror.position.z = 7;
  secondary.add(secondaryMirror);
  secondary.add(strut(V(0, -2.4, 0.1), V(0, 0, 7), 0.05, m.black));
  secondary.add(strut(V(-1.6, 1.8, 0.1), V(0, 0, 7), 0.05, m.black));
  secondary.add(strut(V(1.6, 1.8, 0.1), V(0, 0, 7), 0.05, m.black));
  optics.add(secondary);

  // The mirror looks toward +Z, with the sunshield flat underneath it
  const outer = new THREE.Group();
  outer.add(inner);
  outer.userData.size = 21;

  outer.userData.setDeploy = function (f) {
    const s = clamp01(f / 0.6);
    shield.scale.set(0.12 + 0.88 * s, 1, 0.12 + 0.88 * s);
    shield.children.forEach(function (layer, i) { layer.position.y = -i * 0.18 * s; });
    const w = clamp01((f - 0.6) / 0.4);
    wingL.userData.hinge.rotation.y = -(1 - w) * Math.PI * 0.55;
    wingR.userData.hinge.rotation.y = (1 - w) * Math.PI * 0.55;
    secondary.rotation.x = (1 - clamp01((f - 0.45) / 0.3)) * -1.35;
  };
  outer.userData.setDeploy(1);
  return outer;
}

// Lunar Reconnaissance Orbiter: a boxy body, one big solar panel on a hinge, a dish on a boom,
// and the instrument deck (cameras) facing the Moon.
function createLro() {
  const m = getMaterials();
  const craft = new THREE.Group();
  craft.add(put(box(1.4, 1.9, 1.4, m.gold), 0, 0, 0));
  craft.add(put(box(1.45, 0.25, 1.45, m.black), 0, 0.95, 0));
  [-0.35, 0, 0.35].forEach(function (x, i) {                                  // LROC cameras and other instruments
    craft.add(put(cyl(0.13, 0.13, 0.45 + i * 0.05, m.black, 16), x, 1.2, 0.35));
  });
  craft.add(put(box(0.35, 0.3, 0.35, m.white), -0.3, 1.2, -0.3));
  craft.add(strut(V(0.7, -0.3, 0), V(1.2, -0.3, 0), 0.05, m.metal));
  craft.add(put(box(3.2, 0.04, 2.2, m.solar), 2.8, -0.3, 0));                 // solar array
  craft.add(strut(V(-0.7, -0.6, 0), V(-1.8, -1.0, 0), 0.04, m.metal));
  const hga = dish(0.38, 0.12, m.dish, 20);
  hga.position.set(-1.85, -1.05, 0);
  hga.rotation.z = Math.PI / 2;
  craft.add(hga);
  craft.userData.size = 6;
  return craft;
}

// Orion: the crew module (forward, +Z) on the European Service Module with four X-shaped solar wings.
function createOrion() {
  const m = getMaterials();
  const inner = new THREE.Group();
  inner.add(put(cyl(0.95, 0.95, 1.6, m.white, 40), 0, 0.8, 0));               // service module
  inner.add(put(cyl(0.96, 0.96, 0.08, m.black, 40), 0, 1.6, 0));
  inner.add(put(cyl(0.5, 0.97, 1.3, m.silver, 40), 0, 2.3, 0));               // crew module
  inner.add(put(cyl(0.95, 0.95, 0.12, m.heat, 40), 0, 1.68, 0));
  inner.add(put(cyl(0.22, 0.22, 0.2, m.metal, 16), 0, 3.05, 0));              // docking hatch
  inner.add(put(cyl(0.18, 0.45, 0.7, m.bell, 24), 0, -0.3, 0));               // main engine
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const dir = V(Math.cos(a), 0, Math.sin(a));
    inner.add(strut(dir.clone().multiplyScalar(0.95).setY(0.6), dir.clone().multiplyScalar(1.4).setY(0.6), 0.04, m.metal));
    const wing = box(3.2, 0.03, 0.9, m.solar);
    wing.position.copy(dir.clone().multiplyScalar(3.0).setY(0.6));
    wing.rotation.y = -a;
    inner.add(wing);
  }
  const craft = forward(inner, 7.5);
  const flame = makeFlame(0.35, 1.0, -0.9, true);
  inner.add(flame);
  craft.userData.flame = flame;
  return craft;
}

// Upright return capsules (heat shield at the bottom, -Y), with parachutes for landing or splashdown
function createApolloCm() {
  const m = getMaterials();
  const capsule = new THREE.Group();
  capsule.add(put(cyl(0.13, 0.98, 1.05, m.silver, 40), 0, 0.6, 0));
  capsule.add(put(cyl(0.98, 0.9, 0.12, m.heat, 40), 0, 0.03, 0));
  capsule.add(put(box(0.18, 0.12, 0.05, m.black), 0.3, 0.75, 0.55));            // windows
  capsule.add(put(box(0.18, 0.12, 0.05, m.black), -0.3, 0.75, 0.55));
  addChutes(capsule, 3, 1.4, 1.2);
  capsule.userData.size = 1.3;
  return capsule;
}

function createOrionCm() {
  const m = getMaterials();
  const capsule = new THREE.Group();
  capsule.add(put(cyl(0.5, 1.0, 1.3, m.silver, 40), 0, 0.72, 0));
  capsule.add(put(cyl(1.0, 0.92, 0.12, m.heat, 40), 0, 0.03, 0));
  capsule.add(put(cyl(0.22, 0.22, 0.2, m.metal, 16), 0, 1.45, 0));
  addChutes(capsule, 3, 1.5, 1.5);
  capsule.userData.size = 1.6;
  return capsule;
}

// A small sample return capsule (OSIRIS-REx, Stardust): a blunt cone with one parachute
function createSampleCapsule() {
  const m = getMaterials();
  const capsule = new THREE.Group();
  capsule.add(put(cyl(0.18, 0.4, 0.3, m.white, 32), 0, 0.22, 0));
  capsule.add(put(cyl(0.4, 0.3, 0.12, m.heat, 32), 0, 0.03, 0));
  addChutes(capsule, 1, 0.7, 0.8);
  capsule.userData.size = 0.8;
  return capsule;
}

// Gemini capsule with its white adapter section behind it (forward, +Z = the capsule nose)
function createGemini() {
  const m = getMaterials();
  const inner = new THREE.Group();
  inner.add(put(cyl(1.5, 1.5, 0.2, m.white, 36), 0, -1.2, 0));
  inner.add(put(cyl(1.15, 1.5, 1.4, m.white, 36), 0, -0.4, 0));              // adapter section
  inner.add(put(cyl(0.48, 1.15, 1.4, m.black, 36), 0, 1.0, 0));              // re-entry module
  inner.add(put(cyl(0.38, 0.48, 0.9, m.black, 24), 0, 2.15, 0));            // nose (radar and parachute section)
  inner.add(put(box(0.3, 0.25, 0.08, m.metal), 0.3, 1.05, 0.62));
  inner.add(put(box(0.3, 0.25, 0.08, m.metal), -0.3, 1.05, 0.62));
  return forward(inner, 3.8);
}

function createGeminiCm() {
  const m = getMaterials();
  const capsule = new THREE.Group();
  capsule.add(put(cyl(0.48, 1.15, 1.4, m.black, 36), 0, 0.75, 0));
  capsule.add(put(cyl(1.15, 1.1, 0.1, m.heat, 36), 0, 0.03, 0));
  capsule.add(put(cyl(0.38, 0.48, 0.6, m.black, 24), 0, 1.75, 0));
  addChutes(capsule, 1, 2.0, 2.2);
  capsule.userData.size = 2.2;
  return capsule;
}

// OSIRIS-REx: a box with two solar panels, a dish on top, the TAGSAM sampling arm, and the capsule on top
function createOsirisRex() {
  const m = getMaterials();
  const craft = new THREE.Group();
  craft.add(put(box(2.0, 2.0, 2.0, m.silver), 0, 0, 0));
  craft.add(put(box(2.02, 0.3, 2.02, m.gold), 0, 0.85, 0));
  [-1, 1].forEach(function (side) {
    craft.add(strut(V(side, 0.3, 0), V(side * 1.4, 0.3, 0), 0.05, m.metal));
    craft.add(put(box(2.6, 0.04, 1.8, m.solar), side * 2.7, 0.3, 0));
  });
  const hga = dish(0.9, 0.22, m.dish, 32);
  hga.position.set(0, 1.0, -0.4);
  hga.rotation.x = -0.3;
  craft.add(hga);
  craft.add(put(cyl(0.18, 0.4, 0.3, m.white, 24), 0.5, 1.15, 0.6));          // sample return capsule
  const arm = new THREE.Group();                                              // TAGSAM
  arm.add(strut(V(0, -1.0, 0.6), V(0, -2.1, 1.4), 0.04, m.metal));
  arm.add(strut(V(0, -2.1, 1.4), V(0, -3.0, 1.6), 0.04, m.metal));
  arm.add(put(cyl(0.18, 0.15, 0.12, m.metal, 16), 0, -3.05, 1.6));
  craft.add(arm);
  craft.userData.size = 6.2;
  return craft;
}

// Stardust: a box body with two solar panels, Whipple bumper shields in front (+Z),
// the capsule at the back and the tennis-racket-like aerogel collector (setDeploy raises it)
function createStardust() {
  const m = getMaterials();
  const craft = new THREE.Group();
  craft.add(put(box(1.0, 1.0, 1.5, m.gold), 0, 0, 0));
  [-1, 1].forEach(function (side) {
    craft.add(put(box(2.2, 0.04, 0.9, m.solar), side * 1.65, 0, 0.1));
  });
  [0.95, 1.15].forEach(function (z, i) {                                      // Whipple shields
    craft.add(put(box(1.3 + i * 0.1, 1.2 + i * 0.1, 0.04, m.white), 0, 0, z));
  });
  craft.add(put(cyl(0.22, 0.4, 0.3, m.white, 24).rotateX(-Math.PI / 2), 0, 0, -0.95)); // capsule at the back
  const collector = new THREE.Group();
  collector.position.set(0, 0.5, -0.9);
  const racket = new THREE.Group();
  racket.add(put(box(0.8, 0.04, 0.6, m.metal), 0, 0, 0.0));
  for (let i = -3; i <= 3; i++) racket.add(put(box(0.02, 0.05, 0.6, m.dish), i * 0.11, 0, 0));
  racket.position.set(0, 0.0, 0.0);
  collector.add(racket);
  collector.add(strut(V(0, 0, 0), V(0, 0, 0.0001), 0.02, m.metal));
  craft.add(collector);
  craft.userData.size = 4.2;
  craft.userData.setDeploy = function (f) {
    collector.rotation.x = -f * Math.PI / 2;
    racket.position.set(0, 0.7 * f, 0);
  };
  craft.userData.setDeploy(1);
  return craft;
}

// Skylab: the big orbital workshop with the one solar wing that survived, the gold parasol sunshade
// the first crew put up, and the solar telescope mount with its four "windmill" arrays.
function createSkylab() {
  const m = getMaterials();
  const inner = new THREE.Group();
  inner.add(put(cyl(3.3, 3.3, 14.6, m.white, 36), 0, 0, 0));                 // workshop
  inner.add(put(cyl(3.32, 3.32, 0.4, m.black, 36), 0, 7.1, 0));
  inner.add(put(cyl(1.6, 1.6, 5.2, m.silver, 24), 0, 9.9, 0));               // airlock module
  inner.add(put(cyl(1.5, 1.5, 5.2, m.white, 24), 0, 15.1, 0));               // docking adapter
  const parasol = box(7.0, 0.05, 7.0, m.gold);                                // improvised sunshade
  parasol.position.set(0, 0, 3.45);
  parasol.rotation.x = Math.PI / 2;
  inner.add(parasol);
  inner.add(strut(V(3.3, 3.0, 0), V(4.0, 3.0, 0), 0.08, m.metal));            // surviving solar wing
  inner.add(put(box(9.5, 0.06, 4.6, m.solar), 8.8, 2.0, 0).rotateZ(0));
  const atm = new THREE.Group();                                              // Apollo Telescope Mount
  atm.position.set(0, 14.8, 3.6);
  atm.add(put(cyl(1.2, 1.2, 3.0, m.gold, 8).rotateX(Math.PI / 2), 0, 0, 0));
  const blades = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const blade = new THREE.Group();
    blade.rotation.z = a;
    const panel = box(6.5, 2.2, 0.05, m.solar);
    panel.position.x = 4.3;
    blade.add(panel);
    atm.add(blade);
    blades.push(panel);
  }
  inner.add(atm);
  const station = forward(inner, 30);
  station.userData.setDeploy = function (f) {
    blades.forEach(function (panel) {
      panel.scale.x = 0.1 + 0.9 * f;
      panel.position.x = 1.2 + 3.1 * (0.1 + 0.9 * f);
    });
  };
  station.userData.setDeploy(1);
  return station;
}

// Zarya (with two solar wings) and Unity. setDeploy moves Unity in until it is joined (f = 1).
function createZaryaUnity() {
  const m = getMaterials();
  const inner = new THREE.Group();
  inner.add(put(cyl(2.05, 2.05, 9.0, m.white, 32), 0, 0, 0));                // Zarya, main body
  inner.add(put(cyl(1.35, 2.05, 2.4, m.white, 32), 0, 5.7, 0));              // tapered front
  inner.add(put(cyl(0.7, 0.7, 1.0, m.metal, 16), 0, 7.4, 0));
  inner.add(put(cyl(2.07, 2.07, 0.3, m.black, 32), 0, -2, 0));
  [-1, 1].forEach(function (side) {
    inner.add(strut(V(side * 2.05, -3.2, 0), V(side * 3, -3.2, 0), 0.08, m.metal));
    inner.add(put(box(10.6, 0.06, 3.3, m.solar), side * 8.2, -3.2, 0));
  });
  const unity = new THREE.Group();
  unity.add(put(cyl(2.25, 2.25, 5.5, m.silver, 32), 0, 0, 0));               // Unity node
  unity.add(put(cyl(1.0, 1.4, 2.0, m.white, 24), 0, 3.6, 0));                 // mating adapter
  unity.add(put(cyl(1.0, 1.4, 2.0, m.white, 24), 0, -3.6, 0).rotateX(Math.PI));
  inner.add(unity);
  const station = forward(inner, 22);
  station.userData.setDeploy = function (f) {
    unity.position.y = 11.6 + (1 - f) * 12;
    unity.visible = f > 0.01;
  };
  station.userData.setDeploy(1);
  return station;
}

// ---------- NLC-2 (new — safe to remove on request): Dawn, NEAR Shoemaker, ALSEP ----------

// Dawn: a gold box body with a large dish facing forward (+Z), two huge solar wings
// spanning 19.7 m, three ion engine bells underneath and a magnetometer boom.
function createDawn() {
  const m = getMaterials();
  const craft = new THREE.Group();

  // Body (1.64 x 1.27 x 1.77 m) wrapped in gold thermal blanket
  craft.add(put(box(1.27, 1.77, 1.64, m.gold), 0, 0, 0));

  // The fixed 1.52 m high-gain dish on the front face (pointing +Y until rotated below)
  const antenna = new THREE.Group();
  antenna.add(strut(V(0, 0.9, 0), V(0, 1.15, 0), 0.05, m.metal));            // feed support
  antenna.add(dish(0.78, 0.3, m.dish, 24));
  antenna.position.y = 0.9;
  craft.add(antenna);

  // Two long thin solar wings (19.7 m tip-to-tip on the real spacecraft)
  [-1, 1].forEach(function (side) {
    craft.add(strut(V(side * 0.63, 0, 0), V(side * 1.1, 0, 0), 0.04, m.metal));
    craft.add(put(box(8.2, 0.05, 2.3, m.solar), side * 5.2, 0, 0));
  });

  // Three ion engine bells on the back face, with small hydrazine thruster clusters
  [-1, 0, 1].forEach(function (i) {
    craft.add(put(cyl(0.05, 0.14, 0.22, m.bell, 12), i * 0.42, -1.02, 0));
    craft.add(put(box(0.16, 0.1, 0.1, m.white), i * 0.42, -0.95, 0.5));
  });

  // Magnetometer boom on the opposite side of the dish
  craft.add(strut(V(0.6, -0.85, 0), V(1.9, -2.3, 0.2), 0.02, m.metal));
  craft.add(put(cyl(0.05, 0.05, 0.25, m.white, 8), 1.9, -2.3, 0.2));

  // Point the dish forward (+Z), like Galileo
  const outer = new THREE.Group();
  craft.rotation.x = Math.PI / 2;
  outer.add(craft);
  outer.userData.size = 10;
  return outer;
}

// NEAR Shoemaker: an eight-sided gold bus with four solar panels in a cross,
// a dish antenna facing forward (+Z) and a magnetometer boom.
function createNearShoemaker() {
  const m = getMaterials();
  const craft = new THREE.Group();

  // Eight-sided bus (the real spacecraft is a 1.8 m octagonal prism)
  craft.add(put(cyl(0.9, 0.9, 0.9, m.gold, 8), 0, 0, 0));
  craft.add(put(cyl(0.9, 0.75, 0.18, m.black, 8), 0, -0.55, 0));             // engine section

  // Four solar panels in a cross (NEAR's actual layout)
  [-1, 1].forEach(function (side) {
    craft.add(strut(V(side * 0.85, 0, 0), V(side * 1.05, 0, 0), 0.04, m.metal));
    craft.add(put(box(2.0, 0.04, 0.85, m.solar), side * 2.0, 0, 0));
    craft.add(strut(V(0, 0, side * 0.85), V(0, 0, side * 1.05), 0.04, m.metal));
    craft.add(put(box(0.85, 0.04, 2.0, m.solar), 0, 0, side * 2.0));
  });

  // Dish antenna on the front face (+Y here; forward() turns it to +Z)
  const antenna = new THREE.Group();
  antenna.add(strut(V(0, 0.45, 0), V(0, 0.7, 0), 0.04, m.metal));
  antenna.add(dish(0.45, 0.2, m.dish, 20));
  antenna.position.y = 0.55;
  craft.add(antenna);

  // Magnetometer boom out the back (opposite the dish)
  craft.add(strut(V(0.4, -0.45, 0), V(0.9, -1.7, 0.25), 0.02, m.metal));
  craft.add(put(cyl(0.04, 0.04, 0.2, m.white, 8), 0.9, -1.7, 0.25));

  const outer = forward(craft, 3.5);
  return outer;
}

// ALSEP (Apollo 15): the surface experiments package — an upright central station
// with an antenna dish on a mast, a black RTG power unit beside it, and thin
// cables running out to the experiments.
function createAlsep() {
  const m = getMaterials();
  const group = new THREE.Group();

  // Central station: a boxy gold-wrapped stand with electronics on top
  group.add(put(box(0.34, 0.5, 0.28, m.silver), 0, 0.25, 0));
  group.add(put(box(0.5, 0.32, 0.42, m.gold), 0, 0.66, 0));

  // Antenna dish on a tilted mast, pointing at Earth
  const antenna = new THREE.Group();
  antenna.add(strut(V(0, 0, 0), V(0, 0.55, 0), 0.015, m.metal, 8));
  const mesh = dish(0.17, 0.09, m.dish, 16);
  mesh.rotation.x = -0.5;
  antenna.add(mesh);
  antenna.position.set(-0.32, 0.82, 0);
  group.add(antenna);
  group.add(strut(V(-0.12, 0.82, 0), V(-0.28, 0.82, 0), 0.012, m.metal));    // mast brace

  // RTG: a black finned power unit standing beside the station
  group.add(put(box(0.3, 0.55, 0.22, m.black), 0.42, 0.28, 0));
  for (let i = -1; i <= 1; i++) {
    group.add(put(box(0.02, 0.4, 0.26, m.black), 0.42, 0.28, i * 0.14));
  }
  group.add(strut(V(0.2, 0.1, 0), V(0.34, 0.1, 0), 0.01, m.metal));          // power cable

  // Thin cables running out to the sub-experiments
  group.add(strut(V(0.25, 0.05, 0.2), V(0.85, 0.02, 0.65), 0.008, m.metal));
  group.add(strut(V(0.25, 0.05, -0.2), V(0.8, 0.02, -0.7), 0.008, m.metal));
  group.add(strut(V(-0.25, 0.05, 0.15), V(-0.9, 0.02, 0.35), 0.008, m.metal));

  group.userData.size = 1.4;
  return group;
}

// ---------- end NLC-2 ----------

// ---------- Scientific instruments (upright, they stand on the ground) ----------

// Apollo 11 Laser Ranging Retroreflector: a tilted panel of 100 small glass prisms on a stand
function createLrrr() {
  const m = getMaterials();
  const group = new THREE.Group();
  const panel = new THREE.Group();
  panel.add(put(box(0.46, 0.04, 0.46, m.silver), 0, 0, 0));
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      panel.add(put(cyl(0.018, 0.018, 0.02, m.black, 8), -0.2 + i * 0.045, 0.03, -0.2 + j * 0.045));
    }
  }
  panel.position.set(0, 0.32, 0);
  panel.rotation.x = -0.45;
  group.add(panel);
  group.add(strut(V(-0.2, 0, 0.15), V(-0.2, 0.3, 0.0), 0.012, m.metal));
  group.add(strut(V(0.2, 0, 0.15), V(0.2, 0.3, 0.0), 0.012, m.metal));
  group.add(strut(V(0, 0, -0.25), V(0, 0.35, -0.1), 0.012, m.metal));
  group.userData.size = 0.6;
  return group;
}

// Apollo 11 Passive Seismic Experiment: a drum-shaped seismometer with two solar panels
function createPse() {
  const m = getMaterials();
  const group = new THREE.Group();
  group.add(put(cyl(0.2, 0.22, 0.38, m.gold, 24), 0, 0.19, 0));
  group.add(put(cyl(0.05, 0.05, 0.1, m.metal, 10), 0, 0.43, 0));
  [-1, 1].forEach(function (side) {
    group.add(put(box(0.55, 0.02, 0.45, m.solar), side * 0.5, 0.38, 0));
  });
  group.add(strut(V(0.15, 0.4, 0), V(0.25, 0.75, 0), 0.008, m.metal));      // antenna
  group.userData.size = 1.3;
  return group;
}

// MOXIE: a gold-wrapped box (about the size of a car battery) inside Perseverance, shown on its own
function createMoxie() {
  const m = getMaterials();
  const group = new THREE.Group();
  group.add(put(box(0.24, 0.24, 0.31, m.gold), 0, 0.12, 0));
  group.add(put(cyl(0.02, 0.02, 0.1, m.metal, 8).rotateZ(Math.PI / 2), 0.16, 0.16, 0.08));
  group.add(put(cyl(0.02, 0.02, 0.1, m.metal, 8).rotateZ(Math.PI / 2), 0.16, 0.16, -0.08));
  group.add(put(box(0.18, 0.02, 0.18, m.black), 0, 0.25, 0));
  group.userData.size = 0.4;
  return group;
}

// InSight's SEIS seismometer under its dome-shaped wind and thermal shield
function createSeis() {
  const m = getMaterials();
  const group = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.35, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), m.silver);
  group.add(dome);
  group.add(put(cyl(0.36, 0.38, 0.04, m.metal, 32), 0, 0.01, 0));
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.05, 32, 1, true), m.airbag);
  skirt.position.y = 0.0;
  group.add(skirt);
  group.add(strut(V(0.3, 0.05, 0), V(0.75, 0.0, 0.1), 0.012, m.black));     // tether
  group.userData.size = 0.8;
  return group;
}

// Crew Dragon: the capsule (nose cone hinged on top) on its trunk, which carries solar cells and small fins.
function createDragon() {
  const m = getMaterials();
  const inner = new THREE.Group();
  inner.add(put(cyl(1.85, 1.85, 2.6, m.white, 36), 0, -1.3, 0));            // trunk
  inner.add(put(cyl(1.865, 1.865, 1.2, m.solar, 36), 0, -1.6, 0));           // solar cells on one half
  [0, 1, 2, 3].forEach(function (i) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const fin = box(0.05, 1.1, 0.6, m.white);
    fin.position.set(Math.cos(a) * 1.95, -2.1, Math.sin(a) * 1.95);
    fin.rotation.y = -a;
    inner.add(fin);
  });
  inner.add(put(cyl(1.85, 1.85, 0.12, m.heat, 36), 0, 0.05, 0));            // heat shield
  inner.add(put(cyl(1.15, 1.85, 2.0, m.white, 36), 0, 1.1, 0));             // capsule
  inner.add(put(cyl(1.16, 1.86, 0.25, m.black, 36), 0, 0.6, 0));            // dark band with the Draco thrusters
  [0, 1, 2, 3].forEach(function (i) {
    const a = (i / 4) * Math.PI * 2 + 0.3;
    inner.add(put(box(0.36, 0.22, 0.1, m.black), Math.cos(a) * 1.45, 1.0, Math.sin(a) * 1.45));
  });
  const noseCone = put(cyl(0.3, 1.1, 0.6, m.white, 36), 0, 2.4, 0);          // nose cone (opens in orbit)
  inner.add(noseCone);
  return forward(inner, 8);
}

// Crew Dragon coming home: the capsule alone, standing upright (heat shield down). Before re-entry the
// trunk is jettisoned, so it is not drawn here.
function createDragonCapsule() {
  const m = getMaterials();
  const capsule = new THREE.Group();
  capsule.add(put(cyl(1.85, 1.85, 0.12, m.heat, 36), 0, 0.05, 0));          // heat shield
  capsule.add(put(cyl(1.15, 1.85, 2.0, m.white, 36), 0, 1.1, 0));           // capsule
  capsule.add(put(cyl(1.16, 1.86, 0.25, m.black, 36), 0, 0.6, 0));          // dark band with the Draco thrusters
  [0, 1, 2, 3].forEach(function (i) {
    const a = (i / 4) * Math.PI * 2 + 0.3;
    capsule.add(put(box(0.36, 0.22, 0.1, m.black), Math.cos(a) * 1.45, 1.0, Math.sin(a) * 1.45));
  });
  capsule.add(put(cyl(0.3, 1.1, 0.6, m.white, 36), 0, 2.4, 0));             // nose cone (closed for landing)
  capsule.userData.size = 4.2;
  return capsule;
}

// ---------- Choose a model by name ----------
export function createModel(name) {
  switch (name) {
    case "voyager": return createVoyager();
    case "parker": return createParker();
    case "apollo-stack": return createApolloStack();
    case "lunar-module": return createLunarModule();
    case "lm-ascent": return createLmAscent();
    case "capsule": return createCapsule();
    case "rover": return createMarsRover("curiosity");
    case "curiosity": return createMarsRover("curiosity");
    case "perseverance": return createMarsRover("perseverance");
    case "mer-rover": return createMerRover();
    case "sojourner": return createSojourner();
    case "pathfinder-lander": return createPathfinderLander();
    case "airbags": return createAirbagBall();
    case "viking-lander": return createVikingLander();
    case "phoenix": return createDeckLander("phoenix");
    case "insight": return createDeckLander("insight");
    case "surveyor": return createSurveyor();
    case "lrv": return createLunarRover();
    case "blue-ghost": return createBlueGhost();
    case "centaur": return createCentaurStage();
    case "lcross": return createLcross();
    case "messenger": return createMessenger();
    case "venus-probe-large": return createVenusProbe(true);
    case "venus-probe-small": return createVenusProbe(false);
    case "sky-crane": return createSkyCrane();
    case "galileo-orbiter": return createGalileoOrbiter();
    case "galileo-probe": return createGalileoProbe();
    case "cassini": return createCassini(false);
    case "cassini-huygens": return createCassini(true);
    case "huygens": return createHuygens();
    case "helicopter": return createHelicopter(false);
    case "helicopter-flying": return createHelicopter(true);
    case "apollo-csm": return createApolloStack();
    case "pioneer": return createPioneer();
    case "new-horizons": return createNewHorizons();
    case "hubble": return createHubble();
    case "jwst": return createJwst();
    case "lro": return createLro();
    case "orion": return createOrion();
    case "apollo-cm": return createApolloCm();
    case "orion-cm": return createOrionCm();
    case "src": return createSampleCapsule();
    case "gemini": return createGemini();
    case "gemini-cm": return createGeminiCm();
    case "osiris-rex": return createOsirisRex();
    case "stardust": return createStardust();
    // NLC-2 (new — safe to remove on request)
    case "dawn": return createDawn();
    case "near-shoemaker": return createNearShoemaker();
    case "alsep": return createAlsep();
    case "skylab": return createSkylab();
    case "zarya-unity": return createZaryaUnity();
    case "lrrr": return createLrrr();
    case "pse": return createPse();
    case "moxie": return createMoxie();
    case "seis": return createSeis();
    case "dragon": return createDragon();
    case "dragon-cm": return createDragonCapsule();
    default: return createCapsule();
  }
}