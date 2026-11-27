/* eslint-disable jsx-a11y/media-has-caption -- the learner's own recording has no authored captions. */
// Safari Count (HWG5 U4 "How Many Koalas Are There?") at /safari-count, built like World Routines (2026-11-25).
// Student ID login -> map -> per animal: the country pupil asks "How many ___ are there?" -> puzzle card (answer = the animal word)
// -> count the animals -> drag or speak the sentence -> reveal -> story video -> "Does he/she like ___?" -> stamp.
// Every answer is checked by the server (functions/safari.mjs); the page never has the counts, slot orders or yes/no answers.
// After the like question the pupil plays the Godot photo game (public/safari-count/games/photo-count, channel 'safari-count');
// its game-done message gives the stars and score sent with the stamp. Story films and count pictures: public/safari-count/films and count (publish_to_site.py). Still to come: the other five countries.
import { useEffect, useMemo, useRef, useState } from 'react'
import { callCloud, studentLogin } from '../services/firebase'
import { normalizeRecording, base64Audio } from '../utils/recording'
import { ASSET as WR, MAP_POS, charSrc, type Hero } from '../routines/content'
import '../routines/routines.css'
import './safari.css'

// Version 2 (/safari-count-2, teacher 11/27): same page; its own bank and records on the server (safari2... callables),
// its own films / count pictures / audio under /safari-count-2; the puzzle cards (?v=2) and the photo game are shared.
const V2 = typeof window !== 'undefined' && window.location.pathname.startsWith('/safari-count-2')
const BASE = '/safari-count', SC = V2 ? '/safari-count-2' : BASE
const fn = (name: string) => V2 ? name.replace('Safari', 'Safari2').replace(/^safari/, 'safari2') : name
// Start-screen music (teacher 11/27): one Music 3 track for both versions; iPad needs a tap before it can play.
const BGM = `${BASE}/audio/bgm.mp3`
type Item = { key: string; card: string; question: string; mode: 'drag' | 'speak'; drag?: { lines: string[]; chips: string[] } }
type Station = { id: string; order: number; country: string; comingSoon?: boolean; pupil?: string; place?: string; vehicle?: string; welcome?: string
  items?: Item[]; like?: { animal: string; clue: string | null; sentence: string; chips: string[] } }
// Given by the server once the puzzle is solved: what to count, and the question with the animal shown.
// picture = a clean frame of the story film (no voice, subtitles or red numbers) under /safari-count/count/; the emoji row is the fallback.
type Scene = { emoji: string; count: number; picture: string | null; question: string; plural: string }
type ItemState = { puzzle: boolean; counted: boolean; answered: boolean; score: number | null; scene?: Scene; sentence?: string }
type StationState = { items: Record<string, ItemState>; like: boolean; stamp: boolean; stars?: number; gameScore?: number }
type Progress = Record<string, StationState>
type SpeakResult = { transcript: string; accuracy: number; fluency: number; completeness: number; total_score: number; feedback: string
  numberOk: boolean; verbOk: boolean; nounOk: boolean; passed: boolean; remaining: number; sentence: string | null }

const BUDDY = (h: Hero) => h === 'girl' ? 'he' : 'she'          // the travel buddy is the other traveller
const audio = (name: string) => `${SC}/audio/${name}.mp3`
const message = (e: unknown) => e instanceof Error ? e.message : 'Please try again. / 請再試一次。'
const store = { get: (k: string) => { try { return localStorage.getItem(k) } catch { return null } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* private window: just not remembered */ } } }
function play(src: string): Promise<void> { return new Promise(r => { const a = new Audio(src); a.onended = () => r(); a.onerror = () => r(); a.play().catch(() => r()) }) }

function Drag({ lines, chips, onCheck }: { lines: string[]; chips: string[]; onCheck: (slots: string[]) => Promise<boolean> }) {
  const want = lines.reduce((n, l) => n + l.split('___').length - 1, 0)
  const pool = useMemo(() => chips.map((w, id) => ({ w, id })), [chips])
  const [slots, setSlots] = useState<({ w: string; id: number } | null)[]>(() => Array.from({ length: want }, () => null))
  const [note, setNote] = useState(''), [busy, setBusy] = useState(false)
  const used = (id: number) => slots.some(s => s?.id === id)
  const put = (c: { w: string; id: number }) => setSlots(old => { const i = old.indexOf(null); if (i < 0) return old; const n = [...old]; n[i] = c; return n })
  async function check() {
    setBusy(true); setNote('')
    try { if (!await onCheck(slots.map(s => s!.w))) setNote('Not yet. Check the words again. 再看一次句子。') }
    catch (e) { setNote(message(e)) } finally { setBusy(false) }
  }
  let k = 0
  return <section className="wr-answer">
    <h2>Tap the words to fill the boxes. <small>點單字放進框框（點框框可以拿出來）。</small></h2>
    {lines.map((l, li) => <p key={li} className="wr-sentence">{l.split(/(___)/).map((part, i) => {
      if (part !== '___') return <span key={i}>{part}</span>
      const idx = k++
      return <button key={i} data-slot={idx} className={`wr-slot${slots[idx] ? ' filled' : ''}`} onClick={() => setSlots(o => o.map((x, j) => j === idx ? null : x))}>{slots[idx]?.w ?? ' '}</button>
    })}</p>)}
    <div className="wr-chips">{pool.map(c => <button key={c.id} className="wr-word" disabled={used(c.id) || busy} onClick={() => put(c)}>{c.w}</button>)}</div>
    <button className="wr-big" disabled={slots.some(s => !s) || busy} onClick={() => void check()}>{busy ? 'Checking… 檢查中' : 'Check 送出'}</button>
    {note && <p role="status" className="wr-note">{note}</p>}
  </section>
}

function Speak({ station, item, plural, startRemaining, onPassed }: { station: Station; item: Item; plural: string; startRemaining: number; onPassed: (r: SpeakResult) => void }) {
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
      const r = await callCloud<SpeakResult>(fn('scoreSafariSpeaking'), { station: station.id, item: item.key, attemptId: clip.id, audio: await base64Audio(clip.blob) })
      if (!alive.current) return
      setResult(r); setRemaining(r.remaining); setClip(null); setPhase('idle')
    } catch (e) { fail(e) }
  }
  const mark = (ok: boolean, yes: string, no: string) => <li className={ok ? 'ok' : 'no'}>{ok ? '✅' : '❌'} {ok ? yes : no}</li>
  return <section className="wr-answer">
    <h2>Say it! <small>按錄音，用完整的英文句子說出有幾隻 {plural}。</small></h2>
    <p className="wr-sentence wr-reply">There <span className="wr-code wr-ask">? ? ?</span></p>
    <p className="wr-small">There are + 數量 + 複數名詞（-s） ／ There is（或 There&apos;s）one（或 a）+ 單數名詞</p>
    <div className="wr-record">
      {phase === 'recording' ? <button className="wr-big wr-stop" onClick={() => recorder.current?.stop()}>■ Stop 完成錄音</button>
        : <button className="wr-big" disabled={phase !== 'idle' || remaining < 1} onClick={() => void start()}>🎙 Record 錄音</button>}
      <span role="status">{phase === 'recording' ? 'Recording… 最多 15 秒' : phase === 'preparing' ? 'Preparing… 處理錄音中' : phase === 'sending' ? 'AI is listening… AI 評分中' : ''}</span>
    </div>
    {clip && <div className="wr-review"><audio controls src={clip.url} aria-label="My recording / 我的錄音" />
      <button className="wr-big" disabled={phase !== 'idle'} onClick={() => void send()}>Send 送出評分</button></div>}
    <p className="wr-small">85 to pass, and the number, are / &apos;s and the -s must be right. · {remaining} left today<br />85 分以上，而且數量、are／&apos;s、名詞的 -s 都要對才過關；今天還可以評 {remaining} 次（和 World Routines 共用）。</p>
    {error && <p role="alert" className="wr-error">{error}</p>}
    {result && <div className={`wr-score${result.passed ? ' pass' : ''}`} role="status">
      <strong>{result.passed ? '🌟 Passed! 通過！' : 'Try again! 再試一次'} {result.total_score}/100</strong>
      <p>AI heard / AI 聽到：{result.transcript}</p>
      <ul className="sc-checks">
        {mark(result.numberOk, 'The number is right. 數量正確', 'The number is not right. 數量不對，再數一次。')}
        {mark(result.verbOk, "are / 's is right. are／'s 正確", "Check are / 's. 想想看要用 are 還是 's。")}
        {mark(result.nounOk, 'The animal word is right. 名詞正確', 'Check the -s at the end. 注意名詞結尾的 -s。')}
      </ul>
      <dl><div><dt>Accuracy 精準</dt><dd>{result.accuracy}</dd></div><div><dt>Fluency 流暢</dt><dd>{result.fluency}</dd></div><div><dt>Complete 完整</dt><dd>{result.completeness}</dd></div></dl>
      <p>{result.feedback}</p>
      {result.passed && <button className="wr-big" onClick={() => onPassed(result)}>Next 下一步 →</button>}
    </div>}
  </section>
}

function Puzzle({ station, item, onSolved }: { station: Station; item: Item; onSolved: (scene: Scene) => void }) {
  const [stage, setStage] = useState<'puzzle' | 'hint1' | 'hint2' | 'answer'>('puzzle'), [guess, setGuess] = useState(''), [note, setNote] = useState('')
  const [busy, setBusy] = useState(false), [scene, setScene] = useState<Scene>()
  async function check() {
    setBusy(true); setNote('')
    try {
      const r = await callCloud<{ passed: boolean; scene?: Scene }>(fn('safariPuzzle'), { station: station.id, item: item.key, guess })
      if (r.passed && r.scene) { setScene(r.scene); setStage('answer') } else setNote('Try again! 再想想看。')
    } catch (e) { setNote(message(e)) } finally { setBusy(false) }
  }
  return <section className="sc-puzzle">
    <iframe title="Puzzle" src={`${BASE}/cards.html?ans=${item.card}&stage=${stage}${V2 ? '&v=2' : ''}`} />
    {!scene ? <>
      <div className="wr-row">
        <button className="wr-chip" disabled={stage !== 'puzzle'} onClick={() => setStage('hint1')}>💡 Hint 1</button>
        <button className="wr-chip" disabled={stage !== 'hint1'} onClick={() => setStage('hint2')}>💡 Hint 2</button>
      </div>
      <form className="sc-guess" onSubmit={e => { e.preventDefault(); if (guess && !busy) void check() }}>
        <label>Answer 謎底 <input value={guess} maxLength={12} autoComplete="off" onChange={e => setGuess(e.target.value.replace(/[^a-zA-Z]/g, ''))} /></label>
        <button className="wr-big" disabled={!guess || busy}>{busy ? 'Checking… 檢查中' : 'Check 送出'}</button>
      </form>
      {note && <p role="status" className="wr-note">{note}</p>}
    </> : <button className="wr-big" onClick={() => onSolved(scene)}>Count them! 數數看 →</button>}
  </section>
}

function Count({ station, item, scene, onPassed }: { station: Station; item: Item; scene: Scene; onPassed: () => void }) {
  const [note, setNote] = useState(''), [busy, setBusy] = useState(false), [noPic, setNoPic] = useState(false)
  async function pick(n: number) {
    setBusy(true); setNote('')
    try { const r = await callCloud<{ passed: boolean }>(fn('safariCount'), { station: station.id, item: item.key, count: n }); if (r.passed) onPassed(); else setNote('Count again! 再數一次。') }
    catch (e) { setNote(message(e)) } finally { setBusy(false) }
  }
  return <section className="wr-answer">
    <h2>How many {scene.plural} are there? <small>Look at the picture and count. 看圖數一數。</small></h2>
    {scene.picture && !noPic ? <img className="sc-count-pic" src={`${SC}/count/${scene.picture}`} alt={`Picture: count the ${scene.plural}`} onError={() => setNoPic(true)} />
      : <div className="sc-scene" role="img" aria-label="Animals to count">{Array.from({ length: scene.count }, (_, i) => <span key={i}>{scene.emoji}</span>)}</div>}
    <div className="wr-keys">{[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <button key={n} disabled={busy} onClick={() => void pick(n)}>{n}</button>)}</div>
    {note && <p role="status" className="wr-note">{note}</p>}
  </section>
}

type Step = 'meet' | 'puzzle' | 'count' | 'answer' | 'reveal' | 'video' | 'like' | 'game' | 'stamp'
const GAME = `${BASE}/games/photo-count`
const afterItems = (s: StationState | undefined): Step => s?.stamp ? 'stamp' : s?.like ? 'game' : 'like'
const itemStep = (x: ItemState | undefined): Step => x?.counted ? 'answer' : x?.puzzle ? 'count' : 'meet'
// Where to resume a station from saved progress: the first animal not yet answered, then the like question, then the stamp.
function resume(station: Station, s: StationState | undefined): { n: number; step: Step } {
  const items = station.items!
  const n = items.findIndex(it => !s?.items[it.key]?.answered)
  if (n < 0) return { n: items.length - 1, step: afterItems(s) }
  return { n, step: itemStep(s?.items[items[n].key]) }
}

function StationFlow({ station, state, hero, remaining, onUpdate, onRemaining, onExit }: { station: Station; state: StationState | undefined; hero: Hero; remaining: number
  onUpdate: (s: StationState) => void; onRemaining: (n: number) => void; onExit: () => void }) {
  const [first] = useState(() => resume(station, state))
  const [n, setN] = useState(first.n), [step, setStep] = useState<Step>(first.step)
  const [saving, setSaving] = useState(false), [error, setError] = useState('')
  const item = station.items![n], h = hero === 'girl' ? 'g' : 'b', buddy = BUDDY(hero), like = station.like!
  const mine = state?.items[item.key]
  const pupil = <img className="wr-char" src={charSrc(station.id)} alt={`${station.pupil} from ${station.country}`} />
  // When this pupil first entered the station on this device (kept across reloads until the stamp), for the teacher's 'minutes' column.
  const startKey = `sc${V2 ? '2' : ''}-start-${station.id}`
  useEffect(() => { if (!state?.stamp && !store.get(startKey)) store.set(startKey, String(Date.now())) }, [startKey, state?.stamp])
  const base: StationState = state ?? { items: {}, like: false, stamp: false }
  const patch = (x: Partial<ItemState>) => onUpdate({ ...base, items: { ...base.items, [item.key]: { ...(mine ?? { puzzle: false, counted: false, answered: false, score: null }), ...x } } })
  const next = () => {
    if (n + 1 >= station.items!.length) return setStep(afterItems(state))
    const x = state?.items[station.items![n + 1].key]
    setN(n + 1); setStep(x?.answered ? 'reveal' : itemStep(x))
  }
  const last = n + 1 >= station.items!.length, film = `${SC}/films/${station.id}-${item.key}${last && like.clue ? `-clue-${h}` : ''}.mp4`
  const [videoOk, setVideoOk] = useState(true), [videoEnded, setVideoEnded] = useState(false)
  const [result, setResult] = useState<{ stars: number; score: number } | null>(null), [gameMissing, setGameMissing] = useState(false)
  const game = useRef<HTMLIFrameElement>(null)
  async function stamp(stars: number, gameScore: number) {
    setResult({ stars, score: gameScore }); setSaving(true); setError('')
    try {
      const t0 = Number(store.get(startKey)), minutes = t0 > 0 ? Math.round((Date.now() - t0) / 6000) / 10 : undefined
      const r = await callCloud<{ station: StationState }>(fn('safariStamp'), { station: station.id, minutes, stars, gameScore })
      store.set(startKey, ''); onUpdate(r.station); setStep('stamp')
    } catch (e) { setError(message(e)) } finally { setSaving(false) }
  }
  // The photo game reports once at its end screen: same origin, our own iframe, channel 'safari-count'.
  useEffect(() => {
    if (step !== 'game') return
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== game.current?.contentWindow) return
      if (e.data?.channel !== 'safari-count' || e.data?.type !== 'game-done') return
      void stamp(Number.isInteger(e.data.stars) ? e.data.stars : 1, Number.isFinite(e.data.score) ? e.data.score : 0)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  })
  useEffect(() => {
    if (step !== 'game') return
    // A missing file is answered with the site's own index.html (status 200), so look for the game's script instead.
    fetch(`${GAME}/index.js`, { method: 'HEAD' }).then(r => { if (!r.ok || !(r.headers.get('content-type') ?? '').includes('javascript')) setGameMissing(true) }).catch(() => setGameMissing(true))
  }, [step])
  return <main className="wr-station">
    <div className="wr-topbar"><strong>{station.country} · {station.place} <small>{step === 'game' ? 'Photo game 拍照遊戲' : step === 'like' || step === 'stamp' ? 'Last question 最後一題' : `Question ${n + 1} / ${station.items!.length}`}</small></strong>
      <button className="wr-chip" onClick={onExit}>← Map</button></div>
    <div className="sc-body">
      {step === 'meet' && <section className="wr-meet">{pupil}<div className="wr-bubbles">
        {n === 0 && <p className="wr-bubble">{station.welcome}</p>}
        <p className="wr-bubble">{item.question}<small className="sc-tip">Solve the puzzle to find the animal! 解開謎題就知道是什麼動物。</small></p>
        <div className="wr-row"><button className="wr-chip" onClick={() => void (async () => { if (n === 0) await play(audio(`${station.id}-welcome`)); await play(audio(`${station.id}-${item.key}-qm`)) })()}>🔊 Listen 聽</button>
          <button className="wr-big" onClick={() => setStep('puzzle')}>Open the puzzle 解謎 →</button></div></div></section>}
      {step === 'puzzle' && <Puzzle key={item.key} station={station} item={item} onSolved={s => { patch({ puzzle: true, scene: s }); setStep('count') }} />}
      {step === 'count' && mine?.scene && <Count station={station} item={item} scene={mine.scene} onPassed={() => { patch({ counted: true }); setStep('answer') }} />}
      {step === 'answer' && (item.mode === 'drag'
        ? <Drag key={item.key} lines={item.drag!.lines} chips={item.drag!.chips} onCheck={async slots => {
          const r = await callCloud<{ passed: boolean; sentence: string | null }>(fn('safariAnswer'), { station: station.id, item: item.key, slots })
          if (r.passed) { patch({ answered: true, sentence: r.sentence ?? undefined }); setStep('reveal') } return r.passed }} />
        : <Speak key={item.key} station={station} item={item} plural={mine?.scene?.plural ?? ''} startRemaining={remaining} onPassed={r => {
          onRemaining(r.remaining); patch({ answered: true, score: r.total_score, sentence: r.sentence ?? undefined }); setStep('reveal') }} />)}
      {step === 'reveal' && <section className="wr-meet">{pupil}<div className="wr-bubbles">
        <p className="wr-bubble">{(mine?.scene?.question ?? item.question).replace(/^Look! /, '')}</p>
        <p className="wr-bubble you">{mine?.sentence ?? '…'}</p>
        <div className="wr-row"><button className="wr-chip" onClick={() => void (async () => { await play(audio(`${station.id}-${item.key}-q`)); await play(audio(`${station.id}-${item.key}-a-${h}`)) })()}>🔊 Listen 聽</button>
          <button className="wr-big" onClick={() => { setVideoOk(true); setVideoEnded(false); setStep('video') }}>Watch the story 看動畫 →</button></div></div></section>}
      {step === 'video' && <section className="wr-video">
        {/* The last animal's film ends with the buddy's like clue, so it comes in a boy-buddy (g) and a girl-buddy (b) version. */}
        {videoOk ? <video key={film} src={film} controls autoPlay playsInline onEnded={() => setVideoEnded(true)} onError={() => setVideoOk(false)} />
          : <p className="wr-note">The story video is coming soon. 這一題的 3D 動畫還在製作中。</p>}
        <button className="wr-big" disabled={videoOk && !videoEnded} onClick={next}>Next 下一步 →</button></section>}
      {step === 'like' && <section>
        <div className="wr-meet">{pupil}<div className="wr-bubbles">
          {/* The buddy's own words are the evidence for the answer (teacher 11/25), as at the end of the story film. */}
          {like.clue && <p className="wr-bubble sc-clue"><img src={`${WR}/art3d/hero_${buddy === 'he' ? 'boy' : 'girl'}.png`} alt={buddy === 'he' ? 'Your buddy (boy)' : 'Your buddy (girl)'} />
            <span>{like.clue} <span aria-hidden="true">❤️</span></span></p>}
          <p className="wr-bubble">Does {buddy} like {like.animal}?</p>
          <button className="wr-chip" onClick={() => void (async () => { if (like.clue) await play(audio(`${station.id}-like-clue-${h}`)); await play(audio(`${station.id}-like-q-${h}`)) })()}>🔊 Listen 聽</button></div></div>
        <Drag lines={[like.sentence.replaceAll('PRONOUN', buddy).replaceAll('Pronoun', buddy === 'he' ? 'He' : 'She')]} chips={like.chips} onCheck={async slots => {
          const r = await callCloud<{ passed: boolean }>(fn('safariAnswer'), { station: station.id, item: 'like', slots })
          if (r.passed) { onUpdate({ ...base, like: true }); setStep('game') } return r.passed }} />
      </section>}
      {step === 'game' && <section className="wr-game">
        {gameMissing ? <><p className="wr-note">The photo game is coming soon. 拍照遊戲還在製作中。</p>
          <button className="wr-big" disabled={saving} onClick={() => void stamp(1, 0)}>Get my stamp 先蓋章 →</button></>
          : <iframe ref={game} title="Safari Photo game" src={`${GAME}/index.html?country=${station.id}`} allow="autoplay" />}
        {saving && <p role="status">Saving… 儲存中</p>}
        {error && <p role="alert" className="wr-error">{error} <button className="wr-chip" onClick={() => void stamp(result?.stars ?? 1, result?.score ?? 0)}>Retry 重試</button></p>}
      </section>}
      {step === 'stamp' && <section className="wr-answer">
        <p className="sc-stamp">🐾 {station.country} ✓</p>
        <p className="sc-stars" aria-label={`${state?.stars ?? 0} stars`}>{'★'.repeat(state?.stars ?? 0)}</p>
        <div className="wr-row"><button className="wr-chip" onClick={() => setStep('game')}>📷 Play again 再玩一次</button>
          <button className="wr-big" onClick={onExit}>Back to the map 回地圖</button></div>
      </section>}
    </div>
  </main>
}

function Login({ hero, onHero, onStart }: { hero: Hero; onHero: (h: Hero) => void; onStart: (studentId: string) => Promise<void> }) {
  const [studentId, setStudentId] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const valid = /^(501|502|601|602)[0-9]{1,9}$/.test(studentId.trim())
  // Start-screen music (teacher 11/27): plays only after a tap (iPad Safari blocks autoplay), quiet, fades out when the pupil starts.
  const music = useRef<HTMLAudioElement | null>(null), [playing, setPlaying] = useState(false)
  function toggleMusic() {
    if (!music.current) { const a = new Audio(BGM); a.loop = true; a.volume = 0.35; music.current = a }
    const a = music.current
    if (playing) { a.pause(); setPlaying(false) } else { a.volume = 0.35; void a.play().then(() => setPlaying(true)).catch(() => setPlaying(false)) }
  }
  function fadeOut() {
    const a = music.current; if (!a || a.paused) return
    const v0 = a.volume; let k = 0
    const t = window.setInterval(() => { k++; a.volume = Math.max(0, v0 * (1 - k / 15)); if (k >= 15) { window.clearInterval(t); a.pause(); setPlaying(false) } }, 100)
  }
  return <main className="wr-login">
    <h1>Safari Count{V2 ? ' 2' : ''}</h1>
    <p>野生動物園數數解謎 · How many ___ are there?</p>
    <button type="button" className="wr-chip sc-music" aria-pressed={playing} onClick={toggleMusic}>{playing ? '🔊 Music on 音樂開' : '🔈 Music 音樂'}</button>
    <form onSubmit={e => { e.preventDefault(); if (!valid || busy) return; setBusy(true); setError(''); fadeOut(); onStart(studentId.trim()).catch(x => { setError(message(x)); setBusy(false) }) }}>
      <fieldset className="wr-heroes"><legend>Choose your traveller / 選主角</legend>
        {(['girl', 'boy'] as Hero[]).map(h => <button type="button" key={h} className="wr-hero-card" aria-pressed={hero === h} disabled={busy} onClick={() => onHero(h)}>
          <img src={`${WR}/art3d/hero_${h}.png`} alt="" /><span>{h === 'girl' ? 'Girl 女生' : 'Boy 男生'}</span></button>)}
      </fieldset>
      <label>Student ID / 學號
        <input inputMode="numeric" autoComplete="off" maxLength={12} placeholder="50130" value={studentId} disabled={busy} onChange={e => setStudentId(e.target.value)} />
      </label>
      <button className="wr-big" disabled={!valid || busy}>{busy ? 'Starting… 出發中' : 'Start the safari! 出發'}</button>
    </form>
    {error && <p role="alert" className="wr-error">{error}</p>}
  </main>
}

export default function SafariApp() {
  const [hero, setHeroState] = useState<Hero>(() => store.get('sc-hero') === 'boy' ? 'boy' : 'girl')
  const setHero = (h: Hero) => { setHeroState(h); store.set('sc-hero', h) }
  const [stations, setStations] = useState<Station[] | null>(null), [progress, setProgress] = useState<Progress>({}), [remaining, setRemaining] = useState(30)
  const [open, setOpen] = useState<Station | null>(null)
  async function load() {
    const r = await callCloud<{ stations: Station[]; progress: Progress; remaining: number }>(fn('safariState'))
    setStations(r.stations); setProgress(r.progress); setRemaining(r.remaining)
  }
  async function start(studentId: string) { await studentLogin(); await callCloud('joinStudent', { studentId }); await load() }
  if (!stations) return <Login hero={hero} onHero={setHero} onStart={start} />
  if (open) return <StationFlow key={open.id} station={open} state={progress[open.id]} hero={hero} remaining={remaining} onRemaining={setRemaining}
    onUpdate={s => setProgress(p => ({ ...p, [open.id]: s }))} onExit={() => { setOpen(null); void load().catch(() => {}) }} />
  const ready = stations.filter(s => !s.comingSoon), done = ready.filter(s => progress[s.id]?.stamp).length
  const current = ready.find(s => !progress[s.id]?.stamp)
  return <main className="wr-map-page">
    <div className="wr-topbar"><strong>Safari Count{V2 ? ' 2' : ''} 🦓</strong><span aria-label={`${done} of ${stations.length} stamps`}>{done} / {stations.length} 🐾</span></div>
    <div className="wr-map"><img className="wr-map-img" src={`${WR}/art/world_map.jpg`} alt="World map" />
      {stations.map(s => { const [x, y] = MAP_POS[s.id], stamped = Boolean(progress[s.id]?.stamp)
        return <button key={s.id} className={`wr-pin${stamped ? ' done' : ''}${s.id === current?.id ? ' current' : ''}`}
          style={{ left: `${x}%`, top: `${y}%` }} disabled={s.comingSoon} onClick={() => setOpen(s)} title={s.comingSoon ? 'Coming soon 製作中' : s.country}>
          <b>{stamped ? '★' : s.order}</b><span>{s.country}{s.comingSoon ? ' ⏳' : ''}</span></button> })}
    </div>
    <p className="wr-hint-line">{current ? <>Tap <b>{current.order} {current.country}</b> to start. 點地圖上的國家開始（其他國家製作中）。</> : '🎉 All stamps! 全部蓋章完成！'}</p>
  </main>
}
