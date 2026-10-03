import React, { useEffect, useRef, useState } from 'react';
import { useMediaResource } from './useMediaResource.jsx';
import { videoPosition } from './video.mjs';
import { isSyncSeekEvent, shouldSendNativePlaybackEvent, videoCommandStatus } from './uploaded-video-sync.mjs';

// Uses the existing authorized media reader; never publishes a private storage URL.
export function UploadedVideo({ asset, room, onControl }) {
  const { url, error: resourceError, refresh } = useMediaResource(asset.id);
  const video = useRef(null), latest = useRef(null);
  const pending = useRef(null), commands = useRef(Promise.resolve()), correctedSeek = useRef(null);
  const [enabled, setEnabled] = useState(false), [ready, setReady] = useState(false);
  const [error, setError] = useState(''), [seconds, setSeconds] = useState(0);
  latest.current = { room, receivedAt: performance.now() };

  function command(action, position) {
    const current = latest.current.room;
    if (!onControl || !current || current.phase !== 'content' || !Number.isFinite(position)) return;
    const safePosition = Math.max(0, Math.min(86400, position));
    const expectedBefore = pending.current ? pending.current.expectedPlaying : current.video?.playing === true;
    pending.current = {
      action, position: safePosition, sequence: current.video?.sequence || 0,
      expectedPlaying: action === 'play' ? true : action === 'pause' ? false : expectedBefore,
      startedAt: performance.now(),
    };
    // LiveApp serializes controls; queue quick native play/seek/pause gestures so none is dropped.
    commands.current = commands.current.catch(() => {}).then(() => onControl('video', {
      blockId: current.block.id, assetId: asset.id, command: action, position: safePosition,
    })).catch((failure) => setError(failure?.message || '影片同步失敗，請重試。'));
  }

  function nativePlayback(event) {
    const current = latest.current.room;
    if (!onControl || !ready || current?.phase !== 'content') return;
    if (shouldSendNativePlaybackEvent(event, current.video, pending.current))
      command(event, video.current.currentTime);
  }

  function nativeSeeked() {
    const element = video.current, mark = correctedSeek.current;
    correctedSeek.current = null;
    if (!element) return;
    if (isSyncSeekEvent(mark, element.currentTime, performance.now())) return;
    if (onControl && ready && latest.current.room?.phase === 'content') command('seek', element.currentTime);
  }

  function sync() {
    const element = video.current, current = latest.current, state = current.room?.video;
    if (!element || !ready || !current.room) return;
    if (onControl && pending.current) {
      const status = videoCommandStatus(pending.current, state, current.room.block.id, asset.id, performance.now());
      if (status === 'waiting') return;
      pending.current = null;
      if (status === 'expired') setError('全班影片指令尚未同步，請重試。');
    }
    if (!state || state.blockId !== current.room.block.id || state.assetId !== asset.id) {
      element.pause();
      return;
    }
    const now = current.room.serverNow + performance.now() - current.receivedAt;
    const position = Math.min(videoPosition(state, now), Number.isFinite(element.duration) ? element.duration : 86400);
    if (Math.abs(element.currentTime - position) > 1) {
      correctedSeek.current = { position, at: performance.now() };
      element.currentTime = position;
    }
    if (state.playing && current.room.phase === 'content' && position < element.duration) {
      if (element.paused) element.play().catch(() => setError('瀏覽器阻擋播放；請按「啟用聲音並跟上老師」。'));
    } else element.pause();
  }
  useEffect(() => {
    if (!ready || !room) return;
    sync();
    const timer = setInterval(sync, 1000);
    return () => clearInterval(timer);
  }, [ready, room?.video?.sequence, room?.phase, url]);
  function activate() {
    setError('');
    const element = video.current;
    if (!element) return;
    // Explicit student gesture unlocks sound where supported; rejection stays visible.
    element.play().then(() => { if (room) sync(); }).catch(() => setError('仍無法播放，請檢查裝置權限或重試素材。'));
  }
  return <section className="lh-video-player" aria-label="本站同步影片">
    <p>{asset.name}</p>
    {!enabled ? <button className="lh-primary" onClick={() => setEnabled(true)}>▶ 準備觀看／載入影片</button> :
      url ? <video ref={video} src={url} controls={!room || (!!onControl && room.phase === 'content')} playsInline preload="metadata" aria-label="教材影片"
        onLoadedMetadata={() => setReady(true)} onEmptied={() => setReady(false)}
        onPlay={() => nativePlayback('play')} onPause={() => nativePlayback('pause')} onEnded={() => nativePlayback('pause')} onSeeked={nativeSeeked}
        onError={() => { setReady(false); setError('影片載入失敗，請重試素材。'); }} style={{ width: '100%', maxHeight: '65vh', background: '#000' }} /> : <p role="status">{resourceError || '影片載入中…'}</p>}
    {enabled && resourceError && <button onClick={refresh}>重試素材</button>}
    {ready && room && !onControl && <button onClick={activate}>啟用聲音並跟上老師</button>}
    {room && onControl && <div className="lh-row">
      <button disabled={!ready || room.phase !== 'content'} onClick={() => command('play', video.current.currentTime)}>▶ 播放影片（學生看前方）</button>
      <button disabled={!ready || room.phase !== 'content'} onClick={() => command('pause', video.current.currentTime)}>⏸ 暫停影片</button>
      <label>跳至秒數<input type="number" min="0" max="86400" value={seconds} onChange={e => setSeconds(Number(e.target.value))} /></label>
      <button disabled={!ready || room.phase !== 'content'} onClick={() => command('seek', Math.min(seconds, video.current.duration))}>更新播放位置</button>
      <small>播放後，學生平板會顯示看前方提示；暫停或播完後，請按「回到活動」或換頁。</small>
    </div>}
    {error && <p role="alert">{error}<button onClick={() => { setError(''); refresh(); }}>重試素材</button></p>}
  </section>;
}
