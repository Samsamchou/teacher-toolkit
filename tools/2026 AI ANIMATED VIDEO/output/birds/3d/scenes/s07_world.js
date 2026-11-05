// s07_world.js — s07／s08 共用：崖邊紀念草地（十字架＋媽媽照片＋紫色花）、小工具
// Shared by s07 and s08: the memorial meadow on the cliff (cross, mom's framed photo, purple flowers) + small helpers.
import { THREE, V, C, lerp, hash, skyDome, setSky, cloudField, hills, groundY, tree, motes, valAt, lightRig, loadModel, makeChar } from '../engine/world.js';

// 翅膀支點移到中心（同 s02）/ wing pivot at the centre, like s02
export function centerPivot(h) { const sz = h.userData.size; h.children[0].position.y -= sz.y / 2; }
// 臉部補光跟著鏡頭（camAt 之後呼叫）/ face fill riding with the camera — call after camAt
export const fill = (L, cam, k = 1.2, col = '#ffe8cc', dist = 6) => { L.fill.position.copy(cam.position).add(V(0, .3, 0)); L.fill.intensity = k; L.fill.color.set(col); L.fill.distance = dist; };
// 鳥朝飛行方向 / point a bird along its velocity (model front = +Z)
export function birdFace(b, dx, dy, dz, roll = 0) { const h = Math.hypot(dx, dz); b.rotation.set(-Math.atan2(dy, h) * .8, Math.atan2(dx, dz), roll, 'YXZ'); }
// 柔光球貼圖 / soft glow sprite
let _gt;
export function glowSprite(col = 'rgba(255,240,200,1)', size = .5) {
  if (!_gt) { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); _gt = new THREE.CanvasTexture(cv); }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: _gt, color: col, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sp.scale.setScalar(size); return sp;
}

// ════════ 崖邊紀念草地 / memorial meadow on the cliff ════════
// 地面在 z<2.5（崖邊在 z=2.5，往 +Z 是山谷與雲海）；十字架在 (CX, CZ)，女孩跪在 (GX, GZ)
export const CX = -.75, CZ = -.45, GX = .2, GZ = .3;
const GA = { amp: .12, freq: .35 };
export const gm = (x, z) => groundY(x, z + 27.5, GA);
export async function buildMeadow(M) {
  const G = new THREE.Scene(); G.background = C('#8f9c90'); G.fog = new THREE.Fog('#8f9c90', 20, 160);
  const sky = skyDome(); G.add(sky);
  const L = lightRig(G);
  const ground = hills({ w: 90, d: 60, seg: 90, ...GA, color: '#5d6e55' }); ground.position.z = -27.5; G.add(ground);
  const rockM = new THREE.MeshStandardMaterial({ color: '#8a8074', roughness: 1, flatShading: true });
  const cliff = new THREE.Mesh(new THREE.BoxGeometry(90, 30, 4, 30, 6, 1), rockM); cliff.position.set(0, -15.28, .5); G.add(cliff);
  { const p = cliff.geometry.attributes.position; for (let i = 0; i < p.count; i++) if (p.getZ(i) > 1.9 && p.getY(i) < 14.9) p.setZ(i, p.getZ(i) + (hash(i * 3.1) - .5) * .9); cliff.geometry.computeVertexNormals(); }
  // 山谷與遠方 / the valley far below
  const valley = hills({ w: 500, d: 400, seg: 80, amp: 7, freq: .025, color: '#5f6f5a' }); valley.position.set(0, -34, 190); G.add(valley);
  const mist = cloudField({ n: 60, area: [320, 260], y: [-26, -20], size: [30, 60], seed: 31, color: '#e8eee6', opacity: .7 }); mist.position.z = 150; G.add(mist);
  const high = cloudField({ n: 22, area: [400, 200], y: [30, 60], size: [30, 60], seed: 33, color: '#ffffff', opacity: .6 }); high.position.z = 60; G.add(high);
  // 背後的樹 / trees behind
  const trees = [];
  for (let i = 0; i < 40; i++) { const x = (hash(i + 700) - .5) * 70, z = -9 - hash(i + 701) * 40; const t = tree({ h: 4.5 + hash(i + 702) * 3.5, r: 1.4 + hash(i + 703) * .8, seed: i + 700, crown: '#5c7050' });
    t.position.set(x, gm(x, z) - .1, z); G.add(t); trees.push(t); }
  // 紀念十字架 / the memorial cross
  const wood = new THREE.MeshStandardMaterial({ color: '#7a5a3c', roughness: .85 });
  const cross = new THREE.Group(); const cy0 = gm(CX, CZ);
  { const a = new THREE.Mesh(new THREE.BoxGeometry(.09, 1.25, .07), wood); a.position.y = .55; const b = new THREE.Mesh(new THREE.BoxGeometry(.66, .085, .07), wood); b.position.y = .92;
    a.castShadow = b.castShadow = true; cross.add(a, b); }
  cross.position.set(CX, cy0 - .06, CZ); cross.rotation.y = .25; G.add(cross);
  // 媽媽照片（mom.png 左半裁頭肩）＋木頭相框 / mom's photo with a wooden frame
  const tex = await new THREE.TextureLoader().loadAsync('../../characters/mom.png'); tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(280 / 1536, 350 / 1024); tex.offset.set(70 / 1536, 1 - 360 / 1024);
  const frame = new THREE.Group();
  { const fm = new THREE.MeshStandardMaterial({ color: '#8a6440', roughness: .7 });
    const back = new THREE.Mesh(new THREE.BoxGeometry(.3, .37, .025), fm); frame.add(back);
    const photoM = new THREE.MeshStandardMaterial({ map: tex, roughness: .55, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: .25 });
    const ph = new THREE.Mesh(new THREE.PlaneGeometry(.236, .295), photoM); ph.position.z = .0135; frame.add(ph); frame.userData.photoM = photoM;
    const bar = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, .04), fm); m.position.set(x, y, .01); frame.add(m); };
    bar(.3, .035, 0, .168); bar(.3, .035, 0, -.168); bar(.035, .37, -.133, 0); bar(.035, .37, .133, 0); }
  frame.position.set(0, .6, .055); frame.rotation.x = -.05; cross.add(frame);
  // 紫色花 / purple flowers
  const purple = new THREE.MeshStandardMaterial({ color: '#8457c4', roughness: .6, emissive: '#2a1048', emissiveIntensity: .3 });
  const lilac = new THREE.MeshStandardMaterial({ color: '#b48ae0', roughness: .6 });
  const stem = new THREE.MeshStandardMaterial({ color: '#4f7a3a', roughness: .8 });
  const flowers = new THREE.Group(); G.add(flowers);
  for (let i = 0; i < 22; i++) { const a = -.3 + hash(i + 40) * 3.6, r = .18 + hash(i + 41) * .3, x = CX + Math.cos(a) * r * 1.2, z = CZ + .12 + Math.sin(a) * r * .7 + .1, h = .12 + hash(i + 42) * .14;
    const f = new THREE.Group(); const s = new THREE.Mesh(new THREE.CylinderGeometry(.004, .005, h, 5), stem); s.position.y = h / 2; f.add(s);
    for (let j = 0; j < 5; j++) { const p = new THREE.Mesh(new THREE.SphereGeometry(.018, 8, 6), j % 2 ? lilac : purple); p.position.set(Math.cos(j * 1.26) * .02, h + .005 + (j % 2) * .01, Math.sin(j * 1.26) * .02); f.add(p); }
    f.position.set(x, gm(x, z) - .01, z); f.rotation.set((hash(i + 43) - .5) * .4, 0, (hash(i + 44) - .5) * .4); flowers.add(f); }
  // 一束放在地上的紫花 / a bouquet laid at the foot of the cross
  { const bq = new THREE.Group(); for (let j = 0; j < 9; j++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, .3, 5), stem); s.rotation.z = Math.PI / 2 + (hash(j + 60) - .5) * .3; s.position.set(0, .02, (j - 4) * .006); bq.add(s);
      const p = new THREE.Mesh(new THREE.SphereGeometry(.026, 8, 6), j % 2 ? lilac : purple); p.position.set(.15 + hash(j + 61) * .04, .03, (j - 4) * .014); bq.add(p); }
    bq.position.set(CX + .05, gm(CX, CZ + .2) + .01, CZ + .22); bq.rotation.y = .6; flowers.add(bq); }
  // 野花（顏色回來時才看得出）/ wildflowers that pop when colour returns
  const wild = new THREE.Group(); G.add(wild); const wildCols = ['#f4d35e', '#ffffff', '#f49ac1', '#b48ae0'];
  for (let i = 0; i < 160; i++) { const x = (hash(i + 900) - .5) * 24, z = 2.3 - hash(i + 901) * 22; if (Math.hypot(x - GX, z - GZ) < .8) continue;
    const m = new THREE.Mesh(new THREE.SphereGeometry(.03 + hash(i + 902) * .02, 6, 5), new THREE.MeshStandardMaterial({ color: wildCols[i % 4], roughness: .7 })); m.position.set(x, gm(x, z) + .03, z); wild.add(m); }
  const gMotes = motes({ n: 220, area: [10, 4, 10], color: '#fff6d8', size: .035, seed: 21 }); G.add(gMotes);
  const girl = await makeChar(M, { D13C: 'D13C.glb', D13D: 'D13D.glb' }, { D13C: 1.05, D13D: 1.55 }); G.add(girl);
  girl.position.set(GX, gm(GX, GZ), GZ); girl.rotation.y = -.55;
  const cam = new THREE.PerspectiveCamera(35, 16 / 9, .03, 900);
  return { G, sky, L, ground, cliff, rockM, valley, mist, high, trees, cross, frame, flowers, wild, gMotes, girl, cam };
}
// 草地季節：g＝0 灰綠、1 淡綠、2 春綠＋日出金 / meadow season: 0 grey-green, 1 pale green, 2 spring green + gold
export function setMeadow(m, g) {
  const k = [[0, 0], [1, 1], [2, 2]];
  const col = (a, b, c) => valAt([[0, a], [1, b], [2, c]], g);
  setSky(m.sky, { top: col('#7f8c88', '#8fb0b8', '#79a8d8'), mid: col('#a9b4ab', '#cfe0c8', '#ffd9a0'), bot: col('#b8c0b4', '#dde8cc', '#ffe6b8'),
    sunDir: V(.75, lerp(.18, .14, g / 2), .55), sunCol: col('#e8eee0', '#fff6dc', '#fff0c8'), sunSize: 0, sunGlow: lerp(.15, .9, g / 2) });
  m.G.fog.color.set(col('#8f9c90', '#c6d8bf', '#f2dcb4')); m.G.background.copy(m.G.fog.color);
  m.ground.material.color.set(col('#5d6e55', '#6f9450', '#74a845'));
  m.trees.forEach(t => t.userData.crown.color.set(col('#5c7050', '#6a944c', '#5d9c40')));
  m.valley.material.color.set(col('#5f6f5a', '#6e8e5c', '#7aa25a'));
  m.mist.userData.mat.color.set(col('#e0e6de', '#f2f6ea', '#fff0d8'));
  m.L.hemi.color.set(col('#d8e2dc', '#ecffe0', '#fff2dc')); m.L.hemi.groundColor.set(col('#4a5246', '#56603e', '#6a5a38')); m.L.hemi.intensity = lerp(.8, 1.0, g / 2);
  m.L.key.color.set(col('#e6ece6', '#fff4dc', '#ffcf8a')); m.L.key.intensity = lerp(1.0, 2.6, g / 2);
  m.L.key.position.set(9, lerp(10, 6, g / 2), 8); m.L.key.target.position.set(0, 0, 0);
  m.L.rim.color.set(col('#dfe8e4', '#fff2d8', '#ffd08a')); m.L.rim.intensity = lerp(.5, 1.8, g / 2); m.L.rim.position.set(-3, 5, -8);
}
