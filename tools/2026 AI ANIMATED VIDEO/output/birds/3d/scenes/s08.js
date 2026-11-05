// s08 — Final Chorus 後半＋尾奏（全曲 195.0–222.5 s；本地秒 t＝全曲秒 − 195.0）
// 季節顏色：淡綠 → 春綠＋金 → 日出金 → 春綠（森林）→ 淡出到黑
//   #50 195.00 （Ooh）→ 手心的光變成一隻白鳥，盤旋飛起
//   #51 199.34 So fly high → 低角度往上看：白鳥在雲下盤旋，顏色全部回來（C 灰轉彩終點）
//   #52 203.02 （Ooh）→ 她站起來張開雙臂（D13D），背後（上背部）長出翅膀
//   #53 204.38 So fly high → 她飛上金色雲海，白鳥在旁邊（日出金；太陽在側邊）
//   #54 211.02 （Ooh）→ 逆光：她和白鳥並肩飛
//   #55 212.16 So fly high → 回到開場的森林：長大的她（A30）牽著自己的小孩（C1 黃雨衣）走過來
//   尾奏 216.6–222.5 → 兩人背影走進光裡，兩隻白鳥飛過樹梢；淡出到黑，片尾小字 Birds
import { THREE, V, C, prog, ease, easeOut, lerp, clamp, hash, makePost, makeChar, loadModel, skyDome, setSky, cloudField, hills, tree, motes, camAt, valAt, lightRig, pendantGlow } from '../engine/world.js';
import { buildMeadow, setMeadow, fill, birdFace, glowSprite, centerPivot, gm, CX, CZ, GX, GZ } from './s07_world.js';

const S0 = 195.0, DUR = 27.5, M = '../../models/';
export async function setup({ renderer }) {
  // ════════ G. 崖邊紀念草地（接 s07）/ the memorial meadow, continued ════════
  const m = await buildMeadow(M); const { G, L, girl, cam } = m;
  const wingG = await loadModel(M + 'WINGS.glb', 1.9, { axis: 'xz' }); centerPivot(wingG); girl.add(wingG); wingG.position.set(0, 1.22, -.13);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(.05, 24, 16), new THREE.MeshBasicMaterial({ color: '#ffe9b0', transparent: true, opacity: 1 })); G.add(orb);
  const orbGlow = glowSprite('#fff0c0', .48); G.add(orbGlow);
  const orbL = new THREE.PointLight('#ffe8b0', 0, 4, 2); G.add(orbL);
  const dove = await loadModel(M + 'BIRD.glb', .75, { axis: 'xz' }); dove.userData.mats.forEach(mt => { mt.emissive = C('#fff4dc'); mt.emissiveIntensity = .12; }); G.add(dove);
  const doveGlow = glowSprite('#fff4d0', .6); G.add(doveGlow);
  function handP() { return V(0, .6, .17).applyAxisAngle(V(0, 1, 0), -.55).add(V(GX, gm(GX, GZ), GZ)); }
  const H = handP(), O0 = H.clone().add(V(.55, -.05, .3));
  // 白鳥的路線：從手心盤旋往上（#50），在雲下繞圈（#51）/ the dove spirals up, then circles under the clouds
  const RC = V(GX - .3, 0, GZ - 1.8);
  function doveAt(st) {
    if (st < 199.34) { const k = ease(prog(st, 196.0, 199.34)); const a = -1.2 + k * 3.6, r = lerp(0, 1.6, k);
      return V(O0.x + (.5 + .5 * Math.cos(a)) * r * .45, lerp(O0.y, 2.3, k), O0.z - .2 * k + Math.sin(a) * r * .35); }
    const a = 2.4 + (st - 199.34) * 1.5; return V(RC.x + Math.cos(a) * .9, 2.2 + (st - 199.34) * .04 + Math.sin(st * 2) * .08, RC.z + Math.sin(a) * .35);
  }

  // ════════ K. 日出金色雲海 / sunrise golden cloud sea ════════
  const K = new THREE.Scene(); K.background = C('#f0b27a'); K.fog = new THREE.Fog('#f0b27a', 160, 700);
  const kSky = skyDome(); K.add(kSky);
  const kL = lightRig(K); kL.key.color.set('#ffc07a'); kL.key.intensity = 2.4; kL.key.position.set(60, 12, -20); kL.rim.color.set('#ffd8a0'); kL.rim.intensity = 2; kL.hemi.color.set('#ffe8cc'); kL.hemi.intensity = .85;
  // 雲海放低（雲頂≈ y + size×.55/2 ≈ −10），鏡頭永遠在 y>−2 / sea sits low so the camera never enters a sprite
  const sea = cloudField({ n: 240, area: [520, 700], y: [-30, -25], size: [26, 52], seed: 9, color: '#ffd2a2', opacity: .9 }); sea.position.z = -230; K.add(sea);
  const puffL = cloudField({ n: 18, area: [140, 500], y: [18, 40], size: [14, 28], seed: 11, color: '#ffe9d6', opacity: .7 }); puffL.position.set(-110, 0, -200); K.add(puffL);
  const puffR = cloudField({ n: 18, area: [140, 500], y: [18, 40], size: [14, 28], seed: 12, color: '#ffe9d6', opacity: .7 }); puffR.position.set(110, 0, -200); K.add(puffR);
  const flyer = await makeChar(M, { D13D: 'D13D.glb' }, { default: 1.55 }); K.add(flyer);
  const wingK = await loadModel(M + 'WINGS.glb', 1.9, { axis: 'xz' }); centerPivot(wingK); flyer.add(wingK); wingK.position.set(0, 1.22, -.13);
  const doveK = await loadModel(M + 'BIRD.glb', .8, { axis: 'xz' }); doveK.userData.mats.forEach(mt => { mt.emissive = C('#fff4dc'); mt.emissiveIntensity = .3; }); K.add(doveK);
  const doveKGlow = glowSprite('#fff4d0', .55); K.add(doveKGlow);
  const kMotes = motes({ n: 200, area: [20, 8, 30], color: '#fff2c8', size: .06, seed: 13 }); K.add(kMotes);
  const kCam = new THREE.PerspectiveCamera(35, 16 / 9, .1, 1200);

  // ════════ F. 開場森林（照 s01 建法，春綠）/ the opening forest, rebuilt as in s01, spring green ════════
  const F = new THREE.Scene(); F.background = C('#b9d6a8'); F.fog = new THREE.FogExp2('#b9d6a8', .03);
  const fSky = skyDome(); F.add(fSky); setSky(fSky, { top: '#8fbf86', mid: '#d8ecbc', bot: '#c9d4dc', sunDir: V(.3, .5, -1), sunCol: '#fff6e0', sunSize: .0, sunGlow: .25 });
  const fL = lightRig(F); fL.hemi.intensity = 1.0; fL.hemi.color.set('#e4ffd0'); fL.key.position.set(6, 14, -10); fL.key.intensity = 1.6; fL.key.color.set('#fff1d8'); fL.rim.position.set(-4, 6, -12);
  const fGround = hills({ w: 120, d: 160, amp: .25, freq: .2, color: '#6f9a48' }); F.add(fGround);
  for (let i = 0; i < 90; i++) { const x = (hash(i) - .5) * 40, z = 14 - hash(i + 9) * 70; if (Math.abs(x) < 1.6 + hash(i + 3)) continue;
    const t = tree({ h: 14 + hash(i + 5) * 8, tall: true, trunk: '#4a4038', seed: i }); t.position.set(x, 0, z); t.scale.setScalar(.8 + hash(i + 7) * .6); F.add(t); }
  const rays = []; for (let i = 0; i < 7; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(.9, 30, .9), new THREE.MeshBasicMaterial({ color: '#fff3d0', transparent: true, opacity: .07, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    r.position.set(-6 + i * 2.2, 10, -4 - i * 5); r.rotation.set(0, 0, .45); F.add(r); rays.push(r); }
  const fMotes = motes({ n: 500, area: [16, 6, 40], color: '#fff6d8', size: .05, seed: 2 }); fMotes.position.set(0, 0, -6); F.add(fMotes);
  const adult = await makeChar(M, { A30: 'A30.glb' }, { default: 1.66 }); F.add(adult); const adultGlow = pendantGlow(adult, 1.27, .14);
  const child = await makeChar(M, { C1: 'C1.glb' }, { default: 1.0 }); F.add(child);
  const pair = []; for (let i = 0; i < 2; i++) { const b = await loadModel(M + 'BIRD.glb', .7, { axis: 'xz' }); b.userData.mats.forEach(mt => { mt.emissive = C('#fff4dc'); mt.emissiveIntensity = .35; }); F.add(b); pair.push(b); }
  const fCam = new THREE.PerspectiveCamera(35, 16 / 9, .05, 500);

  const post = makePost(renderer, G, cam);

  function frame(t, st) {
    // ───────── 草地 #50–#52（195.0–204.38）
    if (st < 204.38) {
      post.set({ scene: G, camera: cam });
      const g = valAt([[195, 1.15], [199.0, 1.5], [202.4, 2]], st); setMeadow(m, g);
      post.set({ sat: valAt([[195, .85], [199.0, .95], [202.4, 1.1]], st), tint: valAt([[195, '#f2f8dc'], [199.3, '#f8fbe6'], [202.4, '#fff6e2']], st), vig: .36, fade: 0, t: st });
      m.gMotes.position.set(GX, gm(GX, GZ), GZ); m.gMotes.update(st, { fall: .03, sway: .4 }); m.gMotes.material.opacity = .85;
      // 光 → 白鳥 / the light becomes a dove
      const mk = prog(st, 195.25, 196.3);
      orb.position.copy(O0); orb.material.opacity = 1 - mk; orb.scale.setScalar(1 + .06 * Math.sin(st * 5) + mk * .6);
      orbGlow.position.copy(O0); orbGlow.material.opacity = .45 * (1 - mk); orbGlow.scale.setScalar(.3 + mk * .2); orbL.position.copy(O0).add(V(0, 0, .25)); orbL.intensity = .4 * (1 - mk);
      const P = doveAt(st), P2 = doveAt(st + .05), dv = P2.clone().sub(P);
      dove.visible = st >= 195.35; dove.position.copy(P); dove.scale.setScalar(lerp(.15, .6, easeOut(mk)) + .4 * ease(prog(st, 196.6, 198.2)));
      birdFace(dove, dv.x, dv.y, dv.z, st < 199.34 ? -.3 : -.45); dove.children[0].scale.y = 1 + .3 * Math.sin(st * 10);
      doveGlow.position.copy(P); doveGlow.material.opacity = dove.visible ? .12 + .2 * (1 - mk) : 0;
      // 女孩：#50–#51 跪著抬頭看；#52 站起來長翅膀 / kneeling, then standing as wings grow
      const stand = st >= 203.02; girl.setPose(stand ? 'D13D' : 'D13C'); girl.rotation.y = stand ? .25 : -.55;
      const wg = easeOut(prog(st, 203.1, 204.1)); wingG.visible = stand; wingG.scale.set(Math.max(.01, wg), Math.max(.01, wg), 1); wingG.children[0].rotation.x = .1 * Math.sin(st * 4) * wg;
      const HD = V(GX, gm(GX, GZ) + .93, GZ);
      let focusP;
      if (st < 199.34) {   // #50 白鳥從手心飛起 / the dove rises from her hands
        camAt(cam, [[195, [GX + .9, .85, GZ + 2.6], [GX + .1, .85, GZ + .2], 38], [199.34, [GX + 1.1, .75, GZ + 3.3], [GX + .1, 1.45, GZ], 46]], st);
        fill(L, cam, 1.3); focusP = HD;
      } else if (st < 203.02) {   // #51 低角度往上：白鳥盤旋、顏色回來 / low angle up at the circling dove
        camAt(cam, [[199.34, [GX + 1.0, .62, GZ + 2.0], [GX - .3, 1.45, GZ - 1.0], 56], [203.02, [GX + 1.1, .6, GZ + 2.2], [GX - .3, 1.5, GZ - 1.0], 56]], st);
        fill(L, cam, 1.0); focusP = V(RC.x, 3.2, RC.z);
      } else {   // #52 背後長出翅膀 / wings grow from her upper back
        camAt(cam, [[203.02, [GX - 1.5, 1.45, GZ - 2.6], [GX, 1.15, GZ], 34], [204.38, [GX - 1.35, 1.4, GZ - 2.3], [GX, 1.2, GZ], 32]], st);
        fill(L, cam, 1.4); focusP = V(GX, 1.2, GZ);
      }
      post.set({ focus: cam.position.distanceTo(focusP), aperture: st >= 199.34 && st < 203.02 ? .0006 : .0018, maxblur: .007, bloom: .45, threshold: .85 });
      post.render(); return;
    }
    // ───────── 金色雲海 #53–#54（204.38–212.16）
    if (st < 212.16) {
      post.set({ scene: K, camera: kCam });
      post.set({ sat: 1.2, tint: valAt([[204.38, '#f4e2c8'], [208, '#f0dcc0'], [212.16, '#eed8bc']], st), vig: .36, fade: Math.max(0, 1 - (st - 204.38) / .35) * .5, fadeCol: '#fff6e4', t: st });
      const back = st >= 211.02;
      setSky(kSky, { top: '#b8684a', mid: '#f0a060', bot: '#ffcf96', sunCol: '#fff4d6', sunDir: back ? V(.32, .3, .9) : V(.9, .1, -.3), sunSize: back ? 0 : .014, sunGlow: back ? .45 : .6 });
      const dist = (st - 204.38) * 8, up = easeOut(prog(st, 204.38, 207.5));
      const base = V(0, lerp(-3, 4, up), -dist);
      flyer.setPose('D13D'); flyer.position.set(base.x, base.y + Math.sin(st * 1.6) * .2, base.z);
      const tilt = lerp(.5, 1.15, up); flyer.rotation.set(-tilt, Math.PI, .08 * Math.sin(st * .9));
      wingK.children[0].rotation.x = .28 * Math.sin(st * 4.4);
      const D = V(base.x - 1.6, base.y + .9 + Math.sin(st * 2.1) * .2, base.z - 1.0 - (1 - up) * 1.5);
      doveK.position.copy(D); birdFace(doveK, 0, .05, -1, .15 * Math.sin(st * 2)); doveK.children[0].scale.y = 1 + .3 * Math.sin(st * 10); doveKGlow.position.copy(D); doveKGlow.material.opacity = .18;
      kMotes.position.copy(base); kMotes.update(st, { fall: -.2, sway: .5 });
      const mid = base.clone().add(V(.7, .3, -.3));
      if (!back) {   // #53 從後側方跟拍，往下看雲海 / follow from behind-side, cloud sea below
        camAt(kCam, [[204.38, [mid.x + 1.5, mid.y + 1.0, mid.z + 3.0], [mid.x - .3, mid.y, mid.z], 36], [208, [mid.x + 1.8, mid.y - 1.5, mid.z - 2.6], [mid.x - .5, mid.y, mid.z], 36], [211.02, [mid.x + 1.6, mid.y - 1.6, mid.z - 3.0], [mid.x - .5, mid.y, mid.z], 34]], st);
        fill(kL, kCam, 1.8, '#ffe8cc', 10);
        kL.rim.position.set(30, 10, -10); kL.rim.intensity = 2;
      } else {   // #54 逆光並肩 / backlit, side by side
        camAt(kCam, [[211.02, [mid.x - 1.8, mid.y - .2, mid.z - 2.6], [mid.x - .3, mid.y + .1, mid.z], 32], [212.16, [mid.x - 1.7, mid.y - .2, mid.z - 2.4], [mid.x - .3, mid.y + .1, mid.z], 32]], st);
        kL.rim.position.copy(mid).add(V(3, 3, 9)); kL.rim.target.position.copy(mid); kL.rim.intensity = 3;
        fill(kL, kCam, 3.2, '#ffe2c0', 8);
      }
      post.set({ focus: kCam.position.distanceTo(mid), aperture: .0012, maxblur: .006, bloom: back ? .35 : .35, threshold: .9 });
      post.render(); return;
    }
    // ───────── 開場森林 #55＋尾奏（212.16–222.5）
    post.set({ scene: F, camera: fCam });
    const out = prog(st, 220.3, 222.3);
    post.set({ sat: 1.05, tint: valAt([[212.16, '#f6ffe8'], [219, '#fff6e0']], st), vig: .38, fade: Math.max(Math.max(0, 1 - (st - 212.16) / .4) * .7, ease(out)), fadeCol: st < 215 ? '#fff8ec' : '#000000', t: st });
    rays.forEach((r, i) => { r.material.opacity = .06 + .03 * Math.sin(st * .7 + i); });
    fMotes.update(st, { fall: .05, sway: .25 }); adultGlow.set(window.FEATHER || 0);
    adult.setPose('A30'); child.setPose('C1');
    const front = st < 216.6;
    if (front) {   // 走向鏡頭 / walking towards the camera
      const z = lerp(-1.4, 1.0, prog(st, 212.16, 216.6)), bob = s => Math.abs(Math.sin(st * 5.5 + s)) * .015;
      adult.position.set(-.25, bob(0), z); adult.rotation.y = 0; child.position.set(.27, bob(1.2), z + .05); child.rotation.y = -.15;
      camAt(fCam, [[212.16, [.55, .95, z + 3.6], [0, 1.0, z], 32], [216.6, [.45, .95, 4.6], [0, 1.0, 1.0], 30]], st);
      fill(fL, fCam, 1.3, '#fff0d8', 8);
    } else {   // 背影走進光裡 / walking away into the light
      const z = lerp(-.6, -4.6, prog(st, 216.6, 222.5)), bob = s => Math.abs(Math.sin(st * 5.5 + s)) * .015;
      adult.position.set(.25, bob(0), z); adult.rotation.y = Math.PI; child.position.set(-.27, bob(1.2), z - .05); child.rotation.y = Math.PI + .15;
      camAt(fCam, [[216.6, [.3, 1.2, 2.6], [0, 1.5, -6], 36], [222.5, [.2, 1.45, .6], [0, 2.4, -10], 38]], st);
      fill(fL, fCam, 0);
    }
    // 兩隻白鳥飛過樹梢往光的方向 / two doves fly off over the treetops
    pair.forEach((b, i) => { const k = prog(st, 217.4 + i * .35, 222.5); b.visible = st > 217.4 + i * .35;
      b.position.set(-2.6 + i * .6 + k * 3.2, 3.6 + i * .5 + k * 4, -1 - k * 16); birdFace(b, .2, .25, -1, Math.sin(st * 3 + i) * .2); b.children[0].scale.y = 1 + .3 * Math.sin(st * 10 + i * 2); });
    post.set({ focus: fCam.position.distanceTo(adult.position.clone().add(V(0, 1.2, 0))), aperture: .0016, maxblur: .007, bloom: .5, threshold: .84 });
    post.render();
  }
  // 片尾小字 / a small end title
  function overlay(c, t, st) {
    const k = prog(st, 219.9, 220.9) * (1 - prog(st, 221.7, 222.4)); if (k <= 0) return;
    c.save(); c.globalAlpha = k; c.fillStyle = '#fbf7ee'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = 'rgba(40,60,80,.5)'; c.shadowBlur = 20; c.font = '300 84px "Georgia","Times New Roman",serif'; c.fillText('B i r d s', 960, 500); c.restore();
  }
  return { dur: DUR, songStart: S0, frame, overlay, cardGray: () => 0, keys: ['fly high'] };
}
