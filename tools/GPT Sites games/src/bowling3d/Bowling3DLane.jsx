// The 3D bowling lane as a React component: canvas, shot playback and the on-lane overlays.
// The game keeps its own rules; it hands each already-decided shot to shoot() and gets back the pins that fell.
import React,{useEffect,useImperativeHandle,useRef,useState} from 'react';
import * as THREE from 'three';
import {BowlingStage} from './stage.js';
import {ShotDirector} from './director.js';
import {createPlanner} from './plan-client.js';
import {laneX} from './physics.mjs';
import {CARD_SHOW} from './cards3d.js';
import {ShowOverlays} from '../game3d/ShowOverlays.jsx';
import './bowling3d.css';

const banners=streak=>streak===2?'DOUBLE! ON FIRE!':streak===3?'TURKEY! 3 IN A ROW!':`${streak} STRIKES IN A ROW!`;

/**
 * props: audio (a Bowling3DAudio owned and unlocked by the game), theme, reduced,
 *   counter ([x,y] in camera space: where Extra Shot's bonus balls fly), onLayout(), onError(error).
 * ref: {ready(), busy(), setup(), project(), shoot(), winner(), clear()}.
 */
export function Bowling3DLane({ref,audio,theme='Classic',reduced=false,counter,onLayout,onError,children}){
  const canvasRef=useRef(null),wrapRef=useRef(null),engine=useRef(null),busy=useRef(false),okayRef=useRef(null);
  const latest=useRef({});latest.current={reduced,counter,onLayout,onError};
  const [label,setLabel]=useState(null),[replay,setReplay]=useState(false),[banner,setBanner]=useState(null);
  const [flash,setFlash]=useState(0),[scoreFx,setScoreFx]=useState(null),[okay,setOkay]=useState(false);

  useEffect(()=>{
    let stage;
    try{stage=new BowlingStage(canvasRef.current,{theme});}catch(error){latest.current.onError?.(error);return;}
    const director=new ShotDirector(stage,audio),planner=createPlanner();
    engine.current={stage,director,planner};
    const resize=()=>{const r=wrapRef.current.getBoundingClientRect();stage.resize(Math.max(240,r.width),Math.max(180,r.height));director.applyCamera();latest.current.onLayout?.();};
    const observer=new ResizeObserver(resize);observer.observe(wrapRef.current);resize();
    let frame,last=performance.now(),slow=0,seen=0;
    // QA hook (same as the pilot page): set window.__bowling3dQA.manual=true, then engine().step(seconds).
    engine.current.step=seconds=>{for(let t=0;t<seconds-1e-6;t+=1/60){director.update(1/60);stage.update(1/60);}stage.render();};
    window.__bowling3dQA={manual:false,...window.__bowling3dQA,engine:()=>engine.current,okay:()=>okayRef.current?.()};
    const tick=now=>{
      const dt=Math.min(.05,(now-last)/1000);last=now;
      if(window.__bowling3dQA?.manual){stage.render();frame=requestAnimationFrame(tick);return;}
      director.update(dt);stage.update(dt);stage.render();
      // About a second of frames slower than 25 fps switches off glow and shadows.
      if(stage.quality==='high'&&++seen>40){slow=dt>.04?slow+1:Math.max(0,slow-1);if(slow>30)stage.degrade();}
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    document.fonts?.load('900 40px "Comic Relief"').catch(()=>{});
    return()=>{cancelAnimationFrame(frame);observer.disconnect();director.cancel();planner.dispose();stage.dispose();engine.current=null;okayRef.current?.();};
  },[theme,audio]);

  useImperativeHandle(ref,()=>({
    ready:()=>!!engine.current,
    busy:()=>busy.current,
    /** Puts the lane in its waiting state: standing pins, the team's ball on its lane. */
    setup({remaining,startFraction=.5,skin=0,zones}){
      const e=engine.current;if(!e||busy.current)return;
      e.director.resetCards();e.stage.setBall(skin);e.stage.resetRack(remaining,laneX(startFraction));e.director.idle(0);
      e.stage.setZones(zones?.count||0,zones?.selected,zones?.token);
    },
    /** Screen position (percent of the lane box) of a point on the lane, for DOM controls laid over the canvas. */
    project(x,y,z){
      const e=engine.current;if(!e)return null;
      const v=new THREE.Vector3(x,y,z).project(e.stage.camera);
      return {left:(v.x+1)*50,top:(1-v.y)*50};
    },
    /**
     * Plays one shot that the rules have already decided.
     * request: {plan, remaining, startFraction, skin, streak, amount, score:{from,to}, swap:{a,b}, onImpact(fallen), onScore(data)}
     * Resolves {fallen, seconds, cancelled}; fallen has exactly as many pins as plan.fallenPins.
     */
    async shoot(request){
      const e=engine.current;if(!e||busy.current)return {cancelled:true,fallen:[]};
      const {plan,remaining,startFraction=.5,skin=0,streak=0}=request,quiet=latest.current.reduced;
      const card=plan.kind==='card'?plan.cardId:null,isHit=card==='hit-or-miss',hit=isHit&&plan.fallenPins.length>0;
      busy.current=true;setLabel(null);setBanner(null);setScoreFx(null);setReplay(false);
      try{
        e.director.resetCards();e.stage.setBall(skin);e.stage.resetRack(remaining,laneX(startFraction));e.director.idle(0);e.stage.setZones(0);
        if(card){
          await e.director.revealCard(card,{reduced:quiet});
          setOkay(true);await new Promise(done=>{okayRef.current=done;});
          okayRef.current=null;setOkay(false);if(!engine.current)return {cancelled:true,fallen:[]};
          audio.fx('pop');
        }
        const recording=await e.planner.plan(card&&!isHit?{remaining,startFraction,cardRoll:{stopZ:CARD_SHOW[card].stopZ,speed:4.8}}
          :{remaining,count:plan.fallenPins.length,startFraction,gutterLate:isHit});
        const strike=plan.label==='STRIKE!',spare=plan.label==='SPARE!',special=!!card||strike||spare;
        let told=false;const tell=()=>{if(!told){told=true;request.onImpact?.(recording.fallen);}};
        const result=await e.director.play(recording,{tier:special?'special':'normal',label:isHit?(hit?'HIT!':'MISS!'):card?null:plan.label,reduced:quiet,skin,onFire:streak>=2,
          celebration:isHit?(hit?'strike':'miss'):strike?'strike':spare?'spare':undefined,
          announce:isHit&&!hit?false:strike&&streak===2?'Double':strike&&streak>=3?'Turkey':undefined,
          card:card?{id:card,hit,amount:request.amount??plan.amount,swap:request.swap,counter:latest.current.counter}:undefined,
          onCue:(name,data)=>{
            if(name==='label'){tell();setLabel({text:data.label,kind:data.kind,key:Date.now()});if(strike&&streak>=2)setBanner(banners(streak));}
            if(name==='impact'){tell();if(!quiet){setFlash(special?.55:.25);setTimeout(()=>setFlash(0),90);}}
            if(name==='cardScore'){
              const type=data.double?'double':data.swap?'swap':data.delta?'lose':null;
              if(type&&request.score)setScoreFx({type,...request.score,key:Date.now()});
              request.onScore?.(data);
            }
            if(name==='replayStart'){setReplay(true);setLabel(null);setBanner(null);}
            if(name==='replayEnd')setReplay(false);
          }});
        return {fallen:recording.fallen,seconds:result.seconds,cancelled:!!result.cancelled};
      }finally{busy.current=false;setReplay(false);setOkay(false);}
    },
    /** Crowd, fireworks and lights for the end-of-game winner. */
    winner(){
      const e=engine.current;if(!e)return;
      audio.cheer(1);e.stage.cheer(1);e.stage.lightShow(1);
      if(!latest.current.reduced)for(let i=0;i<4;i++)audio.firework(.3+i*.45);
    },
    clear(){setLabel(null);setBanner(null);setScoreFx(null);},
  }),[audio]);

  return <div className="b3-stage b3-lane" ref={wrapRef}>
    <canvas ref={canvasRef} aria-label="3D bowling lane"/>
    {children}
    <ShowOverlays label={label} replay={replay} banner={banner} scoreFx={scoreFx} flash={flash} onOkay={okay?()=>okayRef.current?.():null}/>
  </div>;
}
