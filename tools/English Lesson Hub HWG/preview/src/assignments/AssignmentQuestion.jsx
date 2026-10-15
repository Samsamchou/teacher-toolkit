import {QuestionActions} from '../live/QuestionActions.jsx';
import React,{useRef,useState} from 'react';
import {SpellQuestion} from '../live/SpellQuestion.jsx';
import {SentenceQuestion} from '../live/SentenceQuestion.jsx';
import {ParityQuestion} from '../live/ParityQuestion.jsx';
import {HorizontalOrder} from '../live/HorizontalOrder.jsx';
import {MediaAsset} from './MediaAsset.jsx';
export function AssignmentQuestion({block:b,disabled,onSubmit,savedAnswer,savedAttemptId}) {
 if(b.type==='spell')return <SpellQuestion block={b} disabled={disabled} onSubmit={onSubmit} savedAnswer={savedAnswer} savedAttemptId={savedAttemptId} allowRetry={!disabled}/>;
 if(b.type==='sentence')return <SentenceQuestion block={b} disabled={disabled} onSubmit={onSubmit} savedAnswer={savedAnswer??undefined} savedAttemptId={savedAttemptId} allowRetry={!disabled} assignmentMode/>;
 if(b.modelVersion===3&&['blank','drag','dropdown','label','hotspot','draw'].includes(b.type))return <ParityQuestion block={b} disabled={disabled} onSubmit={onSubmit} savedAnswer={savedAnswer??undefined} savedAttemptId={savedAttemptId} allowRetry={!disabled}/>;
 return <BasicQuestion key={b.id+'-'+(savedAttemptId||'new')} block={b} disabled={disabled} onSubmit={onSubmit} savedAnswer={savedAnswer}/>;
}
function BasicQuestion({block:b,disabled,onSubmit,savedAnswer}) {
 const initial=b.type==='order'?b.items.map((_,i)=>i):['choice','multiselect'].includes(b.type)?[]:b.type==='vowel'?b.vowelWords.map(()=>[]):['category','drag','label'].includes(b.type)?b.items.map(()=>null):b.type==='draw'?[]:'';
 const [answer,setAnswer]=useState(savedAnswer??initial),[busy,setBusy]=useState(false),[error,setError]=useState('');const receipt=useRef(crypto.randomUUID()),lock=disabled||busy;
 const toggle=i=>setAnswer(a=>b.multiple||b.type==='multiselect'?a.includes(i)?a.filter(x=>x!==i):[...a,i]:[i]);
 return <section className="lh-answer" data-question-type={b.type}>
 {['choice','multiselect'].includes(b.type)&&<div className="lh-options">{(b.displayOrder||b.options.map((_,i)=>i)).map((i,k)=><button key={i} disabled={lock||(b.type==='multiselect'&&!answer.includes(i)&&answer.length>=b.requiredSelections)} aria-pressed={answer.includes(i)} onClick={()=>toggle(i)}>{String.fromCharCode(65+k)}. {b.options[i]}</button>)}</div>}
 {['blank','open','cloud'].includes(b.type)&&<label>你的答案<textarea aria-label="你的答案" maxLength={b.type==='open'?200:b.type==='cloud'?100:2000} disabled={lock} value={answer} onChange={e=>setAnswer(e.target.value)}/></label>}
 {b.type==='dropdown'&&<label>選擇答案<select value={answer} disabled={lock} onChange={e=>setAnswer(Number(e.target.value))}><option value="">請選擇</option>{(b.displayOrder||b.options.map((_,i)=>i)).map(i=><option value={i} key={i}>{b.options[i]}</option>)}</select></label>}
 {b.type==='order'&&<HorizontalOrder items={b.items} answer={answer} setAnswer={setAnswer} disabled={lock}/>}
 {['category','drag','label'].includes(b.type)&&b.items.map((item,i)=><label className="lh-row" key={i}>{item}<select disabled={lock} value={answer[i]??''} onChange={e=>setAnswer(a=>a.map((v,n)=>n===i?Number(e.target.value):v))}><option value="">請選擇</option>{(b.type==='category'?(b.groupOrder||b.groups.map((_,i)=>i)):b.zones.map((_,i)=>i)).map(k=><option key={k} value={k}>{b.type==='category'?b.groups[k]:'位置 '+(k+1)}</option>)}</select></label>)}
 {b.type==='vowel'&&b.vowelWords.map((word,i)=><div className="as-vowel-word" key={i}>{word.imageId&&<MediaAsset asset={b.media.find(a=>a.id===word.imageId)}/>}<div>{[...word.word].map((letter,k)=>letter===' '?<span key={k}>　</span>:<button key={k} disabled={lock} aria-pressed={answer[i]?.includes(k)||false} aria-label={`單字${i+1}字母${letter}位置${k+1}`} onClick={()=>setAnswer(a=>a.map((row,n)=>n===i?row.includes(k)?row.filter(x=>x!==k):[...row,k]:row))}>{letter}</button>)}</div></div>)}
 {b.type==='hotspot'&&<div className="as-hotspot" onClick={e=>{if(lock)return;const r=e.currentTarget.getBoundingClientRect();setAnswer({x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height});}}>{b.media[0]&&<MediaAsset asset={b.media[0]}/>}<p>點選答案位置{answer?.x!==undefined?' · 已選取':''}</p></div>}
 <QuestionActions><button className="lh-primary" disabled={lock} onClick={async()=>{setBusy(true);setError('');try{let value=answer;if(b.type==='order')value=answer.map(i=>b.items[i]);const next=await onSubmit(value,receipt.current);if(next?.saved)receipt.current=crypto.randomUUID();}catch(e){setError(e.message);}finally{setBusy(false);}}}>{busy?'提交中…':'提交答案'}</button></QuestionActions>{error&&<p role="alert">{error}</p>}</section>;
}
