// 畫風 K 方塊體素繪本：像素貼圖＋方塊零件工具 / Style K voxel helpers: pixel textures and box parts.
import * as THREE from 'three';

export const PX = 1 / 16;                 // 1 像素 = 1/16 方塊 / one texel = 1/16 block

export function rng(seed) { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

export function hex(c) { return typeof c === 'string' ? c : '#' + c.toString(16).padStart(6, '0'); }
export function shade(c, k) {           // k>0 變亮、k<0 變暗 / lighten or darken
  const n = parseInt(hex(c).slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = v => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

const texCache = new Map();
export function pixTex(w, h, paint, key) {
  if (key && texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; paint(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
  t.userData.canvas = c;
  if (key) texCache.set(key, t);
  return t;
}

// 底色＋每格明暗雜訊 / base colour with per-texel jitter
export function noisy(g, w, h, base, amt = 0.08, seed = 7, x0 = 0, y0 = 0) {
  const r = rng(seed);
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { g.fillStyle = shade(base, (r() - 0.5) * 2 * amt); g.fillRect(x, y, 1, 1); }
}
export function px(g, x, y, c, w = 1, h = 1) { g.fillStyle = hex(c); g.fillRect(x, y, w, h); }

export function mat(map, opts = {}) {
  return new THREE.MeshStandardMaterial({ map, roughness: opts.rough ?? 0.92, metalness: 0, emissive: opts.emissive ?? 0x000000, emissiveMap: opts.emissiveMap ?? null, emissiveIntensity: opts.ei ?? 1, transparent: !!opts.transparent, opacity: opts.opacity ?? 1 });
}

// 一個方塊零件：w,h,d 以像素計；faces 每面一個繪圖函式或顏色 / a box part sized in texels with per-face painters.
// BoxGeometry 面的順序：+x(右) -x(左) +y(上) -y(下) +z(前) -z(後)
export function part(w, h, d, faces, opt = {}) {
  const dims = { right: [d, h], left: [d, h], top: [w, d], bottom: [w, d], front: [w, h], back: [w, h] };
  const order = ['right', 'left', 'top', 'bottom', 'front', 'back'];
  const mats = order.map(k => {
    const f = faces[k] ?? faces.all ?? '#ff00ff';
    const [tw, th] = dims[k];
    const key = opt.key ? `${opt.key}:${k}:${tw}x${th}` : null;
    const tex = typeof f === 'function' ? pixTex(tw, th, f, key) : pixTex(tw, th, (g, W, H) => noisy(g, W, H, f, opt.amt ?? 0.06, opt.seed ?? (tw * 31 + th)), key);
    return mat(tex, opt);
  });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w * PX, h * PX, d * PX), mats);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// 以「零件頂端／底端」為軸心的群組 / a pivot group so limbs rotate about a joint
export function pivoted(mesh, anchor = 'top') {
  const g = new THREE.Group(); const h = mesh.geometry.parameters.height;
  mesh.position.y = anchor === 'top' ? -h / 2 : anchor === 'bottom' ? h / 2 : 0;
  g.add(mesh); return g;
}

// 方塊地形（InstancedMesh，每種方塊一個）/ instanced voxel blocks, one mesh per block type
export function blockType(faces, opt = {}) {
  const mats = ['right', 'left', 'top', 'bottom', 'front', 'back'].map(k => {
    const f = faces[k] ?? faces.side ?? faces.all;
    const key = `blk:${opt.key}:${k}`;
    const tex = typeof f === 'function' ? pixTex(16, 16, f, key) : pixTex(16, 16, (g) => noisy(g, 16, 16, f, opt.amt ?? 0.07, opt.seed ?? 3), key);
    return mat(tex, opt);
  });
  return { geo: new THREE.BoxGeometry(1, 1, 1), mats };
}
export function instanced(type, cells) {
  const m = new THREE.InstancedMesh(type.geo, type.mats, cells.length);
  const o = new THREE.Object3D();
  cells.forEach((c, i) => { o.position.set(c[0] + 0.5, c[1] + 0.5, c[2] + 0.5); o.rotation.set(0, 0, 0); o.scale.setScalar(c[3] ?? 1); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
  m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
  return m;
}

// 共用方塊貼圖 / shared block painters
export const PAINT = {
  snowTop: (g) => { noisy(g, 16, 16, '#e4ebf6', 0.05, 11); const r = rng(5); for (let i = 0; i < 10; i++) px(g, (r() * 16) | 0, (r() * 16) | 0, '#dfe9fb'); },
  snowSide: (g) => { noisy(g, 16, 16, '#7a5436', 0.1, 12); noisy(g, 16, 4, '#f4f8ff', 0.05, 13); const r = rng(9); for (let x = 0; x < 16; x++) { const d = 4 + ((r() * 3) | 0); px(g, x, 4, '#f4f8ff', 1, d - 4); } },
  dirt: (g) => noisy(g, 16, 16, '#7a5436', 0.1, 14),
  snow: (g) => noisy(g, 16, 16, '#eef4ff', 0.05, 15),
  ice: (g) => { noisy(g, 16, 16, '#9fd8ff', 0.08, 16); for (let i = 0; i < 16; i++) px(g, i, i, '#e8f8ff'); for (let i = 3; i < 12; i++) px(g, i, 15 - i - 2, '#d4f0ff'); },
  log: (g) => { noisy(g, 16, 16, '#5b3a22', 0.12, 17); for (let x = 1; x < 16; x += 4) px(g, x, 0, '#3e2716', 1, 16); },
  logTop: (g) => { noisy(g, 16, 16, '#a8794b', 0.06, 18); g.strokeStyle = '#7a5532'; for (let r = 2; r < 8; r += 2) g.strokeRect(8 - r, 8 - r, r * 2, r * 2); },
  leaves: (g) => { noisy(g, 16, 16, '#1f5a35', 0.16, 19); const r = rng(4); for (let i = 0; i < 18; i++) px(g, (r() * 16) | 0, (r() * 16) | 0, '#123d24'); },
  leavesSnow: (g) => { PAINT.leaves(g); const r = rng(8); for (let x = 0; x < 16; x++) px(g, x, 0, '#f4f8ff', 1, 2 + ((r() * 3) | 0)); },
  plank: (g) => { noisy(g, 16, 16, '#9a6a3c', 0.07, 20); for (let y = 3; y < 16; y += 4) px(g, 0, y, '#6e4824', 16, 1); [[3, 0], [11, 4], [6, 8], [13, 12]].forEach(([x, y]) => px(g, x, y, '#6e4824', 1, 3)); },
  stone: (g) => { noisy(g, 16, 16, '#8a8f98', 0.1, 21); for (let y = 0; y < 16; y += 5) px(g, 0, y, '#5d6169', 16, 1); [[4, 0], [12, 5], [7, 10]].forEach(([x, y]) => px(g, x, y, '#5d6169', 1, 5)); },
  brick: (g) => { noisy(g, 16, 16, '#a4513c', 0.08, 22); for (let y = 3; y < 16; y += 4) px(g, 0, y, '#d8c8b8', 16, 1); for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? 4 : 0; x < 16; x += 8) px(g, x, y, '#d8c8b8', 1, 3); },
  rug: (g) => { noisy(g, 16, 16, '#9c2b2b', 0.06, 23); g.strokeStyle = '#e8c35a'; g.strokeRect(1.5, 1.5, 13, 13); },
};
