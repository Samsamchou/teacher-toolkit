// 第 4–6 幕共用：夜晚雪地森林（極光、月亮、松樹、下雪）＋小木屋外觀＋馴鹿走路
// Shared night snow forest for scenes 4–6, the cabin exterior, and a reindeer walk cycle.
import * as THREE from 'three';
import { PX, part, pixTex, noisy, px, blockType, instanced, PAINT } from './voxel.js';
import { terrain, pine, moon } from './props.js';
import { nightSky, aurora, snow } from './kit.js';

export function buildForest(scene, { x = 0, pines = null, snowCount = 2500, wind = 1.6 } = {}) {
  const sky = nightSky(scene, { top: '#0b1030', mid: '#1d2f63', bottom: '#4a6aa8', stars: 600 });
  const g = new THREE.Group(); scene.add(g);
  const before = scene.children.length;
  terrain(scene, { size: 64, flat: 11, cx: x, cz: 0, seed: 21 });
  (pines || [[-6, -6, 10], [5, -8, 12], [-12, -2, 9], [11, -3, 8], [-3, -14, 13], [9, -15, 14], [-16, -10, 11], [15, -12, 12]]).forEach(([px0, z, h]) => pine(scene, x + px0, z, { h }));
  moon(scene, { pos: [x - 50, 60, -150] });
  const au = aurora(scene, { y: 40, z: -150 }); au.group.position.x = x;
  scene.children.slice(before).forEach(o => { scene.remove(o); g.add(o); });
  const sn = snow(scene, { count: snowCount, box: [26, 14, 22], center: [x, 0, 0], wind, size: 0.06 }); g.add(sn.points);
  g.add(new THREE.HemisphereLight('#8fb0ef', '#2c3a5e', 1.05));
  const mn = new THREE.DirectionalLight('#bcd0ff', 1.9); mn.position.set(x - 6, 10, -4); mn.target.position.set(x, 0, 0); mn.castShadow = true;
  mn.shadow.mapSize.set(2048, 2048); Object.assign(mn.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 }); mn.shadow.bias = -0.0008; g.add(mn, mn.target);
  return { group: g, sky, update: (t, cam) => { sn.update(t); au.update(t + 5); if (cam) sky.dome.position.copy(cam.position); } };
}

// 小木屋外觀：原木牆、雪屋頂、亮燈的窗、煙囪冒煙 / log cabin exterior with lit windows and chimney smoke
export function cabinExterior(scene, x, z) {
  const g = new THREE.Group(); g.name = 'cabin'; g.position.set(x, 0, z); scene.add(g);
  const log = blockType({ side: PAINT.log, top: PAINT.logTop, bottom: PAINT.logTop }, { key: 'log' });
  const roof = blockType({ all: (gg) => noisy(gg, 16, 16, '#eef4ff', 0.04, 701) }, { key: 'cabroof' });
  const brick = blockType({ all: PAINT.brick }, { key: 'brick' });
  const w = [], r = [], ch = [];
  for (let xx = 0; xx < 6; xx++) for (let zz = 0; zz < 5; zz++) for (let y = 0; y < 3; y++) {
    if (!(xx === 0 || xx === 5 || zz === 0 || zz === 4)) continue;
    const win = y === 1 && zz === 4 && (xx === 1 || xx === 4), door = zz === 4 && (xx === 2 || xx === 3) && y < 2;
    if (!win && !door) w.push([xx, y, zz]);
  }
  for (let xx = -1; xx < 7; xx++) for (let zz = -1; zz < 6; zz++) r.push([xx, 3, zz]);
  for (let xx = 0; xx < 6; xx++) for (let zz = 1; zz < 4; zz++) r.push([xx, 4, zz]);
  for (let y = 3; y < 6; y++) ch.push([4, y, 1]);
  g.add(instanced(log, w), instanced(roof, r), instanced(brick, ch));
  const winMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.05, 0.5) });
  [1, 4].forEach(xx => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), winMat); m.position.set(xx + 0.5, 1.5, 5.01); g.add(m); });
  const door = part(32, 32, 2, { all: (gg) => { noisy(gg, 32, 32, '#6e4824', 0.06, 702); px(gg, 26, 16, '#e8c35a', 2, 2); } }, { key: 'cabdoor' }); door.position.set(3, 1, 5.02); g.add(door);
  const lamp = new THREE.PointLight('#ffb35c', 5, 10, 1.5); lamp.position.set(3, 1.6, 6); g.add(lamp);
  const smoke = Array.from({ length: 10 }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: '#c9d2e0', transparent: true, opacity: 0.6, depthWrite: false })); g.add(m); return m; });
  return { group: g, door, update: (t) => smoke.forEach((m, i) => { const a = ((t * 0.25 + i / 10) % 1); m.position.set(4.5 + Math.sin(i * 3 + t) * 0.2 * a, 6 + a * 3, 1.5 + a * 0.6); m.scale.setScalar(0.6 + a * 1.6); m.material.opacity = 0.6 * (1 - a); }) };
}

// 馴鹿四腳走路：對角腳一起動 / reindeer walk: diagonal legs move together
export function deerWalk(deer, ph, amt = 1) {
  const s = Math.sin(ph * Math.PI * 2);
  deer.legs.forEach((l, i) => { const diag = (i === 0 || i === 3) ? 1 : -1; l.rotation.x = s * 0.45 * amt * diag; });
  deer.body.position.y = 10 * PX + Math.abs(Math.cos(ph * Math.PI * 2)) * 0.04 * amt;
  deer.headG.rotation.x = Math.sin(ph * Math.PI * 4) * 0.05 * amt;
}
