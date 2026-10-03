const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs/promises');const assert=require('node:assert/strict');
const base='http://127.0.0.1:5187';const out='G:/我的雲端硬碟/teacher-toolkit/tools/English Lesson Hub HWG/qa/classroom-media-focus-20260927';
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const tc=await browser.newContext({viewport:{width:1180,height:820}}),sc=await browser.newContext({viewport:{width:1180,height:820}});
 await sc.addInitScript(()=>{window.__sounds=[];const Original=window.Audio;window.Audio=function(...args){const a=new Original(...args);window.__sounds.push(a);return a;};window.Audio.prototype=Original.prototype;});
 const teacher=await tc.newPage(),student=await sc.newPage();const errors=[];for(const p of [teacher,student])p.on('pageerror',e=>errors.push(e.message));
 const report={};
 try{
 await teacher.goto(base+'/lab');
 const fixture=await teacher.evaluate(async()=>{
  const {api}=await import('/src/live/transport.mjs');const {newBlock}=await import('/src/live/domain.mjs');const {parityBlock}=await import('/src/live/parity.mjs');const {saveAsset}=await import('/src/live/media.mjs');
  const c=document.createElement('canvas');c.width=1200;c.height=800;const ctx=c.getContext('2d');const g=ctx.createLinearGradient(0,0,1200,800);g.addColorStop(0,'#eee1ff');g.addColorStop(1,'#ffe36d');ctx.fillStyle=g;ctx.fillRect(0,0,1200,800);ctx.fillStyle='#5120a0';ctx.font='bold 140px sans-serif';ctx.fillText('Monday',260,450);
  const blob=await new Promise(r=>c.toBlob(r,'image/png'));
  const old=await saveAsset(new File([blob],'QA-Monday.png',{type:'image/png'}),{halfSize:false});
  const soundBlob=await (await fetch('/live-games/slot/mixkit-arcade-slot-wheel-1933.wav')).blob();const audio=await saveAsset(new File([soundBlob],'QA-sound.wav',{type:'audio/wav'}));
  const videoBlob=await (await fetch('/qa-focus-video.mp4')).blob();const video=await saveAsset(new File([videoBlob],'QA-video.mp4',{type:'video/mp4'}));
  const slide={...newBlock('slide','video-qa'),title:'Watch the front screen',media:[video],syncVideoId:video.id};
  const choice={...newBlock('choice','choice-qa'),title:'What day is today?',text:'Listen, look, and choose the correct answer.',media:[old,audio]};
  const blank={...parityBlock(newBlock('blank','blank-qa')),title:'Fill in the blank',media:[old,audio]};
  const drag={...parityBlock(newBlock('drag','drag-qa')),title:'Drag the word',media:[old,audio]};
  const deck={id:crypto.randomUUID(),schemaVersion:2,title:'QA 媒體與專注模式',rewardGame:'slot',blocks:[slide,choice,blank,drag]};
  await api('saveDeck',null,{deck,expectedVersion:0});return {deckId:deck.id,old};
 });
 await teacher.reload();await teacher.getByRole('button',{name:/將舊題目圖片縮半/}).click();
 await teacher.getByRole('status').filter({hasText:'已升級'}).waitFor({timeout:30000});
 report.migration=await teacher.evaluate(async id=>{const {api}=await import('/src/live/transport.mjs');const deck=(await api('decks')).decks.find(d=>d.id===id);const a=deck.blocks[1].media[0];const bitmap=await createImageBitmap(await (await fetch('/api/lab-media/'+a.id)).blob());return {width:bitmap.width,height:bitmap.height,asset:a,deck,remainingButton:document.querySelector('.lh-image-upgrade button').disabled};},fixture.deckId);
 assert.equal(report.migration.width,600);assert.equal(report.migration.height,400);assert.equal(report.migration.asset.originalId,fixture.old.originalId);assert.equal(report.migration.asset.sha256,fixture.old.sha256);assert.equal(report.migration.remainingButton,true);assert.ok(report.migration.asset.imageOptimization.playbackBytes<report.migration.asset.imageOptimization.originalBytes);
 await teacher.getByRole('button',{name:/QA 媒體與專注模式/}).click();
 // Select the choice page using the page list's actual title.
 await teacher.locator('.lh-pages button').filter({hasText:'What day is today?'}).click();await teacher.getByRole('button',{name:'學生預覽',exact:true}).click();
 await teacher.locator('.lh-stem-pictures img').waitFor();
 const layout=teacher.locator('.lh-question-layout');await layout.scrollIntoViewIfNeeded();await layout.screenshot({path:out+'/preview-choice.png'});
 report.layout=await layout.evaluate(el=>{const stem=el.querySelector('.lh-split-stem').getBoundingClientRect(),ans=el.querySelector('.lh-answer').getBoundingClientRect(),pic=el.querySelector('.lh-stem-pictures').getBoundingClientRect(),text=el.querySelector('.lh-stem-copy').getBoundingClientRect();return {stemHeight:stem.height,answerHeight:ans.height,imageWidth:pic.width,textWidth:text.width,audioCount:el.querySelectorAll('audio').length,overflow:document.documentElement.scrollWidth>innerWidth};});
 assert.ok(Math.abs(report.layout.answerHeight/report.layout.stemHeight-2)<.08);assert.ok(Math.abs(report.layout.textWidth/report.layout.imageWidth-2)<.08);assert.equal(report.layout.audioCount,1);assert.equal(report.layout.overflow,false);
 await teacher.getByRole('button',{name:'放大圖片：QA-Monday.png',exact:true}).click();await teacher.locator('dialog[open]').waitFor();await teacher.screenshot({path:out+'/image-zoom.png'});await teacher.getByRole('button',{name:'關閉放大圖片'}).click();assert.equal(await teacher.locator('dialog[open]').count(),0);
 await teacher.getByRole('button',{name:'回編輯',exact:true}).click();await teacher.getByRole('button',{name:'檢查並開始 Teacher-led →',exact:true}).click();await teacher.getByRole('button',{name:'開始上課',exact:true}).click();
 const code=await teacher.evaluate(()=>sessionStorage.getItem('hub-lab-active-room'));
 await student.goto(base+'/lab?join='+code);await student.getByLabel('五位數學號').fill('50101');await student.getByRole('button',{name:'加入課堂',exact:true}).click();
 await teacher.getByRole('button',{name:'▶ 準備觀看／載入影片',exact:true}).click();await teacher.getByRole('button',{name:'▶ 播放影片（學生看前方）',exact:true}).click();
 await student.getByRole('heading',{name:'Eyes Up Front',exact:true}).waitFor();await teacher.waitForTimeout(3500);
 report.video={after3Seconds:await teacher.locator('video[aria-label="教材影片"]').evaluate(v=>({time:v.currentTime,paused:v.paused}))};assert.ok(report.video.after3Seconds.time>3);assert.equal(report.video.after3Seconds.paused,false);
 await teacher.getByRole('button',{name:'回到活動',exact:true}).click();await student.getByRole('heading',{name:'Eyes Up Front',exact:true}).waitFor({state:'hidden'});await teacher.getByRole('button',{name:'Eyes Up Front',exact:true}).click();assert.equal(await teacher.locator('video[aria-label="教材影片"]').evaluate(v=>v.paused),false);
 await teacher.getByRole('button',{name:'⏸ 暫停影片',exact:true}).click();await student.getByRole('heading',{name:'Eyes Up Front',exact:true}).waitFor();await student.locator('.lh-focus-screen').screenshot({path:out+'/student-focus.png'});
 await teacher.getByRole('button',{name:'▶ 播放影片（學生看前方）',exact:true}).click();await teacher.waitForFunction(()=>document.querySelector('video[aria-label="教材影片"]')?.ended,{timeout:18000});assert.equal(await student.getByRole('heading',{name:'Eyes Up Front',exact:true}).count(),1);report.video.endedStillFocused=true;
 await teacher.getByRole('button',{name:'下一頁',exact:true}).click();await teacher.getByRole('button',{name:'開放作答',exact:true}).click();await student.locator('.lh-question-layout .lh-options').waitFor();assert.equal(await student.getByRole('heading',{name:'Eyes Up Front',exact:true}).count(),0);
 await student.locator('.lh-question-layout').screenshot({path:out+'/student-choice.png'});assert.equal(await student.locator('.lh-question-layout audio').count(),1);
 await student.locator('.lh-question-layout audio').evaluate(a=>a.play());await student.waitForTimeout(300);assert.ok(await student.locator('.lh-question-layout audio').evaluate(a=>a.currentTime>0));await student.locator('.lh-question-layout audio').evaluate(a=>a.pause());
 await student.getByRole('button',{name:'A. Monday',exact:true}).click();await student.getByRole('button',{name:'提交答案',exact:true}).click();await student.getByRole('button',{name:'拉霸 SPIN',exact:true}).waitFor();await student.getByRole('button',{name:'拉霸 SPIN',exact:true}).click();await student.waitForTimeout(700);
 report.slot={during:await student.evaluate(()=>window.__sounds.filter(a=>a.src.includes('1933')).map(a=>({paused:a.paused,time:a.currentTime,volume:a.volume,loop:a.loop})))};assert.ok(report.slot.during.some(a=>!a.paused&&a.time>0));
 await student.waitForTimeout(3500);assert.ok((await student.locator('.lh-slot-award strong').innerText()).startsWith('+'));report.slot.after=await student.evaluate(()=>window.__sounds.filter(a=>a.src.includes('1933')).map(a=>({paused:a.paused,time:a.currentTime})));assert.ok(report.slot.after.every(a=>a.paused));
 await student.locator('.lh-reward').screenshot({path:out+'/slot-result.png'});await student.getByLabel('減少動畫',{exact:true}).check();assert.equal(await student.locator('.lh-slot-award strong').evaluate(e=>getComputedStyle(e).animationName),'none');
 await student.getByLabel('靜音',{exact:true}).check();await student.getByRole('button',{name:'拉霸 SPIN',exact:true}).click();await student.waitForTimeout(500);assert.ok(await student.evaluate(()=>window.__sounds.filter(a=>a.src.includes('1933')).every(a=>a.paused)));report.slot.muteAndReducedMotion=true;
 await student.waitForTimeout(3000);
 report.answerModes={};
 for(const mode of ['blank','drag']){
  await teacher.getByRole('button',{name:'下一頁',exact:true}).click();await teacher.getByRole('button',{name:'開放作答',exact:true}).click();
  await student.locator('.lh-parity-question[data-question-type="'+mode+'"]').waitFor();
  await student.locator('.lh-question-layout').screenshot({path:out+'/student-'+mode+'.png'});
  report.answerModes[mode]=await student.locator('.lh-question-layout').evaluate(el=>({image:el.querySelectorAll('.lh-stem-pictures img').length,audio:el.querySelectorAll('audio').length,overflow:document.documentElement.scrollWidth>innerWidth}));
  assert.equal(report.answerModes[mode].image,1);assert.equal(report.answerModes[mode].audio,1);assert.equal(report.answerModes[mode].overflow,false);
  if(mode==='blank')await student.getByLabel('空格 1',{exact:true}).fill('test');
  else {await student.locator('.lh-token-pool button').first().click();await student.locator('.lh-blank-target').first().click();assert.notEqual(await student.locator('.lh-blank-target').first().innerText(),'拖曳或點選答案');}
 }
 await student.setViewportSize({width:390,height:844});await student.screenshot({path:out+'/student-phone.png'});assert.equal(await student.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);report.errors=errors;report.status='PASS';delete report.migration.deck;await fs.writeFile(out+'/browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }catch(e){await teacher.screenshot({path:out+'/failure-teacher.png'}).catch(()=>{});await student.screenshot({path:out+'/failure-student.png'}).catch(()=>{});console.error(e);process.exitCode=1;}finally{await browser.close();}
})();
