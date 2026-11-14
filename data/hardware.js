// Researched profiles for the three hardware sites on the Moon and Mars.
// Facts come from the NASA and other sources linked in each entry.
// Check each fact again before presenting. Status text changes over time, so every status has an "asOf" date.
//
// lat = latitude (north is positive). lon = longitude (east is positive).
// image.src is a local file you download (see the instructions). image.pageUrl is where it comes from.

export const hardwareList = [
  {
    id: "apollo11",
    kind: "landing",
    name: "Apollo 11 Lunar Module Eagle and surface experiments",
    breadcrumbName: "Apollo 11",
    destination: "Moon",
    mission: "Apollo 11",
    location: "Tranquility Base, Sea of Tranquility (Mare Tranquillitatis)",
    lat: 0.67416,
    lon: 23.47314,
    landingDate: "July 20, 1969",
    image: {
      src: "assets/images/hardware/apollo11.jpg",
      alt: "Astronaut Buzz Aldrin on the Moon after setting up experiments, with the Lunar Module Eagle in the background",
      credit: "Image: NASA (Apollo 11, photographed by Neil Armstrong).",
      pageUrl: "https://www.nasa.gov/image-article/aldrin-gazes-tranquility-base"
    },
    summary:
      "The Lunar Module Eagle made the first crewed landing on the Moon. Its descent stage, a seismic experiment package and a laser reflector were left at Tranquility Base.",
    purpose:
      "The Lunar Module carried two astronauts to the Moon's surface and back up to the command module in lunar orbit. The experiments were left behind to measure moonquakes and the exact distance between Earth and the Moon.",
    history: [
      { date: "July 16, 1969", text: "Apollo 11 launches on a Saturn V rocket from Kennedy Space Center, Florida." },
      { date: "July 20, 1969", text: "Neil Armstrong and Buzz Aldrin land Eagle in the Sea of Tranquility at 20:17 UTC. Michael Collins stays in lunar orbit aboard the command module." },
      { date: "July 20, 1969", text: "In about two and a half hours on the surface, the astronauts collect 21.55 kg (47.5 lb) of rock samples, take photographs, and set up the Passive Seismic Experiment Package and the Laser Ranging Retroreflector." },
      { date: "July 21, 1969", text: "The astronauts lift off in Eagle's ascent stage at 17:54 UTC. The descent stage stays on the surface and serves as the launch pad." },
      { date: "August 1, 1969", text: "Lick Observatory in California records the first laser reflection from the Apollo 11 reflector." }
    ],
    contributions: [
      "The seismic experiment returned the first lunar seismic data, for about three weeks after the astronauts left.",
      "The laser reflector lets observatories measure the Earth-Moon distance very precisely. Its data has shown that the Moon is slowly moving away from Earth (about 3.8 cm per year) and has been used to test Einstein's theory of general relativity.",
      "The 21.55 kg of lunar rock samples were returned to Earth for laboratory study."
    ],
    status: {
      text:
        "The descent stage and the experiments were left at Tranquility Base. NASA has described the laser reflector as the only Apollo experiment still returning data, and observatories have continued to use Apollo-era reflectors for laser ranging.",
      asOf: "Sources from about 2019. Not re-checked for 2026.",
      sourceLabel: "Space.com: Apollo reflector experiment, 50 years later",
      sourceUrl: "https://www.space.com/apollo-retroreflector-experiment-still-going-50-years-later.html"
    },
    markerNote: "The marker shows the landing site where this hardware was left.",
    coordinateNote:
      "Coordinates from NASA's NSSDC list, measured from Lunar Reconnaissance Orbiter images. The Moon map is simplified, so the marker position is approximate.",
    sources: [
      { label: "NASA: Aldrin Gazes at Tranquility Base (image and caption)", url: "https://www.nasa.gov/image-article/aldrin-gazes-tranquility-base" },
      { label: "NASA NSSDC: Apollo landing site coordinates", url: "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html" },
      { label: "LROC: Coordinates of human features (PDF)", url: "https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf" },
      { label: "APS Physics: Lunar laser ranging turns 50", url: "https://physics.aps.org/articles/v12/84" },
      { label: "Space Center Houston: Apollo 11 facts (not NASA)", url: "https://spacecenter.org/apollo-11-three-steps-one-giant-leap/" }
    ],
    landing: {
      style: "retro", lander: "lunar-module", scale: 2.6, crew: true,
      captions: {
        braking: "With no air on the Moon, Eagle slows down by firing its descent engine against its direction of travel.",
        touchdown: "Eagle touches down in the Sea of Tranquility at 20:17 UTC on July 20, 1969.",
        surface: "\"The Eagle has landed.\" About six and a half hours later, Armstrong and Aldrin step onto the surface."
      }
    }
  },

  {
    id: "curiosity",
    kind: "landing",
    name: "Curiosity rover",
    breadcrumbName: "Curiosity",
    destination: "Mars",
    mission: "Mars Science Laboratory (Curiosity)",
    location: "Bradbury Landing, Aeolis Palus, Gale Crater",
    lat: -4.5895,
    lon: 137.4417,
    landingDate: "August 6, 2012 (UTC)",
    image: {
      src: "assets/images/hardware/curiosity.jpg",
      alt: "Self-portrait of NASA's Curiosity rover on Mars",
      credit: "Image: NASA/JPL-Caltech/MSSS (self-portrait, PIA16239).",
      pageUrl: "https://photojournal.jpl.nasa.gov/catalog/PIA16239"
    },
    summary:
      "A car-sized NASA rover exploring Gale Crater and Mount Sharp to learn whether Mars could ever have supported microbial life.",
    purpose:
      "Curiosity's main goal is to find out whether Mars once had conditions suitable for microbial life. Its extended mission looks for more environments that could have supported life and could have preserved organic molecules, and studies the role of water and how Mars's climate changed.",
    history: [
      { date: "November 26, 2011", text: "Launches from Cape Canaveral, Florida, on an Atlas V rocket." },
      { date: "August 6, 2012 (UTC)", text: "Lands in Gale Crater at the site later named Bradbury Landing." },
      { date: "August 2012 to September 2014", text: "Prime mission. In its first year the rover reaches Yellowknife Bay, where drilled samples show evidence of an ancient freshwater lake." },
      { date: "October 2014 onward", text: "Extended mission. The rover begins climbing the lower foothills of Mount Sharp, the 5 km (3 mile) tall mountain inside Gale Crater." },
      { date: "August 26, 2026", text: "Reaches 1 kilometer of elevation gain above the crater floor (sol 4,996)." }
    ],
    contributions: [
      "Found evidence that Gale Crater once held an ancient freshwater lake with the chemical elements and energy sources microbes need.",
      "Detected organic molecules in drilled rock samples. NASA has reported the largest organic molecules found on Mars so far in a sample called \"Cumberland\".",
      "Measured changes in methane in the Martian atmosphere.",
      "Has collected 42 powdered rock samples with its drill, and keeps reading the layers of Mount Sharp as a record of how the environment changed."
    ],
    status: {
      text:
        "Operating. NASA reports Curiosity is still climbing the lower slopes of Mount Sharp. It passed 1 km of elevation gain on August 26, 2026 and imaged the crater floor below on September 5, 2026 (sol 5,006).",
      asOf: "September 2026 (NASA).",
      sourceLabel: "NASA Science: Curiosity mission page",
      sourceUrl: "https://science.nasa.gov/mission/msl-curiosity/"
    },
    markerNote: "The marker shows where the rover landed, not where it is now. Curiosity has since driven far up Mount Sharp.",
    coordinateNote:
      "Coordinates as listed on Wikipedia, which cites NASA. Not yet checked against NASA primary data. The Mars surface is an illustration, so the marker position is approximate.",
    sources: [
      { label: "NASA Science: Curiosity (Mars Science Laboratory)", url: "https://science.nasa.gov/mission/msl-curiosity/" },
      { label: "NASA/JPL: Curiosity quick facts poster (PDF)", url: "https://mars.nasa.gov/files/mep/CuriosityPoster-small.pdf" },
      { label: "NASA/JPL: Curiosity looks back after elevation milestone (Sept 2026)", url: "https://www.jpl.nasa.gov/images/pia26781-nasas-curiosity-looks-back-after-reaching-elevation-milestone/" },
      { label: "NASA/JPL Photojournal: map of Bradbury Landing", url: "https://photojournal.jpl.nasa.gov/catalog/PIA17064" },
      { label: "Wikipedia: Bradbury Landing (coordinates)", url: "https://en.wikipedia.org/wiki/Bradbury_Landing" }
    ],
    landing: {
      style: "skycrane", rover: "curiosity", roverScale: 1, shellRadius: 2.25, chuteRadius: 10.5,
      captions: {
        entry: "Curiosity enters the atmosphere about 131 km above the surface at roughly 13,000 mph. Landing takes about seven minutes.",
        powered: "Curiosity is too heavy for airbags. The descent stage drops free and fires its eight rocket engines.",
        skycrane: "The descent stage lowers the rover on a 7.5 m bridle of three nylon tethers until the wheels touch the ground."
      }
    }
  },

  {
    id: "perseverance",
    kind: "landing",
    name: "Perseverance rover",
    breadcrumbName: "Perseverance",
    destination: "Mars",
    mission: "Mars 2020 (Perseverance)",
    location: "Octavia E. Butler Landing, Jezero Crater",
    lat: 18.44,
    lon: 77.45,
    landingDate: "February 18, 2021",
    image: {
      src: "assets/images/hardware/perseverance.jpg",
      alt: "Selfie of NASA's Perseverance rover next to a rock called Rochette",
      credit: "Image: NASA/JPL-Caltech/MSSS (selfie at \"Rochette\", September 10, 2021).",
      pageUrl: "https://science.nasa.gov/mars2020"
    },
    summary:
      "A car-sized NASA rover exploring Jezero Crater, an ancient lake basin, in search of signs of ancient life and collecting samples for possible return to Earth.",
    purpose:
      "Perseverance seeks signs of ancient life and collects rock and regolith samples in sealed tubes for a possible future mission to bring to Earth. It also carried technology demonstrations: the Ingenuity helicopter and an experiment to make oxygen from the Martian atmosphere.",
    history: [
      { date: "July 30, 2020", text: "Launches from Cape Canaveral, Florida, on an Atlas V rocket." },
      { date: "February 18, 2021", text: "Lands in Jezero Crater, a crater about 45 km wide. NASA later names the site Octavia E. Butler Landing." },
      { date: "April 19, 2021", text: "The Ingenuity helicopter makes the first powered flight on Mars." },
      { date: "September 2021", text: "Collects its first rock core samples at a rock called Rochette." },
      { date: "January 2024", text: "Ingenuity makes its 72nd and final flight on January 18. NASA ends the helicopter's mission on January 25." },
      { date: "July 2024", text: "Finds a rock called Cheyava Falls that holds potential biosignatures." },
      { date: "October 11, 2026", text: "Reaches 45.22 km (28.10 miles) driven, a new off-world driving distance record." }
    ],
    contributions: [
      "Showed that Jezero Crater once had a habitable, stable lake, delta and river system.",
      "Found two different kinds of volcanic rock on the crater floor that had interacted with water.",
      "A sample from Cheyava Falls (called \"Sapphire Canyon\") holds potential biosignatures. This is not proof of life. It needs study in laboratories on Earth.",
      "Ingenuity proved powered flight is possible on Mars, and the rover produced oxygen from the Martian atmosphere in an experiment for future human missions.",
      "Made the first on-the-ground recordings of the Martian soundscape."
    ],
    status: {
      text:
        "Operating. NASA reports Perseverance has driven 45.22 km as of October 11, 2026, an off-world distance record. It has collected more than two dozen rock and regolith samples. Plans to return the samples to Earth are uncertain: NASA was studying alternative Mars Sample Return concepts through mid-2026.",
      asOf: "October 2026 (NASA) and December 2025 (SpaceNews, for sample return).",
      sourceLabel: "NASA Science: Mars 2020 Perseverance rover",
      sourceUrl: "https://science.nasa.gov/mission/mars-2020-perseverance/"
    },
    markerNote: "The marker shows where the rover landed, not where it is now. Perseverance has since driven far from its landing site.",
    coordinateNote:
      "Coordinates (rounded) as listed on Wikipedia, which cites NASA. Not yet checked against NASA primary data. The Mars surface is an illustration, so the marker position is approximate.",
    sources: [
      { label: "NASA Science: Mars 2020 Perseverance rover", url: "https://science.nasa.gov/mission/mars-2020-perseverance/" },
      { label: "NASA Science: Perseverance discoveries and highlights", url: "https://science.nasa.gov/perseverance-rover/" },
      { label: "NASA Science: Mars 2020 overview", url: "https://science.nasa.gov/mars2020" },
      { label: "The Planetary Society: Perseverance and Ingenuity", url: "https://www.planetary.org/space-missions/perseverance" },
      { label: "SpaceNews: Perseverance and Mars Sample Return uncertainty", url: "https://spacenews.com/perseverance-continues-science-mission-amid-uncertainty-about-mars-sample-return/" },
      { label: "Wikipedia: Octavia E. Butler Landing (coordinates)", url: "https://en.wikipedia.org/wiki/Octavia_E._Butler_Landing" }
    ],
    landing: {
      style: "skycrane", rover: "perseverance", roverScale: 1, shellRadius: 2.25, chuteRadius: 10.5,
      captions: {
        parachute: "A system called Range Trigger picks the best moment to open the parachute, so it can brake the spacecraft over the target.",
        powered: "Terrain-Relative Navigation compares camera pictures with an onboard map to steer to a safe spot. Then the descent stage fires its engines.",
        skycrane: "About 20 m above the surface, the descent stage lowers Perseverance on cables, and cuts them once the wheels touch down."
      }
    }
  },

  // ===================== MOON (added October 2026, facts checked on NASA pages) =====================

  {
    id: "apollo15",
    kind: "landing",
    name: "Apollo 15 lunar module and Lunar Roving Vehicle",
    breadcrumbName: "Apollo 15",
    destination: "Moon",
    mission: "Apollo 15",
    location: "Hadley-Apennine, at the foot of the Apennine mountains (Mare Imbrium region)",
    lat: 26.13239,
    lon: 3.6333,
    landingDate: "July 30, 1971 (22:16 UTC)",
    image: null,
    summary:
      "The first Apollo mission to use the Lunar Roving Vehicle. Astronauts David Scott and James Irwin drove it a total of 27.9 km across the Hadley-Apennine region.",
    purpose:
      "Apollo 15 carried two astronauts to the Moon's surface for a stay of about three days. The rover let them travel much farther from the lunar module than earlier crews could on foot.",
    history: [
      { date: "July 26, 1971", text: "Launches at 9:34 a.m. EDT from Launch Pad 39A, Kennedy Space Center. Crew: David Scott (commander), James Irwin (lunar module pilot) and Alfred Worden (command module pilot, who stays in lunar orbit)." },
      { date: "July 30, 1971", text: "Scott and Irwin land at Hadley-Apennine at 22:16 UTC." },
      { date: "July 31, 1971", text: "The crew deploys the first Lunar Roving Vehicle. Its front steering briefly stops working, so they drive with rear-wheel steering; it is fixed the next day." },
      { date: "August 2, 1971", text: "The ascent stage lifts off from the Moon at 17:11 UTC. The descent stage stays behind." },
      { date: "August 7, 1971", text: "Splashdown in the Pacific Ocean." }
    ],
    contributions: [
      "Three moonwalks totaling 18 hours 35 minutes, plus a 33-minute stand-up excursion on landing day.",
      "Three rover drives of 10.3 km, 12.5 km and 5.1 km: 27.9 km in total.",
      "77.31 kg of lunar rock and soil samples returned to Earth.",
      "An experiments package (ALSEP) was left running on the surface until it was shut down on September 30, 1977."
    ],
    status: {
      text: "The lunar module's descent stage and the experiments package were left at Hadley-Apennine. The experiments were switched off in 1977.",
      asOf: "NASA NSSDCA catalog, checked October 2026.",
      sourceLabel: "NASA NSSDCA: Apollo 15 Lunar Module / ALSEP",
      sourceUrl: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-063C"
    },
    markerNote: "The marker shows the lunar module landing site.",
    coordinateNote: "Coordinates of the lunar module from NASA's NSSDC Apollo landing site list. The marker position on the globe is approximate.",
    sources: [
      { label: "NASA: Apollo 15 mission page", url: "https://www.nasa.gov/mission/apollo-15/" },
      { label: "NASA NSSDCA: Apollo 15 Lunar Module / ALSEP", url: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-063C" },
      { label: "NASA NSSDC: Apollo landing site coordinates", url: "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html" },
      { label: "NASA: Apollo 15 astronauts deploy the first Lunar Roving Vehicle", url: "https://www.nasa.gov/image-article/this-week-nasa-history-apollo-15-astronauts-deploy-first-lunar-roving-vehicle-july-31-1971/" }
    ],
    landing: {
      style: "retro", lander: "lunar-module", scale: 2.6, crew: true, rover: "lrv", roverScale: 1.05,
      captions: {
        braking: "With no air on the Moon, the lunar module slows down by firing its descent engine against its direction of travel.",
        drive: "On July 31, 1971 the crew unfolds the first Lunar Roving Vehicle and drives off to explore. Over three days they drive 27.9 km."
      }
    }
  },

  {
    id: "apollo17",
    kind: "landing",
    name: "Apollo 17 lunar module and Lunar Roving Vehicle",
    breadcrumbName: "Apollo 17",
    destination: "Moon",
    mission: "Apollo 17",
    location: "Taurus-Littrow valley, on the southeastern rim of Mare Serenitatis (Sea of Serenity)",
    lat: 20.1911,
    lon: 30.7723,
    landingDate: "December 11, 1972 (19:54 UTC)",
    image: null,
    summary:
      "The last Apollo Moon landing. Eugene Cernan and Harrison Schmitt, the first scientist to walk on the Moon, explored the Taurus-Littrow valley with a lunar rover.",
    purpose:
      "Apollo 17 explored a valley with both highland rocks and dark volcanic deposits, and set up a large set of science experiments on the surface.",
    history: [
      { date: "December 7, 1972", text: "Launches from Kennedy Space Center. Crew: Eugene Cernan (commander), Harrison Schmitt (lunar module pilot) and Ronald Evans (command module pilot)." },
      { date: "December 11, 1972", text: "Cernan and Schmitt land in the Taurus-Littrow valley at 19:54 UTC." },
      { date: "December 1972", text: "During the second moonwalk, Schmitt discovers a patch of orange soil." },
      { date: "December 14, 1972", text: "The ascent stage lifts off at 22:54 UTC. Cernan is the last person (so far) to leave footprints on the Moon." },
      { date: "December 19, 1972", text: "Splashdown after a 13-day mission." }
    ],
    contributions: [
      "Three moonwalks totaling about 22 hours. NASA's records give the rover distance as about 30 to 35 km (two NASA pages give different totals).",
      "110.52 kg of lunar samples returned to Earth.",
      "Experiments left on the surface included heat flow, a gravimeter, seismic profiling and an atmosphere sensor. They were shut down on September 30, 1977."
    ],
    status: {
      text: "The descent stage and the experiments package were left at Taurus-Littrow. The experiments were switched off in 1977.",
      asOf: "NASA NSSDCA catalog, checked October 2026.",
      sourceLabel: "NASA NSSDCA: Apollo 17 Lunar Module / ALSEP",
      sourceUrl: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1972-096C"
    },
    markerNote: "The marker shows the lunar module landing site.",
    coordinateNote: "Coordinates of the lunar module from NASA's NSSDC Apollo landing site list. The marker position on the globe is approximate.",
    sources: [
      { label: "NASA: Apollo 17 mission page", url: "https://www.nasa.gov/mission/apollo-17/" },
      { label: "NASA NSSDCA: Apollo 17 Lunar Module / ALSEP", url: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1972-096C" },
      { label: "NASA NSSDC: Apollo lunar landings summary", url: "https://nssdc.gsfc.nasa.gov/planetary/lunar/apolloland.html" },
      { label: "NASA NSSDC: Apollo landing site coordinates", url: "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html" }
    ],
    landing: {
      style: "retro", lander: "lunar-module", scale: 2.6, crew: true, rover: "lrv", roverScale: 1.05,
      captions: {
        drive: "Cernan and Schmitt drive the rover around the Taurus-Littrow valley. On the second drive, Schmitt finds orange soil."
      }
    }
  },

  {
    id: "surveyor1",
    kind: "landing",
    name: "Surveyor 1",
    breadcrumbName: "Surveyor 1",
    destination: "Moon",
    mission: "Surveyor 1",
    location: "Inside a 100 km crater north of Flamsteed crater, southwest Oceanus Procellarum (Ocean of Storms)",
    lat: -2.4745,
    lon: -43.3398,
    landingDate: "June 2, 1966 (06:17 UTC)",
    image: null,
    summary:
      "The first American spacecraft to make a soft landing on the Moon. It sent back 11,240 pictures from the surface.",
    purpose:
      "Surveyor 1 was built to prove that a robot could make a controlled, soft landing on the Moon, three years before astronauts landed.",
    history: [
      { date: "May 30, 1966", text: "Launches on an Atlas-Centaur rocket from Cape Kennedy, Florida." },
      { date: "June 2, 1966", text: "Lands at 06:17 UTC, about 9 miles from its target, bouncing once before settling." },
      { date: "June 14, 1966", text: "Lunar nightfall. The camera has already sent back more than 10,000 pictures." },
      { date: "July 13, 1966", text: "After a second lunar sunset, its battery voltage drops sharply and the mission effectively ends." },
      { date: "January 7, 1967", text: "Last contact with the spacecraft." }
    ],
    contributions: [
      "Achieved the first American soft landing on the Moon.",
      "Returned 11,240 pictures in total from the surface.",
      "Demonstrated the landing method: radar-triggered braking rocket, radar-guided engines and a gentle touchdown."
    ],
    status: {
      text: "Silent since January 7, 1967. The lander is still at its landing site.",
      asOf: "NASA NSSDCA catalog, checked October 2026.",
      sourceLabel: "NASA NSSDCA: Surveyor 1",
      sourceUrl: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1966-045A"
    },
    markerNote: "The marker shows the landing site.",
    coordinateNote: "Coordinates from NASA's NSSDCA catalog (2.4745 S, 316.6602 E). The marker position on the globe is approximate.",
    sources: [
      { label: "NASA NSSDCA: Surveyor 1", url: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1966-045A" },
      { label: "NASA: 55 Years Ago, Surveyor 1 Makes a Soft Landing on the Moon", url: "https://www.nasa.gov/history/55-years-ago-surveyor-1-makes-a-soft-landing-on-the-moon/" }
    ],
    landing: {
      style: "retro", lander: "surveyor", scale: 1.05, engineCutoff: 3.4,
      captions: {
        braking: "A solid-fuel retro-rocket, triggered by radar, does most of the braking. It is dropped at about 11 km above the surface.",
        approach: "Three small vernier engines, guided by radar, control the rest of the descent.",
        touchdown: "The engines shut off 3.4 m above the ground. Surveyor drops the rest of the way and touches down at about 3 m/s.",
        surface: "Surveyor 1 is the first American spacecraft to soft-land on the Moon. Its camera starts sending pictures home."
      }
    }
  },

  {
    id: "lcross",
    kind: "impact",
    dateLabel: "Impact date",
    name: "LCROSS impact site (Centaur rocket stage and LCROSS spacecraft)",
    breadcrumbName: "LCROSS",
    destination: "Moon",
    mission: "LCROSS (Lunar Crater Observation and Sensing Satellite)",
    location: "Cabeus crater, near the Moon's south pole (always in shadow)",
    lat: -84.6796,
    lon: -48.7093,
    landingDate: "October 9, 2009 (11:31 UTC)",
    image: null,
    summary:
      "NASA crashed a used rocket stage into a crater that never sees sunlight, then flew a spacecraft through the cloud of debris to look for water. It found water.",
    purpose:
      "LCROSS was designed to find out whether water ice is hidden in the permanently shadowed craters near the Moon's poles.",
    history: [
      { date: "June 18, 2009", text: "Launches with the Lunar Reconnaissance Orbiter (LRO) on an Atlas V 401 rocket from Cape Canaveral." },
      { date: "October 9, 2009", text: "The Centaur upper stage hits Cabeus crater at 11:31 UTC, throwing out about 350 metric tons of material and leaving a crater about 20 m across." },
      { date: "October 9, 2009", text: "Four minutes later LCROSS flies through the plume taking measurements, then hits the Moon itself at 11:36 UTC, at about 9,000 km/h." },
      { date: "November 13, 2009", text: "NASA announces that the data shows water near the Moon's south pole." },
      { date: "October 21, 2010", text: "Detailed results are published: in places the water is mostly pure ice grains." }
    ],
    contributions: [
      "Confirmed water near the Moon's south pole, partly as nearly pure ice grains.",
      "Volatile substances made up as much as 20 percent of the material thrown up by the impact, including methane, ammonia, hydrogen gas, carbon dioxide and carbon monoxide.",
      "Also found light metals such as sodium and mercury, and possibly silver."
    ],
    status: {
      text: "Both impact sites are in Cabeus crater. The mission ended with the impacts.",
      asOf: "NASA, checked October 2026.",
      sourceLabel: "NASA Science: LCROSS",
      sourceUrl: "https://science.nasa.gov/mission/lcross/"
    },
    markerNote: "The marker shows where the Centaur stage hit. LCROSS hit nearby.",
    coordinateNote: "Coordinates from NASA's NSSDC list of lunar impact sites (Centaur: 84.6796 S, 48.7093 W). The marker position on the globe is approximate.",
    sources: [
      { label: "NASA Science: LCROSS", url: "https://science.nasa.gov/mission/lcross/" },
      { label: "NASA: NASA Missions Uncover the Moon's Buried Treasures (2010)", url: "https://www.nasa.gov/news-release/nasa-missions-uncover-the-moons-buried-treasures/" },
      { label: "NASA NSSDC: Lunar impact sites", url: "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html" }
    ],
    landing: {
      style: "impact",
      impactors: [
        {
          model: "centaur", scale: 1, from: [-260, 620, 180], at: [0, 0, 0], duration: 7,
          blast: 1.3, craterRadius: 10, cameraBack: 60,
          title: "Centaur impact",
          caption: "The used Centaur rocket stage hits Cabeus crater, digging a crater about 20 m across and throwing up a plume of debris."
        },
        {
          model: "lcross", scale: 1.5, from: [-170, 480, 120], at: [36, 0, 22], duration: 7,
          blast: 0.7, craterRadius: 5, cameraBack: 30,
          title: "LCROSS flies through the plume",
          caption: "Four minutes later (shortened here), LCROSS flies through the plume measuring it, then crashes nearby at about 9,000 km/h."
        }
      ],
      captions: {
        findings: "The measurements showed water, partly as nearly pure ice grains, plus methane, ammonia, carbon dioxide and light metals."
      }
    }
  },

  {
    id: "blueghost1",
    kind: "landing",
    partner: "Firefly Aerospace, carrying NASA instruments (NASA CLPS)",
    name: "Blue Ghost Mission 1 lander",
    breadcrumbName: "Blue Ghost 1",
    destination: "Moon",
    mission: "Blue Ghost Mission 1 (Firefly Aerospace, for NASA's Commercial Lunar Payload Services)",
    location: "Near Mons Latreille, a volcanic feature in Mare Crisium",
    lat: 18.56,
    lon: 61.81,
    landingDate: "March 2, 2025 (3:34 a.m. EST)",
    image: null,
    summary:
      "A commercial lander built by Firefly Aerospace that carried 10 NASA science and technology instruments. It landed upright and worked for about 14 days.",
    purpose:
      "Under NASA's Commercial Lunar Payload Services (CLPS) initiative, companies deliver NASA instruments to the Moon. Blue Ghost Mission 1 was Firefly's first delivery and first Moon landing.",
    history: [
      { date: "January 15, 2025", text: "Launches at 1:11 a.m. EST on a SpaceX Falcon 9 from Launch Complex 39A, Kennedy Space Center." },
      { date: "March 2, 2025", text: "Lands upright and stable near Mons Latreille in Mare Crisium at 3:34 a.m. EST." },
      { date: "March 2025", text: "Images a total solar eclipse and a sunset from the lunar surface." },
      { date: "March 16, 2025", text: "The mission ends after about 14 days of surface operations, plus several hours into the lunar night." }
    ],
    contributions: [
      "Returned 119 gigabytes of data, including 51 gigabytes of science and technology data.",
      "The LISTER instrument drilled up to about 1 m (3 feet) deep: the deepest robotic planetary subsurface thermal probe so far.",
      "The LuGRE receiver tracked GPS and Galileo navigation signals on the way to the Moon and on its surface.",
      "Lunar PlanetVac collected and sorted lunar soil using puffs of nitrogen gas."
    ],
    status: {
      text: "Mission complete on March 16, 2025. The lander remains at its landing site.",
      asOf: "NASA, March 2025.",
      sourceLabel: "NASA: NASA Science Continues After Firefly's First Moon Mission Concludes",
      sourceUrl: "https://www.nasa.gov/news-release/nasa-science-continues-after-fireflys-first-moon-mission-concludes/"
    },
    markerNote: "The marker shows the landing site.",
    coordinateNote: "Approximate coordinates as listed by NASA's Lunar Reconnaissance Orbiter camera team (LROC). NASA's news releases name the area but give no coordinates.",
    sources: [
      { label: "NASA: Touchdown! Carrying NASA Science, Firefly's Blue Ghost Lands on Moon", url: "https://www.nasa.gov/news-release/touchdown-carrying-nasa-science-fireflys-blue-ghost-lands-on-moon/" },
      { label: "NASA: Liftoff! NASA Sends Science, Tech to Moon on Firefly, SpaceX Flight", url: "https://www.nasa.gov/news-release/liftoff-nasa-sends-science-tech-to-moon-on-firefly-spacex-flight/" },
      { label: "NASA: NASA Science Continues After Firefly's First Moon Mission Concludes", url: "https://www.nasa.gov/news-release/nasa-science-continues-after-fireflys-first-moon-mission-concludes/" },
      { label: "LROC (NASA LRO camera team): Blue Ghost lander seen from above", url: "https://www.lroc.asu.edu/images/1407" }
    ],
    landing: {
      style: "retro", lander: "blue-ghost", scale: 1,
      captions: {
        surface: "Blue Ghost lands upright and stable. Its 10 NASA instruments start working through one lunar day (about 14 Earth days)."
      }
    }
  },

  // ===================== MARS (added October 2026) =====================

  {
    id: "viking1",
    kind: "landing",
    name: "Viking 1 lander",
    breadcrumbName: "Viking 1",
    destination: "Mars",
    mission: "Viking 1",
    location: "Western slopes of Chryse Planitia (Golden Plain)",
    lat: 22.27,
    lon: -47.95,
    landingDate: "July 20, 1976 (11:53 UTC)",
    image: null,
    summary:
      "NASA's first lander to work on Mars. It took the first photograph from the Martian surface and tested the soil for signs of life.",
    purpose:
      "Viking 1 studied Mars from the surface: taking pictures, measuring the weather, and running biology experiments on soil samples to look for life.",
    history: [
      { date: "August 20, 1975", text: "Launches on a Titan IIIE-Centaur from Launch Complex 41, Cape Canaveral." },
      { date: "June 19, 1976", text: "Enters orbit around Mars." },
      { date: "July 20, 1976", text: "The lander touches down at 11:53 UTC in Chryse Planitia, about 28 km from its planned target, and takes the first photo from the surface of Mars." },
      { date: "July 28, 1976", text: "The robot arm collects the first soil samples for the biology experiments." },
      { date: "November 11, 1982", text: "Contact is lost after a faulty command from Earth. Later attempts to reach it fail." }
    ],
    contributions: [
      "The first photograph from the surface of Mars, and a 300-degree panorama.",
      "Biology experiments whose combined results NASA describes as possibly a weak positive for life, while the test for organic compounds found none.",
      "Years of weather reports: from about -86 °C before dawn to about -33 °C in the afternoon."
    ],
    status: {
      text: "Not operating since November 1982. The lander is still in Chryse Planitia.",
      asOf: "NASA, checked October 2026.",
      sourceLabel: "NASA Science: Viking 1",
      sourceUrl: "https://science.nasa.gov/mission/viking-1/"
    },
    markerNote: "The marker shows the landing site.",
    coordinateNote: "Coordinates from NASA's Mars24 lander list (22.27 N, 312.05 E). NASA's Viking 1 page gives 22.483 N, 47.94 W. The marker position on the globe is approximate.",
    sources: [
      { label: "NASA Science: Viking 1", url: "https://science.nasa.gov/mission/viking-1/" },
      { label: "NASA Science: How We Land on Mars", url: "https://science.nasa.gov/planetary-science/programs/mars-exploration/mission-timeline/how-we-land-on-mars/" },
      { label: "NASA GISS Mars24: Mars lander locations", url: "https://www.giss.nasa.gov/tools/mars24/help/landers.html" }
    ],
    landing: {
      style: "retro", lander: "viking-lander", scale: 1.2, parachute: true, shellRadius: 1.75, chuteRadius: 8,
      captions: {
        entry: "Released by its orbiter, the lander enters the atmosphere inside a lifting aeroshell.",
        parachute: "A parachute slows the descent.",
        powered: "Adjustable liquid-fueled rocket engines take over, with radar controlling the speed."
      }
    }
  },

  {
    id: "pathfinder",
    kind: "landing",
    name: "Mars Pathfinder lander and Sojourner rover",
    breadcrumbName: "Pathfinder",
    destination: "Mars",
    mission: "Mars Pathfinder",
    location: "Ares Vallis, an ancient flood plain",
    lat: 19.47,
    lon: -33.25,
    landingDate: "July 4, 1997",
    image: null,
    summary:
      "The first mission to land with airbags, and the first robotic rover on Mars: Sojourner, which stood 30 cm tall and weighed 10.6 kg.",
    purpose:
      "Mars Pathfinder tested a low-cost way to land on Mars and delivered a small rover to study rocks and soil.",
    history: [
      { date: "December 4, 1996", text: "Launches on a Delta II rocket from Cape Canaveral." },
      { date: "July 4, 1997", text: "Lands in Ares Vallis, bouncing on airbags more than 15 times before stopping." },
      { date: "July 5, 1997", text: "Sojourner rolls onto the surface (on the mission's second sol)." },
      { date: "September 27, 1997", text: "Final data transmission from the lander." }
    ],
    contributions: [
      "More than 16,500 pictures from the lander and 550 from the rover.",
      "More than 15 chemical analyses of rocks and soil.",
      "Rounded pebbles and the flood channel suggest that Mars was once warmer and wetter, with running water."
    ],
    status: {
      text: "Silent since September 27, 1997. The lander and Sojourner are still in Ares Vallis.",
      asOf: "NASA, checked October 2026.",
      sourceLabel: "NASA Science: Mars Pathfinder",
      sourceUrl: "https://science.nasa.gov/mission/mars-pathfinder/"
    },
    markerNote: "The marker shows the landing site.",
    coordinateNote: "Coordinates from NASA's Mars24 lander list (19.47 N, 326.75 E). The marker position on the globe is approximate.",
    sources: [
      { label: "NASA Science: Mars Pathfinder", url: "https://science.nasa.gov/mission/mars-pathfinder/" },
      { label: "NASA Science: How We Land on Mars", url: "https://science.nasa.gov/planetary-science/programs/mars-exploration/mission-timeline/how-we-land-on-mars/" },
      { label: "NASA GISS Mars24: Mars lander locations", url: "https://www.giss.nasa.gov/tools/mars24/help/landers.html" }
    ],
    landing: {
      style: "airbag", rover: "sojourner", roverScale: 1, scale: 1.2, airbagScale: 1.6,
      captions: {
        parachute: "A parachute slows the lander. Then rockets bring it almost to a stop about 20 m above the ground.",
        inflate: "About 100 m above the surface, the airbags inflate: four big bags, each made of six smaller balls.",
        bounce: "Pathfinder bounces more than 15 times, up to about 15 m high, before rolling to a stop.",
        drive: "On July 5, 1997, Sojourner rolls off the lander: the first robotic rover on Mars."
      }
    }
  },

  {
    id: "spirit",
    kind: "landing",
    name: "Spirit rover (Mars Exploration Rover A)",
    breadcrumbName: "Spirit",
    destination: "Mars",
    mission: "Mars Exploration Rover: Spirit",
    location: "Gusev crater",
    lat: -14.57,
    lon: 175.48,
    landingDate: "January 4, 2004 (UTC)",
    image: null,
    summary:
      "A solar-powered rover planned for 90 Martian days that worked for more than six years and found signs of ancient hot springs.",
    purpose:
      "Spirit searched for rocks and soils holding clues to past water on Mars.",
    history: [
      { date: "June 10, 2003", text: "Launches from Cape Canaveral." },
      { date: "January 4, 2004 (UTC)", text: "Lands in Gusev crater on airbags, about 13.4 km from its target." },
      { date: "2007", text: "Finds a patch of nearly pure silica that likely formed in hot springs or steam vents." },
      { date: "May 1, 2009", text: "Gets stuck in soft soil beside a feature called Home Plate." },
      { date: "March 22, 2010", text: "Last contact. NASA ends recovery attempts on May 25, 2011." }
    ],
    contributions: [
      "Worked for 6 years, 2 months and 19 days: more than 25 times its planned lifetime.",
      "Drove about 7.73 km.",
      "The silica deposit showed that ancient Mars was much wetter, possibly with hot springs."
    ],
    status: {
      text: "Mission ended May 25, 2011. Spirit rests near Home Plate in Gusev crater.",
      asOf: "NASA, checked October 2026.",
      sourceLabel: "NASA Science: Spirit",
      sourceUrl: "https://science.nasa.gov/mission/mer-spirit/"
    },
    markerNote: "The marker shows where Spirit landed, not where it stopped.",
    coordinateNote: "Coordinates from NASA's Mars24 lander list (14.57 S, 175.48 E). The marker position on the globe is approximate.",
    sources: [
      { label: "NASA Science: Spirit", url: "https://science.nasa.gov/mission/mer-spirit/" },
      { label: "NASA/JPL: Mars Rovers Head for Exciting Landings in January", url: "https://www.jpl.nasa.gov/news/mars-rovers-head-for-exciting-landings-in-january/" },
      { label: "NASA GISS Mars24: Mars lander locations", url: "https://www.giss.nasa.gov/tools/mars24/help/landers.html" }
    ],
    landing: {
      style: "airbag", rover: "mer-rover", roverScale: 1, scale: 1.4, airbagScale: 1.7,
      captions: {
        inflate: "The backshell lowers the lander on a tether. In the final seconds the airbags inflate and rockets on the backshell fire. The tether is cut about 15 m above the ground.",
        bounce: "Spirit's lander bounces and rolls across Gusev crater inside its airbags."
      }
    }
  },

  {
    id: "opportunity",
    kind: "landing",
    name: "Opportunity rover (Mars Exploration Rover B)",
    breadcrumbName: "Opportunity",
    destination: "Mars",
    mission: "Mars Exploration Rover: Opportunity",
    location: "Eagle crater, Meridiani Planum",
    lat: -1.95,
    lon: -5.53,
    landingDate: "January 25, 2004 (04:54 UTC)",
    image: null,
    summary:
      "A rover planned for 90 Martian days that worked for almost 15 years and drove 45.16 km, more than a marathon.",
    purpose:
      "Opportunity searched for rocks and soils holding clues to past water on Mars.",
    history: [
      { date: "July 7, 2003", text: "Launches from Cape Canaveral." },
      { date: "January 25, 2004 (UTC)", text: "Lands inside Eagle crater on airbags. The site is named Challenger Memorial Station." },
      { date: "August 9, 2011", text: "Reaches Endeavour crater after a journey of nearly three years." },
      { date: "March 2015", text: "Passes marathon distance: 42.195 km." },
      { date: "June 10, 2018", text: "Last contact, as a Mars-wide dust storm covers the rover. NASA ends the mission on February 13, 2019." }
    ],
    contributions: [
      "Drove 45.16 km in total.",
      "Found evidence of past water, including a gully that scientists were confident water helped carve.",
      "Found an iron-nickel meteorite, nicknamed \"Heat Shield Rock\", in January 2005."
    ],
    status: {
      text: "Mission ended February 13, 2019. Opportunity rests at Endeavour crater.",
      asOf: "NASA, checked October 2026.",
      sourceLabel: "NASA Science: Opportunity",
      sourceUrl: "https://science.nasa.gov/mission/mer-opportunity/"
    },
    markerNote: "The marker shows where Opportunity landed, not where it stopped.",
    coordinateNote: "Coordinates from NASA's Mars24 lander list (1.95 S, 354.47 E). The marker position on the globe is approximate.",
    sources: [
      { label: "NASA Science: Opportunity", url: "https://science.nasa.gov/mission/mer-opportunity/" },
      { label: "NASA Science: How We Land on Mars", url: "https://science.nasa.gov/planetary-science/programs/mars-exploration/mission-timeline/how-we-land-on-mars/" },
      { label: "NASA GISS Mars24: Mars lander locations", url: "https://www.giss.nasa.gov/tools/mars24/help/landers.html" }
    ],
    landing: {
      style: "airbag", rover: "mer-rover", roverScale: 1, scale: 1.4, airbagScale: 1.7,
      captions: {
        inflate: "Like its twin Spirit: lowered on a tether, airbags inflate, rockets fire, and the tether is cut about 15 m above the ground.",
        bounce: "The lander bounces and rolls, and comes to rest inside small Eagle crater."
      }
    }
  },

  {
    id: "phoenix",
    kind: "landing",
    name: "Phoenix Mars lander",
    breadcrumbName: "Phoenix",
    destination: "Mars",
    mission: "Phoenix",
    location: "Green Valley, Vastitas Borealis (the arctic plains of Mars)",
    lat: 68.22,
    lon: -125.75,
    landingDate: "May 25, 2008",
    image: null,
    summary:
      "A lander in the Martian arctic that dug into the ground and confirmed water ice just under the surface.",
    purpose:
      "Phoenix studied the icy soil of the far north of Mars, to learn about water and whether the area could ever have supported life.",
    history: [
      { date: "August 4, 2007 (UTC)", text: "Launches on a Delta II from Cape Canaveral." },
      { date: "May 25, 2008", text: "Lands in the arctic plains: the first successful stationary soft-lander on Mars since Viking 2. An orbiter photographs it hanging from its parachute." },
      { date: "July 31, 2008", text: "NASA announces that Phoenix has confirmed water on Mars from a soil sample." },
      { date: "November 2, 2008", text: "End of mission." }
    ],
    contributions: [
      "Confirmed water ice in the ground just below the surface.",
      "Found perchlorate, a chemical that could be food for microbes and a resource for future explorers.",
      "Found that the soil is alkaline and contains salts such as sodium and magnesium."
    ],
    status: {
      text: "Mission ended November 2, 2008. The lander remains in the arctic plains.",
      asOf: "NASA, checked October 2026.",
      sourceLabel: "NASA Science: Mars Phoenix",
      sourceUrl: "https://science.nasa.gov/mission/mars-phoenix/"
    },
    markerNote: "The marker shows the landing site.",
    coordinateNote: "Coordinates from NASA's Mars24 lander list (68.22 N, 234.25 E). The marker position on the globe is approximate.",
    sources: [
      { label: "NASA Science: Mars Phoenix", url: "https://science.nasa.gov/mission/mars-phoenix/" },
      { label: "NASA Science: How We Land on Mars", url: "https://science.nasa.gov/planetary-science/programs/mars-exploration/mission-timeline/how-we-land-on-mars/" },
      { label: "NASA GISS Mars24: Mars lander locations", url: "https://www.giss.nasa.gov/tools/mars24/help/landers.html" }
    ],
    landing: {
      style: "retro", lander: "phoenix", scale: 1, parachute: true, shellRadius: 1.33, chuteRadius: 6,
      captions: {
        entry: "Phoenix hits the atmosphere at nearly 13,000 mph (about 21,000 km/h).",
        parachute: "A parachute slows it down. An orbiter overhead took a picture of Phoenix hanging from it.",
        powered: "Twelve pulsed thrusters around its bottom edge slow it during the final 30 seconds.",
        surface: "Phoenix opens its round solar arrays and starts digging into the icy ground."
      }
    }
  },

  {
    id: "insight",
    kind: "landing",
    name: "InSight lander",
    breadcrumbName: "InSight",
    destination: "Mars",
    mission: "InSight",
    location: "Elysium Planitia",
    lat: 4.5,
    lon: 135.62,
    landingDate: "November 26, 2018",
    image: null,
    summary:
      "A lander that listened to the inside of Mars. Its seismometer recorded 1,319 marsquakes.",
    purpose:
      "InSight studied the deep interior of Mars (its crust, mantle and core) using a seismometer placed on the ground.",
    history: [
      { date: "November 26, 2018", text: "Lands in Elysium Planitia. Entry began about 128 km above the surface; six minutes later it had landed." },
      { date: "December 2018", text: "Takes its first selfie, not long after landing." },
      { date: "December 15, 2022", text: "Last contact, after dust on its solar panels reduced its power." },
      { date: "December 21, 2022", text: "NASA declares the mission over after two missed contact attempts." }
    ],
    contributions: [
      "Detected 1,319 marsquakes, including some caused by meteoroid impacts.",
      "Revealed details of the layers inside Mars: its crust, mantle and core.",
      "Found strong traces of Mars's ancient magnetic field, and impacts that dug up boulder-size chunks of ice."
    ],
    status: {
      text: "Mission ended December 2022. The lander remains in Elysium Planitia.",
      asOf: "NASA, December 2022.",
      sourceLabel: "NASA: NASA Retires InSight Mars Lander Mission",
      sourceUrl: "https://www.nasa.gov/missions/insight/nasa-retires-insight-mars-lander-mission-after-years-of-science/"
    },
    markerNote: "The marker shows the landing site.",
    coordinateNote: "Coordinates from NASA's Mars24 lander list (4.50 N, 135.62 E). The marker position on the globe is approximate.",
    sources: [
      { label: "NASA: NASA Retires InSight Mars Lander Mission After Years of Science", url: "https://www.nasa.gov/missions/insight/nasa-retires-insight-mars-lander-mission-after-years-of-science/" },
      { label: "NASA Science: How We Land on Mars", url: "https://science.nasa.gov/planetary-science/programs/mars-exploration/mission-timeline/how-we-land-on-mars/" },
      { label: "NASA GISS Mars24: Mars lander locations", url: "https://www.giss.nasa.gov/tools/mars24/help/landers.html" }
    ],
    landing: {
      style: "retro", lander: "insight", scale: 1, parachute: true, shellRadius: 1.33, chuteRadius: 6,
      captions: {
        entry: "InSight enters the atmosphere about 128 km above the surface. Six minutes later it will be on the ground.",
        parachute: "A parachute, with stronger lines than the one Phoenix used, slows the lander.",
        surface: "InSight opens its solar arrays, then places its seismometer (SEIS) on the ground to listen for marsquakes."
      }
    }
  },

  // ===================== MERCURY (added October 2026) =====================

  {
    id: "messenger",
    kind: "impact",
    dateLabel: "Impact date",
    name: "MESSENGER impact site",
    breadcrumbName: "MESSENGER",
    destination: "Mercury",
    mission: "MESSENGER (MErcury Surface, Space ENvironment, GEochemistry, and Ranging)",
    location: "Northern hemisphere of Mercury",
    lat: 54.4398,
    lon: -149.8795,
    landingDate: "April 30, 2015 (19:26 UTC)",
    image: null,
    summary:
      "The first spacecraft to orbit Mercury. When its fuel ran out, it crashed onto the surface at 3.912 km/s (about 14,000 km/h).",
    purpose:
      "MESSENGER mapped Mercury and studied its surface, chemistry, magnetic field and the space around it.",
    history: [
      { date: "August 3, 2004", text: "Launches on a Delta II from Cape Canaveral." },
      { date: "March 18, 2011", text: "Fires its main engine and becomes the first spacecraft to orbit Mercury." },
      { date: "2015", text: "During a final six-week extension, the last of its propellant is used up." },
      { date: "April 30, 2015", text: "With no way to correct its orbit, MESSENGER crashes into Mercury at 19:26 UTC, shortly after sending its final picture." }
    ],
    contributions: [
      "Found water ice and organic compounds in permanently shadowed areas near Mercury's north pole.",
      "Showed that volcanoes played a major role in shaping Mercury's surface.",
      "Returned nearly 300,000 pictures."
    ],
    status: {
      text: "Mission ended with the impact. Engineers estimated the new crater at about 16 m across.",
      asOf: "NASA, checked October 2026.",
      sourceLabel: "NASA Science: Best Determination of MESSENGER's Impact Location",
      sourceUrl: "https://science.nasa.gov/photojournal/best-determination-of-messengers-impact-location/"
    },
    markerNote: "The marker shows the calculated impact point.",
    coordinateNote: "Coordinates from NASA's final impact estimate (54.4398 N, 210.1205 E). The marker position on the globe is approximate.",
    sources: [
      { label: "NASA Science: Best Determination of MESSENGER's Impact Location", url: "https://science.nasa.gov/photojournal/best-determination-of-messengers-impact-location/" },
      { label: "NASA: 15 Years Ago, MESSENGER Launched to Orbit Mercury", url: "https://www.nasa.gov/history/15-years-ago-messenger-launched-to-orbit-mercury/" }
    ],
    landing: {
      style: "impact",
      impactors: [
        {
          model: "messenger", scale: 1, from: [-900, 160, -80], at: [0, 0, 0], duration: 7,
          blast: 1, craterRadius: 8, cameraBack: 25,
          title: "Final plunge",
          caption: "Out of propellant, MESSENGER can no longer hold its orbit. It hits Mercury at 3.912 km/s, making a crater estimated at about 16 m across."
        }
      ],
      captions: {
        findings: "In four years in orbit MESSENGER returned nearly 300,000 pictures and found water ice near Mercury's north pole."
      }
    }
  },

  // ===================== VENUS (added October 2026) =====================

  {
    id: "pv-large",
    kind: "probe",
    dateLabel: "Arrival date",
    name: "Pioneer Venus Large Probe",
    breadcrumbName: "PV Large Probe",
    destination: "Venus",
    mission: "Pioneer Venus 2 (Multiprobe)",
    location: "Near the equator of Venus",
    lat: 4.4,
    lon: -56,
    landingDate: "December 9, 1978",
    image: null,
    summary:
      "The largest of four NASA probes that dived into the atmosphere of Venus. It measured the air all the way down and stopped transmitting when it hit the surface.",
    purpose:
      "The probes measured the gases, clouds, temperature and pressure of Venus's atmosphere at four widely separated places.",
    history: [
      { date: "August 8, 1978", text: "Pioneer Venus 2 launches, carrying one large probe, three small probes and a bus." },
      { date: "December 9, 1978", text: "The Large Probe enters the atmosphere first, at about 200 km altitude." },
      { date: "December 9, 1978", text: "Its parachute opens, then is released at about 45 km altitude. It falls the rest of the way without it." },
      { date: "December 9, 1978", text: "Transmissions end when it hits the surface." }
    ],
    contributions: [
      "Measured the composition of the atmosphere with a mass spectrometer and a gas chromatograph.",
      "The probes found almost no vertical mixing of the air between about 10 and 50 km altitude, and a haze layer near 30 km.",
      "Below 50 km, temperatures were similar at all four widely separated entry sites."
    ],
    status: {
      text: "Not operating: transmissions ended at impact on December 9, 1978.",
      asOf: "NASA, checked October 2026.",
      sourceLabel: "NASA Science: Pioneer Venus 2",
      sourceUrl: "https://science.nasa.gov/mission/pioneer-venus-2/"
    },
    markerNote: "The marker shows where the probe hit the surface.",
    coordinateNote: "Coordinates from NASA (4.4 N, 304 E). The marker position on the globe is approximate.",
    sources: [
      { label: "NASA Science: Pioneer Venus 2", url: "https://science.nasa.gov/mission/pioneer-venus-2/" },
      { label: "NASA NSSDCA: Pioneer Venus Large Probe", url: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1978-078D" }
    ],
    landing: {
      style: "probe", lander: "venus-probe-large", scale: 1, parachute: true, chuteRadius: 2.5,
      captions: {
        entry: "The Large Probe (1.5 m across) enters the atmosphere at about 200 km altitude, behind a cone-shaped heat shield.",
        descent: "Its parachute opens, then is released at about 45 km. Below that it falls freely through the thick, hot air, measuring it.",
        touchdown: "Transmissions end when the probe hits the surface.",
        surface: "The probe was not built to survive the landing."
      }
    }
  },

  {
    id: "pv-day",
    kind: "probe",
    dateLabel: "Arrival date",
    name: "Pioneer Venus Day Probe",
    breadcrumbName: "PV Day Probe",
    destination: "Venus",
    mission: "Pioneer Venus 2 (Multiprobe)",
    location: "Southern hemisphere of Venus, on the day side",
    lat: -32,
    lon: -42,
    landingDate: "December 9, 1978",
    image: null,
    summary:
      "One of three small Pioneer Venus probes. It was not designed to survive the landing, but it kept sending data from the surface for 67 minutes.",
    purpose:
      "The small probes measured temperature, pressure and the clouds at different places on Venus, without parachutes.",
    history: [
      { date: "August 8, 1978", text: "Pioneer Venus 2 launches, carrying the probes." },
      { date: "December 9, 1978", text: "The Day Probe falls through the atmosphere without a parachute." },
      { date: "December 9, 1978", text: "It survives the impact and transmits from the surface for 67 minutes and 37 seconds before failing." }
    ],
    contributions: [
      "Measured temperature, pressure and acceleration all the way down.",
      "Sent data from the surface of Venus for over an hour.",
      "Together with the other probes, showed a haze layer near 30 km and very little vertical mixing between about 10 and 50 km."
    ],
    status: {
      text: "Not operating: it failed after 67 minutes on the surface on December 9, 1978.",
      asOf: "NASA, checked October 2026.",
      sourceLabel: "NASA Science: Pioneer Venus 2",
      sourceUrl: "https://science.nasa.gov/mission/pioneer-venus-2/"
    },
    markerNote: "The marker shows where the probe landed.",
    coordinateNote: "Coordinates from NASA (32 S, 318 E). The marker position on the globe is approximate.",
    sources: [
      { label: "NASA Science: Pioneer Venus 2", url: "https://science.nasa.gov/mission/pioneer-venus-2/" }
    ],
    landing: {
      style: "probe", lander: "venus-probe-small", scale: 1, parachute: false,
      captions: {
        entry: "The small Day Probe enters the atmosphere behind its heat shield.",
        descent: "With no parachute, it falls through the thick atmosphere, measuring temperature and pressure on the way.",
        touchdown: "The probe hits the ground. It was not designed to survive this.",
        surface: "But it does: the Day Probe keeps sending data from the surface for 67 minutes and 37 seconds before it fails."
      }
    }
  },

  // ===================== JUPITER, SATURN AND TITAN (added October 2026, facts checked on NASA pages) =====================

  {
    id: "galileo-probe",
    kind: "probe",
    dateLabel: "Entry date",
    name: "Galileo atmospheric probe",
    breadcrumbName: "Galileo Probe",
    destination: "Jupiter",
    mission: "Galileo",
    location: "Near Jupiter's equator, in the northern hemisphere",
    lat: 6.5,
    lon: -4.4,
    landingDate: "December 7, 1995 (22:04 UTC)",
    image: null,
    summary:
      "The first probe to enter the atmosphere of a giant planet. It parachuted into Jupiter and sent back about 58 minutes of measurements before its transmitter failed.",
    purpose:
      "The probe measured Jupiter's atmosphere directly: its gases, clouds, winds, temperature and pressure. Its design was based on the Pioneer Venus large probe.",
    history: [
      { date: "October 18, 1989", text: "Galileo launches aboard Space Shuttle Atlantis (STS-34) from Launch Complex 39B, Kennedy Space Center. An Inertial Upper Stage boosts it out of Earth orbit." },
      { date: "July 13, 1995", text: "The probe separates from the Galileo orbiter, about 80 million km from Jupiter." },
      { date: "December 7, 1995", text: "The probe enters Jupiter's atmosphere at 22:04 UTC, at about 170,590 km/h. Its parachutes open about a minute later." },
      { date: "December 7, 1995", text: "About 8 minutes after entry, the air pressure equals Earth's at sea level. About 30 minutes after entry, the temperature equals room temperature on Earth." },
      { date: "December 7, 1995", text: "The transmitter fails 61.4 minutes after entry, about 180 km below where the probe entered, at a pressure of 22.7 atmospheres." }
    ],
    contributions: [
      "The first direct measurements of a giant planet's atmosphere.",
      "Found winds of up to about 640 m/s, less lightning and less water vapor than expected, and about half the expected helium in the upper atmosphere.",
      "Found an intense radiation belt about 50,000 km above Jupiter's clouds."
    ],
    status: {
      text: "Not operating. NASA estimates the probe was vaporized by the heat of Jupiter's atmosphere within hours of entry.",
      asOf: "NASA, checked October 2026.",
      sourceLabel: "NASA Science: Galileo Jupiter Atmospheric Probe",
      sourceUrl: "https://science.nasa.gov/mission/galileo-jupiter-atmospheric-probe/"
    },
    markerNote: "The marker shows where the probe entered the atmosphere. Jupiter's clouds move constantly, so this is a place in the atmosphere, not on a surface.",
    coordinateNote: "Coordinates from NASA (6.5 N, 4.4 W). The cloud map is not aligned to Jupiter's official longitude system, so the marker position is only approximate.",
    sources: [
      { label: "NASA Science: Galileo Jupiter Atmospheric Probe", url: "https://science.nasa.gov/mission/galileo-jupiter-atmospheric-probe/" },
      { label: "NASA Science: What was the Galileo probe and what did it do at Jupiter?", url: "https://science.nasa.gov/solar-system/resources/faq/what-was-the-galileo-probe-and-what-did-it-do-at-jupiter/" },
      { label: "NASA Science: Galileo mission", url: "https://science.nasa.gov/mission/galileo/" }
    ],
    landing: {
      style: "atmosphere", lander: "galileo-probe", scale: 1.6, chuteRadius: 2.8,
      captions: {
        entry: "December 7, 1995: the probe hits Jupiter's atmosphere at about 170,590 km/h. Its heat shield takes the heat of entry.",
        parachute: "About a minute after entry, the parachutes open and the heat shield module drops away. The probe starts radioing data to the Galileo orbiter.",
        end: "61.4 minutes after entry the transmitter fails, about 180 km below the entry point, at 22.7 times Earth's air pressure. Within hours, the probe is vaporized."
      },
      depthSteps: [
        { title: "Into the clouds", caption: "About 8 minutes after entry, the air pressure around the probe is the same as Earth's at sea level.", duration: 7 },
        { title: "Deeper", caption: "About 30 minutes after entry, the temperature outside equals room temperature on Earth. The probe measures winds of up to about 640 m/s.", duration: 8 },
        { title: "Into the heat", caption: "The probe keeps sinking. It finds less water vapor and less lightning than scientists expected.", duration: 7 }
      ]
    }
  },

  {
    id: "cassini",
    kind: "plunge",
    dateLabel: "Final plunge",
    name: "Cassini's final plunge",
    breadcrumbName: "Cassini",
    destination: "Saturn",
    mission: "Cassini-Huygens (NASA, ESA and the Italian Space Agency)",
    location: "Saturn's atmosphere, northern hemisphere",
    lat: 9.4,
    lon: -53,
    landingDate: "September 15, 2017 (contact lost 7:55 a.m. EDT)",
    image: null,
    summary:
      "After 13 years orbiting Saturn, Cassini ended its mission by diving into the planet, sending data until the very end.",
    purpose:
      "Cassini studied Saturn, its rings and moons. It ended the mission inside Saturn so it could never crash into, and contaminate, a moon such as Enceladus, which has a subsurface ocean.",
    history: [
      { date: "October 15, 1997", text: "Launches on a Titan IVB/Centaur rocket from Cape Canaveral Air Force Station, Florida, carrying the Huygens probe." },
      { date: "April 26, 1998 and June 24, 1999", text: "Two flybys of Venus." },
      { date: "August 18, 1999", text: "Flyby of Earth." },
      { date: "December 30, 2000", text: "Flyby of Jupiter." },
      { date: "July 1, 2004 (UTC)", text: "Enters orbit around Saturn." },
      { date: "Late April 2017", text: "Begins the Grand Finale: 22 weekly dives through the gap between Saturn and its rings, which no spacecraft had tried before." },
      { date: "September 15, 2017", text: "Enters Saturn's atmosphere at about 113,000 km/h. Contact is lost at 7:55 a.m. EDT, about 1,500 km above the cloud tops." }
    ],
    contributions: [
      "Found that Enceladus has an ocean under its ice, with signs of hydrothermal activity.",
      "Revealed Titan as an ocean world too, with seas of liquid hydrocarbons on its surface.",
      "Completed 294 orbits of Saturn and took 453,048 images.",
      "In its final plunge, 8 of its 12 instruments sampled Saturn's atmosphere directly."
    ],
    status: {
      text: "Mission ended September 15, 2017, inside Saturn's atmosphere.",
      asOf: "NASA, checked October 2026.",
      sourceLabel: "NASA: NASA's Cassini Spacecraft Ends Its Historic Exploration of Saturn",
      sourceUrl: "https://www.nasa.gov/news-release/nasas-cassini-spacecraft-ends-its-historic-exploration-of-saturn/"
    },
    markerNote: "The marker shows where Cassini entered Saturn's atmosphere.",
    coordinateNote: "Coordinates from NASA (9.4 N, 53 W). The cloud map is not aligned to Saturn's official longitude system, so the marker position is only approximate.",
    sources: [
      { label: "NASA: NASA's Cassini Spacecraft Ends Its Historic Exploration of Saturn", url: "https://www.nasa.gov/news-release/nasas-cassini-spacecraft-ends-its-historic-exploration-of-saturn/" },
      { label: "NASA: Cassini Spacecraft Makes Its Final Approach to Saturn", url: "https://www.nasa.gov/news-release/cassini-spacecraft-makes-its-final-approach-to-saturn/" },
      { label: "NASA Science: Cassini Quick Facts", url: "https://science.nasa.gov/mission/cassini/quick-facts/" }
    ],
    landing: {
      style: "plunge", lander: "cassini", scale: 1.4,
      captions: {
        approach: "September 15, 2017. After 22 dives between Saturn and its rings, Cassini heads into the planet on purpose, to keep Saturn's moons pristine.",
        entry: "About 1,915 km above the cloud tops, Cassini enters the atmosphere at about 113,000 km/h. Its thrusters fire to keep the antenna pointed at Earth while 8 instruments sample the air.",
        end: "About 1,500 km above the cloud tops, the thrusters can no longer hold the antenna toward Earth. Contact is lost at 7:55 a.m. EDT.",
        after: "Cassini's mission is over after 294 orbits of Saturn and 453,048 images."
      }
    }
  },

  {
    id: "huygens",
    kind: "landing",
    partner: "European Space Agency (ESA), carried to Saturn by NASA's Cassini",
    name: "Huygens probe",
    breadcrumbName: "Huygens",
    destination: "Titan",
    mission: "Cassini-Huygens (NASA, ESA and the Italian Space Agency)",
    location: "Southern hemisphere of Titan",
    lat: -10.3,
    lon: 167.7,
    landingDate: "January 14, 2005 (about 11:30 UTC)",
    image: null,
    summary:
      "Built by the European Space Agency and carried by NASA's Cassini, Huygens made the first landing on a moon of another planet: Saturn's moon Titan.",
    purpose:
      "Huygens studied Titan's thick atmosphere on the way down and measured what its surface was like after landing.",
    history: [
      { date: "October 15, 1997", text: "Launches attached to Cassini on a Titan IVB/Centaur rocket." },
      { date: "July 1, 2004 (UTC)", text: "Arrives at Saturn with Cassini." },
      { date: "December 24, 2004", text: "Separates from Cassini and coasts toward Titan." },
      { date: "January 14, 2005", text: "Descends through Titan's atmosphere for 2 hours and 27 minutes on three parachutes, used one after another, and lands at about 11:30 UTC." },
      { date: "January 14, 2005", text: "Survives on the surface for about 72 minutes." }
    ],
    contributions: [
      "The first landing on a moon of another planet.",
      "Its camera saw only fog until about 60 km up, then features as small as about 100 m. After landing it saw a soft, sandy riverbed.",
      "Measured Titan's atmosphere all the way down to the surface."
    ],
    status: {
      text: "Not operating. Huygens rests where it landed in Titan's southern hemisphere.",
      asOf: "NASA, checked October 2026.",
      sourceLabel: "NASA Science: Huygens Probe",
      sourceUrl: "https://science.nasa.gov/mission/cassini/spacecraft/huygens-probe/"
    },
    markerNote: "The marker shows the landing site.",
    coordinateNote: "Coordinates from ESA (10.3 S, 192.3 W). The Titan globe is an illustration, so the marker position is approximate.",
    sources: [
      { label: "NASA Science: Huygens Probe", url: "https://science.nasa.gov/mission/cassini/spacecraft/huygens-probe/" },
      { label: "NASA Science: A View from Huygens (Jan. 14, 2005)", url: "https://science.nasa.gov/photojournal/a-view-from-huygens-jan-14-2005/" },
      { label: "NASA Science: Cassini Quick Facts", url: "https://science.nasa.gov/mission/cassini/quick-facts/" },
      { label: "ESA: Location of the Huygens landing site", url: "https://www.esa.int/ESA_Multimedia/Images/2005/11/Location_of_landing_site" }
    ],
    landing: {
      style: "probe", lander: "huygens", scale: 1, parachute: true, keepParachute: true, chuteRadius: 4,
      captions: {
        entry: "January 14, 2005: Huygens enters Titan's thick atmosphere behind its heat shield.",
        descent: "Three parachutes open one after another. The descent takes 2 hours and 27 minutes (shortened here). Until about 60 km up, the camera sees only fog.",
        touchdown: "Huygens lands at about 11:30 UTC: the first landing on a moon of another planet.",
        surface: "It lands on a soft, sandy riverbed and survives for about 72 minutes on the surface."
      }
    }
  }
];
