import test from 'node:test';
import assert from 'node:assert/strict';
import {editVowelPhrase} from '../src/live/vowel-phrase.mjs';
import {newBlock,validateDeck,createRoom,joinRoom,controlRoom,tapVowel,grade} from '../src/live/domain.mjs';
test('phrase spacing preserves letter targets, including by bike and by bus',()=>{
  assert.deepEqual(editVowelPhrase({word:'bybike',targets:[1,3,5]},'by bike'),{word:'by bike',targets:[1,4,6]});
  assert.deepEqual(editVowelPhrase({word:'bybus',targets:[1,3]},'by bus'),{word:'by bus',targets:[1,4]});
  assert.deepEqual(editVowelPhrase({word:'by bike',targets:[1,4,6]},'bybike'),{word:'bybike',targets:[1,3,5]});
  assert.deepEqual(editVowelPhrase({word:'bybike',targets:[1,3,5]},'by bus').targets,[]);
});
test('phrase validation and scoring exclude spaces; old letter indices stay valid',()=>{
  const b=newBlock('vowel','v');
  b.vowelWords=[{word:'by bike',targets:[1,4,6],imageId:'i1'},{word:'by bus',targets:[1,4],imageId:'i2'},{word:'car',targets:[1],imageId:'i3'}];
  b.media=['i1','i2','i3'].map(id=>({id,kind:'image',name:id}));
  const deck={id:'phrases',title:'Phrases',blocks:[b]};
  assert.doesNotThrow(()=>validateDeck(deck));
  const room=createRoom(deck,'123456','teacher',1000);
  joinRoom(room,'student','55555',1001);
  controlRoom(room,'teacher','open',{revision:room.revision},1002);
  assert.throws(()=>tapVowel(room,'student',{blockId:'v',revision:room.revision,openedAt:room.openedAt,wordIndex:0,letterIndex:2},1003),/字母位置/);
  assert.equal(grade(b,[[1,4,6],[1,4],[1]]).score,b.points);
  assert.throws(()=>grade(b,[[2],[1,4],[1]]),/答案位置/);
  b.vowelWords[0].targets=[2];
  assert.throws(()=>validateDeck(deck),/字母位置/);
});
