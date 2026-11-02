// A Roman dodecahedron as real geometry: twelve pentagonal bronze plates, each pierced by a round hole of its own size
// with concentric rings around it, and a knob on each of the twenty corners. Hollow, cast-bronze patina.
// makeDodeca({ size (m, across the knobs), holes: 12 hole diameters as fractions of the face's inscribed diameter, seed })
// returns a Group; group.userData.faces[i] = { c, n, verts, r } (local), userData.knobs = [Vector3] (local), userData.k = model units → metres
import * as THREE from 'three';
import { canvasTex, rng } from './stage.js';

const PHI = (1 + Math.sqrt(5)) / 2;
let PATINA = null;
function patina() {
  if (PATINA) return PATINA;
  const draw = (g, w, h, rough) => {
    const R = rng(77);
    // dark leaded bronze under a mottled green-brown patina, a few worn brighter spots (cf. Tongeren 4002)
    g.fillStyle = rough ? '#b0b0b0' : '#3a3022'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const x = R() * w, y = R() * h, r = 20 + R() ** 2 * 140, k = R();
      const col = rough ? (k < .6 ? `rgba(235,235,235,${.05 + R() * .08})` : `rgba(90,90,90,${.05 + R() * .08})`)
        : (k < .6 ? `rgba(${58 + R() * 20},${76 + R() * 22},${58 + R() * 16},${.06 + R() * .10})` : k < .9 ? `rgba(24,20,14,${.08 + R() * .12})` : `rgba(${120 + R() * 30},${92 + R() * 20},${56 + R() * 14},${.06 + R() * .08})`);
      g.fillStyle = col; g.beginPath(); g.ellipse(x, y, r, r * (.5 + R() * .6), R() * 3, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 60000; i++) { g.fillStyle = rough ? `rgba(${R() < .5 ? 255 : 40},${R() < .5 ? 255 : 40},${R() < .5 ? 255 : 40},${R() * .10})` : `rgba(${R() < .6 ? '18,14,10' : '96,120,92'},${R() * .16})`; g.fillRect(R() * w, R() * h, 1 + R() * 2.5, 1 + R() * 2.5); }
  };
  const map = canvasTex(1024, 1024, (g, w, h) => draw(g, w, h, false));
  const rough = canvasTex(1024, 1024, (g, w, h) => draw(g, w, h, true), false);
  PATINA = { map, rough };
  return PATINA;
}
export function bronze(o = {}) {
  const p = patina();
  return new THREE.MeshStandardMaterial({ color: o.color || 0xffffff, map: p.map, roughnessMap: p.rough, roughness: 1.0, metalness: o.metal ?? 0.45, bumpMap: p.rough, bumpScale: 2.0, envMapIntensity: o.env ?? 1.0 });
}

export function dodecaFrame() {
  const V = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) V.push(new THREE.Vector3(x, y, z));
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    V.push(new THREE.Vector3(0, a / PHI, b * PHI)); V.push(new THREE.Vector3(a / PHI, b * PHI, 0)); V.push(new THREE.Vector3(a * PHI, 0, b / PHI));
  }
  // face normals: the cyclic permutations of (0, ±1, ±φ) or (0, ±φ, ±1) that touch exactly five vertices
  const N = [];
  for (const [p, q] of [[1, PHI], [PHI, 1]]) for (const a of [-1, 1]) for (const b of [-1, 1])
    for (const v of [[0, a * p, b * q], [a * p, b * q, 0], [b * q, 0, a * p]]) {
      const n = new THREE.Vector3(...v).normalize(), ds = V.map(x => x.dot(n)), mx = Math.max(...ds);
      if (ds.filter(d => d > mx - 1e-6).length === 5) N.push(n);
    }
  if (N.length !== 12) throw new Error('dodecahedron: found ' + N.length + ' faces');
  const faces = N.map(n => {
    const ds = V.map(v => v.dot(n)), mx = Math.max(...ds);
    const vs = V.filter((v, i) => ds[i] > mx - 1e-6);
    const c = vs.reduce((a, v) => a.add(v), new THREE.Vector3()).multiplyScalar(1 / vs.length);
    const u = vs[0].clone().sub(c).normalize(), w = new THREE.Vector3().crossVectors(n, u);
    vs.sort((a, b) => Math.atan2(a.clone().sub(c).dot(w), a.clone().sub(c).dot(u)) - Math.atan2(b.clone().sub(c).dot(w), b.clone().sub(c).dot(u)));
    return { n, c, u, w, verts: vs };
  });
  return { V, faces };
}

export function makeDodeca({ size = 0.082, holes = null, seed = 1, wall = 0.10, knob = 0.21, mat = null, grooves = true } = {}) {
  const { V, faces } = dodecaFrame();
  const R = rng(seed);
  const rin = (2 / PHI) / (2 * Math.tan(Math.PI / 5));          // inscribed radius of a face (edge 2/φ)
  const hs = holes || Array.from({ length: 12 }, () => 0.42 + R() * 0.32);
  const m = mat || bronze(), dark = new THREE.MeshStandardMaterial({ color: 0x2a2116, roughness: .8, metalness: .3 });
  const g = new THREE.Group(); const faceInfo = [];
  faces.forEach((f, i) => {
    const pts = f.verts.map(v => { const d = v.clone().sub(f.c); return new THREE.Vector2(d.dot(f.u), d.dot(f.w)); });
    const shape = new THREE.Shape(pts);
    const r = hs[i] * rin, hole = new THREE.Path(); hole.absarc(0, 0, r, 0, Math.PI * 2, true); shape.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: wall, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 2, curveSegments: 28 });
    // local x = u, y = w, z = n (right-handed, since u × w = n); the plate spans from the face plane inward by the wall
    const mtx = new THREE.Matrix4().makeBasis(f.u, f.w, f.n).setPosition(f.c.clone().addScaledVector(f.n, -wall));
    geo.applyMatrix4(mtx);
    const mesh = new THREE.Mesh(geo, m); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh);
    if (grooves) for (const rr of [r + 0.075, r + 0.14]) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.011, 5, 48), dark);
      t.applyMatrix4(new THREE.Matrix4().makeBasis(f.u, f.w, f.n).setPosition(f.c.clone().addScaledVector(f.n, 0.004)));
      g.add(t);
    }
    faceInfo.push({ c: f.c.clone(), n: f.n.clone(), u: f.u, w: f.w, verts: f.verts.map(v => v.clone()), r });
  });
  const knobs = [];
  const sph = new THREE.SphereGeometry(knob, 24, 16), neck = new THREE.CylinderGeometry(knob * 0.5, knob * 0.7, 0.12, 16);
  for (const v of V) {
    const d = v.clone().normalize(), p = v.clone().addScaledVector(d, 0.08 + knob * 0.75);
    const s = new THREE.Mesh(sph, m); s.position.copy(p); s.scale.setScalar(0.92 + R() * 0.16); s.castShadow = true; g.add(s);
    const nk = new THREE.Mesh(neck, m); nk.position.copy(v.clone().addScaledVector(d, 0.05)); nk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); g.add(nk);
    knobs.push(p);
  }
  const across = 2 * (Math.sqrt(3) + 0.08 + knob * 1.75);
  const k = size / across; g.scale.setScalar(k);
  g.userData = { faces: faceInfo, knobs, k, holes: hs.map(h => h * rin * 2 * k), lift: 0 };   // hole diameters in metres
  // resting height: lowest point of the model (it stands on its knobs) when unrotated
  g.updateMatrixWorld(true); g.userData.lift = -new THREE.Box3().setFromObject(g).min.y;
  return g;
}
