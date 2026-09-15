import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const out='qa/spin-fastload-20260915';await fs.mkdir(out,{recursive:true});
const b=await chromium.launch({channel:'msedge',headless:true});const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://127.0.0.1:5192');await p.getByRole('button',{name:/Spin, ask, answer, do and roll/}).click();
await p.getByRole('group',{name:'Number of teams'}).getByRole('button',{name:'6',exact:true}).click();await p.getByRole('button',{name:/Let’s play!/}).click();await p.evaluate(()=>document.fonts.ready);
await expect(p.getByRole('button',{name:'Spin!',exact:true})).toBeDisabled();
await p.getByRole('button',{name:'Choose Team 2',exact:true}).click();await p.getByRole('button',{name:'Choose Team 5',exact:true}).click();await expect(p.getByTestId('spin-team-4')).toHaveAttribute('aria-pressed','true');
const sizes=[];
for(const [width,height] of [[1024,768],[1440,1000],[1920,1080],[768,1024],[390,844]]){
 await p.setViewportSize({width,height});const wheel=await p.locator('.sr-wheel').boundingBox();const button=await p.getByRole('button',{name:'Spin!',exact:true}).boundingBox();
 expect(Math.abs(wheel.x+wheel.width/2-width/2)).toBeLessThan(2);expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 if(width>650){expect(wheel.y+wheel.height).toBeLessThanOrEqual(height);expect(button.y+button.height).toBeLessThanOrEqual(height);}
 sizes.push({kind:'wheel',width,height,wheel,button});await p.screenshot({path:`${out}/wheel-${width}.png`,fullPage:true});
}
await p.setViewportSize({width:1440,height:1000});
await p.evaluate(async()=>{const {SpinAudio}=await import('/src/SpinAudio.js');window.spinCalls=[];const original=SpinAudio.prototype.spin;SpinAudio.prototype.spin=function(...args){window.spinCalls.push(args);window.spinAudio=this;return original.apply(this,args);};});
await p.clock.install();const tasks=[],seen=new Set();
for(let round=1;round<=6;round++){
 const order=round%2?[4,1,5,0,3,2]:[2,3,0,5,1,4];
 for(let j=0;j<6;j++){
  const team=order[j];if(await p.getByTestId(`spin-team-${team}`).getAttribute('aria-pressed')!=='true')await p.getByRole('button',{name:`Choose Team ${team+1}`,exact:true}).click();
  await expect(p.locator('.sr-progress')).toContainText(`ROUND ${round} OF 6`);
  await p.getByRole('button',{name:'Spin!',exact:true}).click();await expect(p.getByRole('button',{name:'Choose Team 1',exact:true})).toBeDisabled();
  if(round===1&&j===0){
   await expect.poll(()=>p.evaluate(()=>window.spinAudio.spinVoices.length)).toBeGreaterThan(20);
   await p.clock.runFor(2100);await p.getByRole('button',{name:'Mute',exact:true}).click();expect(await p.evaluate(()=>window.spinAudio.spinVoices.length)).toBe(0);
   await p.getByRole('button',{name:'Unmute',exact:true}).click();await expect.poll(()=>p.evaluate(()=>window.spinAudio.spinVoices.length)).toBeGreaterThan(0);
   expect(await p.evaluate(()=>window.spinCalls.at(-1)[0])).toBeLessThan(4000);
   await p.clock.runFor(3901);
  }else await p.clock.runFor(6001);
  await expect(p.locator('.sr-game')).toHaveAttribute('data-phase','question');expect(await p.evaluate(()=>window.spinAudio.spinVoices.length)).toBe(0);
  await p.getByRole('button',{name:'Right',exact:true}).click();await expect(p.getByRole('button',{name:'Good job',exact:true})).toBeEnabled({timeout:15000});
  const task=await p.getByTestId('spin-task').getAttribute('aria-label');tasks.push(task);
  if(!seen.has(task)){seen.add(task);await p.screenshot({path:`${out}/task-${seen.size}.png`,fullPage:true});}
  if(round===1&&j===0){
   for(const [width,height] of [[1024,768],[1440,1000],[1920,1080],[768,1024],[390,844]]){
    await p.setViewportSize({width,height});const frame=await p.locator('.sr-task-frame').boundingBox();const btn=await p.getByRole('button',{name:'Good job',exact:true}).boundingBox();
    expect(Math.abs(frame.x+frame.width/2-width/2)).toBeLessThan(2);expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(width>650){expect(frame.y+frame.height).toBeLessThanOrEqual(height);expect(btn.y+btn.height).toBeLessThanOrEqual(height);expect(frame.x+frame.width).toBeLessThan(btn.x);}
    sizes.push({kind:'task',width,height,frame,btn});await p.screenshot({path:`${out}/task-size-${width}.png`,fullPage:true});
   }
   await p.setViewportSize({width:1440,height:1000});await p.getByRole('button',{name:'Try again',exact:true}).click();await expect(p.getByTestId('spin-task')).toHaveAttribute('aria-label',task);
  }
  await p.getByRole('button',{name:'Good job',exact:true}).click();await p.getByRole('button',{name:'Roll dice',exact:true}).click();await p.clock.runFor(2201);await expect(p.locator('.sr-game')).toHaveAttribute('data-phase','awarded');await p.clock.runFor(1801);
  if(j<5){await expect(p.getByRole('button',{name:`Choose Team ${team+1}`,exact:true})).toBeDisabled();await expect(p.locator('.sr-progress')).toContainText(`ROUND ${round} OF 6`);}
 }
}
await expect(p.locator('.sr-game')).toHaveAttribute('data-phase','finished');await expect(p.locator('.sr-results')).toHaveAttribute('data-celebrating','true');await p.clock.runFor(8001);await expect(p.locator('.sr-results')).toHaveAttribute('data-celebrating','false');await p.screenshot({path:`${out}/six-round-results.png`,fullPage:true});
expect(new Set(tasks.slice(0,8)).size).toBe(8);expect(seen.size).toBe(8);expect(errors).toEqual([]);
await fs.writeFile(`${out}/report.json`,JSON.stringify({passed:true,rounds:6,teams:6,turns:tasks.length,tasks,sizes,errors},null,2));console.log(JSON.stringify({passed:true,sizes,tasks:seen.size,turns:tasks.length}));await b.close();
