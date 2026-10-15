import {randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createMemoryFirestore} from './assignment-memory-store.mjs';
import {createAssignmentService} from '../functions/src/assignment-service.mjs';
export function assignmentLabPlugin(){
 let db;const root=resolve('.live-lab'),ready=mkdir(root,{recursive:true}).then(async()=>{let initial={};try{initial=JSON.parse(await readFile(resolve(root,'assignments.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}db=createMemoryFirestore(initial,async state=>{await writeFile(resolve(root,'assignments.tmp'),JSON.stringify(state));await rename(resolve(root,'assignments.tmp'),resolve(root,'assignments.json'));});});
 return {name:'lesson-assignment-local',apply:'serve',configureServer(server){server.middlewares.use('/api/assignments',async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
  try{
   const host=req.headers.host||'';if(!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)||req.headers.origin&&req.headers.origin!==`http://${host}`)throw Error('本機分配只接受同來源loopback。');
   if(req.method!=='POST')throw Error('請使用POST。');
   const teacher=req.headers['x-lab-role']==='teacher',cookieName=teacher?'hub_lab_teacher':'hub_lab_student',cookie=(req.headers.cookie||'').match(new RegExp(`(?:^|;\\s*)${cookieName}=([a-f0-9]{48})(?:;|$)`)),uid=cookie?.[1]||randomBytes(24).toString('hex');
   if(!cookie)res.setHeader('Set-Cookie',`${cookieName}=${uid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`);
   let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>6500000)throw Error('請求過大。');chunks.push(c);}const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));await ready;
   if(input.action==='assignmentCreate'){
    const state=JSON.parse(await readFile(resolve(root,'state.json'),'utf8')),deck=(state.decks[uid]||[]).find(d=>d.id===input.payload?.deckId);if(deck)await db.collection('liveDecksV2').doc(uid+'_'+deck.id).set({ownerUid:uid,json:JSON.stringify(deck)});
   }
   const service=createAssignmentService({db,requireTeacher:async()=>{if(!teacher)throw Error('需要教師權限。');}});
   const result=await service({auth:{uid,token:{firebase:{sign_in_provider:'anonymous'}}},data:input});res.end(JSON.stringify(result));
  }catch(e){res.statusCode=400;res.end(JSON.stringify({error:e.message}));}
 });}};
}
