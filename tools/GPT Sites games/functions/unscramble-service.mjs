import {randomBytes,createHash,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {ActivityError,requireValue,members,sameMembers,validateDeck,evaluate,stageNext,publicRoom,teacherRoom} from './unscramble-model.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const id=()=>randomBytes(12).toString('hex');
const time=()=>new Date().toISOString();
const seedRelations=['sister','sister','father','mother','grandmother','brother','mother'];
const cleanId=x=>{requireValue(typeof x==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(x),'Invalid activity identifier.');return x;};
export function createActivityService({db,bucket,verifyTeacher}){
 const deckRef=x=>db.doc(`liveDecks/${cleanId(x)}`),roomRef=x=>db.doc(`liveRooms/${cleanId(x)}`);
 async function getRoom(roomId){const s=await roomRef(roomId).get();requireValue(s.exists,'Activity not found or removed.',404,'ROOM_REMOVED');return s.data();}
 const nonceHash=value=>hash(`nonce:${value}`);
 const loginToken=(roomId,groupId,joinNonce,version)=>hash(`login:${roomId}:${groupId}:${joinNonce}:${version}`);
 const uniqueHashes=values=>[...new Set(values.filter(value=>typeof value==='string'&&value))];
 const revokedNonceHashes=login=>uniqueHashes([...(Array.isArray(login?.revokedJoinNonceHashes)?login.revokedJoinNonceHashes:[]),login?.previousJoinNonceHash]);
 const revokedTokenHashes=(login,legacyTokenHash=null)=>uniqueHashes([...(Array.isArray(login?.revokedTokenHashes)?login.revokedTokenHashes:[]),login?.previousTokenHash,legacyTokenHash]);
 function student(room,b){
  const g=room.groups[b.groupId];requireValue(g,'This group is not in the activity.',403,'LOGIN_INVALID');
  requireValue(typeof b.token==='string','Please rejoin this activity.',403,'LOGIN_INVALID');
  if(g.login){
   requireValue(g.login.status==='active','Your teacher released this group login. Rejoin with the same student numbers.',403,'LOGIN_REVOKED');
   requireValue(hash(b.token)===g.login.tokenHash,'This group login is no longer valid. Rejoin with the same student numbers.',403,'LOGIN_INVALID');
  }else requireValue(hash(b.token)===g.tokenHash,'This group login is no longer valid. Ask your teacher to release it before rejoining.',403,'LOGIN_INVALID');
  return g;
 }
 async function imageSave(bytes,type,imageId=id(),folder='live-images'){
  requireValue(['image/png','image/jpeg','image/webp'].includes(type)&&bytes.length>0&&bytes.length<=6*1024*1024,'Use a PNG, JPG or WebP smaller than 6 MB.');
  const magic=type==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):type==='image/jpeg'?bytes[0]===255&&bytes[1]===216:bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
  requireValue(magic,'The image file does not match its format.');
  await bucket.file(`${folder}/${imageId}`).save(bytes,{resumable:false,metadata:{contentType:type,cacheControl:'private, max-age=0'}});return imageId;
 }
 return async function handle(b,authorization){
  requireValue(b&&typeof b.action==='string','Choose an activity action.');
  const studentActions=['join','studentState','submit','studentImage'];
  if(!studentActions.includes(b.action))await verifyTeacher(authorization);
  switch(b.action){
   case 'listDecks': return {decks:(await db.collection('liveDecks').get()).docs.map(d=>d.data()).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))};
   case 'seed':{
    const ref=deckRef('family-20260915');const found=await ref.get();if(found.exists)return {deck:found.data()};
    const questions=[];for(let i=1;i<=7;i++){
     const imageId=`family-20260915-${i}`;await imageSave(await readFile(new URL(`./unscramble-assets/${i}.png`,import.meta.url)),'image/png',imageId);
     const he=i===3||i===6;questions.push({imageId,prompt:`Who's ${he?'he':'she'}?`,answer:`${he?"He's":"She's"} my ${seedRelations[i-1]}.`});
    }
    const deck={id:ref.id,name:'家人句型｜七題示範',questions,updatedAt:time(),version:1};
    await db.runTransaction(async tx=>{const existing=await tx.get(ref);if(!existing.exists)tx.create(ref,deck);});return {deck:(await ref.get()).data()};
   }
   case 'uploadImage': {
    const bytes=Buffer.from(b.base64||'','base64'),thumbnail=b.thumbnail;
    const imageId=thumbnail?'opt-'+hash(Buffer.concat([bytes,Buffer.from(thumbnail.base64||'','base64')])):id();
    // Immutable content-addressed derivatives never replace an original object.
    if(thumbnail)await imageSave(Buffer.from(thumbnail.base64||'','base64'),thumbnail.type,imageId,'live-thumbnails');
    await imageSave(bytes,b.type,imageId);return {imageId};
   }
   case 'optimizeDeckImages': {
    const ref=deckRef(b.deckId),snap=await ref.get();requireValue(snap.exists,'Question set not found.',404);
    const old=snap.data();requireValue(old.version===b.version,'This set changed. Preview it again.',409);
    requireValue(b.replacements&&typeof b.replacements==='object'&&!Array.isArray(b.replacements),'Missing image replacements.');
    const sources=[...new Set(old.questions.map(q=>q.imageId))];
    requireValue(Object.keys(b.replacements).length===sources.length,'Preview every image before updating.');
    const backupImages={};
    for(const source of sources){
     const target=cleanId(b.replacements[source]);requireValue(target.startsWith('opt-'),'Use an optimized image copy.');
     const checks=await Promise.all([bucket.file(`live-images/${source}`).exists(),bucket.file(`live-images/${target}`).exists(),bucket.file(`live-thumbnails/${target}`).exists()]);
     requireValue(checks.every(([exists])=>exists),'A picture is missing; the original question set is unchanged.');
     const file=bucket.file(`live-images/${source}`),[original]=await file.download(),digest=hash(original),backupPath=`live-image-backups/${digest}`;
     if(!(await bucket.file(backupPath).exists())[0])await file.copy(bucket.file(backupPath));
     const [readback]=await bucket.file(backupPath).download();requireValue(hash(readback)===digest,'Original backup could not be verified.',503);
     backupImages[source]={path:backupPath,sha256:digest,bytes:original.length};
    }
    const backupRef=db.doc(`liveDeckImageBackups/${ref.id}-v${old.version}`);
    return await db.runTransaction(async tx=>{
     const current=await tx.get(ref);requireValue(current.exists&&current.data().version===b.version,'This set changed. Preview it again.',409);
     const backup=await tx.get(backupRef);requireValue(!backup.exists,'This version already has a backup. Reopen the set.',409);
     const previous=current.data(),deck={...previous,questions:previous.questions.map(q=>({...q,imageId:b.replacements[q.imageId]})),version:previous.version+1,updatedAt:time()};
     tx.create(backupRef,{deck:previous,createdAt:time(),replacements:b.replacements,backupImages,originalsRetained:true});tx.set(ref,deck);
     return {deck,backupId:backupRef.id};
    });
   }
   case 'image': case 'studentImage':{
    cleanId(b.imageId);
    if(b.action==='studentImage'){const room=await getRoom(b.roomId);student(room,b);requireValue(room.questions[room.questionIndex].imageId===b.imageId,'That picture is not active.',403);}
    let file=bucket.file(`live-images/${b.imageId}`);if(b.variant==='thumbnail'){const thumbnail=bucket.file(`live-thumbnails/${b.imageId}`);if((await thumbnail.exists())[0])file=thumbnail;}const [data]=await file.download();const [meta]=await file.getMetadata();return {base64:data.toString('base64'),type:meta.contentType};
   }
   case 'saveDeck':{
    const content=validateDeck(b.deck);const ref=deckRef(b.deck.id||id());
    for(const q of content.questions){const [exists]=await bucket.file(`live-images/${q.imageId}`).exists();requireValue(exists,'One of the pictures is missing.');}
    const deck=await db.runTransaction(async tx=>{const old=await tx.get(ref);requireValue(!old.exists||old.data().version===b.deck.version,'This set changed in another tab. Reopen it before editing.',409);const value={...content,id:ref.id,updatedAt:time(),version:(old.data()?.version||0)+1};tx.set(ref,value);return value;});return {deck};
   }
   case 'createRoom':{
    const d=await deckRef(b.deckId).get();requireValue(d.exists,'Choose a saved question set.');
    requireValue(typeof b.className==='string'&&b.className.trim()&&b.className.length<=100,'Enter a class name.');
    requireValue(Number.isInteger(b.maxGroups)&&b.maxGroups>=2&&b.maxGroups<=15,'Choose 2–15 groups.');
    const roomId=randomBytes(8).toString('hex').toUpperCase(),deck=d.data();
    const room={id:roomId,title:deck.name,className:b.className.trim(),deckId:deck.id,questions:deck.questions,createdAt:time(),phase:'preview',questionIndex:0,reviewIndex:null,revision:0,maxGroups:b.maxGroups,groups:{},showAnswers:true};
    await roomRef(roomId).create(room);return {room:teacherRoom(room)};
   }
   case 'listRooms': return {rooms:(await db.collection('liveRooms').get()).docs.map(d=>{const r=d.data();return {id:r.id,title:r.title,className:r.className,createdAt:r.createdAt,phase:r.phase,groups:Object.keys(r.groups).length,questionCount:r.questions.length};}).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))};
   case 'teacherState': return {room:teacherRoom(await getRoom(b.roomId))};
   case 'studentState':{const room=await getRoom(b.roomId);student(room,b);return {room:publicRoom(room,b.groupId)};}
   case 'join':{
    const ids=members(b.members);requireValue(b.members.length<=60000,'Student number entry is too large.');
    requireValue(typeof b.joinNonce==='string'&&/^[a-zA-Z0-9-]{20,100}$/.test(b.joinNonce),'Reload the join page.');
    // A persistent client nonce makes a lost response safe to retry. A released
    // login refuses its previous nonce, so a delayed old join cannot reactivate it.
    const ref=roomRef(b.roomId),submittedNonceHash=nonceHash(b.joinNonce);
    const result=await db.runTransaction(async tx=>{
     const snap=await tx.get(ref);requireValue(snap.exists,'Activity not found.',404,'ROOM_REMOVED');const room=snap.data();
     const existing=Object.values(room.groups),matched=existing.find(g=>sameMembers(g.members,ids));
     if(matched){
      if(!matched.login){
       const legacyToken=hash(`${b.roomId}:${b.joinNonce}`);
       requireValue(hash(legacyToken)===matched.tokenHash,'This group is already signed in. Ask your teacher to release it first.',409,'GROUP_LOGIN_ACTIVE');
       return {room,groupId:matched.id,token:legacyToken};
      }
      if(matched.login.status==='active'){
       const token=loginToken(b.roomId,matched.id,b.joinNonce,matched.login.version);
       requireValue(matched.login.joinNonceHash===submittedNonceHash&&hash(token)===matched.login.tokenHash,'This group is already signed in. Ask your teacher to release it first.',409,'GROUP_LOGIN_ACTIVE');
       return {room,groupId:matched.id,token};
      }
      requireValue(room.phase!=='ended','This activity has ended.',409,'ROOM_ENDED');
       const legacyTokenHash=hash(hash(`${b.roomId}:${b.joinNonce}`)),revokedNonces=revokedNonceHashes(matched.login),revokedTokens=revokedTokenHashes(matched.login);
       requireValue(!revokedNonces.includes(submittedNonceHash)&&!revokedTokens.includes(legacyTokenHash),'Create a fresh join request to reconnect this group.',409,'STALE_JOIN_NONCE');
      const version=matched.login.version+1,token=loginToken(b.roomId,matched.id,b.joinNonce,version);
       matched.login={status:'active',version,tokenHash:hash(token),joinNonceHash:submittedNonceHash,revokedJoinNonceHashes:revokedNonces,revokedTokenHashes:revokedTokens,joinedAt:time()};
      matched.joinedAt=time();tx.set(ref,room);return {room,groupId:matched.id,token};
     }
     requireValue(room.phase!=='ended','This activity has ended.',409,'ROOM_ENDED');
     requireValue(!existing.some(g=>g.members.some(n=>ids.includes(n))),'Some student numbers already belong to another group. Use exactly the original group members.',409,'GROUP_MEMBERS_CONFLICT');
     requireValue(existing.length<room.maxGroups,'All groups have joined. Ask your teacher.',409,'ROOM_FULL');
     const groupId=hash(`group:${b.roomId}:${b.joinNonce}`).slice(0,24);
     requireValue(!room.groups[groupId],'This device has already joined with other student numbers.',409,'JOIN_NONCE_CONFLICT');
     const used=new Set(existing.map(g=>g.number)),number=Array.from({length:room.maxGroups},(_,i)=>i+1).find(n=>!used.has(n));
     const version=1,token=loginToken(b.roomId,groupId,b.joinNonce,version);
     const g={id:groupId,number,members:ids,login:{status:'active',version,tokenHash:hash(token),joinNonceHash:submittedNonceHash,joinedAt:time()},joinedAt:time(),attempts:[]};
     room.groups[groupId]=g;tx.set(ref,room);return {room,groupId,token};
    });return {groupId:result.groupId,token:result.token,room:publicRoom(result.room,result.groupId)};
   }
   case 'releaseGroupLogin':{
    requireValue(typeof b.releaseRequestId==='string'&&/^[a-zA-Z0-9-]{16,100}$/.test(b.releaseRequestId),'Invalid release request.',400,'INVALID_RELEASE_REQUEST');
    requireValue(Number.isInteger(b.loginVersion)&&b.loginVersion>=1,'Refresh the group before releasing its login.',409,'LOGIN_VERSION_REQUIRED');
    const ref=roomRef(b.roomId),room=await db.runTransaction(async tx=>{
     const snap=await tx.get(ref);requireValue(snap.exists,'Activity removed.',404,'ROOM_REMOVED');const room=snap.data(),g=room.groups[b.groupId];
     requireValue(g,'This group is no longer in the activity.',404,'GROUP_NOT_FOUND');
     if(g.lastReleaseId===b.releaseRequestId)return room;
     requireValue(room.phase!=='ended','This activity has ended. Its saved records remain locked.',409,'ROOM_ENDED');
     const currentVersion=Number.isInteger(g.login?.version)?g.login.version:1;
     requireValue(currentVersion===b.loginVersion,'This group login changed. Refresh before trying again.',409,'LOGIN_VERSION_CONFLICT');
     requireValue(!g.login||g.login.status==='active','This group is already waiting to rejoin.',409,'LOGIN_ALREADY_RELEASED');
      const revokedNonces=uniqueHashes([...revokedNonceHashes(g.login),g.login?.joinNonceHash]);
      const revokedTokens=uniqueHashes([...revokedTokenHashes(g.login),g.login?.tokenHash||g.tokenHash]);
      g.login={status:'released',version:currentVersion+1,revokedJoinNonceHashes:revokedNonces,revokedTokenHashes:revokedTokens,releasedAt:time()};
     g.tokenHash=null;g.lastReleaseId=b.releaseRequestId;tx.set(ref,room);return room;
    });return {room:teacherRoom(room)};
   }
   case 'submit':{
    const ref=roomRef(b.roomId);requireValue(typeof b.attemptId==='string'&&/^[a-zA-Z0-9-]{16,100}$/.test(b.attemptId),'Invalid submission identifier.');
    const result=await db.runTransaction(async tx=>{
     const snap=await tx.get(ref);requireValue(snap.exists,'Activity removed.',404,'ROOM_REMOVED');const room=snap.data(),g=student(room,b);
     const prior=g.attempts.find(a=>a.id===b.attemptId);if(prior)return {attempt:prior,room:publicRoom(room,g.id)};
     requireValue(room.phase==='open'&&room.questionIndex===b.questionIndex&&room.revision===b.revision,'Your teacher has locked this question. This submission was not counted.',409);
     const attempts=g.attempts.filter(a=>a.questionIndex===room.questionIndex);
     requireValue(attempts.length<5&&!attempts.some(a=>a.correct),'This question is locked.',409);
     const verdict=evaluate(room.questions[room.questionIndex],b.lines);
     const attempt={id:b.attemptId,questionIndex:room.questionIndex,number:attempts.length+1,...verdict,at:time()};
     g.attempts.push(attempt);tx.set(ref,room);return {attempt,room:publicRoom(room,g.id)};
    });return result;
   }
   case 'next': case 'end': case 'visibility':{
    const ref=roomRef(b.roomId);const room=await db.runTransaction(async tx=>{
     const snap=await tx.get(ref);requireValue(snap.exists,'Activity removed.',404);let room=snap.data();
     requireValue(room.revision===b.revision,'The activity changed. Check the current question before continuing.',409);
     if(b.action==='next')room=stageNext(room);
     if(b.action==='end')room={...room,phase:'ended',reviewIndex:room.questionIndex,revision:room.revision+1};
     if(b.action==='visibility')room={...room,showAnswers:!!b.showAnswers};
     tx.set(ref,room);return room;
    });return {room:teacherRoom(room)};
   }
   case 'deleteRoom':{const ref=roomRef(b.roomId);await db.runTransaction(async tx=>{const snap=await tx.get(ref);requireValue(snap.exists,'Activity removed.',404);requireValue(snap.data().phase==='ended','End the activity before deleting its records.',409);tx.delete(ref);});return {deleted:true};}
   default:throw new ActivityError('Unknown activity action.',400);
  }
 };
}
export function activityHttp(service){return async(req,res)=>{
 res.set('Cache-Control','no-store');res.set('X-Content-Type-Options','nosniff');
 if(req.method!=='POST')return res.status(405).json({message:'Use the activity page.',code:'METHOD_NOT_ALLOWED'});
 const origins=['https://gamesinclass-5d9d1.web.app','https://gamesinclass-5d9d1.firebaseapp.com'];
 if(req.headers.origin&&!origins.includes(req.headers.origin))return res.status(403).json({message:'Use the classroom website.',code:'ORIGIN_FORBIDDEN'});
 if(!req.is('application/json'))return res.status(400).json({message:'Expected JSON.',code:'EXPECTED_JSON'});
 try{return res.json(await service(req.body,req.headers.authorization));}catch(e){return res.status(e instanceof ActivityError?e.status:503).json({message:e instanceof ActivityError?e.message:'Could not save or load. Keep this page open and retry.',code:e instanceof ActivityError?e.code:'SERVICE_UNAVAILABLE'});}
};}
