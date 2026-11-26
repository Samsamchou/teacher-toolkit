import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {
  CARD_IDS, createBowlingSession, startBowlingTurn, planNormalBowlingShot,
  planCardBowlingShot, commitBowlingShot, eligibleTeamIds, winnerTeamIds,
  drawBowlingCard, normalizeSettings, validBowlingSession, zoneCountForTurn,
} from '../src/bowling-model.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const session=(patch={})=>createBowlingSession({settings:{rounds:2,teamCount:2,...patch}});
const direct=(s,id,pins,extras={})=>commitBowlingShot(s,id,{
  kind:'normal',fallenPins:pins,collectedToken:false,...extras,
});

test('teacher chooses each team once, scores each fallen pin, then advances the round',()=>{
  let game=startBowlingTurn(session(),'team-2',()=>1);
  assert.deepEqual(eligibleTeamIds(game),['team-1','team-2']);
  game=direct(game,'shot-1',[0,1,2,3,4,5,6,7]);
  assert.equal(game.teams[1].score,8);
  assert.equal(game.active.remainingPins.length,2);
  game=direct(game,'shot-2',[8,9]);
  assert.equal(game.teams[1].score,10);
  assert.equal(game.round,1);
  assert.deepEqual(eligibleTeamIds(game),['team-1']);
  assert.throws(()=>startBowlingTurn(game,'team-2'),/not available/);
  game=startBowlingTurn(game,'team-1',()=>1);
  game=direct(game,'shot-3',[0,1,2,3,4,5,6,7,8,9]);
  assert.equal(game.round,2);
  assert.deepEqual(eligibleTeamIds(game),['team-1','team-2']);
  assert.equal(zoneCountForTurn(4),5);
  assert.equal(zoneCountForTurn(1),4);
});

test('team count is limited to eight, including saved games',()=>{
  const game=createBowlingSession({settings:{teamCount:9}});
  assert.equal(game.teams.length,8);
  assert.equal(validBowlingSession(game),true);
  game.teams.push({id:'team-9',name:'Team 9',skin:8,score:0,powerups:0});
  assert.equal(validBowlingSession(game),false);
});

test('the last round finishes only after all groups bowl and handles a tie',()=>{
  let game=createBowlingSession({settings:{rounds:1,teamCount:2,twoShots:false}});
  game=startBowlingTurn(game,'team-2',()=>1);
  game=direct(game,'a',[0,1]);
  assert.equal(game.phase,'choose-team');
  game=startBowlingTurn(game,'team-1',()=>1);
  game=direct(game,'b',[0,1]);
  assert.equal(game.phase,'finished');
  assert.deepEqual(winnerTeamIds(game),['team-1','team-2']);
  assert.ok(game.finishedAt);
  assert.equal(validBowlingSession(JSON.parse(JSON.stringify(game))),true);
});

test('planned throws can miss, hook, strike, and collect a target token',()=>{
  let game=startBowlingTurn(session({neverMiss:false}),'team-1',()=>0);
  const miss=planNormalBowlingShot(game,1,()=>0);
  assert.equal(miss.fallenPins.length,0);
  assert.equal(miss.trajectory.variant,'gutter');
  assert.equal(miss.collectedToken,true);
  const hit=planNormalBowlingShot(game,1,()=>.999);
  assert.equal(hit.fallenPins.length,10);
  assert.equal(hit.label,'STRIKE!');
  game=direct(game,'token-shot',[],{collectedToken:true});
  assert.equal(game.teams[0].powerups,1);
  assert.equal(game.active.tokenZone,null);
  assert.equal(commitBowlingShot(game,'token-shot',miss),game);
});

test('all six Power-ups apply their distinct score and shot effects',()=>{
  const cases=[
    ['hit-or-miss',s=>{assert.equal(s.teams[0].score,20);assert.equal(s.active,null);}],
    ['extra-shot',s=>{assert.equal(s.teams[0].score,10);assert.equal(s.active.bonusShots,2);}],
    ['no-shot',s=>{assert.equal(s.teams[0].score,10);assert.equal(s.active.shotsUsed,1);}],
    ['lose-points',s=>{assert.equal(s.teams[0].score,7);}],
    ['double-points',s=>{assert.equal(s.teams[0].score,20);}],
    ['swap-points',s=>{assert.equal(s.teams[0].score,4);assert.equal(s.teams[1].score,10);}],
  ];
  for(const [cardId,verify] of cases){
    let game=startBowlingTurn(session(),'team-1',()=>1);
    game.teams[0].score=10;game.teams[1].score=4;game.teams[0].powerups=1;
    const plan=planCardBowlingShot(game,cardId,cardId==='swap-points'?'team-2':null,()=>0);
    assert.equal(plan.cardId,cardId);
    game=commitBowlingShot(game,`card-${cardId}`,plan);
    assert.equal(game.teams[0].powerups,0);
    verify(game);
  }
  assert.equal(CARD_IDS.length,6);
});

test('card settings can exclude one card and the draw respects it',()=>{
  const cards=Object.fromEntries(CARD_IDS.map(id=>[id,{enabled:id==='swap-points',weight:100}]));
  assert.equal(drawBowlingCard(normalizeSettings({cards}),()=>.3),'swap-points');
  assert.equal(drawBowlingCard(normalizeSettings({cards:Object.fromEntries(CARD_IDS.map(id=>[id,{enabled:false,weight:100}]))})),null);
});

test('teacher-selected audio set is complete, unmodified, and Winner cue lasts five seconds',()=>{
  const directory=path.join(root,'public','bowling','audio');
  const manifest=JSON.parse(readFileSync(path.join(directory,'manifest.json'),'utf8'));
  assert.equal(manifest.assets.length,32);
  const names=new Set(manifest.assets.map(asset=>asset.name));
  for(const asset of manifest.assets){
    const data=readFileSync(path.join(directory,asset.file));
    assert.equal(createHash('sha256').update(data).digest('hex'),asset.sha256,asset.name);
  }
  for(const cue of ['roll_b','pins_8_score_b','spare_b','swap_points_b','miss_b','winner','strike','score',
    'card_hit_or_miss','card_extra_shot','card_no_shot','card_lose_points','card_double_points'])assert.ok(names.has(cue),cue);
  const winner=readFileSync(path.join(directory,'winner.wav'));
  assert.equal(winner.toString('ascii',0,4),'RIFF');
  const sampleRate=winner.readUInt32LE(24),bytesPerSecond=winner.readUInt32LE(28);
  assert.equal(sampleRate,32000);
  assert.equal((winner.length-44)/bytesPerSecond,5);
});
