// Mission Simulator. The Rocket Garage has ONE engineering place, the Engineering Bay:
//   stations (tabs) inside it: Rocket -> Spacecraft -> Destination -> Launch, plus the Workshop
//   (parts, comparison, paint and fictional upgrades). The 3D pad always shows your current build.
// The Astronaut Simulation has the Suit Locker and the exploration sites.
// HISTORICAL MODE only offers combinations that really flew (data/simulator.js TEMPLATES).
// SANDBOX MODE offers anything, and labels it as fictional everywhere.
// The Rocket Lab tab: rocket parts, side-by-side comparison, and (sandbox only) paint and fictional upgrades.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createRocket } from "./rockets.js";
import { createModel } from "./models.js";
import { createSuitedAstronaut } from "./astronaut.js";
import { modelIcon } from "./explorer.js";
import { destinationIcon, planetPicture, uiIcon } from "./icons.js";
import { findItem } from "../data/catalog.js";
import {
  SPACECRAFT, DESTINATIONS, TEMPLATES, SIM_ROCKETS, ROCKET_PARTS, SITES, EQUIPMENT, SUITS, templatesFor
} from "../data/simulator.js";
import { buildObjectives, getPoints, getUpgrades, spendPoint, onProgressChange } from "./progress.js";
import { play } from "./sounds.js";
import { guardContextLoss } from "./webgl-context.js";

const el = function (id) { return document.getElementById(id); };
const stepButtons = document.querySelectorAll ? document.querySelectorAll("[data-sim-step]") : [];
const modeButtons = document.querySelectorAll ? document.querySelectorAll("[data-sim-mode]") : [];
// Pages in the sidebar
// One place: the Mission Builder. (Older names "locker" and "explore" open the Suit and Destination steps.)
const panels = { lab: el("sim-step-lab") };
// Steps of the builder, in order, plus the optional Workshop
const BAY_TABS = ["rocket", "spacecraft", "suit", "destination", "review", "workshop"];
const progressBar = el("bay-progress-bar");
const progressText = el("bay-progress-text");
const bayTabButtons = document.querySelectorAll ? document.querySelectorAll("[data-bay-tab]") : [];
const bayPanes = document.querySelectorAll ? document.querySelectorAll("[data-bay-pane]") : [];
const buildSheet = el("build-sheet");
const bayNext = el("bay-next");

// ----- First visit: a short "start here" card over the Engineering Bay (shown once, remembered in this browser) -----
const coach = el("sim-coach");
const COACH_KEY = "space-legacy-sim-coach-seen";
let coachDismissed = false; // also remembered for this visit when the browser blocks storage
function coachSeen() {
  if (coachDismissed) return true;
  try { return localStorage.getItem(COACH_KEY) === "1"; } catch (error) { return false; }
}
export function showSimCoach(force) {
  if (force || !coachSeen()) coach.classList.remove("hidden");
}
el("sim-coach-ok").addEventListener("click", function () {
  coach.classList.add("hidden");
  coachDismissed = true;
  try { localStorage.setItem(COACH_KEY, "1"); } catch (error) { /* shown again next time */ }
  play("click");
});
const labBay = el("lab-bay");
const labPlate = el("lab-plate");
const labStats = el("lab-stats");
const lockerSuits = el("locker-suits");
const lockerCanvas = el("locker-canvas");
const lockerPoses = el("locker-poses");
const lockerFacts = el("locker-facts");
const lockerName = el("locker-name");
const lockerEquipment = el("locker-equipment");
const lockerVehicles = el("locker-vehicles");
const lockerWear = el("locker-wear");
const lockerWearNote = el("locker-wear-note");
const siteList = el("sim-site-list");
const exploreNote = el("sim-explore-note");
const rocketInfo = el("sim-rocket-info");
const craftList = el("sim-craft-list");
const craftInfo = el("sim-craft-info");
const destList = el("sim-dest-list");
const reviewList = el("sim-review");
const reviewObjectives = el("sim-objectives");
const reviewBadge = el("sim-badge");
const launchButton = el("sim-launch");
const modeNote = el("sim-mode-note");
const labCanvas = el("lab-canvas");
const labCompare = el("lab-compare");
const labParts = el("lab-parts");
const labTable = el("lab-table");
const labCustom = el("lab-custom");
const labPoints = el("lab-points");
const labUpgrades = el("lab-upgrades");
const labLock = el("lab-lock");
const resultsBox = el("sim-results");

const state = {
  mode: "historical",
  step: "lab",
  bayTab: "rocket",
  rocket: null,
  spacecraft: null,
  destination: null,
  look: { paint: null, accent: null },
  labRocket: "saturn-v",
  labCompare: "",
  suit: "a7l",          // the suit shown in the Suit Locker
  pose: "walk",         // the animation shown in the Suit Locker
  wearSuit: false       // Sandbox only: wear the locker's suit on every site (fictional)
};

// ----- Helpers -----
function rocketName(key) {
  const item = findItem(key);
  if (item) return item.name;
  const r = createRocket(key);
  return r ? r.userData.name : key;
}

function historicalTemplate() {
  return templatesFor({ rocket: state.rocket, spacecraft: state.spacecraft, destination: state.destination })[0] || null;
}

function isHistoricalCombo(rocket, spacecraft, destination) {
  return templatesFor({ rocket: rocket, spacecraft: spacecraft, destination: destination }).length > 0;
}

// A card with a picture on the left: a rendered 3D picture of the model (flags.picture = model spec)
// or an illustrated picture (flags.icon = SVG string, used for planets)
function card(title, meta, note, selected, onClick, flags) {
  const button = document.createElement("button");
  const hasIcon = Boolean(flags && (flags.icon || flags.picture));
  button.className = "sim-card" + (hasIcon ? " has-icon" : "") + (selected ? " selected" : "") + (flags && flags.fictional ? " fictional" : "") + (flags && flags.disabled ? " disabled" : "");
  button.innerHTML = (hasIcon ? '<span class="sim-card-pic"></span>' : "") +
    '<span class="sim-card-text"><span class="sim-card-title"></span><span class="sim-card-meta"></span><span class="sim-card-note"></span></span>';
  if (button.querySelector) {
    button.querySelector(".sim-card-title").textContent = title;
    button.querySelector(".sim-card-meta").textContent = meta || "";
    button.querySelector(".sim-card-note").textContent = note || "";
    if (hasIcon) setPicture(button.querySelector(".sim-card-pic"), flags.picture, flags.icon);
  }
  if (flags && flags.disabled) button.disabled = true;
  button.addEventListener("click", onClick);
  return button;
}

// Fills a frame with a rendered model picture (spec) or an illustrated SVG picture
function setPicture(frame, spec, svg) {
  if (!frame) return;
  if (svg) {
    frame.innerHTML = svg;
    return;
  }
  const img = document.createElement("img");
  img.alt = "";
  frame.appendChild(img);
  modelIcon(spec, img);
}

// Destinations that are planets or moons get a rendered picture of the real-texture globe
const PLANET_PICTURE = {
  moon: { type: "planet", key: "Moon" }, mars: { type: "planet", key: "Mars" }, venus: { type: "planet", key: "Venus" },
  mercury: { type: "planet", key: "Mercury" }, jupiter: { type: "planet", key: "Jupiter" }, saturn: { type: "planet", key: "Saturn" }
};

// The model to picture for each spacecraft and site
function craftPicture(key) {
  return { type: "model", key: SPACECRAFT[key].model };
}

function sitePicture(site) {
  if (site.vehicle === "lrv") return { type: "model", key: "lrv" };
  if (site.vehicle === "rover" && !site.fictional) return { type: "model", key: site.rover || "perseverance" };
  if (site.world === "orbit" && site.start !== "eva") return { type: "model", key: site.craft };
  return { type: "astronaut", key: site.suit || "axemu", pose: site.world === "moon" ? "lunar-hop" : "walk" };
}

function factList(target, rows) {
  target.innerHTML = "";
  rows.forEach(function (row) {
    if (!row[1]) return;
    const li = document.createElement("li");
    const label = document.createElement("strong");
    label.textContent = row[0];
    li.appendChild(label);
    li.appendChild(document.createTextNode(row[1]));
    target.appendChild(li);
  });
}

export { destinationIcon };

// ----- Step 1: rocket -----
function rocketAllowed(key) {
  return state.mode === "sandbox" || templatesFor({ rocket: key }).length > 0;
}

// Choose a rocket (from a garage bay). In Historical Mode only rockets that launched a mission here can be flown.
function chooseRocket(key) {
  state.labRocket = key;
  if (!rocketAllowed(key)) return false;
  if (state.rocket !== key) {
    state.rocket = key;
    state.spacecraft = null;
    state.destination = null;
  }
  return true;
}

function renderRockets() {
  const key = state.labRocket;
  const item = findItem(key);
  const missions = templatesFor({ rocket: key });
  const compatible = missions.map(function (t) { return SPACECRAFT[t.spacecraft].name; });
  factList(rocketInfo, [
    ["On the pad", rocketName(key) + (state.rocket === key ? " (chosen for your mission)" : rocketAllowed(key) ? "" : " (inspect only: it launched no mission in this simulator; Free Build lets you fly it)")],
    ["History", item ? item.background || item.description : ""],
    ["Specifications", item && item.specs ? item.specs.map(function (s) { return s[0] + ": " + s[1]; }).join(" · ") : ""],
    ["Flew", missions.length ? missions.map(function (t) { return t.name; }).join(", ") : "Free Build only in this simulator"],
    ["Compatible spacecraft (historical)", compatible.length ? Array.from(new Set(compatible)).join(", ") : "None in this simulator"],
    ["Launch animation", "The liftoff scene uses this rocket's own model, with its own boosters and staging."]
  ]);
}

// ----- Step 2: spacecraft -----
function renderSpacecraft() {
  craftList.innerHTML = "";
  if (!state.rocket) {
    craftList.innerHTML = '<p class="sim-empty">Roll a rocket onto the pad first (station 01).</p>';
    craftInfo.innerHTML = "";
    return;
  }
  Object.keys(SPACECRAFT).forEach(function (key) {
    const craft = SPACECRAFT[key];
    const historical = templatesFor({ rocket: state.rocket, spacecraft: key }).length > 0;
    if (state.mode === "historical" && !historical) return;
    const launchers = Array.from(new Set(templatesFor({ spacecraft: key }).map(function (t) { return rocketName(t.rocket); })));
    craftList.appendChild(card(craft.name,
      historical ? "Historically launched on " + rocketName(state.rocket) : "FICTIONAL combination (Free Build)",
      "Real launch vehicles: " + (launchers.join(", ") || "none in this simulator"),
      state.spacecraft === key,
      function () {
        state.spacecraft = key;
        state.destination = null;
        play("select");
        render();
      }, { fictional: !historical, picture: craftPicture(key) }));
  });
  if (state.spacecraft) {
    const craft = SPACECRAFT[state.spacecraft];
    const item = craft.catalogId ? findItem(craft.catalogId) : null;
    factList(craftInfo, [
      ["Type", craft.type],
      ["About", item ? item.description || item.mission : "Crew Dragon: SpaceX's crew capsule; Demo-2 (2020) carried Robert Behnken and Douglas Hurley to the space station."],
      ["Can be launched by (historically)", Array.from(new Set(templatesFor({ spacecraft: state.spacecraft }).map(function (t) { return rocketName(t.rocket); }))).join(", ")]
    ]);
  } else craftInfo.innerHTML = "";
}

// ----- Step 3: destination -----
const CAPABILITY = {
  crewed: "Carries astronauts.",
  rover: "A robot: explores the surface and does not return to Earth.",
  lander: "A robot lander: it stays where it lands.",
  probe: "A robotic probe: flybys or orbit, no astronauts and no landing of people.",
  telescope: "A telescope: it observes from its orbit.",
  station: "A space station module in Earth orbit."
};

function renderDestinations() {
  destList.innerHTML = "";
  if (!state.spacecraft) {
    destList.innerHTML = '<p class="sim-empty">Fit a spacecraft first (station 02).</p>';
    return;
  }
  const craft = SPACECRAFT[state.spacecraft];
  const note = document.createElement("p");
  note.className = "sim-capability";
  note.textContent = craft.name + ": " + CAPABILITY[craft.type];
  destList.appendChild(note);
  Object.keys(DESTINATIONS).forEach(function (key) {
    const d = DESTINATIONS[key];
    const historical = isHistoricalCombo(state.rocket, state.spacecraft, key);
    if (state.mode === "historical" && !historical) return;
    const template = templatesFor({ rocket: state.rocket, spacecraft: state.spacecraft, destination: key })[0];
    destList.appendChild(card(d.name,
      historical ? "Real mission: " + template.name + " (" + template.year + ")" : "FICTIONAL destination for this spacecraft",
      "Travel time: " + d.travel,
      state.destination === key,
      function () {
        state.destination = key;
        play("select");
        render();
      }, { fictional: !historical, picture: PLANET_PICTURE[key], icon: PLANET_PICTURE[key] ? null : planetPicture(key) }));
  });
}

// ----- Step 4: review -----
function missionConfig() {
  const template = state.mode === "historical" ? historicalTemplate() : null;
  const craft = SPACECRAFT[state.spacecraft];
  let siteId = template ? template.site : null;
  if (state.mode === "sandbox") {
    if (state.destination === "moon" && (craft.type === "crewed" || craft.type === "lander")) siteId = state.spacecraft === "apollo" ? "hadley" : "sandbox-moon";
    else if (state.destination === "mars" && (craft.type === "crewed" || craft.type === "rover")) siteId = craft.type === "rover" ? (state.spacecraft === "curiosity" ? "gale" : "jezero") : "sandbox-mars";
    else if (state.destination === "earth-orbit" && craft.type === "crewed") siteId = state.spacecraft === "dragon" ? "orbit-dragon" : "orbit-hubble";
  }
  const fictional = state.mode === "sandbox" && !isHistoricalCombo(state.rocket, state.spacecraft, state.destination);
  return {
    mode: state.mode,
    fictional: fictional,
    rocket: state.rocket,
    spacecraft: state.spacecraft,
    destination: state.destination,
    template: template,
    siteId: siteId,
    crew: template ? template.crew : craft.crew,
    title: template ? template.name : (fictional ? "Free Build mission (fictional)" : "Free Build mission"),
    look: state.mode === "sandbox" ? state.look : null,
    upgrades: state.mode === "sandbox" ? getUpgrades() : null
  };
}

function renderReview() {
  if (state.destination && state.mode === "historical" && !historicalTemplate()) {
    // Never offered in Historical Mode, but guard anyway
    reviewList.innerHTML = '<li class="sim-empty">This combination never flew. Switch to Free Build to try it as a fictional mission.</li>';
    reviewObjectives.innerHTML = "";
    launchButton.disabled = true;
    reviewBadge.textContent = "";
    return;
  }
  if (!state.destination) {
    reviewList.innerHTML = '<li class="sim-empty">Choose a rocket, a spacecraft and a destination first (stations 01 to 03).</li>';
    reviewObjectives.innerHTML = "";
    launchButton.disabled = true;
    reviewBadge.textContent = "";
    return;
  }
  const config = missionConfig();
  const site = config.siteId ? SITES[config.siteId] : null;
  const suit = site && site.suit ? SUITS[site.suit] : null;
  reviewBadge.textContent = config.mode === "historical" ? "Real mission · " + config.template.name + " (" + config.template.year + ")" :
    config.fictional ? "Free Build · FICTIONAL combination" : "Free Build · matches a real mission";
  reviewBadge.className = "sim-badge " + (config.mode === "historical" ? "historical" : "fictional");
  factList(reviewList, [
    ["Rocket", rocketName(config.rocket) + (config.look && (config.look.paint || config.look.accent) ? " (custom paint: fictional)" : "")],
    ["Spacecraft", SPACECRAFT[config.spacecraft].name],
    ["Destination", DESTINATIONS[config.destination].name],
    ["Crew", config.crew ? config.crew + (config.crew === 1 ? " astronaut" : " astronauts") : "Uncrewed"],
    ["Spacesuit", suit ? suit.name + " (" + suit.era + ")" : "None needed"],
    ["Exploration", site ? site.name + (site.fictional ? " (fictional site)" : "") : "No surface exploration: the journey ends with the spacecraft's real final state"],
    ["Exploration vehicles", site && site.vehicle === "lrv" ? "Lunar Roving Vehicle" : site && site.vehicle === "rover" ? "The rover itself" : "None"],
    ["Equipment", site ? site.equipment.map(function (key) { return EQUIPMENT[key].name; }).join(", ") : "Mission instruments only"],
    ["Duration estimate", config.template ? config.template.duration : DESTINATIONS[config.destination].travel + " (based on real missions)"],
    ["Fictional upgrades", config.upgrades && Object.keys(config.upgrades).length ? Object.keys(config.upgrades).map(function (k) { return k + " +" + config.upgrades[k]; }).join(", ") + " (game mode)" : ""]
  ]);
  reviewObjectives.innerHTML = "";
  buildObjectives(config, site).forEach(function (o) {
    const li = document.createElement("li");
    li.textContent = o.text;
    reviewObjectives.appendChild(li);
  });
  launchButton.disabled = false;
}

launchButton.addEventListener("click", function () {
  if (!state.destination) return;
  play("ignition");
  document.dispatchEvent(new CustomEvent("sim-launch", { detail: missionConfig() }));
});

// ----- Pages and stations -----
// Old step names (rocket, spacecraft, destination, review) open that station inside the Engineering Bay.
function setStep(step) {
  if (step === "locker") step = "suit";
  if (step === "explore") step = "destination";
  if (BAY_TABS.indexOf(step) !== -1) {
    state.bayTab = step;
    step = "lab";
  }
  state.step = step;
  Object.keys(panels).forEach(function (key) { panels[key].classList.toggle("hidden", key !== step); });
  stepButtons.forEach(function (button) {
    button.classList.toggle("active", button.dataset.simStep === step);
  });
  render();
  showBayExtras();
}

function setBayTab(tab) {
  state.bayTab = tab;
  render();
  showBayExtras();
}

// The Suit step shows the locker (with its 3D turntable); the Destination step also lists sites to explore
function showBayExtras() {
  if (state.bayTab === "suit") {
    state.suitSeen = true;
    renderLocker();
    requestAnimationFrame(function () { if (locker) sizeViewer(locker); });
    render();
  }
  if (state.bayTab === "destination") renderSites();
  if (state.bayTab === "spacecraft") renderVehicles();
}

bayTabButtons.forEach(function (button) {
  if (button.querySelector) {
    const icon = button.querySelector("[data-ui-icon]");
    if (icon) icon.innerHTML = uiIcon(icon.getAttribute ? icon.getAttribute("data-ui-icon") : icon.dataset.uiIcon);
  }
  button.addEventListener("click", function () {
    play("click");
    setBayTab(button.dataset.bayTab);
  });
});

// The next station, so the bay guides you without extra sidebar buttons
function nextStation() {
  if (!state.rocket) return null;
  if (!state.spacecraft) return ["spacecraft", "Next: fit a spacecraft"];
  if (!state.suitSeen) return ["suit", "Next: choose a suit"];
  if (!state.destination) return ["destination", "Next: pick a destination"];
  return ["review", "Next: launch preparation"];
}

bayNext.addEventListener("click", function () {
  const next = nextStation();
  if (!next) return;
  play("click");
  setBayTab(next[0]);
});

// The build sheet at the top of the bay: what you have chosen so far
function renderBuildSheet() {
  buildSheet.innerHTML = "";
  const rows = [
    ["rocket", "Rocket", state.rocket ? rocketName(state.rocket) : "Not chosen", state.rocket ? { type: "rocket", key: state.rocket } : uiIcon("rocket")],
    ["spacecraft", "Spacecraft", state.spacecraft ? SPACECRAFT[state.spacecraft].name : "Not chosen", state.spacecraft ? craftPicture(state.spacecraft) : uiIcon("spacecraft")],
    ["suit", "Suit", state.suitSeen && SUITS[state.suit] ? SUITS[state.suit].name : "Not chosen", state.suitSeen ? { type: "astronaut", key: state.suit } : uiIcon("suit")],
    ["destination", "Destination", state.destination ? DESTINATIONS[state.destination].name : "Not chosen", state.destination ? (PLANET_PICTURE[state.destination] || planetPicture(state.destination)) : uiIcon("destination")]
  ];
  rows.forEach(function (row) {
    const li = document.createElement("li");
    const done = row[2] !== "Not chosen";
    li.className = "build-row" + (done ? " done" : "") + (state.bayTab === row[0] ? " active" : "");
    li.innerHTML = '<span class="build-icon"></span><span class="build-text"><em></em><b></b></span>';
    if (li.querySelector) {
      if (typeof row[3] === "string") li.querySelector(".build-icon").innerHTML = row[3];
      else setPicture(li.querySelector(".build-icon"), row[3]);
      li.querySelector("em").textContent = row[1];
      li.querySelector("b").textContent = row[2];
    }
    li.addEventListener("click", function () { play("click"); setBayTab(row[0]); });
    buildSheet.appendChild(li);
  });
}

function renderBayChrome() {
  bayTabButtons.forEach(function (button) {
    const tab = button.dataset.bayTab;
    button.classList.toggle("active", tab === state.bayTab);
    const done = (tab === "rocket" && state.rocket) || (tab === "spacecraft" && state.spacecraft) || (tab === "suit" && state.suitSeen) || (tab === "destination" && state.destination);
    button.classList.toggle("done", Boolean(done));
  });
  // Progress: how many of the four choices are made, and which step you are on
  const chosen = [state.rocket, state.spacecraft, state.suitSeen, state.destination].filter(Boolean).length;
  const stepIndex = ["rocket", "spacecraft", "suit", "destination", "review"].indexOf(state.bayTab);
  progressBar.style.width = (chosen / 4 * 100) + "%";
  progressText.textContent = (stepIndex >= 0 ? "Step " + (stepIndex + 1) + " of 5 \u00B7 " : "Workshop (optional) \u00B7 ") +
    chosen + " of 4 chosen" + (chosen === 4 ? " \u00B7 ready to launch" : "");
  bayPanes.forEach(function (pane) {
    pane.classList.toggle("hidden", pane.dataset.bayPane !== state.bayTab);
  });
  renderBuildSheet();
  const next = nextStation();
  const show = Boolean(next) && state.bayTab !== "review" && state.bayTab !== "workshop" && next[0] !== state.bayTab;
  bayNext.classList.toggle("hidden", !show);
  if (next) bayNext.textContent = next[1] + " →";
}

export function showSimStep(step) {
  setStep(step);
}

// ----- Astronaut: explore a site directly (no launch needed) -----
const WORLD_GROUPS = [["moon", "The Moon"], ["mars", "Mars"], ["orbit", "Earth orbit"]];

function renderSites() {
  siteList.innerHTML = "";
  exploreNote.textContent = state.mode === "historical"
    ? "Real landing sites, with the suits and vehicles used there. To fly there first, finish the steps above and launch."
    : "Free Build adds fictional sites (labelled) where astronauts land on Mars or anywhere on the Moon.";
  WORLD_GROUPS.forEach(function (group) {
    const ids = Object.keys(SITES).filter(function (id) {
      const site = SITES[id];
      return site.world === group[0] && (state.mode === "sandbox" || !site.fictional);
    });
    if (!ids.length) return;
    const heading = document.createElement("h4");
    heading.className = "sim-sub";
    heading.textContent = group[1];
    siteList.appendChild(heading);
    const grid = document.createElement("div");
    grid.className = "sim-grid";
    ids.forEach(function (id) {
      const site = SITES[id];
      const suit = site.suit ? SUITS[site.suit] : null;
      const vehicle = site.vehicle === "lrv" ? "Lunar Roving Vehicle" : site.vehicle === "rover" ? "Drive the rover" : site.start === "eva" ? "Spacewalk" : site.start === "cockpit" ? "Spacecraft controls" : "On foot";
      grid.appendChild(card(site.name,
        site.mission + (site.fictional ? " · FICTIONAL" : ""),
        (suit ? "Suit: " + suit.name : "Robotic mission") + " · " + vehicle,
        false,
        function () {
          play("select");
          const wear = state.mode === "sandbox" && state.wearSuit && site.suit ? state.suit : null;
          document.dispatchEvent(new CustomEvent("open-site", { detail: { siteId: id, suit: wear } }));
        }, { fictional: Boolean(site.fictional), picture: sitePicture(site) }));
    });
    siteList.appendChild(grid);
  });
}

stepButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    play("click");
    setStep(button.dataset.simStep);
  });
});

modeButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    setMode(button.dataset.simMode);
  });
});

export function setMode(mode) {
  state.mode = mode;
  play(mode === "sandbox" ? "toggleOn" : "toggleOff");
  // Historical mode keeps the original rockets: drop any custom paint and anything that did not really fly
  if (mode === "historical") {
    state.look = { paint: null, accent: null };
    if (state.rocket && templatesFor({ rocket: state.rocket }).length === 0) state.rocket = null;
    if (state.spacecraft && !templatesFor({ rocket: state.rocket, spacecraft: state.spacecraft }).length) state.spacecraft = null;
    if (state.destination && !isHistoricalCombo(state.rocket, state.spacecraft, state.destination)) state.destination = null;
  }
  render();
  if (state.bayTab === "destination") renderSites();
  if (state.bayTab === "suit") renderLocker();
}

function render() {
  modeButtons.forEach(function (button) { button.classList.toggle("active", button.dataset.simMode === state.mode); });
  modeNote.textContent = state.mode === "historical"
    ? "Real Missions: only rockets, spacecraft and destinations that really flew together, as they flew."
    : "Free Build: mix anything you like. Anything that never flew is labelled FICTIONAL.";
  if (state.mode === "historical" && state.rocket && !rocketAllowed(state.rocket)) state.rocket = null;
  renderRockets();
  renderSpacecraft();
  renderDestinations();
  renderReview();
  renderBayChrome();
  stepButtons.forEach(function (button) {
    const done = button.dataset.simStep === "lab" && state.rocket && state.spacecraft && state.destination;
    button.classList.toggle("done", Boolean(done));
  });
  if (state.step === "lab") renderLab();
}

// ----- 3D viewers (garage pad and suit locker) -----
function makeViewer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  guardContextLoss(canvas);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const key = new THREE.DirectionalLight(0xfff1e0, 2.6);
  key.position.set(5, 8, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fb8ff, 0.8);
  rim.position.set(-6, 3, -4);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 2000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.8;
  const holder = new THREE.Group();
  scene.add(holder);
  return { renderer: renderer, scene: scene, camera: camera, controls: controls, holder: holder, canvas: canvas };
}

let lab = null;
let locker = null;
let loopId = null;
let lastFrame = 0;

// Rocket garage: a hangar built around whatever stands on the pad (concrete floor, painted bay lines,
// a launch mount, a service tower, ribbed walls and ceiling lights). Rebuilt to fit the tallest object.
function concreteTexture() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const ctx = c.getContext("2d");
  if (!ctx || !ctx.fillRect) return null;
  ctx.fillStyle = "#3a3d44";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1800; i++) {
    const v = 50 + Math.random() * 40 | 0;
    ctx.fillStyle = "rgba(" + v + "," + (v + 2) + "," + (v + 6) + ",0.35)";
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  ctx.strokeStyle = "rgba(20,22,26,0.55)";   // expansion joints between slabs
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(c);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// A person for scale (hard hat and coveralls): about 1.8 m tall
function worker(height, color) {
  const g = new THREE.Group();
  const suit = new THREE.MeshStandardMaterial({ color: color, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(height * 0.13, height * 0.11, height * 0.62, 10), suit);
  body.position.y = height * 0.45;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(height * 0.08, 12, 10), new THREE.MeshStandardMaterial({ color: 0xc89a7a, roughness: 0.7 }));
  head.position.y = height * 0.85;
  g.add(head);
  const hat = new THREE.Mesh(new THREE.SphereGeometry(height * 0.09, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
  hat.position.y = height * 0.88;
  g.add(hat);
  return g;
}

// The rocket garage, built like a vehicle assembly high bay: polished concrete floor with painted lines,
// a mobile launch platform, work platforms around the rocket, a service tower, tall bay doors,
// a steel roof truss with an overhead crane, work lights, carts and people for scale.
// 1 model unit = 8 m, so a 1.8 m person is about 0.23 units tall.
function buildHangar(viewer, tallest, width) {
  if (viewer.hangar) viewer.scene.remove(viewer.hangar);
  const g = new THREE.Group();
  const size = Math.max(tallest * 2.4, width * 2.2, 40);
  const person = 0.23;
  const steel = new THREE.MeshStandardMaterial({ color: 0x5d6470, roughness: 0.45, metalness: 0.75 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x2b3038, roughness: 0.5, metalness: 0.7 });
  const yellowPaint = new THREE.MeshStandardMaterial({ color: 0xf2b01e, roughness: 0.5, metalness: 0.2 });

  // Floor: polished concrete (a little shiny) with painted lines
  const floorMap = concreteTexture();
  if (floorMap) floorMap.repeat.set(size / 10, size / 10);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ color: 0x8e939b, map: floorMap, roughness: 0.62, metalness: 0.05 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);
  const yellow = new THREE.MeshBasicMaterial({ color: 0xffb020 });
  const lineW = Math.max(0.08, size * 0.003);
  const box = Math.max(width * 0.75, tallest * 0.45, 10);
  [[0, box, box * 2, lineW], [0, -box, box * 2, lineW]].forEach(function (l) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(l[2], l[3]), yellow);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(l[0], 0.01, l[1]);
    g.add(strip);
  });
  [-box, box].forEach(function (x) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(lineW, box * 2), yellow);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(x, 0.01, 0);
    g.add(strip);
  });

  // Mobile launch platform under the rocket (gray deck on six legs)
  const mlpW = Math.max(width * 0.7, tallest * 0.22, 4);
  const mlp = new THREE.Mesh(new THREE.BoxGeometry(mlpW * 1.6, tallest * 0.04 + 0.3, mlpW), darkSteel);
  mlp.position.y = -0.02 - (tallest * 0.02 + 0.15);
  mlp.castShadow = true;
  mlp.receiveShadow = true;
  g.add(mlp);

  // Walls with tall vertical ribs, and the high bay door (a tall panel with stripes)
  const wallH = tallest * 1.45 + 6;
  const wallZ = -size * 0.32;
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x313844, roughness: 0.75, metalness: 0.3 });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(size, wallH), wallMat);
  wall.position.set(0, wallH / 2, wallZ);
  wall.receiveShadow = true;
  g.add(wall);
  const ribs = 16;
  for (let i = 0; i <= ribs; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(size * 0.01, wallH, size * 0.012), steel);
    rib.position.set(-size / 2 + (size / ribs) * i, wallH / 2, wallZ + size * 0.006);
    g.add(rib);
  }
  const doorW = Math.max(width * 1.3, tallest * 0.5);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(doorW, wallH * 0.92), new THREE.MeshStandardMaterial({ color: 0x8c96a6, roughness: 0.55, metalness: 0.5 }));
  door.position.set(size * 0.18, wallH * 0.46, wallZ + size * 0.014);
  g.add(door);
  for (let i = 1; i < 10; i++) {
    const seam = new THREE.Mesh(new THREE.PlaneGeometry(doorW, wallH * 0.004), darkSteel);
    seam.position.set(size * 0.18, wallH * 0.092 * i, wallZ + size * 0.015);
    g.add(seam);
  }
  const band = new THREE.Mesh(new THREE.PlaneGeometry(size, wallH * 0.05), new THREE.MeshBasicMaterial({ color: 0x9fc4ff }));
  band.position.set(0, wallH * 0.95, wallZ + size * 0.008);
  g.add(band); // high windows letting daylight in

  // Roof truss beams and an overhead bridge crane with a hook
  const roofY = wallH * 0.98;
  for (let i = -3; i <= 3; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.012, size * 0.012), steel);
    beam.position.set(0, roofY, wallZ + (i + 3.5) * size * 0.09);
    g.add(beam);
  }
  const crane = new THREE.Mesh(new THREE.BoxGeometry(size * 0.03, size * 0.025, size * 0.7), yellowPaint);
  crane.position.set(-box * 0.2, roofY - size * 0.03, 0);
  g.add(crane);
  const hook = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.002, size * 0.002, tallest * 0.25, 6), darkSteel);
  hook.position.set(-box * 0.2, roofY - size * 0.03 - tallest * 0.125, box * 0.3);
  g.add(hook);

  // Service tower (red lattice) with an access arm, beside the pad
  const towerMat = new THREE.MeshStandardMaterial({ color: 0xb8432a, roughness: 0.55, metalness: 0.55 });
  const towerH = tallest * 1.05;
  const tw = Math.max(1.2, tallest * 0.05);
  const tx = -box * 0.78;
  const tz = -box * 0.35;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(tw * 0.1, towerH, tw * 0.1), towerMat);
    leg.position.set(tx + c[0] * tw / 2, towerH / 2, tz + c[1] * tw / 2);
    leg.castShadow = true;
    g.add(leg);
  });
  const levels = Math.max(5, Math.round(towerH / (tw * 1.2)));
  for (let i = 1; i <= levels; i++) {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(tw * 1.08, tw * 0.05, tw * 1.08), towerMat);
    deck.position.set(tx, (towerH / levels) * i, tz);
    g.add(deck);
    const brace = new THREE.Mesh(new THREE.BoxGeometry(tw * 0.06, (towerH / levels) * 1.35, tw * 0.06), towerMat);
    brace.position.set(tx + tw / 2, (towerH / levels) * (i - 0.5), tz);
    brace.rotation.z = 0.75 * (i % 2 ? 1 : -1);
    g.add(brace);
  }

  // Work platforms around the rocket: rings with railings at several heights
  const ringR = Math.max(width * 0.32, 1.2);
  [0.25, 0.5, 0.72].forEach(function (f) {
    const y = tallest * f;
    const deck = new THREE.Mesh(new THREE.RingGeometry(ringR, ringR * 1.45, 40, 1, 0.6, Math.PI * 1.2), new THREE.MeshStandardMaterial({ color: 0x7a828e, roughness: 0.6, metalness: 0.6, side: THREE.DoubleSide }));
    deck.rotation.x = -Math.PI / 2;
    deck.position.y = y;
    deck.receiveShadow = true;
    g.add(deck);
    const rail = new THREE.Mesh(new THREE.TorusGeometry(ringR * 1.45, size * 0.0015 + 0.01, 4, 40, Math.PI * 1.2), yellowPaint);
    rail.rotation.x = -Math.PI / 2;
    rail.rotation.z = 0.6;
    rail.position.y = y + person * 0.55;
    g.add(rail);
    const w = worker(person, 0x2f6fd6);
    w.position.set(Math.cos(1.3) * ringR * 1.22, y, -Math.sin(1.3) * ringR * 1.22);
    g.add(w);
  });

  // Carts, crates and people on the floor, for scale
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x55606e, roughness: 0.7, metalness: 0.3 });
  [[box * 0.6, box * 0.55], [box * 0.75, box * 0.4], [-box * 0.6, box * 0.6]].forEach(function (p, i) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(person * 2.2, person * 1.2, person * 1.4), i === 1 ? yellowPaint : crateMat);
    crate.position.set(p[0], person * 0.6, p[1]);
    crate.castShadow = true;
    g.add(crate);
  });
  [[box * 0.5, box * 0.3, 0xf28c28], [box * 0.45, box * 0.36, 0x2f6fd6], [-box * 0.4, box * 0.5, 0xf2f2f2]].forEach(function (p) {
    const w = worker(person, p[2]);
    w.position.set(p[0], 0, p[1]);
    w.rotation.y = Math.random() * 3;
    g.add(w);
  });

  // Lights: daylight from the high windows, warm work lights, and a spotlight on the rocket (with shadows)
  const daylight = new THREE.DirectionalLight(0xdfe9ff, 1.1);
  daylight.position.set(size * 0.2, wallH, size * 0.4);
  g.add(daylight);
  const spot = new THREE.SpotLight(0xfff0d8, 3.4, 0, 0.5, 0.55);
  spot.position.set(size * 0.1, wallH, size * 0.25);
  spot.castShadow = true;
  if (spot.shadow && spot.shadow.mapSize) spot.shadow.mapSize.set(1024, 1024);
  g.add(spot);
  if (spot.target) {
    spot.target.position.set(0, tallest * 0.3, 0);
    g.add(spot.target);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff3dc });
  for (let i = -2; i <= 2; i++) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(size * 0.45, size * 0.004, size * 0.01), lightMat);
    strip.position.set(0, roofY - size * 0.01, i * size * 0.07);
    g.add(strip);
  }
  viewer.scene.add(g);
  viewer.hangar = g;
}

// Suit locker: a turntable with a soft glowing ring
function addTurntable(viewer) {
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.15, 0.08, 48), new THREE.MeshStandardMaterial({ color: 0xdde3ee, roughness: 0.4, metalness: 0.2 }));
  disc.position.y = -0.04;
  viewer.scene.add(disc);
  const glow = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.3, 64), new THREE.MeshBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.01;
  viewer.scene.add(glow);
}

function fill(viewer, objects) {
  while (viewer.holder.children.length) viewer.holder.remove(viewer.holder.children[0]);
  let x = 0;
  let tallest = 1;
  objects.forEach(function (object) {
    if (!object) return;
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);
    object.position.set(x + size.x / 2, 0, 0);
    object.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    viewer.holder.add(object);
    x += size.x + Math.max(2, size.y * 0.15);
    tallest = Math.max(tallest, size.y);
  });
  viewer.holder.position.x = -x / 2;
  if (viewer.garage) buildHangar(viewer, tallest, x);
  const distance = Math.max(tallest, x) * 1.9 + 2;
  viewer.camera.position.set(distance * 0.55, tallest * 0.6, distance);
  viewer.controls.target.set(0, tallest * 0.45, 0);
  viewer.controls.update();
}

function sizeViewer(viewer) {
  const width = viewer.canvas.clientWidth || 600;
  const height = viewer.canvas.clientHeight || 360;
  viewer.renderer.setSize(width, height, false);
  viewer.camera.aspect = width / height;
  viewer.camera.updateProjectionMatrix();
}

function loop(time) {
  loopId = requestAnimationFrame(loop);
  const dt = Math.min(0.05, Math.max(0, ((time || 0) - lastFrame) / 1000)) || 1 / 60;
  lastFrame = time || lastFrame;
  if (locker && locker.astronaut) locker.astronaut.userData.animate(state.pose, dt, { speed: 1 });
  [lab, locker].forEach(function (viewer) {
    if (!viewer) return;
    viewer.controls.update();
    viewer.renderer.render(viewer.scene, viewer.camera);
  });
}

// ----- Rocket Lab -----
const PAINTS = [
  { name: "Original", value: null }, { name: "Graphite", value: 0x3b3f46 }, { name: "Mars red", value: 0xb5482a },
  { name: "Ocean blue", value: 0x2f5fb8 }, { name: "Gold", value: 0xc9a13b }
];
const UPGRADES = [
  { key: "thrust", name: "Engine thrust", effect: "Shorter cruise in the replay" },
  { key: "efficiency", name: "Fuel efficiency", effect: "More fuel for the Lunar Module game" },
  { key: "payload", name: "Payload capacity", effect: "Shown on your mission review" }
];

function fillRocketSelect(select, withNone) {
  select.innerHTML = "";
  if (withNone) {
    const none = document.createElement("option");
    none.value = "";
    none.textContent = "Compare with...";
    select.appendChild(none);
  }
  SIM_ROCKETS.forEach(function (key) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = rocketName(key);
    select.appendChild(option);
  });
}
fillRocketSelect(labCompare, true);
labCompare.addEventListener("change", function () { state.labCompare = labCompare.value; renderLab(); });

function specsOf(key) {
  const item = findItem(key);
  const rocket = createRocket(key);
  const rows = { "Height (model)": Math.round(rocket.userData.height * 8) + " m", "Side boosters": String(rocket.userData.boosters.length) };
  (item && item.specs ? item.specs : []).forEach(function (s) { rows[s[0]] = s[1]; });
  rows["Status"] = item && item.status ? item.status.label : "";
  return rows;
}

// Bay strip: every rocket parked in its own numbered slot, drawn as a flat outline
function renderBay() {
  labBay.innerHTML = "";
  const onPad = state.labRocket;
  SIM_ROCKETS.forEach(function (key, i) {
    const allowed = rocketAllowed(key);
    const slot = document.createElement("button");
    slot.className = "bay-slot" + (onPad === key ? " active" : "") + (state.labCompare === key ? " compare" : "") + (allowed ? "" : " locked") + (state.rocket === key ? " chosen" : "");
    slot.title = rocketName(key) + (allowed ? "" : " (inspect only in Real Missions)") + " · click: roll onto the pad · Shift+click: compare";
    slot.innerHTML = '<span class="bay-num"></span><span class="bay-pic"></span><span class="bay-name"></span>';
    if (slot.querySelector) {
      slot.querySelector(".bay-num").textContent = "BAY " + (i + 1 < 10 ? "0" : "") + (i + 1);
      slot.querySelector(".bay-name").textContent = rocketName(key);
      setPicture(slot.querySelector(".bay-pic"), { type: "rocket", key: key });
    }
    slot.addEventListener("click", function (event) {
      if (event.shiftKey) state.labCompare = state.labCompare === key ? "" : key;
      else if (!chooseRocket(key)) {
        // stays on the pad for inspection only
      }
      play("select");
      render();
    });
    labBay.appendChild(slot);
  });
}

function bar(label, value, max, text, fictional) {
  const pct = Math.max(4, Math.min(100, (value / max) * 100));
  return '<div class="lab-stat' + (fictional ? " fictional" : "") + '"><span class="lab-stat-label">' + label + '</span>' +
    '<span class="lab-stat-bar"><i style="width:' + pct.toFixed(0) + '%"></i></span><b>' + text + "</b></div>";
}

function renderLab() {
  if (!lab) {
    lab = makeViewer(labCanvas);
    lab.garage = true;
    // Realistic reflections on metal and paint: a soft studio environment
    try {
      const pmrem = new THREE.PMREMGenerator(lab.renderer);
      lab.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      if ("environmentIntensity" in lab.scene) lab.scene.environmentIntensity = 0.6;
      lab.scene.background = new THREE.Color(0x14171d);
      lab.scene.fog = new THREE.Fog(0x14171d, 200, 900);
    } catch (error) {
      // reflections are optional
    }
    if (lab.renderer.shadowMap) lab.renderer.shadowMap.enabled = true;
    if (THREE.ACESFilmicToneMapping !== undefined) lab.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    lab.controls.autoRotateSpeed = 0.5;
  }
  const padKey = state.labRocket;
  renderBay();
  const rocketModel = createRocket(padKey);
  const item = findItem(padKey);
  const meters = Math.round(rocketModel.userData.height * 8);
  const parts = ROCKET_PARTS[padKey] || [];
  const craft = state.spacecraft ? SPACECRAFT[state.spacecraft] : null;
  labPlate.innerHTML = "<em>" + (state.mode === "sandbox" ? "Free Build" : "Real configuration") + "</em><b></b><span></span><i></i>";
  if (labPlate.querySelector) {
    labPlate.querySelector("b").textContent = rocketName(padKey);
    labPlate.querySelector("span").textContent = (item && item.status ? item.status.label + " · " : "") + (item ? item.mission : "");
    labPlate.querySelector("i").textContent = (craft ? "Payload: " + craft.name : "No spacecraft fitted") +
      (state.destination ? " · To: " + DESTINATIONS[state.destination].name : "") +
      (state.rocket === padKey ? "" : rocketAllowed(padKey) ? " · Click its bay to choose it" : " · Inspect only (Real Missions)");
  }
  const statLevels = getUpgrades();
  labStats.innerHTML =
    bar("Height (model)", meters, 112, meters + " m") +
    bar("Side boosters", rocketModel.userData.boosters.length, 9, String(rocketModel.userData.boosters.length)) +
    bar("Main parts", parts.length || (item && item.specs ? item.specs.length : 1), 4, String(parts.length || "—")) +
    (state.mode === "sandbox"
      ? bar("Thrust (fictional)", statLevels.thrust || 0, 3, "Level " + (statLevels.thrust || 0), true) +
        bar("Efficiency (fictional)", statLevels.efficiency || 0, 3, "Level " + (statLevels.efficiency || 0), true)
      : "");
  labCompare.value = state.labCompare;
  const look = state.mode === "sandbox" ? state.look : null;
  let craftModel = null;
  if (craft) {
    craftModel = createModel(craft.model);
    const box = new THREE.Box3().setFromObject(craftModel);
    const size = new THREE.Vector3();
    box.getSize(size);
    craftModel.scale.multiplyScalar(Math.max(3, rocketModel.userData.height * 0.4) / (Math.max(size.x, size.y, size.z) || 1)); // shown enlarged beside the rocket
  }
  fill(lab, [createRocket(padKey, look), craftModel, state.labCompare && state.labCompare !== padKey ? createRocket(state.labCompare) : null]);
  sizeViewer(lab);

  // Parts, as numbered component cards
  const partRows = parts.length ? parts : (item && item.specs ? item.specs : []);
  labParts.innerHTML = "";
  partRows.forEach(function (part, i) {
    const li = document.createElement("li");
    li.className = "part-card";
    li.innerHTML = '<span class="part-num"></span><strong></strong><span class="part-text"></span>';
    if (li.querySelector) {
      li.querySelector(".part-num").textContent = String(i + 1).padStart(2, "0");
      li.querySelector("strong").textContent = part[0];
      li.querySelector(".part-text").textContent = part[1];
    }
    labParts.appendChild(li);
  });

  // Comparison table
  const a = specsOf(padKey);
  const b = state.labCompare ? specsOf(state.labCompare) : null;
  const rows = Array.from(new Set(Object.keys(a).concat(b ? Object.keys(b) : [])));
  let html = "<thead><tr><th></th><th>" + rocketName(padKey) + "</th>" + (b ? "<th>" + rocketName(state.labCompare) + "</th>" : "") + "</tr></thead><tbody>";
  rows.forEach(function (row) {
    html += "<tr><th>" + row + "</th><td>" + (a[row] || "—") + "</td>" + (b ? "<td>" + (b[row] || "—") + "</td>" : "") + "</tr>";
  });
  labTable.innerHTML = html + "</tbody>";

  // Customization: sandbox only
  const sandbox = state.mode === "sandbox";
  labLock.textContent = sandbox
    ? "SANDBOX · FICTIONAL: paint and upgrades below are game changes, not real rocket specifications."
    : "Real Missions keeps every rocket exactly as it flew. Switch to Free Build to customize.";
  labLock.className = "lab-lock " + (sandbox ? "fictional" : "historical");
  labCustom.innerHTML = "";
  [["paint", "Body paint"], ["accent", "Band color"]].forEach(function (pair) {
    const row = document.createElement("div");
    row.className = "lab-row";
    const label = document.createElement("span");
    label.textContent = pair[1];
    row.appendChild(label);
    PAINTS.forEach(function (paint) {
      const swatch = document.createElement("button");
      swatch.className = "lab-swatch" + (state.look[pair[0]] === paint.value ? " active" : "");
      swatch.title = paint.name;
      swatch.disabled = !sandbox;
      swatch.style.setProperty("--swatch", paint.value === null ? "transparent" : "#" + paint.value.toString(16).padStart(6, "0"));
      swatch.textContent = paint.value === null ? "×" : "";
      swatch.addEventListener("click", function () {
        state.look[pair[0]] = paint.value;
        play("tick");
        render();
      });
      row.appendChild(swatch);
    });
    labCustom.appendChild(row);
  });

  labPoints.textContent = getPoints() + " upgrade point" + (getPoints() === 1 ? "" : "s") + " (earn one for each object you record while exploring)";
  labUpgrades.innerHTML = "";
  const levels = getUpgrades();
  UPGRADES.forEach(function (up) {
    const row = document.createElement("div");
    row.className = "lab-row";
    const label = document.createElement("span");
    label.textContent = up.name + " · level " + (levels[up.key] || 0) + "/3 · " + up.effect;
    row.appendChild(label);
    const button = document.createElement("button");
    button.className = "small-button";
    button.textContent = "Upgrade (fictional)";
    button.disabled = !sandbox || getPoints() < 1 || (levels[up.key] || 0) >= 3;
    button.addEventListener("click", function () {
      if (spendPoint(up.key)) { play("success"); render(); }
    });
    row.appendChild(button);
    labUpgrades.appendChild(row);
  });
}

onProgressChange(function () { if (state.step === "lab") renderLab(); });

// ----- Astronaut Simulation: the Suit Locker -----
const POSES = [["walk", "Walk"], ["lunar-hop", "Moon hop"], ["run", "Run"], ["float", "Zero-g float"], ["climb", "Ladder"], ["operate", "Controls"], ["collect", "Collect"], ["drive", "Drive"]];
const LOCKER_VEHICLES = [
  { key: "lrv", name: "Lunar Roving Vehicle", text: "210 kg, 3.1 m long, a motor in each wheel; front and rear steering. Apollo 15, 16 and 17." },
  { key: "perseverance", name: "Perseverance rover", text: "Drives slowly, turns in place, robotic arm and Mastcam-Z. Jezero Crater." },
  { key: "curiosity", name: "Curiosity rover", text: "Climbing Mount Sharp in Gale Crater." }
];

// Surface vehicles are machines, so they sit with the spacecraft (not with the suits)
let vehiclesBuilt = false;
function renderVehicles() {
  if (vehiclesBuilt) return;
  vehiclesBuilt = true;
  lockerVehicles.innerHTML = "";
  LOCKER_VEHICLES.forEach(function (v) {
    lockerVehicles.appendChild(card(v.name, "Surface vehicle", v.text, false, function () {
      play("select");
      showSimStep("explore");
    }, { picture: { type: "model", key: v.key } }));
  });
}

function renderLocker() {
  if (!locker) {
    locker = makeViewer(lockerCanvas);
    addTurntable(locker);
    locker.controls.autoRotateSpeed = 1.4;
  }
  // Suit lockers
  lockerSuits.innerHTML = "";
  Object.keys(SUITS).forEach(function (key) {
    const suit = SUITS[key];
    const door = document.createElement("button");
    door.className = "locker-door" + (state.suit === key ? " active" : "");
    door.innerHTML = '<span class="locker-pic"><img alt=""></span><span class="locker-label"></span><span class="locker-era"></span>';
    if (door.querySelector) {
      door.querySelector(".locker-label").textContent = suit.name;
      door.querySelector(".locker-era").textContent = suit.era;
      modelIcon({ type: "astronaut", key: key }, door.querySelector("img"));
    }
    door.addEventListener("click", function () {
      state.suit = key;
      state.suitSeen = true;
      play("open");
      renderLocker();
    });
    lockerSuits.appendChild(door);
  });

  // The astronaut on the turntable
  while (locker.holder.children.length) locker.holder.remove(locker.holder.children[0]);
  const astronaut = createSuitedAstronaut(state.suit);
  locker.holder.add(astronaut);
  locker.holder.position.x = 0;
  locker.astronaut = astronaut;
  locker.camera.position.set(3.4, 1.5, 4.8);
  locker.controls.target.set(0, 0.85, 0);
  locker.controls.update();
  sizeViewer(locker);

  // Animation buttons
  lockerPoses.innerHTML = "";
  POSES.forEach(function (pose) {
    const b = document.createElement("button");
    b.className = "small-button" + (state.pose === pose[0] ? " active" : "");
    b.textContent = pose[1];
    b.setAttribute("data-silent", "");
    b.addEventListener("click", function () {
      state.pose = pose[0];
      play("tick");
      renderLocker();
    });
    lockerPoses.appendChild(b);
  });

  // Facts about the suit and where it is worn
  const suit = SUITS[state.suit];
  lockerName.textContent = suit.name;
  const sites = Object.keys(SITES).filter(function (id) { return SITES[id].suit === state.suit; }).map(function (id) { return SITES[id].name; });
  factList(lockerFacts, [
    ["Era", suit.era],
    ["About the suit", suit.text],
    ["Worn at these sites", sites.length ? sites.join(", ") : "Free Build sites only"],
    ["Source", suit.sources.map(function (src) { return src.label; }).join(" · ")]
  ]);

  // Equipment rack and vehicle bay
  lockerEquipment.innerHTML = "";
  Object.keys(EQUIPMENT).forEach(function (key) {
    const eq = EQUIPMENT[key];
    const chip = document.createElement("span");
    chip.className = "rack-item";
    chip.title = eq.text;
    chip.innerHTML = '<b class="rack-pic"></b><span></span>';
    if (chip.querySelector) {
      setPicture(chip.querySelector("b"), { type: "equipment", key: key });
      chip.querySelector("span").textContent = eq.name;
    }
    lockerEquipment.appendChild(chip);
  });

  // Sandbox: wear this suit everywhere (fictional)
  lockerWear.disabled = state.mode !== "sandbox";
  lockerWear.checked = state.mode === "sandbox" && state.wearSuit;
  lockerWearNote.textContent = state.mode === "sandbox"
    ? "Free Build: wear the " + suit.name + " on every site. Any site where this suit was not really used is fictional."
    : "Real Missions: each site uses the suit really worn there. Switch to Free Build to try other suits.";
}

lockerWear.addEventListener("change", function () {
  state.wearSuit = lockerWear.checked;
  play(state.wearSuit ? "toggleOn" : "toggleOff");
});

// ----- Results after a mission -----
export function showResults(mission) {
  resultsBox.innerHTML = "";
  if (!mission) {
    resultsBox.classList.add("hidden");
    return;
  }
  const done = mission.objectives.filter(function (o) { return o.done; });
  const title = document.createElement("h3");
  title.textContent = "Mission report: " + mission.title;
  resultsBox.appendChild(title);
  const p = document.createElement("p");
  p.textContent = done.length + " of " + mission.objectives.length + " objectives complete" +
    (mission.discoveries.length ? " · Discoveries: " + mission.discoveries.join(", ") : "") +
    (mission.mode === "sandbox" ? " · Free Build mission (fictional elements labelled)" : " · Real mission");
  resultsBox.appendChild(p);
  const list = document.createElement("ul");
  mission.objectives.forEach(function (o) {
    const li = document.createElement("li");
    li.className = o.done ? "done" : "";
    li.textContent = (o.done ? "✓ " : "○ ") + o.text;
    list.appendChild(li);
  });
  resultsBox.appendChild(list);
  resultsBox.classList.remove("hidden");
}

// ----- Used by main.js -----
let started = false;

export function startSimulator() {
  if (!started) {
    started = true;
    setStep("lab");
    renderVehicles();
    showSimCoach(false);
  }
  if (lab) sizeViewer(lab);
  if (locker) sizeViewer(locker);
  if (loopId === null) loop();
}

export function stopSimulator() {
  if (loopId !== null) {
    cancelAnimationFrame(loopId);
    loopId = null;
  }
}

// Used by the tests: choose by keys without clicking
export function choose(rocket, spacecraft, destination) {
  state.rocket = rocket;
  state.spacecraft = spacecraft;
  state.destination = destination;
  if (rocket) state.labRocket = rocket;
  render();
  return missionConfig();
}

export function getSimState() { return state; }

export { TEMPLATES };
