import React, { useEffect, useRef, useState } from 'react';
import { shouldPlayTeacherMusic, teacherMusicMode } from './teacher-music-policy.mjs';

const TRACK = '/live-audio/upbeat-happy-corporate-487426.mp3';
const VOLUME_KEY = 'lh-teacher-bgm-volume';
function savedVolume() {
  try {
    const stored = localStorage.getItem(VOLUME_KEY);
    if (stored === null) return 20;
    const value = Number(stored);
    return Number.isFinite(value) && value >= 0 && value <= 100 ? value : 20;
  } catch { return 20; }
}

export function TeacherMusic({ blockId, blockType, phase, videoPlaying = false }) {
  const audio = useRef(null);
  const [volume, setVolume] = useState(savedVolume);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState('');
  const context = { blockType, phase, videoPlaying };
  const mode = teacherMusicMode(context);
  const shouldPlay = shouldPlayTeacherMusic(context, manuallyPaused);

  useEffect(() => {
    if (audio.current) audio.current.volume = volume / 100;
    try { localStorage.setItem(VOLUME_KEY, String(volume)); } catch {}
  }, [volume]);
  // An explicit pause applies to this question; switching pages restores the
  // requested automatic question-page behavior without restarting the track.
  useEffect(() => { setManuallyPaused(false); setBlocked(false); setError(''); }, [blockId]);
  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    if (!shouldPlay) { element.pause(); return; }
    element.play().catch(() => {
      setPlaying(false); setBlocked(true);
      setError('瀏覽器阻擋自動播放；請按「啟用音樂」後繼續。');
    });
  }, [shouldPlay]);

  function toggle() {
    const element = audio.current;
    if (!element || mode !== 'question') return;
    setError('');
    if (manuallyPaused) {
      setManuallyPaused(false);
      // Start in this teacher click gesture for Safari autoplay rules.
      element.play().catch(() => {
        setPlaying(false); setBlocked(true);
        setError('瀏覽器阻擋播放；請再按一次「啟用音樂」。');
      });
    } else if (blocked) {
      element.play().catch(() => {
        setPlaying(false); setBlocked(true);
        setError('瀏覽器阻擋播放；請檢查裝置音量並重試。');
      });
    } else {
      setManuallyPaused(true);
      element.pause();
    }
  }

  const status = mode === 'slide' ? '教材投影片：音樂自動暫停'
    : mode === 'video' ? '教材影片播放中，音樂已暫停'
    : mode === 'lobby' ? '課堂尚未開始，音樂已暫停'
    : mode === 'ended' ? '課堂已結束，音樂已暫停'
    : manuallyPaused ? '本題已手動暫停音樂'
    : blocked ? '請按「啟用音樂」允許播放'
    : playing ? '題目頁：音樂播放中' : '題目頁：正在啟動音樂';

  return <section className="lh-teacher-music" aria-label="教師背景音樂">
    <audio ref={audio} src={TRACK} loop preload="none" onPlay={event => {
      // A delayed browser play promise must not restart music on a slide.
      if (mode !== 'question' || manuallyPaused) { event.currentTarget.pause(); return; }
      setPlaying(true); setBlocked(false); setError('');
    }} onPause={() => setPlaying(false)} onError={() => setError('背景音樂無法載入，請檢查網路並重試。')} />
    <button type="button" onClick={toggle} disabled={mode !== 'question'} aria-pressed={playing}>
      {blocked ? '▶ 啟用音樂' : manuallyPaused || !playing ? '▶ 播放音樂' : '⏸ 暫停音樂'}
    </button>
    <label>音量 {volume}%
      <input type="range" min="0" max="100" step="5" value={volume} onChange={e => setVolume(Number(e.target.value))} aria-label="教師背景音樂音量" />
    </label>
    <span role="status">{status}</span>
    <small>僅教師裝置播放・循環；音樂：<a href="https://pixabay.com/music/corporate-upbeat-happy-corporate-487426/" target="_blank" rel="noopener noreferrer">kornevmusic／Pixabay</a></small>
    {error && <p role="alert">{error}</p>}
  </section>;
}
