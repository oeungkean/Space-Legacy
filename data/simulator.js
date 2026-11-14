// Mission Simulator data: suits, equipment, destinations, spacecraft, and which combinations really flew.
// Facts come from the sources listed here and in docs/RESEARCH-SIMULATOR.md (checked October 2026).
//
// HISTORICAL MODE only allows the rocket + spacecraft + destination combinations in TEMPLATES (real missions).
// SANDBOX MODE allows any combination, and every screen labels it as fictional.

const SRC = {
  a7l: { label: "Smithsonian NASM: Armstrong's A7-L pressure suit (Apollo 11)", url: "https://avpreservation.si.edu/object/nasm_A19730040000" },
  emu: { label: "NASA: Extravehicular Mobility Unit (PDF)", url: "https://www.nasa.gov/wp-content/uploads/2009/07/188963main_extravehicular_mobility_unit.pdf" },
  axemu: { label: "Tech Briefs: A next-generation space suit for Artemis III", url: "https://www.techbriefs.com/component/content/article/53418-a-next-generation-space-suit-for-artemis-iii" },
  demo2: { label: "ESA: SpaceX Demo-2 launch", url: "https://www.esa.int/ESA_Multimedia/Images/2020/10/SpaceX_Demo-2_Launch" },
  demo2Return: { label: "NASA: Splashdown! Demo-2 test flight complete", url: "https://blogs.nasa.gov/commercialcrew/2020/08/02/splashdown-nasas-spacex-demo-2-test-flight-complete" },
  lrv: { label: "NASA NSSDC: The Apollo Lunar Roving Vehicle", url: "https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html" },
  depot: { label: "JPL: Perseverance deposits first sample on Mars surface", url: "https://www.jpl.nasa.gov/news/nasas-perseverance-rover-deposits-first-sample-on-mars-surface" },
  memorial: { label: "NASA: Memorial to fallen astronauts on the Moon", url: "https://science.nasa.gov/resource/memorial-to-fallen-astronauts-on-the-moon" },
  lsp: { label: "NASA LSP: primary launches archive", url: "https://www.nasa.gov/reference/lsp-primary-launches-archive/" }
};
export const SIM_SOURCES = SRC;

// ----- Spacesuits -----
export const SUITS = {
  a7l: {
    name: "Apollo A7-L", era: "Apollo (1969–1972)",
    text: "Made by ILC Industries (Hamilton Standard was the contractor) from beta cloth, rubber, nylon and plastic. Built for moonwalks and worn with a liquid cooling garment for up to 115 hours. Neil Armstrong wore one on Apollo 11.",
    sources: [SRC.a7l]
  },
  emu: {
    name: "Extravehicular Mobility Unit (EMU)", era: "Space Shuttle and ISS",
    text: "A hard upper torso of fiberglass carries the life-support backpack (PLSS) and a chest control module. The PLSS supports spacewalks of up to seven hours; the SAFER jet pack can fly an astronaut back to safety. About 113 kg on Earth without SAFER.",
    sources: [SRC.emu]
  },
  axemu: {
    name: "Axiom AxEMU", era: "Artemis III (planned)",
    text: "Designed by Axiom Space with Prada for NASA's Artemis III Moon landing. Prototype shown March 2023, flight design revealed October 2024. Supports spacewalks of at least eight hours and the cold of permanently shadowed craters for at least two hours.",
    sources: [SRC.axemu]
  },
  gemini: {
    name: "Gemini pressure suit", era: "Gemini (1965–1966)",
    text: "Gemini crews wore pressure suits inside the capsule. Gemini III made no spacewalk. The 3D model is simplified and not an exact copy of the Gemini suit.",
    sources: [{ label: "NASA: Gemini III", url: "https://www.nasa.gov/mission/gemini-iii/" }]
  },
  iva: {
    name: "SpaceX launch-and-entry suit", era: "Crew Dragon (2020–)",
    text: "Worn inside Crew Dragon during launch and return (Robert Behnken and Douglas Hurley wore it on Demo-2). It plugs into the seat for air and power, so it has no backpack and is not a spacewalk suit.",
    sources: [SRC.demo2]
  }
};

// ----- Gravity (m/s^2) used by the exploration physics -----
export const GRAVITY = { earth: 9.81, moon: 1.62, mars: 3.71, orbit: 0 };

// ----- Destinations -----
export const DESTINATIONS = {
  "earth-orbit": { name: "Earth orbit", target: "Earth", gap: 0.35, travel: "Minutes to reach orbit" },
  l2: { name: "Sun–Earth L2", target: "Earth", gap: 4.4, travel: "About a month (Webb: Dec 25, 2021 to Jan 24, 2022)" },
  moon: { name: "The Moon", target: "Moon", gap: 0.12, travel: "About three days (Apollo 11)" },
  mars: { name: "Mars", target: "Mars", gap: 0.4, travel: "About eight and a half months (Curiosity)" },
  venus: { name: "Venus", target: "Venus", gap: 0.4, travel: "About four months (Pioneer Venus 2: Aug 8 to Dec 9, 1978)" },
  mercury: { name: "Mercury", target: "Mercury", gap: 0.3, travel: "About six and a half years to orbit (MESSENGER: 2004 to 2011)" },
  jupiter: { name: "Jupiter", target: "Jupiter", gap: 1.6, travel: "About 21 months (Pioneer 10: Mar 1972 to Dec 1973)" },
  saturn: { name: "Saturn", target: "Saturn", gap: 1.2, travel: "About seven years to orbit (Cassini: 1997 to 2004)" },
  asteroid: { name: "A near-Earth asteroid", target: "deep", radius: 22.5, angle: 1.1, body: "Asteroid", travel: "About two years (OSIRIS-REx: 2016 to 2018)" },
  deep: { name: "Deep space (outer solar system)", target: "outbound", far: 1, travel: "Decades (Voyager, Pioneer, New Horizons)" },
  sun: { name: "Close to the Sun", target: "Venus", gap: 2.5, around: 2.6, travel: "Months to the first close pass (Parker)" }
};

// ----- Spacecraft -----
// type: crewed / lander / rover / probe / telescope / station. crew = how many people it carried on its mission.
export const SPACECRAFT = {
  apollo: { name: "Apollo CSM + Lunar Module", model: "apollo-stack", catalogId: "apollo11-csm", type: "crewed", crew: 3 },
  gemini: { name: "Gemini", model: "gemini", catalogId: "gemini3", type: "crewed", crew: 2 },
  dragon: { name: "Crew Dragon", model: "dragon", catalogId: null, type: "crewed", crew: 2 },
  orion: { name: "Orion", model: "orion", catalogId: "orion", type: "crewed", crew: 0 },
  hubble: { name: "Hubble Space Telescope", model: "hubble", catalogId: "hubble", type: "telescope", crew: 5 },
  jwst: { name: "James Webb Space Telescope", model: "jwst", catalogId: "jwst", type: "telescope", crew: 0 },
  skylab: { name: "Skylab", model: "skylab", catalogId: "skylab", type: "station", crew: 0 },
  zarya: { name: "Zarya (ISS module)", model: "zarya-unity", catalogId: "zarya", type: "station", crew: 0 },
  curiosity: { name: "Curiosity rover", model: "curiosity", catalogId: "curiosity", type: "rover", crew: 0 },
  perseverance: { name: "Perseverance rover", model: "perseverance", catalogId: "perseverance", type: "rover", crew: 0 },
  viking: { name: "Viking 1 lander", model: "viking-lander", catalogId: "viking1", type: "lander", crew: 0 },
  "blue-ghost": { name: "Blue Ghost lander", model: "blue-ghost", catalogId: "blueghost1", type: "lander", crew: 0 },
  lro: { name: "Lunar Reconnaissance Orbiter", model: "lro", catalogId: "lro", type: "probe", crew: 0 },
  voyager: { name: "Voyager", model: "voyager", catalogId: "voyager1", type: "probe", crew: 0 },
  pioneer: { name: "Pioneer 10", model: "pioneer", catalogId: "pioneer10", type: "probe", crew: 0 },
  "new-horizons": { name: "New Horizons", model: "new-horizons", catalogId: "new-horizons", type: "probe", crew: 0 },
  cassini: { name: "Cassini-Huygens", model: "cassini-huygens", catalogId: "cassini", type: "probe", crew: 0 },
  galileo: { name: "Galileo", model: "galileo-orbiter", catalogId: "galileo", type: "probe", crew: 0 },
  parker: { name: "Parker Solar Probe", model: "parker", catalogId: "parker", type: "probe", crew: 0 },
  "osiris-rex": { name: "OSIRIS-REx", model: "osiris-rex", catalogId: "osiris-rex", type: "probe", crew: 0 },
  "pioneer-venus": { name: "Pioneer Venus 2 (Multiprobe)", model: "venus-probe-large", catalogId: "pv-large", type: "probe", crew: 0 },
  messenger: { name: "MESSENGER", model: "messenger", catalogId: "messenger", type: "probe", crew: 0 }
};

// ----- Equipment the user can carry -----
// use: camera (photograph), scan (examine with an instrument), sample (virtual sample), radio (mission updates),
// arm (rover robotic arm), jet (SAFER, zero gravity only)
export const EQUIPMENT = {
  hasselblad: { name: "Hasselblad still camera", use: "camera", icon: "CAM", text: "Apollo crews documented the surface with Hasselblad cameras." },
  "sample-bag": { name: "Sample bags and scoop", use: "sample", icon: "BAG", text: "Apollo 11 brought home 21.55 kg of lunar rock and soil." },
  penetrometer: { name: "Hand lens / field kit", use: "scan", icon: "SCI", text: "Examine a rock or a piece of hardware up close." },
  radio: { name: "Radio (link to Mission Control)", use: "radio", icon: "COM", text: "Mission updates in this simulation are written for the game, not real transcripts." },
  "mastcam-z": { name: "Mastcam-Z (mast cameras)", use: "camera", icon: "CAM", text: "Perseverance's zoomable mast cameras." },
  mastcam: { name: "Mastcam (mast cameras)", use: "camera", icon: "CAM", text: "Curiosity's mast cameras." },
  arm: { name: "Robotic arm instruments", use: "arm", icon: "ARM", text: "Place instruments on a rock to study it." },
  tubes: { name: "Sample tubes", use: "sample", icon: "TUBE", text: "Perseverance seals rock cores in tubes; ten were left at the Three Forks depot." },
  relay: { name: "UHF relay via orbiters", use: "radio", icon: "COM", text: "Rovers send most data home through spacecraft orbiting Mars." },
  camera: { name: "Handheld camera", use: "camera", icon: "CAM", text: "Photograph what you see." },
  safer: { name: "SAFER jet pack", use: "jet", icon: "JET", text: "Small gas jets for moving in zero gravity (EMU)." }
};

// ----- Exploration sites -----
// world: moon / mars / orbit. mode: what you control first. vehicle: lrv / rover / null.
export const SITES = {
  tranquility: {
    name: "Tranquility Base", world: "moon", mission: "Apollo 11", start: "lm-landing", vehicle: null, suit: "a7l",
    equipment: ["hasselblad", "sample-bag", "penetrometer", "radio"]
  },
  hadley: {
    name: "Hadley-Apennine", world: "moon", mission: "Apollo 15", start: "lm-landing", vehicle: "lrv", suit: "a7l",
    equipment: ["hasselblad", "sample-bag", "penetrometer", "radio"]
  },
  "taurus-littrow": {
    name: "Taurus-Littrow valley", world: "moon", mission: "Apollo 17", start: "lm-landing", vehicle: "lrv", suit: "a7l",
    equipment: ["hasselblad", "sample-bag", "penetrometer", "radio"]
  },
  jezero: {
    name: "Jezero Crater", world: "mars", mission: "Mars 2020 (Perseverance)", start: "rover", vehicle: "rover", rover: "perseverance",
    equipment: ["mastcam-z", "arm", "tubes", "relay"]
  },
  gale: {
    name: "Gale Crater", world: "mars", mission: "Mars Science Laboratory (Curiosity)", start: "rover", vehicle: "rover", rover: "curiosity",
    equipment: ["mastcam", "arm", "relay"]
  },
  "orbit-hubble": {
    name: "Low Earth orbit, beside Hubble", world: "orbit", mission: "STS-31", start: "eva", vehicle: null, suit: "emu", craft: "hubble",
    evaNote: "STS-31 made no spacewalk: astronauts first worked on Hubble during later servicing missions. This free EVA is practice.",
    equipment: ["camera", "safer", "radio"]
  },
  "orbit-dragon": {
    name: "Inside Crew Dragon", world: "orbit", mission: "Demo-2", start: "cockpit", vehicle: null, suit: "iva", craft: "dragon",
    evaNote: "Demo-2 made no spacewalk from Dragon, and its suits are not spacewalk suits, so you stay inside.",
    equipment: ["camera", "radio"]
  },
  "orbit-gemini": {
    name: "Inside Gemini III", world: "orbit", mission: "Gemini III", start: "cockpit", vehicle: null, suit: "gemini", craft: "gemini",
    evaNote: "Gemini III made no spacewalk, so you stay inside.",
    equipment: ["camera", "radio"]
  },
  // Sandbox sites (fictional): a crewed landing anywhere on the Moon or Mars
  "sandbox-moon": { name: "Free Build Moon site (fictional)", world: "moon", mission: "Free Build", start: "foot", vehicle: "lrv", suit: "axemu", fictional: true, equipment: ["camera", "sample-bag", "penetrometer", "radio"] },
  "sandbox-mars": { name: "Free Build Mars site (fictional)", world: "mars", mission: "Free Build", start: "foot", vehicle: "rover", rover: "perseverance", suit: "axemu", fictional: true, equipment: ["camera", "sample-bag", "penetrometer", "radio"] }
};

// ----- Historical missions: the only combinations allowed in Historical Mode -----
// replay = an existing replay to play for the journey. journey = events for missions that had no replay yet.
// Each journey event: [stage, title, date, caption, target, extra]
export const TEMPLATES = [
  { id: "apollo11", name: "Apollo 11", year: 1969, rocket: "saturn-v", spacecraft: "apollo", destination: "moon", crew: 3,
    duration: "8 days (July 16 to 24, 1969)", site: "tranquility", replay: { type: "hardware", id: "apollo11" } },
  { id: "apollo15", name: "Apollo 15", year: 1971, rocket: "saturn-v", spacecraft: "apollo", destination: "moon", crew: 3,
    duration: "12 days (July 26 to August 7, 1971)", site: "hadley",
    journey: [
      ["A", "Launch", "July 26, 1971", "A Saturn V lifts off at 9:34 a.m. EDT from Pad 39A with David Scott, James Irwin and Alfred Worden.", "Earth", { isLaunch: true }],
      ["C", "Landing at Hadley-Apennine", "July 30, 1971", "Scott and Irwin land at 22:16 UTC at the foot of the Apennine mountains.", "Moon", { gap: 0.05, model: "lunar-module" }],
      ["C", "First Lunar Roving Vehicle", "July 31, 1971", "The crew deploys the first Lunar Roving Vehicle on the Moon.", "Moon", { gap: 0.04, model: "lrv" }],
      ["D", "Splashdown", "August 7, 1971", "The command module splashes down in the Pacific Ocean.", "Earth", { gap: 0.02, model: "apollo-cm", action: "splashdown" }]
    ] },
  { id: "apollo17", name: "Apollo 17", year: 1972, rocket: "saturn-v", spacecraft: "apollo", destination: "moon", crew: 3,
    duration: "About 13 days (December 7 to 19, 1972)", site: "taurus-littrow",
    journey: [
      ["A", "Launch", "December 7, 1972", "Apollo 17 launches from Kennedy Space Center with Eugene Cernan, Harrison Schmitt and Ronald Evans.", "Earth", { isLaunch: true }],
      ["C", "Landing at Taurus-Littrow", "December 11, 1972", "Cernan and Schmitt land at 19:54 UTC in the Taurus-Littrow valley.", "Moon", { gap: 0.05, model: "lunar-module" }],
      ["D", "Splashdown", "December 19, 1972", "The crew splashes down after a 13-day mission.", "Earth", { gap: 0.02, model: "apollo-cm", action: "splashdown" }]
    ] },
  { id: "gemini3", name: "Gemini III", year: 1965, rocket: "titan-2", spacecraft: "gemini", destination: "earth-orbit", crew: 2,
    duration: "4 h 52 m 31 s", site: "orbit-gemini", replay: { type: "mission", id: "gemini3" } },
  { id: "sts31", name: "STS-31 (Hubble deployment)", year: 1990, rocket: "shuttle-sts31", spacecraft: "hubble", destination: "earth-orbit", crew: 5,
    duration: "5 days (April 24 to 29, 1990)", site: "orbit-hubble", replay: { type: "mission", id: "hubble" } },
  { id: "demo2", name: "Crew Dragon Demo-2", year: 2020, rocket: "falcon-9", spacecraft: "dragon", destination: "earth-orbit", crew: 2,
    duration: "About two months (May 30 to August 2, 2020)", site: "orbit-dragon",
    journey: [
      ["A", "Launch from Pad 39A", "May 30, 2020", "A Falcon 9 launches Crew Dragon with NASA astronauts Robert Behnken and Douglas Hurley.", "Earth", { isLaunch: true }],
      ["C", "At the International Space Station", "2020", "Crew Dragon reaches the International Space Station, its destination.", "Earth", { gap: 0.35, action: "orbit" }],
      ["D", "Splashdown", "August 2, 2020", "Crew Dragon splashes down in the Gulf of Mexico, completing the Demo-2 test flight.", "Earth", { gap: 0.02, action: "splashdown" }]
    ], sources: [SRC.demo2, SRC.demo2Return] },
  { id: "artemis1", name: "Artemis I", year: 2022, rocket: "sls", spacecraft: "orion", destination: "moon", crew: 0,
    duration: "25 d 10 h 53 m", site: null, replay: { type: "mission", id: "artemis1" } },
  { id: "curiosity", name: "Mars Science Laboratory", year: 2011, rocket: "atlas-v-541", spacecraft: "curiosity", destination: "mars", crew: 0,
    duration: "About 8.5 months to Mars, then still operating", site: "gale", replay: { type: "hardware", id: "curiosity" } },
  { id: "perseverance", name: "Mars 2020", year: 2020, rocket: "atlas-v-541", spacecraft: "perseverance", destination: "mars", crew: 0,
    duration: "About 7 months to Mars (July 30, 2020 to February 18, 2021), then still operating", site: "jezero", replay: { type: "hardware", id: "perseverance" } },
  { id: "viking1", name: "Viking 1", year: 1975, rocket: "titan-3e", spacecraft: "viking", destination: "mars", crew: 0,
    duration: "About 11 months to the landing (August 20, 1975 to July 20, 1976)", site: null,
    journey: [
      ["A", "Launch", "August 20, 1975", "A Titan IIIE-Centaur launches Viking 1 from Launch Complex 41.", "Earth", { isLaunch: true }],
      ["C", "First landing on Mars", "July 20, 1976", "The Viking 1 lander touches down in Chryse Planitia at 11:53 UTC.", "Mars", { gap: 0.05 }]
    ] },
  { id: "blueghost1", name: "Blue Ghost Mission 1", year: 2025, rocket: "falcon-9", spacecraft: "blue-ghost", destination: "moon", crew: 0,
    duration: "About 6.5 weeks to landing (January 15 to March 2, 2025)", site: null,
    journey: [
      ["A", "Launch", "January 15, 2025", "A Falcon 9 lifts off at 1:11 a.m. EST from Launch Complex 39A.", "Earth", { isLaunch: true }],
      ["C", "Landing in Mare Crisium", "March 2, 2025", "Blue Ghost lands at 3:34 a.m. EST.", "Moon", { gap: 0.05 }]
    ] },
  { id: "lro", name: "Lunar Reconnaissance Orbiter", year: 2009, rocket: "atlas-v-401", spacecraft: "lro", destination: "moon", crew: 0,
    duration: "5 days to lunar orbit, then years of mapping", site: null, replay: { type: "mission", id: "lro" } },
  { id: "hubble-only", hidden: true },
  { id: "jwst", name: "James Webb Space Telescope", year: 2021, rocket: "ariane-5", spacecraft: "jwst", destination: "l2", crew: 0,
    duration: "About a month to L2", site: null, replay: { type: "mission", id: "jwst" } },
  { id: "skylab", name: "Skylab", year: 1973, rocket: "saturn-v-skylab", spacecraft: "skylab", destination: "earth-orbit", crew: 0,
    duration: "In orbit 1973 to 1979", site: null, replay: { type: "mission", id: "skylab" } },
  { id: "zarya", name: "ISS: Zarya", year: 1998, rocket: "proton", spacecraft: "zarya", destination: "earth-orbit", crew: 0,
    duration: "Still in orbit as part of the ISS", site: null, replay: { type: "mission", id: "iss-start" } },
  { id: "voyager1", name: "Voyager 1", year: 1977, rocket: "titan-3e", spacecraft: "voyager", destination: "deep", crew: 0,
    duration: "Still operating, almost 50 years later", site: null, replay: { type: "spacecraft", id: "Voyager 1" } },
  { id: "pioneer10", name: "Pioneer 10", year: 1972, rocket: "atlas-centaur", spacecraft: "pioneer", destination: "jupiter", crew: 0,
    duration: "About 21 months to Jupiter", site: null, replay: { type: "mission", id: "pioneer10" } },
  { id: "pioneer-venus", name: "Pioneer Venus 2", year: 1978, rocket: "atlas-centaur", spacecraft: "pioneer-venus", destination: "venus", crew: 0,
    duration: "About four months", site: null,
    journey: [
      ["A", "Launch", "August 8, 1978", "An Atlas-Centaur launches Pioneer Venus 2, carrying one large probe, three small probes and a bus.", "Earth", { isLaunch: true }],
      ["C", "Probes enter Venus", "December 9, 1978", "All four probes enter the atmosphere of Venus, followed by the bus.", "Venus", { gap: 0.1 }]
    ] },
  { id: "new-horizons", name: "New Horizons", year: 2006, rocket: "atlas-v-551", spacecraft: "new-horizons", destination: "deep", crew: 0,
    duration: "9.5 years to Pluto", site: null, replay: { type: "mission", id: "new-horizons" } },
  { id: "cassini", name: "Cassini-Huygens", year: 1997, rocket: "titan-4b", spacecraft: "cassini", destination: "saturn", crew: 0,
    duration: "About seven years to Saturn, 13 years in orbit", site: null, replay: { type: "hardware", id: "cassini" } },
  { id: "galileo", name: "Galileo", year: 1989, rocket: "shuttle", spacecraft: "galileo", destination: "jupiter", crew: 0,
    duration: "About six years to Jupiter", site: null, replay: { type: "hardware", id: "galileo-probe" } },
  { id: "messenger", name: "MESSENGER", year: 2004, rocket: "delta-2-heavy", spacecraft: "messenger", destination: "mercury", crew: 0,
    duration: "About 6.5 years to orbit (August 3, 2004 to March 18, 2011)", site: null,
    journey: [
      ["A", "Launch", "August 3, 2004", "A Delta II Heavy launches MESSENGER from Cape Canaveral.", "Earth", { isLaunch: true }],
      ["C", "First spacecraft to orbit Mercury", "March 18, 2011", "MESSENGER fires its main engine and enters orbit around Mercury.", "Mercury", { gap: 0.3, action: "orbit" }],
      ["E", "Impact", "April 30, 2015", "Out of fuel, MESSENGER crashes onto Mercury at 3.912 km/s.", "Mercury", { gap: 0.03 }]
    ] },
  { id: "osiris-rex", name: "OSIRIS-REx", year: 2016, rocket: "atlas-v-411", spacecraft: "osiris-rex", destination: "asteroid", crew: 0,
    duration: "Seven years for the sample (2016 to 2023)", site: null, replay: { type: "mission", id: "osiris-rex" } },
  { id: "parker", name: "Parker Solar Probe", year: 2018, rocket: "delta-4-heavy", spacecraft: "parker", destination: "sun", crew: 0,
    duration: "Still circling the Sun", site: null, replay: { type: "spacecraft", id: "Parker Solar Probe" } }
].filter(function (t) { return !t.hidden; });

// Rockets offered in the simulator (their histories and specs come from data/catalog.js)
export const SIM_ROCKETS = [
  "saturn-v", "saturn-v-skylab", "titan-2", "titan-3e", "titan-4b", "atlas-centaur", "delta-2", "delta-2-heavy",
  "atlas-v-401", "atlas-v-411", "atlas-v-541", "atlas-v-551", "delta-4-heavy", "falcon-9", "sls", "proton",
  "ariane-5", "shuttle", "shuttle-sts31"
];

// Parts of each rocket for the Rocket Lab (from the verified specs in data/catalog.js)
export const ROCKET_PARTS = {
  "saturn-v": [["First stage", "S-IC, five F-1 engines"], ["Second stage", "S-II"], ["Third stage", "S-IVB"], ["Payload", "Apollo CSM and Lunar Module"]],
  "saturn-v-skylab": [["First stage", "S-IC, five F-1 engines"], ["Second stage", "S-II"], ["Payload", "Skylab, in place of the third stage"]],
  sls: [["Core stage", "Four RS-25 engines, more than 212 ft tall"], ["Boosters", "Two five-segment solid rocket boosters"], ["Upper stage", "ICPS"], ["Payload", "Orion with its launch abort tower"]],
  "ariane-5": [["Boosters", "Two solids (EAP), 1,300 t of thrust together"], ["Core stage", "Vulcain 2 engine"], ["Upper stage", "ESC-A with HM7B"]],
  "falcon-9": [["First stage", "Nine engines, lands to be reused"], ["Second stage", "One engine"], ["Fairing or Dragon", "On top"]],
  "titan-2": [["First stage", "Two-nozzle engine"], ["Second stage", "One engine"], ["Payload", "Gemini capsule"]],
  "delta-2": [["First stage", "Painted turquoise"], ["Solid motors", "Nine strap-on motors (7925)"], ["Second stage", "Under the fairing"]],
  shuttle: [["Boosters", "Two solid rocket boosters"], ["External tank", "Orange foam"], ["Orbiter", "Three main engines"]],
  "shuttle-sts31": [["Boosters", "Two solid rocket boosters"], ["External tank", "Orange foam"], ["Orbiter", "Discovery, three main engines"]]
};

export function templatesFor(filter) {
  return TEMPLATES.filter(function (t) {
    return (!filter.rocket || t.rocket === filter.rocket) &&
      (!filter.spacecraft || t.spacecraft === filter.spacecraft) &&
      (!filter.destination || t.destination === filter.destination);
  });
}
