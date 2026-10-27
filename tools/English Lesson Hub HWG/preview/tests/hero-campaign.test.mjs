import test from 'node:test';import assert from 'node:assert/strict';
import {createAssignmentService} from '../functions/src/assignment-service.mjs';
import {createMemoryFirestore} from '../scripts/assignment-memory-store.mjs';
import {newBlock} from '../src/live/domain.mjs';
import {HEROES,normalizeHeroGame,initialHeroGame} from '../src/assignments/game-heroes.mjs';
import {levelPlan,publicAssignment,newAssignmentRun} from '../src/assignments/assignment-domain.mjs';
async function fixture(count=36,mode='practice'){
 const db=createMemoryFirestore(),teacher='campaign-teacher',student='campaign-student';
 const deck={id:'hero-campaign',title:'Synthetic hero QA',version:1,blocks:Array.from({length:count},(_,i)=>({...newBlock('choice','q'+i),title:'Choose cat',options:['cat','dog','bird'],answer:[0],points:count===36?(i<28?3:2):10}))};
 await db.collection('liveDecksV2').doc(teacher+'_'+deck.id).set({json:JSON.stringify(deck)});
 const service=()=>createAssignmentService({db,requireTeacher:async req=>{if(req.auth.uid!==teacher)throw Error('teacher required');}});
 let handle=service();const call=(uid,action,code,payload={})=>handle({auth:{uid,token:{firebase:{sign_in_provider:'anonymous'}}},data:{action,code,payload}});
 const a=(await call(teacher,'assignmentCreate',null,{requestId:'hero-create-001',deckId:deck.id,expectedVersion:1,title:'Hero campaign QA',mode,questionOrder:'random',optionOrder:'random',game:'survivors',gameVersion:2,dueAt:Date.now()+3600000})).assignment;
 return {db,a,call,teacher,student,restart(){handle=service();}};
}
for(const [role,h] of Object.entries(HEROES))test(`36-question full campaign persists ${role}, score, boss and teacher report after restart`,async()=>{
 const {a,call,teacher,student,restart}=await fixture();let s=await call(student,'assignmentJoin',a.code,{studentId:'50101',roleId:role});assert.equal(a.gameVersion,2);assert.equal(s.run.game.hp,h.hp);
 const sequence=[...s.run.sequence],seen=[];
 for(let i=0;i<36;i++){
  if(i===0)for(let n=0;n<3;n++)s=await call(student,'assignmentSubmit',a.code,{revision:s.run.revision,blockId:s.block.id,attemptId:`hero-wrong-${role}-${n}`,answer:[1]});
  s=await call(student,'assignmentSubmit',a.code,{revision:s.run.revision,blockId:s.block.id,attemptId:`hero-correct-${role}-${i}`,answer:[0]});if(i===0){assert.equal(s.feedback.reward.points,1);assert.equal(s.feedback.adopted,s.block.points);}
  const level=s.level.level;if(!seen.includes(level))seen.push(level);
  const bossHp=level===6?Math.max(0,260-44*(i-29)):260;
  const game={...s.run.game,roleId:role,hp:h.hp,level,seconds:i+1,defeated:i,recoveries:0,skillUses:Math.floor(i/3),skillCooldown:7,stageSeconds:(i%6)*25,wave:0,bossHp,bossShield:level===6?0:24,bossDefeated:bossHp===0};
  await call(student,'assignmentCheckpoint',a.code,{index:s.run.index,game});
  if(i===20){restart();const resumed=await call(student,'assignmentJoin',a.code,{studentId:'50101',roleId:role==='mage'?'warden':'mage'});assert.equal(resumed.run.game.roleId,role);assert.equal(resumed.run.game.skillCooldown,7);assert.deepEqual(resumed.run.sequence,sequence);}
  s=await call(student,'assignmentAdvance',a.code,{revision:s.run.revision});
 }
 assert.deepEqual(seen,[1,2,3,4,5,6]);assert.equal(s.score.earned,100);assert.equal(s.score.max,100);assert.equal(s.run.gameResult.bossDefeated,true);assert.equal(s.run.gameResult.status,'cleared');assert.equal(s.run.gameResult.roleId,role);assert.equal(s.run.gameResult.levelsCompleted,6);
 restart();const report=await call(teacher,'assignmentReport',a.code);assert.equal(report.rows[0].earned,100);assert.equal(report.rows[0].roleId,role);assert.equal(report.rows[0].gameResult.roleId,role);assert.equal(report.rows[0].gameResult.bossDefeated,true);assert.equal((await call(student,'assignmentSnapshot',a.code)).score.earned,100);
 await assert.rejects(call('other','assignmentStudent',a.code,{studentId:'50101'}),/teacher/);
});
test('role and game checkpoints cannot change academic state, awards, or exceed class bounds',async()=>{
 const {a,call,student}=await fixture();const s=await call(student,'assignmentJoin',a.code,{studentId:'50102',roleId:'warden'}),g=s.run.game;
 for(const bad of [{...g,roleId:'mage'},{...g,hp:12},{...g,bossDefeated:true},{...g,skillCooldown:100},{...g,seconds:NaN},{...g,level:6}])await assert.rejects(call(student,'assignmentCheckpoint',a.code,{index:0,game:bad}));
 await call(student,'assignmentCheckpoint',a.code,{index:0,game:{...g,score:100,awards:{evil:999},index:35}});
 const after=await call(student,'assignmentSnapshot',a.code);assert.equal(after.score.earned,0);assert.equal(after.run.index,0);assert.equal(after.run.revision,0);assert.deepEqual(after.run.awards,{});assert.equal(after.run.game.roleId,'warden');
});
test('30, 35, 36 questions cover all six stages with increasing equipment',()=>{for(const total of [30,35,36]){const plan=levelPlan(total);assert.equal(plan.length,6);assert.equal(plan.at(-1).end,total);assert.deepEqual(plan.map(l=>l.items.length),[3,4,5,6,7,8]);assert.ok(Math.max(...plan.map(l=>l.count))-Math.min(...plan.map(l=>l.count))<=1);}});
test('incomplete boss is not reported as boss victory',async()=>{const {a,call,student}=await fixture(1);let s=await call(student,'assignmentJoin',a.code,{studentId:'50103',roleId:'ranger'});s=await call(student,'assignmentSubmit',a.code,{revision:s.run.revision,blockId:s.block.id,attemptId:'hero-only-answer',answer:[0]});s=await call(student,'assignmentAdvance',a.code,{revision:s.run.revision});assert.equal(s.run.gameResult.status,'completed');assert.equal(s.run.gameResult.bossDefeated,false);assert.equal(s.run.gameResult.roleId,'ranger');});
test('checkpoint accepts guardian 11 HP and rejects ranger HP above 7',()=>{assert.equal(normalizeHeroGame(initialHeroGame('warden'),'warden',1).hp,11);assert.throws(()=>normalizeHeroGame({...initialHeroGame('ranger'),hp:8},'ranger',1));});
test('historical assignment without gameVersion still reads and keeps its legacy engine and HP',async()=>{const {a}=await fixture();delete a.gameVersion;assert.equal(publicAssignment(a).gameVersion,1);assert.equal(Object.hasOwn(a,'gameVersion'),false);const r=newAssignmentRun({...a,deck:{blocks:[{id:'legacy-q'}]}},'50101','legacy-uid','seed');assert.equal(r.game.hp,8);assert.equal(r.game.roleId,undefined);});
