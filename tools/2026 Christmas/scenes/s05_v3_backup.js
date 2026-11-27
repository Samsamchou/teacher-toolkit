// 第 5 幕〈The Snowstorm〉：風很大、雪很深 → 聖誕物品散落各處 → Ken 挖出紅緞帶禮物（第 13–15 句）
// Scene 5: loud wind and deep snow, the Christmas things everywhere, Ken digs up a gift with a red ribbon.
import * as THREE from 'three';
import { PX, part, noisy, px, rng, PAINT } from '../engine/voxel.js';
import { makeKen, makeShuiling, pose, walk } from '../engine/chars.js';
import { backpack, stocking, gift } from '../engine/props.js';
import { iconOf, ease, clamp01, arrow2d, windLines, snow, W, H } from '../engine/kit.js';
import { buildForest } from '../engine/forest.js';

const lerp = (a, b, k) => a + (b - a) * k;
const v3 = (...a) => new THREE.Vector3(...a);
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const LX = 300, DEEP = 0.45;     // 雪深 0.45（到小孩膝蓋）/ knee-deep snow

export async function setup({ S, tl, man }) {
  const { scene, camera, renderer } = S;
  const F = buildForest(scene, { x: LX, snowCount: 3500, wind: 4.5 });
  scene.fog = new THREE.FogExp2('#5b78ad', 0.024);
  scene.add(new THREE.HemisphereLight('#a9c4f5', '#5a6a8e', 0.9));
  const key = new THREE.DirectionalLight('#dbe6ff', 0.9); key.position.set(LX + 6, 8, 10); scene.add(key);
  const storm = snow(scene, { count: 2500, box: [16, 8, 12], center: [LX, 0, 2], wind: 7, speed: 2.4, size: 0.05 });
  // 深雪層（膝蓋高）/ the knee-deep snow layer
  const slabTex = (g, Wd = 16, Ht = 16) => { noisy(g, Wd, Ht, '#e9f0fb', 0.05, 801); const r = rng(3); for (let i = 0; i < Wd * Ht / 32; i++) px(g, (r() * Wd) | 0, (r() * Ht) | 0, '#d2def2'); };   /* 要畫滿整張貼圖 / paint the whole texture */
  const slab = part(16 * 26, DEEP * 16, 16 * 16, { top: slabTex, all: slabTex }, { key: 'deepslab', amt: 0.04 });
  slab.position.set(LX, DEEP / 2, 1); slab.castShadow = false; slab.receiveShadow = false;   /* 大塊雪層自己會擋光變黑 / the big slab self-shadows to black */ scene.add(slab);

  const ken = makeKen(), sl = makeShuiling(); scene.add(ken.root, sl.root);
  [[backpack('#e8792a', '#24305e'), ken], [backpack('#5aa65a', '#2f5d3a'), sl]].forEach(([b, r]) => { b.group.scale.setScalar(0.7); r.torso.add(b.group); b.group.position.set(0, 1 * PX, -9 * PX); b.group.rotation.y = Math.PI; });

  // 散落雪地的聖誕物品（跟第 3 句被吹走的是同一批）/ the same Christmas things that blew away in line 3
  const things = [];
  const ballCols = ['#e23b3b', '#3b8de2', '#e2c03b', '#9b4de2', '#3bc26a'];
  const spots = [[-4.5, -1.5], [-2.2, 2.8], [0.6, -2.6], [3.6, 2.2], [5.2, -1.0], [-5.6, 2.0], [1.8, 4.0], [-1.0, -4.2], [6.4, 3.4], [-7.5, -3.5]];
  spots.forEach(([x, z], i) => {
    let o;
    if (i < 4) o = part(4, 4, 4, { all: ballCols[i] }, { key: 'ball' + ballCols[i], emissive: new THREE.Color(ballCols[i]), ei: 0.2, rough: 0.35 });
    else if (i < 6) o = part(5, 5, 2, { all: '#ffd84a' }, { key: 'npstar', emissive: new THREE.Color('#ffc23a'), ei: 0.6 });
    else if (i < 8) { o = stocking(i % 2 ? '#2f8a46' : '#d22f2f'); o.scale.setScalar(0.7); }
    else o = gift(6, i % 2 ? '#7b4bd6' : '#2f7fd2', '#f2d04a', 50 + i);
    o.scale.multiplyScalar(1.6); o.position.set(LX + x, DEEP - 0.06, z); o.rotation.set(0.3 * (i % 3 - 1), i * 0.9, 0.2 * (i % 2)); scene.add(o); things.push(o);
  });
  // 要挖的雪堆＋裡面的紅緞帶禮物 / the snow mound Ken digs, with the red-ribbon gift inside
  const DIG = v3(LX + 1.6, DEEP, 0.9);
  const prize = gift(9, '#2f7fd2', '#d62f2f', 77); prize.position.copy(DIG); scene.add(prize);
  const mound = [];
  for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) for (let y = 0; y < 2; y++) { if (y === 1 && Math.abs(x) + Math.abs(z) > 1) continue; const c = part(6, 6, 6, { all: slabTex }, { key: 'moundcube' }); c.position.set(DIG.x + x * 0.36, DEEP + 0.18 + y * 0.36, DIG.z + z * 0.36); scene.add(c); mound.push({ c, home: c.position.clone(), i: mound.length }); }

  // ---- 時間 / times ----
  const L13 = 0.5, SLOT13 = 5.0, BEAT_DEEP = 11.0, L14 = 13.9, L15 = 18.5, DIG0 = 18.7, DIG1 = 20.6, LIFT = 21.6, SLOT15 = 22.8, BEAT_GIFT = 30.8, BEAT_RIB = 33.4;
  // 兩人在深雪裡吃力地走 / trudging through the deep snow
  const walkK = (t) => ease.io(seg(t, 0, 13.6));
  const kenAt = (t) => t < L15 ? v3(LX - 6.5 + 6.6 * walkK(t), 0, 2.6 - 1.2 * walkK(t)) : v3(DIG.x - 0.15, -0.12, DIG.z + 0.62);
  const slAt = (t) => t < L15 ? v3(LX - 7.4 + 6.6 * walkK(t), 0, 3.4 - 1.2 * walkK(t)) : v3(DIG.x + 1.5, 0, DIG.z + 0.4);
  const handMid = () => ken.handL.getWorldPosition(v3()).add(ken.handR.getWorldPosition(v3())).multiplyScalar(0.5);

  function act(t) {
    const kp = kenAt(t), sp = slAt(t); ken.root.position.copy(kp); sl.root.position.copy(sp);
    if (t < L15) {
      ken.root.rotation.y = sl.root.rotation.y = 1.25;
      const moving = t < 13.6, ph = t * 0.9;
      if (moving) { walk(ken, ph, 0.55); walk(sl, ph + 0.45, 0.55); ken.torso.rotation.x = sl.torso.rotation.x = 0.22; ken.neck.rotation.x = sl.neck.rotation.x = 0.25; }
      // loud：唸到 loud 時摀住耳朵 / cover ears at "loud"
      const ears = seg(t, L13 + 0.7, L13 + 1.0) * (1 - seg(t, L13 + 2.6, L13 + 3.0));
      if (ears > 0) { [ken, sl].forEach(r => { r.armL.rotation.set(-0.35 * ears, 0, -2.75 * ears); r.armR.rotation.set(-0.35 * ears, 0, 2.75 * ears); }); }
      if (t >= L14 && t < L15) { pose(ken, { headX: 14, headY: -20 + Math.sin(t) * 25 }); pose(sl, { headX: 14, headY: 25 - Math.sin(t) * 25, armRx: -80 }); }
    } else {
      ken.root.rotation.y = Math.PI + 0.15; sl.root.rotation.y = Math.atan2(DIG.x - sp.x, DIG.z - sp.z);
      const dig = t >= DIG0 && t < DIG1, lift = ease.back(seg(t, LIFT, LIFT + 0.6));
      if (t < LIFT - 0.4) {
        // 蹲下雙手往旁邊撥雪 / crouched, sweeping snow aside with both hands
        const sw = dig ? Math.sin((t - DIG0) * 9) : 0;
        pose(ken, { bodyX: 32, headX: 20, armLx: -78 + sw * 12, armRx: -78 - sw * 12, armLz: 14 + sw * 18, armRz: -14 + sw * 18, legLx: -40, legRx: -30 });
      } else pose(ken, { bodyX: lerp(32, -6, lift), armLx: lerp(-78, -170, lift), armRx: lerp(-78, -170, lift), armLz: lerp(14, 8, lift), armRz: lerp(-14, -8, lift), headX: lerp(20, -16, lift), legLx: lerp(-40, 0, lift), legRx: lerp(-30, 0, lift) });
      pose(sl, { armLz: t > LIFT ? -150 : -20, armRz: t > LIFT ? 150 : 20, armRx: t < LIFT ? -40 : 0, headX: 18, bob: t > LIFT && t < LIFT + 1.5 ? Math.abs(Math.sin((t - LIFT) * 8)) * 1.2 : 0 });
    }
    const blink = (o) => ((t + o) % 3.3) < 0.12;
    if (t < L15) { ken.setFace({ eyes: blink(0) ? 'blink' : 'worried', mouth: 'frown' }); sl.setFace({ eyes: blink(1) ? 'blink' : 'worried', mouth: 'frown' }); }
    else if (t < LIFT) { ken.setFace({ eyes: 'open', mouth: 'flat' }); sl.setFace({ eyes: 'wide', mouth: 'o' }); }
    else { ken.setFace({ eyes: 'happy', mouth: 'grin' }); sl.setFace({ eyes: 'happy', mouth: 'open' }); }
    ken.root.updateMatrixWorld(true); sl.root.updateMatrixWorld(true);
    // 雪方塊一塊塊被撥開 / mound cubes flick aside one by one
    mound.forEach(m => { const t0 = DIG0 + 0.12 * m.i, k = seg(t, t0, t0 + 0.45); m.c.visible = k < 1; if (k <= 0) { m.c.position.copy(m.home); return; } const dir = m.home.x < DIG.x ? -1 : 1; m.c.position.set(m.home.x + dir * (0.4 + k * 0.9), m.home.y + Math.sin(k * Math.PI) * 0.5, m.home.z + (m.home.z - DIG.z) * k * 2); m.c.scale.setScalar(1 - k * 0.6); });
    // 禮物：挖出來→舉高 / the gift: uncovered, then lifted high
    if (t < LIFT) { prize.position.copy(DIG); prize.rotation.set(0, 0.3, 0); }
    else { prize.position.copy(handMid()).add(v3(0, 0.05, 0)); prize.rotation.set(0, 0.3 + (t - LIFT) * 0.4, 0); }
  }

  const shots = [
    { t: 0, cam: (t) => { const k = kenAt(t); return [v3(k.x + 3.2, 2.2, k.z + 5.2), v3(k.x - 0.3, 0.9, k.z)]; } },                     /* 暴風雪大遠景，兩人低頭走 */
    { t: 2.7, cam: (t) => { const k = kenAt(t); return [v3(k.x + 2.3, 0.75, k.z + 2.9), v3(k.x + 0.2, 0.55, k.z)]; } },   /* 貼地看腳陷在深雪 */
    { t: SLOT13, cam: (t) => { const k = kenAt(t); return [v3(k.x + 4, 2.6, k.z + 6), v3(k.x, 0.9, k.z)]; } },                         /* Seedance 第 3 鏡位置（佔位） */
    { t: BEAT_DEEP, beat: true, cam: (t) => { const k = kenAt(t); return [v3(k.x + 2.4, 0.8, k.z + 3.0), v3(k.x + 0.2, 0.45, k.z)]; } },
    { t: L14 - 0.3, cam: (t) => [v3(LX + (t - L14) * 0.35, 8.5, 8.0), v3(LX + (t - L14) * 0.35, 0, 0.6)] },      /* 俯瞰：東西散落各處 */
    { t: 16.0, cam: (t) => [v3(LX - 6 + (t - 16) * 2.4, 2.4, 7.4), v3(LX - 4 + (t - 16) * 2.4, 0.4, 0)] },   /* 貼著雪面掃過去 */
    { t: L15 - 0.3, cam: (t) => [v3(DIG.x + 0.9, 1.5, DIG.z - 2.8), v3(DIG.x, 0.7, DIG.z + 0.3)] },                     /* Ken 撥雪 */
    { t: 20.6, cam: (t) => [v3(DIG.x + 0.5, 1.1, DIG.z - 2.1), v3(DIG.x - 0.1, t < LIFT ? 0.6 : 1.5, DIG.z + 0.4)] },   /* 禮物出現→舉高 */
    { t: SLOT15, cam: (t) => [v3(DIG.x + 2.0, 1.7, DIG.z - 3.6), v3(DIG.x + 0.2, 1.1, DIG.z + 0.5)] },                  /* Seedance 第 3 鏡位置（佔位） */
    { t: BEAT_GIFT, beat: true, cam: (t) => { const g = prize.getWorldPosition(v3()); return [g.clone().add(v3(0.6 - (t - BEAT_GIFT) * 0.15, 0.1, -2.0)), g.clone().add(v3(0, -0.15, 0))]; } },
    { t: BEAT_RIB, beat: true, cam: (t) => { const g = prize.getWorldPosition(v3()); return [g.clone().add(v3(0.2, 0.6, -0.95)), g.clone().add(v3(0, 0.25, 0))]; } },
  ];
  let cur = shots[0];
  const deepMark = new THREE.Mesh(new THREE.BoxGeometry(0.7, DEEP, 0.6), new THREE.MeshBasicMaterial({ visible: false })); scene.add(deepMark);
  function frame(t) {
    let sh = shots[0]; for (const s of shots) if (t >= s.t) sh = s; cur = sh;
    act(t);
    const k = kenAt(t); deepMark.position.set(k.x, DEEP / 2, k.z);
    F.update(t, camera); storm.update(t);
    const [p, l] = sh.cam(t); camera.position.copy(p); camera.lookAt(l); camera.fov = 38; camera.updateProjectionMatrix();
    F.sky.dome.position.copy(camera.position);
    scene.updateMatrixWorld(true);
  }
  const faces = () => [ken, sl].map(r => r.head.getWorldPosition(v3()));
  const scr = (cam, p) => { const v = p.clone().project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H, v.z]; };
  function soundIcon(g, x, y, a) {
    if (a <= 0) return; g.save(); g.globalAlpha = a; g.strokeStyle = '#ffffff'; g.lineWidth = 9; g.lineCap = 'round';
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x, y, 30 + i * 26, -0.7, 0.7); g.stroke(); g.beginPath(); g.arc(x, y, 30 + i * 26, Math.PI - 0.7, Math.PI + 0.7); g.stroke(); }
    g.font = 'bold 56px "Comic Relief"'; g.textAlign = 'center'; g.lineWidth = 10; g.strokeStyle = '#1f2a5a'; g.strokeText('loud!', x, y + 120); g.fillStyle = '#ffe36a'; g.fillText('loud!', x, y + 120); g.restore();
  }
  function overlay(g, t, cam) {
    windLines(g, t, { a: 0.55, speed: 1500, dir: 1 });
    // loud：聲波圖示 / sound-wave icon
    if (t >= L13 + 0.6 && t < L13 + 3.0) { const [x, y] = scr(cam, ken.head.getWorldPosition(v3()).add(v3(0, 0.9, 0))); soundIcon(g, x, Math.max(120, y), seg(t, L13 + 0.6, L13 + 0.9) * (1 - seg(t, L13 + 2.7, L13 + 3.0))); }
    // deep：雪面到腳底的雙箭頭 / double arrow from the snow surface down to the feet
    if ((t >= L13 + 2.6 && t < L13 + 4.6) || (t >= BEAT_DEEP && t < BEAT_DEEP + 2.6)) {
      const k = kenAt(t), [x0, y0] = scr(cam, v3(k.x + 0.45, DEEP, k.z + 0.3)), [x1, y1] = scr(cam, v3(k.x + 0.45, 0, k.z + 0.3));
      const a = t < BEAT_DEEP ? seg(t, L13 + 2.6, L13 + 2.9) : 1;
      arrow2d(g, x0 + 60, (y0 + y1) / 2, x0 + 60, y1, { a, color: '#7fe0ff' }); arrow2d(g, x0 + 60, (y0 + y1) / 2, x0 + 60, y0, { a, color: '#7fe0ff', label: 'deep' });
    }
    // everywhere：每個東西冒出光圈 / a ring pops round every thing
    if (t >= L14 && t < L15) {
      things.forEach((o, i) => {
        const t0 = L14 + 1.7 + i * 0.07, a = seg(t, t0, t0 + 0.2) * (1 - seg(t, L15 - 0.4, L15)); if (a <= 0) return;
        const [x, y, z] = scr(cam, o.getWorldPosition(v3())); if (z > 1) return;
        g.save(); g.globalAlpha = a; g.strokeStyle = '#ffd24a'; g.lineWidth = 6; g.shadowColor = '#ffc23a'; g.shadowBlur = 16; g.beginPath(); g.arc(x, y, 38 + 6 * Math.sin(t * 6 + i), 0, Math.PI * 2); g.stroke(); g.restore();
      });
      const a = seg(t, L14 + 1.7, L14 + 2.0) * (1 - seg(t, L15 - 0.4, L15));
      if (a > 0) { g.save(); g.globalAlpha = a; g.font = 'bold 64px "Comic Relief"'; g.textAlign = 'center'; g.lineWidth = 12; g.strokeStyle = '#1f2a5a'; g.strokeText('everywhere!', W / 2, 120); g.fillStyle = '#ffe36a'; g.fillText('everywhere!', W / 2, 120); g.restore(); }
    }
  }
  const beatObjs = { 'deep snow': deepMark, 'a gift': prize, 'red ribbon': prize };
  const giftIcon = iconOf(renderer, gift(9, '#2f7fd2', '#d62f2f', 77), { yaw: 0.5, pitch: 0.35, dist: 2.2 });
  return { dur: tl.dur, frame, faces, overlay, avoidObjs: (t) => (t > L15 ? [prize] : []), beatObj: (l) => beatObjs[l] || null, cards: { 'a gift': giftIcon } };
}
