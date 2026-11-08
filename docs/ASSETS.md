# Assets you can add

Space Legacy runs without any of these files. Each one makes something look more realistic.

## Planet textures (recommended)

Source: Solar System Scope, https://www.solarsystemscope.com/textures/
License: CC BY 4.0. Credit "Solar System Scope". This credit is already on the Credits page.

Download the 2K versions (8K also works, but loads slower). Rename them to these filenames and put them in `assets/textures/`, next to `index.html`:

| File | Solar System Scope map |
|---|---|
| `mercury.jpg` | Mercury |
| `venus_atmosphere.jpg` | Venus Atmosphere (cloud tops, as seen from space) |
| `venus.jpg` | Venus Surface (optional; used if the atmosphere map is missing) |
| `mars.jpg` | Mars |
| `jupiter.jpg` | Jupiter |
| `saturn.jpg` | Saturn |
| `saturn_ring.png` | Saturn Ring Alpha (PNG with transparency) |
| `uranus.jpg` | Uranus |
| `neptune.jpg` | Neptune |
| `moon.jpg` | Moon (optional; the CDN copy is used first) |
| `sun.jpg` | Sun |

Earth's day map, normal map, specular (ocean-shine) map and clouds load from the three.js examples on jsDelivr. You do not need to add them.

## Optional: official 3D models

The hardware models are built in code (`js/models.js`, `js/rockets.js`). To use official NASA glTF models instead:

1. Download the `.glb` files from NASA's 3D resources (https://science.nasa.gov/3d-resources/) and check each file's terms.
2. Put the files in `assets/models/`.
3. Load them with `GLTFLoader` from `three/addons/loaders/GLTFLoader.js`. It works through the import map, so no build step is needed.

This is not wired up yet, because the files are not part of the project.
