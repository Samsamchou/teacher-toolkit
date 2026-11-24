/* eslint-disable jsx-a11y/media-has-caption -- the learner's own recording has no authored captions. */
// Safari Count (HWG5 U4 "How Many Koalas Are There?") at /safari-count — SKELETON (2026-11-24, local preview only).
// Same flow idea as World Routines: map -> country pupil asks "How many ___ are there?" -> puzzle card (answer = the animal word)
// -> count the animals -> drag or speak the sentence -> reveal -> story video -> "Does he/she like ___?" -> stamp.
// Not wired yet (later steps of the spec): cloud progress and teacher records, AI speaking score, the 3D story videos,
// the photo game, the other five countries. Checks run in the page for now.
import { useMemo, useRef, useState } from 'react'
import bank from '../../functions/safari-content.json'
import { ASSET as WR, MAP_POS, charSrc, shuffled, type Hero } from '../routines/content'
import '../routines/routines.css'
import './safari.css'

const SC = '/safari-count'
type DragLine = { sentence: string; slots: string[] }
type Item = { key: string; answer: string; word: string; plural: string; emoji: string; count: number; puzzle: string; mode: 'drag' | 'speak'
  question: string; spoken: string; drag?: DragLine[]; distractors?: string[] }
type Station = { id: string; order: number; country: string; comingSoon?: boolean; pupil?: string; place?: string; vehicle?: string; welcome?: string
  items?: Item[]; like?: { animal: string; yes: boolean; drag: DragLine; distractors: string[] } }
const STATIONS = bank.stations as Station[]
const BUDDY = (h: Hero) => h === 'girl' ? 'he' : 'she'          // the travel buddy is the other traveller
const audio = (name: string) => `${SC}/audio/${name}.mp3`
function play(src: string): Promise<void> { return new Promise(r => { const a = new Audio(src); a.onended = () => r(); a.onerror = () => r(); a.play().catch(() => r()) }) }

function Drag({ lines, distractors, seed, onPassed }: { lines: DragLine[]; distractors: string[]; seed: number; onPassed: () => void }) {
  const want = lines.flatMap(l => l.slots)
  const chips = useMemo(() => shuffled([...want, ...distractors].map((w, i) => ({ w, id: i })), seed), [seed]) // eslint-disable-line react-hooks/exhaustive-deps
  const [slots, setSlots] = useState<({ w: string; id: number } | null)[]>(want.map(() => null)), [note, setNote] = useState('')
  const used = (id: number) => slots.some(s => s?.id === id)
  const put = (c: { w: string; id: number }) => setSlots(old => { const i = old.indexOf(null); if (i < 0) return old; const n = [...old]; n[i] = c; return n })
  let k = 0
  return <section className="wr-answer">
    <h2>Tap the words to fill the boxes. <small>點單字放進框框（點框框可以拿出來）。</small></h2>
    {lines.map((l, li) => <p key={li} className="wr-sentence">{l.sentence.split(/(___)/).map((part, i) => {
      if (part !== '___') return <span key={i}>{part}</span>
      const idx = k++
      return <button key={i} className={`wr-slot${slots[idx] ? ' filled' : ''}`} onClick={() => setSlots(o => o.map((x, j) => j === idx ? null : x))}>{slots[idx]?.w ?? ' '}</button>
    })}</p>)}
    <div className="wr-chips">{chips.map(c => <button key={c.id} className="wr-word" disabled={used(c.id)} onClick={() => put(c)}>{c.w}</button>)}</div>
    <button className="wr-big" disabled={slots.some(s => !s)} onClick={() => {
      const ok = slots.every((s, i) => s?.w === want[i])
      if (ok) onPassed(); else setNote('Not yet. Check the words again. 再看一次句子。')
    }}>Check 送出</button>
    {note && <p role="status" className="wr-note">{note}</p>}
  </section>
}

function Speak({ target, onPassed }: { target: string; onPassed: () => void }) {
  const [rec, setRec] = useState<MediaRecorder | null>(null), [url, setUrl] = useState(''), [err, setErr] = useState('')
  const chunks = useRef<Blob[]>([])
  async function start() {
    setErr(''); setUrl('')
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true }); const r = new MediaRecorder(s); chunks.current = []
      r.ondataavailable = e => chunks.current.push(e.data)
      r.onstop = () => { s.getTracks().forEach(t => t.stop()); setUrl(URL.createObjectURL(new Blob(chunks.current, { type: r.mimeType }))) }
      r.start(); setRec(r)
    } catch { setErr('The microphone is not available. 麥克風無法使用。') }
  }
  return <section className="wr-answer">
    <h2>Say it! <small>按錄音，說出完整的句子。</small></h2>
    <p className="wr-sentence">{target}</p>
    <div className="wr-record">{rec ? <button className="wr-big wr-stop" onClick={() => { rec.stop(); setRec(null) }}>⏹ Stop 停止</button>
      : <button className="wr-big" onClick={() => void start()}>🎙 Record 錄音</button>}</div>
    {url && <div className="wr-review"><audio src={url} controls /><button className="wr-big" onClick={onPassed}>Next 下一步 →</button></div>}
    <p className="wr-small">（骨架版：AI 口說評分之後接上 World Routines 的評分，現在錄完就能繼續。）</p>
    {err && <p role="alert" className="wr-error">{err}</p>}
  </section>
}

function Puzzle({ item, onSolved }: { item: Item; onSolved: () => void }) {
  const [stage, setStage] = useState<'puzzle' | 'hint1' | 'hint2' | 'answer'>('puzzle'), [guess, setGuess] = useState(''), [note, setNote] = useState('')
  const solved = stage === 'answer'
  return <section className="sc-puzzle">
    <iframe title="Puzzle" src={`${SC}/cards.html?ans=${item.answer}&stage=${stage}`} />
    {!solved ? <>
      <div className="wr-row">
        <button className="wr-chip" disabled={stage !== 'puzzle'} onClick={() => setStage('hint1')}>💡 Hint 1</button>
        <button className="wr-chip" disabled={stage !== 'hint1'} onClick={() => setStage('hint2')}>💡 Hint 2</button>
      </div>
      <form className="sc-guess" onSubmit={e => { e.preventDefault(); if (guess.trim().toUpperCase() === item.answer) { setStage('answer'); setNote('') } else setNote('Try again! 再想想看。') }}>
        <label>Answer 謎底 <input value={guess} maxLength={12} autoComplete="off" onChange={e => setGuess(e.target.value.replace(/[^a-zA-Z]/g, ''))} /></label>
        <button className="wr-big" disabled={!guess}>Check 送出</button>
      </form>
      {note && <p role="status" className="wr-note">{note}</p>}
    </> : <button className="wr-big" onClick={onSolved}>Count them! 數數看 →</button>}
  </section>
}

function Count({ item, onPassed }: { item: Item; onPassed: () => void }) {
  const [note, setNote] = useState('')
  return <section className="wr-answer">
    <h2>How many {item.plural} are there? <small>數一數，有幾隻？（之後換成 3D 情境畫面）</small></h2>
    <div className="sc-scene">{Array.from({ length: item.count }, (_, i) => <span key={i}>{item.emoji}</span>)}</div>
    <div className="wr-keys">{[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <button key={n} onClick={() => n === item.count ? onPassed() : setNote('Count again! 再數一次。')}>{n}</button>)}</div>
    {note && <p role="status" className="wr-note">{note}</p>}
  </section>
}

type Step = 'meet' | 'puzzle' | 'count' | 'answer' | 'reveal' | 'video' | 'like' | 'stamp'
function StationFlow({ station, hero, onDone, onExit }: { station: Station; hero: Hero; onDone: () => void; onExit: () => void }) {
  const [n, setN] = useState(0), [step, setStep] = useState<Step>('meet')
  const item = station.items![n], h = hero === 'girl' ? 'g' : 'b', buddy = BUDDY(hero), like = station.like!
  const pupil = <img className="wr-char" src={charSrc(station.id)} alt="" />
  const next = () => { if (n + 1 < station.items!.length) { setN(n + 1); setStep('meet') } else setStep('like') }
  return <main className="wr-station">
    <div className="wr-topbar"><strong>{station.country} · {station.place} <small>Question {Math.min(n + 1, 2)} / 2</small></strong>
      <button className="wr-chip" onClick={onExit}>← Map</button></div>
    <div className="sc-body">
      {step === 'meet' && <section className="wr-meet">{pupil}<div className="wr-bubbles">
        {n === 0 && <p className="wr-bubble">{station.welcome}</p>}
        <p className="wr-bubble">{item.question}</p>
        <div className="wr-row"><button className="wr-chip" onClick={() => void (async () => { if (n === 0) await play(audio(`${station.id}-welcome`)); await play(audio(`${station.id}-${item.key}-q`)) })()}>🔊 Listen 聽</button>
          <button className="wr-big" onClick={() => setStep('puzzle')}>Open the puzzle 解謎 →</button></div></div></section>}
      {step === 'puzzle' && <Puzzle item={item} onSolved={() => setStep('count')} />}
      {step === 'count' && <Count item={item} onPassed={() => setStep('answer')} />}
      {step === 'answer' && (item.mode === 'drag'
        ? <Drag lines={item.drag!} distractors={item.distractors!} seed={station.order * 31 + n} onPassed={() => setStep('reveal')} />
        : <Speak target={item.spoken} onPassed={() => setStep('reveal')} />)}
      {step === 'reveal' && <section className="wr-meet">{pupil}<div className="wr-bubbles">
        <p className="wr-bubble">{item.question.replace(/^Look! /, '')}</p>
        <p className="wr-bubble you">{item.spoken}</p>
        <div className="wr-row"><button className="wr-chip" onClick={() => void (async () => { await play(audio(`${station.id}-${item.key}-q`)); await play(audio(`${station.id}-${item.key}-a-${h}`)) })()}>🔊 Listen 聽</button>
          <button className="wr-big" onClick={() => setStep('video')}>Watch the story 看動畫 →</button></div></div></section>}
      {step === 'video' && <section className="wr-answer">
        <p className="wr-note">The story video is coming soon. 這一題的 3D 動畫還在製作中（Tripo 點數補充後製作）。</p>
        <button className="wr-big" onClick={next}>Next 下一步 →</button></section>}
      {step === 'like' && <section>
        <div className="wr-meet">{pupil}<div className="wr-bubbles">
          <p className="wr-bubble">Does {buddy} like {like.animal}?</p>
          <button className="wr-chip" onClick={() => void (async () => { await play(audio(`${station.id}-like-q-${h}`)); await play(audio(`${station.id}-like-a-${h}`)) })()}>🔊 Listen 聽</button></div></div>
        <Drag lines={[{ ...like.drag, sentence: like.drag.sentence.replace('PRONOUN', buddy) }]} distractors={like.distractors} seed={station.order * 53} onPassed={() => setStep('stamp')} />
      </section>}
      {step === 'stamp' && <section className="wr-answer">
        <p className="sc-stamp">🐾 {station.country} ✓</p>
        <button className="wr-big" onClick={onDone}>Back to the map 回地圖</button></section>}
    </div>
  </main>
}

export default function SafariApp() {
  const [hero, setHero] = useState<Hero | null>(null), [open, setOpen] = useState<Station | null>(null), [done, setDone] = useState<string[]>([])
  if (!hero) return <main className="wr-login">
    <h1>Safari Count</h1>
    <p>野生動物園數數解謎 · How many ___ are there?</p>
    <form onSubmit={e => e.preventDefault()}>
      <fieldset className="wr-heroes"><legend>Choose your traveller / 選主角</legend>
        {(['girl', 'boy'] as Hero[]).map(h => <button type="button" key={h} className="wr-hero-card" onClick={() => setHero(h)}>
          <img src={`${WR}/art3d/hero_${h}.png`} alt="" /><span>{h === 'girl' ? 'Girl 女生' : 'Boy 男生'}</span></button>)}
      </fieldset>
      <p className="wr-small">（骨架版：還沒接學號登入與紀錄）</p>
    </form>
  </main>
  if (open) return <StationFlow station={open} hero={hero} onExit={() => setOpen(null)} onDone={() => { setDone(d => [...new Set([...d, open.id])]); setOpen(null) }} />
  return <main className="wr-map-page">
    <div className="wr-topbar"><strong>Safari Count 🦓</strong><span>{done.length} / 6 🐾</span></div>
    <div className="wr-map"><img className="wr-map-img" src={`${WR}/art/world_map.jpg`} alt="World map" />
      {STATIONS.map(s => { const [x, y] = MAP_POS[s.id]; return <button key={s.id} className={`wr-pin${done.includes(s.id) ? ' done' : ''}${!s.comingSoon && !done.includes(s.id) ? ' current' : ''}`}
        style={{ left: `${x}%`, top: `${y}%` }} disabled={s.comingSoon} onClick={() => setOpen(s)} title={s.comingSoon ? 'Coming soon 製作中' : s.country}>
        <b>{s.order}</b><span>{s.country}{s.comingSoon ? ' ⏳' : ''}</span></button> })}
    </div>
    <p className="wr-hint-line">Tap Taiwan to start. 點台灣開始（其他五國製作中）。</p>
  </main>
}
