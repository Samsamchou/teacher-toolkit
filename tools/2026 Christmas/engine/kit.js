// 畫風 K 場景工具：渲染器、後製、天空、極光、下雪、字幕 / renderer, post FX, sky, aurora, snow, subtitles.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { rng, pixTex, px } from './voxel.js';
export { THREE };

export const W = 1920, H = 1080;

export function makeStage(canvas, { bloom = 0.7, bloomR = 0.4, thr = 1.6, ao = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setSize(W, H, false); renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, W / H, 0.05, 400);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  let gtao = null;
  if (ao) { gtao = new GTAOPass(scene, camera, W, H); gtao.blendIntensity = 0.8; gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1, scale: 1 }); composer.addPass(gtao); }
  const bl = new UnrealBloomPass(new THREE.Vector2(W, H), bloom, bloomR, thr); composer.addPass(bl);
  const vig = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, amt: { value: 0.35 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform sampler2D tDiffuse;uniform float amt;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);vec2 d=vUv-.5;d.x*=1.6;float v=1.-amt*smoothstep(.35,1.1,length(d));gl_FragColor=vec4(c.rgb*v,c.a);}',
  });
  composer.addPass(new OutputPass()); composer.addPass(vig); composer.addPass(new SMAAPass(W, H));
  return { renderer, scene, camera, composer, bloom: bl, vignette: vig, gtao, render: () => composer.render() };
}

// 夜空漸層球＋星星 / gradient sky dome with stars
export function nightSky(scene, { top = '#0b1030', mid = '#1d2f63', bottom = '#4a6aa8', stars = 700 } = {}) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { cT: { value: new THREE.Color(top) }, cM: { value: new THREE.Color(mid) }, cB: { value: new THREE.Color(bottom) } },
    vertexShader: 'varying vec3 p;void main(){p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform vec3 cT,cM,cB;varying vec3 p;void main(){float h=p.y;vec3 c=h>0.15?mix(cM,cT,smoothstep(.15,.7,h)):mix(cB,cM,smoothstep(-.1,.15,h));gl_FragColor=vec4(c,1.);}',
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), mat); scene.add(dome);
  const r = rng(77), pos = [];
  for (let i = 0; i < stars; i++) { const a = r() * Math.PI * 2, e = 0.12 + r() * 1.3, R = 280; pos.push(R * Math.cos(e) * Math.cos(a), R * Math.sin(e), R * Math.cos(e) * Math.sin(a)); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const st = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, fog: false, map: squareSprite(), transparent: true }));
  scene.add(st); return { dome, stars: st };
}

// 方形粒子貼圖（方塊風）/ square sprite for blocky particles
let _sq; export function squareSprite() { return _sq ||= pixTex(4, 4, (g) => { px(g, 0, 0, '#ffffff', 4, 4); }, 'sq'); }

// 極光：幾片會飄的半透明布幕 / aurora curtains (additive shader)
export function aurora(scene, { y = 40, z = -150, width = 260, color1 = '#3dffb0', color2 = '#7a6bff' } = {}) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: { t: { value: 0 }, c1: { value: new THREE.Color(color1) }, c2: { value: new THREE.Color(color2) } },
    vertexShader: 'varying vec2 vUv;uniform float t;void main(){vUv=uv;vec3 p=position;p.z+=sin(p.x*.03+t*.4)*14.;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
    fragmentShader: `varying vec2 vUv;uniform float t;uniform vec3 c1,c2;
      float h(float x){return fract(sin(x*127.1)*43758.5);}
      void main(){float x=vUv.x*40.;float band=floor(x);float f=.55+.45*sin(band*.7+t*.9)*sin(band*.23+t*.5);
      float stripe=step(.15,fract(x));float v=smoothstep(0.,.25,vUv.y)*smoothstep(1.,.35,vUv.y);
      vec3 c=mix(c1,c2,smoothstep(.3,1.,vUv.y));float a=v*f*stripe*.55*(.6+.4*sin(vUv.x*9.+t*.3));
      a=floor(a*6.)/6.;gl_FragColor=vec4(c*a,a);}`,
  });
  const g = new THREE.Group();
  [[0, 0, 0], [40, 12, -25], [-60, 6, 20]].forEach(([x, dy, dz], i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(width, 70, 120, 1), mat); m.position.set(x, y + dy, z + dz); m.rotation.y = (i - 1) * 0.25; g.add(m); });
  scene.add(g); return { group: g, update: (t) => { mat.uniforms.t.value = t; } };
}

// 依時間決定位置的下雪（可逐格重現）/ deterministic snowfall: position = f(t)
export function snow(scene, { count = 2500, box = [40, 22, 40], center = [0, 0, 0], speed = 1.6, wind = 0.8, size = 0.07, color = 0xffffff, opacity = 0.95 } = {}) {
  const r = rng(99), base = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) { base[i * 4] = r(); base[i * 4 + 1] = r(); base[i * 4 + 2] = r(); base[i * 4 + 3] = 0.6 + r() * 0.8; }
  const geo = new THREE.BufferGeometry(); const pos = new Float32Array(count * 3); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, map: squareSprite(), transparent: true, opacity, depthWrite: false }));
  pts.frustumCulled = false; scene.add(pts);
  const update = (t) => {
    for (let i = 0; i < count; i++) {
      const sp = base[i * 4 + 3], y = ((base[i * 4 + 1] - t * speed * sp / box[1]) % 1 + 1) % 1;
      const x = ((base[i * 4] + t * wind * sp / box[0] + Math.sin(t * 1.3 + i) * 0.004) % 1 + 1) % 1;
      pos[i * 3] = center[0] + (x - 0.5) * box[0]; pos[i * 3 + 1] = center[1] + y * box[1]; pos[i * 3 + 2] = center[2] + (base[i * 4 + 2] - 0.5) * box[2];
    }
    geo.attributes.position.needsUpdate = true;
  };
  update(0); return { points: pts, update };
}

// ---------- 2D 疊字：卡拉 OK 字幕＋單字圖卡 / karaoke subtitle and word card ----------
export async function loadFont() { const f = new FontFace('Comic Relief', 'url(../fonts/ComicRelief-Bold.ttf)'); await f.load(); document.fonts.add(f); }

function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

// prog 0..1＝已唸到哪裡；target 單字用金色 / progress wipe; target word drawn gold
export function karaoke(g, text, prog, { target = null, y = H - 84 - 60, size = 64 } = {}) {
  g.save(); g.font = `bold ${size}px "Comic Relief"`; g.textBaseline = 'middle';
  const full = g.measureText(text).width;
  if (full > W - 220) {
    // 分成兩行：找最接近中間的空白 / split at the space nearest the middle
    let cut = -1, best = 1e9; for (let i = 0; i < text.length; i++) if (text[i] === ' ') { const d = Math.abs(g.measureText(text.slice(0, i)).width - full / 2); if (d < best) { best = d; cut = i; } }
    const a = text.slice(0, cut), b = text.slice(cut + 1), wa = g.measureText(a).width, wb = g.measureText(b).width, lh = size * 1.25;
    const bw = Math.max(wa, wb), padX = 46, bh = size * 1.75 + lh, y1 = y - lh / 2, y2 = y + lh / 2;
    g.fillStyle = 'rgba(12,16,40,0.72)'; rr(g, (W - bw) / 2 - padX, y - bh / 2 - lh / 2 + lh / 2 - 0, bw + padX * 2, bh, 26); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 3; g.stroke(); g.restore();
    const px = prog * (wa + wb);
    karaokeLine(g, a, Math.min(1, px / wa), { target, y: y1, size }); karaokeLine(g, b, Math.max(0, (px - wa) / wb), { target, y: y2, size });
    return;
  }
  const tw = full, x0 = (W - tw) / 2, padX = 46, bh = size * 1.75;
  g.fillStyle = 'rgba(12,16,40,0.72)'; rr(g, x0 - padX, y - bh / 2, tw + padX * 2, bh, 26); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 3; g.stroke();
  g.restore(); karaokeLine(g, text, prog, { target, y, size });
}
function karaokeLine(g, text, prog, { target = null, y, size }) {
  g.save(); g.font = `bold ${size}px "Comic Relief"`; g.textBaseline = 'middle';
  const tw = g.measureText(text).width, x0 = (W - tw) / 2;
  let ti = -1, tl = 0; if (target) { ti = text.toLowerCase().indexOf(target.toLowerCase()); tl = target.length; }
  const segs = ti < 0 ? [[text, false]] : [[text.slice(0, ti), false], [text.slice(ti, ti + tl), true], [text.slice(ti + tl), false]];
  const wipeX = x0 + tw * prog;
  let x = x0;
  for (const [s, isT] of segs) {
    if (!s) continue; const sw = g.measureText(s).width;
    g.lineJoin = 'round'; g.lineWidth = 10; g.strokeStyle = '#141a3a'; g.strokeText(s, x, y);
    g.fillStyle = isT ? '#ffe9a8' : '#ffffff'; g.fillText(s, x, y);
    if (wipeX > x) { g.save(); g.beginPath(); g.rect(x, y - size, Math.min(sw, wipeX - x), size * 2); g.clip(); g.fillStyle = isT ? '#ffb21e' : '#5fe0ff'; g.fillText(s, x, y); g.restore(); }
    x += sw;
  }
  g.restore();
}

// 右上角單字大圖卡：icon 是一張 canvas / top-right word card with an icon canvas
export function wordCard(g, word, icon, a = 1, { x = W - 470, y = 46, w = 420, h = 330 } = {}) {
  if (a <= 0) return; g.save(); g.globalAlpha = a;
  const s = 0.85 + 0.15 * Math.min(1, a); g.translate(x + w / 2, y + h / 2); g.scale(s, s); g.translate(-w / 2, -h / 2);
  g.fillStyle = '#fff8e6'; rr(g, 0, 0, w, h, 30); g.fill(); g.lineWidth = 8; g.strokeStyle = '#c83a33'; g.stroke();
  g.fillStyle = '#c83a33'; rr(g, 0, 0, w, 16, [30, 30, 0, 0]); g.fill();
  if (icon) { const iw = 220, ih = 220 * icon.height / icon.width; g.drawImage(icon, (w - iw) / 2, 22, iw, Math.min(ih, 220)); }
  let fs = 60; g.font = `bold ${fs}px "Comic Relief"`; while (g.measureText(word).width > w - 50 && fs > 30) { fs -= 2; g.font = `bold ${fs}px "Comic Relief"`; } g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 8; g.strokeStyle = '#ffffff'; g.strokeText(word, w / 2, h - 52); g.fillStyle = '#1f2a5a'; g.fillText(word, w / 2, h - 52);
  g.restore();
}

// 把一個物件單獨拍成透明圖示 / render an object alone into a transparent icon canvas
export function iconOf(renderer, obj, { size = 512, dist = 3, yaw = 0.6, pitch = 0.25, lookY = null } = {}) {
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x8899bb, 1.6)); const dl = new THREE.DirectionalLight(0xffffff, 2.2); dl.position.set(3, 5, 4); sc.add(dl);
  const clone = obj.clone(true); sc.add(clone);
  const box = new THREE.Box3().setFromObject(clone), c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 100); const d = Math.max(s.x, s.y, s.z) * dist;
  cam.position.set(c.x + Math.sin(yaw) * d, c.y + Math.sin(pitch) * d, c.z + Math.cos(yaw) * d); cam.lookAt(c.x, lookY ?? c.y, c.z);
  const rt = new THREE.WebGLRenderTarget(size, size, { colorSpace: THREE.SRGBColorSpace });
  const prevTM = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping;
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(sc, cam); renderer.setRenderTarget(null); renderer.toneMapping = prevTM;
  const buf = new Uint8Array(size * size * 4); renderer.readRenderTargetPixels(rt, 0, 0, size, size, buf);
  const cv = document.createElement('canvas'); cv.width = cv.height = size; const g = cv.getContext('2d'); const id = g.createImageData(size, size);
  for (let y = 0; y < size; y++) id.data.set(buf.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
  g.putImageData(id, 0, 0); rt.dispose(); return cv;
}

// 緩動 / easing
export const ease = { io: (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2, out: (x) => 1 - Math.pow(1 - x, 3), back: (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); } };
export const clamp01 = (x) => Math.max(0, Math.min(1, x));

// 依逐字時間算卡拉 OK 進度 / karaoke progress from TTS word timings (tl = seconds since line start)
export function karaokeAt(g, text, words, tl, opts = {}) {
  const size = opts.size ?? 64; g.save(); g.font = `bold ${size}px "Comic Relief"`;
  const low = text.toLowerCase(); let from = 0, ci = 0;
  for (const w of words) {
    const i = low.indexOf(w.w.toLowerCase(), from); if (i < 0) continue;
    const e = i + w.w.length; from = e;
    if (tl >= w.t1) ci = e; else if (tl > w.t0) { ci = i + Math.round((tl - w.t0) / Math.max(0.01, w.t1 - w.t0) * w.w.length); break; } else break;
  }
  if (words.length && tl >= words[words.length - 1].t1) ci = text.length;
  const prog = g.measureText(text.slice(0, ci)).width / Math.max(1, g.measureText(text).width);
  g.restore(); karaoke(g, text, prog, opts);
}
export function wordTime(words, word) { const w = words.find(x => x.w.toLowerCase().replace(/[^a-z]/g, '') === word.toLowerCase()); return w ? w.t0 : 0; }

// 嘴巴 3 段：依音量曲線回傳 'flat' | 'o' | 'open' / 3-level mouth from the 30 fps loudness curve
export function mouthAt(m, tl, closed = 'smile') {
  if (!m || !m.env || tl < 0 || tl > m.dur) return closed;
  const v = m.env[Math.min(m.env.length - 1, Math.floor(tl * 30))] ?? 0;
  return v > 0.55 ? 'open' : v > 0.22 ? 'o' : 'flat';
}

// ---------- 單字卡避開人臉 / pick a card corner that covers no face ----------
export const CARD_SLOTS = [
  { x: W - 470, y: 46 }, { x: 50, y: 46 }, { x: W - 470, y: 430 }, { x: 50, y: 430 },
];
// faces: [{x, y, r}] in screen px ; returns overlap area of a card at slot
export function cardOverlap(slot, faces, w = 420, h = 330) {
  let s = 0;
  for (const f of faces) { const ox = Math.max(0, Math.min(slot.x + w, f.x + f.r) - Math.max(slot.x, f.x - f.r)), oy = Math.max(0, Math.min(slot.y + h, f.y + f.r) - Math.max(slot.y, f.y - f.r)); s += ox * oy; }
  return s;
}
export function projectFaces(camera, pts, headSize = 0.8) {
  const out = [];
  for (const p of pts) {
    const v = p.clone().project(camera); if (v.z > 1 || v.z < -1) continue;
    const d = camera.position.distanceTo(p), r = headSize / (2 * d * Math.tan(camera.fov * Math.PI / 360)) * H * 0.75;
    out.push({ x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, r: r + 30 });
  }
  return out;
}

// ---------- 慢動作特效包 / slow-motion spotlight FX ----------
// k: 0..1 漸入程度；box: 物件在畫面上的 {x,y,w,h}；label: 小英文標籤
export function spotlightFX(g, box, k, t, label) {
  if (k <= 0) return;
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2, R = Math.max(box.w, box.h) * 0.75 + 40;
  g.save();
  const grd = g.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 2.2);
  grd.addColorStop(0, 'rgba(8,10,30,0)'); grd.addColorStop(1, `rgba(8,10,30,${0.62 * k})`);
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  // 金色光框（會呼吸）/ breathing gold frame
  const pad = 26, pulse = 0.5 + 0.5 * Math.sin(t * 5);
  g.globalAlpha = k; g.lineJoin = 'round';
  g.shadowColor = 'rgba(255,200,60,0.9)'; g.shadowBlur = 24 + 14 * pulse;
  g.strokeStyle = '#ffd24a'; g.lineWidth = 7; g.beginPath(); g.roundRect(box.x - pad, box.y - pad, box.w + pad * 2, box.h + pad * 2, 26); g.stroke();
  g.shadowBlur = 0;
  // 四角像素閃光 / pixel sparkles on the corners
  [[box.x - pad, box.y - pad], [box.x + box.w + pad, box.y - pad], [box.x - pad, box.y + box.h + pad], [box.x + box.w + pad, box.y + box.h + pad]].forEach(([x, y], i) => {
    const s = 8 + 6 * Math.abs(Math.sin(t * 6 + i)); g.fillStyle = '#fff6c8'; g.fillRect(x - s / 2, y - 2, s, 4); g.fillRect(x - 2, y - s / 2, 4, s);
  });
  if (label) {
    g.font = 'bold 54px "Comic Relief"'; g.textBaseline = 'middle';
    const tw = g.measureText(label).width; let lx = box.x + box.w + pad + 24, ly = cy;
    /* 右邊放不下→左邊→框的上方（都留在畫面內）/ right, else left, else above the frame, always on screen */
    if (lx + tw + 30 > W - 20) { lx = box.x - pad - 24 - tw - 30; if (lx < 20) { lx = Math.min(W - tw - 50, Math.max(20, cx - tw / 2 - 15)); ly = Math.max(60, box.y - pad - 60); } }
    g.fillStyle = 'rgba(255,248,230,0.95)'; g.beginPath(); g.roundRect(lx, ly - 40, tw + 30, 80, 18); g.fill();
    g.lineWidth = 5; g.strokeStyle = '#c83a33'; g.stroke();
    g.fillStyle = '#1f2a5a'; g.fillText(label, lx + 15, ly + 2);
  }
  g.restore();
}
// 物件在畫面上的外框 / screen-space bbox of an Object3D
export function screenBox(camera, obj) {
  const b = new THREE.Box3().setFromObject(obj); const pts = [];
  for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) pts.push(new THREE.Vector3(x, y, z).project(camera));
  const xs = pts.map(p => (p.x + 1) / 2 * W), ys = pts.map(p => (1 - p.y) / 2 * H);
  const x0 = Math.max(20, Math.min(...xs)), x1 = Math.min(W - 20, Math.max(...xs)), y0 = Math.max(20, Math.min(...ys)), y1 = Math.min(H - 20, Math.max(...ys));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// ---------- 2D 小箭頭與小圖示 / small arrows and icons ----------
export function arrow2d(g, x0, y0, x1, y1, { color = '#ffd24a', width = 12, a = 1, label = null } = {}) {
  if (a <= 0) return; g.save(); g.globalAlpha = a; g.lineCap = 'round';
  g.strokeStyle = '#1f2a5a'; g.lineWidth = width + 8; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  g.strokeStyle = color; g.lineWidth = width; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  const ang = Math.atan2(y1 - y0, x1 - x0), L = width * 2.6;
  g.fillStyle = color; g.strokeStyle = '#1f2a5a'; g.lineWidth = 4; g.beginPath(); g.moveTo(x1 + Math.cos(ang) * L * 0.6, y1 + Math.sin(ang) * L * 0.6);
  g.lineTo(x1 + Math.cos(ang + 2.4) * L, y1 + Math.sin(ang + 2.4) * L); g.lineTo(x1 + Math.cos(ang - 2.4) * L, y1 + Math.sin(ang - 2.4) * L); g.closePath(); g.fill(); g.stroke();
  if (label) { g.font = 'bold 50px "Comic Relief"'; g.textAlign = 'center'; g.lineWidth = 10; g.strokeStyle = '#1f2a5a'; g.strokeText(label, (x0 + x1) / 2, (y0 + y1) / 2 - 46); g.fillStyle = '#fff'; g.fillText(label, (x0 + x1) / 2, (y0 + y1) / 2 - 46); }
  g.restore();
}
// 風線（像素風）/ pixel wind streaks
export function windLines(g, t, { a = 1, n = 14, y0 = 120, y1 = 820, speed = 900, dir = -1 } = {}) {
  if (a <= 0) return; g.save(); g.globalAlpha = a * 0.85; g.fillStyle = '#eaf4ff';
  for (let i = 0; i < n; i++) { const y = y0 + ((i * 137) % (y1 - y0)), len = 140 + (i * 53) % 160, x = ((i * 311 + t * speed) % (W + 600)) - 300; const X = dir < 0 ? W - x : x; g.fillRect(X, y, len, 8); g.fillRect(X + 30, y + 14, len * 0.5, 6); }
  g.restore();
}
