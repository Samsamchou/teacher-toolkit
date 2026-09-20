export {ActivityError,requireValue,members,sameMembers} from './unscramble-model.mjs';
import {requireValue,teacherRoom as sanitizeTeacher} from './unscramble-model.mjs';
export const COLORS=['#da244b','#a88000','#1662cc','#17833f','#833ab4'];
export const totalScore=g=>Object.values(g?.scores||{}).reduce((n,x)=>n+(x.score||0),0);
export function validateDeck(d){
 requireValue(typeof d?.name==='string'&&d.name.trim()&&d.name.length<=150,'請輸入題組名稱（最多 150 字）。');
 requireValue(Array.isArray(d.questions)&&d.questions.length>=1&&d.questions.length<=50,'題組需有 1–50 題。');
 const templateId=d.templateId||'default-whiteboard';
 return {name:d.name.trim(),templateId,questions:d.questions.map((q,i)=>{
  requireValue(Array.isArray(q.options)&&q.options.length===3&&q.options.every(x=>typeof x==='string'&&x.trim()&&x.length<=40),`第 ${i+1} 題需三個單字（每字最多 40 字元）。`);
  requireValue(new Set(q.options.map(x=>x.trim().toLowerCase())).size===3,'三個選項不可重複。');
  requireValue(Number.isInteger(q.correctIndex)&&q.correctIndex>=0&&q.correctIndex<3,'請指定正確單字。');
  const t=q.templateId||templateId;for(const id of [q.imageId,t])requireValue(typeof id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(id),'請設定圖片及模板。');
  return {imageId:q.imageId,options:q.options.map(x=>x.trim()),correctIndex:q.correctIndex,templateId:t,templateOverride:!!q.templateOverride};
 })};
}
export function optionOrder(room,group){
 const seed=`${room.id}:${group.id}:${room.questionIndex}`;let n=2166136261;for(const c of seed)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;
 const order=[0,1,2];for(let i=2;i>0;i--){n=(Math.imul(n,1664525)+1013904223)>>>0;const j=n%(i+1);[order[i],order[j]]=[order[j],order[i]];}return order;
}
export function publicRoom(r,id){const g=r.groups[id];requireValue(g,'請重新加入。',403);const q=r.questions[r.questionIndex];return {id:r.id,title:r.title,className:r.className,phase:r.phase,questionIndex:r.questionIndex,questionCount:r.questions.length,revision:r.revision,imageId:q.imageId,templateId:q.templateId,options:optionOrder(r,g).map(i=>q.options[i]),group:{id:g.id,number:g.number,members:g.members,scores:g.scores||{},attempts:[]},endedAt:r.endedAt||null,standings:r.phase==='ended'?Object.values(r.groups).map(x=>({number:x.number,total:totalScore(x)})):[]};}
export const teacherRoom=sanitizeTeacher;
export const evaluate=()=>{throw Error('Vocabulary requires teacher scoring.');};
export function stageNext(r){if(r.phase==='preview')return {...r,phase:'open',revision:r.revision+1};return {...r,phase:'preview',reviewIndex:r.questionIndex,questionIndex:r.questionIndex+1,revision:r.revision+1};}
export function validateStrokes(strokes){
 requireValue(Array.isArray(strokes)&&strokes.length<=1500,'筆畫太多，請先送出或清除重寫。');let points=0;
 return strokes.map(s=>{requireValue(['pen','eraser'].includes(s.tool)&&COLORS.includes(s.color)&&Number.isFinite(s.width)&&s.width>=1&&s.width<=80,'筆畫工具資料錯誤。');requireValue(Array.isArray(s.points)&&s.points.length>0,'缺少筆畫座標。');points+=s.points.length;requireValue(points<=16000,'筆跡已達儲存上限，請送出。');let last=-1;const p=s.points.map(p=>{requireValue(Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)&&p[0]>=0&&p[0]<=1&&p[1]>=0&&p[1]<=1&&p[2]>=last&&p[2]<=7200000,'筆畫座標或時間錯誤。');last=p[2];return p;});return {tool:s.tool,color:s.color,width:s.width,points:p};});
}
