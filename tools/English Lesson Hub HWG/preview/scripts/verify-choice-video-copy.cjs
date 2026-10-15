const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs/promises'),assert=require('assert/strict');
const base='http://127.0.0.1:5194',out='G:/我的雲端硬碟/teacher-toolkit/tools/English Lesson Hub HWG/qa/choice-video-copy-20261011';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const tc=await browser.newContext({viewport:{width:1366,height:900}}),sc=await browser.newContext({viewport:{width:1366,height:768}});
 const teacher=await tc.newPage(),student=await sc.newPage(),errors=[],report={layouts:[]};
 for(const p of [teacher,student])p.on('pageerror',e=>errors.push(e.message));
 try{
  const video=await fs.readFile('G:/我的雲端硬碟/teacher-toolkit/tools/English Lesson Hub HWG/qa/slide-canvas-20261001/synthetic-video.mp4');
  await teacher.route('**/fixture.mp4',r=>r.fulfill({contentType:'video/mp4',body:video}));
  await teacher.goto(base+'/lab');await teacher.getByRole('button',{name:'＋ 建立互動課程'}).waitFor();
  const seed=await teacher.evaluate(async()=>{
   const {api}=await import('/src/live/transport.mjs'),{newBlock}=await import('/src/live/domain.mjs'),{saveAsset}=await import('/src/live/media.mjs'),{slideToQuestion,canvasFor}=await import('/src/live/slide-canvas.mjs'),{parityBlock}=await import('/src/live/parity.mjs');
   const asset=await saveAsset(new File([await (await fetch('/fixture.mp4')).blob()],'QA-video.mp4',{type:'video/mp4'}));
   const direct={...newBlock('choice','direct'),title:'Does she go to school by taxi?',text:'Watch the video and choose.',options:['Yes, she does.',"No, she does not."],answer:[1],media:[asset]};
   const slide={...newBlock('slide','source-slide'),title:'Converted source',text:'Read the question and watch the video.',media:[asset]};delete slide.slideCanvas;slide.slideCanvas=canvasFor(slide);
   const converted={...slideToQuestion(slide,parityBlock(newBlock('choice','converted'))),title:'Does he go to school by bus?',options:['Yes, he does.','No, he does not.'],answer:[1],hidden:false,conversionPending:false};
   const plain={...newBlock('choice','plain'),title:'No video question'};
   const deck={id:crypto.randomUUID(),schemaVersion:2,title:'HWG7 U02 Sentence 02 601',rewardGame:'worldpup',blocks:[direct,converted,plain,{...slide,hidden:true}]};
   const saved=(await api('saveDeck',null,{deck,expectedVersion:0})).deck;return {deck:saved};
  });
  await teacher.reload();await teacher.getByRole('button',{name:'複製並重新命名：HWG7 U02 Sentence 02 601',exact:true}).click();
  await teacher.getByRole('textbox',{name:'新課程名稱',exact:true}).fill('HWG7 U02 Sentence 02 602');
  await teacher.getByRole('button',{name:'複製並開始備課',exact:true}).click();
  await teacher.getByRole('textbox',{name:'課程名稱',exact:true}).waitFor();
  assert.equal(await teacher.getByRole('textbox',{name:'課程名稱',exact:true}).inputValue(),'HWG7 U02 Sentence 02 602');
  let decks=await teacher.evaluate(async()=>{const {api}=await import('/src/live/transport.mjs');return (await api('decks')).decks;});
  const copied=decks.find(d=>d.title.endsWith('602'));assert.ok(copied);assert.notEqual(copied.id,seed.deck.id);assert.deepEqual(copied.blocks,seed.deck.blocks);assert.equal(copied.rewardGame,'worldpup');assert.equal(copied.version,1);
  await teacher.getByLabel('標題',{exact:true}).fill('Copy edited independently');
  await teacher.getByRole('button',{name:'課程庫',exact:true}).click();await teacher.reload();
  decks=await teacher.evaluate(async()=>{const {api}=await import('/src/live/transport.mjs');return (await api('decks')).decks;});
  assert.deepEqual(decks.find(d=>d.id===seed.deck.id),seed.deck);assert.equal(decks.find(d=>d.id===copied.id).blocks[0].title,'Copy edited independently');report.copy={sourceUnchanged:true,hiddenAndMediaPreserved:true,refresh:true,independentEdit:true};
  // Save succeeds on server, but its response is lost. Retry must recover the same ID.
  await teacher.getByRole('button',{name:'複製並重新命名：HWG7 U02 Sentence 02 601',exact:true}).click();await teacher.getByRole('textbox',{name:'新課程名稱',exact:true}).fill('QA retry copy');
  let lost=false;await teacher.route('**/api/live',async route=>{const data=route.request().postDataJSON();if(data.action==='saveDeck'&&data.payload.deck.title==='QA retry copy'&&!lost){lost=true;await route.fetch();await route.abort('failed');}else await route.continue();});
  await teacher.getByRole('button',{name:'複製並開始備課',exact:true}).click();await teacher.getByRole('alert').waitFor();await teacher.unroute('**/api/live');await teacher.getByRole('button',{name:'複製並開始備課',exact:true}).click();await teacher.getByRole('textbox',{name:'課程名稱',exact:true}).waitFor();
  decks=await teacher.evaluate(async()=>{const {api}=await import('/src/live/transport.mjs');return (await api('decks')).decks;});assert.equal(decks.filter(d=>d.title==='QA retry copy').length,1);report.copy.uncertainRetrySingleCopy=true;
  await teacher.getByRole('button',{name:'課程庫',exact:true}).click();await teacher.screenshot({path:out+'/library-copy.png',fullPage:true});
  await teacher.locator('.lh-course-open').filter({hasText:'HWG7 U02 Sentence 02 601'}).click();await teacher.getByRole('button',{name:'學生預覽',exact:true}).click();
  for(const [name,title] of [['direct','Does she go to school by taxi?'],['converted','Does he go to school by bus?']]){
   if(name==='converted')await teacher.locator('.lh-pages button').filter({hasText:title}).click();
   await teacher.locator('.lh-stem-videos video').waitFor();
   const preview=await teacher.evaluate(()=>{const a=document.querySelector('.lh-stem-copy').getBoundingClientRect(),b=document.querySelector('.lh-stem-videos video').getBoundingClientRect();return {textRight:a.right,videoLeft:b.left,videoWidth:b.width};});assert.ok(preview.videoLeft>=preview.textRight);report['preview-'+name]=preview;await teacher.screenshot({path:out+'/preview-'+name+'.png',fullPage:true});
  }
  await teacher.getByRole('button',{name:'課程庫',exact:true}).click();
  const room=await teacher.evaluate(async deck=>{const {api}=await import('/src/live/transport.mjs');const r=await api('create',null,{deck});return await api('control',r.code,{action:'open',revision:r.revision});},seed.deck);
  const code=room.code;
  await student.goto(base+'/lab?join='+code);await student.getByLabel('五位數學號').fill('60101');await student.getByRole('button',{name:'加入課堂',exact:true}).click();await student.locator('.lh-stem-videos video').waitFor();
  for(let index=0;index<2;index++){
   if(index){await teacher.evaluate(async({code,index})=>{const {api}=await import('/src/live/transport.mjs');let r=await api('snapshot',code);r=await api('control',code,{action:'move',index,revision:r.revision});await api('control',code,{action:'open',revision:r.revision});},{code,index});await student.getByRole('heading',{name:'Does he go to school by bus?'}).waitFor();}
   for(const [name,width,height] of [['desktop',1366,768],['ipad',1024,768],['phone',390,844]]){
    await student.setViewportSize({width,height});await student.waitForTimeout(150);
    const dims=await student.evaluate(()=>{const b=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};return {text:b('.lh-choice-video-stem .lh-stem-copy'),video:b('.lh-stem-videos video'),answer:b('.lh-answer'),submit:b('.lh-answer > .lh-primary'),overflow:document.documentElement.scrollWidth>innerWidth};});
    assert.ok(!dims.overflow,JSON.stringify(dims));if(width>700){assert.ok(dims.video.x>dims.text.x+dims.text.width-2);assert.ok(dims.video.width>400);assert.ok(dims.video.height>200);assert.ok(dims.submit.bottom<=dims.answer.bottom);assert.ok(dims.submit.height>=44);}else assert.ok(dims.video.y>=dims.text.bottom-2);
    assert.ok(dims.answer.y>dims.video.y);report.layouts.push({source:index?'converted':'direct',name,...dims});await student.screenshot({path:out+'/'+(index?'converted':'direct')+'-'+name+'.png',fullPage:true});
   }
  }
  await student.setViewportSize({width:1024,height:768});const playback=await student.locator('.lh-stem-videos video').evaluate(async v=>{await v.play();await new Promise(r=>setTimeout(r,350));const playing=!v.paused,time=v.currentTime;v.pause();v.currentTime=Math.min(.5,v.duration/2);return {playing,time,paused:v.paused,seek:v.currentTime,duration:v.duration};});assert.ok(playback.playing&&playback.time>0&&playback.paused&&playback.seek>0);report.playback=playback;
  await student.locator('.lh-options button').first().click();await student.getByRole('button',{name:'提交答案',exact:true}).click();await student.getByText('本次作答已保存，等待老師。',{exact:true}).waitFor();report.submission=true;
  await teacher.evaluate(async code=>{const {api}=await import('/src/live/transport.mjs');let r=await api('snapshot',code);r=await api('control',code,{action:'move',index:2,revision:r.revision});await api('control',code,{action:'open',revision:r.revision});},code);await student.getByRole('heading',{name:'No video question'}).waitFor();assert.equal(await student.locator('.lh-choice-video-stem').count(),0);report.plainUnchanged=true;
  report.pageErrors=errors;assert.deepEqual(errors,[]);report.pass=true;
 }catch(e){report.error=e.stack;await teacher.screenshot({path:out+'/failure-teacher.png',fullPage:true});await student.screenshot({path:out+'/failure-student.png',fullPage:true});process.exitCode=1;}
 finally{await fs.writeFile(out+'/browser-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();}
})();




