// The mission player: plays a mission like a documentary, chapter after chapter, from the launch
// to the end (back on Earth, or out in space). It drives three engines:
//   launch  (js/launch-cinematic.js)   countdown, liftoff, climb to orbit
//   film    (js/space-film.js)         space shots
//   landing (js/landing-scene.js)      landings and splashdowns
// Controls: Previous, Play/Pause, Next scene, a clickable chapter timeline, Narration and Captions toggles.
// Keyboard: Space = pause, Right arrow = next scene, Left arrow = previous, Esc = exit.

import { startCinematic, stopCinematic, pauseCinematic, nextCinematicScene, cinematicInfo } from "./launch-cinematic.js";
import { startFilm, stopFilm, pauseFilm, filmProgress } from "./space-film.js";
import { startLanding, stopLanding, pauseLanding, landingProgress } from "./landing-scene.js";
import { speak, stopSpeaking, speechSupported, getVoices, getChosenVoice, onVoicesChange, voiceQuality } from "./narrator.js";
import { getSetting, setSetting } from "./settings.js";
import { getPlaybackSpeed, setPlaybackSpeed } from "./playback.js";
import { play, isSoundOn, isGroupOn, setGroupOn } from "./sounds.js";

const el = function (id) { return document.getElementById(id); };
const root = el("mission-player");
const missionText = el("mp-mission");
const chapterText = el("mp-chapter");
const dateText = el("mp-date");
const captionText = el("mp-caption");
const timeline = el("mp-timeline");
const playButton = el("mp-play");
const prevButton = el("mp-prev");
const nextButton = el("mp-next");
const voiceButton = el("mp-voice");
const captionsButton = el("mp-captions");
const exitButton = el("mp-exit");
const timeText = el("mp-time");
const fade = el("mp-fade");
const card = el("mp-card");
const cardTitle = el("mp-card-title");
const cardText = el("mp-card-text");
const cardAgain = el("mp-card-again");
const cardClose = el("mp-card-close");
const mapBox = el("mp-map");
const speedButtons = root.querySelectorAll ? Array.from(root.querySelectorAll(".mp-speed-btn[data-speed]")) : [];

let hooks = { show: function () {}, exit: function () {} };
let plan = null;
let options = {};
let index = -1;
let active = false;
let paused = false;
let engineDone = false;
let voiceDone = true;
let waitTimer = null;
let advanceTimer = null;
let token = 0;
let captionsOn = true;
let tickId = null;
let inPre = false; // inside "Descent & Landing": true while the approach (film) part plays

export function initPlayer(h) {
  hooks = Object.assign(hooks, h || {});
}

function voiceOn() {
  return speechSupported && isSoundOn() && isGroupOn("voice");
}

// ----- Timeline and mission map -----
function estimate(c) {
  if (c.engine === "launch") return 41;
  if (c.engine === "landing") return 30;
  return c.short ? 9 : 14;
}

function buildTimeline() {
  timeline.innerHTML = "";
  plan.chapters.forEach(function (c, i) {
    const seg = document.createElement("button");
    seg.className = "mp-seg";
    seg.style.flexGrow = String(estimate(c));
    seg.title = (i + 1) + ". " + c.label + (c.title && c.title !== c.label ? ": " + c.title : "");
    seg.setAttribute("data-silent", "");
    seg.innerHTML = '<i></i><span></span>';
    if (seg.querySelector) seg.querySelector("span").textContent = c.label;
    seg.addEventListener("click", function () { play("click"); goTo(i); });
    timeline.appendChild(seg);
  });
  buildMap();
}

function worldsOf() {
  const list = [];
  plan.chapters.forEach(function (c) {
    const w = c.shot && c.shot.world;
    if (w && w !== "earth" && list.indexOf(w) === -1) list.push(w);
    if (c.engine === "landing" && c.item && c.item.destination && c.item.destination !== "Earth") {
      const d = c.item.destination.toLowerCase();
      if (list.indexOf(d) === -1) list.push(d);
    }
  });
  return list;
}

const MAP_COLORS = { moon: "#cfcac2", mars: "#e0763a", venus: "#f2d79a", mercury: "#b9b3ab", jupiter: "#e8c08a", saturn: "#f0dcae", uranus: "#a8dde6", neptune: "#5a7fe0", titan: "#e0a040", pluto: "#d9c3a6", sun: "#ffd36e", bennu: "#8f877d", comet: "#9ab0c8", arrokoth: "#b06a50" };

function buildMap() {
  if (!mapBox) return;
  const worlds = worldsOf().slice(0, 5);
  const returns = plan.chapters.some(function (c) { return c.engine === "landing" && c.item && c.item.destination === "Earth"; });
  let svg = '<svg viewBox="0 0 220 90" aria-hidden="true"><circle cx="20" cy="62" r="7" fill="#3f7fd8"/><text x="20" y="84" text-anchor="middle">Earth</text>';
  const step = worlds.length ? 180 / worlds.length : 0;
  let path = "M20 62";
  worlds.forEach(function (w, i) {
    const x = 20 + step * (i + 1);
    const y = 30 + (i % 2) * 14;
    path += " Q" + (x - step / 2) + " " + (y - 26) + " " + x + " " + y;
    svg += '<circle cx="' + x + '" cy="' + y + '" r="' + (w === "jupiter" || w === "saturn" || w === "sun" ? 7 : 5) + '" fill="' + (MAP_COLORS[w] || "#aaa") + '"/><text x="' + x + '" y="' + (y + 16) + '" text-anchor="middle">' + w.charAt(0).toUpperCase() + w.slice(1) + "</text>";
  });
  if (returns && worlds.length) path += " Q110 92 24 66";
  // Colours come from the shared status palette in css/style.css (.mp-map #mp-route / #mp-dot)
  svg += '<path id="mp-route" d="' + path + '" fill="none" stroke-width="1.4" stroke-dasharray="3 3"/><circle id="mp-dot" r="3.5"/></svg>';
  mapBox.innerHTML = '<p>Mission map</p>' + svg;
  mapBox.classList.toggle("hidden", worlds.length === 0);
}

function updateMap(progress) {
  const route = mapBox && mapBox.querySelector ? mapBox.querySelector("path") : null;
  const dot = mapBox && mapBox.querySelector ? mapBox.querySelector("circle:last-child") : null;
  if (!route || !dot || !route.getTotalLength) return;
  try {
    const point = route.getPointAtLength(route.getTotalLength() * Math.max(0, Math.min(1, progress)));
    dot.setAttribute("cx", point.x);
    dot.setAttribute("cy", point.y);
  } catch (error) { /* not drawn yet */ }
}

function chapterProgress() {
  const c = plan && plan.chapters[index];
  if (!c) return 0;
  if (c.engine === "launch") {
    const info = cinematicInfo();
    return info ? (info.index + info.progress) / 2 : engineDone ? 1 : 0;
  }
  if (c.engine === "film") return filmProgress();
  if (c.pre) return inPre ? filmProgress() * 0.4 : 0.4 + landingProgress() * 0.6;
  return landingProgress();
}

function tick() {
  if (!active) return;
  tickId = requestAnimationFrame(tick);
  const segs = timeline.children;
  const p = chapterProgress();
  for (let i = 0; i < segs.length; i++) {
    const fill = i < index ? 1 : i === index ? p : 0;
    const bar = segs[i].querySelector ? segs[i].querySelector("i") : null;
    if (bar) bar.style.width = (fill * 100).toFixed(1) + "%";
    segs[i].classList.toggle("current", i === index);
    segs[i].classList.toggle("done", i < index);
  }
  if (plan) updateMap((index + p) / plan.chapters.length);
}

// ----- Playing chapters -----
function stopEngines() {
  stopCinematic();
  stopFilm();
  stopLanding();
}

function setText(c) {
  missionText.textContent = plan.title + " · Scene " + (index + 1) + " of " + plan.chapters.length;
  chapterText.textContent = c.title || c.label;
  dateText.textContent = c.date || "";
  captionText.textContent = c.caption || "";
  captionText.classList.toggle("hidden", !captionsOn || !c.caption);
  timeText.textContent = c.label;
  nextButton.textContent = index >= plan.chapters.length - 1 ? "Finish ⏭" : "Skip ⏭";
}

function startChapter(i) {
  clearTimeout(waitTimer);
  clearTimeout(advanceTimer);
  stopSpeaking();
  index = i;
  const c = plan.chapters[i];
  const my = ++token;
  engineDone = false;
  voiceDone = true;
  paused = false;
  playButton.textContent = "Pause";
  setText(c);
  card.classList.add("hidden");
  if (options.onChapter) options.onChapter(c, i);

  // A short dip to black between scenes, like a film cut
  fade.classList.add("on");
  setTimeout(function () {
    if (my !== token) return;
    hooks.show(c.engine);
    if (c.engine === "launch") {
      startCinematic(function () { if (my === token) { engineDone = true; tryAdvance(my, true); } }, { mission: true, caption: plan.title + " · " + c.title + (c.date ? " · " + c.date : ""), rocket: c.rocket, look: c.look || null });
    } else if (c.engine === "film") {
      startFilm(c.shot, function () { if (my === token) { engineDone = true; tryAdvance(my, false); } });
    } else if (c.pre) {
      // Descent & Landing: the approach plays first, then the touchdown scene dissolves in (no cut to black)
      inPre = true;
      hooks.show("film");
      setPreText(c, true);
      startFilm(c.pre.shot, function () {
        if (my !== token) return;
        inPre = false;
        setPreText(c, false);
        hooks.show("landing");
        startLanding(c.item);
        sayLine(my, c.narration);
      });
    } else {
      startLanding(c.item);
    }
    fade.classList.remove("on");
    sayLine(my, c.pre ? c.pre.narration : c.narration);
  }, 380);
}

function sayLine(my, text) {
  if (voiceOn() && text && getPlaybackSpeed() === 1) { // at 2x and 4x the captions tell the story
    voiceDone = false;
    stopSpeaking();
    speak(text, function () { if (my === token) { voiceDone = true; tryAdvance(my, false); } });
  }
}

function setPreText(c, approach) {
  chapterText.textContent = approach ? c.pre.title : (c.title || c.label);
  captionText.textContent = approach ? c.pre.caption : (c.caption || "");
  captionText.classList.toggle("hidden", !captionsOn || !captionText.textContent);
}

// Move on when the scene has ended and the narrator has finished the thought (but never wait forever)
function tryAdvance(my, force) {
  if (my !== token || !engineDone || paused) return;
  if (voiceDone || force || !voiceOn() || getPlaybackSpeed() > 1) {
    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(function () { if (my === token && !paused) advance(); }, force ? 0 : 900);
    return;
  }
  clearTimeout(waitTimer);
  waitTimer = setTimeout(function () { if (my === token && !paused) advance(); }, 14000);
}

function advance() {
  if (!plan) return;
  if (options.stopAfter !== undefined && index >= options.stopAfter) { finish(true); return; }
  if (index < plan.chapters.length - 1) startChapter(index + 1);
  else finish(false);
}

document.addEventListener("landing-finished", function () {
  if (!active || !plan || plan.chapters[index].engine !== "landing") return;
  engineDone = true;
  tryAdvance(token, false);
});

function finish(cut) {
  const done = options.onFinish;
  const finished = plan;
  stopSpeaking();
  if (cut) {
    // the mission continues somewhere else (exploring the landing site)
    close(false);
    if (done) done(finished, true);
    return;
  }
  // The end card stays over the last scene
  const last = plan.chapters[plan.chapters.length - 1];
  cardTitle.textContent = plan.title + " · " + (options.endTitle || "Mission complete");
  cardText.textContent = last.caption || "";
  card.classList.remove("hidden");
  play("success");
  if (options.onFinish && options.finishWithoutCard) { close(false); done(finished, false); }
}

function goTo(i) {
  if (!plan) return;
  startChapter(Math.max(0, Math.min(plan.chapters.length - 1, i)));
}

export function nextChapter() {
  if (!active || !plan) return;
  const c = plan.chapters[index];
  play("click");
  if (c.engine === "launch" && cinematicInfo() && cinematicInfo().index === 0) {
    nextCinematicScene(); // from the countdown straight to the climb to orbit
    return;
  }
  if (options.stopAfter !== undefined && index >= options.stopAfter) { finish(true); return; }
  if (index >= plan.chapters.length - 1) { finish(false); return; }
  startChapter(index + 1);
}

export function prevChapter() {
  if (!active || !plan) return;
  play("click");
  startChapter(chapterProgress() > 0.15 || index === 0 ? index : index - 1);
}

export function togglePause() {
  if (!active || !plan) return;
  paused = !paused;
  playButton.textContent = paused ? "Play" : "Pause";
  pauseCinematic(paused);
  pauseFilm(paused);
  pauseLanding(paused);
  if (typeof window !== "undefined" && window.speechSynthesis) {
    if (paused && window.speechSynthesis.pause) window.speechSynthesis.pause();
    if (!paused && window.speechSynthesis.resume) window.speechSynthesis.resume();
  }
  play(paused ? "pause" : "resume");
  if (!paused) tryAdvance(token, false);
}

function close(callExit) {
  active = false;
  setPlaybackSpeed(1); // nothing else in the app plays fast
  token++;
  clearTimeout(waitTimer);
  clearTimeout(advanceTimer);
  stopSpeaking();
  stopEngines();
  if (tickId !== null) { cancelAnimationFrame(tickId); tickId = null; }
  root.classList.add("hidden");
  card.classList.add("hidden");
  document.body.classList.remove("player-on");
  if (callExit) hooks.exit(plan);
  plan = null;
}

export function stopPlayer() {
  if (active) close(false);
}

// plan: { title, chapters[] }. opts: { onFinish(plan, cut), stopAfter, endTitle, onChapter }
export function playPlan(p, opts) {
  if (!p || !p.chapters || !p.chapters.length) return false;
  if (active) close(false);
  plan = p;
  options = opts || {};
  active = true;
  root.classList.remove("hidden");
  document.body.classList.add("player-on");
  voiceButton.textContent = voiceOn() ? "Narration: On" : "Narration: Off";
  captionsButton.textContent = captionsOn ? "Captions: On" : "Captions: Off";
  setSpeed(1); // every replay starts at normal speed
  fillVoicePicker();
  buildTimeline();
  startChapter(0);
  if (tickId === null) tick();
  return true;
}

export function playerState() {
  return { active: active, index: index, paused: paused, plan: plan, chapter: plan ? plan.chapters[index] : null, engineDone: engineDone };
}

// ----- Speed: 1x (default), 2x, 4x -----
function setSpeed(value) {
  setPlaybackSpeed(value);
  const speed = getPlaybackSpeed();
  speedButtons.forEach(function (button) {
    const on = Number(button.dataset.speed) === speed;
    button.classList.toggle("active", on);
    button.setAttribute("aria-pressed", String(on));
  });
  if (speed > 1) { stopSpeaking(); voiceDone = true; tryAdvance(token, false); }
  timeText.title = speed === 1 ? "" : "Playing at " + speed + "x";
}
speedButtons.forEach(function (button) {
  button.addEventListener("click", function () { play("tick"); setSpeed(Number(button.dataset.speed)); });
});
export function playbackSpeed(value) {
  if (value !== undefined) setSpeed(value);
  return getPlaybackSpeed();
}

// ----- Narrator voice: every English voice the browser offers, most natural first, with a preview -----
const voiceSelect = el("mp-voice-select");
const voiceTest = el("mp-voice-test");
const voiceNote = el("mp-voice-note");
function fillVoicePicker() {
  voiceSelect.innerHTML = "";
  const list = getVoices();
  const chosen = getChosenVoice();
  list.forEach(function (voice, i) {
    const option = document.createElement("option");
    option.value = voice.name;
    option.textContent = (i === 0 ? "\u2605 " : "") + voice.name.replace(/^Microsoft /, "") + " \u00B7 " + voice.lang + " \u00B7 " + voiceQuality(voice);
    voiceSelect.appendChild(option);
  });
  if (!list.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = speechSupported ? "Loading voices\u2026" : "No voices in this browser";
    voiceSelect.appendChild(option);
  }
  voiceSelect.value = chosen ? chosen.name : "";
  voiceSelect.disabled = !list.length;
  voiceTest.disabled = !list.length;
  const natural = list.filter(function (v) { return voiceQuality(v) === "Natural"; }).length;
  let note = "";
  if (!speechSupported) note = "This browser has no speech voices. Captions still tell the story.";
  else if (list.length && list.length <= 3) note = "Your browser offers only " + list.length + " English voice" + (list.length === 1 ? "" : "s") + ". Microsoft Edge or Chrome usually have more natural ones.";
  else if (list.length && !natural) note = "No natural (neural) voices here; the clearest available voice is chosen. Microsoft Edge has natural voices.";
  voiceNote.textContent = note;
  voiceNote.classList.toggle("hidden", !note);
}
voiceSelect.addEventListener("change", function () {
  setSetting("narratorVoice", voiceSelect.value); // remembered in this browser
  play("tick");
});
voiceTest.addEventListener("click", function () {
  play("click");
  stopSpeaking();
  speak("This is your mission narrator. Liftoff, and the vehicle has cleared the tower.", function () {});
});
onVoicesChange(fillVoicePicker);
fillVoicePicker();
void getSetting;

// ----- Buttons and keys -----
playButton.addEventListener("click", togglePause);
nextButton.addEventListener("click", nextChapter);
prevButton.addEventListener("click", prevChapter);
exitButton.addEventListener("click", function () { play("click"); close(true); });
cardClose.addEventListener("click", function () {
  const done = options.onFinish;
  const finished = plan;
  close(!done);
  if (done) done(finished, false);
});
cardAgain.addEventListener("click", function () { if (plan) startChapter(0); });
voiceButton.addEventListener("click", function () {
  const on = !voiceOn();
  setGroupOn("voice", on);
  voiceButton.textContent = voiceOn() ? "Narration: On" : "Narration: Off";
  if (!voiceOn()) { stopSpeaking(); voiceDone = true; tryAdvance(token, false); }
  play(on ? "toggleOn" : "toggleOff");
});
captionsButton.addEventListener("click", function () {
  captionsOn = !captionsOn;
  captionsButton.textContent = captionsOn ? "Captions: On" : "Captions: Off";
  captionText.classList.toggle("hidden", !captionsOn || !captionText.textContent);
  play("click");
});

window.addEventListener("keydown", function (event) {
  if (!active) return;
  const k = event.key;
  if (k === "1" || k === "2" || k === "4") { setSpeed(Number(k)); play("tick"); return; }
  if (k === " " || k === "ArrowRight" || k === "ArrowLeft" || k === "Escape") {
    if (event.preventDefault) event.preventDefault();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    if (k === " ") togglePause();
    else if (k === "ArrowRight") nextChapter();
    else if (k === "ArrowLeft") prevChapter();
    else { play("click"); close(true); }
  }
}, true);
