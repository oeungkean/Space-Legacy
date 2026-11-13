// The mission briefing shown when a mission starts: where it leaves from, where it is going (with
// coordinates), how long the journey takes, and whether the mission is possible, with the reasons
// behind a "Show more" button.
//
// Everything here comes from data already in the project (data/simulator.js: the real missions in
// TEMPLATES, travel times in DESTINATIONS; data/hardware.js: real landing coordinates). The launch
// site coordinates are rounded and marked "about". The "possible?" verdict is a simplified, rule-based
// explanation, not an engineering calculation: it says so in the text.

import { TEMPLATES, DESTINATIONS, SPACECRAFT, SITES } from "../data/simulator.js";
import { hardwareList } from "../data/hardware.js";
import { findItem } from "../data/catalog.js";

// Where each rocket launched from (rounded; the exact pad differs between missions)
const KSC = { name: "Kennedy Space Center, Florida", lat: 28.6, lon: -80.6 };
const CAPE = { name: "Cape Canaveral, Florida", lat: 28.5, lon: -80.6 };
const LAUNCH_SITES = {
  "saturn-v": KSC, "saturn-v-skylab": KSC, sls: KSC, shuttle: KSC, "shuttle-sts31": KSC, "shuttle-sts88": KSC, "falcon-9": KSC,
  "titan-2": CAPE, "titan-3e": CAPE, "titan-4b": CAPE, "atlas-centaur": CAPE, "delta-2": CAPE, "delta-2-heavy": CAPE,
  "atlas-v-401": CAPE, "atlas-v-411": CAPE, "atlas-v-541": CAPE, "atlas-v-551": CAPE, "delta-4-heavy": CAPE,
  "ariane-5": { name: "Guiana Space Centre, Kourou, French Guiana", lat: 5.2, lon: -52.8 },
  proton: { name: "Baikonur Cosmodrome, Kazakhstan", lat: 45.9, lon: 63.3 }
};

// A simplified ranking of how much energy it takes to get there from Earth (0 = Earth orbit).
// Leaving Earth for the Moon or L2 takes much more than reaching orbit; the planets more again;
// falling close to the Sun takes the most of all (Parker needed a very powerful rocket and Venus flybys).
const DIFFICULTY = { "earth-orbit": 0, moon: 1, l2: 1, mars: 2, venus: 2, asteroid: 2, mercury: 3, jupiter: 3, saturn: 3, deep: 3, sun: 4 };
const NO_SURFACE = { "earth-orbit": true, l2: true, jupiter: true, saturn: true, deep: true, sun: true };

// Where the landing sites are (real coordinates from data/hardware.js)
const SITE_HARDWARE = { tranquility: "apollo11", hadley: "apollo15", "taurus-littrow": "apollo17", gale: "curiosity", jezero: "perseverance" };

// A destination's name inside a sentence ("the Moon", not "The Moon")
function place(destination) {
  const d = DESTINATIONS[destination];
  const name = d ? d.name : String(destination);
  return name.indexOf("The ") === 0 ? "t" + name.slice(1) : name;
}
// "the Moon (Apollo 11, Apollo 15)" from a list of missions
function tripsText(trips) {
  const byPlace = {};
  trips.forEach(function (t) { (byPlace[t.destination] = byPlace[t.destination] || []).push(t.name); });
  return Object.keys(byPlace).map(function (k) { return place(k) + " (" + byPlace[k].join(", ") + ")"; }).join(" and ");
}
function lowerFirst(text) {
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

function coords(lat, lon) {
  return Math.abs(lat).toFixed(2) + "° " + (lat >= 0 ? "N" : "S") + ", " + Math.abs(lon).toFixed(2) + "° " + (lon >= 0 ? "E" : "W");
}

function destinationPlace(destination, siteId) {
  const d = DESTINATIONS[destination];
  const name = d ? d.name : destination;
  const hardware = siteId && SITE_HARDWARE[siteId] ? hardwareList.find(function (h) { return h.id === SITE_HARDWARE[siteId]; }) : null;
  if (hardware && typeof hardware.lat === "number") {
    return { name: (hardware.location || name).split("(")[0].trim(), coords: coords(hardware.lat, hardware.lon), real: true };
  }
  const site = siteId ? SITES[siteId] : null;
  if (site && site.fictional) return { name: site.name, coords: "No real coordinates (fictional site)", real: false };
  const notes = {
    "earth-orbit": "Orbit around Earth, a few hundred kilometers up",
    l2: "About 1.5 million km from Earth, on the side away from the Sun",
    moon: "About 384,400 km away (average distance)"
  };
  return { name: name, coords: notes[destination] || "", real: true };
}

function farthest(rocket) {
  let best = null;
  TEMPLATES.forEach(function (t) {
    if (t.rocket !== rocket) return;
    if (!best || (DIFFICULTY[t.destination] || 0) > (DIFFICULTY[best.destination] || 0)) best = t;
  });
  return best;
}

// config: { rocket, rocketName, spacecraft, destination, siteId, title }
export function missionBriefing(config) {
  if (!config || !config.rocket) return null;
  const from = LAUNCH_SITES[config.rocket] || KSC;
  const to = destinationPlace(config.destination, config.siteId);
  const craft = SPACECRAFT[config.spacecraft];
  const craftName = craft ? craft.name : "The spacecraft";
  const rocketItem = findItem(config.rocket);
  const rocketName = config.rocketName || (rocketItem && rocketItem.name) || config.rocket;
  const exact = TEMPLATES.filter(function (t) { return t.rocket === config.rocket && t.spacecraft === config.spacecraft && t.destination === config.destination; });
  const dest = DESTINATIONS[config.destination];
  const destName = place(config.destination);
  const brief = {
    title: config.title || (exact[0] ? exact[0].name : "Mission"),
    from: { name: from.name, coords: "About " + coords(from.lat, from.lon) },
    to: to,
    journey: exact[0] ? exact[0].duration : dest ? dest.travel : "",
    verdict: null
  };

  if (exact.length) {
    const t = exact[0];
    brief.verdict = {
      kind: "possible",
      label: "Possible: it really flew",
      tagline: "Flew for real: " + t.name + ", " + t.year + ".",
      short: t.name + " (" + t.year + ") used this exact rocket, spacecraft and destination.",
      reasons: [
        rocketName + " launched " + craftName + " to " + destName + " on the real " + t.name + " mission in " + t.year + ".",
        "Journey: " + t.duration + ".",
        t.crew ? t.crew + " crew on board." : "No crew on board.",
        "Proof: this is one of the real missions this project is built from (see the mission's sources in Missions)."
      ]
    };
    return brief;
  }

  const reasons = [];
  let kind = "unproven";
  let label = "Not proven: this mix never flew";
  let tagline = "Every part is real, but they never flew together.";
  const rank = DIFFICULTY[config.destination] || 0;
  const record = farthest(config.rocket);
  const recordRank = record ? DIFFICULTY[record.destination] || 0 : -1;
  const craftTrips = TEMPLATES.filter(function (t) { return t.spacecraft === config.spacecraft; });

  if (craft && craft.type === "crewed" && rank >= 2) {
    kind = "unlikely";
    label = "Not possible as built";
    tagline = "No crew has ever gone beyond the Moon.";
    reasons.push("No crewed spacecraft has ever gone farther than the Moon. " + craftName + " was built for " +
      (craftTrips.length ? craftTrips.map(function (t) { return place(t.destination); }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(" and ") : "shorter trips") +
      ", not a journey of " + (dest ? lowerFirst(dest.travel) : "many months") + ".");
  }
  if (craft && (craft.type === "rover" || craft.type === "lander") && NO_SURFACE[config.destination]) {
    kind = "unlikely";
    label = "Does not fit the destination";
    tagline = "A " + craft.type + " needs a surface to land on.";
    reasons.push(craftName + " is a " + craft.type + ": it is built to land on a surface, and " + destName + " has none to land on.");
  }
  if (record && recordRank < rank) {
    if (kind === "unproven") {
      kind = "unlikely";
      label = "Unlikely with this rocket";
      tagline = "It never sent anything past " + place(record.destination) + ".";
    }
    reasons.push("In real missions, " + rocketName + " never sent a spacecraft farther than " + place(record.destination) +
      " (" + record.name + "). Reaching " + destName + " needs more energy (simplified ranking: Earth orbit, then the Moon, then the planets, then the Sun).");
  } else if (record) {
    reasons.push(rocketName + " really sent " + record.name + " to " + place(record.destination) + ", so it has reached this far before.");
  } else {
    reasons.push(rocketName + " is not used for any real mission in this project, so there is no record to compare with.");
  }
  if (craftTrips.length) {
    reasons.push(craftName + " really flew to " + tripsText(craftTrips) + ".");
  }
  reasons.push("Simplified check: real mission planning compares the rocket's performance with the spacecraft's mass for the energy the trip needs. This project does not have verified numbers for that, so this is a guide, not a calculation.");
  brief.verdict = {
    kind: kind,
    label: label,
    tagline: tagline,
    short: kind === "unproven" ? "Each part is real, but they never flew together: this mission is fictional." : reasons[0],
    reasons: reasons
  };
  return brief;
}

// For replays started from Missions or the Solar System: find the real mission behind the plan
export function briefingForPlan(plan) {
  if (!plan || !plan.source) return null;
  const s = plan.source;
  const t = TEMPLATES.find(function (x) {
    return x.replay && x.replay.type === s.type && (x.replay.id === s.id || x.replay.id === s.name);
  }) || TEMPLATES.find(function (x) { return x.id === s.id; });
  if (!t) return null;
  return missionBriefing({ rocket: t.rocket, spacecraft: t.spacecraft, destination: t.destination, siteId: t.site, title: t.name });
}
