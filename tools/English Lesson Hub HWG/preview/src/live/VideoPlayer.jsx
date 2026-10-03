import React,{useEffect,useRef,useState} from 'react';
import {videoSource,videoPosition,clampVideoPosition,videoClipEnded,videoTime} from './video.mjs';
let apiPromise;
function youtubeAPI(){
  if(window.YT?.Player)return Promise.resolve(window.YT);
  if(!apiPromise)apiPromise=new Promise((resolve,reject)=>{
    const previous=window.onYouTubeIframeAPIReady;
    const timer=setTimeout(()=>{apiPromise=null;reject(new Error('YouTube 載入逾時，請重新載入或外開觀看。'));},15000);
    window.onYouTubeIframeAPIReady=()=>{clearTimeout(timer);previous?.();resolve(window.YT);};
    const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{clearTimeout(timer);apiPromise=null;reject(new Error('無法載入 YouTube。'));};document.head.append(script);
  });
  return apiPromise;
}
export function VideoPlayer({url,trim,room,onControl,onPlaybackChange,onDuration,autoLoad=false,previewControls=false,previewDisabled=false}) {
  const source=videoSource(url),host=useRef(null),player=useRef(null);
  const [enabled,setEnabled]=useState(autoLoad),[ready,setReady]=useState(false),[error,setError]=useState(''),[seconds,setSeconds]=useState(trim?.start||0);
  const latest=useRef({}),nativeIntent=useRef(null),duration=useRef(0),clock=useRef({});
  if(clock.current.serverNow!==room?.serverNow)clock.current={serverNow:room?.serverNow,readAt:Date.now()};
  latest.current={room,onControl,onPlaybackChange,onDuration,trim,source};
  useEffect(()=>{if(autoLoad)setEnabled(true);},[autoLoad]);
  useEffect(()=>{setSeconds(trim?.start||0);},[trim?.start]);
  function cue(p) {
    const {source:s,trim:t}=latest.current;
    p.cueVideoById({videoId:s.id,startSeconds:t?.start||0,...(t?{endSeconds:t.end}:{})});
  }
  useEffect(()=>{
    if(!enabled||source?.provider!=='youtube')return;
    let cancelled=false,instance;
    youtubeAPI().then(YT=>{
      if(cancelled)return;
      const mount=document.createElement('div');host.current.append(mount);
      instance=new YT.Player(mount,{videoId:source.id,host:'https://www.youtube-nocookie.com',width:'100%',height:360,playerVars:{origin:location.origin,playsinline:1,controls:1,autoplay:0,start:trim?.start||0,...(trim?{end:trim.end}:{})},events:{
        onReady:()=>{player.current=instance;duration.current=0;cue(instance);setReady(true);},
        onError:e=>setError(`影片無法播放（${e.data}）。請檢查影片限制或使用外開入口。`),
        onAutoplayBlocked:()=>setError(latest.current.room ? '瀏覽器阻擋播放，請點擊影片內播放鍵，再按「跟上老師」。' : '瀏覽器阻擋播放，請點擊影片內的播放鍵預覽片段。'),
        onStateChange:e=>{
          const playing=e.data===YT.PlayerState.PLAYING,{room:r,onControl:control,trim:t}=latest.current;
          let position=e.data===YT.PlayerState.ENDED&&t?t.end:instance.getCurrentTime();
          if(playing&&t&&(position<t.start-.25||position>=t.end)){position=t.start;instance.seekTo(position,true);}
          latest.current.onPlaybackChange?.(playing);
          if(!control||r?.phase!=='content'||![YT.PlayerState.PLAYING,YT.PlayerState.PAUSED,YT.PlayerState.ENDED].includes(e.data))return;
          const expected=nativeIntent.current?.playing??(r.video?.playing===true);
          if(playing===expected)return;
          nativeIntent.current={playing};
          Promise.resolve(control('video',{blockId:r.block.id,command:playing?'play':'pause',position:clampVideoPosition(position,t)})).catch(e=>{if(!cancelled)setError(e.message);}).finally(()=>{nativeIntent.current=null;});
        }
      }});
    }).catch(e=>{if(!cancelled)setError(e.message);});
    return()=>{cancelled=true;instance?.destroy();player.current=null;setReady(false);};
  },[enabled,source?.id,source?.provider]);
  useEffect(()=>()=>latest.current.onPlaybackChange?.(false),[]);
  useEffect(()=>{if(ready){cue(player.current);latest.current.onPlaybackChange?.(false);}},[ready,trim?.start,trim?.end]);
  function sync(){
    const p=player.current,{room:r,trim:t}=latest.current,s=r?.video;
    if(!p||!s||s.blockId!==r.block.id||nativeIntent.current)return;
    const now=r.serverNow+Math.max(0,Date.now()-clock.current.readAt),position=videoPosition(s,now,t);
    if(Math.abs(p.getCurrentTime()-position)>1.5)p.seekTo(position,true);
    const playing=s.playing&&r.phase==='content'&&!videoClipEnded(s,now,t);
    if(playing){if(p.getPlayerState()!==1)p.playVideo();}else if(p.getPlayerState()===1)p.pauseVideo();
  }
  useEffect(()=>{if(ready)sync();},[ready,room?.video?.sequence,room?.phase,room?.video?.playing]);
  useEffect(()=>{if(!ready||!room)return;const timer=setInterval(sync,1000);return()=>clearInterval(timer);},[ready,!!room]);
  useEffect(()=>{
    if(!ready)return;
    // A seek cancels YouTube's endSeconds setting, so keep enforcing the boundary.
    const check=()=>{
      const p=player.current;if(!p)return;
      const length=Math.floor(p.getDuration());
      if(length>0&&length!==duration.current){duration.current=length;latest.current.onDuration?.(length);}
      const t=latest.current.trim;if(!t)return;
      const at=p.getCurrentTime();
      if(p.getPlayerState()===1&&at<t.start-.25)p.seekTo(t.start,true);
      if(at>=t.end){if(p.getPlayerState()===1)p.pauseVideo();if(at>t.end+.1)p.seekTo(t.end,true);latest.current.onPlaybackChange?.(false);}
    };
    check();const timer=setInterval(check,100);return()=>clearInterval(timer);
  },[ready]);
  if(!source)return <p role="alert">影片連結無效。</p>;
  if(source.provider==='drive'&&room)return <section className="lh-note" role="status">Drive 連結不能全班同步。請教師使用「加入影片」上傳檔案，再於「本站同步影片」選單選取；或改用 YouTube。</section>;
  return <section className="lh-video-player">
    {!enabled?<button className="lh-primary" onClick={()=>setEnabled(true)}>▶ 準備觀看／載入影片</button>:source.provider==='drive'?<><p>Drive 教師預覽；全班同步仍待處理。</p><iframe title="Google Drive 影片預覽" src={source.url} allow="fullscreen" allowFullScreen/></>:<div ref={host}/>}
    {trim&&<p className="lh-video-clip">影片片段 · {videoTime(trim.start)}–{videoTime(trim.end)}（{trim.end-trim.start} 秒）</p>}
    {previewControls&&<div className="lh-row"><button disabled={!ready||previewDisabled} onClick={()=>{setError('');const t=latest.current.trim;player.current.loadVideoById({videoId:source.id,startSeconds:t?.start||0,...(t?{endSeconds:t.end}:{})});}}>▶ 預覽片段</button><button disabled={!ready} onClick={()=>player.current.pauseVideo()}>⏸ 暫停預覽</button></div>}
    {room&&onControl&&source.provider==='youtube'&&<div className="lh-row">
      <button disabled={!ready||room.phase!=='content'} onClick={()=>onControl('video',{blockId:room.block.id,command:'play',position:clampVideoPosition(player.current.getCurrentTime(),trim)})}>▶ 播放影片（學生看前方）</button>
      <button disabled={!ready||room.phase!=='content'} onClick={()=>onControl('video',{blockId:room.block.id,command:'pause',position:clampVideoPosition(player.current.getCurrentTime(),trim)})}>⏸ 暫停影片</button>
      <label>跳至秒數<input type="number" min={trim?.start||0} max={trim?.end||86400} value={seconds} onChange={e=>setSeconds(Number(e.target.value))}/></label>
      <button disabled={!ready||room.phase!=='content'} onClick={()=>onControl('video',{blockId:room.block.id,command:'seek',position:clampVideoPosition(seconds,trim)})}>更新播放位置</button>
      <small>播放會提醒學生看前方；暫停或播完後，請按「回到活動」或換頁。</small>
    </div>}
    {room&&!onControl&&ready&&<button onClick={()=>{setError('');sync();}}>跟上老師</button>}
    {error&&<p role="alert">{error}</p>}
    <a href={source.provider==='youtube'?`https://www.youtube.com/watch?v=${source.id}${trim?`&t=${trim.start}s`:''}`:`https://drive.google.com/file/d/${source.id}/view`} target="_blank" rel="noopener noreferrer">無法播放？開新分頁（不參與同步）</a>
  </section>;
}
