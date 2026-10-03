import React, {useRef} from 'react';
import {inlineTypes} from './parity.mjs';
import {useMediaResource} from './useMediaResource.jsx';
export function Picture({block,children,onPick}) {
  const {url,error}=useMediaResource(block.background?.assetId);
  return <div className="lh-picture" onClick={onPick ? e=>{const r=e.currentTarget.getBoundingClientRect();onPick({x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))});}:undefined}>
    {url?<img src={url} alt={block.background.alt}/>:<p>{error||'請選擇底圖'}</p>}{children}
  </div>;
}
export function Region({region:r,...props}) {
  return r.shape==='polygon' ? <polygon points={r.vertices.map(p=>`${p.x*1000},${p.y*1000}`).join(' ')} {...props}/> : r.shape==='rect' ? <rect x={r.x*1000} y={r.y*1000} width={r.w*1000} height={r.h*1000} {...props}/> : <ellipse cx={r.x*1000} cy={r.y*1000} rx={r.r*1000} ry={r.r*1000} {...props}/>;
}
export function ParityEditor({block:b,patch}) {
  const sentence=useRef();
  const change=(key,id,values)=>patch({[key]:b[key].map(x=>x.id===id?{...x,...values}:x)});
  const pointFields=(key,row)=>['x','y'].map(k=><label key={k}>{k==='x'?'水平':'垂直'}位置 (%)<input type="number" min="0" max="100" value={Math.round(row[k]*100)} onChange={e=>change(key,row.id,{[k]:Math.min(1,Math.max(0,Number(e.target.value)/100))})}/></label>);
  return <section className="lh-parity-editor">
    {b.migration&&<details open={!b.migration.reviewed}><summary>轉換報告與原題位置</summary><p>原題：{b.migration.sourceTitle||b.migration.sourceId}（原題保留於左側清單）</p>{b.migration.warnings.map(w=><p key={w}>{w}</p>)}<label><input type="checkbox" checked={b.migration.reviewed} onChange={e=>patch({migration:{...b.migration,reviewed:e.target.checked}})}/>已核對轉換內容</label></details>}
    {inlineTypes.includes(b.type)&&<>
      <label>句子（用下方按鈕在游標位置插入空格）<textarea ref={sentence} value={b.sentence} onChange={e=>patch({sentence:e.target.value})}/></label>
      <button type="button" disabled={b.blanks.length>=12} onClick={()=>{const id=crypto.randomUUID();const start=sentence.current?.selectionStart??b.sentence.length;const end=sentence.current?.selectionEnd??start;const selected=b.sentence.slice(start,end);patch({sentence:b.sentence.slice(0,start)+`{{${id}}}`+b.sentence.slice(end),blanks:[...b.blanks,{id,answers:[selected||''],distractors:[]}]});}}>＋ 插入空格</button>
      {b.blanks.map((x,i)=><fieldset key={x.id}><legend>空格 {i+1}</legend><label>正確／可接受的替代答案（每行一個）<textarea value={x.answers.join('\n')} onChange={e=>change('blanks',x.id,{answers:e.target.value.split('\n')})}/></label>{b.type!=='blank'&&<label>干擾答案（每行一個）<textarea value={x.distractors.join('\n')} onChange={e=>change('blanks',x.id,{distractors:e.target.value?e.target.value.split('\n'):[]})}/></label>}<button onClick={()=>patch({sentence:b.sentence.replaceAll(`{{${x.id}}}`,' '),blanks:b.blanks.filter(v=>v.id!==x.id)})}>移除空格 {i+1}</button></fieldset>)}
    </>}
    {b.type==='draw'&&<label>畫布<select value={b.canvasMode} onChange={e=>patch({canvasMode:e.target.value})}><option value="blank">空白的畫布</option><option value="image">圖片畫布</option></select></label>}
    {b.background&&<><label>底圖<select value={b.background.assetId} onChange={e=>patch({background:{...b.background,assetId:e.target.value}})}><option value="">選擇已加入的圖片</option>{b.media.filter(a=>a.kind==='image').map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>替代文字<input maxLength={500} value={b.background.alt} onChange={e=>patch({background:{...b.background,alt:e.target.value}})}/></label></>}
    {b.type==='label'&&<>
      <p>點擊底圖新增錨點；每個錨點配對一個標籤。也可按「新增標籤」再輸入座標。</p>
      <Picture block={b} onPick={p=>{if(b.anchors.length>=20)return;const id=crypto.randomUUID();patch({labels:[...b.labels,{id,text:''}],anchors:[...b.anchors,{id:crypto.randomUUID(),...p,labelId:id,direction:'down'}]});}}>{b.anchors.map((a,i)=><span key={a.id} className="lh-anchor" style={{left:`${a.x*100}%`,top:`${a.y*100}%`}}>{i+1}</span>)}</Picture>
      <button disabled={b.anchors.length>=20} onClick={()=>{const id=crypto.randomUUID();patch({labels:[...b.labels,{id,text:''}],anchors:[...b.anchors,{id:crypto.randomUUID(),x:.5,y:.5,labelId:id,direction:'down'}]});}}>＋ 新增標籤</button>
      {b.anchors.map((a,i)=><fieldset key={a.id}><legend>錨點 {i+1}</legend><label>正確標籤<input value={b.labels.find(l=>l.id===a.labelId)?.text||''} onChange={e=>change('labels',a.labelId,{text:e.target.value})}/></label><div className="lh-row">{pointFields('anchors',a)}<label>標籤方向<select value={a.direction} onChange={e=>change('anchors',a.id,{direction:e.target.value})}>{['up','down','left','right'].map((d,i)=><option key={d} value={d}>{['上','下','左','右'][i]}</option>)}</select></label></div><button disabled={b.anchors.length===1} onClick={()=>patch({anchors:b.anchors.filter(x=>x.id!==a.id),labels:b.labels.filter(l=>l.id!==a.labelId)})}>移除標籤 {i+1}</button></fieldset>)}
    </>}
    {b.type==='hotspot'&&<>
      <label>區域種類<select value={b.regions[0]?.shape||'point'} onChange={e=>{const shape=e.target.value;patch({regions:b.regions.map(r=>({id:r.id,shape,x:r.x??.4,y:r.y??.4,w:.15,h:.15,r:.05,vertices:[{x:.3,y:.3},{x:.5,y:.3},{x:.4,y:.5}],correct:r.correct}))});}}><option value="point">點</option><option value="rect">矩形</option><option value="polygon">多邊形</option></select></label>
      <p>切換種類會重建區域形狀，可用上方「復原」還原。</p>
      <Picture block={b}><svg className="lh-regions" viewBox="0 0 1000 1000" preserveAspectRatio="none">{b.regions.map(r=><Region key={r.id} region={r} className={r.correct?'correct':'distractor'}/>)}</svg></Picture>
      {b.regions.map((r,i)=><fieldset key={r.id}><legend>區域 {i+1}</legend><label><input type="checkbox" checked={r.correct} onChange={e=>change('regions',r.id,{correct:e.target.checked})}/>正確區域</label>{r.shape!=='polygon'?<div className="lh-row">{pointFields('regions',r)}{(r.shape==='point'?['r']:['w','h']).map(k=><label key={k}>{({r:'半徑',w:'寬度',h:'高度'})[k]} (%)<input type="number" min="1" max="100" value={Math.round(r[k]*100)} onChange={e=>change('regions',r.id,{[k]:Number(e.target.value)/100})}/></label>)}</div>:<>{r.vertices.map((p,j)=><div className="lh-row" key={j}>{['x','y'].map(k=><label key={k}>頂點 {j+1} {k} (%)<input type="number" min="0" max="100" value={p[k]*100} onChange={e=>change('regions',r.id,{vertices:r.vertices.map((v,n)=>n===j?{...v,[k]:Number(e.target.value)/100}:v)})}/></label>)}</div>)}<button disabled={r.vertices.length>=20} onClick={()=>change('regions',r.id,{vertices:[...r.vertices,{x:.5,y:.5}]})}>新增頂點</button></>}
      <button disabled={b.regions.length===1} onClick={()=>patch({regions:b.regions.filter(v=>v.id!==r.id)})}>移除區域 {i+1}</button></fieldset>)}
      <button disabled={b.regions.length>=10} onClick={()=>patch({regions:[...b.regions,{...structuredClone(b.regions[0]),id:crypto.randomUUID(),correct:false}]})}>＋ 新增干擾區域</button>
    </>}
    {b.type==='open'&&<><p>最多 200 字元（Unicode 字碼點）；由教師人工評分。</p><fieldset><legend>AI rubric（獨立設定）</legend><label><input type="checkbox" checked={false} disabled/>啟用 AI 評分（尚未啟用）</label><label>評分規準備註<textarea value={b.aiRubric.text} onChange={e=>patch({aiRubric:{enabled:false,text:e.target.value}})}/></label></fieldset></>}
    {b.type==='cloud'&&<p>文字雲：零分，不計入學習成績；有效提交的遊戲機會依原設定。</p>}
  </section>;
}
