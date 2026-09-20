import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {pathToFileURL} from 'node:url';

async function loadPlaywright(){
 try{return await import('playwright');}
 catch(error){
  const fallback=process.env.PLAYWRIGHT_MODULE_PATH;
  if(!fallback)throw error;
  return import(pathToFileURL(fallback).href);
 }
}

const root=fileURLToPath(new URL('..',import.meta.url));
const html=fs.readFileSync(root+'/public/index.html','utf8');
const core=html.match(/<script id="quiz-core">([\s\S]*?)<\/script>/)?.[1];
assert.ok(core,'找不到 quiz-core');
assert.doesNotMatch(html,/\bcrypto\.randomUUID\s*\(/,'所有 session／Firestore 文件 ID 都必須改用 safeUuid()，舊 Safari 才能完成作答與上傳');

const {chromium}=await loadPlaywright();
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1024,height:768},hasTouch:true});
try{
 await page.setContent('<main><div id="player"></div></main>');
 await page.evaluate(()=>{Element.prototype.replaceChildren=function(){};});
 await page.addScriptTag({content:core+`;globalThis.__ipadRecoveryApi={
  NativeVideoAdapter,PlaybackRecovery,SegmentController,safeUuid,browserMajors,
  buildPlaybackDiagnostic:typeof buildPlaybackDiagnostic==='function'?buildPlaybackDiagnostic:
   (typeof createPlaybackDiagnostic==='function'?createPlaybackDiagnostic:null)
 };`});
 assert.equal(await page.evaluate(()=>{const probe=document.createElement('div');probe.appendChild(document.createElement('span'));probe.replaceChildren();return probe.childNodes.length;}),0,'舊 Safari 的損壞 replaceChildren 必須被行為偵測與 fallback 修正');

 const uuid=await page.evaluate(()=>{
  Object.defineProperty(globalThis.crypto,'randomUUID',{value:undefined,configurable:true});
  return __ipadRecoveryApi.safeUuid();
 });
 assert.match(uuid,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

 const playingState=await page.evaluate(()=>new Promise(resolve=>{
  const adapter=new __ipadRecoveryApi.NativeVideoAdapter('player','/primary.mp4',{
   onStateChange:event=>resolve(event.data)
  });
  Object.defineProperty(adapter.el,'readyState',{get:()=>2,configurable:true});
  adapter.el.dispatchEvent(new Event('playing'));
 }));
 assert.equal(playingState,1,'playing 事件不得因 readyState=2 被誤報為 buffering');

 const recovery=await page.evaluate(()=>{
  const diagnostics=[];
  const state=new __ipadRecoveryApi.PlaybackRecovery({
   primarySource:'primary',fallbackSource:'ipad_fallback',maxPrimaryRetries:1,
   onDiagnostics:event=>diagnostics.push(event)
  });
  return {
   first:state.handleFailure('stall_timeout'),
   second:state.handleFailure('stall_timeout'),
   third:state.handleFailure('stall_timeout'),
   diagnostics
  };
 });
 assert.deepEqual(recovery.first,{action:'retry_primary',sourceKey:'primary',reason:'stall_timeout'});
 assert.deepEqual(recovery.second,{action:'switch_fallback',sourceKey:'ipad_fallback',reason:'stall_timeout'});
 assert.deepEqual(recovery.third,{action:'manual_resume',sourceKey:'ipad_fallback',reason:'stall_timeout'});
 assert.equal(recovery.diagnostics.length,3);

 const resumed=await page.evaluate(()=>{
  const calls=[];
  const player={
   loadVideoById:()=>{},playVideo:()=>calls.push(['play']),pauseVideo:()=>calls.push(['pause']),
   seekTo:value=>calls.push(['seek',value])
  };
  const controller=new __ipadRecoveryApi.SegmentController(player,()=>{});
  controller.questions=[{start:4.46,end:12.84},{start:13.68,end:20.02}];
  controller.index=1;controller.phase='listening';controller.last=18.5;
  const answers=[{attempts:[0],outcome:'pending'}];
  const before=JSON.stringify(answers);
  controller.block('stall_timeout');controller.resume();
  return {calls,before,after:JSON.stringify(answers),resumeAt:controller.resumeAt};
 });
 assert.equal(resumed.resumeAt,13.68);
 assert.ok(resumed.calls.some(call=>call[0]==='seek'&&call[1]===13.68),'復原時必須 seek 到目前題目的 start');
 assert.equal(resumed.after,resumed.before,'播放器復原不得改變已使用的作答次數');

 const diagnostic=await page.evaluate(()=>{
  const builder=__ipadRecoveryApi.buildPlaybackDiagnostic;
  if(!builder)return null;
  return builder({
   quizId:'san-francisco-g6-cloze-v1',mediaSource:'ipad_fallback',stage:'question_playback',
   code:'stall_timeout',recovery:'switch_fallback',outcome:'recovered',
   studentId:'60208',ip:'192.0.2.10',cookie:'secret',userAgent:navigator.userAgent,
   error:new Error('raw network message')
  });
 });
 assert.ok(diagnostic,'quiz-core 必須提供 buildPlaybackDiagnostic()，讓隱私欄位可集中白名單化');
 const diagnosticText=JSON.stringify(diagnostic);
 for(const forbidden of ['60208','192.0.2.10','secret','raw network message','Mozilla/']){
  assert.equal(diagnosticText.includes(forbidden),false,`診斷 payload 不得包含 ${forbidden}`);
 }
 for(const forbiddenKey of ['studentId','ip','cookie','userAgent','error','message']){
  assert.equal(Object.hasOwn(diagnostic,forbiddenKey),false,`診斷 payload 不得含 ${forbiddenKey}`);
 }

 console.log('PASS iPad recovery: safe UUID fallback, readyState=2 activation, one primary retry then iPad fallback, question-start resume, attempts preserved, privacy-safe diagnostics');
}finally{
 await browser.close();
}
