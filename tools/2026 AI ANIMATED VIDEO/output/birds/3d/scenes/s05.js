// s05 — Chorus 2（全曲 98.4–128.64 s；本地秒 t＝全曲秒 − 98.4）
// 季節顏色：冬灰（#33 媽媽身上帶一點暖光）。圖卡變灰 cardGray＝.8
//   #31  98.40 （Ooh）→ 灰暗臥室，13 歲女孩（D13B）坐在窗前椅子上低頭，特寫
//   #32 100.58 Birds fly in different directions → 從她背後看窗外：窗台上一隻白鳥飛走
//   #33 104.46 （Ooh）→ 媽媽（M3）跪在她身邊張開雙臂抱她，媽媽身上帶暖光（回憶）
//   #34 108.52 I hope to see you again → 房間裡：媽媽（M3）抱住坐著的她，檯燈暖光（V02：媽媽不提早離開，暴風夜才被閃電帶走）
//   #35 111.96 （Ooh）→ 兩人臉部近景（她含淚、媽媽溫柔）→ 拉遠：灰色房間裡只有媽媽身邊一圈暖光，媽媽輕拍她的背
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
  // V02 安慰段：小桌＋檯燈（暖光只在媽媽身邊）、眼淚 / comfort beat: side table + warm lamp, a tear
  const dl = new THREE.Group(); R.add(dl);
  { const wd = new THREE.MeshStandardMaterial({ color: '#6b5444', roughness: .8 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(.42, .04, .42), wd); top.position.y = .58; top.castShadow = top.receiveShadow = true; dl.add(top);
    for (const [x, z] of [[-.17, -.17], [.17, -.17], [-.17, .17], [.17, .17]]) { const lg = new THREE.Mesh(new THREE.BoxGeometry(.035, .58, .035), wd); lg.position.set(x, .29, z); lg.castShadow = true; dl.add(lg); }
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.06, .07, .03, 16), new THREE.MeshStandardMaterial({ color: '#3d3833', roughness: .5 })); base.position.y = .615; dl.add(base);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, .26, 8), base.material); pole.position.y = .74; dl.add(pole); }
  const dShade = new THREE.Mesh(new THREE.CylinderGeometry(.08, .13, .15, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#f2e2c4', side: THREE.DoubleSide, emissive: '#ffc67a', emissiveIntensity: 0 })); dShade.position.y = .9; dl.add(dShade);
  const dLamp = new THREE.PointLight('#ffbb70', 0, 1.9, 1.8); dLamp.position.y = .86; dl.add(dLamp);
  const tear = new THREE.Mesh(new THREE.SphereGeometry(.006, 10, 8), new THREE.MeshStandardMaterial({ color: '#e8f4ff', emissive: '#bfe2ff', emissiveIntensity: .35, roughness: .05, transparent: true, opacity: .9 }));
  tear.scale.set(1, 1.5, .8); girlR.add(tear); tear.visible = false;
  const CH = V(-.4, 0, -.85);   // 椅子位置（面向窗戶）/ the chair, facing the window

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
  const flock = []; for (let i = 0; i < 2; i++) { const b = await loadModel(M + 'BIRD.glb', .45, { axis: 'xz' }); Wc.add(b); flock.push(b); }   // #38 尾：兩隻小鳥跟著飛 / two followers
  const hopeGlow = new THREE.PointLight('#fff2d8', 0, 30, 2); Wc.add(hopeGlow);
  const wCam = new THREE.PerspectiveCamera(30, 16 / 9, .05, 600);

  const post = makePost(renderer, R, rCam);
  const fill = (L, cam, k = 1.2, col = '#f0f2f6', d = 6) => { L.fill.position.copy(cam.position).add(V(0, .25, 0)); L.fill.intensity = k; L.fill.distance = d; L.fill.color.set(col); };
  const birdFlap = (b, st, f = 9) => { b.children[0].scale.y = 1 + .3 * Math.sin(st * f); };

  // 關鍵字依句子切換（播放頁拿的是同一個陣列）：#38 只標 fly high，避免 fly 和 fly high 同時跳出
  const keys = ['fly', 'directions', 'again'];
  // ───── #34–#35 安慰（108.52–117.14）：媽媽跪在她身邊抱住她、輕拍背 / mom kneels and holds her, patting her back
  // 椅子轉向房間（換鏡頭重新擺位），媽媽在她側邊，張開的雙臂一前一後環住她；身體前後輕擺＝拍背
  const GY = .55, GF = V(Math.sin(GY), 0, Math.cos(GY)), GS = V(Math.cos(GY), 0, -Math.sin(GY));
  const TEAR = [.047, .982, .142];   // 眼淚：左眼下（女孩模型座標）/ tear under her left eye (girl-local)
  const HUG = { d: .42, fwd: -.13, yawAdd: 0 };
  function comfort(st) {
    girlR.setPose('D13B'); girlR.position.copy(CH); girlR.rotation.set(0, GY, 0); mbox.visible = false;
    const mp = CH.clone().add(GS.clone().multiplyScalar(HUG.d)).add(GF.clone().multiplyScalar(HUG.fwd));
    momR.setPose('M3'); momR.position.copy(mp);
    const pat = Math.max(0, Math.sin((st - 108.52) * Math.PI * 1.6));          // 拍背節奏 / patting rhythm
    momR.rotation.order = 'YXZ'; momR.rotation.set(.03 + .035 * pat, yawTo(mp, CH) + HUG.yawAdd, 0);
    dl.visible = true; dl.position.copy(CH).sub(GS.clone().multiplyScalar(.62)).sub(GF.clone().multiplyScalar(.15));
    const lk = ease(prog(st, 108.52, 109.4)); dLamp.intensity = 1.1 * lk + .25; dShade.material.emissiveIntensity = .4 + .9 * lk;
    momWarm.intensity = .45; momWarm.position.copy(mp).add(V(0, 1.05, 0)).add(GF.clone().multiplyScalar(.45));
    room.lamp.intensity = 0; room.shade.material.emissiveIntensity = .15;
    const head = CH.clone().add(GS.clone().multiplyScalar(HUG.d * .5)).add(V(0, 1.0, 0));
    const at = (f, s, y) => { const p = CH.clone().add(GF.clone().multiplyScalar(f)).add(GS.clone().multiplyScalar(s)); return [p.x, y, p.z]; };
    const hv = [head.x, head.y - .05, head.z];
    if (st < 111.96) {        // #34 兩人中景，慢慢推近 / two-shot, slow push in
      camAt(rCam, [[108.52, at(2.4, .55, 1.15), hv, 32, 'cut'], [111.96, at(2.05, .5, 1.12), hv, 31]], st);
      fill(rL, rCam, 1.0, '#f4e6d4', 4);
      post.set({ focus: rCam.position.distanceTo(head), aperture: .002, maxblur: .008, bloom: .5, threshold: .84 });
    } else if (st < 114.6) {  // #35a 臉部近景 / faces close-up
      camAt(rCam, [[111.96, at(1.05, .42, 1.0), [head.x, head.y - .02, head.z], 30, 'cut'], [114.6, at(.95, .4, .99), [head.x, head.y - .02, head.z], 28]], st);
      fill(rL, rCam, 1.1, '#f6e8d6', 3);
      tear.visible = true; const tk = ease(prog(st, 112.3, 114.4)); tear.position.set(TEAR[0] + .002 * tk, TEAR[1] - .02 * tk, TEAR[2] + .004 * tk);
      post.set({ focus: rCam.position.distanceTo(head), aperture: .003, maxblur: .01, bloom: .5, threshold: .84 });
    } else {                  // #35b 拉遠：灰房間裡一圈暖光 / pull back: one warm pool in the grey room
      camAt(rCam, [[114.6, at(2.6, -.9, 1.45), [head.x, .8, head.z], 34, 'cut'], [117.14, at(3.1, -1.1, 1.55), [head.x, .78, head.z], 36]], st);
      fill(rL, rCam, .5, '#e8ecf2', 4);
      post.set({ focus: rCam.position.distanceTo(head), aperture: .0016, maxblur: .007, bloom: .55, threshold: .82 });
    }
  }
  function frame(t, st) {
    keys.length = 0; if (st >= 124.82) keys.push('fly high'); else keys.push('fly', 'directions', 'again');
    const sat = valAt([[98.4, .26], [104.2, .26], [105.2, .42], [108.4, .42], [109.2, .36], [116.6, .36], [117.3, .24], [124.8, .24], [127.5, .32]], st);
    const tint = valAt([[98.4, '#e3e6eb'], [104.2, '#e3e6eb'], [105.2, '#f2ebe2'], [108.4, '#f2ebe2'], [109.2, '#e6e7ea'], [116.6, '#e6e7ea'], [117.3, '#e4e7ec'], [128.6, '#e8e8ea']], st);
    post.set({ sat, tint, vig: .45, fade: 0, fadeCol: '#000000', t: st });

    // ───────── 走廊 #37–#38（120.7–128.64）
    if (st >= 120.7) {
      post.set({ scene: Wc, camera: wCam }); girlW.setPose('D13A');
      mates.forEach((m, i) => { const dir = i % 2 ? 1 : -1, x = i % 2 ? -1.0 + hash(i + 3) * .15 : 1.0 - hash(i + 4) * .1, sp = 1.0 + hash(i + 5) * .3;
        const z = dir > 0 ? -14 + ((st - 118 + hash(i + 6) * 14) * sp) % 17 : 3 - ((st - 118 + hash(i + 7) * 14) * sp) % 17;
        m.position.set(x, Math.abs(Math.sin(st * 6 + i)) * .03, z); m.rotation.y = dir > 0 ? 0 : Math.PI; m.rotation.z = Math.sin(st * 6 + i) * .03; });
      birdW.visible = st >= 124.82; birdW.scale.setScalar(1);
      flock.forEach(b => { b.visible = false; });
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
        birdW.scale.setScalar(2.8); birdW.position.copy(bp); birdW.rotation.set(-.7, -Math.PI / 2 - .5, .1 * Math.sin(st * 2)); birdFlap(birdW, st, 9);
        // 後面兩隻小鳥跟著飛（V02：天空不再只有一隻）/ two smaller birds follow
        flock.forEach((b, i) => { const kk = clamp(k * 1.1 - .05), off = i ? V(-2.2, 2.6, -4.5) : V(1.2, 1.6, -3.0);
          b.visible = true; b.scale.setScalar(1.6 - i * .2);
          b.position.set(lerp(-4.0, -7.2, kk) + off.x, lerp(3.0, 9.6, ease(kk)) + off.y, lerp(-1.6, -4.5, kk) + off.z);
          b.rotation.set(-.65, -Math.PI / 2 - .5 + (i ? .2 : -.15), .1 * Math.sin(st * 2.3 + i)); birdFlap(b, st + i * .7, 10 + i); });
        camAt(wCam, [[126.7, [-2.6, 1.6, 2.4], [-4.6, 3.8, -1.8], 40], [128.64, [-2.7, 1.5, 2.5], [-7.2, 9.4, -4.4], 38]], st);
        hopeGlow.position.set(bp.x - 2, bp.y + 4, bp.z - 3); hopeGlow.intensity = 0;
        setSky(wSky, { top: '#545c68', mid: '#78808a', bot: '#8a9098', sunDir: V(-.55, lerp(.55, .8, k), -.4), sunGlow: lerp(.25, .4, k), sunCol: '#fff1d8' });   // V02：天空調暗，鳥才看得清楚
        fill(wL, wCam, 2.6, '#fff6ea', 40);   // 從鏡頭方向打亮白鳥（逆光時鳥會變黑）/ light the birds from the camera side
        post.set({ focus: wCam.position.distanceTo(bp), aperture: .0006, maxblur: .004, bloom: .45, threshold: .86 });
      }
      Wc.fog.color.set(st < 126.7 ? '#b3b7bc' : '#858b94'); if (st < 126.7) setSky(wSky, { top: '#8a919b', mid: '#bcc0c6', bot: '#cdd0d3', sunDir: V(-1, .55, -.4), sunGlow: .5, sunCol: '#ffffff' });
      post.render(); return;
    }

    // ───────── 臥室 #31–#33（98.4–108.52）、#36（117.14–120.7）
    post.set({ scene: R, camera: rCam });
    dust.position.set(-.4, 0, -1.2); dust.update(st, { fall: .02, sway: .15 });
    momR.setPose(null); birdR.visible = false; featR.visible = false; featRL.intensity = 0; momWarm.intensity = 0; holdGlow.set(0);
    mbox.position.set(.45, 0, .32); mbox.rotation.y = 0; mbox.setOpen(1);
    room.lamp.intensity = .5; room.shade.material.emissiveIntensity = .5;
    dl.visible = false; dLamp.intensity = 0; dShade.material.emissiveIntensity = 0; tear.visible = false; girlR.rotation.set(0, Math.PI, 0); momR.rotation.set(0, 0, 0);
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
      } else if (st < 108.52) {   // #33 媽媽來抱她（暖光）/ mom comes and holds her, warm light
        momR.setPose('M3'); momR.position.set(CH.x + .62, 0, CH.z + .12); momR.rotation.y = yawTo(momR.position, CH) + .15;
        const wk = prog(st, 104.46, 105.6); momWarm.intensity = 1.6 * wk; momWarm.position.set(CH.x + .4, 1.1, CH.z + .5);
        camAt(rCam, [[104.46, [-1.95, 1.05, .1], [-.05, .8, -.85], 36], [108.52, [-1.8, 1.0, -.05], [-.05, .8, -.85], 34]], st);
        fill(rL, rCam, 1.2, '#f2ece4', 4);
        post.set({ focus: rCam.position.distanceTo(V(-.1, .85, -.85)), aperture: .0022, maxblur: .008, bloom: .45, threshold: .85 });
      } else comfort(st);
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
