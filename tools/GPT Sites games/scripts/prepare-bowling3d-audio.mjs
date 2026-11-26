// Cuts the downloaded CC0 recordings into game-ready clips and writes public/bowling3d/audio/manifest.json.
// Run: node scripts/prepare-bowling3d-audio.mjs   (needs ffmpeg on PATH; sources in qa/bowling3d-audio-20261126/source)
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const sourceDir=`${root}qa/bowling3d-audio-20261126/source/`,outDir=`${root}public/bowling3d/audio/`;
mkdirSync(outDir,{recursive:true});
const RATE=44100,sha=buffer=>createHash('sha256').update(buffer).digest('hex');
const BSB='CC0 1.0 (BigSoundBank, Joseph Sardin)',FS='CC0 1.0 (Freesound; HQ preview MP3)';
const SOURCES={
  'bsb-0236-cheer-teens-1.wav':{page:'https://bigsoundbank.com/shouts-and-applauses-of-teens-1-s0236.html',url:'https://bigsoundbank.com/UPLOAD/bwf-en/0236.wav',licence:BSB},
  'bsb-0237-cheer-teens-2.wav':{page:'https://bigsoundbank.com/shouts-and-applauses-of-teens-2-s0237.html',url:'https://bigsoundbank.com/UPLOAD/bwf-en/0237.wav',licence:BSB},
  'bsb-1796-whoosh-4.wav':{page:'https://bigsoundbank.com/whoosh-4-s1796.html',url:'https://bigsoundbank.com/UPLOAD/bwf-en/1796.wav',licence:BSB},
  'bsb-1137-firecracker-1.wav':{page:'https://bigsoundbank.com/firecracker-with-wick-1-s1137.html',url:'https://bigsoundbank.com/UPLOAD/bwf-en/1137.wav',licence:BSB},
  'bsb-0550-bang-snaps.wav':{page:'https://bigsoundbank.com/bang-snaps-s0550.html',url:'https://bigsoundbank.com/UPLOAD/bwf-en/0550.wav',licence:BSB},
  'oga-funked-up.mp3':{page:'https://opengameart.org/content/funked-up',url:'https://opengameart.org/sites/default/files/Funked%20Up.mp3',licence:'CC0 1.0 (OpenGameArt, Joth)'},
  'fs-128969-roll.mp3':{page:'https://freesound.org/people/driftworks/sounds/128969/',url:'https://cdn.freesound.org/previews/128/128969_2354545-hq.mp3',licence:FS},
  'fs-514385-strike.mp3':{page:'https://freesound.org/people/SieuAmThanh/sounds/514385/',url:'https://cdn.freesound.org/previews/514/514385_7554526-hq.mp3',licence:FS},
  'fs-766871-strike-hard.mp3':{page:'https://freesound.org/people/ZusIsKing/sounds/766871/',url:'https://cdn.freesound.org/previews/766/766871_15681094-hq.mp3',licence:FS},
  'fs-151204-pins.mp3':{page:'https://freesound.org/people/Bruce%20Burbank/sounds/151204/',url:'https://cdn.freesound.org/previews/151/151204_2115643-hq.mp3',licence:FS},
  'fs-430977-big-impact.mp3':{page:'https://freesound.org/people/AudioPapkin/sounds/430977/',url:'https://cdn.freesound.org/previews/430/430977_8698658-hq.mp3',licence:FS},
  'fs-619007-crowd-oh.mp3':{page:'https://freesound.org/people/mrrap4food/sounds/619007/',url:'https://cdn.freesound.org/previews/619/619007_781461-hq.mp3',licence:FS},
};
// Power-card cues (approved and downloaded 2026-11-26).
Object.assign(SOURCES,{
  'fs-571577-card-deal.mp3':{page:'https://freesound.org/people/el_boss/sounds/571577/',url:'https://cdn.freesound.org/previews/571/571577_9129912-hq.mp3',licence:FS},
  'fs-77305-buzz-roll.mp3':{page:'https://freesound.org/people/bigjoedrummer/sounds/77305/',url:'https://cdn.freesound.org/previews/77/77305_1105584-hq.mp3',licence:FS},
  'fs-648462-wrong-answer.mp3':{page:'https://freesound.org/people/-Andreas/sounds/648462/',url:'https://cdn.freesound.org/previews/648/648462_11771918-hq.mp3',licence:FS},
  'fs-326756-balloon-deflate.mp3':{page:'https://freesound.org/people/hareball101/sounds/326756/',url:'https://cdn.freesound.org/previews/326/326756_2436596-hq.mp3',licence:FS},
  'fs-497093-whistle-down.mp3':{page:'https://freesound.org/people/v0idation/sounds/497093/',url:'https://cdn.freesound.org/previews/497/497093_942821-hq.mp3',licence:FS},
  'fs-609395-vortex.mp3':{page:'https://freesound.org/people/Soonaekoo1-5/sounds/609395/',url:'https://cdn.freesound.org/previews/609/609395_10479559-hq.mp3',licence:FS},
  'fs-232263-gasp.mp3':{page:'https://freesound.org/people/ZerOcarina/sounds/232263/',url:'https://cdn.freesound.org/previews/232/232263_4134750-hq.mp3',licence:FS},
  'fs-430815-kids-laugh.mp3':{page:'https://freesound.org/people/Ben%20Keaton/sounds/430815/',url:'https://cdn.freesound.org/previews/430/430815_1875039-hq.mp3',licence:FS},
  'fs-388833-hammer-wood.mp3':{page:'https://freesound.org/people/odditonic/sounds/388833/',url:'https://cdn.freesound.org/previews/388/388833_55755-hq.mp3',licence:FS},
  'bsb-2079-chimes-dream-1.wav':{page:'https://bigsoundbank.com/chimes-dream-1-s2079.html',url:'https://bigsoundbank.com/UPLOAD/bwf-en/2079.wav',licence:BSB},
  'bsb-1631-microwave-bell.wav':{page:'https://bigsoundbank.com/microwave-bell-s1631.html',url:'https://bigsoundbank.com/UPLOAD/bwf-en/1631.wav',licence:BSB},
  'bsb-2284-boing-cartoon-8.wav':{page:'https://bigsoundbank.com/boing-cartoon-8-s2284.html',url:'https://bigsoundbank.com/UPLOAD/bwf-en/2284.wav',licence:BSB},
  'bsb-1121-broken-ball-1.wav':{page:'https://bigsoundbank.com/broken-christmas-ball-1-s1121.html',url:'https://bigsoundbank.com/UPLOAD/bwf-en/1121.wav',licence:BSB},
  'bsb-0339-coin-in-cup-1.wav':{page:'https://bigsoundbank.com/coin-in-cup-1-s0339.html',url:'https://bigsoundbank.com/UPLOAD/bwf-en/0339.wav',licence:BSB},
  'bsb-1841-wooden-thump.wav':{page:'https://bigsoundbank.com/jumping-on-wooden-pontoon-1-s1841.html',url:'https://bigsoundbank.com/UPLOAD/bwf-en/1841.wav',licence:BSB},
  'bsb-0194-coins-2.mp3':{page:'https://bigsoundbank.com/coins-2-s0194.html',url:'https://bigsoundbank.com/UPLOAD/mp3/0194.mp3',licence:BSB},
});
const TTS='Generated with edge-tts 7.3.1, voice en-US-GuyNeural, rate +6%, pitch +8Hz';
for(const [key,text] of [['strike','Strike!'],['spare','Spare!'],['double','Double!'],['turkey','Turkey!'],['gutter_ball','Gutter ball!'],['nice_shot','Nice shot!'],
  ['hit_or_miss','Hit or miss!'],['extra_shot','Extra shot!'],['no_shot','No shot!'],['lose_points','Lose points!'],['double_points','Double points!'],['swap_points','Swap points!']])
  SOURCES[`tts-${key}.mp3`]={page:null,url:null,licence:TTS,text};

function decode(name,channels,dir=sourceDir){
  const raw=execFileSync('ffmpeg',['-v','error','-i',dir+name,'-ac',String(channels),'-ar',String(RATE),'-f','f32le','-'],{maxBuffer:1<<29});
  return {data:new Float32Array(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.length)),channels};
}
const cut=(clip,from,to)=>({channels:clip.channels,data:clip.data.slice(Math.round(from*RATE)*clip.channels,to==null?undefined:Math.round(to*RATE)*clip.channels)});
function fade(clip,inSeconds,outSeconds){
  const {data,channels}=clip,frames=data.length/channels,a=Math.round(inSeconds*RATE),b=Math.round(outSeconds*RATE);
  for(let i=0;i<frames;i++){
    const gain=Math.min(1,a?i/a:1,b?(frames-1-i)/b:1);
    if(gain<1)for(let c=0;c<channels;c++)data[i*channels+c]*=gain*gain*(3-2*gain);
  }
  return clip;
}
function normalize(clip,peakDb){
  let peak=0;for(const v of clip.data)peak=Math.max(peak,Math.abs(v));
  const gain=peak?10**(peakDb/20)/peak:1;for(let i=0;i<clip.data.length;i++)clip.data[i]*=gain;
  return clip;
}
// Drops silence before the first sample above `threshold` (keeps a few ms of attack).
function trimStart(clip,threshold=.03,lead=.004){
  const {data,channels}=clip;let first=0;
  for(let i=0;i<data.length;i++)if(Math.abs(data[i])>threshold){first=Math.floor(i/channels);break;}
  return cut(clip,Math.max(0,first/RATE-lead));
}
// Seamless loop: the last `overlap` seconds are cross-faded into the start.
function loop(clip,overlap){
  const {data,channels}=clip,n=Math.round(overlap*RATE),frames=data.length/channels-n,out=new Float32Array(frames*channels);
  for(let i=0;i<frames;i++)for(let c=0;c<channels;c++){
    let v=data[i*channels+c];
    if(i<n){const k=i/n;v=v*Math.sqrt(k)+data[(frames+i)*channels+c]*Math.sqrt(1-k);}
    out[i*channels+c]=v;
  }
  return {data:out,channels};
}
function wav(clip){
  const {data,channels}=clip,buffer=Buffer.alloc(44+data.length*2);
  buffer.write('RIFF',0);buffer.writeUInt32LE(36+data.length*2,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);
  buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(channels,22);buffer.writeUInt32LE(RATE,24);buffer.writeUInt32LE(RATE*channels*2,28);
  buffer.writeUInt16LE(channels*2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(data.length*2,40);
  for(let i=0;i<data.length;i++)buffer.writeInt16LE(Math.round(Math.max(-1,Math.min(1,data[i]))*32767),44+i*2);
  return buffer;
}
// Sums clips (same channel count); each entry is [clip, startSeconds, gain].
function mix(parts){
  const channels=parts[0][0].channels,frames=Math.max(...parts.map(([clip,at])=>Math.round(at*RATE)+clip.data.length/channels)),data=new Float32Array(frames*channels);
  for(const [clip,at,gain=1] of parts){const offset=Math.round(at*RATE)*channels;for(let i=0;i<clip.data.length;i++)data[offset+i]+=clip.data[i]*gain;}
  return {data,channels};
}
const mp3=(clip,kbps)=>execFileSync('ffmpeg',['-v','error','-f','wav','-i','-','-codec:a','libmp3lame','-b:a',`${kbps}k`,'-f','mp3','-'],{input:wav(clip),maxBuffer:1<<28});

const manifest={generated:'scripts/prepare-bowling3d-audio.mjs',note:'All recordings are CC0 (public domain); announcer voices are synthetic. Gutter, pit and release sounds are synthesized in audio3d.js.',sources:{},clips:{}};
for(const [name,info] of Object.entries(SOURCES))manifest.sources[name]={...info,sha256:sha(readFileSync(sourceDir+name))};
function emit(name,file,buffer,source,processing){
  writeFileSync(outDir+file,buffer);
  manifest.clips[name]={file,bytes:buffer.length,sha256:sha(buffer),source,processing};
  console.log(name.padEnd(20),file.padEnd(24),String(buffer.length).padStart(8));
}

// Ball rolling: steady part of the lane roll, looped.
emit('roll','roll.wav',wav(normalize(loop(cut(decode('fs-128969-roll.mp3',1),.9,4.3),.35),-7)),'fs-128969-roll.mp3','0.9–4.3 s, mono, 0.35 s cross-faded loop, peak −7 dB');
// Pin crashes.
emit('strike','strike.wav',wav(normalize(fade(trimStart(decode('fs-514385-strike.mp3',1)),0,.12),-1)),'fs-514385-strike.mp3','silence trimmed, mono, peak −1 dB');
emit('pins','pins.wav',wav(normalize(fade(cut(decode('fs-766871-strike-hard.mp3',1),0,1.3),.004,.2),-3)),'fs-766871-strike-hard.mp3','0–1.3 s, mono, peak −3 dB');
// Six single pin-on-pin knocks, one file each, so every physics contact can pick a different one.
[[.17,.5],[.85,1.2],[1.45,1.8],[2.1,2.45],[2.65,3],[3.2,3.55]].forEach(([from,to],i)=>
  emit(`pin_hit_${i+1}`,`pin-hit-${i+1}.wav`,wav(normalize(fade(trimStart(cut(decode('fs-151204-pins.mp3',1),from,to),.02),0,.06),-2)),'fs-151204-pins.mp3',`${from}–${to} s, mono, peak −2 dB`));
// Crowd.
emit('cheer_big','cheer-big.mp3',mp3(normalize(fade(cut(decode('bsb-0236-cheer-teens-1.wav',2),0,3.7),.02,.9),-1),128),'bsb-0236-cheer-teens-1.wav','0–3.7 s, fade-out, MP3 128 kbps');
emit('cheer','cheer.mp3',mp3(normalize(fade(cut(decode('bsb-0237-cheer-teens-2.wav',2),0,3.2),.02,1),-2),128),'bsb-0237-cheer-teens-2.wav','0–3.2 s, fade-out, MP3 128 kbps');
emit('aww','aww.mp3',mp3(normalize(fade(cut(decode('fs-619007-crowd-oh.mp3',2),.28,2.05),.03,.35),-3),128),'fs-619007-crowd-oh.mp3','0.28–2.05 s, MP3 128 kbps');
// Replay and celebration.
emit('swoosh','swoosh.wav',wav(normalize(fade(cut(decode('bsb-1796-whoosh-4.wav',1),.12,.72),.02,.1),-3)),'bsb-1796-whoosh-4.wav','0.12–0.72 s, mono, peak −3 dB');
emit('boom','boom.mp3',mp3(normalize(fade(cut(decode('fs-430977-big-impact.mp3',2),0,2.6),.003,1.4),-1),128),'fs-430977-big-impact.mp3','0–2.6 s, fade-out, MP3 128 kbps');
emit('firework','firework.wav',wav(normalize(fade(cut(decode('bsb-1137-firecracker-1.wav',1),0,.75),0,.3),-2)),'bsb-1137-firecracker-1.wav','0–0.75 s, mono, peak −2 dB');
[[0,.22],[.48,.72],[1.02,1.3],[1.83,1.97]].forEach(([from,to],i)=>
  emit(`crackle_${i+1}`,`crackle-${i+1}.wav`,wav(normalize(fade(cut(decode('bsb-0550-bang-snaps.wav',1),from,to),0,.04),-4)),'bsb-0550-bang-snaps.wav',`${from}–${to} s, mono, peak −4 dB`));
// Music: unchanged file (loops in the player).
emit('music','music.mp3',readFileSync(sourceDir+'oga-funked-up.mp3'),'oga-funked-up.mp3','unchanged copy');
// Announcer.
for(const key of ['strike','spare','double','turkey','gutter_ball','nice_shot','hit_or_miss','extra_shot','no_shot','lose_points','double_points','swap_points'])
  emit(`voice_${key}`,`voice-${key.replaceAll('_','-')}.mp3`,mp3(normalize(fade(cut(trimStart(decode(`tts-${key}.mp3`,1),.02,.01),0,1.45),0,.12),-1.5),96),`tts-${key}.mp3`,'silence trimmed, mono, MP3 96 kbps');

// Power-card cues. Names match audio3d.js fx(): the clip fx_<name> replaces the synthesized cue.
const one=(name,file,source,from,to,{peak=-2,fadeIn=.004,fadeOut=.08,trim=false}={})=>{
  let clip=cut(decode(source,1),from,to);if(trim)clip=trimStart(clip,.02);
  emit(`fx_${name}`,file,wav(normalize(fade(clip,fadeIn,fadeOut),peak)),source,`${from}–${to??'end'} s, mono, peak ${peak} dB`);
};
one('card_flip','fx-card-flip.wav','fs-571577-card-deal.mp3',.15,.55,{trim:true});
one('card_in','fx-card-in.wav','bsb-2079-chimes-dream-1.wav',.05,2.25,{peak:-3,fadeOut:.4});
one('chime','fx-chime.wav','bsb-2079-chimes-dream-1.wav',.35,1.45,{peak:-4,fadeIn:.03,fadeOut:.35});
emit('fx_drumroll','fx-drumroll.wav',wav(normalize(loop(cut(decode('fs-77305-buzz-roll.mp3',1),.05,1.65),.25),-5)),'fs-77305-buzz-roll.mp3','0.05–1.65 s, mono, 0.25 s cross-faded loop, peak −5 dB');
one('rimshot','fx-rimshot.wav','fs-77305-buzz-roll.mp3',3.8,4.4,{trim:true,fadeOut:.2});
one('ding','fx-ding.wav','bsb-1631-microwave-bell.wav',0,1.3,{trim:true,fadeOut:.5});
one('buzzer','fx-buzzer.wav','fs-648462-wrong-answer.mp3',0,1.04,{peak:-5,fadeOut:.05});
one('bonk','fx-bonk.wav','bsb-2284-boing-cartoon-8.wav',0,1.0,{fadeOut:.3});
one('deflate','fx-deflate.wav','fs-326756-balloon-deflate.mp3',.15,1.95,{peak:-4,fadeIn:.02,fadeOut:.3});
one('whistle_down','fx-whistle-down.wav','fs-497093-whistle-down.mp3',0,1.15,{peak:-5,fadeOut:.05});
one('shatter','fx-shatter.wav','bsb-1121-broken-ball-1.wav',.08,.95,{trim:true,fadeOut:.3});
one('vortex','fx-vortex.wav','fs-609395-vortex.mp3',0,2.5,{peak:-5,fadeIn:.25,fadeOut:.6});
one('gasp','fx-gasp.wav','fs-232263-gasp.mp3',.3,1.25,{peak:-3,fadeIn:.02,fadeOut:.2});
one('laugh','fx-laugh.wav','fs-430815-kids-laugh.mp3',.25,1.85,{peak:-3,fadeIn:.03,fadeOut:.3});
// Sign slamming down: metal hammer on a wooden floor over a wooden thump.
emit('fx_thud','fx-thud.wav',wav(normalize(fade(mix([[cut(decode('fs-388833-hammer-wood.mp3',1),0,.5),0,1],[trimStart(cut(decode('bsb-1841-wooden-thump.wav',1),.5,.9),.02),0,.8]]),0,.15),-1)),
  'fs-388833-hammer-wood.mp3 + bsb-1841-wooden-thump.wav','hammer 0–0.5 s mixed with wooden thump 0.5–0.9 s, mono, peak −1 dB');
// Coin shower: the recording drops coins one at a time, so six stretches are layered into a pour.
{const coins=decode('bsb-0194-coins-2.mp3',1),cup=trimStart(decode('bsb-0339-coin-in-cup-1.wav',1),.02);
  emit('fx_coins','fx-coins.wav',wav(normalize(fade(mix([[cup,0,.9],...[0,5,9,13,22.5,30,36].map((from,i)=>[cut(coins,from,from+2.1),i*.07,1])]),.003,.5),-2)),
    'bsb-0194-coins-2.mp3 + bsb-0339-coin-in-cup-1.wav','seven 2.1 s stretches layered 0.07 s apart plus one coin-in-cup, mono, peak −2 dB');}

writeFileSync(outDir+'manifest.json',JSON.stringify(manifest,null,1));
const total=Object.values(manifest.clips).reduce((sum,clip)=>sum+clip.bytes,0);
console.log(`${Object.keys(manifest.clips).length} clips, ${(total/1024).toFixed(0)} KB → ${outDir}`);

// Basketball announcer lines (same synthetic voice) go to public/basket3d/audio with their own manifest.
// The basketball game shares every other clip above with bowling.
{
  const basketDir=`${root}public/basket3d/audio/`,lines={one_point:'One point!',two_points:'Two points!',three_points:'Three points!',four_points:'Four points!',
    slam_dunk:'Slam dunk!',steal:'Steal!',on_fire:'On fire!',so_close:'So close!'};
  // Court recordings (approved and downloaded 2026-11-26), all CC0.
  const courtDir=`${root}qa/basket3d-audio-20261126/source/`,fsPage=(user,id)=>`https://freesound.org/people/${user}/sounds/${id}/`,fsFile=(id,uid)=>`https://cdn.freesound.org/previews/${String(id).slice(0,-3)}/${id}_${uid}-hq.mp3`;
  const court={
    'fs-505628-bounce.mp3':{page:fsPage('Blankened',505628),url:fsFile(505628,6512859),licence:FS},
    'fs-518048-net-swish.mp3':{page:fsPage('Hann90',518048),url:fsFile(518048,3663300),licence:FS},
    'fs-716930-swish.mp3':{page:fsPage('vhschool2019',716930),url:fsFile(716930,9589340),licence:FS,used:false},
    'fs-244348-rim.mp3':{page:fsPage('reedhos',244348),url:fsFile(244348,4468535),licence:FS},
    'fs-788259-hit-basket.mp3':{page:fsPage('amsaenz03',788259),url:fsFile(788259,16382061),licence:FS,used:false},
    'fs-324247-backboard.mp3':{page:fsPage('PerMagnusLindborg',324247),url:fsFile(324247,4157407),licence:FS},
    'fs-412162-arena-cheer.mp3':{page:fsPage('phillyfan972',412162),url:fsFile(412162,2383873),licence:FS},
    'bsb-0938-sneakers.mp3':{page:'https://bigsoundbank.com/gnashing-basketball-s0938.html',url:'https://bigsoundbank.com/UPLOAD/mp3/0938.mp3',licence:BSB},
    'bsb-1587-buzzer-5.mp3':{page:'https://bigsoundbank.com/buzzer-5-s1587.html',url:'https://bigsoundbank.com/UPLOAD/mp3/1587.mp3',licence:BSB},
  };
  const basket={generated:'scripts/prepare-bowling3d-audio.mjs',note:`Court recordings are CC0. Announcer: ${TTS}. Crowd, card and replay clips are shared with /bowling3d/audio.`,sources:{},clips:{}};
  for(const [name,info] of Object.entries(court))basket.sources[name]={...info,sha256:sha(readFileSync(courtDir+name))};
  const put=(name,file,buffer,source,processing)=>{writeFileSync(basketDir+file,buffer);basket.clips[name]={file,bytes:buffer.length,sha256:sha(buffer),source,processing};};
  const shot=(name,file,source,from,to,{peak=-2,fadeIn=.003,fadeOut=.08,trim=false}={})=>{
    let clip=cut(decode(source,1,courtDir),from,to);if(trim)clip=trimStart(clip,.03);
    put(name,file,wav(normalize(fade(clip,fadeIn,fadeOut),peak)),source,`${from}–${to??'end'} s, mono, peak ${peak} dB`);
  };
  mkdirSync(basketDir,{recursive:true});
  shot('bb_bounce','bb-bounce.wav','fs-505628-bounce.mp3',0,.25,{trim:true,fadeOut:.05});
  [[1.72,2.12],[4.24,4.78],[5.12,5.66]].forEach(([from,to],i)=>shot(`bb_swish_${i+1}`,`bb-swish-${i+1}.wav`,'fs-518048-net-swish.mp3',from,to,{peak:-3,fadeIn:.01,fadeOut:.12}));
  [[1.66,2.5],[4.46,5.3],[5.86,6.8]].forEach(([from,to],i)=>shot(`bb_rim_${i+1}`,`bb-rim-${i+1}.wav`,'fs-244348-rim.mp3',from,to,{trim:true,fadeOut:.3}));
  shot('bb_board','bb-board.wav','fs-324247-backboard.mp3',0,.6,{trim:true,fadeOut:.15});
  [[.22,.62],[1.82,2.22],[5.02,5.42],[6.62,7.02]].forEach(([from,to],i)=>shot(`bb_squeak_${i+1}`,`bb-squeak-${i+1}.wav`,'bsb-0938-sneakers.mp3',from,to,{peak:-6,trim:true,fadeOut:.1}));
  shot('bb_buzzer','bb-buzzer.wav','bsb-1587-buzzer-5.mp3',.05,1.45,{peak:-6,fadeIn:.01,fadeOut:.25});
  put('bb_cheer_big','bb-cheer-big.mp3',mp3(normalize(fade(cut(decode('fs-412162-arena-cheer.mp3',2,courtDir),12.4,16.6),.25,1.2),-1),128),'fs-412162-arena-cheer.mp3','12.4–16.6 s, fades, MP3 128 kbps');
  put('bb_cheer','bb-cheer.mp3',mp3(normalize(fade(cut(decode('fs-412162-arena-cheer.mp3',2,courtDir),3.4,6.4),.3,1.1),-4),128),'fs-412162-arena-cheer.mp3','3.4–6.4 s, fades, MP3 128 kbps');
  for(const [key,text] of Object.entries(lines)){
    const source=`tts-bb-${key}.mp3`,file=`voice-${key.replaceAll('_','-')}.mp3`;
    const buffer=mp3(normalize(fade(cut(trimStart(decode(source,1),.02,.01),0,1.45),0,.12),-1.5),96);
    writeFileSync(basketDir+file,buffer);
    basket.clips[`voice_${key}`]={file,text,bytes:buffer.length,sha256:sha(buffer),source,sourceSha256:sha(readFileSync(sourceDir+source))};
  }
  writeFileSync(basketDir+'manifest.json',JSON.stringify(basket,null,1));
  console.log(`${Object.keys(basket.clips).length} basketball clips, ${(Object.values(basket.clips).reduce((sum,clip)=>sum+clip.bytes,0)/1024).toFixed(0)} KB → ${basketDir}`);
}
