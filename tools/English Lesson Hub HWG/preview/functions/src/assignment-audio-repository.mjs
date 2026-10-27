import {currentBlock,recordFor,attemptLimit,checkOpen,checkRevision,applyAttempt,manuallyGrade,assignmentSnapshot} from '../generated/assignment-domain.mjs';
const parse=d=>d.exists?JSON.parse(d.data().json):null;
// Matches STALE_CLAIM_MS in live-audio.mjs: an AI call that has not finished by then is treated as failed.
const STALE_MS=5*60*1000;
const restore=(r,audio,now)=>{if(audio.prevRecord)r.records[audio.blockId]=JSON.parse(audio.prevRecord);else delete r.records[audio.blockId];r.pendingAudio=null;r.revision++;r.updatedAt=now;};
const abandoned=(audio,now)=>!audio||['uncertain','released'].includes(audio.status)||(['reserved','ai-started'].includes(audio.status)&&now-(audio.claimedAt||audio.createdAt||0)>STALE_MS);
export function assignmentAudioRepository(db,{revision:requested,now=Date.now}={}) {
 let revision=requested;
 const attempts=db.collection('lessonAssignmentAudioV1'),roots=db.collection('lessonAssignmentsV1');
 const own=(doc,uid)=>{if(!doc.exists||doc.data().uid!==uid)throw Error('沒有這份分配錄音的權限。');return doc.data();};
 return {
  async reserve(input){return db.runTransaction(async tx=>{
   const audioRef=attempts.doc(input.attemptId),old=await tx.get(audioRef);
   if(old.exists){const saved=own(old,input.uid);if(saved.expiresAt<=now())throw Error('錄音保存期限已到。');if(saved.hash!==input.hash||saved.code!==input.code||saved.blockId!==input.blockId)throw Error('錄音重送內容不一致。');if(saved.status==='manual-reviewed')throw Error('老師已處理這次錄音，請重新載入進度。');if(saved.status!=='released')return saved;}
   const root=roots.doc(input.code),a=parse(await tx.get(root));if(!a)throw Error('找不到分配。');checkOpen(a,now());
   const member=await tx.get(root.collection('members').doc(input.uid));if(!member.exists)throw Error('請先加入分配。');
   const runRef=root.collection('runs').doc(member.data().studentId),r=parse(await tx.get(runRef));if(!r||r.uid!==input.uid)throw Error('學生進度不符。');checkRevision(r,revision);
   // A new recording may replace an earlier one whose AI scoring failed or was abandoned.
   let stale=null;if(r.pendingAudio&&r.pendingAudio.attemptId!==input.attemptId){const pRef=attempts.doc(r.pendingAudio.attemptId),p=await tx.get(pRef),pa=p.exists?p.data():null;if(abandoned(pa,now())&&(!pa||pa.uid===input.uid)){stale={pRef,pa,attemptRef:root.collection('attempts').doc(r.pendingAudio.attemptId)};restore(r,pa||{blockId:r.pendingAudio.blockId,prevRecord:null},now());}}
   const b=currentBlock(a,r);if(!b||b.id!==input.blockId||b.type!=='audio')throw Error('目前不是這一題錄音。');
   const rec=recordFor(r,b.id),limit=attemptLimit(a,b);if(r.pendingAudio||rec.closed||(limit&&rec.count>=limit))throw Error('錄音次數已用完，或上一份錄音還在評分中（請等幾秒再送）。');
   const attemptRef=root.collection('attempts').doc(input.attemptId),existing=await tx.get(attemptRef);if(existing.exists)throw Error('作答識別碼已被使用。');
   const prevRecord=r.records[b.id]?JSON.stringify(r.records[b.id]):null,response=applyAttempt(a,r,b,{recording:true,mimeType:input.mimeType},input.attemptId,now(),{status:'pending',score:null,max:b.points});
   response.audioPath=`assignmentAudioV1/${input.uid}/${input.attemptId}`;
   r.pendingAudio={attemptId:input.attemptId,blockId:b.id};
   const value={...input,expiresAt:a.retentionAt,retentionAt:new Date(a.retentionAt),status:'reserved',studentId:r.studentId,targetText:b.text,focusRule:b.focusRule||'',prevRecord,createdAt:now()};
   if(stale){tx.delete(stale.attemptRef);if(stale.pa&&stale.pa.status!=='released')tx.update(stale.pRef,{status:'released',releasedAt:now()});}
   if(old.exists)tx.set(audioRef,value);else tx.create(audioRef,value);tx.create(attemptRef,{uid:input.uid,studentId:r.studentId,json:JSON.stringify(response),expiresAt:new Date(a.retentionAt)});tx.update(runRef,{json:JSON.stringify(r)});
   return value;
  });},
  async claim(id,uid){return db.runTransaction(async tx=>{const ref=attempts.doc(id),a=own(await tx.get(ref),uid);if(a.status!=='reserved')return false;tx.update(ref,{status:'ai-started',claimedAt:now()});return true;});},
  async markUncertain(id,uid){return db.runTransaction(async tx=>{const ref=attempts.doc(id),a=own(await tx.get(ref),uid);if(a.status!=='complete'&&a.status!=='manual-reviewed')tx.update(ref,{status:'uncertain'});});},
  // A failed or abandoned AI scoring gives the attempt back: the student may resend the same recording or record again.
  async release(id,uid){return db.runTransaction(async tx=>{
   const audioRef=attempts.doc(id),audio=own(await tx.get(audioRef),uid);if(['complete','manual-reviewed','released'].includes(audio.status))return false;
   const root=roots.doc(audio.code),runRef=root.collection('runs').doc(audio.studentId),attemptRef=root.collection('attempts').doc(id),r=parse(await tx.get(runRef)),attempt=await tx.get(attemptRef);
   if(r&&r.pendingAudio?.attemptId===id){const mine=r.revision===revision;restore(r,audio,now());if(mine)revision=r.revision;tx.update(runRef,{json:JSON.stringify(r)});}
   if(attempt.exists)tx.delete(attemptRef);
   tx.update(audioRef,{status:'released',releasedAt:now()});return true;
  });},
  async finalize(id,uid,result,path){return db.runTransaction(async tx=>{
   const audioRef=attempts.doc(id),audio=own(await tx.get(audioRef),uid);if(audio.status==='complete')return;if(audio.status==='manual-reviewed')throw Error('這次錄音已由教師處理。');
   const root=roots.doc(audio.code),a=parse(await tx.get(root)),runRef=root.collection('runs').doc(audio.studentId),r=parse(await tx.get(runRef)),attemptRef=root.collection('attempts').doc(id),response=parse(await tx.get(attemptRef));
   if(!a||!r||!response||r.uid!==uid||r.pendingAudio?.attemptId!==id)throw Error('錄音與學生進度不符，請教師查核。');
   const b=a.deck.blocks.find(b=>b.id===audio.blockId),value=Math.round(result.total_score/100*b.points*100)/100;
   manuallyGrade(a,r,b,response,value,now());r.pendingAudio=null;response.answer=result.transcript;response.ai=result;response.audioPath=path;
   tx.update(runRef,{json:JSON.stringify(r)});tx.update(attemptRef,{json:JSON.stringify(response)});
   tx.update(audioRef,{status:'complete',result,best:recordFor(r,b.id).best,passed:recordFor(r,b.id).closed,storagePath:path,completedAt:now()});
  });},
  async read(id,uid){return own(await attempts.doc(id).get(),uid);}
 };
}
