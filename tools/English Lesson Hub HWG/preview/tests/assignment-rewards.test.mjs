import test from 'node:test';
import assert from 'node:assert/strict';
import { newBlock } from '../src/live/domain.mjs';
import { createAssignmentService } from '../functions/src/assignment-service.mjs';
import { createMemoryFirestore } from '../scripts/assignment-memory-store.mjs';
import { assignmentAllowance } from '../src/assignments/assignment-rewards.mjs';

const NOW = Date.parse('2026-11-17T02:00:00Z');
const choice = id => ({ ...newBlock('choice', id), title: 'Pick ' + id, points: 10, options: ['right', 'wrong'], answer: [0] });
const sort = id => ({ ...newBlock('category', id), title: 'Sort', points: 10, items: ['a', 'b'], groups: ['A', 'B'], mapping: [0, 1] });

function fixture(blocks = [choice('q1'), sort('q2'), choice('q3')]) {
  let clock = NOW;
  const db = createMemoryFirestore(), deck = { id: 'deck-1', title: 'Classroom', version: 2, rewardGame: 'bowling', blocks };
  const ready = db.collection('liveDecksV2').doc('teacher_deck-1').set({ ownerUid: 'teacher', json: JSON.stringify(deck) });
  const service = createAssignmentService({ db, now: () => clock, requireTeacher: async req => { if (req.auth.uid !== 'teacher') throw Error('teacher required'); } });
  const call = (uid, action, code, payload = {}) => service({ auth: { uid, token: { firebase: { sign_in_provider: 'anonymous' } } }, data: { action, code, payload } });
  const create = async (settings = {}) => { await ready; return (await call('teacher', 'assignmentCreate', null, { requestId: 'reward-request-' + (settings.game || 'x') + (settings.mode || ''), deckId: 'deck-1', expectedVersion: 2, title: 'Reward', mode: 'practice', questionOrder: 'sequential', optionOrder: 'original', game: 'slot', dueAt: NOW + 100000, ...settings })).assignment; };
  return { db, call, create, clock: v => clock = v };
}
let n = 0;
const submit = (f, code, s, answer) => f.call('s1', 'assignmentSubmit', code, { blockId: s.block.id, revision: s.run.revision, answer, attemptId: 'attempt-' + (++n) });
const play = (f, code, s, extra = {}) => f.call('s1', 'assignmentRewardPlay', code, { turnId: 'turn-' + (++n), revision: s.run.revision, blockId: s.reward.blockId, walletVersion: s.reward.version, ...extra });
const finish = (f, code, s) => f.call('s1', 'assignmentRewardFinish', code, { turnId: s.reward.pending.id, revision: s.run.revision });

test('assignments accept the five classroom games and reject unknown games', async () => {
  for (const game of ['basketball', 'plinkoh', 'slot', 'bowling', 'worldpup']) assert.equal((await fixture().create({ game })).game, game);
  await assert.rejects(fixture().create({ game: 'pinball' }), /設定無效/);
});

test('practice: full gives 2 chances, partial 1, wrong 0; learning score unchanged by game points', async () => {
  const f = fixture(), a = await f.create();
  let s = await f.call('s1', 'assignmentJoin', a.code, { studentId: '50101' });
  assert.equal(s.reward.eligible, false);
  await assert.rejects(play(f, a.code, s), /沒有遊戲機會/);
  s = await submit(f, a.code, s, [0]);
  assert.equal(s.reward.remaining, 2);
  for (let i = 0; i < 2; i++) { s = await play(f, a.code, s); assert.ok(s.reward.pending); s = await finish(f, a.code, s); }
  assert.equal(s.reward.remaining, 0);
  await assert.rejects(play(f, a.code, s), /用完/);
  const gameScore = s.reward.score;
  assert.ok(gameScore >= 20);
  assert.equal(s.score.earned, 10);
  s = await f.call('s1', 'assignmentAdvance', a.code, { revision: s.run.revision });
  assert.equal(s.reward.remaining, 0, 'chances do not carry to the next question');
  for (let i = 0; i < 4; i++) s = await submit(f, a.code, s, [0, 0]);
  assert.equal(s.run.records.q2.status, 'partial');
  assert.equal(s.reward.remaining, 1);
  s = await f.call('s1', 'assignmentAdvance', a.code, { revision: s.run.revision });
  for (let i = 0; i < 4; i++) s = await submit(f, a.code, s, [1]);
  assert.equal(s.reward.remaining, 0);
  s = await f.call('s1', 'assignmentAdvance', a.code, { revision: s.run.revision });
  assert.equal(s.run.gameResult.status, 'reward');
  assert.equal(s.run.gameResult.score, gameScore);
  assert.equal(s.score.earned, 15);
  const report = await f.call('teacher', 'assignmentReport', a.code);
  assert.equal(report.rows[0].gameResult.score, gameScore);
  assert.equal(report.rows[0].earned, 15);
});

test('practice: a started turn blocks moving on; unused chances may be forfeited', async () => {
  const f = fixture(), a = await f.create();
  let s = await f.call('s1', 'assignmentJoin', a.code, { studentId: '50101' });
  s = await submit(f, a.code, s, [0]);
  s = await play(f, a.code, s);
  await assert.rejects(f.call('s1', 'assignmentAdvance', a.code, { revision: s.run.revision }), /先完成這一次遊戲/);
  s = await finish(f, a.code, s);
  s = await f.call('s1', 'assignmentAdvance', a.code, { revision: s.run.revision });
  assert.equal(s.run.index, 1);
});

test('retrying the same turn returns the saved result and never adds points', async () => {
  const f = fixture(), a = await f.create();
  let s = await f.call('s1', 'assignmentJoin', a.code, { studentId: '50101' });
  s = await submit(f, a.code, s, [0]);
  const input = { turnId: 'same-turn-1', revision: s.run.revision, blockId: s.reward.blockId, walletVersion: s.reward.version };
  const first = await f.call('s1', 'assignmentRewardPlay', a.code, input);
  const again = await f.call('s1', 'assignmentRewardPlay', a.code, input);
  assert.deepEqual(again.reward.pending, first.reward.pending);
  assert.equal(again.reward.remaining, 1);
});

test('exam: no game during questions; afterwards total chances of all questions', async () => {
  const f = fixture(), a = await f.create({ mode: 'exam', game: 'basketball' });
  let s = await f.call('s1', 'assignmentJoin', a.code, { studentId: '50101' });
  s = await submit(f, a.code, s, [0]);
  assert.equal(s.reward.eligible, false);
  await assert.rejects(play(f, a.code, s, { shot: 1 }), /沒有遊戲機會/);
  s = await f.call('s1', 'assignmentAdvance', a.code, { revision: s.run.revision });
  s = await submit(f, a.code, s, [0, 0]);
  s = await f.call('s1', 'assignmentAdvance', a.code, { revision: s.run.revision });
  s = await submit(f, a.code, s, [1]);
  s = await f.call('s1', 'assignmentAdvance', a.code, { revision: s.run.revision });
  assert.ok(s.run.completedAt);
  assert.equal(s.reward.remaining, 3);
  for (let i = 0; i < 3; i++) { s = await play(f, a.code, s, { shot: 2 }); s = await finish(f, a.code, s); }
  assert.equal(s.reward.remaining, 0);
  assert.equal((await f.call('teacher', 'assignmentReport', a.code)).rows[0].gameResult.turns, 3);
});

test('sports games run their saved steps on the server', async () => {
  const f = fixture(), a = await f.create({ game: 'worldpup' });
  let s = await f.call('s1', 'assignmentJoin', a.code, { studentId: '50101' });
  s = await submit(f, a.code, s, [0]);
  s = await play(f, a.code, s, { countryCode: 'TPE' });
  if (!s.reward.pending.result.resolved) s = await f.call('s1', 'assignmentRewardPlay', a.code, { turnId: s.reward.pending.id, actionId: 'kick-1', step: s.reward.pending.result.step, move: 'kick', zone: 2, revision: s.run.revision, blockId: s.reward.blockId, walletVersion: s.reward.version });
  assert.equal(s.reward.pending.result.resolved, true);
  s = await finish(f, a.code, s);
  assert.equal(s.reward.pending, null);
});

test('closed assignments stop new turns; old games and none keep no reward view', async () => {
  const f = fixture(), a = await f.create();
  let s = await f.call('s1', 'assignmentJoin', a.code, { studentId: '50101' });
  s = await submit(f, a.code, s, [0]);
  await f.call('teacher', 'assignmentClose', a.code);
  s = await f.call('s1', 'assignmentSnapshot', a.code);
  assert.equal(s.reward.remaining, 0);
  await assert.rejects(play(f, a.code, s), /沒有遊戲機會/);
  for (const game of ['survivors', 'none']) {
    const g = fixture(), b = await g.create({ game });
    const t = await g.call('s1', 'assignmentJoin', b.code, { studentId: '50101' });
    assert.equal(t.reward, undefined);
  }
});

test('allowance ignores unfinished, pending and ungraded questions', () => {
  const a = { mode: 'practice' }, b = { type: 'choice', points: 10 };
  assert.equal(assignmentAllowance(a, b, { closed: false, best: 10 }), 0);
  assert.equal(assignmentAllowance(a, b, { closed: true, best: 10, pending: 1 }), 0);
  assert.equal(assignmentAllowance(a, { ...b, ungraded: true }, { closed: true, best: 10 }), 0);
  assert.equal(assignmentAllowance(a, { type: 'cloud', points: 0 }, { closed: true, best: 0 }), 0);
  assert.equal(assignmentAllowance({ mode: 'exam' }, b, { closed: true, first: 4, best: 10 }), 1);
});
