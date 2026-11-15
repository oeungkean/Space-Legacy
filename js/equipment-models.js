// Small 3D models for equipment and collected objects, used for their pictures
// (Equipment rack, inventory, My Collection). Representative shapes built in code, not official models.
//   createEquipment(key): hasselblad, sample-bag, penetrometer, radio, mastcam-z, mastcam, arm, tubes,
//                         relay, camera, safer, and the collected objects rock, orange-soil, tube,
//                         flag-memorial, marker

import * as THREE from "three";

function mat(color, metal, rough) {
  return new THREE.MeshStandardMaterial({ color: color, metalness: metal || 0, roughness: rough === undefined ? 0.6 : rough });
}

function box(w, h, d, material) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
}

function cyl(rt, rb, h, material, seg) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 24), material);
}

// The Hasselblad 500EL used on the Moon: silver body, black film magazine, large lens
function hasselblad() {
  const g = new THREE.Group();
  const silver = mat(0xc9ccd1, 0.8, 0.3);
  const black = mat(0x1d1e22, 0.3, 0.5);
  const body = box(1, 1, 1, silver);
  g.add(body);
  const back = box(1.02, 1.02, 0.45, black);
  back.position.z = -0.7;
  g.add(back);
  const lens = cyl(0.36, 0.4, 0.75, black);
  lens.rotation.x = Math.PI / 2;
  lens.position.z = 0.85;
  g.add(lens);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24), mat(0x3a5a8a, 0.9, 0.05));
  glass.position.z = 1.23;
  g.add(glass);
  const ring = cyl(0.4, 0.4, 0.12, silver);
  ring.rotation.x = Math.PI / 2;
  ring.position.z = 1.15;
  g.add(ring);
  const grip = box(0.18, 0.7, 0.3, black);
  grip.position.set(0.6, -0.1, 0.1);
  g.add(grip);
  return g;
}

function sampleBag() {
  const g = new THREE.Group();
  const bag = new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 14), mat(0xecebe6, 0, 0.9));
  bag.scale.set(1, 1.25, 0.6);
  g.add(bag);
  const tie = cyl(0.12, 0.2, 0.25, mat(0xd8d4c8, 0, 0.9));
  tie.position.y = 0.8;
  g.add(tie);
  const label = box(0.5, 0.25, 0.02, mat(0x9aa0a8, 0.4, 0.4));
  label.position.set(0, 0.1, 0.37);
  g.add(label);
  // the long-handled scoop beside it
  const handle = cyl(0.04, 0.04, 2.2, mat(0xb8bcc4, 0.8, 0.3), 10);
  handle.position.set(0.95, 0.4, 0);
  handle.rotation.z = 0.25;
  g.add(handle);
  const scoop = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xb8bcc4, 0.8, 0.3));
  scoop.rotation.x = Math.PI;
  scoop.position.set(0.68, -0.68, 0);
  g.add(scoop);
  return g;
}

function handLens() {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 12, 32), mat(0x2a2c31, 0.4, 0.4));
  g.add(rim);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.48, 32), new THREE.MeshStandardMaterial({ color: 0xbfd8ff, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.45 }));
  g.add(glass);
  const handle = cyl(0.07, 0.09, 0.9, mat(0x5a3d24, 0, 0.7), 12);
  handle.position.y = -0.95;
  g.add(handle);
  g.rotation.z = -0.5;
  return g;
}

function radio() {
  const g = new THREE.Group();
  const body = box(1, 1.3, 0.55, mat(0xdcdcd6, 0.2, 0.6));
  g.add(body);
  const panel = box(0.7, 0.4, 0.05, mat(0x22242a, 0.3, 0.4));
  panel.position.set(0, 0.25, 0.29);
  g.add(panel);
  [-0.2, 0.05, 0.3].forEach(function (x) {
    const knob = cyl(0.07, 0.07, 0.08, mat(0xc0c4ca, 0.8, 0.3), 12);
    knob.rotation.x = Math.PI / 2;
    knob.position.set(x, -0.25, 0.3);
    g.add(knob);
  });
  const antenna = cyl(0.025, 0.025, 1.6, mat(0xc9ccd1, 0.8, 0.3), 8);
  antenna.position.set(0.35, 1.45, 0);
  g.add(antenna);
  return g;
}

// A rover mast head with two camera eyes (Mastcam-Z) or one pair (Mastcam)
function mastHead(zoom) {
  const g = new THREE.Group();
  const white = mat(0xe8e8e4, 0.2, 0.5);
  const dark = mat(0x1e2026, 0.4, 0.4);
  const mast = cyl(0.12, 0.14, 1.6, white, 12);
  mast.position.y = -0.8;
  g.add(mast);
  const head = box(1.3, 0.5, 0.55, white);
  g.add(head);
  [-0.32, 0.32].forEach(function (x) {
    const eye = cyl(zoom ? 0.15 : 0.11, zoom ? 0.15 : 0.11, 0.35, dark);
    eye.rotation.x = Math.PI / 2;
    eye.position.set(x, 0, 0.42);
    g.add(eye);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(zoom ? 0.12 : 0.08, 20), mat(0x2a4a7a, 0.9, 0.05));
    glass.position.set(x, 0, 0.6);
    g.add(glass);
  });
  const chemcam = cyl(0.2, 0.2, 0.3, dark);
  chemcam.rotation.x = Math.PI / 2;
  chemcam.position.set(0, 0.42, 0.2);
  g.add(chemcam);
  return g;
}

function roboticArm() {
  const g = new THREE.Group();
  const white = mat(0xd9dade, 0.4, 0.4);
  const shoulder = cyl(0.18, 0.18, 0.4, white);
  g.add(shoulder);
  const upper = box(0.16, 0.16, 1.4, white);
  upper.position.set(0, 0.35, 0.6);
  upper.rotation.x = -0.5;
  g.add(upper);
  const lower = box(0.14, 0.14, 1.2, white);
  lower.position.set(0, 0.55, 1.6);
  lower.rotation.x = 0.4;
  g.add(lower);
  const turret = cyl(0.35, 0.35, 0.35, mat(0x8a8f98, 0.7, 0.3));
  turret.position.set(0, 0.2, 2.2);
  g.add(turret);
  const drill = cyl(0.05, 0.02, 0.5, mat(0x3a3c42, 0.8, 0.3), 10);
  drill.position.set(0, -0.15, 2.3);
  g.add(drill);
  return g;
}

// Perseverance's sample tubes: thin metal tubes with white caps, in a holder
function sampleTubes() {
  const g = new THREE.Group();
  const holder = box(1.5, 0.15, 0.5, mat(0x3a3c42, 0.6, 0.4));
  holder.position.y = -0.7;
  g.add(holder);
  for (let i = 0; i < 5; i++) {
    const tube = cyl(0.09, 0.09, 1.3, mat(0xd8dade, 0.95, 0.15), 14);
    tube.position.set(-0.6 + i * 0.3, 0, 0);
    g.add(tube);
    const cap = cyl(0.1, 0.1, 0.15, mat(0xf3f3ef, 0.1, 0.6), 14);
    cap.position.set(-0.6 + i * 0.3, 0.7, 0);
    g.add(cap);
  }
  return g;
}

function relay() {
  const g = new THREE.Group();
  const white = mat(0xe8e8e4, 0.3, 0.5);
  const post = cyl(0.06, 0.08, 1.2, white, 10);
  post.position.y = -0.6;
  g.add(post);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.75, 28, 10, 0, Math.PI * 2, 0, 0.9), mat(0xf0f0ec, 0.3, 0.4));
  dish.material.side = THREE.DoubleSide;
  dish.rotation.x = -2.2;
  dish.position.y = 0.1;
  g.add(dish);
  const feed = cyl(0.03, 0.03, 0.6, white, 8);
  feed.position.set(0, 0.35, 0.25);
  feed.rotation.x = 0.9;
  g.add(feed);
  return g;
}

function handCamera() {
  const g = new THREE.Group();
  const body = box(1.2, 0.75, 0.6, mat(0x26282d, 0.3, 0.5));
  g.add(body);
  const lens = cyl(0.26, 0.3, 0.6, mat(0x15161a, 0.4, 0.4));
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0.1, 0, 0.55);
  g.add(lens);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), mat(0x3a5a8a, 0.9, 0.05));
  glass.position.set(0.1, 0, 0.86);
  g.add(glass);
  const top = box(0.4, 0.2, 0.4, mat(0x26282d, 0.3, 0.5));
  top.position.set(-0.2, 0.47, 0);
  g.add(top);
  return g;
}

// SAFER: a small jet pack worn under the spacesuit's backpack, with a hand controller
function safer() {
  const g = new THREE.Group();
  const white = mat(0xe9e9e4, 0.1, 0.6);
  const pack = box(1.2, 0.5, 0.7, white);
  g.add(pack);
  [-0.5, 0.5].forEach(function (x) {
    const tower = box(0.2, 1.2, 0.5, white);
    tower.position.set(x, 0.75, 0);
    g.add(tower);
    for (let k = 0; k < 2; k++) {
      const nozzle = cyl(0.05, 0.08, 0.12, mat(0x4a4d55, 0.8, 0.3), 10);
      nozzle.position.set(x * 1.25, 0.3 + k * 0.6, 0.15);
      nozzle.rotation.z = Math.PI / 2;
      g.add(nozzle);
    }
  });
  const controller = box(0.35, 0.2, 0.25, mat(0x2a2c31, 0.3, 0.5));
  controller.position.set(0, -0.45, 0.4);
  g.add(controller);
  return g;
}

// ----- Collected objects -----
function rock(color) {
  const g = new THREE.Group();
  const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8, 1), mat(color || 0x66635e, 0, 1));
  r.material.flatShading = true;
  r.scale.set(1.25, 0.75, 1);
  g.add(r);
  return g;
}

function orangeSoil() {
  const g = new THREE.Group();
  const ground = cyl(1.2, 1.3, 0.2, mat(0x7f7c77, 0, 1), 28);
  g.add(ground);
  const soil = cyl(0.8, 0.9, 0.08, mat(0xd2752e, 0, 1), 28);
  soil.position.y = 0.13;
  g.add(soil);
  const trench = box(0.9, 0.1, 0.25, mat(0xb85a20, 0, 1));
  trench.position.y = 0.17;
  g.add(trench);
  return g;
}

function flagMemorial() {
  const g = new THREE.Group();
  const ground = cyl(1, 1.05, 0.12, mat(0x8a8782, 0, 1), 28);
  g.add(ground);
  const plaque = box(0.9, 0.04, 0.45, mat(0xc9c6bf, 0.7, 0.3));
  plaque.position.set(-0.25, 0.1, 0);
  g.add(plaque);
  const figure = box(0.12, 0.05, 0.38, mat(0xb8bcc4, 0.9, 0.2));
  figure.position.set(0.45, 0.1, 0);
  g.add(figure);
  return g;
}

function marker() {
  const g = new THREE.Group();
  const post = cyl(0.05, 0.05, 1.2, mat(0xc9c6bf, 0.3, 0.5), 10);
  post.position.y = 0.6;
  g.add(post);
  const sign = box(0.6, 0.35, 0.05, mat(0xff8a3d, 0, 0.5));
  sign.position.y = 1.25;
  g.add(sign);
  return g;
}

export function createEquipment(key) {
  switch (key) {
    case "hasselblad": return hasselblad();
    case "sample-bag": return sampleBag();
    case "penetrometer": return handLens();
    case "radio": return radio();
    case "mastcam-z": return mastHead(true);
    case "mastcam": return mastHead(false);
    case "arm": return roboticArm();
    case "tubes": case "tube": return sampleTubes();
    case "relay": return relay();
    case "camera": return handCamera();
    case "safer": return safer();
    case "rock": return rock();
    case "orange-soil": return orangeSoil();
    case "flag-memorial": return flagMemorial();
    case "marker": return marker();
    default: return handCamera();
  }
}

export const SMALL_OBJECTS = ["rock", "orange-soil", "tube", "flag-memorial", "marker"];
