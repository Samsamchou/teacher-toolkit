import React, { useEffect, useMemo, useRef, useState } from 'react';
import { embedUrl } from './domain.mjs';
import { videoSource } from './video.mjs';
import { VideoPlayer } from './VideoPlayer.jsx';
import { YouTubeTrim } from './YouTubeTrim.jsx';
import { UploadedVideo } from './UploadedVideo.jsx';
import { useMediaResource } from './useMediaResource.jsx';
import { ImageZoom } from './ImageZoom.jsx';
import { ImageSearch } from './ImageSearch.jsx';
import { saveAsset } from './media.mjs';
import { SlideRuns, SlideTextEditor } from './SlideText.jsx';
import { recordingFile, RECORDING_SECONDS } from './audio-recording.mjs';
import { canvasFor, clamp, FONT_PRESETS, SLIDE_THEMES, studentSize, textElement, themeFor } from './slide-canvas.mjs';
import './slide-canvas.css';

function CanvasAsset({ asset, zoom = false, block, room, onControl }) {
  const { url, error } = useMediaResource(asset?.id);
  if (!asset) return <p role="status">找不到這個素材。</p>;
  if (asset.kind === 'video' && block?.type === 'slide' && block.syncVideoId === asset.id) return <UploadedVideo asset={asset} room={room} onControl={onControl} />;
  if (!url) return <p role="status">{error || '載入素材…'}</p>;
  if (asset.kind === 'image') return zoom ? <ImageZoom url={url} name={asset.name} /> : <img src={url} alt={asset.name} draggable={false} />;
  if (asset.kind === 'audio') return <audio controls src={url} aria-label={asset.name} />;
  return <video controls playsInline src={url} aria-label={asset.name} />;
}
function EmbedMaterial({ url, trim, block, room, onControl, onPlaybackChange }) {
  let safe;
  try { safe = embedUrl(url); } catch (error) { return <p role="alert">{error.message}</p>; }
  const video = videoSource(url);
  if (video) return <VideoPlayer url={url} trim={trim} room={block?.type === 'slide' && block.embed === url ? room : undefined} onControl={block?.embed === url ? onControl : undefined} onPlaybackChange={onPlaybackChange} />;
  return <div className="sc-embed"><iframe title="外部教學簡報" src={safe} sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" allowFullScreen /><a href={url} target="_blank" rel="noopener noreferrer">無法顯示？開新分頁</a></div>;
}
function TextContent({ element, student = false }) {
  return <div className="sc-text" style={{ fontSize: student ? studentSize(element.size) : element.size, color: element.color, fontWeight: element.bold ? 700 : 400, textAlign: element.align || 'left' }}><SlideRuns element={element} student={student} /></div>;
}
export function SlideCanvasView({ block, canvas: supplied, room, onControl, onPlaybackChange, selected, onSelect, onPatchElement, textRef, focusId, frameRef, onTextSelection }) {
  const host = useRef(null), movement = useRef(null);
  const [scale, setScale] = useState(.65), [fullscreen, setFullscreen] = useState(false);
  const canvas = supplied || canvasFor(block), theme = themeFor(canvas.theme);
  const interactive = !!onSelect && !fullscreen;
  useEffect(() => {
    const element = host.current;
    const measure = () => { const full = document.fullscreenElement === element; const r = element.getBoundingClientRect(); setFullscreen(full); setScale(full ? Math.min(r.width / 1280, r.height / 720) : r.width / 1280); };
    const observer = new ResizeObserver(measure); observer.observe(element); document.addEventListener('fullscreenchange', measure); measure();
    if (frameRef) frameRef.current = element;
    return () => { observer.disconnect(); document.removeEventListener('fullscreenchange', measure); };
  }, []);
  function begin(event, element, resize = false) {
    if (!interactive || element.locked || event.button !== 0) return;
    event.preventDefault(); event.stopPropagation(); onSelect(element.id); event.currentTarget.setPointerCapture(event.pointerId);
    movement.current = { id: element.id, x: event.clientX, y: event.clientY, ox: element.x, oy: element.y, w: element.w, h: element.h, resize };
  }
  function move(event) {
    const m = movement.current; if (!m) return;
    const dx = (event.clientX - m.x) / (1280 * scale) * 100, dy = (event.clientY - m.y) / (720 * scale) * 100;
    onPatchElement(m.id, m.resize ? { w: clamp(m.w + dx, 4, 100 - m.ox), h: clamp(m.h + dy, 4, 100 - m.oy) } : { x: clamp(m.ox + dx, 0, 100 - m.w), y: clamp(m.oy + dy, 0, 100 - m.h) });
  }
  return <div ref={host} className={`sc-viewport ${fullscreen ? 'is-fullscreen' : ''}`}>
    {fullscreen && <button className="sc-exit" onClick={() => document.exitFullscreen()}>結束投影</button>}
    <div className="sc-stage" style={{ height: 720 * scale, width: 1280 * scale }}>
      <div className={`sc-canvas sc-theme-${theme.id}`} aria-label="教材投影片畫布" style={{ transform: `scale(${scale})`, '--sc-ink': theme.ink, '--sc-accent': theme.accent, background: theme.background }} onClick={event => { if (interactive && event.target === event.currentTarget) onSelect(''); }}>
        <div className="sc-decoration sc-decoration-top" aria-hidden="true" /><div className="sc-decoration sc-decoration-bottom" aria-hidden="true" />
        {!canvas.elements.length && interactive && <p className="sc-empty">從上方新增文字、圖片或影片，開始編排教材。</p>}
        {canvas.elements.map(element => <div key={element.id} data-element-id={element.id} data-element-kind={element.kind} data-annotation-anchor={element.id === 'legacy-title' ? 'title' : element.assetId ? `media-${element.assetId}` : `canvas-${element.id}`} className={`sc-object sc-kind-${element.kind} ${interactive && selected === element.id ? 'is-selected' : ''} ${element.locked ? 'is-locked' : ''}`}
          tabIndex={interactive ? 0 : undefined} aria-label={interactive ? `畫布物件 ${element.kind === 'text' ? '文字' : element.kind}` : undefined}
          style={{ left: `${element.x}%`, top: `${element.y}%`, width: `${element.w}%`, height: `${element.h}%`, zIndex: 2 + element.z, transform: `rotate(${element.rotation || 0}deg)`, color: element.color, fontSize: element.size, fontWeight: element.bold ? 700 : 400, textAlign: element.align || 'left' }}
          onClick={event => { if (interactive) { event.stopPropagation(); onSelect(element.id); } }}
          onFocus={() => { if (interactive && selected !== element.id) onSelect(element.id); }}
          onKeyDown={event => {
            if (!interactive || element.locked || event.target.isContentEditable || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Delete'].includes(event.key)) return;
            event.preventDefault(); if (event.key === 'Delete') return onPatchElement(element.id, null);
            const step = event.shiftKey ? 5 : 1;
            onPatchElement(element.id, { x: clamp(element.x + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0), 0, 100 - element.w), y: clamp(element.y + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0), 0, 100 - element.h) });
          }}>
          {element.kind === 'text' ? interactive && selected === element.id && !element.locked ? <SlideTextEditor key={element.id} ref={textRef} element={element} onSelection={onTextSelection} autofocus={focusId === element.id} onChange={values => onPatchElement(element.id, values)} /> : <TextContent element={element} /> : element.kind === 'embed' ? <EmbedMaterial url={element.url} trim={element.trim} block={block} room={room} onControl={onControl} onPlaybackChange={onPlaybackChange} /> : <CanvasAsset asset={block.media?.find(a => a.id === element.assetId)} block={block} room={room} onControl={onControl} />}
          {interactive && element.kind === 'embed' && selected !== element.id && <button className="sc-select-embed" aria-label="選取影片或簡報物件" onClick={event => { event.stopPropagation(); onSelect(element.id); }}><span>點選編排</span></button>}
          {interactive && selected === element.id && !element.locked && <><button className="sc-drag" aria-label="拖曳物件" title="拖曳移動；方塊內可選字" style={element.y < 4 ? { top: 4 } : undefined} onClick={event => event.stopPropagation()} onPointerDown={event => begin(event, element)} onPointerMove={move} onPointerUp={() => { movement.current = null; }} onPointerCancel={() => { movement.current = null; }}>移動 ↔</button><button className="sc-resize" aria-label="縮放物件" onClick={event => event.stopPropagation()} onPointerDown={event => begin(event, element, true)} onPointerMove={move} onPointerUp={() => { movement.current = null; }} onPointerCancel={() => { movement.current = null; }} /></>}
        </div>)}
      </div>
    </div>
  </div>;
}
export function CanvasQuestionStem({ block }) {
  const elements = block.questionCanvas.elements, images = elements.filter(e => e.kind === 'image'), copy = elements.filter(e => e.kind !== 'image');
  return <section className={`lh-canvas lh-question-stem lh-split-stem sc-question-stem ${images.length ? '' : 'sc-no-pictures'}`}>
    {images.length > 0 && <div className="lh-stem-pictures">{images.map(e => <div key={e.id}><CanvasAsset asset={block.media.find(a => a.id === e.assetId)} zoom /></div>)}</div>}
    <div className="lh-stem-copy"><h2>{block.title}</h2>{copy.map(e => <div key={e.id} className={`sc-question-${e.kind}`}>{e.kind === 'text' ? <TextContent element={e} student /> : e.kind === 'embed' ? <EmbedMaterial url={e.url} trim={e.trim} block={block} /> : <CanvasAsset asset={block.media.find(a => a.id === e.assetId)} />}</div>)}</div>
  </section>;
}
function Dialog({ title, onClose, children }) {
  const ref = useRef(null), previous = useRef(document.activeElement);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => { dialog.close(); previous.current?.focus?.(); }; }, []);
  return <dialog ref={ref} className="sc-dialog" aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }}><div className="sc-dialog-heading"><h3>{title}</h3><button aria-label="關閉視窗" onClick={onClose}>×</button></div>{children}</dialog>;
}
function AudioRecorder({ onFile, busy }) {
  const [state, setState] = useState('idle'), [seconds, setSeconds] = useState(0), [error, setError] = useState('');
  const stream = useRef(null), recorder = useRef(null), chunks = useRef([]), timer = useRef(null), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; clearInterval(timer.current); if (recorder.current?.state === 'recording') recorder.current.stop(); stream.current?.getTracks().forEach(track => track.stop()); }; }, []);
  async function start() {
    try {
      setError(''); if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('這個瀏覽器不支援錄音，請改用音檔上傳。');
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) { stream.current.getTracks().forEach(track => track.stop()); return; }
      chunks.current = []; const recording = new MediaRecorder(stream.current); recorder.current = recording;
      recording.ondataavailable = event => { if (event.data.size) chunks.current.push(event.data); };
      recording.onstop = async () => {
        clearInterval(timer.current); stream.current?.getTracks().forEach(track => track.stop());
        if (!alive.current) return;
        setState('processing');
        try { const file = await recordingFile(new Blob(chunks.current, { type: recording.mimeType })); if (alive.current) { await onFile(file); setState('idle'); } }
        catch (e) { if (alive.current) { setState('idle'); setError(e.message); } }
      };
      recording.onerror = () => { clearInterval(timer.current); stream.current?.getTracks().forEach(track => track.stop()); if (alive.current) { setState('idle'); setError('錄音中斷，請重試或上傳音檔。'); } };
      recording.start(); setSeconds(0); setState('recording'); const started = Date.now();
      timer.current = setInterval(() => { const elapsed = Math.floor((Date.now() - started) / 1000); setSeconds(elapsed); if (elapsed >= RECORDING_SECONDS && recording.state === 'recording') recording.stop(); }, 250);
    } catch (e) { stream.current?.getTracks().forEach(track => track.stop()); setError(e.name === 'NotAllowedError' ? '麥克風未獲允許；請自行在瀏覽器允許，或改用音檔上傳。' : e.message); }
  }
  return <div className="sc-record"><p>最多 10 分鐘；停止後會保存為可播放的音檔。</p><strong>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</strong><button disabled={busy || state === 'processing'} onClick={() => state === 'recording' ? recorder.current.stop() : start()}>{state === 'recording' ? '■ 停止並加入' : state === 'processing' ? '處理錄音…' : '● 開始錄音'}</button>{error && <p role="alert">{error}</p>}</div>;
}
export function SlideEditor({ block, onPatch, onAddAsset, onTheme, onConvert, onUndo, onRedo, canUndo, canRedo, types, onRestore, asStem = false }) {
  const canvas = useMemo(() => asStem ? structuredClone(block.questionCanvas) : canvasFor(block), [block, asStem]);
  const [selected, setSelected] = useState(''), [focusId, setFocusId] = useState(''), [dialog, setDialog] = useState(''), [imageTab, setImageTab] = useState('upload');
  const [status, setStatus] = useState(''), [busy, setBusy] = useState(false), [url, setUrl] = useState(''), [previewUrl, setPreviewUrl] = useState(''), [themeId, setThemeId] = useState(canvas.theme), [questionType, setQuestionType] = useState('choice');
  const [selectionStyle, setSelectionStyle] = useState(null);
  const [trimId, setTrimId] = useState('');
  const textRef = useRef(null), frameRef = useRef(null), active = canvas.elements.find(e => e.id === selected);
  function change(elements, extra = {}) { onPatch({ [asStem ? 'questionCanvas' : 'slideCanvas']: { ...canvas, elements }, ...(asStem ? {} : extra) }); }
  function patchElement(id, values) {
    const elements = values === null ? canvas.elements.filter(e => e.id !== id) : canvas.elements.map(e => e.id === id ? { ...e, ...values } : e);
    const removed = values === null && canvas.elements.find(e => e.id === id), extra = {};
    if (removed?.kind === 'embed' && removed.url === block.embed) extra.embed = elements.find(e => e.kind === 'embed' && videoSource(e.url))?.url || elements.find(e => e.kind === 'embed')?.url || '';
    if (removed?.kind === 'video' && removed.assetId === block.syncVideoId && !elements.some(e => e.kind === 'video' && e.assetId === removed.assetId)) extra.syncVideoId = '';
    change(elements, extra);
  }
  function addText() { if (canvas.elements.length >= 60) { setStatus('每張畫布最多 60 個物件。'); return; } const element = textElement(crypto.randomUUID(), '', canvas.elements.length); change([...canvas.elements, element]); setSelected(element.id); setFocusId(element.id); }
  function open(kind) { setDialog(kind); setStatus(''); setUrl(''); setPreviewUrl(''); setThemeId(canvas.theme); }
  async function upload(file) {
    if (!file) return;
    if (block.media.length >= 12 || canvas.elements.length >= 60) { const e = new Error('每頁最多 12 個媒體／60 個畫布物件。'); setStatus(e.message); throw e; }
    setBusy(true); setStatus('處理素材…');
    try { const asset = await saveAsset(file, { halfSize: false, onProgress: setStatus }); onAddAsset(asset); setStatus(asset.status === 'queued' ? '影片已排入轉檔，可繼續備課。' : '已加入畫布。'); }
    catch (e) { setStatus(e.message); throw e; }
    finally { setBusy(false); }
  }
  async function pasteImage(event) { const file = [...(event.clipboardData?.files || [])].find(f => f.type.startsWith('image/')); if (file) { event.preventDefault(); await upload(file).catch(() => {}); } }
  async function imageLink() {
    try {
      const input = new URL(url); if (input.protocol !== 'https:' || input.username || input.password) throw new Error('請使用完整 HTTPS 圖片連結。');
      setBusy(true); setStatus('讀取圖片…'); const response = await fetch(input.href, { credentials: 'omit', signal: AbortSignal.timeout(20000) });
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error('連結不是可下載的圖片，請改用上傳。');
      const blob = await response.blob(); await upload(new File([blob], 'linked-image', { type: blob.type }));
    } catch (e) { setStatus(e.message === 'Failed to fetch' ? '來源網站不允許讀取，請下載圖片後上傳。' : e.message); } finally { setBusy(false); }
  }
  function addEmbed() {
    try {
      embedUrl(url); const video = videoSource(url);
      const oldVideos = canvas.elements.filter(e => e.kind === 'video' || (e.kind === 'embed' && videoSource(e.url)));
      if (video && oldVideos.length && !window.confirm('這張已有影片。新影片將取代畫布上的影片；原素材仍保留。')) return;
      const elements = video ? canvas.elements.filter(e => e.kind !== 'video' && !(e.kind === 'embed' && videoSource(e.url))) : canvas.elements;
      const id = crypto.randomUUID();
      change([...elements, { id, kind: 'embed', url: url.trim(), x: 10, y: 20, w: 80, h: 70, z: elements.length }], { embed: video || !videoSource(block.embed) ? url.trim() : block.embed, ...(video ? { syncVideoId: '' } : {}) }); setSelected(id);
      if (video?.provider === 'youtube') { setTrimId(id); setStatus(''); setDialog('trim'); } else setDialog('');
    } catch (e) { setStatus(e.message); }
  }
  function applyTrim(trim) {
    const target = canvas.elements.find(e => e.id === trimId), source = videoSource(target?.url);
    // Copies of the same video use the same range as the classroom source.
    change(canvas.elements.map(e => {
      if (e.kind !== 'embed' || videoSource(e.url)?.id !== source?.id) return e;
      const { trim: previous, ...original } = e;
      return trim ? { ...original, trim } : original;
    }));
    setDialog(''); setStatus(trim ? '已套用影片片段。' : '已使用完整影片。');
  }
  return <section className="sc-editor" onPaste={pasteImage}>
    <div className="sc-heading"><div><span>{asStem ? '題幹教材' : '教材投影片'}</span><h2>{asStem ? '編輯帶入的教材' : '在畫布上編排教材'}</h2></div><button onClick={() => frameRef.current?.requestFullscreen?.().catch(() => setStatus('無法開啟全螢幕，請使用學生預覽。'))}>投影預覽</button></div>
    <div className="sc-toolbar" aria-label="投影片功能列">
      <button onClick={addText}>A 新增文字</button><button onClick={() => open('image')}>▧ 圖片</button><button onClick={() => open('audio')}>♫ 音檔</button><button onClick={() => open('video')}>▶ 影片／簡報</button><button onClick={() => open('theme')}>◈ 主題</button>
      <span className="sc-toolbar-gap" /><button disabled={!canUndo} onClick={onUndo}>↶ 復原</button><button disabled={!canRedo} onClick={onRedo}>↷ 重做</button>{!asStem && <button onClick={() => open('convert')}>轉成題目</button>}
    </div>
    <div className="sc-formatbar" aria-label="文字與物件工具列">
      <span className="sc-font-name">Comic Relief</span>
      <label>字級<select aria-label="畫布文字字級" disabled={active?.kind !== 'text' || active.locked} value={FONT_PRESETS.some(p => p.teacher === (selectionStyle?.size ?? active?.size)) ? (selectionStyle?.size ?? active.size) : 48} onChange={e => textRef.current?.format({ size: Number(e.target.value) })}>{FONT_PRESETS.map(p => <option key={p.teacher} value={p.teacher}>{p.label} · {p.teacher}px</option>)}</select></label>
      <label className="sc-color-label">文字色<input aria-label="畫布文字顏色" type="color" disabled={active?.kind !== 'text' || active.locked} value={selectionStyle?.color || active?.color || themeFor(canvas.theme).ink} onChange={e => textRef.current?.format({ color: e.target.value })} /></label>
      <button aria-label="粗體文字" aria-pressed={!!(selectionStyle?.bold ?? active?.bold)} disabled={active?.kind !== 'text' || active.locked} onMouseDown={e => e.preventDefault()} onClick={() => textRef.current?.toggleBold()}><b>B</b> 粗體</button>
      {active?.kind === 'text' && <label>對齊<select aria-label="畫布文字對齊" disabled={active.locked} value={active.align || 'left'} onChange={e => patchElement(active.id, { align: e.target.value })}><option value="left">靠左</option><option value="center">置中</option><option value="right">靠右</option></select></label>}
      {active?.kind === 'embed' && videoSource(active.url)?.provider === 'youtube' && <button disabled={active.locked} onClick={() => { setTrimId(active.id); setStatus(''); setDialog('trim'); }}>✂ 修剪影片</button>}
      <span className="sc-toolbar-gap" />
      <button disabled={!active} onClick={() => { const duplicate = { ...structuredClone(active), id: crypto.randomUUID(), x: clamp(active.x + 3, 0, 100 - active.w), y: clamp(active.y + 3, 0, 100 - active.h), z: Math.min(100, canvas.elements.length), locked: false }; change([...canvas.elements, duplicate]); setSelected(duplicate.id); }}>複製物件</button>
      <button disabled={!active} onClick={() => patchElement(active.id, { locked: !active.locked })}>{active?.locked ? '解鎖物件' : '鎖定物件'}</button><button disabled={!active || active.locked} onClick={() => { patchElement(active.id, null); setSelected(''); }}>刪除物件</button>
    </div>
    <p className="sc-hint">選字後可改色、加粗或字級；未選字時套用整個文字方塊。拖曳「移動 ↔」調整位置，右下角調整大小。</p>
    {asStem && <p className="sc-hint">學生題幹會自動排版，並使用 22–32px 的閱讀字級；可按上方「學生預覽」確認。</p>}
    <SlideCanvasView key={block.id} block={block} canvas={canvas} selected={selected} onSelect={id => { if (id !== selected) setSelectionStyle(null); setSelected(id); }} onPatchElement={patchElement} textRef={textRef} focusId={focusId} frameRef={frameRef} onTextSelection={style => setSelectionStyle(current => JSON.stringify(current) === JSON.stringify(style) ? current : style)} />
    {active && <details className="sc-object-settings"><summary>物件位置與圖層</summary><div className="sc-settings-row">{[['x', '水平位置', 0, 100 - active.w], ['y', '垂直位置', 0, 100 - active.h], ['w', '寬度', 4, 100 - active.x], ['h', '高度', 4, 100 - active.y], ['rotation', '旋轉', -180, 180], ['z', '圖層', 0, 100]].map(([key, label, min, max]) => <label key={key}>{label}<input type="number" aria-label={`物件${label}`} disabled={active.locked} value={Math.round((active[key] || 0) * 10) / 10} min={min} max={max} onChange={e => patchElement(active.id, { [key]: clamp(Number(e.target.value), min, max) })} /></label>)}</div></details>}
    {!asStem && <details className="sc-page-settings"><summary>頁面名稱、備註與原稿</summary><label>頁面名稱（清單用）<input value={block.title} onChange={e => onPatch({ title: e.target.value, slideCanvas: canvas })} /></label><label>教師私有備註<textarea value={block.notes || ''} onChange={e => onPatch({ notes: e.target.value })} /></label>{canvas.original && <button onClick={() => { if (window.confirm('還原第一次使用新畫布前的教材內容與配置？目前編輯可透過復原返回。')) onRestore(); }}>還原原稿</button>}</details>}
    {status && <p className="sc-status" role="status">{status}</p>}
    {dialog && <Dialog title={({ image: '新增圖片', audio: '插入音檔', video: '插入影片／簡報', trim: '修剪 YouTube 影片', theme: '更新主題', convert: '轉成題目副本' })[dialog]} onClose={() => { if (!busy) setDialog(''); }}>
      {dialog === 'trim' && canvas.elements.some(e => e.id === trimId) && <YouTubeTrim key={trimId} element={canvas.elements.find(e => e.id === trimId)} onApply={applyTrim} onCancel={() => setDialog('')} />}
      {dialog === 'image' && <><div className="sc-tabs" role="tablist" aria-label="圖片來源">{[['upload', '上傳'], ['search', '搜尋'], ['paste', '貼上圖片']].map(([id, label]) => <button role="tab" aria-selected={imageTab === id} key={id} onClick={() => setImageTab(id)}>{label}</button>)}</div>
        {imageTab === 'upload' && <div className="sc-upload" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); upload(e.dataTransfer.files[0]).catch(() => {}); }}><p>拖放圖片，或從電腦選擇</p><label>上傳圖片<input aria-label="上傳畫布圖片" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e => upload(e.target.files[0]).catch(() => {})} /></label><small>PNG／JPG／WebP，最多 20 MB；保留原檔。</small></div>}
        {imageTab === 'search' && <ImageSearch inline halfSize={false} onAdd={asset => { onAddAsset(asset); setStatus('圖片已加入畫布。'); }} />}
        {imageTab === 'paste' && <div className="sc-upload"><p>複製圖片後按 Ctrl＋V，也可貼上公開圖片網址。</p><input aria-label="圖片網址" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" /><button disabled={busy || !url.trim()} onClick={imageLink}>讀取並加入</button></div>}</>}
      {dialog === 'audio' && <><label className="sc-upload">上傳 MP3／WAV<input aria-label="上傳畫布音檔" type="file" accept="audio/mpeg,audio/wav,audio/x-wav" disabled={busy} onChange={e => upload(e.target.files[0]).catch(() => {})} /></label><AudioRecorder onFile={upload} busy={busy} /></>}
      {dialog === 'video' && <><label className="sc-upload">上傳 MP4 影片<input aria-label="上傳畫布影片" type="file" accept="video/mp4,video/webm" disabled={busy} onChange={e => upload(e.target.files[0]).catch(() => {})} /></label><p>影片最多 5 分鐘／100 MB，沿用教師播放、暫停與進度同步。</p><label>影片或簡報連結<input aria-label="畫布影片或簡報連結" value={url} onChange={e => { setUrl(e.target.value); setPreviewUrl(''); }} placeholder="YouTube／Canva／Google Slides 的 HTTPS 連結" /></label><p>Canva 請用檢視連結；Google Slides 建議用「發布到網路」連結。私人連結需先由你設定觀看權限。</p><div className="sc-settings-row"><button disabled={!url.trim()} onClick={() => { try { embedUrl(url); setPreviewUrl(url); setStatus(''); } catch (e) { setStatus(e.message); } }}>預覽連結</button><button disabled={busy || !url.trim()} onClick={addEmbed}>加入畫布</button></div>{previewUrl && <div className="sc-link-preview"><EmbedMaterial url={previewUrl} block={block} /></div>}</>}
      {dialog === 'theme' && <><div className="sc-theme-picker">{SLIDE_THEMES.map(t => <button key={t.id} aria-pressed={themeId === t.id} onClick={() => setThemeId(t.id)}><div className={`sc-theme-swatch sc-theme-${t.id}`} style={{ '--sc-accent': t.accent, color: t.ink, background: t.background }}><span className="sc-decoration sc-decoration-top" /><b>Aa</b><span className="sc-decoration sc-decoration-bottom" /></div>{t.name}</button>)}</div><p>保留文字、物件位置與手動設定的顏色。</p><div className="sc-settings-row"><button onClick={() => { onTheme(themeId, false); setDialog(''); }}>套用這張投影片</button>{!asStem && <button onClick={() => { onTheme(themeId, true); setDialog(''); }}>套用本堂所有教材投影片</button>}</div></>}
      {dialog === 'convert' && <><p>建立題目副本，原投影片保留。文字與素材會帶入學生題幹，字級自動調整；新題先隱藏，完成正解與選項後再顯示。</p><label>目標題型<select aria-label="轉換目標題型" value={questionType} onChange={e => setQuestionType(e.target.value)}>{Object.entries(types).filter(([id]) => id !== 'slide').map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><button onClick={() => { onConvert(questionType); setDialog(''); }}>建立題目副本</button></>}
      {status && <p role="status">{status}</p>}
    </Dialog>}
  </section>;
}
