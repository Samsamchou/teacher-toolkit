import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {createPictureCache} from '../src/unscramble-images.mjs';
const base='http://127.0.0.1:5184',out='qa/unscramble-image-fastload-20260915';await fs.mkdir(out,{recursive:true});
const checks=[],images=[];const hash=b=>createHash('sha256').update(b).digest('hex');
async function api(action,payload={},student=false){const start=performance.now(),r=await fetch(base+'/api/live-activity',{method:'POST',headers:{'Content-Type':'application/json',...(!student?{Authorization:'Bearer local-teacher'}:{})},body:JSON.stringify({action,...payload})}),text=await r.text();return {status:r.status,data:JSON.parse(text),wireBytes:Buffer.byteLength(text),ms:performance.now()-start};}
const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:1920,height:1080}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 const seed=(await api('seed')).data.deck;
 await page.goto(base+'/unscramble');await expect(page.getByRole('button',{name:'載入七題家人題組',exact:true})).toBeVisible();
 const replacement={};
 for(let i=0;i<7;i++){
  const source=seed.questions[i].imageId,original=await api('image',{imageId:source});assert.equal(original.status,200);
  const processed=await page.evaluate(async data=>{const m=await import('/src/unscramble-images.mjs'),p=await m.preparePicture(m.imageBlob(data));return {stats:p.stats,payload:await m.pictureUploadPayload(p)};},original.data);
  assert.ok(processed.stats.bytes<=processed.stats.originalBytes);assert.ok(processed.stats.width<=1920||processed.stats.keptOriginal);assert.ok(processed.stats.width<=processed.stats.originalWidth);
  const uploaded=await api('uploadImage',processed.payload);assert.equal(uploaded.status,200);replacement[source]=uploaded.data.imageId;
  const repeated=await api('uploadImage',processed.payload);assert.equal(repeated.data.imageId,uploaded.data.imageId);
  const full=await api('image',{imageId:uploaded.data.imageId}),thumb=await api('image',{imageId:uploaded.data.imageId,variant:'thumbnail'});
  assert.equal(hash(Buffer.from(full.data.base64,'base64')),hash(Buffer.from(processed.payload.base64,'base64')));
  await fs.writeFile(`${out}/${i+1}-optimized.webp`,Buffer.from(full.data.base64,'base64'));
  await fs.writeFile(`${out}/${i+1}-thumbnail.webp`,Buffer.from(thumb.data.base64,'base64'));
  await fs.writeFile(`${out}/${i+1}-original.png`,Buffer.from(original.data.base64,'base64'));
  images.push({question:i+1,...processed.stats,sourceId:source,targetId:uploaded.data.imageId,sha256:hash(Buffer.from(full.data.base64,'base64')),wireBytes:{original:original.wireBytes,full:full.wireBytes,thumbnail:thumb.wireBytes},localMs:{original:original.ms,full:full.ms,thumbnail:thumb.ms}});
 }
 checks.push('Seven real reference images compressed, no upscaling, smaller fallback, server readback and duplicate upload IDs verified');
 const small=await page.evaluate(async()=>{const m=await import('/src/unscramble-images.mjs'),c=document.createElement('canvas');c.width=16;c.height=8;c.getContext('2d').fillRect(0,0,16,8);const blob=await new Promise(r=>c.toBlob(r,'image/webp',.1)),p=await m.preparePicture(blob);return p.stats;});assert.equal(small.width,16);assert.equal(small.height,8);assert.ok(small.bytes<=small.originalBytes);checks.push('Small image does not upscale or increase in size');
 const cache=createPictureCache();let fetched=0;const fetcher=async()=>{fetched++;return new Blob(['x']);};await Promise.all([cache.get('teacher:a',fetcher),cache.get('teacher:a',fetcher)]);assert.equal(fetched,1);await cache.get('student:a',fetcher);assert.equal(fetched,2);cache.clear();await cache.get('teacher:a',fetcher);assert.equal(fetched,3);await assert.rejects(()=>cache.get('fail',()=>Promise.reject(new Error('offline'))));await cache.get('fail',fetcher);checks.push('Cache deduplicates concurrent reads, separates scopes, clears and retries failures');
 const copy=(await api('saveDeck',{deck:{name:'QA image migration '+Date.now(),questions:seed.questions}})).data.deck;
 const room=(await api('createRoom',{deckId:copy.id,className:'QA history unchanged',maxGroups:10})).data.room;
 const joined=(await api('join',{roomId:room.id,members:'99001 99002',joinNonce:randomUUID()},true)).data;
 const credentials={roomId:room.id,groupId:joined.groupId,token:joined.token};
 assert.equal((await api('image',{imageId:seed.questions[0].imageId},true)).status,401);
 assert.equal((await api('studentImage',{...credentials,imageId:seed.questions[1].imageId,variant:'thumbnail'},true)).status,403);
 assert.equal((await api('studentImage',{...credentials,token:'wrong',imageId:seed.questions[0].imageId},true)).status,403);
 const before=(await api('teacherState',{roomId:room.id})).data.room;
 const migrated=await api('optimizeDeckImages',{deckId:copy.id,version:copy.version,replacements:replacement});assert.equal(migrated.status,200,JSON.stringify(migrated.data));
 assert.deepEqual((await api('teacherState',{roomId:room.id})).data.room,before);
 assert.equal((await api('optimizeDeckImages',{deckId:copy.id,version:copy.version,replacements:replacement})).status,409);
 const after=(await api('listDecks')).data.decks.find(d=>d.id===copy.id);assert.equal(after.name,copy.name);assert.deepEqual(after.questions.map(({prompt,answer})=>({prompt,answer})),copy.questions.map(({prompt,answer})=>({prompt,answer})));
 for(const [source,target] of Object.entries(replacement))assert.equal(after.questions.find(q=>q.imageId===target)?.imageId,target);
 process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8186';process.env.FIREBASE_STORAGE_EMULATOR_HOST='127.0.0.1:9296';
 const {initializeApp}=await import('firebase-admin/app'),{getFirestore}=await import('firebase-admin/firestore'),{getStorage}=await import('firebase-admin/storage');
 initializeApp({projectId:'demo-classroom-games',storageBucket:'demo-classroom-games.appspot.com'});
 const backup=(await getFirestore().doc('liveDeckImageBackups/'+migrated.data.backupId).get()).data();assert.deepEqual(backup.deck,copy);
 for(const [source,meta] of Object.entries(backup.backupImages)){const [data]=await getStorage().bucket().file(meta.path).download();assert.equal(hash(data),meta.sha256);assert.equal(data.length,meta.bytes);assert.equal((await api('image',{imageId:source})).status,200);}
 checks.push('Migration creates hash-verified original backups and atomic deck backup; sentences, names and historical room unchanged; stale version rejected');
 const bad=await api('optimizeDeckImages',{deckId:copy.id,version:after.version,replacements:{...replacement,[seed.questions[0].imageId]:'opt-missing'}});assert.equal(bad.status,400);assert.equal((await api('listDecks')).data.decks.find(d=>d.id===copy.id).version,after.version);
 checks.push('Missing replacement fails without changing saved deck; teacher/student image authorization enforced');
 await page.reload();const card=page.locator('.ul-deck').filter({hasText:copy.name});await expect(card.locator('img')).toBeVisible({timeout:30000});
 let imageRequests=0;page.on('request',r=>{if(r.url().endsWith('/api/live-activity')){try{if(r.postDataJSON().action==='image')imageRequests++;}catch{}}});
 await card.getByRole('button',{name:'編輯',exact:true}).click();await expect(page.locator('.ul-editor-card .ul-picture img')).toBeVisible({timeout:30000});await page.getByRole('button',{name:'Q2',exact:false}).click();await expect(page.locator('.ul-editor-card .ul-picture img')).toBeVisible({timeout:30000});const requests=imageRequests;await page.getByRole('button',{name:'Q1',exact:false}).click();await expect(page.locator('.ul-editor-card .ul-picture img')).toBeVisible();assert.equal(imageRequests,requests);
 checks.push('Real editor Q1 → Q2 → Q1 uses memory cache without repeated download');
 await page.getByLabel('題目圖片',{exact:true}).setInputFiles('functions/unscramble-assets/4.png');await expect(page.getByRole('status')).toContainText('原圖',{timeout:30000});await expect(page.getByRole('status')).toContainText('image/webp');await page.screenshot({path:out+'/upload-size-projector.png',fullPage:true});checks.push('Editor upload compresses automatically and shows original/optimized size');
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'← 返回題組',exact:true}).click();await page.locator('.ul-deck').filter({hasText:copy.name}).getByRole('button',{name:'圖片容量預覽',exact:true}).click();await page.getByRole('button',{name:'產生比較預覽',exact:true}).click();await expect(page.getByRole('status')).toContainText('比較完成',{timeout:60000});await page.screenshot({path:out+'/comparison-ui.png',fullPage:true});
 // The browser evidence above never applies a migration to production.
 assert.deepEqual(errors,[]);checks.push('Comparison interface rendered without browser errors');
 await api('end',{roomId:room.id,revision:before.revision});await api('deleteRoom',{roomId:room.id});
 await fs.writeFile(out+'/results.json',JSON.stringify({passed:true,environment:'local Chrome and Firebase emulators; seven local reference images, not both production decks',checks,images},null,2));console.log(JSON.stringify({passed:true,checks,images},null,2));
}finally{await browser.close();}
