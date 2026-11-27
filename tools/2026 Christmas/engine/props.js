// 畫風 K 道具與場景零件 / Style K props: terrain, pines, cabin, fireplace, Christmas tree, gifts, stocking, moon.
import * as THREE from 'three';
import { PX, part, pixTex, noisy, px, rng, blockType, instanced, PAINT, mat } from './voxel.js';

export const BT = {
  snowGrass: () => blockType({ top: PAINT.snowTop, side: PAINT.snowSide, bottom: PAINT.dirt }, { key: 'snowgrass' }),
  snow: () => blockType({ all: PAINT.snow }, { key: 'snow' }),
  log: () => blockType({ side: PAINT.log, top: PAINT.logTop, bottom: PAINT.logTop }, { key: 'log' }),
  leaves: () => blockType({ side: PAINT.leaves, top: PAINT.leavesSnow, bottom: PAINT.leaves }, { key: 'leaves' }),
  leavesSnowSide: () => blockType({ side: PAINT.leavesSnow, top: PAINT.snowTop, bottom: PAINT.leaves }, { key: 'leaves2' }),
  plank: () => blockType({ all: PAINT.plank }, { key: 'plank' }),
  stone: () => blockType({ all: PAINT.stone }, { key: 'stone' }),
  brick: () => blockType({ all: PAINT.brick }, { key: 'brick' }),
  ice: () => blockType({ all: PAINT.ice }, { key: 'ice', transparent: true, opacity: 0.8, rough: 0.3 }),
};

// 雪地：中間平、外圍起伏 / snowy ground, flat centre with rolling edges
export function terrain(scene, { size = 56, flat = 10, seed = 3, cx = 0, cz = 0 } = {}) {
  const r = rng(seed), cells = [], top = [];
  const hAt = (x, z) => { const d = Math.max(Math.abs(x), Math.abs(z)); if (d < flat) return 0; return Math.floor(Math.max(0, (Math.sin(x * 0.31 + seed) + Math.cos(z * 0.27) + 1.2) * (d - flat) / 9)); };
  for (let x = -size / 2; x < size / 2; x++) for (let z = -size / 2; z < size / 2; z++) {
    const h = hAt(x, z); for (let y = Math.max(-1, h - 2); y <= h; y++) (y === h ? top : cells).push([x + cx, y - 1, z + cz]);
  }
  scene.add(instanced(BT.snowGrass(), top)); if (cells.length) scene.add(instanced(BT.snow(), cells));
  return hAt;
}

// 方塊松樹 / voxel pine tree; returns the cells so callers can merge
export function pine(scene, x, z, { h = 9, y0 = 0, seed = 1 } = {}) {
  const logs = [], lv = [], lvTop = [];
  const trunk = Math.max(2, Math.round(h * 0.25));
  for (let y = 0; y < trunk + 2; y++) logs.push([x, y0 + y, z]);
  const layers = [];
  for (let i = 0, y = trunk; y < h; i++, y++) { const rad = Math.max(0, Math.round((h - y) * 0.42) - (i % 2)); layers.push([y, rad]); }
  layers.forEach(([y, rad], i) => {
    for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
      if (Math.abs(dx) + Math.abs(dz) > rad + (rad > 1 ? 1 : 0)) continue;
      const upper = layers[i + 1]; const covered = upper && Math.abs(dx) + Math.abs(dz) <= upper[1];
      (covered ? lv : lvTop).push([x + dx, y0 + y, z + dz]);
    }
  });
  lvTop.push([x, y0 + h, z]);
  const g = new THREE.Group();
  g.add(instanced(BT.log(), logs)); if (lv.length) g.add(instanced(BT.leaves(), lv)); g.add(instanced(BT.leavesSnowSide(), lvTop));
  g.name = `pine@${x},${z}`; scene.add(g); return g;
}

// 像素圓月 / round pixel moon (not a square sun)
export function moon(scene, { pos = [60, 70, -160], r = 14 } = {}) {
  const tex = pixTex(32, 32, (g) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const d = Math.hypot(x - 15.5, y - 15.5); if (d < 15) px(g, x, y, d > 12 ? '#e9efff' : '#fdfdf6'); } [[10, 9, 3], [19, 18, 4], [20, 8, 2]].forEach(([x, y, s]) => px(g, x, y, '#dfe4ef', s, s)); }, 'moon');
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false, color: new THREE.Color(1.6, 1.6, 1.6) }));
  m.position.set(...pos); m.lookAt(0, 0, 0); scene.add(m); return m;
}

// 發光燈籠方塊 / glowing lantern block
export function lantern(scene, pos, { color = '#ffb347', intensity = 6, dist = 9 } = {}) {
  const g = new THREE.Group(); g.position.set(...pos);
  const post = part(2, 22, 2, { all: '#4b3322' }, { key: 'post' }); post.position.y = 11 * PX; g.add(post);
  const lt = part(6, 7, 6, { all: (gg, w, h) => { noisy(gg, w, h, '#ffd27a', 0.04, 5); px(gg, 0, 0, '#3a2a1c', w, 1); px(gg, 0, h - 1, '#3a2a1c', w, 1); px(gg, 0, 0, '#3a2a1c', 1, h); px(gg, w - 1, 0, '#3a2a1c', 1, h); } }, { key: 'lantern', emissive: new THREE.Color(color), ei: 2.2 });
  lt.position.y = 25 * PX; lt.material.forEach(m => { m.emissiveMap = m.map; }); g.add(lt);
  const L = new THREE.PointLight(color, intensity, dist, 1.6); L.position.y = 25 * PX; L.castShadow = false; g.add(L);
  scene.add(g); return { group: g, light: L };
}

// ---------- 室內 / interior ----------
export function cabinRoom(scene, { w = 14, d = 11, h = 6 } = {}) {
  const floor = [], wall = [], beam = [];
  for (let x = -w / 2; x < w / 2; x++) for (let z = -d / 2; z < d / 2; z++) floor.push([x, -1, z]);
  for (let x = -w / 2 - 1; x <= w / 2; x++) for (let y = 0; y < h; y++) {
    const isWin = y >= 2 && y <= 3 && x >= 1 && x <= 3; if (!isWin) wall.push([x, y, -d / 2 - 1]);
  }
  for (let z = -d / 2; z < d / 2; z++) for (let y = 0; y < h; y++) { wall.push([-w / 2 - 1, y, z]); const isDoor = z >= 1 && z <= 2 && y < 3; if (!isDoor) wall.push([w / 2, y, z]); }
  for (let x = -w / 2 - 1; x <= w / 2; x++) beam.push([x, h, -d / 2 - 1]);
  scene.add(instanced(BT.plank(), floor)); scene.add(instanced(BT.plank(), wall)); scene.add(instanced(BT.log(), beam));
  // 窗外藍夜＋雪 / window glass showing night snow
  const win = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), new THREE.MeshBasicMaterial({ map: pixTex(24, 16, (g) => { noisy(g, 24, 16, '#1b2f6a', 0.12, 9); const r = rng(3); for (let i = 0; i < 26; i++) px(g, (r() * 24) | 0, (r() * 16) | 0, '#e8f0ff'); px(g, 11, 0, '#5b3a22', 2, 16); px(g, 0, 7, '#5b3a22', 24, 2); }, 'win'), color: new THREE.Color(0.9, 0.95, 1.3) }));
  win.position.set(2.5, 3, -d / 2 - 0.45); scene.add(win);
  // 地毯 / rug
  const rug = part(80, 1, 56, { top: (g, W, H) => { noisy(g, W, H, '#9c2b2b', 0.05, 40); g.strokeStyle = '#e8c35a'; g.lineWidth = 2; g.strokeRect(4, 4, W - 8, H - 8); for (let x = 10; x < W - 10; x += 10) px(g, x, H / 2, '#e8c35a', 4, 2); }, all: '#7d2222' }, { key: 'rug' });
  rug.position.set(-1, -0.97, 0.5); scene.add(rug);
  return { w, d, h };
}

// 壁爐＋會跳動的像素火 / fireplace with animated pixel fire
export function fireplace(scene, x, z) {
  const cells = [];
  for (let dx = -2; dx <= 2; dx++) for (let y = 0; y < 4; y++) { if (Math.abs(dx) <= 1 && y <= 1) continue; cells.push([x + dx, y, z]); }
  for (let dx = -1; dx <= 1; dx++) for (let y = 4; y < 6; y++) cells.push([x + dx, y, z - 0.0]);
  scene.add(instanced(BT.stone(), cells));
  const shelf = part(5 * 16 + 4, 3, 22, { all: '#6b4426' }, { key: 'mantel' }); shelf.position.set(x + 0.5, 4.05, z + 0.9); scene.add(shelf);
  const fc = document.createElement('canvas'); fc.width = 24; fc.height = 24; const fg = fc.getContext('2d');
  const ft = new THREE.CanvasTexture(fc); ft.magFilter = ft.minFilter = THREE.NearestFilter; ft.colorSpace = THREE.SRGBColorSpace;
  const fire = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.9), new THREE.MeshBasicMaterial({ map: ft, transparent: true, color: new THREE.Color(2.2, 1.6, 1.1) }));
  fire.position.set(x + 0.5, 0.95, z + 0.55); scene.add(fire);
  const logs = part(36, 4, 8, { all: '#4a2e18' }, { key: 'firelog' }); logs.position.set(x + 0.5, 0.12, z + 0.5); scene.add(logs);
  const L = new THREE.PointLight('#ff9a3c', 0, 18, 1.4); L.position.set(x + 0.5, 1.4, z + 1.6); L.castShadow = true; L.shadow.mapSize.set(1024, 1024); L.shadow.bias = -0.004; scene.add(L);
  let lit = 1;
  const update = (t) => {
    fg.clearRect(0, 0, 24, 24);
    if (lit > 0) {
      const r = rng(Math.floor(t * 12) + 1);
      for (let xx = 0; xx < 24; xx++) {
        const base = Math.sin(xx * 0.5 + t * 6) * 2 + 14 + r() * 5 - Math.abs(xx - 12) * 0.55;
        const hh = Math.max(0, base * lit);
        for (let yy = 0; yy < hh; yy++) { const f = yy / hh; fg.fillStyle = f < 0.35 ? '#fff3b0' : f < 0.65 ? '#ffb43a' : f < 0.9 ? '#ff6a1f' : '#c0331a'; fg.fillRect(xx, 23 - yy, 1, 1); }
      }
    }
    ft.needsUpdate = true; L.intensity = lit * (14 + Math.sin(t * 17) * 1.5 + Math.sin(t * 7.3) * 2);
  };
  return { update, light: L, setLit: (v) => { lit = v; } };
}

// 聖誕襪 / stocking (a stocking)
export function stocking(color = '#d22f2f') {
  const g = new THREE.Group();
  const leg = part(5, 9, 3, { all: (gg, W, H) => { noisy(gg, W, H, color, 0.06, 51); for (let y = 2; y < H; y += 3) px(gg, 0, y, '#f2f2f2', W, 1); } }, { key: 'stk-leg' + color }); leg.position.y = -4.5 * PX; g.add(leg);
  const foot = part(5, 4, 3, { all: color }, { key: 'stk-foot' + color }); foot.position.set(2.5 * PX, -10 * PX, 0); g.add(foot);
  const cuff = part(7, 3, 4, { all: '#f6f6f2' }, { key: 'stk-cuff' }); cuff.position.y = 0.5 * PX; g.add(cuff);
  return g;
}

// 禮物 / gift box with ribbon
export function gift(size = 8, color = '#2f7fd2', ribbon = '#f2d04a', seed = 1) {
  const g = new THREE.Group();
  const paint = (gg, W, H) => { noisy(gg, W, H, color, 0.05, seed); px(gg, (W >> 1) - 1, 0, ribbon, 2, H); };
  const top = (gg, W, H) => { noisy(gg, W, H, color, 0.05, seed + 1); px(gg, (W >> 1) - 1, 0, ribbon, 2, H); px(gg, 0, (H >> 1) - 1, ribbon, W, 2); };
  const b = part(size, size, size, { all: paint, top }, { key: `gift${size}${color}` }); b.position.y = size / 2 * PX; g.add(b);
  [-1, 1].forEach(s => { const bow = part(3, 3, 2, { all: ribbon }, { key: 'bow' + ribbon }); bow.position.set(s * 2 * PX, (size + 1.5) * PX, 0); bow.rotation.z = s * 0.5; g.add(bow); });
  return g;
}

// 方塊聖誕樹＋彩燈（可由下往上亮）＋星星 / voxel Christmas tree with lights that switch on bottom-up, plus a star
export function xmasTree(scene, x, z, { h = 6 } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const logs = [[0, 0, 0]], lv = [];
  const layers = []; for (let y = 1; y <= h; y++) layers.push([y, Math.max(0, Math.round((h - y) * 0.5 + 0.2))]);
  layers.forEach(([y, rad]) => { for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) if (Math.abs(dx) + Math.abs(dz) <= rad + (rad > 1 ? 1 : 0)) lv.push([dx, y, dz]); });
  g.add(instanced(BT.log(), logs));
  const lt = blockType({ all: (gg) => { noisy(gg, 16, 16, '#2d7a3e', 0.14, 61); } }, { key: 'xleaf' });
  g.add(instanced(lt, lv));
  // 彩燈：小發光方塊 / bulbs
  const cols = ['#ff4646', '#ffd23f', '#4fb3ff', '#ff7ae0', '#7dff7a'], bulbs = [], r = rng(12);
  lv.forEach(([dx, y, dz]) => {
    const rad = layers[y - 1][1]; const edge = Math.abs(dx) + Math.abs(dz) >= rad; if (!edge || r() < 0.45) return;
    const c = new THREE.Color(cols[(r() * cols.length) | 0]);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0 }));
    const n = new THREE.Vector3(dx, 0, dz).normalize(); if (!isFinite(n.x)) n.set(0, 0, 1);
    m.position.set(dx + 0.5 + n.x * 0.52, y + 0.2 + r() * 0.5, dz + 0.5 + n.z * 0.52); g.add(m); bulbs.push({ m, y: m.position.y });
  });
  const star = part(8, 8, 3, { all: (gg) => { const S = [[3, 0], [4, 0], [3, 1], [4, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [2, 4], [3, 4], [4, 4], [5, 4], [1, 5], [2, 5], [5, 5], [6, 5], [0, 6], [1, 6], [6, 6], [7, 6]]; S.forEach(([a, b]) => px(gg, a, b, '#ffd84a')); } }, { key: 'star', transparent: true, emissive: new THREE.Color('#ffcf3a'), ei: 0 });
  star.material.forEach(m => { m.alphaTest = 0.5; m.emissiveMap = m.map; });
  star.position.set(0.5, h + 1.45, 0.5); g.add(star);
  const glow = new THREE.PointLight('#ffd27a', 0, 9, 1.6); glow.position.set(0.5, h * 0.6, 1.5); g.add(glow);
  // on 0..1＝亮到幾成高度 / on = fraction of height lit
  const setOn = (on, t = 0) => {
    bulbs.forEach((b, i) => { const k = Math.max(0, Math.min(1, (on * (h + 1) - b.y) * 2)); b.m.material.emissiveIntensity = k * (2.2 + Math.sin(t * 3 + i) * 0.6); });
    const sk = Math.max(0, Math.min(1, (on - 0.92) * 12)); star.material.forEach(m => m.emissiveIntensity = sk * 3.2); glow.intensity = on * 5;
  };
  setOn(0); return { group: g, setOn, star };
}

// ---------- 第 2 幕起共用道具 / props used from scene 2 on ----------
// 背包：主袋＋前口袋＋拉鍊頭；setBulge(0..1) 讓主袋鼓起 / backpack with front pocket and zipper pull
export function backpack(color = '#e8792a', trim = '#24305e') {
  const g = new THREE.Group();
  const body = part(10, 12, 6, { all: (gg, W, H) => { noisy(gg, W, H, color, 0.06, 301); px(gg, 0, 0, trim, W, 1); px(gg, 0, H - 1, trim, W, 1); }, top: trim }, { key: 'bp-body' + color });
  body.position.y = 6 * PX; g.add(body);
  const pocket = part(8, 5, 2, { all: (gg, W, H) => { noisy(gg, W, H, trim, 0.06, 302); px(gg, 0, 0, '#d9d9d9', W, 1); } }, { key: 'bp-pocket' + trim });
  pocket.position.set(0, 3.5 * PX, 4 * PX); g.add(pocket);
  const zip = part(1.5, 2, 1, { all: '#f2d04a' }, { key: 'bp-zip', emissive: 0x221800 }); zip.position.set(-3 * PX, 6 * PX, 5.2 * PX); g.add(zip);
  [-1, 1].forEach(s => { const st = part(2, 10, 1, { all: trim }, { key: 'bp-strap' + trim }); st.position.set(s * 3 * PX, 6 * PX, -3.4 * PX); g.add(st); });
  return { group: g, body, pocket, zip, setBulge: (k) => { body.scale.set(1 + 0.08 * k, 1 + 0.05 * k, 1 + 0.35 * k); }, setZip: (k) => { zip.position.x = (-3 + 6 * k) * PX; } };
}
// 拐杖糖：紅白方塊排成 J 形 / candy cane built from red/white cubes in a J
export function candyCane(scale = 1) {
  const g = new THREE.Group();
  const cells = [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 7], [2, 7], [3, 6], [3, 5]];
  cells.forEach(([x, y], i) => { const c = part(2, 2, 2, { all: i % 2 ? '#f6f3ee' : '#d62f2f' }, { key: 'cane' + (i % 2), amt: 0.02 }); c.position.set((x * 2 - 3) * PX, (y * 2 + 1) * PX, 0); g.add(c); });
  g.scale.setScalar(scale); return g;
}
// 地圖：可摺的平面（fold 0..2 = 對摺次數）/ a foldable pixel map
export function treasureMap() {
  const tex = pixTex(32, 24, (gg) => { noisy(gg, 32, 24, '#efe0b8', 0.05, 311); noisy(gg, 14, 9, '#7fbf6a', 0.08, 312, 3, 3); noisy(gg, 10, 8, '#7fbf6a', 0.08, 313, 18, 12); for (let x = 0; x < 32; x++) px(gg, x, 12 + Math.round(Math.sin(x * 0.5) * 2), '#5aa7e0');
    /* 紅色虛線路線→右上角的雪花（北極）/ dotted red route to a snowflake in the top-right (the North Pole) */
    [[3, 20], [5, 19], [7, 18], [9, 16], [11, 15], [13, 13], [15, 11], [17, 9], [19, 8], [21, 6], [23, 5]].forEach(([x, y]) => px(gg, x, y, '#c4282c'));
    [[27, 2], [27, 3], [27, 4], [26, 3], [28, 3], [25, 2], [29, 4], [25, 4], [29, 2]].forEach(([x, y]) => px(gg, x, y, '#ffffff')); px(gg, 27, 3, '#5aa7e0'); gg.strokeStyle = '#8a6a3a'; gg.strokeRect(0.5, 0.5, 31, 23); }, 'map');
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.46), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.9 }));
  m.rotation.x = -Math.PI / 2; m.castShadow = true;
  const g = new THREE.Group(); g.add(m);
  return { group: g, setFold: (k) => { const s = k < 1 ? 1 - 0.5 * k : 0.5 - 0.25 * (k - 1); m.scale.set(s, k < 1 ? 1 : 1 - 0.5 * (k - 1), 1); } };
}
// 摺好的外套 / folded coat
export function foldedCoat(color = '#2f4a8a') {
  return part(10, 4, 7, { all: (gg, W, H) => { noisy(gg, W, H, color, 0.07, 321); px(gg, 0, 0, '#e8792a', W, 1); } }, { key: 'coat' + color });
}
// 教室桌子 / classroom desk (top at 0.8)
export function desk() {
  const g = new THREE.Group();
  const top = part(18, 2, 11, { all: PAINT.plank }, { key: 'desk-top' }); top.position.y = 12 * PX; g.add(top);
  [[-8, -4.5], [8, -4.5], [-8, 4.5], [8, 4.5]].forEach(([x, z]) => { const l = part(1, 11, 1, { all: '#6b7280' }, { key: 'desk-leg' }); l.position.set(x * PX, 5.5 * PX, z * PX); g.add(l); });
  return g;
}
