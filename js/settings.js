// The user's preferences, remembered in this browser.
//   getSetting("volume")          read one setting
//   setSetting("sound_music", false)
//   onSettingChange(function (key, value) { ... })   react when something changes

const STORAGE_KEY = "space-legacy-settings";

export const DEFAULTS = {
  volume: 0.8,          // master volume, 0 to 1
  sound_ui: true,       // clicks, hovers, typing, chimes
  sound_effects: true,  // rockets, landings, parachutes, impacts
  sound_ambience: true, // the space drone, wind and distant radio chirps
  sound_music: true,    // the background music
  sound_voice: true,    // the spoken narration in mission replays
  ui: true,             // show the interface (false = only the 3D view)
  sidebar: true,        // the list of worlds and sites on the left
  hints: true,          // the help text at the bottom of the screen
  clock: true,          // the UTC mission clock
  reduceMotion: false,  // no camera shake, fewer animations
  skipIntro: false,     // go straight to the solar system after "Begin Exploration"
  skipLiftoff: false,   // start mission replays without the launch scene
  narratorVoice: "",    // the narrator's voice name ("" = the most natural voice available)
  narratorRate: 1       // the narrator's speaking speed (0.8 to 1.2)
};

let values = Object.assign({}, DEFAULTS);
const listeners = [];

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  Object.keys(DEFAULTS).forEach(function (key) {
    if (typeof saved[key] === typeof DEFAULTS[key]) values[key] = saved[key];
  });
} catch (error) {
  // no saved settings (or storage is blocked): use the defaults
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch (error) {
    // not remembered, but still works for this visit
  }
}

export function getSetting(key) {
  return values[key];
}

export function setSetting(key, value) {
  if (!(key in DEFAULTS) || values[key] === value) return;
  values[key] = value;
  save();
  listeners.forEach(function (listener) { listener(key, value); });
}

export function resetSettings() {
  Object.keys(DEFAULTS).forEach(function (key) { setSetting(key, DEFAULTS[key]); });
}

export function onSettingChange(listener) {
  listeners.push(listener);
}

// True if the user (or their computer's settings) asked for less motion
export function wantsReducedMotion() {
  const system = typeof window !== "undefined" && window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return values.reduceMotion || Boolean(system);
}
