import test from "node:test";
import assert from "node:assert/strict";
import {
  planForHardware,
  planForMission,
  planForSpacecraft,
  splitForSite,
  genericReturn
} from "../js/mission-plan.js";
import { missions } from "../data/missions.js";
import { hardwareReplays } from "../data/hardware-replays.js";
import { spacecraftInfo } from "../data/spacecraft.js";

const ENGINES = new Set(["launch", "film", "landing"]);

function checkPlan(plan, label) {
  assert.ok(plan, label + " produced no plan");
  assert.ok(Array.isArray(plan.chapters), label + " has no chapters array");
  assert.ok(plan.chapters.length > 0, label + " has no chapters");
  for (const chapter of plan.chapters) {
    assert.ok(ENGINES.has(chapter.engine), label + " has an unknown engine " + chapter.engine);
    assert.equal(typeof chapter.label, "string", label + " has a chapter without a label");
    if (chapter.shot) assert.equal(typeof chapter.shot.kind, "string", label + " has a shot without a kind");
  }
  const last = plan.chapters[plan.chapters.length - 1];
  assert.equal(last.finale, true, label + " does not end with a finale chapter");
}

test("every mission produces a valid plan", function () {
  const ids = Object.keys(missions);
  assert.ok(ids.length > 0);
  for (const id of ids) checkPlan(planForMission(id), "mission " + id);
});

test("every hardware replay produces a valid plan", function () {
  const ids = Object.keys(hardwareReplays);
  assert.ok(ids.length > 0);
  for (const id of ids) checkPlan(planForHardware(id), "hardware " + id);
});

test("every spacecraft with a replay produces a valid plan", function () {
  let count = 0;
  for (const name of Object.keys(spacecraftInfo)) {
    const info = spacecraftInfo[name];
    if (!info.replay) continue;
    count += 1;
    checkPlan(planForSpacecraft(name), "spacecraft " + name);
  }
  assert.ok(count > 0, "expected at least one spacecraft replay");
});

test("unknown ids return null", function () {
  assert.equal(planForMission("__missing__"), null);
  assert.equal(planForHardware("__missing__"), null);
  assert.equal(planForSpacecraft("__missing__"), null);
});

test("planForMission can take extra options", function () {
  const plain = planForMission("artemis1");
  const extra = planForMission("artemis1", { label: "Custom label" });
  assert.ok(plain && extra);
  assert.equal(extra.chapters.length, plain.chapters.length);
});

test("splitForSite cuts an Apollo plan at the Lunar Module landing", function () {
  const plan = planForHardware("apollo11");
  assert.ok(plan);
  const split = splitForSite(plan, { start: "lm-landing" });
  assert.ok(split.outbound.length > 0, "outbound is empty");
  const last = split.outbound[split.outbound.length - 1];
  assert.equal(last.lm, true, "outbound does not end at the Lunar Module landing");
  for (const chapter of split.ret) {
    assert.ok(chapter.part === "ret" || chapter.part === "end", "return chapter has part " + chapter.part);
  }
});

test("splitForSite always returns an outbound part", function () {
  const plan = planForMission("hubble");
  const split = splitForSite(plan, { start: "orbit" });
  assert.ok(split.outbound.length > 0);
});

test("genericReturn returns a film, a landing and a finale", function () {
  const chapters = genericReturn("Test mission", "orion", "orion-cm", "moon");
  assert.equal(chapters.length, 3);
  assert.equal(chapters[0].engine, "film");
  assert.equal(chapters[1].engine, "landing");
  assert.equal(chapters[2].engine, "film");
  assert.equal(chapters[2].finale, true);
  for (const chapter of chapters) assert.ok(chapter.narration.length > 0, "chapter has no narration");
});
