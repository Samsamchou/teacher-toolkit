import {chromium,expect} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const base='http://127.0.0.1:5184',results=[];
async function api(action,p={}){const r=await fetch(base+'/api/live-activity',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer local-teacher'},body:JSON.stringify({action,...p})});return {status:r.status,...await r.json()};}
const deck=(await api('listDecks')).decks.find(d=>d.id==='family-20260915');const make=async name=>(await api('createRoom',{deckId:deck.id,className:name+' '+Date.now(),maxGroups:10})).room;
const ended=await make('QA右鍵刪除已結束'),active=await make('QA右鍵刪除進行中'),keep=await make('QA右鍵保留對照');await api('end',{roomId:ended.id,revision:ended.revision});
const browser=await chromium.launch({headless:true,channel:'chrome'}),p=await browser.newPage();await p.goto(base+'/unscramble');
const row=name=>p.getByLabel(`活動紀錄：${name}`,{exact:true});
await row(ended.className).click({button:'right'});await expect(p.getByRole('menu')).toBeVisible();p.once('dialog',d=>d.dismiss());await p.getByRole('menuitem').click();await expect(p.getByRole('menu')).toHaveCount(0);assert.equal((await api('teacherState',{roomId:ended.id})).status,200);results.push('Cancel right-click deletion preserves saved record');
await row(ended.className).click({button:'right'});p.once('dialog',d=>d.accept());await p.getByRole('menuitem').click();await expect(row(ended.className)).toHaveCount(0);assert.equal((await api('teacherState',{roomId:ended.id})).status,404);results.push('Confirmed right-click deletes the selected ended record');
await row(active.className).getByRole('button',{name:`紀錄選單：${active.className}`,exact:true}).click();p.once('dialog',async d=>{assert.match(d.message(),/仍在進行/);await d.accept();});await p.getByRole('menuitem').click();await expect(row(active.className)).toHaveCount(0);assert.equal((await api('teacherState',{roomId:active.id})).status,404);results.push('Tablet menu confirms ending an active room before deletion');
assert.equal((await api('teacherState',{roomId:keep.id})).status,200);assert.ok((await api('listDecks')).decks.some(d=>d.id===deck.id));results.push('Other rooms and the saved question set remain unchanged');
await row(keep.className).focus();await p.keyboard.press('Shift+F10');await expect(p.getByRole('menu')).toBeVisible();await p.keyboard.press('Escape');await expect(p.getByRole('menu')).toHaveCount(0);results.push('Keyboard menu and Escape work');
await row(keep.className).click({button:'right'});await p.screenshot({path:'qa/unscramble-dopamine-20260915/record-context-menu.png',fullPage:true});await browser.close();
await api('end',{roomId:keep.id,revision:keep.revision});await api('deleteRoom',{roomId:keep.id});
await fs.writeFile('qa/unscramble-dopamine-20260915/record-delete-results.json',JSON.stringify({passed:true,environment:'local emulators only',results},null,2));console.log(results);
