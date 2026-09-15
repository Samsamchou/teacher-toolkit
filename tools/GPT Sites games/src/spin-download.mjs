export async function downloadMedia(url,{signal,onProgress=()=>{},timeout=20000,expectedBytes=0}={}){
 const controller=new AbortController();let expired=false;
 const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 const timer=setTimeout(()=>{expired=true;controller.abort();},timeout);
 try{const r=await fetch(url,{signal:controller.signal});if(!r.ok)throw Error(`HTTP ${r.status}`);
 const total=expectedBytes||Number(r.headers.get('content-length'));const reader=r.body.getReader(),chunks=[];let received=0;
 while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);received+=value.length;onProgress({received,total,percent:total?Math.min(99,Math.round(received/total*100)):null});}
 onProgress({received,total,percent:100});return new Blob(chunks,{type:r.headers.get('content-type')||'application/octet-stream'});
 }catch(e){if(expired)throw Error('Download timed out. Please retry.');throw e;}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
