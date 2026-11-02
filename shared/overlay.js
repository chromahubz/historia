// Shared 2D overlay for the Historia films: plates, callouts, subtitles, title cards. One visual system for all three
// worlds. Every plate is sized from its measured text, clamped inside the safe frame, and registered with its texts,
// so LAYOUT(t) can prove that each text sits inside its plate and that no two plates touch.
export const SIG = '#ff5a1f', PAPER = 'rgba(248,248,244,0.97)', DIM = 'rgba(248,248,244,0.68)', INK = '#15171a';
export const SAFE = [48, 40, 1872, 1040];              // x0, y0, x1, y1
const PLATE_Y1 = 944;                                   // ordinary plates stay above the subtitle band (960–1024)
const PAD_X = 22, PAD_Y = 14, GAP = 6;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const eo = x => 1 - Math.pow(1 - x, 3);

export function makeUI(canvas) {
  const c = canvas.getContext('2d');
  let PL = [], TX = [];
  const size = f => parseFloat(f.split(' ')[1]);
  function measure(rows) {
    let w = 0, h = 0; const lines = [];
    for (const r of rows) { c.font = r[0]; const m = c.measureText(r[2]), lh = Math.round(size(r[0]) * 1.22); lines.push({ r, w: m.width, lh }); w = Math.max(w, m.width); h += lh; }
    return { w: Math.ceil(w) + PAD_X * 2 + 3, h: h + PAD_Y * 2 - Math.round(size(rows[rows.length - 1][0]) * 0.22) + 4, lines };
  }
  // a plate of rows [font, colour, text] at (x, y) by its anchor corner; returns its box. a: opacity, k: wipe 0..1
  function panel(id, x, y, rows, { anchor = 'tl', a = 1, k = 1, group = id, bar = true, bg = 0.82 } = {}) {
    if (a <= 0.01) return null;
    const m = measure(rows);
    let x0 = anchor.includes('r') ? x - m.w : x, y0 = anchor.includes('b') ? y - m.h : y;
    x0 = clamp(x0, SAFE[0], SAFE[2] - m.w); y0 = clamp(y0, SAFE[1], PLATE_Y1 - m.h);
    // never on top of a plate already drawn this frame: slide below it, or above it, whichever is nearer and fits
    for (let n = 0; n < 8; n++) {
      const hit = PL.find(b => b.group !== group && x0 < b.x1 + GAP && b.x0 < x0 + m.w + GAP && y0 < b.y1 + GAP && b.y0 < y0 + m.h + GAP);
      if (!hit) break;
      const dn = hit.y1 + GAP + 2, up = hit.y0 - GAP - 2 - m.h;
      const okDn = dn + m.h <= PLATE_Y1, okUp = up >= SAFE[1];
      y0 = okDn && (!okUp || Math.abs(dn - y0) <= Math.abs(up - y0)) ? dn : okUp ? up : y0;
      if (!okDn && !okUp) { x0 = clamp(hit.x0 - GAP - 2 - m.w, SAFE[0], SAFE[2] - m.w); }
    }
    c.save(); c.globalAlpha = a;
    c.beginPath(); c.rect(x0 - 2, y0 - 2, (m.w + 4) * eo(k), m.h + 4); c.clip();
    c.fillStyle = `rgba(14,15,17,${bg})`; c.beginPath(); c.roundRect(x0, y0, m.w, m.h, 3); c.fill();
    if (bar) { c.fillStyle = SIG; c.fillRect(x0, y0, 3, m.h); }
    let yy = y0 + PAD_Y;
    m.lines.forEach((L, i) => {
      const s = size(L.r[0]); yy += Math.round(s * 0.98);
      c.font = L.r[0]; c.fillStyle = L.r[1]; c.textBaseline = 'alphabetic'; c.fillText(L.r[2], x0 + PAD_X + 3, yy);
      yy += L.lh - Math.round(s * 0.98);
      if (a > 0.6 && k > 0.99) TX.push({ id: `${id}.${i}`, text: L.r[2], plate: id, x0: x0 + PAD_X + 3, y0: yy - L.lh, x1: x0 + PAD_X + 3 + L.w, y1: yy - L.lh + s * 1.12 });
    });
    c.restore();
    const box = { id, group, x0, y0, x1: x0 + m.w, y1: y0 + m.h, a };
    if (a > 0.3) PL.push(box);
    return box;
  }
  // a callout: a dot on the subject, a leader, a one- or two-line plate; side chosen to stay in frame
  function callout(id, p, rows, { a = 1, k = 1, dx = 90, dy = -70, group = id } = {}) {
    if (a <= 0.01 || !p) return null;
    const m = measure(rows);
    let sx = Math.sign(dx) || 1, sy = Math.sign(dy) || -1;
    if (sx > 0 && p[0] + dx + m.w > SAFE[2]) sx = -1; else if (sx < 0 && p[0] + dx - m.w < SAFE[0]) sx = 1;
    if (sy < 0 && p[1] + dy - m.h < SAFE[1]) sy = 1; else if (sy > 0 && p[1] + Math.abs(dy) + m.h > PLATE_Y1) sy = -1;
    const e = [p[0] + Math.abs(dx) * sx, p[1] + Math.abs(dy) * sy];
    const box = panel(id, e[0], e[1], rows, { anchor: (sy < 0 ? 'b' : 't') + (sx > 0 ? 'l' : 'r'), a, k: clamp((k - 0.35) / 0.65, 0, 1), group });
    // the leader runs to the plate's nearest corner, wherever the plate settled
    const q = box ? [sx > 0 ? box.x0 : box.x1, sy < 0 ? box.y1 : box.y0] : e;
    c.save(); c.globalAlpha = a;
    c.strokeStyle = SIG; c.lineWidth = 2; const kk = eo(clamp(k * 1.6, 0, 1));
    c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[0] + (q[0] - p[0]) * kk, p[1] + (q[1] - p[1]) * kk); c.stroke();
    c.fillStyle = SIG; c.beginPath(); c.arc(p[0], p[1], 4.5, 0, Math.PI * 2); c.fill();
    c.restore();
    return box;
  }
  function subtitle(text, a) {
    if (a <= 0.01) return;
    c.font = '500 36px PS'; const w = Math.ceil(c.measureText(text).width) + 60, h = 64, x0 = Math.round((1920 - w) / 2), y0 = 960;
    c.save(); c.globalAlpha = a; c.fillStyle = 'rgba(14,15,17,0.82)'; c.beginPath(); c.roundRect(x0, y0, w, h, 3); c.fill();
    c.fillStyle = SIG; c.fillRect(x0, y0, 3, h);
    c.fillStyle = PAPER; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillText(text, 960, y0 + 44); c.textAlign = 'left'; c.restore();
    if (a > 0.3) PL.push({ id: 'subtitle', group: 'subtitle', x0, y0, x1: x0 + w, y1: y0 + h, a });
    if (a > 0.6) TX.push({ id: 'subtitle', text, plate: 'subtitle', x0: x0 + 30, y0: y0 + 14, x1: x0 + w - 30, y1: y0 + 54 });
  }
  // a thin line in the signal colour (rulers, dimension lines, outlines)
  function line(pts, { a = 1, w = 2, dash = null, k = 1, col = SIG } = {}) {
    if (a <= 0.01 || pts.length < 2) return;
    c.save(); c.globalAlpha = a; c.strokeStyle = col; c.lineWidth = w; if (dash) c.setLineDash(dash);
    let tot = 0; for (let i = 1; i < pts.length; i++) tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    let left = tot * k; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length && left > 0; i++) {
      const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]), f = Math.min(1, left / d);
      c.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f); left -= d;
    }
    c.stroke(); c.restore();
  }
  function ring(p, r, { a = 1, k = 1, w = 2.4, dash = null } = {}) {
    if (a <= 0.01) return; c.save(); c.globalAlpha = a; c.strokeStyle = SIG; c.lineWidth = w; if (dash) c.setLineDash(dash);
    c.beginPath(); c.arc(p[0], p[1], r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); c.stroke(); c.restore();
  }
  function fade(a, col = '#000') { if (a <= 0) return; c.save(); c.globalAlpha = a; c.fillStyle = col; c.fillRect(0, 0, 1920, 1080); c.restore(); }
  function begin() { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 1920, 1080); PL = []; TX = []; }
  // the layout rules: texts inside their plates, plates inside the safe frame, no two plates (of different groups) closer than GAP
  function check() {
    const bad = [];
    for (const t of TX) { const p = PL.find(q => q.id === t.plate); if (!p) continue; if (t.x0 < p.x0 + 4 || t.x1 > p.x1 - 4 || t.y0 < p.y0 - 2 || t.y1 > p.y1 + 2) bad.push(`text "${t.text}" spills out of plate ${t.plate}`); }
    for (const p of PL) if (p.x0 < SAFE[0] - 1 || p.y0 < SAFE[1] - 1 || p.x1 > SAFE[2] + 1 || p.y1 > (p.id === 'subtitle' ? SAFE[3] : PLATE_Y1) + 1) bad.push(`plate ${p.id} leaves the safe frame`);
    for (let i = 0; i < PL.length; i++) for (let j = i + 1; j < PL.length; j++) {
      const a = PL[i], b = PL[j]; if (a.group === b.group) continue;
      if (a.x0 < b.x1 + GAP && b.x0 < a.x1 + GAP && a.y0 < b.y1 + GAP && b.y0 < a.y1 + GAP) bad.push(`plates ${a.id} and ${b.id} overlap`);
    }
    return bad;
  }
  return { c, panel, callout, subtitle, line, ring, fade, begin, check, texts: () => TX.map(t => ({ id: t.id, text: t.text, x0: t.x0, y0: t.y0, x1: t.x1, y1: t.y1 })) };
}
export { seg, eo, clamp };
