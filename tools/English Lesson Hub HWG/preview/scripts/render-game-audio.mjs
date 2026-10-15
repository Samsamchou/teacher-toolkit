// Reproducible WAV sampler of the exact local sound designs used by the game.
import {writeFile,mkdir} from 'node:fs/promises';import path from 'node:path';
import {SOUND_RATE,EFFECT_NAMES,renderEffect,renderMusic} from '../src/assignments/game-sound-design.mjs';
const output=process.argv[2];if(!output)throw Error('Usage: node scripts/render-game-audio.mjs OUTPUT.wav');
const samples=new Float32Array(SOUND_RATE*26),music=renderMusic(1).samples,markers=[];
for(let i=0;i<samples.length;i++)samples[i]=music[i%music.length]*.38;
EFFECT_NAMES.forEach((name,i)=>{const start=Math.round((1+i*1.65)*SOUND_RATE),effect=renderEffect(name,{variation:i%3,tier:4});markers.push({name,seconds:1+i*1.65});for(let j=0;j<effect.length&&start+j<samples.length;j++)samples[start+j]+=effect[j]*.7;});
const wav=Buffer.alloc(44+samples.length*2);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(SOUND_RATE,24);wav.writeUInt32LE(SOUND_RATE*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples.length*2,40);
let peak=0;for(let i=0;i<samples.length;i++){peak=Math.max(peak,Math.abs(samples[i]));wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),44+i*2);}if(peak>=1)throw Error('Sampler clipped');
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,wav);await writeFile(output+'.json',JSON.stringify({seconds:26,sampleRate:SOUND_RATE,peak,markers},null,2));console.log(JSON.stringify({file:output,bytes:wav.length,seconds:26,peak}));
