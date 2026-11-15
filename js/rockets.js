// The real launch vehicle of each mission, built in code.
// Built in meters from published sizes, then scaled by 1/8 so they match the launch scene (which scales by 8).
// Shapes and colors are simplified: they are representative models built in code, not official NASA 3D models.
//
// Each rocket has userData:
//   height    = height in model units (meters / 8)
//   radius    = how far it reaches out to the side (model units), used to place the launch tower
//   exhaust   = list of { point, size, booster } where flames come out
//   boosters  = the side boosters that separate during the climb
//   name      = the rocket's name, shown on screen

import * as THREE from "three";

const M = 1 / 8; // meters to model units

// ---------- Small helpers ----------
function makeTexture(width, height, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d"), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function speckle(ctx, w, h, count, alpha) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255," + alpha + ")" : "rgba(0,0,0," + alpha + ")";
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}

// A cylinder standing on y = bottom (meters), with radiusTop/radiusBottom
function tube(rTop, rBottom, height, bottom, material, x, z, segments) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, height, segments || 40), material);
  mesh.position.set(x || 0, bottom + height / 2, z || 0);
  return mesh;
}

// A rounded nose cone (like the top of a booster) starting at y = bottom
function nose(radius, height, bottom, material, x, z) {
  const profile = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    profile.push(new THREE.Vector2(radius * Math.sqrt(1 - t * t * 0.98), bottom + t * height));
  }
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(profile, 32), material);
  mesh.position.set(x || 0, 0, z || 0);
  return mesh;
}

// A bell-shaped rocket nozzle hanging down from y = bottom
function bell(radius, length, bottom, material, x, z) {
  return tube(radius * 0.4, radius, length, bottom - length, material, x, z, 20);
}

// ---------- Materials (made once) ----------
let mats = null;

function materials() {
  if (mats) return mats;

  const white = new THREE.MeshStandardMaterial({
    map: makeTexture(128, 128, function (ctx, w, h) {
      ctx.fillStyle = "#eef0f3";
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, 400, 0.05);
    }),
    roughness: 0.55, metalness: 0.05
  });

  // Orange spray-on foam (Delta IV cores, the Shuttle's external tank)
  const foam = new THREE.MeshStandardMaterial({
    map: makeTexture(256, 256, function (ctx, w, h) {
      ctx.fillStyle = "#c86a2a";
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, 4000, 0.12);
    }),
    roughness: 0.9
  });

  // Atlas V's first stage is covered in a salmon-tan insulation
  const atlasCore = new THREE.MeshStandardMaterial({
    map: makeTexture(256, 256, function (ctx, w, h) {
      ctx.fillStyle = "#c98a62";
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, 3000, 0.1);
    }),
    roughness: 0.85
  });

  // Saturn V first stage: white with black "roll pattern" quarters
  const saturnRoll = new THREE.MeshStandardMaterial({
    map: makeTexture(256, 256, function (ctx, w, h) {
      ctx.fillStyle = "#f2f2ee";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#15161a";
      ctx.fillRect(0, 0, w / 4, h / 2);
      ctx.fillRect(w / 2, 0, w / 4, h / 2);
      ctx.fillRect(w / 4, h / 2, w / 4, h / 2);
      ctx.fillRect((3 * w) / 4, h / 2, w / 4, h / 2);
    }),
    roughness: 0.6
  });

  mats = {
    white: white,
    foam: foam,
    atlasCore: atlasCore,
    saturnRoll: saturnRoll,
    black: new THREE.MeshStandardMaterial({ color: 0x18191d, roughness: 0.6 }),
    gray: new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.5, roughness: 0.5 }),
    silver: new THREE.MeshStandardMaterial({ color: 0xc6cad1, metalness: 0.8, roughness: 0.35 }),
    bell: new THREE.MeshStandardMaterial({ color: 0x2b2d33, metalness: 0.85, roughness: 0.45 }),
    tile: new THREE.MeshStandardMaterial({ color: 0x1d1e22, roughness: 0.85 })
  };
  return mats;
}

// Wraps a rocket built in meters, scaled to model units
function finish(inner, info) {
  const rocket = new THREE.Group();
  inner.scale.setScalar(M);
  rocket.add(inner);
  rocket.userData = {
    name: info.name,
    height: info.height * M,
    radius: info.radius * M,
    size: info.height * M,
    boosters: info.boosters || [],
    exhaust: info.exhaust.map(function (e) {
      return { point: new THREE.Vector3(e[0] * M, -1.5 * M, e[1] * M), size: e[2], booster: Boolean(e[3]) };
    })
  };
  return rocket;
}

// A side booster (solid rocket), as its own group so it can separate. Built in meters.
function sideBooster(radius, length, x, z, bodyMaterial, noseMaterial, baseY) {
  const m = materials();
  const group = new THREE.Group();
  const y0 = baseY || 0;
  group.add(tube(radius, radius, length, y0, bodyMaterial));
  group.add(nose(radius, radius * 2.6, y0 + length, noseMaterial || bodyMaterial));
  group.add(bell(radius * 0.7, radius * 1.1, y0, m.bell));
  group.position.set(x, 0, z);
  return group;
}

// ---------- Saturn V (Apollo 11) ----------
function saturnV(skylab) {
  const m = materials();
  const g = new THREE.Group();
  const r = 5.05; // 10.1 m wide

  g.add(tube(r, r, 42, 0, m.saturnRoll));                   // S-IC first stage
  g.add(tube(r * 1.01, r * 1.01, 1.5, 0, m.black));
  [0, 1, 2, 3].forEach(function (i) {                       // four fins with engine fairings
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 9, 4), m.white);
    fin.position.set(Math.cos(angle) * (r + 2), 4.5, Math.sin(angle) * (r + 2));
    fin.rotation.y = -angle;
    g.add(fin);
    g.add(tube(1.2, 1.6, 9, -0.5, m.white, Math.cos(angle) * (r - 0.6), Math.sin(angle) * (r - 0.6), 20));
  });
  const engines = [[0, 0], [3, 3], [-3, 3], [3, -3], [-3, -3]];
  engines.forEach(function (p) { g.add(bell(1.8, 5.8, 0, m.bell, p[0], p[1])); });

  g.add(tube(r, r, 6, 42, m.white));                        // interstage
  g.add(tube(r, r, 24.9, 48, m.white));                     // S-II second stage
  g.add(tube(r * 1.005, r * 1.005, 1.2, 66, m.black));
  if (skylab) {
    // Skylab took the place of the third stage. A tall shroud covered the workshop and its solar telescope.
    g.add(tube(3.3, r, 5, 72.9, m.white));
    g.add(tube(3.3, 3.3, 14.6, 77.9, m.white));             // orbital workshop (a converted S-IVB tank)
    g.add(tube(3.32, 3.32, 0.8, 85, m.black));
    g.add(tube(3.3, 3.3, 1.5, 92.5, m.gray));               // instrument unit
    g.add(tube(3.3, 3.3, 5, 94, m.silver));                 // airlock and docking adapter area
    g.add(nose(3.3, 9, 99, m.white));                       // payload shroud over the telescope mount
    return finish(g, {
      name: "Saturn V (Skylab, two stages)", height: 108, radius: r + 4,
      exhaust: engines.map(function (p) { return [p[0], p[1], 2.4]; })
    });
  }

  g.add(tube(3.3, r, 5, 72.9, m.white));                    // taper to the third stage
  g.add(tube(3.3, 3.3, 17.8, 77.9, m.white));               // S-IVB third stage
  g.add(tube(3.32, 3.32, 3, 84, m.black));
  g.add(tube(3.3, 3.3, 0.9, 95.7, m.gray));                 // instrument unit
  g.add(tube(1.95, 3.3, 8.5, 96.6, m.silver));              // adapter holding the lunar module
  g.add(tube(1.95, 1.95, 3.9, 105.1, m.silver));            // service module
  g.add(tube(0.4, 1.95, 3.3, 109, m.white));                // command module under its cover
  g.add(tube(0.25, 0.25, 6, 112.3, m.gray, 0, 0, 8));       // launch escape tower
  g.add(nose(0.4, 1.2, 118.3, m.white));

  return finish(g, {
    name: "Saturn V", height: 119.5, radius: r + 4,
    exhaust: engines.map(function (p) { return [p[0], p[1], 2.4]; })
  });
}

// ---------- Titan IIIE-Centaur (Voyager 1 and 2) ----------
function titan3e() {
  const m = materials();
  const g = new THREE.Group();
  const r = 1.525; // 3.05 m core

  g.add(tube(r, r, 30, 0, m.gray));                         // Titan core stage 1
  g.add(tube(r, r, 7.5, 30, m.gray));                       // stage 2
  g.add(tube(r * 1.01, r * 1.01, 0.6, 29.8, m.black));
  g.add(tube(2.2, r, 1.5, 37.5, m.white));                  // adapter
  g.add(tube(2.2, 2.2, 13, 39, m.white));                   // long shroud over the Centaur and the spacecraft
  g.add(nose(2.2, 4.5, 52, m.white));
  g.add(bell(1, 1.8, 0, m.bell));

  const boosters = [];
  [-1, 1].forEach(function (side) {
    const b = sideBooster(1.525, 25.9, side * 3.4, 0, m.white, m.white, 0);
    b.add(tube(1.55, 1.55, 1.2, 8, m.black));
    b.add(tube(1.55, 1.55, 1.2, 17, m.black));
    g.add(b);
    boosters.push(b);
  });

  return finish(g, {
    name: "Titan IIIE-Centaur", height: 56.5, radius: 5.2, boosters: boosters,
    exhaust: [[0, 0, 1.0], [-3.4, 0, 2.2, true], [3.4, 0, 2.2, true]]
  });
}

// ---------- Titan IVB-Centaur (Cassini-Huygens) ----------
function titan4b() {
  const m = materials();
  const g = new THREE.Group();
  const r = 1.525;

  g.add(tube(r, r, 34, 0, m.gray));
  g.add(tube(r * 1.01, r * 1.01, 0.6, 26, m.black));
  g.add(tube(2.55, r, 2, 34, m.white));
  g.add(tube(2.55, 2.55, 18, 36, m.white));                 // 5 m wide payload fairing
  g.add(nose(2.55, 6, 54, m.white));
  g.add(bell(1, 1.8, 0, m.bell));

  const boosters = [];
  [-1, 1].forEach(function (side) {
    const b = sideBooster(1.6, 34, side * 3.5, 0, m.white, m.white, 0);
    g.add(b);
    boosters.push(b);
  });

  return finish(g, {
    name: "Titan IVB-Centaur", height: 60, radius: 5.3, boosters: boosters,
    exhaust: [[0, 0, 1.1], [-3.5, 0, 2.4, true], [3.5, 0, 2.4, true]]
  });
}

// ---------- Delta IV Heavy (Parker Solar Probe) ----------
function deltaIVHeavy() {
  const m = materials();
  const g = new THREE.Group();
  const r = 2.55; // 5.1 m cores

  function core(x, isCenter) {
    const group = new THREE.Group();
    group.add(tube(r, r, 40.8, 0, m.foam));
    group.add(tube(r * 1.01, r * 1.01, 1, 0, m.black));
    group.add(bell(1.2, 2.5, 0, m.bell));
    if (!isCenter) group.add(nose(r, 4, 40.8, m.foam));
    group.position.x = x;
    return group;
  }

  g.add(core(0, true));
  g.add(tube(2, r, 2, 40.8, m.foam));                       // interstage
  g.add(tube(2.55, 2.55, 14, 42.8, m.white));               // 5 m fairing over the upper stage and Parker
  g.add(nose(2.55, 7, 56.8, m.white));

  const boosters = [];
  [-1, 1].forEach(function (side) {
    const b = core(side * 5.2, false);
    g.add(b);
    boosters.push(b);
  });

  return finish(g, {
    name: "Delta IV Heavy", height: 64, radius: 7.8, boosters: boosters,
    exhaust: [[0, 0, 2.2], [-5.2, 0, 2.2, true], [5.2, 0, 2.2, true]]
  });
}

// ---------- Atlas V (401, 411, 541, 551) ----------
// The code reads: first digit = fairing width (4 m or 5 m), second = number of solid boosters, third = Centaur engines.
// 4 m fairings sit on a narrow Centaur with a visible "boat tail"; 5 m fairings cover the whole Centaur.
function atlasV(solidCount, fiveMeter) {
  const m = materials();
  const g = new THREE.Group();
  const r = 1.905; // 3.81 m core

  g.add(tube(r, r, 32.5, 0, m.atlasCore));
  g.add(bell(1.1, 2.6, 0, m.bell, -0.6, 0));                // RD-180 has two nozzles
  g.add(bell(1.1, 2.6, 0, m.bell, 0.6, 0));

  let height;
  if (fiveMeter) {
    g.add(tube(2.7, r, 1.5, 32.5, m.white));                // 5.4 m fairing base
    g.add(tube(2.7, 2.7, 16, 34, m.white));
    g.add(nose(2.7, 7, 50, m.white));
    g.add(tube(2.72, 2.72, 0.5, 40, m.gray));
    height = 57;
  } else {
    g.add(tube(1.55, r, 1.4, 32.5, m.gray));                // boat tail
    g.add(tube(1.55, 1.55, 10.2, 33.9, m.silver));          // Centaur upper stage, visible
    g.add(tube(1.55, 1.55, 0.4, 38.5, m.black));
    g.add(tube(2.1, 1.55, 1.0, 44.1, m.white));             // 4.2 m fairing
    g.add(tube(2.1, 2.1, 6.5, 45.1, m.white));
    g.add(nose(2.1, 5.8, 51.6, m.white));
    height = 57.4;
  }

  // Solid rocket boosters, placed around the core
  const boosters = [];
  const angles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75, Math.PI * 1.5].slice(0, solidCount);
  const exhaust = [[-0.6, 0, 1.6], [0.6, 0, 1.6]];
  angles.forEach(function (angle) {
    const x = Math.cos(angle) * (r + 0.85);
    const z = Math.sin(angle) * (r + 0.85);
    const b = sideBooster(0.79, 17, x, z, m.white, m.white, 0);
    g.add(b);
    boosters.push(b);
    exhaust.push([x, z, 1.4, true]);
  });

  return finish(g, {
    name: "Atlas V " + (fiveMeter ? "5" : "4") + solidCount + "1", height: height,
    radius: r + (solidCount ? 1.7 : 1), boosters: boosters, exhaust: exhaust
  });
}

// ---------- Space Shuttle with the Inertial Upper Stage (Galileo, STS-34) ----------
function shuttle(name) {
  const m = materials();
  const g = new THREE.Group();

  // External tank (orange) in the middle
  g.add(tube(4.2, 4.2, 40, 0, m.foam));
  g.add(nose(4.2, 7, 40, m.foam));

  // Two solid rocket boosters
  const boosters = [];
  [-1, 1].forEach(function (side) {
    const b = sideBooster(1.85, 41, side * 6.3, 0, m.white, m.white, 0);
    b.add(tube(1.87, 1.87, 0.8, 3, m.black));
    g.add(b);
    boosters.push(b);
  });

  // Orbiter on the side of the tank (+Z), nose up
  const orbiter = new THREE.Group();
  orbiter.position.set(0, 0, 8.4);
  orbiter.add(tube(2.6, 2.6, 26, 3.5, m.white, 0, 0, 24));                  // fuselage
  orbiter.add(nose(2.6, 6, 29.5, m.white));
  const belly = new THREE.Mesh(new THREE.BoxGeometry(5.0, 30, 0.8), m.tile); // black heat tiles toward the tank
  belly.position.set(0, 16, -2.4);
  orbiter.add(belly);
  const windows = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.2, 1), m.black);
  windows.position.set(0, 29.5, 2.1);
  orbiter.add(windows);

  // Delta wings
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(11.9, 0);
  wingShape.lineTo(11.9, 2.5);
  wingShape.lineTo(2.5, 16);
  wingShape.lineTo(0, 18);
  wingShape.closePath();
  const wingGeometry = new THREE.ExtrudeGeometry(wingShape, { depth: 0.6, bevelEnabled: false });
  [-1, 1].forEach(function (side) {
    const wing = new THREE.Mesh(wingGeometry, m.white);
    wing.position.set(0, 3.5, -1.2);
    wing.scale.x = side;
    orbiter.add(wing);
    const edge = new THREE.Mesh(wingGeometry, m.tile);
    edge.position.set(0, 3.5, -1.3);
    edge.scale.set(side * 1.01, 1.01, 0.4);
    orbiter.add(edge);
  });

  // Tail fin and the three main engines
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8, 7), m.white);
  fin.position.set(0, 6, 2.8);
  fin.rotation.x = -0.2;
  orbiter.add(fin);
  [[0, 1.4], [-1.3, -0.4], [1.3, -0.4]].forEach(function (p) {
    orbiter.add(bell(1.1, 3, 3.5, m.bell, p[0], p[1]));
  });
  g.add(orbiter);

  return finish(g, {
    name: name || "Space Shuttle", height: 56, radius: 12.5, boosters: boosters,
    exhaust: [[-6.3, 0, 2.4, true], [6.3, 0, 2.4, true], [0, 9.8, 1.4], [-1.3, 8, 1.4], [1.3, 8, 1.4]]
  });
}


// ---------- Atlas-Centaur (Surveyor 1, Pioneer 10 and 11, Pioneer Venus) ----------
// A thin, shiny stainless-steel "balloon" tank, a flared booster skirt with two outer engines and a center sustainer,
// a Centaur upper stage and a slim nose fairing.
function atlasCentaur() {
  const m = materials();
  const g = new THREE.Group();
  const r = 1.525; // 3.05 m

  g.add(tube(r, 2.1, 4, 0, m.silver));                      // flared booster section
  g.add(tube(r, r, 18, 4, m.silver));                       // Atlas balloon tank
  g.add(tube(r * 1.01, r * 1.01, 0.4, 21.5, m.black));
  g.add(tube(r, r, 1.2, 22, m.gray));                       // interstage
  g.add(tube(r, r, 9, 23.2, m.white));                      // Centaur (insulated)
  g.add(tube(r, r, 6, 32.2, m.white));                      // payload fairing
  g.add(nose(r, 4.6, 38.2, m.white));
  [-1.1, 1.1].forEach(function (x) { g.add(bell(0.75, 1.6, 0, m.bell, x, 0)); });  // booster engines
  g.add(bell(0.45, 1.2, 0, m.bell, 0, 0));                  // sustainer
  [0, Math.PI].forEach(function (a) {                       // small vernier fairings on the sides
    g.add(tube(0.3, 0.4, 2, 2, m.gray, Math.cos(a + Math.PI / 2) * 2.0, Math.sin(a + Math.PI / 2) * 2.0, 12));
  });

  return finish(g, {
    name: "Atlas-Centaur", height: 42.8, radius: 3,
    exhaust: [[-1.1, 0, 1.4], [1.1, 0, 1.4], [0, 0, 1.0]]
  });
}

// ---------- Delta II (7925 with nine solids; "Heavy" with bigger solids) ----------
// The first stage was painted a pale turquoise ("Delta green") with white strap-on solid motors.
function delta2(heavy) {
  const m = materials();
  const g = new THREE.Group();
  const r = 1.22; // 2.44 m first stage

  const green = new THREE.MeshStandardMaterial({ color: 0x5f9e94, roughness: 0.6 });
  g.add(tube(r, r, 26, 0, green));
  g.add(tube(r * 1.01, r * 1.01, 0.5, 25.6, m.black));
  g.add(tube(r, r, 6, 26.1, m.white));                      // second stage
  g.add(tube(1.5, r, 1, 32.1, m.white));
  g.add(tube(1.5, 1.5, 5, 33.1, m.white));                  // 2.9 m fairing
  g.add(nose(1.5, 4, 38.1, m.white));
  g.add(bell(0.8, 1.6, 0, m.bell));

  const boosters = [];
  const exhaust = [[0, 0, 1.2]];
  const solidR = heavy ? 0.58 : 0.51;
  const solidL = heavy ? 14.7 : 13;
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2;
    const x = Math.cos(angle) * (r + solidR + 0.05);
    const z = Math.sin(angle) * (r + solidR + 0.05);
    const b = sideBooster(solidR, solidL, x, z, m.white, m.white, 0);
    g.add(b);
    boosters.push(b);
    exhaust.push([x, z, 0.9, true]);
  }

  return finish(g, {
    name: heavy ? "Delta II Heavy" : "Delta II 7925", height: 42, radius: r + solidR * 2 + 0.6,
    boosters: boosters, exhaust: exhaust
  });
}

// ---------- Falcon 9 (Blue Ghost Mission 1, DART) ----------
// Tall and slim and all white, nine engines at the base, a black interstage with four grid fins,
// folded landing legs on the first stage, and a wide fairing.
function falcon9() {
  const m = materials();
  const g = new THREE.Group();
  const r = 1.83; // 3.66 m

  g.add(tube(r, r, 41, 0, m.white));                        // first stage
  g.add(tube(r * 1.01, r * 1.01, 1.2, 0, m.black));         // engine section
  g.add(tube(r, r, 6, 41, m.black));                        // interstage
  for (let i = 0; i < 4; i++) {                             // grid fins (folded flat)
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 0.15), m.gray);
    fin.position.set(Math.cos(a) * (r + 0.1), 46, Math.sin(a) * (r + 0.1));
    fin.rotation.y = -a + Math.PI / 2;
    g.add(fin);
  }
  for (let i = 0; i < 4; i++) {                             // landing legs folded against the stage
    const a = (i / 4) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.6, 9, 0.25), m.black);
    leg.position.set(Math.cos(a) * (r + 0.12), 5, Math.sin(a) * (r + 0.12));
    leg.rotation.y = -a + Math.PI / 2;
    g.add(leg);
  }
  g.add(tube(r, r, 8, 47, m.white));                        // second stage
  g.add(tube(2.6, r, 1.4, 55, m.white));                    // 5.2 m fairing
  g.add(tube(2.6, 2.6, 6.5, 56.4, m.white));
  g.add(nose(2.6, 6.2, 62.9, m.white));

  const exhaust = [[0, 0, 0.9]];
  g.add(bell(0.45, 1.1, 0, m.bell, 0, 0));
  for (let i = 0; i < 8; i++) {                             // "Octaweb": eight engines around the center one
    const a = (i / 8) * Math.PI * 2;
    const x = Math.cos(a) * 1.15;
    const z = Math.sin(a) * 1.15;
    g.add(bell(0.45, 1.1, 0, m.bell, x, z));
    exhaust.push([x, z, 0.9]);
  }

  return finish(g, { name: "Falcon 9", height: 70, radius: r + 1.2, exhaust: exhaust });
}

// ---------- Space Launch System, Block 1 (Artemis I) ----------
// An orange core stage (8.4 m wide) with four RS-25 engines, two white five-segment boosters,
// the ICPS upper stage under a white adapter, and Orion with its launch abort tower on top.
function sls() {
  const m = materials();
  const g = new THREE.Group();
  const r = 4.2;

  g.add(tube(r, r, 64.6, 0, m.foam));                       // core stage (212 ft)
  g.add(nose(r * 0.98, 0.1, 64.6, m.foam));
  [[1.6, 1.6], [-1.6, 1.6], [1.6, -1.6], [-1.6, -1.6]].forEach(function (p) {
    g.add(bell(1.15, 3.1, 0, m.bell, p[0], p[1]));          // four RS-25 engines
  });
  g.add(tube(2.6, r, 7.5, 64.6, m.white));                  // launch vehicle stage adapter
  g.add(tube(2.55, 2.55, 6, 72.1, m.silver));               // ICPS
  g.add(tube(2.5, 2.55, 3, 78.1, m.white));                 // Orion stage adapter
  g.add(tube(2.5, 2.5, 4, 81.1, m.white));                  // Orion service module under its panels
  g.add(tube(0.9, 2.5, 4.2, 85.1, m.white));                // crew module under the abort cover
  g.add(tube(0.35, 0.9, 6, 89.3, m.white, 0, 0, 16));       // launch abort tower
  g.add(nose(0.35, 2.8, 95.3, m.white));

  const boosters = [];
  [-1, 1].forEach(function (side) {
    const b = sideBooster(1.85, 47, side * (r + 1.95), 0, m.white, m.white, 0);
    [10, 19, 28, 37].forEach(function (y) { b.add(tube(1.87, 1.87, 0.5, y, m.black)); }); // 5 segments
    g.add(b);
    boosters.push(b);
  });

  return finish(g, {
    name: "Space Launch System (Block 1)", height: 98.1, radius: r + 4.2, boosters: boosters,
    exhaust: [[1.6, 1.6, 1.6], [-1.6, 1.6, 1.6], [1.6, -1.6, 1.6], [-1.6, -1.6, 1.6],
      [-(r + 1.95), 0, 2.6, true], [r + 1.95, 0, 2.6, true]]
  });
}

// ---------- Titan II GLV (Gemini) ----------
// A two-stage modified missile: no strap-on boosters, a dark first stage, and the Gemini capsule on top.
function titan2() {
  const m = materials();
  const g = new THREE.Group();
  const r = 1.525;

  g.add(tube(r, r, 19, 0, m.gray));                         // first stage
  g.add(tube(r * 1.01, r * 1.01, 0.6, 18.6, m.black));
  g.add(tube(r, r, 7.5, 19.2, m.white));                    // second stage
  g.add(tube(1.5, r, 2.2, 26.7, m.white));                  // Gemini adapter section (white)
  g.add(tube(0.95, 1.5, 2.5, 28.9, m.black));               // Gemini capsule (dark)
  g.add(tube(0.4, 0.95, 1.2, 31.4, m.black));
  g.add(tube(0.4, 0.4, 0.6, 32.6, m.gray));
  [-0.75, 0.75].forEach(function (x) { g.add(bell(0.75, 1.8, 0, m.bell, x, 0)); });

  return finish(g, { name: "Titan II GLV (Gemini)", height: 33.2, radius: 3, exhaust: [[-0.75, 0, 1.2], [0.75, 0, 1.2]] });
}

// ---------- Proton (Zarya) ----------
// Unmistakable first stage: a central oxidizer tank ringed by six outer fuel tanks, each with its own engine.
function proton() {
  const m = materials();
  const g = new THREE.Group();
  const r = 2.05;

  g.add(tube(r, r, 21, 0, m.white));                        // central tank
  const exhaust = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * (r + 0.8);
    const z = Math.sin(a) * (r + 0.8);
    g.add(tube(0.85, 0.85, 19, 0, m.gray, x, z, 24));
    g.add(nose(0.85, 2, 19, m.gray, x, z));
    g.add(bell(0.7, 1.4, 0, m.bell, x, z));
    exhaust.push([x, z, 1.2]);
  }
  g.add(tube(r, r, 14, 21, m.white));                       // second stage
  g.add(tube(r * 1.01, r * 1.01, 0.4, 21, m.black));
  g.add(tube(r, r, 6.5, 35, m.white));                      // third stage
  g.add(tube(r, r, 8, 41.5, m.white));                      // payload fairing (Zarya inside)
  g.add(nose(r, 5, 49.5, m.white));

  return finish(g, { name: "Proton-K", height: 54.5, radius: r + 1.9, exhaust: exhaust });
}

// ---------- Ariane 5 ECA (ESA; James Webb Space Telescope) ----------
// A wide white cryogenic core with one Vulcain 2 engine and two tall solid boosters (EAP) with pointed noses.
function ariane5() {
  const m = materials();
  const g = new THREE.Group();
  const r = 2.7; // 5.4 m

  g.add(tube(r, r, 30.5, 0, m.white));                      // core stage (EPC)
  g.add(tube(r * 1.01, r * 1.01, 0.6, 30.3, m.black));
  g.add(tube(r, r, 4.5, 30.9, m.gray));                     // upper stage (ESC-A) area
  g.add(tube(r, r, 10, 35.4, m.white));                     // fairing (Webb folded inside)
  g.add(nose(r, 7.5, 45.4, m.white));
  g.add(bell(1.1, 2.4, 0, m.bell));                         // Vulcain 2

  const boosters = [];
  [-1, 1].forEach(function (side) {
    const b = sideBooster(1.5, 27, side * (r + 1.6), 0, m.white, m.white, 3);
    b.add(tube(1.5, 1.5, 3, 0, m.gray));                    // booster skirt
    g.add(b);
    boosters.push(b);
  });

  return finish(g, {
    name: "Ariane 5 ECA", height: 53, radius: r + 3.4, boosters: boosters,
    exhaust: [[0, 0, 1.6], [-(r + 1.6), 0, 2.3, true], [r + 1.6, 0, 2.3, true]]
  });
}

// Every rocket key, with the rocket's name (used by the Explorer)
export const ROCKET_KEYS = [
  "saturn-v", "saturn-v-skylab", "titan-2", "titan-3e", "titan-4b", "atlas-centaur", "delta-2", "delta-2-heavy",
  "atlas-v-401", "atlas-v-411", "atlas-v-541", "atlas-v-551", "delta-4-heavy", "falcon-9", "sls",
  "proton", "ariane-5", "shuttle", "shuttle-sts31", "shuttle-sts88"
];

// ---------- Sandbox paint (Rocket Lab) ----------
// Only used in Sandbox Mode. It recolors this one rocket's white parts (paint) and dark bands (accent).
// Historical Mode never calls it, so real rockets keep their real colors.
export function paintRocket(rocket, look) {
  if (!rocket || !look || (look.paint === null && look.accent === null) || (look.paint === undefined && look.accent === undefined)) return rocket;
  const m = materials();
  const paint = look.paint !== null && look.paint !== undefined ? m.white.clone() : null;
  if (paint) paint.color.set(look.paint);
  const accent = look.accent !== null && look.accent !== undefined ? m.black.clone() : null;
  if (accent) accent.color.set(look.accent);
  rocket.traverse(function (o) {
    if (!o.isMesh) return;
    if (paint && o.material === m.white) o.material = paint;
    else if (accent && o.material === m.black) o.material = accent;
  });
  rocket.userData.custom = true;
  return rocket;
}

// ---------- Choose a rocket by name ----------
// look (optional, Sandbox Mode only): { paint, accent } colors from the Rocket Lab
export function createRocket(name, look) {
  return paintRocket(buildRocket(name), look);
}

function buildRocket(name) {
  switch (name) {
    case "saturn-v": return saturnV(false);
    case "saturn-v-skylab": return saturnV(true);
    case "titan-2": return titan2();
    case "titan-3e": return titan3e();
    case "titan-4b": return titan4b();
    case "atlas-centaur": return atlasCentaur();
    case "delta-2": return delta2(false);
    case "delta-2-heavy": return delta2(true);
    case "delta-4-heavy": return deltaIVHeavy();
    case "atlas-v-401": return atlasV(0, false);
    case "atlas-v-411": return atlasV(1, false);
    case "atlas-v-541": return atlasV(4, true);
    case "atlas-v-551": return atlasV(5, true);
    case "falcon-9": return falcon9();
    case "sls": return sls();
    case "proton": return proton();
    case "ariane-5": return ariane5();
    case "shuttle": return shuttle("Space Shuttle Atlantis (STS-34)");
    case "shuttle-sts31": return shuttle("Space Shuttle Discovery (STS-31)");
    case "shuttle-sts88": return shuttle("Space Shuttle Endeavour (STS-88)");
    default: return null; // null = use the generic intro rocket
  }
}
