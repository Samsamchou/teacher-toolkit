// Small, original sound designs. PCM is synthesized locally, with no downloads.
export const SOUND_RATE=22050;
export const EFFECT_NAMES=Object.freeze(['shot','impact','defeat','hurt','shield','orbit','frost','lightning','heal','dash','challenge','reward','level','camp']);
export const COOLDOWNS=Object.freeze({shot:140,impact:100,defeat:170,hurt:650,shield:500,orbit:380,frost:1500,lightning:350,heal:900,dash:500,challenge:500,reward:150,level:500,camp:700});
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const midi=n=>440*2**((n-69)/12);
function note(data,at,duration,hz,gain,{shape='bell',end=hz,attack=.008,noise=0,seed=17}={}){
 const start=Math.round(at*SOUND_RATE),count=Math.round(duration*SOUND_RATE);let phase=0,rng=seed;
 for(let i=0;i<count&&start+i<data.length;i++){
  const t=i/SOUND_RATE,p=i/count;
  phase+=2*Math.PI*(hz+(end-hz)*p)/SOUND_RATE;
  rng=(Math.imul(rng,1664525)+1013904223)>>>0;
  const hiss=(rng/4294967296*2-1);
  const env=Math.min(1,t/attack)*Math.exp(-p*(shape==='pad'?2:5))*Math.min(1,(duration-t)/.035);
  let wave=shape==='pluck'?Math.sin(phase)+.3*Math.sin(phase*2)+.12*Math.sin(phase*3):shape==='bell'?Math.sin(phase)+.35*Math.sin(phase*2.76)+.13*Math.sin(phase*4.08):shape==='warm'?Math.sin(phase)+.18*Math.sin(phase*2):shape==='pad'?Math.sin(phase)+.2*Math.sin(phase*1.003):Math.sin(phase);
  data[start+i]+=(wave*(1-noise)+hiss*noise)*env*gain;
 }
}
export function renderEffect(name,{variation=0,tier=1}={}){
 if(!EFFECT_NAMES.includes(name))throw Error('Unknown game sound');
 const data=new Float32Array(SOUND_RATE*(name==='level'?2.2:name==='reward'?1.5:1.2));
 const v=clamp(variation,0,2),n=(at,d,hz,g,options)=>note(data,at,d,hz,g,options);
 switch(name){
  case 'shot':n(0,.13,1100+v*80,.14,{shape:'pluck',end:430});n(.008,.055,1800,.045,{noise:.6});break;
  case 'impact':n(0,.12,350+v*35,.16,{end:100,noise:.35});n(.02,.16,1250,.07,{shape:'bell'});break;
  case 'defeat':[0,4,7].forEach((x,i)=>n(i*.045,.25,midi(77+x+v),.1,{shape:'pluck'}));break;
  case 'hurt':n(0,.28,190,.22,{end:65,noise:.3});n(.12,.16,110,.1,{end:80});break;
  case 'shield':[740,1110,1480].forEach((f,i)=>n(i*.035,.4,f,.12,{shape:'bell'}));break;
  case 'orbit':n(0,.3,540,.11,{end:1250,shape:'warm'});n(.08,.25,1080,.08,{shape:'bell'});break;
  case 'frost':[93,100,105,112].forEach((x,i)=>n(i*.055,.65,midi(x),.065,{shape:'bell'}));break;
  case 'lightning':n(0,.19,230,.17,{end:55,noise:.8,seed:71+v});n(.04,.25,1600,.07,{end:400,shape:'pluck'});break;
  case 'heal':[72,76,79,84].forEach((x,i)=>n(i*.11,.6,midi(x),.12,{shape:'warm',attack:.03}));break;
  case 'dash':n(0,.38,180,.14,{end:950,noise:.45});n(.13,.35,1200,.08,{shape:'bell'});break;
  case 'challenge':[79,83,86].forEach((x,i)=>n(i*.12,.45,midi(x),.15,{shape:'bell'}));break;
  case 'reward':{const count=clamp(tier,1,4)+2;for(let i=0;i<count;i++)n(i*.1,.55,midi([72,76,79,84,88,91][i]),.13,{shape:'bell'});break;}
  case 'level':[60,64,67,72,76,79,84].forEach((x,i)=>n(i*.15,.9,midi(x),.12,{shape:'pluck'}));[60,64,67].forEach(x=>n(.65,1.4,midi(x),.075,{shape:'pad',attack:.12}));break;
  case 'camp':[76,72,67,60].forEach((x,i)=>n(i*.15,.65,midi(x),.12,{shape:'warm',attack:.025}));break;
 }
 return data;
}
export function renderMusic(level=1){
 level=clamp(Math.round(level),1,6);
 const beat=.47-(level-1)*.009,duration=beat*16,data=new Float32Array(Math.ceil(duration*SOUND_RATE));
 const roots=[60,62,65,57,67,60],root=roots[level-1],scale=[0,4,7,11,12,7,4,2];
 for(let bar=0;bar<4;bar++){
  const chord=[0,5,9,7][bar];
  [0,4,7].forEach(x=>note(data,bar*4*beat,beat*3.9,midi(root-12+chord+x),.035,{shape:'pad',attack:.18}));
  for(let j=0;j<8;j++)note(data,(bar*4+j*.5)*beat,.48,midi(root+12+scale[(j+bar+level-1)%8]),.055,{shape:level===3?'bell':'pluck'});
  for(let j=0;j<4;j++){
   note(data,(bar*4+j)*beat,.18,midi(root-24+chord),.08,{shape:'warm',end:48});
   if(j%2===1)note(data,(bar*4+j)*beat,.07,1700,.018,{noise:.95,seed:bar*7+j});
  }
 }
 // A short equal-power fade keeps the loop seam quiet.
 for(let i=0;i<Math.round(.08*SOUND_RATE);i++){data[i]*=i/(.08*SOUND_RATE);data[data.length-1-i]*=i/(.08*SOUND_RATE);}
 return {samples:data,duration,level};
}
