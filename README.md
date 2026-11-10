# Space Legacy

An interactive 3D tour of space exploration: a live solar system, mission replays,
a hardware catalog, and a mission simulator with surface exploration.

Built with plain ES modules and [Three.js](https://threejs.org/). There is no build
step and no install step for the site itself.

## Run it

The site uses ES modules and an import map, so browsers will not open it from
`file://`. Serve the folder over HTTP:

```sh
node scripts/serve.mjs        # http://localhost:5173
```

or with any other static server, for example:

```sh
python -m http.server 5173
npx serve .
```

Then open `http://localhost:5173`.

Requirements:

- A modern browser with WebGL 2 (Chrome, Edge, Firefox, Safari).
- Node.js 20 or newer is only needed for the helper scripts and tests. The site
  itself is static.

## Checks and tests

Everything uses Node's built-ins, so there is nothing to install:

```sh
npm run check   # syntax-check every .js/.mjs file
npm test        # run the node:test suites
```

Both commands also work without npm:

```sh
node scripts/check.mjs
node --test
```

## Project layout

| Path | What it contains |
|---|---|
| `index.html` | Every screen's markup and the import map |
| `css/style.css` | The design system and all screen styles |
| `js/` | Screen controllers and 3D scene code |
| `data/` | Plain data: planets, missions, hardware, simulator rules |
| `assets/` | Local textures and hardware photographs |
| `docs/` | Architecture notes, research, redesign notes |
| `scripts/` | Zero-dependency dev server and syntax checker |
| `tests/` | `node:test` suites for the pure data and planning modules |

Data is kept separate from the UI. To add a catalog item, edit
`data/catalog.js`; the Explorer reads it without code changes. See the header of
that file for the field list, and `docs/ARCHITECTURE.md` for how the screens and
replay system fit together.

## Offline and third-party content

- Three.js loads from jsDelivr via the import map in `index.html`.
- Fonts load from Google Fonts.
- Planet textures try a local file in `assets/textures/` first and fall back to
  the Three.js CDN copies, or to painted stand-ins.
- If those hosts are blocked, the site will not start. Vendoring Three.js and the
  fonts locally would make it fully offline.

## Notes and limitations

- All 3D models are representative, built in code, and are not official NASA
  models. Paths, sizes and distances are illustrative, not to scale.
- The collection is a virtual educational archive. Recording an object never
  moves the real object.
- Progress and settings are stored in `localStorage` for this browser only.

## Possible future work

- Consolidate the separate WebGL contexts (one renderer per canvas) or create
  them lazily, to reduce GPU memory and avoid context limits on mobile.
- Re-encode the large JPG textures as WebP/AVIF and load them per planet.
- Code-split screens with dynamic `import()` to shorten first load.
- Split the largest modules (`solar-system.js`, `exploration.js`, `models.js`,
  `style.css`) into smaller, focused files.
- Add JSDoc types or migrate to TypeScript.
