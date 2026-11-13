# Space Legacy — v11 redesign

This document records the audit, the new information architecture, the design direction and what changed in each phase.
The stack is unchanged: vanilla ES modules, three.js r160 from an import map, no build step.

## 1. Audit (before)

| Screen | What was there | Problems |
|---|---|---|
| Home | Title, tagline, **three** buttons (Begin, Missions & Hardware, Simulator), a 9-planet picker that also changed the site's colours, a UTC clock | Three competing calls to action; the picker repeated the planet list and changed the whole colour scheme, so the style was never consistent; the clock defaulted to UTC with a hard-coded zone list |
| Solar System | Numbered left list (01–19: star, planets, moons, spacecraft, regions); one long right panel (summary, facts, note, sources, related hardware, three buttons) | Numbers carried no meaning; moons were separated from their planet; the right panel mixed overview, data, links and actions in one scroll |
| Explorer | A "Missions / Hardware" switch showing two views of the **same** 64 cards, numbered category list, destination drop-down | Duplication (two views, a destination list in the drop-down and in the Solar System regions); no link between a mission and the hardware it used except text |
| Simulator | Engineering Bay with 5 numbered tabs, Suit Locker, Explore a site | No first-time guidance; the optional Workshop looked like a required step; nothing explained how to speed up a long flight |
| Mission player | Previous / Pause / Next / Narration / Captions | No speed control (only skipping) |
| Credits | Six prose cards | Sources, uses and licences mixed in sentences; old fonts listed |

**Merged or removed:** planet picker and per-planet themes (one palette now), the Missions/Hardware switch (one missions-first page), the destination drop-down (now the sidebar's "Where they went"), the time-zone picker (the browser's own zone is used), two of the three home buttons, the "Category" fact that repeated the card header.

## 2. Information architecture (after)

```
Home ── one CTA: "Enter the Solar System"
│
├─ EXPLORE
│   ├─ Solar System   left: navigation only (Star · Planets & moons, moons nested · Spacecraft · Regions)
│   │                 right: the selected world → Overview | Data | Moons | Missions (+ Explore / Replay)
│   │                 bottom: view controls (labels, orbits, shadows, motion, speed), zoom
│   └─ Missions       left: Where they went (6 destinations) · What it is (7 hardware types)
│                     main: each mission (year, destination, launch vehicle link, Replay) with its hardware cards
│                     detail: 3D model, role on the mission, specs, timeline, sources
├─ EXPERIENCE
│   ├─ Simulator      Fly a mission (Engineering Bay: Rocket → Spacecraft → Destination → Launch, Workshop optional)
│   │                 Be an astronaut (Suit Locker, Explore a site)
│   └─ Collection
└─ ABOUT
    └─ Credits        Images & textures · Mission data · 3D models · Software · Fonts
```

Where each piece of information lives (once):

- **Facts about a world** → Solar System panel, Data tab.
- **Facts about a piece of hardware** → its Missions detail page. Other places only link to it.
- **Which hardware flew on which mission** → `data/mission-groups.js` (each catalog item in exactly one mission; rockets are linked, not copied).
- **Sources and licences for the site itself** → Credits.

## 3. Design direction

- **Mood:** a scientific instrument panel at night — deep navy/black, cool white text, one restrained accent.
- **Palette (CSS variables in `css/style.css`):** `--bg #04060c`, `--bg-navy #081022`, panels as translucent navy with subtle vertical gradients, text `#e9eef7` / muted `#a3adbf` / faint `#6b7487`, **accent ion blue `#7ab8ff`** (hover `#9ccbff`). Warm orange is kept only for engines, heat and warnings inside 3D scenes.
- **Type:**
  - **Sora** (titles): geometric and technical, but with open, friendly shapes, so it feels engineered without looking robotic.
  - **IBM Plex Sans** (body): designed for clarity in technical documentation; it has a research-lab character.
  - **IBM Plex Mono** (data, clocks, telemetry): the same family as the body, so numbers and labels match.
  - None of these are NASA's fonts.
- **Navigation:** grouped top tabs with line icons, a glowing "you are here" underline, and sidebars without numbers. Each world's dot is drawn as a tiny lit sphere in that world's colour, with an accent bar on the active row.

### Slogan options

1. **"Every mission leaves a legacy. Follow it."** ← used. It ties the product name to the action (following missions) and invites the visitor in.
2. "From the launch pad to the edge of the Solar System."
3. "Where every orbit tells a story."

## 4. Phases: what changed and how to check it

1. **Visual identity and navigation**
   - New fonts, palette and one fixed theme (`js/theme.js`).
   - Grouped tabs with icons on every screen; "Explorer" is renamed "Missions".
   - *Check:* every top bar shows Explore | Experience | About groups, and the active tab glows.
2. **Homepage**
   - One CTA, the new slogan and a two-line intro.
   - `js/earth-scene.js` is now a continuous camera tour along one closed spline: Earth → Mars → Jupiter → Saturn → Uranus → Neptune → Mercury → Venus → Earth. It slows near each planet, never stops, and the view turns smoothly from one planet to the next.
   - The clock uses `Intl.DateTimeFormat` with no `timeZone`, so it shows the browser's zone and updates every second.
   - *Check:* wait about 15 seconds on the home page; "Now passing" changes and there are no cuts. The clock matches your computer's clock.
3. **Solar System**
   - Physically based materials from `js/planet-look.js`. Earth has its normal map, an ocean-shine map, clouds and atmosphere.
   - ACES tone mapping and a much lower ambient light, so the night sides are dark.
   - Saturn's rings are lit and show the Cassini Division.
   - The world panel has tabs; moons are nested under their planet in the list.
   - *Check:* click Saturn: Overview / Data / Moons / Missions tabs, and Titan appears under Saturn.
4. **Missions & Hardware**
   - One page of 29 missions, each showing its hardware with its role (Lander, Rover, Instrument…).
   - Launch vehicles are a link in each mission header and are listed on their own under "Launch vehicles".
   - *Check:* Missions → "Mars" shows 7 missions; open a card, and "Role" says what it did on which mission.
5. **Simulation**
   - A first-visit "Start here" card in the Engineering Bay.
   - Connected steps 1–4, with the Workshop marked optional.
   - Sidebar grouped by intent ("Fly a mission" / "Be an astronaut").
   - **Speed 1× / 2× / 4× / Skip** in the mission player, for launch, journey and landing (keys 1, 2, 4 and →). It always starts at 1×, and at 2×/4× the captions carry the story.
   - *Check:* Simulator → Got it → build → Launch, then press 4×.
6. **Credits**
   - Grouped tables (source, link, used for, licence) with quick links to each group.

## 5. Honest limits — what you must supply

- **Planet texture maps are not in the zip.**
  - Download them from Solar System Scope (CC BY 4.0) and put them in `assets/textures/`. The filenames are listed in `docs/ASSETS.md`.
  - Without them, the planets use seamless painted stand-ins, which look good but are not photographic.
- **Earth and Moon maps load from the jsDelivr CDN.** Offline, Earth uses the painted stand-in.
- **Fonts load from Google Fonts.** Offline, system fonts are used.
- **3D hardware models are built in code.** Official NASA glTF models could be added with three.js `GLTFLoader` (no build step needed), but the `.glb` files would have to be downloaded and checked for licence by you.
- **Smoothness was checked in a software renderer** (about 1 frame per second), so frame rate on real GPUs was not measured. The motion maths is continuous by design (no velocity jumps), but please confirm on your own machine.

---

# Round 2 (v12)

## Audit: what changed and why

| Area | Before (v11) | Problem | Now |
|---|---|---|---|
| Home | Slogan, a two-line intro, the button and a hint | Crowded | **"From launch to legacy."**, then the button and one small line. The Earth and the title are the focus. |
| Transitions | Instant swap (0.6 s fade, sometimes through black) | Screens felt disconnected | One system for every screen. The old screen stays underneath while the new one eases in over **1.1 s** (`--ease-journey`). Its interface then arrives with a short stagger. Follows `prefers-reduced-motion` and Settings › Reduce motion. |
| Start animation | The old launch cinematic (walk-out, cabin) | Poor flow and captions | **One continuous camera move**: from Earth's day side, up through orbit (the Moon in view), out to the whole Solar System. The home camera pulls back while the Solar System dissolves in. Adds a Sun lens flare, atmosphere glow and sharper painted Earth maps. Subtitles are small, low and one short line at a time. **Skip** and **CC** are always visible; CC is remembered. |
| Solar System | Groups: Star, Planets & moons (nested), Spacecraft, Regions | Regions didn't belong; text buttons in the dock | Groups: **Star, Planets, Moons, Spacecraft**. The dock buttons now have **icons, short labels and tooltips** in the same line style as the top tabs. |
| Missions | Search box plus status and sort drop-downs | Three controls for one job | **One search field** (icon, suggestions as you type, keyboard ↑ ↓ Enter Esc) and **quick-topic chips**. Results appear as one list **grouped by status, oldest first**. Detail pages have a **Back button and breadcrumbs**. The list keeps its search and scroll position, and the browser's Back works. |
| Simulator | Engineering Bay, Suit Locker and Explore a site as separate pages; "Historical / Sandbox" | Hard to follow; unclear names | **One Mission Builder**: Rocket → Spacecraft → **Suit** → Destination → Launch, with a progress bar and "Step N of 5". The Workshop is optional. **Real Missions / Free Build** cards each have one line and a small picture. Suits are kept apart from machines: surface vehicles sit with the spacecraft, and hand tools sit with the suits. "Go straight to the surface" sits in the Destination step. |
| Narrator | One voice, changed only in Settings | Hard to find | A **voice picker next to Narration** with a preview. Voices are ranked natural (neural) → enhanced → standard, and the choice is remembered. It says plainly when the browser offers only a few voices. |
| Descent + Landing | Two chapters, with a cut between them | Felt broken; blurry | **One "Descent & Landing" chapter**: the approach flows into the touchdown scene. Renders at the device pixel ratio (up to 2.5×), with ACES tone mapping, a 1024 px ground texture at maximum anisotropic filtering, lighter Mars haze and a steadier camera. 1× / 2× / 4× / Skip still work. |

## How to check each step

1. **Transitions:** click between the top tabs. The old page should stay visible while the new one eases in, and nothing should go black.
2. **Start animation:** press *Enter the Solar System*. You should see one move: Earth → orbit → the whole system. Press CC to hide the subtitles and Skip to finish quickly.
3. **Solar System:** the left list has four groups, and the dock shows icons with labels.
4. **Missions:**
   - Type "apol" and suggestions appear; tap a chip such as *Mars*.
   - Open a result, then press Back (on the page or in the browser). You return to the same results at the same scroll position.
5. **Simulator:**
   - Build a mission through the five steps and watch the progress bar.
   - Replay Curiosity and watch *Descent & Landing* at 4×.
   - Pick a narrator voice and press ▶ to hear it.

## Honest limits

- **Natural voices** depend on the browser.
  - Microsoft Edge on Windows and macOS has neural "Natural" voices.
  - Chrome has "Google" voices.
  - Firefox and Linux browsers often have only robotic ones.
  - Nothing in the code can add voices. The picker says when the choice is small.
- **Sharp planet surfaces** need the texture files listed in `docs/ASSETS.md`. Without them, painted stand-ins are used (Earth's are now 1024 px).
- **Engine plumes, parachutes and dust** are the existing particle effects with steadier camera work. Photographic plumes would need video or volumetric rendering, which is beyond a no-build Three.js site.
- **Mode names "Real Missions" / "Free Build"** were the suggestion in the brief. If you want different names, they appear in `index.html` (the mode cards) and in a few lines of text in `js/simulator.js`.

---

# Round 3 (v13): design and realism pass

| Area | Problem found (cause) | Now |
|---|---|---|
| Mission Builder bay | Models are not built with their origin at their base, but `fill()` placed every model at y = 0. Spacecraft sank 49–77% into the floor and rocket nozzles 2–5%. The launch platform sat entirely under the floor. | Each object is placed from its measured bounding box onto the platform deck. The platform stands on the floor. The work rings follow the rocket. |
| Status colours | Amber, a blue→yellow gradient and blue all meant "done" or "in progress" in different places. There was no failed state. | `--st-done / --st-active / --st-pending / --st-failed` tokens, each paired with a shape (✓, ring, slate, ✕). |
| Opening screen | 59px logo, 9–14px gaps, rules redefined in several layers | One consolidated block: a 96–128px logo on a 28/16/40/18px spacing scale |
| Mission Builder look | Ordinary panels in a separate amber theme | A planning console: a 4-slot manifest (keyboard-accessible), a monitor frame, a "Telemetry" readout, "✓ Selected" chips, the one accent colour |
| Launch | Engines buried inside the pad (no visible fire). Emission counted per frame (varied with screen refresh rate). A full particle pool dropped fire. No tone mapping, reflections or shadows. Jittery random shake. Hard-edged clouds. Painted placeholder Earth over the North Pole. | Hold-down mount sized per rocket; per-second emission; a bigger pool that reuses the oldest smoke first; ACES tone mapping, reflections and sun shadows; smooth shake; soft clouds; the real Earth turned so Kennedy Space Center is below the launch |
| Solar System panels | The mission progress panel covered the planet panel | The mission panel sits bottom-left on that screen |

Details, tests and known limits are in `docs/PROGRESS.md`.
