import test from 'node:test';
import assert from 'node:assert/strict';
import {answerStatus,answerText,rankClassQuestions,reviewCsv,reportAccess} from '../src/live/review.mjs';
import {validateAnnotations} from '../src/live/annotations.mjs';
import {newBlock,createRoom,joinRoom,controlRoom,snapshot,report,submitRoom} from '../src/live/domain.mjs';
const q={...newBlock('choice','question'),options:['train','car','bus','bike'],answer:[1,2,3],multiple:true,partial:true,points:3};
const response=(answer,score=0)=>({answer,grade:{status:'graded',score,max:3}});
test('content correctness is distinct from awarded score, with missing/pending/ungraded states',()=>{
  assert.equal(answerStatus(q,response([0,2],0)),'partial');
  assert.equal(answerStatus(q,response([0],0)),'wrong');
  assert.equal(answerStatus(q,response([3,1,2],3)),'full');
  assert.equal(answerStatus(q,null),'missing');
  assert.equal(answerStatus(q,{grade:{status:'pending'}}),'pending');
  assert.equal(answerStatus(q,{grade:{status:'ungraded',max:0}}),'ungraded');
  assert.equal(answerStatus(q,{grade:{status:'graded',score:0,max:0}}),'ungraded');
});
test('sorting retains duplicate fragments and classifies partial despite all-or-nothing grade',()=>{
  const b={type:'order',items:['by','c','a','r','a']};
  assert.equal(answerStatus(b,response(['by','c','r','a','a'])),'partial');
  assert.equal(answerText(b,b.items),'by → c → a → r → a');
});
test('wrong-answer CSV preserves IDs, answers and score details and neutralizes formulas',()=>{
  const b={...q,title:'=IMPORTDATA("example")',reviewSolution:'car / bus / bike'};
  const csv=reviewCsv([{studentId:'00123',details:[{blockId:q.id,...response([0,2])}]}],[b]);
  assert.match(csv,/00123/);assert.match(csv,/部分答對/);assert.match(csv,/train/);assert.match(csv,/'=IMPORTDATA/);assert.match(csv,/car \/ bus \/ bike/);
});
test('class-error ranking and CSV share distinct nonzero tiers, tied colors, and original question numbers',()=>{
  const blocks=[{id:'slide',type:'slide'},...['q4','q5','q1','q2','q3','q6'].map(id=>({...q,id,title:id}))];
  const answers={
    q1:[[0,2],[0],[0],[1,2,3]],
    q2:[[0],[0,2],[1,2,3],[1,2,3]],
    q3:[[1,2,3],[0],[0,2],[1,2,3]],
    q4:[[0],[1,2,3],[1,2,3],[1,2,3]],
    q5:[[1,2,3],[1,2,3],[1,2,3],[1,2,3]],
    q6:[[1,2,3],[0,2],[1,2,3],[1,2,3]]
  };
  const rows=['00101','00102','00103','00104'].map((studentId,i)=>({studentId,details:Object.entries(answers).map(([blockId,choices])=>({blockId,...response(choices[i])}))}));
  const before=structuredClone({blocks,rows});
  const ranked=rankClassQuestions(rows,blocks);
  assert.deepEqual(ranked.map(x=>[x.block.id,x.questionNumber,x.errorCount,x.rank,x.tier]),[
    ['q1',3,3,1,1],['q2',4,2,2,2],['q3',5,2,2,2],['q4',1,1,3,3],['q6',6,1,3,3],['q5',2,0,null,null]
  ]);
  assert.deepEqual([ranked[0].counts.partial,ranked[0].counts.wrong],[1,2]);
  const csv=reviewCsv(rows,blocks);
  assert.match(csv,/錯題名次/);assert.match(csv,/需檢討人數/);assert.match(csv,/部分答對人數/);assert.match(csv,/全錯人數/);
  const cells=csv.trim().split('\r\n').slice(1).map(line=>line.match(/^"([^"]+)","([^"]+)","([^"]+)","([^"]+)"/).slice(1));
  assert.deepEqual(cells.map(x=>Number(x[1])),[3,3,3,4,4,5,5,1,6]);
  assert.deepEqual(cells.map(x=>Number(x[2])),[1,1,1,2,2,2,2,3,3]);
  assert.deepEqual(cells.map(x=>Number(x[3])),[3,3,3,2,2,2,2,1,1]);
  assert.equal(csv.includes('"q5"'),false);
  assert.deepEqual({blocks,rows},before);
});
test('pending, ungraded, and missing are not counted as wrong',()=>{
  const block={...q,id:'one'};
  const rows=[{details:[{blockId:'one',grade:{status:'pending'}}]},{details:[{blockId:'one',grade:{status:'ungraded',max:0}}]},{details:[]}];
  const [ranked]=rankClassQuestions(rows,[block]);
  assert.equal(ranked.errorCount,0);assert.equal(ranked.rank,null);
  assert.equal(ranked.counts.pending,1);assert.equal(ranked.counts.ungraded,1);assert.equal(ranked.counts.missing,1);
});
test('annotations validate bounds and teacher ownership, sync read-only, persist per question',()=>{
  const r=createRoom({id:'d',title:'test',blocks:[q,{...q,id:'q2'}]},'123456','teacher',100);
  joinRoom(r,'student','00123',101);
  const lines=[{anchor:'option-2',color:'#8500e8',width:6,points:[[0,0],[1000,1000]]}];
  assert.throws(()=>controlRoom(r,'student','annotate',{revision:r.revision,blockId:q.id,lines},102));
  controlRoom(r,'teacher','annotate',{revision:r.revision,blockId:q.id,lines},102);
  assert.deepEqual(snapshot(r,'student',103).annotations,lines);
  assert.equal(snapshot(r,'student',103).block.answer,undefined);
  controlRoom(r,'teacher','move',{revision:r.revision,index:1},104);
  assert.deepEqual(snapshot(r,'student',105).annotations,[]);
  assert.throws(()=>controlRoom(r,'teacher','annotate',{revision:r.revision,blockId:q.id,lines},106));
  controlRoom(r,'teacher','move',{revision:r.revision,index:0},107);
  assert.deepEqual(snapshot(r,'teacher',108).annotations,lines);
  assert.throws(()=>validateAnnotations([{...lines[0],points:[[Infinity,0]]}]));
  assert.throws(()=>validateAnnotations(Array(151).fill(lines[0])));
});
test('report access bypasses join expiry only within retention and for owning teacher',()=>{
  const r={teacher:'t',expiresAt:10,retentionAt:100};
  assert.doesNotThrow(()=>reportAccess(r,'t',11));
  assert.throws(()=>reportAccess(r,'s',11));
  assert.throws(()=>reportAccess(r,'t',101));
});
test('room snapshot and historical grades do not follow later question edits',()=>{
  const deck={id:'deck',title:'test',blocks:[q]},r=createRoom(deck,'123456','teacher',100);
  joinRoom(r,'student','00123',101);controlRoom(r,'teacher','open',{revision:r.revision},102);
  submitRoom(r,'student',{attemptId:'attempt-one',blockId:q.id,revision:r.revision,answer:[1,2,3]},103);
  const before=report(r);deck.blocks=[{...q,title:'changed',answer:[0]}];
  assert.equal(r.deck.blocks[0].title,q.title);assert.deepEqual(report(r),before);
  const opened=r.openedAt;
  r.deck.blocks.push({...q,id:'second'});
  controlRoom(r,'teacher','move',{revision:r.revision,index:1},104);
  controlRoom(r,'teacher','move',{revision:r.revision,index:0},105);
  assert.equal(r.openedAt,opened);
  controlRoom(r,'teacher','open',{revision:r.revision},106);
  assert.notEqual(r.openedAt,opened);assert.deepEqual(report(r),before);
});
test('legacy hotspot and label answers remain readable without v3 fields',()=>{
  assert.match(answerText({type:'hotspot'},{x:.3,y:.4}),/30%、40%/);
  assert.equal(answerText({type:'label',items:['car','bus']},[1,0]),'car：位置 2；bus：位置 1');
});
