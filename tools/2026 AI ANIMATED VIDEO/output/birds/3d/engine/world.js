// world.js — 〈Birds〉3D 世界共用工具（畫風 E 3D 世界＋B 電影光影＋C 灰轉彩／四季）
// Shared helpers: renderer + post (DOF, bloom, season grade, vignette), Tripo static-pose characters
// (swap models = stop-motion poses), sky dome, clouds, trees, hills, feather, birds, camera keys.
// 規則：每一格只由時間 t 決定（不用 Math.random），才能逐格重渲。
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export { THREE };
export const W = 1920, H = 1080;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
export const easeOut = k => 1 - Math.pow(1 - k, 3);
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const C = c => new THREE.Color(c);
// 可重現的亂數 / deterministic hash noise
export const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ── 渲染器＋後製 / renderer and post chain ──
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uSat: { value: 1 }, uTint: { value: new THREE.Color(1, 1, 1) }, uLift: { value: new THREE.Color(0, 0, 0) },
    uVig: { value: .35 }, uFade: { value: 0 }, uFadeCol: { value: new THREE.Color(0, 0, 0) }, uGrain: { value: .025 }, uTime: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uSat, uVig, uFade, uGrain, uTime; uniform vec3 uTint, uLift, uFadeCol; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
    void main(){ vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(.299,.587,.114));
      vec3 col = mix(vec3(l), c.rgb, uSat) * uTint + uLift * (1.0 - l);
      float d = distance(vUv, vec2(.5)); col *= 1.0 - uVig * smoothstep(.35, .85, d);
      col += (h(vUv * 1000.0) - .5) * uGrain;
      gl_FragColor = vec4(mix(col, uFadeCol, uFade), c.a); }`
};
export function makeRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  r.setSize(W, H, false); r.setPixelRatio(1);
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
  return r;
}
// 每個場景一條後製：RenderPass → 景深 → 光暈 → 調色（飽和度、色調、暗角、淡出）→ 輸出
export function makePost(renderer, scene, camera) {
  const comp = new EffectComposer(renderer); comp.setSize(W, H);
  const rp = new RenderPass(scene, camera); comp.addPass(rp);
  const bokeh = new BokehPass(scene, camera, { focus: 3, aperture: .002, maxblur: .006 }); comp.addPass(bokeh);
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), .5, .6, .82); comp.addPass(bloom);
  const grade = new ShaderPass(GradeShader); comp.addPass(grade);
  comp.addPass(new OutputPass());
  return {
    comp, bokeh, bloom, grade,
    set({ scene: sc, camera: cam, focus, aperture, maxblur, bloom: b, radius, threshold, sat, tint, lift, vig, fade, fadeCol, t }) {
      if (sc) { rp.scene = sc; bokeh.scene = sc; } if (cam) { rp.camera = cam; bokeh.camera = cam; }
      const u = bokeh.uniforms; if (focus !== undefined) u.focus.value = focus; if (aperture !== undefined) u.aperture.value = aperture; if (maxblur !== undefined) u.maxblur.value = maxblur;
      if (b !== undefined) bloom.strength = b; if (radius !== undefined) bloom.radius = radius; if (threshold !== undefined) bloom.threshold = threshold;
      const g = grade.uniforms; if (sat !== undefined) g.uSat.value = sat; if (tint) g.uTint.value.set(tint); if (lift) g.uLift.value.set(lift);
      if (vig !== undefined) g.uVig.value = vig; if (fade !== undefined) g.uFade.value = fade; if (fadeCol) g.uFadeCol.value.set(fadeCol); if (t !== undefined) g.uTime.value = t % 10;
    },
    render() { comp.render(); }
  };
}

// ── 角色：Tripo 靜態姿勢模型；換姿勢＝換顯示哪一個模型 / static-pose characters ──
const _cache = {};
export function loadGLB(url) { if (!_cache[url]) _cache[url] = new GLTFLoader().loadAsync(url); return _cache[url]; }
export async function loadModel(url, height, { axis = 'y' } = {}) {
  const g = await loadGLB(url); const root = g.scene.clone(true); const mats = [];
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; o.material = o.material.clone(); mats.push(o.material);
    if (o.material.map) o.material.map.anisotropy = 8; o.material.envMapIntensity = .8; } });
  const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3());
  const s = height / (axis === 'y' ? size.y : Math.max(size.x, size.z));
  root.scale.setScalar(s); root.position.set(-(box.min.x + box.max.x) / 2 * s, -box.min.y * s, -(box.min.z + box.max.z) / 2 * s);
  const holder = new THREE.Group(); holder.add(root); holder.userData.mats = mats; holder.userData.size = size.multiplyScalar(s);
  return holder;
}
// 一個角色＝多個姿勢模型；setPose(name) 只顯示那一個 / a character holding several pose models
export async function makeChar(base, poses, height) {
  const g = new THREE.Group(); const P = {};
  for (const [k, file] of Object.entries(poses)) { const m = await loadModel(base + file, height[k] || height.default); m.visible = false; g.add(m); P[k] = m; }
  g.userData.poses = P;
  g.setPose = name => { for (const k in P) P[k].visible = k === name; g.visible = !!name; };
  g.pose = n => P[n];
  return g;
}
// 時間表 [[t, pose], ...] → 目前姿勢 / pose timeline lookup
export const poseAt = (tl, t) => { let p = null; for (const [a, n] of tl) if (t >= a) p = n; return p; };

// ── 天空、雲、地形、樹 / sky, clouds, terrain, trees ──
export function skyDome() {
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: C('#5b7fb0') }, mid: { value: C('#e8b98a') }, bot: { value: C('#f6d6a4') }, sunDir: { value: V(0, .1, -1).normalize() }, sunCol: { value: C('#fff1c8') }, sunSize: { value: .02 }, sunGlow: { value: .5 } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 top, mid, bot, sunDir, sunCol; uniform float sunSize, sunGlow; varying vec3 vD;
      void main(){ float y = vD.y; vec3 c = y > .08 ? mix(mid, top, smoothstep(.08, .6, y)) : mix(bot, mid, smoothstep(-.15, .08, y));
        float s = max(dot(normalize(vD), normalize(sunDir)), 0.0); c += sunCol * (smoothstep(1.0 - sunSize, 1.0 - sunSize * .6, s) * 2.0 + pow(s, 12.0) * sunGlow);
        gl_FragColor = vec4(c, 1.0); }` });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), m); mesh.renderOrder = -10; return mesh;
}
export function setSky(sky, { top, mid, bot, sunDir, sunCol, sunSize, sunGlow }) {
  const u = sky.material.uniforms; top && u.top.value.set(top); mid && u.mid.value.set(mid); bot && u.bot.value.set(bot);
  sunDir && u.sunDir.value.copy(sunDir).normalize(); sunCol && u.sunCol.value.set(sunCol); if (sunSize !== undefined) u.sunSize.value = sunSize; if (sunGlow !== undefined) u.sunGlow.value = sunGlow;
}
let _cloudTex;
function cloudTex() {
  if (_cloudTex) return _cloudTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
  for (let i = 0; i < 26; i++) { const x = 60 + hash(i) * 136, y = 90 + hash(i + 40) * 80, r = 30 + hash(i + 80) * 50;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  _cloudTex = new THREE.CanvasTexture(cv); _cloudTex.colorSpace = THREE.SRGBColorSpace; return _cloudTex;
}
// 一片雲海：很多張面向鏡頭的雲片 / a field of camera-facing cloud sprites
export function cloudField({ n = 60, area = [80, 80], y = [0, 4], size = [8, 18], seed = 1, color = '#ffffff', opacity = .9 } = {}) {
  const g = new THREE.Group(); const mat = new THREE.SpriteMaterial({ map: cloudTex(), color, transparent: true, opacity, depthWrite: false, fog: true });
  for (let i = 0; i < n; i++) { const s = new THREE.Sprite(mat); const k = seed * 100 + i;
    s.position.set((hash(k) - .5) * area[0], lerp(y[0], y[1], hash(k + 1)), (hash(k + 2) - .5) * area[1]); const sz = lerp(size[0], size[1], hash(k + 3)); s.scale.set(sz, sz * .55, 1); g.add(s); }
  g.userData.mat = mat; return g;
}
// 起伏地面 / rolling ground
export function hills({ w = 200, d = 200, seg = 120, amp = 2, freq = .05, color = '#6f9a4a' } = {}) {
  const geo = new THREE.PlaneGeometry(w, d, seg, seg); geo.rotateX(-Math.PI / 2); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, (Math.sin(x * freq) * Math.cos(z * freq * .8) + .5 * Math.sin(x * freq * 2.3 + z * freq * 1.7)) * amp); }
  geo.computeVertexNormals(); const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: .95 })); m.receiveShadow = true; return m;
}
export function groundY(x, z, { amp = 2, freq = .05 } = {}) { return (Math.sin(x * freq) * Math.cos(z * freq * .8) + .5 * Math.sin(x * freq * 2.3 + z * freq * 1.7)) * amp; }
// 風格化的樹（樹幹＋幾顆樹冠球），樹冠顏色可以隨季節改 / stylised tree with recolourable crown
export function tree({ h = 6, r = 1.6, trunk = '#5b4636', crown = '#5f8f45', seed = 1, tall = false } = {}) {
  const g = new THREE.Group(); const tm = new THREE.MeshStandardMaterial({ color: trunk, roughness: .9 });
  const t = new THREE.Mesh(new THREE.CylinderGeometry(.12 * h / 6, .2 * h / 6, h * (tall ? .95 : .55), 8), tm); t.position.y = h * (tall ? .475 : .275); t.castShadow = true; g.add(t);
  const cm = new THREE.MeshStandardMaterial({ color: crown, roughness: .85, flatShading: true });
  if (!tall) for (let i = 0; i < 4; i++) { const k = seed * 10 + i; const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r * (.7 + .4 * hash(k)), 1), cm);
    b.position.set((hash(k + 1) - .5) * r, h * .62 + hash(k + 2) * r * .8, (hash(k + 3) - .5) * r); b.castShadow = true; g.add(b); }
  g.userData.crown = cm; g.userData.trunk = tm; return g;
}
// 遠山 / distant mountains with soft snow caps
export function mountain({ h = 30, r = 22, color = '#7a6a8a', snow = '#f3e6d8', seed = 1 } = {}) {
  const geo = new THREE.ConeGeometry(r, h, 18, 8); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), x = p.getX(i), z = p.getZ(i); const n = 1 + .18 * Math.sin(x * .3 + seed) * Math.cos(z * .27 + seed * 2) * (1 - (y + h / 2) / h);
    p.setX(i, x * n); p.setZ(i, z * n); }
  geo.computeVertexNormals(); const cols = [], c0 = C(color), c1 = C(snow);
  for (let i = 0; i < p.count; i++) { const k = clamp(((p.getY(i) + h / 2) / h - .68) / .1); const c = c0.clone().lerp(c1, k); cols.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, flatShading: true })); m.position.y = h / 2 - 2; return m;
}

// ── 信物：青綠羽毛 / the teal feather ──
export function feather({ glow = 1.2 } = {}) {
  const s = new THREE.Shape(); s.moveTo(0, -.5); s.bezierCurveTo(.16, -.25, .17, .2, 0, .5); s.bezierCurveTo(-.17, .2, -.16, -.25, 0, -.5);
  const geo = new THREE.ExtrudeGeometry(s, { depth: .02, bevelEnabled: true, bevelThickness: .01, bevelSize: .01, bevelSegments: 2, curveSegments: 18 }); geo.center();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#2fb3a6', emissive: '#3fe0cf', emissiveIntensity: glow, roughness: .4 }));
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, 1.15, 6), new THREE.MeshStandardMaterial({ color: '#e9fff9', emissive: '#bff', emissiveIntensity: .6 }));
  shaft.position.y = -.05; const g = new THREE.Group(); g.add(m, shaft); g.userData.mat = m.material; return g;
}

// ── 飄浮光點／落葉 / floating motes or leaves (Points) ──
export function motes({ n = 300, area = [20, 8, 20], color = '#fff3c4', size = .06, seed = 3 } = {}) {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color, size, transparent: true, opacity: .85, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  pts.update = (t, { fall = .05, sway = .3 } = {}) => {
    for (let i = 0; i < n; i++) { const k = seed * 1000 + i; const y0 = hash(k + 1) * area[1];
      pos[i * 3] = (hash(k) - .5) * area[0] + Math.sin(t * .4 + i) * sway; pos[i * 3 + 1] = ((y0 - t * fall * (.5 + hash(k + 3))) % area[1] + area[1]) % area[1];
      pos[i * 3 + 2] = (hash(k + 2) - .5) * area[2] + Math.cos(t * .3 + i * 1.7) * sway; }
    geo.attributes.position.needsUpdate = true; };
  pts.update(0); return pts;
}

// ── 鏡頭關鍵格 / camera keyframes ──
// keys: [[t, [px,py,pz], [lx,ly,lz], fov], ...]；兩格之間用 ease 平滑；cut=true 表示這一格直接切（不內插）
export function camAt(cam, keys, t) {
  let i = 0; while (i < keys.length - 1 && t >= keys[i + 1][0]) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
  const k = b === a || b[4] === 'cut' ? 0 : ease(prog(t, a[0], b[0]));
  cam.position.set(lerp(a[1][0], b[1][0], k), lerp(a[1][1], b[1][1], k), lerp(a[1][2], b[1][2], k));
  const look = V(lerp(a[2][0], b[2][0], k), lerp(a[2][1], b[2][1], k), lerp(a[2][2], b[2][2], k));
  cam.fov = lerp(a[3] || 35, b[3] || 35, k);
  // 圖卡出現時把畫面往右平移（像移軸），角色被推到左邊、右上角留給圖卡 / lens-shift so the card never covers faces
  // 以鏡頭為單位：找出目前鏡頭（兩個 'cut' 之間）的起訖時間，整個鏡頭用同一個平移量，不會在換句時晃動
  let s0 = i; while (s0 > 0 && keys[s0][4] !== 'cut') s0--;
  let e0 = i + 1; while (e0 < keys.length && keys[e0][4] !== 'cut') e0++;
  const shotA = keys[s0][0], shotB = e0 < keys.length ? keys[e0][0] : keys[keys.length - 1][0];
  const sh = (typeof window !== 'undefined' && window.SHOT_SHIFT) ? window.SHOT_SHIFT(shotA, Math.max(shotB, shotA + .01)) : 0;
  if (sh > .001) cam.setViewOffset(W, H, W * .2 * sh, 0, W, H); else cam.clearViewOffset();   // 純平移不放大 / pure shift, no zoom
  cam.updateProjectionMatrix(); cam.lookAt(look);
  return look;
}
// 數值時間線 [[t, v], ...] 線性＋ease / scalar timeline
export function valAt(keys, t) {
  let i = 0; while (i < keys.length - 1 && t >= keys[i + 1][0]) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)]; if (a === b) return a[1];
  const k = ease(prog(t, a[0], b[0]));
  if (typeof a[1] === 'string') return '#' + C(a[1]).lerp(C(b[1]), k).getHexString();
  return lerp(a[1], b[1], k);
}
export const colAt = (keys, t) => valAt(keys, t);

// 燈光組（主光＋半球光＋逆光輪廓）/ standard light rig: key (sun), hemi fill, rim
export function lightRig(scene) {
  const hemi = new THREE.HemisphereLight('#cfe3ff', '#5b4a3a', .7); scene.add(hemi);
  const key = new THREE.DirectionalLight('#ffd7a0', 2.2); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: .5, far: 80 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight('#ffe2b8', 1.4); scene.add(rim, rim.target);
  const fill = new THREE.PointLight('#ffffff', 0, 6, 2); scene.add(fill);   // 跟著鏡頭的臉部補光 / face fill riding with the camera
  return { hemi, key, rim, fill };
}

// 胸前羽毛閃光（圖卡出現時閃一下，window.FEATHER 0–1）/ pendant blink when a meaning card appears
let _glowTex;
export function pendantGlow(group, y, z = .11, size = .16) {
  if (!_glowTex) { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(200,255,250,1)'); gr.addColorStop(.3, 'rgba(90,240,220,.7)'); gr.addColorStop(1, 'rgba(90,240,220,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); _glowTex = new THREE.CanvasTexture(cv); }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: _glowTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  sp.position.set(0, y, z); sp.scale.setScalar(size); group.add(sp);
  return { sprite: sp, set(k) { sp.material.opacity = k; sp.scale.setScalar(size * (1 + .8 * k)); } };
}
// 一把雨傘（程式做）/ a code-built umbrella
export function umbrella({ r = .75, color = '#e8743a', stick = 1.0 } = {}) {
  const g = new THREE.Group();
  const can = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2.6), new THREE.MeshStandardMaterial({ color, roughness: .7, side: THREE.DoubleSide, flatShading: true }));
  can.scale.y = .55; can.castShadow = true; g.add(can);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, stick, 8), new THREE.MeshStandardMaterial({ color: '#5a4636' })); st.position.y = -stick / 2; g.add(st);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(.05, .012, 6, 12, Math.PI), new THREE.MeshStandardMaterial({ color: '#5a4636' })); hook.position.set(.05, -stick, 0); hook.rotation.z = Math.PI; g.add(hook);
  return g;
}
