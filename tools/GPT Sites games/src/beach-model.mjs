export const BEACH_GAME = {id:'beach',name:'Beach Cleanup',description:'Two teams. One beautiful coast. Choose a trail and make a difference.',url:'#beach',order:1,hidden:false,builtin:true};
export const CHARACTERS = [
 {id:'taro',name:'Sunny',kind:'Sweet potato',color:'#ed8ebc'},
 {id:'muntjac',name:'Fern',kind:'Muntjac',color:'#ecb463'},
 {id:'deer',name:'Maple',kind:'Sika deer',color:'#cb8a59'},
 {id:'monkey',name:'Momo',kind:'Macaque',color:'#ba9ae3'},
 {id:'wave',name:'Ripple',kind:'Wave sprite',color:'#59cde3'},
];
export const ITEMS = [
 {id:'wood',name:'Driftwood',points:50}, {id:'bottle',name:'Plastic bottle',points:50},
 {id:'can',name:'Metal can',points:100}, {id:'bag',name:'Plastic bag',points:150},
 {id:'large',name:'Large litter',points:200}, {id:'stone',name:'Oops! A slip',points:-50},
 {id:'splinter',name:'Ouch! A splinter',points:-100},
];
export const PROFILES = [[2,1,1,1,1,1,1],[2,2,1,1,1,1,1],[3,2,1,1,1,1,1],[3,2,2,1,1,1,1],[3,3,2,1,1,1,1]];
export const ROUTES = ['A','B','C','D','E'];
export const AUTO_MS = 25000;
export const profileTotal = counts => counts.reduce((s,n,i)=>s+n*ITEMS[i].points,0);
export function seededRandom(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function shuffle(values,rng){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function createPlan(seed){
 const rng=seededRandom(seed);
 return Array.from({length:12},(_,turn)=>{
  const round=Math.floor(turn/2),team=round%2===0?turn%2:1-turn%2;
  return {round:round+1,team,routes:shuffle(PROFILES,rng).map((counts,i)=>({
   letter:ROUTES[i],total:profileTotal(counts),counts:[...counts],
   events:shuffle(counts.flatMap((n,k)=>Array.from({length:n},()=>ITEMS[k].id)),rng)
  }))};
 });
}
export const eventScore = ids => ids.reduce((s,id)=>s+ITEMS.find(i=>i.id===id).points,0);
export const totalsFor = (history,adjustments=[]) => [0,1].map(team=>history.filter(h=>h.team===team).reduce((s,h)=>s+h.score,0)+adjustments.filter(a=>a.team===team).reduce((s,a)=>s+a.points,0));
export function startSession({mode,characters,names},seed){
 if(!['manual','auto'].includes(mode)||characters.length!==2||characters[0]===characters[1]||characters.some(c=>!CHARACTERS.some(x=>x.id===c))) throw Error('Choose two different characters and a play mode.');
 return {mode,characters:[...characters],names:names.map((s,i)=>s.trim().slice(0,24)||`Team ${i+1}`),plan:createPlan(seed)};
}
// Coordinates are local to one beach section, measured in viewport percentages.
export function itemPosition(index){const zone=Math.floor(index/3),slot=index%3;return {x:zone*100+[26,55,82][slot]+[0,4,-3,2][zone%4],y:[71,86,65][(slot+zone)%3]};}
export function visibleIndices(s){if(!s.route)return [];const first=s.route.events.findIndex((_,i)=>!s.done.includes(i));if(first<0)return [];const zone=Math.floor(first/3);return s.route.events.map((_,i)=>i).filter(i=>Math.floor(i/3)===zone&&!s.done.includes(i));}
const initialProgress=()=>({count:0,elapsed:0,done:[],action:null,position:{x:20,y:82}});
export function newGame(config,seed){return {...startSession(config,seed),turn:0,phase:'question',route:null,...initialProgress(),history:[],adjustments:[],paused:false,seconds:0};}
function begin(s,index){return {...s,action:{index,elapsed:0,from:s.position,to:itemPosition(index),duration:s.mode==='auto'?AUTO_MS/s.route.events.length:2200}};}
export function beachReducer(s,a){
 if(a.type==='PAUSE')return {...s,paused:a.value};
 if(a.type==='ADJUST'&&[0,1].includes(a.team)&&Number.isInteger(a.points)&&Math.abs(a.points)<=1000)return {...s,adjustments:[...s.adjustments,{team:a.team,points:a.points,turn:s.turn,reason:a.reason||'Teacher adjustment'}]};
 if(a.type==='END')return {...s,phase:'finished',paused:false,action:null};
 if(s.paused)return s;
 if(a.type==='CORRECT'&&s.phase==='question')return {...s,phase:'routes'};
 if(a.type==='ROUTE'&&s.phase==='routes'&&ROUTES.includes(a.letter))return {...s,phase:'active',route:s.plan[s.turn].routes.find(r=>r.letter===a.letter),...initialProgress()};
 if(a.type==='PICK'&&s.phase==='active'&&s.mode==='manual'&&!s.action&&visibleIndices(s).includes(a.index)&&ITEMS.find(i=>i.id===s.route.events[a.index]).points>0){
  // Mandatory hazards at the front of the remaining section cannot be bypassed.
  const first=visibleIndices(s)[0];if(ITEMS.find(i=>i.id===s.route.events[first]).points<0)return s;
  return begin(s,a.index);
 }
 if(a.type==='NEXT'&&s.phase==='result')return s.turn===11?{...s,phase:'finished'}:{...s,turn:s.turn+1,phase:'question',route:null,...initialProgress()};
 if(a.type!=='TICK'||s.phase==='finished')return s;
 const dt=Number.isFinite(a.dt)?Math.max(0,Math.min(100,a.dt)):0;let next={...s,seconds:s.seconds+dt/1000};
 if(s.phase!=='active')return next;
 next.elapsed+=dt;let remaining=dt;
 while(remaining>0){
  if(!next.action){const first=visibleIndices(next)[0];if(first===undefined)break;
   if(next.mode==='auto'||ITEMS.find(i=>i.id===next.route.events[first]).points<0)next=begin(next,first);else break;
  }
  const action=next.action,used=Math.min(remaining,action.duration-action.elapsed);remaining-=used;
  const elapsed=action.elapsed+used,progress=Math.min(1,elapsed/action.duration),walk=Math.min(1,progress/(action.kind==='advance'?1:.44)),ease=walk*walk*(3-2*walk);
  next={...next,action:{...action,elapsed},position:{x:action.from.x+(action.to.x-action.from.x)*ease,y:action.from.y+(action.to.y-action.from.y)*ease}};
  if(elapsed+0.00001<action.duration)break;
  if(action.kind==='advance'){next={...next,action:null,position:action.to};continue;}
  next={...next,action:null,count:next.count+1,done:[...next.done,action.index],position:action.to};
  if(next.done.length===next.route.events.length)return {...next,elapsed:s.mode==='auto'?AUTO_MS:next.elapsed,phase:'result',history:[...s.history,{turn:s.turn,round:s.plan[s.turn].round,team:s.plan[s.turn].team,letter:s.route.letter,score:eventScore(s.route.events),events:next.done.map(i=>s.route.events[i]),durationMs:Math.round(s.mode==='auto'?AUTO_MS:next.elapsed)}]};
  const first=visibleIndices(next)[0];if(s.mode==='manual'&&Math.floor(first/3)>Math.floor(action.index/3))next={...next,action:{kind:'advance',index:null,elapsed:0,duration:1500,from:next.position,to:{x:Math.floor(first/3)*100+20,y:82}}};
 }
 return next;
}
