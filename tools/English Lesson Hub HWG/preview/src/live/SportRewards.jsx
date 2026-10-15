import React,{useEffect,useMemo,useRef,useState} from 'react';
import {api} from './transport.mjs';
import {BowlingBall,PowerCardArt as BowlingCard} from './sports-source/BowlingArt';
import {BowlingPins} from './sports-source/BowlingPins';
import {BALL_SKINS} from './sports-source/bowling-model.mjs';
import {ballFrame,createPinMotion,zoneCenter} from './sports-source/bowling-motion.mjs';
import {BowlingAudio} from './sports-source/BowlingAudio';
import {WorldPupAudio} from './sports-source/WorldPupAudio';
import {COUNTRIES} from './sports-source/worldpup-countries.mjs';
import {CARDS} from './sports-source/worldpup-model.mjs';
import {PowerCardArt} from './sports-source/WorldPupArt';
import {Stadium} from './sports-source/SoccerStadium';
import {Dice} from './sports-source/SoccerDice';
import './sports-source/bowling.css';
import './sports-source/worldpup.css';
import './reward-sports.css';

function readPreferences(){try{return JSON.parse(localStorage.getItem('lh-sports-preferences'))||{};}catch{return {};}}

function BowlingStage({result,progress,zone,setZone,blocked}){
  const active=result?.session.active,plan=result?.plan;
  const motion=useMemo(()=>plan?createPinMotion(plan.fallenPins,plan.trajectory,result.beforePins):null,[plan]);
  const flight=plan&&progress<1;
  const ball=plan?ballFrame(plan.trajectory,Math.min(1,progress/0.64),motion?.impactPoint):null;
  const pins=plan&&progress<1?result.beforePins:active?.remainingPins||result?.beforePins?.filter(id=>!plan?.fallenPins.includes(id))||Array.from({length:10},(_,i)=>i);
  return <div className="bw-game lh-bowling-stage"><div className="bw-lane-stage">
    <div className="bw-portal"/><div className="bw-pin-deck"/><div className="bw-lane-face"><div className="bw-lane-planks"/><div className="bw-lane-glow"/></div>
    <BowlingPins remaining={pins} motion={flight?motion:null} elapsed={flight?Math.max(0,(progress-.5)*4000):0}/>
    {active?.tokenZone&&!flight&&<div className="bw-power-target" style={{left:`${zoneCenter(active.tokenZone,active.zoneCount)*100}%`}}>+1 ★</div>}
    {active&&!flight&&<div className="bw-aim-zones" aria-label="Choose a bowling lane">{Array.from({length:active.zoneCount},(_,i)=><button key={i} disabled={blocked} className={`bw-aim-zone bw-zone-${i%5} ${zone===i+1?'selected':''}`} aria-label={`Aim zone ${i+1}`} aria-pressed={zone===i+1} onClick={()=>setZone(i+1)}>{i+1}</button>)}</div>}
    {flight&&<BowlingBall skin={result.skin} cardId={plan.cardId} className="bw-flying-ball" size={128} style={{left:`${ball.x*100}%`,top:`${ball.y*100}%`,transform:`translate(-50%,-50%) scale(${ball.scale}) rotate(${ball.spin}deg)`}}/>}
    {!flight&&<BowlingBall skin={result?.skin||0} className="bw-ready-ball" size={100} style={{left:`${zoneCenter(zone,active?.zoneCount||5)*100}%`}}/>}
    {plan&&progress===1&&<div className="bw-impact-text"><strong>{plan.label}</strong></div>}
  </div></div>;
}

export default function SportRewards({room,onRoom}){
  const reward=room.reward,game=reward.game,pending=reward.pending,turn=pending||reward.last,r=turn?.result;
  const saved=useRef(readPreferences());
  const [skin,setSkin]=useState(saved.current.skin??0),[country,setCountry]=useState(saved.current.country||'TPE'),[zone,setZone]=useState(1);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [muted,setMuted]=useState(saved.current.muted??true),[music,setMusic]=useState(saved.current.music??.25),[sounds,setSounds]=useState(saved.current.sounds??.65);
  const [reduced,setReduced]=useState(()=>saved.current.reduced??matchMedia('(prefers-reduced-motion: reduce)').matches),[progress,setProgress]=useState(1);
  const lock=useRef(false),request=useRef(null),audio=useRef(null),mounted=useRef(false),latest=useRef({room,onRoom});
  latest.current={room,onRoom};
  useEffect(()=>{try{localStorage.setItem('lh-sports-preferences',JSON.stringify({skin,country,muted,music,sounds,reduced}));}catch{}},[skin,country,muted,music,sounds,reduced]);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;audio.current?.dispose();audio.current=null;};},[]);
  useEffect(()=>{
    const stop=()=>{if(document.hidden)audio.current?.pause();};document.addEventListener('visibilitychange',stop);
    return()=>document.removeEventListener('visibilitychange',stop);
  },[]);
  useEffect(()=>{audio.current?.configure(game==='bowling'?{muted,musicVolume:music*100,soundsVolume:sounds*100}:{muted,music,sounds});},[muted,music,sounds,game]);
  async function enableSound(){
    if(muted)return;
    audio.current??=game==='bowling'?new BowlingAudio():new WorldPupAudio();
    audio.current.configure(game==='bowling'?{muted,musicVolume:music*100,soundsVolume:sounds*100}:{muted,music,sounds});
    try{const ready=await audio.current.unlock();if(ready===false)throw Error();if(!mounted.current)return;
      if(game==='bowling')audio.current.startMusic();else {audio.current.start();if(audio.current.samplesStatus==='failed')setNotice('球場錄音未載入，可重試音效。');}
    }catch{if(mounted.current)setNotice('音效未載入，請檢查連線並按「啟用／重試音效」。');}
  }
  // Every response carries a saved step. Replaying its animation never resubmits the move.
  useEffect(()=>{
    if(!pending){setProgress(1);return;}
    const result=pending.result;
    if(game==='bowling'&&!result.plan){setProgress(1);return;}
    let id,start,hit=false;setProgress(reduced?1:0);
    if(game==='bowling')audio.current?.play(result.plan?.cardId?'power_reveal':'roll_b',`${pending.id}-${result.step}-roll`);
    else if(result.shot)audio.current?.kick();else {audio.current?.dice();audio.current?.card(result.cardId);}
    const loop=t=>{start??=t;const p=reduced?1:Math.min(1,(t-start)/(game==='bowling'?4000:1800));setProgress(p);
      if(p>=.5&&!hit){hit=true;if(game==='bowling'){
        const plan=result.plan,cue=plan.label==='STRIKE!'?'strike':plan.label==='SPARE!'?'spare_b':plan.fallenPins.length?`pins_${plan.fallenPins.length}`:'miss_b';
        audio.current?.play(plan.cardId?`card_${plan.cardId.replaceAll('-','_')}`:cue,`${pending.id}-${result.step}-hit`);
        if(plan.collectedToken)audio.current?.play('power_collect',`${pending.id}-${result.step}-token`);
      }else if(result.shot)audio.current?.[result.shot.goal?'goal':'miss']();}
      if(p<1)id=requestAnimationFrame(loop);
    };id=requestAnimationFrame(loop);return()=>cancelAnimationFrame(id);
  },[pending?.id,pending?.result.step,reduced,game]);
  async function send(move,extra={}){
    if(lock.current)return;lock.current=true;setBusy(true);setError('');void enableSound();
    const current=latest.current.room,v=current.reward,p=v.pending;
    if(!request.current){
      if(move==='finish')request.current={action:'rewardFinish',payload:{turnId:p.id,revision:current.revision}};
      else request.current={action:'rewardPlay',payload:{turnId:p?.id||crypto.randomUUID(),revision:current.revision,blockId:current.block.id,walletVersion:v.version,...(p?{actionId:crypto.randomUUID(),step:p.result.step,move}: {skin,countryCode:country}),...extra}};
    }
    try{const req=request.current;
      if(p?.id===req.payload.turnId&&(req.action==='rewardFinish'||req.payload.step===p.result.step)){
        req.payload.revision=current.revision;req.payload.blockId=current.block.id;req.payload.walletVersion=v.version;
      }
      if(!p&&req.action==='rewardPlay'&&!req.payload.actionId&&req.payload.walletVersion===v.version&&v.eligible){req.payload.revision=current.revision;req.payload.blockId=current.block.id;}
      const next=await api(req.action,current.code,req.payload);request.current=null;if(mounted.current)latest.current.onRoom(next);}
    catch(e){if(mounted.current)setError(e.message);}
    finally{lock.current=false;if(mounted.current)setBusy(false);}
  }
  // After a teacher change, keep an uncertain request available for idempotent retry.
  const blocked=busy||progress<1||!reward.eligible||!!error;
  const session=r?.session,active=session?.active;
  const soccerMatch={config:{seed:r?.layout||0},teams:[{id:'you',countryCode:r?.countryCode||country}],history:[],active:{id:turn?.id,teamId:'you',cardId:r?.cardId||'normal',shot:r?.shot},phase:r?.resolved?(progress<1?'flying':'result'):pending?'aim':'ready'};
  return <section className="lh-reward lh-sports" data-game={game} aria-label="單人課間遊戲">
    <div className="lh-reward-heading"><h2>{game==='bowling'?'Bowling Game':'World Pup Soccer'}</h2><strong>回合總分 {reward.score}</strong></div>
    <p role="status">剩餘機會：{reward.remaining} 次{pending?' · 正在完成已扣除的這一次':''}</p>
    <div className="lh-sports-options"><label><input type="checkbox" checked={muted} onChange={e=>setMuted(e.target.checked)}/>靜音</label><label><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/>減少動畫</label>
      <label>音樂<input aria-label="音樂音量" type="range" min="0" max="1" step=".05" value={music} onChange={e=>setMusic(+e.target.value)}/></label><label>音效<input aria-label="音效音量" type="range" min="0" max="1" step=".05" value={sounds} onChange={e=>setSounds(+e.target.value)}/></label><button disabled={muted} onClick={()=>{setNotice('');void enableSound();}}>啟用／重試音效</button>
    </div>
    {notice&&<p role="status">{notice}</p>}
    {game==='bowling'?<>
      <label>選擇球皮 <select value={skin} disabled={!!pending||busy} onChange={e=>setSkin(+e.target.value)}>{BALL_SKINS.map((s,i)=><option value={i} key={s[3]}>{s[0]}</option>)}</select></label>
      <BowlingStage result={r} progress={progress} zone={zone} setZone={setZone} blocked={blocked}/>
      {pending&&active&&<><p>第 {active.shotsUsed+1} 球／{2+active.bonusShots} 球 · Power-up：{session.teams[0].powerups} · 剩餘球瓶 {active.remainingPins.length}</p><div className="lh-reward-actions"><button disabled={blocked} onClick={()=>send('roll',{zone})}>ROLL! 投球</button><button disabled={blocked||!session.teams[0].powerups} onClick={()=>send('power')}>★ POWER UP</button></div></>}
      {r?.plan?.cardId&&<div className="lh-sport-card"><BowlingCard type={r.plan.cardId}/></div>}
      <p>每次機會最多兩球，全倒提前完成。★ 標記可取得特殊卡；Extra Shot 增加五球。</p>
    </>:<>
      <label>選擇球衣 <select value={country} disabled={!!pending||busy} onChange={e=>setCountry(e.target.value)}>{COUNTRIES.map(c=><option key={c.code} value={c.code}>{c.name||c.code}</option>)}</select></label>
      <div className="wp-app lh-soccer-stage"><Stadium match={soccerMatch} reduced={reduced} blocked={blocked} onKick={z=>send('kick',{zone:z})}/></div>
      {r&&<div className="lh-soccer-reveal"><div className="lh-sport-card"><PowerCardArt cardId={r.cardId}/></div><div><strong>{CARDS[r.cardId].name}</strong>{r.cardId==='normal'&&<Dice value={r.ballValue} rolling={progress<1&&!r.shot}/>}<p>{r.cardId==='normal'?`${r.ballValue} 分`:CARDS[r.cardId].description}</p>{pending&&!r.resolved&&<p>選擇球門 1–4 區射門，進球才得分。</p>}{r.shot&&progress===1&&<strong>{r.shot.goal?'GOAL!':'SAVED!'}</strong>}</div></div>}
      <p>每次機會抽卡一次；扣分最低為 0。單人版各回合獨立抽選。</p>
    </>}
    {!pending&&<button className="lh-primary" disabled={blocked||reward.remaining<=0} onClick={()=>{setZone(1);send('start');}}>開始{game==='bowling'?'球局':'射門回合'}（使用 1 次機會）</button>}
    {pending&&r.resolved&&<button className="lh-primary" disabled={blocked} onClick={()=>send('finish')}>完成回合</button>}
    {r&&progress===1&&<p className="lh-reward-result">本次 {r.points>=0?'+':''}{r.points} 分</p>}
    {error&&<div role="alert"><p>{error}</p><button disabled={busy} onClick={()=>send('retry')}>重試原操作（不重複扣次數）</button></div>}
    {!pending&&reward.remaining===0&&<h3>機會已用完，請等待老師下一題。</h3>}
    <p className="lh-note">遊戲分數不影響學習成績。老師暫停或切題時收起，已開始的球局可在下次遊戲時段繼續。</p>
  </section>;
}
