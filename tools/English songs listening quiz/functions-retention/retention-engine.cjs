'use strict';
function addMonths(value){const t=new Date(value);if(!Number.isFinite(t.getTime()))return null;const d=new Date(t.getTime()+28800000),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+14);d.setUTCDate(Math.min(day,new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate()));return new Date(d.getTime()-28800000);}
const iso=v=>{const d=v?.toDate?v.toDate():new Date(v);return Number.isFinite(d.getTime())?d.toISOString():null;};
const key=r=>r.ownerUid&&r.sessionId?r.ownerUid+'_'+r.sessionId:'legacy_'+r.id;
function planDeletion(records,markers,now=new Date()){
 const groups=new Map(),blocked=new Set(markers.map(m=>m.id));for(const r of records){const k=key(r);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}
 const ids=[],expiredKeys=new Set();let missing=0;
 for(const [k,g] of groups){
  const dates=name=>g.map(r=>r[name]===undefined?null:iso(r[name])).filter(Boolean).sort();
  const started=dates('startedAt')[0]||dates('recordedAt')[0]||dates('submittedAt')[0]||dates('createdAt')[0];
  const expires=started?addMonths(started):null;
  if(blocked.has(k)||(expires&&expires<=now)){ids.push(...g.map(r=>r.id));expiredKeys.add(k);}else if(!expires)missing++;
 }
 const markerIds=markers.filter(m=>iso(m.expiresAt)&&new Date(iso(m.expiresAt))<=now&&(!groups.has(m.id)||expiredKeys.has(m.id))).map(m=>m.id);
 return {resultIds:ids,markerIds,missingDateGroups:missing};
}
async function runCleanup(db,now=new Date()){
 async function scan(name){const all=[];let last;for(;;){let q=db.collection(name).orderBy('__name__').limit(500);if(last)q=q.startAfter(last);const page=await q.get();for(const d of page.docs)all.push({...d.data(),id:d.id,createdAt:d.createTime});if(page.size<500)break;last=page.docs[page.docs.length-1];}return all;}
 const [records,markers]=await Promise.all([scan('quizResults'),scan('quizDeletedSessions')]);const plan=planDeletion(records,markers,now);
 async function erase(collection,ids){for(let i=0;i<ids.length;i+=400){const batch=db.batch();for(const id of ids.slice(i,i+400))batch.delete(db.collection(collection).doc(id));await batch.commit();}}
 // Markers are removed only after all planned results have been deleted successfully.
 await erase('quizResults',plan.resultIds);await erase('quizDeletedSessions',plan.markerIds);
 return {deletedResults:plan.resultIds.length,deletedMarkers:plan.markerIds.length,missingDateGroups:plan.missingDateGroups};
}
module.exports={addMonths,planDeletion,runCleanup};
