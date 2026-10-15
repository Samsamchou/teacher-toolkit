import test from 'node:test';import assert from 'node:assert/strict';
import {createCelebrationAudio} from '../src/assignments/celebration-audio.mjs';
function fixture({failMP3=false,failAll=false}={}){
 const voices=[],requests=[];let enabled=true,context;
 const sound=createCelebrationAudio({getContext:()=>context,getDestination:()=>({}),isEnabled:()=>enabled,fetcher:async url=>{requests.push(url);return {ok:!failAll&&!(failMP3&&url.endsWith('.mp3')),arrayBuffer:async()=>new ArrayBuffer(4)};}});
 return {sound,voices,requests,mute(v){enabled=!v; if(v)sound.stop();},unlock(){context={state:'running',async decodeAudioData(){return {duration:7.4};},createBufferSource(){const v={connect(){},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}};voices.push(v);return v;}};}};
}
test('preloads once and reuses the gesture-unlocked context for one celebration at a time',async()=>{
 const h=fixture();await h.sound.prepare();assert.equal(await h.sound.play(),'blocked');h.unlock();assert.equal(await h.sound.play(),'playing');assert.equal(h.voices.length,1);
 assert.equal(await h.sound.play(),'playing');assert.equal(h.voices[0].stopped,true);assert.equal(h.voices.length,2);assert.equal(h.requests.length,1);
});
test('muting stops celebration immediately and prevents a newly requested voice',async()=>{
 const h=fixture();h.unlock();await h.sound.play();h.mute(true);assert.equal(h.voices[0].stopped,true);assert.equal(await h.sound.play(),'muted');assert.equal(h.voices.length,1);
 h.mute(false);assert.equal(await h.sound.play(),'playing');h.sound.dispose();assert.equal(h.voices[1].stopped,true);assert.equal(await h.sound.play(),'unavailable');
});
test('a pending fetch cannot start audio after the page closes or playback is stopped',async()=>{
 let resolveFetch;const voices=[],context={state:'running',decodeAudioData:async()=>({}),createBufferSource:()=>{voices.push(1);return {connect(){},start(){}};}};
 const a=createCelebrationAudio({getContext:()=>context,getDestination:()=>({}),isEnabled:()=>true,fetcher:()=>new Promise(resolve=>{resolveFetch=resolve;})});
 const pending=a.play();a.stop();resolveFetch({ok:true,arrayBuffer:async()=>new ArrayBuffer(2)});assert.equal(await pending,'cancelled');assert.equal(voices.length,0);
});
test('OGG is an alternate format and missing assets return an actionable unavailable state',async()=>{
 const h=fixture({failMP3:true});h.unlock();assert.equal(await h.sound.play(),'playing');assert.ok(h.requests.at(-1).endsWith('.ogg'));
 const bad=fixture({failAll:true});bad.unlock();assert.equal(await bad.sound.play(),'unavailable');assert.equal(bad.voices.length,0);
});
