import {randomBytes} from 'node:crypto'
import {initializeApp} from 'firebase-admin/app'
import {getFirestore,Timestamp,FieldPath} from 'firebase-admin/firestore'
import {getStorage} from 'firebase-admin/storage'
import {onCall,onRequest,HttpsError} from 'firebase-functions/v2/https'
import {onSchedule} from 'firebase-functions/v2/scheduler'
import {defineString,defineSecret,defineBoolean} from 'firebase-functions/params'
import {getAuth} from 'firebase-admin/auth'
import {getAppCheck} from 'firebase-admin/app-check'
import {createPortal} from './portal.mjs'
import {studentIdentity} from './portal-core.mjs'
import {GoogleGenAI} from '@google/genai'
import {DAILY_LIMIT,TEACHER_EMAIL,hash,attemptKey,isPassingScore,taipeiDay,expiryDate,identity,sentenceFor,validateProfile,validateAudio,reserveQuota,finishQuota,scoringPrompt} from './core.mjs'
import {requestAssessment,diagnostic} from './assessment-provider.mjs'
import {buildPrompt} from './prompt-engine.mjs'
import {createRoutines} from './routines.mjs'
import {createSafari} from './safari.mjs'

initializeApp()
const db=getFirestore(), bucket=()=>getStorage().bucket()
const IMAGE_KEY=defineSecret('OPENAI_API_KEY'), PIN_HASH=defineSecret('MONSTER_TEACHER_PIN_HASH')
const IMAGE_ENABLED=defineBoolean('MONSTER_IMAGE_ENABLED',{default:false})
const ORIGIN=defineString('MONSTER_ORIGIN',{default:'https://talktofriends-6b58d.web.app'})
// World Routines Trip and Safari Count are created lazily below; the portal only needs their teacher actions.
let routines, safari, safari2
export const monsterPortal=onRequest({region:'asia-east1',timeoutSeconds:540,memory:'1GiB',maxInstances:5,secrets:[IMAGE_KEY,PIN_HASH]},
  createPortal({db,bucket,Timestamp,auth:getAuth(),appCheck:getAppCheck(),pinSecret:()=>PIN_HASH.value(),imageSecret:()=>IMAGE_KEY.value(),enabled:()=>IMAGE_ENABLED.value() && process.env.FUNCTIONS_EMULATOR!=='true',origin:()=>ORIGIN.value(),
    teacherExtra:async(action,body,fail)=>(await routines.teacherAction(action,body,fail))??(await safari.teacherAction(action,body,fail))??safari2.teacherAction(action,body,fail)}))
const AI_MODEL=defineString('MONSTER_AI_MODEL',{description:'Verified, audio-capable stable Vertex Gemini model ID'})
const config={region:'asia-east1',enforceAppCheck:true,maxInstances:5,timeoutSeconds:120,memory:'512MiB'}
function uid(req){if(!req.auth)throw new HttpsError('unauthenticated','請先加入班級。');return req.auth.uid}
// Legacy teacher callables remain deployed safely but no longer accept Google claims.
function teacher(){throw new HttpsError('permission-denied','請使用新版六碼教師後台。')}
function safeInput(fn){try{return fn()}catch(e){throw new HttpsError('invalid-argument',e.message)}}
async function member(req){
  const userId=uid(req),doc=await db.doc('monster_members/'+userId).get()
  if(!doc.exists)throw new HttpsError('failed-precondition','請先加入班級。')
  const data=doc.data(),binding=await db.doc('monster_seats/'+data.studentKey).get()
  if(binding.data()?.uid!==userId)throw new HttpsError('permission-denied','裝置綁定已變更，請重新加入。')
  return {...data,uid:userId}
}
const quotaRef=(student,text,day)=>db.doc('monster_quotas/'+hash(student+':'+day+':'+text))
export const joinStudent=onCall(config,async req=>{
  const userId=uid(req),id=safeInput(()=>studentIdentity(req.data?.studentId))
  await db.runTransaction(async tx=>{
    const memberRef=db.doc('monster_members/'+userId), bindingRef=db.doc('monster_seats/'+id.studentKey)
    const [previous,binding]=await Promise.all([tx.get(memberRef),tx.get(bindingRef)])
    if(binding.exists && binding.data().uid!==userId)throw new HttpsError('already-exists','此學號已綁定另一工作階段，請老師解除綁定。')
    if(previous.exists && previous.data().studentKey!==id.studentKey) {
      const oldRef=db.doc('monster_seats/'+previous.data().studentKey),old=await tx.get(oldRef)
      if(old.data()?.uid===userId)tx.delete(oldRef)
    }
    tx.set(bindingRef,{...id,uid:userId});tx.set(memberRef,id)
  })
  return {joined:true,classId:id.classId}
})
export const teacherSession=onCall(config,req=>{teacher(req);return {email:TEACHER_EMAIL}})
export const createMonsterClass=onCall(config,async req=>{
  teacher(req)
  const classCode='M'+randomBytes(5).toString('hex').toUpperCase()
  await db.doc('monster_classes/'+classCode).create({createdAt:Timestamp.now(),active:true})
  return {classCode}
})
export const joinClass=onCall(config,async req=>{
  const userId=uid(req),id=safeInput(()=>identity(req.data?.classCode,req.data?.seat))
  await db.runTransaction(async tx=>{
    const classRef=db.doc('monster_classes/'+id.classCode),seatRef=db.doc('monster_seats/'+id.studentKey),memberRef=db.doc('monster_members/'+userId)
    const [room,seat,previous]=await Promise.all([tx.get(classRef),tx.get(seatRef),tx.get(memberRef)])
    if(!room.exists||!room.data().active)throw new HttpsError('not-found','找不到班級。')
    if(seat.exists&&seat.data().uid!==userId)throw new HttpsError('already-exists','此座號已綁定另一裝置，請老師協助。')
    if(previous.exists&&previous.data().studentKey!==id.studentKey)throw new HttpsError('failed-precondition','目前裝置已有另一座號，請先請老師解除綁定。')
    tx.set(seatRef,{uid:userId,...id});tx.set(memberRef,id)
  })
  return {joined:true}
})
export const releaseMonsterSeat=onCall(config,async req=>{
  teacher(req);const id=safeInput(()=>identity(req.data?.classCode,req.data?.seat))
  await db.runTransaction(async tx=>{
    const ref=db.doc('monster_seats/'+id.studentKey),seat=await tx.get(ref)
    if(seat.exists)tx.delete(db.doc('monster_members/'+seat.data().uid))
    tx.delete(ref)
  })
  return {released:true}
})
export const practiceStatus=onCall(config,async req=>{
  const m=await member(req),{text}=safeInput(()=>sentenceFor(req.data?.emotionId,req.data?.phraseId))
  const q=(await quotaRef(m.studentKey,text,taipeiDay()).get()).data()
  return {remaining:Math.max(0,DAILY_LIMIT-(q?.used??0))}
})
const schema={type:'OBJECT',required:['transcript','accuracy','fluency','completeness','feedback'],properties:{
  transcript:{type:'STRING'},accuracy:{type:'NUMBER'},fluency:{type:'NUMBER'},completeness:{type:'NUMBER'},feedback:{type:'STRING'},
}}
export const scoreMonsterReading=onCall(config,async req=>{
  const m=await member(req),data=req.data??{}
  if(typeof data.attemptId!=='string'||!/^[a-zA-Z0-9-]{16,64}$/.test(data.attemptId))throw new HttpsError('invalid-argument','Invalid attempt ID')
  const sentence=safeInput(()=>sentenceFor(data.emotionId,data.phraseId))
  const profile=safeInput(()=>validateProfile(data.profile,data.emotionId,data.phraseId))
  const audio=safeInput(()=>validateAudio(data.audio))
  const id=attemptKey(m.studentKey,data.attemptId),audioHash=hash(audio)
  const recordRef=db.doc('monster_records/'+id),attemptRef=db.doc('monster_attempts/'+id)
  const saved=await recordRef.get()
  if(saved.exists){
    const old=saved.data()
    if(old.audioHash!==audioHash||old.targetText!==sentence.text)throw new HttpsError('already-exists','錄音 ID 不符。')
    const status=(await quotaRef(m.studentKey,sentence.text,taipeiDay()).get()).data()
    return {...old.result,remaining:Math.max(0,8-(status?.used??0)),saved:true,attemptId:data.attemptId}
  }
  const day=taipeiDay(),qRef=quotaRef(m.studentKey,sentence.text,day)
  let result
  await db.runTransaction(async tx=>{
    const [attempt,q]=await Promise.all([tx.get(attemptRef),tx.get(qRef)])
    if(attempt.exists&&(attempt.data().audioHash!==audioHash||attempt.data().targetText!==sentence.text))throw new HttpsError('already-exists','錄音 ID 不符。')
    if(attempt.exists&&attempt.data().result){
      if(attempt.data().day!==day)throw new HttpsError('failed-precondition','這份待存錄音已跨日，請聯絡老師。')
      result=attempt.data().result
      // A scored retry keeps its reserved quota slot, without calling AI again.
      const current=q.data()??{used:0,pending:{}}
      const pending={...(current.pending??{})};pending[id]=Date.now()+180000
      if(current.used>=8)throw new HttpsError('resource-exhausted','今天此句已達 8 次。')
      tx.set(qRef,{...current,pending});return
    }
    let next
    try{next=reserveQuota(q.data(),id)}catch(e){throw new HttpsError('resource-exhausted',e.message)}
    tx.set(qRef,{...next,expiresAt:Timestamp.fromDate(expiryDate()),day})
    tx.set(attemptRef,{studentKey:m.studentKey,uid:m.uid,audioHash,targetText:sentence.text,day,createdAt:Timestamp.now(),expiresAt:Timestamp.fromDate(expiryDate())})
  })
  let scoreStage='provider'
  try{
    if(!result){
      if(process.env.FUNCTIONS_EMULATOR==='true')throw new Error('Real AI disabled in emulator; use the test adapter.')
      const ai=new GoogleGenAI({vertexai:true,project:'talktofriends-6b58d',location:'global',httpOptions:{timeout:45000,retryOptions:{attempts:1}}})
      result=await requestAssessment(()=>ai.models.generateContent({model:AI_MODEL.value(),contents:[{role:'user',parts:[{text:scoringPrompt(sentence.text)},{inlineData:{mimeType:'audio/wav',data:audio.toString('base64')}}]}],
        config:{temperature:0.1,responseMimeType:'application/json',responseSchema:schema,maxOutputTokens:2048,thinkingConfig:{thinkingBudget:0}}}))
      scoreStage='save-score'
      await attemptRef.update({result})
    }
    const expiresAt=expiryDate(),audioPath='monster-recordings/'+m.studentKey+'/'+id+'.wav'
    scoreStage='save-audio'
    await bucket().file(audioPath).save(audio,{resumable:false,contentType:'audio/wav',metadata:{metadata:{expiresAt:expiresAt.toISOString(),attemptId:id,audioHash}}})
    scoreStage='save-record'
    const response=await db.runTransaction(async tx=>{
      const [q,existing]=await Promise.all([tx.get(qRef),tx.get(recordRef)])
      if(existing.exists)return {...existing.data().result,remaining:Math.max(0,8-(q.data()?.used??0)),saved:true,attemptId:data.attemptId}
      if((q.data()?.used??0)>=8)throw new HttpsError('resource-exhausted','今天此句已達 8 次。')
      const next=finishQuota(q.data(),id,true),passed=isPassingScore(result.total_score)
      const resultData={...result,passed}
      tx.set(qRef,{...q.data(),...next})
      tx.create(recordRef,{uid:m.uid,studentKey:m.studentKey,...(m.studentId?{studentId:m.studentId,classId:m.classId}:{classCode:m.classCode,seat:m.seat}),day,
        targetText:sentence.text,profile,prompt:buildPrompt(profile),audioPath,audioHash,result:resultData,
        createdAt:Date.now(),expiresAt:Timestamp.fromDate(expiresAt)})
      tx.delete(attemptRef)
      return {...resultData,remaining:8-next.used,saved:true,attemptId:data.attemptId}
    })
    return response
  }catch(error){
    diagnostic('assessment',scoreStage,error)
    // Keep a validated score for save retry. Never turn a transport error into a practice score.
    if(!result)await db.runTransaction(async tx=>{
      const q=await tx.get(qRef)
      tx.set(qRef,{...q.data(),...finishQuota(q.data(),id,false)})
      tx.delete(attemptRef)
    })
    throw new HttpsError('unavailable',result?'評分完成但紀錄尚未保存，請重送同一錄音；不重評、不扣次。':'AI 暫時無法評分，請稍後重送；不扣次數。')
  }
})
export const listMonsterRecords=onCall(config,async req=>{
  teacher(req)
  const classCode=safeInput(()=>identity(req.data?.classCode,1)).classCode
  let query=db.collection('monster_records').where('classCode','==',classCode).orderBy('createdAt','desc').orderBy(FieldPath.documentId()).limit(25)
  if(req.data?.cursor){
    if(!/^[a-f0-9]{64}$/.test(req.data.cursor))throw new HttpsError('invalid-argument','Invalid cursor')
    const cursor=await db.doc('monster_records/'+req.data.cursor).get()
    if(!cursor.exists||cursor.data().classCode!==classCode)throw new HttpsError('invalid-argument','Invalid cursor')
    query=query.startAfter(cursor)
  }
  const snapshot=await query.get()
  return {records:snapshot.docs.map(d=>{const x=d.data();return {id:d.id,classCode:x.classCode,seat:x.seat,targetText:x.targetText,
    ...x.result,profile:x.profile,prompt:x.prompt,createdAt:x.createdAt,expiresAt:x.expiresAt.toDate().toISOString()}}),
    cursor:snapshot.size===25?snapshot.docs[24].id:null}
})
export const readMonsterRecording=onCall(config,async req=>{
  teacher(req)
  if(!/^[a-f0-9]{64}$/.test(req.data?.id??''))throw new HttpsError('invalid-argument','Invalid record')
  const record=await db.doc('monster_records/'+req.data.id).get()
  if(!record.exists||record.data().expiresAt.toMillis()<=Date.now())throw new HttpsError('not-found','錄音不存在或已到期。')
  const [audio]=await bucket().file(record.data().audioPath).download()
  return {audio:audio.toString('base64')}
})
export const purgeExpiredMonsterRecords=onSchedule({schedule:'every day 03:15',timeZone:'Asia/Taipei',region:'asia-east1',timeoutSeconds:540},async()=>{
  for(let page=0;page<20;page++) {
    const expired=await db.collection('monster_artworks').where('expiresAt','<=',Timestamp.now()).limit(100).get()
    if(expired.empty)break
    for(const doc of expired.docs) {
      await bucket().file(`monster-artworks/${doc.id}.png`).delete({ignoreNotFound:true})
      await bucket().file(`monster-artworks/${doc.id}.png.json`).delete({ignoreNotFound:true})
      await doc.ref.delete()
    }
  }
  for(const name of ['monster_teacher_sessions','monster_portal_limits','monster_image_quotas']) {
    const expired=await db.collection(name).where('expiresAt','<=',Timestamp.now()).limit(400).get()
    if(!expired.empty){const batch=db.batch();expired.docs.forEach(d=>batch.delete(d.ref));await batch.commit()}
  }
  // Delete audio first; retain failed records so a later run can retry.
  for(let page=0;page<20;page++){
    const batch=await db.collection('monster_records').where('expiresAt','<=',Timestamp.now()).limit(100).get()
    if(batch.empty)break
    for(const doc of batch.docs){await bucket().file(doc.data().audioPath).delete({ignoreNotFound:true});await doc.ref.delete()}
  }
  const attempts=await db.collection('monster_attempts').where('expiresAt','<=',Timestamp.now()).limit(400).get()
  if(!attempts.empty){
    const records=await Promise.all(attempts.docs.map(doc=>db.doc('monster_records/'+doc.id).get()))
    for(let index=0;index<attempts.docs.length;index++)if(!records[index].exists){
      const attempt=attempts.docs[index].data()
      await bucket().file(`monster-recordings/${attempt.studentKey}/${attempts.docs[index].id}.wav`).delete({ignoreNotFound:true})
    }
    const write=db.batch();attempts.docs.forEach(doc=>write.delete(doc.ref));await write.commit()
  }
  const quotas=await db.collection('monster_quotas').where('expiresAt','<=',Timestamp.now()).limit(400).get()
  if(!quotas.empty){const write=db.batch();quotas.docs.forEach(doc=>write.delete(doc.ref));await write.commit()}
})

// ---- World Routines Trip (HWG7 U04) ----
async function assessRoutine(prompt,audio,responseSchema,parse){
  if(process.env.FUNCTIONS_EMULATOR==='true')throw new Error('Real AI disabled in emulator; use the test adapter.')
  const ai=new GoogleGenAI({vertexai:true,project:'talktofriends-6b58d',location:'global',httpOptions:{timeout:45000,retryOptions:{attempts:1}}})
  let response
  for(let attempt=0;attempt<2;attempt++){
    try{response=await ai.models.generateContent({model:AI_MODEL.value(),contents:[{role:'user',parts:[{text:prompt},{inlineData:{mimeType:'audio/wav',data:audio.toString('base64')}}]}],
      config:{temperature:0.1,responseMimeType:'application/json',responseSchema,maxOutputTokens:2048,thinkingConfig:{thinkingBudget:0}}});break}
    catch(error){
      diagnostic('routines',attempt?'provider-retry':'provider',error)
      if(attempt||![429,500,502,503,504].includes(Number(error?.status??error?.code)))throw error
      await new Promise(resolve=>setTimeout(resolve,750))
    }
  }
  return parse(response.text)
}
routines=createRoutines({db,bucket,Timestamp,HttpsError,member,safeInput,assess:assessRoutine})
export const routinesState=onCall(config,req=>routines.state(req))
export const routinesAnswer=onCall(config,req=>routines.answer(req))
export const scoreRoutineSpeaking=onCall(config,req=>routines.speak(req))
export const routinesGameDone=onCall(config,req=>routines.gameDone(req))
export const purgeExpiredRoutines=onSchedule({schedule:'every day 03:40',timeZone:'Asia/Taipei',region:'asia-east1',timeoutSeconds:540},()=>routines.purge())

// ---- Safari Count (HWG5 U4, /safari-count) ----
// Same AI call as World Routines; its own collections; the daily speaking allowance is shared with World Routines.
safari=createSafari({db,bucket,Timestamp,HttpsError,member,safeInput,assess:assessRoutine})
export const safariState=onCall(config,req=>safari.state(req))
export const safariPuzzle=onCall(config,req=>safari.puzzle(req))
export const safariCount=onCall(config,req=>safari.count(req))
export const safariAnswer=onCall(config,req=>safari.answer(req))
export const scoreSafariSpeaking=onCall(config,req=>safari.speak(req))
export const safariStamp=onCall(config,req=>safari.stamp(req))
export const purgeExpiredSafari=onSchedule({schedule:'every day 03:50',timeZone:'Asia/Taipei',region:'asia-east1',timeoutSeconds:540},()=>safari.purge())

// ---- Safari Count version 2 (/safari-count-2, teacher 11/27): same animals in new stations, its own bank and records ----
safari2=createSafari({db,bucket,Timestamp,HttpsError,member,safeInput,assess:assessRoutine,version:2})
export const safari2State=onCall(config,req=>safari2.state(req))
export const safari2Puzzle=onCall(config,req=>safari2.puzzle(req))
export const safari2Count=onCall(config,req=>safari2.count(req))
export const safari2Answer=onCall(config,req=>safari2.answer(req))
export const scoreSafari2Speaking=onCall(config,req=>safari2.speak(req))
export const safari2Stamp=onCall(config,req=>safari2.stamp(req))
export const purgeExpiredSafari2=onSchedule({schedule:'every day 03:55',timeZone:'Asia/Taipei',region:'asia-east1',timeoutSeconds:540},()=>safari2.purge())
