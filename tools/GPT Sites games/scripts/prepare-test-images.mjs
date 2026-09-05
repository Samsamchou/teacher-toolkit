// Deterministic solid-color PNG fixtures for mixed-aspect upload verification, not teaching artwork.
import {deflateSync} from 'node:zlib';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const destination=process.argv[2];if(!destination)throw new Error('Specify a local test-fixture directory.');
await mkdir(destination,{recursive:true});
function crc32(buf){let c=0xffffffff;for(const n of buf){c^=n;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type);const length=Buffer.alloc(4);length.writeUInt32BE(data.length);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([length,t,data,crc]);}
for(let i=0;i<51;i++){const [w,h]=[[400,250],[250,400],[300,300]][i%3];const row=Buffer.alloc(1+w*3);for(let x=0;x<w;x++){row[x*3+1]=140+i;row[x*3+2]=170+i%40;row[x*3+3]=115+i%100;}const raw=Buffer.concat(Array.from({length:h},()=>row));const head=Buffer.alloc(13);head.writeUInt32BE(w);head.writeUInt32BE(h,4);head[8]=8;head[9]=2;const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',head),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);await writeFile(join(destination,`qa-image-${String(i+1).padStart(2,'0')}.png`),png);}
console.log('Prepared 51 PNG upload fixtures in three aspect ratios.');
