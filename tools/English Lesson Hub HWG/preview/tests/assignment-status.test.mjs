import test from 'node:test';
import assert from 'node:assert/strict';
import { assignmentEnded, assignmentLabel, sortAssignments } from '../src/assignments/assignment-status.mjs';

const now = 1_000_000;
const open = (code, extra) => ({ code, title: 'Quiz ' + code, dueAt: now + 1000, ...extra });

test('closed or past-due assignments count as ended', () => {
  assert.equal(assignmentEnded(open('111111'), now), false);
  assert.equal(assignmentEnded(open('222222', { closed: true }), now), true);
  assert.equal(assignmentEnded(open('333333', { dueAt: now }), now), true);
});

test('ended assignments are labelled and listed last, keeping newest-first order within each group', () => {
  const list = [open('100001', { closed: true }), open('100002'), open('100003', { dueAt: now - 1 }), open('100004')];
  assert.deepEqual(sortAssignments(list, now).map(a => a.code), ['100002', '100004', '100001', '100003']);
  assert.equal(assignmentLabel(list[0], now), 'Quiz 100001 · 100001（已結束）');
  assert.equal(assignmentLabel(list[1], now), 'Quiz 100002 · 100002');
  assert.equal(list[0].code, '100001');
});
