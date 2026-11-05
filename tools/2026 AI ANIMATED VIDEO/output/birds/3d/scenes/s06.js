// s06 — Bridge＋間奏（全曲 128.64–169.04 s；本地秒 t＝全曲秒 − 128.64）
// 季節顏色：冬夜藍 → 黑（間奏結尾全黑，接 s07 一盞燈的空餐桌）。圖卡變灰 cardGray＝.8
//   #39 128.64 When the moon is lookin' down → 窗外月亮往下看；她坐在窗前（D13B），月光斜斜照進房間
//   #40 137.66 Shinin' light upon your ground → 地上亮成一圈月光；木箱打開，羽毛發光 → 她跪著捧起羽毛（D13C）
//   #41 145.40 I'm flyin' up to let you see → 暴風夜空：她（D13D＋翅膀）在雨和閃電中翻滾、掙扎往上飛（之後可換 AI 鏡）
//   #42 153.20 That the shadow cast is me → 穿出雲層，月光把她的影子投在雲上，像一隻鳥 → 鏡頭升起，原來影子是她
//   間奏 159.5–169.04 → 暴風停了，她小小的剪影飛過大月亮；雲把月亮蓋住，全黑
import { THREE, V, C, prog, ease, easeOut, lerp, clamp, hash, makePost, makeChar, loadModel, skyDome, setSky, cloudField, hills, motes, camAt, valAt, lightRig, feather, pendantGlow } from '../engine/world.js';
import { makeBedroom, memoryBox, rain, WIN } from './s05_room.js';

const S0 = 128.64, DUR = 40.4, M = '../../models/';
function centerPivot(h) { const sz = h.userData.size; h.children[0].position.y -= sz.y / 2; }
function flyPose(o, yaw, pitch, roll = 0) { o.rotation.order = 'YXZ'; o.rotation.set(pitch, yaw, roll); }
// 閃電：每一道閃兩下、很快暗掉 / lightning strikes (double flicker, quick decay)
const STRIKES = [[146.2, 1], [147.9, .7], [150.4, 1], [152.3, .8], [154.0, .35], [161.2, .25]];
function lightning(st) { let f = 0; for (const [t0, a] of STRIKES) { const d = st - t0; if (d >= 0 && d < 1) f = Math.max(f, a * (Math.exp(-d * 9) + .6 * Math.exp(-Math.abs(d - .14) * 30))); } return clamp(f); }
let _glowTex;
function glowSprite(col, size) {
  if (!_glowTex) { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); _glowTex = new THREE.CanvasTexture(cv); }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: _glowTex, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); s.scale.setScalar(size); return s;
}

export async function setup({ renderer }) {
  // ════════ N. 夜晚臥室（月光）/ the moonlit bedroom ════════
  const N = new THREE.Scene(); N.background = C('#0e1424'); N.fog = new THREE.Fog('#121a2e', 20, 120);
  const nSky = skyDome(); N.add(nSky); setSky(nSky, { top: '#070b18', mid: '#16203a', bot: '#24304e', sunDir: V(-.02, .27, -1), sunCol: '#dfe8ff', sunSize: 0, sunGlow: .5 });
  const nL = lightRig(N); nL.key.color.set('#b9cdff'); nL.key.intensity = 3.2; nL.key.position.set(-.4, 16, -27); nL.key.target.position.set(-.4, 0, .4);
  nL.rim.intensity = 0; nL.hemi.color.set('#5a6c9a'); nL.hemi.groundColor.set('#141826'); nL.hemi.intensity = .35;
  const room = makeBedroom(N, { wall: '#9aa4bc', floor: '#6f6a70', bedCol: '#7d8aa6' });
  { const gr = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#2a3248', roughness: 1 })); gr.rotation.x = -Math.PI / 2; gr.position.set(0, -.25, -40); N.add(gr); }
  const moonN = new THREE.Mesh(new THREE.SphereGeometry(3.2, 32, 20), new THREE.MeshBasicMaterial({ color: '#eef3ff', fog: false })); moonN.position.set(-1.1, 12.5, -42); N.add(moonN);
  const moonNGlow = glowSprite('#9fb8ff', 22); moonNGlow.position.copy(moonN.position).add(V(0, 0, 1)); N.add(moonNGlow);
  // 月光光束（斜的半透明板）＋地上的一圈光 / the moonbeam and the pool of light on the floor
  const beam = new THREE.Mesh(new THREE.BoxGeometry(1.25, .02, 3.4), new THREE.MeshBasicMaterial({ color: '#a9c2ff', transparent: true, opacity: .0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  N.add(beam); { const a = V(-.4, 1.5, -2.05), b = V(-.4, 0, .55); beam.position.copy(a).add(b).multiplyScalar(.5); beam.scale.z = a.distanceTo(b) / 3.4; beam.lookAt(b); beam.scale.y = 12; }
  const pool = new THREE.Mesh(new THREE.CircleGeometry(.8, 48), new THREE.MeshBasicMaterial({ color: '#cfe0ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(-.4, .006, .45); N.add(pool);
  const poolRing = new THREE.Mesh(new THREE.RingGeometry(.78, .84, 64), pool.material.clone()); poolRing.rotation.x = -Math.PI / 2; poolRing.position.set(-.4, .007, .45); N.add(poolRing);
  const nDust = motes({ n: 220, area: [1.4, 2.0, 2.6], color: '#cfe0ff', size: .012, seed: 31 }); N.add(nDust);
  const girlN = await makeChar(M, { D13B: 'D13B.glb', D13C: 'D13C.glb' }, { D13B: 1.25, D13C: 1.05 }); N.add(girlN);
  const holdGlow = pendantGlow(girlN.pose('D13C'), .55, .2, .2);
  const mbox = memoryBox(); N.add(mbox);
  const featN = feather({ glow: 2.2 }); featN.scale.setScalar(.12); N.add(featN);
  const featNL = new THREE.PointLight('#5ff2df', 0, 1.6, 2); N.add(featNL);
  // 窗外月光打在她臉上的柔光（看不見的燈）/ soft moonlight on her face, an invisible lamp
  const moonFace = new THREE.PointLight('#aac0ff', 0, 4, 2); N.add(moonFace);
  const nCam = new THREE.PerspectiveCamera(34, 16 / 9, .03, 300);
  const CH = V(-.4, 0, -.85);

  // ════════ S. 暴風夜空 / the stormy night sky ════════
  const S = new THREE.Scene(); S.background = C('#0d1426'); S.fog = new THREE.FogExp2('#111a30', .018);
  const sSky = skyDome(); S.add(sSky); setSky(sSky, { top: '#04070f', mid: '#121a30', bot: '#1d2844', sunDir: V(0, .25, -1), sunCol: '#cfdcff', sunSize: 0, sunGlow: .35 });
  const sL = lightRig(S); sL.key.color.set('#c4d4ff'); sL.key.intensity = 1.2; sL.rim.color.set('#7f9cff'); sL.rim.intensity = .8; sL.hemi.color.set('#4a5d8c'); sL.hemi.groundColor.set('#0b0f1a'); sL.hemi.intensity = .45;
  sL.key.shadow.camera.left = -6; sL.key.shadow.camera.right = 6; sL.key.shadow.camera.top = 6; sL.key.shadow.camera.bottom = -6; sL.key.shadow.camera.updateProjectionMatrix();
  const storm = cloudField({ n: 260, area: [120, 160], y: [-30, 40], size: [10, 26], seed: 41, color: '#3a4766', opacity: .55 }); storm.position.z = -40; S.add(storm);
  const rainL = rain(900, [26, 22, 26]); S.add(rainL);
  const bolt = new THREE.PointLight('#d8e4ff', 0, 80, 1.2); S.add(bolt);
  // 雲頂（接影子的雲面）/ the cloud tops that catch her shadow
  const deck = hills({ w: 300, d: 300, seg: 160, amp: .35, freq: .35, color: '#7d8fbf' }); deck.material.roughness = 1; S.add(deck);
  const deckPuffs = cloudField({ n: 160, area: [260, 260], y: [-.4, .6], size: [6, 14], seed: 43, color: '#8c9cc8', opacity: .45 }); S.add(deckPuffs);
  const moonS = new THREE.Mesh(new THREE.SphereGeometry(18, 40, 24), new THREE.MeshBasicMaterial({ color: '#f0f4ff', fog: false })); S.add(moonS);
  const moonSGlow = glowSprite('#9fb8ff', 120); S.add(moonSGlow);
  const veil = cloudField({ n: 26, area: [90, 20], y: [-6, 6], size: [26, 46], seed: 47, color: '#1a2338', opacity: .0 }); S.add(veil);
  const girlS = await makeChar(M, { D13D: 'D13D.glb' }, { default: 1.55 }); S.add(girlS);
  const wingS = await loadModel(M + 'WINGS.glb', 1.9, { axis: 'xz' }); centerPivot(wingS); girlS.add(wingS); wingS.position.set(0, 1.22, -.13);
  const chestGlow = pendantGlow(girlS, 1.08, .12, .2);
  const chestL = new THREE.PointLight('#5ff2df', 0, 1.2, 2); girlS.add(chestL); chestL.position.set(0, 1.1, .3);
  const sCam = new THREE.PerspectiveCamera(36, 16 / 9, .05, 1200);

  const post = makePost(renderer, N, nCam);
  const fill = (L, cam, k = 1.2, col = '#c8d6ff', d = 6) => { L.fill.position.copy(cam.position).add(V(0, .25, 0)); L.fill.intensity = k; L.fill.distance = d; L.fill.color.set(col); };

  function frame(t, st) {
    const fl = lightning(st);
    const sat = valAt([[128.64, .5], [140.5, .5], [141.5, .62], [145.3, .62], [145.5, .5], [159.5, .45], [169, .3]], st);
    const tint = valAt([[128.64, '#c4d2f6'], [145.3, '#c4d2f6'], [145.5, '#b4c4f0'], [159.5, '#a9b8e6'], [169, '#8c98c0']], st);
    const dark = valAt([[128.64, 0], [156.5, 0], [159.5, .12], [165.5, .3], [168.6, 1]], st);   // 冬夜藍 → 黑
    post.set({ sat, tint, vig: .5, t: st });
    if (fl > .02) post.set({ fade: fl * .3, fadeCol: '#cad8ff' }); else post.set({ fade: dark, fadeCol: '#000000' });

    // ───────── 臥室 #39–#40（128.64–145.4）
    if (st < 145.4) {
      post.set({ scene: N, camera: nCam });
      nDust.position.set(-.4, .1, -.5); nDust.update(st, { fall: .015, sway: .1 });
      room.lamp.intensity = 0; room.shade.material.emissiveIntensity = 0;
      mbox.position.set(-.4, 0, .9); mbox.rotation.y = Math.PI; featN.visible = false; featNL.intensity = 0; holdGlow.set(0);
      const beamK = ease(prog(st, 131.5, 134.5)); beam.material.opacity = .018 * beamK; nL.hemi.intensity = .35 + .2 * beamK;
      const poolK = ease(prog(st, 137.7, 139.6)); pool.material.opacity = .28 * poolK + .02 * beamK; poolRing.material.opacity = .35 * poolK;
      if (st < 137.66) {
        girlN.setPose('D13B'); girlN.position.copy(CH); girlN.rotation.y = Math.PI; mbox.visible = false;
        moonFace.position.set(-.5, 1.5, -1.75); moonFace.intensity = lerp(1.2, 3.0, beamK);
        if (st < 133.2) {   // #39a 從她背後往上看：窗外的月亮 / over her shoulder, up at the moon
          camAt(nCam, [[128.64, [.15, .7, .55], [-.9, 3.4, -4.5], 36], [133.2, [.1, .72, .5], [-.75, 2.4, -4.5], 34]], st);
          fill(nL, nCam, .9, '#9fb4ee', 2.5);
          post.set({ focus: 30, aperture: .0004, maxblur: .006, bloom: .7, threshold: .78 });
        } else {           // #39b 月光斜斜照進房間 / the moonbeam slants into the room
          camAt(nCam, [[133.2, [-2.0, 1.45, 1.9], [-.4, .75, -.8], 36], [137.66, [-1.85, 1.35, 1.6], [-.4, .75, -.8], 34]], st);
          fill(nL, nCam, 5, '#a9bdf2', 6);
          post.set({ focus: nCam.position.distanceTo(V(-.4, .8, -.85)), aperture: .0016, maxblur: .007, bloom: .55, threshold: .8 });
        }
      } else {
        mbox.visible = true; girlN.setPose('D13C'); girlN.position.set(-.4, 0, .42); girlN.rotation.y = 0;
        moonFace.position.set(-.3, 1.7, 1.5); moonFace.intensity = 3.5;
        const lid = ease(prog(st, 138.3, 139.6)); mbox.setOpen(lid);
        const rise = ease(prog(st, 139.4, 140.9)), inBox = mbox.position.clone().add(V(0, .06, 0)), hand = V(-.4, .56, .64);
        featN.visible = st < 141.2; featN.position.set(lerp(inBox.x, hand.x, rise), lerp(inBox.y, hand.y, rise) + Math.sin(rise * Math.PI) * .12, lerp(inBox.z, hand.z, rise));
        featN.rotation.set(lerp(-Math.PI / 2, .2, rise), .3 + st * .3 * (1 - rise), lerp(1.3, .4, rise)); featN.userData.mat.emissiveIntensity = lerp(.6, 2.2, ease(prog(st, 138.8, 139.8)));
        featNL.position.copy(featN.position).add(V(0, .08, .05)); featNL.intensity = .9 * ease(prog(st, 138.8, 139.8));
        if (st < 140.6) {  // #40a 月光一圈裡的木箱打開 / the box opens inside the pool of moonlight
          camAt(nCam, [[137.66, [1.15, 2.2, 2.75], [-.4, .4, .5], 40], [140.6, [1.0, 1.95, 2.5], [-.4, .45, .5], 38]], st);
          fill(nL, nCam, 6, '#9fb4ee', 6);
          post.set({ focus: nCam.position.distanceTo(mbox.position), aperture: .0018, maxblur: .007, bloom: .55, threshold: .8 });
        } else {           // #40b 她捧著發光的羽毛（臉部特寫）/ she holds the glowing feather — face close-up
          holdGlow.set(Math.max(.55 + .2 * Math.sin(st * 3), window.FEATHER || 0)); featNL.intensity = .9; featNL.position.set(-.4, .62, .78);
          camAt(nCam, [[140.6, [.2, .95, 1.95], [-.4, .78, .45], 32], [145.4, [.1, .92, 1.6], [-.4, .82, .45], 28]], st);
          fill(nL, nCam, .9, '#a9bdf2', 3);
          post.set({ focus: nCam.position.distanceTo(V(-.4, .85, .45)), aperture: .0024, maxblur: .008, bloom: .6, threshold: .78 });
        }
      }
      post.render(); return;
    }

    // ───────── 夜空 #41、#42、間奏（145.4–169.04）
    post.set({ scene: S, camera: sCam }); girlS.setPose('D13D');
    const flap = s => .3 * Math.sin(st * s);
    chestGlow.set(Math.max(window.FEATHER || 0, .35)); chestL.intensity = .35;
    sL.hemi.intensity = .45 + fl * 2.5; bolt.intensity = fl * 900;
    let P;
    if (st < 153.2) {   // #41 暴風中掙扎往上飛 / struggling upward through the storm
      const u = st - 145.4, gust = Math.sin(st * 1.7) + .6 * Math.sin(st * 3.1 + 1) + (st > 150.4 && st < 151.4 ? 1.6 * Math.sin(prog(st, 150.4, 151.4) * Math.PI) : 0);
      P = V(.6 * gust, u * 1.1 + .15 * Math.sin(st * 2.3), -u * 1.4);
      girlS.position.copy(P); flyPose(girlS, Math.PI + .25 * Math.sin(st * 1.3), .35 + .25 * Math.sin(st * 2.1), .45 * gust);
      wingS.children[0].rotation.x = .45 * Math.sin(st * 6.5);
      rainL.visible = true; rainL.update(st, P, { wind: 8, speed: 24 }); storm.visible = true; deck.visible = deckPuffs.visible = false; veil.visible = false;
      moonS.position.set(P.x - 30, P.y + 70, P.z - 200); moonS.material.color.set('#5d6a8c'); moonSGlow.position.copy(moonS.position); moonSGlow.material.opacity = .25;
      sL.key.position.copy(P).add(V(10, 30, -20)); sL.key.target.position.copy(P); sL.key.intensity = 1.0;
      bolt.position.set(P.x + 14, P.y + 10, P.z - 12);
      if (st < 149.3) camAt(sCam, [[145.4, [P.x + 3.6, P.y - 1.2, P.z + 2.0], [P.x, P.y + .8, P.z], 40], [149.3, [P.x + 3.2, P.y - .9, P.z + 1.7], [P.x, P.y + .8, P.z], 38]], st);
      else camAt(sCam, [[149.3, [P.x + 1.1, P.y + 1.0, P.z - 3.1], [P.x, P.y + 1.3, P.z], 36], [153.2, [P.x + .9, P.y + 1.15, P.z - 2.7], [P.x, P.y + 1.35, P.z], 33]], st);
      fill(sL, sCam, st < 149.3 ? 26 : 9, '#c8d6ff', 12);
      post.set({ focus: sCam.position.distanceTo(P.clone().add(V(0, 1.2, 0))), aperture: .0016, maxblur: .007, bloom: .55, threshold: .78 });
    } else if (st < 159.5) {   // #42 雲上的影子 / her shadow on the cloud tops
      const u = st - 153.2; P = V(.2 * Math.sin(st * .7), 3.2 + .12 * Math.sin(st * 1.4), -u * 3.2);
      girlS.position.copy(P); flyPose(girlS, Math.PI, 1.35, .12 * Math.sin(st * .9));
      wingS.children[0].rotation.x = .18 * Math.sin(st * 3.2);
      rainL.visible = false; storm.visible = false; deck.visible = deckPuffs.visible = true; deck.position.set(0, 0, 0); veil.visible = false;
      moonS.position.set(P.x + 20, P.y + 120, P.z - 260); moonS.material.color.set('#f0f4ff'); moonSGlow.position.copy(moonS.position); moonSGlow.material.opacity = .8;
      sL.key.position.copy(P).add(V(1.5, 30, -4)); sL.key.target.position.copy(P); sL.key.intensity = 3.0; sL.hemi.intensity = .28 + fl * 2.5; bolt.position.set(P.x - 30, P.y + 5, P.z - 40);
      if (st < 156.3) camAt(sCam, [[153.2, [P.x + 1.8, 1.35, P.z + 3.2], [P.x + .1, .2, P.z - .6], 40], [156.3, [P.x + 1.6, 1.25, P.z + 2.9], [P.x + .05, .2, P.z - .8], 38]], st);
      else camAt(sCam, [[156.3, [P.x + 3.2, 2.9, P.z + 5.4], [P.x, 1.5, P.z - 1.4], 46], [159.5, [P.x + 4.0, 4.0, P.z + 5.5], [P.x, 1.6, P.z - 1.5], 46]], st);
      fill(sL, sCam, st < 156.3 ? 0 : 20, '#b8caff', 14);
      post.set({ focus: sCam.position.distanceTo(st < 156.3 ? V(P.x, .2, P.z) : P), aperture: .0012, maxblur: .006, bloom: .55, threshold: .8 });
    } else {             // 間奏：剪影飛過大月亮，雲蓋住月亮 → 全黑 / silhouette across the moon, then darkness
      const u = prog(st, 159.5, 169.04), Y0 = 6, Z0 = -40;
      P = V(lerp(-9, 7, u), Y0 + 2.9 + .4 * Math.sin(st * .8), Z0);
      girlS.position.copy(P); flyPose(girlS, Math.PI / 2 - .25, 1.25, .1 * Math.sin(st * .9));
      wingS.children[0].rotation.x = .2 * Math.sin(st * 3);
      rainL.visible = false; storm.visible = false; deck.visible = deckPuffs.visible = true; veil.visible = true;
      moonS.position.set(0, 50, -230); moonS.material.color.set('#eef2ff'); moonSGlow.position.copy(moonS.position); moonSGlow.material.opacity = .8 * (1 - prog(st, 163.5, 167.5));
      // 雲飄過來蓋住月亮 / clouds drift across the moon
      veil.position.set(lerp(-70, 0, ease(prog(st, 162.5, 167.5))), 50, -215); veil.userData.mat.opacity = .95 * prog(st, 162.0, 164.0);
      sL.key.position.copy(P).add(V(0, 30, -30)); sL.key.target.position.copy(P); sL.key.intensity = 1.6 * (1 - prog(st, 164, 167.5)); bolt.position.set(-80, 20, -150);
      camAt(sCam, [[159.5, [0, Y0 - 4, Z0 + 32], [0, 50, -230], 30], [169.04, [0, Y0 - 3.6, Z0 + 26], [0, 50, -230], 28]], st);
      fill(sL, sCam, 0);
      post.set({ focus: 200, aperture: .0001, maxblur: .004, bloom: .6, threshold: .75 });
    }
    post.render();
  }
  // 'light' 在逐字表裡黏成 "Shinin'light"，播放頁的跳字找不到 → 這裡自己補跳 / the 'light' pop, drawn here
  function overlay(c, t, st) {
    const k = (st - 138.6 + .1) / 1.5; if (k <= 0 || k >= 1) return; const inn = Math.min(1, k / .18), out = k > .78 ? 1 - (k - .78) / .22 : 1;
    const s = (inn < 1 ? .4 + .75 * Math.sin(inn * Math.PI * .5) * (1 + .18 * Math.sin(inn * Math.PI)) : 1) * (.96 + .04 * out);
    c.save(); c.globalAlpha = out; c.translate(470, 110); c.scale(s, s); c.rotate(-.03);
    c.font = '900 96px "Comic Relief","Comic Sans MS",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineJoin = 'round'; c.lineWidth = 18; c.strokeStyle = 'rgba(40,24,30,.85)'; c.strokeText('light', 0, 0); c.fillStyle = '#fff4d8'; c.fillText('light', 0, 0); c.restore();
  }
  return { dur: DUR, songStart: S0, frame, overlay, keys: ['moon', 'light', 'shadow'], cardGray: () => .8 };
}
