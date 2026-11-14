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
import { createEquipment } from "./equipment-models.js";
import { createSuitedAstronaut } from "./astronaut.js";
import { modelIcon } from "./explorer.js";
import { destinationIcon, planetPicture, uiIcon } from "./icons.js";
import { findItem } from "../data/catalog.js";
import {
  SPACECRAFT, DESTINATIONS, TEMPLATES, SIM_ROCKETS, ROCKET_PARTS, SITES, EQUIPMENT, SUITS, templatesFor
} from "../data/simulator.js";
import { buildObjectives, getPoints, getUpgrades, spendPoint, onProgressChange } from "./progress.js";
import { play } from "./sounds.js";
import { loadNasaModel, nasaUsableInScene, upgradeToNasaModel, nasaModelInfo } from "./nasa-models.js";
import { hardwareList } from "../data/hardware.js";

const el = function (id) { return document.getElementById(id); };
const stepButtons = document.querySelectorAll ? document.querySelectorAll("[data-sim-step]") : [];
const modeButtons = document.querySelectorAll ? document.querySelectorAll("[data-sim-mode]") : [];
// Pages in the sidebar
// One place: the Mission Builder. (Older names "locker" and "explore" open the Suit and Destination steps.)
const panels = { lab: el("sim-step-lab") };
// Steps of the builder, in order, plus the optional Workshop
const BAY_TABS = ["rocket", "spacecraft", "suit", "destination", "workshop", "review"];
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
const siteList = el("sim-site-list");      // (removed from the page in Master Doc 14; kept optional)
const exploreNote = el("sim-explore-note");
const rocketInfo = el("sim-rocket-info");
const craftList = el("sim-craft-list");
const destList = el("sim-dest-list");
const reviewObjectives = el("sim-objectives");
const launchButton = el("sim-launch");
const modeNote = el("sim-mode-note");
const labCanvas = el("lab-canvas");
const wsAccessories = el("ws-accessories");
const wsName = el("ws-name");
const wsPatch = el("ws-patch");
const patchPreview = el("sim-patch-preview");
const objectivesTitle = el("sim-objectives-title");
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
  // Master Doc 14
  vehicle: null,        // a surface vehicle that rides along: "lrv", "curiosity" or "perseverance"
  site: null,           // the landing site chosen in the Destination step ("none" = orbit or fly by)
  lockerTool: null,     // a hand tool shown on the turntable instead of the astronaut
  workshopSeen: false,
  missionName: "",
  patch: { shape: "circle", color: "#2f5fb8" }
};
state.look.acc = { fins: false, stripe: false, camera: false, flag: false };
state.look.finColor = null;
state.look.stripeColor = null;

// Spacecraft that carry people get the Suit step
function crewed() {
  return Boolean(state.spacecraft && SPACECRAFT[state.spacecraft] && SPACECRAFT[state.spacecraft].type === "crewed");
}
const ROVERS = { curiosity: true, perseverance: true };

// The spacecraft that counts for "did this really fly": a rover delivered by the sky crane flew as that
// rover's own mission (MSL, Mars 2020)
function effectiveCraft() {
  if (state.spacecraft === "skycrane" && state.vehicle && ROVERS[state.vehicle]) return state.vehicle;
  return state.spacecraft;
}
// The real mission that used this exact rocket, spacecraft, destination and site (Apollo 11, 15 and 17
// all flew Saturn V + Apollo to the Moon, each to its own site)
function realTemplateAt(siteId) {
  return templatesFor({ rocket: state.rocket, spacecraft: effectiveCraft(), destination: state.destination })
    .find(function (t) { return (t.site || null) === (siteId || null); }) || null;
}

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
  // where NASA's 3D Resources has the model, the picture switches to it and is labelled (Master Doc 14)
  modelIcon(spec, img, function () {
    if (!frame.querySelector || frame.querySelector(".nasa-tag")) return;
    const tag = document.createElement("span");
    tag.className = "nasa-tag";
    tag.textContent = "NASA";
    tag.title = "Official NASA 3D model";
    frame.appendChild(tag);
  });
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
  const rocketModel = createRocket(key);
  // Only what is needed to choose (Master Doc 14): name, size, side boosters, what it flew, status
  const specs = item && item.specs ? item.specs.slice(0, 2).map(function (sp) { return sp[0] + ": " + sp[1]; }).join(" \u00B7 ") : "";
  factList(rocketInfo, [
    ["On the pad", rocketName(key) + (state.rocket === key ? " (chosen)" : "")],
    ["Size", specs || ("About " + Math.round(rocketModel.userData.height * 8) + " m tall")],
    ["Side boosters", String(rocketModel.userData.boosters.length)],
    ["Flew", missions.length ? missions.map(function (t) { return t.name; }).join(", ") : (item && item.mission) || "Free Build only"],
    ["Status", item && item.status ? item.status.label : ""]
  ]);
}

// ----- Step 2: spacecraft -----
function renderSpacecraft() {
  craftList.innerHTML = "";
  if (!state.rocket) {
    craftList.innerHTML = '<p class="sim-empty">Roll a rocket onto the pad first (step 01).</p>';
    return;
  }
  Object.keys(SPACECRAFT).forEach(function (key) {
    const craft = SPACECRAFT[key];
    if (craft.type === "rover") return; // rovers are surface vehicles now (Master Doc 14)
    const historical = key === "skycrane" ? state.rocket === "atlas-v-541" : templatesFor({ rocket: state.rocket, spacecraft: key }).length > 0;
    if (state.mode === "historical" && !historical) return;
    const launchers = key === "skycrane" ? ["Atlas V 541"] : Array.from(new Set(templatesFor({ spacecraft: key }).map(function (t) { return rocketName(t.rocket); })));
    craftList.appendChild(card(craft.name,
      historical ? "Historically launched on " + rocketName(state.rocket) : "FICTIONAL combination (Free Build)",
      (craft.type === "crewed" ? "Carries astronauts \u00B7 " : "") + "Real launch vehicles: " + (launchers.join(", ") || "none in this simulator"),
      state.spacecraft === key,
      function () {
        if (state.spacecraft !== key) {
          state.spacecraft = key;
          state.destination = null;
          state.site = null;
        }
        play("select");
        render(); // only marks it chosen: the button moves on
      }, { fictional: !historical, picture: craftPicture(key) }));
  });
}

// ----- Step 3: destination -----
// First only the worlds; after one is clicked, only that world's landing sites (Master Doc 14), plus
// "Orbit or fly by". Choosing a site only marks it; the button then leads to the Workshop.
const SITE_WORLD = { moon: "moon", mars: "mars", "earth-orbit": "orbit" };

function sitesFor(destination) {
  const world = SITE_WORLD[destination];
  if (!world) return [];
  return Object.keys(SITES).filter(function (id) {
    const site = SITES[id];
    if (site.world !== world) return false;
    if (state.mode !== "sandbox" && site.fictional) return false;
    if (crewed()) return Boolean(site.suit);                                     // people land where people walk
    if (state.vehicle && ROVERS[state.vehicle]) return site.vehicle === "rover"; // a rover drives at a rover site
    return false;                                                                // other robots: orbit or fly by
  });
}

// Is this the site the real mission used?
function realSite(id) {
  return Boolean(realTemplateAt(id));
}

function renderDestinations() {
  destList.innerHTML = "";
  if (!state.spacecraft) {
    destList.innerHTML = '<p class="sim-empty">Fit a spacecraft first (step 02).</p>';
    return;
  }
  if (!state.destination) {
    const grid = document.createElement("div");
    grid.className = "sim-grid";
    Object.keys(DESTINATIONS).forEach(function (key) {
      const d = DESTINATIONS[key];
      const historical = isHistoricalCombo(state.rocket, effectiveCraft(), key);
      if (state.mode === "historical" && !historical) return;
      const template = templatesFor({ rocket: state.rocket, spacecraft: effectiveCraft(), destination: key })[0];
      grid.appendChild(card(d.name,
        historical ? "Real mission: " + template.name + " (" + template.year + ")" : "FICTIONAL destination for this spacecraft",
        "Travel time: " + d.travel,
        false,
        function () {
          state.destination = key;
          state.site = null;
          play("select");
          render();
        }, { fictional: !historical, picture: PLANET_PICTURE[key], icon: PLANET_PICTURE[key] ? null : planetPicture(key) }));
    });
    destList.appendChild(grid);
    return;
  }
  const d = DESTINATIONS[state.destination];
  const head = document.createElement("div");
  head.className = "dest-head";
  const back = document.createElement("button");
  back.type = "button";
  back.className = "small-button dest-back";
  back.textContent = "\u2190 All destinations";
  back.addEventListener("click", function () {
    state.destination = null;
    state.site = null;
    play("click");
    render();
  });
  const title = document.createElement("h4");
  title.className = "sim-sub sim-sub-big";
  title.textContent = d.name + ": choose where to go";
  head.appendChild(back);
  head.appendChild(title);
  destList.appendChild(head);
  const grid = document.createElement("div");
  grid.className = "sim-grid";
  sitesFor(state.destination).forEach(function (id) {
    const site = SITES[id];
    const suitKey = crewed() && state.suitSeen ? state.suit : site.suit;
    const suit = suitKey ? SUITS[suitKey] : null;
    const real = realSite(id) && (!crewed() || !state.suitSeen || state.suit === site.suit);
    const how = site.vehicle === "lrv" ? "Lunar Roving Vehicle" : site.vehicle === "rover" ? "Drive the rover" : site.start === "eva" ? "Spacewalk" : site.start === "cockpit" ? "Spacecraft controls" : "On foot";
    grid.appendChild(card(site.name,
      real ? "Real site of " + site.mission : (site.fictional ? "FICTIONAL site" : site.mission + " \u00B7 FICTIONAL for this build"),
      (suit ? "Suit: " + suit.name : "Robotic") + " \u00B7 " + how,
      state.site === id,
      function () {
        state.site = id;
        play("select");
        render();
      }, { fictional: !real, picture: sitePicture(site) }));
  });
  const lander = SPACECRAFT[state.spacecraft].type === "lander";
  grid.appendChild(card(lander ? "No surface walk" : "Orbit or fly by",
    "No landing site to explore",
    lander ? "The replay follows the spacecraft to " + d.name + "; there is no surface exploration." : "The trip ends in orbit or with a flyby of " + d.name + ".",
    state.site === "none",
    function () {
      state.site = "none";
      play("select");
      render();
    }, { picture: PLANET_PICTURE[state.destination], icon: PLANET_PICTURE[state.destination] ? null : planetPicture(state.destination) }));
  destList.appendChild(grid);
}

// ----- Launch step -----
function ready() {
  return Boolean(state.rocket && state.spacecraft && state.destination && state.site);
}

function missionConfig() {
  const craft = SPACECRAFT[state.spacecraft];
  if (state.mode === "historical") {
    const t = historicalTemplate();
    return { mode: "historical", fictional: false, rocket: state.rocket, spacecraft: state.spacecraft, destination: state.destination,
      template: t, siteId: t ? t.site : null, crew: t ? t.crew : craft.crew, title: t ? t.name : "Mission", look: null, upgrades: null };
  }
  // Free Build: the site chosen in the Destination step, the suit chosen in the Suit step (crews only),
  // the rover chosen as a surface vehicle. Real only if all of it matches a real mission.
  const siteId = state.site && state.site !== "none" ? state.site : null;
  const template = realTemplateAt(siteId);
  const site = siteId ? SITES[siteId] : null;
  const suit = crewed() && state.suitSeen ? state.suit : null;
  const siteMatches = Boolean(template);
  const suitMatches = !site || !site.suit || !suit || suit === site.suit;
  const vehicleMatches = !state.vehicle || (ROVERS[state.vehicle] ? state.spacecraft === "skycrane" : Boolean(site && site.vehicle === state.vehicle));
  const fictional = !(template && siteMatches && suitMatches && vehicleMatches);
  const name = (state.missionName || "").trim();
  return {
    mode: state.mode,
    fictional: fictional,
    rocket: state.rocket,
    spacecraft: effectiveCraft(),
    carrier: state.spacecraft,
    vehicle: state.vehicle,
    destination: state.destination,
    template: null,
    siteId: siteId,
    suit: site && site.suit ? suit : null,
    crew: craft.crew,
    title: name || (fictional ? "Free Build mission (fictional)" : "Free Build mission"),
    missionName: name,
    patch: { shape: state.patch.shape, color: state.patch.color },
    look: state.look,
    upgrades: getUpgrades()
  };
}

function renderReview() {
  reviewObjectives.innerHTML = "";
  if (!ready()) {
    const li = document.createElement("li");
    li.className = "sim-empty";
    li.textContent = "Choose a rocket, a spacecraft, a destination and a landing site (or Orbit or fly by) first.";
    reviewObjectives.appendChild(li);
    launchButton.disabled = true;
    if (objectivesTitle) objectivesTitle.textContent = "Mission objectives";
    if (patchPreview) patchPreview.innerHTML = "";
    return;
  }
  const config = missionConfig();
  const site = config.siteId ? SITES[config.siteId] : null;
  // only the mission's three objectives and the launch button (Master Doc 14)
  buildObjectives(config, site).forEach(function (o) {
    const li = document.createElement("li");
    li.textContent = o.text;
    reviewObjectives.appendChild(li);
  });
  if (objectivesTitle) objectivesTitle.textContent = config.missionName ? config.missionName + ": objectives" : "Mission objectives";
  if (patchPreview) patchPreview.innerHTML = patchSvg(state.patch, config.missionName);
  launchButton.disabled = false;
}

launchButton.addEventListener("click", function () {
  if (!ready()) return;
  play("ignition");
  document.dispatchEvent(new CustomEvent("sim-launch", { detail: missionConfig() }));
});

// ----- Pages and stations -----
// Old step names (rocket, spacecraft, destination, review) open that step inside the builder.
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
  if (tab === "suit" && !crewed()) tab = "destination"; // uncrewed: no suit step
  state.bayTab = tab;
  if (tab === "workshop") state.workshopSeen = true;
  render();
  showBayExtras();
  const bar = bayPanesTop();
  if (bar && bar.scrollIntoView) bar.scrollIntoView({ block: "nearest" });
}
function bayPanesTop() { return document.querySelector ? document.querySelector(".build-progress") : null; }

// The Suit step shows the locker (with its 3D turntable)
function showBayExtras() {
  if (state.bayTab === "suit") {
    state.suitSeen = true;
    renderLocker();
    requestAnimationFrame(function () { if (locker) sizeViewer(locker); });
    render();
  }
  if (state.bayTab === "spacecraft") renderVehicles();
}

// The progress bar keeps its icons but is not clickable (Master Doc 14): the buttons move you on
bayTabButtons.forEach(function (item) {
  if (item.querySelector) {
    const icon = item.querySelector("[data-ui-icon]");
    if (icon) icon.innerHTML = uiIcon(icon.getAttribute ? icon.getAttribute("data-ui-icon") : icon.dataset.uiIcon);
  }
});

// The steps in order (the Suit step only for spacecraft that carry people)
function visibleSteps() {
  return BAY_TABS.filter(function (tab) { return tab !== "suit" || crewed(); });
}
function stepDone(tab) {
  if (tab === "rocket") return Boolean(state.rocket);
  if (tab === "spacecraft") return Boolean(state.spacecraft);
  if (tab === "suit") return Boolean(state.suitSeen);
  if (tab === "destination") return Boolean(state.destination && state.site);
  if (tab === "workshop") return Boolean(state.workshopSeen);
  return false;
}

// The one "next" button (bottom-right, in the same place on every step): what it says and where it goes
function nextStation() {
  const tab = state.bayTab;
  if (tab === "rocket") return state.rocket ? ["spacecraft", "Pick a spacecraft"] : null;
  if (tab === "spacecraft") return state.spacecraft ? (crewed() ? ["suit", "Pick a suit"] : ["destination", "Pick a destination"]) : null;
  if (tab === "suit") return ["destination", "Pick a destination"];
  if (tab === "destination") return state.destination && state.site ? ["workshop", "Go to Workshop"] : null;
  if (tab === "workshop") return ["review", "Go to launch"];
  return null;
}

bayNext.addEventListener("click", function () {
  const next = nextStation();
  if (!next) return;
  play("click");
  setBayTab(next[0]);
});

// Back one step (the progress bar itself is not clickable)
const bayBack = document.createElement("button");
bayBack.type = "button";
bayBack.className = "small-button bay-back hidden";
bayBack.textContent = "\u2190 Back";
bayBack.addEventListener("click", function () {
  const steps = visibleSteps();
  const i = steps.indexOf(state.bayTab);
  if (i <= 0) return;
  play("click");
  setBayTab(steps[i - 1]);
});
if (bayNext.parentNode && bayNext.parentNode.insertBefore) bayNext.parentNode.insertBefore(bayBack, bayNext);

// (the build sheet over the 3D bay was removed earlier; kept as a no-op for safety)
function renderBuildSheet() {}

function renderBayChrome() {
  if (state.bayTab === "suit" && !crewed()) state.bayTab = "destination";
  const steps = visibleSteps();
  const current = steps.indexOf(state.bayTab);
  bayTabButtons.forEach(function (item) {
    const tab = item.dataset.bayTab;
    const shown = steps.indexOf(tab) !== -1;
    item.classList.toggle("hidden", !shown);
    item.classList.toggle("active", tab === state.bayTab);
    item.classList.toggle("done", shown && stepDone(tab) && tab !== state.bayTab);
    if (item.setAttribute) item.setAttribute("aria-current", tab === state.bayTab ? "step" : "false");
    const number = item.querySelector ? item.querySelector("em") : null;
    if (number && shown) number.textContent = String(steps.indexOf(tab) + 1).padStart(2, "0");
  });
  // the bar fills up to the current step
  progressBar.style.width = (steps.length > 1 ? Math.max(0, current) / (steps.length - 1) * 100 : 0) + "%";
  if (progressText) progressText.textContent = state.bayTab ? "Current step: " + state.bayTab : "";
  bayPanes.forEach(function (pane) {
    pane.classList.toggle("hidden", pane.dataset.bayPane !== state.bayTab);
  });
  const next = nextStation();
  bayNext.classList.toggle("hidden", !next);
  if (next) bayNext.textContent = next[1] + " \u2192";
  bayBack.classList.toggle("hidden", current <= 0);
}

export function showSimStep(step) {
  setStep(step);
}

// ----- Astronaut: explore a site directly (no launch needed) -----
const WORLD_GROUPS = [["moon", "The Moon"], ["mars", "Mars"], ["orbit", "Earth orbit"]];

function renderSites() {
  if (!siteList) return; // (the "go straight to the surface" list left the builder in Master Doc 14)
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
          const wear = null;
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

// ----- Organized work areas (Master Doc 8) -----
// Everything stands in neat, labeled areas, the way a real assembly building is run: nothing is left
// lying around the rocket. Each area has painted lines on the floor, a floor label and a sign.
function floorLabel(g, text, x, z, width, color) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 96;
  const ctx = c.getContext && c.getContext("2d");
  if (!ctx || !ctx.fillText) return;
  ctx.fillStyle = color || "rgba(255, 196, 40, 0.92)";
  ctx.font = "bold 50px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 50);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 96 / 512), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  label.rotation.x = -Math.PI / 2;
  label.position.set(x, 0.02, z);
  g.add(label);
}
function zoneOutline(g, cx, cz, w, d, color, lineW) {
  const mat = new THREE.MeshBasicMaterial({ color: color });
  [-1, 1].forEach(function (s) {
    const across = new THREE.Mesh(new THREE.PlaneGeometry(w, lineW), mat);
    across.rotation.x = -Math.PI / 2;
    across.position.set(cx, 0.012, cz + s * d / 2);
    g.add(across);
    const along = new THREE.Mesh(new THREE.PlaneGeometry(lineW, d), mat);
    along.rotation.x = -Math.PI / 2;
    along.position.set(cx + s * w / 2, 0.012, cz);
    g.add(along);
  });
}
function signTexture(title, sub, accent) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 128;
  const ctx = c.getContext && c.getContext("2d");
  if (!ctx || !ctx.fillRect) return null;
  ctx.fillStyle = "#1b212b"; ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = accent; ctx.fillRect(0, 0, 14, 128);
  // shrink the text until it fits the sign
  let big = 44;
  ctx.font = "bold " + big + "px sans-serif";
  while (ctx.measureText(title).width > 460 && big > 20) { big -= 2; ctx.font = "bold " + big + "px sans-serif"; }
  ctx.fillStyle = "#f3f5f8";
  ctx.fillText(title, 34, 58);
  let small = 24;
  ctx.font = small + "px sans-serif";
  while (ctx.measureText(sub).width > 460 && small > 14) { small -= 1; ctx.font = small + "px sans-serif"; }
  ctx.fillStyle = "#a9b4c4";
  ctx.fillText(sub, 34, 100);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function signMesh(title, sub, width, accent) {
  const tex = signTexture(title, sub, accent || "#ffb020");
  return new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), new THREE.MeshBasicMaterial({ map: tex, color: tex ? 0xffffff : 0x1b212b }));
}
// Puts a group on the floor at (x, z), turned by rotationY, at a size
function placeGroup(g, group, x, z, rotationY, scale) {
  group.position.set(x, 0, z);
  group.rotation.y = rotationY || 0;
  if (scale) group.scale.setScalar(scale);
  group.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.add(group);
  return group;
}

// Shared materials for the Real Missions hall
function hallMaterials() {
  return {
    white: new THREE.MeshStandardMaterial({ color: 0xe6e8ea, roughness: 0.55, metalness: 0.2 }),
    grey: new THREE.MeshStandardMaterial({ color: 0x6b727c, roughness: 0.6, metalness: 0.5 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2f343b, roughness: 0.7, metalness: 0.4 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xe9a91c, roughness: 0.5, metalness: 0.2 }),
    red: new THREE.MeshStandardMaterial({ color: 0xb8322a, roughness: 0.5, metalness: 0.3 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x2f5fa8, roughness: 0.55, metalness: 0.2 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 0.9 })
  };
}
// ---- equipment, each built around its own origin, facing +x ----
function buildSpareStage(m) {
  const g = new THREE.Group();
  addMesh(g, new THREE.CylinderGeometry(0.62, 0.62, 5, 32), m.white, 0, 1.0, 0).rotation.z = Math.PI / 2;
  [-1, 1].forEach(function (end) {
    addMesh(g, new THREE.TorusGeometry(0.63, 0.04, 8, 32), m.dark, end * 1.6, 1.0, 0).rotation.y = Math.PI / 2;
    addMesh(g, new THREE.BoxGeometry(0.3, 0.5, 1.5), m.yellow, end * 1.9, 0.25, 0);
  });
  addMesh(g, new THREE.BoxGeometry(5.4, 0.12, 1.6), m.grey, 0, 0.06, 0);
  return g;
}
function buildEngineStand(m) {
  const g = new THREE.Group();
  addMesh(g, new THREE.BoxGeometry(1.1, 0.22, 1.1), m.yellow, 0, 0.11, 0);
  const bell = addMesh(g, new THREE.CylinderGeometry(0.12, 0.45, 0.75, 24, 1, true), m.dark, 0, 0.62, 0);
  bell.material.side = THREE.DoubleSide;
  addMesh(g, new THREE.CylinderGeometry(0.25, 0.25, 0.3, 16), m.grey, 0, 1.12, 0);
  return g;
}
function buildGasRack(m) {
  const g = new THREE.Group();
  addMesh(g, new THREE.BoxGeometry(0.42, 0.02, 0.22), m.grey, 0.135, 0.01, 0.045);
  addMesh(g, new THREE.BoxGeometry(0.42, 0.02, 0.02), m.yellow, 0.135, 0.16, -0.06);
  for (let i = 0; i < 8; i++) {
    addMesh(g, new THREE.CylinderGeometry(0.035, 0.035, 0.22, 10), i % 2 ? m.grey : m.blue, (i % 4) * 0.09, 0.12, Math.floor(i / 4) * 0.09);
  }
  return g;
}
function buildScaffold(m, levels) {
  const g = new THREE.Group();
  for (let i = 0; i < levels; i++) addMesh(g, new THREE.BoxGeometry(1.2, 0.04, 1.2), m.grey, 0, 0.6 * (i + 1), 0);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
    addMesh(g, new THREE.BoxGeometry(0.05, 0.6 * levels, 0.05), m.yellow, c[0] * 0.58, 0.3 * levels, c[1] * 0.58);
  });
  return g;
}
function buildMobileCrane(m) {
  const g = new THREE.Group();
  addMesh(g, new THREE.BoxGeometry(1.2, 0.35, 0.6), m.yellow, 0, 0.3, 0);
  addMesh(g, new THREE.BoxGeometry(0.3, 0.3, 0.5), m.dark, -0.35, 0.6, 0);
  const boom = addMesh(g, new THREE.BoxGeometry(0.12, 2.6, 0.12), m.yellow, 0.4, 1.5, 0);
  boom.rotation.z = -0.5;
  [-1, 1].forEach(function (side) { addMesh(g, new THREE.BoxGeometry(1.3, 0.16, 0.16), m.dark, 0, 0.08, side * 0.3); });
  return g;
}
function buildForklift(m) {
  const g = new THREE.Group();
  addMesh(g, new THREE.BoxGeometry(0.42, 0.16, 0.26), m.yellow, 0, 0.12, 0);
  addMesh(g, new THREE.BoxGeometry(0.2, 0.2, 0.24), m.dark, -0.08, 0.3, 0);
  [-0.12, 0.12].forEach(function (z) { addMesh(g, new THREE.BoxGeometry(0.02, 0.45, 0.02), m.dark, 0.22, 0.24, z); });
  [-0.07, 0.07].forEach(function (z) { addMesh(g, new THREE.BoxGeometry(0.26, 0.01, 0.03), m.grey, 0.36, 0.05, z); });
  [[-0.14, -0.13], [0.14, -0.13], [-0.14, 0.13], [0.14, 0.13]].forEach(function (w) {
    addMesh(g, new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), m.dark, w[0], 0.05, w[1]).rotation.x = Math.PI / 2;
  });
  return g;
}
function buildTowTrain(m) {
  const g = new THREE.Group();
  addMesh(g, new THREE.BoxGeometry(0.34, 0.14, 0.22), m.white, 0, 0.1, 0);
  addMesh(g, new THREE.BoxGeometry(0.14, 0.12, 0.2), m.blue, -0.06, 0.23, 0);
  for (let i = 0; i < 3; i++) {
    const x = -0.45 - i * 0.5;
    addMesh(g, new THREE.BoxGeometry(0.42, 0.03, 0.24), m.grey, x, 0.06, 0);
    addMesh(g, new THREE.BoxGeometry(0.3, 0.14, 0.18), i === 1 ? m.white : m.blue, x, 0.15, 0);
  }
  return g;
}
function buildRollingStairs(m) {
  const g = new THREE.Group();
  for (let i = 0; i < 8; i++) addMesh(g, new THREE.BoxGeometry(0.2, 0.02, 0.3), m.grey, i * 0.07, 0.05 + i * 0.06, 0);
  addMesh(g, new THREE.BoxGeometry(0.3, 0.02, 0.34), m.grey, 0.62, 0.53, 0);
  [-0.16, 0.16].forEach(function (z) {
    addMesh(g, new THREE.BoxGeometry(0.75, 0.015, 0.015), m.yellow, 0.27, 0.42, z).rotation.z = 0.7;
    addMesh(g, new THREE.BoxGeometry(0.02, 0.55, 0.02), m.yellow, 0.75, 0.28, z);
  });
  return g;
}
// A row of engineers' desks with monitors and chairs, along x
function buildDeskRow(m, n) {
  const g = new THREE.Group();
  const person = 0.23;
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 0.5;
    addMesh(g, new THREE.BoxGeometry(0.42, 0.02, 0.22), m.white, x, person * 0.33, 0);
    addMesh(g, new THREE.BoxGeometry(0.4, person * 0.32, 0.02), m.grey, x, person * 0.16, -0.1);
    const tex = screenTexture(i, "#0b1624", "#9fc6ea");
    addMesh(g, new THREE.BoxGeometry(0.16, 0.1, 0.01), m.dark, x, person * 0.33 + 0.07, -0.06);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.09), new THREE.MeshBasicMaterial({ map: tex, color: tex ? 0xffffff : 0x9fc6ea }));
    face.position.set(x, person * 0.33 + 0.07, -0.054);
    g.add(face);
    addMesh(g, new THREE.BoxGeometry(0.1, 0.02, 0.1), m.dark, x, person * 0.2, 0.14);
    addMesh(g, new THREE.BoxGeometry(0.1, 0.1, 0.02), m.dark, x, person * 0.2 + 0.05, 0.19);
  }
  return g;
}
function buildToolChests(m, n) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 0.32;
    addMesh(g, new THREE.BoxGeometry(0.26, 0.2, 0.14), m.red, x, 0.1, 0);
    for (let k = 0; k < 4; k++) addMesh(g, new THREE.BoxGeometry(0.22, 0.006, 0.005), m.grey, x, 0.04 + k * 0.045, 0.072);
  }
  return g;
}
function buildPallets(m, n) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 0.48;
    const h = 0.12 + (i % 3) * 0.05;
    addMesh(g, new THREE.BoxGeometry(0.4, 0.03, 0.4), m.wood, x, 0.015, 0);
    addMesh(g, new THREE.BoxGeometry(0.34, h, 0.34), i % 2 ? m.white : m.grey, x, 0.03 + h / 2, 0);
  }
  return g;
}

// Real Missions hall: stage processing (left), test and checkout (right), vehicle parking (back, beside
// the door), and the exhibit corner with the photos and the Agena (front). The pad stays clear.
function layoutAssemblyHall(g, roomR, box, wallH, size, doorW) {
  const R = roomR;
  const S = stationScale;
  const m = hallMaterials();
  const lineW = Math.max(0.08, size * 0.003);
  const inner = R * 0.88;
  // Each work area is sized to what is in it and stands against a side wall; the middle stays clear
  const Wz = Math.max(6, S * 3.4);
  const zd = Math.min(R * 0.95, Math.max(12.5, S * 4.6));
  const zcz = -R * 0.08;
  const zBack = zcz - zd / 2;
  const zFront = zcz + zd / 2;
  const labelW = Wz * 0.85;
  const signW = Math.min(size * 0.2, zd * 0.6);
  const leftWall = [-R, 0, Math.PI / 2];
  const rightWall = [R, 0, -Math.PI / 2];
  const signY = wallH * 0.12;

  // LEFT: stage processing. Two spare stages on dollies by the wall, engines on stands in a row.
  const lx = -inner + Wz / 2;
  zoneOutline(g, lx, zcz, Wz, zd, 0xffb020, lineW);
  floorLabel(g, "STAGE PROCESSING", lx, zFront + labelW * 0.14, labelW);
  onWall(g, signMesh("STAGE PROCESSING", "Spare stages and engines", signW), leftWall, -zcz, signY, size * 0.03);
  [-1, 1].forEach(function (k) {
    placeGroup(g, buildSpareStage(m), -inner + 1.1, zcz + k * zd * 0.24, Math.PI / 2);
  });
  for (let i = 0; i < 4; i++) {
    placeGroup(g, buildEngineStand(m), -inner + Wz - 1.0, zBack + zd * (0.16 + i * 0.2), 0);
  }
  [0.36, 0.56].forEach(function (f, i) {
    const w = worker(0.23, i ? 0xf2f2f2 : 0x2f6fd6);
    w.position.set(-inner + Wz - 1.9, 0, zBack + zd * f);
    w.rotation.y = Math.PI / 2;
    g.add(w);
  });
  placeGroup(g, buildGasRack(m), -inner + Wz * 0.5 - 0.2 * S, zFront - 0.5 * S, 0, S);

  // RIGHT: test and checkout. Two rows of engineers' desks, tool chests along the wall, supplies.
  const rx = inner - Wz / 2;
  zoneOutline(g, rx, zcz, Wz, zd, 0xffb020, lineW);
  floorLabel(g, "TEST & CHECKOUT", rx, zFront + labelW * 0.14, labelW);
  onWall(g, signMesh("TEST & CHECKOUT", "Engineers' desks and tools", signW), rightWall, zcz, signY, size * 0.03);
  placeGroup(g, buildToolChests(m, 6), inner - 0.3 * S, zcz - zd * 0.1, -Math.PI / 2, S);
  [1.3, 2.35].forEach(function (k) {
    placeGroup(g, buildDeskRow(m, 6), inner - k * S, zcz - zd * 0.1, Math.PI / 2, S);
  });
  placeGroup(g, buildPallets(m, 4), rx, zFront - 0.45 * S, 0, S);

  // FRONT CORNERS: the work stations (from the old Free Build lab), each in a marked area with a sign:
  // engineering (workbenches and computers) on the left, fabrication (3D printer, robot cell) on the right
  const lm = labMaterials();
  const fz0 = zFront + labelW * 0.5;
  const fz1 = inner;
  if (fz1 - fz0 > 8) {
    const fd = fz1 - fz0;
    const fcz = (fz0 + fz1) / 2;
    const fw = Math.min(Wz * 1.5, inner * 0.55);
    [[-1, "ENGINEERING", "Workbenches and computers"], [1, "FABRICATION", "3D printing and a robot cell"]].forEach(function (z) {
      const cx = z[0] * (inner - fw / 2);
      zoneOutline(g, cx, fcz, fw, fd, 0x56d4f0, lineW);
      floorLabel(g, z[1], cx, fz0 - labelW * 0.14, Math.min(labelW, fw * 0.8), "rgba(127, 230, 255, 0.92)");
      onWall(g, signMesh(z[1], z[2], signW, "#56d4f0"), z[0] < 0 ? leftWall : rightWall, z[0] < 0 ? -fcz : fcz, signY, size * 0.03);
    });
    placeGroup(g, labWorkbenches(lm), -inner + fw * 0.3, fcz, Math.PI / 2, S);
    placeGroup(g, labServerRacks(lm), -inner + fw * 0.75, fcz, Math.PI / 2, S);
    placeGroup(g, labPrinter(lm), inner - fw * 0.28, fcz, 0, 1);
    placeGroup(g, labRobotArms(lm), inner - fw * 0.72, fcz, Math.PI / 2, 1);
  }

  // BACK: vehicle parking, one marked bay per vehicle, on both sides of the door
  const bayDepth = Math.max(3.2, S * 1.4);
  const bayZ = -inner + bayDepth / 2;
  const left = [
    { build: buildForklift(m), w: S * 1.0, scale: S },
    { build: buildTowTrain(m), w: S * 2.2, scale: S, offset: S * 0.75 },
    { build: buildMobileCrane(m), w: 2.2, scale: 1 }
  ];
  const right = [
    { build: buildRollingStairs(m), w: S * 1.1, scale: S, offset: -S * 0.38 },
    { build: buildRollingStairs(m), w: S * 1.1, scale: S, offset: -S * 0.38 },
    { build: buildScaffold(m, Math.max(4, Math.round(wallH * 0.3 / 0.6))), w: 2.0, scale: 1 }
  ];
  const gap = Math.max(0.6, S * 0.35);
  [[left, -1], [right, 1]].forEach(function (pair) {
    let x = doorW * 0.75 + gap;
    pair[0].forEach(function (bay) {
      const cx = pair[1] * (x + bay.w / 2);
      zoneOutline(g, cx, bayZ, bay.w + gap * 0.6, bayDepth, 0xd8dde4, lineW * 0.7);
      placeGroup(g, bay.build, cx + (bay.offset || 0) * pair[1], bayZ, pair[1] < 0 ? 0 : Math.PI, bay.scale);
      x += bay.w + gap;
    });
    floorLabel(g, "PARKING", pair[1] * (doorW * 0.75 + gap + (x - doorW * 0.75) / 2), bayZ + bayDepth / 2 + labelW * 0.12, Math.min(labelW * 0.7, x - doorW * 0.75));
  });
}

// ----- Free Build lab: eight work bays evenly around the round room, the door bay left clear -----
function labMaterials() {
  return {
    dark: new THREE.MeshStandardMaterial({ color: 0x232a35, roughness: 0.5, metalness: 0.6 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x8792a3, roughness: 0.35, metalness: 0.8 }),
    white: new THREE.MeshStandardMaterial({ color: 0xdfe5ec, roughness: 0.5, metalness: 0.2 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xf07a2a, roughness: 0.45, metalness: 0.3 }),
    cyan: new THREE.MeshBasicMaterial({ color: 0x56d4f0 }),
    green: new THREE.MeshBasicMaterial({ color: 0x6ff0a8 }),
    holo: new THREE.MeshBasicMaterial({ color: 0x7fe6ff, wireframe: true, transparent: true, opacity: 0.55 })
  };
}
// Each bay is built in its own space: x runs along the wall, +z points to the middle of the room
function labWorkbenches(m) {
  const g = new THREE.Group();
  const person = 0.23;
  [-0.7, 0.7].forEach(function (bx, n) {
    addMesh(g, new THREE.BoxGeometry(1.2, 0.03, 0.4), m.white, bx, person * 0.42, 0);
    [[-0.55, -0.17], [0.55, -0.17], [-0.55, 0.17], [0.55, 0.17]].forEach(function (l) {
      addMesh(g, new THREE.BoxGeometry(0.03, person * 0.42, 0.03), m.steel, bx + l[0], person * 0.21, l[1]);
    });
    [-0.25, 0.25].forEach(function (sx, i) {
      const tex = screenTexture(n * 2 + i, "#061a22", i ? "#6ff0a8" : "#56d4f0");
      addMesh(g, new THREE.BoxGeometry(0.32, 0.2, 0.02), m.dark, bx + sx, person * 0.42 + 0.14, -0.12);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.17), new THREE.MeshBasicMaterial({ map: tex, color: tex ? 0xffffff : 0x56d4f0 }));
      face.position.set(bx + sx, person * 0.42 + 0.14, -0.105);
      g.add(face);
    });
  });
  return g;
}
function labServerRacks(m) {
  const g = new THREE.Group();
  const person = 0.23;
  for (let i = 0; i < 6; i++) {
    const x = (i - 2.5) * 0.24;
    addMesh(g, new THREE.BoxGeometry(0.22, person * 1.1, 0.3), m.dark, x, person * 0.55, 0);
    for (let j = 0; j < 6; j++) {
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.012, 0.005), (i + j) % 3 ? m.cyan : m.green);
      led.position.set(x, 0.04 + j * person * 0.17, 0.152);
      g.add(led);
    }
  }
  return g;
}
function labHoloTable(m) {
  const g = new THREE.Group();
  const person = 0.23;
  addMesh(g, new THREE.CylinderGeometry(0.6, 0.7, person * 0.45, 40), m.dark, 0, person * 0.225, 0);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.01, 40), new THREE.MeshBasicMaterial({ color: 0x1b6a80 }));
  top.position.y = person * 0.45 + 0.005;
  g.add(top);
  const planet = new THREE.Mesh(new THREE.SphereGeometry(0.4, 18, 12), m.holo);
  planet.position.y = person * 0.45 + 0.6;
  g.add(planet);
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.006, 4, 64), m.cyan);
  orbit.position.y = planet.position.y;
  orbit.rotation.x = 1.25;
  g.add(orbit);
  return g;
}
function labPrinter(m) {
  const g = new THREE.Group();
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { addMesh(g, new THREE.BoxGeometry(0.12, 3, 0.12), m.steel, c[0] * 1.4, 1.5, c[1] * 1.4); });
  addMesh(g, new THREE.BoxGeometry(2.9, 0.12, 0.2), m.steel, 0, 2.6, 0);
  addMesh(g, new THREE.BoxGeometry(0.3, 0.3, 0.3), m.cyan, 0.4, 2.35, 0);
  addMesh(g, new THREE.CylinderGeometry(0.6, 0.6, 0.9, 32, 1, true), m.steel, 0, 0.45, 0).material.side = THREE.DoubleSide;
  addMesh(g, new THREE.BoxGeometry(3, 0.06, 3), m.dark, 0, 0.03, 0);
  return g;
}
function labRobotArms(m) {
  const g = new THREE.Group();
  [-1.4, 1.4].forEach(function (x, i) {
    addMesh(g, new THREE.CylinderGeometry(0.5, 0.6, 0.3, 24), m.dark, x, 0.15, 0);
    const arm = new THREE.Group();
    arm.position.set(x, 0.3, 0);
    arm.rotation.y = i ? Math.PI : 0;
    addMesh(arm, new THREE.BoxGeometry(0.3, 2.4, 0.3), m.orange, 0, 1.2, 0).rotation.z = 0.35;
    addMesh(arm, new THREE.BoxGeometry(0.24, 2, 0.24), m.orange, -0.85, 2.6, 0).rotation.z = 1.1;
    const tool = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), m.cyan);
    tool.position.set(-1.8, 3.1, 0);
    arm.add(tool);
    g.add(arm);
  });
  // the part they work on, on a stand between them
  addMesh(g, new THREE.BoxGeometry(0.8, 0.5, 0.8), m.dark, 0, 0.25, 0);
  addMesh(g, new THREE.CylinderGeometry(0.35, 0.45, 0.9, 24), m.white, 0, 0.95, 0);
  return g;
}
function labStageJig(m) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    addMesh(g, new THREE.CylinderGeometry(0.55, 0.55, 1.2, 28), i === 1 ? m.orange : m.steel, (i - 1) * 1.5, 0.6, 0);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.03, 8, 32), m.cyan);
    ring.rotation.x = Math.PI / 2;
    ring.position.set((i - 1) * 1.5, 0.05, 0);
    g.add(ring);
  }
  return g;
}
function labDroneCage(m) {
  const g = new THREE.Group();
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { addMesh(g, new THREE.BoxGeometry(0.02, 0.9, 0.02), m.steel, c[0] * 0.7, 0.45, c[1] * 0.45); });
  [0.9].forEach(function (y) {
    [-1, 1].forEach(function (s) {
      addMesh(g, new THREE.BoxGeometry(1.4, 0.02, 0.02), m.steel, 0, y, s * 0.45);
      addMesh(g, new THREE.BoxGeometry(0.02, 0.02, 0.9), m.steel, s * 0.7, y, 0);
    });
  });
  [[-0.35, 0.45], [0.05, 0.6], [0.4, 0.35]].forEach(function (d) {
    const drone = new THREE.Group();
    drone.position.set(d[0], d[1], 0);
    addMesh(drone, new THREE.BoxGeometry(0.16, 0.05, 0.16), m.white, 0, 0, 0);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
      const rotor = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.006, 4, 20), m.cyan);
      rotor.rotation.x = Math.PI / 2;
      rotor.position.set(c[0] * 0.13, 0.015, c[1] * 0.13);
      drone.add(rotor);
    });
    g.add(drone);
  });
  return g;
}
function labRoverPods(m) {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * 0.7;
    addMesh(g, new THREE.CylinderGeometry(0.28, 0.3, 0.05, 32), m.dark, x, 0.025, 0);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.01, 6, 32), i === 1 ? m.green : m.cyan);
    halo.rotation.x = Math.PI / 2;
    halo.position.set(x, 0.06, 0);
    g.add(halo);
    addMesh(g, new THREE.BoxGeometry(0.3, 0.08, 0.2), m.white, x, 0.14, 0);
    [[-0.12, -0.11], [0.12, -0.11], [-0.12, 0.11], [0.12, 0.11]].forEach(function (w) {
      addMesh(g, new THREE.CylinderGeometry(0.045, 0.045, 0.03, 12), m.dark, x + w[0], 0.075, w[1]).rotation.x = Math.PI / 2;
    });
  }
  return g;
}
function layoutLab(g, roomR, box, wallH, size) {
  const R = roomR;
  const S = stationScale;
  const m = labMaterials();
  const ringH = wallH * 0.45;
  // a round floor grid, like the building
  const grid = new THREE.PolarGridHelper(R * 0.94, 24, 10, 96, 0x56d4f0, 0x2b6f80);
  grid.position.y = 0.012;
  grid.material.transparent = true;
  grid.material.opacity = 0.3;
  g.add(grid);
  const bays = [
    ["WORKBENCHES", "Design and wiring", labWorkbenches, S],
    ["COMPUTERS", "Flight software and simulations", labServerRacks, S],
    ["HOLO TABLE", "Plan the route", labHoloTable, S],
    ["3D PRINTING", "Printing new parts", labPrinter, 1],
    ["ROBOT CELL", "Automatic assembly", labRobotArms, 1],
    ["STAGE JIGS", "Stages being built", labStageJig, 1],
    ["DRONE TESTS", "Test flights in a cage", labDroneCage, S],
    ["ROVER PODS", "Charging test rovers", labRoverPods, S]
  ];
  const doorAngle = Math.PI * 1.5;       // the door is at the back (-z)
  const step = (Math.PI * 2) / (bays.length + 1);
  const r0 = Math.max(box * 1.45, R * 0.42);
  const r1 = R * 0.9;
  const rc = (r0 + r1) / 2;
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x56d4f0, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  bays.forEach(function (bay, k) {
    const a = doorAngle + (k + 1) * step;
    const half = step * 0.42;
    // the bay's floor marking: an outlined ring segment
    const edge = Math.max(0.06, size * 0.0025);
    [r0, r1].forEach(function (r) {
      const arc = new THREE.Mesh(new THREE.RingGeometry(r - edge, r + edge, 24, 1, -a - half, half * 2), lineMat);
      arc.rotation.x = -Math.PI / 2;
      arc.position.y = 0.014;
      g.add(arc);
    });
    [-half, half].forEach(function (h) {
      const side = new THREE.Mesh(new THREE.PlaneGeometry(r1 - r0, edge * 2), lineMat);
      side.rotation.x = -Math.PI / 2;
      side.rotation.z = -(a + h); // (laid flat, a plane's own angle runs the other way)
      side.position.set(Math.cos(a + h) * rc, 0.014, Math.sin(a + h) * rc);
      g.add(side);
    });
    // the equipment, in the middle of its bay, facing the middle of the room
    const group = bay[2](m);
    group.position.set(Math.cos(a) * (rc + (r1 - r0) * 0.12), 0, Math.sin(a) * (rc + (r1 - r0) * 0.12));
    group.rotation.y = -a - Math.PI / 2;
    group.scale.setScalar(bay[3]);
    group.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.add(group);
    // the bay's sign on the ring wall, and its name on the floor
    const signW = Math.min(R * step * 0.7, size * 0.16);
    const sign = signMesh("BAY " + (k + 1) + " · " + bay[0], bay[1], signW, "#56d4f0");
    sign.position.set(Math.cos(a) * R * 0.965, Math.min(ringH * 0.3, signW * 0.6 + ringH * 0.12), Math.sin(a) * R * 0.965);
    sign.lookAt(0, sign.position.y, 0);
    g.add(sign);
    const lw = Math.min(r1 - r0, R * step * 0.6) * 0.8;
    const label = new THREE.Group();
    floorLabel(label, bay[0], 0, 0, lw, "rgba(127, 230, 255, 0.92)");
    label.position.set(Math.cos(a) * (r0 + lw * 0.12), 0, Math.sin(a) * (r0 + lw * 0.12));
    label.rotation.y = -a + Math.PI / 2; // reads the right way up from the camera, which circles outside the bays' inner edge
    g.add(label);
  });
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
  const roofParts = new THREE.Group(); // the dome and what hangs from it (hidden in the zoomed-out view)
  g.add(roofParts);
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
  roofParts.add(dome);
  const sky = new THREE.Mesh(new THREE.CircleGeometry(R * Math.sin(oculusAngle) * 1.02, 48), new THREE.MeshBasicMaterial({ color: 0xcfe6ff }));
  sky.rotation.x = Math.PI / 2;
  sky.position.y = ringH + domeH * Math.cos(oculusAngle) + 0.05;
  roofParts.add(sky);
  const oculusRim = new THREE.Mesh(new THREE.TorusGeometry(R * Math.sin(oculusAngle), size * 0.005, 8, 64), steel);
  oculusRim.rotation.x = Math.PI / 2;
  oculusRim.position.y = ringH + domeH * Math.cos(oculusAngle);
  roofParts.add(oculusRim);
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
  roofParts.add(ribs);
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
  roofParts.add(craneRail);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(R * 1.8, size * 0.022, size * 0.03), orange);
  bridge.position.y = ringH * 0.95;
  bridge.rotation.y = 0.55;
  roofParts.add(bridge);
  const trolley = new THREE.Mesh(new THREE.BoxGeometry(size * 0.04, size * 0.03, size * 0.05), white);
  trolley.position.set(Math.cos(0.55) * R * 0.35, ringH * 0.93, -Math.sin(0.55) * R * 0.35);
  trolley.rotation.y = 0.55;
  roofParts.add(trolley);
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
  return roofParts;
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

// ----- Pictures on the front wall of the Real Missions hall -----
// Three NASA photos (the local copies credited in data/hardware.js), with their credit under each one.
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
  // Laid out from the floor up: credit cards, then the photos (only the three NASA photos: no banner)
  const photoH = size * 0.1;
  const labelH = photoH * 0.27;
  const labelY = Math.max(1.4, wallH * 0.07) + labelH / 2;
  const photoY = labelY + labelH / 2 + photoH * 0.6;
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
}

// ----- The Agena Target Vehicle exhibit (an official NASA 3D model) -----
// Model: NASA 3D Resources, https://science.nasa.gov/3d-resources/agena-target-vehicle/
// Fact on the plaque: https://www.nasa.gov/mission/gemini-viii/ (first docking in space, March 16, 1966)
function addAgenaExhibit(g, roomR, box, size) {
  const ex = station(g, roomR, box, Math.PI / 2, 0.72); // front, in front of the photo wall
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
  // One building for every mode (Master Doc 12: the domed lab looked too modern and confusing): the
  // assembly hall, with the lab's work stations brought into it
  const freeBuild = false;
  if (viewer.hangar) viewer.scene.remove(viewer.hangar);
  const g = new THREE.Group();
  // The camera circles at about 1.15 x (1.9 x the biggest size + 2): the room is wider than that
  const cameraRadius = (Math.max(tallest, width) * 1.9 + 2) * 1.15;
  const size = Math.max(cameraRadius * 2.3, tallest * 2.6, width * 2.4, 40); // (smaller than before, so the work areas fill it)
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
    // (columns, catwalks and trims on the walls: hidden in the zoomed-out view, so they don't block it)
    const wallDetail = new THREE.Group();
    g.add(wallDetail);
    viewer.wallDetail = wallDetail;
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
        wallDetail.add(rib);
      }
      // a band of high windows with daylight behind them
      const band = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.92, wallH * 0.045), new THREE.MeshBasicMaterial({ color: 0xbcd4f5 }));
      band.position.set(w[0] + nx * size * 0.016, wallH * 0.93, w[1] + nz * size * 0.016);
      band.rotation.y = w[2];
      wallDetail.add(band);
      // a dark skirting band low on the wall (scuffed paint, cable trays)
      const skirt = new THREE.Mesh(new THREE.PlaneGeometry(size, Math.max(1.2, wallH * 0.06)), skirtMat);
      skirt.position.set(w[0] + nx * 0.05, Math.max(0.6, wallH * 0.03), w[1] + nz * 0.05);
      skirt.rotation.y = w[2];
      wallDetail.add(skirt);
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
        wallDetail.add(walk);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(size * 0.004 + 0.03, size * 0.004 + 0.03, size * 0.86), yellowPaint);
        rail.position.set(side * (roomR - galleryDepth), y + person * 4.5, 0);
        wallDetail.add(rail);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, size * 0.7), galleryLampMat);
        lamp.position.set(side * (roomR - galleryDepth * 0.5), y - 0.15, 0);
        wallDetail.add(lamp);
      });
    });

    // (the roof parts are in their own group: hidden when the camera zooms out above the building)
    const roof = new THREE.Group();
    g.add(roof);
    viewer.roof = roof;
    viewer.roofY = wallH;
    // Roof: a dark ceiling with a steel truss grid, rows of high bay lamps, and a bridge crane on rails
    const roofY = wallH;
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ color: 0x23272e, roughness: 0.9, metalness: 0.2 }));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = roofY;
    roof.add(ceiling);
    for (let i = -4; i <= 4; i++) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.016, size * 0.012), steel);
      beam.position.set(0, roofY - size * 0.012, i * size * 0.11);
      roof.add(beam);
      const cross = new THREE.Mesh(new THREE.BoxGeometry(size * 0.012, size * 0.012, size), darkSteel);
      cross.position.set(i * size * 0.11, roofY - size * 0.026, 0);
      roof.add(cross);
    }
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff6e4 });
    const lampGeo = new THREE.CylinderGeometry(size * 0.012, size * 0.016, size * 0.008, 12);
    for (let i = -3; i <= 3; i++) {
      for (let j = -3; j <= 3; j++) {
        const lamp = new THREE.Mesh(lampGeo, lampMat);
        lamp.position.set(i * size * 0.13, roofY - size * 0.04, j * size * 0.13);
        roof.add(lamp);
      }
    }
    [-1, 1].forEach(function (side) {
      const railBeam = new THREE.Mesh(new THREE.BoxGeometry(size * 0.02, size * 0.02, size), yellowPaint);
      railBeam.position.set(side * roomR * 0.7, roofY - size * 0.06, 0);
      roof.add(railBeam);
    });
    const crane = new THREE.Mesh(new THREE.BoxGeometry(roomR * 1.4, size * 0.03, size * 0.035), yellowPaint);
    crane.position.set(0, roofY - size * 0.08, -box * 0.5);
    roof.add(crane);
    const hookLength = Math.max(1, roofY - size * 0.08 - (deckH + tallest * 1.1));
    const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, hookLength, 6), darkSteel);
    hook.position.set(box * 0.3, roofY - size * 0.08 - hookLength / 2, -box * 0.5);
    roof.add(hook);
  } else {
    viewer.wallDetail = null;
    const domeRoof = buildDomeLab(g, roomR, wallH, size, box);
    viewer.roof = domeRoof;
    viewer.roofY = wallH * 0.45;
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
    layoutLab(g, roomR, box, wallH, size);
  } else {
    layoutAssemblyHall(g, roomR, box, wallH, size, Math.max(width * 1.3, tallest * 0.55, 8));
    addWallGallery(g, roomR, wallH, size);
    addAgenaExhibit(g, roomR, box, size);
  }

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
  // The camera can't drop under the floor. Zooming out goes past the walls to show the whole building
  // from outside (the walls are drawn from the inside only, so the building opens up like a cut-away
  // model); the view starts inside it.
  const controls = viewer.controls;
  controls.maxDistance = roomR * 0.82; // the camera always stays inside the building (Master Doc 12)
  viewer.insideDistance = roomR * 0.82;
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
  if (viewer.garage && viewer.insideDistance) distance = Math.min(distance, viewer.insideDistance / 1.15);
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
    if (viewer.roof) {
      const p = viewer.camera.position;
      const outside = viewer.insideDistance && Math.hypot(p.x, p.z) > viewer.insideDistance * 1.12;
      viewer.roof.visible = !(outside || p.y > viewer.roofY * 0.92);
      if (viewer.wallDetail) viewer.wallDetail.visible = !outside;
    }
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
  { key: "payload", name: "Payload capacity", effect: "Shown on your mission results" },
  // Master Doc 14: more upgrades (fictional game mode); each one is listed on the mission results
  { key: "heatshield", name: "Heat shield", effect: "Shown on your mission results" },
  { key: "solar", name: "Solar panels", effect: "Shown on your mission results" },
  { key: "comms", name: "Comms antenna", effect: "Shown on your mission results" }
];
// Accessories and patches (Workshop, Master Doc 14): fictional, Free Build only
const ACCESSORIES = [
  { key: "fins", name: "Tail fins", text: "Four fins at the base" },
  { key: "stripe", name: "Body stripe", text: "A coloured band high on the body" },
  { key: "camera", name: "Camera pod", text: "An outside camera on the side" },
  { key: "flag", name: "Team flag", text: "A made-up team flag (not a real country's)" }
];
const PATCH_SHAPES = [["circle", "Round"], ["shield", "Shield"], ["hexagon", "Hexagon"], ["star", "Star"]];
const PATCH_COLORS = ["#2f5fb8", "#b5482a", "#c9a13b", "#3b8f6a", "#6a4cb8", "#3b3f46"];

// The mission patch: a shape in a colour, with the mission's initials
function patchSvg(patch, name) {
  const c = patch.color;
  const shapes = {
    circle: '<circle cx="40" cy="40" r="34"/>',
    shield: '<path d="M40 6 L70 16 V40 C70 58 56 70 40 76 C24 70 10 58 10 40 V16 Z"/>',
    hexagon: '<path d="M40 5 L71 22.5 V57.5 L40 75 L9 57.5 V22.5 Z"/>',
    star: '<path d="M40 5 L49 29 L75 30 L54 46 L62 72 L40 57 L18 72 L26 46 L5 30 L31 29 Z"/>'
  };
  const initials = String(name || "FB").split(/\s+/).filter(Boolean).map(function (w) { return w[0]; }).join("").slice(0, 3).toUpperCase() || "FB";
  const safe = initials.replace(/[^A-Z0-9]/g, "") || "FB";
  return '<svg viewBox="0 0 80 80" role="img" aria-label="Mission patch"><g fill="' + c + '" stroke="#e8eef8" stroke-width="2.5">' + (shapes[patch.shape] || shapes.circle) + '</g>' +
    '<text x="40" y="47" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="17" font-weight="700" fill="#ffffff">' + safe + '</text></svg>';
}

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

// The + and - buttons over the builder's 3D view: each press moves the camera closer or farther (to the
// same limits as the mouse wheel), smoothly over a few frames
function zoomLab(factor) {
  if (!lab) return;
  const c = lab.controls;
  const offset = lab.camera.position.clone().sub(c.target);
  const goal = Math.max(c.minDistance, Math.min(c.maxDistance, offset.length() * factor));
  const start = offset.length();
  const began = performance.now();
  // beyond the walls, the camera also rises to look down into the building (a cut-away view)
  const spherical = new THREE.Spherical().setFromVector3(offset);
  const startPhi = spherical.phi;
  const goalPhi = startPhi; // (zooming out stops at the walls: the view stays inside the building)
  play("tick");
  (function step() {
    const k = Math.min(1, (performance.now() - began) / 280);
    const eased = k * k * (3 - 2 * k);
    spherical.radius = start + (goal - start) * eased;
    spherical.phi = startPhi + (goalPhi - startPhi) * eased;
    lab.camera.position.copy(c.target).add(offset.setFromSpherical(spherical));
    c.update();
    if (k < 1) requestAnimationFrame(step);
  })();
}
const zoomInButton = el("lab-zoom-in");
const zoomOutButton = el("lab-zoom-out");
if (zoomInButton) zoomInButton.addEventListener("click", function () { zoomLab(0.7); });
if (zoomOutButton) zoomOutButton.addEventListener("click", function () { zoomLab(1.45); });

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
  const look = state.mode === "sandbox" ? state.look : null;
  let craftModel = null;
  const plateNasa = labPlate.querySelector ? labPlate.querySelector("i") : null;
  if (craft) {
    craftModel = createModel(craft.model);
    const box = new THREE.Box3().setFromObject(craftModel);
    const size = new THREE.Vector3();
    box.getSize(size);
    craftModel.scale.multiplyScalar(Math.max(3, rocketModel.userData.height * 0.4) / (Math.max(size.x, size.y, size.z) || 1)); // shown enlarged beside the rocket
    // NASA's official model where NASA has one (Master Doc 14), labelled on the plate
    if (nasaModelInfo(craft.model)) {
      const shownModel = craftModel;
      upgradeToNasaModel(shownModel, craft.model).then(function (shown) {
        if (!shown || !plateNasa || !shownModel.parent) return;
        plateNasa.textContent += " \u00B7 NASA 3D model";
      });
    }
  }
  // the chosen surface vehicle stands beside the spacecraft
  let vehicleModel = null;
  if (state.vehicle) {
    vehicleModel = createModel(state.vehicle);
    const vbox = new THREE.Box3().setFromObject(vehicleModel);
    const vsize = new THREE.Vector3();
    vbox.getSize(vsize);
    vehicleModel.scale.multiplyScalar(Math.max(2.4, rocketModel.userData.height * 0.25) / (Math.max(vsize.x, vsize.y, vsize.z) || 1));
  }
  fill(lab, [createRocket(padKey, look), craftModel, vehicleModel, state.labCompare && state.labCompare !== padKey ? createRocket(state.labCompare) : null]);
  sizeViewer(lab);

  // ----- Workshop: one box in four (Master Doc 14) -----
  const sandbox = state.mode === "sandbox";
  labLock.textContent = sandbox
    ? "FREE BUILD \u00B7 FICTIONAL: paint, accessories, upgrades and the patch are game changes, not real specifications."
    : "Real Missions keeps every rocket exactly as it flew.";
  labLock.className = "lab-lock " + (sandbox ? "fictional" : "historical");

  // 1. Paint
  labCustom.innerHTML = "";
  [["paint", "Body"], ["accent", "Bands"], ["finColor", "Fins"], ["stripeColor", "Stripe"]].forEach(function (pair) {
    const row = document.createElement("div");
    row.className = "lab-row";
    const label = document.createElement("span");
    label.textContent = pair[1];
    row.appendChild(label);
    const swatches = document.createElement("span");
    swatches.className = "lab-swatches";
    PAINTS.forEach(function (paint) {
      const swatch = document.createElement("button");
      swatch.className = "lab-swatch" + (state.look[pair[0]] === paint.value ? " active" : "");
      swatch.title = pair[1] + ": " + paint.name;
      swatch.setAttribute("aria-label", pair[1] + ": " + paint.name);
      swatch.disabled = !sandbox;
      swatch.style.setProperty("--swatch", paint.value === null ? "transparent" : "#" + paint.value.toString(16).padStart(6, "0"));
      swatch.textContent = paint.value === null ? "\u00D7" : "";
      swatch.addEventListener("click", function () {
        state.look[pair[0]] = paint.value;
        play("tick");
        render();
      });
      swatches.appendChild(swatch);
    });
    row.appendChild(swatches);
    labCustom.appendChild(row);
  });

  // 2. Accessories
  wsAccessories.innerHTML = "";
  ACCESSORIES.forEach(function (a) {
    const on = Boolean(state.look.acc[a.key]);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ws-toggle" + (on ? " on" : "");
    button.setAttribute("aria-pressed", on ? "true" : "false");
    button.disabled = !sandbox;
    button.innerHTML = '<b></b><span></span>';
    if (button.querySelector) {
      button.querySelector("b").textContent = a.name;
      button.querySelector("span").textContent = a.text;
    }
    button.addEventListener("click", function () {
      state.look.acc[a.key] = !state.look.acc[a.key];
      play(state.look.acc[a.key] ? "toggleOn" : "toggleOff");
      render();
    });
    wsAccessories.appendChild(button);
  });

  // 3. Upgrades, with the points next to the title
  labPoints.textContent = getPoints() + " point" + (getPoints() === 1 ? "" : "s");
  labPoints.title = "Earn one point for each object you record while exploring";
  labUpgrades.innerHTML = "";
  const levels = getUpgrades();
  UPGRADES.forEach(function (up) {
    const row = document.createElement("div");
    row.className = "lab-row";
    const label = document.createElement("span");
    label.textContent = up.name + " \u00B7 " + (levels[up.key] || 0) + "/3 \u00B7 " + up.effect;
    row.appendChild(label);
    const button = document.createElement("button");
    button.className = "small-button";
    button.textContent = "Upgrade";
    button.title = "Fictional game upgrade (costs 1 point)";
    button.disabled = !sandbox || getPoints() < 1 || (levels[up.key] || 0) >= 3;
    button.addEventListener("click", function () {
      if (spendPoint(up.key)) { play("success"); render(); }
    });
    row.appendChild(button);
    labUpgrades.appendChild(row);
  });

  // 4. Mission name & patch
  if (document.activeElement !== wsName) wsName.value = state.missionName;
  wsPatch.innerHTML = "";
  const preview = document.createElement("div");
  preview.className = "ws-patch-preview";
  preview.innerHTML = patchSvg(state.patch, state.missionName);
  wsPatch.appendChild(preview);
  const pickers = document.createElement("div");
  pickers.className = "ws-patch-pickers";
  PATCH_SHAPES.forEach(function (shape) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "small-button" + (state.patch.shape === shape[0] ? " active" : "");
    b.textContent = shape[1];
    b.setAttribute("aria-pressed", state.patch.shape === shape[0] ? "true" : "false");
    b.addEventListener("click", function () { state.patch.shape = shape[0]; play("tick"); render(); });
    pickers.appendChild(b);
  });
  const colors = document.createElement("div");
  colors.className = "lab-swatches";
  PATCH_COLORS.forEach(function (color) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "lab-swatch" + (state.patch.color === color ? " active" : "");
    b.style.setProperty("--swatch", color);
    b.setAttribute("aria-label", "Patch colour " + color);
    b.addEventListener("click", function () { state.patch.color = color; play("tick"); render(); });
    colors.appendChild(b);
  });
  pickers.appendChild(colors);
  wsPatch.appendChild(pickers);
}

wsName.addEventListener("input", function () {
  state.missionName = wsName.value.slice(0, 40);
  const preview = wsPatch.querySelector ? wsPatch.querySelector(".ws-patch-preview") : null;
  if (preview) preview.innerHTML = patchSvg(state.patch, state.missionName);
});

onProgressChange(function () { if (state.step === "lab") renderLab(); });

// ----- Astronaut Simulation: the Suit Locker -----
const POSES = [["walk", "Walk"], ["lunar-hop", "Moon hop"], ["run", "Run"], ["float", "Zero-g float"], ["climb", "Ladder"], ["operate", "Controls"], ["collect", "Collect"], ["drive", "Drive"]];
const LOCKER_VEHICLES = [
  { key: "lrv", name: "Lunar Roving Vehicle", text: "210 kg, 3.1 m long, a motor in each wheel; front and rear steering. Apollo 15, 16 and 17." },
  { key: "perseverance", name: "Perseverance rover", text: "Drives slowly, turns in place, robotic arm and Mastcam-Z. Jezero Crater." },
  { key: "curiosity", name: "Curiosity rover", text: "Climbing Mount Sharp in Gale Crater." }
];

// Surface vehicles: the rovers and the Lunar Roving Vehicle (Master Doc 14: rovers moved here from the
// spacecraft list). One can ride along with the spacecraft; it is only marked as chosen.
function renderVehicles() {
  lockerVehicles.innerHTML = "";
  LOCKER_VEHICLES.forEach(function (v) {
    const real = ROVERS[v.key] ? state.spacecraft === "skycrane" && state.rocket === "atlas-v-541" : state.spacecraft === "apollo";
    lockerVehicles.appendChild(card(v.name,
      real ? "Surface vehicle \u00B7 rides along as it really did" : "Surface vehicle" + (state.spacecraft ? " \u00B7 FICTIONAL with this spacecraft" : ""),
      v.text + (ROVERS[v.key] ? " Really delivered by a cruise stage and sky crane on an Atlas V 541." : ""),
      state.vehicle === v.key,
      function () {
        state.vehicle = state.vehicle === v.key ? null : v.key; // click again to leave it behind
        state.site = null;
        play("select");
        render();
        renderVehicles();
      }, { fictional: Boolean(state.spacecraft) && !real, picture: { type: "model", key: v.key } }));
  });
}

// A hand tool on the turntable, with its facts and a way back to the suit
function showLockerTool() {
  const eq = EQUIPMENT[state.lockerTool];
  const tool = createEquipment(state.lockerTool);
  const box = new THREE.Box3().setFromObject(tool);
  const size = new THREE.Vector3();
  box.getSize(size);
  tool.scale.multiplyScalar(0.8 / (Math.max(size.x, size.y, size.z) || 1));
  tool.updateMatrixWorld(true);
  tool.position.y -= new THREE.Box3().setFromObject(tool).min.y;
  locker.holder.add(tool);
  locker.astronaut = null;
  // the view is shifted so the tool stands clear of the tools list on the left
  locker.camera.position.set(1.6, 1.3, 3.4);
  locker.controls.target.set(-0.45, 0.4, 0);
  locker.controls.update();
  sizeViewer(locker);
  lockerPoses.innerHTML = "";
  const back = document.createElement("button");
  back.className = "small-button active";
  back.textContent = "\u2190 Back to the suit";
  back.addEventListener("click", function () { state.lockerTool = null; play("tick"); renderLocker(); });
  lockerPoses.appendChild(back);
  lockerName.textContent = eq.name;
  factList(lockerFacts, [
    ["What it is", eq.text],
    ["Carried by", "The crew (Free Build: any suit can carry it)"]
  ]);
  renderToolList();
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
      state.lockerTool = null;
      play("open");
      renderLocker();
    });
    lockerSuits.appendChild(door);
  });

  // The astronaut (or the chosen tool) on the turntable
  while (locker.holder.children.length) locker.holder.remove(locker.holder.children[0]);
  if (state.lockerTool && EQUIPMENT[state.lockerTool]) {
    showLockerTool();
    return;
  }
  const astronaut = createSuitedAstronaut(state.suit);
  // Stand the boots on the turntable (the model's soles sit a few centimetres below its origin)
  astronaut.updateMatrixWorld(true);
  astronaut.position.y -= new THREE.Box3().setFromObject(astronaut).min.y;
  locker.holder.add(astronaut);
  locker.holder.position.x = 0;
  locker.astronaut = astronaut;
  locker.camera.position.set(3.0, 1.5, 4.8);
  locker.controls.target.set(-0.55, 0.85, 0); // (shifted: the tools list sits on the left of the view)
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

  renderToolList();
}

function renderToolList() {
  // Hand tools and kit: a side list inside the viewer box; click one to see it on the turntable
  lockerEquipment.innerHTML = "";
  Object.keys(EQUIPMENT).forEach(function (key) {
    const eq = EQUIPMENT[key];
    const item = document.createElement("button");
    item.type = "button";
    item.className = "locker-tool" + (state.lockerTool === key ? " active" : "");
    item.title = eq.text;
    item.setAttribute("aria-pressed", state.lockerTool === key ? "true" : "false");
    item.innerHTML = '<b class="rack-pic"></b><span></span>';
    if (item.querySelector) {
      setPicture(item.querySelector("b"), { type: "equipment", key: key });
      item.querySelector("span").textContent = eq.name;
    }
    item.addEventListener("click", function () {
      state.lockerTool = state.lockerTool === key ? null : key;
      play("open");
      renderLocker();
    });
    lockerEquipment.appendChild(item);
  });
}

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
  // Free Build: the mission's patch, and the fictional upgrades and accessories it flew with
  if (mission.mode === "sandbox") {
    const extras = document.createElement("div");
    extras.className = "results-extras";
    if (mission.patch) {
      const patch = document.createElement("span");
      patch.className = "results-patch";
      patch.innerHTML = patchSvg(mission.patch, mission.missionName);
      extras.appendChild(patch);
    }
    const ups = mission.upgrades ? Object.keys(mission.upgrades).filter(function (k) { return mission.upgrades[k]; }) : [];
    const accs = mission.look && mission.look.acc ? Object.keys(mission.look.acc).filter(function (k) { return mission.look.acc[k]; }) : [];
    const note = document.createElement("p");
    note.textContent = (ups.length ? "Fictional upgrades: " + ups.map(function (k) {
      const up = UPGRADES.find(function (u) { return u.key === k; });
      return (up ? up.name : k) + " " + mission.upgrades[k] + "/3";
    }).join(", ") : "No upgrades") + (accs.length ? " · Accessories: " + accs.map(function (k) {
      const a = ACCESSORIES.find(function (x) { return x.key === k; });
      return a ? a.name : k;
    }).join(", ") : "");
    extras.appendChild(note);
    resultsBox.appendChild(extras);
  }
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
