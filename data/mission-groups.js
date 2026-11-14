// Missions and the hardware each one used.
// The Missions section (js/explorer.js) is organised around these groups: every catalog item (except rockets)
// belongs to exactly one mission here, and rockets appear as the mission's "launch vehicle" link
// (taken from each item's own `rocket` field in data/catalog.js), so no fact is written twice.
//
// where: the destination group used by the Missions sidebar.

export const DESTINATIONS = [
  { id: "earth", name: "Earth orbit", hint: "Stations, telescopes, crewed capsules" },
  { id: "moon", name: "The Moon", hint: "Landers, rovers, orbiters" },
  { id: "mars", name: "Mars", hint: "Landers, rovers, a helicopter" },
  { id: "inner", name: "Sun, Mercury & Venus", hint: "Probes into heat and clouds" },
  { id: "outer", name: "Outer planets & beyond", hint: "Jupiter, Saturn, Pluto, interstellar space" },
  { id: "small", name: "Asteroids & comets", hint: "Sample return, asteroid orbiters" } // NLC-2: hint extended for Dawn and NEAR Shoemaker
];

export const MISSION_GROUPS = [
  { id: "gemini3", name: "Gemini III", year: 1965, where: "earth", items: ["gemini3"] },
  { id: "surveyor1", name: "Surveyor 1", year: 1966, where: "moon", items: ["surveyor1"] },
  // NLC-2 (new — safe to remove on request): NEAR Shoemaker group
  { id: "near-shoemaker", name: "NEAR Shoemaker", year: 1996, where: "small", items: ["near-shoemaker"], nlc2: true },
  { id: "apollo11", name: "Apollo 11", year: 1969, where: "moon", items: ["apollo11-csm", "apollo11-lm", "apollo11-cm", "lrrr", "pse"] },
  { id: "apollo15", name: "Apollo 15", year: 1971, where: "moon", items: ["lrv", "alsep"] }, // NLC-2: "alsep" added
  { id: "pioneer10", name: "Pioneer 10", year: 1972, where: "outer", items: ["pioneer10"] },
  { id: "pioneer11", name: "Pioneer 11", year: 1973, where: "outer", items: ["pioneer11"] },
  { id: "skylab", name: "Skylab", year: 1973, where: "earth", items: ["skylab"] },
  { id: "viking1", name: "Viking 1", year: 1975, where: "mars", items: ["viking1"] },
  { id: "voyager", name: "Voyager", year: 1977, where: "outer", items: ["voyager1", "voyager2"] },
  { id: "pioneer-venus", name: "Pioneer Venus Multiprobe", year: 1978, where: "inner", items: ["pv-large", "pv-day"] },
  { id: "galileo", name: "Galileo", year: 1989, where: "outer", items: ["galileo", "galileo-probe"] },
  { id: "hubble", name: "Hubble Space Telescope", year: 1990, where: "earth", items: ["hubble"] },
  { id: "pathfinder", name: "Mars Pathfinder", year: 1996, where: "mars", items: ["pathfinder"] },
  { id: "cassini", name: "Cassini–Huygens", year: 1997, where: "outer", items: ["cassini", "huygens"] },
  { id: "iss", name: "International Space Station (first modules)", year: 1998, where: "earth", items: ["zarya", "unity"] },
  { id: "stardust", name: "Stardust", year: 1999, where: "small", items: ["stardust", "stardust-src"] },
  { id: "mer", name: "Mars Exploration Rovers", year: 2003, where: "mars", items: ["spirit", "opportunity"] },
  { id: "messenger", name: "MESSENGER", year: 2004, where: "inner", items: ["messenger"] },
  { id: "new-horizons", name: "New Horizons", year: 2006, where: "outer", items: ["new-horizons"] },
  { id: "phoenix", name: "Phoenix", year: 2007, where: "mars", items: ["phoenix"] },
  // NLC-2 (new — safe to remove on request): Dawn group
  { id: "dawn", name: "Dawn", year: 2007, where: "small", items: ["dawn"], nlc2: true },
  { id: "lro-lcross", name: "LRO and LCROSS", year: 2009, where: "moon", items: ["lro", "lcross"] },
  { id: "msl", name: "Mars Science Laboratory", year: 2011, where: "mars", items: ["curiosity"] },
  { id: "osiris-rex", name: "OSIRIS-REx", year: 2016, where: "small", items: ["osiris-rex", "osiris-src"] },
  { id: "insight", name: "InSight", year: 2018, where: "mars", items: ["insight", "seis"] },
  { id: "parker", name: "Parker Solar Probe", year: 2018, where: "inner", items: ["parker"] },
  { id: "mars2020", name: "Mars 2020", year: 2020, where: "mars", items: ["perseverance", "ingenuity", "moxie"] },
  { id: "jwst", name: "James Webb Space Telescope", year: 2021, where: "earth", items: ["jwst"] },
  { id: "artemis1", name: "Artemis I", year: 2022, where: "moon", items: ["orion", "orion-cm"] },
  { id: "blueghost1", name: "Blue Ghost Mission 1", year: 2025, where: "moon", items: ["blueghost1"] }
];

// The job a piece of hardware did on its mission (shown on its card instead of a generic category)
export function roleOf(item) {
  const name = item.name.toLowerCase();
  switch (item.category) {
    case "rockets": return "Launch vehicle";
    case "spacecraft": return name.indexOf("csm") !== -1 ? "Command & service module" : "Spacecraft";
    case "telescopes": return name.indexOf("telescope") !== -1 ? "Space telescope" : "Orbiter";
    case "landers":
      if (name.indexOf("rover") !== -1 || name.indexOf("roving") !== -1) return "Rover";
      if (name.indexOf("helicopter") !== -1) return "Helicopter";
      if (name.indexOf("probe") !== -1) return "Atmospheric probe";
      if (name.indexOf("sojourner") !== -1) return "Lander & rover";
      return "Lander";
    case "instruments": return "Instrument";
    case "stations": return "Station module";
    case "capsules": return "Return capsule";
    default: return "Hardware";
  }
}

export function groupOfItem(id) {
  return MISSION_GROUPS.find(function (group) { return group.items.indexOf(id) !== -1; }) || null;
}
