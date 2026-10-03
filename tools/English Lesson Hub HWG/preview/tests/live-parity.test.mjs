import test from 'node:test';
import assert from 'node:assert/strict';
import {newBlock,validateDeck,grade,publicBlock,createRoom,joinRoom,controlRoom,submitRoom,snapshot,report} from '../src/live/domain.mjs';
import {parityBlock,convertBlock,textLength,solutionText} from '../src/live/parity.mjs';
const b=type=>parityBlock(newBlock(type,'q1'));
const deck=block=>({id:'test',title:'Research fixture',blocks:[block]});
const room=block=>{const r=createRoom(deck(block),'123456','teacher',1000);joinRoom(r,'s','50101',1001);controlRoom(r,'teacher','open',{revision:r.revision},1002);return r;};
const submit=(r,answer,id='attempt')=>submitRoom(r,'s',{attemptId:id,blockId:'q1',revision:r.revision,answer},1003);
const image=block=>({...block,media:[{id:'image',kind:'image'}],background:{assetId:'image',alt:'Transport'}});
for(const type of ['blank','drag','dropdown']) test(`${type}: two blanks, alternate, partial, all-or-nothing and malformed response`,()=>{
  const q=b(type);q.sentence='{{b1}} and {{b2}}';q.blanks.push({id:'b2',answers:['train'],distractors:['car']});q.blanks[0].answers.push('bicycle');q.partial=true;q.points=4;
  validateDeck(deck(q));
  assert.equal(grade(q,{b1:'bicycle',b2:'train'}).score,4);
  assert.equal(grade(q,{b1:'bus',b2:'train'}).score,2);
  assert.equal(grade({...q,partial:false},{b1:'bus',b2:'train'}).score,0);
  assert.throws(()=>grade(q,{b1:'bike'}));
  assert.throws(()=>grade(q,{b1:'bike',b2:'train',other:'x'}));
  assert.throws(()=>validateDeck(deck({...q,sentence:'{{b1}} {{b1}}'})));
});
test('blank answer never appears in student snapshot; choices contain no answer markers',()=>{
  const q=b('blank');q.blanks[0].answers=['PRIVATE_ANSWER'];q.migration={sourceId:'PRIVATE_ID',reviewed:true};
  const s=publicBlock(q);assert.ok(!JSON.stringify(s).includes('PRIVATE'));assert.equal(s.blanks[0].choices,undefined);
  const choice=publicBlock(b('dropdown'));assert.equal(choice.blanks[0].answers,undefined);assert.equal(choice.blanks[0].distractors,undefined);assert.ok(choice.blanks[0].choices.includes('bike'));
});
test('labels validate image, bounds, exact pairing and forbid duplicate use',()=>{
  const q=image(b('label'));q.labels.push({id:'l2',text:'car'});q.anchors.push({id:'a2',x:.8,y:.7,direction:'up',labelId:'l2'});q.points=2;
  validateDeck(deck(q));assert.equal(grade(q,{a1:'l1',a2:'l2'}).score,2);
  assert.throws(()=>grade(q,{a1:'l1',a2:'l1'}));
  assert.equal(publicBlock(q).anchors[0].labelId,undefined);
  assert.throws(()=>validateDeck(deck({...q,background:{assetId:'image',alt:''}})));
  assert.throws(()=>validateDeck(deck({...q,anchors:[{...q.anchors[0],x:2}]})));
});
test('hotspot selects regions, penalizes distractors, rejects duplicates and hides keys',()=>{
  const q=image(b('hotspot'));q.regions.push({...q.regions[0],id:'r2',x:.8});q.regions.push({...q.regions[0],id:'r3',correct:false});q.points=4;
  validateDeck(deck(q));assert.equal(grade(q,['r1']).score,2);assert.equal(grade(q,['r1','r2']).score,4);assert.equal(grade(q,['r1','r2','r3']).score,2);
  assert.throws(()=>grade(q,['r1','r1']));assert.throws(()=>grade(q,['unknown']));assert.equal(publicBlock(q).regions[0].correct,undefined);
  assert.throws(()=>validateDeck(deck({...q,regions:[{id:'bad',shape:'polygon',correct:true,vertices:[{x:0,y:0}]}]})));
});
test('conversion leaves source unchanged, preserves legacy scores, blocks incomplete copy only when visible',()=>{
  const original={...newBlock('drag','old'),items:['bike'],mapping:[0]};const before=structuredClone(original);
  const converted=convertBlock(original,'new');assert.deepEqual(original,before);assert.equal(grade(original,[0]).score,1);
  assert.throws(()=>validateDeck(deck(converted)));
  validateDeck({id:'deck',title:'Keep old',blocks:[original,{...converted,hidden:true}]});
  assert.equal(converted.migration.reviewed,false);assert.equal(converted.blanks.length,0);
});
for(const value of ['a','中','🚲']) test(`open 199/200 accepted and 201 rejected server-side (${value})`,()=>{
  for(const n of [199,200]) {const r=room(b('open'));submit(r,value.repeat(n));const restored=JSON.parse(JSON.stringify(r));assert.equal(textLength(report(restored)[0].details[0].answer),n);assert.equal(report(restored)[0].pending,1);}
  assert.throws(()=>submit(room(b('open')),value.repeat(201)),/200/);
  assert.throws(()=>submit(room(b('open')),{text:'hi'}));
});
test('old long responses remain readable; new legacy submissions obey 200 limit',()=>{
  const r=room(newBlock('open','q1'));assert.throws(()=>submit(r,'x'.repeat(201)),/200/);
  r.responses.old={attemptId:'old',uid:'s',studentId:'50101',blockId:'q1',answer:'x'.repeat(300),grade:{status:'pending',score:null,max:1},submittedAt:1000};
  assert.equal(report(r)[0].details[0].answer.length,300);
});
test('cloud has zero score but original two reward turns',()=>{
  const q=b('cloud');assert.equal(q.points,0);const r=room(q);submit(r,'bike');assert.equal(report(r)[0].max,0);assert.equal(snapshot(r,'s',1004).reward.earned,2);assert.throws(()=>validateDeck(deck({...q,points:1})));
});
test('drawing supports validated strokes and awaits manual marking',()=>{
  const q=b('draw');const r=room(q);submit(r,[{color:'#123456',width:6,points:[[1,2],[3,4]]}]);assert.equal(report(r)[0].pending,1);
  assert.throws(()=>submit(room(q),[{color:'url(evil)',width:6,points:[[0,0]]}]));
  assert.throws(()=>validateDeck(deck({...q,canvasMode:'image'})));
});
test('sorting and categorization preserve expected order and group-level details',()=>{
  const q=b('order');assert.equal(grade(q,q.items).score,1);assert.equal(grade(q,[...q.items].reverse()).score,0);
  const c=b('category');validateDeck(deck(c));assert.equal(grade(c,c.mapping).score,1);assert.equal(grade(c,[0,1,1]).details[1].correct,false);
  assert.throws(()=>validateDeck(deck({...c,groups:['Only']})));
});
test('persisted response grading version is included in report, hidden before reveal',()=>{
  const r=room(b('drag'));submit(r,{b1:'bike'});assert.equal(report(r)[0].details[0].scoringVersion,'parity-1');assert.equal(snapshot(r,'s',1004).responses[0].grade.details,undefined);assert.equal(report(r)[0].details[0].grade.details[0].earned,1);
});
test('reveal has the actual versioned solution; repeated ordering words survive preview',()=>{
  const q=b('order');q.items=['I','know','I','can'];assert.equal(publicBlock(q).items.length,4);assert.equal(publicBlock(q).correctOrder,undefined);assert.equal(solutionText(publicBlock(q,true)),'I → know → I → can');
  assert.equal(solutionText(publicBlock(b('drag'),true)),'1: bike');
});
test('incomplete category and empty choice cannot be submitted',()=>{
  assert.throws(()=>grade(b('category'),[0,null,1]));assert.throws(()=>grade(b('choice'),[]));assert.throws(()=>grade(b('choice'),[0,1]));
});
test('word cloud aggregates current round, exposed to students only after reveal',()=>{
  const r=room(b('cloud'));joinRoom(r,'s2','50102',1002);submit(r,'Bike');submitRoom(r,'s2',{attemptId:'two',blockId:'q1',revision:r.revision,answer:'bike'},1003);
  assert.deepEqual(snapshot(r,'teacher',1004).wordCloud,[{text:'bike',count:2}]);assert.equal(snapshot(r,'s',1004).wordCloud,null);
  controlRoom(r,'teacher','reveal',{revision:r.revision},1005);assert.equal(snapshot(r,'s',1006).wordCloud[0].count,2);assert.equal(snapshot(r,'s',1006).responses.length,1);
});
test('revealed inline snapshot can safely render again without answer leakage',()=>{
  const revealed=publicBlock(b('dropdown'),true);assert.ok(publicBlock(revealed).blanks[0].choices.includes('bike'));assert.equal(publicBlock(revealed).blanks[0].answers,undefined);
});
test('drag choices belong to the shared pool; a wrong-slot token is graded wrong, not rejected',()=>{
  const q=b('drag');q.blanks.push({id:'b2',answers:['train'],distractors:[]});q.sentence+=' {{b2}}';assert.equal(grade(q,{b1:'train',b2:'bike'}).score,0);
});
test('hotspot supports at most ten regions',()=>{
  const q=image(b('hotspot'));q.regions=Array.from({length:11},(_,i)=>({...q.regions[0],id:`region-${i}`}));assert.throws(()=>validateDeck(deck(q)),/10/);
});
