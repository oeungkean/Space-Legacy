# Space Legacy: Simulator and Exploration Research (Phase 1, part 2)

Checked in October 2026. Anything not confirmed is left out of the app or labelled as a game value.

## Spacesuits
| Suit | Facts used | Source |
|---|---|---|
| Apollo A7-L | Made by ILC Industries (Hamilton Standard contractor); beta cloth, rubber, nylon, plastic; red and blue connectors; worn with a liquid cooling garment for up to 115 hours; Armstrong wore one on Apollo 11 | [Smithsonian NASM](https://avpreservation.si.edu/object/nasm_A19730040000) |
| EMU (Shuttle/ISS) | Fiberglass hard upper torso; PLSS backpack (oxygen, CO2 removal, cooling, radio) for EVAs up to 7 hours; SAFER jet pack; about 113 kg on Earth without SAFER | [NASA EMU (PDF)](https://www.nasa.gov/wp-content/uploads/2009/07/188963main_extravehicular_mobility_unit.pdf) |
| Axiom AxEMU | Axiom Space with Prada for Artemis III; prototype March 2023, flight design October 2024; EVAs of at least 8 hours; at least 2 hours in permanently shadowed regions | [Tech Briefs](https://www.techbriefs.com/component/content/article/53418-a-next-generation-space-suit-for-artemis-iii) |
| SpaceX suit | Worn by Behnken and Hurley on Demo-2; not a spacewalk suit (no backpack) | [ESA: Demo-2 launch](https://www.esa.int/ESA_Multimedia/Images/2020/10/SpaceX_Demo-2_Launch) |

## Vehicles
- **Lunar Roving Vehicle**:
  - Mass 210 kg, frame 3.1 m long, 2.3 m wheelbase.
  - A 0.25 hp motor in each wheel.
  - Front and rear steering, turning in opposite directions for a 3.1 m turning radius.
  - Distances driven: 27.8 km (Apollo 15), 26.7 km (Apollo 16), 35.9 km (Apollo 17).
  - Source: [NASA NSSDC](https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html).
  - Its top speed was not confirmed, so the game speed is labelled "(game)".
- **Mars rovers**: these drive very slowly in reality, so the game shows the speed as "sped up". The arm, the mast cameras and turning in place are modelled.
- **Lunar Module landing**: simplified. The thrust, fuel and the "land below 3 m/s" limit are game values and are labelled as such.

## Gravity
Moon 1.62 m/s², Mars 3.71 m/s², Earth 9.81 m/s² (standard NASA planetary values).

The same jump gives about 1.2 m on the Moon, 0.5 m on Mars and 0.2 m on Earth. Orbit is free fall: the astronaut keeps drifting until the SAFER jet pack stops them.

## Missions added for the simulator
- **Demo-2**:
  - Falcon 9 and Crew Dragon from LC-39A on May 30, 2020, with Behnken and Hurley, bound for the ISS.
  - Splashdown in the Gulf of Mexico on August 2, 2020.
  - Sources: [ESA](https://www.esa.int/ESA_Multimedia/Images/2020/10/SpaceX_Demo-2_Launch), [NASA blog](https://blogs.nasa.gov/commercialcrew/2020/08/02/splashdown-nasas-spacex-demo-2-test-flight-complete).
- **Apollo 15, Apollo 17, Viking 1, Blue Ghost 1, Pioneer Venus 2 and MESSENGER journeys**: dates come from the researched profiles in `data/hardware.js`.

## Discoverable objects
- **Three Forks sample depot**: Perseverance placed the first tube on December 21, 2022 (sol 653), and 10 tubes in all. Source: [JPL](https://www.jpl.nasa.gov/news/nasas-perseverance-rover-deposits-first-sample-on-mars-surface).
- **Memorial to fallen astronauts and cosmonauts (Apollo 15)**: a plaque with 14 names and a small figurine, left on August 2, 1971. Source: [NASA](https://science.nasa.gov/resource/memorial-to-fallen-astronauts-on-the-moon).
- **Other objects**: facts come from the existing profiles (Apollo 11, 15 and 17, Perseverance, Curiosity, Hubble, ISS).

Positions inside each site are illustrative.

## Compatibility rules
Historical Mode allows only the 24 real rocket + spacecraft + destination combinations in `data/simulator.js` (TEMPLATES).

Sandbox Mode allows anything, but:
- Combinations that never flew are labelled FICTIONAL.
- Rocket paint and upgrades are sandbox-only and fictional.
- Historical Mode always uses the original rockets.

## The collection is virtual
Recording an object adds it to "My Collection" only. Every information card says that the real object stays where it is (Moon, Mars or orbit).

## What a professional team could replace later
- **Astronauts**: the procedural astronauts and animations could become rigged glTF models with motion capture.
- **Terrain**: the terrain is generated. Real elevation data could replace it: LRO for the Moon, HiRISE for Mars.
- **Cockpit**: the cockpit interior is a simplified placeholder, not a real Dragon or Gemini cabin layout.
