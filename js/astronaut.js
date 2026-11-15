// Detailed astronaut models with jointed limbs, four researched spacesuits, and procedural animations.
// Built in code (no model files). They are representative models, not official NASA 3D models.
//
//   createSuitedAstronaut(suitId)  ->  THREE.Group, about 1.9 m tall, feet at y = 0, facing +Z
//   astronaut.userData.animate(state, dt, options)
//     states: idle, walk, run, lunar-hop, mars-walk, jump, float, climb, operate, collect, drive, seated
//     options.speed (0..1) scales the gait. The physics (gravity, jump height) is done by the caller.
//   astronaut.userData.walk(phase)   (kept for the older launch and landing scenes)
//
// Suits (see data/simulator.js for the sources):
//   a7l     Apollo A7-L: white beta cloth, ribbed joints, gold visor, big backpack (PLSS) with the OPS on top
//   emu     Shuttle / ISS EMU: hard upper torso, chest control box (DCM), PLSS with SAFER underneath, red stripes optional
//   axemu   Axiom AxEMU for Artemis: rounded torso, helmet lights, slimmer life-support pack
//   iva     SpaceX launch-and-entry suit: sleek white and dark grey, one-piece helmet, no backpack (it plugs into the seat)

import * as THREE from "three";

let mats = null;

function canvasTexture(w, h, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext("2d"), w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function materials() {
  if (mats) return mats;
  // Woven beta-cloth look: a fine grid with soft folds
  const cloth = canvasTexture(256, 256, function (ctx, w, h) {
    ctx.fillStyle = "#eceae4";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(0,0,0,0.05)";
    for (let i = 0; i < w; i += 4) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
    }
    for (let i = 0; i < 14; i++) {
      const y = Math.random() * h;
      const g = ctx.createLinearGradient(0, y - 10, 0, y + 10);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(0.5, "rgba(0,0,0,0.07)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, y - 10, w, 20);
    }
  });
  mats = {
    cloth: new THREE.MeshStandardMaterial({ map: cloth, roughness: 0.92 }),
    hard: new THREE.MeshStandardMaterial({ color: 0xf1f0ec, roughness: 0.45, metalness: 0.05 }),
    rib: new THREE.MeshStandardMaterial({ color: 0xd9d6cf, roughness: 0.8 }),
    darkCloth: new THREE.MeshStandardMaterial({ color: 0x2c2e33, roughness: 0.85 }),
    grey: new THREE.MeshStandardMaterial({ color: 0x8a8f97, roughness: 0.5, metalness: 0.4 }),
    metal: new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.3, metalness: 0.85 }),
    red: new THREE.MeshStandardMaterial({ color: 0xc23a2b, roughness: 0.6 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x2d5fb8, roughness: 0.6 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xe0782f, roughness: 0.6 }),
    black: new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.5 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x3a3b3f, roughness: 0.95 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd9a63a, metalness: 0.9, roughness: 0.12, emissive: 0x2a1c04 }),
    darkVisor: new THREE.MeshStandardMaterial({ color: 0x0c1016, metalness: 0.9, roughness: 0.08 }),
    bubble: new THREE.MeshStandardMaterial({ color: 0xcfe3ff, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.2, depthWrite: false }),
    light: new THREE.MeshBasicMaterial({ color: 0xfff6dc }),
    face: new THREE.MeshStandardMaterial({ color: 0x8a6a55, roughness: 0.8 })
  };
  return mats;
}

function mesh(geometry, material, x, y, z) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x || 0, y || 0, z || 0);
  return m;
}

function capsule(radius, length, material) {
  return new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 6, 16), material);
}

// A ribbed "convolute" joint: a few rings around a limb (Apollo suits had these at shoulders, elbows and knees)
function ribs(radius, count, spacing, material) {
  const group = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, radius * 0.16, 8, 20), material);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = (i - (count - 1) / 2) * spacing;
    group.add(ring);
  }
  return group;
}

export const SUIT_LOOKS = {
  a7l: { body: "cloth", ribbed: true, visor: "gold", pack: "plss-apollo", stripes: false, boots: "lunar" },
  emu: { body: "cloth", hut: true, visor: "gold", pack: "plss-emu", stripes: true, boots: "emu" },
  axemu: { body: "cloth", hut: true, visor: "gold", pack: "plss-axemu", lights: true, trim: "orange", boots: "lunar" },
  iva: { body: "hard", visor: "dark", pack: null, trim: "dark", boots: "iva" },
  // Gemini: a silver-white pressure suit with a visored helmet, no backpack (simplified)
  gemini: { body: "cloth", visor: "dark", pack: null, trim: "dark", boots: "emu" }
};

export function createSuitedAstronaut(suitId) {
  const look = SUIT_LOOKS[suitId] || SUIT_LOOKS.a7l;
  const m = materials();
  const bodyMat = look.body === "hard" ? m.hard : m.cloth;
  const trimMat = look.trim === "orange" ? m.orange : look.trim === "dark" ? m.darkCloth : m.blue;

  const root = new THREE.Group();          // feet at y = 0
  const hips = new THREE.Group();          // moves up and down while walking
  hips.position.y = 0.98;
  root.add(hips);

  // ----- Torso -----
  const spine = new THREE.Group();
  spine.position.y = 0.05;
  hips.add(spine);
  hips.add(mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.2, 18), bodyMat, 0, 0, 0)); // brief / pelvis
  const torso = capsule(0.24, 0.32, bodyMat);
  torso.position.y = 0.36;
  torso.scale.set(1.05, 1, 0.82);
  spine.add(torso);
  if (look.hut) {
    // EMU-style hard upper torso: a rigid shell over the chest
    const hut = mesh(new THREE.SphereGeometry(0.27, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), m.hard, 0, 0.42, 0);
    hut.scale.set(1.05, 0.9, 0.85);
    spine.add(hut);
  }
  spine.add(mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 24), m.metal, 0, 0.12, 0).rotateX(Math.PI / 2)); // waist ring
  // Chest controls (Apollo RCU / EMU DCM)
  spine.add(mesh(new THREE.BoxGeometry(0.24, 0.13, 0.08), look.hut ? m.hard : m.grey, 0, 0.42, 0.22));
  spine.add(mesh(new THREE.BoxGeometry(0.18, 0.04, 0.02), m.black, 0, 0.45, 0.265));
  // Hose connectors on the chest (red and blue on Apollo suits)
  if (look.pack === "plss-apollo") {
    spine.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 12), m.red, -0.12, 0.3, 0.2).rotateX(Math.PI / 2));
    spine.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 12), m.blue, 0.12, 0.3, 0.2).rotateX(Math.PI / 2));
  }
  if (look.trim === "orange") {
    spine.add(mesh(new THREE.BoxGeometry(0.5, 0.025, 0.42), m.orange, 0, 0.18, 0));
  }

  // ----- Life-support backpack -----
  if (look.pack) {
    const pack = new THREE.Group();
    pack.position.set(0, 0.4, -0.3);
    spine.add(pack);
    if (look.pack === "plss-apollo") {
      pack.add(mesh(new THREE.BoxGeometry(0.48, 0.58, 0.24), bodyMat, 0, 0, 0));
      pack.add(mesh(new THREE.BoxGeometry(0.44, 0.2, 0.22), m.cloth, 0, 0.39, 0)); // OPS (oxygen purge system)
      pack.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), m.metal, 0.18, 0.62, -0.02)); // antenna
    } else if (look.pack === "plss-emu") {
      pack.add(mesh(new THREE.BoxGeometry(0.46, 0.62, 0.2), m.hard, 0, 0, 0));
      pack.add(mesh(new THREE.BoxGeometry(0.5, 0.18, 0.26), m.grey, 0, -0.4, -0.02)); // SAFER jet pack
      [-0.18, 0.18].forEach(function (x) {
        pack.add(mesh(new THREE.BoxGeometry(0.04, 0.4, 0.04), m.black, x, -0.05, -0.11)); // handrails
      });
    } else {
      pack.add(mesh(new THREE.BoxGeometry(0.44, 0.56, 0.2), m.hard, 0, 0, 0));
      pack.add(mesh(new THREE.BoxGeometry(0.46, 0.06, 0.22), trimMat, 0, 0.18, 0));
    }
  }

  // ----- Head and helmet -----
  const neck = new THREE.Group();
  neck.position.y = 0.66;
  spine.add(neck);
  neck.add(mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.06, 24), m.metal, 0, 0.0, 0)); // neck ring
  neck.add(mesh(new THREE.SphereGeometry(0.1, 16, 12), m.face, 0, 0.17, 0.02));        // a head inside
  const helmetGroup = new THREE.Group();
  helmetGroup.position.y = 0.17;
  neck.add(helmetGroup);
  if (look.visor === "dark") {
    // One-piece helmet with a dark visor
    helmetGroup.add(mesh(new THREE.SphereGeometry(0.19, 24, 18), m.hard, 0, 0.01, -0.01));
    // SphereGeometry measures phi from -X, so the front (+Z) is at phi = PI / 2
    const visor = mesh(new THREE.SphereGeometry(0.192, 24, 18, Math.PI * 0.5 - Math.PI * 0.32, Math.PI * 0.64, Math.PI * 0.28, Math.PI * 0.36), m.darkVisor, 0, 0.01, 0);
    helmetGroup.add(visor);
    helmetGroup.add(mesh(new THREE.BoxGeometry(0.03, 0.1, 0.06), m.darkCloth, 0.19, 0.0, 0));
  } else {
    helmetGroup.add(mesh(new THREE.SphereGeometry(0.2, 24, 18), m.bubble, 0, 0, 0));  // clear pressure bubble
    // Visor assembly: white shell with the gold sun visor down
    const shell = mesh(new THREE.SphereGeometry(0.22, 24, 18, Math.PI * 0.62, Math.PI * 1.76, 0, Math.PI * 0.7), look.hut ? m.hard : m.cloth, 0, 0, 0);
    helmetGroup.add(shell);
    const visor = mesh(new THREE.SphereGeometry(0.215, 24, 18, Math.PI * 0.5 - Math.PI * 0.38, Math.PI * 0.76, Math.PI * 0.2, Math.PI * 0.45), m.gold, 0, 0, 0);
    helmetGroup.add(visor);
    if (look.lights) {
      [-0.12, 0.12].forEach(function (x) {
        helmetGroup.add(mesh(new THREE.BoxGeometry(0.05, 0.025, 0.03), m.light, x, 0.15, 0.13));
      });
    }
    if (look.pack === "plss-emu") {
      helmetGroup.add(mesh(new THREE.BoxGeometry(0.05, 0.05, 0.08), m.black, 0.2, 0.08, 0.02)); // helmet light/camera
    }
  }

  // ----- Arms: shoulder -> upper arm -> elbow -> forearm -> glove -----
  function arm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.31, 0.52, 0);
    spine.add(shoulder);
    shoulder.add(mesh(new THREE.SphereGeometry(0.1, 14, 10), look.hut ? m.hard : bodyMat, 0, 0, 0));
    const upper = capsule(0.075, 0.2, bodyMat);
    upper.position.y = -0.17;
    shoulder.add(upper);
    if (look.ribbed) {
      const r = ribs(0.085, 3, 0.035, m.rib);
      r.position.y = -0.05;
      shoulder.add(r);
    }
    if (look.stripes && side < 0) {
      shoulder.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 14), m.red, 0, -0.12, 0)); // commander stripe
    }
    const elbow = new THREE.Group();
    elbow.position.y = -0.33;
    shoulder.add(elbow);
    if (look.ribbed) elbow.add(ribs(0.075, 3, 0.03, m.rib));
    elbow.add(mesh(new THREE.SphereGeometry(0.075, 12, 10), bodyMat, 0, 0, 0));
    const fore = capsule(0.068, 0.17, bodyMat);
    fore.position.y = -0.15;
    elbow.add(fore);
    elbow.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 16), look.pack === "plss-apollo" ? m.blue : m.metal, 0, -0.27, 0)); // wrist ring
    const hand = new THREE.Group();
    hand.position.y = -0.31;
    elbow.add(hand);
    const glove = mesh(new THREE.BoxGeometry(0.1, 0.13, 0.06), look.body === "hard" ? m.darkCloth : m.rubber, 0, -0.06, 0);
    hand.add(glove);
    hand.add(mesh(new THREE.BoxGeometry(0.03, 0.06, 0.04), look.body === "hard" ? m.darkCloth : m.rubber, side * -0.055, -0.03, 0.02)); // thumb
    return { shoulder: shoulder, elbow: elbow, hand: hand, side: side };
  }

  // ----- Legs: hip -> thigh -> knee -> shin -> boot -----
  function leg(side) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.11, -0.05, 0);
    hips.add(hip);
    const thigh = capsule(0.095, 0.26, bodyMat);
    thigh.position.y = -0.2;
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.43;
    hip.add(knee);
    if (look.ribbed) knee.add(ribs(0.095, 3, 0.035, m.rib));
    knee.add(mesh(new THREE.SphereGeometry(0.09, 12, 10), bodyMat, 0, 0, 0));
    const shin = capsule(0.085, 0.24, bodyMat);
    shin.position.y = -0.19;
    knee.add(shin);
    const ankle = new THREE.Group();
    ankle.position.y = -0.42;
    knee.add(ankle);
    const bootMat = look.boots === "iva" ? m.black : look.boots === "emu" ? m.hard : m.cloth;
    ankle.add(mesh(new THREE.BoxGeometry(0.16, 0.12, 0.28), bootMat, 0, -0.04, 0.04));
    ankle.add(mesh(new THREE.BoxGeometry(0.17, 0.035, 0.3), m.rubber, 0, -0.1, 0.04)); // ribbed sole
    if (look.boots === "lunar") ankle.add(mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.1, 14), m.cloth, 0, 0.05, 0));
    return { hip: hip, knee: knee, ankle: ankle, side: side };
  }

  const L = { arm: arm(-1), leg: leg(-1) };
  const R = { arm: arm(1), leg: leg(1) };

  root.userData.size = 1.9;
  root.userData.suit = suitId;
  root.userData.parts = { hips: hips, spine: spine, neck: neck, L: L, R: R };
  root.userData.clock = 0;
  root.userData.shadowCast = true;
  root.traverse(function (o) { if (o.isMesh) o.castShadow = true; });

  const pose = createPoser(root.userData.parts);
  root.userData.animate = function (state, dt, options) {
    root.userData.clock += dt || 0;
    pose(state, root.userData.clock, options || {});
  };
  // Older scenes call walk(phase): a normal walking stride
  root.userData.walk = function (phase) {
    pose("walk", phase / (Math.PI * 2) * 1.1, { speed: 1 });
  };
  pose("idle", 0, {});
  return root;
}

// Sets every joint for a pose at time t (seconds). All poses are procedural so they blend with the physics.
function createPoser(p) {
  function setArm(a, shoulderX, shoulderZ, elbowX) {
    a.shoulder.rotation.set(shoulderX, 0, shoulderZ);
    a.elbow.rotation.set(elbowX, 0, 0);
  }
  function setLeg(l, hipX, kneeX, ankleX) {
    l.hip.rotation.set(hipX, 0, 0);
    l.knee.rotation.set(kneeX, 0, 0);
    l.ankle.rotation.set(ankleX || 0, 0, 0);
  }
  function reset() {
    p.hips.position.y = 0.98;
    p.hips.rotation.set(0, 0, 0);
    p.spine.rotation.set(0, 0, 0);
    p.neck.rotation.set(0, 0, 0);
  }

  return function pose(state, t, o) {
    reset();
    const speed = o.speed === undefined ? 1 : o.speed;
    const s = 0.25; // arms rest slightly away from the stiff suit
    switch (state) {
      case "walk":
      case "mars-walk": {
        const f = state === "mars-walk" ? 4.6 : 5.4;    // steps are slower in a heavy suit
        const w = Math.sin(t * f);
        const amp = 0.5 * speed;
        setLeg(p.L.leg, w * amp, Math.max(0, -Math.cos(t * f)) * 0.6 * speed, 0);
        setLeg(p.R.leg, -w * amp, Math.max(0, Math.cos(t * f)) * 0.6 * speed, 0);
        setArm(p.L.arm, -w * 0.35 * speed, -s, -0.35);
        setArm(p.R.arm, w * 0.35 * speed, s, -0.35);
        p.hips.position.y = 0.98 - Math.abs(Math.sin(t * f)) * 0.03;
        p.spine.rotation.x = 0.06;
        break;
      }
      case "run": {
        const w = Math.sin(t * 8.5);
        setLeg(p.L.leg, w * 0.8, Math.max(0, -Math.cos(t * 8.5)) * 1.2, 0.2);
        setLeg(p.R.leg, -w * 0.8, Math.max(0, Math.cos(t * 8.5)) * 1.2, 0.2);
        setArm(p.L.arm, -w * 0.7, -s, -1.1);
        setArm(p.R.arm, w * 0.7, s, -1.1);
        p.spine.rotation.x = 0.22;
        p.hips.position.y = 0.95 + Math.abs(Math.sin(t * 8.5)) * 0.05;
        break;
      }
      case "lunar-hop": {
        // The Apollo "bunny hop": both feet together, knees bend on landing, a long float in between
        const phase = (t * 1.6) % 1;
        const air = Math.sin(phase * Math.PI);
        const crouch = phase < 0.15 ? 1 - phase / 0.15 : phase > 0.85 ? (phase - 0.85) / 0.15 : 0;
        setLeg(p.L.leg, -0.25 - crouch * 0.4, 0.3 + crouch * 0.7, -0.2);
        setLeg(p.R.leg, -0.05 - crouch * 0.4, 0.2 + crouch * 0.7, -0.2);
        setArm(p.L.arm, -0.25 - air * 0.3, -s - 0.15, -0.6);
        setArm(p.R.arm, -0.25 - air * 0.3, s + 0.15, -0.6);
        p.spine.rotation.x = 0.18;
        p.hips.position.y = 0.98 - crouch * 0.14;
        break;
      }
      case "jump": {
        const v = o.verticalSpeed || 0;
        const tuck = Math.max(0, Math.min(1, 0.5 - v * 0.15));
        setLeg(p.L.leg, -0.3 * tuck, 0.6 * tuck, 0);
        setLeg(p.R.leg, -0.2 * tuck, 0.5 * tuck, 0);
        setArm(p.L.arm, -0.8, -s - 0.4, -0.4);
        setArm(p.R.arm, -0.8, s + 0.4, -0.4);
        break;
      }
      case "float": {
        // Zero gravity: limbs drift into the neutral body posture, slowly swaying
        const sway = Math.sin(t * 0.9);
        setLeg(p.L.leg, -0.35 + sway * 0.06, 0.55, 0.3);
        setLeg(p.R.leg, -0.25 - sway * 0.06, 0.5, 0.3);
        setArm(p.L.arm, -0.5 + sway * 0.08, -0.55, -0.7);
        setArm(p.R.arm, -0.5 - sway * 0.08, 0.55, -0.7);
        p.spine.rotation.x = 0.12;
        p.neck.rotation.x = -0.15;
        break;
      }
      case "climb": {
        // Ladder: hands and feet alternate up the rungs
        const c = Math.sin(t * 3.2);
        setArm(p.L.arm, -2.6 + c * 0.35, -0.15, -0.5 - Math.max(0, c) * 0.6);
        setArm(p.R.arm, -2.6 - c * 0.35, 0.15, -0.5 - Math.max(0, -c) * 0.6);
        setLeg(p.L.leg, -0.6 - Math.max(0, c) * 0.6, 0.9 + Math.max(0, c) * 0.6, 0);
        setLeg(p.R.leg, -0.6 - Math.max(0, -c) * 0.6, 0.9 + Math.max(0, -c) * 0.6, 0);
        p.spine.rotation.x = -0.1;
        break;
      }
      case "operate": {
        // Working a control panel or instrument in front of the chest
        const tap = Math.sin(t * 6) * 0.12;
        setArm(p.L.arm, -1.0, -0.2, -1.1 + tap);
        setArm(p.R.arm, -1.15, 0.2, -0.9 - tap);
        setLeg(p.L.leg, 0, 0, 0);
        setLeg(p.R.leg, 0, 0, 0);
        p.neck.rotation.x = 0.35;
        break;
      }
      case "collect": {
        // Kneel and reach for something on the ground (o.progress 0..1)
        const k = Math.sin(Math.min(1, o.progress || 0) * Math.PI);
        setLeg(p.L.leg, -1.1 * k, 1.9 * k, -0.6 * k);
        setLeg(p.R.leg, 0.25 * k, 1.6 * k, 0.4 * k);
        p.hips.position.y = 0.98 - 0.5 * k;
        p.spine.rotation.x = 0.55 * k;
        setArm(p.L.arm, -0.4, -s, -0.4);
        setArm(p.R.arm, -1.2 * k - 0.2, s, -0.3);
        p.neck.rotation.x = 0.4 * k;
        break;
      }
      case "drive":
      case "seated": {
        setLeg(p.L.leg, -1.45, 1.4, 0);
        setLeg(p.R.leg, -1.45, 1.4, 0);
        const steer = state === "drive" ? (o.steer || 0) : 0;
        setArm(p.L.arm, -1.0 + steer * 0.2, -0.15, -0.9);
        setArm(p.R.arm, -1.0 - steer * 0.2, 0.15, -0.9);
        p.hips.position.y = 0.55;
        p.spine.rotation.x = -0.1;
        break;
      }
      default: { // idle: a slow breathing sway
        const b = Math.sin(t * 1.4) * 0.02;
        setLeg(p.L.leg, 0, 0, 0);
        setLeg(p.R.leg, 0, 0, 0);
        setArm(p.L.arm, b, -s, -0.25);
        setArm(p.R.arm, -b, s, -0.25);
        p.spine.rotation.x = b;
      }
    }
  };
}
