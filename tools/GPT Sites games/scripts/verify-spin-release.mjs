import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const [distArg,reportArg]=process.argv.slice(2);
if(!distArg||!reportArg)throw Error('Usage: node verify-spin-release.mjs <dist> <report.json>');
const dist=path.resolve(distArg),base='https://gamesinclass-5d9d1.web.app';
const hash=b=>createHash('sha256').update(b).digest('hex');
async function walk(dir){const all=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())all.push(...await walk(p));else all.push(p);}return all;}
const queue=await walk(dist),files=[];
async function worker(){while(queue.length){const local=queue.shift(),rel=path.relative(dist,local).replaceAll('\\','/'),url=base+'/'+rel.split('/').map(encodeURIComponent).join('/');const r=await fetch(url,{signal:AbortSignal.timeout(60000)}),bytes=Buffer.from(await r.arrayBuffer()),expected=hash(await fs.readFile(local)),actual=hash(bytes);files.push({path:rel,status:r.status,bytes:bytes.length,sha256:actual,expected,match:r.status===200&&actual===expected});}}
await Promise.all(Array.from({length:4},worker));files.sort((a,b)=>a.path.localeCompare(b.path));
const home=await fetch(base,{signal:AbortSignal.timeout(30000)}),html=await home.text();
const fallback=await fetch(base+'/spin-route-check',{signal:AbortSignal.timeout(30000)}),fallbackHtml=await fallback.text();
const login=await fetch(base+'/api/teacher-login',{signal:AbortSignal.timeout(30000)});
const headers={'x-content-type-options':home.headers.get('x-content-type-options'),'x-frame-options':home.headers.get('x-frame-options'),'referrer-policy':home.headers.get('referrer-policy')};
const passed=files.every(f=>f.match)&&home.status===200&&fallback.status===200&&hash(Buffer.from(fallbackHtml))===hash(Buffer.from(html))&&login.status===405&&headers['x-content-type-options']==='nosniff'&&headers['x-frame-options']==='DENY';
const report={date:new Date().toISOString(),base,dist,passed,fileCount:files.length,matched:files.filter(f=>f.match).length,homeStatus:home.status,spaFallbackStatus:fallback.status,loginGetStatus:login.status,headers,files};await fs.mkdir(path.dirname(path.resolve(reportArg)),{recursive:true});await fs.writeFile(reportArg,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed,fileCount:report.fileCount,matched:report.matched,homeStatus:home.status,loginGetStatus:login.status,headers}));if(!passed)process.exitCode=1;
