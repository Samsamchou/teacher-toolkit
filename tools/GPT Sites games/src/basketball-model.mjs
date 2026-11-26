// Classroom adaptation. These published rules are not the reference game's source formula.
// Version 3 (2026-11-26): the free Focus / Long Shot boosts are replaced by six draw-a-card power-ups.
export const BASKETBALL_GAME={id:'basketball',name:'Animal Basketball',description:'Pick your animal. Take your shot. Make a comeback!',url:'#basketball',order:3,hidden:false,builtin:true};
export const ANIMALS=[
 {id:'cat',name:'Cat',zh:'貓',color:'#17bcb6',sheet:'cat-dog',row:0},
 {id:'dog',name:'Dog',zh:'狗',color:'#ff785d',sheet:'cat-dog',row:1},
 {id:'rabbit',name:'Rabbit',zh:'兔子',color:'#b59aff',sheet:'rabbit-panda',row:0},
 {id:'panda',name:'Panda',zh:'熊貓',color:'#ffce4b',sheet:'rabbit-panda',row:1},
 {id:'fox',name:'Fox',zh:'狐狸',color:'#b7ed54',sheet:'fox-penguin',row:0},
 {id:'penguin',name:'Penguin',zh:'企鵝',color:'#73d6ff',sheet:'fox-penguin',row:1}
];
export const BASE_ODDS={1:84,2:56,3:25};
// tokenChance: how often a "+1" card token appears on one shot value at the start of a turn.
export const RULES={gapStep:3,maxAdjustment:15,minOdds:5,maxOdds:95,tokenChance:.7,maxCards:2,extraShots:2,stealPoints:2,dunkPoints:3,hitOrMissPoints:4};
export const CARD_IDS=['extra-shot','double-points','swap-points','slam-dunk','steal','hit-or-miss'];
export const CARD_META={
 'extra-shot':{name:'Extra Shot',zh:'本回合多投兩球',symbol:`+${RULES.extraShots}`,color:'#30a9e8',dark:'#075c9a'},
 'double-points':{name:'Double Points',zh:'目前總分加倍',symbol:'×2',color:'#f7b42e',dark:'#9b4d08'},
 'swap-points':{name:'Swap Points',zh:'和另一組交換總分',symbol:'⇄',color:'#a865ea',dark:'#5917a0'},
 'slam-dunk':{name:'Slam Dunk',zh:'灌籃必進，得三分',symbol:'DUNK',color:'#ff6a1f',dark:'#8f2a05'},
 'steal':{name:'Steal',zh:'從最高分的另一組偷兩分',symbol:'⇠2',color:'#22b8a7',dark:'#0b5f57'},
 'hit-or-miss':{name:'Hit or Miss',zh:'一半機會進球得四分',symbol:'?!',color:'#19b951',dark:'#065f32'},
};
export const STORAGE_KEY='club-animal-basketball-v1';
export const SHOT_MS=2500;
export function randomUnit(){return crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;}
const whole=(value,min,max)=>Math.min(max,Math.max(min,Math.round(Number(value))||0));
/** Which cards can be drawn, and their relative chances (0–100). */
export function normalizeCards(input={}){
 return Object.fromEntries(CARD_IDS.map(id=>[id,{enabled:input?.[id]?.enabled!==false,weight:whole(input?.[id]?.weight??100,0,100)}]));
}
export function createMatch(teams,totalRounds=6,powerups=true,cards){
 if(!Array.isArray(teams)||teams.length<2||teams.length>6||new Set(teams.map(t=>t.animal)).size!==teams.length||teams.some(t=>!ANIMALS.some(a=>a.id===t.animal)||typeof t.name!=='string'||!t.name.trim()||t.name.trim().length>24))throw new Error('Choose 2–6 unique animals and name every team.');
 if(!Number.isInteger(totalRounds)||totalRounds<1||totalRounds>10)throw new Error('Choose 1–10 rounds.');
 return {version:3,teams:teams.map(t=>({name:t.name.trim(),animal:t.animal})),totalRounds,powerups:!!powerups,cards:normalizeCards(cards),history:[],phase:'ready',activeTeam:null,offer:null,bonus:null,pending:null};
}
// A team's total is its own points plus anything a Swap or Steal moved to or from it.
export const scores=s=>s.teams.map((_,i)=>s.history.reduce((n,h)=>n+(h.team===i?h.points:0)+(h.target===i?h.transfer:0),0));
// Extra Shot bonus shots belong to the same turn, so they do not count toward the round.
const turns=s=>s.history.filter(h=>!h.extra);
export const turnsPlayed=s=>turns(s).length;
export const availableTeams=s=>s.teams.flatMap((_,i)=>turns(s).some(h=>h.round===currentRound(s)&&h.team===i)?[]:[i]);
export const currentTeam=s=>s.activeTeam??availableTeams(s)[0]??0;
export const currentRound=s=>Math.min(s.totalRounds,Math.floor(turns(s).length/s.teams.length)+1);
export const winners=s=>{const pts=scores(s),max=Math.max(...pts);return pts.flatMap((n,i)=>n===max?[i]:[]);};
export const matchComplete=s=>turns(s).length===s.totalRounds*s.teams.length&&!s.bonus?.left;
/** Cards a team is holding: one per collected "+1" token, minus the ones already played. */
export const heldCards=(s,team)=>s.history.reduce((n,h)=>n+(h.team===team?(h.token?1:0)-(h.card?1:0):0),0);
export function adjustment(s){const pts=scores(s),i=currentTeam(s),others=pts.filter((_,j)=>j!==i),average=others.reduce((a,b)=>a+b,0)/others.length;return Math.max(-RULES.maxAdjustment,Math.min(RULES.maxAdjustment,Math.round((average-pts[i])*RULES.gapStep)));}
export function shotOptions(s){return [1,2,3].map(points=>({points,odds:Math.max(RULES.minOdds,Math.min(RULES.maxOdds,BASE_ODDS[points]+adjustment(s)))}));}
/** The shot value that carries a "+1" token for this turn, or null. tokenRoll and valueRoll are random units. */
export function rollOffer(s,team,tokenRoll,valueRoll){
 return s.powerups&&heldCards(s,team)<RULES.maxCards&&tokenRoll<RULES.tokenChance?1+Math.min(2,Math.floor(valueRoll*3)):null;
}
/** Picks one enabled card by weight; null when every card is switched off. */
export function drawCard(cards,random){
 const pool=CARD_IDS.filter(id=>cards?.[id]?.enabled&&cards[id].weight>0),total=pool.reduce((sum,id)=>sum+cards[id].weight,0);
 if(!total)return null;
 let roll=random*total;for(const id of pool){roll-=cards[id].weight;if(roll<0)return id;}
 return pool.at(-1);
}
/** Teams the Steal card may take from: every other team tied for the highest score. */
export function stealTargets(s,team=currentTeam(s)){
 const pts=scores(s),best=Math.max(...pts.filter((_,i)=>i!==team));
 return pts.flatMap((n,i)=>i!==team&&n===best?[i]:[]);
}
const canPlayCard=s=>s.phase==='aim'&&s.powerups&&!s.bonus&&heldCards(s,currentTeam(s))>0;
export const cardReady=canPlayCard;
function cardEntry(s,a){
 const team=currentTeam(s),pts=scores(s),id=a.card,base={team,round:currentRound(s),shot:0,odds:null,hit:false,points:0,skipped:false,extra:false,offer:s.offer,token:false,card:id,target:null,transfer:0};
 if(!CARD_IDS.includes(id)||!s.cards[id]?.enabled)return null;
 if(id==='extra-shot')return base;
 if(id==='double-points')return {...base,points:pts[team]};
 if(id==='slam-dunk')return {...base,shot:RULES.dunkPoints,hit:true,points:RULES.dunkPoints};
 if(id==='hit-or-miss'){
  if(!Number.isFinite(a.random)||a.random<0||a.random>=1)return null;
  const hit=a.random<.5;return {...base,shot:RULES.hitOrMissPoints,odds:50,hit,points:hit?RULES.hitOrMissPoints:0};
 }
 if(id==='swap-points'){
  const target=s.teams.length===2?1-team:a.target;
  if(!Number.isInteger(target)||target===team||!s.teams[target])return null;
  return {...base,target,points:pts[target]-pts[team],transfer:pts[team]-pts[target]};
 }
 const options=stealTargets(s,team),target=options.length===1?options[0]:a.target; // steal
 if(!options.includes(target))return null;
 const amount=Math.min(RULES.stealPoints,pts[target]);
 return {...base,target,points:amount,transfer:-amount};
}
export function transition(s,a){
 if(!s)return s;
 if(a.type==='START'&&s.phase==='ready'){
  const team=a.team??availableTeams(s)[0];if(!availableTeams(s).includes(team))return s;
  const offer=[1,2,3].includes(a.offer)&&s.powerups&&heldCards(s,team)<RULES.maxCards?a.offer:null;
  return {...s,phase:'aim',activeTeam:team,offer};
 }
 if(a.type==='SHOOT'&&s.phase==='aim'&&Number.isFinite(a.random)&&a.random>=0&&a.random<1){
  const option=shotOptions(s).find(o=>o.points===a.points);if(!option)return s;
  const hit=a.random<option.odds/100,extra=!!s.bonus;
  return {...s,phase:'shooting',pending:{team:currentTeam(s),round:extra?s.bonus.round:currentRound(s),shot:option.points,odds:option.odds,hit,points:hit?option.points:0,skipped:false,
   extra,offer:extra?null:s.offer,token:!extra&&s.offer===option.points,card:null,target:null,transfer:0}};
 }
 if(a.type==='USE_CARD'&&canPlayCard(s)){const entry=cardEntry(s,a);return entry?{...s,phase:'shooting',pending:entry}:s;}
 if(a.type==='RESOLVE'&&s.phase==='shooting'&&s.pending){
  const done=s.pending,bonus=done.card==='extra-shot'?{left:RULES.extraShots,round:done.round}:done.extra?{...s.bonus,left:s.bonus.left-1}:s.bonus;
  return {...s,phase:'result',history:[...s.history,done],pending:null,bonus};
 }
 if(a.type==='SKIP'&&s.phase==='aim'){
  const extra=!!s.bonus;
  return {...s,phase:'result',history:[...s.history,{team:currentTeam(s),round:extra?s.bonus.round:currentRound(s),shot:0,odds:null,hit:false,points:0,skipped:true,extra,offer:extra?null:s.offer,token:false,card:null,target:null,transfer:0}],
   pending:null,bonus:extra?{...s.bonus,left:s.bonus.left-1}:s.bonus};
 }
 if(a.type==='NEXT'&&s.phase==='result'){
  if(s.bonus?.left>0)return {...s,phase:'aim',offer:null}; // same team shoots its bonus shots
  const cleared={...s,bonus:null,offer:null,activeTeam:null};
  return {...cleared,phase:matchComplete(cleared)?'finished':'ready'};
 }
 if(a.type==='ADD_ROUNDS'&&s.phase==='finished'&&Number.isInteger(a.count)&&a.count>=1&&a.count<=10&&s.totalRounds+a.count<=100)return {...s,totalRounds:s.totalRounds+a.count,phase:'ready',activeTeam:null,offer:null,bonus:null};
 return s;
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// Validate by replaying every stored turn; do not trust persisted totals or pending outcomes.
// Matches saved by version 2 (with boosts) cannot be continued and return null.
export function recoverMatch(raw){
 try{
  if(!raw||raw.version!==3||!Number.isInteger(raw.totalRounds)||raw.totalRounds<1||raw.totalRounds>100||!Array.isArray(raw.history)||raw.history.length>raw.totalRounds*raw.teams.length*(1+RULES.extraShots))return null;
  let s=createMatch(raw.teams,Math.min(raw.totalRounds,10),raw.powerups,raw.cards);s.totalRounds=raw.totalRounds;
  // Re-plays one stored entry up to the moment it is in the air; the result must be identical to what was stored.
  const launch=h=>{
   if(!h||typeof h.hit!=='boolean')throw Error();
   if(h.extra){if(s.phase!=='aim'||!s.bonus||s.activeTeam!==h.team)throw Error();}
   else{if(s.phase!=='ready')throw Error();s=transition(s,{type:'START',team:h.team,offer:h.offer});if(s.phase!=='aim'||s.offer!==(h.offer??null))throw Error();}
   if(h.skipped){s=transition(s,{type:'SKIP'});if(!same(s.history.at(-1),h))throw Error();return;}
   s=transition(s,h.card?{type:'USE_CARD',card:h.card,random:h.hit?0:.75,target:h.target}:{type:'SHOOT',points:h.shot,random:h.hit?0:.999999});
   if(s.phase!=='shooting'||!same(s.pending,h))throw Error();
  };
  const replay=h=>{launch(h);if(!h.skipped)s=transition(s,{type:'RESOLVE'});};
  for(let i=0;i<raw.history.length;i++){replay(raw.history[i]);if(i<raw.history.length-1)s=transition(s,{type:'NEXT'});}
  if(raw.phase==='result'){if(!raw.history.length||raw.pending!==null||raw.activeTeam!==raw.history.at(-1).team)return null;return s;}
  if(raw.history.length)s=transition(s,{type:'NEXT'});
  if(raw.phase==='finished')return s.phase==='finished'&&raw.pending===null?s:null;
  if(s.phase==='finished')return null;
  if(!['ready','aim','shooting'].includes(raw.phase))return null;
  if(raw.phase==='shooting'){if(raw.activeTeam!==raw.pending?.team)return null;launch(raw.pending);return s;}
  if(raw.pending!==null)return null;
  if(raw.phase==='aim'){
   if(s.phase==='aim')return raw.activeTeam===s.activeTeam?s:null; // waiting for an Extra Shot bonus shot
   if(!availableTeams(s).includes(raw.activeTeam))return null;
   s=transition(s,{type:'START',team:raw.activeTeam,offer:raw.offer});if(s.offer!==(raw.offer??null))return null;
  }else if(s.phase!=='ready'||raw.activeTeam!==null)return null;
  return s;
 }catch{return null;}
}
