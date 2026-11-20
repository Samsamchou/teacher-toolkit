import type { Plugin } from 'vite'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { buildPrompt } from '../app/utils/prompt'
import { appearanceSentences } from '../app/utils/appearance'
import { getSentencePreview } from '../app/utils/content'
import type { FormState } from '../app/types'
import type { Artwork } from '../app/services/firebase'
type Session={studentId:string;teacher:boolean;works:Artwork[];passed:Set<string>}
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
        const bank=JSON.parse(await readFile(resolve(server.config.root,'functions/routines-content.json'),'utf8')) as {stations:{id:string;mode:string;code:string;spoken:string;drag?:{slots:string[]}}[]}
        type RoutineState={answered:boolean;gameDone:boolean;stars:number;score:number|null;minutes?:number|null}
        const store=session as Session&{routines?:Record<string,RoutineState>}
        const saved=store.routines ??= {}
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
        if(action==='routinesGameDone'){if(!saved[station.id]?.answered)return send({error:'請先完成這一站的解謎與作答。'},400);mark({gameDone:true,stars:Math.max(1,Number(body.stars)||1),minutes:Number(body.minutes)||null});return send({stations:view()})}
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
      // World Routines Trip teacher view: the in-memory student progress plus a few demo students (no real data).
      if(action==='routines'||action==='routineRecords'||action==='routineRecording') {
        const bank=JSON.parse(await readFile(resolve(server.config.root,'functions/routines-content.json'),'utf8')) as {stations:{id:string;country:string;mode:string;spoken:string}[]}
        type RS={answered:boolean;gameDone:boolean;stars:number;score:number|null}
        const mine=(session as Session&{routines?:Record<string,RS>}).routines??{}
        const demo=(n:number)=>Object.fromEntries(bank.stations.map((s,i)=>[s.id,{mode:s.mode,answered:i<n,score:s.mode==='speak'&&i<n?85+((n*7+i*3)%15):null,gameDone:i<n-1,stars:i<n-1?1+((n+i)%3):0,gameScore:0,minutes:i<n-1?4+((n*3+i*5)%6):null}]))
        if(action==='routines') {
          const cls=String(body.classId??'')
          const students=[{studentId:cls+'01',updatedAt:Date.now()-3600e3,stations:demo(10)},{studentId:cls+'07',updatedAt:Date.now()-7200e3,stations:demo(4)},{studentId:cls+'15',updatedAt:Date.now()-60e3,stations:demo(1)}]
          if(session.studentId.startsWith(cls))students.push({studentId:session.studentId,updatedAt:Date.now(),stations:Object.fromEntries(bank.stations.map(s=>[s.id,{mode:s.mode,gameScore:0,minutes:null,...(mine[s.id]??{answered:false,score:null,gameDone:false,stars:0})}]))})
          return send({students:students.sort((a,b)=>a.studentId.localeCompare(b.studentId)),stations:bank.stations})
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
