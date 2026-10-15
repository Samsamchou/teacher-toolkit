import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spellDefinition,validateSpell,publicSpell,gradeSpell} from '../src/live/spelling.mjs';
import {gradeSpell as backendGrade} from '../functions/generated/spelling.mjs';
import {answerText} from '../src/live/review.mjs';
import {answerText as backendAnswerText} from '../functions/generated/review.mjs';
const block=(text,extras='')=>({id:'spell-case',type:'spell',points:10,...spellDefinition(text,extras)});
function ids(b,text){const pool=[...b.spellTiles];return [...text.replaceAll(' ','')].map(c=>{const i=pool.findIndex(t=>t.text===c);assert.ok(i>=0,'Missing tile '+c);return pool.splice(i,1)[0].id;});}

test('typing retains a new word separator and preserves answer and distractor case',()=>{
 let value='';for(const c of 'social studies')value=spellDefinition(value+c).spellingAnswer;
 assert.equal(value,'social studies');assert.equal(spellDefinition('social ').spellingAnswer,'social ');
 const b=block('English','eC');validateSpell(b);assert.ok(b.spellTiles.some(t=>t.text==='E'));assert.ok(b.spellTiles.some(t=>t.text==='e'));assert.ok(b.spellTiles.some(t=>t.text==='C'));
});
test('Chinese and English require the teacher-defined exact case on both graders',()=>{
 for(const [word,extras] of [['Chinese','cHINESE'],['English','eNGLISH']]){
  const b=block(word,extras);
  for(const grade of [gradeSpell,backendGrade]){
   assert.equal(grade(b,ids(b,word)).score,10);
   assert.equal(grade(b,ids(b,word.toLowerCase())).score,0);
   assert.equal(grade(b,ids(b,word.toUpperCase())).score,0);
   assert.equal(grade(b,ids(b,word)).scoringVersion,'spell-2');
  }
 }
});
test('phrase boundaries are fixed single spaces and answer protection remains intact',()=>{
 const b=block('social studies','ST'),before=JSON.stringify(b),p=publicSpell(b);
 assert.deepEqual(p.spellGroups,[6,7]);assert.equal(p.spellCaseSensitive,true);
 assert.equal(Object.hasOwn(p,'spellingAnswer'),false);assert.equal(Object.hasOwn(p,'spellDistractors'),false);
 assert.equal(gradeSpell(b,ids(b,'social studies')).score,10);
 assert.equal(publicSpell(block('  social   studies  '),true).correctSpelling,'social studies');
 assert.equal(JSON.stringify(b),before);assert.throws(()=>gradeSpell(b,'socialstudies'),/不同字卡/);
});
test('old lowercase snapshots keep their old scoring contract and are never mutated',()=>{
 const b=block('english');delete b.spellingVersion;const original=JSON.stringify(b),answer=ids(b,'english');
 assert.equal(gradeSpell(b,answer).scoringVersion,'spell-1');assert.deepEqual(backendGrade(b,answer),gradeSpell(b,answer));
 assert.equal(publicSpell(b).spellCaseSensitive,false);assert.equal(JSON.stringify(b),original);
 const edited={...b,...spellDefinition('English')};assert.equal(edited.spellingVersion,2);assert.ok(edited.spellTiles.some(t=>t.text==='E'));assert.equal(JSON.stringify(b),original);
});
test('case-sensitive duplicate letters still require distinct opaque tile identities',()=>{
 const b=block('English English');validateSpell(b);assert.equal(gradeSpell(b,ids(b,'English English')).score,10);
 assert.throws(()=>gradeSpell(b,Array(14).fill(b.spellTiles[0].id)),/不同字卡/);
 assert.throws(()=>validateSpell({...b,spellTiles:b.spellTiles.map(t=>({...t,text:t.text.toLowerCase()}))}),/缺少正解字母/);
});
test('deployed spelling source is byte-identical to the frontend source',async()=>{
 assert.deepEqual(await readFile(new URL('../src/live/spelling.mjs',import.meta.url)),await readFile(new URL('../functions/generated/spelling.mjs',import.meta.url)));
});
test('teacher answer details preserve capitalization and one space for private and public blocks',()=>{
 for(const text of ['Chinese','English','social studies']){
  const b=block(text),answer=ids(b,text),original=JSON.stringify(answer);
  for(const display of [answerText,backendAnswerText]){
   assert.equal(display(b,answer),text);assert.equal(display(publicSpell(b),answer),text);
  }
  assert.equal(JSON.stringify(answer),original);
 }
});
