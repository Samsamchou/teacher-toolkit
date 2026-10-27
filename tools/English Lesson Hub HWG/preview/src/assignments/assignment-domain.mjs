import {isHeroes,initialHeroGame,heroGameResult} from './game-heroes.mjs';
import {validateDeck,publicBlock,grade,copy,identifier} from '../live/domain.mjs';
export const ASSIGNMENT_VERSION=1;
export const ITEM_IDS=['sunbeam','leaf-shield','swift-boots','orbit-star','frost-bell','lightning-feather','healing-bloom','dawn-wings'];
export const ITEM_NAMES=['日光法杖','葉盾','輕巧靴','星環球','冰晶鈴','閃電羽','治癒花','曙光羽翼'];
export const LEVEL_NAMES=['單字森林','月光池畔','水晶林地','古老遺跡','天空花園','曙光城堡'];
export const TIER_NAMES=['','傳說','史詩','稀有','基本'];
const DAY=86400000;
export const isStudentId=v=>/^[3-6]\d{2}(0[1-9]|[12]\d|30)$/.test(v||'');
export function shuffled(values,seed) {
  let x=2166136261;for(const c of String(seed))x=Math.imul(x^c.charCodeAt(0),16777619);
  const a=[...values];for(let i=a.length-1;i>0;i--){x^=x<<13;x^=x>>>17;x^=x<<5;const j=Math.floor((x>>>0)/4294967296*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;
}
export function levelPlan(total) {
  const count=Math.min(6,total);let start=0;
  return Array.from({length:count},(_,i)=>{const size=Math.floor(total/count)+(i<total%count?1:0),row={level:i+1,name:LEVEL_NAMES[i],start,end:start+size,count:size,items:ITEM_IDS.slice(0,3+i),hpMultiplier:1+i*.05,speedMultiplier:1+i*.02};start+=size;return row;});
}
export function createAssignment(deck,input,ownerUid,code,now=Date.now()) {
  const visible={...copy(deck),blocks:copy(deck.blocks).filter(b=>!b.hidden&&b.type!=='slide').map(b=>b.type==='order'&&!b.displayItems?{...b,displayItems:shuffled(b.items,code+'|'+b.id)}:b)};validateDeck(visible);
  if(!visible.blocks.length)throw Error('請先建立至少一道可作答題目。');
  const title=String(input.title||'').trim(),dueAt=Number(input.dueAt);
  if(!title||title.length>120)throw Error('分配名稱需為1–120字。');
  if(!['exam','practice'].includes(input.mode)||!['sequential','random'].includes(input.questionOrder)||!['original','random'].includes(input.optionOrder)||!['survivors','none'].includes(input.game||'survivors'))throw Error('分配模式或排列設定無效。');
  if(!Number.isFinite(dueAt)||dueAt<=now||dueAt>now+365*DAY)throw Error('有效期限需在現在之後、一年以內。');
  return {gameVersion:input.gameVersion===2?2:1,schemaVersion:ASSIGNMENT_VERSION,code,ownerUid,title,mode:input.mode,questionOrder:input.questionOrder,optionOrder:input.optionOrder,game:input.game||'survivors',createdAt:now,dueAt,retentionAt:dueAt+180*DAY,deck:visible,levels:levelPlan(visible.blocks.length),closed:false};
}
export function publicAssignment(a) {return Object.fromEntries(['gameVersion','schemaVersion','code','title','mode','questionOrder','optionOrder','game','createdAt','dueAt','retentionAt','levels','closed'].map(k=>[k,copy(k==='gameVersion'?(a.gameVersion||1):a[k])]));}
export function newAssignmentRun(a,studentId,uid,seed,now=Date.now(),roleId='mage') {
  if(!isStudentId(studentId))throw Error('請輸入有效五位數學號。');
  const ids=a.deck.blocks.map(b=>b.id);
  return {schemaVersion:1,studentId,uid,seed,sequence:a.questionOrder==='random'?shuffled(ids,seed):ids,index:0,revision:0,records:{},awards:{},createdAt:now,updatedAt:now,completedAt:null,game:isHeroes(a)?initialHeroGame(roleId):{x:480,y:330,hp:8,defeated:0,seconds:0,recoveries:0},gameResult:null,pendingAudio:null};
}
export const currentBlock=(a,r)=>a.deck.blocks.find(b=>b.id===r.sequence[r.index]);
export const currentLevel=(a,r)=>a.levels.find(l=>r.index>=l.start&&r.index<l.end)||a.levels.at(-1);
export function publicAssignmentBlock(a,r) {
  const b=currentBlock(a,r);if(!b)return null;
  const safe=publicBlock(b);safe.seconds=0;
  const shuffle=(values,salt)=>a.optionOrder==='random'?shuffled(values,r.seed+'|'+b.id+'|'+salt):values;
  if(safe.options)safe.displayOrder=shuffle(safe.options.map((_,i)=>i),'options');
  if(safe.groups)safe.groupOrder=shuffle(safe.groups.map((_,i)=>i),'groups');
  if(safe.labels)safe.labels=shuffle(b.labels.map(label=>safe.labels.find(x=>x.id===label.id)),'labels');
  if(safe.type==='order')safe.items=shuffle(safe.items,'order');
  if(safe.items)safe.itemDisplayOrder=shuffle(safe.items.map((_,i)=>i),'items');
  if(safe.blanks)safe.blanks=safe.blanks.map(x=>{const original=b.blanks.find(blank=>blank.id===x.id);return {...x,...(x.choices?{choices:shuffle(original.choices||[...(original.answers||[]),...(original.distractors||[])],x.id)}:{})};});
  if(safe.cards)safe.cards=shuffle(safe.cards,'cards');
  if(safe.spellTiles)safe.spellTiles=shuffle(safe.spellTiles,'spell');
  return safe;
}
export function checkOpen(a,now=Date.now()) {if(a.retentionAt<=now)throw Error('這份分配的保存期限已到。');if(a.closed||a.dueAt<=now)throw Error('這份分配已截止；仍可查看已保存的成績。');}
export function checkRevision(r,value) {if(!Number.isInteger(value)||value!==r.revision)throw Error('進度已由另一頁更新，請重新載入後繼續。');}
export function recordFor(r,id) {return r.records[id]||{count:0,first:null,best:null,max:0,status:'missing',closed:false,fullOrdinal:null,lastAttemptId:null,pending:0,manualGrades:[]};}
export function attemptLimit(a,b) {return b.type==='spell'?null:a.mode==='practice'?4:1;}
function outcome(g) {return g.status==='pending'?'pending':g.status==='ungraded'?'ungraded':g.score===g.max?'full':g.score>0?'partial':'wrong';}
export function validateAnswer(b,answer) {
  if(JSON.stringify(answer??null).length>100000)throw Error('答案太大。');
  if(['open','cloud'].includes(b.type)&&typeof answer!=='string')throw Error('請輸入文字答案。');
  if(b.type==='open'&&(!String(answer||'').trim()||[...String(answer)].length>200))throw Error('請輸入1–200字元。');
  if(b.type==='cloud'&&(!String(answer||'').trim()||[...String(answer)].length>100))throw Error('請輸入1–100字元。');
  if(b.type==='draw'&&(!Array.isArray(answer)||answer.length>200||answer.some(l=>!l||!/^#[a-f0-9]{6}$/i.test(l.color)||![3,6,18].includes(l.width)||!Array.isArray(l.points)||!l.points.length||l.points.length>2500||l.points.some(p=>!Array.isArray(p)||p.length!==2||p.some((n,i)=>!Number.isFinite(n)||n<0||n>[1000,600][i])))))throw Error('繪圖資料無效。');
}
export function rewardFor(a,r,b,ordinal) {
  const position=r.sequence.indexOf(b.id),level=a.levels.find(l=>position>=l.start&&position<l.end),existing=r.awards[b.id];
  const other=Object.values(r.awards).filter(w=>w.blockId!==b.id&&w.level===level.level);
  const itemId=existing?.itemId||(other.length===0?(level.level===1?ITEM_IDS[0]:ITEM_IDS[level.level+1]):level.items[(position-level.start)%level.items.length]);
  const tier=Math.min(4,ordinal);return {blockId:b.id,level:level.level,itemId,tier,points:5-tier,firstCorrectSubmission:ordinal};
}
export function applyAttempt(a,r,b,answer,attemptId,now=Date.now(),trustedGrade=null) {
  const old=recordFor(r,b.id),limit=attemptLimit(a,b);
  if(old.closed||(limit&&old.count>=limit)||r.pendingAudio)throw Error('這題已完成或有錄音尚待確認。');
  validateAnswer(b,answer);
  const g=trustedGrade||grade(b,answer),rec=copy(old),ordinal=rec.count+1;
  rec.count=ordinal;rec.max=g.max;rec.lastAttemptId=attemptId;
  if(ordinal===1)rec.first=g.score;
  if(Number.isFinite(g.score))rec.best=Math.max(rec.best??0,g.score);
  rec.pending+=(g.status==='pending'?1:0);
  const full=g.status==='graded'&&g.max>0&&g.score===g.max;
  if(full)rec.fullOrdinal=rec.fullOrdinal??ordinal;
  if(['open','draw','audio'].includes(b.type))rec.manualGrades.push({attemptId,ordinal,...g});
  rec.closed=full||(Boolean(limit)&&ordinal>=limit)||g.status==='ungraded';
  const adopted=a.mode==='exam'?rec.first:rec.best;
  rec.status=rec.pending?'pending':g.status==='ungraded'?'ungraded':adopted===rec.max?'full':(adopted??0)>0?'partial':'wrong';
  r.records[b.id]=rec;if(full)r.awards[b.id]=rewardFor(a,r,b,rec.fullOrdinal);
  r.revision++;r.updatedAt=now;
  return {attemptId,studentId:r.studentId,uid:r.uid,blockId:b.id,ordinal,answer:copy(answer),grade:copy(g),submittedAt:now,outcome:outcome(g)};
}
export function advanceAssignment(a,r,revision,now=Date.now()) {
  checkOpen(a,now);checkRevision(r,revision);const b=currentBlock(a,r);if(!b)throw Error('整份分配已完成。');const rec=recordFor(r,b.id);
  if(r.pendingAudio||!rec.count||(!rec.closed&&!rec.pending))throw Error('請先完成目前這一題。');
  rec.closed=true;r.records[b.id]=rec;r.index++;r.revision++;r.updatedAt=now;
  if(r.index>=r.sequence.length){
    r.completedAt=now;
    const g=r.game;
    r.gameResult=isHeroes(a)?heroGameResult(a,r,now):{status:a.game==='none'?'questions-only':'cleared',levelsCompleted:a.game==='none'?0:a.levels.length,defeated:g.defeated,seconds:Math.round(g.seconds),recoveries:g.recoveries,score:a.game==='none'?0:g.defeated*10,finishedAt:now};
  }
}
export function scoreAssignment(a,r) {
  let earned=0,max=0,pending=0,completed=0;
  const details=r.sequence.map((id,i)=>{const b=a.deck.blocks.find(b=>b.id===id),rec=recordFor(r,id),graded=!b.ungraded&&!['slide','cloud'].includes(b.type),value=a.mode==='exam'?rec.first:rec.best;if(graded){max+=b.points;earned+=value??0;}pending+=rec.pending||0;completed+=rec.closed?1:0;return {blockId:id,number:i+1,type:b.type,title:b.title,attempts:rec.count,first:rec.first,best:rec.best,score:value,max:graded?b.points:0,status:rec.status,closed:rec.closed,pending:rec.pending,reward:r.awards[id]||null};});
  return {earned:Math.round(earned*100)/100,max,accuracy:max?Math.round(earned/max*1000)/10:0,completed,total:r.sequence.length,pending,provisional:pending>0,details};
}
export function assignmentSnapshot(a,r,lastAttempt=null,now=Date.now()) {
  const b=r?currentBlock(a,r):null;
  return {assignment:publicAssignment(a),expired:a.closed||a.dueAt<=now,run:r?{studentId:r.studentId,index:r.index,revision:r.revision,completedAt:r.completedAt,createdAt:r.createdAt,sequence:copy(r.sequence),records:copy(r.records),awards:copy(r.awards),game:copy(r.game),gameResult:copy(r.gameResult||null),pendingAudio:r.pendingAudio?{attemptId:r.pendingAudio.attemptId,blockId:r.pendingAudio.blockId}:null}:null,block:r?publicAssignmentBlock(a,r):null,level:r?currentLevel(a,r):a.levels[0],score:r?scoreAssignment(a,r):null,lastAnswer:lastAttempt&&b&&lastAttempt.blockId===b.id?copy(lastAttempt.answer):null,lastAttemptId:lastAttempt&&b&&lastAttempt.blockId===b.id?lastAttempt.attemptId:null,feedback:r&&lastAttempt&&b&&lastAttempt.blockId===b.id?feedbackFor(a,r,lastAttempt):null};
}
export function feedbackFor(a,r,attempt) {const b=a.deck.blocks.find(b=>b.id===attempt.blockId),rec=recordFor(r,b.id);return {attemptId:attempt.attemptId,blockId:b.id,outcome:attempt.outcome,score:attempt.grade.score,max:attempt.grade.max,ordinal:attempt.ordinal,retry:!rec.closed,adopted:a.mode==='exam'?rec.first:rec.best,reward:r.awards[b.id]||null,ai:attempt.ai?{total:attempt.ai.total_score,feedback:attempt.ai.feedback}:null};}
// AI speaking score of 85+ passes: it counts as full marks so the student moves on to the game.
export const AUDIO_PASS_SCORE=85;
export function audioPoints(total,points){return total>=AUDIO_PASS_SCORE?points:Math.round(total/100*points*100)/100;}
export function manuallyGrade(a,r,b,attempt,score,now=Date.now()) {
  if(!['open','draw','audio'].includes(b.type)||!Number.isFinite(score)||score<0||score>b.points)throw Error('人工評分或配分無效。');
  const rec=recordFor(r,b.id),entry=rec.manualGrades.find(g=>g.attemptId===attempt.attemptId);if(!entry)throw Error('找不到這次作答。');
  entry.status='graded';entry.score=score;entry.max=b.points;
  rec.pending=rec.manualGrades.filter(g=>g.status==='pending').length;
  rec.first=rec.manualGrades.find(g=>g.ordinal===1)?.score??null;
  const numeric=rec.manualGrades.filter(g=>Number.isFinite(g.score));rec.best=numeric.length?Math.max(...numeric.map(g=>g.score)):null;
  const full=rec.manualGrades.filter(g=>g.status==='graded'&&g.max>0&&g.score===g.max).sort((x,y)=>x.ordinal-y.ordinal)[0];
  rec.fullOrdinal=full?.ordinal??null;if(full){rec.closed=true;r.awards[b.id]=rewardFor(a,r,b,full.ordinal);}else delete r.awards[b.id];
  const adopted=a.mode==='exam'?rec.first:rec.best;rec.status=rec.pending?'pending':adopted===b.points?'full':(adopted??0)>0?'partial':'wrong';
  r.records[b.id]=rec;r.revision++;r.updatedAt=now;attempt.grade={status:'graded',score,max:b.points};attempt.outcome=outcome(attempt.grade);attempt.reviewedAt=now;
}
