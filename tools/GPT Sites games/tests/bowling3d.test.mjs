import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import RAPIER from '@dimforge/rapier3d-compat';
import {planShot,makeRng} from '../src/bowling3d/planner.mjs';
import {STEP} from '../src/bowling3d/physics.mjs';
import {createBowlingSession,startBowlingTurn,planNormalBowlingShot,commitBowlingShot} from '../src/bowling-model.mjs';

await RAPIER.init();
const table=JSON.parse(readFileSync(new URL('../src/bowling3d/shot-table.json',import.meta.url),'utf8'));
const plan=request=>planShot(RAPIER,{table,budgetMs:400,...request});

test('shot table covers every count for 10-pin and 5-pin racks',()=>{
  for(let count=1;count<=10;count++)assert.ok(table.ten[count].length>=6,`ten ${count}`);
  for(let count=1;count<=5;count++)assert.ok(table.five[count].length>=6,`five ${count}`);
});

test('the pin fall always equals the count chosen by the game rules',()=>{
  const rng=makeRng(20261126),cases=[];
  for(let i=0;i<24;i++){const size=i%4===3?5:10;cases.push({remaining:Array.from({length:size},(_,j)=>j),count:Math.floor(rng()*(size+1))});}
  for(let i=0;i<60;i++){
    const remaining=[0,1,2,3,4,5,6,7,8,9].filter(()=>rng()<.45);if(!remaining.length)remaining.push(6,9);
    cases.push({remaining,count:Math.floor(rng()*(remaining.length+1))});
  }
  cases.push({remaining:[6,9],count:2},{remaining:[6,9],count:1},{remaining:[0],count:1},{remaining:[3,5],count:2});
  for(const item of cases){
    const recording=plan({...item,startFraction:.19+.62*rng(),seed:Math.floor(rng()*1e9)});
    assert.equal(recording.fallen.length,item.count,JSON.stringify(item));
    assert.ok(recording.fallen.every(id=>item.remaining.includes(id)),'only standing pins can fall');
    assert.equal(recording.frames[0].length,7*(item.remaining.length+1));
    assert.ok(recording.duration>1&&recording.duration<7,'recording length is playable');
  }
});

test('the same request and seed replay identically',()=>{
  const request={remaining:[0,1,2,3,4,5,6,7,8,9],count:7,startFraction:.4,seed:99};
  const a=plan(request),b=plan(request);
  assert.deepEqual(a.fallen,b.fallen);assert.equal(a.frames.length,b.frames.length);
  assert.deepEqual([...a.frames.at(-1)],[...b.frames.at(-1)]);
});

test('a gutter ball touches no pins and reports when it drops',()=>{
  const recording=plan({remaining:[0,1,2,3,4,5,6,7,8,9],count:0,startFraction:.8,seed:5});
  assert.equal(recording.kind,'gutter');assert.equal(recording.impactAt,null);assert.equal(recording.contacts.length,0);
  assert.ok(recording.gutterAt>0&&recording.ballGoneAt>recording.gutterAt);
});

test('impact happens after the roll and before the recording ends',()=>{
  const recording=plan({remaining:[0,1,2,3,4,5,6,7,8,9],count:10,startFraction:.5,seed:3});
  assert.ok(recording.impactAt>recording.rollEnd&&recording.impactAt<recording.duration);
  assert.ok(Math.abs(recording.frames.length*STEP-recording.duration)<.1);
});

test('physics fall plugs into the existing scoring unchanged',()=>{
  let session=startBowlingTurn(createBowlingSession({settings:{teamCount:2,powerups:false}}),'team-1',()=>.5);
  const rules=planNormalBowlingShot(session,3,makeRng(8));
  const recording=plan({remaining:session.active.remainingPins,count:rules.fallenPins.length,startFraction:.5,seed:8});
  session=commitBowlingShot(session,'shot-a',{...rules,fallenPins:recording.fallen});
  assert.equal(session.teams[0].score,rules.fallenPins.length);
});

test('a power-card roll stops before the pins and moves none of them',async()=>{
  const {cardRollRecording}=await import('../src/bowling3d/planner.mjs');
  const {LANE}=await import('../src/bowling3d/physics.mjs');
  const stopZ=-LANE.length+1.6,recording=cardRollRecording([0,1,2,3,4,5,6,7,8,9],.3,{stopZ,speed:4.8});
  const first=recording.frames[0],last=recording.frames.at(-1);
  assert.equal(recording.kind,'card');assert.deepEqual(recording.fallen,[]);assert.equal(recording.contacts.length,0);
  assert.ok(Math.abs(last[2]-stopZ)<1e-6&&Math.abs(last[0])<1e-6,'ball ends on the centre line at the stop');
  assert.deepEqual([...first.slice(7)],[...last.slice(7)],'pins never move');
  assert.ok(Math.abs(recording.effectAt+stopZ/4.8)<1e-6);
});

test('Extra Shot gives two bonus rolls and shows +2',async()=>{
  const {EXTRA_SHOTS,CARD_META,planCardBowlingShot}=await import('../src/bowling-model.mjs');
  let session=startBowlingTurn(createBowlingSession({settings:{teamCount:2}}),'team-1',()=>.99);
  session.teams[0].powerups=1;
  session=commitBowlingShot(session,'card-a',planCardBowlingShot(session,'extra-shot'));
  assert.equal(EXTRA_SHOTS,2);assert.equal(session.active.bonusShots,2);assert.equal(CARD_META['extra-shot'].symbol,'+2');
});
