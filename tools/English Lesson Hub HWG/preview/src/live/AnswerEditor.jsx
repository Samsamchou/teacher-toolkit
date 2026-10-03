import React from 'react';

// These controls adapt the existing data model; no migration or grading change.
export function AnswerEditor({ block, patch }) {
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
