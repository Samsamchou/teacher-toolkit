// Arcade collision choreography in lane-space; deterministic and shared by game and motion lab.
export const PIN_POSITIONS = [
  {id:0,x:.5,y:.27},{id:1,x:.455,y:.20},{id:2,x:.545,y:.20},
  {id:3,x:.41,y:.13},{id:4,x:.5,y:.13},{id:5,x:.59,y:.13},
  {id:6,x:.365,y:.06},{id:7,x:.455,y:.06},{id:8,x:.545,y:.06},{id:9,x:.635,y:.06},
];
export const BALL_DIAMETER=78*1.65;
export const PIN_MOTION_DURATION=1650;
export const zoneCenter=(zone,count)=>.19+.62*(zone-.5)/count;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const ease=v=>v*v*(3-2*v);
const distance=(a,b)=>Math.hypot((a.x-b.x)*1.45,a.y-b.y);

// A connected contact tree, instead of independently selecting the nearest columns.
// For a second shot, disconnected survivors can be contacted directly by the ball.
export function selectContactPins(remaining,count,hitX,random=Math.random){
  const pool=[...remaining],selected=[];
  const root={x:hitX,y:.34};
  while(selected.length<count&&pool.length){
    let best=0,bestCost=Infinity;
    pool.forEach((id,index)=>{
      const p=PIN_POSITIONS[id];
      const ballCost=distance(p,root)*1.3;
      const chainCost=selected.length?Math.min(...selected.map(other=>{
        const source=PIN_POSITIONS[other];
        return distance(p,source)+Math.max(0,p.y-source.y)*1.8;
      })):Infinity;
      const cost=Math.min(ballCost,chainCost)+random()*.009;
      if(cost<bestCost){bestCost=cost;best=index;}
    });
    selected.push(pool.splice(best,1)[0]);
  }
  return selected;
}

export function ballFrame(path,t,impactPoint){
  t=clamp(t,0,1);
  const hitTime=.79;
  const p=clamp(t/hitTime,0,1),travel=ease(p);
  const target=impactPoint||{x:path.endX,y:.16};
  const x=t<=hitTime?path.startX+(target.x-path.startX)*travel+path.bend*Math.sin(Math.PI*p):
    target.x+(path.endX-target.x)*(t-hitTime)/(1-hitTime);
  const y=t<=hitTime?.84+(target.y-.84)*travel:target.y-(t-hitTime)*.48;
  return {x,y,scale:1-.70*travel,spin:t*880,impact:t>=hitTime};
}

export function createPinMotion(fallenPins,trajectory={endX:.5,bend:0},remaining=PIN_POSITIONS.map(p=>p.id)){
  const pending=[...new Set(fallenPins)].filter(id=>remaining.includes(id)&&PIN_POSITIONS[id]);
  const records=[];
  const hitX=trajectory.endX??.5;
  while(pending.length){
    let choice;
    for(const id of pending){
      const pin=PIN_POSITIONS[id];
      const directDistance=distance(pin,{x:hitX,y:.34});
      let source=null,cost=directDistance,at=directDistance*340;
      for(const previous of records){
        const gap=distance(pin,PIN_POSITIONS[previous.id]);
        const backPenalty=Math.max(0,pin.y-PIN_POSITIONS[previous.id].y)*2;
        const arrival=previous.delay+42+gap*520+backPenalty*500;
        if(gap+backPenalty<cost&&arrival<at+160){source=previous;cost=gap+backPenalty;at=arrival;}
      }
      if(!choice||at<choice.at)choice={id,pin,source,cost,at};
    }
    const {id,pin,source}=choice;
    const from=source?PIN_POSITIONS[source.id]:{x:hitX-(trajectory.bend||0)*.12,y:.34};
    let dx=(pin.x-from.x)*1.5+(trajectory.bend||0)*.09;
    let dy=Math.min(-.018,pin.y-from.y);
    const magnitude=Math.hypot(dx,dy);dx/=magnitude;dy/=magnitude;
    const energy=clamp(source?source.energy*.78+.07:.96-Math.abs(pin.x-hitX),.36,1);
    records.push({id,sourceId:source?.id??null,delay:clamp(choice.at,0,440),energy,dx,dy,
      travel:.025+energy*.038,spin:(id%2?1:-1)*(12+energy*26),duration:840+id%3*95});
    pending.splice(pending.indexOf(id),1);
  }
  if(records.length){const first=Math.min(...records.map(p=>p.delay));records.forEach(p=>{p.delay-=first;});}
  return {pins:records,duration:Math.max(0,...records.map(p=>p.delay+p.duration)),
    impactPoint:records.length?{x:PIN_POSITIONS[records[0].id].x,y:pinFootY(records[0].id)}:null};
}

export const pinFootY=id=>.18+PIN_POSITIONS[id].y*.42;
export function samplePinMotion(record,elapsed){
  if(!record||elapsed<record.delay)return {fallen:false,x:0,y:0,lift:0,lean:0,angle:0,spin:0,settled:false};
  const u=clamp((elapsed-record.delay)/record.duration,0,1);
  const tip=clamp(u/.47,0,1);
  // Gravity accelerates the lean; damped bounce peaks after first floor contact.
  const lean=Math.min(1,tip*tip*1.12);
  const slide=1-Math.pow(1-u,2.8);
  const bounce=u>.42?Math.abs(Math.sin((u-.42)*Math.PI*4.6))*Math.exp(-(u-.42)*7)*.011*record.energy:0;
  return {fallen:true,x:record.dx*record.travel*slide,y:record.dy*record.travel*slide,
    lift:bounce,lean,angle:Math.atan2(record.dy,record.dx)*180/Math.PI,
    spin:record.spin*ease(u),settled:u>=1};
}
