import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,advance,shuffleTasks,SECTORS,DAYS,scores,rounds,winners,SPIN_MS,CELEBRATE_MS} from '../src/spin-model.mjs';
import {validateManifest} from '../src/model.mjs';
const selectedGame=count=>advance(createGame(count),{type:'SELECT_TEAM',team:0});
const bag=[0,1,2,3,4,5,6,7];
function toRoll(s,i=0){if(s.team===null)s=advance(s,{type:'SELECT_TEAM',team:i%s.count});for(const a of [{type:'SPIN',sector:i%8,question:i%7},{type:'STOP_SPIN'},{type:'RIGHT',bag},{type:'GOOD'},{type:'ROLL',value:i%6+1}])s=advance(s,a);return s;}
test('all 2–6 team matches complete six turns each and score exactly once',()=>{for(let count=2;count<=6;count++){let s=createGame(count);for(let i=0;i<count*6;i++){s=advance(s,{type:'SELECT_TEAM',team:i%count});assert.equal(s.team,i%count);s=toRoll(s,i);s=advance(s,{type:'STOP_ROLL'});const expected=s;s=advance(s,{type:'STOP_ROLL'});assert.equal(s,expected);s=advance(s,{type:'NEXT'});}assert.equal(s.phase,'finished');assert.equal(s.history.length,count*6);for(let t=0;t<count;t++)assert.equal(rounds(s,t),6);assert.equal(scores(s).reduce((a,b)=>a+b),s.history.reduce((a,h)=>a+h.points,0));assert.equal(advance(s,{type:'SPIN',sector:0,question:0}),s);}});
test('all sector centers match fixed artwork and two Sunday sectors',()=>{assert.equal(SECTORS.filter(x=>x===0).length,2);for(let sector=0;sector<8;sector++){let s=selectedGame(2);s=advance(s,{type:'SPIN',sector,question:6});assert.equal(s.angle%360,sector*45+22.5);assert.equal(s.phase,'spinning');assert.equal(advance(s,{type:'SPIN',sector:0,question:0}),s);assert.equal(DAYS[s.question],'Saturday');}assert.equal(SPIN_MS,6000);assert.equal(CELEBRATE_MS,8000);});
test('retry and premature actions preserve question, task, score and turn',()=>{let s=advance(selectedGame(2),{type:'SPIN',sector:1,question:2});s=advance(s,{type:'STOP_SPIN'});assert.equal(advance(s,{type:'RETRY'}),s);assert.equal(advance(s,{type:'GOOD'}),s);s=advance(s,{type:'RIGHT',bag});assert.equal(advance(s,{type:'RIGHT',bag}),s);assert.equal(advance(s,{type:'RETRY'}),s);assert.deepEqual(scores(s),[0,0]);assert.equal(s.team,0);});
test('task bag exhausts once before reuse across teams',()=>{let s=selectedGame(3),seen=[];for(let i=0;i<18;i++){s=toRoll(s,i);seen.push(s.task);s=advance(s,{type:'STOP_ROLL'});s=advance(s,{type:'NEXT'});}assert.deepEqual(seen.slice(0,8),bag);assert.deepEqual(seen.slice(8,16),bag);for(let i=0;i<100;i++)assert.deepEqual([...shuffleTasks()].sort(),bag);});
test('ending during roll discards it and rejects delayed timer award',()=>{let s=toRoll(selectedGame(2),5);s=advance(s,{type:'STOP_ROLL'});s=advance(s,{type:'NEXT'});s=advance(s,{type:'SELECT_TEAM',team:1});s=toRoll(s,4);s=advance(s,{type:'END'});assert.deepEqual(scores(s),[6,0]);assert.equal(rounds(s,0),1);assert.equal(rounds(s,1),0);assert.equal(advance(s,{type:'STOP_ROLL'}),s);assert.equal(s.early,true);});
test('tie includes every tied team, not only the first',()=>{let s=selectedGame(3);for(let i=0;i<3;i++){s=advance(s,{type:'SELECT_TEAM',team:i});s=toRoll(s,2);s=advance(s,{type:'STOP_ROLL'});s=advance(s,{type:'NEXT'});}s=advance(s,{type:'END'});assert.deepEqual(winners(s),[0,1,2]);});
test('invalid random outcomes and invalid team counts cannot enter state',()=>{for(const n of [0,1,7,2.5])assert.throws(()=>createGame(n));const s=selectedGame(2);for(const sector of [-1,8,NaN])assert.equal(advance(s,{type:'SPIN',sector,question:0}),s);let q=advance(s,{type:'SPIN',sector:0,question:0});q=advance(q,{type:'STOP_SPIN'});assert.equal(advance(q,{type:'RIGHT',bag:[0,0,0,0,0,0,0,0]}),q);});
test('backup validator recognizes spin builtin with a local hash link',()=>{assert.doesNotThrow(()=>validateManifest({format:'classroom-club',version:1,images:[],lessons:[],games:[{id:'spin',name:'Spin',url:'#spin'}]}));});

test('teacher chooses any order each round; finished teams and in-flight changes are rejected',()=>{
 for(let count=2;count<=6;count++){
  let s=createGame(count);assert.equal(s.team,null);assert.equal(advance(s,{type:'SPIN',sector:0,question:0}),s);
  const order=Array.from({length:count},(_,i)=>(i+count-2)%count);
  for(let round=1;round<=6;round++)for(let k=0;k<count;k++){
   const team=order[k];assert.equal(s.round,round);
   s=advance(s,{type:'SELECT_TEAM',team});assert.equal(s.team,team);
   s=toRoll(s,k);assert.equal(advance(s,{type:'SELECT_TEAM',team:(team+1)%count}),s);
   s=advance(s,{type:'STOP_ROLL'});assert.equal(s.history.at(-1).team,team);assert.equal(s.history.at(-1).round,round);
   s=advance(s,{type:'NEXT'});
   if(k<count-1){assert.equal(s.round,round);assert.equal(advance(s,{type:'SELECT_TEAM',team}),s);}
  }
  assert.equal(s.phase,'finished');assert.equal(s.history.length,count*6);
 }
});
test('selection can change before spinning and rejects invalid teams',()=>{
 let s=createGame(6);s=advance(s,{type:'SELECT_TEAM',team:4});assert.equal(s.team,4);
 s=advance(s,{type:'SELECT_TEAM',team:1});assert.equal(s.team,1);
 for(const team of [-1,6,1.5,null])assert.equal(advance(s,{type:'SELECT_TEAM',team}),s);
});
