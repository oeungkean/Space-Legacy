// Player progress: the virtual collection, photos, samples, and the current Mission Simulator mission
// (its objectives, stage and status), plus the mission progress panel (#mission-hud).
// Everything is saved in this browser (localStorage). If saving is blocked, it still works until the page closes.
//
// IMPORTANT: the collection is a virtual educational archive. Recording an object never moves the real object.

import { SITES, SPACECRAFT, DESTINATIONS } from "../data/simulator.js";
import { collectibles } from "../data/collectibles.js";
import { findItem } from "../data/catalog.js";

const KEY = "space-legacy-collection";

let data = { records: {}, photos: [], samples: [], points: 0, upgrades: {} };
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || "null");
  if (saved && typeof saved === "object") data = Object.assign(data, saved);
} catch (error) {
  // saving is not available: keep everything in memory
}

const listeners = [];

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (error) {
    // a full or blocked storage just means it is not remembered
  }
  listeners.forEach(function (fn) { fn(); });
}

export function onProgressChange(fn) { listeners.push(fn); }

// ----- Collection -----
export function isRecorded(id) { return Boolean(data.records[id]); }

export function recordObject(id, how) {
  if (data.records[id]) return false;
  data.records[id] = { date: new Date().toISOString().slice(0, 10), how: how || "collected" };
  data.points += 1; // one upgrade point for the Rocket Lab's game mode
  save();
  return true;
}

export function getRecords() { return data.records; }

export function addPhoto(photo) {
  data.photos.unshift(photo);
  data.photos = data.photos.slice(0, 24); // keep the newest 24 so storage stays small
  save();
}

export function getPhotos() { return data.photos; }

export function addSample(sample) {
  data.samples.push(sample);
  save();
}

export function getSamples() { return data.samples; }

export function getPoints() { return data.points; }

export function getUpgrades() { return data.upgrades; }

export function spendPoint(key) {
  const level = data.upgrades[key] || 0;
  if (data.points < 1 || level >= 3) return false;
  data.points -= 1;
  data.upgrades[key] = level + 1;
  save();
  return true;
}

export function resetCollection() {
  data = { records: {}, photos: [], samples: [], points: 0, upgrades: {} };
  save();
}

// ----- The current mission -----
let mission = null;

export function getMission() { return mission; }

// config: { mode, rocket, spacecraft, destination, template, siteId, crew, custom }
export function startMission(config) {
  const site = config.siteId ? SITES[config.siteId] : null;
  mission = Object.assign({}, config, {
    site: site,
    stage: "Pre-launch",
    status: "Preparing",
    distance: "",
    discoveries: [],
    objectives: buildObjectives(config, site)
  });
  renderHud();
  save();
  return mission;
}

export function endMission() {
  mission = null;
  renderHud();
}

export function buildObjectives(config, site) {
  const destination = DESTINATIONS[config.destination];
  const craft = SPACECRAFT[config.spacecraft];
  const list = [
    { id: "launch", text: "Launch the " + (craft ? craft.name : "spacecraft") },
    { id: "reach", text: "Reach " + (destination ? destination.name : "the destination") }
  ];
  if (site) {
    if (site.start === "lm-landing") list.push({ id: "land", text: "Land the Lunar Module" });
    if (site.world === "orbit") {
      list.push({ id: site.start === "eva" ? "eva" : "controls", text: site.start === "eva" ? "Float over to the spacecraft" : "Use the spacecraft controls" });
    } else {
      list.push({ id: "explore", text: "Explore " + site.name + " (move 60 m)" });
    }
    if (site.vehicle === "lrv") list.push({ id: "drive", text: "Drive the Lunar Roving Vehicle 150 m" });
    if (site.vehicle === "rover") list.push({ id: "drive", text: "Drive the rover 40 m" });
    const here = collectibles.filter(function (c) { return c.site === config.siteId; });
    if (here.length) {
      list.push({ id: "photograph", text: "Photograph a discovery" });
      if (here.some(function (c) { return c.kind === "hardware"; })) list.push({ id: "collect", text: "Record 2 historical objects" });
      if (here.some(function (c) { return c.kind === "target"; })) list.push({ id: "examine", text: "Examine a science target" });
    }
    if (site.equipment.some(function (key) { return key === "sample-bag" || key === "tubes"; })) {
      list.push({ id: "sample", text: "Take a virtual sample" });
    }
  } else if (craft && (craft.type === "telescope" || craft.type === "probe" || craft.type === "station")) {
    list.push({ id: "deploy", text: "Watch the spacecraft reach its final state" });
  }
  list.push({ id: "complete", text: "Complete the mission and review the results" });
  return list.map(function (o) { return Object.assign({ done: false }, o); });
}

export function completeObjective(id) {
  if (!mission) return false;
  const objective = mission.objectives.find(function (o) { return o.id === id; });
  if (!objective || objective.done) return false;
  objective.done = true;
  objective.failed = false;
  renderHud();
  flashHud(objective.text);
  return true;
}

// Marks the last attempt at an objective as failed (for example a landing that came down too fast).
// It stays open, so the player can try again; completing it later clears the failed mark.
export function failObjective(id) {
  if (!mission) return false;
  const objective = mission.objectives.find(function (o) { return o.id === id; });
  if (!objective || objective.done) return false;
  objective.failed = true;
  renderHud();
  return true;
}

export function setMissionState(fields) {
  if (!mission) return;
  Object.assign(mission, fields);
  renderHud();
}

export function addDiscovery(name) {
  if (!mission || mission.discoveries.indexOf(name) !== -1) return;
  mission.discoveries.push(name);
  renderHud();
}

export function currentObjective() {
  if (!mission) return null;
  return mission.objectives.find(function (o) { return !o.done; }) || null;
}

// ----- The progress panel -----
const hud = document.getElementById("mission-hud");
const hudTitle = document.getElementById("hud-title");
const hudMode = document.getElementById("hud-mode");
const hudStage = document.getElementById("hud-stage");
const hudStatus = document.getElementById("hud-status");
const hudCurrent = document.getElementById("hud-current");
const hudDistance = document.getElementById("hud-distance");
const hudSteps = document.getElementById("hud-steps");
const hudNext = document.getElementById("hud-next");
const hudRingFill = document.getElementById("hud-ring-fill");
const hudRingText = document.getElementById("hud-ring-text");
const hudDiscoveries = document.getElementById("hud-discoveries");
const hudToggle = document.getElementById("hud-toggle");
const hudFlash = document.getElementById("hud-flash");
const hudNextLabel = document.getElementById("hud-next-label");
const hudProgressText = document.getElementById("hud-progress-text");

let hudVisible = false;

export function setHudVisible(on) {
  hudVisible = on;
  renderHud();
}

export function renderHud() {
  const show = Boolean(mission) && hudVisible;
  hud.classList.toggle("hidden", !show);
  if (!mission) return;
  hudTitle.textContent = mission.title || "Custom mission";
  hudMode.textContent = mission.mode === "sandbox" ? "Free Build · fictional" : "Real mission";
  hudMode.className = "hud-mode " + (mission.mode === "sandbox" ? "fictional" : "historical");
  hudStage.textContent = mission.stage;
  hudStatus.textContent = mission.status;
  const current = currentObjective();
  hudCurrent.textContent = current
    ? current.text + (current.failed ? " (last try failed, try again)" : "")
    : "All objectives complete";
  hud.classList.toggle("now-failed", Boolean(current && current.failed));
  hudDistance.textContent = mission.distance || "";
  hudDistance.title = mission.distance || "";
  hudDistance.classList.toggle("hidden", !mission.distance);
  // One dot per objective: done, now, failed or still to come (the shape and colour both say it)
  hudSteps.innerHTML = "";
  mission.objectives.forEach(function (o) {
    const li = document.createElement("li");
    li.className = o.done ? "done" : o === current ? (o.failed ? "now failed" : "now") : o.failed ? "failed" : "";
    li.title = o.text + (o.done ? " (done)" : "");
    hudSteps.appendChild(li);
  });
  // Only the very next objective is written out
  const remaining = mission.objectives.filter(function (o) { return !o.done && o !== current; });
  hudNext.textContent = remaining.length ? remaining[0].text : "";
  if (hudNextLabel) hudNextLabel.classList.toggle("hidden", remaining.length === 0);
  const doneCount = mission.objectives.filter(function (o) { return o.done; }).length;
  const total = Math.max(1, mission.objectives.length);
  const circumference = 2 * Math.PI * 18;
  hudRingFill.style.strokeDasharray = circumference.toFixed(1);
  hudRingFill.style.strokeDashoffset = (circumference * (1 - doneCount / total)).toFixed(1);
  hudRingText.textContent = doneCount + "/" + mission.objectives.length;
  if (hudProgressText) hudProgressText.textContent = doneCount + " of " + mission.objectives.length + " objectives done";
  hudDiscoveries.textContent = mission.discoveries.length ? "✦ " + mission.discoveries.length + " found" : "";
  hudDiscoveries.title = mission.discoveries.join(", ");
  hudDiscoveries.classList.toggle("hidden", !mission.discoveries.length);
}

function flashHud(text) {
  hudFlash.textContent = "Objective complete · " + text;
  hudFlash.classList.remove("hidden");
  clearTimeout(flashHud.timer);
  flashHud.timer = setTimeout(function () { hudFlash.classList.add("hidden"); }, 3200);
}

// The "Mission" tab slides the panel out to the right edge and back (like the Solar System list)
hudToggle.addEventListener("click", function () {
  const collapsed = hud.classList.toggle("collapsed");
  hudToggle.setAttribute("aria-expanded", String(!collapsed));
  hudToggle.title = collapsed ? "Show the mission panel" : "Hide the mission panel";
});

// ----- Information cards (used by the exploration scene and My Collection) -----
const cardDialog = document.getElementById("info-card");
const cardKind = document.getElementById("card-kind");
const cardName = document.getElementById("card-name");
const cardFacts = document.getElementById("card-facts");
const cardNote = document.getElementById("card-note");
const cardSources = document.getElementById("card-sources");
const cardImage = document.getElementById("card-image");
const cardClose = document.getElementById("card-close");
const cardExplorer = document.getElementById("card-explorer");

export function showInfoCard(entry, justRecorded) {
  const c = entry.card;
  cardKind.textContent = (entry.kind === "target" ? "Science target" : entry.kind === "observe" ? "Observed from orbit" : "Historical equipment") +
    (justRecorded ? " · added to My Collection" : isRecorded(entry.id) ? " · in My Collection" : "");
  cardName.textContent = c.name;
  const facts = [
    ["Historical mission", c.mission], ["Launch year", String(c.year)], ["Location", c.location],
    ["Original purpose", c.purpose], ["How it was used", c.usage], ["Historical importance", c.importance], ["Current status", c.status]
  ];
  cardFacts.innerHTML = "";
  facts.forEach(function (f) {
    const li = document.createElement("li");
    const label = document.createElement("strong");
    label.textContent = f[0];
    li.appendChild(label);
    li.appendChild(document.createTextNode(f[1] || "Not recorded"));
    cardFacts.appendChild(li);
  });
  cardNote.textContent = "Virtual record only. The real object stays where it is in " + c.location +
    "; nothing in this simulation moves or retrieves it.";
  cardImage.innerHTML = "";
  if (c.image) {
    const a = document.createElement("a");
    a.href = c.image.url; a.target = "_blank"; a.rel = "noopener";
    a.textContent = "Official photograph: " + c.image.label;
    cardImage.appendChild(a);
  } else {
    cardImage.textContent = "No official photograph linked yet; see the sources.";
  }
  cardSources.innerHTML = "";
  (c.sources || []).forEach(function (s) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = s.url; a.target = "_blank"; a.rel = "noopener"; a.textContent = s.label;
    li.appendChild(a);
    cardSources.appendChild(li);
  });
  const catalogItem = c.catalogId ? findItem(c.catalogId) : null;
  cardExplorer.classList.toggle("hidden", !catalogItem);
  cardExplorer.onclick = function () {
    closeInfoCard();
    document.dispatchEvent(new CustomEvent("open-explorer", { detail: { itemId: c.catalogId } }));
  };
  cardDialog.classList.remove("hidden");
}

export function closeInfoCard() {
  if (cardDialog.classList.contains("hidden")) return false;
  cardDialog.classList.add("hidden");
  return true;
}

export function isInfoCardOpen() { return !cardDialog.classList.contains("hidden"); }

cardClose.addEventListener("click", closeInfoCard);
cardDialog.addEventListener("pointerdown", function (event) {
  if (event.target === cardDialog) closeInfoCard();
});
