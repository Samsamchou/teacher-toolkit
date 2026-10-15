import test from 'node:test';
import assert from 'node:assert/strict';
import {duplicateDeck} from '../src/live/deck-copy.mjs';
import {canvasFor} from '../src/live/slide-canvas.mjs';
import {newBlock,validateDeck} from '../src/live/domain.mjs';
test('copy keeps hidden conversion references and media, resets identity and excludes room records',()=>{
  const source={id:'source',title:'HWG7 U02 Sentence 02 601',schemaVersion:2,version:1541,rewardGame:'worldpup',legacyLessonId:'legacy',blocks:[{...newBlock('slide','s1'),slideCanvas:{...canvasFor(newBlock('slide','s1')),original:{text:'original'}}},{...newBlock('choice','q1'),hidden:true,conversionSourceId:'s1',media:[{id:'asset',kind:'video',name:'video.mp4'}],answer:[1],notes:'Teacher note'}],responses:{student:'private'},code:'123456',wallets:{student:100}};
  const before=JSON.stringify(source),result=duplicateDeck(source,' HWG7 U02 Sentence 02 602 ','copy');
  assert.equal(result.id,'copy');assert.equal(result.version,0);assert.equal(result.title,'HWG7 U02 Sentence 02 602');assert.equal(result.rewardGame,source.rewardGame);assert.deepEqual(result.blocks,source.blocks);assert.equal(result.blocks[1].conversionSourceId,result.blocks[0].id);
  for(const key of ['responses','code','wallets'])assert.equal(result[key],undefined);
  result.blocks[1].answer[0]=0;result.blocks[0].slideCanvas.original.text='changed';assert.equal(JSON.stringify(source),before);validateDeck(result,{draft:true});
});
test('copy rejects blank names and original course ID',()=>{const s={id:'s',blocks:[newBlock()]};assert.throws(()=>duplicateDeck(s,'  ','new'),/名稱/);assert.throws(()=>duplicateDeck(s,'New','s'),/獨立/);});

