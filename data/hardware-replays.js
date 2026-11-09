// Mission replay events for the Moon and Mars hardware profiles.
// The dates and facts come from the NASA and other sources linked in the hardware profiles.
// The paths, sizes and distances in the animation are illustrative, not exact trajectories.
//
// craftScale = default size of the craft. It is kept very small so the craft is never bigger than the planets or Moon.
// rocket (launch event) = the real launch vehicle shown in the liftoff scene (see js/rockets.js).
// For each event:
//   title, date, caption = text shown on screen. narration = what the voice reads aloud.
//   target = "Earth", "Moon" or "Mars" (where the craft goes).
//   Each event's stage letter (A launch, B journey, C landing or deployment, D return, E completion)
//   is listed in data/missions.js (STAGE_TAGS).
//   isLaunch = true for the launch from Earth (smoke and fire from the surface).
//   liftoff = true when the craft leaves the Moon (fire only, because the Moon has no air for smoke).
//   gap = how far above the surface of the target (display units). around = turn the spot around the target (radians).
//   scale = size of the craft at this event. zoom = how close the camera gets.

export const hardwareReplays = {
  apollo11: {
    label: "Apollo 11 Eagle",
    craftScale: 0.03,
    events: [
      {
        title: "Launch from Earth",
        date: "July 16, 1969",
        caption:
          "Apollo 11 lifts off at 9:32 a.m. EDT on a Saturn V from Launch Complex 39A, Kennedy Space Center, with the Lunar Module Eagle packed inside. After one and a half orbits of Earth, the third stage fires again to send it toward the Moon.",
        narration:
          "It is the morning of July 16th, 1969, at Launch Pad 39A, Kennedy Space Center, in Florida. " +
          "A Saturn Five rocket stands ready, carrying the Apollo 11 spacecraft with the Lunar Module Eagle packed inside. " +
          "At 9:32 in the morning, Eastern time, the five engines of the first stage ignite, and the rocket rises. " +
          "About two and a half minutes into the flight, the first stage shuts down and falls away, and the second stage takes over. " +
          "The third stage then places Apollo 11 into orbit around Earth. " +
          "After one and a half orbits, it fires again, for almost six minutes. " +
          "This burn, called trans-lunar injection, sends the spacecraft toward the Moon.",
        target: "Earth", isLaunch: true, gap: 1.2, zoom: 2.6, rocket: "saturn-v"
      },
      {
        title: "Arrival at the Moon",
        date: "July 19, 1969",
        caption:
          "After about three days of travel, Apollo 11 flies behind the Moon and fires its main engine to enter lunar orbit.",
        narration:
          "After about three days of travel, Apollo 11 reaches the Moon. " +
          "On July 19th, the spacecraft flies behind the Moon, out of contact with Earth, and fires its main engine. " +
          "It slips into orbit around the Moon. " +
          "Armstrong and Aldrin prepare to descend in the Lunar Module Eagle, while Michael Collins will stay in orbit in the command module.",
        target: "Moon", gap: 1.0, around: 0, zoom: 2.0, scale: 0.025
      },
      {
        title: "Landing in the Sea of Tranquility",
        date: "July 20, 1969",
        caption:
          "Eagle separates from the command module and descends. It touches down at 20:17 UTC (4:17 p.m. in Florida) at Tranquility Base.",
        narration:
          "July 20th, 1969. Armstrong and Aldrin undock the Lunar Module Eagle from the command module, and begin their descent. " +
          "At 20:17 Universal Time, which is 4:17 in the afternoon in Florida, Eagle touches down in the Sea of Tranquility. " +
          "Armstrong tells Mission Control: Tranquility Base here. The Eagle has landed.",
        target: "Moon", gap: 0.35, around: 0.5, zoom: 1.4, scale: 0.018
      },
      {
        title: "On the surface",
        date: "July 20 to 21, 1969",
        caption:
          "Armstrong steps onto the Moon about 6 hours 39 minutes after landing. In about two and a half hours outside, the astronauts collect 21.55 kg of rock samples and set up a seismic experiment and a laser reflector. Eagle's descent stage stays where it landed.",
        narration:
          "About six hours and 39 minutes after landing, Neil Armstrong steps onto the surface, followed by Buzz Aldrin. " +
          "Over about two and a half hours outside, they take photographs and collect about twenty-one and a half kilograms of rock samples. " +
          "They also set up two experiments: a seismometer package, and a laser reflector that scientists on Earth can bounce laser beams off. " +
          "These are left on the Moon, together with the lower half of Eagle, the descent stage.",
        target: "Moon", gap: 0.06, around: 0.55, zoom: 1.0, scale: 0.014
      },
      {
        title: "Leaving the Moon",
        date: "July 21, 1969",
        caption:
          "Eagle's ascent stage lifts off at 17:54 UTC and later rejoins the command module, Columbia. The descent stage stays behind as the launch pad.",
        narration:
          "On July 21st, at 17:54 Universal Time, Eagle's upper half, the ascent stage, lifts off from the Moon. " +
          "The descent stage stays behind, and serves as its launch pad. " +
          "A few hours later, the ascent stage meets the command module Columbia in lunar orbit, and the crew heads home. " +
          "The descent stage, the seismic package, and the laser reflector remain at Tranquility Base.",
        target: "Moon", gap: 0.9, around: 0.9, zoom: 1.6, scale: 0.018, liftoff: true
      },
      {
        title: "Heading home",
        date: "July 21 to 24, 1969",
        caption:
          "Eagle's ascent stage docks with Columbia and is left behind. The service module's engine fires to send the crew back to Earth. Just before re-entry, the command module separates from the service module.",
        narration:
          "Back in lunar orbit, Armstrong and Aldrin rejoin Michael Collins aboard Columbia, and Eagle's ascent stage is cast off. " +
          "The service module's big engine fires behind the Moon, and Apollo 11 heads home. " +
          "Shortly before reaching Earth, the command module separates from the service module. Only the command module will come back.",
        target: "Earth", gap: 0.5, around: 0.3, zoom: 1.0, scale: 0.012
      },
      {
        title: "Splashdown in the Pacific",
        date: "July 24, 1969",
        caption:
          "Columbia's heat shield protects the crew through re-entry, three main parachutes open, and it splashes down at 12:49 p.m. ET, about 812 nautical miles southwest of Hawaii. USS Hornet recovers the crew.",
        narration:
          "July 24th, 1969. Columbia plunges into the atmosphere, its heat shield glowing. Three main parachutes open, and at 12:49 in the afternoon, Eastern time, it splashes down in the Pacific Ocean, about eight hundred and twelve nautical miles southwest of Hawaii. " +
          "The recovery ship, U S S Hornet, picks up the crew. Apollo 11 is complete.",
        target: "Earth", gap: 0.02, around: 0.12, zoom: 0.35, scale: 0.012
      }
    ]
  },

  curiosity: {
    label: "Curiosity",
    craftScale: 0.04,
    events: [
      {
        title: "Launch from Earth",
        date: "November 26, 2011",
        caption:
          "An Atlas V 541 rocket with four strap-on boosters lifts off from Space Launch Complex 41 at 10:02 a.m. EST. About 44 minutes later, the spacecraft separates from the Centaur upper stage and heads for Mars.",
        narration:
          "It is November 26th, 2011, at Space Launch Complex 41, Cape Canaveral, Florida. " +
          "An Atlas Five rocket, in the 541 configuration with four solid rocket boosters on its sides, carries NASA's Mars Science Laboratory and the Curiosity rover. " +
          "At 10:02 in the morning, Eastern time, it lifts off. " +
          "The boosters help push it up, and are jettisoned a couple of minutes into the flight. " +
          "The Centaur upper stage then fires to reach Earth orbit, and fires again to send the spacecraft out toward Mars. " +
          "About 44 minutes after liftoff, the spacecraft separates from the Centaur. Curiosity is on its way to Mars.",
        target: "Earth", isLaunch: true, zoom: 2.6, rocket: "atlas-v-541"
      },
      {
        title: "Arrival at Mars",
        date: "August 6, 2012 (UTC)",
        caption:
          "After a journey of about eight and a half months, the spacecraft reaches Mars and heads into its atmosphere.",
        narration:
          "After a journey of about eight and a half months, the spacecraft arrives at Mars on August 6th, 2012, Universal Time. " +
          "It heads straight into the thin Martian atmosphere, and the most dangerous part of the mission begins.",
        target: "Mars", gap: 2.5, around: 0, zoom: 3.5, scale: 0.045
      },
      {
        title: "Entry, descent and landing",
        date: "August 6, 2012 (05:17 UTC)",
        caption:
          "The team calls it the seven minutes of terror: a heat shield, a parachute, rocket-powered descent, and finally a sky crane that lowers the rover on cables.",
        narration:
          "Landing takes about seven minutes, and the mission team nicknamed it the seven minutes of terror. " +
          "A heat shield protects the spacecraft as it hits the atmosphere, and a giant parachute slows it down. " +
          "About one point eight kilometers above the ground, the rover and its rocket-powered descent stage separate from the parachute, and fire eight retrorockets. " +
          "Then comes the sky crane. Roughly twenty meters above the ground, the descent stage hovers and lowers Curiosity on cables, with its wheels touching down at about three quarters of a meter per second. " +
          "The cables are cut, and the descent stage flies away to crash a safe distance from the rover. " +
          "Curiosity has landed in Gale Crater.",
        target: "Mars", gap: 0.6, around: 0.5, zoom: 2.0, scale: 0.035
      },
      {
        title: "Bradbury Landing and the first year",
        date: "August 2012 to March 2013",
        caption:
          "NASA names the landing site Bradbury Landing on August 22, 2012. In its first year the rover reaches Yellowknife Bay, where drilled rock samples show evidence of an ancient freshwater lake.",
        narration:
          "On August 22nd, 2012, NASA named the landing site Bradbury Landing, in honor of the author Ray Bradbury. " +
          "In its first year, Curiosity drove to a place called Yellowknife Bay. " +
          "There it drilled into rock, and the samples showed evidence of an ancient freshwater lake, with key chemical elements that life uses. " +
          "Gale Crater once had conditions suitable for microbial life.",
        target: "Mars", gap: 0.1, around: 0.62, zoom: 1.4, scale: 0.03
      }
    ]
  },

  perseverance: {
    label: "Perseverance",
    craftScale: 0.04,
    events: [
      {
        title: "Launch from Earth",
        date: "July 30, 2020",
        caption:
          "An Atlas V 541 rocket lifts off from Space Launch Complex 41 at 7:50 a.m. EDT. About 57 minutes later, the spacecraft separates from the rocket, starting a seven-month journey to Mars. The Ingenuity helicopter is attached to the rover's belly.",
        narration:
          "It is July 30th, 2020, at Space Launch Complex 41, Cape Canaveral, Florida. " +
          "An Atlas Five 541 rocket carries NASA's Perseverance rover, with the small Ingenuity helicopter attached to its belly. " +
          "At 7:50 in the morning, Eastern time, it lifts off right on time. " +
          "About 57 minutes later, the spacecraft separates from the rocket, and begins a seven-month journey to Mars.",
        target: "Earth", isLaunch: true, zoom: 2.6, rocket: "atlas-v-541"
      },
      {
        title: "Arrival at Mars",
        date: "February 18, 2021",
        caption:
          "After about seven months, the spacecraft arrives at Mars and streaks into the atmosphere at more than 12,000 miles per hour.",
        narration:
          "After a little over seven months in space, the spacecraft reaches Mars on February 18th, 2021. " +
          "It streaks into the thin atmosphere at more than twelve thousand miles per hour. " +
          "The landing, about seven minutes long, is known as the seven minutes of terror.",
        target: "Mars", gap: 2.5, around: 0, zoom: 3.5, scale: 0.045
      },
      {
        title: "Landing in Jezero Crater",
        date: "February 18, 2021 (about 3:55 p.m. EST)",
        caption:
          "A new system called Terrain-Relative Navigation helps the spacecraft avoid hazards. Then the sky crane lowers Perseverance on cables onto the floor of Jezero Crater.",
        narration:
          "Jezero Crater is the most challenging terrain ever targeted for a Mars landing, with cliffs along its edges. " +
          "After the heat shield separates, a parachute slows the spacecraft. " +
          "Then Perseverance uses a new system called Terrain-Relative Navigation. It takes pictures during the descent, compares them with an onboard map, and steers itself away from hazards. " +
          "Finally, the sky crane lowers the rover on nylon cables, touching down at about two miles per hour. " +
          "At around 3:55 in the afternoon, Eastern time, mission control confirms: touchdown.",
        target: "Mars", gap: 0.6, around: 0.5, zoom: 2.0, scale: 0.035
      },
      {
        title: "Deploying Ingenuity",
        date: "April 3, 2021",
        caption:
          "Perseverance lowers the Ingenuity helicopter to the ground, then drives about 100 meters away to give it a safe buffer.",
        narration:
          "For the first weeks on Mars, Ingenuity stayed attached under the rover. " +
          "On April 3rd, 2021, Perseverance lowered the helicopter to the surface. " +
          "Then it drove about a hundred meters away, to give Ingenuity a safe space for its test flights.",
        target: "Mars", gap: 0.1, around: 0.6, zoom: 1.4, scale: 0.03
      },
      {
        title: "First flight on another planet",
        date: "April 19, 2021",
        caption:
          "Ingenuity rises about 3 meters (10 feet), hovers, and lands: the first powered, controlled flight on another planet.",
        narration:
          "On April 19th, 2021, Ingenuity spins up its rotors and lifts off from the floor of Jezero Crater. " +
          "It rises about three meters, hovers, and lands again. " +
          "It is the first powered, controlled flight on another planet. " +
          "Ingenuity would go on to make seventy-two flights, until January 2024.",
        target: "Mars", gap: 0.5, around: 0.7, zoom: 1.6, scale: 0.03
      }
    ]
  },

  "galileo-probe": {
    label: "Galileo",
    craftScale: 0.012,
    events: [
      {
        title: "Launch from Earth",
        date: "October 18, 1989",
        caption:
          "Galileo, with its atmosphere probe attached, launches aboard Space Shuttle Atlantis (STS-34) from Launch Complex 39B. An Inertial Upper Stage then boosts it out of Earth orbit.",
        narration:
          "It is October 18th, 1989, at Launch Complex 39B, Kennedy Space Center. " +
          "Space Shuttle Atlantis lifts off with the Galileo spacecraft in its cargo bay. " +
          "Once in orbit, the crew releases Galileo, and a two-stage rocket called the Inertial Upper Stage boosts it out of Earth orbit. " +
          "Galileo is not heading straight for Jupiter. It will first swing past Venus, and twice past Earth, to gain speed.",
        target: "Earth", isLaunch: true, zoom: 2.6, rocket: "shuttle"
      },
      {
        title: "Venus flyby",
        date: "February 10, 1990",
        caption: "Galileo flies about 16,000 km above Venus, using its gravity to gain speed.",
        narration:
          "February 10th, 1990. Galileo passes about sixteen thousand kilometers above Venus. " +
          "Venus's gravity bends its path and sends it back toward Earth.",
        target: "Venus", zoom: 3
      },
      {
        title: "First Earth flyby",
        date: "December 8, 1990",
        caption: "Galileo swings past Earth at 960 km. Later, on October 29, 1991, it passes asteroid Gaspra: the first asteroid encounter by a spacecraft.",
        narration:
          "December 8th, 1990. Galileo swings past Earth at an altitude of nine hundred sixty kilometers, gaining more speed. " +
          "On October 29th, 1991, it flies past the asteroid Gaspra, the first time a spacecraft has visited an asteroid.",
        target: "Earth", around: 0.6, zoom: 3
      },
      {
        title: "Second Earth flyby",
        date: "December 8, 1992",
        caption: "A second Earth flyby, at 303 km, sends Galileo to Jupiter. On August 28, 1993 it passes asteroid Ida and finds its tiny moon, Dactyl.",
        narration:
          "December 8th, 1992. Exactly two years later, Galileo passes Earth again, just three hundred three kilometers up. " +
          "This time it heads out to Jupiter. " +
          "On the way, on August 28th, 1993, it flies past the asteroid Ida, and discovers that Ida has its own little moon, Dactyl, " +
          "the first asteroid known to have a moon.",
        target: "Earth", around: -0.7, zoom: 3
      },
      {
        title: "Probe release",
        date: "July 13, 1995",
        caption: "About 80 million km from Jupiter, the atmosphere probe separates from the orbiter and coasts toward the planet on its own.",
        narration:
          "July 13th, 1995. Galileo is still about eighty million kilometers from Jupiter. " +
          "It releases its atmosphere probe, which will fly on its own for almost five months, straight toward the planet.",
        target: "Jupiter", gap: 3.5, zoom: 4
      },
      {
        title: "Probe enters Jupiter",
        date: "December 7, 1995",
        caption: "The probe dives into Jupiter's atmosphere at about 170,590 km/h. The same day, the Galileo orbiter enters orbit around Jupiter. (Watch the descent from Jupiter's globe.)",
        narration:
          "December 7th, 1995. The probe hits Jupiter's atmosphere at about one hundred seventy thousand kilometers per hour. " +
          "It becomes the first probe ever to enter the atmosphere of a giant planet. " +
          "The same day, the Galileo orbiter fires its engine and enters orbit around Jupiter. " +
          "It will study Jupiter and its moons until September 21st, 2003, when it is sent into Jupiter on purpose, so that it can never crash into Europa.",
        target: "Jupiter", gap: 0.4, zoom: 2
      }
    ]
  },

  cassini: {
    label: "Cassini",
    craftScale: 0.012,
    events: [
      {
        title: "Launch from Earth",
        date: "October 15, 1997",
        caption: "Cassini, carrying ESA's Huygens probe, launches on a Titan IVB/Centaur rocket from Cape Canaveral Air Force Station, Florida.",
        narration:
          "It is October 15th, 1997, at Cape Canaveral Air Force Station in Florida. " +
          "A Titan Four B rocket with a Centaur upper stage lifts off, carrying Cassini and the European Space Agency's Huygens probe. " +
          "At launch, Cassini and Huygens together weigh five thousand seven hundred twelve kilograms, including fuel. " +
          "To reach Saturn, Cassini will borrow speed from Venus, Earth and Jupiter.",
        target: "Earth", isLaunch: true, zoom: 2.6, rocket: "titan-4b"
      },
      {
        title: "Two Venus flybys",
        date: "April 26, 1998 and June 24, 1999",
        caption: "Cassini flies past Venus twice, at 234 km and 600 km, gaining speed each time.",
        narration:
          "Cassini flies past Venus twice: on April 26th, 1998, and again on June 24th, 1999. " +
          "Each flyby uses Venus's gravity to speed it up.",
        target: "Venus", zoom: 3
      },
      {
        title: "Earth flyby",
        date: "August 18, 1999",
        caption: "Cassini swings past Earth at 1,171 km on its way to the outer solar system.",
        narration:
          "August 18th, 1999. Cassini swings past Earth at about one thousand one hundred seventy kilometers, and heads for the outer solar system.",
        target: "Earth", around: 0.6, zoom: 3
      },
      {
        title: "Jupiter flyby",
        date: "December 30, 2000",
        caption: "Cassini passes Jupiter, which gives it one last boost toward Saturn.",
        narration:
          "December 30th, 2000. Cassini passes Jupiter, and Jupiter's gravity gives it one last push toward Saturn.",
        target: "Jupiter", zoom: 4
      },
      {
        title: "Arrival at Saturn",
        date: "July 1, 2004 (UTC)",
        caption: "Cassini fires its engine and enters orbit around Saturn. It will complete 294 orbits.",
        narration:
          "July 1st, 2004, Universal Time. After almost seven years in space, Cassini fires its main engine and goes into orbit around Saturn. " +
          "Over the next thirteen years it will complete two hundred ninety-four orbits, and take more than four hundred fifty thousand pictures.",
        target: "Saturn", zoom: 5
      },
      {
        title: "The Grand Finale",
        date: "Late April to September 2017",
        caption: "Cassini makes 22 weekly dives through the gap between Saturn and its rings, something no spacecraft had tried before.",
        narration:
          "In late April 2017, with its fuel running low, Cassini begins its Grand Finale. " +
          "Every week it dives through the narrow gap between Saturn and its rings, twenty-two times in all, something no spacecraft had ever tried.",
        target: "Saturn", around: 1.2, zoom: 5
      },
      {
        title: "Final plunge",
        date: "September 15, 2017",
        caption: "Cassini dives into Saturn at about 113,000 km/h. Contact is lost at 7:55 a.m. EDT. (Watch the plunge from Saturn's globe.)",
        narration:
          "September 15th, 2017. Cassini dives into Saturn's atmosphere at about one hundred thirteen thousand kilometers per hour, sending data until the very end. " +
          "Contact is lost at 7:55 in the morning, Eastern time. " +
          "Ending this way keeps Saturn's moons, especially Enceladus, with its hidden ocean, free from contamination.",
        target: "Saturn", around: 2.0, gap: 0.3, zoom: 4
      }
    ]
  },

  huygens: {
    label: "Cassini-Huygens",
    craftScale: 0.012,
    events: [
      {
        title: "Launch from Earth",
        date: "October 15, 1997",
        caption: "Huygens launches attached to Cassini on a Titan IVB/Centaur rocket.",
        narration:
          "October 15th, 1997. A Titan Four B rocket launches Cassini, with the European Space Agency's Huygens probe attached to its side. " +
          "The journey to Saturn will take almost seven years, with flybys of Venus, Earth and Jupiter along the way.",
        target: "Earth", isLaunch: true, zoom: 2.6, rocket: "titan-4b"
      },
      {
        title: "Arrival at Saturn",
        date: "July 1, 2004 (UTC)",
        caption: "Cassini and Huygens enter orbit around Saturn.",
        narration:
          "July 1st, 2004, Universal Time. Cassini enters orbit around Saturn, still carrying Huygens.",
        target: "Saturn", zoom: 5
      },
      {
        title: "Huygens separates",
        date: "December 24, 2004",
        caption: "On Christmas Eve, Huygens separates from Cassini and coasts toward Saturn's largest moon, Titan.",
        narration:
          "December 24th, 2004. Huygens separates from Cassini, and coasts on its own toward Titan, Saturn's largest moon.",
        target: "Titan", gap: 1.2, zoom: 1.5
      },
      {
        title: "Landing on Titan",
        date: "January 14, 2005",
        caption: "Huygens descends for 2 hours and 27 minutes on three parachutes and lands: the first landing on a moon of another planet. (Watch the landing from Titan's globe.)",
        narration:
          "January 14th, 2005. Huygens enters Titan's thick, hazy atmosphere. " +
          "Three parachutes open one after another, and the descent takes two hours and twenty-seven minutes. " +
          "It lands on a soft, sandy riverbed: the first landing ever on a moon of another planet. " +
          "It survives on the surface for about seventy-two minutes.",
        target: "Titan", gap: 0.05, zoom: 0.5
      }
    ]
  }
};

// Which 3D model to show at each event, how big it is (display units), and how close the camera gets.
// The lists line up with the events above, in order. Models are in js/models.js.
export const replayVisuals = {
  apollo11: {
    models: ["apollo-stack", "apollo-stack", "lunar-module", "lunar-module", "lm-ascent", "apollo-stack", "apollo-cm"],
    scales: [0.012, 0.012, 0.011, 0.01, 0.012, 0.012, 0.03],
    zooms: [1.4, 0.5, 0.3, 0.25, 0.22, 0.5, 0.6]
  },
  curiosity: {
    models: ["capsule", "capsule", "curiosity", "curiosity"],
    scales: [0.02, 0.02, 0.013, 0.012],
    zooms: [1.4, 0.45, 0.3, 0.26]
  },
  perseverance: {
    models: ["capsule", "capsule", "perseverance", "perseverance", "helicopter-flying"],
    scales: [0.02, 0.02, 0.013, 0.012, 0.014],
    zooms: [1.4, 0.45, 0.3, 0.26, 0.22]
  },
  "galileo-probe": {
    models: ["galileo-orbiter", "galileo-orbiter", "galileo-orbiter", "galileo-orbiter", "galileo-orbiter", "galileo-probe"],
    scales: [0.012, 0.012, 0.012, 0.012, 0.012, 0.03],
    zooms: [1.4, 1.6, 1.6, 1.6, 2.5, 1.0]
  },
  cassini: {
    models: ["cassini-huygens", "cassini-huygens", "cassini-huygens", "cassini-huygens", "cassini-huygens", "cassini", "cassini"],
    scales: [0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01],
    zooms: [1.4, 1.6, 1.6, 2.5, 3, 3, 2.5]
  },
  huygens: {
    models: ["cassini-huygens", "cassini-huygens", "huygens", "huygens"],
    scales: [0.01, 0.01, 0.02, 0.012],
    zooms: [1.4, 3, 1.2, 0.35]
  }
};
