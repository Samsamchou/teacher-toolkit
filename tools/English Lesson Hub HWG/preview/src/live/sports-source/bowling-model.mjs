import {PIN_POSITIONS,zoneCenter,selectContactPins} from './bowling-motion.mjs';
export {PIN_POSITIONS} from './bowling-motion.mjs';
export const BOWLING_GAME = {
  id: 'bowling', name: 'Bowling Game', description: 'Roll, collect Power-ups, and light up the score!',
  url: '#bowling', order: 9, hidden: false, builtin: true,
};
export const BOWLING_STORAGE_KEY = 'classroom-club-bowling-v1';
export const BOWLING_THEMES = ['Classic','Spring','Summer','Fall','Winter'];
export const CARD_IDS = ['hit-or-miss', 'extra-shot', 'no-shot', 'lose-points', 'double-points', 'swap-points'];
export const CARD_META = {
  'hit-or-miss': {name:'Hit or Miss', zh:'全中或失投', symbol:'?!', color:'#19b951', dark:'#065f32'},
  'extra-shot': {name:'Extra Shot', zh:'增加五次投球', symbol:'+5', color:'#30a9e8', dark:'#075c9a'},
  'no-shot': {name:'No Shot', zh:'失去這次投球', symbol:'×', color:'#eb4e70', dark:'#821341'},
  'lose-points': {name:'Lose Points', zh:'扣除分數', symbol:'−', color:'#93c625', dark:'#536a0e'},
  'double-points': {name:'Double Points', zh:'目前分數加倍', symbol:'×2', color:'#f7b42e', dark:'#9b4d08'},
  'swap-points': {name:'Swap Points', zh:'交換兩組分數', symbol:'⇄', color:'#a865ea', dark:'#5917a0'},
};
export const BALL_SKINS = [
  ['Soccer','#ddd','#fff','soccer'],['Baseball','#eee','#fff','baseball'],
  ['Basketball','#e67915','#ffdc85','basketball'],['8 Ball','#19152e','#777','eight-ball'],
  ['Watermelon','#219444','#9ce55e','watermelon'],['Donut','#e84d95','#ffc8df','donut'],
  ['Pizza','#eaa226','#fff19b','pizza'],['Lightning','#512bc4','#9ecfff','lightning'],
  ['Fire','#dd431e','#ffde4f','fire'],['Stars','#662cb7','#ffe553','stars'],
  ['Flowers','#ec7eb4','#ffd7ad','flowers'],['Dragon Eye','#129571','#92efcb','dragon-eye'],
  ['Camouflage','#626d39','#cbc784','camouflage'],['Zebra','#34313b','#fff','zebra'],
  ['Swirl Candy','#f23562','#fff4dc','swirl-candy'],
];
export const LEGACY_SKIN_MAP=[7,6,0,8,4,5,0,14,9,2,11,3,1,5,11,6,7,10,0,10,4,12,13,9];
export function migrateBowlingSession(value){
  if(!validBowlingSession(value))return null;
  if(value.artVersion===2)return value;
  return {...value,artVersion:2,teams:value.teams.map(team=>({...team,
    skin:LEGACY_SKIN_MAP[team.skin]??0}))};
}

const bounded=(number,min,max)=>Math.min(max,Math.max(min,Number(number)||min));
const clone=value=>structuredClone(value);
export const zoneCountForTurn=turnIndex=>[5,4,3,2][Math.max(0,Number(turnIndex)||0)%4];
export const eligibleTeamIds=session=>session.teams.filter(team=>!session.doneTeamIds.includes(team.id)).map(team=>team.id);
export const winnerTeamIds=session=>{
  const best=Math.max(...session.teams.map(team=>team.score));
  return session.teams.filter(team=>team.score===best).map(team=>team.id);
};

export function normalizeSettings(input={}){
  const cards={};
  for(const id of CARD_IDS){
    const source=input.cards?.[id]||{};
    cards[id]={enabled:source.enabled!==false,weight:bounded(source.weight??100,0,100)};
  }
  return {
    theme:BOWLING_THEMES.includes(input.theme)?input.theme:'Classic',
    rounds:bounded(input.rounds??6,1,20),
    teamCount:bounded(input.teamCount??2,2,8),
    twoShots:input.twoShots!==false,
    fivePins:input.fivePins===true,
    powerups:input.powerups!==false,
    neverMiss:input.neverMiss===true,
    musicVolume:bounded(input.musicVolume??40,0,100),
    soundsVolume:bounded(input.soundsVolume??80,0,100),
    muted:input.muted===true,
    cards,
  };
}

export function createBowlingSession(input={}){
  const settings=normalizeSettings(input.settings);
  const teams=Array.from({length:settings.teamCount},(_,i)=>({
    id:`team-${i+1}`, name:String(input.teams?.[i]?.name||`Team ${i+1}`).trim().slice(0,26)||`Team ${i+1}`,
    skin:bounded(input.teams?.[i]?.skin??i,0,BALL_SKINS.length-1),score:0,powerups:0,
  }));
  return {version:1,artVersion:2,id:input.id||`bowling-${Date.now()}`,settings,teams,round:1,
    doneTeamIds:[],active:null,events:[],phase:'choose-team',finishedAt:null,createdAt:Date.now(),updatedAt:Date.now()};
}

export function startBowlingTurn(session,teamId,random=Math.random){
  if(session.phase!=='choose-team'||session.active||!eligibleTeamIds(session).includes(teamId))throw Error('This team is not available in the current round.');
  const next=clone(session);
  const zoneCount=zoneCountForTurn(next.events.filter(event=>event.type==='turn-end').length);
  const pinCount=next.settings.fivePins?5:10;
  const hasToken=next.settings.powerups&&random()<.7;
  next.active={teamId,zoneCount,tokenZone:hasToken?1+Math.floor(random()*zoneCount):null,
    remainingPins:Array.from({length:pinCount},(_,i)=>i),shotsUsed:0,bonusShots:0,turnScore:0};
  next.phase='aim';next.updatedAt=Date.now();return next;
}

export function drawBowlingCard(settings,random=Math.random){
  const available=CARD_IDS.filter(id=>settings.cards[id]?.enabled&&settings.cards[id]?.weight>0);
  const total=available.reduce((sum,id)=>sum+settings.cards[id].weight,0);
  if(!total)return null;
  let draw=random()*total;
  for(const id of available){draw-=settings.cards[id].weight;if(draw<0)return id;}
  return available.at(-1);
}

export function planNormalBowlingShot(session,zone,random=Math.random){
  const active=session.active;
  if(session.phase!=='aim'||!active)throw Error('No team is ready to bowl.');
  if(!Number.isInteger(zone)||zone<1||zone>active.zoneCount)throw Error('Choose a valid aim zone.');
  const count=active.remainingPins.length;
  const startX=zoneCenter(zone,active.zoneCount);
  const centrality=1-Math.abs((zone-.5)/active.zoneCount-.5)*2;
  const missChance=session.settings.neverMiss?0:.05;
  const strikeChance=.06+.15*centrality;
  const outcomeRoll=random();
  const knocked=outcomeRoll<missChance?0:outcomeRoll>1-strikeChance?count:
    Math.min(count,Math.max(1,Math.round(count*(.15+.73*random()))));
  const endX=knocked===0?(startX<.5?.31:.69):.5+(startX-.5)*.38+(random()-.5)*.13;
  const fallenPins=selectContactPins(active.remainingPins,knocked,endX,random);
  return {kind:'normal',zone,fallenPins,collectedToken:active.tokenZone===zone,
    trajectory:{startX,endX,bend:(random()-.5)*.22,variant:knocked===0?'gutter':endX<.47?'hook-left':endX>.53?'hook-right':'straight'},
    label:knocked===0?'MISS':knocked===count?(active.shotsUsed===0?'STRIKE!':'SPARE!'):`+${knocked}`};
}

export function planCardBowlingShot(session,cardId,targetTeamId=null,random=Math.random){
  if(session.phase!=='aim'||!session.active)throw Error('No team is ready to bowl.');
  const team=session.teams.find(item=>item.id===session.active.teamId);
  if(!team?.powerups||!CARD_IDS.includes(cardId)||!session.settings.cards[cardId]?.enabled)throw Error('This Power-up is not available.');
  if(cardId==='swap-points'&&(!targetTeamId||targetTeamId===team.id||!session.teams.some(item=>item.id===targetTeamId)))throw Error('Choose another team to swap with.');
  const amount=cardId==='lose-points'?(random()<.5?3:5):0;
  const hits=cardId==='hit-or-miss'&&random()<.5?[...session.active.remainingPins]:[];
  return {kind:'card',cardId,targetTeamId,amount,fallenPins:hits,collectedToken:false,
    trajectory:{startX:.5,endX:.5,bend:cardId==='swap-points'?.2:0,variant:'special'},
    label:cardId==='hit-or-miss'?(hits.length?'HIT!':'MISS!'):CARD_META[cardId].name.toUpperCase()};
}

export function commitBowlingShot(session,shotId,plan){
  if(session.events.some(event=>event.id===shotId))return session;
  if(session.phase!=='aim'||!session.active)throw Error('No pending bowling turn.');
  if(!shotId||!plan||!['normal','card'].includes(plan.kind))throw Error('Invalid shot.');
  const next=clone(session);
  const active=next.active;
  const team=next.teams.find(item=>item.id===active.teamId);
  const present=new Set(active.remainingPins);
  const fallen=[...new Set(plan.fallenPins||[])].filter(id=>present.has(id));
  let scoreDelta=fallen.length;
  active.remainingPins=active.remainingPins.filter(id=>!fallen.includes(id));
  if(plan.kind==='card'){
    if(!team.powerups)throw Error('Power-up was already used.');
    team.powerups--;
    if(plan.cardId==='extra-shot')active.bonusShots+=5;
    if(plan.cardId==='lose-points')scoreDelta-=Math.min(team.score+scoreDelta,plan.amount);
    if(plan.cardId==='double-points')scoreDelta+=team.score;
    if(plan.cardId==='swap-points'){
      const target=next.teams.find(item=>item.id===plan.targetTeamId);
      if(!target||target.id===team.id)throw Error('Invalid swap target.');
      const before=team.score;
      team.score=target.score;target.score=before;
      scoreDelta=0;
    }
  }
  if(plan.collectedToken){team.powerups++;active.tokenZone=null;}
  team.score+=scoreDelta;
  active.turnScore+=scoreDelta;
  active.shotsUsed++;
  next.events.push({id:shotId,type:'shot',round:next.round,teamId:team.id,kind:plan.kind,
    cardId:plan.cardId||null,fallenPins:fallen,scoreDelta,collectedToken:!!plan.collectedToken,
    targetTeamId:plan.targetTeamId||null,createdAt:Date.now()});
  const maxShots=(next.settings.twoShots?2:1)+active.bonusShots;
  const pinsCleared=active.remainingPins.length===0;
  const done=active.shotsUsed>=maxShots||(pinsCleared&&active.bonusShots===0);
  if(!done&&pinsCleared){
    const pinCount=next.settings.fivePins?5:10;
    active.remainingPins=Array.from({length:pinCount},(_,i)=>i);
  }
  if(done){
    next.doneTeamIds.push(team.id);
    next.events.push({id:`${shotId}-turn-end`,type:'turn-end',round:next.round,teamId:team.id,
      turnScore:active.turnScore,createdAt:Date.now()});
    next.active=null;
    if(next.doneTeamIds.length===next.teams.length){
      if(next.round>=next.settings.rounds){next.phase='finished';next.finishedAt=Date.now();}
      else{next.round++;next.doneTeamIds=[];next.phase='choose-team';}
    }else next.phase='choose-team';
  }
  next.updatedAt=Date.now();
  return next;
}

export function validBowlingSession(value){
  return value?.version===1&&Array.isArray(value.teams)&&value.teams.length>=2&&
    value.teams.length<=8&&Array.isArray(value.events)&&Array.isArray(value.doneTeamIds)&&
    ['choose-team','aim','finished'].includes(value.phase)&&value.settings?.rounds>=1;
}
