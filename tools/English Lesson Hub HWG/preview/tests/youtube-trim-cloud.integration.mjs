import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createLiveService } from '../functions/src/live-service.mjs';
import { newBlock } from '../src/live/domain.mjs';
if (!/^(localhost|127\.0\.0\.1):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || '')) throw new Error('Local Firestore emulator required; production access refused');
const require = createRequire(new URL('../functions/index.cjs', import.meta.url));
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

test('Firestore retains trimmed YouTube ranges, rejects short clips and bounds teacher/student playback', async () => {
  const tag = crypto.randomUUID(), teacher = `trim-teacher-${tag}`, student = `trim-student-${tag}`, id = `trim-deck-${tag}`;
  const app = initializeApp({ projectId: 'demo-lesson-hub' }, `trim-${tag}`), db = getFirestore(app);
  const service = createLiveService({ db, requireTeacher: async request => { if (request.auth.uid !== teacher) throw new Error('teacher only'); } });
  const call = (uid, action, code, payload = {}) => service({ auth: { uid, token: { firebase: { sign_in_provider: 'anonymous' } } }, data: { action, code, payload } });
  const url = 'https://youtu.be/M7lc1UVf-VE', block = { ...newBlock('slide', 'trim-slide'), embed: url };
  block.slideCanvas.elements = [{ id: 'film', kind: 'embed', url, trim: { start: 83, end: 88 }, x: 10, y: 20, w: 80, h: 70, z: 0 }];
  const deck = { id, title: 'Synthetic YouTube trim cloud QA', blocks: [block] }, ref = db.collection('liveDecksV2').doc(`${teacher}_${id}`);
  let room;
  try {
    await call(teacher, 'saveDeck', null, { deck, expectedVersion: 0 });
    const saved = (await call(teacher, 'decks')).decks.find(d => d.id === id);
    assert.deepEqual(saved.blocks[0].slideCanvas.elements[0].trim, { start: 83, end: 88 });
    assert.deepEqual(JSON.parse((await ref.get()).data().json).blocks[0], block);
    const invalid = structuredClone(saved); invalid.blocks[0].slideCanvas.elements[0].trim.end = 87;
    await assert.rejects(call(teacher, 'saveDeck', null, { deck: invalid, expectedVersion: 1 }), /5 秒/);
    assert.equal((await call(teacher, 'decks')).decks.find(d => d.id === id).version, 1);
    room = await call(teacher, 'create', null, { deck: saved }); await call(student, 'join', room.code, { studentId: '50101' });
    room = await call(teacher, 'control', room.code, { action: 'start', revision: room.revision });
    room = await call(teacher, 'control', room.code, { action: 'video', revision: room.revision, blockId: block.id, command: 'play', position: 0 });
    assert.equal(room.video.position, 83);
    await assert.rejects(call(student, 'control', room.code, { action: 'video', revision: room.revision, blockId: block.id, command: 'seek', position: 85 }));
    await new Promise(resolve => setTimeout(resolve, 5200));
    const ended = await call(student, 'snapshot', room.code); assert.equal(ended.video.position, 88); assert.equal(ended.video.playing, false);
    assert.deepEqual(ended.block.slideCanvas.elements[0].trim, { start: 83, end: 88 });
    room = await call(teacher, 'control', room.code, { action: 'video', revision: room.revision, blockId: block.id, command: 'play', position: 88 });
    assert.equal(room.video.position, 83); assert.equal(room.video.playing, true);
    room = await call(teacher, 'control', room.code, { action: 'video', revision: room.revision, blockId: block.id, command: 'seek', position: 999 });
    assert.equal(room.video.position, 88); assert.equal(room.video.playing, false);
  } finally {
    if (room) await db.recursiveDelete(db.collection('liveRoomsV2').doc(room.code));
    await db.recursiveDelete(ref); await db.terminate(); await deleteApp(app);
  }
});
