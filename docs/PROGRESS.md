# Progress

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
- The launch Earth is soft at low altitude: a 2048px world map is magnified a lot that close.
- Real-GPU frame rate was not measured here. Shadows (2048px) and up to 1200 smoke sprites are the main costs, so please check on the oldest computer you'll present on.
- `node --check` can't run (Node isn't installed). Every changed module was loaded and run in the browser instead.
- At 320px wide the top bar wraps to three rows (128px). Nothing is cut off.

## Next steps
- Make the space-film burn plume realistic (fainter, bluish, short).
- Make tap targets at least 44px on the Missions screen (51 smaller ones at phone width).
- Download the Earth textures into `assets/` so the site works offline (check licenses first).
- Add a visible "Confirmed / Uncertain / Illustrative" badge on models and trajectories.
