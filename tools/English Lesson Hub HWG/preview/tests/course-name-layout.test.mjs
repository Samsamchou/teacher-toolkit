import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {courseName} from '../src/live/course-name.mjs';
import {createRoom,newBlock} from '../src/live/domain.mjs';
test('course name validates blanks and 200 UTF16 limit without altering internal spaces',()=>{
  assert.equal(courseName('  五年級 Unit 2 交通  工具  '),'五年級 Unit 2 交通  工具');
  for(const v of ['', ' \n ',null,'a'.repeat(201)])assert.throws(()=>courseName(v));
  assert.equal(courseName('a'.repeat(200)).length,200);
});
test('naming retains course identity and existing room snapshot',()=>{
  const deck={id:'name-qa',schemaVersion:2,title:'原課程',blocks:[newBlock('slide')]};
  const room=createRoom(deck,'123456','teacher',Date.now());
  const renamed={...deck,title:courseName('新課程')};
  assert.equal(renamed.id,deck.id);assert.equal(room.deck.title,'原課程');
});
test('only question stems lose minimum height; options scale and wrap',()=>{
  const css=readFileSync(new URL('../src/live/compact.css',import.meta.url),'utf8');
  const app=readFileSync(new URL('../src/live/LiveApp.jsx',import.meta.url),'utf8');
  assert.match(css,/\.lh-canvas\.lh-question-stem \{ min-height:0/);
  assert.match(app,/block.type === 'slide' \? 'lh-slide-canvas' : 'lh-question-stem'/);
  assert.match(css,/font-size:clamp\(28px,2.5vw,36px\)/);
  assert.match(css,/overflow-wrap:anywhere; white-space:normal/);
});
