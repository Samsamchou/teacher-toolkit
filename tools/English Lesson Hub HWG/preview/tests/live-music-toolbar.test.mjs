import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { teacherMusicMode, shouldPlayTeacherMusic } from '../src/live/teacher-music-policy.mjs';

test('teacher music pauses on every slide and starts on question pages', () => {
  for (const phase of ['content', 'question', 'paused']) {
    assert.equal(teacherMusicMode({ blockType: 'slide', phase }), 'slide');
    assert.equal(shouldPlayTeacherMusic({ blockType: 'slide', phase }), false);
  }
  assert.equal(shouldPlayTeacherMusic({ blockType: 'choice', phase: 'content' }), true);
  assert.equal(shouldPlayTeacherMusic({ blockType: 'vowel', phase: 'question' }), true);
  assert.equal(shouldPlayTeacherMusic({ blockType: 'choice', phase: 'question' }, true), false);
  assert.equal(teacherMusicMode({ blockType: 'choice', phase: 'question', videoPlaying: true }), 'video');
  assert.equal(shouldPlayTeacherMusic({ blockType: 'choice', phase: 'question', videoPlaying: true }), false);
  assert.equal(shouldPlayTeacherMusic({ blockType: 'choice', phase: 'lobby' }), false);
  assert.equal(shouldPlayTeacherMusic({ blockType: 'choice', phase: 'complete' }), false);
});

test('teacher controls retain named actions and assigned colors', async () => {
  const jsx = await readFile(new URL('../src/live/LiveApp.jsx', import.meta.url), 'utf8');
  const css = await readFile(new URL('../src/live/compact.css', import.meta.url), 'utf8');
  assert.match(jsx, /className="lh-action-focus"[\s\S]*?Eyes Up Front/);
  assert.match(jsx, /className="lh-action-reveal"[\s\S]*?公布答案/);
  assert.match(css, /lh-action-focus[^{}]*\{[^}]*background:#1662c9; color:#fff/);
  assert.match(css, /lh-action-reveal[^{}]*\{[^}]*background:#178347; color:#fff/);
  for (const action of ['start','previous','next','open','lock','focus','discussion','reveal','ink','end']) {
    assert.match(jsx, new RegExp(`lh-action-${action}`));
    assert.match(css, new RegExp(`lh-action-${action}`));
  }
});
