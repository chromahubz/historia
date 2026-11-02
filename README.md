# Historia

A ~20-minute documentary, *10 History Mysteries*, built entirely in code from real archive material: museum photographs, scans, satellite imagery and data. No drawn characters, no generated imagery.

Visual styles (from [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar)), mixed per segment:

| Style | Used for |
|---|---|
| Archive Light Table | real objects and documents under a loupe (dodecahedra, Copper Scroll, coins, King List prism) |
| Satellite Briefing | real places from orbit to the ground (Roopkund, Daisen Kofun, Akkad, Hvalsey) |
| Data Physicalization | numbers built as real 3D objects (temperature drop, 65 tons, reign lengths) |
| Visual Investigation | sources on one timeline (536 AD, Bronze Age collapse) |
| LiDAR Survey (light) | real terrain from public elevation data (Himalaya, Greenland fjords) |

## Segments

| # | Title | Status |
|---|---|---|
| 10 | The worst year to be alive (536 AD) | planned |
| 9 | Skeleton Lake (Roopkund) | planned |
| 8 | The Bronze Age collapse | planned |
| 7 | [The Roman dodecahedron](films/07-dodecahedron/) | **test segment** |
| 6 | The Copper Scroll | planned |
| 5 | The Kofun tombs | planned |
| 4 | Silphium | planned |
| 3 | The missing city of Akkad | planned |
| 2 | Norse Greenland | planned |
| 1 | The Sumerian King List | planned |

## Build a segment

Requires the Lemo-Opuscar library (`deps voice` tier), Node 20+, ffmpeg 7+ and Python 3.11+.

```sh
LIB=/path/to/lemo-opuscar sh films/07-dodecahedron/build.sh
```

Every film folder has `FACTS.md` (each claim and its source) and `CREDITS` (every image, sample and font with its licence).
