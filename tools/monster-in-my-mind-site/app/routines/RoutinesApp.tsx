/* eslint-disable jsx-a11y/media-has-caption -- Station clips carry burned-in karaoke captions; the learner's own recording has no authored captions. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { callCloud, studentLogin } from '../services/firebase'
import { normalizeRecording, base64Audio } from '../utils/recording'
import { ASSET, MAP_POS, STATIONS, WORLD_CLOCK, charSrc, questionParts, shuffled, type Hero, type Station } from './content'
import './routines.css'

type StationState = { answered: boolean; gameDone: boolean; stars: number; score: number | null }
type Progress = Record<string, StationState>
type Step = 'meet' | 'puzzle' | 'answer' | 'reveal' | 'video' | 'game' | 'stamp'
type SpeakResult = { transcript: string; accuracy: number; fluency: number; completeness: number; total_score: number; feedback: string; timeCorrect: boolean; passed: boolean; remaining: number }
const VEHICLE: Record<string, string> = { ship: 'ship', plane: 'plane', train: 'train', home: 'plane' }
const TRAVEL_WORD: Record<string, string> = { ship: 'by ship', plane: 'by plane', train: 'by train', home: '' }
const message = (e: unknown) => e instanceof Error ? e.message : 'Please try again. / 請再試一次。'

const store = { get: (k: string) => { try { return localStorage.getItem(k) } catch { return null } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* private window: just not remembered */ } } }

// Opening music: starts on the first tap (browsers block sound before that), fades out when the map opens, goes quiet under spoken English.
const music = (() => {
  let el: HTMLAudioElement | null = null, timer: ReturnType<typeof setInterval> | null = null, wanted = false, ducked = false
  let muted = store.get('wr-muted') === '1'
  const FULL = 0.5, LOW = 0.12
  const fadeTo = (target: number, ms: number, then?: () => void) => {
    if (!el) return
    if (timer) clearInterval(timer)
    const a = el, from = a.volume, t0 = Date.now()
    timer = setInterval(() => { const u = Math.min(1, (Date.now() - t0) / ms); a.volume = from + (target - from) * u; if (u >= 1) { clearInterval(timer!); timer = null; then?.() } }, 40)
  }
  const level = () => ducked ? LOW : FULL
  return {
    get muted() { return muted },
    start() { wanted = true; if (muted) return; if (!el) { el = new Audio(`${ASSET}/music/opening.mp3`); el.loop = true; el.volume = 0 } void el.play().then(() => fadeTo(level(), 600)).catch(() => {}) },
    stop() { wanted = false; if (el && !el.paused) fadeTo(0, 1500, () => el?.pause()) },
    duck(on: boolean) { ducked = on; if (el && !el.paused && wanted) fadeTo(level(), 250) },
    setMuted(on: boolean) { muted = on; store.set('wr-muted', on ? '1' : '0'); if (on) { if (timer) clearInterval(timer); el?.pause() } else if (wanted) this.start() },
  }
})()

function play(src: string): Promise<void> {
  return new Promise(resolve => {
    const audio = new Audio(src), done = () => { music.duck(false); resolve() }
    music.duck(true)
    audio.onended = done; audio.onerror = done
    audio.play().catch(done)
  })
}

function MuteButton() {
  const [muted, setMuted] = useState(music.muted)
  return <button className="wr-chip wr-mute" aria-pressed={muted} aria-label={muted ? 'Turn the music on / 開啟配樂' : 'Turn the music off / 關閉配樂'}
    onClick={() => { music.setMuted(!muted); setMuted(!muted) }}>{muted ? '🔇' : '🔊'} Music</button>
}

function Login({ onStart, hero, onHero }: { onStart: (studentId: string) => Promise<void>; hero: Hero; onHero: (h: Hero) => void }) {
  const [studentId, setStudentId] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const valid = /^(501|502|601|602)[0-9]{1,9}$/.test(studentId.trim())
  return <main className="wr-login" onPointerDown={() => music.start()}>
    <div className="wr-corner"><MuteButton /></div>
    <img src={`${ASSET}/art/passport.png`} alt="" />
    <h1>World Routines Trip</h1>
    <p>世界作息之旅 · What time do you …?</p>
    <form onSubmit={e => { e.preventDefault(); if (!valid || busy) return; setBusy(true); setError(''); onStart(studentId.trim()).catch(x => { setError(message(x)); setBusy(false) }) }}>
      <fieldset className="wr-heroes"><legend>Choose your traveller / 選主角</legend>
        {(['girl', 'boy'] as Hero[]).map(h => <button type="button" key={h} className="wr-hero-card" aria-pressed={hero === h} disabled={busy} onClick={() => onHero(h)}>
          <img src={`${ASSET}/art3d/hero_${h}.png`} alt="" /><span>{h === 'girl' ? 'Girl 女生' : 'Boy 男生'}</span></button>)}
      </fieldset>
      <label>Student ID / 學號
        <input inputMode="numeric" autoComplete="off" maxLength={12} placeholder="60130" value={studentId} disabled={busy} onChange={e => setStudentId(e.target.value)} />
      </label>
      <button className="wr-big" disabled={!valid || busy}>{busy ? 'Boarding… 登機中' : 'Start the trip! 出發'}</button>
    </form>
    {error && <p role="alert" className="wr-error">{error}</p>}
  </main>
}

function WorldMap({ progress, current, onOpen, travelling, openAll, hero, onEnding }: { progress: Progress; current: Station | null; onOpen: (s: Station) => void; travelling: { from: Station; to: Station } | null; openAll: boolean; hero: Hero; onEnding: () => void }) {
  const [clock, setClock] = useState(false)
  const done = STATIONS.filter(s => progress[s.id]?.gameDone).length
  const vehicle = travelling ? VEHICLE[travelling.to.transport] : null
  const [moved, setMoved] = useState(false)
  useEffect(() => { if (!travelling) return; const t = setTimeout(() => setMoved(true), 60); return () => { clearTimeout(t); setMoved(false) } }, [travelling])
  const at = travelling ? MAP_POS[(moved ? travelling.to : travelling.from).id] : null
  // The traveller stands in the country she or he has reached: the last finished station, or Taiwan before the trip starts.
  const here = [...STATIONS].reverse().find(s => progress[s.id]?.gameDone) ?? STATIONS[0]
  return <main className="wr-map-page">
    <header className="wr-topbar">
      <strong>🌍 World Routines Trip</strong>
      <span className="wr-stamps" aria-label={`${done} of 10 stamps`}>{STATIONS.map(s => <i key={s.id} className={progress[s.id]?.gameDone ? 'on' : ''} />)}</span>
      <button className="wr-chip" onClick={() => setClock(x => !x)}>🕐 World Clock</button>
      <MuteButton />
    </header>
    <div className="wr-map">
      <img className="wr-map-img" src={`${ASSET}/art/world_map.jpg`} alt="World map" />
      <svg className="wr-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {STATIONS.slice(1).map((s, i) => { const a = MAP_POS[STATIONS[i].id], b = MAP_POS[s.id]
          return <line key={s.id} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className={progress[STATIONS[i].id]?.gameDone ? 'done' : ''} /> })}
      </svg>
      {STATIONS.map(s => {
        const state = progress[s.id], open = openAll || s.id === current?.id || state?.gameDone
        return <button key={s.id} className={`wr-pin${state?.gameDone ? ' done' : ''}${s.id === current?.id ? ' current' : ''}`} disabled={!open || Boolean(travelling)}
          style={{ left: `${MAP_POS[s.id][0]}%`, top: `${MAP_POS[s.id][1]}%` }} onClick={() => onOpen(s)}>
          <b>{state?.gameDone ? '★' : s.order}</b><span>{s.country}</span>
        </button>
      })}
      {!travelling && <img className="wr-hero-pin" src={`${ASSET}/art3d/hero_${hero}_map.png`} alt="You are here" style={{ left: `${MAP_POS[here.id][0]}%`, top: `${MAP_POS[here.id][1]}%` }} />}
      {vehicle && at && <img className="wr-vehicle" src={`${ASSET}/art3d/hero_${hero}_${vehicle}.png`} alt="" style={{ left: `${at[0]}%`, top: `${at[1]}%`,
        transform: `translate(-50%,-60%) scaleX(${MAP_POS[travelling!.to.id][0] < MAP_POS[travelling!.from.id][0] ? -1 : 1})` }} />}
      {travelling && <p className="wr-travel-note" role="status">Going to {travelling.to.country} {TRAVEL_WORD[travelling.to.transport]}…</p>}
    </div>
    {clock && <aside className="wr-clock-panel"><h2>When it is 7:00 a.m. in Taiwan…</h2>
      <ul>{STATIONS.map(s => <li key={s.id}><b>{s.country}</b><span>{WORLD_CLOCK[s.id]}</span></li>)}</ul>
      <button className="wr-chip" onClick={() => setClock(false)}>Close 關閉</button></aside>}
    {done === STATIONS.length && <section className="wr-finish" role="status"><h2>🎉 You did it! 環遊世界完成！</h2><p>10 stamps · {STATIONS.reduce((n, s) => n + (progress[s.id]?.stars ?? 0), 0)} ★</p>
      <button className="wr-chip" onClick={onEnding}>🎬 Watch the trip again 再看一次回顧</button></section>}
    {!travelling && current && done < STATIONS.length && <p className="wr-hint-line">Tap <b>{current.order} {current.country}</b> to travel. 點地圖上的下一站出發。</p>}
  </main>
}

function DragAnswer({ station, onPassed }: { station: Station; onPassed: () => void }) {
  const parts = useMemo(() => questionParts(station), [station])
  const chips = useMemo(() => shuffled([...station.drag!.slots, ...station.drag!.distractors], station.order * 97 + 13), [station])
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null]), [code, setCode] = useState('')
  const [busy, setBusy] = useState(false), [note, setNote] = useState(''), [drag, setDrag] = useState<{ word: string; x: number; y: number } | null>(null)
  const used = (word: string) => slots.includes(word)
  const place = (word: string, index?: number) => setSlots(old => {
    const next = old.map(x => x === word ? null : x), target = index ?? next.indexOf(null)
    if (target < 0) return old
    next[target] = word; return next
  })
  function drop(x: number, y: number, word: string) {
    const el = document.elementFromPoint(x, y)?.closest('[data-slot]') as HTMLElement | null
    if (el) place(word, Number(el.dataset.slot))
  }
  async function submit() {
    setBusy(true); setNote('')
    try {
      const r = await callCloud<{ slotsCorrect: boolean; codeCorrect: boolean; passed: boolean }>('routinesAnswer', { station: station.id, slots, code })
      if (r.passed) return onPassed()
      setNote(!r.slotsCorrect && !r.codeCorrect ? 'Check the words and the code. 單字和密碼都再看一次。' : !r.slotsCorrect ? 'The code is right! Check the words. 密碼對了，單字再想想。' : 'The words are right! Check the code. 單字對了，密碼再解一次。')
    } catch (e) { setNote(message(e)) } finally { setBusy(false) }
  }
  const ready = slots.every(Boolean) && /^\d{4}$/.test(code)
  return <section className="wr-answer">
    <h2>Drag the words. Then type the code. <small>把單字拖進框框，再輸入密碼。</small></h2>
    <p className="wr-sentence">{parts.map((part, i) => 'blank' in part
      ? <button key={i} data-slot={part.blank} className={`wr-slot${slots[part.blank] ? ' filled' : ''}`} onClick={() => setSlots(old => old.map((x, j) => j === part.blank ? null : x))}>{slots[part.blank] ?? ' '}</button>
      : <span key={i}>{part.text}</span>)}</p>
    <div className="wr-chips">{chips.map(word => <button key={word} className="wr-word" disabled={used(word)}
      onClick={() => place(word)}
      onPointerDown={e => { if (used(word)) return; e.currentTarget.setPointerCapture(e.pointerId); setDrag({ word, x: e.clientX, y: e.clientY }) }}
      onPointerMove={e => { if (drag?.word === word) setDrag({ word, x: e.clientX, y: e.clientY }) }}
      onPointerUp={e => { if (drag?.word === word) { drop(e.clientX, e.clientY, word); setDrag(null) } }}
      onPointerCancel={() => setDrag(null)}>{word}</button>)}</div>
    {drag && <div className="wr-word wr-ghost" style={{ left: drag.x, top: drag.y }}>{drag.word}</div>}
    <p className="wr-sentence wr-reply">{station.display.replace(/ at .*$/, ' at ')}
      <span className="wr-code">{[0, 1, 2, 3].map(i => <i key={i}>{code[i] ?? ''}{i === 1 && <em>:</em>}</i>)}</span></p>
    <div className="wr-keys">{['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0'].map(k => <button key={k} onClick={() => setCode(c => k === '⌫' ? c.slice(0, -1) : (c + k).slice(0, 4))}>{k}</button>)}</div>
    <button className="wr-big" disabled={!ready || busy} onClick={() => void submit()}>{busy ? 'Checking… 檢查中' : 'Check 送出'}</button>
    {note && <p role="status" className="wr-note">{note}</p>}
  </section>
}

function SpeakAnswer({ station, onPassed, startRemaining }: { station: Station; onPassed: (score: number) => void; startRemaining: number }) {
  const [phase, setPhase] = useState<'idle' | 'starting' | 'recording' | 'preparing' | 'sending'>('idle')
  const [clip, setClip] = useState<{ blob: Blob; url: string; id: string } | null>(null), [result, setResult] = useState<SpeakResult | null>(null)
  const [error, setError] = useState(''), [remaining, setRemaining] = useState(startRemaining)
  const recorder = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null), alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false; if (timer.current) clearTimeout(timer.current); if (recorder.current?.state === 'recording') recorder.current.stop(); stream.current?.getTracks().forEach(t => t.stop()) } }, [])
  useEffect(() => () => { if (clip) URL.revokeObjectURL(clip.url) }, [clip])
  const fail = (e: unknown) => { if (alive.current) { setError(message(e)); setPhase('idle') } }
  async function start() {
    if (phase !== 'idle' || remaining < 1) return
    setPhase('starting'); setError(''); setResult(null)
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('Microphone needs HTTPS and a new browser. / 請使用 HTTPS 與新版瀏覽器。')
      const input = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false })
      if (!alive.current) { input.getTracks().forEach(t => t.stop()); return }
      stream.current = input
      const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(x => MediaRecorder.isTypeSupported(x))
      const rec = new MediaRecorder(input, mime ? { mimeType: mime } : undefined), chunks: Blob[] = []
      recorder.current = rec
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
      rec.onerror = () => { input.getTracks().forEach(t => t.stop()); fail(new Error('Recording failed. / 錄音失敗，請重試。')) }
      rec.onstop = async () => {
        input.getTracks().forEach(t => t.stop()); if (timer.current) clearTimeout(timer.current)
        if (!alive.current) return
        setPhase('preparing')
        try { const blob = await normalizeRecording(new Blob(chunks, { type: rec.mimeType })); if (alive.current) { setClip({ blob, url: URL.createObjectURL(blob), id: crypto.randomUUID() }); setPhase('idle') } } catch (e) { fail(e) }
      }
      rec.start(); setPhase('recording')
      timer.current = setTimeout(() => { if (rec.state === 'recording') rec.stop() }, 15000)
    } catch (e) { stream.current?.getTracks().forEach(t => t.stop()); fail(e) }
  }
  async function send() {
    if (!clip || phase !== 'idle') return
    setPhase('sending'); setError('')
    try {
      const r = await callCloud<SpeakResult>('scoreRoutineSpeaking', { station: station.id, attemptId: clip.id, audio: await base64Audio(clip.blob) })
      if (!alive.current) return
      setResult(r); setRemaining(r.remaining); setClip(null); setPhase('idle')
    } catch (e) { fail(e) }
  }
  return <section className="wr-answer">
    <h2>Say the whole sentence in English. <small>解出時間後，用英文說出完整句子。</small></h2>
    <p className="wr-sentence wr-reply">{station.display.replace(/ at .*$/, ' at ')}<span className="wr-code wr-ask">? ? : ? ?</span></p>
    <div className="wr-record">
      {phase === 'recording' ? <button className="wr-big wr-stop" onClick={() => recorder.current?.stop()}>■ Stop 完成錄音</button>
        : <button className="wr-big" disabled={phase !== 'idle' || remaining < 1} onClick={() => void start()}>🎙 Record 錄音</button>}
      <span role="status">{phase === 'recording' ? 'Recording… 最多 15 秒' : phase === 'preparing' ? 'Preparing… 處理錄音中' : phase === 'sending' ? 'AI is listening… AI 評分中' : ''}</span>
    </div>
    {clip && <div className="wr-review"><audio controls src={clip.url} aria-label="My recording / 我的錄音" />
      <button className="wr-big" disabled={phase !== 'idle'} onClick={() => void send()}>Send 送出評分</button></div>}
    <p className="wr-small">85 to pass, and the time must be right. · {remaining} left today<br />85 分以上而且時間要說對才過關，今天還可以評 {remaining} 次。</p>
    {error && <p role="alert" className="wr-error">{error}</p>}
    {result && <div className={`wr-score${result.passed ? ' pass' : ''}`} role="status">
      <strong>{result.passed ? '🌟 Passed! 通過！' : 'Try again! 再試一次'} {result.total_score}/100</strong>
      <p>AI heard / AI 聽到：{result.transcript}</p>
      <p>{result.timeCorrect ? '✅ The time is right. 時間正確' : '❌ The time is not right. 時間不對，再解一次謎題或再說一次。'}</p>
      <dl><div><dt>Accuracy 精準</dt><dd>{result.accuracy}</dd></div><div><dt>Fluency 流暢</dt><dd>{result.fluency}</dd></div><div><dt>Complete 完整</dt><dd>{result.completeness}</dd></div></dl>
      <p>{result.feedback}</p>
      {result.passed && <button className="wr-big" onClick={() => onPassed(result.total_score)}>Next 下一步 →</button>}
    </div>}
  </section>
}

function StationFlow({ station, state, remaining, onUpdate, onExit, hero }: { station: Station; state: StationState | undefined; remaining: number; onUpdate: (p: Progress) => void; onExit: () => void; hero: Hero }) {
  const [step, setStep] = useState<Step>(state?.answered ? 'reveal' : 'meet')
  const [stage, setStage] = useState<'puzzle' | 'hint1' | 'hint2' | 'answer'>('puzzle')
  const [line, setLine] = useState(-1), [videoOk, setVideoOk] = useState(true), [videoEnded, setVideoEnded] = useState(false), [gameMissing, setGameMissing] = useState(false)
  const [saving, setSaving] = useState(false), [error, setError] = useState('')
  const char = charSrc(station.id)
  // When this pupil first entered the station on this device (kept across reloads until the stamp), for the teacher's 'minutes' column.
  const startKey = `wr-start-${station.id}`
  useEffect(() => { if (!state?.gameDone && !store.get(startKey)) store.set(startKey, String(Date.now())) }, [startKey, state?.gameDone])
  const [heard, setHeard] = useState(false), [asking, setAsking] = useState(false)
  const ask = async () => { if (asking) return; setAsking(true); await play(`${ASSET}/audio/${station.id}-q.mp3`); setAsking(false); setHeard(true) }
  const lines = useMemo(() => [station.spoken, ...station.extended], [station])
  const playing = useRef(false)
  const speakLines = useCallback(async () => {
    if (playing.current) return
    playing.current = true
    for (let i = 0; i < lines.length; i++) { setLine(i); await play(`${ASSET}/audio/${station.id}-${i === 0 ? 'a' : 'x' + i}.mp3`) }
    setLine(lines.length); playing.current = false
  }, [lines, station.id])
  const finishGame = useCallback(async (stars: number, score: number) => {
    setSaving(true); setError('')
    try { const t0 = Number(store.get(startKey)), minutes = t0 > 0 ? Math.round((Date.now() - t0) / 6000) / 10 : undefined; const r = await callCloud<{ stations: Progress }>('routinesGameDone', { station: station.id, stars, score, minutes }); store.set(startKey, ''); onUpdate(r.stations); setStep('stamp') }
    catch (e) { setError(message(e)) } finally { setSaving(false) }
  }, [station.id, onUpdate, startKey])
  useEffect(() => {
    if (step !== 'game') return
    const listen = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.channel !== 'world-routines' || e.data?.type !== 'game-done') return
      void finishGame(Number.isInteger(e.data.stars) ? e.data.stars : 1, Number.isFinite(e.data.score) ? e.data.score : 0)
    }
    window.addEventListener('message', listen); return () => window.removeEventListener('message', listen)
  }, [step, finishGame])
  useEffect(() => {
    if (step !== 'game') return
    // A missing file is answered with the site's own index.html (status 200), so look for the game's script instead.
    fetch(`${ASSET}/games/${station.game}/index.js`, { method: 'HEAD' }).then(r => { if (!r.ok || !(r.headers.get('content-type') ?? '').includes('javascript')) setGameMissing(true) }).catch(() => setGameMissing(true))
  }, [step, station.game])
  const cardUrl = (s: string) => `${ASSET}/cards.html?type=${station.puzzle}&ans=${station.code}&stage=${s}`
  return <main className="wr-station">
    <header className="wr-topbar"><button className="wr-chip" onClick={onExit}>← Map 地圖</button><strong>{station.order}. {station.country}</strong>
      <span className="wr-steps">{(['meet', 'puzzle', 'answer', 'reveal', 'video', 'game', 'stamp'] as Step[]).map(s => <i key={s} className={s === step ? 'on' : ''} />)}</span></header>
    {step === 'meet' && <section className="wr-meet">
      <img className="wr-char wr-hero" src={`${ASSET}/art3d/hero_${hero}.png`} alt="You, the traveller" />
      <div className="wr-bubbles">
        <p className="wr-bubble me">{station.question}
          <button className={`wr-speaker${heard ? '' : ' wr-listen-first'}`} aria-label="Listen to the question / 聽問句" disabled={asking} onClick={() => void ask()}>🔊</button>
          {!heard && <em className="wr-listen-tip">{asking ? 'Listening… 聽完就可以打開謎題' : '← 先聽問句 Listen first'}</em>}</p>
        <p className="wr-bubble you">{station.display.replace(/ at .*$/, ' at ')}<b>? ? : ? ?</b> Solve my puzzle! <small>解開我的謎題就知道！</small></p>
        <button className="wr-big" disabled={!heard} onClick={() => setStep('puzzle')}>Open the puzzle 打開謎題 →</button>
      </div>
      <img className="wr-char" src={char} alt={`A pupil from ${station.country}`} />
    </section>}
    {step === 'puzzle' && <section className="wr-puzzle">
      <iframe title="Number puzzle" src={cardUrl(stage)} />
      <div className="wr-row">
        <button className="wr-chip" disabled={stage !== 'puzzle'} onClick={() => setStage('hint1')}>💡 Hint 1</button>
        <button className="wr-chip" disabled={stage !== 'hint1'} onClick={() => setStage('hint2')}>💡 Hint 2</button>
        <button className="wr-chip" disabled={stage !== 'hint2'} onClick={() => setStage('answer')}>👀 Answer 看答案</button>
        <button className="wr-big" onClick={() => setStep('answer')}>I got it! 我解出來了 →</button>
      </div>
    </section>}
    {step === 'answer' && <>
      <p className="wr-bubble me wr-q">{station.mode === 'speak' ? station.question : 'What time …?'} <button className="wr-speaker" aria-label="Listen" onClick={() => void play(`${ASSET}/audio/${station.id}-q.mp3`)}>🔊</button>
        <button className="wr-chip" onClick={() => setStep('puzzle')}>🔍 Puzzle 再看謎題</button></p>
      {station.mode === 'drag'
        ? <DragAnswer station={station} onPassed={() => { setStep('reveal') }} />
        : <SpeakAnswer station={station} startRemaining={remaining} onPassed={() => setStep('reveal')} />}
    </>}
    {step === 'reveal' && <section className="wr-reveal">
      <iframe title="Clock" src={cardUrl('answer')} />
      <div className="wr-lines">
        <img className="wr-char small" src={char} alt="" />
        <div>{lines.map((text, i) => <p key={text} className={i === line ? 'on' : i < line ? 'said' : ''}>{text}</p>)}
          <div className="wr-row"><button className="wr-chip" onClick={() => void speakLines()}>🔊 Listen 聽句子</button>
            <button className="wr-big" disabled={line < lines.length} onClick={() => setStep('video')}>Watch the story 看動畫 →</button></div>
          {line < lines.length && <small>Listen to all the sentences first. 先把句子聽完。</small>}</div>
      </div>
    </section>}
    {step === 'video' && <section className="wr-video">
      {videoOk ? <video src={`${ASSET}/video/${station.id}.mp4`} controls autoPlay playsInline onEnded={() => setVideoEnded(true)} onError={() => setVideoOk(false)} />
        : <p className="wr-note">The story video for {station.country} is coming soon. 這一站的動畫還在製作中。</p>}
      <button className="wr-big" disabled={videoOk && !videoEnded} onClick={() => setStep('game')}>Play the game 玩遊戲 →</button>
    </section>}
    {step === 'game' && <section className="wr-game">
      {gameMissing ? <><p className="wr-note">The game for {station.country} is coming soon. 這一站的遊戲還在製作中。</p>
        <button className="wr-big" disabled={saving} onClick={() => void finishGame(1, 0)}>Get my stamp 先蓋章 →</button></>
        : <iframe title="Game" src={`${ASSET}/games/${station.game}/index.html?country=${station.id}&hero=${hero}`} allow="autoplay" />}
      {saving && <p role="status">Saving… 儲存中</p>}{error && <p role="alert" className="wr-error">{error} <button className="wr-chip" onClick={() => void finishGame(1, 0)}>Retry 重試</button></p>}
    </section>}
    {step === 'stamp' && <section className="wr-stamp">
      <div className="wr-passport"><img src={`${ASSET}/art/passport.png`} alt="" /><div className="wr-ink"><b>{station.country}</b><span>{station.code.slice(0, 2)}:{station.code.slice(2)}</span></div></div>
      <h2>Stamp! 護照蓋章！</h2><p>{'★'.repeat(state?.stars ?? 1)}</p>
      <button className="wr-big" onClick={onExit}>Back to the map 回地圖 →</button>
    </section>}
  </main>
}

// Map animation clips (opening, flight between stations, ending): map_<name>.mp4, 720p, made with map-anim/build*.py.
// First view has no Skip (unless the video stalls); a clip seen before on this device can be skipped. A clip that cannot
// load never blocks the trip: onFail runs instead (the old hero-on-the-map trip for flights).
const clipSeen = (name: string) => (store.get('wr-clips') ?? '').split(',').includes(name)
const markClipSeen = (name: string) => { if (!clipSeen(name)) store.set('wr-clips', [...(store.get('wr-clips') ?? '').split(',').filter(Boolean), name].join(',')) }
function MapClip({ name, onDone, onFail }: { name: string; onDone: () => void; onFail: () => void }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [needTap, setNeedTap] = useState(false), [slow, setSlow] = useState(false), [seen] = useState(() => clipSeen(name))
  useEffect(() => {
    const v = ref.current; if (!v) return
    void v.play().catch(() => setNeedTap(true))               // iPad: a clip that starts after a network wait needs one more tap
    const t = setTimeout(() => { if (v.currentTime < 0.2) setSlow(true) }, 6000)
    return () => clearTimeout(t)
  }, [])
  const done = () => { markClipSeen(name); onDone() }
  return <div className="wr-clip" role="dialog" aria-label="Map animation">
    <video ref={ref} src={`${ASSET}/video/map_${name}.mp4`} playsInline preload="auto" onEnded={done} onError={onFail} onPlaying={() => { setNeedTap(false); setSlow(false) }} />
    {needTap && <button className="wr-big wr-clip-play" onClick={() => void ref.current?.play().catch(() => {})}>▶ Play 播放</button>}
    {(seen || slow) && <button className="wr-chip wr-clip-skip" onClick={done}>Skip 跳過 ⏭</button>}
  </div>
}

export default function RoutinesApp() {
  const [phase, setPhase] = useState<'login' | 'map' | 'station'>('login')
  const [progress, setProgress] = useState<Progress>({}), [remaining, setRemaining] = useState(30)
  const [station, setStation] = useState<Station | null>(null), [travelling, setTravelling] = useState<{ from: Station; to: Station } | null>(null)
  const [hero, setHeroState] = useState<Hero>(() => store.get('wr-hero') === 'boy' ? 'boy' : 'girl')
  const setHero = (h: Hero) => { setHeroState(h); store.set('wr-hero', h) }
  const [clip, setClip] = useState<{ name: string; then: () => void; fail?: () => void } | null>(null)
  useEffect(() => { if (phase !== 'login') music.stop() }, [phase])
  const openAll = useMemo(() => new URLSearchParams(window.location.search).get('open') === 'all', [])
  const current = STATIONS.find(s => !progress[s.id]?.gameDone) ?? null
  async function load() { const r = await callCloud<{ stations: Progress; remaining: number }>('routinesState'); setProgress(r.stations); setRemaining(r.remaining) }
  async function start(studentId: string) { await studentLogin(); await callCloud('joinStudent', { studentId }); await load(); setPhase('map'); if (!clipSeen('opening')) setClip({ name: 'opening', then: () => {} }) }
  function open(next: Station) {
    const index = STATIONS.indexOf(next), from = STATIONS[Math.max(0, index - 1)]
    if (progress[next.id]?.gameDone || next.transport === 'home') { setStation(next); setPhase('station'); return }
    const arrive = () => { setStation(next); setPhase('station') }
    const walk = () => { setTravelling({ from, to: next }); setTimeout(() => { setTravelling(null); arrive() }, 3200) }
    setClip({ name: `leg_${next.id}`, then: arrive, fail: walk })
  }
  const allDone = (p: Progress) => STATIONS.every(s => p[s.id]?.gameDone)
  const playEnding = () => setClip({ name: 'ending', then: () => {} })
  if (clip) return <MapClip key={clip.name} name={clip.name} onDone={() => { const c = clip; setClip(null); c.then() }} onFail={() => { const c = clip; setClip(null); (c.fail ?? c.then)() }} />
  if (phase === 'login') return <Login onStart={start} hero={hero} onHero={setHero} />
  if (phase === 'station' && station) return <StationFlow key={station.id} station={station} state={progress[station.id]} remaining={remaining} hero={hero}
    onUpdate={setProgress} onExit={() => { setPhase('map'); void load().catch(() => {}); if (allDone(progress) && !clipSeen('ending')) playEnding() }} />
  return <WorldMap progress={progress} current={current} onOpen={open} travelling={travelling} openAll={openAll} hero={hero} onEnding={playEnding} />
}
