import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createLiveService} from '../functions/src/live-service.mjs';
import {newBlock} from '../src/live/domain.mjs';
if(!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST||''))throw new Error('Local emulator required; production refused');
const require=createRequire(new URL('../functions/index.cjs',import.meta.url));
const {initializeApp,deleteApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
test('course rename persists across service instances without renaming prior room snapshot',async()=>{
  const app=initializeApp({projectId:'demo-lesson-hub'},'name-'+Date.now()),db=getFirestore(app);
  const uid='name-'+crypto.randomUUID();
  const options={db,requireTeacher:async r=>{if(r.auth.uid!==uid)throw new Error('teacher only');}};
  const invoke=(service,action,payload={},code=null)=>service({auth:{uid,token:{firebase:{sign_in_provider:'anonymous'}}},data:{action,payload,code}});
  try{
    const service=createLiveService(options),deck={id:crypto.randomUUID(),title:'五年級交通工具',blocks:[newBlock('slide')]};
    const first=await invoke(service,'saveDeck',{deck,expectedVersion:0});
    const room=await invoke(service,'create',{deck:first.deck});
    const second=await invoke(service,'saveDeck',{deck:{...first.deck,title:'五年級交通工具・複習'},expectedVersion:first.deck.version});
    assert.equal(second.deck.id,deck.id);
    const fresh=createLiveService(options),list=await invoke(fresh,'decks');
    assert.equal(list.decks.find(d=>d.id===deck.id).title,'五年級交通工具・複習');
    assert.equal((await invoke(fresh,'snapshot',{},room.code)).title,'五年級交通工具');
    await assert.rejects(invoke(fresh,'saveDeck',{deck:{...second.deck,title:'   '},expectedVersion:second.deck.version}));
    assert.equal((await invoke(fresh,'decks')).decks.find(d=>d.id===deck.id).title,'五年級交通工具・複習');
  }finally{await deleteApp(app);}
});
