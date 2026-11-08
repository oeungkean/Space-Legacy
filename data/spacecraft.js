// Facts, captions and spoken narration for the three spacecraft in the solar system view.
// Facts come from the sources linked in each entry. Check them again before presenting.
// In "replay", target says where the replay goes:
//   a planet name, "outbound" (out past Neptune), or "oval" (near the Sun, ovalAngle = where on the oval).
// zoom = how close the camera gets at that event.
// caption = short text shown on screen. narration = the longer story the voice reads aloud.
// Narration is written the way it should be spoken (numbers and names spelled out).

const CRAFT_NOTE =
  "Positions and paths are illustrative, not real trajectories. Facts come from the sources below. " +
  "Status changes over time, so check NASA's pages for the latest.";

export const spacecraftInfo = {
  "Voyager 1": {
    summary:
      "A NASA probe launched in 1977 to fly past Jupiter and Saturn. It later became the first spacecraft to enter interstellar space.",
    facts: [
      ["Agency", "NASA (Jet Propulsion Laboratory)"],
      ["Launch", "September 5, 1977 at 8:56 a.m. Eastern time (12:56 UTC), Titan IIIE-Centaur rocket, Launch Complex 41, Cape Canaveral, Florida"],
      ["Original purpose", "Flybys of Jupiter and Saturn (and Saturn's moon Titan)"],
      ["Key dates", "Jupiter flyby: March 5, 1979. Saturn flyby: November 12, 1980. Entered interstellar space: August 25, 2012."],
      ["Discoveries", "A thin ring around Jupiter, and two new moons of Jupiter (Thebe and Metis)."],
      ["Status (reported 2026)", "Still operating in NASA's extended mission, outside the heliosphere. In April 2026 NASA turned off another instrument to save power, leaving two science instruments working. It is expected to be one light-day from Earth on November 18, 2026."]
    ],
    note: CRAFT_NOTE,
    sources: [
      { label: "NASA Science: Voyager 1", url: "https://science.nasa.gov/mission/voyager1" },
      { label: "NASA: Voyager 1 in depth", url: "https://science.nasa.gov/voyager-1" },
      { label: "NASA Science: Voyager mission and status", url: "https://science.nasa.gov/mission/voyager/" },
      { label: "Launch details (not NASA): This Day in Aviation", url: "https://www.thisdayinaviation.com/tag/launch-complex-41/" }
    ],
    replay: [
      {
        title: "Launch from Earth",
        date: "September 5, 1977",
        caption: "Voyager 1 lifts off from Cape Canaveral, Florida, on a Titan IIIE-Centaur rocket, 16 days after its twin, Voyager 2.",
        narration:
          "It is the morning of September 5th, 1977, at Launch Complex 41 in Cape Canaveral, Florida. " +
          "A Titan Three-E Centaur rocket stands on the pad with the Voyager 1 spacecraft on top. " +
          "At 8:56 in the morning, Eastern time, the rocket's two solid rocket boosters ignite and push it off the ground. " +
          "The boosters and the Titan's own stages do the heavy lifting through the atmosphere. " +
          "Then the Centaur upper stage takes over and sends the spacecraft on its way. " +
          "A final rocket motor attached to the spacecraft gives the last push toward Jupiter. " +
          "Voyager 1 is launching sixteen days after its twin, Voyager 2, but on a faster, shorter path. " +
          "A few months from now, it will overtake its twin.",
        target: "Earth", isLaunch: true, zoom: 9, rocket: "titan-3e"
      },
      {
        title: "Jupiter flyby",
        date: "March 5, 1979",
        caption: "Closest approach to Jupiter, about 280,000 km (174,000 miles). Voyager 1 found a thin ring around the planet and two new moons, Thebe and Metis.",
        narration:
          "March 5th, 1979. Voyager 1 sweeps past Jupiter, passing about two hundred eighty thousand kilometers from the planet. " +
          "Its cameras reveal a faint, thin ring around the giant planet, and two new moons, Thebe and Metis. " +
          "Jupiter's gravity then swings the spacecraft onward toward Saturn.",
        target: "Jupiter", zoom: 12
      },
      {
        title: "Saturn flyby",
        date: "November 12, 1980",
        caption: "Closest approach to Saturn, about 126,000 km. Voyager 1 also flew close to Saturn's moon Titan, then took a path out of the solar system.",
        narration:
          "November 12th, 1980. Voyager 1 reaches Saturn, passing about one hundred twenty-six thousand kilometers from the planet. " +
          "It also flies close to Saturn's largest moon, Titan. " +
          "After this encounter, the spacecraft takes a path out of the solar system.",
        target: "Saturn", zoom: 12
      },
      {
        title: "Entering interstellar space",
        date: "August 25, 2012",
        caption: "Voyager 1 leaves the heliosphere, the bubble of particles the Sun blows around itself. It is the first spacecraft to measure interstellar space.",
        narration:
          "August 25th, 2012. Almost thirty-five years after launch, Voyager 1 crosses the heliopause, the edge of the bubble of particles that the Sun blows around itself. " +
          "It becomes the first spacecraft to measure the space between the stars. " +
          "In 2026, NASA is still receiving data from it, and is switching off instruments, one at a time, to keep it running as long as possible.",
        target: "outbound", zoom: 30
      }
    ]
  },

  "Voyager 2": {
    summary:
      "A NASA probe launched in 1977 to study the outer planets. It is the only spacecraft so far to have flown past all four giant planets, and the second to enter interstellar space.",
    facts: [
      ["Agency", "NASA (Jet Propulsion Laboratory)"],
      ["Launch", "August 20, 1977 at 10:29 a.m. Eastern time (16 days before Voyager 1), Titan IIIE-Centaur rocket, Launch Complex 41, Cape Canaveral, Florida"],
      ["Original purpose", "Study the outer planets. Its path allowed flybys of Jupiter and Saturn, with the option to continue to Uranus and Neptune."],
      ["Key dates", "Jupiter: July 9, 1979. Saturn: August 25, 1981 (NASA key date). Uranus: January 24, 1986. Neptune: August 25, 1989. Interstellar space: November 5, 2018."],
      ["Discoveries", "The first close-up views of Uranus and Neptune. So far it is the only spacecraft to have flown past both."],
      ["Status (reported 2026)", "Still operating in NASA's extended mission, outside the heliosphere. NASA reported in 2026 that three science instruments remained working and that engineers freed up power to prolong its science mission."]
    ],
    note: CRAFT_NOTE,
    sources: [
      { label: "NASA Science: Voyager 2", url: "https://science.nasa.gov/mission/voyager/voyager-2" },
      { label: "NASA Science: Voyager mission and status", url: "https://science.nasa.gov/mission/voyager/" },
      {
        label: "Launch details (not NASA): Voyager 2 at 40 years",
        url: "https://www.americaspace.com/2017/08/20/four-decades-four-planets-voyager-2-celebrates-40-years-of-deep-space-exploration/"
      }
    ],
    replay: [
      {
        title: "Launch from Earth",
        date: "August 20, 1977",
        caption: "Voyager 2 lifts off from Cape Canaveral, Florida, on a Titan IIIE-Centaur rocket. It launches before Voyager 1 but on a slower path.",
        narration:
          "August 20th, 1977. At 10:29 in the morning, Eastern time, a Titan Three-E Centaur rocket lifts off from Launch Complex 41 at Cape Canaveral, carrying Voyager 2. " +
          "At liftoff, two solid rocket motors ignite with a combined thrust of about two point four million pounds. " +
          "They push the rocket upward for the first two minutes of flight. " +
          "Then the Titan's core stages and the Centaur upper stage carry the spacecraft toward the outer solar system, and a final rocket motor attached to the spacecraft sends it on to Jupiter. " +
          "Voyager 2 launches first, even though it is the second Voyager, because it takes a slower path. " +
          "Voyager 1 will launch sixteen days later, and will reach Jupiter about four months earlier.",
        target: "Earth", isLaunch: true, zoom: 9, rocket: "titan-3e"
      },
      {
        title: "Jupiter flyby",
        date: "July 9, 1979",
        caption: "Closest approach to Jupiter. Jupiter's gravity gives the probe a boost toward Saturn.",
        narration:
          "July 9th, 1979. Voyager 2 flies past Jupiter, following up on what Voyager 1 found four months earlier. " +
          "Jupiter's gravity gives the probe a boost toward Saturn.",
        target: "Jupiter", zoom: 12
      },
      {
        title: "Saturn flyby",
        date: "August 25, 1981",
        caption: "Closest approach to Saturn. NASA lists August 25; some sources give August 26 (UTC). Saturn's gravity bends its path toward Uranus.",
        narration:
          "August 25th, 1981, by NASA's count. Voyager 2 passes Saturn, and Saturn's gravity bends its path toward Uranus.",
        target: "Saturn", zoom: 12
      },
      {
        title: "Uranus flyby",
        date: "January 24, 1986",
        caption: "The first close flyby of Uranus. So far, no other spacecraft has visited it.",
        narration:
          "January 24th, 1986. Voyager 2 makes the first close flyby of Uranus. " +
          "So far, it is the only spacecraft ever to have visited this ice giant.",
        target: "Uranus", zoom: 10
      },
      {
        title: "Neptune flyby",
        date: "August 25, 1989",
        caption: "The last planetary encounter. Voyager 2 studies Neptune and its moon Triton. So far, no other spacecraft has visited Neptune.",
        narration:
          "August 25th, 1989. Twelve years after launch, Voyager 2 reaches Neptune, the last planet on its tour. " +
          "It studies Neptune and its moon Triton. " +
          "So far, no other spacecraft has visited Neptune.",
        target: "Neptune", zoom: 10
      },
      {
        title: "Entering interstellar space",
        date: "November 5, 2018",
        caption: "Voyager 2 crosses the heliopause and becomes the second spacecraft in interstellar space.",
        narration:
          "November 5th, 2018. More than forty years after launch, Voyager 2 crosses the heliopause and becomes the second spacecraft in interstellar space. " +
          "NASA reports in 2026 that it is still operating.",
        target: "outbound", zoom: 30
      }
    ]
  },

  "Parker Solar Probe": {
    summary:
      "A NASA probe designed to study the Sun's outer atmosphere, the corona. It has flown closer to the Sun than any other human-made object.",
    facts: [
      ["Agency", "NASA. Designed, built and operated by the Johns Hopkins Applied Physics Laboratory."],
      ["Launch", "August 12, 2018 at 3:31 a.m. Eastern time (07:31 UTC), Delta IV Heavy rocket with an extra third stage (Star 48BV), Space Launch Complex 37, Cape Canaveral, Florida"],
      ["Original purpose", "Study the Sun's corona and the solar wind."],
      ["Key dates", "Seven Venus flybys between 2018 and 2024 (the last on November 6, 2024) tightened its orbit. Closest approach so far: December 24, 2024, about 6.1 million km (3.8 million miles) from the Sun's surface at about 692,000 km/h."],
      ["Contributions", "It flies through the corona and has set records for closeness to the Sun and speed. It has sampled the Sun's atmosphere from quiet to very active periods."],
      ["Status (reported 2026)", "Operating in its record close orbit. Its 28th close approach on June 8, 2026 matched the record distance. NASA said in September 2026 that the mission is extended into 2029."]
    ],
    note: CRAFT_NOTE,
    sources: [
      {
        label: "NASA: Parker Solar Probe update (September 2026)",
        url: "https://science.nasa.gov/blogs/parker-solar-probe/2026/09/10/after-latest-swing-past-sun-nasas-parker-solar-probe-checks-in/"
      },
      {
        label: "NASA: 28th close pass of the Sun (June 2026)",
        url: "https://science.nasa.gov/blogs/parker-solar-probe/2026/06/11/parker-solar-probe-makes-28th-close-pass-of-sun/"
      },
      {
        label: "NASA/Goddard news release: closest pass to the Sun",
        url: "https://www.eurekalert.org/news-releases/1069210"
      },
      {
        label: "NASA/APL blog: launch preparations (July 2018)",
        url: "https://blogs.nasa.gov/parkersolarprobe/2018/07"
      },
      {
        label: "Launch details (not NASA): Satellite Today",
        url: "https://www.satellitetoday.com/launch/2018/08/13/nasa-spacecraft-launched-by-united-launch-alliance/"
      }
    ],
    replay: [
      {
        title: "Launch from Earth",
        date: "August 12, 2018",
        caption: "Parker Solar Probe launches from Cape Canaveral, Florida, on a Delta IV Heavy rocket with an extra third stage, bound for the Sun.",
        narration:
          "It is the early morning of August 12th, 2018, at Space Launch Complex 37 in Cape Canaveral, Florida. " +
          "A Delta Four Heavy rocket, the largest operational launch vehicle at the time, carries NASA's Parker Solar Probe. " +
          "At 3:31 in the morning, Eastern time, its three booster cores ignite. " +
          "Reaching the Sun takes about fifty-five times more energy than reaching Mars, so this rocket carries an extra third stage, a solid rocket motor called Star forty-eight B V. " +
          "It is the first time a Delta Four Heavy has flown with one. " +
          "That third stage burns for only about a minute and a half, but it gives the probe nearly two thirds of its launch speed. " +
          "About forty-three minutes after liftoff, Parker Solar Probe separates from the rocket and begins its journey to the Sun.",
        target: "Earth", isLaunch: true, zoom: 9, rocket: "delta-4-heavy"
      },
      {
        title: "Seven Venus flybys",
        date: "October 2018 to November 2024",
        caption: "Gravity-assist flybys of Venus, the first about 52 days after launch and the last on November 6, 2024, steadily tightened the probe's orbit around the Sun.",
        narration:
          "Over the next six years, Parker flies past Venus seven times. " +
          "The first flyby comes about fifty-two days after launch, and the last on November 6th, 2024. " +
          "Each flyby uses Venus's gravity to tighten the probe's orbit around the Sun.",
        target: "Venus", zoom: 10
      },
      {
        title: "Record closest approach",
        date: "December 24, 2024",
        caption: "Parker passes about 6.1 million km from the Sun's surface at about 692,000 km/h, the closest and fastest for any human-made object.",
        narration:
          "December 24th, 2024. Parker passes about six point one million kilometers from the Sun's surface, moving at about six hundred ninety-two thousand kilometers per hour. " +
          "No human-made object has ever been closer, or faster.",
        target: "oval", ovalAngle: 0, zoom: 5
      },
      {
        title: "Still circling the Sun",
        date: "June 8, 2026",
        caption: "On its 28th close approach, Parker matched its record distance again. It remains in this orbit, and NASA has extended the mission into 2029.",
        narration:
          "June 8th, 2026. On its twenty-eighth close approach, Parker matched its record distance once again. " +
          "It remains in this orbit around the Sun, and NASA has extended the mission into 2029.",
        target: "oval", ovalAngle: 0.9, zoom: 5
      }
    ]
  }
};