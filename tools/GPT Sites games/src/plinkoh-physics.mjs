import {rng,clamp} from './plinkoh-model.mjs';
export const W=780,H=870,STEP=1/120,R=18;
export const wallVertices=[{x:0,y:90},{x:0,y:260},{x:49,y:330},{x:0,y:400},{x:0,y:440},{x:49,y:510},{x:0,y:580},{x:0,y:826}];
export function makeBoard(round,seed){const rand=rng(seed);const rows=Math.min(5+round-1,8);const pegs=[];for(let row=0;row<rows;row++){const count=(row%2?4:5)+(round>1?1:0);for(let col=0;col<count;col++){const pitch=round>1?114:142.5;const x=105+col*pitch+(row%2?pitch/2:0);const y=185+row*(530/(rows-1));const pink=round>=2&&((row+col)%4===1);pegs.push({id:`${row}-${col}`,x,y,r:11,points:pink?2:1,pink,phase:rand()*Math.PI*2});}}
 const count=Math.min(round+2,7);const values=Array.from({length:count},(_,i)=>(i+1)*10);for(let i=values.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[values[i],values[j]]=[values[j],values[i]];}
 return {round,seed,pegs,slots:values,extension:round>=3};}
export function pegPosition(p,time){return {x:p.x+Math.sin(time*.85+p.phase)*3,y:p.y+Math.sin(time*.65+p.phase)*2};}
export function createDrop(board,zone,zones,seed,radius=R){const rand=rng(seed);return {board,ball:{radius,x:(clamp(zone,1,zones)-.5)*W/zones,y:103,vx:(rand()-.5)*8,vy:0,angle:0},time:0,hits:[],events:[],hit:new Set(),touch:new Set(),accumulator:0,stable:0,done:false,failed:false,slotIndex:null,serial:0};}
function emit(s,type,extra={}){const e={id:++s.serial,type,time:s.time,...extra};s.events.push(e);return e;}
function lineCollision(b,a,c,restitution){const radius=b.radius||R;const dx=c.x-a.x,dy=c.y-a.y;const u=clamp(((b.x-a.x)*dx+(b.y-a.y)*dy)/(dx*dx+dy*dy),0,1);const px=a.x+u*dx,py=a.y+u*dy;let nx=b.x-px,ny=b.y-py;let d=Math.hypot(nx,ny);if(d>=radius)return false;if(d<.001){nx=1;ny=0;d=1;}nx/=d;ny/=d;b.x+=nx*(radius-d+.02);b.y+=ny*(radius-d+.02);const v=b.vx*nx+b.vy*ny;if(v<0){b.vx-=(1+restitution)*v*nx;b.vy-=(1+restitution)*v*ny;}return v<-30;}
export function tick(s){if(s.done||s.failed)return [];const first=s.events.length;const b=s.ball;const radius=b.radius||R;s.time+=STEP;b.vy=Math.min(930,b.vy+620*STEP);b.x+=b.vx*STEP;b.y+=b.vy*STEP;b.angle+=b.vx*STEP/radius;
 const touching=new Set();for(let side=0;side<2;side++){const verts=wallVertices.map(v=>({x:side?W-v.x:v.x,y:v.y}));for(let i=0;i<verts.length-1;i++){const key=`wall-${side}-${i}`;if(lineCollision(b,verts[i],verts[i+1],.72)){touching.add(key);if(!s.touch.has(key))emit(s,'wall',{x:b.x,y:b.y});}}}
 for(const p of s.board.pegs){if(s.hit.has(p.id))continue;const q=pegPosition(p,s.time);let dx=b.x-q.x,dy=b.y-q.y;const d=Math.hypot(dx,dy);if(d<radius+p.r){let nx=dx/(d||1),ny=dy/(d||1);if(Math.abs(nx)<.045){nx=(Number(p.id.split('-')[1])%2?1:-1)*.12;ny=-Math.sqrt(1-nx*nx);}b.x=q.x+nx*(radius+p.r+.1);b.y=q.y+ny*(radius+p.r+.1);const v=b.vx*nx+b.vy*ny;if(v<0){b.vx-=(1+.67)*v*nx;b.vy-=(1+.67)*v*ny;}b.vx+=nx*30;s.hit.add(p.id);s.hits.push({id:p.id,points:p.points});emit(s,p.pink?'pink':'peg',{peg:p.id,points:p.points,x:q.x,y:q.y});}}
 const sw=W/s.board.slots.length;for(let i=1;i<s.board.slots.length;i++)lineCollision(b,{x:i*sw,y:809},{x:i*sw,y:849},.4);
 if(b.y+radius>=824){b.y=824-radius;if(b.vy>65){b.vy=-b.vy*.47;emit(s,'floor',{x:b.x,y:b.y});}else b.vy=0;b.vx*=.82;}
 b.vx=clamp(b.vx,-520,520);b.x=clamp(b.x,radius,W-radius);if(b.y<radius){b.y=radius;b.vy=Math.abs(b.vy);}
 if(b.y>=824-radius-.1&&Math.abs(b.vy)<1&&Math.abs(b.vx)<22)s.stable+=STEP;else s.stable=0;
 if(s.stable>.22){s.done=true;s.slotIndex=clamp(Math.floor(b.x/sw),0,s.board.slots.length-1);emit(s,'landing',{slotIndex:s.slotIndex,points:s.board.slots[s.slotIndex],x:b.x,y:b.y});}
 if(s.time>20||!Number.isFinite(b.x+b.y)){s.failed=true;emit(s,'stuck');}s.touch=touching;return s.events.slice(first);
}
export function advance(s,elapsed){if(!Number.isFinite(elapsed)||elapsed<0)return [];s.accumulator+=Math.min(elapsed,.25);const events=[];while(s.accumulator+1e-10>=STEP&&!s.done&&!s.failed){events.push(...tick(s));s.accumulator-=STEP;}return events;}
