import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch({channel:'msedge',headless:true});
const p=await browser.newPage({viewport:{width:1440,height:900},hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(()=>{window.testLoops=0;const Base=window.AudioContext;window.AudioContext=class extends Base{createBufferSource(){const n=super.createBufferSource(),start=n.start.bind(n),stop=n.stop.bind(n);let counted=false;n.start=(...args)=>{if(n.loop){counted=true;window.testLoops++;}return start(...args);};n.stop=(...args)=>{if(counted){counted=false;window.testLoops--;}return stop(...args);};return n;}};});
await p.goto('http://127.0.0.1:5178');await p.getByRole('button',{name:/Beach Cleanup/}).click();await p.getByRole('button',{name:/Let's clean up/}).click();
await expect.poll(()=>p.evaluate(()=>window.testLoops)).toBe(3);
await p.clock.install();await p.getByRole('button',{name:'Correct',exact:true}).click();await p.getByRole('button',{name:'Choose trail A',exact:true}).click();
await p.getByRole('button',{name:'Pause',exact:true}).click();await expect.poll(()=>p.evaluate(()=>window.testLoops)).toBe(0);await p.clock.runFor(3000);await expect(p.locator('.coast-hud')).toContainText('0 /');await p.getByRole('button',{name:'Resume',exact:true}).first().click();await expect.poll(()=>p.evaluate(()=>window.testLoops)).toBe(3);
await p.getByRole('button',{name:'Sound',exact:true}).click();await expect.poll(()=>p.evaluate(()=>window.testLoops)).toBe(0);await p.getByRole('button',{name:'Sound',exact:true}).click();await expect.poll(()=>p.evaluate(()=>window.testLoops)).toBe(3);
await p.getByRole('button',{name:'Drawing tools',exact:true}).click();await p.getByRole('button',{name:'Write',exact:true}).click();await expect.poll(()=>p.evaluate(()=>window.testLoops)).toBe(0);await p.clock.runFor(2000);await p.getByRole('button',{name:'Play',exact:true}).click();await p.getByRole('button',{name:'Drawing tools',exact:true}).click();
let guard=0,picks=0,zones=new Set();
while(await p.locator('.beach-match').getAttribute('data-phase')==='active'){
 if(++guard>100)throw Error('Manual exploration stuck');zones.add(await p.locator('.beach-exploration').getAttribute('data-zone'));
 if(await p.locator('.beach-exploration').getAttribute('data-action')==='idle'){
  const available=p.locator('.coast-object:enabled');if(await available.count()){
   const target=available.last();const box=await target.boundingBox(),stage=await p.locator('.beach-stage').boundingBox();if(box.x<stage.x||box.x+box.width>stage.x+stage.width+2)throw Error('Available litter moved off camera');
   const label=await target.getAttribute('aria-label');await target.tap();await p.getByRole('button',{name:label,exact:true}).dispatchEvent('click');picks++;await p.clock.runFor(1500);if(picks===1)await p.screenshot({path:'exploration-pick-qa.png'});
  }
 }
 await p.clock.runFor(800);
}
await expect(p.locator('[data-testid=route-total]')).toHaveText(/^\+(450|500|550|650|700)$/);if(zones.size<3)throw Error('Did not explore sections');
await p.getByRole('button',{name:'Teacher controls',exact:true}).click();await p.getByRole('slider',{name:'Ocean & music volume'}).fill('20');await p.getByRole('slider',{name:'Action sound volume'}).fill('70');await p.getByRole('button',{name:'Finish early',exact:true}).click();await p.getByRole('button',{name:'Finish game',exact:true}).click();await p.getByRole('button',{name:'Play again',exact:true}).click();await expect.poll(()=>p.evaluate(()=>window.testLoops)).toBe(0);
await p.getByRole('button',{name:/Sit back & explore/}).click();await p.getByRole('button',{name:/Let's clean up/}).click();await p.getByRole('button',{name:'Correct',exact:true}).click();await p.getByRole('button',{name:'Choose trail E',exact:true}).click();await p.clock.runFor(24900);await expect(p.locator('.beach-match')).toHaveAttribute('data-phase','active');await p.clock.runFor(200);await expect(p.locator('.beach-match')).toHaveAttribute('data-phase','result');
await p.getByRole('button',{name:'Next team',exact:false}).click();await p.setViewportSize({width:1024,height:768});await p.getByRole('button',{name:'Correct',exact:true}).click();await p.getByRole('button',{name:'Choose trail C',exact:true}).click();await p.clock.runFor(2000);await p.screenshot({path:'exploration-tablet-qa.png'});await p.getByRole('button',{name:'Fullscreen',exact:true}).click();await expect.poll(()=>p.evaluate(()=>!!document.fullscreenElement)).toBe(true);await p.getByRole('button',{name:'Drawing tools',exact:true}).click();await expect(p.getByRole('button',{name:'Rectangle',exact:true})).toBeVisible();
if(/[\u3400-\u9fff]/.test(await p.locator('.beach-match').innerText()))throw Error('Chinese in game');if(errors.length)throw Error(errors.join('\n'));
console.log(JSON.stringify({ok:true,manualPicks:picks,sections:zones.size,tests:['free touch selection','no duplicate pickup','camera keeps remaining litter visible','cross-section walking','25-second auto route','3 background layers','pause/mute/drawing/exit stop loops','separate volume controls','1024x768','fullscreen drawing','English-only']},null,2));await browser.close();
