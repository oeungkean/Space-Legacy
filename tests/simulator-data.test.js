import test from "node:test";
import assert from "node:assert/strict";
import {
  TEMPLATES,
  templatesFor,
  SUITS,
  DESTINATIONS,
  SPACECRAFT,
  SITES,
  SIM_ROCKETS,
  ROCKET_PARTS
} from "../data/simulator.js";
import { findItem } from "../data/catalog.js";

test("templatesFor({}) returns every template", function () {
  assert.equal(templatesFor({}).length, TEMPLATES.length);
});

test("templatesFor filters by rocket, spacecraft and destination", function () {
  const template = TEMPLATES[0];
  const byRocket = templatesFor({ rocket: template.rocket });
  assert.ok(byRocket.length > 0);
  for (const item of byRocket) assert.equal(item.rocket, template.rocket);

  const byAll = templatesFor({
    rocket: template.rocket,
    spacecraft: template.spacecraft,
    destination: template.destination
  });
  assert.ok(byAll.includes(template));
});

test("templatesFor returns an empty list for an unknown rocket", function () {
  assert.deepEqual(templatesFor({ rocket: "__missing__" }), []);
});

test("every template has the fields the simulator needs", function () {
  const ids = new Set();
  for (const template of TEMPLATES) {
    assert.ok(template.id, "a template has no id");
    assert.ok(!ids.has(template.id), "duplicate template id " + template.id);
    ids.add(template.id);
    assert.ok(template.name, template.id + " has no name");
    assert.equal(typeof template.year, "number", template.id + " has no year");
    assert.ok(DESTINATIONS[template.destination], template.id + " has unknown destination " + template.destination);
    assert.ok(SPACECRAFT[template.spacecraft], template.id + " has unknown spacecraft " + template.spacecraft);
  }
});

test("every simulated rocket is in the catalog or has a simulator parts entry", function () {
  for (const id of SIM_ROCKETS) {
    assert.ok(findItem(id) || ROCKET_PARTS[id], "simulator rocket " + id + " is not in the catalog and has no parts");
  }
});

test("every template rocket is in the catalog or has a simulator parts entry", function () {
  for (const template of TEMPLATES) {
    assert.ok(findItem(template.rocket) || ROCKET_PARTS[template.rocket], template.id + " uses unknown rocket " + template.rocket);
  }
});

test("every rocket with simulator parts is a known rocket", function () {
  for (const id of Object.keys(ROCKET_PARTS)) {
    assert.ok(findItem(id) || SIM_ROCKETS.includes(id), "rocket parts exist for unknown rocket " + id);
    assert.ok(Array.isArray(ROCKET_PARTS[id]) && ROCKET_PARTS[id].length > 0, id + " has no parts");
  }
});

test("every suit has a name and sources", function () {
  for (const id of Object.keys(SUITS)) {
    const suit = SUITS[id];
    assert.ok(suit.name, id + " has no name");
    assert.ok(Array.isArray(suit.sources) && suit.sources.length > 0, id + " has no sources");
  }
});

test("every site has a name and world; any suit it names is known", function () {
  for (const id of Object.keys(SITES)) {
    const site = SITES[id];
    assert.ok(site.name, id + " has no name");
    assert.ok(site.world, id + " has no world");
    if (site.suit) assert.ok(SUITS[site.suit], id + " uses unknown suit " + site.suit);
    assert.ok(Array.isArray(site.equipment), id + " has no equipment list");
  }
});
