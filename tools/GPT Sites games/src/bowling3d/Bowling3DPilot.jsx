import React,{useEffect,useRef,useState} from 'react';
import {BowlingStage} from './stage.js';
import {ShotDirector} from './director.js';
import {Bowling3DAudio} from './audio3d.js';
import {createPlanner} from './plan-client.js';
import {laneX} from './physics.mjs';
import {BALL_SKINS,BOWLING_THEMES,CARD_META} from '../bowling-model.mjs';
import {CARD_SHOW} from './cards3d.js';
import {zoneCenter} from '../bowling-motion.mjs';
import './bowling3d.css';

const RACKS={
  ten:{en:'First shot · 10 pins',zh:'第一球・十瓶',pins:[0,1,2,3,4,5,6,7,8,9],first:true},
  five:{en:'First shot · 5 pins',zh:'第一球・五瓶',pins:[0,1,2,3,4],first:true},
  three:{en:'Second shot · 3 left',zh:'第二球・剩三瓶',pins:[3,6,7],first:false},
  split:{en:'Second shot · 7–10 split',zh:'第二球・左右開花',pins:[6,9],first:false},
  two:{en:'Second shot · 2 left',zh:'第二球・剩兩瓶',pins:[2,5],first:false},
};
const DEMO=[{rack:'ten',count:7,zone:2},{rack:'three',count:3,zone:2},{rack:'ten',count:10,zone:3},{rack:'ten',count:10,zone:3},{rack:'ten',count:0,zone:5},{rack:'ten',count:10,zone:3}];
const CARD_BUTTONS=[['hit-or-miss','HIT OR MISS → HIT',{hit:true}],['hit-or-miss','HIT OR MISS → MISS',{hit:false}],['extra-shot','EXTRA SHOT'],['no-shot','NO SHOT'],
  ['lose-points','LOSE POINTS'],['double-points','DOUBLE POINTS'],['swap-points','SWAP POINTS']];
const B=({en,zh})=><span className="b3-b"><b>{en}</b><small>{zh}</small></span>;

export default function Bowling3DPilot(){
  const canvasRef=useRef(null),wrapRef=useRef(null),engine=useRef(null),busy=useRef(false),streak=useRef(0);
  const [rack,setRack]=useState('ten'),[count,setCount]=useState(10),[zone,setZone]=useState(3),[skin,setSkin]=useState(9);
  const [theme,setTheme]=useState('Classic'),[reduced,setReduced]=useState(false),[forceSpecial,setForceSpecial]=useState(false);
  const [muted,setMuted]=useState(false),[music,setMusic]=useState(true),[running,setRunning]=useState(false),[label,setLabel]=useState(null),[replay,setReplay]=useState(false);
  const [banner,setBanner]=useState(null),[flash,setFlash]=useState(0),[info,setInfo]=useState(null),[error,setError]=useState(''),[quality,setQuality]=useState('high');
  const pins=RACKS[rack].pins,actual=Math.min(count,pins.length);
  // Demo scoreboard so the card effects have numbers to change; the real game supplies its own teams.
  const [hud,setHud]=useState({a:12,b:7,shots:2}),[okay,setOkay]=useState(null),[scoreFx,setScoreFx]=useState(null);
  const hudRef=useRef(hud),okayRef=useRef(null);hudRef.current=hud;

  useEffect(()=>{
    let stage;
    try{stage=new BowlingStage(canvasRef.current,{theme});}catch(err){setError(`3D could not start: ${err.message}`);return;}
    const audio=new Bowling3DAudio(),director=new ShotDirector(stage,audio),planner=createPlanner();
    engine.current={stage,audio,director,planner};
    const resize=()=>{const r=wrapRef.current.getBoundingClientRect();stage.resize(Math.max(320,r.width),Math.max(180,r.height));};
    const observer=new ResizeObserver(resize);observer.observe(wrapRef.current);resize();
    let frame,last=performance.now(),slow=0,seen=0;
    // QA hook: step(seconds) advances the show in fixed 1/60 s steps while `manual` pauses the real-time loop.
    engine.current.step=seconds=>{for(let t=0;t<seconds-1e-6;t+=1/60){director.update(1/60);stage.update(1/60);}stage.render();};
    const tick=now=>{
      const dt=Math.min(.05,(now-last)/1000);last=now;
      if(window.__bowling3d?.manual){stage.render();frame=requestAnimationFrame(tick);return;}
      director.update(dt);stage.update(dt);stage.render();
      // Auto-degrade: about a second of frames slower than 25 fps switches off glow and shadows.
      if(stage.quality==='high'&&++seen>40){slow=dt>.04?slow+1:Math.max(0,slow-1);if(slow>30){stage.degrade();setQuality('low');}}
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    document.fonts?.load('900 40px "Comic Relief"').catch(()=>{});
    return()=>{cancelAnimationFrame(frame);observer.disconnect();director.cancel();planner.dispose();audio.dispose();stage.dispose();engine.current=null;};
  },[theme]);
  useEffect(()=>{engine.current?.audio.configure({muted});},[muted]);
  useEffect(()=>{const audio=engine.current?.audio;if(!audio?.ready)return;if(music)audio.startMusic();else audio.stopMusic();},[music]);
  useEffect(()=>{const e=engine.current;if(!e||busy.current)return;e.stage.setBall(skin);e.stage.resetRack(pins,laneX(zoneCenter(zone,5)));e.director.idle(laneX(zoneCenter(zone,5)));},[skin,rack,zone,theme]);

  async function roll(request={}){
    const e=engine.current;if(!e||busy.current)return null;
    const rackKey=request.rack??rack,set=RACKS[rackKey],knock=Math.min(request.count??actual,set.pins.length),lane=request.zone??zone;
    busy.current=true;setRunning(true);setLabel(null);setBanner(null);setReplay(false);setError('');
    try{
      await e.audio.unlock();e.audio.configure({muted});await e.audio.load();if(music)e.audio.startMusic();
      const startFraction=zoneCenter(lane,5),startX=laneX(startFraction);
      e.stage.setBall(request.skin??skin);e.stage.resetRack(set.pins,startX);e.director.idle(startX);
      const began=performance.now();
      const recording=await e.planner.plan({remaining:set.pins,count:knock,startFraction});
      const planMs=Math.round(performance.now()-began);
      const cleared=knock===set.pins.length&&knock>0,strike=cleared&&set.first,spare=cleared&&!set.first;
      streak.current=strike?streak.current+1:0;
      const onFire=streak.current>=2,special=strike||spare||forceSpecial||request.special;
      const text=knock===0?'MISS':strike?'STRIKE!':spare?'SPARE!':`+${knock}`;
      const result=await e.director.play(recording,{tier:special?'special':'normal',label:text,reduced,onFire,startX,
        celebration:strike?'strike':spare?'spare':undefined,announce:strike&&streak.current===2?'Double':strike&&streak.current>=3?'Turkey':undefined,
        onCue:(name,data)=>{
          if(name==='label'){setLabel({text,kind:data.kind,key:Date.now()});
            if(strike&&streak.current>=2)setBanner(streak.current===2?'DOUBLE! ON FIRE!':streak.current===3?'TURKEY! 3 IN A ROW!':`${streak.current} STRIKES IN A ROW!`);}
          if(name==='impact'&&!reduced){setFlash(special?.55:.25);setTimeout(()=>setFlash(0),90);}
          if(name==='replayStart'){setReplay(true);setLabel(null);setBanner(null);}
          if(name==='replayEnd')setReplay(false);
        }});
      const summary={count:knock,fallen:recording.fallen.map(id=>id+1),seconds:Number(result.seconds?.toFixed(2)),planMs,tier:special?'special':'normal',
        assisted:recording.assisted,kind:recording.kind,quality:e.stage.quality};
      setInfo(summary);
      // Hold the final picture briefly, then set the lane up for the next roll.
      if(!window.__bowling3d?.manual)await new Promise(done=>setTimeout(done,1100));
      if(engine.current===e){e.stage.resetRack(set.pins,startX);e.director.idle(startX);setLabel(null);setBanner(null);}
      return summary;
    }catch(err){setError(err.message||'The shot could not be played.');return null;}
    finally{busy.current=false;setRunning(false);setReplay(false);}
  }
  async function playCard(cardId,request={}){
    const e=engine.current;if(!e||busy.current)return null;
    busy.current=true;setRunning(true);setLabel(null);setBanner(null);setReplay(false);setError('');setScoreFx(null);
    try{
      await e.audio.unlock();e.audio.configure({muted});await e.audio.load();if(music)e.audio.startMusic();
      const set=RACKS.ten,startFraction=zoneCenter(request.zone??zone,5),startX=laneX(startFraction),before={...hudRef.current};
      e.director.resetCards();e.stage.setBall(skin);e.stage.resetRack(set.pins,startX);e.director.idle(startX);
      await e.director.revealCard(cardId,{reduced});
      setOkay(cardId);await new Promise(done=>{okayRef.current=done;});
      okayRef.current=null;setOkay(null);e.audio.fx('pop');
      const isHitCard=cardId==='hit-or-miss',hit=isHitCard&&(request.hit??Math.random()<.5),amount=Math.min(before.a,request.amount??(Math.random()<.5?3:5));
      const recording=await e.planner.plan(isHitCard?{remaining:set.pins,count:hit?set.pins.length:0,startFraction,gutterLate:true}
        :{remaining:set.pins,startFraction,cardRoll:{stopZ:CARD_SHOW[cardId].stopZ,speed:4.8}});
      const result=await e.director.play(recording,{tier:'special',label:isHitCard?(hit?'HIT!':'MISS!'):null,reduced,startX,skin,
        card:{id:cardId,hit,amount,swap:{a:{name:'Team 1',score:before.a},b:{name:'Team 2',score:before.b}}},
        celebration:isHitCard?(hit?'strike':'miss'):undefined,announce:isHitCard&&!hit?false:undefined,
        onCue:(name,data)=>{
          if(name==='label'){setLabel({text:data.label,kind:data.kind,key:Date.now()});if(isHitCard&&hit)setHud(h=>({...h,a:h.a+set.pins.length}));}
          if(name==='cardScore'){
            if(data.shots)setHud(h=>({...h,shots:h.shots+data.shots}));
            if(data.delta){setHud(h=>({...h,a:Math.max(0,h.a+data.delta)}));setScoreFx({type:'lose',from:before.a,to:Math.max(0,before.a+data.delta),key:Date.now()});}
            if(data.double){setHud(h=>({...h,a:before.a*2}));setScoreFx({type:'double',from:before.a,to:before.a*2,key:Date.now()});}
            if(data.swap){setHud(h=>({...h,a:before.b,b:before.a}));setScoreFx({type:'swap',from:before.a,to:before.b,key:Date.now()});}
          }
          if(name==='impact'&&!reduced){setFlash(.55);setTimeout(()=>setFlash(0),90);}
          if(name==='replayStart'){setReplay(true);setLabel(null);}
          if(name==='replayEnd')setReplay(false);
        }});
      const summary={card:cardId,hit,amount,count:recording.fallen.length,fallen:recording.fallen.map(id=>id+1),seconds:Number(result.seconds?.toFixed(2)),planMs:0,tier:'special',
        assisted:recording.assisted,kind:recording.kind,quality:e.stage.quality};
      setInfo(summary);
      if(!window.__bowling3d?.manual)await new Promise(done=>setTimeout(done,1300));
      if(engine.current===e){e.director.resetCards();e.stage.setBall(skin);e.stage.resetRack(set.pins,startX);e.director.idle(startX);setLabel(null);setScoreFx(null);}
      return summary;
    }catch(err){setError(err.message||'The card could not be played.');return null;}
    finally{busy.current=false;setRunning(false);setReplay(false);setOkay(null);}
  }
  async function demoReel(){for(const step of DEMO){setRack(step.rack);setCount(step.count);setZone(step.zone);const done=await roll(step);if(!done)break;await new Promise(r=>setTimeout(r,900));}}
  useEffect(()=>{window.__bowling3d={manual:window.__bowling3d?.manual||false,roll,playCard,okay:()=>okayRef.current?.(),hud:()=>hudRef.current,demoReel,engine:()=>engine.current,info:()=>info,busy:()=>busy.current};});

  return <div className="b3-page">
    <aside className="b3-panel">
      <header><h1>BOWLING 3D <em>PILOT</em></h1><p>試片：3D 滾球、撞瓶、慢動作重播</p></header>
      <label><B en="Rack" zh="球瓶配置"/><select value={rack} disabled={running} onChange={e=>setRack(e.target.value)}>{Object.entries(RACKS).map(([key,value])=><option key={key} value={key}>{value.en}／{value.zh}</option>)}</select></label>
      <div className="b3-field"><B en="Pins knocked down" zh="這一球要倒幾瓶（由遊戲規則決定）"/>
        <div className="b3-counts">{Array.from({length:pins.length+1},(_,i)=><button key={i} type="button" disabled={running} aria-pressed={actual===i} onClick={()=>setCount(i)}>{i===0?'MISS':i===pins.length?(RACKS[rack].first?'STRIKE':'SPARE'):i}</button>)}</div></div>
      <div className="b3-field"><B en="Aim lane" zh="瞄準區"/><div className="b3-counts">{[1,2,3,4,5].map(i=><button key={i} type="button" disabled={running} aria-pressed={zone===i} onClick={()=>setZone(i)}>{i}</button>)}</div></div>
      <label><B en="Ball" zh="球"/><select value={skin} disabled={running} onChange={e=>setSkin(+e.target.value)}>{BALL_SKINS.map((item,i)=><option key={i} value={i}>{item[0]}</option>)}</select></label>
      <label><B en="Theme" zh="主題"/><select value={theme} disabled={running} onChange={e=>setTheme(e.target.value)}>{BOWLING_THEMES.map(name=><option key={name}>{name}</option>)}</select></label>
      <label className="b3-check"><input type="checkbox" checked={forceSpecial} onChange={e=>setForceSpecial(e.target.checked)}/><B en="Play as special shot" zh="當成功能卡球：加長演出＋重播"/></label>
      <label className="b3-check"><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/><B en="Reduce motion" zh="減少動態（安靜版）"/></label>
      <label className="b3-check"><input type="checkbox" checked={music} onChange={e=>setMusic(e.target.checked)}/><B en="Music" zh="背景音樂"/></label>
      <label className="b3-check"><input type="checkbox" checked={muted} onChange={e=>setMuted(e.target.checked)}/><B en="Mute" zh="靜音"/></label>
      <button type="button" className="b3-roll" disabled={running} onClick={()=>roll()}>{running?'ROLLING…':'ROLL!'}</button>
      <div className="b3-field"><B en="Power-up cards" zh="功能卡：卡片揭曉後按畫面上的 OKAY"/>
        <div className="b3-cards">{CARD_BUTTONS.map(([id,text,request])=><button key={text} type="button" disabled={running} style={{'--card':CARD_META[id].color,'--card-dark':CARD_META[id].dark}} onClick={()=>playCard(id,request)}>{text}</button>)}</div></div>
      <button type="button" className="b3-demo" disabled={running} onClick={demoReel}><B en="Play demo reel" zh="連播六球示範"/></button>
      {info&&<output className="b3-info">{info.tier==='special'?'Special':'Normal'} · {info.seconds}s · pins {info.fallen.join(', ')||'none'} · plan {info.planMs} ms{info.assisted?' · assisted':''} · {info.quality}</output>}
      {quality==='low'&&<p className="b3-note">This device is slow, so glow and shadows were switched off.<br/>此裝置較慢，已自動關閉光暈與陰影。</p>}
      {error&&<p className="b3-error" role="alert">{error}</p>}
    </aside>
    <main className="b3-stage" ref={wrapRef}>
      <canvas ref={canvasRef} aria-label="3D bowling lane"/>
      <div className={`b3-bars ${replay?'on':''}`} aria-hidden="true"><i/><i/></div>
      {replay&&<div className="b3-replay">● REPLAY <small>SLOW MOTION</small></div>}
      {label&&<div className={`b3-label b3-${label.kind}`} key={`label-${label.key}`}><strong>{label.text}</strong></div>}
      {banner&&<div className="b3-banner" key={banner}>🔥 {banner}</div>}
      <div className="b3-hud" aria-label="Demo scoreboard"><span className="b3-hud-active" key={`a${hud.a}`}>TEAM 1 <b>{hud.a}</b></span><span key={`b${hud.b}`}>TEAM 2 <b>{hud.b}</b></span><span key={`s${hud.shots}`}>SHOTS <b>{hud.shots}</b></span></div>
      {scoreFx&&<div className={`b3-scorefx b3-fx-${scoreFx.type}`} key={`fx-${scoreFx.key}`}><b>{scoreFx.from}</b><i>{scoreFx.type==='swap'?'⇄':'→'}</i><b>{scoreFx.to}</b></div>}
      {okay&&<button type="button" className="b3-okay" onClick={()=>okayRef.current?.()}>OKAY</button>}
      <div className="b3-flash" style={{opacity:flash}} aria-hidden="true"/>
    </main>
  </div>;
}
