# Progress

## Completed (2026-11-14): Kampu Space Master Doc (6)
**Fixes**
- **"The thing from Earth follows the rocket" (after Replay):** jumping straight to the climb skipped the countdown scene, which was where the crawler and its tower were hidden. Every scene after the rollout now puts the rocket on its pad and hides the crawler first.
- **Narrator voice:** changing it mid-scene now takes effect at once. The sentence being spoken restarts in the new voice and the rest follows.
- **Too bright:** the launch pad was glaring white. Daylight is now 2.2 (was 3.0), exposure 0.95, and the concrete is a natural grey. The Mission Builder lights are softer too.
- **Zooms:** slower and smaller.
  - End of the climb: 8.5 s (was 6.5 s), stopping at 2.6 Earth radii (was 3.1).
  - Orbit scene fly-in: about 5 s (was 3 s).
  - Landing-site globe: 7 s.
- **Scene bridge cards:** stay 3.2 s (were 1.8 s).

**Solar System and welcome**
- **Empty-space click:** clicking empty space glides back to the whole Solar System (no need for ×).
- **Welcome tour:** calmer. 24 s per planet (was 15), an almost-pause at each planet, and a long, gentle turn, so there are no rushed or empty moments.
- **Planet missions:** shown as a picture grid. Each tile has a small 3D picture, the name and the year, oldest first, scrolling when long.

**Mission briefing (redesigned)**
- **Look:** a see-through glass card on the left: the route drawn from the launch site to the destination with coordinates, the journey time, and a one-line verdict, e.g. "Flew for real: Apollo 11, 1969". "Show more" still lists the reasons.
- **Tab:** a "Briefing" tab slides it away and back.
- **How long it stays:** until the landing begins, then it tucks itself away (the tab stays).

**Mission Builder: two different buildings**
- **Real Missions:** a light-grey assembly hall with a spare rocket stage on its dolly, an engine on a stand, a tall scaffold tower, a glass-fronted control room on the gallery, gas cylinder racks and a mobile crane.
- **Free Build:** a dark engineering lab with a cyan blueprint grid, glowing display walls showing rocket outlines, two big robot arms, a 3D-printer gantry and stage segments on jigs (fictional).

**Launch pads that match each real site** (from public mission facts; simplified):
- **KSC Launch Complex 39** (Saturn V, Shuttle, SLS, Falcon 9 from 39A): octagonal pad, propellant spheres, water tower.
- **Cape Canaveral Space Launch Complex 41** (Atlas V, Titan IIIE/IVB): clean pad, lightning towers, rails to a tall integration building, no tower at the rocket.
- **Mobile service tower** (Delta II, Delta IV Heavy, Atlas-Centaur): the tower rolls back during the countdown.
- **Titan II Gemini:** the erector lowers away, and there's a domed blockhouse.
- **Kourou** (Ariane 5): launch table between concrete exhaust walls, lightning towers.
- **Baikonur** (Proton): flame pit, service tower moved away on rails.

The first countdown caption describes each pad, and rockets that were stacked on the pad (Delta II, Titan II, Atlas-Centaur) have no rollout.

**Official NASA 3D models** (new `js/nasa-models.js`):
- **Source:** loaded straight from NASA 3D Resources (assets.science.nasa.gov allows this; nothing is copied into the project).
- **Models:** Saturn V, Apollo Lunar Module, Gemini, Galileo, Parker Solar Probe, Pioneer 10, Viking Lander, Perseverance.
- **Where:** they replace the project's models in the Missions 3D viewer (the note under it says "Official NASA 3D model" with a link) and the landers in the landing scenes (the engine flames stay).
- **Fallback:** the project's own model shows first and stays when offline.
- **Loading:** NASA's files are Draco-compressed, so the decoder comes from the same pinned three.js version on jsDelivr.
- **Launch rockets:** keep the project's models, because the separations need their parts.
- **Credits:** on the Credits page and in `docs/ASSETS.md`.

**Tested** (local server, 1366×768):
- All eight NASA models load (0.3–2.1 s each).
- NASA Lunar Module in the Missions viewer.
- Mars mission tiles (11, all with pictures).
- Empty-space click closes the panel.
- Both Mission Builder buildings.
- Delta II, Titan II and Atlas V pads.
- Glass briefing, its tab, and tucking away at the landing.
- No console errors from the site (the only error came from my synthetic test clicks).

**Not verified:**
- The voice switch (speech can't be heard in the test pane).
- Real GPU smoothness and the CSS fades.
- The NASA models need internet access.

## Completed (2026-11-14): Kampu Space Master Doc (5)
**Exploring**
- **Mini map never runs out:** it was one fixed picture of the 460 m around the landing site, black beyond it. It now follows you: when you're 100 m from its centre, a new 640 m picture is drawn around you in the background, 10 rows at a time, and swapped in.
- **"Rover underground" fixed:** the distant backdrop is a coarse version of the ground without craters or the rille. It was only sunk under the detailed tiles near its old centre (re-centred every 1,200 m), so further out it showed through, over the rover. Now:
  - The tiles are a 5×5 block (1 km).
  - The backdrop re-centres every 400 m and sits 30 m below the tiles wherever they are (deeper than Hadley Rille).
  - Measured 420 m out in the rille: 0 of 272 backdrop points above the ground.

**Mission briefing** (new `js/briefing.js`, a card in the player at the start; it tucks away after 16 s or with ×):
- **Card:** from (launch site, approximate coordinates), to (real landing coordinates, or a description), journey time, and a verdict.
- **Verdicts:**
  - ✓ "Possible: it really flew" when the exact rocket, spacecraft and destination match a real mission.
  - ? "Not proven" for Free Build mixes.
  - ✕ "Unlikely" or "Not possible as built" when facts in the data argue against it: no crewed spacecraft has gone beyond the Moon; the rocket never sent anything that far in real missions; a lander or rover sent somewhere with no surface.
- **Show more:** lists the reasons and says plainly that this is a simplified guide, not a performance calculation. The project has no verified payload numbers, so none are invented.

**Every mission's launch is different**
- **Launch sites:**
  - Ariane 5 at Kourou: rainforest green, bigger cumulus clouds, greyer sky.
  - Proton at Baikonur: dry tan steppe, no sea, no pines.
  - Everything else at Florida.
  - The climb's Earth turns so that site is under the rocket.
- **Per-mission film:** a seed from the mission name picks the camera shot for each moment, plus the sun's angle. Shots include a head-on view down the approach road, a drone circle or top-down view, a camera under the engines looking up, the tower base, a side view toward the clouds and one from below.
- **Smoke:** rolls out of the flame trench to both sides, as in the ESA animation.
- **Climb:** the rocket climbs up through a cloud deck, and above the air the Sun shows in the black sky.

**Earth during the climb:**
- **Surface:** fine grain on the ground and clouds for the close views.
- **Pull-back path:** goes straight out and up, keeping the rocket centred, so the frame in the middle shows the coast clearly, not blurred ground.

**Scenes connect like a story:** when a scene ends by itself, its last picture stays dimmed for about 1.8 s with a card saying what comes next, e.g. "Scene 2 of 10 · July 16, 1969 · Parking orbit and departure burn", plus the first line of its caption. Then the next scene dissolves in. It's shorter at 2× or 4×, and jumps made with the buttons or the bar skip it.

**Tested** at 1366×768:
- Briefing logic for a real mission and three Free Build mixes.
- Briefing card and Show more on the Apollo 11 replay.
- The bridge between scenes 1 and 2.
- Kourou, Baikonur and Florida launches (venting, ignition, liftoff).
- The cloud deck and the pull-back.
- Hadley 420 m out (backdrop check, mini-map).
- No console errors.

**Found and fixed during testing:**
- The bridge card was created before the layer it sits next to, which stopped the player module from loading.
- The trench smoke whited out the ignition shot.

**Not verified:** real GPU smoothness, and the CSS fades (the hidden test pane doesn't run them).

**Next step to consider:** sharper close-up Earth would need a higher-resolution day map and cloud map stored in `assets/` (for example NASA's Blue Marble, which is public domain). That means downloading files, so it needs your OK.

## Completed (2026-11-13): Kampu Space Master Doc (4)
- **Player controls are at the bottom again.** The previous round gave their container `position: relative` for the drag thumb, which overrode its bottom placement. The draggable bar still works.
- **Climb to orbit:**
  - The camera starts low, with the horizon and Earth below and the rocket climbing above, so the rocket is seen leaving Earth.
  - Earth moves much farther below as the rocket climbs (not to scale, since the rocket is drawn far too big), so it becomes a globe, not a blurred close-up.
  - The separations keep their camera, as asked.
  - The climb ends with a long pull-back to the whole Earth (the Solar System's Earth), with the path flown traced from Florida and a glow on the rocket. It no longer fades to black.
- **Stars over Earth:** fixed. They had no depth test and were drawn after the planet; now they sit far behind it and Earth hides them.
- **Parking orbit:** opens on the same whole-Earth view (lit), flies in behind the spacecraft, and turns the camera so Earth is below with its horizon ahead and space above.
- **Departure:** the burn is seen from behind; then the camera swings wide round to look back at the spacecraft with Earth behind it.
- **Moon arrival:** the Moon grows ahead, a course correction, the craft turns, the braking burn fires, and the craft swings around the Moon into orbit.
- **Spacecraft leaving the picture:** this was a camera bug. The camera smoothed its own position, and with a fast craft it fell up to about 20 m behind it (the craft ended up behind the camera). The new chase camera only smooths its offset from the craft. Measured: the craft stays on screen for the whole departure and arrival.
- **Scene changes:** a slower, gentler melt (1.8 s), and the title and caption fade in instead of snapping.
- **Moon close-up:** the surface grain is blended from two sizes, so its repeat is not visible.

**Tested** on the Live Server at 1366×768: the Apollo 11 launch to Moon arrival. Screenshots at each stage, plus the craft's screen position measured in the departure and arrival. No console errors.

**Not verified:** smoothness on a real GPU, and the fade-in of titles (CSS animations don't run in the hidden test pane).

## Completed (2026-11-13): Kampu Space Master Doc (3)
**Launch**
- **Rollout before the countdown** (new first scene, 11 s, sped up and labelled as such), matched to how each rocket really reached its pad:
  - Saturn V, Shuttle and SLS ride a crawler-transporter with their launch platform and tower, out of the assembly building's open door and along the crawlerway.
  - Atlas V, Titan IIIE/IVB and Ariane 5 roll on a platform on rails.
  - Falcon 9, Delta IV Heavy and Proton lie on a transporter-erector.
  - Delta II, Titan II and Atlas-Centaur were stacked on the pad, so they have no rollout.
- **Wide shots in the climb:** the camera pulls far back after max Q and again on the way to orbit, so Earth's curve (Florida below), the rocket and the sky are in one picture. It comes back in for the separations.

**Mission player**
- **Draggable progress bar:** press and drag to any point of any scene, backward or forward. A thumb shows the scene and the percentage. Each engine can seek: the launch restarts and fast-forwards, and the space and landing scenes replay quickly without drawing.
- **Scene changes:** a slower cross-dissolve with a push-in, including from the descent into the touchdown scene.
- **Landing approach:** the descent opens on the whole world with the real landing site marked (red dot, ring, and a callout with the name, coordinates and mission), then flies in.

**Landings**
- **Engine burn:** clearly visible, with a hot glow at the nozzle, a brighter cone, an exhaust stream and a warm light on the ground. It's brighter than a real vacuum plume on purpose; this is noted in the code.
- **Real landing site card:** appears as the craft reaches the ground, showing the world's map with a pulsing red dot at the real coordinates, the place name, the coordinates, the mission and the date. Works for every landing with coordinates (Moon, Mars, Venus, Mercury, Jupiter, Saturn); Titan shows text only (no map in the project).

**Exploring**
- **Rover driver:** the astronaut sits in the LRV's left seat while driving (the commander drove from the left).
- **Rover wheels:** they wobbled because the steering was applied in the wrong rotation order, so the spin tilted the steering axis. Fixed. Each wheel now has its own suspension that reaches down to the ground (up to 15 cm).
- **Gravity:** walking and running speeds and grip follow each world's gravity, using a pendulum rule (Froude number 0.5, leg 0.9 m). The Moon is slower and floatier, Mars is in between. Jump height already followed gravity. The mode label shows the gravity.
- **Battery:** lasts about 10 minutes of full-speed driving (it used to be about 4). A Charge button appears while driving; it fills with the battery level, glows when low and pulses while charging. Pressing it brakes for you. B still works.
- **Endless ground:** the ground is built in 200 m tiles that keep appearing around you (one tile per frame, no stutter). Past the mapped site, craters come from a seeded pattern and hills grow with distance. The distant ground, sun, stars and sky follow you. Tested 2 km out.
- **Real Earth textures:** the Earth in the Moon's sky, the Earth below the orbit sites and the Earth in the splashdown scenes now use the real maps (they were plain blue balls).

**Textures:** Titan, Pluto (with its bright "heart"), Bennu, comets and Arrokoth get painted maps based on mission photos, plus close-up relief. They're illustrative: only the colours and big features follow the real worlds. The Pluto caption was reworded, because the close-up now draws Pluto.

**Tested** on the Live Server, 1366×768 and 375px:
- Hadley: autopilot landing, getting into the LRV (driver visible), wheels and suspension, 2 km drive, Charge.
- Apollo 11 replay: rollout, wide climb shot, globe marker, dragging the bar into the touchdown, site card.
- Perseverance landing card on a phone.
- Pluto flyby.
- No console errors, no sideways scrolling.

**Not verified:** smoothness on a real GPU (the hidden pane uses a timer for frames).

## Completed (2026-11-13): Kampu Space Master Doc (2)
**Solar System**
- Slim strip (84px) keeps the group labels (Star, Planets, Moons, Spacecraft) and shows each name under its icon (long names wrap to 2 lines).
- The dock and "Controls" are always in the middle of the page (683px at 1366 wide, whether the list is full or slim).
- × / Esc / R glide the camera back to the whole Solar System (1.6s, eased, arcing outward) instead of jumping. Dragging cancels it; Reduce Motion jumps.
- Opening flight: none of the UI shows until it ends (the screen's own fade-in animation was revealing it). Click or tap anywhere (or Skip) to skip.

**Missions:** the filter pill says "Show more" / "Show less".

**Mission Builder**
- Free Build: a gear icon ("Engineer") and blueprint cyan instead of gold (the "Fictional" labels keep their gold).
- The bay is a closed assembly hall: four panelled walls, a roof with truss beams, lamps and a bridge crane, a high bay door with daylight at its edges, crawler tracks, three levels of side galleries. The room is sized from the camera's orbit, and the camera can't zoom out through a wall or under the floor. (Before: one wall, and the camera circled outside the room, so it looked like it floated in space.)

**Mission panel (exploring):** a progress ring (3/10), "Now", one dot per objective (done / now / failed / to come), one "Next" line, and small chips (stage, status, distance, finds).

**Exploration:** the Lunar Module no longer lands on the rover. The rover's model was never moved to its parking spot until someone drove it, so it sat at the site's centre, where the LM lands. It's now parked 10 m away, and hidden during the landing (it rode folded on the LM's side).

**Launch**
- Site: waves and sun shine on the ocean, turquoise shallows and surf, Florida scrub and pine stands (instanced, cheap to draw), a concrete pad apron, perimeter road and fence, two propellant spheres with pipes, roads with centre lines, a control building and workshops, a second tower down the coast. The assembly building moved out from behind the rocket.
- Earth during the climb: the 4096px day map, thinner clouds, and the Solar System's soft blue haze instead of the hard cyan band.
- Stage separation: the dropped stage was turned sideways and swung across the camera, because its rotation was read from a matrix that also held the ×8 scale. Fixed. It now falls back in line, tumbling slowly, with a puff of gas at the joint. Cut faces get a dark cap (no hollow tubes), and the camera eases onto the stage still flying.
- Escape tower (Saturn V, SLS): the real tower is cut off the model (before, a copy flew off while the tower stayed on), and it fires its own motor ahead and to the side. Fairing rockets: the two halves swing open and fall away, revealing a simple payload (illustrative).

**Space scenes**
- The planets use the Solar System's look: real maps, real cloud map (the painted oval clouds are gone), the soft glow, and city lights on Earth's night side.
- Each shot has its own sunlight, so the planet under the spacecraft is in daylight (before, the departure started over Earth's night side, so Earth looked black).
- Moon up close: the 2048px map from `assets/`, plus fine relief and grain that only appear up close and fade out with distance (generated detail, illustrative).
- Scene changes cross-dissolve: the last picture melts away over the new scene with a slight push in (no dip to black). If the picture can't be taken, it uses a soft dip.

**Tested** on the Live Server (1366×768 and 375px):
- Intro hidden UI, click-to-skip, dock centre, slim strip, × glide.
- Bay screenshot.
- Saturn V and Atlas V 541 launches (pad, climb, staging, tower, fairing).
- Apollo 11 replay scenes: orbit, departure, Moon arrival, descent, plus the dissolve.
- Hadley landing (rover hidden, then parked 10 m away).
- Mission panel.
- Phone: no sideways scroll, "Show more/less".
- No console errors.

**Not verified:** smoothness on a real GPU, since screenshots came from a hidden pane with a timer standing in for frames. The 4096 Earth map is 0.7 MB more to download. `node --check` can't run here (no Node), so every changed module was loaded in the browser instead.

## Completed (2026-11-13): Kampu Space Master Doc, part 2
- **Solar System list:** collapsing it now leaves a slim strip of icons (68px: each world's dot, its name on hover, dividers between groups), like a social app's side menu. The panel button at the top switches between full and slim. The ☰ in the top bar is gone on wide screens (phones keep the slide-in menu).
- **Controls:** the "Controls" button is centred under the five view buttons, wherever they are (813px with the full list, 717px with the strip, at 1366px wide).
- **Missions filters:** each is a box with its label, the current choice and a "Show / Hide" pill. Choosing an option keeps the box open; a box only closes when its own header is clicked, and the two boxes open independently.
- **3D viewer (hardware page):** frames the model's whole bounding sphere and uses the narrower view angle (width on phones). Checked 9 models while turning: every point stays inside, 62–86% of the way to the edge, on desktop and phone. Card pictures use the same framing.
- **"Show in Solar System":** kept only for Voyager 1, Voyager 2 and Parker Solar Probe, which are drawn there (tested: it opens them). For the other 61 items it could only open their planet, not the equipment, so it was removed. Landers and rovers keep "View site on the … globe", which shows the equipment.
- **Mission Builder modes:** new icons and cards. Real Missions has a mission patch on a starfield ("History"); Free Build has a pencil blueprint on a gold grid ("Your design"). The difference shows in the builder too: a banner under the title names the mode and what it allows ("18 of 19 rockets can fly here" / "All 19 rockets can fly…"), and Free Build turns the console gold (border, title label, name plate, step tab, progress bar).
- Tested on the Live Server at 1366×768 and 375px: no console errors and no sideways scrolling.

## Completed (2026-11-13): Kampu Space Master Doc (team feedback, 10 pages)
**Welcome**
- The hint line sits lower (30px under the button).
- The top strip (brand, clock, sound, settings) is bigger.
- Leaving Welcome is a slower, calmer transition (1.9s instead of 1.1s): the title lifts away first, then the Solar System dissolves in. Other screen changes are unchanged.

**Solar System**
- The Sun's light stays on the Sun. Its position used the camera from the previous frame, so it trailed on fast drags. The mirrored "lens ghost" rings, which slid across the screen as the view moved, were removed.
- The left list can be hidden on wider screens (the "‹" in its header) and brought back with ☰. While it's hidden, the 5 view controls move to the middle. On phones it's still the slide-in menu.
- Closing a planet panel (× or Esc) resets the view to the whole Solar System.
- The mission panel no longer shows on the Solar System; it only appears while exploring.

**Missions**
- "Where they went" and "What it is" are dropdowns. Only one is open at a time and only one filter is used at a time: picking a destination resets the hardware type, and the other way round. Closed, each shows its current choice, and only one row is highlighted.

**Mission player**
- The scene title ("Still at work") has more room and a larger font.
- End card: the mission name, a "✓ Mission complete" badge, more space, "← Go Back" (was "Continue") and a replay icon (was "Watch again"). The caption bar no longer repeats the same text behind the card.
- 1× / 2× / 4×: measured working in all three engines (launch 3.5× faster at 4×; space shots and landing in proportion). The scene label now shows "· 4× speed" so the change is visible.
- The round voice-preview ▶ button was removed.

**Mission Builder**
- Mode cards: Real Missions has a flag on a blue tile; Free Build has a wrench on a gold tile (the "fictional" colour). The selected Free Build card turns gold. The note and legend under the cards were removed; Free Build's line says "marked fictional".
- The row of Rocket / Spacecraft / Suit / Destination above the bay was removed (the step tabs show them).

**Exploration**
- Site card: more spacing. The Camera and All sites buttons were removed (C still changes the view). It now has End mission and How to play.
- Lunar Module landing: the autopilot lands by default. "Take control" (or L) hands it to you with a 3-line guide: ↑/W more thrust, ↓/S less, ← → or A D sideways (forward drift is held for you). "Autopilot" hands it back.
- Arrow keys work like W A S D everywhere: walk, drive, spacewalk, landing. The exception is the rover's mast camera, where the arrows aim it.
- Vehicles: E drives straight away (no walk-to-seat animation), only the vehicle is shown, and the prompt says "[E] Get out". E again gets out.
- **Bug fixed: messages never showed while exploring.** The page had two elements with the id "explore-message"; the first was in the Solar System's planet panel, so every exploration message (Q results, photos, samples, radio, battery, crash) went there. That's why "Q does not work". The exploration message now has its own id.
- Mission panel: a slim side panel on the right, below the mini map, with a "Mission" tab to slide it away. It shows a one-line stage and status, "Now" (the current objective), the next 2 (+ "N more") and a progress bar.
- Auto walk / Auto run / Go to nearest / Stop are one even row.
- "Return to Earth" on the results only shows during a mission (it showed after visiting a site directly).

**Help**
- Rewritten as a quick guide: 4 numbered steps, 9 key controls, and "More keys" folded away. 144 words (was several hundred).

**Tested** on the Live Server (127.0.0.1:5500) at 1366×768 and 375px:
- Every main screen.
- An Apollo 11 mission: Real Missions → launch → journey → autopilot landing → on foot (↑ cancels auto walk, Q logs a sample with a visible message).
- The rover at the Free Build Moon site (E to drive, ↑ to move, E to get out).
- The skip route from the Destination step → End mission → results → Collection.
- The player end card (Go Back, replay icon).
- All 12 replays.
- No console errors, no failed requests, no sideways scrolling.
- Not tested on a real GPU; screenshots were taken in a hidden pane with a timer standing in for animation frames (testing only).

## Completed (2026-11-10, follow-up from the team's review)
- **Opening screen, compact:** the bigger version covered the 3D planet. The title group is now smaller and sits higher, so the planet gets the lower half.
  - Logo 52–68px, title up to 3.4rem, smaller button.
  - A soft dark halo sits behind the text only, instead of a panel.
  - At 1257×668 the group ends at 45% of the height (before: about 70%). At 375px it ends at 41%.
- **Mission Builder mode picker (left sidebar), redesigned:**
  - Two clear options, each with an icon (a shield with a check for Real Missions, building blocks for Free Build), a short title, one line and a radio dot.
  - The chosen mode is explained once, in an info box.
  - The "Fictional" label is shown as a small legend in normal sentence text (it used to be an all-caps footer).
  - Screen readers now hear which mode is selected (`aria-checked`).
  - Files: `index.html` (sidebar markup), `js/simulator.js` (`render()`), `css/style.css` (blocks at the end).

## Completed (2026-11-10): design and realism pass

**1. Objects sinking in the Mission Builder bay (fixed at the cause)** (`js/simulator.js`)
- The models are not built with their origin at their base. Every spacecraft is centred on its middle, so 49–77% of it sank below the floor. Rocket nozzles hung 2–5% below it.
- `fill()` now places each object from its measured bounding box: its lowest point rests on the deck, and its left edge starts where the previous object ended, so nothing overlaps.
- The launch platform was buried completely under the floor. It now stands on the floor, and everything on the pad stands on its deck.
- The work platforms are centred on the rocket even with a payload beside it.
- The astronaut's boots now stand on the turntable (they were 4 cm into it).
- Checked across 70 combinations: every rocket, every spacecraft on two rockets, and the compare rocket. All rest on the deck to within 1 cm.

**2. One status palette** (`css/style.css` tokens `--st-*`, `js/progress.js`, `js/exploration.js`, `js/mission-player.js`)
- Status colours: done = teal-green + ✓, active = ion blue, pending = slate, failed = soft red + ✕.
- It replaces the old mix of amber, a blue→yellow gradient and blue for the same meaning.
- It's used by the player timeline and mission map, the builder's stations, progress bar and manifest, the stage chips, the replay dots and the mission objectives.
- New: a crash in the Lunar Module landing game marks that objective "last attempt failed, try again" until you land.

**3. Opening screen** (`css/style.css`, one consolidated welcome block)
- The logo is 96–128px (it was 59px).
- Gaps follow a fixed scale: logo→title 28, title→tagline 16, tagline→button 40, button→hint 18px.
- The title tops out at 5rem with less tight letter spacing.
- Checked at 1920, 1366, 1280×650, 820 and 375px.

**4. Mission Builder as a planning console** (`css/style.css`, small change in `js/simulator.js`)
- The panels look like an instrument console.
- The build sheet is now a 4-slot mission manifest; each slot is filled ✓, active, or waiting ("Not chosen"). The slots open their station with the keyboard too (Tab, then Enter or Space).
- The 3D view is a framed monitor with a "Telemetry" readout.
- The chosen card shows a "✓ Selected" chip.
- The builder now uses the site's one accent colour; amber is kept only for the hazard stripe.

**5. Launch realism** (`js/launch-cinematic.js`, `js/particles.js`)
- **Rockets on the pad:** each rocket now stands on hold-down posts above the flame trench. The engines were buried about 6m inside the pad, which is why no fire showed at ignition. The lift is measured per rocket, and all 20 rockets were checked.
- **Particles:** emission is now per second instead of per frame, so 30, 60 and 144 Hz screens look the same (measured equal at 30 and 60 fps). The sprite pool is larger (1200), and when it's full the oldest smoke is reused. Before, the pool filled about 5s after liftoff and new fire was dropped (fire fell from about 72 to 54 sprites). Now fire holds at 86–98.
- **Smoke and fire:** fire is drawn after smoke, so the engine glow shows through the steam. Steam near the engines is warm-tinted at full thrust. Smoke right in front of the camera fades instead of whiting out the view.
- **Lighting:** filmic (ACES) tone mapping like the other 3D scenes, studio reflections on metal and paint, and sun shadows from the rocket, tower and arm.
- **Camera:** the shake is smooth (sine waves) instead of random per-frame jitter. Reduce Motion still turns it off.
- **Clouds:** soft puff clusters instead of hard ellipsoids.
- **Earth during the climb:** the same Earth as the Solar System (real day map, surface relief, ocean shine and clouds, with painted fallbacks offline), turned so Kennedy Space Center is under the launch.

**6. Panels** (`css/style.css`)
- On the Solar System screen, the mission progress panel moves to the bottom-left, so it no longer covers the selected planet's information.

**Earlier the same day**
- Phone top bar: 170→92px.
- Laptop top-bar overflow fixed.
- Venus texture 404 fixed.
- `docs/ASSETS.md` lists the Venus files by their real names.

## Completed (2026-11-15): Kampu Space Master Doc (17)
- **Builder "next" button:**
  - It now sits in a bar pinned to the bottom of the screen, centred, big, and pulses once when a step is ready. Back is on the left; "Step 2 of 5 · 40% built" is on the right.
  - The step bar stays pinned at the top while you scroll.
  - Files: `js/simulator.js`, `css/style.css`.
- **Builder progress:** the steps are now segments like the replay timeline (done = filled green, current = outlined and half filled). The green ✓ text and the thin bar are gone.
- **Narration:**
  - Sentences are queued back to back, so there are no timer gaps.
  - Neural ("Natural") voices are no longer pitch-shifted, and the newest Edge "Multilingual" natural voices are preferred.
  - Scene waits: title card 2.2 s (was 3.2), the beat after the voice 0.35 s (was 0.9), silence fallback 1.5 s (was 3).
  - Generic explanation lines are only added when a mission's own text is short. Apollo 11 got its own NASA-sourced text for the orbit, departure and descent scenes (`story` in `data/hardware-replays.js`), and silent departure scenes now have a line.
  - Files: `js/narrator.js`, `js/mission-player.js`, `js/mission-plan.js`.
- **Missions page:**
  - It opens with "What would you like to do?" and two big cards, Real Missions and Free Build.
  - The browse view has a wider sidebar (300 px), a centred column (max 1180 px), and roomier cards and spacing.
  - Real Missions | Free Build is a centred switch at the top of the Missions page and the builder.
  - One themed scrollbar style is used across the site.
  - Files: `index.html`, `js/main.js`, `css/style.css`.
- **Free Build astronaut guide (`js/guide-astronaut.js`, new):**
  - A second astronaut walks beside you.
  - Near an object, Y or "Ask your guide" makes it walk over and tell the object's story, built only from its information card.
  - The talk is spoken with subtitles; ✕ stops it.
  - "Hide guide" is in the HUD and remembered in Settings (`guideHidden`).
  - Y is listed in How to play.
- **Apollo 11 first-person moonwalk (`data/moonwalks.js`, new; `moonwalkShot` in `js/space-film.js`):**
  - It replaces the general "On the surface" scene with eight beats: first step, contingency sample, Aldrin, plaque, flag, experiments, rocks, and back inside.
  - You see through Armstrong's helmet (gloves, visor edge) while Aldrin works beside you.
  - Real quotes (ALSJ) show with the speaker's name and are read in a second voice after the narration.
  - Each beat is a replay scene, so pause, skip and the progress bar work; each scene lasts as long as its words.
  - A "Recreation based on the Apollo 11 transcript" tag stays visible. The final beat ends with three key takeaways.
- **Tested in the browser:**
  - builder steps and the pinned next button (desktop and 375 px);
  - the Missions chooser, then browse, then the switch both ways (desktop and 375 px);
  - the guide (Y, subtitles, ✕, Hide/Show, saved setting) at Tranquility Base in a Free Build mission;
  - narration timing (sentences back to back; the quote follows the narration);
  - every moonwalk beat on its own, and the Apollo 11 replay from the first step through Liftoff;
  - no console errors.
- **Not verified:**
  - how the "Natural" voices sound on the team's Edge (the test browser only had David, Mark and Zira);
  - the exact minute of the middle moonwalk beats (shown as "During the moonwalk", because the project's sources don't give them).
- **Next:**
  - moonwalks for Apollo 12, 15 and 17 after review;
  - Apollo 12/15/17, Curiosity and Perseverance still use their existing event text for orbit and descent (it is detailed, but they have no `story` of their own yet).

## Completed (2026-11-15): rebuilding the code-built models, Phase 3 (equipment and astronaut), awaiting review
- **Equipment (`js/equipment-models.js`, all 15 items, same keys):**
  - **Hasselblad 500EL:** silver body, motor drive, lens rings with the focus tabs for gloved fingers, film magazine and trigger grip.
  - **Sample bag and scoop:** a wrinkled bag with a numbered tag and closure; a scoop with a locking collar.
  - **Mast heads:** Mastcam-Z with two zoom cameras, Mastcam with two different lenses; Navcams and the laser window on both.
  - **Robotic arm:** joints and a five-tool turret with a drill bit.
  - **Sample tubes:** white tubes with seals (the seal colour is illustrative).
  - **Relay dish:** feed struts and a rim.
  - **Cameras, radio and SAFER:** a camera with grip and viewfinder; a radio with display and switches; SAFER with its thrusters, nitrogen tanks and hand controller.
  - **Collected objects:** a lumpy rock, orange soil with glass beads, the Apollo 15 plaque and figurine, and the landing-site marker (labelled illustrative).
- **Astronaut (`js/astronaut.js`):** every joint, pose and animation is unchanged. Added:
  - a woven cloth bump;
  - the US flag patch on the left shoulder (A7-L and EMU);
  - gloves with fingers and thumb;
  - controls and straps on the chest box;
  - the Apollo oxygen hoses and purge valve, and PLSS seams;
  - EMU helmet lights on both sides and the cuff checklist;
  - the visor assembly rim and ribbed boot soles.

  Still parts are merged. Each suit is 20–28k triangles and 34–63 meshes.
- **Tested in the browser:**
  - all 15 equipment items and all 5 suits build;
  - all 10 animation states run on every suit;
  - walking on foot in exploration (Free Build Moon site);
  - the Apollo 12 landing with two astronauts hopping;
  - no errors.
- **Not verified:** the equipment rack and inventory pictures inside the builder (the models were checked on their own).

## In progress (2026-11-15): rebuilding the code-built models, Phase 2 (spacecraft) done, awaiting review
- **Rebuilt in full (`js/models.js`):**
  - **Hubble:** now at real proportions (13.2 m long, 4.2 m across). It has silver insulation, the ten equipment-bay doors, yellow handrails, two rigid solar arrays (2002 type), the high-gain antennas and magnetometers.
  - **Webb:** sunshield spreader bars, the backplane frame and instrument module, the high-gain dish and the trim flap.
  - **Cassini/Huygens:** foil-wrapped tanks, finned RTGs, two engine bells, the camera pallet, the magnetometer boom and three plasma-wave antennas.
  - **Voyager:** a 1.8 m ten-sided bus (in proportion to the 3.7 m dish), three finned RTGs, the scan platform, plasma-wave antennas and the Golden Record.
  - **Parker:** shield struts, water-cooled arrays and four radiators, the FIELDS antennas, the Faraday cup and the magnetometer boom.
  - **Mars entry capsule and backshell:** a 70-degree sphere-cone heat shield, the parachute cover, backshell thrusters, and the cruise-stage ring with radiators.
  - **Sky crane:** three propellant tanks, eight canted engine bells in four pods, and radar.
  - **Ingenuity:** real proportions (49 cm tall, 1.2 m rotors), curved blades, the solar panel on the mast and thin legs.
  - **Phoenix/InSight:** solar arrays made of ten gores with ribs, deck instruments, wind sensors, an arm camera, twelve descent engines and footpads.
  - **Orion:** radiators, the main engine and eight auxiliary thrusters, crew windows, and three-panel solar wings.
  - **Dragon:** windows, hatch, SuperDraco pods, and solar cells on half of the trunk.
  - **Gemini:** ribbed black shingles, adapter stringers and windows.
- **Shared upgrade for the rest** (Centaur, LCROSS, MESSENGER, Venus probes, Galileo and its probe, Huygens, Pioneer, New Horizons, LRO, the sample capsule, OSIRIS-REx, Stardust, Skylab, Zarya/Unity, the Orion and Gemini capsules):
  - insulation-foil and panel textures, mapped at a sensible size (`detailUV`);
  - real engine bells;
  - finned RTGs (Galileo).
- **Hooks kept:** `setDeploy` (Hubble, Webb, Skylab, Zarya/Unity, Stardust), `setArrays` and `deployInstruments`, `heatShield`, `chutes`, `huygens`, `flame`, `engines`, and the helicopter's `update`.
- **Size:** every model is under 9k triangles (budget 60k) and has 2–57 meshes.
- **Tested in the browser:**
  - all 34 models build;
  - deploy and array functions run from 0 to 1;
  - landing replays run without errors: InSight (arrays open, seismometer placed), Phoenix, Curiosity and Perseverance (backshell, sky crane), Huygens, the Galileo probe, Cassini and Pioneer Venus;
  - Ingenuity is visible in the Mars surface film.
- **Not verified:** Hubble and Webb unfolding inside a full mission replay (the functions were run directly), and frame rate on the team's computers.
- **Next:** Phase 3, the equipment and the astronaut.

## In progress (2026-11-15): rebuilding the code-built models (Phase 1 of 3 done, awaiting review)
Goal: bring the models built in code closer to NASA's 3D models. Models that already load NASA's file are unchanged.
- **Shared toolkit `js/model-detail.js` (new):** textures drawn in code, with nothing downloaded:
  - panel seams and rivets, paint speckle, spray-on foam, corrugation;
  - crinkled gold, silver and black insulation foil;
  - solar cells, plus heat-tinted engine nozzles with cooling tubes.

  It also builds real shapes (curved engine bells, ogive nose cones, joint rings) and merges still parts to keep draw calls low.
- **All 20 rockets (`js/rockets.js`):**
  - panel seams and joint rings, ogive noses and curved bells;
  - Saturn V: fins, engine fairings, ullage motors, the escape tower truss;
  - Shuttle: external-tank foam and ribs, booster segments and struts, orbiter windows, OMS pods and swept tail;
  - Falcon 9: grid fins; plus booster struts and cable raceways.

  Paint, accessories and stage separation work as before.
- **Apollo (`js/models.js`):**
  - **CSM:** radiator panels, four RCS quads, the SPS bell, the high-gain antenna, windows and the docking probe.
  - **Lunar Module:** built from NSSDCA sizes, so it now has real proportions (wider, with footpads 9.4 m apart). It has:
    - gold and black foil;
    - a faceted cabin with its triangular windows;
    - RCS quads, the radar and S-band dishes;
    - a ladder and porch, plus contact probes.
  - **CM:** windows and hatch set on the cone wall.
  - **LM liftoff:** the scene now shows the real descent stage (the stand-in gold cylinder is gone), and the ascent stage lifts off from it at the same scale.
- **Rovers:**
  - **Curiosity and Perseverance:** new wheels, with chevron grousers (Curiosity) or 48 curved grousers (Perseverance) and curved spokes. They also have:
    - the rocker-bogie with its differential bar and steering actuators;
    - mast cameras, the MMRTG between two heat exchangers;
    - the arm and turret, and hazard cameras.
  - **Spirit/Opportunity:** framed solar wings, the Pancam mast, the dish antenna and the instrument arm.
  - **Sojourner:** gold body, APXS and laser stripers.
  - **LRV:** a tubular chassis, wishbone suspension and drive motors, fenders, the console and hand controller, the LCRU with its umbrella antenna, the TV camera and the tool carrier.
- **Landers:**
  - **Viking:** the real body shape from NSSDCA (a hexagon with alternating 1.09 m and 0.56 m sides), plus its 18-nozzle descent engines.
  - **Surveyor:** mirror-topped compartments, the planar-array grid, omni antennas, crushable blocks and real nozzle bells.
  - **Blue Ghost:** foil and framed panels.
  - **Pathfinder:** high-gain dish and a stereo camera head.
  - **Airbags:** fabric wrinkles.
- **Apollo 12 scene fix:** the wider, real-size LM hid Surveyor 3. It now has a tested direction (`angle` in `data/hardware.js`) and is fully in view through the end of the replay (checked by ray casting from the scene camera).
- **Size:** every rebuilt model is 0.3k–16k triangles (budget 60k).
  - Draw calls: rockets 30–60, as planned (each tube stays separate so separation works).
  - Rovers about 24–50 (Curiosity 50, versus 155 meshes before).
  - Landers 7–23.
- **Tested in the browser:**
  - every model builds and keeps its hooks (`wheels`, `engines`, `retro`, `setPetals`, `flame`, `boosters`);
  - landing replays: Surveyor 3, Viking 1, Pathfinder (petals and Sojourner), Spirit (airbags and rover), Curiosity (sky crane), Apollo 15 (LM and LRV), Blue Ghost and Apollo 12;
  - LM descent and liftoff films;
  - driving Curiosity in Gale Crater and the LRV at Hadley (wheel spin and steering);
  - the Missions 3D viewer at phone width;
  - the Shuttle launch;
  - no console errors from the site.
- **Not verified:**
  - frame rate on the team's real computers;
  - every rocket's full launch (only the Shuttle's was run after the rebuild);
  - the builder bay's look with each rebuilt rocket.
- **Next (after review):**
  - Phase 2: the other spacecraft, including our moving versions of Hubble, Webb, Galileo and Cassini, plus capsules, stations, Phoenix, InSight, the sky crane and Ingenuity.
  - Phase 3: equipment and the astronaut.

## Completed (2026-11-15): NASA resources, recommendation 4 (Apollo 12 and Surveyor 3)
- **Two new Moon sites, about 180 m apart:** Surveyor 3 (landed April 20, 1967 UTC) and the Apollo 12 Lunar Module Intrepid (landed November 19, 1969). This is the only time astronauts visited a spacecraft that had landed before them.
- **Data:**
  - `data/hardware.js`: a full profile for each (summary, purpose, timeline, contributions, status, coordinates, sources, landing scene). Apollo 12 is at 3.0128 S, 23.4219 W; Surveyor 3 at 3.0162 S, 336.582 E. Both sets are NSSDCA figures measured from Lunar Reconnaissance Orbiter images.
  - `data/catalog.js`: Missions items `apollo12-lm` and `surveyor3`, each linking the other. Atlas-Centaur's launch list now includes Surveyor 3.
  - `data/mission-groups.js`: new "Surveyor 3" (1967) and "Apollo 12" (1969) groups.
  - `data/mission-photos.js`: NASA photo AS12-48-7136 (Conrad at Surveyor 3, Intrepid behind; by Alan Bean) on both replays' end cards. It loads from NASA's Image Library, so nothing is stored in the project.
- **Facts** come from the NSSDCA records 1969-099C and 1967-035A (read November 14, 2026), NASA Science's Surveyor 3 page, and NASA's caption for AS12-48-7136. They include:
  - Surveyor 3's three touchdowns, 6,326 pictures and soil strength (about 0.7 kg/cm², enough for a lunar module).
  - The roughly 10 kg of parts Apollo 12 brought back; the camera is now at the Smithsonian.
  - Apollo 12's two moonwalks, 34.35 kg of samples, six-instrument ALSEP, and the deliberately crashed ascent stage (the first recorded artificial moonquake).
- **Left out on purpose:** Surveyor 3's mass. NSSDCA gives 296 kg and NASA Science 997.9 kg, probably landed versus launch mass; not stated without checking.
- **Tested in the browser:**
  - Missions: the Moon filter shows the two new mission blocks; both detail pages show their facts, photo link, related items and Replay.
  - The Moon globe lists both sites, and "View site on the Moon globe" selects the right one.
  - Apollo 12 replay: the landing caption and site card are right, and the end card loads the NASA photo (1280 px).
  - Surveyor 3 replay: the landing chapter runs with the three-touchdown caption.
  - No console errors.
- **Not done:**
  - The landing scene doesn't act out Surveyor 3's bounces (the caption tells it).
  - At globe scale the two markers almost overlap; the sidebar list separates them.
- **Follow-up: Surveyor 3 in the Apollo 12 landing scene.**
  - New `landing.neighbors` option in `data/hardware.js`, handled by `addNeighbors()` in `js/landing-scene.js`. Hardware already on the ground nearby stands at its real distance (Surveyor 3: 180 m), retro-rocket already gone.
  - It has a small label that stays readable at any distance: "Surveyor 3 · landed April 1967 · about 180 m away".
  - The direction in the scene is chosen, not geographic. The code tries directions 10 to 35 degrees to either side of straight behind the lander, and uses the first one with a clear line of sight over the generated hills.
  - For scenes with a neighbour, the camera after touchdown sits a little higher (7.5 m) so the horizon stays in view.
  - The touchdown caption now points it out.
  - Tested: Surveyor 3 shows during the descent and after touchdown. A temporary 10x-size test confirmed it stands on the ground, unblocked, under its label; it was reverted. Surveyor 1's landing is unchanged. No console errors.

## Completed (2026-11-15): NASA resources, recommendation 3 (rover distance chart)
- **"How far it drove"** is a new section on every rover page in Missions: Lunar Roving Vehicle (Apollo 15), Mars Pathfinder & Sojourner, Spirit, Opportunity, Curiosity and Perseverance.
- **What it shows:** all 12 rovers that have driven on the Moon and Mars, drawn to one scale.
  - The rover you're viewing is highlighted, with a sentence giving its rank ("tied for" when distances match).
  - A dotted marathon mark at 42.195 km.
  - Moon / Mars / All filters, and striped bars for rovers still driving.
  - Each other NASA rover's name opens its page.
- **Data:** `data/rover-distances.js`, copied exactly from NASA/JPL's infographic "Out-of-this-world records" (as of Oct. 12, 2026, on NASA's Spirit and Opportunity page), with its source link.
  - Soviet and Chinese rovers are included, as on NASA's chart; Yutu's distances are marked as estimates.
  - The Apollo 15 row notes that NASA's catalog gives 27.9 km for all three moonwalks (the chart gives 27.8 km for the rover).
- **Files:** `data/rover-distances.js` (new), `js/explorer.js` (`renderRoverRace`), `index.html` (one section), `css/style.css`.
- **Tested in the browser:**
  - Highlighting and rank sentences on the Apollo 15 rover, Spirit, Perseverance and Pathfinder pages.
  - The Moon filter shows only Moon rovers; the Spirit link opens Spirit's page; the chart is hidden on non-rover pages (Voyager 1).
  - The marathon mark sits at the right point on the scale; no sideways scrolling at 375 px; no console errors.
- **Not done:** Perseverance's and Curiosity's distances will grow; update the data file from NASA's chart when a newer version is published.

## Completed (2026-11-15): NASA resources, recommendation 1 (facts from NASA's records)
Source: the team's NASA zip, analysed in the "Space Legacy NASA Resource Review" page. It contained the NSSDCA catalog pages in `Moon.pdf` and saved NASA Science mission pages. Only data files changed; every new fact links to its NASA source.
- **Apollo 11** (`data/hardware.js`, NSSDCA 1969-059C, now in sources):
  - Eagle's ascent stage was cast off on July 22, 1969; its fate is not known.
  - The seismic package stopped on August 27, 1969.
  - The early experiment package (EASEP) weighed 48 kg, about 17 m south of the lunar module.
- **Apollo 15:**
  - The ascent stage crashed on August 3, 1971 at 26.36° N, 0.25° E.
  - The memorial plaque, and the hammer-and-feather drop.
  - The SNAP-27 nuclear generator: plutonium-238, about 70 W, 63.5 W after a year.
- **Viking 1:** the orbiter was shut down on its 1,489th orbit (August 7, 1980); the lander was renamed the Thomas Mutch Memorial Station; the orbiters returned 52,663 images and the landers 4,500.
- **Mars Pathfinder:** the airbag landing (about 14 m/s, about 15 bounces up to 15 m, rest about 1 km away), 2.3 billion bits, and the core-size estimate from radio tracking.
- **Opportunity:** its 45.16 km record stood until Perseverance passed it on October 11, 2026.
- **Spirit and Opportunity:** the joint NASA mission page added to sources.
- **InSight:** the Martian wind recording, NASA's landing-area figure in the coordinate note, and the NASA Science page.
- **Ingenuity** (`data/catalog.js`):
  - Its own purpose, specs (72 flights, 128.8 min, 17.0 km, 24.0 m, 1.8 kg), timeline and NASA source.
  - Its page used to borrow Perseverance's timeline.
- **Pioneer 10:**
  - Crossing Saturn's orbit (1976) and Neptune's orbit (1983).
  - Routine contact ending in 1997, at 67 AU.
  - Voyager 1 passing it in 1998.
  - Why the last signal ended (its radioisotope power had decayed).
  - The last signal's 11 h 20 min travel time.
- Existing facts that already matched NASA's records were left unchanged: the Apollo 11 and 15 coordinates and liftoff times, and the 1977 ALSEP shutdown.
- Tested in the browser: opened the Missions detail pages for Apollo 11 LM, the Lunar Roving Vehicle, Ingenuity, Pioneer 10, Viking 1, Opportunity, Pathfinder and InSight; every new fact and source appears; no console errors.
- Still to do from the review: correct NEAR "out of fuel" before NLC-2 returns (2), the rover distance chart (3), and the Apollo 12 + Surveyor 3 site (4).

## Completed (2026-11-14): Kampu Space Master Doc (15)
- **Solar System view buttons (Labels, Orbits, Shadows, Pause, speed) moved down** into the space the Controls button left: 18 px from the bottom instead of 58 px. The speed menu still opens 10 px above them.
- **Bug fix (phones): the Solar System list no longer flashes over the screen and the bottom bar.** As the opening flight ended, the list's "slide in" animation briefly moved the closed drawer on screen for about a second, covering all five bar buttons. On phones the closed drawer now skips that animation. Measured during the intro: it stays off-screen, and the bar buttons can be clicked.
- **Controls button removed from the Solar System screen (the main board).** Its instructions ("Pick a world… drag to rotate, scroll to zoom") are still in Help (?). The globe, exploration and landing screens keep their Controls button.
- **Each scene waits for the narrator to finish before the next part of the progress bar starts.**
  - Cause: when a new scene started, the app switched screens and the Solar System screen's shutdown stopped all speech, including the mission narrator. The line was cut off mid-sentence, and the scene then waited silently, up to 2 minutes, for a "finished" signal that never came.
  - Fix: the Solar System screen no longer stops speech while the mission player is running.
  - Safety net: if anything else ever stops the voice, the player moves on after about 3 seconds of silence (longer than any pause between sentences). Pause still holds everything.
- Tested: a full Gemini III replay (launch to Mission complete) with every spoken line logged. Every line finished before the next began, nothing was cancelled, and the console had no errors.
- **Splashdown narration in the order it happens** (`js/mission-plan.js`):
  - Before: the general line "Parachutes open in stages…" was added after the mission's own line, so it came after "…recovers the crew".
  - Now it goes before the sentence about the splashdown or recovery (Gemini III).
  - It's left out when the mission's own line already mentions its parachutes (Artemis I, Apollo 11).
  - Checked by building every replay's plan and reading every splashdown line.

## Completed (2026-11-14): Kampu Space Master Doc (14)
- **NASA 3D models in every mode.** NASA's list was checked on science.nasa.gov and its GitHub mirror; the Chrome DevTools MCP failed to connect, so the built-in browser was used.
  - Added: Hubble, James Webb, Voyager, Cassini-Huygens, LRO, MESSENGER, OSIRIS-REx and Stardust. Where NASA offers two files, the lighter one is used.
  - Each file is turned to face the way our model does (checked side by side), so craft fly nose first.
  - Shown on the Missions page, on builder cards and in the assembly hall, and in mission scenes. Each is labelled "NASA" / "NASA 3D model: …".
  - Our models stay where parts move: rockets (stages), the Apollo stack and Lunar Module, rovers (wheels), landers that unfold, Galileo and Cassini (probe release).
  - Also our own models: Curiosity, Skylab and SLS (no .glb on NASA's pages); the ISS (our model is only Zarya); the astronaut (animated).
- **Free Build builder redesign**
  - **Progress bar:** keeps the icons but isn't clickable; "Step 1 of 5" is gone. One button bottom right moves on, with a small Back on the left. On phones the bar shows icons only.
  - **Rocket:** bays on the left; on the right, past a faint line, only the essentials (size, boosters, flew, status). The button says "Pick a spacecraft".
  - **Spacecraft:** the info section is removed and the titles are bolder.
    - Curiosity and Perseverance moved to Surface vehicles. A rover rides along with a spacecraft.
    - It's real only with the new "Cruise stage, aeroshell and sky crane" carrier on an Atlas V 541 (NASA sources in `data/simulator.js`); otherwise it's fictional.
    - Choosing a card only marks it. Crewed craft show the Suit step; others skip it.
  - **Suit:** hand tools are a side list inside the viewer. Clicking one shows it on the turntable, with "Back to the suit". "Wear this suit on every site" is removed; the chosen suit is worn at the chosen site.
  - **Destination:** worlds first, then that world's sites (crews: suit sites; rovers: rover sites) plus "Orbit or fly by" ("No surface walk" for landers). Selecting only marks it; then "Go to Workshop".
    - Real sites (Apollo 11, 15 and 17, Gale, Jezero) are labelled real.
  - **Workshop:** one box in four quarters.
    - Paint: body, bands, fins, stripe.
    - Accessories (fictional): tail fins, body stripe, camera pod, a made-up team flag. They're drawn on the rocket in the hall and at launch.
    - Upgrades: points shown in the title; 3 new ones (heat shield, solar panels, comms antenna).
    - Mission name & patch: shown at launch, in the player and on the results card.
  - **Launch:** only three objectives and a centred Launch button. Objectives are launch, reach, and one main activity.
- Tested in the browser:
  - Rover path: Atlas V 541 → sky crane + Curiosity → Mars → Gale (real) → Workshop (fins and stripe) → Launch. Settings checked; the replay starts with the name, and the stripe shows at liftoff.
  - Crewed path: Saturn V → Apollo → Suit (tools list) → Moon → Hadley (real, A7-L).
  - Voyager's replay shows NASA's model with its label; 17 Missions cards have NASA labels.
  - Phone width, with no sideways scrolling; no console errors.
- Not verified: frame rate with several NASA models on a real GPU; every craft's NASA model in every scene (Voyager was watched); the exploration site with a non-matching suit.

## Completed (2026-11-14): Kampu Space Master Doc (13)
- **Missions sidebar is one panel**: the Real Missions card on top, with All missions and All hardware joined to it by a rail, so they read as one thing. The whole sidebar scrolls, so "Switch to Free Build" always comes after everything, even with a list open. In the slim strip, the Real Missions card now fits its box.
- **New icon set (15 icons)** in the site's thin-line style, each showing what it is: an Earth with an orbit, a crescent Moon, Mars, the Sun, a ringed planet, an asteroid; a rocket, a satellite (spacecraft), a telescope, a rover, an instrument trace, a station and a capsule.
- **Every list shows exactly its own items**:
  - "All missions" now clears the hardware type. Before, after choosing "Return Capsules" it still showed only 5.
  - "All hardware" clears the destination and lists all 64 pieces, rockets included. Before, it showed 46, or only 4 after choosing a destination.
- **Switch buttons** are small, quiet pills on both pages.
- **Builder zoom**: + and − are drawn as icons, exactly centred in their squares.
- **Mission player**
  - Pause stops everything, the narrator included, along with the title card. Play says the interrupted sentence again and carries on. (This changes the Doc 9 behaviour, where the narrator kept talking.)
  - Replays of real missions show "★ Real mission · Gemini III, 1965." The "Possible: it really flew" verdict and the reach meter are predictions, so they appear only in Free Build.
  - The stages box is exactly as wide as the mission map.
  - The launch-site and landing-site cards sit above the subtitle, with room kept for a two-line subtitle.
- **Bug fix: named asteroids are no longer drawn as Bennu.**
  - Any "deep space" event naming Vesta, Ceres, Eros or Mathilde now gets that body, both in the film and on the mission map. Before, every asteroid became Bennu, which broke the Dawn and NEAR Shoemaker replays (NLC-2, since reverted).
  - Each body has an illustrative painted look based on mission pictures:
    - Vesta: grey and battered.
    - Ceres: round and dark, with a bright spot at Occator.
    - Eros: long and tan.
    - Mathilde: nearly black.
  - An Earth "swingby" is now shown as a fly-past, not as "In orbit".
  - Tested with the Dawn/NEAR data loaded into the page for the test only: every scene has the right world, and the map reads Earth → Mars → Vesta → Ceres. Every existing replay plan still builds, and OSIRIS-REx still goes to Bennu.
- Tested in the browser:
  - every sidebar list's count against what it shows (all 15 match);
  - the slim strip;
  - phone width;
  - builder zoom centring (measured 0 px off);
  - the Gemini III replay: badge, pause/play of the voice, stages width (764–994 px, the same as the map) and site card above the subtitle;
  - no console errors.

## Completed (2026-11-14): Kampu Space Master Doc (12)
- **Two modes, clearly split** (replaces Doc 11's split)
  - **Real Missions** = the Missions page: the "Real Missions" mode card on top, then All missions / All hardware, then a "Switch to Free Build →" button. Every item keeps its "Replay mission".
  - **Free Build** = the builder (Simulator tab): only the Free Build card and a "Switch to Real Missions →" button. The wordy switch card is gone.
- **One building**: the domed Free Build lab is no longer used. Its stations stand in the assembly hall as two marked work areas at the front corners, ENGINEERING (workbenches and computers) and FABRICATION (3D printer and robot cell). The camera can't zoom out past the walls.
- **Mission player**
  - The stages list is a compact card under the mission map, the same width as the briefing. It used to stretch down the right side.
  - Every replay has a mission map: missions that stay near Earth (for example Gemini III) show an orbit around Earth.
  - The "Real landing site" card sits just above the scene bar instead of behind it.
  - The narrator reads the next scene's line while its title card shows, and doesn't repeat it when the scene starts. The title card sits higher, above the spacecraft.
- **Site globes**: choosing a flyby or orbit now turns the camera to that path and backs out so it can be seen. Before, the view didn't change. Landing and impact sites still fly in close. Tested on the Moon: landing → flyby → orbit → impact.
- Tested: desktop journeys (globe clicks, Missions ↔ Free Build, builder zoom and rotation, Gemini III and Surveyor 1 replays), a 375px phone view of the player, and no console errors.

## Completed (2026-11-14): Kampu Space Master Doc (11)
- **Missions vs Simulator: one builder, two clear sections**
  - **Missions** = what really happened: browse, replay, and a new "Rebuild a real mission" (top of the Missions list). It opens the builder in Real Missions mode, titled "Rebuild a Real Mission", with the Missions tab lit.
  - **Simulator** = your own designs: the builder in Free Build only, titled "Free Build Simulator".
  - Each shows only its own mode, plus a link to the other section. The help text and the exploration note explain the split.
- **Moon and Mars landing terrain is generated, not blurred**
  - The landing view builds about 2.6 km of detailed ground: the nearest tiles at once, the rest a few per frame during the descent, coarser farther out.
  - The far ground now has the same seeded craters as the detailed ground and reaches 24 km, curving with the planet to a real horizon. It used to be a 600 m patch inside smooth, blurred hills.
  - Exploration's far ground also gets the craters.
- **Every mission has a replay**, and "Watch the landing" is merged into it.
  - Every one of the 64 Missions items has "Replay mission": its own journey; or its landing replay (arrival, landing, what happened next); or its mission's replay; or, for a rocket, a real mission it launched.
  - The globe panels already used the single Replay Mission (Doc 10).

## Completed (2026-11-14): Kampu Space Master Doc (10)
- **Sharper planet maps**
  - Mars, Jupiter and Saturn at 4096 px (Solar System Scope, CC BY 4.0), loaded after the 2K maps (not on phones).
  - Titan uses Cassini's real global mosaic (NASA PIA22770, public domain, tinted orange for display) instead of a drawn illustration.
  - Gas giants and hazy worlds get darker edges (limb darkening).
- **Site globes ("Explore")**
  - The planet turns slowly; × closes the panel and resets the view.
  - "Open in Missions" and "All hardware from this world" are now "Go back" (to the Solar System).
  - The list collapses to a slim strip, like the other pages.
- **Every mission linked to a world is shown**
  - Flybys and orbiters (`data/world-visits.js`, facts from the catalog and its sources) are drawn as labelled paths (not to scale), listed under "Flybys and orbits", with a panel (date, closest approach, Replay Mission).
  - Jupiter shows all 7 missions.
  - Neptune shows Voyager 2, and New Horizons marked "Did not visit": it is linked in the catalog, but only Voyager 2 has visited Neptune.
- **Replay Mission** replaces "Watch the landing/descent". Sites with a full journey use it (it includes the landing). The others get a short replay: arrival, the landing, then "What happened next" (the real status and findings).
- **Landing scene**
  - The ground continues to a curved horizon (no square in space).
  - Giant planets: seamless, curved cloud decks over the real cloud-band maps, with Saturn's rings arching beyond.
  - The camera catches up faster, so the spacecraft stays in view.
  - Controls: Go back, a replay icon, Pause hidden after the end, and a "What happened next" list.
  - The site card has more spacing.
- **Missions list:** an icon for each choice, with more room in the slim strip.

## Completed (2026-11-14): Kampu Space Master Doc (9)
- **Missions sidebar**
  - The slim strip shows only "All missions" and "All hardware". Clicking one shows its smaller choices; clicking again hides them.
  - The full-screen detail page keeps the left list, like the main Missions screen.
- **Mission Builder:** + and − zoom buttons over the 3D view. Zooming all the way out shows the whole building from above, as a cut-away (the roof and the wall columns hide while outside).
- **Narrator**
  - The next scene waits until the narrator has finished. Before, it moved on after 14 s, and the launch forced it on at once.
  - The narrator speaks at every speed.
  - Pause stops only the scene: the narrator and subtitles carry on, and the engine and rumble sounds go silent.
- **"Leaving Earth" shot:** longer (22 s), a slow and steady fly-in, higher above Earth, the horizon barely rolling. The departure shot's swing round is slower too.
- **Player layout**
  - The briefing appears once the replay is on screen.
  - The mission map sits under "Exit replay".
  - The launch-site card and the stage list end just above the scene bar, measured on screen, so they fit when the controls wrap.
  - The stage list fills the right side.
  - The briefing's scroll bar matches the theme.
  - At "Mission complete" the briefing and map are hidden, and the card shows a real NASA photo of the mission (`data/mission-photos.js`, loaded from NASA).
- **Launch**
  - Assembly building modelled on photos of the VAB: panelled high bay with dark bands, high-bay doors, a low-bay wing, a launch control building and the US flag (no logos).
  - Crawler-transporter: twin tread belts on four trucks, levelling cylinders, a truss deck with railings, operator cabs, and the mobile launcher on pedestals.
  - Rail launch platform and transporter-erector also rebuilt with more detail.
  - The climb looks like space: a black sky with a blue glow over a curved horizon, stars come out earlier, thicker clouds on Earth, and the low cloud deck fades early (it looked like sea fog).

## Completed (2026-11-14): Kampu Space Master Doc (8)
- **Builder halls tidied.** The equipment now stands in labelled work areas (floor lines, a floor label and a wall sign each), and nothing is left lying around the rocket.
  - Real Missions:
    - Stage Processing (left): spare stages and engines.
    - Test & Checkout (right): desks, tool chests and supplies.
    - Parking bays (back): vehicles, stairs and scaffold.
    - Front: the three NASA photos and the Agena exhibit.
    - The repeated mission plaques and the banner were removed.
  - Free Build lab: eight evenly spaced, numbered bays around the dome.
  - The hall is smaller, and the camera still stays inside.
- **Stage separation in flight** (inspired by how flight-simulator games show staging):
  - The real order: engines off, a short coast, the stages part, ullage puffs, then upper-stage ignition. (Before, the upper engine lit before the separation.)
  - The spent stage drifts away slowly while the camera holds on both pieces.
  - A Stages list shows each part as Engines firing, Waiting, Attached, Engines off or Separated.
- **Scene cards no longer freeze the picture.** The "Scene N of M" card shows over the live scene.
  - The launch keeps going (Earth turns, the camera circles slowly).
  - Space and landing shots drift gently after they end.
  - Only one scene renders at a time: the old one stops when the next starts.
- **Narrator**
  - Pause stops the voice and Play says the same sentence again, with its subtitle.
  - Speed changes never cut the voice, and the story waits for the narrator at every speed.
  - Speeds are now 0.5×, 1× and 2× (keys 0, 1 and 2).
- **Same model from launch to landing**
  - Descent, landing and exploration use the project's own models (the NASA Lunar Module swap in the landing scene was removed: it sank into the ground and had no textures).
  - The descent shot shows the lander undocking from the mission's own spacecraft (Dragon in a Dragon Free Build, not the Apollo CSM), with a clear gap and no overlap.
  - Free Build Mars landings arrive in an entry capsule, like the real missions' scenes.
- **Missions page**
  - Cards show the official NASA model when there is one, matching the 3D viewer they open.
  - A clicked item opens full screen (model left, facts right). Back returns to the list as it was.
  - The left list collapses to a slim strip, like the Solar System's.

## Completed (2026-11-14): Kampu Space Master Doc (7)
- **Two separate builder buildings.**
  - Real Missions: the rectangular assembly hall, now with a forklift, a tow tractor with carts, rolling stairs, an engineers' desk row, pallets, tool chests and safety barriers.
  - On its walls:
    - A "Missions that really flew" wall with the three NASA photos (credits under each).
    - An achievement plaque for every real mission in the project (name and year from `data/simulator.js`).
  - Free Build: a new round, domed engineering lab, with:
    - a ring wall and a ribbed dome with an open top (oculus)
    - ring catwalks, a polar crane and a round door
    - a turntable pad
    - workbenches with screens, server racks, a holo table, drones, a tool wall, crates and charging pods
- **Agena Target Vehicle exhibit** in the Real Missions hall. It is NASA's official 3D model, loaded from NASA 3D Resources. The plaque fact comes from NASA's Gemini VIII page. It is labelled "shown enlarged", and the credits and `docs/ASSETS.md` are updated.
- **Briefing redesign**
  - Clear From / To / Journey rows with more spacing.
  - An amber "!" instead of a big red X.
  - A reach meter (how far this rocket really went compared with where this trip goes).
  - "Show more" is a short labelled bullet list, and rockets are shown by name, never by their key.
- **Launch**
  - Natural Florida light. The leftover cloud layer that caused the white haze is fixed.
  - Each rocket uses its real pad (LC-39A/B, SLC-41, SLC-37B, SLC-40, Kourou ELA-3, Baikonur Site 81), with a launch-site card and map in `data/launch-sites.js`.
- **Subtitles** now show exactly the sentence the narrator is saying.
- **Free Build landings**: a descent-from-orbit shot, then a powered landing scene, before exploring (Moon and Mars).
- **Exploration HUD** chips have more space.
- **Results**: "New mission" removed. "My Collection" opens picture tiles of what you recorded at that site, with a link to the full Collection.
- **Splashdown**
  - Dragon is upright without its trunk.
  - Released parachutes fall and lie flat on the water.
  - The recovery ships are ship-shaped: a carrier (Apollo/Gemini), a dock ship (Orion) and a recovery vessel (Dragon), shown side-on.

## How it was tested
- Local server at `http://localhost:8000`, in the Claude desktop browser pane.
- The pane was usually hidden, which stops `requestAnimationFrame`. Animations were driven by a timer shim injected into the page **for testing only** (not part of the site).
- Measurements were taken by script, and screenshots were taken when frames could be drawn.
- Journey: welcome → Begin → every top-level screen → build a mission → launch → next scene → exit → explore a site.
- All 20 rockets were run through the launch scene. All 12 mission replays ran.
- No console errors and no failed network requests.

## Current issues
- `js/results.js` imports `saveMissionRecord`, which `js/progress.js` does not export, so the module cannot load. Nothing imports it (the results panel lives in `main.js`), so the site is unaffected. This was already the case before Doc (7). It can be deleted or fixed later (ask first).
- The builder equipment is drawn larger than real life, scaled with the hall, so it can be seen in a hall built to hold a 110 m rocket.
- NASA models appear only on the Missions page (cards, 3D viewer) and in the Agena exhibit; the mission scenes use the project's own models so one spacecraft looks the same throughout (team decision, Master Doc 8).
- `space-film.js` (the space shots after launch) draws the departure-burn plume as a large flat orange blob. A real vacuum burn plume is faint. Not changed in this pass.
- The launch Earth is still a little soft at low altitude (now a 4096px map; a real photo map can't be sharper than that that close).
- Real-GPU frame rate was not measured here. Shadows (2048px) and up to 1200 smoke sprites are the main costs, so please check on the oldest computer you'll present on.
- `node --check` can't run (Node isn't installed). Every changed module was loaded and run in the browser instead.
- At 320px wide the top bar wraps to three rows (128px). Nothing is cut off.

## Next steps
- Make the space-film burn plume realistic (fainter, bluish, short).
- Make tap targets at least 44px on the Missions screen (51 smaller ones at phone width).
- Download the Earth textures into `assets/` so the site works offline (check licenses first).
- Add a visible "Confirmed / Uncertain / Illustrative" badge on models and trajectories.
