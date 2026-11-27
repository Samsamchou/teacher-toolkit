// 畫風 K 方塊角色：Ken、水鈴、Santa、馴鹿、雪人（全原創 Q 版大頭比例）
// Style K blocky cast built from boxes (original chibi proportions, big 12-px heads).
import * as THREE from 'three';
import { PX, part, pivoted, pixTex, noisy, px, shade, rng } from './voxel.js';

const SKIN = '#f3c6a0', SKIN_D = '#e0a77f', EYE = '#2a1a14', MOUTH = '#8a2f2f', BLUSH = '#f39a9a';

// ---------- 臉 / face (12×12 front of head) ----------
// eyes: open | blink | happy | wide | worried ; mouth: smile | open | o | flat | frown | grin
function drawFace(g, f, look) {
  const ey = f.eyeY ?? 6, L = 2, R = 8, ec = f.eyeColor ?? EYE;
  const eye = (x) => {
    switch (look.eyes) {
      case 'blink': px(g, x, ey + 2, ec, 2, 1); break;
      case 'happy': px(g, x, ey + 1, ec, 2, 1); px(g, x - 1, ey + 2, ec); px(g, x + 2, ey + 2, ec); break;
      case 'wide': px(g, x, ey - 1, ec, 2, 4); px(g, x + 1, ey - 1, '#ffffff'); px(g, x, ey + 1, '#ffffff'); break;
      default: px(g, x, ey, ec, 2, 3); px(g, x + 1, ey, '#ffffff'); break;
    }
  };
  eye(L); eye(R);
  const bc = f.brow ?? ec;
  if (look.eyes === 'worried' || look.brows === 'worried') { px(g, L, ey - 1, bc); px(g, L + 1, ey - 2, bc); px(g, R, ey - 2, bc); px(g, R + 1, ey - 1, bc); }
  if (look.brows === 'up') { px(g, L, ey - 2, bc, 2, 1); px(g, R, ey - 2, bc, 2, 1); }
  if (!f.noBlush) { px(g, 1, ey + 3, BLUSH, 2, 1); px(g, 9, ey + 3, BLUSH, 2, 1); }
  if (f.noMouth) return;
  const my = f.mouthY ?? 10;
  switch (look.mouth) {
    case 'open': px(g, 5, my - 1, MOUTH, 2, 2); px(g, 5, my, '#e46f6f', 2, 1); break;
    case 'grin': px(g, 4, my - 1, '#ffffff', 4, 1); px(g, 4, my, MOUTH, 4, 1); break;
    case 'o': px(g, 5, my - 1, MOUTH, 2, 2); break;
    case 'flat': px(g, 5, my, MOUTH, 2, 1); break;
    case 'frown': px(g, 5, my - 1, MOUTH, 2, 1); px(g, 4, my, MOUTH); px(g, 7, my, MOUTH); break;
    default: px(g, 5, my, MOUTH, 2, 1); px(g, 4, my - 1, MOUTH); px(g, 7, my - 1, MOUTH); break;
  }
}

// 只換臉那一面的貼圖 / swap only the head's front material
function faceSetter(head, key, base, f) {
  const cache = {};
  return (look = {}) => {
    const k = `${look.eyes || 'open'}|${look.mouth || 'smile'}|${look.brows || ''}`;
    if (!cache[k]) cache[k] = pixTex(12, 12, (g) => { base(g); drawFace(g, f, look); }, `${key}:face:${k}`);
    const m = head.material[4]; m.map = cache[k]; m.needsUpdate = true;
  };
}

// ---------- 人形骨架 / humanoid rig ----------
function humanoid({ legH = 8, bodyW = 9, bodyH = 10, bodyD = 5, armW = 4, armH = 10, legW = 4, headS = 12, parts }) {
  const root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = legH * PX; root.add(hips);
  const legL = pivoted(parts.leg(), 'top'), legR = pivoted(parts.leg(true), 'top');
  legL.position.set(-legW / 2 * PX, 0, 0); legR.position.set(legW / 2 * PX, 0, 0); hips.add(legL, legR);
  const torso = new THREE.Group(); hips.add(torso);
  const body = parts.body(); body.position.y = bodyH / 2 * PX; torso.add(body);
  const armL = pivoted(parts.arm(), 'top'), armR = pivoted(parts.arm(true), 'top');
  armL.position.set(-(bodyW + armW) / 2 * PX, bodyH * PX, 0); armR.position.set((bodyW + armW) / 2 * PX, bodyH * PX, 0); torso.add(armL, armR);
  const neck = new THREE.Group(); neck.position.y = bodyH * PX; torso.add(neck);
  const head = parts.head(); head.position.y = headS / 2 * PX; neck.add(head);
  // 手掌位置錨點（拿東西用）/ hand anchors at the end of each arm
  const handL = new THREE.Object3D(), handR = new THREE.Object3D();
  handL.position.y = -(armH - 1) * PX; handR.position.y = -(armH - 1) * PX; armL.add(handL); armR.add(handR);
  // 嘴巴錨點（呼氣白煙）/ mouth anchor for breath puffs
  const mouth = new THREE.Object3D(); mouth.position.set(0, -3 * PX, 6.5 * PX); head.add(mouth);
  const rig = { root, hips, torso, body, neck, head, armL, armR, legL, legR, handL, handR, mouth, height: (legH + bodyH + headS) * PX };
  return rig;
}

// 姿勢：pose 角度（度）/ apply a pose in degrees
export function pose(r, p = {}) {
  const d = THREE.MathUtils.degToRad;
  r.armL.rotation.set(d(p.armLx ?? 0), 0, d(p.armLz ?? -4)); r.armR.rotation.set(d(p.armRx ?? 0), 0, d(p.armRz ?? 4));
  r.legL.rotation.set(d(p.legLx ?? 0), 0, 0); r.legR.rotation.set(d(p.legRx ?? 0), 0, 0);
  r.neck.rotation.set(d(p.headX ?? 0), d(p.headY ?? 0), d(p.headZ ?? 0));
  r.torso.rotation.set(d(p.bodyX ?? 0), d(p.bodyY ?? 0), 0);
  r.hips.position.y = r.baseHip + (p.bob ?? 0) * PX;
}
// 走路週期 / walk cycle (phase in cycles)
export function walk(r, ph, amt = 1) {
  const s = Math.sin(ph * Math.PI * 2);
  pose(r, { legLx: 32 * s * amt, legRx: -32 * s * amt, armLx: -28 * s * amt, armRx: 28 * s * amt, bob: Math.abs(Math.cos(ph * Math.PI * 2)) * 0.8 * amt, headZ: 2 * s * amt });
}
export function idle(r, t, seed = 0) {
  const b = Math.sin(t * 2.1 + seed) * 0.35;
  pose(r, { bob: b, armLz: -4 - b * 2, armRz: 4 + b * 2, headZ: Math.sin(t * 0.9 + seed) * 3 });
}
function finish(r) { r.baseHip = r.hips.position.y; r.root.userData.actor = r.name; r.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return r; }

// ---------- Ken ----------
export function makeKen() {
  const HAIR = '#1d1a1f', NAVY = '#24305e', OR = '#f07a1f';
  const headBase = (g) => { noisy(g, 12, 12, SKIN, 0.03, 31); noisy(g, 12, 3, HAIR, 0.08, 32); [1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1].forEach((v, x) => v && px(g, x, 3, HAIR)); px(g, 0, 4, HAIR, 1, 2); px(g, 11, 4, HAIR, 1, 2); };
  const side = (flip) => (g) => { noisy(g, 12, 12, SKIN, 0.03, 33); noisy(g, 12, 5, HAIR, 0.08, 34); for (let y = 5; y < 9; y++) px(g, flip ? 0 : 8, y, HAIR, 4, 1); px(g, flip ? 5 : 5, 7, SKIN_D, 2, 2); px(g, 0, 2, OR, 12, 1); };
  const r = humanoid({
    parts: {
      head: () => part(12, 12, 12, { front: headBase, top: (g) => noisy(g, 12, 12, HAIR, 0.1, 35), back: (g) => { noisy(g, 12, 12, HAIR, 0.08, 36); px(g, 0, 2, OR, 12, 1); px(g, 0, 11, SKIN_D, 12, 1); }, right: side(false), left: side(true), bottom: SKIN }, { key: 'ken-head' }),
      body: () => part(9, 10, 5, {
        front: (g) => { noisy(g, 9, 10, NAVY, 0.05, 37); px(g, 4, 0, '#c9cfdc', 1, 10); px(g, 1, 2, OR, 1, 7); px(g, 7, 2, OR, 1, 7); px(g, 2, 1, '#ffffff', 1, 1); px(g, 0, 9, '#3b3f52', 9, 1); px(g, 4, 9, '#9aa1b5'); },
        back: (g) => { noisy(g, 9, 10, NAVY, 0.05, 38); px(g, 0, 3, OR, 9, 1); }, all: NAVY,
      }, { key: 'ken-body' }),
      arm: () => part(4, 10, 4, { all: (g) => { noisy(g, 4, 10, OR, 0.06, 39); px(g, 0, 5, '#ffffff', 4, 1); px(g, 0, 7, NAVY, 4, 1); noisy(g, 4, 2, SKIN, 0.03, 40, 0, 8); }, top: OR, bottom: SKIN }, { key: 'ken-arm' }),
      leg: () => part(4, 8, 4, { all: (g) => { noisy(g, 4, 8, NAVY, 0.05, 41); px(g, 0, 3, '#1a2347', 4, 2); px(g, 0, 6, '#f3f3f3', 4, 2); px(g, 0, 6, OR, 4, 1); }, bottom: '#e6e6e6' }, { key: 'ken-leg' }),
    },
  });
  // 刺刺頭＋額頭護目鏡 / spiky hair and goggles
  const sp = [[-4, 0, -2, 20], [0, 1, -1, -8], [4, 0, -2, -24], [-2, 0, 3, 12], [3, 0, 3, -14], [0, 0, -5, 0]];
  sp.forEach(([x, y, z, rz], i) => { const s = part(3, 4, 3, { all: HAIR }, { key: 'ken-spike', seed: 50 + i }); s.position.set(x * PX, (6 + 2 + y) * PX, z * PX); s.rotation.z = rz * Math.PI / 180; s.rotation.x = -z * 3 * Math.PI / 180; r.head.add(s); });
  const gog = part(13, 3, 2, { front: (g) => { noisy(g, 13, 3, OR, 0.05, 43); px(g, 1, 0, '#8fb7c9', 4, 3); px(g, 8, 0, '#8fb7c9', 4, 3); px(g, 2, 0, '#e9f6ff'); px(g, 9, 0, '#e9f6ff'); }, all: OR }, { key: 'ken-gog' });
  gog.position.set(0, 3.5 * PX, 6.6 * PX); r.head.add(gog);
  r.setFace = faceSetter(r.head, 'ken', headBase, { brow: HAIR });
  r.name = 'Ken'; r.setFace({}); return finish(r);
}

// ---------- 水鈴 Shuiling ----------
export function makeShuiling() {
  const HAIR = '#79bdf7', HAIR_D = '#4b8fd9', HAIR_L = '#b5defc', GR = '#3f7d3a', GR_L = '#7bbf5a', GOLD = '#e3b33c', WH = '#f7f5ee';
  const headBase = (g) => { noisy(g, 12, 12, SKIN, 0.03, 61); noisy(g, 12, 3, HAIR, 0.06, 62); [1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1].forEach((v, x) => v && px(g, x, 3, HAIR)); px(g, 4, 4, HAIR); px(g, 0, 3, HAIR_D, 1, 8); px(g, 11, 3, HAIR_D, 1, 8); px(g, 3, 1, HAIR_L, 3, 1); };
  const side = (g) => { noisy(g, 12, 12, HAIR, 0.06, 63); px(g, 0, 0, HAIR_L, 12, 1); for (let x = 1; x < 12; x += 3) px(g, x, 2, HAIR_D, 1, 9); };
  const r = humanoid({
    bodyW: 9, armW: 5,
    parts: {
      head: () => part(12, 12, 12, { front: headBase, all: side, top: (g) => { noisy(g, 12, 12, HAIR, 0.06, 64); px(g, 2, 2, HAIR_L, 8, 2); }, bottom: SKIN }, { key: 'sl-head' }),
      body: () => part(9, 10, 5, {
        front: (g) => { noisy(g, 9, 10, GR, 0.07, 65); noisy(g, 9, 4, WH, 0.03, 66); px(g, 3, 0, GR_L); px(g, 4, 1, GR_L); px(g, 5, 0, GR_L); px(g, 0, 4, GOLD, 9, 1); [[1, 6], [6, 7], [3, 8], [7, 5]].forEach(([x, y]) => px(g, x, y, GOLD)); },
        all: (g) => { noisy(g, 9, 10, GR, 0.07, 67); noisy(g, 9, 4, WH, 0.03, 68); px(g, 0, 4, GOLD, 9, 1); },
      }, { key: 'sl-body' }),
      arm: () => part(5, 10, 5, { all: (g) => { noisy(g, 5, 10, WH, 0.04, 69); px(g, 0, 6, GR_L, 5, 1); noisy(g, 5, 3, SKIN, 0.03, 70, 0, 7); }, top: WH, bottom: SKIN }, { key: 'sl-arm' }),
      leg: () => part(4, 8, 4, { all: (g) => { noisy(g, 4, 8, SKIN, 0.03, 71); noisy(g, 4, 6, WH, 0.03, 72, 0, 2); px(g, 0, 2, GR_L, 4, 1); px(g, 1, 4, GOLD); px(g, 0, 7, GR, 4, 1); }, bottom: GR }, { key: 'sl-leg' }),
    },
  });
  // 裙子＋鈴鐺 / flared skirt and bell
  const skirt = part(12, 5, 8, { all: (g) => { noisy(g, 12, 5, GR, 0.08, 73); px(g, 0, 4, GOLD, 12, 1); [[2, 1], [7, 2], [10, 1], [4, 3]].forEach(([x, y]) => px(g, x, y, GR_L)); }, top: GR, bottom: GR }, { key: 'sl-skirt' });
  skirt.position.y = -2 * PX; r.torso.add(skirt);
  const bell = part(2, 2, 2, { all: GOLD }, { key: 'sl-bell', emissive: 0x332200 }); bell.position.set(0, 6 * PX, 3 * PX); r.torso.add(bell);
  // 水滴髮旋 / water-drop hair curl on top
  [[10, 4, 10, 0, 6.5, -0.5], [7, 4, 7, 0, 10, -1.2], [5, 3, 5, 0.3, 13, -1.2], [3, 3, 3, 0.6, 15.5, -0.2], [2, 2, 2, 0.8, 17, 1.2]].forEach(([w, h, d, x, y, z], i) => {
    const b = part(w, h, d, { all: (g, W, H) => { noisy(g, W, H, HAIR, 0.05, 80 + i); px(g, 0, 0, HAIR_L, W, 1); px(g, 0, H - 1, HAIR_D, W, 1); }, top: HAIR_L }, { key: 'sl-drop' + i }); b.position.set(x * PX, y * PX, z * PX); b.rotation.x = 0.1 * i; r.head.add(b);
  });
  // 兩側稻穗＋白花 / rice-ear ornaments with white flowers
  [-1, 1].forEach((sgn) => {
    for (let i = 0; i < 5; i++) { const k = part(2, 2, 2, { all: GOLD }, { key: 'sl-rice', emissive: 0x221500 }); k.position.set(sgn * (6.6 + i * 0.6) * PX, (2 + i * 1.7) * PX, (-1 + (i % 2)) * PX); r.head.add(k); }
    const leaf = part(1, 6, 3, { all: GR_L }, { key: 'sl-leaf' }); leaf.position.set(sgn * 6.8 * PX, 1 * PX, 1.5 * PX); leaf.rotation.z = sgn * 0.5; r.head.add(leaf);
    const fl = part(3, 3, 1, { front: (g) => { px(g, 0, 0, '#ffffff', 3, 3); px(g, 1, 1, GOLD); }, all: '#ffffff' }, { key: 'sl-flower' }); fl.position.set(sgn * 6.4 * PX, 0.5 * PX, 3.5 * PX); r.head.add(fl);
  });
  r.setFace = faceSetter(r.head, 'sl', headBase, { brow: HAIR_D, eyeColor: '#3a2416' });
  r.name = 'Shuiling'; r.setFace({}); return finish(r);
}

// ---------- Santa ----------
export function makeSanta() {
  const RED = '#c4282c', RED_D = '#8f1a1f', WH = '#f6f6f2', BLK = '#22201f', GOLD = '#e8be3e';
  const headBase = (g) => { noisy(g, 12, 12, SKIN, 0.03, 91); px(g, 5, 7, '#e88f80', 2, 2); };
  const r = humanoid({
    legH: 9, bodyW: 12, bodyH: 12, bodyD: 7, armW: 4, armH: 11,
    parts: {
      head: () => part(12, 12, 12, { front: headBase, all: (g) => { noisy(g, 12, 12, SKIN, 0.03, 92); noisy(g, 12, 8, WH, 0.04, 93, 0, 4); }, back: (g) => noisy(g, 12, 12, WH, 0.04, 94), bottom: WH }, { key: 'santa-head' }),
      body: () => part(12, 12, 7, {
        front: (g) => { noisy(g, 12, 12, RED, 0.06, 95); px(g, 5, 0, WH, 2, 12); px(g, 0, 11, WH, 12, 1); px(g, 0, 6, BLK, 12, 2); px(g, 4, 6, GOLD, 4, 2); px(g, 5, 6, BLK, 2, 1); },
        all: (g) => { noisy(g, 12, 12, RED, 0.06, 96); px(g, 0, 11, WH, 12, 1); px(g, 0, 6, BLK, 12, 2); },
      }, { key: 'santa-body' }),
      arm: () => part(4, 11, 4, { all: (g) => { noisy(g, 4, 11, RED, 0.06, 97); px(g, 0, 7, WH, 4, 2); noisy(g, 4, 2, '#2d6b3a', 0.05, 98, 0, 9); }, top: RED, bottom: '#2d6b3a' }, { key: 'santa-arm' }),
      leg: () => part(4, 9, 4, { all: (g) => { noisy(g, 4, 9, RED_D, 0.06, 99); noisy(g, 4, 4, BLK, 0.08, 100, 0, 5); px(g, 0, 5, '#4a4644', 4, 1); }, bottom: BLK }, { key: 'santa-leg' }),
    },
  });
  // 大白鬍子、帽子 / beard and hat
  const beard = part(13, 7, 3, { front: (g) => { noisy(g, 13, 7, WH, 0.04, 101); px(g, 3, 0, '#e3e3df', 3, 1); px(g, 7, 0, '#e3e3df', 3, 1); px(g, 5, 2, '#d8a0a0', 3, 1); }, all: WH }, { key: 'santa-beard' });
  beard.position.set(0, -3.2 * PX, 6.6 * PX); r.head.add(beard);
  const chin = part(10, 3, 4, { all: WH }, { key: 'santa-chin' }); chin.position.set(0, -6.5 * PX, 5.5 * PX); r.head.add(chin);
  const brim = part(14, 3, 14, { all: WH }, { key: 'santa-brim' }); brim.position.y = 5.5 * PX; r.head.add(brim);
  [[11, 4, 11, 0, 8.5, 0], [8, 4, 8, -1, 12, -1], [5, 3, 5, -3, 15, -2]].forEach(([w, h, d, x, y, z], i) => { const c = part(w, h, d, { all: RED }, { key: 'santa-hat' + i }); c.position.set(x * PX, y * PX, z * PX); r.head.add(c); });
  const pom = part(4, 4, 4, { all: WH }, { key: 'santa-pom' }); pom.position.set(-7 * PX, 15 * PX, -2 * PX); r.head.add(pom);
  r.setFace = faceSetter(r.head, 'santa', headBase, { eyeY: 4, brow: '#e8e8e8', noMouth: true, noBlush: true });
  r.name = 'Santa'; r.setFace({}); return finish(r);
}

// ---------- 馴鹿 reindeer（原創造型，黑鼻子）----------
export function makeReindeer() {
  const BR = '#8a5a32', BR_D = '#5f3c20', TAN = '#d9b48a', ANT = '#e8d2a8';
  const root = new THREE.Group(); const body = new THREE.Group(); body.position.y = 10 * PX; root.add(body);
  const torso = part(10, 9, 18, { all: (g, W, H) => { noisy(g, W, H, BR, 0.07, 111); }, bottom: TAN }, { key: 'rd-body' }); torso.position.y = 4.5 * PX; body.add(torso);
  const tail = part(3, 3, 2, { all: '#f2efe8' }, { key: 'rd-tail' }); tail.position.set(0, 7 * PX, -9.5 * PX); body.add(tail);
  const legs = []; [[-3, 6], [3, 6], [-3, -6], [3, -6]].forEach(([x, z]) => { const l = pivoted(part(3, 10, 3, { all: (g) => { noisy(g, 3, 10, BR_D, 0.06, 112); px(g, 0, 8, '#2b211b', 3, 2); } }, { key: 'rd-leg' }), 'top'); l.position.set(x * PX, 0, z * PX); body.add(l); legs.push(l); });
  const neck = new THREE.Group(); neck.position.set(0, 7 * PX, 8 * PX); body.add(neck);
  const nk = part(6, 9, 6, { all: BR }, { key: 'rd-neck' }); nk.position.y = 4 * PX; nk.rotation.x = 0.35; neck.add(nk);
  const headG = new THREE.Group(); headG.position.set(0, 9 * PX, 3 * PX); neck.add(headG);
  const headBase = (g) => { noisy(g, 8, 8, BR, 0.06, 113); };
  const head = part(8, 8, 9, { front: headBase, all: BR, bottom: TAN }, { key: 'rd-head' }); headG.add(head);
  const muzzle = part(6, 5, 4, { front: (g) => { noisy(g, 6, 5, TAN, 0.05, 114); px(g, 2, 0, '#1d1714', 2, 2); px(g, 2, 3, '#7a3d2e', 2, 1); }, all: TAN }, { key: 'rd-muzzle' }); muzzle.position.set(0, -1.5 * PX, 6 * PX); headG.add(muzzle);
  [-1, 1].forEach(s => {
    const ear = part(3, 2, 2, { all: BR_D }, { key: 'rd-ear' }); ear.position.set(s * 5 * PX, 2.5 * PX, -1 * PX); ear.rotation.z = s * 0.4; headG.add(ear);
    [[1.5, 5, 0, 2, 0], [2, 9, -1, 2, 0.3], [5, 8, 0, 1.5, 0.9], [2.5, 12, -2, 1.5, -0.2], [6, 11, -1, 1.5, 0.8]].forEach(([x, y, z, h, rz], i) => {
      const a = part(1.5, h * 2.5, 1.5, { all: ANT }, { key: 'rd-ant' }); a.position.set(s * x * PX, y * PX, z * PX); a.rotation.z = -s * rz; headG.add(a);
    });
  });
  const r = { root, body, neck, head, headG, legs, muzzle, name: 'Reindeer' }; root.userData.actor = 'Reindeer';
  const faceCache = {};
  r.setFace = (look = {}) => {
    const k = look.eyes || 'open';
    faceCache[k] = faceCache[k] || pixTex(8, 8, (g) => { headBase(g); const e = (x) => { if (k === 'blink') px(g, x, 4, '#1d1714', 1, 1); else if (k === 'worried') { px(g, x, 3, '#1d1714', 1, 2); px(g, x + (x < 4 ? 1 : -1), 2, '#3b2a1e'); } else { px(g, x, 3, '#1d1714', 1, 2); px(g, x, 3, '#ffffff'); } }; e(1); e(6); }, 'rd-face:' + k);
    head.material[4].map = faceCache[k]; head.material[4].needsUpdate = true;
  };
  r.shiver = (t, amt = 1) => { body.position.x = Math.sin(t * 60) * 0.25 * PX * amt; headG.rotation.z = Math.sin(t * 47) * 0.03 * amt; };
  r.setFace({});
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return r;
}

// ---------- 雪人 snowman ----------
export function makeSnowman() {
  const root = new THREE.Group(); const SN = '#f2f6ff', COAL = '#1e1e24', CAR = '#f08a24', SC = '#d83a3a';
  const sn = (s, seed) => (g, W, H) => { noisy(g, W, H, SN, 0.05, seed); const r = rng(seed); for (let i = 0; i < 4; i++) px(g, (r() * W) | 0, (r() * H) | 0, '#d6e2f7'); };
  const b1 = part(16, 14, 16, { all: sn(16, 121) }, { key: 'sm-b1' }); b1.position.y = 7 * PX; root.add(b1);
  const b2 = part(12, 11, 12, { front: (g, W, H) => { sn(12, 122)(g, W, H); px(g, 5, 2, COAL, 2, 2); px(g, 5, 6, COAL, 2, 2); }, all: sn(12, 123) }, { key: 'sm-b2' }); b2.position.y = 19.5 * PX; root.add(b2);
  const b3 = part(10, 10, 10, { front: (g, W, H) => { sn(10, 124)(g, W, H); px(g, 2, 3, COAL, 2, 2); px(g, 6, 3, COAL, 2, 2); [[2, 7], [3, 8], [4, 8], [5, 8], [6, 8], [7, 7]].forEach(([x, y]) => px(g, x, y, COAL)); }, all: sn(10, 125) }, { key: 'sm-b3' }); b3.position.y = 30 * PX; root.add(b3);
  const nose = part(2, 2, 6, { all: CAR }, { key: 'sm-nose' }); nose.position.set(0, 29.5 * PX, 7.5 * PX); root.add(nose);
  const scarf = part(13, 3, 13, { all: (g, W, H) => { noisy(g, W, H, SC, 0.06, 126); for (let x = 0; x < W; x += 3) px(g, x, 1, '#f5f5f5'); } }, { key: 'sm-scarf' }); scarf.position.y = 25 * PX; root.add(scarf);
  const tail = part(3, 8, 2, { all: SC }, { key: 'sm-tail' }); tail.position.set(4 * PX, 21 * PX, 6.5 * PX); tail.rotation.z = 0.15; root.add(tail);
  [-1, 1].forEach(s => { const arm = part(1.5, 12, 1.5, { all: '#5a3a22' }, { key: 'sm-arm' }); arm.position.set(s * 10 * PX, 22 * PX, 0); arm.rotation.z = -s * 0.9; root.add(arm); });
  const hat = part(9, 6, 9, { all: COAL }, { key: 'sm-hat' }); hat.position.y = 38 * PX; root.add(hat);
  const hb = part(12, 1.5, 12, { all: COAL }, { key: 'sm-hb' }); hb.position.y = 35.2 * PX; root.add(hb);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { root, name: 'Snowman' };
}
