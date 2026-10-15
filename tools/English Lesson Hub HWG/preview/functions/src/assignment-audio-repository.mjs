import {currentBlock,recordFor,attemptLimit,checkOpen,checkRevision,applyAttempt,manuallyGrade,assignmentSnapshot} from '../generated/assignment-domain.mjs';
const parse=d=>d.exists?JSON.parse(d.data().json):null;
export function assignmentAudioRepository(db,{revision,now=Date.now}={}) {
 const attempts=db.collection('lessonAssignmentAudioV1'),roots=db.collection('lessonAssignmentsV1');
 const own=(doc,uid)=>{if(!doc.exists||doc.data().uid!==uid)throw Error('沒有這份分配錄音的權限。');return doc.data();};
 return {
  async reserve(input){return db.runTransaction(async tx=>{
   const audioRef=attempts.doc(input.attemptId),old=await tx.get(audioRef);
   if(old.exists){const saved=own(old,input.uid);if(saved.expiresAt<=now())throw Error('錄音保存期限已到。');if(saved.hash!==input.hash||saved.code!==input.code||saved.blockId!==input.blockId)throw Error('錄音重送內容不一致。');if(saved.status==='manual-reviewed')throw Error('老師已處理這次錄音，請重新載入進度。');return saved;}
   const root=roots.doc(input.code),a=parse(await tx.get(root));if(!a)throw Error('找不到分配。');checkOpen(a,now());
   const member=await tx.get(root.collection('members').doc(input.uid));if(!member.exists)throw Error('請先加入分配。');
   const runRef=root.collection('runs').doc(member.data().studentId),r=parse(await tx.get(runRef));if(!r||r.uid!==input.uid)throw Error('學生進度不符。');checkRevision(r,revision);
   const b=currentBlock(a,r);if(!b||b.id!==input.blockId||b.type!=='audio')throw Error('目前不是這一題錄音。');
   const rec=recordFor(r,b.id),limit=attemptLimit(a,b);if(r.pendingAudio||rec.closed||(limit&&rec.count>=limit))throw Error('錄音次數已用完，或有待確認的評分。');
   const attemptRef=root.collection('attempts').doc(input.attemptId),existing=await tx.get(attemptRef);if(existing.exists)throw Error('作答識別碼已被使用。');
   const response=applyAttempt(a,r,b,{recording:true,mimeType:input.mimeType},input.attemptId,now(),{status:'pending',score:null,max:b.points});
   response.audioPath=`assignmentAudioV1/${input.uid}/${input.attemptId}`;
   r.pendingAudio={attemptId:input.attemptId,blockId:b.id};
   const value={...input,expiresAt:a.retentionAt,retentionAt:new Date(a.retentionAt),status:'reserved',studentId:r.studentId,targetText:b.text,focusRule:b.focusRule||'',createdAt:now()};
   tx.create(audioRef,value);tx.create(attemptRef,{uid:input.uid,studentId:r.studentId,json:JSON.stringify(response),expiresAt:new Date(a.retentionAt)});tx.update(runRef,{json:JSON.stringify(r)});
   return value;
  });},
  async claim(id,uid){return db.runTransaction(async tx=>{const ref=attempts.doc(id),a=own(await tx.get(ref),uid);if(a.status!=='reserved')return false;tx.update(ref,{status:'ai-started'});return true;});},
  async markUncertain(id,uid){return db.runTransaction(async tx=>{const ref=attempts.doc(id),a=own(await tx.get(ref),uid);if(a.status!=='complete'&&a.status!=='manual-reviewed')tx.update(ref,{status:'uncertain'});});},
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
