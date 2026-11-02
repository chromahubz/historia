// The sets of the three worlds. Each builder returns { scene, cam, ... } with its own lights; units are metres.
//   Studio 3D: a dark seamless sweep, a turntable, a soft key, two rims, studio HDRI reflections.
//   Archive Room: a lamp-lit desk, a museum case, a gallery wall, excavation soil.
//   Orbit: nested satellite plates on one ground plane (see orbit.js).
import * as THREE from 'three';
import { canvasTex, rng } from './stage.js';

export async function studio(S, { env, sweep = 0x2b2d31 } = {}) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0c0d0f); scene.environment = env; scene.environmentIntensity = 0.55;
  const cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.01, 50);
  // the sweep: floor curving up into a back wall
  // the profile: flat floor at y = 0 to z = −0.6, a quarter circle (r 0.65) up into a wall at z = −1.25
  const pts = [new THREE.Vector3(0, 0, 3), new THREE.Vector3(0, 0, -0.6)];
  for (let i = 1; i <= 24; i++) { const a = i / 24 * Math.PI / 2; pts.push(new THREE.Vector3(0, 0.65 - 0.65 * Math.cos(a), -0.6 - 0.65 * Math.sin(a))); }
  pts.push(new THREE.Vector3(0, 3, -1.25));
  const geo = new THREE.BufferGeometry(), pos = [], idx = [];
  for (let i = 0; i < pts.length; i++) for (const x of [-4, 4]) pos.push(x, pts[i].y, pts[i].z);
  for (let i = 0; i < pts.length - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const paper = canvasTex(512, 512, (g, w, h) => { const R = rng(5); g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 40000; i++) { const v = R() < .5 ? 0 : 255; g.fillStyle = `rgba(${v},${v},${v},0.03)`; g.fillRect(R() * w, R() * h, 2, 2); } }, false);
  const sweepMesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: sweep, roughness: 0.92, metalness: 0, side: THREE.DoubleSide, bumpMap: paper, bumpScale: 0.3 }));
  sweepMesh.receiveShadow = true; scene.add(sweepMesh);
  // turntable
  const table = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.165, 0.018, 96), new THREE.MeshStandardMaterial({ color: 0x141517, roughness: 0.35, metalness: 0.2 }));
  table.position.y = 0.009; table.receiveShadow = table.castShadow = true; scene.add(table);
  const top = new THREE.Group(); top.position.y = 0.018; scene.add(top);
  // light: soft key above-left, cool rim behind-right, warm kicker left, low fill
  const key = new THREE.SpotLight(0xfff1e0, 38, 0, 0.5, 0.85, 2); key.position.set(-0.7, 1.1, 0.7); key.target.position.set(0, 0.05, 0);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -0.0004; key.shadow.camera.near = 0.3; key.shadow.camera.far = 3;
  scene.add(key, key.target);
  const rim = new THREE.SpotLight(0xcfe0ff, 30, 0, 0.45, 0.9, 2); rim.position.set(0.8, 0.55, -0.9); rim.target.position.set(0, 0.05, 0); scene.add(rim, rim.target);
  const kick = new THREE.SpotLight(0xffc890, 10, 0, 0.5, 0.9, 2); kick.position.set(-0.9, 0.25, -0.5); kick.target.position.set(0, 0.05, 0); scene.add(kick, kick.target);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x202020, 0.15));
  return { scene, cam, top, key, rim, kick, table };
}

// ---------------- Archive Room ----------------
// a book lying open at one scanned page: a block of paper under a curled sheet, true size (metres)
export function book(map, wPage, hPage, thick, { cover = 0x3b2618 } = {}) {
  const g = new THREE.Group();
  const edge = canvasTex(256, 64, (c, w, h) => { const R = rng(9); c.fillStyle = '#d9cfb8'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 1.5) { c.fillStyle = `rgba(90,70,40,${0.08 + R() * 0.12})`; c.fillRect(0, y, w, 0.6); } });
  const sideM = new THREE.MeshStandardMaterial({ map: edge, roughness: 0.95 }), coverM = new THREE.MeshStandardMaterial({ color: cover, roughness: 0.7 });
  const block = new THREE.Mesh(new THREE.BoxGeometry(wPage * 0.99, thick, hPage * 0.99), [sideM, coverM, coverM, coverM, sideM, sideM]);
  block.position.y = thick / 2; block.castShadow = block.receiveShadow = true; g.add(block);
  const cov = new THREE.Mesh(new THREE.BoxGeometry(wPage * 1.04, 0.004, hPage * 1.04), coverM); cov.position.y = 0.002; cov.castShadow = true; g.add(cov);
  // the page: curls up a little at the binding (left) and lifts at the fore-edge
  const geo = new THREE.PlaneGeometry(wPage, hPage, 32, 4); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const u = (p.getX(i) + wPage / 2) / wPage; p.setY(i, 0.012 * Math.exp(-u * 9) + 0.0025 * Math.pow(u, 6)); }
  geo.computeVertexNormals();
  const page = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map, roughness: 0.92, color: 0xd8d2c8 }));
  page.position.y = thick + 0.0006; page.receiveShadow = true; g.add(page);
  g.userData = { page, top: thick + 0.0006, w: wPage, h: hPage };
  return g;
}
// texture px on a book's page → world point (u, v in 0..1 from the scan's top-left)
export function pageW(bk, u, v) { const p = new THREE.Vector3((u - 0.5) * bk.userData.w, bk.userData.top + 0.002, (v - 0.5) * bk.userData.h); return bk.localToWorld(p); }

export async function desk(S, { env, base }) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x070605); scene.environment = env; scene.environmentIntensity = 0.12;
  scene.fog = new THREE.Fog(0x070605, 1.6, 3.2);
  const cam = new THREE.PerspectiveCamera(32, 16 / 9, 0.01, 20);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), await S.surface(`${base}/ph_wood_table_worn`, [2.2, 1.35], { color: 0xb8a690 }));
  top.rotation.x = -Math.PI / 2; top.receiveShadow = true; scene.add(top);
  const lamp = new THREE.SpotLight(0xffc68a, 26, 0, 0.62, 0.75, 2); lamp.position.set(-0.55, 0.85, -0.45); lamp.target.position.set(0.0, 0, 0.05);
  lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048); lamp.shadow.bias = -0.0003; lamp.shadow.camera.near = 0.2; lamp.shadow.camera.far = 3; scene.add(lamp, lamp.target);
  const read = new THREE.SpotLight(0xfff0d8, 0, 0, 0.09, 0.6, 2); read.position.set(0.1, 0.9, 0.35); scene.add(read, read.target);     // the reading light that finds a line
  scene.add(new THREE.HemisphereLight(0x8a96aa, 0x1a1208, 0.10));
  try {
    const l = await S.gltf('/core/assets/polyhaven/desk_lamp_arm_01/desk_lamp_arm_01.gltf');
    l.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const bb = new THREE.Box3().setFromObject(l), hgt = bb.max.y - bb.min.y; l.scale.setScalar(0.62 / hgt);
    l.position.set(-0.78, 0, -0.55); l.rotation.y = 0.9; scene.add(l);
  } catch (e) { console.warn('lamp model missing'); }
  return { scene, cam, lamp, read };
}

export async function vitrine(S, { env, base, photo, aspect, label }) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x040405); scene.environment = env; scene.environmentIntensity = 0.08;
  const cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.01, 30);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.4, metalness: 0.0 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.95, 0.46), new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.8 }));
  plinth.position.y = 0.475; plinth.castShadow = plinth.receiveShadow = true; scene.add(plinth);
  const vel = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.02, 0.44), await S.surface(`${base}/ph_velour_velvet`, [1, 1], { color: 0x3a2c32 }));
  vel.position.y = 0.96; vel.receiveShadow = true; scene.add(vel);
  // glass hood with thin bronze-dark edges
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.40, 0.44), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.07, envMapIntensity: 3, depthWrite: false }));
  glass.position.y = 0.97 + 0.2; scene.add(glass);
  const edgeM = new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.35, metalness: 0.8 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.40, 0.006), edgeM); e.position.set(sx * 0.22, 1.17, sz * 0.22); scene.add(e); }
  for (const y of [0.97, 1.37]) for (const [x, z, w, d] of [[0, -0.22, 0.44, 0.006], [0, 0.22, 0.44, 0.006], [-0.22, 0, 0.006, 0.44], [0.22, 0, 0.006, 0.44]]) { const e = new THREE.Mesh(new THREE.BoxGeometry(w, 0.006, d), edgeM); e.position.set(x, y, z); scene.add(e); }
  // the photographed object on a small stand, facing the visitor; a contact shadow under it
  const H = 0.075, Wd = H * aspect;
  const obj = new THREE.Mesh(new THREE.PlaneGeometry(Wd, H), new THREE.MeshBasicMaterial({ map: photo, transparent: true, alphaTest: 0.02, toneMapped: false, color: 0xcfcfcf }));
  obj.position.set(0, 0.97 + 0.012 + H / 2, 0); scene.add(obj);
  const sh = canvasTex(256, 128, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const cs = new THREE.Mesh(new THREE.PlaneGeometry(Wd * 1.2, Wd * 0.5), new THREE.MeshBasicMaterial({ map: sh, transparent: true, depthWrite: false })); cs.rotation.x = -Math.PI / 2; cs.position.set(0, 0.9705, 0.004); scene.add(cs);
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.012, 32), edgeM); stand.position.set(0, 0.976, 0); scene.add(stand);
  // the museum label, angled on the velvet in front
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.055), new THREE.MeshStandardMaterial({ map: label, roughness: 0.6 }));
  lab.rotation.x = -Math.PI / 2 + 0.35; lab.position.set(0.075, 0.975, 0.14); lab.rotation.z = 0; scene.add(lab);
  const spot = new THREE.SpotLight(0xfff4e6, 18, 0, 0.32, 0.6, 2); spot.position.set(0.15, 2.0, 0.5); spot.target.position.set(0, 1.0, 0);
  spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); scene.add(spot, spot.target);
  const fill = new THREE.SpotLight(0xa8b8d0, 3, 0, 0.6, 0.9, 2); fill.position.set(-1.5, 1.6, 1.8); fill.target.position.set(0, 1, 0); scene.add(fill, fill.target);
  return { scene, cam, obj, spot, fill, labelMesh: lab, glass };
}

export async function gallery(S, { env, base }) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x060505); scene.environment = env; scene.environmentIntensity = 0.1;
  scene.fog = new THREE.Fog(0x060505, 4, 9);
  const cam = new THREE.PerspectiveCamera(34, 16 / 9, 0.05, 30);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.6), await S.surface(`${base}/ph_red_plaster_weathered`, [4, 1.6], { color: 0xc8a8a0 }));
  wall.position.set(0, 1.8, 0); wall.receiveShadow = true; scene.add(wall);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), await S.surface(`${base}/ph_wood_table_worn`, [6, 3.4], { color: 0x4a3a30 }));
  floor.rotation.x = -Math.PI / 2; floor.position.z = 2.5; floor.receiveShadow = true; scene.add(floor);
  scene.add(new THREE.HemisphereLight(0x9a8a80, 0x100808, 0.12));
  const spots = [];
  const picture = (x, y, z, tx, ty, tz, i = 16, ang = 0.32) => { const s = new THREE.SpotLight(0xffe2c0, i, 0, ang, 0.7, 2); s.position.set(x, y, z); s.target.position.set(tx, ty, tz); s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0005; scene.add(s, s.target); spots.push(s); return s; };
  return { scene, cam, wall, picture, spots };
}

export async function soil(S, { env, base }) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b0c0e); scene.environment = env; scene.environmentIntensity = 0.25;
  const cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.01, 20);
  const m = await S.surface(`${base}/ph_farm_soil`, [1.6, 1.6], { disp: 0.025, color: 0xc8b8a8, nscale: 1.4 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4, 320, 320), m); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.castShadow = true; scene.add(ground);
  const sun = new THREE.DirectionalLight(0xffd7a8, 6.5); sun.position.set(-1.2, 0.55, 0.4); sun.target.position.set(0, 0, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -0.4, right: 0.4, top: 0.4, bottom: -0.4, near: 0.1, far: 4 }); sun.shadow.bias = -0.0004; scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0x9fb4d0, 0x2a1c10, 1.1));
  return { scene, cam, sun, ground };
}
// a coin: a thin bronze disc with the photographed face on top (true diameter, metres)
export function coin(map, d, th = 0.003) {
  const g = new THREE.Group();
  const edge = new THREE.Mesh(new THREE.CylinderGeometry(d / 2, d / 2, th, 64, 1, true), new THREE.MeshStandardMaterial({ color: 0x5a4630, roughness: 0.55, metalness: 0.6 }));
  edge.castShadow = true; g.add(edge);
  const face = new THREE.Mesh(new THREE.CircleGeometry(d / 2, 64), new THREE.MeshStandardMaterial({ map, roughness: 0.55, metalness: 0.25, transparent: true, alphaTest: 0.3 }));
  face.rotation.x = -Math.PI / 2; face.position.y = th / 2; face.castShadow = true; face.receiveShadow = true; g.add(face);
  const back = new THREE.Mesh(new THREE.CircleGeometry(d / 2, 64), new THREE.MeshStandardMaterial({ color: 0x3e3020, roughness: 0.7 })); back.rotation.x = Math.PI / 2; back.position.y = -th / 2; g.add(back);
  return g;
}
