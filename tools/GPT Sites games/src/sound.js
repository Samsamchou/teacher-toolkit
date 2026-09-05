// Original synthesized foil friction and a short victory fanfare; no remote audio.
class GameSound {
  context=null; noise=null; scratch=null; voices=[]; pulseTimer=null;
  settings={muted:false,scratchVolume:.35,victoryVolume:.5};
  unlock(){
    try {if(!this.context){const C=window.AudioContext||window.webkitAudioContext;if(!C)return Promise.resolve(false);this.context=new C();const c=this.context;this.noise=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const a=this.noise.getChannelData(0);let brown=0;for(let i=0;i<a.length;i++){const white=Math.random()*2-1;brown=(brown+.035*white)/1.035;const grain=.45+.55*Math.abs(Math.sin(i/c.sampleRate*93));a[i]=(white*.45+brown*3)*grain;}}
      return this.context.resume().then(()=>this.context.state==='running').catch(()=>false);
    }catch{return Promise.resolve(false);}
  }
  configure(settings){this.settings=settings;if(settings.muted)this.stopAll();else if(this.scratch)this.scratch.gain.gain.setTargetAtTime(settings.scratchVolume*.7,this.context.currentTime,.02);}
  startScratch(){if(!this.context||this.context.state!=='running'||this.settings.muted||this.settings.scratchVolume===0||this.scratch)return;
    const c=this.context,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=this.noise;source.loop=true;filter.type='bandpass';filter.frequency.value=1800;filter.Q.value=.45;gain.gain.setValueAtTime(0,c.currentTime);gain.gain.linearRampToValueAtTime(this.settings.scratchVolume*.7,c.currentTime+.025);source.connect(filter).connect(gain).connect(c.destination);source.start();this.scratch={source,filter,gain};
  }
  pulse(){this.startScratch();clearTimeout(this.pulseTimer);this.pulseTimer=setTimeout(()=>this.stopScratch(),100);}
  stopScratch(){clearTimeout(this.pulseTimer);if(!this.scratch)return;const {source,filter,gain}=this.scratch,c=this.context;this.scratch=null;gain.gain.cancelScheduledValues(c.currentTime);gain.gain.setTargetAtTime(0,c.currentTime,.008);source.stop(c.currentTime+.035);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};}
  victory(){this.stopVictory();if(!this.context||this.context.state!=='running'||this.settings.muted)return;const c=this.context,now=c.currentTime;
    [[523.25,0,.16],[659.25,.16,.16],[783.99,.32,.16],[1046.5,.5,.65],[659.25,.5,.65],[783.99,.5,.65],[1318.5,1.2,.6]].forEach(([frequency,offset,duration])=>{const osc=c.createOscillator(),gain=c.createGain();osc.type='triangle';osc.frequency.value=frequency;const t=now+offset;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(this.settings.victoryVolume*.14,t+.015);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);osc.connect(gain).connect(c.destination);osc.start(t);osc.stop(t+duration+.04);const voice={osc,gain};this.voices.push(voice);osc.onended=()=>{osc.disconnect();gain.disconnect();this.voices=this.voices.filter(v=>v!==voice);};});
  }
  stopVictory(){for(const {osc,gain}of this.voices){try{osc.stop();osc.disconnect();gain.disconnect();}catch{}}this.voices=[];}
  stopAll(){this.stopScratch();this.stopVictory();}
  async preview(kind){await this.unlock();this.stopAll();if(kind==='scratch'){this.startScratch();this.pulseTimer=setTimeout(()=>this.stopScratch(),750);}else this.victory();}
}
export const sound=new GameSound();
