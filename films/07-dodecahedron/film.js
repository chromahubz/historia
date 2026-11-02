// No. 7 · The Roman Dodecahedron. Three worlds, cut together by the story:
//   Archive Room (a lamp-lit desk, a museum case, a gallery wall, excavation soil): the real documents and objects
//   Orbit (NASA Blue Marble, Sentinel-2): where they were found
//   Studio 3D (a measured bronze reconstruction): what the thing is, and what the theories would need it to be
// render(t) picks the shot, poses its set from t alone, renders it, then draws the overlay (plates sized to their text,
// checked by LAYOUT(t): texts inside plates, plates inside the safe frame, no two plates overlapping).
import * as THREE from 'three';
import { HIT, DUR, CUES, V, CUTS as CUT, SHOTS as SHOT } from './timeline.js';
import { makeStage, aim, project, canvasTex, rng } from './shared/stage.js';
import { studio, desk, vitrine, gallery, soil, book, pageW, coin } from './shared/sets.js';
import { makeDodeca, bronze } from './shared/dodeca.js';
import { orbit, g2w } from './shared/orbit.js';
import { makeUI, SIG, PAPER, DIM, seg, eo, clamp } from './shared/overlay.js';

const T = 'assets/tex', ITEMS = await (await fetch(`${T}/items.json`)).json();
const lerp = (a, b, x) => a + (b - a) * x, ss = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const eio = x => { x = clamp(x, 0, 1); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
// keyframed vectors: [[t, [x,y,z]], ...] eased between keys
function path(keys) { return t => { if (t <= keys[0][0]) return V3(...keys[0][1]); for (let i = 0; i < keys.length - 1; i++) { const [a, p] = keys[i], [b, q] = keys[i + 1]; if (t <= b) { const k = eio((t - a) / (b - a)); return V3(lerp(p[0], q[0], k), lerp(p[1], q[1], k), lerp(p[2], q[2], k)); } } return V3(...keys[keys.length - 1][1]); }; }
const num = keys => { const p = path(keys.map(([t, v]) => [t, [v, 0, 0]])); return t => p(t).x; };

await document.fonts.load('500 30px PM'); await document.fonts.load('400 30px PM'); await document.fonts.load('500 30px PS');
await document.fonts.load('400 30px PS'); await document.fonts.load('600 30px PSe'); await document.fonts.load('500 30px PSe');
const S = makeStage(document.getElementById('stage'));
const ui = makeUI(document.getElementById('ov'));
const envStudio = await S.hdri('/core/assets/polyhaven/photo_studio_loft_hall_2k.hdr');
const envRoom = await S.hdri('/core/assets/polyhaven/lythwood_lounge_2k.hdr');

// ================= sets =================
// ---- Archive: the Roman study desk (the books) and, later, the catalogue card
const D = await desk(S, { env: envRoom, base: T });
const pageTex = async id => S.tex(`${T}/${ITEMS[id].file}`);
const BK = {};
for (const [id, hgt, thick, pos, ry] of [['vitruvius', 0.41, 0.045, [-0.33, 0.03], 0.07], ['vegetius', 0.29, 0.035, [0.07, 0.07], -0.06], ['apicius', 0.197, 0.022, [0.39, -0.03], 0.10]]) {
  const it = ITEMS[id], w = hgt * it.w / it.h, b = book(await pageTex(id), w, hgt, thick);
  b.position.set(pos[0], 0, pos[1]); b.rotation.y = ry; D.scene.add(b); BK[id] = b; b.updateMatrixWorld(true);
}
// lit lines on the scans, in fractions of the cropped page (from tools/prep.py crops)
const fr = (id, x0, y0, x1, y1) => { const it = ITEMS[id], s = it.scale, o = it.box; return [(x0 - o[0]) * s / it.w, (y0 - o[1]) * s / it.h, (x1 - o[0]) * s / it.w, (y1 - o[1]) * s / it.h]; };
const LINES = { vitruvius: fr('vitruvius', 620, 215, 1600, 300), vegetius: fr('vegetius', 250, 390, 830, 530), apicius: fr('apicius', 232, 815, 1345, 940) };
// the Hunt Museum catalogue card (a transcription, typeset), on the same desk further right
const CARD_TXT = ['This 12-sided bronze object has 12 circular holes', 'of different diameters set within 12 equal pentagons,', 'which are marked by spherical projections of equal', 'size at each corner. Concentric grooves are forged', 'around the holes of each of the 12 faces. These objects', 'have been found in the northern provinces of the Roman', 'Empire, yet there is no mention of them in classical', 'sources and their purpose remains unclear.'];
const CARD = { y0: 560, lh: 92, lit: [] };
const cardTex = canvasTex(2500, 1500, (g) => {
  const R = rng(7); g.fillStyle = '#f1ece0'; g.fillRect(0, 0, 2500, 1500);
  for (let i = 0; i < 26000; i++) { g.fillStyle = `rgba(${R() < .5 ? '120,110,90' : '255,255,250'},${0.03 + R() * 0.05})`; g.fillRect(R() * 2500, R() * 1500, 1 + R() * 5, 1 + R() * 1.5); }
  g.strokeStyle = 'rgba(70,110,170,0.35)'; g.lineWidth = 2.5; for (let y = CARD.y0 + 24; y < 1440; y += CARD.lh) { g.beginPath(); g.moveTo(60, y); g.lineTo(2440, y); g.stroke(); }
  g.strokeStyle = 'rgba(200,60,50,0.55)'; g.lineWidth = 4; g.beginPath(); g.moveTo(60, 330); g.lineTo(2440, 330); g.stroke();
  g.fillStyle = '#25231f'; g.font = '500 64px PM'; g.fillText('HUNT MUSEUM, LIMERICK', 90, 150); g.textAlign = 'right'; g.fillText('HCM 157', 2410, 150);
  g.font = '400 52px PM'; g.fillText('Bronze · H 4.9', 2410, 285); g.textAlign = 'left'; g.font = '600 100px PSe'; g.fillText('Dodecahedron', 90, 290);
  g.font = '400 56px PM'; CARD_TXT.forEach((l, i) => g.fillText(l, 90, CARD.y0 + i * CARD.lh));
  CARD.lit = [[90 + g.measureText('Empire, yet ').width, 6, 90 + g.measureText(CARD_TXT[6]).width], [90, 7, 90 + g.measureText(CARD_TXT[7]).width]];
  g.font = '400 36px PM'; g.fillStyle = 'rgba(37,35,31,0.6)'; g.fillText('Description transcribed from the museum’s catalogue record (via Europeana)', 90, 1440);
});
const card = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.15), new THREE.MeshStandardMaterial({ map: cardTex, roughness: 0.85 }));
card.rotation.x = -Math.PI / 2; card.rotation.z = -0.06; card.position.set(0.62, 0.0008, 0.36); card.receiveShadow = true; D.scene.add(card); card.updateMatrixWorld(true);
const cardW = (px, py) => card.localToWorld(V3((px / 2500 - 0.5) * 0.25, (0.5 - py / 1500) * 0.15, 0.001));

// ---- Archive: the museum case with the Tongeren photograph
const labelTex = canvasTex(1100, 550, (g, w, h) => {
  g.fillStyle = '#ece8df'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d1b18';
  const fit = (s, font, max) => { let sz = parseFloat(font.split(' ')[1]); const f = () => font.replace(/\d+px/, `${sz}px`); g.font = f(); while (g.measureText(s).width > max && sz > 10) { sz -= 2; g.font = f(); } return g.font; };
  g.font = fit('Pentagon dodecahedron', '600 84px PSe', w - 120); g.fillText('Pentagon dodecahedron', 60, 130);
  g.font = fit('Bronze · c. AD 150–400', '500 50px PS', w - 120); g.fillText('Bronze · c. AD 150–400', 60, 230);
  g.font = fit('Found at Tongeren, Leopoldwal, 1939', '400 44px PS', w - 120); g.fillText('Found at Tongeren, Leopoldwal, 1939', 60, 320);
  g.fillStyle = 'rgba(29,27,24,0.65)'; g.font = fit('Gallo-Roman Museum Tongeren · inv. 4002', '400 38px PM', w - 120); g.fillText('Gallo-Roman Museum Tongeren · inv. 4002', 60, 470);
});
const tongTex = await S.tex(`${T}/dod_tongeren_holes.png`);
const VT = await vitrine(S, { env: envRoom, base: T, photo: tongTex, aspect: ITEMS.dod_tongeren.w / ITEMS.dod_tongeren.h, label: labelTex });

// ---- Archive: the gallery wall (a Roman painting, a carved relief, a Roman book)
const G = await gallery(S, { env: envRoom, base: T });
const frescoTex = await S.tex(`${T}/fresco.jpg`), reliefTex = await S.tex(`${T}/relief.png`);
const fresco = new THREE.Mesh(new THREE.BoxGeometry(2.718, 1.956, 0.06), [0, 0, 0, 0].map(() => new THREE.MeshStandardMaterial({ color: 0x8a6a50, roughness: 0.9 })).concat([new THREE.MeshStandardMaterial({ map: frescoTex, roughness: 0.95 }), new THREE.MeshStandardMaterial({ color: 0x5a4030 })]));
fresco.position.set(-0.4, 1.55, 0.04); fresco.castShadow = fresco.receiveShadow = true; G.scene.add(fresco);
const relief = new THREE.Mesh(new THREE.PlaneGeometry(0.677, 0.677 * ITEMS.relief.h / ITEMS.relief.w), new THREE.MeshStandardMaterial({ map: reliefTex, transparent: true, alphaTest: 0.3, roughness: 0.8 }));
relief.position.set(2.05, 1.45, 0.05); relief.castShadow = true; G.scene.add(relief);
const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.03, 0.12), new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.6 })); shelf.position.set(2.05, 1.27, 0.06); shelf.castShadow = shelf.receiveShadow = true; G.scene.add(shelf);
const ped = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 0.4), new THREE.MeshStandardMaterial({ color: 0x1b1a1a, roughness: 0.8 })); ped.position.set(-2.55, 0.5, 0.6); ped.castShadow = ped.receiveShadow = true; G.scene.add(ped);
const gb = book(await pageTex('apicius'), 0.197 * ITEMS.apicius.w / ITEMS.apicius.h, 0.197, 0.022); gb.position.set(-2.55, 1.0, 0.6); gb.rotation.y = 0.05; G.scene.add(gb);
G.picture(-2.3, 3.0, 1.6, -2.55, 1.0, 0.6, 9, 0.18); G.picture(-0.4, 3.2, 1.9, -0.4, 1.55, 0, 22, 0.42); G.picture(2.2, 3.0, 1.5, 2.05, 1.45, 0, 10, 0.22);

// ---- Studio: the reconstruction (holes 13.7–20 mm across an 82 mm body, as recorded for the Much Hadham find)
const ST = await studio(S, { env: envStudio });
const HOLE_D = Array.from({ length: 12 }, (_, i) => 13.7 + (20 - 13.7) * [0, 1, .45, .8, .2, .65, .9, .1, .55, .35, .75, .3][i]);
const rinM = (body) => body.userData.k * ((2 / ((1 + Math.sqrt(5)) / 2)) / (2 * Math.tan(Math.PI / 5)));
const M1 = makeDodeca({ size: 0.082, seed: 3 });
const holeFrac = HOLE_D.map(d => (d / 1000) / (2 * rinM(M1)));
const A = makeDodeca({ size: 0.082, seed: 3, holes: holeFrac }); A.position.y = A.userData.lift; ST.top.add(A);
// three sizes (4 / 8.2 / 11 cm) for the size line-up, and two variants for "no two the same"
const SZ = [0.04, 0.082, 0.11].map((s, i) => { const m = makeDodeca({ size: s, seed: 11 + i }); m.position.set([-0.11, 0.0, 0.135][i], m.userData.lift, 0.0); m.visible = false; ST.scene.add(m); return m; });
const golfBump = canvasTex(1024, 512, (g, w, h) => { g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); for (let y = 8; y < h; y += 16) for (let x = (y / 16 % 2) * 8; x < w; x += 16) { const gr = g.createRadialGradient(x, y, 0, x, y, 7); gr.addColorStop(0, '#666'); gr.addColorStop(1, '#fff'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); } }, false);
const golf = new THREE.Mesh(new THREE.SphereGeometry(0.02135, 64, 48), new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.35, bumpMap: golfBump, bumpScale: 1.5 }));
golf.position.set(-0.165, 0.02135, 0.03); golf.castShadow = true; golf.visible = false; ST.scene.add(golf);
const VAR = [{ size: 0.07, seed: 31, knob: 0.17 }, { size: 0.082, seed: 3, holes: holeFrac }, { size: 0.06, seed: 47, knob: 0.26 }].map((o, i) => { const m = makeDodeca(o); m.position.set([-0.1, 0, 0.1][i], m.userData.lift, 0); m.visible = false; ST.scene.add(m); return m; });
// a steel rule (30 cm) in front of the line-up
const ruleTex = canvasTex(3000, 200, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#c9ccd0'); gr.addColorStop(1, '#9ea2a8'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#1a1b1d'; for (let mm = 0; mm <= 300; mm++) { const x = 0 + mm * 10, L = mm % 10 === 0 ? 70 : mm % 5 === 0 ? 48 : 30; g.fillRect(x, 0, 2, L); if (mm % 10 === 0 && mm > 0 && mm < 300) { g.font = '500 54px PS'; g.textAlign = 'center'; g.fillText(String(mm / 10), x, 140); } }
});
const rule = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.0012, 0.02), new THREE.MeshStandardMaterial({ map: ruleTex, metalness: 0.7, roughness: 0.35 })); rule.position.set(-0.012, 0.0006, 0.085); rule.receiveShadow = true; rule.visible = false; ST.scene.add(rule);
// theory props: a candle, a sight line, a yarn loop
const candle = new THREE.Group();
const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.05, 32), new THREE.MeshStandardMaterial({ color: 0xf2e8d0, roughness: 0.5 })); wax.position.y = 0.025; candle.add(wax);
const flame = new THREE.Mesh(new THREE.SphereGeometry(0.004, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffd38a })); flame.scale.set(1, 2.4, 1); flame.position.y = 0.058; candle.add(flame);
const flameL = new THREE.PointLight(0xffb060, 0.0, 0.6, 2); flameL.position.y = 0.06; candle.add(flameL);
candle.visible = false; ST.scene.add(candle);
const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0007, 0.6, 8), new THREE.MeshBasicMaterial({ color: 0xff7a40, transparent: true, opacity: 0.85 })); beam.visible = false; ST.scene.add(beam);
let yarn = null;

// ---- Archive: excavation soil, three coins and a reconstruction half in the ground
const SO = await soil(S, { env: envRoom, base: T });
const coins = [['coin_trajan', 0.034, [-0.05, 0.04], 0.22, 0.4], ['coin_titus', 0.034, [-0.005, 0.07], -0.3, 1.9], ['coin_gallus', 0.027, [-0.085, 0.085], 0.35, 4.0]].map(([id, d, p, tilt, ry]) => {
  const c = coin(null, d); c.children[1].material.map = null; c.position.set(p[0], 0.0135, p[1]); c.rotation.set(tilt, ry, 0.1); SO.scene.add(c); return [c, id];
});
for (const [c, id] of coins) { c.children[1].material.map = await S.tex(`${T}/${ITEMS[id].file}`); c.children[1].material.needsUpdate = true; }
const B = makeDodeca({ size: 0.082, seed: 3, holes: holeFrac, mat: bronze({ color: 0x9a8c78 }) }); B.position.set(0.05, 0.03, 0.0); B.rotation.set(0.5, 0.8, 0.3); SO.scene.add(B);

// ---- Orbit
const SAT = id => ({ id, url: `${T}/${ITEMS['sat_' + id].file}`, box: ITEMS['sat_' + id].box });
const O = await orbit(S, { plates: [SAT('europe'), SAT('england'), SAT('limerick'), SAT('herts'), SAT('hadham')] });
const COUNTRIES = await (await fetch(`${T}/countries.json`)).json();
const FIND = ['United Kingdom', 'France', 'Belgium', 'Netherlands', 'Luxembourg', 'Germany', 'Switzerland', 'Austria', 'Hungary'];
const HADHAM = [0.0717, 51.8616], LIMERICK = [-8.6237, 52.6638];

// ================= shots =================
const shotAt = t => { let i = 0; while (i < SHOT.length - 1 && t >= CUT[i + 1]) i++; return i; };

// ---- desk: the books; the reading light finds each line
const lineW = (id, k = 0.5, v = null) => { const L = LINES[id]; return pageW(BK[id], lerp(L[0], L[2], k), v ?? (L[1] + L[3]) / 2); };
const focusDesk = path([[0, [0.02, 0, 0.02]], [HIT.build - 0.6, [0.0, 0, 0.0]], [HIT.build + 0.2, lineW('vitruvius').toArray()], [HIT.army - 0.3, lineW('vitruvius').toArray()], [HIT.army + 0.3, lineW('vegetius').toArray()], [HIT.eat - 0.3, lineW('vegetius').toArray()], [HIT.eat + 0.3, lineW('apicius').toArray()], [CUT[1], lineW('apicius').toArray()]]);
const camDesk = path([[0, [0.05, 0.95, 1.05]], [HIT.title + 3.5, [0.02, 0.78, 0.86]], [HIT.build + 0.2, [-0.18, 0.40, 0.42]], [HIT.army - 0.3, [-0.20, 0.39, 0.40]], [HIT.army + 0.3, [0.10, 0.34, 0.37]], [HIT.eat - 0.3, [0.11, 0.33, 0.36]], [HIT.eat + 0.3, [0.40, 0.27, 0.30]], [CUT[1], [0.42, 0.25, 0.27]]]);
function shotDesk(t) {
  const f = focusDesk(t); aim(D.cam, camDesk(t).toArray(), f.toArray(), 32);
  const lit = t < HIT.build - 0.3 ? null : t < HIT.army - 0.15 ? 'vitruvius' : t < HIT.eat - 0.15 ? 'vegetius' : 'apicius';
  D.read.intensity = lit ? 14 * ss(seg(t, HIT.build - 0.3, HIT.build + 0.2)) : 0;
  if (lit) { D.read.target.position.copy(lineW(lit)); D.read.position.copy(lineW(lit)).add(V3(0.15, 0.75, 0.35)); D.read.target.updateMatrixWorld(); }
  D.lamp.intensity = 26 * (t < 0.6 ? ss(seg(t, 0.1, 0.6)) : 1);
  S.render(D.scene, D.cam, { exposure: 1.05 });
  return () => {
    const ta = seg(t, 0.8, 1.3) * (1 - seg(t, V.L02.t0 - 0.2, V.L02.t0 + 0.2));
    ui.panel('title', 110, 760, [['500 30px PM', SIG, 'No. 7'], ['600 60px PSe', PAPER, 'The Roman Dodecahedron']], { anchor: 'bl', a: ta, k: seg(t, 0.8, 1.6) });
    const books = [['vitruvius', HIT.build, 'Vitruvius · on building', 'De architectura, ed. 1521 · Library of Congress'], ['vegetius', HIT.army, 'Vegetius · on the army', 'De re militari, ed. 1475 · Library of Congress'], ['apicius', HIT.eat, 'Apicius · on cooking', 'De re coquinaria, ed. 1498 · Library of Congress']];
    books.forEach(([id, t0, title, src], i) => {
      const tOut = i < 2 ? books[i + 1][1] - 0.2 : CUT[1];
      const a = seg(t, t0 - 0.1, t0 + 0.2) * (1 - seg(t, tOut - 0.25, tOut));
      if (a <= 0) return;
      const L = LINES[id], p0 = project(pageW(BK[id], L[0], L[3] + 0.004), D.cam), p1 = project(pageW(BK[id], L[2], L[3] + 0.004), D.cam);
      ui.line([p0, p1], { a, k: eio(seg(t, t0, t0 + 0.6)), w: 3 });
      ui.panel(`book${i}`, 1872 - 64, 120, [['500 30px PS', PAPER, title], ['400 21px PM', DIM, src]], { anchor: 'tr', a, k: seg(t, t0, t0 + 0.5), group: 'book' });
    });
  };
}
// ---- the museum case: the object the books never mention
function shotCase(t, t0, t1, end = false) {
  const u = seg(t, t0, t1);
  const p = end ? path([[0, [0.04, 1.05, 0.40]], [1, [0.12, 1.11, 0.82]]])(u) : path([[0, [0.16, 1.10, 0.95]], [1, [0.03, 1.035, 0.38]]])(u);
  aim(VT.cam, p.toArray(), [0, end ? 1.0 : 1.02, 0], 30);
  VT.obj.lookAt(VT.cam.position.x, VT.obj.position.y, VT.cam.position.z);
  const dim = end ? 1 - ss(seg(t, HIT.endCard + 0.6, DUR - 0.3)) : 1;
  VT.spot.intensity = 18 * dim * (end ? 1 : ss(seg(t, t0, t0 + 0.5))); VT.fill.intensity = 3 * dim;
  S.render(VT.scene, VT.cam, { exposure: 1.0 });
  return () => {
    if (end) {
      const e = seg(t, HIT.endCard, HIT.endCard + 0.6);
      ui.panel('end', 110, 760, [['500 30px PM', SIG, 'No. 7'], ['600 56px PSe', PAPER, 'The Roman Dodecahedron'], ['500 28px PM', DIM, 'purpose: unclear']], { anchor: 'bl', a: e, k: e });
    }
  };
}
// ---- Orbit: Europe, the provinces where they turn up
function outline(name, cam, k, a, dash = null) {
  for (const ring of COUNTRIES[name] || []) {
    const pts = ring.map(([lon, lat]) => project(g2w(lon, lat), cam)).filter(p => p[2] < 1);
    ui.line(pts, { a, k, w: 1.6, dash, col: dash ? 'rgba(248,248,244,0.75)' : SIG });
  }
}
function shotEurope(t, t0, t1) {
  const u = seg(t, t0, t1), alt = Math.exp(lerp(Math.log(3300), Math.log(2500), eio(u)));
  O.place(lerp(6.5, 7.5, u), lerp(46.5, 47.2, u), alt, 0.32, lerp(-0.04, 0.03, u)); O.setAlt(alt, { england: [900, 500], limerick: [400, 200], herts: [160, 90], hadham: [30, 16] });
  S.render(O.scene, O.cam);
  return () => {
    orbitInstruments(t, alt, 'NASA Blue Marble');
    FIND.forEach((n, i) => outline(n, O.cam, eio(seg(t, HIT.found - 1.2 + i * 0.22, HIT.found - 0.2 + i * 0.22)), 1));
    const ia = seg(t, HIT.bronze - 2.6, HIT.bronze - 2.0); outline('Italy', O.cam, eio(ia), ia, [6, 6]);
    if (ia > 0) { const p = project(g2w(12.5, 42.6), O.cam); ui.callout('italy', [p[0], p[1]], [['500 24px PS', PAPER, 'Italy: none found'], ['400 20px PM', DIM, 'the Roman heartland']], { a: ia, k: ia, dx: 120, dy: 40 }); }
    const ra = seg(t, HIT.found - 0.4, HIT.found + 0.1);
    ui.panel('known', 1872 - 64, 130, [['500 80px PM', SIG, '≈ 130'], ['500 26px PS', PAPER, 'known, from Britain to Hungary'], ['400 22px PM', DIM, 'cast bronze · 2nd–4th century AD']], { anchor: 'tr', a: ra, k: ra });
  };
}
function orbitInstruments(t, alt, credit) {
  ui.panel('alt', 110, 100, [['400 20px PM', DIM, 'ALTITUDE'], ['500 32px PM', PAPER, alt > 20 ? `${Math.round(alt).toLocaleString('en')} km` : `${alt.toFixed(1)} km`]], { group: 'alt' });
  ui.panel('credit', 110, 1040 - 96, [['400 20px PM', DIM, credit]], { anchor: 'bl', bar: false, bg: 0.6 });
}
const S2 = 'Sentinel-2 cloudless 2016 by EOX (CC BY 4.0)';
// ---- Orbit: down to Much Hadham, Hertfordshire
function shotHadham(t, t0, t1) {
  const u = seg(t, t0, t1), k = eio(seg(u, 0.0, 0.92));
  const alt = Math.exp(lerp(Math.log(2200), Math.log(5.5), k));
  const lon = lerp(4.5, HADHAM[0], ss(seg(k, 0, 0.8))), lat = lerp(49.5, HADHAM[1], ss(seg(k, 0, 0.8)));
  O.place(lon, lat, alt, lerp(0.30, 0.18, k), lerp(0.05, -0.1, k)); O.setAlt(alt, { england: [900, 500], limerick: [400, 200], herts: [160, 90], hadham: [30, 16] });
  S.render(O.scene, O.cam);
  return () => {
    orbitInstruments(t, alt, alt > 700 ? 'NASA Blue Marble' : `${S2} · contains modified Copernicus Sentinel data 2016`);
    const pa = seg(t, t1 - 1.8, t1 - 1.2);
    if (pa > 0) { const p = project(g2w(...HADHAM), O.cam); ui.ring([p[0], p[1]], 26, { k: eo(pa) }); ui.callout('pin', [p[0], p[1]], [['500 28px PS', PAPER, 'Much Hadham, Hertfordshire'], ['400 21px PM', DIM, 'find recorded 2018 · PAS 941889']], { a: pa, k: pa, dx: 130, dy: -90 }); }
  };
}
function shotLimerick(t, t0, t1) {
  const u = seg(t, t0, t1), k = eio(u);
  const alt = Math.exp(lerp(Math.log(1500), Math.log(70), k));
  O.place(lerp(-4.5, LIMERICK[0], ss(k)), lerp(51.0, LIMERICK[1], ss(k)), alt, 0.25, 0.08); O.setAlt(alt, { england: [900, 500], limerick: [400, 200], herts: [160, 90], hadham: [30, 16] });
  S.render(O.scene, O.cam);
  return () => {
    orbitInstruments(t, alt, alt > 700 ? 'NASA Blue Marble' : `${S2} · contains modified Copernicus Sentinel data 2016`);
    const pa = seg(t, t0 + 1.0, t0 + 1.5);
    if (pa > 0) { const p = project(g2w(...LIMERICK), O.cam); ui.ring([p[0], p[1]], 22, { k: eo(pa) }); ui.callout('pinl', [p[0], p[1]], [['500 28px PS', PAPER, 'Hunt Museum, Limerick'], ['400 21px PM', DIM, 'Ireland · holds HCM 157']], { a: pa, k: pa, dx: 130, dy: -80 }); }
  };
}
// ---- Studio: what it is
const W3 = (m, v) => m.localToWorld(v.clone());
function frontFace(m, cam) {                          // the face turned most towards the camera
  let best = 0, bd = -2; const to = cam.position.clone();
  m.userData.faces.forEach((f, i) => { const c = W3(m, f.c), n = W3(m, f.c.clone().add(f.n)).sub(c).normalize(), d = n.dot(to.clone().sub(c).normalize()); if (d > bd) { bd = d; best = i; } });
  return best;
}
const circleW = (m, f, r) => Array.from({ length: 49 }, (_, i) => { const a = i / 48 * Math.PI * 2; return W3(m, f.c.clone().addScaledVector(f.u, Math.cos(a) * r).addScaledVector(f.w, Math.sin(a) * r).addScaledVector(f.n, 0.01)); });
function studioMode(mode) {
  A.visible = mode === 'one' || mode === 'theory'; ST.table.visible = A.visible; ST.top.visible = A.visible;
  SZ.forEach(m => m.visible = mode === 'sizes'); golf.visible = rule.visible = mode === 'sizes';
  VAR.forEach(m => m.visible = mode === 'variants');
}
function shotFeatures(t, t0, t1) {
  studioMode('one'); candle.visible = beam.visible = false; if (yarn) yarn.visible = false;
  ST.top.rotation.set(0, 0.35 + (t - t0) * 0.16, 0); A.rotation.set(0, 0, 0);
  const u = seg(t, t0, t1);
  aim(ST.cam, path([[0, [0.02, 0.15, 0.42]], [1, [-0.02, 0.10, 0.27]]])(u).toArray(), [0, 0.042, 0], 30);
  S.render(ST.scene, ST.cam);
  return () => {
    reconBadge(t);
    A.updateMatrixWorld(true); const m = A, fi = frontFace(m, ST.cam), f = m.userData.faces[fi];
    const kf = eio(seg(t, HIT.faces - 0.1, HIT.faces + 0.8));
    if (kf > 0) { const pts = [...f.verts, f.verts[0]].map(v => project(W3(m, v.clone().addScaledVector(f.n, 0.02)), ST.cam)); ui.line(pts, { k: kf, w: 2.6 }); }
    const af = seg(t, HIT.faces + 0.3, HIT.faces + 0.8) * (1 - seg(t, HIT.notSame - 0.6, HIT.notSame - 0.2));
    const pv = project(W3(m, f.verts[1].clone()), ST.cam);
    ui.callout('face', pv, [['500 26px PM', PAPER, '12 pentagonal faces']], { a: af, k: af, dx: 150, dy: -110 });
    // the knob nearest the upper left of the frame
    const ks = m.userData.knobs.map(v => project(W3(m, v), ST.cam)).filter(p => p[2] < 1).sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
    const ak = seg(t, HIT.knob - 0.1, HIT.knob + 0.4) * (1 - seg(t, HIT.notSame - 0.6, HIT.notSame - 0.2));
    if (ks[0]) { ui.ring(ks[0], 22, { a: ak, k: eo(ak) }); ui.callout('knob', ks[0], [['500 26px PM', PAPER, '20 knobs, one per corner']], { a: ak, k: ak, dx: -150, dy: -90 }); }
    const ah = seg(t, HIT.hole - 0.1, HIT.hole + 0.4);
    const hc = project(W3(m, f.c.clone().addScaledVector(f.n, 0.01)), ST.cam);
    ui.line(circleW(m, f, f.r).map(v => project(v, ST.cam)), { a: ah, k: eo(ah), w: 2.6 });
    ui.callout('hole', hc, [['500 26px PM', PAPER, 'a hole in every face']], { a: ah * (1 - seg(t, HIT.notSame - 0.6, HIT.notSame - 0.2)), k: ah, dx: 170, dy: 120 });
    // not the same size: the front hole against its neighbour, both measured on the model
    const an = seg(t, HIT.notSame - 0.4, HIT.notSame + 0.1);
    if (an > 0) {
      const nb = m.userData.faces.map((g, i) => [i, W3(m, g.c).distanceTo(W3(m, f.c)), g]).filter(([i]) => i !== fi).sort((a, b) => a[1] - b[1]).map(x => x[0])
        .find(i => { const g = m.userData.faces[i], c = W3(m, g.c), n = W3(m, g.c.clone().add(g.n)).sub(c).normalize(); return n.dot(ST.cam.position.clone().sub(c).normalize()) > 0.35; });
      const g = m.userData.faces[nb], da = Math.round(HOLE_D[fi] * 10) / 10, db = Math.round(HOLE_D[nb] * 10) / 10;
      ui.line(circleW(m, g, g.r).map(v => project(v, ST.cam)), { a: an, k: eo(an), w: 2.6 });
      ui.callout('ha', hc, [['500 30px PM', SIG, `Ø ${da} mm`]], { a: an, k: an, dx: 170, dy: 120 });
      ui.callout('hb', project(W3(m, g.c.clone().addScaledVector(g.n, 0.01)), ST.cam), [['500 30px PM', SIG, `Ø ${db} mm`]], { a: an, k: an, dx: -170, dy: -110 });
    }
  };
}
function reconBadge(t) { ui.panel('recon', 1872 - 64, 100, [['500 22px PM', DIM, '3D RECONSTRUCTION'], ['400 20px PM', DIM, 'sizes as recorded']], { anchor: 'tr', group: 'recon', bar: false, bg: 0.55 }); }
function shotMeasure(t, t0, t1) {
  studioMode('one'); candle.visible = beam.visible = false; if (yarn) yarn.visible = false;
  ST.top.rotation.set(0, 1.2 + (t - t0) * 0.05, 0); A.rotation.set(0, 0, 0);
  aim(ST.cam, path([[0, [0.0, 0.07, 0.36]], [1, [0.0, 0.065, 0.32]]])(seg(t, t0, t1)).toArray(), [0, 0.042, 0], 30);
  S.render(ST.scene, ST.cam);
  return () => {
    reconBadge(t);
    const r = V3(1, 0, 0).applyQuaternion(ST.cam.quaternion), c = V3(0, 0.018 + 0.041, 0);
    const L = project(c.clone().addScaledVector(r, -0.041), ST.cam), Rr = project(c.clone().addScaledVector(r, 0.041), ST.cam);
    const y = Math.max(L[1], Rr[1]) + 150, k = eio(seg(t, HIT.mm82 - 0.4, HIT.mm82 + 0.5));
    ui.line([[L[0], L[1]], [L[0], y + 14]], { k: seg(t, t0, t0 + 0.3), w: 1.6 }); ui.line([[Rr[0], Rr[1]], [Rr[0], y + 14]], { k: seg(t, t0, t0 + 0.3), w: 1.6 });
    ui.line([[L[0], y], [lerp(L[0], Rr[0], k), y]], { w: 2.6 });
    if (k > 0.98) ui.panel('d82', (L[0] + Rr[0]) / 2 - 90, y + 26, [['500 44px PM', SIG, '82 mm']], {});
    const pa = seg(t, HIT.range - 0.4, HIT.range + 0.1);
    ui.panel('had', 110, 140, [['500 26px PS', PAPER, 'Much Hadham, Hertfordshire · 2018'], ['500 30px PM', SIG, '82 mm  ·  247 g'], ['500 26px PM', PAPER, 'holes 13.7 – 20 mm'], ['400 20px PM', DIM, 'Portable Antiquities Scheme 941889']], { a: seg(t, t0 + 0.3, t0 + 0.8), k: seg(t, t0 + 0.3, t0 + 1.0) });
    if (pa > 0) {
      A.updateMatrixWorld(true); const fi = frontFace(A, ST.cam), f = A.userData.faces[fi];
      ui.line(circleW(A, f, f.r).map(v => project(v, ST.cam)), { a: pa, k: eo(pa), w: 2.6 });
    }
  };
}
function shotSizes(t, t0, t1) {
  studioMode('sizes'); candle.visible = beam.visible = false; if (yarn) yarn.visible = false;
  SZ.forEach((m, i) => m.rotation.set(0, 0.4 + i * 0.7 + (t - t0) * 0.03, 0));
  aim(ST.cam, path([[0, [0.02, 0.17, 0.55]], [1, [0.0, 0.15, 0.50]]])(seg(t, t0, t1)).toArray(), [0.0, 0.035, 0.0], 30);
  S.render(ST.scene, ST.cam);
  return () => {
    reconBadge(t);
    const labs = [[0, HIT.golf - 0.3, '4 cm', 'smallest'], [1, HIT.golf + 0.6, '8.2 cm', 'Much Hadham'], [2, HIT.grapefruit - 0.8, '11 cm', 'largest']];
    for (const [i, t0_, a1, a2] of labs) {
      const m = SZ[i], top = project(V3(m.position.x, m.userData.lift * 2 + 0.006, 0), ST.cam), a = seg(t, t0_, t0_ + 0.4);
      ui.panel(`sz${i}`, top[0] - 80, top[1] - 24, [['500 30px PM', SIG, a1], ['400 21px PS', DIM, a2]], { anchor: 'bl', a, k: a, group: 'sz' + i });
    }
    const ga = seg(t, HIT.golf, HIT.golf + 0.4); const gp = project(V3(golf.position.x, 0.0, golf.position.z + 0.03), ST.cam);
    ui.panel('golf', gp[0] - 60, gp[1] + 28, [['400 21px PS', PAPER, 'golf ball · 4.3 cm']], { a: ga, k: ga });
  };
}
// ---- the gallery: a Roman painting, a carved relief, a Roman book — none shows one
const camGal = path([[0, [-2.15, 1.35, 1.75]], [HIT.noText + 0.6, [-2.2, 1.3, 1.55]], [HIT.noPaint - 0.35, [-0.45, 1.5, 3.1]], [HIT.noCarve - 0.6, [-0.3, 1.5, 3.0]], [HIT.noCarve - 0.1, [1.9, 1.45, 1.55]], [CUT[8], [2.0, 1.45, 1.45]]]);
const tgtGal = path([[0, [-2.55, 1.0, 0.6]], [HIT.noText + 0.6, [-2.55, 1.0, 0.6]], [HIT.noPaint - 0.35, [-0.4, 1.5, 0]], [HIT.noCarve - 0.6, [-0.3, 1.5, 0]], [HIT.noCarve - 0.1, [2.05, 1.42, 0]], [CUT[8], [2.05, 1.42, 0]]]);
function shotGallery(t) {
  aim(G.cam, camGal(t).toArray(), tgtGal(t).toArray(), 34);
  S.render(G.scene, G.cam, { exposure: 1.05 });
  return () => {
    const items = [[HIT.noText, 'A Roman text', 'Apicius, De re coquinaria · LoC', V3(-2.55, 1.04, 0.6)], [HIT.noPaint, 'A Roman painting', 'Boscoreale, c. 50–40 BC · The Met 03.14.4', V3(-0.4, 2.55, 0.06)], [HIT.noCarve, 'A Roman carving', 'relief with prizes, 2nd c. AD · The Met 59.11.19', V3(2.05, 1.8, 0.06)]];
    items.forEach(([t0, a1, a2, p], i) => {
      const tOut = i < 2 ? items[i + 1][0] - 0.3 : CUT[8];
      const a = seg(t, t0 - 0.2, t0 + 0.2) * (1 - seg(t, tOut - 0.3, tOut));
      ui.panel(`gal${i}`, 1872 - 64, 120, [['500 30px PS', PAPER, a1], ['400 21px PM', DIM, a2], ['500 26px PM', SIG, 'no dodecahedron']], { anchor: 'tr', a, k: a, group: 'gal' });
    });
  };
}
// ---- the theories, acted out by the model
function shotTheories(t, t0, t1) {
  const variants = t > HIT.noTwo - 0.5;
  studioMode(variants ? 'variants' : 'theory');
  const up = A.userData.faces.reduce((b, f) => f.n.y > b.n.y ? f : b);           // the face that points up
  // the die: a tumble across the turntable, then it settles on another face
  const dk = eio(seg(t, HIT.dice - 0.15, HIT.dice + 1.0));
  A.rotation.set(dk * Math.PI * 1.25, dk * 0.8, dk * Math.PI * 0.75); A.position.set(lerp(0, 0.03, Math.sin(dk * Math.PI)), A.userData.lift + 0.025 * Math.sin(dk * Math.PI), 0);
  ST.top.rotation.set(0, 0.5 + (t - t0) * 0.1, 0);
  A.updateMatrixWorld(true);
  // candle in the top hole
  const ca = t > HIT.candle - 0.2 && t < HIT.survey - 0.2; candle.visible = ca && !variants;
  if (ca) { const c = W3(A, up.c); candle.position.copy(c).add(V3(0, -0.006, 0)); flameL.intensity = 0.25 + 0.05 * Math.sin(t * 31) + 0.04 * Math.sin(t * 17.3); flame.scale.set(1, 2.4 + 0.25 * Math.sin(t * 23), 1); }
  // a sight line through two opposite holes
  const ba = t > HIT.survey - 0.1 && t < HIT.dice - 0.15; beam.visible = ba && !variants;
  if (ba) { const side = A.userData.faces.reduce((b, f) => Math.abs(f.n.y) < 0.3 && f.n.x > b.n.x ? f : b, { n: V3(-1, 0, 0) }); const c = W3(A, side.c), d = W3(A, side.c.clone().add(side.n)).sub(c).normalize(); beam.position.copy(A.getWorldPosition(new THREE.Vector3())).addScaledVector(d, 0.25); beam.quaternion.setFromUnitVectors(V3(0, 1, 0), d); beam.material.opacity = 0.85 * seg(t, HIT.survey - 0.1, HIT.survey + 0.3); }
  // yarn wound round the top knobs
  if (!yarn) { const ks = A.userData.knobs.filter(k => k.clone().normalize().dot(up.n) > 0.55).sort((a, b) => Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x)); const crv = new THREE.CatmullRomCurve3(ks.map(k => k.clone().multiplyScalar(0.93).add(up.n.clone().multiplyScalar(0.05))), true); yarn = new THREE.Mesh(new THREE.TubeGeometry(crv, 120, 0.035, 8, true), new THREE.MeshStandardMaterial({ color: 0xa8322a, roughness: 0.95 })); A.add(yarn); }
  yarn.visible = t > HIT.knit - 0.15 && t < HIT.problem + 0.4 && !variants;
  VAR.forEach((m, i) => m.rotation.set(0, 0.3 + i * 1.1 + (t - t0) * 0.05, 0));
  const cp = variants ? [[0, [0.0, 0.16, 0.52]], [1, [0.0, 0.15, 0.48]]] : [[0, [0.05, 0.13, 0.36]], [1, [-0.04, 0.12, 0.33]]];
  aim(ST.cam, path(cp)(seg(t, variants ? HIT.noTwo - 0.5 : t0, variants ? t1 : HIT.noTwo - 0.5)).toArray(), [0, 0.045, 0], 30);
  S.render(ST.scene, ST.cam);
  return () => {
    reconBadge(t);
    const th = [['Candle holder', HIT.candle], ['Surveying instrument', HIT.survey], ['Die (a game piece)', HIT.dice], ['Glove-knitting tool', HIT.knit]];
    const rows = [['500 24px PS', DIM, 'Theories']].concat(th.filter(([, t0_]) => t > t0_ - 0.15).map(([s]) => ['500 32px PS', PAPER, s]));
    const a = seg(t, V.L10.t0, V.L10.t0 + 0.35);
    const box = ui.panel('theories', 110, 120, rows, { a, k: a });
    if (box) th.forEach(([s], i) => {
      const k = eio(seg(t, HIT.problem + i * 0.45, HIT.problem + i * 0.45 + 0.35)); if (k <= 0 || rows.length < i + 2) return;
      ui.c.font = '500 32px PS'; const w = ui.c.measureText(s).width, yy = box.y0 + 14 + Math.round(24 * 1.22) + Math.round(32 * 1.22) * i + 20;
      ui.line([[box.x0 + 22, yy], [box.x0 + 25 + (w + 6) * k, yy]], { w: 3 });
    });
    if (variants) {
      const na = seg(t, HIT.noTwo - 0.2, HIT.noTwo + 0.3);
      ui.panel('notwo', 1872 - 64, 260, [['500 28px PM', SIG, 'no two made the same']], { anchor: 'tr', a: na, k: na });
    }
  };
}
// ---- the catalogue card on the desk
function shotCard(t, t0, t1) {
  const u = seg(t, t0, t1), f = cardW(1300, CARD.y0 + 5.5 * CARD.lh);
  aim(D.cam, path([[0, [0.55, 0.36, 0.62]], [1, [0.6, 0.22, 0.52]]])(u).toArray(), f.toArray(), 32);
  const lp = cardW(1300, CARD.y0 + 6.5 * CARD.lh);
  D.read.intensity = 12 * seg(t, HIT.mention - 0.5, HIT.mention); D.read.target.position.copy(lp); D.read.position.copy(lp).add(V3(0.1, 0.7, 0.3)); D.read.target.updateMatrixWorld(); D.lamp.intensity = 20;
  S.render(D.scene, D.cam, { exposure: 1.05 });
  return () => {
    CARD.lit.forEach(([x0, row, x1], i) => {
      const y = CARD.y0 + row * CARD.lh + 16, k = eio(seg(t, HIT.mention - 0.4 + i * 1.6, HIT.mention + 0.8 + i * 1.6));
      ui.line([project(cardW(x0, y), D.cam), project(cardW(x1, y), D.cam)].map(p => [p[0], p[1]]), { k, w: 3 });
    });
    const a = seg(t, t0 + 0.2, t0 + 0.6);
    ui.panel('rec', 1872 - 64, 120, [['500 28px PS', PAPER, 'Hunt Museum catalogue · HCM 157'], ['400 21px PM', DIM, 'transcribed record, via Europeana']], { anchor: 'tr', a, k: a });
  };
}
// ---- the soil: buried with the savings
function shotSoil(t, t0, t1) {
  const u = seg(t, t0, t1);
  aim(SO.cam, path([[0, [0.05, 0.40, 0.46]], [1, [-0.01, 0.22, 0.30]]])(u).toArray(), [-0.005, 0.012, 0.04], 30);
  S.render(SO.scene, SO.cam, { exposure: 1.0 });
  return () => {
    const a = seg(t, HIT.hoards - 0.3, HIT.hoards + 0.2);
    ui.panel('hoard', 110, 120, [['500 28px PS', PAPER, 'Several were found in coin hoards'], ['400 21px PM', DIM, 'coins: sestertii, The Met · object: reconstruction']], { a, k: a });
  };
}

// ================= render =================
const NOSUBS = /nosubs=1/.test(location.search);
function render(t) {
  const i = shotAt(t), t0 = CUT[i], t1 = CUT[i + 1], s = SHOT[i];
  const draw = s === 'desk' ? shotDesk(t) : s === 'case' ? shotCase(t, t0, t1) : s === 'europe' ? shotEurope(t, t0, t1) : s === 'features' ? shotFeatures(t, t0, t1)
    : s === 'hadham' ? shotHadham(t, t0, t1) : s === 'measure' ? shotMeasure(t, t0, t1) : s === 'sizes' ? shotSizes(t, t0, t1) : s === 'gallery' ? shotGallery(t)
      : s === 'theories' ? shotTheories(t, t0, t1) : s === 'limerick' ? shotLimerick(t, t0, t1) : s === 'card' ? shotCard(t, t0, t1) : s === 'soil' ? shotSoil(t, t0, t1) : shotCase(t, t0, t1, true);
  ui.begin();
  // vignette, then the shot's marks, then subtitles, then the dip through black at each cut
  const g = ui.c.createRadialGradient(960, 540, 420, 960, 540, 1150); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)'); ui.c.fillStyle = g; ui.c.fillRect(0, 0, 1920, 1080);
  draw();
  if (!NOSUBS) for (const q of CUES) if (t >= q.t0 && t < q.t1) ui.subtitle(q.en, Math.min(seg(t, q.t0, q.t0 + 0.12), 1 - seg(t, q.t1 - 0.12, q.t1)));
  const dc = Math.min(...CUT.slice(1, -1).map(c => Math.abs(t - c))); ui.fade(1 - seg(dc, 0, 0.16));
  ui.fade(1 - seg(t, 0, 0.5));
}
window.DUR = DUR;
window.render = render;
window.TEXTS = t => { render(t); return ui.texts(); };
window.LAYOUT = t => { render(t); return ui.check(); };
window.READY = true;
