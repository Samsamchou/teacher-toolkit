import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const release='C:/Users/User/AppData/Local/Temp/gsg-release-ten-groups-20260915/dist',base='https://gamesinclass-5d9d1.web.app',out='qa/unscramble-ten-groups-20260915';
const hash=data=>createHash('sha256').update(data).digest('hex');
const files=[];for(const file of await fs.readdir(release,{recursive:true})){const disk=path.join(release,file);if(!(await fs.stat(disk)).isFile())continue;const r=await fetch(base+'/'+file.replaceAll('\\','/'),{signal:AbortSignal.timeout(20000)});const expected=hash(await fs.readFile(disk)),actual=hash(Buffer.from(await r.arrayBuffer()));console.log(file);files.push({file,status:r.status,sha256:actual,pass:r.status===200&&expected===actual});}
const r=await fetch(base+'/api/live-activity',{signal:AbortSignal.timeout(20000),method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'listDecks'})});const api={status:r.status,pass:r.status===401};
const result={checkedAt:new Date().toISOString(),base,files,api,pass:files.every(f=>f.pass)&&api.pass};await fs.writeFile(out+'/production-verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify({pass:result.pass,files:files.length,api}));if(!result.pass)process.exitCode=1;
