import test from 'node:test';
import assert from 'node:assert/strict';
import { COURSE_COLORS, newBlock, validateDeck } from '../src/live/domain.mjs';
import { duplicateDeck } from '../src/live/deck-copy.mjs';

const deck = extra => ({ id: 'color-deck', title: 'Color QA', blocks: [newBlock('slide', 's1')], ...extra });

test('course color accepts only palette keys and stays optional', () => {
  assert.doesNotThrow(() => validateDeck(deck({}), { draft: true }));
  for (const key of Object.keys(COURSE_COLORS)) assert.doesNotThrow(() => validateDeck(deck({ cardColor: key }), { draft: true }));
  for (const bad of ['#ff0000', 'Red', '__proto__', '', 3]) assert.throws(() => validateDeck(deck({ cardColor: bad }), { draft: true }), /課程配色/);
});

test('copying a course keeps its color', () => {
  assert.equal(duplicateDeck(deck({ cardColor: 'green' }), 'Copy', 'copy-id').cardColor, 'green');
  assert.equal('cardColor' in duplicateDeck(deck({}), 'Copy', 'copy-id'), false);
});
