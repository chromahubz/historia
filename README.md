# Historia

A ~20-minute documentary, *10 History Mysteries*, built entirely in code from real archive material: museum photographs, scans, satellite imagery and data. No drawn characters, no generated imagery.

Three sibling worlds, one visual system (type, signal colour, plates, camera feel), cut together by the story:

| World | What it shows | How |
|---|---|---|
| **Archive Room** | the real documents and objects | real scans and museum photos on real surfaces (lamp-lit desk, museum case, gallery wall, excavation soil) |
| **Orbit** | where things happened | real satellite imagery (NASA Blue Marble, Sentinel-2) in one descent from orbit, marks on real coordinates |
| **Studio 3D** | what a thing is, measured | realistic 3D reconstructions at recorded sizes, clearly marked as reconstructions |

Every overlay plate is sized to its text; `shared/layoutcheck.mjs` samples the whole film and fails if a text leaves its plate, a plate leaves the safe frame, or two plates overlap.

## Segments

| # | Title | Status |
|---|---|---|
| 10 | The worst year to be alive (536 AD) | planned |
| 9 | Skeleton Lake (Roopkund) | planned |
| 8 | The Bronze Age collapse | planned |
| 7 | [The Roman dodecahedron](films/07-dodecahedron/) | **test segment (v2: three worlds)** |
| 6 | The Copper Scroll | planned |
| 5 | The Kofun tombs | planned |
| 4 | Silphium | planned |
| 3 | The missing city of Akkad | planned |
| 2 | Norse Greenland | planned |
| 1 | The Sumerian King List | planned |

## Build a segment

Requires the Lemo-Opuscar library (`deps voice` tier and its HDRIs), Node 20+, ffmpeg 7+ and Python 3.11+. Shared engine code lives in `shared/` (each film folder links to it).

```sh
LIB=/path/to/lemo-opuscar sh films/07-dodecahedron/build.sh
```

Every film folder has `FACTS.md` (each claim and its source) and `CREDITS` (every image, sample and font with its licence).
