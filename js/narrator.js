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
  if (/multilingual/i.test(name) && /natural|online/i.test(name)) s += 15; // the newest, most expressive Edge voices
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
onSettingChange(function (key) {
  if (key !== "narratorVoice") return;
  pickVoice();
  // A new voice is heard straight away: the sentence being spoken starts again in the new voice and the
  // rest follows (before, the new voice only started with the next scene)
  if (live && live.token === token && live.index < live.list.length) {
    const resume = live;
    stopSpeaking();
    speakList(resume.list, resume.index, resume.onDone, resume.onSentence, resume.shown, resume.alt ? altVoice() : null);
  }
});
let live = null; // what is being spoken now: { list, index, onDone, token }

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

// Pause and resume, sentence by sentence. The browser's own speechSynthesis.pause() is not reliable
// (with many voices it ends the speech for good), so a pause stops the voice and remembers which sentence
// it was on; resume says that sentence again and carries on. Subtitles follow along.
let held = null;
export function pauseSpeaking() {
  if (!speechSupported || !live || live.token !== token || live.index >= live.list.length) return;
  held = { list: live.list, index: live.index, onDone: live.onDone, onSentence: live.onSentence, shown: live.shown, alt: live.alt };
  token++; // the cancelled sentence's end and error events are ignored
  window.speechSynthesis.cancel();
}
export function resumeSpeaking() {
  if (!held) return false;
  const h = held;
  held = null;
  speakList(h.list, h.index, h.onDone, h.onSentence, h.shown, h.alt);
  return true;
}
export function isSpeechHeld() { return Boolean(held); }

export function stopSpeaking() {
  held = null;
  token++;
  if (speechSupported) {
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.resume) window.speechSynthesis.resume(); // clears a leftover "paused" state
  }
}

// Speak text sentence by sentence, with natural pauses. onDone runs after the last sentence (or on an error).
// Split the text as written into sentences, without breaking at "a.m.", "p.m.", "e.g.", "i.e.", "No. 3",
// "U.S." or decimals. Each sentence is then said in its spoken form (humanize), and the same written
// sentence can be shown as the subtitle, so what you read is exactly what you hear.
const KEEP = [/\ba\.m\./g, /\bp\.m\./g, /\be\.g\./g, /\bi\.e\./g, /\bNo\.(?= ?\d)/g, /\bU\.S\./g, /\bvs\./g, /\bSt\./g, /\bMt\./g, /(\d)\.(\d)/g];
function writtenSentences(text) {
  let protectedText = String(text || "");
  const saved = [];
  KEEP.forEach(function (pattern) {
    protectedText = protectedText.replace(pattern, function (match) {
      saved.push(match);
      return "\u0000" + (saved.length - 1) + "\u0001";
    });
  });
  const parts = protectedText.match(/[^.!?]+[.!?]*["'\u201D]?/g) || [protectedText];
  return parts.map(function (part) {
    return part.replace(/\u0000(\d+)\u0001/g, function (m, i) { return saved[Number(i)]; }).trim();
  }).filter(Boolean);
}

// onSentence (optional): called with each written sentence just before it is spoken (for subtitles)
// options.alt: say it in a second voice, different from the narrator's (for the astronauts' own words)
export function speak(text, onDone, onSentence, options) {
  stopSpeaking();
  if (!speechSupported) {
    if (onDone) onDone();
    return;
  }
  const written = writtenSentences(text);
  const list = [];
  const shown = [];
  written.forEach(function (w) {
    // long sentences are said in two breaths, but shown whole
    sentences(humanize(w)).forEach(function (spoken) { list.push(spoken); shown.push(w); });
  });
  speakList(list, 0, onDone, onSentence, shown, options && options.alt ? altVoice() : null);
}

// A second voice for quotes: the best voice that is not the narrator's (the same voice, a little lower,
// if the browser has only one)
function altVoice() {
  const ranked = voices.slice().sort(function (a, b) { return score(b) - score(a); });
  const other = ranked.find(function (v) { return !chosen || v.name !== chosen.name; });
  return { voice: other || chosen, pitch: other ? 1 : 0.85 };
}

function speakList(list, start, onDone, onSentence, shown, alt) {
  if (!chosen) refreshVoices();
  const voiceToUse = alt && alt.voice ? alt.voice : chosen;
  const myToken = token;
  const baseRate = Math.max(0.6, Math.min(1.4, getSetting("narratorRate") || 1));
  let index = start || 0;
  live = { list: list, index: index, onDone: onDone, token: myToken, onSentence: onSentence, shown: shown, alt: alt };

  function finish() {
    if (myToken === token && onDone) onDone();
  }

  // Neural ("Natural") voices already breathe and vary their tone like a person; changing their pitch or rate
  // per sentence makes them sound more synthetic, so they are left alone. Older voices get a small variation.
  const neural = Boolean(voiceToUse && score(voiceToUse) >= 100);

  // Master Doc 17 (smoother flow): each sentence is queued as soon as the one before it starts, so the voice
  // engine runs them together with its own natural breath (no timer gap, and online voices can fetch the next
  // sentence while this one plays). Subtitles change as each sentence starts.
  let queued = start || 0;
  function utter(i) {
    const sentence = list[i];
    const utterance = new SpeechSynthesisUtterance(sentence);
    if (voiceToUse) {
      utterance.voice = voiceToUse;
      utterance.lang = voiceToUse.lang;
    } else {
      utterance.lang = "en-US";
    }
    const question = /\?$/.test(sentence);
    if (neural) {
      utterance.rate = baseRate;
      utterance.pitch = 1;
    } else {
      const wobble = (Math.sin(i * 2.3) * 0.5 + 0.5);
      utterance.rate = baseRate * (i === 0 ? 0.94 : 0.96 + wobble * 0.04);
      utterance.pitch = question ? 1.06 : 0.99 + wobble * 0.03;
    }
    if (alt && alt.pitch !== 1) utterance.pitch = alt.pitch;
    utterance.volume = 1;
    utterance.onstart = function () {
      if (myToken !== token) return;
      if (onSentence && shown && shown[i] && (i === (start || 0) || shown[i] !== shown[i - 1])) onSentence(shown[i]);
      if (i + 1 < list.length && queued < i + 1) {
        queued = i + 1;
        utter(i + 1);
      }
    };
    utterance.onend = function () {
      if (myToken !== token) return;
      index = i + 1;
      if (live && live.token === myToken) live.index = index;
      if (index >= list.length) finish();
      else if (queued < index) { queued = index; utter(index); } // in case a voice never fired onstart
    };
    utterance.onerror = function (event) {
      if (myToken !== token) return;
      if (event && (event.error === "interrupted" || event.error === "canceled")) return;
      index = list.length;
      finish();
    };
    window.speechSynthesis.speak(utterance);
  }
  if (index >= list.length) finish();
  else utter(index);
}
