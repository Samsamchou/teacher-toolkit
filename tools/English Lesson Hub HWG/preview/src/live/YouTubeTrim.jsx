import React, { useRef, useState } from 'react';
import { VideoPlayer } from './VideoPlayer.jsx';
import { validateVideoTrim, videoTime } from './video.mjs';

const parts = value => value === undefined ? { minutes: '', seconds: '' } : { minutes: String(Math.floor(value / 60)), seconds: String(value % 60) };
function TimeField({ label, value, onChange }) {
  return <fieldset className="sc-trim-time"><legend>{label}</legend><label>分<input aria-label={`${label}分鐘`} type="number" min="0" max="1440" step="1" value={value.minutes} onChange={e => onChange({ ...value, minutes: e.target.value })} /></label><span>:</span><label>秒<input aria-label={`${label}秒數`} type="number" min="0" max="59" step="1" value={value.seconds} onChange={e => onChange({ ...value, seconds: e.target.value })} /></label></fieldset>;
}
function toSeconds(value) {
  if (value.minutes === '' || value.seconds === '' || !/^\d+$/.test(value.minutes) || !/^\d+$/.test(value.seconds) || Number(value.seconds) > 59) return NaN;
  return Number(value.minutes) * 60 + Number(value.seconds);
}
export function YouTubeTrim({ element, onApply, onCancel }) {
  const [start, setStart] = useState(parts(element.trim?.start ?? 0)), [end, setEnd] = useState(parts(element.trim?.end)), [duration, setDuration] = useState(0);
  const endTouched = useRef(!!element.trim);
  const clip = { start: toSeconds(start), end: toSeconds(end) };
  let message = '';
  try { validateVideoTrim(clip, element.url); if (duration && clip.end > duration) message = '結束時間不能超過影片長度。'; }
  catch { message = '請填入起訖時間；秒數為 0–59，片段至少 5 秒。'; }
  const valid = !message;
  function loaded(length) { setDuration(length); if (!endTouched.current) setEnd(parts(Math.min(86400, length))); }
  function changeEnd(value) { endTouched.current = true; setEnd(value); }
  return <div className="sc-trim">
    <p>設定從幾分幾秒開始、到幾分幾秒結束。片段至少 5 秒。</p>
    <div className="sc-trim-preview"><VideoPlayer url={element.url} trim={valid ? clip : undefined} autoLoad previewControls previewDisabled={!valid} onDuration={loaded} /></div>
    {!duration && <p className="sc-hint">按影片內的播放鍵載入影片長度，便會顯示時間軸；也可直接輸入起訖時間。</p>}
    {duration > 0 && <><div className="sc-trim-timeline" style={{ '--trim-start': `${(Number.isFinite(clip.start) ? Math.min(duration, clip.start) : 0) / duration * 100}%`, '--trim-end': `${(Number.isFinite(clip.end) ? Math.min(duration, clip.end) : duration) / duration * 100}%` }}>
      <span className="sc-trim-selection" aria-hidden="true" /><span className="sc-trim-handle sc-trim-start" aria-hidden="true">⋮</span><span className="sc-trim-handle sc-trim-end" aria-hidden="true">⋮</span>
      <input type="range" aria-label="片段起點滑桿" min="0" max={duration} step="1" value={Number.isFinite(clip.start) ? Math.min(duration, clip.start) : 0} onChange={e => setStart(parts(Math.max(0, Math.min(Number(e.target.value), (Number.isFinite(clip.end) ? clip.end : duration) - 5))))} />
      <input type="range" aria-label="片段終點滑桿" min="0" max={duration} step="1" value={Number.isFinite(clip.end) ? Math.min(duration, clip.end) : duration} onChange={e => changeEnd(parts(Math.min(duration, Math.max(Number(e.target.value), (Number.isFinite(clip.start) ? clip.start : 0) + 5))))} />
    </div><div className="sc-trim-scale"><span>00:00</span><span>影片長度 {videoTime(duration)}</span></div></>}
    <div className="sc-trim-fields"><TimeField label="開始時間" value={start} onChange={setStart} /><TimeField label="結束時間" value={end} onChange={changeEnd} /></div>
    {valid ? <p className="sc-trim-summary" role="status">{videoTime(clip.start)} → {videoTime(clip.end)} · 共 {clip.end - clip.start} 秒</p> : <p className="sc-trim-error" role="alert">{message}</p>}
    <div className="sc-trim-actions"><button onClick={onCancel}>取消</button><button onClick={() => onApply(null)}>使用完整影片</button><button className="lh-primary" disabled={!valid} onClick={() => onApply(clip)}>套用修剪</button></div>
  </div>;
}
