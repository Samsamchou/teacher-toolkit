// s04 — Pre-Chorus 2（全曲 80.5–98.4 s；本地秒 t＝全曲秒 − 80.5）
// 季節顏色：秋 → 灰（#24 背景同學先變灰）→ 灰中帶青綠（#25）→ 冬灰（#26–#29）→ 房間冬灰＋窗外夕陽暖光（#30）
//   #24 80.5  Seasons, they will change → 操場大遠景：背景玩耍的同學先變成灰色
//   #25 82.5  Life will make you grow → 她情緒湧上來，背後長出翅膀、臉頰浮出青綠羽毛紋
//   #26 84.5  Death can make you hard, hard, hard → 同學一圈圍上來指指點點，她縮成一團（D13C 跪下）
//   #27 88.4  Everything is temporary → 她驚慌地把翅膀收起來（翅膀縮小消失）
//   #28 90.6  Everything will slide → 同學散開走掉，只有一個回頭笑一下、揮手（一點暖色）
//   #29 92.6  Love will never die, die, die → 她低頭，臉上羽毛紋慢慢淡掉，手心的羽毛一直亮著
//   #30 96.12 I know that → 房間裡，她坐在窗邊椅子上低頭，窗外夕陽是唯一的暖光
import { THREE, V, C, prog, ease, easeOut, lerp, clamp, hash, makePost, makeChar, loadModel, skyDome, setSky, hills, tree, motes, camAt, valAt, lightRig, pendantGlow } from '../engine/world.js';
import { M, centerPivot, fillAt, classmate, pendant, cheekMarks, room, grayable } from './s03_kit.js';

const S0 = 80.5, DUR = 17.9, KIND = 1;   // 回頭笑的那一個同學 / the classmate who looks back and smiles
const T = { l24: 80.5, l25: 82.5, l26: 84.5, l27: 88.4, l28: 90.6, l29: 92.6, l30: 96.12, end: 98.4 };
// 臉頰羽毛紋、翅膀、墜子在兩個姿勢的位置（抽格確認）/ per-pose anchor points (checked on stills)
const AN = {
  D13A: { wing: [0, 1.22, -.13], cheek: [0, 1.37, .085], cheekRx: 0, pend: [0, 1.08, .13] },
  D13C: { wing: [0, .78, -.16], cheek: [0, .86, .13], cheekRx: .6, pend: [0, .52, .22] },
};

export async function setup({ renderer }) {
  // ════════ P. 操場（秋 → 灰）/ the playground ════════
  const P = new THREE.Scene(); P.background = C('#e2b48a'); P.fog = new THREE.Fog('#e2b48a', 25, 110);
  const pSky = skyDome(); P.add(pSky);
  const pL = lightRig(P); pL.key.position.set(-14, 9, 6); pL.key.target.position.set(0, 0, 0); pL.rim.position.set(6, 5, -12);
  const pGround = hills({ w: 200, d: 200, amp: .15, freq: .15, color: '#b08254' }); P.add(pGround);
  const envMats = [pGround.material];
  // 校舍、圍籬、盪鞦韆 / school, fence, swing set
  const sm = c => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: .9 }); envMats.push(m); return m; };
  { const b = new THREE.Mesh(new THREE.BoxGeometry(18, 5, 4), sm('#ecdcbc')); b.position.set(4, 2.5, -24); P.add(b);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(18.6, .45, 4.6), sm('#9a4a3a')); roof.position.set(4, 5.2, -24); P.add(roof);
    const wm = sm('#6a7a8a'); for (let r = 0; r < 2; r++) for (let i = 0; i < 7; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1), wm); w.position.set(-3.5 + i * 2.4, 1.6 + r * 2, -21.98); P.add(w); }
    const fm = sm('#c8b89a'); for (let i = 0; i < 26; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(.08, 1.0, .08), fm); p.position.set(-14 + i * 1.2, .5, -16); P.add(p); }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(31, .06, .06), fm); rail.position.set(1, .85, -16); P.add(rail);
    const sw = sm('#c84a3a'); const post = (x, z, rz) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 2.6, 8), sw); p.position.set(x, 1.25, z); p.rotation.z = rz; P.add(p); };
    post(-6.6, -9, .25); post(-5.4, -9, -.25); post(-2.6, -9, .25); post(-1.4, -9, -.25);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 5, 8), sw); bar.rotation.z = Math.PI / 2; bar.position.set(-4, 2.5, -9); P.add(bar);
    const seatM = sm('#4a3a30'); for (const x of [-5, -3]) { const s = new THREE.Mesh(new THREE.BoxGeometry(.5, .05, .22), seatM); s.position.set(x, .55, -9); P.add(s);
      for (const dx of [-.22, .22]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, 1.95, 4), seatM); r.position.set(x + dx, 1.52, -9); P.add(r); } } }
  const pTrees = []; for (let i = 0; i < 34; i++) { const x = (hash(i + 700) - .5) * 70, z = -10 - hash(i + 701) * 30; if (x > -8 && x < 14 && z < -18) continue;
    const t = tree({ h: 5 + hash(i + 702) * 3, r: 1.5 + hash(i + 703) * .7, seed: i + 700, crown: ['#d9582b', '#e8862e', '#c9472a', '#f0a43a'][i % 4] }); t.position.set(x, 0, z); P.add(t); pTrees.push(t); envMats.push(t.userData.crown, t.userData.trunk); }
  for (let i = 0; i < 8; i++) { const sd = i % 2 ? 1 : -1, x = sd * (6 + hash(i + 720) * 6), z = 2 - hash(i + 721) * 10;
    const t = tree({ h: 5 + hash(i + 722) * 2, r: 1.6, seed: i + 720, crown: ['#d9582b', '#e8862e', '#f0a43a'][i % 3] }); t.position.set(x, 0, z); P.add(t); pTrees.push(t); envMats.push(t.userData.crown, t.userData.trunk); }
  const envGray = grayable(envMats);
  const pLeaves = motes({ n: 160, area: [14, 5, 14], color: '#ff9a3c', size: .06, seed: 41 }); pLeaves.material.blending = THREE.NormalBlending; P.add(pLeaves);
  // 主角 / the girl
  const girl = await makeChar(M, { D13A: 'D13A.glb', D13C: 'D13C.glb' }, { D13A: 1.55, D13C: 1.05 }); P.add(girl);
  const wing = await loadModel(M + 'WINGS.glb', 1.9, { axis: 'xz' }); centerPivot(wing); girl.add(wing);
  wing.userData.mats.forEach(m => { m.emissive = C('#bff8f0'); m.emissiveIntensity = 0; });
  const cheeks = cheekMarks(); girl.add(cheeks);
  const pend = pendant(); girl.add(pend);
  const glow = pendantGlow(girl, 1.08, .13);
  const handL = new THREE.PointLight('#5ff2df', 0, 1.2, 2); girl.add(handL);
  // 同學六個 / six classmates
  const looks = [['#7fb3d5', '#4f5f7f', '#3a2a22', 0], ['#f4a6b8', '#6a5a7a', '#2e2420', 1], ['#a8d080', '#5a5040', '#5a3a28', 0], ['#f0c060', '#5a4a6a', '#3a2a22', 1], ['#b89ad8', '#4a4a5a', '#2a2020', 0], ['#e88a6a', '#4f5f6f', '#4a3022', 1]];
  const mates = looks.map(([shirt, pants, hair, g], i) => classmate({ shirt, pants, hair, girl: !!g, mood: i === KIND ? 'smile' : 'flat', h: 1.4 + hash(i + 50) * .12 }));
  mates.forEach(m => P.add(m));
  const kindL = new THREE.PointLight('#ffc070', 0, 3, 2); P.add(kindL);
  const pCam = new THREE.PerspectiveCamera(35, 16 / 9, .05, 400);

  // ════════ B. 臥室（冬灰＋窗外夕陽）/ the bedroom ════════
  const B = new THREE.Scene(); B.background = C('#e89a6a'); B.fog = new THREE.Fog('#e89a6a', 30, 90);
  const bSky = skyDome(); B.add(bSky); setSky(bSky, { top: '#7a6a8a', mid: '#f08a5a', bot: '#ffb070', sunDir: V(-1, .06, .25), sunCol: '#ffc080', sunSize: .012, sunGlow: .5 });
  const bL = lightRig(B); bL.key.color.set('#ff9a50'); bL.key.intensity = 4.2; bL.key.position.set(-16, 2.6, 3); bL.key.target.position.set(0, 0, .5);
  bL.rim.intensity = 0; bL.hemi.color.set('#9aa2b8'); bL.hemi.groundColor.set('#3a3a44'); bL.hemi.intensity = 1.1;
  const bed = room({ w: 5.5, d: 6, h: 2.8, wall: '#8a909c', floor: '#6a6460', win: { z0: -1.0, z1: .9, y0: .8, y1: 2.2 }, frame: '#c8c8cc' }); B.add(bed);
  { const bm = new THREE.MeshStandardMaterial({ color: '#7a7f8c', roughness: .9 }); const b1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, .45, 2.1), bm); b1.position.set(1.6, .225, -1.7); b1.castShadow = b1.receiveShadow = true; B.add(b1);
    const pil = new THREE.Mesh(new THREE.BoxGeometry(.8, .14, .4), new THREE.MeshStandardMaterial({ color: '#c8c8d0', roughness: .9 })); pil.position.set(1.6, .52, -2.5); B.add(pil);
    const rug = new THREE.Mesh(new THREE.CircleGeometry(1.0, 24), new THREE.MeshStandardMaterial({ color: '#7a6a72', roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(-.6, .01, .3); B.add(rug); }
  const sitter = await makeChar(M, { D13B: 'D13B.glb' }, { default: 1.25 }); B.add(sitter);
  const winGlow = new THREE.PointLight('#ff9a58', 3.5, 4.5, 1.6); winGlow.position.set(-2.45, 1.5, -.1); B.add(winGlow);   // 窗口的夕陽暖光 / warm window light
  const bCam = new THREE.PerspectiveCamera(35, 16 / 9, .05, 300);

  const post = makePost(renderer, P, pCam);

  // 角色錨點：依姿勢擺翅膀、臉頰紋、墜子 / place attachments by pose
  function anchor(pose) { const a = AN[pose]; wing.position.set(...a.wing); cheeks.position.set(...a.cheek); cheeks.rotation.x = a.cheekRx; pend.position.set(...a.pend); glow.sprite.position.set(a.pend[0], a.pend[1], a.pend[2] + .01); handL.position.set(a.pend[0], a.pend[1] + .05, a.pend[2] + .25); }
  const ringAt = (i, r) => { const a = i / 6 * Math.PI * 2 + .3; return V(Math.cos(a) * r, 0, Math.sin(a) * r); };
  const homeAt = i => V(2.2 + (i % 3) * 1.3 + hash(i + 60) * .5, 0, -7 - Math.floor(i / 3) * 1.4);

  function frame(t, st) {
    // 整體調色：環境材質變灰＋整體飽和度往下 / grade
    const sat = valAt([[80.5, .9], [82.5, .85], [84.5, .7], [86.5, .58], [90.6, .58], [90.7, .7], [92.5, .7], [92.7, .6], [96.1, .6], [96.15, .62]], st);
    const tint = valAt([[80.5, '#f6e2cc'], [84.5, '#e8e6e6'], [96.1, '#e2e4ea']], st);
    post.set({ sat, tint, vig: .42, fade: 0, t: st });

    if (st >= T.l30) {   // ───────── #30 臥室 / bedroom
      post.set({ scene: B, camera: bCam });
      sitter.setPose('D13B'); sitter.position.set(-1.5, 0, 0); sitter.rotation.y = 1.2;
      camAt(bCam, [[96.12, [.6, 1.15, 2.3], [-2.2, .85, -.4], 36], [98.4, [.45, 1.12, 2.1], [-2.2, .85, -.4], 34]], st);
      fillAt(bL, bCam, 4.5, '#d0d6e6', 7);
      post.set({ focus: bCam.position.distanceTo(sitter.position.clone().add(V(0, .9, 0))), aperture: .0016, maxblur: .007, bloom: .3, threshold: .92 });
      post.render(); return;
    }

    post.set({ scene: P, camera: pCam });
    // 環境：#24 還是秋，#25 起慢慢灰 / environment greys from #25
    const eg = valAt([[80.5, 0], [82.6, 0], [85.5, .85], [98, .9]], st); envGray(eg);
    setSky(pSky, { top: valAt([[80.5, '#b8a0a0'], [82.6, '#b8a0a0'], [85.5, '#8a8e98']], st), mid: valAt([[80.5, '#f2c08a'], [82.6, '#f2c08a'], [85.5, '#b8bac0']], st), bot: valAt([[80.5, '#f8d4a8'], [82.6, '#f8d4a8'], [85.5, '#c8c8cc']], st),
      sunDir: V(-1, .25, .3), sunCol: '#fff0d8', sunSize: 0, sunGlow: lerp(.5, .1, eg) });
    P.fog.color.set(valAt([[80.5, '#e2b48a'], [82.6, '#e2b48a'], [85.5, '#b8b8bc']], st)); P.background.copy(P.fog.color);
    pL.key.color.set(valAt([[82.6, '#ffc488'], [85.5, '#e0e0e8']], st)); pL.key.intensity = lerp(2.6, 1.6, eg);
    pL.hemi.color.set(valAt([[82.6, '#ffe6cc'], [85.5, '#d8dce4']], st)); pL.hemi.intensity = lerp(.9, 1.05, eg); pL.rim.intensity = 1.2; pL.rim.color.set('#e8eaf0');
    pLeaves.update(st, { fall: lerp(.35, .12, eg), sway: .5 }); pLeaves.material.color.set(valAt([[82.6, '#ff9a3c'], [85.5, '#9a9a9a']], st)); pLeaves.material.opacity = lerp(.85, .4, eg);

    // 女孩的姿勢 / the girl's pose
    const pose = st < 86.4 ? 'D13A' : 'D13C';
    girl.setPose(pose); anchor(pose); girl.position.set(0, 0, 0); girl.rotation.y = st < T.l26 ? .45 : 0;
    // 翅膀：#25 長出、#26 垂下、#27 收起 / wings: grow, droop, fold
    const grow = easeOut(prog(st, 82.75, 84.0)), fold = ease(prog(st, 88.7, 90.3));
    const ws = Math.max(.01, grow * (1 - fold)); wing.visible = st >= 82.7 && fold < 1;
    const shiver = st >= 88.4 && st < 90.3 ? Math.sin(st * 40) * .06 : 0;
    wing.scale.set(ws, Math.max(.01, grow * (1 - fold * .7)), 1); wing.rotation.set(pose === 'D13C' ? .35 : 0, 0, shiver);
    wing.children[0].rotation.x = st < T.l26 ? .06 * Math.sin(st * 3) * grow : .18;
    wing.userData.mats.forEach(m => { m.emissiveIntensity = .25 * grow * (1 - fold); });
    // 臉頰羽毛紋：#25 浮出，#29 淡掉 / cheek marks
    const mark = clamp(easeOut(prog(st, 83.0, 83.7)) * (1 - ease(prog(st, 93.2, 95.8))));
    cheeks.userData.mat.opacity = mark * (.75 + .15 * Math.sin(st * 3)); cheeks.visible = mark > .01;
    // 墜子／手心羽毛：#29 一直亮著 / the feather keeps glowing
    const love = st >= T.l29 ? ease(prog(st, 92.7, 93.6)) : 0;
    pend.children[0].material.emissiveIntensity = 1.1 + 1.0 * love + .2 * Math.sin(st * 2.4) * love;
    handL.intensity = .1 + .5 * love; glow.set(Math.max(window.FEATHER || 0, love * .45));

    // 同學 / classmates
    const close = ease(prog(st, 84.55, 85.9)), scatter = ease(prog(st, 90.65, 91.5));
    mates.forEach((m, i) => {
      const home = homeAt(i), rp = ringAt(i, 1.25), far = ringAt(i, 5.5);
      const gk = i === KIND ? (st < T.l28 ? valAt([[80.6, 0], [82.3, 1]], st) : lerp(1, .05, ease(prog(st, 90.9, 91.4)))) : valAt([[80.6, 0], [82.3, 1]], st);
      m.userData.gray(gk);
      let p, face, walking = 0;
      if (st < T.l26) {   // 背景在玩（繞圈跑）/ playing in the background
        const a = st * .9 + i * 1.05; p = home.clone().add(V(Math.cos(a) * .35, 0, Math.sin(a) * .35)); face = a + Math.PI; walking = 1;
      } else if (st < T.l28) {   // 圍上來、指著她 / close in and point
        p = home.clone().lerp(rp, close); face = Math.atan2(-p.x, -p.z); walking = close < 1 ? 1 : 0;
      } else {   // 散開走掉 / walk away
        const sk = i === KIND ? ease(prog(st, 90.7, 91.25)) : scatter;
        p = rp.clone().lerp(i === KIND ? ringAt(i, 3.0) : ringAt(i, 8), sk); face = Math.atan2(p.x, p.z); walking = sk > 0 && sk < 1 ? 1 : 0;
        if (i === KIND) { const back = ease(prog(st, 91.25, 91.65)); face = lerp(face, face + Math.PI, back); }
      }
      m.position.copy(p); m.rotation.y = face; m.walk(st + i * .7, walking);
      const point = st >= 85.6 && st < T.l28 ? ease(prog(st, 85.6 + i * .08, 86.0 + i * .08)) : 0;
      m.userData.armR.rotation.x = lerp(m.userData.armR.rotation.x, -1.45, point); m.userData.armR.rotation.z = .12;
      if (i === KIND && st >= 91.4 && st < T.l29) { const wv = ease(prog(st, 91.4, 91.7)); m.userData.armL.rotation.set(0, 0, lerp(-.12, -2.5, wv) + Math.sin(st * 9) * .25 * wv); }
      m.visible = st < T.l29;
    });
    { const k3 = mates[KIND]; kindL.position.copy(k3.position).add(V(0, 1.6, .8)); kindL.intensity = st >= 91.0 && st < T.l29 ? 2.5 * ease(prog(st, 91.0, 91.5)) : 0; }

    // 鏡頭 / cameras
    let focusP;
    if (st < T.l25) {
      camAt(pCam, [[80.5, [-.7, 1.3, 4.2], [.35, 1.15, -4], 36], [82.5, [-.6, 1.28, 3.8], [.35, 1.15, -4], 35]], st);
      fillAt(pL, pCam, 1.4); focusP = V(0, 1.3, 0);
    } else if (st < T.l26) {
      camAt(pCam, [[82.5, [.55, 1.45, 3.0], [-.15, 1.25, 0], 36], [84.5, [.5, 1.42, 2.6], [-.15, 1.28, 0], 36]], st);
      fillAt(pL, pCam, 1.6); focusP = V(0, 1.35, 0);
    } else if (st < T.l27) {
      camAt(pCam, [[84.5, [1.6, 3.6, 4.2], [0, .6, 0], 36], [88.4, [1.3, 3.3, 3.6], [0, .55, 0], 34]], st);
      fillAt(pL, pCam, 2.0, '#ffe8cc', 8); focusP = V(0, .8, 0);
    } else if (st < T.l28) {
      camAt(pCam, [[88.4, [1.6, 1.1, 1.75], [-.05, .7, 0], 36], [90.6, [1.45, 1.05, 1.6], [-.05, .7, 0], 34]], st);
      fillAt(pL, pCam, 1.6); focusP = V(0, .8, 0);
    } else if (st < T.l29) {
      camAt(pCam, [[90.6, [-1.2, 1.1, -1.6], [.66, 1.15, 2.93], 34], [92.6, [-1.25, 1.1, -1.75], [.66, 1.15, 2.93], 32]], st);
      fillAt(pL, pCam, .8); focusP = mates[KIND].position.clone().add(V(0, 1.3, 0));
    } else {
      camAt(pCam, [[92.6, [.15, .82, 1.25], [0, .72, 0], 30], [96.12, [.12, .8, 1.05], [0, .72, 0], 28]], st);
      fillAt(pL, pCam, 1.5, '#ffe8d4', 4); focusP = V(0, .8, .1);
    }
    post.set({ focus: pCam.position.distanceTo(focusP), aperture: st >= T.l29 || (st >= T.l27 && st < T.l28) ? .0024 : .0012, maxblur: .007, bloom: .5, threshold: .8 });
    post.render();
  }
  // 圖卡在灰色段跟著變灰（#29 愛心卡留一點顏色）/ cards grey with the world, the love card keeps a little colour
  const cardGray = st => valAt([[80.5, 0], [82.5, .15], [86, .6], [92.5, .6], [92.8, .25], [96, .25], [96.2, .6]], st);
  return { dur: DUR, songStart: S0, frame, cardGray, keys: ['seasons', 'grow', 'hard', 'temporary', 'love'] };
}
