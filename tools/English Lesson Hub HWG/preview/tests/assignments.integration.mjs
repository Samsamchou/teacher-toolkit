import test,{after,before} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc} from 'firebase/firestore';
import {ref,uploadBytes,getBytes} from 'firebase/storage';
import {readFile} from 'node:fs/promises';
import {createAssignmentService} from '../functions/src/assignment-service.mjs';
import {createMediaService} from '../functions/src/live-media-service.mjs';
import {newBlock} from '../src/live/domain.mjs';
import {spellDefinition} from '../src/live/spelling.mjs';
if(!process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIREBASE_STORAGE_EMULATOR_HOST)throw Error('Only run this suite in isolated Firebase emulators');
const require=createRequire(new URL('../functions/index.cjs',import.meta.url)),{initializeApp,deleteApp}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore');
const app=initializeApp({projectId:'demo-lesson-hub'},'assignment-integration'),db=getFirestore(app);let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-lesson-hub',firestore:{rules:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')},storage:{rules:await readFile(new URL('../storage.rules',import.meta.url),'utf8')}});});
after(async()=>{await env?.cleanup();await deleteApp(app);});
const teacher='assignment-teacher-test',student='assignment-student-test';let now=Date.now();const service=createAssignmentService({db,now:()=>now,requireTeacher:async req=>{if(req.auth.uid!==teacher)throw Error('teacher required');}});
const call=(uid,action,code,payload={})=>service({auth:{uid,token:{firebase:{sign_in_provider:'anonymous'}}},data:{action,code,payload}});
test('real Firestore transactions preserve first/best scores and final game outcome after service restart',async()=>{
 const deck={id:'assignment-emulator-deck',version:1,title:'Isolated emulator fixture',blocks:Array.from({length:35},(_,i)=>({...newBlock('choice','e'+i),title:'Choose cat',points:10,options:['cat','dog'],answer:[0]}))};
 await db.collection('liveDecksV2').doc(teacher+'_'+deck.id).set({json:JSON.stringify(deck)});
 const input={requestId:'emulator-create-001',deckId:deck.id,expectedVersion:1,title:'Emulator only',mode:'practice',questionOrder:'random',optionOrder:'random',game:'survivors',dueAt:now+3600000};const a=(await call(teacher,'assignmentCreate',null,input)).assignment;
 assert.equal((await call(teacher,'assignmentCreate',null,input)).assignment.code,a.code);
 let s=await call(student,'assignmentJoin',a.code,{studentId:'50101'});const sequence=[...s.run.sequence];
 const races=await Promise.allSettled(['one','two'].map(id=>call(student,'assignmentSubmit',a.code,{blockId:s.block.id,revision:s.run.revision,attemptId:'emulator-race-'+id,answer:[1]})));assert.equal(races.filter(r=>r.status==='fulfilled').length,1);
 s=await call(student,'assignmentSnapshot',a.code);assert.equal(s.run.records[s.block.id].count,1);assert.deepEqual(s.run.sequence,sequence);
 for(let i=0;i<35;i++){s=await call(student,'assignmentSubmit',a.code,{blockId:s.block.id,revision:s.run.revision,attemptId:'emulator-correct-'+i,answer:[0]});if(i===0){assert.equal(s.feedback.reward.tier,2);assert.equal(s.run.records[s.block.id].first,0);assert.equal(s.run.records[s.block.id].best,10);}await call(student,'assignmentCheckpoint',a.code,{index:s.run.index,game:{x:480,y:330,hp:8,seconds:i+1,defeated:i,recoveries:2}});s=await call(student,'assignmentAdvance',a.code,{revision:s.run.revision});}
 const restarted=createAssignmentService({db,now:()=>now,requireTeacher:async()=>{throw Error('not teacher')}}),saved=await restarted({auth:{uid:student,token:{firebase:{sign_in_provider:'anonymous'}}},data:{action:'assignmentSnapshot',code:a.code}});assert.equal(saved.score.earned,350);assert.equal(saved.run.gameResult.levelsCompleted,6);assert.equal(saved.run.gameResult.score,340);assert.equal(saved.run.gameResult.recoveries,2);
 const report=await call(teacher,'assignmentReport',a.code);assert.equal(report.rows[0].gameResult.score,340);assert.equal(report.rows[0].accuracy,100);await assert.rejects(call('other','assignmentStudent',a.code,{studentId:'50101'}),/teacher/);
 const anon=env.authenticatedContext(student,{firebase:{sign_in_provider:'anonymous'}});for(const path of [`lessonAssignmentsV1/${a.code}`,`lessonAssignmentsV1/${a.code}/runs/50101`,`lessonAssignmentsV1/${a.code}/attempts/emulator-correct-0`,'assignmentCreationsV1/forged','lessonAssignmentAudioV1/forged']){await assertFails(getDoc(doc(anon.firestore(),path)));await assertFails(setDoc(doc(anon.firestore(),path),{score:999}));}
 await assertFails(uploadBytes(ref(anon.storage(),'assignmentAudioV1/'+student+'/forged/audio'),new Uint8Array([1,2,3])));await assertFails(getBytes(ref(anon.storage(),'assignmentAudioV1/'+student+'/forged/audio')));
 now=a.dueAt+1;await assert.rejects(call('other','assignmentJoin',a.code,{studentId:'50102'}),/截止/);assert.equal((await call(student,'assignmentSnapshot',a.code)).score.earned,350);
});
test('real Firestore preserves strict spelling, phrase boundaries and mode-specific scores',async()=>{
 for(const mode of ['practice','exam']){
  const blocks=['Chinese','social studies'].map((text,i)=>({...newBlock('spell','strict-'+i),title:text,points:10,...spellDefinition(text,i===0?'c':'')}));
  const deck={id:'strict-emulator-'+mode,version:1,title:'Strict synthetic spelling',blocks};await db.collection('liveDecksV2').doc(teacher+'_'+deck.id).set({json:JSON.stringify(deck)});
  const a=(await call(teacher,'assignmentCreate',null,{requestId:'strict-emulator-'+mode,deckId:deck.id,expectedVersion:1,title:'Strict '+mode,mode,questionOrder:'sequential',optionOrder:'original',game:'none',dueAt:now+3600000})).assignment;
  let s=await call(student,'assignmentJoin',a.code,{studentId:'50102'});
  const ids=(b,text)=>{const pool=[...b.spellTiles];return [...text.replaceAll(' ','')].map(c=>pool.splice(pool.findIndex(t=>t.text===c),1)[0].id);};
  const submit=(answer,attemptId)=>call(student,'assignmentSubmit',a.code,{blockId:s.block.id,revision:s.run.revision,answer,attemptId});
  s=await submit(ids(blocks[0],'chinese'),'strict-wrong-'+mode);assert.equal(s.score.earned,0);
  s=await submit(ids(blocks[0],'Chinese'),'strict-right-'+mode);assert.equal(s.feedback.reward.points,3);
  s=await call(student,'assignmentAdvance',a.code,{revision:s.run.revision});assert.deepEqual(s.block.spellGroups,[6,7]);assert.equal(Object.hasOwn(s.block,'spellingAnswer'),false);
  s=await submit(ids(blocks[1],'social studies'),'strict-phrase-'+mode);s=await call(student,'assignmentAdvance',a.code,{revision:s.run.revision});
  const expected=mode==='practice'?20:10;assert.equal(s.score.earned,expected);assert.equal((await call(teacher,'assignmentReport',a.code)).rows.find(row=>row.studentId==='50102').earned,expected);
 }
});
test('assignment media grants only current question assets to the joined student',async()=>{
 const id='cloud-12345678-1234-1234-1234-123456789012',other='cloud-22345678-1234-1234-1234-123456789012',block={...newBlock('choice','image-q'),title:'Image question',options:['cat','dog'],answer:[0],media:[{id,kind:'image',name:'cat'}]},deck={id:'media-emulator-deck',version:1,title:'Media fixture',blocks:[block]};await db.collection('liveDecksV2').doc(teacher+'_'+deck.id).set({json:JSON.stringify(deck)});
 const a=(await call(teacher,'assignmentCreate',null,{requestId:'emulator-media-001',deckId:deck.id,expectedVersion:1,title:'Media assignment',mode:'exam',questionOrder:'sequential',optionOrder:'original',game:'none',dueAt:now+3600000})).assignment;await call(student,'assignmentJoin',a.code,{studentId:'50101'});
 for(const assetId of [id,other])await db.collection('liveMediaV2').doc(assetId).set({id:assetId,ownerUid:teacher,status:'ready',kind:'image',name:'cat',paths:{original:'test-original',playback:'test-playback'},variants:{original:{mime:'image/png'},playback:{mime:'image/webp'}}});
 const media=createMediaService({db,bucket:{file:()=>({getSignedUrl:async()=>['https://example.invalid/isolated-signed-media']})},now:()=>now,requireTeacher:async()=>{throw Error('teacher required')}});const read=(uid,assetId)=>media({auth:{uid,token:{firebase:{sign_in_provider:'anonymous'}}},data:{action:'read',id:assetId,assignmentCode:a.code}});
 assert.ok((await read(student,id)).url);await assert.rejects(read('outsider',id),/權限/);await assert.rejects(read(student,other),/本題/);
});
