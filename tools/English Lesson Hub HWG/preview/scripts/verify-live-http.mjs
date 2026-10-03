import assert from 'node:assert/strict';
import {newBlock} from '../src/live/domain.mjs';
const base=process.env.LIVE_BASE_URL||'http://127.0.0.1:5183';
function client(role){let cookie='';return async(action,code,payload={})=>{const r=await fetch(`${base}/api/live`,{method:'POST',headers:{'Content-Type':'application/json','X-Lab-Role':role,...(cookie?{Cookie:cookie}:{})},body:JSON.stringify({action,code,payload})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()};};}
const teacher=client('teacher');const students=Array.from({length:30},()=>client('student'));
const deck={id:crypto.randomUUID(),title:'Automated live verification',blocks:[{...newBlock('choice'),answer:[1],notes:'TEACHER_PRIVATE_NOTE'}]};
let {data:room}=await teacher('create',null,{deck});assert.ok(room.code);
const joins=await Promise.all(students.map((call,i)=>call('join',room.code,{studentId:String(50101+i)})));assert.ok(joins.every(r=>r.status===200));assert.ok(joins.every(r=>!r.data.teacher&&!('answer' in r.data.block)&&!('notes' in r.data.block)));
room=(await teacher('control',room.code,{action:'open',revision:room.revision})).data;
const inputs=students.map((_,i)=>({attemptId:crypto.randomUUID(),blockId:room.block.id,revision:room.revision,answer:[i%2]}));
const submits=await Promise.all(students.map((call,i)=>call('submit',room.code,inputs[i])));assert.ok(submits.every(r=>r.status===200));
const retries=await Promise.all(students.map((call,i)=>call('submit',room.code,inputs[i])));assert.ok(retries.every(r=>r.data.responses.length===1));
assert.equal((await students[0]('control',room.code,{action:'end',revision:room.revision})).status,400);
room=(await teacher('control',room.code,{action:'pause',revision:room.revision})).data;
assert.equal((await students[0]('snapshot',room.code)).data.phase,'paused');
room=(await teacher('control',room.code,{action:'end',revision:room.revision})).data;
const results=(await teacher('report',room.code)).data.report;assert.equal(results.length,30);assert.equal(results.reduce((n,r)=>n+r.score,0),15);assert.equal((await students[0]('report',room.code)).status,400);
console.log(JSON.stringify({passed:true,participants:30,submissions:30,retries:30,score:15,privacy:true,teacherOwnership:true,pause:true,report:true,room:room.code},null,2));
