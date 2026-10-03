const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
async function main(){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'live-video-qa-')),video=path.join(root,'synthetic.mp4');
  const fixture=spawnSync('ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=blue:s=1600x900:r=10','-f','lavfi','-i','sine=frequency=440:sample_rate=44100','-t','1','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',video],{windowsHide:true});assert.equal(fixture.status,0);
  const r=await fetch('http://127.0.0.1:5183/api/lab-media',{method:'POST',headers:{'Content-Type':'video/mp4'},body:await fs.readFile(video)});const media=await r.json();assert.equal(r.status,200,JSON.stringify(media));assert.ok(media.posterId);assert.ok(media.originalId);
  const output=path.join(root,'playback.mp4');await fs.writeFile(output,Buffer.from(await (await fetch(`http://127.0.0.1:5183/api/lab-media/${media.id}`)).arrayBuffer()));
  const probe=spawnSync('ffprobe',['-v','error','-show_entries','stream=codec_name,width,height','-of','json',output],{encoding:'utf8',windowsHide:true});const streams=JSON.parse(probe.stdout).streams;
  assert.equal(streams[0].codec_name,'h264');assert.ok(streams[0].height<=720);assert.equal(streams[1].codec_name,'aac');
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
  const context=await browser.newContext({viewport:{width:1440,height:1000},permissions:['microphone']});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.goto('http://127.0.0.1:5183/lab');await page.getByRole('button',{name:'＋ 建立互動課程'}).click();
    await page.getByText('文字樣式與進階配置',{exact:true}).click();await page.getByText('進階文字與自由畫布',{exact:true}).click();await page.getByRole('button',{name:'加入畫布文字'}).click();await page.getByLabel('物件文字',{exact:true}).fill('Move me');
    await page.getByLabel('水平位置',{exact:true}).fill('25');await page.getByRole('button',{name:'畫布物件 Move me'}).press('ArrowRight');
    await page.getByRole('button',{name:'學生預覽',exact:true}).click();await page.getByText('Move me',{exact:true}).waitFor();await page.screenshot({path:path.join(root,'advanced-canvas.png'),fullPage:true});
    await page.getByRole('button',{name:'回編輯',exact:true}).click();await page.getByLabel('新增題型').selectOption('audio');await page.getByRole('button',{name:'＋',exact:true}).click();await page.getByLabel('目標朗讀句',{exact:true}).fill('Hello, everyone.');
    await page.getByRole('status').filter({hasText:'已儲存'}).waitFor();await page.getByRole('button',{name:'檢查並開始 Teacher-led →'}).click();const join=await page.getByRole('link',{name:'開學生入口'}).getAttribute('href');
    const student=await browser.newContext({permissions:['microphone']}),s=await student.newPage();await s.goto(join);await s.getByLabel('五位數學號').fill('50102');await s.getByRole('button',{name:'加入課堂'}).click();
    await page.getByRole('button',{name:'開始上課',exact:true}).click();await page.getByText(/第 1 \/ 2 頁 · content/).waitFor();await page.getByRole('button',{name:'下一頁',exact:true}).click();await page.getByText(/第 2 \/ 2 頁/).waitFor();await page.getByRole('button',{name:'開放作答',exact:true}).click();
    await s.getByRole('button',{name:'開始錄音（最多 60 秒）',exact:true}).click();await s.getByRole('button',{name:'停止錄音',exact:true}).click();await s.getByText('錄音已在本機，尚未送出。',{exact:true}).waitFor();
    assert.ok(await s.locator('audio').getAttribute('src'));assert.equal(await s.getByRole('button',{name:'送出／重試保存（同一錄音不重新評分）'}).isEnabled(),false);
    assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,video:streams,canvas:true,syntheticMicrophone:true,noPaidAI:true,artifacts:root}));
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
