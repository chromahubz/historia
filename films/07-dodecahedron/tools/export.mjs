// Timeline -> out/timeline.json (for mix.py) and out/cues_srt.json (subtitles). usage: node tools/export.mjs <film_dir>
// Exits 1 if two voice lines overlap or a subtitle cue is shorter than 1.5 s.
import fs from 'fs'; import path from 'path'; import { pathToFileURL } from 'url';
const D = path.resolve(process.argv[2] || '.');
const TL = await import(pathToFileURL(path.join(D, 'timeline.js')).href);
let bad = 0;
const voice = TL.LINES.map(id => ({ id, t: TL.V[id].t0, t1: TL.V[id].t1 }));
voice.forEach((v, i) => { if (i && v.t < voice[i - 1].t1 + 0.15) { console.error(`voice overlap: ${voice[i - 1].id} / ${v.id}`); bad = 1; } });
for (const c of TL.CUES) if (c.t1 - c.t0 < 1.5) { console.error(`cue "${c.en}" only ${(c.t1 - c.t0).toFixed(2)} s`); bad = 1; }
fs.mkdirSync(path.join(D, 'out'), { recursive: true });
fs.writeFileSync(path.join(D, 'out/cues_srt.json'), JSON.stringify(TL.CUES.map(c => ({ t0: +c.t0.toFixed(3), t1: +c.t1.toFixed(3), text: c.en })), null, 1));
fs.writeFileSync(path.join(D, 'out/timeline.json'), JSON.stringify({ dur: TL.DUR, bpm: TL.BPM, beat: TL.BEAT, hit: TL.HIT, cuts: TL.CUTS, shots: TL.SHOTS, voice }, null, 1));
console.log('timeline', TL.DUR, 's,', voice.length, 'lines,', TL.CUES.length, 'cues');
process.exit(bad);
