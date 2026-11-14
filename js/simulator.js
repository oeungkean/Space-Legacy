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
import { loadNasaModel } from "./nasa-models.js";
import { hardwareList } from "../data/hardware.js";

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
  // The row of choices above the 3D bay was removed (the step tabs below already show them)
  if (!buildSheet) return;
  // The sheet is rebuilt on every change, so remember which slot had keyboard focus and restore it
  const focused = document.activeElement && buildSheet.contains && buildSheet.contains(document.activeElement)
    ? document.activeElement.getAttribute("data-slot") : null;
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
    // Each manifest slot opens its station, with the mouse or the keyboard (Tab, then Enter or Space)
    li.tabIndex = 0;
    li.setAttribute("data-slot", row[0]);
    li.setAttribute("role", "button");
    li.setAttribute("aria-label", row[1] + ": " + row[2] + (done ? " (chosen)" : "") + ". Open the " + row[1] + " station");
    li.addEventListener("click", function () { play("click"); setBayTab(row[0]); });
    li.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        play("click");
        setBayTab(row[0]);
      }
    });
    buildSheet.appendChild(li);
    if (focused === row[0] && li.focus) li.focus();
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
  modeButtons.forEach(function (button) {
    const on = button.dataset.simMode === state.mode;
    button.classList.toggle("active", on);
    if (button.setAttribute) button.setAttribute("aria-checked", on ? "true" : "false");
  });
  if (modeNote) modeNote.textContent = state.mode === "historical"
    ? "Only rockets, spacecraft and destinations that really flew together, as they flew."
    : "Combine any rocket, spacecraft and destination. Anything that never flew is labelled Fictional.";
  // Make the mode visible in the builder itself: a banner under the title, and a gold console in Free Build
  const simScreen = el("simulator-screen");
  if (simScreen) simScreen.classList.toggle("sim-free", state.mode === "sandbox");
  const banner = el("sim-mode-banner");
  if (banner) {
    const flyable = SIM_ROCKETS.filter(rocketAllowed).length;
    banner.innerHTML = "";
    const name = document.createElement("b");
    name.textContent = state.mode === "historical" ? "Real Missions" : "Free Build";
    const text = document.createElement("span");
    text.textContent = state.mode === "historical"
      ? "Only parts that really flew together. " + flyable + " of " + SIM_ROCKETS.length + " rockets can fly here."
      : "Mix anything. All " + SIM_ROCKETS.length + " rockets can fly; mixes that never flew are marked fictional.";
    banner.appendChild(name);
    banner.appendChild(text);
  }
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

// Wall cladding: light grey steel panels with vertical seams and a few darker stains
function wallPanelTexture() {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const ctx = c.getContext("2d");
  if (!ctx || !ctx.fillRect) return null;
  ctx.fillStyle = "#9aa1ab";
  ctx.fillRect(0, 0, 128, 128);
  for (let x = 0; x < 128; x += 16) {
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fillRect(x + 1, 0, 6, 128);
    ctx.fillStyle = "rgba(30,34,40,0.35)";
    ctx.fillRect(x + 14, 0, 2, 128);
  }
  ctx.fillStyle = "rgba(30,34,40,0.45)";
  ctx.fillRect(0, 126, 128, 2);
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = "rgba(40,44,50," + (Math.random() * 0.12).toFixed(2) + ")";
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 4 + Math.random() * 10);
  }
  const texture = new THREE.CanvasTexture(c);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}


// ----- Equipment for the two buildings (1 unit = 8 m) -----
function placeAround(roomR, box, angle, fraction) {
  const r = box * 1.25 + (roomR * 0.82 - box * 1.25) * fraction;
  return new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r);
}

// Real Missions: what fills a real assembly hall
function addAssemblyEquipment(g, roomR, box, wallH, size) {
  const white = new THREE.MeshStandardMaterial({ color: 0xe6e8ea, roughness: 0.55, metalness: 0.2 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x6b727c, roughness: 0.6, metalness: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2f343b, roughness: 0.7, metalness: 0.4 });
  const yellowPaint = new THREE.MeshStandardMaterial({ color: 0xe9a91c, roughness: 0.5, metalness: 0.2 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fc6ea, roughness: 0.1, metalness: 0.3, emissive: 0x1c3550, emissiveIntensity: 0.6 });
  // a spare rocket stage lying on its transport dolly (about 10 m wide, 40 m long)
  const stagePos = placeAround(roomR, box, 2.4, 0.35);
  const stage = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 5, 32), white);
  stage.rotation.z = Math.PI / 2;
  stage.position.set(stagePos.x, 1.0, stagePos.z);
  g.add(stage);
  [-1, 1].forEach(function (end) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.63, 0.04, 8, 32), dark);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(stagePos.x + end * 1.6, 1.0, stagePos.z);
    g.add(ring);
    const cradle = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 1.5), yellowPaint);
    cradle.position.set(stagePos.x + end * 1.9, 0.25, stagePos.z);
    g.add(cradle);
  });
  const dolly = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.12, 1.6), grey);
  dolly.position.set(stagePos.x, 0.06, stagePos.z);
  g.add(dolly);
  // a rocket engine on its stand (an F-1 is about 5.6 m tall)
  const enginePos = placeAround(roomR, box, 0.7, 0.45);
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.45, 0.75, 24, 1, true), dark);
  bell.position.set(enginePos.x, 0.62, enginePos.z);
  g.add(bell);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 1.1), yellowPaint);
  stand.position.set(enginePos.x, 0.11, enginePos.z);
  g.add(stand);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.3, 16), grey);
  top.position.set(enginePos.x, 1.12, enginePos.z);
  g.add(top);
  // a tall rolling scaffold tower
  const scaffoldPos = placeAround(roomR, box, 1.4, 0.2);
  const levels = Math.max(4, Math.round(wallH * 0.35 / 0.6));
  for (let i = 0; i < levels; i++) {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 1.2), grey);
    deck.position.set(scaffoldPos.x, 0.6 * (i + 1), scaffoldPos.z);
    g.add(deck);
  }
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6 * levels, 0.05), yellowPaint);
    post.position.set(scaffoldPos.x + c[0] * 0.58, 0.3 * levels, scaffoldPos.z + c[1] * 0.58);
    g.add(post);
  });
  // a control room with windows, up on the gallery level
  const roomPos = placeAround(roomR, box, 3.6, 1);
  const control = new THREE.Mesh(new THREE.BoxGeometry(4, 1.4, 1.6), white);
  control.position.set(roomPos.x, wallH * 0.22 + 0.7, roomPos.z);
  control.lookAt(0, control.position.y, 0);
  g.add(control);
  const windows = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.6), glass);
  windows.position.copy(control.position).add(new THREE.Vector3(-roomPos.x, 0, -roomPos.z).normalize().multiplyScalar(0.81));
  windows.position.y += 0.15;
  windows.lookAt(0, windows.position.y, 0);
  g.add(windows);
  // gas cylinder racks and a mobile crane
  const rackPos = placeAround(roomR, box, 4.5, 0.4);
  for (let i = 0; i < 8; i++) {
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 10), i % 2 ? grey : new THREE.MeshStandardMaterial({ color: 0x2f6fd6, roughness: 0.5 }));
    bottle.position.set(rackPos.x + (i % 4) * 0.09, 0.11, rackPos.z + Math.floor(i / 4) * 0.09);
    g.add(bottle);
  }
  const cranePos = placeAround(roomR, box, 5.4, 0.5);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.6), yellowPaint);
  body.position.set(cranePos.x, 0.3, cranePos.z);
  g.add(body);
  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.12), yellowPaint);
  boom.position.set(cranePos.x + 0.4, 1.5, cranePos.z);
  boom.rotation.z = -0.5;
  g.add(boom);
  [-1, 1].forEach(function (side) {
    const track = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.16, 0.16), dark);
    track.position.set(cranePos.x, 0.08, cranePos.z + side * 0.3);
    g.add(track);
  });
}

// Free Build: a fictional engineering lab (dark, with blueprint-cyan light)
function addLabEquipment(g, roomR, box, wallH, size) {
  const dark = new THREE.MeshStandardMaterial({ color: 0x232a35, roughness: 0.5, metalness: 0.6 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x8792a3, roughness: 0.35, metalness: 0.8 });
  const cyanGlow = new THREE.MeshBasicMaterial({ color: 0x56d4f0 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xf07a2a, roughness: 0.45, metalness: 0.3 });
  // a blueprint grid on the floor
  const gridLines = new THREE.PolarGridHelper(roomR * 0.94, 24, 10, 96, 0x56d4f0, 0x2b6f80);
  gridLines.position.y = 0.012;
  gridLines.material.transparent = true;
  gridLines.material.opacity = 0.35;
  g.add(gridLines);
  // glowing display walls with rocket outlines
  [0.9, 2.2, 4.1].forEach(function (angle) {
    const p = placeAround(roomR, box, angle, 1);
    const canvas = document.createElement("canvas");
    canvas.width = 256; canvas.height = 160;
    const ctx = canvas.getContext && canvas.getContext("2d");
    if (ctx && ctx.fillRect) {
      ctx.fillStyle = "#06202a"; ctx.fillRect(0, 0, 256, 160);
      ctx.strokeStyle = "rgba(86,212,240,0.35)"; ctx.lineWidth = 1;
      for (let x = 0; x < 256; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 160); ctx.stroke(); }
      for (let y = 0; y < 160; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke(); }
      ctx.strokeStyle = "#7fe6ff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(128, 18); ctx.lineTo(140, 40); ctx.lineTo(140, 130); ctx.lineTo(150, 145); ctx.lineTo(106, 145); ctx.lineTo(116, 130); ctx.lineTo(116, 40); ctx.closePath(); ctx.stroke();
      ctx.font = "12px monospace"; ctx.fillStyle = "#7fe6ff"; ctx.fillText("FREE BUILD - FICTIONAL", 8, 152);
    }
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.75), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, opacity: 0.92 }));
    screen.position.set(p.x, wallH * 0.3, p.z);
    screen.lookAt(0, screen.position.y, 0);
    g.add(screen);
  });
  // two big robot arms (fictional)
  [1.5, 5.0].forEach(function (angle) {
    const p = placeAround(roomR, box, angle, 0.25);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.3, 24), dark);
    base.position.set(p.x, 0.15, p.z);
    g.add(base);
    const arm = new THREE.Group();
    arm.position.set(p.x, 0.3, p.z);
    arm.rotation.y = -angle;
    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.4, 0.3), orange);
    lower.position.y = 1.2;
    lower.rotation.z = 0.35;
    arm.add(lower);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2, 0.24), orange);
    upper.position.set(-0.85, 2.6, 0);
    upper.rotation.z = 1.1;
    arm.add(upper);
    const tool = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), cyanGlow);
    tool.position.set(-1.8, 3.1, 0);
    arm.add(tool);
    g.add(arm);
  });
  // a large 3D-printer gantry frame with a part on its bed
  const printerPos = placeAround(roomR, box, 3.2, 0.35);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3, 0.12), steel);
    post.position.set(printerPos.x + c[0] * 1.4, 1.5, printerPos.z + c[1] * 1.4);
    g.add(post);
  });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.12, 0.2), steel);
  beam.position.set(printerPos.x, 2.6, printerPos.z);
  g.add(beam);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), cyanGlow);
  head.position.set(printerPos.x + 0.4, 2.35, printerPos.z);
  g.add(head);
  const part = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.9, 32, 1, true), steel);
  part.position.set(printerPos.x, 0.45, printerPos.z);
  g.add(part);
  // stage segments on assembly jigs
  const jigPos = placeAround(roomR, box, 0.2, 0.4);
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.2, 28), i === 1 ? orange : steel);
    seg.position.set(jigPos.x + (i - 1) * 1.5, 0.6, jigPos.z);
    g.add(seg);
    const ringLight = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.03, 8, 32), cyanGlow);
    ringLight.rotation.x = Math.PI / 2;
    ringLight.position.set(jigPos.x + (i - 1) * 1.5, 0.05, jigPos.z);
    g.add(ringLight);
  }
}

// ----- Free Build: the domed engineering lab (fictional) -----
// A round building: a ring wall, a ribbed dome with an opening at the top (an oculus) letting in daylight,
// two ring catwalks, a polar crane that turns on a rail around the room, and a round airlock-style door.
function hexTexture() {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 111;
  const ctx = c.getContext("2d");
  if (!ctx || !ctx.fillRect) return null;
  ctx.fillStyle = "#2a3442";
  ctx.fillRect(0, 0, 128, 111);
  ctx.strokeStyle = "rgba(140,200,230,0.22)";
  ctx.lineWidth = 2;
  const r = 128 / 6;
  for (let row = -1; row < 8; row++) {
    for (let col = -1; col < 3; col++) {
      const cx = col * r * 3 + (row % 2 ? r * 1.5 : 0);
      const cy = row * r * 0.866;
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(c);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildDomeLab(g, roomR, wallH, size, box) {
  const R = roomR;
  const ringH = wallH * 0.45;      // the straight ring wall
  const domeH = wallH * 0.55;      // the dome on top of it
  const person = 0.23;
  const wallMap = hexTexture();
  if (wallMap) wallMap.repeat.set(28, Math.max(2, ringH / 6));
  const domeMap = hexTexture();
  if (domeMap) domeMap.repeat.set(36, 10);
  const shell = new THREE.MeshStandardMaterial({ color: 0x8a9ab0, map: wallMap, roughness: 0.6, metalness: 0.35, side: THREE.BackSide });
  const domeMat = new THREE.MeshStandardMaterial({ color: 0x9fb0c8, map: domeMap, roughness: 0.7, metalness: 0.15, emissive: 0x1a2636, emissiveIntensity: 1, side: THREE.BackSide });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa6b6, roughness: 0.35, metalness: 0.8 });
  const white = new THREE.MeshStandardMaterial({ color: 0xdfe5ec, roughness: 0.5, metalness: 0.3 });
  const cyan = new THREE.MeshBasicMaterial({ color: 0x56d4f0 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xf07a2a, roughness: 0.45, metalness: 0.3 });

  const ring = new THREE.Mesh(new THREE.CylinderGeometry(R, R, ringH, 96, 1, true), shell);
  ring.position.y = ringH / 2;
  ring.receiveShadow = true;
  g.add(ring);
  // the dome, with an oculus (a round opening) at the top
  const oculusAngle = 0.13;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 32, 0, Math.PI * 2, oculusAngle, Math.PI / 2 - oculusAngle), domeMat);
  dome.scale.y = domeH / R;
  dome.position.y = ringH;
  g.add(dome);
  const sky = new THREE.Mesh(new THREE.CircleGeometry(R * Math.sin(oculusAngle) * 1.02, 48), new THREE.MeshBasicMaterial({ color: 0xcfe6ff }));
  sky.rotation.x = Math.PI / 2;
  sky.position.y = ringH + domeH * Math.cos(oculusAngle) + 0.05;
  g.add(sky);
  const oculusRim = new THREE.Mesh(new THREE.TorusGeometry(R * Math.sin(oculusAngle), size * 0.005, 8, 64), steel);
  oculusRim.rotation.x = Math.PI / 2;
  oculusRim.position.y = ringH + domeH * Math.cos(oculusAngle);
  g.add(oculusRim);
  // dome ribs (meridians) and rings, inside a group squashed to the dome's height
  const ribs = new THREE.Group();
  ribs.position.y = ringH;
  ribs.scale.y = domeH / R;
  for (let i = 0; i < 12; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(R * 0.985, size * 0.004, 6, 64, Math.PI), steel);
    rib.rotation.y = (i / 12) * Math.PI;
    ribs.add(rib);
  }
  [0.35, 0.7, 1.05].forEach(function (phi) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(R * 0.985 * Math.cos(phi), size * 0.003, 6, 96), steel);
    hoop.rotation.x = Math.PI / 2;
    hoop.position.y = R * 0.985 * Math.sin(phi);
    ribs.add(hoop);
  });
  g.add(ribs);
  // columns around the ring wall
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const col = new THREE.Mesh(new THREE.BoxGeometry(size * 0.012, ringH, size * 0.014), steel);
    col.position.set(Math.cos(a) * R * 0.99, ringH / 2, Math.sin(a) * R * 0.99);
    col.rotation.y = -a;
    g.add(col);
  }
  // light strips: one along the floor, one high on the ring wall
  [[0.25, 0.03], [ringH * 0.86, 0.02]].forEach(function (l) {
    const strip = new THREE.Mesh(new THREE.TorusGeometry(R * 0.975, Math.max(0.04, size * l[1] * 0.08), 6, 128), cyan);
    strip.rotation.x = Math.PI / 2;
    strip.position.y = l[0];
    g.add(strip);
  });
  // two ring catwalks with railings
  [0.42, 0.8].forEach(function (f) {
    const y = ringH * f;
    const walk = new THREE.Mesh(new THREE.RingGeometry(R * 0.93, R * 0.99, 96), new THREE.MeshStandardMaterial({ color: 0x5c6878, roughness: 0.6, metalness: 0.6, side: THREE.DoubleSide }));
    walk.rotation.x = -Math.PI / 2;
    walk.position.y = y;
    g.add(walk);
    const rail = new THREE.Mesh(new THREE.TorusGeometry(R * 0.93, size * 0.002 + 0.02, 6, 128), white);
    rail.rotation.x = Math.PI / 2;
    rail.position.y = y + person * 4.5;
    g.add(rail);
  });
  // a polar crane: a bridge across the room that runs on a round rail at the top of the ring wall
  const craneRail = new THREE.Mesh(new THREE.TorusGeometry(R * 0.9, size * 0.006, 8, 128), orange);
  craneRail.rotation.x = Math.PI / 2;
  craneRail.position.y = ringH * 0.97;
  g.add(craneRail);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(R * 1.8, size * 0.022, size * 0.03), orange);
  bridge.position.y = ringH * 0.95;
  bridge.rotation.y = 0.55;
  g.add(bridge);
  const trolley = new THREE.Mesh(new THREE.BoxGeometry(size * 0.04, size * 0.03, size * 0.05), white);
  trolley.position.set(Math.cos(0.55) * R * 0.35, ringH * 0.93, -Math.sin(0.55) * R * 0.35);
  trolley.rotation.y = 0.55;
  g.add(trolley);
  // a round airlock-style door at the back, with a lit frame
  const doorR = Math.min(ringH * 0.42, Math.max(box * 0.7, 6));
  const doorZ = -Math.sqrt(Math.max(0, R * R - doorR * doorR)) + 0.2;
  const door = new THREE.Mesh(new THREE.CircleGeometry(doorR, 64), new THREE.MeshStandardMaterial({ color: 0x46566a, roughness: 0.45, metalness: 0.7 }));
  door.position.set(0, doorR + 0.3, doorZ);
  g.add(door);
  const doorFrame = new THREE.Mesh(new THREE.TorusGeometry(doorR, size * 0.008, 8, 64), cyan);
  doorFrame.position.copy(door.position);
  doorFrame.position.z += 0.05;
  g.add(doorFrame);
  const split = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.004, doorR * 2), new THREE.MeshBasicMaterial({ color: 0x0c1118 }));
  split.position.copy(door.position);
  split.position.z += 0.06;
  g.add(split);
  // a lit sign above the door
  const signCanvas = document.createElement("canvas");
  signCanvas.width = 512; signCanvas.height = 96;
  const ctx = signCanvas.getContext && signCanvas.getContext("2d");
  if (ctx && ctx.fillRect) {
    ctx.fillStyle = "#061a22"; ctx.fillRect(0, 0, 512, 96);
    ctx.strokeStyle = "#56d4f0"; ctx.lineWidth = 4; ctx.strokeRect(4, 4, 504, 88);
    ctx.fillStyle = "#bff3ff"; ctx.font = "bold 40px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("FREE BUILD LAB", 256, 52);
    ctx.font = "18px sans-serif"; ctx.fillStyle = "#7fe6ff";
    ctx.fillText("Fictional designs: try any combination", 256, 80);
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(doorR * 1.8, doorR * 0.34), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas) }));
  sign.position.set(0, doorR * 2 + 0.3 + doorR * 0.3, doorZ + 0.1);
  g.add(sign);
}

// Small helper: add a box/cylinder mesh at a spot
function addMesh(g, geometry, material, x, y, z, rotationY) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  if (rotationY) mesh.rotation.y = rotationY;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}
// Equipment groups are drawn larger in bigger halls (the hall is sized to fit a rocket up to 110 m tall,
// so desks and carts at true size would be too small to see from the camera). Set in buildHangar.
let stationScale = 1;
// A group standing at an angle around the room, turned to face the middle
function station(g, roomR, box, angle, fraction) {
  const p = placeAround(roomR, box, angle, fraction);
  const group = new THREE.Group();
  group.position.copy(p);
  group.scale.setScalar(stationScale);
  group.rotation.y = -angle - Math.PI / 2;
  g.add(group);
  return group;
}
function screenTexture(lines, bg, fg) {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 80;
  const ctx = c.getContext && c.getContext("2d");
  if (!ctx || !ctx.fillRect) return null;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 128, 80);
  ctx.strokeStyle = fg; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= 128; x += 4) ctx.lineTo(x, 40 + Math.sin(x * 0.12 + lines) * 14 + Math.sin(x * 0.4) * 4);
  ctx.stroke();
  ctx.fillStyle = fg;
  for (let i = 0; i < 4; i++) ctx.fillRect(6, 6 + i * 7, 20 + ((i * 37 + lines * 13) % 60), 3);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Free Build lab: workbenches with screens, server racks, a holo table, drones, a tool wall, crates and pods
function addLabExtras(g, roomR, box, wallH, size) {
  const person = 0.23;
  const dark = new THREE.MeshStandardMaterial({ color: 0x232a35, roughness: 0.5, metalness: 0.6 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x8792a3, roughness: 0.35, metalness: 0.8 });
  const white = new THREE.MeshStandardMaterial({ color: 0xdfe5ec, roughness: 0.5, metalness: 0.2 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xf07a2a, roughness: 0.45, metalness: 0.3 });
  const cyan = new THREE.MeshBasicMaterial({ color: 0x56d4f0 });
  const green = new THREE.MeshBasicMaterial({ color: 0x6ff0a8 });
  const holo = new THREE.MeshBasicMaterial({ color: 0x7fe6ff, wireframe: true, transparent: true, opacity: 0.55 });
  // workbenches, each with two screens, a tool case and an engineer
  [0.55, 2.7, 3.75, 5.6, 1.95].forEach(function (angle, n) {
    const s = station(g, roomR, box, angle, 0.72);
    for (let k = -1; k <= 1; k += 2) {
      const bx = k * 0.75;
      addMesh(s, new THREE.BoxGeometry(1.2, 0.03, 0.4), white, bx, person * 0.42, 0);
      [[-0.55, -0.17], [0.55, -0.17], [-0.55, 0.17], [0.55, 0.17]].forEach(function (l) {
        addMesh(s, new THREE.BoxGeometry(0.03, person * 0.42, 0.03), steel, bx + l[0], person * 0.21, l[1]);
      });
      [-0.25, 0.25].forEach(function (sx, i) {
        const tex = screenTexture(n * 3 + i + k, "#061a22", i ? "#6ff0a8" : "#56d4f0");
        addMesh(s, new THREE.BoxGeometry(0.32, 0.2, 0.02), dark, bx + sx, person * 0.42 + 0.14, -0.12);
        const face = new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.17), new THREE.MeshBasicMaterial({ map: tex, color: tex ? 0xffffff : 0x56d4f0 }));
        face.position.set(bx + sx, person * 0.42 + 0.14, -0.105);
        s.add(face);
      });
      addMesh(s, new THREE.BoxGeometry(0.22, 0.08, 0.14), orange, bx + 0.42, person * 0.42 + 0.055, 0.06);
    }
  });
  // server racks with blinking-light strips
  [1.2, 4.6].forEach(function (angle) {
    const s = station(g, roomR, box, angle, 0.95);
    for (let i = 0; i < 6; i++) {
      const x = (i - 2.5) * 0.24;
      addMesh(s, new THREE.BoxGeometry(0.22, person * 1.1, 0.3), dark, x, person * 0.55, 0);
      for (let j = 0; j < 6; j++) {
        const led = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.012, 0.005), (i + j) % 3 ? cyan : green);
        led.position.set(x, 0.04 + j * person * 0.17, 0.152);
        s.add(led);
      }
    }
  });
  // a holo table showing a wireframe planet
  const ht = station(g, roomR, box, 2.35, 0.3);
  addMesh(ht, new THREE.CylinderGeometry(0.6, 0.7, person * 0.45, 40), dark, 0, person * 0.225, 0);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.01, 40), new THREE.MeshBasicMaterial({ color: 0x1b6a80 }));
  top.position.y = person * 0.45 + 0.005;
  ht.add(top);
  const planet = new THREE.Mesh(new THREE.SphereGeometry(0.4, 18, 12), holo);
  planet.position.y = person * 0.45 + 0.6;
  ht.add(planet);
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.006, 4, 64), cyan);
  orbit.position.y = planet.position.y;
  orbit.rotation.x = 1.25;
  ht.add(orbit);
  // test drones hovering over the floor
  [[0.1, 0.5, 1.6], [2.55, 0.55, 2.4], [4.35, 0.45, 1.2], [5.3, 0.65, 3.0]].forEach(function (d) {
    const p = placeAround(roomR, box, d[0], d[1]);
    const drone = new THREE.Group();
    drone.position.set(p.x, d[2] * stationScale, p.z);
    drone.scale.setScalar(stationScale);
    addMesh(drone, new THREE.BoxGeometry(0.16, 0.05, 0.16), white, 0, 0, 0);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
      addMesh(drone, new THREE.BoxGeometry(0.16, 0.012, 0.02), dark, c[0] * 0.08, 0, c[1] * 0.08, Math.PI / 4 * c[0] * c[1]);
      const rotor = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.006, 4, 20), cyan);
      rotor.rotation.x = Math.PI / 2;
      rotor.position.set(c[0] * 0.13, 0.015, c[1] * 0.13);
      drone.add(rotor);
    });
    g.add(drone);
  });
  // a tool wall (pegboard with tools) against the ring wall
  const tw = station(g, roomR, box, 5.95, 1.08);
  addMesh(tw, new THREE.BoxGeometry(3, person * 2.2, 0.05), dark, 0, person * 1.3, 0);
  for (let i = 0; i < 14; i++) {
    const x = -1.35 + (i % 7) * 0.45;
    const y = person * 0.6 + Math.floor(i / 7) * person * 0.9 + 0.1;
    addMesh(tw, new THREE.BoxGeometry(0.05, person * (0.4 + (i % 3) * 0.15), 0.03), i % 4 ? steel : orange, x, y, 0.05);
  }
  addMesh(tw, new THREE.BoxGeometry(1.2, person * 0.5, 0.35), new THREE.MeshStandardMaterial({ color: 0xb8432a, roughness: 0.5 }), -0.8, person * 0.25, 0.3);
  // stacks of crates and a pallet
  const cr = station(g, roomR, box, 1.0, 0.55);
  [[0, 0, 0], [0.32, 0, 0], [0.16, 1, 0], [0, 0, 0.32], [0.7, 0, 0.1]].forEach(function (c, i) {
    addMesh(cr, new THREE.BoxGeometry(0.3, 0.22, 0.3), i % 2 ? orange : steel, c[0], 0.11 + c[1] * 0.22 + 0.04, c[2]);
  });
  addMesh(cr, new THREE.BoxGeometry(1.0, 0.04, 0.7), new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 0.9 }), 0.35, 0.02, 0.16);
  // charging pods for the test rovers
  const pods = station(g, roomR, box, 3.45, 0.78);
  for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * 0.7;
    addMesh(pods, new THREE.CylinderGeometry(0.28, 0.3, 0.05, 32), dark, x, 0.025, 0);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.01, 6, 32), i === 1 ? green : cyan);
    halo.rotation.x = Math.PI / 2;
    halo.position.set(x, 0.06, 0);
    pods.add(halo);
    // a small test rover on each pod
    addMesh(pods, new THREE.BoxGeometry(0.3, 0.08, 0.2), white, x, 0.14, 0);
    [[-0.12, -0.11], [0.12, -0.11], [-0.12, 0.11], [0.12, 0.11]].forEach(function (w) {
      const wheel = addMesh(pods, new THREE.CylinderGeometry(0.045, 0.045, 0.03, 12), dark, x + w[0], 0.075, w[1]);
      wheel.rotation.x = Math.PI / 2;
    });
    addMesh(pods, new THREE.BoxGeometry(0.02, 0.12, 0.02), steel, x + 0.1, 0.24, 0);
  }
}

// Real Missions hall: more of what fills a real assembly building (forklift, tow tractor with carts,
// rolling stairs, engineers' desks, pallets, safety barriers and tool chests)
function addAssemblyExtras(g, roomR, box, wallH, size) {
  const person = 0.23;
  const yellowPaint = new THREE.MeshStandardMaterial({ color: 0xe9a91c, roughness: 0.5, metalness: 0.2 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x6b727c, roughness: 0.6, metalness: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2f343b, roughness: 0.7, metalness: 0.4 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe6e8ea, roughness: 0.55, metalness: 0.2 });
  const red = new THREE.MeshStandardMaterial({ color: 0xb8322a, roughness: 0.5, metalness: 0.3 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 0.9 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x2f5fa8, roughness: 0.55, metalness: 0.2 });
  // a forklift carrying a crate
  const fl = station(g, roomR, box, 0.25, 0.55);
  addMesh(fl, new THREE.BoxGeometry(0.42, 0.16, 0.26), yellowPaint, 0, 0.12, 0);
  addMesh(fl, new THREE.BoxGeometry(0.2, 0.2, 0.24), dark, -0.08, 0.3, 0);
  [-0.12, 0.12].forEach(function (z) { addMesh(fl, new THREE.BoxGeometry(0.02, 0.45, 0.02), dark, 0.22, 0.24, z); });
  [-0.07, 0.07].forEach(function (z) { addMesh(fl, new THREE.BoxGeometry(0.26, 0.01, 0.03), grey, 0.36, 0.05, z); });
  addMesh(fl, new THREE.BoxGeometry(0.24, 0.16, 0.22), wood, 0.36, 0.14, 0);
  [[-0.14, -0.13], [0.14, -0.13], [-0.14, 0.13], [0.14, 0.13]].forEach(function (w) {
    const wheel = addMesh(fl, new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), dark, w[0], 0.05, w[1]);
    wheel.rotation.x = Math.PI / 2;
  });
  // a tow tractor pulling three flat carts with hardware boxes
  const tt = station(g, roomR, box, 1.85, 0.62);
  addMesh(tt, new THREE.BoxGeometry(0.34, 0.14, 0.22), white, 0, 0.1, 0);
  addMesh(tt, new THREE.BoxGeometry(0.14, 0.12, 0.2), blue, -0.06, 0.23, 0);
  for (let i = 0; i < 3; i++) {
    const x = -0.45 - i * 0.5;
    addMesh(tt, new THREE.BoxGeometry(0.42, 0.03, 0.24), grey, x, 0.06, 0);
    addMesh(tt, new THREE.BoxGeometry(0.3, 0.14 + (i % 2) * 0.06, 0.18), i === 1 ? white : blue, x, 0.15 + (i % 2) * 0.03, 0);
  }
  // rolling stairs (like the ones beside a spacecraft)
  [[1.05, 0.3], [4.9, 0.28]].forEach(function (pos) {
    const st = station(g, roomR, box, pos[0], pos[1]);
    for (let i = 0; i < 8; i++) addMesh(st, new THREE.BoxGeometry(0.2, 0.02, 0.3), grey, i * 0.07, 0.05 + i * 0.06, 0);
    addMesh(st, new THREE.BoxGeometry(0.3, 0.02, 0.34), grey, 0.62, 0.53, 0);
    [-0.16, 0.16].forEach(function (z) {
      const rail = addMesh(st, new THREE.BoxGeometry(0.75, 0.015, 0.015), yellowPaint, 0.27, 0.42, z);
      rail.rotation.z = 0.7;
      addMesh(st, new THREE.BoxGeometry(0.02, 0.55, 0.02), yellowPaint, 0.75, 0.28, z);
    });
  });
  // engineers' desks with monitors, in a row (a work area on the floor)
  const desks = station(g, roomR, box, 3.25, 0.82);
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 0.5;
    addMesh(desks, new THREE.BoxGeometry(0.42, 0.02, 0.22), white, x, person * 0.33, 0);
    addMesh(desks, new THREE.BoxGeometry(0.4, person * 0.32, 0.02), grey, x, person * 0.16, -0.1);
    const tex = screenTexture(i, "#0b1624", "#9fc6ea");
    addMesh(desks, new THREE.BoxGeometry(0.16, 0.1, 0.01), dark, x, person * 0.33 + 0.07, -0.06);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.09), new THREE.MeshBasicMaterial({ map: tex, color: tex ? 0xffffff : 0x9fc6ea }));
    face.position.set(x, person * 0.33 + 0.07, -0.054);
    desks.add(face);
    // a chair at each desk
    addMesh(desks, new THREE.BoxGeometry(0.1, 0.02, 0.1), dark, x, person * 0.2, 0.14);
    addMesh(desks, new THREE.BoxGeometry(0.1, 0.1, 0.02), dark, x, person * 0.2 + 0.05, 0.19);
  }
  // pallets of supplies
  const pal = station(g, roomR, box, 5.95, 0.6);
  [0, 0.45, 0.9].forEach(function (x, i) {
    addMesh(pal, new THREE.BoxGeometry(0.4, 0.03, 0.4), wood, x, 0.015, 0);
    addMesh(pal, new THREE.BoxGeometry(0.34, 0.12 + i * 0.05, 0.34), i === 1 ? white : grey, x, 0.03 + (0.12 + i * 0.05) / 2, 0);
  });
  // tool chests
  const tc = station(g, roomR, box, 2.95, 0.45);
  [0, 0.3].forEach(function (x) {
    addMesh(tc, new THREE.BoxGeometry(0.26, 0.2, 0.14), red, x, 0.1, 0);
    for (let k = 0; k < 4; k++) addMesh(tc, new THREE.BoxGeometry(0.22, 0.006, 0.005), grey, x, 0.04 + k * 0.045, 0.072);
  });
  // safety barriers (yellow and black posts with a chain) around the pad's work area
  const postMat = new THREE.MeshStandardMaterial({ color: 0xf2b01e, roughness: 0.5 });
  const chainMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });
  const n = 20;
  const r = box * 1.1;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    if (Math.abs(Math.sin(a)) > 0.92 && Math.cos(a) < 0.5 && Math.sin(a) < 0) continue; // gap toward the door
    addMesh(g, new THREE.CylinderGeometry(0.025 * stationScale, 0.03 * stationScale, 0.14 * stationScale, 8), postMat, Math.cos(a) * r, 0.07 * stationScale, Math.sin(a) * r);
    const b = ((i + 1) / n) * Math.PI * 2;
    const ax = Math.cos(a) * r, az = Math.sin(a) * r, bx = Math.cos(b) * r, bz = Math.sin(b) * r;
    const len = Math.hypot(bx - ax, bz - az);
    const chain = addMesh(g, new THREE.BoxGeometry(len, 0.012 * stationScale, 0.012 * stationScale), chainMat, (ax + bx) / 2, 0.12 * stationScale, (az + bz) / 2);
    chain.rotation.y = -Math.atan2(bz - az, bx - ax);
  }
}

// ----- Pictures and achievements on the walls of the Real Missions hall -----
// Three NASA photos (the local copies credited in data/hardware.js, with their credit under each one) and
// a row of plaques, one for each real mission in this project (name and year from data/simulator.js).
function plaqueTexture(title, line, sub) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 320;
  const ctx = c.getContext && c.getContext("2d");
  if (!ctx || !ctx.fillRect) return null;
  const grad = ctx.createLinearGradient(0, 0, 0, 320);
  grad.addColorStop(0, "#1b2a4a"); grad.addColorStop(1, "#0e1628");
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 320);
  ctx.strokeStyle = "#c9a54a"; ctx.lineWidth = 8; ctx.strokeRect(8, 8, 240, 304);
  ctx.lineWidth = 2; ctx.strokeRect(20, 20, 216, 280);
  // a simple star-and-orbit emblem (not any agency's logo)
  ctx.strokeStyle = "#e9d28a"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(128, 100, 58, 22, -0.35, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#e9d28a";
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k / 10) * Math.PI * 2;
    const rr = k % 2 ? 11 : 26;
    ctx.lineTo(128 + Math.cos(a) * rr, 100 + Math.sin(a) * rr);
  }
  ctx.fill();
  ctx.textAlign = "center";
  ctx.fillStyle = "#f4e7bd";
  let size = 30;
  ctx.font = "bold " + size + "px sans-serif";
  while (ctx.measureText(title).width > 210 && size > 14) { size -= 2; ctx.font = "bold " + size + "px sans-serif"; }
  ctx.fillText(title, 128, 190);
  ctx.font = "bold 40px sans-serif";
  ctx.fillStyle = "#e9d28a";
  ctx.fillText(line, 128, 240);
  ctx.font = "18px sans-serif";
  ctx.fillStyle = "#c9d4e6";
  ctx.fillText(sub, 128, 278);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function captionTexture(text, sub) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 96;
  const ctx = c.getContext && c.getContext("2d");
  if (!ctx || !ctx.fillRect) return null;
  ctx.fillStyle = "#f2f0ea"; ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = "#1c2230"; ctx.font = "bold 28px sans-serif"; ctx.textAlign = "center";
  ctx.fillText(text, 256, 40);
  ctx.font = "17px sans-serif"; ctx.fillStyle = "#4a5263";
  let size = 17;
  while (ctx.measureText(sub).width > 490 && size > 10) { size -= 1; ctx.font = size + "px sans-serif"; }
  ctx.fillText(sub, 256, 74);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// Puts a flat thing on a wall: wall = [x, z, rotation] (facing into the room), along = position along it
function onWall(g, mesh, wall, along, y, inset) {
  const ax = Math.cos(wall[2]), az = -Math.sin(wall[2]);
  const nx = Math.sin(wall[2]), nz = Math.cos(wall[2]);
  mesh.position.set(wall[0] + ax * along + nx * inset, y, wall[1] + az * along + nz * inset);
  mesh.rotation.y = wall[2];
  g.add(mesh);
}
function addWallGallery(g, roomR, wallH, size) {
  const inset = size * 0.024;
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.5, metalness: 0.5 });
  const front = [0, roomR, Math.PI];
  const left = [-roomR, 0, Math.PI / 2];
  const right = [roomR, 0, -Math.PI / 2];
  // Laid out from the floor up: credit cards, then the photos, then a banner over them
  const photoH = size * 0.1;
  const labelH = photoH * 0.27;
  const labelY = Math.max(1.4, wallH * 0.07) + labelH / 2;
  const photoY = labelY + labelH / 2 + photoH * 0.6;
  const bannerW = size * 0.5;
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(bannerW, bannerW * 0.1), new THREE.MeshBasicMaterial({ map: captionTexture("MISSIONS THAT REALLY FLEW", "Photos: NASA, NASA/JPL-Caltech/MSSS. Plaques: the real missions in Space Legacy."), color: 0xffffff }));
  onWall(g, banner, front, 0, photoY + photoH * 0.6 + bannerW * 0.07, inset);
  // the three photos, with a frame and a credit card under each
  const loader = new THREE.TextureLoader();
  hardwareList.slice(0, 3).forEach(function (h, i) {
    if (!h.image || !h.image.src) return;
    const along = (i - 1) * size * 0.17;
    const y = photoY;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(photoH * 1.42, photoH * 1.1, size * 0.004), frameMat);
    onWall(g, frame, front, along, y, inset);
    const photoMat = new THREE.MeshBasicMaterial({ color: 0x3a4250 });
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(photoH * 1.33, photoH), photoMat);
    onWall(g, photo, front, along, y, inset + size * 0.0025);
    // the photo loads in the background; if it fails, the frame stays with a plain grey picture
    loader.load(h.image.src, function (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      photoMat.map = texture;
      photoMat.color.set(0xffffff);
      photoMat.needsUpdate = true;
    }, undefined, function () {});
    const label = new THREE.Mesh(new THREE.PlaneGeometry(photoH * 1.42, labelH), new THREE.MeshBasicMaterial({ map: captionTexture(h.breadcrumbName || h.mission, h.image.credit), color: 0xffffff }));
    onWall(g, label, front, along, labelY, inset);
  });
  // achievement plaques: one per real mission, along both side walls under the first gallery
  const missions = TEMPLATES.filter(function (t) { return !t.hidden && t.name; });
  const perSide = Math.ceil(missions.length / 2);
  const spacing = (size * 0.84) / perSide;
  const plaqueH = Math.min(wallH * 0.16, (spacing * 0.86) / 0.8);
  missions.forEach(function (t, i) {
    const wall = i < perSide ? left : right;
    const k = i < perSide ? i : i - perSide;
    const along = (k - (perSide - 1) / 2) * spacing;
    const dest = DESTINATIONS[t.destination];
    const tex = plaqueTexture(t.name, String(t.year), dest ? dest.name : "");
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(plaqueH * 0.8, plaqueH), new THREE.MeshStandardMaterial({ map: tex, color: tex ? 0xffffff : 0x1b2a4a, roughness: 0.45, metalness: 0.2 }));
    onWall(g, plaque, wall, along, wallH * 0.12, inset + size * 0.006);
  });
}

// ----- The Agena Target Vehicle exhibit (an official NASA 3D model) -----
// Model: NASA 3D Resources, https://science.nasa.gov/3d-resources/agena-target-vehicle/
// Fact on the plaque: https://www.nasa.gov/mission/gemini-viii/ (first docking in space, March 16, 1966)
function addAgenaExhibit(g, roomR, box, size) {
  const ex = station(g, roomR, box, 3.95, 0.5);
  ex.scale.setScalar(Math.min(stationScale, 2)); // enlarged a little, not as much as the equipment
  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x2b3038, roughness: 0.4, metalness: 0.6 });
  addMesh(ex, new THREE.CylinderGeometry(1.3, 1.4, 0.12, 48), plinthMat, 0, 0.06, 0);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.015, 6, 64), new THREE.MeshBasicMaterial({ color: 0xffd28a }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.121;
  ex.add(rim);
  // stand-in shape until NASA's model arrives (and the fallback if it can't be loaded)
  const standIn = new THREE.Group();
  addMesh(standIn, new THREE.CylinderGeometry(0.1, 0.1, 0.8, 24), new THREE.MeshStandardMaterial({ color: 0xd8d8d0, roughness: 0.5 }), 0, 0, 0).rotation.z = Math.PI / 2;
  addMesh(standIn, new THREE.CylinderGeometry(0.05, 0.1, 0.16, 24), new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.5 }), 0.48, 0, 0).rotation.z = -Math.PI / 2;
  standIn.position.y = 1.0;
  ex.add(standIn);
  // a display column it rests on (it is shown raised, at eye level)
  addMesh(ex, new THREE.CylinderGeometry(0.06, 0.09, 0.75, 16), plinthMat, 0, 0.47, 0);
  const lamp = new THREE.SpotLight(0xfff1d6, 3, 0, 0.5, 0.6);
  lamp.position.set(0, 3.2, 1.2);
  lamp.target.position.set(0, 1.0, 0);
  ex.add(lamp);
  ex.add(lamp.target);
  loadNasaModel("agena").then(function (model) {
    if (!model) return;
    const measured = new THREE.Box3().setFromObject(model);
    const dims = measured.getSize(new THREE.Vector3());
    const scale = 1.6 / Math.max(dims.x, dims.y, dims.z, 1e-6);
    model.scale.setScalar(scale);
    const centre = measured.getCenter(new THREE.Vector3()).multiplyScalar(scale);
    model.position.set(-centre.x, 1.0 - centre.y, -centre.z);
    model.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    standIn.visible = false;
    ex.add(model);
  });
  // the exhibit's sign
  const c = document.createElement("canvas");
  c.width = 512; c.height = 200;
  const ctx = c.getContext && c.getContext("2d");
  if (ctx && ctx.fillRect) {
    ctx.fillStyle = "#f2f0ea"; ctx.fillRect(0, 0, 512, 200);
    ctx.fillStyle = "#1c2230"; ctx.font = "bold 34px sans-serif";
    ctx.fillText("Agena Target Vehicle", 20, 46);
    ctx.font = "20px sans-serif"; ctx.fillStyle = "#353c4a";
    ctx.fillText("The docking target for the Gemini program.", 20, 86);
    ctx.fillText("Gemini VIII docked with an Agena on March 16, 1966:", 20, 116);
    ctx.fillText("the first docking of two spacecraft in orbit.", 20, 142);
    ctx.font = "16px sans-serif"; ctx.fillStyle = "#6a7282";
    ctx.fillText("Official NASA 3D model (NASA 3D Resources), shown enlarged", 20, 182);
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.35), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) }));
  sign.position.set(0, 0.32, 1.42);
  sign.rotation.x = -0.5;
  ex.add(sign);
  addMesh(ex, new THREE.BoxGeometry(0.04, 0.3, 0.04), plinthMat, 0, 0.15, 1.38);
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
  // Two different buildings: Real Missions = a light-grey assembly hall like the ones NASA used;
  // Free Build = a dark engineering lab with blueprint-cyan light (fictional)
  const freeBuild = state.mode === "sandbox";
  if (viewer.hangar) viewer.scene.remove(viewer.hangar);
  const g = new THREE.Group();
  // The camera circles at about 1.15 x (1.9 x the biggest size + 2): the room is wider than that
  const cameraRadius = (Math.max(tallest, width) * 1.9 + 2) * 1.15;
  const size = Math.max(cameraRadius * 2.7, tallest * 2.6, width * 2.4, 48);
  const person = 0.23;
  const steel = new THREE.MeshStandardMaterial({ color: 0x5d6470, roughness: 0.45, metalness: 0.75 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x2b3038, roughness: 0.5, metalness: 0.7 });
  const yellowPaint = new THREE.MeshStandardMaterial({ color: 0xf2b01e, roughness: 0.5, metalness: 0.2 });
  const skirtMat = new THREE.MeshStandardMaterial({ color: 0x3a414c, roughness: 0.8, metalness: 0.3 });

  // Floor: polished concrete (a little shiny) with painted lines
  const floorMap = concreteTexture();
  if (floorMap) floorMap.repeat.set(size / 10, size / 10);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ color: freeBuild ? 0x3a4250 : 0x8e939b, map: floorMap, roughness: freeBuild ? 0.4 : 0.62, metalness: freeBuild ? 0.2 : 0.05 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);
  const yellow = new THREE.MeshBasicMaterial({ color: freeBuild ? 0x56d4f0 : 0xffb020 });
  const lineW = Math.max(0.08, size * 0.003);
  const box = Math.max(width * 0.75, tallest * 0.45, 10);
  if (!freeBuild) [[0, box, box * 2, lineW], [0, -box, box * 2, lineW]].forEach(function (l) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(l[2], l[3]), yellow);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(l[0], 0.01, l[1]);
    g.add(strip);
  });
  if (!freeBuild) [-box, box].forEach(function (x) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(lineW, box * 2), yellow);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(x, 0.01, 0);
    g.add(strip);
  });

  // Mobile launch platform: stands on the floor, and the rocket and payload stand on its top deck
  // (fill() lifts them to deckHeight()). It is long enough for everything on the pad.
  const mlpW = Math.max(width * 0.7, tallest * 0.22, 4);
  const deckH = deckHeight(tallest);
  const mlpL = Math.max(mlpW * 1.6, width + 3);
  const mlp = freeBuild
    ? new THREE.Mesh(new THREE.CylinderGeometry(mlpL / 2, mlpL / 2 * 1.04, deckH, 72), new THREE.MeshStandardMaterial({ color: 0x2a3340, roughness: 0.35, metalness: 0.7 }))
    : new THREE.Mesh(new THREE.BoxGeometry(mlpL, deckH, mlpW), darkSteel);
  mlp.position.y = deckH / 2;
  if (freeBuild) {
    // the turntable's glowing edge and a ring of markers on its top
    const edge = new THREE.Mesh(new THREE.TorusGeometry(mlpL / 2, Math.max(0.03, size * 0.0012), 8, 96), new THREE.MeshBasicMaterial({ color: 0x56d4f0 }));
    edge.rotation.x = Math.PI / 2;
    edge.position.y = deckH + 0.01;
    g.add(edge);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const tick = new THREE.Mesh(new THREE.BoxGeometry(mlpL * 0.04, 0.01, 0.04), new THREE.MeshBasicMaterial({ color: i % 6 ? 0x2b6f80 : 0x7fe6ff }));
      tick.position.set(Math.cos(a) * mlpL * 0.46, deckH + 0.006, Math.sin(a) * mlpL * 0.46);
      tick.rotation.y = -a;
      g.add(tick);
    }
  }
  mlp.castShadow = true;
  mlp.receiveShadow = true;
  g.add(mlp);

  // The building: a closed high bay (four walls and a roof) big enough that the camera always stays
  // inside it, like a game garage. Before, there was one wall and the camera circled outside the room.
  const roomR = size / 2;
  const wallH = Math.max(tallest * 1.6 + 4, deckH + tallest * 0.45 + roomR * 0.9);
  // Real Missions: the rectangular high bay. Free Build: a round, domed engineering lab (buildDomeLab).
  if (!freeBuild) {
    const wallZ = -roomR;
    const panelMap = wallPanelTexture();
    const wallMat = new THREE.MeshStandardMaterial({ color: freeBuild ? 0x3b4656 : 0xa9afb8, map: panelMap, roughness: 0.7, metalness: 0.35 });
    if (panelMap) panelMap.repeat.set(size / 6, wallH / 12);
    // [x, z, rotation]: back, front, left, right, each facing into the room
    const walls = [[0, -roomR, 0], [0, roomR, Math.PI], [-roomR, 0, Math.PI / 2], [roomR, 0, -Math.PI / 2]];
    walls.forEach(function (w) {
      const nx = Math.sin(w[2]);   // the wall's inward direction
      const nz = Math.cos(w[2]);
      const ax = Math.cos(w[2]);   // along the wall
      const az = -Math.sin(w[2]);
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(size, wallH), wallMat);
      wall.position.set(w[0], wallH / 2, w[1]);
      wall.rotation.y = w[2];
      wall.receiveShadow = true;
      g.add(wall);
      // tall steel columns along each wall
      const ribs = 12;
      for (let i = 0; i <= ribs; i++) {
        const along = -roomR + (size / ribs) * i;
        const rib = new THREE.Mesh(new THREE.BoxGeometry(size * 0.012, wallH, size * 0.014), steel);
        rib.position.set(w[0] + ax * along + nx * size * 0.007, wallH / 2, w[1] + az * along + nz * size * 0.007);
        rib.rotation.y = w[2];
        g.add(rib);
      }
      // a band of high windows with daylight behind them
      const band = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.92, wallH * 0.045), new THREE.MeshBasicMaterial({ color: 0xbcd4f5 }));
      band.position.set(w[0] + nx * size * 0.016, wallH * 0.93, w[1] + nz * size * 0.016);
      band.rotation.y = w[2];
      g.add(band);
      // a dark skirting band low on the wall (scuffed paint, cable trays)
      const skirt = new THREE.Mesh(new THREE.PlaneGeometry(size, Math.max(1.2, wallH * 0.06)), skirtMat);
      skirt.position.set(w[0] + nx * 0.05, Math.max(0.6, wallH * 0.03), w[1] + nz * 0.05);
      skirt.rotation.y = w[2];
      g.add(skirt);
    });

    // The high bay door in the back wall: tall stacked panels, with a thin line of daylight at its edges
    const doorW = Math.max(width * 1.3, tallest * 0.55, 8);
    const doorH = Math.min(wallH * 0.86, tallest * 1.35 + 3);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x8c96a6, roughness: 0.5, metalness: 0.55 });
    const door = new THREE.Mesh(new THREE.PlaneGeometry(doorW, doorH), doorMat);
    door.position.set(0, doorH / 2, wallZ + size * 0.02);
    g.add(door);
    for (let i = 1; i < 12; i++) {
      const seam = new THREE.Mesh(new THREE.PlaneGeometry(doorW, doorH * 0.006), darkSteel);
      seam.position.set(0, (doorH / 12) * i, wallZ + size * 0.021);
      g.add(seam);
    }
    const daylightMat = new THREE.MeshBasicMaterial({ color: 0xeaf2ff });
    [-1, 1].forEach(function (side) {
      const gap = new THREE.Mesh(new THREE.PlaneGeometry(doorW * 0.008, doorH), daylightMat);
      gap.position.set(side * doorW / 2, doorH / 2, wallZ + size * 0.022);
      g.add(gap);
    });
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW * 1.08, doorH * 0.04, size * 0.03), yellowPaint);
    lintel.position.set(0, doorH * 1.02, wallZ + size * 0.02);
    g.add(lintel);
    // Crawler tracks on the floor, leading from the pad to the door
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x5a5f67, roughness: 0.9 });
    [-1, 1].forEach(function (side) {
      const track = new THREE.Mesh(new THREE.PlaneGeometry(doorW * 0.16, roomR), trackMat);
      track.rotation.x = -Math.PI / 2;
      track.position.set(side * doorW * 0.28, 0.006, -roomR / 2);
      track.receiveShadow = true;
      g.add(track);
    });

    // Work galleries along the side walls: three levels of catwalks with yellow railings and lamps
    const galleryMat = new THREE.MeshStandardMaterial({ color: 0x6d7581, roughness: 0.6, metalness: 0.6 });
    const galleryDepth = Math.max(1.2, size * 0.03);
    const galleryLampMat = new THREE.MeshBasicMaterial({ color: 0xfff0d6 });
    [-1, 1].forEach(function (side) {
      [0.22, 0.42, 0.62].forEach(function (f) {
        const y = wallH * f;
        const walk = new THREE.Mesh(new THREE.BoxGeometry(galleryDepth, size * 0.006 + 0.08, size * 0.86), galleryMat);
        walk.position.set(side * (roomR - galleryDepth / 2), y, 0);
        walk.receiveShadow = true;
        g.add(walk);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(size * 0.004 + 0.03, size * 0.004 + 0.03, size * 0.86), yellowPaint);
        rail.position.set(side * (roomR - galleryDepth), y + person * 4.5, 0);
        g.add(rail);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, size * 0.7), galleryLampMat);
        lamp.position.set(side * (roomR - galleryDepth * 0.5), y - 0.15, 0);
        g.add(lamp);
      });
    });

    // Roof: a dark ceiling with a steel truss grid, rows of high bay lamps, and a bridge crane on rails
    const roofY = wallH;
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ color: 0x23272e, roughness: 0.9, metalness: 0.2 }));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = roofY;
    g.add(ceiling);
    for (let i = -4; i <= 4; i++) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.016, size * 0.012), steel);
      beam.position.set(0, roofY - size * 0.012, i * size * 0.11);
      g.add(beam);
      const cross = new THREE.Mesh(new THREE.BoxGeometry(size * 0.012, size * 0.012, size), darkSteel);
      cross.position.set(i * size * 0.11, roofY - size * 0.026, 0);
      g.add(cross);
    }
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff6e4 });
    const lampGeo = new THREE.CylinderGeometry(size * 0.012, size * 0.016, size * 0.008, 12);
    for (let i = -3; i <= 3; i++) {
      for (let j = -3; j <= 3; j++) {
        const lamp = new THREE.Mesh(lampGeo, lampMat);
        lamp.position.set(i * size * 0.13, roofY - size * 0.04, j * size * 0.13);
        g.add(lamp);
      }
    }
    [-1, 1].forEach(function (side) {
      const railBeam = new THREE.Mesh(new THREE.BoxGeometry(size * 0.02, size * 0.02, size), yellowPaint);
      railBeam.position.set(side * roomR * 0.7, roofY - size * 0.06, 0);
      g.add(railBeam);
    });
    const crane = new THREE.Mesh(new THREE.BoxGeometry(roomR * 1.4, size * 0.03, size * 0.035), yellowPaint);
    crane.position.set(0, roofY - size * 0.08, -box * 0.5);
    g.add(crane);
    const hookLength = Math.max(1, roofY - size * 0.08 - (deckH + tallest * 1.1));
    const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, hookLength, 6), darkSteel);
    hook.position.set(box * 0.3, roofY - size * 0.08 - hookLength / 2, -box * 0.5);
    g.add(hook);
  } else {
    buildDomeLab(g, roomR, wallH, size, box);
  }

  // Service tower (red lattice) with an access arm, beside the pad
  const towerMat = new THREE.MeshStandardMaterial({ color: freeBuild ? 0xd9e0e8 : 0xb8432a, roughness: 0.55, metalness: 0.55 });
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

  // Work platforms around the rocket: rings with railings at several heights. They are sized and
  // centred on the rocket itself (not on the whole row), so they hug it even with a payload beside it.
  const padX = viewer.padX || 0;
  const padW = viewer.padW || width;
  const padH = viewer.padH || tallest;
  const ringR = Math.max(padW * 0.5 + 0.25, 1.2);
  [0.25, 0.5, 0.72].forEach(function (f) {
    const y = deckH + padH * f;
    const deck = new THREE.Mesh(new THREE.RingGeometry(ringR, ringR * 1.45, 40, 1, 0.6, Math.PI * 1.2), new THREE.MeshStandardMaterial({ color: 0x7a828e, roughness: 0.6, metalness: 0.6, side: THREE.DoubleSide }));
    deck.rotation.x = -Math.PI / 2;
    deck.position.set(padX, y, 0);
    deck.receiveShadow = true;
    g.add(deck);
    const rail = new THREE.Mesh(new THREE.TorusGeometry(ringR * 1.45, size * 0.0015 + 0.01, 4, 40, Math.PI * 1.2), yellowPaint);
    rail.rotation.x = -Math.PI / 2;
    rail.rotation.z = 0.6;
    rail.position.set(padX, y + person * 0.55, 0);
    g.add(rail);
    const w = worker(person, 0x2f6fd6);
    w.position.set(padX + Math.cos(1.3) * ringR * 1.22, y, -Math.sin(1.3) * ringR * 1.22);
    g.add(w);
  });

  // Big equipment around the hall (sized for a hall that holds a 110 m rocket, so it can be seen)
  stationScale = Math.min(4, Math.max(1.5, size * 0.035));
  if (freeBuild) {
    addLabEquipment(g, roomR, box, wallH, size);
    addLabExtras(g, roomR, box, wallH, size);
  } else {
    addAssemblyEquipment(g, roomR, box, wallH, size);
    addAssemblyExtras(g, roomR, box, wallH, size);
    addWallGallery(g, roomR, wallH, size);
    addAgenaExhibit(g, roomR, box, size);
  }

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

  // Lights: soft light from the roof lamps and the windows, warm lamps around the hall,
  // and a spotlight on the rocket (with shadows)
  g.add(new THREE.HemisphereLight(freeBuild ? 0xbfe9ff : 0xe4ecff, 0x40444c, freeBuild ? 0.45 : 0.55)); // softer (it was too bright)
  const daylight = new THREE.DirectionalLight(0xdfe9ff, 0.8);
  daylight.position.set(size * 0.2, wallH, size * 0.4);
  g.add(daylight);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
    const lamp = new THREE.PointLight(freeBuild ? 0x9fe6ff : 0xffe7c4, 0.9, size * 1.1, 1.2);
    lamp.position.set(c[0] * roomR * 0.55, wallH * 0.75, c[1] * roomR * 0.55);
    g.add(lamp);
  });
  const spot = new THREE.SpotLight(0xfff0d8, 2.4, 0, 0.5, 0.55);
  spot.position.set(size * 0.1, wallH * 0.95, size * 0.25);
  spot.castShadow = true;
  if (spot.shadow && spot.shadow.mapSize) spot.shadow.mapSize.set(1024, 1024);
  g.add(spot);
  if (spot.target) {
    spot.target.position.set(padX, deckH + padH * 0.3, 0);
    g.add(spot.target);
  }
  // The camera stays inside the building: it can't zoom out through a wall or drop under the floor
  const controls = viewer.controls;
  controls.maxDistance = roomR * 0.82;
  controls.minDistance = Math.max(1.5, tallest * 0.2);
  controls.maxPolarAngle = Math.PI * 0.49;
  if (viewer.scene.fog) {
    viewer.scene.fog.near = roomR * 1.2;
    viewer.scene.fog.far = roomR * 5;
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

// The height of the mobile launch platform's top deck, which everything on the pad stands on.
function deckHeight(tallest) {
  return tallest * 0.04 + 0.3;
}

// Lines the objects up side by side and rests each one on the surface. The models are not all built
// with their origin at their base (spacecraft are centred on their middle, rocket nozzles hang a little
// below 0), so each object is placed from its measured bounding box: its lowest point touches the deck
// and its left edge starts where the previous object ended.
function fill(viewer, objects) {
  while (viewer.holder.children.length) viewer.holder.remove(viewer.holder.children[0]);
  let x = 0;
  let right = 0;
  let tallest = 1;
  let firstWidth = null;
  objects.forEach(function (object) {
    if (!object) return;
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);
    object.position.x += x - box.min.x;
    object.position.y -= box.min.y;
    object.position.z -= (box.min.z + box.max.z) / 2;
    object.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    viewer.holder.add(object);
    right = x + size.x;
    x = right + Math.max(2, size.y * 0.15);
    tallest = Math.max(tallest, size.y);
    if (firstWidth === null) { firstWidth = size.x; viewer.padH = size.y; }
  });
  viewer.padW = firstWidth || 0;
  const deck = viewer.garage ? deckHeight(tallest) : 0;
  viewer.holder.position.set(-right / 2, deck, 0);
  // The work platforms ring the first object (the rocket), wherever it ends up after centring
  viewer.padX = -right / 2 + (firstWidth || 0) / 2;
  if (viewer.garage) buildHangar(viewer, tallest, right);
  let distance = Math.max(tallest, right) * 1.9 + 2;
  if (viewer.garage && viewer.controls.maxDistance < Infinity) distance = Math.min(distance, viewer.controls.maxDistance / 1.15);
  viewer.camera.position.set(distance * 0.55, deck + tallest * 0.6, distance);
  viewer.controls.target.set(0, deck + tallest * 0.45, 0);
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
      if ("environmentIntensity" in lab.scene) lab.scene.environmentIntensity = 0.45;
      lab.scene.background = new THREE.Color(0x2a2f37);
      lab.scene.fog = new THREE.Fog(0x2a2f37, 200, 900);
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
  // Stand the boots on the turntable (the model's soles sit a few centimetres below its origin)
  astronaut.updateMatrixWorld(true);
  astronaut.position.y -= new THREE.Box3().setFromObject(astronaut).min.y;
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
