import test from 'node:test';import assert from 'node:assert/strict';
import {newBlock,createRoom,joinRoom,controlRoom,snapshot} from '../src/live/domain.mjs';
import {halfDimensions,needsImageUpgrade,replaceImageAssets} from '../src/live/image-optimization.mjs';
import {createMediaService} from '../functions/src/live-media-service.mjs';

test('focus while teaching video does not stop or rewind it, persists after pause and clears on navigation',()=>{
 const b={...newBlock('slide','film'),syncVideoId:'asset',media:[{id:'asset',kind:'video',name:'clip.mp4'}]};
 const r=createRoom({id:'focus',title:'Focus QA',blocks:[b,newBlock('choice','q')]},'123456','t',1000);joinRoom(r,'s','50101',1001);
 const control=(action,extra={},now=2000)=>controlRoom(r,'t',action,{revision:r.revision,...extra},now);
 control('start');control('video',{blockId:'film',assetId:'asset',command:'play',position:4});
 assert.equal(r.focus,true);assert.equal(snapshot(r,'s',2100).focus,true);
 const before=structuredClone(r.video);control('focus',{enabled:true});assert.deepEqual(r.video,before);assert.equal(r.phase,'content');
 control('video',{blockId:'film',assetId:'asset',command:'pause',position:9},7000);assert.equal(r.focus,true);assert.equal(r.video.playing,false);
 control('focus',{enabled:false});assert.equal(r.focus,false);assert.equal(r.video.position,9);
 control('video',{blockId:'film',assetId:'asset',command:'play',position:9},8000);assert.equal(r.focus,true);
 assert.throws(()=>controlRoom(r,'s','focus',{revision:r.revision,enabled:false},8100));
 control('move',{index:1},9000);assert.equal(r.focus,false);assert.equal(r.video,null);
});
test('question focus freezes the timer, repeated focus preserves original resume time',()=>{
 const r=createRoom({id:'q',title:'Question',blocks:[newBlock('choice','q')]},'123456','t',1000);
 const c=(action,extra,now)=>controlRoom(r,'t',action,{revision:r.revision,...extra},now);
 c('open',{},2000);c('focus',{enabled:true},3000);c('focus',{enabled:true},4000);
 assert.equal(r.phase,'paused');c('focus',{enabled:false},7000);assert.equal(r.phase,'question');assert.equal(r.pausedDuration,4000);
});
test('half dimensions, original preservation and background/object remapping are idempotent',()=>{
 assert.deepEqual(halfDimensions(1200,800),{width:600,height:400});assert.deepEqual(halfDimensions(1,3),{width:1,height:2});
 assert.throws(()=>halfDimensions(NaN,2));
 const old={id:'old',kind:'image',originalId:'original',sha256:'hash'};const audio={id:'audio',kind:'audio'};
 const next={...old,id:'half',imageOptimization:{version:2}};const d={blocks:[{type:'choice',media:[old,audio],background:{assetId:'old'},objects:[{assetId:'old'}]},{type:'slide',media:[old]}]};
 const upgraded=replaceImageAssets(d,new Map([['old',next]]));assert.equal(upgraded.blocks[0].background.assetId,'half');assert.equal(upgraded.blocks[0].objects[0].assetId,'half');
 assert.deepEqual(upgraded.blocks[0].media[1],audio);assert.equal(upgraded.blocks[1].media[0].id,'old');assert.equal(d.blocks[0].media[0].id,'old');
 assert.equal(needsImageUpgrade(next),false);assert.equal(upgraded.blocks[0].media[0].originalId,'original');
 assert.deepEqual(replaceImageAssets(upgraded,new Map()),upgraded);
});
test('only authenticated asset owner may read original; classroom students get playback only',async()=>{
 const id='cloud-12345678-1234-1234-1234-123456789012';let signed=[];
 const asset={id,ownerUid:'t',kind:'image',status:'ready',paths:{original:'private-original',playback:'private-half'}};
 const room={teacher:'t',participants:{s:{}},expiresAt:9999,phase:'content',index:0,deck:{blocks:[{media:[{id}]}]}};
 const db={collection:name=>({doc:()=>({get:async()=>({exists:true,data:()=>name==='liveMediaV2'?asset:{json:JSON.stringify(room)}})})})};
 const service=createMediaService({db,bucket:{file:p=>({getSignedUrl:async()=>{signed.push(p);return ['https://test.invalid/signed'];}})},requireTeacher:async r=>{if(!r.data.testTeacher)throw Error('teacher denied');},now:()=>2000});
 const call=(uid,variant,testTeacher=false)=>service({auth:{uid,token:{firebase:{sign_in_provider:'anonymous'}}},data:{action:'read',id,code:'123456',variant,testTeacher}});
 await assert.rejects(call('t','original'),/teacher denied/);await assert.rejects(call('s','original'),/原始/);assert.deepEqual(signed,[]);
 await call('t','original',true);await call('s','playback');assert.deepEqual(signed,['private-original','private-half']);
});
