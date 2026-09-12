import http from 'node:http';
import {readFile} from 'node:fs/promises';
const html=new URL('./public/index.html',import.meta.url);
http.createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path!=='/'&&path!=='/index.html'&&path!=='/review'){res.writeHead(404);res.end('Not found');return;}
  try{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Referrer-Policy':'strict-origin-when-cross-origin','Cache-Control':'no-store'});res.end(await readFile(path==='/review'?new URL('./review/timing-preview.html',import.meta.url):html));}catch{res.writeHead(500);res.end('Unable to load page');}
}).listen(Number(process.env.PORT||8000),'127.0.0.1',()=>console.log('Open http://localhost:'+(process.env.PORT||8000)+' — Ctrl+C to stop'));
