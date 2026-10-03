import test from 'node:test';
import assert from 'node:assert/strict';
import {newBlock,validateDeck,grade,publicBlock,createRoom,joinRoom,controlRoom,snapshot,submitRoom,report,embedUrl} from '../src/live/domain.mjs';
import {parityBlock} from '../src/live/parity.mjs';
import {videoSource,videoPosition} from '../src/live/video.mjs';
const make=()=>({...parityBlock(newBlock('multiselect','multi')),points:6});
const deck=b=>({id:'deck',title:'QA',blocks:[b]});
for(const count of [2,3,4])test(`multiselect ${count}: scores, limits, redaction, details`,()=>{
 const b={...make(),options:['a','b','c','d','e','f'],answer:Array.from({length:count},(_,i)=>i)};
 validateDeck(deck(b));assert.equal(grade(b,b.answer).score,6);
 assert.equal(grade(b,[5]).score,0);
 assert.equal(grade(b,[0,5]).score,0);
 assert.equal(grade(b,[0]).score,Math.round(600/count)/100);
 for(const a of [[],[0,0],[-1],[9],[0,1,2,3,4]])assert.throws(()=>grade(b,a));
 const safe=publicBlock(b);assert.equal(safe.requiredSelections,count);assert.equal(safe.answer,undefined);
 assert.equal(grade(b,[0]).details.length,6);assert.equal(publicBlock(b,true).answer.length,count);
});
test('invalid teacher keys and empty/duplicate options blocked, drafts preserved',()=>{
 for(const change of [{answer:[0]},{answer:[0,0]},{answer:[0,1,2,3,4]},{options:['','b','c','d']},{options:['a','A','c','d']},{partial:false}])assert.throws(()=>validateDeck(deck({...make(),...change})));
 validateDeck(deck({...make(),answer:[]}),{draft:true});
});
test('multiselect persisted receipt, private grade, report and old questions unchanged',()=>{
 const b=make(),room=createRoom(deck(b),'123456','teacher',1000);joinRoom(room,'student','50101',1001);
 controlRoom(room,'teacher','open',{revision:room.revision},1002);
 const input={attemptId:'attempt',blockId:b.id,openedAt:room.openedAt,revision:room.revision,answer:[1,2,0]};
 submitRoom(room,'student',input,1003);
 const restored=JSON.parse(JSON.stringify(room));assert.equal(snapshot(restored,'student',1004).responses[0].grade.details,undefined);
 assert.equal(snapshot(restored,'teacher',1004).responses[0].grade.score,2);
 assert.match(JSON.stringify(report(restored)),/multiselect-1/);
 assert.equal(grade(newBlock('choice','old'),[0]).score,1);
});
test('provider parsing retains safe hosts and rejects executable or spoofed URLs',()=>{
 for(const url of ['https://youtu.be/M7lc1UVf-VE','https://www.youtube.com/watch?v=M7lc1UVf-VE','https://www.youtube.com/shorts/M7lc1UVf-VE'])assert.equal(videoSource(url).id,'M7lc1UVf-VE');
 assert.equal(videoSource('https://drive.google.com/file/d/abcdefghijk/view').provider,'drive');
 for(const url of ['javascript:alert(1)','https://youtube.com.evil.test/watch?v=M7lc1UVf-VE','https://u:p@youtube.com/watch?v=M7lc1UVf-VE','https://drive.google.com/drive/folders/abcdefghijk','https://youtube.com/watch?v=bad']){assert.equal(videoSource(url),null);assert.throws(()=>embedUrl(url));}
});
test('only teacher controls active YouTube; persisted sync, pause and page reset',()=>{
 const b={...newBlock('slide','video'),embed:'https://youtu.be/M7lc1UVf-VE'};
 const room=createRoom({...deck(b),blocks:[b,make()]},'123456','teacher',1000);joinRoom(room,'student','50101',1001);
 controlRoom(room,'teacher','start',{revision:room.revision},1002);
 const payload=()=>({revision:room.revision,blockId:b.id,command:'play',position:10});
 assert.throws(()=>controlRoom(room,'student','video',payload(),1003));
 controlRoom(room,'teacher','video',payload(),2000);
 assert.equal(videoPosition(snapshot(room,'student',5000).video,5000),13);
 assert.equal(JSON.parse(JSON.stringify(room)).video.playing,true);
 assert.throws(()=>controlRoom(room,'teacher','video',{...payload(),position:-1},5000));
 controlRoom(room,'teacher','pause',{revision:room.revision},5000);assert.equal(room.video.position,13);assert.equal(room.video.playing,false);
 controlRoom(room,'teacher','move',{revision:room.revision,index:1},6000);assert.equal(room.video,null);
 assert.throws(()=>controlRoom(room,'teacher','video',payload(),7000));
});
test('Drive sync is explicitly blocked, not silently independent',()=>{
 const b={...newBlock('slide','drive'),embed:'https://drive.google.com/file/d/abcdefghijk/view'};
 const r=createRoom(deck(b),'123456','teacher',1000);controlRoom(r,'teacher','start',{revision:r.revision},1001);
 assert.throws(()=>controlRoom(r,'teacher','video',{revision:r.revision,blockId:b.id,command:'play',position:0},1002));
});
test('uploaded video binds commands to selected page asset and preserves old media',()=>{
 const b={...newBlock('slide','uploaded'),syncVideoId:'film',media:[{id:'film',kind:'video',name:'QA.mp4'}]};
 validateDeck(deck(b));
 for(const change of [{syncVideoId:'missing'},{media:[{id:'film',kind:'image'}]},{embed:'https://youtu.be/M7lc1UVf-VE'}])assert.throws(()=>validateDeck(deck({...b,...change})));
 const r=createRoom(deck(b),'123456','teacher',1000);joinRoom(r,'student','50101',1001);controlRoom(r,'teacher','start',{revision:r.revision},1002);
 const payload=()=>({revision:r.revision,blockId:b.id,assetId:'film',command:'play',position:2});
 assert.throws(()=>controlRoom(r,'student','video',payload(),1003));
 assert.throws(()=>controlRoom(r,'teacher','video',{...payload(),assetId:'other'},1003));
 controlRoom(r,'teacher','video',payload(),2000);
 assert.equal(snapshot(r,'student',5000).video.assetId,'film');
 assert.equal(videoPosition(r.video,5000),5);
 controlRoom(r,'teacher','video',{...payload(),command:'seek',position:20},5000);assert.equal(r.video.playing,true);
 controlRoom(r,'teacher','video',{...payload(),command:'pause',position:21},6000);assert.equal(r.video.playing,false);
 assert.equal(JSON.parse(JSON.stringify(r)).video.position,21);
 assert.equal(snapshot(r,'student',6001).reward.earned,0);
 const old={...b};delete old.syncVideoId;validateDeck(deck(old));assert.equal(old.syncVideoId,undefined);
});
