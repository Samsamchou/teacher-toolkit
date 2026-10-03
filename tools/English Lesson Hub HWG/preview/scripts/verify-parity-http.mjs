// Isolated loopback API acceptance. Never contacts Firebase or production.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newBlock} from '../src/live/domain.mjs';
import {parityBlock} from '../src/live/parity.mjs';
const base=process.env.PARITY_QA_URL || 'http://127.0.0.1:5186';
if(new URL(base).hostname!=='127.0.0.1')throw new Error('Loopback only');
function client(role){let cookie='';return async(action,code,payload={})=>{const res=await fetch(base+'/api/live',{method:'POST',headers:{'Content-Type':'application/json','x-lab-role':role,...(cookie?{cookie}:{})},body:JSON.stringify({action,code,payload})});cookie=res.headers.get('set-cookie')?.split(';')[0]||cookie;const data=await res.json();if(!res.ok||data.error)throw new Error(data.error||String(res.status));return data;};}
const teacher=client('teacher'),student=client('student');
const uploaded=await fetch(base+'/api/lab-media',{method:'POST',headers:{'Content-Type':'image/webp'},body:await readFile(new URL('../public/live-games/basketball/court.webp',import.meta.url))});
assert.equal(uploaded.status,200);const image=await uploaded.json();
const types=['slide','choice','blank','drag','label','hotspot','draw','order','category','dropdown','cloud','open'];
const blocks=types.map(type=>{const b=parityBlock(newBlock(type));b.title=`QA ${type}`;b.seconds=0;if(b.background)b.background={assetId:image.id,alt:'Synthetic QA positions on a basketball court'};b.media=b.background?[{id:image.id,kind:'image',name:'QA court.webp'}]:[];return b;});
const deck={schemaVersion:2,id:crypto.randomUUID(),title:'QA parity HTTP — synthetic',blocks};
const stored=await teacher('saveDeck',null,{deck,expectedVersion:0});assert.equal(stored.deck.version,1);
const list=await teacher('decks');assert.deepEqual(list.decks.find(d=>d.id===deck.id).blocks,blocks);
let room=await teacher('create',null,{deck:stored.deck});const code=room.code;
await student('join',code,{studentId:'50101'});
for(let i=1;i<blocks.length;i++){
  room=await teacher('control',code,{action:'move',revision:room.revision,index:i});
  room=await teacher('control',code,{action:'open',revision:room.revision});
  const b=blocks[i],safe=await student('snapshot',code);
  assert.equal(safe.block.answer,undefined);assert.equal(safe.block.mapping,undefined);
  const answer=({choice:[0],blank:{b1:'bike'},drag:{b1:'bike'},label:{a1:'l1'},hotspot:['r1'],draw:[{color:'#123456',width:6,points:[[20,20],[100,100]]}],order:b.items,category:b.mapping,dropdown:{b1:'bike'},cloud:'bike',open:'I go to school by bike.'})[b.type];
  if(b.type==='open')await assert.rejects(student('submit',code,{attemptId:crypto.randomUUID(),blockId:b.id,revision:room.revision,answer:'中'.repeat(201)}),/200/);
  const payload={attemptId:crypto.randomUUID(),blockId:b.id,revision:room.revision,answer};
  await student('submit',code,payload);await student('submit',code,payload);
  const readback=await teacher('snapshot',code);const response=readback.responses.find(r=>r.attemptId===payload.attemptId);
  assert.deepEqual(response.answer,answer);assert.equal(response.grade.scoringVersion,'parity-1');
  if(['draw','open'].includes(b.type))room=await teacher('control',code,{action:'grade',revision:room.revision,attemptId:payload.attemptId,score:1,pass:true});
  console.log(`PASS ${b.type}: save, submit, duplicate retry, readback`);
}
const result=await teacher('report',code);assert.equal(result.report[0].submitted,11);assert.equal(result.report[0].pending,0);assert.equal(result.report[0].score,10);assert.equal(result.report[0].max,10);assert.equal(result.report[0].details.length,11);
console.log('PASS total: 12 blocks, 11 responses, 10/10 points; cloud excluded; manual grading preserved.');
