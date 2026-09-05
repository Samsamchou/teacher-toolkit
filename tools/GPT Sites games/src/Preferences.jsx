import React from 'react';
import {sound} from './sound';
export function B({en,zh}){return <span className="bilingual"><span lang="en">{en}</span>{zh&&<span className="zh" lang="zh-Hant">{zh}</span>}</span>;}
export function readPreferences(){try{const p=JSON.parse(localStorage.getItem('club-preferences-v2')||'{}');return {scale:[1,1.15,1.3].includes(p.scale)?p.scale:1,muted:!!p.muted,reduced:typeof p.reduced==='boolean'?p.reduced:window.matchMedia('(prefers-reduced-motion: reduce)').matches,scratchVolume:Number.isFinite(p.scratchVolume)?Math.max(0,Math.min(1,p.scratchVolume)):.35,victoryVolume:Number.isFinite(p.victoryVolume)?Math.max(0,Math.min(1,p.victoryVolume)):.5};}catch{return {scale:1,muted:false,reduced:false,scratchVolume:.35,victoryVolume:.5};}}
export default function Preferences({value,onChange,onClose,english=false}){
 const label=(en,zh)=><B en={en} zh={english?'':zh}/>;
 return <div className="modal-backdrop"><section className="modal preferences" role="dialog" aria-modal="true" aria-label="Display and sound"><h2>{label('Make it classroom-ready','調整上課顯示與音效')}</h2>
 <label className="field-label">{label('Text size','文字大小')}<select aria-label="Text size" value={value.scale} onChange={e=>onChange({...value,scale:+e.target.value})}><option value="1">Large {english?'':'／大字'}</option><option value="1.15">Larger {english?'':'／加大'}</option><option value="1.3">Largest {english?'':'／最大'}</option></select></label>
 <label className="check-row"><input type="checkbox" checked={value.muted} onChange={e=>onChange({...value,muted:e.target.checked})}/>{label('Mute all sounds','全部靜音')}</label>
 {[['scratchVolume','Scratch sound','刮擦音效','scratch'],['victoryVolume','Victory sound','勝利音效','victory']].map(([key,en,zh,kind])=><div className="sound-setting" key={key}><label>{label(en,zh)}<span>{Math.round(value[key]*100)}%</span><input aria-label={en+' volume'} type="range" min="0" max="100" value={Math.round(value[key]*100)} onChange={e=>onChange({...value,[key]:+e.target.value/100})}/></label><button className="button secondary" disabled={value.muted} onClick={()=>sound.preview(kind)}>{label('Try sound','試聽')}</button></div>)}
 <label className="check-row"><input type="checkbox" checked={value.reduced} onChange={e=>onChange({...value,reduced:e.target.checked})}/>{label('Reduce motion','減少動態效果')}</label><p>{label('Four friends celebrate for 6 seconds. Skip whenever you like.','四個角色一起慶祝 6 秒，隨時可以跳過。')}</p><button autoFocus className="button primary" onClick={()=>{sound.stopAll();onClose();}}>{label('Ready!','設定完成')}</button></section></div>;
}
export const characterNames=['star','rainbow','monster','trophy'];
let mediaReady;
export function preloadCelebration(){return mediaReady??=Promise.all(characterNames.map(name=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(true);img.onerror=()=>{mediaReady=null;resolve(false);};img.src=`/celebration/${name}.png`;})));}
