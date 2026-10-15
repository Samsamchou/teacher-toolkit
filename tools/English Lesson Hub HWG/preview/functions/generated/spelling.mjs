// Letter identity is opaque: a public tile ID never encodes its answer position.
const clone=v=>JSON.parse(JSON.stringify(v));
const canonical=v=>String(v??'').normalize('NFKC').trim().replace(/\s+/g,' ');
const targetFor=b=>b.spellingVersion===2?canonical(b.spellingAnswer):canonical(b.spellingAnswer).toLowerCase();
export function spellDefinition(answer,distractors='') {
  // Keep the editable value, including a space just typed between two words.
  const raw=String(answer??'').normalize('NFKC'),text=canonical(raw),letters=[...text.replaceAll(' ','')];
  const extra=[...String(distractors).normalize('NFKC').replace(/\s/g,'')];
  const tiles=[...letters,...extra].map(text=>({id:crypto.randomUUID(),text}));
  for(let i=tiles.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[tiles[i],tiles[j]]=[tiles[j],tiles[i]];}
  return {spellingVersion:2,spellingAnswer:raw,spellDistractors:distractors,spellTiles:tiles};
}
export function validateSpell(b,{draft=false}={}) {
  const answer=targetFor(b),letterPattern=b.spellingVersion===2?/^[A-Za-z]$/:/^[a-z]$/;
  if(draft&&!answer)return;
  if(!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(answer)||answer.replaceAll(' ','').length>48||answer.split(' ').length>8)throw Error('拼字正解需為1–48個英文字母，可用空格組成最多8個單字；大小寫須依教材輸入。');
  if(!Array.isArray(b.spellTiles)||b.spellTiles.length>76||new Set(b.spellTiles.map(t=>t.id)).size!==b.spellTiles.length||b.spellTiles.some(t=>!/^[-\w]{1,100}$/.test(t.id)||!letterPattern.test(t.text)))throw Error('拼字字卡格式無效。');
  const pool=b.spellTiles.map(t=>t.text);
  for(const letter of answer.replaceAll(' ','')){const index=pool.indexOf(letter);if(index<0)throw Error('拼字字卡缺少正解字母。');pool.splice(index,1);}
}
export function publicSpell(b,reveal=false) {
  const safe=clone(b);
  for(const key of ['spellingAnswer','spellDistractors','answer','alternatives','mapping','notes','focusRule','migration','displayItems','correctOrder'])delete safe[key];
  if(safe.questionCanvas)delete safe.questionCanvas.original;
  safe.spellGroups=targetFor(b).split(' ').map(word=>word.length);
  safe.spellCaseSensitive=b.spellingVersion===2;
  safe.spellTiles=(b.spellTiles||[]).map(({id,text})=>({id,text}));
  if(reveal)safe.correctSpelling=targetFor(b);
  return safe;
}
export function gradeSpell(b,answer) {
  validateSpell(b);
  const target=targetFor(b),groups=target.split(' ');
  if(!Array.isArray(answer)||answer.length!==target.replaceAll(' ','').length||new Set(answer).size!==answer.length||answer.some(id=>!b.spellTiles.some(t=>t.id===id)))throw Error('請用不同字卡完成每個字母格，再提交。');
  const letters=answer.map(id=>b.spellTiles.find(t=>t.id===id).text);let offset=0;
  // Word boundaries are fixed by the question and reconstructed as single spaces.
  const text=groups.map(word=>{const value=letters.slice(offset,offset+word.length).join('');offset+=word.length;return value;}).join(' ');
  const correct=text===target;
  return {status:b.ungraded?'ungraded':'graded',score:b.ungraded?null:correct?b.points:0,max:b.ungraded?0:b.points,correct,scoringVersion:b.spellingVersion===2?'spell-2':'spell-1'};
}
