// A quiet, original pentatonic loop. No downloads or speech compete with class discussion.
let context;
export function unlockAudio(){
 try{context??=new (window.AudioContext||window.webkitAudioContext)();return context.resume().then(()=>context).catch(()=>null);}catch{return Promise.resolve(null);}
}
const notes=[72,0,76,79,0,76,74,0,69,0,72,76,0,74,72,0,65,0,69,72,0,69,67,0,67,0,71,74,0,71,72,0];
export function tone(ctx,target,midi,time,duration,level=.09,type='sine'){
 const oscillator=ctx.createOscillator(),envelope=ctx.createGain();oscillator.type=type;oscillator.frequency.value=440*2**((midi-69)/12);
 envelope.gain.setValueAtTime(0,time);envelope.gain.linearRampToValueAtTime(level,time+.025);envelope.gain.exponentialRampToValueAtTime(.0001,time+duration);
 oscillator.connect(envelope);envelope.connect(target);oscillator.onended=()=>{oscillator.disconnect();envelope.disconnect();};oscillator.start(time);oscillator.stop(time+duration+.02);
 return oscillator;
}
export function musicStep(ctx,target,step,time){
 const voices=[],note=notes[step%notes.length];if(note)voices.push(tone(ctx,target,note,time,.30,.065,'triangle'));
 if(step%4===0){const bass=[48,45,41,43][Math.floor(step/8)%4];voices.push(tone(ctx,target,bass,time,.65,.08));}
 return voices;
}
export function createClassAudio(){
 let ctx,music,effects,timer,step=0,next=0,disposed=false,active=false,voices=new Set();
 let settings={musicOn:false,musicVolume:.25,effectsVolume:.65,quiet:false};
 const track=nodes=>nodes.forEach(o=>{voices.add(o);o.addEventListener('ended',()=>voices.delete(o));});
 function stop(){clearInterval(timer);timer=null;for(const o of voices){try{o.stop();}catch{}}voices.clear();}
 function update(){
  if(!ctx)return;const enabled=active&&!settings.quiet;
  music.gain.setTargetAtTime(enabled&&settings.musicOn?settings.musicVolume:0,ctx.currentTime,.035);
  effects.gain.setTargetAtTime(enabled?settings.effectsVolume:0,ctx.currentTime,.035);
  if(!enabled||!settings.musicOn||settings.musicVolume===0){stop();return;}
  if(!timer){next=ctx.currentTime+.06;const tick=()=>{if(ctx.state!=='running')return;if(next<ctx.currentTime)next=ctx.currentTime+.03;while(next<ctx.currentTime+.45){track(musicStep(ctx,music,step++,next));next+=.32;}};tick();timer=setInterval(tick,120);}
 }
 return {
  async unlock(){const unlocked=await unlockAudio();if(!unlocked||disposed)return false;if(!ctx){ctx=unlocked;music=ctx.createGain();effects=ctx.createGain();music.gain.value=0;effects.gain.value=0;music.connect(ctx.destination);effects.connect(ctx.destination);}update();return ctx.state==='running';},
  configure(value,isActive){settings={...settings,...value};active=isActive;update();},
  cue(correct=true){if(!ctx||!active||settings.quiet||!settings.effectsVolume)return;const melody=correct?[72,76,79,84]:[74,72];track(melody.map((n,i)=>tone(ctx,effects,n,ctx.currentTime+.01+i*.12,.25,.10)));},
  dispose(){disposed=true;stop();music?.disconnect();effects?.disconnect();}
 };
}
