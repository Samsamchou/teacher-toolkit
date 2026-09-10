import React,{useEffect,useState} from 'react';
import './beach-explore.css';
import {BeachCharacter,BeachItem} from './BeachArt';
import {ITEMS,itemPosition,visibleIndices} from './beach-model.mjs';
const sign=n=>`${n>0?'+':''}${n}`;
export function actionPhase(s){if(!s.action)return 'idle';if(s.action.kind==='advance')return 'walking';const p=s.action.elapsed/s.action.duration;return p<.44?'walking':p<.53?'looking':p<.7?'bending':p<.86?'lifting':'packing';}
export default function BeachExplore({state:s,drawing,reduced,onPick}){
 const visible=visibleIndices(s),zone=Math.floor((visible[0]||0)/3),zones=Math.ceil(s.route.events.length/3),motion=actionPhase(s),progress=s.action?s.action.elapsed/s.action.duration:0;
 const activeId=s.action!==null?s.route.events[s.action.index]:null,hazard=ITEMS.find(i=>i.id===activeId)?.points<0;
 const last=s.done.length?ITEMS.find(i=>i.id===s.route.events[s.done.at(-1)]):null;
 const follow=s.action?.kind==='advance'?s.position.x-45:s.action?Math.max(zone*100-6,Math.min(zone*100+12,s.position.x-45)):zone*100;
 const camera=reduced?zone*100:Math.max(0,Math.min((zones-1)*100,follow));
 const [cameraReady,setCameraReady]=useState(false);
 useEffect(()=>{setCameraReady(false);if(motion!=='idle')return;const timer=setTimeout(()=>setCameraReady(true),350);return()=>clearTimeout(timer);},[zone,motion]);
 const available=cameraReady&&!s.paused&&!drawing&&!s.action&&s.mode==='manual';
 return <div className={`beach-exploration ${s.paused||drawing?'exploration-paused':''}`} data-zone={zone} data-action={motion}>
  <div className="coast-distant" style={{backgroundPosition:`${50+camera*.035}% center`}}/>
  <div className="coast-water"><i/><i/><i/></div>
  <div className="coast-sand"/>
  <div className="coast-world" style={{transform:`translate3d(${-camera}%,0,0)`}}>
   {Array.from({length:zones},(_,z)=><div key={z} className="coast-section" style={{left:z*100+'%'}} aria-hidden="true"><div className="coast-drift-decoration"/><span className="coast-stone s1"/><span className="coast-stone s2"/><span className="coast-stone s3"/><span className="coast-grass g1"/><span className="coast-grass g2"/>{[0,1,2,3,4].map(i=><i className="coast-footprints" key={i} style={{left:(10+i*18)+'%',top:(82-i%2*7)+'%'}}/>)}</div>)}
   {s.route.events.map((id,i)=>{const p=itemPosition(i),item=ITEMS.find(x=>x.id===id),done=s.done.includes(i),inZone=visible.includes(i),picking=s.action?.index===i;return <button key={i} className={`coast-object ${done?'is-collected':''} ${picking?'is-target':''} ${item.points<0?'is-hazard':''}`} style={{left:p.x+'%',top:p.y+'%',zIndex:Math.round(p.y),visibility:Math.floor(i/3)>zone?'hidden':'visible',opacity:item.points<0?1:done||picking&&progress>.7?0:1}} aria-label={`Collect ${item.name} ${i+1}`} disabled={!available||!inZone||item.points<0} onClick={()=>onPick(i)}><BeachItem id={id}/><span className="coast-object-ring"/></button>;})}
   <div className={`coast-explorer toy-explorer ${motion} ${hazard?'ouch':''}`} data-testid="explorer" style={{left:s.position.x+'%',top:s.position.y+'%',zIndex:Math.round(s.position.y)+1}}><div className="coast-explorer-body"><BeachCharacter id={s.characters[s.plan[s.turn].team]} phase={hazard&&progress>.53?'hurt':motion} progress={progress} holding={s.action&&s.action.kind!=='advance'&&!hazard?activeId:null} reduced={reduced}/></div>{hazard&&progress>.5&&<span className="coast-ouch">Oops!</span>}</div>
  </div>
  <div className="coast-hud"><span>TRAIL {s.route.letter} · AREA {zone+1} / {zones}</span><strong>{s.paused?'Paused':drawing?'Drawing · select Play to continue':hazard?'Watch your step!':s.action?{walking:'On my way!',looking:'Found it!',bending:'Picking it up…',lifting:'Got it!',packing:'Into the bucket!'}[motion]:s.mode==='auto'?'Exploring the coast…':!cameraReady?'Looking around…':'Choose any litter on the sand'}</strong><span>{s.count} / {s.route.events.length} events</span></div>
  <div className="coast-progress" aria-label="Trail progress">{Array.from({length:zones},(_,i)=><span key={i} className={i<=zone?'reached':''}>{i<zone?'✓':i+1}</span>)}</div>
  {last&&<div key={s.count} className={`beach-find-feedback ${last.points<0?'negative':''}`} role="status">{last.name} {sign(last.points)}</div>}
 </div>;
}
