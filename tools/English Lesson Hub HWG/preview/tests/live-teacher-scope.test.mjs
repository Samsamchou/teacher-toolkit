import test from 'node:test';
import assert from 'node:assert/strict';
import {createTeacherScope} from '../functions/src/live-teacher-scope.mjs';
const config={schemaVersion:1,enabled:true,ownerUid:'original-owner'};
const req=(uid,action,sessionToken)=>({auth:{uid,token:{firebase:{sign_in_provider:'anonymous'}}},data:{action,sessionToken}});
const make=(value=config)=>createTeacherScope({db:{collection:name=>{
  assert.equal(name,'liveTeacherWorkspacesV2');return {doc:id=>{assert.equal(id,'primary');return{get:async()=>({data:()=>value})};}};
}},requireTeacher:async r=>{if(r.data.sessionToken!==`valid-${r.auth.uid}`)throw Error('denied');return {anonymousUid:r.auth.uid};}});
test('verified teacher browsers share stable workspace, keeping uploader auth separate',async()=>{
  for(const uid of ['chrome','safari']){
    const input=req(uid,'decks',`valid-${uid}`);const scope=await make()(input,'live');
    assert.equal(scope.request.auth.uid,'original-owner');assert.equal(scope.request.teacherUploadUid,uid);
    assert.equal(input.auth.uid,uid);assert.equal((await scope.requireTeacher(scope.request)).anonymousUid,uid);
    await assert.rejects(scope.requireTeacher({...scope.request}),/不符/);
  }
});
test('invalid, stolen, absent sessions and absent workspace fail closed',async()=>{
  for(const token of [null,'invalid','valid-other'])await assert.rejects(make()(req('student','decks',token),'live'),/denied/);
  await assert.rejects(make(null)(req('teacher','decks','valid-teacher'),'live'),/尚未完成設定/);
});
test('student join, answers, rewards and media stay on actual uid',async()=>{
  for(const action of ['join','submit','vowelTap','snapshot','rewardPlay']){
    const input=req('student',action,null);assert.equal((await make()(input,'live')).request,input);
  }
  const media=req('student','read',null);assert.equal((await make()(media,'media')).request,media);
  const input=req('teacher','join','valid-teacher');assert.equal((await make()(input,'live')).request,input);
});
test('teacher snapshots and uploads use scope only after original session verification',async()=>{
  for(const [service,action] of [['live','snapshot'],['media','begin'],['media','read'],['image',undefined]]){
    assert.equal((await make()(req('teacher',action,'valid-teacher'),service)).request.auth.uid,'original-owner');
  }
});
