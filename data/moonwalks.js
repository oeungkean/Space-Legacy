// First-person moonwalks (Kampu Space Master Doc 17): what the astronauts really did on the surface, told
// beat by beat after the landing in a mission replay. You see it through the commander's helmet; the other
// astronaut works beside you and says the words recorded in the mission transcript.
//
// The scenes are a RECREATION: the 3D models, positions and movements are simplified and the narrator's
// browser voice reads the quotes (no original audio is included). The words, times and facts come from
// the sources below. Times are UTC (the landing was on the evening of July 20 in the US); where the exact
// minute is not given in the project's sources, the beat says roughly when it happened instead.
//
// Each beat becomes one chapter of the replay:
//   id        what the scene shows (js/space-film.js moonwalkShot)
//   title     the chapter title; label = the short name on the progress bar
//   time      when it happened
//   narration what the narrator says
//   quote     { speaker, text } the words of an astronaut, shown with their name and read after the narration
//   duration  seconds the scene plays (the replay also waits for the narrator to finish)

const ALSJ = { label: "NASA Apollo Lunar Surface Journal: Apollo 11", url: "https://www.hq.nasa.gov/alsj/a11/a11.html" };
const NSSDCA = { label: "NASA NSSDCA: Apollo 11 Lunar Module / EASEP (1969-059C)", url: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C" };

export const MOONWALKS = {
  apollo11: {
    crew: { commander: "Neil Armstrong", partner: "Buzz Aldrin", suit: "a7l" },
    site: "tranquility",
    note: "Recreation based on the Apollo 11 transcript",
    sources: [ALSJ, NSSDCA],
    beats: [
      {
        id: "ladder",
        label: "First step",
        title: "One small step",
        time: "July 21, 1969 · 02:56 UTC",
        narration:
          "Six and a half hours after landing, the hatch opens. Neil Armstrong backs out onto the porch and climbs down the nine rungs of Eagle's ladder, facing the spacecraft. At the bottom he reports that the footpads have sunk only one or two inches into the fine, powdery soil. Then he steps off.",
        quote: { speaker: "Neil Armstrong", text: "That's one small step for man, one giant leap for mankind." },
        duration: 20
      },
      {
        id: "contingency",
        label: "Sample",
        title: "A sample, just in case",
        time: "Minutes after the first step",
        narration:
          "Armstrong's first job is to scoop up a contingency sample: a few rocks and soil, pushed into a pocket on his leg. If the crew had to leave in a hurry, scientists would still get a piece of the Moon. He notices that the soil packs firmly under his boots and the surface has a strange beauty.",
        quote: { speaker: "Neil Armstrong", text: "It has a stark beauty all its own." },
        duration: 17
      },
      {
        id: "aldrin",
        label: "Aldrin",
        title: "Buzz Aldrin joins him",
        time: "About 20 minutes after the first step",
        narration:
          "About twenty minutes after Armstrong, Buzz Aldrin climbs down the ladder. He jumps back up to the first rung to test it, then stands on the surface and looks around at the grey plain, the black sky and the sharp horizon.",
        quote: { speaker: "Buzz Aldrin", text: "Magnificent desolation." },
        duration: 17
      },
      {
        id: "plaque",
        label: "Plaque",
        title: "We came in peace",
        time: "During the moonwalk",
        narration:
          "On the ladder leg there is a stainless steel plaque with a map of Earth's two hemispheres and the signatures of the three astronauts and President Nixon. Armstrong reads it aloud for the world.",
        quote: { speaker: "Neil Armstrong", text: "Here men from the planet Earth first set foot upon the Moon, July 1969 A.D. We came in peace for all mankind." },
        duration: 18
      },
      {
        id: "flag",
        label: "Flag",
        title: "The flag",
        time: "During the moonwalk",
        narration:
          "Together they push the flagpole into the ground. The soil is hard a few inches down, so the pole will not go deep. A horizontal rod holds the flag out, because there is no air on the Moon to make it fly. Soon after, President Nixon speaks to them by radio from the White House.",
        duration: 17
      },
      {
        id: "experiments",
        label: "Experiments",
        title: "Experiments that stay behind",
        time: "During the moonwalk",
        narration:
          "Aldrin carries the early experiment package about seventeen meters south of Eagle. He sets out the seismometer, powered by its own solar panels, to listen for moonquakes. A few meters away goes the laser reflector, a panel of one hundred glass prisms. Observatories on Earth have bounced lasers off it for decades since.",
        duration: 19
      },
      {
        id: "samples",
        label: "Rocks",
        title: "Collecting the Moon",
        time: "The last hour",
        narration:
          "In the last part of the moonwalk they fill boxes with rocks and drive tubes into the ground to collect cores. Altogether Apollo 11 brings home 21.55 kilograms of lunar samples. Armstrong also jogs out alone to look into a small crater east of the lander.",
        duration: 17
      },
      {
        id: "return",
        label: "Back inside",
        title: "Back inside Eagle",
        time: "July 21, 1969 · 05:11 UTC, hatch closed",
        narration:
          "Aldrin climbs back up first, and Armstrong hands up the sample boxes before following him. The moonwalk lasted about two and a half hours. Three things to remember: Apollo 11 proved people could land on the Moon and come home; the samples changed what we know about the Moon's history; and the laser reflector they left has been used by observatories for decades since.",
        duration: 22
      }
    ]
  }
};
