const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
async function run() {
  const browser = await chromium.launch({headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const page = await browser.newPage({viewport:{width:1440,height:1050}});
  const errors=[]; page.on('pageerror', e=>errors.push(e.message));
  const output=path.resolve('qa-studio-20260925'); await fs.mkdir(output,{recursive:true});
  try {
    await page.goto('http://127.0.0.1:5183/lab');
    await page.getByRole('button',{name:'＋ 建立互動課程'}).click();
    for (const type of ['choice','blank','drag','order']) {
      await page.getByLabel('新增題型').selectOption(type);
      await page.getByRole('button',{name:'＋',exact:true}).click();
      await page.getByRole('combobox',{name:'分數',exact:true}).selectOption('5');
      await page.getByRole('combobox',{name:'作答時間',exact:true}).selectOption('120');
      assert.equal(await page.getByLabel('Google Slides／Canva 公開播放連結').count(),0);
      for(const name of ['加入圖片','加入音檔','加入影片']) assert.equal(await page.getByLabel(name,{exact:true}).count(),1);
      if(type==='choice') {
        await page.getByLabel('選項 1',{exact:true}).fill('bike');
        await page.getByRole('button',{name:'○ 設為正確',exact:true}).first().click();
        assert.equal(await page.getByRole('button',{name:'✓ 正確答案',exact:true}).count(),1);
      }
      if(type==='blank') { await page.getByLabel('正確答案',{exact:true}).fill('bike'); await page.getByRole('button',{name:'＋ 可接受的替代答案'}).click(); await page.getByLabel('替代答案 1').fill('bicycle'); }
      if(type==='drag') {
        await page.getByRole('button',{name:'＋ 新增作答位置'}).click();
        await page.getByLabel('水平位置：20%').fill('0.35');
        assert.equal(await page.getByLabel('水平位置：35%').count(),1);
      }
      if(type==='order') { await page.getByLabel('排序項目 1').fill('First'); await page.getByLabel('項目 1 下移').click(); assert.equal(await page.getByLabel('排序項目 2').inputValue(),'First'); }
      await page.screenshot({path:path.join(output,`${type}-desktop.png`),fullPage:true});
      await page.getByRole('button',{name:'▷ 學生預覽',exact:true}).click();
      await page.screenshot({path:path.join(output,`${type}-student.png`),fullPage:true});
      await page.getByRole('button',{name:'回編輯',exact:true}).click();
    }
    for (const width of [820,390]) {
      await page.setViewportSize({width,height:1000});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+1),'horizontal overflow '+width);
      await page.screenshot({path:path.join(output,`editor-${width}.png`),fullPage:true});
    }
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:100000});
    const timing=[];
    for (const ext of ['png','webp']) timing.push(await page.evaluate(async ext=>{const start=performance.now();const r=await fetch(`/live-games/basketball/court.${ext}`);const b=await r.blob();return {ext,bytes:b.size,ms:Math.round(performance.now()-start)};},ext));
    assert(timing[1].bytes<500000); assert(timing[1].ms<timing[0].ms); assert.deepEqual(errors,[]);
    await fs.writeFile(path.join(output,'results.json'),JSON.stringify({passed:true,errors,timing,network:'200000 bytes/s, latency 150ms, cache disabled',note:'local prototype, not Wayground live comparison'},null,2));
    console.log(JSON.stringify({passed:true,output,timing}));
  } finally {await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
