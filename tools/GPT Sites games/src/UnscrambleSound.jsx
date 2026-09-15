import React,{useEffect,useRef,useState} from 'react';
import {createClassAudio} from './unscramble-audio.mjs';
import {readSaved,saveLocal} from './unscramble-api';
export function useClassSound(role,active=true){
 const key=`ul-sound:${role}`;
 const [settings,setSettings]=useState(()=>{const saved=readSaved(key,{});return {musicOn:typeof saved.musicOn==='boolean'?saved.musicOn:role==='teacher',musicVolume:Number.isFinite(saved.musicVolume)?Math.max(0,Math.min(1,saved.musicVolume)):.25,effectsVolume:Number.isFinite(saved.effectsVolume)?Math.max(0,Math.min(1,saved.effectsVolume)):.65,quiet:false};});
 const [ready,setReady]=useState(false),[visible,setVisible]=useState(!document.hidden),engine=useRef(null);
 useEffect(()=>{const audio=createClassAudio();engine.current=audio;let live=true;
  const wake=()=>audio.unlock().then(ok=>{if(live)setReady(ok);});
  const visibility=()=>setVisible(!document.hidden);
  document.addEventListener('pointerdown',wake);document.addEventListener('keydown',wake);document.addEventListener('visibilitychange',visibility);
  return()=>{live=false;document.removeEventListener('pointerdown',wake);document.removeEventListener('keydown',wake);document.removeEventListener('visibilitychange',visibility);audio.dispose();};
 },[]);
 useEffect(()=>{engine.current?.configure(settings,active&&visible);const {quiet,...saved}=settings;saveLocal(key,saved);},[settings,active,visible,key]);
 function change(patch){engine.current?.unlock().then(setReady);setSettings(s=>({...s,...patch}));}
 return {settings,ready,change,cue:value=>engine.current?.cue(value)};
}
export function SoundControls({sound,teacher=false}){
 const {settings,change,ready}=sound;
 return <div className="ul-sound-controls">
 {teacher&&<button className={`ul-quiet ${settings.quiet?'active':''}`} aria-pressed={settings.quiet} onClick={()=>change({quiet:!settings.quiet})}>{settings.quiet?'▶ 恢復音效':'◼ 講解靜音'}</button>}
 <details className="ul-sound-menu"><summary>♫ {teacher?'音效設定':'Sound'} <span>{settings.quiet?'Ⅱ':settings.musicOn?'♪':'○'}</span></summary>
 <div className="ul-sound-panel"><strong>{teacher?'課堂音效':'Classroom sound'}</strong>
 <button aria-label="Background music" aria-pressed={settings.musicOn} onClick={()=>change({musicOn:!settings.musicOn})}>{teacher?'背景音效':'Background'} · {settings.musicOn?'ON':'OFF'}</button>
 <label>{teacher?'背景音量':'Music volume'}<input aria-label="Music volume" type="range" min="0" max="100" value={Math.round(settings.musicVolume*100)} onChange={e=>change({musicVolume:Number(e.target.value)/100})}/></label>
 <label>{teacher?'答題音量':'Answer volume'}<input aria-label="Answer volume" type="range" min="0" max="100" value={Math.round(settings.effectsVolume*100)} onChange={e=>change({effectsVolume:Number(e.target.value)/100})}/></label>
 <button onClick={()=>{change({});setTimeout(()=>sound.cue(true),80);}}>{teacher?'試聽答對音效':'Try answer sound'}</button>
 <small>{settings.quiet?'講解中，全部音效暫停':ready?(settings.musicOn?'♪ Music ready':'Background off'):(teacher?'點一下畫面啟用音效':'Tap to enable sound')}</small></div></details></div>;
}
