// 3D basketball shot planner. The rules have already decided hit or miss; this only chooses how the ball
// gets there (swish, bank, rim roll, rim-out, brick, air ball) and records the flight frame by frame.
// Pure maths (ballistic arcs, no physics engine), so it runs in the browser and in Node tests.
// Units are metres, +Y up. The rim centre is at x=0,z=0; the shooter stands along +X.

export const HOOP={rimY:3.05,rimR:.23,boardX:-.38,ballR:.12};
/** Distance from the rim to where the shooter stands, by shot value. */
export const SPOTS={1:2.8,2:4.7,3:6.75,4:8.1};
export const STEP=1/120;
const G=9.81,R=HOOP.ballR;
export const HIT_STYLES=['swish','bank','rim-in'],MISS_STYLES=['rim-out','brick','in-out','air'];

export function makeRng(seed){
  let s=seed>>>0||1;
  return()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
}
export const releasePoint=points=>({x:SPOTS[points]-.35,y:2.2,z:0});

/**
 * request: {points:1|2|3|4, hit:boolean, style?, seed?}
 * Returns {frames:Float32Array[] (x,y,z,qx,qy,qz,qw per 1/120 s), events:[{t,type,x,y,z,strength}],
 *   hit, points, style, resultAt (ball through the net, or the first touch that shows the miss), duration}.
 */
export function planShot(request){
  const rng=makeRng(request.seed??Math.floor(Math.random()*2**31)),points=request.points,hit=!!request.hit;
  if(!SPOTS[points])throw Error('Shot value must be 1, 2, 3 or 4.');
  const pick=(list,weights)=>{let roll=rng()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<list.length;i++){roll-=weights[i];if(roll<0)return list[i];}return list[0];};
  const style=request.style||(hit?pick(HIT_STYLES,[55,20,25]):pick(MISS_STYLES,[40,25,20,15]));
  if(!(hit?HIT_STYLES:MISS_STYLES).includes(style))throw Error(`Style ${style} does not match the result.`);
  const frames=[],events=[],start=releasePoint(points),side=rng()<.5?-1:1;
  let p={...start},v={x:0,y:0,z:0},t=0,spin=0,resultAt=null;
  const push=()=>{const half=spin/2;frames.push(new Float32Array([p.x,p.y,p.z,0,0,Math.sin(half),Math.cos(half)]));};
  const mark=(type,strength=1)=>events.push({t,type,x:p.x,y:p.y,z:p.z,strength});
  // Ballistic arc that reaches `to` after `time` seconds.
  const fly=(to,time,type,strength)=>{
    const v0={x:(to.x-p.x)/time,y:(to.y-p.y)/time+.5*G*time,z:(to.z-p.z)/time},from={...p},steps=Math.max(1,Math.round(time/STEP));
    for(let i=1;i<=steps;i++){
      const s=i/steps*time;p={x:from.x+v0.x*s,y:from.y+v0.y*s-.5*G*s*s,z:from.z+v0.z*s};t+=time/steps;spin+=9*time/steps;push();
    }
    v={x:v0.x,y:v0.y-G*time,z:v0.z};if(type)mark(type,strength);
  };
  // Free flight with floor bounces until the ball settles or `time` runs out.
  const free=time=>{
    const end=t+time;
    while(t<end){
      v.y-=G*STEP;p={x:p.x+v.x*STEP,y:p.y+v.y*STEP,z:p.z+v.z*STEP};
      if(p.y<R){p.y=R;if(v.y<-.9){mark('floor',Math.min(1,-v.y/6));v.y*=-.62;v.x*=.82;v.z*=.82;}else{v.y=0;v.x*=.985;v.z*=.985;}}
      t+=STEP;spin+=(v.x<0?1:-1)*Math.hypot(v.x,v.z)/R*STEP;push();
    }
  };
  push();mark('release');
  const flight=.92+.105*SPOTS[points],rim={x:0,y:HOOP.rimY,z:0};
  const net=()=>{ // the net catches the ball: it slows, drops straight down and bounces under the hoop
    resultAt=t;mark('net');v={x:.35+rng()*.3,y:Math.min(v.y,-1.6)*.55,z:(rng()-.5)*.5};free(1.55);
  };
  if(style==='swish'){fly({x:.01,y:HOOP.rimY+.03,z:0},flight,null);net();}
  else if(style==='bank'){fly({x:HOOP.boardX+R+.01,y:3.44,z:side*.1},flight*1.02,'board',.7);fly({x:-.03,y:HOOP.rimY+.04,z:0},.3,null);net();}
  else if(style==='rim-in'){fly({x:HOOP.rimR-.02,y:HOOP.rimY+R*.7,z:side*.03},flight,'rim',.8);fly({x:-.01,y:HOOP.rimY+.04,z:0},.62,null);net();}
  else if(style==='rim-out'){fly({x:HOOP.rimR+.01,y:HOOP.rimY+R*.75,z:side*.04},flight,'rim',1);resultAt=t;v={x:1.5+rng()*.6,y:2.7,z:side*(.9+rng()*.6)};free(1.7);}
  else if(style==='brick'){fly({x:HOOP.boardX+R,y:3.22,z:side*.28},flight*.95,'board',1);resultAt=t;v={x:2.3+rng()*.5,y:.9,z:side*(.6+rng()*.5)};free(1.7);}
  else if(style==='in-out'){
    fly({x:.04,y:HOOP.rimY+R*.8,z:side*.12},flight,'rim',.7);fly({x:-.11,y:HOOP.rimY+R*.85,z:-side*.1},.2,'rim',.6);fly({x:.13,y:HOOP.rimY+R*.9,z:side*.06},.22,'rim',.5);
    resultAt=t;v={x:1.1,y:1.6,z:side*.9};free(1.6);
  }else{ // air ball: falls short of the rim
    fly({x:.62,y:R,z:side*.1},flight*1.13,'floor',.8);resultAt=t;v={x:v.x*.7,y:-v.y*.55,z:v.z};free(1.2);
  }
  return {frames,events,hit,points,style,resultAt,duration:t,start,rim};
}

/** Slam Dunk: the ball is carried to the rim (frames follow the player's hands) and thrown down through the net. */
export function planDunk(request={}){
  const rng=makeRng(request.seed??1),frames=[],events=[],from=releasePoint(3);
  let p={x:from.x,y:1.25,z:0},t=0;
  const push=()=>frames.push(new Float32Array([p.x,p.y,p.z,0,0,0,1]));
  const mark=(type,strength=1)=>events.push({t,type,x:p.x,y:p.y,z:p.z,strength});
  const run=1.15,jump=.55,runEnd=1.25; // run to 1.25 m from the rim, then jump
  push();mark('release');
  for(let s=STEP;s<=run;s+=STEP){const u=s/run;p={x:from.x+(runEnd-from.x)*u*u*(3-2*u),y:1.25+Math.abs(Math.sin(u*Math.PI*5))*.22,z:0};t+=STEP;push();if(Math.abs(Math.sin(u*Math.PI*5))<.06&&s>.1)mark('floor',.35);}
  mark('jump');
  for(let s=STEP;s<=jump;s+=STEP){const u=s/jump,e=1-Math.pow(1-u,2);p={x:runEnd+(.12-runEnd)*e,y:1.25+(HOOP.rimY+.42-1.25)*e,z:0};t+=STEP;push();}
  const hang={...p};
  for(let s=STEP;s<=.14;s+=STEP){const u=s/.14;p={x:hang.x+(0-hang.x)*u,y:hang.y+(HOOP.rimY-.02-hang.y)*u*u,z:0};t+=STEP;push();}
  const resultAt=t;mark('rim',1);mark('net');
  let v={x:.3+rng()*.2,y:-7.5,z:(rng()-.5)*.4};
  for(let s=0;s<1.5;s+=STEP){v.y-=G*STEP;p={x:p.x+v.x*STEP,y:p.y+v.y*STEP,z:p.z+v.z*STEP};if(p.y<R){p.y=R;if(v.y<-.9){mark('floor',Math.min(1,-v.y/6));v.y*=-.6;v.x*=.8;v.z*=.8;}else v.y=0;}t+=STEP;push();}
  return {frames,events,hit:true,points:3,style:'dunk',resultAt,duration:t,start:from,rim:{x:0,y:HOOP.rimY,z:0},run,jump,runEnd};
}
