// Sound effects and space ambience for the whole site, made with the browser's Web Audio (no sound files).
//
//   play("click")              one short sound (see SOUNDS below for the names)
//   setLoop("engine", 0.6)     a continuous sound; 0 = silent, 1 = loudest ("engine", "wind", "ambient")
//   setAmbientMood("Saturn")   changes the space ambience to match a world
//   setSoundOn(true/false)     the on/off switch (remembered in this browser)
//
// How it sounds good:
//   - every sound goes through a gentle echo (reverb), which makes it feel like a big, open space
//   - a compressor keeps loud and quiet sounds at a comfortable level
//   - interface sounds are soft bell-like tones; spacecraft sounds use shaped noise and deep tones
//
// The space ambience is an artistic soundscape (deep drones, cosmic wind, distant radio chirps).
// Space itself is silent: sound cannot travel through a vacuum.
//
// Sound groups (each can be switched on or off in Settings):
//   ui = interface sounds, effects = spacecraft sounds, ambience = space ambience,
//   music = background music, voice = spoken narration (handled in solar-system.js)
//
// Browsers only allow sound after the user clicks or presses a key, so nothing plays before that.

import { getSetting, setSetting, onSettingChange } from "./settings.js";

const STORAGE_KEY = "space-legacy-sound";
const MASTER_VOLUME = 0.7;

let ctx = null;
let master = null;   // everything goes through here (the on/off switch)
let dry = null;      // sounds without echo
let reverbSend = null;
let noiseBuffer = null;
let enabled = true;
const loops = {};
const listeners = [];

try {
  enabled = localStorage.getItem(STORAGE_KEY) !== "off";
} catch (error) {
  enabled = true; // storage can be blocked; sound simply starts on
}

// ----- Starting the audio engine (only after a click or key press) -----
function makeImpulse(seconds, decay) {
  // A recording of "a big empty hall", made of fading noise. It gives the echo its character.
  const length = Math.floor(ctx.sampleRate * seconds);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

function unlock() {
  if (ctx) {
    if (ctx.state === "suspended") ctx.resume();
    return;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    ctx = new AudioContextClass();

    // master -> compressor -> speakers
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.25;
    compressor.connect(ctx.destination);

    master = ctx.createGain();
    master.gain.value = masterLevel();
    master.connect(compressor);

    dry = ctx.createGain();
    dry.gain.value = 1;
    dry.connect(master);

    // The echo: sounds sent here come back softly from "far away"
    const reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(3.2, 2.6);
    const reverbLevel = ctx.createGain();
    reverbLevel.gain.value = 0.55;
    reverb.connect(reverbLevel);
    reverbLevel.connect(master);
    reverbSend = ctx.createGain();
    reverbSend.gain.value = 1;
    reverbSend.connect(reverb);

    // Two seconds of random noise, reused for wind, rumble, whooshes and booms
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    // Loops asked for before the audio started now begin
    Object.keys(loops).forEach(function (name) { applyLoop(name); });
  } catch (error) {
    ctx = null;
  }
}

document.addEventListener("pointerdown", unlock, true);
document.addEventListener("keydown", unlock, true);

function ready() {
  return ctx && master && enabled;
}

// Connects a sound to the speakers, with some of it sent to the echo (wet = 0 to 1)
function output(node, wet) {
  node.connect(dry);
  if (wet > 0) {
    const send = ctx.createGain();
    send.gain.value = wet;
    node.connect(send);
    send.connect(reverbSend);
  }
}

// ----- Building blocks -----

// A single note. Options: type, volume, delay, slideTo (pitch it glides to), wet (echo),
// attack and release (how fast it fades in and out), brightness (a filter that softens harsh waves).
function tone(frequency, duration, options) {
  if (!ready()) return;
  options = options || {};
  const start = ctx.currentTime + (options.delay || 0);
  const volume = options.volume || 0.2;
  const attack = options.attack || Math.min(0.01, duration / 4);

  const oscillator = ctx.createOscillator();
  oscillator.type = options.type || "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  if (options.slideTo) oscillator.frequency.exponentialRampToValueAtTime(options.slideTo, start + duration);
  if (options.detune) oscillator.detune.value = options.detune;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  let last = oscillator;
  if (options.brightness) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = options.brightness;
    oscillator.connect(filter);
    last = filter;
  }
  last.connect(gain);
  output(gain, options.wet === undefined ? 0.25 : options.wet);

  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
}

// A soft bell: a note plus a quieter note an octave and a fifth above
function bell(frequency, duration, volume, delay, wet) {
  tone(frequency, duration, { volume: volume, delay: delay, wet: wet === undefined ? 0.45 : wet, attack: 0.004 });
  tone(frequency * 3, duration * 0.5, { volume: volume * 0.18, delay: delay, wet: 0.5, attack: 0.002 });
}

// A burst of filtered noise. filter = "lowpass", "bandpass" or "highpass".
// sweepTo = the filter frequency it moves to (for whooshes).
function noise(duration, options) {
  if (!ready()) return;
  options = options || {};
  const start = ctx.currentTime + (options.delay || 0);
  const volume = options.volume || 0.2;

  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = options.filter || "lowpass";
  filter.frequency.setValueAtTime(options.frequency || 800, start);
  if (options.sweepTo) filter.frequency.exponentialRampToValueAtTime(options.sweepTo, start + duration);
  filter.Q.value = options.q || 0.8;

  const gain = ctx.createGain();
  const attack = options.attack || 0.01;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  source.connect(filter);
  filter.connect(gain);
  output(gain, options.wet === undefined ? 0.2 : options.wet);
  source.start(start, Math.random());
  source.stop(start + duration + 0.05);
}

// ----- The sound effects -----
const SOUNDS = {
  // Interface: soft, short and quiet, so they never get tiring
  hover: function () { tone(2600, 0.035, { volume: 0.018, wet: 0.15 }); },
  hoverBody: function () { bell(1568, 0.25, 0.025, 0, 0.6); },
  click: function () {
    noise(0.03, { volume: 0.05, filter: "bandpass", frequency: 3200, q: 2, wet: 0.1 });
    tone(1400, 0.05, { volume: 0.04, wet: 0.15 });
  },
  type: function () {
    noise(0.025, { volume: 0.09, filter: "bandpass", frequency: 2400 + Math.random() * 1200, q: 3, wet: 0.05 });
  },
  link: function () { bell(1175, 0.3, 0.05); },
  confirm: function () {
    bell(659, 0.5, 0.07);
    bell(988, 0.6, 0.06, 0.08);
  },
  toggleOn: function () {
    tone(740, 0.06, { volume: 0.05, type: "triangle", brightness: 2500 });
    tone(1109, 0.09, { volume: 0.045, type: "triangle", brightness: 2500, delay: 0.06 });
  },
  toggleOff: function () {
    tone(1109, 0.06, { volume: 0.045, type: "triangle", brightness: 2500 });
    tone(740, 0.09, { volume: 0.045, type: "triangle", brightness: 2500, delay: 0.06 });
  },
  select: function () {
    bell(880, 0.7, 0.06);
    bell(1319, 0.8, 0.045, 0.07);
  },
  arrive: function () {
    // The camera has locked on: a soft, low "lock" chord
    bell(440, 1.1, 0.04, 0, 0.6);
    bell(660, 1.1, 0.03, 0.02, 0.6);
  },
  open: function () { tone(420, 0.2, { volume: 0.05, slideTo: 820, wet: 0.35 }); },
  close: function () { tone(760, 0.18, { volume: 0.045, slideTo: 380, wet: 0.35 }); },
  tick: function () { tone(2200, 0.025, { volume: 0.025, type: "triangle", brightness: 4000, wet: 0.05 }); },
  scroll: function () { tone(1700, 0.02, { volume: 0.015, wet: 0.05 }); },
  zoom: function (direction) {
    tone(direction > 0 ? 480 : 820, 0.14, { volume: 0.04, slideTo: direction > 0 ? 820 : 480, wet: 0.3 });
  },
  drag: function () { noise(0.35, { volume: 0.025, filter: "bandpass", frequency: 500, sweepTo: 900, q: 2, attack: 0.1, wet: 0.3 }); },
  pause: function () { tone(660, 0.18, { volume: 0.05, slideTo: 330, type: "triangle", brightness: 2000 }); },
  resume: function () { tone(330, 0.18, { volume: 0.05, slideTo: 660, type: "triangle", brightness: 2000 }); },
  toast: function () { tone(1760, 0.08, { volume: 0.025, wet: 0.3 }); },
  error: function () { tone(220, 0.22, { volume: 0.06, type: "sawtooth", brightness: 900, slideTo: 150 }); },
  noResults: function () { tone(330, 0.12, { volume: 0.035, type: "triangle", brightness: 1500, slideTo: 260 }); },
  whoosh: function () {
    noise(0.9, { volume: 0.06, filter: "bandpass", frequency: 260, sweepTo: 2400, q: 1.4, attack: 0.35, wet: 0.45 });
  },
  success: function () {
    [523, 659, 784, 1047].forEach(function (frequency, i) { bell(frequency, 0.9, 0.05, i * 0.1); });
  },
  event: function () {
    bell(1047, 0.35, 0.045, 0, 0.35);
    bell(1047, 0.35, 0.03, 0.16, 0.35);
  },
  // A rising chord when a new planet is chosen; pitch depends on the planet
  planet: function (pitch) {
    const root = pitch || 220;
    noise(1.2, { volume: 0.05, filter: "bandpass", frequency: 200, sweepTo: 1800, q: 1.2, attack: 0.5, wet: 0.6 });
    [1, 1.5, 2, 3].forEach(function (ratio, i) { bell(root * ratio, 1.6, 0.045, 0.15 + i * 0.07, 0.7); });
  },

  // Spacecraft
  ignition: function () {
    tone(55, 1.5, { volume: 0.4, slideTo: 40, attack: 0.05, wet: 0.3 });
    noise(1.8, { volume: 0.4, filter: "lowpass", frequency: 400, sweepTo: 1500, attack: 0.08, wet: 0.4 });
  },
  pop: function () {
    noise(0.3, { volume: 0.3, filter: "lowpass", frequency: 2000, sweepTo: 300, wet: 0.3 });
    tone(150, 0.25, { volume: 0.14, slideTo: 70 });
  },
  thud: function (strength) {
    const s = Math.min(1, Math.max(0.2, strength || 1));
    tone(85, 0.4, { volume: 0.32 * s, slideTo: 42, wet: 0.2 });
    noise(0.35, { volume: 0.22 * s, filter: "lowpass", frequency: 550, sweepTo: 110, wet: 0.25 });
  },
  boom: function () {
    tone(62, 2.2, { volume: 0.5, slideTo: 26, attack: 0.02, wet: 0.5 });
    noise(2.8, { volume: 0.5, filter: "lowpass", frequency: 1800, sweepTo: 80, attack: 0.02, wet: 0.6 });
    noise(0.25, { volume: 0.25, filter: "highpass", frequency: 3000, wet: 0.3 });
  },
  separation: function () {
    noise(0.12, { volume: 0.22, filter: "highpass", frequency: 2800, wet: 0.25 });
    tone(300, 0.25, { volume: 0.08, type: "square", brightness: 1200, slideTo: 170 });
  },
  signalLost: function () {
    tone(880, 0.25, { volume: 0.05, type: "square", brightness: 2200 });
    tone(660, 0.25, { volume: 0.05, type: "square", brightness: 2200, delay: 0.3 });
    noise(1.6, { volume: 0.07, filter: "bandpass", frequency: 3000, q: 0.5, delay: 0.6, attack: 0.05, wet: 0.5 });
  },
  // A distant radio chirp, like telemetry from far away (used by the space ambience)
  chirp: function () {
    const base = 900 + Math.random() * 900;
    for (let i = 0; i < 3; i++) {
      tone(base, 0.06, { volume: 0.012, slideTo: base * 1.35, delay: i * 0.11, wet: 0.85, type: "triangle", brightness: 3000 });
    }
  },
  sparkle: function () {
    const notes = [1568, 1760, 2093, 2349, 2637];
    bell(notes[Math.floor(Math.random() * notes.length)], 2.4, 0.012, 0, 0.95);
  },
  crackle: function () {
    for (let i = 0; i < 6; i++) {
      noise(0.015, { volume: 0.012, filter: "highpass", frequency: 4000, delay: Math.random() * 0.6, wet: 0.6 });
    }
  }
};

// Which group each sound belongs to (everything not listed is an interface sound)
const GROUP_OF = {
  ignition: "effects", pop: "effects", thud: "effects", boom: "effects", separation: "effects", signalLost: "effects",
  chirp: "ambience", sparkle: "ambience", crackle: "ambience",
  engine: "effects", wind: "effects", ambient: "ambience", music: "music"
};

function groupOf(name) {
  return GROUP_OF[name] || "ui";
}

export function isGroupOn(group) {
  return getSetting("sound_" + group) !== false;
}

export function setGroupOn(group, on) {
  setSetting("sound_" + group, on);
}

function masterLevel() {
  return enabled ? MASTER_VOLUME * getSetting("volume") : 0;
}

export function play(name, value) {
  if (!ready() || !SOUNDS[name] || !isGroupOn(groupOf(name))) return;
  try {
    SOUNDS[name](value);
  } catch (error) {
    // a sound must never break the page
  }
}

// ----- Space ambience moods: each world has its own deep note, brightness and wind -----
// root = the lowest note (Hz). bright = how open the drone sounds. wind = how much cosmic wind.
const MOODS = {
  Mercury: { root: 65.4, bright: 700, wind: 0.4 },
  Venus:   { root: 73.4, bright: 420, wind: 1.0 },
  Earth:   { root: 55.0, bright: 650, wind: 0.6 },
  Moon:    { root: 61.7, bright: 550, wind: 0.2 },
  Mars:    { root: 58.3, bright: 500, wind: 0.7 },
  Jupiter: { root: 41.2, bright: 380, wind: 1.0 },
  Saturn:  { root: 43.7, bright: 600, wind: 0.8 },
  Uranus:  { root: 49.0, bright: 800, wind: 0.6 },
  Neptune: { root: 46.2, bright: 700, wind: 0.9 },
  Titan:   { root: 51.9, bright: 400, wind: 0.9 }
};
let mood = MOODS.Mars;
let moodName = "Mars";

// The pitch for a world's "planet" chord (two octaves above its ambient note)
export function moodPitch(name) {
  return (MOODS[name] || MOODS.Mars).root * 4;
}

// ----- Continuous sounds -----
const LOOP_SETTINGS = {
  engine: { volume: 0.4 },
  wind: { volume: 0.25 },
  ambient: { volume: 0.14 }, // background only: well below the interface sounds
  music: { volume: 0.3 }     // background only: about as quiet as the ambience
};

function makeNoiseSource() {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;
  source.start(0, Math.random());
  return source;
}

// A slow wobble (LFO): moves a setting up and down every few seconds
function wobble(param, seconds, amount) {
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 1 / seconds;
  const depth = ctx.createGain();
  depth.gain.value = amount;
  lfo.connect(depth);
  depth.connect(param);
  lfo.start();
}

function buildEngine(gain) {
  // Deep rumble: low-passed noise, a sub-bass tone, and a crackle that flickers
  const rumble = ctx.createBiquadFilter();
  rumble.type = "lowpass";
  rumble.frequency.value = 220;
  makeNoiseSource().connect(rumble);
  rumble.connect(gain);

  const sub = ctx.createOscillator();
  sub.frequency.value = 38;
  const subLevel = ctx.createGain();
  subLevel.gain.value = 0.5;
  sub.connect(subLevel);
  subLevel.connect(gain);
  sub.start();

  const crackle = ctx.createBiquadFilter();
  crackle.type = "bandpass";
  crackle.frequency.value = 1400;
  crackle.Q.value = 0.7;
  const crackleLevel = ctx.createGain();
  crackleLevel.gain.value = 0.18;
  wobble(crackleLevel.gain, 0.09, 0.15);
  makeNoiseSource().connect(crackle);
  crackle.connect(crackleLevel);
  crackleLevel.connect(gain);
  return { brightness: rumble, base: 220 };
}

function buildWind(gain) {
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 900;
  filter.Q.value = 0.6;
  wobble(filter.frequency, 2.3, 350);
  makeNoiseSource().connect(filter);
  filter.connect(gain);
  return { brightness: filter, base: 900 };
}

function buildAmbient(gain) {
  const parts = { gain: gain, notes: [] };

  // 1) The drone: a deep note, its fifth and its octave, gently detuned so they shimmer
  const padFilter = ctx.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = mood.bright;
  padFilter.Q.value = 3;
  wobble(padFilter.frequency, 17, 180);
  const padLevel = ctx.createGain();
  padLevel.gain.value = 0.05;
  wobble(padLevel.gain, 11, 0.015);
  [[1, -6, "sine"], [1, 7, "triangle"], [1.5, -4, "sine"], [2, 5, "sine"], [3, 0, "sine"]].forEach(function (spec) {
    const oscillator = ctx.createOscillator();
    oscillator.type = spec[2];
    oscillator.frequency.value = mood.root * spec[0];
    oscillator.detune.value = spec[1];
    const level = ctx.createGain();
    level.gain.value = spec[0] === 3 ? 0.25 : 1;
    oscillator.connect(level);
    level.connect(padFilter);
    oscillator.start();
    parts.notes.push({ oscillator: oscillator, ratio: spec[0] });
  });
  padFilter.connect(padLevel);
  padLevel.connect(gain);
  const padSend = ctx.createGain();
  padSend.gain.value = 0.6;
  padLevel.connect(padSend);
  padSend.connect(reverbSend);
  parts.padFilter = padFilter;

  // 2) Cosmic wind: slow, breathing filtered noise
  const windFilter = ctx.createBiquadFilter();
  windFilter.type = "bandpass";
  windFilter.frequency.value = 320;
  windFilter.Q.value = 1.4;
  wobble(windFilter.frequency, 9, 160);
  const windLevel = ctx.createGain();
  windLevel.gain.value = 0.02 * mood.wind;
  wobble(windLevel.gain, 7, 0.008 * mood.wind);
  makeNoiseSource().connect(windFilter);
  windFilter.connect(windLevel);
  windLevel.connect(gain);
  parts.windLevel = windLevel;

  // 3) A faint high shimmer, like starlight
  const shimmerFilter = ctx.createBiquadFilter();
  shimmerFilter.type = "highpass";
  shimmerFilter.frequency.value = 7000;
  const shimmerLevel = ctx.createGain();
  shimmerLevel.gain.value = 0.004;
  wobble(shimmerLevel.gain, 13, 0.003);
  makeNoiseSource().connect(shimmerFilter);
  shimmerFilter.connect(shimmerLevel);
  shimmerLevel.connect(gain);

  return parts;
}

function buildLoop(name) {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(dry);
  let extra;
  if (name === "engine") extra = buildEngine(gain);
  else if (name === "wind") extra = buildWind(gain);
  else if (name === "music") extra = buildMusic(gain);
  else extra = buildAmbient(gain);
  return { gain: gain, extra: extra, settings: LOOP_SETTINGS[name] };
}

// ----- Background music: slow, soft chords in the key of the current world, with a few bell notes -----
// It is generated as it plays, so it never repeats exactly.
const CHORD_SECONDS = 8;
const PROGRESSION = [[0, 3, 7, 12], [-4, 0, 3, 8], [3, 7, 10, 15], [-2, 2, 5, 10]]; // a calm minor-key cycle
const MELODY = [0, 3, 5, 7, 10, 12, 15];
let musicTimer = null;
let musicStep = 0;

function buildMusic(gain) {
  const send = ctx.createGain();
  send.gain.value = 0.8; // music sits in a lot of echo
  gain.connect(send);
  send.connect(reverbSend);
  return { bus: gain };
}

function musicRoot() {
  let root = mood.root * 4;
  while (root > 300) root /= 2;
  while (root < 150) root *= 2;
  return root;
}

// One soft pad note: two slightly detuned waves that fade in and out slowly
function padVoice(bus, frequency, start, duration, volume) {
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 2.5);
  gain.gain.setValueAtTime(volume, start + duration - 3);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  [["triangle", -5], ["sine", 6]].forEach(function (spec) {
    const oscillator = ctx.createOscillator();
    oscillator.type = spec[0];
    oscillator.frequency.value = frequency;
    oscillator.detune.value = spec[1];
    oscillator.connect(filter);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.1);
  });
  filter.connect(gain);
  gain.connect(bus);
}

// One bell note of the melody
function bellVoice(bus, frequency, start) {
  [[1, 0.022], [3, 0.004]].forEach(function (partial) {
    const oscillator = ctx.createOscillator();
    oscillator.frequency.value = frequency * partial[0];
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(partial[1], start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.8);
    oscillator.connect(gain);
    gain.connect(bus);
    oscillator.start(start);
    oscillator.stop(start + 3);
  });
}

function playMusicBar() {
  const entry = loops.music;
  if (!ctx || !entry || !entry.nodes) return;
  const bus = entry.nodes.extra.bus;
  const chord = PROGRESSION[musicStep % PROGRESSION.length];
  musicStep++;
  const root = musicRoot();
  const start = ctx.currentTime + 0.05;

  chord.forEach(function (semitones, i) {
    const frequency = root * Math.pow(2, semitones / 12) / (i === 0 ? 2 : 1); // the lowest note an octave down
    padVoice(bus, frequency, start, CHORD_SECONDS + 3, i === 0 ? 0.045 : 0.03);
  });

  const notes = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < notes; i++) {
    const semitones = MELODY[Math.floor(Math.random() * MELODY.length)];
    bellVoice(bus, root * 2 * Math.pow(2, semitones / 12), start + 1 + Math.random() * (CHORD_SECONDS - 2));
  }
}

function scheduleMusic() {
  if (musicTimer !== null) return;
  const entry = loops.music;
  if (!entry || entry.level <= 0 || !isGroupOn("music") || !enabled) return;
  playMusicBar();
  musicTimer = setTimeout(function () {
    musicTimer = null;
    scheduleMusic();
  }, CHORD_SECONDS * 1000);
}

function applyLoop(name) {
  if (!ctx) return;
  const entry = loops[name];
  if (!entry.nodes) entry.nodes = buildLoop(name);
  const nodes = entry.nodes;
  const groupLevel = isGroupOn(groupOf(name)) ? 1 : 0;
  const level = Math.min(1, Math.max(0, entry.level)) * groupLevel;
  // The ambience and music fade in slowly; engines react quickly
  const speed = name === "ambient" || name === "music" ? 1.2 : 0.12;
  nodes.gain.gain.setTargetAtTime(level * nodes.settings.volume, ctx.currentTime, speed);
  if (nodes.extra.brightness) {
    nodes.extra.brightness.frequency.setTargetAtTime(nodes.extra.base * (0.7 + level * 0.8), ctx.currentTime, 0.2);
  }
  if (name === "ambient") scheduleAmbientEvent();
  if (name === "music") scheduleMusic();
}

export function setLoop(name, level) {
  if (!LOOP_SETTINGS[name]) return;
  if (!loops[name]) loops[name] = { level: 0, nodes: null };
  if (Math.abs(loops[name].level - level) < 0.01 && loops[name].nodes) return;
  loops[name].level = level;
  applyLoop(name);
}

// Silences every continuous sound except the ones named, for example stopLoops("ambient", "music")
export function stopLoops() {
  const keep = Array.prototype.slice.call(arguments);
  Object.keys(loops).forEach(function (name) {
    if (keep.indexOf(name) === -1) setLoop(name, 0);
  });
}

// Changes the space ambience to a world's mood (the drone glides to the new note)
export function setAmbientMood(name) {
  if (!MOODS[name] || name === moodName) return;
  moodName = name;
  mood = MOODS[name];
  const entry = loops.ambient;
  if (!ctx || !entry || !entry.nodes) return;
  const parts = entry.nodes.extra;
  parts.notes.forEach(function (note) {
    note.oscillator.frequency.setTargetAtTime(mood.root * note.ratio, ctx.currentTime, 1.5);
  });
  parts.padFilter.frequency.setTargetAtTime(mood.bright, ctx.currentTime, 1.5);
  parts.windLevel.gain.setTargetAtTime(0.02 * mood.wind, ctx.currentTime, 1.5);
}

// Every 4 to 11 seconds, a small random sound in the distance: a radio chirp, a sparkle, or static
let ambientTimer = null;
function scheduleAmbientEvent() {
  if (ambientTimer !== null) return;
  ambientTimer = setTimeout(function () {
    ambientTimer = null;
    const entry = loops.ambient;
    if (!entry || entry.level <= 0 || !isGroupOn("ambience")) return; // the ambience is off: stop until it starts again
    const roll = Math.random();
    play(roll < 0.4 ? "chirp" : roll < 0.8 ? "sparkle" : "crackle");
    scheduleAmbientEvent();
  }, 4000 + Math.random() * 7000);
}

// ----- On / off -----
export function isSoundOn() {
  return enabled;
}

export function setSoundOn(on) {
  enabled = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch (error) {
    // not remembered, but still works for this visit
  }
  if (master) master.gain.setTargetAtTime(masterLevel(), ctx.currentTime, 0.05);
  if (on) Object.keys(loops).forEach(applyLoop);
  listeners.forEach(function (listener) { listener(on); });
}

// When the volume or a sound group changes in Settings
onSettingChange(function (key) {
  if (key !== "volume" && key.indexOf("sound_") !== 0) return;
  if (master) master.gain.setTargetAtTime(masterLevel(), ctx.currentTime, 0.05);
  Object.keys(loops).forEach(applyLoop);
  listeners.forEach(function (listener) { listener(enabled); });
});

// Other files can react when sound is switched on or off (for example, the launch scene's own sound)
export function onSoundChange(listener) {
  listeners.push(listener);
}
