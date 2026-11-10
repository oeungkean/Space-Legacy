import test from "node:test";
import assert from "node:assert/strict";
import { DESTINATIONS, MISSION_GROUPS, roleOf, groupOfItem } from "../data/mission-groups.js";
import { findItem } from "../data/catalog.js";

test("mission group ids are unique", function () {
  const ids = MISSION_GROUPS.map(function (group) { return group.id; });
  assert.equal(new Set(ids).size, ids.length);
});

test("every mission group has a name, year and destination", function () {
  const known = new Set(DESTINATIONS.map(function (destination) { return destination.id; }));
  for (const group of MISSION_GROUPS) {
    assert.ok(group.name, group.id + " has no name");
    assert.equal(typeof group.year, "number", group.id + " has no year");
    assert.ok(known.has(group.where), group.id + " has unknown destination " + group.where);
  }
});

test("every mission item exists in the catalog", function () {
  for (const group of MISSION_GROUPS) {
    for (const id of group.items) {
      assert.ok(findItem(id), group.id + " lists missing catalog item " + id);
    }
  }
});

test("no catalog item belongs to more than one mission group", function () {
  const seen = new Map();
  for (const group of MISSION_GROUPS) {
    for (const id of group.items) {
      assert.ok(!seen.has(id), id + " appears in both " + seen.get(id) + " and " + group.id);
      seen.set(id, group.id);
    }
  }
});

test("groupOfItem finds the owning group", function () {
  const group = MISSION_GROUPS[0];
  assert.equal(groupOfItem(group.items[0]), group);
  assert.equal(groupOfItem("__missing__"), null);
});

test("roleOf describes each hardware category", function () {
  assert.equal(roleOf({ category: "rockets", name: "Saturn V" }), "Launch vehicle");
  assert.equal(roleOf({ category: "spacecraft", name: "Apollo CSM" }), "Command & service module");
  assert.equal(roleOf({ category: "spacecraft", name: "Voyager 1" }), "Spacecraft");
  assert.equal(roleOf({ category: "telescopes", name: "Hubble Space Telescope" }), "Space telescope");
  assert.equal(roleOf({ category: "telescopes", name: "Lunar Reconnaissance Orbiter" }), "Orbiter");
  assert.equal(roleOf({ category: "landers", name: "Lunar Roving Vehicle" }), "Rover");
  assert.equal(roleOf({ category: "landers", name: "Ingenuity Mars Helicopter" }), "Helicopter");
  assert.equal(roleOf({ category: "landers", name: "Pioneer Venus Large Probe" }), "Atmospheric probe");
  assert.equal(roleOf({ category: "landers", name: "Sojourner" }), "Lander & rover");
  assert.equal(roleOf({ category: "landers", name: "Viking 1 Lander" }), "Lander");
  assert.equal(roleOf({ category: "instruments", name: "Seismometer" }), "Instrument");
  assert.equal(roleOf({ category: "stations", name: "Zarya" }), "Station module");
  assert.equal(roleOf({ category: "capsules", name: "Orion crew module" }), "Return capsule");
  assert.equal(roleOf({ category: "unknown", name: "Mystery" }), "Hardware");
});
