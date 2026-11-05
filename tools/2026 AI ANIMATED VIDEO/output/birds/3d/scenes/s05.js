// s05 — Chorus 2（全曲 98.4–128.64 s；本地秒 t＝全曲秒 − 98.4）
// 季節顏色：冬灰（#33 媽媽身上帶一點暖光）。圖卡變灰 cardGray＝.8
//   #31  98.40 （Ooh）→ 灰暗臥室，13 歲女孩（D13B）坐在窗前椅子上低頭，特寫
//   #32 100.58 Birds fly in different directions → 從她背後看窗外：窗台上一隻白鳥飛走
//   #33 104.46 （Ooh）→ 媽媽（M3）跪在她身邊張開雙臂抱她，媽媽身上帶暖光（回憶）
//   #34 108.52 I hope to see you again → 灰色天空：媽媽（M2＋翅膀）展開翅膀，慢慢飛遠
//   #35 111.96 （Ooh）→ 雲中媽媽回頭看最後一眼，再轉身飛進雲裡
//   #36 117.14 Birds fly in different directions → 女孩（D13C）跪著把羽毛放進回憶木箱 → 特寫蓋上
//   #37 120.70 （Ooh）→ 學校走廊，灰色同學從她兩邊走過，她一個人站著（D13A）
//   #38 124.82 So fly high → 她轉向窗戶，窗外白鳥起飛 → 仰角：白鳥越飛越高
import { THREE, V, C, prog, ease, easeOut, lerp, clamp, hash, makePost, makeChar, loadModel, skyDome, setSky, cloudField, tree, motes, camAt, valAt, lightRig, feather, pendantGlow } from '../engine/world.js';
import { makeBedroom, memoryBox, classmate, WIN } from './s05_room.js';

const S0 = 98.4, DUR = 30.24, M = '../../models/';
function centerPivot(h) { const sz = h.userData.size; h.children[0].position.y -= sz.y / 2; }
// 飛行姿勢：yaw＝面向（模型正面 +Z），pitch＞0＝往面向的方向前傾，roll＝側傾 / flying pose in local axes
function flyPose(o, yaw, pitch, roll = 0) { o.rotation.order = 'YXZ'; o.rotation.set(pitch, yaw, roll); }
const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);

export async function setup({ renderer }) {
  // ════════ R. 灰暗臥室 / the grey bedroom ════════
  const R = new THREE.Scene(); R.background = C('#9ea4ac'); R.fog = new THREE.Fog('#a3a8af', 8, 60);
  const rSky = skyDome(); R.add(rSky); setSky(rSky, { top: '#7f8792', mid: '#aeb4bb', bot: '#c4c7cb', sunDir: V(-.3, .3, -1), sunCol: '#ffffff', sunSize: 0, sunGlow: .15 });
  const rL = lightRig(R); rL.key.color.set('#e6ebf2'); rL.key.intensity = 2.3; rL.key.position.set(-1.6, 6, -9); rL.key.target.position.set(-.4, 0, .4);
  rL.rim.intensity = 0; rL.hemi.color.set('#aab2bd'); rL.hemi.groundColor.set('#4a4642'); rL.hemi.intensity = .55;
  const room = makeBedroom(R);
  for (let i = 0; i < 14; i++) { const x = (hash(i + 70) - .5) * 30, z = -7 - hash(i + 71) * 16; const t = tree({ h: 5 + hash(i + 72) * 3, r: 1.4, seed: i + 70, crown: '#7d8379', trunk: '#4d4a46' }); t.position.set(x, -.2, z); R.add(t); }
  { const gr = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#8b8f86', roughness: 1 })); gr.rotation.x = -Math.PI / 2; gr.position.set(0, -.25, -40); R.add(gr); }
  const dust = motes({ n: 160, area: [3, 2.4, 3], color: '#f2f2ee', size: .012, seed: 15 }); R.add(dust);
  const girlR = await makeChar(M, { D13B: 'D13B.glb', D13C: 'D13C.glb' }, { D13B: 1.25, D13C: 1.05 }); R.add(girlR);
  const holdGlow = pendantGlow(girlR.pose('D13C'), .55, .2);
  const momR = await makeChar(M, { M3: 'M3.glb' }, { default: 1.17 }); R.add(momR);
  const momWarm = new THREE.PointLight('#ffbf80', 0, 2.6, 2); R.add(momWarm);
  const birdR = await loadModel(M + 'BIRD.glb', .34, { axis: 'xz' }); R.add(birdR);
  const mbox = memoryBox(); R.add(mbox);
  const featR = feather({ glow: 1.4 }); featR.scale.setScalar(.12); R.add(featR);
  const featRL = new THREE.PointLight('#5ff2df', 0, .7, 2); R.add(featRL);
  const rCam = new THREE.PerspectiveCamera(32, 16 / 9, .03, 300);
  const CH = V(-.4, 0, -.85);   // 椅子位置（面向窗戶）/ the chair, facing the window

  // ════════ G. 灰色天空（媽媽飛走）/ the grey sky ════════
  const G = new THREE.Scene(); G.background = C('#a7adb5'); G.fog = new THREE.Fog('#a7adb5', 12, 140);
  const gSky = skyDome(); G.add(gSky); setSky(gSky, { top: '#808894', mid: '#b4b9c0', bot: '#c9ccd0', sunDir: V(.3, .25, -1), sunCol: '#f4f6fa', sunSize: 0, sunGlow: .35 });
  const gL = lightRig(G); gL.key.color.set('#eef1f6'); gL.key.intensity = 2.0; gL.key.position.set(8, 12, -6); gL.rim.color.set('#ffffff'); gL.rim.intensity = 1.2; gL.rim.position.set(-4, 6, -20); gL.hemi.color.set('#d6dbe2'); gL.hemi.intensity = 1.0;
  const gSea = cloudField({ n: 200, area: [400, 500], y: [-9, -4], size: [24, 50], seed: 21, color: '#dfe2e6', opacity: .95 }); gSea.position.z = -160; G.add(gSea);
  const gPuffs = cloudField({ n: 70, area: [140, 260], y: [-2, 18], size: [8, 20], seed: 23, color: '#cfd3d9', opacity: .6 }); gPuffs.position.z = -110; G.add(gPuffs);
  const momG = await makeChar(M, { M2: 'M2.glb' }, { default: 1.65 }); G.add(momG);
  const wingG = await loadModel(M + 'WINGS.glb', 2.6, { axis: 'xz' }); centerPivot(wingG); momG.add(wingG); wingG.position.set(0, 1.32, -.15);
  const gCam = new THREE.PerspectiveCamera(34, 16 / 9, .05, 900);

  // ════════ W. 學校走廊 / the school corridor ════════
  const Wc = new THREE.Scene(); Wc.background = C('#b3b7bc'); Wc.fog = new THREE.Fog('#b3b7bc', 10, 80);
  const wSky = skyDome(); Wc.add(wSky); setSky(wSky, { top: '#8a919b', mid: '#bcc0c6', bot: '#cdd0d3', sunDir: V(-1, .55, -.4), sunCol: '#ffffff', sunSize: 0, sunGlow: .5 });
  const wL = lightRig(Wc); wL.key.color.set('#eef1f5'); wL.key.intensity = 2.0; wL.key.position.set(-9, 7, 3); wL.key.target.position.set(0, 0, -2); wL.rim.intensity = .5; wL.rim.position.set(0, 5, -20); wL.hemi.color.set('#d0d5dc'); wL.hemi.intensity = .9;
  const cor = new THREE.Group(); Wc.add(cor);
  { const m = c => new THREE.MeshStandardMaterial({ color: c, roughness: .85 }); const bx = (w, h, d, mt, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mt); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; cor.add(o); return o; };
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(3, 44), m('#9a978f')); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, -14); fl.receiveShadow = true; cor.add(fl);
    for (let i = 0; i < 22; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(3, .015), m('#7c7a74')); s.rotation.x = -Math.PI / 2; s.position.set(0, .002, 6 - i * 2); cor.add(s); }
    bx(3.2, .1, 44, m('#c9c8c3'), 0, 3.05, -14);                                    // 天花板
    for (let i = 0; i < 11; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(.5, 1.6), new THREE.MeshBasicMaterial({ color: '#e9ecef' })); p.rotation.x = Math.PI / 2; p.position.set(0, 2.99, 5 - i * 4); cor.add(p); }
    const wm = m('#bdbab3'); bx(.15, 3.1, 44, m('#a9a69f'), 1.58, 1.55, -14);         // 右牆
    for (let i = 0; i < 18; i++) { const lk = bx(.45, 1.8, .5, m(i % 2 ? '#8c939a' : '#959ba1'), 1.27, .9, 4.5 - i * .52); }   // 置物櫃
    bx(.15, 1.0, 44, wm, -1.58, .5, -14); bx(.15, .7, 44, wm, -1.58, 2.75, -14);      // 左牆：窗下、窗上
    for (let i = 0; i < 12; i++) bx(.15, 1.4, .35, wm, -1.58, 1.7, 6 - i * 3.2);       // 窗間柱
    for (let i = 0; i < 12; i++) bx(.3, .05, 2.85, m('#d8d5ce'), -1.62, 1.0, 6 - i * 3.2 - 1.6);   // 窗台
    const out = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), m('#8c9088')); out.rotation.x = -Math.PI / 2; out.position.set(-60, -.05, -20); cor.add(out); }
  for (let i = 0; i < 16; i++) { const x = -6 - hash(i + 90) * 26, z = 8 - hash(i + 91) * 40; const t = tree({ h: 6 + hash(i + 92) * 3, r: 1.6, seed: i + 90, crown: '#80867c', trunk: '#4d4a46' }); t.position.set(x, 0, z); Wc.add(t); }
  const wClouds = cloudField({ n: 30, area: [160, 160], y: [26, 40], size: [24, 44], seed: 27, color: '#d9dce0', opacity: .7 }); wClouds.position.set(-60, 0, -20); Wc.add(wClouds);
  const girlW = await makeChar(M, { D13A: 'D13A.glb' }, { default: 1.55 }); Wc.add(girlW);
  const mates = []; for (let i = 0; i < 10; i++) { const c = classmate(i); Wc.add(c); mates.push(c); }
  const birdW = await loadModel(M + 'BIRD.glb', .45, { axis: 'xz' }); Wc.add(birdW);
  const hopeGlow = new THREE.PointLight('#fff2d8', 0, 30, 2); Wc.add(hopeGlow);
  const wCam = new THREE.PerspectiveCamera(30, 16 / 9, .05, 600);

  const post = makePost(renderer, R, rCam);
  const fill = (L, cam, k = 1.2, col = '#f0f2f6', d = 6) => { L.fill.position.copy(cam.position).add(V(0, .25, 0)); L.fill.intensity = k; L.fill.distance = d; L.fill.color.set(col); };
  const birdFlap = (b, st, f = 9) => { b.children[0].scale.y = 1 + .3 * Math.sin(st * f); };

  // 關鍵字依句子切換（播放頁拿的是同一個陣列）：#38 只標 fly high，避免 fly 和 fly high 同時跳出
  const keys = ['fly', 'directions', 'again'];
  function frame(t, st) {
    keys.length = 0; if (st >= 124.82) keys.push('fly high'); else keys.push('fly', 'directions', 'again');
    const sat = valAt([[98.4, .26], [104.2, .26], [105.2, .42], [108.2, .42], [108.8, .24], [124.8, .24], [127.5, .32]], st);
    const tint = valAt([[98.4, '#e3e6eb'], [104.2, '#e3e6eb'], [105.2, '#f2ebe2'], [108.2, '#f2ebe2'], [108.8, '#e4e7ec'], [128.6, '#e8e8ea']], st);
    post.set({ sat, tint, vig: .45, fade: 0, fadeCol: '#000000', t: st });

    // ───────── 天空 #34–#35（108.52–117.14）
    if (st >= 108.52 && st < 117.14) {
      post.set({ scene: G, camera: gCam }); momG.setPose('M2');
      if (st < 111.96) {   // #34 展翅、飛遠 / spread the wings, fly away
        const wg = easeOut(prog(st, 108.6, 109.7)), go = Math.max(0, st - 109.5), d = Math.pow(go, 1.6) * 2.2;
        const P = V(0, 2 + d * .22, -d);
        momG.position.copy(P); flyPose(momG, Math.PI, lerp(.12, .75, clamp(go / 1.5)), .05 * Math.sin(st * 1.3));
        wingG.scale.set(Math.max(.02, wg), Math.max(.02, wg), 1); wingG.children[0].rotation.x = .28 * Math.sin(st * 3.4) * wg;
        camAt(gCam, [[108.52, [.9, 2.3, 4.6], [0, 3.0, 0], 34], [111.96, [.9, 2.6, 3.4], [0, 3.6, -6], 32]], st);
        fill(gL, gCam, 1.0);
        post.set({ focus: gCam.position.distanceTo(P), aperture: .0012, maxblur: .006, bloom: .45, threshold: .85 });
      } else {             // #35 回頭看最後一眼 / one last look back
        const B = V(0, 3, -30 - (st - 111.96) * .9);
        const camP = V(B.x + 1.5, B.y + 1.5, B.z + 3.3), toCam = yawTo(B, camP);
        const tIn = ease(prog(st, 112.3, 113.6)), tOut = ease(prog(st, 115.3, 116.2));
        const yaw = lerp(lerp(Math.PI, toCam, tIn), Math.PI, tOut);
        const away = Math.pow(Math.max(0, st - 116.0), 1.5) * 4;
        momG.position.set(B.x, B.y + Math.sin(st * 1.2) * .06 + away * .15, B.z - away);
        flyPose(momG, yaw, lerp(lerp(.45, .05, tIn), .7, tOut), 0);
        wingG.scale.set(1, 1, 1); wingG.children[0].rotation.x = .16 * Math.sin(st * 2.6);
        camAt(gCam, [[111.96, [camP.x + .3, camP.y, camP.z + .8], [B.x, B.y + 1.4, B.z], 30], [117.14, [camP.x, camP.y - .05, camP.z], [B.x, B.y + 1.4, B.z], 27]], st);
        fill(gL, gCam, 2.2, '#f4f0ea', 8);
        // 飛進雲裡：霧變濃 / she disappears into the cloud
        G.fog.near = lerp(12, .5, prog(st, 116.0, 117.1)); G.fog.far = lerp(140, 9, prog(st, 116.0, 117.1));
        post.set({ focus: gCam.position.distanceTo(momG.position.clone().add(V(0, 1.4, 0))), aperture: .0018, maxblur: .007, bloom: .45, threshold: .85 });
      }
      if (st < 111.96) { G.fog.near = 12; G.fog.far = 140; }
      post.render(); return;
    }

    // ───────── 走廊 #37–#38（120.7–128.64）
    if (st >= 120.7) {
      post.set({ scene: Wc, camera: wCam }); girlW.setPose('D13A');
      mates.forEach((m, i) => { const dir = i % 2 ? 1 : -1, x = i % 2 ? -1.0 + hash(i + 3) * .15 : 1.0 - hash(i + 4) * .1, sp = 1.0 + hash(i + 5) * .3;
        const z = dir > 0 ? -14 + ((st - 118 + hash(i + 6) * 14) * sp) % 17 : 3 - ((st - 118 + hash(i + 7) * 14) * sp) % 17;
        m.position.set(x, Math.abs(Math.sin(st * 6 + i)) * .03, z); m.rotation.y = dir > 0 ? 0 : Math.PI; m.rotation.z = Math.sin(st * 6 + i) * .03; });
      birdW.visible = st >= 124.82; birdW.scale.setScalar(1);
      if (st < 124.82) {   // #37 一個人站在走廊 / alone in the corridor
        girlW.position.set(.1, 0, 0); girlW.rotation.y = .05;
        camAt(wCam, [[120.7, [.25, 1.42, 3.6], [.1, 1.32, 0], 30], [124.82, [.22, 1.42, 2.9], [.1, 1.34, 0], 28]], st);
        fill(wL, wCam, 1.6);
        post.set({ focus: wCam.position.distanceTo(V(.1, 1.4, 0)), aperture: .0035, maxblur: .01, bloom: .4, threshold: .86 });
      } else if (st < 126.7) {   // #38a 轉向窗戶，白鳥起飛 / she turns to the window; a bird takes off
        girlW.position.set(-.95, 0, 1.0); girlW.rotation.y = -Math.PI / 2 - .3;
        const k = prog(st, 125.3, 126.7), bp = V(lerp(-1.75, -4.5, easeOut(k)), lerp(1.05, 3.4, k * k), lerp(-.2, -1.6, k));
        birdW.position.copy(bp); birdW.rotation.set(k > 0 ? -.5 : 0, -Math.PI / 2 - .3, 0); birdFlap(birdW, k > 0 ? st : 0, 10);
        camAt(wCam, [[124.82, [.9, 1.4, 2.6], [-1.6, 1.45, -.6], 36], [126.7, [.8, 1.4, 2.4], [-1.7, 1.65, -.7], 34]], st);
        fill(wL, wCam, 1.2);
        post.set({ focus: wCam.position.distanceTo(V(-1.75, 1.2, -.9)), aperture: .0016, maxblur: .006, bloom: .45, threshold: .85 });
      } else {             // #38b 仰角：白鳥越飛越高 / looking up: the bird flies higher and higher
        const k = prog(st, 126.7, 128.64), bp = V(lerp(-4.2, -7.5, k), lerp(3.2, 10, ease(k)), lerp(-1.6, -4.5, k));
        birdW.scale.setScalar(1.8); birdW.position.copy(bp); birdW.rotation.set(-.7, -Math.PI / 2 - .5, .1 * Math.sin(st * 2)); birdFlap(birdW, st, 9);
        camAt(wCam, [[126.7, [-2.6, 1.6, 2.4], [-4.6, 3.8, -1.8], 40], [128.64, [-2.7, 1.5, 2.5], [-7.2, 9.4, -4.4], 38]], st);
        hopeGlow.position.set(bp.x - 2, bp.y + 4, bp.z - 3); hopeGlow.intensity = 0;
        setSky(wSky, { sunDir: V(-.55, lerp(.55, .8, k), -.4), sunGlow: lerp(.4, .7, k), sunCol: '#fff4e0' });
        fill(wL, wCam, 0);
        post.set({ focus: wCam.position.distanceTo(bp), aperture: .0006, maxblur: .004, bloom: .55, threshold: .82 });
      }
      if (st < 126.7) setSky(wSky, { sunDir: V(-1, .55, -.4), sunGlow: .5 });
      post.render(); return;
    }

    // ───────── 臥室 #31–#33（98.4–108.52）、#36（117.14–120.7）
    post.set({ scene: R, camera: rCam });
    dust.position.set(-.4, 0, -1.2); dust.update(st, { fall: .02, sway: .15 });
    momR.setPose(null); birdR.visible = false; featR.visible = false; featRL.intensity = 0; momWarm.intensity = 0; holdGlow.set(0);
    mbox.position.set(.45, 0, .32); mbox.rotation.y = 0; mbox.setOpen(1);
    room.lamp.intensity = .5; room.shade.material.emissiveIntensity = .5;
    if (st < 117.14) {
      girlR.setPose('D13B'); girlR.position.copy(CH); girlR.rotation.y = Math.PI; mbox.visible = false;
      if (st < 100.58) {   // #31 窗前低頭特寫 / bowed head by the window, close-up
        camAt(rCam, [[98.4, [-.22, .86, -1.95], [-.4, .88, -.86], 34], [100.58, [-.25, .86, -1.85], [-.4, .88, -.86], 32]], st);
        fill(rL, rCam, .9, '#e8ecf2', 3);
        post.set({ focus: rCam.position.distanceTo(V(-.4, .95, -.9)), aperture: .004, maxblur: .01, bloom: .35, threshold: .88 });
      } else if (st < 104.46) {   // #32 窗外的鳥飛走 / the bird on the sill flies away
        birdR.visible = true; const k = prog(st, 101.4, 104.3);
        birdR.position.set(lerp(-.2, -3.2, ease(k)), lerp(WIN.y0 + .02, 3.4, k * k * .9 + k * .1), lerp(-2.25, -8, k)); birdR.rotation.set(k > 0 ? -.35 : 0, k > 0 ? Math.PI + .45 : .6, 0); birdFlap(birdR, k > 0 ? st : 0, 11);
        camAt(rCam, [[100.58, [.15, 1.2, .7], [-.55, 1.2, -2.2], 36], [104.46, [.1, 1.18, .45], [-.55, 1.25, -2.2], 34]], st);
        fill(rL, rCam, .5, '#e8ecf2', 3);
        post.set({ focus: rCam.position.distanceTo(V(-.4, 1.0, -2.2)), aperture: .0018, maxblur: .008, bloom: .4, threshold: .86 });
      } else {             // #33 媽媽來抱她（暖光）/ mom comes and holds her, warm light
        momR.setPose('M3'); momR.position.set(CH.x + .62, 0, CH.z + .12); momR.rotation.y = yawTo(momR.position, CH) + .15;
        const wk = prog(st, 104.46, 105.6); momWarm.intensity = 1.6 * wk; momWarm.position.set(CH.x + .4, 1.1, CH.z + .5);
        camAt(rCam, [[104.46, [-1.95, 1.05, .1], [-.05, .8, -.85], 36], [108.52, [-1.8, 1.0, -.05], [-.05, .8, -.85], 34]], st);
        fill(rL, rCam, 1.2, '#f2ece4', 4);
        post.set({ focus: rCam.position.distanceTo(V(-.1, .85, -.85)), aperture: .0022, maxblur: .008, bloom: .45, threshold: .85 });
      }
    } else {               // #36 把羽毛收進木箱 / the feather goes into the memory box
      girlR.setPose('D13C'); girlR.position.set(.45, 0, -.15); girlR.rotation.y = 0; mbox.visible = true; holdGlow.set(window.FEATHER || 0);
      const hand = V(.45, .56, .06), inBox = mbox.position.clone().add(V(0, .06, 0));
      const fk = ease(prog(st, 117.6, 118.9)); featR.visible = true;
      featR.position.set(lerp(hand.x, inBox.x, fk), lerp(hand.y, inBox.y, fk) + Math.sin(fk * Math.PI) * .05, lerp(hand.z, inBox.z, fk));
      featR.rotation.set(lerp(.2, -Math.PI / 2, fk), .3, lerp(.4, 1.3, fk)); featR.userData.mat.emissiveIntensity = lerp(1.5, .8, fk);
      featRL.position.copy(featR.position).add(V(0, .05, 0)); featRL.intensity = .35;
      if (st < 119.0) {
        camAt(rCam, [[117.14, [1.15, 1.45, 1.8], [.45, .45, .1], 32], [119.0, [1.05, 1.38, 1.65], [.45, .42, .15], 30]], st);
        fill(rL, rCam, 1.4, '#e8ecf2', 4);
        post.set({ focus: rCam.position.distanceTo(V(.45, .6, .1)), aperture: .0022, maxblur: .008, bloom: .45, threshold: .85 });
      } else {             // 蓋子蓋上的特寫 / close-up: the lid closes
        const lk = ease(prog(st, 119.3, 120.4)); mbox.setOpen(1 - lk); featRL.intensity = .35 * (1 - lk);
        camAt(rCam, [[119.0, [1.2, .78, 1.35], [.45, .18, .3], 34], [120.7, [1.1, .72, 1.22], [.45, .16, .3], 32]], st);
        fill(rL, rCam, .8, '#e8ecf2', 3);
        post.set({ focus: rCam.position.distanceTo(mbox.position), aperture: .0022, maxblur: .008, bloom: .45, threshold: .85 });
      }
    }
    post.render();
  }
  return { dur: DUR, songStart: S0, frame, keys, cardGray: () => .8 };
}
