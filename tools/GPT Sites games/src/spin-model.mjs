export const SPIN_GAME = {id:'spin',name:'Spin, ask, answer, do and roll',description:'HWG5 Unit One · Spin a day, say it, act it out and roll for your team!',url:'#spin',order:2,hidden:false,builtin:true};
export const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
// Clockwise from 12 o'clock. The image is fixed; only the pointer turns.
export const SECTORS=[1,2,3,4,5,6,0,0];
export const ABBR=['Sun.','Mon.','Tue.','Wed.','Thu.','Fri.','Sat.'];
export const TASKS=['Spin','Wiggle','Make a face','Do silly dance','Blink ×3','Squat ×3','Stretch ×3','Jump ×3'];
export const SPIN_MS=6000, ROLL_MS=2200, CELEBRATE_MS=8000;
export function randomInt(n){const cap=Math.floor(4294967296/n)*n;let x;do{x=crypto.getRandomValues(new Uint32Array(1))[0];}while(x>=cap);return x%n;}
export function shuffleTasks(pick=randomInt){const a=[0,1,2,3,4,5,6,7];for(let i=7;i>0;i--){const j=pick(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
export function createGame(count){if(!Number.isInteger(count)||count<2||count>6)throw new Error('Choose 2–6 teams.');return {phase:'ready',count,team:0,history:[],bag:[],sector:null,question:null,task:null,angle:0,die:null,early:false};}
export function scores(s){return Array.from({length:s.count},(_,team)=>s.history.filter(h=>h.team===team).reduce((sum,h)=>sum+h.points,0));}
export function rounds(s,team){return s.history.filter(h=>h.team===team).length;}
export function winners(s){const total=scores(s),top=Math.max(...total);return total.flatMap((v,i)=>v===top?[i]:[]);}
export function advance(s,a){
 if(a.type==='END'&&s.phase!=='finished')return {...s,phase:'finished',early:true};
 if(a.type==='SPIN'&&s.phase==='ready'&&Number.isInteger(a.sector)&&a.sector>=0&&a.sector<8&&Number.isInteger(a.question)&&a.question>=0&&a.question<7){const target=a.sector*45+22.5;return {...s,phase:'spinning',sector:a.sector,question:a.question,angle:s.angle+2160+((target-s.angle%360+360)%360)};}
 if(a.type==='STOP_SPIN'&&s.phase==='spinning')return {...s,phase:'question'};
 if(a.type==='RIGHT'&&s.phase==='question'){const bag=s.bag.length?s.bag:a.bag;if(!Array.isArray(bag)||!bag.length||bag.some(t=>!Number.isInteger(t)||t<0||t>7)||(!s.bag.length&&(bag.length!==8||new Set(bag).size!==8)))return s;return {...s,phase:'task',task:bag[0],bag:bag.slice(1)};}
 if(a.type==='GOOD'&&s.phase==='task')return {...s,phase:'dice',die:null};
 if(a.type==='ROLL'&&s.phase==='dice'&&Number.isInteger(a.value)&&a.value>=1&&a.value<=6)return {...s,phase:'rolling',die:a.value};
 if(a.type==='STOP_ROLL'&&s.phase==='rolling')return {...s,phase:'awarded',history:[...s.history,{team:s.team,round:rounds(s,s.team)+1,points:s.die,sector:s.sector,question:s.question,task:s.task}]};
 if(a.type==='NEXT'&&s.phase==='awarded')return {...s,phase:s.history.length===s.count*6?'finished':'ready',team:(s.team+1)%s.count,die:null};
 return s;
}
