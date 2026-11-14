// The Spacecraft & Hardware Explorer catalog.
// Each item is plain data. The Explorer page (js/explorer.js) reads it and never needs code changes to add items.
// The facts were checked against the linked sources in October 2026 (see docs/RESEARCH.md).
// Re-checked against the NSSDCA Master Catalog in November 2026; items marked nlc2: true were added then.
//
// How to add an item: copy an entry and change it. Fields:
//   id          unique, lowercase
//   name        shown on the card
//   category    one of the CATEGORY ids below
//   mission     mission name
//   launchDate  text, e.g. "September 5, 1977" (launchYear is worked out from it)
//   rocket      id of a rocket item in this catalog (the launch vehicle), or null
//   vehicle     the launch vehicle as text, used when there is no rocket item
//   destination where it went. region = the filter group (see REGIONS)
//   bodies      solar-system bodies this item is shown under (planet info panel links)
//   status      { label, text, asOf }   label = Operating, Completed, Ended, Retired, On the surface
//   description, background, purpose   text
//   specs       [[label, value], ...]   only verified values
//   timeline    [{ date, text }, ...]
//   related     ids of related items
//   sources     [{ label, url }]
//   model       { type: "model" | "rocket", key }   key in js/models.js or js/rockets.js
//   image       { label, url }          link to an official image page (opened in a new tab, not copied)
//   hardware    id in data/hardware.js: the profile's summary, timeline, status and sources are reused
//   spacecraft  name in data/spacecraft.js (Voyager 1, Voyager 2, Parker Solar Probe): same idea
//   replay      how to replay the mission: { type: "hardware" | "mission" | "spacecraft", id }
//   landing     hardware id with a close-up landing scene

export const CATEGORIES = [
  { id: "rockets", name: "Launch Vehicles & Rockets", short: "Rockets" },
  { id: "spacecraft", name: "Spacecraft", short: "Spacecraft" },
  { id: "telescopes", name: "Satellites & Space Telescopes", short: "Telescopes" },
  { id: "landers", name: "Landers, Rovers & Probes", short: "Landers & Rovers" },
  { id: "instruments", name: "Scientific Instruments", short: "Instruments" },
  { id: "stations", name: "Space Stations & Modules", short: "Stations" },
  { id: "capsules", name: "Return Capsules & Sample Return Systems", short: "Return Capsules" }
];

export const REGIONS = [
  "Earth orbit", "Sun–Earth L2", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn & Titan",
  "Asteroids & comets", "The Sun", "Outer solar system", "Launch site (Earth)"
];

export const MODEL_NOTE =
  "Representative model built in code from published shapes and sizes. It is not an official NASA 3D model, and details are simplified.";

const LSP = { label: "NASA LSP: primary launches archive", url: "https://www.nasa.gov/reference/lsp-primary-launches-archive/" };
const SATURN_V_NASM = { label: "Smithsonian NASM: Saturn V", url: "https://avpreservation.si.edu/object/nasm_A19790128000" };
const SKYLAB_HISTORY = { label: "NASA History: 50 years ago, the launch of Skylab", url: "https://www.nasa.gov/history/50-years-ago-the-launch-of-skylab-americas-first-space-station/" };
const ISS_HISTORY = { label: "NASA History: 25 years ago, space station assembly begins", url: "https://www.nasa.gov/history/25-years-ago-nasa-partners-begin-space-station-assembly/" };
const APOLLO11_RECOVERY = { label: "NASA: 50 years ago, Apollo 11 command module recovered", url: "https://www.nasa.gov/image-article/50-years-ago-today-apollo-11-command-module-recovered/" };
const GEMINI3 = { label: "NASA: Gemini III", url: "https://www.nasa.gov/mission/gemini-iii/" };
const STS31 = { label: "NASA: STS-31", url: "https://www.nasa.gov/mission/sts-31/" };
const HUBBLE_GYRO = { label: "NASA: Hubble restarts science in new pointing mode", url: "https://science.nasa.gov/missions/hubble/nasas-hubble-restarts-science-in-new-pointing-mode/" };
const WEBB_LAUNCH = { label: "NASA: Webb launch", url: "https://science.nasa.gov/mission/webb/launch/" };
const WEBB_TIMELINE = { label: "NASA: Webb mission timeline", url: "https://science.nasa.gov/mission/webb/webb-mission-timeline/" };
const WEBB_L2 = { label: "NASA Webb blog: arrival at L2 (Jan 24, 2022)", url: "https://blogs.nasa.gov/webb/2022/01/24/" };
const PIONEER10 = { label: "NASA Science: Pioneer 10", url: "https://science.nasa.gov/mission/pioneer-10/" };
const PIONEER11 = { label: "NASA Science: Pioneer 11", url: "https://science.nasa.gov/mission/pioneer-11/" };
const NEW_HORIZONS = { label: "NASA Science: New Horizons", url: "https://science.nasa.gov/mission/new-horizons/" };
const ARTEMIS1 = { label: "NASA: Artemis I mission timeline", url: "https://www.nasa.gov/reference/artemis-i-mission-timeline/" };
const SLS_FACTS = { label: "NASA: SLS fact sheet (PDF)", url: "https://www.nasa.gov/sites/default/files/atoms/files/sls_fact_sheet.pdf" };
const OSIRIS = { label: "NASA Science: OSIRIS-REx in depth", url: "https://science.nasa.gov/mission/osiris-rex/in-depth/" };
const STARDUST = { label: "JPL: Stardust comet dust resembles asteroid materials", url: "https://www.jpl.nasa.gov/news/stardust-comet-dust-resembles-asteroid-materials" };
const LRO_HISTORY = { label: "NASA History: 10 years ago, LRO and LCROSS launched", url: "https://www.nasa.gov/history/10-years-ago-lunar-reconnaissance-orbiter-and-lcross-launched/" };
const LRO_2024 = { label: "NASA: LRO spots China's Chang'e 6 (June 2024)", url: "https://www.nasa.gov/centers-and-facilities/goddard/nasas-lro-spots-chinas-change-6-spacecraft-on-lunar-far-side/" };
const MOXIE = { label: "NASA: MOXIE completes its Mars mission", url: "https://www.nasa.gov/missions/mars-2020-perseverance/perseverance-rover/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/" };
const VOYAGER_NOW = { label: "NASA Science: Where are Voyager 1 and 2 now?", url: "https://science.nasa.gov/mission/voyager/where-are-voyager-1-and-voyager-2-now/" };
const ARIANE5 = { label: "ESA: Ariane 5 ECA", url: "https://www.esa.int/Enabling_Support/Space_Transportation/Ariane/Ariane_5_ECA" };
const TITAN_HISTORY = { label: "U.S. Centennial of Flight: Titan", url: "https://centennialofflight.net/essay/SPACEFLIGHT/titan/SP11.htm" };
const PV_NSSDC = { label: "NASA NSSDC: Pioneer Venus", url: "https://nssdc.gsfc.nasa.gov/planetary/pioneer_venus.html" };
const DELTA2_LAST = { label: "ULA: final Delta II launch (ICESat-2)", url: "https://www.ulalaunch.com/about/news/2018/09/15/united-launch-alliance-successfully-launches-final-delta-ii-rocket-with-nasa-s-icesat-2" };

export const catalog = [
  // ================= Launch vehicles & rockets =================
  {
    id: "saturn-v", name: "Saturn V", category: "rockets", mission: "Apollo, Skylab",
    launchDate: "July 16, 1969 (Apollo 11)", destination: "Moon (Apollo)", region: "Launch site (Earth)", bodies: ["Earth", "Moon"],
    status: { label: "Retired", text: "Its final flight launched Skylab on May 14, 1973." },
    description: "The three-stage rocket that launched the Apollo crews to the Moon.",
    background: "Apollo 11 launched on a Saturn V from Launch Complex 39A, Kennedy Space Center, on July 16, 1969. The first stage burned out after about two and a half minutes, then the second and third stages took over.",
    purpose: "To send the Apollo command and service module and the lunar module toward the Moon.",
    specs: [["Length", "363 ft (about 111 m)"], ["Diameter", "33 ft (first and second stages)"], ["Stages", "S-IC, S-II, S-IVB"], ["First-stage engines", "Five F-1"]],
    timeline: [
      { date: "July 16, 1969", text: "Launches Apollo 11 from Pad 39A." },
      { date: "May 14, 1973", text: "Final flight: a two-stage Saturn V launches Skylab." }
    ],
    related: ["apollo11-lm", "apollo11-csm", "apollo11-cm", "saturn-v-skylab"],
    sources: [SATURN_V_NASM, SKYLAB_HISTORY],
    model: { type: "rocket", key: "saturn-v" }
  },
  {
    id: "saturn-v-skylab", name: "Saturn V (Skylab version)", category: "rockets", mission: "Skylab",
    launchDate: "May 14, 1973", destination: "Earth orbit", region: "Earth orbit", bodies: ["Earth"],
    status: { label: "Retired", text: "This was the last Saturn V ever flown." },
    description: "A two-stage Saturn V. The Skylab workshop rode where the third stage would normally be.",
    background: "Skylab launched from Pad 39A. About 63 seconds into the flight, its micrometeoroid shield tore off and one solar array was lost.",
    purpose: "To put America's first space station into orbit in one launch.",
    specs: [["Stages", "Two (S-IC and S-II)"], ["Payload", "Skylab Orbital Workshop"]],
    timeline: [{ date: "May 14, 1973", text: "Launches Skylab from Pad 39A." }],
    related: ["saturn-v", "skylab"],
    sources: [SKYLAB_HISTORY],
    model: { type: "rocket", key: "saturn-v-skylab" },
    replay: { type: "mission", id: "skylab" }
  },
  {
    id: "titan-2", name: "Titan II GLV", category: "rockets", mission: "Gemini",
    launchDate: "March 23, 1965 (Gemini III)", destination: "Earth orbit", region: "Earth orbit", bodies: ["Earth"],
    status: { label: "Retired", text: "Launched ten crewed Gemini missions in 1965 and 1966." },
    description: "A modified Titan II missile that launched NASA's two-person Gemini spacecraft.",
    background: "NASA ordered a modified version of the Titan II for Gemini. Ten crewed Gemini missions launched in 1965 and 1966 from Cape Canaveral.",
    purpose: "To put Gemini capsules into Earth orbit to practise the skills needed for Apollo.",
    specs: [["Stages", "Two"], ["Crewed launches", "Ten (1965–1966)"]],
    timeline: [{ date: "March 23, 1965", text: "Launches Gemini III, the first crewed Gemini, from Complex 19." }],
    related: ["gemini3"],
    sources: [TITAN_HISTORY, GEMINI3],
    model: { type: "rocket", key: "titan-2" },
    replay: { type: "mission", id: "gemini3" }
  },
  {
    id: "titan-3e", name: "Titan IIIE-Centaur", category: "rockets", mission: "Viking, Voyager",
    launchDate: "August 20, 1975 (Viking 1)", destination: "Mars, outer planets", region: "Launch site (Earth)", bodies: ["Earth"],
    status: { label: "Retired", text: "Launched Viking 1 and 2 and both Voyagers." },
    description: "A Titan core with two big solid boosters and a Centaur upper stage under a long shroud.",
    background: "Viking 1 launched on a Titan IIIE-Centaur from Launch Complex 41 on August 20, 1975. Voyager 2 and Voyager 1 followed from the same pad in 1977.",
    purpose: "To send heavy spacecraft to Mars and the outer planets.",
    specs: [["Strap-on boosters", "Two solid rocket motors"], ["Upper stage", "Centaur"]],
    timeline: [
      { date: "August 20, 1975", text: "Launches Viking 1." },
      { date: "August 20, 1977", text: "Launches Voyager 2." },
      { date: "September 5, 1977", text: "Launches Voyager 1." }
    ],
    related: ["voyager1", "voyager2", "viking1"],
    sources: [{ label: "NASA Science: Voyager 1", url: "https://science.nasa.gov/mission/voyager1" }],
    model: { type: "rocket", key: "titan-3e" }
  },
  {
    id: "titan-4b", name: "Titan IVB-Centaur", category: "rockets", mission: "Cassini-Huygens",
    launchDate: "October 15, 1997 (Cassini)", destination: "Saturn", region: "Launch site (Earth)", bodies: ["Earth"],
    status: { label: "Retired", text: "Launched Cassini-Huygens toward Saturn." },
    description: "A Titan core with two long solid boosters and a 5 m fairing over the Centaur and the spacecraft.",
    background: "Cassini, with ESA's Huygens probe attached, launched from Cape Canaveral on October 15, 1997.",
    purpose: "To launch one of the heaviest planetary spacecraft ever built.",
    specs: [["Upper stage", "Centaur"], ["Payload", "Cassini-Huygens"]],
    timeline: [{ date: "October 15, 1997", text: "Launches Cassini-Huygens." }],
    related: ["cassini", "huygens"],
    sources: [LSP],
    model: { type: "rocket", key: "titan-4b" }
  },
  {
    id: "atlas-centaur", name: "Atlas-Centaur", category: "rockets", mission: "Surveyor, Pioneer, Pioneer Venus",
    launchDate: "May 30, 1966 (Surveyor 1)", destination: "Moon, Jupiter, Saturn, Venus", region: "Launch site (Earth)", bodies: ["Earth"],
    status: { label: "Retired", text: "Launched Surveyor 1, Pioneer 10 (AC-27), Pioneer 11 (AC-30) and both Pioneer Venus spacecraft." },
    description: "A thin stainless-steel Atlas booster with a Centaur upper stage, one of the first rockets to use liquid hydrogen.",
    background: "Pioneer 10 launched on Atlas-Centaur AC-27 on March 2, 1972, and Pioneer 11 on AC-30 from Launch Complex 36B in April 1973.",
    purpose: "To send robotic explorers to the Moon and the planets.",
    specs: [["Upper stage", "Centaur"], ["Notable vehicles", "AC-27 (Pioneer 10), AC-30 (Pioneer 11)"]],
    timeline: [
      { date: "May 30, 1966", text: "Launches Surveyor 1 to the Moon." },
      { date: "March 2, 1972", text: "Launches Pioneer 10 (01:49 UT)." },
      { date: "April 6, 1973 (UT)", text: "Launches Pioneer 11." },
      { date: "May 20 and August 8, 1978", text: "Launches Pioneer Venus 1 and 2." }
    ],
    related: ["pioneer10", "pioneer11", "surveyor1", "pv-large"],
    sources: [PIONEER10, PIONEER11, PV_NSSDC],
    model: { type: "rocket", key: "atlas-centaur" }
  },
  {
    id: "delta-2", name: "Delta II", category: "rockets", mission: "Pathfinder, Stardust, NEAR, Spirit, Opportunity, Phoenix, Dawn",
    launchDate: "December 4, 1996 (Mars Pathfinder)", destination: "Mars, comets, asteroids", region: "Launch site (Earth)", bodies: ["Earth"],
    status: { label: "Retired", text: "The last Delta II launched ICESat-2 on September 15, 2018." },
    description: "A slim, turquoise-painted rocket ringed by nine white solid motors. It launched many of NASA's Mars missions.",
    background: "NASA's Launch Services Program lists Delta II launches of NEAR (February 17, 1996), Stardust (February 7, 1999), Spirit (June 10, 2003), Opportunity (July 7, 2003) and Phoenix (7925 version).",
    purpose: "A reliable, medium-sized rocket for science missions.",
    specs: [["Strap-on motors", "Nine (7925 version)"], ["Final flight", "September 15, 2018"]],
    timeline: [
      { date: "December 4, 1996", text: "Launches Mars Pathfinder." },
      { date: "February 17, 1996", text: "A Delta 7925-8 launches NEAR Shoemaker." },
      { date: "February 7, 1999", text: "Launches Stardust." },
      { date: "June 10 and July 7, 2003", text: "Launches Spirit and Opportunity." },
      { date: "September 27, 2007", text: "A Delta II Heavy 7925-H launches Dawn." },
      { date: "September 15, 2018", text: "Final flight." }
    ],
    // NLC-2: NEAR Shoemaker and Dawn added to related list.
    related: ["pathfinder", "stardust", "near-shoemaker", "spirit", "opportunity", "phoenix", "dawn", "delta-2-heavy"],
    sources: [LSP, DELTA2_LAST],
    model: { type: "rocket", key: "delta-2" }
  },
  {
    id: "delta-2-heavy", name: "Delta II Heavy", category: "rockets", mission: "MESSENGER",
    launchDate: "August 3, 2004", destination: "Mercury", region: "Launch site (Earth)", bodies: ["Earth"],
    status: { label: "Retired", text: "Retired with the Delta II family in 2018." },
    description: "A Delta II with larger strap-on solid motors for heavier spacecraft.",
    background: "MESSENGER launched on a Delta II Heavy on August 3, 2004.",
    purpose: "Extra performance for MESSENGER's long trip to Mercury.",
    specs: [["Strap-on motors", "Nine, larger than on the 7925"]],
    timeline: [{ date: "August 3, 2004", text: "Launches MESSENGER." }],
    related: ["messenger", "delta-2"],
    sources: [LSP],
    model: { type: "rocket", key: "delta-2-heavy" }
  },
  {
    id: "atlas-v-401", name: "Atlas V 401", category: "rockets", mission: "LRO and LCROSS",
    launchDate: "June 18, 2009", destination: "Moon", region: "Launch site (Earth)", bodies: ["Earth", "Moon"],
    status: { label: "Flown", text: "This configuration has no solid boosters. The Atlas V's current flight status was not checked." },
    description: "The plainest Atlas V: a 4 m fairing, no solid boosters, one Centaur engine.",
    background: "LRO and LCROSS launched together on an Atlas V 401 in June 2009.",
    purpose: "To launch medium-weight spacecraft.",
    specs: [["Fairing", "4 m"], ["Solid boosters", "None"], ["Centaur engines", "One"]],
    timeline: [{ date: "June 18, 2009", text: "Launches LRO and LCROSS." }],
    related: ["lro", "lcross"],
    sources: [LSP, LRO_HISTORY],
    model: { type: "rocket", key: "atlas-v-401" }
  },
  {
    id: "atlas-v-411", name: "Atlas V 411", category: "rockets", mission: "OSIRIS-REx",
    launchDate: "September 8, 2016", destination: "Asteroid Bennu", region: "Launch site (Earth)", bodies: ["Earth"],
    status: { label: "Flown", text: "One solid booster makes this version lopsided. The Atlas V's current flight status was not checked." },
    description: "An Atlas V with a 4 m fairing and a single solid booster on one side.",
    background: "OSIRIS-REx launched on an Atlas V 411 on September 8, 2016.",
    purpose: "To send OSIRIS-REx toward asteroid Bennu.",
    specs: [["Fairing", "4 m"], ["Solid boosters", "One"]],
    timeline: [{ date: "September 8, 2016", text: "Launches OSIRIS-REx." }],
    related: ["osiris-rex"],
    sources: [LSP, OSIRIS],
    model: { type: "rocket", key: "atlas-v-411" }
  },
  {
    id: "atlas-v-541", name: "Atlas V 541", category: "rockets", mission: "Curiosity, Perseverance",
    launchDate: "November 26, 2011 (Curiosity)", destination: "Mars", region: "Launch site (Earth)", bodies: ["Earth", "Mars"],
    status: { label: "Flown", text: "Launched both of NASA's car-sized Mars rovers." },
    description: "An Atlas V with a 5 m fairing and four solid boosters.",
    background: "Curiosity launched on November 26, 2011, and Perseverance on July 30, 2020, both on Atlas V 541 rockets.",
    purpose: "To launch the heavy Mars Science Laboratory and Mars 2020 spacecraft.",
    specs: [["Fairing", "5 m"], ["Solid boosters", "Four"], ["Centaur engines", "One"]],
    timeline: [
      { date: "November 26, 2011", text: "Launches Curiosity." },
      { date: "July 30, 2020", text: "Launches Perseverance." }
    ],
    related: ["curiosity", "perseverance"],
    sources: [LSP],
    model: { type: "rocket", key: "atlas-v-541" }
  },
  {
    id: "atlas-v-551", name: "Atlas V 551", category: "rockets", mission: "New Horizons",
    launchDate: "January 19, 2006", destination: "Pluto", region: "Launch site (Earth)", bodies: ["Earth"],
    status: { label: "Flown", text: "The Atlas V version with the most solid boosters." },
    description: "An Atlas V with a 5 m fairing and five solid boosters.",
    background: "New Horizons launched from Launch Complex 41 on January 19, 2006.",
    purpose: "To give New Horizons enough speed to reach Pluto.",
    specs: [["Fairing", "5 m"], ["Solid boosters", "Five"]],
    timeline: [{ date: "January 19, 2006", text: "Launches New Horizons." }],
    related: ["new-horizons"],
    sources: [LSP, NEW_HORIZONS],
    model: { type: "rocket", key: "atlas-v-551" }
  },
  {
    id: "delta-4-heavy", name: "Delta IV Heavy", category: "rockets", mission: "Parker Solar Probe",
    launchDate: "August 12, 2018", destination: "The Sun", region: "Launch site (Earth)", bodies: ["Earth", "Sun"],
    status: { label: "Retired", text: "The final Delta IV Heavy launched in April 2024." },
    description: "Three orange common cores side by side. For Parker it carried an extra Star 48BV third stage.",
    background: "Parker Solar Probe launched at 3:31 a.m. EDT from Space Launch Complex 37.",
    purpose: "Reaching the Sun takes far more energy than reaching Mars, so a very powerful rocket was needed.",
    specs: [["Cores", "Three"], ["Extra stage (Parker)", "Star 48BV"]],
    timeline: [{ date: "August 12, 2018", text: "Launches Parker Solar Probe." }],
    related: ["parker"],
    sources: [LSP, { label: "ULA: final Delta IV Heavy launch", url: "https://newsroom.ulalaunch.com/releases/marking-the-end-of-an-era-united-launch-alliance-successfully-launches-final-delta-iv-heavy-rocket" }],
    model: { type: "rocket", key: "delta-4-heavy" }
  },
  {
    id: "falcon-9", name: "Falcon 9", category: "rockets", mission: "Blue Ghost Mission 1, DART",
    launchDate: "January 15, 2025 (Blue Ghost Mission 1)", destination: "Moon", region: "Launch site (Earth)", bodies: ["Earth", "Moon"],
    status: { label: "Active", text: "SpaceX's reusable rocket. It launched Blue Ghost Mission 1 and NASA's DART." },
    description: "A tall, slim, white two-stage rocket with nine engines, grid fins and landing legs so the first stage can land again.",
    background: "Blue Ghost Mission 1 launched at 1:11 a.m. EST on January 15, 2025 from Launch Complex 39A.",
    purpose: "Commercial launches, including NASA science and lunar delivery missions.",
    specs: [["First-stage engines", "Nine"], ["Reusable", "First stage lands back"]],
    timeline: [{ date: "January 15, 2025", text: "Launches Blue Ghost Mission 1." }],
    related: ["blueghost1"],
    sources: [LSP],
    model: { type: "rocket", key: "falcon-9" }
  },
  {
    id: "sls", name: "Space Launch System (Block 1)", category: "rockets", mission: "Artemis I",
    launchDate: "November 16, 2022", destination: "Moon", region: "Launch site (Earth)", bodies: ["Earth", "Moon"],
    status: { label: "Active", text: "NASA's Moon rocket for the Artemis program." },
    description: "An orange core stage with four RS-25 engines, two white five-segment solid boosters, and Orion on top.",
    background: "Artemis I lifted off at 1:47 a.m. EST from Launch Complex 39B. The upper stage (ICPS) separated about two hours after launch.",
    purpose: "To send Orion to the Moon.",
    specs: [["Height (Block 1)", "322 ft"], ["Core stage", "More than 212 ft tall, 27.6 ft wide"], ["Core engines", "Four RS-25"], ["Boosters", "Two five-segment solids"], ["Upper stage", "ICPS"], ["Maximum thrust", "8.8 million lbf"]],
    timeline: [{ date: "November 16, 2022", text: "Launches Artemis I." }],
    related: ["orion", "orion-cm"],
    sources: [SLS_FACTS, ARTEMIS1],
    model: { type: "rocket", key: "sls" },
    replay: { type: "mission", id: "artemis1" }
  },
  {
    id: "proton", name: "Proton-K", category: "rockets", mission: "Zarya (ISS)",
    launchDate: "November 20, 1998 (Zarya)", destination: "Earth orbit", region: "Earth orbit", bodies: ["Earth"],
    status: { label: "Flown", text: "Russian heavy rocket. It launched the first module of the International Space Station." },
    description: "A Russian heavy rocket with six outer fuel tanks around its first stage.",
    background: "Zarya launched from Baikonur on a Proton on November 20, 1998.",
    purpose: "To launch the first ISS module.",
    specs: [["First stage", "Central tank ringed by six outer tanks, six engines"], ["Payload here", "Zarya"]],
    timeline: [{ date: "November 20, 1998", text: "Launches Zarya from Baikonur." }],
    related: ["zarya", "unity"],
    sources: [ISS_HISTORY],
    model: { type: "rocket", key: "proton" },
    replay: { type: "mission", id: "iss-start" }
  },
  {
    id: "ariane-5", name: "Ariane 5 ECA", category: "rockets", mission: "James Webb Space Telescope",
    launchDate: "December 25, 2021 (Webb)", destination: "Sun–Earth L2", region: "Launch site (Earth)", bodies: ["Earth"],
    status: { label: "Retired", text: "ESA's heavy launcher. It launched Webb from Kourou, French Guiana." },
    description: "A wide white cryogenic core and two tall solid boosters (an ESA rocket).",
    background: "Webb launched at 7:20 a.m. ET (12:20 UTC) from ELA-3 at Europe's Spaceport in Kourou.",
    purpose: "To launch Webb toward the Sun–Earth L2 point.",
    specs: [["Height", "Up to 53 m"], ["Diameter", "Up to 5.4 m"], ["Boosters", "Two solids (EAP), 1,300 t of thrust together"], ["Core engine", "Vulcain 2"], ["Upper stage", "ESC-A with HM7B"]],
    timeline: [{ date: "December 25, 2021", text: "Launches the James Webb Space Telescope." }],
    related: ["jwst"],
    sources: [ARIANE5, WEBB_LAUNCH, { label: "DLR: Ariane 5 (completed programme)", url: "https://www.dlr.de/en/ar/topics-missions/space-technologies/space-access/ariane-5-european-access-to-space" }],
    model: { type: "rocket", key: "ariane-5" },
    replay: { type: "mission", id: "jwst" }
  },
  {
    id: "shuttle", name: "Space Shuttle", category: "rockets", mission: "STS-31, STS-34, STS-88",
    launchDate: "October 18, 1989 (Galileo, STS-34)", destination: "Earth orbit", region: "Earth orbit", bodies: ["Earth"],
    status: { label: "Retired", text: "The Space Shuttle program has ended." },
    description: "A winged orbiter riding on an orange external tank with two solid rocket boosters.",
    background: "Atlantis (STS-34) launched Galileo, Discovery (STS-31) deployed Hubble, and Endeavour (STS-88) carried Unity, the first US station module.",
    purpose: "Crewed launches that could carry and deploy large payloads.",
    specs: [["Boosters", "Two solid rocket boosters"], ["Main engines", "Three, on the orbiter"]],
    timeline: [
      { date: "October 18, 1989", text: "Atlantis launches Galileo (STS-34)." },
      { date: "April 24, 1990", text: "Discovery launches Hubble (STS-31)." },
      { date: "December 4, 1998", text: "Endeavour launches Unity (STS-88)." }
    ],
    related: ["hubble", "galileo", "unity"],
    sources: [STS31, ISS_HISTORY],
    model: { type: "rocket", key: "shuttle-sts31" }
  },

  // ================= Spacecraft =================
  {
    id: "voyager1", name: "Voyager 1", category: "spacecraft", mission: "Voyager", spacecraft: "Voyager 1",
    launchDate: "September 5, 1977", rocket: "titan-3e", destination: "Jupiter, Saturn, interstellar space", region: "Outer solar system",
    bodies: ["Jupiter", "Saturn", "Voyager 1"],
    status: { label: "Operating", text: "In interstellar space. The magnetometer and plasma wave instrument are still on.", asOf: "NASA page updated October 15, 2026" },
    specs: [["Instruments still on", "MAG, PWS"], ["Power", "Radioisotope generators"]],
    related: ["voyager2", "pioneer10", "titan-3e"],
    sources: [VOYAGER_NOW],
    model: { type: "model", key: "voyager" },
    image: { label: "NASA: Voyager mission page", url: "https://science.nasa.gov/mission/voyager/" },
    replay: { type: "spacecraft", id: "Voyager 1" }
  },
  {
    id: "voyager2", name: "Voyager 2", category: "spacecraft", mission: "Voyager", spacecraft: "Voyager 2",
    launchDate: "August 20, 1977", rocket: "titan-3e", destination: "Jupiter, Saturn, Uranus, Neptune, interstellar space", region: "Outer solar system",
    bodies: ["Jupiter", "Saturn", "Uranus", "Neptune", "Voyager 2"],
    status: { label: "Operating", text: "In interstellar space. The cosmic ray, magnetometer and plasma wave instruments are still on.", asOf: "NASA page updated October 15, 2026" },
    specs: [["Instruments still on", "CRS, MAG, PWS"]],
    related: ["voyager1", "titan-3e"],
    sources: [VOYAGER_NOW],
    model: { type: "model", key: "voyager" },
    image: { label: "NASA: Voyager mission page", url: "https://science.nasa.gov/mission/voyager/" },
    replay: { type: "spacecraft", id: "Voyager 2" }
  },
  {
    id: "pioneer10", name: "Pioneer 10", category: "spacecraft", mission: "Pioneer 10",
    launchDate: "March 2, 1972", rocket: "atlas-centaur", destination: "Jupiter, then out of the solar system", region: "Outer solar system",
    bodies: ["Jupiter"],
    status: { label: "Ended", text: "The last signal arrived on January 23, 2003, from about 12.23 billion km away. A final contact attempt on March 4, 2006 got no answer." },
    description: "The first spacecraft to cross the asteroid belt and the first to fly past Jupiter.",
    background: "Pioneer 10 launched on Atlas-Centaur AC-27. It carries a plaque with a message about its makers.",
    purpose: "To explore the asteroid belt and Jupiter's environment.",
    specs: [["Launch", "March 2, 1972, 01:49:04 UT"], ["Jupiter closest approach", "130,354 km"], ["Message", "Pioneer plaque"]],
    timeline: [
      { date: "March 2, 1972", text: "Launch on Atlas-Centaur AC-27." },
      { date: "July 15, 1972", text: "Enters the asteroid belt, the first spacecraft to do so." },
      { date: "December 4, 1973", text: "First flyby of Jupiter." },
      { date: "January 23, 2003", text: "Last signal received." }
    ],
    related: ["pioneer11", "voyager1", "atlas-centaur"],
    sources: [PIONEER10],
    model: { type: "model", key: "pioneer" },
    image: { label: "NASA Science: Pioneer 10 page", url: "https://science.nasa.gov/mission/pioneer-10/" },
    replay: { type: "mission", id: "pioneer10" }
  },
  {
    id: "pioneer11", name: "Pioneer 11", category: "spacecraft", mission: "Pioneer 11",
    launchDate: "April 6, 1973 (UT)", rocket: "atlas-centaur", destination: "Jupiter, Saturn", region: "Outer solar system",
    bodies: ["Jupiter", "Saturn"],
    status: { label: "Ended", text: "Routine contact ended on September 30, 1995. The last engineering data came on November 24, 1995." },
    description: "The first spacecraft to fly past Saturn.",
    background: "Pioneer 11 launched on Atlas-Centaur AC-30 from Launch Complex 36B (April 5 local time).",
    purpose: "To study Jupiter up close, then use Jupiter's gravity to reach Saturn.",
    specs: [["Jupiter closest approach", "42,500 km"], ["Saturn closest approach", "20,900 km"]],
    timeline: [
      { date: "April 6, 1973", text: "Launch (02:11 UT)." },
      { date: "December 3, 1974", text: "Jupiter flyby." },
      { date: "September 1, 1979", text: "First flyby of Saturn." },
      { date: "November 24, 1995", text: "Last data received." }
    ],
    related: ["pioneer10", "cassini", "atlas-centaur"],
    sources: [PIONEER11],
    model: { type: "model", key: "pioneer" },
    image: { label: "NASA Science: Pioneer 11 page", url: "https://science.nasa.gov/mission/pioneer-11/" },
    replay: { type: "mission", id: "pioneer11" }
  },
  {
    id: "new-horizons", name: "New Horizons", category: "spacecraft", mission: "New Horizons",
    launchDate: "January 19, 2006", rocket: "atlas-v-551", destination: "Pluto, Arrokoth, Kuiper Belt", region: "Outer solar system",
    bodies: ["Jupiter", "Neptune"],
    status: { label: "Operating", text: "In an extended mission in the Kuiper Belt, gathering heliophysics data." },
    description: "The first spacecraft to explore Pluto, and later Arrokoth, the most distant object ever explored up close.",
    background: "New Horizons launched from Launch Complex 41 and used a Jupiter flyby on February 28, 2007 to speed up.",
    purpose: "To make the first close-up study of Pluto and its moons, then explore the Kuiper Belt.",
    specs: [["Pluto closest approach", "About 7,800 km (July 14, 2015)"], ["Arrokoth closest approach", "About 3,500 km (January 1, 2019)"], ["Power", "One radioisotope generator (about 250 W at launch)"]],
    timeline: [
      { date: "January 19, 2006", text: "Launch on an Atlas V 551." },
      { date: "February 28, 2007", text: "Jupiter gravity assist." },
      { date: "July 14, 2015", text: "Pluto flyby." },
      { date: "January 1, 2019", text: "Arrokoth flyby." }
    ],
    related: ["atlas-v-551", "pioneer10", "voyager1"],
    sources: [NEW_HORIZONS],
    model: { type: "model", key: "new-horizons" },
    image: { label: "NASA Science: New Horizons page", url: "https://science.nasa.gov/mission/new-horizons/" },
    replay: { type: "mission", id: "new-horizons" }
  },
  {
    id: "parker", name: "Parker Solar Probe", category: "spacecraft", mission: "Parker Solar Probe", spacecraft: "Parker Solar Probe",
    launchDate: "August 12, 2018", rocket: "delta-4-heavy", destination: "The Sun", region: "The Sun", bodies: ["Sun", "Parker Solar Probe"],
    status: { label: "Operating", text: "See the Parker profile in the solar system for its latest reported status." },
    related: ["delta-4-heavy"],
    model: { type: "model", key: "parker" },
    replay: { type: "spacecraft", id: "Parker Solar Probe" }
  },
  {
    id: "apollo11-csm", name: "Apollo 11 CSM Columbia", category: "spacecraft", mission: "Apollo 11",
    launchDate: "July 16, 1969", rocket: "saturn-v", destination: "Lunar orbit", region: "Moon", bodies: ["Moon", "Earth"],
    status: { label: "Completed", text: "The command module brought the crew home on July 24, 1969." },
    description: "The command and service module. Michael Collins flew it in lunar orbit while Eagle landed.",
    background: "Columbia carried all three astronauts to lunar orbit and back. Only the command module returned to Earth: the service module was released before re-entry.",
    purpose: "To carry the crew to the Moon and home again.",
    specs: [["Parts", "Command module and service module"], ["Pilot in lunar orbit", "Michael Collins"]],
    timeline: [
      { date: "July 16, 1969", text: "Launch on a Saturn V." },
      { date: "July 19, 1969", text: "Enters lunar orbit." },
      { date: "July 24, 1969", text: "The command module splashes down." }
    ],
    related: ["apollo11-lm", "apollo11-cm", "saturn-v"],
    sources: [APOLLO11_RECOVERY],
    model: { type: "model", key: "apollo-csm" },
    replay: { type: "hardware", id: "apollo11" }
  },
  {
    id: "orion", name: "Orion (Artemis I)", category: "spacecraft", mission: "Artemis I",
    launchDate: "November 16, 2022", rocket: "sls", destination: "Distant retrograde orbit around the Moon", region: "Moon", bodies: ["Moon", "Earth"],
    status: { label: "Completed", text: "The uncrewed test flight lasted 25 days, 10 hours and 53 minutes, and travelled 1.4 million miles." },
    description: "NASA's crew spacecraft: a crew module on the European Service Module, with four solar array wings.",
    background: "Orion flew past the Moon at about 81 miles on November 21, 2022, entered a distant retrograde orbit on November 25, and made a return flyby at 80.6 miles on December 5.",
    purpose: "An uncrewed test of Orion and SLS before crewed Artemis flights.",
    specs: [["Mission length", "25 d 10 h 53 m"], ["Distance", "1.4 million miles"], ["Closest to the Moon", "About 81 miles (outbound flyby)"]],
    timeline: [
      { date: "November 16, 2022", text: "Launch on SLS from Launch Complex 39B." },
      { date: "November 21, 2022", text: "Outbound powered flyby of the Moon." },
      { date: "November 25, 2022", text: "Enters distant retrograde orbit." },
      { date: "December 5, 2022", text: "Return powered flyby." },
      { date: "December 11, 2022", text: "Splashdown in the Pacific Ocean." }
    ],
    related: ["sls", "orion-cm"],
    sources: [ARTEMIS1],
    model: { type: "model", key: "orion" },
    replay: { type: "mission", id: "artemis1" }
  },
  {
    id: "osiris-rex", name: "OSIRIS-REx", category: "spacecraft", mission: "OSIRIS-REx / OSIRIS-APEX",
    launchDate: "September 8, 2016", rocket: "atlas-v-411", destination: "Asteroid Bennu", region: "Asteroids & comets", bodies: ["Earth"],
    status: { label: "Operating", text: "Renamed OSIRIS-APEX. It is on its way to asteroid Apophis, due to arrive in 2029." },
    description: "The first US mission to collect a sample from an asteroid and return it to Earth.",
    background: "OSIRIS-REx reached Bennu on December 3, 2018, touched the surface to collect a sample on October 20, 2020, and left on May 10, 2021.",
    purpose: "To return a sample of a carbon-rich asteroid. At least 60 g was required, and more was collected.",
    specs: [["Sampling arm", "TAGSAM"], ["Sample requirement", "At least 60 g"]],
    timeline: [
      { date: "September 8, 2016", text: "Launch on an Atlas V 411." },
      { date: "September 22, 2017", text: "Earth flyby." },
      { date: "December 3, 2018", text: "Arrives at Bennu." },
      { date: "October 20, 2020", text: "Touch-and-go sample collection (TAG)." },
      { date: "May 10, 2021", text: "Leaves Bennu." },
      { date: "September 24, 2023", text: "The sample capsule lands in Utah." }
    ],
    related: ["osiris-src", "atlas-v-411"],
    sources: [OSIRIS],
    model: { type: "model", key: "osiris-rex" },
    replay: { type: "mission", id: "osiris-rex" }
  },
  {
    id: "stardust", name: "Stardust", category: "spacecraft", mission: "Stardust / Stardust-NExT",
    launchDate: "February 7, 1999", rocket: "delta-2", destination: "Comet Wild 2", region: "Asteroids & comets", bodies: ["Earth"],
    status: { label: "Completed", text: "After its capsule landed, the spacecraft stayed in orbit around the Sun and flew past comet Tempel 1 on February 14, 2011." },
    description: "Flew through the dust of comet Wild 2 and caught particles in a lightweight material called aerogel.",
    background: "Stardust flew past comet Wild 2 in January 2004. Its capsule brought comet and interstellar dust back to Earth.",
    purpose: "To return comet dust to Earth for laboratory study.",
    specs: [["Collector", "Aerogel, on a tennis-racket-like grid"]],
    timeline: [
      { date: "February 7, 1999", text: "Launch on a Delta II." },
      { date: "January 2004", text: "Flies past comet Wild 2 and collects dust." },
      { date: "January 15, 2006", text: "The sample capsule lands in Utah." },
      { date: "February 14, 2011", text: "Flies past comet Tempel 1." }
    ],
    related: ["stardust-src", "delta-2"],
    sources: [STARDUST, LSP],
    model: { type: "model", key: "stardust" },
    replay: { type: "mission", id: "stardust" }
  },
  // ===== NLC-2 (new — safe to remove on request): Dawn and NEAR Shoemaker =====
  // Facts verified against the NSSDCA Master Catalog on November 14, 2026 (see docs/RESEARCH.md).
  {
    id: "dawn", name: "Dawn", category: "spacecraft", mission: "Dawn", nlc2: true,
    launchDate: "September 27, 2007", rocket: "delta-2",
    destination: "Asteroid belt: Vesta, then Ceres", region: "Asteroids & comets", bodies: ["Earth"],
    status: { label: "Ended", text: "Dawn stayed in orbit around Ceres after the mission. Communications ended on October 31, 2018, and the silent spacecraft keeps circling Ceres: its final orbit is stable, with a lifetime of several hundred years.", asOf: "NASA NSSDCA catalog, checked November 2026." },
    description: "The first spacecraft to orbit two worlds beyond Earth: it mapped the giant asteroids Vesta and Ceres, driven by ion engines.",
    background: "Dawn launched on a Delta II Heavy from Cape Canaveral at 11:34 UT. It used its ion engines to spiral into orbit around Vesta on July 16, 2011, leave for Ceres on September 5, 2012, and orbit the dwarf planet Ceres from March 6, 2015.",
    purpose: "To characterize the internal structure, density, shape, size, composition and mass of Vesta and Ceres, and understand the role of water in asteroid evolution.",
    specs: [["Dry mass", "747 kg"], ["Xenon for the ion engines", "425 kg"], ["Hydrazine", "45.6 kg"], ["Solar array span", "19.7 m tip-to-tip"], ["Vesta arrival", "July 16, 2011"], ["Ceres arrival", "March 6, 2015"]],
    timeline: [
      { date: "September 27, 2007", text: "Launch on a Delta II Heavy from Cape Canaveral." },
      { date: "February 18, 2009", text: "Mars gravity assist, flying within 542 km of the surface." },
      { date: "July 16, 2011", text: "Enters orbit around Vesta." },
      { date: "September 5, 2012", text: "Leaves Vesta for Ceres." },
      { date: "March 6, 2015", text: "Enters orbit around Ceres." },
      { date: "June 2016", text: "Primary mission ends." },
      { date: "October 31, 2018", text: "Communications end. Dawn remains in orbit around Ceres." }
    ],
    related: ["delta-2", "stardust", "near-shoemaker", "osiris-rex"],
    sources: [{ label: "NASA NSSDCA: Dawn", url: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2007-043A" }],
    model: { type: "model", key: "dawn" },
    replay: { type: "mission", id: "dawn" }
  },
  {
    id: "near-shoemaker", name: "NEAR Shoemaker", category: "spacecraft", mission: "NEAR Shoemaker", nlc2: true,
    launchDate: "February 17, 1996", rocket: "delta-2",
    destination: "Asteroid 433 Eros", region: "Asteroids & comets", bodies: ["Earth"],
    status: { label: "Ended", text: "The first spacecraft ever to orbit an asteroid and to touch down on one. It rests on the surface of 433 Eros, in the region called the saddle, since its touchdown on February 12, 2001.", asOf: "NASA NSSDCA catalog, checked November 2026." },
    description: "Renamed in honor of Gene Shoemaker: the first mission to orbit an asteroid, and the first to land on one.",
    background: "NEAR studied the near-Earth asteroid Eros from close orbit. It flew past asteroid Mathilde on June 27, 1997, swung past Earth on January 23, 1998, and orbited Eros from a 200 km circular orbit that was gradually lowered to 35 km.",
    purpose: "To return data on the bulk properties, composition, mineralogy, morphology, internal mass distribution and magnetic field of asteroid 433 Eros.",
    specs: [["Asteroid", "433 Eros, about 13 x 13 x 33 km"], ["Touchdown", "February 12, 2001, in the 'saddle' region"], ["Science payload", "56 kg"]],
    timeline: [
      { date: "February 17, 1996", text: "Launch on a Delta II from Cape Canaveral." },
      { date: "June 27, 1997", text: "Flies within 1,200 km of asteroid Mathilde." },
      { date: "January 23, 1998", text: "Earth gravity assist at 540 km." },
      { date: "February 14, 2000", text: "Enters orbit around Eros: the first spacecraft to orbit an asteroid." },
      { date: "February 12, 2001", text: "Touchdown in the saddle region of Eros, where it rests." }
    ],
    related: ["delta-2", "dawn", "osiris-rex"],
    sources: [{ label: "NASA NSSDCA: NEAR Shoemaker", url: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1996-008A" }],
    model: { type: "model", key: "near-shoemaker" },
    replay: { type: "mission", id: "near-shoemaker" }
  },
  // ===== end NLC-2 =====
  {
    id: "cassini", name: "Cassini", category: "spacecraft", mission: "Cassini-Huygens", hardware: "cassini",
    launchDate: "October 15, 1997", rocket: "titan-4b", destination: "Saturn", region: "Saturn & Titan", bodies: ["Saturn", "Titan"],
    status: { label: "Ended" },
    related: ["huygens", "titan-4b", "pioneer11"],
    model: { type: "model", key: "cassini" },
    replay: { type: "hardware", id: "cassini" }, landing: "cassini"
  },
  {
    id: "galileo", name: "Galileo orbiter", category: "spacecraft", mission: "Galileo", hardware: "galileo-probe",
    launchDate: "October 18, 1989", rocket: "shuttle", destination: "Jupiter", region: "Jupiter", bodies: ["Jupiter"],
    status: { label: "Ended", text: "The orbiter released the atmospheric probe on July 13, 1995, about 80 million km from Jupiter, then relayed its data." },
    description: "Galileo orbited Jupiter and carried the atmospheric probe there.",
    related: ["galileo-probe", "shuttle"],
    model: { type: "model", key: "galileo-orbiter" },
    replay: { type: "hardware", id: "galileo-probe" }
  },
  {
    id: "messenger", name: "MESSENGER", category: "spacecraft", mission: "MESSENGER", hardware: "messenger",
    launchDate: "August 3, 2004", rocket: "delta-2-heavy", destination: "Mercury", region: "Mercury", bodies: ["Mercury"],
    status: { label: "Ended" },
    related: ["delta-2-heavy"],
    model: { type: "model", key: "messenger" }
  },
  {
    id: "lcross", name: "LCROSS", category: "spacecraft", mission: "LCROSS", hardware: "lcross",
    launchDate: "June 18, 2009", rocket: "atlas-v-401", destination: "Moon (Cabeus crater)", region: "Moon", bodies: ["Moon"],
    status: { label: "Ended" },
    related: ["lro", "atlas-v-401"],
    model: { type: "model", key: "lcross" }, landing: "lcross"
  },

  // ================= Satellites & space telescopes =================
  {
    id: "hubble", name: "Hubble Space Telescope", category: "telescopes", mission: "STS-31 / Hubble",
    launchDate: "April 24, 1990", rocket: "shuttle", vehicle: "Space Shuttle Discovery (STS-31)", destination: "Low Earth orbit", region: "Earth orbit", bodies: ["Earth"],
    status: { label: "Operating", text: "Since June 2024 Hubble has run in one-gyro mode. NASA expects it to keep working through this decade and possibly into the next.", asOf: "NASA, 2024" },
    description: "A telescope in orbit above the atmosphere, launched by the Space Shuttle and serviced by astronauts.",
    background: "Discovery launched at 8:33:51 a.m. EDT on April 24, 1990. The crew (Shriver, Bolden, Hawley, McCandless and Sullivan) released Hubble the next day.",
    purpose: "To see the universe without the blur of Earth's atmosphere.",
    specs: [["Launch", "STS-31, Space Shuttle Discovery"], ["Deployed", "April 25, 1990"], ["Pointing mode", "One gyro (since June 2024)"]],
    timeline: [
      { date: "April 24, 1990", text: "Launch aboard Discovery." },
      { date: "April 25, 1990", text: "Released into orbit." },
      { date: "April 29, 1990", text: "Discovery lands, ending STS-31." },
      { date: "June 2024", text: "Science resumes in one-gyro mode." }
    ],
    related: ["shuttle", "jwst"],
    sources: [STS31, HUBBLE_GYRO],
    model: { type: "model", key: "hubble" },
    image: { label: "NASA: STS-31 mission page", url: "https://www.nasa.gov/mission/sts-31/" },
    replay: { type: "mission", id: "hubble" }
  },
  {
    id: "jwst", name: "James Webb Space Telescope", category: "telescopes", mission: "Webb (NASA, ESA, CSA)",
    launchDate: "December 25, 2021", rocket: "ariane-5", destination: "Sun–Earth L2, nearly 1 million miles from Earth", region: "Sun–Earth L2", bodies: ["Earth"],
    status: { label: "Operating", text: "Science operations began in July 2022 with the first images released on July 12." },
    description: "The largest space telescope, with a 6.6 m gold mirror and a tennis-court-sized sunshield.",
    background: "Webb was folded to fit inside its Ariane 5 fairing and unfolded in space: the sunshield was fully tensioned on January 4, 2022, and the mirror wings locked into place on January 8.",
    purpose: "To see the first galaxies, the birth of stars and planets, and the atmospheres of other worlds in infrared light.",
    specs: [["Primary mirror", "6.6 m, 18 segments"], ["Orbit", "Around Sun–Earth L2"], ["Arrived at L2", "January 24, 2022"]],
    timeline: [
      { date: "December 25, 2021", text: "Launch on an Ariane 5 from Kourou." },
      { date: "January 4, 2022", text: "Sunshield fully deployed." },
      { date: "January 8, 2022", text: "Mirror wings deployed." },
      { date: "January 24, 2022", text: "Arrives at L2." },
      { date: "July 12, 2022", text: "First full-color images released." }
    ],
    related: ["ariane-5", "hubble"],
    sources: [WEBB_LAUNCH, WEBB_TIMELINE, WEBB_L2],
    model: { type: "model", key: "jwst" },
    image: { label: "NASA: Webb launch page", url: "https://science.nasa.gov/mission/webb/launch/" },
    replay: { type: "mission", id: "jwst" }
  },
  {
    id: "lro", name: "Lunar Reconnaissance Orbiter", category: "telescopes", mission: "LRO",
    launchDate: "June 18, 2009", rocket: "atlas-v-401", destination: "Lunar orbit", region: "Moon", bodies: ["Moon"],
    status: { label: "Operating", text: "NASA reported LRO imaging China's Chang'e 6 lander in June 2024. Its 2026 status was not checked.", asOf: "June 2024" },
    description: "Maps the Moon in great detail. Its camera has photographed the Apollo landing sites.",
    background: "LRO launched together with LCROSS and entered lunar orbit on June 23, 2009.",
    purpose: "To map the Moon and find safe landing sites and resources for future missions.",
    specs: [["Instruments", "Seven: CRaTER, Diviner, LAMP, LEND, LOLA, LROC, Mini-RF"], ["Lunar orbit", "June 23, 2009"]],
    timeline: [
      { date: "June 18, 2009", text: "Launch with LCROSS." },
      { date: "June 23, 2009", text: "Enters lunar orbit." },
      { date: "June 2024", text: "Images the Chang'e 6 lander." }
    ],
    related: ["lcross", "atlas-v-401", "apollo11-lm"],
    sources: [LRO_HISTORY, LRO_2024],
    model: { type: "model", key: "lro" },
    replay: { type: "mission", id: "lro" }
  },

  // ================= Landers, rovers & probes =================
  {
    id: "apollo11-lm", name: "Apollo 11 Lunar Module Eagle", category: "landers", mission: "Apollo 11", hardware: "apollo11",
    launchDate: "July 16, 1969", rocket: "saturn-v", destination: "Moon, Sea of Tranquility", region: "Moon", bodies: ["Moon"],
    status: { label: "On the surface" },
    related: ["apollo11-csm", "apollo11-cm", "lrrr", "pse", "saturn-v"],
    model: { type: "model", key: "lunar-module" },
    replay: { type: "hardware", id: "apollo11" }, landing: "apollo11"
  },
  {
    id: "lrv", name: "Lunar Roving Vehicle (Apollo 15)", category: "landers", mission: "Apollo 15", hardware: "apollo15",
    launchDate: "July 26, 1971", rocket: "saturn-v", destination: "Moon, Hadley-Apennine", region: "Moon", bodies: ["Moon"],
    status: { label: "On the surface" },
    // NLC-2: card details filled in from the NSSDCA Apollo Lunar Roving Vehicle page (checked November 14, 2026).
    description: "An electric car the astronauts drove on the Moon. NASA built three, and all three are still parked where the astronauts left them.",
    background: "NASA sent a Lunar Roving Vehicle on the last three Apollo missions: Apollos 15, 16 and 17. The rover folded up inside the Lunar Module, and the astronauts unpacked it after landing. When they lifted off, they parked the rover a short way from the Lunar Module, so the last three rovers are still standing at their landing sites.",
    purpose: "To let the astronauts explore farther from the landing site and carry tools, cameras and rock samples.",
    specs: [["Rovers built", "3 (Apollos 15, 16, 17)"], ["Mass", "210 kg on the Moon"], ["Payload", "Up to 490 kg, including two astronauts"], ["Distance driven", "Apollo 15: 27.8 km, Apollo 16: 26.7 km, Apollo 17: 35.9 km"], ["Power", "36-volt batteries"]],
    related: ["saturn-v", "apollo11-lm", "alsep"],
    sources: [{ label: "NASA NSSDCA: Apollo Lunar Roving Vehicle", url: "https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html" }],
    model: { type: "model", key: "lrv" }, landing: "apollo15"
  },
  {
    id: "surveyor1", name: "Surveyor 1", category: "landers", mission: "Surveyor 1", hardware: "surveyor1",
    launchDate: "May 30, 1966", rocket: "atlas-centaur", destination: "Moon", region: "Moon", bodies: ["Moon"],
    status: { label: "On the surface" }, related: ["atlas-centaur"],
    model: { type: "model", key: "surveyor" }, landing: "surveyor1"
  },
  {
    id: "blueghost1", name: "Blue Ghost Mission 1", category: "landers", mission: "Blue Ghost Mission 1 (Firefly, NASA CLPS)", hardware: "blueghost1",
    launchDate: "January 15, 2025", rocket: "falcon-9", destination: "Moon, Mare Crisium", region: "Moon", bodies: ["Moon"],
    status: { label: "Completed" }, related: ["falcon-9"],
    model: { type: "model", key: "blue-ghost" }, landing: "blueghost1"
  },
  {
    id: "viking1", name: "Viking 1 lander", category: "landers", mission: "Viking 1", hardware: "viking1",
    launchDate: "August 20, 1975", rocket: "titan-3e", destination: "Mars, Chryse Planitia", region: "Mars", bodies: ["Mars"],
    status: { label: "On the surface" }, related: ["titan-3e"],
    model: { type: "model", key: "viking-lander" }, landing: "viking1"
  },
  {
    id: "pathfinder", name: "Mars Pathfinder & Sojourner", category: "landers", mission: "Mars Pathfinder", hardware: "pathfinder",
    launchDate: "December 4, 1996", rocket: "delta-2", destination: "Mars, Ares Vallis", region: "Mars", bodies: ["Mars"],
    status: { label: "On the surface" }, related: ["delta-2", "spirit"],
    model: { type: "model", key: "pathfinder-lander" }, landing: "pathfinder"
  },
  {
    id: "spirit", name: "Spirit rover", category: "landers", mission: "Mars Exploration Rover A", hardware: "spirit",
    launchDate: "June 10, 2003", rocket: "delta-2", destination: "Mars, Gusev crater", region: "Mars", bodies: ["Mars"],
    status: { label: "Ended" }, related: ["opportunity", "delta-2"],
    model: { type: "model", key: "mer-rover" }, landing: "spirit"
  },
  {
    id: "opportunity", name: "Opportunity rover", category: "landers", mission: "Mars Exploration Rover B", hardware: "opportunity",
    launchDate: "July 7, 2003", rocket: "delta-2", destination: "Mars, Meridiani Planum", region: "Mars", bodies: ["Mars"],
    status: { label: "Ended" }, related: ["spirit", "delta-2"],
    model: { type: "model", key: "mer-rover" }, landing: "opportunity"
  },
  {
    id: "phoenix", name: "Phoenix lander", category: "landers", mission: "Phoenix", hardware: "phoenix",
    launchDate: "August 4, 2007 (UTC)", rocket: "delta-2", destination: "Mars, arctic plains", region: "Mars", bodies: ["Mars"],
    status: { label: "Ended" }, related: ["delta-2"],
    model: { type: "model", key: "phoenix" }, landing: "phoenix"
  },
  {
    id: "insight", name: "InSight lander", category: "landers", mission: "InSight", hardware: "insight",
    launchDate: "May 5, 2018", vehicle: "Atlas V, from Vandenberg (the first interplanetary launch from the US West Coast)",
    destination: "Mars, Elysium Planitia", region: "Mars", bodies: ["Mars"],
    status: { label: "Ended" }, related: ["seis"],
    model: { type: "model", key: "insight" }, landing: "insight"
  },
  {
    id: "curiosity", name: "Curiosity rover", category: "landers", mission: "Mars Science Laboratory", hardware: "curiosity",
    launchDate: "November 26, 2011", rocket: "atlas-v-541", destination: "Mars, Gale Crater", region: "Mars", bodies: ["Mars"],
    status: { label: "Operating" }, related: ["perseverance", "atlas-v-541"],
    model: { type: "model", key: "curiosity" },
    replay: { type: "hardware", id: "curiosity" }, landing: "curiosity"
  },
  {
    id: "perseverance", name: "Perseverance rover", category: "landers", mission: "Mars 2020", hardware: "perseverance",
    launchDate: "July 30, 2020", rocket: "atlas-v-541", destination: "Mars, Jezero Crater", region: "Mars", bodies: ["Mars"],
    status: { label: "Operating" }, related: ["ingenuity", "moxie", "curiosity", "atlas-v-541"],
    model: { type: "model", key: "perseverance" },
    replay: { type: "hardware", id: "perseverance" }, landing: "perseverance"
  },
  {
    id: "ingenuity", name: "Ingenuity helicopter", category: "landers", mission: "Mars 2020", hardware: "perseverance",
    launchDate: "July 30, 2020", rocket: "atlas-v-541", destination: "Mars, Jezero Crater", region: "Mars", bodies: ["Mars"],
    status: { label: "Ended", text: "NASA ended the helicopter's mission on January 25, 2024." },
    description: "A small helicopter carried under Perseverance. It made the first powered flight on Mars on April 19, 2021, and its 72nd and final flight on January 18, 2024.",
    related: ["perseverance"],
    model: { type: "model", key: "helicopter-flying" }
  },
  {
    id: "huygens", name: "Huygens probe (ESA)", category: "landers", mission: "Cassini-Huygens", hardware: "huygens",
    launchDate: "October 15, 1997", rocket: "titan-4b", destination: "Titan", region: "Saturn & Titan", bodies: ["Titan", "Saturn"],
    status: { label: "On the surface" }, related: ["cassini", "titan-4b"],
    model: { type: "model", key: "huygens" },
    replay: { type: "hardware", id: "huygens" }, landing: "huygens"
  },
  {
    id: "galileo-probe", name: "Galileo atmospheric probe", category: "landers", mission: "Galileo", hardware: "galileo-probe",
    launchDate: "October 18, 1989", rocket: "shuttle", destination: "Jupiter's atmosphere", region: "Jupiter", bodies: ["Jupiter"],
    status: { label: "Ended" }, related: ["galileo"],
    model: { type: "model", key: "galileo-probe" },
    replay: { type: "hardware", id: "galileo-probe" }, landing: "galileo-probe"
  },
  {
    id: "pv-large", name: "Pioneer Venus Large Probe", category: "landers", mission: "Pioneer Venus 2 (Multiprobe)", hardware: "pv-large",
    launchDate: "August 8, 1978", rocket: "atlas-centaur", destination: "Venus", region: "Venus", bodies: ["Venus"],
    status: { label: "Ended" }, related: ["pv-day", "atlas-centaur"],
    model: { type: "model", key: "venus-probe-large" }, landing: "pv-large"
  },
  {
    id: "pv-day", name: "Pioneer Venus Day Probe", category: "landers", mission: "Pioneer Venus 2 (Multiprobe)", hardware: "pv-day",
    launchDate: "August 8, 1978", rocket: "atlas-centaur", destination: "Venus", region: "Venus", bodies: ["Venus"],
    status: { label: "Ended" }, related: ["pv-large", "atlas-centaur"],
    model: { type: "model", key: "venus-probe-small" }, landing: "pv-day"
  },

  // ================= Scientific instruments =================
  {
    id: "lrrr", name: "Laser Ranging Retroreflector (Apollo 11)", category: "instruments", mission: "Apollo 11", hardware: "apollo11",
    launchDate: "July 16, 1969", rocket: "saturn-v", destination: "Moon, Tranquility Base", region: "Moon", bodies: ["Moon"],
    status: { label: "Operating", text: "Observatories still bounce lasers off it to measure the Earth–Moon distance." },
    description: "A panel of 100 small glass prisms that reflects laser light straight back to Earth.",
    purpose: "To measure the distance between Earth and the Moon very precisely.",
    related: ["apollo11-lm", "pse"],
    model: { type: "model", key: "lrrr" }
  },
  {
    id: "pse", name: "Passive Seismic Experiment (Apollo 11)", category: "instruments", mission: "Apollo 11", hardware: "apollo11",
    launchDate: "July 16, 1969", rocket: "saturn-v", destination: "Moon, Tranquility Base", region: "Moon", bodies: ["Moon"],
    status: { label: "Ended", text: "Returned the first lunar seismic data for about three weeks after the astronauts left." },
    description: "A solar-powered seismometer set up by Armstrong and Aldrin.",
    purpose: "To detect moonquakes and meteorite impacts.",
    related: ["apollo11-lm", "lrrr", "seis"],
    model: { type: "model", key: "pse" }
  },
  // ===== NLC-2 (new — safe to remove on request): ALSEP =====
  // Facts verified against the NSSDCA Apollo 15 ALSEP page on November 14, 2026 (see docs/RESEARCH.md).
  {
    id: "alsep", name: "ALSEP (Apollo 15)", category: "instruments", mission: "Apollo 15", hardware: "apollo15", nlc2: true,
    launchDate: "July 26, 1971", rocket: "saturn-v", destination: "Moon, Hadley-Apennine", region: "Moon", bodies: ["Moon"],
    status: { label: "Ended", text: "The ALSEP stations ran for years after the astronauts left. NASA switched them off on September 30, 1977 to save money, and the equipment is still sitting on the Moon.", asOf: "NASA NSSDCA catalog, checked November 2026." },
    description: "A package of science instruments left on the Moon by the Apollo 15 crew: a central station powered by a nuclear generator, with experiments linked to it by cables.",
    background: "ALSEP stands for Apollo Lunar Surface Experiments Package. Apollo 12 first carried a full ALSEP; Apollos 14, 15, 16 and 17 left later versions. Apollo 15's package included a heat-flow experiment, a laser retroreflector and a supersensitive seismometer. Its radio link made it possible to track how far the Moon drifts from Earth.",
    purpose: "To measure moonquakes, heat from inside the Moon, the Moon's distance from Earth and the thin lunar atmosphere after the crews came home.",
    specs: [["Deployed", "July 31, 1971, at Hadley-Apennine"], ["Power", "Radioisotope thermoelectric generator (RTG)"], ["Shut down", "September 30, 1977"], ["Still there", "Yes: the equipment was left on the Moon"]],
    related: ["lrv", "apollo11-lm", "pse"],
    sources: [{ label: "NASA NSSDCA: Apollo 15 ALSEP", url: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-063C" }],
    model: { type: "model", key: "alsep" }
  },
  // ===== end NLC-2 =====
  {
    id: "moxie", name: "MOXIE (on Perseverance)", category: "instruments", mission: "Mars 2020",
    launchDate: "July 30, 2020", rocket: "atlas-v-541", destination: "Mars, Jezero Crater", region: "Mars", bodies: ["Mars"],
    status: { label: "Completed", text: "Its 16th and final run was on August 7, 2023." },
    description: "The Mars Oxygen In-Situ Resource Utilization Experiment made oxygen from Mars's carbon dioxide air.",
    background: "About the size of a microwave oven, MOXIE rode inside Perseverance.",
    purpose: "To show that future explorers could make oxygen on Mars for breathing and rocket fuel.",
    specs: [["Oxygen made", "122 g over 16 runs"], ["Best rate", "Up to 12 g per hour"], ["Purity", "98% or better"]],
    timeline: [{ date: "August 7, 2023", text: "Final run." }],
    related: ["perseverance"],
    sources: [MOXIE],
    model: { type: "model", key: "moxie" }
  },
  {
    id: "seis", name: "SEIS seismometer (InSight)", category: "instruments", mission: "InSight", hardware: "insight",
    launchDate: "May 5, 2018", vehicle: "Atlas V, from Vandenberg", destination: "Mars, Elysium Planitia", region: "Mars", bodies: ["Mars"],
    status: { label: "Ended" },
    description: "InSight's seismometer, set down on the ground by the robotic arm and covered by a dome-shaped shield.",
    purpose: "To listen for marsquakes and learn about Mars's interior.",
    related: ["insight", "pse"],
    model: { type: "model", key: "seis" }
  },

  // ================= Space stations & modules =================
  {
    id: "skylab", name: "Skylab", category: "stations", mission: "Skylab",
    launchDate: "May 14, 1973", rocket: "saturn-v-skylab", destination: "Earth orbit", region: "Earth orbit", bodies: ["Earth"],
    status: { label: "Ended", text: "Re-entered on July 11, 1979, falling over the Indian Ocean and Australia." },
    description: "America's first space station, built from a Saturn V third stage.",
    background: "About 63 seconds after launch the micrometeoroid shield tore off and took one solar array with it. The first crew put up a sunshade to cool the station. Three crews lived aboard in 1973 and 1974.",
    purpose: "Long-duration living in space, solar astronomy and science experiments.",
    specs: [["Launch", "Final Saturn V, Pad 39A"], ["Crews", "Three (1973–1974)"]],
    timeline: [
      { date: "May 14, 1973", text: "Launch. The shield and one solar array are lost." },
      { date: "1973–1974", text: "Three crews visit." },
      { date: "July 11, 1979", text: "Re-enters the atmosphere." }
    ],
    related: ["saturn-v-skylab", "saturn-v"],
    sources: [SKYLAB_HISTORY],
    model: { type: "model", key: "skylab" },
    image: { label: "NASA History: Skylab launch article", url: "https://www.nasa.gov/history/50-years-ago-the-launch-of-skylab-americas-first-space-station/" },
    replay: { type: "mission", id: "skylab" }
  },
  {
    id: "zarya", name: "Zarya (ISS module)", category: "stations", mission: "International Space Station",
    launchDate: "November 20, 1998", rocket: "proton", destination: "Earth orbit", region: "Earth orbit", bodies: ["Earth"],
    status: { label: "Operating", text: "Still part of the International Space Station." },
    description: "The first ISS module, built by Khrunichev in Russia (funded by the US). It first served as a temporary control module.",
    background: "Zarya launched from Baikonur on a Proton. Two weeks later Endeavour brought Unity to join it.",
    purpose: "To provide power, propulsion and control for the young station.",
    specs: [["Built by", "Khrunichev (Russia)"], ["Launched on", "Proton, Baikonur"]],
    timeline: [
      { date: "November 20, 1998", text: "Launch on a Proton." },
      { date: "December 6, 1998", text: "Joined to Unity." },
      { date: "November 2000", text: "Expedition 1 (Shepherd, Krikalev, Gidzenko) arrives." }
    ],
    related: ["unity", "proton"],
    sources: [ISS_HISTORY],
    model: { type: "model", key: "zarya-unity" },
    replay: { type: "mission", id: "iss-start" }
  },
  {
    id: "unity", name: "Unity (Node 1)", category: "stations", mission: "International Space Station (STS-88)",
    launchDate: "December 4, 1998", rocket: "shuttle", vehicle: "Space Shuttle Endeavour (STS-88)", destination: "Earth orbit", region: "Earth orbit", bodies: ["Earth"],
    status: { label: "Operating", text: "Still part of the International Space Station." },
    description: "The first US-built ISS component (built by Boeing): a connecting node with six docking ports.",
    background: "Endeavour's crew captured Zarya and joined it to Unity on December 6, 1998.",
    purpose: "To connect modules together.",
    specs: [["Built by", "Boeing"], ["Launched on", "STS-88, Endeavour"]],
    timeline: [
      { date: "December 4, 1998", text: "Launch aboard Endeavour." },
      { date: "December 6, 1998", text: "Joined to Zarya." }
    ],
    related: ["zarya", "shuttle"],
    sources: [ISS_HISTORY],
    model: { type: "model", key: "zarya-unity" },
    replay: { type: "mission", id: "iss-start" }
  },

  // ================= Return capsules & sample return systems =================
  {
    id: "apollo11-cm", name: "Apollo 11 command module Columbia", category: "capsules", mission: "Apollo 11",
    launchDate: "July 16, 1969", rocket: "saturn-v", destination: "Returned to Earth (Pacific Ocean)", region: "Moon", bodies: ["Earth", "Moon"],
    status: { label: "Completed", text: "Splashed down on July 24, 1969 at 12:49 p.m. ET, about 812 nautical miles southwest of Hawaii. The crew was recovered by USS Hornet." },
    description: "The only part of Apollo 11 that came home: a cone-shaped capsule with a heat shield and three main parachutes.",
    purpose: "To bring the three astronauts and their Moon rocks safely through re-entry.",
    specs: [["Splashdown", "July 24, 1969, 12:49 p.m. ET"], ["Recovery ship", "USS Hornet"], ["Main parachutes", "Three"]],
    timeline: [{ date: "July 24, 1969", text: "Re-entry and splashdown in the Pacific." }],
    related: ["apollo11-csm", "apollo11-lm"],
    sources: [APOLLO11_RECOVERY],
    model: { type: "model", key: "apollo-cm" },
    image: { label: "NASA: Apollo 11 command module recovered", url: "https://www.nasa.gov/image-article/50-years-ago-today-apollo-11-command-module-recovered/" },
    replay: { type: "hardware", id: "apollo11" }
  },
  {
    id: "gemini3", name: "Gemini III capsule", category: "capsules", mission: "Gemini III",
    launchDate: "March 23, 1965", rocket: "titan-2", destination: "Earth orbit (three orbits)", region: "Earth orbit", bodies: ["Earth"],
    status: { label: "Completed", text: "The flight lasted 4 hours, 52 minutes and 31 seconds." },
    description: "The first crewed Gemini spacecraft, flown by Gus Grissom and John Young.",
    background: "Gemini III launched at 9:24 a.m. EST from Complex 19 and made the first orbital maneuver by a crewed spacecraft. It splashed down near Grand Turk Island and was recovered by USS Intrepid.",
    purpose: "To test the Gemini spacecraft with a crew aboard.",
    specs: [["Crew", "Virgil (Gus) Grissom, John Young"], ["Orbits", "Three"], ["Duration", "4 h 52 m 31 s"], ["Recovery ship", "USS Intrepid"]],
    timeline: [
      { date: "March 23, 1965", text: "Launch at 9:24 a.m. EST." },
      { date: "March 23, 1965", text: "Splashdown near Grand Turk Island." }
    ],
    related: ["titan-2"],
    sources: [GEMINI3],
    model: { type: "model", key: "gemini" },
    image: { label: "NASA: Gemini III mission page", url: "https://www.nasa.gov/mission/gemini-iii/" },
    replay: { type: "mission", id: "gemini3" }
  },
  {
    id: "orion-cm", name: "Orion crew module (Artemis I)", category: "capsules", mission: "Artemis I",
    launchDate: "November 16, 2022", rocket: "sls", destination: "Returned to Earth (Pacific Ocean)", region: "Moon", bodies: ["Earth", "Moon"],
    status: { label: "Completed", text: "Splashed down at 9:40 a.m. PST on December 11, 2022, west of Baja California near Guadalupe Island. Recovered by USS Portland." },
    description: "Orion's crew module, which returned from the Moon at the end of Artemis I.",
    purpose: "To test the heat shield and parachutes at lunar return speed before astronauts fly.",
    specs: [["Splashdown", "December 11, 2022, 9:40 a.m. PST"], ["Recovery ship", "USS Portland"]],
    timeline: [{ date: "December 11, 2022", text: "Re-entry and splashdown." }],
    related: ["orion", "sls"],
    sources: [ARTEMIS1],
    model: { type: "model", key: "orion-cm" },
    replay: { type: "mission", id: "artemis1" }
  },
  {
    id: "osiris-src", name: "OSIRIS-REx sample return capsule", category: "capsules", mission: "OSIRIS-REx",
    launchDate: "September 8, 2016", rocket: "atlas-v-411", destination: "Returned to Earth (Utah)", region: "Asteroids & comets", bodies: ["Earth"],
    status: { label: "Completed", text: "Landed on September 24, 2023 at the Department of Defense's Utah Test and Training Range." },
    description: "The capsule that carried the sample of asteroid Bennu back to Earth.",
    purpose: "To protect the sample through re-entry and land it gently under a parachute.",
    specs: [["Landing", "September 24, 2023, Utah Test and Training Range"]],
    timeline: [{ date: "September 24, 2023", text: "The capsule lands in Utah." }],
    related: ["osiris-rex"],
    sources: [OSIRIS],
    model: { type: "model", key: "src" },
    replay: { type: "mission", id: "osiris-rex" }
  },
  {
    id: "stardust-src", name: "Stardust sample return capsule", category: "capsules", mission: "Stardust",
    launchDate: "February 7, 1999", rocket: "delta-2", destination: "Returned to Earth (Utah)", region: "Asteroids & comets", bodies: ["Earth"],
    status: { label: "Completed", text: "Landed at about 2:10 a.m. PST on January 15, 2006, in the desert near Dugway, Utah." },
    description: "Brought back particles from comet Wild 2, and interstellar dust.",
    purpose: "To return the aerogel collector to Earth safely.",
    specs: [["Landing", "January 15, 2006, about 2:10 a.m. PST"]],
    timeline: [{ date: "January 15, 2006", text: "The capsule lands in Utah." }],
    related: ["stardust"],
    sources: [STARDUST],
    model: { type: "model", key: "src" },
    replay: { type: "mission", id: "stardust" }
  }
];

// ----- Small helpers used by the Explorer and the solar system -----
export function findItem(id) {
  return catalog.find(function (item) { return item.id === id; }) || null;
}

export function launchYear(item) {
  const match = String(item.launchDate || "").match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

// Every catalog item linked to a solar-system body (for "Related hardware" in the info panel)
export function itemsForBody(name) {
  return catalog.filter(function (item) { return (item.bodies || []).indexOf(name) !== -1; });
}
