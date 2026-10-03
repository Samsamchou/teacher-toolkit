// Synthetic localhost-only classroom check. Never sends teacher credentials or production data.
import assert from 'node:assert/strict';
import { newBlock } from '../src/live/domain.mjs';
import { parityBlock } from '../src/live/parity.mjs';

const origin = process.env.LIVE_FEEDBACK_LOCAL_ORIGIN || 'http://127.0.0.1:5178';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error('Only a loopback test server is allowed');

function actor(role) {
  let cookie = '';
  return async (action, code = null, payload = {}) => {
    const response = await fetch(`${origin}/api/live`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-lab-role': role, ...(cookie ? { cookie } : {}) },
      body: JSON.stringify({ action, code, payload }),
    });
    const issued = response.headers.get('set-cookie');
    if (issued) cookie = issued.split(';')[0];
    const result = await response.json();
    if (!response.ok) throw new Error(`${action}: ${result.error}`);
    return result;
  };
}

const teacher = actor('teacher'), students = [actor('student'), actor('student'), actor('student')];
const block = { ...parityBlock(newBlock('multiselect', 'feedback-question')), options: ['train', 'car', 'bus', 'bike'], answer: [1, 2, 3], requiredSelections: 3, points: 3 };
let room = await teacher('create', null, { deck: { id: crypto.randomUUID(), title: 'Audio feedback synthetic QA', blocks: [block] } });
for (let i = 0; i < students.length; i++) await students[i]('join', room.code, { studentId: String(50101 + i) });
room = await teacher('control', room.code, { action: 'open', revision: room.revision });
const before = await students[0]('snapshot', room.code);
assert.equal(before.block.answer, undefined);
assert.equal(before.feedback, undefined);
for (const [index, answer, outcome] of [[0, [1, 2, 3], 'full'], [1, [0, 1, 2], 'partial'], [2, [0], 'wrong']]) {
  const input = { attemptId: crypto.randomUUID(), blockId: block.id, revision: room.revision, answer };
  const submitted = await students[index]('submit', room.code, input);
  assert.deepEqual(submitted.feedback, { attemptId: input.attemptId, outcome });
  assert.equal(submitted.responses.length, 1);
  assert.equal(submitted.responses[0].grade.score, undefined);
  assert.equal(submitted.block.answer, undefined);
  assert.deepEqual((await students[index]('submit', room.code, input)).feedback, submitted.feedback);
  assert.equal((await students[index]('snapshot', room.code)).feedback, undefined);
}

const vowel = newBlock('vowel', 'feedback-vowel');
vowel.media = ['bike', 'car', 'train'].map((name, i) => ({ id: `image-${i}`, name, kind: 'image' }));
vowel.vowelWords = [
  { word: 'bike', imageId: 'image-0', targets: [1, 3] },
  { word: 'car', imageId: 'image-1', targets: [1, 2] },
  { word: 'train', imageId: 'image-2', targets: [2, 3] },
];
let vowelRoom = await teacher('create', null, { deck: { id: crypto.randomUUID(), title: 'Audio feedback vowel QA', blocks: [vowel] } });
await students[0]('join', vowelRoom.code, { studentId: '50101' });
vowelRoom = await teacher('control', vowelRoom.code, { action: 'open', revision: vowelRoom.revision });
for (const [wi, li] of [[0, 0], [0, 1], [0, 3], [1, 1], [1, 2], [2, 2]]) {
  const r = await students[0]('vowelTap', vowelRoom.code, { blockId: vowel.id, revision: vowelRoom.revision, wordIndex: wi, letterIndex: li });
  assert.equal(r.feedback, undefined);
}
const final = await students[0]('vowelTap', vowelRoom.code, { blockId: vowel.id, revision: vowelRoom.revision, wordIndex: 2, letterIndex: 3 });
assert.equal(final.tap.complete, true);
assert.equal(final.feedback.outcome, 'full');
assert.equal((await students[0]('snapshot', vowelRoom.code)).feedback, undefined);
console.log('PASS localhost feedback: full, partial, wrong, vowel auto-submit, private snapshot, idempotent retry');
