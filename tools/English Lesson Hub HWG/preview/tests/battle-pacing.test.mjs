import test from 'node:test';import assert from 'node:assert/strict';
import {BATTLE_SECONDS,battleSeconds} from '../src/assignments/battle-pacing.mjs';
import {levelPlan} from '../src/assignments/assignment-domain.mjs';
test('later levels allow longer battle windows and invalid levels stay within bounds',()=>{
 assert.deepEqual(BATTLE_SECONDS,[15,17,19,21,23,25]);
 for(let level=1;level<=6;level++)assert.equal(battleSeconds(level),13+level*2);
 assert.equal(battleSeconds(-2),15);assert.equal(battleSeconds(99),25);assert.equal(battleSeconds(NaN),15);
});
test('30 and 35 question budgets add four to five minutes without changing the six-level split',()=>{
 for(const [total,expected] of [[30,600],[35,695]]){
  const levels=levelPlan(total);assert.equal(levels.reduce((n,l)=>n+l.count*battleSeconds(l.level),0),expected);
  assert.equal(levels.reduce((n,l)=>n+l.count,0),total);
 }
});
