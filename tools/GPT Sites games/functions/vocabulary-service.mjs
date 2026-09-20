import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createActivityService} from './vocabulary-base.mjs';
import {requireValue,publicRoom,teacherRoom,validateStrokes,stageNext} from './vocabulary-model.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const now=()=>new Date().toISOString();
const unpack=d=>d?{...d,strokes:d.strokesJson?JSON.parse(d.strokesJson):d.strokes||[]}:null;
const pack=d=>{const {strokes,...rest}=d;return {...rest,strokesJson:JSON.stringify(strokes||[])};};
const clean=s=>{requireValue(typeof s==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(s),'Invalid identifier.');return s;};
const studentActions=new Set(['join','studentState','studentImage','draw','submit','studentDrawing']);
export function createVocabularyService({db,bucket,verifyTeacher}){
 const base=createActivityService({db,bucket,verifyTeacher});
 const ref=id=>db.doc(`vocabularyRooms/${clean(id)}`);
 const drawingRef=(room,group,q)=>db.doc(`vocabularyRooms/${clean(room)}/drawings/${q}-${clean(group)}`);
 async function room(id){const s=await ref(id).get();requireValue(s.exists,'Activity removed.',404,'ROOM_REMOVED');return s.data();}
 function auth(r,b){const g=r.groups[b.groupId];requireValue(g&&typeof b.token==='string','Please rejoin.',403,'LOGIN_INVALID');requireValue(g.login?.status!=='released','Please rejoin your group.',403,'LOGIN_REVOKED');requireValue(hash(b.token)===(g.login?.tokenHash||g.tokenHash),'Please rejoin.',403,'LOGIN_INVALID');return g;}
 async function drawingList(id,q){const collection=ref(id).collection('drawings');const snap=await (q===undefined?collection:collection.where('questionIndex','==',q)).get();return snap.docs.map(d=>({...unpack(d.data()),key:d.id})).filter(d=>q===undefined||d.questionIndex===q);}
 async function enrich(result,b,teacher){if(!result?.room)return result;const r=result.room;if(teacher){const drawings=await drawingList(r.id,b.reviewIndex??r.questionIndex);r.drawings=drawings.map(({strokes,strokesJson,...d})=>d);}else{const d=await drawingRef(r.id,b.groupId||result.groupId,r.questionIndex).get();r.drawing=d.exists?((({strokes,strokesJson,...x})=>x)(d.data())):null;}return result;}
 async function ensureTemplate(){const f=bucket.file('vocabulary-images/default-whiteboard');if(!(await f.exists())[0])await f.save(await readFile(new URL('./vocabulary-assets/default-whiteboard.jpg',import.meta.url)),{resumable:false,metadata:{contentType:'image/jpeg',cacheControl:'private, max-age=0'}});await db.doc('vocabularyTemplates/default-whiteboard').set({id:'default-whiteboard',name:'翰林國小英語小白板'});}
 function snapshot(value){requireValue(typeof value==='string'&&/^data:image\/(png|webp);base64,/.test(value)&&value.length<=350000,'Answer image missing or too large.');const [head,data]=value.split(','),bytes=Buffer.from(data,'base64');requireValue(bytes.length>30&&(head.includes('png')?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes.subarray(0,4).toString()==='RIFF'),'Invalid answer image.');return {bytes,type:head.includes('png')?'image/png':'image/webp'};}
 async function archive(r){
  const docs=await drawingList(r.id);
  for(const d of docs){if(d.archivePath)continue;const {bytes,type}=snapshot(d.snapshot),sha=hash(bytes),path=`vocabulary-answers/${r.id}/${d.key}-${sha}`;const f=bucket.file(path);await f.save(bytes,{resumable:false,metadata:{contentType:type,cacheControl:'private, max-age=0'}});requireValue(hash((await f.download())[0])===sha,'Snapshot verification failed. Retry ending.',503);await drawingRef(r.id,d.groupId,d.questionIndex).update({archivePath:path,sha256:sha,archivedAt:now()});}
  // All snapshots must exist before deleting any replay data. Closing blocks new writes.
  const fresh=await drawingList(r.id);for(const d of fresh){requireValue(d.archivePath,'Snapshot not yet saved.',503);const {strokes,strokesJson,snapshot:preview,...saved}=d;await drawingRef(r.id,d.groupId,d.questionIndex).set(saved);}
  return db.runTransaction(async tx=>{const s=await tx.get(ref(r.id));const value=s.data();if(value.phase!=='ended'){value.phase='ended';value.endedAt=now();value.revision++;tx.set(ref(r.id),value);}return value;});
 }
 return async(b,authorization)=>{
  requireValue(b&&typeof b.action==='string','Choose an action.');if(!studentActions.has(b.action))await verifyTeacher(authorization);
  if(b.action==='seed'){
   await ensureTemplate();const id='sf1-u01-20260920',dref=db.doc(`vocabularyDecks/${id}`),found=await dref.get();if(found.exists)return {deck:found.data()};const names=['Mike','Ken','Emma','Wendy','Alan'],files=['01_Mike.jpg','03_Ken.jpg','05_Emma.jpg','07_Wendy.jpg','09_Alan.jpg'],questions=[];
   for(let i=0;i<names.length;i++){const imageId=`sf1-u01-${names[i]}`;await bucket.file(`vocabulary-images/${imageId}`).save(await readFile(new URL(`./vocabulary-assets/${files[i]}`,import.meta.url)),{resumable:false,metadata:{contentType:'image/jpeg',cacheControl:'private, max-age=0'}});questions.push({imageId,options:[names[i],names[(i+1)%5],names[(i+2)%5]],correctIndex:0,templateId:'default-whiteboard',templateOverride:false});}
   await db.runTransaction(async tx=>{const old=await tx.get(dref);if(!old.exists)tx.create(dref,{id,name:'SF1 U01｜五題單字圖卡',templateId:'default-whiteboard',questions,version:1,updatedAt:now()});});return {deck:(await dref.get()).data()};
  }
  if(b.action==='listTemplates'){await ensureTemplate();return {templates:(await db.collection('vocabularyTemplates').get()).docs.map(x=>x.data())};}
  if(b.action==='saveTemplate'){requireValue(typeof b.name==='string'&&b.name.trim()&&b.name.length<=100,'請輸入模板名稱。');const value=await base({...b,action:'uploadImage'},authorization);await db.doc(`vocabularyTemplates/${value.imageId}`).set({id:value.imageId,name:b.name.trim()});return value;}
  if(b.action==='saveDeck'){await ensureTemplate();for(const q of b.deck?.questions||[]){const id=clean(q.templateId||b.deck.templateId||'default-whiteboard');requireValue((await bucket.file(`vocabulary-images/${id}`).exists())[0],'模板不存在。');}return base(b,authorization);}
  if(b.action==='drawing'||b.action==='studentDrawing'||b.action==='answerImage'){
   const r=await room(b.roomId);if(b.action==='studentDrawing'){auth(r,b);requireValue(b.questionIndex===r.questionIndex,'Question locked.',409);}
   requireValue(Number.isInteger(b.questionIndex)&&b.questionIndex>=0&&b.questionIndex<r.questions.length,'Invalid question.');const snap=await drawingRef(r.id,b.groupId,b.questionIndex).get();const d=snap.exists?unpack(snap.data()):null;
   if(b.action==='answerImage'){requireValue(d?.archivePath,'Answer not found.',404);const f=bucket.file(d.archivePath);return {base64:(await f.download())[0].toString('base64'),type:(await f.getMetadata())[0].contentType};}return {drawing:d};
  }
  if(['draw','submit','score','return'].includes(b.action)){
   const rref=ref(b.roomId);let strokes,image;if(['draw','submit'].includes(b.action)){strokes=validateStrokes(b.strokes);image=snapshot(b.snapshot);requireValue(Number.isInteger(b.seq)&&b.seq>=1,'Invalid sequence.');requireValue(JSON.stringify(strokes).length<650000,'筆跡過大，請減少筆畫。');}
   const result=await db.runTransaction(async tx=>{
    const rs=await tx.get(rref);requireValue(rs.exists,'Activity removed.',404,'ROOM_REMOVED');const r=rs.data(),g=studentActions.has(b.action)?auth(r,b):r.groups[b.groupId];requireValue(g,'Group not found.',404);
    requireValue(Number.isInteger(b.questionIndex)&&b.questionIndex>=0&&b.questionIndex<r.questions.length,'Invalid question.');const dref=drawingRef(r.id,g.id,b.questionIndex),ds=await tx.get(dref);const d=ds.exists?unpack(ds.data()):{groupId:g.id,questionIndex:b.questionIndex,epoch:0,seq:0,status:'draft',strokes:[]};
    if(b.action==='submit'&&d.submitId===b.submitId&&d.status!=='draft')return {room:publicRoom(r,g.id),drawing:d};
    if(b.action==='score'&&g.scores?.[b.questionIndex]?.requestId===b.requestId)return {room:teacherRoom(r)};
    if(b.action==='return'&&d.returnId===b.requestId)return {room:teacherRoom(r)};
    requireValue(r.phase==='open'&&r.questionIndex===b.questionIndex,'This question is locked.',409,'QUESTION_LOCKED');requireValue(!g.scores?.[b.questionIndex],'Already scored. This question is locked.',409);
    if(b.action==='draw'||b.action==='submit'){
     requireValue(d.status==='draft'&&d.epoch===(b.epoch||0),'Answer locked or returned. Reload the latest drawing.',409,'DRAWING_CHANGED');
     if(b.seq<d.seq){requireValue(b.action!=='submit','A newer drawing is saved. Reload before submitting.',409,'DRAWING_CHANGED');return {room:publicRoom(r,g.id),drawing:d};}
     if(b.seq===d.seq&&b.action==='draw')return {room:publicRoom(r,g.id),drawing:d};
     if(b.action==='submit'){requireValue(strokes.some(x=>x.tool==='pen'),'Write an answer first.');clean(b.submitId);}
     requireValue(JSON.stringify(strokes).length+b.snapshot.length<800000,'筆跡儲存已滿，請減少筆畫。');const value={...d,seq:b.seq,strokes,snapshot:b.snapshot,updatedAt:now(),status:b.action==='submit'?'submitted':'draft',...(b.action==='submit'?{submitId:b.submitId,submittedAt:now()}:{})};tx.set(dref,pack(value));return {room:publicRoom(r,g.id),drawing:value};
    }
    requireValue(d.status==='submitted','Wait for the group to submit.',409);clean(b.requestId);
    if(b.action==='return'){tx.set(dref,pack({...d,status:'draft',epoch:d.epoch+1,seq:0,returnId:b.requestId,submitId:null,returnedAt:now()}));}
    else {requireValue(Number.isInteger(b.score)&&b.score>=1&&b.score<=5,'Choose 1–5 points.');g.scores??={};g.scores[b.questionIndex]={score:b.score,status:'scored',at:now(),requestId:b.requestId};tx.set(rref,r);tx.set(dref,pack({...d,status:'scored',score:b.score}));}
    return {room:teacherRoom(r)};
   });return result;
  }
  if(b.action==='next'||b.action==='end'){
   let r=await room(b.roomId);if(r.phase==='ended')return {room:teacherRoom(r)};if(r.phase==='closing')return {room:teacherRoom(await archive(r))};
   r=await db.runTransaction(async tx=>{const s=await tx.get(ref(b.roomId));requireValue(s.exists,'Activity removed.',404,'ROOM_REMOVED');let r=s.data();requireValue(r.revision===b.revision,'Activity changed. Please retry.',409);requireValue(['preview','open'].includes(r.phase),'Activity is ending.',409);
    if(r.phase==='open'){
     const incomplete=Object.values(r.groups).filter(g=>!g.scores?.[r.questionIndex]);requireValue(!incomplete.length||b.confirmIncomplete,'部分小組尚未完成評分，請確認後繼續。',409,'INCOMPLETE_GROUPS');
     const ds=await Promise.all(incomplete.map(g=>tx.get(drawingRef(r.id,g.id,r.questionIndex))));incomplete.forEach((g,i)=>{g.scores??={};g.scores[r.questionIndex]={score:0,status:ds[i].data()?.status==='submitted'?'ungraded':'unanswered',at:now()};});
    }
    const finish=b.action==='end'||(r.phase==='open'&&r.questionIndex===r.questions.length-1);
    r=finish?{...r,phase:'closing',reviewIndex:r.questionIndex,revision:r.revision+1}:stageNext(r);tx.set(ref(r.id),r);return r;
   });if(r.phase==='closing')r=await archive(r);return {room:teacherRoom(r)};
  }
  if(b.action==='deleteRoom'){const r=await room(b.roomId);requireValue(r.phase==='ended','End activity before deleting.',409);const docs=await ref(r.id).collection('drawings').get();for(const d of docs.docs)await d.ref.delete();await bucket.deleteFiles({prefix:`vocabulary-answers/${r.id}/`});await ref(r.id).delete();return {deleted:true};}
  if(b.action==='studentState'){const r=await room(b.roomId);auth(r,b);return enrich({room:publicRoom(r,b.groupId)},b,false);}
  if(b.action==='teacherState')return enrich({room:teacherRoom(await room(b.roomId))},b,true);
  const result=await base(b,authorization);return b.action==='join'?enrich(result,b,false):result;
 };
}
