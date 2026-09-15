import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
const results=[];
async function api(action,payload={},student=false){const r=await fetch('http://127.0.0.1:5184/api/live-activity',{method:'POST',headers:{'Content-Type':'application/json',...(!student?{Authorization:'Bearer local-teacher'}:{})},body:JSON.stringify({action,...payload})});const d=await r.json();if(!r.ok){const e=new Error(d.message);e.status=r.status;throw e;}return d;}
async function retry(fn){for(let i=0;i<4;i++){try{return await fn();}catch(e){if(e.status!==503||i===3)throw e;await new Promise(r=>setTimeout(r,100*(i+1)));}}}
const decks=(await api('listDecks')).decks,deck=decks.find(d=>d.id==='family-20260915');let room=(await api('createRoom',{deckId:deck.id,className:'QA concurrency',maxGroups:8})).room;
try{
 const nonce=randomUUID(),join=await api('join',{roomId:room.id,members:'00001 00002',joinNonce:nonce},true),creds={roomId:room.id,groupId:join.groupId,token:join.token};
 const repeat=await api('join',{roomId:room.id,members:'00001 00002',joinNonce:nonce},true);assert.equal(repeat.groupId,join.groupId);assert.equal(Object.keys((await api('teacherState',{roomId:room.id})).room.groups).length,1);results.push('Lost join response retries to the same group.');
 await assert.rejects(()=>api('join',{roomId:room.id,members:'00001 00003',joinNonce:randomUUID()},true),e=>e.status===409);results.push('A member cannot join on a second device.');
 room=(await api('next',{roomId:room.id,revision:room.revision})).room;
 const wrong=[["She's",'she?'],["Who's",'my','sister.']],attemptId=randomUUID();
 const repeated=await Promise.all(Array.from({length:12},()=>retry(()=>api('submit',{...creds,attemptId,questionIndex:0,revision:room.revision,lines:wrong},true))));assert.ok(repeated.every(x=>x.attempt.number===1));results.push('12 concurrent retries of one submission count exactly once.');
 const burst=await Promise.allSettled(Array.from({length:10},()=>retry(()=>api('submit',{...creds,attemptId:randomUUID(),questionIndex:0,revision:room.revision,lines:wrong},true))));assert.equal(burst.filter(x=>x.status==='fulfilled').length,4);assert.ok(burst.filter(x=>x.status==='rejected').every(x=>x.reason.status===409));assert.equal((await api('studentState',creds,true)).room.group.attempts.length,5);results.push('10 simultaneous new submissions cannot exceed the five-attempt cap.');
 const copied=(await api('saveDeck',{deck:{...deck,id:undefined,version:undefined,name:'QA snapshot and conflict'}})).deck;
 const next=(await api('createRoom',{deckId:copied.id,className:'QA snapshot isolation',maxGroups:2})).room;
 const modified={...copied,questions:copied.questions.map((q,i)=>i===0?{...q,answer:"She's my mother."}:q)};await api('saveDeck',{deck:modified});
 await assert.rejects(()=>api('saveDeck',{deck:copied}),e=>e.status===409);assert.equal((await api('teacherState',{roomId:next.id})).room.questions[0].answer,"She's my sister.");results.push('Concurrent teacher edits reject a stale version; active sessions retain their original question snapshot.');
 await api('end',{roomId:next.id,revision:next.revision});await api('deleteRoom',{roomId:next.id});
 await writeFile(new URL('../qa/unscramble-20260915/concurrency-results.json',import.meta.url),JSON.stringify({passed:true,results,at:new Date().toISOString()},null,2));console.log(results);
}finally{const latest=(await api('teacherState',{roomId:room.id})).room;await api('end',{roomId:room.id,revision:latest.revision});await api('deleteRoom',{roomId:room.id});}
