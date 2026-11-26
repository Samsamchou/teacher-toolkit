// Main-thread handle for the physics planner worker.
export function createPlanner(){
  const worker=new Worker(new URL('./plan-worker.js',import.meta.url),{type:'module'});
  const pending=new Map();let next=1;
  worker.onmessage=({data})=>{
    const entry=pending.get(data.id);if(!entry)return;pending.delete(data.id);
    if(data.error){entry.reject(Error(data.error));return;}
    const {packed,frameSize,...recording}=data.recording,frames=[];
    for(let offset=0;offset<packed.length;offset+=frameSize)frames.push(packed.subarray(offset,offset+frameSize));
    entry.resolve({...recording,frames});
  };
  worker.onerror=event=>{for(const entry of pending.values())entry.reject(Error(event.message||'Physics worker failed.'));pending.clear();};
  return {
    /** request: {remaining, count, startFraction, seed?, budgetMs?} → recording with exactly `count` fallen pins. */
    plan(request){return new Promise((resolve,reject)=>{const id=next++;pending.set(id,{resolve,reject});worker.postMessage({id,request});});},
    dispose(){worker.terminate();pending.clear();},
  };
}
