import test from 'node:test';
import assert from 'node:assert/strict';
import { newBlock } from '../src/live/domain.mjs';
import { createAssignmentService } from '../functions/src/assignment-service.mjs';
import { createMemoryFirestore } from '../scripts/assignment-memory-store.mjs';

const NOW = Date.parse('2026-10-17T02:00:00Z');
const choice = id => ({ ...newBlock('choice', id), title: 'Morning', points: 10, options: ['breakfast', 'bed'], answer: [0] });

function fixture({ withRecorder = true } = {}) {
  let clock = NOW;
  const db = createMemoryFirestore(), removed = [];
  const deck = { id: 'deck-1', title: 'Classroom', version: 2, blocks: [choice('q1'), choice('q2')] };
  const ready = db.collection('liveDecksV2').doc('teacher_deck-1').set({ ownerUid: 'teacher', json: JSON.stringify(deck) });
  const service = createAssignmentService({ db, now: () => clock, requireTeacher: async req => { if (!['teacher', 'other-teacher'].includes(req.auth.uid)) throw Error('teacher required'); }, deleteRecording: withRecorder ? async path => { removed.push(path); } : null });
  const call = (uid, action, code, payload = {}) => service({ auth: { uid, token: { firebase: { sign_in_provider: 'anonymous' } } }, data: { action, code, payload } });
  const create = async (requestId = 'create-request-1') => { await ready; return (await call('teacher', 'assignmentCreate', null, { requestId, deckId: 'deck-1', expectedVersion: 2, title: 'Practice', mode: 'practice', questionOrder: 'sequential', optionOrder: 'original', game: 'survivors', dueAt: NOW + 100000 })).assignment; };
  const keys = code => Object.keys(db.export()).filter(p => p.includes(code) || (p.startsWith('assignmentCreationsV1/') && db.export()[p].code === code));
  return { db, call, create, keys, removed, clock: v => clock = v };
}

async function withStudentWork(f) {
  const a = await f.create();
  const s = await f.call('s1', 'assignmentJoin', a.code, { studentId: '50101' });
  await f.call('s1', 'assignmentSubmit', a.code, { blockId: s.block.id, revision: s.run.revision, answer: [0], attemptId: 'attempt-0001' });
  await f.db.collection('lessonAssignmentAudioV1').doc('audio-attempt-1').set({ uid: 's1', code: a.code, status: 'complete' });
  await f.db.collection('lessonAssignmentAudioV1').doc('other-audio-1').set({ uid: 's2', code: '999999', status: 'complete' });
  return a;
}

test('only ended assignments can be deleted, and only by their teacher', async () => {
  const f = fixture(), a = await withStudentWork(f);
  await assert.rejects(f.call('teacher', 'assignmentDelete', a.code), /先結束/);
  await assert.rejects(f.call('s1', 'assignmentDelete', a.code), /teacher/);
  await f.call('teacher', 'assignmentClose', a.code);
  await assert.rejects(f.call('other-teacher', 'assignmentDelete', a.code), /權限/);
  assert.ok(f.keys(a.code).length > 0);
});

test('deleting an ended assignment removes runs, attempts, members, claim and recordings', async () => {
  const f = fixture(), a = await withStudentWork(f), other = await f.create('create-request-2');
  assert.ok(f.keys(a.code).some(p => p.includes('/runs/')) && f.keys(a.code).some(p => p.includes('/attempts/')) && f.keys(a.code).some(p => p.includes('/members/')));
  await f.call('teacher', 'assignmentClose', a.code);
  const result = await f.call('teacher', 'assignmentDelete', a.code);
  assert.deepEqual(result, { deleted: true, code: a.code, recordings: 1 });
  assert.deepEqual(f.keys(a.code), []);
  assert.deepEqual(f.removed, ['assignmentAudioV1/s1/audio-attempt-1']);
  const left = f.db.export();
  assert.ok(left['lessonAssignmentAudioV1/other-audio-1'], 'other assignments keep their recordings');
  assert.ok(left[`lessonAssignmentsV1/${other.code}`], 'other assignments are untouched');
  assert.deepEqual((await f.call('teacher', 'assignmentList')).assignments.map(x => x.code), [other.code]);
  await assert.rejects(f.call('teacher', 'assignmentReport', a.code), /權限/);
  await assert.rejects(f.call('teacher', 'assignmentDelete', a.code), /找不到/);
});

test('past-due assignments can be deleted without an explicit close', async () => {
  const f = fixture(), a = await f.create();
  f.clock(a.dueAt + 1);
  assert.equal((await f.call('teacher', 'assignmentDelete', a.code)).deleted, true);
});

test('nothing is deleted when recordings exist but no recording remover is configured', async () => {
  const f = fixture({ withRecorder: false }), a = await withStudentWork(f);
  await f.call('teacher', 'assignmentClose', a.code);
  const before = f.keys(a.code);
  await assert.rejects(f.call('teacher', 'assignmentDelete', a.code), /錄音刪除服務/);
  assert.deepEqual(f.keys(a.code), before);
});

// Right-click reset of one student (2026-10-27): removes only that student so the same ID can start over.
test('teacher deletes one student while the assignment is open; the same ID rejoins from question 1', async () => {
  const f = fixture(), a = await f.create();
  let s = await f.call('s1', 'assignmentJoin', a.code, { studentId: '50101' });
  await f.call('s1', 'assignmentSubmit', a.code, { blockId: s.block.id, revision: s.run.revision, answer: [0], attemptId: 'attempt-s1-01' });
  const other = await f.call('s2', 'assignmentJoin', a.code, { studentId: '50102' });
  await f.call('s2', 'assignmentSubmit', a.code, { blockId: other.block.id, revision: other.run.revision, answer: [0], attemptId: 'attempt-s2-01' });
  await f.db.collection('lessonAssignmentAudioV1').doc('audio-s1-0001').set({ uid: 's1', code: a.code, studentId: '50101', status: 'complete' });
  await f.db.collection('lessonAssignmentAudioV1').doc('audio-s2-0001').set({ uid: 's2', code: a.code, studentId: '50102', status: 'complete' });
  await assert.rejects(f.call('s1', 'assignmentStudentDelete', a.code, { studentId: '50101' }), /teacher/);
  await assert.rejects(f.call('other-teacher', 'assignmentStudentDelete', a.code, { studentId: '50101' }), /權限/);
  const result = await f.call('teacher', 'assignmentStudentDelete', a.code, { studentId: '50101' });
  assert.deepEqual(result, { deleted: true, studentId: '50101', attempts: 1, recordings: 1 });
  assert.deepEqual(f.removed, [`assignmentAudioV1/s1/audio-s1-0001`]);
  const report = await f.call('teacher', 'assignmentReport', a.code);
  assert.deepEqual(report.rows.map(r => r.studentId), ['50102']);
  assert.equal(report.rows[0].completed, 1);
  await assert.rejects(f.call('s1', 'assignmentSnapshot', a.code), /加入/);
  s = await f.call('s3', 'assignmentJoin', a.code, { studentId: '50101' });
  assert.equal(s.run.index, 0);
  assert.equal(s.score.earned, 0);
  assert.deepEqual(Object.keys(f.db.export()).filter(p => p.includes('attempt-s1-01')), []);
  await assert.rejects(f.call('teacher', 'assignmentStudentDelete', a.code, { studentId: '50129' }), /還沒有作答/);
});
