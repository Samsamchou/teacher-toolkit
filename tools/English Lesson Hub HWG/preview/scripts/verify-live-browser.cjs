const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
async function run(){
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const teacher=await browser.newContext({viewport:{width:1440,height:1000}});const student=await browser.newContext({viewport:{width:820,height:1180}});
  const t=await teacher.newPage(),s=await student.newPage();const errors=[];
  t.on('pageerror',e=>errors.push(e.message));s.on('pageerror',e=>errors.push(e.message));
  try {
    await t.goto('http://127.0.0.1:5183/lab');await t.getByRole('button',{name:'＋ 建立互動課程'}).click();
    const asset = await t.evaluate(async () => {
      const canvas=document.createElement('canvas');canvas.width=2400;canvas.height=1200;
      canvas.getContext('2d').fillRect(0,0,2400,1200);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      const {saveAsset}=await import('/src/live/media.mjs');
      return saveAsset(new File([blob],'test-image.png',{type:'image/png'}));
    });
    assert.equal(asset.width,1920);assert.equal(asset.height,960);
    assert.match(asset.id,/\.webp$/);assert.match(asset.originalId,/\.png$/);
    const shared=await student.request.get(`http://127.0.0.1:5183/api/lab-media/${asset.id}`);
    assert.equal(shared.status(),200);assert.equal(shared.headers()['content-type'],'image/webp');
    await t.getByLabel('新增題型').selectOption('choice');await t.getByRole('button',{name:'＋',exact:true}).click();
    await t.getByLabel('標題',{exact:true}).fill('Choose Tuesday');
    await t.locator('.lh-answer-card').nth(1).getByRole('button',{name:'○ 設為正確',exact:true}).click();await t.getByRole('status').filter({hasText:'已儲存'}).waitFor();
    await t.screenshot({path:path.join(process.cwd(),'live-editor.png'),fullPage:true});
    await t.getByRole('button',{name:'檢查並開始 Teacher-led →'}).click();
    const join=await t.getByRole('link',{name:'開學生入口'}).getAttribute('href');await s.goto(join);
    await s.getByLabel('五位數學號').fill('50101');await s.getByRole('button',{name:'加入課堂'}).click();await s.getByRole('heading',{name:'你已加入課堂'}).waitFor();
    await t.getByRole('button',{name:'開始上課',exact:true}).click();await t.getByRole('button',{name:'下一頁',exact:true}).click();await t.getByRole('button',{name:'開放作答',exact:true}).click();
    await s.getByRole('button',{name:'B. Tuesday',exact:true}).click();await s.getByRole('button',{name:'提交答案',exact:true}).click();await s.getByRole('button',{name:'已提交，等待老師'}).waitFor();
    await t.getByRole('heading',{name:/本題已答 1/}).waitFor();
    await s.reload();await s.getByRole('status').filter({hasText:'本次作答已保存'}).waitFor();
    await t.reload();await t.getByRole('heading',{name:/本題已答 1/}).waitFor();
    await t.getByRole('button',{name:'Eyes Up Front',exact:true}).click();await s.getByRole('heading',{name:'👀 Eyes Up Front'}).waitFor();
    await t.screenshot({path:path.join(process.cwd(),'live-classroom.png'),fullPage:true});await s.screenshot({path:path.join(process.cwd(),'live-student.png'),fullPage:true});
    t.once('dialog',d=>d.accept());await t.getByRole('button',{name:'結束課堂',exact:true}).click();await t.getByRole('button',{name:'查看課後報告'}).click();await t.getByRole('cell',{name:'50101',exact:true}).waitFor();
    assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,workflow:'editor → lobby → question → submit → pause → report',browserErrors:errors}));
  } finally {await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
