import React,{useState} from 'react';
import {answerStatus,answerText,reviewLabels,reviewCsv,rankClassQuestions} from './review.mjs';
import {solutionText} from './parity.mjs';
import {useMediaResource} from './useMediaResource.jsx';
import {api} from './transport.mjs';
import {Drawing} from './ParityQuestion.jsx';
import {Picture,Region} from './ParityEditor.jsx';
const download=(name,text,type)=>{const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
function ReportImage({asset}){const {url,error}=useMediaResource(asset.id);return url?<img src={url} alt={asset.name||'題目圖片'}/>:<p>{error||'載入題目圖片…'}</p>;}
export function correctText(b){
  if(!b)return '缺少當堂原題，不能以目前題庫代替';
  if(b.type==='vowel')return b.vowelWords.map(w=>`${w.word}：${w.targets.map(i=>w.word[i]).join('')}`).join('；');
  if(b.modelVersion!==3){
    if(b.type==='blank')return (b.alternatives||[]).join(' / ');
    if(['choice','multiselect','dropdown'].includes(b.type))return (b.answer||[]).map(i=>b.options[i]).join(' / ');
    if(['label','drag'].includes(b.type))return b.items.map((v,i)=>`${v}：位置 ${b.mapping[i]+1}`).join('；');
    if(b.type==='hotspot')return b.zones.map((z,i)=>`區域 ${i+1}（左 ${Math.round(z.x*100)}%、上 ${Math.round(z.y*100)}%、寬 ${Math.round(z.w*100)}%、高 ${Math.round(z.h*100)}%）`).join('；');
  }
  return solutionText(b);
}
export function QuestionReview({block:b,response,referenceOnly=false}){
  if(!b)return <p role="alert">缺少當堂原题快照；僅保留作答與原始成績，不以目前題庫補造。</p>;
  const a=response?.answer,status=answerStatus(b,response),selected=Array.isArray(a)?a:[a];
  return <article className="lh-question-review">
    <h3>{b.title}</h3>{b.sentence&&<p>{b.sentence.replace(/\{\{[^}]+\}\}/g,'＿＿')}</p>}
    {(b.media||[]).filter(m=>m.kind==='image'&&!(['label','hotspot'].includes(b.type)&&m.id===b.background?.assetId)).map(m=><ReportImage key={m.id} asset={m}/>)}
    {b.modelVersion===3&&b.type==='label'&&<Picture block={b}>{b.anchors.map((v,i)=><span key={v.id} className="lh-anchor" style={{left:`${v.x*100}%`,top:`${v.y*100}%`}}>{i+1}: {b.labels.find(l=>l.id===v.labelId)?.text}</span>)}</Picture>}
    {b.modelVersion===3&&b.type==='hotspot'&&<Picture block={b}><svg className="lh-regions" viewBox="0 0 1000 1000" preserveAspectRatio="none">{b.regions.map((r,i)=><Region key={r.id} region={r} className={r.correct?'selected':''}><title>區域 {i+1} {r.correct?'正確答案':''}</title></Region>)}</svg></Picture>}
    {b.blanks?.map((blank,i)=><p key={blank.id}>空格 {i+1} 選項：{[...(blank.answers||[]),...(blank.distractors||[])].join(' / ')}；正解：{blank.answers.join(' / ')}</p>)}
    {b.type==='order'&&<p>字卡：{b.items.join(' ｜ ')}</p>}
    {b.type==='category'&&<><p>群組：{b.groups.join(' ｜ ')}</p><p>項目：{b.items.join(' ｜ ')}</p></>}
    {['choice','multiselect',...(b.modelVersion!==3?['dropdown']:[])].includes(b.type)&&b.options?.length>0&&<div className="lh-options">{b.options.map((text,i)=><div key={i} className={`lh-review-option ${b.answer?.includes(i)?'is-correct':''}`}>
      {String.fromCharCode(65+i)}. {text} {b.answer?.includes(i)&&<strong>✓ 正確答案</strong>}
      {response&&['choice','multiselect','dropdown'].includes(b.type)&&<span>{selected.includes(i)?b.answer?.includes(i)?'學生已選・選對':'學生已選・誤選':b.answer?.includes(i)?'漏選':''}</span>}
    </div>)}</div>}
    <p className="lh-review-solution"><strong>正確答案：</strong>{correctText(b)}</p>
    {!referenceOnly&&<p><strong>學生答案：</strong>{answerText(b,a)}</p>}
    {b.type==='draw'&&Array.isArray(a)&&<Drawing block={b} value={a.map(l=>Array.isArray(l)?{points:l,color:'#8500e8',width:6}:l)} disabled/>}
    {!referenceOnly&&<p className={`lh-result-badge status-${status}`}>{reviewLabels[status]}{response?.grade?.status==='graded'&&` · 原始得分 ${response.grade.score} / ${response.grade.max}`}</p>}
    {response?.grade?.details?.length>0&&<details><summary>逐項作答與原始評分明細</summary><pre>{JSON.stringify(response.grade.details,null,2)}</pre></details>}
  </article>;
}
export function ReviewReport({rows,blocks=[],meta={}}){
  const [tab,setTab]=useState('student'),[sid,setSid]=useState(rows[0]?.studentId||''),[filter,setFilter]=useState('all'),[question,setQuestion]=useState(''),[project,setProject]=useState(false);
  const qs=blocks.filter(b=>b.type!=='slide'),ranked=rankClassQuestions(rows,blocks),rankById=new Map(ranked.map(item=>[item.block.id,item])),rankSizes=new Map();
  for(const item of ranked)if(item.rank)rankSizes.set(item.rank,(rankSizes.get(item.rank)||0)+1);
  const row=rows.find(r=>r.studentId===sid),isError=s=>['partial','wrong'].includes(s),classMode=tab==='class'||project;
  const missingOriginal=rows.some(r=>r.details?.some(d=>!blocks.some(b=>b.id===d.blockId)));
  const visible=(classMode?ranked.map(item=>item.block):qs).filter(b=>filter==='all'||(classMode?rankById.get(b.id)?.errorCount>0:isError(answerStatus(b,row?.details?.find(d=>d.blockId===b.id)))));
  const b=visible.find(q=>q.id===question)||visible[0];
  return <section className={`lh-report ${project?'is-projecting':''}`}>
    <h2>課後報告 · {meta.title||'本堂課'}</h2>
    <p>以當堂題目及最後一次提交為準；原始得分不重算。{meta.retentionAt&&`保存至 ${new Date(meta.retentionAt).toLocaleString('zh-TW')}`}。請在期限前下載。</p>
    <div className="lh-row lh-report-controls">
      <button aria-pressed={tab==='student'} onClick={()=>{setTab('student');setQuestion('');}}>學生作答</button><button aria-pressed={tab==='class'} onClick={()=>{setTab('class');setQuestion('');}}>全班錯題</button>
      <label>篩選 <select value={filter} onChange={e=>{setFilter(e.target.value);setQuestion('');}}><option value="all">全部題目</option><option value="errors">部分答對＋答錯</option></select></label>
      <button aria-pressed={project} onClick={()=>{setProject(!project);if(!project)setTab('class');setQuestion('');}}>投影檢討（隱藏學號）</button>
      <button onClick={()=>download(`lesson-${meta.code||'review'}-errors.csv`,reviewCsv(rows,blocks.map(b=>({...b,reviewSolution:correctText(b)}))),'text/csv;charset=utf-8')}>下載錯題 CSV（含學號）</button>
      <button onClick={()=>window.print()}>列印目前檢討</button>
    </div>
    {!project&&<table className="lh-report-students"><thead><tr><th>學號</th><th>交卷</th><th>待評</th><th>原始得分</th><th>遊戲分數（獨立）</th></tr></thead><tbody>{rows.map(r=><tr key={r.studentId}><td><button aria-pressed={r.studentId===sid} onClick={()=>{setSid(r.studentId);setTab('student');}}>{r.studentId}</button></td><td>{r.submitted}</td><td>{r.pending}</td><td>{r.score} / {r.max}</td><td>{r.gameScore||0}</td></tr>)}</tbody></table>}
    {!blocks.length&&<p role="alert">此報告缺少當堂原題快照；請使用保留的原始作答明細，無法可靠還原題目。</p>}
    {blocks.length>0&&missingOriginal&&<p role="alert">部分作答缺少當堂原題，未列入可對照題目；請展開原始逐題明細檢視，不以目前題庫補造。</p>}
    <div className="lh-report-grid"><nav aria-label="逐題結果">{visible.map(q=>{
      const d=row?.details?.find(d=>d.blockId===q.id),s=answerStatus(q,d),item=rankById.get(q.id),counts=item.counts;
      const rankName=item.rank<=3?['','錯最多','錯第二多','錯第三多'][item.rank]:`錯題第 ${item.rank} 多`;
      return <button key={q.id} className={classMode&&item.tier?`lh-error-rank-${item.tier}`:undefined} aria-pressed={b?.id===q.id} onClick={()=>setQuestion(q.id)}>
        <strong>第 {item.questionNumber} 題 · {q.title}</strong>
        {classMode&&item.errorCount>0&&<span className="lh-error-rank-label">{rankSizes.get(item.rank)>1?'並列':''}{rankName} · 需檢討 {item.errorCount} 人</span>}
        <span>{!classMode?reviewLabels[s]:`部分 ${counts.partial} · 答錯 ${counts.wrong} · 全對 ${counts.full} · 未交 ${counts.missing} · 待評 ${counts.pending}`}</span>
      </button>;
    })}{!visible.length&&<p>沒有符合篩選的題目。</p>}</nav>
    <div>{b&&(tab==='student'&&!project?<QuestionReview block={b} response={row?.details?.find(d=>d.blockId===b.id)}/>:<><QuestionReview block={b} referenceOnly/>{rows.filter(r=>isError(answerStatus(b,r.details?.find(d=>d.blockId===b.id)))).map((r,i)=><section key={r.studentId}><h3>{project?`作答 ${i+1}`:`學號 ${r.studentId}`}</h3><QuestionReview block={b} response={r.details.find(d=>d.blockId===b.id)}/></section>)}</>)}</div></div>
    <details className="lh-report-raw"><summary>保留原始逐題作答與評分版本</summary><button onClick={()=>download(`lesson-${meta.code||'review'}-details.json`,JSON.stringify({meta,blocks,rows},null,2),'application/json')}>下載完整 JSON（含學號）</button><pre>{JSON.stringify(rows,null,2)}</pre></details>
  </section>;
}
export function ReportHistory(){
  const [list,setList]=useState(null),[result,setResult]=useState(null),[error,setError]=useState('');
  return <section className="lh-report-history"><button onClick={async()=>{try{setList((await api('reports')).reports);setError('');}catch(e){setError(e.message);}}}>歷史課後報告</button>
    {error&&<p role="alert">{error}</p>}{list&&<><p>僅顯示目前教師工作階段擁有、仍在保存期限內的課堂；請及時匯出備份。</p>{list.map(r=><button key={r.code} onClick={async()=>{try{setResult(await api('report',r.code));setError('');}catch(e){setError(e.message);}}}>{r.title} · {new Date(r.createdAt).toLocaleString('zh-TW')} · {r.code}</button>)}{!list.length&&<p>沒有可讀取的歷史課堂。</p>}</>}
    {result&&<><button onClick={()=>setResult(null)}>關閉報告</button><ReviewReport key={result.meta.code} rows={result.report} blocks={result.reportBlocks} meta={result.meta}/></>}
  </section>;
}
