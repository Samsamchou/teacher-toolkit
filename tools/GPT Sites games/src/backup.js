import JSZip from 'jszip';
import * as data from './data';
import { validateManifest, validateImage, safeUrl, DEFAULT_GAME } from './model.mjs';
export async function exportBackup(images, lessons, games, progress) {
  const zip = new JSZip();
  const clean = images.map(({blob, url, ...image})=>image);
  for (let i=0;i<images.length;i++) { progress(`Packing image ${i+1} of ${images.length}…`); zip.file(`images/${images[i].id}`, await data.readImage(images[i])); }
  zip.file('manifest.json', JSON.stringify({ format:'classroom-club', version:1, createdAt:new Date().toISOString(), images:clean, lessons, games },null,2));
  const blob = await zip.generateAsync({type:'blob',compression:'STORE'});
  return {url:URL.createObjectURL(blob),filename:`classroom-club-${new Date().toISOString().slice(0,10)}.zip`};
}
export async function inspectBackup(file) {
  if(file.size > 512*1024*1024) throw new Error('Please use a backup smaller than 512 MB in this browser.');
  const zip=await JSZip.loadAsync(file);
  const sizes=Object.values(zip.files).reduce((sum,f)=>sum+(f._data?.uncompressedSize||0),0);
  if(sizes>512*1024*1024) throw new Error('The expanded backup is larger than the 512 MB import limit.');
  const entry=zip.file('manifest.json');if(!entry) throw new Error('This backup is missing its manifest.');
  if((entry._data?.uncompressedSize||0)>2*1024*1024)throw new Error('This backup manifest is too large.');
  const m=validateManifest(JSON.parse(await entry.async('string')));
  // Validate all image payloads before any persistent write.
  const files=[];
  for(const img of m.images){
    const e=zip.file(`images/${img.id}`);if(!e)throw new Error(`Missing image: ${img.name}`);
    const bytes=await e.async('uint8array');const f=new File([bytes],img.name,{type:img.type});validateImage(f);
    if(f.size!==img.size)throw new Error(`Image size does not match: ${img.name}`);
    const bitmap=await createImageBitmap(f);const valid=bitmap.width===img.width&&bitmap.height===img.height;bitmap.close();
    if(!valid)throw new Error(`Image dimensions do not match: ${img.name}`);files.push(f);
  }
  return { m, files };
}
export async function restoreBackup(backup,progress){
  const {m,files}=backup, mapping=new Map(), created=[];
  try{
    for(let i=0;i<files.length;i++){progress(`Restoring image ${i+1} of ${files.length}…`);const record=await data.addImage(files[i]);mapping.set(m.images[i].id,record.id);created.push(['images',record.id]);}
    for(const l of m.lessons){const id=crypto.randomUUID();await data.put('lessons',{id,name:l.name,gameId:l.gameId,imageIds:l.imageIds.map(x=>mapping.get(x)),updatedAt:Date.now()});created.push(['lessons',id]);}
    const existing=await data.list('games');
    for(const g of m.games.filter(g=>g.id!=='scratch')){const id=crypto.randomUUID();await data.put('games',{id,name:g.name,description:String(g.description||''),url:safeUrl(g.url),order:existing.length+created.length,hidden:!!g.hidden,builtin:false});created.push(['games',id]);}
  }catch(e){let failed=0;for(const [type,id] of created.reverse())await data.remove(type,id).catch(()=>failed++);throw new Error(failed?'Import stopped. Some imported items could not be rolled back; please review your library.':`Import cancelled; existing items are unchanged. ${e.message}`);}
}
