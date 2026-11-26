import type { Plugin } from 'vite'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { buildPrompt } from '../app/utils/prompt'
import { appearanceSentences } from '../app/utils/appearance'
import { getSentencePreview } from '../app/utils/content'
import type { FormState } from '../app/types'
import type { Artwork } from '../app/services/firebase'
// Safari Count: the preview runs the real server rules (answers, counts, step order, grammar check); only the AI score is a stub.
import { READY as SAFARI, stationFor as safariStation, itemFor as safariItem, publicStations, checkPuzzle, checkCount, checkDrag, sceneOf, spokenCountCheck, speakingPassed,
  progressView, stationView, stepAllowed, teacherCells, teacherStations } from '../functions/safari-core.mjs'
type Session={studentId:string;teacher:boolean;works:Artwork[];passed:Set<string>}
// Safari Count preview: one saved speaking attempt, and a demo recording (half a second of a soft beep, base64 WAV).
type SafariRec={kind:'prev'|'pass';item:string;station:string;targetText:string;transcript:string;total_score:number;accuracy:number;fluency:number;completeness:number;numberOk:boolean;verbOk:boolean;nounOk:boolean;passed:boolean;createdAt:number;audio:string}
function safariBeep(hz:number){
  const sr=16000,n=sr/2,buf=Buffer.alloc(44+n*2)
  buf.write('RIFF',0);buf.writeUInt32LE(36+n*2,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(1,22)
  buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*2,28);buf.writeUInt16LE(2,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*2,40)
  for(let i=0;i<n;i++)buf.writeInt16LE(Math.round(3000*Math.sin(2*Math.PI*hz*i/sr)),44+i*2)
  return buf.toString('base64')
}
export function localPreview():Plugin {
  const sessions=new Map<string,Session>()
  return {name:'monster-local-preview',configureServer(server){server.middlewares.use(async(req,res,next)=>{
    const url=new URL(req.url??'/', 'http://127.0.0.1')
    if(!url.pathname.startsWith('/api/monster/')&&!url.pathname.startsWith('/__preview/cloud/'))return next()
    const token=/monster_preview=([a-z0-9-]+)/.exec(req.headers.cookie??'')?.[1]??randomUUID()
    if(!sessions.has(token))sessions.set(token,{studentId:'',teacher:false,works:[],passed:new Set()})
    const session=sessions.get(token)!
    res.setHeader('Set-Cookie',`monster_preview=${token}; Path=/; HttpOnly; SameSite=Strict`)
    res.setHeader('Cache-Control','no-store')
    const send=(data:unknown,status=200)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))}
    try {
      const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk))
      const body=JSON.parse(Buffer.concat(chunks).toString()||'{}')
      const action=url.pathname.split('/').at(-1)
      const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
      if(action==='joinStudent') {if(!/^(501|502|601|602)[0-9]{1,9}$/.test(body.studentId??''))return send({error:'學號格式不正確'},400);session.studentId=body.studentId;return send({joined:true})}
      if(action==='practiceStatus')return send({remaining:8})
      // World Routines Trip: in-memory demo of the four callables (no AI, nothing saved).
      if(['routinesState','routinesAnswer','routinesGameDone','scoreRoutineSpeaking'].includes(action??'')) {
        const hs=body.variant==='hs'   // he/she trip (/world-routines-he-she): its own bank and its own demo progress
        const bank=JSON.parse(await readFile(resolve(server.config.root,hs?'functions/routines-hs-content.json':'functions/routines-content.json'),'utf8')) as {stations:{id:string;mode:string;code:string;spoken:string;drag?:{slots:string[]}}[]}
        type RoutineState={answered:boolean;gameDone:boolean;stars:number;score:number|null;minutes?:number|null;hints?:number|null}
        const store=session as Session&{routines?:Record<string,RoutineState>;routinesHs?:Record<string,RoutineState>}
        const saved=hs?(store.routinesHs ??= {}):(store.routines ??= {})
        const blank=():RoutineState=>({answered:false,gameDone:false,stars:0,score:null})
        const view=()=>Object.fromEntries(bank.stations.map(x=>[x.id,saved[x.id]??blank()]))
        const station=bank.stations.find(x=>x.id===body.station)
        if(action==='routinesState')return send({stations:view(),remaining:30,studentId:session.studentId})
        if(!station)return send({error:'Invalid station'},400)
        const mark=(extra:Partial<RoutineState>)=>{saved[station.id]={...(saved[station.id]??blank()),...extra}}
        if(action==='routinesAnswer') {
          const slotsCorrect=JSON.stringify(body.slots)===JSON.stringify(station.drag?.slots), codeCorrect=body.code===station.code
          if(slotsCorrect&&codeCorrect)mark({answered:true})
          return send({slotsCorrect,codeCorrect,passed:slotsCorrect&&codeCorrect,sentence:station.spoken})
        }
        if(action==='scoreRoutineSpeaking'){mark({answered:true,score:90});return send({transcript:station.spoken,accuracy:90,fluency:90,completeness:90,total_score:90,feedback:'本機示範：固定 90 分。',timeCorrect:true,passed:true,remaining:29,sentence:station.spoken})}
        if(action==='routinesGameDone'){if(!saved[station.id]?.answered)return send({error:'請先完成這一站的解謎與作答。'},400);mark({gameDone:true,stars:Math.max(1,Number(body.stars)||1),minutes:Number(body.minutes)||null,hints:Number.isInteger(body.hints)?Math.max(0,Math.min(2,Number(body.hints))):null});return send({stations:view()})}
      }
      // Safari Count: in-memory demo of the six callables. The AI score is a fixed 90 (nothing is sent anywhere).
      if(['safariState','safariPuzzle','safariCount','safariAnswer','scoreSafariSpeaking','safariStamp'].includes(action??'')) {
        type SP={items?:Record<string,Record<string,number>>;likeAt?:number;stampAt?:number;minutes?:number|null;stars?:number;gameScore?:number}
        const box=session as Session&{safari?:Record<string,SP>;safariRecs?:SafariRec[];safariLeft?:number}
        const saved=(box.safari ??= {}), left=()=>box.safariLeft ??= 30
        if(action==='safariState')return send({stations:publicStations(),progress:progressView({stations:saved}),remaining:left(),studentId:session.studentId})
        const refuse=(text:string)=>send({error:text},400)
        try{
          const station=safariStation(body.station),item=action==='safariStamp'?null:safariItem(station,body.item)
          const x:SP=(saved[station.id] ??= {}), mine=(key:string)=>((x.items ??= {})[key] ??= {})
          if(action==='safariPuzzle'){if(!item)return refuse('Invalid question');const passed=checkPuzzle(item,body.guess),p=mine(item.key);if(!p.puzzleAt){if(passed)p.puzzleAt=Date.now();else p.puzzleTries=(p.puzzleTries??0)+1}return send({passed,...(p.puzzleAt?{scene:sceneOf(item)}:{})})}
          if(action==='safariCount'){if(!item)return refuse('Invalid question');if(!stepAllowed('count',station,item,x))return refuse('請先解開謎題。');const passed=checkCount(item,body.count),p=mine(item.key);if(!p.countAt){if(passed)p.countAt=Date.now();else p.countTries=(p.countTries??0)+1}return send({passed})}
          if(action==='safariAnswer'){const passed=checkDrag(station,item,body.slots);if(!stepAllowed('answer',station,item,x))return refuse(item?'請先數一數動物。':'請先完成這一站的兩種動物。')
            if(passed){if(item)mine(item.key).answeredAt ??= Date.now();else x.likeAt ??= Date.now()}return send({passed,sentence:passed&&item?item.spoken:null})}
          if(action==='scoreSafariSpeaking'){
            if(!item||item.mode!=='speak')return refuse('Invalid question mode')
            if(!stepAllowed('answer',station,item,x))return refuse('請先數一數動物。')
            if(left()<1)return send({error:'今天已達 30 次口說評分上限，明天再試。'},429)
            box.safariLeft=left()-1
            const score={transcript:item.spoken,accuracy:90,fluency:90,completeness:90,total_score:90,feedback:'本機示範：固定 90 分，未呼叫 AI。'}
            const check=spokenCountCheck(score.transcript,item),passed=speakingPassed(score.total_score,check),p=mine(item.key),kind=passed?'pass':'prev'
            if(!p.answeredAt){const recs=(box.safariRecs ??= []),keep=recs.filter(r=>!(r.station===station.id&&r.item===item.key&&r.kind===kind));recs.length=0
              recs.push(...keep,{kind,item:item.key,station:station.id,targetText:item.spoken,...score,...check,passed,createdAt:Date.now(),audio:typeof body.audio==='string'?body.audio:''})}
            if(passed){p.answeredAt ??= Date.now();p.score=Math.max(p.score??0,score.total_score)}
            return send({...score,...check,passed,remaining:left(),sentence:passed?item.spoken:null})
          }
          if(!stepAllowed('stamp',station,null,x))return refuse('請先完成這一站的所有題目。')
          x.stampAt ??= Date.now();x.minutes ??= Number.isFinite(body.minutes)?Math.round(body.minutes*10)/10:null
          x.stars=Math.max(x.stars??0,Number.isInteger(body.stars)?Math.max(0,Math.min(3,body.stars)):0);x.gameScore=Math.max(x.gameScore??0,Number.isFinite(body.gameScore)?Math.max(0,Math.min(1000,Math.round(body.gameScore))):0)
          return send({station:stationView(station,x)})
        }catch(e){return refuse((e as Error).message)}
      }
      if(action==='scoreMonsterReading'){session.passed.add(body.attemptId);return send({attemptId:body.attemptId,passed:true,saved:true,total_score:90,accuracy:90,fluency:90,completeness:90,remaining:7,transcript:getSentencePreview(body.profile).english,feedback:'本機流程示範分數，未呼叫 AI。'})}
      if(action==='generate') {
        if(!session.studentId||!session.passed.has(body.attemptId))return send({error:'請先完成錄音評分。'},403)
        let work=session.works.find(x=>x.id===body.requestId.replace(/-/g,''))
        if(!work){if(session.works.filter(x=>x.studentId===session.studentId&&x.day===day).length>=3)return send({error:'今天已生成三張。'},429)
          const profile=body.profile as FormState
          work={id:body.requestId.replace(/-/g,''),studentId:session.studentId,classId:session.studentId.slice(0,3),day,sentence:getSentencePreview(profile).english,appearance:appearanceSentences(profile.monster),prompt:buildPrompt(profile),createdAt:Date.now(),published:false,status:'complete'};session.works.unshift(work)}
        return send({artwork:work})
      }
      if(action==='generationStatus') {
        const work=session.works.find(x=>x.id===body.requestId?.replace(/-/g,'')&&x.studentId===session.studentId)
        return work?send({artwork:work}):send({error:'找不到作品'},404)
      }
      if(action==='image'||action==='studentImage') {
        const work=session.works.find(x=>x.id===(body.id??url.searchParams.get('id')))
        if(!work||(!work.published&&!session.teacher&&!(action==='studentImage'&&work.studentId===session.studentId)))return send({error:'無權讀取'},403)
        const bytes=await readFile(resolve(server.config.root,'public/monsters/worried.png'))
        if(action==='studentImage')return send({image:bytes.toString('base64')})
        res.setHeader('Content-Type','image/png');return res.end(bytes)
      }
      if(action==='login'){if(body.pin!=='000000')return send({error:'本機示範請使用 000000（不是正式通行碼）。'},401);session.teacher=true;return send({signedIn:true})}
      if(action==='gallery')return send({artworks:session.works.filter(x=>x.classId===body.classId&&x.published).map(({id,classId,day,sentence,appearance,createdAt,status})=>({id,classId,day,sentence,appearance,createdAt,status,studentLabel:classId+'**'})),cursor:null})
      if(!session.teacher)return send({error:'請輸入教師通行碼。'},401)
      if(action==='session')return send({signedIn:true})
      // Teacher "delete this pupil" (11/26): demo students are hidden per activity for this preview session; nothing real is deleted.
      const gone=session as Session&{deleted?:Record<string,string[]>;deleteLog?:{activity:string;studentId:string;classId:string;summary:string;deletedAt:number}[]}
      const activityOf=(a:string)=>a.startsWith('safari')?'safari':`routines-${body.variant==='hs'?'hs':'i'}`
      const hidden=(a:string)=>(gone.deleted ??= {})[a] ??= []
      if(action==='safariDelete'||action==='routineDelete') {
        const a=activityOf(action),id=String(body.studentId??'').trim()
        if(!/^(501|502|601|602)\d{1,9}$/.test(id))return send({error:'學號格式不正確。'},400)
        if(String(body.confirm??'').trim()!==id)return send({error:'請輸入相同的學號才能刪除。'},400)
        if(hidden(a).includes(id))return send({error:'找不到這位學生在這個活動的紀錄。'},404)
        hidden(a).push(id)
        if(id===session.studentId){const own=session as Session&{safari?:object;routines?:object;routinesHs?:object};if(a==='safari')own.safari={};else if(a==='routines-hs')own.routinesHs={};else own.routines={}}
        const summary='本機示範資料';(gone.deleteLog ??= []).push({activity:a,studentId:id,classId:id.slice(0,3),summary,deletedAt:Date.now()})
        return send({deleted:true,studentId:id,summary})
      }
      if(action==='safariDeleteLog'||action==='routineDeleteLog'){const a=activityOf(action);return send({log:(gone.deleteLog??[]).filter(x=>x.activity===a).sort((x,y)=>y.deletedAt-x.deletedAt)})}
      // Safari Count teacher view: this preview session's own progress and recordings plus three demo students (no real data).
      if(action==='safari'||action==='safariRecords'||action==='safariRecording') {
        const box=session as Session&{safari?:Record<string,Parameters<typeof teacherCells>[1]>;safariRecs?:SafariRec[]}
        if(action==='safari') {
          const cls=String(body.classId??'')
          if(!['501','502','601','602'].includes(cls))return send({error:'請選擇班級。'},400)
          const demo=(n:number)=>Object.fromEntries(SAFARI.map(s=>{const items=Object.fromEntries(s.items.map((it,i)=>[it.key,i<n?{puzzleAt:1,countAt:1,answeredAt:1,score:it.mode==='speak'?86+n*3:null,puzzleTries:n%3,countTries:i}:i===n?{puzzleAt:1,puzzleTries:2}:{}]))
            return [s.id,teacherCells(s,{items,...(n>=2?{likeAt:1}:{}),...(n>=3?{stampAt:1,minutes:9+n}:{})})]}))
          const students=[{studentId:cls+'03',updatedAt:Date.now()-5400e3,stations:demo(3)},{studentId:cls+'12',updatedAt:Date.now()-1800e3,stations:demo(1)},{studentId:cls+'21',updatedAt:Date.now()-120e3,stations:demo(0)}]
          if(session.studentId.startsWith(cls))students.push({studentId:session.studentId,updatedAt:Date.now(),stations:Object.fromEntries(SAFARI.map(s=>[s.id,teacherCells(s,box.safari?.[s.id])]))})
          return send({students:students.filter(x=>!hidden('safari').includes(x.studentId)).sort((a,b)=>a.studentId.localeCompare(b.studentId)),stations:teacherStations()})
        }
        const st=SAFARI.find(s=>s.id===body.station),it=st?.items.find(x=>x.key===body.item&&x.mode==='speak')
        if(!st||!it)return send({error:'題目不正確。'},400)
        const own=body.studentId===session.studentId?(box.safariRecs??[]).filter(r=>r.station===st.id&&r.item===it.key):null
        if(action==='safariRecords')return send({records:own?own.map(r=>({...r,audio:undefined})):[
          {kind:'prev',targetText:it.spoken,transcript:it.spoken.replace(' are ',' is ').replace(/s\.$/,'.'),total_score:79,accuracy:80,fluency:78,completeness:78,numberOk:true,verbOk:false,nounOk:false,passed:false,createdAt:Date.now()-900e3},
          {kind:'pass',targetText:it.spoken,transcript:it.spoken,total_score:91,accuracy:92,fluency:90,completeness:91,numberOk:true,verbOk:true,nounOk:true,passed:true,createdAt:Date.now()-600e3}]})
        const mine=own?.find(r=>r.kind===body.kind)
        return send({audio:mine?.audio||safariBeep(body.kind==='pass'?660:440)})
      }
      // World Routines Trip teacher view: the in-memory student progress plus a few demo students (no real data).
      if(action==='routines'||action==='routineRecords'||action==='routineRecording') {
        const hs=body.variant==='hs'
        const bank=JSON.parse(await readFile(resolve(server.config.root,hs?'functions/routines-hs-content.json':'functions/routines-content.json'),'utf8')) as {stations:{id:string;country:string;mode:string;spoken:string}[]}
        type RS={answered:boolean;gameDone:boolean;stars:number;score:number|null}
        const mine=(hs?(session as Session&{routinesHs?:Record<string,RS>}).routinesHs:(session as Session&{routines?:Record<string,RS>}).routines)??{}
        const demo=(n:number)=>Object.fromEntries(bank.stations.map((s,i)=>[s.id,{mode:s.mode,answered:i<n,score:s.mode==='speak'&&i<n?85+((n*7+i*3)%15):null,gameDone:i<n-1,stars:i<n-1?1+((n+i)%3):0,gameScore:0,minutes:i<n-1?4+((n*3+i*5)%6):null,hints:i<n-1?(n+i)%3:null}]))
        if(action==='routines') {
          const cls=String(body.classId??'')
          const students=[{studentId:cls+'01',updatedAt:Date.now()-3600e3,stations:demo(10)},{studentId:cls+'07',updatedAt:Date.now()-7200e3,stations:demo(4)},{studentId:cls+'15',updatedAt:Date.now()-60e3,stations:demo(1)}]
          if(session.studentId.startsWith(cls))students.push({studentId:session.studentId,updatedAt:Date.now(),stations:Object.fromEntries(bank.stations.map(s=>[s.id,{mode:s.mode,gameScore:0,minutes:null,hints:null,...(mine[s.id]??{answered:false,score:null,gameDone:false,stars:0})}]))})
          return send({students:students.filter(x=>!hidden(activityOf(action)).includes(x.studentId)).sort((a,b)=>a.studentId.localeCompare(b.studentId)),stations:bank.stations})
        }
        const st=bank.stations.find(s=>s.id===body.station)
        if(!st)return send({error:'站別不正確。'},400)
        if(action==='routineRecords')return send({records:[
          {kind:'prev',targetText:st.spoken,transcript:st.spoken.replace(/at .*$/,'at twelve fifty.'),total_score:78,accuracy:80,fluency:76,completeness:79,timeCorrect:false,passed:false,createdAt:Date.now()-900e3},
          {kind:'pass',targetText:st.spoken,transcript:st.spoken,total_score:91,accuracy:92,fluency:90,completeness:91,timeCorrect:true,passed:true,createdAt:Date.now()-600e3}]})
        const sr=16000,n=sr/2,buf=Buffer.alloc(44+n*2)          // demo recording: half a second of a soft beep
        buf.write('RIFF',0);buf.writeUInt32LE(36+n*2,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(1,22)
        buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*2,28);buf.writeUInt16LE(2,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*2,40)
        for(let i=0;i<n;i++)buf.writeInt16LE(Math.round(3000*Math.sin(2*Math.PI*(body.kind==='pass'?660:440)*i/sr)),44+i*2)
        return send({audio:buf.toString('base64')})
      }
      if(action==='refreshArtwork') {
        const work=session.works.find(x=>x.id===body.id)
        return work?send({artwork:work}):send({error:'找不到作品'},404)
      }
      if(action==='logout'){session.teacher=false;return send({signedIn:false})}
      if(action==='records')return send({artworks:session.works.filter(x=>x.day===body.day),cursor:null})
      if(action==='publish'){const work=session.works.find(x=>x.id===body.id);if(work)work.published=body.published;return send({published:body.published})}
      if(action==='release')return send({released:true})
      if(action==='recordings'||action==='legacyRecords')return send({records:[],cursor:null})
      return send({error:'預覽不支援此操作'},404)
    }catch{return send({error:'本機預覽失敗'},500)}
  })}}
}
