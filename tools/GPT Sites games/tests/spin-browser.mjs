import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const out=process.env.SPIN_QA_DIR||'qa/spin-20260912';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const p=await browser.newPage({viewport:{width:1440,height:1000},hasTouch:true});
await p.addInitScript(()=>{window.clickTrace=[];document.addEventListener('click',e=>window.clickTrace.push({label:e.target.closest('button')?.getAttribute('aria-label')||e.target.closest('button')?.textContent,tag:e.target.tagName,phase:document.querySelector('.sr-game')?.dataset.phase}),true);});
await p.addInitScript(()=>{const original=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=array=>{if(window.forcedDiceRandom!==undefined){array.fill(window.forcedDiceRandom);return array;}return original(array);};});
const errors=[],tasks=[],requests=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.url().includes('/spin/tasks/'))requests.push(r.url());});
await p.goto('http://127.0.0.1:5182');await p.getByRole('button',{name:/Spin, ask, answer, do and roll/}).click();
await expect(p.getByRole('button',{name:/Let’s play!/})).toBeEnabled();
await p.screenshot({path:`${out}/setup-desktop.png`});
await p.getByRole('button',{name:/Let’s play!/}).click();await expect(p.locator('.sr-score')).toHaveCount(2);
await p.screenshot({path:`${out}/wheel-desktop.png`});
await p.clock.install();const totals=[0,0];
for(let i=0;i<12;i++){
 console.log('Turn',i+1);
 await p.getByRole('button',{name:'Spin!',exact:true}).click();
 await expect(p.locator('.sr-game')).toHaveAttribute('data-phase','spinning');
 const angle=await p.locator('.sr-pointer').evaluate(el=>Number(el.style.transform.match(/rotate\(([^d]+)/)[1]));
 const sector=Math.floor((angle%360)/45),days=['Mon.','Tue.','Wed.','Thu.','Fri.','Sat.','Sun.','Sun.'];
 await p.clock.runFor(5800);await expect(p.locator('.sr-game')).toHaveAttribute('data-phase','spinning');
 await p.clock.runFor(220);await expect(p.locator('.sr-game')).toHaveAttribute('data-phase','question');
 await expect(p.getByTestId('spin-day')).toContainText(days[sector]);
 await expect(p.locator('.sr-answer')).toContainText("It's ___.");
 if(i===0){const q=await p.getByTestId('spin-question').textContent();await p.getByRole('button',{name:'Try again',exact:true}).click();await expect(p.getByTestId('spin-question')).toHaveText(q);await expect(p.getByTestId('spin-score-0')).toHaveText('0');await p.clock.runFor(1800);await p.screenshot({path:`${out}/question-desktop.png`});}
 await p.getByRole('button',{name:'Right',exact:true}).click();await expect(p.getByRole('button',{name:'Good job',exact:true})).toBeEnabled({timeout:20000});
 tasks.push(await p.getByTestId('spin-task').getAttribute('alt'));
 if(i===0){const src=await p.getByTestId('spin-task').getAttribute('src');await p.getByRole('button',{name:'Try again',exact:true}).click();await expect(p.getByTestId('spin-task')).toHaveAttribute('src',src);await p.clock.runFor(1800);await p.screenshot({path:`${out}/task-desktop.png`});}
 await p.getByRole('button',{name:'Good job',exact:true}).click();
 if(i===0)await p.screenshot({path:`${out}/dice-desktop.png`});
 if(i<2)await p.evaluate(value=>{window.forcedDiceRandom=value;},i===0?0:5);
 await p.getByRole('button',{name:'Roll dice',exact:true}).click();
 if(i<2)await p.evaluate(()=>{delete window.forcedDiceRandom;});
 console.log('After roll click',await p.locator('.sr-game').getAttribute('data-phase'),errors);
 if(await p.locator('.sr-game').getAttribute('data-phase')==='dice'){console.log('Click trace',await p.evaluate(()=>window.clickTrace.slice(-7)));await p.screenshot({path:`${out}/dice-click-failure.png`});}
 await expect(p.getByRole('button',{name:'Roll dice',exact:true})).toBeDisabled();
 await p.clock.runFor(2000);await expect(p.locator('.sr-game')).toHaveAttribute('data-phase','rolling');
 await p.clock.runFor(220);await expect(p.locator('.sr-game')).toHaveAttribute('data-phase','awarded');
 const value=Number((await p.locator('.sr-dice-stage h2').textContent()).match(/\d+/)[0]);expect(value).toBeGreaterThanOrEqual(1);expect(value).toBeLessThanOrEqual(6);totals[i%2]+=value;
 if(i<2)expect(value).toBe(i===0?1:6);
 for(let t=0;t<2;t++)await expect(p.getByTestId(`spin-score-${t}`)).toHaveText(String(totals[t]));
 if(i===0)await p.screenshot({path:`${out}/dice-result.png`});
 if(i===1)await p.screenshot({path:`${out}/dice-six.png`});
 await p.clock.runFor(1800);
}
expect(new Set(tasks.slice(0,8)).size).toBe(8);
await expect(p.locator('.sr-game')).toHaveAttribute('data-phase','finished');
await expect(p.locator('.sr-results')).toHaveAttribute('data-celebrating','true');
await p.screenshot({path:`${out}/results.png`});await p.clock.runFor(7750);await expect(p.locator('.sr-results')).toHaveAttribute('data-celebrating','true');await p.clock.runFor(300);await expect(p.locator('.sr-results')).toHaveAttribute('data-celebrating','false');
await p.getByRole('button',{name:'Play again',exact:true}).click();await p.getByRole('group',{name:'Number of teams'}).getByRole('button',{name:'6',exact:true}).click();await p.getByRole('button',{name:/Let’s play!/}).click();
await p.setViewportSize({width:1024,height:768});await p.screenshot({path:`${out}/wheel-tablet.png`});await expect(p.locator('.sr-score')).toHaveCount(6);
await p.getByRole('button',{name:'Spin!',exact:true}).tap();await p.clock.runFor(2000);await p.getByRole('button',{name:'End early',exact:true}).click();await p.clock.runFor(10000);await expect(p.locator('.sr-game')).toHaveAttribute('data-phase','spinning');await p.getByRole('button',{name:'Keep playing',exact:true}).click();await p.clock.runFor(3800);await expect(p.locator('.sr-game')).toHaveAttribute('data-phase','spinning');await p.clock.runFor(250);await expect(p.locator('.sr-game')).toHaveAttribute('data-phase','question');
await p.screenshot({path:`${out}/question-tablet.png`});await p.setViewportSize({width:390,height:844});await p.screenshot({path:`${out}/question-phone.png`});expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
await p.getByRole('button',{name:'End early',exact:true}).click();await p.getByRole('button',{name:'Finish now',exact:true}).click();await expect(p.locator('.sr-results h2')).toHaveText('Everyone wins!');await expect(p.locator('.sr-ranking')).toContainText('0 / 6 turns');
await p.clock.runFor(8100);await expect(p.locator('.sr-game')).toHaveAttribute('data-phase','finished');
await p.setViewportSize({width:1024,height:768});await p.screenshot({path:`${out}/early-finish-tablet.png`});
// A failed GIF must never allow a score or discard the task. Recover in place.
await p.getByRole('button',{name:'Play again',exact:true}).click();await p.getByRole('button',{name:'Leave game',exact:true}).click();
await p.reload();let blockTasks=true;await p.route('**/spin/tasks/*.gif',r=>blockTasks?r.abort():r.continue());
await p.getByRole('button',{name:/Spin, ask, answer, do and roll/}).click();await p.getByRole('button',{name:/Let’s play!/}).click();await p.getByRole('button',{name:'Spin!',exact:true}).click();await p.clock.runFor(6050);await p.getByRole('button',{name:'Right',exact:true}).click();await expect(p.getByRole('button',{name:'Retry loading',exact:true})).toBeVisible();await expect(p.getByRole('button',{name:'Good job',exact:true})).toBeDisabled();const taskName=await p.locator('.sr-task-badge').textContent();blockTasks=false;await p.getByRole('button',{name:'Retry loading',exact:true}).click();await expect(p.getByRole('button',{name:'Good job',exact:true})).toBeEnabled();await expect(p.locator('.sr-task-badge')).toHaveText(taskName);await expect(p.getByTestId('spin-score-0')).toHaveText('0');await p.screenshot({path:`${out}/task-tablet.png`});
await p.getByRole('button',{name:'Fullscreen',exact:true}).click();expect(await p.evaluate(()=>!!document.fullscreenElement)).toBe(true);await p.getByRole('button',{name:'Fullscreen',exact:true}).click();expect(await p.evaluate(()=>!!document.fullscreenElement)).toBe(false);
expect(errors).toEqual([]);
await fs.writeFile(`${out}/browser-report.json`,JSON.stringify({passed:true,fullMatch:{teams:2,turns:12,totals,tasks},testedTeamCounts:[2,6],taskRequests:requests.length,uniqueTaskRequests:new Set(requests).size,errors,checks:['6000ms spinner','pointer and abbreviation match','retry preserves content','eight unique tasks','dice raw 0 gives 1 and raw 5 gives 6','one award per roll','all six rounds','8000ms celebration','early finish tie','pause during end confirmation','1024x768 touch','390px no horizontal overflow','failed GIF retry preserves task and score','fullscreen entry and exit']},null,2));
await browser.close();console.log('Spin browser QA passed',JSON.stringify({totals,tasks,errors}));
