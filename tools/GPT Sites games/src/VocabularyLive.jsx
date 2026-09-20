import React,{useState,useEffect,useRef,useContext,useCallback,createContext} from 'react';
import QRCode from 'qrcode';
import {activity,LOCAL_LIVE,readSaved,saveLocal,removeLocal,sameLogin,pendingBelongsTo,removePendingIfOwned,nonceValue,removeNonceIfOwned,downloadRecords} from './vocabulary-api';
import './unscramble.css';
import './vocabulary.css';
import {DrawingBoard,Snapshot,WordPicture,Rewards,Finale} from './VocabularyBoard';
import {totalScore} from '../functions/vocabulary-model.mjs';
import {DeckEditor,TeacherRoom,StudentPlay} from './VocabularyPanels';
import {createPictureCache,preparePicture,pictureUploadPayload,imageBlob,imageSize} from './unscramble-images.mjs';
const PictureCache=createContext(null);
function PictureScope({children}){const ref=useRef(null);if(!ref.current)ref.current=createPictureCache();useEffect(()=>()=>ref.current.clear(),[]);return <PictureCache.Provider value={ref.current}>{children}</PictureCache.Provider>;}
import {unlockAudio} from './unscramble-audio.mjs';
import {useClassSound,SoundControls} from './UnscrambleSound';
export const VOCABULARY_GAME={id:'vocabulary',name:'Vocabulary Live',description:'Look, write and shine. Every group, in sync.',url:'#vocabulary',order:6,hidden:false,builtin:true};
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
export function QR({roomId}){const [src,setSrc]=useState(''),[zoom,setZoom]=useState(false);const link=`${location.origin}/vocabulary-join?room=${roomId}`;useEffect(()=>{QRCode.toDataURL(link,{width:220,margin:2,errorCorrectionLevel:'M'}).then(setSrc);},[link]);return <><div className="ul-qr">{src&&<button className="ul-qr-expand" aria-label="放大加入 QR Code" onClick={()=>setZoom(true)}><img src={src} alt="Scan to join this activity"/></button>}<strong>Scan & join</strong><a href={link} target="_blank" rel="noreferrer">學生加入連結 ↗</a><small>{roomId}</small></div>{zoom&&<div className="ul-modal" role="dialog" aria-label="加入活動 QR Code"><div className="ul-qr-large"><h2>Scan & join</h2><img src={src} alt="Large activity QR Code"/><a href={link} target="_blank" rel="noreferrer">學生加入連結 ↗</a><p>輸入同組所有學號，以空格分隔。</p><button onClick={()=>setZoom(false)}>關閉 QR Code</button></div></div>}</>;}
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
export default function VocabularyTeacher(props){return <PictureScope><TeacherDashboard {...props}/></PictureScope>;}
function TeacherDashboard({onExit}){
 const preparedCache=useRef(new Map());
 const [decks,setDecks]=useState([]),[rooms,setRooms]=useState([]),[editor,setEditor]=useState(null),[roomId,setRoomId]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[create,setCreate]=useState(null),[className,setClassName]=useState(''),[maxGroups,setMaxGroups]=useState(8),[filter,setFilter]=useState(''),[optimizing,setOptimizing]=useState(null);
 async function work(fn){setBusy(true);setError('');try{await fn();}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function refresh(){const [d,r]=await Promise.all([activity('listDecks'),activity('listRooms')]);setDecks(d.decks);setRooms(r.rooms);}
 async function deleteRecord(record){await work(async()=>{
  const {room}=await activity('teacherState',{roomId:record.id});
  const prompt=room.phase==='ended'?`永久刪除「${record.className}」的學號與所有作答紀錄？此操作無法復原，題組仍保留。`:`「${record.className}」仍在進行。確定先結束活動、鎖定學生，再永久刪除學號與所有作答紀錄？題組仍保留。`;
  if(!confirm(prompt))return;
  if(room.phase!=='ended')await activity('end',{roomId:room.id,revision:room.revision,confirmIncomplete:true});
  await activity('deleteRoom',{roomId:room.id});await refresh();
 });}
 useEffect(()=>{work(refresh);},[]);
 if(optimizing)return <OptimizeDeck cache={preparedCache.current} deck={optimizing} onBack={()=>setOptimizing(null)} onSaved={()=>{setOptimizing(null);work(refresh);}}/>;
 if(roomId)return <TeacherRoom roomId={roomId} onBack={()=>{setRoomId(null);work(refresh);}}/>;
 if(editor)return <DeckEditor initial={editor} onBack={()=>setEditor(null)} onSaved={()=>{setEditor(null);work(refresh);}}/>;
 return <main className="ul-app"><header className="ul-header"><button onClick={onExit}>← Classroom Club</button><div className="ul-wordmark">VOCABULARY <b>LIVE</b></div><span className="ul-pill">TEACHER</span></header>{LOCAL_LIVE&&<div className="ul-local">本地驗證環境 · Firebase 模擬器 · 尚未發布正式站</div>}
 <section className="ul-hero"><div><span className="ul-eyebrow">ONE CLASS. EVERY VOICE.</span><h1>Words come<br/><em>together.</em></h1><p>單字手寫・即時互動<br/>保存題組，換張圖，再開一堂新課。</p></div><div className="ul-hero-tiles" aria-hidden="true"><i>Look</i><i>Write</i><i>Shine!</i><b>UP TO 15 GROUPS · LIVE</b></div></section>
 <section className="ul-section"><div className="ul-section-title"><h2><Heading en="Question sets" zh="我的題組"/></h2><div className="ul-actions"><button disabled={busy} onClick={()=>work(async()=>{await activity('seed');await refresh();})}>載入 SF1 U01 五題圖卡</button><button className="ul-primary" onClick={()=>setEditor({name:'新題組',questions:[{options:['','',''],correctIndex:0,imageId:'',templateId:'default-whiteboard'}]})}>＋ 新增題組</button></div></div>
 {error&&<p role="alert" className="ul-error">{error}</p>}{busy&&<p role="status">儲存／讀取中…</p>}
 <div className="ul-deck-grid">{decks.map(d=><article className="ul-deck" key={d.id}><Picture imageId={d.questions[0].imageId} variant="thumbnail"/><div><span className="ul-eyebrow">{d.questions.length} QUESTIONS</span><h3>{d.name}</h3><p>{date(d.updatedAt)}</p><div className="ul-actions"><button onClick={()=>setEditor(structuredClone(d))}>編輯</button><button disabled={busy} onClick={()=>setOptimizing(d)}>圖片容量預覽</button><button onClick={()=>setEditor({...structuredClone(d),id:undefined,version:undefined,name:`${d.name}（副本）`})}>複製題組</button><button className="ul-primary" onClick={()=>{setCreate(d);setClassName('');}}>建立新場次 →</button></div></div></article>)}</div>{!busy&&!decks.length&&<p className="ul-empty">先載入已提供的五題，或建立自己的圖片題組。</p>}</section>
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
 async function apply(){if(!confirm(`備份並更新「${deck.name}」的圖片？名稱、單字與歷史場次將保留。`))return;
  setBusy(true);setError('');try{const replacements={};
   for(const row of rows){setStatus(`上傳副本 ${Object.keys(replacements).length+1} / ${rows.length}`);replacements[row.imageId]=row.prepared.existing?row.imageId:(await activity('uploadImage',await pictureUploadPayload(row.prepared))).imageId;}
   const result=await activity('optimizeDeckImages',{deckId:deck.id,version:deck.version,replacements});
   // Confirm the saved references through a fresh read, not just the write response.
   const saved=(await activity('listDecks')).decks.find(d=>d.id===deck.id);
   if(!saved||saved.version!==result.deck.version||saved.name!==deck.name||JSON.stringify(saved.questions)!==JSON.stringify(result.deck.questions))throw new Error('已送出更新，請重新開啟題組確認保存狀態。');
   setDone(result.backupId);setStatus('圖片已更新並讀回確認。');
  }catch(e){setError(e.message);}finally{setBusy(false);}}
 return <main className="ul-app"><header className="ul-header"><button disabled={busy} onClick={done?onSaved:onBack}>← 返回題組</button><h1>圖片容量預覽</h1></header><section className="ul-section"><h2>{deck.name}</h2><p>先比較清晰度與容量，再備份及更新。原圖、名稱、單字與歷史場次均保留。</p><p>1920px、WebP 品質 90%；150–400 KB 為目標，不逐步降低品質硬壓容量。已優化的圖片直接沿用。</p>
 <button disabled={busy||!!done} onClick={preview}>產生比較預覽</button><p role="status">{status}</p>{error&&<p role="alert" className="ul-error">{error}</p>}
 {rows.map(row=><article className="ul-image-comparison" key={row.imageId}><h3>第 {deck.questions.flatMap((q,i)=>q.imageId===row.imageId?[i+1]:[]).join('、')} 題</h3><p>{imageSize(row.original.size)} → {imageSize(row.prepared.full.size)} · 縮圖 {imageSize(row.prepared.thumbnail.size)} · {row.prepared.full.type}</p><div><LocalPicture blob={row.original} label="原圖"/><LocalPicture blob={row.prepared.full} label="作答大圖"/></div></article>)}
 {rows.length>0&&!done&&<button className="ul-primary" disabled={busy} onClick={apply}>確認清晰度，備份並更新此題組</button>}{done&&<p>備份編號：{done}</p>}</section></main>;
}
export function VocabularyStudent(){return <PictureScope><StudentJoin/></PictureScope>;}
function StudentJoin(){
 const pictureCache=useContext(PictureCache);
 const initialRoom=new URLSearchParams(location.search).get('room')||'';
 const [roomId,setRoomId]=useState(initialRoom),[entry,setEntry]=useState(()=>readSaved(`vl-entry:${initialRoom}`)),[numbers,setNumbers]=useState(()=>readSaved(`vl-entry:${initialRoom}`)?.members?.join(' ')||''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[removed,setRemoved]=useState(false),[busy,setBusy]=useState(false);
 const leaveInvalid=useCallback(({code,members=[],credentials,attemptId=null})=>{
  const entryKey=`vl-entry:${roomId}`,saved=readSaved(entryKey),current=saved||entry;
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
   const key=`vl-nonce:${roomId}`,entryKey=`vl-entry:${roomId}`;let joinNonce=nonceValue(readSaved(key));if(!joinNonce){joinNonce=uid();if(!saveLocal(key,{value:joinNonce}))throw new Error('請允許瀏覽器儲存，才能安全接回原組。');}
   let data;try{data=await activity('join',{roomId,members:numbers,joinNonce},true);}catch(first){
    if(first.code!=='STALE_JOIN_NONCE')throw first;
    joinNonce=uid();if(!saveLocal(key,{value:joinNonce}))throw new Error('無法建立新的安全登入，請允許瀏覽器儲存。');
    data=await activity('join',{roomId,members:numbers,joinNonce},true);
   }
   const value={roomId,groupId:data.groupId,token:data.token,members:data.room.group.members};
   const pending=readSaved(`vl-pending:${roomId}`);if(pending&&pending.token!==value.token)removeLocal(`vl-pending:${roomId}`);
   if(!saveLocal(entryKey,value))throw new Error('無法保存加入資料，請保持此頁並聯絡老師。');
   if(!saveLocal(key,{value:joinNonce,...value})){if(sameLogin(readSaved(entryKey),value))removeLocal(entryKey);throw new Error('無法保存安全登入，請允許瀏覽器儲存。');}
   setRemoved(false);setEntry(value);
  }catch(e){if(e.code==='ROOM_REMOVED')setRemoved(true);else setError(e.message);}finally{setBusy(false);}
 }
 if(removed)return <main className="ul-app ul-join"><div className="ul-wordmark">VOCABULARY <b>LIVE</b></div><section className="ul-removed" role="alert"><h1>Activity removed</h1><p>這個活動已移除，請向老師確認新的 QR Code。</p></section></main>;
 return <main className="ul-app ul-join"><div className="ul-wordmark">VOCABULARY <b>LIVE</b></div><form onSubmit={join}><span className="ul-eyebrow">LET'S BUILD IT TOGETHER</span><h1>Hello,<br/><em>team!</em></h1><p>輸入同組所有學號，以空格分隔，例如：40105 40109。</p>{!initialRoom&&<label>Activity code<input aria-label="活動代碼" required value={roomId} onChange={e=>setRoomId(e.target.value.trim().toUpperCase())}/></label>}<label>Student numbers<textarea aria-label="同組學號" required placeholder="40105 40109" value={numbers} onChange={e=>setNumbers(e.target.value.replace(/[^0-9\s]/g,''))}/></label><p className="ul-muted">兩位或三位學生請用空白分隔；系統不會拆分連續數字。每組使用一台平板，學號與作答會保存在本場紀錄。</p>{notice&&<p role="status" className="ul-success">{notice}</p>}{error&&<p role="alert" className="ul-error">{error}</p>}<button className="ul-primary" disabled={busy||!numbers.trim()}>{busy?'Joining…':'Join activity →'}</button></form></main>;
}
