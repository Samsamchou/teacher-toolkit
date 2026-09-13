// Classroom adaptation. These published rules are not the reference game's source formula.
export const BASKETBALL_GAME={id:'basketball',name:'Animal Basketball',description:'Pick your animal. Take your shot. Make a comeback!',url:'#basketball',order:3,hidden:false,builtin:true};
export const ANIMALS=[
 {id:'cat',name:'Cat',zh:'貓',color:'#17bcb6',sheet:'cat-dog',row:0},
 {id:'dog',name:'Dog',zh:'狗',color:'#ff785d',sheet:'cat-dog',row:1},
 {id:'rabbit',name:'Rabbit',zh:'兔子',color:'#b59aff',sheet:'rabbit-panda',row:0},
 {id:'panda',name:'Panda',zh:'熊貓',color:'#ffce4b',sheet:'rabbit-panda',row:1},
 {id:'fox',name:'Fox',zh:'狐狸',color:'#b7ed54',sheet:'fox-penguin',row:0},
 {id:'penguin',name:'Penguin',zh:'企鵝',color:'#73d6ff',sheet:'fox-penguin',row:1}
];
export const BASE_ODDS={1:84,2:56,3:25,4:29};
export const RANGE_ODDS={1:78,2:57,3:44,4:29};
export const RULES={gapStep:3,maxAdjustment:15,focusBonus:12,minOdds:5,maxOdds:95};
export const STORAGE_KEY='club-animal-basketball-v1';
export const SHOT_MS=2500;
export function randomUnit(){return crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;}
export function createMatch(teams,totalRounds=6,powerups=true){
 if(!Array.isArray(teams)||teams.length<2||teams.length>6||new Set(teams.map(t=>t.animal)).size!==teams.length||teams.some(t=>!ANIMALS.some(a=>a.id===t.animal)||typeof t.name!=='string'||!t.name.trim()||t.name.trim().length>24))throw new Error('Choose 2–6 unique animals and name every team.');
 if(!Number.isInteger(totalRounds)||totalRounds<1||totalRounds>10)throw new Error('Choose 1–10 rounds.');
 return {version:2,teams:teams.map(t=>({name:t.name.trim(),animal:t.animal})),totalRounds,powerups:!!powerups,history:[],phase:'ready',activeTeam:null,boost:null,pending:null};
}
export const scores=s=>s.teams.map((_,i)=>s.history.filter(h=>h.team===i).reduce((n,h)=>n+h.points,0));
export const availableTeams=s=>s.teams.flatMap((_,i)=>s.history.some(h=>h.round===currentRound(s)&&h.team===i)?[]:[i]);
export const currentTeam=s=>s.activeTeam??availableTeams(s)[0]??0;
export const currentRound=s=>Math.min(s.totalRounds,Math.floor(s.history.length/s.teams.length)+1);
export const winners=s=>{const pts=scores(s),max=Math.max(...pts);return pts.flatMap((n,i)=>n===max?[i]:[]);};
export function adjustment(s){const pts=scores(s),i=currentTeam(s),others=pts.filter((_,j)=>j!==i),average=others.reduce((a,b)=>a+b,0)/others.length;return Math.max(-RULES.maxAdjustment,Math.min(RULES.maxAdjustment,Math.round((average-pts[i])*RULES.gapStep)));}
export function shotOptions(s){return (s.boost==='range'?[1,2,3,4]:[1,2,3]).map(points=>({points,odds:Math.max(RULES.minOdds,Math.min(RULES.maxOdds,(s.boost==='range'?RANGE_ODDS:BASE_ODDS)[points]+adjustment(s)+(s.boost==='focus'?RULES.focusBonus:0)))}));}
export function transition(s,a){
 if(!s)return s;
 if(a.type==='START'&&s.phase==='ready'){const team=a.team??availableTeams(s)[0];if(!availableTeams(s).includes(team))return s;return {...s,phase:'aim',activeTeam:team};}
 if(a.type==='BOOST'&&s.phase==='aim'&&s.powerups&&s.boost===null&&['focus','range'].includes(a.boost))return {...s,boost:a.boost};
 if(a.type==='SHOOT'&&s.phase==='aim'&&Number.isFinite(a.random)&&a.random>=0&&a.random<1){
  const option=shotOptions(s).find(o=>o.points===a.points);if(!option)return s;
  const hit=a.random<option.odds/100;
  return {...s,phase:'shooting',pending:{team:currentTeam(s),round:currentRound(s),shot:option.points,odds:option.odds,hit,points:hit?option.points:0,boost:s.boost,skipped:false}};
 }
 if(a.type==='RESOLVE'&&s.phase==='shooting'&&s.pending)return {...s,phase:'result',history:[...s.history,s.pending],pending:null};
 if(a.type==='SKIP'&&s.phase==='aim')return {...s,phase:'result',history:[...s.history,{team:currentTeam(s),round:currentRound(s),points:0,shot:0,odds:null,hit:false,boost:s.boost,skipped:true}],pending:null};
 if(a.type==='NEXT'&&s.phase==='result')return {...s,phase:s.history.length===s.totalRounds*s.teams.length?'finished':'ready',activeTeam:null,boost:null};
 if(a.type==='ADD_ROUNDS'&&s.phase==='finished'&&Number.isInteger(a.count)&&a.count>=1&&a.count<=10&&s.totalRounds+a.count<=100)return {...s,totalRounds:s.totalRounds+a.count,phase:'ready',activeTeam:null,boost:null};
 return s;
}
// Validate by replaying every stored turn; do not trust persisted totals or pending outcomes.
export function recoverMatch(raw){
 try{
  if(!raw||raw.version!==2||!Number.isInteger(raw.totalRounds)||raw.totalRounds<1||raw.totalRounds>100||!Array.isArray(raw.history)||raw.history.length>raw.totalRounds*raw.teams.length)return null;
  let s=createMatch(raw.teams,Math.min(raw.totalRounds,10),raw.powerups);s.totalRounds=raw.totalRounds;
  const replay=h=>{
   if(!h||!availableTeams(s).includes(h.team)||h.round!==currentRound(s))throw Error();
   s=transition(s,{type:'START',team:h.team});
   if(h.boost!==null){s=transition(s,{type:'START'});s=transition(s,{type:'BOOST',boost:h.boost});if(s.boost!==h.boost)throw Error();}
   if(h.skipped){if(h.points!==0||h.shot!==0||h.odds!==null||h.hit!==false)throw Error();s=transition(s,{type:'SKIP'});}
   else {s=transition(s,{type:'START'});const option=shotOptions(s).find(o=>o.points===h.shot);if(!option||option.odds!==h.odds||typeof h.hit!=='boolean'||h.points!==(h.hit?h.shot:0))throw Error();s=transition(s,{type:'SHOOT',points:h.shot,random:h.hit?0:.999999});s=transition(s,{type:'RESOLVE'});}
  };
  for(let i=0;i<raw.history.length;i++){replay(raw.history[i]);if(i<raw.history.length-1)s=transition(s,{type:'NEXT'});}
  if(raw.phase==='result'){if(!raw.history.length||raw.pending!==null||raw.activeTeam!==raw.history.at(-1).team)return null;return s;}
  if(raw.history.length)s=transition(s,{type:'NEXT'});
  if(raw.phase==='finished')return s.phase==='finished'&&raw.pending===null?s:null;
  if(s.phase==='finished')return null;
  if(!['ready','aim','shooting'].includes(raw.phase))return null;
  if(raw.phase==='shooting'){if(raw.activeTeam!==raw.pending?.team)return null;replay(raw.pending);return s;}
  if(raw.pending!==null)return null;
  if(raw.phase==='aim'){if(!availableTeams(s).includes(raw.activeTeam))return null;s=transition(s,{type:'START',team:raw.activeTeam});if(raw.boost!==null){s=transition(s,{type:'BOOST',boost:raw.boost});if(s.boost!==raw.boost)return null;}}
  else if(raw.boost!==null||raw.activeTeam!==null)return null;
  return s;
 }catch{return null;}
}
