import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const base='http://127.0.0.1:5192',out=new URL('../qa/unified-unscramble-fastload-20260915/',import.meta.url);await mkdir(out,{recursive:true});
const results=[],failures=[],browserErrors=[];
async function check(name,fn){const start=Date.now();try{await fn();results.push({name,passed:true,ms:Date.now()-start});console.log('PASS',name);}catch(e){results.push({name,passed:false,message:e.message});failures.push(name);throw e;}}
async function api(action,payload={},student=false){const r=await fetch(base+'/api/live-activity',{method:'POST',headers:{'Content-Type':'application/json',...(!student?{Authorization:'Bearer local-teacher'}:{})},body:JSON.stringify({action,...payload})});const d=await r.json();if(!r.ok){const e=new Error(d.message);e.status=r.status;throw e;}return d;}
const browser=await chromium.launch({headless:true,channel:'chrome'});const teacherContext=await browser.newContext({viewport:{width:1440,height:1000}}),teacher=await teacherContext.newPage();
const students=[],contexts=[];let roomId,deck,credentials;
function watch(p){p.on('pageerror',e=>browserErrors.push(e.message));}watch(teacher);
async function clearFeedback(p){await p.evaluate(()=>document.querySelector('.ul-feedback')?.click());}
async function arrange(p,lines){await clearFeedback(p);await p.getByRole('button',{name:'Reset',exact:true}).click();for(let row=0;row<2;row++){await p.getByRole('button',{name:row?'2 · Answer':'1 · Question',exact:true}).click();for(const word of lines[row])await p.getByTestId('wordbank').getByRole('button',{name:word,exact:true}).first().click();}}
async function answer(p,lines){await arrange(p,lines);await p.getByRole('button',{name:'Check answer →',exact:true}).click();}
const correct=i=>[deck.questions[i].prompt.split(' '),deck.questions[i].answer.split(' ')];
const wrong=i=>{const lines=correct(i).map(a=>[...a]);[lines[0][0],lines[1][0]]=[lines[1][0],lines[0][0]];return lines;};
async function getCred(p){return p.evaluate(id=>JSON.parse(localStorage.getItem(`ul-entry:${id}`)),roomId);}
try{
 await check('Teacher-only API rejects an unauthenticated caller',async()=>{await assert.rejects(()=>api('listDecks',{},true),e=>e.status===401);});
 await check('Import seven source images and open saved question set',async()=>{
  await teacher.goto(base+'/unscramble');await teacher.getByRole('button',{name:'載入七題家人題組',exact:true}).click();await expect(teacher.locator('.ul-deck').first()).toBeVisible({timeout:60000});deck=(await api('listDecks')).decks.find(d=>d.id==='family-20260915');assert.equal(deck.questions.length,7);
 });
 await check('Duplicate, rename and replace a picture without modifying the original set',async()=>{
  const card=teacher.locator('.ul-deck').filter({hasText:'家人句型｜七題示範'}).first();await card.getByRole('button',{name:'複製題組',exact:true}).click();await teacher.getByLabel('題組名稱',{exact:true}).fill('QA 明日班級｜換圖副本');
  await teacher.getByLabel('題目圖片',{exact:true}).setInputFiles(new URL('../functions/unscramble-assets/2.png',import.meta.url).pathname.replace(/^\/(\w:)/,'$1'));
  await expect(teacher.getByRole('button',{name:'Next → 設定句子',exact:true})).toBeEnabled({timeout:30000});
  await teacher.getByRole('button',{name:'Next → 設定句子',exact:true}).click();await expect(teacher.getByLabel('問句',{exact:true})).toHaveValue("Who's she?");await teacher.getByRole('button',{name:'儲存題組',exact:true}).click();await expect(teacher.locator('.ul-deck').filter({hasText:'QA 明日班級｜換圖副本'}).first()).toBeVisible({timeout:30000});
  const ds=(await api('listDecks')).decks,copy=ds.find(d=>d.name==='QA 明日班級｜換圖副本');assert.notEqual(copy.id,deck.id);assert.notEqual(copy.questions[0].imageId,deck.questions[0].imageId);assert.equal(ds.find(d=>d.id===deck.id).questions[0].imageId,deck.questions[0].imageId);
 });
 await check('Teacher creates a new ten-group class and QR join link',async()=>{
  await teacher.locator('.ul-deck').filter({hasText:'家人句型｜七題示範'}).first().getByRole('button',{name:'建立新場次 →',exact:true}).click();await teacher.getByLabel('班級名稱',{exact:true}).fill('QA 多巴胺10組驗證');await teacher.getByLabel('組數',{exact:true}).selectOption('10');await teacher.getByRole('button',{name:'建立場次',exact:true}).click();await expect(teacher.locator('.ul-qr img')).toBeVisible();const link=await teacher.getByRole('link',{name:'學生加入連結 ↗'}).getAttribute('href');roomId=new URL(link).searchParams.get('room');assert.ok(roomId);await teacher.screenshot({path:new URL('teacher-lobby.png',out).pathname.replace(/^\/(\w:)/,'$1'),fullPage:true});
 });
 await check('Ten independent student contexts join with two or three identifiers; preview remains locked',async()=>{
  for(let i=0;i<10;i++){const c=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true});contexts.push(c);const p=await c.newPage();students.push(p);watch(p);}
  await Promise.all(students.map(async(p,i)=>{await p.goto(`${base}/join?room=${roomId}`);await p.getByLabel('同組學號').fill(`09${i}01 09${i}02${i%2?' 09'+i+'03':''}`);await p.getByRole('button',{name:'Join activity →'}).click();await expect(p.locator('.ul-lock-note')).toContainText('Wait for your teacher',{timeout:30000});await expect(p.getByRole('button',{name:'Check answer →'})).toBeDisabled();}));
  credentials=await Promise.all(students.map(getCred));const r=(await api('teacherState',{roomId})).room;assert.equal(Object.keys(r.groups).length,10);assert.ok(Object.values(r.groups).some(g=>g.members.length===3));await expect(teacher.locator('.ul-header')).toContainText('10/10',{timeout:15000});
 });
 await check('Duplicate members, eleventh group, cross-group access and teacher mutations are rejected',async()=>{
  await assert.rejects(()=>api('createRoom',{deckId:deck.id,className:'QA invalid cap',maxGroups:11}),e=>e.status===400);
  await assert.rejects(()=>api('join',{roomId,members:'99999',joinNonce:randomUUID()},true),e=>e.status===409);
  await assert.rejects(()=>api('studentState',{...credentials[0],groupId:credentials[1].groupId},true),e=>e.status===403);
  await assert.rejects(()=>api('next',{roomId,revision:0},true),e=>e.status===401);
  const s=(await api('studentState',credentials[0],true)).room;assert.ok(!s.questions&&!s.prompt&&!s.answer);assert.ok(!JSON.stringify(s).includes('tokenHash'));
 });
 await check('Teacher Next unlocks all ten students and pictures are visible',async()=>{
  await teacher.getByRole('button',{name:'Next · 開放作答 →',exact:true}).click();await Promise.all(students.map(p=>expect(p.getByRole('button',{name:'Reset',exact:true})).toBeEnabled({timeout:10000})));await Promise.all(students.map(p=>expect(p.locator('.ul-picture img')).toBeVisible()));
 });
 await check('Wrong animation, correction, five-attempt cap and nine simultaneous correct records',async()=>{
  await answer(students[0],wrong(0));await expect(students[0].locator('.ul-feedback')).toContainText('Try again');await clearFeedback(students[0]);await answer(students[0],correct(0));await expect(students[0].locator('.ul-feedback')).toContainText('Correct!');await clearFeedback(students[0]);
  for(let j=0;j<5;j++){await answer(students[1],wrong(0));await expect(students[1].locator('.ul-attempts')).toContainText(`${j+1} / 5`);await clearFeedback(students[1]);}
  await expect(students[1].getByRole('button',{name:'Check answer →'})).toBeDisabled();await expect(students[1].locator('.ul-lock-note')).toContainText('Five tries');
  await Promise.all(students.slice(2).map(p=>answer(p,correct(0))));await expect(teacher.locator('.ul-group.correct')).toHaveCount(9,{timeout:15000});await expect(teacher.locator('.ul-group.exhausted')).toHaveCount(1);for(const [width,height] of [[1366,768],[1440,1000],[1920,1080]]){await teacher.setViewportSize({width,height});await expect(teacher.locator('.ul-group')).toHaveCount(10);const metrics=await teacher.evaluate(()=>{const q=s=>document.querySelector(s),rect=s=>q(s).getBoundingClientRect(),font=s=>parseFloat(getComputedStyle(q(s)).fontSize);return {picture:rect('.ul-stage .ul-picture').width,records:rect('.ul-teacher>.ul-section').width,members:font('.ul-group>small'),answer:font('.ul-group.correct .ul-answer')};});assert.ok(metrics.picture>metrics.records*1.4);assert.equal(metrics.members,width>=1600?21:height<=850?16.5:18);assert.equal(metrics.answer,width>=1600?30:height<=850?20:23.75);assert.ok(await teacher.locator('.ul-group').evaluateAll(cards=>cards.every(c=>c.getBoundingClientRect().bottom<=innerHeight)),`All ten groups visible at ${width}x${height}`);await teacher.screenshot({path:new URL(`teacher-ten-${width}x${height}.png`,out).pathname.replace(/^\/(\w:)/,'$1'),fullPage:true});}await teacher.screenshot({path:new URL('teacher-live-results.png',out).pathname.replace(/^\/(\w:)/,'$1'),fullPage:true});
 });
 await check('Idempotent retry after a lost response never uses another attempt',async()=>{
  const r=(await api('studentState',credentials[0],true)).room,a=r.group.attempts.at(-1);const d=await api('submit',{...credentials[0],attemptId:a.id,questionIndex:0,revision:1,lines:correct(0)},true);assert.equal(d.attempt.number,2);assert.equal(d.room.group.attempts.length,2);
 });
 await check('Changing the picture locks all tablets, projects prior records and rejects a late answer',async()=>{
  await teacher.getByRole('button',{name:'Next · 下一題圖片 →',exact:true}).click();await Promise.all(students.map(async p=>{await clearFeedback(p);await expect(p.locator('.ul-pill')).toContainText('Q2');await expect(p.getByRole('button',{name:'Reset',exact:true})).toBeDisabled();}));await expect(teacher.locator('.ul-section-title')).toContainText('第 1 題');
  await assert.rejects(()=>api('submit',{...credentials[2],attemptId:randomUUID(),questionIndex:0,revision:1,lines:correct(0)},true),e=>e.status===409);
 });
 await check('Offline draft survives reload, retry writes exactly once and reconnect retains the group',async()=>{
  await teacher.getByRole('button',{name:'Next · 開放作答 →',exact:true}).click();await expect(students[2].getByRole('button',{name:'Reset',exact:true})).toBeEnabled();await arrange(students[2],correct(1));await students[2].reload();await expect(students[2].getByRole('button',{name:'Check answer →'})).toBeEnabled({timeout:20000});
  await contexts[2].setOffline(true);await students[2].getByRole('button',{name:'Check answer →'}).click();await expect(students[2].getByRole('button',{name:'Retry saving · no extra attempt'})).toBeVisible();await students[2].screenshot({path:new URL('student-offline-preserved.png',out).pathname.replace(/^\/(\w:)/,'$1'),fullPage:true});await contexts[2].setOffline(false);
  await expect(students[2].getByRole('button',{name:'Retry saving · no extra attempt'})).toBeEnabled({timeout:20000});await students[2].getByRole('button',{name:'Retry saving · no extra attempt'}).click();await expect(students[2].locator('.ul-attempts')).toContainText('1 / 5');await clearFeedback(students[2]);const r=(await api('studentState',credentials[2],true)).room;assert.equal(r.group.attempts.filter(a=>a.questionIndex===1).length,1);
 });
 await check('Teacher answer masking affects projection only; all seven questions can finish',async()=>{
  await teacher.getByRole('button',{name:'遮蔽答案',exact:true}).click();await expect(teacher.locator('.ul-answer').first()).toContainText('答案已遮蔽');await teacher.getByRole('button',{name:'顯示答案',exact:true}).click();
  for(let i=1;i<7;i++){await expect(students[0].getByRole('button',{name:'Reset',exact:true})).toBeEnabled();await answer(students[0],correct(i));await expect(students[0].locator('.ul-feedback')).toContainText('Correct!');await clearFeedback(students[0]);if(i<6){await teacher.getByRole('button',{name:'Next · 下一題圖片 →',exact:true}).click();await expect(students[0].locator('.ul-pill')).toContainText(`Q${i+2}`);await teacher.getByRole('button',{name:'Next · 開放作答 →',exact:true}).click();}else await teacher.getByRole('button',{name:'Finish · 結束並看紀錄 →',exact:true}).click();}
  await expect(students[0].getByRole('heading',{name:'Great teamwork!'})).toBeVisible();const r=(await api('teacherState',{roomId})).room;assert.equal(r.phase,'ended');assert.equal(r.groups[credentials[0].groupId].attempts.filter(a=>a.correct).length,7);
 });
 await check('CSV export includes membership, all attempts and unanswered items; reload preserves records',async()=>{
  const download=teacher.waitForEvent('download');await teacher.getByRole('button',{name:'匯出 CSV',exact:true}).click();const d=await download;await d.saveAs(new URL('synthetic-records.csv',out).pathname.replace(/^\/(\w:)/,'$1'));await teacher.reload();await teacher.getByRole('button',{name:'開啟紀錄／場次 →'}).first().click();await expect(teacher.locator('.ul-stage-label')).toContainText('CLASS COMPLETE');
 });
 await check('A second class uses a separate room snapshot and cannot access the first class',async()=>{
  const d=(await api('listDecks')).decks.find(d=>d.name==='QA 明日班級｜換圖副本');const other=(await api('createRoom',{deckId:d.id,className:'QA 第二班隔離',maxGroups:8})).room;assert.equal(Object.keys(other.groups).length,0);assert.notEqual(other.questions[0].imageId,deck.questions[0].imageId);
  await assert.rejects(()=>api('studentState',{...credentials[0],roomId:other.id},true),e=>e.status===403);
  await api('end',{roomId:other.id,revision:other.revision});await api('deleteRoom',{roomId:other.id});await assert.rejects(()=>api('teacherState',{roomId:other.id}),e=>e.status===404);assert.equal((await api('teacherState',{roomId})).room.phase,'ended');
 });
 await check('Independent music defaults, volume controls, lecture mute and history dialog',async()=>{
 await teacher.locator('.ul-sound-menu>summary').click();await expect(teacher.getByRole('button',{name:'Background music',exact:true})).toHaveAttribute('aria-pressed','true');await teacher.getByLabel('Music volume',{exact:true}).fill('35');await teacher.getByLabel('Answer volume',{exact:true}).fill('45');await teacher.locator('.ul-sound-menu>summary').click();await teacher.getByRole('button',{name:'◼ 講解靜音',exact:true}).click();await expect(teacher.getByRole('button',{name:'▶ 恢復音效',exact:true})).toHaveAttribute('aria-pressed','true');await teacher.getByRole('button',{name:'▶ 恢復音效',exact:true}).click();
 await students[0].locator('.ul-sound-menu>summary').click();await expect(students[0].getByRole('button',{name:'Background music',exact:true})).toHaveAttribute('aria-pressed','false');await students[0].getByRole('button',{name:'Background music',exact:true}).click();await expect(students[0].getByRole('button',{name:'Background music',exact:true})).toHaveAttribute('aria-pressed','true');await students[0].getByLabel('Music volume',{exact:true}).fill('20');await students[0].locator('.ul-sound-menu>summary').click();
 await teacher.locator('.ul-group footer button').first().click();await expect(teacher.getByRole('dialog',{name:'歷次作答紀錄'})).toBeVisible();await teacher.getByRole('button',{name:'關閉紀錄',exact:true}).click();
 });
 await check('Tablet portrait, landscape and desktop have no horizontal overflow or runtime errors',async()=>{
  for(const [w,h] of [[1024,768],[768,1024],[390,844]]){await students[0].setViewportSize({width:w,height:h});assert.ok(await students[0].evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await students[0].screenshot({path:new URL(`student-${w}x${h}.png`,out).pathname.replace(/^\/(\w:)/,'$1'),fullPage:true});}
  assert.deepEqual(browserErrors,[]);
 });
}catch(e){console.error('FAILED:',e.message);try{await teacher.screenshot({path:new URL('failure-teacher.png',out).pathname.replace(/^\/(\w:)/,'$1'),fullPage:true});for(let i=0;i<Math.min(students.length,3);i++)await students[i].screenshot({path:new URL(`failure-student-${i}.png`,out).pathname.replace(/^\/(\w:)/,'$1'),fullPage:true});}catch{}}
finally{await writeFile(new URL('integration-results.json',out),JSON.stringify({generatedAt:new Date().toISOString(),environment:'local Firebase emulators only',roomId,results,browserErrors,passed:!failures.length},null,2));await browser.close();}
if(failures.length)process.exitCode=1;
