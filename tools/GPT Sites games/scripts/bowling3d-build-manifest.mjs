// Records what a production build contains, before deployment (used for the Bowling 3D and Basketball 3D releases).
// Run from the build folder: node scripts/bowling3d-build-manifest.mjs <output folder>
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,readdirSync,statSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

const out=process.argv[2];
if(!out)throw Error('Give the output folder, e.g. qa/bowling3d-production-20261126');
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(join(dir,entry.name)):[join(dir,entry.name)]);
const files=walk('dist').map(file=>({path:file.split('\\').join('/').replace(/^dist/,''),bytes:statSync(file).size,
  sha256:createHash('sha256').update(readFileSync(file)).digest('hex')})).sort((a,b)=>a.path.localeCompare(b.path));
const release=JSON.parse(readFileSync('dist/release.json','utf8')),bytes=files.reduce((sum,file)=>sum+file.bytes,0);
const key=files.filter(file=>['/index.html','/release.json','/bowling3d/audio/manifest.json','/basket3d/audio/manifest.json'].includes(file.path)||/^\/assets\/(index|BowlingGame|bowling3d|Basket3DLane|plan-worker)/.test(file.path));
mkdirSync(out,{recursive:true});
writeFileSync(join(out,'build-manifest.json'),JSON.stringify({builtAt:new Date().toISOString(),version:release.version,baseVersion:release.baseVersion,files:files.length,bytes,list:files},null,1));
writeFileSync(join(out,'key-files.json'),JSON.stringify({version:release.version,keyFiles:key},null,1));
console.log(`${release.version}: ${files.length} files, ${(bytes/1048576).toFixed(1)} MB; ${files.filter(file=>file.path.startsWith('/bowling3d/')).length} under /bowling3d/, ${files.filter(file=>file.path.startsWith('/basket3d/')).length} under /basket3d/`);
console.log(key.map(file=>`${file.path} ${file.bytes}`).join('\n'));
