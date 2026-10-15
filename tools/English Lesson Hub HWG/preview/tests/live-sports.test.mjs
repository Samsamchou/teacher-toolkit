import test from 'node:test';
import assert from 'node:assert/strict';
import {startSport,advanceSport} from '../src/live/reward-sports.mjs';
import {playReward,finishReward,rewardView,REWARD_GAMES} from '../src/live/rewards.mjs';
import {createRoom,newBlock,joinRoom,controlRoom,submitRoom,validateDeck} from '../src/live/domain.mjs';

function fixture(game){
 const b=newBlock('cloud','q');const deck={id:'sports',title:'Sports',rewardGame:game,blocks:[b,newBlock('cloud','q2')]};
 validateDeck(deck);const room=createRoom(deck,'123456','teacher',1000);joinRoom(room,'student','50101',1001);controlRoom(room,'teacher','open',{revision:room.revision},1002);
 submitRoom(room,'student',{attemptId:'answer',answer:'hello',revision:room.revision,blockId:'q'},1003);return room;
}
const payload=(room,extra={})=>({turnId:'turn',walletVersion:rewardView(room,'student').version,revision:room.revision,blockId:room.deck.blocks[room.index].id,...extra});
test('five games validate; one sports start consumes exactly one opportunity',()=>{
 assert.equal(Object.keys(REWARD_GAMES).length,5);
 for(const game of ['bowling','worldpup']){const room=fixture(game);const input=payload(room);playReward(room,'student',input,1010,12);assert.equal(rewardView(room,'student').remaining,1);playReward(room,'student',input,1011,32);assert.equal(rewardView(room,'student').used,1);}
});
test('bowling continuation retries, forged points, finish guard and recovery',()=>{
 const room=fixture('bowling');playReward(room,'student',payload(room),1010,24);
 assert.throws(()=>finishReward(room,'student',{turnId:'turn',revision:room.revision},1011),/所有操作/);
 const input=payload(room,{actionId:'roll1',step:0,move:'roll',zone:3,points:99999});playReward(room,'student',input,1012,5);
 const first=structuredClone(room.rewards.student);playReward(room,'student',input,1013,82);assert.deepEqual(room.rewards.student,first);
 assert.throws(()=>playReward(room,'student',{...input,actionId:'stale'},1014,12),/更新/);
 let copy=JSON.parse(JSON.stringify(room));
 for(let i=1;!rewardView(copy,'student').pending.result.resolved;i++)playReward(copy,'student',payload(copy,{actionId:'roll'+(i+1),step:i,move:'roll',zone:1}),1020+i,i);
 assert.equal(rewardView(copy,'student').remaining,1);assert.ok(rewardView(copy,'student').score<=10);
 finishReward(copy,'student',{turnId:'turn',revision:copy.revision},1030);const version=rewardView(copy,'student').version;finishReward(copy,'student',{turnId:'turn',revision:copy.revision},1031);assert.equal(rewardView(copy,'student').version,version);
});
test('pause and changed revision reject sports continuation without mutation',()=>{
 const room=fixture('bowling');playReward(room,'student',payload(room),1010,5);const input=payload(room,{actionId:'roll',step:0,move:'roll',zone:1});const before=JSON.stringify(room.rewards);
 room.phase='paused';assert.throws(()=>playReward(room,'student',input,1011,9),/教師/);assert.equal(JSON.stringify(room.rewards),before);
 room.phase='question';room.revision++;assert.throws(()=>playReward(room,'student',input,1012,9),/教師/);
 assert.throws(()=>playReward(room,'teacher',input,1013,9),/學生/);
});
test('bowling keeps individual powerups, disables swap, preserves cards and floor',()=>{
 const seen=new Set();
 for(let seed=0;seed<200;seed++){
  const initial=startSport('bowling',{turnId:'x'},20,8,3,1);assert.equal(initial.session.active.zoneCount,2);assert.equal(initial.session.settings.cards['swap-points'].enabled,false);
  const next=advanceSport('bowling',initial,{move:'power',actionId:'p'},seed);seen.add(next.plan.cardId);
  assert.ok(next.session.teams[0].score>=0);assert.equal(next.session.teams.length,1);
  if(next.plan.cardId==='extra-shot')assert.equal(next.session.active.bonusShots,5);
  if(next.plan.cardId==='double-points')assert.equal(next.session.teams[0].score,16);
 }
 assert.deepEqual([...seen].sort(),['double-points','extra-shot','hit-or-miss','lose-points','no-shot'].sort());
});
test('soccer five special cards, normal dice, seeded shot, no negative balance',()=>{
 const seen=new Set();let goals=0,saves=0;
 for(let seed=0;seed<600;seed++){
  const r=startSport('worldpup',{countryCode:'TPE'},seed,3,seed);seen.add(r.cardId);assert.ok(r.points>=-3);assert.equal(r.layout,seed%6);
  if(!r.resolved){if(r.cardId==='normal')assert.ok(r.ballValue>=1&&r.ballValue<=6);
   const input={move:'kick',zone:2};const next=advanceSport('worldpup',r,input,seed+27);assert.deepEqual(next,advanceSport('worldpup',r,input,seed+27));
   assert.equal(next.points,next.shot.goal?r.ballValue:0);next.shot.goal?goals++:saves++;
   assert.throws(()=>advanceSport('worldpup',next,input,32),/完成/);
  }
 }
 assert.equal(seen.size,6);assert.ok(goals>0&&saves>0);
 assert.throws(()=>startSport('worldpup',{countryCode:'bad'},1,0),/球衣/);
 assert.throws(()=>startSport('bowling',{skin:99},1,0),/球皮/);
});
test('invalid moves do not consume a step or a further opportunity',()=>{
 const room=fixture('bowling');playReward(room,'student',payload(room),1010,20);const before=JSON.stringify(room.rewards);
 assert.throws(()=>playReward(room,'student',payload(room,{actionId:'bad',step:0,move:'roll',zone:99}),1011,5),/valid aim/);assert.equal(JSON.stringify(room.rewards),before);
 assert.throws(()=>playReward(room,'student',payload(room,{turnId:'missing',actionId:'orphan',move:'roll',step:0,zone:1}),1012,5),/找不到/);
});
