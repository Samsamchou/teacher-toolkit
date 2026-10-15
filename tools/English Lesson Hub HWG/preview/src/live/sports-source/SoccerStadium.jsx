import React,{useRef,useState} from 'react';
import {Dog,Football,PowerCardArt} from './WorldPupArt';
import {StadiumCrowd} from './WorldPupCrowd';
import {goalLayout} from './worldpup-layouts.mjs';
export function Stadium({match, reduced, onKick, blocked}) {
  const team = match?.teams.find(item=>item.id===match.active?.teamId);
  const teamIndex = match?.teams.findIndex(item=>item.id===team?.id) ?? 0;
  const shot=match?.active?.shot, flying=match?.phase==='flying', result=match?.phase==='result';
  const goal=shot?.goal && (flying||result);
  const {index:layoutIndex,zones:ZONES}=goalLayout(match);
  const patrol=useRef(null);
  const [patrolOffset,setPatrolOffset]=useState(0);
  const kick=id=>{const matrix=getComputedStyle(patrol.current).transform;setPatrolOffset(matrix==='none'?0:new DOMMatrixReadOnly(matrix).m41);onKick(id);};
  const zone=ZONES.find(item=>item.id===shot?.zone) || ZONES[0];
  const keeperZone=ZONES.find(item=>item.id===shot?.keeperZone) || ZONES[1];
  const teammates=Array.from({length:5},(_,index)=>({countryCode:team?.countryCode||'TPE',variant:(teamIndex+index+1)%8}));
  return <div className={`wp-stadium ${flying?'wp-is-flying':''} ${result?'wp-shot-complete':''} ${goal?'wp-is-goal':''} ${reduced?'wp-stage-reduced':''}`} style={{'--zone-x':zone.cx,'--zone-y':zone.cy,'--save-x':keeperZone.cx,'--save-y':keeperZone.cy,'--patrol-freeze':`${patrolOffset}px`,'--dive-angle':shot?.keeperZone%2?'-36deg':'36deg'}}>
    <div className="wp-sky"/>
    <div className="wp-floodlight wp-floodlight-left" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div><div className="wp-floodlight wp-floodlight-right" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div>
    <StadiumCrowd/>
    <div className="wp-adboards" aria-hidden="true"><b>WORLD PUP</b><span>★</span><b>PLAY TOGETHER</b><span>★</span><b>SOCCER CLUB</b></div>
    <div className="wp-pitch" aria-hidden="true"><div className="wp-box-line"/><div className="wp-box-small"/><div className="wp-spot"/><div className="wp-arc"/></div>
    <div className="wp-goal-shadow"/>
    <div className="wp-goal-back"/>
    <div className="wp-goal-net"/>
    <div className="wp-goal-front"/>
    <div className={`wp-keeper ${flying||result&&shot?'wp-keeper-dive':''}`}><div ref={patrol} className={`wp-keeper-patrol ${match?.phase==='aim'?'is-patrolling':''}`}><Dog countryCode="GER" variant={7} pose={flying||result&&shot?'dive':'idle'}/></div></div>
    {match?.phase==='aim'&&!blocked&&<><div className="wp-goal-zones" data-layout={layoutIndex} aria-label="Choose a goal zone">{ZONES.map(item=><button key={item.id} style={{left:`${item.left*100}%`,top:`${item.top*100}%`,width:`${item.width*100}%`,height:`${item.height*100}%`}} className={`wp-zone wp-zone-${item.id}`} aria-label={`Shoot zone ${item.id}`} onClick={()=>kick(item.id)}><b>{item.id}</b></button>)}</div><div className="wp-zone-shortcuts" aria-label="Goal zone shortcuts">{ZONES.map(item=><button key={item.id} className={`wp-zone-${item.id}`} aria-label={`Use goal zone ${item.id}`} onClick={()=>kick(item.id)}>{item.id}</button>)}</div></>}

    <div className="wp-supporters" aria-hidden="true">{teammates.map((item,index)=><div key={index} className={`wp-supporter wp-supporter-${index}`}><Dog {...item} pose={goal&&result?'cheer':'idle'}/></div>)}</div>
    <div className={`wp-kicker ${flying?'wp-kicker-kicking':''}`}><Dog countryCode={team?.countryCode||'TPE'} variant={Math.max(0,teamIndex)} pose={flying?'kick':goal&&result?'cheer':'idle'}/></div>
    <div className={`wp-ball ${flying||result&&shot?'wp-ball-shot':''} ${shot&&!shot.goal?'wp-ball-saved':''}`}><Football gold={match?.active?.cardId==='win10'} silver={match?.active?.cardId==='win5'}/></div>
    {flying&&<div className="wp-shot-trail" aria-hidden="true"/>}
    {match?.active?.cardId==='miss'&&(flying||result)&&<div className="wp-cat-distraction" aria-label="A mischievous cat distracts the kicker"><PowerCardArt cardId="miss"/><span>MEOW!</span></div>}
  </div>;
}

