import test from 'node:test';
import assert from 'node:assert/strict';
import {planShot,planDunk,HOOP,SPOTS,STEP,HIT_STYLES,MISS_STYLES,makeRng} from '../src/basket3d/shots.mjs';

const inside=frame=>Math.hypot(frame[0],frame[2])<HOOP.rimR-HOOP.ballR+.03; // ball centre within the rim
const below=frame=>frame[1]<HOOP.rimY-.05&&frame[1]>HOOP.rimY-.45;
const frameAt=(recording,time)=>recording.frames[Math.min(recording.frames.length-1,Math.round(time/STEP))];

test('every made shot goes down through the rim, for each value and style',()=>{
  for(const points of [1,2,3,4])for(const style of HIT_STYLES)for(let seed=1;seed<=4;seed++){
    const recording=planShot({points,hit:true,style,seed});
    assert.equal(recording.hit,true);assert.equal(recording.style,style);
    assert.ok(inside(frameAt(recording,recording.resultAt)),`${points} ${style}: at the rim when it scores`);
    assert.ok(recording.frames.some(frame=>inside(frame)&&below(frame)),`${points} ${style}: passes through the net`);
    assert.ok(recording.events.some(event=>event.type==='net'));
  }
});

test('no missed shot ever passes through the rim',()=>{
  for(const points of [1,2,3,4])for(const style of MISS_STYLES)for(let seed=1;seed<=4;seed++){
    const recording=planShot({points,hit:false,style,seed});
    assert.equal(recording.hit,false);
    assert.ok(!recording.frames.some(frame=>inside(frame)&&below(frame)),`${points} ${style}: stays out of the net`);
    assert.ok(!recording.events.some(event=>event.type==='net'));
  }
});

test('the ball starts in the shooter\'s hands, never goes through the backboard or floor, and comes to rest',()=>{
  const rng=makeRng(7);
  for(let i=0;i<40;i++){
    const points=1+Math.floor(rng()*3),hit=rng()<.5,recording=planShot({points,hit,seed:1+Math.floor(rng()*1e6)});
    assert.ok(Math.abs(recording.frames[0][0]-(SPOTS[points]-.35))<1e-6,'starts at the release point');
    for(const frame of recording.frames){
      assert.ok(frame[1]>=HOOP.ballR-1e-6,'above the floor');
      if(frame[1]>2.9&&frame[1]<3.95&&Math.abs(frame[2])<.9)assert.ok(frame[0]>HOOP.boardX+HOOP.ballR-.02,'in front of the backboard');
    }
    assert.ok(recording.resultAt>.8&&recording.resultAt<recording.duration);
    assert.ok(recording.duration<5,'short enough to play');
    assert.ok((hit?HIT_STYLES:MISS_STYLES).includes(recording.style));
  }
});

test('the same request and seed give the same flight',()=>{
  const a=planShot({points:3,hit:true,seed:42}),b=planShot({points:3,hit:true,seed:42});
  assert.equal(a.style,b.style);assert.equal(a.frames.length,b.frames.length);assert.deepEqual([...a.frames.at(-1)],[...b.frames.at(-1)]);
});

test('a style that contradicts the result is refused',()=>{
  assert.throws(()=>planShot({points:2,hit:true,style:'brick'}));
  assert.throws(()=>planShot({points:2,hit:false,style:'swish'}));
  assert.throws(()=>planShot({points:7,hit:true}));
});

test('a slam dunk carries the ball to the rim and throws it down for three',()=>{
  const dunk=planDunk({seed:3});
  assert.equal(dunk.hit,true);assert.equal(dunk.points,3);assert.equal(dunk.style,'dunk');
  const slam=frameAt(dunk,dunk.resultAt);
  assert.ok(Math.abs(slam[0])<.05&&Math.abs(slam[1]-HOOP.rimY)<.12,'released at the rim');
  assert.ok(dunk.frames.some(frame=>inside(frame)&&below(frame)),'goes down through the net');
  assert.ok(dunk.events.filter(event=>event.type==='net').length===1);
});

// --- The ball held in both paws while a team waits (public/basketball/hold.png) ---
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {HOLD,SPRITE,FEET,holdPoint,footLift} from '../src/basket3d/hold.mjs';
import {ANIMALS} from '../src/basketball-model.mjs';

/** Minimal reader for an 8-bit RGBA, non-interlaced PNG: returns {width, height, at(x,y) -> [r,g,b,a]}. */
function readPng(file){
  const data=readFileSync(file);let offset=8,width=0,height=0;const parts=[];
  while(offset<data.length){
    const length=data.readUInt32BE(offset),type=data.toString('latin1',offset+4,offset+8),body=data.subarray(offset+8,offset+8+length);
    if(type==='IHDR'){width=body.readUInt32BE(0);height=body.readUInt32BE(4);assert.deepEqual([body[8],body[9],body[12]],[8,6,0],'8-bit RGBA, not interlaced');}
    if(type==='IDAT')parts.push(body);
    offset+=12+length;
  }
  const raw=inflateSync(Buffer.concat(parts)),stride=width*4,pixels=Buffer.alloc(stride*height);
  const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  for(let y=0;y<height;y++){
    const filter=raw[y*(stride+1)],line=y*(stride+1)+1,out=y*stride;
    for(let x=0;x<stride;x++){
      const left=x>=4?pixels[out+x-4]:0,up=y?pixels[out-stride+x]:0,corner=y&&x>=4?pixels[out-stride+x-4]:0;
      pixels[out+x]=(raw[line+x]+[0,left,up,(left+up)>>1,paeth(left,up,corner)][filter])&255;
    }
  }
  return {width,height,at:(x,y)=>[...pixels.subarray((y*width+x)*4,(y*width+x)*4+4)]};
}

test('every animal has a held-ball picture, measured from the current artwork',()=>{
  const file='public'+HOLD.url;
  assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),HOLD.sha256,'hold.png changed: measure the ball positions again and update hold.mjs');
  assert.deepEqual(Object.keys(HOLD.cells).sort(),ANIMALS.map(animal=>animal.id).sort());
  const image=readPng(file),[w,h]=HOLD.cell;
  assert.deepEqual([image.width,image.height],[w*HOLD.cols,h*HOLD.rows]);
  for(const [id,cell] of Object.entries(HOLD.cells)){
    const [bx,by]=cell.ball,ox=cell.col*w,oy=cell.row*h;
    // The measured circle really is the painted basketball: orange and opaque at its centre and most of the way out.
    let orange=0,total=0;
    for(let a=0;a<12;a++)for(const part of [0,.45,.7]){
      const x=Math.round(ox+bx+Math.cos(a*Math.PI/6)*cell.radius*part),y=Math.round(oy+by+Math.sin(a*Math.PI/6)*cell.radius*part),[r,g,b,alpha]=image.at(x,y);
      total++;if(alpha>200&&r>150&&g>50&&g<190&&b<110&&r-b>90)orange++;
    }
    assert.ok(orange/total>.6,`${id}: the measured spot is not on the painted ball (${orange}/${total} orange samples)`);
    // Same foot line as the empty-pawed ready pose, so swapping pictures does not make the animal jump.
    const lowest=(picture,left,top)=>{for(let y=h-1;y>0;y--)for(let x=0;x<w;x++)if(picture.at(left+x,top+y)[3]>128)return y;return 0;};
    assert.ok(Math.abs(lowest(image,ox,oy)-FEET[id].ready)<=2,`${id}: held-ball picture stands on the ready pose's foot line`);
  }
});

test('the hidden 3D ball sits on the painted ball, in front of the chest',()=>{
  for(const id of Object.keys(HOLD.cells)){
    const at=holdPoint(id,{x:4.7,y:0,z:0}),cell=HOLD.cells[id];
    assert.ok(Math.abs(at.x-4.7)<SPRITE.width/2&&at.x<4.7,`${id}: ball is on the hoop side of the body`);
    assert.ok(at.y>.75&&at.y<1.35,`${id}: ball is at chest height, got ${at.y.toFixed(2)} m`);
    assert.ok(Math.abs(at.y-((1-cell.ball[1]/HOLD.cell[1])*SPRITE.height-footLift(id,4)))<1e-9&&Math.abs(at.x-(4.7+(cell.ball[0]/HOLD.cell[0]-.5)*SPRITE.width))<1e-9);
    assert.ok(at.scale>1.2&&at.scale<2.6,`${id}: painted ball size is plausible`);
    const crouched=holdPoint(id,{x:4.7,y:0,z:0},.91);assert.ok(crouched.y<at.y,'follows the crouch');
  }
});

test('the foot lines match the original sheets, so standing animals touch the floor',()=>{
  const sheets={},[w,h]=HOLD.cell;
  for(const animal of ANIMALS){
    const sheet=sheets[animal.sheet]??=readPng('public/basketball/'+animal.sheet+'.png'),top=animal.row*h;
    const lowest=pose=>{for(let y=h-1;y>0;y--)for(let x=0;x<w;x++)if(sheet.at(pose*w+x,top+y)[3]>128)return y;return 0;};
    assert.ok(Math.abs(lowest(0)-FEET[animal.id].ready)<=1,animal.id+' ready line');
    assert.ok(Math.abs(lowest(3)-FEET[animal.id].miss)<=1,animal.id+' missed-shot line');
    assert.ok(footLift(animal.id,0)>0&&footLift(animal.id,0)<.25,animal.id+' lift is small');
  }
});
