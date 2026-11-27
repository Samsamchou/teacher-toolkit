// 第 6 幕〈The Little Reindeer〉：松樹下的馴鹿 → 發抖 → 水鈴掌心餵糖、馴鹿帶路去小木屋（第 16–18 句）
// Scene 6: a reindeer under the pine tree, shaking with cold; Shuiling feeds it from a flat palm and it leads them to a cabin.
import * as THREE from 'three';
import { PX } from '../engine/voxel.js';
import { makeKen, makeShuiling, makeReindeer, pose, walk } from '../engine/chars.js';
import { backpack, pine, candyCane } from '../engine/props.js';
import { iconOf, ease, clamp01, arrow2d, windLines, W, H } from '../engine/kit.js';
import { buildForest, cabinExterior, deerWalk } from '../engine/forest.js';

const lerp = (a, b, k) => a + (b - a) * k;
const v3 = (...a) => new THREE.Vector3(...a);
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const LX = 300;

export async function setup({ S, tl, man }) {
  const { scene, camera, renderer } = S;
  // 這片森林不放預設松樹的第一棵，改放主角松樹 / the hero pine replaces the default first pine
  const F = buildForest(scene, { x: LX, pines: [[5, -8, 12], [-12, -2, 9], [11, -3, 8], [-3, -14, 13], [9, -15, 14], [-16, -10, 11], [15, -12, 12]], snowCount: 2200, wind: 2.2 });
  scene.fog = new THREE.FogExp2('#4f6ca3', 0.022);
  scene.add(new THREE.HemisphereLight('#a9c4f5', '#5a6a8e', 0.8));
  const key = new THREE.DirectionalLight('#dbe6ff', 0.8); key.position.set(LX + 6, 8, 10); scene.add(key);
  const heroPine = pine(scene, LX - 3, -1.6, { h: 10 });
  const cabin = cabinExterior(scene, LX - 14, -17);
  const DOOR = v3(LX - 11, 0, -11.3);

  const ken = makeKen(), sl = makeShuiling(), deer = makeReindeer(); scene.add(ken.root, sl.root, deer.root);
  [[backpack('#e8792a', '#24305e'), ken], [backpack('#5aa65a', '#2f5d3a'), sl]].forEach(([b, r]) => { b.group.scale.setScalar(0.7); r.torso.add(b.group); b.group.position.set(0, 1 * PX, -9 * PX); b.group.rotation.y = Math.PI; });
  const cane = candyCane(0.85); scene.add(cane);
  // 馴鹿身上的積雪 / snow on the reindeer's back
  const backSnow = Array.from({ length: 6 }, (_, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.12), new THREE.MeshStandardMaterial({ color: '#f2f6ff' })); m.position.set((i % 2 - 0.5) * 0.25, 9.3 * PX, (i - 2.5) * 0.17); deer.body.add(m); return m; });

  // ---- 時間 / times ----
  const L16 = 0.5, BEAT_PINE = 4.7, BEAT_DEER = 7.2, L17 = 10.2, SLOT17 = 14.6, L18 = 21.0, OFFER = 21.9, BITE = 22.8, EAT1 = 23.7, WALK0 = 24.1, SLOT18 = 26.8, BEAT_CABIN = 34.8;
  const DEER0 = v3(LX - 2.4, 0, 0.6), KEN0 = v3(LX + 0.6, 0, 1.9), SL0 = v3(LX + 1.5, 0, 1.3), SL_FEED = v3(LX - 0.95, 0, 1.35);   /* 站在馴鹿頭前方約 1.5 格 / about 1.5 blocks in front of its head */
  // 走向小木屋：馴鹿帶頭、兩人跟在後面 / walk to the cabin, the reindeer in front
  const route = (t, p0, lag) => { const k = ease.io(seg(t, WALK0 + lag, BEAT_CABIN - 0.6 + lag * 0.3)); const mid = v3(LX - 6, 0, -4.5); const end = DOOR.clone().add(v3(lag * 0.6, 0, 1.0 + lag * 0.9)); return k < 0.5 ? p0.clone().lerp(mid, k * 2) : mid.lerp(end, (k - 0.5) * 2); };
  const deerAt = (t) => t < WALK0 ? DEER0.clone() : route(t, DEER0, 0);
  const slAt = (t) => t < OFFER - 0.6 ? SL0.clone().lerp(SL_FEED, ease.io(seg(t, L17 + 3.0, L17 + 4.0))) : t < WALK0 + 0.4 ? SL_FEED.clone() : route(t, SL_FEED, 0.7);
  const kenAt = (t) => t < WALK0 + 0.6 ? KEN0.clone() : route(t, KEN0, 1.2);
  const face = (r, from, to) => { const d = to.clone().sub(from); r.root.rotation.y = Math.atan2(d.x, d.z); };

  function act(t) {
    const dp = deerAt(t), sp = slAt(t), kp = kenAt(t);
    deer.root.position.copy(dp); sl.root.position.copy(sp); ken.root.position.copy(kp);
    const walking = t >= WALK0;
    // 馴鹿：發抖→低頭吃→點頭→帶路 / the reindeer: shaking, eating, nodding, leading
    if (!walking) {
      deer.root.rotation.y = lerp(0.2, 1.15, ease.io(seg(t, L16 + 1.9, L16 + 2.6)));
      const shake = t < BITE ? 1 : 1 - seg(t, BITE, EAT1);
      deer.shiver(t, shake * (t >= L17 && t < L18 ? 1.6 : 1));
      const low = ease.io(seg(t, BITE - 0.5, BITE)) * (1 - ease.io(seg(t, EAT1, EAT1 + 0.3)));
      deer.neck.rotation.x = low * 0.75; deer.headG.rotation.x = low * 0.3 + (t > EAT1 && t < WALK0 ? Math.sin((t - EAT1) * 14) * 0.15 : 0);
      deer.legs.forEach(l => l.rotation.x = 0); deer.body.position.y = 10 * PX;
    } else { const q = deerAt(t + 0.05); face(deer, dp, q.clone()); deer.root.rotation.y -= 0; deerWalk(deer, (t - WALK0) * 1.4, 1); deer.neck.rotation.x = 0; deer.shiver(t, 0); }
    deer.setFace({ eyes: t < BITE ? 'worried' : ((t % 3) < 0.12 ? 'blink' : 'open') });
    // 水鈴：走到馴鹿旁邊、半蹲、掌心向上托著拐杖糖 / Shuiling crouches beside the deer, cane on a flat palm
    if (!walking) {
      face(sl, sp, dp.clone().add(v3(0.2, 0, 0.3)));
      const off = ease.io(seg(t, OFFER, OFFER + 0.5));
      if (t < L17 + 3.0) pose(sl, { armLz: -10, armRz: 10, headX: 10, headY: -8 });
      else if (t < L17 + 4.0) walk(sl, (t - L17) * 1.6, 0.8);
      else pose(sl, { bodyX: 8 * off + 4, legLx: -25 * off, legRx: -12 * off, bob: -2.2 * off, armRx: lerp(-10, -55, off), armRz: lerp(8, -4, off), armLz: -10, headX: 14 + 8 * off });
    } else { const q = slAt(t + 0.05); if (q.distanceToSquared(sp) > 1e-6) face(sl, sp, q); walk(sl, (t - WALK0) * 1.4 + 0.4, 0.9); }
    // Ken：站著擔心地看 → 跟在後面 / Ken watches, then follows
    if (t < WALK0 + 0.6) { face(ken, kp, dp); pose(ken, { headX: 8, armLx: t > L17 ? -40 : 0, armRx: t > L17 ? -40 : 0, armLz: 10, armRz: -10 }); }
    else { const q = kenAt(t + 0.05); if (q.distanceToSquared(kp) > 1e-6) face(ken, kp, q); walk(ken, (t - WALK0) * 1.4, 0.9); }
    const blink = (o) => ((t + o) % 3.4) < 0.12;
    if (t < BITE) { ken.setFace({ eyes: blink(0) ? 'blink' : 'worried', mouth: 'frown' }); sl.setFace({ eyes: t > OFFER ? 'happy' : 'worried', mouth: t > OFFER ? 'smile' : 'frown' }); }
    else { ken.setFace({ eyes: 'happy', mouth: 'grin' }); sl.setFace({ eyes: 'happy', mouth: 'open' }); }
    ken.root.updateMatrixWorld(true); sl.root.updateMatrixWorld(true); deer.root.updateMatrixWorld(true);
    // 拐杖糖：掌心上→被吃掉（越來越短）/ the cane on her palm, then eaten
    const hand = sl.handR.getWorldPosition(v3());
    cane.visible = t >= OFFER - 0.1 && t < EAT1;
    if (cane.visible) { cane.position.copy(hand).add(v3(0, 0.04, 0)); cane.rotation.set(Math.PI / 2, sl.root.rotation.y, 0); const eat = seg(t, BITE + 0.1, EAT1); cane.scale.set(0.85, 0.85 * (1 - eat * 0.9) + 0.01, 0.85); }
    cabin.update(t);
  }

  const shots = [
    { t: 0, cam: (t) => { const k = ease.io(seg(t, 0, 2.4)); return [v3(LX + 1.5, 9 - k * 6.5, 6.5), v3(LX - 3, 9 - k * 7.6, -1.6)]; } },        /* 松樹由上往下搖 */
    { t: 2.4, cam: (t) => [v3(LX + 2.2, 1.4, 4.6), v3(LX - 1.6, 0.8, 0.6)] },                                                                     /* 樹下的馴鹿，前景兩人 */
    { t: BEAT_PINE, beat: true, cam: (t) => { const k = ease.io(seg(t, BEAT_PINE, BEAT_DEER)); return [v3(LX + 3, 4.5 - k, 9), v3(LX - 3, 5.5 - k * 2, -1.6)]; } },
    { t: BEAT_DEER, beat: true, cam: (t) => [v3(LX + 0.6 - (t - BEAT_DEER) * 0.1, 1.4, 4.4), v3(LX - 2.2, 0.9, 0.6)] },
    { t: L17 - 0.4, cam: (t) => { const h = deer.head.getWorldPosition(v3()); return [h.clone().add(v3(1.7, 0.25, 1.7)), h.clone().add(v3(-0.3, -0.25, 0))]; } },                                                            /* 馴鹿發抖特寫 */
    { t: L17 + 2.4, cam: (t) => [v3(LX - 4.0, 1.6, 4.6), v3(LX - 1.0, 0.9, 1.1)] },   /* 側面：兩人和馴鹿都看得到 / side-on so the deer is not hidden */                                                              /* 兩人擔心、水鈴走過去 */
    { t: SLOT17, cam: (t) => [v3(LX + 1.2, 1.3, 4.2), v3(LX - 1.9, 0.9, 0.8)] },                                                                 /* Seedance 第 3 鏡位置（佔位） */
    { t: L18 - 0.4, cam: (t) => [v3(LX - 3.7, 1.35, 4.5), v3(LX - 1.6, 0.8, 1.0)] },   /* 從兩人連線的側面拍 / side-on to the girl and the reindeer */                                                          /* 掌心餵糖 */
    { t: WALK0, cam: (t) => { const d = deerAt(t); return [d.clone().add(v3(5.5, 3.4, 7.5)), d.clone().add(v3(-3.5, 0.8, -4.5))]; } },          /* 馴鹿帶路、遠方小木屋亮燈 */
    { t: SLOT18, cam: (t) => { const d = deerAt(t); return [d.clone().add(v3(4.0, 2.2, 5.0)), DOOR.clone().add(v3(0, 1.5, 0))]; } },             /* Seedance 第 3 鏡位置（佔位） */
    { t: BEAT_CABIN, beat: true, cam: (t) => [v3(LX - 8.5 + (t - BEAT_CABIN) * 0.2, 2.4, -4.0), v3(LX - 11, 2.0, -12)] },
  ];
  let cur = shots[0];
  function frame(t) {
    let sh = shots[0]; for (const s of shots) if (t >= s.t) sh = s; cur = sh;
    act(t); F.update(t, camera);
    const [p, l] = sh.cam(t); camera.position.copy(p); camera.lookAt(l); camera.fov = 38; camera.updateProjectionMatrix();
    F.sky.dome.position.copy(camera.position);
    scene.updateMatrixWorld(true);
  }
  const faces = () => [ken, sl].map(r => r.head.getWorldPosition(v3())).concat([deer.head.getWorldPosition(v3())]);
  const scr = (cam, p) => { const v = p.clone().project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H, v.z]; };
  function shakeMarks(g, x, y, a, t) {
    if (a <= 0) return; g.save(); g.globalAlpha = a; g.strokeStyle = '#ffffff'; g.lineWidth = 8; g.lineCap = 'round';
    const j = Math.sin(t * 40) * 6;
    [-1, 1].forEach(s => { for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x + s * (90 + i * 26) + j, y, 28 + i * 8, s < 0 ? Math.PI - 0.6 : -0.6, s < 0 ? Math.PI + 0.6 : 0.6); g.stroke(); } });
    g.font = 'bold 54px "Comic Relief"'; g.textAlign = 'center'; g.lineWidth = 10; g.strokeStyle = '#1f2a5a'; g.strokeText('shaking', x, y - 110); g.fillStyle = '#9fd8ff'; g.fillText('shaking', x, y - 110); g.restore();
  }
  function overlay(g, t, cam) {
    windLines(g, t, { a: 0.3, speed: 900, dir: 1 });
    // shaking：馴鹿兩旁的抖動記號 / shake marks on both sides of the reindeer
    if (t >= L17 + 1.5 && t < L17 + 2.4) { const [x, y] = scr(cam, deer.head.getWorldPosition(v3()).add(v3(0, -0.2, 0))); shakeMarks(g, x, Math.max(200, y), seg(t, L17 + 1.5, L17 + 1.7) * (1 - seg(t, L17 + 2.2, L17 + 2.4)), t); }
    if (t >= L17 - 0.4 && t < L17 + 1.5) { const [x, y] = scr(cam, deer.head.getWorldPosition(v3()).add(v3(0, -0.2, 0))); shakeMarks(g, x, Math.max(200, y), seg(t, L17 + 0.3, L17 + 0.5), t); }
    // a little cabin：箭頭指著遠方亮燈的小木屋 / arrow to the little lit cabin far away
    if (t >= WALK0 + 1.0 && t < SLOT18) { const [x, y, z] = scr(cam, DOOR.clone().add(v3(0, 2.2, 0))); if (z < 1) arrow2d(g, x + 240, y - 220, x + 50, y - 40, { a: seg(t, WALK0 + 1.0, WALK0 + 1.3) * (1 - seg(t, SLOT18 - 0.3, SLOT18)), label: 'a little cabin' }); }
  }
  const beatObjs = { 'pine tree': heroPine, 'a reindeer': deer.root, 'cabin': cabin.group };
  const deerIcon = iconOf(renderer, makeReindeer().root, { yaw: 1.1, pitch: 0.15, dist: 2.2 });
  return { dur: tl.dur, frame, faces, overlay, beatObj: (l) => beatObjs[l] || null, cards: { 'a reindeer': deerIcon } };
}
