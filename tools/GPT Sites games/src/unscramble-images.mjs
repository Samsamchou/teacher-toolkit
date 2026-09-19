// No image data is persisted in browser storage. Each mounted teacher/student
// surface owns its cache; leaving clears entries (in-flight requests may finish).
export function createPictureCache(){
 const items=new Map();let generation=0;
 return {
  async get(key,fetcher){
   if(items.has(key))return items.get(key);
   const current=generation,promise=fetcher();items.set(key,promise);
   try{const blob=await promise;if(blob.size>6*1024*1024&&current===generation)items.delete(key);return blob;}
   catch(e){if(current===generation&&items.get(key)===promise)items.delete(key);throw e;}
   finally{while(items.size>8)items.delete(items.keys().next().value);}
  },
  clear(){generation++;items.clear();}
 };
}
export const imageBase64=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=()=>reject(new Error('無法讀取圖片。'));r.readAsDataURL(blob);});
export function imageBlob(data){if(typeof data?.base64!=='string'||!['image/png','image/jpeg','image/webp'].includes(data.type))throw new Error('圖片資料未完整載入，請重試。');return new Blob([Uint8Array.from(atob(data.base64),c=>c.charCodeAt(0))],{type:data.type});}
export const imageSize=bytes=>`${(bytes/1024).toFixed(1)} KB`;
export async function preparePicture(file){
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('請選 PNG、JPG 或 WebP 圖片。');
 if(file.size>6*1024*1024)throw new Error('請使用小於 6 MB 的圖片。');
 const bitmap=await createImageBitmap(file);
 try{
  if(bitmap.width*bitmap.height>40000000)throw new Error('圖片解析度過大，請先縮小至 4000 萬像素以下。');
  async function resize(edge,quality){
   const scale=Math.min(1,edge/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   const ctx=canvas.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
   const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('無法轉換圖片，原圖仍保留。')),'image/webp',quality));
   return {blob,width:canvas.width,height:canvas.height};
  }
  // Fixed high quality: the byte target never drives repeated quality reductions.
  const candidate=await resize(1920,.9),small=await resize(480,.85);
  const keepOriginal=candidate.blob.size>=file.size;
  const full=keepOriginal?file:candidate.blob,thumbnail=small.blob.size<full.size?small.blob:full;
  return {full,thumbnail,stats:{originalBytes:file.size,bytes:full.size,thumbnailBytes:thumbnail.size,type:full.type,width:keepOriginal?bitmap.width:candidate.width,height:keepOriginal?bitmap.height:candidate.height,originalWidth:bitmap.width,originalHeight:bitmap.height,keptOriginal:keepOriginal}};
 }finally{bitmap.close();}
}
export async function pictureUploadPayload(prepared){return {base64:await imageBase64(prepared.full),type:prepared.full.type,thumbnail:{base64:await imageBase64(prepared.thumbnail),type:prepared.thumbnail.type}};}
