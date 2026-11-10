// The Missions section (Missions & Hardware merged): every mission with the hardware it used.
// Browse by where the mission went or by type of hardware; open any card for its 3D model and full profile.
// It reads data/catalog.js (and reuses the researched profiles in data/hardware.js and data/spacecraft.js).
// Every 3D model is a representative model built in code (js/models.js and js/rockets.js).
//
// Other files talk to it with:
//   openExplorer({ itemId, category, region, body, replayOnly })   (main.js, from the "open-explorer" message)
//   startExplorer() / stopExplorer()                                (main.js, when the screen is shown or hidden)
// It sends these messages (main.js handles them): replay-hardware, replay-mission, replay-spacecraft,
// watch-landing, explore-destination, show-in-solar.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { catalog, CATEGORIES, REGIONS, MODEL_NOTE, findItem, launchYear } from "../data/catalog.js";
import { MISSION_GROUPS, DESTINATIONS, roleOf, groupOfItem } from "../data/mission-groups.js";
import { hardwareList } from "../data/hardware.js";
import { spacecraftInfo } from "../data/spacecraft.js";
import { createModel, UPRIGHT_MODELS } from "./models.js";
import { createRocket } from "./rockets.js";
import { createEquipment } from "./equipment-models.js";
import { createSuitedAstronaut } from "./astronaut.js";
import { makePlanet } from "./planet-look.js";
import { createGlow } from "./glow.js";
import { play } from "./sounds.js";
import { onThemeChange, accentNumber } from "./theme.js";
import { guardContextLoss } from "./webgl-context.js";
import { onResizeDebounced } from "./resize.js";

// ----- Page elements -----
const screen = document.getElementById("explorer-screen");
const categoryList = document.getElementById("explorer-categories");
const titleText = document.getElementById("explorer-title");
const countText = document.getElementById("explorer-count");
const searchInput = document.getElementById("explorer-search");
const regionSelect = document.getElementById("explorer-region");
const statusSelect = document.getElementById("explorer-status");
const sortSelect = document.getElementById("explorer-sort");
const replayOnlyBox = document.getElementById("explorer-replay-only");
const clearButton = document.getElementById("explorer-clear");
const filterPill = document.getElementById("explorer-pill");
const grid = document.getElementById("explorer-grid");
const emptyText = document.getElementById("explorer-empty");
const breadcrumb = document.getElementById("explorer-breadcrumb");
const sidebar = document.getElementById("explorer-sidebar");
const viewButtons = document.querySelectorAll ? document.querySelectorAll("[data-explorer-view]") : [];
const viewNote = document.getElementById("explorer-view-note");
const eyebrow = document.getElementById("explorer-eyebrow");
const suggestList = document.getElementById("explorer-suggest");
const chipBox = document.getElementById("explorer-chips");
const mainArea = grid.parentElement;
const detailBack = document.getElementById("detail-back");
const detailCrumbs = document.getElementById("detail-crumbs");

const detail = document.getElementById("explorer-detail");
const detailClose = document.getElementById("detail-close");
const detailCanvas = document.getElementById("detail-canvas");
const detailCategory = document.getElementById("detail-category");
const detailName = document.getElementById("detail-name");
const detailStatus = document.getElementById("detail-status");
const detailActions = document.getElementById("detail-actions");
const detailDescription = document.getElementById("detail-description");
const detailKeyFacts = document.getElementById("detail-keyfacts");
const detailBackground = document.getElementById("detail-background");
const detailPurpose = document.getElementById("detail-purpose");
const detailSpecs = document.getElementById("detail-specs");
const detailTimeline = document.getElementById("detail-timeline");
const detailStatusText = document.getElementById("detail-status-text");
const detailRelated = document.getElementById("detail-related");
const detailImage = document.getElementById("detail-image");
const detailSources = document.getElementById("detail-sources");
const detailModelNote = document.getElementById("detail-model-note");
const viewerAuto = document.getElementById("viewer-auto");
const viewerDeploy = document.getElementById("viewer-deploy");
const viewerChutes = document.getElementById("viewer-chutes");
const viewerReset = document.getElementById("viewer-reset");

// ----- Filter state -----
const state = {
  category: "all",
  search: "",
  region: "",
  status: "",
  sort: "year",
  replayOnly: false,
  dest: "",           // a destination group from data/mission-groups.js ("" = everywhere)
  body: ""            // set when coming from a planet's info panel: only items linked to that body
};

const STATUS_GROUPS = ["Operating", "Active", "On the surface", "Completed", "Ended", "Retired", "Flown"];

// ----- Merging the catalog with the researched profiles -----
// A catalog item can point to a hardware profile or a spacecraft profile. Anything the item does not say itself
// is taken from that profile, so each fact is written in one place only.
const resolvedCache = {};

function uniqueSources(lists) {
  const seen = {};
  const result = [];
  lists.forEach(function (list) {
    (list || []).forEach(function (source) {
      if (!source || seen[source.url]) return;
      seen[source.url] = true;
      result.push(source);
    });
  });
  return result;
}

export function resolveItem(item) {
  if (resolvedCache[item.id]) return resolvedCache[item.id];

  const hw = item.hardware ? hardwareList.find(function (entry) { return entry.id === item.hardware; }) : null;
  const craft = item.spacecraft ? spacecraftInfo[item.spacecraft] : null;
  const rocket = item.rocket ? findItem(item.rocket) : null;

  const status = Object.assign({}, item.status || {});
  if (!status.text && hw) status.text = hw.status.text;
  if (!status.asOf && hw && hw.status.asOf) status.asOf = hw.status.asOf;
  if (!status.text && craft) {
    const fact = craft.facts.find(function (f) { return f[0].indexOf("Status") === 0; });
    if (fact) status.text = fact[1];
  }

  let specs = item.specs ? item.specs.slice() : [];
  if (craft) {
    craft.facts.forEach(function (fact) {
      if (fact[0].indexOf("Status") === 0 || fact[0] === "Launch") return;
      specs.push(fact);
    });
  }

  const resolved = {
    item: item,
    description: item.description || (hw && hw.summary) || (craft && craft.summary) || "",
    background: item.background || (hw && hw.contributions ? hw.contributions.join(" ") : "") || "",
    purpose: item.purpose || (hw && hw.purpose) || "",
    timeline: item.timeline || (hw && hw.history) ||
      (craft && craft.replay ? craft.replay.map(function (e) { return { date: e.date, text: e.title + ". " + e.caption }; }) : []),
    specs: specs,
    status: status,
    vehicle: item.vehicle || (rocket ? rocket.name : ""),
    rocket: rocket,
    image: item.image || (hw && hw.image ? { label: "Official image page (" + (hw.image.credit || "NASA") + ")", url: hw.image.pageUrl } : null),
    sources: uniqueSources([item.sources, hw && hw.sources, craft && craft.sources]),
    year: launchYear(item)
  };
  resolvedCache[item.id] = resolved;
  return resolved;
}

function categoryName(id) {
  const category = CATEGORIES.find(function (c) { return c.id === id; });
  return category ? category.name : id;
}

function statusClass(label) {
  const key = String(label || "").toLowerCase();
  if (key === "operating" || key === "active") return "live";
  if (key === "on the surface") return "rest";
  return "past";
}

// ----- Building the sidebar (once) -----
// Two ways in, both about missions: WHERE the mission went, and WHAT KIND of hardware you want to see.
function sidebarRow(label, meta, dot, onClick, data) {
  const row = document.createElement("button");
  row.className = "sidebar-item explorer-cat";
  Object.keys(data).forEach(function (key) { row.dataset[key] = data[key]; });
  row.innerHTML = '<span class="sb-dot"></span><span class="sb-name"></span><span class="sb-meta"></span>';
  if (row.querySelector) {
    row.querySelector(".sb-name").textContent = label;
    row.querySelector(".sb-meta").textContent = meta;
    if (dot) row.querySelector(".sb-dot").style.setProperty("--dot", dot);
  }
  row.addEventListener("click", function () {
    onClick();
    sidebar.classList.remove("open");
    play("tick");
    render();
  });
  categoryList.appendChild(row);
  return row;
}
function sidebarHeading(text) {
  const heading = document.createElement("p");
  heading.className = "sidebar-heading";
  heading.textContent = text;
  categoryList.appendChild(heading);
}
const DEST_DOTS = { earth: "#4c8dff", moon: "#b9b6b0", mars: "#d9692f", inner: "#e8b24a", outer: "#c9a77a", small: "#8f877d" };

function buildCategories() {
  categoryList.innerHTML = "";
  sidebarHeading("Where they went");
  sidebarRow("All missions", String(MISSION_GROUPS.length), "#7ab8ff", function () { state.dest = ""; state.region = ""; }, { dest: "" });
  DESTINATIONS.forEach(function (dest) {
    const count = MISSION_GROUPS.filter(function (g) { return g.where === dest.id; }).length;
    sidebarRow(dest.name, String(count), DEST_DOTS[dest.id], function () { state.dest = dest.id; state.region = ""; }, { dest: dest.id });
  });
  sidebarHeading("What it is");
  sidebarRow("All hardware", String(catalog.length), "#a3adbf", function () { state.category = "all"; }, { category: "all" });
  CATEGORIES.forEach(function (category) {
    const count = catalog.filter(function (item) { return item.category === category.id; }).length;
    sidebarRow(category.short === "Rockets" ? "Launch vehicles" : category.short, String(count), null, function () { state.category = category.id; }, { category: category.id });
  });
}

function fillSelect(select, firstLabel, values) {
  select.innerHTML = "";
  const first = document.createElement("option");
  first.value = "";
  first.textContent = firstLabel;
  select.appendChild(first);
  values.forEach(function (value) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

fillSelect(regionSelect, "All destinations", REGIONS);
fillSelect(statusSelect, "Any status", STATUS_GROUPS);
buildCategories();

// ----- Filtering -----
function matches(item) {
  if (state.category !== "all" && item.category !== state.category) return false;
  if (state.region && item.region !== state.region) return false;
  if (state.body && (item.bodies || []).indexOf(state.body) === -1) return false;
  if (state.status && (!item.status || item.status.label !== state.status)) return false;
  if (state.replayOnly && !item.replay) return false;
  const query = state.search.trim();
  if (query) {
    const text = searchText(item);
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    // "rovers" also finds "rover": a plural word matches its singular
    if (!words.every(function (word) {
      return text.indexOf(word) !== -1 || (word.length > 3 && word.slice(-1) === "s" && text.indexOf(word.slice(0, -1)) !== -1);
    })) return false;
  }
  return true;
}

// Everything one search box can find: name, mission, role, rocket, place, year and status
const searchCache = {};
function searchText(item) {
  if (searchCache[item.id]) return searchCache[item.id];
  const resolved = resolveItem(item);
  const group = groupOfItem(item.id);
  const text = [item.name, item.mission, group ? group.name : "", roleOf(item), item.destination, item.region, resolved.vehicle,
    categoryName(item.category), item.launchDate, item.status && item.status.label]
    .join(" ").toLowerCase();
  searchCache[item.id] = text;
  return text;
}

function sortItems(items) {
  return items.slice().sort(function (a, b) {
    if (state.sort === "name") return a.name.localeCompare(b.name);
    const ya = launchYear(a) || 9999;
    const yb = launchYear(b) || 9999;
    if (state.sort === "newest") return yb - ya || a.name.localeCompare(b.name);
    return ya - yb || a.name.localeCompare(b.name);
  });
}

// ----- Cards -----
const cardThumbs = {}; // item id -> the card's thumbnail <img>

function makeCard(item) {
  const resolved = resolveItem(item);
  const card = document.createElement("button");
  card.className = "hw-card";
  card.setAttribute("aria-label", item.name + ", " + roleOf(item));

  card.innerHTML =
    '<span class="hw-thumb"><img alt=""><span class="hw-thumb-tag">3D</span></span>' +
    '<span class="hw-card-body">' +
    '<span class="hw-card-cat"></span>' +
    '<span class="hw-card-name"></span>' +
    '<span class="hw-card-meta"><span class="m-mission"></span></span>' +
    '<span class="hw-card-grid">' +
    '<span><em>Launch</em><b class="m-year"></b></span>' +
    '<span><em class="m-vehicle-label">Vehicle</em><b class="m-vehicle"></b></span>' +
    '<span><em>Destination</em><b class="m-dest"></b></span>' +
    '<span><em>Status</em><b class="m-status"></b></span>' +
    "</span></span>";

  if (card.querySelector) {
    card.querySelector(".hw-card-cat").textContent = roleOf(item);
    card.querySelector(".hw-card-name").textContent = item.name;
    card.querySelector(".m-mission").textContent = item.mission || "";
    card.querySelector(".m-year").textContent = resolved.year || "—";
    // Rockets have no launch vehicle of their own, so their card shows what they launched instead
    if (item.category === "rockets") card.querySelector(".m-vehicle-label").textContent = "Launched";
    card.querySelector(".m-vehicle").textContent = item.category === "rockets" ? (item.mission || "—") : (resolved.vehicle || "—");
    card.querySelector(".m-dest").textContent = item.destination || "—";
    const status = card.querySelector(".m-status");
    status.textContent = (item.status && item.status.label) || "—";
    status.className = "m-status status-" + statusClass(item.status && item.status.label);
    const img = card.querySelector("img");
    cardThumbs[item.id] = img;
    requestThumbnail(item, img);
  }

  card.addEventListener("click", function () { openDetail(item.id); });
  card.addEventListener("pointerenter", function () { play("hover"); });
  return card;
}

function sortGroups(groups) {
  return groups.slice().sort(function (a, b) {
    if (state.sort === "name") return a.name.localeCompare(b.name);
    if (state.sort === "newest") return b.year - a.year || a.name.localeCompare(b.name);
    return a.year - b.year || a.name.localeCompare(b.name);
  });
}

function destName(id) {
  const dest = DESTINATIONS.find(function (d) { return d.id === id; });
  return dest ? dest.name : "";
}

// One mission: its name and year, where it went, what launched it, a replay button, and its hardware
function makeMissionBlock(group, items) {
  const block = document.createElement("section");
  block.className = "mission-block";
  block.dataset.mission = group.id;
  const head = document.createElement("header");
  head.className = "mb-head";
  head.innerHTML = '<span class="mb-year"></span><div class="mb-title"><h3></h3><p class="mb-meta"></p></div><div class="mb-actions"></div>';
  const all = group.items.map(findItem).filter(Boolean);
  if (head.querySelector) {
    head.querySelector(".mb-year").textContent = String(group.year);
    head.querySelector("h3").textContent = group.name;
    const meta = head.querySelector(".mb-meta");
    meta.appendChild(document.createTextNode(destName(group.where)));
    // Launch vehicles: links to the rocket's own page (each rocket is described once, in its own page)
    const rockets = [];
    all.forEach(function (item) {
      const rocket = item.rocket ? findItem(item.rocket) : null;
      if (rocket && rockets.indexOf(rocket) === -1) rockets.push(rocket);
    });
    if (rockets.length) {
      meta.appendChild(document.createTextNode(" \u00B7 launched on "));
      rockets.forEach(function (rocket, i) {
        if (i) meta.appendChild(document.createTextNode(" and "));
        const button = document.createElement("button");
        button.className = "inline-link";
        button.textContent = rocket.name;
        button.addEventListener("click", function () { openDetail(rocket.id); });
        meta.appendChild(button);
      });
    }
    const withReplay = all.find(function (item) { return item.replay; });
    if (withReplay) {
      const replay = document.createElement("button");
      replay.className = "small-button primary mb-replay";
      replay.innerHTML = '<span aria-hidden="true">\u25B6</span> Replay mission';
      replay.addEventListener("click", replayAction(withReplay));
      head.querySelector(".mb-actions").appendChild(replay);
    }
  }
  block.appendChild(head);
  const row = document.createElement("div");
  row.className = "mb-items";
  items.forEach(function (item) { row.appendChild(makeCard(item)); });
  block.appendChild(row);
  return block;
}

function render() {
  const items = sortItems(catalog.filter(matches));
  grid.innerHTML = "";
  let shown = 0;
  let missionsShown = 0;

  // Searching (or a quick topic) shows one list of results, grouped by status, oldest first
  const searching = Boolean(state.search.trim()) || state.replayOnly || Boolean(state.status);
  // Launch vehicles are shared by many missions, so they are listed on their own
  const flat = state.category === "rockets" && !searching;
  grid.classList.toggle("grouped", !flat && !searching);
  grid.classList.toggle("results", searching);
  if (searching) {
    renderResults(items);
    shown = items.length;
  } else if (flat) {
    items.forEach(function (item) { grid.appendChild(makeCard(item)); });
    shown = items.length;
  } else {
    sortGroups(MISSION_GROUPS).forEach(function (group) {
      if (state.dest && group.where !== state.dest) return;
      const groupItems = group.items.map(findItem).filter(function (item) { return item && matches(item); });
      if (!groupItems.length) return;
      grid.appendChild(makeMissionBlock(group, groupItems));
      shown += groupItems.length;
      missionsShown++;
    });
  }
  emptyText.classList.toggle("hidden", shown > 0);

  const typeTitle = state.category === "all" ? "" : categoryName(state.category);
  const destTitle = state.dest ? destName(state.dest) : (state.region || "");
  titleText.textContent = searching ? "Search results" : flat ? "Launch vehicles" : (destTitle || "All missions") + (typeTitle ? " \u00B7 " + typeTitle : "");
  eyebrow.textContent = searching ? "Grouped by status \u00B7 oldest first" : flat ? "The rockets that launched these missions" : "Missions and the hardware they used";
  countText.textContent = searching
    ? shown + (shown === 1 ? " result" : " results") + (state.search.trim() ? " for \u201C" + state.search.trim() + "\u201D" : "")
    : flat
    ? shown + (shown === 1 ? " rocket" : " rockets")
    : missionsShown + (missionsShown === 1 ? " mission" : " missions") + " \u00B7 " + shown + (shown === 1 ? " piece" : " pieces") + " of hardware" +
      (state.body ? " \u00B7 linked to " + state.body : "");
  breadcrumb.textContent = titleText.textContent === "All missions" ? "" : titleText.textContent;

  filterPill.classList.toggle("hidden", !state.body);
  if (state.body) filterPill.textContent = "Linked to " + state.body + "  \u00D7";

  Array.from(categoryList.children).forEach(function (row) {
    if (!row.dataset) return;
    let active = false;
    if (row.dataset.dest !== undefined) active = row.dataset.dest === state.dest && !state.region;
    if (row.dataset.category !== undefined) active = row.dataset.category === state.category;
    if (row.classList) row.classList.toggle("active", active);
    if (row.setAttribute) row.setAttribute("aria-current", active ? "true" : "false");
  });

  if (document.activeElement !== searchInput) searchInput.value = state.search;
  updateChips();
  regionSelect.value = state.region;
  statusSelect.value = state.status;
  sortSelect.value = state.sort;
  replayOnlyBox.checked = state.replayOnly;
}

// ----- Results: one list, grouped by status, oldest first -----
const STATUS_ORDER = STATUS_GROUPS.concat(["Other"]);
function renderResults(items) {
  const byStatus = {};
  items.forEach(function (item) {
    const label = item.status && STATUS_GROUPS.indexOf(item.status.label) !== -1 ? item.status.label : "Other";
    (byStatus[label] = byStatus[label] || []).push(item);
  });
  STATUS_ORDER.forEach(function (label) {
    const list = byStatus[label];
    if (!list) return;
    const section = document.createElement("section");
    section.className = "result-group";
    const head = document.createElement("h3");
    head.className = "result-head";
    head.innerHTML = '<span class="status-dot status-' + statusClass(label) + '"></span><span></span><em></em>';
    if (head.querySelector) {
      head.querySelector("span:nth-child(2)").textContent = label;
      head.querySelector("em").textContent = String(list.length);
    }
    section.appendChild(head);
    list.slice().sort(function (a, b) { return (launchYear(a) || 9999) - (launchYear(b) || 9999) || a.name.localeCompare(b.name); })
      .forEach(function (item) { section.appendChild(makeResultRow(item)); });
    grid.appendChild(section);
  });
}

function makeResultRow(item) {
  const group = groupOfItem(item.id);
  const row = document.createElement("button");
  row.className = "result-row";
  row.setAttribute("aria-label", item.name + ", " + roleOf(item));
  row.innerHTML = '<span class="rr-thumb"><img alt=""></span><span class="rr-text"><b></b><span class="rr-meta"></span></span>' +
    '<span class="rr-year"></span><span class="rr-dest"></span>';
  if (row.querySelector) {
    row.querySelector("b").textContent = item.name;
    row.querySelector(".rr-meta").textContent = roleOf(item) + (group ? " \u00B7 " + group.name : item.mission ? " \u00B7 " + item.mission : "");
    row.querySelector(".rr-year").textContent = String(launchYear(item) || "\u2014");
    row.querySelector(".rr-dest").textContent = item.destination || "";
    requestThumbnail(item, row.querySelector("img"));
  }
  row.addEventListener("click", function () { openDetail(item.id); });
  return row;
}

// ----- Quick topics (chips) -----
const CHIPS = [
  { label: "Moon", query: "moon" }, { label: "Mars", query: "mars" }, { label: "Rovers", query: "rover" },
  { label: "Telescopes", query: "telescope" }, { label: "Sample return", query: "sample" }, { label: "Apollo", query: "apollo" },
  { label: "Still operating", query: "operating" }, { label: "Has a replay", replay: true }
];
const chipButtons = CHIPS.map(function (chip) {
  const button = document.createElement("button");
  button.className = "ms-chip";
  button.textContent = chip.label;
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("click", function () {
    play("tick");
    if (chip.replay) state.replayOnly = !state.replayOnly;
    else state.search = state.search.trim().toLowerCase() === chip.query ? "" : chip.query;
    searchInput.value = state.search;
    hideSuggestions();
    render();
  });
  chipBox.appendChild(button);
  return { chip: chip, button: button };
});
function updateChips() {
  chipButtons.forEach(function (entry) {
    const on = entry.chip.replay ? state.replayOnly : state.search.trim().toLowerCase() === entry.chip.query;
    entry.button.classList.toggle("active", on);
    entry.button.setAttribute("aria-pressed", String(on));
  });
}

// ----- Suggestions as you type: missions, hardware and places -----
let suggestions = [];
let activeSuggestion = -1;
function hideSuggestions() {
  suggestList.classList.add("hidden");
  searchInput.setAttribute("aria-expanded", "false");
  suggestions = [];
  activeSuggestion = -1;
}
function showSuggestions() {
  const query = searchInput.value.trim().toLowerCase();
  suggestList.innerHTML = "";
  suggestions = [];
  if (query.length < 2) { hideSuggestions(); return; }
  MISSION_GROUPS.forEach(function (group) {
    if (group.name.toLowerCase().indexOf(query) !== -1) suggestions.push({ kind: "Mission", label: group.name, meta: String(group.year), group: group });
  });
  DESTINATIONS.forEach(function (dest) {
    if (dest.name.toLowerCase().indexOf(query) !== -1) suggestions.push({ kind: "Place", label: dest.name, meta: dest.hint, dest: dest });
  });
  catalog.forEach(function (item) {
    if (item.name.toLowerCase().indexOf(query) !== -1) suggestions.push({ kind: roleOf(item), label: item.name, meta: String(launchYear(item) || ""), item: item });
  });
  suggestions = suggestions.slice(0, 7);
  if (!suggestions.length) { hideSuggestions(); return; }
  suggestions.forEach(function (entry, i) {
    const li = document.createElement("li");
    li.className = "ms-suggestion";
    li.setAttribute("role", "option");
    li.innerHTML = '<em></em><b></b><span></span>';
    if (li.querySelector) {
      li.querySelector("em").textContent = entry.kind;
      li.querySelector("b").textContent = entry.label;
      li.querySelector("span").textContent = entry.meta;
    }
    li.addEventListener("mousedown", function (event) { if (event.preventDefault) event.preventDefault(); chooseSuggestion(i); });
    suggestList.appendChild(li);
  });
  activeSuggestion = -1;
  suggestList.classList.remove("hidden");
  searchInput.setAttribute("aria-expanded", "true");
}
function chooseSuggestion(i) {
  const entry = suggestions[i];
  if (!entry) return;
  play("select");
  hideSuggestions();
  if (entry.item) { openDetail(entry.item.id); return; }
  if (entry.dest) { state.dest = entry.dest.id; state.search = ""; }
  else state.search = entry.label;
  searchInput.value = state.search;
  render();
}
function highlightSuggestion() {
  Array.from(suggestList.children).forEach(function (li, i) { li.classList.toggle("active", i === activeSuggestion); });
}

searchInput.addEventListener("input", function () {
  state.search = searchInput.value;
  showSuggestions();
  render();
});
searchInput.addEventListener("keydown", function (event) {
  if (event.key === "ArrowDown" && suggestions.length) {
    if (event.preventDefault) event.preventDefault();
    activeSuggestion = (activeSuggestion + 1) % suggestions.length;
    highlightSuggestion();
  } else if (event.key === "ArrowUp" && suggestions.length) {
    if (event.preventDefault) event.preventDefault();
    activeSuggestion = (activeSuggestion - 1 + suggestions.length) % suggestions.length;
    highlightSuggestion();
  } else if (event.key === "Enter") {
    if (activeSuggestion >= 0) chooseSuggestion(activeSuggestion);
    else hideSuggestions();
  } else if (event.key === "Escape") {
    // Escape in the search box only closes the suggestions (or clears the text); it never leaves the page
    if (event.stopPropagation) event.stopPropagation();
    if (!suggestList.classList.contains("hidden")) hideSuggestions();
    else if (searchInput.value) { searchInput.value = ""; state.search = ""; render(); }
    else searchInput.blur && searchInput.blur();
  }
});
searchInput.addEventListener("blur", function () { setTimeout(hideSuggestions, 120); });
regionSelect.addEventListener("change", function () { state.region = regionSelect.value; play("tick"); render(); });
statusSelect.addEventListener("change", function () { state.status = statusSelect.value; play("tick"); render(); });
sortSelect.addEventListener("change", function () { state.sort = sortSelect.value; play("tick"); render(); });
replayOnlyBox.addEventListener("change", function () { state.replayOnly = replayOnlyBox.checked; render(); });
clearButton.addEventListener("click", function () {
  state.category = "all"; state.search = ""; state.region = ""; state.status = ""; state.replayOnly = false; state.body = ""; state.dest = "";
  searchInput.value = "";
  hideSuggestions();
  render();
});
filterPill.addEventListener("click", function () { state.body = ""; render(); });

// ----- 3D models: building and framing -----
function buildModel(item) {
  if (!item.model) return null;
  if (item.model.type === "rocket") return createRocket(item.model.key);
  if (item.model.type === "astronaut") {
    const astronaut = createSuitedAstronaut(item.model.key);
    astronaut.userData.animate(item.model.pose || "idle", 0.3, {});
    return astronaut;
  }
  if (item.model.type === "equipment") return createEquipment(item.model.key);
  if (item.model.type === "planet") {
    // A real-texture planet picture; when the photo map arrives, the picture is drawn again with it
    const key = thumbKey(item);
    const planet = makePlanet(item.model.key, 1, createGlow, function () { redrawThumb(key, item); });
    planet.rotation.y = -1.2;
    return planet;
  }
  return createModel(item.model.key);
}

// Small 3D icons for other pages (the Simulator's cards): spec = { type: "rocket" | "model" | "astronaut", key }
export function modelIcon(spec, img) {
  requestThumbnail({ model: spec }, img);
}

// Places the model in a holder so its center is at the origin, and returns its size
function centerModel(model) {
  const holder = new THREE.Group();
  holder.add(model);
  if (model.userData.chutes) model.userData.chutes.visible = false;
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  model.position.sub(center);
  holder.userData.radius = Math.max(size.x, size.y, size.z) * 0.5 || 1;
  holder.userData.height = size.y;
  return holder;
}

function cameraFor(camera, holder, item) {
  const radius = holder.userData.radius;
  const distance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.05;
  const tall = item.model && item.model.type === "rocket";
  const direction = tall ? new THREE.Vector3(0.85, 0.12, 1) : new THREE.Vector3(1, 0.55, 1.2);
  camera.position.copy(direction.normalize().multiplyScalar(distance));
  camera.near = distance / 100;
  camera.far = distance * 10;
  camera.updateProjectionMatrix();
  camera.lookAt(0, 0, 0);
}

function addLights(scene) {
  const key = new THREE.DirectionalLight(0xfff1e0, 2.6);
  key.position.set(5, 6, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fb8ff, 0.9);
  rim.position.set(-6, 2, -5);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
}

// ----- Thumbnails: one shared renderer draws every model once and keeps the picture -----
let thumbRenderer = null;
let thumbScene = null;
let thumbCamera = null;
const thumbCache = {};   // model key -> data URL
const thumbQueue = [];
let thumbScheduled = false;

function thumbKey(item) {
  return item.model ? item.model.type + ":" + item.model.key : "none";
}

const thumbImages = {}; // model key -> every <img> showing that picture
function redrawThumb(key, item) {
  if (!thumbCache[key]) return; // not drawn yet: it will use the photo map when it is drawn
  delete thumbCache[key];
  (thumbImages[key] || []).forEach(function (img, i) { if (i === 0) thumbQueue.push({ item: item, img: img, key: key }); });
  if (!thumbScheduled) { thumbScheduled = true; requestAnimationFrame(drawThumbnails); }
}

function requestThumbnail(item, img) {
  const key = thumbKey(item);
  (thumbImages[key] = thumbImages[key] || []).push(img);
  if (thumbCache[key]) {
    img.src = thumbCache[key];
    return;
  }
  thumbQueue.push({ item: item, img: img, key: key });
  if (!thumbScheduled) {
    thumbScheduled = true;
    requestAnimationFrame(drawThumbnails);
  }
}

function drawThumbnails() {
  thumbScheduled = false;
  if (!thumbRenderer) {
    try {
      const canvas = document.createElement("canvas");
      thumbRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
      guardContextLoss(canvas);
      thumbRenderer.setPixelRatio(1);
      thumbRenderer.setSize(360, 240, false);
      thumbScene = new THREE.Scene();
      addLights(thumbScene);
      thumbCamera = new THREE.PerspectiveCamera(30, 360 / 240, 0.01, 1000);
    } catch (error) {
      console.warn("Explorer thumbnails are not available (WebGL failed).", error);
      thumbQueue.length = 0;
      return;
    }
  }

  // Draw two models per frame, so the page stays smooth
  const started = performance.now();
  let drawn = 0;
  while (thumbQueue.length && drawn < 2 && performance.now() - started < 24) {
    const job = thumbQueue.shift();
    if (thumbCache[job.key]) {
      job.img.src = thumbCache[job.key];
      continue;
    }
    const model = buildModel(job.item);
    if (!model) continue;
    const holder = centerModel(model);
    holder.rotation.y = -0.5;
    thumbScene.add(holder);
    cameraFor(thumbCamera, holder, job.item);
    thumbRenderer.render(thumbScene, thumbCamera);
    thumbCache[job.key] = thumbRenderer.domElement.toDataURL("image/png");
    thumbScene.remove(holder);
    disposeObject(holder);
    job.img.src = thumbCache[job.key];
    (thumbImages[job.key] || []).forEach(function (img) { img.src = thumbCache[job.key]; });
    // other cards waiting for the same model get the same picture
    thumbQueue.filter(function (other) { return other.key === job.key; }).forEach(function (other) {
      other.img.src = thumbCache[job.key];
    });
    drawn++;
  }
  if (thumbQueue.length) {
    thumbScheduled = true;
    requestAnimationFrame(drawThumbnails);
  }
}

function disposeObject(object) {
  object.traverse(function (child) {
    if (child.geometry) child.geometry.dispose();
  });
}

// ----- The large, interactive model in the detail panel -----
let viewer = null;

function setupViewer() {
  if (viewer) return viewer;
  const renderer = new THREE.WebGLRenderer({ canvas: detailCanvas, antialias: true, alpha: true });
  guardContextLoss(detailCanvas);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  addLights(scene);

  // A faint ring under the model, like a museum plinth
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.98, 1, 96),
    new THREE.MeshBasicMaterial({ color: accentNumber(), transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 1000);
  const controls = new OrbitControls(camera, detailCanvas);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.2;

  viewer = {
    renderer: renderer, scene: scene, camera: camera, controls: controls, ring: ring,
    holder: null, item: null, animationId: null, deploy: 1, deployGoal: 1, chutes: false
  };
  onThemeChange(function () { ring.material.color.set(accentNumber()); });
  return viewer;
}

function resizeViewer() {
  if (!viewer) return;
  const width = detailCanvas.clientWidth || 600;
  const height = detailCanvas.clientHeight || 380;
  viewer.renderer.setSize(width, height, false);
  viewer.camera.aspect = width / height;
  viewer.camera.updateProjectionMatrix();
}

function showViewerModel(item) {
  const v = setupViewer();
  if (v.holder) {
    v.scene.remove(v.holder);
    disposeObject(v.holder);
    v.holder = null;
  }
  v.item = item;
  const model = buildModel(item);
  if (!model) return;
  const holder = centerModel(model);
  v.holder = holder;
  v.model = model;
  v.scene.add(holder);

  const radius = holder.userData.radius;
  v.ring.scale.setScalar(radius * 1.1);
  const upright = item.model.type === "rocket" || UPRIGHT_MODELS.has(item.model.key);
  v.ring.position.y = upright ? -holder.userData.height / 2 : -radius * 0.9;

  resizeViewer();
  cameraFor(v.camera, holder, item);
  v.controls.target.set(0, 0, 0);
  v.controls.minDistance = radius * 0.6;
  v.controls.maxDistance = radius * 8;
  v.controls.update();
  v.home = v.camera.position.clone();

  const canDeploy = Boolean(model.userData.setDeploy);
  v.deploy = 1;
  v.deployGoal = 1;
  viewerDeploy.classList.toggle("hidden", !canDeploy);
  viewerDeploy.textContent = "Fold up";
  const hasChutes = Boolean(model.userData.chutes);
  v.chutes = false;
  viewerChutes.classList.toggle("hidden", !hasChutes);
  viewerChutes.textContent = "Show parachutes";
}

function viewerLoop() {
  if (!viewer) return;
  viewer.animationId = requestAnimationFrame(viewerLoop);
  const model = viewer.model;
  if (model && model.userData.setDeploy && viewer.deploy !== viewer.deployGoal) {
    const step = 0.012;
    viewer.deploy += Math.sign(viewer.deployGoal - viewer.deploy) * step;
    if (Math.abs(viewer.deploy - viewer.deployGoal) < step) viewer.deploy = viewer.deployGoal;
    model.userData.setDeploy(viewer.deploy);
  }
  if (model && model.userData.update) model.userData.update(1 / 60);
  viewer.controls.update();
  viewer.renderer.render(viewer.scene, viewer.camera);
}

function startViewer() {
  if (!viewer || viewer.animationId !== null) return;
  viewerLoop();
}

function stopViewer() {
  if (viewer && viewer.animationId !== null) {
    cancelAnimationFrame(viewer.animationId);
    viewer.animationId = null;
  }
}

viewerAuto.addEventListener("click", function () {
  if (!viewer) return;
  viewer.controls.autoRotate = !viewer.controls.autoRotate;
  viewerAuto.textContent = viewer.controls.autoRotate ? "Stop rotating" : "Auto-rotate";
  viewerAuto.setAttribute("aria-pressed", String(viewer.controls.autoRotate));
});
viewerDeploy.addEventListener("click", function () {
  if (!viewer) return;
  viewer.deployGoal = viewer.deployGoal > 0.5 ? 0 : 1;
  viewerDeploy.textContent = viewer.deployGoal > 0.5 ? "Fold up" : "Unfold";
  play("separation");
});
viewerChutes.addEventListener("click", function () {
  if (!viewer || !viewer.model || !viewer.model.userData.chutes) return;
  viewer.chutes = !viewer.chutes;
  viewer.model.userData.chutes.visible = viewer.chutes;
  viewerChutes.textContent = viewer.chutes ? "Hide parachutes" : "Show parachutes";
  play("pop");
});
viewerReset.addEventListener("click", function () {
  if (!viewer || !viewer.home) return;
  viewer.camera.position.copy(viewer.home);
  viewer.controls.target.set(0, 0, 0);
});
onResizeDebounced(resizeViewer);

// ----- The detail panel -----
let openId = null;

function listItems(element, rows, make) {
  element.innerHTML = "";
  rows.forEach(function (row) { element.appendChild(make(row)); });
}

function link(url, text) {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener";
  a.textContent = text;
  return a;
}

function actionButton(text, className, onClick) {
  const button = document.createElement("button");
  button.className = className;
  button.textContent = text;
  button.addEventListener("click", onClick);
  detailActions.appendChild(button);
  return button;
}

function send(name, detailData) {
  document.dispatchEvent(new CustomEvent(name, { detail: detailData }));
}

function replayAction(item) {
  const replay = item.replay;
  if (replay.type === "hardware") return function () { send("replay-hardware", { hardwareId: replay.id }); };
  if (replay.type === "mission") return function () { send("replay-mission", { missionId: replay.id }); };
  return function () {
    const info = spacecraftInfo[replay.id];
    const launch = info.replay[0];
    send("replay-spacecraft", {
      name: replay.id,
      caption: replay.id + " · " + launch.title + " · " + launch.date,
      rocket: launch.rocket
    });
  };
}

// ----- Back navigation: remember where the list was, and let the browser's Back button close the detail -----
let savedScroll = 0;
let historyPushed = false;
const canHistory = typeof window !== "undefined" && window.history && window.history.pushState;

function fillCrumbs(item) {
  detailCrumbs.innerHTML = "";
  const group = groupOfItem(item.id);
  const steps = [{ label: "Missions", action: function () { closeDetail(); } }];
  if (group) steps.push({ label: group.name, action: function () { closeDetail(); scrollToMission(group.id); } });
  else if (item.category === "rockets") steps.push({ label: "Launch vehicles", action: function () { state.category = "rockets"; closeDetail(); } });
  steps.push({ label: item.name });
  steps.forEach(function (step) {
    const li = document.createElement("li");
    if (step.action) {
      const button = document.createElement("button");
      button.className = "crumb";
      button.textContent = step.label;
      button.addEventListener("click", function () { play("click"); step.action(); });
      li.appendChild(button);
    } else {
      li.textContent = step.label;
      li.setAttribute("aria-current", "page");
    }
    detailCrumbs.appendChild(li);
  });
}

function scrollToMission(id) {
  const block = grid.querySelector ? grid.querySelector('[data-mission="' + id + '"]') : null;
  if (block && block.scrollIntoView) block.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openDetail(id) {
  const item = findItem(id);
  if (!item) return;
  const resolved = resolveItem(item);
  if (detail.classList.contains("hidden")) savedScroll = mainArea.scrollTop || 0;
  hideSuggestions();
  if (canHistory) {
    try {
      if (historyPushed) window.history.replaceState({ spaceLegacy: "detail", id: id }, "");
      else window.history.pushState({ spaceLegacy: "detail", id: id }, "");
      historyPushed = true;
    } catch (error) { /* history not available (for example in a sandboxed preview) */ }
  }
  openId = id;
  fillCrumbs(item);

  detailCategory.textContent = roleOf(item) + (groupOfItem(item.id) ? " \u00B7 " + groupOfItem(item.id).name : "");
  detailName.textContent = item.name;
  detailStatus.textContent = (item.status && item.status.label) || "";
  detailStatus.className = "detail-status status-" + statusClass(item.status && item.status.label);
  detailDescription.textContent = resolved.description;
  detailModelNote.textContent = MODEL_NOTE;

  // Actions: only the ones that really work for this item
  detailActions.innerHTML = "";
  if (item.replay) actionButton("Replay mission", "primary", replayAction(item));
  if (item.landing) actionButton("Watch the landing", "accent", function () { send("watch-landing", { hardwareId: item.landing }); });
  if (item.hardware) {
    const hw = hardwareList.find(function (entry) { return entry.id === item.hardware; });
    if (hw) actionButton("View site on the " + hw.destination + " globe", "small-button", function () {
      send("explore-destination", { destination: hw.destination, hardwareId: hw.id });
    });
  }
  const body = (item.bodies || [])[0];
  if (body) actionButton("Show in Solar System", "small-button", function () { send("show-in-solar", { body: item.spacecraft || body }); });

  // Key facts
  const group = groupOfItem(item.id);
  const facts = [
    ["Role", group ? roleOf(item) + " on " + group.name : ""],
    ["Mission", group ? "" : item.mission],
    ["Launch date", item.launchDate],
    ["Launch vehicle", item.category === "rockets" ? "" : resolved.vehicle],
    ["Destination", item.destination]
  ].filter(function (fact) { return fact[1]; });
  listItems(detailKeyFacts, facts, function (fact) {
    const li = document.createElement("li");
    const label = document.createElement("strong");
    label.textContent = fact[0];
    li.appendChild(label);
    if (fact[0] === "Launch vehicle" && resolved.rocket) {
      const button = document.createElement("button");
      button.className = "inline-link";
      button.textContent = fact[1];
      button.addEventListener("click", function () { openDetail(resolved.rocket.id); });
      li.appendChild(button);
    } else {
      li.appendChild(document.createTextNode(fact[1]));
    }
    return li;
  });

  setSection(detailBackground, resolved.background);
  setSection(detailPurpose, resolved.purpose);

  listItems(detailSpecs, resolved.specs, function (spec) {
    const li = document.createElement("li");
    const label = document.createElement("strong");
    label.textContent = spec[0];
    li.appendChild(label);
    li.appendChild(document.createTextNode(spec[1]));
    return li;
  });
  detailSpecs.parentElement.classList.toggle("hidden", resolved.specs.length === 0);

  listItems(detailTimeline, resolved.timeline, function (entry) {
    const li = document.createElement("li");
    const date = document.createElement("span");
    date.className = "tl-date";
    date.textContent = entry.date;
    li.appendChild(date);
    li.appendChild(document.createTextNode(entry.text));
    return li;
  });
  detailTimeline.parentElement.classList.toggle("hidden", resolved.timeline.length === 0);

  detailStatusText.textContent = (resolved.status.text || "No status recorded.") +
    (resolved.status.asOf ? " (" + resolved.status.asOf + ")" : "");

  // Related: the other hardware of the same mission first, then the catalog's own links (each shown once)
  const relatedItems = [];
  (group ? group.items : []).concat(item.related || []).forEach(function (id) {
    const other = findItem(id);
    if (other && other !== item && relatedItems.indexOf(other) === -1) relatedItems.push(other);
  });
  listItems(detailRelated, relatedItems, function (other) {
    const chip = document.createElement("button");
    chip.className = "related-chip";
    chip.textContent = other.name;
    chip.title = roleOf(other);
    chip.addEventListener("click", function () { openDetail(other.id); });
    return chip;
  });
  detailRelated.parentElement.classList.toggle("hidden", !relatedItems.length);

  detailImage.innerHTML = "";
  if (resolved.image && resolved.image.url) {
    detailImage.appendChild(link(resolved.image.url, resolved.image.label || "Official image page"));
  } else {
    detailImage.textContent = "No official image is linked yet. See the sources below.";
  }

  listItems(detailSources, resolved.sources, function (source) {
    const li = document.createElement("li");
    li.appendChild(link(source.url, source.label));
    return li;
  });

  detail.classList.remove("hidden");
  screen.classList.add("detail-open");
  detail.scrollTop = 0;
  breadcrumb.textContent = (groupOfItem(item.id) ? groupOfItem(item.id).name : categoryName(item.category)) + " › " + item.name;
  showViewerModel(item);
  startViewer();
  play("open");
  detailClose.focus();
}

function setSection(element, text) {
  element.textContent = text || "";
  element.parentElement.classList.toggle("hidden", !text);
}

function closeDetail(fromBrowser) {
  if (detail.classList.contains("hidden")) return false;
  detail.classList.add("hidden");
  screen.classList.remove("detail-open");
  stopViewer();
  openId = null;
  render();
  mainArea.scrollTop = savedScroll; // back to the same place in the list, with the same search
  play("close");
  if (historyPushed) {
    historyPushed = false;
    if (fromBrowser !== true && canHistory) { try { window.history.back(); } catch (error) { /* ignore */ } }
  }
  return true;
}

detailClose.addEventListener("click", function () { closeDetail(); });
detailBack.addEventListener("click", function () { closeDetail(); });
if (typeof window !== "undefined" && window.addEventListener) {
  window.addEventListener("popstate", function () {
    if (historyPushed && !detail.classList.contains("hidden")) closeDetail(true);
  });
}

// ----- Used by main.js -----
let built = false;

export function openExplorer(options) {
  options = options || {};
  if (options.category !== undefined) state.category = options.category;
  if (options.region !== undefined) {
    state.region = options.region;
    state.dest = "";
    state.category = "all";
    state.body = "";
  }
  if (options.body !== undefined) {
    state.body = options.body;
    state.category = "all";
    state.region = "";
  }
  if (options.replayOnly !== undefined) state.replayOnly = options.replayOnly;
  render();
  built = true;
  if (options.itemId) openDetail(options.itemId);
  else if (!detail.classList.contains("hidden") && options.keepDetail !== true) closeDetail();
}

// Returns true when it closed the detail panel (the Back / Escape key does this first)
export function backInExplorer() {
  return closeDetail();
}

export function startExplorer() {
  if (!built) openExplorer({});
  if (openId) startViewer();
}

export function stopExplorer() {
  stopViewer();
}
