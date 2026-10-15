import media from './bowling-media.json';

export const bowlingImage=id=>media.images[id];
const sounds=new Map(),images=new Map(),pending=new Map(),listeners=new Set();
let loading=null;
const total=Object.keys(media.images).length+media.sounds.length;
export const mediaProgress=()=>({done:sounds.size+images.size,total});
export const subscribeMedia=fn=>{listeners.add(fn);fn(mediaProgress());return()=>listeners.delete(fn);};
const emit=()=>listeners.forEach(fn=>fn(mediaProgress()));
export async function pool(items,task,limit=4){
  let next=0;const errors=[];
  await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
    while(next<items.length){const item=items[next++];try{await task(item);}catch(error){errors.push(error);}}
  }));
  if(errors.length)throw new Error('Some game files could not load. Check your connection and try again.');
}
export async function fetchSound(asset){
  if(sounds.has(asset.name))return sounds.get(asset.name);
  if(pending.has(asset.url))return pending.get(asset.url);
  const task=(async()=>{
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),30000);
    try{
      const response=await fetch(asset.url,{signal:controller.signal});
      if(!response.ok)throw Error('Sound unavailable');
      const bytes=await response.arrayBuffer();
      if(bytes.byteLength!==asset.bytes)throw Error('Incomplete sound');
      sounds.set(asset.name,bytes);emit();return bytes;
    }finally{clearTimeout(timer);pending.delete(asset.url);}
  })();
  pending.set(asset.url,task);return task;
}
function loadImage(url){
  if(images.has(url))return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const image=new Image();let settled=false;
    const finish=error=>{
      if(settled)return;settled=true;clearTimeout(timer);image.onload=null;image.onerror=null;
      if(error){image.src='';reject(error);}else{images.set(url,image);emit();resolve();}
    };
    const timer=setTimeout(()=>finish(Error('Image timeout')),30000);
    image.onload=()=>image.decode().then(()=>finish(),finish);
    image.onerror=()=>finish(Error('Image unavailable'));image.src=url;
  });
}
export function preloadBowling(){
  if(loading)return loading;
  const tasks=[...Object.values(media.images).map(url=>()=>loadImage(url)),...media.sounds.map(asset=>()=>fetchSound(asset))];
  loading=pool(tasks,run=>run()).finally(()=>{loading=null;});return loading;
}
export async function decodeBowlingAudio(context,buffers){
  await preloadBowling();
  await pool(media.sounds,async asset=>{
    if(buffers.has(asset.name))return;
    const bytes=await fetchSound(asset);
    buffers.set(asset.name,await context.decodeAudioData(bytes.slice(0)));
  });
}
