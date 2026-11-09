# Space Legacy — Claude Code workspace

This is the cleaned working copy prepared from the two ZIP files supplied for review.

## Which version was used?
- Application code, CSS, HTML, data, and project documentation come from `SpaceLegacy-complete-v12.zip`.
- The `assets/` folder (planet textures and hardware images) comes from `Kampu Space.zip`, because the v12 archive referenced these files but did not include them.
- The older nested backup copy and duplicate `data/` project inside `Kampu Space.zip` were intentionally not copied.

## Run locally on Windows
1. Extract this ZIP.
2. Open the extracted `SpaceLegacy` folder in Claude Desktop's **Code** tab (or VS Code).
3. Open a terminal in that folder and run:

   ```powershell
   py -m http.server 8000
   ```

4. Open `http://localhost:8000` in Chrome or Edge.
5. Stop the server with `Ctrl+C`.

Do not double-click `index.html` to run the site; use a local HTTP server.

## Important
- This project currently uses vanilla JavaScript ES modules and Three.js via an import map. It does not need `npm install` to run in its current form.
- An internet connection is needed for the Three.js CDN, Google Fonts, and some remote textures.
- Read `CLAUDE.md` before making changes.
- Read `docs/REDESIGN.md`, `docs/ARCHITECTURE.md`, `docs/RESEARCH.md`, and `docs/ASSETS.md` for project intent and constraints.

## Suggested first task for Claude Code
Ask Claude to inspect the entire project and produce a prioritized audit without editing files. Then review the audit and approve one improvement at a time.
