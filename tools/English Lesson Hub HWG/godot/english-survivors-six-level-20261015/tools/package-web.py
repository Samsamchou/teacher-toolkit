from pathlib import Path
import json,re,shutil,hashlib,gzip
root=Path(__file__).resolve().parents[1]
web=root/'web';out=Path(__import__('sys').argv[1]) if len(__import__('sys').argv)>1 else root/'exported-web';out.mkdir(parents=True,exist_ok=True)
original=(web/'game.html').read_text(encoding='utf-8')
config=json.loads(re.search(r'const GODOT_CONFIG = (\{.*?\});',original).group(1))
for f in web.iterdir():
    if f.is_file() and f.name!='game.html' and f.name!='.gdignore':shutil.copy2(f,out/f.name)
html='''<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Forest of Words · Godot Six Stages</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#14172b;color:#ffecc3;font:14px system-ui}#canvas{display:block;width:100vw!important;height:100vh!important;outline:0}#loader{position:fixed;inset:0;display:grid;place-content:center;text-align:center;background:radial-gradient(ellipse,#322955,#14172b);padding:30px}progress{width:min(360px,80vw);height:12px;accent-color:#dfbb62}button{font:inherit;border:1px solid #e5cc84;padding:10px 18px;color:#ffecc3;background:#332847;border-radius:12px}</style><canvas id="canvas" width="960" height="640" tabindex="0" aria-label="Godot 六關遊戲"></canvas><div id="loader"><h2>FOREST OF WORDS</h2><p id="status">準備六關冒險…</p><progress id="progress" value="0" max="100"></progress><p>首次下載後可重用已驗證的遊戲快取。</p><button id="retry" hidden>重新載入</button></div><script src="game.js"></script><script>
const instance=new URLSearchParams(location.search).get('instance'),embedded=window.parent!==window;
window.SurvivorsHost={phase:'paused'};
window.emitSurvivorEvent=event=>{if(embedded&&instance)parent.postMessage({channel:'lesson-survivors-v1',instance,event},location.origin);};
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data?.channel==='lesson-survivors-v1'&&e.data.instance===instance&&e.data.host)window.SurvivorsHost=e.data.host;});
document.getElementById('retry').onclick=()=>location.reload();
const config=CONFIG;
config.canvas=document.getElementById('canvas');
async function main(){const label=document.getElementById('status'),progress=document.getElementById('progress');try{
 const manifest=await fetch('manifest.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('無法讀取遊戲清單');return r.json();});
 let cache=null;if('serviceWorker' in navigator){const reg=await navigator.serviceWorker.register('game-sw.js?v='+manifest.version,{scope:'./'});const worker=reg.installing||reg.waiting;if(worker&&worker.state!=='activated')await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('遊戲快取初始化逾時，請重新載入')),20000);worker.addEventListener('statechange',()=>{if(worker.state==='activated'){clearTimeout(timer);resolve();}if(worker.state==='redundant'){clearTimeout(timer);reject(Error('遊戲快取初始化失敗'));}});});cache=await caches.open('lh-survivors-'+manifest.version);}
 let done=0,total=manifest.runtime.reduce((n,f)=>n+f.bytes,0);
 for(const file of manifest.runtime){const url=new URL(file.name,location.href),key=new URL(file.name+'?sha='+file.sha256,location.href);label.textContent='下載與驗證 '+file.name;
 let response=cache?await cache.match(key):null;let bytes;if(response)bytes=await response.arrayBuffer();else{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('下載失敗：'+file.name);const reader=r.body?.getReader();if(reader){const parts=[];let size=0;while(true){const v=await reader.read();if(v.done)break;parts.push(v.value);size+=v.value.length;progress.value=Math.min(99,(done+size)/total*100);}const joined=new Uint8Array(size);let offset=0;for(const part of parts){joined.set(part,offset);offset+=part.length;}bytes=joined.buffer;}else bytes=await r.arrayBuffer();}
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');if(hash!==file.sha256){if(cache)await cache.delete(key);throw Error('遊戲檔案驗證失敗，請重新下載：'+file.name);}
 if(cache&&!response)await cache.put(key,new Response(bytes,{headers:{'Content-Type':file.mime}}));done+=file.bytes;progress.value=done/total*100;
 }
 label.textContent='啟動 Godot 引擎…';const engine=new Engine(config);const missing=Engine.getMissingFeatures({threads:false});if(missing.length)throw Error('裝置缺少 '+missing.join(', '));await engine.startGame({onProgress:(current,total)=>{if(total)progress.value=current/total*100;}});document.getElementById('loader').hidden=true;document.getElementById('loader').style.display='none';
 if(!embedded){window.SurvivorsHost={id:'offline-preview',phase:'playing',level:1,index:0,awards:{},game:{x:480,y:330,hp:8,recoveries:0},input:{}};const note=document.createElement('div');note.style='position:fixed;top:8px;left:8px;background:#17213de8;padding:10px;border-radius:10px;font-size:11px';note.textContent='Godot 場景預覽；正式英語作答與保存成績，請由 Lesson Hub 分配連結進入。';document.body.append(note);}
 }catch(e){label.textContent=e.message;document.getElementById('retry').hidden=false;window.emitSurvivorEvent({type:'error',message:e.message});}}
main();</script></html>'''.replace('CONFIG',json.dumps(config,separators=(',',':')))
(out/'game.html').write_text(html,encoding='utf-8')
runtime=[]
for name in ['game.js','game.wasm','game.pck']:
    f=out/name;mime='application/wasm' if f.suffix=='.wasm' else 'text/javascript' if f.suffix=='.js' else 'application/octet-stream'
    runtime.append({'name':name,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'mime':mime})
version=hashlib.sha256(json.dumps(runtime).encode()).hexdigest()[:16]
(out/'manifest.json').write_text(json.dumps({'schemaVersion':1,'version':version,'engine':'4.7.2.stable','threaded':False,'runtime':runtime},indent=2),encoding='utf-8')
sw='''const VERSION='VERSION_VALUE',CACHE='lh-survivors-'+VERSION,FILES=FILES_VALUE;
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('lh-survivors-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',e=>{const url=new URL(e.request.url),base=new URL(self.registration.scope);if(e.request.method!=='GET'||url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return;const name=url.pathname.slice(base.pathname.length),file=FILES.find(f=>f.name===name);if(!file)return;e.respondWith((async()=>{const cache=await caches.open(CACHE),key=new URL(file.name+'?sha='+file.sha256,base),saved=await cache.match(key);return saved||fetch(e.request);})());});'''.replace('VERSION_VALUE',version).replace('FILES_VALUE',json.dumps(runtime,separators=(',',':')))
(out/'game-sw.js').write_text(sw,encoding='utf-8')
for f in out.iterdir():
    if f.suffix in ['.js','.wasm','.pck']:print(f.name,f.stat().st_size,'gzip',len(gzip.compress(f.read_bytes(),compresslevel=6)))
print('manifest',version)
