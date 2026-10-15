export const CELEBRATION_FILES=['/survivors/v1/celebration/victory-applause.mp3','/survivors/v1/celebration/victory-applause.ogg'];

// Reuse the game's already unlocked context and master volume.
export function createCelebrationAudio({getContext,getDestination,isEnabled,fetcher=url=>fetch(url)}={}){
 let raw,decoded,source,disposed=false,generation=0;
 async function read(url){const response=await fetcher(url);if(!response.ok)throw Error('Celebration unavailable');return response.arrayBuffer();}
 function prepare(){if(disposed)return Promise.resolve(false);raw??=read(CELEBRATION_FILES[0]).catch(()=>{raw=null;return null;});return raw;}
 function stop(){generation++;if(source){try{source.stop();}catch{}try{source.disconnect();}catch{}source=null;}}
 async function play(){
  if(disposed)return 'unavailable';
  if(!isEnabled())return 'muted';
  const context=getContext();if(!context||context.state!=='running')return 'blocked';
  stop();const ticket=generation;
  try{
   if(!decoded){const bytes=await prepare();try{if(!bytes)throw Error('Missing audio');decoded=await context.decodeAudioData(bytes.slice(0));}catch{decoded=await context.decodeAudioData(await read(CELEBRATION_FILES[1]));}}
   if(disposed||ticket!==generation)return 'cancelled';
   if(!isEnabled())return 'muted';
   if(context.state!=='running')return 'blocked';
   const voice=context.createBufferSource();voice.buffer=decoded;voice.connect(getDestination());source=voice;
   voice.onended=()=>{voice.disconnect();if(source===voice)source=null;};voice.start();return 'playing';
  }catch{return 'unavailable';}
 }
 return {prepare,play,stop,dispose(){disposed=true;stop();raw=null;decoded=null;}};
}
