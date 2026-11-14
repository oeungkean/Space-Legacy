// This file controls which screen is visible, the launch sequence, the help dialog and keyboard shortcuts.

import * as THREE from "three";
import { setLaunching, getHomePlanet, onHomePlanetChange } from "./earth-scene.js";
import { play, setLoop, stopLoops, isSoundOn, setSoundOn, onSoundChange, setAmbientMood, moodPitch } from "./sounds.js";
import { applyTheme } from "./theme.js";
import { getSetting, setSetting, onSettingChange, resetSettings } from "./settings.js";
import { initPlayer, playPlan, stopPlayer, playerState } from "./mission-player.js";
import { planForHardware, planForMission, planForSpacecraft, splitForSite, genericReturn, CAPSULE_OF } from "./mission-plan.js";
import { stopFilm } from "./space-film.js";
import {
  startSolarSystem,
  stopSolarSystem,
  startHardwareReplay,
  startSpacecraftReplayByName,
  startMissionReplay,
  focusBodyByName, resumeReplayAfterScene, keepReplayWhileAway, playEntry } from "./solar-system.js";
import { hardwareReplays } from "../data/hardware-replays.js";
import { missions } from "../data/missions.js";
import { catalog } from "../data/catalog.js";
import { openExplorer, startExplorer, stopExplorer, backInExplorer } from "./explorer.js";
import { startSimulator, stopSimulator, showResults, setMode as setSimMode, showSimStep } from "./simulator.js";
import { startExploration, stopExploration, loadSite, getExplorationState } from "./exploration.js";
import { collectiblesForSite } from "../data/collectibles.js";
import { isRecorded, getPhotos, getSamples } from "./progress.js";
import { modelIcon } from "./explorer.js";
import { startCollection, stopCollection } from "./collection.js";
import {
  startMission, getMission, completeObjective, setMissionState, setHudVisible, closeInfoCard, isInfoCardOpen, endMission
} from "./progress.js";
import { SITES, SPACECRAFT, DESTINATIONS, SUITS } from "../data/simulator.js";
import { findItem } from "../data/catalog.js";
import { spacecraftInfo } from "../data/spacecraft.js";
import { speak as speakNarration, getVoices, getChosenVoice, onVoicesChange, speechSupported } from "./narrator.js";
import {
  showDestination,
  selectHardwareById,
  startDestination,
  stopDestination,
  backInDestination,
  getSelectedHardwareId,
  getCurrentWorldName
} from "./destination.js";
import { startCinematic, stopCinematic, skipCinematic, isCinematicRunning } from "./launch-cinematic.js";
import { startLanding, stopLanding, hasLanding } from "./landing-scene.js";
import { hardwareList } from "../data/hardware.js";
import { missionBriefing } from "./briefing.js";
import { createRocket } from "./rockets.js";

// Find the elements on the page
const welcomeScreen = document.getElementById("welcome-screen");
const launchScreen = document.getElementById("launch-screen");
const solarSystemScreen = document.getElementById("solar-system-screen");
const destinationScreen = document.getElementById("destination-screen");
const landingScreen = document.getElementById("landing-screen");
const explorerScreen = document.getElementById("explorer-screen");
const simulatorScreen = document.getElementById("simulator-screen");
const explorationScreen = document.getElementById("exploration-screen");
const collectionScreen = document.getElementById("collection-screen");
const creditsScreen = document.getElementById("credits-screen");
const filmScreen = document.getElementById("film-screen");
const landingBackButton = document.getElementById("landing-back");

const beginButton = document.getElementById("begin-button");
const homeButton = document.getElementById("home-button");
const destHomeButton = document.getElementById("dest-home-button");
const backButton = document.getElementById("back-button");

const helpDialog = document.getElementById("help-dialog");
const helpButton = document.getElementById("help-button");
const destHelpButton = document.getElementById("dest-help-button");
const helpClose = document.getElementById("help-close");

const bootLoader = document.getElementById("boot-loader");

// ----- Loading screen: hide it when textures are loaded (or after a short time) -----
function hideBootLoader() {
  if (!bootLoader.isConnected) return;
  bootLoader.classList.add("done");
  setTimeout(function () { bootLoader.remove(); }, 600);
}

THREE.DefaultLoadingManager.onLoad = hideBootLoader;
window.addEventListener("load", function () { setTimeout(hideBootLoader, 900); });
setTimeout(hideBootLoader, 4000);

// ----- Showing one screen -----
// ----- One transition system for every screen change -----
// The old screen stays on view underneath (class "leaving") while the new one eases in over it,
// so screens dissolve into each other instead of cutting or fading to black. The new screen's
// interface (top bar, side list, panels) then fades in with a short stagger (see css "screen-in").
// With "reduce motion" (system setting or Settings) the change is instant.
const TRANSITION_MS = 1100;
const WELCOME_TRANSITION_MS = 1900; // leaving the welcome screen is slower: the title lifts away first
let transitionToken = 0;
function motionReduced() {
  const system = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return Boolean(system || getSetting("reduceMotion"));
}
function startTransition(from, to) {
  const token = ++transitionToken;
  document.querySelectorAll && document.querySelectorAll(".screen.leaving, .screen.entering").forEach(function (el) {
    el.classList.remove("leaving");
    el.classList.remove("entering");
    el.classList.remove("from-welcome");
  });
  if (!from || from === to || motionReduced()) return;
  const slow = from === welcomeScreen;
  from.classList.add("leaving");
  to.classList.add("entering");
  to.classList.toggle("from-welcome", slow);
  setTimeout(function () {
    if (token !== transitionToken) return;
    from.classList.remove("leaving");
    to.classList.remove("entering");
    to.classList.remove("from-welcome");
  }, (slow ? WELCOME_TRANSITION_MS : TRANSITION_MS) + 300);
}

function showScreen(screenToShow) {
  const previousScreen = currentScreen && !currentScreen.classList.contains("hidden") ? currentScreen : null;
  welcomeScreen.classList.add("hidden");
  launchScreen.classList.add("hidden");
  solarSystemScreen.classList.add("hidden");
  destinationScreen.classList.add("hidden");
  landingScreen.classList.add("hidden");
  explorerScreen.classList.add("hidden");
  simulatorScreen.classList.add("hidden");
  explorationScreen.classList.add("hidden");
  collectionScreen.classList.add("hidden");
  creditsScreen.classList.add("hidden");
  filmScreen.classList.add("hidden");

  launchScreen.classList.remove("fade-out");
  screenToShow.classList.remove("hidden");
  startTransition(previousScreen, screenToShow);

  if (screenToShow !== launchScreen) {
    stopCinematic();
  }
  if (screenToShow !== filmScreen) stopFilm();

  if (screenToShow === solarSystemScreen) {
    startSolarSystem();
  } else {
    stopSolarSystem();
  }

  if (screenToShow === destinationScreen) {
    startDestination();
  } else {
    stopDestination();
  }

  if (screenToShow !== landingScreen) {
    stopLanding();
  }

  if (screenToShow === explorerScreen) {
    startExplorer();
  } else {
    stopExplorer();
  }

  if (screenToShow === simulatorScreen) startSimulator();
  else stopSimulator();
  if (screenToShow === explorationScreen) startExploration(pendingSite, { suit: pendingSuit });
  else stopExploration();
  if (screenToShow === collectionScreen) startCollection();
  else stopCollection();
  // The mission progress panel shows while flying and exploring
  // (only while exploring: it no longer sits over the Solar System)
  setHudVisible(screenToShow === explorationScreen);

  // Sound: a whoosh when the screen changes, and a quiet space hum on the calm screens
  const changed = currentScreen !== screenToShow;
  currentScreen = screenToShow;
  stopLoops("ambient", "music");
  const calm = screenToShow === welcomeScreen || screenToShow === solarSystemScreen ||
    screenToShow === destinationScreen || screenToShow === explorerScreen ||
    screenToShow === simulatorScreen || screenToShow === collectionScreen || screenToShow === explorationScreen ||
    screenToShow === creditsScreen;
  setLoop("ambient", calm ? 1 : 0);
  setLoop("music", calm ? 1 : 0);
  if (screenToShow !== destinationScreen) setAmbientMood(getHomePlanet()); // the globe sets its own world's mood
  if (changed && screenToShow !== launchScreen) play("whoosh");
  updateNavTabs();
}

let currentScreen = welcomeScreen;
let pendingSite = null; // the exploration site to open next
let pendingSuit = null; // Sandbox: a suit chosen in the Suit Locker

// ----- The launch cinematic -----
let isLaunching = false;

function beginExploration() {
  if (isLaunching) return;
  // The entry is one continuous move: the home camera pulls back from the planet while the Solar System
  // dissolves in, and its camera carries on from close to Earth, out through orbit, to the whole system.
  setLaunching(true);
  showScreen(solarSystemScreen);
  if (!getSetting("skipIntro")) playEntry();
}

beginButton.addEventListener("click", beginExploration);

// Before a mission replay: play only the liftoff, then show the solar system and start the replay
function playLiftoffThen(caption, rocket, startReplay, look) {
  if (isLaunching) return;

  // Settings > Skip launch scenes: start the replay straight away
  if (getSetting("skipLiftoff")) {
    showScreen(solarSystemScreen);
    startReplay();
    return;
  }
  isLaunching = true;

  showScreen(launchScreen);

  startCinematic(function () {
    launchScreen.classList.add("fade-out");

    setTimeout(function () {
      showScreen(solarSystemScreen);
      isLaunching = false;
      startReplay();
    }, 500);
  }, { mission: true, caption: caption, rocket: rocket, look: look || null });
}

// ----- Navigation -----
function goHome() {
  setLaunching(false);
  showScreen(welcomeScreen);
}

homeButton.addEventListener("click", goHome);
destHomeButton.addEventListener("click", goHome);

// solar-system.js sends this message when Explore is clicked, when a hardware site is picked in search,
// or when "View landing site" is clicked at the end of a mission replay.
document.addEventListener("explore-destination", function (event) {
  showDestination(event.detail.destination);
  setAmbientMood(event.detail.destination); // the space ambience matches the world you explore

  if (event.detail.hardwareId) {
    selectHardwareById(event.detail.hardwareId);
  }

  showScreen(destinationScreen);
});

// destination.js sends this message when "Replay Mission" is clicked in a hardware profile
// (solar-system.js sends it too, for "Replay again").
document.addEventListener("replay-hardware", function (event) {
  const id = event.detail.hardwareId;
  const data = hardwareReplays[id];
  const caption = data
    ? data.label + " · " + data.events[0].title + " · " + data.events[0].date
    : "";

  void caption;
  playReplay(planForHardware(id));
});

// solar-system.js sends this message when "Replay Mission" is clicked for Voyager 1, Voyager 2 or Parker.
document.addEventListener("replay-spacecraft", function (event) {
  const name = event.detail.name;
  playReplay(planForSpacecraft(name, event.detail.rocket));
});

// destination.js sends this message when "Watch the landing" is clicked in a hardware profile.
let landingItem = null;
let landingFrom = null;

document.addEventListener("watch-landing", function (event) {
  const item = hardwareList.find(function (entry) { return entry.id === event.detail.hardwareId; });
  if (!hasLanding(item)) return;

  stopPlayer(); // watching one landing on its own ends any replay that was still playing
  landingItem = item;
  landingFrom = currentScreen;
  showScreen(landingScreen);
  startLanding(item);
});

// "Replay Mission" for a site without a full journey replay: the arrival, the landing, and what happened
// after it (the site's real status and findings), in the mission player
document.addEventListener("replay-landing", function (event) {
  const item = hardwareList.find(function (entry) { return entry.id === event.detail.hardwareId; });
  if (!hasLanding(item)) return;
  playReplay(landingPlan(item));
});
const WORLD_KEY = { Moon: "moon", Mars: "mars", Venus: "venus", Mercury: "mercury", Jupiter: "jupiter", Saturn: "saturn", Titan: "titan" };
function landingPlan(item) {
  const world = WORLD_KEY[item.destination] || "mars";
  const craft = item.landing.lander || item.landing.capsule || "capsule";
  const verb = item.kind === "impact" ? "impact" : item.kind === "probe" ? "descent" : item.kind === "plunge" ? "final plunge" : "landing";
  const after = [item.status && item.status.text].concat((item.contributions || []).slice(0, 2)).filter(Boolean);
  return {
    title: item.breadcrumbName || item.name,
    source: { type: "landing", id: item.id },
    chapters: [
      { engine: "film", label: "Arrival", title: "Arriving at " + item.destination, date: item.landingDate, caption: item.summary,
        narration: item.summary, part: "out", shot: { kind: "arrive", world: world, craft: craft } },
      { engine: "landing", label: verb.charAt(0).toUpperCase() + verb.slice(1), title: item.name, date: item.landingDate,
        caption: item.location, narration: (item.history || []).slice(1).map(function (h) { return h.text; }).join(" "),
        part: "out", landing: true, item: item },
      { engine: "film", label: "What happened next", title: "After the " + verb, date: "", caption: after.join(" "),
        narration: "What happened next? " + after.join(" "), part: "end", finale: true, shot: { kind: "finale", world: world, craft: null } }
    ]
  };
}

// Back from the landing scene: return to the globe with the same marker selected
function backFromLanding() {
  if (!landingItem) return;
  if (landingFrom === explorerScreen) {
    showScreen(explorerScreen);
    return;
  }
  showDestination(landingItem.destination);
  selectHardwareById(landingItem.id);
  showScreen(destinationScreen);
  setAmbientMood(landingItem.destination);
}

landingBackButton.addEventListener("click", backFromLanding);

// Back: first close an open marker. If none is open, return to the solar system.
backButton.addEventListener("click", function () {
  if (!backInDestination()) {
    showScreen(solarSystemScreen);
  }
});

// ----- Spacecraft & Hardware Explorer and the top navigation tabs -----
var explorerMissions = false; // true when the Explorer shows only missions with a replay ("Missions" tab)

function showExplorer(options) {
  options = options || {};
  if (options.replayOnly !== undefined) explorerMissions = options.replayOnly;
  openExplorer(options);
  showScreen(explorerScreen);
}

// Any page can ask for the Explorer: { itemId } opens one item, { region }, { body } or { category } filter it
document.addEventListener("open-explorer", function (event) {
  const detail = Object.assign({ replayOnly: false }, event.detail || {});
  showExplorer(detail);
});

// Replays of the missions in data/missions.js (Hubble, Webb, Pioneer, New Horizons, Artemis I and more)
document.addEventListener("replay-mission", function (event) {
  const id = event.detail.missionId;
  const mission = missions[id];
  if (!mission) return;
  playReplay(planForMission(id));
});

// "Show in Solar System" in the Explorer
document.addEventListener("show-in-solar", function (event) {
  setLaunching(true);
  showScreen(solarSystemScreen);
  focusBodyByName(event.detail.body);
});

const navTabs = document.querySelectorAll ? document.querySelectorAll("[data-nav]") : [];

// ----- One builder, two sections (Master Doc 11) -----
// Missions = what really happened: browse, replay, and rebuild a real mission (the builder in Real
// Missions mode). Simulator = your own designs: the builder in Free Build mode. The builder says which
// section it belongs to, the matching tab is lit, and a link leads to the other section.
const BUILDER_TEXT = {
  missions: { sub: "Missions", title: "Rebuild a Real Mission", mode: "historical",
    switchEyebrow: "Simulator", switchTitle: "Build your own instead \u2192", switchText: "Free Build: mix any parts (marked fictional)" },
  simulator: { sub: "Simulator", title: "Free Build Simulator", mode: "sandbox",
    switchEyebrow: "Missions", switchTitle: "Rebuild a real mission \u2192", switchText: "Only parts that really flew together" }
};
function openBuilder(section) {
  applyBuilderSection(section);
  showScreen(simulatorScreen);
}
function applyBuilderSection(section) {
  const text = BUILDER_TEXT[section] || BUILDER_TEXT.simulator;
  simulatorScreen.dataset.section = section === "missions" ? "missions" : "simulator";
  setSimMode(text.mode);
  document.getElementById("sim-sidebar-sub").textContent = text.sub;
  document.getElementById("sim-sidebar-title").textContent = text.title;
  document.getElementById("sim-switch-eyebrow").textContent = text.switchEyebrow;
  document.getElementById("sim-switch-title").textContent = text.switchTitle;
  document.getElementById("sim-switch-text").textContent = text.switchText;
  simulatorScreen.setAttribute("aria-label", text.title);
}
applyBuilderSection("simulator"); // the builder starts as the Simulator's Free Build
document.getElementById("sim-switch").addEventListener("click", function () {
  play("click");
  openBuilder(simulatorScreen.dataset.section === "missions" ? "simulator" : "missions");
});
document.getElementById("explorer-rebuild").addEventListener("click", function () {
  play("click");
  openBuilder("missions");
});
document.addEventListener("open-real-builder", function () { openBuilder("missions"); });

function updateNavTabs() {
  const tabs = document.querySelectorAll ? document.querySelectorAll("[data-nav]") : [];
  let active = null;
  if (currentScreen === solarSystemScreen || currentScreen === destinationScreen) active = "solar";
  else if (currentScreen === explorerScreen) active = "explorer";
  else if (currentScreen === simulatorScreen || currentScreen === explorationScreen) {
    active = simulatorScreen.dataset.section === "missions" ? "explorer" : "simulator";
  }
  else if (currentScreen === collectionScreen) active = "collection";
  else if (currentScreen === creditsScreen) active = "credits";
  tabs.forEach(function (tab) {
    const on = tab.dataset.nav === active;
    tab.classList.toggle("active", on);
    tab.setAttribute("aria-current", on ? "page" : "false");
  });
}

// Going to a top-level section (the tabs, and the "open-section" message other parts can send)
function goSection(where) {
  if (isLaunching) return;
  play("click");
  if (where === "solar") {
    setLaunching(true);
    showScreen(solarSystemScreen);
  } else if (where === "planets") {
    const world = getCurrentWorldName() || "Mars";
    document.dispatchEvent(new CustomEvent("explore-destination", { detail: { destination: world } }));
  } else if (where === "simulator") {
    openBuilder("simulator");
  } else if (where === "collection") {
    showScreen(collectionScreen);
  } else if (where === "credits") {
    showScreen(creditsScreen);
  } else {
    showExplorer({ body: "", replayOnly: false }); // Missions always opens the full list (no leftover filter)
  }
}
navTabs.forEach(function (tab) {
  tab.addEventListener("click", function () { goSection(tab.dataset.nav); });
});
document.addEventListener("open-section", function (event) { goSection(event.detail && event.detail.section); });

document.getElementById("explorer-home").addEventListener("click", goHome);
(document.querySelectorAll ? document.querySelectorAll("[data-home-button]") : []).forEach(function (b) { b.addEventListener("click", goHome); });
(document.querySelectorAll ? document.querySelectorAll("[data-open-help]") : []).forEach(function (b) { b.addEventListener("click", function () { openHelp(); }); });
document.getElementById("welcome-credits").addEventListener("click", function () { play("click"); showScreen(creditsScreen); });
// Credits: the category links scroll to their table (without changing the address)
(document.querySelectorAll ? document.querySelectorAll(".credits-index a") : []).forEach(function (link) {
  link.addEventListener("click", function (event) {
    event.preventDefault();
    const target = document.getElementById(link.getAttribute("href").slice(1));
    if (target && target.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

// ----- Instructions: kept out of the way behind a small "Controls" button on each screen -----
// The instruction text still updates as before; it only shows when the button is clicked.
(function setupControlHints() {
  const hints = Array.from(document.querySelectorAll ? document.querySelectorAll(".hint, #explore-hint, #landing-hint") : []);
  hints.forEach(function (hint) {
    const screen = hint.closest ? hint.closest(".screen") : null;
    if (!screen) return;
    if (hint.parentElement !== screen) screen.appendChild(hint);
    hint.classList.add("hint-pop");
    const button = document.createElement("button");
    button.className = "hint-toggle small-button";
    button.setAttribute("data-silent", "");
    button.setAttribute("aria-expanded", "false");
    button.title = "Show the controls for this screen";
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="6.5" width="19" height="11" rx="2"/><path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M7 14h10"/></svg><span>Controls</span>';
    button.addEventListener("click", function () {
      const open = !hint.classList.contains("open");
      hint.classList.toggle("open", open);
      button.classList.toggle("active", open);
      button.setAttribute("aria-expanded", String(open));
      play(open ? "open" : "click");
    });
    screen.appendChild(button);
  });
})();

// ----- Mission Simulator: launch, journey and the hand-off to exploration -----
const replayContinue = document.getElementById("replay-continue");
const sitesDialog = document.getElementById("explore-sites");
const siteList = document.getElementById("explore-site-list");

// Capsules that come home in a sandbox mission
const RETURN_MODEL = { apollo: "apollo-cm", orion: "orion-cm", gemini: "gemini-cm", dragon: "dragon" };
// Spacecraft that have a close-up landing scene (data/hardware.js)
const LANDER_HARDWARE = {
  viking: "viking1", "blue-ghost": "blueghost1", curiosity: "curiosity", perseverance: "perseverance",
  cassini: "cassini", galileo: "galileo-probe", "pioneer-venus": "pv-large", messenger: "messenger"
};

function eventFromTuple(tuple, config) {
  const extra = tuple[5] || {};
  const target = tuple[4];
  const near = target === "Earth" || target === "Moon";
  return Object.assign({
    stage: tuple[0], title: tuple[1], date: tuple[2], caption: tuple[3], narration: tuple[3], target: target,
    model: extra.model || SPACECRAFT[config.spacecraft].model,
    size: near ? 0.05 : 0.15,
    zoom: target === "outbound" ? 20 : near ? 0.6 : 5
  }, extra);
}

// Builds a journey for missions that have no replay of their own, and for every sandbox mission
function buildJourney(config) {
  const craft = SPACECRAFT[config.spacecraft];
  const destination = DESTINATIONS[config.destination];
  const label = config.title + (config.fictional ? " (fictional)" : "");
  const thrust = config.upgrades ? config.upgrades.thrust || 0 : 0;
  let events;
  if (config.template && config.template.journey) {
    events = config.template.journey.map(function (t) { return eventFromTuple(t, config); });
  } else {
    const arrive = Object.assign({ gap: destination.gap }, destination.target === "deep" ? { radius: destination.radius, angle: destination.angle, body: destination.body } : {},
      destination.target === "outbound" ? { far: destination.far } : {}, destination.around ? { around: destination.around } : {});
    events = [
      eventFromTuple(["A", "Launch", "Free Build", "Liftoff on the " + rocketTitle(config.rocket) + ". " + (config.fictional ? "This combination never flew: it is a fictional Free Build mission." : "This combination really flew."), "Earth", { isLaunch: true }], config),
      eventFromTuple(["C", "Arrival: " + destination.name, "Free Build", "The spacecraft reaches " + destination.name.replace(/^The /, "the ") + ". Real missions took: " + destination.travel + ".", destination.target, Object.assign({ action: "orbit" }, arrive)], config)
    ];
    if (craft.type === "crewed" && destination.target !== "outbound") {
      events.push(eventFromTuple(["D", "Return to Earth", "Free Build", "The crew comes home under parachutes.", "Earth", { gap: 0.02, model: RETURN_MODEL[config.spacecraft] || craft.model, action: "splashdown" }], config));
    }
  }
  const item = craft.catalogId ? findItem(craft.catalogId) : null;
  // The close-up landing scene for this lander, rover or probe (only where it really went)
  const landerId = LANDER_HARDWARE[config.spacecraft];
  const lander = landerId ? hardwareList.find(function (h) { return h.id === landerId; }) : null;
  const landingHardware = lander && lander.destination.toLowerCase() === config.destination ? landerId : null;
  const landingIndex = landingHardware ? events.findIndex(function (e) { return e.stage === "C"; }) : -1;
  return {
    landingHardware: landingIndex >= 0 ? landingHardware : null,
    landingIndex: landingIndex,
    label: label,
    rocket: config.rocket,
    look: config.look,
    direction: [0.6, 0.8],
    travelSeconds: 6 / (1 + thrust * 0.4),
    outcome: config.template
      ? { label: item && item.status ? item.status.label : "Complete", text: item && item.status && item.status.text ? item.status.text : config.template.name + " complete." }
      : { label: "Free Build complete", text: "A Free Build mission: " + (config.fictional ? "this rocket, spacecraft and destination never flew together. Nothing here changes real history." : "this combination matches a real mission.") },
    events: events
  };
}

// The film plan for a Simulator mission: the researched replay if there is one, otherwise one built from the choices
function planForSim(config) {
  const replay = config.template && config.template.replay;
  let plan = null;
  if (replay && replay.type === "hardware") plan = planForHardware(replay.id);
  else if (replay && replay.type === "spacecraft") plan = planForSpacecraft(replay.id);
  else if (replay) plan = planForMission(replay.id);
  if (!plan) {
    const id = "sim-" + (config.template ? config.template.id : "sandbox");
    missions[id] = buildJourney(config);
    plan = planForMission(id);
  }
  plan.title = config.title || plan.title;
  return plan;
}

let missionReturn = null; // the trip home, played after exploring

// The landing for a Free Build site (fictional): the descent from orbit (a space shot) and then the
// touchdown scene, with a lander that fits the spacecraft
function freeDescentChapter(config, site) {
  if (!site || (site.world !== "moon" && site.world !== "mars")) return null;
  const craft = SPACECRAFT[config.spacecraft];
  const moon = site.world === "moon";
  const world = moon ? "Moon" : "Mars";
  const toWorld = moon ? "the Moon" : "Mars"; // for sentences
  let landing;
  if (craft && craft.type === "rover" && !moon) {
    landing = { style: "skycrane", rover: config.spacecraft === "curiosity" ? "curiosity" : "perseverance", roverScale: 1, shellRadius: 2.25, chuteRadius: 10.5 };
  } else if (config.spacecraft === "viking") {
    landing = { style: "retro", lander: "viking-lander", scale: 1.2, parachute: !moon, shellRadius: 1.75, chuteRadius: 8 };
  } else if (config.spacecraft === "blue-ghost") {
    landing = { style: "retro", lander: "blue-ghost", scale: 1, parachute: !moon, shellRadius: 1.9, chuteRadius: 9 };
  } else {
    // crewed spacecraft (and anything else) land in a lunar-module style lander
    landing = { style: "retro", lander: "lunar-module", scale: 2.6, crew: craft && craft.type === "crewed", parachute: !moon, shellRadius: 3, chuteRadius: 12 };
  }
  landing.captions = {
    braking: moon ? "There is no air on the Moon, so the lander slows down with its engine alone, firing against its direction of travel. (A fictional Free Build landing.)" : undefined,
    approach: "The lander turns upright and slows down, looking for a safe, flat spot.",
    touchdown: "Engines stir up the dust as the lander settles onto its footpads at " + site.name + "."
  };
  // the descent shows the same lander that touches down (on Mars, inside its entry capsule, as in the
  // real missions' scenes), and the spacecraft it undocks from is the one that was built, not Apollo's
  const lmStyle = landing.lander === "lunar-module";
  const preShot = { kind: "descend", world: site.world, craft: lmStyle ? "lunar-module" : !moon ? "capsule" : (landing.lander || (craft ? craft.model : "capsule")), mother: lmStyle && craft ? (craft.model === "apollo-stack" ? "apollo-csm" : craft.model) : undefined, style: lmStyle ? "lm" : undefined, cruiseStage: !moon };
  return {
    engine: "landing",
    label: "Descent & Landing",
    title: "Landing at " + site.name,
    date: "",
    caption: "The craft comes down from orbit step by step, engines burning, to " + site.name + ". (Fictional Free Build landing.)",
    narration: "Now the descent. From orbit, the craft slows down and drops toward " + toWorld + (moon ? ", with nothing but its engine to brake it, because the Moon has no air." : ", first through the thin air, then on its engines.") + " Bit by bit it comes down, until it settles gently on the surface.",
    part: "out",
    landing: true,
    lm: landing.lander === "lunar-module" && moon,
    item: { id: "free-landing-" + site.world, name: site.name, destination: world, mission: "Free Build (fictional)", location: site.name, landing: landing },
    pre: {
      shot: preShot,
      title: "Descent from orbit",
      caption: "Leaving orbit: the engine fires to slow down, and the long fall toward " + toWorld + " begins.",
      narration: "The engine fires against the direction of travel, and the craft starts its long fall toward the surface."
    }
  };
}

// A rocket's name for captions (rockets missing from the catalog, like the shuttle flights, are named by their model)
function rocketTitle(key) {
  const item = findItem(key);
  if (item) return item.name;
  const model = createRocket(key);
  return model && model.userData.name ? model.userData.name : key;
}

// The mission briefing (where from, where to, how long, possible or not) for a Mission Builder mission
function briefOf(config) {
  try {
    return missionBriefing({ rocket: config.rocket, spacecraft: config.spacecraft, destination: config.destination, siteId: config.siteId, title: config.title });
  } catch (error) {
    return null; // the mission still plays without its briefing
  }
}

document.addEventListener("sim-launch", function (event) {
  const config = event.detail;
  startMission(config);
  showResults(null);
  completeObjective("launch");
  setMissionState({ stage: "A · Launch", status: "In flight" });
  const plan = planForSim(config);
  const site = config.siteId ? SITES[config.siteId] : null;
  if (site) {
    // Fly there and land; the mission continues at the exploration site
    const parts = splitForSite(plan, site);
    // No landing in the journey (Free Build sites): add one, so the craft comes down step by step from
    // orbit with its engine burning, instead of appearing on the ground
    const descent = freeDescentChapter(config, site);
    if (descent && !parts.outbound.some(function (c) { return c.engine === "landing"; })) parts.outbound.push(descent);
    const craft = SPACECRAFT[config.spacecraft] ? SPACECRAFT[config.spacecraft].model : null;
    const capsule = RETURN_MODEL[config.spacecraft] || null;
    missionReturn = parts.ret.some(function (c) { return c.engine === "landing"; }) ? { title: plan.title, chapters: parts.ret }
      : capsule ? { title: plan.title, chapters: genericReturn(plan.title, craft, capsule, site.world === "orbit" ? "earth" : site.world) } : null;
    playReplay({ title: plan.title, chapters: parts.outbound }, {
      brief: briefOf(config),
      stopAfter: parts.outbound.length - 1,
      onFinish: function () { goToMissionSite(getMission()); }
    });
  } else {
    missionReturn = null;
    playReplay(plan, {
      brief: briefOf(config),
      endTitle: "Mission complete",
      onFinish: function () {
        completeObjective("reach");
        completeObjective("deploy");
        completeObjective("complete");
        setMissionState({ stage: "E · Completion", status: "Mission complete", distance: "" });
        showResults(getMission());
        showScreen(simulatorScreen);
      }
    });
  }
});

// Voyager and Parker replays need their launch caption and rocket from data/spacecraft.js
document.addEventListener("open-explorer-replay", function (event) {
  const info = spacecraftInfo[event.detail.name];
  const launch = info.replay[0];
  document.dispatchEvent(new CustomEvent("replay-spacecraft", {
    detail: { name: event.detail.name, caption: event.detail.name + " \u00B7 " + launch.title + " \u00B7 " + launch.date, rocket: launch.rocket }
  }));
});

const STAGE_NAMES = { A: "Launch", B: "Journey", C: "Landing / Deployment", D: "Return to Earth", E: "Completion" };

document.addEventListener("replay-event", function (event) {
  if (!getMission()) return;
  const d = event.detail;
  setMissionState({
    stage: (d.stage ? d.stage + " · " + STAGE_NAMES[d.stage] : "Journey"),
    status: "In flight · event " + (d.index + 1) + " of " + d.total + ": " + d.title,
    distance: "Journey progress: " + Math.round((d.index / Math.max(1, d.total - 1)) * 100) + "%"
  });
});

document.addEventListener("replay-finished", function () {
  const mission = getMission();
  if (!mission) return;
  completeObjective("reach");
  completeObjective("deploy");
  setMissionState({ stage: "E · Completion", status: "Arrived", distance: "" });
  replayContinue.textContent = mission.siteId ? "Begin exploration at " + SITES[mission.siteId].name + " \u2192" : "Complete mission \u2192";
  replayContinue.classList.remove("hidden");
});

replayContinue.addEventListener("click", function () {
  const mission = getMission();
  replayContinue.classList.add("hidden");
  if (!mission) return;
  if (mission.siteId) {
    openSite(mission.siteId);
  } else {
    completeObjective("complete");
    setMissionState({ status: "Mission complete" });
    showResults(getMission());
    showScreen(simulatorScreen);
  }
});

// ----- Mission replays: one continuous film from launch to the end (js/mission-player.js) -----
let playerFrom = null;

function playReplay(plan, opts) {
  if (!plan) return;
  if (currentScreen !== launchScreen && currentScreen !== filmScreen && currentScreen !== landingScreen) playerFrom = currentScreen;
  // Settings > Skip launch and landing scenes: keep only the space scenes
  if (getSetting("skipLiftoff")) {
    const kept = plan.chapters.filter(function (c) { return c.engine === "film"; });
    const stop = opts && opts.stopAfter !== undefined ? kept.length - 1 : undefined;
    plan = Object.assign({}, plan, { chapters: kept.length ? kept : plan.chapters });
    if (stop !== undefined) opts = Object.assign({}, opts, { stopAfter: Math.max(0, stop) });
  }
  setLaunching(true);
  playPlan(plan, opts || {});
}

initPlayer({
  show: function (engine) {
    showScreen(engine === "launch" ? launchScreen : engine === "film" ? filmScreen : landingScreen);
  },
  exit: function () {
    const back = playerFrom && playerFrom !== launchScreen ? playerFrom : solarSystemScreen;
    showScreen(back);
  }
});

function goToMissionSite(mission) {
  if (!mission) return;
  completeObjective("reach");
  completeObjective("deploy");
  setMissionState({ stage: "C \u00B7 Landing", status: "On site" });
  openSite(mission.siteId);
}

// After exploring: crews fly home (the trip home and the splashdown), then the mission is complete
const resultsReturn = document.getElementById("results-return");
document.addEventListener("exploration-ended", function () {
  // only for a mission that is still running (not for a site opened directly, after an earlier mission)
  resultsReturn.classList.toggle("hidden", !missionReturn || !getMission());
});
resultsReturn.addEventListener("click", function () {
  document.getElementById("explore-results").classList.add("hidden");
  if (!missionReturn) return;
  setMissionState({ stage: "D \u00B7 Return to Earth", status: "Heading home" });
  playReplay(missionReturn, {
    endTitle: "Crew home safely",
    onFinish: function () {
      completeObjective("complete");
      setMissionState({ stage: "E \u00B7 Completion", status: "Crew home safely" });
      showResults(getMission());
      showScreen(simulatorScreen);
    }
  });
});

function openSite(siteId, suit) {
  pendingSite = siteId;
  pendingSuit = suit || null;
  sitesDialog.classList.add("hidden");
  if (currentScreen === explorationScreen) loadSite(siteId, { suit: pendingSuit });
  else showScreen(explorationScreen);
}

// The Astronaut tab: the current mission's site, or a list of sites to explore freely
function openAstronaut() {
  const mission = getMission();
  if (mission && mission.siteId) {
    openSite(mission.siteId);
    return;
  }
  if (!pendingSite) pendingSite = "tranquility";
  showScreen(explorationScreen);
  showSiteList();
}

function showSiteList() {
  siteList.innerHTML = "";
  Object.keys(SITES).forEach(function (id) {
    const site = SITES[id];
    const button = document.createElement("button");
    button.className = "sim-card" + (site.fictional ? " fictional" : "");
    button.innerHTML = '<span class="sim-card-title"></span><span class="sim-card-meta"></span><span class="sim-card-note"></span>';
    if (button.querySelector) {
      button.querySelector(".sim-card-title").textContent = site.name;
      button.querySelector(".sim-card-meta").textContent = site.mission + (site.fictional ? " · FICTIONAL" : "");
      button.querySelector(".sim-card-note").textContent = site.suit ? "Suit: " + SUITS[site.suit].name : "Robotic: drive the rover";
    }
    button.addEventListener("click", function () {
      play("select");
      openSite(id);
    });
    siteList.appendChild(button);
  });
  sitesDialog.classList.remove("hidden");
}

// (the "All sites" button on the exploration screen was removed; sites are chosen in the Simulator)
const exploreSitesButton = document.getElementById("explore-sites-button");
if (exploreSitesButton) exploreSitesButton.addEventListener("click", function () {
  showScreen(simulatorScreen);
  showSimStep("explore");
});

// The Simulator's "Explore a site" list asks for a site
document.addEventListener("open-site", function (event) {
  const mission = getMission();
  if (mission && mission.siteId !== event.detail.siteId) endMissionQuietly();
  openSite(event.detail.siteId, event.detail.suit);
});

function endMissionQuietly() {
  endMission();
}
document.getElementById("explore-sites-close").addEventListener("click", function () { sitesDialog.classList.add("hidden"); });
// "My Collection" in the results: what you collected at this site, as small pictures (like a planet's
// missions in the Solar System). The full Collection page is one link away.
document.getElementById("results-collection").addEventListener("click", function () {
  const panel = document.getElementById("results-found");
  const open = panel.classList.toggle("hidden") === false;
  this.setAttribute("aria-expanded", String(open));
  if (open) fillResultsCollection();
});
document.getElementById("results-full-collection").addEventListener("click", function () {
  document.getElementById("explore-results").classList.add("hidden");
  showScreen(collectionScreen);
});
function fillResultsCollection() {
  const grid = document.getElementById("results-found-grid");
  const note = document.getElementById("results-found-note");
  grid.innerHTML = "";
  const state = getExplorationState();
  const siteId = state && state.siteId;
  const site = siteId ? SITES[siteId] : null;
  const found = siteId ? collectiblesForSite(siteId).filter(function (c) { return isRecorded(c.id); }) : [];
  found.forEach(function (c) {
    const tile = document.createElement("div");
    tile.className = "related-tile";
    tile.innerHTML = '<span class="rt-pic"><img alt="" decoding="async"></span><b class="rt-name"></b><span class="rt-year"></span>';
    tile.querySelector(".rt-name").textContent = c.card ? c.card.name : c.id;
    tile.querySelector(".rt-year").textContent = c.kind === "target" ? "Science target" : c.kind === "observe" ? "Observed" : "Hardware";
    if (c.model) modelIcon({ type: "model", key: c.model }, tile.querySelector("img"));
    grid.appendChild(tile);
  });
  // photos you took here (their own small pictures)
  const photos = site ? getPhotos().filter(function (p) { return p.site === site.name && p.image; }) : [];
  photos.slice(0, 6).forEach(function (p) {
    const tile = document.createElement("div");
    tile.className = "related-tile";
    tile.innerHTML = '<span class="rt-pic"><img alt=""></span><b class="rt-name"></b><span class="rt-year">Photo</span>';
    tile.querySelector("img").src = p.image;
    tile.querySelector(".rt-name").textContent = p.name;
    grid.appendChild(tile);
  });
  const samples = site ? getSamples().filter(function (s) { return s.site === site.name; }).length : 0;
  note.textContent = found.length || photos.length
    ? found.length + " recorded · " + photos.length + " photo" + (photos.length === 1 ? "" : "s") + " · " + samples + " sample" + (samples === 1 ? "" : "s")
    : "Nothing recorded here yet. Walk up to an object and press F to record it.";
}
document.getElementById("results-continue").addEventListener("click", function () {
  document.getElementById("explore-results").classList.add("hidden");
});
void setSimMode;
document.getElementById("explorer-help").addEventListener("click", function () { openHelp(); });

// "Go back" on a globe (the site panel, the flyby panel and the site list): back to the Solar System
// (Master Doc 10: these were "Open in Missions" and "All hardware from this world")
["hw-explorer", "dest-explorer-link", "visit-back"].forEach(function (id) {
  const button = document.getElementById(id);
  if (button) button.addEventListener("click", function () { showScreen(solarSystemScreen); });
});
void getSelectedHardwareId;

// ----- Help dialog -----
function openHelp() {
  helpDialog.classList.remove("hidden");
  helpClose.focus();
  play("open");
}

function closeHelp() {
  if (helpDialog.classList.contains("hidden")) return;
  helpDialog.classList.add("hidden");
  play("close");
}

helpButton.addEventListener("click", openHelp);
destHelpButton.addEventListener("click", openHelp);
helpClose.addEventListener("click", closeHelp);
helpDialog.addEventListener("pointerdown", function (event) {
  if (event.target === helpDialog) closeHelp();
});

// ----- Keyboard shortcuts that work on every screen -----
document.addEventListener("keydown", function (event) {
  const tag = event.target && event.target.tagName;
  const typing = tag === "INPUT" || tag === "TEXTAREA";

  if (event.key === "Escape") {
    if (isInfoCardOpen()) {
      closeInfoCard();
      return;
    }
    if (!sitesDialog.classList.contains("hidden")) {
      sitesDialog.classList.add("hidden");
      return;
    }
    if (!settingsDialog.classList.contains("hidden")) {
      closeSettings();
    } else if (!helpDialog.classList.contains("hidden")) {
      closeHelp();
    } else if (isLaunching && isCinematicRunning()) {
      skipCinematic();
    } else if (!destinationScreen.classList.contains("hidden") && !typing) {
      backButton.click();
    } else if (!landingScreen.classList.contains("hidden")) {
      backFromLanding();
    } else if (!explorerScreen.classList.contains("hidden") && !typing) {
      backInExplorer();
    }
    return;
  }

  if (typing || event.ctrlKey || event.metaKey || event.altKey) return;

  // Skip the launch cinematic
  if (isLaunching && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    skipCinematic();
    return;
  }

  // Begin from the welcome screen
  if (!welcomeScreen.classList.contains("hidden") && event.key === "Enter") {
    beginExploration();
    return;
  }

  const onWelcome = !welcomeScreen.classList.contains("hidden");

  if (event.key === "?") {
    openHelp();
  } else if (event.key.toLowerCase() === "h" && !onWelcome && !isLaunching) {
    goHome();
  } else if (event.key.toLowerCase() === "x" && !isLaunching) {
    showExplorer({ replayOnly: false });
  } else if (event.key.toLowerCase() === "m") {
    toggleSound();
  } else if (event.key === ",") {
    openSettings();
  } else if (event.key.toLowerCase() === "u") {
    const show = !getSetting("ui");
    setSetting("ui", show);
    play(show ? "toggleOn" : "toggleOff");
  }
});

// ----- Home screen: the name of the world the hero camera is visiting -----
// One fixed deep-space palette for the whole site (no per-planet colors), so the style stays consistent.
applyTheme("Earth");
const heroNow = document.getElementById("hero-now-name");
onHomePlanetChange(function (name) {
  heroNow.textContent = name;
  setAmbientMood(name);
});
heroNow.textContent = getHomePlanet();
setAmbientMood(getHomePlanet());

// ----- Sound: the on/off switches in every top bar -----
const soundButtons = document.querySelectorAll ? document.querySelectorAll("[data-sound-toggle]") : [];

// A speaker with sound waves when on, a speaker with a cross when muted
const VOLUME_ON = '<svg class="vol-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path class="vol-wave" d="M16 8.5a5 5 0 0 1 0 7"/><path class="vol-wave" d="M18.5 6a8.5 8.5 0 0 1 0 12"/></svg>';
const VOLUME_OFF = '<svg class="vol-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path class="vol-wave" d="M16.5 9.5l5 5M21.5 9.5l-5 5"/></svg>';

function updateSoundButtons(on) {
  soundButtons.forEach(function (button) {
    button.innerHTML = on ? VOLUME_ON : VOLUME_OFF;
    button.setAttribute("aria-pressed", String(on));
    button.setAttribute("aria-label", on ? "Sound on (click to mute)" : "Sound off (click to turn on)");
    button.title = (on ? "Sound on" : "Sound off") + " (M)";
    button.classList.toggle("muted", !on);
  });
}

function toggleSound() {
  const on = !isSoundOn();
  setSoundOn(on);
  if (on) play("toggleOn");
}

soundButtons.forEach(function (button) {
  button.setAttribute("data-silent", "");
  button.addEventListener("click", toggleSound);
});
onSoundChange(updateSoundButtons);
updateSoundButtons(isSoundOn());

// ----- Sound for every button: a click when pressed, a tiny tick when the mouse moves over it -----
// Buttons marked data-silent, the dock toggles and the sidebar rows make their own sounds.
function soundButtonFor(target) {
  const button = target && target.closest ? target.closest("button, a") : null;
  if (!button || button.disabled) return null;
  return button;
}

document.addEventListener("click", function (event) {
  const button = soundButtonFor(event.target);
  if (!button || button.hasAttribute("data-silent")) return;
  const classes = button.classList;
  if (classes.contains("dock-btn") || classes.contains("sidebar-item")) return;

  if (button.tagName === "A") play("link");
  else if (classes.contains("primary")) play("confirm");
  else if (classes.contains("panel-close")) play("close");
  else play("click");
}, true);

let lastHover = null;
let lastHoverTime = 0;
document.addEventListener("pointerover", function (event) {
  if (event.pointerType && event.pointerType !== "mouse") return;
  const button = soundButtonFor(event.target);
  if (!button || button === lastHover) return;
  lastHover = button;
  const now = performance.now();
  if (now - lastHoverTime < 60) return; // not too many ticks when sweeping across a list
  lastHoverTime = now;
  play("hover");
});
document.addEventListener("pointerout", function (event) {
  if (soundButtonFor(event.target) === lastHover) lastHover = null;
});

// ----- Settings (the gear button on every screen) -----
const settingsDialog = document.getElementById("settings-dialog");
const settingsClose = document.getElementById("settings-close");
const settingsCard = settingsDialog.querySelector ? settingsDialog.querySelector(".settings-card") : null;
const soundSwitch = document.getElementById("set-sound");
const volumeSlider = document.getElementById("set-volume");
const volumeValue = document.getElementById("set-volume-value");
const settingsReset = document.getElementById("settings-reset");
const settingInputs = settingsDialog.querySelectorAll ? settingsDialog.querySelectorAll("[data-setting]") : [];
const restoreButton = document.getElementById("ui-restore");

function openSettings() {
  syncSettingsForm();
  settingsDialog.classList.remove("hidden");
  settingsClose.focus();
  play("open");
}

function closeSettings() {
  if (settingsDialog.classList.contains("hidden")) return;
  settingsDialog.classList.add("hidden");
  play("close");
}

// Put the saved values into the switches and slider
function syncSettingsForm() {
  settingInputs.forEach(function (input) {
    input.checked = Boolean(getSetting(input.getAttribute("data-setting")));
  });
  soundSwitch.checked = isSoundOn();
  volumeSlider.value = String(getSetting("volume"));
  volumeValue.textContent = Math.round(getSetting("volume") * 100) + "%";
  if (settingsCard) settingsCard.classList.toggle("sound-off", !isSoundOn());
}

// Show or hide parts of the page, and reduce motion
function applyDisplaySettings() {
  const body = document.body;
  if (!body) return;
  body.classList.toggle("ui-hidden", !getSetting("ui"));
  body.classList.toggle("no-sidebar", !getSetting("sidebar"));
  body.classList.toggle("no-hints", !getSetting("hints"));
  body.classList.toggle("no-clock", !getSetting("clock"));
  body.classList.toggle("reduce-motion", getSetting("reduceMotion"));
}

(document.querySelectorAll ? document.querySelectorAll("[data-open-settings]") : []).forEach(function (button) {
  button.setAttribute("data-silent", "");
  button.addEventListener("click", openSettings);
});
settingsClose.setAttribute("data-silent", "");
settingsClose.addEventListener("click", closeSettings);
settingsDialog.addEventListener("pointerdown", function (event) {
  if (event.target === settingsDialog) closeSettings();
});

settingInputs.forEach(function (input) {
  input.addEventListener("change", function () {
    setSetting(input.getAttribute("data-setting"), input.checked);
    play(input.checked ? "toggleOn" : "toggleOff");
  });
});

soundSwitch.addEventListener("change", function () {
  if (soundSwitch.checked !== isSoundOn()) toggleSound();
});

let lastVolumeTick = 0;
volumeSlider.addEventListener("input", function () {
  setSetting("volume", Number(volumeSlider.value));
  volumeValue.textContent = Math.round(Number(volumeSlider.value) * 100) + "%";
  const now = performance.now();
  if (now - lastVolumeTick > 60) {
    lastVolumeTick = now;
    play("tick"); // you hear the new volume while dragging
  }
});

settingsReset.addEventListener("click", function () {
  resetSettings();
  setSoundOn(true);
  play("success");
});

restoreButton.addEventListener("click", function () {
  setSetting("ui", true);
  play("toggleOn");
});

onSettingChange(function () {
  applyDisplaySettings();
  syncSettingsForm();
});
onSoundChange(syncSettingsForm);
applyDisplaySettings();

// Start the space hum and the music on the welcome screen (they begin after the first click or key press)
setLoop("ambient", 1);
setLoop("music", 1);

// ----- Clock: the visitor's own local time, in every top bar -----
// No time zone is written anywhere: Intl.DateTimeFormat with no timeZone option uses the browser's zone.
const clocks = document.querySelectorAll ? document.querySelectorAll("[data-clock]") : [];
let clockFormat = null;
let clockZoneName = "";
try {
  clockFormat = new Intl.DateTimeFormat(undefined, {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit",
    timeZoneName: "short"
  });
  clockZoneName = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
} catch (error) {
  clockFormat = null;
}

function updateClocks() {
  const now = new Date();
  let html = now.toLocaleTimeString();
  if (clockFormat && clockFormat.formatToParts) {
    const parts = {};
    clockFormat.formatToParts(now).forEach(function (p) { parts[p.type] = p.value; });
    html = '<span class="clock-date">' + parts.weekday + " " + parts.day + " " + parts.month + "</span> <b>" +
      parts.hour + ":" + parts.minute + ":" + parts.second + '</b> <span class="clock-zone">' + (parts.timeZoneName || "") + "</span>";
  }
  clocks.forEach(function (clock) {
    clock.innerHTML = html;
    clock.title = "Your local time" + (clockZoneName ? " (" + clockZoneName + ")" : "");
  });
}

// Settings > Narrator voice and speed (js/narrator.js picks the most natural voice by default)
const voiceSelect = document.getElementById("set-voice");
const rateSlider = document.getElementById("set-rate");
const rateValue = document.getElementById("set-rate-value");

function fillVoices() {
  voiceSelect.innerHTML = "";
  const auto = document.createElement("option");
  auto.value = "";
  const best = getChosenVoice();
  auto.textContent = "Most natural available" + (best && !getSetting("narratorVoice") ? " (" + best.name + ")" : "");
  voiceSelect.appendChild(auto);
  getVoices().forEach(function (voice) {
    const option = document.createElement("option");
    option.value = voice.name;
    option.textContent = voice.name + " · " + voice.lang;
    voiceSelect.appendChild(option);
  });
  voiceSelect.value = getSetting("narratorVoice");
  voiceSelect.disabled = !speechSupported;
}
fillVoices();
onVoicesChange(fillVoices);
voiceSelect.addEventListener("change", function () {
  setSetting("narratorVoice", voiceSelect.value);
  fillVoices();
});
rateSlider.value = String(getSetting("narratorRate"));
rateValue.textContent = Math.round(getSetting("narratorRate") * 100) + "%";
rateSlider.addEventListener("input", function () {
  setSetting("narratorRate", Number(rateSlider.value));
  rateValue.textContent = Math.round(Number(rateSlider.value) * 100) + "%";
});
document.getElementById("set-voice-test").addEventListener("click", function () {
  speakNarration("Hello, I'm your mission narrator. On July 20th, 1969, at 20:17 UTC, the Eagle landed at Tranquility Base, about 384,000 km from home.", function () {});
});

updateClocks();
setInterval(updateClocks, 1000);

// ----- The brand name in the top bar goes Home -----
(document.querySelectorAll ? document.querySelectorAll("[data-home]") : []).forEach(function (link) {
  link.addEventListener("click", function (event) {
    event.preventDefault();
    goHome();
  });
});

// ----- The left list: on phones it slides in and out over the view. On wider screens the Solar System
// list can be hidden too (its "‹" button), and the ☰ button in the top bar brings it back; while it is
// hidden the screen uses the full width, so the view controls move to the middle. -----
(document.querySelectorAll ? document.querySelectorAll("[data-sidebar]") : []).forEach(function (button) {
  button.setAttribute("data-silent", "");
  button.addEventListener("click", function () {
    const list = document.getElementById(button.getAttribute("data-sidebar"));
    const screen = list.closest ? list.closest(".screen") : null;
    const phone = window.innerWidth <= 760;
    if (!phone && screen && screen.classList.contains("can-hide-sidebar")) {
      const hidden = screen.classList.toggle("sidebar-collapsed");
      // the button names what the next click does
      button.setAttribute("aria-label", hidden ? "Expand the list" : "Collapse the list");
      button.title = hidden ? "Expand the list" : "Collapse the list";
      play(hidden ? "close" : "open");
      window.dispatchEvent(new Event("resize")); // the 3D view and its overlays refit the new width
      return;
    }
    play(list.classList.toggle("open") ? "open" : "close");
  });
});

console.log("Space Legacy main.js loaded.");