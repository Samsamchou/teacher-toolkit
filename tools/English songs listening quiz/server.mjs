import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
const paths={'/media/san-francisco.mp4':'public/media/san-francisco.mp4','/':'public/index.html','/index.html':'public/index.html','/review':'review/timing-preview.html','/review/san-francisco':'review/san-francisco/index.html','/review/san-francisco/practice':'review/san-francisco/practice.html','/review/san-francisco/bank.json':'review/san-francisco/question-bank.json','/review/san-francisco/media.mp4':'review/san-francisco/media.mp4'};
http.createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname,target=paths[path];
 if(!target||!['GET','HEAD'].includes(req.method)){res.writeHead(404);res.end('Not found');return;}
 try{
  const file=new URL('./'+target,import.meta.url),size=(await stat(file)).size;
  const headers={'Content-Type':target.endsWith('.mp4')?'video/mp4':target.endsWith('.json')?'application/json; charset=utf-8':'text/html; charset=utf-8','Referrer-Policy':'strict-origin-when-cross-origin','Cache-Control':'no-store','Accept-Ranges':'bytes'};
  if(req.headers.range&&target.endsWith('.mp4')){
   const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
   let start=m?.[1]?Number(m[1]):m?.[2]?Math.max(0,size-Number(m[2])):NaN;
   let end=m?.[1]&&m[2]?Math.min(size-1,Number(m[2])):size-1;
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
   res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});
   if(req.method==='HEAD')res.end();else createReadStream(file,{start,end}).pipe(res);return;
  }
  res.writeHead(200,{...headers,'Content-Length':size});
  if(req.method==='HEAD')res.end();else if(target.endsWith('.mp4'))createReadStream(file).pipe(res);else res.end(await readFile(file));
 }catch{if(!res.headersSent)res.writeHead(500);res.end('Unable to load file');}
}).listen(Number(process.env.PORT||8000),'127.0.0.1',()=>console.log('Open http://localhost:'+(process.env.PORT||8000)));
