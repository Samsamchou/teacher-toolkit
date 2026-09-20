import {getTeacherToken,DEMO} from './data';
export const LOCAL_LIVE=import.meta.env.DEV&&DEMO;
export async function activity(action,payload={},student=false){
 const headers={'Content-Type':'application/json'};
 if(!student)headers.Authorization=`Bearer ${LOCAL_LIVE?'local-teacher':await getTeacherToken()}`;
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),action==='optimizeDeckImages'?120000:['image','studentImage','uploadImage'].includes(action)?60000:20000);
 try{
  const res=await fetch('/api/vocabulary-activity',{method:'POST',headers,body:JSON.stringify({action,...payload}),signal:controller.signal});
  let data;try{data=await res.json();}catch(error){if(error.name==='AbortError')throw error;throw new Error('回應未完整載入，請重試。圖片與題組尚未確認更新。');}
  if(!res.ok){const err=new Error(data.message||'Please retry.');err.status=res.status;err.code=data.code||'REQUEST_FAILED';throw err;}return data;
 }catch(e){if(e.name==='AbortError'||e instanceof TypeError){const err=new Error('Connection interrupted. Your answer is kept. Please retry.');err.network=true;err.code='NETWORK_ERROR';throw err;}throw e;}finally{clearTimeout(timer);}
}
export function readSaved(key,fallback=null){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
export function saveLocal(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
export function removeLocal(key){try{localStorage.removeItem(key);return true;}catch{return false;}}
export function sameLogin(a,b){return !!a&&!!b&&a.roomId===b.roomId&&a.groupId===b.groupId&&a.token===b.token;}
export function pendingBelongsTo(pending,credentials,attemptId=null){return sameLogin(pending,credentials)&&(!attemptId||pending.attemptId===attemptId);}
export function removePendingIfOwned(roomId,credentials,attemptId=null){const key=`vl-pending:${roomId}`,pending=readSaved(key);return pendingBelongsTo(pending,credentials,attemptId)?removeLocal(key):false;}
export function nonceValue(record){return typeof record==='string'?record:record?.value;}
export function removeNonceIfOwned(roomId,credentials,allowLegacy=false){const key=`vl-nonce:${roomId}`,record=readSaved(key);if(!record)return false;if(typeof record==='string')return allowLegacy?removeLocal(key):false;return sameLogin(record,credentials)?removeLocal(key):false;}
export function csvForRoom(room){const cell=x=>'"'+String(x??'').replace(/^[=+\-@]/,"'$&").replaceAll('"','""')+'"';const rows=[['場次','日期','班級','題組','組別','學號','題號','正確單字','分數','狀態','時間']];for(const g of Object.values(room.groups))room.questions.forEach((q,i)=>{const s=g.scores?.[i];rows.push([room.id,room.createdAt,room.className,room.title,g.number,g.members.join(' '),i+1,q.options[q.correctIndex],s?.score??'',s?.status||'未作答',s?.at||'']);});return '\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n');}
export function downloadRecords(room){const url=URL.createObjectURL(new Blob([csvForRoom(room)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`vocabulary-${room.id}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
