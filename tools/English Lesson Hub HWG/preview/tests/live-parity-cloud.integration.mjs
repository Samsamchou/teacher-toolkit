import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createLiveService} from '../functions/src/live-service.mjs';
import {newBlock} from '../src/live/domain.mjs';
import {parityBlock} from '../src/live/parity.mjs';
if(!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST||''))throw new Error('Local emulator required; production refused');
const require=createRequire(new URL('../functions/index.cjs',import.meta.url));
const {initializeApp,deleteApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
test('new parity model persists through real Firestore service transactions, grading, redaction and reports',async()=>{
  const app=initializeApp({projectId:'demo-lesson-hub'},'parity-'+Date.now());
  const db=getFirestore(app),teacher='qa-parity-'+crypto.randomUUID();
  let time=Date.now();
  const service=createLiveService({db,now:()=>time++,requireTeacher:async request=>{if(request.auth.uid!==teacher)throw new Error('teacher only');}});
  const call=(uid,action,code,payload={})=>service({auth:{uid,token:{firebase:{sign_in_provider:'anonymous'}}},data:{action,code,payload}});
  try {
    const image='cloud-'+crypto.randomUUID();
    await db.collection('liveMediaV2').doc(image).set({ownerUid:teacher,status:'ready'});
    const types=['slide','choice','blank','drag','label','hotspot','draw','order','category','dropdown','cloud','open'];
    const blocks=types.map(type=>{const q=parityBlock(newBlock(type));q.seconds=0;if(q.background){q.media=[{id:image,kind:'image'}];q.background={assetId:image,alt:'QA image'};}return q;});
    const deck={id:crypto.randomUUID(),title:'Synthetic cloud parity QA',blocks};
    const saved=await call(teacher,'saveDeck',null,{deck,expectedVersion:0});
    assert.deepEqual((await call(teacher,'decks')).decks.find(d=>d.id===deck.id).blocks,blocks);
    let room=await call(teacher,'create',null,{deck:saved.deck});const code=room.code,uid='qa-student-'+crypto.randomUUID();
    await call(uid,'join',code,{studentId:'50101'});
    for(let index=1;index<blocks.length;index++){
      const q=blocks[index];room=await call(teacher,'control',code,{action:'move',index,revision:room.revision});room=await call(teacher,'control',code,{action:'open',revision:room.revision});
      const s=await call(uid,'snapshot',code);assert.equal(s.block.answer,undefined);assert.equal(s.block.mapping,undefined);assert.equal(s.block.migration,undefined);
      const answer=({choice:[0],blank:{b1:'bike'},drag:{b1:'bike'},label:{a1:'l1'},hotspot:['r1'],draw:[{color:'#123456',width:6,points:[[10,10],[30,40]]}],order:q.items,category:q.mapping,dropdown:{b1:'bike'},cloud:'bike',open:'🚲'.repeat(200)})[q.type];
      const input={attemptId:crypto.randomUUID(),blockId:q.id,revision:room.revision,answer};
      if(q.type==='open')await assert.rejects(call(uid,'submit',code,{...input,answer:'🚲'.repeat(201)}),/200/);
      await call(uid,'submit',code,input);await call(uid,'submit',code,input);
      const snap=await call(teacher,'snapshot',code);const r=snap.responses.find(r=>r.attemptId===input.attemptId);assert.deepEqual(r.answer,answer);assert.equal(r.grade.scoringVersion,'parity-1');
      if(['draw','open'].includes(q.type))room=await call(teacher,'control',code,{action:'grade',revision:room.revision,attemptId:input.attemptId,score:1,pass:true});
      if(q.type==='cloud'){
        const uid2='qa-second-'+crypto.randomUUID();await call(uid2,'join',code,{studentId:'50102'});await call(uid2,'submit',code,{...input,attemptId:crypto.randomUUID(),answer:'Bike'});
        assert.equal((await call(uid,'snapshot',code)).wordCloud,null);
        room=await call(teacher,'control',code,{action:'reveal',revision:room.revision});
        const view=await call(uid,'snapshot',code);assert.deepEqual(view.wordCloud,[{text:'bike',count:2}]);assert.ok(view.responses.every(r=>r.uid===uid));
      }
    }
    const report=(await call(teacher,'report',code)).report.find(r=>r.studentId==='50101');assert.equal(report.submitted,11);assert.equal(report.pending,0);assert.equal(report.score,10);assert.equal(report.max,10);assert.equal(report.details.length,11);
    await assert.rejects(call(uid,'report',code),/teacher only/);
  } finally {await deleteApp(app);}
});
