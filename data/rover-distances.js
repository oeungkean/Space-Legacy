// How far each rover has driven on the Moon and Mars, for the "How far it drove" chart on rover pages.
// Source: NASA/JPL infographic "Out-of-this-world records! Driving distances on Mars and the Moon",
// as of October 12, 2026, published on NASA's Mars Exploration Rovers page (file
// JPL_DrivingDistanceRecord_GraphicRecreation_August2026_v3.png). Values are copied exactly as printed.
// Perseverance and Curiosity are still driving, so their distances grow after that date.
// "est." values are marked as estimates on the original.
//
// item = the id of this rover's page in data/catalog.js (only NASA rovers have one)

export const ROVER_DISTANCES = {
  asOf: "October 12, 2026",
  source: {
    label: "NASA/JPL: Out-of-this-world records, driving distances on Mars and the Moon (as of Oct. 12, 2026)",
    url: "https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/"
  },
  marathonKm: 42.195,
  rovers: [
    { key: "perseverance", name: "Perseverance", world: "Mars", km: 45.2, years: "2020–present", operating: true, item: "perseverance" },
    { key: "opportunity", name: "Opportunity", world: "Mars", km: 45.16, years: "2004–2018", item: "opportunity" },
    { key: "lunokhod2", name: "Lunokhod 2 (USSR)", world: "Moon", km: 39, years: "1973" },
    { key: "curiosity", name: "Curiosity", world: "Mars", km: 38.15, years: "2012–present", operating: true, item: "curiosity" },
    { key: "lrv17", name: "Apollo 17 Lunar Rover", world: "Moon", km: 35.74, years: "1972" },
    { key: "lrv15", name: "Apollo 15 Lunar Rover", world: "Moon", km: 27.8, years: "1971", item: "lrv",
      note: "NASA's NSSDCA catalog gives 27.9 km for Apollo 15's three moonwalks together (driving and walking)." },
    { key: "lrv16", name: "Apollo 16 Lunar Rover", world: "Moon", km: 27.1, years: "1972" },
    { key: "lunokhod1", name: "Lunokhod 1 (USSR)", world: "Moon", km: 10.5, years: "1970–1971" },
    { key: "spirit", name: "Spirit", world: "Mars", km: 7.7, years: "2004–2010", item: "spirit" },
    { key: "sojourner", name: "Sojourner", world: "Mars", km: 0.1, years: "1997", item: "pathfinder" },
    { key: "yutu2", name: "Yutu 2 (China)", world: "Moon", km: 0.1, years: "2019–2024", estimate: true },
    { key: "yutu", name: "Yutu (China)", world: "Moon", km: 0.1, years: "2013–2016", estimate: true }
  ]
};

// The rover each page is about (its row is highlighted)
export function roverForItem(itemId) {
  return ROVER_DISTANCES.rovers.find(function (r) { return r.item === itemId; }) || null;
}
