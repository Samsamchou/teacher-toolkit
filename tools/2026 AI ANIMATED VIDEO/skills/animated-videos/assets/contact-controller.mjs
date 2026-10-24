// Engine-independent gate. Feed measured geometry conditions, never elapsed time alone.
export class ContactController {
 constructor({required,stableSeconds=.10,maxStepSeconds=1/30}) {
  if(!Array.isArray(required)||!required.length||new Set(required).size!==required.length||required.some(x=>typeof x!=='string'||!x))throw Error('Explicit unique required contact names are mandatory');
  if(!Number.isFinite(stableSeconds)||stableSeconds<=0||!Number.isFinite(maxStepSeconds)||maxStepSeconds<=0)throw Error('Invalid gate timing');
  this.required=[...required];this.stableSeconds=stableSeconds;this.maxStepSeconds=maxStepSeconds;this.reset();
 }
 reset(){this.last=null;this.stable=0;this.allowed=false;}
 update(time,measured){
  if(!Number.isFinite(time)||time<0)throw Error('Invalid global time');
  if(this.last!==null&&time<this.last)this.reset();
  const dt=this.last===null?0:Math.min(this.maxStepSeconds,Math.max(0,time-this.last));this.last=time;
  const missing=this.required.filter(k=>measured?.[k]!==true);
  this.stable=missing.length?0:this.stable+dt;
  this.allowed=!missing.length&&this.stable+1e-9>=this.stableSeconds;
  return {allowed:this.allowed,stableSeconds:this.stable,missing};
 }
}
export const smoothstep=t=>{t=Math.min(1,Math.max(0,t));return t*t*(3-2*t);};
export const frameTime=(frame,fps)=>{if(!Number.isInteger(frame)||frame<0||!Number.isFinite(fps)||fps<=0)throw Error('Invalid frame or fps');return frame/fps;};
