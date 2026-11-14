// One real photo for each mission replay, shown on the "Replay finished" card (Master Doc 9).
//
// The photos are official NASA images from the NASA Image and Video Library (https://images.nasa.gov).
// They are loaded from NASA's server when they are needed (nothing is stored in this project); offline,
// the card simply shows without a picture. Each entry links to the image's own page, which has NASA's
// full description and credit. NASA images are generally not copyrighted (NASA Images and Media Usage
// Guidelines: https://www.nasa.gov/nasa-brand-center/images-and-media/). No NASA endorsement is implied.
//
// Three missions use the local photos already credited in data/hardware.js.
// Each caption is based on the image's NASA title and description (checked when chosen, 2026-11-14).

import { hardwareList } from "./hardware.js";

const ASSETS = "https://images-assets.nasa.gov/image/";
function nasa(id, caption, credit, size) {
  return {
    src: ASSETS + id + "/" + id + "~" + (size || "medium") + ".jpg",
    caption: caption,
    credit: credit || "Image: NASA",
    page: "https://images.nasa.gov/details/" + id
  };
}
function local(hardwareId) {
  const h = hardwareList.find(function (item) { return item.id === hardwareId; });
  if (!h || !h.image) return null;
  return { src: h.image.src, caption: h.image.alt, credit: h.image.credit, page: h.image.pageUrl };
}

const PHOTOS = {
  apollo11: function () { return local("apollo11"); },
  curiosity: function () { return local("curiosity"); },
  perseverance: function () { return local("perseverance"); },
  apollo15: nasa("S71-33781", "The Apollo 15 space vehicle on its way from the Vehicle Assembly Building to Pad A (May 1971)."),
  apollo17: nasa("S72-55482", "Launch of the Apollo 17 lunar landing mission (December 1972)."),
  gemini3: nasa("s65-20604", "John Young is helped into the Gemini III spacecraft in the white room (March 23, 1965)."),
  sts31: nasa("s31-76-016", "Hubble's solar array unfolds during the STS-31 mission (April 1990)."),
  demo2: nasa("NHQ202005300029", "The SpaceX Demo-2 launch (May 30, 2020)."),
  artemis1: nasa("NHQ202211160030", "The Artemis I launch (November 16, 2022)."),
  viking1: nasa("7668956", "Viking 1 on its Titan III/Centaur, ready for launch (August 1975)."),
  blueghost1: nasa("KSC-20250114-PH-KLS01_0039", "A Falcon 9 carrying Blue Ghost Mission 1 prepares for launch to the Moon (January 2025)."),
  lro: nasa("200906180006HQ", "LRO and LCROSS lift off on their journey to the Moon (2009)."),
  jwst: nasa("NHQ202112250015", "The James Webb Space Telescope launch (December 25, 2021)."),
  skylab: nasa("S73-26912", "Launch of the uncrewed Skylab 1 (May 1973)."),
  iss: nasa("KSC-98pc1748", "Space Shuttle Endeavour on Pad 39A before STS-88, the flight that joined Unity to Zarya (December 1998)."),
  voyager1: nasa("PIA21747", "The Voyager 1 launch (September 5, 1977).", "Image: NASA/JPL-Caltech"),
  voyager2: nasa("PIA21744", "The Voyager 2 launch (August 20, 1977).", "Image: NASA/JPL-Caltech"),
  pioneer10: nasa("ARC-1972-AC72-2140", "Pioneer 10, encapsulated and mated with its Atlas-Centaur before launch (February 1972)."),
  pioneer11: nasa("9139575", "The Atlas-Centaur launch carrying Pioneer 11 (April 1973)."),
  pioneerVenus: nasa("ARC-1977-AC77-0376-8", "The Pioneer Venus multiprobe being inspected before launch (December 1976)."),
  newHorizons: nasa("KSC-06pd0107", "The launch of New Horizons on an Atlas V (January 2006)."),
  cassini: nasa("PIA00747", "The Cassini orbiter and Huygens probe aboard their Titan IV rocket (1997).", "Image: NASA/JPL"),
  galileo: nasa("PIA00726", "Launch of Galileo on Space Shuttle Atlantis, STS-34 (1989).", "Image: NASA/JPL", "orig"),
  messenger: nasa("KSC-04pd1486", "MESSENGER being prepared for shipment to its launch site (July 2004)."),
  osirisRex: nasa("KSC-20160908-PH_SRJ02_0017", "OSIRIS-REx lifts off on an Atlas V (September 8, 2016)."),
  stardust: nasa("KSC-99pc0133", "Stardust at Launch Pad 17-A before launch (January 1999)."),
  parker: nasa("NHQ201808120013", "The Parker Solar Probe launch (August 12, 2018).")
};

// Replay titles (from the Missions page, the Solar System and the Mission Builder) -> photo
const BY_TITLE = {
  "Apollo 11": "apollo11", "Apollo 11 Eagle": "apollo11",
  "Curiosity": "curiosity", "Mars Science Laboratory": "curiosity",
  "Perseverance": "perseverance", "Mars 2020": "perseverance",
  "Apollo 15": "apollo15", "Apollo 17": "apollo17", "Gemini III": "gemini3",
  "STS-31 (Hubble deployment)": "sts31", "Hubble Space Telescope": "sts31",
  "Crew Dragon Demo-2": "demo2", "Artemis I": "artemis1", "Artemis I (Orion)": "artemis1",
  "Viking 1": "viking1", "Blue Ghost Mission 1": "blueghost1", "Lunar Reconnaissance Orbiter": "lro",
  "James Webb Space Telescope": "jwst", "Skylab": "skylab", "ISS: Zarya": "iss", "ISS: Zarya and Unity": "iss",
  "Voyager 1": "voyager1", "Voyager 2": "voyager2", "Pioneer 10": "pioneer10", "Pioneer 11": "pioneer11",
  "Pioneer Venus 2": "pioneerVenus", "New Horizons": "newHorizons", "Cassini": "cassini", "Cassini-Huygens": "cassini",
  "Galileo": "galileo", "MESSENGER": "messenger", "OSIRIS-REx": "osirisRex", "Stardust": "stardust",
  "Parker Solar Probe": "parker"
};

// The photo for a replay's title, or null (fictional Free Build missions have none)
export function missionPhoto(title) {
  const key = BY_TITLE[String(title || "").trim()];
  if (!key) return null;
  const entry = PHOTOS[key];
  return typeof entry === "function" ? entry() : entry;
}
