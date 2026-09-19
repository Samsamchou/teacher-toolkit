import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';

const base='http://127.0.0.1:5184';
const out=new URL('../qa/unscramble-rejoin-20260919/',import.meta.url);
await mkdir(out,{recursive:true});
const results=[],failures=[],browserErrors=[],cleanup=[];
async function check(name,fn){const start=Date.now();try{await fn();results.push({name,passed:true,ms:Date.now()-start});console.log('PASS',name);}catch(error){results.push({name,passed:false,message:error.message});failures.push(name);throw error;}}
async function api(action,payload={},student=false){const response=await fetch(base+'/api/live-activity',{method:'POST',headers:{'Content-Type':'application/json',...(!student?{Authorization:'Bearer local-teacher'}:{})},body:JSON.stringify({action,...payload})});const data=await response.json();if(!response.ok){const error=new Error(data.message);error.status=response.status;error.code=data.code;throw error;}return data;}
async function join(roomId,members,joinNonce=randomUUID()){const data=await api('join',{roomId,members,joinNonce},true);return {credentials:{roomId,groupId:data.groupId,token:data.token,members:data.room.group.members},joinNonce,room:data.room};}
async function release(roomId,group,releaseRequestId=randomUUID()){return api('releaseGroupLogin',{roomId,groupId:group.id,loginVersion:group.loginVersion,releaseRequestId});}
const correct=deck=>[deck.questions[0].prompt.split(' '),deck.questions[0].answer.split(' ')];
const wrong=deck=>{const lines=correct(deck).map(words=>[...words]);[lines[0][0],lines[1][0]]=[lines[1][0],lines[0][0]];return lines;};
async function submit(credentials,deck,lines=wrong(deck),attemptId=randomUUID()){return api('submit',{...credentials,attemptId,questionIndex:0,revision:1,lines},true);}
async function roomState(roomId){return (await api('teacherState',{roomId})).room;}
async function finishAndDelete(roomId){try{let room=await roomState(roomId);if(room.phase!=='ended')room=(await api('end',{roomId,revision:room.revision})).room;await api('deleteRoom',{roomId});}catch(error){if(error.status!==404)throw error;}}

process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8186';
process.env.GCLOUD_PROJECT='demo-classroom-games';
const adminApp=initializeApp({projectId:'demo-classroom-games'},`unscramble-rejoin-${Date.now()}`),db=getFirestore(adminApp);
const browser=await chromium.launch({headless:true,channel:'chrome'});
const teacherContext=await browser.newContext({viewport:{width:1440,height:1000}}),teacher=await teacherContext.newPage();
teacher.on('pageerror',error=>browserErrors.push(`teacher: ${error.message}`));
let deck,room,roomId,studentContext,studentPage,firstOriginal,firstCurrent,credentials=[],nonces=[];

try{
 await check('Create rooms with every integer from 2 through 15; reject 1, 16 and non-integers',async()=>{
  await api('seed');deck=(await api('listDecks')).decks.find(item=>item.id==='family-20260915');assert.ok(deck);
  for(let maxGroups=2;maxGroups<=15;maxGroups++){const created=(await api('createRoom',{deckId:deck.id,className:`QA capacity ${maxGroups}`,maxGroups})).room;assert.equal(created.maxGroups,maxGroups);await finishAndDelete(created.id);}
  for(const maxGroups of [1,16,2.5,'15'])await assert.rejects(()=>api('createRoom',{deckId:deck.id,className:'QA invalid capacity',maxGroups}),error=>error.status===400);
 });

 await check('Fifteen groups join; a sixteenth group is rejected',async()=>{
  room=(await api('createRoom',{deckId:deck.id,className:'QA 15組重登驗證',maxGroups:15})).room;roomId=room.id;cleanup.push(roomId);
  studentContext=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true});studentPage=await studentContext.newPage();studentPage.on('pageerror',error=>browserErrors.push(`student: ${error.message}`));
  await studentPage.goto(`${base}/join?room=${roomId}`);await studentPage.getByLabel('同組學號').fill('040101 040102');await studentPage.getByRole('button',{name:'Join activity →'}).click();await expect(studentPage.locator('.ul-wordmark')).toContainText('GROUP 1',{timeout:20000});
  firstOriginal=await studentPage.evaluate(id=>{const nonce=JSON.parse(localStorage.getItem(`ul-nonce:${id}`));return {credentials:JSON.parse(localStorage.getItem(`ul-entry:${id}`)),joinNonce:typeof nonce==='string'?nonce:nonce?.value};},roomId);credentials.push(firstOriginal.credentials);nonces.push(firstOriginal.joinNonce);
  for(let index=1;index<15;index++){const memberBase=40100+index*10,result=await join(roomId,`${memberBase+1} ${memberBase+2}`);credentials.push(result.credentials);nonces.push(result.joinNonce);}
  const current=await roomState(roomId);assert.equal(Object.keys(current.groups).length,15);assert.deepEqual(Object.values(current.groups).map(group=>group.number).sort((a,b)=>a-b),Array.from({length:15},(_,i)=>i+1));
  await assert.rejects(()=>join(roomId,'049901 049902'),error=>error.code==='ROOM_FULL');
 });

 await check('Closing and reopening a tab keeps the original browser login',async()=>{
  await studentPage.close();studentPage=await studentContext.newPage();studentPage.on('pageerror',error=>browserErrors.push(`student-reopen: ${error.message}`));await studentPage.goto(`${base}/join?room=${roomId}`);await expect(studentPage.locator('.ul-wordmark')).toContainText('GROUP 1',{timeout:20000});const saved=await studentPage.evaluate(id=>JSON.parse(localStorage.getItem(`ul-entry:${id}`)),roomId);assert.equal(saved.token,firstOriginal.credentials.token);assert.equal(saved.groupId,firstOriginal.credentials.groupId);
 });

 await check('Answers, correct lock and five-attempt cap are recorded before login release',async()=>{
  room=(await api('next',{roomId,revision:room.revision})).room;
  await submit(credentials[0],deck,wrong(deck));await submit(credentials[0],deck,correct(deck));
  for(let index=0;index<5;index++)await submit(credentials[1],deck,wrong(deck));
  await submit(credentials[4],deck,wrong(deck));
  const current=await roomState(roomId),groups=Object.values(current.groups);assert.equal(groups.find(group=>group.id===credentials[0].groupId).attempts.length,2);assert.equal(groups.find(group=>group.id===credentials[0].groupId).attempts.at(-1).correct,true);assert.equal(groups.find(group=>group.id===credentials[1].groupId).attempts.length,5);await assert.rejects(()=>submit(credentials[1],deck,wrong(deck)),error=>error.status===409);
 });

 await check('Missing browser credentials reproduce occupied membership; teacher UI releases only the login',async()=>{
  await studentPage.evaluate(id=>{localStorage.removeItem(`ul-entry:${id}`);localStorage.removeItem(`ul-nonce:${id}`);},roomId);await studentPage.reload();await studentPage.getByLabel('同組學號').fill('040101 040102');await studentPage.getByRole('button',{name:'Join activity →'}).click();await expect(studentPage.getByRole('alert')).toContainText('already signed in',{timeout:10000});
  await teacher.goto(base+'/unscramble');const record=teacher.locator('.ul-record-list article').filter({hasText:'QA 15組重登驗證'});await record.getByRole('button',{name:'開啟紀錄／場次 →'}).click();await expect(teacher.locator('.ul-header')).toContainText('15/15',{timeout:20000});
  const card=teacher.locator('.ul-group').nth(0);await expect(card.getByText('GROUP 1',{exact:true})).toBeVisible();teacher.once('dialog',async dialog=>{assert.match(dialog.message(),/GROUP 1/);assert.match(dialog.message(),/040101 040102/);assert.match(dialog.message(),/解除這組目前的登入，允許同組學號重新加入。/);assert.match(dialog.message(),/已儲存的作答紀錄與作答次數會保留。/);await dialog.accept();});await card.getByRole('button',{name:'解除登入'}).click();await expect(card.locator('.ul-group-login')).toHaveText('等待重新加入',{timeout:15000});
  const released=await roomState(roomId),group=released.groups[credentials[0].groupId];assert.equal(group.loginStatus,'released');assert.equal(group.number,1);assert.equal(group.attempts.length,2);assert.equal(released.revision,1);
 });

 await check('Old token, old join request and student teacher-action calls are rejected',async()=>{
  const imageId=deck.questions[0].imageId;
  await assert.rejects(()=>api('studentState',credentials[0],true),error=>error.code==='LOGIN_REVOKED');
  await assert.rejects(()=>submit(credentials[0],deck,wrong(deck)),error=>error.code==='LOGIN_REVOKED');
  await assert.rejects(()=>api('studentImage',{...credentials[0],imageId},true),error=>error.code==='LOGIN_REVOKED');
  await assert.rejects(()=>api('join',{roomId,members:'040101 040102',joinNonce:nonces[0]},true),error=>error.code==='STALE_JOIN_NONCE');
  const group=(await roomState(roomId)).groups[credentials[0].groupId];await assert.rejects(()=>api('releaseGroupLogin',{roomId,groupId:group.id,loginVersion:group.loginVersion,releaseRequestId:randomUUID()},true),error=>error.status===401);
 });

 await check('The same members rejoin the original full-room slot with all records preserved',async()=>{
  await studentPage.getByRole('button',{name:'Join activity →'}).click();await expect(studentPage.locator('.ul-wordmark')).toContainText('GROUP 1',{timeout:20000});firstCurrent=await studentPage.evaluate(id=>JSON.parse(localStorage.getItem(`ul-entry:${id}`)),roomId);assert.equal(firstCurrent.groupId,credentials[0].groupId);assert.notEqual(firstCurrent.token,credentials[0].token);
  const state=(await api('studentState',firstCurrent,true)).room;assert.equal(state.group.number,1);assert.deepEqual(state.group.members,['040101','040102']);assert.equal(state.group.attempts.length,2);assert.equal(state.group.attempts.at(-1).correct,true);assert.equal(Object.keys((await roomState(roomId)).groups).length,15);credentials[0]=firstCurrent;
 });

 await check('Exact unordered members reconnect, while partial overlap cannot take a group',async()=>{
  const current=await roomState(roomId),group=current.groups[credentials[1].groupId];await release(roomId,group);await assert.rejects(()=>api('join',{roomId,members:`${group.members[0]} 049999`,joinNonce:randomUUID()},true),error=>error.code==='GROUP_MEMBERS_CONFLICT');
  const rejoined=await join(roomId,[...group.members].reverse().join(' '));assert.equal(rejoined.credentials.groupId,group.id);const state=(await api('studentState',rejoined.credentials,true)).room;assert.equal(state.group.number,2);assert.deepEqual(state.group.members,group.members);assert.equal(state.group.attempts.length,5);credentials[1]=rejoined.credentials;
 });

 await check('Two devices racing to reconnect produce one valid login and no duplicate group',async()=>{
  const current=await roomState(roomId),group=current.groups[credentials[2].groupId];await release(roomId,group);const attempts=await Promise.allSettled([join(roomId,group.members.join(' '),randomUUID()),join(roomId,[...group.members].reverse().join(' '),randomUUID())]);assert.equal(attempts.filter(item=>item.status==='fulfilled').length,1);assert.equal(attempts.filter(item=>item.status==='rejected').length,1);assert.equal(attempts.find(item=>item.status==='rejected').reason.code,'GROUP_LOGIN_ACTIVE');const winner=attempts.find(item=>item.status==='fulfilled').value.credentials;assert.equal(winner.groupId,group.id);credentials[2]=winner;assert.equal(Object.keys((await roomState(roomId)).groups).length,15);
 });

 await check('Repeated release is idempotent and a delayed duplicate cannot revoke a newer login',async()=>{
  let current=await roomState(roomId),group=current.groups[credentials[3].groupId];const releaseRequestId=randomUUID(),payload={roomId,groupId:group.id,loginVersion:group.loginVersion,releaseRequestId};const repeated=await Promise.all([api('releaseGroupLogin',payload),api('releaseGroupLogin',payload)]);assert.ok(repeated.every(item=>item.room.groups[group.id].loginStatus==='released'));const releasedVersion=repeated[0].room.groups[group.id].loginVersion;
  const next=await join(roomId,group.members.join(' '));credentials[3]=next.credentials;current=await roomState(roomId);const activeVersion=current.groups[group.id].loginVersion;assert.ok(activeVersion>releasedVersion);await api('releaseGroupLogin',payload);current=await roomState(roomId);assert.equal(current.groups[group.id].loginStatus,'active');assert.equal(current.groups[group.id].loginVersion,activeVersion);await api('studentState',credentials[3],true);
 });

 await check('Every nonce from multiple released login generations stays revoked',async()=>{
  const groupId=credentials[6].groupId,nonceA=nonces[6];await submit(credentials[6],deck,wrong(deck));let current=await roomState(roomId),group=current.groups[groupId];const baseline={count:Object.keys(current.groups).length,attempts:group.attempts.length,revision:current.revision,number:group.number};
  await release(roomId,group);const nonceB=randomUUID(),joinedB=await join(roomId,group.members.join(' '),nonceB);credentials[6]=joinedB.credentials;current=await roomState(roomId);group=current.groups[groupId];await release(roomId,group);
  for(const staleNonce of [nonceA])await assert.rejects(()=>join(roomId,[...group.members].reverse().join(' '),staleNonce),error=>error.code==='STALE_JOIN_NONCE');
  current=await roomState(roomId);group=current.groups[groupId];assert.equal(group.loginStatus,'released');assert.equal(Object.keys(current.groups).length,baseline.count);assert.equal(group.attempts.length,baseline.attempts);assert.equal(group.number,baseline.number);assert.equal(current.revision,baseline.revision);
  const nonceC=randomUUID(),joinedC=await join(roomId,group.members.join(' '),nonceC);credentials[6]=joinedC.credentials;current=await roomState(roomId);group=current.groups[groupId];await release(roomId,group);
  for(const staleNonce of [nonceA,nonceB])await assert.rejects(()=>join(roomId,group.members.join(' '),staleNonce),error=>error.code==='STALE_JOIN_NONCE');
  current=await roomState(roomId);group=current.groups[groupId];assert.equal(group.loginStatus,'released');assert.equal(Object.keys(current.groups).length,baseline.count);assert.equal(group.attempts.length,baseline.attempts);assert.equal(group.number,baseline.number);assert.equal(current.revision,baseline.revision);const joinedD=await join(roomId,group.members.join(' '),randomUUID());credentials[6]=joinedD.credentials;
 });

 await check('Release racing with submit preserves prior records and never revokes another group',async()=>{
  let current=await roomState(roomId),group=current.groups[credentials[4].groupId],before=group.attempts.length;const actions=await Promise.allSettled([release(roomId,group),submit(credentials[4],deck,wrong(deck))]);assert.ok(actions.some(item=>item.status==='fulfilled'));current=await roomState(roomId);group=current.groups[group.id];assert.equal(group.loginStatus,'released');assert.ok(group.attempts.length===before||group.attempts.length===before+1);assert.ok(group.attempts.length>=1);assert.equal(current.revision,1);assert.equal(Object.keys(current.groups).length,15);const next=await join(roomId,group.members.join(' '));credentials[4]=next.credentials;
 });

 await check('Temporary offline state keeps login, draft and pending submission data',async()=>{
  const offlineContext=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true}),page=await offlineContext.newPage();page.on('pageerror',error=>browserErrors.push(`offline: ${error.message}`));await page.goto(base);await page.evaluate(({roomId,entry})=>{localStorage.setItem(`ul-entry:${roomId}`,JSON.stringify(entry));localStorage.setItem(`ul-draft:${roomId}:0`,JSON.stringify([[0],[]]));localStorage.setItem(`ul-pending:${roomId}`,JSON.stringify({...entry,attemptId:'offline-pending-0001',questionIndex:0,revision:1,lines:[["Who's",'she?'],["She's",'my','sister.']]}));},{roomId,entry:credentials[5]});await page.goto(`${base}/join?room=${roomId}`);await expect(page.locator('.ul-wordmark')).toContainText('GROUP 6',{timeout:15000});await offlineContext.setOffline(true);await expect(page.getByText('Reconnecting… Your words are kept.')).toBeVisible({timeout:10000});const kept=await page.evaluate(id=>({entry:localStorage.getItem(`ul-entry:${id}`),draft:localStorage.getItem(`ul-draft:${id}:0`),pending:localStorage.getItem(`ul-pending:${id}`)}),roomId);assert.ok(kept.entry&&kept.draft&&kept.pending);await offlineContext.setOffline(false);await offlineContext.close();
 });

 await check('Legacy rooms without login fields remain compatible and can be released safely',async()=>{
  const legacy=(await api('createRoom',{deckId:deck.id,className:'QA legacy room',maxGroups:2})).room;cleanup.push(legacy.id);const joined=await join(legacy.id,'00701 00702'),snap=await db.doc(`liveRooms/${legacy.id}`).get(),data=snap.data(),legacyGroup=data.groups[joined.credentials.groupId];legacyGroup.tokenHash=createHash('sha256').update(joined.credentials.token).digest('hex');delete legacyGroup.login;await db.doc(`liveRooms/${legacy.id}`).set(data);await api('studentState',joined.credentials,true);let projected=await roomState(legacy.id);assert.equal(projected.groups[legacyGroup.id].loginStatus,'active');assert.equal(projected.groups[legacyGroup.id].loginVersion,1);await release(legacy.id,projected.groups[legacyGroup.id]);await assert.rejects(()=>api('studentState',joined.credentials,true),error=>error.code==='LOGIN_REVOKED');const resumed=await join(legacy.id,'00702 00701');assert.equal(resumed.credentials.groupId,legacyGroup.id);assert.equal(resumed.room.group.number,1);
 });

 await check('Fifteen-group teacher and tablet layouts have no horizontal overflow or blocked controls',async()=>{
  await expect(teacher.locator('.ul-release-login')).toHaveCount(15,{timeout:15000});
  for(const [width,height] of [[1366,768],[1440,1000],[1920,1080]]){await teacher.setViewportSize({width,height});assert.ok(await teacher.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));const buttons=teacher.locator('.ul-release-login');await buttons.last().scrollIntoViewIfNeeded();await expect(buttons.last()).toBeVisible();const usable=await buttons.evaluateAll(items=>items.every(button=>{const card=button.closest('.ul-group').getBoundingClientRect(),rect=button.getBoundingClientRect();return rect.width>40&&rect.height>=24&&rect.left>=card.left-1&&rect.right<=card.right+1;}));assert.ok(usable,`Release controls fit cards at ${width}x${height}`);await teacher.screenshot({path:new URL(`teacher-15-${width}x${height}.png`,out).pathname.replace(/^\/(\w:)/,'$1')});}
  for(const [width,height] of [[1024,768],[768,1024],[390,844]]){await studentPage.setViewportSize({width,height});assert.ok(await studentPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await studentPage.screenshot({path:new URL(`student-rejoined-${width}x${height}.png`,out).pathname.replace(/^\/(\w:)/,'$1')});}
  assert.deepEqual(browserErrors,[]);
 });

 await check('CSV keeps group membership and all saved attempts after reconnect',async()=>{
  const download=teacher.waitForEvent('download');await teacher.getByRole('button',{name:'匯出 CSV',exact:true}).click();const artifact=await download;const path=new URL('synthetic-records.csv',out).pathname.replace(/^\/(\w:)/,'$1');await artifact.saveAs(path);const csv=await readFile(path,'utf8');assert.ok(csv.includes('040101 040102'));assert.ok(csv.includes('40111 40112'));assert.ok(csv.includes('正確'));assert.ok(csv.includes('錯誤'));
 });

 await check('Ended activity stays ended and cannot release another login',async()=>{
  room=await roomState(roomId);room=(await api('end',{roomId,revision:room.revision})).room;const group=room.groups[credentials[5].groupId];await assert.rejects(()=>release(roomId,group),error=>error.code==='ROOM_ENDED');assert.equal((await roomState(roomId)).phase,'ended');await expect(teacher.locator('.ul-release-login')).toHaveCount(0,{timeout:10000});
 });

 await check('Removed activity shows a terminal message instead of retrying forever',async()=>{
  const removed=(await api('createRoom',{deckId:deck.id,className:'QA removed room',maxGroups:2})).room,joined=await join(removed.id,'00801 00802');const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),page=await context.newPage();await page.goto(base);await page.evaluate(({roomId,entry})=>localStorage.setItem(`ul-entry:${roomId}`,JSON.stringify(entry)),{roomId:removed.id,entry:joined.credentials});await finishAndDelete(removed.id);await page.goto(`${base}/join?room=${removed.id}`);await expect(page.getByRole('alert')).toContainText('Activity removed',{timeout:10000});await page.waitForTimeout(2200);await expect(page.getByRole('alert')).toContainText('Activity removed');await context.close();
 });
}catch(error){console.error('FAILED',error);}
finally{
 for(const id of cleanup.reverse())await finishAndDelete(id).catch(()=>{});
 await writeFile(new URL('integration-results.json',out),JSON.stringify({generatedAt:new Date().toISOString(),environment:'local Firebase emulators and synthetic student numbers only',roomId,results,browserErrors,passed:failures.length===0},null,2));
 await teacherContext.close().catch(()=>{});if(studentContext)await studentContext.close().catch(()=>{});await browser.close();await deleteApp(adminApp);
}
if(failures.length)process.exitCode=1;
