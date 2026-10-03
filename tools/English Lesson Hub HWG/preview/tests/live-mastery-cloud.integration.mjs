import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createLiveService} from '../functions/src/live-service.mjs';
import {newBlock} from '../src/live/domain.mjs';
import {parityBlock} from '../src/live/parity.mjs';
if(!/^(localhost|127\.0\.0\.1):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || ''))throw new Error('Local Firestore emulator required; production access refused');
const require=createRequire(new URL('../functions/index.cjs',import.meta.url));
const {initializeApp,deleteApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
test('mastery retries persist as one response, stay private, and never grant a game before full correctness',async()=>{
  const app=initializeApp({projectId:'demo-lesson-hub'},'mastery-'+crypto.randomUUID());
  const db=getFirestore(app),teacher='mastery-teacher-'+crypto.randomUUID();let time=Date.now();
  const service=createLiveService({db,now:()=>time++,requireTeacher:async r=>{if(r.auth.uid!==teacher)throw new Error('teacher only');}});
  const call=(uid,action,code,payload={})=>service({auth:{uid,token:{firebase:{sign_in_provider:'anonymous'}}},data:{action,code,payload}});
  let code;
  try{
    const b=parityBlock(newBlock('multiselect','q1'));b.points=6;b.seconds=1;
    let r=await call(teacher,'create',null,{deck:{id:'mastery-deck',title:'Mastery QA',blocks:[b]}});code=r.code;
    await call('alice','join',code,{studentId:'50101'});await call('bob','join',code,{studentId:'50102'});
    r=await call(teacher,'control',code,{action:'open',revision:r.revision});time+=5000;
    const input=answer=>({attemptId:crypto.randomUUID(),blockId:'q1',revision:r.revision,answer});
    let latest, firstRetry;
    for(let i=0;i<25;i++){
      const payload=input([1,2,0]);latest=await call('alice','submit',code,payload);
      firstRetry ||= payload;
      assert.equal(latest.reward.eligible,false);assert.equal(latest.reward.earned,0);assert.equal(latest.feedback.outcome,'partial');assert.equal(latest.responses.length,1);
      assert.deepEqual((await call('alice','submit',code,payload)).feedback,latest.feedback);
    }
    assert.equal(latest.responses[0].attemptNumber,25);
    const delayed=await call('alice','submit',code,firstRetry);assert.equal(delayed.responses[0].attemptNumber,25);assert.equal(delayed.feedback,undefined);
    await assert.rejects(call('bob','submit',code,firstRetry),/已被使用/);
    assert.equal((await db.collection('liveRoomsV2').doc(code).collection('responses').where('uid','==','alice').get()).size,1);
    assert.equal((await call('bob','snapshot',code)).responses.length,0);
    const reloaded=await call('alice','snapshot',code);assert.deepEqual(reloaded.responses[0].answer,[1,2,0]);assert.equal(reloaded.responses[0].grade.score,undefined);assert.equal(reloaded.feedback,undefined);
    const turn={turnId:'forged-turn',revision:r.revision,blockId:'q1',walletVersion:0};await assert.rejects(call('alice','rewardPlay',code,turn));
    const correct=input([1,2,3]);const won=await call('alice','submit',code,correct);assert.equal(won.feedback.outcome,'full');assert.equal(won.reward.earned,2);assert.equal(won.responses[0].attemptNumber,26);
    assert.deepEqual((await call('alice','submit',code,correct)).feedback,won.feedback);await assert.rejects(call('alice','submit',code,input([1,2,3])));
    const classReport=await call(teacher,'report',code);const row=classReport.report.find(s=>s.studentId==='50101');assert.equal(row.score,6);assert.equal(row.submitted,1);
    await call('bob','submit',code,input([0]));r=await call(teacher,'control',code,{action:'lock',revision:r.revision});await assert.rejects(call('bob','submit',code,{...input([1,2,3]),revision:r.revision}));
  }finally{if(code)await db.recursiveDelete(db.collection('liveRoomsV2').doc(code));await db.terminate();await deleteApp(app);}
});
