// No. 7 · The Roman Dodecahedron: Archive Light Table. render(t) for the whole film.
// One camera over one backlit table. World units = 0.1 mm; every item lies at its true size (from its record).
// Picture: the table is drawn in canvas 2D twice: once for the room (A) and once for the view inside the loupe (B);
// one WebGL pass composites them through the lens (pincushion, per-channel fringe, rim, shadow), plus vignette and grain.
// Marks, readings, tags and subtitles live on a 2D overlay canvas above.
import { HIT, DUR, CUES, V } from './timeline.js';

const W = 1920, H = 1080;
const SIG = '#ff5a1f', INK = '#15171a', PLATE = 'rgba(14,15,17,0.80)', PAPERW = 'rgba(248,248,244,0.97)';

// ---------------- helpers ----------------
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const ss = x => x * x * (3 - 2 * x);
const eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const eo = x => 1 - Math.pow(1 - x, 3);
const lerp = (a, b, x) => a + (b - a) * x;
const rot = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [c * v[0] - s * v[1], s * v[0] + c * v[1]]; };
function track(keys) {                              // monotone cubic (Fritsch–Carlson) over [t, v]
  keys = keys.slice().sort((a, b) => a[0] - b[0]);
  const n = keys.length, d = [], m = [];
  for (let i = 0; i < n - 1; i++) d.push((keys[i + 1][1] - keys[i][1]) / Math.max(1e-6, keys[i + 1][0] - keys[i][0]));
  for (let i = 0; i < n; i++) m.push(i === 0 || i === n - 1 ? 0 : (d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  return t => {
    if (t <= keys[0][0]) return keys[0][1];
    if (t >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 0; while (t > keys[i + 1][0]) i++;
    const h = keys[i + 1][0] - keys[i][0], u = (t - keys[i][0]) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * keys[i][1] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * keys[i + 1][1] + (u3 - u2) * h * m[i + 1];
  };
}
const track2 = k => { const x = track(k.map(q => [q[0], q[1][0]])), y = track(k.map(q => [q[0], q[1][1]])); return t => [x(t), y(t)]; };

// ---------------- the table and what lies on it ----------------
const TABLE = [0, 0, 9000, 5600];                     // 900 × 560 mm panel
const TEX = await (await fetch('assets/tex/items.json')).json();
// c: centre (world), r: rotation (deg), z: stacking order. k (world units per texture px) comes from the record size.
const LAYOUT = {
  vitruvius:    { c: [1650, 2280], r: -3.0, z: 1, kind: 'paper' },
  vegetius:     { c: [1520, 3420], r: 4.0, z: 2, kind: 'paper' },
  apicius:      { c: [3780, 1500], r: -6.0, z: 1, kind: 'paper' },
  card:         { c: [4150, 4180], r: 2.5, z: 1, kind: 'paper' },
  card2:        { c: [6150, 2050], r: -2.0, z: 1, kind: 'paper' },
  coin_trajan:  { c: [5620, 4520], r: 8, z: 3, kind: 'obj' },
  coin_titus:   { c: [5990, 4390], r: 24, z: 3, kind: 'obj' },
  coin_gallus:  { c: [5820, 4800], r: -12, z: 4, kind: 'obj' },
  dod_hadham:   { c: [6150, 2050], r: 0, z: 3, kind: 'obj' },
  dod_hunt:     { c: [7750, 1450], r: 0, z: 3, kind: 'obj' },
  dod_tongeren: { c: [7600, 3150], r: 0, z: 3, kind: 'obj' },
};
const IT = {};
for (const [id, L] of Object.entries(LAYOUT)) {
  if (id === 'card' || id === 'card2') continue;
  const t = TEX[id]; if (!t) continue;               // a texture not downloaded yet: the item is simply absent
  IT[id] = { id, ...L, size: [t.w, t.h], k: t.mm * 10, file: 'assets/tex/' + t.file, unknown: !!t.size_unknown };
}
// the catalogue record card (125 × 75 mm index card), typeset below at 2 px per world unit
IT.card = { id: 'card', ...LAYOUT.card, size: [2500, 1500], k: 0.5 };
IT.card2 = { id: 'card2', ...LAYOUT.card2, size: [2500, 1500], k: 0.5 };
const has = id => !!IT[id];
const toW = (it, p) => { const o = rot([(p[0] - it.size[0] / 2) * it.k, (p[1] - it.size[1] / 2) * it.k], it.r * Math.PI / 180); return [it.c[0] + o[0], it.c[1] + o[1]]; };
const toWf = (it, u, v) => toW(it, [u * it.size[0], v * it.size[1]]);     // fractions of the texture
const centre = id => IT[id] ? IT[id].c : LAYOUT[id].c;

// text lines on the scans (texture px after the crop in tools/prep.py, scaled by its factor)
const sc = (id, b) => { const t = TEX[id], s = t.scale, o = t.box; return [(b[0] - o[0]) * s, (b[1] - o[1]) * s, (b[2] - o[0]) * s, (b[3] - o[1]) * s]; };
const LINE_VIT = sc('vitruvius', [790, 440, 1320, 830]);       // "Di Lucio Vitruuio Pollione de Architectura Libri Dece"
const LINE_VEG = sc('vegetius', [250, 390, 830, 530]);         // "Flauii vegecii renati viri illustris ... epithoma rei militaris"
const LINE_API = sc('apicius', [232, 815, 1345, 940]);          // "Apicii Celii epimeles incipit liber primus coditum paradoxum."

// ---------------- the catalogue card (a transcription, typeset) ----------------
const CARD_TXT = [
  'This 12-sided bronze object has 12 circular holes',
  'of different diameters set within 12 equal pentagons,',
  'which are marked by spherical projections of equal',
  'size at each corner. Concentric grooves are forged',
  'around the holes of each of the 12 faces. These objects',
  'have been found in the northern provinces of the Roman',
  'Empire, yet there is no mention of them in classical',
  'sources and their purpose remains unclear.',
];
const CARD_Y0 = 560, CARD_LH = 92;                   // card texture px
const CARD_LIT = [[1176, 6, 2380], [612, 7, 2380]];  // [x0 of "there is no mention", row], whole of row 7 (filled at build)
let cardCanvas = null;
function buildCard() {
  const c = document.createElement('canvas'); c.width = 2500; c.height = 1500; const g = c.getContext('2d');
  g.fillStyle = '#f3efe4'; g.fillRect(0, 0, 2500, 1500);
  // paper fibre (seeded)
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26000; i++) { g.fillStyle = `rgba(${rnd() < .5 ? '120,110,90' : '255,255,250'},${0.03 + rnd() * 0.05})`; g.fillRect(rnd() * 2500, rnd() * 1500, 1 + rnd() * 5, 1 + rnd() * 1.5); }
  g.strokeStyle = 'rgba(70,110,170,0.35)'; g.lineWidth = 2.5;
  for (let y = CARD_Y0 + 24; y < 1440; y += CARD_LH) { g.beginPath(); g.moveTo(60, y); g.lineTo(2440, y); g.stroke(); }
  g.strokeStyle = 'rgba(200,60,50,0.55)'; g.lineWidth = 4; g.beginPath(); g.moveTo(60, 330); g.lineTo(2440, 330); g.stroke();
  g.fillStyle = '#25231f'; g.textBaseline = 'alphabetic';
  g.font = '500 64px PM'; g.fillText('HUNT MUSEUM, LIMERICK', 90, 150); g.textAlign = 'right'; g.fillText('HCM 157', 2410, 150); g.textAlign = 'left';
  g.font = '600 100px PSe'; g.fillText('Dodecahedron', 90, 290);
  g.font = '400 52px PM'; g.textAlign = 'right'; g.fillText('Bronze · H 4.9', 2410, 285); g.textAlign = 'left';
  g.font = '400 56px PM';
  CARD_TXT.forEach((l, i) => g.fillText(l, 90, CARD_Y0 + i * CARD_LH));
  // the row-6 phrase starts at "there": measure it
  const pre = 'Empire, yet '; CARD_LIT[0][0] = 90 + g.measureText(pre).width; CARD_LIT[0][2] = 90 + g.measureText(CARD_TXT[6]).width;
  CARD_LIT[1][0] = 90; CARD_LIT[1][2] = 90 + g.measureText(CARD_TXT[7]).width;
  g.font = '400 36px PM'; g.fillStyle = 'rgba(37,35,31,0.6)';
  g.fillText('Description transcribed from the museum’s catalogue record (via Europeana)', 90, 1440);
  cardCanvas = c;
}
// the Much Hadham find: a summary of its Portable Antiquities Scheme record, typeset on a second card
const R2 = [['Findspot', 'Much Hadham, Hertfordshire'], ['Recorded', '22 August 2018'], ['Diameter', '82 mm'], ['Weight', '247 g'], ['Holes', '13.7 – 20 mm']];
const R2_Y0 = 600, R2_LH = 150, R2_X1 = [];
let card2Canvas = null;
function buildCard2() {
  const c = document.createElement('canvas'); c.width = 2500; c.height = 1500; const g = c.getContext('2d');
  g.fillStyle = '#f1efe8'; g.fillRect(0, 0, 2500, 1500);
  let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26000; i++) { g.fillStyle = `rgba(${rnd() < .5 ? '120,110,90' : '255,255,250'},${0.03 + rnd() * 0.05})`; g.fillRect(rnd() * 2500, rnd() * 1500, 1 + rnd() * 5, 1 + rnd() * 1.5); }
  g.strokeStyle = 'rgba(70,110,170,0.35)'; g.lineWidth = 2.5;
  for (let i = 0; i < R2.length; i++) { const y = R2_Y0 + i * R2_LH + 40; g.beginPath(); g.moveTo(60, y); g.lineTo(2440, y); g.stroke(); }
  g.strokeStyle = 'rgba(200,60,50,0.55)'; g.lineWidth = 4; g.beginPath(); g.moveTo(60, 330); g.lineTo(2440, 330); g.stroke();
  g.fillStyle = '#25231f';
  g.font = '500 64px PM'; g.fillText('PORTABLE ANTIQUITIES SCHEME', 90, 150); g.textAlign = 'right'; g.fillText('941889', 2410, 150); g.textAlign = 'left';
  g.font = '600 100px PSe'; g.fillText('Dodecahedron', 90, 290);
  g.font = '400 52px PM'; g.textAlign = 'right'; g.fillText('Gallo-Roman', 2410, 285); g.textAlign = 'left';
  R2.forEach(([k, v], i) => { const y = R2_Y0 + i * R2_LH; g.font = '400 56px PM'; g.fillStyle = 'rgba(37,35,31,0.65)'; g.fillText(k, 90, y); g.font = '500 76px PM'; g.fillStyle = '#25231f'; g.fillText(v, 700, y); R2_X1[i] = 700 + g.measureText(v).width; });
  g.font = '400 36px PM'; g.fillStyle = 'rgba(37,35,31,0.6)';
  g.fillText('Summary of the record, as quoted with its photograph on Wikimedia Commons', 90, 1440);
  card2Canvas = c;
}

// ---------------- camera ----------------
// [t, centre, zoom (px per world unit), roll (deg)]
const P_VIT = toW(IT.vitruvius, [(LINE_VIT[0] + LINE_VIT[2]) / 2, (LINE_VIT[1] + LINE_VIT[3]) / 2]);
const P_VEG = toW(IT.vegetius, [(LINE_VEG[0] + LINE_VEG[2]) / 2 + 300, (LINE_VEG[1] + LINE_VEG[3]) / 2 + 250]);
const P_API = toW(IT.apicius, [(LINE_API[0] + LINE_API[2]) / 2, (LINE_API[1] + LINE_API[3]) / 2]);
const DODS = [6900, 2350];
const L1W = centre('dod_tongeren'), L2W = toW(IT.card2, [1250, 900]), L3W = toW(IT.card, [1500, CARD_Y0 + 6.5 * CARD_LH]);
const BOOKS = [2400, 2600], COINS = [5800, 4560], WIDE = [4500, 2800];
const ZF = 3.4;                                       // zoom at which the lens rim has left the frame
const CAM = [
  [0.0, WIDE, 0.168, 0], [HIT.title + 3.2, [4300, 2700], 0.178, -0.6],
  [HIT.build - 0.55, P_VIT, 0.52, -1.5], [HIT.build + 0.6, P_VIT, 0.55, -2.0],
  [HIT.army - 0.35, P_VEG, 0.52, 1.0], [HIT.army + 0.5, P_VEG, 0.54, 1.5],
  [HIT.eat - 0.3, P_API, 0.56, -1.0], [HIT.eat + 0.9, P_API, 0.58, -1.6],
  [HIT.these - 0.2, DODS, 0.36, 0], [V.L04.t0, DODS, 0.37, 0.4], [V.L04.t1, [7000, 2300], 0.42, 1.0],
  [HIT.drop1, [L1W[0] - 60, L1W[1] + 40], 0.86, 0.6], [HIT.drop1 + 0.75, L1W, 0.92, 0.5], [HIT.drop1 + 1.9, L1W, ZF, 0.5],
  [HIT.lift1 - 0.9, L1W, ZF, 0.5], [HIT.lift1, L1W, 0.92, 0.2],
  [HIT.drop2, L2W, 0.66, -0.5], [HIT.drop2 + 1.5, L2W, ZF, -0.5], [HIT.lift2 - 0.9, L2W, ZF, -0.5], [HIT.lift2, L2W, 0.66, -0.2],
  [V.L08.t0 + 0.4, [5800, 3330], 0.46, 0], [V.L08.t1 + 0.5, [5850, 3330], 0.48, 0],
  [V.L09.t0 + 0.4, BOOKS, 0.27, 0], [V.L09.t1, [2550, 2600], 0.28, 0],
  [V.L10.t0 + 0.6, WIDE, 0.2, 0], [V.L10.t1, [4600, 2800], 0.205, 0],
  [V.L11.t0 + 0.6, [7150, 2400], 0.36, 0.5], [V.L11.t1, [7150, 2350], 0.38, 0.8],
  [HIT.drop3 - 0.6, [L3W[0] + 100, L3W[1] - 80], 0.6, 1.5], [HIT.drop3, L3W, 0.62, 2.0], [HIT.drop3 + 1.5, L3W, ZF, 2.0],
  [HIT.lift3 - 0.9, L3W, ZF, 2.0], [HIT.lift3, L3W, 0.62, 1.5],
  [V.L13.t0 + 0.3, COINS, 0.62, -1.0], [V.L13.t1, [5820, 4580], 0.66, -1.5],
  [V.L14.t0 + 0.4, [5200, 3000], 0.24, 0], [HIT.endCard, WIDE, 0.172, 0], [DUR, [4520, 2800], 0.168, 0],
];
const camC = track2(CAM.map(k => [k[0], k[1]])), camLZ = track(CAM.map(k => [k[0], Math.log(k[2])])), camR = track(CAM.map(k => [k[0], k[3]]));
const camAt = t => ({ c: camC(t), z: Math.exp(camLZ(t)), th: camR(t) * Math.PI / 180, o: [W / 2, H / 2] });
const w2s = (w, cam) => { const d = rot([(w[0] - cam.c[0]) * cam.z, (w[1] - cam.c[1]) * cam.z], cam.th); return [cam.o[0] + d[0], cam.o[1] + d[1]]; };

// ---------------- the loupe ----------------
const LENS_R = 300, MAG = 2.5;                        // a 60 mm loupe, ×2.5
function dive(id, lw, tDrop, tLift, keysS, keysC) {   // inside scale S (px per world unit) and inside centre, as tracks
  const S0 = camAt(tDrop).z * MAG, S1 = camAt(tLift).z * MAG;
  return { id, lw, tDrop, tLift, S: track([[tDrop, Math.log(S0)], ...keysS.map(k => [k[0], Math.log(k[1])]), [tLift, Math.log(S1)]]), C: track2([[tDrop, lw], ...keysC, [tLift, lw]]) };
}
const D1 = dive('dod_tongeren', L1W, HIT.drop1, HIT.lift1,
  [[HIT.drop1 + 0.75, 0.92 * MAG], [HIT.drop1 + 1.9, 1.42], [HIT.notSame - 0.3, 1.5], [HIT.lift1 - 0.9, 1.52]],
  [[HIT.drop1 + 1.9, [L1W[0] + 60, L1W[1] - 10]], [HIT.lift1 - 0.9, [L1W[0] + 70, L1W[1] - 20]]]);
const D2 = dive('card2', L2W, HIT.drop2, HIT.lift2,
  [[HIT.drop2 + 1.5, 0.95], [HIT.range, 1.02], [HIT.lift2 - 0.9, 1.04]],
  [[HIT.drop2 + 1.5, [L2W[0] - 40, L2W[1] - 60]], [HIT.mm82, [L2W[0], L2W[1] + 40]], [HIT.lift2 - 0.9, [L2W[0] + 30, L2W[1] + 80]]]);
const D3 = dive('card', L3W, HIT.drop3, HIT.lift3,
  [[HIT.drop3 + 1.5, 0.72], [HIT.mention, 0.78], [HIT.lift3 - 0.9, 0.80]],
  [[HIT.drop3 + 1.5, [L3W[0] - 40, L3W[1] - 120]], [HIT.mention, [L3W[0] + 60, L3W[1] - 40]], [HIT.lift3 - 0.9, [L3W[0] + 80, L3W[1] - 30]]]);
const DIVES = [D1, D2, D3];

function shot(t) {
  const cam = camAt(t);
  let dv = null; for (const d of DIVES) if (t >= d.tDrop - 0.45 && t <= d.tLift + 0.45) dv = d;
  const st = { cam, t, on: 0, A: 0, lift: 1, ls: [W / 2, H / 2], R: 0, S: 1, ic: [0, 0], k: 0.16, dive: dv, full: 0 };
  if (dv) {
    const inn = seg(t, dv.tDrop - 0.45, dv.tDrop), out = seg(t, dv.tLift, dv.tLift + 0.45);
    st.on = 1; st.A = eo(inn) * (1 - ss(out)); st.lift = 1 + 0.35 * (1 - eo(inn)) + 0.35 * eo(out);
    st.ls = w2s(dv.lw, cam); st.R = LENS_R * cam.z * st.lift;
    const tt = clamp(t, dv.tDrop, dv.tLift);
    st.S = Math.exp(dv.S(tt)); st.ic = dv.C(tt);
    if (t < dv.tDrop || t > dv.tLift) { st.S = cam.z * MAG * st.lift; st.ic = dv.lw; }
    const dz = seg(Math.log(cam.z), Math.log(camAt(dv.tDrop).z * 1.15), Math.log(ZF * 0.75));   // flatten the lens as we pass through it
    st.k = 0.16 * (1 - ss(dz));
    st.full = st.R > 1130 && st.A > 0.99 ? 1 : 0;
  }
  return st;
}
const int2s = (w, st) => { const q = rot([(w[0] - st.ic[0]) * st.S, (w[1] - st.ic[1]) * st.S], st.cam.th); return [st.ls[0] + q[0], st.ls[1] + q[1]]; };
const camIn = st => ({ c: st.ic, z: st.S, th: st.cam.th, o: st.ls });

// ---------------- textures with a mip chain (canvas 2D draws large scans slowly otherwise) ----------------
const IMG = {};
async function load(id, src) {
  const bmp = src instanceof HTMLCanvasElement ? src : await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('missing ' + src)); i.src = src; });
  const lv = [bmp]; let w = bmp.width, h = bmp.height;
  while (Math.max(w, h) > 300) { w = Math.round(w / 2); h = Math.round(h / 2); lv.push(await createImageBitmap(lv[lv.length - 1], { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' })); }
  IMG[id] = { lv, w: bmp.width, h: bmp.height };
  if (IT[id].kind === 'obj') {                        // the object's own silhouette, blurred, for its shadow on the glass
    const s = document.createElement('canvas'), f = 0.25; s.width = Math.ceil(bmp.width * f) + 80; s.height = Math.ceil(bmp.height * f) + 80;
    const g = s.getContext('2d'); g.filter = 'blur(10px)'; g.drawImage(bmp, 40, 40, bmp.width * f, bmp.height * f);
    g.filter = 'none'; g.globalCompositeOperation = 'source-in'; g.fillStyle = '#000'; g.fillRect(0, 0, s.width, s.height);
    IMG[id].sh = { c: s, f };
  }
}
function pick(id, pxPerTex) {                          // the mip level for this many screen px per texture px
  const m = IMG[id]; let i = 0, s = pxPerTex;
  while (i < m.lv.length - 1 && s < 0.5) { s *= 2; i++; }
  return m.lv[i];
}

// ---------------- the scene (canvas 2D) ----------------
let tableNoise = null;
function makeNoise() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), d = g.createImageData(256, 256);
  let s = 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (rnd() - 0.5) * 22; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0); tableNoise = c;
}
// per-frame paper state: dim (0..1) and the lit band [x0,y0,x1,y1, progress] in texture px
function paperState(id, t) {
  const st = { dim: 0, bands: [] };
  const band = (b, t0, tOut) => { const p = eio(seg(t, t0, t0 + 0.9)) * (1 - seg(t, tOut, tOut + 0.6)); if (p > 0) st.bands.push([...b, p]); return p; };
  if (id === 'vitruvius') { const p = band(LINE_VIT, HIT.build - 0.2, HIT.army - 0.3); st.dim = 0.5 * Math.min(1, p * 2); }
  if (id === 'vegetius') { const p = band(LINE_VEG, HIT.army - 0.2, HIT.eat - 0.3); st.dim = 0.5 * Math.min(1, p * 2); }
  if (id === 'apicius') { const p = band(LINE_API, HIT.eat - 0.2, HIT.these - 0.6); st.dim = 0.5 * Math.min(1, p * 2); }
  if (id === 'card2') {
    const row = (i, t0) => { const y = R2_Y0 + i * R2_LH; return band([80, y - 70, R2_X1[i] + 20, y + 26], t0, HIT.lift2 + 0.2); };
    const p = row(0, V.L07.t0 + 1.4); row(2, HIT.mm82 - 0.5); row(3, HIT.mm82 + 0.5); row(4, HIT.range - 0.3);
    st.dim = 0.22 * Math.min(1, p * 2);
  }
  if (id === 'card') {
    const yRow = r => CARD_Y0 + r * CARD_LH;
    const [a, b2] = CARD_LIT;
    const p1 = band([a[0], yRow(a[1]) - 62, a[2], yRow(a[1]) + 22], HIT.mention - 0.4, HIT.lift3 + 0.2);
    band([b2[0], yRow(b2[1]) - 62, b2[2], yRow(b2[1]) + 22], HIT.mention + 1.0, HIT.lift3 + 0.2);
    st.dim = 0.22 * Math.min(1, p1 * 2);
  }
  if (t > V.L09.t0 && t < V.L10.t0 + 0.5 && ['vitruvius', 'vegetius', 'apicius'].includes(id)) st.dim = Math.max(st.dim, 0.35 * seg(t, V.L09.t0, V.L09.t0 + 0.8) * (1 - seg(t, V.L10.t0, V.L10.t0 + 0.5)));
  return st;
}
function drawScene(g, cam, t, light) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none';
  g.fillStyle = '#0e0f11'; g.fillRect(0, 0, W, H);
  const T = () => { const c = Math.cos(cam.th) * cam.z, s = Math.sin(cam.th) * cam.z; g.setTransform(c, s, -s, c, cam.o[0] - (c * cam.c[0] - s * cam.c[1]), cam.o[1] - (s * cam.c[0] + c * cam.c[1])); };
  T();
  // desk, frame, glowing panel
  g.fillStyle = '#141518'; g.fillRect(-6000, -6000, 21000, 17600);
  g.fillStyle = '#3d3f42'; g.fillRect(TABLE[0] - 260, TABLE[1] - 260, TABLE[2] + 520, TABLE[3] + 520);
  g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = 14; g.strokeRect(TABLE[0] - 250, TABLE[1] - 250, TABLE[2] + 500, TABLE[3] + 500);
  const L = light, cx = 4500, cy = 2800;
  const gr = g.createRadialGradient(cx, cy, 300, cx, cy, 6200);
  const col = (a, b2) => `rgb(${Math.round(lerp(9, a[0], L))},${Math.round(lerp(10, a[1], L))},${Math.round(lerp(12, a[2], L))})`;
  gr.addColorStop(0, col([248, 250, 252])); gr.addColorStop(0.7, col([236, 239, 243])); gr.addColorStop(1, col([212, 216, 222]));
  g.fillStyle = gr; g.fillRect(TABLE[0], TABLE[1], TABLE[2], TABLE[3]);
  if (tableNoise) { g.globalAlpha = 0.05 * L; g.globalCompositeOperation = 'multiply'; const p = g.createPattern(tableNoise, 'repeat'); g.fillStyle = p; g.fillRect(TABLE[0], TABLE[1], TABLE[2], TABLE[3]); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
  // items, by stacking order
  for (const it of Object.values(IT).sort((a, b) => a.z - b.z)) {
    if (!IMG[it.id]) continue;
    const m = IMG[it.id], pxPerTex = cam.z * it.k;
    T(); g.translate(it.c[0], it.c[1]); g.rotate(it.r * Math.PI / 180); g.scale(it.k, it.k);
    const x0 = -it.size[0] / 2, y0 = -it.size[1] / 2;
    if (it.kind === 'paper') {
      const ps = paperState(it.id, t);
      // the sheet is opaque to what lies under it: the backlight through one layer of paper, then the scan
      g.fillStyle = `rgb(${Math.round(lerp(9, 250, L))},${Math.round(lerp(10, 249, L))},${Math.round(lerp(12, 245, L))})`; g.fillRect(x0, y0, it.size[0], it.size[1]);
      g.globalCompositeOperation = 'multiply'; g.drawImage(pick(it.id, pxPerTex), x0, y0, it.size[0], it.size[1]);
      g.globalCompositeOperation = 'source-over';
      if (ps.dim > 0) { g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgba(${Math.round(255 - 150 * ps.dim)},${Math.round(255 - 148 * ps.dim)},${Math.round(255 - 140 * ps.dim)},1)`; g.fillRect(x0, y0, it.size[0], it.size[1]); g.globalCompositeOperation = 'source-over'; }
      for (const b of ps.bands) {                  // the lit line: the paper under it at full light, read left to right
        const xe = lerp(b[0], b[2], Math.min(1, b[4] * 1.15));
        g.save(); g.beginPath(); g.rect(x0 + b[0] - 20, y0 + b[1], xe - b[0] + 40, b[3] - b[1]); g.clip();
        g.fillStyle = `rgb(${Math.round(lerp(9, 252, L))},${Math.round(lerp(10, 250, L))},${Math.round(lerp(12, 244, L))})`; g.fillRect(x0, y0, it.size[0], it.size[1]);
        g.globalCompositeOperation = 'multiply'; g.drawImage(pick(it.id, pxPerTex), x0, y0, it.size[0], it.size[1]);
        g.restore();
      }
    } else {
      // opaque object on glass: it blocks the light under it (a soft dark halo), lit from the room above
      const sh = m.sh; g.globalAlpha = 0.55 * L + 0.2; g.globalCompositeOperation = 'multiply';
      g.drawImage(sh.c, x0 - 40 / sh.f + 70, y0 - 40 / sh.f + 110, sh.c.width / sh.f, sh.c.height / sh.f);
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      g.drawImage(pick(it.id, pxPerTex), x0, y0, it.size[0], it.size[1]);
    }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (light < 1) { g.globalCompositeOperation = 'multiply'; const v = Math.round(lerp(40, 255, light)); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
}

// ---------------- WebGL composite ----------------
const cv = document.getElementById('gl');
const gl = cv.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
const ov = document.getElementById('ov').getContext('2d');
const cA = document.createElement('canvas'), cB = document.createElement('canvas');
cA.width = cB.width = W; cA.height = cB.height = H;
const gA = cA.getContext('2d'), gB = cB.getContext('2d');
const VS = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
const FS = `#version 300 es
precision highp float;
uniform sampler2D tA, tB; uniform vec2 uLs; uniform float uR, uA, uLift, uK, uT, uOn, uLight;
out vec4 o;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
vec3 A(vec2 s){ return texture(tA, s/vec2(1920.,1080.)).rgb; }
vec3 B(vec2 s){ return texture(tB, clamp(s/vec2(1920.,1080.), 0., 1.)).rgb; }
void main(){
  vec2 s = vec2(gl_FragCoord.x, 1080. - gl_FragCoord.y);
  vec3 col = A(s);
  if (uOn > .5){
    vec2 dl = s - uLs; float r = length(dl), rho = r / max(uR, 1.);
    // the lifted loupe's soft shadow (room light from above-left)
    vec2 sd = s - (uLs + vec2(26., 34.)*(uLift - 1.)*uR/120.);
    float sr = length(sd)/uR;
    vec3 under = col * (1. - 0.25*smoothstep(1.32, 1.02, sr)*uA*(0.35 + (uLift - 1.)*1.8));
    vec3 lc;
    if (rho < 1.0){
      vec3 c3;
      for (int i=0;i<3;i++){ float k = uK*(1. + float(i-1)*0.10); vec2 q = dl / (1. + k*rho*rho); c3[i] = B(uLs + q)[i]; }
      lc = c3;
      lc *= 1. - 0.28*smoothstep(0.80, 1.0, rho)*(uK/0.16);
      vec2 hp = dl/uR - vec2(-0.38, -0.46); lc += vec3(0.05)*exp(-dot(hp,hp)*7.)*(uK/0.16);
    } else if (rho < 1.06){
      float u = (rho - 1.0)/0.06; vec2 nd = dl / max(r, 1.);
      float lit = max(0., dot(nd, normalize(vec2(-0.55, -0.83))));
      float bev = exp(-pow((u - 0.25)/0.12, 2.))*0.9 + exp(-pow((u - 0.85)/0.08, 2.))*0.5;
      lc = vec3(0.05, 0.052, 0.056) + vec3(0.62, 0.64, 0.66)*pow(lit, 4.)*bev + 0.06*bev;
    } else if (rho < 1.20){
      float u = (rho - 1.06)/0.14;
      lc = mix(vec3(0.11, 0.115, 0.12), vec3(0.18, 0.185, 0.19), u) + 0.10*pow(max(0., dot(normalize(dl), normalize(vec2(-0.6,-0.8)))), 6.);
      lc *= 1. - 0.5*exp(-pow((u - 1.0)/0.06, 2.));
    } else {
      lc = under * (1. - 0.18*exp(-pow((rho - 1.22)/0.07, 2.))*(2. - uLift));
    }
    col = mix(under, lc, uA);
  }
  vec2 sv = (s - vec2(960., 540.)) / vec2(1150., 800.);
  col *= 1. - 0.13*dot(sv, sv);
  float g = h21(s + fract(uT*24.*0.6180339)*vec2(311.7, 217.3)) - 0.5;
  col += g*0.022;
  o = vec4(clamp(col, 0., 1.), 1.);
}`;
function shd(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
const prog = gl.createProgram();
gl.attachShader(prog, shd(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, shd(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
gl.useProgram(prog);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
const aLoc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
const U = n => gl.getUniformLocation(prog, n);
const texA = gl.createTexture(), texB = gl.createTexture();
for (const [u, tx] of [[0, texA], [1, texB]]) {
  gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, tx);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}
gl.uniform1i(U('tA'), 0); gl.uniform1i(U('tB'), 1);
const upload = (u, tx, c) => { gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, tx); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c); };

// ---------------- overlay ----------------
let TXT = [];
function text(c, id, s, x, y, font, color, opt = {}) {
  c.font = font; c.fillStyle = color; c.textBaseline = opt.base || 'alphabetic'; c.textAlign = opt.align || 'left';
  c.fillText(s, x, y);
  if (id && c.globalAlpha > 0.6) {
    const m = c.measureText(s), w = m.width, x0 = opt.align === 'right' ? x - w : opt.align === 'center' ? x - w / 2 : x;
    const tf = c.getTransform(), p0 = tf.transformPoint({ x: x0, y: y - m.actualBoundingBoxAscent }), p1 = tf.transformPoint({ x: x0 + w, y: y + m.actualBoundingBoxDescent });
    TXT.push({ id, text: opt.full || s, x0: Math.min(p0.x, p1.x), y0: Math.min(p0.y, p1.y), x1: Math.max(p0.x, p1.x), y1: Math.max(p0.y, p1.y) });
  }
  c.textAlign = 'left';
}
const wipe = (c, x, y, w, h, k) => { c.beginPath(); c.rect(x, y, w * k, h); c.clip(); };
function ring(c, p, r, k, lw = 2.2, col = SIG) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.arc(p[0], p[1], r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); c.stroke(); }
const dot = (c, p, r = 3, col = SIG) => { c.fillStyle = col; c.beginPath(); c.arc(p[0], p[1], r, 0, Math.PI * 2); c.fill(); };
function plate(c, x, y, w, h, a = 1) { c.fillStyle = `rgba(14,15,17,${0.80 * a})`; c.beginPath(); c.roundRect(x, y, w, h, 3); c.fill(); }

const NOSUBS = /nosubs=1/.test(location.search);
function subtitles(c, t) {
  if (NOSUBS) return;
  for (const q of CUES) {
    if (t < q.t0 || t >= q.t1) continue;
    const a = Math.min(seg(t, q.t0, q.t0 + 0.12), 1 - seg(t, q.t1 - 0.12, q.t1));
    c.save(); c.globalAlpha = a;
    c.font = '500 36px PS'; const wm = c.measureText(q.en).width + 60, x0 = (W - wm) / 2, y0 = 966;
    plate(c, x0, y0, wm, 68, 1); c.fillStyle = SIG; c.fillRect(x0, y0, 3, 68);
    text(c, null, q.en, W / 2, y0 + 46, '500 36px PS', 'rgba(250,250,247,0.98)', { align: 'center' });
    c.restore();
  }
}

// a reading card in screen space: rows of [font, colour, text]; wipes in at t0, out at t1
function card(c, t, id, x, y, rows, t0, t1, w = null) {
  const a = seg(t, t0, t0 + 0.35) * (1 - seg(t, t1, t1 + 0.35)); if (a <= 0) return null;
  c.save(); c.globalAlpha = Math.min(1, a * 1.3);
  let h = 26; const ys = []; for (const r of rows) { const sz = parseFloat(r[0].split(' ')[1]); h += sz * 1.12 + 8; ys.push(h - 8); }
  c.font = rows[0][0]; const wmax = w || Math.max(...rows.map(r => { c.font = r[0]; return c.measureText(r[2]).width; })) + 52;
  wipe(c, x - 4, y - 4, wmax + 8, h + 30, eo(seg(t, t0, t0 + 0.45)));
  plate(c, x, y, wmax, h + 10); c.fillStyle = SIG; c.fillRect(x, y, 3, h + 10);
  rows.forEach((r, i) => text(c, `${id}${i}`, r[2], x + 26, y + ys[i] + 6, r[0], r[1]));
  c.restore(); return [x, y, wmax, h + 10];
}

// world-anchored tags: [item, offset (world, before rotation), t0, number, title, id line]
const TAGS = [
  ['vitruvius', [-1000, -2150], 4.2, '01', 'Vitruvius, De architectura', 'ed. 1521 · LoC NA2515 .V8'],
  ['vegetius', [-860, 1520], 4.6, '02', 'Vegetius, De re militari', 'ed. 1475 · LoC Incun. X .V37'],
  ['apicius', [-640, -1060], 5.0, '03', 'Apicius, De re coquinaria', 'ed. 1498 · LoC Incun. 1498 .A6'],
  ['dod_hunt', [-245, -380], HIT.these + 0.2, '04', 'Hunt Museum, Limerick', 'HCM 157 · H 4.9'],
  ['dod_hadham', [-410, -560], HIT.these + 0.5, '05', 'Much Hadham, Herts.', 'PAS 941889 · 82 mm'],
  ['card2', [-625, -460], HIT.these + 0.5, '05', 'Much Hadham, Herts.', 'PAS 941889 · record'],
  ['dod_tongeren', [-300, -450], HIT.these + 0.8, '06', 'Tongeren, Leopoldwal', 'Gallo-Roman Museum 4002'],
  ['card', [-625, -460], V.L10.t0, '07', 'Catalogue record', 'Hunt Museum HCM 157'],
  ['coin_trajan', [-420, -420], V.L10.t0 + 0.3, '08', 'Roman sestertii', 'The Met 08.170.121 · .117 · 05.47'],
];
function tableTags(c, t, cam) {
  for (const [id, at, t0, no, title, id2] of TAGS) {
    if (!IT[id]) continue;
    const a = eo(seg(t, t0, t0 + 0.5)) * (1 - seg(t, HIT.index, HIT.index + 0.5)); if (a <= 0) continue;
    const it = IT[id], p = w2s([it.c[0] + rot(at, it.r * Math.PI / 180)[0], it.c[1] + rot(at, it.r * Math.PI / 180)[1]], cam);
    c.save(); c.translate(p[0], p[1]); c.rotate(cam.th + it.r * Math.PI / 180);
    const s = clamp(cam.z / 0.4, 0.5, 1.4); c.scale(s, s); c.globalAlpha = a;
    text(c, null, no, 0, 0, '500 22px PM', SIG);
    text(c, `tag${no}`, title, 40, 0, '500 22px PS', INK);
    c.font = '500 22px PS'; const tw = c.measureText(title).width;
    text(c, `tagid${no}`, id2, 40 + tw + 14, 0, '400 18px PM', 'rgba(21,23,26,0.68)');
    c.restore();
  }
}

// marks on the dodecahedra, in texture fractions of each photo (set from the photographs)
const MARK = {
  dod_hunt: { knob: [0.5, 0.2], holeA: [0.5, 0.5, 0.08], holeB: [0.3, 0.6, 0.05], face: [[0.42, 0.38], [0.58, 0.38], [0.63, 0.53], [0.5, 0.63], [0.37, 0.53]] },
  dod_hadham: { left: [0.05, 0.5], right: [0.95, 0.5], holeA: [0.5, 0.5, 0.08], holeB: [0.25, 0.4, 0.06] },
  dod_tongeren: { knob: [0.39, 0.60], holeA: [0.62, 0.46, 0.085], holeB: [0.47, 0.155, 0.06], face: [[0.41, 0.245], [0.71, 0.21], [0.86, 0.50], [0.70, 0.69], [0.41, 0.615]] },
};

function overlay(t, st) {
  const c = ov; TXT = [];
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
  const cam = st.cam;
  const lensClip = () => { if (st.on && st.A > 0.5) { c.beginPath(); c.rect(0, 0, W, H); c.arc(st.ls[0], st.ls[1], st.R * 1.2, 0, Math.PI * 2, true); c.clip('evenodd'); } };

  // ---- title
  const ta = seg(t, HIT.title, HIT.title + 0.5) * (1 - seg(t, V.L02.t0 - 0.2, V.L02.t0 + 0.3));
  if (ta > 0) {
    c.save(); c.globalAlpha = ta; wipe(c, 90, 700, 1000, 220, eo(seg(t, HIT.title, HIT.title + 0.8)));
    plate(c, 96, 718, 700, 176); c.fillStyle = SIG; c.fillRect(96, 718, 3, 176);
    text(c, 'title-no', 'No. 7', 130, 778, '500 34px PM', SIG);
    text(c, 'title', 'The Roman Dodecahedron', 130, 852, '600 56px PSe', PAPERW);
    c.restore();
  }

  // ---- the table layer (hidden under the loupe)
  c.save(); lensClip(); tableTags(c, t, cam);
  // L04: tags done; a reading
  card(c, t, 'known', 1310, 120, [['500 76px PM', SIG, '≈ 130'], ['500 26px PS', PAPERW, 'known, from Britain to Hungary'], ['400 22px PM', 'rgba(250,250,247,0.7)', 'cast bronze · 2nd–4th century AD']], HIT.found - 0.2, HIT.drop1 - 0.6);
  // L08: size range circles, drawn at true size beside the Much Hadham find
  const sa = seg(t, HIT.golf - 0.5, HIT.golf) * (1 - seg(t, V.L09.t0, V.L09.t0 + 0.5));
  if (sa > 0) {
    const base = [4850, 3250];
    const circ = (r, t0, lab, lab2, dx) => {
      const k = eo(seg(t, t0, t0 + 0.6)); if (k <= 0) return;
      const p = w2s([base[0] + dx, base[1]], cam), rr = r * cam.z;
      c.save(); c.globalAlpha = sa; c.setLineDash([8, 6]); ring(c, p, rr, k, 2.2, SIG); c.setLineDash([]);
      c.strokeStyle = SIG; c.lineWidth = 1.5; c.beginPath(); c.moveTo(p[0] - rr, p[1] + rr + 18); c.lineTo(p[0] - rr + 2 * rr * k, p[1] + rr + 18); c.stroke();
      if (k > 0.6) { text(c, `sz${r}`, lab, p[0], p[1] + rr + 50, '500 24px PM', INK, { align: 'center' }); text(c, `szl${r}`, lab2, p[0], p[1] + rr + 78, '400 20px PS', 'rgba(21,23,26,0.75)', { align: 'center' }); }
      c.restore();
    };
    circ(200, HIT.golf - 0.6, '4 cm', 'smallest · a golf ball', 0);
    circ(410, HIT.golf + 0.6, '8.2 cm', 'Much Hadham', 700);
    circ(550, HIT.grapefruit - 0.9, '11 cm', 'largest · nearly a grapefruit', 1750);
  }
  // L11: no two alike: ring Hunt and Tongeren
  const na = seg(t, HIT.noTwo - 0.3, HIT.noTwo + 0.2) * (1 - seg(t, HIT.drop3 - 1.2, HIT.drop3 - 0.6));
  if (na > 0) for (const id of ['dod_hunt', 'dod_tongeren', 'dod_hadham']) if (IT[id]) {
    const p = w2s(IT[id].c, cam), r = Math.max(IT[id].size[0], IT[id].size[1]) * IT[id].k * 0.6 * cam.z;
    c.save(); c.globalAlpha = na; ring(c, p, r, eo(na), 2.4); c.restore();
  }
  // L13: the coins
  const ca = seg(t, HIT.hoards - 0.4, HIT.hoards + 0.2) * (1 - seg(t, V.L14.t0 + 0.2, V.L14.t0 + 0.7));
  if (ca > 0) { const p = w2s([5800, 4570], cam); c.save(); c.globalAlpha = ca; ring(c, p, 380 * cam.z, eo(ca), 2.4); c.restore(); }
  c.restore();

  // ---- inside the loupe
  if (st.dive && st.A > 0.3) diveMarks(c, t, st);

  // ---- screen readings
  if (t > V.L09.t0 - 0.2 && t < V.L10.t0 + 0.6) {
    const rows = [['500 26px PS', PAPERW, 'In Roman sources'], ['500 30px PM', PAPERW, 'texts       ·  none'], ['500 30px PM', PAPERW, 'paintings   ·  none'], ['500 30px PM', PAPERW, 'carvings    ·  none']];
    const shown = [V.L09.t0, HIT.noText, HIT.noPaint, HIT.noCarve];
    c.save();
    const a = seg(t, V.L09.t0, V.L09.t0 + 0.35) * (1 - seg(t, V.L10.t0, V.L10.t0 + 0.4));
    c.globalAlpha = a; plate(c, 1290, 140, 470, 250); c.fillStyle = SIG; c.fillRect(1290, 140, 3, 250);
    rows.forEach((r, i) => { const k = seg(t, shown[i] - 0.1, shown[i] + 0.25); if (k <= 0) return; c.save(); c.globalAlpha = a * k; text(c, `src${i}`, r[2], 1318, 190 + i * 62, r[0], i ? PAPERW : 'rgba(250,250,247,0.75)'); c.restore(); });
    c.restore();
  }
  if (t > V.L10.t0 - 0.2 && t < HIT.drop3 - 0.4) {
    const th = [['Candle holder', HIT.candle], ['Surveying instrument', HIT.survey], ['Die (a game piece)', HIT.dice], ['Glove-knitting tool', HIT.knit]];
    const a = seg(t, V.L10.t0, V.L10.t0 + 0.35) * (1 - seg(t, HIT.drop3 - 1.0, HIT.drop3 - 0.5));
    const x = 120, y = 120;
    c.save(); c.globalAlpha = a; plate(c, x, y, 560, 330); c.fillStyle = SIG; c.fillRect(x, y, 3, 330);
    text(c, 'thh', 'Theories', x + 28, y + 52, '500 26px PS', 'rgba(250,250,247,0.75)');
    th.forEach(([s, t0], i) => {
      const k = seg(t, t0 - 0.15, t0 + 0.25); if (k <= 0) return;
      const yy = y + 116 + i * 62; c.save(); c.globalAlpha = a * k;
      text(c, `th${i}`, s, x + 28, yy, '500 32px PS', PAPERW);
      const strike = eio(seg(t, HIT.problem + i * 0.45, HIT.problem + i * 0.45 + 0.35));
      if (strike > 0) { c.font = '500 32px PS'; const w = c.measureText(s).width; c.strokeStyle = SIG; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 24, yy - 11); c.lineTo(x + 24 + (w + 8) * strike, yy - 11); c.stroke(); }
      c.restore();
    });
    const qa = seg(t, HIT.noTwo - 0.2, HIT.noTwo + 0.3);
    if (qa > 0) { c.globalAlpha = a * qa; text(c, 'notwo', 'no two made the same', x + 28, y + 392, '500 26px PM', SIG); }
    c.restore();
  }
  // ---- index and end card
  if (t > HIT.index - 0.1) indexPanel(c, t);
  subtitles(c, t);
}

function diveMarks(c, t, st) {
  const d = st.dive, a = st.A;
  c.save(); c.beginPath(); c.arc(st.ls[0], st.ls[1], st.R, 0, Math.PI * 2); c.clip();
  if (d === D1 && has('dod_tongeren')) {
    const it = IT.dod_tongeren, M = MARK.dod_tongeren, P = f => int2s(toWf(it, f[0], f[1]), st);
    const out = 1 - seg(t, HIT.lift1 - 1.0, HIT.lift1 - 0.6);
    c.globalAlpha = a * out;
    // a face: its pentagon outline draws on
    const kf = eio(seg(t, HIT.faces - 0.1, HIT.faces + 0.8));
    if (kf > 0) {
      const pts = M.face.map(P); c.strokeStyle = SIG; c.lineWidth = 2.6; c.beginPath();
      const tot = 5 * kf; for (let i = 0; i <= Math.floor(tot) && i <= 5; i++) { const p = pts[i % 5]; i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }
      if (tot < 5) { const i = Math.floor(tot), f = tot - i, p0 = pts[i % 5], p1 = pts[(i + 1) % 5]; c.lineTo(lerp(p0[0], p1[0], f), lerp(p0[1], p1[1], f)); }
      c.stroke(); pts.forEach(p => dot(c, p, 3.5));
      if (kf > 0.6) labelAt(c, pts[2], 'pentagon · ×12', 'face', [80, 60]);
    }
    const kk = seg(t, HIT.knob - 0.1, HIT.knob + 0.4);
    if (kk > 0) { const p = P(M.knob); ring(c, p, 0.05 * it.size[0] * it.k * st.S, eo(kk), 2.6); if (kk > 0.5) labelAt(c, p, 'knob · ×20', 'knob', [70, -50]); }
    const kh = seg(t, HIT.hole - 0.1, HIT.hole + 0.4);
    if (kh > 0) { const p = P(M.holeA); ring(c, p, M.holeA[2] * it.size[0] * it.k * st.S, eo(kh), 2.6); if (kh > 0.5) labelAt(c, p, 'hole · ×12', 'hole', [-260, 90]); }
    const kn = seg(t, HIT.notSame - 0.4, HIT.notSame + 0.2);
    if (kn > 0) {
      const pa = P(M.holeA), pb = P(M.holeB), ra = M.holeA[2] * it.size[0] * it.k * st.S, rb = M.holeB[2] * it.size[0] * it.k * st.S;
      c.save(); c.globalAlpha *= kn; ring(c, pb, rb, eo(kn), 2.6);
      text(c, 'neq', '≠', (pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2 + 22, '500 72px PM', SIG, { align: 'center' }); c.restore();
    }
  }
  if (d === D2 && has('dod_hadham')) {
    const it = IT.dod_hadham, M = MARK.dod_hadham, P = f => int2s(toWf(it, f[0], f[1]), st);
    const out = 1 - seg(t, HIT.lift2 - 1.0, HIT.lift2 - 0.6);
    c.globalAlpha = a * out;
    const k = eio(seg(t, HIT.mm82 - 0.9, HIT.mm82));
    if (k > 0) {
      const l = P(M.left), r = P(M.right), m = [lerp(l[0], r[0], k), lerp(l[1], r[1], k)];
      c.strokeStyle = SIG; c.lineWidth = 2.6; c.beginPath(); c.moveTo(l[0], l[1]); c.lineTo(m[0], m[1]); c.stroke();
      for (const p of [l, r]) { c.beginPath(); c.moveTo(p[0], p[1] - 22); c.lineTo(p[0], p[1] + 22); c.stroke(); }
      if (k >= 1) {
        plate(c, (l[0] + r[0]) / 2 - 120, l[1] - 128, 240, 84);
        text(c, 'mm82', `${Math.round(82 * eio(seg(t, HIT.mm82 - 0.9, HIT.mm82 - 0.1)))} mm`, (l[0] + r[0]) / 2, l[1] - 70, '500 48px PM', SIG, { align: 'center', full: '82 mm' });
      }
    }
    const kr = seg(t, HIT.range - 0.3, HIT.range + 0.3);
    if (kr > 0) {
      const pa = P(M.holeA), pb = P(M.holeB), ra = M.holeA[2] * it.size[0] * it.k * st.S, rb = M.holeB[2] * it.size[0] * it.k * st.S;
      c.save(); c.globalAlpha *= kr; ring(c, pa, ra, eo(kr), 2.6); ring(c, pb, rb, eo(kr), 2.6); c.restore();
    }
  }
  c.restore();
  // readings beside the lens (screen space)
  if (d === D2) {
    const cardA = card(c, t, 'had', 110, 740, [['500 26px PS', PAPERW, 'Much Hadham, Hertfordshire · 2018'], ['500 30px PM', SIG, 'Ø 82 mm  ·  247 g'], ['500 26px PM', PAPERW, 'holes 13.7 – 20 mm'], ['400 20px PM', 'rgba(250,250,247,0.65)', 'Portable Antiquities Scheme 941889']], HIT.drop2 + 1.6, HIT.lift2 - 0.7);
  }
  if (d === D1) card(c, t, 'tong', 110, 110, [['500 26px PS', PAPERW, 'Tongeren, Belgium · found 1939'], ['500 30px PM', SIG, '12 faces · 20 knobs · 12 holes'], ['400 20px PM', 'rgba(250,250,247,0.65)', 'Gallo-Roman Museum 4002 · AD 150–400']], HIT.faces, HIT.lift1 - 0.7);
  if (d === D3) card(c, t, 'rec', 1340, 110, [['500 26px PS', PAPERW, 'Hunt Museum catalogue · HCM 157'], ['400 22px PM', 'rgba(250,250,247,0.65)', 'transcribed record, via Europeana']], HIT.drop3 + 1.6, HIT.lift3 - 0.7);
}
function labelAt(c, p, s, id, off) {
  const b = [p[0] + off[0], p[1] + off[1]];
  c.strokeStyle = SIG; c.lineWidth = 1.6; c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(b[0], b[1]); c.stroke();
  c.font = '500 26px PM'; const w = c.measureText(s).width;
  const x = off[0] < 0 ? b[0] - w - 28 : b[0];
  plate(c, x, b[1] - 24, w + 28, 40); text(c, `lab-${id}`, s, x + 14, b[1] + 6, '500 26px PM', PAPERW);
}

function indexPanel(c, t) {
  const rows = TAGS.filter(r => IT[r[0]]).map(r => [r[3], r[4], r[5]]);
  const a = seg(t, HIT.index, HIT.index + 0.4);
  const x = 1180, y = 120 + 0 * a;
  c.save(); c.globalAlpha = a; plate(c, x, y, 640, 120 + rows.length * 54); c.fillStyle = SIG; c.fillRect(x, y, 3, 120 + rows.length * 54);
  text(c, 'idx', 'On the table', x + 28, y + 52, '500 28px PS', 'rgba(250,250,247,0.8)');
  rows.forEach((r, i) => {
    const k = seg(t, HIT.index + 0.2 + i * 0.12, HIT.index + 0.5 + i * 0.12); if (k <= 0) return;
    c.save(); c.globalAlpha = a * k; const yy = y + 108 + i * 54;
    text(c, null, r[0], x + 28, yy, '500 22px PM', SIG);
    text(c, `idx${i}`, r[1], x + 72, yy, '500 24px PS', PAPERW);
    c.restore();
  });
  c.restore();
  const e = seg(t, HIT.endCard, HIT.endCard + 0.6);
  if (e > 0) {
    c.save(); c.globalAlpha = e; wipe(c, 90, 700, 1000, 240, eo(e));
    plate(c, 96, 718, 760, 196); c.fillStyle = SIG; c.fillRect(96, 718, 3, 196);
    text(c, 'end-no', 'No. 7', 130, 778, '500 34px PM', SIG);
    text(c, 'end-title', 'The Roman Dodecahedron', 130, 846, '600 52px PSe', PAPERW);
    text(c, 'end-v', 'purpose: unclear', 130, 892, '500 28px PM', 'rgba(250,250,247,0.75)');
    c.restore();
  }
}

// ---------------- render ----------------
const lightAt = t => t < 0.12 ? 0 : t < 0.2 ? 0.55 : t < 0.32 ? 0.08 : t < 0.42 ? 0.7 : t < HIT.lightOn ? 0.3 + 0.7 * seg(t, 0.42, HIT.lightOn) : 1;
function render(t) {
  const st = shot(t), light = lightAt(t);
  if (!st.full) drawScene(gA, st.cam, t, light);
  if (st.on) drawScene(gB, camIn(st), t, light);
  upload(0, texA, st.full ? cB : cA); if (st.on) upload(1, texB, cB);
  gl.viewport(0, 0, W, H);
  gl.uniform2f(U('uLs'), st.ls[0], st.ls[1]); gl.uniform1f(U('uR'), st.R); gl.uniform1f(U('uA'), st.A); gl.uniform1f(U('uLift'), st.lift);
  gl.uniform1f(U('uK'), st.k); gl.uniform1f(U('uT'), t); gl.uniform1f(U('uOn'), st.on && !st.full ? 1 : 0); gl.uniform1f(U('uLight'), light);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  overlay(t, st);
}

await document.fonts.load('500 30px PM'); await document.fonts.load('400 30px PM'); await document.fonts.load('500 30px PS');
await document.fonts.load('400 30px PS'); await document.fonts.load('600 30px PSe'); await document.fonts.load('500 30px PSe');
buildCard(); buildCard2(); makeNoise();
await Promise.all(Object.values(IT).map(it => load(it.id, it.id === 'card' ? cardCanvas : it.id === 'card2' ? card2Canvas : it.file)));
window.DUR = DUR;
window.render = render;
window.TEXTS = t => { render(t); return TXT; };
window.READY = true;
