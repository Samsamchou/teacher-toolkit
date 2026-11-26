// Builds src/bowling3d/shot-table.json: physics entries for a full rack, grouped by pins knocked down.
// Run: node scripts/build-bowling3d-shots.mjs [samples]   (deterministic; rerun after changing physics.mjs)
import {writeFileSync} from 'node:fs';
import RAPIER from '@dimforge/rapier3d-compat';
import {simulateShot,LANE,BALL_RADIUS} from '../src/bowling3d/physics.mjs';
import {makeRng,adjustToCount} from '../src/bowling3d/planner.mjs';

await RAPIER.init();
const samples=Number(process.argv[2])||1400,perCount=14,rng=makeRng(20261126);
const limit=LANE.width/2-BALL_RADIUS-.02,round=v=>Math.round(v*1000)/1000;
const table={};
for(const [name,size] of [['ten',10],['five',5]]){
  const rack=Array.from({length:size},(_,i)=>i),buckets=Array.from({length:size+1},()=>[]),spare=[];
  for(let i=0;i<samples;i++){
    const shot={entryX:round((rng()*2-1)*limit),entryVx:round((rng()-.5)*1.5),speed:round(6.6+rng()*2.2),mass:6.8};
    shot.startX=shot.entryX;
    const result=simulateShot(RAPIER,shot,rack,{record:false});
    if(result.impactAt===null)continue;
    buckets[result.fallen.length].push([shot.entryX,shot.entryVx,shot.speed]);
    spare.push({shot,result});
  }
  // Counts the solver rarely produces: reuse a bigger fall and hold the pins that fell last.
  for(let count=1;count<=size;count++){
    for(const {shot,result} of spare){
      if(buckets[count].length>=perCount)break;
      if(result.fallen.length<=count||result.fallen.length>count+2)continue;
      const fixed=adjustToCount(RAPIER,shot,rack,count,simulateShot(RAPIER,shot,rack,{record:false}));
      if(fixed.fallen.length===count&&!fixed.boosted.length)buckets[count].push([shot.entryX,shot.entryVx,shot.speed,fixed.locked]);
    }
  }
  table[name]={};
  for(let count=1;count<=size;count++){
    const rows=buckets[count].sort((a,b)=>a[0]-b[0]);
    const picked=rows.length<=perCount?rows:Array.from({length:perCount},(_,i)=>rows[Math.floor(i*rows.length/perCount)]);
    table[name][count]=picked;
    console.log(name,count,'natural/total',rows.filter(r=>!r[3]).length,rows.length,'kept',picked.length);
  }
}
writeFileSync(new URL('../src/bowling3d/shot-table.json',import.meta.url),JSON.stringify(table));
