// My Collection: the virtual archive of everything recorded while exploring, plus photos and virtual samples.
// Objects not yet found show only where to look. Nothing here changes the real objects, which stay where they are.

import { modelIcon } from "./explorer.js";
import { SMALL_OBJECTS } from "./equipment-models.js";
import { collectibles } from "../data/collectibles.js";
import { SITES } from "../data/simulator.js";
import { getRecords, getPhotos, getSamples, getPoints, onProgressChange, resetCollection, showInfoCard } from "./progress.js";
import { play } from "./sounds.js";

const grid = document.getElementById("collection-grid");
const summary = document.getElementById("collection-summary");
const photos = document.getElementById("collection-photos");
const samples = document.getElementById("collection-samples");
const resetButton = document.getElementById("collection-reset");

let visible = false;

export function renderCollection() {
  const records = getRecords();
  const found = collectibles.filter(function (c) { return records[c.id]; }).length;
  summary.textContent = found + " of " + collectibles.length + " records · " + getPhotos().length + " photos · " +
    getSamples().length + " virtual samples · " + getPoints() + " upgrade points";

  grid.innerHTML = "";
  const bySite = {};
  collectibles.forEach(function (c) { (bySite[c.site] = bySite[c.site] || []).push(c); });
  Object.keys(bySite).forEach(function (siteId) {
    const site = SITES[siteId];
    const heading = document.createElement("h3");
    heading.className = "collection-site";
    heading.textContent = site.name + " · " + site.mission;
    grid.appendChild(heading);
    const row = document.createElement("div");
    row.className = "collection-row";
    bySite[siteId].forEach(function (entry) {
      const record = records[entry.id];
      const tile = document.createElement("button");
      tile.className = "collection-tile" + (record ? " found" : " locked");
      tile.innerHTML = '<span class="ct-pic"><img alt=""></span><span class="ct-kind"></span><span class="ct-name"></span><span class="ct-meta"></span>';
      if (tile.querySelector) {
        // A picture of the object (shown as a dark shape until it is recorded)
        modelIcon(SMALL_OBJECTS.indexOf(entry.model) !== -1 ? { type: "equipment", key: entry.model } : { type: "model", key: entry.model === "lunar-module-descent" ? "lunar-module" : entry.model }, tile.querySelector("img"));
        tile.querySelector(".ct-kind").textContent = entry.kind === "target" ? "Science target" : entry.kind === "observe" ? "Observed" : "Equipment";
        tile.querySelector(".ct-name").textContent = record ? entry.card.name : "Not yet recorded";
        tile.querySelector(".ct-meta").textContent = record ? "Recorded " + record.date + " (" + record.how + ")" : "Explore " + site.name + " to find it";
      }
      tile.addEventListener("click", function () {
        if (!record) { play("noResults"); return; }
        play("open");
        showInfoCard(entry, false);
      });
      row.appendChild(tile);
    });
    grid.appendChild(row);
  });

  photos.innerHTML = "";
  if (!getPhotos().length) photos.innerHTML = '<p class="sim-empty">No photos yet. Use a camera (P) while exploring.</p>';
  getPhotos().forEach(function (photo) {
    const figure = document.createElement("figure");
    figure.className = "collection-photo";
    if (photo.image) {
      const img = document.createElement("img");
      img.src = photo.image;
      img.alt = photo.name;
      figure.appendChild(img);
    }
    const caption = document.createElement("figcaption");
    caption.textContent = photo.name + " · " + photo.site + " · " + photo.date;
    figure.appendChild(caption);
    photos.appendChild(figure);
  });

  samples.innerHTML = "";
  if (!getSamples().length) samples.innerHTML = '<li class="sim-empty">No virtual samples yet.</li>';
  getSamples().forEach(function (sample, i) {
    const li = document.createElement("li");
    li.textContent = "Sample " + (i + 1) + ": " + sample.name + " (" + sample.date + ")";
    samples.appendChild(li);
  });
}

// Two clicks, so a collection is never wiped by accident
let resetArmed = false;
resetButton.addEventListener("click", function () {
  if (!resetArmed) {
    resetArmed = true;
    resetButton.textContent = "Click again to erase everything";
    setTimeout(function () { resetArmed = false; resetButton.textContent = "Reset my collection"; }, 4000);
    return;
  }
  resetArmed = false;
  resetButton.textContent = "Reset my collection";
  resetCollection();
  play("toggleOff");
});

onProgressChange(function () { if (visible) renderCollection(); });

export function startCollection() {
  visible = true;
  renderCollection();
}

export function stopCollection() {
  visible = false;
}
