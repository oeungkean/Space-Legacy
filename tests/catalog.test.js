import test from "node:test";
import assert from "node:assert/strict";
import { catalog, CATEGORIES, REGIONS, findItem, launchYear, itemsForBody } from "../data/catalog.js";

test("catalog item ids are unique", function () {
  const ids = catalog.map(function (item) { return item.id; });
  assert.equal(new Set(ids).size, ids.length);
});

test("every item has a known category", function () {
  const known = new Set(CATEGORIES.map(function (category) { return category.id; }));
  for (const item of catalog) {
    assert.ok(known.has(item.category), item.id + " has unknown category " + item.category);
  }
});

test("every item has a known region", function () {
  for (const item of catalog) {
    if (!item.region) continue;
    assert.ok(REGIONS.includes(item.region), item.id + " has unknown region " + item.region);
  }
});

test("findItem returns the item or null", function () {
  const first = catalog[0];
  assert.equal(findItem(first.id), first);
  assert.equal(findItem("__missing__"), null);
});

test("launchYear reads the year from the launch date", function () {
  assert.equal(launchYear({ launchDate: "July 16, 1969" }), 1969);
  assert.equal(launchYear({ launchDate: "September 5, 1977" }), 1977);
  assert.equal(launchYear({ launchDate: "" }), null);
  assert.equal(launchYear({}), null);
});

test("itemsForBody only returns items linked to that body", function () {
  const items = itemsForBody("Mars");
  assert.ok(items.length > 0, "expected at least one Mars item");
  for (const item of items) {
    assert.ok((item.bodies || []).includes("Mars"), item.id + " is not linked to Mars");
  }
});

test("every related id points to an existing item", function () {
  for (const item of catalog) {
    for (const id of item.related || []) {
      assert.ok(findItem(id), item.id + " relates to missing item " + id);
    }
  }
});

test("every rocket reference resolves to a rocket item", function () {
  for (const item of catalog) {
    if (!item.rocket) continue;
    const rocket = findItem(item.rocket);
    assert.ok(rocket, item.id + " uses missing rocket " + item.rocket);
    assert.equal(rocket.category, "rockets", item.id + " rocket " + item.rocket + " is not in the rockets category");
  }
});

test("every item has a name and a model or image", function () {
  for (const item of catalog) {
    assert.ok(item.name, item.id + " has no name");
    assert.ok(item.model || item.image, item.id + " has no model or image");
  }
});
