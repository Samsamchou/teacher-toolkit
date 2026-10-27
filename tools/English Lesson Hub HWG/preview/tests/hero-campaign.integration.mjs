import test,{after} from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {createAssignmentService} from '../functions/src/assignment-service.mjs';import {newBlock} from '../src/live/domain.mjs';
if(!process.env.FIRESTORE_EMULATOR_HOST)throw Error('Isolated emulator required');
const require=createRequire(new URL('../functions/index.cjs',import.meta.url)),{initializeApp,deleteApp}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore');
const app=initializeApp({projectId:'demo-lesson-hub'},'heroes-campaign-emulator'),db=getFirestore(app);after(()=>deleteApp(app));
for(const [role,hp] of [['mage',8],['warden',11],['ranger',7]])test(`real Firestore six stages save ${role} and 100-point result across restart`,async()=>{
 const teacher='heroes-emulator-teacher',uid='heroes-emulator-'+role,deck={id:'heroes-deck-'+role,version:1,title:'Synthetic '+role,blocks:Array.from({length:36},(_,i)=>({...newBlock('choice','hero-q'+i),title:'Choose cat',options:['cat','dog','bird'],answer:[0],points:i<28?3:2}))};
 await db.collection('liveDecksV2').doc(teacher+'_'+deck.id).set({json:JSON.stringify(deck)});
 const make=()=>createAssignmentService({db,requireTeacher:async req=>{if(req.auth.uid!==teacher)throw Error('teacher required');}});let service=make();const call=(who,action,code,payload={})=>service({auth:{uid:who,token:{firebase:{sign_in_provider:'anonymous'}}},data:{action,code,payload}});
 const a=(await call(teacher,'assignmentCreate',null,{requestId:'emulator-heroes-'+role,deckId:deck.id,expectedVersion:1,title:'Heroes emulator',mode:'practice',questionOrder:'random',optionOrder:'random',game:'survivors',gameVersion:2,dueAt:Date.now()+3600000})).assignment;
 let s=await call(uid,'assignmentJoin',a.code,{studentId:'50101',roleId:role});assert.equal(s.run.game.hp,hp);const levels=[];
 for(let i=0;i<36;i++){
  if(i===0)for(let n=0;n<3;n++)s=await call(uid,'assignmentSubmit',a.code,{revision:s.run.revision,blockId:s.block.id,attemptId:`hero-emulator-${role}-wrong-${n}`,answer:[1]});
  s=await call(uid,'assignmentSubmit',a.code,{revision:s.run.revision,blockId:s.block.id,attemptId:`hero-emulator-${role}-right-${i}`,answer:[0]});
  const l=s.level.level;if(!levels.includes(l))levels.push(l);const bossHp=l===6?Math.max(0,260-44*(i-29)):260;
  await call(uid,'assignmentCheckpoint',a.code,{index:s.run.index,game:{...s.run.game,roleId:role,level:l,hp,seconds:i+1,defeated:i,skillUses:i,skillCooldown:5,bossHp,bossShield:l===6?0:24,bossDefeated:bossHp===0,wave:0}});
  if(i===20){service=make();const saved=await call(uid,'assignmentJoin',a.code,{studentId:'50101',roleId:role==='mage'?'warden':'mage'});assert.equal(saved.run.game.roleId,role);assert.equal(saved.run.game.skillCooldown,5);}
  s=await call(uid,'assignmentAdvance',a.code,{revision:s.run.revision});
 }
 assert.deepEqual(levels,[1,2,3,4,5,6]);assert.equal(s.score.earned,100);assert.equal(s.run.gameResult.bossDefeated,true);assert.equal(s.run.gameResult.roleId,role);service=make();const report=await call(teacher,'assignmentReport',a.code);assert.equal(report.rows[0].accuracy,100);assert.equal(report.rows[0].gameResult.roleId,role);assert.equal((await call(uid,'assignmentSnapshot',a.code)).run.gameResult.levelsCompleted,6);
});
