// Shared server/client contract. Card IDs encode neither sentence nor answer position.
export const splitSentence = value => value.trim().split(/\s+/u).filter(Boolean);
export const SENTENCE_ROLES = Object.freeze({question:'問句',answer:'答句',sentence:'句子'});
export function sentenceRoles(b) {
  return b.sentences.map((text,i)=>{
    const configured=b.sentenceRoles?.[i];
    return configured && configured!=='auto' ? configured : /[?？]$/.test(text.trim()) ? 'question' : i>0 && /[?？]$/.test(b.sentences[i-1].trim()) ? 'answer' : 'sentence';
  });
}
export function validateSentence(b, {draft=false}={}) {
  const fail=m=>{throw Error(m);};
  if(!Array.isArray(b.sentences)||b.sentences.length<1||b.sentences.length>3||b.sentences.some(s=>typeof s!=='string'||s.length>200))fail('句子重組需要 1–3 句，每句最多 200 字元。');
  if(b.sentenceRoles!==undefined&&(!Array.isArray(b.sentenceRoles)||b.sentenceRoles.length!==b.sentences.length||b.sentenceRoles.some(r=>!['auto','question','answer','sentence'].includes(r))))fail('請設定有效的句子欄位標示。');
  if(!draft&&b.sentences.some(s=>splitSentence(s).length<2))fail('每個正確句子至少需要兩個字。');
  if(!Array.isArray(b.distractors)||b.distractors.length>30||b.distractors.some(s=>typeof s!=='string'||s.length>40||/\s/u.test(s.trim())))fail('干擾字每行一個，最多 30 個，每個最多 40 字元。');
  if(b.sentences.flatMap(splitSentence).length+b.distractors.length>60)fail('每題最多 60 張字卡。');
  if(b.partial!==false||b.ungraded!==false||b.points<=0)fail('句子重組須全對計分，配分至少 1 分。');
}
const hash=s=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
export function sentenceCards(b) {
  // Canonical alphabetical list before assigning IDs, never source answer order.
  return [...b.sentences.flatMap(splitSentence),...b.distractors.map(s=>s.trim()).filter(Boolean)].sort().map((text,i)=>({id:'card-'+i,text})).sort((a,c)=>hash(b.id+a.id)-hash(b.id+c.id)||a.id.localeCompare(c.id));
}
export function publicSentence(b,reveal=false) {
  const s=JSON.parse(JSON.stringify(b));
  for(const k of ['sentences','distractors','answer','alternatives','mapping','items','displayItems','notes','focusRule','migration','correctSentences'])delete s[k];
  if(s.slideCanvas)delete s.slideCanvas.original;
  if(s.questionCanvas)delete s.questionCanvas.original;
  delete s.embed;
  s.cards=sentenceCards(b);s.sentenceCount=b.sentences.length;s.sentenceRoles=sentenceRoles(b);
  if(reveal)s.correctSentences=[...b.sentences];
  return s;
}
export function sentenceRowsText(b,rows) {
  const cards=new Map((b.cards||sentenceCards(b)).map(c=>[c.id,c.text]));
  return rows.map(row=>row.map(id=>cards.get(id)||'?').join(' '));
}
export function gradeSentence(b,rows) {
  validateSentence(b);
  const cards=new Map(sentenceCards(b).map(c=>[c.id,c.text]));
  if(!Array.isArray(rows)||rows.length!==b.sentences.length||rows.some(r=>!Array.isArray(r)||!r.length||r.length>60))throw Error('請完成每一列句子。');
  const ids=rows.flat();if(new Set(ids).size!==ids.length||ids.some(id=>!cards.has(id)))throw Error('字卡不可重複或不存在。');
  const details=rows.map((r,i)=>({id:String(i),correct:JSON.stringify(r.map(id=>cards.get(id)))===JSON.stringify(splitSentence(b.sentences[i]))}));
  return {status:'graded',score:details.every(d=>d.correct)?b.points:0,max:b.points,scoringVersion:'sentence-rebuild-1',details};
}
