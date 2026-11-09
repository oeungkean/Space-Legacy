// Basic facts about each planet, shown in the information panel.
// "explore" is the text on the Explore button. null means exploring is not available yet,
// and "exploreNote" then explains why.
// AU = Astronomical Unit = the average distance from Earth to the Sun.

export const planetInfo = {
  Sun: {
    summary: "The star at the center of our solar system. Everything else in this view orbits it.",
    facts: [
      ["Type", "G-type star (a yellow dwarf)"],
      ["Diameter", "about 1,391,000 km"],
      ["Distance from Earth", "about 1 AU (about 149.6 million km)"],
      ["Age", "about 4.6 billion years"]
    ],
    explore: null,
    exploreNote: "The Sun has no solid surface to explore."
  },
  Mercury: {
    summary: "The smallest planet and the closest one to the Sun.",
    facts: [
      ["Diameter", "about 4,879 km"],
      ["Distance from Sun", "about 0.39 AU"],
      ["Orbit time", "about 88 Earth days"],
      ["Moons", "0"]
    ],
    explore: "Explore Mercury"
  },
  Venus: {
    summary: "A rocky planet with a thick atmosphere that traps heat, making it the hottest planet.",
    facts: [
      ["Diameter", "about 12,104 km"],
      ["Distance from Sun", "about 0.72 AU"],
      ["Orbit time", "about 225 Earth days"],
      ["Moons", "0"]
    ],
    explore: "Explore Venus"
  },
  Earth: {
    summary: "Our home, the only place known to have life. Its natural satellite is the Moon, where NASA's Apollo missions landed.",
    facts: [
      ["Diameter", "about 12,742 km"],
      ["Distance from Sun", "1 AU"],
      ["Orbit time", "about 365 days"],
      ["Moons", "1"]
    ],
    explore: "Explore the Moon"
  },
  Mars: {
    summary: "A cold, dusty desert world. Several NASA landers and rovers have explored its surface.",
    facts: [
      ["Diameter", "about 6,779 km"],
      ["Distance from Sun", "about 1.52 AU"],
      ["Orbit time", "about 687 Earth days"],
      ["Moons", "2 (Phobos and Deimos)"]
    ],
    explore: "Explore Mars"
  },
  Jupiter: {
    summary: "The largest planet, a gas giant with a huge storm called the Great Red Spot.",
    facts: [
      ["Diameter", "about 139,820 km"],
      ["Distance from Sun", "about 5.2 AU"],
      ["Orbit time", "about 11.9 Earth years"],
      ["Moons", "more than 90 known"]
    ],
    explore: "Explore Jupiter"
  },
  Saturn: {
    summary: "A gas giant famous for its bright system of rings.",
    facts: [
      ["Diameter", "about 116,460 km"],
      ["Distance from Sun", "about 9.6 AU"],
      ["Orbit time", "about 29.4 Earth years"],
      ["Moons", "more than 140 known"]
    ],
    explore: "Explore Saturn"
  },
  Uranus: {
    summary: "An ice giant that spins tilted on its side.",
    facts: [
      ["Diameter", "about 50,724 km"],
      ["Distance from Sun", "about 19.2 AU"],
      ["Orbit time", "about 84 Earth years"],
      ["Moons", "about 28 known"]
    ],
    explore: "Explore Uranus"
  },
  Neptune: {
    summary: "A distant, windy ice giant and the farthest planet from the Sun.",
    facts: [
      ["Diameter", "about 49,244 km"],
      ["Distance from Sun", "about 30.1 AU"],
      ["Orbit time", "about 165 Earth years"],
      ["Moons", "about 16 known"]
    ],
    explore: "Explore Neptune"
  },
  Titan: {
    summary: "Saturn's largest moon, with a thick, hazy atmosphere. Besides Earth, it is the only place known to have liquids on its surface: rivers, lakes and seas of liquid methane and ethane.",
    facts: [
      ["Diameter", "about 5,150 km (second-largest moon, after Ganymede)"],
      ["Distance from Saturn", "about 1.2 million km"],
      ["Orbit time", "about 15 days and 22 hours"],
      ["Atmosphere", "about 95% nitrogen and 5% methane, about 60% higher surface pressure than Earth's"],
      ["Surface temperature", "about -179 \u00B0C"]
    ],
    sources: [{ label: "NASA Science: Titan facts", url: "https://science.nasa.gov/saturn/moons/titan/facts/" }],
    explore: "Explore Titan"
  },
  Moon: {
    summary: "Earth's only natural satellite. NASA's Apollo missions landed here.",
    facts: [
      ["Diameter", "about 3,475 km"],
      ["Distance from Earth", "about 384,400 km (average)"],
      ["Orbit time", "about 27.3 Earth days"],
      ["Moons", "0"]
    ],
    explore: "Explore the Moon"
  }
};