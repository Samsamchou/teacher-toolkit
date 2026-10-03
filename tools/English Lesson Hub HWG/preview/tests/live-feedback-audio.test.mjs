import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { newBlock, grade } from '../src/live/domain.mjs';
import { parityBlock } from '../src/live/parity.mjs';
import { responseFeedback } from '../src/live/review.mjs';
import { OUTCOME_LABELS, OUTCOME_TONES, validFeedbackReceipt, consumeFeedbackReceipt, playOutcomeTones } from '../src/live/feedback-audio.mjs';

const choice = { ...parityBlock(newBlock('multiselect', 'Q')), options: ['train', 'car', 'bus', 'bike'], answer: [1, 2, 3], requiredSelections: 3, points: 3 };
const receipt = (block, answer, attemptId) => responseFeedback(block, { attemptId, answer, grade: grade(block, answer) });

test('authoritative assessment yields one minimal result category, never keys or score', () => {
  assert.deepEqual(receipt(choice, [1, 2, 3], 'attempt-full'), { attemptId: 'attempt-full', outcome: 'full', mastery:true });
  assert.deepEqual(receipt(choice, [0, 1, 2], 'attempt-partial'), { attemptId: 'attempt-partial', outcome: 'partial', mastery:true });
  assert.deepEqual(receipt(choice, [0], 'attempt-wrong'), { attemptId: 'attempt-wrong', outcome: 'wrong', mastery:true });
  assert.deepEqual(Object.keys(receipt(choice, [1, 2, 3], 'attempt-full')).sort(), ['attemptId', 'mastery', 'outcome']);
});

test('manual and ungraded responses remain silent; historical scoring is untouched', () => {
  assert.equal(receipt(newBlock('open'), 'hello', 'attempt-open'), null);
  assert.equal(receipt(newBlock('cloud'), 'blue', 'attempt-cloud'), null);
  assert.equal(responseFeedback(choice, null), null);
  assert.equal(OUTCOME_LABELS.full, '全對');
  assert.notEqual(JSON.stringify(OUTCOME_TONES.full), JSON.stringify(OUTCOME_TONES.partial));
  assert.notEqual(JSON.stringify(OUTCOME_TONES.partial), JSON.stringify(OUTCOME_TONES.wrong));
});

test('feedback tone synthesizer only plays valid outcome on a running context', () => {
  const events = [];
  const context = {
    state: 'running', currentTime: 1, destination: {},
    createOscillator: () => ({ type: '', frequency: { setValueAtTime: (...args) => events.push(['freq', ...args]) }, connect: () => {}, start: t => events.push(['start', t]), stop: t => events.push(['stop', t]) }),
    createGain: () => ({ gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {} }),
  };
  assert.equal(playOutcomeTones(context, 'full'), true);
  assert.equal(events.filter(e => e[0] === 'start').length, 3);
  assert.equal(playOutcomeTones(context, 'missing'), false);
  assert.equal(playOutcomeTones({ ...context, state: 'suspended' }, 'wrong'), false);
  assert.equal(validFeedbackReceipt({ attemptId: 'attempt-one', outcome: 'partial' }), true);
  assert.equal(validFeedbackReceipt({ attemptId: 'attempt-one', outcome: 'pending' }), false);
  const played = new Set();
  assert.equal(consumeFeedbackReceipt({ attemptId: 'attempt-one', outcome: 'partial' }, played), true);
  assert.equal(consumeFeedbackReceipt({ attemptId: 'attempt-one', outcome: 'partial' }, played), false);
  assert.equal(consumeFeedbackReceipt({ attemptId: 'attempt-two', outcome: 'pending' }, played), false);
});

test('bundled teacher track equals the documented official Pixabay file', async () => {
  const source = JSON.parse(await readFile(new URL('../public/live-audio/upbeat-happy-corporate-487426.source.json', import.meta.url), 'utf8'));
  const data = await readFile(new URL(`../public/live-audio/${source.file}`, import.meta.url));
  assert.equal(data.length, source.bytes);
  assert.equal(createHash('sha256').update(data).digest('hex'), source.sha256);
  assert.equal(data[0], 0xff);
  assert.equal(data[1] & 0xe0, 0xe0); // MPEG audio frame sync; this MP3 has no ID3 prefix.
  assert.equal(source.sourcePage, 'https://pixabay.com/music/corporate-upbeat-happy-corporate-487426/');
});
