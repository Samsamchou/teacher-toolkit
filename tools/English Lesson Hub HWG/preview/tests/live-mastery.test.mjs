import test from 'node:test';
import assert from 'node:assert/strict';
import {newBlock,createRoom,joinRoom,controlRoom,submitRoom,snapshot,report,tapVowel} from '../src/live/domain.mjs';
import {parityBlock} from '../src/live/parity.mjs';
import {rewardView,playReward,finishReward} from '../src/live/rewards.mjs';
import {requiresMastery,canRetryResponse} from '../src/live/mastery.mjs';
import {responseFeedback} from '../src/live/review.mjs';
const room = block => {
  const r=createRoom({id:'mastery-fixture',title:'Mastery',rewardGame:'slot',blocks:[block]},'123456','teacher',1000);
  joinRoom(r,'student','50101',1001); controlRoom(r,'teacher','open',{revision:r.revision},1002);return r;
};
const send=(r,answer,id,now=1003)=>submitRoom(r,'student',{answer,attemptId:id,blockId:r.deck.blocks[0].id,revision:r.revision},now);
const play=(r,id)=>playReward(r,'student',{turnId:id,blockId:r.deck.blocks[0].id,revision:r.revision,walletVersion:rewardView(r,'student').version},1005,123);
function fixture(type) {
  const b=parityBlock(newBlock(type,'q1'));b.seconds=1;b.points=6;
  if(['blank','drag','dropdown'].includes(type)) {b.sentence='{{b1}} and {{b2}}';b.blanks.push({id:'b2',answers:['train'],distractors:['car']});return {b,right:{b1:'bike',b2:'train'},wrong:{b1:'bike',b2:'car'}};}
  if(type==='label') {b.media=[{id:'image',kind:'image'}];b.background={assetId:'image',alt:'Transport'};b.labels.push({id:'l2',text:'bus'});b.anchors.push({id:'a2',x:.8,y:.8,labelId:'l2',direction:'down'});return {b,right:{a1:'l1',a2:'l2'},wrong:{a1:'l2',a2:'l1'}};}
  if(type==='hotspot') {b.media=[{id:'image',kind:'image'}];b.background={assetId:'image',alt:'Transport'};b.regions.push({id:'r2',shape:'point',x:.8,y:.8,r:.05,correct:false});return {b,right:['r1'],wrong:['r2']};}
  if(type==='multiselect') return {b,right:[1,2,3],wrong:[1,2,0]};
  if(type==='category') return {b,right:[0,0,1],wrong:[0,1,0]};
  if(type==='order') return {b,right:[...b.items],wrong:[...b.items].reverse()};
  return {b,right:[0],wrong:[1]};
}
for(const type of ['choice','multiselect','blank','drag','label','hotspot','order','category','dropdown']) test(`${type}: 100 mistakes after countdown, then full credit and two turns only`,()=>{
  const {b,right,wrong}=fixture(type),r=room(b);
  for(let i=0;i<100;i++){
    const response=send(r,wrong,`wrong-${i}`,5000+i);
    assert.equal(canRetryResponse(b,response),true);assert.equal(rewardView(r,'student').eligible,false);assert.equal(rewardView(r,'student').earned,0);assert.throws(()=>play(r,`forged-${i}`));
    assert.notEqual(responseFeedback(b,response).outcome,'full');
  }
  assert.equal(Object.keys(r.responses).length,1);
  const saved=snapshot(r,'student',5100).responses[0];assert.deepEqual(saved.answer,wrong);assert.equal(saved.attemptNumber,100);assert.equal(saved.storageId,undefined);assert.equal(saved.grade.details,undefined);
  const response=send(r,right,'now-correct',5200);assert.equal(response.attemptNumber,101);assert.equal(responseFeedback(b,response).outcome,'full');
  assert.equal(send(r,right,'now-correct',5201),response);assert.equal(rewardView(r,'student').earned,2);assert.throws(()=>send(r,right,'duplicate-new-id',5202));
  assert.equal(report(r)[0].score,6);assert.equal(report(r)[0].submitted,1);
  play(r,'turn-one');finishReward(r,'student',{turnId:'turn-one',revision:r.revision},5203);play(r,'turn-two');finishReward(r,'student',{turnId:'turn-two',revision:r.revision},5204);assert.throws(()=>play(r,'turn-three'));
});
test('zero-score and ungraded objective questions still require a correct answer',()=>{
  for(const setting of [{points:0},{ungraded:true}]){const b={...newBlock('choice','q1'),...setting},r=room(b);send(r,[1],'wrong-zero');assert.equal(rewardView(r,'student').earned,0);const correct=send(r,[0],'right-zero');assert.equal(responseFeedback(b,correct).outcome,'full');assert.equal(rewardView(r,'student').earned,2);}
});
test('teacher lock, reveal and changing page stop objective retries',()=>{
  for(const action of ['lock','reveal','end']){const r=room(newBlock('choice','q1'));send(r,[1],'wrong-one');controlRoom(r,'teacher',action,{revision:r.revision},1010);assert.throws(()=>send(r,[0],'too-late',1011));}
});
test('four exempt types retain existing grading, deadline and one-submission policy',()=>{
  for(const type of ['draw','cloud','open','audio'])assert.equal(requiresMastery(newBlock(type)),false);
  const r=room({...newBlock('open','q1'),seconds:1});assert.throws(()=>send(r,'late','late-open',3000),/時間/);
  const cloud=room(newBlock('cloud','q1'));send(cloud,'blue','cloud-one');assert.equal(rewardView(cloud,'student').earned,2);assert.throws(()=>send(cloud,'red','cloud-two'),/已交卷/);
});
test('old immutable responses coexist with a new compact retry record',()=>{
  const r=room(newBlock('choice','q1'));r.responses.historical={attemptId:'historical',uid:'student',studentId:'50101',blockId:'q1',openedAt:r.openedAt,submittedAt:1003,answer:[1],rewardPass:false,rewardGranted:1,grade:{status:'graded',score:0,max:1}};
  const history=JSON.stringify(r.responses.historical);send(r,[1],'retry-new');send(r,[0],'retry-done',1004);assert.equal(JSON.stringify(r.responses.historical),history);assert.equal(report(r)[0].score,1);assert.equal(rewardView(r,'student').earned,2);
});
test('vowel mistakes retain selections and return encouragement; full completion grants once',()=>{
  const b=newBlock('vowel','q1');b.seconds=1;b.media=Array.from({length:3},(_,i)=>({id:`image-${i}`,kind:'image'}));b.vowelWords=['bike','bus','car'].map((word,i)=>({word,targets:[1],imageId:`image-${i}`}));
  const r=room(b),tap=(wi,li)=>tapVowel(r,'student',{blockId:'q1',revision:r.revision,wordIndex:wi,letterIndex:li},5000);
  for(let i=0;i<100;i++){const t=tap(0,0);assert.equal(t.correct,false);assert.equal(t.feedback.outcome,'wrong');assert.equal(rewardView(r,'student').eligible,false);}
  tap(0,1);assert.deepEqual(snapshot(r,'student',5001).vowelProgress.selected[0],[1]);tap(1,1);assert.equal(tap(2,1).complete,true);assert.equal(rewardView(r,'student').earned,2);tap(2,1);assert.equal(Object.keys(r.responses).length,1);
});
