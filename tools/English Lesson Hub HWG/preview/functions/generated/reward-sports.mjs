// Single-player adapter. Original games remain untouched in sports-source.
import {rng} from './reward-random.mjs';
import {createBowlingSession,startBowlingTurn,planNormalBowlingShot,planCardBowlingShot,commitBowlingShot,drawBowlingCard} from './sports-source/bowling-model.mjs';
import {CARDS} from './sports-source/worldpup-model.mjs';
import {COUNTRIES} from './sports-source/worldpup-countries.mjs';
export const isSport = game => ['bowling','worldpup'].includes(game);
const fail = message => {throw Error(message);};
export function startSport(game,input,seed,baseScore,ordinal=0,powerups=0) {
  const random=rng(seed);
  if(game==='bowling'){
    const skin=Number(input.skin??0);
    if(!Number.isInteger(skin)||skin<0||skin>14)fail('請選擇有效球皮。');
    let session=createBowlingSession({id:input.turnId,settings:{rounds:1,twoShots:true,cards:{'swap-points':{enabled:false}}},teams:[{name:'You',skin}]});
    session.teams=session.teams.slice(0,1);
    session.teams[0].score=baseScore;session.teams[0].powerups=powerups;
    session=startBowlingTurn(session,session.teams[0].id,random);
    session.active.zoneCount=[5,4,3,2][ordinal%4];
    if(session.active.tokenZone)session.active.tokenZone=1+Math.floor(random()*session.active.zoneCount);
    return {session,baseScore,points:0,resolved:false,step:0,skin};
  }
  const countryCode=input.countryCode??'TPE';
  if(!COUNTRIES.some(c=>c.code===countryCode))fail('請選擇有效球衣。');
  let draw=random()*100,card=Object.values(CARDS).at(-1);
  for(const c of Object.values(CARDS)){draw-=c.weight;if(draw<0){card=c;break;}}
  const ballValue=card.id==='normal'?1+Math.floor(random()*6):Math.max(0,card.points);
  const resolved=['miss','lose5','lose10'].includes(card.id);
  return {baseScore,points:resolved?Math.max(-baseScore,card.points):0,resolved,step:0,countryCode,cardId:card.id,ballValue,layout:ordinal%6};
}
export function advanceSport(game,previous,input,seed){
  if(previous.resolved)fail('本回合已完成。');
  const r=structuredClone(previous), random=rng(seed);
  if(game==='bowling'){
    const session=r.session;
    let plan;
    if(input.move==='power'){
      if(!session.teams[0].powerups)fail('尚未取得 Power-up。');
      plan=planCardBowlingShot(session,drawBowlingCard(session.settings,random),null,random);
    }else if(input.move==='roll')plan=planNormalBowlingShot(session,Number(input.zone),random);
    else fail('請選擇投球或 Power-up。');
    r.beforePins=[...session.active.remainingPins];
    r.plan=plan;
    r.session=commitBowlingShot(session,input.actionId,plan);
    r.points=r.session.teams[0].score-r.baseScore;
    r.resolved=r.session.phase==='finished';
  }else{
    const zone=Number(input.zone);
    if(input.move!=='kick'||!Number.isInteger(zone)||zone<1||zone>4)fail('請選擇射門區 1–4。');
    const keeperZone=1+Math.floor(random()*4),goal=keeperZone!==zone;
    r.shot={zone,keeperZone,goal};r.points=goal?r.ballValue:0;r.resolved=true;
  }
  r.step++;
  return r;
}
