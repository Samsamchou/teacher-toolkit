import test from 'node:test';
import assert from 'node:assert/strict';
import { newBlock, validateDeck, createRoom, joinRoom, controlRoom, snapshot } from '../src/live/domain.mjs';
import { canvasFor, slideToQuestion } from '../src/live/slide-canvas.mjs';
import { blockVideoTrim, clampVideoPosition, validateVideoTrim, videoPosition, videoClipEnded, videoTime } from '../src/live/video.mjs';

const url = 'https://youtu.be/M7lc1UVf-VE';
function slide(trim = { start: 83, end: 120 }) {
  const block = { ...newBlock('slide', 'trim-slide'), embed: url };
  block.slideCanvas.elements = [{ id: 'film', kind: 'embed', url, trim, x: 10, y: 20, w: 80, h: 70, z: 0 }];
  return block;
}
const deck = block => ({ id: 'trim-deck', title: 'Trim QA', blocks: [block] });
test('YouTube trim accepts exactly five seconds and ordinary minute/second ranges', () => {
  for (const trim of [{ start: 0, end: 5 }, { start: 83, end: 120 }, { start: 86395, end: 86400 }]) validateVideoTrim(trim, url);
  assert.equal(videoTime(83), '01:23'); assert.equal(videoTime(120), '02:00');
  validateVideoTrim(undefined, url); validateVideoTrim(null, url);
});
test('invalid times, sub-five-second ranges and other providers cannot save trims', () => {
  for (const trim of [{ start: 0, end: 4 }, { start: 5, end: 0 }, { start: -1, end: 10 }, { start: 1.5, end: 10 }, { start: 0, end: Infinity }, { start: 0, end: 86401 }, {}, [], '00:05']) {
    assert.throws(() => validateVideoTrim(trim, url));
    assert.throws(() => validateDeck(deck(slide(trim)), { draft: true }));
  }
  assert.throws(() => validateVideoTrim({ start: 0, end: 5 }, 'https://www.canva.com/design/abc123/view'));
  const block = slide(); block.slideCanvas.elements[0].kind = 'video'; block.slideCanvas.elements[0].assetId = 'asset'; block.media = [{ id: 'asset', kind: 'video' }];
  assert.throws(() => validateDeck(deck(block), { draft: true }));
});
test('save/readback and conversion retain the range without changing the original source', () => {
  const block = slide(), original = JSON.stringify(block);
  const restored = JSON.parse(original); validateDeck(deck(restored)); assert.deepEqual(blockVideoTrim(restored), { start: 83, end: 120 });
  const converted = slideToQuestion(block, newBlock('choice', 'question-copy'));
  assert.deepEqual(converted.questionCanvas.elements[0].trim, { start: 83, end: 120 }); assert.equal(JSON.stringify(block), original);
  assert.deepEqual(canvasFor(block).elements[0].trim, { start: 83, end: 120 });
});
test('only the active matching YouTube source affects classroom clipping', () => {
  const block = slide(); block.embed = 'https://www.youtube.com/watch?v=M7lc1UVf-VE'; assert.deepEqual(blockVideoTrim(block), { start: 83, end: 120 });
  block.embed = 'https://youtu.be/dQw4w9WgXc'; assert.equal(blockVideoTrim(block), undefined);
  block.embed = ''; assert.equal(blockVideoTrim(block), undefined);
});
test('clock advancement stops at the range end, including a returning student', () => {
  const trim = { start: 83, end: 120 }, state = { position: 90, playing: true, updatedAt: 1000 };
  assert.equal(videoPosition(state, 11000, trim), 100); assert.equal(videoPosition(state, 91000, trim), 120);
  assert.equal(videoClipEnded(state, 31000, trim), true);
  assert.equal(clampVideoPosition(0, trim), 83); assert.equal(clampVideoPosition(999, trim), 120);
  assert.equal(videoPosition(state, 11000), 100);
});
test('teacher play, seek, pause and replay stay within the saved range', () => {
  const b = slide(), room = createRoom(deck(b), '123456', 'teacher', 1000); joinRoom(room, 'student', '50101', 1001);
  controlRoom(room, 'teacher', 'start', { revision: room.revision }, 1002);
  const command = (verb, position, now) => controlRoom(room, 'teacher', 'video', { revision: room.revision, blockId: b.id, command: verb, position }, now);
  command('play', 0, 2000); assert.equal(room.video.position, 83); assert.equal(room.video.playing, true);
  assert.throws(() => controlRoom(room, 'student', 'video', { revision: room.revision, blockId: b.id, command: 'seek', position: 84 }, 2001));
  const ended = snapshot(room, 'student', 40000); assert.equal(ended.video.position, 120); assert.equal(ended.video.playing, false);
  assert.deepEqual(ended.block.slideCanvas.elements[0].trim, { start: 83, end: 120 });
  command('seek', 999, 41000); assert.equal(room.video.position, 120); assert.equal(room.video.playing, false);
  command('play', 120, 42000); assert.equal(room.video.position, 83); assert.equal(room.video.playing, true);
  command('seek', 0, 43000); assert.equal(room.video.position, 83); assert.equal(room.video.playing, true);
  controlRoom(room, 'teacher', 'pause', { revision: room.revision }, 100000); assert.equal(room.video.position, 120); assert.equal(room.video.playing, false);
});
