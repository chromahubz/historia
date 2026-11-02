// Shared stage for the Historia films: one three.js renderer for every world (Archive Room, Orbit, Studio 3D).
// Each set is its own THREE.Scene with its own camera and lights; render(scene, camera) draws one of them.
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const W = 1920, H = 1080;

export function makeStage(el) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  el.appendChild(renderer.domElement);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texLoader = new THREE.TextureLoader();
  const cache = new Map();

  // a texture: colour maps are sRGB, data maps (normal, roughness, displacement) linear
  function tex(url, { srgb = true, repeat = null, aniso = 8 } = {}) {
    const key = url + srgb + (repeat ? repeat.join() : '');
    if (cache.has(key)) return cache.get(key);
    const p = new Promise((res, rej) => texLoader.load(url, t => {
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = aniso;
      if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
      res(t);
    }, undefined, () => rej(new Error('missing ' + url))));
    cache.set(key, p); return p;
  }
  // a Poly Haven surface: diff / nor_gl / rough (and disp when asked)
  async function surface(base, repeat, o = {}) {
    const [map, normalMap, roughnessMap, displacementMap] = await Promise.all([
      tex(`${base}_diff.jpg`, { repeat }), tex(`${base}_nor_gl.jpg`, { srgb: false, repeat }), tex(`${base}_rough.jpg`, { srgb: false, repeat }),
      o.disp ? tex(`${base}_disp.jpg`, { srgb: false, repeat }) : null]);
    return new THREE.MeshStandardMaterial({ map, normalMap, roughnessMap, roughness: 1, metalness: 0, displacementMap, displacementScale: o.disp || 0, color: o.color || 0xffffff, normalScale: new THREE.Vector2(o.nscale || 1, o.nscale || 1) });
  }
  async function hdri(url) {
    const hdr = await new Promise((res, rej) => new RGBELoader().load(url, res, undefined, rej));
    const env = pmrem.fromEquirectangular(hdr).texture; hdr.dispose(); return env;
  }
  const gltf = url => new Promise((res, rej) => new GLTFLoader().load(url, g => res(g.scene), undefined, rej));

  // dof: { focus (m), aper, maxCoc } ; grade: exposure
  // direct render (multisampled); vignette lives on the overlay and grain is added by ffmpeg at mux time: on a
  // software GL device the post chain (DOF gather, bloom) costs more than the scene itself
  function render(scene, camera, { exposure = 1 } = {}) {
    renderer.toneMappingExposure = exposure; renderer.setRenderTarget(null); renderer.render(scene, camera);
  }
  return { renderer, tex, surface, hdri, gltf, render, pmrem };
}

// a deterministic canvas texture (patina, paper, rulers…): draw(ctx, w, h) once
export function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
export function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// camera helpers
export function aim(cam, pos, target, fov = null) { cam.position.set(...pos); cam.lookAt(...target); if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); } }
export function project(v, cam) { const p = v.clone().project(cam); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H, p.z]; }
