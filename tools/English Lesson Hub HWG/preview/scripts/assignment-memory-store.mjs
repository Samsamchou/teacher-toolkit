// Development/test adapter. Production uses the Admin Firestore implementation.
// Transaction callbacks stage all writes and publish only after persistence succeeds.
const copy=v=>v===undefined?undefined:structuredClone(v);
export function createMemoryFirestore(initial={},persist=async()=>{}) {
 let data=copy(initial),queue=Promise.resolve();
 const snapshot=(path,source=data)=>({id:path.split('/').at(-1),exists:Object.hasOwn(source,path),ref:doc(path),data:()=>copy(source[path])});
 const doc=path=>({path,id:path.split('/').at(-1),collection:name=>collection(path+'/'+name),get:async()=>snapshot(path),set:async value=>db.runTransaction(tx=>tx.set(doc(path),value)),update:async value=>db.runTransaction(tx=>tx.update(doc(path),value)),delete:async()=>db.runTransaction(tx=>tx.delete(doc(path)))});
 const collection=(path,filters=[],maximum=Infinity)=>({path,doc:id=>doc(path+'/'+id),where:(key,op,value)=>collection(path,[...filters,[key,op,value]],maximum),limit:n=>collection(path,filters,n),get:async()=>({docs:Object.keys(data).filter(p=>p.startsWith(path+'/')&&!p.slice(path.length+1).includes('/')).filter(p=>filters.every(([k,op,v])=>op==='=='?data[p][k]===v:op==='<='?Number(data[p][k])<=Number(v):false)).slice(0,maximum).map(p=>snapshot(p))})});
 const db={collection,export:()=>copy(data),recursiveDelete:ref=>db.runTransaction(tx=>{for(const p of Object.keys(data))if(p===ref.path||p.startsWith(ref.path+'/'))tx.delete(doc(p));}),runTransaction:work=>{const task=async()=>{const next=copy(data);let wrote=false;const tx={get:async ref=>{if(wrote)throw Error('Firestore read after write');return snapshot(ref.path,next);},set:(ref,v)=>{wrote=true;next[ref.path]=copy(v);},create:(ref,v)=>{if(Object.hasOwn(next,ref.path))throw Error('already-exists');tx.set(ref,v);},update:(ref,v)=>{if(!Object.hasOwn(next,ref.path))throw Error('not-found');tx.set(ref,{...next[ref.path],...copy(v)});},delete:ref=>{wrote=true;delete next[ref.path];}};const out=await work(tx);if(wrote){await persist(next);data=next;}return out;};const promise=queue.then(task);queue=promise.catch(()=>{});return promise;}};
 return db;
}
