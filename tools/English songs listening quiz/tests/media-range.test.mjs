import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const port=Number(process.env.MEDIA_RANGE_TEST_PORT||8014);
const base=`http://127.0.0.1:${port}`;
const mediaPaths=[
 '/media/san-francisco-ipad-v1.mp4',
 '/media/san-francisco-ipad-lite-v1.mp4'
];
const server=spawn(process.execPath,['server.mjs'],{
 cwd:root,
 env:{...process.env,PORT:String(port)},
 stdio:['ignore','pipe','pipe']
});
let serverOutput='';
server.stdout.on('data',chunk=>serverOutput+=chunk);
server.stderr.on('data',chunk=>serverOutput+=chunk);

async function waitForServer(){
 for(let attempt=0;attempt<60;attempt++){
  if(server.exitCode!==null)throw Error(`測試伺服器提前結束 (${server.exitCode})\n${serverOutput}`);
  try{const response=await fetch(base+'/',{method:'HEAD'});if(response.ok)return;}catch{}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 throw Error(`測試伺服器未在時限內啟動\n${serverOutput}`);
}

async function assertParallelRanges(path){
 const chunkSize=64*1024;
 const requests=Array.from({length:20},(_,index)=>{
  const start=index*chunkSize;
  const end=start+chunkSize-1;
  return fetch(base+path,{headers:{Range:`bytes=${start}-${end}`}}).then(async response=>({
   index,start,end,response,body:new Uint8Array(await response.arrayBuffer())
  }));
 });
 const results=await Promise.all(requests);
 for(const {index,start,end,response,body} of results){
  assert.equal(response.status,206,`${path} 第 ${index+1} 個並行請求應回傳 206`);
  assert.equal(response.headers.get('content-type'),'video/mp4');
  assert.equal(response.headers.get('accept-ranges'),'bytes');
  assert.match(response.headers.get('content-range')||'',new RegExp(`^bytes ${start}-${end}/\\d+$`));
  assert.equal(Number(response.headers.get('content-length')),chunkSize);
  assert.equal(body.byteLength,chunkSize);
 }
}

try{
 await waitForServer();
 for(const path of mediaPaths)await assertParallelRanges(path);
 console.log(`PASS ${mediaPaths.length} media variants: 20 concurrent Range requests each returned complete HTTP 206 chunks`);
}finally{
 server.kill();
 await Promise.race([
  new Promise(resolve=>server.once('exit',resolve)),
  new Promise(resolve=>setTimeout(resolve,2000))
 ]);
 if(server.exitCode===null)server.kill('SIGKILL');
}
