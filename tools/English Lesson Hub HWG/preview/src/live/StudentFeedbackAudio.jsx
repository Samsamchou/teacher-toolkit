import React, { useEffect, useRef, useState } from 'react';
import { OUTCOME_LABELS, playOutcomeTones, consumeFeedbackReceipt } from './feedback-audio.mjs';

const PREFERENCE_KEY = 'lh-result-sound-muted';
function savedMuted() {
  try { return localStorage.getItem(PREFERENCE_KEY) === '1'; } catch { return false; }
}

export function useStudentFeedbackAudio() {
  const [muted, setMuted] = useState(savedMuted);
  const [feedback, setFeedback] = useState(null);
  const [blocked, setBlocked] = useState(false);
  const [visible, setVisible] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(() => {
    try { return localStorage.getItem('lh-feedback-reduce-motion') === '1' || matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  });
  const context = useRef(null);
  const buffers = useRef({});
  const voice = useRef(null);
  const timer = useRef(null);
  const played = useRef(new Set());
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    for (const name of ['try-again','great']) { const img=new Image(); img.src=`/live-feedback/${name}.webp`; }
    return () => { clearTimeout(timer.current); voice.current?.stop?.(); context.current?.close?.().catch(() => {}); };
  }, []);
  useEffect(() => {
    try { localStorage.setItem(PREFERENCE_KEY, muted ? '1' : '0'); } catch {}
  }, [muted]);

  function loadVoice(outcome) {
    const name=outcome === 'full' ? 'great' : 'try-again';
    if (!buffers.current[name]) buffers.current[name] = fetch(`/live-feedback/${name}.mp3`)
      .then(r => { if (!r.ok) throw new Error('Voice unavailable'); return r.arrayBuffer(); })
      .then(data => context.current.decodeAudioData(data))
      .catch(error => { delete buffers.current[name]; throw error; });
    return buffers.current[name];
  }

  function arm() {
    if (mutedRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) { setBlocked(true); return; }
      if (!context.current) context.current = new AudioContextClass();
      void loadVoice('full').catch(() => {});
      void loadVoice('wrong').catch(() => {});
      // Called synchronously from Submit / vowel taps, before network awaits.
      if (context.current.state !== 'running') context.current.resume().catch(() => setBlocked(true));
    } catch { setBlocked(true); }
  }

  async function play(outcome, mastery=false) {
    if (mutedRef.current) return;
    try {
      arm();
      if (!context.current) return;
      if (context.current.state !== 'running') await context.current.resume();
      if (mastery) {
        const data = await loadVoice(outcome);
        if (mutedRef.current) return;
        voice.current?.stop?.();
        const source=context.current.createBufferSource();
        source.buffer=data;
        const volume=context.current.createGain(); volume.gain.value=.85;
        source.connect(volume); volume.connect(context.current.destination);
        voice.current=source; source.start();
      } else if (!playOutcomeTones(context.current, outcome)) throw new Error('AudioContext unavailable');
      setBlocked(false);
    } catch { setBlocked(true); }
  }

  function announce(receipt) {
    if (!consumeFeedbackReceipt(receipt, played.current)) return;
    setFeedback(receipt);
    clearTimeout(timer.current);
    setVisible(receipt.mastery === true);
    setCelebrating(receipt.mastery === true && receipt.outcome === 'full');
    timer.current=setTimeout(() => { setVisible(false); setCelebrating(false); },1500);
    void play(receipt.outcome,receipt.mastery === true);
  }

  function toggleMuted() {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    if (!next) arm();
    else { voice.current?.stop?.(); setBlocked(false); }
  }

  return {
    arm,
    announce,
    celebrating,
    clearFeedback: () => { clearTimeout(timer.current); voice.current?.stop?.(); setFeedback(null); setBlocked(false); setVisible(false); setCelebrating(false); },
    controls: <div className="lh-result-audio" aria-label="作答結果音效">
      <button type="button" aria-pressed={!muted} onClick={toggleMuted}>結果音效：{muted ? '關' : '開'}</button>
      <button type="button" aria-pressed={reduceMotion} onClick={() => { const next=!reduceMotion; setReduceMotion(next); try { localStorage.setItem('lh-feedback-reduce-motion',String(Number(next))); } catch {} }}>減少回饋動畫：{reduceMotion ? '開' : '關'}</button>
      {feedback && !visible && <p role="status" className={`lh-result-audio-status status-${feedback.outcome}`}>{feedback.mastery ? feedback.outcome==='full' ? 'Great！全部答對' : 'Try Again！再試一次，全部答對才能進遊戲。' : `本題${OUTCOME_LABELS[feedback.outcome]}`}</p>}
      {visible && feedback && <div key={feedback.attemptId} className={`lh-mastery-feedback ${feedback.outcome==='full'?'is-great':'is-encourage'} ${reduceMotion?'reduce-motion':''}`} role="status">
        <img src={`/live-feedback/${feedback.outcome==='full'?'great':'try-again'}.webp`} width="128" height="128" alt="" decoding="async"/>
        <strong>{feedback.outcome==='full'?'Great!':'Try Again!'}<small>{feedback.outcome==='full'?'超讚！全部答對':'加油，全部答對才能進遊戲！'}</small></strong>
      </div>}
      {blocked && !muted && feedback && <button type="button" onClick={() => void play(feedback.outcome,feedback.mastery===true)}>▶ 重播提示音</button>}
      {blocked && !muted && <small>瀏覽器尚未允許聲音；可按「重播提示音」或檢查裝置音量。</small>}
    </div>,
  };
}
