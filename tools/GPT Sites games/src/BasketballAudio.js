// Original, locally synthesized sound design; no network calls or sampled reference audio.
export const CELEBRATION_SECONDS=6.6;
export class BasketballAudio {
 constructor(){this.context=null;this.bus={};this.nodes=new Set();this.celebrationNodes=new Set();this.timer=null;this.step=0;this.settings={music:.28,sounds:.55,ambience:.16};}
 async unlock(){try{if(!this.context){this.context=new (window.AudioContext||window.webkitAudioContext)();for(const key of ['music','sounds','ambience']){const g=this.context.createGain();g.connect(this.context.destination);this.bus[key]=g;}this.configure(this.settings);}await this.context.resume();}catch{}}
 configure(settings){this.settings={...this.settings,...settings};for(const [key,bus] of Object.entries(this.bus))bus.gain.setTargetAtTime(this.settings.muted?0:this.settings[key],this.context.currentTime,.04);}
 tone(freq,duration=.2,volume=.2,type='triangle',bus='sounds',delay=0,endFreq){const c=this.context;if(!c||c.state!=='running')return;const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+delay;o.type=type;o.frequency.setValueAtTime(freq,t);if(endFreq)o.frequency.exponentialRampToValueAtTime(endFreq,t+duration);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(volume,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g).connect(this.bus[bus]);o.start(t);o.stop(t+duration+.02);this.nodes.add(o);o.onended=()=>{this.nodes.delete(o);o.disconnect();g.disconnect();};}
 noise(duration=.2,volume=.2,bus='sounds',filterFreq=1800,delay=0){const c=this.context;if(!c||c.state!=='running')return;const b=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1);const n=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter(),t=c.currentTime+delay;n.buffer=b;f.type='lowpass';f.frequency.value=filterFreq;g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);n.connect(f).connect(g).connect(this.bus[bus]);n.start(t);this.nodes.add(n);n.onended=()=>{this.nodes.delete(n);n.disconnect();g.disconnect();f.disconnect();};}
 click(){this.tone(800,.07,.12);}
 bounce(){this.tone(150,.16,.45,'sine','sounds',0,48);this.noise(.09,.14,'sounds',450);}
 shoot(){this.noise(.32,.24,'sounds',2300);this.tone(320,.25,.1,'sine','sounds',0,780);}
 hit(){this.noise(.32,.25,'sounds',3800);[523,659,784].forEach((f,i)=>this.tone(f,.28,.18,'triangle','sounds',i*.09));}
 miss(){this.tone(240,.11,.22,'triangle');this.tone(160,.2,.16,'triangle','sounds',.12);this.bounce();}
 boost(){[440,660,880,1320].forEach((f,i)=>this.tone(f,.18,.15,'sine','sounds',i*.08));}
 // Layered arena crowd, applause and shoe squeaks, synthesized locally.
 crowd(duration=2,volume=.035,delay=0){this.noise(duration,volume,'ambience',950,delay);this.noise(duration,volume*.45,'ambience',2400,delay);}
 clap(delay=0,volume=.09){this.noise(.09,volume,'ambience',3100,delay);this.noise(.06,volume*.55,'ambience',1800,delay+.025);}
 squeak(delay=0){this.tone(1250,.12,.035,'sine','ambience',delay,1850);this.tone(1700,.08,.02,'sine','ambience',delay+.1,950);}
 stopCelebration(){for(const n of this.celebrationNodes){try{n.stop();}catch{}this.nodes.delete(n);}this.celebrationNodes.clear();}
 win(){this.stopCelebration();const before=new Set(this.nodes);[523,659,784,1047,784,1047,1319].forEach((f,i)=>this.tone(f,.35,.14,'triangle','sounds',i*.17));
  this.crowd(CELEBRATION_SECONDS,.15);
  for(let i=0;i<24;i++){const delay=i*.25,fade=Math.min(1,(CELEBRATION_SECONDS-delay)/2);this.clap(delay,.12*fade);if(i%4===0)this.crowd(Math.min(1.5,CELEBRATION_SECONDS-delay),.07*fade,delay);}
  for(const n of this.nodes)if(!before.has(n))this.celebrationNodes.add(n);
 }
 beat(){const n=this.step++%32;this.tone(n%4===0?72:58,.15,.13,'sine','music',0,35);if(n%4===2)this.noise(.1,.04,'music',1800);if(n%8===0)this.crowd(2.4,.04);if(n===5||n===21)this.squeak();if(n===12||n===28){this.tone(145,.17,.1,'sine','ambience',0,48);this.noise(.08,.035,'ambience',500);}if(n===18||n===19)this.clap(0,.035);}
 start(){if(this.timer)return;this.beat();this.timer=setInterval(()=>this.beat(),240);}
 pause(){this.stopCelebration();clearInterval(this.timer);this.timer=null;for(const n of this.nodes){try{n.stop();}catch{}}this.nodes.clear();}
 preview(bus){if(bus==='sounds')this.hit();if(bus==='music'){[523,659,784,659].forEach((f,i)=>this.tone(f,.25,.2,'triangle','music',i*.2));}if(bus==='ambience'){this.crowd(2.4,.12);this.clap(.5);this.clap(.85);this.squeak(1.3);}}
 dispose(){this.pause();this.context?.close();}
}
