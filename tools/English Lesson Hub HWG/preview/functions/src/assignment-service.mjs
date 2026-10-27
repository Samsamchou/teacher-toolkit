import {isHeroes,normalizeHeroGame} from '../generated/game-heroes.mjs';
import {randomInt,randomBytes,createHash} from 'node:crypto';
import {createAssignment,publicAssignment,newAssignmentRun,currentBlock,recordFor,applyAttempt,advanceAssignment,assignmentSnapshot,feedbackFor,scoreAssignment,manuallyGrade,checkOpen,checkRevision,isStudentId} from '../generated/assignment-domain.mjs';
export const ASSIGNMENT_TEACHER_ACTIONS=['assignmentCreate','assignmentList','assignmentReport','assignmentStudent','assignmentGrade','assignmentClose','assignmentRelease','assignmentRecording','assignmentDelete','assignmentStudentDelete'];
export const ASSIGNMENT_ACTIONS=[...ASSIGNMENT_TEACHER_ACTIONS,'assignmentInfo','assignmentJoin','assignmentSnapshot','assignmentSubmit','assignmentAdvance','assignmentCheckpoint'];
const json=v=>JSON.stringify(v);
const parse=doc=>doc.exists?JSON.parse(doc.data().json):null;
export function answerHash(value){const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;return createHash('sha256').update(json(stable(value))).digest('hex');}
export function createAssignmentService({db,requireTeacher,now=Date.now,rateLimit=async()=>{},signRecording=null,readRecording=null,deleteRecording=null}) {
 const roots=db.collection('lessonAssignmentsV1');
 return async function handle(request){
  const uid=request.auth?.uid,{action,code,payload={}}=request.data||{};
  if(!uid||request.auth.token?.firebase?.sign_in_provider!=='anonymous')throw Error('請先建立匿名登入工作階段。');
  if(!ASSIGNMENT_ACTIONS.includes(action))throw Error('未知分配操作。');
  const staff=ASSIGNMENT_TEACHER_ACTIONS.includes(action);if(staff)await requireTeacher(request);
  if(['assignmentCreate','assignmentInfo','assignmentJoin'].includes(action))await rateLimit(uid,action);
  if(action==='assignmentCreate'){
   if(!/^[-\w]{8,100}$/.test(payload.requestId||'')||!/^[-\w]{1,100}$/.test(payload.deckId||''))throw Error('分配或教材識別碼無效。');
   const roster=payload.studentIds||[];if(!Array.isArray(roster)||roster.length>300||new Set(roster).size!==roster.length||roster.some(id=>!isStudentId(id)))throw Error('學號清單無效或重複。');
   const claimRef=db.collection('assignmentCreationsV1').doc(answerHash([uid,payload.requestId])),requestHash=answerHash(payload);
   for(let i=0;i<8;i++){
    const assignmentCode=String(randomInt(100000,1000000)),ref=roots.doc(assignmentCode);
    const result=await db.runTransaction(async tx=>{
     const claim=await tx.get(claimRef);
     if(claim.exists){if(claim.data().hash!==requestHash)throw Error('分配重送內容不同，請重新開始分配。');const saved=await tx.get(roots.doc(claim.data().code));if(!saved.exists)throw Error('已建立分配的資料不存在，請教師查核。');return {assignment:publicAssignment(parse(saved)),duplicate:true};}
     const [old,deckDoc]=await Promise.all([tx.get(ref),tx.get(db.collection('liveDecksV2').doc(uid+'_'+payload.deckId))]);if(old.exists)return null;
     if(!deckDoc.exists)throw Error('請先保存教材，再進行分配。');const deck=parse(deckDoc);
     if(payload.expectedVersion!==deck.version)throw Error('教材版本已變更，請重新載入。');
     const a={...createAssignment(deck,payload,uid,assignmentCode,now()),studentIds:roster};
     tx.create(ref,{ownerUid:uid,json:json(a),createdAt:now(),expiresAt:new Date(a.retentionAt)});
     tx.create(claimRef,{uid,hash:requestHash,code:assignmentCode,expiresAt:new Date(a.retentionAt)});
     return {assignment:publicAssignment(a)};
    });if(result)return result;
   }throw Error('暫時無法配置分配代碼。');
  }
  if(action==='assignmentList'){
   const docs=await roots.where('ownerUid','==',uid).limit(300).get();
   return {assignments:docs.docs.map(parse).filter(a=>a.retentionAt>now()).sort((a,b)=>b.createdAt-a.createdAt).map(publicAssignment)};
  }
  if(!/^\d{6}$/.test(code||''))throw Error('請輸入六位數分配碼。');
  const ref=roots.doc(code);
  if(action==='assignmentDelete'){
   // Permanent: only the owner, only after the assignment has ended. The root document is
   // removed last, so a failed run leaves it listed and the teacher can simply retry.
   const a=parse(await ref.get());if(!a)throw Error('找不到這份分配，可能已刪除。');if(a.ownerUid!==uid)throw Error('沒有這份分配的教師權限。');
   if(!a.closed&&a.dueAt>now())throw Error('請先結束分配，再刪除。');
   const audio=await db.collection('lessonAssignmentAudioV1').where('code','==',code).get();if(audio.docs.length&&!deleteRecording)throw Error('錄音刪除服務尚未設定，未刪除任何資料。');
   for(const doc of audio.docs){const v=doc.data();if(!/^[-\w]{1,128}$/.test(v.uid||'')||!/^[-\w]{8,100}$/.test(doc.id))throw Error('錄音識別碼無效。');await deleteRecording(`assignmentAudioV1/${v.uid}/${doc.id}`);await doc.ref.delete();}
   const claims=await db.collection('assignmentCreationsV1').where('code','==',code).get();for(const doc of claims.docs)if(doc.data().uid===uid)await doc.ref.delete();
   await db.recursiveDelete(ref);
   return {deleted:true,code,recordings:audio.docs.length};
  }
  if(action==='assignmentStudentDelete'){
   // Permanent reset of one student: the run and device binding go first so the student's
   // device is cut off at once, then that student's answers and recordings.
   const a=parse(await ref.get());if(!a)throw Error('找不到這份分配，可能已刪除。');if(a.ownerUid!==uid)throw Error('沒有這份分配的教師權限。');
   const sid=String(payload.studentId||'');if(!isStudentId(sid))throw Error('學號無效。');
   const audio=(await db.collection('lessonAssignmentAudioV1').where('code','==',code).get()).docs.filter(d=>d.data().studentId===sid);
   if(audio.length&&!deleteRecording)throw Error('錄音刪除服務尚未設定，未刪除任何資料。');
   const runRef=ref.collection('runs').doc(sid);
   const existed=await db.runTransaction(async tx=>{const r=parse(await tx.get(runRef));if(!r)return false;if(r.uid)tx.delete(ref.collection('members').doc(r.uid));tx.delete(runRef);return true;});
   const attempts=await ref.collection('attempts').where('studentId','==',sid).get();
   if(!existed&&!attempts.docs.length&&!audio.length)throw Error('這位學生還沒有作答紀錄。');
   for(const doc of audio){const v=doc.data();if(!/^[-\w]{1,128}$/.test(v.uid||'')||!/^[-\w]{8,100}$/.test(doc.id))throw Error('錄音識別碼無效。');await deleteRecording(`assignmentAudioV1/${v.uid}/${doc.id}`);await doc.ref.delete();}
   for(const doc of attempts.docs)await doc.ref.delete();
   return {deleted:true,studentId:sid,attempts:attempts.docs.length,recordings:audio.length};
  }
  if(action==='assignmentRecording'){const a=parse(await ref.get());if(!a||a.ownerUid!==uid||a.retentionAt<=now())throw Error('沒有這份錄音的教師權限。');if(!/^[-\w]{8,100}$/.test(payload.attemptId||''))throw Error('錄音識別碼無效。');const attempt=parse(await ref.collection('attempts').doc(payload.attemptId).get());if(!attempt?.audioPath||!readRecording)throw Error('錄音檔尚未備妥。');return readRecording(attempt.audioPath);}
  if(action==='assignmentReport'||action==='assignmentStudent'){
   const a=parse(await ref.get());if(!a||a.ownerUid!==uid)throw Error('沒有這份分配的教師權限。');if(a.retentionAt<=now())throw Error('保存期限已到。');
   if(action==='assignmentReport'){
    const docs=await ref.collection('runs').limit(500).get(),runs=docs.docs.map(parse),seen=new Set(runs.map(r=>r.studentId));
    const rows=runs.map(r=>({studentId:r.studentId,roleId:r.game?.roleId||null,...scoreAssignment(a,r),index:r.index,completedAt:r.completedAt,gameResult:r.gameResult||null,updatedAt:r.updatedAt}));
    for(const id of a.studentIds||[])if(!seen.has(id)){const r=newAssignmentRun(a,id,'unjoined','roster-'+id,a.createdAt);rows.push({studentId:id,...scoreAssignment(a,r),index:0,completedAt:null,updatedAt:null});}
    return {assignment:publicAssignment(a),rows};
   }
   if(!isStudentId(payload.studentId))throw Error('學號無效。');
   const run=parse(await ref.collection('runs').doc(payload.studentId).get());if(!run)return {assignment:publicAssignment(a),run:null,attempts:[],blocks:a.deck.blocks};
   const attempts=await ref.collection('attempts').where('studentId','==',payload.studentId).limit(3000).get();
   const list=attempts.docs.map(parse).sort((x,y)=>x.submittedAt-y.submittedAt||x.ordinal-y.ordinal);
   if(signRecording)for(const attempt of list)if(attempt.audioPath)attempt.recordingUrl=await signRecording(attempt.audioPath);
   return {assignment:publicAssignment(a),run,score:scoreAssignment(a,run),attempts:list,blocks:a.deck.blocks};
  }
  return db.runTransaction(async tx=>{
   const a=parse(await tx.get(ref));if(!a)throw Error('找不到這份分配。');if(a.retentionAt<=now())throw Error('保存期限已到。');
   if(staff&&a.ownerUid!==uid)throw Error('沒有這份分配的教師權限。');
   if(action==='assignmentInfo')return {assignment:publicAssignment(a),expired:a.closed||a.dueAt<=now()};
   if(action==='assignmentClose'){a.closed=true;tx.update(ref,{json:json(a)});return {assignment:publicAssignment(a)};}
   if(action==='assignmentGrade'){
    const attemptRef=ref.collection('attempts').doc(String(payload.attemptId||'')),attempt=parse(await tx.get(attemptRef));
    if(!attempt)throw Error('找不到作答紀錄。');const runRef=ref.collection('runs').doc(attempt.studentId),r=parse(await tx.get(runRef)),b=a.deck.blocks.find(b=>b.id===attempt.blockId);
    if(!r||!b)throw Error('找不到學生或題目。');if(payload.expectedRevision!==r.revision)throw Error('學生進度已變更，請重讀後再評分。');
    const audioRef=r.pendingAudio?.attemptId===attempt.attemptId?db.collection('lessonAssignmentAudioV1').doc(attempt.attemptId):null;const audioState=audioRef?await tx.get(audioRef):null;
    manuallyGrade(a,r,b,attempt,payload.score,now());if(audioRef){r.pendingAudio=null;if(audioState.exists)tx.update(audioRef,{status:'manual-reviewed'});}tx.update(runRef,{json:json(r)});tx.update(attemptRef,{json:json(attempt)});return {saved:true,revision:r.revision};
   }
   if(action==='assignmentRelease'){
    if(!isStudentId(payload.studentId))throw Error('學號無效。');const runRef=ref.collection('runs').doc(payload.studentId),r=parse(await tx.get(runRef));
    if(!r)throw Error('找不到學生。');if(r.pendingAudio)throw Error('錄音尚待確認，請先完成查核。');
    const oldUid=r.uid;r.uid=null;r.revision++;r.updatedAt=now();tx.update(runRef,{json:json(r)});if(oldUid)tx.delete(ref.collection('members').doc(oldUid));return {released:true};
   }
   const memberRef=ref.collection('members').doc(uid),member=await tx.get(memberRef);
   if(action==='assignmentJoin'){
    checkOpen(a,now());const sid=String(payload.studentId||'');if(!isStudentId(sid))throw Error('五位數學號無效。');
    if(a.studentIds?.length&&!a.studentIds.includes(sid))throw Error('此學號不在本次分配名單中。');
    if(member.exists&&member.data().studentId!==sid)throw Error('此裝置已用另一學號加入，請教師協助。');
    const runRef=ref.collection('runs').doc(sid),existing=parse(await tx.get(runRef));
    if(existing&&existing.uid&&existing.uid!==uid)throw Error('此學號已由另一裝置加入，請教師解除裝置綁定。');
    const r=existing||newAssignmentRun(a,sid,uid,randomBytes(16).toString('hex'),now(),payload.roleId||'mage');r.uid=uid;
    const b=currentBlock(a,r),lastId=b?recordFor(r,b.id).lastAttemptId:null,last=lastId?parse(await tx.get(ref.collection('attempts').doc(lastId))):null;
    tx.set(runRef,{uid,studentId:sid,json:json(r),expiresAt:new Date(a.retentionAt)});tx.set(memberRef,{uid,studentId:sid,expiresAt:new Date(a.retentionAt)});
    return assignmentSnapshot(a,r,last,now());
   }
   if(!member.exists)throw Error('請先輸入學號加入分配。');
   const runRef=ref.collection('runs').doc(member.data().studentId),r=parse(await tx.get(runRef));if(!r||r.uid!==uid)throw Error('這份進度不屬於目前裝置。');
   const b=currentBlock(a,r);
   if(action==='assignmentSnapshot'){
    const lastId=b?recordFor(r,b.id).lastAttemptId:null,last=lastId?parse(await tx.get(ref.collection('attempts').doc(lastId))):null;
    return assignmentSnapshot(a,r,last,now());
   }
   if(action==='assignmentSubmit'){
    if(!/^[-\w]{8,100}$/.test(payload.attemptId||''))throw Error('作答識別碼無效。');
    const attemptRef=ref.collection('attempts').doc(payload.attemptId),old=parse(await tx.get(attemptRef)),hash=answerHash({blockId:payload.blockId,answer:payload.answer??null});
    if(old){if(old.uid!==uid||old.answerHash!==hash)throw Error('作答重送內容衝突。');return {...assignmentSnapshot(a,r,old,now()),feedback:feedbackFor(a,r,old),duplicate:true};}
    checkOpen(a,now());checkRevision(r,payload.revision);
    if(!b||b.id!==payload.blockId)throw Error('題目已變更，請重新載入。');if(b.type==='audio')throw Error('錄音題需使用錄音提交服務。');
    const attempt=applyAttempt(a,r,b,payload.answer,payload.attemptId,now());attempt.answerHash=hash;
    tx.create(attemptRef,{uid,studentId:r.studentId,json:json(attempt),expiresAt:new Date(a.retentionAt)});tx.update(runRef,{json:json(r)});
    return {...assignmentSnapshot(a,r,attempt,now()),feedback:feedbackFor(a,r,attempt),saved:true};
   }
   if(action==='assignmentAdvance'){
    advanceAssignment(a,r,payload.revision,now());tx.update(runRef,{json:json(r)});return assignmentSnapshot(a,r,null,now());
   }
   if(action==='assignmentCheckpoint'){
    checkOpen(a,now());if(payload.index!==r.index||r.completedAt)throw Error('關卡進度已變更。');
    const value=payload.game||{};
    if(isHeroes(a)){const level=a.levels.find(l=>r.index>=l.start&&r.index<l.end)?.level||1;r.game={...normalizeHeroGame(value,r.game.roleId,level,r.game),checkpointAt:now()};tx.update(runRef,{json:json(r)});return {saved:true};}
    for(const [key,max] of [['x',960],['y',640],['hp',8],['seconds',864000],['defeated',100000],['recoveries',10000]])if(!Number.isFinite(value[key])||value[key]<0||value[key]>max)throw Error('遊戲進度格式無效。');
    r.game={...Object.fromEntries(['x','y','hp','seconds','defeated','recoveries'].map(k=>[k,value[k]])),checkpointAt:now()};tx.update(runRef,{json:json(r)});return {saved:true};
   }
   throw Error('未知分配操作。');
  });
 };
}
