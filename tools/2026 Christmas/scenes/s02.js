// 第 2 幕〈Get Ready〉：教室整理背包（第 4–6 句，每句 2 鏡）
// Scene 2: packing backpacks in the classroom, two shots per line.
import * as THREE from 'three';
import { PX, part, pixTex, noisy, px, blockType, instanced, PAINT } from '../engine/voxel.js';
import { makeKen, makeShuiling, pose, walk } from '../engine/chars.js';
import { backpack, candyCane, treasureMap, foldedCoat, desk } from '../engine/props.js';
import { iconOf, ease, clamp01, mouthAt, W, H } from '../engine/kit.js';

const lerp = (a, b, k) => a + (b - a) * k;
const v3 = (...a) => new THREE.Vector3(...a);
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const DESK_TOP = 13 * PX;

function buildRoom(scene) {
  const CREAM = '#eee6d2';
  const wall = blockType({ all: (g) => { noisy(g, 16, 16, CREAM, 0.035, 401); } }, { key: 'cwall' });
  const wainscot = blockType({ all: (g) => { noisy(g, 16, 16, '#9bb7a0', 0.05, 402); px(g, 0, 0, '#7c9a82', 16, 1); } }, { key: 'cwains' });
  const floor = blockType({ all: PAINT.plank }, { key: 'plank' });
  const fl = [], wl = [], wn = [];
  for (let x = -7; x < 7; x++) for (let z = -5; z < 6; z++) fl.push([x, -1, z]);
  for (let x = -7; x < 7; x++) for (let y = 0; y < 5; y++) (y === 0 ? wn : wl).push([x, y, -6]);
  for (let z = -6; z < 6; z++) for (let y = 0; y < 5; y++) {
    const win = y >= 1 && y <= 3 && (z % 3 !== 0); if (!win) (y === 0 ? wn : wl).push([-8, y, z]);
    const door = y < 3 && (z === 1 || z === 2); if (!door) (y === 0 ? wn : wl).push([7, y, z]);
  }
  scene.add(instanced(floor, fl), instanced(wall, wl), instanced(wainscot, wn));
  // 窗外天光 / bright window panes
  for (let z = -6; z < 6; z++) if (z % 3 !== 0) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.75, 2.0) }));
    p.position.set(-7.55, 2.5, z + 0.5); p.rotation.y = Math.PI / 2; scene.add(p);
  }
  // 黑板 / chalkboard
  const bb = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.2), new THREE.MeshStandardMaterial({ map: pixTex(240, 88, (g) => {
    noisy(g, 240, 88, '#2f5a43', 0.04, 403); g.strokeStyle = '#8a6a3a'; g.lineWidth = 4; g.strokeRect(2, 2, 236, 84);
    g.font = 'bold 26px "Comic Relief"'; g.fillStyle = '#f2f2ea'; g.textAlign = 'center'; g.fillText('Hello, Winter!', 120, 40);
    const P = 3; [[1, 0], [1, 1], [0, 2], [1, 2], [2, 2], [1, 3]].forEach(([x, y]) => { g.fillRect(30 + x * P, 52 + y * P, P, P); g.fillRect(196 + x * P, 50 + y * P, P, P); });
  }, 'board'), roughness: 0.95 }));
  bb.position.set(0, 2.6, -5.48); scene.add(bb);
  // 門板（打開）/ open door leaf
  const door = part(16, 48, 2, { all: (g, W, H) => { noisy(g, W, H, '#9a6a3c', 0.05, 404); px(g, 12, 24, '#e8c35a', 2, 2); } }, { key: 'cdoor' });
  door.position.set(7.9, 1.5, 0.6); door.rotation.y = -1.2; scene.add(door);
}

export async function setup({ S, tl, man }) {
  const { scene, camera, renderer } = S;
  scene.background = new THREE.Color('#dfe7ee');
  scene.add(new THREE.HemisphereLight('#fff3e2', '#7a6650', 1.1));
  const sun = new THREE.DirectionalLight('#ffe2b8', 2.6); sun.position.set(-14, 9, 3); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02; scene.add(sun);
  const fill = new THREE.DirectionalLight('#cfe0ff', 0.6); fill.position.set(6, 5, 8); scene.add(fill);
  buildRoom(scene);
  [[-1.3, 0], [1.5, 0], [-1.3, -2.4], [1.5, -2.4], [-4.1, 0], [4.3, 0], [-4.1, -2.4], [4.3, -2.4]].forEach(([x, z]) => { const d = desk(); d.position.set(x, 0, z); scene.add(d); });

  const ken = makeKen(), sl = makeShuiling(); scene.add(ken.root, sl.root);
  const KEN0 = v3(-1.3, 0, -0.78), SL0 = v3(1.5, 0, -0.78);
  const kbp = backpack('#e8792a', '#24305e'), sbp = backpack('#5aa65a', '#2f5d3a');
  kbp.group.scale.setScalar(0.7); sbp.group.scale.setScalar(0.7); scene.add(kbp.group, sbp.group);
  const coat = foldedCoat(); scene.add(coat);
  const map = treasureMap(); map.group.scale.setScalar(0.62); scene.add(map.group);
  const cane = candyCane(0.9); scene.add(cane);
  const flash = new THREE.PointLight('#ffd86a', 0, 2.5, 2); scene.add(flash);

  // ---- 動作時間表 / action times ----
  const C_GRAB = 1.0, C_IN = 2.3, M_GRAB = 2.9, M_IN = 4.3, Z0 = 4.4, Z1 = 5.0;
  const S_UP = 5.3, S_DOWN = 7.7, S_DROP = 8.6, S_ZIP0 = 9.2, S_ZIP1 = 9.9;
  const B_GRAB = 10.9, B_ON = 11.5, FIST0 = 11.7, RUN0 = 13.3, RUN1 = 16.6;
  const REACH = -62;

  function kenPose(t) {
    ken.root.position.copy(KEN0); ken.root.rotation.y = 0;
    if (t < M_IN + 0.2) {
      // 拿外套、塞進背包、拿地圖摺好、放進前口袋 / coat in, then fold the map into the pocket
      const r1 = ease.io(seg(t, 0.5, C_GRAB)), up = ease.io(seg(t, C_GRAB, 1.6)), dn = ease.io(seg(t, 1.6, C_IN));
      const m1 = ease.io(seg(t, 2.6, M_GRAB)), hold = ease.io(seg(t, M_GRAB, 3.2)), ins = ease.io(seg(t, 3.8, M_IN));
      let ax = lerp(-8, REACH, r1); ax = lerp(ax, -80, up); ax = lerp(ax, REACH + 4, dn); ax = lerp(ax, REACH, m1); ax = lerp(ax, -78, hold); ax = lerp(ax, -58, ins);
      let by = lerp(0, 16, r1); by = lerp(by, -32, up); by = lerp(by, 16, m1); by = lerp(by, -32, ins);
      pose(ken, { armLx: ax, armRx: ax, armLz: 14, armRz: -14, bodyY: by, headX: 18, headY: by * 0.5 });
    } else if (t < B_GRAB - 0.5) {
      const z = seg(t, Z0, Z1); pose(ken, { armLx: -20, armRx: lerp(-60, -55, z), armLz: -4, armRz: -14, headX: 14, headY: 10 * z });
      if (t > Z1) pose(ken, { armLz: -4, armRz: 4, headY: lerp(0, 30, seg(t, 5.4, 6.0)), headX: 6 });
    } else if (t < RUN0) {
      const r = ease.io(seg(t, B_GRAB - 0.5, B_GRAB)), sw = ease.io(seg(t, B_GRAB, B_ON)), f = ease.back(seg(t, FIST0, FIST0 + 0.5));
      const ax = t < B_GRAB ? lerp(-10, REACH + 4, r) : lerp(REACH + 4, -10, sw);
      pose(ken, { armRx: ax, armLx: t < B_ON ? ax : lerp(-10, -172, f), armRz: -14 * (1 - sw), armLz: t < B_ON ? 14 * (1 - sw) : lerp(-4, 8, f), bodyY: t < B_GRAB ? lerp(0, -32, r) : lerp(-32, 0, sw), headX: lerp(14, -4, sw), bob: t > FIST0 && t < FIST0 + 0.35 ? 1.2 : 0 });
      if (t >= B_ON) ken.root.rotation.y = 0.3 * ease.io(seg(t, B_ON, B_ON + 0.4));
    } else runPose(ken, t, KEN0, 0);
  }
  function slPose(t) {
    sl.root.position.copy(SL0); sl.root.rotation.y = 0;
    if (t < S_UP - 0.2) { pose(sl, { armLx: -30, armRx: -30, headY: 22, headX: 6, armLz: 10, armRz: -10 }); }
    else if (t < S_ZIP1 + 0.4) {
      const up = ease.back(seg(t, S_UP - 0.2, S_UP + 0.4)), dn = ease.io(seg(t, S_DOWN, S_DROP - 0.1)), zp = seg(t, S_ZIP0, S_ZIP1);
      const ax = lerp(lerp(-30, -158, up), REACH, dn);
      pose(sl, { armRx: ax, armRz: lerp(-10, -6, up), armLx: lerp(-30, -10, up), armLz: 4, bodyY: 22 * dn, headX: lerp(-12, 18, dn), headY: lerp(22, 0, up) + 10 * dn, headZ: Math.sin(t * 5) * 4 * (1 - dn) });
      if (t > S_ZIP0) pose(sl, { armRx: REACH + 2, armRz: -6 + zp * -6, armLx: -10, armLz: 4, bodyY: 22, headX: 16, headY: 10 });
    } else if (t < RUN0) {
      const sw = ease.io(seg(t, B_GRAB, B_ON));
      pose(sl, { armLx: lerp(-20, -10, sw), armRx: lerp(-20, -10, sw), headY: -24, headX: -4, bob: Math.abs(Math.sin(t * 6)) * 0.6 });
    } else runPose(sl, t, SL0, 0.4);
  }
  // 跑出教室：先往前繞過桌子，再往右邊門口 / run around the desk and out of the right-hand door
  const DOOR = v3(7.6, 0, 1.5);
  /* 先往右側走到桌子旁的走道，再往前、往門口；兩人在門口並排（門洞 z 1–3）/ step sideways into the aisle, then forward and out; side by side in the doorway */
  function runPath(t, p0, delay) {
    const k = ease.io(seg(t, RUN0 + delay, RUN1 + delay));
    const sx = p0.x + 1.4, pts = [p0.clone(), v3(p0.x + 0.2, 0, p0.z - 0.45), v3(sx, 0, p0.z - 0.45), v3(sx, 0, 1.45), v3(delay ? 7.0 : 7.9, 0, 2.0)];   /* 門洞正中、一前一後 / through the middle of the doorway, one after the other */
    const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const d = k * L[L.length - 1]; let i = 1; while (i < pts.length - 1 && L[i] < d) i++;
    return pts[i - 1].clone().lerp(pts[i], (d - L[i - 1]) / (L[i] - L[i - 1]));
  }
  function runPose(r, t, p0, delay) {
    const p = runPath(t, p0, delay), q = runPath(t + 0.05, p0, delay); r.root.position.copy(p);
    const d = q.clone().sub(p); if (d.lengthSq() > 1e-6) r.root.rotation.y = Math.atan2(d.x, d.z);
    const moving = t > RUN0 + delay && t < RUN1 + delay; if (moving) walk(r, (t - RUN0) * 2.4, 1.5); else pose(r, {});
  }

  const handMid = (r) => { const a = v3(), b = v3(); r.handL.getWorldPosition(a); r.handR.getWorldPosition(b); return a.add(b).multiplyScalar(0.5); };
  const handR = (r) => { const a = v3(); r.handR.getWorldPosition(a); return a; };
  // 物件靜止位置＝接觸那一刻的手（手一定碰到）/ rest position = where the hands are at the contact frame
  kenPose(C_GRAB); ken.root.updateMatrixWorld(true); const COAT_REST = handMid(ken).setY(DESK_TOP + 2 * PX);
  kenPose(M_GRAB); ken.root.updateMatrixWorld(true); const MAP_REST = handMid(ken).setY(DESK_TOP + 0.01);
  // 背包放在「手放東西進去」的位置正下方 / the bag sits right under where the hands put things in
  kenPose(C_IN); ken.root.updateMatrixWorld(true); const KBP_REST = handMid(ken).setY(DESK_TOP);
  slPose(S_DROP - 0.01); sl.root.updateMatrixWorld(true); const SBP_REST = handR(sl).setY(DESK_TOP).add(v3(0, 0, 0.02));
  const BAG_TOP = 12 * PX * 0.7;
  const kPocket = () => KBP_REST.clone().add(v3(0, BAG_TOP + 0.02, 0));
  const sPocket = () => SBP_REST.clone().add(v3(0, BAG_TOP + 0.02, 0));

  function wearBag(bp, r, on) {
    if (on && bp.group.parent !== r.torso) { r.torso.add(bp.group); bp.group.position.set(0, 1 * PX, -9 * PX); bp.group.rotation.set(0, Math.PI, 0); }
    if (!on && bp.group.parent !== scene) { scene.add(bp.group); bp.group.rotation.set(0, 0, 0); }
  }

  const shots = [
    { t: 0, cam: (t) => [v3(0.6 - t * 0.06, 2.3, 3.6 - t * 0.08), v3(-1.35, 0.95, -0.3)] },
    { t: 2.6, cam: (t) => [v3(-0.5, 1.3, 1.95 - (t - 2.6) * 0.05), v3(-1.45, 1.0, -0.2)] },
    { t: 5.2, cam: (t) => [v3(0.6 + (t - 5.2) * 0.05, 1.75, 3.2), v3(1.6, 1.5, -0.5)] },
    { t: 7.6, cam: (t) => [v3(1.0, 1.55, 1.75), v3(SBP_REST.x - 0.1, 1.0, -0.2)] },
    { t: 10.3, cam: (t) => [v3(-1.9 + (t - 10.3) * 0.04, 1.4, 3.3 - (t - 10.3) * 0.06), v3(-1.3, 1.45, -0.7)] },
    { t: 13.2, cam: (t) => { const m = runPath(t, KEN0, 0).add(runPath(t, SL0, 0.4)).multiplyScalar(0.5); return [v3(-1.5 + (t - 13.2) * 0.9, 2.6, 6.8), v3(m.x, 1.0, m.z)]; } },
  ];

  function act(t) {
    kenPose(t); slPose(t);
    wearBag(kbp, ken, t >= B_ON); wearBag(sbp, sl, t >= B_ON);
    ken.root.updateMatrixWorld(true); sl.root.updateMatrixWorld(true);
    // 背包鼓起＋拉鍊 / bulge and zipper
    kbp.setBulge(ease.out(seg(t, 1.9, C_IN + 0.1))); kbp.setZip(ease.io(seg(t, Z0, Z1))); sbp.setZip(ease.io(seg(t, S_ZIP0, S_ZIP1)));
    if (t < B_ON && t >= B_GRAB) { kbp.group.position.copy(handMid(ken)).add(v3(0, -6 * PX, 0)); kbp.group.rotation.y = 0; }
    else if (t < B_GRAB) kbp.group.position.copy(KBP_REST);
    if (t < B_ON) { sbp.group.position.copy(SBP_REST); sbp.group.rotation.y = 0; }
    // 外套 / coat
    coat.visible = t < C_IN;
    if (t < C_GRAB) coat.position.copy(COAT_REST);
    else if (t < C_IN) { const h = handMid(ken); coat.position.copy(h); const k = seg(t, 1.8, C_IN); coat.position.y = lerp(h.y, DESK_TOP + 0.35, k); coat.scale.set(1 - 0.3 * k, 1 - 0.5 * k, 1 - 0.3 * k); }
    // 地圖：攤開→拿起摺兩次→放進前口袋 / map: flat, picked up, folded twice, into the pocket
    map.group.visible = t < M_IN;
    if (t < M_GRAB) { map.group.position.copy(MAP_REST); map.group.rotation.set(0, 0, 0); map.setFold(0); }
    else if (t < M_IN) {
      const h = handMid(ken), ins = ease.io(seg(t, 3.8, M_IN));
      map.group.position.copy(h).add(v3(0, 0.06, 0)).lerp(kPocket(), ins); map.setFold(ease.io(seg(t, 3.0, 3.75)) * 2);
      map.group.rotation.set(lerp(0, Math.PI / 2, ease.io(seg(t, 3.6, 3.9))), 0, 0);
    }
    // 拐杖糖 / candy cane
    cane.visible = t >= S_UP - 0.2 && t < S_DROP + 0.25;
    if (cane.visible) {
      /* 彎鉤朝上拿著；放手後直直掉進背包開口 / held hook-up, then drops straight into the bag opening */
      if (t < S_DROP) { cane.position.copy(handR(sl)).add(v3(0, -0.04, 0)); cane.rotation.set(0, 0.6, 0); }
      else { const k = seg(t, S_DROP, S_DROP + 0.25), h0 = handR(sl).y - 0.04; cane.position.copy(sPocket()).setY(lerp(h0, DESK_TOP + 0.05, k * k)); cane.rotation.set(0, 0.6, 0); }
    }
    flash.position.copy(sPocket()).add(v3(0, 0.1, 0.2)); flash.intensity = t > S_DROP + 0.1 ? 6 * Math.max(0, 1 - (t - S_DROP - 0.1) / 0.6) : 0;
    // 表情 / faces
    const blink = (o) => ((t + o) % 3.4) < 0.12;
    const lk = man.L06, ktl = t - 10.8;
    ken.setFace(ktl >= 0 && ktl < lk.dur ? { eyes: 'happy', mouth: mouthAt(lk, ktl) } : t >= RUN0 ? { eyes: 'happy', mouth: 'grin' } : { eyes: blink(0) ? 'blink' : 'open', mouth: t < 5 ? 'flat' : 'smile' });
    sl.setFace(t >= S_UP - 0.2 && t < S_DROP ? { eyes: 'happy', mouth: 'open' } : t >= RUN0 ? { eyes: 'happy', mouth: 'open' } : { eyes: blink(1.1) ? 'blink' : 'open', mouth: 'smile' });
    // 鏡頭 / camera
    let sh = shots[0]; for (const s of shots) if (t >= s.t) sh = s;
    const [p, l] = sh.cam(t); camera.position.copy(p); camera.lookAt(l); camera.fov = 36; camera.updateProjectionMatrix();
  }

  // ================= 慢動作展示（關鍵字）/ slow-motion showcase of key words =================
  // 演出時間 ta：慢動作時畫面定住 / acting time freezes during the beats
  const TA = (t) => t < 5.0 ? t : t < 9.8 ? 5.0 : t < 14.7 ? t - 4.8 : t < 19.4 ? 9.9 : t - 9.5;
  const show = {};
  { const m = treasureMap(); m.setFold(0); m.group.children[0].rotation.x = 0; m.group.scale.setScalar(0.9); show['map'] = m.group; }
  { const g = new THREE.Group();
    /* 攤開的外套：身體＋兩隻袖子＋領子＋拉鍊 / an open-out coat: body, two sleeves, collar, zipper */
    const NV = '#2f4a8a', OR = '#e8792a';
    const body = part(12, 14, 3, { front: (gg, Wd, Ht) => { noisy(gg, Wd, Ht, NV, 0.06, 331); px(gg, 5, 1, '#d9d9d9', 2, Ht - 1); px(gg, 1, 9, '#1f3466', 3, 3); px(gg, 8, 9, '#1f3466', 3, 3); px(gg, 0, Ht - 1, OR, Wd, 1); }, all: NV }, { key: 'coat-body' });
    g.add(body);
    [-1, 1].forEach(sg => { const sl2 = part(4, 12, 3, { all: (gg, Wd, Ht) => { noisy(gg, Wd, Ht, NV, 0.06, 332); px(gg, 0, Ht - 2, OR, Wd, 2); } }, { key: 'coat-sleeve' }); sl2.position.set(sg * 8 * PX, -1 * PX, 0); sl2.rotation.z = sg * 0.35; g.add(sl2); });
    const collar = part(8, 3, 4, { all: OR }, { key: 'coat-collar' }); collar.position.y = 7.5 * PX; g.add(collar);
    // 暖暖的熱氣：橘色小方塊往上飄 / warm steam: little orange cubes rising
    g.userData.steam = Array.from({ length: 10 }, (_, i) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: '#ffb36a', emissive: '#ff8a3a', emissiveIntensity: 2, transparent: true })); g.add(b); return b; });
    show['warm coat'] = g; }
  { const c = candyCane(1.6); show['a candy cane'] = c; }
  { const b = backpack('#5aa65a', '#2f5d3a'); b.group.scale.setScalar(1.1); show['backpack'] = b.group; }
  /* 展示物件永遠畫在最上層，不會被桌子、背包擋住 / showcase props always draw on top */
  Object.values(show).forEach(o => { o.visible = false; scene.add(o); o.traverse(m => { if (!m.isMesh) return; m.renderOrder = 999; (Array.isArray(m.material) ? m.material : [m.material]).forEach(mt => { mt.depthTest = false; }); }); });
  const beats = tl.beats || [];
  const camFwd = () => camera.getWorldDirection(v3());
  function frame(t) {
    act(TA(t));
    for (const [label, o] of Object.entries(show)) {
      const b = beats.find(x => x.label === label && t >= x.t && t < x.t + x.dur);
      o.visible = !!b; if (!b) continue;
      const lt = t - b.t, k = ease.back(clamp01(lt / 0.5));
      // 放在鏡頭正前方、0.4 倍速慢慢轉 / right in front of the camera, slowly turning at 0.4x
      /* 依物件大小算距離：物件高約佔畫面四成 / distance from the object's size so it fills about 40% of the frame */
      if (!o.userData.size) { o.scale.setScalar(o.userData.s0 ??= o.scale.x); const sz = new THREE.Box3().setFromObject(o).getSize(v3()); o.userData.size = Math.max(sz.x, sz.y, sz.z); }
      const dist = o.userData.size / (2 * Math.tan(camera.fov * Math.PI / 360) * 0.42);
      o.position.copy(camera.position).add(camFwd().multiplyScalar(dist)).add(v3(0, -0.04 * dist, 0));
      o.lookAt(camera.position); o.rotateY(Math.sin(lt * 0.9) * 0.6); if (label === 'map') o.rotateX(0.15);
      o.scale.setScalar((o.userData.s0 ??= o.scale.x) * Math.max(0.01, k));
      if (o.userData.steam) o.userData.steam.forEach((m, i) => { const a = ((lt * 0.5 + i / 10) % 1); m.position.set(Math.sin(i * 2.1) * 0.12, 0.08 + a * 0.35, Math.cos(i * 1.7) * 0.06); m.material.opacity = 1 - a; });
    }
  }
  const faces = () => [ken, sl].filter(r => r.root.visible).map(r => r.head.getWorldPosition(v3()));
  const beatObj = (label) => show[label] || null;
  const caneIcon = iconOf(renderer, candyCane(1), { yaw: 0.2, pitch: 0.1, dist: 2.2 });
  return { dur: tl.dur, frame, faces, beatObj, cards: { 'a candy cane': caneIcon } };
}
