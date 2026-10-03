import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSyncSeekEvent, shouldSendNativePlaybackEvent, videoCommandStatus, VIDEO_COMMAND_WAIT_MS,
} from '../src/live/uploaded-video-sync.mjs';

const source = { blockId: 'slide-1', assetId: 'film-1' };
const pending = (action, expectedPlaying, position = 4) => ({
  action, expectedPlaying, position, sequence: 0, startedAt: 1000,
});

test('native teacher play survives a stale paused snapshot until the whole-class acknowledgement', () => {
  const play = pending('play', true);
  assert.equal(shouldSendNativePlaybackEvent('play', null, null), true);
  assert.equal(videoCommandStatus(play, null, source.blockId, source.assetId, 2000), 'waiting');
  assert.equal(shouldSendNativePlaybackEvent('play', null, play), false);
  assert.equal(videoCommandStatus(play, { ...source, sequence: 1, playing: true }, source.blockId, source.assetId, 3000), 'confirmed');
});

test('native teacher pause is not restarted by an old playing snapshot', () => {
  const pause = pending('pause', false);
  const old = { ...source, sequence: 0, playing: true };
  assert.equal(shouldSendNativePlaybackEvent('pause', old, null), true);
  assert.equal(videoCommandStatus(pause, old, source.blockId, source.assetId, 2000), 'waiting');
  assert.equal(videoCommandStatus(pause, { ...source, sequence: 1, playing: false }, source.blockId, source.assetId, 3000), 'confirmed');
});

test('native seek waits for the matching authoritative position, not another video or earlier play', () => {
  const seek = pending('seek', true, 18);
  assert.equal(videoCommandStatus(seek, { ...source, sequence: 1, position: 4, playing: true }, source.blockId, source.assetId, 2000), 'waiting');
  assert.equal(videoCommandStatus(seek, { ...source, sequence: 2, position: 18, playing: true }, source.blockId, source.assetId, 2000), 'confirmed');
  assert.equal(videoCommandStatus(seek, { ...source, assetId: 'other', sequence: 2, position: 18 }, source.blockId, source.assetId, 2000), 'waiting');
});

test('sync-driven media events do not echo and unacknowledged commands expire visibly', () => {
  assert.equal(shouldSendNativePlaybackEvent('play', { playing: true }, null), false);
  assert.equal(shouldSendNativePlaybackEvent('pause', { playing: false }, null), false);
  assert.equal(videoCommandStatus(pending('play', true), null, source.blockId, source.assetId, 1000 + VIDEO_COMMAND_WAIT_MS), 'expired');
  assert.equal(isSyncSeekEvent({ position: 18, at: 1000 }, 18.1, 6000), true);
  assert.equal(isSyncSeekEvent({ position: 18, at: 1000 }, 31, 2000), false);
  assert.equal(isSyncSeekEvent({ position: 18, at: 1000 }, 18, 11000), false);
});
