// Original procedural coastal ambience and melody; no external audio requests.
export class BeachAudio {
 constructor(){this.sources=[];this.voices=new Set();this.stepTimer=null;this.context=null;this.level=.5;}
 buffer(seconds,fn){const c=this.context,b=c.createBuffer(1,Math.ceil(c.sampleRate*seconds),c.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=fn(i/c.sampleRate,i);return b;}
 createBackground(){const c=this.context;this.background=c.createGain();this.background.gain.value=0;this.background.connect(c.destination);
  let brown=0;const sea=this.buffer(24,t=>{brown=(brown+.035*(Math.random()*2-1))/1.035;const swell=.24+.76*(.5-.5*Math.cos(2*Math.PI*t/8));return brown*swell*2.5;});
  const breeze=this.buffer(12,()=> (Math.random()*2-1)*.028);
  const melody=this.buffer(12,()=>0),a=melody.getChannelData(0),notes=[72,76,79,76,74,77,81,77,72,76,79,83,81,79,76,74];
  const add=(midi,start,dur,amp)=>{const f=440*2**((midi-69)/12);for(let j=0;j<dur*c.sampleRate;j++){const t=j/c.sampleRate,k=Math.floor(start*c.sampleRate)+j;if(k>=a.length)break;const env=Math.min(1,t/.012)*Math.exp(-t*5);a[k]+=amp*env*(Math.sin(2*Math.PI*f*t)+.22*Math.sin(4*Math.PI*f*t));}};
  notes.forEach((n,i)=>add(n,i*.75,.7,.075));[48,53,48,55].forEach((n,i)=>{add(n,i*3,2.5,.07);add(n+7,i*3,2.5,.035);});
  for(const [buffer,cutoff] of [[sea,900],[breeze,1700],[melody,4000]]){const source=c.createBufferSource(),filter=c.createBiquadFilter();source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=cutoff;source.connect(filter).connect(this.background);source.start();this.sources.push({source,filter});}
 }
 sync(context,{active,duck,muted,backgroundVolume,eventVolume,walking}){if(!context)return;this.context=context;this.level=muted?0:eventVolume;
  if(!active||muted){this.stopBackground();this.stopEvents();return;}
  if(backgroundVolume>0){if(!this.background)this.createBackground();this.background.gain.setTargetAtTime(backgroundVolume*(duck?.2:1),context.currentTime,.2);}else this.stopBackground();
  if(walking&&!this.stepTimer&&this.level>0){this.footstep();this.stepTimer=setInterval(()=>this.footstep(),330);}else if((!walking||this.level===0)&&this.stepTimer){clearInterval(this.stepTimer);this.stepTimer=null;}
 }
 tone(freq,duration=.15,delay=0,amp=.15){if(!this.context||!this.level)return;const c=this.context,o=c.createOscillator(),g=c.createGain(),t=c.currentTime+delay;o.type='triangle';o.frequency.value=freq;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(this.level*amp,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g).connect(c.destination);o.start(t);o.stop(t+duration+.03);const voice={source:o,gain:g};this.voices.add(voice);o.onended=()=>{o.disconnect();g.disconnect();this.voices.delete(voice);};}
 rustle(duration=.15,cutoff=1500,amp=.3){if(!this.context||!this.level)return;const c=this.context,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain(),t=c.currentTime;source.buffer=this.buffer(duration,()=>Math.random()*2-1);filter.type='lowpass';filter.frequency.value=cutoff;gain.gain.setValueAtTime(this.level*amp,t);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);source.connect(filter).connect(gain).connect(c.destination);source.start();const voice={source,gain,filter};this.voices.add(voice);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();this.voices.delete(voice);};}
 footstep(){this.rustle(.12,500,.12);}
 pick(id){if(id==='stone'||id==='splinter'){this.tone(240,.16);this.tone(150,.25,.14);return;}if(id==='can'||id==='large'){this.tone(id==='can'?1320:330,.28,0,.15);this.tone(890,.16,.04,.08);}else this.rustle(.25,id==='bag'?2800:1200,.22);this.tone(784,.18,.13,.12);this.tone(1046,.22,.27,.12);}
 victory(){[523,659,784,1046].forEach((f,i)=>this.tone(f,i===3?.65:.2,i*.15,.16));}
 stopBackground(){for(const {source,filter}of this.sources){try{source.stop();source.disconnect();filter.disconnect();}catch{}}this.sources=[];this.background?.disconnect();this.background=null;}
 stopEvents(){clearInterval(this.stepTimer);this.stepTimer=null;for(const v of this.voices){try{v.source.stop();v.source.disconnect();v.gain.disconnect();v.filter?.disconnect();}catch{}}this.voices.clear();}
 stop(){this.stopBackground();this.stopEvents();}
}
