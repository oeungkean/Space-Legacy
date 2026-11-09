// Historical objects you can find while exploring, and science targets you can study.
// IMPORTANT: collecting only adds a VIRTUAL RECORD to "My Collection". The real objects stay exactly where they are
// (on the Moon, on Mars, or in orbit), and nothing here suggests anyone can retrieve them.
//
// Each entry:
//   site       where it is placed (data/simulator.js SITES)
//   kind       "hardware" (historical equipment), "target" (a science target: rock or soil), "observe" (seen from orbit)
//   x, z       position in the site, in meters from the landing point
//   model      3D model key (js/models.js) or "rock" / "flag-memorial" / "tube" for small built-in shapes
//   card       the information card. Facts come from the sources listed (and data/hardware.js profiles).

const A11 = [
  { label: "NASA: Aldrin gazes at Tranquility Base", url: "https://www.nasa.gov/image-article/aldrin-gazes-tranquility-base" },
  { label: "APS Physics: Lunar laser ranging turns 50", url: "https://physics.aps.org/articles/v12/84" }
];
const A15 = [
  { label: "NASA: Apollo 15 astronauts deploy the first Lunar Roving Vehicle", url: "https://www.nasa.gov/image-article/this-week-nasa-history-apollo-15-astronauts-deploy-first-lunar-roving-vehicle-july-31-1971/" },
  { label: "NASA NSSDC: The Apollo Lunar Roving Vehicle", url: "https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html" }
];
const MEMORIAL = { label: "NASA: Memorial to fallen astronauts on the Moon", url: "https://science.nasa.gov/resource/memorial-to-fallen-astronauts-on-the-moon" };
const DEPOT = { label: "JPL: Perseverance deposits first sample on Mars surface", url: "https://www.jpl.nasa.gov/news/nasas-perseverance-rover-deposits-first-sample-on-mars-surface" };
const M2020 = { label: "NASA Science: Mars 2020", url: "https://science.nasa.gov/mars2020" };
const MSL = { label: "NASA Photojournal: PIA16239 (Curiosity)", url: "https://photojournal.jpl.nasa.gov/catalog/PIA16239" };
const HUBBLE = [
  { label: "NASA: STS-31", url: "https://www.nasa.gov/mission/sts-31/" },
  { label: "NASA: Hubble restarts science in new pointing mode", url: "https://science.nasa.gov/missions/hubble/nasas-hubble-restarts-science-in-new-pointing-mode/" }
];
const ISS = { label: "NASA History: 25 years ago, space station assembly begins", url: "https://www.nasa.gov/history/25-years-ago-nasa-partners-begin-space-station-assembly/" };

export const collectibles = [
  // ----- Apollo 11, Tranquility Base -----
  {
    id: "a11-descent-stage", site: "tranquility", kind: "hardware", x: 0, z: 0, model: "lunar-module-descent",
    card: {
      name: "Apollo 11 Lunar Module Eagle (descent stage)", mission: "Apollo 11", year: 1969, location: "Tranquility Base, Sea of Tranquility",
      purpose: "The lower half of the Lunar Module: its engine landed Armstrong and Aldrin on the Moon.",
      usage: "It served as the launch pad for the ascent stage, which lifted off at 17:54 UTC on July 21, 1969.",
      importance: "The first crewed spacecraft to land on another world.",
      status: "Still at Tranquility Base.",
      image: A11[0], sources: A11, catalogId: "apollo11-lm"
    }
  },
  {
    id: "a11-lrrr", site: "tranquility", kind: "hardware", x: 16, z: 9, model: "lrrr",
    card: {
      name: "Laser Ranging Retroreflector", mission: "Apollo 11", year: 1969, location: "Tranquility Base",
      purpose: "A panel of 100 small prisms that reflects laser light straight back to Earth.",
      usage: "Aldrin and Armstrong set it up during the moonwalk. Lick Observatory recorded the first laser reflection on August 1, 1969.",
      importance: "Its measurements show the Moon moving away from Earth by about 3.8 cm per year, and have been used to test general relativity.",
      status: "Still on the Moon, and observatories still use Apollo reflectors for laser ranging.",
      image: A11[0], sources: A11, catalogId: "lrrr"
    }
  },
  {
    id: "a11-pse", site: "tranquility", kind: "hardware", x: 14, z: -6, model: "pse",
    card: {
      name: "Passive Seismic Experiment Package", mission: "Apollo 11", year: 1969, location: "Tranquility Base",
      purpose: "A solar-powered seismometer to detect moonquakes and impacts.",
      usage: "Set up during the single Apollo 11 moonwalk.",
      importance: "It returned the first lunar seismic data, for about three weeks after the astronauts left.",
      status: "Not operating. Still at Tranquility Base.",
      image: A11[0], sources: A11, catalogId: "pse"
    }
  },
  {
    id: "a11-basalt", site: "tranquility", kind: "target", x: -22, z: 14, model: "rock",
    card: {
      name: "Mare basalt (science target)", mission: "Apollo 11", year: 1969, location: "Sea of Tranquility",
      purpose: "A dark volcanic rock typical of the lunar maria.",
      usage: "Apollo 11 collected 21.55 kg of rock and soil samples during about two and a half hours outside.",
      importance: "The first samples of another world returned to Earth for laboratory study.",
      status: "This is a generic rock in the simulation, not a specific sampled rock.",
      sources: A11
    }
  },

  // ----- Apollo 15, Hadley-Apennine -----
  {
    id: "a15-descent-stage", site: "hadley", kind: "hardware", x: 0, z: 0, model: "lunar-module-descent",
    card: {
      name: "Apollo 15 Lunar Module descent stage", mission: "Apollo 15", year: 1971, location: "Hadley-Apennine",
      purpose: "Landed David Scott and James Irwin at the foot of the Apennine mountains at 22:16 UTC on July 30, 1971.",
      usage: "The ascent stage lifted off from it on August 2, 1971.",
      importance: "Apollo 15 was the first mission to carry the Lunar Roving Vehicle.",
      status: "Still at Hadley-Apennine.",
      sources: A15
    }
  },
  {
    id: "a15-lrv", site: "hadley", kind: "hardware", x: 30, z: 22, model: "lrv",
    card: {
      name: "Lunar Roving Vehicle (Apollo 15)", mission: "Apollo 15", year: 1971, location: "Hadley-Apennine",
      purpose: "An electric car for exploring much farther from the lander. Mass 210 kg, frame 3.1 m long, a motor in each wheel, front and rear steering.",
      usage: "Deployed on July 31, 1971. Its front steering briefly stopped working, so the crew used rear steering until it was fixed the next day. It covered 27.8 km in 3 h 2 min of driving.",
      importance: "The first crewed vehicle driven on another world.",
      status: "Left on the Moon at the end of the mission.",
      image: A15[0], sources: A15, catalogId: "lrv"
    }
  },
  {
    id: "a15-memorial", site: "hadley", kind: "hardware", x: 38, z: 30, model: "flag-memorial",
    card: {
      name: "Memorial to fallen astronauts and cosmonauts", mission: "Apollo 15", year: 1971, location: "Hadley-Apennine",
      purpose: "A plaque with the names of 14 astronauts and cosmonauts who had died, with a small figurine.",
      usage: "David Scott and James Irwin pressed it into the lunar soil on August 2, 1971.",
      importance: "A memorial on the Moon to people who gave their lives to space exploration.",
      status: "Still on the Moon.",
      image: MEMORIAL, sources: [MEMORIAL]
    }
  },
  {
    id: "a15-alsep", site: "hadley", kind: "hardware", x: -26, z: 18, model: "pse",
    card: {
      name: "Apollo 15 experiments package", mission: "Apollo 15", year: 1971, location: "Hadley-Apennine",
      purpose: "Surface experiments left running after the crew departed.",
      usage: "Set up by the crew during their moonwalks.",
      importance: "Long-term science stations on the Moon.",
      status: "Switched off in 1977. Still at the site.",
      sources: A15
    }
  },
  {
    id: "a15-rille-rock", site: "hadley", kind: "target", x: -40, z: -30, model: "rock",
    card: {
      name: "Highland rock near the Apennines (science target)", mission: "Apollo 15", year: 1971, location: "Hadley-Apennine",
      purpose: "A generic rock for practising examination and virtual sampling.",
      usage: "Apollo 15 crews sampled rocks at the foot of the mountains.",
      importance: "Rocks here record the Moon's early history.",
      status: "A generic rock in the simulation.", sources: A15
    }
  },

  // ----- Apollo 17, Taurus-Littrow -----
  {
    id: "a17-descent-stage", site: "taurus-littrow", kind: "hardware", x: 0, z: 0, model: "lunar-module-descent",
    card: {
      name: "Apollo 17 Lunar Module descent stage", mission: "Apollo 17", year: 1972, location: "Taurus-Littrow valley",
      purpose: "Landed Eugene Cernan and Harrison Schmitt at 19:54 UTC on December 11, 1972.",
      usage: "The ascent stage lifted off from it at 22:54 UTC on December 14, 1972. Cernan was the last person (so far) to leave footprints on the Moon.",
      importance: "The last crewed landing of the Apollo program.",
      status: "Still at Taurus-Littrow.", sources: A15.slice(1)
    }
  },
  {
    id: "a17-lrv", site: "taurus-littrow", kind: "hardware", x: 28, z: -20, model: "lrv",
    card: {
      name: "Lunar Roving Vehicle (Apollo 17)", mission: "Apollo 17", year: 1972, location: "Taurus-Littrow valley",
      purpose: "The third and last Apollo rover.",
      usage: "Covered 35.9 km in 4 h 26 min of driving, the longest of the three.",
      importance: "Let the crew reach places far from the lander.",
      status: "Left on the Moon.", sources: A15.slice(1), catalogId: "lrv"
    }
  },
  {
    id: "a17-orange-soil", site: "taurus-littrow", kind: "target", x: -34, z: 26, model: "orange-soil",
    card: {
      name: "Orange soil (science target)", mission: "Apollo 17", year: 1972, location: "Taurus-Littrow valley",
      purpose: "A patch of orange-colored soil.",
      usage: "Harrison Schmitt discovered a patch of orange soil during the second moonwalk.",
      importance: "A surprise discovery on the last Apollo landing.",
      status: "Shown here as a marked patch of soil.", sources: A15.slice(1)
    }
  },

  // ----- Jezero Crater (Perseverance) -----
  {
    id: "m20-butler", site: "jezero", kind: "hardware", x: 0, z: -10, model: "marker",
    card: {
      name: "Octavia E. Butler Landing", mission: "Mars 2020", year: 2020, location: "Jezero Crater",
      purpose: "Where Perseverance touched down on February 18, 2021.",
      usage: "NASA named the landing site after the science fiction author Octavia E. Butler.",
      importance: "The start of a mission that seals Martian rock samples in tubes for a possible return to Earth.",
      status: "A named place, not an object.", image: M2020, sources: [M2020]
    }
  },
  {
    id: "m20-ingenuity", site: "jezero", kind: "hardware", x: 36, z: 28, model: "helicopter",
    card: {
      name: "Ingenuity Mars Helicopter", mission: "Mars 2020", year: 2020, location: "Jezero Crater",
      purpose: "A technology demonstration carried under Perseverance.",
      usage: "Made the first powered flight on Mars on April 19, 2021, and its 72nd and final flight on January 18, 2024.",
      importance: "Proved that powered flight is possible on Mars.",
      status: "NASA ended the mission on January 25, 2024. Its real resting place is not at this spot: positions here are illustrative.",
      image: M2020, sources: [M2020], catalogId: "ingenuity"
    }
  },
  {
    id: "m20-depot", site: "jezero", kind: "hardware", x: -30, z: 40, model: "tube",
    card: {
      name: "Three Forks sample depot", mission: "Mars 2020", year: 2020, location: "Three Forks, Jezero Crater",
      purpose: "A backup cache of sealed sample tubes for a future Mars Sample Return campaign.",
      usage: "Perseverance placed the first tube on December 21, 2022 (sol 653), and ten tubes in all over about two months.",
      importance: "Humanity's first sample depot on another planet.",
      status: "The tubes are on the surface of Mars. Plans to bring samples to Earth are uncertain.",
      image: DEPOT, sources: [DEPOT]
    }
  },
  {
    id: "m20-rochette", site: "jezero", kind: "target", x: 22, z: -34, model: "rock",
    card: {
      name: "Rochette (science target)", mission: "Mars 2020", year: 2020, location: "Jezero Crater",
      purpose: "The rock where Perseverance collected its first rock cores.",
      usage: "Cored in September 2021.",
      importance: "The first samples sealed for possible return to Earth.",
      status: "Shown here as a generic rock at an illustrative spot.", sources: [M2020]
    }
  },
  {
    id: "m20-cheyava", site: "jezero", kind: "target", x: -46, z: -18, model: "rock",
    card: {
      name: "Cheyava Falls (science target)", mission: "Mars 2020", year: 2020, location: "Jezero Crater",
      purpose: "A rock with features that could be signs of ancient life.",
      usage: "Found by Perseverance in July 2024.",
      importance: "It holds potential biosignatures: features that need much more study to explain.",
      status: "Shown here as a generic rock at an illustrative spot.", sources: [M2020]
    }
  },

  // ----- Gale Crater (Curiosity) -----
  {
    id: "msl-bradbury", site: "gale", kind: "hardware", x: 0, z: -10, model: "marker",
    card: {
      name: "Bradbury Landing", mission: "Mars Science Laboratory", year: 2011, location: "Gale Crater",
      purpose: "Where Curiosity landed on August 6, 2012 (UTC).",
      usage: "NASA named it after the author Ray Bradbury on August 22, 2012.",
      importance: "The start of a mission that is still climbing Mount Sharp.",
      status: "A named place.", image: MSL, sources: [MSL]
    }
  },
  {
    id: "msl-yellowknife", site: "gale", kind: "target", x: 34, z: 30, model: "rock",
    card: {
      name: "Yellowknife Bay mudstone (science target)", mission: "Mars Science Laboratory", year: 2011, location: "Gale Crater",
      purpose: "Rocks at Yellowknife Bay, reached in Curiosity's first year.",
      usage: "Drilled samples showed evidence of an ancient freshwater lake with chemical elements life uses.",
      importance: "Showed Gale Crater once had conditions suitable for microbial life.",
      status: "Shown here as a generic rock at an illustrative spot.", sources: [MSL]
    }
  },

  // ----- Orbit -----
  {
    id: "orbit-hubble", site: "orbit-hubble", kind: "observe", x: 0, z: 14, model: "hubble",
    card: {
      name: "Hubble Space Telescope", mission: "STS-31", year: 1990, location: "Low Earth orbit",
      purpose: "A telescope above the blur of the atmosphere.",
      usage: "Released by Discovery's crew on April 25, 1990.",
      importance: "One of the most productive science instruments ever built.",
      status: "Operating. In one-gyro mode since June 2024.", sources: HUBBLE, catalogId: "hubble"
    }
  },
  {
    id: "orbit-iss", site: "orbit-dragon", kind: "observe", x: 0, z: 60, model: "zarya-unity",
    card: {
      name: "International Space Station", mission: "Demo-2 destination", year: 1998, location: "Low Earth orbit",
      purpose: "A crewed laboratory in orbit, built from many modules.",
      usage: "Its first module, Zarya, launched on November 20, 1998, and Unity joined it on December 6, 1998.",
      importance: "Expedition 1 arrived in November 2000.",
      status: "Operating.", sources: [ISS], catalogId: "zarya"
    }
  }
];

export function collectiblesForSite(site) {
  return collectibles.filter(function (c) { return c.site === site; });
}
