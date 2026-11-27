// H3 試鏡首幀／尾幀：第 23 句 Santa 在木屋說話中景（t<1 首幀、t>=1 尾幀）
// First/last frame for the H3 test shot of line 23 (Santa talking, medium shot).
import * as THREE from 'three';
import { makeKen, makeShuiling, makeSanta, makeReindeer, pose } from '../engine/chars.js';
import { cabinRoom, fireplace, stocking, gift, xmasTree } from '../engine/props.js';

export async function setup({ S, tl }) {
  const { scene, camera } = S;
  scene.background = new THREE.Color('#120c0a'); scene.fog = new THREE.Fog('#1a0f0a', 14, 30);
  cabinRoom(scene);
  scene.add(new THREE.HemisphereLight('#ffd9b0', '#3a2216', 0.75));
  const key = new THREE.DirectionalLight('#ffd2a0', 0.9); key.position.set(2, 5, 8); scene.add(key);
  const fp = fireplace(scene, -3, -6);
  const st1 = stocking('#d22f2f'); st1.position.set(-3.6, 3.95, -5.0); scene.add(st1);
  const tree = xmasTree(scene, 2.6, -3.2, { h: 7 }); tree.group.scale.setScalar(0.55);
  [[2.1, -2.2, 9, '#2f7fd2'], [3.4, -1.9, 7, '#d23a3a'], [2.8, -1.6, 6, '#7b4bd6']].forEach(([x, z, s, c], i) => { const g = gift(s, c, '#f2d04a', i + 3); g.position.set(x, 0, z); scene.add(g); });
  const santa = makeSanta(), ken = makeKen(), sl = makeShuiling(), deer = makeReindeer();
  santa.root.position.set(0.4, 0, 0.3); santa.root.rotation.y = 0; scene.add(santa.root);
  ken.root.position.set(-1.35, 0, -0.2); ken.root.rotation.y = 0.75; scene.add(ken.root);
  sl.root.position.set(2.15, 0, -0.1); sl.root.rotation.y = -0.8; scene.add(sl.root);
  deer.root.position.set(4.6, 0, 1.2); deer.root.rotation.y = -1.6; scene.add(deer.root);
  ken.setFace({ eyes: 'happy', mouth: 'grin' }); sl.setFace({ eyes: 'happy', mouth: 'open' }); deer.setFace({});
  function frame(t) {
    const last = t >= 1;
    fp.update(1.3); tree.setOn(1, 0.7);
    santa.setFace({ eyes: last ? 'happy' : 'open' });
    pose(santa, last ? { armLz: -70, armRz: 70, armLx: -20, armRx: -20, headZ: 3 } : { armLz: -28, armRz: 28, armLx: -10, armRx: -10 });
    pose(ken, { armLz: -10, armRz: 10, headX: -10 }); pose(sl, { armLx: -30, armRx: -30, armLz: 10, armRz: -10, headX: -10 });
    camera.position.set(0.4, 1.85, 5.3); camera.lookAt(0.4, 1.6, 0.3); camera.fov = 34; camera.updateProjectionMatrix();
  }
  return { dur: 2, frame, cards: {} };
}
