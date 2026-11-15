// Results: one dialog for every ending (#explore-results in index.html).
//   - a finished mission (with or without a surface stop)
//   - a free exploration ("Explore a World Directly")
//   - a saved record opened again from My Collection
// It always ends with three next steps: Fly another mission, See my collection, Replay in the
// Solar System (main.js wires those buttons). Nothing here is invented: every line comes from the
// mission's own objectives, discoveries and choices.

import { DESTINATIONS, SITES } from "../data/simulator.js";
import { saveMissionRecord } from "./progress.js";

const box = document.getElementById("explore-results");
const eyebrow = document.getElementById("results-eyebrow");
const title = document.getElementById("results-title");
const facts = document.getElementById("results-body");
const objectivesList = document.getElementById("results-objectives");
const savedNote = document.getElementById("results-saved");
const continueButton = document.getElementById("results-continue");
const solarNote = document.getElementById("results-solar-note");

const WORLD = { moon: "The Moon", mars: "Mars", orbit: "Earth orbit" };
// The world to show in the Solar System afterwards (null: show the whole system)
const BODY = {
  moon: "Moon", mars: "Mars", "earth-orbit": "Earth", orbit: "Earth", venus: "Venus", mercury: "Mercury",
  jupiter: "Jupiter", saturn: "Saturn", sun: "Sun"
};

const WITH_THE = { Moon: "the Moon", Sun: "the Sun" };

let shown = null;

// Turns the current mission (or a free exploration) into a summary that can be shown and saved
export function summarize(mission, extra) {
  extra = extra || {};
  const siteId = extra.siteId || (mission && mission.siteId) || null;
  const site = siteId ? SITES[siteId] : null;
  const destination = mission && DESTINATIONS[mission.destination];
  return {
    id: mission ? mission.recordId : "explore-" + Date.now(),
    kind: mission ? "mission" : "exploration",
    title: mission ? mission.title : "Exploring " + (site ? site.name : "a site"),
    mode: mission ? mission.mode : null,
    fictional: Boolean(mission ? mission.fictional || mission.suit : site && site.fictional),
    destination: destination ? destination.name : site ? WORLD[site.world] || site.world : "",
    site: site ? site.name : "",
    body: mission ? BODY[mission.destination] || null : site ? BODY[site.world] || null : null,
    date: new Date().toISOString().slice(0, 10),
    objectives: mission ? mission.objectives.map(function (o) { return { text: o.text, done: Boolean(o.done) }; }) : [],
    discoveries: mission ? mission.discoveries.slice() : (extra.discoveries || []),
    distance: extra.distance !== undefined ? extra.distance : null
  };
}

// Saves the summary to My Collection (same id = updated) and returns it
export function recordResults(summary) {
  saveMissionRecord(summary);
  return summary;
}

// opts: { fromCollection, canContinue } ("Return to Earth" is shown by main.js when there is a trip home)
export function openResults(summary, opts) {
  opts = opts || {};
  shown = summary;
  eyebrow.textContent = opts.fromCollection ? "Saved record · " + summary.date
    : summary.kind === "exploration" ? "Exploration complete" : "Mission complete";
  title.textContent = summary.title;

  facts.innerHTML = "";
  const done = summary.objectives.filter(function (o) { return o.done; }).length;
  [
    ["Destination", summary.destination],
    ["Site explored", summary.site],
    ["Mode", summary.mode === "sandbox" ? "Free Build" + (summary.fictional ? " (fictional elements labelled)" : "") : summary.mode === "historical" ? "Historical: as it really flew" : ""],
    ["Objectives", summary.objectives.length ? done + " of " + summary.objectives.length + " complete" : ""],
    ["Discoveries", summary.discoveries.length ? summary.discoveries.join(", ") : "None recorded"],
    ["Distance moved", summary.distance !== null && summary.distance !== undefined ? summary.distance + " m" : ""],
    ["Date", opts.fromCollection ? "" : summary.date]
  ].forEach(function (row) {
    if (!row[1]) return;
    const li = document.createElement("li");
    const label = document.createElement("strong");
    label.textContent = row[0];
    li.appendChild(label);
    li.appendChild(document.createTextNode(row[1]));
    facts.appendChild(li);
  });

  objectivesList.innerHTML = "";
  summary.objectives.forEach(function (o) {
    const li = document.createElement("li");
    li.className = o.done ? "done" : "";
    li.textContent = o.text;
    objectivesList.appendChild(li);
  });
  objectivesList.classList.toggle("hidden", !summary.objectives.length);

  savedNote.textContent = opts.fromCollection ? "" : "Saved to your Collection.";
  savedNote.classList.toggle("hidden", Boolean(opts.fromCollection));
  continueButton.classList.toggle("hidden", !opts.canContinue);
  if (opts.fromCollection) document.getElementById("results-return").classList.add("hidden");
  solarNote.textContent = summary.body ? "See " + (WITH_THE[summary.body] || summary.body) + " in the Solar System" : "Explore the whole Solar System";
  box.classList.remove("hidden");
  const first = document.getElementById("results-simulator");
  if (first && first.focus) first.focus();
}

export function closeResults() {
  if (box.classList.contains("hidden")) return false;
  box.classList.add("hidden");
  return true;
}

export function shownResults() {
  return shown;
}
