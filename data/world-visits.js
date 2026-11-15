// Missions that came to a world without landing on it: flybys, orbiters and gravity assists.
// The globes on the "Explore" screens draw a path for each one (Master Doc 10), so every mission linked
// to a world can be seen, not only the ones with a landing marker.
//
// The paths are drawn to show which missions came; their shapes and distances are NOT to scale.
// Every date and distance here is taken from facts already in this project's data, with their sources:
//   catalog = data/catalog.js (each item lists its NASA sources), spacecraft = data/spacecraft.js,
//   hardware = data/hardware.js, destination = the notes in js/destination.js.
// kind: "flyby", "assist" (a gravity-assist flyby), "orbit", or "listed" (linked to this world in the
// catalog, but it did not visit; no path is drawn).

export const WORLD_VISITS = {
  Jupiter: [
    { id: "pioneer10", name: "Pioneer 10", kind: "flyby", date: "December 4, 1973", distance: "130,354 km", text: "The first spacecraft to fly past Jupiter.", from: "catalog" },
    { id: "pioneer11", name: "Pioneer 11", kind: "flyby", date: "December 3, 1974", distance: "42,500 km", text: "Studied Jupiter up close, then used its gravity to reach Saturn.", from: "catalog" },
    { id: "voyager1", name: "Voyager 1", kind: "flyby", date: "March 5, 1979", text: "Found a thin ring around Jupiter and two new moons (Thebe and Metis).", from: "spacecraft" },
    { id: "voyager2", name: "Voyager 2", kind: "flyby", date: "July 9, 1979", text: "The first stop on its tour of the four giant planets.", from: "spacecraft" },
    { id: "new-horizons", name: "New Horizons", kind: "assist", date: "February 28, 2007", text: "Used a Jupiter flyby to speed up on its way to Pluto.", from: "catalog" },
    { id: "galileo", name: "Galileo orbiter", kind: "orbit", date: "Probe released July 13, 1995; sent into Jupiter September 21, 2003", text: "Orbited Jupiter and carried the atmospheric probe there (the probe has its own marker).", from: "catalog, destination" }
  ],
  Saturn: [
    { id: "pioneer11", name: "Pioneer 11", kind: "flyby", date: "September 1, 1979", distance: "20,900 km", text: "The first spacecraft to fly past Saturn.", from: "catalog" },
    { id: "voyager1", name: "Voyager 1", kind: "flyby", date: "November 12, 1980", text: "Flew past Saturn and its moon Titan.", from: "spacecraft" },
    { id: "voyager2", name: "Voyager 2", kind: "flyby", date: "August 25, 1981", text: "The second stop on its tour of the giant planets.", from: "spacecraft" },
    { id: "cassini", name: "Cassini", kind: "orbit", date: "Until its final plunge, September 15, 2017", text: "Orbited Saturn 294 times before diving into it on purpose (the plunge has its own marker).", from: "hardware" }
  ],
  Uranus: [
    { id: "voyager2", name: "Voyager 2", kind: "flyby", date: "January 24, 1986", distance: "About 81,500 km from the cloud tops", text: "The only spacecraft to visit Uranus. It found 11 new moons and 2 new rings.", from: "destination, spacecraft" }
  ],
  Neptune: [
    { id: "voyager2", name: "Voyager 2", kind: "flyby", date: "August 25, 1989", distance: "About 4,950 km above the north pole", text: "The only spacecraft to visit Neptune. It studied Neptune and its moon Triton.", from: "destination, spacecraft" },
    { id: "new-horizons", name: "New Horizons", kind: "listed", text: "Listed with Neptune in the Missions catalog, but it did not visit Neptune: so far Voyager 2 is the only spacecraft to have visited. New Horizons went on to Pluto and Arrokoth.", from: "spacecraft" }
  ],
  Mercury: [
    { id: "messenger", name: "MESSENGER", kind: "orbit", date: "Four years in orbit, until April 30, 2015", text: "Returned nearly 300,000 pictures and found water ice near Mercury's north pole (its impact site has its own marker).", from: "hardware" }
  ],
  Moon: [
    { id: "apollo11-csm", name: "Apollo 11 CSM Columbia", kind: "orbit", date: "July 1969", text: "Stayed in lunar orbit while Eagle landed.", from: "catalog" },
    { id: "lro", name: "Lunar Reconnaissance Orbiter", kind: "orbit", date: "Launched June 18, 2009; still operating", text: "Has been mapping the Moon from orbit since 2009.", from: "catalog" },
    { id: "orion", name: "Orion (Artemis I)", kind: "flyby", date: "November 21, 2022", distance: "About 81 miles (outbound flyby)", text: "Flew past the Moon, entered a distant retrograde orbit on November 25, and made a return flyby.", from: "catalog" }
  ],
  Titan: [
    { id: "cassini", name: "Cassini", kind: "flyby", date: "2004 to 2017", text: "Orbited Saturn and flew past Titan again and again; it carried the Huygens probe, which landed on Titan (its marker).", from: "catalog, hardware" }
  ]
};

export const VISIT_KIND_LABELS = { flyby: "Flyby", assist: "Gravity-assist flyby", orbit: "Orbiter", listed: "Did not visit" };
