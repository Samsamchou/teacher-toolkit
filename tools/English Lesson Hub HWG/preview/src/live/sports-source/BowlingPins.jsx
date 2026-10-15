import {bowlingImage} from './bowling-media';
import React,{useEffect,useState} from 'react';
import {PIN_POSITIONS,pinFootY,samplePinMotion,PIN_MOTION_DURATION} from './bowling-motion.mjs';

export function BowlingPins({remaining,motion=null,reduced=false,elapsed:controlledTime,showIds=false}){
  const [time,setTime]=useState(0);
  useEffect(()=>{
    if(controlledTime!==undefined)return;
    setTime(0);
    if(!motion)return;
    if(reduced){setTime(PIN_MOTION_DURATION);return;}
    let frame;const start=performance.now();
    const tick=now=>{const value=Math.min(PIN_MOTION_DURATION,now-start);setTime(value);if(value<PIN_MOTION_DURATION)frame=requestAnimationFrame(tick);};
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[motion,reduced,controlledTime]);
  const elapsed=controlledTime??time;
  const fallenCount=motion?.pins.filter(p=>elapsed>=p.delay).length||0;
  return <div className="bw-pins bw-pins-v2" aria-label={`${remaining.length-fallenCount} standing pins, ${fallenCount} fallen pins`}>
    {remaining.map(id=>{
      const record=motion?.pins.find(p=>p.id===id);
      const state=samplePinMotion(record,elapsed);
      const spot=PIN_POSITIONS[id];
      const radians=state.angle*Math.PI/180;
      const side=Math.max(0,Math.min(1,(state.lean-.72)/.18));
      const tip=Math.max(0,Math.min(1,(state.lean-.3)/.16))*(1-side);
      const upright=1-Math.max(0,Math.min(1,(state.lean-.3)/.16));
      const size=76+spot.y*85;
      const centerX=Math.cos(radians)*size*.36*state.lean;
      const centerY=-size*.43*(1-state.lean)+Math.sin(radians)*size*.20*state.lean;
      return <div key={id} className={`bw-physical-pin ${state.fallen?'is-falling':''}`} data-pin={id+1}
        data-state={state.settled?'settled':state.fallen?'falling':'standing'}
        style={{left:`${(spot.x+state.x)*100}%`,top:`${(pinFootY(id)+state.y)*100}%`,
          zIndex:Math.round((spot.y+state.y)*1000), '--pin-size':`${size}px`}}>
        <span className="bw-pin-shadow" style={{transform:`translate(-50%,-50%) rotate(${state.angle}deg) scale(${.8+state.lean*.8},${1-state.lift*15})`,opacity:.30-state.lift*8}}/>
        <div className="bw-pin-body" style={{transform:`scale(var(--pin-scale)) translate(${centerX}px,${centerY-state.lift*900}px)`}}>
          <img src={bowlingImage("pin-upright")} alt="" draggable="false" style={{opacity:upright,transform:`translate(-50%,-50%) rotate(${(state.angle+90)*state.lean*.65}deg)`}}/>
          <img src={bowlingImage("pin-tipping")} alt="" draggable="false" style={{opacity:tip,transform:`translate(-50%,-50%) rotate(${state.angle+45+state.spin*.3}deg)`}}/>
          <img src={bowlingImage("pin-prone")} alt="" draggable="false" style={{opacity:side,transform:`translate(-50%,-50%) scale(1,.45) rotate(${state.angle+state.spin}deg)`}}/>
        </div>
        {showIds&&<b className="bw-pin-id">{id+1}</b>}
      </div>;
    })}
  </div>;
}
