// Local oscillator effects and browser English speech; no external TTS request.
export class SpinAudio {
 constructor(){this.context=null;this.voices=[];this.settings={};this.player=null;this.readEnd=null;}
 configure(p){this.settings=p;if(p.muted)this.stop();else if(this.player)this.player.volume=p.scratchVolume;}
 async read(file,onEnd){this.stop();if(this.settings.muted||!this.settings.scratchVolume)return false;const player=new Audio(`/spin/audio/${file}.wav`);this.player=player;this.readEnd=onEnd;player.playbackRate=.8;player.defaultPlaybackRate=.8;player.preservesPitch=true;player.volume=this.settings.scratchVolume;const finish=()=>{if(this.player===player){this.player=null;this.readEnd=null;onEnd?.();}};player.onended=finish;player.onerror=finish;try{await player.play();return true;}catch{finish();return false;}}
 unlock(){try{this.context??=new (window.AudioContext||window.webkitAudioContext)();return this.context.resume().catch(()=>{});}catch{return Promise.resolve();}}
 tone(freq,offset,duration,volume){const c=this.context;if(!c||c.state!=='running'||this.settings.muted||!volume)return;const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+offset;o.type='triangle';o.frequency.value=freq;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume*.15,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g).connect(c.destination);o.start(t);o.stop(t+duration);this.voices.push(o);o.onended=()=>{o.disconnect();g.disconnect();this.voices=this.voices.filter(x=>x!==o);};}
 say(text){if(this.settings.muted||!this.settings.scratchVolume||!window.speechSynthesis)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=.88;u.volume=this.settings.scratchVolume;const voice=window.speechSynthesis.getVoices().find(v=>v.lang==='en-US'&&v.localService);if(voice)u.voice=voice;window.speechSynthesis.speak(u);}
 retry(){this.stop();this.say('Try again!');[440,554.37,659.25].forEach((f,i)=>this.tone(f,i*.15,.25,this.settings.scratchVolume));}
 tick(){this.tone(740,0,.06,this.settings.scratchVolume);}
 good(){[523.25,659.25,783.99].forEach((f,i)=>this.tone(f,i*.1,.25,this.settings.scratchVolume));}
 celebrate(){this.stop();const melody=[523.25,659.25,783.99,1046.5,783.99,659.25,783.99,1046.5];for(let i=0;i<32;i++)this.tone(melody[i%8],i*.25,.25,this.settings.victoryVolume);}
 stop(){if(this.player){this.player.pause();this.player=null;this.readEnd?.();this.readEnd=null;}for(const o of this.voices){try{o.stop();}catch{}}this.voices=[];window.speechSynthesis?.cancel();}
 dispose(){this.stop();this.context?.close();}
}
