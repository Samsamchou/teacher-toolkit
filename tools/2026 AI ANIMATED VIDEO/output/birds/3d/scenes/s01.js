// s01 — 前奏＋Verse 1（全曲 0–32.5 s；songStart 0 → 本地秒＝全曲秒）
// 季節顏色：冬霧藍（回憶開場）→ 春綠（#1–#3）→ 夏金（#4–#6）
//   前奏 0–8      霧中森林，鏡頭貼地往前穿過樹幹，光束；片名 Birds 浮現
//   前奏 8–17.3   長大的她（A30）走在樹之間，停下，胸前青綠羽毛發光 → 白光轉場進回憶
//   #1 17.36 兩顆光點（一大一小）靠在一起、像心跳一樣一起亮（Two hearts, one valve）
//   #2 20.86 低角度：小女孩（D7B）舉手牽著媽媽（M1）走，手的地方有暖光
//   #3 23.24 從孩子的高度往上看媽媽，樹葉光斑
//   #4 24.86 大遠景：兩人走上山坡，鏡頭慢慢升起，夕陽
//   #5 28.86 女孩跌坐（D7D）→ 媽媽跪下張開手（M3）
//   #6 31.22 逆光：媽媽跪著面對女孩（D7A），輪廓金光
import { THREE, V, C, prog, ease, lerp, clamp, hash, makePost, makeChar, poseAt, skyDome, setSky, cloudField, hills, groundY, tree, motes, camAt, valAt, lightRig, feather, pendantGlow, umbrella } from '../engine/world.js';

const DUR = 32.5, M = '../../models/';
export async function setup({ renderer }) {
  // ════════ F. 霧中森林 / misty forest ════════
  const F = new THREE.Scene(); F.background = C('#9fb2c4'); F.fog = new THREE.FogExp2('#a9bccd', .045);
  const fSky = skyDome(); F.add(fSky); setSky(fSky, { top: '#7d93ad', mid: '#b8c8d6', bot: '#c9d4dc', sunDir: V(.3, .5, -1), sunCol: '#fff6e0', sunSize: .0, sunGlow: .25 });
  const fL = lightRig(F); fL.hemi.intensity = 1.0; fL.key.position.set(6, 14, -10); fL.key.intensity = 1.6; fL.key.color.set('#fff1d8'); fL.rim.position.set(-4, 6, -12);
  const fGround = hills({ w: 120, d: 160, amp: .25, freq: .2, color: '#6d7d6a' }); F.add(fGround);
  const fTrees = [];
  for (let i = 0; i < 90; i++) { const x = (hash(i) - .5) * 40, z = 14 - hash(i + 9) * 70; if (Math.abs(x) < 1.6 + hash(i + 3)) continue;
    const t = tree({ h: 14 + hash(i + 5) * 8, tall: true, trunk: '#4a4038', seed: i }); t.position.set(x, 0, z); t.scale.setScalar(.8 + hash(i + 7) * .6); F.add(t); fTrees.push(t); }
  // 光束：斜斜的半透明長方體 / god rays
  const rays = []; for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(.9, 30, .9), new THREE.MeshBasicMaterial({ color: '#fff3d0', transparent: true, opacity: .07, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    m.position.set(-6 + i * 2.2, 10, -4 - i * 5); m.rotation.set(.0, 0, .45); F.add(m); rays.push(m); }
  const fMotes = motes({ n: 500, area: [16, 6, 40], color: '#fff6d8', size: .05, seed: 2 }); fMotes.position.set(0, 0, -6); F.add(fMotes);
  const adult = await makeChar(M, { A30: 'A30.glb' }, { default: 1.66 }); F.add(adult);
  // 胸前羽毛的光 / pendant glow
  const pend = new THREE.PointLight('#5ff2df', 0, .5, 2); F.add(pend);
  const pendGlow = new THREE.Mesh(new THREE.SphereGeometry(.012, 12, 8), new THREE.MeshBasicMaterial({ color: '#8ffff0', transparent: true, opacity: 0 })); F.add(pendGlow);
  // #1 兩顆光點 / two hearts of light
  const orbs = [0, 1].map(i => { const g = new THREE.Group(); const s = new THREE.Mesh(new THREE.SphereGeometry(i ? .16 : .26, 24, 16), new THREE.MeshBasicMaterial({ color: i ? '#ffd9a8' : '#ffe9c4', fog: false }));
    const l = new THREE.PointLight(i ? '#ffc98a' : '#ffe2b0', 0, 8, 2); g.add(s, l); g.userData = { s, l }; F.add(g); return g; });
  const fCam = new THREE.PerspectiveCamera(35, 16 / 9, .05, 500);

  // ════════ H. 山坡（春→夏）/ the hillside ════════
  const Hs = new THREE.Scene(); Hs.background = C('#f0c79a'); Hs.fog = new THREE.Fog('#f1d2ae', 40, 220);
  const hSky = skyDome(); Hs.add(hSky);
  const hL = lightRig(Hs);
  const hGround = hills({ w: 260, d: 260, amp: 2.4, freq: .045, color: '#7aa24e' }); Hs.add(hGround);
  const hTrees = []; for (let i = 0; i < 70; i++) { const x = (hash(i + 300) - .5) * 160, z = -20 - hash(i + 301) * 120; const t = tree({ h: 5 + hash(i) * 4, r: 1.5 + hash(i + 2), seed: i + 300, crown: '#5f8f45' });
    t.position.set(x, groundY(x, z, { amp: 2.4, freq: .045 }) - .2, z); Hs.add(t); hTrees.push(t); }
  for (let i = 0; i < 18; i++) { const x = (hash(i + 500) - .5) * 60, z = 6 - hash(i + 501) * 20; if (Math.abs(x) < 4) continue; const t = tree({ h: 5 + hash(i + 502) * 3, r: 1.6, seed: i + 500 });
    t.position.set(x, groundY(x, z, { amp: 2.4, freq: .045 }) - .2, z); Hs.add(t); hTrees.push(t); }
  const clouds = cloudField({ n: 26, area: [300, 120], y: [28, 45], size: [24, 46], seed: 4, opacity: .75 }); clouds.position.z = -120; Hs.add(clouds);
  const hMotes = motes({ n: 260, area: [24, 5, 24], color: '#fff0c0', size: .05, seed: 5 }); Hs.add(hMotes);
  const mom = await makeChar(M, { M1: 'M1.glb', M2: 'M2.glb', M3: 'M3.glb' }, { M1: 1.65, M2: 1.65, M3: 1.17 }); Hs.add(mom);
  const kid = await makeChar(M, { D7A: 'D7A.glb', D7B: 'D7B.glb', D7C: 'D7C.glb', D7D: 'D7D.glb' }, { D7A: 1.17, D7B: 1.24, D7C: 1.17, D7D: .66 }); Hs.add(kid);
  const handGlow = new THREE.PointLight('#ffd08a', 0, 1.5, 2); Hs.add(handGlow);
  const kidGlow = pendantGlow(kid, .79, .12);
  const umb = umbrella({ r: .78, color: '#e8743a', stick: 1.05 }); umb.visible = false; Hs.add(umb);   // #4 共撐一把傘
  const hCam = new THREE.PerspectiveCamera(35, 16 / 9, .05, 600);
  const gy = (x, z) => groundY(x, z, { amp: 2.4, freq: .045 });

  const post = makePost(renderer, F, fCam);
  const keys = ['seasons'];   // s01 沒有學習單關鍵字；保留空陣列也可 / no keywords in verse 1

  function frame(t, st) {
    // ── 季節調色（整個畫面）/ season grade ──
    const sat = valAt([[0, .5], [16.6, .55], [17.6, 1], [32.5, 1.05]], st);
    const tint = valAt([[0, '#d6e4ff'], [16.6, '#dfe8ff'], [17.6, '#f3fff0'], [24.6, '#f6ffe8'], [26.5, '#fff0d8'], [32.5, '#ffe6c4']], st);
    const flash = Math.max(Math.sin(Math.PI * prog(st, 16.5, 17.7)), 0);   // 白光轉場進回憶
    post.set({ sat, tint, vig: .38, fade: flash * .9, fadeCol: '#fff8ec', t: st });

    if (st < 24.86) { // ───────── 森林（前奏、#1）或山坡近景（#2、#3）
      if (st < 20.86) {
        post.set({ scene: F, camera: fCam });
        // 前奏：冬霧 → #1 春綠 / misty blue → spring green
        const spring = prog(st, 17.0, 18.6);
        F.fog.color.set(valAt([[0, '#a9bccd'], [17, '#a9bccd'], [18.6, '#b9d6a8']], st)); F.background.copy(F.fog.color);
        F.fog.density = lerp(.045, .03, spring);
        setSky(fSky, { top: valAt([[0, '#7d93ad'], [17, '#7d93ad'], [18.6, '#8fbf86']], st), mid: valAt([[0, '#b8c8d6'], [18.6, '#d8ecbc']], st) });
        fGround.material.color.set(valAt([[0, '#6d7d6a'], [17, '#6d7d6a'], [18.6, '#6f9a48']], st));
        fL.hemi.color.set(valAt([[0, '#cfe3ff'], [18.6, '#e4ffd0']], st));
        rays.forEach((r, i) => { r.material.opacity = .05 + .03 * Math.sin(st * .7 + i); });
        fMotes.update(st, { fall: .05, sway: .25 });
        // 長大的她：8–14 往前走（輕微起伏），14 停下 / the grown daughter walks then stops
        const walk = prog(st, 8.5, 14.2), z = lerp(4.5, 0, walk);
        adult.setPose(st >= 8 && st < 17.3 ? 'A30' : null);
        adult.position.set(.2, Math.abs(Math.sin(walk * Math.PI * 7)) * .015 * (walk < 1 ? 1 : 0), z); adult.rotation.y = -.15;
        const glowK = prog(st, 14.5, 16.4); pend.intensity = 0; pendGlow.material.opacity = glowK * .85; pendGlow.scale.setScalar(1 + .4 * Math.sin(st * 3));
        pend.position.set(.2, 1.27, z + .14); pendGlow.position.copy(pend.position);
        // #1 兩顆光點靠近、心跳 / two orbs drift together and pulse
        const o = prog(st, 17.36, 19.6), beat = .5 + .5 * Math.pow(Math.max(0, Math.sin((st - 17.36) * Math.PI * 2 * 1.05)), 6);
        orbs.forEach((g, i) => { const on = st >= 17.2 ? 1 : 0; g.visible = !!on;
          g.position.set(lerp(i ? .9 : -.9, i ? .17 : -.2, ease(o)), 1.5 + .06 * Math.sin(st * 1.3 + i * 2), -1);
          g.userData.l.intensity = on * (2 + 4 * beat); g.userData.s.scale.setScalar(1 + .18 * beat); });
        // 鏡頭 / camera
        const look = camAt(fCam, [
          [0, [0, .7, 14], [0, 1.4, -10], 38], [8, [.4, 1.0, 9], [0, 1.3, 0], 34],
          [8.01, [2.4, 1.3, 6.5], [.2, 1.2, 3], 30, 'cut'], [14, [1.4, 1.35, 2.6], [.2, 1.25, 0], 30],
          [14.01, [.7, 1.4, 2.0], [.2, 1.35, 0], 26, 'cut'], [17.3, [.6, 1.38, 1.6], [.2, 1.33, 0], 24],
          [17.31, [0, 1.5, 2.6], [0, 1.5, -1], 34, 'cut'], [20.86, [0, 1.5, 1.9], [0, 1.5, -1], 32]], st);
        post.set({ focus: fCam.position.distanceTo(st < 8 ? V(0, 1.4, 3) : st < 17.3 ? V(.2, 1.3, adult.position.z) : V(0, 1.5, -1)), aperture: .0015, maxblur: .007, bloom: lerp(.4, .6, prog(st, 14, 17)), threshold: .82 });
        post.render(); return;
      }
      // #2 小手牽大手、#3 媽媽低頭 / small hand in big hand; mom looks down
      post.set({ scene: Hs, camera: hCam });
      setHill(st);
      const along = prog(st, 20.86, 24.86);
      mom.setPose('M1'); kid.setPose('D7B');
      const mx = lerp(-1.0, .2, along); mom.position.set(mx + .38, gy(mx, 0), -.1); mom.rotation.y = .35;
      kid.position.set(mx, gy(mx, .25), .25); kid.rotation.y = .1;
      handGlow.position.set(mx - .05, 1.25, .45); handGlow.intensity = st < 23.24 ? .8 : 0;
      if (st < 23.24) camAt(hCam, [[20.86, [mx - .1, .55, 2.5], [mx + .2, 1.05, 0], 32], [23.24, [mx - .05, .6, 2.3], [mx + .2, 1.1, 0], 32]], st);   // 圖卡出現時 camAt 會自動平移
      else { mom.rotation.y = -.25; camAt(hCam, [[23.24, [mx + .15, .95, 1.25], [mx + .38, 1.52, -.1], 32], [24.86, [mx + .2, .98, 1.15], [mx + .38, 1.55, -.1], 30]], st); }
      fillAtCam();
      kidGlow.set(window.FEATHER || 0);
      post.set({ focus: st < 23.24 ? 2.1 : 1.35, aperture: .002, maxblur: .008, bloom: .4, threshold: .85 });
      hMotes.position.set(mx, gy(mx, 0), 0); hMotes.update(st);
      post.render(); return;
    }
    // ───────── 山坡 #4–#6
    post.set({ scene: Hs, camera: hCam }); setHill(st);
    hMotes.update(st); kidGlow.set(kid.userData.poses.D7D && kid.userData.poses.D7D.visible ? 0 : (window.FEATHER || 0));
    umb.visible = st >= 24.86 && st < 28.86;
    if (st < 28.86) {   // #4 大遠景走上山坡 / wide: walking up the hill
      const k = prog(st, 24.86, 28.86); const x = lerp(-6, 2, k), z = lerp(4, -6, k);
      mom.setPose('M1'); kid.setPose(Math.floor(st * 3) % 2 ? 'D7B' : 'D7A');   // 走路：每 1/3 秒換一次姿勢（定格感）
      mom.position.set(x + .45, gy(x + .45, z) + Math.abs(Math.sin(st * 6)) * .02, z); mom.rotation.y = -.9;
      umb.position.set(x + .28, mom.position.y + 2.0, z + .12); umb.rotation.set(-.08, 0, .12);
      kid.position.set(x, gy(x, z + .3) + Math.abs(Math.sin(st * 6 + 1)) * .02, z + .3); kid.rotation.y = -.9; handGlow.intensity = 0;
      const cx = x + .2, cz = z + .15, cyy = gy(cx, cz); camAt(hCam, [[24.86, [cx - 3.2, cyy + .9, cz + 4.2], [cx, cyy + .9, cz], 30], [28.86, [cx - 2.4, cyy + 2.2, cz + 4.6], [cx, cyy + .9, cz], 32]], st);
      hMotes.position.set(x, gy(x, z), z); fillAtCam();
      post.set({ focus: hCam.position.distanceTo(mom.position), aperture: .0008, maxblur: .004, bloom: .45, threshold: .85 });
      post.render(); return;
    }
    // #5 跌倒、媽媽跪下 / #6 逆光面對面
    const X = 2, Z = -6, y = gy(X, Z);
    if (st < 31.22) {
      kid.setPose('D7D'); kid.position.set(X, gy(X, Z), Z); kid.rotation.y = .9;
      mom.setPose(st < 29.7 ? 'M1' : 'M3'); mom.position.set(X - 1.1, gy(X - 1.1, Z - .3), Z - .3); mom.rotation.y = st < 29.7 ? 2.2 : 1.35;
      camAt(hCam, [[28.86, [X + 2.6, y + .9, Z + 3.0], [X - .4, y + .6, Z - .1], 34], [31.22, [X + 2.2, y + .8, Z + 2.6], [X - .5, y + .55, Z - .1], 32]], st);
      fillAtCam(1.6);
      post.set({ focus: hCam.position.distanceTo(V(X - .4, y + .6, Z)), aperture: .0022, maxblur: .008, bloom: .45, threshold: .85 });
    } else {
      kid.setPose('D7A'); kid.position.set(X, gy(X, Z), Z); kid.rotation.y = -1.25;
      mom.setPose('M3'); mom.position.set(X - 1.05, gy(X - 1.05, Z), Z); mom.rotation.y = 1.3;
      // 鏡頭在側面偏後，夕陽在兩人中間 / side-on, sun between them
      camAt(hCam, [[31.22, [X - .3, y + .72, Z + 3.4], [X - .3, y + .75, Z - 3], 32], [32.5, [X - .3, y + .74, Z + 3.0], [X - .3, y + .77, Z - 3], 30]], st);
      hL.fill.intensity = 4; hL.fill.position.set(X - .4, y + 1.2, Z + 1.6);
      post.set({ focus: 3.2, aperture: .0022, maxblur: .008, bloom: .55, threshold: .8 });
    }
    hMotes.position.set(X, y, Z);
    post.render();
  }
  // 臉部補光跟著鏡頭（要在鏡頭定位之後）/ face fill after the camera is placed
  function fillAtCam(k = 1.2) { hL.fill.position.copy(hCam.position).add(V(0, .3, 0)); hL.fill.intensity = k; }
  // 山坡的季節：#2–#3 春綠，#4 起轉夏日黃昏金 / hill season: spring green → summer gold
  function setHill(st) {
    const g = prog(st, 24.6, 27.5);
    setSky(hSky, { top: valAt([[20, '#8ab6d6'], [24.6, '#8ab6d6'], [27.5, '#e6a170']], st), mid: valAt([[20, '#cfe6c8'], [24.6, '#cfe6c8'], [27.5, '#ffcf92']], st), bot: valAt([[20, '#e2f0d0'], [27.5, '#ffe0ae']], st),
      sunDir: V(lerp(.5, .05, g), lerp(.6, .07, g), -1), sunCol: '#fff3d0', sunSize: lerp(.0, .012, g), sunGlow: lerp(.3, .9, g) });
    Hs.fog.color.set(valAt([[20, '#dfeccf'], [24.6, '#dfeccf'], [27.5, '#e9c193']], st)); Hs.background.copy(Hs.fog.color);
    hGround.material.color.set(valAt([[20, '#7bb24f'], [24.6, '#7bb24f'], [27.5, '#a4a24c']], st));
    hTrees.forEach(t => t.userData.crown && t.userData.crown.color.set(valAt([[20, '#5f9a45'], [24.6, '#5f9a45'], [27.5, '#7f9c3c']], st)));
    hL.key.color.set(valAt([[20, '#fff2dc'], [27.5, '#ffb46a']], st)); hL.key.intensity = lerp(2.4, 2.8, g);
    hL.key.position.set(lerp(8, 3, g), lerp(14, 4, g), lerp(4, -30, g)); hL.key.target.position.set(0, 0, 0);
    hL.rim.color.set('#ffcf8a'); hL.rim.intensity = lerp(.6, 1.8, g); hL.rim.position.set(0, 4, -20);
    hL.hemi.color.set(valAt([[20, '#e6f6ff'], [27.5, '#ffe3c2']], st)); hL.hemi.intensity = lerp(1.0, .75, g);
    // 臉部補光跟著鏡頭 / face fill rides with the camera
    hL.fill.color.set('#ffe8cc');
  }
  // 片名 / title card
  function overlay(c, t, st) {
    const k = Math.sin(Math.PI * prog(st, 3, 7.6)); if (k <= 0) return;
    c.save(); c.globalAlpha = Math.min(1, k * 1.4); c.fillStyle = '#fbf7ee'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = 'rgba(40,60,80,.5)'; c.shadowBlur = 24; c.font = '300 150px "Georgia","Times New Roman",serif'; c.fillText('B i r d s', 960, 470); c.restore();
  }
  return { dur: DUR, songStart: 0, frame, overlay, keys: [] };
}
