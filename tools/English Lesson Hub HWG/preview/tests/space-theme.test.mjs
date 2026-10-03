import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const css=readFileSync(new URL('../src/live/space.css',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/live/LiveApp.jsx',import.meta.url),'utf8');
const component=readFileSync(new URL('../src/live/SpaceTheme.jsx',import.meta.url),'utf8');
test('space artwork is a local project asset, with decorative-only markup',()=>{
  assert.ok(existsSync(new URL('../public/live-space/space-academy-v1.png',import.meta.url)));
  assert.match(css,/url\('\/live-space\/space-academy-v1.png'\)/);
  assert.match(component,/aria-hidden="true"/);
  assert.match(css,/pointer-events:none/);
});
test('motion is opt-out and system reduced-motion is respected',()=>{
  assert.match(component,/aria-pressed=\{still\}/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/data-phase="lobby"/);
  assert.match(app,/data-phase=\{room.phase\}/);
  assert.doesNotMatch(component,/setInterval|requestAnimationFrame|api\(/);
});
test('grading styles load after theme and correct options are excluded',()=>{
  assert.ok(app.indexOf("import './space.css'")<app.indexOf("import './review.css'"));
  assert.match(css,/:not\(\.lh-correct-option\)/);
});
test('print removes space decorations and QR retains white backing',()=>{
  assert.match(css,/@media print/);
  assert.match(css,/\.lh-space-scene,\.lh-space-banner \{ display:none!important/);
  assert.match(css,/\.lh-join-qr \{ background:#fff; padding:12px/);
});
