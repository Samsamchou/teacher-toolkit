// 第 1 幕〈The Letter〉：二水國小冬天早晨 → 信飛來 → 信的特寫 → 兩人擔心
// Scene 1: winter morning at Ershui School, a letter from Santa flies in, close-up of the letter.
import * as THREE from 'three';
import { PX, part, pixTex, noisy, px, rng, blockType, instanced, PAINT } from '../engine/voxel.js';
import { makeKen, makeShuiling, makeSanta, pose, walk } from '../engine/chars.js';
import { nightSky, iconOf, ease, clamp01, squareSprite, W, H } from '../engine/kit.js';

const lerp = (a, b, k) => a + (b - a) * k;
const v3 = (a) => new THREE.Vector3(...a);
const seg = (t, a, b) => clamp01((t - a) / (b - a));

// ---------- 校園方塊 / campus blocks ----------
const CREAM = '#ece3cf';
const T = {
  wall: () => blockType({ all: (g) => { noisy(g, 16, 16, CREAM, 0.04, 201); px(g, 0, 15, '#cfc3a8', 16, 1); } }, { key: 'wall' }),
  win: () => blockType({ all: (g) => { noisy(g, 16, 16, CREAM, 0.04, 202); noisy(g, 12, 10, '#7fb2d9', 0.06, 203, 2, 3); px(g, 7, 3, '#d9d0bc', 2, 10); px(g, 2, 7, '#d9d0bc', 12, 1); px(g, 3, 4, '#d8efff', 2, 1); px(g, 3, 5, '#d8efff', 1, 1); } }, { key: 'win' }),
  roof: () => blockType({ all: (g) => { noisy(g, 16, 16, '#c4552f', 0.06, 204); for (let y = 3; y < 16; y += 4) px(g, 0, y, '#8f3a1f', 16, 1); for (let x = 0; x < 16; x += 4) px(g, x, 0, '#d96a42', 1, 16); } }, { key: 'roof' }),
  brick: () => blockType({ all: PAINT.brick }, { key: 'brick' }),
  grass: () => blockType({ top: (g) => { noisy(g, 16, 16, '#6fa54a', 0.1, 205); const r = rng(6); for (let i = 0; i < 14; i++) px(g, (r() * 16) | 0, (r() * 16) | 0, '#8cbf5f'); }, side: (g) => { noisy(g, 16, 16, '#7a5436', 0.1, 206); noisy(g, 16, 4, '#6fa54a', 0.1, 207); }, bottom: PAINT.dirt }, { key: 'grass' }),
  path: () => blockType({ top: (g) => { noisy(g, 16, 16, '#bdb7aa', 0.05, 208); px(g, 0, 7, '#9e998e', 16, 1); px(g, 7, 0, '#9e998e', 1, 7); px(g, 3, 8, '#9e998e', 1, 8); }, side: '#9e998e', bottom: '#9e998e' }, { key: 'path' }),
  track: () => blockType({ top: (g) => { noisy(g, 16, 16, '#b5523b', 0.05, 209); px(g, 0, 0, '#f2ede4', 16, 1); }, side: '#8f3f2d', bottom: '#8f3f2d' }, { key: 'track' }),
  leaf: () => blockType({ all: (g) => { noisy(g, 16, 16, '#3f8a3a', 0.16, 210); const r = rng(11); for (let i = 0; i < 16; i++) px(g, (r() * 16) | 0, (r() * 16) | 0, '#2c6a2c'); for (let i = 0; i < 8; i++) px(g, (r() * 16) | 0, (r() * 16) | 0, '#68b04f'); } }, { key: 'leafG' }),
  hill: () => blockType({ top: (g) => noisy(g, 16, 16, '#4f8a4a', 0.12, 211), side: (g) => noisy(g, 16, 16, '#3f7140', 0.12, 212), bottom: '#3f7140' }, { key: 'hill' }),
};

function buildCampus(scene) {
  const t = Object.fromEntries(Object.entries(T).map(([k, f]) => [k, f()]));
  const grass = [], path = [], track = [], wall = [], win = [], roof = [], brick = [], logs = [], leaf = [], hill = [];
  // 地面 / ground
  for (let x = -30; x < 30; x++) for (let z = -24; z < 24; z++) {
    if (Math.abs(x) <= 1 && z > -10 && z < 20) path.push([x, -1, z]);
    else if (z >= 4 && z <= 5 && Math.abs(x) > 1 && Math.abs(x) < 26) path.push([x, -1, z]);
    else if (z >= 8 && z <= 9 && Math.abs(x) > 3) track.push([x, -1, z]);
    else grass.push([x, -1, z]);
  }
  // 兩層樓校舍＋中央塔 / two-storey building with a central tower (z = -14..-11)
  for (let x = -14; x <= 14; x++) for (let z = -14; z <= -11; z++) for (let y = 0; y < 8; y++) {
    const shell = z === -11 || z === -14 || Math.abs(x) === 14; if (!shell) continue;
    if (y === 0) { brick.push([x, y, z]); continue; }
    const isWin = z === -11 && (y === 2 || y === 5) && Math.abs(x) % 3 !== 0 && Math.abs(x) > 3;
    (isWin ? win : wall).push([x, y, z]);
  }
  for (let x = -15; x <= 15; x++) for (let z = -15; z <= -10; z++) roof.push([x, 8, z]);
  for (let x = -14; x <= 14; x++) roof.push([x, 8, -9.6 + 0.0]);
  // 塔 / tower
  for (let x = -2; x <= 2; x++) for (let z = -12; z <= -10; z++) for (let y = 0; y < 12; y++) {
    if (!(z === -10 || Math.abs(x) === 2 || z === -12)) continue;
    if (y === 0) brick.push([x, y, z]); else if (z === -10 && Math.abs(x) <= 1 && y < 3) continue; else wall.push([x, y, z]);
  }
  for (let x = -3; x <= 3; x++) for (let z = -13; z <= -9; z++) roof.push([x, 12, z]);
  for (let x = -2; x <= 2; x++) for (let z = -12; z <= -10; z++) roof.push([x, 13, z]);
  // 花圃磚牆 / low brick planters
  for (const sx of [-1, 1]) for (let x = 3; x <= 12; x++) brick.push([sx * x, 0, -8]);
  // 樹 / round trees
  const tree = (cx, cz, h = 4, r = 2.4) => {
    for (let y = 0; y < h; y++) logs.push([cx, y, cz]);
    for (let x = -3; x <= 3; x++) for (let y = -3; y <= 3; y++) for (let z = -3; z <= 3; z++) if (x * x + y * y * 1.4 + z * z <= r * r) leaf.push([cx + x, h + 1 + y, cz + z]);
  };
  tree(-9, 0); tree(9, 1, 5, 2.8); tree(-20, -6, 5, 3); tree(19, -5); tree(-14, 12, 4, 2.2); tree(15, 13, 5, 2.6); tree(-24, 4, 5, 2.8); tree(24, 6, 4, 2.4);
  // 遠山（八卦山意象）/ distant hills
  for (let x = -120; x < 120; x += 4) for (let z = -100; z < -64; z += 4) {
    const hh = Math.max(0, Math.round((Math.sin(x * 0.03) * 3 + Math.cos(x * 0.071 + 1) * 2 + 6 - Math.abs(z + 82) * 0.35)));
    for (let y = 0; y <= hh; y += 1) hill.push([x, y * 4, z, 4]);
  }
  const add = (type, cells) => cells.length && scene.add(instanced(type, cells));
  add(t.grass, grass); add(t.path, path); add(t.track, track); add(t.wall, wall); add(t.win, win); add(t.roof, roof); add(t.brick, brick);
  add(blockType({ side: PAINT.log, top: PAINT.logTop, bottom: PAINT.logTop }, { key: 'log' }), logs); add(t.leaf, leaf); add(t.hill, hill);
  // 校名牌＋時鐘 / school sign and clock on the tower
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.9), new THREE.MeshStandardMaterial({ map: pixTex(368, 72, (g) => {
    g.imageSmoothingEnabled = false; noisy(g, 368, 72, '#2f5d3a', 0.05, 220); g.strokeStyle = '#e8c35a'; g.lineWidth = 6; g.strokeRect(3, 3, 362, 66);
    let fs = 46; g.font = `bold ${fs}px "Comic Relief"`; while (g.measureText('ERSHUI SCHOOL').width > 330) { fs -= 1; g.font = `bold ${fs}px "Comic Relief"`; } g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fffbe9'; g.fillText('ERSHUI SCHOOL', 184, 38);
  }, 'sign'), roughness: 0.8 }));
  sign.position.set(0.5, 9.62, -8.98); scene.add(sign);
  const clock = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshStandardMaterial({ map: pixTex(16, 16, (g) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 7.6) px(g, x, y, d > 6.3 ? '#3a3a40' : '#fbf8ee'); }
    px(g, 7, 3, '#222', 1, 5); px(g, 8, 7, '#222', 3, 1); [[7, 1], [14, 7], [7, 14], [1, 7]].forEach(([x, y]) => px(g, x, y, '#c4552f'));
  }, 'clock'), transparent: true, alphaTest: 0.5 }));
  clock.position.set(0.5, 11.05, -8.98); clock.scale.setScalar(0.82); scene.add(clock);
}

// ---------- 信 / the letter ----------
function makeEnvelope() {
  const g = new THREE.Group();
  const env = part(9, 6, 1, { front: (gg) => { noisy(gg, 9, 6, '#fbf4e2', 0.03, 230); for (let i = 0; i < 4; i++) { px(gg, i, i, '#d9cfb8'); px(gg, 8 - i, i, '#d9cfb8'); } px(gg, 4, 3, '#c4282c', 1, 1); px(gg, 3, 3, '#c4282c'); px(gg, 5, 3, '#c4282c'); }, all: '#f3ead4' }, { key: 'envelope' });
  g.add(env); return g;
}
function makeOpenLetter() {
  const tex = pixTex(640, 470, (g) => {
    noisy(g, 640, 470, '#fbf4e2', 0.02, 231);
    g.fillStyle = '#d9cfb8'; for (let y = 140; y < 400; y += 62) g.fillRect(40, y + 30, 560, 3);
    g.strokeStyle = '#c4282c'; g.lineWidth = 12; g.strokeRect(10, 10, 620, 450);
    g.font = 'bold 72px "Comic Relief"'; g.fillStyle = '#c4282c'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText('Help!', 46, 112);
    g.font = 'bold 50px "Comic Relief"'; g.fillStyle = '#2a2440';
    ['A big snowstorm blew', 'my Christmas things', 'away!'].forEach((s, i) => g.fillText(s, 46, 196 + i * 62));
    g.font = 'bold 46px "Comic Relief"'; g.fillStyle = '#1f4fa0'; g.textAlign = 'right'; g.fillText('— Santa', 596, 430);
    // 小小紅帽子印記 / tiny red hat stamp
    const P = 6; [[0, 3, 5], [1, 2, 4], [2, 1, 3], [3, 0, 1]].forEach(([r, x0, n]) => { g.fillStyle = '#c4282c'; g.fillRect(70 + x0 * P, 370 + r * P, n * P, P); });
    g.fillStyle = '#ffffff'; g.fillRect(64, 394, 7 * P, P); g.fillRect(70 + 3 * P, 364, P, P);
  }, 'openletter');
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.72), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.45 }));
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.72), new THREE.MeshStandardMaterial({ map: pixTex(64, 47, (gg) => { noisy(gg, 64, 47, '#f3ead4', 0.03, 232); px(gg, 0, 0, '#c4282c', 64, 1); px(gg, 0, 46, '#c4282c', 64, 1); px(gg, 0, 0, '#c4282c', 1, 47); px(gg, 63, 0, '#c4282c', 1, 47); }, 'letterback'), roughness: 0.9 }));
  back.rotation.y = Math.PI; m.castShadow = true; g.add(m, back); return g;
}

export async function setup({ S, tl, man }) {
  const { scene, camera, renderer } = S;
  scene.fog = new THREE.Fog('#d3deeb', 34, 120);
  nightSky(scene, { top: '#6fa6e0', mid: '#b4d3f0', bottom: '#f7d8b6', stars: 0 });
  scene.add(new THREE.HemisphereLight('#d6e6ff', '#8a7a60', 1.05));
  const sun = new THREE.DirectionalLight('#ffd6a0', 2.5); sun.position.set(26, 16, 22); sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 22, bottom: -22, near: 1, far: 120 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02; scene.add(sun);
  const fill = new THREE.DirectionalLight('#bcd4ff', 0.5); fill.position.set(-10, 6, 14); scene.add(fill);
  buildCampus(scene);

  const ken = makeKen(), sl = makeShuiling(); scene.add(ken.root, sl.root);
  const env = makeEnvelope(); scene.add(env);
  const letter = makeOpenLetter(); letter.visible = false; scene.add(letter);

  // 呼氣白煙池 / breath puff pool
  const puffMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, roughness: 1 });
  const puffs = Array.from({ length: 24 }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), puffMat.clone()); scene.add(m); return m; });
  // 金色閃光尾巴 / golden sparkle trail
  const spk = Array.from({ length: 30 }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: '#ffd76a', emissive: '#ffc23a', emissiveIntensity: 3, transparent: true })); scene.add(m); return m; });

  // 角色位置是時間的函數（呼氣白煙要用過去的位置）/ positions as functions of time
  // 兩人並肩沿走道朝鏡頭走來 / side by side, walking down the path toward camera
  const walkZ = (t) => -7 + 9 * ease.out(seg(t, 1.6, 8.0));
  const kenPos = (t) => [-0.55, 0, walkZ(t)];
  const slPos = (t) => [0.6, 0, walkZ(t) + 0.1];
  const kenRot = (t) => 0;
  const slRot = (t) => t < 8 ? 0 : t < 13.2 ? -0.25 * ease.io(seg(t, 9.9, 10.4)) : t < 17.6 ? -0.5 : -0.35;
  const mouthAt = (pos, rot) => v3(pos).add(new THREE.Vector3(Math.sin(rot) * 0.42, 1.36, Math.cos(rot) * 0.42));

  // 信的飛行路徑（三次貝茲）/ letter flight path
  const L0 = v3([6, 6.5, -3]), L1 = v3([3, 5, 1]), L2 = v3([0.6, 3, 3.2]);
  const CATCH = 9.85;
  const bez = (k, end) => { const a = L0.clone().lerp(L1, k), b = L1.clone().lerp(L2, k), c = L2.clone().lerp(end, k); return a.lerp(b, k).lerp(b.clone().lerp(c, k), k); };

  const handMid = () => { const a = new THREE.Vector3(), b = new THREE.Vector3(); ken.handL.getWorldPosition(a); ken.handR.getWorldPosition(b); return a.add(b).multiplyScalar(0.5); };
  const handR = () => { const a = new THREE.Vector3(); ken.handR.getWorldPosition(a); return a; };

  const shots = [
    { t: 0, cam: (t) => { const k = ease.io(seg(t, 0, 5.6)); return [v3([3, 13, 26]).lerp(v3([0.6, 2.2, 8.0]), k), v3([0, 5.5, -8]).lerp(v3([0, 1.35, -2]), k)]; } },
    /* 第 1 句第 2 鏡：Ken 發抖呼白煙的近景，鏡頭跟著倒退 / L01 shot 2: tracking close-up of Ken shivering */
    { t: 5.6, cam: (t) => { const k = kenPos(t); return [v3([k[0] + 0.7, 1.45, k[2] + 2.9]), v3([k[0] + 0.3, 1.2, k[2]])]; } },
    { t: 8.0, cam: (t) => [v3([0.35 - (t - 8) * 0.02, 1.55, 6.6 - (t - 8) * 0.08]), v3([0.05, 1.3, 2])] },
    /* 第 2 句第 2 鏡：信封紅蠟封特寫＋兩人表情 / L02 shot 2: envelope close-up with faces */
    { t: 10.7, cam: (t) => { const m = handMid(); return [m.clone().add(new THREE.Vector3(0.5 - (t - 10.7) * 0.03, 0.35, 2.0 - (t - 10.7) * 0.06)), m.clone().add(new THREE.Vector3(0.3, 0.25, 0))]; } },
    { t: 13.2, pov: true, cam: (t) => { const m = handMid(); return [v3([-0.55, 1.62 - (t - 13.2) * 0.004, 1.72 + (t - 13.2) * 0.012]), m.clone().add(new THREE.Vector3(0, 0.36, 0.1))]; } },
    { t: 17.6, cam: (t) => [v3([0.05, 1.45, 5.3 - (t - 17.6) * 0.08]), v3([0.05, 1.3, 2])] },
  ];

  function frame(t) {
    // ---- Ken ----
    const kp = kenPos(t); ken.root.position.set(...kp); ken.root.rotation.y = kenRot(t);
    const sp = slPos(t); sl.root.position.set(...sp); sl.root.rotation.y = slRot(t);
    const walking = t > 1.6 && t < 8.0, ph = (t - 1.6) * 1.15;
    if (walking) {
      const amt = 1 - seg(t, 7.0, 8.0) * 0.9;
      walk(ken, ph, amt * 0.8); walk(sl, ph + 0.5, amt * 0.8);
      // 冷：Ken 雙手抱胸、縮脖子 / Ken hugs himself against the cold
      ken.armL.rotation.set(-1.1, 0, 0.55); ken.armR.rotation.set(-1.1, 0, -0.55); ken.neck.rotation.z = Math.sin(t * 40) * 0.015;
    } else if (t <= 1.6) {
      pose(ken, { armLx: -63, armLz: 31, armRx: -63, armRz: -31, headZ: Math.sin(t * 40) * 0.9 }); pose(sl, { armLz: -6, armRz: 6 });
    } else if (t < 13.2) {
      // 信飛來：抬頭看→伸手→接住 / look up, reach, catch
      const look = seg(t, 8.9, 9.3), reach = seg(t, 9.3, CATCH), hold = seg(t, CATCH, CATCH + 0.6);
      const rx = t < CATCH ? lerp(-10, -150, ease.out(reach)) : lerp(-150, -72, ease.back(hold));
      pose(ken, { armLx: lerp(-10, -72, hold), armLz: lerp(-4, 14, hold), armRx: rx, armRz: lerp(4, -14, hold), headX: lerp(0, -22, look) - hold * -18, headY: lerp(0, 18, look) * (1 - hold), bob: t > CATCH && t < CATCH + 0.4 ? -0.6 : 0 });
      pose(sl, { armLx: lerp(0, -40, seg(t, 9.9, 10.3)), armRx: lerp(0, -40, seg(t, 9.9, 10.3)), armLz: lerp(-4, -60, seg(t, 9.9, 10.3)), armRz: lerp(4, 60, seg(t, 9.9, 10.3)), headX: lerp(0, -20, look) * (1 - seg(t, 10, 10.6)), headY: lerp(0, -12, seg(t, 10, 10.6)), bob: t > 10.6 && t < 12 ? Math.abs(Math.sin((t - 10.6) * 7)) * 1.2 : 0 });
    } else {
      const low = t >= 17.6;
      pose(ken, { armLx: low ? -34 : -68, armLz: 16, armRx: low ? -34 : -68, armRz: -16, headX: low ? 4 : 20, headY: low ? 16 * ease.io(seg(t, 18.4, 18.9)) : 0 });
      pose(sl, { armLz: -8, armRz: 8, armLx: low ? -25 : -10, headX: low ? 0 : 16, headY: low ? -10 : -8, headZ: low ? -6 : -4 });
    }
    // 眨眼＋表情 / blinks and expressions
    const blink = (o) => ((t + o) % 3.7) < 0.12;
    let kf = { eyes: 'open', mouth: 'flat', brows: '' }, sf = { eyes: 'open', mouth: 'smile' };
    if (t < 8) { kf = { eyes: blink(0) ? 'blink' : 'open', mouth: 'frown', brows: 'worried' }; sf = { eyes: blink(1.3) ? 'blink' : 'happy', mouth: 'smile' }; }
    else if (t < CATCH) { kf = { eyes: blink(0) ? 'blink' : 'open', mouth: t > 9.0 ? 'o' : 'smile' }; sf = { eyes: t > 9.0 ? 'wide' : 'open', mouth: t > 9.0 ? 'o' : 'smile' }; }
    else if (t < 13.2) { kf = { eyes: 'wide', mouth: t < 11 ? 'open' : 'grin' }; sf = { eyes: t < 10.6 ? 'wide' : 'happy', mouth: 'open' }; }
    else if (t < 17.6) { kf = { eyes: 'open', mouth: 'o' }; sf = { eyes: 'open', mouth: 'o' }; }
    else { kf = { eyes: 'worried', mouth: 'frown' }; sf = { eyes: blink(0.2) ? 'blink' : 'worried', mouth: 'frown' }; }
    ken.setFace(kf); sl.setFace(sf);
    ken.root.updateMatrixWorld(true); sl.root.updateMatrixWorld(true);

    // ---- 信 / letter ----
    env.visible = t >= 8.9 && t < 13.2; letter.visible = t >= 13.2;
    if (t >= 8.9 && t < CATCH) { const k = ease.io(seg(t, 8.9, CATCH)); env.position.copy(bez(k, handR().add(new THREE.Vector3(0, 0.05, 0.05)))); env.rotation.set(Math.sin(t * 9) * 0.6, t * 5, Math.cos(t * 7) * 0.4); }
    else if (t >= CATCH && t < 13.2) { env.position.copy(t < CATCH + 0.6 ? handR().add(new THREE.Vector3(0, 0.05, 0.05)).lerp(handMid().add(new THREE.Vector3(0, 0.12, 0.08)), ease.io(seg(t, CATCH, CATCH + 0.6))) : handMid().add(new THREE.Vector3(0, 0.12, 0.08))); env.rotation.set(-0.25, ken.root.rotation.y, 0); }
    if (letter.visible) { const low = t >= 17.6; letter.position.copy(handMid().add(new THREE.Vector3(0, low ? 0.12 : 0.36, low ? 0.14 : 0.1))); letter.rotation.set(low ? 0.9 : -0.12, Math.PI, 0); }
    spk.forEach((m, i) => { const age = (i / spk.length) * 0.7; const tt = t - age; m.visible = t >= 8.9 && tt >= 8.9 && tt < CATCH + 0.3; if (!m.visible) return; const k = ease.io(seg(tt, 8.9, CATCH)); m.position.copy(bez(k, handR())).add(new THREE.Vector3(Math.sin(i * 7.1) * 0.15, -age * 0.6, Math.cos(i * 3.3) * 0.15)); m.material.opacity = 1 - age / 0.7; m.scale.setScalar(1 - age); });

    // ---- 呼氣 / breath puffs (only outdoors-cold opening) ----
    puffs.forEach((m, i) => {
      const who = i % 2, n = (i / 2) | 0, period = 1.7, ts = n * period + who * 0.8 + 0.3, age = t - ts;
      m.visible = age >= 0 && age < 1.3 && ts < 9;
      if (!m.visible) return;
      const pos = who ? slPos(ts) : kenPos(ts), rot = who ? slRot(ts) : kenRot(ts);
      const p = mouthAt(pos, rot).add(new THREE.Vector3(Math.sin(rot) * age * 0.35, age * 0.25, Math.cos(rot) * age * 0.35));
      m.position.copy(p); m.scale.setScalar(1 + age * 2.2); m.material.opacity = 0.55 * (1 - age / 1.3); m.rotation.set(age, age * 1.3, 0);
    });

    // ---- 鏡頭 / camera ----
    let sh = shots[0]; for (const s of shots) if (t >= s.t) sh = s;
    ken.neck.visible = !sh.pov;  /* 第一人稱鏡頭藏起 Ken 的頭 / hide Ken's head for the POV shot */
    const [p, l] = sh.cam(t); camera.position.copy(p); camera.lookAt(l);
    camera.fov = sh.pov ? 48 : 36; camera.updateProjectionMatrix();
  }

  // 單字卡圖示：Santa 模型 / word-card icon
  const santaIcon = iconOf(renderer, makeSanta().root, { yaw: 0.35, pitch: 0.12, dist: 2.1 });
  return {
    dur: tl.dur, frame,
    cards: { Santa: santaIcon },
    title: (g, t) => {
      const a = clamp01(seg(t, 0.2, 0.8)) * (1 - seg(t, 2.6, 3.2)); if (a <= 0) return;
      g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'bold 112px "Comic Relief"'; g.lineJoin = 'round'; g.lineWidth = 18; g.strokeStyle = '#1f2a5a'; g.strokeText('Ken and Shuiling', W / 2, 330); g.strokeText('Save Christmas', W / 2, 460);
      g.fillStyle = '#ffffff'; g.fillText('Ken and Shuiling', W / 2, 330); g.fillStyle = '#ffd23f'; g.fillText('Save Christmas', W / 2, 460);
      g.restore();
    },
  };
}
