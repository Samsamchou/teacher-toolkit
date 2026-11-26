// Chooses a real physics delivery whose pin fall equals the count already decided by the game rules.
// Order of preference: precomputed entry → short random search → the same physics with a few pins
// held or nudged (always exact). The score never depends on what the solver happens to do.
import {LANE,BALL_RADIUS,STEP,simulateShot,fitRoll,rollState,staysOnLane,pinWorldPosition,laneX} from './physics.mjs';

export function makeRng(seed){
  let s=seed>>>0||1;
  return()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
}
const now=()=>globalThis.performance?.now?.()??Date.now();
const isFullRack=remaining=>(remaining.length===10||remaining.length===5)&&remaining.every((id,i)=>id===i);

function quatMul(a,b){return [a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],
  a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];}
function rollQuat(q,vx,vz,dt){
  const wx=vz/BALL_RADIUS,wz=-vx/BALL_RADIUS,w=Math.hypot(wx,wz);
  if(w<1e-6)return q;
  const half=w*dt/2,s=Math.sin(half)/w;
  return quatMul([wx*s,0,wz*s,Math.cos(half)],q);
}
function pinFrame(order){
  const data=new Float32Array(7*(order.length+1));
  order.forEach((id,i)=>{const p=pinWorldPosition(id);data.set([p.x,0,p.z,0,0,0,1],7*(i+1));});
  return data;
}

export function randomEntry(rng,remaining,startX){
  const pin=pinWorldPosition(remaining[Math.floor(rng()*remaining.length)]);
  const speed=6.6+rng()*2.2,entryVx=(rng()-.5)*1.5;
  const atPins=pin.x+(rng()-.5)*.26;
  const limit=LANE.width/2-BALL_RADIUS-.02;
  return {startX,entryX:Math.max(-limit,Math.min(limit,atPins-entryVx/speed)),entryVx,speed,mass:6.8};
}

// Holds or nudges pins until the fall equals `count`. Deterministic and guaranteed to finish.
export function adjustToCount(R,shot,remaining,count,base){
  let result=base;const locked=new Set(),boosts=[];
  const at=id=>pinWorldPosition(id);
  const nudge=(id,fallen,strength)=>{
    const p=at(id);let from={x:shot.entryX,z:p.z+1},best=Infinity,source=null;
    for(const other of fallen){const o=at(other),d=Math.hypot(o.x-p.x,o.z-p.z);if(d<best){best=d;from=o;source=other;}}
    if(source===null)best=.6;
    let dx=p.x-from.x,dz=Math.min(-.05,p.z-from.z);const n=Math.hypot(dx,dz);dx/=n;dz/=n;
    const when=(result.firstMove[source]??result.impactAt??.16)+.07+best*.09;
    return {id,at:when,impulse:{x:dx*strength,y:strength*.12,z:dz*strength}};
  };
  for(let pass=0;pass<5&&result.fallen.length!==count;pass++){
    const fallen=result.fallen;
    if(fallen.length>count){
      // Keep the pins the ball reached first; hold the ones that fell last.
      const late=[...fallen].sort((a,b)=>(result.downAt[b]??0)-(result.downAt[a]??0));
      late.slice(0,fallen.length-count).forEach(id=>locked.add(id));
    }else{
      const standing=remaining.filter(id=>!fallen.includes(id)&&!locked.has(id));
      const near=id=>fallen.length?Math.min(...fallen.map(o=>Math.hypot(at(o).x-at(id).x,at(o).z-at(id).z))):Math.abs(at(id).x-shot.entryX);
      standing.sort((a,b)=>near(a)-near(b)).slice(0,count-fallen.length).forEach(id=>boosts.push(nudge(id,fallen,4.2+pass)));
    }
    result=simulateShot(R,shot,remaining,{locked:[...locked],boosts});
  }
  if(result.fallen.length!==count){
    // Last resort: exactly `count` pins may move, and every one of them is pushed over.
    const keep=[...result.fallen,...remaining.filter(id=>!result.fallen.includes(id))].slice(0,count);
    const hold=remaining.filter(id=>!keep.includes(id));
    const push=keep.map(id=>nudge(id,keep.filter(other=>other!==id),11));
    result=simulateShot(R,shot,remaining,{locked:hold,boosts:push});
  }
  return result;
}

function gutterRecording(startX,order,rng,late=false){
  const side=startX===0?(rng()<.5?-1:1):Math.sign(startX),speed=7,frames=[],half=LANE.width/2;
  const edgeX=side*(half+LANE.gutter/2),turnZ=-LANE.length*(late?.86:.34+rng()*.14),deckBack=-LANE.length-LANE.deckEnd;
  let q=[0,0,0,1],x=startX,y=BALL_RADIUS,z=0,vy=0,t=0,px=x,dropAt=null,goneAt=null;
  const pins=pinFrame(order);
  while(t<4){
    const u=Math.min(1,z/turnZ),ease=u*u*(3-2*u);
    x=startX+(edgeX-startX)*ease;
    const floor=Math.abs(x)>half-.03?(z<deckBack?-LANE.pitDepth:-LANE.gutterDepth):0;
    if(floor<0&&dropAt===null)dropAt=t;
    vy-=9.81*STEP;y+=vy*STEP;
    if(y<BALL_RADIUS+floor){y=BALL_RADIUS+floor;vy=Math.abs(vy)>1?-vy*.25:0;}
    if(z<deckBack&&goneAt===null)goneAt=t;
    const forward=z<deckBack-.25?speed*.25:speed;
    q=rollQuat(q,(x-px)/STEP,-forward,STEP);px=x;
    const frame=new Float32Array(pins);frame.set([x,y,z,q[0],q[1],q[2],q[3]],0);frames.push(frame);
    z-=forward*STEP;t+=STEP;
    if(goneAt!==null&&t>goneAt+.45)break;
  }
  return {kind:'gutter',frames,order,fallen:[],contacts:[],firstMove:{},downAt:{},impactAt:null,rollEnd:0,
    gutterAt:dropAt,ballGoneAt:goneAt,duration:t,assisted:false,side};
}

function finalize(result,shot){
  const {th}=fitRoll(shot),frames=[],pins=pinFrame(result.order);
  let q=[0,0,0,1];
  const steps=Math.round(th/STEP);
  for(let i=0;i<steps;i++){
    const state=rollState(shot,i*STEP);
    const frame=new Float32Array(pins);frame.set([state.x,BALL_RADIUS,state.z,q[0],q[1],q[2],q[3]],0);frames.push(frame);
    q=rollQuat(q,state.vx,state.vz,STEP);
  }
  for(const frame of result.frames){
    const spun=quatMul([frame[3],frame[4],frame[5],frame[6]],q);
    frame.set(spun,3);frames.push(frame);
  }
  const offset=steps*STEP,shift=value=>value==null?null:value+offset;
  const move=Object.fromEntries(Object.entries(result.firstMove).map(([id,t])=>[id,t+offset]));
  const down=Object.fromEntries(Object.entries(result.downAt).map(([id,t])=>[id,t+offset]));
  return {kind:'physics',frames,order:result.order,fallen:result.fallen,rollEnd:offset,
    contacts:result.contacts.map(c=>({...c,t:c.t+offset})),firstMove:move,downAt:down,
    impactAt:shift(result.impactAt),ballGoneAt:shift(result.ballGoneAt),duration:result.duration+offset,
    assisted:result.locked.length>0||result.boosted.length>0,shot};
}

/**
 * Roll for a power card that never reaches the pins: the ball drifts to the centre line and stops at
 * `stopZ`, where the card's own effect takes over. Purely analytic, so the pins cannot move.
 */
export function cardRollRecording(remaining,startFraction=.5,{stopZ=-LANE.length+1.6,speed=5.2}={}){
  const order=[...remaining].sort((a,b)=>a-b),startX=laneX(startFraction),pins=pinFrame(order),frames=[];
  const duration=-stopZ/speed;let q=[0,0,0,1],px=startX;
  for(let t=0;t<duration;t+=STEP){
    const u=Math.min(1,t/(duration*.7)),x=startX*(1-u*u*(3-2*u)),z=-speed*t;
    const frame=new Float32Array(pins);frame.set([x,BALL_RADIUS,z,q[0],q[1],q[2],q[3]],0);frames.push(frame);
    q=rollQuat(q,(x-px)/STEP,-speed,STEP);px=x;
  }
  const last=new Float32Array(pins);last.set([0,BALL_RADIUS,stopZ,q[0],q[1],q[2],q[3]],0);frames.push(last);
  return {kind:'card',frames,order,fallen:[],contacts:[],firstMove:{},downAt:{},impactAt:null,ballGoneAt:null,rollEnd:duration,
    effectAt:duration,duration,assisted:false,stopZ,speed};
}

/**
 * request: {remaining:number[], count:number, startFraction:0..1 lane position, seed, budgetMs, table}
 * Returns a recording whose `fallen.length` always equals `count`.
 */
export function planShot(R,request){
  const remaining=[...request.remaining].sort((a,b)=>a-b);
  const count=Math.max(0,Math.min(remaining.length,request.count|0));
  const rng=makeRng(request.seed??Math.floor(Math.random()*2**31));
  const startX=laneX(request.startFraction??.5);
  const deadline=now()+(request.budgetMs??450);
  if(count===0&&(request.gutterLate||isFullRack(remaining)||rng()<.5))return gutterRecording(startX,remaining,rng,!!request.gutterLate);
  const run=shot=>simulateShot(R,shot,remaining);
  const usable=shot=>staysOnLane(shot);
  // 1. Precomputed entries for a full rack.
  const rows=isFullRack(remaining)?request.table?.[remaining.length===10?'ten':'five']?.[count]:null;
  if(rows?.length){
    const ranked=rows.map(row=>({row,score:Math.abs(row[0]-startX*.55)+rng()*.35})).sort((a,b)=>a.score-b.score);
    for(const {row} of ranked.slice(0,3)){
      const shot={startX,entryX:row[0],entryVx:row[1],speed:row[2],mass:6.8};
      if(!usable(shot))continue;
      const result=simulateShot(R,shot,remaining,{locked:row[3]||[]});
      if(result.fallen.length===count)return finalize(result,shot);
    }
  }
  // 2. Random search within the time budget.
  let best=null,tries=0;
  while(tries<(request.maxTries??40)&&(tries<2||now()<deadline)){
    const shot=randomEntry(rng,remaining,startX);
    if(count===0){ // aim for a gap outside the standing pins
      const xs=remaining.map(id=>pinWorldPosition(id).x),edge=rng()<.5?Math.min(...xs)-.3:Math.max(...xs)+.3;
      shot.entryX=Math.max(-.4,Math.min(.4,edge));shot.entryVx=0;
    }
    if(!usable(shot))continue;
    tries++;
    const result=run(shot);
    if(result.fallen.length===count)return finalize(result,shot);
    const gap=Math.abs(result.fallen.length-count)+(result.fallen.length<count?.4:0)+(result.impactAt===null?5:0);
    if(!best||gap<best.gap)best={gap,result,shot};
  }
  if(count===0)return gutterRecording(startX,remaining,rng);
  // 3. Same physics, with pins held or nudged until the count is exact.
  return finalize(adjustToCount(R,best.shot,remaining,count,best.result),best.shot);
}
