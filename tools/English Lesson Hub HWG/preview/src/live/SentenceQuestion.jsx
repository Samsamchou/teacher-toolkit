import {QuestionActions} from './QuestionActions.jsx';
import { SENTENCE_ROLES } from './sentence-rebuild.mjs';
import React, {useState,useRef,useEffect} from 'react';
export function SentenceQuestion({block,disabled,onSubmit,reveal,savedAnswer,savedAttemptId,allowRetry,savedAttemptNumber=0,assignmentMode=false}) {
  const [rows,setRows]=useState(()=>Array.from({length:block.sentenceCount},()=>[]));
  const [passed,setPassed]=useState(false);
  const [selected,setSelected]=useState(null),[state,setState]=useState('idle'),[error,setError]=useState('');
  const attempt=useRef(crypto.randomUUID());
  useEffect(()=>{if(savedAnswer===undefined)return;setRows(savedAnswer);setState(allowRetry?'idle':'sent');setPassed(!allowRetry);setSelected(null);if(allowRetry)attempt.current=crypto.randomUUID();},[savedAttemptId,allowRetry]);
  const lock=disabled||state!=='idle'||reveal||passed;
  const cards=block.cards||[],text=id=>cards.find(c=>c.id===id)?.text||'?',used=new Set(rows.flat());
  function place(id,row,index) {
    if(lock||!cards.some(c=>c.id===id))return;
    setRows(current=>{const old=current[row].indexOf(id);const next=current.map(r=>r.filter(v=>v!==id));let at=index??next[row].length;if(index!==undefined&&old>=0&&old<at)at--;next[row].splice(Math.max(0,Math.min(at,next[row].length)),0,id);return next;});setSelected(null);
  }
  function remove(id){if(lock)return;setRows(r=>r.map(a=>a.filter(v=>v!==id)));setSelected(null);}
  function drop(e,row,index){e.preventDefault();e.stopPropagation();const id=e.dataTransfer.getData('text/plain');if(row===null)remove(id);else place(id,row,index);}
  function card(id,row,index){return <button type="button" className="lh-sentence-card" key={id} disabled={lock} draggable={!lock} aria-pressed={selected===id} aria-label={(row===null?'字卡 ':'移回字卡 ')+text(id)} onDragStart={e=>{e.dataTransfer.setData('text/plain',id);e.dataTransfer.effectAllowed='move';}} onDragOver={e=>{if(!lock)e.preventDefault();}} onDrop={e=>{if(row!==null)drop(e,row,index);else drop(e,null);}} onClick={e=>{e.stopPropagation();if(row===null)setSelected(selected===id?null:id);else if(selected)place(selected,row,index);else remove(id);}}>{text(id)}</button>;}
  return <section className="lh-answer lh-sentence-answer" data-question-type="sentence">
    <div className="lh-answer-heading"><strong>句子重組</strong><span>{state==='sent'?'✓ 已送出':'完成全部句子後一起提交'}</span></div>
    <p aria-live="polite">{selected?'已選「'+text(selected)+'」；點答案列放到最後，或點列內字卡插到前面。':'拖曳字卡到答案列，或先點字卡再點答案列。點列內字卡可移回。'}</p>
    {!assignmentMode&&<p className="lh-sentence-retry-note">可無限重試；2次內提交全對玩2回合，超過2次玩1回合。{savedAttemptNumber>0?' 已提交 '+savedAttemptNumber+' 次。':''}</p>}
    {rows.map((row,i)=><div className={'lh-sentence-line role-'+(block.sentenceRoles?.[i]||'sentence')+(passed?' is-correct':'')} key={i}><strong>{passed?'✓ ':''}{SENTENCE_ROLES[block.sentenceRoles?.[i]]||'句子'}{(block.sentenceRoles?.[i]||'sentence')==='sentence'?' '+(i+1):''}</strong><button type="button" className="lh-sentence-place" aria-label={'放到第 '+(i+1)+' 列最後'} disabled={lock||!selected} onClick={()=>{if(selected)place(selected,i);}}>放入這一列</button><div className="lh-sentence-drop" role="button" tabIndex={lock?-1:0} aria-disabled={lock} aria-label={'句子 '+(i+1)+' 放入字卡'} onClick={()=>{if(selected)place(selected,i);}} onKeyDown={e=>{if(e.target===e.currentTarget&&['Enter',' '].includes(e.key)){e.preventDefault();if(selected)place(selected,i);}}} onDragOver={e=>{if(!lock)e.preventDefault();}} onDrop={e=>drop(e,i)}>
      {!row.length&&<span className="lh-sentence-placeholder">把字卡排在這裡</span>}
      {row.map((id,k)=><span className="lh-sentence-unit" key={id}>{card(id,i,k)}<span className="lh-sentence-arrows"><button type="button" disabled={lock||k===0} aria-label={text(id)+' 左移，句子 '+(i+1)+' 第 '+(k+1)+' 字'} onClick={e=>{e.stopPropagation();place(id,i,k-1);}}>←</button><button type="button" disabled={lock||k===row.length-1} aria-label={text(id)+' 右移，句子 '+(i+1)+' 第 '+(k+1)+' 字'} onClick={e=>{e.stopPropagation();place(id,i,k+2);}}>→</button></span></span>)}
    </div></div>)}
    <div className="lh-sentence-pool" aria-label="可用字卡" onDragOver={e=>{if(!lock)e.preventDefault();}} onDrop={e=>drop(e,null)}>{cards.filter(c=>!used.has(c.id)).map(c=>card(c.id,null))}{cards.every(c=>used.has(c.id))&&<span>字卡已全部放入</span>}</div>
    <QuestionActions><div className="lh-row"><button type="button" disabled={lock} onClick={()=>{setRows(Array.from({length:block.sentenceCount},()=>[]));setSelected(null);}}>全部移回</button><button className="lh-primary" disabled={lock||rows.some(r=>!r.length)} onClick={async()=>{setState('sending');setError('');try{const next=await onSubmit(rows,attempt.current);const retry=next?.feedback?.outcome!=='full';setState(retry?'idle':'sent');setPassed(!retry);if(retry)attempt.current=crypto.randomUUID();}catch(e){setError(e.message);setState('idle');}}}>{state==='sending'?'提交中…':state==='sent'?'已提交，等待老師':'提交答案'}</button></div></QuestionActions>
    {error&&<p role="alert" className="lh-error">{error}</p>}
    {reveal&&<p className="lh-review-solution">正確句子：{block.correctSentences?.join(' / ')}</p>}
  </section>;
}
