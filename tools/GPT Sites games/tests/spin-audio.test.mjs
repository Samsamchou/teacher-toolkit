import test from 'node:test';
import assert from 'node:assert/strict';
import {SpinAudio} from '../src/SpinAudio.js';
const nodes=[],spoken=[];
const parameter=()=>({setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
globalThis.SpeechSynthesisUtterance=class {constructor(text){this.text=text;}};
globalThis.window={speechSynthesis:{cancel(){},getVoices(){return [{lang:'en-US',localService:true}];},speak(u){spoken.push(u);}},AudioContext:class {state='running';currentTime=0;destination={};resume(){return Promise.resolve();}close(){}createGain(){return {gain:parameter(),connect(){},disconnect(){}};}createOscillator(){const o={frequency:parameter(),connect(g){return g;},start(t){this.startAt=t;},stop(t){this.stopAt=t;this.stopped=t===undefined;},disconnect(){}};nodes.push(o);return o;}}};
test('celebration audio spans exactly eight seconds and mute stops all voices',async()=>{const a=new SpinAudio();await a.unlock();a.configure({muted:false,scratchVolume:.35,victoryVolume:.5});a.celebrate();assert.equal(nodes.length,32);assert.equal(Math.min(...nodes.map(n=>n.startAt)),0);assert.equal(Math.max(...nodes.map(n=>n.stopAt)),8);a.configure({muted:true,scratchVolume:.35,victoryVolume:.5});assert.ok(nodes.every(n=>n.stopped));const before=nodes.length;a.celebrate();a.retry();assert.equal(nodes.length,before);assert.equal(spoken.length,0);});
test('retry speaks the requested English prompt and uses encouraging rising notes',async()=>{const a=new SpinAudio();await a.unlock();a.configure({muted:false,scratchVolume:.35,victoryVolume:.5});const before=nodes.length;a.retry();assert.equal(spoken.at(-1).text,'Try again!');assert.equal(spoken.at(-1).lang,'en-US');assert.deepEqual(nodes.slice(before).map(n=>n.frequency.value),[440,554.37,659.25]);});

test('spin has a continuous six-second bed, slowing ticks and cancellable pending playback',async()=>{
 const a=new SpinAudio();a.configure({muted:false,scratchVolume:.35});let before=nodes.length;await a.spin();
 const spin=nodes.slice(before);assert.ok(spin.length>20);assert.equal(spin[0].startAt,0);assert.equal(spin[0].stopAt,6);
 const clicks=spin.slice(1);assert.ok(clicks.at(-1).startAt-clicks.at(-2).startAt>clicks[1].startAt-clicks[0].startAt);assert.ok(spin.every(n=>n.stopAt<=6));
 a.configure({muted:true,scratchVolume:.35});assert.ok(spin.every(n=>n.stopped));assert.equal(a.spinVoices.length,0);
 a.configure({muted:false,scratchVolume:.35});before=nodes.length;const pending=a.spin();a.stop();await pending;assert.equal(nodes.length,before);
 await a.spin(1800,4200);assert.equal(a.spinVoices[0].stopAt,1.8);a.stopSpin();assert.equal(a.spinVoices.length,0);
});
