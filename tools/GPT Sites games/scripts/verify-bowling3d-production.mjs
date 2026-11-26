// Reads a deployed 3D release (Bowling or Basketball) back from production and compares it with the build manifest.
// Run: node scripts/verify-bowling3d-production.mjs qa/basketball3d-production-20261126
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

const folder=process.argv[2],origin='https://gamesinclass-5d9d1.web.app';
const manifest=JSON.parse(readFileSync(join(folder,'build-manifest.json'),'utf8'));
const wanted=manifest.list.filter(file=>['/index.html','/release.json'].includes(file.path)||file.path.startsWith('/bowling3d/')||file.path.startsWith('/basket3d/')||file.path==='/basketball/hold.png'
  ||/^\/assets\/(index|BowlingGame|bowling3d|Basket3DLane|plan-worker|jsx-runtime)/.test(file.path)||/^\/spin\/fonts\//.test(file.path));
const results=[];
for(const file of wanted){
  const response=await fetch(origin+encodeURI(file.path)+`?verify=${Date.now()}`,{cache:'no-store'});
  const body=Buffer.from(await response.arrayBuffer()),sha256=createHash('sha256').update(body).digest('hex');
  results.push({path:file.path,status:response.status,bytes:body.length,match:response.status===200&&sha256===file.sha256,cache:response.headers.get('cache-control')});
}
const routes=[];
const index=manifest.list.find(file=>file.path==='/index.html').sha256;
for(const route of ['/','/bowling','/unscramble','/phonics','/worldpup']){
  const response=await fetch(origin+route,{cache:'no-store'}),body=Buffer.from(await response.arrayBuffer());
  routes.push({route,status:response.status,isIndex:createHash('sha256').update(body).digest('hex')===index,
    nosniff:response.headers.get('x-content-type-options'),frame:response.headers.get('x-frame-options'),lastModified:response.headers.get('last-modified')});
}
const release=await (await fetch(origin+'/release.json',{cache:'no-store'})).json();
const summary={verifiedAt:new Date().toISOString(),origin,liveVersion:release.version,expectedVersion:manifest.version,
  files:{checked:results.length,matched:results.filter(item=>item.match).length,mismatched:results.filter(item=>!item.match).map(item=>item.path)},routes,results};
writeFileSync(join(folder,'production-verification.json'),JSON.stringify(summary,null,1));
console.log(JSON.stringify({liveVersion:summary.liveVersion,expected:summary.expectedVersion,files:summary.files,routes},null,1));
if(summary.liveVersion!==summary.expectedVersion||summary.files.mismatched.length||routes.some(item=>item.status!==200||!item.isIndex))process.exitCode=1;
