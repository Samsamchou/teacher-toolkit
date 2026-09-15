import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const out='qa/spin-refresh-20260915';await fs.mkdir(out,{recursive:true});
const b=await chromium.launch({channel:'msedge',headless:true});const p=await b.newPage();await p.goto('http://127.0.0.1:5192');
const report=await p.evaluate(async()=>{
 const {SpinAudio}=await import('/src/SpinAudio.js');const ctx=new OfflineAudioContext(1,48000*6,48000),a=new SpinAudio();
 a.context={state:'running',currentTime:0,destination:ctx.destination,resume:()=>Promise.resolve(),createOscillator:()=>ctx.createOscillator(),createGain:()=>ctx.createGain()};
 a.configure({muted:false,scratchVolume:.5});await a.spin(6000,0);const buffer=await ctx.startRendering(),data=buffer.getChannelData(0),rms=[];
 for(let j=0;j<60;j++){let sum=0;for(let i=j*4800;i<(j+1)*4800;i++)sum+=data[i]*data[i];rms.push(Math.sqrt(sum/4800));}
 return {seconds:buffer.duration,sampleRate:buffer.sampleRate,rms100ms:rms,peak:data.reduce((m,v)=>Math.max(m,Math.abs(v)),0)};
});expect(report.seconds).toBe(6);expect(report.rms100ms.every(r=>r>.005)).toBe(true);expect(report.peak).toBeLessThan(1);
const manifest=JSON.parse(await fs.readFile('public/spin/tasks/source-manifest.json','utf8'));report.originalGifs=[];
for(const t of manifest.tasks){const hash=createHash('sha256').update(await fs.readFile('public/spin/tasks/'+t.file)).digest('hex');expect(hash).toBe(t.sha256);report.originalGifs.push({file:t.file,sha256:hash,unchanged:true});}
await fs.writeFile(`${out}/sound-and-originals.json`,JSON.stringify({passed:true,...report},null,2));console.log(JSON.stringify({passed:true,seconds:report.seconds,nonSilentWindows:report.rms100ms.length,originalGifs:report.originalGifs.length}));await b.close();
