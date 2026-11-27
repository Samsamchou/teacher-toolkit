// 第 6 幕〈The Little Reindeer〉：松樹下的馴鹿 → 發抖 → 水鈴從背包拿出拐杖糖、掌心餵食 → 馴鹿沿雪中小路帶兩人到小木屋（第 16–18 句）
// Scene 6: a reindeer under the pine tree, shaking with cold; Shuiling takes the candy cane out of her bag and feeds it
// from a flat palm; the reindeer leads them along a snow path to a cabin.
// v3（2026-11-27）：路線繞開樹、側面遠景跟拍；背包拿糖；餵食用算出來的接觸點；「a sweet treat」慢動作重播。
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
  /* 路線和鏡頭附近不放樹：(-3,-14) 那棵移到 (2,-21) / no pines near the path or the camera: the (-3,-14) pine moved to (2,-21) */
  const F = buildForest(scene, { x: LX, pines: [[5, -8, 12], [-12, -2, 9], [11, -3, 8], [2, -21, 13], [9, -15, 14], [-17, -9, 11], [15, -12, 12]], snowCount: 2200, wind: 2.2 });
  scene.fog = new THREE.FogExp2('#4f6ca3', 0.022);
  scene.add(new THREE.HemisphereLight('#a9c4f5', '#5a6a8e', 0.8));
  const key = new THREE.DirectionalLight('#dbe6ff', 0.8); key.position.set(LX + 6, 8, 10); scene.add(key);
  const heroPine = pine(scene, LX - 3, -1.6, { h: 10 });
  const cabin = cabinExterior(scene, LX - 14, -17);
  const DOOR = v3(LX - 11, 0, -11.3);

  const ken = makeKen(), sl = makeShuiling(), deer = makeReindeer(); scene.add(ken.root, sl.root, deer.root);
  const kenBag = backpack('#e8792a', '#24305e'), slBag = backpack('#5aa65a', '#2f5d3a');
  kenBag.group.scale.setScalar(0.7); ken.torso.add(kenBag.group); kenBag.group.position.set(0, 1 * PX, -9 * PX); kenBag.group.rotation.y = Math.PI;
  /* 水鈴的背包掛在轉軸上，可以甩到胸前 / Shuiling's bag hangs on a pivot so it can swing round to her front */
  const bagPivot = new THREE.Group(); sl.torso.add(bagPivot);
  slBag.group.scale.setScalar(0.7); bagPivot.add(slBag.group); slBag.group.position.set(0, 1 * PX, -9 * PX); slBag.group.rotation.y = Math.PI;
  const cane = candyCane(0.85); scene.add(cane);
  const caneCells = cane.children.slice();          // 11 格：0 在握柄底、10 在彎鉤尾端 / 11 cubes, 0 = stem bottom, 10 = hook tip
  const backSnow = Array.from({ length: 6 }, (_, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.12), new THREE.MeshStandardMaterial({ color: '#f2f6ff' })); m.position.set((i % 2 - 0.5) * 0.25, 9.3 * PX, (i - 2.5) * 0.17); deer.body.add(m); return m; });

  // ---- 時間 / times ----
  const L16 = 0.5, BEAT_PINE = 4.7, BEAT_DEER = 7.2, L17 = 10.2, SLOT17 = 14.6;
  const BAG0 = 20.7, BAG_FRONT = 21.1, ZIP = 21.45, REACH = 21.7, CANE_UP = 22.1, BAG_BACK = 22.6;
  const L18 = 22.8, OFFER = 22.6, NECK = 23.0, BITE = 23.5, EAT1 = 24.5, NOD0 = 24.6, WALK0 = 25.2;   /* Seedance 餵食 23.0–26.0，走路配 and he takes them / the Seedance feeding clip covers 23.0–26.0 */
  const BEAT_TREAT = 28.9, TREAT_DUR = 2.6, ARRIVE = 33.2, BEAT_CABIN = 35.9;
  /* 慢動作重播：拍子裡演 23.8→24.84 的餵食；拍子後走路接著演 / during the beat replay the bite at 0.4x, afterwards the walk continues */
  const TA = (t) => t < BEAT_TREAT ? t : t < BEAT_TREAT + TREAT_DUR ? 23.4 + (t - BEAT_TREAT) * 0.4 : t - TREAT_DUR;
  const inReplay = (t) => t >= BEAT_TREAT && t < BEAT_TREAT + TREAT_DUR;

  // ---- 餵食的接觸點：先算好，再擺人 / solve the feeding contact first, then place the people ----
  const DEER0 = v3(LX - 2.4, 0, 0.6), DR = 1.15, F_ = v3(Math.sin(DR), 0, Math.cos(DR));   // 馴鹿面向 / the reindeer faces F_
  const SL_YAW = Math.atan2(-F_.x, -F_.z);                                                    // 水鈴面向馴鹿 / Shuiling faces the reindeer
  const OFFER_POSE = { armRx: -82, armRz: 2, armLz: -10, armLx: -10, bodyX: 6, headX: 12 };
  const caneLocal = (k) => v3(0, (16 - 0) * PX, 0);                                            // 彎鉤尾端 / the hook end (local)
  const CANE_GRIP = v3(-3 * PX, 5 * PX, 0);                                                    // 掌心托的位置 / the point resting on the palm
  function placeCaneOnPalm(handTop, flat) {
    cane.position.set(0, 0, 0); cane.rotation.set(flat * Math.PI / 2, sl.root.rotation.y, 0, 'YXZ'); cane.updateMatrixWorld(true);
    const off = cane.localToWorld(CANE_GRIP.clone()); cane.position.copy(handTop).sub(off); cane.updateMatrixWorld(true);
  }
  const palmTop = () => sl.handR.getWorldPosition(v3()).add(v3(0, 2 * PX + 1 * PX * 0.85, 0));
  const muzzleFront = () => deer.muzzle.localToWorld(v3(0, 0, 2 * PX));
  // 水鈴在原點擺餵食姿勢，量手和糖尾端 / pose Shuiling at the origin and measure the cane end
  sl.root.position.set(0, 0, 0); sl.root.rotation.set(0, SL_YAW, 0); pose(sl, OFFER_POSE); sl.root.updateMatrixWorld(true);
  placeCaneOnPalm(palmTop(), 1); const END0 = cane.localToWorld(caneLocal()).clone(), PALM0 = palmTop();        // 相對水鈴腳底 / relative to her feet
  // 馴鹿脖子往下多少，嘴才會到糖的高度 / how far the neck bends so the muzzle reaches the cane height
  deer.root.position.copy(DEER0); deer.root.rotation.set(0, DR, 0);
  const setNeck = (a) => { deer.neck.rotation.x = a; deer.headG.rotation.x = a * 0.4; deer.root.updateMatrixWorld(true); };
  let lo = 0, hi = 1.3; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; setNeck(m); if (muzzleFront().y > END0.y) lo = m; else hi = m; }
  const NECK_LOW = (lo + hi) / 2; setNeck(NECK_LOW); const MZ = muzzleFront();
  const SL_FEED = v3(MZ.x - END0.x, 0, MZ.z - END0.z);                                         // 糖尾端剛好碰到嘴 / cane end exactly at the muzzle
  const SHIFT_END = v3(SL_FEED.x + PALM0.x - MZ.x, 0, SL_FEED.z + PALM0.z - MZ.z);              // 吃完時馴鹿往前的量 / how far it has stepped when the cane is gone
  setNeck(0);
  const N1 = v3(-F_.z, 0, F_.x);                                                                // 側面（往 +z）/ the side towards +z
  const SL0 = v3(LX + 1.2, 0, 0.6), KEN0 = v3(LX + 0.6, 0, 1.9);   /* 水鈴往後一點，第 17 句側拍不被 Ken 擋 / Shuiling a step back so Ken does not hide her in the line-17 side shot */
  const KEN_FEED = SL_FEED.clone().add(F_.clone().multiplyScalar(1.3)).add(N1.clone().multiplyScalar(-0.55));   // 水鈴右後方，離鏡頭遠一點 / behind her right shoulder, away from the camera   // 水鈴後側、不擋鏡頭 / behind her, out of the camera line

  // ---- 雪中小路（繞開主角松樹、離其他樹 3 格以上）/ the snow path, clear of every pine ----
  const PATH = new THREE.CatmullRomCurve3([DEER0.clone().add(SHIFT_END), v3(LX - 4.4, 0, 1.4), v3(LX - 6.2, 0, -2.0), v3(LX - 8.0, 0, -6.3), v3(LX - 10.6, 0, -10.3)]);
  const PLEN = PATH.getLength();
  const pathMat = new THREE.MeshStandardMaterial({ color: '#c8d4ec', roughness: 1 });
  for (let i = 0; i < 60; i++) { const u = i / 60, p = PATH.getPointAt(u), q = PATH.getPointAt(Math.min(1, u + 1 / 60)); const m = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.02, q.distanceTo(p) + 0.05), pathMat); m.position.copy(p).lerp(q, 0.5).setY(0.012); m.lookAt(q.x, 0.012, q.z); m.receiveShadow = true; m.name = 'snowpath'; scene.add(m); }
  const prints = []; const printMat = new THREE.MeshStandardMaterial({ color: '#a9b8d8', roughness: 1 });
  [[0, 0.0, 'deer'], [1.4, 0.42, 'sl'], [1.4, -0.42, 'ken']].forEach(([lag, side, who]) => { for (let d = 0.4; d < PLEN - lag; d += 0.36) { const u = d / PLEN, p = PATH.getPointAt(u), tg = PATH.getTangentAt(u), sd = v3(-tg.z, 0, tg.x).multiplyScalar(side + ((Math.round(d / 0.36) % 2) ? 0.09 : -0.09)); const m = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.015, 0.2), printMat); m.position.copy(p).add(sd).setY(0.027); m.rotation.y = Math.atan2(tg.x, tg.z); m.visible = false; m.name = 'footprint'; scene.add(m); prints.push({ m, d: d + lag, who }); } });
  const uLead = (ta) => ease.io(seg(ta, WALK0 + 0.3, ARRIVE));                                   // 馴鹿走的比例 / the reindeer's progress
  /* 到門前散開站好，不擋門也不擋鏡頭 / at the door they spread out side by side */
  const SLOTS = { deer: v3(LX - 12.6, 0, -10.7), sl: v3(LX - 11.3, 0, -10.3), ken: v3(LX - 10.0, 0, -10.5) };
  const LAG = { deer: [0, 0], sl: [1.4, 0.42], ken: [1.4, -0.42] };                              // [落後幾格, 往左偏] / [blocks behind, offset to the left]
  /* 兩人並排跟在馴鹿後面 / the two walk side by side behind the reindeer */
  const onPath = (ta, who) => { const [lag, side] = LAG[who], u = clamp01(uLead(ta) - lag / PLEN), tg = PATH.getTangentAt(u); return PATH.getPointAt(u).add(v3(-tg.z, 0, tg.x).multiplyScalar(side)).lerp(SLOTS[who], ease.io(seg(ta, ARRIVE - 1.3, ARRIVE + 0.4))); };

  // ---- 位置 / positions (ta = acting time) ----
  const EAT_LEN = (ta) => seg(ta, BITE, EAT1);                                                  // 吃掉的比例 / share of the cane eaten
  let eatShift = v3();
  const deerAt = (ta) => ta < WALK0 + 0.3 ? DEER0.clone().add(eatShift) : onPath(ta, 'deer');
  const slAt = (ta) => {
    if (ta < L17 + 3.0) return SL0.clone();
    if (ta < WALK0 + 0.6) return SL0.clone().lerp(SL_FEED, ease.io(seg(ta, L17 + 3.0, L17 + 4.2)));
    return SL_FEED.clone().lerp(onPath(ta, 'sl'), ease.io(seg(ta, WALK0 + 0.6, WALK0 + 2.0)));
  };
  const kenAt = (ta) => {
    if (ta < L17 + 2.6) return KEN0.clone();
    if (ta < WALK0 + 0.9) return KEN0.clone().lerp(KEN_FEED, ease.io(seg(ta, L17 + 2.6, L17 + 4.0)));   /* 和水鈴一起走過去，Seedance 首幀時已站好 / walks over with her, in place before the Seedance first frame */
    return KEN_FEED.clone().lerp(onPath(ta, 'ken'), ease.io(seg(ta, WALK0 + 0.9, WALK0 + 2.4)));
  };
  const face = (r, from, to) => { const d = to.clone().sub(from); if (d.lengthSq() > 1e-8) r.root.rotation.y = Math.atan2(d.x, d.z); };

  function act(ta) {
    // 糖被吃到哪一格；馴鹿跟著往前 / how much cane is eaten; the reindeer steps forward with it
    const eaten = Math.floor(EAT_LEN(ta) * 11.999);
    caneCells.forEach((c, i) => { c.visible = i < 11 - eaten; });
    const walking = ta >= WALK0 + 0.3;
    // 馴鹿 / the reindeer
    deer.root.rotation.set(0, DR, 0);
    if (!walking) {
      deer.root.rotation.y = lerp(0.2, DR, ease.io(seg(ta, L16 + 1.9, L16 + 2.6)));
      const shake = ta < BITE ? 1 : 1 - seg(ta, BITE, BITE + 0.5);
      deer.shiver(ta, shake * (ta >= L17 && ta < L18 ? 1.6 : 1));
      const down = ease.io(seg(ta, NECK, BITE - 0.1)) * (1 - ease.io(seg(ta, EAT1, NOD0)));
      setNeck(NECK_LOW * down);
      if (ta >= BITE - 0.35 && ta < BITE) deer.headG.rotation.x += Math.sin((ta - BITE) * 40) * 0.03;          // 聞一聞 / sniff
      if (ta >= NOD0 && ta < WALK0 + 0.3) setNeck(Math.max(0, Math.sin((ta - NOD0) * Math.PI * 2 / 0.3)) * 0.3);  // 點頭兩下 / nod twice
      deer.legs.forEach(l => l.rotation.x = 0); deer.body.position.y = 10 * PX;
    } else { const q = deerAt(ta + 0.05), p = deerAt(ta); face(deer, p, q); const want = deer.root.rotation.y, tk = ease.io(seg(ta, WALK0 + 0.3, WALK0 + 1.0)); let dA = want - DR; dA = Math.atan2(Math.sin(dA), Math.cos(dA)); deer.root.rotation.y = DR + dA * tk; if (ta > ARRIVE + 0.3) face(deer, p, DOOR); deerWalk(deer, (ta - WALK0) * 1.5, 1 - seg(ta, ARRIVE, ARRIVE + 0.4)); setNeck(0); deer.shiver(ta, 0); }
    deer.setFace({ eyes: ta < BITE ? 'worried' : ((ta % 3) < 0.12 ? 'blink' : 'open') });
    // 水鈴 / Shuiling
    const sp = slAt(ta); sl.root.position.copy(sp);
    let bagA = 0;
    if (ta < WALK0 + 0.6) {
      sl.root.rotation.set(0, SL_YAW, 0);
      if (ta < L17 + 3.0) { face(sl, sp, DEER0); pose(sl, { armLz: -10, armRz: 10, headX: 10, headY: -8 }); }
      else if (ta < L17 + 4.2) { face(sl, sp, SL_FEED.clone().add(SL_FEED.clone().sub(SL0))); walk(sl, (ta - L17) * 1.6, 0.8); }
      else if (ta < BAG0 - 0.35) pose(sl, { armLz: -10, armRz: 10, headX: 8 });
      else if (ta < OFFER) {
        /* 先轉身面向鏡頭，背包拿糖，再轉回馴鹿 / turn towards the camera for the bag, then back to the reindeer */
        const turn = ease.io(seg(ta, BAG0 - 0.35, BAG0)) * (1 - ease.io(seg(ta, CANE_UP + 0.15, OFFER)));
        let dY = Math.atan2(N1.x, N1.z) - SL_YAW; dY = Math.atan2(Math.sin(dY), Math.cos(dY)); sl.root.rotation.y = SL_YAW + dY * turn;
        // 背包甩到胸前 → 拉開 → 手伸進去拿糖 → 背包甩回去 / swing the bag round, open it, take the cane out, swing it back
        bagA = ease.io(seg(ta, BAG0, BAG_FRONT)) * (1 - ease.io(seg(ta, CANE_UP, BAG_BACK)));
        const reach = seg(ta, ZIP, REACH) * (1 - seg(ta, REACH + 0.05, CANE_UP));
        pose(sl, { armLx: lerp(-10, -42, bagA), armLz: lerp(-10, 12, bagA), armRx: lerp(-10, -30, bagA) - 22 * reach - (ta > CANE_UP ? 12 : 0), armRz: lerp(10, -14, bagA), headX: 22 * bagA, bodyX: 6 * bagA });
      } else pose(sl, { ...OFFER_POSE, armRx: lerp(-42, OFFER_POSE.armRx, ease.io(seg(ta, OFFER, OFFER + 0.4))) });
    } else { const q = slAt(ta + 0.05); face(sl, sp, q); if (ta > ARRIVE + 0.3) face(sl, sp, DOOR); walk(sl, (ta - WALK0) * 1.4 + 0.4, 0.9 * (1 - seg(ta, ARRIVE, ARRIVE + 0.4))); }
    bagPivot.rotation.y = Math.PI * bagA; slBag.group.position.z = -(9 + 5 * Math.sin(Math.PI * bagA)) * PX; slBag.setZip(seg(ta, BAG_FRONT, ZIP) * (1 - seg(ta, CANE_UP, BAG_BACK)));
    // Ken
    const kp = kenAt(ta); ken.root.position.copy(kp);
    if (ta < L17 + 2.6 || (ta >= L17 + 4.0 && ta < WALK0 + 0.9)) { face(ken, kp, ta < L17 + 2.6 ? deerAt(ta) : SL_FEED.clone().lerp(DEER0, 0.5)); pose(ken, { headX: 10, armLx: ta > L17 ? -40 : 0, armRx: ta > L17 ? -40 : 0, armLz: 10, armRz: -10, ...(ta > BITE + 0.3 && ta < WALK0 ? { armLz: -150, armRz: 150, armLx: 0, armRx: 0 } : {}) }); }
    else if (ta < WALK0) { face(ken, kp, KEN_FEED); walk(ken, ta * 1.5, 0.8); }
    else { const q = kenAt(ta + 0.05); face(ken, kp, q); if (ta > ARRIVE + 0.3) face(ken, kp, DOOR); walk(ken, (ta - WALK0) * 1.4, 0.9 * (1 - seg(ta, ARRIVE, ARRIVE + 0.4))); }
    // 表情 / faces
    const blink = (o) => ((ta + o) % 3.4) < 0.12;
    if (ta < BITE) { ken.setFace({ eyes: blink(0) ? 'blink' : 'worried', mouth: 'frown' }); sl.setFace({ eyes: ta > BAG0 ? 'happy' : 'worried', mouth: ta > BAG0 ? 'smile' : 'frown' }); }
    else { ken.setFace({ eyes: 'happy', mouth: 'grin' }); sl.setFace({ eyes: 'happy', mouth: 'open' }); }
    ken.root.updateMatrixWorld(true); sl.root.updateMatrixWorld(true);
    // 拐杖糖：在背包裡 → 拿出來直立握著 → 平放在掌心 → 被一格一格吃掉 / the cane: in the bag, held upright, flat on the palm, eaten cube by cube
    cane.visible = ta >= REACH && ta < EAT1 + 0.05 && eaten < 11;
    if (cane.visible) {
      const flat = ta < OFFER ? 0 : ease.io(seg(ta, OFFER, OFFER + 0.4));
      placeCaneOnPalm(palmTop(), flat);
      if (ta < CANE_UP) { const k = seg(ta, REACH, CANE_UP); cane.position.y -= (1 - k) * 0.35; }          // 從背包口拉出來 / pulled up out of the bag opening
    }
    // 吃的時候馴鹿往前，嘴一直貼著剩下的糖尾端 / while eating the reindeer moves forward so its muzzle stays on the cane end
    if (!walking && ta >= BITE) {
      if (ta >= EAT1) eatShift = SHIFT_END.clone();
      else {
        /* 用低頭姿勢量嘴的位置，算出要往前多少 / measure the muzzle in the low pose to get the step forward */
        const maxY = Math.max(...caneCells.filter(c => c.visible).map(c => c.position.y)) + 1 * PX;
        const endNow = cane.localToWorld(v3(0, maxY, 0));
        const nx = deer.neck.rotation.x, hx = deer.headG.rotation.x; deer.root.position.copy(DEER0); setNeck(NECK_LOW);
        const mz = muzzleFront(); eatShift = v3(endNow.x - mz.x, 0, endNow.z - mz.z); deer.neck.rotation.x = nx; deer.headG.rotation.x = hx;
      }
    } else if (!walking && ta < BITE) eatShift = v3();
    deer.root.position.copy(deerAt(ta)); deer.root.updateMatrixWorld(true);
    // 腳印：走過才出現 / footprints appear once walked over
    const dist = { deer: uLead(ta) * PLEN, sl: uLead(ta) * PLEN, ken: uLead(ta) * PLEN };
    prints.forEach(p => { p.m.visible = walking && dist[p.who] >= p.d; });
    cabin.update(ta);
  }

  // ---- 鏡頭 / cameras ----
  const D = v3(-0.616, 0, -0.788), PERP = v3(0.788, 0, -0.616);
  const groupC = (ta) => deerAt(ta).add(slAt(ta)).add(kenAt(ta)).multiplyScalar(1 / 3);
  /* 走小路：固定在右前方開闊處，跟著三人慢慢搖，小木屋一直在畫面裡 / walking: a fixed camera in the open, panning with them, the cabin always in view */
  const walkCam = (t) => { const c = groupC(TA(t)), dz = DOOR.clone().add(v3(0, 1.2, 0)); return [v3(LX - 3.5, 2.6, 5.5), c.add(v3(0, 0.9, 0)).lerp(dz, 0.3)]; };
  const shots = [
    { t: 0, cam: (t) => { const k = ease.io(seg(t, 0, 2.4)); return [v3(LX + 1.5, 9 - k * 6.5, 6.5), v3(LX - 3, 9 - k * 7.6, -1.6)]; } },        /* 松樹由上往下搖 */
    { t: 2.4, cam: (t) => [v3(LX + 2.2, 1.4, 4.6), v3(LX - 1.6, 0.8, 0.6)] },                                                                     /* 樹下的馴鹿，前景兩人 */
    { t: BEAT_PINE, beat: true, cam: (t) => { const k = ease.io(seg(t, BEAT_PINE, BEAT_DEER)); return [v3(LX + 3, 4.5 - k, 9), v3(LX - 3, 5.5 - k * 2, -1.6)]; } },
    { t: BEAT_DEER, beat: true, cam: (t) => [v3(LX + 0.6 - (t - BEAT_DEER) * 0.1, 1.4, 4.4), v3(LX - 2.2, 0.9, 0.6)] },
    { t: L17 - 0.4, cam: (t) => { const h = deer.head.getWorldPosition(v3()); return [h.clone().add(v3(1.7, 0.25, 1.7)), h.clone().add(v3(-0.3, -0.25, 0))]; } },   /* 馴鹿發抖特寫 */
    { t: L17 + 2.4, cam: (t) => [v3(LX - 4.0, 1.6, 4.6), v3(LX - 1.0, 0.9, 1.1)] },                                                              /* 側面：兩人擔心、水鈴走過去 */
    { t: SLOT17, cam: (t) => { const m = SL_FEED.clone().lerp(MZ, 0.5).setY(0); return [m.clone().add(N1.clone().multiplyScalar(4.4)).add(v3(0, 1.4, 0)), m.clone().add(v3(0, 1.0, 0))]; } },   /* Seedance 第 3 鏡（首幀與餵食同一側）*/                                                                 /* Seedance 第 3 鏡位置（佔位） */
    { t: BAG0 - 0.1, cam: (t) => { const s = SL_FEED.clone(); return [s.clone().add(N1.clone().multiplyScalar(3.4)).add(v3(0, 1.2, 0)).add(F_.clone().multiplyScalar(1.2)), s.clone().add(v3(0, 0.95, 0))]; } },   /* 側拍水鈴拿糖 */
    { t: L18 - 0.2, cam: (t) => { const m = SL_FEED.clone().lerp(MZ, 0.5).setY(0); return [m.clone().add(N1.clone().multiplyScalar(3.9)).add(v3(0, 1.45, 0)), m.clone().add(v3(0, 1.15, 0))]; } },                                       /* 餵食側面特寫 */
    { t: WALK0, cam: walkCam },   /* 側面遠景跟拍走小路 */
    { t: BEAT_TREAT, beat: true, cam: (t) => { const m = SL_FEED.clone().lerp(MZ, 0.8).setY(MZ.y + 0.12); return [m.clone().add(N1.clone().multiplyScalar(2.0 - (t - BEAT_TREAT) * 0.1)).add(v3(0, 0.22, 0)), m.clone()]; } },   /* a sweet treat 慢動作特寫重播 */
    { t: BEAT_TREAT + TREAT_DUR, cam: (t) => { const c = groupC(TA(t)), dz = DOOR.clone().add(v3(0, 1.2, 0)); return [v3(LX - 2.4 - (t - BEAT_TREAT - TREAT_DUR) * 0.12, 2.6, -8.8), c.add(v3(0, 0.9, 0)).lerp(dz, 0.3)]; } },   /* 側面：三人從右走向左邊的小木屋 */
    { t: BEAT_CABIN, beat: true, cam: (t) => [v3(LX - 6.0 - (t - BEAT_CABIN) * 0.12, 2.8, -4.5), v3(LX - 11.2, 1.4, -12.0)] },
  ];
  let cur = shots[0];
  const treatMark = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.35), new THREE.MeshBasicMaterial({ visible: false })); scene.add(treatMark);
  function frame(t) {
    let sh = shots[0]; for (const s of shots) if (t >= s.t) sh = s; cur = sh;
    const ta = TA(t); act(ta); F.update(t, camera);
    treatMark.position.copy(SL_FEED.clone().lerp(MZ, 0.62)).setY(MZ.y);
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
  function heart(g, x, y, s, a) { g.save(); g.globalAlpha = a; g.fillStyle = '#ff5a7a'; g.strokeStyle = '#ffffff'; g.lineWidth = 4; const P = [[0, 1], [1, 0], [2, 0], [3, 1], [3, 2], [2, 3], [1, 4], [0, 5], [-1, 4], [-2, 3], [-3, 2], [-3, 1], [-2, 0], [-1, 0]]; g.beginPath(); P.forEach(([u, v], i) => (i ? g.lineTo : g.moveTo).call(g, x + u * s, y + v * s)); g.closePath(); g.fill(); g.stroke(); g.restore(); }
  function overlay(g, t, cam) {
    const ta = TA(t);
    windLines(g, t, { a: 0.3, speed: 900, dir: 1 });
    if (t >= L17 + 1.5 && t < L17 + 2.4) { const [x, y] = scr(cam, deer.head.getWorldPosition(v3()).add(v3(0, -0.2, 0))); shakeMarks(g, x, Math.max(200, y), seg(t, L17 + 1.5, L17 + 1.7) * (1 - seg(t, L17 + 2.2, L17 + 2.4)), t); }
    if (t >= L17 - 0.4 && t < L17 + 1.5) { const [x, y] = scr(cam, deer.head.getWorldPosition(v3()).add(v3(0, -0.2, 0))); shakeMarks(g, x, Math.max(200, y), seg(t, L17 + 0.3, L17 + 0.5), t); }
    // 點頭時冒愛心 / hearts pop while it nods
    if (!inReplay(t) && ta >= NOD0 && ta < WALK0 + 0.4) { const [x, y] = scr(cam, deer.head.getWorldPosition(v3()).add(v3(0, 0.45, 0))); [[-70, 0, 0], [0, -50, 0.15], [70, -10, 0.3]].forEach(([dx, dy, d]) => { const k = seg(ta, NOD0 + d, NOD0 + d + 0.25); if (k > 0) heart(g, x + dx, y + dy - 40 * k, 7 + 3 * k, k * (1 - seg(ta, WALK0, WALK0 + 0.4))); }); }
    // a little cabin：箭頭指著遠方亮燈的小木屋 / arrow to the little lit cabin
    if (!inReplay(t) && t >= WALK0 + 0.7 && t < BEAT_TREAT) { const [x, y, z] = scr(cam, DOOR.clone().add(v3(0, 2.2, 0))); if (z < 1) arrow2d(g, x + 240, y - 220, x + 50, y - 40, { a: seg(t, WALK0 + 0.7, WALK0 + 1.0) * (1 - seg(t, BEAT_TREAT - 0.3, BEAT_TREAT)), label: 'a little cabin' }); }
  }
  // 接觸檢查用：手–背包、手–糖、糖尾端–嘴 / contact pairs for the checker
  const contacts = (t) => {
    const ta = TA(t), out = [];
    if (ta >= REACH - 0.02 && ta < CANE_UP - 0.15) out.push(['手伸進背包 hand in bag', sl.armR, slBag.body, 0.02]);
    if (cane.visible) out.push(['糖在掌心 cane on palm', sl.armR, cane, 0.02]);
    if (cane.visible && ta >= BITE && ta < EAT1) out.push(['嘴咬著糖 muzzle on cane', deer.muzzle, cane, 0.02]);
    return out;
  };
  const beatObjs = { 'pine tree': heroPine, 'a reindeer': deer.root, 'cabin': cabin.group, 'a sweet treat': treatMark };
  const deerIcon = iconOf(renderer, makeReindeer().root, { yaw: 1.1, pitch: 0.15, dist: 2.2 });
  const caneIcon = iconOf(renderer, candyCane(1), { yaw: 0.2, pitch: 0.1, dist: 2.2 });
  const debug = () => ({ SL_FEED, DEER0, MZ, KEN_FEED, END0, PALM0, SHIFT_END, NECK_LOW, sl: sl.root.position, ken: ken.root.position, deer: deer.root.position, cam: camera.position });
  return { dur: tl.dur, frame, faces, overlay, contacts, debug, beatObj: (l) => beatObjs[l] || null, cards: { 'a reindeer': deerIcon, 'a sweet treat': caneIcon } };
}
