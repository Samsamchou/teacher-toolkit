// Isolated browser playback. Does not use the user's profile or sign-in state.
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
let playwright;
try{playwright=require(process.env.PLAYWRIGHT_MODULE||'playwright')}catch{playwright=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')}
const base=path.resolve(process.argv[2]||'.');
(async()=>{
 const browser=await playwright.chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--allow-file-access-from-files','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(path.join(base,'preview.html')).href);
  await page.waitForFunction(()=>document.querySelector('video').readyState>=2);
  const meta=await page.locator('video').evaluate(v=>({width:v.videoWidth,height:v.videoHeight,duration:v.duration,error:v.error}));
  await page.locator('video').evaluate(v=>{v.muted=true;return v.play()});
  await page.waitForFunction(()=>document.querySelector('video').currentTime>=Math.min(10,document.querySelector('video').duration-1),null,{timeout:20000});
  const played=await page.locator('video').evaluate(v=>!v.paused&&v.playbackRate===1&&v.currentTime>0&&!v.error);
  const buttons=page.locator('button[data-t]'),count=await buttons.count(),jumps=[];
  for(let n=0;n<count;n++){
   const b=buttons.nth(n),target=Number(await b.getAttribute('data-t'));await b.click();
   await page.waitForFunction(()=>!document.querySelector('video').seeking);
   jumps.push(await page.locator('video').evaluate((v,t)=>({target:t,actual:v.currentTime,playing:!v.paused}),target));
  }
  await page.locator('video').evaluate(v=>{v.currentTime=v.duration-.4;return v.play()});
  await page.waitForFunction(()=>document.querySelector('video').ended,null,{timeout:5000});
  const ended=await page.locator('video').evaluate(v=>v.ended&&!v.error);
  await page.locator('video').evaluate(v=>{v.pause();v.currentTime=Math.min(5,v.duration/2)});await page.waitForFunction(()=>!document.querySelector('video').seeking);
  await page.screenshot({path:path.join(base,'browser-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(base,'browser-mobile.png'),fullPage:true});
  const mobile=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
  const timeline=JSON.parse(fs.readFileSync(path.join(base,'timeline.json'),'utf8'));
  const checks={video_1080p:meta.width===1920&&meta.height===1080,duration_matches:Math.abs(meta.duration-timeline.duration_sec)<.05,
   actual_1x_playback:played,all_word_jumps:count===timeline.utterances/2&&jumps.every(j=>j.playing&&Math.abs(j.target-j.actual)<.5),
   ending:ended,no_errors:!meta.error&&!errors.length,mobile_no_overflow:mobile};
  const report={checks,passed:Object.values(checks).every(Boolean),meta,jumps,errors,method:'Muted 1x playback up to 10s, all word jumps, ending and responsive screenshots; human listening is separate.'};
  fs.writeFileSync(path.join(base,'QA-browser.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({checks,passed:report.passed}));if(!report.passed)process.exitCode=1;
 }finally{await browser.close()}
})().catch(e=>{console.error(e.message);process.exitCode=1});
