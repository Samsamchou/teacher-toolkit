import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {validateAnnotations} from './annotations.mjs';

// Each stroke belongs to a content anchor, never to the whole responsive page.
export function AnnotationSurface({children,lines=[],enabled=false,readOnly=false,onSave,onDirty=()=>{}}) {
  const root=useRef(null),draft=useRef(lines),drawing=useRef(null),dirty=useRef(false);
  const [value,setValue]=useState(lines),[boxes,setBoxes]=useState([]),[mode,setMode]=useState('operate'),[color,setColor]=useState('#8500e8'),[status,setStatus]=useState(''),[saving,setSaving]=useState(false);
  const update=v=>{draft.current=v;setValue(v);};
  useEffect(()=>{if(!dirty.current&&!drawing.current)update(lines);},[lines]);
  useEffect(()=>{if(!enabled)setMode('operate');},[enabled]);
  useLayoutEffect(()=>{
    const el=root.current;let frame;
    const measure=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
      const r=el.getBoundingClientRect();
      const candidates=[...el.querySelectorAll('[data-annotation-anchor],.lh-picture,.lh-sentence,.lh-vowel-card')];
      setBoxes(candidates.map((a,i)=>{const b=a.getBoundingClientRect();return {id:a.dataset.annotationAnchor||(a.matches('.lh-picture')?'background':a.matches('.lh-sentence')?'sentence':`vowel-${[...el.querySelectorAll('.lh-vowel-card')].indexOf(a)}`),x:b.left-r.left+el.scrollLeft,y:b.top-r.top+el.scrollTop,w:b.width,h:b.height};}).filter(b=>b.w&&b.h));
    });};
    const resize=new ResizeObserver(measure);
    const observe=()=>{resize.disconnect();resize.observe(el);el.querySelectorAll('[data-annotation-anchor],.lh-picture,.lh-sentence,.lh-vowel-card').forEach(a=>resize.observe(a));measure();};
    const mutations=new MutationObserver(records=>{if(records.some(r=>!r.target.closest?.('.lh-annotation-layer')))observe();});
    mutations.observe(el,{childList:true,subtree:true,characterData:true});observe();window.addEventListener('resize',measure);el.addEventListener('load',measure,true);
    return()=>{cancelAnimationFrame(frame);resize.disconnect();mutations.disconnect();window.removeEventListener('resize',measure);el.removeEventListener('load',measure,true);};
  },[]);
  async function save(){
    dirty.current=true;onDirty(true);setSaving(true);setStatus('標註同步中…');
    try{validateAnnotations(draft.current);await onSave(draft.current);dirty.current=false;onDirty(false);setStatus('標註已同步');}
    catch(e){setStatus(`尚未同步：${e.message}`);}finally{setSaving(false);}
  }
  const point=e=>{const r=e.currentTarget.getBoundingClientRect();return [Math.round(Math.max(0,Math.min(1000,(e.clientX-r.left)/r.width*1000))),Math.round(Math.max(0,Math.min(1000,(e.clientY-r.top)/r.height*1000)))];};
  const erase=(id,p)=>update(draft.current.filter(l=>l.anchor!==id||!l.points.some(q=>Math.hypot(q[0]-p[0],q[1]-p[1])<45)));
  const editable=enabled&&!readOnly&&!saving&&mode!=='operate';
  return <>
    {enabled&&!readOnly&&<div className="lh-annotation-tools" role="toolbar" aria-label="題目畫筆工具列">
      {[['operate','操作'],['pen','畫筆'],['erase','橡皮擦']].map(([id,label])=><button key={id} disabled={saving} aria-pressed={mode===id} onClick={()=>setMode(id)}>{label}</button>)}
      <label>顏色 <input type="color" value={color} onChange={e=>setColor(e.target.value)}/></label>
      <button disabled={saving||!value.length} onClick={()=>{update(value.slice(0,-1));save();}}>復原一筆</button>
      <button disabled={saving||!value.length} onClick={()=>{update([]);save();}}>清除此題標註</button>
      {dirty.current&&!saving&&<><button onClick={save}>重試同步</button><button onClick={()=>{dirty.current=false;onDirty(false);update(lines);setStatus('已還原已同步標註');}}>還原已同步版本</button></>}
      <span role="status">{status||'選擇畫筆後，可直接在題目、圖片及選項上畫記。'}</span>
    </div>}
    <div ref={root} className={`lh-annotation-surface ${editable?'is-drawing':''}`}>
      {children}
      {boxes.map(b=><svg key={b.id} className="lh-annotation-layer" style={{left:b.x,top:b.y,width:b.w,height:b.h,pointerEvents:editable?'auto':'none',cursor:mode==='erase'?'cell':'crosshair'}} viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label={`${b.id} 教師標註`} onPointerDown={e=>{
        if(!editable)return;e.preventDefault();e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);drawing.current=b.id;
        if(mode==='erase')erase(b.id,point(e));else if(draft.current.length<150)update([...draft.current,{anchor:b.id,color,width:6,points:[point(e)]}]);else{drawing.current=null;setStatus('已達 150 筆上限，請清除部分筆畫。');}
      }} onPointerMove={e=>{
        if(drawing.current!==b.id)return;
        if(mode==='erase')return erase(b.id,point(e));
        if(draft.current.reduce((n,l)=>n+l.points.length,0)>=2500)return;
        const next=structuredClone(draft.current);next.at(-1).points.push(point(e));update(next);
      }} onPointerUp={()=>{if(drawing.current){drawing.current=null;save();}}} onPointerCancel={()=>{if(drawing.current){drawing.current=null;save();}}}>
        {value.filter(l=>l.anchor===b.id).map((l,i)=><polyline key={i} points={l.points.map(p=>p.join(',')).join(' ')} fill="none" stroke={l.color} strokeWidth={l.width} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/>)}
      </svg>)}
    </div>
  </>;
}
