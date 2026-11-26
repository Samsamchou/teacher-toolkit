// Runs the physics search off the main thread so the wind-up animation never stutters.
import RAPIER from '@dimforge/rapier3d-compat';
import {planShot,cardRollRecording} from './planner.mjs';
import table from './shot-table.json';

const ready=RAPIER.init();
self.onmessage=async event=>{
  const {id,request}=event.data;
  try{
    await ready;
    const recording=request.cardRoll?cardRollRecording(request.remaining,request.startFraction,request.cardRoll):planShot(RAPIER,{...request,table});
    const size=recording.frames[0].length,packed=new Float32Array(size*recording.frames.length);
    recording.frames.forEach((frame,i)=>packed.set(frame,i*size));
    self.postMessage({id,recording:{...recording,frames:null,frameSize:size,packed}},[packed.buffer]);
  }catch(error){self.postMessage({id,error:String(error?.message||error)});}
};
