// The 3D basketball court as a React component: canvas, shot and card playback, and the on-court overlays.
// The game keeps its own rules; it hands each already-decided turn to shoot() and resolves it afterwards.
import React,{useEffect,useImperativeHandle,useRef,useState} from 'react';
import {BasketStage} from './stage.js';
import {BasketDirector} from './director.js';
import {planShot,planDunk} from './shots.mjs';
import {ShowOverlays} from '../game3d/ShowOverlays.jsx';
import '../bowling3d/bowling3d.css';

/**
 * props: audio (a BasketAudio owned and unlocked by the game), reduced,
 *   counter ([x,y] in camera space: where Extra Shot's bonus balls fly), onLayout(), onError(error).
 * ref: {ready(), busy(), setup({animal, points}), shoot(request), winner(), clear()}.
 */
export function Basket3DLane({ref,audio,reduced=false,counter,onLayout,onError,children}){
  const canvasRef=useRef(null),wrapRef=useRef(null),engine=useRef(null),busy=useRef(false),okayRef=useRef(null);
  const latest=useRef({});latest.current={reduced,counter,onLayout,onError};
  const [label,setLabel]=useState(null),[replay,setReplay]=useState(false),[banner,setBanner]=useState(null);
  const [flash,setFlash]=useState(0),[scoreFx,setScoreFx]=useState(null),[okay,setOkay]=useState(false);

  useEffect(()=>{
    let stage;
    try{stage=new BasketStage(canvasRef.current);}catch(error){latest.current.onError?.(error);return;}
    const director=new BasketDirector(stage,audio);
    engine.current={stage,director};
    const resize=()=>{const r=wrapRef.current.getBoundingClientRect();stage.resize(Math.max(240,r.width),Math.max(180,r.height));if(!director.active)director.idle(engine.current.spot||2);latest.current.onLayout?.();};
    const observer=new ResizeObserver(resize);observer.observe(wrapRef.current);resize();
    let frame,last=performance.now(),slow=0,seen=0;
    // QA hook (same as the pilot page): set window.__basket3dQA.manual=true, then engine().step(seconds).
    engine.current.step=seconds=>{for(let t=0;t<seconds-1e-6;t+=1/60){director.update(1/60);stage.update(1/60);}stage.render();};
    window.__basket3dQA={manual:false,...window.__basket3dQA,engine:()=>engine.current,okay:()=>okayRef.current?.()};
    const tick=now=>{
      const dt=Math.min(.05,(now-last)/1000);last=now;
      if(window.__basket3dQA?.manual){stage.render();frame=requestAnimationFrame(tick);return;}
      director.update(dt);stage.update(dt);stage.render();
      // About a second of frames slower than 25 fps switches off glow and shadows.
      if(stage.quality==='high'&&++seen>40){slow=dt>.04?slow+1:Math.max(0,slow-1);if(slow>30)stage.degrade();}
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    document.fonts?.load('900 40px "Comic Relief"').catch(()=>{});
    return()=>{cancelAnimationFrame(frame);observer.disconnect();director.cancel();stage.dispose();engine.current=null;okayRef.current?.();};
  },[audio]);

  useImperativeHandle(ref,()=>({
    ready:()=>!!engine.current,
    busy:()=>busy.current,
    /** Waiting state: the team's animal on a shooting spot with the ball, overlays cleared. */
    setup({animal,points=2}={}){
      const e=engine.current;if(!e||busy.current)return;
      e.spot=points;if(animal)e.stage.setPlayer(animal);e.director.reset(points);
      setLabel(null);setBanner(null);setScoreFx(null);
    },
    /**
     * Plays one turn that the rules have already decided.
     * request: {entry (the pending history entry), animal, streak, score:{from,to}, swap:{a,b}, steal:{mine,theirs,amount},
     *   onImpact(), onScore(data)}. Resolves {seconds, cancelled}.
     */
    async shoot(request){
      const e=engine.current;if(!e||busy.current)return {cancelled:true};
      const {entry,animal,streak=0}=request,quiet=latest.current.reduced,card=entry.card||null;
      const isHit=card==='hit-or-miss',dunk=card==='slam-dunk',spot=isHit?4:dunk?3:card?(e.spot||2):entry.shot;
      busy.current=true;setLabel(null);setBanner(null);setScoreFx(null);setReplay(false);
      try{
        e.spot=spot>3?2:spot;if(animal)e.stage.setPlayer(animal);e.director.reset(spot);
        if(card){
          await e.director.revealCard(card,{reduced:quiet});
          setOkay(true);await new Promise(done=>{okayRef.current=done;});
          okayRef.current=null;setOkay(false);if(!engine.current)return {cancelled:true};
          audio.fx('pop');
        }
        const recording=isHit?planShot({points:4,hit:entry.hit,style:entry.hit?'swish':'rim-out'}):dunk?planDunk():card?null:planShot({points:entry.shot,hit:entry.hit});
        const special=!!card||(entry.hit&&entry.shot>=3),onFire=!card&&entry.hit&&streak>=3;
        let told=false;const tell=()=>{if(!told){told=true;request.onImpact?.();}};
        const result=await e.director.play(recording,{points:spot,tier:special?'special':'normal',reduced:quiet,onFire,
          label:isHit?(entry.hit?`+${entry.points}`:'MISS!'):dunk?`SLAM DUNK! +${entry.points}`:card?null:entry.hit?`+${entry.points}`:'MISS',
          celebration:isHit&&!entry.hit?'miss':card&&recording?'big':undefined,announce:isHit&&!entry.hit?false:undefined,
          card:card?{id:card,hit:entry.hit,swap:request.swap,steal:request.steal,counter:latest.current.counter}:undefined,
          onCue:(name,data)=>{
            if(name==='label'){tell();setLabel({text:data.label,kind:data.kind,key:Date.now()});if(onFire)setBanner(`ON FIRE! ${streak} IN A ROW!`);}
            if(name==='impact'){tell();if(!quiet){setFlash(special?.5:.25);setTimeout(()=>setFlash(0),90);}}
            if(name==='cardScore'){
              const type=data.swap?'swap':data.double||data.steal?'double':null;
              if(type&&request.score)setScoreFx({type,...request.score,key:Date.now()});
              request.onScore?.(data);
            }
            if(name==='replayStart'){setReplay(true);setLabel(null);setBanner(null);}
            if(name==='replayEnd')setReplay(false);
          }});
        tell();
        return {seconds:result.seconds,cancelled:!!result.cancelled};
      }finally{busy.current=false;setReplay(false);setOkay(false);}
    },
    /** Buzzer, crowd, fireworks and lights for the end of the game. */
    winner(){
      const e=engine.current;if(!e)return;
      audio.buzzer();audio.cheer(1);e.stage.cheer(1);e.stage.lightShow(1);e.stage.setPose(2);
      if(!latest.current.reduced)for(let i=0;i<4;i++)audio.firework(.5+i*.45);
    },
    clear(){setLabel(null);setBanner(null);setScoreFx(null);},
  }),[audio]);

  return <div className="b3-stage b3-lane" ref={wrapRef}>
    <canvas ref={canvasRef} aria-label="3D basketball court"/>
    {children}
    <ShowOverlays label={label} replay={replay} banner={banner} scoreFx={scoreFx} flash={flash} onOkay={okay?()=>okayRef.current?.():null}/>
  </div>;
}
