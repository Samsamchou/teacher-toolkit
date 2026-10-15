import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {renderEffect,renderMusic,EFFECT_NAMES,SOUND_RATE} from '../src/assignments/game-sound-design.mjs';
import {createGameAudio} from '../src/assignments/game-audio.mjs';
function measure(samples){let peak=0,energy=0;for(const v of samples){assert.ok(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));energy+=v*v;}return {peak,rms:Math.sqrt(energy/samples.length)};}
test('all 14 sound designs contain finite, audible PCM with headroom and a quiet tail',()=>{
 const hashes=new Set();for(const name of EFFECT_NAMES){const samples=renderEffect(name,{tier:4}),m=measure(samples);assert.ok(m.peak>.02&&m.peak<.9,name);assert.ok(m.rms>.002,name);assert.ok(Math.abs(samples.at(-1))<.001,name);hashes.add(createHash('sha256').update(new Uint8Array(samples.buffer)).digest('hex'));}assert.equal(hashes.size,14);
});
test('all six level loops are distinct and have quiet loop seams',()=>{
 const hashes=new Set();for(let level=1;level<=6;level++){const {samples,duration}=renderMusic(level),m=measure(samples);assert.ok(duration>6&&duration<8);assert.ok(m.peak<.9&&m.rms>.005);assert.equal(samples[0],0);assert.ok(Math.abs(samples.at(-1))<.001);hashes.add(createHash('sha256').update(new Uint8Array(samples.buffer)).digest('hex'));}assert.equal(hashes.size,6);assert.equal(SOUND_RATE,22050);
});
function harness(){
 const sources=[],gains=[];let time=0;
 const param=()=>({value:0,setTargetAtTime(value){this.value=value;}}),node=()=>({connect(){},disconnect(){this.disconnected=true;}});
 const context={state:'suspended',currentTime:0,destination:node(),createGain(){const n={...node(),gain:param()};gains.push(n);return n;},createDynamicsCompressor(){return {...node(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()};},createStereoPanner(){return {...node(),pan:param()};},createBuffer(channels,length,rate){return {channels,length,rate,copyToChannel(a){assert.equal(a.length,length);}};},createBufferSource(){const s={...node(),started:false,stopped:false,start(){this.started=true;},stop(){this.stopped=true;this.onended?.();}};sources.push(s);return s;},async resume(){this.state='running';},async close(){this.state='closed';}};
 return {audio:createGameAudio({contextFactory:()=>context,now:()=>time}),context,sources,gains,tick(v){time+=v;}};
}
test('audio requires a gesture, rate-limits effects, pauses every voice, and resumes one music loop',async()=>{
 const h=harness(),a=h.audio;assert.equal(a.play('shot'),false);a.setScene('playing',1);await a.unlock();assert.equal(h.sources.filter(s=>s.loop&&!s.stopped).length,1);assert.equal(a.play('shot'),true);assert.equal(a.play('shot'),false);h.tick(200);assert.equal(a.play('shot'),true);a.setScene('paused',1);assert.ok(h.sources.every(s=>s.stopped));assert.equal(a.play('shot'),false);assert.equal(a.play('reward',{tier:4}),true);a.setScene('playing',2);assert.equal(h.sources.filter(s=>s.loop&&!s.stopped).length,1);a.setEnabled(false);assert.ok(h.sources.every(s=>s.stopped));assert.equal(a.play('reward'),false);a.setEnabled(true);assert.equal(h.sources.filter(s=>s.loop&&!s.stopped).length,1);a.setMusic(false);assert.equal(h.sources.filter(s=>s.loop&&!s.stopped).length,0);assert.equal(a.play('unknown'),false);a.setVolume(999);assert.equal(h.gains[0].gain.value,1);a.dispose();assert.ok(h.sources.every(s=>s.stopped));assert.equal(h.context.state,'closed');assert.equal(await a.unlock(),false);
});
