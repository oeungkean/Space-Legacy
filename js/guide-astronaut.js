// The astronaut guide for Free Build exploration (Kampu Space Master Doc 17).
// A second astronaut walks beside you. Near a historical object, "Ask your guide" (Y, or the button) makes the
// guide walk over, turn to it and tell its story: what it is, which mission left it, what it was for, how it
// was used, why it is still there and why it matters. The story is built only from the object's information
// card (data/collectibles.js, with its sources), so nothing new is invented. The narrator voice speaks it
// with subtitles; ✕ stops the talk, and "Hide guide" sends the guide away (remembered in Settings).
//
//   const guide = createGuide(scene, suitId, heightAt)
//   guide.update(dt, followPos, followYaw, onFoot, world)   every frame
//   guide.talkAbout(entry, objectPosition)                   start telling an object's story
//   guide.stopTalking() / guide.isTalking() / guide.setHidden(bool) / guide.dispose()

import * as THREE from "three";
import { createSuitedAstronaut } from "./astronaut.js";
import { speak, stopSpeaking } from "./narrator.js";

const panel = document.getElementById("guide-panel");
const panelText = document.getElementById("guide-text");
const panelTitle = document.getElementById("guide-title");
const panelClose = document.getElementById("guide-close");

let current = null; // the guide in the scene (one at a time)

if (panelClose) {
  panelClose.addEventListener("click", function () {
    if (current) current.stopTalking();
  });
}

// A friendly way in, so the talks don't all start the same way
const OPENERS = [
  "Come and look at this.",
  "Here's one with a story.",
  "Stop here a moment.",
  "This is worth a closer look."
];

// The talk, built from the information card only
export function storyFor(entry) {
  const c = entry.card || {};
  const lines = [];
  const opener = OPENERS[Math.abs(hash(entry.id || c.name || "")) % OPENERS.length];
  if (entry.kind === "target") {
    lines.push(opener + " This is " + c.name + ".");
    if (c.mission) lines.push("It was studied during " + c.mission + (c.year ? ", in " + c.year : "") + ".");
  } else {
    lines.push(opener + " This is the " + stripThe(c.name) + ".");
    if (c.mission) lines.push("It came here with " + c.mission + (c.year ? " in " + c.year : "") + ".");
  }
  if (c.purpose) lines.push("What was it for? " + c.purpose);
  if (c.usage) lines.push(c.usage);
  if (entry.kind === "hardware" && c.status) lines.push("And today? " + c.status);
  if (c.importance) lines.push("Why does it matter? " + c.importance);
  return lines.join(" ");
}

function stripThe(name) {
  return String(name || "").replace(/^the\s+/i, "");
}
function hash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return h;
}

export function createGuide(scene, suitId, heightAt) {
  if (current) current.dispose();
  const model = createSuitedAstronaut(suitId || "axemu");
  model.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
  scene.add(model);

  const pos = new THREE.Vector3();
  let placed = false;
  let hidden = false;
  let talk = null;      // { target: Vector3, entry }
  let yaw = 0;

  function showPanel(title, text) {
    if (!panel) return;
    panel.classList.remove("hidden");
    if (panelTitle) panelTitle.textContent = title;
    if (panelText) panelText.textContent = text;
  }
  function hidePanel() {
    if (panel) panel.classList.add("hidden");
  }

  const guide = {
    model: model,
    update: function (dt, followPos, followYaw, onFoot, world) {
      model.visible = !hidden && onFoot;
      if (!followPos) return;
      // where to stand: a few meters to the side and a little behind you, or next to the object being explained
      let goal;
      if (talk) {
        const away = new THREE.Vector3(pos.x - talk.target.x, 0, pos.z - talk.target.z);
        if (away.lengthSq() < 0.01) away.set(1, 0, 0);
        away.normalize().multiplyScalar(2.4);
        goal = talk.target.clone().add(away);
      } else {
        const side = new THREE.Vector3(1.8, 0, -1.4).applyAxisAngle(new THREE.Vector3(0, 1, 0), followYaw || 0);
        goal = followPos.clone().add(side);
      }
      if (!placed || !onFoot) { pos.copy(goal); placed = true; }
      const toGoal = new THREE.Vector3(goal.x - pos.x, 0, goal.z - pos.z);
      const distance = toGoal.length();
      const moving = distance > 0.35;
      if (moving) {
        const speed = Math.min(distance * 1.6, talk ? 3.2 : 2.6);
        pos.addScaledVector(toGoal.normalize(), speed * dt);
        yaw = Math.atan2(toGoal.x, toGoal.z);
      } else if (talk) {
        yaw = Math.atan2(talk.target.x - pos.x, talk.target.z - pos.z);
      } else {
        yaw = followYaw || yaw;
      }
      pos.y = heightAt ? heightAt(pos.x, pos.z) : pos.y;
      model.position.copy(pos);
      model.rotation.y += wrap(yaw - model.rotation.y) * Math.min(1, dt * 6);
      const state = moving ? (world === "moon" ? "lunar-hop" : "mars-walk") : talk ? "operate" : "idle";
      model.userData.animate(state, dt, { speed: 0.8 });
    },
    talkAbout: function (entry, objectPosition) {
      if (!entry || !entry.card) return;
      hidden = false;
      talk = { target: objectPosition.clone(), entry: entry };
      const text = storyFor(entry);
      showPanel("Your guide · " + entry.card.name, text.split(/(?<=[.?!])\s/)[0]);
      speak(text, function () {
        if (talk && talk.entry === entry) {
          talk = null;
          setTimeout(hidePanel, 1200);
        }
      }, function (sentence) {
        if (talk && talk.entry === entry && panelText) panelText.textContent = sentence;
      });
    },
    stopTalking: function () {
      if (!talk && (!panel || panel.classList.contains("hidden"))) return;
      talk = null;
      stopSpeaking();
      hidePanel();
    },
    isTalking: function () { return Boolean(talk); },
    setHidden: function (value) {
      hidden = Boolean(value);
      if (hidden) guide.stopTalking();
      model.visible = !hidden;
    },
    isHidden: function () { return hidden; },
    dispose: function () {
      guide.stopTalking();
      if (model.parent) model.parent.remove(model);
      if (current === guide) current = null;
    }
  };
  current = guide;
  return guide;
}

function wrap(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
