// Layout check for a Historia film page: samples the whole film and reports every frame where a text leaves its plate,
// a plate leaves the safe frame, or two plates overlap. usage (from the library root):
//   node <film>/shared/layoutcheck.mjs <film> [--step 0.1]       exits 1 on any violation
import path from 'path'; import { pathToFileURL } from 'url';
const LIB = process.env.LIB || process.cwd();
const { openDemo, closeServer } = await import(pathToFileURL(path.join(LIB, 'core/render/page.mjs')).href);
const dir = process.argv[2], i = process.argv.indexOf('--step'), step = i > 0 ? +process.argv[i + 1] : 0.1;
const { browser, page } = await openDemo(dir);
const dur = await page.evaluate(() => window.DUR);
const seen = new Map();
for (let t = 0; t < dur; t += step) {
  const bad = await page.evaluate(x => window.LAYOUT(x), +t.toFixed(3));
  for (const b of bad) { if (!seen.has(b)) seen.set(b, []); seen.get(b).push(+t.toFixed(2)); }
}
await browser.close(); closeServer();
if (!seen.size) { console.log(`layout ok: ${Math.round(dur / step)} frames checked`); process.exit(0); }
for (const [b, ts] of seen) console.log(`${b}  at ${ts[0]}–${ts[ts.length - 1]} s (${ts.length} samples)`);
process.exit(1);
