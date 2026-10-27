import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createAssignmentService } from '../functions/src/assignment-service.mjs';
import { newBlock } from '../src/live/domain.mjs';
if (!process.env.FIRESTORE_EMULATOR_HOST) throw Error('Only run this suite in isolated Firebase emulators');
const require = createRequire(new URL('../functions/index.cjs', import.meta.url)), { initializeApp, deleteApp } = require('firebase-admin/app'), { getFirestore } = require('firebase-admin/firestore');
const app = initializeApp({ projectId: 'demo-lesson-hub' }, 'assignment-delete-integration'), db = getFirestore(app);
after(async () => { await deleteApp(app); });
const teacher = 'delete-teacher-test', student = 'delete-student-test', removed = [];
let now = Date.now();
const service = createAssignmentService({ db, now: () => now, requireTeacher: async req => { if (req.auth.uid !== teacher) throw Error('teacher required'); }, deleteRecording: async path => { removed.push(path); } });
const call = (uid, action, code, payload = {}) => service({ auth: { uid, token: { firebase: { sign_in_provider: 'anonymous' } } }, data: { action, code, payload } });

test('real Firestore delete removes the ended assignment tree, claim and recordings only', async () => {
  const deck = { id: 'delete-emulator-deck', version: 1, title: 'Delete fixture', blocks: [0, 1].map(i => ({ ...newBlock('choice', 'd' + i), title: 'Choose cat', points: 10, options: ['cat', 'dog'], answer: [0] })) };
  await db.collection('liveDecksV2').doc(teacher + '_' + deck.id).set({ json: JSON.stringify(deck) });
  const create = requestId => call(teacher, 'assignmentCreate', null, { requestId, deckId: deck.id, expectedVersion: 1, title: 'Delete me', mode: 'practice', questionOrder: 'sequential', optionOrder: 'original', game: 'none', dueAt: now + 3600000 }).then(r => r.assignment);
  const a = await create('delete-emulator-001'), keep = await create('delete-emulator-002');
  const s = await call(student, 'assignmentJoin', a.code, { studentId: '50101' });
  await call(student, 'assignmentSubmit', a.code, { blockId: s.block.id, revision: s.run.revision, answer: [0], attemptId: 'delete-attempt-0001' });
  await db.collection('lessonAssignmentAudioV1').doc('delete-audio-0001').set({ uid: student, code: a.code, status: 'complete' });
  await db.collection('lessonAssignmentAudioV1').doc('keep-audio-0001').set({ uid: student, code: keep.code, status: 'complete' });
  const root = db.collection('lessonAssignmentsV1').doc(a.code);
  assert.equal((await root.collection('runs').get()).size, 1);
  assert.equal((await root.collection('attempts').get()).size, 1);
  assert.equal((await root.collection('members').get()).size, 1);

  await assert.rejects(call(teacher, 'assignmentDelete', a.code), /先結束/);
  await call(teacher, 'assignmentClose', a.code);
  assert.deepEqual(await call(teacher, 'assignmentDelete', a.code), { deleted: true, code: a.code, recordings: 1 });

  assert.equal((await root.get()).exists, false);
  for (const name of ['runs', 'attempts', 'members']) assert.equal((await root.collection(name).get()).size, 0, name);
  assert.equal((await db.collection('lessonAssignmentAudioV1').doc('delete-audio-0001').get()).exists, false);
  assert.equal((await db.collection('assignmentCreationsV1').where('code', '==', a.code).get()).size, 0);
  assert.deepEqual(removed, [`assignmentAudioV1/${student}/delete-audio-0001`]);
  assert.equal((await db.collection('lessonAssignmentAudioV1').doc('keep-audio-0001').get()).exists, true);
  assert.equal((await db.collection('lessonAssignmentsV1').doc(keep.code).get()).exists, true);
  assert.equal((await db.collection('assignmentCreationsV1').where('code', '==', keep.code).get()).size, 1);
});
