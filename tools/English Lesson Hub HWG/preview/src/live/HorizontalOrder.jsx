import React,{useRef} from 'react';
export function HorizontalOrder({items,answer,setAnswer,disabled}) {
  const dragging=useRef(null);
  const move=(from,to)=>{if(disabled||from===to||to<0||to>=answer.length)return;setAnswer(a=>{const next=[...a];next.splice(to,0,next.splice(from,1)[0]);return next;});};
  return <><p>由左至右排出正確順序。可拖曳字卡，或使用左右按鈕。</p><ol className="lh-order lh-order-horizontal" aria-label="由左至右排序">
    {answer.map((id,i)=><li key={id} data-order-index={i} data-annotation-anchor={`order-${id}`}>
      <button className="lh-order-handle" disabled={disabled} aria-label={`拖曳 ${items[id]}`} onPointerDown={e=>{if(disabled)return;dragging.current=i;e.currentTarget.setPointerCapture(e.pointerId);}} onPointerUp={e=>{
        if(dragging.current===null)return;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-order-index]');if(target&&e.currentTarget.closest('ol').contains(target))move(dragging.current,Number(target.dataset.orderIndex));dragging.current=null;
      }} onPointerCancel={()=>dragging.current=null} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(i,i+(e.key==='ArrowLeft'?-1:1));}}}>{items[id]}</button>
      <div><button disabled={disabled||i===0} onClick={()=>move(i,i-1)} aria-label={`${items[id]} 向左`}>←</button><button disabled={disabled||i===answer.length-1} onClick={()=>move(i,i+1)} aria-label={`${items[id]} 向右`}>→</button></div>
    </li>)}
  </ol></>;
}
