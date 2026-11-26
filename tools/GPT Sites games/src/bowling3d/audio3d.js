// Event-driven sound for the 3D bowling shot. Every pin contact reported by the physics triggers its own hit,
// so the sound always matches the picture. Recorded CC0 clips are listed in public/bowling3d/audio/manifest.json;
// a cue whose clip is missing falls back to the synthesis below.
const clip=file=>`/bowling3d/audio/${file}`;
export const BOWLING3D_SAMPLES={
  roll:clip('roll.wav'),strike:clip('strike.wav'),pins:clip('pins.wav'),
  pin_hit_1:clip('pin-hit-1.wav'),pin_hit_2:clip('pin-hit-2.wav'),pin_hit_3:clip('pin-hit-3.wav'),
  pin_hit_4:clip('pin-hit-4.wav'),pin_hit_5:clip('pin-hit-5.wav'),pin_hit_6:clip('pin-hit-6.wav'),
  cheer_big:clip('cheer-big.mp3'),cheer:clip('cheer.mp3'),aww:clip('aww.mp3'),swoosh:clip('swoosh.wav'),boom:clip('boom.mp3'),
  firework:clip('firework.wav'),crackle_1:clip('crackle-1.wav'),crackle_2:clip('crackle-2.wav'),crackle_3:clip('crackle-3.wav'),crackle_4:clip('crackle-4.wav'),
  voice_strike:clip('voice-strike.mp3'),voice_spare:clip('voice-spare.mp3'),voice_double:clip('voice-double.mp3'),
  voice_turkey:clip('voice-turkey.mp3'),voice_gutter_ball:clip('voice-gutter-ball.mp3'),voice_nice_shot:clip('voice-nice-shot.mp3'),
  voice_hit_or_miss:clip('voice-hit-or-miss.mp3'),voice_extra_shot:clip('voice-extra-shot.mp3'),voice_no_shot:clip('voice-no-shot.mp3'),
  voice_lose_points:clip('voice-lose-points.mp3'),voice_double_points:clip('voice-double-points.mp3'),voice_swap_points:clip('voice-swap-points.mp3'),
  // Power-card cues: fx(name) plays fx_<name>.
  ...Object.fromEntries(['card_flip','card_in','chime','drumroll','rimshot','ding','buzzer','bonk','deflate','whistle_down','shatter','vortex','gasp','laugh','thud','coins']
    .map(name=>[`fx_${name}`,clip(`fx-${name.replace('_','-')}.wav`)])),
};
export const BOWLING3D_MUSIC=clip('music.mp3');

export class Bowling3DAudio{
  constructor(){
    this.context=null;this.volume=.8;this.musicVolume=.4;this.muted=false;this.samples=new Map();
    this.roll=null;this.lastContact=0;this.musicNode=null;this.loading=null;this.ducked=false;
  }
  async unlock(){
    if(!this.context){
      const Ctor=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Ctor)return false;
      const c=this.context=new Ctor();
      this.master=c.createGain();this.music=c.createGain();this.limiter=c.createDynamicsCompressor();
      this.limiter.threshold.value=-10;this.limiter.ratio.value=6;this.limiter.attack.value=.003;this.limiter.release.value=.18;
      this.master.gain.value=0;this.music.gain.value=0; // faded in by configure, so nothing starts at full volume
      this.master.connect(this.limiter).connect(c.destination);this.music.connect(c.destination);this.configure({});
      const length=c.sampleRate*2,buffer=c.createBuffer(1,length,c.sampleRate),data=buffer.getChannelData(0);
      for(let i=0;i<length;i++)data[i]=Math.random()*2-1;this.noiseBuffer=buffer;
    }
    await this.context.resume();return this.context.state==='running';
  }
  configure({volume,musicVolume,muted}){
    if(volume!==undefined)this.volume=volume;if(musicVolume!==undefined)this.musicVolume=musicVolume;if(muted!==undefined)this.muted=muted;
    if(!this.master||!this.context)return;const t=this.context.currentTime;
    this.master.gain.setTargetAtTime(this.muted?0:this.volume,t,.03);
    this.music.gain.setTargetAtTime(this.muted?0:this.musicVolume*.42*(this.ducked?.35:1),t,.12);
  }
  get ready(){return this.context?.state==='running';}
  /** Loads the recorded clips once. Missing or undecodable files are skipped. */
  load(entries=BOWLING3D_SAMPLES){
    if(!this.context)return Promise.resolve();
    this.loading??=Promise.all(Object.entries(entries).map(async([name,url])=>{
      try{const response=await fetch(url);if(!response.ok)return;this.samples.set(name,await this.context.decodeAudioData(await response.arrayBuffer()));}catch{}
    }));
    return this.loading;
  }
  async startMusic(url=BOWLING3D_MUSIC){
    if(this.musicNode||!this.context)return;
    if(!this.samples.has('music')){
      this.musicNode='loading';
      try{const response=await fetch(url);if(response.ok)this.samples.set('music',await this.context.decodeAudioData(await response.arrayBuffer()));}catch{}
      if(this.musicNode!=='loading')return; // stopped while loading
      this.musicNode=null;
    }
    const buffer=this.samples.get('music');if(!buffer||!this.context||this.musicNode)return;
    const source=this.context.createBufferSource();source.buffer=buffer;source.loop=true;
    source.loopStart=.03;source.loopEnd=Math.max(.1,buffer.duration-.03); // skips MP3 padding at both ends
    source.connect(this.music);source.start(0,.03);this.musicNode=source;
  }
  stopMusic(){if(this.musicNode&&this.musicNode!=='loading'){try{this.musicNode.stop();}catch{}}this.musicNode=null;}
  /** Lowers the music under replays and big moments. */
  duck(on){this.ducked=on;this.configure({});}
  sample(name,{gain=1,rate=1,delay=0,pan=0}={}){
    const buffer=this.samples.get(name);if(!buffer||!this.ready)return false;
    const c=this.context,source=c.createBufferSource(),g=c.createGain(),p=c.createStereoPanner();
    source.buffer=buffer;source.playbackRate.value=rate;g.gain.value=gain;p.pan.value=Math.max(-1,Math.min(1,pan));
    source.connect(g).connect(p).connect(this.master);source.start(c.currentTime+delay);return true;
  }
  tone(freq,{end,duration=.2,gain=.2,type='sine',delay=0,pan=0,attack=.005,filter}={}){
    if(!this.ready)return;const c=this.context,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain(),p=c.createStereoPanner();
    o.type=type;o.frequency.setValueAtTime(freq,t);if(end)o.frequency.exponentialRampToValueAtTime(end,t+duration);
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    p.pan.value=Math.max(-1,Math.min(1,pan));let node=o;
    if(filter){const f=c.createBiquadFilter();f.type=filter.type||'lowpass';f.frequency.value=filter.freq;f.Q.value=filter.q||1;node=o.connect(f);}
    node.connect(g).connect(p).connect(this.master);o.start(t);o.stop(t+duration+.05);
  }
  noise({duration=.2,gain=.2,delay=0,type='bandpass',freq=1500,endFreq,q=1,pan=0,attack=.004,hold=0}={}){
    if(!this.ready)return;const c=this.context,t=c.currentTime+delay,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain(),p=c.createStereoPanner();
    s.buffer=this.noiseBuffer;s.loop=true;f.type=type;f.Q.value=q;f.frequency.setValueAtTime(freq,t);
    if(endFreq)f.frequency.exponentialRampToValueAtTime(endFreq,t+duration);
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+attack);
    if(hold)g.gain.setValueAtTime(gain,t+attack+hold);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    p.pan.value=Math.max(-1,Math.min(1,pan));s.connect(f).connect(g).connect(p).connect(this.master);s.start(t,Math.random());s.stop(t+duration+.05);
  }
  charge(duration){this.tone(180,{end:920,duration,gain:.1,type:'triangle'});this.noise({duration,gain:.05,freq:500,endFreq:4000,q:2});}
  release(){this.noise({duration:.28,gain:.2,freq:700,endFreq:2600,q:.8});}
  rollStart(){
    if(!this.ready||this.roll)return;const c=this.context,recorded=this.samples.get('roll');
    const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain(),p=c.createStereoPanner(),lfo=c.createOscillator(),depth=c.createGain();
    s.buffer=recorded||this.noiseBuffer;s.loop=true;f.type='lowpass';f.frequency.value=recorded?9000:310;f.Q.value=.7;
    g.gain.setValueAtTime(.0001,c.currentTime);g.gain.linearRampToValueAtTime(recorded?1:.9,c.currentTime+.1);
    lfo.frequency.value=13;depth.gain.value=recorded?0:.28;lfo.connect(depth).connect(g.gain);
    s.connect(f).connect(g).connect(p).connect(this.master);s.start(0,recorded?Math.random()*2:0);lfo.start();this.roll={s,g,p,lfo};
  }
  rollUpdate(pan,rate=1){
    if(!this.roll)return;const t=this.context.currentTime;
    this.roll.p.pan.setTargetAtTime(Math.max(-1,Math.min(1,pan)),t,.05);this.roll.s.playbackRate.setTargetAtTime(Math.max(.25,rate),t,.05);
  }
  rollStop(){
    if(!this.roll)return;const {s,g,lfo}=this.roll,t=this.context.currentTime;this.roll=null;
    g.gain.cancelScheduledValues(t);g.gain.setTargetAtTime(.0001,t,.04);s.stop(t+.3);lfo.stop(t+.3);
  }
  /** One pin hit. force is the solver's contact force; rate<1 is used by the slow-motion replay. */
  contact(force,kind='pin',rate=1,pan=0){
    if(!this.ready)return;const now=this.context.currentTime;
    if(now-this.lastContact<.028)return;this.lastContact=now;
    const level=Math.min(1,Math.pow(force/900,.6))*(rate<1?.6:1)*(kind==='lane'?.55:1);
    if(level<.06)return;
    const pitch=rate*(kind==='lane'?.72:1)*(.9+Math.random()*.22);
    if(this.sample(`pin_hit_${1+Math.floor(Math.random()*6)}`,{gain:level*.8,rate:pitch,pan}))return;
    const tune=(.9+Math.random()*.22)*Math.max(.35,rate),length=(kind==='lane'?.07:.1)/Math.max(.4,rate);
    for(const [freq,amp] of [[1080,.5],[2360,.34],[3880,.2]])this.tone(freq*tune,{duration:length*(.7+Math.random()*.5),gain:level*amp*.42,pan,attack:.001});
    this.noise({duration:.03/Math.max(.4,rate),gain:level*.3,type:'highpass',freq:2400*Math.max(.4,rate),pan,attack:.001});
  }
  /** The ball reaching the pins: a recorded crash sized to the number of pins that will fall. */
  impact(count,tier){
    const big=tier==='special';
    this.tone(95,{end:42,duration:.2,gain:count?(big?.6:.4):.2}); // ball thump under the recording
    if(count>=8)this.sample('strike',{gain:big?1:.9})||this.noise({duration:.5,gain:.4,type:'highpass',freq:2500});
    else if(count>=4)this.sample('pins',{gain:.55+count*.06})||this.noise({duration:.3,gain:.3,type:'lowpass',freq:1800});
    if(big)this.tone(60,{end:30,duration:.5,gain:.4});
  }
  gutter(){this.tone(150,{end:70,duration:.16,gain:.5});this.noise({duration:.9,gain:.22,freq:480,q:3,hold:.4});}
  pit(){this.tone(110,{end:55,duration:.2,gain:.45});this.noise({duration:.12,gain:.2,type:'lowpass',freq:600});}
  swoosh(){if(!this.sample('swoosh',{gain:.9}))this.noise({duration:.42,gain:.3,freq:300,endFreq:3600,q:1.4});}
  slowBoom(){if(!this.sample('boom',{gain:.9,rate:.85})){this.tone(62,{end:27,duration:1.3,gain:.7});this.noise({duration:.9,gain:.2,type:'lowpass',freq:420});}}
  fanfare(kind){
    const brass=(freq,delay,duration=.22,gain=.1)=>{for(const detune of [1,1.006,2])this.tone(freq*detune,{duration,gain:gain/(detune>1.5?3:1),type:'sawtooth',delay,attack:.012,filter:{freq:2600}});};
    if(kind==='strike'){[523,659,784,1047,1319,1568].forEach((f,i)=>brass(f,i*.085));brass(1047,.56,.7,.13);brass(1319,.56,.7,.09);brass(1568,.56,.7,.09);
      this.noise({duration:.9,gain:.1,type:'highpass',freq:6000,delay:.56});}
    else if(kind==='spare'){[523,784,1047].forEach((f,i)=>brass(f,i*.1));brass(1047,.34,.45,.12);brass(1319,.34,.45,.08);}
    else if(kind==='good'){[659,880].forEach((f,i)=>brass(f,i*.11,.2,.08));}
    else if(kind==='miss'){[392,370,349,330].forEach((f,i)=>this.tone(f,{end:f*.94,duration:.3,gain:.12,type:'sawtooth',delay:i*.27,filter:{freq:900,q:4}}));}
  }
  cheer(level=1){
    if(this.sample(level>.7?'cheer_big':'cheer',{gain:Math.min(1,.2+level*.8)}))return;
    const length=1.4+level*2.2;
    this.noise({duration:length,gain:.16*level,freq:1500,q:.6,attack:.25,hold:length*.4});
    for(let i=0;i<Math.round(length*13*level);i++)this.noise({duration:.045,gain:.07*level,type:'bandpass',freq:1900+Math.random()*1900,q:1.5,delay:.15+Math.random()*length*.8,pan:Math.random()*1.8-.9,attack:.001});
  }
  aww(){
    if(this.sample('aww',{gain:.9}))return;
    for(let i=0;i<7;i++){const start=300+Math.random()*190;
      this.tone(start,{end:start*.66,duration:.9+Math.random()*.35,gain:.045,type:'sawtooth',delay:Math.random()*.12,pan:Math.random()*1.6-.8,attack:.09,filter:{type:'bandpass',freq:650+Math.random()*250,q:4}});}
  }
  firework(delay=0){
    const pan=Math.random()*1.4-.7;
    if(this.sample('firework',{delay,gain:.55,rate:.9+Math.random()*.25,pan})){
      this.sample(`crackle_${1+Math.floor(Math.random()*4)}`,{delay:delay+.18+Math.random()*.15,gain:.5,pan});return;}
    this.tone(120,{end:50,duration:.25,gain:.3,delay});this.noise({duration:.5,gain:.16,type:'highpass',freq:3000,delay,attack:.002});
  }
  /** Power-card cue. A recorded clip named fx_<name> wins; otherwise the cue is synthesized. */
  fx(name){
    if(!this.ready||this.sample(`fx_${name}`,{gain:.9}))return;
    const ping=(freq,delay=0,duration=.3,gain=.12,type='sine')=>this.tone(freq,{duration,gain,delay,type,attack:.003});
    switch(name){
      case 'card_in':this.noise({duration:.55,gain:.2,freq:400,endFreq:3200,q:1.2});for(let i=0;i<6;i++)ping(1800+Math.random()*2400,.15+i*.07,.25,.06);break;
      case 'card_flip':this.noise({duration:.08,gain:.3,type:'highpass',freq:2600,attack:.001});ping(1320,0,.12,.1,'triangle');break;
      case 'sparkle':for(let i=0;i<7;i++)ping(2000+Math.random()*2600,i*.05,.3,.07);break;
      case 'pop':this.tone(480,{end:1300,duration:.09,gain:.3,type:'triangle'});this.noise({duration:.07,gain:.25,type:'highpass',freq:1800,attack:.001});break;
      case 'chime':[1047,1319,1568,2093].forEach((f,i)=>ping(f,i*.075,.9,.13,'triangle'));break;
      case 'ding':ping(1568,0,.6,.16);ping(2093,.02,.7,.1);break;
      case 'buzzer':for(const f of [148,153])this.tone(f,{duration:.5,gain:.2,type:'sawtooth',filter:{freq:900}});break;
      case 'thud':this.tone(92,{end:38,duration:.3,gain:.75});this.noise({duration:.14,gain:.35,type:'lowpass',freq:320});break;
      case 'bonk':this.tone(320,{end:130,duration:.2,gain:.4,type:'triangle'});this.tone(640,{end:300,duration:.12,gain:.2});break;
      case 'deflate':this.noise({duration:1.5,gain:.16,freq:2600,endFreq:420,q:2.5,attack:.02,hold:.5});this.tone(190,{end:58,duration:1.4,gain:.12,type:'sawtooth',filter:{freq:620,q:3}});break;
      case 'hole':this.tone(130,{end:55,duration:.45,gain:.4});this.noise({duration:.3,gain:.14,type:'lowpass',freq:500});break;
      case 'wobble':[520,580,520,600].forEach((f,i)=>ping(f,i*.11,.1,.12,'triangle'));break;
      case 'whistle_down':this.tone(1700,{end:240,duration:.62,gain:.22});break;
      case 'shatter':this.noise({duration:.3,gain:.35,type:'highpass',freq:3200,attack:.001});for(let i=0;i<9;i++)ping(2600+Math.random()*3800,Math.random()*.25,.18,.07);break;
      case 'coins':for(let i=0;i<24;i++)ping(2300+Math.random()*2100,Math.random()*1.2,.14,.07,'triangle');break;
      case 'vortex':this.noise({duration:3,gain:.2,freq:320,endFreq:1700,q:2.2,attack:.4,hold:1.6});this.tone(105,{end:230,duration:2.4,gain:.16,type:'sawtooth',filter:{freq:520,q:2}});break;
      case 'gasp':this.noise({duration:.55,gain:.14,freq:900,endFreq:2200,q:1.1,attack:.2});break;
    }
  }
  /** Snare roll for Hit or Miss; runs until drumStop(). */
  drumStart(){
    if(!this.ready||this.drum)return;const c=this.context;
    if(!this.samples.has('fx_drumroll')&&!this.drumBuffer){
      const rate=c.sampleRate,buffer=c.createBuffer(1,rate,rate),data=buffer.getChannelData(0),gap=Math.round(rate/27);
      for(let i=0;i<rate;i++){const k=(i%gap)/rate;data[i]=(Math.random()*2-1)*Math.exp(-k*150)*(.75+.25*Math.sin(i/rate*Math.PI*8));}
      this.drumBuffer=buffer;
    }
    const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
    s.buffer=this.samples.get('fx_drumroll')||this.drumBuffer;s.loop=true;f.type='highpass';f.frequency.value=this.samples.has('fx_drumroll')?60:900;
    g.gain.setValueAtTime(.08,c.currentTime);g.gain.linearRampToValueAtTime(.38,c.currentTime+1.1);
    s.connect(f).connect(g).connect(this.master);s.start();this.drum={s,g};
  }
  drumStop(){
    if(!this.drum)return;const {s,g}=this.drum,t=this.context.currentTime;this.drum=null;
    g.gain.cancelScheduledValues(t);g.gain.setTargetAtTime(.0001,t,.02);s.stop(t+.15);
  }
  /** Announcer line such as "Strike" or "Gutter ball". Uses the recorded clip, else the browser voice. */
  announce(text,delay=.25){
    if(this.muted||!text)return;
    if(this.sample(`voice_${text.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')}`,{delay,gain:1}))return;
    try{const speech=globalThis.speechSynthesis;if(!speech)return;const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=1.02;u.pitch=1.15;u.volume=Math.min(1,this.volume);speech.cancel();speech.speak(u);}catch{}
  }
  stop(){this.rollStop();this.drumStop();this.stopMusic();try{globalThis.speechSynthesis?.cancel();}catch{}}
  /** Closes the audio device. unlock() can open it again later (React remounts, returning to the game). */
  dispose(){
    this.stop();const context=this.context;this.context=this.master=this.music=this.limiter=null;this.samples.clear();this.loading=null;
    if(context&&context.state!=='closed')context.close().catch(()=>{});
  }
}
