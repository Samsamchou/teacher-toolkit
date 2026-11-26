// 3D bowling physics (Rapier). Pure simulation: no rendering, runs in the browser and in Node tests.
// Units are metres; +Y is up and the ball travels toward -Z. Results are recorded, then played back.
import {PIN_POSITIONS} from '../bowling-motion.mjs';

export const LANE={width:1.06,length:8.5,gutter:.235,gutterDepth:.05,deckEnd:1.15,pitDepth:.32,pitLength:.85,approach:1.4};
export const BALL_RADIUS=.109;
export const PIN_HEIGHT=.381;
export const PIN_SPACING=.3048;
export const PIN_PROFILE=[[0,.0255],[.012,.029],[.05,.045],[.095,.0585],[.125,.0605],[.16,.056],[.205,.038],
  [.245,.0245],[.27,.0228],[.3,.027],[.335,.0323],[.36,.029],[.375,.018],[.381,.002]];
export const STEP=1/120;
const PHYSICS_LEAD=1.0; // metres before the head pin where the analytic roll hands over to the solver
const ROW_DEPTH=PIN_SPACING*Math.sqrt(3)/2;

export function pinWorldPosition(id){
  const p=PIN_POSITIONS[id];
  const row=Math.round((.27-p.y)/.07);
  return {x:(p.x-.5)/.09*PIN_SPACING,y:0,z:-LANE.length-row*ROW_DEPTH};
}
export const laneX=fraction=>(fraction-.5)*(LANE.width-BALL_RADIUS*2-.06);

function hullPoints(){
  const points=[],segments=10;
  for(const [h,r] of PIN_PROFILE)for(let i=0;i<segments;i++){
    const a=i/segments*Math.PI*2;points.push(Math.cos(a)*r,h,Math.sin(a)*r);
  }
  return new Float32Array(points);
}
const PIN_HULL=hullPoints();

// A shot is {startX, entryX, entryVx, speed, mass}. The solver only sees the entry state at the hand-over
// point, so the same entry always gives the same pin fall whatever lane the ball started from.
// Before the hand-over the roll is analytic: constant forward speed, constant sideways (hook) acceleration.
export const handoverTime=shot=>(LANE.length-PHYSICS_LEAD)/shot.speed;
export function fitRoll(shot){
  const th=handoverTime(shot);
  const hook=2*(shot.entryVx*th-(shot.entryX-shot.startX))/(th*th);
  return {th,hook,vx0:shot.entryVx-hook*th};
}
export function rollState(shot,t){
  const {hook,vx0}=fitRoll(shot);
  return {x:shot.startX+vx0*t+.5*hook*t*t,z:-shot.speed*t,vx:vx0+hook*t,vz:-shot.speed};
}
export function staysOnLane(shot){
  const limit=LANE.width/2-BALL_RADIUS*.75,{th,hook}=fitRoll(shot);
  if(Math.abs(hook)>2.6)return false;
  for(let i=0;i<=16;i++)if(Math.abs(rollState(shot,th*i/16).x)>limit)return false;
  return true;
}

function buildWorld(R,remaining,locked){
  const world=new R.World({x:0,y:-9.81,z:0});
  world.timestep=STEP;
  const fixed=(hx,hy,hz,x,y,z,friction=.25,restitution=.2)=>world.createCollider(
    R.ColliderDesc.cuboid(hx,hy,hz).setTranslation(x,y,z).setFriction(friction).setRestitution(restitution));
  const half=LANE.width/2,deckBack=-LANE.length-LANE.deckEnd,outer=half+LANE.gutter;
  const laneLen=LANE.approach-deckBack;
  fixed(half,.1,laneLen/2,0,-.1,(LANE.approach+deckBack)/2,.18,.25); // lane and pin deck
  for(const side of [-1,1]){
    fixed(LANE.gutter/2,.1,laneLen/2,side*(half+LANE.gutter/2),-.1-LANE.gutterDepth,(LANE.approach+deckBack)/2,.3,.1);
    fixed(.05,.5,(laneLen+LANE.pitLength)/2,side*(outer+.05),.3,(LANE.approach+deckBack-LANE.pitLength)/2,.3,.45); // kickback
  }
  fixed(outer,.1,LANE.pitLength/2,0,-.1-LANE.pitDepth,deckBack-LANE.pitLength/2,.9,.05); // pit floor
  fixed(outer,.6,.08,0,.3,deckBack-LANE.pitLength-.08,.9,.08); // curtain
  const pins=new Map();
  for(const id of remaining){
    const p=pinWorldPosition(id);
    const desc=(locked.has(id)?R.RigidBodyDesc.fixed():R.RigidBodyDesc.dynamic().setCcdEnabled(true).setAngularDamping(.35).setLinearDamping(.05))
      .setTranslation(p.x,0,p.z);
    const body=world.createRigidBody(desc);
    const collider=world.createCollider(R.ColliderDesc.convexHull(PIN_HULL).setMass(1.55).setFriction(.32).setRestitution(.55),body);
    collider.setActiveEvents(R.ActiveEvents.CONTACT_FORCE_EVENTS);
    collider.setContactForceEventThreshold(18);
    pins.set(id,{body,collider});
  }
  return {world,pins};
}

const tiltOf=q=>1-2*(q.x*q.x+q.z*q.z); // Y component of the pin's up axis
export const pinIsDown=(q,y)=>tiltOf(q)<.86||y<-.025;

/**
 * Simulates one delivery from the hand-over point until everything settles.
 * shot: {startX,targetX,speed,hook,mass}; options.locked pins cannot move; options.boosts=[{id,at,impulse:{x,y,z}}].
 * Returns the fallen pin ids plus a frame-by-frame recording used by the renderer.
 */
export function simulateShot(R,shot,remaining,options={}){
  const locked=new Set(options.locked||[]),boosts=[...(options.boosts||[])].sort((a,b)=>a.at-b.at);
  const record=options.record!==false,maxTime=options.maxTime??4.2;
  const {world,pins}=buildWorld(R,remaining,locked);
  const ball=world.createRigidBody(R.RigidBodyDesc.dynamic().setCcdEnabled(true)
    .setTranslation(shot.entryX,BALL_RADIUS,-LANE.length+PHYSICS_LEAD).setLinvel(shot.entryVx,0,-shot.speed)
    .setAngvel({x:-shot.speed/BALL_RADIUS,y:0,z:-shot.entryVx/BALL_RADIUS}));
  const ballCollider=world.createCollider(R.ColliderDesc.ball(BALL_RADIUS).setMass(shot.mass??6.8).setFriction(.2).setRestitution(.28),ball);
  const handles=new Map([[ballCollider.handle,'ball']]);
  for(const [id,pin] of pins)handles.set(pin.collider.handle,id);
  const queue=new R.EventQueue(true),order=[...pins.keys()];
  const frames=[],contacts=[],firstMove=new Map(),downAt=new Map();
  let time=0,quiet=0,boostIndex=0,ballGone=null;
  const capture=()=>{
    const data=new Float32Array(7*(order.length+1));
    const write=(body,offset)=>{const t=body.translation(),q=body.rotation();data.set([t.x,t.y,t.z,q.x,q.y,q.z,q.w],offset);};
    write(ball,0);order.forEach((id,i)=>write(pins.get(id).body,7*(i+1)));
    frames.push(data);
  };
  if(record)capture();
  while(time<maxTime){
    while(boostIndex<boosts.length&&boosts[boostIndex].at<=time){
      const boost=boosts[boostIndex++],pin=pins.get(boost.id);
      if(pin&&!locked.has(boost.id)){
        pin.body.applyImpulseAtPoint(boost.impulse,{x:pin.body.translation().x,y:pin.body.translation().y+.22,z:pin.body.translation().z},true);
        contacts.push({t:time,a:boost.id,b:'pin',force:260});
      }
    }
    world.step(queue);time+=STEP;
    queue.drainContactForceEvents(event=>{
      const a=handles.get(event.collider1())??'lane',b=handles.get(event.collider2())??'lane';
      if(contacts.length<400)contacts.push({t:time,a,b,force:event.maxForceMagnitude()});
    });
    let moving=false;
    for(const id of order){
      const body=pins.get(id).body,v=body.linvel(),speed=Math.hypot(v.x,v.y,v.z);
      if(speed>.25&&!firstMove.has(id))firstMove.set(id,time);
      if(!downAt.has(id)&&firstMove.has(id)&&pinIsDown(body.rotation(),body.translation().y))downAt.set(id,time);
      if(speed>.05&&!body.isSleeping())moving=true;
    }
    const bt=ball.translation(),bv=ball.linvel();
    if(ballGone===null&&bt.y<-.12)ballGone=time;
    if(Math.hypot(bv.x,bv.y,bv.z)>.08&&bt.y>-.12)moving=true;
    if(record)capture();
    quiet=moving?0:quiet+STEP;
    if(quiet>.3&&boostIndex>=boosts.length)break;
  }
  const fallen=order.filter(id=>{const body=pins.get(id).body;return pinIsDown(body.rotation(),body.translation().y);});
  const result={fallen,order,duration:time,contacts,firstMove:Object.fromEntries(firstMove),downAt:Object.fromEntries(downAt),
    impactAt:firstMove.size?Math.min(...firstMove.values()):null,ballGoneAt:ballGone,frames:record?frames:null,
    shot,locked:[...locked],boosted:boosts.map(b=>b.id)};
  queue.free();world.free();
  return result;
}
