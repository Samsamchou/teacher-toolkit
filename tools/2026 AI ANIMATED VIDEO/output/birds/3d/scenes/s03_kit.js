// s03_kit.js — s03／s04 共用小工具：同學（膠囊身體＋球頭）、書包、教室／臥室牆、灰化材質
// Shared helpers for s03/s04: low-poly classmates, a backpack, rooms with a window hole, gray-out materials.
import { THREE, V, C, lerp, hash, feather } from '../engine/world.js';

export const M = '../../models/';
// 翅膀支點移到中心（左右翅膀接合處）/ move the wing pivot to its centre
export function centerPivot(h) { const sz = h.userData.size; h.children[0].position.y -= sz.y / 2; }
// 臉部補光跟著鏡頭（camAt 之後呼叫）/ face fill riding with the camera
export function fillAt(L, cam, k = 1.2, col = '#ffe8cc', dist = 6) { L.fill.position.copy(cam.position).add(V(0, .3, 0)); L.fill.intensity = k; L.fill.color.set(col); L.fill.distance = dist; }

// 灰化：記住原色，k=0 原色、k=1 灰 / remember original colours, lerp toward their own luminance
export function grayable(mats) {
  const orig = mats.map(m => m.color.clone());
  return k => mats.forEach((m, i) => { const o = orig[i], l = o.r * .3 + o.g * .59 + o.b * .11, g = C('#000').setRGB(l * .9 + .05, l * .9 + .05, l * .95 + .06); m.color.copy(o).lerp(g, k); });
}

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .85, flatShading: true, ...o });
// 同學：膠囊身體＋球頭（低多邊形、柔和顏色）/ a classmate: capsule body + ball head
export function classmate({ shirt = '#7fb3d5', pants = '#5a6a8a', hair = '#4a3428', skin = '#f0cfae', h = 1.45, mood = 'flat', girl = false } = {}) {
  const g = new THREE.Group(), mats = [];
  const mk = (geo, col, o) => { const m = std(col, o); mats.push(m); const me = new THREE.Mesh(geo, m); me.castShadow = true; me.receiveShadow = true; return me; };
  const s = h / 1.45; const body = new THREE.Group(); body.scale.setScalar(s); g.add(body);
  for (const x of [-.08, .08]) { const l = mk(new THREE.CylinderGeometry(.065, .06, .56, 7), pants); l.position.set(x, .28, 0); body.add(l); }
  const torso = mk(new THREE.CapsuleGeometry(.17, .36, 6, 14), shirt, { flatShading: false }); torso.position.y = .9; torso.scale.z = .8; body.add(torso);
  if (girl) { const sk = mk(new THREE.CylinderGeometry(.17, .25, .28, 8), shirt); sk.position.y = .62; body.add(sk); }
  const head = new THREE.Group(); head.position.y = 1.39; body.add(head);
  head.add(mk(new THREE.IcosahedronGeometry(.15, 4), skin, { flatShading: false }));
  const hairM = mk(new THREE.SphereGeometry(.162, 10, 6, 0, Math.PI * 2, 0, Math.PI * .55), hair); hairM.position.set(0, .01, -.012); hairM.rotation.x = -.25; head.add(hairM);
  if (girl) for (const x of [-.13, .13]) { const p = mk(new THREE.IcosahedronGeometry(.06, 1), hair); p.position.set(x, -.02, -.07); head.add(p); }
  const eyeM = new THREE.MeshBasicMaterial({ color: '#2a1e1c' });
  for (const x of [-.05, .05]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.017, 8, 6), eyeM); e.position.set(x, .02, .138); head.add(e); }
  const mouthM = new THREE.MeshBasicMaterial({ color: '#8a3a34' });
  const mouth = mood === 'smile' ? new THREE.Mesh(new THREE.TorusGeometry(.04, .009, 6, 12, Math.PI), mouthM) : new THREE.Mesh(new THREE.BoxGeometry(.05, .01, .01), mouthM);
  if (mood === 'smile') mouth.rotation.z = Math.PI; mouth.position.set(0, mood === 'smile' ? -.03 : -.055, .14); head.add(mouth);
  const arms = [-1, 1].map(sd => { const p = new THREE.Group(); p.position.set(.215 * sd, 1.2, 0); const a = mk(new THREE.CylinderGeometry(.05, .045, .5, 6), shirt); a.position.y = -.25; p.add(a);
    const hand = mk(new THREE.IcosahedronGeometry(.05, 1), skin); hand.position.y = -.52; p.add(hand); p.rotation.z = .12 * sd; body.add(p); return p; });
  g.userData = { mats, head, armL: arms[0], armR: arms[1], body, gray: grayable(mats) };
  // 走路的小晃動（定格感）/ simple walk wobble
  g.walk = (t, on = 1) => { const w = Math.sin(t * 9) * on; arms[0].rotation.x = .5 * w; arms[1].rotation.x = -.5 * w; body.position.y = Math.abs(Math.sin(t * 9)) * .025 * on; };
  return g;
}

// 書包 / a backpack (front of the group = +Z, so it sits behind a character when placed at -z)
export function backpack(color = '#e2a93b') {
  const g = new THREE.Group(); const m = std(color, { flatShading: false, roughness: .7 }), d = std('#9a6a24');
  const b = new THREE.Mesh(new THREE.BoxGeometry(.3, .36, .13), m); b.castShadow = true; g.add(b);
  const flap = new THREE.Mesh(new THREE.BoxGeometry(.31, .14, .14), std('#c98d2a', { flatShading: false })); flap.position.set(0, .12, .006); g.add(flap);
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(.2, .12, .05), std('#c98d2a', { flatShading: false })); pocket.position.set(0, -.08, -.08); g.add(pocket);
  for (const x of [-.09, .09]) { const s = new THREE.Mesh(new THREE.TorusGeometry(.13, .016, 5, 10, Math.PI), d); s.rotation.y = Math.PI / 2; s.position.set(x, .06, .1); g.add(s); }
  return g;
}

// 胸前小羽毛墜子 / a tiny feather pendant
export function pendant() { const f = feather({ glow: 1.4 }); f.scale.setScalar(.055); f.rotation.z = .25; return f; }

// 臉上的青綠羽毛紋（左右臉頰各兩片小羽毛）/ teal feather marks on the cheeks
export function cheekMarks() {
  const g = new THREE.Group(); const mat = new THREE.MeshBasicMaterial({ color: '#5ff2df', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const sh = new THREE.Shape(); sh.moveTo(0, -.5); sh.bezierCurveTo(.2, -.2, .2, .2, 0, .5); sh.bezierCurveTo(-.2, .2, -.2, -.2, 0, -.5);
  const geo = new THREE.ShapeGeometry(sh, 10);
  for (const sd of [-1, 1]) for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(geo, mat); m.scale.setScalar(.03 - i * .008); m.position.set(sd * (.05 + i * .012), -i * .022, 0); m.rotation.z = sd * (.9 + i * .3); g.add(m); }
  g.userData.mat = mat; return g;
}

// 有窗洞的房間：左牆（x=-w/2）開一個窗 / a box room with a window hole in the left wall
export function room({ w = 8, d = 9, h = 3.2, wall = '#efe2c8', floor = '#b98b5e', win = { z0: -2.2, z1: .6, y0: .9, y1: 2.5 }, frame = '#f7f1e4', ceiling = true } = {}) {
  const g = new THREE.Group(), wm = new THREE.MeshStandardMaterial({ color: wall, roughness: .95 }), fm = new THREE.MeshStandardMaterial({ color: floor, roughness: .8 });
  const box = (sx, sy, sz, x, y, z, m = wm, cast = true) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, z); b.castShadow = cast; b.receiveShadow = true; g.add(b); return b; };
  box(w, .1, d, 0, -.05, 0, fm, false);
  const L = -w / 2, t = .2;
  box(t, win.y0, d, L, win.y0 / 2, 0); box(t, h - win.y1, d, L, (win.y1 + h) / 2, 0);
  box(t, win.y1 - win.y0, win.z0 + d / 2, L, (win.y0 + win.y1) / 2, (-d / 2 + win.z0) / 2); box(t, win.y1 - win.y0, d / 2 - win.z1, L, (win.y0 + win.y1) / 2, (win.z1 + d / 2) / 2);
  box(t, h, d, -L, h / 2, 0); box(w, h, t, 0, h / 2, -d / 2); box(w, h, t, 0, h / 2, d / 2);
  if (ceiling) box(w, .1, d, 0, h + .05, 0, wm, false);
  const frM = new THREE.MeshStandardMaterial({ color: frame, roughness: .6 });
  const zc = (win.z0 + win.z1) / 2, yc = (win.y0 + win.y1) / 2;
  box(.24, .06, win.z1 - win.z0 + .1, L, win.y0, zc, frM); box(.24, .06, win.z1 - win.z0 + .1, L, win.y1, zc, frM);
  box(.24, win.y1 - win.y0, .06, L, yc, win.z0, frM); box(.24, win.y1 - win.y0, .06, L, yc, win.z1, frM); box(.08, win.y1 - win.y0, .04, L, yc, zc, frM); box(.08, .04, win.z1 - win.z0, L, yc, zc, frM);
  g.userData = { wallMat: wm, floorMat: fm }; return g;
}
export const deskMat = () => new THREE.MeshStandardMaterial({ color: '#c8935a', roughness: .7 });
export function desk(m = deskMat()) {
  const g = new THREE.Group(); const top = new THREE.Mesh(new THREE.BoxGeometry(.9, .05, .55), m); top.position.y = .72; top.castShadow = top.receiveShadow = true; g.add(top);
  const lm = new THREE.MeshStandardMaterial({ color: '#6b6f78', roughness: .5 });
  for (const [x, z] of [[-.4, -.23], [.4, -.23], [-.4, .23], [.4, .23]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .72, 6), lm); l.position.set(x, .36, z); g.add(l); }
  return g;
}
export { hash, lerp };
