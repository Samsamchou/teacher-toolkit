import { useEffect, useRef, useState } from 'react'
import { portal, type Artwork } from '../services/firebase'
import { ArtworkCard } from './ArtworkCard'
type Recording = {id:string;sentence:string;seat?:number;prompt?:string;result:{total_score:number;transcript:string;feedback:string};createdAt:number}
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
export function TeacherPortal() {
  const [signedIn,setSignedIn]=useState(false),[pin,setPin]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const [day,setDay]=useState(today),[loadedDay,setLoadedDay]=useState(''),[selected,setSelected]=useState(''),[artworks,setArtworks]=useState<Artwork[]>([]),[cursor,setCursor]=useState<string|null>(null)
  const [releaseId,setReleaseId]=useState(''),[notice,setNotice]=useState(''),[legacyCode,setLegacyCode]=useState(''),[legacyCursor,setLegacyCursor]=useState<string|null>(null)
  const [recordings,setRecordings]=useState<Recording[]>([]),[clip,setClip]=useState('')
  const runLock=useRef(false), recoveryIds=useRef<Record<string,string>>({})
  useEffect(()=>{portal('session').then(()=>setSignedIn(true)).catch(()=>{})},[])
  async function run(action:()=>Promise<void>) {
    if(runLock.current)return
    runLock.current=true
    setBusy(true);setError('');setNotice('')
    try{await action()}catch(e){setError(e instanceof Error?e.message:'操作失敗。')}finally{runLock.current=false;setBusy(false)}
  }
  async function refresh(id:string) {
    const data=await portal<{artwork:Artwork}>('refreshArtwork',{id})
    setArtworks(old=>old.map(x=>x.id===id?data.artwork:x))
  }
  async function recover(work:Artwork) {
    recoveryIds.current[work.id] ||= crypto.randomUUID()
    setArtworks(old=>old.map(x=>x.id===work.id?{...x,status:'processing',canRecover:false}:x))
    try {
      const data=await portal<{artwork:Artwork}>('recoverArtwork',{id:work.id,recoveryId:recoveryIds.current[work.id],confirmPaid:true})
      setArtworks(old=>old.map(x=>x.id===work.id?data.artwork:x))
      setNotice(data.artwork.status==='complete'?'圖片已恢復，仍維持私密。':'請稍後按「更新生成狀態」；不會再次呼叫生圖。')
    }catch(error){await refresh(work.id).catch(()=>{});throw error}
  }
  async function load(more=false) {
    const date=more?loadedDay:day
    const data=await portal<{artworks:Artwork[];cursor:string|null}>('records',{day:date,cursor:more?cursor:null})
    setArtworks(old=>more?[...old,...data.artworks]:data.artworks);setCursor(data.cursor);setLoadedDay(date)
    if(!more){setSelected('');setRecordings([]);setClip('')}
  }
  async function selectStudent(studentId:string) {
    setSelected(studentId);setRecordings([]);setClip('')
    const data=await portal<{records:Recording[]}>('recordings',{studentId,day:loadedDay})
    setRecordings(data.records)
  }
  const students=[...new Set(artworks.map(x=>x.studentId!))].sort()
  return <main className="teacher-page"><a href="/festivals/monster-in-my-mind">← Monster in My Mind</a><h1>Teacher / 教師後台</h1>
    <p><a href="/world-routines/teacher">🌍 World Routines Trip 作息之旅：全班進度與口說錄音 →</a></p>
    <p><a href="/world-routines-he-she/teacher">👫 World Routines Trip: He/She 作息之旅 he/she 版：全班進度與口說錄音 →</a></p>
    <p><a href="/safari-count/teacher">🦒 Safari Count 數數動物園：全班進度與口說錄音 →</a></p>
    {!signedIn?<form onSubmit={e=>{e.preventDefault();void run(async()=>{try{await portal('login',{pin});setSignedIn(true)}finally{setPin('')}})}}>
      <label>六碼通行碼<input type="password" inputMode="numeric" autoComplete="current-password" maxLength={6} value={pin} onChange={e=>setPin(e.target.value)}/></label>
      <button className="primary-button" disabled={busy||!/^\d{6}$/.test(pin)}>登入</button>
    </form>:<>
      <button className="secondary-button" disabled={busy} onClick={()=>void run(async()=>{await portal('logout');setSignedIn(false);setArtworks([]);setRecordings([]);setSelected('');setClip('')})}>登出</button>
      <p>登入有效 2 小時。作品與錄音保存七個月；Gallery 僅顯示您核准的作品。</p>
      <div className="teacher-toolbar"><label>日期（臺北）<input type="date" value={day} onChange={e=>setDay(e.target.value)}/></label>
        <button className="primary-button" disabled={busy||!day} onClick={()=>void run(()=>load())}>查詢作品</button></div>
      <div className="teacher-workspace"><aside aria-label="Student IDs / 學號列表">
        <h2>{loadedDay||'請選擇日期'}</h2>
        {students.map(id=><button className="student-row" aria-pressed={selected===id} key={id} disabled={busy} onClick={()=>void run(()=>selectStudent(id))}>{id}</button>)}
        {!students.length&&<p>尚無作品。</p>}
        {cursor&&<button disabled={busy} onClick={()=>void run(()=>load(true))}>載入更多學號／作品</button>}
      </aside><section aria-label="Student results / 學生成果">
        {selected?<h2>{selected} · 當日作品</h2>:<p>點選左側學號查看作品。</p>}
        {artworks.filter(x=>x.studentId===selected).map(work=><section key={work.id} className="teacher-work">
          <p>{new Date(work.createdAt).toLocaleTimeString('zh-TW',{timeZone:'Asia/Taipei'})} · {work.published?'Gallery 已發布':'私密／待審核'}</p>
          <ArtworkCard artwork={work}/>
          {work.status!=='complete'&&work.failureReason==='configuration'&&<p role="status">先前因生圖服務設定錯誤而未送出圖片請求；設定修復後，請使用下方恢復按鈕。</p>}
          <details><summary>圖片提示詞</summary><pre>{work.prompt}</pre></details>
          {work.status!=='complete'&&<button className="secondary-button" disabled={busy} onClick={()=>void run(()=>refresh(work.id))}>更新生成狀態</button>}
          {work.canRecover&&<button className="secondary-button" disabled={busy} onClick={()=>{
            if(window.confirm('重新生成這件作品一次？可能再次產生 API 費用；保留原句子與提示詞，圖片完成後仍為私密。'))void run(()=>recover(work))
          }}>{(work.recoveryCount??0)>=1?'修復後重新生成一次（可能計費）':'重新生成一次（可能計費）'}</button>}
          {work.status!=='complete'&&!work.canRecover&&(work.recoveryCount??0)>=1&&<p>已使用一次重新生成。若長時間未完成，請聯絡維護者，不要另行重複生成。</p>}
          <button className="secondary-button" disabled={busy||work.status!=='complete'} onClick={()=>void run(async()=>{
            await portal('publish',{id:work.id,published:!work.published})
            setArtworks(old=>old.map(x=>x.id===work.id?{...x,published:!x.published}:x))
          })}>{work.published?'撤回 Gallery':'核准發布至 Gallery'}</button>
        </section>)}
      </section></div>
      <details><summary>錄音與教學練習分數</summary>
        {recordings.map(r=><article key={r.id}><p>{r.seat?`${r.seat} 號 · `:''}{r.sentence}</p><p>{r.result.total_score} 分 · {r.result.transcript}</p><p>{r.result.feedback}</p>
          <button disabled={busy} onClick={()=>void run(async()=>{const x=await portal<{audio:string}>('recording',{id:r.id});setClip('data:audio/wav;base64,'+x.audio)})}>播放錄音</button>
          {r.prompt&&<pre>{r.prompt}</pre>}</article>)}
        {/* Transcript for the selected recording is provided directly above. */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        {clip&&<audio controls src={clip} aria-label="學生錄音"/>}
      </details>
      <details><summary>換裝置／解除學號綁定</summary><label>學號<input inputMode="numeric" value={releaseId} onChange={e=>setReleaseId(e.target.value)}/></label>
        <button disabled={busy||!releaseId} onClick={()=>{if(window.confirm('解除此學號的裝置綁定？成績與圖片會保留。'))void run(async()=>{await portal('release',{studentId:releaseId});setReleaseId('');setNotice('已解除綁定。')})}}>解除綁定</button></details>
      <details><summary>舊版班級代碼紀錄</summary><label>舊班級代碼<input value={legacyCode} onChange={e=>{setLegacyCode(e.target.value.toUpperCase());setLegacyCursor(null)}}/></label>
        <button disabled={busy} onClick={()=>void run(async()=>{const x=await portal<{records:Recording[];cursor:string|null}>('legacyRecords',{classCode:legacyCode});setRecordings(x.records);setLegacyCursor(x.cursor);setNotice('舊紀錄已載入「錄音與教學練習分數」。')})}>查詢舊紀錄</button>
        {legacyCursor&&<button disabled={busy} onClick={()=>void run(async()=>{const x=await portal<{records:Recording[];cursor:string|null}>('legacyRecords',{classCode:legacyCode,cursor:legacyCursor});setRecordings(old=>[...old,...x.records]);setLegacyCursor(x.cursor)})}>更多舊紀錄</button>}
      </details>
    </>}
    {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  </main>
}
