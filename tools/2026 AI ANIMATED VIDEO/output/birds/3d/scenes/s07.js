// s07 — Final Chorus 前半（全曲 169.04–195.0 s；本地秒 t＝全曲秒 − 169.04）
// 季節顏色：黑 → 灰綠 → 淡綠
//   #43 169.04 I know that → 全黑中一盞燈：空椅子（前景）對面坐著低頭的女孩（D13B）
//   #44 171.12 （Ooh）→ 她站在窗邊抬頭（D13A），灰綠的晨光照進來，眼角一滴光
//   #45 174.70 Birds fly in different directions → 草地上的紀念十字架＋媽媽照片＋紫色花；灰色的鳥往不同方向飛過
//   #46 179.50 （Ooh）→ 大遠景：她跪在崖邊十字架旁（D13C），下面是山谷雲霧
//   #47 182.46 I hope to see you again → 特寫：手心的青綠羽毛發光
//   #48 187.00 （Ooh）→ 她含淚微笑，晨光變暖、草地轉淡綠
//   #49 190.46 Birds fly in different directions → 羽毛在手心化成一團光，金色小鳥從光裡往四面八方飛出
import { THREE, V, C, prog, ease, easeOut, lerp, clamp, hash, makePost, makeChar, loadModel, camAt, valAt, lightRig, feather, motes } from '../engine/world.js';
import { buildMeadow, setMeadow, fill, birdFace, glowSprite, gm, CX, CZ, GX, GZ } from './s07_world.js';

const S0 = 169.04, DUR = 25.96, M = '../../models/';
export async function setup({ renderer }) {
  // ════════ D. 黑暗的餐桌 / the dark dining table ════════
  const D = new THREE.Scene(); D.background = C('#050506'); D.fog = new THREE.Fog('#050506', 4, 9);
  const dHemi = new THREE.HemisphereLight('#c8beb0', '#3a2e24', .6); D.add(dHemi);
  const lamp = new THREE.SpotLight('#ffd9a0', 9, 6, .75, .55, 2); lamp.position.set(0, 2.05, -.05); lamp.target.position.set(0, .7, -.1); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); D.add(lamp, lamp.target);
  const lampFill = new THREE.PointLight('#ffcf90', 1.2, 4, 2); lampFill.position.set(0, 1.5, .6); D.add(lampFill);
  const woodD = new THREE.MeshStandardMaterial({ color: '#6a4a32', roughness: .7 });
  const table = new THREE.Group(); D.add(table);
  { const top = new THREE.Mesh(new THREE.BoxGeometry(1.3, .05, .8), woodD); top.position.y = .74; top.castShadow = top.receiveShadow = true; table.add(top);
    for (const [x, z] of [[-.58, -.34], [.58, -.34], [-.58, .34], [.58, .34]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(.05, .72, .05), woodD); l.position.set(x, .36, z); table.add(l); } }
  const plateM = new THREE.MeshStandardMaterial({ color: '#efe9de', roughness: .4 });
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(.13, .1, .015, 24), plateM); plate.position.set(0, .773, -.22); D.add(plate);
  const plate2 = plate.clone(); plate2.position.set(0, .773, .24); D.add(plate2);   // 對面空位的盤子 / the empty place's plate
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(.035, .03, .09, 16), plateM); cup.position.set(.22, .81, -.2); D.add(cup);
  // 空椅子（前景）/ the empty chair in the foreground
  const chair = new THREE.Group(); D.add(chair);
  { const seat = new THREE.Mesh(new THREE.BoxGeometry(.42, .04, .42), woodD); seat.position.y = .45; chair.add(seat);
    for (const [x, z] of [[-.18, -.18], [.18, -.18], [-.18, .18], [.18, .18]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(.035, .45, .035), woodD); l.position.set(x, .225, z); chair.add(l); }
    for (const x of [-.18, .18]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.035, .5, .035), woodD); p.position.set(x, .7, .19); chair.add(p); }
    const back = new THREE.Mesh(new THREE.BoxGeometry(.4, .14, .025), woodD); back.position.set(0, .88, .19); chair.add(back);
    chair.traverse(o => { if (o.isMesh) o.castShadow = true; }); }
  chair.position.set(0, 0, .72);
  // 吊燈 / pendant lamp
  { const shade = new THREE.Mesh(new THREE.ConeGeometry(.2, .16, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#3a3430', side: THREE.DoubleSide, roughness: .6 })); shade.position.set(0, 2.1, -.05); D.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.045, 16, 12), new THREE.MeshBasicMaterial({ color: '#fff0c8' })); bulb.position.set(0, 2.04, -.05); D.add(bulb);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, 1.2, 6), new THREE.MeshBasicMaterial({ color: '#111' })); cord.position.set(0, 2.78, -.05); D.add(cord); }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ color: '#2a221c', roughness: .9 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; D.add(floor);
  // 窗（#44 灰綠晨光）/ the window that brings grey-green dawn light
  const win = new THREE.Group(); D.add(win);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.3), new THREE.MeshBasicMaterial({ color: '#000000', fog: false })); win.add(glass);
  { const mm = new THREE.MeshStandardMaterial({ color: '#1c1916' }); const bar = (w, h, x, y) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, .05), mm); b.position.set(x, y, .02); win.add(b); };
    bar(1.08, .06, 0, .65); bar(1.08, .06, 0, -.65); bar(.06, 1.36, -.5, 0); bar(.06, 1.36, .5, 0); bar(.04, 1.3, 0, 0); bar(1.0, .04, 0, 0); }
  win.position.set(-2.1, 1.45, .2); win.rotation.y = Math.PI / 2;
  const winLight = new THREE.DirectionalLight('#cfe0c4', 0); winLight.position.set(-6, 3, 1.2); winLight.target.position.set(-1, 1.2, .3); D.add(winLight, winLight.target);
  const winFill = new THREE.PointLight('#d6e6cc', 0, 4, 2); D.add(winFill);
  const camFill = new THREE.PointLight('#ffe2c0', 0, 4, 2); D.add(camFill);
  const sitGirl = await makeChar(M, { D13B: 'D13B.glb' }, { default: 1.25 }); D.add(sitGirl);
  const standGirl = await makeChar(M, { D13A: 'D13A.glb' }, { default: 1.55 }); D.add(standGirl);
  const tear = glowSprite('#e8fbff', .03); D.add(tear);
  const dCam = new THREE.PerspectiveCamera(35, 16 / 9, .03, 100);

  // ════════ G. 崖邊紀念草地 / memorial meadow ════════
  const m = await buildMeadow(M); const { G, L, girl, cam } = m;
  const feat = feather({ glow: 1.4 }); feat.scale.setScalar(.12); G.add(feat);
  const featL = new THREE.PointLight('#5ff2df', 0, 1.2, 2); G.add(featL);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(.05, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff6dc', transparent: true, opacity: 0 })); G.add(orb);
  const orbGlow = glowSprite('#fff0c0', .5); G.add(orbGlow);
  const orbL = new THREE.PointLight('#ffe8b0', 0, 4, 2); G.add(orbL);
  const tear2 = glowSprite('#e8fbff', .04); G.add(tear2);
  // 灰色鳥（#45）/ grey birds crossing
  const grey = []; for (let i = 0; i < 7; i++) { const b = await loadModel(M + 'BIRD.glb', 1.0 + hash(i + 50) * .4, { axis: 'xz' }); b.userData.mats.forEach(mt => { mt.color.set('#b8bcb6'); }); G.add(b); grey.push(b); }
  // 金色小鳥（#49）/ small golden birds
  const gold = []; for (let i = 0; i < 12; i++) { const b = await loadModel(M + 'BIRD.glb', .3 + hash(i + 80) * .12, { axis: 'xz' });
    b.userData.mats.forEach(mt => { mt.color.set('#ffd36a'); mt.emissive = C('#c07a10'); mt.emissiveIntensity = .9; }); G.add(b); gold.push(b); }

  const post = makePost(renderer, D, dCam);
  // 手心位置（D13C 捧著的手）/ where the cupped hands are
  function handP() { const off = V(0, .6, .17).applyAxisAngle(V(0, 1, 0), girl.rotation.y); return V(GX, gm(GX, GZ), GZ).add(off); }
  function headP() { const off = V(0, .93, .06).applyAxisAngle(V(0, 1, 0), girl.rotation.y); return V(GX, gm(GX, GZ), GZ).add(off); }

  function frame(t, st) {
    // ───────── 餐桌 #43–#44（169.04–174.7）
    if (st < 174.7) {
      post.set({ scene: D, camera: dCam });
      const fadeIn = 1 - prog(st, 169.04, 169.9);
      const dawn = prog(st, 171.6, 174.4);
      post.set({ sat: lerp(.25, .4, dawn), tint: valAt([[169, '#e0dccf'], [171.6, '#e0dccf'], [174.4, '#d6e6d0']], st), vig: .5, fade: fadeIn, fadeCol: '#000000', t: st });
      glass.material.color.set(valAt([[171.2, '#000000'], [174.4, '#8fa892']], st));
      winLight.intensity = dawn * 1.6; winFill.intensity = dawn * .8;
      dHemi.intensity = lerp(.6, .5, dawn);
      if (st < 171.12) {   // #43 空椅子對面的女孩 / the girl across the empty chair
        sitGirl.setPose('D13B'); sitGirl.position.set(0, 0, -.78); sitGirl.rotation.y = 0; standGirl.setPose(null); tear.material.opacity = 0;
        lamp.intensity = 9; lampFill.intensity = 2.2; camFill.position.set(.4, 1.3, 1.9); camFill.distance = 5; camFill.intensity = 3;
        camAt(dCam, [[169.04, [.55, 1.32, 2.75], [0, .85, -.45], 34], [171.12, [.45, 1.28, 2.45], [0, .85, -.45], 32]], st);
        post.set({ focus: dCam.position.distanceTo(V(0, .9, -.6)), aperture: .0025, maxblur: .008, bloom: .55, threshold: .8 });
        post.render(); return;
      }
      // #44 窗邊抬頭、眼角一滴光 / by the window, looking up, a tear of light
      sitGirl.setPose(null); standGirl.setPose('D13A'); standGirl.position.set(-1.25, 0, .25); standGirl.rotation.y = -1.05;
      lamp.intensity = lerp(6, 2.5, dawn); lampFill.intensity = .5;
      const look = camAt(dCam, [[171.12, [-.55, 1.42, 1.15], [-1.25, 1.38, .25], 30], [174.7, [-.6, 1.43, 1.0], [-1.25, 1.39, .25], 27]], st);
      winFill.position.set(-1.75, 1.55, .75); winFill.intensity = .6 + dawn * 2.2; camFill.position.copy(dCam.position).add(V(0, .2, 0)); camFill.intensity = .9;
      const eye = V(.035, 1.39, .085).applyAxisAngle(V(0, 1, 0), standGirl.rotation.y).add(standGirl.position);
      const tk = prog(st, 172.2, 174.4); tear.position.copy(eye).add(V(0, -tk * .05, 0)); tear.material.opacity = Math.sin(Math.PI * tk) * .9; tear.scale.setScalar(.05 + .012 * Math.sin(st * 8));
      post.set({ focus: dCam.position.distanceTo(V(-1.25, 1.38, .25)), aperture: .003, maxblur: .01, bloom: .6, threshold: .78 });
      post.render(); return;
    }
    // ───────── 紀念草地 #45–#49（174.7–195.0）
    post.set({ scene: G, camera: cam });
    const g = valAt([[174.7, 0], [186.5, 0], [190.4, .9], [195, 1.15]], st); setMeadow(m, g);
    post.set({ sat: valAt([[174.7, .38], [186.5, .45], [190.4, .75], [195, .85]], st), tint: valAt([[174.7, '#d8e2d2'], [186.5, '#dbe6d4'], [190.4, '#ecf6dc'], [195, '#f2f8dc']], st), vig: .38, fade: 1 - prog(st, 174.7, 175.4), fadeCol: '#d6e6d0', t: st });
    m.gMotes.position.set(GX, gm(GX, GZ), GZ); m.gMotes.update(st, { fall: .03, sway: .4 }); m.gMotes.material.opacity = lerp(.3, .85, g);
    girl.setPose(st >= 179.5 ? 'D13C' : null);
    const H = handP(), HD = headP();
    // 羽毛：#46 起在手心，#49 化成光 / feather in the palms, dissolving into light at #49
    const dis = prog(st, 190.9, 192.4);
    feat.visible = st >= 179.5 && dis < 1;
    feat.position.copy(H).add(V(0, .045 + .01 * Math.sin(st * 1.5), 0)); feat.rotation.set(Math.PI / 2 - .25, 0, girl.rotation.y + .7); feat.scale.setScalar(.12 * (1 - dis * .8));
    feat.userData.mat.emissiveIntensity = .55 + .25 * Math.sin(st * 3) + dis * 2; featL.position.copy(feat.position); featL.intensity = feat.visible ? .25 + dis * .6 : 0;
    const ok = prog(st, 190.6, 192.2); orb.position.copy(H).add(V(0, .06 + ok * .06, 0)); orb.material.opacity = ok; orb.scale.setScalar(.4 + .6 * ok + .06 * Math.sin(st * 5));
    orbGlow.position.copy(orb.position); orbGlow.material.opacity = ok * .45; orbGlow.scale.setScalar(.14 + ok * .16 + .02 * Math.sin(st * 4)); orbL.position.copy(orb.position).add(V(0, 0, .25)); orbL.intensity = ok * .35; orb.material.color.set('#ffe9b0');
    // 金色小鳥從光裡飛出 / golden birds burst from the light
    gold.forEach((b, i) => { const t0 = 192.3 + hash(i + 81) * .7, k = clamp((st - t0) / 2.6); b.visible = st >= t0;
      const a = (i / gold.length) * Math.PI * 2 + hash(i + 82) * .4, up = .35 + hash(i + 83) * .9, sp = 3.2 + hash(i + 84) * 2;
      const r = easeOut(k) * sp, dx = Math.cos(a), dz = Math.sin(a) * .7 - .45;
      b.position.set(orb.position.x + dx * r, orb.position.y + up * r * .8 + Math.sin(st * 6 + i) * .03, orb.position.z + dz * r);
      birdFace(b, dx, up * .8, dz, Math.sin(st * 7 + i) * .2); b.children[0].scale.y = 1 + .3 * Math.sin(st * 14 + i * 2); b.scale.setScalar(.5 + .5 * Math.min(1, k * 4)); });
    // 灰色的鳥往不同方向飛（#45）/ grey birds in different directions
    grey.forEach((b, i) => { const a = i * .9 + .4, k = prog(st, 175.2 + i * .25, 182), dir = V(Math.cos(a), .15 + hash(i + 51) * .2, Math.sin(a) * .5 - .2);
      b.visible = st >= 174.7 && st < 182.46; b.position.set(CX + dir.x * k * 26, 3.2 + i * .25 + dir.y * k * 10, CZ - 3 + dir.z * k * 18); birdFace(b, dir.x, dir.y, dir.z, 0); b.children[0].scale.y = 1 + .3 * Math.sin(st * 9 + i); });
    // 眼淚 / tear (#48)
    const tk = prog(st, 187.6, 190.2); const eye = V(.03, .94, .075).applyAxisAngle(V(0, 1, 0), girl.rotation.y).add(V(GX, gm(GX, GZ), GZ));
    tear2.position.copy(eye).add(V(0, -tk * .045, 0)); tear2.material.opacity = st >= 187 && st < 190.46 ? Math.sin(Math.PI * tk) * .85 : 0;
    const Y0 = gm(CX, CZ);
    let focusP;
    if (st < 179.5) {   // #45 十字架、照片、紫色花 / cross, photo, flowers
      camAt(cam, [[174.7, [CX + .55, Y0 + .7, CZ + 2.1], [CX + .05, Y0 + .62, CZ], 30], [179.5, [CX + .4, Y0 + .62, CZ + 1.55], [CX + .03, Y0 + .6, CZ], 28]], st);
      fill(L, cam, 1.4); focusP = V(CX, Y0 + .6, CZ + .06);
    } else if (st < 182.46) {   // #46 大遠景：崖邊 / wide on the cliff
      camAt(cam, [[179.5, [-3.0, 2.6, -6.6], [.4, -.6, 4.5], 36], [182.46, [-2.7, 2.75, -6.1], [.4, -.7, 4.5], 36]], st);
      fill(L, cam, 0); focusP = V(GX, .6, GZ);
    } else if (st < 187) {   // #47 手心羽毛特寫 / close-up of the feather in her palms
      camAt(cam, [[182.46, [H.x + .42, H.y + .2, H.z + .95], [H.x, H.y + .02, H.z], 30], [187, [H.x + .34, H.y + .16, H.z + .8], [H.x, H.y + .02, H.z], 28]], st);
      fill(L, cam, .9, '#ffe8cc', 3); focusP = H;
    } else if (st < 190.46) {   // #48 含淚微笑 / smiling through tears
      camAt(cam, [[187, [HD.x + .3, HD.y + .02, HD.z + 1.15], [HD.x, HD.y - .02, HD.z], 28], [190.46, [HD.x + .24, HD.y + .02, HD.z + .95], [HD.x, HD.y - .01, HD.z], 26]], st);
      fill(L, cam, 1.2, '#ffe8cc', 3); focusP = HD;
    } else {   // #49 光、金色的鳥 / the light and golden birds
      camAt(cam, [[190.46, [GX + 1.0, .95, GZ + 2.4], [GX - .05, .78, GZ], 34], [195, [GX + 1.3, 1.05, GZ + 3.2], [GX - .05, .95, GZ], 40]], st);
      fill(L, cam, 1.0); focusP = HD;
    }
    post.set({ focus: cam.position.distanceTo(focusP), aperture: st >= 179.5 && st < 182.46 ? .0006 : .0022, maxblur: .008, bloom: lerp(.4, .5, prog(st, 190.4, 193)), threshold: .86 });
    post.render();
  }
  // 圖卡在黑／灰綠段跟著變灰，顏色回來時恢復 / cards grey in the dark, colour returns at the end
  const cardGray = st => valAt([[169, .8], [182, .6], [187, .45], [195, .1]], st);
  return { dur: DUR, songStart: S0, frame, cardGray, keys: ['fly', 'directions', 'again'] };
}
