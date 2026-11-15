// Shared detail for the models built in code (rockets, spacecraft, landers, rovers).
// Everything here is generated: shapes from three.js geometry and surface textures painted on canvases,
// so nothing is downloaded. It raises every model to the same level of detail: real nozzle and nose
// shapes, panel seams and rivets that keep the same size on big and small parts, crinkled insulation
// foil, solar cells, and joint rings.
//
// Textures that should keep a real-world size (panels about 2 m wide) use "world UVs": worldUV() rescales
// a part's texture coordinates by its size in meters, and the textures repeat.

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// ---------- Canvas textures (made once, cached) ----------
const cache = {};
function canvasTexture(key, width, height, draw, options) {
  if (cache[key]) return cache[key];
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext && canvas.getContext("2d");
  if (ctx) draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  if (!options || options.color !== false) texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  cache[key] = texture;
  return texture;
}

// A seeded random so the textures look the same every time
function seeded(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Panel seams, horizontal frames and rivet rows, as a bump map (light = raised). One tile = one panel.
export function panelBump() {
  return canvasTexture("panel-bump", 256, 256, function (ctx, w, h) {
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, w, h);
    const rnd = seeded(7);
    // faint skin waviness
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = "rgba(" + (rnd() < 0.5 ? "255,255,255" : "0,0,0") + ",0.025)";
      ctx.fillRect(rnd() * w, rnd() * h, 8 + rnd() * 30, 2 + rnd() * 6);
    }
    // seams (sunken lines) at the panel edges
    ctx.fillStyle = "#3c3c3c";
    ctx.fillRect(0, 0, w, 4);
    ctx.fillRect(0, 0, 4, h);
    // rivet rows beside the seams
    ctx.fillStyle = "#c8c8c8";
    for (let x = 10; x < w; x += 12) { ctx.fillRect(x, 9, 3, 3); ctx.fillRect(x, h - 11, 3, 3); }
    for (let y = 10; y < h; y += 12) { ctx.fillRect(9, y, 3, 3); }
  }, { color: false });
}

// Fine speckle for paint and metal (colour multiplier, near white)
export function paintSpeckle() {
  return canvasTexture("paint-speckle", 256, 256, function (ctx, w, h) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    const rnd = seeded(11);
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = "rgba(0,0,0," + (0.02 + rnd() * 0.05) + ")";
      ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
    }
    // a little streaking from top to bottom, like weathered paint
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = "rgba(0,0,0,0.025)";
      ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 20 + rnd() * 60);
    }
  });
}

// Spray-on foam (orange tanks): an uneven, lumpy surface, as a bump map
export function foamBump() {
  return canvasTexture("foam-bump", 256, 256, function (ctx, w, h) {
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, w, h);
    const rnd = seeded(23);
    for (let i = 0; i < 2200; i++) {
      const v = Math.floor(100 + rnd() * 70);
      ctx.fillStyle = "rgba(" + v + "," + v + "," + v + ",0.35)";
      ctx.beginPath();
      ctx.arc(rnd() * w, rnd() * h, 2 + rnd() * 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { color: false });
}

// Vertical corrugation and stringers (Saturn V first-stage thrust structure and interstages)
export function corrugationBump() {
  return canvasTexture("corrugation-bump", 256, 64, function (ctx, w, h) {
    for (let x = 0; x < w; x++) {
      const v = Math.round(128 + 70 * Math.sin((x / w) * Math.PI * 2 * 16));
      ctx.fillStyle = "rgb(" + v + "," + v + "," + v + ")";
      ctx.fillRect(x, 0, 1, h);
    }
  }, { color: false });
}

// Crinkled multi-layer insulation foil (gold, silver or black): colour map and bump map
export function foil(tint) {
  const key = "foil-" + tint;
  const base = { gold: [196, 150, 58], silver: [200, 204, 210], black: [32, 32, 36], copper: [176, 110, 60] }[tint] || [196, 150, 58];
  const map = canvasTexture(key, 256, 256, function (ctx, w, h) {
    ctx.fillStyle = "rgb(" + base.join(",") + ")";
    ctx.fillRect(0, 0, w, h);
    const rnd = seeded(31);
    for (let i = 0; i < 520; i++) {
      const light = rnd() < 0.5;
      const k = light ? 1.25 : 0.7;
      ctx.fillStyle = "rgba(" + Math.min(255, Math.round(base[0] * k)) + "," + Math.min(255, Math.round(base[1] * k)) + "," + Math.min(255, Math.round(base[2] * k)) + ",0.5)";
      ctx.beginPath();
      const x = rnd() * w, y = rnd() * h;
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rnd() - 0.5) * 40, y + (rnd() - 0.5) * 40);
      ctx.lineTo(x + (rnd() - 0.5) * 40, y + (rnd() - 0.5) * 40);
      ctx.closePath();
      ctx.fill();
    }
    // taped seams
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0, h / 2, w, 2);
    ctx.fillRect(w / 2, 0, 2, h);
  });
  const bump = canvasTexture("foil-bump", 256, 256, function (ctx, w, h) {
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, w, h);
    const rnd = seeded(37);
    for (let i = 0; i < 700; i++) {
      const v = Math.floor(60 + rnd() * 140);
      ctx.strokeStyle = "rgba(" + v + "," + v + "," + v + ",0.6)";
      ctx.lineWidth = 1 + rnd() * 2;
      ctx.beginPath();
      const x = rnd() * w, y = rnd() * h;
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rnd() - 0.5) * 50, y + (rnd() - 0.5) * 50);
      ctx.stroke();
    }
  }, { color: false });
  return { map: map, bump: bump };
}

// A solar array: dark blue cells in a grid with silver busbars
export function solarCells() {
  return canvasTexture("solar-cells", 256, 256, function (ctx, w, h) {
    ctx.fillStyle = "#c9cdd4";
    ctx.fillRect(0, 0, w, h);
    const n = 8;
    const s = w / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const shade = 30 + ((i * 7 + j * 3) % 5) * 4;
        ctx.fillStyle = "rgb(" + (shade - 10) + "," + (shade + 10) + "," + (shade + 55) + ")";
        ctx.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
        ctx.fillStyle = "rgba(220,230,255,0.25)";
        ctx.fillRect(i * s + 2, j * s + s / 2, s - 4, 1);
      }
    }
  });
}

// A rocket nozzle's colour along its length: heat-tinted near the throat, dark at the exit.
// Used with lathe geometry, whose v coordinate runs along the profile.
export function nozzleHeat() {
  return canvasTexture("nozzle-heat", 16, 256, function (ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#5c4a3a");    // exit lip (bottom of the profile)
    g.addColorStop(0.35, "#3a3c42");
    g.addColorStop(0.75, "#4a4038");
    g.addColorStop(0.9, "#7a5a3c");  // straw and blue heat tint near the throat
    g.addColorStop(1, "#5a6070");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // the regenerative cooling tubes show as fine lengthwise lines
    ctx.fillStyle = "rgba(0,0,0,0.0)";
  });
}
export function nozzleTubesBump() {
  return canvasTexture("nozzle-tubes", 256, 16, function (ctx, w, h) {
    for (let x = 0; x < w; x++) {
      const v = Math.round(128 + 60 * Math.sin((x / w) * Math.PI * 2 * 64));
      ctx.fillStyle = "rgb(" + v + "," + v + "," + v + ")";
      ctx.fillRect(x, 0, 1, h);
    }
  }, { color: false });
}

// ---------- Geometry helpers ----------
// Rescale a geometry's UVs to its real size (meters / tile), so repeating textures keep their size.
// For cylinders and lathes, u runs around (circumference) and v along the height.
export function worldUV(geometry, around, along, tile) {
  const uv = geometry.attributes.uv;
  if (!uv) return geometry;
  const su = around / tile;
  const sv = along / tile;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  uv.needsUpdate = true;
  return geometry;
}

// A rocket engine nozzle as a real bell: a short combustion chamber, the narrow throat, then a curved bell
// that opens to the exit. Hangs down from y = top (meters). exitR = radius at the exit, length = total.
export function bellGeometry(exitR, length, segments) {
  const throat = exitR * 0.3;
  const chamberR = exitR * 0.42;
  const pts = [];
  // from the exit lip (bottom) up to the chamber top
  const bellLen = length * 0.78;
  const n = 16;
  pts.push(new THREE.Vector2(exitR * 1.02, 0));
  for (let i = 0; i <= n; i++) {
    const t = i / n;                                   // 0 at the exit, 1 at the throat
    const r = throat + (exitR - throat) * Math.pow(1 - t, 1.6);
    pts.push(new THREE.Vector2(r, t * bellLen));
  }
  pts.push(new THREE.Vector2(chamberR, bellLen + length * 0.06));
  pts.push(new THREE.Vector2(chamberR, length * 0.94));
  pts.push(new THREE.Vector2(chamberR * 0.7, length));
  pts.push(new THREE.Vector2(0.001, length));
  const geometry = new THREE.LatheGeometry(pts, segments || 32);
  geometry.translate(0, -length, 0);
  return geometry;
}

// A tangent-ogive nose (pointed but full, like real fairings and booster noses), base at y = 0
export function ogiveGeometry(radius, height, segments, bluntness) {
  const rho = (radius * radius + height * height) / (2 * radius);
  const tip = radius * (bluntness === undefined ? 0.08 : bluntness);
  const pts = [];
  const n = 20;
  for (let i = 0; i <= n; i++) {
    const y = (i / n) * height;
    // tangent ogive measured from the base: full radius (and tangent to the body) at y = 0, a point at y = height
    let r = Math.sqrt(Math.max(0, rho * rho - y * y)) + radius - rho;
    r = Math.max(r, tip * (i / n));
    pts.push(new THREE.Vector2(Math.max(0.001, r), y));
  }
  pts.push(new THREE.Vector2(0.001, height + tip * 0.6));
  return new THREE.LatheGeometry(pts, segments || 48);
}

// A thin raised ring (a stage joint or frame) of radius r at height y
export function ringGeometry(radius, height, segments) {
  return new THREE.CylinderGeometry(radius, radius, height, segments || 64, 1, true);
}

// ---------- Merging, to keep the number of draw calls low ----------
// Merges the direct mesh children of a group that share a material into one mesh per material.
// Children that are groups (moving parts: wheels, arms, arrays) are left alone. Not used on rockets: the
// launch scene measures their stage cylinders one by one (radiusAt in js/launch-cinematic.js).
export function mergeStatic(group) {
  const mergeFn = mergeGeometries;
  const byMaterial = new Map();
  const keep = [];
  group.children.slice().forEach(function (child) {
    if (!child.isMesh || child.userData.keepSeparate || Array.isArray(child.material)) { keep.push(child); return; }
    const list = byMaterial.get(child.material) || [];
    list.push(child);
    byMaterial.set(child.material, list);
  });
  byMaterial.forEach(function (meshes, material) {
    if (meshes.length < 2) return;
    const geometries = meshes.map(function (mesh) {
      mesh.updateMatrix();
      let g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      // all merged geometries need the same attributes
      if (!g.attributes.uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      ["color", "uv1", "uv2"].forEach(function (name) { if (g.attributes[name]) g.deleteAttribute(name); });
      g.applyMatrix4(mesh.matrix);
      return g;
    });
    let merged = null;
    try { merged = mergeFn(geometries, false); } catch (error) { merged = null; }
    if (!merged) return;
    meshes.forEach(function (mesh) { group.remove(mesh); });
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  });
  return group;
}
