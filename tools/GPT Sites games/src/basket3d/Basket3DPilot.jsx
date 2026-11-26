import React,{useEffect,useRef,useState} from 'react';
import {BasketStage} from './stage.js';
import {BasketDirector} from './director.js';
import {BasketAudio} from './audio.js';
import {planShot,planDunk,HIT_STYLES,MISS_STYLES} from './shots.mjs';
import {BASKET_CARDS,STEAL_POINTS} from './cards.js';
import {ANIMALS} from '../basketball-model.mjs';
import '../bowling3d/bowling3d.css';

const CARD_BUTTONS=[['hit-or-miss','HIT OR MISS → HIT',{hit:true}],['hit-or-miss','HIT OR MISS → MISS',{hit:false}],['slam-dunk','SLAM DUNK'],['extra-shot','EXTRA SHOT'],
  ['double-points','DOUBLE POINTS'],['swap-points','SWAP POINTS'],['steal','STEAL'],['steal','STEAL (NOTHING)',{empty:true}]];
const B=({en,zh})=><span className="b3-b"><b>{en}</b><small>{zh}</small></span>;

export default function Basket3DPilot(){
  const canvasRef=useRef(null),wrapRef=useRef(null),engine=useRef(null),busy=useRef(false),streak=useRef(0),okayRef=useRef(null);
  const [animal,setAnimal]=useState('cat'),[points,setPoints]=useState(2),[style,setStyle]=useState('auto');
  const [reduced,setReduced]=useState(false),[forceSpecial,setForceSpecial]=useState(false),[muted,setMuted]=useState(false),[music,setMusic]=useState(true);
  const [running,setRunning]=useState(false),[label,setLabel]=useState(null),[replay,setReplay]=useState(false),[banner,setBanner]=useState(null),[flash,setFlash]=useState(0);
  const [info,setInfo]=useState(null),[error,setError]=useState(''),[quality,setQuality]=useState('high'),[okay,setOkay]=useState(false),[scoreFx,setScoreFx]=useState(null);
  // Demo scoreboard so the card effects have numbers to change; the real game supplies its own teams.
  const [hud,setHud]=useState({a:5,b:9,shots:1}),hudRef=useRef(hud);hudRef.current=hud;

  useEffect(()=>{
    let stage;
    try{stage=new BasketStage(canvasRef.current);}catch(err){setError(`3D could not start: ${err.message}`);return;}
    const audio=new BasketAudio(),director=new BasketDirector(stage,audio);
    engine.current={stage,audio,director};
    const resize=()=>{const r=wrapRef.current.getBoundingClientRect();stage.resize(Math.max(320,r.width),Math.max(180,r.height));};
    const observer=new ResizeObserver(resize);observer.observe(wrapRef.current);resize();
    let frame,last=performance.now(),slow=0,seen=0;
    // QA hook: step(seconds) advances the show in fixed 1/60 s steps while `manual` pauses the real-time loop.
    engine.current.step=seconds=>{for(let t=0;t<seconds-1e-6;t+=1/60){director.update(1/60);stage.update(1/60);}stage.render();};
    const tick=now=>{
      const dt=Math.min(.05,(now-last)/1000);last=now;
      if(window.__basket3d?.manual){stage.render();frame=requestAnimationFrame(tick);return;}
      director.update(dt);stage.update(dt);stage.render();
      if(stage.quality==='high'&&++seen>40){slow=dt>.04?slow+1:Math.max(0,slow-1);if(slow>30){stage.degrade();setQuality('low');}}
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    document.fonts?.load('900 40px "Comic Relief"').catch(()=>{});
    return()=>{cancelAnimationFrame(frame);observer.disconnect();director.cancel();audio.dispose();stage.dispose();engine.current=null;okayRef.current?.();};
  },[]);
  useEffect(()=>{engine.current?.audio.configure({muted});},[muted]);
  useEffect(()=>{const audio=engine.current?.audio;if(!audio?.ready)return;if(music)audio.startMusic();else audio.stopMusic();},[music]);
  useEffect(()=>{const e=engine.current;if(!e||busy.current)return;e.stage.setPlayer(animal);e.director.reset(points);},[animal,points]);

  async function begin(){
    const e=engine.current;if(!e||busy.current)return null;
    busy.current=true;setRunning(true);setLabel(null);setBanner(null);setReplay(false);setError('');setScoreFx(null);
    await e.audio.unlock();e.audio.configure({muted});await e.audio.load();if(music)e.audio.startMusic();
    return e;
  }
  const cues=(extra={})=>(name,data)=>{
    if(name==='label')setLabel({text:data.label,kind:data.kind,key:Date.now()});
    if(name==='impact'&&!reduced){setFlash(.5);setTimeout(()=>setFlash(0),90);}
    if(name==='replayStart'){setReplay(true);setLabel(null);setBanner(null);}
    if(name==='replayEnd')setReplay(false);
    extra[name]?.(data);
  };
  async function finish(e,summary,spot){
    setInfo(summary);
    if(!window.__basket3d?.manual)await new Promise(done=>setTimeout(done,1300));
    if(engine.current===e){e.director.reset(spot);setLabel(null);setBanner(null);setScoreFx(null);}
    return summary;
  }
  async function shoot(request={}){
    const e=await begin();if(!e)return null;
    try{
      const value=request.points??points,hit=request.hit??true,chosen=request.style??style;
      e.stage.setPlayer(request.animal??animal);e.director.reset(value);
      const recording=planShot({points:value,hit,style:chosen==='auto'||!(hit?HIT_STYLES:MISS_STYLES).includes(chosen)?undefined:chosen});
      streak.current=hit?streak.current+1:0;
      const onFire=streak.current>=3,special=(hit&&value>=3)||forceSpecial||request.special;
      const result=await e.director.play(recording,{points:value,tier:special?'special':'normal',label:hit?`+${value}`:'MISS',reduced,onFire,
        onCue:cues({label:()=>{if(hit){setHud(h=>({...h,a:h.a+value}));if(onFire)setBanner(`ON FIRE! ${streak.current} IN A ROW!`);}}})});
      return await finish(e,{points:value,hit,style:recording.style,seconds:Number(result.seconds?.toFixed(2)),tier:special?'special':'normal',quality:e.stage.quality},value);
    }catch(err){setError(err.message||'The shot could not be played.');return null;}
    finally{busy.current=false;setRunning(false);setReplay(false);}
  }
  async function playCard(cardId,request={}){
    const e=await begin();if(!e)return null;
    try{
      const isHit=cardId==='hit-or-miss',dunk=cardId==='slam-dunk',spot=isHit?4:dunk?3:points,before={...hudRef.current};
      e.stage.setPlayer(request.animal??animal);e.director.reset(spot);
      await e.director.revealCard(cardId,{reduced});
      setOkay(true);await new Promise(done=>{okayRef.current=done;});
      okayRef.current=null;setOkay(false);e.audio.fx('pop');
      const hit=isHit?(request.hit??Math.random()<.5):dunk,stolen=request.empty?0:Math.min(STEAL_POINTS,before.b);
      const recording=isHit?planShot({points:4,hit,style:hit?'swish':'rim-out'}):dunk?planDunk():null;
      const result=await e.director.play(recording,{points:spot,tier:'special',label:isHit?(hit?'+4':'MISS!'):dunk?'SLAM DUNK! +3':null,reduced,
        card:{id:cardId,hit,swap:{a:{name:'Team 1',score:before.a},b:{name:'Team 2',score:before.b}},
          steal:{mine:{name:'Team 1',score:before.a},theirs:{name:'Team 2',score:request.empty?0:before.b},amount:stolen}},
        celebration:isHit&&!hit?'miss':recording?'big':undefined,announce:isHit&&!hit?false:undefined,
        onCue:cues({
          label:()=>{if(recording?.hit)setHud(h=>({...h,a:h.a+(dunk?3:4)}));},
          cardScore:data=>{
            if(data.shots)setHud(h=>({...h,shots:h.shots+data.shots}));
            if(data.double){setHud(h=>({...h,a:before.a*2}));setScoreFx({type:'double',from:before.a,to:before.a*2,key:Date.now()});}
            if(data.swap){setHud(h=>({...h,a:before.b,b:before.a}));setScoreFx({type:'swap',from:before.a,to:before.b,key:Date.now()});}
            if(data.steal){setHud(h=>({...h,a:before.a+data.steal,b:before.b-data.steal}));setScoreFx({type:'double',from:before.a,to:before.a+data.steal,key:Date.now()});}
          }})});
      return await finish(e,{card:cardId,hit,seconds:Number(result.seconds?.toFixed(2)),tier:'special',style:recording?.style||'effect',quality:e.stage.quality},points);
    }catch(err){setError(err.message||'The card could not be played.');return null;}
    finally{busy.current=false;setRunning(false);setReplay(false);setOkay(false);}
  }
  useEffect(()=>{window.__basket3d={manual:window.__basket3d?.manual||false,shoot,playCard,okay:()=>okayRef.current?.(),hud:()=>hudRef.current,engine:()=>engine.current,busy:()=>busy.current};});

  return <div className="b3-page">
    <aside className="b3-panel">
      <header><h1>BASKETBALL 3D <em>PILOT</em></h1><p>試片：3D 投籃、慢動作重播、六張功能卡</p></header>
      <label><B en="Animal" zh="動物"/><select value={animal} disabled={running} onChange={e=>setAnimal(e.target.value)}>{ANIMALS.map(a=><option key={a.id} value={a.id}>{a.name}／{a.zh}</option>)}</select></label>
      <div className="b3-field"><B en="Shot value" zh="這一球的分值"/><div className="b3-counts">{[1,2,3].map(n=><button key={n} type="button" disabled={running} aria-pressed={points===n} onClick={()=>setPoints(n)}>{n}</button>)}</div></div>
      <label><B en="How it goes in or out" zh="進球或不進的方式"/><select value={style} disabled={running} onChange={e=>setStyle(e.target.value)}>
        <option value="auto">Auto／隨機</option>{[...HIT_STYLES,...MISS_STYLES].map(name=><option key={name} value={name}>{name}</option>)}</select></label>
      <div className="b3-counts"><button type="button" className="b3-hit" disabled={running} onClick={()=>shoot({hit:true})}>SHOOT · HIT</button><button type="button" disabled={running} onClick={()=>shoot({hit:false})}>SHOOT · MISS</button></div>
      <p className="b3-note">遊戲規則先決定進或不進，3D 只照結果演出。<br/>The rules decide hit or miss first; 3D only shows it.</p>
      <div className="b3-field"><B en="Power-up cards" zh="功能卡：卡片揭曉後按畫面上的 OKAY"/>
        <div className="b3-cards">{CARD_BUTTONS.map(([id,text,request])=><button key={text} type="button" disabled={running} style={{'--card':BASKET_CARDS[id].color,'--card-dark':BASKET_CARDS[id].dark}} onClick={()=>playCard(id,request)}>{text}</button>)}</div></div>
      <label className="b3-check"><input type="checkbox" checked={forceSpecial} onChange={e=>setForceSpecial(e.target.checked)}/><B en="Play as special shot" zh="加長演出＋重播"/></label>
      <label className="b3-check"><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/><B en="Reduce motion" zh="減少動態（安靜版）"/></label>
      <label className="b3-check"><input type="checkbox" checked={music} onChange={e=>setMusic(e.target.checked)}/><B en="Music" zh="背景音樂"/></label>
      <label className="b3-check"><input type="checkbox" checked={muted} onChange={e=>setMuted(e.target.checked)}/><B en="Mute" zh="靜音"/></label>
      {info&&<output className="b3-info">{info.card?`${info.card} · `:''}{info.style} · {info.seconds}s · {info.tier} · {info.quality}</output>}
      {quality==='low'&&<p className="b3-note">This device is slow, so glow and shadows were switched off.<br/>此裝置較慢，已自動關閉光暈與陰影。</p>}
      {error&&<p className="b3-error" role="alert">{error}</p>}
    </aside>
    <main className="b3-stage" ref={wrapRef}>
      <canvas ref={canvasRef} aria-label="3D basketball court"/>
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
