// s06 — Bridge＋間奏（全曲 128.64–169.04 s；本地秒 t＝全曲秒 − 128.64）V02 改寫：照原 MV 順序
// 季節顏色：冬灰（餐廳）→ 冬夜藍（家門口、暴風夜空）→ 黑（間奏結尾全黑，接 s07 一盞燈的空餐桌）。圖卡變灰 cardGray＝.8
//   #39 128.64 When the moon is lookin' down → 學校餐廳長桌：同學全擠在另一頭，背對她笑、說悄悄話、有人回頭看她又轉回去；沒人跟她坐
//   #40 137.66 Shinin' light upon your ground → 冬夜，家門打開，她衝出去；站在雨裡，媽媽出現在門口；她跳起來飛走、媽媽也飛起來
//   #41 145.40 I'm flyin' up to let you see → 暴風夜空：她（D13D＋翅膀）被風吹得翻滾亂飛，媽媽（M2＋翅膀）從後面追上來、伸手
//   #42 153.20 That the shadow cast is me → 媽媽快追到她；她回頭看媽媽（臉部特寫各一）
//   間奏 159.5–169.04 → 閃電一道 → 全白（共兩下）→ 白光退去，媽媽的位置只剩白羽毛飄落 → 她一個人停在雨中看著 → 漸黑（168.6 全黑）
// 圖卡：#39–#42 是右上角小卡、畫面不讓位（SHOT_SHIFT＝0），臉避開右上角 420×300。這段不跳字（keys＝[]）。
import { THREE, V, C, prog, ease, easeOut, lerp, clamp, hash, makePost, makeChar, loadModel, skyDome, setSky, cloudField, hills, tree, motes, camAt, valAt, lightRig, pendantGlow } from '../engine/world.js';
import { rain } from './s05_room.js';
import { buildCafe, buildHouse, bolt, whiteFeathers, CAFE, handTip, backGlow } from './s06_set.js';

const S0 = 128.64, DUR = 40.4, M = '../../models/';
const T = { l39: 128.64, l40: 137.66, l41: 145.4, l42: 153.2, gap: 159.5, end: 169.04 };
const STRIKE = 160.6;   // 主閃電 / the main strike
function centerPivot(h) { const sz = h.userData.size; h.children[0].position.y -= sz.y / 2; }
function flyPose(o, yaw, pitch, roll = 0) { o.rotation.order = 'YXZ'; o.rotation.set(pitch, yaw, roll); }
const tri = (st, a, peak, half) => Math.max(0, 1 - Math.abs(st - a) / half) * peak;
// 畫面白光：#41 遠處一下（很淡）＋間奏先閃一下、再一道全白。全段共 3 下 / white flashes, three in total
function whiteAt(st) {
  const far = tri(st, 148.0, .16, .09);
  const pre = tri(st, 160.3, .38, .07);
  const main = st < 160.56 ? 0 : st < 160.66 ? prog(st, 160.56, 160.66) : st < 161.3 ? 1 : 1 - ease(prog(st, 161.3, 162.6));
  return Math.max(far, pre, main);
}

export async function setup({ renderer }) {
  // ════════ A. 學校餐廳 / the cafeteria ════════
  const cafe = await buildCafe(); const A = cafe.S;
  const girlA = await makeChar(M, { D13B: 'D13B.glb' }, { default: 1.25 }); A.add(girlA);
  const glowA = pendantGlow(girlA.pose('D13B'), .86, .16);
  const aCam = new THREE.PerspectiveCamera(40, 16 / 9, .03, 100);

  // ════════ H. 冬夜的家 / the house on a winter night ════════
  const H = new THREE.Scene(); H.background = C('#0f1628'); H.fog = new THREE.FogExp2('#131c32', .045);
  const hSky = skyDome(); H.add(hSky); setSky(hSky, { top: '#05080f', mid: '#141c32', bot: '#1f2a46', sunDir: V(0, .3, -1), sunCol: '#cfdcff', sunSize: 0, sunGlow: .2 });
  const hL = lightRig(H); hL.key.color.set('#9fb4e6'); hL.key.intensity = .9; hL.key.position.set(-8, 12, 10); hL.key.target.position.set(0, 0, 1);
  hL.rim.color.set('#7f9cff'); hL.rim.intensity = .6; hL.rim.position.set(4, 5, -8); hL.hemi.color.set('#4a5d8c'); hL.hemi.groundColor.set('#0b0f1a'); hL.hemi.intensity = .55;
  const yard = hills({ w: 120, d: 120, amp: .12, freq: .3, color: '#2c3446' }); H.add(yard);
  const house = buildHouse(H);
  for (let i = 0; i < 14; i++) { const x = (hash(i + 500) - .5) * 40, z = -4 - hash(i + 501) * 26; if (Math.abs(x) < 4.5 && z > -8) continue;
    const t = tree({ h: 5 + hash(i + 502) * 3, r: 1.2, seed: i + 500, trunk: '#2a2a34', tall: true }); t.position.set(x, 0, z); H.add(t); }
  const hClouds = cloudField({ n: 40, area: [120, 60], y: [14, 26], size: [20, 40], seed: 51, color: '#2a3550', opacity: .8 }); hClouds.position.z = -30; H.add(hClouds);
  const hRain = rain(900, [16, 12, 16]); H.add(hRain);
  const girlH = await makeChar(M, { D13A: 'D13A.glb', D13D: 'D13D.glb' }, { default: 1.55 }); H.add(girlH);
  const wingH = await loadModel(M + 'WINGS.glb', 1.9, { axis: 'xz' }); centerPivot(wingH); girlH.add(wingH); wingH.position.set(0, 1.22, -.13);
  const glowH = pendantGlow(girlH, 1.08, .12);
  const momH = await makeChar(M, { M1: 'M1.glb', M2: 'M2.glb' }, { default: 1.65 }); H.add(momH);
  const wingHM = await loadModel(M + 'WINGS.glb', 2.6, { axis: 'xz' }); centerPivot(wingHM); momH.add(wingHM); wingHM.position.set(0, 1.32, -.15);
  const hCam = new THREE.PerspectiveCamera(36, 16 / 9, .05, 500);

  // ════════ S. 暴風夜空 / the stormy night sky ════════
  const S = new THREE.Scene(); S.background = C('#0d1426'); S.fog = new THREE.FogExp2('#111a30', .018);
  const sSky = skyDome(); S.add(sSky); setSky(sSky, { top: '#04070f', mid: '#121a30', bot: '#1d2844', sunDir: V(0, .25, -1), sunCol: '#cfdcff', sunSize: 0, sunGlow: .3 });
  const sL = lightRig(S); sL.key.color.set('#c4d4ff'); sL.key.intensity = 1.3; sL.rim.color.set('#7f9cff'); sL.rim.intensity = .9; sL.hemi.color.set('#4a5d8c'); sL.hemi.groundColor.set('#0b0f1a'); sL.hemi.intensity = .5;
  sL.key.shadow.camera.left = -6; sL.key.shadow.camera.right = 6; sL.key.shadow.camera.top = 6; sL.key.shadow.camera.bottom = -6; sL.key.shadow.camera.updateProjectionMatrix();
  const storm = cloudField({ n: 260, area: [120, 170], y: [-30, 40], size: [10, 26], seed: 41, color: '#3a4766', opacity: .5 }); storm.position.z = -40; S.add(storm);
  const sRain = rain(1100, [24, 20, 24]); S.add(sRain);
  const boltL = new THREE.PointLight('#d8e4ff', 0, 90, 1.2); S.add(boltL);
  const boltM = bolt(); S.add(boltM);
  const girl = await makeChar(M, { D13D: 'D13D.glb' }, { default: 1.55 }); S.add(girl);
  const wingG = await loadModel(M + 'WINGS.glb', 1.9, { axis: 'xz' }); centerPivot(wingG); girl.add(wingG); wingG.position.set(0, 1.22, -.13);
  const glowS = pendantGlow(girl, 1.08, .12, .2);
  const mom = await makeChar(M, { M2: 'M2.glb' }, { default: 1.65 }); S.add(mom);
  const wingM = await loadModel(M + 'WINGS.glb', 2.6, { axis: 'xz' }); centerPivot(wingM); mom.add(wingM); wingM.position.set(0, 1.32, -.15);
  const feathers = whiteFeathers(18); feathers.forEach(f => S.add(f));
  const featL = new THREE.PointLight('#dfe6ff', 0, 4, 2); S.add(featL);
  const sCam = new THREE.PerspectiveCamera(36, 16 / 9, .05, 1200);
  const bgGlow = backGlow('#a9bcff', 34); S.add(bgGlow);
  // 手指尖（姿勢模型座標）：她 D13D 左右手、媽媽 M2 左右手 / fingertips in pose-model space
  const gHold = girl.pose('D13D'), mHold = mom.pose('M2');
  const GH = [handTip(gHold, -1), handTip(gHold, 1)], MH = [handTip(mHold, -1), handTip(mHold, 1)];
  // 夜空裡的角色和翅膀：關掉亮面高光（避免亮黑反光）/ matte the storm characters and wings (no glossy highlights)
  [gHold, mHold, wingG, wingM].forEach(h => h.userData.mats.forEach(m => { m.roughness = 1; m.metalness = 0; m.envMapIntensity = .3; }));

  const post = makePost(renderer, A, aCam);
  const fill = (L, cam, k = 1.2, col = '#c8d6ff', d = 6) => { L.fill.position.copy(cam.position).add(V(0, .25, 0)); L.fill.intensity = k; L.fill.distance = d; L.fill.color.set(col); };
  const headOf = (o, y, z = .04) => o.localToWorld(V(0, y, z));

  // 飛行路線（#41 起）/ the chase path
  const base = st => { const u = Math.min(st, STRIKE) - T.l41; return V(0, 4 + u * .35, -u * 3.2); };
  const gapAt = st => valAt([[145.4, 4.6], [153.2, 2.6], [159.5, 1.15], [160.6, 1.0]], Math.min(st, STRIKE));
  const gustAt = st => Math.sin(st * 1.7) + .6 * Math.sin(st * 3.1 + 1);

  function frame(t, st) {
    const wh = whiteAt(st);
    const dark = valAt([[159.5, 0], [164.5, .04], [166.5, .4], [168.6, 1]], st);
    const fadeK = Math.max(wh, dark), fadeCol = wh >= dark ? '#f2f6ff' : '#000000';

    // ───────── #39 學校餐廳（128.64–137.66）
    if (st < T.l40) {
      post.set({ scene: A, camera: aCam, sat: .36, tint: '#d4dae4', vig: .45, fade: 0, fadeCol: '#000000', t: st });
      girlA.setPose('D13B'); girlA.position.copy(CAFE.girl); girlA.rotation.y = 0; glowA.set(window.FEATHER || 0);
      // 同學：笑到肩膀抖、兩個講悄悄話、一個回頭看她又轉回去 / laughing, whispering, one looks back at her
      cafe.mates.forEach((m, i) => { const u = m.userData, b = u.body, lk = [.8, .4, .5, 1, .7, .9][i];
        b.position.y = Math.abs(Math.sin(st * 7.5 + i * 1.3)) * .022 * lk; b.rotation.x = -.05 + .07 * Math.sin(st * 7.5 + i * 1.3) * lk; b.rotation.z = 0; b.rotation.y = 0;
        u.head.rotation.set(.12 * Math.sin(st * 7.5 + i) * lk, 0, 0); m.rotation.y = u.base.yaw; });
      { const a = cafe.mates[1].userData, b = cafe.mates[2].userData, w = .5 + .5 * Math.sin(st * 1.3);   // 悄悄話：兩顆頭湊近 / heads together
        a.body.rotation.z = -.16 - .05 * w; b.body.rotation.z = .2 + .05 * w; a.head.rotation.z = -.2; b.head.rotation.z = .25; a.head.rotation.x = b.head.rotation.x = .1; }
      { const u = cafe.mates[5].userData, k = ease(prog(st, 133.2, 133.7)) * (1 - ease(prog(st, 134.6, 135.1)));   // 回頭看她 / looks back at her
        u.body.rotation.y = -1.0 * k; u.head.rotation.y = -1.25 * k; if (k > .05) { u.body.position.y = 0; u.body.rotation.x = -.04; u.head.rotation.x = .05; } }
      if (st < 132.4)        // #39a 大遠景：長桌兩端，中間一排空椅子 / wide: the long table, empty chairs between
        camAt(aCam, [[128.64, [-1.0, 2.9, 7.0], [-1.1, .6, -.5], 48, 'cut'], [132.4, [-.8, 2.7, 6.4], [-.9, .6, -.5], 47]], st);
      else if (st < 135.3)   // #39b 從她那一端看過去（近）：同學背對她笑，一個回頭看她 / from her end, close: one turns to look at her
        camAt(aCam, [[132.4, [1.3, 1.15, .6], [-3.0, 1.0, .3], 30, 'cut'], [135.3, [1.05, 1.13, .6], [-3.0, 1.0, .3], 28]], st);
      else                   // #39c 她一個人，低頭（臉部特寫）/ alone, head down — close-up
        camAt(aCam, [[135.3, [3.9, 1.05, .75], [3.4, .92, -.75], 34, 'cut'], [137.66, [3.8, 1.0, .55], [3.4, .92, -.75], 30]], st);
      const sh = st < 132.4 ? 0 : st < 135.3 ? 1 : 2;
      fill(cafe, aCam, [1.2, .8, 1.6][sh], '#eef2fa', [8, 4, 3][sh]);
      const fp = [V(1.5, .9, 0), V(-2.5, 1.0, .7), V(3.4, .95, -.75)][sh];
      post.set({ focus: aCam.position.distanceTo(fp), aperture: [.0006, .0012, .002][sh], maxblur: .007, bloom: .35, threshold: .9 });
      post.render(); return;
    }

    // ───────── #40 冬夜的家（137.66–145.4）
    if (st < T.l41) {
      post.set({ scene: H, camera: hCam, sat: .5, tint: '#b9c6ec', vig: .5, fade: tri(st, 137.66, 0, 1), fadeCol: '#000000', t: st });
      const door = ease(prog(st, 138.15, 138.55)); house.hinge.rotation.y = -door * 1.7; house.inL.intensity = 3.5 * door;
      const rk = ease(prog(st, 137.66, 141)); hRain.update(st, V(0, 4, 3), { wind: 3 + 6 * rk, speed: 22 }); hRain.material.opacity = .15 + .25 * rk;
      // 她：衝出門（D13A 滑步＋上下晃）→ 站在雨裡 → 跳起來、翅膀張開、飛走 / runs out, stands in the rain, leaps and flies
      const run = prog(st, 138.5, 140.7), runE = easeOut(run);
      const gp = V(lerp(0, -1.5, runE), 0, lerp(-.4, 3.3, runE));
      const fly = st >= 144.4, up = Math.pow(prog(st, 144.45, 145.4), 1.6);
      // 翅膀從背上慢慢長出來（143.75–144.35，約 0.6 秒，照 s02 #8）/ wings grow out of her back over 0.6 s
      const wg = easeOut(prog(st, 143.75, 144.35)) * (1 + .12 * Math.sin(Math.PI * prog(st, 144.0, 144.5)));
      girlH.setPose(fly ? 'D13D' : 'D13A'); wingH.visible = st >= 143.75; glowH.set(Math.max(window.FEATHER || 0, .25));
      wingH.scale.set(Math.max(.01, wg), Math.max(.01, wg), 1); wingH.children[0].rotation.x = (fly ? .4 : .1) * Math.sin(st * 7);
      const bob = run > 0 && run < 1 ? Math.abs(Math.sin(st * 13)) * .07 : 0;
      girlH.position.set(gp.x, bob + up * 4.5, gp.z + up * 1.5); girlH.visible = st >= 138.45;
      if (fly) flyPose(girlH, .15, -.25 - up * .35, 0);
      else { girlH.rotation.set(run > 0 && run < 1 ? .12 : 0, run < 1 ? -.38 : st >= 143.7 ? -.35 : .1, 0); }
      // 媽媽：門口出現 → 也飛起來 / mom appears in the doorway, then takes off after her
      const momFly = st >= 144.85, mUp = Math.pow(prog(st, 144.9, 145.4), 1.6);
      momH.setPose(momFly ? 'M2' : 'M1'); momH.visible = st >= 141.9; wingHM.visible = st >= 144.25;
      const mw = ease(prog(st, 141.9, 143.2)), mw2 = ease(prog(st, 143.7, 144.6));   // 走出門口，再往院子走幾步 / out the door, then a few steps into the yard
      momH.position.set(lerp(0, -.3, mw) + lerp(0, .7, mw2) - mUp * .5, mUp * 3.0, lerp(-.15, .9, mw) + lerp(0, 1.1, mw2) + mUp * 1.4);
      { const g2 = easeOut(prog(st, 144.25, 144.85)); wingHM.scale.set(Math.max(.01, g2), Math.max(.01, g2), 1); wingHM.children[0].rotation.x = (momFly ? .3 : .08) * Math.sin(st * 6); }
      if (momFly) flyPose(momH, -.2, -.3, 0); else momH.rotation.set(0, -.25, 0);
      if (st < 140.9)        // #40a 家門打開，她衝出來 / the door bursts open
        camAt(hCam, [[137.66, [2.4, 1.25, 7.4], [-.2, 1.25, .4], 36, 'cut'], [140.9, [2.0, 1.2, 6.8], [-.8, 1.1, 1.6], 38]], st);
      else if (st < 143.7)   // #40b 她站在雨中（臉），門口的媽媽 / she stands in the rain; mom at the door behind
        camAt(hCam, [[140.9, [-1.05, 1.05, 5.25], [-1.25, 1.32, 3.3], 34, 'cut'], [143.7, [-1.0, 1.0, 5.0], [-1.2, 1.35, 3.3], 32]], st);
      else                   // #40c 她跳起來飛走，媽媽追出來 / she leaps into the sky, mom follows
        camAt(hCam, [[143.7, [-4.6, 1.0, 8.6], [-1.0, 1.6, 2.4], 42, 'cut'], [145.4, [-4.8, 1.1, 9.0], [-1.1, 2.9, 2.6], 46]], st);
      fill(hL, hCam, st < 140.9 ? 40 : st < 143.7 ? 2.2 : 40, '#c8d6ff', st < 140.9 ? 12 : st < 143.7 ? 4 : 14);
      const fp = st < 140.9 ? girlH.position.clone().add(V(0, 1.2, 0)) : st < 143.7 ? V(-1.5, 1.4, 3.3) : girlH.position.clone().add(V(0, 1.2, 0));
      post.set({ focus: hCam.position.distanceTo(fp), aperture: .0014, maxblur: .007, bloom: .55, threshold: .8 });
      post.render(); return;
    }

    // ───────── #41、#42、間奏：暴風夜空（145.4–169.04）
    post.set({ scene: S, camera: sCam, sat: valAt([[145.4, .5], [159.5, .46], [168, .34]], st), tint: valAt([[145.4, '#b4c4f0'], [159.5, '#aab8e4'], [169, '#8c98c0']], st), vig: .5, fade: fadeK, fadeCol, t: st });
    const after = st >= 160.9;                       // 白光之後：媽媽不見了 / after the white: mom is gone
    const B = base(st), gap = gapAt(st), gust = st < T.gap ? gustAt(st) : gustAt(st) * .25;
    const tumble = Math.PI * 2 * ease(prog(st, 150.3, 151.6));
    // 她的位置 / her position
    const G = after ? base(STRIKE).add(V(.7 * gustAt(STRIKE), .25 * Math.sin(STRIKE * 2.3), 0)).add(V(0, .12 * Math.sin(st * 1.3), 0))
                    : B.clone().add(V(.7 * gust * (st < T.l42 ? 1 : .45), .25 * Math.sin(st * 2.3), 0));
    girl.setPose('D13D'); girl.position.copy(G); glowS.set(Math.max(window.FEATHER || 0, .3));
    // 回頭：#42 起轉身看媽媽 / she twists round to look back at mom from #42
    const look = ease(prog(st, 153.4, 154.6));
    const gapShot = st >= T.gap && !after;          // 間奏 a：兩人拉開，看得到兩個人 / interlude a: spread apart
    if (after) flyPose(girl, .35, .12, .04 * Math.sin(st * .9));
    else if (gapShot) flyPose(girl, .45, .25, .1 * Math.sin(st * 1.1));
    else if (st >= 156.3) flyPose(girl, .35, .3, .1 * Math.sin(st * 1.1));   // #42b/c 轉身朝媽媽 / turned toward mom
    else flyPose(girl, lerp(Math.PI + .3 * Math.sin(st * 1.3), 1.35, look), lerp(.95 + .3 * Math.sin(st * 2.1), .3, look), lerp(.5 * gust + tumble, .12 * Math.sin(st * 1.1), look));
    wingG.children[0].rotation.x = (after ? .15 : .45) * Math.sin(st * (after ? 2.6 : 6.5));
    // 媽媽：在後面追，一隻手往前伸 / mom chasing, one arm reaching forward
    mom.setPose(after ? null : 'M2');
    const IOFF = V(0, -.9, 1.3);   // 間奏 a 媽媽的位置往下、往後拉開 / interlude-a offset so both read
    const Mo = B.clone().add(V(-.3 + .2 * Math.sin(st * .9), -.3 + .12 * Math.sin(st * 1.7), gap)); if (st >= T.gap) Mo.add(IOFF);
    mom.position.copy(Mo); const reach = ease(prog(st, 152.5, 154.5));
    flyPose(mom, Math.PI + .08 * Math.sin(st * .8), lerp(1.15, .75, reach), .6 + .06 * Math.sin(st * 1.4));
    wingM.children[0].rotation.x = .3 * Math.sin(st * 5.2 + 1);
    // 雨、雲、閃電光 / rain, clouds, lightning light
    sRain.update(st, G, { wind: after ? 3 : 8, speed: after ? 18 : 24 }); sRain.material.opacity = after ? .25 : .35;
    sL.key.position.copy(G).add(V(10, 30, -20)); sL.key.target.position.copy(G);
    sL.hemi.intensity = .5 + wh * 2.2; boltL.position.copy(G).add(V(-8, 9, -10)); boltL.intensity = (st < 150 ? tri(st, 148.0, 1, .12) : wh) * 700;
    boltM.visible = st > 160.15 && st < 160.95; boltM.position.copy(base(STRIKE)).add(V(-30, 17, -17)); boltM.scale.setScalar(2.2); boltM.userData.mat.opacity = st < 160.5 ? (st < 160.42 ? 1 : 0) : 1;   // 遠在她們右後方 / far behind them
    // 白羽毛從媽媽原本的位置飄落 / white feathers drift down where mom was
    const P0 = base(STRIKE).add(V(-.3, .5, gapAt(STRIKE))).add(IOFF);
    feathers.forEach((f, i) => { f.visible = after; if (!after) return; const u = st - 160.9, sp = .2 + .12 * hash(i + 810);
      f.position.set(P0.x + (hash(i + 811) - .5) * 1.6 + Math.sin(st * 1.1 + i) * .3, P0.y + (hash(i + 812) - .5) * .9 - u * sp, P0.z + (hash(i + 813) - .5) * 1.2 + Math.cos(st * .9 + i * 2) * .2);
      f.rotation.set(Math.sin(st * 1.3 + i) * .9, st * .4 + i, Math.sin(st * 1.7 + i * 1.3) * 1.1); f.userData.mat.emissiveIntensity = .35 * (1 - prog(st, 165, 168.5)); });
    featL.position.copy(P0).add(V(0, -.8, .8)); featL.intensity = after ? 1.2 * (1 - prog(st, 165, 168.5)) : 0;

    // 側面中遠景的光：冬夜藍主光照得到衣服顏色＋背後藍白輪廓光 / side-shot lighting: blue key keeps costume colours, blue-white rim from behind
    sL.key.intensity = 1.3; sL.rim.intensity = .9; sL.rim.color.set('#7f9cff'); sL.rim.position.set(0, 1, 0); sL.rim.target.position.set(0, 0, 0); bgGlow.material.opacity = 0;
    const sideLight = target => { const back = target.clone().sub(sCam.position).setY(0).normalize();
      sL.key.intensity = 1.8; sL.key.position.copy(target).add(V(4, 12, 6)); sL.key.target.position.copy(target);
      sL.rim.position.copy(target).add(back.multiplyScalar(10)).add(V(0, 4, 0)); sL.rim.target.position.copy(target); sL.rim.intensity = 4.5; sL.rim.color.set('#d6e4ff');
      fill(sL, sCam, 26, '#c8d6ff', 12); };
    if (st >= 156.3 && st < 157.9) girl.position.add(V(0, .15, -.8));   // #42b 兩人之間留清楚的距離 / keep a clear gap
    const mid = girl.position.clone().add(Mo).multiplyScalar(.5);
    let fp = mid, ap = .0014;
    if (st < 149.3) {        // #41a 側面大鏡：她在前面翻、媽媽在後面追 / side wide: she tumbles ahead, mom chases
      camAt(sCam, [[145.4, [mid.x + 7.6, mid.y + .7, mid.z - 1.0], [mid.x, mid.y + 1.1, mid.z - .9], 40, 'cut'], [149.3, [mid.x + 6.8, mid.y + .6, mid.z - 1.0], [mid.x, mid.y + 1.1, mid.z - .9], 38]], st);
      fill(sL, sCam, 30, '#c8d6ff', 14);
    } else if (st < T.l42) { // #41b 從媽媽背後追著看她 / over mom's shoulder, chasing her
      camAt(sCam, [[149.3, [G.x + 1.8, G.y - .9, G.z - 4.2], [mid.x, mid.y + .4, mid.z], 42, 'cut'], [T.l42, [G.x + 1.6, G.y - .8, G.z - 3.8], [mid.x, mid.y + .4, mid.z], 40]], st);
      fill(sL, sCam, 30, '#c8d6ff', 14);
    } else if (st < 156.3) { // #42a 前側面：媽媽伸手快碰到，她回頭 / front-side two-shot: mom reaching, she looks back
      camAt(sCam, [[T.l42, [mid.x + 4.2, mid.y + .9, mid.z - 3.6], [mid.x, mid.y + .55, mid.z], 36, 'cut'], [156.3, [mid.x + 3.6, mid.y + .8, mid.z - 3.0], [mid.x, mid.y + .6, mid.z], 34]], st);
      fill(sL, sCam, 14, '#c8d6ff', 9);
    } else if (st < 157.9) { // #42b 她回頭的側背剪影，媽媽在後面伸手追來（逆光）/ over her shoulder, silhouettes: mom reaching behind her
      girl.updateMatrixWorld(true); mom.updateMatrixWorld(true);
      const hd = headOf(girl, 1.38, .02), mh = headOf(mom, 1.5, .04), fd = V(0, 0, 1).applyEuler(girl.rotation), sd = V(-fd.z, 0, fd.x);
      // 側面中遠景：媽媽在左後方伸手，她在右前方回頭 / side medium-wide: mom reaching at left, she looks back at right
      const lk = mid.clone().add(V(0, .55, 0));
      camAt(sCam, [[156.3, [lk.x + 5.6, lk.y + .35, lk.z - .1], [lk.x, lk.y, lk.z], 36, 'cut'], [157.9, [lk.x + 5.2, lk.y + .3, lk.z - .1], [lk.x, lk.y, lk.z], 36]], st);
      sideLight(lk); fp = lk; ap = .0008;
    } else if (st < T.gap) { // #42c 兩隻手快碰到（手部特寫，側面逆光）/ the two hands almost touching
      // 媽媽往前伸的那隻手；把她的位置對到那隻手前面一點 / mom's forward hand; place the girl so her hand is just out of reach
      flyPose(mom, Math.PI - 1.1, .45, .1);   // 側身朝鏡頭，一隻手伸向她（翅膀在背後）/ side-on, one arm toward her, wings behind
      mom.updateMatrixWorld(true); const mA = mHold.localToWorld(MH[0].clone()), mB = mHold.localToWorld(MH[1].clone()), mh = mA.z < mB.z ? mA : mB;
      flyPose(girl, Math.PI / 2 - .45, .3, .1); girl.position.set(0, 0, 0);   // 側身朝鏡頭、回頭伸手（翅膀在她背後，不擋手）/ side-on, wings behind her so they don't hide the hands girl.updateMatrixWorld(true);
      const gA = gHold.localToWorld(GH[0].clone()), gB = gHold.localToWorld(GH[1].clone()), gh = gA.z > gB.z ? gA : gB;   // 她伸向後面的那隻手 / her hand toward mom
      const gapH = lerp(.34, .1, ease(prog(st, 157.9, 159.3)));
      girl.position.copy(mh).add(V(.02, .05, -gapH)).sub(gh); girl.updateMatrixWorld(true);
      const hm = mh.clone().add(V(0, .02, -gapH / 2));
      // 同一側面再近一點：鏡頭對準兩隻手之間的空隙 / same side, closer: framed on the gap between the hands
      const cx = Math.max(girl.position.x, Mo.x, hm.x);
      camAt(sCam, [[157.9, [cx + 4.6, hm.y + .1, hm.z], [hm.x, hm.y, hm.z], 34, 'cut'], [T.gap, [cx + 4.2, hm.y + .1, hm.z], [hm.x, hm.y, hm.z], 33]], st);
      sideLight(hm); fp = hm; ap = .0012;
    } else if (!after) {     // 間奏 a：兩人同框，遠處閃電 / both in frame, the bolt far behind
      const lk = mid.clone().add(V(0, .5, 0));   // 側面中遠景，兩人分開 / side medium-wide, the two apart
      camAt(sCam, [[T.gap, [lk.x + 7.0, lk.y + .5, lk.z], [lk.x, lk.y, lk.z], 36, 'cut'], [160.9, [lk.x + 6.7, lk.y + .5, lk.z], [lk.x, lk.y, lk.z], 36]], st);
      sideLight(lk);
    } else if (st < 164.8) { // 間奏 b：羽毛飄落，她看著 / feathers falling, she watches
      camAt(sCam, [[160.9, [G.x + 3.0, G.y + .55, G.z + 1.9], [G.x - .2, G.y + .55, G.z + .55], 36, 'cut'], [164.8, [G.x + 3.3, G.y + .65, G.z + 2.2], [G.x - .2, G.y + .45, G.z + .6], 36]], st);
      fill(sL, sCam, 14, '#c8d6ff', 7); fp = G.clone().add(V(0, 1.2, .3));
    } else {                 // 間奏 c：拉遠，她一個人在雨裡，漸黑 / pull back: alone in the rain, fade to black
      camAt(sCam, [[164.8, [G.x + 5.5, G.y + 1.6, G.z + 5.5], [G.x, G.y + .6, G.z + .4], 38, 'cut'], [T.end, [G.x + 9.5, G.y + 3.4, G.z + 9.0], [G.x, G.y + .4, G.z + .4], 40]], st);
      fill(sL, sCam, 30, '#c8d6ff', 18); fp = G;
    }
    post.set({ focus: sCam.position.distanceTo(fp), aperture: ap, maxblur: .007, bloom: .55, threshold: .78 });
    post.render();
  }
  return { dur: DUR, songStart: S0, frame, keys: [], cardGray: () => .8 };
}
