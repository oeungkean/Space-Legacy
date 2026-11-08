// Color themes: each planet on the home screen has its own accent color.
// Choosing a planet changes the color of buttons, highlights, labels and the soft background tint.
// The accent colors are light enough that dark text on them stays easy to read.

// One consistent style: every planet uses the same deep-space palette (ion blue accent).
const DEEP_SPACE = { accent: "#7ab8ff", hover: "#9ccbff", tint: "#081022" };
export const THEMES = {
  Mercury: DEEP_SPACE,
  Venus: DEEP_SPACE,
  Earth: DEEP_SPACE,
  Moon: DEEP_SPACE,
  Mars: DEEP_SPACE,
  Jupiter: DEEP_SPACE,
  Saturn: DEEP_SPACE,
  Uranus: DEEP_SPACE,
  Neptune: DEEP_SPACE
};

const DEFAULT_THEME = "Mars";
let current = DEFAULT_THEME;
const listeners = [];

// "#ff8a3d" -> "255, 138, 61"
function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) + ", " + ((n >> 8) & 255) + ", " + (n & 255);
}

export function applyTheme(name) {
  const theme = THEMES[name] || THEMES[DEFAULT_THEME];
  current = THEMES[name] ? name : DEFAULT_THEME;

  const root = document.documentElement;
  if (root && root.style) {
    const c = rgb(theme.accent);
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--accent-hover", theme.hover);
    root.style.setProperty("--accent-soft", "rgba(" + c + ", 0.12)");
    root.style.setProperty("--accent-mid", "rgba(" + c + ", 0.2)");
    root.style.setProperty("--accent-half", "rgba(" + c + ", 0.5)");
    root.style.setProperty("--accent-line", "rgba(" + c + ", 0.55)");
    root.style.setProperty("--accent-glow", "rgba(" + c + ", 0.2)");
    root.style.setProperty("--bg-navy", theme.tint);
  }

  listeners.forEach(function (listener) { listener(current, theme); });
}

export function getTheme() {
  return current;
}

// The accent as a number for the 3D scenes, for example 0xff8a3d
export function accentNumber() {
  return parseInt(THEMES[current].accent.slice(1), 16);
}

export function accentCss() {
  return THEMES[current].accent;
}

export function onThemeChange(listener) {
  listeners.push(listener);
}
