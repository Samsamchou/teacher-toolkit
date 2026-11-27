// 第 3 幕〈The Magic Door〉：校舍後面的冰門 → Ken 踩冰方塊放星星 → 冰門打開噴出紫金光（第 7–9 句）
// Scene 3: the ice door behind the school, Ken places the star, the door bursts open with purple light.
import * as THREE from 'three';
import { PX, part, pixTex, noisy, px, rng, blockType, instanced, PAINT } from '../engine/voxel.js';
import { makeKen, makeShuiling, pose, walk } from '../engine/chars.js';
import { backpack } from '../engine/props.js';
import { nightSky, iconOf, ease, clamp01, arrow2d, windLines, W, H } from '../engine/kit.js';
import { buildCampus } from './s01.js';

const lerp = (a, b, k) => a + (b - a) * k;
const v3 = (...a) => new THREE.Vector3(...a);
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const DZ = -32;                 // 冰門所在 z（門面在 DZ+0.5）/ door plane
const SLOT_Y = 3.55;            // 星星凹槽高度＝Ken 站上兩塊冰方塊後舉手碰得到 / reachable from two ice steps

function starShape(color = '#ffd84a', emissive = '#ffc23a', ei = 0) {
  const S = [[3, 0], [4, 0], [3, 1], [4, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [2, 4], [3, 4], [4, 4], [5, 4], [1, 5], [2, 5], [5, 5], [6, 5], [0, 6], [1, 6], [6, 6], [7, 6]];
  const m = part(8, 8, 2, { all: (g) => S.forEach(([a, b]) => px(g, a, b, color)) }, { key: 'star3' + color, transparent: true, emissive: new THREE.Color(emissive), ei });
  m.material.forEach(mt => { mt.alphaTest = 0.5; mt.emissiveMap = mt.map; });
  return m;
}

function buildIceDoor(scene) {
  const g = new THREE.Group(); g.position.set(0, 0, DZ); scene.add(g);
  const ice = blockType({ all: PAINT.ice }, { key: 'ice', transparent: true, opacity: 0.85, rough: 0.25, emissive: new THREE.Color('#2a5a8a'), ei: 0.35 });
  const cells = [];
  for (let y = 0; y < 5; y++) { cells.push([-3, y, 0], [-2, y, 0], [1, y, 0], [2, y, 0]); }
  for (let x = -3; x <= 2; x++) cells.push([x, 3, 0], [x, 4, 0]);
  for (let x = -2; x <= 1; x++) cells.push([x, 5, 0]);
  cells.push([-1, 6, 0], [0, 6, 0]);
  const arch = instanced(ice, cells.filter(([x, y]) => !(y === 3 && (x === -1 || x === 0))));
  arch.position.x = 0; g.add(arch);
  // 星星凹槽（暗色星形）/ the dark star-shaped slot
  const slot = starShape('#1d3a5e'); slot.scale.setScalar(1.25); slot.position.set(0, SLOT_Y, 1.03); g.add(slot);
  // 兩片冰門板（鉸鏈在外側）/ two frosted door leaves hinged on the outside
  const leafTex = pixTex(32, 48, (gg) => { noisy(gg, 32, 48, '#a9dcff', 0.07, 601); for (let i = 0; i < 40; i++) px(gg, (i * 7) % 32, (i * 13) % 48, '#e6f7ff'); gg.fillStyle = '#7fc4f0'; gg.fillRect(0, 0, 32, 2); }, 'iceleaf');
  const crackTex = pixTex(32, 48, (gg) => { const r = rng(7); let x = 31, y = 24; for (let i = 0; i < 60; i++) { px(gg, x, y, '#ffffff'); x -= 1; y += Math.round((r() - 0.5) * 2); if (x < 0) { x = 31; y = 6 + ((r() * 36) | 0); } } }, 'icecrack');
  const leaves = [-1, 1].map(s => {
    const hinge = new THREE.Group(); hinge.position.set(s * 1, 0, 0.95); g.add(hinge);
    const mat = new THREE.MeshStandardMaterial({ map: leafTex, transparent: true, opacity: 0.88, roughness: 0.2, emissive: new THREE.Color('#3a7ab0'), emissiveIntensity: 0.4 });
    const crack = new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, opacity: 0 });
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 0.18), mat); leaf.position.set(-s * 0.5, 1.5, 0); hinge.add(leaf);
    const cr = new THREE.Mesh(new THREE.PlaneGeometry(1, 3), crack); cr.position.set(-s * 0.5, 1.5, 0.1); cr.scale.x = s; hinge.add(cr);
    return { hinge, crack, s };
  });
  // 門後的光（金白中心＋紫色光束），不是旋渦 / light behind the door: gold-white core and purple rays, never a swirl sheet
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { t: { value: 0 }, k: { value: 0 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv;uniform float t,k;
      void main(){vec2 p=vUv-vec2(.5,.45);float r=length(p),a=atan(p.y,p.x);
      float rays=pow(.5+.5*sin(a*9.+t*1.5),6.)*smoothstep(.75,.0,r);
      float core=smoothstep(.45,.0,r);
      vec3 c=mix(vec3(.55,.12,1.35),vec3(1.4,.95,.7),core*core*core)*(core*.9+rays*1.0+.3);
      float px=floor(vUv.x*64.)/64.;c*=.85+.15*sin(px*90.+t*4.);
      gl_FragColor=vec4(c*k,1.);}`,
  }));
  glow.position.set(0, 1.5, 0.6); g.add(glow);
  const beams = new THREE.Group(); g.add(beams); beams.position.set(0, 1.5, 1.1);
  for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.ConeGeometry(0.35 + (i % 3) * 0.15, 9, 4, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(i % 2 ? 0.7 : 1.0, i % 2 ? 0.15 : 0.55, i % 2 ? 1.6 : 0.35), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); b.rotation.x = Math.PI / 2; b.rotation.z = (i - 3) * 0.32; b.position.z = 4.5; b.userData.base = (i - 3) * 0.32; beams.add(b); }
  const doorLight = new THREE.PointLight('#b45cff', 0, 16, 1.4); doorLight.position.set(0, 1.8, 2.2); g.add(doorLight);
  // 冰屑方塊 / ice shards
  const shards = Array.from({ length: 40 }, (_, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), new THREE.MeshStandardMaterial({ color: '#cdeeff', emissive: '#7fc4ff', emissiveIntensity: 0.8, transparent: true })); g.add(m); return m; });
  // 兩塊冰方塊台階 / two ice step blocks
  const steps = instanced(ice, [[0, 0, 1], [0, 0, 0], [0, 1, 0]]); steps.position.set(-0.5, 0, 1.0); g.add(steps);
  return { g, leaves, glow, beams, doorLight, shards, slot };
}

export async function setup({ S, tl, man }) {
  const { scene, camera, renderer } = S;
  scene.fog = new THREE.Fog('#d3deeb', 30, 110);
  const sky = nightSky(scene, { top: '#6fa6e0', mid: '#b4d3f0', bottom: '#f7d8b6', stars: 0 });
  scene.add(new THREE.HemisphereLight('#d6e6ff', '#8a7a60', 1.0));
  const sun = new THREE.DirectionalLight('#ffd6a0', 2.3); sun.position.set(20, 16, -10); sun.target.position.set(0, 0, -26); sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 22, bottom: -22, near: 1, far: 120 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02; scene.add(sun, sun.target);
  buildCampus(scene);
  // 校舍後方補草地（原本地面只到 z=-24）/ extra lawn behind the school
  { const grass = blockType({ top: (g) => noisy(g, 16, 16, '#6fa54a', 0.1, 205), side: (g) => noisy(g, 16, 16, '#7a5436', 0.1, 206), bottom: PAINT.dirt }, { key: 'grass' }); const c = []; for (let x = -40; x < 40; x++) for (let z = -64; z < -24; z++) c.push([x, -1, z]); scene.add(instanced(grass, c)); }
  const D = buildIceDoor(scene);
  const ken = makeKen(), sl = makeShuiling(); scene.add(ken.root, sl.root);
  const kb = backpack('#e8792a', '#24305e'), sb = backpack('#5aa65a', '#2f5d3a');
  [[kb, ken], [sb, sl]].forEach(([b, r]) => { b.group.scale.setScalar(0.7); r.torso.add(b.group); b.group.position.set(0, 1 * PX, -9 * PX); b.group.rotation.y = Math.PI; });
  const star = starShape('#ffd84a', '#ffc23a', 0.4); scene.add(star);

  // ---- 時間 / times ----
  const T_ARR = 2.6, CLIMB0 = 8.3, STEP1 = 8.8, STEP2 = 9.4, PLACE = 10.4, LIT = 10.6;
  const WHOOSH = 15.6, OPEN0 = 17.5, OPEN1 = 18.4, BEAT_P = 21.4, END_WALK = 24.0;
  const slowT = (t) => t >= BEAT_P && t < END_WALK ? BEAT_P + (t - BEAT_P) * 0.4 : t >= END_WALK ? BEAT_P + (END_WALK - BEAT_P) * 0.4 + (t - END_WALK) : t;
  // 兩人從校舍轉角跑到門前 / run round the corner of the building to the door
  const path = (t, side) => {
    const k = ease.io(seg(t, 0.3, T_ARR + 0.6));
    const a = v3(15.5 + side, 0, -12.5 + side * 0.6), b = v3(9, 0, -20), c = v3(side < 0 ? -1.4 : 1.0, 0, DZ + 2.6 + (side < 0 ? 0 : 0.2));
    return k < 0.5 ? a.lerp(b, k * 2) : b.lerp(c, (k - 0.5) * 2);
  };
  const KEN_STAND = v3(0, 2, DZ + 1.55);     // 站在第二塊冰方塊上 / on top of the second ice step
  function kenAt(t) {
    if (t < CLIMB0) return path(t, -1);
    const p0 = path(CLIMB0, -1), base = v3(0, 0, DZ + 3.45);
    if (t < STEP1) return p0.lerp(base, ease.io(seg(t, CLIMB0, STEP1)));
    if (t < STEP2) { const k = seg(t, STEP1, STEP2); return v3(0, ease.out(k) + Math.sin(k * Math.PI) * 0.35, DZ + 3.45 - 0.95 * k); }
    if (t < 9.9) { const k = seg(t, STEP2, 9.9); return v3(0, 1 + ease.out(k) + Math.sin(k * Math.PI) * 0.35, DZ + 2.5 - 0.95 * k); }
    if (t < 13.0) return KEN_STAND.clone();
    if (t < 14.0) { const k = seg(t, 13.0, 14.0); return v3(-k * 1.4, 2 * (1 - k) + Math.sin(k * Math.PI) * 0.4, DZ + 1.55 + k * 1.2); }   /* 跳下來 / hops down */
    if (t < END_WALK) return v3(-1.4, 0, DZ + 2.75);
    return v3(-1.4, 0, DZ + 2.75).lerp(v3(-0.4, 0, DZ + 0.9), ease.io(seg(t, END_WALK, 25.6)));
  }
  const SL_HOLD = v3(0.95, 0, DZ + 1.5);
  function slAt(t) {
    if (t < CLIMB0) return path(t, 1);
    if (t < 13.0) return path(CLIMB0, 1).lerp(SL_HOLD, ease.io(seg(t, CLIMB0, 8.9)));
    if (t < END_WALK) return SL_HOLD.clone().lerp(v3(1.0, 0, DZ + 2.85), ease.io(seg(t, 13.0, 13.8)));
    return v3(1.0, 0, DZ + 2.85).lerp(v3(0.5, 0, DZ + 0.9), ease.io(seg(t, END_WALK, 25.6)));
  }
  const handR = (r) => r.handR.getWorldPosition(v3());

  function act(t) {
    const kp = kenAt(t), sp = slAt(t); ken.root.position.copy(kp); sl.root.position.copy(sp);
    const run = t > 0.3 && t < T_ARR + 0.6;
    const dirK = kenAt(t + 0.05).sub(kp), dirS = slAt(t + 0.05).sub(sp);
    if (run && dirK.lengthSq() > 1e-6) ken.root.rotation.y = Math.atan2(dirK.x, dirK.z); else if (t < END_WALK) ken.root.rotation.y = Math.PI; else ken.root.rotation.y = Math.PI;
    if (run && dirS.lengthSq() > 1e-6) sl.root.rotation.y = Math.atan2(dirS.x, dirS.z); else sl.root.rotation.y = t >= CLIMB0 && t < 13 ? -Math.PI / 2 : Math.PI;
    if (run) { walk(ken, (t - 0.3) * 2.3, 1.5); walk(sl, (t - 0.3) * 2.3 + 0.5, 1.5); }
    else if (t < CLIMB0) { pose(ken, { headX: -24, armLz: -8, armRz: 8 }); pose(sl, { headX: -24, armLz: -8, armRz: 8 }); }
    else if (t < 13.0) {
      // Ken 爬上冰方塊 → 舉手把星星按進凹槽 / climbs, then reaches up to press the star into the slot
      const climbing = t < 9.9, reach = ease.io(seg(t, 9.9, PLACE));
      if (climbing) walk(ken, (t - CLIMB0) * 1.6, 0.8); else pose(ken, { armRx: lerp(-40, -142, reach), armRz: -4, armLx: -20, armLz: -10, headX: -26 });
      // 水鈴雙手扶穩下面的冰方塊 / Shuiling steadies the step blocks with both hands
      pose(sl, { armLx: -68, armRx: -68, armLz: 10, armRz: -10, headX: -22, bodyX: 8 });
    } else if (t < END_WALK) {
      const shield = seg(t, OPEN0 - 0.2, OPEN0 + 0.3);
      pose(ken, { armLx: lerp(-10, -150, shield), armLz: lerp(-6, 30, shield), armRx: -20, headX: lerp(-18, 6, shield), bodyX: -6 * shield });
      pose(sl, { armRx: lerp(-10, -150, shield), armRz: lerp(6, -30, shield), armLx: -20, headX: lerp(-18, 6, shield), bodyX: -6 * shield });
    } else { walk(ken, (t - END_WALK) * 1.6, 0.9); walk(sl, (t - END_WALK) * 1.6 + 0.5, 0.9); }
    const blink = (o) => ((t + o) % 3.5) < 0.12;
    ken.setFace(t < 5.2 ? { eyes: 'open', mouth: 'smile' } : t < LIT ? { eyes: 'wide', mouth: 'o' } : t < WHOOSH ? { eyes: 'happy', mouth: 'grin' } : t < END_WALK ? { eyes: blink(0) ? 'blink' : 'wide', mouth: 'open' } : { eyes: 'happy', mouth: 'grin' });
    sl.setFace(t < 5.2 ? { eyes: 'happy', mouth: 'smile' } : t < LIT ? { eyes: 'wide', mouth: 'o' } : t < WHOOSH ? { eyes: 'happy', mouth: 'open' } : t < END_WALK ? { eyes: 'wide', mouth: 'o' } : { eyes: 'happy', mouth: 'open' });
    ken.root.updateMatrixWorld(true); sl.root.updateMatrixWorld(true);
    // 星星：在 Ken 手上→按進凹槽亮起 / the star: in Ken's hand, then pressed into the slot
    const slotW = D.slot.getWorldPosition(v3()).add(v3(0, 0, 0.06));
    star.visible = t >= CLIMB0 - 0.4;
    if (t < PLACE) { star.position.copy(handR(ken)).add(v3(0, 0.1, -0.08)); star.rotation.set(0, Math.PI + Math.sin(t * 3) * 0.2, 0); star.scale.setScalar(1.25); }
    else { star.position.copy(slotW); star.rotation.set(0, 0, 0); star.scale.setScalar(1.25); }
    const lit = seg(t, PLACE, LIT + 0.2), flare = t >= WHOOSH && t < WHOOSH + 0.6 ? 1 - seg(t, WHOOSH, WHOOSH + 0.6) : 0;
    star.material.forEach(m => { m.emissiveIntensity = 0.4 + lit * 2.4 + flare * 4; });
    // 冰門：裂縫→打開→光 / the door: cracks, opens, light
    const crack = seg(t, WHOOSH, WHOOSH + 1.2), open = ease.out(seg(t, OPEN0, OPEN1));
    D.leaves.forEach(l => { l.crack.opacity = crack * (1 - open); l.hinge.rotation.y = l.s * open * 1.6; });
    const st = slowT(t), light = seg(t, OPEN0, OPEN0 + 0.6);
    D.glow.material.uniforms.t.value = st; D.glow.material.uniforms.k.value = Math.max(light * 0.8, crack * 0.25);
    D.beams.children.forEach((b, i) => { b.material.opacity = light * (0.05 + 0.03 * Math.sin(st * 2 + i)); b.rotation.z = b.userData.base + Math.sin(st * 0.8 + i) * 0.08; });
    D.doorLight.intensity = light * 7 + crack * 2 + lit * 2;
    D.shards.forEach((m, i) => { const lt = st - OPEN0 - (i % 5) * 0.03; m.visible = lt > 0 && lt < 3.5; if (!m.visible) return; const a = i * 2.39, sp = 1.2 + (i % 7) * 0.35; m.position.set(Math.cos(a) * sp * lt * 0.7, 1.6 + Math.sin(a) * sp * lt * 0.5 - lt * lt * 0.3, 1.2 + sp * lt * 0.8); m.rotation.set(lt * 4, lt * 3, 0); m.material.opacity = 1 - lt / 3.5; });
  }

  // ---- 鏡頭 / camera ----
  const shots = [
    { t: 0, cam: (t) => { const m = path(Math.max(t, 0.6), 0); return [v3(15 - t * 1.5, 7.5, -31), m.clone().add(v3(0, 0.8, 0))]; } },        /* 從上方看兩人跑到校舍後面 */
    { t: 2.6, cam: (t) => [v3(0.6 + (t - 2.6) * 0.03, 1.7, DZ + 11 - (t - 2.6) * 0.3), v3(0, 2.6, DZ)] },   /* 兩人背影抬頭看冰門 */
    { t: 5.6, beat: 'ice door', cam: (t) => { const k = ease.io(seg(t, 5.6, 8.3)); return [v3(4.5 - k * 2.0, 1.0 + k * 3.0, DZ + 9.5), v3(0, 1.2 + k * 2.6, DZ + 0.5)]; } },   /* 慢：冰門由下往上搖 */
    { t: 8.3, cam: (t) => [v3(4.6, 2.6, DZ + 6.6), v3(0.2, 1.9, DZ + 1.6)] },                              /* Ken 爬上冰方塊、水鈴扶穩 */
    { t: 10.0, cam: (t) => [v3(2.6, SLOT_Y + 0.4, DZ + 3.6), v3(0, SLOT_Y - 0.2, DZ + 1.1)] },          /* 星星按進凹槽 */
    { t: 12.6, beat: 'a star', cam: (t) => [v3(0.6 - (t - 12.6) * 0.1, SLOT_Y + 0.1, DZ + 3.4), v3(0, SLOT_Y, DZ + 1)] },
    { t: 15.2, cam: (t) => [v3(0.2, 2.4, DZ + 9.0 + (t - 15.2) * 0.1), v3(0, 2.2, DZ + 0.5)] },            /* Whoosh! 裂開 */
    { t: 17.5, cam: (t) => [v3(-3.6, 1.6, DZ + 9.5 + (t - 17.5) * 0.12), v3(0.2, 2.0, DZ)] },               /* 門打開、光噴出、兩人遮眼 */
    { t: 21.4, beat: 'purple light', cam: (t) => [v3(0.2 - (t - 21.4) * 0.1, 0.9, DZ + 7.2), v3(0, 2.1, DZ + 0.5)] },
    { t: 24.0, cam: (t) => [v3(0.3, 1.8, DZ + 9.0 - (t - 24) * 0.4), v3(0, 1.6, DZ)] },                     /* 走進光裡 */
  ];
  let cur = shots[0];
  /* 紫光的框只框門內上半部的光，兩人站在框外 / frame only the upper light in the doorway, the children stay outside it */
  const lightMark = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 0.1), new THREE.MeshBasicMaterial({ visible: false })); lightMark.position.set(0, 2.25, DZ + 0.7); scene.add(lightMark);
  const beatObjs = { 'ice door': D.g, 'a star': star, 'purple light': lightMark };
  function frame(t) {
    act(t);
    let sh = shots[0]; for (const s of shots) if (t >= s.t) sh = s; cur = sh;
    const [p, l] = sh.cam(t); camera.position.copy(p); camera.lookAt(l); camera.fov = 36; camera.updateProjectionMatrix();
    sky.dome.position.copy(camera.position);
    scene.updateMatrixWorld(true);
  }
  const faces = () => [ken, sl].map(r => r.head.getWorldPosition(v3()));
  const avoidObjs = (t) => (t > 9.5 && t < 15.2 ? [star] : []);
  function miniMap(g, t, a) {
    if (a <= 0) return; g.save(); g.globalAlpha = a;
    const X = 1430, Y = 40, Wm = 450, Hm = 420;
    g.fillStyle = 'rgba(255,248,230,0.95)'; g.beginPath(); g.roundRect(X, Y, Wm, Hm, 22); g.fill(); g.lineWidth = 6; g.strokeStyle = '#c83a33'; g.stroke();
    g.fillStyle = '#7fbf6a'; g.fillRect(X + 20, Y + 20, Wm - 40, Hm - 40);
    // 校舍（上面是後面）/ the school; the top of the map is the back
    g.fillStyle = '#ece3cf'; g.fillRect(X + 90, Y + 190, 270, 70); g.strokeStyle = '#8a6a3a'; g.lineWidth = 4; g.strokeRect(X + 90, Y + 190, 270, 70);
    g.fillStyle = '#c4552f'; g.fillRect(X + 90, Y + 190, 270, 12);
    g.font = 'bold 34px "Comic Relief"'; g.textAlign = 'center'; g.fillStyle = '#1f2a5a'; g.fillText('school', X + 225, Y + 240);
    // 冰門 / the ice door
    g.fillStyle = '#9fd8ff'; g.fillRect(X + 205, Y + 60, 40, 26); g.strokeStyle = '#2f6fa8'; g.strokeRect(X + 205, Y + 60, 40, 26);
    // 路線：前面→繞右邊→後面 / route: front, round the right side, to the back
    const pts = [[X + 330, Y + 340], [X + 395, Y + 300], [X + 395, Y + 150], [X + 300, Y + 110], [X + 248, Y + 92]];
    const k = seg(t, 0.4, 2.8), n = 1 + k * (pts.length - 1);
    g.strokeStyle = '#e23b3b'; g.lineWidth = 8; g.setLineDash([16, 10]); g.beginPath(); g.moveTo(...pts[0]);
    for (let i = 1; i < n; i++) g.lineTo(...pts[Math.min(i, pts.length - 1)]);
    const fi = Math.floor(n), fr = n - fi; if (fi < pts.length) { const [x0, y0] = pts[fi - 1], [x1, y1] = pts[fi]; g.lineTo(x0 + (x1 - x0) * fr, y0 + (y1 - y0) * fr); }
    g.stroke(); g.setLineDash([]);
    g.font = 'bold 40px "Comic Relief"'; g.lineWidth = 8; g.strokeStyle = '#ffffff'; g.strokeText('behind the school', X + Wm / 2, Y + Hm - 34); g.fillStyle = '#c83a33'; g.fillText('behind the school', X + Wm / 2, Y + Hm - 34);
    g.restore();
  }
  function overlay(g, t, cam) {
    const scr = (p) => { const v = p.clone().project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };
    // behind the school：箭頭沿著跑步路線繞到後面 / arrow along the route round the back
    /* behind the school：右上角俯視小地圖，兩人的路線從校舍前面繞到後面的冰門 / top-down mini map: the route goes round to the back of the school */
    if (t < 5.4) miniMap(g, t, seg(t, 0.2, 0.6) * (1 - seg(t, 5.0, 5.4)));
    // on the top of the door：箭頭往下指星星凹槽 / arrow pointing down at the slot
    if (t >= 9.6 && t < 11.4) { const [x, y] = scr(v3(0, SLOT_Y, DZ + 0.6)); arrow2d(g, x + 170, y - 230, x + 40, y - 70, { a: seg(t, 9.6, 9.9) * (1 - seg(t, 11.1, 11.4)), label: 'top' }); }
    // Whoosh!：風線 / wind streaks
    windLines(g, t, { a: (t >= WHOOSH - 0.1 && t < 21.4 ? seg(t, WHOOSH - 0.1, WHOOSH + 0.3) * (1 - seg(t, 20.8, 21.4)) : 0) * 0.7, speed: 1300, dir: 1 });
  }
  const starIcon = iconOf(renderer, starShape('#ffd84a', '#ffc23a', 1), { yaw: 0.0, pitch: 0.0, dist: 2.2 });
  return { dur: tl.dur, frame, faces, avoidObjs, overlay, beatObj: (l) => beatObjs[l] || null, cards: { 'a star': starIcon } };
}
