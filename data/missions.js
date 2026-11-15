// Mission journeys for the replay system (Phase 4).
// Facts come from the sources in data/catalog.js and docs/RESEARCH.md. Paths, sizes and distances are illustrative.
//
// A mission only lists the stages it really had:
//   A = Launch   B = Journey   C = Landing, orbit or deployment   D = Return to Earth   E = Completion
//
// Event fields (on top of the ones in data/hardware-replays.js):
//   stage     "A" to "E"
//   model     the 3D model shown at this event (js/models.js)
//   size      how big the model is drawn (scene units). Models are scaled to this size.
//   action    a special effect at this event:
//               "deploy"      unfolds the model (deploy: [from, to], 0 = folded, 1 = open)
//               "orbit"       draws a small orbit ring around the target
//               "sample"      a puff of dust (touch-and-go sampling)
//               "reentry"     glowing plasma around the craft
//               "splashdown"  parachutes open, then a splash ring on the ocean
//               "parachute"   parachute landing on the ground
//   target    a planet or moon name, "outbound" (far = how far out, 1 = past Neptune), "belt" (asteroid belt),
//             or "deep" (a small body that is not in the solar system view: radius and angle from Earth's direction,
//             body = the name drawn as a small rock)
// outcome = Stage E: what finally happened, shown when the replay ends.

export const STAGES = {
  A: { name: "Launch" },
  B: { name: "Journey" },
  C: { name: "Landing / Deployment" },
  D: { name: "Return to Earth" },
  E: { name: "Completion" }
};

export const missions = {
  hubble: {
    label: "Hubble Space Telescope", rocket: "shuttle-sts31", catalogId: "hubble",
    outcome: { label: "Operating", text: "Hubble is still working. Since June 2024 it points using one gyroscope, and NASA expects it to keep working through this decade and possibly into the next." },
    events: [
      {
        stage: "A", title: "Launch aboard Discovery", date: "April 24, 1990",
        caption: "Space Shuttle Discovery (STS-31) lifts off at 8:33:51 a.m. EDT with Hubble folded in its payload bay.",
        narration: "April 24th, 1990. At 8:33 in the morning, Eastern time, Space Shuttle Discovery lifts off on mission S T S 31, carrying the Hubble Space Telescope in its payload bay.",
        target: "Earth", isLaunch: true, model: "hubble", size: 0.06, zoom: 1.4, deploy: [0, 0]
      },
      {
        stage: "C", title: "Hubble is released", date: "April 25, 1990",
        caption: "The crew lifts Hubble out of the payload bay with the robotic arm. Its solar arrays unroll and the aperture door opens.",
        narration: "The next day, April 25th, the crew uses the shuttle's robotic arm to lift Hubble out of the payload bay. Its two solar wings swing out and unroll, and the telescope is released into orbit.",
        target: "Earth", gap: 0.35, model: "hubble", size: 0.08, zoom: 0.55, action: "deploy", deploy: [0, 1]
      },
      {
        stage: "E", title: "Still at work", date: "Since 1990",
        caption: "Discovery landed on April 29, 1990. Hubble stayed in orbit, and has been working ever since. Since June 2024 it runs in one-gyro mode.",
        narration: "Discovery and its crew landed on April 29th, 1990. Hubble stayed in orbit, and it is still observing the universe today.",
        target: "Earth", gap: 0.35, around: 0.9, model: "hubble", size: 0.08, zoom: 0.6
      }
    ]
  },

  jwst: {
    label: "James Webb Space Telescope", rocket: "ariane-5", catalogId: "jwst",
    outcome: { label: "Operating", text: "Webb orbits the Sun–Earth L2 point, nearly 1 million miles from Earth. Its first images were released on July 12, 2022." },
    events: [
      {
        stage: "A", title: "Launch from Kourou", date: "December 25, 2021",
        caption: "An Ariane 5 lifts off at 7:20 a.m. ET (12:20 UTC) from Europe's Spaceport in French Guiana, with Webb folded inside the fairing.",
        narration: "December 25th, 2021. At 7:20 in the morning, Eastern time, an Ariane 5 rocket lifts off from French Guiana, with the James Webb Space Telescope folded up inside its nose.",
        target: "Earth", isLaunch: true, model: "jwst", size: 0.07, zoom: 1.4, deploy: [0, 0]
      },
      {
        stage: "C", title: "The sunshield unfolds", date: "January 4, 2022",
        caption: "On its way to L2, Webb unfolds its five-layer, tennis-court-sized sunshield. It is fully tensioned on January 4.",
        narration: "On the way out, Webb spreads its five-layer sunshield, as big as a tennis court. On January 4th, 2022, the last layer is pulled tight.",
        target: "Earth", gap: 2.4, around: 0.4, model: "jwst", size: 0.12, zoom: 0.9, action: "deploy", deploy: [0, 0.6]
      },
      {
        stage: "C", title: "The mirror wings lock into place", date: "January 8, 2022",
        caption: "The two side wings of the 6.6 m gold mirror swing forward and lock. Webb is fully deployed.",
        narration: "On January 8th, the two folded wings of the gold mirror swing into place. The telescope is fully unfolded.",
        target: "Earth", gap: 3.4, around: 0.2, model: "jwst", size: 0.12, zoom: 0.9, action: "deploy", deploy: [0.6, 1]
      },
      {
        stage: "C", title: "Arrival at L2", date: "January 24, 2022",
        caption: "A final engine burn puts Webb into orbit around the second Sun–Earth Lagrange point, L2, nearly 1 million miles from Earth, on the side away from the Sun.",
        narration: "January 24th, 2022. A short engine burn places Webb in orbit around L2, a point nearly one million miles from Earth, on the far side from the Sun.",
        target: "Earth", gap: 4.4, model: "jwst", size: 0.12, zoom: 1.2, action: "orbit"
      }
    ]
  },

  pioneer10: {
    label: "Pioneer 10", rocket: "atlas-centaur", catalogId: "pioneer10", direction: [-0.55, 0.83],
    outcome: { label: "Ended", text: "The last signal from Pioneer 10 arrived on January 23, 2003, from about 12.23 billion km away. A final attempt to contact it on March 4, 2006 got no answer. It is coasting out of the solar system." },
    events: [
      {
        stage: "A", title: "Launch", date: "March 2, 1972",
        caption: "Pioneer 10 launches at 01:49:04 UT on Atlas-Centaur AC-27.",
        narration: "March 2nd, 1972. An Atlas Centaur rocket launches Pioneer 10 toward Jupiter.",
        target: "Earth", isLaunch: true, model: "pioneer", size: 0.08, zoom: 1.4
      },
      {
        stage: "B", title: "Into the asteroid belt", date: "July 15, 1972",
        caption: "Pioneer 10 becomes the first spacecraft to enter the asteroid belt, and comes through safely.",
        narration: "On July 15th, 1972, Pioneer 10 becomes the first spacecraft to enter the asteroid belt. Nobody knew if it would survive. It does.",
        target: "belt", model: "pioneer", size: 0.15, zoom: 3
      },
      {
        stage: "B", title: "First flyby of Jupiter", date: "December 4, 1973",
        caption: "The first close look at Jupiter, from 130,354 km above the cloud tops.",
        narration: "December 4th, 1973. Pioneer 10 makes the first ever flyby of Jupiter, passing about one hundred thirty thousand kilometers above its clouds.",
        target: "Jupiter", gap: 1.6, model: "pioneer", size: 0.2, zoom: 7
      },
      {
        stage: "E", title: "Last signal", date: "January 23, 2003",
        caption: "Contact fades as Pioneer 10's power runs low. The last signal comes from about 12.23 billion km away.",
        narration: "On January 23rd, 2003, the last faint signal from Pioneer 10 reaches Earth, from more than twelve billion kilometers away.",
        target: "outbound", model: "pioneer", size: 0.3, zoom: 20
      }
    ]
  },

  pioneer11: {
    label: "Pioneer 11", rocket: "atlas-centaur", catalogId: "pioneer11", direction: [0.72, 0.69],
    outcome: { label: "Ended", text: "Routine contact ended on September 30, 1995, and the last engineering data arrived on November 24, 1995." },
    events: [
      {
        stage: "A", title: "Launch", date: "April 6, 1973 (UT)",
        caption: "Atlas-Centaur AC-30 launches Pioneer 11 from Launch Complex 36B at 02:11 UT (April 5, local time).",
        narration: "April 1973. An Atlas Centaur rocket launches Pioneer 11 from Cape Canaveral.",
        target: "Earth", isLaunch: true, model: "pioneer", size: 0.08, zoom: 1.4
      },
      {
        stage: "B", title: "Jupiter flyby", date: "December 3, 1974",
        caption: "Pioneer 11 passes just 42,500 km above Jupiter's clouds, and Jupiter's gravity swings it toward Saturn.",
        narration: "December 3rd, 1974. Pioneer 11 dives to about forty-two thousand kilometers above Jupiter's clouds, and Jupiter's gravity throws it toward Saturn.",
        target: "Jupiter", gap: 0.7, model: "pioneer", size: 0.2, zoom: 7
      },
      {
        stage: "B", title: "First flyby of Saturn", date: "September 1, 1979",
        caption: "The first spacecraft ever to fly past Saturn, at 20,900 km.",
        narration: "September 1st, 1979. Pioneer 11 becomes the first spacecraft to fly past Saturn.",
        target: "Saturn", gap: 0.5, model: "pioneer", size: 0.2, zoom: 8
      },
      {
        stage: "E", title: "Last data", date: "November 24, 1995",
        caption: "With its power almost gone, Pioneer 11 sends its last engineering data.",
        narration: "On November 24th, 1995, Pioneer 11 sends its last data. It is still heading out of the solar system.",
        target: "outbound", model: "pioneer", size: 0.3, zoom: 20
      }
    ]
  },

  "new-horizons": {
    label: "New Horizons", rocket: "atlas-v-551", catalogId: "new-horizons", direction: [0.25, -0.97],
    outcome: { label: "Operating", text: "New Horizons is in an extended mission in the Kuiper Belt, collecting heliophysics data." },
    events: [
      {
        stage: "A", title: "Launch", date: "January 19, 2006",
        caption: "An Atlas V 551, with five solid boosters, launches New Horizons from Launch Complex 41.",
        narration: "January 19th, 2006. An Atlas Five rocket with five solid boosters launches New Horizons, bound for Pluto.",
        target: "Earth", isLaunch: true, model: "new-horizons", size: 0.08, zoom: 1.4
      },
      {
        stage: "B", title: "Jupiter gravity assist", date: "February 28, 2007",
        caption: "Jupiter's gravity speeds New Horizons up on its way to Pluto.",
        narration: "February 28th, 2007. New Horizons swings past Jupiter, which speeds it up toward Pluto.",
        target: "Jupiter", gap: 2.5, model: "new-horizons", size: 0.2, zoom: 7
      },
      {
        stage: "B", title: "Pluto flyby", date: "July 14, 2015",
        caption: "The first close-up look at Pluto, from about 7,800 km. (The Solar System view does not draw Pluto; the close-up uses an illustrative Pluto with its bright \"heart\".)",
        narration: "July 14th, 2015. After nine years in space, New Horizons flies past Pluto at about seven thousand eight hundred kilometers, and sends home the first close-up pictures.",
        target: "outbound", far: 0.82, body: "Pluto", model: "new-horizons", size: 0.25, zoom: 6
      },
      {
        stage: "B", title: "Arrokoth flyby", date: "January 1, 2019",
        caption: "New Horizons flies past Arrokoth at about 3,500 km: the most distant object ever explored up close.",
        narration: "New Year's Day, 2019. New Horizons flies past Arrokoth, a small icy world in the Kuiper Belt, the most distant object ever explored up close.",
        target: "outbound", far: 1.0, body: "Arrokoth", model: "new-horizons", size: 0.25, zoom: 6
      }
    ]
  },

  artemis1: {
    label: "Artemis I (Orion)", rocket: "sls", catalogId: "orion",
    outcome: { label: "Completed", text: "Artemis I lasted 25 days, 10 hours and 53 minutes and travelled 1.4 million miles. USS Portland recovered the Orion crew module." },
    events: [
      {
        stage: "A", title: "Launch on SLS", date: "November 16, 2022",
        caption: "SLS lifts off at 1:47 a.m. EST from Launch Complex 39B. About two hours later, the ICPS upper stage sends Orion toward the Moon and separates.",
        narration: "November 16th, 2022, at 1:47 in the morning. NASA's Space Launch System lifts off from Kennedy Space Center with an uncrewed Orion spacecraft. About two hours later, the upper stage sends Orion toward the Moon, and separates.",
        target: "Earth", isLaunch: true, model: "orion", size: 0.06, zoom: 1.4
      },
      {
        stage: "B", title: "Outbound lunar flyby", date: "November 21, 2022",
        caption: "Orion fires its engine as it passes about 81 miles above the Moon.",
        narration: "November 21st. Orion swoops about eighty-one miles above the Moon and fires its engine.",
        target: "Moon", gap: 0.12, around: 0.6, model: "orion", size: 0.05, zoom: 0.5
      },
      {
        stage: "C", title: "Distant retrograde orbit", date: "November 25, 2022",
        caption: "Another burn puts Orion into a distant retrograde orbit: far from the Moon, and going the opposite way to the Moon's own motion.",
        narration: "November 25th. Another burn puts Orion into a distant retrograde orbit around the Moon.",
        target: "Moon", gap: 1.1, around: -0.4, model: "orion", size: 0.05, zoom: 0.9, action: "orbit"
      },
      {
        stage: "D", title: "Return flyby", date: "December 5, 2022",
        caption: "The return powered flyby, 80.6 miles above the Moon, sends Orion home.",
        narration: "December 5th. Orion passes about eighty miles above the Moon again, and fires its engine to head home.",
        target: "Moon", gap: 0.12, around: 0.9, model: "orion", size: 0.05, zoom: 0.5
      },
      {
        stage: "D", title: "Re-entry", date: "December 11, 2022",
        caption: "The service module is released and the crew module hits the atmosphere at lunar return speed, protected by its heat shield.",
        narration: "December 11th. The crew module separates from the service module and plunges into Earth's atmosphere, protected by its heat shield.",
        target: "Earth", gap: 0.35, model: "orion-cm", size: 0.05, zoom: 0.5, action: "reentry"
      },
      {
        stage: "D", title: "Splashdown", date: "December 11, 2022",
        caption: "Under three main parachutes, Orion splashes down at 9:40 a.m. PST near Guadalupe Island, off Baja California. USS Portland recovers it.",
        narration: "At 9:40 in the morning, Pacific time, Orion splashes down under three parachutes in the Pacific Ocean, near Guadalupe Island. The ship U S S Portland recovers it.",
        target: "Earth", gap: 0.02, model: "orion-cm", size: 0.05, zoom: 0.7, action: "splashdown"
      }
    ]
  },

  "osiris-rex": {
    label: "OSIRIS-REx", rocket: "atlas-v-411", catalogId: "osiris-rex",
    outcome: { label: "Operating", text: "The sample reached Earth on September 24, 2023. The spacecraft did not land: renamed OSIRIS-APEX, it is heading for asteroid Apophis, due in 2029." },
    events: [
      {
        stage: "A", title: "Launch", date: "September 8, 2016",
        caption: "An Atlas V 411, with a single solid booster, launches OSIRIS-REx.",
        narration: "September 8th, 2016. An Atlas Five rocket launches OSIRIS-REx, on a mission to bring home a piece of an asteroid.",
        target: "Earth", isLaunch: true, model: "osiris-rex", size: 0.07, zoom: 1.4
      },
      {
        stage: "B", title: "Earth flyby", date: "September 22, 2017",
        caption: "One year later it swings past Earth, which bends its path toward Bennu.",
        narration: "One year later, OSIRIS-REx swings past Earth, which bends its path toward the asteroid Bennu.",
        target: "Earth", gap: 0.8, around: 1.2, model: "osiris-rex", size: 0.07, zoom: 1.2
      },
      {
        stage: "C", title: "Arrival at Bennu", date: "December 3, 2018",
        caption: "OSIRIS-REx reaches asteroid Bennu and spends almost two years mapping it. (Bennu is drawn far larger than it is.)",
        narration: "December 3rd, 2018. OSIRIS-REx arrives at Bennu, and begins mapping it.",
        target: "deep", radius: 22.5, angle: 1.1, body: "Bennu", gap: 0.25, model: "osiris-rex", size: 0.08, zoom: 0.8, action: "orbit"
      },
      {
        stage: "C", title: "Touch-and-go sample", date: "October 20, 2020",
        caption: "The sampling arm (TAGSAM) touches Bennu for a few seconds and a puff of gas stirs up rock and dust into the collector.",
        narration: "October 20th, 2020. The spacecraft reaches out its sampling arm, touches Bennu for a few seconds, and blows up rock and dust into its collector.",
        target: "deep", radius: 22.5, angle: 1.1, body: "Bennu", gap: 0.05, model: "osiris-rex", size: 0.08, zoom: 0.6, action: "sample"
      },
      {
        stage: "D", title: "Heading home", date: "May 10, 2021",
        caption: "OSIRIS-REx leaves Bennu for the trip back to Earth.",
        narration: "May 10th, 2021. OSIRIS-REx leaves Bennu, carrying the sample home.",
        target: "Earth", gap: 2.0, around: -0.5, model: "osiris-rex", size: 0.07, zoom: 1.2
      },
      {
        stage: "D", title: "Capsule re-entry", date: "September 24, 2023",
        caption: "The sample capsule is released and enters the atmosphere. The spacecraft flies on past Earth.",
        narration: "September 24th, 2023. The capsule is released and enters Earth's atmosphere, glowing from the heat.",
        target: "Earth", gap: 0.3, model: "src", size: 0.035, zoom: 0.4, action: "reentry"
      },
      {
        stage: "D", title: "Landing in Utah", date: "September 24, 2023",
        caption: "Under its parachute, the capsule lands at the Utah Test and Training Range. At least 60 g of sample was required; more was collected.",
        narration: "Under its parachute, the capsule lands in the desert of the Utah Test and Training Range, with more than the sixty grams of asteroid sample that was required.",
        target: "Earth", gap: 0.02, around: 0.05, model: "src", size: 0.035, zoom: 0.55, action: "parachute"
      }
    ]
  },

  stardust: {
    label: "Stardust", rocket: "delta-2", catalogId: "stardust",
    outcome: { label: "Completed", text: "The capsule landed on January 15, 2006. The spacecraft stayed in orbit around the Sun and flew past comet Tempel 1 on February 14, 2011." },
    events: [
      {
        stage: "A", title: "Launch", date: "February 7, 1999",
        caption: "A Delta II launches Stardust toward comet Wild 2.",
        narration: "February 7th, 1999. A Delta Two rocket launches Stardust, to catch dust from a comet.",
        target: "Earth", isLaunch: true, model: "stardust", size: 0.07, zoom: 1.4, deploy: [0, 0]
      },
      {
        stage: "C", title: "Comet Wild 2 flyby", date: "January 2004",
        caption: "Stardust raises its tennis-racket-shaped aerogel collector and flies through the comet's dust. (The comet is drawn far larger than it is.)",
        narration: "January 2004. Stardust raises its collector, filled with a feather-light material called aerogel, and flies through the dust around comet Wild 2.",
        target: "deep", radius: 30, angle: 1.7, body: "Wild 2", gap: 0.2, model: "stardust", size: 0.08, zoom: 0.8, action: "deploy", deploy: [0, 1]
      },
      {
        stage: "D", title: "Capsule re-entry", date: "January 15, 2006",
        caption: "The collector is stowed in the capsule, which is released and enters Earth's atmosphere.",
        narration: "January 15th, 2006. The capsule, with the comet dust sealed inside, enters Earth's atmosphere.",
        target: "Earth", gap: 0.3, model: "src", size: 0.035, zoom: 0.4, action: "reentry"
      },
      {
        stage: "D", title: "Landing in Utah", date: "January 15, 2006",
        caption: "At about 2:10 a.m. PST the capsule lands under its parachute in the desert near Dugway, Utah.",
        narration: "At about 2:10 in the morning, the capsule lands under its parachute in the Utah desert.",
        target: "Earth", gap: 0.02, around: 0.05, model: "src", size: 0.035, zoom: 0.55, action: "parachute"
      }
    ]
  },

  skylab: {
    label: "Skylab", rocket: "saturn-v-skylab", catalogId: "skylab",
    outcome: { label: "Ended", text: "Skylab re-entered the atmosphere on July 11, 1979, over the Indian Ocean and Australia." },
    events: [
      {
        stage: "A", title: "Launch on the last Saturn V", date: "May 14, 1973",
        caption: "About 63 seconds after liftoff from Pad 39A, Skylab's micrometeoroid shield tears off, taking one solar array with it.",
        narration: "May 14th, 1973. The last Saturn Five lifts off, carrying Skylab. About sixty-three seconds into the flight, the station's micrometeoroid shield tears away, and one of its solar arrays is lost.",
        target: "Earth", isLaunch: true, model: "skylab", size: 0.07, zoom: 1.4, deploy: [0, 0]
      },
      {
        stage: "C", title: "Repaired and lived in", date: "1973 to 1974",
        caption: "The telescope mount's four solar arrays open. Three crews visit: the first puts up a sunshade to cool the station.",
        narration: "In orbit, the solar telescope's four arrays open like a windmill. Three crews live aboard in 1973 and 1974. The first crew puts up a sunshade to cool the overheating station.",
        target: "Earth", gap: 0.35, model: "skylab", size: 0.09, zoom: 0.6, action: "deploy", deploy: [0, 1]
      },
      {
        stage: "E", title: "Re-entry", date: "July 11, 1979",
        caption: "Skylab's orbit decays and it re-enters over the Indian Ocean and Australia.",
        narration: "On July 11th, 1979, Skylab falls back into the atmosphere, over the Indian Ocean and Australia.",
        target: "Earth", gap: 0.1, around: 1.0, model: "skylab", size: 0.09, zoom: 0.6, action: "reentry"
      }
    ]
  },

  "iss-start": {
    label: "ISS: Zarya and Unity", rocket: "proton", catalogId: "zarya",
    outcome: { label: "Operating", text: "Zarya and Unity are still part of the International Space Station. Expedition 1 arrived in November 2000." },
    events: [
      {
        stage: "A", title: "Zarya launches", date: "November 20, 1998",
        caption: "A Proton rocket launches Zarya, the first space station module, from Baikonur.",
        narration: "November 20th, 1998. A Proton rocket launches Zarya from Baikonur, the first piece of the International Space Station.",
        target: "Earth", isLaunch: true, model: "zarya-unity", size: 0.07, zoom: 1.4, deploy: [0, 0]
      },
      {
        stage: "C", title: "Unity joins Zarya", date: "December 6, 1998",
        caption: "Space Shuttle Endeavour (STS-88), launched December 4, brings Unity, the first US-built part, and joins it to Zarya.",
        narration: "Two weeks later, Space Shuttle Endeavour brings Unity, the first American part of the station. On December 6th, 1998, the crew joins Unity to Zarya.",
        target: "Earth", gap: 0.35, model: "zarya-unity", size: 0.09, zoom: 0.6, action: "deploy", deploy: [0, 1]
      },
      {
        stage: "E", title: "People move in", date: "November 2000",
        caption: "Expedition 1 (Bill Shepherd, Sergei Krikalev, Yuri Gidzenko) arrives.",
        narration: "In November 2000, the first crew, Expedition One, moves in.",
        target: "Earth", gap: 0.35, around: 0.8, model: "zarya-unity", size: 0.09, zoom: 0.6
      }
    ]
  },

  gemini3: {
    label: "Gemini III", rocket: "titan-2", catalogId: "gemini3",
    outcome: { label: "Completed", text: "The flight lasted 4 hours, 52 minutes and 31 seconds. USS Intrepid recovered the crew." },
    events: [
      {
        stage: "A", title: "Launch", date: "March 23, 1965",
        caption: "A Titan II lifts off at 9:24 a.m. EST from Complex 19 with Gus Grissom and John Young.",
        narration: "March 23rd, 1965, at 9:24 in the morning. A Titan Two rocket launches Gemini Three with Gus Grissom and John Young, the first crewed Gemini flight.",
        target: "Earth", isLaunch: true, model: "gemini", size: 0.05, zoom: 1.4
      },
      {
        stage: "B", title: "Three orbits, first maneuver", date: "March 23, 1965",
        caption: "In three orbits, the crew fires thrusters to change orbit: the first orbital maneuver by a crewed spacecraft.",
        narration: "During three orbits of Earth, the crew fires the thrusters to change their orbit, the first time a crewed spacecraft had done that.",
        target: "Earth", gap: 0.3, around: 1.6, model: "gemini", size: 0.05, zoom: 0.5, action: "orbit"
      },
      {
        stage: "D", title: "Splashdown", date: "March 23, 1965",
        caption: "The capsule splashes down in the Atlantic near Grand Turk Island and is recovered by USS Intrepid.",
        narration: "After almost five hours, the capsule splashes down in the Atlantic, near Grand Turk Island. The ship U S S Intrepid recovers the crew.",
        target: "Earth", gap: 0.02, around: 0.15, model: "gemini-cm", size: 0.04, zoom: 0.6, action: "splashdown"
      }
    ]
  },

  lro: {
    label: "Lunar Reconnaissance Orbiter", rocket: "atlas-v-401", catalogId: "lro",
    outcome: { label: "Operating", text: "LRO was still sending images in June 2024, when it photographed China's Chang'e 6 lander. Its 2026 status was not checked." },
    events: [
      {
        stage: "A", title: "Launch with LCROSS", date: "June 18, 2009",
        caption: "An Atlas V 401 launches LRO and LCROSS together.",
        narration: "June 18th, 2009. An Atlas Five rocket launches two Moon missions together: the Lunar Reconnaissance Orbiter, and LCROSS.",
        target: "Earth", isLaunch: true, model: "lro", size: 0.05, zoom: 1.4
      },
      {
        stage: "C", title: "Lunar orbit", date: "June 23, 2009",
        caption: "LRO fires its engine and enters orbit around the Moon.",
        narration: "Five days later, LRO fires its engine and goes into orbit around the Moon.",
        target: "Moon", gap: 0.12, model: "lro", size: 0.04, zoom: 0.5, action: "orbit"
      },
      {
        stage: "E", title: "Mapping the Moon", date: "Since 2009",
        caption: "With seven instruments, LRO maps the Moon in detail. Its camera has photographed the Apollo landing sites.",
        narration: "Since then, LRO has mapped the Moon in detail with seven instruments, and even photographed the Apollo landing sites.",
        target: "Moon", gap: 0.12, around: 1.4, model: "lro", size: 0.04, zoom: 0.5
      }
    ]
  }
};

// Stage letters for the replays that already existed (data/hardware-replays.js and data/spacecraft.js), event by event.
export const STAGE_TAGS = {
  apollo11: ["A", "B", "C", "C", "C", "D", "D"],
  curiosity: ["A", "B", "C", "C"],
  perseverance: ["A", "B", "C", "C", "C"],
  "galileo-probe": ["A", "B", "B", "B", "C", "C"],
  cassini: ["A", "B", "B", "B", "C", "C", "E"],
  huygens: ["A", "B", "C", "C"],
  "Voyager 1": ["A", "B", "B", "B"],
  "Voyager 2": ["A", "B", "B", "B", "B", "B"],
  "Parker Solar Probe": ["A", "B", "B", "B"]
};

// Special effects for some events of those older replays
export const EVENT_ACTIONS = {
  apollo11: { 5: "reentry", 6: "splashdown" },
  cassini: { 4: "orbit" }
};
