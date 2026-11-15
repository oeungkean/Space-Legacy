// Small 3D models for equipment and collected objects, used for their pictures
// (Equipment rack, inventory, My Collection). Representative shapes built in code, not official models.
//   createEquipment(key): hasselblad, sample-bag, penetrometer, radio, mastcam-z, mastcam, arm, tubes,
//                         relay, camera, safer, and the collected objects rock, orange-soil, tube,
//                         flag-memorial, marker
// Shapes follow published NASA descriptions and photos; sizes are scaled to fit the pictures (about 2 units).

import * as THREE from "three";
import { panelBump, paintSpeckle, mergeStatic } from "./model-detail.js";

const cache = {};
function mat(color, metal, rough, extra) {
  const key = [color, metal, rough, extra ? JSON.stringify(Object.keys(extra)) : ""].join("|");
  if (extra) return new THREE.MeshStandardMaterial(Object.assign({ color: color, metalness: metal || 0, roughness: rough === undefined ? 0.6 : rough }, extra));
  if (!cache[key]) cache[key] = new THREE.MeshStandardMaterial({ color: color, metalness: metal || 0, roughness: rough === undefined ? 0.6 : rough });
  return cache[key];
}
function painted(color, metal, rough) {
  const k = "painted" + color;
  if (!cache[k]) cache[k] = new THREE.MeshStandardMaterial({ color: color, map: paintSpeckle(), bumpMap: panelBump(), bumpScale: 0.6, metalness: metal || 0.1, roughness: rough === undefined ? 0.5 : rough });
  return cache[k];
}
function glass(tint) {
  return mat(tint || 0x23406e, 0.9, 0.05);
}

function box(w, h, d, material) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
}
function cyl(rt, rb, h, material, seg) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 32), material);
}
function at(mesh, x, y, z) {
  mesh.position.set(x || 0, y || 0, z || 0);
  return mesh;
}
function rod(a, b, radius, material) {
  const d = new THREE.Vector3().subVectors(b, a);
  const m = cyl(radius, radius, d.length(), material, 10);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}
// A knurled ring (grip ridges) around the Z axis
function knurl(radius, length, count, material) {
  const g = new THREE.Group();
  g.add(cyl(radius, radius, length, material).rotateX(Math.PI / 2));
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    g.add(at(box(radius * 0.08, radius * 0.08, length, material), Math.cos(a) * radius, Math.sin(a) * radius, 0));
  }
  return g;
}
function finish(g) {
  mergeStatic(g);
  return g;
}
const V = function (x, y, z) { return new THREE.Vector3(x, y, z); };

// The Hasselblad 500EL Data Camera used on the Moon: a silver-painted body for heat control, the
// electric motor drive underneath, a 60 mm Zeiss Biogon lens with focus and aperture rings, the 70 mm film
// magazine at the back, and the pistol grip with its trigger that astronauts squeezed through their gloves.
function hasselblad() {
  const g = new THREE.Group();
  const silver = painted(0xd2d5da, 0.6, 0.35);
  const black = mat(0x1d1e22, 0.3, 0.5);
  g.add(box(1, 1, 1, silver));
  g.add(at(box(1.02, 0.42, 1.02, silver), 0, -0.72, 0));                         // motor drive
  g.add(at(box(0.9, 0.04, 0.9, black), 0, -0.5, 0));
  g.add(at(box(1.02, 1.02, 0.45, silver), 0, 0, -0.73));                         // film magazine
  g.add(at(box(0.7, 0.7, 0.03, black), 0, 0, -0.97));
  g.add(at(box(0.3, 0.12, 0.05, black), 0.3, 0.38, -0.98));                       // magazine label plate
  g.add(at(cyl(0.12, 0.12, 0.08, silver).rotateZ(Math.PI / 2), 0.55, 0.1, -0.7)); // film winding key
  // lens: mount, aperture ring, focus ring with its tabs, front glass
  g.add(at(cyl(0.42, 0.42, 0.12, black).rotateX(Math.PI / 2), 0, 0, 0.56));
  g.add(at(knurl(0.38, 0.22, 24, black), 0, 0, 0.73));
  g.add(at(cyl(0.36, 0.36, 0.2, silver).rotateX(Math.PI / 2), 0, 0, 0.94));
  g.add(at(knurl(0.4, 0.14, 24, black), 0, 0, 1.1));
  [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach(function (a) {                 // focus tabs for gloved fingers
    g.add(at(box(0.08, 0.16, 0.08, silver), Math.cos(a) * 0.48, Math.sin(a) * 0.48, 1.1));
  });
  g.add(at(cyl(0.34, 0.34, 0.06, black).rotateX(Math.PI / 2), 0, 0, 1.2));
  g.add(at(new THREE.Mesh(new THREE.CircleGeometry(0.28, 32), glass()), 0, 0, 1.235));
  // grip and trigger
  g.add(at(box(0.24, 0.85, 0.34, black), 0.66, -0.35, 0.15));
  g.add(at(box(0.1, 0.16, 0.12, silver), 0.66, -0.05, 0.36));
  g.add(at(box(0.4, 0.06, 0.4, silver), 0.66, -0.8, 0.15));
  return finish(g);
}

// An Apollo sample bag (Teflon film, with a numbered tag and a fold-over closure) and the long-handled scoop
function sampleBag() {
  const g = new THREE.Group();
  const bagGeometry = new THREE.SphereGeometry(0.6, 32, 24);
  const pos = bagGeometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {                                           // soft wrinkles in the film
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const k = 1 + 0.04 * Math.sin(x * 23 + y * 7) + 0.03 * Math.sin(z * 19 - y * 11);
    pos.setXYZ(i, x * k, y * k, z * k);
  }
  bagGeometry.computeVertexNormals();
  const bag = new THREE.Mesh(bagGeometry, mat(0xecebe6, 0.05, 0.75));
  bag.scale.set(1, 1.25, 0.6);
  g.add(bag);
  g.add(at(box(0.9, 0.18, 0.4, mat(0xe2e0da, 0, 0.8)), 0, 0.75, 0));               // fold-over top
  g.add(at(box(0.92, 0.04, 0.42, mat(0xb8bcc4, 0.8, 0.3)), 0, 0.84, 0));            // closure strip
  g.add(at(box(0.45, 0.22, 0.02, mat(0xc9ccd1, 0.6, 0.35)), 0, 0.15, 0.37));         // numbered tag
  g.add(at(box(0.3, 0.04, 0.025, mat(0x22242a)), 0, 0.17, 0.38));
  // the scoop: extension handle with a grip, and an adjustable pan
  const metal = mat(0xb8bcc4, 0.8, 0.3);
  g.add(rod(V(0.68, -0.55, 0), V(1.25, 1.55, 0), 0.04, metal));
  g.add(at(cyl(0.06, 0.06, 0.4, mat(0x2a2c31, 0.2, 0.7), 12).rotateZ(-0.27), 1.2, 1.35, 0));
  g.add(at(cyl(0.065, 0.065, 0.06, metal, 12).rotateZ(-0.27), 0.95, 0.45, 0));      // locking collar
  const pan = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), metal);
  pan.material = mat(0xb8bcc4, 0.8, 0.3, { side: THREE.DoubleSide });
  pan.rotation.x = Math.PI;
  g.add(at(pan, 0.64, -0.66, 0));
  return finish(g);
}

// A geologist's hand lens / field kit: a folding magnifier in its metal case on a lanyard ring
function handLens() {
  const g = new THREE.Group();
  const metal = mat(0xb8bcc4, 0.85, 0.25);
  g.add(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 16, 48), mat(0x2a2c31, 0.4, 0.4)));
  g.add(new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.02, 8, 48), metal));
  const lens = new THREE.Mesh(new THREE.SphereGeometry(1.2, 32, 8, 0, Math.PI * 2, 0, 0.42),
    new THREE.MeshStandardMaterial({ color: 0xbfd8ff, metalness: 0.1, roughness: 0.03, transparent: true, opacity: 0.4 }));
  lens.rotation.x = Math.PI / 2;
  lens.position.z = -1.1;
  g.add(lens);
  g.add(at(cyl(0.07, 0.09, 0.9, mat(0x5a3d24, 0, 0.7), 16), 0, -0.95, 0));
  g.add(at(cyl(0.1, 0.1, 0.08, metal, 16), 0, -0.52, 0));
  g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 8, 20), metal), 0, -1.48, 0));
  g.rotation.z = -0.5;
  return finish(g);
}

// A backpack radio unit (like the Apollo PLSS communications pack, shown on its own): case, control
// panel with switches and a display, volume knobs and a whip antenna
function radio() {
  const g = new THREE.Group();
  const body = painted(0xdcdcd6, 0.2, 0.6);
  const dark = mat(0x22242a, 0.3, 0.4);
  const metal = mat(0xc0c4ca, 0.8, 0.3);
  g.add(box(1, 1.3, 0.55, body));
  g.add(at(box(0.7, 0.4, 0.05, dark), 0, 0.25, 0.29));
  g.add(at(box(0.5, 0.14, 0.02, mat(0x7fe2a8, 0.1, 0.3, { emissive: 0x1b5a35 })), 0, 0.32, 0.32)); // display
  [-0.2, 0, 0.2].forEach(function (x) { g.add(at(box(0.05, 0.08, 0.05, metal), x, 0.14, 0.33)); }); // toggle switches
  [-0.2, 0.05, 0.3].forEach(function (x) {
    g.add(at(knurl(0.07, 0.08, 12, metal), x, -0.25, 0.32));
  });
  [-0.45, 0.45].forEach(function (x) { g.add(at(box(0.06, 1.2, 0.5, metal), x * 1.05, 0, 0)); }); // side rails
  g.add(at(cyl(0.06, 0.06, 0.1, metal, 12), 0.35, 0.7, 0));
  g.add(at(cyl(0.022, 0.012, 1.6, metal, 8), 0.35, 1.5, 0));
  g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), metal), 0.35, 2.3, 0));
  return finish(g);
}

// A rover's mast head: Mastcam-Z (Perseverance, two zoom cameras) or Mastcam (Curiosity, two fixed lenses
// of different focal length), the Navcam pairs, and the laser instrument's round window above
// (SuperCam / ChemCam)
function mastHead(zoom) {
  const g = new THREE.Group();
  const white = painted(0xe8e8e4, 0.2, 0.5);
  const dark = mat(0x1e2026, 0.4, 0.4);
  g.add(at(cyl(0.12, 0.14, 1.6, white, 16), 0, -0.8, 0));
  g.add(at(box(0.3, 0.3, 0.3, mat(0x8a8f98, 0.6, 0.4)), 0, -0.18, 0));             // azimuth/elevation joint
  g.add(box(1.3, 0.5, 0.55, white));
  [-0.32, 0.32].forEach(function (x, i) {
    const r = zoom ? 0.15 : (i ? 0.13 : 0.1);
    g.add(at(cyl(r, r, 0.35, dark).rotateX(Math.PI / 2), x, 0, 0.42));
    g.add(at(knurl(r * 1.08, 0.08, 16, dark), x, 0, 0.5));
    g.add(at(new THREE.Mesh(new THREE.CircleGeometry(r * 0.8, 24), glass()), x, 0, 0.6));
  });
  [-0.58, -0.48, 0.48, 0.58].forEach(function (x) {                               // Navcam eyes
    g.add(at(cyl(0.04, 0.04, 0.06, dark).rotateX(Math.PI / 2), x, -0.12, 0.29));
  });
  g.add(at(box(0.55, 0.35, 0.5, white), 0, 0.42, 0.0));
  g.add(at(cyl(0.18, 0.18, 0.1, dark).rotateX(Math.PI / 2), 0, 0.42, 0.28));
  g.add(at(new THREE.Mesh(new THREE.CircleGeometry(0.15, 32), glass(0x6a4a2a)), 0, 0.42, 0.335));
  return finish(g);
}

// A rover's robotic arm with its tool turret: shoulder, upper arm, elbow, forearm, wrist and the turret
// with a drill and instruments around it
function roboticArm() {
  const g = new THREE.Group();
  const white = painted(0xd9dade, 0.4, 0.4);
  const gray = mat(0x8a8f98, 0.7, 0.3);
  const shoulder = V(0, 0, 0);
  const elbow = V(0, 0.75, 1.2);
  const wrist = V(0, 0.45, 2.15);
  g.add(cyl(0.2, 0.22, 0.4, gray));
  g.add(at(cyl(0.16, 0.16, 0.3, white).rotateZ(Math.PI / 2), 0, 0.15, 0));
  g.add(rod(shoulder.clone().setY(0.15), elbow, 0.1, white));
  g.add(at(cyl(0.14, 0.14, 0.24, gray).rotateZ(Math.PI / 2), elbow.x, elbow.y, elbow.z));
  g.add(rod(elbow, wrist, 0.085, white));
  g.add(at(cyl(0.12, 0.12, 0.2, gray).rotateZ(Math.PI / 2), wrist.x, wrist.y, wrist.z));
  g.add(at(rod(V(0, 0.2, 0.1), V(0, 0.5, 1.0), 0.02, mat(0x2a2c31)), 0.12, 0, 0));  // cable run
  const turret = new THREE.Group();
  turret.position.set(0, 0.15, 2.25);
  turret.add(cyl(0.32, 0.32, 0.3, gray, 5));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const tool = i === 0 ? cyl(0.09, 0.05, 0.55, mat(0x3a3c42, 0.8, 0.3), 16) : box(0.18, 0.24, 0.18, i % 2 ? white : mat(0xd9a63a, 0.8, 0.3));
    tool.position.set(Math.cos(a) * 0.32, -0.25, Math.sin(a) * 0.32);
    turret.add(tool);
  }
  turret.add(at(cyl(0.02, 0.005, 0.15, mat(0xd8dade, 0.95, 0.2), 8), 0.32, -0.6, 0));  // drill bit
  g.add(turret);
  return finish(g);
}

// Perseverance's sample tubes: titanium tubes (white-coated outside, so sunlight doesn't warm the sample)
// and their seals (drawn gold here), in a holder
function sampleTubes() {
  const g = new THREE.Group();
  g.add(at(box(1.6, 0.18, 0.55, mat(0x3a3c42, 0.6, 0.4)), 0, -0.7, 0));
  g.add(at(box(1.6, 0.05, 0.55, mat(0x8a8f98, 0.7, 0.3)), 0, -0.58, 0));
  const tubeMat = mat(0xeeeeea, 0.2, 0.45);
  for (let i = 0; i < 5; i++) {
    const x = -0.6 + i * 0.3;
    g.add(at(cyl(0.09, 0.09, 1.25, tubeMat, 20), x, 0, 0));
    g.add(at(cyl(0.095, 0.095, 0.05, mat(0xc9ccd1, 0.9, 0.2), 20), x, -0.4, 0));
    g.add(at(cyl(0.095, 0.1, 0.12, mat(0xd9a63a, 0.85, 0.25), 20), x, 0.68, 0));  // seal (illustrative colour)
    g.add(at(cyl(0.05, 0.05, 0.06, mat(0xc9ccd1, 0.9, 0.2), 12), x, 0.77, 0));
  }
  return finish(g);
}

// A UHF relay antenna (the link to orbiters overhead): a dish with its feed on struts, on a post
function relay() {
  const g = new THREE.Group();
  const white = painted(0xe8e8e4, 0.3, 0.5);
  g.add(at(cyl(0.06, 0.08, 1.2, white, 12), 0, -0.6, 0));
  g.add(at(box(0.25, 0.2, 0.25, mat(0x8a8f98, 0.6, 0.4)), 0, -0.05, 0));
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.75, 40, 12, 0, Math.PI * 2, 0, 0.9), mat(0xf0f0ec, 0.3, 0.4, { side: THREE.DoubleSide }));
  const holder = new THREE.Group();
  holder.rotation.x = -2.2;
  holder.position.y = 0.1;
  holder.add(dish);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(Math.sin(0.9) * 0.75, 0.02, 8, 40), mat(0xc9ccd1, 0.7, 0.3));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = Math.cos(0.9) * 0.75;
  holder.add(rim);
  [0, 1, 2].forEach(function (k) {                                                // feed struts
    const a = (k / 3) * Math.PI * 2;
    holder.add(rod(V(Math.cos(a) * 0.55, 0.45, Math.sin(a) * 0.55), V(0, 0.15, 0), 0.012, mat(0xc9ccd1, 0.7, 0.3)));
  });
  holder.add(at(cyl(0.05, 0.08, 0.12, white), 0, 0.12, 0));
  g.add(holder);
  return finish(g);
}

// A handheld camera: body with grip, lens with focus ring, viewfinder, shutter button and strap lugs
function handCamera() {
  const g = new THREE.Group();
  const body = mat(0x26282d, 0.3, 0.5);
  const dark = mat(0x15161a, 0.4, 0.4);
  const metal = mat(0xb8bcc4, 0.8, 0.3);
  g.add(box(1.2, 0.75, 0.6, body));
  g.add(at(box(0.3, 0.72, 0.7, body), -0.48, -0.01, 0.03));                        // grip
  g.add(at(cyl(0.3, 0.32, 0.25, dark).rotateX(Math.PI / 2), 0.1, 0, 0.42));
  g.add(at(knurl(0.3, 0.22, 24, dark), 0.1, 0, 0.66));
  g.add(at(cyl(0.27, 0.27, 0.06, metal).rotateX(Math.PI / 2), 0.1, 0, 0.8));
  g.add(at(new THREE.Mesh(new THREE.CircleGeometry(0.22, 32), glass()), 0.1, 0, 0.835));
  g.add(at(box(0.4, 0.22, 0.42, body), -0.0, 0.47, 0));                           // viewfinder hump
  g.add(at(box(0.18, 0.1, 0.05, glass(0x101418)), 0, 0.47, -0.22));
  g.add(at(cyl(0.06, 0.06, 0.05, metal, 16), -0.42, 0.4, 0.1));                   // shutter button
  g.add(at(cyl(0.1, 0.1, 0.06, metal, 16), 0.38, 0.4, 0.0));                      // dial
  [-0.6, 0.6].forEach(function (x) { g.add(at(box(0.04, 0.08, 0.08, metal), x, 0.25, 0)); });
  return finish(g);
}

// SAFER (Simplified Aid For EVA Rescue): a small nitrogen-jet pack worn under the EMU backpack, with 24
// small thrusters on its two towers and the hand controller that folds down in front
function safer() {
  const g = new THREE.Group();
  const white = painted(0xe9e9e4, 0.1, 0.6);
  const gray = mat(0x4a4d55, 0.8, 0.3);
  g.add(box(1.2, 0.5, 0.7, white));
  g.add(at(box(1.0, 0.08, 0.6, mat(0x8a8f98, 0.6, 0.4)), 0, -0.29, 0));
  [-0.5, 0.5].forEach(function (x) {
    g.add(at(box(0.22, 1.2, 0.5, white), x, 0.75, 0));
    for (let k = 0; k < 3; k++) {
      [[1.3, 0, Math.PI / 2], [1.0, 0.27, 0], [1.0, -0.27, 0]].forEach(function (c) {
        const n = cyl(0.035, 0.06, 0.1, gray, 10);
        n.position.set(x * c[0], 0.35 + k * 0.4, c[1] ? c[1] : 0.15);
        if (c[2]) n.rotation.z = c[2]; else n.rotation.x = c[1] > 0 ? Math.PI / 2 : -Math.PI / 2;
        g.add(n);
      });
    }
  });
  g.add(at(cyl(0.12, 0.12, 0.6, mat(0xc9ccd1, 0.8, 0.3), 16).rotateZ(Math.PI / 2), 0, -0.05, -0.2)); // nitrogen tanks
  g.add(rod(V(0, -0.2, 0.35), V(0, -0.45, 0.4), 0.03, gray));
  g.add(at(box(0.4, 0.2, 0.28, mat(0x2a2c31, 0.3, 0.5)), 0, -0.5, 0.42));          // hand controller
  g.add(at(cyl(0.04, 0.04, 0.14, mat(0x2a2c31, 0.3, 0.5), 10), 0.08, -0.35, 0.45));
  g.add(at(box(0.08, 0.04, 0.04, mat(0xc23a2b, 0.2, 0.5)), -0.1, -0.38, 0.5));
  return finish(g);
}

// ----- Collected objects -----

// A lumpy rock: a sphere pushed in and out by layered noise, with flat facets
function rock(color) {
  const g = new THREE.Group();
  const geometry = new THREE.IcosahedronGeometry(0.8, 3);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const k = 1 + 0.12 * Math.sin(x * 4.1 + z * 2.3) + 0.08 * Math.sin(y * 6.7 + x * 3.1) + 0.05 * Math.sin(z * 11 + y * 9);
    pos.setXYZ(i, x * k, y * k, z * k);
  }
  geometry.computeVertexNormals();
  const r = new THREE.Mesh(geometry, mat(color || 0x66635e, 0, 1, { flatShading: true }));
  r.scale.set(1.25, 0.75, 1);
  g.add(r);
  return g;
}

// The orange soil Apollo 17 found at Shorty crater (tiny orange volcanic glass beads), in a trench
function orangeSoil() {
  const g = new THREE.Group();
  g.add(cyl(1.2, 1.3, 0.2, mat(0x7f7c77, 0, 1), 40));
  g.add(at(cyl(0.8, 0.9, 0.08, mat(0xd2752e, 0, 1), 40), 0, 0.13, 0));
  g.add(at(box(0.9, 0.1, 0.25, mat(0xb85a20, 0, 1)), 0, 0.17, 0));
  for (let i = 0; i < 40; i++) {                                                  // glass beads
    const a = i * 2.4;
    const r = 0.15 + (i % 7) * 0.09;
    g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), mat(0xe8862e, 0.3, 0.3)), Math.cos(a) * r, 0.19, Math.sin(a) * r));
  }
  g.add(at(rod(V(0.6, 0.15, 0.3), V(1.1, 0.9, 0.5), 0.03, mat(0xb8bcc4, 0.8, 0.3)), 0, 0, 0)); // the scoop that dug it
  return finish(g);
}

// The Fallen Astronaut memorial and plaque left by Apollo 15 (a small aluminium figure and a plaque)
function flagMemorial() {
  const g = new THREE.Group();
  g.add(cyl(1, 1.05, 0.12, mat(0x8a8782, 0, 1), 40));
  g.add(at(box(0.9, 0.04, 0.45, mat(0xc9c6bf, 0.7, 0.3)), -0.25, 0.1, 0));
  for (let i = 0; i < 6; i++) g.add(at(box(0.7, 0.045, 0.015, mat(0x55534e, 0.5, 0.5)), -0.25, 0.1, -0.15 + i * 0.06)); // engraved lines
  const figureMat = mat(0xb8bcc4, 0.9, 0.2);
  g.add(at(box(0.1, 0.04, 0.2, figureMat), 0.45, 0.1, 0.05));                        // body
  g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), figureMat), 0.45, 0.11, 0.2));
  [-1, 1].forEach(function (s) {
    g.add(at(box(0.03, 0.03, 0.17, figureMat), 0.45 + s * 0.035, 0.1, -0.13));      // legs
    g.add(at(box(0.12, 0.025, 0.03, figureMat), 0.45 + s * 0.09, 0.1, 0.1));         // arms
  });
  return finish(g);
}

// A place marker for a named landing site (illustrative: nothing like this stands at the real site)
function marker() {
  const g = new THREE.Group();
  g.add(at(cyl(0.12, 0.15, 0.08, mat(0x8a8782, 0, 1), 16), 0, 0.04, 0));
  g.add(at(cyl(0.05, 0.05, 1.2, mat(0xc9c6bf, 0.3, 0.5), 12), 0, 0.6, 0));
  g.add(at(box(0.6, 0.35, 0.05, mat(0xff8a3d, 0, 0.5)), 0, 1.25, 0));
  g.add(at(box(0.6, 0.06, 0.055, mat(0xf2f2ee, 0.4, 0.2)), 0, 1.25, 0));
  return finish(g);
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
