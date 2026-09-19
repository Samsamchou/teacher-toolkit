import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';

const base='http://127.0.0.1:5184';
const out=new URL('../qa/unscramble-rejoin-20260919/',import.meta.url);
await mkdir(out,{recursive:true});
const results=[],failures=[];
async function check(name,fn){const started=Date.now();try{await fn();results.push({name,passed:true,ms:Date.now()-started});console.log('PASS',name);}catch(error){failures.push(name);results.push({name,passed:false,message:error.message});console.error('FAIL',name,error.message);}}
async function api(action,payload={},student=false){const response=await fetch(base+'/api/live-activity',{method:'POST',headers:{'Content-Type':'application/json',...(!student?{Authorization:'Bearer local-teacher'}:{})},body:JSON.stringify({action,...payload})});const data=await response.json();if(!response.ok){const error=new Error(data.message);error.status=response.status;error.code=data.code;throw error;}return data;}
async function join(roomId,members,joinNonce=randomUUID()){const data=await api('join',{roomId,members,joinNonce},true);return {roomId,groupId:data.groupId,token:data.token,members:data.room.group.members};}
async function roomState(roomId){return (await api('teacherState',{roomId})).room;}
async function release(roomId,group){return api('releaseGroupLogin',{roomId,groupId:group.id,loginVersion:group.loginVersion,releaseRequestId:randomUUID()});}
async function finishAndDelete(roomId){try{let room=await roomState(roomId);if(room.phase!=='ended')room=(await api('end',{roomId,revision:room.revision})).room;await api('deleteRoom',{roomId});}catch(error){if(error.status!==404)throw error;}}
const correct=deck=>[deck.questions[0].prompt.split(' '),deck.questions[0].answer.split(' ')];
const wrong=deck=>{const lines=correct(deck).map(words=>[...words]);[lines[0][0],lines[1][0]]=[lines[1][0],lines[0][0]];return lines;};
async function arrange(page,lines){await page.evaluate(()=>document.querySelector('.ul-feedback')?.click());await page.getByRole('button',{name:'Reset',exact:true}).click();for(let row=0;row<2;row++){await page.getByRole('button',{name:row?'2 · Answer':'1 · Question',exact:true}).click();for(const word of lines[row])await page.getByTestId('wordbank').getByRole('button',{name:word,exact:true}).first().click();}}

const browser=await chromium.launch({headless:true,channel:'chrome'});
await api('seed');const deck=(await api('listDecks')).decks.find(item=>item.id==='family-20260915');assert.ok(deck);

async function delayedOldSubmit(outcome){
 const target=(await api('createRoom',{deckId:deck.id,className:`QA delayed ${outcome}`,maxGroups:2})).room;
 const other=(await api('createRoom',{deckId:deck.id,className:`QA other ${outcome}`,maxGroups:2})).room;
 const otherEntry=await join(other.id,outcome==='success'?'08101 08102':'08201 08202');
 const context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true}),page=await context.newPage(),peer=await context.newPage();
 let oldEntry,newEntry,newPendingBody;
 try{
  await peer.goto(base);await page.goto(`${base}/join?room=${target.id}`);const members=outcome==='success'?'07101 07102':'07201 07202';await page.getByLabel('同組學號').fill(members);await page.getByRole('button',{name:'Join activity →'}).click();await expect(page.locator('.ul-wordmark')).toContainText('GROUP 1',{timeout:15000});oldEntry=await page.evaluate(id=>JSON.parse(localStorage.getItem(`ul-entry:${id}`)),target.id);
  const otherDraft=[[0],[]],otherPending={...otherEntry,attemptId:`other-${outcome}-pending-0001`,questionIndex:0,revision:0,lines:wrong(deck)};await page.evaluate(({id,entry,draft,pending})=>{localStorage.setItem(`ul-entry:${id}`,JSON.stringify(entry));localStorage.setItem(`ul-draft:${id}:0`,JSON.stringify(draft));localStorage.setItem(`ul-pending:${id}`,JSON.stringify(pending));},{id:other.id,entry:otherEntry,draft:otherDraft,pending:otherPending});
  await api('next',{roomId:target.id,revision:target.revision});await expect(page.getByRole('button',{name:'Reset',exact:true})).toBeEnabled({timeout:15000});
  await page.evaluate(({oldToken,outcome})=>{const originalFetch=window.fetch.bind(window),state={oldSeen:false,oldProcessed:false,oldReturning:false,newSeen:false,newReturning:false,newToken:'',newBody:null};let releaseOld,releaseNew;const oldGate=new Promise(resolve=>{releaseOld=resolve;}),newGate=new Promise(resolve=>{releaseNew=resolve;});const durable=async(input,init)=>{const clean={...init};delete clean.signal;const response=await originalFetch(input,clean),text=await response.text();return new Response(text,{status:response.status,statusText:response.statusText,headers:[...response.headers]});};window.__delayState=state;window.__releaseOld=releaseOld;window.__releaseNew=releaseNew;window.fetch=async(input,init)=>{let body={};try{body=JSON.parse(init?.body||'{}');}catch{}
    if(body.action==='submit'&&body.token===oldToken&&!state.oldSeen){state.oldSeen=true;if(outcome==='success'){const response=await durable(input,init);state.oldProcessed=true;await oldGate;state.oldReturning=true;return response;}await oldGate;const response=await durable(input,init);state.oldProcessed=true;state.oldReturning=true;return response;}
    if(body.action==='submit'&&state.newToken&&body.token===state.newToken&&!state.newSeen){state.newSeen=true;state.newBody=body;await newGate;const response=await durable(input,init);state.newReturning=true;return response;}
    return originalFetch(input,init);
   };},{oldToken:oldEntry.token,outcome});
  await arrange(page,wrong(deck));await page.getByRole('button',{name:'Check answer →',exact:true}).click();if(outcome==='success')await expect.poll(()=>page.evaluate(()=>window.__delayState.oldProcessed),{timeout:15000}).toBe(true);else await expect.poll(()=>page.evaluate(()=>window.__delayState.oldSeen),{timeout:15000}).toBe(true);
  let current=await roomState(target.id);await release(target.id,current.groups[oldEntry.groupId]);await expect(page.getByRole('button',{name:'Join activity →'})).toBeVisible({timeout:15000});await page.getByLabel('同組學號').fill(members);await page.getByRole('button',{name:'Join activity →'}).click();await expect(page.locator('.ul-wordmark')).toContainText('GROUP 1',{timeout:15000});newEntry=await page.evaluate(id=>JSON.parse(localStorage.getItem(`ul-entry:${id}`)),target.id);assert.notEqual(newEntry.token,oldEntry.token);await page.evaluate(token=>{window.__delayState.newToken=token;},newEntry.token);
  await arrange(page,wrong(deck));await page.getByRole('button',{name:'Check answer →',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.__delayState.newSeen),{timeout:15000}).toBe(true);newPendingBody=await page.evaluate(()=>window.__delayState.newBody);await page.evaluate(()=>window.__releaseOld());await expect.poll(()=>page.evaluate(()=>window.__delayState.oldReturning),{timeout:15000}).toBe(true);await page.waitForTimeout(500);
  const snapshots=await Promise.all([page,peer].map(tab=>tab.evaluate(({targetId,otherId})=>({entry:JSON.parse(localStorage.getItem(`ul-entry:${targetId}`)),pending:JSON.parse(localStorage.getItem(`ul-pending:${targetId}`)),otherEntry:JSON.parse(localStorage.getItem(`ul-entry:${otherId}`)),otherDraft:JSON.parse(localStorage.getItem(`ul-draft:${otherId}:0`)),otherPending:JSON.parse(localStorage.getItem(`ul-pending:${otherId}`))}),{targetId:target.id,otherId:other.id})));
  for(const snapshot of snapshots){assert.equal(snapshot.entry.token,newEntry.token,'old response replaced the new login');assert.equal(snapshot.pending.token,newEntry.token,'old response cleared the new pending submission');assert.equal(snapshot.pending.attemptId,newPendingBody.attemptId,'old response replaced the new attempt');assert.deepEqual(snapshot.otherEntry,otherEntry);assert.deepEqual(snapshot.otherDraft,otherDraft);assert.deepEqual(snapshot.otherPending,otherPending);}
  await page.evaluate(()=>window.__releaseNew());await expect.poll(()=>page.evaluate(id=>localStorage.getItem(`ul-pending:${id}`),target.id),{timeout:15000}).toBeNull();current=await roomState(target.id);assert.equal(Object.keys(current.groups).length,1);assert.equal(current.revision,1);assert.equal(current.groups[newEntry.groupId].number,1);
 }finally{await page.evaluate(()=>{window.__releaseOld?.();window.__releaseNew?.();}).catch(()=>{});await context.close().catch(()=>{});await finishAndDelete(target.id).catch(()=>{});await finishAndDelete(other.id).catch(()=>{});}
}

await check('A delayed success from an unmounted old submit cannot clear the new login or pending attempt',()=>delayedOldSubmit('success'));
await check('A delayed revoked response from an unmounted old submit cannot log out the new login',()=>delayedOldSubmit('failure'));
await writeFile(new URL('stale-response-results.json',out),JSON.stringify({generatedAt:new Date().toISOString(),environment:'local Firebase emulators and synthetic student numbers only',results,passed:failures.length===0},null,2));
await browser.close();
if(failures.length)process.exitCode=1;
