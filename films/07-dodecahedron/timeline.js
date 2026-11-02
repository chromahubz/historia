// No. 7 · The Roman Dodecahedron: the single timeline. The narration drives it: each line starts after the
// previous one ends plus a breath (GAP); shots and marks key off line starts and word times (voice/out/words.json).
// film.js (picture), tools/export.mjs (cues, events) and mix.py (via out/timeline.json) all read it.
import DURS from './voice/out/dur.json' with { type: 'json' };
import WORDS from './voice/out/words.json' with { type: 'json' };

export const BPM = 72, BEAT = 60 / BPM;
const START = 1.6;
const GAP = { L01: 1.1, L02: 0.9, L03: 1.8, L04: 0.9, L05: 0.6, L06: 1.2, L07: 1.2, L08: 1.3, L09: 1.0, L10: 0.7, L11: 1.4, L12: 1.2, L13: 1.6, L14: 4.6 };
export const LINES = Object.keys(GAP);
export const V = {};                                   // id -> {t0, t1}
{ let t = START; for (const id of LINES) { V[id] = { t0: +t.toFixed(3), t1: +(t + DURS[id]).toFixed(3) }; t += DURS[id] + GAP[id]; } }
export const DUR = +(V.L14.t1 + GAP.L14).toFixed(2);

// time of a word inside a line (first match, case/punctuation-insensitive); 'end' = the word's end
export function W(line, word, end = false) {
  const k = word.toLowerCase().replace(/[^a-z0-9]/g, '');
  const w = WORDS[line].find(x => x[0].toLowerCase().replace(/[^a-z0-9]/g, '') === k);
  if (!w) throw new Error(`word "${word}" not in ${line}`);
  return +(V[line].t0 + Math.max(0, end ? w[2] : w[1])).toFixed(3);
}

// key moments (seconds)
export const HIT = {
  lightOn: 0.62,
  title: 0.9,
  build: W('L02', 'build'), army: W('L02', 'army'), eat: W('L02', 'eat'),
  these: W('L03', 'these'),
  found: W('L04', 'found'), bronze: W('L04', 'bronze'),
  faces: W('L05', 'faces'), knob: W('L05', 'knob'), hole: W('L05', 'hole'),
  drop1: V.L05.t0 - 0.35,                               // the loupe lands on the Hunt Museum dodecahedron
  notSame: W('L06', 'same'),
  lift1: V.L06.t1 + 0.5,
  drop2: V.L07.t0 + 0.2,                                // the loupe on the Much Hadham find
  mm82: W('L07', '82'), range: W('L07', 'range'),
  lift2: V.L07.t1 + 0.55,
  golf: W('L08', 'golf'), grapefruit: W('L08', 'grapefruit'),
  noText: W('L09', 'text'), noPaint: W('L09', 'painting'), noCarve: W('L09', 'carving'),
  candle: W('L10', 'candle'), survey: W('L10', 'surveying'), dice: W('L10', 'dice'), knit: W('L10', 'knitting'),
  problem: W('L11', 'problem'), standard: W('L11', 'standard'), noTwo: W('L11', 'two'),
  drop3: V.L12.t0 + 0.9,                                // the loupe on the catalogue record
  mention: W('L12', 'mention'), unclear: W('L12', 'unclear', true),
  lift3: V.L12.t1 + 0.6,
  hoards: W('L13', 'hordes'), savings: W('L13', 'savings'),
  vanished: W('L14', 'vanished'),
  index: V.L14.t1 - 1.2,
  endCard: V.L14.t1 + 0.7,
};

// subtitles: one English line per cue, never wrapped (long lines split at a word)
export const SUBS = [
  { line: 'L01', en: 'No. 7 · The Roman dodecahedron.' },
  { line: 'L02', en: 'The Romans wrote about almost everything.' },
  { line: 'L02', from: 'How', en: 'How to build. How to run an army. Even what to eat.' },
  { line: 'L03', en: 'But they never once mentioned these.' },
  { line: 'L04', en: 'Across the old northern provinces of the empire,' },
  { line: 'L04', from: 'archaeologists', en: 'archaeologists have found about 130 of them.' },
  { line: 'L04', from: 'Hollow', en: 'Hollow, cast in bronze.' },
  { line: 'L05', en: 'Twelve flat faces, each one a pentagon.' },
  { line: 'L05', from: 'A', nth: 2, en: 'A knob on every corner. And a hole in every face.' },
  { line: 'L06', en: 'But the holes are not the same size.' },
  { line: 'L07', en: 'One found in Hertfordshire, England, in 2018' },
  { line: 'L07', from: 'is', en: 'is 82 mm across.' },
  { line: 'L07', from: 'Its', en: 'Its holes range from under 14 mm to 20.' },
  { line: 'L08', en: 'The smallest are about 4 cm, the size of a golf ball.' },
  { line: 'L08', from: 'The', nth: 2, en: 'The largest, 11. Nearly a grapefruit.' },
  { line: 'L09', en: 'And yet, no Roman text describes them.' },
  { line: 'L09', from: 'No', nth: 2, en: 'No painting shows one. No carving depicts one.' },
  { line: 'L10', en: 'Historians have thrown every theory at them.' },
  { line: 'L10', from: 'Candle', en: 'Candle holders. Surveying tools. Dice.' },
  { line: 'L10', from: 'Even', en: 'Even a gadget for knitting gloves.' },
  { line: 'L11', en: 'Every theory has a problem.' },
  { line: 'L11', from: 'A', nth: 2, en: 'A measuring tool should be standard,' },
  { line: 'L11', from: 'but', en: 'but no two of these are made the same.' },
  { line: 'L12', en: 'The Hunt Museum in Ireland holds another one.' },
  { line: 'L12', from: 'Its', en: 'Its catalogue says it plainly:' },
  { line: 'L12', from: 'there', en: 'there is no mention of them in classical sources,' },
  { line: 'L12', from: 'and', en: 'and their purpose remains unclear.' },
  { line: 'L13', en: 'And several were found buried in hoards of coins.' },
  { line: 'L13', from: 'You', en: "You don't bury a candle holder with your life savings." },
  { line: 'L14', en: 'Whoever owned these thought they mattered.' },
  { line: 'L14', from: 'And', en: 'And then they vanished from history,' },
  { line: 'L14', from: 'leaving', en: 'leaving us nothing but the objects themselves.' },
];
// cue times: start with the line (or the named word), hold to the next cue of the line or the speech end + 0.6 s
export const CUES = SUBS.map((s, i) => {
  let t0 = V[s.line].t0;
  if (s.from) {
    const k = s.from.toLowerCase(), hits = WORDS[s.line].filter(x => x[0].toLowerCase().replace(/[^a-z0-9]/g, '') === k);
    const w = hits[(s.nth || 1) - 1]; if (!w) throw new Error(`cue word ${s.from} not in ${s.line}`);
    t0 = V[s.line].t0 + w[1] - 0.05;
  }
  return { line: s.line, en: s.en, t0 };
}).map((c, i, a) => ({ ...c, t1: a[i + 1] && a[i + 1].line === c.line ? a[i + 1].t0 - 0.04 : V[c.line].t1 + 0.6 }));
