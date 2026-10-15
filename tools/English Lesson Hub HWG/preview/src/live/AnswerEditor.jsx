import React from 'react';
import { sentenceRoles, SENTENCE_ROLES } from './sentence-rebuild.mjs';

// These controls adapt the existing data model; no migration or grading change.
export function AnswerEditor({ block, patch }) {
  if(block.type==='sentence')return <section className="lh-answer-editor" aria-label="句子重組設定">
    <p>正解只供教師設定；學生上方顯示另外填寫的提示文字。每句以空格拆成字卡，標點跟著單字。</p>
    {block.sentences.map((s,i)=><div className="lh-answer-card" key={i}><label>正確句子 {i+1}<input aria-label={'正確句子 '+(i+1)} maxLength={200} value={s} onChange={e=>patch({sentences:block.sentences.map((v,k)=>k===i?e.target.value:v)})}/></label><label>欄位標示<select aria-label={'句子 '+(i+1)+' 欄位標示'} value={block.sentenceRoles?.[i]||'auto'} onChange={e=>patch({sentenceRoles:block.sentences.map((_,k)=>k===i?e.target.value:block.sentenceRoles?.[k]||'auto')})}><option value="auto">自動：{SENTENCE_ROLES[sentenceRoles(block)[i]]}</option><option value="question">問句</option><option value="answer">答句</option><option value="sentence">句子</option></select></label><button disabled={block.sentences.length===1} onClick={()=>patch({sentences:block.sentences.filter((_,k)=>k!==i),sentenceRoles:block.sentences.map((_,k)=>block.sentenceRoles?.[k]||'auto').filter((_,k)=>k!==i)})}>移除句子 {i+1}</button></div>)}
    <button disabled={block.sentences.length>=3} onClick={()=>patch({sentences:[...block.sentences,''],sentenceRoles:[...block.sentences.map((_,k)=>block.sentenceRoles?.[k]||'auto'),'auto']})}>＋ 新增正確句子</button>
    <label>干擾字（每行一個，可留空）<textarea aria-label="干擾字" value={block.distractors.join('\n')} onChange={e=>patch({distractors:e.target.value.split('\n')})}/></label>
    <small>最多 60 張字卡。各列對應句子順序；可無限重試；第1或第2次提交全對可玩2回合，第3次起全對可玩1回合。</small>
  </section>;
  if (['choice', 'dropdown','multiselect'].includes(block.type)) {
    return <section className="lh-answer-editor" aria-label="選項與正確答案">
      <p>輸入各個選項，再點選「正確答案」。</p>
      {block.type==='multiselect'&&<p role="status">請設定 2–4 個正解，目前 {block.answer.length} 個。採選對加分、選錯扣分，最低零分。</p>}
      <div className="lh-answer-cards">{block.options.map((option, i) => <div className="lh-answer-card" key={i} data-correct={block.answer.includes(i)}>
        <div className="lh-row"><strong>選項 {String.fromCharCode(65 + i)}</strong>
          <button type="button" disabled={block.type==='multiselect'&&!block.answer.includes(i)&&block.answer.length>=4} aria-pressed={block.answer.includes(i)} onClick={() => patch({ answer: block.multiple ? block.answer.includes(i) ? block.answer.filter(n => n !== i) : [...block.answer, i] : [i] })}>{block.answer.includes(i) ? '✓ 正確答案' : '○ 設為正確'}</button></div>
        <textarea aria-label={`選項 ${i + 1}`} value={option} onChange={e => patch({ options: block.options.map((v, n) => n === i ? e.target.value : v) })} />
        <button type="button" disabled={block.options.length <= 2} aria-label={`刪除選項 ${i + 1}`} onClick={() => patch({ options: block.options.filter((_, n) => n !== i), answer: block.answer.filter(n => n !== i).map(n => n > i ? n - 1 : n) })}>移除此選項</button>
      </div>)}</div>
      <div className="lh-row"><button disabled={block.options.length >= 6} onClick={() => patch({ options: [...block.options, ''] })}>＋ 新增選項</button>
      {block.type!=='multiselect'&&<label><input type="checkbox" checked={block.multiple} onChange={e => patch({ multiple: e.target.checked, answer: e.target.checked ? block.answer : block.answer.slice(0, 1) })} />允許複選</label>}</div>
    </section>;
  }
  if (block.type === 'blank') return <section className="lh-answer-editor" aria-label="填空答案設定">
    <p>學生輸入一個答案；下列任一答案皆可接受（忽略大小寫）。</p>
    {block.alternatives.map((answer, i) => <div className="lh-row" key={i}><label>{i === 0 ? '正確答案' : `替代答案 ${i}`}<input value={answer} onChange={e => patch({ alternatives: block.alternatives.map((v, n) => n === i ? e.target.value : v) })} /></label><button disabled={block.alternatives.length <= 1} onClick={() => patch({ alternatives: block.alternatives.filter((_, n) => n !== i) })}>移除答案 {i + 1}</button></div>)}
    <button onClick={() => patch({ alternatives: [...block.alternatives, ''] })}>＋ 可接受的替代答案</button>
  </section>;
  if (block.type === 'order') {
    const move = (i, step) => { const items = [...block.items]; [items[i], items[i + step]] = [items[i + step], items[i]]; patch({ items }); };
    return <section className="lh-answer-editor" aria-label="正確排序"><p>請排成正確順序；學生作答時會打亂。</p>
      {block.items.map((item, i) => <div className="lh-sequence-row" key={i}><strong>{i + 1}</strong><input aria-label={`排序項目 ${i + 1}`} value={item} onChange={e => patch({ items: block.items.map((v, n) => n === i ? e.target.value : v) })} /><button aria-label={`項目 ${i + 1} 上移`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button><button aria-label={`項目 ${i + 1} 下移`} disabled={i === block.items.length - 1} onClick={() => move(i, 1)}>↓</button><button disabled={block.items.length <= 2} onClick={() => patch({ items: block.items.filter((_, n) => n !== i) })}>移除</button></div>)}
      <button onClick={() => patch({ items: [...block.items, ''] })}>＋ 新增排序項目</button>
    </section>;
  }
  return null;
}
