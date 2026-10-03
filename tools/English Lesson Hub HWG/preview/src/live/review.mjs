// Presentation only: never recalculate or overwrite historical grades.
import { requiresMastery } from './mastery.mjs';
export const reviewLabels = {full:'全對',partial:'部分答對',wrong:'答錯',missing:'未作答',pending:'待教師評分',ungraded:'已提交・不計分',unknown:'已提交・評分資料不足'};
export function answerStatus(block, response) {
  if (!response) return 'missing';
  const g=response.grade;
  if (!g) return 'unknown';
  if (g.status==='pending') return 'pending';
  if (g.status==='ungraded'||g.max===0) return 'ungraded';
  if(g.status!=='graded')return 'unknown';
  const a=response.answer;
  let units;
  if (block && ['choice','multiselect','dropdown'].includes(block.type) && Array.isArray(block.answer)) {
    const selected=Array.isArray(a)?a:[a];
    if(block.answer.length && selected.length===block.answer.length && selected.every(x=>block.answer.includes(x)))return 'full';
    return selected.some(x=>block.answer.includes(x))?'partial':'wrong';
  }
  if(block?.type==='vowel'&&Array.isArray(a))units=block.vowelWords.flatMap((w,i)=>w.targets.map(k=>(a[i]||[]).includes(k)));
  else if(block?.type==='order'&&Array.isArray(a))units=block.items.map((v,i)=>v===a[i]);
  else if(block?.type==='category'&&Array.isArray(a))units=block.mapping.map((v,i)=>v===a[i]);
  else if(g.details?.length){
    if(g.details.some(d=>typeof d.target==='boolean')) {
      if(g.details.every(d=>!!d.selected===!!d.target))return 'full';
      return g.details.some(d=>d.target&&d.selected)?'partial':'wrong';
    }
    if(g.details.every(d=>typeof d.correct==='boolean'))units=g.details.map(d=>d.correct);
  }
  if(units?.length)return units.every(Boolean)?'full':units.some(Boolean)?'partial':'wrong';
  if(!Number.isFinite(g.score)||!Number.isFinite(g.max))return 'unknown';
  return g.score===g.max?'full':g.score>0?'partial':'wrong';
}
// Only attach this receipt to the submitting student's action response. Snapshots
// continue hiding scores and answer keys until the teacher reveals the answer.
export function responseFeedback(block, response) {
  if (!block || !response?.attemptId) return null;
  const objective = requiresMastery(block);
  const outcome = objective && typeof response.rewardPass === 'boolean'
    ? response.rewardPass ? 'full' : response.grade.status === 'ungraded' || response.grade.max === 0 ? 'wrong' : answerStatus(block, response)
    : answerStatus(block, response);
  return ['full', 'partial', 'wrong'].includes(outcome)
    ? { attemptId: response.attemptId, outcome, ...(objective ? {mastery:true} : {}) }
    : null;
}
export function answerText(block, answer) {
  if(answer===undefined||answer===null)return '未作答';
  if(block && ['choice','multiselect'].includes(block.type))return (Array.isArray(answer)?answer:[answer]).map(i=>`${String.fromCharCode(65+Number(i))}. ${block.options?.[i]??'未知選項'}`).join('、');
  if(block?.type==='order')return answer.join(' → ');
  if(block?.type==='category')return block.items.map((v,i)=>`${v}：${block.groups?.[answer[i]]??'未分類'}`).join('；');
  if(block?.type==='label'&&block.anchors)return block.anchors.map((v,i)=>`${i+1}：${block.labels.find(l=>l.id===answer[v.id])?.text??'未填'}`).join('；');
  if(['label','drag'].includes(block?.type)&&block.modelVersion!==3)return block.items.map((v,i)=>`${v}：位置 ${Number(answer[i])+1}`).join('；');
  if(block?.type==='hotspot')return block.regions&&Array.isArray(answer)?answer.map(id=>`區域 ${block.regions.findIndex(r=>r.id===id)+1}`).join('、'):`點選位置：${Math.round(answer.x*100)}%、${Math.round(answer.y*100)}%`;
  if(block?.type==='dropdown'&&block.modelVersion!==3)return block.options?.[answer]??String(answer);
  if(block?.type==='vowel')return block.vowelWords.map((w,i)=>`${w.word}：${(answer[i]||[]).map(k=>w.word[k]).join('')}`).join('；');
  if(block?.blanks)return block.blanks.map((v,i)=>`${i+1}：${answer[v.id]??'未填'}`).join('；');
  if(block?.type==='draw')return '繪圖作答（見圖）';
  return typeof answer==='string'?answer:JSON.stringify(answer);
}
export function csvCell(value) {
  let s=String(value??'');
  if(/^[\s]*[=+@-]/.test(s))s="'"+s;
  return '"'+s.replaceAll('"','""')+'"';
}
// Ranking is a view over the saved room snapshot; it never changes historical
// answers, scores, question numbers, or the order used by the student tab.
export function rankClassQuestions(rows, blocks) {
  const ranked=blocks.filter(b=>b.type!=='slide').map((block,index)=>{
    const counts={full:0,partial:0,wrong:0,missing:0,pending:0,ungraded:0,unknown:0};
    for(const row of rows){
      const status=answerStatus(block,row.details?.find(d=>d.blockId===block.id));
      counts[status]=(counts[status]||0)+1;
    }
    return {block,questionNumber:index+1,counts,errorCount:counts.partial+counts.wrong,rank:null,tier:null};
  });
  ranked.sort((a,b)=>b.errorCount-a.errorCount||a.questionNumber-b.questionNumber);
  let lastCount=0,rank=0;
  for(const item of ranked){
    if(!item.errorCount)continue;
    if(item.errorCount!==lastCount){rank++;lastCount=item.errorCount;}
    item.rank=rank;
    item.tier=rank<=3?rank:null;
  }
  return ranked;
}
export function reviewCsv(rows, blocks) {
  const lines=[['學號','題號','錯題名次','需檢討人數','部分答對人數','全錯人數','題目','全部選項或項目','狀態','學生答案','正解','得分','滿分','逐選項評分明細']];
  for(const item of rankClassQuestions(rows,blocks))for(const row of rows){
    const b=item.block;
    const r=row.details?.find(d=>d.blockId===b.id),status=answerStatus(b,r);
    if(!['partial','wrong'].includes(status))continue;
    lines.push([row.studentId,item.questionNumber,item.rank,item.errorCount,item.counts.partial,item.counts.wrong,b.title,(b.options||b.items||b.blanks?.flatMap(x=>[...(x.answers||[]),...(x.distractors||[])])||[]).join(' / '),reviewLabels[status],answerText(b,r.answer),b.reviewSolution||'',r.grade.score,r.grade.max,JSON.stringify(r.grade.details||[])]);
  }
  return '\ufeff'+lines.map(l=>l.map(csvCell).join(',')).join('\r\n');
}
export function reportAccess(room, uid, now=Date.now()) {
  if(!room||room.teacher!==uid)throw new Error('需要本堂課教師權限。');
  // Cloud uses its existing retentionAt; legacy/local records keep their own expiry.
  if((room.retentionAt||room.expiresAt)<now)throw new Error('報告已超過保存期限。');
}
export function reportSummary(room) {
  return {code:room.code,title:room.deck.title,createdAt:room.createdAt,completedAt:room.completedAt||null,retentionAt:room.retentionAt||room.expiresAt};
}
