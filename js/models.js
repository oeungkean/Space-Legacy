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
import { foil, panelBump, paintSpeckle, corrugationBump, worldUV, bellGeometry, nozzleHeat, nozzleTubesBump, mergeStatic } from "./model-detail.js";

export const UPRIGHT_MODELS = new Set([
  "lunar-module", "lm-ascent", "rover", "curiosity", "perseverance", "helicopter", "helicopter-flying",
  "mer-rover", "sojourner", "pathfinder-lander", "viking-lander", "phoenix", "insight", "surveyor",
  "lrv", "blue-ghost", "sky-crane",
  "apollo-cm", "orion-cm", "src", "gemini-cm", "lrrr", "pse", "moxie", "seis"
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

// A rocket nozzle (chamber, throat and curved bell) hanging down from y = top
function nozzleBell(exitR, length, material, segments) {
  return new THREE.Mesh(bellGeometry(exitR, length, segments || 32), material);
}

// Gives textured parts (foil, panels) texture coordinates in model units, so the crinkles and panel seams
// keep a sensible size on big and small parts alike instead of stretching around a whole cylinder.
// Each geometry is changed once (shared geometries are marked). Run before mergeStatic.
function detailUV(group, tile) {
  const m = getMaterials();
  const tiled = [m.foilGold, m.foilBlack, m.foilSilver, m.panelSilver, m.panelGray, m.panelWhite, m.ribbedBlack];
  group.traverse(function (o) {
    if (!o.isMesh || tiled.indexOf(o.material) === -1) return;
    const g = o.geometry;
    if (g.userData.uvDone || !g.parameters) return;
    const t = tile || (o.material.userData.tile || 1.2);
    const q = g.parameters;
    if (g.type === "CylinderGeometry") worldUV(g, Math.PI * (q.radiusTop + q.radiusBottom), q.height, t);
    else if (g.type === "BoxGeometry") { const big = Math.max(q.width, q.height, q.depth); worldUV(g, big, big, t); }
    else if (g.type === "SphereGeometry") worldUV(g, Math.PI * 2 * q.radius, Math.PI * q.radius, t);
    else return;
    g.userData.uvDone = true;
  });
  return group;
}

// A radioisotope power generator (RTG): a dark finned cylinder along +Y, centred on the origin
function rtgUnit(radius, length, m, fins) {
  const g = new THREE.Group();
  g.add(cyl(radius * 0.55, radius * 0.55, length, m.black, 16));
  const n = fins || 8;
  for (let i = 0; i < n; i++) {
    const fin = box(radius * 0.08, length * 0.94, radius * 2, m.black);
    fin.rotation.y = (i / n) * Math.PI;
    g.add(fin);
  }
  [-1, 1].forEach(function (e) { g.add(put(cyl(radius * 0.6, radius * 0.6, length * 0.04, m.metal, 16), 0, e * length * 0.5, 0)); });
  return g;
}

// A cluster of four small thrusters (an RCS "quad") on a short boom, facing out along +X
function rcsQuad(m, size) {
  const q = new THREE.Group();
  q.add(box(size, size * 1.15, size, m.panelSilver));
  [[0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].forEach(function (d) {
    const n = nozzleBell(size * 0.22, size * 0.5, m.nozzle, 10);
    // point the nozzle outward along d
    n.quaternion.setFromUnitVectors(V(0, -1, 0), V(d[0], d[1], d[2]));
    n.position.set(d[0] * size * 0.55, d[1] * size * 0.62, d[2] * size * 0.55);
    q.add(n);
  });
  return q;
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

  // Rebuilt models (Phase 1, model-detail.js): insulation foils, anodized panels and heat-tinted nozzles
  const goldFoil = foil("gold");
  const blackFoil = foil("black");
  const silverFoil = foil("silver");
  const foilGold = new THREE.MeshStandardMaterial({ map: goldFoil.map, bumpMap: goldFoil.bump, bumpScale: 1.4, metalness: 0.75, roughness: 0.32 });
  const foilBlack = new THREE.MeshStandardMaterial({ map: blackFoil.map, bumpMap: blackFoil.bump, bumpScale: 1.2, metalness: 0.4, roughness: 0.45 });
  const foilSilver = new THREE.MeshStandardMaterial({ map: silverFoil.map, bumpMap: silverFoil.bump, bumpScale: 1.2, metalness: 0.85, roughness: 0.25 });
  const panelSilver = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, map: paintSpeckle(), bumpMap: panelBump(), bumpScale: 1.5, metalness: 0.7, roughness: 0.38 });
  const panelGray = new THREE.MeshStandardMaterial({ color: 0x80858d, map: paintSpeckle(), bumpMap: panelBump(), bumpScale: 1.5, metalness: 0.55, roughness: 0.45 });
  const panelWhite = new THREE.MeshStandardMaterial({ color: 0xe9ecf0, map: paintSpeckle(), bumpMap: panelBump(), bumpScale: 1.5, metalness: 0.1, roughness: 0.55 });
  const nozzle = new THREE.MeshStandardMaterial({ map: nozzleHeat(), bumpMap: nozzleTubesBump(), bumpScale: 0.6, metalness: 0.7, roughness: 0.42, side: THREE.DoubleSide });

  const airbagFabric = new THREE.MeshStandardMaterial({ color: 0xe6dfcb, bumpMap: goldFoil.bump, bumpScale: 2.2, roughness: 0.95 });

  // Phase 2: yellow EVA handrails (Hubble), ribbed black shingles (Gemini), sunshield film (Webb)
  const handrail = new THREE.MeshStandardMaterial({ color: 0xd9b43c, roughness: 0.5, metalness: 0.2 });
  const ribbedBlack = new THREE.MeshStandardMaterial({ color: 0x232428, bumpMap: corrugationBump(), bumpScale: 1.6, roughness: 0.55, metalness: 0.3 });
  ribbedBlack.userData.tile = 0.5;
  const kapton = new THREE.MeshStandardMaterial({ color: 0xc7a6d4, metalness: 0.75, roughness: 0.3, side: THREE.DoubleSide });

  cache = {
    handrail: handrail, ribbedBlack: ribbedBlack, kapton: kapton,
    airbagFabric: airbagFabric,
    foilGold: foilGold, foilBlack: foilBlack, foilSilver: foilSilver,
    panelSilver: panelSilver, panelGray: panelGray, panelWhite: panelWhite, nozzle: nozzle,
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

// Apollo command and service module (forward = +Z). Built in meters from NASA's published sizes and scaled
// to the scene: 3.9 m wide; service module about 7.5 m long with its engine bell; the command module a cone
// 3.2 m tall. Shown: the service module's radiator panels, four RCS quads, the high-gain antenna on its
// boom, the big SPS engine bell, the command module's windows, docking probe and brown heat shield.
function createApolloStack() {
  const m = getMaterials();
  const inner = new THREE.Group();
  const k = 1 / 3;                 // meters -> model units (keeps the size used by the scenes)
  const body = new THREE.Group();
  body.scale.setScalar(k);
  inner.add(body);

  body.add(put(cyl(1.95, 1.95, 4.4, m.panelSilver, 48), 0, 2.2, 0));               // service module
  [0.9, 3.6].forEach(function (y) { body.add(put(cyl(1.97, 1.97, 0.12, m.black, 48), 0, y, 0)); });
  for (let i = 0; i < 6; i++) {                                                    // radiator panels
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const panel = box(0.9, 2.2, 0.06, m.panelWhite);
    panel.position.set(Math.cos(a) * 1.97, 2.3, Math.sin(a) * 1.97);
    panel.rotation.y = -a + Math.PI / 2;
    body.add(panel);
  }
  [0, 1, 2, 3].forEach(function (i) {                                             // four RCS quads near the front
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const quad = rcsQuad(m, 0.42);
    quad.position.set(Math.cos(a) * 2.15, 3.7, Math.sin(a) * 2.15);
    quad.rotation.y = -a;
    body.add(quad);
  });
  const sps = nozzleBell(1.25, 2.9, m.nozzle, 40);                                 // SPS engine
  body.add(sps);
  body.add(put(cyl(0.7, 1.0, 0.4, m.panelGray, 32), 0, -0.05, 0));
  // high-gain antenna: four small dishes on a boom at the back
  const boom = strut(V(1.6, 0.4, 0), V(2.6, -0.8, 0), 0.06, m.metal);
  body.add(boom);
  [[0.25, 0.25], [-0.25, 0.25], [0.25, -0.25], [-0.25, -0.25]].forEach(function (d) {
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), m.dish);
    dish.position.set(2.75, -0.9 + d[0], d[1]);
    dish.rotation.z = Math.PI / 2;
    body.add(dish);
  });
  // command module: a cone with its heat shield at the back, windows and the docking probe
  const cm = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 1.95, 3.2, 48), m.foilSilver);
  cm.position.y = 4.4 + 1.6 + 0.12;
  body.add(cm);
  body.add(put(cyl(1.96, 1.96, 0.24, m.heat, 48), 0, 4.52, 0));
  [-0.75, 0, 0.75].forEach(function (x, i) {
    const pane = box(0.32, 0.26, 0.05, m.black);
    pane.position.set(x, 5.5 + (i === 1 ? 0.25 : 0), 1.48 - Math.abs(x) * 0.1);
    pane.rotation.x = -0.52;
    body.add(pane);
  });
  body.add(put(cyl(0.05, 0.05, 1.0, m.metal, 10), 0, 8.1, 0));                       // docking probe
  body.add(put(cyl(0.18, 0.25, 0.25, m.metal, 16), 0, 7.75, 0));
  mergeStatic(body);

  const stack = forward(inner, 3.5);
  const flame = makeFlame(0.4, 1.2, -1.3, true);   // inside the rotated group, "down" = backward
  inner.add(flame);
  stack.userData.flame = flame;
  return stack;
}

// The Lunar Module's ascent stage (crew cabin), in meters, standing on y = 0 (the top of the descent stage).
// About 2.8 m tall and 4.0 x 4.3 m across (NSSDCA): the faceted cabin with its two triangular windows and
// the hatch below them, the aft equipment bay, the two propellant tank bulges, the docking tunnel on top,
// the rendezvous radar and steerable S-band dishes, two VHF antennas, and four RCS quads on the corners.
function buildAscentStage(m) {
  const a = new THREE.Group();
  // front cabin: an extruded faceted outline (seen from the side), 2.3 m wide
  const side = new THREE.Shape();
  side.moveTo(-0.9, 0.2);
  side.lineTo(0.75, 0.2);
  side.lineTo(1.15, 0.75);
  side.lineTo(1.15, 1.9);
  side.lineTo(0.7, 2.45);
  side.lineTo(-0.9, 2.45);
  side.closePath();
  const cabinGeometry = new THREE.ExtrudeGeometry(side, { depth: 2.3, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 1 });
  cabinGeometry.translate(0, 0, -1.15);
  cabinGeometry.rotateY(-Math.PI / 2);           // front (shape +x) now faces +Z
  a.add(new THREE.Mesh(cabinGeometry, m.panelSilver));
  // dark front panel around the windows and the hatch
  const front = box(1.9, 1.15, 0.05, m.foilBlack);
  front.position.set(0, 1.35, 1.17);
  a.add(front);
  [-1, 1].forEach(function (sideX) {
    const pane = new THREE.Mesh(new THREE.CircleGeometry(0.34, 3), m.black);
    pane.position.set(sideX * 0.45, 1.65, 1.2);
    pane.rotation.z = sideX > 0 ? -Math.PI / 6 : Math.PI / 6 + Math.PI / 3;
    a.add(pane);
  });
  a.add(put(box(0.82, 0.82, 0.06, m.panelGray), 0, 0.72, 1.17));          // forward hatch
  // aft equipment bay, behind the cabin
  a.add(put(box(2.2, 1.3, 1.1, m.foilBlack), 0, 1.0, -1.45));
  // propellant tank bulges on the left and right
  [-1, 1].forEach(function (sx) {
    const tank = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 16), m.panelGray);
    tank.scale.set(0.75, 1, 1);
    tank.position.set(sx * 1.35, 1.05, -0.3);
    a.add(tank);
  });
  // docking tunnel and drogue on top
  a.add(put(cyl(0.42, 0.48, 0.45, m.panelSilver, 24), 0, 2.65, 0));
  // rendezvous radar (front, above the cabin) and the steerable S-band antenna (on a short boom)
  const radar = new THREE.Mesh(new THREE.SphereGeometry(0.33, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.5), m.dish);
  radar.position.set(0, 2.55, 0.85);
  radar.rotation.x = Math.PI / 2.4;
  a.add(radar);
  a.add(strut(V(0.7, 2.4, -0.4), V(1.25, 2.95, -0.6), 0.04, m.metal));
  const sband = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.4), m.dish);
  sband.position.set(1.3, 3.05, -0.62);
  sband.rotation.z = -0.5;
  a.add(sband);
  [-0.6, 0.6].forEach(function (x) { a.add(strut(V(x, 2.45, -0.9), V(x * 1.4, 3.2, -1.2), 0.018, m.metal)); }); // VHF antennas
  // four RCS quads on the corners
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (c) {
    const quad = rcsQuad(m, 0.3);
    quad.position.set(c[0] * 1.75, 1.95, c[1] * 1.0);
    quad.rotation.y = Math.atan2(-c[1], c[0]);
    a.add(quad);
    a.add(strut(V(c[0] * 1.1, 1.95, c[1] * 0.8), V(c[0] * 1.62, 1.95, c[1] * 0.98), 0.05, m.metal));
  });
  // ascent engine under the cabin
  const engine = nozzleBell(0.42, 0.75, m.nozzle, 24);
  engine.position.y = 0.2;
  a.add(engine);
  mergeStatic(a);
  return a;
}

// Apollo Lunar Module (upright). Built in meters from NSSDCA's description and scaled 0.42 for the scenes:
// the descent stage is an octagonal prism 4.2 m across and 1.7 m thick, its bottom 1.5 m above the
// surface; footpads 9.4 m apart across opposite legs; the descent engine skirt sticks 1 m out below.
// Gold and black insulation foil; the front leg carries the ladder and porch; the other three legs carry
// the long surface contact probes.
const LM_SCALE = 0.42;
function createLunarModule() {
  const m = getMaterials();
  const lm = new THREE.Group();
  const g = new THREE.Group();
  g.scale.setScalar(LM_SCALE);
  lm.add(g);

  // descent stage: octagon 4.2 m across the flats, from 1.5 m to 3.2 m above the ground
  const flats = 4.2 / 2;
  const radius = flats / Math.cos(Math.PI / 8);
  const stageGeometry = new THREE.CylinderGeometry(radius, radius, 1.7, 8, 1);
  worldUV(stageGeometry, 8 * 2 * radius * Math.sin(Math.PI / 8), 1.7, 1.1); // foil crinkles at their real size
  const stage = new THREE.Mesh(stageGeometry, m.foilGold);
  stage.rotation.y = Math.PI / 8;
  stage.position.y = 2.35;
  g.add(stage);
  const under = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.98, radius * 0.92, 0.12, 8), m.foilBlack);
  under.rotation.y = Math.PI / 8;
  under.position.y = 1.47;
  g.add(under);
  // black panels on the four corner quadrants, gold on the faces (as in the Apollo photos)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const panel = box(1.5, 1.5, 0.04, m.foilBlack);
    panel.position.set(Math.cos(a) * flats * 1.005, 2.35, Math.sin(a) * flats * 1.005);
    panel.rotation.y = -a + Math.PI / 2;
    g.add(panel);
  }
  const descent = nozzleBell(0.75, 1.3, m.nozzle, 32);                            // descent engine skirt
  descent.position.y = 1.8;
  g.add(descent);

  // ascent stage on top
  const ascent = buildAscentStage(m);
  ascent.position.y = 3.2;
  g.add(ascent);

  // four legs (front, back, left, right): main strut, two side braces, footpad; contact probes on three
  [0, 1, 2, 3].forEach(function (i) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 2;                                 // i = 0 is the front leg (+Z)
    const dir = V(Math.cos(a), 0, Math.sin(a));
    const sideDir = V(-dir.z, 0, dir.x);
    const top = dir.clone().multiplyScalar(flats + 0.05).setY(2.9);
    const foot = dir.clone().multiplyScalar(4.7).setY(0.25);
    g.add(strut(top, foot, 0.11, m.foilGold, 10));
    const mid = foot.clone().lerp(top, 0.38);
    [-1, 1].forEach(function (s2) {
      g.add(strut(dir.clone().multiplyScalar(flats * 0.9).add(sideDir.clone().multiplyScalar(s2 * 1.3)).setY(1.55), mid, 0.05, m.metal, 8));
    });
    g.add(strut(dir.clone().multiplyScalar(flats).setY(1.6), mid, 0.05, m.metal, 8));
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.47, 20, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), m.foilGold);
    pad.scale.set(1, 0.45, 1);
    pad.position.copy(foot).setY(0.22);
    g.add(pad);
    if (i !== 0) g.add(strut(foot.clone().setY(0.15), foot.clone().add(dir.clone().multiplyScalar(0.25)).setY(-1.5), 0.025, m.metal, 6));
  });
  // porch and ladder on the front leg
  const porch = box(1.0, 0.06, 0.7, m.panelSilver);
  porch.position.set(0, 3.15, flats + 0.4);
  g.add(porch);
  const ladderTop = V(0, 3.1, flats + 0.75);
  const ladderBottom = V(0, 0.8, 4.3);
  [-0.35, 0.35].forEach(function (x) { g.add(strut(ladderTop.clone().setX(x), ladderBottom.clone().setX(x), 0.03, m.metal, 6)); });
  for (let i = 1; i < 9; i++) {
    const p = ladderTop.clone().lerp(ladderBottom, i / 9);
    g.add(strut(p.clone().setX(-0.35), p.clone().setX(0.35), 0.025, m.metal, 6));
  }

  mergeStatic(g);
  lm.userData.size = 3;
  lm.userData.ascent = ascent;                 // the liftoff scene hides it and flies createLmAscent instead
  lm.userData.ascentBase = 3.2 * LM_SCALE;     // the top of the descent stage, where the ascent stage sits
  lm.userData.engines = [V(0, 0.5 * LM_SCALE, 0)]; // the descent engine's exit (flame comes out here)
  return lm;
}

// Only the top half of the lunar module, lifting off (upright, flame points down). Same ascent stage as
// on the full Lunar Module.
function createLmAscent() {
  const m = getMaterials();
  const stage = new THREE.Group();
  const a = buildAscentStage(m);
  a.scale.setScalar(LM_SCALE);
  stage.add(a);

  const flame = makeFlame(0.28, 0.9, -0.55, true);
  stage.add(flame);
  stage.userData.flame = flame;
  stage.userData.size = 1.6;
  return stage;
}

// Voyager 1 and 2 (1977). From NASA/JPL: a 3.7 m high-gain dish (+Z) on a ten-sided equipment bus 1.8 m
// across; three RTGs on one boom; the science boom with the scan platform (cameras) on the other side; a
// 13 m magnetometer boom (shortened here so the model fits the scenes); two 10 m plasma-wave antennas; and
// the gold-plated Golden Record on the side of the bus. Scale: 1 unit = about 1.5 m.
function createVoyager() {
  const m = getMaterials();
  const probe = new THREE.Group();

  const profile = [];
  for (let r = 0; r <= 1.22; r += 0.061) profile.push(new THREE.Vector2(r, 0.32 * r * r));
  const hga = new THREE.Mesh(new THREE.LatheGeometry(profile, 48), m.dish);
  hga.rotation.x = Math.PI / 2;
  probe.add(hga);
  probe.add(put(cyl(1.23, 1.23, 0.04, m.panelSilver, 48), 0, 0, 0.47).rotateX(Math.PI / 2)); // dish rim
  probe.add(put(cyl(0.03, 0.09, 0.5, m.panelWhite, 10), 0, 0, 0.55).rotateX(Math.PI / 2));  // feed (subreflector)
  [0, 1, 2, 3].forEach(function (k) {
    const a = (k / 4) * Math.PI * 2 + 0.4;
    probe.add(strut(V(Math.cos(a) * 1.05, Math.sin(a) * 1.05, 0.38), V(0, 0, 0.8), 0.01, m.metal, 4));
  });

  // ten-sided bus with its gold record, and the propellant tank behind
  const bus = cyl(0.6, 0.6, 0.32, m.panelSilver, 10);
  bus.rotation.x = Math.PI / 2;
  probe.add(put(bus, 0, 0, -0.25));
  probe.add(put(cyl(0.58, 0.58, 0.34, m.foilBlack, 10).rotateX(Math.PI / 2), 0, 0, -0.27));
  probe.add(put(new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 12), m.foilGold), 0, 0, -0.55));
  const record = cyl(0.16, 0.16, 0.02, m.foilGold, 32);
  record.rotation.z = Math.PI / 2;
  probe.add(put(record, 0.6, 0, -0.25));

  const back = -0.4;
  // RTG boom: three RTGs end to end
  probe.add(strut(V(0.5, 0, back), V(2.0, 0.1, back - 0.2), 0.03, m.metal, 6));
  [1.05, 1.42, 1.79].forEach(function (x) {
    const rtg = rtgUnit(0.15, 0.32, m, 6);
    rtg.rotation.z = Math.PI / 2;
    rtg.position.set(x, 0.05 + (x - 1.05) * 0.07, back - 0.1 - (x - 1.05) * 0.1);
    probe.add(rtg);
  });

  // science boom with the scan platform (narrow and wide-angle cameras, spectrometers)
  probe.add(strut(V(-0.5, -0.1, back), V(-1.7, -0.7, back - 0.2), 0.035, m.metal, 6));
  probe.add(put(box(0.35, 0.25, 0.3, m.foilGold), -1.7, -0.75, back - 0.2));
  const platform = new THREE.Group();
  platform.position.set(-1.7, -0.45, back - 0.2);
  platform.add(box(0.36, 0.2, 0.32, m.panelWhite));
  [-0.09, 0.09].forEach(function (x, i) {
    const camera = cyl(i ? 0.05 : 0.07, i ? 0.05 : 0.07, i ? 0.32 : 0.42, m.black, 14);
    camera.rotation.x = Math.PI / 2;
    platform.add(put(camera, x, 0.15, 0.15));
  });
  probe.add(platform);
  probe.add(put(box(0.18, 0.12, 0.18, m.foilGold), -1.1, -0.42, back - 0.1)); // cosmic ray instrument

  // magnetometer boom (a thin lattice mast) and the two plasma-wave antennas
  probe.add(strut(V(0, -0.3, back), V(0.3, -3.6, back - 0.6), 0.012, m.metal, 6));
  probe.add(strut(V(0.06, -0.3, back), V(0.36, -3.6, back - 0.6), 0.006, m.metal, 4));
  probe.add(put(box(0.1, 0.1, 0.1, m.panelWhite), 0.15, -2.0, back - 0.35));
  probe.add(put(box(0.12, 0.12, 0.12, m.panelWhite), 0.3, -3.6, back - 0.6));
  [-1, 1].forEach(function (side) { probe.add(strut(V(side * 0.3, 0.4, back), V(side * 1.6, 3.2, back - 0.3), 0.006, m.metal, 4)); });
  probe.add(strut(V(0, 0.3, back), V(-0.1, 2.0, back - 0.5), 0.015, m.metal, 6)); // low-energy charged particle boom
  probe.add(put(box(0.12, 0.12, 0.12, m.foilGold), -0.1, 2.0, back - 0.5));

  detailUV(probe);
  mergeStatic(probe);
  probe.userData.size = 3.8;
  return probe;
}

// Parker Solar Probe (2018), +Z toward the Sun. From NASA/JHUAPL: the 2.3 m Thermal Protection System, a
// carbon-foam shield 11.4 cm thick with a white Sun-facing coating, on struts above the hexagonal bus; two
// water-cooled solar arrays that fold back into the shadow near the Sun; four radiators on top for that
// cooling water; the four FIELDS antennas sticking out past the shield; the Faraday cup (SWEAP) looking
// at the Sun; and a magnetometer boom behind. Scale: about 1 unit = 1.1 m.
function createParker() {
  const m = getMaterials();
  const probe = new THREE.Group();

  const shield = cyl(1.05, 1.05, 0.1, m.panelWhite, 6);
  shield.rotation.x = Math.PI / 2;
  probe.add(put(shield, 0, 0, 0.62));
  const edge = cyl(1.06, 1.06, 0.06, m.black, 6);                              // carbon edge and back face
  edge.rotation.x = Math.PI / 2;
  probe.add(put(edge, 0, 0, 0.55));
  for (let i = 0; i < 6; i++) {                                                // shield struts down to the bus
    const a = (i / 6) * Math.PI * 2;
    probe.add(strut(V(Math.cos(a) * 0.7, Math.sin(a) * 0.7, 0.52), V(Math.cos(a) * 0.38, Math.sin(a) * 0.38, 0.28), 0.02, m.metal, 6));
  }

  const body = cyl(0.42, 0.45, 0.8, m.foilBlack, 6);
  body.rotation.x = Math.PI / 2;
  probe.add(put(body, 0, 0, -0.05));
  probe.add(put(cyl(0.44, 0.44, 0.04, m.panelGray, 6).rotateX(Math.PI / 2), 0, 0, 0.36));

  // water-cooled solar arrays, angled back (as at closest approach they tuck behind the shield)
  [-1, 1].forEach(function (side) {
    probe.add(strut(V(side * 0.42, 0, 0.05), V(side * 0.62, 0, 0.05), 0.035, m.metal));
    const wing = new THREE.Group();
    wing.add(box(0.9, 0.025, 0.45, m.solar));
    wing.add(put(box(0.92, 0.03, 0.04, m.panelSilver), 0, 0, 0.24));
    wing.add(put(box(0.92, 0.03, 0.04, m.panelSilver), 0, 0, -0.24));
    wing.position.set(side * 1.05, 0, 0.0);
    wing.rotation.y = side * 0.35;
    probe.add(wing);
  });
  // four radiators on top for the cooling water
  [-0.36, -0.12, 0.12, 0.36].forEach(function (x) {
    probe.add(put(box(0.2, 0.42, 0.025, m.panelWhite), x, 0.62, 0.05));
  });
  probe.add(put(box(0.86, 0.04, 0.3, m.panelGray), 0, 0.42, 0.05));

  // four FIELDS antennas peeking past the shield, and the Faraday cup
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    probe.add(strut(V(Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0.5), V(Math.cos(a) * 2.0, Math.sin(a) * 2.0, 0.5), 0.008, m.panelWhite, 4));
  }
  probe.add(strut(V(0.35, 0.3, 0.1), V(0.75, 0.75, 0.9), 0.012, m.metal, 6));
  probe.add(put(cyl(0.05, 0.05, 0.08, m.panelSilver, 12).rotateX(Math.PI / 2), 0.75, 0.75, 0.92));

  // high-gain dish at the back and the magnetometer boom
  const hga = dish(0.32, 0.08, m.dish, 24);
  hga.rotation.x = -Math.PI / 2;
  probe.add(put(hga, 0, 0.1, -0.55));
  probe.add(strut(V(0.2, 0, -0.45), V(1.0, 0.2, -1.3), 0.015, m.metal, 6));
  [0.5, 0.75, 1.0].forEach(function (k) { probe.add(put(box(0.06, 0.06, 0.06, m.panelWhite), 0.2 + 0.8 * k, 0.2 * k, -0.45 - 0.85 * k)); });

  detailUV(probe);
  mergeStatic(probe);
  probe.userData.size = 2.7;
  return probe;
}

// A Mars entry capsule with its cruise stage (Curiosity/Perseverance style), forward = +Z (heat shield).
// The heat shield is a 70-degree sphere-cone (very blunt); the backshell has a steeper cone and the
// parachute cover on top; the cruise stage is a ring of solar cells with radiators and thrusters.
function createCapsule() {
  const m = getMaterials();
  const inner = new THREE.Group();

  // heat shield: a sphere-cone 70 degrees from the axis (profile rotated around Y)
  const R = 1.1;
  const nose = R * 0.25;
  const shieldProfile = [new THREE.Vector2(0, 0.42)];
  for (let i = 0; i <= 6; i++) {                                               // rounded nose
    const a = (i / 6) * (Math.PI / 2 - 70 * Math.PI / 180);
    shieldProfile.push(new THREE.Vector2(Math.sin(a) * nose, 0.42 - nose + Math.cos(a) * nose));
  }
  const last = shieldProfile[shieldProfile.length - 1];
  shieldProfile.push(new THREE.Vector2(R, last.y - (R - last.x) / Math.tan(70 * Math.PI / 180)));
  shieldProfile.push(new THREE.Vector2(R * 0.98, 0));
  inner.add(new THREE.Mesh(new THREE.LatheGeometry(shieldProfile.slice().reverse(), 48), m.heat));
  // backshell: a cone and the parachute cover
  inner.add(put(cyl(R, R * 0.55, 0.75, m.panelWhite, 48), 0, -0.375, 0));
  inner.add(put(cyl(R * 0.55, R * 0.42, 0.25, m.panelWhite, 32), 0, -0.875, 0));
  inner.add(put(cyl(R * 1.005, R * 1.005, 0.04, m.panelGray, 48), 0, -0.02, 0));
  [0, 1, 2, 3].forEach(function (i) {                                          // backshell thrusters
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    inner.add(put(box(0.12, 0.1, 0.12, m.panelGray), Math.cos(a) * 0.78, -0.55, Math.sin(a) * 0.78));
  });
  // cruise stage: hub, solar ring, radiators
  inner.add(put(cyl(0.5, 0.5, 0.25, m.foilGold, 24), 0, -1.13, 0));
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 1.05, 48), m.solar);
  ring.rotation.x = -Math.PI / 2;
  inner.add(put(ring, 0, -1.26, 0));
  const ringBack = new THREE.Mesh(new THREE.RingGeometry(0.55, 1.05, 48), m.panelGray);
  ringBack.rotation.x = Math.PI / 2;
  inner.add(put(ringBack, 0, -1.25, 0));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    inner.add(put(box(0.04, 0.06, 0.32, m.panelWhite), Math.cos(a) * 0.82, -1.22, Math.sin(a) * 0.82).rotateY(-a));
  }
  [0, 1, 2, 3].forEach(function (i) {
    const a = (i * Math.PI) / 2;
    const bell = nozzleBell(0.04, 0.1, m.nozzle, 10);
    bell.position.set(Math.cos(a) * 0.45, -1.25, Math.sin(a) * 0.45);
    inner.add(bell);
  });
  detailUV(inner);
  mergeStatic(inner);
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

// A lander footpad: a shallow round dish (crushable honeycomb), round side down; its bottom is 0.4 x radius
// below its position
function footpad(radius, material) {
  const pad = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), material);
  pad.scale.set(1, 0.4, 1);
  return pad;
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

// A rover wheel (a group that spins around its X axis, like treadWheel). side = +1 or -1 (which side of
// the rover it is on: the spokes go on the outside face). style:
//   "curiosity"    24 chevron-shaped grousers, curved titanium spokes (50 cm wheels)
//   "perseverance" 48 gently curved grousers, a thicker skin, curved spokes (52.5 cm wheels)
//   "mer"          cleats and spiral flexure spokes (Spirit and Opportunity, 26 cm wheels)
//   "sojourner"    stainless-steel cleats and a flat hub (13 cm wheels)
//   "lrv"          the Lunar Roving Vehicle's woven wire-mesh tire with titanium chevron treads (82 cm)
function roverWheel(radius, width, side, style, m) {
  const wheel = new THREE.Group();
  const skin = style === "lrv" ? m.mesh : m.wheel;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 40, 1, true), skin);
  rim.rotation.z = Math.PI / 2;
  wheel.add(rim);
  // dark inside of the wheel, seen through the spokes
  const inside = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.97, 28), m.black);
  inside.rotation.y = side * Math.PI / 2;
  inside.position.x = -side * width * 0.3;
  wheel.add(inside);

  const counts = { curiosity: 24, perseverance: 48, mer: 20, sojourner: 14, lrv: 22 };
  const n = counts[style] || 18;
  const h = radius * (style === "lrv" ? 0.03 : 0.06);
  const t = radius * (style === "perseverance" ? 0.025 : 0.04);
  const treadMaterial = style === "lrv" ? m.silver : m.wheel;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = radius + h / 2;
    if (style === "curiosity" || style === "lrv") {
      // a V-shaped (chevron) grouser: two halves angled toward each other
      [-1, 1].forEach(function (half) {
        const g = box(width * 0.52, h, t, treadMaterial);
        g.rotation.order = "XYZ";
        g.rotation.set(a, half * 0.32, 0);
        g.position.set(half * width * 0.25, Math.cos(a) * r, Math.sin(a) * r);
        g.position.add(V(0, -Math.sin(a), Math.cos(a)).multiplyScalar(width * 0.04));
        wheel.add(g);
      });
    } else {
      const g = box(width * (style === "perseverance" ? 0.98 : 0.9), h, t, treadMaterial);
      g.rotation.order = "XYZ";
      g.rotation.set(a, style === "perseverance" ? 0.12 : 0, 0);
      g.position.set(0, Math.cos(a) * r, Math.sin(a) * r);
      wheel.add(g);
    }
  }

  // outer face: curved spokes from the hub to the rim, or a hub cover
  const face = side * width * 0.46;
  if (style === "curiosity" || style === "perseverance" || style === "mer") {
    const spokes = 6;
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      const at = function (rr, aa) { return V(face, Math.cos(aa) * rr, Math.sin(aa) * rr); };
      const curve = new THREE.QuadraticBezierCurve3(at(radius * 0.22, a), at(radius * 0.62, a + 0.12), at(radius * 0.96, a + 0.75));
      wheel.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 8, radius * 0.035, 5), m.metal));
    }
  } else {
    const cover = new THREE.Mesh(new THREE.CircleGeometry(radius * (style === "lrv" ? 0.62 : 0.85), 24), style === "lrv" ? m.silver : m.wheel);
    cover.rotation.y = side * Math.PI / 2;
    cover.position.x = face;
    wheel.add(cover);
  }
  const hub = cyl(radius * 0.22, radius * 0.22, width * 1.02, m.metal, 16);
  hub.rotation.z = Math.PI / 2;
  hub.position.x = side * width * 0.05;
  wheel.add(hub);
  mergeStatic(wheel);
  return wheel;
}

// A box beam between two points (rover suspension arms are rectangular tubes)
function beam(a, b, w, h, material) {
  const d = new THREE.Vector3().subVectors(b, a);
  const mesh = box(w, h, d.length(), material);
  mesh.position.copy(a).addScaledVector(d, 0.5);
  mesh.lookAt(b); // (not yet in a group, so this aims the beam's length, +Z, at b)
  return mesh;
}

// Curiosity and Perseverance (upright, about 3 m long). variant = "curiosity" or "perseverance".
// Built in meters from NASA's published sizes: 3 m long, 2.7 m wide, 2.2 m tall; 60 cm ground clearance;
// six wheels 50 cm (Curiosity) or 52.5 cm (Perseverance) across on a rocker-bogie suspension; the mast
// cameras about 2 m above the ground; a 2.1 m robotic arm with a tool turret; the nuclear power source
// (MMRTG) at the back between two heat-exchanger panels. They share one design (Perseverance was built
// from Curiosity's); Perseverance has a bigger turret with a coring drill and the sample-caching system.
function createMarsRover(variant) {
  const m = getMaterials();
  const rover = new THREE.Group();
  const isPerseverance = variant === "perseverance";
  const wheelR = isPerseverance ? 0.2625 : 0.25;

  // Body ("warm electronics box"), 60 cm above the ground, and its top deck
  const body = new THREE.Group();
  body.add(put(box(1.45, 0.55, 1.9, m.panelWhite), 0, 0.88, 0));
  body.add(put(box(1.5, 0.05, 2.0, m.panelGray), 0, 1.18, 0));
  body.add(put(box(1.46, 0.05, 1.91, m.foilBlack), 0, 0.62, 0));              // belly
  body.add(put(box(0.5, 0.22, 0.4, m.foilGold), -0.35, 1.32, 0.3));          // instruments under the deck lids
  body.add(put(box(0.38, 0.16, 0.32, m.panelSilver), 0.25, 1.29, -0.2));
  body.add(put(box(0.3, 0.12, 0.42, m.foilGold), -0.3, 1.27, -0.45));
  if (isPerseverance) body.add(put(box(0.7, 0.32, 0.4, m.panelWhite), 0.1, 0.68, 0.98)); // sample caching

  // front and rear hazard cameras (pairs)
  [[0.95, 1], [-0.95, -1]].forEach(function (c) {
    [-0.32, -0.12, 0.12, 0.32].forEach(function (x) {
      const lens = cyl(0.025, 0.025, 0.04, m.black, 10);
      lens.rotation.x = Math.PI / 2;
      body.add(put(lens, x, 0.7, c[0] + c[1] * 0.02));
    });
    body.add(put(box(0.8, 0.07, 0.06, m.panelGray), 0, 0.7, c[0]));
  });

  // Power source at the back: MMRTG with eight cooling fins, between two heat-exchanger panels
  const rtg = new THREE.Group();
  rtg.add(cyl(0.14, 0.14, 0.68, m.black, 20));
  for (let i = 0; i < 8; i++) {
    const fin = box(0.02, 0.64, 0.6, m.black);
    fin.rotation.y = (i * Math.PI) / 8;
    rtg.add(fin);
  }
  rtg.rotation.x = Math.PI / 2 - 0.5;
  rtg.position.set(0, 1.08, -1.25);
  rover.add(rtg);
  [-1, 1].forEach(function (sx) {
    const hx = box(0.04, 0.55, 0.6, m.panelSilver);
    hx.position.set(sx * 0.45, 1.05, -1.18);
    hx.rotation.set(-0.5, sx * 0.35, 0);
    body.add(hx);
  });

  // Remote sensing mast: Mastcam about 2 m up, Navcam pairs, and the laser "eye" (ChemCam/SuperCam)
  body.add(put(cyl(0.055, 0.07, 0.8, m.panelWhite, 16), 0.5, 1.6, 0.72));
  body.add(put(box(0.16, 0.12, 0.16, m.panelGray), 0.5, 1.22, 0.72));
  const head = new THREE.Group();
  head.position.set(0.5, 2.05, 0.72);
  head.add(box(0.5, 0.18, 0.24, m.panelWhite));
  head.add(put(box(0.32, 0.14, 0.12, m.panelGray), 0, -0.04, 0.17));
  [-0.18, -0.11, 0.11, 0.18].forEach(function (x) {
    const lens = cyl(0.03, 0.03, 0.05, m.black, 12);
    lens.rotation.x = Math.PI / 2;
    head.add(put(lens, x, -0.04, 0.23));
  });
  const eyeBox = isPerseverance ? box(0.24, 0.17, 0.26, m.panelWhite) : box(0.22, 0.16, 0.24, m.panelWhite);
  head.add(put(eyeBox, 0, 0.17, 0));
  const laserEye = cyl(isPerseverance ? 0.075 : 0.07, isPerseverance ? 0.075 : 0.07, 0.05, m.black, 20);
  laserEye.rotation.x = Math.PI / 2;
  head.add(put(laserEye, 0, 0.17, 0.14));
  const glint = new THREE.Mesh(new THREE.CircleGeometry(0.05, 20), m.visor);
  head.add(put(glint, 0, 0.17, 0.166));
  rover.add(head);
  // weather-station booms on the mast
  [-1, 1].forEach(function (sx) { body.add(strut(V(0.5, 1.55, 0.72), V(0.5 + sx * 0.22, 1.55, 0.72 + 0.1), 0.012, m.metal, 6)); });

  // High-gain antenna (six-sided plate on a gimbal), UHF and low-gain antennas
  const hga = cyl(0.2, 0.2, 0.04, m.panelSilver, 6);
  hga.rotation.set(-0.6, 0, 0.25);
  rover.add(put(hga, -0.5, 1.45, -0.42));
  body.add(put(cyl(0.05, 0.07, 0.22, m.metal, 12), -0.5, 1.3, -0.42));
  body.add(put(cyl(0.06, 0.06, 0.28, m.panelWhite, 12), 0.55, 1.35, -0.75));
  body.add(put(cyl(0.025, 0.03, 0.32, m.panelWhite, 10), 0.3, 1.37, -0.85));

  // Robotic arm stowed across the front, with its tool turret
  const shoulder = V(0.55, 0.85, 1.02);
  const elbow = V(0.62, 1.0, 1.55);
  const wrist = V(-0.05, 0.85, 1.68);
  body.add(put(box(0.18, 0.2, 0.16, m.panelWhite), shoulder.x, shoulder.y, shoulder.z - 0.05));
  body.add(strut(shoulder, elbow, 0.055, m.panelWhite, 12));
  body.add(put(new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), m.metal), elbow.x, elbow.y, elbow.z));
  body.add(strut(elbow, wrist, 0.05, m.panelWhite, 12));
  const turret = new THREE.Group();
  turret.position.set(wrist.x - 0.05, wrist.y - 0.12, wrist.z + 0.05);
  turret.add(cyl(0.11, 0.11, 0.16, m.panelGray, 12));
  const tools = isPerseverance ? 5 : 5;
  for (let i = 0; i < tools; i++) {
    const a = (i / tools) * Math.PI * 2;
    const big = i === 0;
    const tool = big
      ? cyl(0.06, 0.04, isPerseverance ? 0.38 : 0.3, m.panelSilver, 12)      // the drill
      : box(0.1, 0.14, 0.1, i % 2 ? m.panelWhite : m.foilGold);
    tool.position.set(Math.cos(a) * 0.14, -0.08, Math.sin(a) * 0.14);
    turret.add(tool);
  }
  if (isPerseverance) turret.scale.setScalar(1.2);
  rover.add(turret);

  // Rocker-bogie suspension: a differential bar on the deck links the two rockers; each rocker carries
  // the front wheel and a bogie that carries the middle and rear wheels. Front and rear wheels steer.
  const wheels = [];
  body.add(put(box(1.7, 0.06, 0.08, m.metal), 0, 1.25, -0.1));
  [-1, 1].forEach(function (side) {
    const x = side * 1.12;
    const pivot = V(side * 0.8, 0.95, 0.1);
    const front = V(x, wheelR, 1.0);
    const middle = V(x, wheelR, 0.05);
    const rear = V(x, wheelR, -0.95);
    const bogie = V(side * 1.0, 0.68, -0.42);
    body.add(strut(V(side * 0.85, 1.25, -0.1), pivot.clone().setY(1.0), 0.02, m.metal, 6));
    body.add(put(cyl(0.09, 0.09, 0.12, m.metal, 14), pivot.x + side * 0.04, pivot.y, pivot.z).rotateZ(Math.PI / 2));
    // rocker: from the pivot forward to the front wheel's steering actuator, back to the bogie pivot
    const frontTop = V(x - side * 0.1, 0.86, 1.0);
    body.add(beam(pivot, V(x - side * 0.1, 0.95, 0.72), 0.07, 0.1, m.panelSilver));
    body.add(beam(V(x - side * 0.1, 0.95, 0.72), frontTop, 0.07, 0.1, m.panelSilver));
    body.add(beam(pivot, bogie, 0.07, 0.1, m.panelSilver));
    // bogie: to the middle wheel's hub and the rear wheel's steering actuator
    body.add(beam(bogie, V(x - side * 0.12, 0.55, 0.05), 0.06, 0.08, m.panelSilver));
    body.add(beam(bogie, V(x - side * 0.1, 0.86, -0.95), 0.06, 0.08, m.panelSilver));
    body.add(put(cyl(0.07, 0.07, 0.1, m.metal, 14), bogie.x + side * 0.03, bogie.y, bogie.z).rotateZ(Math.PI / 2));
    // steering actuators above the front and rear wheels, and the brackets down to the hubs
    // (the brackets come down the inner side of each wheel to its hub)
    [front, rear].forEach(function (p) {
      body.add(put(cyl(0.07, 0.07, 0.16, m.panelGray, 14), x - side * 0.1, 0.8, p.z));
      body.add(beam(V(x - side * 0.1, 0.72, p.z), V(x - side * 0.24, p.y, p.z), 0.05, 0.06, m.panelSilver));
    });
    body.add(beam(V(x - side * 0.12, 0.55, 0.05), V(x - side * 0.24, middle.y, 0.05), 0.05, 0.06, m.panelSilver));

    [front, middle, rear].forEach(function (p) {
      const wheel = roverWheel(wheelR, 0.4, side, isPerseverance ? "perseverance" : "curiosity", m);
      wheel.position.copy(p);
      rover.add(wheel);
      wheels.push(wheel);
    });
  });
  mergeStatic(body);
  rover.add(body);

  rover.userData.size = 3;
  rover.userData.wheels = wheels;
  return rover;
}

// Spirit and Opportunity (Mars Exploration Rovers): solar-powered, 1.6 m long, 2.3 m wide with the solar
// wings, 1.5 m tall at the camera mast; six 26 cm wheels on a rocker-bogie. Shown: the solar deck and its
// side and rear wings, the Pancam mast with its camera bar, the round high-gain dish, the low-gain and UHF
// rods, and the instrument arm stowed under the front.
function createMerRover() {
  const m = getMaterials();
  const rover = new THREE.Group();
  const body = new THREE.Group();

  body.add(put(box(0.85, 0.3, 1.05, m.panelWhite), 0, 0.5, 0));
  body.add(put(box(0.86, 0.03, 1.06, m.foilBlack), 0, 0.34, 0));
  // solar arrays: a main deck, a rear wing and two side wings (with a frame around each)
  const deck = function (w, d, x, z, tilt) {
    const panel = box(w, 0.025, d, m.solar);
    panel.position.set(x, 0.69, z);
    panel.rotation.z = tilt || 0;
    body.add(panel);
    const frame = box(w + 0.03, 0.02, d + 0.03, m.panelSilver);
    frame.position.set(x, 0.675, z);
    frame.rotation.z = tilt || 0;
    body.add(frame);
  };
  deck(1.1, 1.15, 0, 0.02);
  deck(1.25, 0.42, 0, -0.78);
  [-1, 1].forEach(function (side) { deck(0.5, 0.95, side * 0.82, 0.05, side * -0.04); });

  // Pancam mast at the front with its camera bar (Pancam and Navcam pairs)
  body.add(put(cyl(0.03, 0.04, 0.72, m.panelWhite, 12), 0, 1.07, 0.48));
  const head = new THREE.Group();
  head.position.set(0, 1.47, 0.48);
  head.add(box(0.4, 0.09, 0.11, m.panelWhite));
  [-0.15, -0.06, 0.06, 0.15].forEach(function (x) {
    const lens = cyl(0.02, 0.02, 0.04, m.black, 10);
    lens.rotation.x = Math.PI / 2;
    head.add(put(lens, x, 0, 0.07));
  });
  head.add(put(box(0.12, 0.05, 0.06, m.panelGray), 0, 0.07, 0));
  rover.add(head);

  // Antennas: high-gain dish on a gimbal, low-gain and UHF rods
  const hga = cyl(0.14, 0.14, 0.03, m.panelSilver, 24);
  hga.rotation.x = -0.4;
  rover.add(put(hga, -0.33, 0.86, -0.25));
  body.add(put(cyl(0.03, 0.04, 0.14, m.metal, 10), -0.33, 0.76, -0.25));
  body.add(strut(V(0.38, 0.7, -0.42), V(0.38, 1.2, -0.42), 0.012, m.metal, 6));
  body.add(strut(V(0.28, 0.7, -0.5), V(0.28, 1.0, -0.5), 0.01, m.metal, 6));

  // Instrument arm folded under the front, with its four-tool turret
  body.add(strut(V(0.3, 0.42, 0.53), V(0.15, 0.33, 0.62), 0.025, m.panelWhite, 8));
  body.add(strut(V(0.15, 0.33, 0.62), V(-0.18, 0.36, 0.64), 0.022, m.panelWhite, 8));
  body.add(put(cyl(0.07, 0.07, 0.07, m.panelGray, 10), -0.24, 0.33, 0.64));
  [0, 1, 2, 3].forEach(function (i) {
    const a = (i / 4) * Math.PI * 2;
    body.add(put(cyl(0.025, 0.025, 0.08, i ? m.metal : m.foilGold, 8), -0.24 + Math.cos(a) * 0.06, 0.27, 0.64 + Math.sin(a) * 0.06));
  });

  // Rocker-bogie and six wheels
  const wheels = [];
  [-1, 1].forEach(function (side) {
    const x = side * 0.62;
    const pivot = V(side * 0.46, 0.48, 0.05);
    const bogie = V(side * 0.58, 0.32, -0.28);
    body.add(beam(pivot, V(x, 0.3, 0.55), 0.035, 0.045, m.panelSilver));
    body.add(beam(pivot, bogie, 0.035, 0.045, m.panelSilver));
    body.add(beam(bogie, V(x, 0.26, -0.02), 0.03, 0.04, m.panelSilver));
    body.add(beam(bogie, V(x, 0.26, -0.55), 0.03, 0.04, m.panelSilver));
    [0.55, -0.55].forEach(function (z) { body.add(put(cyl(0.035, 0.035, 0.08, m.panelGray, 10), x, 0.31, z)); });

    [0.55, -0.02, -0.55].forEach(function (z) {
      const wheel = roverWheel(0.13, 0.16, side, "mer", m);
      wheel.position.set(x, 0.13, z);
      rover.add(wheel);
      wheels.push(wheel);
    });
  });
  mergeStatic(body);
  rover.add(body);

  rover.userData.size = 1.6;
  rover.userData.wheels = wheels;
  return rover;
}

// Sojourner: the small Mars Pathfinder rover, 65 cm long, 48 cm wide, 30 cm tall; six 13 cm wheels on a
// rocker-bogie. Shown: the solar panel on top, the whip antenna, the front camera pair and laser
// hazard-detection stripes, and the alpha proton X-ray spectrometer (APXS) at the back.
function createSojourner() {
  const m = getMaterials();
  const rover = new THREE.Group();
  const body = new THREE.Group();

  body.add(put(box(0.34, 0.12, 0.42, m.foilGold), 0, 0.19, 0));
  body.add(put(box(0.44, 0.012, 0.52, m.solar), 0, 0.272, -0.02));
  body.add(put(box(0.45, 0.01, 0.53, m.panelSilver), 0, 0.264, -0.02));
  body.add(strut(V(0.12, 0.27, -0.2), V(0.12, 0.55, -0.2), 0.004, m.metal, 6));    // antenna
  body.add(put(cyl(0.008, 0.008, 0.02, m.black, 6), 0.12, 0.56, -0.2));
  [-0.06, 0.06].forEach(function (x) {
    body.add(put(box(0.03, 0.03, 0.02, m.black), x, 0.2, 0.215));                  // front cameras
  });
  body.add(put(box(0.18, 0.015, 0.01, m.black), 0, 0.16, 0.212));                 // laser stripers
  body.add(put(cyl(0.03, 0.03, 0.05, m.panelSilver, 12), 0, 0.17, -0.25));         // APXS
  body.add(strut(V(0, 0.2, -0.21), V(0, 0.17, -0.24), 0.008, m.metal, 6));

  const wheels = [];
  [-1, 1].forEach(function (side) {
    body.add(beam(V(side * 0.19, 0.2, 0.05), V(side * 0.235, 0.09, 0.2), 0.012, 0.016, m.metal));
    body.add(beam(V(side * 0.19, 0.2, 0.05), V(side * 0.22, 0.13, -0.1), 0.012, 0.016, m.metal));
    body.add(beam(V(side * 0.22, 0.13, -0.1), V(side * 0.235, 0.09, 0), 0.01, 0.014, m.metal));
    body.add(beam(V(side * 0.22, 0.13, -0.1), V(side * 0.235, 0.09, -0.2), 0.01, 0.014, m.metal));
    [0.2, 0, -0.2].forEach(function (z) {
      const wheel = roverWheel(0.065, 0.07, side, "sojourner", m);
      wheel.position.set(side * 0.24, 0.065, z);
      rover.add(wheel);
      wheels.push(wheel);
    });
  });
  mergeStatic(body);
  rover.add(body);

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

  // Base petal and the electronics box in the middle (gold insulation), high-gain dish and low-gain antenna
  lander.add(put(cyl(R * 1.02, R * 1.02, 0.12, m.panelWhite, 3), 0, 0.06, 0));
  lander.add(put(cyl(0.28, 0.32, 0.3, m.foilGold, 12), 0, 0.28, 0));
  lander.add(put(cyl(0.29, 0.29, 0.03, m.panelSilver, 12), 0, 0.44, 0));
  lander.add(strut(V(0.18, 0.44, 0.05), V(0.22, 0.62, 0.05), 0.012, m.metal, 6));
  const hga = dish(0.14, 0.04, m.dish, 20);
  hga.position.set(0.22, 0.62, 0.05);
  hga.rotation.z = -0.5;
  lander.add(hga);
  lander.add(strut(V(-0.15, 0.44, -0.12), V(-0.15, 0.78, -0.12), 0.006, m.metal, 6));

  // Camera mast (it rose up after landing) with the stereo camera head (two eyes)
  const mast = new THREE.Group();
  mast.add(strut(V(0, 0, 0), V(0, 0.55, 0), 0.02, m.panelSilver, 8));
  mast.add(put(box(0.18, 0.1, 0.1, m.panelWhite), 0, 0.6, 0));
  [-0.05, 0.05].forEach(function (x) {
    const eye = cyl(0.022, 0.022, 0.03, m.black, 10);
    eye.rotation.x = Math.PI / 2;
    mast.add(put(eye, x, 0.6, 0.06));
  });
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
    const solar = triangle(V(-length / 2 * 0.86, 0.014, 0.05), V(length / 2 * 0.86, 0.014, 0.05), V(0, 0.014, h * 0.9), m.solar);
    const back = triangle(V(-length / 2, 0, 0), V(length / 2, 0, 0), V(0, 0, h), m.panelWhite);
    fold.add(back);
    fold.add(solar);
    // the petal's frame along its two outer edges
    fold.add(strut(V(-length / 2, 0.01, 0), V(0, 0.01, h), 0.012, m.panelSilver, 6));
    fold.add(strut(V(length / 2, 0.01, 0), V(0, 0.01, h), 0.012, m.panelSilver, 6));
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

    const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.62, 22, 16), m.airbagFabric);
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

// Viking lander (1976). From NSSDCA: a six-sided aluminium/titanium base with alternating 1.09 m and 0.56 m
// sides (about 1.5 m across), on three legs attached to the short sides; about 2 m tall. Shown: two
// nuclear power generators under their wind covers, the 0.76 m high-gain dish on its mast, the two
// facsimile cameras, the weather boom, the soil sampler boom and collector head, and the three descent
// engines, each with 18 small nozzles (spread out so the exhaust disturbed the soil less).
function createVikingLander() {
  const m = getMaterials();
  const lander = new THREE.Group();

  // the body: an equilateral triangle (side 2.21 m) with its corners cut off at 0.56 m
  const R = 2.21 / Math.sqrt(3);
  const outline = new THREE.Shape();
  for (let k = 0; k < 3; k++) {
    const corner = (k * Math.PI * 2) / 3 + Math.PI / 6;
    const prev = corner - (Math.PI * 2) / 3;
    const next = corner + (Math.PI * 2) / 3;
    const cx = Math.cos(corner) * R, cz = Math.sin(corner) * R;
    const toPrev = V(Math.cos(prev) * R - cx, 0, Math.sin(prev) * R - cz).normalize().multiplyScalar(0.56);
    const toNext = V(Math.cos(next) * R - cx, 0, Math.sin(next) * R - cz).normalize().multiplyScalar(0.56);
    const a = [cx + toPrev.x, -(cz + toPrev.z)];
    const b = [cx + toNext.x, -(cz + toNext.z)];
    if (k === 0) outline.moveTo(a[0], a[1]); else outline.lineTo(a[0], a[1]);
    outline.lineTo(b[0], b[1]);
  }
  outline.closePath();
  const bodyGeometry = new THREE.ExtrudeGeometry(outline, { depth: 0.46, bevelEnabled: false });
  bodyGeometry.rotateX(-Math.PI / 2);
  const bodyMesh = new THREE.Mesh(bodyGeometry, m.panelWhite);
  bodyMesh.position.y = 0.78;
  lander.add(bodyMesh);
  const deck = new THREE.Mesh(bodyGeometry.clone().scale(1.01, 0.08, 1.01), m.panelGray);
  deck.position.y = 1.22;
  lander.add(deck);

  // two power generators under their wind covers
  [-1, 1].forEach(function (side) {
    lander.add(put(box(0.3, 0.26, 0.42, m.panelGray), side * 0.5, 1.39, -0.12));
    for (let i = 0; i < 4; i++) lander.add(put(box(0.31, 0.02, 0.02, m.black), side * 0.5, 1.3 + i * 0.06, 0.1));
  });

  // high-gain dish on its mast, and the UHF antenna
  lander.add(strut(V(0.1, 1.25, -0.35), V(0.25, 1.85, -0.35), 0.03, m.metal));
  const antenna = dish(0.38, 0.12, m.dish, 28);
  antenna.position.set(0.25, 1.9, -0.35);
  antenna.rotation.x = -0.6;
  lander.add(antenna);
  lander.add(put(cyl(0.02, 0.02, 0.2, m.metal, 6), 0.25, 1.98, -0.32));
  lander.add(put(cyl(0.035, 0.05, 0.3, m.panelWhite, 10), -0.35, 1.4, -0.45));

  // two facsimile cameras: posts with domed heads and their viewing slits
  [-0.35, 0.35].forEach(function (x) {
    lander.add(put(cyl(0.07, 0.07, 0.35, m.panelWhite, 14), x, 1.42, 0.55));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.panelSilver);
    lander.add(put(dome, x, 1.6, 0.55));
    lander.add(put(box(0.03, 0.08, 0.02, m.black), x, 1.62, 0.63));
  });

  // weather boom and the soil sampler boom with its collector head
  lander.add(strut(V(-0.6, 1.25, 0.2), V(-0.95, 1.75, 0.55), 0.02, m.metal));
  lander.add(put(box(0.12, 0.08, 0.08, m.panelWhite), -0.97, 1.78, 0.57));
  lander.add(put(box(0.24, 0.2, 0.32, m.panelWhite), 0.55, 1.05, 0.4));
  lander.add(strut(V(0.6, 1.0, 0.5), V(1.3, 0.45, 1.15), 0.035, m.panelSilver));
  lander.add(put(box(0.14, 0.1, 0.18, m.metal), 1.33, 0.4, 1.2));

  // three legs on the short sides, with shock struts and footpads
  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI * 2) / 3 + Math.PI / 6;
    const dir = V(Math.cos(a), 0, Math.sin(a));
    const side = V(-dir.z, 0, dir.x);
    const top = dir.clone().multiplyScalar(0.7).setY(0.95);
    const foot = dir.clone().multiplyScalar(1.35).setY(0.1);
    lander.add(strut(top, foot, 0.045, m.panelSilver, 10));
    [-1, 1].forEach(function (s2) {
      lander.add(strut(dir.clone().multiplyScalar(0.55).add(side.clone().multiplyScalar(s2 * 0.3)).setY(0.8), foot.clone().lerp(top, 0.45), 0.022, m.metal, 6));
    });
    const pad = footpad(0.17, m.panelSilver);
    pad.position.copy(foot).setY(0.07);
    lander.add(pad);
  }

  // three descent engines, each a housing with 18 small nozzles
  const engines = [];
  [0, 1, 2].forEach(function (k) {
    const angle = (k * Math.PI * 2) / 3 + Math.PI / 2;
    const x = Math.cos(angle) * 0.45;
    const z = Math.sin(angle) * 0.45;
    lander.add(put(box(0.24, 0.1, 0.16, m.panelGray), x, 0.74, z));
    for (let i = 0; i < 18; i++) {
      const nx = x + ((i % 6) - 2.5) * 0.035;
      const nz = z + (Math.floor(i / 6) - 1) * 0.045;
      lander.add(put(cyl(0.008, 0.014, 0.05, m.bell, 6), nx, 0.665, nz));
    }
    engines.push(V(x, 0.6, z));
  });

  mergeStatic(lander);
  lander.userData.size = 2.4;
  lander.userData.engines = engines;
  return lander;
}

// Phoenix (2008) and InSight (2018): a ten-sided deck on three legs with two round solar arrays that open
// like paper fans (InSight's are 2.2 m across, from NASA/JPL), a camera mast, a weather mast, a robotic arm,
// and twelve small descent engines in groups under the deck. userData.setArrays(0) = folded,
// setArrays(1) = open. InSight also places its seismometer and heat probe on the ground.
function createDeckLander(kind) {
  const m = getMaterials();
  const lander = new THREE.Group();
  const deck = new THREE.Group();
  const isInsight = kind === "insight";
  const arrayRadius = isInsight ? 1.08 : 0.9;

  deck.add(put(cyl(0.72, 0.72, 0.3, m.foilGold, 10), 0, 1.0, 0));
  deck.add(put(cyl(0.75, 0.75, 0.05, m.panelWhite, 10), 0, 1.18, 0));
  deck.add(put(cyl(0.73, 0.7, 0.04, m.foilBlack, 10), 0, 0.84, 0));
  // instruments and boxes on the deck
  deck.add(put(box(0.36, 0.18, 0.28, m.panelWhite), 0.15, 1.3, -0.25));
  deck.add(put(box(0.24, 0.14, 0.22, m.foilGold), -0.25, 1.28, -0.3));
  if (isInsight) {
    [-1, 1].forEach(function (s2) { deck.add(put(cyl(0.05, 0.08, 0.14, m.panelWhite, 12), s2 * 0.25, 1.28, 0.4)); }); // RISE horns
    deck.add(put(cyl(0.03, 0.03, 0.35, m.panelWhite, 8), 0.45, 1.35, 0.05));          // UHF helix
  } else {
    deck.add(put(box(0.3, 0.2, 0.3, m.panelWhite), 0.3, 1.3, 0.25));                 // TEGA ovens
    deck.add(put(box(0.25, 0.15, 0.2, m.panelGray), -0.35, 1.28, 0.2));              // MECA
  }

  // camera mast (Phoenix) or deck cameras (InSight), and the weather mast with its wind sensors
  if (!isInsight) {
    deck.add(strut(V(-0.3, 1.2, 0.35), V(-0.3, 2.0, 0.35), 0.03, m.panelWhite));
    deck.add(put(box(0.22, 0.12, 0.14, m.panelWhite), -0.3, 2.05, 0.35));
    [-0.05, 0.05].forEach(function (x) { deck.add(put(cyl(0.025, 0.025, 0.03, m.black, 10).rotateX(Math.PI / 2), -0.3 + x, 2.05, 0.43)); });
    deck.add(strut(V(0.35, 1.2, -0.3), V(0.35, 2.1, -0.3), 0.015, m.metal));
    deck.add(put(cyl(0.006, 0.006, 0.12, m.metal, 4), 0.35, 2.16, -0.3));             // the telltale
  } else {
    [-1, 1].forEach(function (s2) {
      deck.add(strut(V(s2 * 0.4, 1.2, -0.4), V(s2 * 0.55, 1.5, -0.55), 0.015, m.metal, 6));
      deck.add(put(box(0.08, 0.05, 0.12, m.panelWhite), s2 * 0.55, 1.52, -0.55));   // wind and temperature sensors
    });
  }

  // robotic arm (a scoop on Phoenix, a grapple on InSight)
  deck.add(strut(V(0.45, 1.15, 0.5), V(0.85, 1.6, 1.2), 0.04, m.panelWhite));
  deck.add(put(new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), m.metal), 0.85, 1.6, 1.2));
  deck.add(strut(V(0.85, 1.6, 1.2), V(1.15, 0.7, 1.75), 0.035, m.panelWhite));
  deck.add(put(box(0.16, 0.12, 0.2, m.metal), 1.18, 0.6, 1.8));
  deck.add(put(box(0.08, 0.06, 0.08, m.black), 1.12, 0.72, 1.7));                // arm camera

  // three legs with footpads
  for (let k2 = 0; k2 < 3; k2++) {
    const a = (k2 * Math.PI * 2) / 3 + Math.PI / 6;
    const dir = V(Math.cos(a), 0, Math.sin(a));
    const side = V(-dir.z, 0, dir.x);
    const top = dir.clone().multiplyScalar(0.62).setY(0.95);
    const foot = dir.clone().multiplyScalar(1.2).setY(0.08);
    deck.add(strut(top, foot, 0.04, m.panelSilver, 10));
    [-1, 1].forEach(function (s2) {
      deck.add(strut(dir.clone().multiplyScalar(0.5).add(side.clone().multiplyScalar(s2 * 0.3)).setY(0.85), foot.clone().lerp(top, 0.45), 0.02, m.metal, 6));
    });
    const pad = footpad(0.16, m.panelSilver);
    pad.position.copy(foot).setY(0.065);
    deck.add(pad);
  }

  // twelve descent engines: three groups of four
  const engines = [];
  [0, 1, 2].forEach(function (k2) {
    const angle = (k2 * Math.PI * 2) / 3 + Math.PI / 2;
    const x = Math.cos(angle) * 0.4;
    const z = Math.sin(angle) * 0.4;
    deck.add(put(box(0.2, 0.06, 0.2, m.panelGray), x, 0.83, z));
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (c) {
      const bell = nozzleBell(0.035, 0.1, m.nozzle, 10);
      bell.position.set(x + c[0] * 0.05, 0.8, z + c[1] * 0.05);
      deck.add(bell);
    });
    engines.push(V(x, 0.68, z));
  });
  detailUV(deck);
  mergeStatic(deck);
  lander.add(deck);

  // round solar arrays: ten triangular gores with ribs, unfolding like paper fans
  const arrays = [];
  [-1, 1].forEach(function (side) {
    const holder = new THREE.Group();
    holder.position.set(side * 0.75, 1.1, 0);
    const fan = new THREE.Group();
    fan.position.set(side * (arrayRadius + 0.05), 0, 0);
    const gores = 10;
    for (let i = 0; i < gores; i++) {
      const a0 = (i / gores) * Math.PI * 2;
      const a1 = ((i + 1) / gores) * Math.PI * 2;
      const r = arrayRadius * 0.97;
      fan.add(triangle(V(0, 0.016, 0), V(Math.cos(a1) * r, 0.016, Math.sin(a1) * r), V(Math.cos(a0) * r, 0.016, Math.sin(a0) * r), m.solar));
      fan.add(strut(V(0, 0.02, 0), V(Math.cos(a0) * arrayRadius, 0.02, Math.sin(a0) * arrayRadius), 0.008, m.panelSilver, 4));
    }
    fan.add(cyl(arrayRadius + 0.02, arrayRadius + 0.02, 0.02, m.panelWhite, gores));
    fan.add(put(cyl(0.08, 0.08, 0.05, m.panelGray, 12), 0, 0.02, 0));
    holder.add(fan);
    lander.add(holder);
    arrays.push({ holder: holder, side: side });
  });

  // InSight's instruments: the seismometer under its dome-shaped shield, and the heat probe
  let instruments = null;
  if (isInsight) {
    instruments = new THREE.Group();
    const shield = new THREE.Mesh(new THREE.SphereGeometry(0.35, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), m.panelSilver);
    shield.position.set(-0.4, 0, 1.9);
    instruments.add(shield);
    instruments.add(put(cyl(0.38, 0.4, 0.05, m.foilGold, 24), -0.4, 0.02, 1.9));
    instruments.add(put(box(0.3, 0.25, 0.3, m.foilGold), 0.6, 0.12, 1.9));
    instruments.add(put(cyl(0.02, 0.02, 0.1, m.metal, 8), 0.6, 0.3, 1.9));
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

  lander.userData.size = isInsight ? 6 : 5.5;
  lander.userData.engines = engines;
  return lander;
}

// ---------- Moon landers and the rover ----------

// Surveyor (1966-68): a three-sided frame of aluminium tubes on three legs, about 3 m tall, with the solar
// panel and flat planar-array antenna on top of a mast. Shown: the two white thermal compartments with
// mirror tops, the TV camera with its tilting mirror hood, two omnidirectional antennas on booms, the
// three vernier engines (used all the way down), crushable blocks and footpads. It carried a big solid
// retro-rocket under it (userData.retro) that was dropped during the descent.
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
    lander.add(strut(top[k], top[(k + 1) % 3], 0.025, m.panelSilver, 8));
    lander.add(strut(bottom[k], bottom[(k + 1) % 3], 0.025, m.panelSilver, 8));
    lander.add(strut(top[k], bottom[k], 0.025, m.panelSilver, 8));
    lander.add(strut(top[k], bottom[(k + 1) % 3], 0.02, m.panelSilver, 8));
    lander.add(put(new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), m.metal), top[k].x, top[k].y, top[k].z));
  }

  // Mast with the solar panel (cells framed in aluminium) and the planar-array antenna
  lander.add(strut(V(0, 0.8, 0), V(0, 2.9, 0), 0.03, m.panelSilver, 10));
  const panel = new THREE.Group();
  panel.add(box(0.85, 0.02, 0.6, m.solar));
  panel.add(put(box(0.88, 0.015, 0.63, m.panelSilver), 0, -0.012, 0));
  panel.position.set(0.25, 2.9, 0);
  panel.rotation.z = 0.5;
  lander.add(panel);
  const antenna = new THREE.Group();
  antenna.add(box(0.6, 0.02, 0.6, m.panelSilver));
  for (let i = -2; i <= 2; i++) {
    antenna.add(put(box(0.6, 0.024, 0.008, m.metal), 0, 0, i * 0.12));
    antenna.add(put(box(0.008, 0.024, 0.6, m.metal), i * 0.12, 0, 0));
  }
  antenna.position.set(-0.25, 2.7, 0.1);
  antenna.rotation.z = -0.7;
  lander.add(antenna);

  // Two thermal compartments (white with mirror tops) and the TV camera with its mirror hood
  [[0.25, 1.35, -0.35], [-0.35, 1.35, 0.15]].forEach(function (p) {
    lander.add(put(box(0.45, 0.35, 0.35, m.panelWhite), p[0], p[1], p[2]));
    lander.add(put(box(0.46, 0.02, 0.36, m.foilSilver), p[0], p[1] + 0.18, p[2]));
  });
  lander.add(put(cyl(0.08, 0.08, 0.45, m.panelWhite, 14), 0.35, 1.85, 0.45));
  const hood = box(0.14, 0.1, 0.12, m.panelSilver);
  hood.position.set(0.35, 2.12, 0.48);
  hood.rotation.x = 0.4;
  lander.add(hood);
  const mirror = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), m.visor);
  mirror.position.set(0.35, 2.12, 0.545);
  mirror.rotation.x = 0.4;
  lander.add(mirror);

  // Two omnidirectional antennas on folding booms
  [[-0.8, 1.9, -0.5], [0.85, 1.75, -0.55]].forEach(function (p) {
    lander.add(strut(V(p[0] * 0.5, 1.55, p[2] * 0.5), V(p[0], p[1], p[2]), 0.012, m.metal, 6));
    lander.add(put(cyl(0.0, 0.05, 0.12, m.panelWhite, 10), p[0], p[1] + 0.06, p[2]));
  });

  // Legs: main strut, shock absorber, crushable block and footpad
  for (let k = 0; k < 3; k++) {
    const angle = Math.PI / 3 + (k * Math.PI * 2) / 3;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const legTop = V(cos * 0.7, 0.85, sin * 0.7);
    const foot = V(cos * 1.6, 0.08, sin * 1.6);
    lander.add(strut(legTop, foot, 0.04, m.panelSilver, 10));
    lander.add(strut(V(cos * 0.45, 1.3, sin * 0.45), foot.clone().lerp(legTop, 0.45), 0.03, m.metal, 8));
    lander.add(strut(V(cos * 0.42, 0.72, sin * 0.42), foot.clone().lerp(legTop, 0.35), 0.02, m.metal, 6));
    lander.add(put(box(0.14, 0.1, 0.14, m.foilSilver), cos * 0.78, 0.66, sin * 0.78));   // crushable block
    const pad = footpad(0.16, m.panelWhite);
    pad.position.copy(foot).setY(0.06);
    lander.add(pad);
  }

  // Three small vernier engines (used all the way down)
  const engines = [];
  [0, 1, 2].forEach(function (k) {
    const angle = (k * Math.PI * 2) / 3;
    const x = Math.cos(angle) * 0.5;
    const z = Math.sin(angle) * 0.5;
    lander.add(put(cyl(0.05, 0.05, 0.08, m.panelGray, 10), x, 0.8, z));
    const bell = nozzleBell(0.07, 0.16, m.nozzle, 14);
    bell.position.set(x, 0.76, z);
    lander.add(bell);
    engines.push(V(x, 0.58, z));
  });
  mergeStatic(lander);

  // The big solid retro-rocket (a ball with a nozzle) under the frame
  const retro = new THREE.Group();
  retro.add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 18), m.panelGray));
  retro.add(put(cyl(0.425, 0.425, 0.06, m.metal, 28), 0, 0.05, 0));
  const retroBell = nozzleBell(0.24, 0.42, m.nozzle, 24);
  retroBell.position.y = -0.3;
  retro.add(retroBell);
  retro.position.set(0, 0.95, 0);
  lander.add(retro);

  lander.userData.size = 3;
  lander.userData.engines = engines;
  lander.userData.retro = retro;
  lander.userData.retroEngine = V(0, 0.25, 0);
  return lander;
}

// Apollo Lunar Roving Vehicle (Apollo 15-17). Built in meters from NASA's published sizes: 3.1 m long,
// 2.3 m wheelbase, about 1.8 m track, 1.14 m tall; four 82 cm wheels of woven zinc-coated wire with
// titanium chevron treads, each with its own drive motor and two suspension arms. Shown: the folding
// aluminium chassis, two seats, the control console and T-shaped hand controller, fenders, the
// communications relay unit (LCRU) with its umbrella-shaped high-gain antenna and helical low-gain
// antenna, the TV camera (GCTA), and the rear tool carrier.
function createLunarRover() {
  const m = getMaterials();
  const lrv = new THREE.Group();
  const frame = new THREE.Group();

  // chassis: three sections with side rails, floor panels
  [-0.55, 0.55].forEach(function (x) { frame.add(beam(V(x, 0.52, -1.5), V(x, 0.52, 1.5), 0.05, 0.06, m.panelSilver)); });
  [-1.45, -0.75, 0, 0.75, 1.45].forEach(function (z) { frame.add(beam(V(-0.55, 0.52, z), V(0.55, 0.52, z), 0.04, 0.05, m.panelSilver)); });
  frame.add(put(box(1.06, 0.025, 1.4, m.panelGray), 0, 0.5, 0));
  // front section: two batteries and the drive electronics under dust covers
  frame.add(put(box(1.0, 0.22, 0.62, m.panelSilver), 0, 0.66, 1.12));
  [-0.25, 0.25].forEach(function (x) { frame.add(put(box(0.42, 0.04, 0.55, m.panelWhite), x, 0.79, 1.12)); });
  // rear tool carrier (gate)
  frame.add(put(box(1.0, 0.36, 0.08, m.panelSilver), 0, 0.78, -1.42));
  frame.add(put(box(0.9, 0.18, 0.45, m.panelGray), 0, 0.62, -1.15));
  [-0.4, 0, 0.4].forEach(function (x) { frame.add(strut(V(x, 0.6, -1.4), V(x, 1.0, -1.42), 0.015, m.metal, 6)); });

  // Two seats: tubular frames with webbing, and the footrests
  [-0.3, 0.3].forEach(function (x) {
    frame.add(put(box(0.46, 0.04, 0.45, m.accent), x, 0.66, -0.05));
    const back = box(0.46, 0.42, 0.04, m.accent);
    back.position.set(x, 0.88, -0.3);
    back.rotation.x = -0.15;
    frame.add(back);
    frame.add(strut(V(x - 0.23, 0.52, -0.28), V(x - 0.23, 1.08, -0.32), 0.012, m.metal, 6));
    frame.add(strut(V(x + 0.23, 0.52, -0.28), V(x + 0.23, 1.08, -0.32), 0.012, m.metal, 6));
    frame.add(put(box(0.36, 0.03, 0.16, m.panelSilver), x, 0.55, 0.55));
  });

  // Control and display console with the T-shaped hand controller between the seats
  frame.add(strut(V(0, 0.52, 0.55), V(0, 1.0, 0.68), 0.025, m.metal, 8));
  const consoleBox = box(0.36, 0.26, 0.08, m.black);
  consoleBox.position.set(0, 1.05, 0.7);
  consoleBox.rotation.x = -0.35;
  frame.add(consoleBox);
  frame.add(put(box(0.37, 0.04, 0.1, m.panelSilver), 0, 1.19, 0.66));
  frame.add(strut(V(0, 0.66, 0.05), V(0, 0.84, 0.12), 0.015, m.metal, 6));
  frame.add(put(box(0.14, 0.03, 0.03, m.black), 0, 0.85, 0.13));

  // Communications relay unit (LCRU) at the front, umbrella high-gain antenna, helical low-gain antenna
  frame.add(put(box(0.42, 0.22, 0.25, m.panelWhite), 0.2, 0.95, 1.08));
  frame.add(strut(V(0.32, 0.95, 1.05), V(0.32, 1.65, 1.05), 0.018, m.metal, 6));
  const umbrella = dish(0.5, 0.18, m.mesh, 16);
  umbrella.position.set(0.32, 1.66, 1.05);
  umbrella.rotation.x = 0.4;
  frame.add(umbrella);
  [0, 1, 2, 3, 4, 5, 6, 7].forEach(function (i) {
    const a = (i / 8) * Math.PI * 2;
    const rib = V(Math.cos(a) * 0.5, 0.18, Math.sin(a) * 0.5).applyAxisAngle(V(1, 0, 0), 0.4);
    frame.add(strut(V(0.32, 1.66, 1.05), V(0.32, 1.66, 1.05).add(rib), 0.006, m.silver, 4));
  });
  frame.add(strut(V(0.05, 0.95, 1.12), V(0.05, 1.95, 1.12), 0.02, m.panelWhite, 8));  // helical antenna
  // TV camera (GCTA) on its mast, with its sun-shade hood
  frame.add(strut(V(-0.3, 0.75, 1.08), V(-0.3, 1.3, 1.12), 0.018, m.metal, 6));
  frame.add(put(box(0.18, 0.16, 0.28, m.panelWhite), -0.3, 1.38, 1.14));
  const lens = cyl(0.05, 0.06, 0.12, m.black, 12);
  lens.rotation.x = Math.PI / 2;
  frame.add(put(lens, -0.3, 1.38, 1.32));

  // Four wheels, each with a drive motor, two suspension arms and a fender
  const wheels = [];
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (c) {
    const x = c[0] * 0.95;
    const z = c[1] * 1.15;
    const wheel = roverWheel(0.41, 0.23, c[0], "lrv", m);
    wheel.position.set(x, 0.41, z);
    lrv.add(wheel);
    wheels.push(wheel);
    // upper and lower suspension arms from the chassis to the hub
    frame.add(beam(V(c[0] * 0.55, 0.56, z - c[1] * 0.25), V(x - c[0] * 0.12, 0.47, z), 0.04, 0.04, m.panelSilver));
    frame.add(beam(V(c[0] * 0.55, 0.44, z - c[1] * 0.25), V(x - c[0] * 0.12, 0.36, z), 0.04, 0.04, m.panelSilver));
    frame.add(put(cyl(0.11, 0.11, 0.1, m.panelGray, 14), x - c[0] * 0.13, 0.41, z).rotateZ(Math.PI / 2)); // drive motor
    // fender: a curved shell over the top of the wheel
    const fender = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.3, 20, 1, true, Math.PI / 2 - 1.1, 2.2), m.panelGray);
    fender.rotation.z = Math.PI / 2;
    fender.position.set(x, 0.41, z);
    frame.add(fender);
  });
  mergeStatic(frame);
  lrv.add(frame);

  lrv.userData.size = 3.1;
  lrv.userData.wheels = wheels;
  return lrv;
}

// Firefly Blue Ghost (2025): a wide, squat four-legged lander, about 2 m tall and 3.5 m wide (Firefly /
// NASA CLPS). Shown: the gold-insulated body, solar panels framed on its sides, the payloads, cameras and
// antennas on the top deck, four legs with footpads, the main engine and small thrusters.
function createBlueGhost() {
  const m = getMaterials();
  const lander = new THREE.Group();

  const bodyGeometry = new THREE.BoxGeometry(1.5, 1.1, 1.5);
  const bodyMesh = new THREE.Mesh(bodyGeometry, m.foilGold);
  bodyMesh.position.y = 1.25;
  lander.add(bodyMesh);
  lander.add(put(box(1.55, 0.06, 1.55, m.panelWhite), 0, 1.83, 0));
  lander.add(put(box(1.52, 0.05, 1.52, m.foilBlack), 0, 0.68, 0));
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (c) {
    const panel = box(c[0] ? 0.03 : 1.2, 0.85, c[1] ? 0.03 : 1.2, m.solar);
    panel.position.set(c[0] * 0.77, 1.25, c[1] * 0.77);
    lander.add(panel);
    const frame = box(c[0] ? 0.02 : 1.26, 0.91, c[1] ? 0.02 : 1.26, m.panelSilver);
    frame.position.set(c[0] * 0.765, 1.25, c[1] * 0.765);
    lander.add(frame);
  });

  // Payloads, cameras and antennas on the top deck
  lander.add(put(box(0.3, 0.25, 0.3, m.foilSilver), 0.4, 1.98, 0.4));
  lander.add(put(cyl(0.12, 0.12, 0.3, m.panelWhite, 14), -0.45, 2.0, 0.35));
  lander.add(put(box(0.25, 0.12, 0.2, m.foilBlack), 0.05, 1.92, -0.05));
  lander.add(strut(V(-0.4, 1.86, -0.4), V(-0.4, 2.3, -0.4), 0.025, m.metal));
  lander.add(put(box(0.16, 0.1, 0.14, m.panelWhite), -0.4, 2.35, -0.4));
  const lens = cyl(0.03, 0.03, 0.04, m.black, 10);
  lens.rotation.x = Math.PI / 2;
  lander.add(put(lens, -0.4, 2.35, -0.32));
  const antenna = dish(0.22, 0.07, m.dish, 24);
  antenna.position.set(0.45, 1.95, -0.45);
  antenna.rotation.x = -0.4;
  lander.add(antenna);

  // Four legs and the main engine, with small thrusters at the corners
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const dir = V(Math.cos(a), 0, Math.sin(a));
    const side = V(-dir.z, 0, dir.x);
    const top = dir.clone().multiplyScalar(0.95).setY(0.9);
    const foot = dir.clone().multiplyScalar(1.75).setY(0.08);
    lander.add(strut(top, foot, 0.05, m.panelSilver, 10));
    [-1, 1].forEach(function (s2) {
      lander.add(strut(dir.clone().multiplyScalar(0.75).add(side.clone().multiplyScalar(s2 * 0.4)).setY(0.72), foot.clone().lerp(top, 0.4), 0.025, m.metal, 6));
    });
    const pad = footpad(0.2, m.panelSilver);
    pad.position.copy(foot).setY(0.08);
    lander.add(pad);
    const rcs = nozzleBell(0.035, 0.08, m.nozzle, 10);
    rcs.position.copy(dir.clone().multiplyScalar(1.03)).setY(1.78);
    lander.add(rcs);
  }
  const engine = nozzleBell(0.22, 0.42, m.nozzle, 28);
  engine.position.y = 0.72;
  lander.add(engine);
  mergeStatic(lander);

  lander.userData.size = 3.5;
  lander.userData.engines = [V(0, 0.3, 0)];
  return lander;
}

// ---------- Impactors and atmosphere probes ----------

// LCROSS: the spent Centaur upper stage (nose forward = +Z)
function createCentaurStage() {
  const m = getMaterials();
  const inner = new THREE.Group();
  inner.add(put(cyl(1.5, 1.5, 9.5, m.panelSilver, 32), 0, 0, 0));
  inner.add(put(cyl(1.0, 1.5, 1.2, m.panelSilver, 32), 0, 5.35, 0));
  [-0.5, 0.5].forEach(function (x) {
    inner.add(put(nozzleBell(0.65, 1.4, m.nozzle, 24), x, (-5.4) + (1.4) / 2, 0));
  });
  return forward(inner, 12);
}

// LCROSS shepherding spacecraft: a ring structure with instruments and a solar panel (nose forward = +Z)
function createLcross() {
  const m = getMaterials();
  const inner = new THREE.Group();
  inner.add(new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.6, 24, 1, true), m.panelSilver));
  inner.add(put(box(0.7, 0.5, 0.5, m.foilGold), 0, 0, 0.85));
  inner.add(put(box(0.6, 0.4, 0.6, m.panelWhite), 0.75, 0, -0.3));
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
  const shade = box(2.5, 1.9, 0.08, m.panelWhite);
  shade.position.set(0, 0, 0.85);
  craft.add(shade);
  craft.add(put(box(1.3, 1.3, 1.4, m.foilGold), 0, 0, 0));
  [-1, 1].forEach(function (side) {
    craft.add(strut(V(side * 0.65, 0, 0), V(side * 1.2, 0, 0), 0.04, m.metal));
    craft.add(put(box(1.5, 0.03, 0.7, m.solar), side * 2.0, 0, 0));
  });
  craft.add(strut(V(0, 0.65, -0.3), V(0, 0.65, -3.6), 0.02, m.metal)); // magnetometer boom
  craft.userData.size = 5;
  return craft;
}

// ---------- Asteroid and planet-hunting spacecraft (added 2026-11-15; simplified shapes) ----------

// Kepler: a long telescope tube with a slanted sunshade, on a six-sided bus, with a fixed solar array
// that wraps part-way round one side of the tube. Forward (+Z) = the telescope opening.
function createKepler() {
  const m = getMaterials();
  const inner = new THREE.Group();
  inner.add(put(cyl(0.75, 0.75, 2.6, m.foilBlack, 32), 0, 0.3, 0));                    // telescope tube
  const shade = cyl(0.8, 0.8, 0.9, m.panelSilver, 32);                                 // sunshade at the opening
  shade.position.set(0, 2.0, 0);
  shade.rotation.z = 0.2;
  inner.add(shade);
  inner.add(put(cyl(0.95, 0.95, 0.8, m.foilGold, 6), 0, -1.35, 0));                     // spacecraft bus
  for (let i = 0; i < 4; i++) {                                                         // solar array, four panels on one side
    const a = -0.9 + i * 0.6;
    const panel = box(0.62, 2.4, 0.04, m.solar);
    panel.position.set(Math.sin(a) * 0.95, 0.2, Math.cos(a) * 0.95);
    panel.rotation.y = a;
    inner.add(panel);
  }
  const hga = dish(0.3, 0.1, m.dish, 18);                                               // antenna
  hga.position.set(0, -1.85, -0.6);
  hga.rotation.x = Math.PI;
  inner.add(hga);
  return forward(inner, 4.2);
}

// Dawn: a gold box with two very long solar wings (almost 20 m tip to tip), a dish antenna,
// and ion engines underneath. Forward (+Z) = the antenna side.
function createDawn() {
  const m = getMaterials();
  const craft = new THREE.Group();
  craft.add(put(box(1.3, 1.6, 1.3, m.foilGold), 0, 0, 0));
  [-1, 1].forEach(function (side) {
    craft.add(strut(V(side * 0.65, 0, 0), V(side * 1.1, 0, 0), 0.04, m.metal));
    for (let i = 0; i < 5; i++) {                                                       // five panels per wing
      craft.add(put(box(1.55, 0.03, 1.5, m.solar), side * (1.95 + i * 1.6), 0, 0));
    }
  });
  const hga = dish(0.75, 0.2, m.dish, 24);
  hga.position.set(0, 0, 0.75);
  hga.rotation.x = -Math.PI / 2;
  craft.add(hga);
  [-0.35, 0, 0.35].forEach(function (x) {                                               // three ion engines
    craft.add(put(cyl(0.16, 0.2, 0.18, m.black, 16), x, -0.88, 0));
  });
  craft.add(put(cyl(0.12, 0.12, 0.25, m.black, 12), 0.35, 0.3, 0.68));                  // camera
  craft.userData.size = 17;
  return craft;
}

// NEAR Shoemaker: an eight-sided body with four solar panels spread around a fixed dish antenna,
// and the instruments on the far side. Forward (+Z) = the antenna side.
function createNear() {
  const m = getMaterials();
  const inner = new THREE.Group();
  inner.add(put(cyl(0.85, 0.85, 1.7, m.foilGold, 8), 0, 0, 0));
  const hga = dish(0.75, 0.2, m.dish, 24);
  hga.position.set(0, 0.85, 0);
  inner.add(hga);
  for (let i = 0; i < 4; i++) {                                                         // four solar panels
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const panel = box(1.0, 0.04, 1.6, m.solar);
    panel.position.set(Math.cos(a) * 1.4, 0.9, Math.sin(a) * 1.4);
    panel.rotation.y = -a;
    inner.add(panel);
  }
  inner.add(put(cyl(0.2, 0.2, 0.35, m.black, 12), 0.3, -1.0, 0));                      // instruments
  inner.add(put(box(0.3, 0.3, 0.3, m.panelWhite), -0.3, -1.0, 0.2));
  return forward(inner, 3.6);
}

// Pioneer Venus probe: a cone-shaped heat shield with a round pressure vessel inside (nose forward = +Z)
function createVenusProbe(large) {
  const m = getMaterials();
  const inner = new THREE.Group();
  const scale = large ? 1.0 : 0.55;
  inner.add(put(cyl(0.2 * scale, 0.75 * scale, 0.45 * scale, m.heat, 32), 0, 0.2 * scale, 0));
  inner.add(put(new THREE.Mesh(new THREE.SphereGeometry(0.4 * scale, 24, 16), m.panelSilver), 0, -0.25 * scale, 0));
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
    antenna.add(strut(V(0, 0, 0), V(Math.cos(angle) * 1.6, 0.55, Math.sin(angle) * 1.6), 0.02, m.foilGold));
  }
  const mesh = dish(1.6, 0.55, m.dish, 18);
  antenna.add(mesh);
  antenna.position.y = 1.7;
  craft.add(antenna);

  craft.add(put(cyl(0.12, 0.12, 0.8, m.panelWhite, 12), 0, 1.3, 0));          // antenna mast
  craft.add(put(cyl(0.75, 0.75, 0.7, m.foilGold, 10), 0, 0.6, 0));            // spinning section
  craft.add(put(cyl(0.6, 0.75, 0.45, m.black, 10), 0, 0, 0));             // despun section
  craft.add(put(nozzleBell(0.3, 0.35, m.nozzle, 24), 0, (-0.4) + (0.35) / 2, 0));           // main engine

  // Two booms with the radioisotope power generators
  [-1, 1].forEach(function (side) {
    craft.add(strut(V(side * 0.6, 0.6, 0), V(side * 2.4, 0.4, 0.4 * side), 0.035, m.metal));
    const rtg = rtgUnit(0.22, 0.9, m, 8);
    rtg.rotation.z = Math.PI / 2;
    craft.add(put(rtg, side * 2.3, 0.4, 0.4 * side));
  });

  // Science boom with the magnetometers, and the scan platform with cameras underneath
  craft.add(strut(V(0, 0.6, 0.6), V(0.3, 0.9, 5.5), 0.025, m.metal));
  craft.add(strut(V(0, -0.1, -0.5), V(0, -0.9, -0.9), 0.04, m.metal));
  craft.add(put(box(0.5, 0.35, 0.4, m.panelWhite), 0, -1.0, -0.95));

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
  module.add(put(cyl(0.33, 0.36, 0.4, m.panelSilver, 24), 0, -0.25, 0));
  module.add(put(cyl(0.12, 0.12, 0.12, m.black, 12), 0, -0.5, 0));
  module.add(put(box(0.08, 0.06, 0.08, m.foilGold), 0.3, -0.2, 0.1));
  inner.add(module);

  const outer = forward(inner, 1.3);
  outer.userData.heatShield = shield;
  return outer;
}

// Cassini (1997-2017) with the Huygens probe. From NASA/JPL: 6.8 m tall and about 4 m wide; the 4 m
// high-gain dish on top, the electronics ring under it, the big propellant tanks wrapped in gold and black
// insulation, two main engines under covers, three RTGs, the remote-sensing pallet (cameras), the 11 m
// magnetometer boom and three 10 m radio and plasma wave antennas; Huygens (2.7 m) on the side.
// Forward (+Z) = the dish side.
function createCassini(withHuygens) {
  const m = getMaterials();
  const craft = new THREE.Group();
  const body = new THREE.Group();

  const antenna = dish(1.95, 0.5, m.dish, 48);
  antenna.position.y = 3.0;
  body.add(antenna);
  body.add(put(cyl(1.96, 1.96, 0.05, m.panelSilver, 48), 0, 3.5, 0));
  [0, 1, 2].forEach(function (k) {                                              // feed tripod and low-gain antenna
    const a = (k / 3) * Math.PI * 2;
    body.add(strut(V(Math.cos(a) * 0.9, 3.22, Math.sin(a) * 0.9), V(0, 4.1, 0), 0.015, m.metal, 4));
  });
  body.add(put(cyl(0.12, 0.2, 0.25, m.panelWhite, 12), 0, 4.15, 0));
  body.add(put(cyl(0.75, 0.75, 0.6, m.foilBlack, 12), 0, 2.6, 0));             // electronics bus (12 bays)
  body.add(put(cyl(0.76, 0.76, 0.05, m.panelGray, 12), 0, 2.32, 0));
  body.add(put(cyl(0.7, 0.75, 1.9, m.foilGold, 24), 0, 1.25, 0));              // propellant tanks
  body.add(put(cyl(0.55, 0.7, 0.4, m.foilBlack, 24), 0, 0.1, 0));              // lower equipment module
  [-0.35, 0.35].forEach(function (x) {                                         // two main engines under covers
    const bell = nozzleBell(0.3, 0.55, m.nozzle, 24);
    bell.position.set(x, -0.08, 0);
    body.add(bell);
  });
  body.add(put(new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), m.foilBlack), 0, -0.5, 0).rotateX(Math.PI));

  // three RTGs near the bottom
  [0, 1, 2].forEach(function (k) {
    const angle = (k * Math.PI * 2) / 3 + 0.4;
    const rtg = rtgUnit(0.22, 1.1, m, 8);
    rtg.rotation.z = Math.PI / 2;
    rtg.rotation.y = -angle;
    rtg.position.set(Math.cos(angle) * 1.0, 0.15, Math.sin(angle) * 1.0);
    craft.add(rtg);
  });

  // remote-sensing pallet (cameras), fields-and-particles pallet, magnetometer boom, RPWS antennas
  body.add(put(box(0.6, 0.9, 0.35, m.panelWhite), 0, 2.0, -0.88));
  [-0.15, 0.12].forEach(function (x, i) { body.add(put(cyl(i ? 0.08 : 0.12, i ? 0.08 : 0.12, 0.5, m.black, 14), x, 2.3, -1.12)); });
  body.add(put(box(0.5, 0.5, 0.3, m.foilGold), 0.85, 1.9, 0.0));
  body.add(strut(V(0.7, 2.6, 0), V(5.5, 2.9, 0.2), 0.02, m.metal, 6));
  body.add(strut(V(0.72, 2.62, 0.02), V(5.5, 2.92, 0.22), 0.01, m.metal, 4));
  [2.5, 4.0, 5.5].forEach(function (x) { body.add(put(box(0.14, 0.14, 0.14, m.panelWhite), x, 2.6 + (x - 0.7) * 0.06, 0.2 * (x - 0.7) / 4.8)); });
  [[-1, 0.3], [-0.3, -1], [0.6, 0.9]].forEach(function (d) {
    body.add(strut(V(d[0] * 0.5, 2.0, d[1] * 0.5), V(d[0] * 3.5, 1.4, d[1] * 3.5), 0.006, m.metal, 4));
  });
  detailUV(body);
  mergeStatic(body);
  craft.add(body);

  // Huygens, attached on the side: the gold-wrapped probe and its support ring
  let huygens = null;
  if (withHuygens) {
    huygens = new THREE.Group();
    huygens.add(put(cyl(0.25, 1.0, 0.35, m.foilGold, 48), 0, 0, 0));
    huygens.add(put(cyl(1.01, 1.01, 0.05, m.panelGray, 48), 0, -0.18, 0));
    huygens.add(put(cyl(0.5, 0.6, 0.18, m.foilGold, 32), 0, -0.28, 0));
    detailUV(huygens);
    huygens.rotation.x = Math.PI / 2;
    huygens.position.set(0, 1.4, 1.02);
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
  module.add(put(cyl(0.65, 0.65, 0.35, m.panelSilver, 32), 0, -0.2, 0));
  module.add(put(cyl(0.5, 0.65, 0.2, m.foilGold, 32), 0, -0.45, 0));
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

// The backshell and heat shield (userData.heatShield) that carry a Mars lander through the atmosphere.
// The heat shield is at the bottom (-Y), so the cone points up: a 70-degree sphere-cone shield, and a
// backshell with the parachute cover on top and small thrusters.
export function createBackshell(radius) {
  const m = getMaterials();
  const shell = new THREE.Group();
  const body = new THREE.Group();
  body.add(put(cyl(radius * 0.5, radius, radius * 0.8, m.panelWhite, 48), 0, radius * 0.4, 0));
  body.add(put(cyl(radius * 0.38, radius * 0.5, radius * 0.22, m.panelWhite, 32), 0, radius * 0.91, 0));
  body.add(put(cyl(radius * 1.005, radius * 1.005, radius * 0.03, m.panelGray, 48), 0, radius * 0.015, 0));
  [0, 1, 2, 3].forEach(function (i) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    body.add(put(box(radius * 0.1, radius * 0.08, radius * 0.1, m.panelGray), Math.cos(a) * radius * 0.72, radius * 0.4, Math.sin(a) * radius * 0.72));
  });
  detailUV(body, radius * 0.8);
  mergeStatic(body);
  shell.add(body);
  const shield = new THREE.Group();
  const profile = [new THREE.Vector2(0, -radius * 0.36), new THREE.Vector2(radius * 0.2, -radius * 0.33), new THREE.Vector2(radius, -radius * 0.03), new THREE.Vector2(radius * 0.98, 0)];
  shield.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 48), m.heat));
  shell.add(shield);
  shell.userData.heatShield = shield;
  shell.userData.size = radius * 2;
  return shell;
}

// Sky crane descent stage (Curiosity, Perseverance). From NASA/JPL: a frame carrying three spherical
// propellant tanks and eight throttleable engines in pairs at the corners, canted outward; the landing
// radar on the underside; the bridle that lowered the rover on cables (drawn by the landing scene).
function createSkyCrane() {
  const m = getMaterials();
  const stage = new THREE.Group();
  const frame = new THREE.Group();

  frame.add(put(box(2.2, 0.3, 2.6, m.foilGold), 0, 0.5, 0));
  frame.add(put(box(2.24, 0.04, 2.64, m.panelSilver), 0, 0.67, 0));
  [-1.1, 1.1].forEach(function (x) { [-1.3, 1.3].forEach(function (z) { frame.add(put(box(0.14, 0.4, 0.14, m.panelSilver), x, 0.48, z)); }); });
  [[0.6, 0.65], [-0.6, 0.65], [0, -0.7]].forEach(function (c) {                 // three propellant tanks
    frame.add(put(new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 16), m.panelSilver), c[0], 0.95, c[1]));
  });
  frame.add(put(box(0.5, 0.25, 0.4, m.foilBlack), 0, 0.85, 0.05));               // electronics
  frame.add(put(cyl(0.18, 0.18, 0.3, m.panelWhite, 12), 0, 1.0, 0));             // bridle (cable) unit
  [[0.4, 0.4], [-0.4, 0.4], [0.4, -0.4], [-0.4, -0.4]].forEach(function (c) {   // radar antennas underneath
    frame.add(put(cyl(0.1, 0.1, 0.04, m.panelWhite, 12), c[0], 0.33, c[1]));
  });
  // engine pods at the four corners
  const engines = [];
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (c) {
    frame.add(put(box(0.3, 0.2, 0.55, m.panelGray), c[0] * 1.1, 0.45, c[1] * 1.3));
    [0.15, -0.15].forEach(function (offset) {
      const x = c[0] * 1.15;
      const z = c[1] * 1.3 + offset * c[1];
      const bell = nozzleBell(0.11, 0.26, m.nozzle, 16);
      bell.position.set(x, 0.38, z);
      bell.rotation.x = -c[1] * 0.25;
      frame.add(bell);
      engines.push(V(x, 0.1, z));
    });
  });
  detailUV(frame);
  mergeStatic(frame);
  stage.add(frame);

  stage.userData.size = 3;
  stage.userData.engines = engines;
  return stage;
}

// Ingenuity, the Mars helicopter (upright), built from NASA/JPL's sizes (drawn about 4% larger, so the
// rotors are 1.25 m across as before): 49 cm tall, two counter-rotating rotors 1.2 m across, the solar panel on top of
// the mast, a small box-shaped fuselage wrapped in insulation, and four thin carbon-fibre legs.
// Its rotors spin only when flying = true.
function createHelicopter(flying) {
  const m = getMaterials();
  const copter = new THREE.Group();
  const k = 1.04;
  const g = new THREE.Group();
  g.scale.setScalar(k);
  copter.add(g);

  const body = new THREE.Group();
  body.add(put(box(0.136, 0.13, 0.163, m.foilGold), 0, 0.2, 0));               // fuselage
  body.add(put(box(0.14, 0.02, 0.167, m.panelGray), 0, 0.27, 0));
  body.add(put(box(0.02, 0.03, 0.03, m.black), 0.07, 0.17, 0.05));              // navigation camera
  body.add(put(cyl(0.008, 0.008, 0.06, m.panelWhite, 8), -0.05, 0.3, -0.05));   // antenna
  body.add(put(cyl(0.012, 0.012, 0.21, m.panelSilver, 10), 0, 0.37, 0));        // mast
  body.add(put(box(0.17, 0.008, 0.11, m.solar), 0, 0.49, 0));                   // solar panel on top
  body.add(put(box(0.175, 0.006, 0.115, m.panelSilver), 0, 0.485, 0));
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (c) {
    body.add(strut(V(c[0] * 0.05, 0.16, c[1] * 0.06), V(c[0] * 0.24, 0.005, c[1] * 0.24), 0.004, m.metal, 5));
    body.add(put(new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), m.metal), c[0] * 0.24, 0.005, c[1] * 0.24));
  });
  mergeStatic(body);
  g.add(body);

  // two rotors, two blades each: wide near the hub, narrowing to the tip
  const blade = function () {
    const shape = new THREE.Shape();
    shape.moveTo(0.03, -0.02);
    shape.quadraticCurveTo(0.25, -0.05, 0.6, -0.012);
    shape.lineTo(0.6, 0.01);
    shape.quadraticCurveTo(0.25, 0.04, 0.03, 0.02);
    shape.closePath();
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  };
  const bladeGeometry = blade();
  const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2b30, roughness: 0.6, side: THREE.DoubleSide });
  const rotor = function (y) {
    const r = new THREE.Group();
    r.position.y = y;
    [0, Math.PI].forEach(function (a) {
      const b = new THREE.Mesh(bladeGeometry, bladeMaterial);
      b.rotation.y = a;
      r.add(b);
    });
    r.add(cyl(0.025, 0.025, 0.02, m.panelSilver, 12));
    return r;
  };
  const rotorTop = rotor(0.44);
  const rotorBottom = rotor(0.38);
  rotorBottom.rotation.y = Math.PI / 2;
  g.add(rotorTop);
  g.add(rotorBottom);

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

  const bus = cyl(0.45, 0.45, 0.36, m.foilGold, 6);
  bus.rotation.x = Math.PI / 2;
  probe.add(put(bus, 0, 0, -0.35));
  probe.add(put(box(0.36, 0.22, 0.25, m.panelSilver), 0, -0.5, -0.35));            // science compartment

  [-1, 1].forEach(function (side) {                                          // two RTG booms, 120 degrees apart
    const end = V(side * 1.5, 0.75, -0.45);
    probe.add(strut(V(side * 0.35, 0.18, -0.35), end, 0.02, m.metal));
    const rtg = cyl(0.1, 0.1, 0.45, m.black, 12);
    rtg.rotation.z = Math.PI / 2;
    probe.add(put(rtg, end.x, end.y, end.z));
  });
  probe.add(strut(V(0, -0.4, -0.35), V(0, -3.2, -0.6), 0.008, m.metal));     // magnetometer boom
  probe.add(put(box(0.12, 0.12, 0.12, m.panelWhite), 0, -3.2, -0.6));
  probe.add(put(box(0.16, 0.002, 0.1, m.foilGold), 0.46, 0.0, -0.35).rotateZ(Math.PI / 2)); // the plaque

  probe.userData.size = 4.2;
  return probe;
}

// New Horizons: a triangular, gold-wrapped body, a 2.1 m dish in front (+Z), and one power generator on a corner
function createNewHorizons() {
  const m = getMaterials();
  const craft = new THREE.Group();

  const body = cyl(0.75, 0.75, 0.55, m.foilGold, 3);
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
  craft.add(put(box(0.25, 0.18, 0.2, m.panelSilver), 0.3, 0.45, -0.1));             // Ralph
  craft.userData.size = 2.6;
  return craft;
}

// Hubble Space Telescope, built in meters from NASA's published sizes: 13.2 m long and 4.2 m across at the
// aft shroud; the forward shell and light shield about 3.1 m across; the aperture door at the front (+Z).
// Two rigid solar arrays (fitted in 2002, about 7.1 x 2.6 m each), two high-gain antennas on booms,
// silver insulation blankets, the equipment bays with their doors, and the yellow handrails astronauts
// used on the servicing missions. setDeploy: the solar wings swing out and extend; the door opens.
function createHubble() {
  const m = getMaterials();
  const scope = new THREE.Group();
  const body = new THREE.Group();
  const along = function (mesh, z) { mesh.rotation.x = Math.PI / 2; mesh.position.z = z; body.add(mesh); return mesh; };

  along(cyl(1.55, 1.55, 5.4, m.foilSilver, 40), 3.7);                          // light shield
  along(cyl(1.57, 1.57, 0.12, m.panelGray, 40), 1.0);
  along(cyl(1.55, 1.55, 3.0, m.foilSilver, 40), -0.5);                         // forward shell
  along(cyl(2.1, 1.6, 0.5, m.panelSilver, 40), -2.25);                         // step out to the equipment section
  along(cyl(2.1, 2.1, 1.8, m.panelSilver, 10), -3.4);                          // equipment section (10 bays)
  along(cyl(2.1, 2.1, 2.3, m.foilSilver, 40), -5.45);                          // aft shroud
  along(cyl(2.12, 2.12, 0.1, m.panelGray, 40), -6.6);                          // aft bulkhead
  for (let i = 0; i < 10; i++) {                                                // bay doors
    const a = (i / 10) * Math.PI * 2 + Math.PI / 10;
    const door = box(1.1, 0.04, 1.4, m.panelGray);
    door.position.set(Math.cos(a) * 2.03, Math.sin(a) * 2.03, -3.4);
    door.rotation.z = a - Math.PI / 2;
    body.add(door);
  }
  // handrails along the forward shell and aft shroud
  [0, 1, 2, 3].forEach(function (i) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    body.add(strut(V(Math.cos(a) * 1.63, Math.sin(a) * 1.63, -1.9), V(Math.cos(a) * 1.63, Math.sin(a) * 1.63, 0.9), 0.025, m.handrail, 6));
    body.add(strut(V(Math.cos(a) * 2.18, Math.sin(a) * 2.18, -6.4), V(Math.cos(a) * 2.18, Math.sin(a) * 2.18, -4.4), 0.025, m.handrail, 6));
  });
  // two magnetometers and the low-gain antenna at the front
  [-1, 1].forEach(function (side) { body.add(put(box(0.2, 0.2, 0.35, m.panelWhite), side * 1.3, 1.0, 6.2)); });
  body.add(put(cyl(0.06, 0.12, 0.3, m.panelWhite, 10), 0, -1.6, 6.0).rotateX(Math.PI / 2));
  detailUV(body);
  mergeStatic(body);
  scope.add(body);

  const door = new THREE.Group();                                               // aperture door, hinged on top
  door.position.set(0, 1.55, 6.45);
  const doorPanel = cyl(1.5, 1.5, 0.1, m.panelWhite, 40);
  doorPanel.position.set(0, -1.55, 0.0);
  doorPanel.rotation.x = Math.PI / 2;
  door.add(doorPanel);
  scope.add(door);

  const wings = [];
  [-1, 1].forEach(function (side) {
    const hinge = new THREE.Group();
    hinge.position.set(side * 1.6, 0, -2.2);
    hinge.add(strut(V(0, 0, 0), V(side * 0.8, 0, 0), 0.06, m.metal));
    const panel = new THREE.Group();                                            // two panels either side of a mast
    panel.add(box(7.1, 0.05, 0.12, m.metal));
    [-1, 1].forEach(function (e) {
      panel.add(put(box(7.0, 0.03, 1.2, m.solar), 0, 0, e * 0.68));
      panel.add(put(box(7.1, 0.035, 0.04, m.panelSilver), 0, 0, e * 1.3));
    });
    panel.position.set(side * 4.35, 0, 0);
    hinge.add(panel);
    scope.add(hinge);
    wings.push({ hinge: hinge, panel: panel, side: side });
  });

  [-1, 1].forEach(function (side) {                                             // high-gain antennas on booms
    scope.add(strut(V(0, side * 1.55, -1.0), V(0, side * 3.4, -1.0), 0.05, m.panelSilver));
    const a = dish(0.66, 0.16, m.dish, 24);
    a.position.set(0, side * 3.45, -1.0);
    a.rotation.x = side > 0 ? 0 : Math.PI;
    scope.add(a);
    scope.add(put(cyl(0.02, 0.05, 0.35, m.metal, 8), 0, side * 3.6, -1.0));
  });

  scope.userData.size = 13;
  scope.userData.setDeploy = function (f) {
    const swing = clamp01(f * 2);
    const unroll = clamp01(f * 2 - 0.6);
    wings.forEach(function (w) {
      const k = 0.08 + 0.92 * unroll;
      w.hinge.rotation.z = 0;
      w.hinge.rotation.y = w.side * (1 - swing) * (Math.PI / 2);   // folded along the tube, then out
      w.panel.scale.x = k;
      w.panel.position.x = w.side * (0.8 + 3.55 * k);
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
  for (let i = 0; i < 5; i++) {
    const layer = new THREE.Mesh(layerGeometry, m.kapton);
    layer.rotation.x = -Math.PI / 2;
    layer.position.y = -i * 0.18;
    layer.scale.setScalar(1 - i * 0.03);
    shield.add(layer);
  }
  // spreader bars and the two booms that pulled the sunshield out (they spread with it)
  [[0, 7.1], [0, -7.1], [10.5, 0], [-10.5, 0]].forEach(function (c) {
    shield.add(strut(V(0, -0.4, 0), V(c[0], 0.02, -c[1]), 0.06, m.panelGray, 6));
  });
  inner.add(shield);

  // spacecraft bus under the shield: dark panels, the solar array, the high-gain dish and the trim flap
  inner.add(put(box(2.2, 1.0, 2.2, m.foilBlack), 0, -1.6, 0));
  inner.add(put(box(2.25, 0.08, 2.25, m.panelGray), 0, -1.08, 0));
  inner.add(put(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.04, 1.2), m.solar), 0, -2.2, -1.6));
  inner.add(strut(V(0, -2.1, -1.1), V(0, -2.2, -1.0), 0.05, m.metal));
  const jwstHga = dish(0.3, 0.08, m.dish, 20);
  jwstHga.position.set(0.7, -2.25, 0.6);
  jwstHga.rotation.x = Math.PI;
  inner.add(jwstHga);
  inner.add(strut(V(0.7, -2.1, 0.6), V(0.7, -2.25, 0.6), 0.04, m.metal));
  const flap = box(2.2, 0.03, 0.9, m.kapton);
  flap.position.set(0, -0.2, -7.6);
  flap.rotation.x = -0.6;
  inner.add(flap);
  inner.add(strut(V(0, -0.4, -6.9), V(0, -0.2, -7.4), 0.04, m.metal));

  const optics = new THREE.Group();                                           // the telescope, standing on the shield
  optics.position.y = 0.6;
  inner.add(optics);
  // backplane (a black frame behind the mirror), the instrument module behind it, and the tower
  optics.add(put(box(1.0, 1.2, 1.0, m.foilBlack), 0, 0.3, -1.0));
  optics.add(put(box(1.6, 1.9, 1.3, m.foilBlack), 0, 2.4, -1.15));            // ISIM: the four science instruments
  [-1.6, 1.6].forEach(function (x) {
    optics.add(strut(V(x, 0.6, -0.35), V(x, 4.2, -0.35), 0.06, m.black, 6));
    optics.add(strut(V(x, 0.6, -0.35), V(0, 0.8, -1.0), 0.05, m.black, 6));
  });
  optics.add(strut(V(-1.6, 4.2, -0.35), V(1.6, 4.2, -0.35), 0.06, m.black, 6));
  optics.add(strut(V(-1.6, 0.6, -0.35), V(1.6, 0.6, -0.35), 0.06, m.black, 6));
  optics.add(put(box(0.35, 0.35, 0.6, m.black), 0, 2.4, 0.2));                // aft optics at the center

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
  craft.add(put(box(1.4, 1.9, 1.4, m.foilGold), 0, 0, 0));
  craft.add(put(box(1.45, 0.25, 1.45, m.black), 0, 0.95, 0));
  [-0.35, 0, 0.35].forEach(function (x, i) {                                  // LROC cameras and other instruments
    craft.add(put(cyl(0.13, 0.13, 0.45 + i * 0.05, m.black, 16), x, 1.2, 0.35));
  });
  craft.add(put(box(0.35, 0.3, 0.35, m.panelWhite), -0.3, 1.2, -0.3));
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

// Orion (Artemis): the crew module (forward, +Z) with its silver backshell and windows, on ESA's European
// Service Module: radiators on the sides, the main engine (an OMS-E from the Space Shuttle), eight
// auxiliary thrusters, and four solar wings in an X, each of three panels (about 7 m long).
function createOrion() {
  const m = getMaterials();
  const inner = new THREE.Group();
  const body = new THREE.Group();
  body.add(put(cyl(0.95, 0.95, 1.6, m.panelWhite, 40), 0, 0.8, 0));            // service module
  for (let i = 0; i < 4; i++) {                                                 // radiator panels
    const a = (i / 4) * Math.PI * 2;
    body.add(put(box(0.8, 1.1, 0.03, m.panelSilver), Math.cos(a) * 0.96, 0.85, Math.sin(a) * 0.96).rotateY(-a + Math.PI / 2));
  }
  body.add(put(cyl(0.96, 0.96, 0.08, m.black, 40), 0, 1.6, 0));
  body.add(put(cyl(0.5, 0.97, 1.3, m.foilSilver, 40), 0, 2.3, 0));              // crew module
  body.add(put(cyl(0.98, 0.98, 0.12, m.heat, 40), 0, 1.68, 0));
  body.add(put(cyl(0.22, 0.25, 0.2, m.panelGray, 16), 0, 3.05, 0));             // docking hatch
  const lean = Math.atan2(0.97 - 0.5, 1.3);
  [-0.5, -0.17, 0.17, 0.5].forEach(function (a) {                               // four windows
    const w = box(0.18, 0.18, 0.03, m.black);
    w.rotation.order = "YXZ";
    w.rotation.set(-lean, a, 0);
    const r = 0.97 - (0.55 / 1.3) * (0.97 - 0.5) + 0.02;
    w.position.set(Math.sin(a) * r, 2.2, Math.cos(a) * r);
    body.add(w);
  });
  body.add(put(cyl(0.6, 0.95, 0.3, m.panelGray, 32), 0, -0.15, 0));             // spacecraft adapter ring
  const main = nozzleBell(0.42, 0.8, m.nozzle, 28);
  main.position.y = -0.2;
  body.add(main);
  for (let i = 0; i < 8; i++) {                                                 // auxiliary thrusters
    const a = (i / 8) * Math.PI * 2;
    const t = nozzleBell(0.05, 0.14, m.nozzle, 10);
    t.position.set(Math.cos(a) * 0.75, -0.02, Math.sin(a) * 0.75);
    body.add(t);
  }
  detailUV(body);
  mergeStatic(body);
  inner.add(body);
  for (let i = 0; i < 4; i++) {                                                 // four solar wings, three panels each
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const dir = V(Math.cos(a), 0, Math.sin(a));
    inner.add(strut(dir.clone().multiplyScalar(0.95).setY(0.6), dir.clone().multiplyScalar(1.45).setY(0.6), 0.04, m.metal));
    const wing = new THREE.Group();
    [0, 1, 2].forEach(function (j) {
      wing.add(put(box(1.0, 0.03, 0.9, m.solar), -1.08 + j * 1.08, 0, 0));
      wing.add(put(box(1.04, 0.035, 0.94, m.panelSilver), -1.08 + j * 1.08, -0.01, 0));
    });
    wing.position.copy(dir.clone().multiplyScalar(3.05).setY(0.6));
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
  // Apollo command module: a cone 3.9 m across and 3.2 m tall (scaled 0.5): brown ablative heat shield,
  // silver reflective skin, five windows, the side hatch and the docking tunnel on top
  const m = getMaterials();
  const capsule = new THREE.Group();
  const g = new THREE.Group();
  g.scale.setScalar(0.5);
  capsule.add(g);
  g.add(put(cyl(0.42, 1.95, 3.2, m.foilSilver, 48), 0, 1.75, 0));
  const shield = new THREE.Mesh(new THREE.SphereGeometry(4.7, 48, 8, 0, Math.PI * 2, Math.PI - 0.43, 0.43), m.heat);
  shield.position.y = 4.7 + 0.03;
  g.add(shield);
  g.add(put(cyl(1.97, 1.97, 0.18, m.heat, 48), 0, 0.12, 0));
  // the cone wall leans in by about 25.6 degrees; place windows and hatch on its surface
  const lean = Math.atan2(1.95 - 0.42, 3.2);
  const wallR = function (y) { return 1.95 - ((y - 0.15) / 3.2) * (1.95 - 0.42) + 0.02; };
  const onWall = function (mesh, angle, y) {
    mesh.rotation.order = "YXZ";
    mesh.rotation.set(-lean, angle, 0);
    mesh.position.set(Math.sin(angle) * wallR(y), y, Math.cos(angle) * wallR(y));
    g.add(mesh);
  };
  [-0.75, -0.4, 0, 0.4, 0.75].forEach(function (angle, i) {
    onWall(box(0.3, 0.26, 0.04, m.black), angle, i === 2 ? 2.05 : 1.85);   // five windows
  });
  onWall(box(0.75, 0.7, 0.04, m.panelGray), 0, 1.15);                       // side hatch
  g.add(put(cyl(0.36, 0.42, 0.35, m.panelSilver, 24), 0, 3.5, 0));                 // docking tunnel
  mergeStatic(g);
  addChutes(capsule, 3, 1.4, 1.2);
  capsule.userData.size = 1.3;
  return capsule;
}

function createOrionCm() {
  const m = getMaterials();
  const capsule = new THREE.Group();
  capsule.add(put(cyl(0.5, 1.0, 1.3, m.panelSilver, 40), 0, 0.72, 0));
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
  capsule.add(put(cyl(0.18, 0.4, 0.3, m.panelWhite, 32), 0, 0.22, 0));
  capsule.add(put(cyl(0.4, 0.3, 0.12, m.heat, 32), 0, 0.03, 0));
  addChutes(capsule, 1, 0.7, 0.8);
  capsule.userData.size = 0.8;
  return capsule;
}

// Gemini capsule with its adapter section behind it (forward, +Z = the capsule nose). From NASA: the
// re-entry module 2.3 m across at the base, covered in black ribbed shingles; two windows; the white
// adapter (equipment and retrograde sections) behind it, 3 m across.
function createGemini() {
  const m = getMaterials();
  const inner = new THREE.Group();
  inner.add(put(cyl(1.5, 1.5, 0.2, m.panelWhite, 40), 0, -1.2, 0));
  inner.add(put(cyl(1.15, 1.5, 1.4, m.panelWhite, 40), 0, -0.4, 0));          // adapter section
  for (let i = 0; i < 16; i++) {                                               // adapter stringers
    const a = (i / 16) * Math.PI * 2;
    const st = strut(V(Math.cos(a) * 1.51, -1.1, Math.sin(a) * 1.51), V(Math.cos(a) * 1.16, 0.3, Math.sin(a) * 1.16), 0.02, m.panelGray, 4);
    inner.add(st);
  }
  inner.add(put(cyl(1.16, 1.16, 0.06, m.panelGray, 40), 0, 0.32, 0));
  inner.add(put(cyl(0.48, 1.15, 1.4, m.ribbedBlack, 40), 0, 1.05, 0));       // re-entry module
  inner.add(put(cyl(0.38, 0.48, 0.9, m.ribbedBlack, 24), 0, 2.2, 0));       // nose (radar and parachute section)
  inner.add(put(cyl(0.3, 0.38, 0.12, m.panelGray, 24), 0, 2.7, 0));
  const lean = Math.atan2(1.15 - 0.48, 1.4);
  [-0.32, 0.32].forEach(function (a) {                                         // two windows (hatches)
    const w = box(0.28, 0.32, 0.04, m.panelSilver);
    w.rotation.order = "YXZ";
    w.rotation.set(-lean, a, 0);
    const r = 1.15 - (0.75 / 1.4) * (1.15 - 0.48) + 0.02;
    w.position.set(Math.sin(a) * r, 1.1, Math.cos(a) * r);
    inner.add(w);
  });
  detailUV(inner);
  mergeStatic(inner);
  return forward(inner, 3.8);
}

function createGeminiCm() {
  const m = getMaterials();
  const capsule = new THREE.Group();
  capsule.add(put(cyl(0.48, 1.15, 1.4, m.ribbedBlack, 36), 0, 0.75, 0));
  capsule.add(put(cyl(1.15, 1.1, 0.1, m.heat, 36), 0, 0.03, 0));
  capsule.add(put(cyl(0.38, 0.48, 0.6, m.ribbedBlack, 24), 0, 1.75, 0));
  const lean = Math.atan2(1.15 - 0.48, 1.4);
  [-0.32, 0.32].forEach(function (a) {
    const w = box(0.28, 0.32, 0.04, m.panelSilver);
    w.rotation.order = "YXZ";
    w.rotation.set(-lean, a, 0);
    const r = 1.15 - (0.75 / 1.4) * (1.15 - 0.48) + 0.02;
    w.position.set(Math.sin(a) * r, 0.8, Math.cos(a) * r);
    capsule.add(w);
  });
  addChutes(capsule, 1, 2.0, 2.2);
  capsule.userData.size = 2.2;
  return capsule;
}

// OSIRIS-REx: a box with two solar panels, a dish on top, the TAGSAM sampling arm, and the capsule on top
function createOsirisRex() {
  const m = getMaterials();
  const craft = new THREE.Group();
  craft.add(put(box(2.0, 2.0, 2.0, m.panelSilver), 0, 0, 0));
  craft.add(put(box(2.02, 0.3, 2.02, m.foilGold), 0, 0.85, 0));
  [-1, 1].forEach(function (side) {
    craft.add(strut(V(side, 0.3, 0), V(side * 1.4, 0.3, 0), 0.05, m.metal));
    craft.add(put(box(2.6, 0.04, 1.8, m.solar), side * 2.7, 0.3, 0));
  });
  const hga = dish(0.9, 0.22, m.dish, 32);
  hga.position.set(0, 1.0, -0.4);
  hga.rotation.x = -0.3;
  craft.add(hga);
  craft.add(put(cyl(0.18, 0.4, 0.3, m.panelWhite, 24), 0.5, 1.15, 0.6));          // sample return capsule
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
  craft.add(put(box(1.0, 1.0, 1.5, m.foilGold), 0, 0, 0));
  [-1, 1].forEach(function (side) {
    craft.add(put(box(2.2, 0.04, 0.9, m.solar), side * 1.65, 0, 0.1));
  });
  [0.95, 1.15].forEach(function (z, i) {                                      // Whipple shields
    craft.add(put(box(1.3 + i * 0.1, 1.2 + i * 0.1, 0.04, m.panelWhite), 0, 0, z));
  });
  craft.add(put(cyl(0.22, 0.4, 0.3, m.panelWhite, 24).rotateX(-Math.PI / 2), 0, 0, -0.95)); // capsule at the back
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
  inner.add(put(cyl(3.3, 3.3, 14.6, m.panelWhite, 36), 0, 0, 0));                 // workshop
  inner.add(put(cyl(3.32, 3.32, 0.4, m.black, 36), 0, 7.1, 0));
  inner.add(put(cyl(1.6, 1.6, 5.2, m.panelSilver, 24), 0, 9.9, 0));               // airlock module
  inner.add(put(cyl(1.5, 1.5, 5.2, m.panelWhite, 24), 0, 15.1, 0));               // docking adapter
  const parasol = box(7.0, 0.05, 7.0, m.foilGold);                                // improvised sunshade
  parasol.position.set(0, 0, 3.45);
  parasol.rotation.x = Math.PI / 2;
  inner.add(parasol);
  inner.add(strut(V(3.3, 3.0, 0), V(4.0, 3.0, 0), 0.08, m.metal));            // surviving solar wing
  inner.add(put(box(9.5, 0.06, 4.6, m.solar), 8.8, 2.0, 0).rotateZ(0));
  const atm = new THREE.Group();                                              // Apollo Telescope Mount
  atm.position.set(0, 14.8, 3.6);
  atm.add(put(cyl(1.2, 1.2, 3.0, m.foilGold, 8).rotateX(Math.PI / 2), 0, 0, 0));
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
  inner.add(put(cyl(2.05, 2.05, 9.0, m.panelWhite, 32), 0, 0, 0));                // Zarya, main body
  inner.add(put(cyl(1.35, 2.05, 2.4, m.panelWhite, 32), 0, 5.7, 0));              // tapered front
  inner.add(put(cyl(0.7, 0.7, 1.0, m.metal, 16), 0, 7.4, 0));
  inner.add(put(cyl(2.07, 2.07, 0.3, m.black, 32), 0, -2, 0));
  [-1, 1].forEach(function (side) {
    inner.add(strut(V(side * 2.05, -3.2, 0), V(side * 3, -3.2, 0), 0.08, m.metal));
    inner.add(put(box(10.6, 0.06, 3.3, m.solar), side * 8.2, -3.2, 0));
  });
  const unity = new THREE.Group();
  unity.add(put(cyl(2.25, 2.25, 5.5, m.panelSilver, 32), 0, 0, 0));               // Unity node
  unity.add(put(cyl(1.0, 1.4, 2.0, m.panelWhite, 24), 0, 3.6, 0));                 // mating adapter
  unity.add(put(cyl(1.0, 1.4, 2.0, m.panelWhite, 24), 0, -3.6, 0).rotateX(Math.PI));
  inner.add(unity);
  const station = forward(inner, 22);
  station.userData.setDeploy = function (f) {
    unity.position.y = 11.6 + (1 - f) * 12;
    unity.visible = f > 0.01;
  };
  station.userData.setDeploy(1);
  return station;
}

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

// Crew Dragon: the capsule (nose cone hinged on top, with four windows, Draco thrusters and four
// SuperDraco pods) on its trunk, which carries solar cells on one side and four small fins.
function dragonCapsuleParts(group, noseOpen) {
  const m = getMaterials();
  group.add(put(cyl(1.85, 1.85, 0.12, m.heat, 48), 0, 0.05, 0));               // heat shield
  group.add(put(cyl(1.15, 1.85, 2.0, m.panelWhite, 48), 0, 1.1, 0));           // capsule
  group.add(put(cyl(1.16, 1.86, 0.25, m.black, 48), 0, 0.6, 0));               // dark band
  const lean = Math.atan2(1.85 - 1.15, 2.0);
  const onWall = function (mesh, angle, y) {
    const r = 1.85 - ((y - 0.1) / 2.0) * (1.85 - 1.15) + 0.02;
    mesh.rotation.order = "YXZ";
    mesh.rotation.set(-lean, angle, 0);
    mesh.position.set(Math.sin(angle) * r, y, Math.cos(angle) * r);
    group.add(mesh);
  };
  [-0.55, -0.18, 0.18, 0.55].forEach(function (a) { onWall(box(0.3, 0.32, 0.04, m.black), a, 1.55); });      // windows
  onWall(box(0.75, 0.8, 0.03, m.panelGray), Math.PI, 1.3);                                                   // side hatch
  [0, 1, 2, 3].forEach(function (i) {                                          // SuperDraco pods
    const a = (i / 4) * Math.PI * 2 + 0.3;
    onWall(box(0.38, 0.5, 0.08, m.black), a + Math.PI / 2, 0.95);
  });
  group.add(put(cyl(0.3, 1.1, 0.6, m.panelWhite, 40), 0, noseOpen ? 2.4 : 2.4, 0)); // nose cone
  group.add(put(cyl(1.12, 1.12, 0.04, m.panelGray, 40), 0, 2.1, 0));
}

function createDragon() {
  const m = getMaterials();
  const inner = new THREE.Group();
  inner.add(put(cyl(1.85, 1.85, 2.6, m.panelWhite, 48), 0, -1.3, 0));          // trunk
  const cells = new THREE.Mesh(new THREE.CylinderGeometry(1.865, 1.865, 2.2, 48, 1, true, 0, Math.PI), m.solar);
  cells.position.y = -1.35;
  inner.add(cells);                                                             // solar cells on one side
  [0, 1, 2, 3].forEach(function (i) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const fin = box(0.05, 1.1, 0.6, m.panelWhite);
    fin.position.set(Math.cos(a) * 1.95, -2.1, Math.sin(a) * 1.95);
    fin.rotation.y = -a;
    inner.add(fin);
  });
  dragonCapsuleParts(inner, false);
  detailUV(inner);
  mergeStatic(inner);
  return forward(inner, 8);
}

// Crew Dragon coming home: the capsule alone, standing upright (heat shield down). Before re-entry the
// trunk is jettisoned, so it is not drawn here.
function createDragonCapsule() {
  const capsule = new THREE.Group();
  const body = new THREE.Group();
  dragonCapsuleParts(body, false);
  detailUV(body);
  mergeStatic(body);
  capsule.add(body);
  capsule.userData.size = 4.2;
  return capsule;
}

// ---------- Choose a model by name ----------
// Phase 2 models get their foil and panel textures mapped at a sensible size (see detailUV)
const DETAIL_UV_MODELS = ["centaur", "lcross", "messenger", "venus-probe-large", "venus-probe-small", "galileo-orbiter",
  "galileo-probe", "huygens", "pioneer", "new-horizons", "lro", "orion-cm", "src", "osiris-rex", "stardust", "skylab",
  "zarya-unity", "jwst"];
export function createModel(name) {
  const model = buildModel(name);
  if (DETAIL_UV_MODELS.indexOf(name) !== -1) detailUV(model);
  return model;
}

function buildModel(name) {
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
    case "kepler": return createKepler();
    case "dawn": return createDawn();
    case "near": return createNear();
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