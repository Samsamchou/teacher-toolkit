import {cardById,dealCards,applyCard,CARD_LIMIT} from './plinkoh-cards.mjs';
export const PLINKOH_GAME={id:'plinkoh',name:'Plink-oh!',description:'Pick your team. Drop your ball. Watch the points bounce!',url:'#plinkoh',order:5,hidden:false,builtin:true};
export const STORAGE_KEY='classroom-plinkoh-v1';
export const DEFAULTS={count:2,rounds:6,zones:10,music:.28,sounds:.6,muted:false,names:[]};
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function rng(seed){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function settings(input={}){return {count:clamp(Math.trunc(Number(input.count)||2),2,15),rounds:clamp(Math.trunc(Number(input.rounds)||6),1,12),zones:input.zones===5?5:10,music:clamp(Number.isFinite(input.music)?input.music:.28,0,1),sounds:clamp(Number.isFinite(input.sounds)?input.sounds:.6,0,1),muted:!!input.muted,skins:Array.isArray(input.skins)&&input.skins.length===15&&new Set(input.skins).size===15&&input.skins.every(n=>Number.isInteger(n)&&n>=0&&n<15)?input.skins:Array.from({length:15},(_,i)=>i),names:Array.from({length:15},(_,i)=>String(input.names?.[i]||`Team ${i+1}`).trim().slice(0,24)||`Team ${i+1}`)};}
export function newGame(input={},seed=Date.now()){const cfg=settings(input);return {version:2,cardUses:Array(cfg.count).fill(0),cardTurn:null,celebrationDone:false,seed:seed>>>0,config:cfg,teams:Array.from({length:cfg.count},(_,i)=>({id:i,name:cfg.names[i],score:0,skin:cfg.skins[i]})),round:1,phase:'ROUND_INTRO',selected:null,completed:[],turn:0,history:[],result:null,zone:Math.ceil(cfg.zones/2)};}
export function turnSeed(s){return (s.seed+s.round*65537+(s.selected??0)*8191+s.turn*127)>>>0;}
export function dropId(s){return `${s.seed}-${s.round}-${s.selected}-${s.turn}${s.version===2?`-ball-${s.cardTurn?.attempt||0}`:''}`;}
export const cardsRemaining=(s,id=s.selected)=>s.version===2?Math.max(0,CARD_LIMIT-(s.cardUses?.[id]||0)):0;
const needsCard=s=>s.version===2&&cardsRemaining(s)>0&&!s.cardTurn?.decided;
const finish=s=>({...s,phase:'FINISHED',celebrationDone:false});
export function totalScore(hits,slot){if(!Number.isInteger(slot)||slot<0||!Array.isArray(hits))throw Error('Invalid score');const ids=new Set();let collision=0;for(const h of hits){if(ids.has(h.id)||!Number.isInteger(h.points)||h.points<0)throw Error('Invalid peg event');ids.add(h.id);collision+=h.points;}return {collision,slot,total:collision+slot};}
export function leaders(s){const max=Math.max(...s.teams.map(t=>t.score));return s.teams.filter(t=>t.score===max);}
export function reduce(s,a){
 switch(a.type){
 case 'INTRO_DONE':return s.phase==='ROUND_INTRO'?{...s,phase:'SELECT_TEAM'}:s.phase==='TEAM_INTRO'?{...s,phase:needsCard(s)?'CARD_PICK':'READY'}:s;
 case 'SELECT':{
  if(s.phase!=='SELECT_TEAM'||!s.teams.some(t=>t.id===a.id)||s.completed.includes(a.id))return s;
  const next={...s,selected:a.id,phase:'TEAM_INTRO',result:null};
  return s.version===2?{...next,cardTurn:{offer:cardsRemaining(s,a.id)>0?dealCards(rng(turnSeed(next)^0x5a31c47)):[],card:null,decided:cardsRemaining(s,a.id)===0,attempt:0,first:null}}:next;
 }
 case 'CARD_CHOOSE':{
  if(s.version!==2||s.phase!=='CARD_PICK'||cardsRemaining(s)===0||s.cardTurn?.decided)return s;
  if(a.card!==null&&!s.cardTurn.offer.includes(a.card))return s;
  return {...s,phase:'READY',cardTurn:{...s.cardTurn,card:a.card,decided:true}};
 }
 case 'ZONE':return s.phase==='READY'?{...s,zone:clamp(Math.trunc(a.zone)||1,1,s.config.zones)}:s;
 case 'DROP':return s.phase==='READY'&&s.selected!==null&&!needsCard(s)?{...s,phase:'DROPPING'}:s;
 case 'RETRY':return s.phase==='DROPPING'?{...s,phase:'READY',result:null}:s;
 case 'SETTLE':{
  if(s.phase!=='DROPPING'||a.id!==dropId(s)||s.history.some(h=>h.dropId===a.id))return s;
  const slots=Math.min(s.round+2,7);if(!Number.isInteger(a.slotIndex)||a.slotIndex<0||a.slotIndex>=slots||!Number.isInteger(a.slot)||a.slot<10||a.slot>slots*10||a.slot%10!==0)return s;
  const score=totalScore(a.hits,a.slot);const raw={...score,slotIndex:a.slotIndex,team:s.selected,dropId:a.id,hits:a.hits,events:a.events||[],round:s.round};
  const card=s.version===2?s.cardTurn?.card:null;
  if(card==='second-chance'&&s.cardTurn.attempt===0)return {...s,phase:'READY',result:null,cardTurn:{...s.cardTurn,first:raw,attempt:1}};
  const attempts=card==='second-chance'?[s.cardTurn.first,raw]:[raw];
  const best=attempts.reduce((best,attempt)=>attempt.total>best.total?attempt:best,attempts[0]);
  const result={...best,...applyCard(best,card),card:card||null,dropId:a.id,attempts,selectedAttempt:attempts.indexOf(best)+1};
  const cardUses=s.version===2?s.cardUses.map((n,i)=>i===s.selected&&card?Math.min(CARD_LIMIT,n+1):n):undefined;
  return {...s,...(cardUses?{cardUses}:{}),phase:'REVEAL',result,teams:s.teams.map(t=>t.id===s.selected?{...t,score:t.score+result.total}:t),completed:[...s.completed,s.selected],history:[...s.history,{type:'drop',...result}]};
 }
 case 'TRANSFER':return s.phase==='REVEAL'?{...s,phase:'TRANSFER'}:s;
 case 'TRANSFER_DONE':return s.phase==='TRANSFER'?{...s,phase:'TURN_DONE'}:s;
 case 'SKIP':return s.phase==='READY'?{...s,phase:'TURN_DONE',completed:[...s.completed,s.selected],history:[...s.history,{type:'skip',team:s.selected,round:s.round,unusedCard:s.cardTurn?.card||null}],result:null}:s;
 case 'NEXT':{
  if(s.phase!=='TURN_DONE')return s;
  if(s.completed.length===s.teams.length){if(s.round===s.config.rounds)return finish(s);return {...s,round:s.round+1,completed:[],selected:null,phase:'ROUND_INTRO',turn:s.turn+1,result:null};}
  return {...s,phase:'SELECT_TEAM',selected:null,turn:s.turn+1,result:null};
 }
 case 'ADJUST':{
  if(s.phase==='DROPPING'||!Number.isSafeInteger(a.delta)||!s.teams.some(t=>t.id===a.id)||Math.abs(a.delta)>999)return s;
  return {...s,teams:s.teams.map(t=>t.id===a.id?{...t,score:t.score+a.delta}:t),history:[...s.history,{type:'adjust',team:a.id,delta:a.delta,round:s.round,at:a.at||Date.now()}]};
 }
 case 'CONFIG':return s.phase==='DROPPING'?s:{...s,config:settings({...s.config,...a.patch,count:s.config.count,rounds:s.config.rounds,names:s.config.names}),zone:Math.min(s.zone,a.patch.zones||s.config.zones)};
 case 'END':return s.phase==='DROPPING'?s:finish(s);
 case 'CELEBRATION_DONE':return s.phase==='FINISHED'&&!s.celebrationDone?{...s,celebrationDone:true}:s;
 default:return s;
 }
}
export function restore(raw){
 try{const s=typeof raw==='string'?JSON.parse(raw):raw;if(!s||![1,2].includes(s.version)||!Number.isInteger(s.seed)||!Array.isArray(s.teams)||s.teams.length<2||s.teams.length>15||!Array.isArray(s.history)||!Array.isArray(s.completed))return null;
 const cfg=settings(s.config);if(s.teams.length!==cfg.count||!Number.isInteger(s.round)||s.round<1||s.round>cfg.rounds||!Number.isInteger(s.turn)||s.turn<0||s.teams.some((t,i)=>t.id!==i||typeof t.name!=='string'||!Number.isSafeInteger(t.score))||new Set(s.completed).size!==s.completed.length||s.completed.some(i=>!Number.isInteger(i)||i<0||i>=cfg.count)||!(s.selected===null||(Number.isInteger(s.selected)&&s.selected>=0&&s.selected<cfg.count)))return null;
 if(!['ROUND_INTRO','SELECT_TEAM','TEAM_INTRO','CARD_PICK','READY','DROPPING','REVEAL','TRANSFER','TURN_DONE','FINISHED'].includes(s.phase))return null;
 if(s.version===2){
  if(!Array.isArray(s.cardUses)||s.cardUses.length!==cfg.count||s.cardUses.some(n=>!Number.isInteger(n)||n<0||n>CARD_LIMIT))return null;
  const c=s.cardTurn;
  if(c){if(!Array.isArray(c.offer)||!(c.offer.length===0||c.offer.length===3)||new Set(c.offer).size!==c.offer.length||c.offer.some(id=>!cardById(id))||typeof c.decided!=='boolean'||![0,1].includes(c.attempt)||(c.card!==null&&!c.offer.includes(c.card)))return null;
   if(c.card&&!c.decided)return null;
   if(c.attempt===1&&(c.card!=='second-chance'||!c.first||!Number.isInteger(c.first.total)||c.first.total<0||!Array.isArray(c.first.hits)||c.first.total!==c.first.collision+c.first.slot))return null;
   if(c.attempt===0&&c.first!==null)return null;
  }
  if(['TEAM_INTRO','CARD_PICK','READY','DROPPING'].includes(s.phase)&&!c)return null;
  if(['READY','DROPPING'].includes(s.phase)&&(!c.decided||(c.card&&cardsRemaining(s)===0)))return null;
  if(s.phase==='CARD_PICK'&&(!needsCard(s)||c.offer.length!==3))return null;
 }else if(s.phase==='CARD_PICK')return null;
 let phase=s.phase;if(phase==='DROPPING')phase='READY';if(phase==='TEAM_INTRO')phase=needsCard(s)?'CARD_PICK':'READY';if(phase==='REVEAL'||phase==='TRANSFER')phase='TURN_DONE';
 if(['READY','CARD_PICK','TURN_DONE'].includes(phase)&&s.selected===null)return null;
 return {...s,config:cfg,phase,...(phase==='FINISHED'?{celebrationDone:true}:{}),zone:clamp(Math.trunc(s.zone)||1,1,cfg.zones)};
 }catch{return null;}
}
export function save(storage,state){try{storage.setItem(STORAGE_KEY,JSON.stringify(state));return true;}catch{return false;}}
