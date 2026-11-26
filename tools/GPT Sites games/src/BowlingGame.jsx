import {preloadBowling,subscribeMedia,mediaProgress} from './bowling-media';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,Check,Crown,Home,Maximize2,Menu,Play,RotateCcw,Settings2,Volume2,VolumeX,X} from 'lucide-react';
import {
  BALL_SKINS,BOWLING_STORAGE_KEY,EXTRA_SHOTS,BOWLING_THEMES,CARD_IDS,CARD_META,PIN_POSITIONS,
  createBowlingSession,drawBowlingCard,eligibleTeamIds,normalizeSettings,migrateBowlingSession,
  planCardBowlingShot,planNormalBowlingShot,commitBowlingShot,startBowlingTurn,validBowlingSession,winnerTeamIds,
} from './bowling-model.mjs';
import {BowlingBall,PowerCardArt} from './BowlingArt';
import {BowlingPins} from './BowlingPins';
import {BowlingMotionLab} from './BowlingMotionLab';
import {BALL_DIAMETER,zoneCenter,ballFrame,createPinMotion} from './bowling-motion.mjs';
import {BowlingAudio} from './BowlingAudio';
import {Bowling3DLane} from './bowling3d/Bowling3DLane';
import {Bowling3DAudio} from './bowling3d/audio3d';
import './bowling.css';

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
// The 3D lane needs WebGL 2; without it the original 2D lane below is used unchanged.
const canUse3D=()=>{try{return !!document.createElement('canvas').getContext('webgl2');}catch{return false;}};
const fullRack=settings=>Array.from({length:settings?.fivePins?5:10},(_,i)=>i);
const cueForCard=id=>`card_${id.replaceAll('-','_')}`;
function readSession(storage=window.localStorage){try{return migrateBowlingSession(JSON.parse(storage.getItem(BOWLING_STORAGE_KEY)||'null'));}catch{return null;}}
function initialTeams(){return Array.from({length:8},(_,i)=>({name:`Team ${i+1}`,skin:i%BALL_SKINS.length}));}
function savedGame(session,storage=window.localStorage){try{storage.setItem(BOWLING_STORAGE_KEY,JSON.stringify(session));return true;}catch{return false;}}
function scorePreview(session,plan){
  if(!session?.active)return {};
  const team=session.teams.find(item=>item.id===session.active.teamId);
  if(!team)return {};
  if(plan.cardId==='swap-points'){
    const other=session.teams.find(item=>item.id===plan.targetTeamId);
    return other?{[team.id]:other.score-team.score,[other.id]:team.score-other.score}:{};
  }
  if(plan.cardId==='lose-points')return {[team.id]:-Math.min(team.score,plan.amount)};
  if(plan.cardId==='double-points')return {[team.id]:team.score};
  return {[team.id]:plan.fallenPins.length};
}

function SettingToggle({label,detail,checked,onChange}){
  return <label className="bw-toggle"><span><strong>{label}</strong><small>{detail}</small></span><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/><i aria-hidden="true"/></label>;
}

function Setup({settings,setSettings,teams,setTeams,onStart,onOpenLab,onExit,previousSession,onResume,busy,error}){
  const [chosenTeam,setChosenTeam]=useState(0);
  const teamCount=settings.teamCount;
  useEffect(()=>setChosenTeam(previous=>Math.min(previous,teamCount-1)),[teamCount]);
  const set=(key,value)=>setSettings(previous=>normalizeSettings({...previous,[key]:value}));
  const setCard=(id,patch)=>setSettings(previous=>normalizeSettings({...previous,cards:{...previous.cards,[id]:{...previous.cards[id],...patch}}}));
  const updateTeam=(index,patch)=>setTeams(previous=>previous.map((team,i)=>i===index?{...team,...patch}:team));
  return <div className={`bw-setup bw-theme-${settings.theme.toLowerCase()}`}>
    <div className="bw-setup-glow"/>
    <header className="bw-setup-header"><button type="button" className="bw-setup-back" aria-label="Back to game collection" onClick={onExit}><ArrowLeft size={20}/><span>GAMES / 遊戲總覽</span></button><div className="bw-brand"><span>🎳</span><b>BOWLING!</b></div><div className="bw-setup-kicker">CLASSROOM CLUB · TEACHER SETUP</div></header>
    {previousSession&&<div className="bw-setup-resume"><span>{previousSession.phase==='finished'?'Previous match results are still saved. / 上次結果仍保留。':'Your previous match is still saved. / 上次比賽仍保留。'}</span><button type="button" disabled={busy} onClick={onResume}>{previousSession.phase==='finished'?'VIEW RESULTS':'RESUME MATCH'}</button></div>}
    <main className="bw-setup-main">
      <section className="bw-setup-intro"><span className="bw-ribbon">READY TO ROLL?</span><h1>Bowling<br/><em>Showdown</em></h1><p>Pick your teams, aim for the pins, and roll!</p><div className="bw-sample-balls" aria-hidden="true"><BowlingBall skin={0} size={88}/><BowlingBall skin={3} size={68}/><BowlingBall skin={5} size={55}/></div></section>
      <div className="bw-setup-panels">
        <section className="bw-panel"><div className="bw-panel-heading"><span>01</span><div><h2>Teams &amp; turns</h2><p>組別、代表球與回合</p></div></div>
          <div className="bw-setup-inline"><label>TEAMS / 組數<input aria-label="Number of teams" type="number" min="2" max="8" value={teamCount} onChange={e=>set('teamCount',Math.max(2,Math.min(8,+e.target.value||2)))}/></label><label>ROUNDS / 回合<input aria-label="Number of rounds" type="number" min="1" max="20" value={settings.rounds} onChange={e=>set('rounds',Math.max(1,Math.min(20,+e.target.value||1)))}/></label></div>
          <div className="bw-team-editor" aria-label="Team names and balls">{teams.slice(0,teamCount).map((team,i)=><div className={`bw-team-edit ${chosenTeam===i?'selected':''}`} key={i}><button type="button" aria-label={`Choose ball for team ${i+1}`} onClick={()=>setChosenTeam(i)}><BowlingBall skin={team.skin} size={43}/></button><span>{i+1}</span><input aria-label={`Team ${i+1} name`} maxLength={26} value={team.name} onChange={e=>updateTeam(i,{name:e.target.value})}/></div>)}</div>
          <div className="bw-palette-heading"><strong>Pick a ball for {teams[chosenTeam]?.name||`Team ${chosenTeam+1}`}</strong><button type="button" onClick={()=>setTeams(previous=>previous.map((team,i)=>({...team,skin:(i+Math.floor(Math.random()*BALL_SKINS.length))%BALL_SKINS.length})))}>Random balls</button></div>
          <div className="bw-ball-palette" aria-label="15 bowling ball designs">{BALL_SKINS.map((skin,i)=><button type="button" key={i} title={skin[0]} aria-label={`Choose ${skin[0]} ball`} aria-pressed={teams[chosenTeam]?.skin===i} onClick={()=>updateTeam(chosenTeam,{skin:i})}><BowlingBall skin={i} size={64}/><span>{skin[0]}</span></button>)}</div>
          <button type="button" className="bw-lab-link" onClick={onOpenLab}>ANIMATION PREVIEW / 倒瓶慢速驗收</button>
        </section>
        <section className="bw-panel"><div className="bw-panel-heading"><span>02</span><div><h2>Game options</h2><p>玩法、音量與場景</p></div></div>
          <label className="bw-setting-field">THEME / 主題<select aria-label="Theme" value={settings.theme} onChange={e=>set('theme',e.target.value)}>{BOWLING_THEMES.map(theme=><option key={theme}>{theme}</option>)}</select></label>
          <div className="bw-options-list"><SettingToggle label="Power-ups" detail="球道 +1 收集功能卡" checked={settings.powerups} onChange={value=>set('powerups',value)}/><SettingToggle label="Two Shots" detail="每回合最多兩次正常投球" checked={settings.twoShots} onChange={value=>set('twoShots',value)}/><SettingToggle label="Five Pins" detail="改成五瓶球架" checked={settings.fivePins} onChange={value=>set('fivePins',value)}/><SettingToggle label="Never Miss" detail="一般投球不會完全失投" checked={settings.neverMiss} onChange={value=>set('neverMiss',value)}/></div>
          <div className="bw-volume-setup"><label>Music <b>{settings.musicVolume}%</b><input aria-label="Music volume" type="range" min="0" max="100" value={settings.musicVolume} onChange={e=>set('musicVolume',+e.target.value)}/></label><label>Sounds <b>{settings.soundsVolume}%</b><input aria-label="Sound effects volume" type="range" min="0" max="100" value={settings.soundsVolume} onChange={e=>set('soundsVolume',+e.target.value)}/></label></div>
        </section>
        <section className="bw-panel bw-card-panel"><div className="bw-panel-heading"><span>03</span><div><h2>Power-up cards</h2><p>六種功能卡與出現權重</p></div></div><p className="bw-panel-caption">A +1 target adds a Power-up. Playing one draws a random enabled card. A card ball replaces the regular ball for that shot.</p><div className="bw-card-settings">{CARD_IDS.map(id=><div className="bw-card-setting" key={id}><PowerCardArt type={id} compact/><div><strong>{CARD_META[id].name}</strong><small>{CARD_META[id].zh}</small><label><input type="checkbox" checked={settings.cards[id].enabled} onChange={e=>setCard(id,{enabled:e.target.checked})}/> ON</label><label>Weight <input aria-label={`${CARD_META[id].name} weight`} type="number" min="0" max="100" value={settings.cards[id].weight} onChange={e=>setCard(id,{weight:+e.target.value})}/>%</label></div></div>)}</div><details className="bw-card-rules"><summary>查看六張卡牌的實際規則</summary><ul><li><b>Hit or Miss</b>：隨機全倒或失投。</li><li><b>Extra Shot</b>：本組在本回合增加 2 次投球。</li><li><b>No Shot</b>：使用此球但不撞倒球瓶，仍算一次投球。</li><li><b>Lose Points</b>：本組扣 3 或 5 分，最低為 0 分。</li><li><b>Double Points</b>：本組目前總分加倍。</li><li><b>Swap Points</b>：與另一組交換目前總分。</li></ul><p>影片直接呈現了交換分數、額外投球與扣 3／5 分；其餘卡牌的細部規則為本版設計推定，可在試玩後調整。</p></details><p className="bw-panel-caption">Weights are relative chances. Each Power-up uses its own special ball and sound.</p></section>
      </div>
    </main>
    <div className="bw-start-bar"><span>Teacher chooses the team order each round.</span><button type="button" className="bw-primary" disabled={busy} onClick={onStart}><Play size={24}/>{busy?'Preparing game…':'START BOWLING'}</button></div>
    {error&&<div role="alert" className="bw-error">{error}</div>}
  </div>;
}

function Winner({session,celebrating,onPlayAgain,onExit}){
  const ids=winnerTeamIds(session);
  const winners=session.teams.filter(team=>ids.includes(team.id));
  return <div className={`bw-results ${celebrating?'bw-celebrating':''}`}>
    <button type="button" className="bw-setup-back bw-results-back" aria-label="Back to game collection from results" onClick={onExit}><ArrowLeft size={20}/> GAMES / 遊戲總覽</button>
    {celebrating&&<div className="bw-confetti" aria-hidden="true">{Array.from({length:45},(_,i)=><i key={i} style={{'--i':i,'--x':`${(i*73)%100}%`,'--delay':`${(i%12)*.15}s`}}/>)}</div>}
    <div className="bw-winner-card"><span className="bw-winner-rays" aria-hidden="true"/><Crown size={76} fill="#ffe66d" stroke="#a95816"/><span className="bw-ribbon">WINNER!</span><h1>{winners.map(team=>team.name).join(' & ')}</h1><div className="bw-winner-balls">{winners.map(team=><BowlingBall key={team.id} skin={team.skin} size={104}/>)}</div><div className="bw-winner-score">{winners[0]?.score ?? 0} POINTS</div><p>{celebrating?'Celebration · 5 seconds':'Great game, everyone!'}</p></div>
    {!celebrating&&<div className="bw-results-list">{[...session.teams].sort((a,b)=>b.score-a.score).map((team,i)=><div key={team.id}><strong>{i+1}. {team.name}</strong><b>{team.score}</b></div>)}<button type="button" className="bw-primary" onClick={onPlayAgain}><RotateCcw size={20}/> NEW GAME</button></div>}
  </div>;
}

export default function BowlingGame({preferences,onExit,storage=window.localStorage,beforeTurn=null,solo=false,startInSetup=false}){
  const [prepared,setPrepared]=useState(false);
  const [mediaState,setMediaState]=useState(mediaProgress);
  const [mediaError,setMediaError]=useState(false);
  const [loadAttempt,setLoadAttempt]=useState(0);
  useEffect(()=>{
    let active=true;setMediaError(false);
    const unsubscribe=subscribeMedia(value=>{if(active)setMediaState(value);});
    preloadBowling().then(()=>{if(active)setPrepared(true);}).catch(()=>{if(active)setMediaError(true);});
    return()=>{active=false;unsubscribe();};
  },[loadAttempt]);
  const initial=useRef(undefined);
  if(initial.current===undefined)initial.current=readSession(storage);
  const [previousSession,setPreviousSession]=useState(()=>!solo&&startInSetup?initial.current:null);
  const [session,setSession]=useState(()=>{const saved=initial.current;if(!solo&&startInSetup)return null;return solo&&saved?{...saved,settings:{...saved.settings,soundsVolume:(preferences?.volume??.8)*100}}:saved;});
  const [settings,setSettings]=useState(()=>normalizeSettings(readSession(storage)?.settings));
  const [teams,setTeams]=useState(()=>{const previous=readSession(storage)?.teams;return previous?[...previous.map(({name,skin})=>({name,skin})),...initialTeams().slice(previous.length)]:initialTeams();});
  const [selectedZone,setSelectedZone]=useState(1);
  const [audioReady,setAudioReady]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [menu,setMenu]=useState(false);
  const [scoreboardOpen,setScoreboardOpen]=useState(false);
  const [newConfirm,setNewConfirm]=useState(false);
  const [pendingSwap,setPendingSwap]=useState(false);
  const [cardReveal,setCardReveal]=useState(null);
  const [flight,setFlight]=useState(null);
  const [falling,setFalling]=useState(null);
  const [labOpen,setLabOpen]=useState(()=>new URLSearchParams(window.location.search).get('bowlingLab')==='1');
  const [preview,setPreview]=useState({});
  const [result,setResult]=useState(null);
  const [celebrating,setCelebrating]=useState(false);
  const [use3d,setUse3d]=useState(canUse3D),[layoutTick,setLayoutTick]=useState(0),[bonusPreview,setBonusPreview]=useState(0);
  const lane3d=useRef(null),audio3dRef=useRef(null),streaks=useRef({}),sessionRef=useRef(null);
  if(!audio3dRef.current)audio3dRef.current=new Bowling3DAudio();
  const audio3d=audio3dRef.current;
  const laneRef=useRef(null),ballRef=useRef(null),audioRef=useRef(null),busyRef=useRef(false),mountedRef=useRef(true),cardAckRef=useRef(null);
  if(!audioRef.current)audioRef.current=new BowlingAudio();
  const audio=audioRef.current;
  useEffect(()=>{mountedRef.current=true;const pause=()=>{if(document.hidden){audio.pause();audio3d.stop();}};document.addEventListener('visibilitychange',pause);return()=>{mountedRef.current=false;cardAckRef.current?.();cardAckRef.current=null;document.removeEventListener('visibilitychange',pause);audio.dispose();audio3d.dispose();};},[audio,audio3d]);
  useEffect(()=>{if(session&&!savedGame(session,storage))setError('This browser could not save the game. Check available storage before continuing.');},[session]);
  useEffect(()=>{
    const muted=!!session?.settings?.muted||!!preferences?.muted;
    audio.configure({...session?.settings,muted});
    audio3d.configure({volume:(session?.settings?.soundsVolume??80)/100,musicVolume:(session?.settings?.musicVolume??40)/100,muted});
  },[audio,audio3d,session?.settings,preferences?.muted]);
  useEffect(()=>{
    if(session?.phase!=='finished')return;
    const remaining=Math.max(0,5000-(Date.now()-(session.finishedAt||Date.now())));
    if(!remaining){setCelebrating(false);return;}
    setCelebrating(true);
    if(audioReady){audio.celebrate(`winner-${session.id}`);if(use3d){audio3d.duck(true);lane3d.current?.winner();}}
    const timer=setTimeout(()=>{setCelebrating(false);audio3d.duck(false);},remaining);
    return()=>{clearTimeout(timer);audio3d.duck(false);};
  },[session?.phase,session?.finishedAt,session?.id,audioReady,audio]);
  const activeTeam=session?.teams.find(team=>team.id===session.active?.teamId);
  const available=session?eligibleTeamIds(session):[];
  const shotsLeft=solo?Math.max(0,1-(session?.events.filter(event=>event.type==='shot').length||0)):session?(session.settings.rounds*session.teams.length-session.events.filter(event=>event.type==='turn-end').length+
    Math.max(0,(session.active?.bonusShots||0)-Math.max(0,(session.active?.shotsUsed||0)-(session.settings.twoShots?2:1)))):0;
  const theme=session?.settings.theme||settings.theme;
  sessionRef.current=session;
  // Puts the 3D lane in its waiting state for the current turn (standing pins, the team's ball on the chosen lane).
  function syncLane(zone=selectedZone){
    const now=sessionRef.current,lane=lane3d.current;if(!now||!lane?.ready())return;
    const team=now.teams.find(item=>item.id===now.active?.teamId);
    const aim=now.active?Math.min(zone,now.active.zoneCount):0;
    lane.setup({remaining:now.active?.remainingPins||fullRack(now.settings),startFraction:aim?zoneCenter(aim,now.active.zoneCount):.5,skin:team?.skin??0,
      zones:now.active&&now.phase==='aim'?{count:now.active.zoneCount,selected:aim,token:now.active.tokenZone}:null});
  }
  useEffect(()=>{if(use3d&&!busyRef.current)syncLane();},[use3d,layoutTick,session?.id,session?.phase,session?.active?.teamId,session?.active?.shotsUsed,session?.active?.remainingPins?.length,selectedZone]);
  async function ensureAudio(){
    setLoading(true);setError('');
    try{
      // Both audio engines are unlocked inside the same tap so iPad Safari accepts them.
      const [missing]=await Promise.all([audio.unlock(),use3d?audio3d.unlock():null]);
      if(!mountedRef.current)return false;if(missing.length)throw Error(`Missing sound files: ${missing.join(', ')}`);
      if(use3d){await audio3d.load();if(!mountedRef.current)return false;audio3d.startMusic();}else audio.startMusic();
      setAudioReady(true);return true;
    }
    catch(err){if(mountedRef.current)setError(err.message||'Game sounds could not start.');return false;}
    finally{if(mountedRef.current)setLoading(false);}
  }
  async function beginGame(){if(!await ensureAudio())return;const next=createBowlingSession({settings,teams});setSession(next);setPreviousSession(null);setSelectedZone(1);}
  async function resumePrevious(){if(!previousSession)return;audio.configure({...previousSession.settings,muted:!!previousSession.settings.muted||!!preferences?.muted});if(!await ensureAudio())return;setSession(previousSession);setPreviousSession(null);}
  async function resumeGame(){await ensureAudio();}
  function selectTeam(id){if(solo||busyRef.current||session.phase!=='choose-team')return;const go=()=>{audio.play('ui_click');setSession(startBowlingTurn(session,id));setSelectedZone(1);setResult(null);};beforeTurn?beforeTurn(`bowling:${session.id}:${session.events.filter(e=>e.type==='turn-end').length}:${id}`,session.teams.find(t=>t.id===id)?.name||id,go):go();}
  function chooseZone(zone){if(busyRef.current||session?.phase!=='aim')return;setSelectedZone(zone);audio.play('aim_tick');}
  function clearForNew(){if(solo){onExit();return;}audio.pause();audio3d.stop();streaks.current={};try{storage.removeItem(BOWLING_STORAGE_KEY);}catch{}setSession(null);setAudioReady(false);setNewConfirm(false);setMenu(false);setResult(null);setCardReveal(null);setFlight(null);busyRef.current=false;}
  function updateSound(key,value){setSession(previous=>({...previous,settings:{...previous.settings,[key]:value},updatedAt:Date.now()}));}
  async function animateBall(plan,onImpact){
    await new Promise(resolve=>requestAnimationFrame(resolve));
    const node=ballRef.current;
    if(!node){onImpact();return;}
    const duration=preferences?.reduced?500:plan.cardId==='swap-points'?3400:plan.label==='MISS'?2900:2500;
    const start=performance.now();let hit=false;
    await new Promise(resolve=>{
      const tick=now=>{
        if(!mountedRef.current){resolve();return;}
        const t=Math.min(1,(now-start)/duration);
        const frame=ballFrame(plan.trajectory,t,plan.motion?.impactPoint);
        node.style.left=`${frame.x*100}%`;node.style.top=`${frame.y*100}%`;
        node.style.transform=`translate(-50%,-50%) scale(${frame.scale}) rotate(${frame.spin}deg)`;
        if(frame.impact)node.style.zIndex='3';
        if(!hit&&frame.impact){hit=true;onImpact();}
        if(t<1)requestAnimationFrame(tick);else{if(!hit)onImpact();resolve();}
      };
      requestAnimationFrame(tick);
    });
  }
  function impactSounds(plan,shotId){
    const count=plan.fallenPins.length;
    if(plan.kind==='card'){
      if(plan.cardId==='hit-or-miss')audio.play(count?(session.settings.fivePins?'pins_5':'strike'):'miss',`${shotId}-card-hit`);
    }else if(count){
      if(plan.label==='SPARE!'){} // The selected B spare clip includes its own roll, impact and score.
      else if(plan.label==='STRIKE!')audio.play(session.settings.fivePins?'pins_5':'strike',`${shotId}-pins`);
      else if(count===8)audio.play('pins_8_score_b',`${shotId}-pins`);
      else{audio.play(`pins_${count}`,`${shotId}-pins`);setTimeout(()=>audio.play('score',`${shotId}-score`),260);}
    }
    if(plan.collectedToken)audio.play('power_collect',`${shotId}-collect`);
  }
  // 3D shot: the lane plays the already-decided plan and reports which pins the physics knocked down (same count).
  async function runShot3D(plan){
    if(busyRef.current||!session?.active)return;
    busyRef.current=true;setError('');setResult(null);
    const active=session.active,team=activeTeam,shotId=`shot-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
    const target=plan.cardId==='swap-points'?session.teams.find(item=>item.id===plan.targetTeamId):null;
    const lost=plan.cardId==='lose-points'?Math.min(team.score,plan.amount):0;
    const score=plan.cardId==='lose-points'?{from:team.score,to:team.score-lost}:plan.cardId==='double-points'?{from:team.score,to:team.score*2}:target?{from:team.score,to:target.score}:null;
    const strike=plan.kind==='normal'&&plan.label==='STRIKE!';
    if(plan.kind==='normal')streaks.current[team.id]=strike?(streaks.current[team.id]||0)+1:0;
    try{
      setFlight({plan,skin:team.skin,cardId:plan.cardId||null});
      const outcome=await lane3d.current.shoot({plan,remaining:active.remainingPins,startFraction:zoneCenter(selectedZone,active.zoneCount),skin:team.skin,
        streak:strike?streaks.current[team.id]:0,amount:lost,score,swap:target&&{a:{name:team.name,score:team.score},b:{name:target.name,score:target.score}},
        onImpact:fallen=>{setPreview(scorePreview(session,{...plan,fallenPins:fallen}));if(plan.collectedToken)audio.play('power_collect',`${shotId}-collect`);},
        onScore:data=>{if(data.shots)setBonusPreview(value=>value+data.shots);else setPreview(scorePreview(session,plan));}});
      if(!mountedRef.current||outcome.cancelled)return;
      // Scoring is unchanged: only the pin ids come from the physics, their number is the planned one.
      const final=plan.kind==='normal'||plan.cardId==='hit-or-miss'?{...plan,fallenPins:outcome.fallen}:plan;
      setSession(previous=>commitBowlingShot(previous,shotId,final));
      setPreview({});setBonusPreview(0);
      await delay(preferences?.reduced?300:800);
      if(!mountedRef.current)return;
      if(solo){onExit();return;}
      setFlight(null);lane3d.current?.clear();setSelectedZone(1);busyRef.current=false;syncLane(1);
    }catch(err){if(mountedRef.current){setError(err.message||'This shot could not be completed.');setFlight(null);}}
    finally{busyRef.current=false;}
  }
  async function runShot(plan){
    if(use3d&&lane3d.current?.ready())return runShot3D(plan);
    if(busyRef.current||!session?.active)return;
    busyRef.current=true;setError('');
    plan={...plan,trajectory:{...plan.trajectory,startX:zoneCenter(selectedZone,session.active.zoneCount)}};
    plan.motion=createPinMotion(plan.fallenPins,plan.trajectory,session.active.remainingPins);
    const shotId=`shot-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
    try{
      if(plan.kind==='card'){
        setCardReveal(plan.cardId);audio.play('power_reveal',`${shotId}-reveal`);
        await new Promise(resolve=>{cardAckRef.current=resolve;});
        if(!mountedRef.current)return;
        cardAckRef.current=null;
        audio.play(plan.cardId==='swap-points'?'swap_points_b':cueForCard(plan.cardId),`${shotId}-card`);
        setCardReveal(null);
      }else if(plan.label==='SPARE!')audio.play('spare_b',`${shotId}-start`);
      else if(plan.fallenPins.length===0)audio.play('miss_b',`${shotId}-start`);
      else audio.play('roll_b',`${shotId}-start`);
      setFlight({plan,skin:activeTeam.skin,cardId:plan.cardId||null});
      let impacted=false;
      await animateBall(plan,()=>{
        if(impacted||!mountedRef.current)return;impacted=true;
        setFalling(plan.motion);setPreview(scorePreview(session,plan));
        setResult({label:plan.label,amount:plan.cardId==='lose-points'?`−${plan.amount}`:plan.cardId==='extra-shot'?`+${EXTRA_SHOTS} SHOTS`:plan.cardId==='double-points'?'×2':plan.fallenPins.length?`+${plan.fallenPins.length}`:'',cardId:plan.cardId});
        impactSounds(plan,shotId);
      });
      await delay(preferences?.reduced?80:1350);
      if(!mountedRef.current)return;
      setSession(previous=>commitBowlingShot(previous,shotId,plan));
      setFlight(null);setFalling(null);setPreview({});
      await delay(plan.cardId==='swap-points'&&!preferences?.reduced?5600:preferences?.reduced?350:1550);
      if(mountedRef.current){if(solo){onExit();return;}setResult(null);setSelectedZone(1);}
    }catch(err){if(mountedRef.current)setError(err.message||'This shot could not be completed.');}
    finally{busyRef.current=false;}
  }
  function throwBall(){if(!session?.active||busyRef.current||pendingSwap||menu||solo&&session.events.some(event=>event.type==='shot'))return;try{runShot(planNormalBowlingShot(session,selectedZone));}catch(err){setError(err.message);}}
  function usePowerup(){
    if(!session?.active||!activeTeam?.powerups||busyRef.current||menu)return;
    const cardId=drawBowlingCard(session.settings);
    if(!cardId){setError('No Power-up cards are enabled.');return;}
    if(cardId==='swap-points'&&session.teams.length>2){setPendingSwap(true);return;}
    const other=session.teams.find(team=>team.id!==activeTeam.id);
    runShot(planCardBowlingShot(session,cardId,cardId==='swap-points'?other.id:null));
  }
  function confirmSwap(targetId){setPendingSwap(false);try{runShot(planCardBowlingShot(session,'swap-points',targetId));}catch(err){setError(err.message);}}
  useEffect(()=>{
    const onKey=event=>{
      if(!prepared||!audioReady||labOpen||session?.phase!=='aim'||busyRef.current||menu||pendingSwap||event.target.closest('input,select,textarea'))return;
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
        event.preventDefault();setSelectedZone(previous=>Math.max(1,Math.min(session.active.zoneCount,previous+(event.key==='ArrowRight'?1:-1))));audio.play('aim_tick');
      }
      if(event.code==='Space'){event.preventDefault();throwBall();}
    };
    window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
  });

  if(!prepared)return <div className="bw-load-screen"><h1>🎳 BOWLING!</h1><div className="bw-load-card" role="status" aria-live="polite"><h2>{mediaError?'LET’S TRY AGAIN':'GETTING READY…'}</h2><p>{mediaError?'Some files did not load. Check your connection, then retry.':'Preparing all balls, pins and sounds.'}</p><progress aria-label="Game files loaded" value={mediaState.done} max={mediaState.total}/><p>{mediaState.done} / {mediaState.total} files ready</p>{mediaError&&<button className="bw-primary" onClick={()=>setLoadAttempt(value=>value+1)}>RETRY LOADING</button>}<button className="bw-icon-button" onClick={onExit}>BACK TO GAMES</button></div></div>;
  if(session&&!audioReady&&!labOpen)return <div className="bw-load-screen"><div className="bw-load-card" role="dialog" aria-modal="true" aria-label="Resume bowling game"><Volume2 size={48}/><h2>{solo?"Ready to roll?":"Continue your game?"}</h2><p>{solo?"One roll. Original pins, balls and sounds.":"Your scores and progress are saved. Tap to enable sound and continue."}</p><button className="bw-primary" disabled={loading} onClick={resumeGame}>{loading?'Preparing game…':'CONTINUE WITH SOUND'}</button>{error&&<p role="alert">{error}</p>}<button className="bw-icon-button" onClick={onExit}>BACK TO GAMES</button></div></div>;
  if(labOpen)return <BowlingMotionLab onClose={()=>{setLabOpen(false);if(audioReady&&!use3d)audio.startMusic();}}/>;
  if(!session)return <Setup settings={settings} setSettings={setSettings} teams={teams} setTeams={setTeams} onStart={beginGame} onOpenLab={()=>setLabOpen(true)} onExit={()=>{audio.pause();onExit();}} previousSession={previousSession} onResume={resumePrevious} busy={loading} error={error}/>;
  return <div className={`bw-game bw-theme-${theme.toLowerCase()} ${preferences?.reduced?'bw-reduced':''}`}>
    <header className="bw-topbar"><button type="button" className="bw-icon-button" aria-label="Back to game collection" onClick={()=>{audio.pause();onExit();}}><Home size={24}/></button><div className="bw-brand"><span>🎳</span><b>BOWLING!</b></div><button type="button" className="bw-board-open" onClick={()=>setScoreboardOpen(true)}>TEAM SCORES</button><div className="bw-round-pill">ROUND <strong>{Math.min(session.round,session.settings.rounds)}</strong><small>/ {session.settings.rounds}</small></div><button type="button" className="bw-icon-button" aria-label="Game options" onClick={()=>setMenu(true)}><Menu size={24}/></button></header>
    <div className="bw-background-pattern" aria-hidden="true"/>
    <div className="bw-play-layout">
      <div className="bw-lane-column"><div className="bw-top-indicators"><div className="bw-shot-counter"><strong>{shotsLeft+bonusPreview}</strong><span>SHOTS</span></div><div className="bw-current-label">{session.active?`${activeTeam.name.toUpperCase()} · SHOT ${session.active.shotsUsed+1}`:session.phase==='finished'?'GAME OVER':`PICK A TEAM · ROUND ${session.round}`}</div><div className="bw-power-counter"><span>POWER</span><strong>{activeTeam?.powerups??0}</strong><span>UP</span></div></div>
        {use3d?<div className="bw-lane-stage bw-lane-3d" ref={laneRef}>
          <Bowling3DLane ref={lane3d} audio={audio3d} theme={theme} reduced={!!preferences?.reduced} counter={[-.62,.4]} onLayout={()=>setLayoutTick(value=>value+1)} onError={()=>{setUse3d(false);if(audioReady)audio.startMusic();}}>
            {session.active&&session.phase==='aim'&&!flight&&<div className="bw-aim-row3d" role="group" aria-label="Choose a bowling lane">{Array.from({length:session.active.zoneCount},(_,i)=>
              <button type="button" key={i} className={`bw-aim-zone bw-zone-${i%5} ${selectedZone===i+1?'selected':''}`} aria-label={`Aim zone ${i+1}`} aria-pressed={selectedZone===i+1} onClick={()=>chooseZone(i+1)}>{i+1}</button>)}</div>}
            {!session.active&&session.phase==='choose-team'&&<div className="bw-pick-overlay"><b>WHO'S UP NEXT?</b><span>Choose any team that has not bowled this round.</span></div>}
          </Bowling3DLane>
        </div>:<div className="bw-lane-stage" ref={laneRef}>
          <div className="bw-portal"/><div className="bw-pin-deck"/>
          <div className="bw-lane-face"><div className="bw-lane-planks"/><div className="bw-lane-glow"/></div>
          <BowlingPins remaining={session.active?.remainingPins||Array.from({length:session.settings.fivePins?5:10},(_,i)=>i)} motion={falling} reduced={preferences?.reduced}/>
          {session.active?.tokenZone&&<div className="bw-power-target" style={{left:`${(.16+.68*(session.active.tokenZone-.5)/session.active.zoneCount)*100}%`}}>+1</div>}
          {session.active&&session.phase==='aim'&&!flight&&<div className="bw-aim-zones" role="group" aria-label="Choose a bowling lane">{Array.from({length:session.active.zoneCount},(_,i)=><button type="button" key={i} className={`bw-aim-zone bw-zone-${i%5} ${selectedZone===i+1?'selected':''}`} aria-label={`Aim zone ${i+1}`} aria-pressed={selectedZone===i+1} onClick={()=>chooseZone(i+1)}>{i+1}</button>)}</div>}
          {session.active&&!flight&&<BowlingBall skin={activeTeam.skin} className="bw-ready-ball" size={BALL_DIAMETER} style={{left:`${zoneCenter(selectedZone,session.active.zoneCount)*100}%`}}/>}
          {flight&&<BowlingBall skin={flight.skin} cardId={flight.cardId} className="bw-flying-ball" size={BALL_DIAMETER} style={{left:`${flight.plan.trajectory.startX*100}%`,top:'84%',transform:'translate(-50%,-50%)'}} ref={ballRef}/>}
          {result&&<div className={`bw-impact-text ${result.cardId?'bw-impact-card':''}`} key={result.label+result.amount}><strong>{result.label}</strong>{result.amount&&<span>{result.amount}</span>}</div>}
          {!session.active&&session.phase==='choose-team'&&<div className="bw-pick-overlay"><b>WHO'S UP NEXT?</b><span>Choose any team that has not bowled this round.</span></div>}
        </div>}
        {session.active&&<div className="bw-lane-controls"><div className="bw-control-instruction"><BowlingBall skin={activeTeam.skin} size={56}/><span><strong>{activeTeam.name}</strong><small>Choose a lane, then roll!</small></span></div><button type="button" className="bw-power-button" disabled={!activeTeam.powerups||busyRef.current} onClick={usePowerup}><span>★</span>POWER UP <b>{activeTeam.powerups}</b></button><button type="button" className="bw-roll-button" disabled={busyRef.current||!!flight} onClick={throwBall}><Play fill="currentColor" size={25}/> ROLL!</button></div>}
      </div>
      <aside className="bw-score-panel"><div className="bw-score-heading"><h2>TEAM SCORES</h2><span>ROUND {session.round} / {session.settings.rounds}</span></div><div className={`bw-score-list ${session.teams.length>7?'bw-many-teams':''}`} aria-label="Team scores">{session.teams.map(team=>{
        const eligible=available.includes(team.id)&&session.phase==='choose-team';
        const leader=Math.max(...session.teams.map(item=>item.score+(preview[item.id]||0)))===team.score+(preview[team.id]||0);
        return <button type="button" key={team.id} className={`bw-score-team ${activeTeam?.id===team.id?'active':''} ${eligible?'eligible':''} ${session.doneTeamIds.includes(team.id)?'done':''}`} disabled={!eligible||!audioReady} onClick={()=>selectTeam(team.id)} aria-label={`${team.name}, ${team.score+(preview[team.id]||0)} points${eligible?', choose this team':''}`}>
          <BowlingBall skin={team.skin} size={session.teams.length>7?32:48}/><span className="bw-score-name">{team.name}<small>{activeTeam?.id===team.id?'BOWLING NOW':session.doneTeamIds.includes(team.id)?'DONE THIS ROUND':eligible?'TAP TO BOWL':''}</small></span><strong className="bw-score-value" aria-live="polite">{team.score+(preview[team.id]||0)}</strong>{leader&&team.score+(preview[team.id]||0)>0&&<Crown className="bw-leader-crown" size={20} fill="#ffd64e"/>}{session.doneTeamIds.includes(team.id)&&<Check className="bw-done-check" size={20}/>}</button>;
      })}</div><div className="bw-score-foot"><span>1 PIN = 1 POINT</span><span>{available.length} TEAM{available.length===1?'':'S'} TO GO</span></div></aside>
    </div>
    {!audioReady&&session.phase!=='finished'&&<div className="bw-modal-backdrop"><div className="bw-modal" role="dialog" aria-modal="true" aria-label="Resume bowling game"><Volume2 size={48}/><h2>Continue your game?</h2><p>Scores, round and teams were saved on this device. Tap once to enable sound and keep playing.</p><button className="bw-primary" type="button" disabled={loading} onClick={resumeGame}>{loading?'Loading sounds…':'CONTINUE WITH SOUND'}</button>{error&&<p className="bw-error" role="alert">{error}</p>}</div></div>}
    {scoreboardOpen&&<div className="bw-big-board" role="dialog" aria-modal="true" aria-label="Full team scoreboard"><div className="bw-big-board-header"><div><small>ROUND {session.round} / {session.settings.rounds}</small><h2>TEAM SCORES</h2></div><button type="button" onClick={()=>setScoreboardOpen(false)}><X size={23}/> BACK TO LANE</button></div><div className="bw-big-board-grid">{session.teams.map(team=>{const eligible=available.includes(team.id)&&session.phase==='choose-team'&&audioReady;return <button type="button" key={team.id} disabled={!eligible} className={eligible?'bw-big-eligible':''} onClick={()=>{selectTeam(team.id);setScoreboardOpen(false);}}><BowlingBall skin={team.skin} size={47}/><span>{team.name}<small>{session.doneTeamIds.includes(team.id)?'DONE':eligible?'TAP TO BOWL':activeTeam?.id===team.id?'BOWLING NOW':''}</small></span><strong>{team.score+(preview[team.id]||0)}</strong></button>;})}</div></div>}
    {cardReveal&&<div className="bw-card-reveal" role="dialog" aria-modal="true" aria-label={`${CARD_META[cardReveal].name} Power-up`}><PowerCardArt type={cardReveal}/><div><span>POWER UP!</span><strong>{CARD_META[cardReveal].name}</strong><button type="button" className="bw-card-okay" onClick={()=>{const okay=cardAckRef.current;cardAckRef.current=null;okay?.();}}>OKAY</button></div></div>}
    {pendingSwap&&<div className="bw-modal-backdrop"><div className="bw-modal" role="dialog" aria-modal="true" aria-label="Choose a team to swap scores"><PowerCardArt type="swap-points" compact/><h2>Choose a team to swap with</h2><div className="bw-swap-choices">{session.teams.filter(team=>team.id!==activeTeam.id).map(team=><button type="button" key={team.id} onClick={()=>confirmSwap(team.id)}>{team.name}<b>{team.score}</b></button>)}</div><button type="button" onClick={()=>setPendingSwap(false)}>CANCEL</button></div></div>}
    {menu&&<div className="bw-modal-backdrop"><div className="bw-modal bw-options-modal" role="dialog" aria-modal="true" aria-label="Bowling options"><button className="bw-close" aria-label="Close options" onClick={()=>setMenu(false)}><X/></button><Settings2 size={39}/><h2>OPTIONS</h2><label>Music <b>{session.settings.musicVolume}%</b><input type="range" min="0" max="100" value={session.settings.musicVolume} onChange={e=>updateSound('musicVolume',+e.target.value)}/></label><label>Sounds <b>{session.settings.soundsVolume}%</b><input type="range" min="0" max="100" value={session.settings.soundsVolume} onChange={e=>updateSound('soundsVolume',+e.target.value)}/></label><button type="button" onClick={()=>updateSound('muted',!session.settings.muted)}>{session.settings.muted?<VolumeX/>:<Volume2/>}{session.settings.muted?' UNMUTE':' MUTE ALL'}</button><button type="button" onClick={()=>document.documentElement.requestFullscreen?.().catch(()=>{})}><Maximize2/> FULL SCREEN</button><button type="button" onClick={()=>{audio.pause();setMenu(false);setLabOpen(true);}}>ANIMATION PREVIEW</button><button type="button" onClick={()=>setNewConfirm(true)}><RotateCcw/> NEW GAME</button><button type="button" className="bw-primary" onClick={()=>setMenu(false)}>BACK TO GAME</button></div></div>}
    {newConfirm&&<div className="bw-modal-backdrop"><div className="bw-modal" role="dialog" aria-modal="true" aria-label="Start a new bowling game"><h2>Start a new game?</h2><p>Your current scores and progress will be replaced on this device.</p><div className="bw-modal-actions"><button onClick={()=>setNewConfirm(false)}>KEEP PLAYING</button><button className="bw-danger" onClick={clearForNew}>START NEW GAME</button></div></div></div>}
    {session.phase==='finished'&&<Winner session={session} celebrating={celebrating} onPlayAgain={()=>setNewConfirm(true)} onExit={()=>{audio.pause();onExit();}}/>}
    {error&&audioReady&&<div className="bw-error-toast" role="alert" onClick={()=>setError('')}>{error} <X size={16}/></div>}
  </div>;
}
