import React,{useEffect,useRef,useState} from 'react';
import {PenLine,Hand,Minus,Square,RectangleHorizontal,Circle,Eraser,Undo2,Trash2} from 'lucide-react';
const TOOLS=[['hand',Hand,'Play'],['pen',PenLine,'Write'],['line',Minus,'Line'],['square',Square,'Square'],['rect',RectangleHorizontal,'Rectangle'],['circle',Circle,'Circle'],['eraser',Eraser,'Eraser']];
export default function BeachDrawing({onDrawing,resetKey}){
 const [open,setOpen]=useState(false),[tool,setTool]=useState('hand'),[color,setColor]=useState('#352653'),[size,setSize]=useState(5);
 const canvas=useRef(),strokes=useRef([]),active=useRef(null);
 function draw(){const c=canvas.current;if(!c)return;const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);
  for(const st of [...strokes.current,...(active.current?[active.current]:[])]){const p=st.points.map(q=>({x:q.x*c.width,y:q.y*c.height})),a=p[0],b=p.at(-1);ctx.save();ctx.strokeStyle=ctx.fillStyle=st.color;ctx.lineWidth=st.size*c.width/1200;ctx.lineCap='round';ctx.lineJoin='round';ctx.globalCompositeOperation=st.tool==='eraser'?'destination-out':'source-over';ctx.beginPath();
   if(st.tool==='pen'||st.tool==='eraser'){ctx.moveTo(a.x,a.y);p.slice(1).forEach(q=>ctx.lineTo(q.x,q.y));if(p.length===1){ctx.arc(a.x,a.y,ctx.lineWidth/2,0,Math.PI*2);ctx.fill();}else ctx.stroke();}
   if(st.tool==='line'){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
   if(st.tool==='rect')ctx.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y);
   if(st.tool==='square'){const z=Math.min(Math.abs(b.x-a.x),Math.abs(b.y-a.y));ctx.strokeRect(a.x,a.y,Math.sign(b.x-a.x)*z,Math.sign(b.y-a.y)*z);}
   if(st.tool==='circle'){ctx.arc((a.x+b.x)/2,(a.y+b.y)/2,Math.hypot(b.x-a.x,b.y-a.y)/2,0,Math.PI*2);ctx.stroke();}ctx.restore();
  }
 }
 useEffect(()=>{const ob=new ResizeObserver(()=>{const c=canvas.current,r=c.getBoundingClientRect();c.width=Math.round(r.width*devicePixelRatio);c.height=Math.round(r.height*devicePixelRatio);draw();});ob.observe(canvas.current);return()=>ob.disconnect();},[]);
 useEffect(()=>{strokes.current=[];active.current=null;draw();},[resetKey]);
 const point=e=>{const r=canvas.current.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};};
 return <><canvas className="beach-ink" ref={canvas} aria-label="Drawing canvas" style={{pointerEvents:tool==='hand'?'none':'auto'}} onPointerDown={e=>{if(e.button!==0||active.current)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);active.current={tool,color,size:tool==='eraser'?size*5:size,pointer:e.pointerId,points:[point(e)]};draw();}} onPointerMove={e=>{if(active.current?.pointer!==e.pointerId)return;active.current.points.push(point(e));draw();}} onPointerUp={e=>{if(active.current?.pointer!==e.pointerId)return;strokes.current.push(active.current);active.current=null;draw();}} onPointerCancel={()=>{active.current=null;draw();}}/>
 <div className="beach-drawing"><button className="beach-icon" aria-label="Drawing tools" aria-expanded={open} onClick={()=>setOpen(!open)}><PenLine size={22}/></button>{open&&<div className="beach-tools"><div>{TOOLS.map(([id,Icon,label])=><button key={id} aria-label={label} title={label} aria-pressed={tool===id} onClick={()=>{setTool(id);onDrawing(id!=='hand');}}><Icon size={20}/></button>)}</div><div>{['#352653','#fff','#fa4b84','#ffd738','#168c77','#3374de'].map(c=><button key={c} aria-label={`Ink ${c}`} style={{background:c}} onClick={()=>setColor(c)}/>)}</div><label>Size<input type="range" aria-label="Ink size" min="3" max="16" value={size} onChange={e=>setSize(+e.target.value)}/></label><div><button aria-label="Undo drawing" onClick={()=>{strokes.current.pop();draw();}}><Undo2 size={20}/></button><button aria-label="Clear drawings" onClick={()=>{strokes.current=[];draw();}}><Trash2 size={20}/></button></div></div>}</div></>;
}
