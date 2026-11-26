import {ANIMALS,STORAGE_KEY as BASKETBALL_KEY,createMatch as basketballMatch,transition as basketballStep} from './basketball-model.mjs';
import {BOWLING_STORAGE_KEY,createBowlingSession,startBowlingTurn} from './bowling-model.mjs';
import {SLOT_STORAGE_KEY,SLOT_SETTINGS_KEY,createSlotMatch,slotTransition} from './slot-machine-model.mjs';
import {createMatch as soccerMatch,transition as soccerStep} from './worldpup-model.mjs';

// Ephemeral, per reward. Never read or write the standalone games' browser records.
export function createSoloStorage(game,rewardId,number=1){
 const values=new Map(),label=`GROUP ${number}`,index=Math.max(0,number-1);
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
 if(game==='basketball'){
  const animal=ANIMALS[index%ANIMALS.length],other=ANIMALS[(index+1)%ANIMALS.length];
  const match=basketballStep(basketballMatch([{name:label,animal:animal.id},{name:'Practice',animal:other.id}],1,false),{type:'START',team:0});
  storage.setItem(BASKETBALL_KEY,JSON.stringify(match));
  storage.setItem(BASKETBALL_KEY+'-settings',JSON.stringify({timer:0,powerups:false}));
 }else if(game==='bowling'){
  const session=startBowlingTurn(createBowlingSession({id:rewardId,settings:{rounds:1,teamCount:2,twoShots:false,powerups:false},teams:[{name:label,skin:index%15},{name:'Practice',skin:(index+1)%15}]}),'team-1');
  storage.setItem(BOWLING_STORAGE_KEY,JSON.stringify(session));
 }else if(game==='slotmachine'){
  const match=slotTransition(createSlotMatch({count:2,rounds:1,names:[label,'Practice']},rewardId),{type:'SELECT',team:0});
  storage.setItem(SLOT_STORAGE_KEY,JSON.stringify(match));
  storage.setItem(SLOT_SETTINGS_KEY,JSON.stringify({muted:false,volume:.65,reduced:false}));
 }else if(game==='soccer'){
  const teams=[{id:'team-1',name:label,countryCode:'TPE'},{id:'team-2',name:'Practice',countryCode:'BRA'}];
  // Draw a normal-ball turn with the original seeded engine. Penalty cards can
  // consume a turn without a kick, so they are excluded from this one-kick mode.
  let match;
  for(let tries=0;tries<1000;tries++){
   match=soccerStep(soccerMatch({teams,rounds:2}),{type:'CHOOSE_TEAM',teamId:'team-1'});
   if(match.active.cardId==='normal')break;
  }
  if(match.active.cardId!=='normal')throw Error('A normal soccer turn could not be prepared. Please skip and retry the next question.');
  storage.setItem('classroom-club-worldpup-v1',JSON.stringify(match));
 }
 return storage;
}
