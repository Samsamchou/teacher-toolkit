// s06_set.js — s06 的佈景：學校餐廳（長桌、椅子、坐著的膠囊同學、餐盤）、冬夜的家門口、閃電、白羽毛
// Sets for s06: the school cafeteria, the house at night, a lightning bolt, white feathers.
import { THREE, V, C, hash, feather } from '../engine/world.js';
import { classmate } from './s03_kit.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .85, ...o });
function box(w, h, d, mat, x, y, z, g) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; if (g) g.add(m); return m; }

// 塑膠椅（正面朝 +Z）/ a plastic cafeteria chair, front = +Z
export function chair(mat) {
  const g = new THREE.Group(), leg = std('#7a7e86', { metalness: .3, roughness: .5 });
  box(.42, .04, .42, mat, 0, .45, 0, g);
  for (const [x, z] of [[-.18, -.18], [.18, -.18], [-.18, .18], [.18, .18]]) box(.03, .45, .03, leg, x, .225, z, g);
  box(.4, .3, .03, mat, 0, .78, -.2, g); box(.03, .35, .03, leg, -.18, .6, -.2, g); box(.03, .35, .03, leg, .18, .6, -.2, g);
  return g;
}
// 餐盤（一盤飯、一碗湯、一盒牛奶）/ a lunch tray
export function tray() {
  const g = new THREE.Group();
  box(.42, .02, .3, std('#7d8a96', { roughness: .5 }), 0, .01, 0, g);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(.09, .075, .015, 20), std('#eeeae2', { roughness: .4 })); plate.position.set(-.08, .03, .02); g.add(plate);
  const food = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), std('#e8dcc0')); food.position.set(-.08, .037, .02); g.add(food);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(.055, .04, .045, 16), std('#eeeae2', { roughness: .4 })); bowl.position.set(.1, .042, -.05); g.add(bowl);
  box(.05, .09, .05, std('#d8e2ee'), .12, .065, .08, g);
  return g;
}
// 坐著的同學：把直的腿藏起來，換成彎的大腿＋小腿 / a seated classmate (bent legs)
export function seatedMate(opt, seatY = .47) {
  const m = classmate(opt), u = m.userData, b = u.body, s = b.scale.x;
  b.children[0].visible = b.children[1].visible = false;
  const lm = u.mats[0];
  for (const x of [-.08, .08]) {
    const th = new THREE.Mesh(new THREE.CylinderGeometry(.065, .062, .42, 7), lm); th.rotation.x = Math.PI / 2; th.position.set(x, .56, .19); th.castShadow = true; b.add(th);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(.06, .055, .52, 7), lm); sh.position.set(x, .32, .38); sh.castShadow = true; b.add(sh);
  }
  m.position.y = seatY - .56 * s;
  u.armL.rotation.x = u.armR.rotation.x = -.55;   // 手放到桌上 / hands forward onto the table
  return m;
}

// ════════ 學校餐廳 / the school cafeteria ════════
// 長桌沿 X（−4.2…4.2），桌面高 .74；兩排椅子 z=±.8。同學在左端（x≈−3.9…−2.5），她坐在右端 x=3.4 遠側。
export const CAFE = { girl: V(3.4, 0, -.82) };
export async function buildCafe() {
  const S = new THREE.Scene(); S.background = C('#c9ced6'); S.fog = new THREE.Fog('#c9ced6', 9, 26);
  const hemi = new THREE.HemisphereLight('#e6ecf4', '#7d7a76', 1.5); S.add(hemi);
  const key = new THREE.DirectionalLight('#eef3fb', 2.0); key.position.set(-3, 7, -8); key.target.position.set(0, 0, 0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: .5, far: 30 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02; S.add(key, key.target);
  const fill = new THREE.PointLight('#ffffff', 0, 6, 2); S.add(fill);
  const g = new THREE.Group(); S.add(g);
  const wall = std('#b4bac4', { roughness: .95 }), floorM = std('#8e9298', { roughness: .7 });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(20, 13), floorM); fl.rotation.x = -Math.PI / 2; fl.position.z = 1.5; fl.receiveShadow = true; g.add(fl);
  for (let i = -8; i <= 8; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(.012, 10), std('#777b82')); l.rotation.x = -Math.PI / 2; l.position.set(i, .002, 0); g.add(l); }
  for (let i = -5; i <= 7; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(16, .012), std('#777b82')); l.rotation.x = -Math.PI / 2; l.position.set(0, .002, i); g.add(l); }
  box(20, 3.6, .2, wall, 0, 1.8, 7.9, g); box(.2, 3.6, 13, wall, -9.6, 1.8, 1.5, g); box(.2, 3.6, 13, wall, 9.6, 1.8, 1.5, g);
  // 後牆＋三扇高窗（冬天灰白的天光）/ back wall with three tall winter windows
  const back = new THREE.Group(); g.add(back); back.position.z = -4.2;
  box(20, 3.6, .2, wall, 0, 1.8, -.15, back);   // 整面實牆，窗玻璃貼在前面 / a solid wall; the window panes sit in front of it
  const glassM = new THREE.MeshBasicMaterial({ color: '#e4e9f0', fog: false });
  const frameM = std('#e8e6e0');
  for (const x of [-3.4, .2, 3.8]) { const gl = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.8), glassM); gl.position.set(x, 1.8, -.03); back.add(gl);
    box(.05, 1.8, .06, frameM, x, 1.8, .02, back); box(2.2, .05, .06, frameM, x, 1.8, .02, back); }
  // 天花板燈管 / ceiling light strips
  box(20, .1, 13, wall, 0, 3.65, 1.5, g);
  const tubeM = new THREE.MeshBasicMaterial({ color: '#f4f6fa' }); for (const x of [-4, 0, 4]) for (const z of [-2, 1.5]) { const t = new THREE.Mesh(new THREE.BoxGeometry(1.4, .04, .14), tubeM); t.position.set(x, 3.58, z); g.add(t); }
  // 長桌 / the long table
  const tm = std('#bcb8ae', { roughness: .6 });
  box(8.4, .05, .9, tm, 0, .74, 0, g);
  const lm = std('#6b6f78', { metalness: .3, roughness: .5 }); for (const x of [-4, -1.4, 1.4, 4]) for (const z of [-.36, .36]) box(.05, .72, .05, lm, x, .36, z, g);
  // 椅子：兩排，每 .7 m 一張 / two rows of chairs
  const cm = std('#9aa3ad', { roughness: .6 }); const chairs = [];
  for (let i = 0; i < 12; i++) { const x = -3.85 + i * .7; for (const sd of [-1, 1]) { const c = chair(cm); c.position.set(x, 0, sd * .8); c.rotation.y = sd < 0 ? 0 : Math.PI; g.add(c); chairs.push({ c, x, sd }); } }
  const myChair = chairs.find(o => Math.abs(o.x - CAFE.girl.x) < .2 && o.sd < 0); if (myChair) myChair.c.visible = false;   // 她坐 D13B 自己的椅子
  // 同學：六個坐在左端，頭湊在一起 / six classmates huddled at the far-left end
  const look = [['#8fa8c0', '#56607a', '#3e3028', 1.5, false], ['#c09a8a', '#5a5a6a', '#2a2220', 1.45, true], ['#a3b08a', '#4e5a6a', '#4a3428', 1.52, false],
    ['#b7a4c4', '#55607a', '#30241e', 1.44, true], ['#d0b48a', '#5a6a8a', '#3a2a22', 1.5, false], ['#8ab0aa', '#4a566a', '#2a2220', 1.46, true]];
  const seats = [[-3.85, -1], [-3.15, -1], [-2.45, -1], [-3.85, 1], [-3.15, 1], [-2.45, 1]];
  const mates = seats.map(([x, sd], i) => { const [shirt, pants, hair, h, girl] = look[i];
    const m = seatedMate({ shirt, pants, hair, h, girl, mood: 'smile' }); m.position.x = x; m.position.z = sd * .8; m.userData.base = { x, z: sd * .8, sd, yaw: Math.atan2((-3.15 - x) * .9, -sd * .8) };   // 轉向圈圈中心 / turned toward the huddle
    m.rotation.y = m.userData.base.yaw; g.add(m); m.userData.gray(.45); return m; });
  // 同學的餐盤 / their trays
  for (const [x, sd] of seats) { const t = tray(); t.position.set(x, .765, sd * .2); t.rotation.y = sd < 0 ? 0 : Math.PI; g.add(t); }
  const myTray = tray(); myTray.position.set(CAFE.girl.x, .765, -.2); g.add(myTray);
  return { S, hemi, key, fill, mates };
}

// ════════ 冬夜的家（門口、院子）/ the house on a winter night ════════
export function buildHouse(S) {
  const g = new THREE.Group(); S.add(g);
  const wallM = std('#7c8298'), roofM = std('#3c3a4a'), trimM = std('#c8c4bc');
  // 房子：前牆在 z=0，門在 x=0 / front wall at z=0, door at x=0
  const W2 = 3.2, D = 5, Hh = 3;
  box(W2 * 2, Hh, .2, wallM, 0, Hh / 2, -D, g); box(.2, Hh, D, wallM, -W2, Hh / 2, -D / 2, g); box(.2, Hh, D, wallM, W2, Hh / 2, -D / 2, g);
  // 前牆留門洞與兩扇窗 / front wall with a door hole and two windows
  const dw = .5, dh = 2.1;
  box(W2 - dw, Hh, .2, wallM, -(W2 + dw) / 2, Hh / 2, 0, g); box(W2 - dw, Hh, .2, wallM, (W2 + dw) / 2, Hh / 2, 0, g); box(dw * 2, Hh - dh, .2, wallM, 0, (Hh + dh) / 2, 0, g);
  const warm = new THREE.MeshBasicMaterial({ color: '#ffcf8a' });
  for (const x of [-1.9, 1.9]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.0, .9), warm); w.position.set(x, 1.65, .11); g.add(w);
    box(1.1, .06, .08, trimM, x, 1.65, .13, g); box(.06, .95, .08, trimM, x, 1.65, .13, g); box(1.1, .08, .14, trimM, x, 1.18, .14, g); }
  // 屋頂（三角柱）/ the gable roof
  const sh = new THREE.Shape(); sh.moveTo(-W2 - .4, 0); sh.lineTo(0, 1.8); sh.lineTo(W2 + .4, 0); sh.lineTo(-W2 - .4, 0);
  const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: D + .8, bevelEnabled: false }), roofM); roof.position.set(0, Hh, -D - .4); roof.castShadow = true; g.add(roof);
  // 屋內暖光（門開才看得到）/ the warm interior behind the door
  const inside = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), warm); inside.position.set(0, 1.5, -2.2); g.add(inside);
  const inL = new THREE.PointLight('#ffc98a', 0, 9, 1.6); inL.position.set(0, 1.6, -.6); g.add(inL);
  const porch = new THREE.PointLight('#ffd49a', 3, 8, 2); porch.position.set(0, 2.45, .6); g.add(porch);
  const lampM = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffe6b8' })); lampM.position.set(0, 2.4, .2); g.add(lampM);
  // 門（以左邊為軸，往內開）/ the door, hinged on the left, opening inward
  const hinge = new THREE.Group(); hinge.position.set(-dw, 0, -.02); g.add(hinge);
  box(dw * 2, dh, .07, std('#5a3e2c'), dw, dh / 2, 0, hinge); { const k = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), std('#d8b060', { metalness: .6 })); k.position.set(dw * 2 - .1, 1.0, .05); hinge.add(k); }
  box(dw * 2 + .2, .08, .1, trimM, 0, dh + .04, .1, g); box(1.6, .12, .9, std('#6a6a70'), 0, .06, .55, g);   // 門楣、台階
  return { g, hinge, inL, porch, inside };
}

// 閃電：鋸齒形的發光線段 / a jagged glowing bolt
export function bolt() {
  const g = new THREE.Group(); const mat = new THREE.MeshBasicMaterial({ color: '#f2f6ff', transparent: true, opacity: 0, fog: false, depthWrite: false });
  let p = V(0, 0, 0); const pts = [p];
  for (let i = 1; i <= 9; i++) { p = p.clone().add(V((hash(i + 700) - .5) * 1.5, -3.2, (hash(i + 701) - .5) * 4)); pts.push(p); }
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], len = a.distanceTo(b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, len, 5), mat); m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); g.add(m);
    if (i === 3 || i === 6) { let q = pts[i]; for (let j = 0; j < 3; j++) { const r = q.clone().add(V(0, -2.2, (hash(i * 9 + j + 720) - .3) * 3)); const l2 = q.distanceTo(r);
      const mm = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, l2, 4), mat); mm.position.copy(q).add(r).multiplyScalar(.5); mm.quaternion.setFromUnitVectors(V(0, 1, 0), r.clone().sub(q).normalize()); g.add(mm); q = r; } } }
  g.userData.mat = mat; return g;
}

// 白羽毛（媽媽翅膀上的）/ white feathers from mom's wings
export function whiteFeathers(n = 16) {
  const arr = []; for (let i = 0; i < n; i++) { const f = feather({ glow: .25 }); f.userData.mat.color.set('#f4f6ff'); f.userData.mat.emissive.set('#c8d4ff'); f.scale.setScalar(.14 + hash(i + 800) * .1); arr.push(f); }
  return arr;
}

// 模型最左／最右的一點（手指尖），在姿勢模型自己的座標裡 / the extreme-x vertex (fingertip) in the pose holder's own space
export function handTip(holder, sx) {
  holder.updateMatrixWorld(true); const inv = holder.matrixWorld.clone().invert(), v = V(0, 0, 0), m = new THREE.Matrix4(); let best = null, bv = -1e9;
  holder.traverse(o => { if (!o.isMesh) return; const p = o.geometry.attributes.position; m.multiplyMatrices(inv, o.matrixWorld);
    for (let i = 0; i < p.count; i += 3) { v.fromBufferAttribute(p, i).applyMatrix4(m); if (v.x * sx > bv) { bv = v.x * sx; best = v.clone(); } } });
  return best;
}
// 背景的柔光（逆光剪影用）/ a soft backdrop glow for silhouettes
export function backGlow(col = '#a9bcff', size = 30) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), color: col, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); s.scale.setScalar(size); return s;
}
