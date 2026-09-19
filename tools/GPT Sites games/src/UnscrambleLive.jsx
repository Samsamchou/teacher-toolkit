import React,{useState,useEffect,useRef,useContext,useCallback,createContext} from 'react';
import QRCode from 'qrcode';
import {activity,LOCAL_LIVE,readSaved,saveLocal,removeLocal,sameLogin,pendingBelongsTo,removePendingIfOwned,nonceValue,removeNonceIfOwned,downloadRecords} from './unscramble-api';
import './unscramble.css';
import {createPictureCache,preparePicture,pictureUploadPayload,imageBlob,imageSize} from './unscramble-images.mjs';
const PictureCache=createContext(null);
function PictureScope({children}){const ref=useRef(null);if(!ref.current)ref.current=createPictureCache();useEffect(()=>()=>ref.current.clear(),[]);return <PictureCache.Provider value={ref.current}>{children}</PictureCache.Provider>;}
import {unlockAudio} from './unscramble-audio.mjs';
import {useClassSound,SoundControls} from './UnscrambleSound';
export const LIVE_GAME={id:'unscramble',name:'Unscramble Live',description:'Build sentences together. Every group, in sync.',url:'#unscramble',order:4,hidden:false,builtin:true};
const uid=()=>crypto.randomUUID();
const date=s=>new Date(s).toLocaleString('zh-TW',{hour12:false});
function Heading({en,zh}){return <><span>{en}</span><small>{zh}</small></>;}
function usePoll(action,payload,student=false){
 const [value,setValue]=useState(null),[error,setError]=useState(''),[online,setOnline]=useState(false),[terminal,setTerminal]=useState(null);const ref=useRef(payload);ref.current=payload;
 useEffect(()=>{let live=true,timer,active=false,stop=false;setTerminal(null);const tick=async()=>{if(active)return;active=true;try{const data=await activity(action,ref.current,student);if(live){setValue(data.room);setError('');setOnline(true);setTerminal(null);stop=data.room.phase==='ended';}}catch(e){if(live){setError(e.message);setOnline(false);if(e.code==='ROOM_REMOVED'||e.status===404){stop=true;setTerminal({code:'ROOM_REMOVED',message:'This activity has been removed.'});}else if(student&&(e.code==='LOGIN_REVOKED'||e.code==='LOGIN_INVALID'||e.status===403)){stop=true;setTerminal({code:e.code||'LOGIN_INVALID',message:e.message});}}}finally{active=false;if(live&&!stop)timer=setTimeout(tick,1000);}};tick();return()=>{live=false;clearTimeout(timer);};},[action,payload.roomId,payload.groupId,payload.token,student]);
 return {value,setValue,error,online,terminal};
}
function Picture({imageId,credentials,variant='full',alt='Question picture'}){
 const cache=useContext(PictureCache);
 const [url,setUrl]=useState(''),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let alive=true,objectUrl;setUrl('');setError('');if(imageId){
  const key=JSON.stringify([credentials?.roomId,credentials?.groupId,credentials?.token,imageId,variant]);
  const fetcher=async()=>imageBlob(await activity(credentials?'studentImage':'image',{...credentials,imageId,variant},!!credentials));
  (cache?cache.get(key,fetcher):fetcher()).then(blob=>{if(alive){objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);}}).catch(e=>{if(alive)setError(e.message);});
 }return()=>{alive=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};},[imageId,variant,credentials?.roomId,credentials?.groupId,credentials?.token,retry,cache]);
 return <div className="ul-picture">{url?<img src={url} alt={alt}/>:error?<button onClick={()=>setRetry(x=>x+1)}>Retry picture / 重載圖片</button>:<span>{imageId?'Loading picture…':'Add a picture / 加入圖片'}</span>}</div>;
}
function QR({roomId}){const [src,setSrc]=useState(''),[zoom,setZoom]=useState(false);const link=`${location.origin}/join?room=${roomId}`;useEffect(()=>{QRCode.toDataURL(link,{width:220,margin:2,errorCorrectionLevel:'M'}).then(setSrc);},[link]);return <><div className="ul-qr">{src&&<button className="ul-qr-expand" aria-label="放大加入 QR Code" onClick={()=>setZoom(true)}><img src={src} alt="Scan to join this activity"/></button>}<strong>Scan & join</strong><a href={link} target="_blank" rel="noreferrer">學生加入連結 ↗</a><small>{roomId}</small></div>{zoom&&<div className="ul-modal" role="dialog" aria-label="加入活動 QR Code"><div className="ul-qr-large"><h2>Scan & join</h2><img src={src} alt="Large activity QR Code"/><a href={link} target="_blank" rel="noreferrer">學生加入連結 ↗</a><p>輸入同組所有學號，以空格分隔。</p><button onClick={()=>setZoom(false)}>關閉 QR Code</button></div></div>}</>;}
function RecordRow({record,onOpen,onDelete,busy}){
 const [menu,setMenu]=useState(null),menuRef=useRef(null),rowRef=useRef(null);
 function openMenu(e){e.preventDefault();if(busy)return;const r=e.currentTarget.getBoundingClientRect();setMenu({x:Math.max(8,Math.min(e.clientX||r.left,innerWidth-260)),y:Math.max(8,Math.min(e.clientY||r.bottom,innerHeight-160))});}
 useEffect(()=>{if(!menu)return;menuRef.current?.querySelector('button')?.focus({preventScroll:true});
  const outside=e=>{if(!menuRef.current?.contains(e.target))setMenu(null);};
  const key=e=>{if(e.key==='Escape'){e.preventDefault();setMenu(null);rowRef.current?.focus();}else if(e.key==='Tab')setMenu(null);};
  const close=()=>setMenu(null);
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);window.addEventListener('resize',close);window.addEventListener('scroll',close,true);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);window.removeEventListener('resize',close);window.removeEventListener('scroll',close,true);};
 },[menu]);
 return <article ref={rowRef} tabIndex={0} aria-label={`活動紀錄：${record.className}`} onContextMenu={openMenu} onKeyDown={e=>{if(e.key==='F10'&&e.shiftKey)openMenu(e);}}>
 <div><strong>{record.className} · {record.title}</strong><small>{date(record.createdAt)} · {record.groups} 組 · {record.phase==='ended'?'已結束':'進行中'}</small></div>
 <div className="ul-actions"><button onClick={onOpen}>開啟紀錄／場次 →</button><button aria-label={`紀錄選單：${record.className}`} aria-haspopup="menu" aria-expanded={!!menu} disabled={busy} onClick={openMenu}>⋯</button></div>
 {menu&&<div ref={menuRef} className="ul-record-menu" role="menu" aria-label="互動練習紀錄選單" style={{left:menu.x,top:menu.y}} onContextMenu={e=>e.preventDefault()}><small>{record.className}</small><button role="menuitem" className="ul-danger" disabled={busy} onClick={()=>{setMenu(null);onDelete();}}>刪除此互動練習紀錄</button></div>}
 </article>;
}
export default function UnscrambleTeacher(props){return <PictureScope><TeacherDashboard {...props}/></PictureScope>;}
function TeacherDashboard({onExit}){
 const preparedCache=useRef(new Map());
 const [decks,setDecks]=useState([]),[rooms,setRooms]=useState([]),[editor,setEditor]=useState(null),[roomId,setRoomId]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[create,setCreate]=useState(null),[className,setClassName]=useState(''),[maxGroups,setMaxGroups]=useState(8),[filter,setFilter]=useState(''),[optimizing,setOptimizing]=useState(null);
 async function work(fn){setBusy(true);setError('');try{await fn();}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function refresh(){const [d,r]=await Promise.all([activity('listDecks'),activity('listRooms')]);setDecks(d.decks);setRooms(r.rooms);}
 async function deleteRecord(record){await work(async()=>{
  const {room}=await activity('teacherState',{roomId:record.id});
  const prompt=room.phase==='ended'?`永久刪除「${record.className}」的學號與所有作答紀錄？此操作無法復原，題組仍保留。`:`「${record.className}」仍在進行。確定先結束活動、鎖定學生，再永久刪除學號與所有作答紀錄？題組仍保留。`;
  if(!confirm(prompt))return;
  if(room.phase!=='ended')await activity('end',{roomId:room.id,revision:room.revision});
  await activity('deleteRoom',{roomId:room.id});await refresh();
 });}
 useEffect(()=>{work(refresh);},[]);
 if(optimizing)return <OptimizeDeck cache={preparedCache.current} deck={optimizing} onBack={()=>setOptimizing(null)} onSaved={()=>{setOptimizing(null);work(refresh);}}/>;
 if(roomId)return <TeacherRoom roomId={roomId} onBack={()=>{setRoomId(null);work(refresh);}}/>;
 if(editor)return <DeckEditor initial={editor} onBack={()=>setEditor(null)} onSaved={()=>{setEditor(null);work(refresh);}}/>;
 return <main className="ul-app"><header className="ul-header"><button onClick={onExit}>← Classroom Club</button><div className="ul-wordmark">UNSCRAMBLE <b>LIVE</b></div><span className="ul-pill">TEACHER</span></header>{LOCAL_LIVE&&<div className="ul-local">本地驗證環境 · Firebase 模擬器 · 尚未發布正式站</div>}
 <section className="ul-hero"><div><span className="ul-eyebrow">ONE CLASS. EVERY VOICE.</span><h1>Words come<br/><em>together.</em></h1><p>句子重組・即時互動<br/>保存題組，換張圖，再開一堂新課。</p></div><div className="ul-hero-tiles" aria-hidden="true"><i>Who's</i><i>she?</i><i>She's</i><i>my</i><i>sister.</i><b>UP TO 15 GROUPS · LIVE</b></div></section>
 <section className="ul-section"><div className="ul-section-title"><h2><Heading en="Question sets" zh="我的題組"/></h2><div className="ul-actions"><button disabled={busy} onClick={()=>work(async()=>{await activity('seed');await refresh();})}>載入七題家人題組</button><button className="ul-primary" onClick={()=>setEditor({name:'新題組',questions:[{prompt:'',answer:'',imageId:''}]})}>＋ 新增題組</button></div></div>
 {error&&<p role="alert" className="ul-error">{error}</p>}{busy&&<p role="status">儲存／讀取中…</p>}
 <div className="ul-deck-grid">{decks.map(d=><article className="ul-deck" key={d.id}><Picture imageId={d.questions[0].imageId} variant="thumbnail"/><div><span className="ul-eyebrow">{d.questions.length} QUESTIONS</span><h3>{d.name}</h3><p>{date(d.updatedAt)}</p><div className="ul-actions"><button onClick={()=>setEditor(structuredClone(d))}>編輯</button><button disabled={busy} onClick={()=>setOptimizing(d)}>圖片容量預覽</button><button onClick={()=>setEditor({...structuredClone(d),id:undefined,version:undefined,name:`${d.name}（副本）`})}>複製題組</button><button className="ul-primary" onClick={()=>{setCreate(d);setClassName('');}}>建立新場次 →</button></div></div></article>)}</div>{!busy&&!decks.length&&<p className="ul-empty">先載入已提供的七題，或建立自己的圖片題組。</p>}</section>
 <section className="ul-section"><div className="ul-section-title"><h2><Heading en="Class records" zh="上課紀錄"/></h2><input aria-label="搜尋活動紀錄" placeholder="搜尋日期、班級或題組" value={filter} onChange={e=>setFilter(e.target.value)}/></div><div className="ul-record-list">{rooms.filter(r=>`${date(r.createdAt)} ${r.className} ${r.title}`.includes(filter)).map(r=><RecordRow key={r.id} record={r} busy={busy} onOpen={()=>setRoomId(r.id)} onDelete={()=>deleteRecord(r)}/>)}</div></section>
 {create&&<div className="ul-modal"><form onSubmit={e=>{e.preventDefault();work(async()=>{const d=await activity('createRoom',{deckId:create.id,className,maxGroups});setRoomId(d.room.id);setCreate(null);});}}><h2>建立新場次</h2><p>{create.name} · {create.questions.length} 題</p><label>班級／活動名稱<input autoFocus required aria-label="班級名稱" value={className} onChange={e=>setClassName(e.target.value)}/></label><label>組數<select aria-label="組數" value={maxGroups} onChange={e=>setMaxGroups(Number(e.target.value))}>{Array.from({length:14},(_,i)=>i+2).map(n=><option key={n}>{n}</option>)}</select></label>{error&&<p role="alert">{error}</p>}<div className="ul-actions"><button type="button" onClick={()=>setCreate(null)}>取消</button><button className="ul-primary" disabled={busy}>建立場次</button></div></form></div>}
 </main>;
}
function LocalPicture({blob,label}){
 const [url,setUrl]=useState('');useEffect(()=>{const next=URL.createObjectURL(blob);setUrl(next);return()=>URL.revokeObjectURL(next);},[blob]);
 return <figure><figcaption>{label}</figcaption><a href={url} target="_blank" rel="noreferrer"><img src={url} alt={label}/></a></figure>;
}
function OptimizeDeck({deck,onBack,onSaved,cache}){
 const [rows,setRows]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState(''),[done,setDone]=useState(null);
 async function preview(){setBusy(true);setError('');setRows([]);const result=[];try{
  const ids=[...new Set(deck.questions.map(q=>q.imageId))];
  for(const imageId of ids){setStatus(`讀取與比較 ${result.length+1} / ${ids.length}`);
   if(cache.has(imageId)){result.push(cache.get(imageId));continue;}
   const original=imageBlob(await activity('image',{imageId}));
   const prepared=imageId.startsWith('opt-')?{full:original,thumbnail:imageBlob(await activity('image',{imageId,variant:'thumbnail'})),stats:{originalBytes:original.size,bytes:original.size,type:original.type},existing:true}:await preparePicture(original);
   const row={imageId,original,prepared};result.push(row);cache.set(imageId,row);while(cache.size>8)cache.delete(cache.keys().next().value);
  }setRows(result);setStatus('比較完成；題組資料尚未更新。點圖片可開啟大圖檢查。');
 }catch(e){setError(e.message);}finally{setBusy(false);}}
 async function apply(){if(!confirm(`備份並更新「${deck.name}」的圖片？名稱、句子與歷史場次將保留。`))return;
  setBusy(true);setError('');try{const replacements={};
   for(const row of rows){setStatus(`上傳副本 ${Object.keys(replacements).length+1} / ${rows.length}`);replacements[row.imageId]=row.prepared.existing?row.imageId:(await activity('uploadImage',await pictureUploadPayload(row.prepared))).imageId;}
   const result=await activity('optimizeDeckImages',{deckId:deck.id,version:deck.version,replacements});
   // Confirm the saved references through a fresh read, not just the write response.
   const saved=(await activity('listDecks')).decks.find(d=>d.id===deck.id);
   if(!saved||saved.version!==result.deck.version||saved.name!==deck.name||JSON.stringify(saved.questions)!==JSON.stringify(result.deck.questions))throw new Error('已送出更新，請重新開啟題組確認保存狀態。');
   setDone(result.backupId);setStatus('圖片已更新並讀回確認。');
  }catch(e){setError(e.message);}finally{setBusy(false);}}
 return <main className="ul-app"><header className="ul-header"><button disabled={busy} onClick={done?onSaved:onBack}>← 返回題組</button><h1>圖片容量預覽</h1></header><section className="ul-section"><h2>{deck.name}</h2><p>先比較清晰度與容量，再備份及更新。原圖、名稱、句子與歷史場次均保留。</p><p>1920px、WebP 品質 90%；150–400 KB 為目標，不逐步降低品質硬壓容量。已優化的圖片直接沿用。</p>
 <button disabled={busy||!!done} onClick={preview}>產生比較預覽</button><p role="status">{status}</p>{error&&<p role="alert" className="ul-error">{error}</p>}
 {rows.map(row=><article className="ul-image-comparison" key={row.imageId}><h3>第 {deck.questions.flatMap((q,i)=>q.imageId===row.imageId?[i+1]:[]).join('、')} 題</h3><p>{imageSize(row.original.size)} → {imageSize(row.prepared.full.size)} · 縮圖 {imageSize(row.prepared.thumbnail.size)} · {row.prepared.full.type}</p><div><LocalPicture blob={row.original} label="原圖"/><LocalPicture blob={row.prepared.full} label="作答大圖"/></div></article>)}
 {rows.length>0&&!done&&<button className="ul-primary" disabled={busy} onClick={apply}>確認清晰度，備份並更新此題組</button>}{done&&<p>備份編號：{done}</p>}</section></main>;
}
function DeckEditor({initial,onBack,onSaved}){
 const [deck,setDeck]=useState(initial),[index,setIndex]=useState(0),[step,setStep]=useState(1),[busy,setBusy]=useState(false),[error,setError]=useState(''),[imageStats,setImageStats]=useState({});const q=deck.questions[index];
 function update(patch){setDeck(d=>({...d,questions:d.questions.map((x,i)=>i===index?{...x,...patch}:x)}));}
 async function upload(file){if(!file)return;setBusy(true);setError('');try{
  const targetIndex=index,prepared=await preparePicture(file),data=await activity('uploadImage',await pictureUploadPayload(prepared));
  setDeck(d=>({...d,questions:d.questions.map((x,i)=>i===targetIndex?{...x,imageId:data.imageId}:x)}));setImageStats(x=>({...x,[data.imageId]:prepared.stats}));
 }catch(e){setError(e.message);}finally{setBusy(false);}}
 return <main className="ul-app"><header className="ul-header"><button onClick={()=>{if(confirm('離開編輯？尚未儲存的修改不會保留。'))onBack();}}>← 返回題組</button><h1>Prepare a set <small>編輯題組</small></h1><button className="ul-primary" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await activity('saveDeck',{deck});onSaved();}catch(e){setError(e.message);}finally{setBusy(false);}}}>儲存題組</button></header>
 <section className="ul-section"><label>題組名稱<input aria-label="題組名稱" value={deck.name} onChange={e=>setDeck({...deck,name:e.target.value})}/></label>{error&&<p role="alert" className="ul-error">{error}</p>}<div className="ul-editor-layout"><nav className="ul-question-nav">{deck.questions.map((x,i)=><button className={index===i?'active':''} key={i} disabled={busy} onClick={()=>{setIndex(i);setStep(1);}}>Q{i+1} {x.imageId&&x.prompt&&x.answer?'✓':'○'}</button>)}<button onClick={()=>{setDeck(d=>({...d,questions:[...d.questions,{prompt:'',answer:'',imageId:''}]}));setIndex(deck.questions.length);setStep(1);}}>＋ 加題</button></nav>
 <div className="ul-editor-card"><div className="ul-tabs"><button className={step===1?'active':''} onClick={()=>setStep(1)}>1 · 題目圖片</button><button className={step===2?'active':''} onClick={()=>setStep(2)}>2 · 模式與句子</button></div><h2>Question {index+1}</h2>{step===1?<><Picture imageId={q.imageId}/><p role="status">{busy?'圖片處理／儲存中…':imageStats[q.imageId]?`原圖 ${imageSize(imageStats[q.imageId].originalBytes)} → ${imageSize(imageStats[q.imageId].bytes)} · ${imageStats[q.imageId].type} · ${imageStats[q.imageId].width} × ${imageStats[q.imageId].height}`:'自動產生清晰小圖，不裁切、不放大；150–400 KB 為參考目標。'}</p><label className="ul-upload">上傳／更換圖片<input aria-label="題目圖片" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>{upload(e.target.files[0]);e.target.value='';}}/></label><button className="ul-primary" disabled={!q.imageId||busy} onClick={()=>setStep(2)}>Next → 設定句子</button></>:<><div className="ul-mode">✦ 句子重組 · Unscramble</div><p>兩句字卡會混合；縮寫與標點保持完整。</p><label>問句<input aria-label="問句" value={q.prompt} onChange={e=>update({prompt:e.target.value})} placeholder="Who's she?"/></label><label>答句<input aria-label="答句" value={q.answer} onChange={e=>update({answer:e.target.value})} placeholder="She's my sister."/></label><div className="ul-word-preview">{`${q.prompt} ${q.answer}`.split(/\s+/).filter(Boolean).map((w,i)=><span key={i}>{w}</span>)}</div><p className="ul-muted">書寫白板條、口說評分、塗鴉：後續階段</p></>}
 <button className="ul-danger" disabled={deck.questions.length===1||busy} onClick={()=>{if(confirm(`刪除第 ${index+1} 題？`)){setDeck(d=>({...d,questions:d.questions.filter((_,i)=>i!==index)}));setIndex(Math.max(0,index-1));}}}>刪除此題</button></div></div></section></main>;
}
function GroupRecords({room,index,onRelease,releasing,releaseDisabled}){
 const [history,setHistory]=useState(null);
 useEffect(()=>setHistory(null),[index]);
 return <><div className="ul-groups">{Array.from({length:room.maxGroups},(_,i)=>{
  const g=Object.values(room.groups).find(g=>g.number===i+1),attempts=g?.attempts.filter(a=>a.questionIndex===index)||[],last=attempts.at(-1),released=g?.loginStatus==='released';
  const answerStatus=last?.correct?'✓ Correct':attempts.length>=5?'✕ 5 tries':last?'↻ Try again':g?(room.phase==='ended'?'No answer':'Waiting'):'Not joined';
  return <article key={i} className={`ul-group ${last?.correct?'correct':attempts.length>=5?'exhausted':last?'wrong':''} ${released?'released':''}`}><header><strong>GROUP {i+1}</strong><span>{answerStatus}</span></header><small>{g?.members.join(' · ')||'等待加入'}</small><div className={`ul-group-login ${released?'waiting':''}`}>{g?(released?'等待重新加入':'已加入（不代表目前在線）'):'尚未加入'}</div><div className="ul-answer">{room.showAnswers?(last?last.lines.map((line,j)=><div key={j}>{line}</div>):'—'):'••• 答案已遮蔽'}</div><footer><span>{attempts.length} / 5</span><div className="ul-group-actions">{attempts.length>0&&<button aria-label={`查看第${i+1}組歷次紀錄`} onClick={()=>setHistory(g.id)}>歷次紀錄 ↗</button>}{g&&!released&&room.phase!=='ended'&&<button className="ul-release-login" disabled={releaseDisabled||releasing===g.id} onClick={()=>onRelease(g)}>{releasing===g.id?'解除中…':'解除登入'}</button>}</div></footer></article>;
 })}</div>{history&&<div className="ul-modal" role="dialog" aria-modal="true" aria-label="歷次作答紀錄"><div className="ul-history-panel"><h2>GROUP {room.groups[history]?.number} · 第 {index+1} 題</h2><p>{room.groups[history]?.members.join(' · ')}</p>{room.groups[history]?.attempts.filter(a=>a.questionIndex===index).map(a=><p key={a.id}>#{a.number} {a.correct?'✓ Correct':'↻ Try again'}<br/>{room.showAnswers?a.lines.join(' '):'••• 答案已遮蔽'}<small>{new Date(a.at).toLocaleTimeString('zh-TW',{hour12:false})}</small></p>)}<button autoFocus onClick={()=>setHistory(null)}>關閉紀錄</button></div></div>}</>;
}

function TeacherRoom({roomId,onBack}){
 const {value:room,setValue,error,online}=usePoll('teacherState',{roomId}),[busy,setBusy]=useState(false),[actionError,setActionError]=useState(''),[notice,setNotice]=useState(''),[releaseBusy,setReleaseBusy]=useState(''),[qr,setQr]=useState(true),[recordIndex,setRecordIndex]=useState(null),releaseRequests=useRef(new Map());
 const sound=useClassSound('teacher',!!room&&room.phase!=='ended');
 async function command(action,extra={}){setBusy(true);setActionError('');try{const d=await activity(action,{roomId,revision:room.revision,...extra});setValue(d.room);if(action==='next')sound.cue(true);}catch(e){setActionError(e.message);}finally{setBusy(false);}}
 async function releaseLogin(group){
  if(releaseBusy)return;
  const prompt=`GROUP ${group.number}\n學號：${group.members.join(' ')}\n\n解除這組目前的登入，允許同組學號重新加入。\n已儲存的作答紀錄與作答次數會保留。`;
  if(!confirm(prompt))return;
  const saved=releaseRequests.current.get(group.id),request=saved?.loginVersion===group.loginVersion?saved:{releaseRequestId:uid(),loginVersion:group.loginVersion};
  releaseRequests.current.set(group.id,request);setReleaseBusy(group.id);setActionError('');setNotice('');
  try{const data=await activity('releaseGroupLogin',{roomId,groupId:group.id,...request});setValue(data.room);setNotice(`GROUP ${group.number} 已解除登入，等待同組學號重新加入。`);releaseRequests.current.delete(group.id);}
  catch(e){setActionError(e.network?'連線中斷，解除結果尚未確認；畫面更新後可安全重試。':e.message);if(!e.network)releaseRequests.current.delete(group.id);}
  finally{setReleaseBusy('');}
 }
 if(!room)return <main className="ul-app"><button onClick={onBack}>← 返回</button><h1>Opening activity…</h1>{error&&<p role="alert">{error}</p>}</main>;
 const review=recordIndex??(room.phase==='open'?room.questionIndex:room.reviewIndex??room.questionIndex);
 return <main className="ul-app ul-teacher" data-large-class={room.maxGroups>=10}><header className="ul-header"><button onClick={onBack}>← 題組與紀錄</button><div><h1>{room.className} · {room.title}</h1><small>{date(room.createdAt)} · {Object.keys(room.groups).length}/{room.maxGroups} groups · <span className={online?'ul-online':'ul-offline'}>{online?'● Connected':'● Reconnecting'}</span></small></div><div className="ul-actions"><SoundControls sound={sound} teacher/><button onClick={()=>setQr(!qr)}>{qr?'收起 QR':'顯示 QR'}</button><button onClick={()=>document.documentElement.requestFullscreen?.().catch(()=>{})}>全螢幕</button></div></header>
 {(error||actionError)&&<p className="ul-error" role="alert">{actionError||error}</p>}{notice&&<p className="ul-success" role="status">{notice}</p>}
 <section className="ul-stage"><div><div className="ul-stage-label"><span className="ul-pill">QUESTION {room.questionIndex+1} / {room.questions.length}</span><strong>{room.phase==='preview'?'LOOK & THINK · 學生已鎖定':room.phase==='open'?'YOUR TURN · 作答開放中':'CLASS COMPLETE · 活動結束'}</strong></div><Picture imageId={room.questions[room.questionIndex].imageId}/></div>{qr&&<QR roomId={room.id}/>}</section>
 <div className="ul-controlbar"><p>{room.phase==='preview'?'先看圖片，準備好了再開放作答。':room.phase==='open'?'切換下一題圖片，將立即鎖定学生並保留本題紀錄。':'本場所有紀錄已保存。'}</p><div className="ul-actions"><button disabled={busy||!online} onClick={()=>command('visibility',{showAnswers:!room.showAnswers})}>{room.showAnswers?'遮蔽答案':'顯示答案'}</button>{room.phase!=='ended'&&<><button disabled={busy||!online} onClick={()=>{if(confirm('結束活動並鎖定所有學生？'))command('end');}}>結束活動</button><button className="ul-primary ul-next" disabled={busy||!online} onClick={()=>{setRecordIndex(null);command('next');}}>{room.phase==='preview'?'Next · 開放作答':room.questionIndex===room.questions.length-1?'Finish · 結束並看紀錄':'Next · 下一題圖片'} →</button></>}</div></div>
 <section className="ul-section"><div className="ul-section-title"><h2>Live answers <small>第 {review+1} 題各組作答紀錄</small></h2><div className="ul-actions"><select aria-label="查看題目紀錄" value={review} onChange={e=>setRecordIndex(Number(e.target.value))}>{room.questions.map((_,i)=><option key={i} value={i}>第 {i+1} 題</option>)}</select><button onClick={()=>downloadRecords(room)}>匯出 CSV</button>{room.phase==='ended'&&<button className="ul-danger" onClick={async()=>{if(confirm('永久刪除此場學號與作答紀錄？題組仍保留。')){try{await activity('deleteRoom',{roomId});onBack();}catch(e){setActionError(e.message);}}}}>刪除此場紀錄</button>}</div></div><GroupRecords room={room} index={review} onRelease={releaseLogin} releasing={releaseBusy} releaseDisabled={busy||!online}/></section>
 </main>;
}
export function UnscrambleStudent(){return <PictureScope><StudentJoin/></PictureScope>;}
function StudentJoin(){
 const pictureCache=useContext(PictureCache);
 const initialRoom=new URLSearchParams(location.search).get('room')||'';
 const [roomId,setRoomId]=useState(initialRoom),[entry,setEntry]=useState(()=>readSaved(`ul-entry:${initialRoom}`)),[numbers,setNumbers]=useState(()=>readSaved(`ul-entry:${initialRoom}`)?.members?.join(' ')||''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[removed,setRemoved]=useState(false),[busy,setBusy]=useState(false);
 const leaveInvalid=useCallback(({code,members=[],credentials,attemptId=null})=>{
  const entryKey=`ul-entry:${roomId}`,saved=readSaved(entryKey),current=saved||entry;
  if(credentials&&!sameLogin(current,credentials)){if(saved)setEntry(saved);return false;}
  pictureCache?.clear();removePendingIfOwned(roomId,credentials||current,attemptId);removeNonceIfOwned(roomId,credentials||current,!saved||sameLogin(saved,credentials||current));
  if(saved&&sameLogin(saved,credentials||current))removeLocal(entryKey);
  setNumbers(members.join(' '));setEntry(null);
  if(code==='ROOM_REMOVED'){setRemoved(true);setNotice('');}else{setRemoved(false);setNotice('這組的舊登入已失效。請用相同組員學號重新加入。');}
  return true;
 },[entry,pictureCache,roomId]);
 if(entry)return <StudentPlay key={`${entry.groupId}:${entry.token}`} credentials={entry} onInvalid={leaveInvalid} onLeave={()=>{if(confirm('離開本組畫面？仍可用這台裝置重新加入。')){pictureCache?.clear();setNumbers(entry.members?.join(' ')||'');setEntry(null);}}}/>;
 async function join(e){
  e.preventDefault();unlockAudio();setBusy(true);setError('');setNotice('');
  try{
   const key=`ul-nonce:${roomId}`,entryKey=`ul-entry:${roomId}`;let joinNonce=nonceValue(readSaved(key));if(!joinNonce){joinNonce=uid();if(!saveLocal(key,{value:joinNonce}))throw new Error('請允許瀏覽器儲存，才能安全接回原組。');}
   let data;try{data=await activity('join',{roomId,members:numbers,joinNonce},true);}catch(first){
    if(first.code!=='STALE_JOIN_NONCE')throw first;
    joinNonce=uid();if(!saveLocal(key,{value:joinNonce}))throw new Error('無法建立新的安全登入，請允許瀏覽器儲存。');
    data=await activity('join',{roomId,members:numbers,joinNonce},true);
   }
   const value={roomId,groupId:data.groupId,token:data.token,members:data.room.group.members};
   const pending=readSaved(`ul-pending:${roomId}`);if(pending&&pending.token!==value.token)removeLocal(`ul-pending:${roomId}`);
   if(!saveLocal(entryKey,value))throw new Error('無法保存加入資料，請保持此頁並聯絡老師。');
   if(!saveLocal(key,{value:joinNonce,...value})){if(sameLogin(readSaved(entryKey),value))removeLocal(entryKey);throw new Error('無法保存安全登入，請允許瀏覽器儲存。');}
   setRemoved(false);setEntry(value);
  }catch(e){if(e.code==='ROOM_REMOVED')setRemoved(true);else setError(e.message);}finally{setBusy(false);}
 }
 if(removed)return <main className="ul-app ul-join"><div className="ul-wordmark">UNSCRAMBLE <b>LIVE</b></div><section className="ul-removed" role="alert"><h1>Activity removed</h1><p>這個活動已移除，請向老師確認新的 QR Code。</p></section></main>;
 return <main className="ul-app ul-join"><div className="ul-wordmark">UNSCRAMBLE <b>LIVE</b></div><form onSubmit={join}><span className="ul-eyebrow">LET'S BUILD IT TOGETHER</span><h1>Hello,<br/><em>team!</em></h1><p>輸入同組所有學號，以空格分隔，例如：40105 40109。</p>{!initialRoom&&<label>Activity code<input aria-label="活動代碼" required value={roomId} onChange={e=>setRoomId(e.target.value.trim().toUpperCase())}/></label>}<label>Student numbers<textarea aria-label="同組學號" required placeholder="40105 40109" value={numbers} onChange={e=>setNumbers(e.target.value.replace(/[^0-9\s]/g,''))}/></label><p className="ul-muted">兩位或三位學生請用空白分隔；系統不會拆分連續數字。每組使用一台平板，學號與作答會保存在本場紀錄。</p>{notice&&<p role="status" className="ul-success">{notice}</p>}{error&&<p role="alert" className="ul-error">{error}</p>}<button className="ul-primary" disabled={busy||!numbers.trim()}>{busy?'Joining…':'Join activity →'}</button></form></main>;
}
function StudentPlay({credentials,onLeave,onInvalid}){
 const {value:room,setValue,error,online,terminal}=usePoll('studentState',credentials,true),[draft,setDraft]=useState([[],[]]),[selectedRow,setSelectedRow]=useState(0),[pending,setPending]=useState(()=>{const saved=readSaved(`ul-pending:${credentials.roomId}`);return pendingBelongsTo(saved,credentials)?saved:null;}),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[feedback,setFeedback]=useState(null);
 const sound=useClassSound('student',room?.phase==='open');
 const currentQuestion=useRef(null),submitLock=useRef(false),feedbackTimer=useRef(null),invalidating=useRef(false),alive=useRef(true);
 useEffect(()=>()=>{alive.current=false;clearTimeout(feedbackTimer.current);},[]);
 useEffect(()=>{if(room&&room.questionIndex!==currentQuestion.current){currentQuestion.current=room.questionIndex;setDraft(readSaved(`ul-draft:${credentials.roomId}:${room.questionIndex}`,[[],[]]));setSelectedRow(0);setFeedback(null);setMessage('');}},[room?.questionIndex]);
 useEffect(()=>{if(terminal&&!invalidating.current){invalidating.current=true;removePendingIfOwned(credentials.roomId,credentials);setPending(null);onInvalid({code:terminal.code,members:room?.group?.members||credentials.members||[],credentials});}},[terminal,room?.group?.members,credentials,onInvalid]);
 function celebrate(correct){if(!alive.current)return;setFeedback(correct?'correct':'wrong');clearTimeout(feedbackTimer.current);feedbackTimer.current=setTimeout(()=>{if(alive.current)setFeedback(null);},correct?2600:1600);sound.cue(correct);}
 useEffect(()=>{if(pending&&room){const accepted=room.group.attempts.find(a=>a.id===pending.attemptId);if(accepted){removePendingIfOwned(credentials.roomId,credentials,pending.attemptId);setPending(null);setMessage('Saved ✓');celebrate(accepted.correct);}else if(room.questionIndex!==pending.questionIndex||room.phase!=='open'){removePendingIfOwned(credentials.roomId,credentials,pending.attemptId);setPending(null);setMessage('This question is locked. An unsent answer was not counted.');}}},[room]);
 if(!room)return <main className="ul-app ul-join"><h1>Joining your team…</h1>{error&&<p role="alert">{error}</p>}<button onClick={onLeave}>Back</button></main>;
 const tokens=room.tokens.map((word,i)=>({id:i,word})),used=draft.flat(),available=tokens.filter(t=>!used.includes(t.id));
 const attempts=room.group.attempts.filter(a=>a.questionIndex===room.questionIndex),correct=attempts.some(a=>a.correct),exhausted=attempts.length>=5;
 const locked=room.phase!=='open'||correct||exhausted||!online||busy||!!pending;
 function arrange(next){if(locked)return;unlockAudio();setDraft(next);saveLocal(`ul-draft:${credentials.roomId}:${room.questionIndex}`,next);setMessage('');}
 function add(i,row=selectedRow){if(locked)return;arrange(draft.map((line,j)=>j===row?[...line.filter(x=>x!==i),i]:line.filter(x=>x!==i)));}
 function remove(i){arrange(draft.map(line=>line.filter(x=>x!==i)));}
 async function submit(retry=false){
  if(submitLock.current||(!retry&&locked))return;unlockAudio();submitLock.current=true;setBusy(true);setMessage('');
  const body=retry?pending:{...credentials,attemptId:uid(),questionIndex:room.questionIndex,revision:room.revision,lines:draft.map(line=>line.map(i=>tokens[i].word))};
  setPending(body);saveLocal(`ul-pending:${credentials.roomId}`,body);
  try{const data=await activity('submit',body,true);if(!alive.current||!sameLogin(readSaved(`ul-entry:${credentials.roomId}`),credentials))return;removePendingIfOwned(credentials.roomId,credentials,body.attemptId);setPending(current=>pendingBelongsTo(current,credentials,body.attemptId)?null:current);setValue(data.room);setMessage('Saved ✓');celebrate(data.attempt.correct);}
  catch(e){if(!alive.current||!sameLogin(readSaved(`ul-entry:${credentials.roomId}`),credentials))return;setMessage(e.message);if(e.code==='LOGIN_REVOKED'||e.code==='LOGIN_INVALID'||e.code==='ROOM_REMOVED'){removePendingIfOwned(credentials.roomId,credentials,body.attemptId);setPending(current=>pendingBelongsTo(current,credentials,body.attemptId)?null:current);onInvalid({code:e.code,members:room?.group?.members||credentials.members||[],credentials,attemptId:body.attemptId});}else if(e.status&&e.status<500){removePendingIfOwned(credentials.roomId,credentials,body.attemptId);setPending(current=>pendingBelongsTo(current,credentials,body.attemptId)?null:current);}}
  finally{if(alive.current)setBusy(false);submitLock.current=false;}
 }
 const status=room.phase==='ended'?'Great teamwork!':correct?'You got it!':exhausted?'Wait for your teacher.':room.phase!=='open'?'Look & think.':'Build two sentences.';
 return <main className="ul-app ul-student"><header className="ul-header"><div className="ul-wordmark">GROUP <b>{room.group.number}</b><small>{room.group.members.join(' · ')}</small></div><span className="ul-pill">Q{room.questionIndex+1} / {room.questionCount}</span><SoundControls sound={sound}/></header>
 <div className="ul-student-title"><h1>{status}</h1><span className="ul-attempts">{attempts.length} / 5 attempts</span></div>{!online&&<p className="ul-error" role="alert">Reconnecting… Your words are kept.</p>}
 <div className="ul-play-layout"><Picture imageId={room.imageId} credentials={credentials}/><section className="ul-puzzle"><div className="ul-row-selector"><button className={selectedRow===0?'active':''} onClick={()=>setSelectedRow(0)}>1 · Question</button><button className={selectedRow===1?'active':''} onClick={()=>setSelectedRow(1)}>2 · Answer</button></div>
 {[0,1].map(row=><div key={row} className={`ul-sentence ${selectedRow===row?'selected':''}`} data-testid={`sentence-${row}`} onClick={()=>setSelectedRow(row)} onDragOver={e=>{if(!locked)e.preventDefault();}} onDrop={e=>{e.preventDefault();const n=Number(e.dataTransfer.getData('text/plain'));if(Number.isInteger(n)&&tokens[n])add(n,row);}}><span className="ul-line-label">{row===0?'Question':'Answer'}</span>{draft[row].map(i=>tokens[i]&&<button className="ul-word" disabled={locked} key={i} draggable={!locked} onDragStart={e=>e.dataTransfer.setData('text/plain',String(i))} onClick={e=>{e.stopPropagation();remove(i);}}>{tokens[i].word}</button>)}{!draft[row].length&&<span className="ul-placeholder">Tap words or drag them here</span>}</div>)}
 <div className="ul-wordbank" data-testid="wordbank" onDragOver={e=>{if(!locked)e.preventDefault();}} onDrop={e=>{e.preventDefault();remove(Number(e.dataTransfer.getData('text/plain')));}}>{available.map(t=><button className="ul-word" disabled={locked} key={t.id} draggable={!locked} onDragStart={e=>e.dataTransfer.setData('text/plain',String(t.id))} onClick={()=>add(t.id)}>{t.word}</button>)}</div>
 <div className="ul-submit-row"><button disabled={locked} onClick={()=>arrange([[],[]])}>Reset</button><button className="ul-primary" disabled={locked||available.length>0||draft.some(x=>!x.length)} onClick={()=>submit()}>Check answer →</button></div>
 {pending&&<button className="ul-primary" disabled={busy||!online} onClick={()=>submit(true)}>Retry saving · no extra attempt</button>}{message&&<p role="status">{message}</p>}{locked&&!pending&&!busy&&<div className="ul-lock-note">{correct?'✓ Correct! Wait for the next question.':exhausted?'Five tries completed. Listen to your teacher.':room.phase==='ended'?'All done. Thank you!':'🔒 Wait for your teacher to press Next.'}</div>}
 </section></div>{feedback&&<div role="status" className={`ul-feedback ${feedback}`} onClick={()=>setFeedback(null)}><span>{feedback==='correct'?'✦':'↻'}</span><strong>{feedback==='correct'?'Correct!':'Try again'}</strong>{feedback==='correct'&&<div className="ul-confetti" aria-hidden="true">✦ ● ✦ ● ✦</div>}</div>}
 </main>;
}
