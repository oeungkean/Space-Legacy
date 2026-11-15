// Turns a mission's real events into a film: an ordered list of chapters for the mission player.
//   engine "launch"  = countdown, liftoff and climb to orbit (js/launch-cinematic.js)
//   engine "film"    = space shots (js/space-film.js)
//   engine "landing" = the close-up landing, or the splashdown back on Earth (js/landing-scene.js)
// The facts and dates come from the mission data (data/*.js). The narration is written to sound like a
// mission scientist explaining what is happening; the extra sentences only add general, well-known facts.

import { hardwareReplays, replayVisuals } from "../data/hardware-replays.js";
import { missions, STAGE_TAGS, EVENT_ACTIONS } from "../data/missions.js";
import { spacecraftInfo } from "../data/spacecraft.js";
import { hardwareList } from "../data/hardware.js";

const WORLD = { Earth: "earth", Moon: "moon", Mars: "mars", Venus: "venus", Mercury: "mercury", Jupiter: "jupiter", Saturn: "saturn", Uranus: "uranus", Neptune: "neptune", Titan: "titan" };
const CREWED = { "apollo-stack": true, orion: true, gemini: true, dragon: true, "apollo-csm": true };
const CAPSULE_OF = { "apollo-stack": "apollo-cm", "apollo-csm": "apollo-cm", orion: "orion-cm", gemini: "gemini-cm", dragon: "dragon", "osiris-rex": "src", stardust: "src" };
const LANDING_SITE = { apollo11: "tranquility", apollo15: "hadley", apollo17: "taurus-littrow", curiosity: "gale", perseverance: "jezero" };

// ----- The narrator: a scientist talking you through it -----
function join() {
  return Array.from(arguments).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

const SAY = {
  launch: function (e, crewed) {
    return join(e.narration || e.caption,
      "Watch the first few seconds. A rocket this heavy rises slowly at first, because it is still carrying nearly all of its fuel.",
      "About a minute in, it passes Max Q, the moment of greatest stress from the air rushing past.",
      "Then the first stage burns out and falls away, the upper stage takes over, and a few minutes later " + (crewed ? "the crew is" : "we are") + " in orbit.");
  },
  orbit: function (crewed, leaving) {
    return crewed
      ? join("So now we're in orbit, going all the way around Earth in about an hour and a half.", leaving ? "Before the big burn, the crew and the flight controllers check every system. Then the engine lights again, and this is the burn that really matters: it gives the spacecraft enough speed to leave Earth behind." : "")
      : join("We're in orbit now, circling Earth at about twenty-eight thousand kilometers per hour.", leaving ? "The upper stage fires again. This burn is the one that really counts, because it gives the spacecraft enough speed to escape Earth's gravity." : "");
  },
  cruise: function (e) {
    return join(e.narration || e.caption, "Most of a mission actually looks like this: long, quiet coasting.",
      "Every so often we fire small thrusters for a course correction, because even a tiny error early on grows into thousands of kilometers by the time we arrive.");
  },
  flyby: function (e) {
    return join(e.narration || e.caption, "This is a gravity assist. We borrow a tiny bit of the planet's orbital energy. It bends our path and changes our speed, without burning any fuel.");
  },
  arrive: function (e) {
    return join(e.narration || e.caption, "To stay here, the spacecraft has to slow down. It turns around and fires its engine against its direction of travel. If this burn fails, it simply flies past.");
  },
  descend: function (style, world) {
    if (style === "lm") return "The Lunar Module separates from the Command Module. One astronaut stays in orbit while two head down. There's no air on the Moon, so there are no parachutes. It's rocket engine all the way down.";
    if (world === "mars") return "Here the cruise stage separates, and the capsule turns its heat shield forward. What comes next is often called seven minutes of terror: the spacecraft has to go from about twenty thousand kilometers per hour to a gentle touchdown, completely on its own, because a radio signal takes several minutes to reach Earth.";
    return "The probe heads down into the atmosphere, heat shield first. From here on, everything happens automatically.";
  },
  landing: function (e) {
    return join(e.narration || e.caption);
  },
  surface: function (e) {
    return join(e.narration || e.caption);
  },
  deploy: function (e) {
    return join(e.narration || e.caption, "Everything has to unfold exactly right, in the right order, because there's no one up here to fix it.");
  },
  sample: function (e) {
    return join(e.narration || e.caption, "The touch lasts only a few seconds. A puff of gas stirs up the surface, and the sampler catches what flies up.");
  },
  sun: function (e) {
    return join(e.narration || e.caption, "The heat shield always faces the Sun. Behind it, the instruments stay close to room temperature.");
  },
  ret: function (e, fromMoon) {
    return join(e ? e.narration || e.caption : "", fromMoon
      ? "Coming home from the Moon, the capsule meets the atmosphere at about eleven kilometers per second. The entry angle has to be just right: too steep and the heating is too much, too shallow and it can skip back out."
      : "The engine fires against the direction of travel, just enough to lower the orbit into the atmosphere. Then the service module separates, and the capsule turns its heat shield forward.");
  },
  splashdown: function (e) {
    return join(e ? e.narration || e.caption : "", "Parachutes open in stages: small drogues first to steady the capsule, then the big mains to slow it right down.");
  },
  finale: function (outcome) {
    return join(outcome && outcome.text, "And that's the mission.");
  }
};

// ----- Helpers -----
function worldOf(target, event) {
  if (WORLD[target]) return WORLD[target];
  if (target === "deep") return /wild|comet/i.test(event.body || event.title) ? "comet" : "bennu";
  if (target === "oval") return "sun";
  if (/pluto/i.test(event.title)) return "pluto";
  if (/arrokoth/i.test(event.title)) return "arrokoth";
  return null;
}

function chapter(engine, label, e, extra) {
  return Object.assign({ engine: engine, label: label, title: e ? e.title : label, date: e ? e.date : "", caption: e ? e.caption : "" }, extra);
}

// ----- Build the chapters from a list of events -----
// meta: { label, rocket, look, models[], stages[], actions{}, landingHardware, landingIndex, outcome, crewed, jwst }
function fromEvents(events, meta) {
  const chapters = [];
  const modelAt = function (i) { return (meta.models && meta.models[i]) || events[i].model || meta.defaultModel || "voyager"; };
  const stageAt = function (i) { return (meta.stages && meta.stages[i]) || events[i].stage || "B"; };
  const first = events[0];
  const craft0 = modelAt(Math.min(1, events.length - 1));
  const crewed = Boolean(meta.crewed || CREWED[craft0] || CREWED[modelAt(0)]);
  const landingItem = meta.landingHardware ? hardwareList.find(function (h) { return h.id === meta.landingHardware; }) : null;
  let landingIndex = -1;
  if (landingItem) {
    landingIndex = meta.landingIndex !== undefined && meta.landingIndex >= 0 ? meta.landingIndex
      : events.findIndex(function (e) { return /landing|entry, descent|enters|plunge/i.test(e.title); });
  }

  // 1. Launch and climb to orbit
  chapters.push(chapter("launch", "Launch", first, { rocket: first.rocket || meta.rocket, look: meta.look, narration: SAY.launch(first, crewed), part: "out" }));

  // 2. Earth orbit (and the departure burn, if the mission leaves Earth)
  const next = events[1];
  const leaves = next && !(next.target === "Earth" && (next.action === "deploy" || meta.actions && meta.actions[1] === "deploy" || next.action === "orbit" && !/L2/.test(next.title)));
  const staysInOrbit = events.every(function (e) { return e.target === "Earth" || !e.target; }) && !meta.jwst;
  if (meta.jwst) {
    chapters.push(chapter("film", "Departure", { title: "Straight out toward L2", date: first.date, caption: "The upper stage sends Webb directly toward L2, about 1.5 million kilometers from Earth." }, { shot: { kind: "depart", craft: craft0 }, narration: "Webb doesn't stay in Earth orbit at all. The rocket sends it straight out, on a month-long trip to a point about one and a half million kilometers away.", part: "out" }));
  } else if (!staysInOrbit) {
    chapters.push(chapter("film", leaves && !staysInOrbit ? "Leaving Earth" : "Earth orbit", { title: leaves && !staysInOrbit ? "Parking orbit and departure burn" : "In Earth orbit", date: first.date, caption: leaves && !staysInOrbit ? "In orbit for a short time, then the engine fires again to leave Earth." : "Circling Earth." },
      { shot: { kind: "orbit", craft: craft0, burn: leaves && !staysInOrbit, roll: crewed }, narration: SAY.orbit(crewed, leaves && !staysInOrbit), part: "out" }));
    if (leaves && !staysInOrbit) chapters.push(chapter("film", "Departure", { title: "Earth falls behind", date: first.date, caption: "The spacecraft speeds away from Earth." }, { shot: { kind: "depart", craft: craft0 }, narration: "", part: "out", short: true }));
  }

  let returning = false;
  for (let i = 1; i < events.length; i++) {
    const e = events[i];
    const action = (meta.actions && meta.actions[i]) || e.action;
    const stage = stageAt(i);
    const world = worldOf(e.target, e);
    const craft = modelAt(i);
    const part = stage === "D" || returning ? "ret" : stage === "E" ? "end" : "out";
    if (stage === "D") returning = true;

    if (i === landingIndex && landingItem) {
      const style = landingItem.landing.style;
      const lm = landingItem.landing.lander === "lunar-module";
      // Descent and landing are ONE chapter: the approach from orbit (film) flows straight into the touchdown scene
      chapters.push(chapter("landing", "Descent & Landing", e, {
        item: landingItem, narration: SAY.landing(e), part: "out", landing: true, lm: lm,
        pre: {
          title: lm ? "Undocking and descent" : "Approach and entry",
          caption: lm ? "The Lunar Module undocks and starts its powered descent." : "The cruise stage separates; the capsule turns its heat shield forward.",
          shot: { kind: "descend", world: world || "mars", style: lm ? "lm" : style, craft: lm ? "lunar-module" : (style === "skycrane" || style === "airbag" || /viking|phoenix|insight/.test(landingItem.landing.lander || "")) ? "capsule" : craft, cruiseStage: world === "mars" },
          narration: SAY.descend(lm ? "lm" : style, world)
        }
      }));
      continue;
    }
    if (action === "splashdown" || action === "parachute") {
      const capsule = e.model && CAPSULE_OF[e.model] === undefined ? e.model : CAPSULE_OF[craft] || craft;
      const prev = chapters[chapters.length - 1];
      if (!prev || prev.shot === undefined || prev.shot.kind !== "ret") {
        const orbitOnly = !events.some(function (x) { return x.target === "Moon" || x.target === "deep"; });
        chapters.push(chapter("film", "Coming home", { title: orbitOnly ? "De-orbit burn" : "Heading home", date: e.date, caption: orbitOnly ? "A short engine burn lowers the orbit into the atmosphere." : "On the way back to Earth." },
          { shot: { kind: "ret", craft: modelAt(Math.max(0, i - 1)), capsule: capsule, fromOrbit: orbitOnly, from: "moon" }, narration: SAY.ret(null, !orbitOnly), part: "ret" }));
      }
      chapters.push(chapter("landing", action === "parachute" ? "Landing" : "Splashdown", e, {
        item: { id: "return-" + capsule, name: meta.label + " · Return to Earth", destination: "Earth", landing: { style: "splashdown", capsule: capsule, ground: action === "parachute" ? "desert" : "ocean" } },
        narration: SAY.splashdown(e), part: "ret"
      }));
      continue;
    }
    if (action === "reentry") {
      // the trip home ends at the edge of the atmosphere; the next chapter is the splashdown (or the end)
      const fromMoon = events.some(function (x) { return x.target === "Moon"; });
      const capsule = CAPSULE_OF[craft] || craft;
      const prev = chapters[chapters.length - 1];
      if (prev && prev.shot && prev.shot.kind === "ret") continue;
      chapters.push(chapter("film", fromMoon ? "Heading home" : "Re-entry", e, { shot: { kind: "ret", craft: craft === capsule ? modelAt(Math.max(0, i - 1)) : craft, capsule: capsule, from: fromMoon ? "moon" : null, fromOrbit: !fromMoon && !events.some(function (x) { return x.target === "deep"; }) }, narration: SAY.ret(e, fromMoon), part: stage === "E" ? "end" : "ret" }));
      continue;
    }
    if (e.liftoff) {
      chapters.push(chapter("film", "Liftoff", e, { shot: { kind: "surface", world: world || "moon", site: LANDING_SITE[meta.hardwareId] || "", liftoff: true }, narration: SAY.surface(e), part: "ret" }));
      returning = true;
      continue;
    }
    if (action === "deploy" || e.deploy && e.deploy[0] !== e.deploy[1]) {
      const place = meta.jwst ? "deep" : e.target === "Earth" ? "earth" : "deep";
      if (world && world !== "earth" && world !== "comet" && world !== "bennu") {
        chapters.push(chapter("film", "In orbit", e, { shot: { kind: "orbitAt", world: world, craft: craft }, narration: SAY.deploy(e), part: part }));
      } else if (world === "comet" || world === "bennu") {
        chapters.push(chapter("film", "Flyby", e, { shot: { kind: "flyby", world: world, craft: craft }, narration: SAY.flyby(e), part: part }));
      } else {
        chapters.push(chapter("film", "Deployment", e, { shot: { kind: "deploy", craft: craft, place: place, from: e.deploy ? e.deploy[0] : 0, to: e.deploy ? e.deploy[1] : 1 }, narration: SAY.deploy(e), part: part }));
      }
      continue;
    }
    if (action === "sample") {
      chapters.push(chapter("film", "Sample", e, { shot: { kind: "sample", world: world || "bennu", craft: craft }, narration: SAY.sample(e), part: part }));
      continue;
    }
    if (stage === "E") {
      // the closing scene is added after the loop
      chapters.push(chapter("film", "Today", e, { shot: { kind: "finale", world: world === "sun" ? null : world, craft: craft }, narration: join(e.narration || e.caption), part: "end", finale: true }));
      continue;
    }
    if (world === "sun") {
      chapters.push(chapter("film", "Near the Sun", e, { shot: { kind: "sun", craft: craft }, narration: SAY.sun(e), part: part }));
      continue;
    }
    if (landingIndex > -1 && i > landingIndex && !returning && stage === "C") {
      // after landing: on the surface
      chapters.push(chapter("film", "On the surface", e, {
        shot: { kind: "surface", world: world || "mars", site: LANDING_SITE[meta.hardwareId] || "", model: craft === "lunar-module" ? "lunar-module" : craft,
          astronauts: craft === "lunar-module", helicopter: /ingenuity|flight/i.test(e.title), drive: /rover|curiosity|perseverance/.test(craft) && !/ingenuity|flight/i.test(e.title) },
        narration: SAY.surface(e), part: "out"
      }));
      continue;
    }
    if (stage === "D" && world !== "earth") {
      // heading home: leaving the target world
      if (/flyby/i.test(e.title) && world) chapters.push(chapter("film", "Return flyby", e, { shot: { kind: "flyby", world: world, craft: craft }, narration: SAY.flyby(e), part: "ret" }));
      else chapters.push(chapter("film", "Heading home", e, { shot: { kind: "ret", craft: craft, capsule: CAPSULE_OF[craft], from: world || "moon" }, narration: SAY.ret(e, world === "moon"), part: "ret" }));
      continue;
    }
    if (stage === "D" && world === "earth") {
      chapters.push(chapter("film", "Heading home", e, { shot: { kind: "ret", craft: craft, capsule: CAPSULE_OF[craft], from: null, fromOrbit: false }, narration: SAY.ret(e, false), part: "ret" }));
      continue;
    }
    if (/flyby|gravity assist/i.test(e.title) && world) {
      chapters.push(chapter("film", "Flyby", e, { shot: { kind: "flyby", world: world, craft: craft }, narration: SAY.flyby(e), part: part }));
      continue;
    }
    const releaseProbe = /release|separates/i.test(e.title);
    if (releaseProbe && world) {
      const probe = /huygens/i.test(e.title) ? "huygens" : "galileo-probe";
      chapters.push(chapter("film", "Probe release", e, { shot: { kind: "orbitAt", world: world === "titan" ? "saturn" : world, craft: craft === probe ? (probe === "huygens" ? "cassini" : "galileo-orbiter") : craft, release: probe }, narration: SAY.cruise(e), part: part }));
      continue;
    }
    const nextEvent = events[i + 1];
    const reached = chapters.some(function (c) { return c.shot && c.shot.world === world && (c.shot.kind === "arrive" || c.shot.kind === "orbitAt"); });
    const directEntry = nextEvent && i + 1 === landingIndex && world !== "moon" && !reached;
    if (world && world !== "earth" && (stage === "C" || /arriv|orbit/i.test(e.title)) && !directEntry) {
      if (reached || /finale/i.test(e.title)) chapters.push(chapter("film", "In orbit", e, { shot: { kind: "orbitAt", world: world, craft: craft }, narration: SAY.cruise(e), part: part }));
      else chapters.push(chapter("film", "Arrival", e, { shot: { kind: "arrive", world: world, craft: craft, far: /distant/i.test(e.title) }, narration: SAY.arrive(e), part: part }));
      continue;
    }
    if (e.target === "Earth" && /L2/.test(e.title)) {
      chapters.push(chapter("film", "At L2", e, { shot: { kind: "deploy", craft: craft, place: "deep", from: 1, to: 1 }, narration: join(e.narration || e.caption), part: part }));
      continue;
    }
    if (e.target === "Earth" && (action === "orbit" || stage === "B")) {
      chapters.push(chapter("film", "In orbit", e, { shot: { kind: "orbitAt", world: "earth", craft: craft, puff: true }, narration: join(e.narration || e.caption), part: part }));
      continue;
    }
    // Cruise toward the next world (it grows slowly ahead)
    chapters.push(chapter("film", "Cruise", e, { shot: { kind: "cruise", craft: craft, world: world && world !== "earth" ? world : null, belt: e.target === "belt", roll: crewed }, narration: SAY.cruise(e), part: part }));
  }

  // 3. The closing view, with the final status
  const last = chapters[chapters.length - 1];
  if (!last.finale) {
    const lastEvent = events[events.length - 1];
    const lastWorld = worldOf(lastEvent.target, lastEvent);
    const home = last.engine === "landing" && last.item && last.item.destination === "Earth";
    chapters.push(chapter("film", "Mission complete", { title: "Mission complete", date: "", caption: meta.outcome ? meta.outcome.text : "Mission complete." },
      { shot: { kind: "finale", world: home ? "earth" : lastWorld === "sun" || meta.jwst ? null : lastWorld, craft: home ? null : modelAt(events.length - 1) }, narration: SAY.finale(meta.outcome), part: "end", finale: true }));
  } else {
    last.caption = meta.outcome ? meta.outcome.text : last.caption;
    last.narration = join(last.narration, meta.outcome ? meta.outcome.text : "", "And that's the mission.");
  }
  return chapters;
}

// ----- Public: a plan for each kind of replay -----
export function planForHardware(id) {
  const data = hardwareReplays[id];
  if (!data) return null;
  const item = hardwareList.find(function (h) { return h.id === id; });
  const visuals = replayVisuals[id] || {};
  return {
    title: data.label, source: { type: "hardware", id: id },
    chapters: fromEvents(data.events, {
      label: data.label, rocket: data.events[0].rocket, models: visuals.models, stages: STAGE_TAGS[id], actions: EVENT_ACTIONS[id],
      landingHardware: item && item.landing ? id : null, hardwareId: id,
      outcome: item && item.status ? { label: item.status.label || "Mission complete", text: item.status.text } : null
    })
  };
}

export function planForMission(id, extra) {
  const mission = missions[id];
  if (!mission) return null;
  return {
    title: mission.label, source: { type: "mission", id: id },
    chapters: fromEvents(mission.events, Object.assign({
      label: mission.label, rocket: mission.rocket, look: mission.look, landingHardware: mission.landingHardware || null,
      landingIndex: mission.landingIndex, outcome: mission.outcome, jwst: id === "jwst"
    }, extra || {}))
  };
}

export function planForSpacecraft(name, rocket) {
  const info = spacecraftInfo[name];
  if (!info || !info.replay) return null;
  const fact = info.facts.find(function (f) { return f[0].indexOf("Status") === 0; });
  const model = name === "Parker Solar Probe" ? "parker" : "voyager";
  return {
    title: name, source: { type: "spacecraft", name: name },
    chapters: fromEvents(info.replay, {
      label: name, rocket: info.replay[0].rocket || rocket, stages: STAGE_TAGS[name], defaultModel: model,
      models: info.replay.map(function () { return model; }),
      outcome: fact ? { label: "Status", text: fact[1] } : null
    })
  };
}

// Split a plan for a Simulator mission with an exploration site:
//   outbound = everything up to the landing (or, for the Apollo Lunar Module, up to the descent you fly yourself,
//              or for orbit sites, up to arriving in orbit); ret = the trip home and the end.
export function splitForSite(plan, site) {
  const chapters = plan.chapters;
  let cut = -1;
  if (site.start === "lm-landing") cut = chapters.findIndex(function (c) { return c.lm; });
  if (cut < 0) cut = chapters.findIndex(function (c) { return c.landing; });
  if (cut < 0) {
    const firstReturn = chapters.findIndex(function (c) { return c.part === "ret" || c.part === "end"; });
    cut = (firstReturn < 0 ? chapters.length : firstReturn) - 1;
  }
  return {
    outbound: chapters.slice(0, cut + 1),
    ret: chapters.slice(cut + 1).filter(function (c) { return c.part === "ret" || c.part === "end"; })
  };
}

// A short trip home for a crew that has no researched return (Simulator sandbox)
export function genericReturn(label, craft, capsule, fromWorld) {
  const fromOrbit = !fromWorld || fromWorld === "earth";
  const e = { title: fromOrbit ? "De-orbit burn" : "Heading home", date: "", caption: fromOrbit ? "A short engine burn lowers the orbit into the atmosphere." : "On the way back to Earth." };
  return [
    chapter("film", "Coming home", e, { shot: { kind: "ret", craft: craft, capsule: capsule, fromOrbit: fromOrbit, from: fromWorld }, narration: SAY.ret(null, fromWorld === "moon"), part: "ret" }),
    chapter("landing", "Splashdown", { title: "Splashdown", date: "", caption: "The crew comes home under parachutes." }, {
      item: { id: "return-" + capsule, name: label + " · Return to Earth", destination: "Earth", landing: { style: "splashdown", capsule: capsule, ground: "ocean" } },
      narration: SAY.splashdown(null), part: "ret"
    }),
    chapter("film", "Mission complete", { title: "Mission complete", date: "", caption: "The crew is home safely." }, { shot: { kind: "finale", world: "earth" }, narration: "The crew is home safely. And that's the mission.", part: "end", finale: true })
  ];
}

export { CAPSULE_OF };
