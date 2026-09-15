import {getTeacherToken,DEMO} from './data';
export const LOCAL_LIVE=import.meta.env.DEV&&DEMO;
export async function activity(action,payload={},student=false){
 const headers={'Content-Type':'application/json'};
 if(!student)headers.Authorization=`Bearer ${LOCAL_LIVE?'local-teacher':await getTeacherToken()}`;
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),action==='optimizeDeckImages'?120000:['image','studentImage','uploadImage'].includes(action)?60000:20000);
 try{
  const res=await fetch('/api/live-activity',{method:'POST',headers,body:JSON.stringify({action,...payload}),signal:controller.signal});
  let data;try{data=await res.json();}catch(error){if(error.name==='AbortError')throw error;throw new Error('回應未完整載入，請重試。圖片與題組尚未確認更新。');}
  if(!res.ok){const err=new Error(data.message||'Please retry.');err.status=res.status;throw err;}return data;
 }catch(e){if(e.name==='AbortError'||e instanceof TypeError){const err=new Error('Connection interrupted. Your answer is kept. Please retry.');err.network=true;throw err;}throw e;}finally{clearTimeout(timer);}
}
export function readSaved(key,fallback=null){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
export function saveLocal(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
export function csvForRoom(room){
 const cells=x=>'"'+String(x??'').replace(/^[=+\-@]/,"'$&").replace(/"/g,'""')+'"';
 const rows=[['場次','日期','班級','題組','組別','學號','題號','次數','問句','答句','結果','提交時間']];
 for(const g of Object.values(room.groups))for(let i=0;i<room.questions.length;i++){
  const attempts=g.attempts.filter(a=>a.questionIndex===i);
  for(const a of attempts.length?attempts:[null])rows.push([room.id,room.createdAt,room.className,room.title,g.number,g.members.join(' '),i+1,a?.number??0,a?.lines[0],a?.lines[1],a?(a.correct?'正確':'錯誤'):'未作答',a?.at]);
 }
 return '\ufeff'+rows.map(r=>r.map(cells).join(',')).join('\r\n');
}
export function downloadRecords(room){const url=URL.createObjectURL(new Blob([csvForRoom(room)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`activity-${room.id}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
