import {mkdirSync} from 'node:fs';
mkdirSync('tests/artifacts',{recursive:true});
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://localhost:8022/review#song/yesterday-once-more');
 await page.locator('#enableVideo:not([disabled])').waitFor({timeout:30000});await page.locator('#enableVideo').click();await page.locator('#activation').waitFor({state:'hidden',timeout:20000});
 await page.locator('#studentId').fill('LIVE-TEST');await page.locator('#start').click();
 for(let i=0;i<15;i++){
  await page.waitForFunction(i=>index===i&&controller.phase==='answering',i,{timeout:110000});
  const result=await page.evaluate(()=>({question:index+1,expectedEnd:bank.questions[index].end,actualTime:player.getCurrentTime(),state:player.getPlayerState(),phase:controller.phase}));checks.push(result);console.log(JSON.stringify(result));
  if(i===0){await page.locator('#replay').click();await page.waitForFunction(()=>controller.phase==='answering',null,{timeout:15000});checks.push(await page.evaluate(()=>({replay:1,time:player.getCurrentTime(),attempts:answers[0]?.attempts.length||0})));await page.screenshot({path:'tests/artifacts/calibrated-listening-preview.png',fullPage:true});}
  const answer=await page.evaluate(()=>bank.questions[index].answer);await page.locator('#choices button').nth(answer).click();
  if(i===2)await page.evaluate(()=>player.setPlaybackRate(2));
 }
 const beforeEnd=await page.evaluate(()=>({active,phase:controller.phase,time:player.getCurrentTime()}));
 await page.waitForFunction(()=>!active,null,{timeout:100000});
 const end=await page.evaluate(()=>({active,time:player.getCurrentTime(),duration:player.getDuration(),prompt:document.getElementById('prompt').textContent}));
 await page.locator('#teacherOpen').click();await page.screenshot({path:'tests/artifacts/teacher-completed-preview.png',fullPage:true});
 await fs.writeFile('tests/artifacts/calibrated-live-result.json',JSON.stringify({checks,beforeEnd,end,errors},null,2));console.log(JSON.stringify({beforeEnd,end,errors}));
}catch(e){await fs.writeFile('tests/artifacts/calibrated-live-result.json',JSON.stringify({checks,errors,failure:e.message,screen:await page.locator('#playerStatus').innerText(),state:await page.evaluate(()=>({phase:controller?.phase,time:player?.getCurrentTime(),state:player?.getPlayerState()}))},null,2));throw e;}
finally{await browser.close();}
