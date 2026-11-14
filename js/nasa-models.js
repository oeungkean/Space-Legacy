// Official NASA 3D models from NASA's 3D Resources (https://science.nasa.gov/3d-resources/), loaded
// straight from NASA's asset server when they are needed. NASA states these assets are free to download
// and use (see the NASA Images and Media Usage Guidelines); they are credited on the Credits page.
//
// They replace the project's own simplified models on the Missions page (the cards' pictures and the 3D
// viewer) and are shown in the Agena exhibit. The project's model is always shown first and stays as the
// fallback (offline, slow connection, or if NASA's server is unreachable). The mission scenes (launch,
// space shots, landing, exploration) keep the project's models, so a spacecraft looks the same from
// launch to landing (Master Doc 8); the rockets' stage separations are built from those models' parts.

import * as THREE from "three";

const BASE = "https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/model/";
// model key in this project -> NASA file and its page
export const NASA_MODELS = {
  "saturn-v": { file: "saturn-v/Saturn%20V.glb", page: "https://science.nasa.gov/3d-resources/saturn-v/", name: "Saturn V" },
  "lunar-module": { file: "apollo-lunar-module/Apollo%20Lunar%20Module.glb", page: "https://science.nasa.gov/3d-resources/apollo-lunar-module/", name: "Apollo Lunar Module" },
  gemini: { file: "gemini/Gemini.glb", page: "https://science.nasa.gov/3d-resources/gemini/", name: "Gemini", rotate: [Math.PI / 2, 0, 0] },
  "galileo-orbiter": { file: "galileo/Galileo.glb", page: "https://science.nasa.gov/3d-resources/galileo/", name: "Galileo" },
  parker: { file: "parker-solar-probe/Parker%20Solar%20Probe.glb", page: "https://science.nasa.gov/3d-resources/parker-solar-probe/", name: "Parker Solar Probe" },
  pioneer: { file: "pioneer-10/Pioneer%2010.glb", page: "https://science.nasa.gov/3d-resources/pioneer/", name: "Pioneer 10" },
  "viking-lander": { file: "viking-lander/Viking%20Lander.glb", page: "https://science.nasa.gov/3d-resources/viking-lander/", name: "Viking Lander" },
  perseverance: { file: "mars-2020-perseverance-rover/Mars%202020%20Perseverance%20Rover.glb", page: "https://science.nasa.gov/3d-resources/mars-2020-perseverance-rover/", name: "Mars 2020 Perseverance Rover" },
  agena: { file: "agena-target-vehicle/Agena%20Target%20Vehicle.glb", page: "https://science.nasa.gov/3d-resources/agena-target-vehicle/", name: "Agena Target Vehicle" },
  // Master Doc 14: every other craft in this project that NASA's 3D Resources has as a .glb (checked on
  // each asset page, November 14, 2026). Where NASA offers two versions, the lighter file is used.
  // rotate: NASA's file turned to face the same way as the project's model (checked side by side), so the
  // spacecraft flies nose first in the mission scenes.
  // Not on the list: Curiosity, Skylab and SLS (NASA's pages have no .glb), the ISS (our model is only
  // the Zarya module), and the spacesuits (our astronaut is animated).
  hubble: { file: "hubble-space-telescope-(a)/Hubble%20Space%20Telescope%20(A).glb", page: "https://science.nasa.gov/3d-resources/hubble-space-telescope-a/", name: "Hubble Space Telescope", rotate: [0, 0, Math.PI / 2] },
  jwst: { file: "james-webb-space-telescope-(b)/James%20Webb%20Space%20Telescope%20(B).glb", page: "https://science.nasa.gov/3d-resources/james-webb-space-telescope-b/", name: "James Webb Space Telescope", rotate: [0, Math.PI / 2, 0] },
  voyager: { file: "voyager-probe-(a)/Voyager%20Probe%20(A).glb", page: "https://science.nasa.gov/3d-resources/voyager-probe-a/", name: "Voyager", rotate: [Math.PI / 2, -Math.PI / 2, 0] },
  "cassini-huygens": { file: "cassini-huygens-(a)/Cassini-Huygens%20(A).glb", page: "https://science.nasa.gov/3d-resources/cassini-huygens-a/", name: "Cassini-Huygens" },
  lro: { file: "lunar-reconnaissance-orbiter-(a)/Lunar%20Reconnaissance%20Orbiter%20(A).glb", page: "https://science.nasa.gov/3d-resources/lunar-reconnaissance-orbiter-a/", name: "Lunar Reconnaissance Orbiter", rotate: [0, Math.PI / 2, 0] },
  messenger: { file: "mercury-surface,-space-environment,-geochemistry,-and-ranging-(messenger)/MErcury%20Surface,%20Space%20ENvironment,%20GEochemistry,%20and%20Ranging%20(MESSENGER).glb", page: "https://science.nasa.gov/3d-resources/mercury-surface-space-environment-geochemistry-and-ranging-messenger/", name: "MESSENGER", rotate: [0, Math.PI / 2, 0] },
  "osiris-rex": { file: "osiris-rex/OSIRIS-REx.glb", page: "https://science.nasa.gov/3d-resources/origins-spectral-interpretation-resource-identification-and-security-regolith-explorer-osiris-rex/", name: "OSIRIS-REx", rotate: [0, Math.PI / 2, Math.PI / 2] },
  stardust: { file: "stardust/Stardust.glb", page: "https://science.nasa.gov/3d-resources/stardust/", name: "Stardust", rotate: [0, Math.PI / 2, 0] }
};

// Models whose parts move in the mission scenes keep the project's model there (Master Doc 14: NASA
// models everywhere except where something separates or unfolds): the Apollo stack and Lunar Module
// (the ascent stage lifts off), the rovers (turning wheels), and anything that unfolds or releases a probe.
const KEEP_IN_SCENES = { "lunar-module": true, "apollo-stack": true, "galileo-orbiter": true, "cassini-huygens": true };
export function nasaUsableInScene(model, key) {
  if (!NASA_MODELS[key] || KEEP_IN_SCENES[key] || !model || !model.userData) return false;
  const u = model.userData;
  return !u.setDeploy && !u.wheels && !u.deployInstruments && !u.chutes;
}

// Tell the page a NASA model is on screen (the mission player shows a small "NASA 3D model" label)
export function announceNasaModel(key) {
  const entry = NASA_MODELS[key];
  if (!entry || typeof document === "undefined" || !document.dispatchEvent) return;
  try { document.dispatchEvent(new CustomEvent("nasa-model-shown", { detail: { key: key, name: entry.name, page: entry.page } })); } catch (error) { /* labels are optional */ }
}

let loaderPromise = null;
// NASA's GLB files are Draco-compressed, so the loader needs three.js's Draco decoder (same pinned version
// as the rest of three.js, from the same CDN)
const DRACO_PATH = "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/";
function getLoader() {
  if (!loaderPromise) {
    loaderPromise = Promise.all([
      import("three/addons/loaders/GLTFLoader.js"),
      import("three/addons/loaders/DRACOLoader.js")
    ]).then(function (mods) {
      const loader = new mods[0].GLTFLoader();
      const draco = new mods[1].DRACOLoader();
      draco.setDecoderPath(DRACO_PATH);
      loader.setDRACOLoader(draco);
      return loader;
    });
  }
  return loaderPromise;
}

const cache = {}; // key -> Promise of the loaded scene (each use gets a clone)

export function hasNasaModel(key) {
  return Boolean(NASA_MODELS[key]);
}

export function nasaModelInfo(key) {
  return NASA_MODELS[key] || null;
}

// Loads the NASA model for a key. Resolves to a new copy of the scene, or null if it could not be loaded.
export function loadNasaModel(key) {
  const entry = NASA_MODELS[key];
  if (!entry) return Promise.resolve(null);
  if (!cache[key]) {
    cache[key] = getLoader().then(function (loader) {
      return new Promise(function (resolve) {
        loader.load(BASE + entry.file, function (gltf) { resolve(gltf.scene); }, undefined, function () { resolve(null); });
      });
    }).catch(function () { return null; });
  }
  return cache[key].then(function (scene) { return scene ? scene.clone(true) : null; });
}

// Puts the NASA model in place of a model built by the project: same size (its largest dimension), same
// centre, standing on the same base. The project's meshes are hidden (not removed), so everything that
// uses the group (its position, animations of the group, userData) keeps working.
// Returns a Promise that resolves to true when the NASA model is shown.
export function upgradeToNasaModel(group, key) {
  if (!group || !NASA_MODELS[key]) return Promise.resolve(false);
  return loadNasaModel(key).then(function (nasa) {
    if (!nasa) return false;
    // some NASA files face another way than the project's model: an optional turn per model
    const turn = NASA_MODELS[key].rotate;
    if (turn) { nasa.rotation.set(turn[0], turn[1], turn[2]); nasa.updateMatrixWorld(true); }
    group.updateMatrixWorld(true);
    // the project's model, measured in the group's own space
    const toLocal = new THREE.Matrix4().copy(group.matrixWorld).invert();
    const before = new THREE.Box3();
    group.traverse(function (o) {
      if (!o.isMesh || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const box = o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(toLocal, o.matrixWorld));
      before.union(box);
    });
    if (before.isEmpty()) return false;
    const size = before.getSize(new THREE.Vector3());
    const centre = before.getCenter(new THREE.Vector3());
    const after = new THREE.Box3().setFromObject(nasa);
    const nasaSize = after.getSize(new THREE.Vector3());
    const scale = Math.max(size.x, size.y, size.z) / Math.max(nasaSize.x, nasaSize.y, nasaSize.z || 1e-6);
    const holder = new THREE.Group();
    holder.name = "nasa-model";
    nasa.scale.setScalar(scale);
    const nasaCentre = after.getCenter(new THREE.Vector3()).multiplyScalar(scale);
    nasa.position.set(centre.x - nasaCentre.x, before.min.y - after.min.y * scale, centre.z - nasaCentre.z);
    nasa.traverse(function (o) {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.material && o.material.isMeshStandardMaterial === false && o.material.isMeshBasicMaterial) o.material.toneMapped = true;
      }
    });
    holder.add(nasa);
    // hide the project's own meshes, keep everything else (flames, lights, helpers) as it was
    group.children.forEach(function (child) {
      if (child.name !== "nasa-model" && !child.userData.keepWithNasa) child.visible = false;
    });
    group.add(holder);
    group.userData.nasaModel = key;
    return true;
  });
}
