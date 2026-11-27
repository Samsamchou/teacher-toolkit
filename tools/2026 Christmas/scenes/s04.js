// 第 4 幕〈The Tunnel〉：牽手飛過又長又彩色的隧道 → 水鈴喊抓緊、越來越冷 → 砰！掉進雪地、旁邊是雪人（第 10–12 句）
// Scene 4: flying through the long colourful tunnel, "Hold on tight!", landing in the snow next to a snowman.
import * as THREE from 'three';
import { PX, part, pixTex, noisy, px, rng } from '../engine/voxel.js';
import { makeKen, makeShuiling, makeSnowman, pose, walk } from '../engine/chars.js';
import { backpack, terrain, pine, moon } from '../engine/props.js';
import { nightSky, aurora, snow, iconOf, ease, clamp01, arrow2d, windLines, mouthAt, squareSprite, W, H } from '../engine/kit.js';

const lerp = (a, b, k) => a + (b - a) * k;
const v3 = (...a) => new THREE.Vector3(...a);
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const LX = 300;                  // 降落的雪地森林在 x=300 / the snowy forest set

export async function setup({ S, tl, man }) {
  const { scene, camera, renderer } = S;
  const sky = nightSky(scene, { top: '#0b1030', mid: '#1d2f63', bottom: '#4a6aa8', stars: 600 });
  // ---------- 隧道：一圈圈發光方塊，顏色一直換 / the tunnel: rings of glowing cubes, colours cycling ----------
  const RINGS = 70, PER = 22, GAP = 1.6, RAD = 3.2;
  const rg = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), new THREE.MeshBasicMaterial({ color: 0xffffff }), RINGS * PER);
  rg.frustumCulled = false; scene.add(rg);
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  const tunnelBg = new THREE.Mesh(new THREE.CylinderGeometry(RAD + 1.5, RAD + 1.5, RINGS * GAP, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#120a2a', side: THREE.BackSide }));
  tunnelBg.rotation.x = Math.PI / 2; scene.add(tunnelBg);
  const speedRate = (t) => (t >= 4.8 && t < 7.4 ? 0.4 : 1) * 9;   /* 慢動作時 0.4 倍 / 0.4x during the beat */
  const travel = (t) => { let d = 0, s = 0, dt = 0.05; for (let x = 0; x < t; x += dt) d += speedRate(x) * dt; return d; };
  function tunnel(t, on) {
    rg.visible = tunnelBg.visible = on; if (!on) return;
    const d = travel(t), cyc = t * 0.6;
    for (let r = 0; r < RINGS; r++) {
      const z = 1.5 - ((r * GAP - d) % (RINGS * GAP) + RINGS * GAP) % (RINGS * GAP);
      for (let i = 0; i < PER; i++) {
        const a = i / PER * Math.PI * 2 + r * 0.13;
        dummy.position.set(Math.cos(a) * RAD, Math.sin(a) * RAD, z); dummy.rotation.set(0, 0, a); dummy.updateMatrix(); rg.setMatrixAt(r * PER + i, dummy.matrix);
        col.setHSL(((r * 0.07 + cyc) % 1 + 1) % 1, 0.85, 0.5).multiplyScalar(r < 3 ? 0.6 : 1.25); rg.setColorAt(r * PER + i, col);
      }
    }
    rg.instanceMatrix.needsUpdate = true; rg.instanceColor.needsUpdate = true;
    tunnelBg.position.z = 1.5 - RINGS * GAP / 2;
  }
  const tunnelLight = new THREE.PointLight('#ffffff', 3, 12, 1.2); tunnelLight.position.set(0, 1.5, 3); scene.add(tunnelLight);
  const tunnelAmb = new THREE.AmbientLight('#b8a0ff', 1.2); scene.add(tunnelAmb);

  // ---------- 降落的雪地森林（夜晚、極光）/ the snowy night forest where they land ----------
  const forest = new THREE.Group(); scene.add(forest);
  const before = scene.children.length;
  terrain(scene, { size: 56, flat: 9, cx: LX, cz: 0, seed: 21 });
  [[-6, -6, 10], [5, -8, 12], [-12, -2, 9], [11, -3, 8], [-3, -14, 13], [9, -15, 14], [-16, -10, 11]].forEach(([x, z, h]) => pine(scene, LX + x, z, { h }));
  const fm = moon(scene, { pos: [LX - 50, 60, -150] });
  const au = aurora(scene, { y: 40, z: -150 }); au.group.position.x = LX;
  const added = scene.children.slice(before); added.forEach(o => { scene.remove(o); forest.add(o); });
  const fsnow = snow(scene, { count: 2500, box: [24, 14, 20], center: [LX, 0, 0], wind: 1.6, size: 0.06 }); forest.add(fsnow.points);
  const hemi = new THREE.HemisphereLight('#8fb0ef', '#2c3a5e', 1.05); forest.add(hemi);
  const mn = new THREE.DirectionalLight('#bcd0ff', 1.9); mn.position.set(LX - 6, 10, -4); mn.target.position.set(LX, 0, 0); mn.castShadow = true; mn.shadow.mapSize.set(2048, 2048); Object.assign(mn.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 }); mn.shadow.bias = -0.0008; forest.add(mn, mn.target);
  const snowman = makeSnowman(); snowman.root.position.set(LX + 2.3, 0, -0.4); snowman.root.rotation.y = -0.6; forest.add(snowman.root);
  // 雪塊噴起 / snow chunks thrown up on landing
  const chunks = Array.from({ length: 34 }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), new THREE.MeshStandardMaterial({ color: '#f2f6ff', roughness: 0.9 })); forest.add(m); return m; });

  // ---------- 角色 / the two children ----------
  const ken = makeKen(), sl = makeShuiling(); scene.add(ken.root, sl.root);
  [[backpack('#e8792a', '#24305e'), ken], [backpack('#5aa65a', '#2f5d3a'), sl]].forEach(([b, r]) => { b.group.scale.setScalar(0.7); r.torso.add(b.group); b.group.position.set(0, 1 * PX, -9 * PX); b.group.rotation.y = Math.PI; });
  // 結霜粒子（越來越冷）/ frost specks gathering on them
  const frost = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: '#e8f6ff', size: 0.05, map: squareSprite(), transparent: true, depthWrite: false }));
  { const r = rng(4), p = []; for (let i = 0; i < 500; i++) p.push((r() - 0.5) * 3.0, r() * 1.9 - 0.95, (r() - 0.5) * 0.9); frost.geometry.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); }
  scene.add(frost);

  // ---------- 時間 / times ----------
  const BUMP = 13.62, FLASH0 = 13.15;
  const inTunnel = (t) => t < FLASH0 + 0.15;
  function flyPose(t) {
    // 兩人面向鏡頭往前飛、身體前傾、中間的手牽在一起 / flying toward camera, leaning forward, holding hands
    const bob = Math.sin(t * 2.2) * 0.08;
    ken.root.position.set(-0.98, -0.9 + bob, 0); sl.root.position.set(0.98, -0.9 - bob, 0.1);
    ken.root.rotation.set(0.75, 0, 0.04); sl.root.rotation.set(0.75, 0, -0.04);
    const grip = t >= 9.9 && t < 11.3 ? 1 : 0;
    pose(ken, { armRz: 84 + grip * 4, armRx: -8, armLx: -160, armLz: -10, legLx: 24 + Math.sin(t * 3) * 6, legRx: 14 - Math.sin(t * 3) * 6, headX: -32 });
    pose(sl, { armLz: -84 - grip * 4, armLx: -8, armRx: -160, armRz: 10, legLx: 14 + Math.sin(t * 3 + 1) * 6, legRx: 24 - Math.sin(t * 3 + 1) * 6, headX: -32 });
  }
  function landPose(t) {
    ken.root.rotation.set(0, 0, 0); sl.root.rotation.set(0, 0, 0);
    const fall = 1 - seg(t, FLASH0 + 0.15, BUMP);
    ken.root.position.set(LX - 0.7, fall * fall * 7, 0.9); sl.root.position.set(LX + 0.5, fall * fall * 7.4, 1.1);
    const sq = t >= BUMP && t < BUMP + 0.5 ? Math.sin(seg(t, BUMP, BUMP + 0.5) * Math.PI) : 0;
    const look = ease.io(seg(t, 16.4, 17.1));
    ken.root.rotation.y = lerp(0.2, 0.75, look); sl.root.rotation.y = lerp(-0.2, 0.55, look);
    pose(ken, { armLz: -60 * (1 - look) - 8, armRz: 60 * (1 - look) + 8, legLx: -50 * sq, legRx: -50 * sq, bob: -3 * sq, headY: 10 * look, headX: -6 });
    pose(sl, { armLz: -60 * (1 - look) - 8, armRz: 60 * (1 - look) + 8, legLx: -50 * sq, legRx: -50 * sq, bob: -3 * sq, headY: 8 * look, headX: -6 });
  }

  const shots = [
    { t: 0, cam: (t) => [v3(0.0, 0.7, 5.6 - t * 0.08), v3(0, 0.15, 0)] },                                   /* 兩人牽手往前飛 */
    { t: 2.4, cam: (t) => [v3(2.2, 1.8, 1.0), v3(-0.3, -0.2, -14)] },                                          /* 從旁邊看隧道又長又彩色 */
    { t: 4.8, beat: 'tunnel', cam: (t) => [v3(-1.0 + (t - 4.8) * 0.2, 1.9, 5.8), v3(0, 0, -12)] },            /* 慢：隧道 */
    { t: 7.4, cam: (t) => { const h = sl.head.getWorldPosition(v3()); return [h.clone().add(v3(0.35, 0.05, 2.1)), h.clone().add(v3(-0.25, -0.25, 0))]; } },                                          /* 水鈴大喊（H3 位置） */
    { t: 9.9, cam: (t) => { const m = ken.handR.getWorldPosition(v3()).add(sl.handL.getWorldPosition(v3())).multiplyScalar(0.5); return [m.clone().add(v3(0.1, 0.35, 1.5)), m]; } },                                         /* 緊握的手特寫 */
    { t: 11.3, cam: (t) => [v3(0, 0.6, 4.8 - (t - 11.3) * 0.12), v3(0, 0.15, 0)] },                            /* 結霜、越來越冷 */
    { t: FLASH0 + 0.15, land: true, cam: (t) => [v3(LX + 0.2, 1.6, 6.4), v3(LX, 0.8, 0.5)] },               /* 砰！掉進雪地 */
    { t: 15.3, land: true, cam: (t) => { const k = ease.io(seg(t, 16.3, 17.4)); return [v3(LX - 1.2 + k * 1.0, 1.5, 5.6 - k * 0.6), v3(LX + k * 1.9, 1.1, 0.3)]; } },   /* 轉頭看到雪人 */
    { t: 19.2, land: true, beat: 'a snowman', cam: (t) => [v3(LX + 2.3 - 1.4 + (t - 19.2) * 0.25, 1.4, 2.6), v3(LX + 2.3, 1.3, -0.4)] },
  ];
  let cur = shots[0];
  function frame(t) {
    let sh = shots[0]; for (const s of shots) if (t >= s.t) sh = s; cur = sh;
    const land = !!sh.land;
    tunnel(t, !land); forest.visible = land; tunnelLight.visible = tunnelAmb.visible = !land;
    if (land) landPose(t); else flyPose(t);
    // 表情＋水鈴說話嘴型 / faces; Shuiling's mouth follows line 11
    const l11 = man.L11, tl11 = t - 7.7, blink = (o) => ((t + o) % 3.3) < 0.12;
    sl.setFace(tl11 >= 0 && tl11 < l11.dur ? { eyes: 'wide', mouth: mouthAt(l11, tl11), brows: tl11 > 2.4 ? 'worried' : '' } : land ? (t < 16.3 ? { eyes: 'wide', mouth: 'o' } : { eyes: 'happy', mouth: 'open' }) : { eyes: blink(1) ? 'blink' : 'happy', mouth: 'open' });
    ken.setFace(land ? (t < 16.3 ? { eyes: 'wide', mouth: 'o' } : { eyes: 'happy', mouth: 'grin' }) : t >= 10.2 && t < FLASH0 ? { eyes: 'worried', mouth: 'frown' } : { eyes: blink(0) ? 'blink' : 'happy', mouth: 'grin' });
    ken.root.updateMatrixWorld(true); sl.root.updateMatrixWorld(true);
    // 結霜：第 11 句後半慢慢出現 / frost gathers during "It's getting cold!"
    frost.visible = !land && t > 10.0; frost.material.opacity = seg(t, 10.0, 12.6) * 0.9; frost.position.set(0, 0.05, 0.25);
    // 雪人：唸到 snowman 轉過來、帽子跳一下 / the snowman turns and its hat hops at "snowman"
    snowman.root.rotation.y = lerp(-0.6, -0.15, ease.back(seg(t, 17.0, 17.5))); snowman.root.position.y = t > 17.4 && t < 17.8 ? Math.sin(seg(t, 17.4, 17.8) * Math.PI) * 0.1 : 0;
    // 雪塊噴起（慢動作）/ snow chunks (in slow motion)
    const ct = t >= BUMP ? (t - BUMP) * (t < BUMP + 1.6 ? 0.55 : 1) : -1;
    chunks.forEach((m, i) => { const vis = ct >= 0 && ct < 1.4; m.visible = vis && land; if (!vis) return; const a = i * 2.4, sp = 1.2 + (i % 5) * 0.4, cx = i % 2 ? LX - 0.7 : LX + 0.5; m.position.set(cx + Math.cos(a) * sp * ct, Math.max(0.07, sp * 2.2 * ct - 4.9 * ct * ct), (i % 2 ? 0.9 : 1.1) + Math.sin(a) * sp * ct); m.rotation.set(ct * 5, ct * 4, 0); });
    if (land) { fsnow.update(t); au.update(t + 5); }
    const [p, l] = sh.cam(t); camera.position.copy(p); camera.lookAt(l); camera.fov = sh === shots[4] ? 42 : 38; camera.updateProjectionMatrix();
    sky.dome.position.copy(camera.position);
    scene.fog = land ? (scene.fog?.isFogExp2 ? scene.fog : new THREE.FogExp2('#3b5a95', 0.03)) : new THREE.Fog('#120a2a', 18, 70);
    scene.updateMatrixWorld(true);
  }
  const tunnelMark = new THREE.Mesh(new THREE.BoxGeometry(7, 7, 1), new THREE.MeshBasicMaterial({ visible: false })); tunnelMark.position.set(0, 0, -8); scene.add(tunnelMark);
  const beatObjs = { 'tunnel': tunnelMark, 'a snowman': snowman.root };
  const faces = () => [ken, sl].map(r => r.head.getWorldPosition(v3()));
  function thermometer(g, x, y, a, level) {
    if (a <= 0) return; g.save(); g.globalAlpha = a; const P = 10;
    g.fillStyle = '#1f2a5a'; g.fillRect(x - P, y - P, P * 5, P * 20); g.fillStyle = '#f4f8ff'; g.fillRect(x, y, P * 3, P * 16);
    g.fillStyle = '#e23b3b'; const hh = Math.round(2 + level * 11) * P; g.fillRect(x + P, y + P * 15 - hh, P, hh); g.fillRect(x - P * 0.5, y + P * 15, P * 4, P * 3);
    g.font = 'bold 50px "Comic Relief"'; g.lineWidth = 10; g.strokeStyle = '#1f2a5a'; g.strokeText('cold!', x - 30, y + P * 22); g.fillStyle = '#9fd8ff'; g.fillText('cold!', x - 30, y + P * 22);
    g.restore();
  }
  function overlay(g, t, cam) {
    // long：箭頭沿隧道指到最遠處 / arrow down the tunnel to the vanishing point
    if (t >= 2.4 && t < 4.8) { const a = v3(0, 0, -2).project(cam), b = v3(0, 0, -60).project(cam); arrow2d(g, (a.x + 1) / 2 * W, (1 - a.y) / 2 * H, (b.x + 1) / 2 * W, (1 - b.y) / 2 * H, { a: seg(t, 2.5, 2.8) * (1 - seg(t, 4.5, 4.8)), label: 'long' }); }
    // hold on tight：兩隻手中間的握緊符號 / squeeze marks round the joined hands
    if (t >= 9.9 && t < 11.3) { const h = ken.handR.getWorldPosition(v3()).add(sl.handL.getWorldPosition(v3())).multiplyScalar(0.5).project(cam), x = (h.x + 1) / 2 * W, y = (1 - h.y) / 2 * H, k = seg(t, 10.0, 10.3) * (1 - seg(t, 11.0, 11.3)); arrow2d(g, x - 330, y, x - 120, y, { a: k }); arrow2d(g, x + 330, y, x + 120, y, { a: k, label: 'tight!' }); }
    // getting cold：溫度計下降 / thermometer dropping
    if (t >= 11.3 && t < FLASH0) thermometer(g, 1660, 160, seg(t, 11.4, 11.7) * (1 - seg(t, 12.9, 13.15)), 1 - seg(t, 11.5, 12.8));
    // 出隧道的白光 / white flash leaving the tunnel
    if (t >= FLASH0 && t < FLASH0 + 0.45) { g.save(); g.globalAlpha = Math.sin(seg(t, FLASH0, FLASH0 + 0.45) * Math.PI); g.fillStyle = '#f4f8ff'; g.fillRect(0, 0, W, H); g.restore(); }
    if (!cur.land) windLines(g, t, { a: 0.35, speed: t >= 4.8 && t < 7.4 ? 500 : 1400, dir: 1 });
  }
  const snowIcon = iconOf(renderer, makeSnowman().root, { yaw: 0.3, pitch: 0.1, dist: 2.2 });
  return { dur: tl.dur, frame, faces, overlay, beatObj: (l) => beatObjs[l] || null, cards: { 'a snowman': snowIcon } };
}
