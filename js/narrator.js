// The mission narrator: reads replay stories aloud with the browser's text-to-speech, made to sound more human.
//   - picks the most natural voice the device has (neural / "Natural" / "Online" / premium voices first)
//   - rewrites abbreviations, units and symbols the way a person says them
//   - speaks one sentence at a time with short, varied pauses and a little variation in pitch and speed
//   - Settings: choose the voice and the speaking speed
// The voices come from the user's device and browser, so how good it sounds depends on them
// (Edge and Chrome on Windows and macOS usually have the most natural ones).

import { getSetting, onSettingChange } from "./settings.js";

export const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

let voices = [];
let chosen = null;
let token = 0;           // changes whenever speech starts or stops, so old callbacks are ignored
const voiceListeners = [];

// Higher score = sounds more like a person
function score(voice) {
  const name = voice.name || "";
  let s = 0;
  if (/natural|neural|online/i.test(name)) s += 100;           // Microsoft Edge neural voices
  if (/premium|enhanced|siri/i.test(name)) s += 80;              // Apple high-quality voices
  if (/google/i.test(name)) s += 50;                             // Chrome's cloud voices
  if (/aria|jenny|guy|davis|andrew|emma|ava|brian|sonia|ryan|libby|natasha|william/i.test(name)) s += 30;
  if (/samantha|daniel|karen|moira|serena|allison|tom/i.test(name)) s += 20;
  if (/espeak|robot|novelty|zarvox|trinoids|whisper|bad news|bells|boing|bubbles|cellos|deranged|hysterical|organ|superstar/i.test(name)) s -= 200;
  if (/desktop/i.test(name)) s -= 10;                            // older offline Windows voices sound flatter
  if (/^en-(US|GB)/i.test(voice.lang || "")) s += 10;
  if (voice.localService === false) s += 5;
  return s;
}

function refreshVoices() {
  if (!speechSupported) return;
  voices = window.speechSynthesis.getVoices().filter(function (v) { return /^en/i.test(v.lang || ""); });
  pickVoice();
  voiceListeners.forEach(function (fn) { fn(voices); });
}

function pickVoice() {
  const wanted = getSetting("narratorVoice");
  chosen = (wanted && voices.find(function (v) { return v.name === wanted; })) ||
    voices.slice().sort(function (a, b) { return score(b) - score(a); })[0] || null;
}

export function getVoices() {
  return voices.slice().sort(function (a, b) { return score(b) - score(a); });
}

export function getChosenVoice() { return chosen; }

// A plain-words quality label for the voice pickers
export function voiceQuality(voice) {
  const n = score(voice);
  if (n >= 100) return "Natural";
  if (n >= 50) return "Enhanced";
  if (n >= 0) return "Standard";
  return "Robotic";
}

export function onVoicesChange(fn) { voiceListeners.push(fn); }

if (speechSupported) {
  if (window.speechSynthesis.addEventListener) window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
  refreshVoices();
}
onSettingChange(function (key) { if (key === "narratorVoice") pickVoice(); });

// ----- Make the text sound spoken -----
const WORDS = [
  [/\bUTC\b/g, "U T C"], [/\bEDT\b/g, "Eastern Daylight Time"], [/\bEST\b/g, "Eastern Standard Time"],
  [/\bPST\b/g, "Pacific Standard Time"], [/\bPDT\b/g, "Pacific Daylight Time"], [/\bET\b/g, "Eastern Time"],
  [/\bkm\/h\b/g, "kilometers per hour"], [/\bm\/s\b/g, "meters per second"], [/(\d)\s?km\b/g, "$1 kilometers"],
  [/(\d)\s?kg\b/g, "$1 kilograms"], [/(\d)\s?cm\b/g, "$1 centimeters"], [/(\d)\s?m\b/g, "$1 meters"], [/(\d)\s?g\b/g, "$1 grams"],
  [/(\d)\s?ft\b/g, "$1 feet"], [/(\d)\s?lbf\b/g, "$1 pounds of thrust"], [/(\d)\s?%/g, "$1 percent"],
  [/\bNASA\b/g, "NASA"], [/\bESA\b/g, "E S A"], [/\bISS\b/g, "space station"], [/\bSLS\b/g, "S L S"],
  [/\bLC-(\d+)([A-Z]?)\b/g, "Launch Complex $1 $2"], [/\bSTS-(\d+)\b/g, "S T S $1"], [/\bL2\b/g, "L 2"],
  [/\ba\.m\./g, "in the morning"], [/\bp\.m\./g, "in the afternoon"], [/\bvs\.?\b/g, "versus"],
  [/\be\.g\./g, "for example"], [/\bi\.e\./g, "that is"], [/\bNo\. (\d)/g, "number $1"],
  [/&/g, " and "], [/\s*·\s*/g, ". "], [/\s*[—–]\s*/g, ", "], [/[()]/g, ", "], [/\s+,/g, ","], [/,\s*,/g, ","]
];

export function humanize(text) {
  let out = " " + String(text || "") + " ";
  WORDS.forEach(function (pair) { out = out.replace(pair[0], pair[1]); });
  return out.replace(/\s{2,}/g, " ").trim();
}

// Split into sentences, and split very long ones at semicolons or colons so each breath is natural
function sentences(text) {
  const parts = text.match(/[^.!?]+[.!?]*["']?/g) || [text];
  const out = [];
  parts.forEach(function (part) {
    const p = part.trim();
    if (!p) return;
    if (p.length > 220) p.split(/(?<=[;:])\s+/).forEach(function (q) { if (q.trim()) out.push(q.trim()); });
    else out.push(p);
  });
  return out;
}

export function stopSpeaking() {
  token++;
  if (speechSupported) {
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.resume) window.speechSynthesis.resume(); // clears a leftover "paused" state
  }
}

// Speak text sentence by sentence, with natural pauses. onDone runs after the last sentence (or on an error).
export function speak(text, onDone) {
  stopSpeaking();
  if (!speechSupported) {
    if (onDone) onDone();
    return;
  }
  if (!chosen) refreshVoices();
  const myToken = token;
  const list = sentences(humanize(text));
  const baseRate = Math.max(0.6, Math.min(1.4, getSetting("narratorRate") || 1));
  let index = 0;

  function finish() {
    if (myToken === token && onDone) onDone();
  }

  function next() {
    if (myToken !== token) return;
    if (index >= list.length) {
      finish();
      return;
    }
    const sentence = list[index];
    const utterance = new SpeechSynthesisUtterance(sentence);
    if (chosen) {
      utterance.voice = chosen;
      utterance.lang = chosen.lang;
    } else {
      utterance.lang = "en-US";
    }
    // Small, human variation: questions lift, the opening line is a touch slower, others vary slightly
    const question = /\?$/.test(sentence);
    const wobble = (Math.sin(index * 2.3) * 0.5 + 0.5);
    utterance.rate = baseRate * (index === 0 ? 0.93 : 0.95 + wobble * 0.05);
    utterance.pitch = question ? 1.08 : 0.98 + wobble * 0.05;
    utterance.volume = 1;
    utterance.onend = function () {
      index++;
      if (myToken !== token) return;
      // A breath between sentences: longer after a long sentence or a full stop, shorter after a comma-like break
      const pause = sentence.length > 120 ? 420 : /[.!?]$/.test(sentence) ? 300 : 180;
      setTimeout(next, pause / baseRate);
    };
    utterance.onerror = function () {
      index = list.length;
      finish();
    };
    window.speechSynthesis.speak(utterance);
  }
  next();
}
