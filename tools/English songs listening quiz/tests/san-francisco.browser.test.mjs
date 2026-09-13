import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';import fs from 'node:fs';import assert from 'node:assert/strict';
fs.mkdirSync(new URL('./artifacts/',import.meta.url),{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://localhost:8013/review/san-francisco/practice#song/san-francisco');
 await page.waitForFunction(()=>ready);assert.equal(await page.locator('video#player').count(),1);assert.equal(await page.locator('iframe').count(),0);
 await page.locator('#enableVideo').click();await page.waitForFunction(()=>enabled);await page.locator('#studentId').fill('LOCAL-QA');await page.locator('#start').click();
 await page.evaluate(()=>player.el.playbackRate=8);
 await page.waitForFunction(()=>controller.phase==='answering',{},{timeout:15000});assert.equal(await page.evaluate(()=>player.el.paused),true);
 const right=await page.evaluate(()=>bank.questions[0].answer);await page.locator('#choices button').nth((right+1)%3).click();assert.equal(await page.locator('.choice-wrong').count(),1);
 await page.locator('#replay').click();assert.equal(await page.locator('#choices button').count(),0);await page.waitForFunction(()=>controller.phase==='answering');assert.equal(await page.evaluate(()=>answers[0].attempts.length),1);
 await page.locator('#choices button').nth(right).click();assert.equal(await page.locator('.choice-correct').count(),1);
 for(let i=1;i<16;i++){
  await page.waitForFunction(i=>index===i&&controller.phase==='answering',i,{timeout:15000});
  const answer=await page.evaluate(()=>bank.questions[index].answer);
  if(i===1){await page.locator('#choices button').nth((answer+1)%3).click();await page.locator('#choices button').nth((answer+2)%3).click();}
  else await page.locator('#choices button').nth(answer).click();
 }
 await page.waitForFunction(()=>controller.phase==='outro');assert.equal(await page.evaluate(()=>active),true);
 await page.waitForFunction(()=>!active,{},{timeout:10000});assert.match(await page.locator('#prompt').innerText(),/93.75/);assert.equal(await page.evaluate(()=>summarizeAnswers(answers,16).wrongCount),1);
 await page.locator('#teacherOpen').click();assert.match(await page.locator('#scores').innerText(),/93.75/);
 await page.evaluate(()=>{
  localStorage.clear();const fixtures=[{sessionId:'day1',revision:1,score:25,quizId:'song1',quizTitle:'Song A',studentId:'001',startedAt:'2026-09-12T01:00:00.000Z',recordedAt:'2026-09-13T01:00:00.000Z'},{sessionId:'day2',revision:1,score:50,quizId:'song2',quizTitle:'Song B',studentId:'002',startedAt:'2026-09-12T15:59:59.000Z',recordedAt:'2026-09-14T01:00:00.000Z'},{sessionId:'day3',revision:1,score:100,quizId:'song3',quizTitle:'Song C',studentId:'003',startedAt:'2026-09-12T16:00:00.000Z',recordedAt:'2026-09-13T01:00:00.000Z'}];
  for(const r of fixtures)localStorage.setItem(LOCAL_PREFIX+r.sessionId,JSON.stringify({...r,correctCount:4,wrongCount:0,unansweredCount:12,wrongSentences:'',status:'ended_early',schemaVersion:3}));return listenScores();
 });
 await page.locator('#practiceDate').fill('2026-09-12');await page.locator('#practiceDate').dispatchEvent('change');assert.equal(await page.locator('#scores tr').count(),2);assert.equal(await page.locator('#average').innerText(),'37.50');
 const dl=page.waitForEvent('download');await page.locator('#csv').click();const download=await dl;await download.saveAs(fileURLToPath(new URL('./artifacts/date-test.csv',import.meta.url)));const csv=fs.readFileSync(fileURLToPath(new URL('./artifacts/date-test.csv',import.meta.url)),'utf8');assert.match(csv,/Song A/);assert.match(csv,/Song B/);assert.doesNotMatch(csv,/Song C/);assert.match(download.suggestedFilename(),/2026-09-12/);
 await page.screenshot({path:fileURLToPath(new URL('./artifacts/date-filter.png',import.meta.url)),fullPage:true});
 await page.locator('#nextDate').click();assert.equal(await page.locator('#scores tr').count(),1);assert.equal(await page.locator('#average').innerText(),'100.00');await page.locator('#previousDate').click();assert.equal(await page.locator('#scores tr').count(),2);await page.locator('#todayDate').click();assert.equal(await page.locator('#practiceDate').inputValue(),await page.evaluate(()=>taipeiDate()));
 await page.goto('http://localhost:8013/review/san-francisco');await page.locator('button[data-start]').first().click();await page.waitForTimeout(1000);await page.screenshot({path:fileURLToPath(new URL('./artifacts/review-player.png',import.meta.url)),fullPage:false});
 assert.deepEqual(errors,[]);console.log('PASS actual MP4: activation, all16 pauses, unlimited replay attempt preservation, red/green feedback, second-attempt full credit, 93.75 total, full outro; dates/all songs/CSV/controls; zero page errors');
}finally{await browser.close();}
