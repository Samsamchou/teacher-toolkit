import {SOUND_RATE,EFFECT_NAMES,COOLDOWNS,renderEffect,renderMusic} from './game-sound-design.mjs';
import {createCelebrationAudio} from './celebration-audio.mjs';

export function createGameAudio({contextFactory=()=>new (window.AudioContext||window.webkitAudioContext)(),now=()=>performance.now()}={}){
 let context,master,effects,music,enabled=true,musicEnabled=true,volume=.65,phase='paused',level=1,loop=null,disposed=false;
 const buffers=new Map(),active=new Set(),last=new Map(),variations=new Map();
 const celebration=createCelebrationAudio({getContext:()=>context,getDestination:()=>master,isEnabled:()=>enabled&&volume>0});
 function init(){if(context||disposed)return;context=contextFactory();master=context.createGain();master.gain.value=volume;const limiter=context.createDynamicsCompressor();limiter.threshold.value=-18;limiter.knee.value=18;limiter.ratio.value=6;limiter.attack.value=.004;limiter.release.value=.18;effects=context.createGain();effects.gain.value=.65;music=context.createGain();music.gain.value=.27;effects.connect(master);music.connect(master);master.connect(limiter);limiter.connect(context.destination);}
 function buffer(key,build){if(!buffers.has(key)){const pcm=build(),b=context.createBuffer(1,pcm.length,SOUND_RATE);b.copyToChannel(pcm,0);buffers.set(key,b);}return buffers.get(key);}
 function stop(source){try{source.stop();}catch{}try{source.disconnect();}catch{}active.delete(source);}
 function stopAll(){for(const source of [...active])stop(source);loop=null;}
 function startMusic(){if(disposed||!context||context.state!=='running'||!enabled||!musicEnabled||phase!=='playing'||loop)return;const source=context.createBufferSource();source.buffer=buffer('music-'+level,()=>renderMusic(level).samples);source.loop=true;source.connect(music);source.start();loop=source;active.add(source);source.onended=()=>{active.delete(source);source.disconnect();};}
 async function unlock(){if(disposed)return false;try{init();await context.resume();if(disposed)return false;startMusic();return context.state==='running';}catch{return false;}}
 function play(kind,{x=480,tier=1}={}){
  if(disposed||!enabled||!context||context.state!=='running'||!EFFECT_NAMES.includes(kind))return false;
  if(['shot','impact','defeat','hurt','shield','orbit','frost','lightning','heal','dash'].includes(kind)&&phase!=='playing')return false;
  const t=now();if(t-(last.get(kind)??-Infinity)<COOLDOWNS[kind]||active.size>=12)return false;last.set(kind,t);
  const v=(variations.get(kind)||0)%3;variations.set(kind,v+1);
  const source=context.createBufferSource();source.buffer=buffer(`${kind}-${v}-${tier}`,()=>renderEffect(kind,{variation:v,tier}));
  const panner=context.createStereoPanner?.();if(panner){panner.pan.value=Math.max(-.65,Math.min(.65,(x-480)/700));source.connect(panner);panner.connect(effects);}else source.connect(effects);
  active.add(source);source.onended=()=>{active.delete(source);source.disconnect();panner?.disconnect();};source.start();return true;
 }
 return {
  unlock,play,prepareCelebration:celebration.prepare,playCelebration:celebration.play,stopCelebration:celebration.stop,
  setEnabled(value){enabled=!!value;if(!enabled){stopAll();celebration.stop();}else startMusic();},
  setVolume(value){volume=Math.max(0,Math.min(1,Number(value)||0));if(master)master.gain.setTargetAtTime(volume,context.currentTime,.025);},
  setMusic(value){musicEnabled=!!value;if(!musicEnabled&&loop){stop(loop);loop=null;}else startMusic();},
  setScene(nextPhase,nextLevel=1){const next=Math.max(1,Math.min(6,Math.round(nextLevel)||1));if(nextPhase!==phase||next!==level)stopAll();phase=nextPhase;level=next;startMusic();},
  dispose(){disposed=true;stopAll();celebration.dispose();buffers.clear();context?.close().catch(()=>{});},
 };
}
