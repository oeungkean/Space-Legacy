# Space Legacy: How the Upgrade Fits Together (Phase 2)

## Screens
- **Welcome**: has a new "Hardware Explorer" button.
- **Solar System**:
  - planet info panels now list related hardware;
  - the sidebar has a new "Regions" group.
- **Planet globes**: a profile can open the same item in the Explorer.
- **Landing scenes**: unchanged.
- **Spacecraft & Hardware Explorer**: new (`#explorer-screen`, `js/explorer.js`).

Every top bar has the same tabs: Solar System · Planets · Missions · Hardware. Pages talk to each other through messages that `js/main.js` handles:

| Message | What it does |
|---|---|
| `open-explorer` | Opens the Explorer. `{ itemId }` opens one item; `{ region }`, `{ body }` or `{ category }` filter it |
| `replay-mission` | Plays a mission from `data/missions.js`: the liftoff on its real rocket, then the journey |
| `replay-hardware`, `replay-spacecraft` | The older replays (unchanged) |
| `watch-landing`, `explore-destination` | Unchanged; the Explorer uses them too |
| `show-in-solar` | Selects a planet, moon or spacecraft in the solar system |

## Data (kept separate from the UI)
- **`data/catalog.js`**: the library of 64 items in 7 categories.
  - It is plain data; the Explorer needs no code changes when you add an item.
  - An item can point to a researched profile (`hardware: "curiosity"` or `spacecraft: "Voyager 1"`). Its summary, timeline, status and sources are then reused, so each fact is written only once.
- **`data/missions.js`**: the new mission journeys.
  - Each event has a stage letter, a 3D model, a size and an optional effect.
  - `STAGE_TAGS` adds stage letters to the replays that already existed.
- `data/hardware.js`, `data/hardware-replays.js`, `data/spacecraft.js`, `data/planets.js`: unchanged, except that the Apollo 11 replay gained its return to Earth.

## Mission journey system
Stages: **A** Launch, **B** Journey, **C** Landing / orbit / deployment, **D** Return to Earth, **E** Completion.

A mission lists only the stages it really had. The replay box shows a chip for each one, and E (the final status from the data) appears when the replay ends.

Effects an event can ask for:

| Effect | What you see |
|---|---|
| `deploy` | The model unfolds: Hubble's solar wings and door, Webb's sunshield and then its mirror wings, Skylab's arrays, Unity joining Zarya, Stardust's collector |
| `orbit` | A ring around the target |
| `sample` | A puff of dust |
| `reentry` | Glowing plasma and wind sound |
| `splashdown` | Parachutes, then a ring spreading on the water |
| `parachute` | A parachute landing |

New targets:
- `belt`: the asteroid belt.
- `deep`: a small labelled rock for places the solar system view does not draw (Bennu, comet Wild 2).
- `outbound` with `far`: Pluto and Arrokoth.

A dashed line shows the planned path and a bright line shows the part already flown.

## Models
- `js/rockets.js`: 20 launch vehicles. Each one is built from its own parts (stages, boosters, engines, fairing) and scaled from published sizes.
- `js/models.js`: 20 new spacecraft and hardware models.
  - Models that unfold have `userData.setDeploy(0..1)`.
  - Return capsules have `userData.chutes`.
- All models are representative, built in code, and labelled as not official NASA 3D models.

## Performance
- The Explorer draws each card picture once with one shared renderer, two per frame, and reuses it for cards with the same model.
- The large 3D viewer only runs while a detail page is open.
- The solar system, globe and landing scenes stop when their screen is hidden.

## v5: Astronauts, Mission Simulator, Exploration and Collection

| File | What it does |
|---|---|
| `js/astronaut.js` | Jointed astronauts in four suits (A7-L, EMU, AxEMU, SpaceX) with procedural animations: walk, run, lunar hop, Mars walk, jump, float, climb, operate, collect, drive, seated |
| `data/simulator.js` | Suits, gravity, destinations, spacecraft, equipment, exploration sites, the 24 real missions (the compatibility rules) and Rocket Lab parts |
| `data/collectibles.js` | 21 historical objects and science targets with information cards and sources |
| `js/simulator.js` | Mission Simulator: Historical/Sandbox mode, the 4 steps, review, Rocket Lab (parts, comparison, sandbox paint, fictional upgrades) |
| `js/exploration.js` | 3D sites with physics per vehicle: Lunar Module landing, on foot, LRV, Mars rover (arm, mast camera), zero-g EVA, cockpit |
| `js/progress.js` | Saved collection, photos, samples, upgrade points, mission objectives, the mission progress panel and information cards |
| `js/collection.js` | The My Collection screen |

**Flow:** Simulator → `sim-launch` → liftoff on the chosen rocket → the journey replay (a researched replay, or a built journey for sandbox missions and missions without one) → `replay-finished` → Continue → exploration at the site → End mission → results.

**Navigation:** Solar System · Missions · Hardware · Simulator · Astronaut · Collection, on every screen.

## v8: Engineering Bay, flat icons, terrain and game controls

- **js/icons.js**: flat line icons (one stroke color, no fill, no background), like the volume and settings icons. They cover every rocket (outline from its height, boosters and nose), every spacecraft type, the destinations, the sites, the equipment and the HUD buttons. They are simplified drawings, not technical outlines.
- **Engineering Bay** (js/simulator.js): the Rocket Garage now has one page. Stations under the 3D pad switch between Rocket (the garage bays), Spacecraft, Destination, Launch and Workshop (parts, comparison, paint and fictional upgrades). A build sheet at the top shows the current choices. The pad shows the rocket, the fitted spacecraft and an optional comparison rocket inside a hangar: concrete floor, painted bay lines, a service tower, ribbed walls and ceiling lights. The sidebar has 3 items: Engineering Bay, Suit Locker and Explore a site.
- **js/terrain.js**: one height function shared by the drawing, the physics and the mini map.
  - Layered noise and craters with rims; big lunar craters have central peaks.
  - Mars has dune ripples, basalt patches and outcrops.
  - Site landforms are representative: Hadley Rille, the Taurus-Littrow massifs, the Jezero delta front and the slopes of Mount Sharp at Gale.
  - Vertex colors change with slope and height. Boulders sit mostly on crater rims and block walkers and vehicles. Mountains on the horizon are drawn too.
- **Exploration** (js/exploration.js):
  - Lighting: shadows follow the player. The Sun is low on the Moon (Apollo crews landed in the lunar morning) and higher on Mars.
  - Ground marks: footprints, wheel tracks, and dust. The dust flies in clean arcs on the Moon, where there is no air, and drifts a little on Mars.
  - LRV physics: throttle and brakes, slope effects, little grip in low gravity (it slides in hard turns), soft suspension with pitch and roll, and short hops over crests.
  - Rover physics: the rover slows on climbs, and hazard warnings appear at rocks.
  - Game helpers: auto walk and auto run (T), cruise control (T), and auto travel to the nearest unrecorded object (G). The mini map can be clicked to travel, zoomed, and enlarged with N. W or S always takes back control.

## v9: One continuous mission, realistic launch, driving upgrades, Credits page

- **Launch** (js/launch-cinematic.js): mission launches play the liftoff and then a new climb-to-orbit scene.
  - The steps follow the usual NASA sequence: gravity turn, Max Q (with a vapor cone), booster separation, MECO and stage separation, second-stage ignition, fairing or escape-tower jettison, and orbit insertion.
  - The first stage is cut from the rocket model with clipping planes and falls away.
  - The exhaust plume widens as the air thins.
  - Earth below gets farther away and curves as the rocket climbs.
  - Mission times are typical and compressed.
- **Continuous mission** (main.js, solar-system.js, landing-scene.js): a replay pauses at its landing event and plays the close-up landing scene, then carries on. Crewed returns get a new Earth scene: entry plasma, drogues, main parachutes, and splashdown with a recovery ship. The facts in each caption depend on the capsule (Apollo, Orion, Dragon or Gemini).
  - Simulator missions with a site go straight to exploration after the landing. Apollo missions skip the landing scene because you fly the Lunar Module landing yourself.
  - After exploring, crewed missions show a "Return to Earth" button. It plays the splashdown, then completes the mission.
  - Settings > "Skip launch and landing scenes" turns off all the close-ups.
- **Driving**:
  - Faster game speeds, and Shift boost.
  - A battery that drains, with a gauge. B recharges while stopped; the rover also trickle-charges from its MMRTG.
  - Soft dust clouds behind the wheels.
  - Tracks and footprints last much longer (5000 marks), and the trail on the map is longer.
- **Credits page**: a new tab on every page collects credits, sources and notes. The bottom-of-screen instruction lines moved behind a "Controls" button.

## v10: The new mission replay (a film), pictures, realistic garage, collisions

- **Mission player** (js/mission-player.js, js/mission-plan.js, js/space-film.js). The old Solar System replay is no longer used. Every replay (Explorer, globe, Solar System and Simulator) now plays as one film made of scenes.
  - **Plan builder** (mission-plan.js): turns each mission's real events into chapters: launch, Earth orbit and departure, cruise, flyby, arrival, probe release, deploy, descent, landing, surface, liftoff, trip home, splashdown or landing on land, and the finale. The narration adds well-known general facts in a scientist's voice.
  - **Space film** (space-film.js): smooth shots in which paths are pushed outside every world and the camera never goes inside a planet. `checkClearance()` measures this; in a browser check over 113 shots, no spacecraft passed through a world.
  - **Player UI**: chapter timeline (click to jump), Previous, Pause, Next scene, narration and caption toggles, a mission map, and an end card. Keys: Space, the arrow keys, Esc.
- **Launch**: mission launches use a new daytime coastal launch site (ocean, beach, crawlerway, assembly building, water tower), so they look different from the sunset intro. The countdown shows the water deluge, ignition while the hold-down arms keep the rocket down, then release. Camera shots: long lens, engines, tower clear, then tracking. The climb to orbit follows.
- **Landings** (landing-scene.js): the Moon and Mars landings use the exploration terrain (terrain.js). A new far terrain with rolling hills and ridges replaces the flat far plain, so the edge of the square terrain is never visible. The return to Earth starts high above a curved Earth, passes through a cloud deck, and continues over the ocean (or the Utah desert for sample capsules), with no cut.
- **Pictures**: rendered 3D pictures replace the line icons on the Simulator cards, garage bays, build sheet, Equipment rack (new equipment models in equipment-models.js), exploration inventory and My Collection. Objects not yet found show as dark silhouettes. Planets use illustrated pictures.
- **Garage**: a high-bay look with an environment map for realistic reflections, shadows, a mobile launch platform, work platforms, a bridge crane, a roof truss, bay doors, carts, and people for scale.
- **Driving and walking**: every solid object blocks you (boulders, the lander, experiments, rovers). Fast impacts crash: a bounce back, a jolt, a sound and a message. Vehicles roll in turns and pitch when braking or accelerating, and steering responds gradually. Getting into the LRV is animated (walk to the seat, sit down).

## v11 redesign (see docs/REDESIGN.md for the audit, IA and design direction)

- `js/planet-look.js` (new): one place for planet materials. It provides real maps (CDN / `assets/textures`) with seamless noise-painted stand-ins, Earth normal and ocean-shine maps, clouds, and lit Saturn rings. It is used by the home tour, the Solar System view and the planet pictures.
- `js/earth-scene.js`: rewritten as the home tour. It is a closed Catmull-Rom path through a waiting point per planet, with eased speed that never stops and look-direction blending. It keeps the exports `getHomePlanet`, `onHomePlanetChange`, `setHomePlanet` and `setLaunching`.
- `js/theme.js`: every planet maps to one deep-space palette (accent `#7ab8ff`). The planet picker and Settings swatches are gone.
- Clock (`js/main.js`): `Intl.DateTimeFormat(undefined, …)` with no time zone, ticking every second. The time-zone setting was removed.
- Navigation: `goSection(where)` drives the tabs. Other code can send `open-section` with `{ section }`.
- `data/mission-groups.js` (new): `MISSION_GROUPS`, `DESTINATIONS`, `roleOf(item)` and `groupOfItem(id)`. `js/explorer.js` renders missions with their hardware, and a flat list for launch vehicles.
- `js/playback.js` (new): the shared playback speed. `launch-cinematic.js`, `space-film.js` and `landing-scene.js` multiply time by it. `mission-player.js` has 1×/2×/4×/Skip (keys 1, 2 and 4), and resets to 1× when a replay closes.
- Solar panel: tabs Overview / Data / Moons / Missions. The sidebar is navigation only, and moons are nested under their planet.
- Simulator: `showSimCoach(force)` shows the first-visit card, which is remembered in localStorage.
