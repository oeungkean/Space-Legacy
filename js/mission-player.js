// The mission player: plays a mission like a documentary, chapter after chapter, from the launch
// to the end (back on Earth, or out in space). It drives three engines:
//   launch  (js/launch-cinematic.js)   countdown, liftoff, climb to orbit
//   film    (js/space-film.js)         space shots
//   landing (js/landing-scene.js)      landings and splashdowns
// Controls: Previous, Play/Pause, Next scene, a clickable chapter timeline, Narration and Captions toggles.
// Keyboard: Space = pause, Right arrow = next scene, Left arrow = previous, Esc = exit.

import { startCinematic, stopCinematic, pauseCinematic, nextCinematicScene, cinematicInfo, seekCinematic } from "./launch-cinematic.js";
import { startFilm, stopFilm, pauseFilm, filmProgress, seekFilm } from "./space-film.js";
import { startLanding, stopLanding, pauseLanding, landingProgress, seekLanding } from "./landing-scene.js";
import { missionPhoto } from "../data/mission-photos.js";
import { speak, stopSpeaking, pauseSpeaking, resumeSpeaking, isSpeechHeld, speechSupported, getVoices, getChosenVoice, onVoicesChange, voiceQuality } from "./narrator.js";
import { getSetting, setSetting } from "./settings.js";
import { getPlaybackSpeed, setPlaybackSpeed } from "./playback.js";
import { play, isSoundOn, isGroupOn, setGroupOn, stopLoops } from "./sounds.js";
import { briefingForPlan } from "./briefing.js";

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
const cardOutcome = el("mp-card-outcome");
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
  if (c.shot && c.shot.kind === "orbit") return 22;
  if (c.shot && c.shot.kind === "depart") return 18;
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
    seg.addEventListener("click", function () {
      if (scrub.justDragged) return; // the drag already moved there
      play("click");
      goTo(i);
    });
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

const MAP_COLORS = { moon: "#cfcac2", mars: "#e0763a", venus: "#f2d79a", mercury: "#b9b3ab", jupiter: "#e8c08a", saturn: "#f0dcae", uranus: "#a8dde6", neptune: "#5a7fe0", titan: "#e0a040", pluto: "#d9c3a6", sun: "#ffd36e", bennu: "#8f877d", vesta: "#a39d93", ceres: "#77746e", eros: "#b39c7c", mathilde: "#6a6763", comet: "#9ab0c8", arrokoth: "#b06a50" };

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
  if (!worlds.length) {
    // a mission that stays near Earth: its orbit around Earth (every replay has a mission map)
    svg = '<svg viewBox="0 0 220 90" aria-hidden="true"><circle cx="110" cy="46" r="13" fill="#3f7fd8"/><text x="110" y="84" text-anchor="middle">Earth</text>' +
      '<path id="mp-route" d="M60 46 A50 20 0 1 1 160 46 A50 20 0 1 1 60 46" fill="none" stroke-width="1.4" stroke-dasharray="3 3"/><circle id="mp-dot" r="3.5"/></svg>';
  }
  mapBox.innerHTML = '<p>Mission map</p>' + svg;
  mapBox.classList.remove("hidden");
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
    return info ? (info.index + info.progress) / (info.count || 2) : engineDone ? 1 : 0;
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
  // the new scene's title and caption fade in, rather than snapping to the new text
  [chapterText, captionText, dateText].forEach(function (node) {
    node.classList.remove("mp-swap");
    void node.offsetWidth;
    node.classList.add("mp-swap");
  });
  showSceneLabel();
  nextButton.textContent = index >= plan.chapters.length - 1 ? "Finish ⏭" : "Skip ⏭";
}

// natural: the story moved on by itself (not a jump made with the buttons or the progress bar)
function startChapter(i, natural) {
  root.classList.remove("mp-complete");
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
  briefOnChapter(c);
  card.classList.add("hidden");
  if (options.onChapter) options.onChapter(c, i);

  // Between scenes: a cross-dissolve. The last picture of the old scene is held on top and melts away
  // while the new scene starts underneath (with a slow push in). If the picture can't be taken, a soft
  // dip is used instead.
  // When the story moves on by itself, a short bridge comes first: a card says what happens next and
  // when, while the scene that just ended keeps moving behind it (the rocket, the planet and the stars
  // carry on; nothing freezes). Then the old picture melts into the new scene.
  const bridgeTime = natural && !firstScene ? 3200 / Math.max(1, getPlaybackSpeed()) : 0; // long enough to read
  if (bridgeTime > 0) {
    showBridge(c, i, false);
    sayLine(my, c.pre ? c.pre.narration : c.narration); // the narrator speaks over the title card too
    spokenFor = my;
  }
  setTimeout(function next() {
    if (my !== token) return;
    if (paused) { setTimeout(next, 200); return; } // a pause also holds the title card
    holdLastFrame(function (held) {
      if (my !== token) return;
      hideBridge();
      if (!held) fade.classList.add("on");
      setTimeout(function () {
        if (my !== token) return;
        beginChapter(my, c, held);
      }, held ? 0 : 320);
    });
  }, bridgeTime);
}

const bridge = document.createElement("div");
bridge.className = "mp-bridge";
bridge.setAttribute("aria-hidden", "true");
bridge.innerHTML = '<p class="mp-bridge-step"></p><h3 class="mp-bridge-title"></h3><p class="mp-bridge-line"></p>';
// (put in place on first use: the dissolve layer it sits above is created further down this file)
function firstSentence(text) {
  const m = String(text || "").match(/^[^.!?]*[.!?]/);
  const sentence = m ? m[0] : String(text || "");
  return sentence.length > 140 ? sentence.slice(0, 137) + "…" : sentence;
}
function showBridge(c, i, held) {
  if (!bridge.parentNode && root.insertBefore) root.insertBefore(bridge, dissolve.nextSibling);
  bridge.querySelector(".mp-bridge-step").textContent = "Scene " + (i + 1) + " of " + plan.chapters.length + (c.date ? " · " + c.date : "");
  bridge.querySelector(".mp-bridge-title").textContent = c.title || c.label || "";
  bridge.querySelector(".mp-bridge-line").textContent = firstSentence(c.caption);
  dissolve.classList.toggle("dim", Boolean(held));
  bridge.classList.add("on");
  root.classList.add("bridging"); // a soft dark wash over the live scene, so the card can be read
}
function hideBridge() {
  bridge.classList.remove("on");
  dissolve.classList.remove("dim");
  root.classList.remove("bridging");
}

// The cross-dissolve picture: drawn into a 2D canvas inside an animation frame, right after the 3D
// scene has drawn (a WebGL canvas can only be copied then)
const dissolve = document.createElement("canvas");
dissolve.className = "mp-dissolve";
dissolve.setAttribute("aria-hidden", "true");
if (root.insertBefore) root.insertBefore(dissolve, root.firstChild);
function holdLastFrame(done) {
  const source = document.querySelector(".screen:not(.hidden) canvas");
  if (firstScene || !source || !dissolve.getContext || !source.width) { done(false); return; } // the first scene fades in from black
  requestAnimationFrame(function () {
    try {
      dissolve.width = source.width;
      dissolve.height = source.height;
      const ctx = dissolve.getContext("2d");
      ctx.drawImage(source, 0, 0);
      // a picture of nothing (the scene had not drawn yet) is not worth holding
      const probe = ctx.getImageData(Math.floor(source.width / 2), Math.floor(source.height / 2), 1, 1).data;
      const corner = ctx.getImageData(4, 4, 1, 1).data;
      if (probe[3] === 0 && corner[3] === 0) { done(false); return; }
      dissolve.classList.remove("melt");
      dissolve.classList.add("on");
      done(true);
    } catch (error) {
      done(false);
    }
  });
}
function meltHeldFrame() {
  if (!dissolve.classList.contains("on")) return;
  // give the new scene a moment to draw its first frames, then melt the old picture away
  setTimeout(function () {
    dissolve.classList.add("melt");
    setTimeout(function () { dissolve.classList.remove("on", "melt"); }, 2000);
  }, 140);
}

let firstScene = true;
let pendingBrief = null;
let spokenFor = -1; // the scene whose narration has already started (during its title card)
function beginChapter(my, c, held) {
  firstScene = false;
  if (pendingBrief) {
    const b = pendingBrief;
    pendingBrief = null;
    setTimeout(function () { if (active && plan && !root.classList.contains("mp-complete")) { showBriefing(b); briefOnChapter(plan.chapters[index]); } }, 1800);
  }
  stopEngines(); // the scene that just ended kept moving under the bridge card; one render loop at a time
  {
    hooks.show(c.engine);
    if (c.engine === "launch") {
      startCinematic(function () { if (my === token) { engineDone = true; tryAdvance(my, false); } }, { mission: true, caption: plan.title + " · " + c.title + (c.date ? " · " + c.date : ""), rocket: c.rocket, look: c.look || null });
    } else if (c.engine === "film") {
      startFilm(c.shot, function () { if (my === token) { engineDone = true; tryAdvance(my, false); } });
    } else if (c.pre) {
      // Descent & Landing: the approach plays first, then the touchdown scene dissolves in (no cut to black)
      inPre = true;
      hooks.show("film");
      setPreText(c, true);
      startFilm(withSite(c.pre.shot, c.item), function () { toLandingPart(my, c); });
    } else {
      startLanding(c.item);
    }
    fade.classList.remove("on");
    if (held) meltHeldFrame();
    if (pendingSeek !== null) applySeek(c, pendingSeek);
    if (spokenFor !== my) sayLine(my, c.pre ? c.pre.narration : c.narration);
  }
}

// From the descent (space film) to the touchdown scene, with a cross-dissolve between them
function toLandingPart(my, c) {
  if (my !== token || !inPre) return;
  holdLastFrame(function (held) {
    if (my !== token) return;
    inPre = false;
    stopFilm();
    setPreText(c, false);
    hooks.show("landing");
    startLanding(c.item);
    if (held) meltHeldFrame();
    sayLine(my, c.narration);
    if (pendingSeek !== null) { seekLanding(pendingSeek); pendingSeek = null; }
  });
}

// The landing site (real coordinates) is passed to the descent shot, which marks it on the globe
function withSite(shot, item) {
  if (!item || typeof item.lat !== "number" || typeof item.lon !== "number") return shot;
  return Object.assign({}, shot, { site: { lat: item.lat, lon: item.lon, label: shortPlace(item.location || item.name), mission: item.mission || "" } });
}
function shortPlace(text) {
  const first = String(text || "").split(/[(,]/)[0].trim();
  return first.length > 34 ? first.slice(0, 33) + "…" : first;
}

// ----- The mission briefing: a glass card on the left (from -> to, journey time, possible or not; Show
// more: why). It stays until the landing begins, then slides away; its tab brings it back any time. -----
const brief = el("mp-brief");
const briefTab = el("mp-brief-tab");
function setBriefOpen(open) {
  if (!brief) return;
  brief.classList.toggle("collapsed", !open);
  briefTab.setAttribute("aria-expanded", String(open));
  briefTab.title = open ? "Hide the briefing" : "Show the briefing";
}
function showBriefing(b) {
  if (!brief) return;
  brief.classList.add("hidden");
  if (!b) return;
  el("mp-brief-title").textContent = b.title;
  el("mp-brief-from").textContent = b.from.name;
  el("mp-brief-from-coords").textContent = b.from.coords.replace(/^About /, "~ ");
  el("mp-brief-to").textContent = b.to.name;
  el("mp-brief-to-coords").textContent = b.to.coords || "";
  el("mp-brief-time").textContent = b.journey || "Unknown";
  const verdict = el("mp-brief-verdict");
  verdict.className = "mb-verdict " + (b.verdict ? b.verdict.kind : "");
  // a small sign, not a big red cross: the reach meter below shows why
  verdict.querySelector("i").textContent = !b.verdict ? "" : b.verdict.kind === "possible" ? "\u2713" : b.verdict.kind === "real" ? "\u2605" : b.verdict.kind === "unlikely" ? "!" : "?";
  // Reach meter: four steps (Earth orbit, Moon, planets, far out); the bar is how far this rocket
  // really sent anything, the flag is where this trip goes, and a gap means it would need more
  const meter = el("mp-brief-meter");
  const m = b.verdict && b.verdict.meter;
  meter.classList.toggle("hidden", !m);
  if (m) {
    const at = function (rank) { return (Math.max(0, Math.min(4, rank)) / 4) * 100; };
    const reach = m.reach < 0 ? 0 : at(m.reach + 0.5);
    const need = at(m.need + 0.5);
    meter.querySelector(".mb-reach").style.width = reach.toFixed(1) + "%";
    const gap = meter.querySelector(".mb-gap");
    gap.style.left = reach.toFixed(1) + "%";
    gap.style.width = Math.max(0, need - reach).toFixed(1) + "%";
    meter.querySelector(".mb-flag").style.left = need.toFixed(1) + "%";
    meter.classList.toggle("short", need > reach + 0.1);
  }
  verdict.querySelector("b").textContent = b.verdict ? b.verdict.label : "";
  verdict.querySelector("span").textContent = b.verdict ? (b.verdict.tagline || b.verdict.short) : "";
  const list = el("mp-brief-reasons");
  list.innerHTML = "";
  // Show more: a short bullet summary (a label and a few words), not paragraphs
  (b.verdict ? (b.verdict.bullets || b.verdict.reasons.map(function (r) { return ["", r]; })) : []).forEach(function (pair) {
    const li = document.createElement("li");
    if (pair[0]) {
      const k = document.createElement("b");
      k.textContent = pair[0];
      li.appendChild(k);
    }
    const v = document.createElement("span");
    v.textContent = pair[1];
    li.appendChild(v);
    list.appendChild(li);
  });
  list.classList.add("hidden");
  const more = el("mp-brief-more");
  more.textContent = "Show more";
  more.setAttribute("aria-expanded", "false");
  brief.classList.remove("hidden");
  setBriefOpen(true);
}
// The landing has begun: the briefing slides out of the way (its tab stays)
function briefOnChapter(c) {
  if (!brief || brief.classList.contains("hidden")) return;
  if (c && (c.engine === "landing" || c.pre)) setBriefOpen(false);
}
if (brief) {
  briefTab.addEventListener("click", function () { play("click"); setBriefOpen(brief.classList.contains("collapsed")); });
  el("mp-brief-more").addEventListener("click", function () {
    const list = el("mp-brief-reasons");
    const open = list.classList.toggle("hidden") === false;
    this.textContent = open ? "Show less" : "Show more";
    this.setAttribute("aria-expanded", String(open));
    play("click");
  });
}

function sayLine(my, text) {
  if (voiceOn() && text) { // at every speed: the narrator always tells the story
    voiceDone = false;
    stopSpeaking();
    // the subtitle shows exactly the sentence being spoken
    speak(text, function () { if (my === token) { voiceDone = true; tryAdvance(my, false); } }, function (sentence) {
      if (my !== token || !captionsOn) return;
      captionText.textContent = sentence;
      captionText.classList.remove("hidden");
    });
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
  if (voiceDone || force || !voiceOn()) {
    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(function () { if (my === token && !paused) advance(); }, force ? 0 : 900);
    return;
  }
  clearTimeout(waitTimer);
  waitTimer = setTimeout(function () { if (my === token && !paused) advance(); }, 120000);
  // The scene holds until the narrator has finished the line (Master Doc 15). If the voice was stopped
  // by something else (so its "finished" signal never comes), move on once it has gone quiet.
  clearInterval(quietTimer);
  let quiet = 0;
  quietTimer = setInterval(function () {
    if (my !== token || voiceDone) { clearInterval(quietTimer); return; }
    if (paused || isSpeechHeld()) { quiet = 0; return; }
    quiet = window.speechSynthesis && window.speechSynthesis.speaking ? 0 : quiet + 1;
    if (quiet >= 6) { // about 3 seconds of silence (longer than any pause between sentences)
      clearInterval(quietTimer);
      voiceDone = true;
      tryAdvance(my, false);
    }
  }, 500);
}
let quietTimer = null;

function advance() {
  if (!plan) return;
  if (options.stopAfter !== undefined && index >= options.stopAfter) { finish(true); return; }
  if (index < plan.chapters.length - 1) startChapter(index + 1, true);
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
  // The mission's name is the title; the outcome ("Mission complete") is a short line under it
  cardTitle.textContent = plan.title;
  if (cardOutcome) cardOutcome.textContent = options.endTitle || "Mission complete";
  cardText.textContent = last.caption || "";
  showCardPhoto(plan.title);
  root.classList.add("mp-complete"); // the briefing and the mission map step aside for the end card
  card.classList.remove("hidden");
  play("success");
  if (options.onFinish && options.finishWithoutCard) { close(false); done(finished, false); }
}

// A real photo of the mission on the end card (NASA images, loaded from NASA when online). If it cannot
// be loaded, the card shows without it.
function showCardPhoto(title) {
  const figure = el("mp-card-photo");
  if (!figure) return;
  const photo = missionPhoto(title);
  figure.classList.add("hidden");
  if (!photo) return;
  const img = figure.querySelector("img");
  img.onload = function () { figure.classList.remove("hidden"); };
  img.onerror = function () { figure.classList.add("hidden"); };
  img.alt = photo.caption;
  figure.querySelector(".mcp-caption").textContent = photo.caption;
  const credit = figure.querySelector(".mcp-credit");
  credit.textContent = photo.credit;
  credit.href = photo.page || "#";
  img.src = photo.src;
}

// ----- Dragging the progress bar: backward or forward, to any point of any scene -----
const scrub = { active: false, justDragged: false, chapter: 0, fraction: 0 };
let pendingSeek = null;
const scrubThumb = document.createElement("span");
scrubThumb.className = "mp-scrub hidden";
scrubThumb.setAttribute("aria-hidden", "true");
scrubThumb.innerHTML = "<b></b>";
if (timeline.parentNode && timeline.parentNode.insertBefore) {
  timeline.parentNode.insertBefore(scrubThumb, timeline.nextSibling);
  timeline.parentNode.classList.add("mp-has-scrub");
}

function scrubAt(clientX) {
  const segs = timeline.children;
  if (!segs.length) return null;
  for (let i = 0; i < segs.length; i++) {
    const r = segs[i].getBoundingClientRect();
    const last = i === segs.length - 1;
    if (clientX < r.right + 1.5 || last) {
      const f = Math.max(0, Math.min(1, (clientX - r.left) / Math.max(1, r.width)));
      return { chapter: i, fraction: f };
    }
  }
  return null;
}

function showScrub(clientX, at) {
  const box = timeline.getBoundingClientRect();
  const parentBox = timeline.parentNode.getBoundingClientRect();
  scrubThumb.classList.remove("hidden");
  scrubThumb.style.left = (Math.max(box.left, Math.min(box.right, clientX)) - parentBox.left) + "px";
  scrubThumb.style.top = (box.top - parentBox.top) + "px";
  const c = plan.chapters[at.chapter];
  scrubThumb.querySelector("b").textContent = (at.chapter + 1) + ". " + (c.label || "") + " · " + Math.round(at.fraction * 100) + "%";
}

function applySeek(c, f) {
  pendingSeek = null;
  if (f <= 0.01) return;
  if (c.engine === "launch") seekCinematic(f);
  else if (c.engine === "film") seekFilm(f);
  else if (c.pre) {
    // the first 40% is the descent from orbit, the rest is the touchdown scene
    if (f < 0.4) seekFilm(f / 0.4);
    else { pendingSeek = (f - 0.4) / 0.6; toLandingPart(token, c); }
  } else seekLanding(f);
}

function seekTo(chapter, fraction) {
  if (!plan) return;
  if (chapter === index) applySeek(plan.chapters[index], fraction);
  else {
    pendingSeek = fraction;
    goTo(chapter);
  }
}

timeline.addEventListener("pointerdown", function (event) {
  if (!plan || event.button > 0) return;
  scrub.active = true;
  scrub.moved = false;
  scrub.startX = event.clientX;
  if (timeline.setPointerCapture) { try { timeline.setPointerCapture(event.pointerId); } catch (error) { /* not needed */ } }
  const at = scrubAt(event.clientX);
  if (at) { scrub.chapter = at.chapter; scrub.fraction = at.fraction; showScrub(event.clientX, at); }
});
timeline.addEventListener("pointermove", function (event) {
  if (!scrub.active) return;
  if (Math.abs(event.clientX - scrub.startX) > 3) scrub.moved = true;
  const at = scrubAt(event.clientX);
  if (at) { scrub.chapter = at.chapter; scrub.fraction = at.fraction; showScrub(event.clientX, at); }
});
function endScrub(commit) {
  if (!scrub.active) return;
  scrub.active = false;
  scrubThumb.classList.add("hidden");
  if (!commit) return;
  scrub.justDragged = true;
  setTimeout(function () { scrub.justDragged = false; }, 0);
  play("click");
  seekTo(scrub.chapter, scrub.fraction < 0.03 ? 0 : scrub.fraction);
}
timeline.addEventListener("pointerup", function () { endScrub(true); });
timeline.addEventListener("pointercancel", function () { endScrub(false); });

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
  // Everything stops (Master Doc 13): the scene, its sounds, and the narrator, who stops after the word
  // being said and, on Play, says that sentence again and carries on (the subtitles follow)
  if (paused) {
    stopLoops("ambient", "music");
    pauseSpeaking();
  } else {
    resumeSpeaking();
  }
  play(paused ? "pause" : "resume");
  if (!paused) tryAdvance(token, false);
}

function close(callExit) {
  active = false;
  hideNasaChip();
  pendingBrief = null;
  root.classList.remove("mp-complete");
  if (brief) brief.classList.add("hidden");
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
  // the briefing comes in once the first scene is on screen (it used to appear at once, over the page
  // the replay was started from)
  if (brief) brief.classList.add("hidden");
  pendingBrief = options.brief || briefingForPlan(p);
  hideNasaChip();
  root.classList.remove("mp-complete");
  firstScene = true;
  startChapter(0);
  if (tickId === null) tick();
  return true;
}

export function playerState() {
  return { active: active, index: index, paused: paused, plan: plan, chapter: plan ? plan.chapters[index] : null, engineDone: engineDone };
}

// ----- Speed: 0.5x, 1x (default), 2x -----
function setSpeed(value) {
  setPlaybackSpeed(value);
  const speed = getPlaybackSpeed();
  speedButtons.forEach(function (button) {
    const on = Number(button.dataset.speed) === speed;
    button.classList.toggle("active", on);
    button.setAttribute("aria-pressed", String(on));
  });
  // (the narrator keeps talking at its normal pace at every speed)
  timeText.title = speed === 1 ? "" : "Playing at " + speed + "x";
  showSceneLabel();
}

// The scene name under the controls, with the speed when it is faster than normal ("Cruise · 4×"),
// so a speed change is easy to see
function showSceneLabel() {
  const c = plan && plan.chapters[index];
  const speed = getPlaybackSpeed();
  timeText.textContent = (c ? c.label : "") + (speed !== 1 ? " · " + speed + "× speed" : "");
  timeText.classList.toggle("fast", speed !== 1);
}
speedButtons.forEach(function (button) {
  button.addEventListener("click", function () { play("tick"); setSpeed(Number(button.dataset.speed)); });
});
export function playbackSpeed(value) {
  if (value !== undefined) setSpeed(value);
  return getPlaybackSpeed();
}

// ----- Narrator voice: every English voice the browser offers, most natural first -----
// (the round "preview" button next to the list was removed: team feedback, it was not needed)
const voiceSelect = el("mp-voice-select");
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
  if (k === "0" || k === "1" || k === "2") { setSpeed(k === "0" ? 0.5 : Number(k)); play("tick"); return; } // 0 = half speed
  if (k === " " || k === "ArrowRight" || k === "ArrowLeft" || k === "Escape") {
    if (event.preventDefault) event.preventDefault();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    if (k === " ") togglePause();
    else if (k === "ArrowRight") nextChapter();
    else if (k === "ArrowLeft") prevChapter();
    else { play("click"); close(true); }
  }
}, true);

// A small label when an official NASA 3D model is on screen (Master Doc 14), with a link to its page
var nasaChip = document.getElementById("mp-nasa"); // (var: used by close() above, which can run first)
document.addEventListener("nasa-model-shown", function (event) {
  if (!nasaChip || !active || !event.detail) return;
  nasaChip.textContent = "NASA 3D model: " + event.detail.name;
  nasaChip.href = event.detail.page;
  nasaChip.classList.remove("hidden");
});
function hideNasaChip() { if (nasaChip) nasaChip.classList.add("hidden"); }
