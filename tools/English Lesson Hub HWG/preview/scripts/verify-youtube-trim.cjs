const { chromium } = require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.SLIDE_QA_BASE || 'http://127.0.0.1:5192';
const out = process.env.SLIDE_QA_OUT || 'G:/我的雲端硬碟/teacher-toolkit/tools/English Lesson Hub HWG/qa/slide-canvas-youtube-trim-20261001';
const name = 'Comic Relief 與 YouTube 修剪 QA ' + Date.now();
const report = { passed: false, checks: [], fonts: [], fontRequests: [], youtube: 'Synthetic IFrame API fixture; actual YouTube playback requires teacher acceptance', pageErrors: [], viewports: [] };
function fakeYouTube() {
  window.__ytPlayers = [];
  class Player {
    constructor(host, config) {
      this.config=config;this.time=0;this.state=-1;this.end=null;this.alive=true;this.queuedStart=null;this.seeks=0;
      this.frame=document.createElement('iframe');this.frame.title='YouTube QA preview';this.frame.srcdoc='<body style="margin:0;background:#143954;color:white;display:grid;place-items:center;height:100vh;font-family:sans-serif"><p>Synthetic YouTube preview · 02:57</p></body>';
      host.replaceWith(this.frame);window.__ytPlayers.push(this);
      this.timer=setInterval(()=>{if(this.state===1){this.time+=.02;if(this.end!==null&&this.time>=this.end){this.time=this.end;this.emit(0);}}},20);
      setTimeout(()=>config.events.onReady({target:this}),0);
    }
    emit(state){this.state=state;this.config.events.onStateChange({data:state,target:this});}
    cueVideoById({startSeconds=0,endSeconds}){this.time=0;this.queuedStart=startSeconds;this.end=endSeconds??null;this.emit(5);}
    loadVideoById(values){this.cueVideoById(values);this.playVideo();}
    playVideo(){if(this.queuedStart!==null){this.time=this.queuedStart;this.queuedStart=null;}if(this.state!==1)this.emit(1);}
    pauseVideo(){if(this.state!==2)this.emit(2);}
    seekTo(seconds){this.time=seconds;this.end=null;this.seeks++;}
    getCurrentTime(){return this.time;}
    getPlayerState(){return this.state;}
    getDuration(){return 177;}
    destroy(){this.alive=false;clearInterval(this.timer);this.frame.remove();}
  }
  window.YT={Player,PlayerState:{PLAYING:1,PAUSED:2,ENDED:0}};
}
let browser,page;
(async()=>{
  await fs.mkdir(out,{recursive:true});
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const context=await browser.newContext({viewport:{width:1440,height:1050}});await context.addInitScript(fakeYouTube);
  page=await context.newPage();page.on('pageerror',e=>report.pageErrors.push(e.message));page.on('dialog',d=>d.accept());
  page.on('response',r=>{if(/comic-relief.*\.woff2/.test(r.url()))report.fontRequests.push({url:r.url(),status:r.status()});});
  await page.goto(base+'/lab');await page.getByRole('button',{name:'＋ 建立互動課程'}).click();await page.getByLabel('新課程名稱').fill(name);await page.getByRole('button',{name:'建立並開始備課'}).click();
  async function readDeck(){return page.evaluate(async title=>{const{api}=await import('/src/live/transport.mjs');return(await api('decks')).decks.find(d=>d.title===title);},name);}
  async function saved(predicate){for(let i=0;i<70;i++){const d=await readDeck();if(d&&predicate(d))return d;await page.waitForTimeout(150);}throw new Error('Autosave readback did not match');}
  async function font(selector,label){
    await page.evaluate(async()=>{await document.fonts.load('400 48px "Comic Relief"');await document.fonts.load('700 48px "Comic Relief"');await document.fonts.ready;});
    const c=await context.newCDPSession(page);await c.send('DOM.enable');await c.send('CSS.enable');const{root}=await c.send('DOM.getDocument');const{nodeId}=await c.send('DOM.querySelector',{nodeId:root.nodeId,selector});
    const actual=await c.send('CSS.getPlatformFontsForNode',{nodeId});assert.ok(actual.fonts.length>0);assert.ok(actual.fonts.every(f=>f.isCustomFont&&/Comic.?Relief/i.test(f.familyName)),label+': actual glyph fonts must be Comic Relief');report.fonts.push({label,...actual});await c.detach();
  }
  const editable=page.getByRole('textbox',{name:'畫布文字',exact:true});
  await page.getByRole('button',{name:'A 新增文字',exact:true}).click();await editable.fill("Let's watch.");
  await saved(d=>d.blocks[0].slideCanvas.elements[0]?.runs.map(r=>r.text).join('')==="Let's watch.");
  await editable.evaluate(root=>{root.focus();const n=root.firstChild.firstChild,range=document.createRange();range.setStart(n,6);range.setEnd(n,11);window.getSelection().removeAllRanges();window.getSelection().addRange(range);});
  await page.waitForTimeout(80);
  await page.getByRole('button',{name:'粗體文字',exact:true}).click();await page.getByLabel('畫布文字字級').selectOption('80');
  await saved(d=>d.blocks[0].slideCanvas.elements[0].runs.some(r=>r.text==='watch'&&r.bold&&r.size===80));
  await font('.sc-editable>span:first-child','editor regular');await font('.sc-editable>span:nth-child(2)','editor bold');
  await page.getByRole('button',{name:'投影預覽',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);
  await font('.sc-viewport:fullscreen .sc-text>span:first-child','projection regular');await font('.sc-viewport:fullscreen .sc-text>span:nth-child(2)','projection bold');
  await page.screenshot({path:path.join(out,'comic-relief-projection.png')});await page.getByRole('button',{name:'結束投影',exact:true}).click();report.checks.push('actual Comic Relief regular/bold glyphs in editor and fullscreen; self-hosted font requests return 200');
  await page.getByRole('button',{name:'▶ 影片／簡報',exact:true}).click();await page.getByLabel('畫布影片或簡報連結').fill('https://youtu.be/M7lc1UVf-VE');await page.getByRole('button',{name:'加入畫布',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'修剪 YouTube 影片',exact:true});await dialog.waitFor();await page.getByLabel('結束時間分鐘').fill('0');await page.getByLabel('結束時間秒數').fill('4');assert.equal(await page.getByRole('button',{name:'套用修剪',exact:true}).isEnabled(),false);
  await page.getByLabel('結束時間秒數').fill('5');assert.equal(await page.getByRole('button',{name:'套用修剪',exact:true}).isEnabled(),true);
  await page.getByLabel('開始時間分鐘').fill('1');await page.getByLabel('開始時間秒數').fill('23');await page.getByLabel('結束時間分鐘').fill('3');await page.getByLabel('結束時間秒數').fill('0');assert.equal(await page.getByRole('button',{name:'套用修剪',exact:true}).isEnabled(),false);
  await page.getByLabel('結束時間分鐘').fill('1');await page.getByLabel('結束時間秒數').fill('30');
  async function dragHandle(label,value,delta){const box=await page.getByLabel(label,{exact:true}).boundingBox(),x=box.x+11+value/177*(box.width-22),y=box.y+box.height/2;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+delta,y,{steps:10});await page.mouse.up();}
  await dragHandle('片段起點滑桿',83,-85);assert.ok(Number(await page.getByLabel('片段起點滑桿').inputValue())<80);await page.getByLabel('開始時間分鐘').fill('1');await page.getByLabel('開始時間秒數').fill('23');
  await dragHandle('片段終點滑桿',90,85);assert.ok(Number(await page.getByLabel('片段終點滑桿').inputValue())>93);await page.getByLabel('結束時間分鐘').fill('1');await page.getByLabel('結束時間秒數').fill('30');
  report.checks.push('both timeline handles respond to pointer dragging and update minute/second fields');
  assert.match(await dialog.innerText(),/01:23 → 01:30 · 共 7 秒/);assert.equal(await page.evaluate(()=>window.__ytPlayers.filter(p=>p.alive).at(-1).seeks),0);await page.getByRole('button',{name:'▶ 預覽片段',exact:true}).click();
  const now=await page.evaluate(()=>window.__ytPlayers.filter(p=>p.alive).at(-1).getCurrentTime());assert.ok(now>=83&&now<84);
  await page.evaluate(()=>window.__ytPlayers.filter(p=>p.alive).at(-1).seekTo(91));await page.waitForFunction(()=>{const p=window.__ytPlayers.filter(p=>p.alive).at(-1);return p.getPlayerState()===2&&Math.abs(p.getCurrentTime()-90)<.1;});
  report.checks.push('automatic trim dialog; four seconds rejected, five accepted, duration overflow rejected; seek cannot escape clip end');
  for(const width of [1440,820,390]){await page.setViewportSize({width,height:1050});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.equal(await dialog.evaluate(e=>e.scrollWidth>e.clientWidth+1),false);await page.screenshot({path:path.join(out,'trim-'+width+'.png')});report.viewports.push(width);}
  await page.setViewportSize({width:1440,height:1050});await page.getByRole('button',{name:'套用修剪',exact:true}).click();
  let deck=await saved(d=>d.blocks[0].slideCanvas.elements.some(e=>e.trim?.start===83&&e.trim?.end===90));const source=JSON.stringify(deck.blocks[0]);
  await page.reload();await page.getByRole('button').filter({hasText:name}).click();await page.getByRole('button',{name:'選取影片或簡報物件',exact:true}).click();await page.getByRole('button',{name:'✂ 修剪影片',exact:true}).click();assert.equal(await page.getByLabel('開始時間分鐘').inputValue(),'1');assert.equal(await page.getByLabel('開始時間秒數').inputValue(),'23');assert.equal(await page.getByLabel('結束時間秒數').inputValue(),'30');
  await page.getByLabel('結束時間秒數').fill('40');await page.getByRole('button',{name:'套用修剪',exact:true}).click();await saved(d=>d.blocks[0].slideCanvas.elements.some(e=>e.trim?.end===100));
  await page.getByRole('button',{name:'↶ 復原',exact:true}).click();await saved(d=>d.blocks[0].slideCanvas.elements.some(e=>e.trim?.end===90));
  await page.getByRole('button',{name:'轉成題目',exact:true}).click();await page.getByRole('button',{name:'建立題目副本',exact:true}).click();deck=await saved(d=>d.blocks.length===2);assert.equal(JSON.stringify(deck.blocks[0]),source);assert.deepEqual(deck.blocks[1].questionCanvas.elements.find(e=>e.trim).trim,{start:83,end:90});
  await page.getByRole('button',{name:'學生預覽',exact:true}).click();await font('.sc-question-stem .sc-text>span:first-child','student regular');await font('.sc-question-stem .sc-text>span:nth-child(2)','student bold');assert.match(await page.locator('.sc-question-stem').innerText(),/01:23–01:30/);await page.screenshot({path:path.join(out,'student-trim-preview.png')});await page.getByRole('button',{name:'回編輯',exact:true}).click();report.checks.push('saved minutes/seconds persist across reload, re-edit and undo; question copy retains the range and original content');
  await page.locator('.lh-pages>button').first().click();await page.getByRole('button',{name:'選取影片或簡報物件',exact:true}).click();await page.getByRole('button',{name:'✂ 修剪影片',exact:true}).click();await page.getByRole('button',{name:'使用完整影片',exact:true}).click();await saved(d=>!d.blocks[0].slideCanvas.elements.find(e=>e.kind==='embed').trim);await page.getByRole('button',{name:'↶ 復原',exact:true}).click();deck=await saved(d=>d.blocks[0].slideCanvas.elements.some(e=>e.trim?.end===90));report.checks.push('full-video action and undo preserve the link and restore trimming');
  const room=await page.evaluate(async deck=>{const{api}=await import('/src/live/transport.mjs');const r=await api('create',null,{deck});sessionStorage.setItem('hub-lab-active-room',r.code);return r;},deck);
  await page.reload();await page.getByRole('button',{name:'開始上課',exact:true}).click();await page.getByRole('button',{name:'▶ 準備觀看／載入影片',exact:true}).click();await page.getByRole('button',{name:'▶ 播放影片（學生看前方）',exact:true}).click();
  const snapshot=()=>page.evaluate(async code=>{const{api}=await import('/src/live/transport.mjs');return api('snapshot',code);},room.code);
  let snap=await snapshot();assert.ok(snap.video.position>=83&&snap.video.position<84);
  await page.getByLabel('跳至秒數',{exact:true}).fill('999');await page.getByRole('button',{name:'更新播放位置',exact:true}).click();await page.waitForFunction(()=>window.__ytPlayers.filter(p=>p.alive).at(-1).getPlayerState()!==1);snap=await snapshot();assert.equal(snap.video.position,90);assert.equal(snap.video.playing,false);
  await page.getByRole('button',{name:'▶ 播放影片（學生看前方）',exact:true}).click();await page.waitForFunction(()=>window.__ytPlayers.filter(p=>p.alive).at(-1).getPlayerState()===1);await page.evaluate(()=>window.__ytPlayers.filter(p=>p.alive).at(-1).seekTo(91));await page.waitForFunction(()=>window.__ytPlayers.filter(p=>p.alive).at(-1).getPlayerState()===2);
  await page.waitForTimeout(500);snap=await snapshot();assert.equal(snap.video.playing,false);assert.equal(snap.video.position,90);report.checks.push('classroom play starts at 01:23, out-of-range seek stops at 01:30, replay restarts and native completion publishes pause');
  assert.deepEqual(report.pageErrors,[]);assert.ok(report.fontRequests.filter(r=>r.status===200).length>=2&&report.fontRequests.every(r=>[200,304].includes(r.status)));report.passed=true;report.deckId=deck.id;
  await fs.writeFile(path.join(out,'browser-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(async error=>{report.error=error.stack;await fs.mkdir(out,{recursive:true});if(page)await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});await fs.writeFile(path.join(out,'browser-results.json'),JSON.stringify(report,null,2));console.error(error.stack);process.exitCode=1;}).finally(async()=>{await browser?.close();});
