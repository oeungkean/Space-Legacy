// The launch pad each rocket used for the missions in this project (rounded coordinates, marked "about").
// The pads come from the missions' records (for example: Apollo 11 from Pad 39A; STS-31 and Artemis I from
// Pad 39B; Cassini from SLC-40; Parker Solar Probe from SLC-37B; MESSENGER from SLC-17B; Pioneer 10 from
// LC-36A; Gemini III from LC-19; Webb from ELA-3 at Kourou; Zarya from Baikonur). See each mission's
// sources in Missions. Coordinates are approximate (two decimals), for the map and the captions only.

const KSC = "Kennedy Space Center, Florida, USA";
const CCSFS = "Cape Canaveral, Florida, USA";

export const LAUNCH_PADS = {
  "saturn-v": { pad: "Launch Complex 39A", place: KSC, lat: 28.61, lon: -80.60 },
  "saturn-v-skylab": { pad: "Launch Complex 39A", place: KSC, lat: 28.61, lon: -80.60 },
  shuttle: { pad: "Launch Complex 39B", place: KSC, lat: 28.63, lon: -80.62 },
  "shuttle-sts31": { pad: "Launch Complex 39B", place: KSC, lat: 28.63, lon: -80.62 },
  "shuttle-sts88": { pad: "Launch Complex 39A", place: KSC, lat: 28.61, lon: -80.60 },
  sls: { pad: "Launch Complex 39B", place: KSC, lat: 28.63, lon: -80.62 },
  "falcon-9": { pad: "Launch Complex 39A", place: KSC, lat: 28.61, lon: -80.60 },
  "atlas-v-401": { pad: "Space Launch Complex 41", place: CCSFS, lat: 28.58, lon: -80.58 },
  "atlas-v-411": { pad: "Space Launch Complex 41", place: CCSFS, lat: 28.58, lon: -80.58 },
  "atlas-v-541": { pad: "Space Launch Complex 41", place: CCSFS, lat: 28.58, lon: -80.58 },
  "atlas-v-551": { pad: "Space Launch Complex 41", place: CCSFS, lat: 28.58, lon: -80.58 },
  "titan-3e": { pad: "Launch Complex 41", place: CCSFS, lat: 28.58, lon: -80.58 },
  "titan-4b": { pad: "Space Launch Complex 40", place: CCSFS, lat: 28.56, lon: -80.58 },
  "delta-4-heavy": { pad: "Space Launch Complex 37B", place: CCSFS, lat: 28.53, lon: -80.57 },
  "delta-2": { pad: "Space Launch Complex 17", place: CCSFS, lat: 28.45, lon: -80.57 },
  "delta-2-heavy": { pad: "Space Launch Complex 17B", place: CCSFS, lat: 28.45, lon: -80.57 },
  "atlas-centaur": { pad: "Launch Complex 36A", place: CCSFS, lat: 28.47, lon: -80.54 },
  "titan-2": { pad: "Launch Complex 19", place: CCSFS, lat: 28.51, lon: -80.56 },
  "ariane-5": { pad: "ELA-3 launch zone", place: "Guiana Space Centre, Kourou, French Guiana", lat: 5.24, lon: -52.77 },
  proton: { pad: "Site 81", place: "Baikonur Cosmodrome, Kazakhstan", lat: 46.07, lon: 62.98 }
};

export function launchPad(rocket) {
  return LAUNCH_PADS[rocket] || null;
}

export function formatLatLon(lat, lon) {
  return Math.abs(lat).toFixed(2) + "° " + (lat >= 0 ? "N" : "S") + ", " + Math.abs(lon).toFixed(2) + "° " + (lon >= 0 ? "E" : "W");
}
