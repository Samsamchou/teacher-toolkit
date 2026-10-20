import {mkdirSync} from 'node:fs';
mkdirSync('tests/artifacts',{recursive:true});
import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8').replace(/const configured=[^;]+;/,'const configured=false;');
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('https://www.youtube.com/**',r=>r.abort());
await page.addInitScript(()=>{window.YT={Player:class{constructor(id,opts){this.t=0;this.state=2;this.opts=opts;this.videoId=opts.videoId;this.frame=document.createElement('iframe');setTimeout(()=>opts.events.onReady(),0);}getIframe(){return this.frame}getCurrentTime(){return this.t}getPlayerState(){return this.state}unMute(){}playVideo(){this.state=1;this.opts.events.onStateChange({data:1})}pauseVideo(){this.state=2;this.opts.events.onStateChange({data:2})}seekTo(t){this.t=t}loadVideoById(o){this.t=o.startSeconds;this.playVideo()}}};});
await page.route('http://localhost:8023/**',r=>r.fulfill({body:html,contentType:'text/html'}));
const open=async()=>{await page.goto('about:blank');await page.goto('http://localhost:8023/?quizId=test-massachusetts#song/massachusetts');await page.locator('#enableVideo').click();await page.locator('#studentId').fill('TEST-001');await page.locator('#start').click();};
// 1. bank shape
await page.goto('http://localhost:8023/#grade-6');
assert.match(await page.locator('#grade6Page').innerText(),/Massachusetts[\s\S]*15 題/);
await open();
const info=await page.evaluate(()=>({n:bank.questions.length,id:bank.videoId,song:songName({quizId:'massachusetts-g6-cloze-v1'}),max:document.getElementById('progress').max,sameSentence:bank.questions[3].start===bank.questions[4].start&&bank.questions[3].end===bank.questions[4].end,per:+(100/bank.questions.length).toFixed(2)}));
assert.deepEqual(info,{n:15,id:'QcVfw9mT-Fo',song:'Massachusetts',max:15,sameSentence:true,per:6.67});
// 1b. burned-in YouTube lyrics are hidden by a bottom mask, and the mask exists only for this song
const mask=await page.evaluate(()=>{const m=document.getElementById('captionMask'),v=document.querySelector('#practicePage .video');if(!m)return null;const a=m.getBoundingClientRect(),b=v.getBoundingClientRect();return {pct:Math.round(a.height/b.height*100),bottomGap:Math.round(b.bottom-a.bottom),width:Math.round(a.width/b.width*100)};});
assert.deepEqual(mask,{pct:16,bottomGap:0,width:100});
await page.goto('about:blank');await page.goto('http://localhost:8023/#song/yesterday-once-more');
assert.equal(await page.locator('#captionMask').count(),0);
await open();
// 2. every question: pause at sentence end, then answer correctly; same-sentence pair must show two consecutive questions
const goTo=async t=>page.evaluate(t=>{do{player.t=Math.min(t,player.t+.1);controller.sample(player.t,1);controller.confirmStopped(player.state);}while(player.t<t&&player.state===1);},t);
for(let i=0;i<15;i++){
  const q=await page.evaluate(i=>bank.questions[i],i);
  await goTo(q.end+.01);
  assert.equal(await page.locator('#choices button').count(),3,`question ${i+1} shows 3 choices`);
  assert.equal(await page.evaluate(()=>controller.phase),'answering',`question ${i+1} paused`);
  if(i===4){ // second blank of the same sentence: replay is allowed and keeps attempts
    await page.locator('#replay').click();assert.equal(await page.locator('#choices button').count(),0);await goTo(q.end+.01);
  }
  await page.locator('#choices button').nth(q.answerIndex).click();
  await page.waitForTimeout(1000);
}
await goTo(150);await page.evaluate(()=>{controller.sample(150,0);});
const done=await page.evaluate(()=>({correct:answers.filter(a=>a&&a.outcome==='correct').length,n:answers.length}));
assert.equal(done.correct,15);
assert.match(await page.locator('#prompt').innerText(),/100/);
// 3. same-sentence pair: wrong on first blank must not affect second blank
await open();
for(let i=0;i<3;i++){const q=await page.evaluate(i=>bank.questions[i],i);await goTo(q.end+.01);await page.locator('#choices button').nth(q.answerIndex).click();await page.waitForTimeout(1000);}
const q4=await page.evaluate(()=>bank.questions[3]);
await goTo(q4.end+.01);
await page.locator('#choices button').nth((q4.answerIndex+1)%3).click(); // wrong first try on blank 4
assert.match(await page.locator('#playerStatus').innerText(),/Try again/);
await page.locator('#choices button').nth(q4.answerIndex).click(); // right second try
await page.waitForTimeout(1000);
assert.equal(await page.evaluate(()=>controller.phase),'answering'); // same end time: question 5 appears immediately
assert.equal(await page.evaluate(()=>answers[3].attempts.length),2);
assert.equal(await page.evaluate(()=>(answers[4]?.attempts||[]).length),0); // question 5 starts with fresh attempts
assert.equal(await page.evaluate(()=>controller.index),4);
assert.deepEqual(errors,[]);console.log('PASS Massachusetts route/bank/15 questions, same-sentence double blank, 100 points, replay on second blank');
await browser.close();
