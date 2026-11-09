// This file builds the Moon and Mars globes, places clickable markers on them,
// and shows the hardware profile panel.
// NOTE: the surfaces are simplified and marker positions are approximate.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { hardwareList } from "../data/hardware.js";
import { hardwareReplays } from "../data/hardware-replays.js";
import { play } from "./sounds.js";
import { createGlow } from "./glow.js";

// ----- Find the page elements we need -----
const canvas = document.getElementById("destination-canvas");
const breadcrumb = document.getElementById("dest-breadcrumb");
const hint = document.getElementById("dest-hint");
const panel = document.getElementById("hardware-panel");
const panelName = document.getElementById("hw-name");
const panelSummary = document.getElementById("hw-summary");
const panelFacts = document.getElementById("hw-facts");
const panelPurpose = document.getElementById("hw-purpose");
const panelHistory = document.getElementById("hw-history");
const panelContributions = document.getElementById("hw-contributions");
const panelStatus = document.getElementById("hw-status");
const panelStatusMeta = document.getElementById("hw-status-meta");
const panelNote = document.getElementById("hw-note");
const panelSources = document.getElementById("hw-sources");
const panelClose = document.getElementById("hw-close");
const panelCollapse = document.getElementById("hw-collapse");
const panelImage = document.getElementById("hw-image");
const panelPlaceholder = document.getElementById("hw-placeholder");
const panelCredit = document.getElementById("hw-credit");
const resetButton = document.getElementById("dest-reset-button");
const tooltip = document.getElementById("marker-tooltip");
const sidebar = document.getElementById("dest-sidebar");
const sidebarTitle = document.getElementById("dest-sidebar-title");
const sidebarList = document.getElementById("dest-sidebar-list");
const replayButton = document.getElementById("hw-replay");
const landingButton = document.getElementById("hw-landing");
const panelKind = document.getElementById("hw-kind");
const panelFigure = document.getElementById("hw-figure");

// ----- Settings you can change -----
const GLOBE_RADIUS = 5;
const START_DISTANCE = 18;   // how far the camera starts from the center
const FOCUS_DISTANCE = 11;   // how close the camera flies when a marker is selected
const MARKER_COLOR = 0xff8a3d;
const SELECTED_COLOR = 0xffffff;

// Map pictures. The first file that loads is used. If none load, a drawn (illustrative) surface is used.
// Files in assets/textures come from Solar System Scope (https://www.solarsystemscope.com/textures/, CC BY 4.0).
const TEXTURE_FOLDER = "assets/textures/";
const MOON_CDN_URL =
  "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/moon_1024.jpg";

const MARKER_COLORS = {
  landing: 0xff8a3d, // landers and rovers (orange)
  impact: 0xe5534b,  // impact sites (red)
  probe: 0xc9c6bf,   // atmosphere probes (light grey)
  plunge: 0x8fb3d9   // spacecraft that ended their mission by diving into a giant planet (steel blue)
};
const KIND_LABELS = {
  landing: "Landing site",
  impact: "Impact site",
  probe: "Atmosphere probe",
  plunge: "Final plunge"
};

// startLat / startLon = the point the camera looks at first.
// mapOffset = degrees to turn the map picture if its 0° longitude is not in the middle of the picture.
// halo = a thin glow for worlds with an atmosphere.
const worldSettings = {
  Moon: {
    baseColor: 0xbdbdbd, textures: [TEXTURE_FOLDER + "moon.jpg", MOON_CDN_URL], drawn: "gray",
    bump: 0.8, startLat: 5, startLon: 20, mapOffset: 0, halo: null,
    credit: "Moon map: Solar System Scope (CC BY 4.0), or the three.js example map if that file is missing."
  },
  Mars: {
    baseColor: 0xb4532a, textures: [TEXTURE_FOLDER + "mars.jpg"], drawn: "mars",
    bump: 1.2, startLat: 8, startLon: 107, mapOffset: 0, halo: { color: 0xe39a6b, opacity: 0.12 },
    credit: "Mars map: Solar System Scope (CC BY 4.0)."
  },
  Mercury: {
    baseColor: 0x9a948e, textures: [TEXTURE_FOLDER + "mercury.jpg"], drawn: "gray",
    bump: 0.9, startLat: 45, startLon: -150, mapOffset: 0, halo: null,
    credit: "Mercury map: Solar System Scope (CC BY 4.0)."
  },
  Venus: {
    baseColor: 0x9b7a48, textures: [TEXTURE_FOLDER + "venus_surface.jpg"], drawn: "venus",
    bump: 0.6, startLat: -12, startLon: -50, mapOffset: 0, halo: { color: 0xf2c879, opacity: 0.22 },
    credit: "Venus surface map: Solar System Scope (CC BY 4.0). The real surface is hidden under thick clouds."
  },

  // Giant planets: what you see is the top of the clouds. There is no solid surface.
  Jupiter: {
    textures: [TEXTURE_FOLDER + "jupiter.jpg"], drawn: "jupiter", bump: 0,
    startLat: 6.5, startLon: -4.4, mapOffset: 0, tilt: 3, halo: { color: 0xe8c9a0, opacity: 0.12 },
    credit: "Jupiter cloud map: Solar System Scope (CC BY 4.0). The clouds are always moving.",
    note: "Jupiter has no solid surface. Galileo's orbiter was also sent into Jupiter on September 21, 2003, but NASA does not give its entry point, so it has no marker."
  },
  Saturn: {
    textures: [TEXTURE_FOLDER + "saturn.jpg"], drawn: "saturn", bump: 0,
    startLat: 20, startLon: -53, mapOffset: 0, tilt: 26.7, halo: { color: 0xf0dcae, opacity: 0.1 },
    rings: TEXTURE_FOLDER + "saturn_ring.png",
    credit: "Saturn cloud and ring maps: Solar System Scope (CC BY 4.0).",
    note: "Saturn has no solid surface."
  },
  Uranus: {
    textures: [TEXTURE_FOLDER + "uranus.jpg"], drawn: "uranus", bump: 0,
    startLat: 0, startLon: 0, mapOffset: 0, tilt: 97.8, halo: { color: 0xa9e6ee, opacity: 0.14 },
    credit: "Uranus map: Solar System Scope (CC BY 4.0). Uranus spins tipped on its side.",
    note: "No spacecraft has entered Uranus's atmosphere. Voyager 2 is the only one to visit: it flew past on January 24, 1986, about 81,500 km from the cloud tops, and found 11 new moons and 2 new rings."
  },
  Neptune: {
    textures: [TEXTURE_FOLDER + "neptune.jpg"], drawn: "neptune", bump: 0,
    startLat: 0, startLon: 0, mapOffset: 0, tilt: 28.3, halo: { color: 0x7d9cff, opacity: 0.14 },
    credit: "Neptune map: Solar System Scope (CC BY 4.0).",
    note: "No spacecraft has entered Neptune's atmosphere. Voyager 2 is the only one to visit: it flew about 4,950 km above Neptune's north pole on August 25, 1989."
  },
  Titan: {
    textures: [], drawn: "titan", bump: 0,
    startLat: -10.3, startLon: 167.7, mapOffset: 0, halo: { color: 0xe0a050, opacity: 0.3 },
    credit: "",
    note: "Titan is hidden under a thick orange haze. This globe is an illustration, not a real map."
  }
};

let currentWorld = null; // the world being shown (declared early: the map loader checks it)
let currentWorldName = null;

// ----- Basic setup -----
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02040a);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
controls.minDistance = 6.5;
controls.maxDistance = 30;

// ----- Lights -----
// The main light is attached to the camera, so the side you are looking at is always lit.
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const headlight = new THREE.DirectionalLight(0xffffff, 2.2);
headlight.position.set(3, 2, 5);
camera.add(headlight);
scene.add(camera);

// ----- Stars -----
const starPositions = new Float32Array(3000 * 3);
for (let i = 0; i < 3000; i++) {
  const direction = new THREE.Vector3(
    Math.random() - 0.5,
    Math.random() - 0.5,
    Math.random() - 0.5
  ).normalize();
  const distance = 600 + Math.random() * 300;
  starPositions[i * 3]     = direction.x * distance;
  starPositions[i * 3 + 1] = direction.y * distance;
  starPositions[i * 3 + 2] = direction.z * distance;
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
scene.add(
  new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: false })
  )
);

// ----- Helper: latitude and longitude (degrees) to a point on the sphere -----
function latLonToVector3(latDeg, lonDeg, radius) {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);
  return new THREE.Vector3(
    radius * Math.cos(lat) * Math.cos(lon),
    radius * Math.sin(lat),
    -radius * Math.cos(lat) * Math.sin(lon)
  );
}

// ----- Helper: faint grid lines every 30 degrees -----
function makeGraticule(radius) {
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 });

  for (let lat = -60; lat <= 60; lat += 30) {
    const points = [];
    for (let lon = 0; lon <= 360; lon += 5) {
      points.push(latLonToVector3(lat, lon, radius * 1.002));
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
  }

  for (let lon = 0; lon < 360; lon += 30) {
    const points = [];
    for (let lat = -90; lat <= 90; lat += 5) {
      points.push(latLonToVector3(lat, lon, radius * 1.002));
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
  }

  return group;
}

// ----- Helper: an illustrative (NOT real) surface, used only if no map picture loads -----
function makeDrawnTexture(style) {
  const drawing = document.createElement("canvas");
  drawing.width = 1024;
  drawing.height = 512;
  const ctx = drawing.getContext("2d");

  const bases = {
    mars: "#b4532a", venus: "#9b7a48", jupiter: "#c9a27a", saturn: "#d9c08a",
    uranus: "#8fd3dc", neptune: "#3f5fc0", titan: "#c58a3e"
  };
  const base = bases[style] || "#9a968f";
  const banded = style === "jupiter" || style === "saturn" || style === "uranus" || style === "neptune" || style === "titan";
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 1024, 512);

  // Giant planets and Titan: soft horizontal bands instead of blotches
  if (banded) {
    let y = 0;
    while (y < 512) {
      const height = 6 + Math.random() * 30;
      const shade = (Math.random() - 0.5) * (style === "titan" ? 0.12 : 0.3);
      ctx.fillStyle = shade > 0 ? "rgba(255,255,255," + shade + ")" : "rgba(0,0,0," + -shade + ")";
      ctx.fillRect(0, y, 1024, height);
      y += height;
    }
  }

  for (let i = 0; i < (banded ? 0 : 700); i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 512;
    const size = 10 + Math.random() * 60;
    ctx.fillStyle = Math.random() < 0.5 ? "rgba(40, 25, 15, 0.12)" : "rgba(255, 230, 200, 0.08)";
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  if (style === "mars") {
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)"; // polar caps
    ctx.fillRect(0, 0, 1024, 14);
    ctx.fillRect(0, 498, 1024, 14);
  }

  const texture = new THREE.CanvasTexture(drawing);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Tries each picture in the list until one loads. onDone(true) if a real map loaded, onDone(false) if not.
function loadFirstTexture(urls, material, bumpScale, onDone) {
  if (urls.length === 0) {
    onDone(false);
    return;
  }
  new THREE.TextureLoader().load(
    urls[0],
    function (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      material.map = texture;
      if (bumpScale > 0) {
        material.bumpMap = texture;   // the map's light and dark areas give a hint of relief
        material.bumpScale = bumpScale;
      }
      material.color.set(0xffffff);
      material.needsUpdate = true;
      onDone(true);
    },
    undefined,
    function () {
      console.warn("Map not found: " + urls[0] + ". Trying the next option.");
      loadFirstTexture(urls.slice(1), material, bumpScale, onDone);
    }
  );
}

// ----- Build one world (a globe plus its markers) -----
function buildWorld(name) {
  const settings = worldSettings[name];

  const group = new THREE.Group();
  group.visible = false;

  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, map: makeDrawnTexture(settings.drawn) });
  const world = { realMap: false };

  loadFirstTexture(settings.textures, material, settings.bump, function (loaded) {
    world.realMap = loaded;
    if (currentWorld && currentWorld.name === name) updateHint();
  });

  const globe = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS, 96, 96), material);
  globe.rotation.y = THREE.MathUtils.degToRad(settings.mapOffset);
  group.add(globe);
  group.add(makeGraticule(GLOBE_RADIUS));

  // Saturn's rings (from the ring picture; drawn bands if it is missing)
  if (settings.rings) {
    const inner = GLOBE_RADIUS * 1.24;
    const outer = GLOBE_RADIUS * 2.27;
    const ringGeometry = new THREE.RingGeometry(inner, outer, 128, 1);
    const position = ringGeometry.attributes.position;
    const uv = ringGeometry.attributes.uv;
    const point = new THREE.Vector3();
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i);
      uv.setXY(i, (point.length() - inner) / (outer - inner), 0.5);
    }
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xd9c79c, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false
    });
    new THREE.TextureLoader().load(settings.rings, function (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      ringMaterial.map = texture;
      ringMaterial.color.set(0xffffff);
      ringMaterial.opacity = 1;
      ringMaterial.needsUpdate = true;
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2; // in the planet's equator
    group.add(ring);
  }

  // Tilt of the planet's axis (Uranus is tipped on its side)
  if (settings.tilt) group.rotation.z = THREE.MathUtils.degToRad(settings.tilt);

  // A thin glow for worlds with an atmosphere
  if (settings.halo) {
    // A soft glowing atmosphere; thicker atmospheres (Venus, Titan) glow more
    group.add(createGlow(GLOBE_RADIUS, {
      color: settings.halo.color,
      strength: settings.halo.opacity * 4,
      size: 1.12 + settings.halo.opacity * 0.4
    }));
  }

  const markers = [];

  hardwareList
    .filter(function (item) { return item.destination === name; })
    .forEach(function (item) {
      const color = MARKER_COLORS[item.kind] || MARKER_COLOR;
      const markerGroup = new THREE.Group();
      markerGroup.position.copy(latLonToVector3(item.lat, item.lon, GLOBE_RADIUS + 0.03));

      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 16, 16),
        new THREE.MeshBasicMaterial({ color: color })
      );
      markerGroup.add(dot);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.16, 0.2, 32),
        new THREE.MeshBasicMaterial({
          color: color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8
        })
      );
      ring.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        markerGroup.position.clone().normalize()
      );
      markerGroup.add(ring);

      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 12, 12),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      markerGroup.add(hit);

      group.add(markerGroup);
      markers.push({ item: item, group: markerGroup, dot: dot, ring: ring, hit: hit, color: color });
    });

  scene.add(group);
  world.name = name;
  world.settings = settings;
  world.group = group;
  world.globe = globe;
  world.markers = markers;
  return world;
}

const worlds = {};
Object.keys(worldSettings).forEach(function (name) {
  worlds[name] = buildWorld(name);
});

// ----- Selection logic -----
let selectedMarker = null;
let flyDirection = null;
let detailsHidden = false; // the user's choice to hide the panel details

function styleMarker(marker, isSelected) {
  const color = isSelected ? SELECTED_COLOR : marker.color;
  marker.dot.material.color.setHex(color);
  marker.ring.material.color.setHex(color);
  marker.dot.scale.setScalar(isSelected ? 1.6 : 1);
}

function updateBreadcrumb() {
  const parents = { Moon: "Earth", Titan: "Saturn" };
  const parent = parents[currentWorld.name];
  // The Solar System tab is already underlined, so the path starts below it
  let text = (parent ? parent + " › " : "") + currentWorld.name;
  if (selectedMarker) {
    text += " › " + selectedMarker.item.breadcrumbName;
  }
  breadcrumb.textContent = text;
}

function formatCoordinates(lat, lon) {
  const latText = Math.abs(lat).toFixed(3) + "\u00B0" + (lat >= 0 ? "N" : "S");
  const lonText = Math.abs(lon).toFixed(3) + "\u00B0" + (lon >= 0 ? "E" : "W");
  return latText + ", " + lonText;
}

// Creates a link that opens in a new tab
function makeLink(label, url) {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = label;
  return link;
}

// Empties a list and fills it with one <li> per item
function fillList(listElement, items, makeItem) {
  listElement.innerHTML = "";
  items.forEach(function (item) {
    listElement.appendChild(makeItem(item));
  });
}

function showImage(image) {
  // New hardware entries do not have a picture yet: hide the picture area
  panelFigure.classList.toggle("hidden", !image);
  if (!image) return;

  panelCredit.innerHTML = "";
  panelCredit.appendChild(document.createTextNode(image.credit + " "));
  panelCredit.appendChild(makeLink("(NASA source page)", image.pageUrl));

  panelImage.classList.remove("hidden");
  panelPlaceholder.classList.add("hidden");

  // If the picture file has not been added yet, show a note instead of a broken image
  panelImage.onerror = function () {
    panelImage.classList.add("hidden");
    panelPlaceholder.textContent =
      "Image not added yet. Save the NASA image as " + image.src + " (download link below).";
    panelPlaceholder.classList.remove("hidden");
  };

  panelImage.alt = image.alt;
  panelImage.src = image.src;
}

function applyDetailsState() {
  panel.classList.toggle("collapsed", detailsHidden);
  panelCollapse.textContent = detailsHidden ? "Show details" : "Hide details";
  panelCollapse.setAttribute("aria-expanded", String(!detailsHidden));
}

function showPanel(item) {
  showImage(item.image);

  panelName.textContent = item.name;
  panelSummary.textContent = item.summary;

  const facts = [
    ["Destination", item.destination],
    ["Mission", item.mission],
    ["Location", item.location],
    ["Coordinates", formatCoordinates(item.lat, item.lon) + " (approximate)"],
    [item.dateLabel || "Landing date", item.landingDate]
  ];
  if (item.partner) facts.splice(2, 0, ["Partner mission", item.partner]);
  fillList(panelFacts, facts, function (fact) {
    const row = document.createElement("li");
    const label = document.createElement("strong");
    label.textContent = fact[0]; // shown as a small caption above the value
    row.appendChild(label);
    row.appendChild(document.createTextNode(fact[1]));
    return row;
  });

  panelPurpose.textContent = item.purpose;

  fillList(panelHistory, item.history, function (entry) {
    const row = document.createElement("li");
    const date = document.createElement("strong");
    date.textContent = entry.date;
    row.appendChild(date);
    row.appendChild(document.createTextNode(entry.text));
    return row;
  });

  fillList(panelContributions, item.contributions, function (text) {
    const row = document.createElement("li");
    row.textContent = text;
    return row;
  });

  panelStatus.textContent = item.status.text;
  panelStatusMeta.innerHTML = "";
  panelStatusMeta.appendChild(document.createTextNode("As of: " + item.status.asOf + " Source: "));
  panelStatusMeta.appendChild(makeLink(item.status.sourceLabel, item.status.sourceUrl));

  panelNote.textContent = item.markerNote + " " + item.coordinateNote;

  fillList(panelSources, item.sources, function (source) {
    const row = document.createElement("li");
    row.appendChild(makeLink(source.label, source.url));
    return row;
  });

  applyDetailsState();
  replayButton.classList.toggle("hidden", !hardwareReplays[item.id]);

  panelKind.textContent = (KIND_LABELS[item.kind] || "NASA hardware") + " \u00B7 " + item.destination +
    (item.partner ? " \u00B7 Partner mission" : "");
  landingButton.classList.toggle("hidden", !item.landing);
  landingButton.textContent =
    item.kind === "impact" ? "Watch the impact"
      : item.kind === "probe" ? "Watch the descent"
      : item.kind === "plunge" ? "Watch the final plunge"
      : "Watch the landing";
  panel.scrollTop = 0;
  panel.classList.remove("hidden");
}

function selectMarker(marker) {
  if (selectedMarker !== marker) play("select");
  if (selectedMarker) {
    styleMarker(selectedMarker, false);
  }
  selectedMarker = marker;
  styleMarker(marker, true);

  flyDirection = marker.group.position.clone().normalize();
  updateBreadcrumb();
  showPanel(marker.item);
  updateSidebarActive();
}

function deselectMarker() {
  if (selectedMarker) {
    styleMarker(selectedMarker, false);
  }
  selectedMarker = null;
  flyDirection = null;
  panel.classList.add("hidden");
  if (currentWorld) {
    updateBreadcrumb();
  }
  updateSidebarActive();
}

// ----- Left sidebar: the sites on this world -----
let sidebarRows = [];

function buildSidebar() {
  sidebarTitle.textContent = currentWorld.name;
  sidebarList.innerHTML = "";
  sidebarRows = [];

  if (currentWorld.markers.length === 0) {
    const empty = document.createElement("p");
    empty.className = "sidebar-empty";
    empty.textContent = "No spacecraft has landed on or entered this world. See the note at the bottom of the screen.";
    sidebarList.appendChild(empty);
    return;
  }

  // Group the sites by kind: landings, impacts, probes, plunges
  Object.keys(KIND_LABELS).forEach(function (kind) {
    const markers = currentWorld.markers.filter(function (marker) { return marker.item.kind === kind; });
    if (markers.length === 0) return;

    const heading = document.createElement("p");
    heading.className = "sidebar-heading";
    heading.textContent = KIND_LABELS[kind] + (markers.length > 1 ? "s" : "");
    sidebarList.appendChild(heading);

    markers.forEach(function (marker) {
      const row = document.createElement("button");
      row.className = "sidebar-item";
      row.setAttribute("aria-label", marker.item.name);
      const year = marker.item.landingDate.match(/\d{4}/);
      row.innerHTML =
        '<span class="sb-num">' + (sidebarRows.length < 9 ? "0" : "") + (sidebarRows.length + 1) + "</span>" +
        '<span class="sb-dot"></span><span class="sb-name"></span><span class="sb-meta"></span>';
      if (row.querySelector) {
        row.querySelector(".sb-name").textContent = marker.item.breadcrumbName;
        row.querySelector(".sb-meta").textContent = year ? year[0] : "";
        row.querySelector(".sb-dot").style.setProperty("--dot", "#" + new THREE.Color(marker.color).getHexString());
      }
      row.addEventListener("click", function () {
        selectMarker(marker);
        sidebar.classList.remove("open"); // on phones, close the list after choosing
      });
      sidebarList.appendChild(row);
      sidebarRows.push({ marker: marker, row: row });
    });
  });
}

function updateSidebarActive() {
  sidebarRows.forEach(function (entry) {
    const active = entry.marker === selectedMarker;
    entry.row.classList.toggle("active", active);
    entry.row.setAttribute("aria-current", active ? "true" : "false");
  });
}

function resetCamera() {
  const settings = currentWorld.settings;
  camera.position.copy(latLonToVector3(settings.startLat, settings.startLon, START_DISTANCE));
  controls.target.set(0, 0, 0);
  controls.update();
  flyDirection = null;
}

// ----- Functions that main.js uses -----

// The help text at the bottom: what the colors mean, and where the map comes from
function updateHint() {
  const settings = currentWorld.settings;
  let mapText = "";
  // Map credits are listed on the Credits page
  if (currentWorld.realMap) mapText = "";
  else if (settings.textures.length > 0) mapText = "Map picture not found, so this surface is an illustration, not a real map.";

  // Only list the marker colors that appear on this world
  const kinds = [];
  currentWorld.markers.forEach(function (marker) {
    if (kinds.indexOf(marker.item.kind) === -1) kinds.push(marker.item.kind);
  });
  const legend = kinds.map(function (kind) {
    const color = "#" + new THREE.Color(MARKER_COLORS[kind] || MARKER_COLOR).getHexString();
    return "<span style=\"color:" + color + "\">&#9679;</span> " + KIND_LABELS[kind];
  }).join(" &nbsp; ");

  const lines = [];
  lines.push(currentWorld.markers.length > 0
    ? "Pick a site from the list or click a marker &bull; Drag to rotate &bull; Scroll to zoom"
    : "Drag to rotate &bull; Scroll to zoom");
  if (legend) lines.push(legend + " &nbsp;&middot;&nbsp; Marker positions are approximate.");
  if (settings.note) lines.push(settings.note);
  if (mapText) lines.push(mapText);
  hint.innerHTML = lines.join("<br>");
}

// Switch to the Moon, Mars, Mercury or Venus. Called before the screen is shown.
export function showDestination(name) {
  if (!worlds[name]) return;

  Object.values(worlds).forEach(function (world) {
    world.group.visible = false;
  });

  currentWorld = worlds[name];
  currentWorldName = name;
  currentWorld.group.visible = true;

  deselectMarker();
  buildSidebar();
  resetCamera();
  updateBreadcrumb();
  updateHint();
}

// The hardware profile that is open on the globe (null if none), and the world being shown
export function getSelectedHardwareId() {
  return selectedMarker ? selectedMarker.item.id : null;
}

export function getCurrentWorldName() {
  return currentWorldName;
}

// Select a hardware marker by its id (used when the user picks it from the search box)
export function selectHardwareById(id) {
  if (!currentWorld) return;

  const marker = currentWorld.markers.find(function (item) {
    return item.item.id === id;
  });
  if (marker) {
    selectMarker(marker);
  }
}

// The Back button calls this first. Returns true if it closed an open marker.
export function backInDestination() {
  if (selectedMarker) {
    deselectMarker();
    return true;
  }
  return false;
}

// ----- Buttons -----
panelClose.addEventListener("click", deselectMarker);

panelCollapse.addEventListener("click", function () {
  detailsHidden = !detailsHidden;
  play(detailsHidden ? "close" : "open");
  applyDetailsState();
});

// "Watch the landing": ask main.js to open the close-up landing scene
landingButton.addEventListener("click", function () {
  if (!selectedMarker) return;
  document.dispatchEvent(
    new CustomEvent("watch-landing", { detail: { hardwareId: selectedMarker.item.id } })
  );
});

// "Replay Mission": ask main.js to play this hardware's journey from Earth
replayButton.addEventListener("click", function () {
  if (!selectedMarker) return;
  document.dispatchEvent(
    new CustomEvent("replay-hardware", { detail: { hardwareId: selectedMarker.item.id } })
  );
});

resetButton.addEventListener("click", function () {
  deselectMarker();
  resetCamera();
});

// ----- Clicking and hovering on markers -----
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// Returns the marker under the mouse, or null.
// The globe is included in the test, so markers on the far side cannot be clicked through the planet.
function getMarkerAtPointer(event) {
  if (!currentWorld) return null;

  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const targets = [currentWorld.globe].concat(
    currentWorld.markers.map(function (marker) { return marker.hit; })
  );
  const hits = raycaster.intersectObjects(targets);
  if (hits.length === 0) return null;

  return currentWorld.markers.find(function (marker) { return marker.hit === hits[0].object; }) || null;
}

let downX = 0;
let downY = 0;

canvas.addEventListener("pointerdown", function (event) {
  downX = event.clientX;
  downY = event.clientY;
});

canvas.addEventListener("pointerup", function (event) {
  if (event.button !== 0) return;

  const distanceMoved = Math.hypot(event.clientX - downX, event.clientY - downY);
  if (distanceMoved > 5) return;

  const marker = getMarkerAtPointer(event);
  if (marker) {
    selectMarker(marker);
  }
});

canvas.addEventListener("pointermove", function (event) {
  if (event.buttons !== 0) {
    tooltip.classList.add("hidden");
    return;
  }

  const marker = getMarkerAtPointer(event);
  if (marker !== hoveredMarker) {
    hoveredMarker = marker;
    if (marker) play("hoverBody");
  }
  if (marker) {
    canvas.style.cursor = "pointer";
    tooltip.textContent = marker.item.name;
    tooltip.style.left = event.clientX + 14 + "px";
    tooltip.style.top = event.clientY + 14 + "px";
    tooltip.classList.remove("hidden");
  } else {
    canvas.style.cursor = "default";
    tooltip.classList.add("hidden");
  }
});

canvas.addEventListener("pointerleave", function () {
  tooltip.classList.add("hidden");
});

let hoveredMarker = null;
let lastDragSound = 0;
let lastScrollSound = 0;

controls.addEventListener("start", function () {
  flyDirection = null;
  const now = performance.now();
  if (now - lastDragSound > 500) {
    lastDragSound = now;
    play("drag");
  }
});

canvas.addEventListener("wheel", function () {
  const now = performance.now();
  if (now - lastScrollSound > 90) {
    lastScrollSound = now;
    play("scroll");
  }
}, { passive: true });

// ----- Keep the drawing the right size -----
function resizeRenderer() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width === 0 || height === 0) return;

  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resizeRenderer);

// ----- Animation loop -----
const clock = new THREE.Clock();
let animationId = null;

function animate() {
  animationId = requestAnimationFrame(animate);
  clock.getDelta();
  const time = clock.elapsedTime;

  if (currentWorld) {
    currentWorld.markers.forEach(function (marker) {
      marker.ring.scale.setScalar(1 + 0.25 * Math.sin(time * 3));
    });

    // Glide the camera toward the selected marker, going around the globe (never through it)
    if (flyDirection) {
      const currentDirection = camera.position.clone().normalize();
      const newDirection = currentDirection.lerp(flyDirection, 0.06).normalize();
      const newDistance = THREE.MathUtils.lerp(camera.position.length(), FOCUS_DISTANCE, 0.06);

      camera.position.copy(newDirection).multiplyScalar(newDistance);

      if (newDirection.dot(flyDirection) > 0.9999 && Math.abs(newDistance - FOCUS_DISTANCE) < 0.1) {
        flyDirection = null;
        play("arrive"); // the camera has locked on to the site
      }
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

export function startDestination() {
  if (animationId !== null) return;
  resizeRenderer();
  animate();
}

export function stopDestination() {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}