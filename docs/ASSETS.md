# Assets you can add

Space Legacy runs without any of these files. Each one makes something look more realistic.

## Planet textures (recommended)

Source: Solar System Scope, https://www.solarsystemscope.com/textures/
License: CC BY 4.0. Credit "Solar System Scope". This credit is already on the Credits page.

Download the 2K versions (8K also works, but loads slower). Rename them to these filenames and put them in `assets/textures/`, next to `index.html`:

| File | Solar System Scope map |
|---|---|
| `mercury.jpg` | Mercury |
| `venus.jpg` | Venus Atmosphere (cloud tops, as seen from space; used for the planet in the solar system view) |
| `venus_surface.jpg` | Venus Surface (used on the Venus detail screen, and as a fallback if `venus.jpg` is missing) |
| `mars.jpg` | Mars |
| `jupiter.jpg` | Jupiter |
| `saturn.jpg` | Saturn |
| `saturn_ring.png` | Saturn Ring Alpha (PNG with transparency) |
| `uranus.jpg` | Uranus |
| `neptune.jpg` | Neptune |
| `moon.jpg` | Moon (optional; the CDN copy is used first) |
| `sun.jpg` | Sun |
| `mars_4k.jpg` | Mars, 8K download resized to 4096 x 2048 (Master Doc 10, 2026-11-14) |
| `jupiter_4k.jpg` | Jupiter, the "8K" download (4096 x 2048), re-saved at JPEG quality 86 |
| `saturn_4k.jpg` | Saturn, the "8K" download (4096 x 2048), re-saved at JPEG quality 86 |

The `_4k` maps replace the 2K ones once loaded (the 2K maps show first and stay as the fallback; phones keep the 2K maps to save memory). Solar System Scope has no sharper Uranus or Neptune map, so those keep their 2K maps, with darker edges (limb darkening) drawn by the shader.

## Titan map

`titan_4k.jpg`: NASA/JPL-Caltech/Space Science Institute, "Titan Mosaic: The Surface Under the Haze", PIA22770 (https://images.nasa.gov/details/PIA22770, https://photojournal.jpl.nasa.gov/catalog/PIA22770). A Cassini ISS global mosaic at 938 nm (near-infrared) built from 9,873 images; public domain (NASA). Resized from 5760 x 2880 to 4096 x 2048 and tinted warm orange for display (the original is greyscale). Its 0 degrees longitude is at the left edge, so the code turns it half a turn to line up with the other maps. Downloaded 2026-11-14.

Earth's day map, normal map, specular (ocean-shine) map and clouds load from the three.js examples on jsDelivr. You do not need to add them.

## Mission photos on the "Replay finished" card (loaded from NASA, not stored here)

`data/mission-photos.js` lists one official NASA photo per mission replay, from the NASA Image and Video Library (https://images.nasa.gov). Each entry has the image's NASA ID, a caption based on NASA's own title and description, a credit and a link to the image's page. The pictures load from `images-assets.nasa.gov` when the card opens; offline, the card shows without a picture. Apollo 11, Curiosity and Perseverance use the local photos already listed above. NASA images are generally not copyrighted (NASA Images and Media Usage Guidelines); no NASA endorsement is implied. Chosen and checked 2026-11-14.

## Official NASA 3D models (loaded from NASA, not stored here)

`js/nasa-models.js` loads official models from NASA 3D Resources (https://science.nasa.gov/3d-resources/) straight from NASA's asset server (`assets.science.nasa.gov`, which allows this cross-origin), using `GLTFLoader` through the import map. NASA states the assets are free to download and use; see the NASA Images and Media Usage Guidelines (no NASA endorsement is implied). Nothing is copied into this project.

| Project model | NASA model (GLB) | Size |
|---|---|---|
| `saturn-v` | Saturn V | 905 KB |
| `lunar-module` | Apollo Lunar Module | 700 KB |
| `gemini` | Gemini | 1.32 MB |
| `galileo-orbiter` | Galileo | 243 KB |
| `parker` | Parker Solar Probe | 433 KB |
| `pioneer` | Pioneer 10 | 1.95 MB |
| `viking-lander` | Viking Lander | 1.76 MB |
| `perseverance` | Mars 2020 Perseverance Rover | 4.76 MB |
| `agena` | Agena Target Vehicle (https://science.nasa.gov/3d-resources/agena-target-vehicle/) | 1.10 MB |

Where they are used: the Missions page (the cards' pictures and the 3D viewer) and the Agena exhibit in the Real Missions builder hall. The mission scenes (launch, space shots, landing, exploration) use the project's own models, so a spacecraft looks the same from launch to landing (Master Doc 8). The project's own model shows first and stays if NASA's server cannot be reached (offline). The launch rockets keep the project's models, because their stage separations are built from those models' parts. To work fully offline, these files could be saved in `assets/models/` and the base URL changed (ask first: that is downloading files).
