// All randomness belongs to this replayable match, never to animation timers.
export const WORLD_PUP_GAME = {id:'worldpup',kind:'worldpup',name:'World Pup Soccer',title:'World Pup Soccer',url:'#worldpup',order:11,hidden:false,builtin:true,description:'No questions. Pick a team and take the final shot!',teams:[],questions:[]};
export const CARDS = Object.fromEntries([
  ['normal','Match ball','Roll the dice, then shoot!',0,'#ffffff',50],
  ['win10','Win 10 Points','Score a goal to win 10 points!',10,'#ffd51c',4],
  ['win5','Win 5 Points','Score a goal to win 5 points!',5,'#dce5f5',16],
  ['miss','Miss Shot','The cheeky cat stops this shot!',0,'#a667ed',13],
  ['lose5','Lose 5 Points','Yellow card! Lose 5 points.',-5,'#ffdc00',13],
  ['lose10','Lose 10 Points','Red card! Lose 10 points.',-10,'#f32d3d',4],
].map(([id,name,description,points,color,weight])=>[id,{id,name,description,points,color,weight}]));
export const cardWeight=(id,version=2)=>version===1?({normal:60,win10:4,win5:12,miss:10,lose5:10,lose10:4}[id]):CARDS[id].weight;
const copy=x=>JSON.parse(JSON.stringify(x));
const spread=scores=>Math.max(...scores)-Math.min(...scores);
function random(s){let t=s.rng=(s.rng+0x6D2B79F5)>>>0;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}
const pick=(s,items)=>items[Math.floor(random(s)*items.length)];
export function createMatch({teams,rounds=6,seed}={}){
  if(!Array.isArray(teams)||teams.length<2||teams.length>8||!Number.isInteger(rounds)||rounds<1||rounds>20)throw new Error('Choose 2–8 teams and 1–20 rounds.');
  const clean=teams.map((t,i)=>({id:String(t.id??`team-${i+1}`),name:String(t.name??`Team ${i+1}`).trim().slice(0,36)||`Team ${i+1}`,countryCode:String(t.countryCode??'TPE')}));
  if(new Set(clean.map(t=>t.id)).size!==teams.length||clean.some(t=>!t.id||t.id.length>80||!(/^[A-Z]{3}$/.test(t.countryCode))))throw new Error('Invalid teams.');
  const initialSeed=Number.isInteger(seed)?seed>>>0:(globalThis.crypto?.getRandomValues(new Uint32Array(1))[0]??Math.floor(Math.random()*4294967296));
  return {version:2,config:{teams:clean,rounds,seed:initialSeed},teams:clean.map(t=>({...t,score:0})),round:1,rounds,doneTeamIds:[],history:[],active:null,phase:'choose-team',rng:initialSeed};
}
export const eligibleTeamIds=s=>s.phase==='finished'?[]:s.teams.filter(t=>!s.doneTeamIds.includes(t.id)).map(t=>t.id);
export const rankTeams=s=>[...s.teams].sort((a,b)=>b.score-a.score||s.teams.indexOf(a)-s.teams.indexOf(b));
function feasible(s,index,score){
  const scores=s.teams.map((t,i)=>i===index?score:t.score);
  const cap=s.round===s.rounds?4:s.round<=Math.ceil(s.rounds/2)?5:10;
  if(spread(scores)>cap)return false;
  if(s.round===s.rounds)return true;
  // Fixed scores must share a four-point band. Every remaining team can reach
  // that band using an ordinary ball, no goal, or a yellow card in any order.
  const fixed=scores.filter((_,i)=>i===index||s.doneTeamIds.includes(s.teams[i].id));
  for(let lo=Math.max(0,Math.max(...fixed)-4);lo<=Math.min(...fixed);lo++){
    if(s.teams.every((t,i)=>i===index||s.doneTeamIds.includes(t.id)||[0,1,2,3,4,5,6,-5].some(d=>{
      const target=Math.max(0,t.score+d);
      return target>=lo&&target<=lo+4&&spread(scores.map((x,j)=>j===i?target:x))<=cap;
    })))return true;
  }
  return false;
}
function choosePlan(s,teamId){
  const index=s.teams.findIndex(t=>t.id===teamId),team=s.teams[index];
  const remaining=eligibleTeamIds(s).length,finalRound=s.round===s.rounds;
  let choices=[];
  if(finalRound&&remaining===2){
    const points=Math.max(...s.teams.map(t=>t.score))+1-team.score;
    choices=[{cardId:'normal',points,allowGoal:true,allowMiss:false}];
  }else if(finalRound&&remaining===1){
    const gap=Math.max(...s.teams.filter(t=>t.id!==teamId).map(t=>t.score))-team.score;
    choices=[1,2,3,4,5,6].filter(p=>p>gap).map(points=>({cardId:'normal',points,allowGoal:true,allowMiss:true}));
    for(const cardId of ['win5','win10'])if(CARDS[cardId].points>gap)choices.push({cardId,points:CARDS[cardId].points,allowGoal:true,allowMiss:true});
  }else{
    for(const cardId of Object.keys(CARDS)){
      if(s.round<=Math.ceil(s.rounds/2)&&['win10','lose10'].includes(cardId))continue;
      for(const points of cardId==='normal'?[1,2,3,4,5,6]:[CARDS[cardId].points]){
        const automatic=points<0||cardId==='miss';
        const allowGoal=!automatic&&feasible(s,index,team.score+points);
        const allowMiss=feasible(s,index,automatic?Math.max(0,team.score+points):team.score);
        // Never offer a bonus ball whose goal is impossible under the score cap.
        if(cardId.startsWith('win')&&!allowGoal)continue;
        if(allowGoal||allowMiss)choices.push({cardId,points,allowGoal,allowMiss});
      }
    }
  }
  if(!choices.length)throw new Error('No legal shot; match invariant failed.');
  const ids=[...new Set(choices.map(c=>c.cardId))];
  let roll=random(s)*ids.reduce((n,id)=>n+cardWeight(id,s.version),0),cardId=ids.at(-1);
  for(const id of ids){roll-=cardWeight(id,s.version);if(roll<0){cardId=id;break;}}
  const plan=pick(s,choices.filter(c=>c.cardId===cardId));
  return {id:`${s.round}:${teamId}`,teamId,...plan,finalKick:finalRound&&remaining===1,keeperZone:1+Math.floor(random(s)*4),shot:null,result:null};
}
function commit(s,goal){
  const a=s.active,t=s.teams.find(t=>t.id===a.teamId);
  const delta=(a.points<0?Math.max(-t.score,a.points):goal?a.points:0)||0;
  t.score+=delta;a.result={delta,goal,scoreAfter:t.score};
  s.history.push({id:a.id,teamId:a.teamId,round:s.round,cardId:a.cardId,points:a.points,zone:a.shot?.zone??null,keeperZone:a.shot?.keeperZone??null,...a.result});
  s.doneTeamIds.push(a.teamId);s.phase='result';
}
export function transition(state,action){
  if(!state||!action)return state;
  const phase=state.phase;
  if(action.type==='CHOOSE_TEAM'&&(phase!=='choose-team'||!eligibleTeamIds(state).includes(action.teamId)))return state;
  if(action.type==='REVEAL'&&phase!=='reveal')return state;
  if(action.type==='KICK'&&(phase!=='aim'||!Number.isInteger(action.zone)||action.zone<1||action.zone>4))return state;
  if(action.type==='FINISH_SHOT'&&phase!=='flying')return state;
  if(action.type==='NEXT'&&phase!=='result')return state;
  if(!['CHOOSE_TEAM','REVEAL','KICK','FINISH_SHOT','NEXT'].includes(action.type))return state;
  const s=copy(state);
  if(action.type==='CHOOSE_TEAM'){s.active=choosePlan(s,action.teamId);s.phase='reveal';}
  if(action.type==='REVEAL'){
    if(s.active.points<0)commit(s,false);else s.phase='aim';
  }
  if(action.type==='KICK'){
    const a=s.active;let keeperZone=a.keeperZone;
    if(!a.allowGoal||a.cardId==='miss')keeperZone=action.zone;
    else if(!a.allowMiss&&keeperZone===action.zone)keeperZone=(action.zone%4)+1;
    a.shot={zone:action.zone,keeperZone,goal:a.cardId!=='miss'&&keeperZone!==action.zone};s.phase='flying';
  }
  if(action.type==='FINISH_SHOT')commit(s,s.active.shot.goal);
  if(action.type==='NEXT'){
    if(s.doneTeamIds.length===s.teams.length){
      if(s.round===s.rounds)s.phase='finished';
      else{s.round++;s.doneTeamIds=[];s.phase='choose-team';}
    }else s.phase='choose-team';
    s.active=null;
  }
  return s;
}
export function restoreMatch(raw){
  // Replay decisions from the original seed; saved scores are never authoritative.
  try{
    if(!raw||![1,2].includes(raw.version)||!Array.isArray(raw.history)||raw.history.length>160)return null;
    let s=createMatch(raw.config);s.version=raw.version;
    for(let i=0;i<raw.history.length;i++){
      const event=raw.history[i];
      s=transition(s,{type:'CHOOSE_TEAM',teamId:event.teamId});
      s=transition(s,{type:'REVEAL'});
      if(s.phase==='aim'){
        s=transition(s,{type:'KICK',zone:event.zone});
        s=transition(s,{type:'FINISH_SHOT'});
      }
      if(JSON.stringify(s.history[i])!==JSON.stringify(event))return null;
      if(i<raw.history.length-1||raw.phase!=='result')s=transition(s,{type:'NEXT'});
    }
    if(['reveal','aim','flying'].includes(raw.phase)){
      s=transition(s,{type:'CHOOSE_TEAM',teamId:raw.active?.teamId});
      if(raw.phase!=='reveal')s=transition(s,{type:'REVEAL'});
      if(raw.phase==='flying')s=transition(s,{type:'KICK',zone:raw.active?.shot?.zone});
    }
    return JSON.stringify(s)===JSON.stringify(raw)?s:null;
  }catch{return null;}
}
