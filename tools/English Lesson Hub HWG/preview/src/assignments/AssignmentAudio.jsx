import {QuestionActions} from '../live/QuestionActions.jsx';
import React,{useEffect,useRef,useState} from 'react';
import {submitAssignmentAudio,cloudMode} from '../live/transport.mjs';
const MAX_SECONDS=60;
function localRecord(key,action,value){return new Promise((resolve,reject)=>{const request=indexedDB.open('lesson-assignment-recordings-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('recordings');request.onerror=()=>reject(Error('無法保存本機錄音，請勿關閉此頁。'));request.onsuccess=()=>{const db=request.result,tx=db.transaction('recordings',action==='get'?'readonly':'readwrite'),store=tx.objectStore('recordings'),r=action==='get'?store.get(key):action==='put'?store.put(value,key):store.delete(key);let result;r.onsuccess=()=>{result=r.result;};tx.oncomplete=()=>{db.close();resolve(result);};tx.onerror=()=>{db.close();reject(Error('本機錄音保存失敗。'));};};});}
// Firebase prefixes callable errors; students only need the sentence we wrote on the server.
const plain=e=>String(e?.message||e||'').replace(/^(FirebaseError:\s*)+/,'').trim();
export function AssignmentAudio({snapshot:s,onSaved,disabled}){
 const key=[s.assignment.code,s.run.studentId,s.block.id].join('|'),[record,setRecord]=useState(null),[url,setURL]=useState(''),[recording,setRecording]=useState(false),[seconds,setSeconds]=useState(0),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[failed,setFailed]=useState(false),recorder=useRef(),stream=useRef(),timer=useRef(),tick=useRef(),alive=useRef(true),inFlight=useRef(false);
 useEffect(()=>{alive.current=true;localRecord(key,'get').then(r=>{if(alive.current&&r){if(r.expiry>Date.now())setRecord(r);else localRecord(key,'delete');}}).catch(e=>setStatus(e.message));return()=>{alive.current=false;clearTimeout(timer.current);clearInterval(tick.current);stream.current?.getTracks().forEach(t=>t.stop());};},[key]);
 useEffect(()=>{if(!record)return;const u=URL.createObjectURL(record.blob);setURL(u);return()=>URL.revokeObjectURL(u);},[record]);
 async function start(){setFailed(false);try{stream.current=await navigator.mediaDevices.getUserMedia({audio:true});const mimeType=['audio/webm','audio/mp4','audio/ogg'].find(t=>MediaRecorder.isTypeSupported(t));if(!mimeType)throw Error('此瀏覽器不支援錄音。');const parts=[],r=new MediaRecorder(stream.current,{mimeType}),attemptId=crypto.randomUUID();recorder.current=r;r.ondataavailable=e=>e.data.size&&parts.push(e.data);r.onstop=async()=>{stream.current.getTracks().forEach(t=>t.stop());clearTimeout(timer.current);clearInterval(tick.current);const entry={blob:new Blob(parts,{type:mimeType}),attemptId,expiry:s.assignment.retentionAt};try{if(entry.blob.size>4*1024*1024)throw Error('錄音超過4MB，請縮短後重錄。');await localRecord(key,'put',entry);if(alive.current){setRecord(entry);setRecording(false);setStatus('錄好了！先按 ▶ 聽聽看，滿意就按「送出給 AI 評分」。');}}catch(e){if(alive.current){setRecord(entry);setRecording(false);setStatus(e.message);}}};r.start();setRecording(true);setSeconds(0);setStatus('');const began=Date.now();tick.current=setInterval(()=>setSeconds(Math.min(MAX_SECONDS,Math.floor((Date.now()-began)/1000))),250);timer.current=setTimeout(()=>r.state==='recording'&&r.stop(),MAX_SECONDS*1000);}catch(e){stream.current?.getTracks().forEach(t=>t.stop());setStatus(e.name==='NotAllowedError'?'請允許使用麥克風，才能錄音。':e.message);setFailed(true);}}
 async function send(){if(inFlight.current)return;inFlight.current=true;setBusy(true);setFailed(false);setStatus('');try{const bytes=new Uint8Array(await record.blob.arrayBuffer());let raw='';for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));
  // Send the current revision: a failed try is given back on the server, which moves the revision on.
  const next=await submitAssignmentAudio({code:s.assignment.code,blockId:s.block.id,attemptId:record.attemptId,revision:s.run.revision,mimeType:record.blob.type.split(';')[0],base64Audio:btoa(raw)});if(next.status!=='complete')throw Error('AI 還沒有回傳分數，請再送一次。');await localRecord(key,'delete');setStatus('');await onSaved();}catch(e){setFailed(true);setStatus(plain(e));await onSaved(false);}finally{inFlight.current=false;if(alive.current)setBusy(false);}}
 async function discard(){await localRecord(key,'delete').catch(()=>{});setRecord(null);setURL('');setFailed(false);setStatus('');}
 const left=MAX_SECONDS-seconds;
 return <section className="as-audio">
  <p className="as-audio-target">朗讀：<b>{s.block.text}</b></p>
  <p className="as-audio-pass">🎯 AI 口說評分 85 分以上就過關！</p>
  {recording&&<div className="as-rec-live" role="status"><span className="as-rec-dot" aria-hidden="true"/>錄音中 {String(Math.floor(seconds/60)).padStart(1,'0')}:{String(seconds%60).padStart(2,'0')}<small>（還剩 {left} 秒，唸完按「停止錄音」）</small></div>}
  {!recording&&!record&&!busy&&<p className="as-audio-hint">步驟：① 按 <b>🎙 開始錄音</b> → ② 唸出上面的英文 → ③ 按 <b>⏹ 停止錄音</b> → ④ 試聽後按 <b>📤 送出給 AI 評分</b></p>}
  {url&&!recording&&<div className="as-audio-preview"><span>你的錄音</span><audio controls src={url}/></div>}
  {busy&&<div className="as-ai-busy" role="status"><span className="as-spinner" aria-hidden="true"/>AI 評分中，請稍候（約 5–20 秒），不要關閉頁面…</div>}
  {status&&<p role="status" className={failed?'as-audio-status as-audio-error':'as-audio-status'}>{status}</p>}
  {!cloudMode&&<p className="as-audio-hint">本機可錄音試聽；真實 AI 評分需正式站已授權的服務，本機不產生模擬分數。</p>}
  <QuestionActions><div className="as-audio-actions">
   {!record&&!recording&&<button className="as-btn-rec" disabled={disabled||busy} onClick={start}>🎙 開始錄音<small>最多 60 秒</small></button>}
   {recording&&<button className="as-btn-stop" onClick={()=>recorder.current.stop()}>⏹ 停止錄音</button>}
   {record&&!recording&&<>
    <button className="as-btn-redo" disabled={busy||disabled} onClick={discard}>🔄 重新錄音</button>
    <button className="as-btn-send" disabled={busy||disabled||!cloudMode} onClick={send}>{busy?'AI 評分中…':failed?'📤 再送一次':'📤 送出給 AI 評分'}</button>
   </>}
  </div></QuestionActions>
 </section>;
}
