import test from 'node:test';
import assert from 'node:assert/strict';
import {newBlock,validateDeck,grade} from '../src/live/domain.mjs';
import {parityBlock,caseOnlyDistractors} from '../src/live/parity.mjs';
import {feedbackFor} from '../src/assignments/assignment-domain.mjs';

const street=type=>{const q=parityBlock(newBlock(type,'q1'));q.sentence='Go along Zhongshan {{b1}}.';q.blanks=[{id:'b1',answers:['Street'],distractors:['street','Road']}];return q;};
const deck=q=>({id:'d',title:'Where road',blocks:[q]});

test('drag and dropdown accept answers and distractors that differ only in case',()=>{
  for(const type of ['drag','dropdown']){
    const q=street(type);
    assert.doesNotThrow(()=>validateDeck(deck(q)));
    assert.equal(grade(q,{b1:'Street'}).score,q.points);
    const wrong=grade(q,{b1:'street'});
    assert.equal(wrong.score,0);
    assert.equal(wrong.details[0].caseOnly,true);
    assert.equal(grade(q,{b1:'Road'}).details[0].caseOnly,undefined);
    assert.deepEqual(caseOnlyDistractors(q.blanks[0]),['street']);
  }
});

test('identical answer and distractor is still rejected',()=>{
  for(const type of ['drag','dropdown']){
    const q=street(type);q.blanks[0].distractors=['Street'];
    assert.throws(()=>validateDeck(deck(q)),/干擾不能等於正解/);
    q.blanks[0].distractors=[' Street '];
    assert.throws(()=>validateDeck(deck(q)),/干擾不能等於正解/);
  }
});

test('typed blanks still ignore case',()=>{
  const q=parityBlock(newBlock('blank','q1'));q.sentence='Go along Zhongshan {{b1}}.';q.blanks=[{id:'b1',answers:['Street'],distractors:[]}];
  validateDeck(deck(q));
  assert.equal(grade(q,{b1:'street'}).score,q.points);
});

test('assignment feedback says mind the case only after the question closes',()=>{
  const b=street('drag');
  const a={mode:'practice',deck:{blocks:[b]}};
  const attempt={attemptId:'x',blockId:'q1',outcome:'wrong',grade:grade(b,{b1:'street'}),ordinal:4,answer:{b1:'street'}};
  assert.equal('caseHint' in feedbackFor(a,{records:{q1:{count:1,closed:false}},awards:{}},attempt),false);
  assert.equal(feedbackFor(a,{records:{q1:{count:4,closed:true,best:0}},awards:{}},attempt).caseHint,true);
  const other={...attempt,grade:grade(b,{b1:'Road'})};
  assert.equal('caseHint' in feedbackFor(a,{records:{q1:{count:4,closed:true,best:0}},awards:{}},other),false);
});
