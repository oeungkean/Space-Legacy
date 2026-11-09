# Space Legacy — Claude Code Project Guide

## Project goal
Build and improve Space Legacy, an educational interactive web experience about NASA and other real space-exploration missions, spacecraft, and equipment left on the Moon or Mars. The project is for a student NASA Space Apps Challenge team. Keep the experience understandable, scientifically responsible, and achievable.

## Before changing code
- Read `docs/REDESIGN.md`, `docs/ARCHITECTURE.md`, `docs/RESEARCH.md`, and `docs/ASSETS.md` before major changes.
- Treat the existing project as the source of truth. Do not replace it with a new framework or rewrite the whole site unless explicitly requested.
- Start substantial tasks in Plan Mode. First inspect the relevant files, explain the proposed changes, identify risks, and wait for approval before editing.
- Work in small, reviewable steps. Do not make unrelated visual or architectural changes.
- Ask before deleting, renaming, or moving existing files or removing features.
- Never claim a feature works unless you have run it and verified it.

## Technical constraints
- This is a vanilla HTML/CSS/JavaScript project using ES modules and Three.js through the import map in `index.html`.
- There is currently no build system and no package manager setup. Do not add React, Vue, TypeScript, Vite, or other dependencies unless the user approves a migration and there is a clear reason.
- Serve the project over a local HTTP server; do not open `index.html` directly with `file://`, because browser ES modules and asset loading need HTTP.
- Keep paths relative to the project root and preserve the current directory structure:
  - `index.html`
  - `css/`
  - `js/`
  - `data/`
  - `assets/`
  - `docs/`
- Three.js and fonts are loaded from external CDNs. Explain when a test needs internet access.
- Preserve graceful fallbacks when optional textures or external resources fail.

## Quality and research rules
- This is an educational NASA/space-history project. Do not invent mission facts, dates, spacecraft capabilities, locations, or operational status.
- Prefer NASA, JPL, ESA, and other primary mission sources. Add source URLs beside factual data in the relevant data files.
- Clearly distinguish confirmed facts, uncertain status, and simplified/illustrative simulation behavior.
- 3D models and trajectories are educational approximations unless explicitly sourced as official models/data. Keep that disclosure visible.
- Preserve image credits and license attributions. Check licenses before adding assets; never assume an image is free to use.
- Do not remove citations, source links, credits, accessibility labels, keyboard support, or reduced-motion/performance safeguards.

## UI and implementation quality
- Maintain the established visual system and responsive layout.
- Make interactions usable with mouse, keyboard, and touch where appropriate.
- Include loading, empty, error, and fallback states for asynchronous resources.
- Avoid unnecessary dependencies and large assets. Optimize texture sizes and avoid duplicate render loops.
- Keep data separate from presentation where the current architecture already does so.
- Prefer focused functions and consistent naming over large monolithic additions.

## Verification after every meaningful change
1. Run `node --check` on every JavaScript file that was changed.
2. Start a local server (for example `py -m http.server 8000`) and test in Chrome/Edge at `http://localhost:8000`.
3. Check the browser console and network panel for errors, missing files, failed imports, and texture failures.
4. Test the affected user journey from the welcome screen through the relevant interaction, not just whether the page loads.
5. Check desktop and a narrow/mobile viewport.
6. Report exactly what was changed, files touched, tests run, results, and anything not verified.

## Working style for this student
- Explain technical decisions in plain English and define unfamiliar terms.
- Before a large implementation, show a short plan and ask for approval.
- Do not overwhelm the user with many tools or plugins. Recommend an extension/plugin only when it solves a concrete need.
- Keep a short `docs/PROGRESS.md` with completed work, current issues, and next steps when a multi-session task begins.
