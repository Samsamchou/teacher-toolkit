// s05_room.js — s05／s06 共用的小道具：女孩的臥室（有窗）、回憶木箱、灰色同學（膠囊身體＋球頭）
// Shared props for s05/s06: the girl's bedroom with a window, the memory box, simple capsule classmates.
import { THREE, V, C, hash } from '../engine/world.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .9, ...o });
function box(w, h, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }

// 臥室：x −2.5…2.5、z −2…3、高 2.8；後牆 z=−2 有一扇窗（x −1.05….25、y .9…2.2）
// Bedroom. Back wall at z=−2 with a window opening; the room is closed so light only enters through the window.
export const WIN = { x0: -1.05, x1: .25, y0: .9, y1: 2.2, z: -2 };
export function makeBedroom(scene, { wall = '#b9b6b0', floor = '#8a7a68', bedCol = '#9aa3ae' } = {}) {
  const g = new THREE.Group(); scene.add(g);
  const wm = std(wall), fm = std(floor, { roughness: .8 }), T = .12, Hh = 2.8;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), fm); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, .5); fl.receiveShadow = true; g.add(fl);
  // 地板木紋條 / floor boards
  for (let i = 0; i < 10; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(.01, 5), std('#5e5246')); s.rotation.x = -Math.PI / 2; s.position.set(-2.5 + i * .5, .002, .5); g.add(s); }
  g.add(box(5, T, 5, wm, 0, Hh + T / 2, .5));                                  // 天花板
  g.add(box(T, Hh, 5, wm, -2.5 - T / 2, Hh / 2, .5), box(T, Hh, 5, wm, 2.5 + T / 2, Hh / 2, .5), box(5, Hh, T, wm, 0, Hh / 2, 3 + T / 2));
  // 後牆＝窗戶四周四塊 / back wall built around the window hole
  const { x0, x1, y0, y1, z } = WIN, zc = z - T / 2;
  g.add(box(x0 + 2.5, Hh, T, wm, (-2.5 + x0) / 2, Hh / 2, zc), box(2.5 - x1, Hh, T, wm, (x1 + 2.5) / 2, Hh / 2, zc),
        box(x1 - x0, y0, T, wm, (x0 + x1) / 2, y0 / 2, zc), box(x1 - x0, Hh - y1, T, wm, (x0 + x1) / 2, (Hh + y1) / 2, zc));
  // 窗框＋十字窗格＋窗台 / frame, muntins, sill
  const frm = std('#e8e2d6');
  g.add(box(x1 - x0 + .1, .06, .2, frm, (x0 + x1) / 2, y0 - .01, z - .02));      // 窗台
  g.add(box(x1 - x0, .04, .05, frm, (x0 + x1) / 2, y1, z - .06), box(.04, y1 - y0, .05, frm, x0, (y0 + y1) / 2, z - .06), box(.04, y1 - y0, .05, frm, x1, (y0 + y1) / 2, z - .06));
  g.add(box(.035, y1 - y0, .04, frm, (x0 + x1) / 2, (y0 + y1) / 2, z - .06), box(x1 - x0, .035, .04, frm, (x0 + x1) / 2, (y0 + y1) / 2 + .1, z - .06));
  const outSill = box(x1 - x0 + .2, .05, .3, frm, (x0 + x1) / 2, y0 - .03, z - .22); g.add(outSill);
  // 床（靠右牆）/ bed against the right wall
  const bed = new THREE.Group(); g.add(bed);
  bed.add(box(1.0, .32, 2.0, std('#6b5444'), 1.95, .16, -.95), box(.96, .16, 1.94, std(bedCol), 1.95, .4, -.95), box(.6, .1, .3, std('#d9d6cf'), 1.95, .52, -1.7), box(1.0, .75, .06, std('#6b5444'), 1.95, .37, -1.97));
  const blanket = box(.98, .05, 1.2, std('#7f8a99'), 1.95, .5, -.5); bed.add(blanket); bed.userData.blanket = blanket;
  // 床頭櫃＋小檯燈 / nightstand with a small lamp
  g.add(box(.4, .5, .36, std('#6b5444'), 1.2, .25, -1.75));
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(.08, .12, .14, 16, 1, true), std('#f2e2c4', { side: THREE.DoubleSide, emissive: '#ffcf8a', emissiveIntensity: .0 })); shade.position.set(1.2, .72, -1.75); g.add(shade);
  g.add(box(.02, .16, .02, std('#444'), 1.2, .58, -1.75));
  const lamp = new THREE.PointLight('#ffc98a', 0, 3.5, 2); lamp.position.set(1.2, .7, -1.72); g.add(lamp);
  // 牆上一張小畫（空白相框）/ a small frame on the wall
  g.add(box(.5, .38, .03, std('#5b4636'), 1.8, 1.6, -1.98), box(.42, .3, .01, std('#c8c2b6'), 1.8, 1.6, -1.965));
  return { group: g, bed, lamp, shade, sillY: y0 + .02, outSill, wallMat: wm, floorMat: fm };
}

// 回憶木箱：蓋子以後緣為軸 / the memory box with a hinged lid (set lid open 0..1)
export function memoryBox() {
  const g = new THREE.Group(), wood = std('#8a5a3a', { roughness: .7 }), dark = std('#4a2e1e');
  const w = .42, h = .2, d = .3, t = .02;
  g.add(box(w, t, d, wood, 0, t / 2, 0), box(w, h, t, wood, 0, h / 2, d / 2 - t / 2), box(w, h, t, wood, 0, h / 2, -d / 2 + t / 2), box(t, h, d, wood, w / 2 - t / 2, h / 2, 0), box(t, h, d, wood, -w / 2 + t / 2, h / 2, 0));
  g.add(box(w - .05, .005, d - .05, std('#3d6b66'), 0, t + .003, 0));            // 裡面的絨布 / velvet lining
  const hinge = new THREE.Group(); hinge.position.set(0, h, -d / 2); g.add(hinge);
  const lid = box(w + .02, .035, d + .02, wood, 0, .0175, d / 2); hinge.add(lid); hinge.add(box(.06, .02, .02, dark, 0, -.005, d + .01));
  g.setOpen = k => { hinge.rotation.x = -k * 1.9; };
  g.userData.inside = V(0, t + .02, 0);
  return g;
}

// 同學：膠囊身體＋球頭（灰色剪影）/ classmate: capsule body + sphere head
export function classmate(i, { tone = .5 } = {}) {
  const g = new THREE.Group(); const c = C('#8d9096').lerp(C(hash(i + 40) > .5 ? '#9aa0a8' : '#7d7a78'), hash(i + 41));
  const h = 1.35 + hash(i + 42) * .25, mat = std('#' + c.getHexString()), head = std('#a9a7a4');
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.17, h * .5, 6, 12), mat); body.position.y = h * .45; body.castShadow = true; g.add(body);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(.13, 16, 12), head); hd.position.y = h * .45 + h * .25 + .2; hd.castShadow = true; g.add(hd);
  const bag = new THREE.Mesh(new THREE.BoxGeometry(.26, .3, .1), std('#6a6d72')); bag.position.set(0, h * .55, -.2); g.add(bag);
  return g;
}

// 雨絲 / rain streaks around a centre (deterministic in time)
export function rain(n = 700, area = [30, 24, 30]) {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 6); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({ color: '#a9c2ff', transparent: true, opacity: .35, depthWrite: false });
  const L = new THREE.LineSegments(geo, mat); L.frustumCulled = false;
  L.update = (t, c, { wind = 6, speed = 26, len = .9 } = {}) => {
    for (let i = 0; i < n; i++) { const k = i * 7 + 3; const y = ((hash(k) * area[1] - t * speed * (.8 + .4 * hash(k + 1))) % area[1] + area[1]) % area[1] - area[1] / 2;
      const x = c.x + (hash(k + 2) - .5) * area[0] + (y / speed) * wind, z = c.z + (hash(k + 3) - .5) * area[2];
      pos.set([x, c.y + y, z, x - wind / speed * len, c.y + y + len, z], i * 6); }
    geo.attributes.position.needsUpdate = true; };
  return L;
}
