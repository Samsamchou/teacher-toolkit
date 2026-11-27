// 第 1 幕〈The Letter〉：二水國小冬天早晨 → 信飛來 → 信的特寫 → 兩人擔心
// Scene 1: winter morning at Ershui School, a letter from Santa flies in, close-up of the letter.
import * as THREE from 'three';
import { PX, part, pixTex, noisy, px, rng, blockType, instanced, PAINT } from '../engine/voxel.js';
import { makeKen, makeShuiling, makeSanta, pose, walk } from '../engine/chars.js';
import { terrain, pine, stocking, gift, desk } from '../engine/props.js';
import { nightSky, iconOf, ease, clamp01, squareSprite, snow, arrow2d, windLines, W, H } from '../engine/kit.js';

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

export function buildCampus(scene) {
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
  return sign;
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
  const sky = nightSky(scene, { top: '#6fa6e0', mid: '#b4d3f0', bottom: '#f7d8b6', stars: 0 });
  scene.add(new THREE.HemisphereLight('#d6e6ff', '#8a7a60', 1.05));
  const sun = new THREE.DirectionalLight('#ffd6a0', 2.5); sun.position.set(26, 16, 22); sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 22, bottom: -22, near: 1, far: 120 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02; scene.add(sun, sun.target);
  const sunRig = (x) => { sun.position.set(26 + x, 16, 22); sun.target.position.set(x, 0, 0); };
  const fill = new THREE.DirectionalLight('#bcd4ff', 0.5); fill.position.set(-10, 6, 14); scene.add(fill);
  const signMesh = buildCampus(scene);

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

  function campus(t) {
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

  }

  // ================= 北極院子（第 3 句插入畫面）/ North Pole yard for line 3 =================
  const NX = 200;
  terrain(scene, { size: 48, flat: 9, cx: NX, cz: 0, seed: 9 });
  [[-9, -9, 11], [8, -11, 13], [-14, -2, 9], [14, -4, 10], [-5, -16, 14], [4, -18, 12]].forEach(([x, z, h]) => pine(scene, NX + x, z, { h }));
  // 紅色小工坊 / little red workshop
  const shop = new THREE.Group(); shop.position.set(NX - 5.5, 0, -6.5); scene.add(shop);
  const redW = blockType({ all: (g) => { noisy(g, 16, 16, '#b8322e', 0.06, 501); for (let y = 3; y < 16; y += 4) px(g, 0, y, '#8a2422', 16, 1); } }, { key: 'redwall' });
  const snowR = blockType({ all: (g) => noisy(g, 16, 16, '#eef4ff', 0.04, 502) }, { key: 'snowroof' });
  const wc = [], rc = [];
  for (let x = 0; x < 6; x++) for (let z = 0; z < 4; z++) for (let y = 0; y < 4; y++) if (x === 0 || x === 5 || z === 0 || z === 3) if (!(z === 3 && (x === 2 || x === 3) && y < 2)) wc.push([x, y, z]);
  for (let x = -1; x < 7; x++) for (let z = -1; z < 5; z++) rc.push([x, 4, z]);
  for (let x = 0; x < 6; x++) for (let z = 0; z < 4; z++) rc.push([x, 5, z]);
  shop.add(instanced(redW, wc), instanced(snowR, rc));
  const santaNP = makeSanta(); santaNP.root.position.set(NX - 0.6, 0, 0.4); scene.add(santaNP.root);
  const table = desk(); table.position.set(NX + 1.6, 0, -0.4); scene.add(table);
  // 聖誕物品：彩球、星星、聖誕襪、禮物、彩燈 / the Christmas things
  const things = [];
  const ballCols = ['#e23b3b', '#3b8de2', '#e2c03b', '#9b4de2', '#3bc26a'];
  ballCols.forEach((c, i) => { const b = part(4, 4, 4, { all: c }, { key: 'ball' + c, emissive: new THREE.Color(c), ei: 0.15, rough: 0.35 }); things.push({ o: b, rest: v3([NX + 1.15 + i * 0.2, 0.93, -0.55 + (i % 2) * 0.18]) }); });
  for (let i = 0; i < 2; i++) { const st = part(5, 5, 2, { all: '#ffd84a' }, { key: 'npstar', emissive: new THREE.Color('#ffc23a'), ei: 0.6 }); things.push({ o: st, rest: v3([NX + 1.3 + i * 0.6, 0.98, -0.15]) }); }
  for (let i = 0; i < 2; i++) { const sk = stocking(i ? '#2f8a46' : '#d22f2f'); sk.scale.setScalar(0.7); things.push({ o: sk, rest: v3([NX + 2.6 + i * 0.35, 0.6, 0.15]) }); }
  [['#2f7fd2', 7], ['#d23a3a', 6], ['#7b4bd6', 5]].forEach(([c, s2], i) => { const gf = gift(s2, c, '#f2d04a', 40 + i); things.push({ o: gf, rest: v3([NX + 2.4 + i * 0.45, 0, 0.9 + (i % 2) * 0.3]) }); });
  for (let i = 0; i < 5; i++) { const c = new THREE.Color(ballCols[i]); const bl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.5 })); things.push({ o: bl, rest: v3([NX + 0.9 + i * 0.25, 1.0 + Math.sin(i) * 0.05, -0.75]) }); }
  things.forEach((th, i) => { th.o.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(th.o); th.seed = i * 1.7; th.s0 = th.o.scale.x; });
  // 暴風雪漩渦（方形雪粒）/ the big snowstorm vortex
  const VN = 5200, vpos = new Float32Array(VN * 3), vgeo = new THREE.BufferGeometry(); vgeo.setAttribute('position', new THREE.BufferAttribute(vpos, 3));
  const vortex = new THREE.Points(vgeo, new THREE.PointsMaterial({ color: '#e8f1ff', size: 0.26, map: squareSprite(), transparent: true, opacity: 0.9, depthWrite: false }));
  vortex.frustumCulled = false; scene.add(vortex);
  const vr = []; { const r = rng(55); for (let i = 0; i < VN; i++) vr.push([r(), r(), r()]); }
  const vortexBox = new THREE.Mesh(new THREE.BoxGeometry(5, 8, 5), new THREE.MeshBasicMaterial({ visible: false })); scene.add(vortexBox);
  const npSnow = snow(scene, { count: 1600, box: [34, 16, 26], center: [NX, 0, 0], wind: 6, speed: 2.2, size: 0.07 });
  const V_START = 20.5, BLEW = 21.95, GLOW0 = 22.4, AWAY = 23.45, LIFT = 23.3;
  const vCenter = (t) => v3([NX + 13, 0, -9]).lerp(v3([NX + 4.2, 0, -2.4]), ease.io(seg(t, V_START - 0.8, LIFT)));
  function storm(t, on) {
    vortex.visible = on; npSnow.points.visible = on; if (!on) return;
    const c = vCenter(t);
    for (let i = 0; i < VN; i++) { const [a, b, d] = vr[i]; const y = b * 9, R = 0.6 + y * 0.55 + d * 0.8, ang = a * 6.283 + t * (5.5 / (0.6 + R)); vpos[i * 3] = c.x + Math.cos(ang) * R; vpos[i * 3 + 1] = y; vpos[i * 3 + 2] = c.z + Math.sin(ang) * R; }
    vgeo.attributes.position.needsUpdate = true; vortexBox.position.set(c.x, 4.0, c.z);
    npSnow.update(t);
  }
  // 物品飛走路徑：抬起→繞漩渦→飛出畫面 / lift, spiral round the vortex, fly off
  function thingPos(th, t) {
    const lt = t - LIFT - th.seed * 0.06;
    /* 唸到 blew：東西在原地被風吹得抖動 / at 'blew' the things rattle in place */
    if (lt < 0) { const w = seg(t, BLEW, BLEW + 0.3); return [th.rest.clone().add(v3([Math.sin(t * 31 + th.seed) * 0.03 * w, Math.abs(Math.sin(t * 23 + th.seed)) * 0.05 * w, 0])), -w * 0.02]; }
    const c = vCenter(t), k = Math.min(1, lt / 2.6), ang = th.seed + lt * 3.2, R = 2.2 * (1 - k * 0.5);
    const p = v3([c.x + Math.cos(ang) * R, th.rest.y + lt * 1.6 + k * k * 4, c.z + Math.sin(ang) * R]);
    const pre = Math.min(1, lt / 0.5);
    return [th.rest.clone().lerp(p, pre).add(v3([k > 0.8 ? (k - 0.8) * 30 : 0, 0, k > 0.8 ? -(k - 0.8) * 20 : 0])), lt];
  }
  function northPole(t, on) {
    santaNP.root.visible = on; table.visible = on; shop.visible = on; things.forEach(th => th.o.visible = on);
    storm(t, on); if (!on) return;
    // Santa：揮手喊救命→被風吹→伸手抓 / waves for help, then reaches for his things
    const help = t < 20.5, reach = seg(t, AWAY - 0.3, AWAY + 0.4);
    pose(santaNP, help ? { armLz: -150 + Math.sin(t * 9) * 18, armRz: 150 - Math.sin(t * 9) * 18, headZ: Math.sin(t * 5) * 6 } : { armRx: lerp(-20, -110, reach), armRz: lerp(30, 10, reach), armLz: -40, bodyX: lerp(-8, 6, reach), headY: 25 });
    santaNP.root.rotation.y = help ? 0 : 0.7;
    santaNP.setFace({ eyes: help ? 'wide' : 'worried' });
    const slow = t >= 25.3 ? 23.45 + (t - 25.3) * 0.4 : t;   /* 慢動作 0.4 倍 / 0.4x slow motion */
    things.forEach((th, i) => {
      const [p, lt] = thingPos(th, slow); th.o.position.copy(p); th.o.rotation.set(lt * 3 + i, lt * 4, lt * 2);
      const glow = seg(t, GLOW0 + i * 0.07, GLOW0 + i * 0.07 + 0.15) * (1 - seg(t, AWAY, AWAY + 0.4));
      th.o.scale.setScalar(th.s0 * (1 + glow * 0.35));
    });
  }
  const miniSanta = makeSanta(); scene.add(miniSanta.root);

  // ================= 新時間軸（慢動作空檔）/ new timeline with slow-motion beats =================
  // 角色動畫時間 ta＝新時間扣掉插入的慢動作 / map film time to the original acting time
  const TA = (t) => t < 7.9 ? t : t < 10.5 ? 7.9 : t < 15.8 ? t - 2.6 : t < 18.6 ? 13.15 : t < 19.3 ? 13.2 + (t - 18.6) : t < 28.1 ? 13.9 : 17.6 + (t - 28.1);
  const old = (i) => shots[i].cam;
  const NEW = [
    { t: 0, cam: (t) => old(0)(t) },
    { t: 5.6, cam: (t) => old(1)(TA(t)) },
    { t: 7.9, cam: (t) => { const k = ease.io(seg(t, 7.9, 10.5)); return [v3([1.8, 5.2, 7]).lerp(v3([0.6, 9.4, -3.3]), k), v3([0.5, 9.0, -9])]; } },
    { t: 10.5, cam: (t) => old(2)(TA(t)) },
    { t: 13.3, cam: (t) => old(3)(TA(t)) },
    { t: 15.8, cam: (t) => { const m = handMid(), a = (t - 15.8) * 0.35; return [m.clone().add(v3([Math.sin(a) * 1.45, 0.42, Math.cos(a) * 1.45])), m.clone().add(v3([0, t > 17.2 ? 0.3 : 0.14, 0]))]; } },
    { t: 18.6, pov: true, cam: (t) => old(4)(TA(t)) },
    { t: 19.3, np: true, cam: (t) => [v3([NX - 0.6 + (t - 19.3) * 0.05, 1.55, 3.4 - (t - 19.3) * 0.12]), v3([NX - 0.6, 1.45, 0.4])] },
    { t: 20.5, np: true, cam: (t) => [v3([NX + 0.8 - (t - 20.5) * 0.12, 3.6, 11.5]), v3([NX + 2.6, 2.9, -1.6])] },
    { t: 25.3, np: true, cam: (t) => { const c = vCenter(25.3); return [v3([c.x - 2.4 + (t - 25.3) * 0.3, 2.6, c.z + 6.2]), v3([c.x, 3.0, c.z])]; } },
    { t: 28.1, cam: (t) => old(5)(TA(t)) },
  ];
  let curShot = NEW[0];
  function frame(t) {
    let sh = NEW[0]; for (const s of NEW) if (t >= s.t) sh = s; curShot = sh;
    campus(TA(t));
    // 慢動作：信封慢慢轉、小 Santa 從蠟封冒出來 / slow spin of the envelope, a tiny Santa pops out of the seal
    if (t >= 15.8 && t < 18.6) { env.visible = true; letter.visible = false; env.position.copy(handMid().add(v3([0, 0.14, 0.1]))); env.rotation.set(-0.2, Math.sin((t - 15.8) * 0.9) * 0.5, 0); }
    miniSanta.root.visible = t >= 17.1 && t < 18.6;
    if (miniSanta.root.visible) { const k = ease.back(seg(t, 17.1, 17.6)); miniSanta.root.position.copy(env.position).add(v3([0, 0.06 + 0.08 * k, 0.05])); miniSanta.root.scale.setScalar(0.13 * Math.max(0.01, k)); miniSanta.root.rotation.y = Math.sin(t * 2) * 0.3; pose(miniSanta, { armLz: -120, armRz: 120 }); miniSanta.setFace({ eyes: 'happy' }); }
    const np = !!sh.np;
    ken.root.visible = sl.root.visible = !np;
    northPole(t, np);
    sunRig(np ? NX : 0);   /* 太陽跟著目前的場地走（陰影範圍）/ keep the shadow camera on the active set */
    scene.fog.color.set(np ? '#e6eef8' : '#d3deeb'); scene.fog.near = np ? 6 : 34; scene.fog.far = np ? 48 : 120;
    ken.neck.visible = !sh.pov;
    const [p, l] = sh.cam(t); camera.position.copy(p); camera.lookAt(l);
    camera.fov = sh.pov ? 48 : 36; camera.updateProjectionMatrix();
    sky.dome.position.copy(camera.position);
    scene.updateMatrixWorld(true);
  }
  function beatObj(label) {
    if (label === 'Ershui School') return signMesh;
    if (label === 'a letter') return env;
    if (label === 'Santa') return miniSanta.root;
    if (label === 'a big snowstorm') return vortexBox;
    return null;
  }
  /* 單字卡也要避開的重點物件 / key props the word card must not cover */
  function avoidObjs(t) { return t >= 10.5 && t < 18.6 ? [env] : []; }
  function faces() {
    const out = [];
    for (const r of [ken, sl, santaNP]) if (r.root.visible && r.neck.visible) out.push(r.head.getWorldPosition(v3([0, 0, 0])));
    return out;
  }
  // 2D 小圖示：冷（溫度計）、聖誕物品箭頭、飛走箭頭、風線、進信的白光 / small 2D icons
  function thermometer(g, x, y, a, level) {
    if (a <= 0) return; g.save(); g.globalAlpha = a; const P = 10;
    g.fillStyle = '#1f2a5a'; g.fillRect(x - P, y - P, P * 5, P * 20); g.fillStyle = '#f4f8ff'; g.fillRect(x, y, P * 3, P * 16);
    g.fillStyle = '#e23b3b'; const hh = Math.round(4 + level * 9) * P; g.fillRect(x + P, y + P * 15 - hh, P, hh); g.fillRect(x - P * 0.5, y + P * 15, P * 4, P * 3);
    g.font = 'bold 50px "Comic Relief"'; g.lineWidth = 10; g.strokeStyle = '#1f2a5a'; g.strokeText('cold!', x - 30, y + P * 22); g.fillStyle = '#9fd8ff'; g.fillText('cold!', x - 30, y + P * 22);
    g.restore();
  }
  function overlay(g, t, cam) {
    /* 溫度計放在離臉最遠的那一邊 / thermometer on the side farthest from any face */
    if (t >= 5.6 && t < 7.9) { const fx = faces().map(p => (p.clone().project(cam).x + 1) / 2 * W); const side = fx.length && Math.min(...fx) < 520 && Math.max(...fx) > 1400 ? 'mid' : (fx.some(x => x > 1300) ? 'left' : 'right'); thermometer(g, side === 'right' ? 1640 : side === 'left' ? 90 : 900, side === 'mid' ? 40 : 200, seg(t, 5.8, 6.2) * (1 - seg(t, 7.6, 7.9)), 1 - seg(t, 5.9, 7.0)); }
    if (t >= 19.15 && t < 19.5) { g.save(); g.globalAlpha = Math.sin(seg(t, 19.15, 19.5) * Math.PI); g.fillStyle = '#fffbe6'; g.fillRect(0, 0, W, H); g.restore(); }
    if (curShot.np) {
      windLines(g, t, { a: seg(t, 20.4, 21.0) * (t < 25.3 ? 0.8 : 0.45), speed: t >= 25.3 ? 400 : 1100 });
      const pile = v3([NX + 1.9, 1.0, -0.2]).project(cam), x0 = (pile.x + 1) / 2 * W, y0 = (1 - pile.y) / 2 * H;
      const a1 = seg(t, GLOW0, GLOW0 + 0.2) * (1 - seg(t, AWAY - 0.1, AWAY + 0.2));
      arrow2d(g, x0 - 300, y0 - 320, x0 - 50, y0 - 70, { a: a1, label: 'Christmas things' });
      const a2 = seg(t, AWAY, AWAY + 0.25) * (1 - seg(t, 27.6, 28.1));
      arrow2d(g, W * 0.42, H * 0.36, W * 0.84, H * 0.14, { a: a2, label: 'away!', color: '#7fe0ff' });
    }
  }

  // 單字卡圖示：Santa 模型 / word-card icon
  const santaIcon = iconOf(renderer, makeSanta().root, { yaw: 0.35, pitch: 0.12, dist: 2.1 });
  return {
    dur: tl.dur, frame, faces, beatObj, overlay, avoidObjs,
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
