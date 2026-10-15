import {decodeBowlingAudio} from './bowling-media';
// B reference-mix clips are used for observed game events; C original cues fill gaps.
export class BowlingAudio {
  constructor(){
    this.context=null;this.buses=null;this.buffers=new Map();this.nodes=new Set();this.seen=new Set();
    this.musicNode=null;this.loading=null;this.loaded=false;this.closed=false;this.timer=null;
    this.settings={musicVolume:40,soundsVolume:80,muted:false};
  }
  async unlock(){
    if(this.closed)throw Error('Bowling audio is closed.');
    if(!this.context){
      const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
      if(!Audio)throw Error('This browser cannot play game audio.');
      this.context=new Audio();
      const music=this.context.createGain(),effects=this.context.createGain();
      music.connect(this.context.destination);effects.connect(this.context.destination);
      this.buses={music,effects};this.configure(this.settings);
    }
    await this.context.resume();
    if(this.context.state!=='running')throw Error('Tap to enable game audio.');
    return this.load();
  }
  async load(){
    if(this.loading)return this.loading;
    if(this.loaded)return [];
    this.loading=decodeBowlingAudio(this.context,this.buffers).then(()=>{this.loaded=true;return [];}).finally(()=>{this.loading=null;});
    return this.loading;
  }
  configure(settings={}){
    this.settings={...this.settings,...settings};
    if(!this.context||!this.buses)return;
    const {musicVolume,soundsVolume,muted}=this.settings;
    const at=this.context.currentTime;
    this.buses.music.gain.setTargetAtTime(muted?0:(Number(musicVolume)||0)/100*.35,at,.04);
    this.buses.effects.gain.setTargetAtTime(muted?0:(Number(soundsVolume)||0)/100*.83,at,.04);
  }
  play(name,eventId){
    if(!this.context||this.context.state!=='running'||this.closed||this.settings.muted)return null;
    if(eventId){if(this.seen.has(eventId))return null;this.seen.add(eventId);if(this.seen.size>1500)this.seen.delete(this.seen.values().next().value);}
    const buffer=this.buffers.get(name);if(!buffer)return null;
    const source=this.context.createBufferSource();source.buffer=buffer;
    source.connect(name==='music'?this.buses.music:this.buses.effects);
    this.nodes.add(source);
    source.onended=()=>{this.nodes.delete(source);try{source.disconnect();}catch{}};
    source.start();return source;
  }
  startMusic(){
    if(this.musicNode||this.closed||!this.context||this.context.state!=='running'||!this.buffers.has('music'))return;
    const source=this.context.createBufferSource();source.buffer=this.buffers.get('music');source.loop=true;
    source.connect(this.buses.music);this.musicNode=source;this.nodes.add(source);
    source.onended=()=>{this.nodes.delete(source);try{source.disconnect();}catch{}if(this.musicNode===source)this.musicNode=null;};
    source.start();
  }
  stopMusic(){if(!this.musicNode)return;try{this.musicNode.stop();}catch{}this.musicNode=null;}
  celebrate(eventId){this.stopMusic();return this.play('winner',eventId);}
  pause(){for(const node of this.nodes){try{node.stop();}catch{}try{node.disconnect();}catch{}}this.nodes.clear();this.musicNode=null;}
  dispose(){this.closed=true;this.pause();this.buffers.clear();this.context?.close();}
}
