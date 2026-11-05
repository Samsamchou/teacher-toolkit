// s02 — Pre-Chorus 1＋Chorus 1（全曲 32.5–66.0 s；本地秒 t＝全曲秒 − 32.5）
// 季節顏色：夏金（#7–#15）→ 轉秋橘（#16 尾）→ 秋橘（#17）
//   #7  32.5 Seasons, they will change → 山頂，風吹，四季小圖示（葉、花、雪、太陽）繞著媽媽轉一圈
//   #8  34.4 Life will make you grow → 媽媽張開雙臂（M2），背後的翅膀慢慢長出來
//   #9  36.6 Change will make you cry → 女孩（D7A）抬頭看，眼角一滴光
//   #10 40.4 Everything is temporary → 一根青綠羽毛慢慢飄落到女孩手心（全片信物）
//   #11 42.6 Everything will slide → 媽媽跪下（M3）抱住女孩，羽毛發光
//   #12 44.4 Love will never die → 母女起飛（M2＋翅膀、D7C＋小翅膀），鏡頭跟著往上（AI 飛翔鏡 ✅ 之後替換）
//   #13 48.1 I know that → 雲海上並肩飛
//   #14 50.8 （Ooh）→ 鏡頭貼著金色雲海往太陽飛（程式山脈太像錐體，改成雲海）
//   #15 53.1 Birds fly in different directions → 一群白鳥從中間往四面八方散開，母女還在一起
//   #16 56.5 （Ooh）→ 穿過鳥群跟拍（AI 飛翔鏡 ✅），顏色轉秋
//   #17 61.1 I hope to see you again → 秋天森林落地，羽毛飄到女孩胸前變成項鍊
import { THREE, V, C, prog, ease, easeOut, lerp, clamp, hash, makePost, makeChar, loadModel, skyDome, setSky, cloudField, hills, groundY, tree, mountain, motes, camAt, valAt, lightRig, feather, pendantGlow } from '../engine/world.js';

const S0 = 32.5, DUR = 33.5, M = '../../models/';
// 翅膀模型原本以底部為支點；改成以中心（左右翅膀接合處）為支點，才能對準肩胛骨
function centerPivot(h) { const sz = h.userData.size; h.children[0].position.y -= sz.y / 2; }

export async function setup({ renderer }) {
  const AMP = { amp: 2.4, freq: .045 }, gy = (x, z) => groundY(x, z, AMP);
  // ════════ H. 山頂（夏日黃昏）/ hilltop at golden hour ════════
  const Hs = new THREE.Scene(); Hs.background = C('#e9c193'); Hs.fog = new THREE.Fog('#e9c193', 40, 220);
  const hSky = skyDome(); Hs.add(hSky); setSky(hSky, { top: '#e6a170', mid: '#ffcf92', bot: '#ffe0ae', sunDir: V(.55, .08, -1), sunCol: '#fff3d0', sunSize: .012, sunGlow: .9 });
  const hL = lightRig(Hs); hL.key.color.set('#ffb46a'); hL.key.intensity = 2.8; hL.key.position.set(16, 4, -30); hL.rim.color.set('#ffcf8a'); hL.rim.intensity = 1.8; hL.rim.position.set(0, 4, -20); hL.hemi.color.set('#ffe3c2'); hL.hemi.intensity = .75;
  const hGround = hills({ w: 260, d: 260, ...AMP, color: '#a4a24c' }); Hs.add(hGround);
  for (let i = 0; i < 60; i++) { const x = (hash(i + 300) - .5) * 160, z = -20 - hash(i + 301) * 120; const t = tree({ h: 5 + hash(i) * 4, r: 1.5 + hash(i + 2), seed: i + 300, crown: '#7f9c3c' }); t.position.set(x, gy(x, z) - .2, z); Hs.add(t); }
  { const cl = cloudField({ n: 26, area: [300, 120], y: [28, 45], size: [24, 46], seed: 4, opacity: .75 }); cl.position.z = -120; Hs.add(cl); }
  const hMotes = motes({ n: 260, area: [10, 4, 10], color: '#fff0c0', size: .04, seed: 5 }); Hs.add(hMotes);
  const X = 2, Z = -6, Y = gy(X, Z);
  const mom = await makeChar(M, { M1: 'M1.glb', M2: 'M2.glb', M3: 'M3.glb' }, { M1: 1.65, M2: 1.65, M3: 1.17 }); Hs.add(mom);
  const kid = await makeChar(M, { D7A: 'D7A.glb', D7C: 'D7C.glb' }, { default: 1.17 }); Hs.add(kid); const kidGlow = pendantGlow(kid, .79, .12);
  const wingsH = await loadModel(M + 'WINGS.glb', 2.6, { axis: 'xz' }); centerPivot(wingsH); Hs.add(wingsH);
  // 四季圖示 / four season icons
  const icons = new THREE.Group(); Hs.add(icons);
  { const leaf = new THREE.Mesh(new THREE.SphereGeometry(.12, 12, 8), new THREE.MeshStandardMaterial({ color: '#6fbf4a', emissive: '#2e6a1a', emissiveIntensity: .4 })); leaf.scale.set(1, .45, .2);
    const flower = new THREE.Group(); for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(.06, 10, 8), new THREE.MeshStandardMaterial({ color: '#ff9ec0', emissive: '#a03a60', emissiveIntensity: .4 })); p.position.set(Math.cos(i * 1.257) * .07, Math.sin(i * 1.257) * .07, 0); flower.add(p); }
    flower.add(new THREE.Mesh(new THREE.SphereGeometry(.04, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffd24a', emissive: '#a07000', emissiveIntensity: .5 })));
    const snow = new THREE.Group(); for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.24, .025, .025), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#a8d8ff', emissiveIntensity: .8 })); b.rotation.z = i * Math.PI / 3; snow.add(b); }
    const sun = new THREE.Mesh(new THREE.SphereGeometry(.1, 16, 12), new THREE.MeshStandardMaterial({ color: '#ffd34a', emissive: '#ffb000', emissiveIntensity: 1.2 }));
    [leaf, flower, snow, sun].forEach(o => icons.add(o)); }
  const tear = new THREE.Mesh(new THREE.SphereGeometry(.003, 10, 8), new THREE.MeshBasicMaterial({ color: '#e6fbff', transparent: true, opacity: .55 })); Hs.add(tear);
  const feat = feather({ glow: 1.8 }); feat.scale.setScalar(.3); Hs.add(feat);
  const featLight = new THREE.PointLight('#5ff2df', 0, .8, 2); Hs.add(featLight);
  const hCam = new THREE.PerspectiveCamera(35, 16 / 9, .05, 600);

  // ════════ K. 天空（雲海、山脈、鳥群）/ sky: cloud sea, mountains, birds ════════
  const K = new THREE.Scene(); K.background = C('#f2c08a'); K.fog = new THREE.Fog('#f4c896', 60, 420);
  const kSky = skyDome(); K.add(kSky); setSky(kSky, { top: '#d9906a', mid: '#ffc98e', bot: '#ffe1b0', sunDir: V(.2, .06, -1), sunCol: '#fff4d6', sunSize: .014, sunGlow: 1.0 });
  const kL = lightRig(K); kL.key.color.set('#ffc07a'); kL.key.intensity = 2.6; kL.key.position.set(20, 15, -60); kL.rim.color.set('#ffd8a0'); kL.rim.intensity = 2; kL.rim.position.set(0, 8, -40); kL.hemi.color.set('#ffe8cc'); kL.hemi.intensity = 1.1;
  const sea = cloudField({ n: 220, area: [500, 600], y: [-6, -1], size: [26, 52], seed: 9, color: '#fff3e6', opacity: .95 }); sea.position.z = -200; K.add(sea);
  const puffs = cloudField({ n: 40, area: [200, 400], y: [4, 26], size: [10, 24], seed: 11, color: '#ffe9d6', opacity: .7 }); puffs.position.z = -150; K.add(puffs);
  const peaks = new THREE.Group(); K.add(peaks);
  for (let i = 0; i < 14; i++) { const m = mountain({ h: 40 + hash(i + 70) * 40, r: 26 + hash(i + 71) * 18, color: valAt([[0, '#7a4f48'], [1, '#5f4a66']], hash(i + 72)), seed: i });
    m.position.set((i - 7) * 38 + hash(i + 73) * 20, -18, -330 - hash(i + 74) * 140); peaks.add(m); }
  const momF = await makeChar(M, { M2: 'M2.glb' }, { default: 1.65 }); K.add(momF);
  const kidF = await makeChar(M, { D7C: 'D7C.glb' }, { default: 1.17 }); K.add(kidF); const kidFGlow = pendantGlow(kidF, .79, .12, .22);
  const wingM = await loadModel(M + 'WINGS.glb', 2.6, { axis: 'xz' }); centerPivot(wingM); momF.add(wingM);
  const wingK = await loadModel(M + 'WINGS.glb', 1.5, { axis: 'xz' }); centerPivot(wingK); kidF.add(wingK);
  // 翅膀長在上背部（肩胛骨）：媽媽 1.32 m、女孩 .9 m，身體後方 / wings sit on the upper back
  wingM.position.set(0, 1.32, -.15); wingK.position.set(0, .9, -.11);
  // 鳥群：40 隻白鳥 / a flock of 40 doves
  const flock = []; for (let i = 0; i < 40; i++) { const b = await loadModel(M + 'BIRD.glb', .9 + hash(i + 200) * .5, { axis: 'xz' }); K.add(b); flock.push(b); }
  const kCam = new THREE.PerspectiveCamera(35, 16 / 9, .1, 1200);

  // ════════ A. 秋天森林 / the autumn wood ════════
  const A = new THREE.Scene(); A.background = C('#d98a54'); A.fog = new THREE.Fog('#d9915c', 14, 70);
  const aSky = skyDome(); A.add(aSky); setSky(aSky, { top: '#c46f4a', mid: '#f0a066', bot: '#f7c48e', sunDir: V(-.4, .15, -1), sunCol: '#ffe2b0', sunSize: .0, sunGlow: .7 });
  const aL = lightRig(A); aL.key.color.set('#ffb070'); aL.key.intensity = 2.4; aL.key.position.set(-8, 7, -12); aL.rim.color.set('#ffc890'); aL.rim.intensity = 1.6; aL.rim.position.set(-3, 5, -10); aL.hemi.color.set('#ffd8b0'); aL.hemi.intensity = .9;
  const aGround = hills({ w: 120, d: 120, amp: .3, freq: .2, color: '#a8643a' }); A.add(aGround);
  const crowns = ['#d9582b', '#e8862e', '#c9472a', '#f0a43a', '#b8452c'];
  for (let i = 0; i < 46; i++) { const x = (hash(i + 600) - .5) * 40, z = 6 - hash(i + 601) * 50; if (Math.abs(x) < 2.2 && z > -4) continue;
    const t = tree({ h: 5 + hash(i + 602) * 4, r: 1.6 + hash(i + 603), seed: i + 600, crown: crowns[i % 5] }); t.position.set(x, 0, z); A.add(t); }
  const leaves = motes({ n: 220, area: [12, 6, 12], color: '#ff9a3c', size: .07, seed: 7 }); leaves.material.blending = THREE.NormalBlending; A.add(leaves);
  const momA = await makeChar(M, { M1: 'M1.glb' }, { default: 1.65 }); A.add(momA);
  const kidA = await makeChar(M, { D7A: 'D7A.glb' }, { default: 1.17 }); A.add(kidA); const kidAGlow = pendantGlow(kidA, .79, .12);
  const featA = feather(); featA.scale.setScalar(.1); A.add(featA);
  const featAL = new THREE.PointLight('#5ff2df', 0, .6, 2); A.add(featAL);
  const aCam = new THREE.PerspectiveCamera(35, 16 / 9, .05, 300);

  const post = makePost(renderer, Hs, hCam);
  const fill = (L, cam, k = 1.2) => { L.fill.position.copy(cam.position).add(V(0, .3, 0)); L.fill.intensity = k; L.fill.color.set('#ffe8cc'); };

  function frame(t, st) {
    const sat = valAt([[32.5, 1.05], [58, 1.05], [61, 1.1]], st);
    const tint = valAt([[32.5, '#ffe6c4'], [57, '#ffe6c4'], [61, '#ffd9b0'], [66, '#ffd2a8']], st);
    const flash = Math.max(Math.sin(Math.PI * prog(st, 60.6, 61.6)), 0) * .6;
    post.set({ sat, tint, vig: .38, fade: flash, fadeCol: '#fff4e2', t: st });

    // ───────── 山頂 #7–#11（32.5–44.4）
    if (st < 44.4) {
      post.set({ scene: Hs, camera: hCam }); hMotes.update(st, { fall: .02, sway: .5 }); hMotes.position.set(X, Y, Z); kidGlow.set(window.FEATHER || 0);
      const momPose = st < 34.4 ? 'M1' : st < 42.6 ? 'M2' : 'M3';
      mom.setPose(momPose); mom.position.set(X - .9, gy(X - .9, Z - .2), Z - .2); mom.rotation.y = momPose === 'M3' ? 1.15 : .35;
      kid.setPose('D7A'); kid.position.set(X + .25, gy(X + .25, Z + .2), Z + .2); kid.rotation.y = st < 42.6 ? -.55 : -1.2;
      // #8 翅膀長出來 / wings grow
      const wg = easeOut(prog(st, 34.6, 36.4)); wingsH.visible = st >= 34.4 && st < 42.6;
      { const back = V(0, 1.32, -.15).applyAxisAngle(V(0, 1, 0), mom.rotation.y); wingsH.position.copy(mom.position).add(back); } wingsH.rotation.y = mom.rotation.y;
      wingsH.scale.set(Math.max(.01, wg), Math.max(.01, wg), 1); wingsH.children[0].rotation.x = .08 * Math.sin(st * 3) * wg;
      // #7 四季圖示繞一圈 / season icons orbit
      const ik = prog(st, 32.4, 34.6); icons.visible = st < 34.6;
      icons.children.forEach((o, i) => { const a = i * Math.PI / 2 + ik * Math.PI * 2; o.position.set(mom.position.x + Math.cos(a) * 1.0, mom.position.y + .85 + Math.sin(a * 2) * .15, mom.position.z + Math.sin(a) * 1.0);
        o.rotation.set(st, st * 1.3 + i, 0); o.scale.setScalar(Math.sin(Math.PI * ik) * 1.3); });
      // #9 眼角一滴光 / a tear of light
      const tk = prog(st, 37.3, 39.8); tear.visible = st >= 37.3 && st < 40.4;
      tear.position.set(kid.position.x + .02, kid.position.y + .98 - tk * .06, kid.position.z + .1); tear.scale.setScalar(1 + Math.sin(st * 9) * .2);
      // #10 羽毛飄下來；#11 羽毛在兩人之間發光 / the feather drifts down
      const fk = ease(prog(st, 40.4, 42.6)); feat.visible = st >= 40.2;
      const handP = V(kid.position.x - .05, kid.position.y + .62, kid.position.z + .18);
      feat.position.set(lerp(handP.x + .4, handP.x, fk) + Math.sin(st * 2.2) * .12 * (1 - fk), lerp(handP.y + 1.3, handP.y, fk), lerp(handP.z, handP.z, fk));
      feat.rotation.set(Math.sin(st * 1.7) * .6 * (1 - fk), st * .8, Math.sin(st * 2.2) * .9 * (1 - fk) + fk * 1.2);
      if (st >= 42.7) { const sk = ease(prog(st, 42.7, 43.6)); const catchP = V(X - .38, Y + .5, Z + .05);   // 滑落→媽媽接住
        feat.position.set(lerp(handP.x, catchP.x, sk) + Math.sin(st * 5) * .05 * (1 - sk), lerp(handP.y, catchP.y, sk) - Math.sin(sk * Math.PI) * .05, lerp(handP.z, catchP.z, sk));
        feat.rotation.set(0, st * .6 * (1 - sk), lerp(1.2, .3, sk) + Math.sin(st * 6) * .4 * (1 - sk)); }
      feat.userData.mat.emissiveIntensity = st >= 42.6 ? 1.6 + .6 * Math.sin(st * 4) : 1.0;
      featLight.position.copy(feat.position); featLight.intensity = feat.visible ? .5 : 0;
      if (st < 36.6) camAt(hCam, [[32.5, [X - .9, Y + 1.0, Z + 4.4], [X - .9, Y + 1.25, Z - .2], 32], [36.6, [X - 1.1, Y + .9, Z + 3.4], [X - .9, Y + 1.4, Z - .2], 34]], st);
      else if (st < 40.4) camAt(hCam, [[36.6, [X + .55, Y + .95, Z + 1.2], [X + .2, Y + .95, Z + .2], 28], [40.4, [X + .5, Y + .95, Z + 1.0], [X + .2, Y + .97, Z + .2], 26]], st);
      else if (st < 42.6) camAt(hCam, [[40.4, [handP.x + .35, handP.y + .5, handP.z + .9], [handP.x, handP.y + .6, handP.z], 32], [42.6, [handP.x + .25, handP.y + .2, handP.z + .7], [handP.x, handP.y + .05, handP.z], 30]], st);
      else camAt(hCam, [[42.6, [X - .3, Y + .8, Z + 2.8], [X - .3, Y + .7, Z], 30], [44.4, [X - .35, Y + .75, Z + 2.4], [X - .3, Y + .7, Z], 28]], st);
      fill(hL, hCam, st < 36.6 ? 7 : 1.6); if (st < 36.6) hL.fill.distance = 10; else hL.fill.distance = 6;
      const focusP = st < 36.6 ? mom.position.clone().add(V(0, 1.3, 0)) : st < 40.4 ? kid.position.clone().add(V(0, .95, 0)) : st < 42.6 ? feat.position : V(X - .3, Y + .7, Z);
      post.set({ focus: hCam.position.distanceTo(focusP), aperture: .0022, maxblur: .008, bloom: .5, threshold: .82 });
      post.render(); return;
    }
    // ───────── 秋天森林 #17（61.1–66）
    if (st >= 61.1) {
      post.set({ scene: A, camera: aCam }); leaves.update(st, { fall: .35, sway: .6 }); kidAGlow.set(window.FEATHER || 0);
      momA.setPose('M1'); momA.position.set(-.45, 0, 0); momA.rotation.y = .5;
      kidA.setPose('D7A'); kidA.position.set(.35, 0, .2); kidA.rotation.y = -.45;
      // 羽毛從媽媽手邊飄到女孩胸前 / the feather drifts from mom to the girl's chest
      const k = ease(prog(st, 61.6, 64.2)); featA.visible = true;
      featA.position.set(lerp(-.2, .37, k), lerp(1.0, .78, k) + Math.sin(st * 3) * .03 * (1 - k), lerp(.25, .33, k)); featA.rotation.set(0, st * .5 * (1 - k), lerp(.8, .1, k));
      featA.userData.mat.emissiveIntensity = 1.2 + .6 * Math.sin(st * 4); featAL.position.copy(featA.position); featAL.intensity = .25;
      camAt(aCam, [[61.1, [0, 1.0, 3.6], [0, 1.0, 0], 34], [66, [.1, .95, 2.8], [0, .95, 0], 32]], st);
      fill(aL, aCam, 1.3);
      post.set({ focus: aCam.position.distanceTo(V(0, 1, .1)), aperture: .0022, maxblur: .008, bloom: .45, threshold: .85 });
      post.render(); return;
    }
    // ───────── 天空 #12–#16（44.4–61.1）
    post.set({ scene: K, camera: kCam });
    const autumn = prog(st, 57.5, 61);
    setSky(kSky, { top: valAt([[0, '#d9906a'], [57.5, '#d9906a'], [61, '#c46a48']], st), mid: valAt([[57.5, '#ffc98e'], [61, '#f29a5c']], st), bot: valAt([[57.5, '#ffe1b0'], [61, '#f7b67e']], st) });
    K.fog.color.set(valAt([[57.5, '#f4c896'], [61, '#e99a62']], st)); K.background.copy(K.fog.color); sea.userData.mat.color.set(valAt([[57.5, '#fff3e6'], [61, '#ffd7b4']], st));
    // 飛行路線：沿 -z 前進 / flight path along -z
    const dist = (st - 44.4) * 7;
    const up = easeOut(prog(st, 44.4, 48.1));   // #12 從地面飛上來
    const base = V(0, lerp(-8, 6, up), -dist);
    const bob = s => Math.sin(st * 1.6 + s) * .25;
    momF.setPose('M2'); kidF.setPose('D7C'); kidFGlow.set(window.FEATHER || 0);
    momF.position.set(base.x - 1.1, base.y + bob(0), base.z); kidF.position.set(base.x + .9, base.y - .3 + bob(1.3), base.z + .4);
    // 身體往前傾成飛行姿勢（朝 -z）/ tilt into a flying pose heading -z
    const tiltK = lerp(.3, 1.15, up);
    momF.rotation.set(-tiltK, Math.PI, 0); kidF.rotation.set(-tiltK, Math.PI, .1 * Math.sin(st));
    const flap = Math.sin(st * 4.2); wingM.children[0].rotation.x = .25 * flap; wingK.children[0].rotation.x = .3 * Math.sin(st * 5 + 1);
    wingM.visible = wingK.visible = true;
    // 鳥群 #15 從中間散開、#16 穿過 / flock bursts outward then streams past
    const bk = prog(st, 53.1, 56.5), bk2 = prog(st, 56.5, 61.1);
    flock.forEach((b, i) => { const a = hash(i + 900) * Math.PI * 2, e = (hash(i + 901) - .5) * 1.4, sp = 6 + hash(i + 902) * 10;
      const r = st < 56.5 ? easeOut(bk) * sp : sp + bk2 * 18 * (.5 + hash(i + 903));
      b.visible = st >= 53.1; b.position.set(base.x + Math.cos(a) * Math.cos(e) * r, base.y + 1 + Math.sin(e) * r * .7 + Math.sin(st * 3 + i) * .2, base.z - 3 + Math.sin(a) * Math.cos(e) * r * .6);
      b.rotation.set(-.2, -a + Math.PI / 2, Math.sin(st * 8 + i) * .3); b.children[0].scale.y = 1 + .25 * Math.sin(st * 9 + i); });
    const P = momF.position, Q = kidF.position, mid = P.clone().add(Q).multiplyScalar(.5);
    if (st < 48.1) camAt(kCam, [[44.4, [mid.x + 5, mid.y - 2, mid.z - 6], [mid.x, mid.y + 1, mid.z], 40], [48.1, [mid.x + 6, mid.y + 1, mid.z - 5], [mid.x, mid.y + .5, mid.z], 36]], st);
    else if (st < 50.8) camAt(kCam, [[48.1, [mid.x + 6.5, mid.y + .8, mid.z - 2], [mid.x, mid.y + .3, mid.z - 1], 32], [50.8, [mid.x + 6, mid.y + .8, mid.z - 1], [mid.x, mid.y + .3, mid.z - 1], 32]], st);
    else if (st < 53.1) { const d = (st - 50.8) * 30; camAt(kCam, [[50.8, [base.x, 22, base.z + 4 - d * 2], [base.x + 20, 12, base.z - 300], 44], [53.1, [base.x, 19, base.z + 2 - d * 2], [base.x + 20, 11, base.z - 300], 42]], st); }
    else camAt(kCam, [[53.1, [mid.x, mid.y + 1.2, mid.z - 7.5], [mid.x, mid.y + .6, mid.z], 42], [56.5, [mid.x, mid.y + 1.6, mid.z - 9], [mid.x, mid.y + .8, mid.z], 46], [61.1, [mid.x + 3, mid.y + 1, mid.z - 6], [mid.x, mid.y + .6, mid.z], 38]], st);
    fill(kL, kCam, 1.6);
    peaks.visible = false; K.fog.far = 420; K.fog.near = 60; momF.visible = !(st >= 50.8 && st < 53.1); kidF.visible = momF.visible;
    const mtn = st >= 50.8 && st < 53.1; if (mtn) { setSky(kSky, { sunDir: V(.9, .1, -1), sunGlow: .35, top: '#c9764a', mid: '#f4a86a' }); post.set({ sat: 1.25 }); } else setSky(kSky, { sunDir: V(.2, .06, -1), sunGlow: 1.0 }); post.set({ focus: mtn ? 200 : kCam.position.distanceTo(mid), aperture: mtn ? .0001 : .0012, maxblur: .006, bloom: mtn ? .45 : .55, threshold: mtn ? .85 : .82 });
    post.render();
  }
  return { dur: DUR, songStart: S0, frame, keys: ['seasons', 'grow', 'cry', 'temporary', 'love', 'fly', 'directions', 'again'] };
}
