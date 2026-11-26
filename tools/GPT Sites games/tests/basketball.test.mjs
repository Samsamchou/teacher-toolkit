import test from 'node:test';
import assert from 'node:assert/strict';
import {ANIMALS,CARD_IDS,RULES,createMatch,transition as go,scores,shotOptions,recoverMatch,availableTeams,currentTeam,currentRound,winners,
  heldCards,rollOffer,drawCard,stealTargets,normalizeCards,cardReady} from '../src/basketball-model.mjs';
import {validateManifest} from '../src/model.mjs';
const teams=n=>ANIMALS.slice(0,n).map(a=>({name:a.name,animal:a.id}));
const shot=(s,points=1,random=0)=>go(go(go(s,{type:'START'}),{type:'SHOOT',points,random}),{type:'RESOLVE'});
const round=value=>JSON.parse(JSON.stringify(value));
// Gives team 0 a card by offering the +1 token on the 1-point shot and making it, then ends the round.
function withCard(n=2,rounds=6,cards){
  let s=createMatch(teams(n),rounds,true,cards);
  s=go(s,{type:'START',team:0,offer:1});s=go(go(s,{type:'SHOOT',points:1,random:0}),{type:'RESOLVE'});s=go(s,{type:'NEXT'});
  for(let i=1;i<n;i++)s=go(shot(s,1,.999),{type:'NEXT'});
  return go(s,{type:'START',team:0});
}
const play=(s,action)=>go(go(s,{type:'USE_CARD',...action}),{type:'RESOLVE'});

test('Every supported team count and initial round count completes exactly once per team per round',()=>{for(let n=2;n<=6;n++)for(let r=1;r<=10;r++){let s=createMatch(teams(n),r);for(let i=0;i<n*r;i++){assert.equal(currentTeam(s),i%n);assert.equal(currentRound(s),Math.floor(i/n)+1);s=shot(s);assert.equal(s.phase,'result');s=go(s,{type:'NEXT'});}assert.equal(s.phase,'finished');assert.equal(s.history.length,n*r);}});
test('Invalid team counts, duplicate animals, empty names and invalid rounds are rejected',()=>{for(const n of [0,1,7])assert.throws(()=>createMatch(Array(n).fill({name:'A',animal:'cat'})));assert.throws(()=>createMatch([{name:'A',animal:'cat'},{name:'B',animal:'cat'}]));assert.throws(()=>createMatch([{name:' ',animal:'cat'},teams(2)[1]]));for(const r of [0,11,1.5])assert.throws(()=>createMatch(teams(2),r));});
test('Shot resolution uses displayed threshold exactly, and never silently guarantees a shot',()=>{for(const points of [1,2,3]){const s=go(createMatch(teams(2)),{type:'START'}),odds=shotOptions(s).find(o=>o.points===points).odds;assert.equal(go(s,{type:'SHOOT',points,random:odds/100-.00001}).pending.hit,true);assert.equal(go(s,{type:'SHOOT',points,random:odds/100}).pending.hit,false);}});
test('A deterministic full probability sweep agrees with the displayed percentage',()=>{const s=go(createMatch(teams(2)),{type:'START'});for(const o of shotOptions(s)){let made=0;for(let n=0;n<10000;n++)made+=go(s,{type:'SHOOT',points:o.points,random:n/10000}).pending.hit;assert.equal(made,o.odds*100);}});
test('Rapid repeated shots and resolutions cannot award points twice',()=>{let s=go(createMatch(teams(2)),{type:'START'});s=go(s,{type:'SHOOT',points:3,random:0});assert.equal(go(s,{type:'SHOOT',points:3,random:0}),s);assert.deepEqual(scores(s),[0,0]);s=go(s,{type:'RESOLVE'});assert.equal(go(s,{type:'RESOLVE'}),s);assert.deepEqual(scores(s),[3,0]);});
test('Skipping a selected team consumes one turn without points',()=>{let s=go(go(createMatch(teams(2)),{type:'START'}),{type:'SKIP'});assert.equal(s.history.length,1);assert.equal(s.history[0].points,0);s=go(s,{type:'NEXT'});assert.equal(currentTeam(s),1);});
test('Leading team is challenged, trailing team gets help, existing scores stay intact',()=>{let s=createMatch(teams(2));s=go(shot(s,3),{type:'NEXT'});assert.deepEqual(shotOptions(s).map(o=>o.odds),[93,65,34]);s=go(go(go(s,{type:'START'}),{type:'SKIP'}),{type:'NEXT'});assert.deepEqual(shotOptions(s).map(o=>o.odds),[75,47,16]);assert.deepEqual(scores(s),[3,0]);});
test('The old boosts are gone: only 1, 2 and 3 point shots exist',()=>{const s=go(createMatch(teams(2)),{type:'START'});assert.deepEqual(shotOptions(s).map(o=>o.points),[1,2,3]);assert.equal(go(s,{type:'SHOOT',points:4,random:0}),s);assert.equal(go(s,{type:'BOOST',boost:'focus'}),s);});
test('Final results require last team of last round, ties share winners',()=>{let s=createMatch(teams(6),5);for(let i=0;i<30;i++){s=go(shot(s),{type:'NEXT'});if(i<29)assert.notEqual(s.phase,'finished');}assert.equal(s.phase,'finished');assert.deepEqual(winners(s),[0,1,2,3,4,5]);});
test('Additional rounds retain all scores and restart at first team',()=>{let s=createMatch(teams(2),1);s=go(shot(s,2),{type:'NEXT'});s=go(shot(s,1),{type:'NEXT'});assert.deepEqual(winners(s),[0]);s=go(s,{type:'ADD_ROUNDS',count:3});assert.deepEqual(scores(s),[2,1]);assert.equal(s.totalRounds,4);assert.equal(currentRound(s),2);assert.equal(currentTeam(s),0);});
test('Invalid random values and out-of-phase actions do not change the match',()=>{const s=go(createMatch(teams(2)),{type:'START'});for(const random of [-1,1,NaN,Infinity])assert.equal(go(s,{type:'SHOOT',points:1,random}),s);assert.equal(go(s,{type:'ADD_ROUNDS',count:1}),s);assert.equal(go(s,{type:'NEXT'}),s);});
test('Basketball is recognized as built-in by backup validation',()=>{assert.ok(validateManifest({format:'classroom-club',version:1,images:[],lessons:[],games:[{id:'basketball',name:'Animal Basketball',url:'#basketball'}]}));});
test('Teacher may use different arbitrary orders each round, each team exactly once',()=>{const orders=[[2,4,0,5,1,3],[5,3,1,0,4,2],[1,2,3,4,5,0],[4,0,2,1,3,5],[3,5,4,2,0,1]];let s=createMatch(teams(6),5);for(let r=0;r<5;r++){for(let n=0;n<6;n++){const team=orders[r][n];assert.ok(availableTeams(s).includes(team));s=go(s,{type:'START',team});assert.equal(go(s,{type:'START',team:orders[r][(n+1)%6]}),s);s=go(go(go(s,{type:'SHOOT',points:1,random:0}),{type:'RESOLVE'}),{type:'NEXT'});assert.ok(!availableTeams(s).includes(team)||n===5);}}assert.equal(s.phase,'finished');assert.deepEqual(scores(s),[5,5,5,5,5,5]);});
test('No skip before selecting a team, restore keeps current-round team availability',()=>{let s=createMatch(teams(6),5);assert.equal(go(s,{type:'SKIP'}),s);s=go(s,{type:'START',team:2});s=go(go(s,{type:'SKIP'}),{type:'NEXT'});assert.deepEqual(availableTeams(recoverMatch(round(s))),[0,1,3,4,5]);});

test('A +1 token gives a card whether or not the shot goes in, and only on the chosen value',()=>{
  for(const random of [0,.999]){
    let s=go(createMatch(teams(2)),{type:'START',team:0,offer:2});
    assert.equal(s.offer,2);
    const other=go(go(s,{type:'SHOOT',points:1,random}),{type:'RESOLVE'});assert.equal(heldCards(other,0),0);
    s=go(go(s,{type:'SHOOT',points:2,random}),{type:'RESOLVE'});assert.equal(heldCards(s,0),1);assert.equal(s.history[0].token,true);
  }
});
test('The token appears 70% of the time, on 1, 2 or 3, and never when cards are off or the team already holds two',()=>{
  const s=createMatch(teams(2));
  assert.equal(rollOffer(s,0,RULES.tokenChance-.001,0),1);assert.equal(rollOffer(s,0,0,.34),2);assert.equal(rollOffer(s,0,0,.999),3);assert.equal(rollOffer(s,0,RULES.tokenChance,0),null);
  assert.equal(rollOffer(createMatch(teams(2),6,false),0,0,0),null);
  let full=createMatch(teams(2),6);
  for(let i=0;i<2;i++){full=go(full,{type:'START',team:0,offer:1});full=go(go(go(full,{type:'SHOOT',points:1,random:.999}),{type:'RESOLVE'}),{type:'NEXT'});full=go(shot(full,1,.999),{type:'NEXT'});}
  assert.equal(heldCards(full,0),RULES.maxCards);assert.equal(rollOffer(full,0,0,0),null);
  assert.equal(go(full,{type:'START',team:0,offer:1}).offer,null,'the reducer refuses an offer to a full hand');
  assert.equal(go(createMatch(teams(2),6,false),{type:'START',team:0,offer:1}).offer,null);
});
test('A card can only be played by a team that holds one, in its own turn, while cards are on',()=>{
  const none=go(createMatch(teams(2)),{type:'START'});
  assert.equal(cardReady(none),false);assert.equal(go(none,{type:'USE_CARD',card:'slam-dunk'}),none);
  const s=withCard();assert.equal(cardReady(s),true);
  assert.equal(go(s,{type:'USE_CARD',card:'no-such-card'}),s);
  const off=withCard(2,6,{'slam-dunk':{enabled:false}});assert.equal(go(off,{type:'USE_CARD',card:'slam-dunk'}),off,'a switched-off card cannot be played');
});
test('Playing a card takes the place of the shot and uses the card up',()=>{
  let s=play(withCard(),{card:'slam-dunk'});
  assert.equal(heldCards(s,0),0);assert.equal(s.history.at(-1).card,'slam-dunk');
  s=go(s,{type:'NEXT'});assert.equal(s.phase,'ready');assert.deepEqual(availableTeams(s),[1],'the card was the team\'s turn');
});
test('Slam Dunk always scores three',()=>{const s=play(withCard(),{card:'slam-dunk'});assert.deepEqual(scores(s),[1+RULES.dunkPoints,0]);assert.equal(s.history.at(-1).hit,true);});
test('Hit or Miss is an even chance for four points or nothing',()=>{
  const s=withCard();
  assert.deepEqual(scores(play(s,{card:'hit-or-miss',random:.4999})),[1+RULES.hitOrMissPoints,0]);
  assert.deepEqual(scores(play(s,{card:'hit-or-miss',random:.5})),[1,0]);
  assert.equal(go(s,{type:'USE_CARD',card:'hit-or-miss'}),s,'needs a random value');
});
test('Double Points doubles the team\'s current total',()=>{
  let s=createMatch(teams(2));s=go(s,{type:'START',team:0,offer:3});s=go(go(go(s,{type:'SHOOT',points:3,random:0}),{type:'RESOLVE'}),{type:'NEXT'});
  s=go(shot(s,2,0),{type:'NEXT'});s=go(s,{type:'START',team:0});
  assert.deepEqual(scores(play(s,{card:'double-points'})),[6,2]);
});
test('Swap Points trades totals: automatic with two teams, teacher\'s choice with more',()=>{
  let two=createMatch(teams(2));two=go(two,{type:'START',team:0,offer:1});two=go(go(go(two,{type:'SHOOT',points:1,random:0}),{type:'RESOLVE'}),{type:'NEXT'});
  two=go(shot(two,3,0),{type:'NEXT'});two=go(two,{type:'START',team:0});
  assert.deepEqual(scores(play(two,{card:'swap-points'})),[3,1]);
  let three=withCard(3);
  assert.equal(go(three,{type:'USE_CARD',card:'swap-points'}),three,'a target is required with three teams');
  assert.equal(go(three,{type:'USE_CARD',card:'swap-points',target:0}),three,'cannot swap with itself');
  assert.deepEqual(scores(play(three,{card:'swap-points',target:2})),[0,0,1]);
});
test('Steal takes two points from the highest other team, never more than it has',()=>{
  let s=createMatch(teams(3));s=go(s,{type:'START',team:0,offer:1});s=go(go(go(s,{type:'SHOOT',points:1,random:.999}),{type:'RESOLVE'}),{type:'NEXT'});
  s=go(shot(s,3,0),{type:'NEXT'});s=go(shot(s,1,0),{type:'NEXT'});s=go(s,{type:'START',team:0});
  assert.deepEqual(stealTargets(s),[1]);
  assert.deepEqual(scores(play(s,{card:'steal'})),[2,1,1]);
  assert.equal(go(s,{type:'USE_CARD',card:'steal',target:2}).pending.target,1,'the only highest team is the target');
  // One point available: only one is stolen. Nothing available: the card is used for nothing.
  let poor=createMatch(teams(2));poor=go(poor,{type:'START',team:0,offer:1});poor=go(go(go(poor,{type:'SHOOT',points:1,random:.999}),{type:'RESOLVE'}),{type:'NEXT'});
  poor=go(shot(poor,1,0),{type:'NEXT'});poor=go(poor,{type:'START',team:0});
  assert.deepEqual(scores(play(poor,{card:'steal'})),[1,0]);
  let none=createMatch(teams(2));none=go(none,{type:'START',team:0,offer:1});none=go(go(go(none,{type:'SHOOT',points:1,random:.999}),{type:'RESOLVE'}),{type:'NEXT'});
  none=go(shot(none,1,.999),{type:'NEXT'});none=play(go(none,{type:'START',team:0}),{card:'steal'});
  assert.deepEqual(scores(none),[0,0]);assert.equal(heldCards(none,0),0);
});
test('Steal lets the teacher choose between teams tied for the lead',()=>{
  let s=createMatch(teams(3));s=go(s,{type:'START',team:0,offer:1});s=go(go(go(s,{type:'SHOOT',points:1,random:.999}),{type:'RESOLVE'}),{type:'NEXT'});
  s=go(shot(s,2,0),{type:'NEXT'});s=go(shot(s,2,0),{type:'NEXT'});s=go(s,{type:'START',team:0});
  assert.deepEqual(stealTargets(s),[1,2]);
  assert.equal(go(s,{type:'USE_CARD',card:'steal'}),s,'a choice is required');
  assert.deepEqual(scores(play(s,{card:'steal',target:2})),[2,2,0]);
});
test('Extra Shot gives the same team two more shots in the same turn, with no new tokens or cards',()=>{
  let s=play(withCard(2,2),{card:'extra-shot'});
  assert.equal(s.bonus.left,RULES.extraShots);
  s=go(s,{type:'NEXT'});assert.equal(s.phase,'aim');assert.equal(currentTeam(s),0);assert.equal(s.offer,null);assert.equal(cardReady(s),false);
  s=go(go(s,{type:'SHOOT',points:2,random:0}),{type:'RESOLVE'});assert.equal(s.history.at(-1).extra,true);assert.equal(s.history.at(-1).round,2,'the bonus shot stays in the round of the card');
  s=go(s,{type:'NEXT'});assert.equal(s.phase,'aim');
  s=go(go(s,{type:'SKIP'}),{type:'NEXT'});
  assert.equal(s.bonus,null);assert.deepEqual(scores(s),[3,0]);
});
test('Bonus shots do not count as turns: the round and the final result wait for them',()=>{
  let s=createMatch(teams(2),1);
  s=go(shot(s,1,.999),{type:'NEXT'});                       // team 0 misses
  s=go(s,{type:'START',team:1,offer:1});s=go(go(go(s,{type:'SHOOT',points:1,random:0}),{type:'RESOLVE'}),{type:'NEXT'});
  assert.equal(s.phase,'finished');
  s=go(s,{type:'ADD_ROUNDS',count:1});
  s=go(shot(s,1,.999),{type:'NEXT'});
  s=play(go(s,{type:'START',team:1}),{card:'extra-shot'});
  s=go(s,{type:'NEXT'});assert.equal(s.phase,'aim','not finished while bonus shots remain');assert.equal(currentRound(s),2);
  for(let i=0;i<2;i++){s=go(go(s,{type:'SHOOT',points:1,random:0}),{type:'RESOLVE'});s=go(s,{type:'NEXT'});}
  assert.equal(s.phase,'finished');assert.deepEqual(scores(s),[0,3]);
});
test('Cards are drawn by weight and switched-off cards never come up',()=>{
  const all=normalizeCards();
  assert.deepEqual(CARD_IDS.map((_,i)=>drawCard(all,(i+.5)/CARD_IDS.length)),CARD_IDS);
  const only=normalizeCards(Object.fromEntries(CARD_IDS.map(id=>[id,{enabled:id==='steal'}])));
  for(const random of [0,.5,.999])assert.equal(drawCard(only,random),'steal');
  assert.equal(drawCard(normalizeCards(Object.fromEntries(CARD_IDS.map(id=>[id,{enabled:false}]))),.3),null);
  const weighted=normalizeCards({'slam-dunk':{weight:0}});assert.ok(!Array.from({length:50},(_,i)=>drawCard(weighted,i/50)).includes('slam-dunk'));
});
test('Every phase of a match with cards recovers exactly, and tampering is rejected',()=>{
  let s=createMatch(teams(3),2);const steps=[
    {type:'START',team:1,offer:2},{type:'SHOOT',points:2,random:0},{type:'RESOLVE'},{type:'NEXT'},
    {type:'START',team:0,offer:null},{type:'SKIP'},{type:'NEXT'},
    {type:'START',team:2,offer:3},{type:'SHOOT',points:3,random:.999},{type:'RESOLVE'},{type:'NEXT'},
    {type:'START',team:1},{type:'USE_CARD',card:'extra-shot'},{type:'RESOLVE'},{type:'NEXT'},
    {type:'SHOOT',points:1,random:0},{type:'RESOLVE'},{type:'NEXT'},{type:'SHOOT',points:3,random:.999},{type:'RESOLVE'},{type:'NEXT'},
    {type:'START',team:2},{type:'USE_CARD',card:'steal'},{type:'RESOLVE'},{type:'NEXT'},
    {type:'START',team:0,offer:1},{type:'SHOOT',points:1,random:0},{type:'RESOLVE'},{type:'NEXT'}];
  for(const action of steps){
    const next=go(s,action);assert.notEqual(next,s,`step ${JSON.stringify(action)} applies`);s=next;
    assert.deepEqual(recoverMatch(round(s)),s,`recovers after ${action.type}`);
  }
  assert.equal(s.phase,'finished');assert.deepEqual(scores(s),[1,1,2]);
  for(const mutate of [x=>{x.history[0].points=50;},x=>{x.history[0].odds=100;},x=>{x.history[0].team=0;},x=>{x.history[3].card='slam-dunk';},x=>{x.history[4].extra=false;},
    x=>{x.history[6].transfer=-9;},x=>{x.history[0].token=false;},x=>{x.teams[1].animal='cat';},x=>{x.totalRounds=-1;},x=>{x.version=2;}]){
    const broken=round(s);mutate(broken);assert.equal(recoverMatch(broken),null);
  }
});
test('A match saved by the old version with boosts is not continued',()=>{
  assert.equal(recoverMatch({version:2,teams:teams(2),totalRounds:6,powerups:true,history:[],phase:'ready',activeTeam:null,boost:null,pending:null}),null);
});
