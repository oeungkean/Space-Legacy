# Progress

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

## How it was tested
- Local server at `http://localhost:8000`, in the Claude desktop browser pane.
- The pane was usually hidden, which stops `requestAnimationFrame`. Animations were driven by a timer shim injected into the page **for testing only** (not part of the site).
- Measurements were taken by script, and screenshots were taken when frames could be drawn.
- Journey: welcome → Begin → every top-level screen → build a mission → launch → next scene → exit → explore a site.
- All 20 rockets were run through the launch scene. All 12 mission replays ran.
- No console errors and no failed network requests.

## Current issues
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
