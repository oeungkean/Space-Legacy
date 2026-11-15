// Playback speed shared by the mission engines (launch, journey film and landing).
// The mission player's 1x / 2x / 4x buttons set it; 1x (real pacing) is always the default.
let speed = 1;
const listeners = [];

export function getPlaybackSpeed() {
  return speed;
}

export function setPlaybackSpeed(value) {
  const next = value === 2 || value === 4 ? value : 1;
  if (next === speed) return;
  speed = next;
  listeners.forEach(function (listener) { listener(speed); });
}

export function onPlaybackSpeed(listener) {
  listeners.push(listener);
}
