// s03 — Verse 2（全曲 66.0–80.5 s；本地秒 t＝全曲秒 − 66.0）
// 季節顏色：秋橘（#18–#22）→ 開始褪灰（#23）
//   #18 66.0  Sunsets, sunrises → 學校大門口：太陽落下又升起（縮時），背書包的女孩 7 歲 → 一個夜晚後變 13 歲
//   #19 69.3  Livin' the dream, watchin' the leaves → 走進教室，走到窗邊；窗外楓葉飄落
//   #20 71.22 Changin' the seasons → 越過她的肩看窗外：樹從綠變橘變紅（縮時）
//   #21 73.3  Some nights I think of you → 三個同學圍成一圈丟球玩，她站在旁邊看
//   #22 77.3  Relivin' the past, wishin' it'd last → 臉部特寫：胸前羽毛墜子發光，她微笑回想
//   #23 79.28 Wishin' and dreamin' → 她往前一步想加入，同學轉身走開（顏色開始褪）
import { THREE, V, C, prog, ease, easeOut, lerp, clamp, hash, makePost, makeChar, skyDome, setSky, hills, tree, motes, camAt, valAt, lightRig, pendantGlow } from '../engine/world.js';
import { M, fillAt, classmate, backpack, pendant, room, desk, deskMat } from './s03_kit.js';

const S0 = 66.0, DUR = 14.5;
const T = { l18: 66.0, l19: 69.3, l20: 71.22, l21: 73.3, l22: 77.3, l23: 79.28, end: 80.5 };

export async function setup({ renderer }) {
  // ════════ E. 學校大門口（縮時日落日出）/ school gate, sunset–sunrise time-lapse ════════
  const E = new THREE.Scene(); E.background = C('#f0a066'); E.fog = new THREE.Fog('#f0a066', 30, 140);
  const eSky = skyDome(); E.add(eSky);
  const eL = lightRig(E);
  const eGround = hills({ w: 200, d: 200, amp: .25, freq: .12, color: '#a86a3c' }); E.add(eGround);
  // 校舍（右後方，讓左邊的天空留給太陽）/ the school building sits back-right
  const school = new THREE.Group(); school.position.set(5.5, 0, -20); E.add(school);
  const sm = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .9, ...o });
  { const b = new THREE.Mesh(new THREE.BoxGeometry(14, 4.6, 4), sm('#ecdcbc')); b.position.y = 2.3; b.castShadow = b.receiveShadow = true; school.add(b);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(14.6, .45, 4.6), sm('#9a4a3a')); roof.position.y = 4.8; school.add(roof);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), sm('#ecdcbc')); tower.position.set(-1, 6.2, 0); school.add(tower);
    const clock = new THREE.Mesh(new THREE.CircleGeometry(.7, 24), sm('#fff8e8')); clock.position.set(-1, 6.3, 1.21); school.add(clock);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, .1), sm('#6b4a34')); door.position.set(-1, 1.1, 2.02); school.add(door); }
  const winMat = new THREE.MeshStandardMaterial({ color: '#4a5a6a', emissive: '#ffcf7a', emissiveIntensity: 0, roughness: .3 });
  for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) { if (r === 0 && i === 2) continue; const w = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .95), winMat); w.position.set(-5.6 + i * 2.15 + (i > 2 ? .4 : 0), 1.5 + r * 1.9, 2.03); school.add(w); }
  // 圍牆與校門柱 / wall and gate posts
  { const wallM = sm('#b8a58a'); for (const [x, wdt] of [[-6, 8], [7, 9]]) { const wl = new THREE.Mesh(new THREE.BoxGeometry(wdt, .9, .3), wallM); wl.position.set(x, .45, -4); wl.castShadow = true; E.add(wl); }
    for (const x of [-1.8, 2.3]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.45, 1.9, .45), sm('#a8957a')); p.position.set(x, .95, -4); p.castShadow = true; E.add(p); } }
  const eCrowns = ['#d9582b', '#e8862e', '#c9472a', '#f0a43a', '#b8452c'];
  for (let i = 0; i < 30; i++) { const x = (hash(i + 40) - .5) * 60, z = -6 - hash(i + 41) * 40; if (x > -1 && x < 13 && z < -16) continue;
    const t = tree({ h: 4.5 + hash(i + 42) * 3, r: 1.4 + hash(i + 43) * .8, seed: i + 40, crown: eCrowns[i % 5] }); t.position.set(x, 0, z); E.add(t); }
  const eLeaves = motes({ n: 120, area: [10, 4, 8], color: '#ff9a3c', size: .06, seed: 21 }); eLeaves.material.blending = THREE.NormalBlending; eLeaves.position.set(0, 0, -1); E.add(eLeaves);
  const kidE = await makeChar(M, { D7A: 'D7A.glb', D13A: 'D13A.glb' }, { D7A: 1.17, D13A: 1.55 }); E.add(kidE);
  const bagE = backpack(); kidE.add(bagE);
  const kidEGlow = pendantGlow(kidE, .79, .12);
  const eCam = new THREE.PerspectiveCamera(36, 16 / 9, .05, 600);

  // ════════ R. 教室（秋天下午）/ the classroom ════════
  const R = new THREE.Scene(); R.background = C('#f2b47a'); R.fog = new THREE.Fog('#f2b47a', 30, 90);
  const rSky = skyDome(); R.add(rSky); setSky(rSky, { top: '#9ab0c8', mid: '#f6c08a', bot: '#ffd8a8', sunDir: V(-1, .25, .4), sunCol: '#fff0d0', sunSize: 0, sunGlow: .4 });
  const rL = lightRig(R); rL.key.color.set('#ffc488'); rL.key.intensity = 3.2; rL.key.position.set(-14, 7, 3); rL.key.target.position.set(0, 0, 1);
  rL.rim.color.set('#ffd2a0'); rL.rim.intensity = .5; rL.rim.position.set(-6, 4, 6); rL.hemi.color.set('#ffe6cc'); rL.hemi.groundColor.set('#7a5a40'); rL.hemi.intensity = 1.25;
  const WIN = { z0: -.6, z1: 2.8, y0: .9, y1: 2.55 };
  const cls = room({ w: 7, d: 9, h: 3.2, wall: '#efe0c4', floor: '#b88a5c', win: WIN }); R.add(cls);
  const roomFill = new THREE.PointLight('#ffe2c0', 4, 9, 1.6); roomFill.position.set(.5, 2.8, .5); R.add(roomFill);
  { const bb = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.2, .06), new THREE.MeshStandardMaterial({ color: '#2f4a3a', roughness: .9 })); bb.position.set(.6, 1.7, -4.36); R.add(bb);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.15, .08), new THREE.MeshStandardMaterial({ color: '#8a5a3a', roughness: .8 })); door.position.set(.6, 1.075, 4.37); R.add(door);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.04, 8, 6), new THREE.MeshStandardMaterial({ color: '#d8b060', metalness: .6, roughness: .3 })); knob.position.set(.95, 1.05, 4.31); R.add(knob);
    // 牆上的 Welcome 小旗子 / a little Welcome garland
    for (let i = 0; i < 7; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(.12, .24, 3), new THREE.MeshStandardMaterial({ color: ['#e8743a', '#f0c040', '#7fb3d5', '#9ccc65'][i % 4], roughness: .8 }));
      f.rotation.set(Math.PI / 2, 0, Math.PI); f.position.set(-.3 + i * .3, 2.55 - Math.sin(i / 6 * Math.PI) * .12, 4.36); f.scale.z = .3; R.add(f); } }
  const dm = deskMat(); for (const x of [-1.0, .5, 2.0]) for (const z of [-2.6, -1.3]) { const d = desk(dm); d.position.set(x, 0, z); R.add(d); }
  // 窗外：地面、一棵會換顏色的樹、遠樹、落葉 / outside the window
  const out = hills({ w: 80, d: 80, amp: .2, freq: .2, color: '#9a7a48' }); out.position.set(-44, 0, 0); R.add(out);
  const bigTree = tree({ h: 3.4, r: 1.4, seed: 77, crown: '#e8862e' }); bigTree.position.set(-7.8, 0, 1.0); R.add(bigTree);
  const farTrees = []; for (let i = 0; i < 10; i++) { const t = tree({ h: 4 + hash(i + 90) * 2, r: 1.4, seed: i + 90, crown: ['#d9582b', '#e8862e', '#f0a43a'][i % 3] }); t.position.set(-10 - hash(i + 91) * 10, 0, -6 + i * 1.6); R.add(t); farTrees.push(t); }
  const rLeaves = motes({ n: 90, area: [3.5, 3.5, 5], color: '#ff8a30', size: .07, seed: 31 }); rLeaves.material.blending = THREE.NormalBlending; rLeaves.position.set(-5.6, .2, -1.3); R.add(rLeaves);
  const girl = await makeChar(M, { D13A: 'D13A.glb' }, { default: 1.55 }); R.add(girl);
  const bagR = backpack(); bagR.position.set(0, 1.0, -.16); girl.add(bagR);
  const pend = pendant(); pend.position.set(0, 1.08, .13); girl.add(pend);
  const girlGlow = pendantGlow(girl, 1.08, .14);
  const pendL = new THREE.PointLight('#5ff2df', 0, .9, 2); girl.add(pendL); pendL.position.set(0, 1.1, .3);
  // 同學 / classmates
  const mates = [
    classmate({ shirt: '#7fb3d5', pants: '#4f5f7f', hair: '#3a2a22', mood: 'smile' }),
    classmate({ shirt: '#f4a6b8', pants: '#6a5a7a', hair: '#2e2420', mood: 'smile', girl: true, h: 1.42 }),
    classmate({ shirt: '#a8d080', pants: '#5a5040', hair: '#5a3a28', mood: 'smile', h: 1.48 })];
  mates.forEach(m => R.add(m));
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(.1, 2), new THREE.MeshStandardMaterial({ color: '#e04a3a', roughness: .5 })); ball.castShadow = true; R.add(ball);
  const rCam = new THREE.PerspectiveCamera(35, 16 / 9, .05, 300);

  const post = makePost(renderer, E, eCam);

  // ── 縮時太陽：a 角度掃過兩個日落、兩個日出 / time-lapse sun angle
  const A0 = Math.PI * .55, A1 = Math.PI * .55 + 5.9;
  const sunA = st => lerp(A0, A1, prog(st, T.l18, T.l19));
  const SKY = { night: ['#1c2a55', '#3a4a80', '#4c5a90'], hor: ['#6b5f8a', '#f08a5a', '#ffb070'], day: ['#8fb0cc', '#f4c89a', '#f8dab0'] };
  const skyCol = (e, i) => valAt([[-1, SKY.night[i]], [-.4, SKY.night[i]], [0, SKY.hor[i]], [.55, SKY.day[i]], [1, SKY.day[i]]], e);

  function frame(t, st) {
    const sat = valAt([[66, 1.08], [79.3, 1.05], [80.5, .82]], st);
    const tint = valAt([[66, '#ffe0bc'], [79.3, '#ffdcb8'], [80.5, '#f0e2d2']], st);
    post.set({ sat, tint, vig: .38, fade: 0, t: st });

    // ───────── #18 校門口縮時 / school gate time-lapse
    if (st < T.l19) {
      post.set({ scene: E, camera: eCam });
      const a = sunA(st), e = Math.sin(a), dir = V(Math.cos(a) * .55, .16 + .5 * e, -1);
      setSky(eSky, { top: skyCol(e, 0), mid: skyCol(e, 1), bot: skyCol(e, 2), sunDir: dir, sunCol: valAt([[-.2, '#ff9a50'], [.2, '#ffd890'], [.7, '#fff3d0']], e), sunSize: e > -.32 ? .016 : 0, sunGlow: clamp(.4 + e) });
      E.fog.color.set(skyCol(e, 1)); E.background.copy(E.fog.color);
      const day = clamp((e + .25) / .6);
      eL.key.position.copy(dir.clone().normalize().multiplyScalar(30)); eL.key.target.position.set(0, 0, 0); eL.key.intensity = 2.8 * day; eL.key.color.set(valAt([[0, '#ff9050'], [.6, '#ffd8a8']], e));
      eL.rim.intensity = .4 + .8 * day; eL.rim.color.set(valAt([[-.5, '#8aa0e0'], [.3, '#ffcf8a']], e)); eL.rim.position.set(-10, 6, -10);
      eL.hemi.color.set(valAt([[-.5, '#6a7ab8'], [.4, '#ffe2c4']], e)); eL.hemi.intensity = lerp(.85, .9, day);
      winMat.emissiveIntensity = (1 - day) * 1.4;
      // 一個夜晚之後長大 / she grows up after the first night
      const grown = st >= 67.65;
      kidE.setPose(grown ? 'D13A' : 'D7A'); kidE.position.set(-.5, 0, 0); kidE.rotation.y = Math.PI / 2 - .35;
      if (grown) { bagE.position.set(0, 1.0, -.16); bagE.scale.setScalar(1); kidEGlow.sprite.position.set(0, 1.08, .13); }
      else { bagE.position.set(0, .74, -.12); bagE.scale.setScalar(.78); kidEGlow.sprite.position.set(0, .79, .12); }
      kidEGlow.set(window.FEATHER || 0);
      eLeaves.update(st, { fall: .3, sway: .5 });
      camAt(eCam, [[66.0, [.25, 1.0, 3.9], [-.55, 1.2, -4], 34], [69.3, [.2, 1.02, 3.3], [-.55, 1.22, -4], 33]], st);
      fillAt(eL, eCam, lerp(1.6, 7.0, 1 - day), valAt([[-.5, '#c8d4ff'], [.4, '#ffe8cc']], e));
      post.set({ focus: eCam.position.distanceTo(kidE.position) , aperture: .0008, maxblur: .005, bloom: .5, threshold: .8 });
      post.render(); return;
    }

    // ───────── 教室 #19–#23 / classroom
    post.set({ scene: R, camera: rCam });
    rLeaves.update(st, { fall: .45, sway: .4 });
    girl.setPose('D13A');
    // #20 窗外的樹縮時變色（綠→橘→紅）；其他時間停在秋橘 / tree time-lapse
    const crown = valAt([[0, '#e8862e'], [71.0, '#e8862e'], [71.3, '#6f9a45'], [72.0, '#8fae3a'], [72.5, '#e8a33d'], [73.2, '#c9472a'], [80.5, '#c9472a']], st);
    bigTree.userData.crown.color.set(crown); rLeaves.material.color.set(valAt([[71.3, '#9cc060'], [72.4, '#f0a03a'], [73.2, '#d84a2a']], st));
    if (st < T.l20 || st >= T.l21) rLeaves.material.color.set(st < T.l20 ? '#ff8a30' : '#d84a2a');
    // 同學的基本位置（後排圍一圈）/ classmates' ring at the back
    const ring = V(-1.9, 0, -.3);
    const mateAt = (i, st) => { const a = i * Math.PI * 2 / 3 + .4; return V(ring.x + Math.cos(a) * .65, 0, ring.z + Math.sin(a) * .65); };
    let shotFocus;
    const showMates = st >= T.l21;
    mates.forEach(m => { m.visible = showMates; });
    ball.visible = st >= T.l21 && st < T.l23 + .2;
    bagR.visible = st < T.l21;   // 書包放下了 / bag put down after entering
    if (st < T.l20) {
      // #19 從門口走進來，走到窗邊看葉子 / walk in from the door to the window
      const k = prog(st, 69.35, 70.75), kk = ease(k);
      girl.position.set(lerp(.6, -2.0, kk), Math.abs(Math.sin(k * Math.PI * 6)) * .02 * (k < 1 ? 1 : 0), lerp(3.8, 1.9, kk));
      const walkRot = Math.atan2(-2.6, -1.9); girl.rotation.y = st < 70.75 ? walkRot : lerp(walkRot, -Math.PI / 2 - .25, ease(prog(st, 70.75, 71.1)));
      camAt(rCam, [[69.3, [1.7, 1.5, -1.75], [.2, 1.15, 3.4], 36], [71.22, [1.6, 1.5, -1.7], [-1.5, 1.2, 2.2], 36]], st);
      fillAt(rL, rCam, 1.0); shotFocus = girl.position.clone().add(V(0, 1.3, 0));
    } else if (st < T.l21) {
      // #20 越肩看窗外的樹 / over the shoulder at the tree
      girl.position.set(-2.0, 0, 1.9); girl.rotation.y = -Math.PI / 2 - .25;
      camAt(rCam, [[71.22, [.35, 1.6, 3.7], [-5.5, 2.0, .7], 31], [73.3, [.15, 1.6, 3.5], [-5.5, 2.05, .7], 29]], st);
      fillAt(rL, rCam, .8); shotFocus = V(-3.5, 1.8, 1.1);
    } else {
      // #21 同學玩球、她在旁邊看；#22 特寫；#23 她往前，同學轉身走開 / classmates, close-up, rejection
      const step = ease(prog(st, 79.35, 79.9));
      girl.position.set(lerp(-2.0, -1.95, step), 0, lerp(1.9, 1.35, step)); girl.rotation.y = st < T.l22 ? 2.8 : st < T.l23 ? 2.6 : 3.0;
      const leave = ease(prog(st, 79.55, 80.5)), G = V(-2.0, 0, 1.9);
      mates.forEach((m, i) => { const p = mateAt(i, st); const ctr = Math.atan2(ring.x - p.x, ring.z - p.z);
        const ad = p.clone().sub(G).setY(0).normalize();
        m.position.set(p.x + ad.x * leave * (.7 + .2 * i), 0, p.z + ad.z * leave * (.7 + .2 * i));
        // 轉身背對她 / turn their backs
        let away = Math.atan2(ad.x, ad.z); while (away - ctr > Math.PI) away -= Math.PI * 2; while (away - ctr < -Math.PI) away += Math.PI * 2;
        m.rotation.y = st < 79.45 ? ctr : lerp(ctr, away, ease(prog(st, 79.45, 79.75)));
        m.walk(st + i, leave > 0 && leave < 1 ? 1 : 0); m.userData.armL.rotation.z = -.12; m.userData.armR.rotation.z = .12; });
      // 球在三人之間拋 / the ball is tossed around the ring
      { const per = 1.1, n = Math.floor((st - T.l21) / per), f = ((st - T.l21) / per) - n; const a = mateAt(n % 3), b = mateAt((n + 1) % 3);
        ball.position.set(lerp(a.x, b.x, f), 1.2 + Math.sin(f * Math.PI) * .7, lerp(a.z, b.z, f)); ball.rotation.set(st * 3, st * 2, 0);
        mates.forEach((m, i) => { const thrower = i === n % 3 && f < .25, catcher = i === (n + 1) % 3 && f > .75; if (st < 79.45) { m.userData.armL.rotation.x = m.userData.armR.rotation.x = (thrower || catcher) ? -1.25 : -.25; m.userData.armL.rotation.z = -.25; m.userData.armR.rotation.z = .25; } }); }
      if (st < T.l22) {
        camAt(rCam, [[73.3, [2.0, 1.85, -3.5], [-1.4, 1.3, 1.4], 36], [77.3, [1.8, 1.82, -3.3], [-1.4, 1.3, 1.4], 34]], st);
        fillAt(rL, rCam, 1.2); shotFocus = girl.position.clone().add(V(.6, 1.2, .3));
      } else if (st < T.l23) {
        // #22 臉部特寫 / close-up
        const fw = V(Math.sin(girl.rotation.y), 0, Math.cos(girl.rotation.y));
        const cp = girl.position.clone().add(fw.clone().multiplyScalar(1.05)).add(V(0, 1.3, 0)), lk = girl.position.clone().add(V(0, 1.25, 0));
        camAt(rCam, [[77.3, [cp.x, cp.y, cp.z], [lk.x, lk.y, lk.z], 30], [79.28, [cp.x - fw.x * .15, cp.y, cp.z - fw.z * .15], [lk.x, lk.y + .02, lk.z], 28]], st);
        fillAt(rL, rCam, 1.6, '#ffdcb0', 4); shotFocus = girl.position.clone().add(V(0, 1.3, .1));
      } else {
        camAt(rCam, [[79.28, [2.0, 1.85, -3.5], [-1.4, 1.3, 1.4], 36], [80.5, [1.95, 1.84, -3.4], [-1.4, 1.3, 1.4], 36]], st);
        fillAt(rL, rCam, 1.1); shotFocus = girl.position.clone().add(V(.8, 1.2, .3));
      }
    }
    // 胸前墜子：#22 回想時亮起來 / the pendant brightens while she remembers
    const mem = Math.sin(Math.PI * prog(st, 77.4, 79.3));
    pend.children[0].material.emissiveIntensity = 1.0 + .8 * mem; pendL.intensity = .05 + .25 * mem;
    girlGlow.set(Math.max(window.FEATHER || 0, mem * .3));
    post.set({ focus: rCam.position.distanceTo(shotFocus), aperture: st >= T.l22 && st < T.l23 ? .0024 : .0012, maxblur: .007, bloom: .42, threshold: .82 });
    post.render();
  }
  return { dur: DUR, songStart: S0, frame, keys: ['sunsets', 'sunrises', 'leaves', 'seasons'] };
}
