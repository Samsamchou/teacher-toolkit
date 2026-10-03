// Explicitly authorized one-site repair. No course/media/history mutations.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const apply=process.argv.includes('--apply-config');
const token=process.env.LESSON_READONLY_TOKEN;
const backupRoot=process.env.LESSON_REPAIR_BACKUP;
if(!token||!backupRoot||!path.isAbsolute(backupRoot))throw Error('Explicit private backup directory and authenticated environment required');
const base='https://firestore.googleapis.com/v1/projects/hwg7teaching/databases/(default)/documents';
const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
const hash=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
async function read(url,allowMissing=false){const r=await fetch(url,{headers});if(allowMissing&&r.status===404)return null;if(!r.ok)throw Error(`Read HTTP ${r.status}`);return r.json();}
let pageToken;const courses=[];
do{const u=new URL(base+'/liveDecksV2');u.searchParams.set('pageSize','100');if(pageToken)u.searchParams.set('pageToken',pageToken);const data=await read(u);courses.push(...data.documents||[]);pageToken=data.nextPageToken;}while(pageToken);
const matches=courses.filter(d=>String(JSON.parse(d.fields.json.stringValue).title||'').trim().replace(/\s+/g,' ').toLowerCase()==='hwg7 u02 words');
if(matches.length!==1)throw Error('Expected exactly one target course; no changes made');
const target=matches[0],owner=target.fields.ownerUid.stringValue,deck=JSON.parse(target.fields.json.stringValue);
if(!/^[A-Za-z0-9_-]{1,128}$/.test(owner))throw Error('Unexpected legacy owner');
const owned=courses.filter(d=>d.fields.ownerUid?.stringValue===owner);
const configUrl=base+'/liveTeacherWorkspacesV2/primary';
const before=await read(configUrl,true);
if(before&&(before.fields?.ownerUid?.stringValue!==owner||before.fields?.enabled?.booleanValue!==true))throw Error('Existing workspace differs; refusing overwrite');
const mediaIds=[...new Set(owned.flatMap(d=>JSON.parse(d.fields.json.stringValue).blocks.flatMap(b=>(b.media||[]).map(m=>m.id))))];
const assets=[];
for(const id of mediaIds){if(!/^cloud-[a-f0-9-]{36}$/.test(id))throw Error('Unexpected media ID');const asset=await read(base+'/liveMediaV2/'+id);if((asset.fields.workspaceOwnerUid||asset.fields.ownerUid).stringValue!==owner)throw Error('Referenced media belongs to another owner');assets.push(asset);}
const publicConfig=await (await fetch('https://lesson-hub-v03.web.app/__/firebase/init.json')).json();
if(publicConfig.projectId!=='hwg7teaching'||!publicConfig.storageBucket)throw Error('Runtime project mismatch');
let objects=0;
for(const asset of assets){for(const value of Object.values(asset.fields.paths?.mapValue?.fields||{})){
  const objectPath=value.stringValue;if(!objectPath?.startsWith('liveMediaV2/'))throw Error('Unexpected storage path');
  await read('https://storage.googleapis.com/storage/v1/b/'+encodeURIComponent(publicConfig.storageBucket)+'/o/'+encodeURIComponent(objectPath)+'?fields=generation,size,crc32c');objects++;
}}
await fs.mkdir(backupRoot,{recursive:true});
const backup={project:'hwg7teaching',createdAt:new Date().toISOString(),workspaceBefore:before,courses:owned,assets};
const backupPath=path.join(backupRoot,'teacher-workspace-'+Date.now()+'.json');
await fs.writeFile(backupPath,JSON.stringify(backup,null,2),{flag:'wx'});
if(hash(JSON.parse(await fs.readFile(backupPath,'utf8')))!==hash(backup))throw Error('Backup readback mismatch');
if(apply&&!before){const r=await fetch(base+':commit',{method:'POST',headers,body:JSON.stringify({writes:[{update:{name:configUrl.replace('https://firestore.googleapis.com/v1/',''),fields:{schemaVersion:{integerValue:'1'},enabled:{booleanValue:true},ownerUid:{stringValue:owner},reason:{stringValue:'User-approved stable teacher workspace; legacy course ownership preserved'},createdAt:{timestampValue:new Date().toISOString()}}},currentDocument:{exists:false}}]})});if(!r.ok)throw Error('Workspace create HTTP '+r.status);}
if(apply){const saved=await read(configUrl);if(saved.fields.ownerUid.stringValue!==owner||!saved.fields.enabled.booleanValue)throw Error('Workspace readback mismatch');}
for(const original of [...owned,...assets]){const current=await read('https://firestore.googleapis.com/v1/'+original.name);if(hash(current)!==hash(original))throw Error('Original data changed during verification; review required');}
console.log(JSON.stringify({mode:apply?'applied':'read-only',target:'HWG7 U02 words',version:deck.version,pages:deck.blocks.length,reconnectedCourses:owned.length,otherOwnerCourses: courses.length-owned.length,referencedAssets:assets.length,verifiedStorageObjects:objects,courseAndMediaUnchanged:true,privateBackup:backupPath,workspaceConfigured:apply||Boolean(before)},null,2));
