// Flat line icons (same style as the volume and settings icons): one stroke color, no fill, no background.
// Each icon is a small drawing that represents the real rocket, spacecraft, place or tool.
//   rocketIcon(key)        the rocket's outline: height, boosters, nose (capsule, fairing, Shuttle...)
//   craftIcon(key)         capsule, telescope, rover, lander, probe...
//   destinationIcon(key)   planets, orbits and points in space
//   siteIcon(site)         what you use at an exploration site (astronaut, LRV, rover, capsule)
//   toolIcon(code)         equipment: camera, sample bag, radio, robotic arm...
// These are simplified drawings (representative), not exact technical outlines.

function svg(body, viewBox) {
  return '<svg class="line-icon" viewBox="' + (viewBox || "0 0 24 24") + '" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + "</svg>";
}

function f(n) { return Math.round(n * 100) / 100; }

// ----- Rockets -----
// h = height (0..1 of the tallest), w = core width, b = side boosters (0, 1, 2), cores = 3 for Delta IV Heavy
// top: "tower" (capsule + escape tower), "capsule", "fairing" (pointed), "wide" (bulbous fairing), "dome"
// bands = stage lines, fins = small fins at the base, legs = landing legs (Falcon 9)
const ROCKET_SHAPES = {
  "saturn-v": { h: 1, w: 4, top: "tower", bands: [0.35, 0.62, 0.78], fins: true },
  "saturn-v-skylab": { h: 0.93, w: 4, top: "dome", bands: [0.38, 0.68], fins: true },
  "titan-2": { h: 0.5, w: 2.6, top: "capsule", bands: [0.62] },
  "titan-3e": { h: 0.7, w: 2.6, b: 2, bw: 2, top: "fairing", bands: [0.55] },
  "titan-4b": { h: 0.78, w: 2.8, b: 2, bw: 2, top: "fairing", bands: [0.5] },
  "atlas-centaur": { h: 0.6, w: 2.8, top: "fairing", bands: [0.6] },
  "delta-2": { h: 0.52, w: 2.2, b: 2, bw: 1, bh: 0.32, top: "fairing", bands: [0.62] },
  "delta-2-heavy": { h: 0.54, w: 2.2, b: 2, bw: 1.4, bh: 0.36, top: "fairing", bands: [0.62] },
  "atlas-v-401": { h: 0.7, w: 2.8, top: "fairing", bands: [0.58] },
  "atlas-v-411": { h: 0.7, w: 2.8, b: 1, bw: 1.3, bh: 0.32, top: "fairing", bands: [0.58] },
  "atlas-v-541": { h: 0.74, w: 2.8, b: 2, bw: 1.3, bh: 0.32, top: "wide", bands: [0.56] },
  "atlas-v-551": { h: 0.76, w: 2.8, b: 2, bw: 1.3, bh: 0.32, top: "wide", bands: [0.56], extra: true },
  "delta-4-heavy": { h: 0.8, w: 2.6, cores: 3, top: "fairing", bands: [0.66] },
  "falcon-9": { h: 0.86, w: 2.4, top: "fairing", bands: [0.7], legs: true },
  "sls": { h: 0.92, w: 3.4, b: 2, bw: 1.8, bh: 0.62, top: "tower", bands: [0.66] },
  "proton": { h: 0.62, w: 3, b: 2, bw: 1.3, bh: 0.3, top: "fairing", bands: [0.42, 0.62] },
  "ariane-5": { h: 0.64, w: 2.8, b: 2, bw: 1.8, bh: 0.5, top: "dome", bands: [0.7] }
};

function rocketBody(cx, bottom, height, w, top, bands, fins) {
  const half = w / 2;
  const topY = bottom - height;
  let d = "";
  let noseY = topY;
  if (top === "tower") {
    // Spacecraft adapter, capsule cone and the escape tower on top
    const cone = Math.min(2.2, height * 0.12);
    d += '<path d="M' + f(cx - half) + " " + f(topY) + "L" + f(cx - half * 0.45) + " " + f(topY - cone) + "H" + f(cx + half * 0.45) + "L" + f(cx + half) + " " + f(topY) + '"/>';
    d += '<path d="M' + f(cx) + " " + f(topY - cone) + "V" + f(topY - cone - 2.4) + '"/>';
    noseY = topY - cone - 2.4;
  } else if (top === "capsule") {
    const cone = Math.min(2, height * 0.16);
    d += '<path d="M' + f(cx - half) + " " + f(topY) + "L" + f(cx - half * 0.35) + " " + f(topY - cone) + "H" + f(cx + half * 0.35) + "L" + f(cx + half) + " " + f(topY) + '"/>';
    noseY = topY - cone;
  } else if (top === "wide") {
    const bulge = half + 0.7;
    d += '<path d="M' + f(cx - half) + " " + f(topY) + "L" + f(cx - bulge) + " " + f(topY - 1) + "V" + f(topY - 3) + "Q" + f(cx) + " " + f(topY - 6.2) + " " + f(cx + bulge) + " " + f(topY - 3) + "V" + f(topY - 1) + "L" + f(cx + half) + " " + f(topY) + '"/>';
    noseY = topY - 5;
  } else if (top === "dome") {
    d += '<path d="M' + f(cx - half) + " " + f(topY) + "Q" + f(cx) + " " + f(topY - w * 1.1) + " " + f(cx + half) + " " + f(topY) + '"/>';
    noseY = topY - w * 0.55;
  } else {
    d += '<path d="M' + f(cx - half) + " " + f(topY) + "Q" + f(cx - half * 0.6) + " " + f(topY - w * 0.9) + " " + f(cx) + " " + f(topY - w * 1.25) + "Q" + f(cx + half * 0.6) + " " + f(topY - w * 0.9) + " " + f(cx + half) + " " + f(topY) + '"/>';
    noseY = topY - w * 1.25;
  }
  d += '<path d="M' + f(cx - half) + " " + f(topY) + "V" + f(bottom) + "H" + f(cx + half) + "V" + f(topY) + '"/>';
  (bands || []).forEach(function (t) {
    const y = bottom - height * t;
    d += '<path d="M' + f(cx - half) + " " + f(y) + "H" + f(cx + half) + '" opacity=".6"/>';
  });
  if (fins) {
    d += '<path d="M' + f(cx - half) + " " + f(bottom - 2) + "L" + f(cx - half - 1.4) + " " + f(bottom + 0.4) + "H" + f(cx - half) + '"/>';
    d += '<path d="M' + f(cx + half) + " " + f(bottom - 2) + "L" + f(cx + half + 1.4) + " " + f(bottom + 0.4) + "H" + f(cx + half) + '"/>';
  }
  return { d: d, noseY: noseY };
}

function booster(cx, bottom, height, w) {
  const half = w / 2;
  return '<path d="M' + f(cx - half) + " " + f(bottom) + "V" + f(bottom - height) + "Q" + f(cx) + " " + f(bottom - height - w * 1.3) + " " + f(cx + half) + " " + f(bottom - height) + "V" + f(bottom) + 'Z"/>';
}

export function rocketIcon(key) {
  if (key === "shuttle" || key === "shuttle-sts31" || key === "shuttle-sts88") {
    // Orbiter on the side of the external tank, with two solid rocket boosters
    return svg(
      '<path d="M10.5 21.5V7Q12 3.2 13.5 7V21.5Z"/>' +                       // external tank
      '<path d="M8.5 21.5V9.5Q9.2 7.6 9.9 9.5V21.5Z"/><path d="M14.1 21.5V9.5Q14.8 7.6 15.5 9.5V21.5Z"/>' + // boosters
      '<path d="M15.6 11.5Q17.4 11.5 17.6 14.5L19.8 19.6H15.6Z"/><path d="M17.6 16.6L20.6 20.2"/>'          // orbiter
    );
  }
  const s = ROCKET_SHAPES[key] || { h: 0.7, w: 2.8, top: "fairing" };
  const bottom = 22;
  const height = 4 + s.h * 13;
  let body = "";
  if (s.cores === 3) {
    body += booster(12 - s.w, bottom, height * 0.84, s.w) + booster(12 + s.w, bottom, height * 0.84, s.w);
  }
  if (s.b) {
    const bw = s.bw || 1.4;
    const bh = height * (s.bh || 0.45);
    const off = s.w / 2 + bw / 2 + 0.2;
    body += booster(12 - off, bottom, bh, bw);
    if (s.b > 1) body += booster(12 + off, bottom, bh, bw);
  }
  const core = rocketBody(12, bottom, height, s.w, s.top, s.bands, s.fins);
  body += core.d;
  if (s.legs) body += '<path d="M' + f(12 - s.w / 2) + ' 20L' + f(12 - s.w / 2 - 1.6) + ' 22.4M' + f(12 + s.w / 2) + ' 20L' + f(12 + s.w / 2 + 1.6) + ' 22.4"/>';
  if (s.extra) body += '<path d="M12 22v-3" opacity=".6"/>'; // a hint of the fifth booster behind
  return svg(body);
}

// ----- Spacecraft -----
const CRAFT_DRAWINGS = {
  capsule: '<path d="M9 9h6l2.5 6h-11z"/><path d="M6.5 15h11v5h-11z"/><path d="M12 9V6"/><path d="M9.5 17.5h5" opacity=".6"/>',
  gemini: '<path d="M10 6h4l2.6 7h-9.2z"/><path d="M7.4 13h9.2l1.4 7H6z"/><path d="M8 16.5h8" opacity=".6"/>',
  dragon: '<path d="M9.5 4.5h5l3 7h-11z"/><path d="M6.5 11.5h11v8h-11z"/><path d="M6.5 15.5h11" opacity=".6"/><path d="M11 6.5h2" opacity=".6"/>',
  orion: '<path d="M9.5 5h5l2.5 5.5h-10z"/><path d="M8 10.5h8v6H8z"/><path d="M8 13.5L2.5 11.5M16 13.5l5.5-2M8 15.5L3 19M16 15.5l5 3.5"/>',
  telescope: '<path d="M7.5 6.5l9 2.8-2.6 8.6-9-2.8z"/><path d="M16.5 9.3l2.2.7-1.6 5.4-2.2-.7"/><path d="M8.6 5.5L3 3.8M13.3 18.7L19 20.4"/><path d="M3 2.5L2 6M19.5 18.5l-1 3.6"/>',
  jwst: '<path d="M12 3.5l2.4 1.4v2.8L12 9.1 9.6 7.7V4.9z"/><path d="M12 9.1v3"/><path d="M3 15l9-3 9 3-9 3z"/><path d="M5.5 15.8L12 18l6.5-2.2" opacity=".6"/>',
  station: '<path d="M9 9h6v6H9z"/><path d="M15 10.5h3v3h-3"/><path d="M12 9V3M12 15v6"/><path d="M9 3.5h6M9 20.5h6" /><path d="M4 7l-2 10M20 7l2 10" opacity=".6"/><path d="M9 12H3"/>',
  rover: '<path d="M5 10h13v4H5z"/><path d="M8 10V5.5M6.5 5.5h3"/><path d="M18 12l3 1.5"/><circle cx="6.5" cy="18" r="2"/><circle cx="12" cy="18" r="2"/><circle cx="17.5" cy="18" r="2"/><path d="M6.5 16l1.5-2M12 16v-2M17.5 16l-1.5-2"/>',
  lander: '<path d="M8 8h8v5H8z"/><path d="M8 13l-3.5 6M16 13l3.5 6M3 19h3M18 19h3"/><path d="M12 8V5"/><path d="M9.5 4.5Q12 2.5 14.5 4.5"/>',
  dish: '<path d="M4 9Q12 3 20 9"/><path d="M4 9h16" opacity=".6"/><path d="M12 9v3"/><path d="M9.5 12h5v4h-5z"/><path d="M14.5 14L21 20M9.5 14.5L5 19"/>',
  "box-probe": '<path d="M9 9h6v6H9z"/><path d="M15 12h2"/><path d="M17 8.5h4v7h-4z"/><path d="M19 8.5v7" opacity=".6"/><path d="M9 11L5 8M9 13l-4 3"/><path d="M5 6.5v3M5 14.5v3"/>',
  shield: '<path d="M6 4Q3.5 12 6 20"/><path d="M6 12h3"/><path d="M9 9h5v6H9z"/><path d="M14 10l6-3M14 14l6 3"/><path d="M11.5 15v4" opacity=".6"/>',
  "entry-probe": '<path d="M5 15L12 6l7 9z"/><path d="M6.5 15Q12 19.5 17.5 15"/><path d="M10 11h4" opacity=".6"/>',
  "dish-tall": '<path d="M6 7Q12 2 18 7"/><path d="M12 7v2"/><path d="M9.5 9h5v10h-5z"/><path d="M14.5 15.5l2.5 1.5v3l-2.5-1"/><path d="M9.5 12L4 14M9.5 17.5h-3" opacity=".7"/>',
  umbrella: '<path d="M4 9.5Q12 1 20 9.5"/><path d="M4 9.5L12 7l8 2.5M8 6l4 1 4-1" opacity=".6"/><path d="M12 7v6"/><path d="M10 13h4v4h-4z"/><path d="M12 17v4M10 15l-5 3"/>',
  triangle: '<path d="M6 17L12 8l6 9z"/><path d="M7.5 9Q12 3.5 16.5 9"/><path d="M12 6.5V8"/><path d="M18 15l3 1.5" opacity=".7"/>',
  "arm-probe": '<path d="M8.5 9h7v6h-7z"/><path d="M8.5 12H3M15.5 12H21"/><path d="M3 9.5v5M21 9.5v5"/><path d="M12 15v3.5l2.5 2"/><path d="M10 9V6.5Q12 5 14 6.5V9" opacity=".7"/>'
};

const CRAFT_SHAPE = {
  apollo: "capsule", gemini: "gemini", dragon: "dragon", orion: "orion",
  hubble: "telescope", jwst: "jwst", skylab: "station", zarya: "station",
  curiosity: "rover", perseverance: "rover", viking: "lander", "blue-ghost": "lander",
  lro: "box-probe", voyager: "dish", pioneer: "dish", "new-horizons": "triangle", cassini: "dish-tall",
  galileo: "umbrella", parker: "shield", messenger: "shield", "osiris-rex": "arm-probe", "pioneer-venus": "entry-probe"
};

export function craftIcon(key) {
  return svg(CRAFT_DRAWINGS[CRAFT_SHAPE[key] || "box-probe"]);
}

// ----- Destinations -----
export function destinationIcon(key) {
  let body;
  switch (key) {
    case "moon": body = '<circle cx="12" cy="12" r="8"/><circle cx="9.5" cy="9.5" r="1.6"/><circle cx="14.5" cy="14" r="2.1"/><circle cx="14" cy="8" r=".8"/><circle cx="8.6" cy="15" r=".9"/>'; break;
    case "mars": body = '<circle cx="12" cy="12" r="8"/><path d="M5 10.5q3.5 1.5 6-.5t8 .5" opacity=".7"/><path d="M6.5 15.5q3-1 5 .5" opacity=".7"/><path d="M10 4.5q2 .9 4 0" />'; break;
    case "venus": body = '<circle cx="12" cy="12" r="8"/><path d="M5 9.5q7 2 14 0M4.5 13q7.5 2 15 0M6 16.5q6 1.6 12 0" opacity=".6"/>'; break;
    case "mercury": body = '<circle cx="12" cy="12" r="7"/><circle cx="10" cy="10" r="1.2"/><circle cx="14" cy="13.5" r="1.6"/><circle cx="9.5" cy="14.5" r=".7"/><circle cx="14.5" cy="8.6" r=".6"/>'; break;
    case "jupiter": body = '<circle cx="12" cy="12" r="8.5"/><path d="M4 9h16M3.6 12.5h16.8M5 16h14" opacity=".6"/><ellipse cx="15" cy="14.2" rx="1.8" ry="1"/>'; break;
    case "saturn": body = '<circle cx="12" cy="12" r="5.5"/><ellipse cx="12" cy="12" rx="10.5" ry="3.4" transform="rotate(-18 12 12)"/><path d="M7 10.2h10" opacity=".5"/>'; break;
    case "earth-orbit": body = '<circle cx="12" cy="12" r="5"/><ellipse cx="12" cy="12" rx="10.5" ry="4" stroke-dasharray="2 2.2"/><path d="M19.5 9.4l2 .9-1.6 1.4" /><path d="M9.5 10.5q2 1 3-.5t2.5.5" opacity=".6"/>'; break;
    case "l2": body = '<circle cx="3.5" cy="12" r="2"/><path d="M1.8 9.2l-.8-.8M1.8 14.8l-.8.8" opacity=".6"/><circle cx="13" cy="12" r="2.6"/><path d="M15.6 12h3" stroke-dasharray="1.2 1.4"/><path d="M20 10l2 2-2 2-2-2z"/>'; break;
    case "asteroid": body = '<path d="M6.5 9.5L11 5.5l6 1.5 3 5-2 6-6 2.5-5-3z"/><circle cx="11" cy="10" r="1.2"/><circle cx="14.5" cy="14" r="1.6"/>'; break;
    case "sun": body = '<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>'; break;
    default: body = '<circle cx="4.5" cy="18.5" r="1.8"/><path d="M6.5 17C11 13 15 10 20.5 4.5" stroke-dasharray="1.6 1.8"/><path d="M18 4.2l3-.7-.7 3"/><path d="M14 18h.01M19 13h.01M8 8h.01M18 20h.01" stroke-width="2"/>';
  }
  return svg(body);
}

// ----- Exploration sites -----
const ASTRONAUT = '<circle cx="12" cy="6" r="3.2"/><path d="M10.3 6h3.4" opacity=".7"/><path d="M8.5 11.5Q12 9 15.5 11.5L15 16H9z"/><path d="M15.5 10.5h2v5h-2" /><path d="M9.8 16l-1 5M14.2 16l1 5M8.5 12L6.5 15.5M15.5 12.5" />';
const LRV = '<path d="M3.5 13h17l-1.5-3h-6l-1-2.5H8.5"/><path d="M9 7.5V5l3-1"/><circle cx="6.5" cy="16" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/><path d="M14 10l1-3.5 2.5-.5" opacity=".7"/>';

export function siteIcon(site) {
  if (!site) return svg(ASTRONAUT);
  if (site.vehicle === "lrv") return svg(LRV);
  if (site.vehicle === "rover" && !site.fictional) return svg(CRAFT_DRAWINGS.rover);
  if (site.world === "orbit") return site.start === "eva" ? svg(ASTRONAUT + '<path d="M3 4l2 1M21 4l-2 1M3 20l2-1" opacity=".5"/>') : craftIcon(site.craft);
  return svg(ASTRONAUT);
}

export function vehicleIcon(key) {
  return key === "lrv" ? svg(LRV) : svg(CRAFT_DRAWINGS.rover);
}

// ----- Equipment -----
const TOOLS = {
  camera: '<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13.5" r="3.3"/><path d="M17.5 10.5h.01" stroke-width="2"/>',
  bag: '<path d="M6 9h12l-1 11H7z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/><path d="M19.5 4L15 12" opacity=".7"/>',
  lens: '<circle cx="10" cy="10" r="5.5"/><path d="M14 14l6 6"/><path d="M8 8.5q1-1.5 2.5-1.5" opacity=".6"/>',
  radio: '<path d="M7 9h10v12H7z"/><path d="M10 9l-1-6"/><path d="M10 13h4M10 16h4" opacity=".7"/><path d="M16 4.5q2 1.5 2 3.5M18 2.5q3 2.5 3 5.5" opacity=".7"/>',
  arm: '<path d="M4 20h7"/><path d="M7.5 20v-4l5-6 5 3"/><circle cx="7.5" cy="16" r="1"/><circle cx="12.5" cy="10" r="1"/><path d="M17.5 13l2.5-1.5M17.5 13l1.5 2.5"/>',
  tubes: '<path d="M6 4v13a2 2 0 0 0 4 0V4M14 4v13a2 2 0 0 0 4 0V4"/><path d="M5 4h6M13 4h6"/><path d="M6 12h4M14 9h4" opacity=".6"/>',
  relay: '<path d="M12 21v-8"/><path d="M8.5 21h7"/><path d="M6 8.5Q12 3 18 8.5Q12 14 6 8.5z" opacity=".9"/><path d="M15 3.5l2 1.5M19 2l1 3" opacity=".6"/>',
  jet: '<path d="M8 4h8v11H8z"/><path d="M8 8H5v4h3M16 8h3v4h-3"/><path d="M9.5 15l-1 4M14.5 15l1 4M12 15v5" opacity=".7"/>'
};
const TOOL_FOR_CODE = { CAM: "camera", BAG: "bag", SCI: "lens", COM: "radio", ARM: "arm", TUBE: "tubes", JET: "jet" };

export function toolIcon(code, key) {
  const name = key === "relay" ? "relay" : TOOL_FOR_CODE[code] || "lens";
  return svg(TOOLS[name]);
}

// Small interface icons used by the explorer HUD and the garage
const UI = {
  rocket: '<path d="M12 2.5Q16 6 16 13l-1.5 3h-5L8 13q0-7 4-10.5z"/><circle cx="12" cy="9.5" r="1.6"/><path d="M8.5 13.5L6 17l3-.5M15.5 13.5L18 17l-3-.5M11 19l1 2.5 1-2.5"/>',
  spacecraft: CRAFT_DRAWINGS.capsule,
  destination: '<circle cx="12" cy="12" r="6.5"/><ellipse cx="12" cy="12" rx="10.5" ry="3.4" transform="rotate(-18 12 12)"/>',
  suit: '<circle cx="12" cy="6.5" r="3.6"/><path d="M10.2 6.5h3.6"/><path d="M7.5 21v-6.5Q7.5 11 12 11t4.5 3.5V21"/><path d="M7.5 14.5 5 17.5M16.5 14.5 19 17.5M10 21v-3h4v3"/>',
  launch: '<path d="M12 3v11M7.5 9.5L12 14l4.5-4.5" transform="rotate(180 12 10)"/><path d="M5 21h14"/><path d="M8 17.5h8" opacity=".6"/>',
  wrench: '<path d="M14.5 4.5a4.5 4.5 0 0 0-5 6L3.5 16.5l3.5 3.5 6-6a4.5 4.5 0 0 0 6-5l-2.7 2.7-2.6-.9-.9-2.6z"/>',
  walk: '<circle cx="13" cy="4.5" r="2"/><path d="M11 21l2-6-2.5-3 1-4.5 3.5 2.5 2.5 1M9.5 8.5L7 11.5M13 15l3 6"/>',
  run: '<circle cx="15" cy="4.5" r="2"/><path d="M6 21l3.5-4.5 3 1.5 1-5 3.5 3h3M8 9.5l3.5-2 3 1.5-1.5 5M14.5 8.5"/>',
  drive: '<path d="M4 14h16l-2-5H6z"/><circle cx="7.5" cy="17" r="2.2"/><circle cx="16.5" cy="17" r="2.2"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="1.5"/>',
  map: '<path d="M3 6l6-2.5 6 2.5 6-2.5v14.5l-6 2.5-6-2.5-6 2.5z"/><path d="M9 3.5V18M15 6v14.5" opacity=".6"/>'
};

export function uiIcon(name) {
  return svg(UI[name] || UI.target);
}

// ----- Planet pictures (illustrated, in color) for the destination cards -----
// Painted with gradients: lit side, terminator shadow, surface features. Illustrative, not photos.
const PLANET_LOOK = {
  moon: { light: "#e9e7e2", mid: "#b4b1aa", dark: "#3e3c39", spots: [[38, 36, 7, "#9d9a93"], [56, 54, 9, "#a4a19a"], [60, 34, 4, "#8f8c86"], [42, 62, 5, "#97948e"]] },
  mars: { light: "#f39a5c", mid: "#c1592c", dark: "#3a140a", spots: [[40, 44, 10, "#9b3f1c"], [62, 58, 7, "#a84a22"]], cap: "#fff4ea" },
  venus: { light: "#fbe7b8", mid: "#d9b56f", dark: "#5e4521", bands: "#e8cc8e" },
  mercury: { light: "#d8d3cc", mid: "#8d8781", dark: "#2f2c29", spots: [[44, 40, 5, "#76716b"], [58, 56, 6, "#7d7872"], [38, 60, 3, "#6f6a65"]] },
  jupiter: { light: "#f4dcb4", mid: "#c79a64", dark: "#4a2f17", bands: "#b0784a", spot: true },
  saturn: { light: "#fbecc8", mid: "#d6b680", dark: "#5a4527", bands: "#c9a46a", ring: true }
};

export function planetPicture(key) {
  const id = "pp-" + key + "-" + Math.random().toString(36).slice(2, 7);
  const open = '<svg class="planet-pic" viewBox="0 0 96 96" aria-hidden="true">';
  let defs = '<defs><radialGradient id="' + id + 'g" cx="36%" cy="34%" r="78%">';
  let body = "";
  const look = PLANET_LOOK[key];
  if (look) {
    defs += '<stop offset="0" stop-color="' + look.light + '"/><stop offset="0.55" stop-color="' + look.mid + '"/><stop offset="1" stop-color="' + look.dark + '"/></radialGradient>' +
      '<clipPath id="' + id + 'c"><circle cx="48" cy="48" r="' + (look.ring ? 24 : 34) + '"/></clipPath></defs>';
    const r = look.ring ? 24 : 34;
    if (look.ring) body += '<ellipse cx="48" cy="48" rx="44" ry="12" fill="none" stroke="#c7ad7c" stroke-width="5" opacity=".55" transform="rotate(-16 48 48)"/>';
    body += '<circle cx="48" cy="48" r="' + r + '" fill="url(#' + id + 'g)"/>';
    let surface = "";
    if (look.bands) for (let i = -3; i <= 3; i++) surface += '<path d="M10 ' + (48 + i * 8) + ' Q48 ' + (44 + i * 8) + ' 86 ' + (48 + i * 8) + '" stroke="' + look.bands + '" stroke-width="' + (i % 2 ? 3 : 2) + '" fill="none" opacity=".45"/>';
    (look.spots || []).forEach(function (s) { surface += '<circle cx="' + s[0] + '" cy="' + s[1] + '" r="' + s[2] + '" fill="' + s[3] + '" opacity=".75"/>'; });
    if (look.spot) surface += '<ellipse cx="58" cy="56" rx="7" ry="4" fill="#b5532f" opacity=".85"/>';
    if (look.cap) surface += '<ellipse cx="48" cy="16" rx="12" ry="4" fill="' + look.cap + '" opacity=".9"/>';
    surface += '<circle cx="64" cy="62" r="' + (r + 6) + '" fill="#000" opacity=".28"/>'; // night side
    body += '<g clip-path="url(#' + id + 'c)">' + surface + "</g>";
    if (look.ring) body += '<path d="M6 57 Q48 72 90 39" fill="none" stroke="#e3cb98" stroke-width="5" opacity=".9"/>';
  } else if (key === "earth-orbit") {
    defs += '<stop offset="0" stop-color="#9fd0ff"/><stop offset="0.5" stop-color="#2e6fc4"/><stop offset="1" stop-color="#0b1f48"/></radialGradient></defs>';
    body = '<circle cx="48" cy="48" r="28" fill="url(#' + id + 'g)"/><path d="M30 40q8-6 14 0t10 6M50 60q8 2 12-4" stroke="#5f9a52" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<circle cx="48" cy="48" r="29" fill="none" stroke="#a9d4ff" stroke-width="2" opacity=".6"/><ellipse cx="48" cy="48" rx="44" ry="14" fill="none" stroke="#ffd36e" stroke-width="1.5" stroke-dasharray="3 3"/><circle cx="90" cy="50" r="3" fill="#ffd36e"/>';
  } else if (key === "l2") {
    defs += '<stop offset="0" stop-color="#9fd0ff"/><stop offset="1" stop-color="#123a7a"/></radialGradient></defs>';
    body = '<circle cx="14" cy="48" r="10" fill="#ffd36e"/><circle cx="14" cy="48" r="15" fill="#ffd36e" opacity=".25"/><circle cx="54" cy="48" r="12" fill="url(#' + id + 'g)"/>' +
      '<path d="M68 48h12" stroke="#ffd36e" stroke-width="1.5" stroke-dasharray="2 2"/><path d="M86 42l6 6-6 6-6-6z" fill="#e8c35a"/>';
  } else if (key === "asteroid") {
    defs += '<stop offset="0" stop-color="#b7ada0"/><stop offset="1" stop-color="#3f3830"/></radialGradient></defs>';
    body = '<path d="M24 40L42 22l24 6 12 20-8 24-24 10-20-12z" fill="url(#' + id + 'g)"/><circle cx="44" cy="42" r="5" fill="#6f665b"/><circle cx="58" cy="58" r="6" fill="#6f665b"/><circle cx="36" cy="62" r="3" fill="#6f665b"/>';
  } else if (key === "sun") {
    defs += '<stop offset="0" stop-color="#fffbe0"/><stop offset="0.5" stop-color="#ffc23a"/><stop offset="1" stop-color="#e2561a"/></radialGradient></defs>';
    body = '<circle cx="48" cy="48" r="40" fill="#ffb23a" opacity=".18"/><circle cx="48" cy="48" r="32" fill="url(#' + id + 'g)"/>';
  } else {
    defs += '<stop offset="0" stop-color="#ffd36e"/><stop offset="1" stop-color="#ff8a3d"/></radialGradient></defs>';
    body = '<circle cx="14" cy="76" r="7" fill="url(#' + id + 'g)"/><path d="M20 72C40 56 58 40 86 16" stroke="#ffd36e" stroke-width="2" stroke-dasharray="3 3" fill="none"/>' +
      '<g fill="#d9dce4"><circle cx="60" cy="70" r="1.5"/><circle cx="78" cy="50" r="2"/><circle cx="36" cy="28" r="1.5"/><circle cx="84" cy="80" r="1.2"/><circle cx="20" cy="40" r="1"/></g><path d="M82 14l8 2-6 6z" fill="#ffd36e"/>';
  }
  return open + defs + body + "</svg>";
}
