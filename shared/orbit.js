// Orbit: real satellite imagery as nested plates on one ground plane, seen by a camera that descends from orbit.
// Ground units are kilometres in an equirectangular frame around (LON0, LAT0): x east, z south.
// Finer plates fade in by altitude, with feathered edges. Marks (outlines, pins) are drawn on the 2D overlay through
// the same projection, so they stay on real coordinates.
import * as THREE from 'three';
import { canvasTex } from './stage.js';

export const LON0 = 0, LAT0 = 50;
const KX = 111.32 * Math.cos(LAT0 * Math.PI / 180), KZ = 110.57;
export const g2w = (lon, lat) => new THREE.Vector3((lon - LON0) * KX, 0, -(lat - LAT0) * KZ);

export async function orbit(S, { plates }) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x020306);
  const cam = new THREE.PerspectiveCamera(32, 16 / 9, 1, 1e5);
  const feather = canvasTex(512, 512, (c, w, h) => {
    const d = c.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const e = Math.min(x, y, w - 1 - x, h - 1 - y) / (w * 0.06), a = Math.max(0, Math.min(1, e));
      const i = (y * w + x) * 4; d.data[i] = d.data[i + 1] = d.data[i + 2] = Math.round(255 * a * a * (3 - 2 * a)); d.data[i + 3] = 255;
    }
    c.putImageData(d, 0, 0);
  }, false);
  feather.wrapS = feather.wrapT = THREE.ClampToEdgeWrapping;
  const P = {};
  let order = 0;
  for (const p of plates) {                                   // coarse first: { id, url, box: [lon0, lat0, lon1, lat1] }
    const map = await S.tex(p.url, { aniso: 16 });
    const a = g2w(p.box[0], p.box[1]), b = g2w(p.box[2], p.box[3]);
    const w = b.x - a.x, h = a.z - b.z;
    const mat = new THREE.MeshBasicMaterial({ map, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, alphaMap: order ? feather : null, color: 0xe8e8e8 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.rotation.x = -Math.PI / 2;
    m.position.set((a.x + b.x) / 2, 0, (a.z + b.z) / 2); m.renderOrder = order++; scene.add(m);
    P[p.id] = { mesh: m, mat, w, h, box: p.box };
  }
  // fade finer plates in as the camera comes down: [alt where it starts, alt where it is fully in] (km)
  function setAlt(alt, fades) {
    for (const [id, [a0, a1]] of Object.entries(fades)) {
      const k = Math.max(0, Math.min(1, (a0 - alt) / (a0 - a1)));
      P[id].mat.opacity = k * k * (3 - 2 * k); P[id].mesh.visible = P[id].mat.opacity > 0.002;
    }
  }
  // camera above a ground point at an altitude (km), tilted back by `tilt` (rad), heading `yaw`
  function place(lon, lat, alt, tilt = 0.35, yaw = 0) {
    const g = g2w(lon, lat), back = Math.tan(tilt) * alt;
    cam.position.set(g.x - Math.sin(yaw) * back, alt, g.z + Math.cos(yaw) * back);
    cam.up.set(0, 1, 0); cam.lookAt(g.x, 0, g.z);
    cam.near = Math.max(0.01, alt * 0.05); cam.far = alt * 40; cam.updateProjectionMatrix();
  }
  return { scene, cam, P, setAlt, place };
}
