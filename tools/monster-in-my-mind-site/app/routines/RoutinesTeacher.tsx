/* eslint-disable jsx-a11y/media-has-caption -- Each student recording is shown next to its AI transcript; there is no separate caption file. */
import { useEffect, useRef, useState } from 'react'
import { portal } from '../services/firebase'
import { TRIPS, tripData, type Station, type Variant } from './content'
import './routines.css'

type Cell = { mode: 'drag' | 'speak'; answered: boolean; score: number | null; gameDone: boolean; stars: number; gameScore?: number; minutes?: number | null }
type Row = { studentId: string; updatedAt: number; stations: Record<string, Cell> }
type Rec = { kind: 'prev' | 'pass'; targetText: string; transcript: string; total_score: number; accuracy: number; fluency: number; completeness: number; timeCorrect: boolean; passed: boolean; createdAt: number }
const CLASSES = ['501', '502', '601', '602']
const when = (ms: number) => ms ? new Date(ms).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const stamps = (STATIONS: Station[], r: Row) => STATIONS.filter(s => r.stations[s.id]?.gameDone).length

function cellText(c: Cell | undefined) {
  if (!c?.answered) return ''
  const ans = c.mode === 'speak' ? `${c.score ?? '✓'}` : '✓'
  return c.gameDone ? `${ans} ${'★'.repeat(Math.max(1, c.stars))}${c.minutes != null ? ` · ${Math.round(c.minutes)}分` : ''}` : ans
}

function toCsv(STATIONS: Station[], rows: Row[]) {
  const head = ['學號', '護照章數', ...STATIONS.map(s => `${s.order}.${s.country}(${s.mode === 'speak' ? '口說分數' : '拖放'})`), ...STATIONS.map(s => `${s.country} 遊戲星數`), ...STATIONS.map(s => `${s.country} 分鐘`), '最後更新']
  const body = rows.map(r => [r.studentId, stamps(STATIONS, r),
    ...STATIONS.map(s => { const c = r.stations[s.id]; return !c?.answered ? '' : c.mode === 'speak' ? (c.score ?? '') : '過關' }),
    ...STATIONS.map(s => r.stations[s.id]?.gameDone ? r.stations[s.id].stars : ''),
    ...STATIONS.map(s => r.stations[s.id]?.minutes ?? ''), when(r.updatedAt)])
  return '﻿' + [head, ...body].map(line => line.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n')
}

// variant 'hs' = the he/she trip (/world-routines-he-she/teacher): same page, its own records (teacher 11/23, suggestion 4).
export default function RoutinesTeacher({ variant = 'i' }: { variant?: Variant }) {
  const trip = TRIPS[variant], STATIONS = trip.stations, hs = variant === 'hs'
  const [signedIn, setSignedIn] = useState(false), [pin, setPin] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [classId, setClassId] = useState(''), [rows, setRows] = useState<Row[] | null>(null)
  const [pick, setPick] = useState<{ studentId: string; station: string } | null>(null), [records, setRecords] = useState<Rec[] | null>(null)
  const [clip, setClip] = useState<{ kind: string; url: string } | null>(null)
  const lock = useRef(false), panel = useRef<HTMLElement>(null)
  useEffect(() => { if (pick) panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, [pick])
  useEffect(() => { portal('session').then(() => setSignedIn(true)).catch(() => {}) }, [])
  useEffect(() => () => { if (clip) URL.revokeObjectURL(clip.url) }, [clip])
  async function run(action: () => Promise<void>) {
    if (lock.current) return
    lock.current = true; setBusy(true); setError('')
    try { await action() } catch (e) { setError(e instanceof Error ? e.message : '操作失敗。') } finally { lock.current = false; setBusy(false) }
  }
  async function loadClass(id: string) {
    setClassId(id); setPick(null); setRecords(null); setClip(null)
    const data = await portal<{ students: Row[] }>('routines', tripData(trip, { classId: id }))
    setRows(data.students)
  }
  async function openRecords(studentId: string, station: string) {
    setPick({ studentId, station }); setRecords(null); setClip(null)
    const data = await portal<{ records: Rec[] }>('routineRecords', tripData(trip, { studentId, station }))
    setRecords(data.records.sort((a, b) => a.createdAt - b.createdAt))
  }
  async function play(kind: string) {
    const data = await portal<{ audio: string }>('routineRecording', tripData(trip, { studentId: pick!.studentId, station: pick!.station, kind }))
    const bytes = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))
    setClip({ kind, url: URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' })) })
  }
  function download() {
    const url = URL.createObjectURL(new Blob([toCsv(STATIONS, rows ?? [])], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = `world-routines${hs ? '-he-she' : ''}-${classId}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const station = pick ? STATIONS.find(s => s.id === pick.station) : null
  const done = rows ? rows.filter(r => stamps(STATIONS, r) === STATIONS.length).length : 0

  return <main className="teacher-page wr-teacher">
    <a href="/teacher">← 教師後台</a> · <a href={trip.page}>World Routines Trip{hs ? ' he/she' : ''} 學生頁</a> · <a href={hs ? TRIPS.i.teacher : TRIPS.hs.teacher}>{hs ? '看 I 版紀錄' : '看 he/she 版紀錄'}</a>
    <h1>🌍 World Routines Trip{hs ? ' he/she · 世界小記者紀錄' : ' · 作息之旅紀錄'}</h1>
    {!signedIn ? <form onSubmit={e => { e.preventDefault(); void run(async () => { try { await portal('login', { pin }); setSignedIn(true) } finally { setPin('') } }) }}>
      <label>六碼通行碼（和教師後台相同）<input type="password" inputMode="numeric" autoComplete="current-password" maxLength={6} value={pin} onChange={e => setPin(e.target.value)} /></label>
      <button className="primary-button" disabled={busy || !/^\d{6}$/.test(pin)}>登入</button>
    </form> : <>
      <p>拖放站顯示 ✓（單字和密碼都對）；口說站顯示通過那次的 AI 分數（85 分以上而且時間說對）；★ 是遊戲星數，有星星代表已蓋護照章。
        點口說站的格子可以看「通過那次」和「通過前一次」的聽寫並播放錄音（保存七個月）。</p>
      <div className="teacher-toolbar" role="group" aria-label="班級">
        {CLASSES.map(id => <button key={id} className="student-row wr-class" aria-pressed={classId === id} disabled={busy} onClick={() => void run(() => loadClass(id))}>{id} 班</button>)}
        {rows && <button className="secondary-button" disabled={busy || !rows.length} onClick={download}>下載 CSV</button>}
      </div>
      {rows && <p role="status">{classId} 班：{rows.length} 位學生開始旅程，{done} 位完成 10 站。</p>}
      {rows && rows.length > 0 && <div className="wr-table-wrap"><table className="wr-table">
        <thead><tr><th scope="col">學號</th><th scope="col">章</th>
          {STATIONS.map(s => <th scope="col" key={s.id}>{s.order}. {s.country}<small>{s.mode === 'speak' ? '🎙 口說' : '🧩 拖放'}</small></th>)}
          <th scope="col">最後更新</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.studentId}>
          <th scope="row">{r.studentId}</th><td>{stamps(STATIONS, r)}</td>
          {STATIONS.map(s => { const c = r.stations[s.id], speak = s.mode === 'speak'
            const on = pick?.studentId === r.studentId && pick.station === s.id
            return <td key={s.id} className={`${c?.answered ? 'ok' : ''}${c?.gameDone ? ' stamped' : ''}${on ? ' on' : ''}`}>
              {speak ? <button className="wr-cell" disabled={busy} aria-label={`${r.studentId} ${s.country} 口說紀錄`} onClick={() => void run(() => openRecords(r.studentId, s.id))}>{cellText(c) || '…'}</button> : cellText(c)}
            </td> })}
          <td>{when(r.updatedAt)}</td></tr>)}</tbody>
      </table></div>}
      {rows && !rows.length && <p>這一班還沒有學生開始作息之旅。</p>}
      {pick && station && <section ref={panel} className="section-block wr-records" aria-label="口說紀錄">
        <h2>{pick.studentId} · {station.order}. {station.country} 口說紀錄</h2>
        <p>目標句：{station.spoken}</p>
        {records === null ? <p>載入中…</p> : !records.length ? <p>這一站還沒有口說錄音。</p> : records.map(x => <article key={x.kind}>
          <h3>{x.kind === 'pass' ? '✅ 通過那次' : '通過前一次（或最近一次未通過）'} · {x.total_score} 分 · {when(x.createdAt)}</h3>
          <p>AI 聽到：{x.transcript}</p>
          <p>精準 {x.accuracy} · 流暢 {x.fluency} · 完整 {x.completeness} · 時間{x.timeCorrect ? '正確' : '不對'}</p>
          <button className="secondary-button" disabled={busy} onClick={() => void run(() => play(x.kind))}>▶ 播放錄音</button>
          {clip?.kind === x.kind && <audio controls autoPlay src={clip.url} aria-label="學生錄音" />}
        </article>)}
      </section>}
      <button className="secondary-button" disabled={busy} onClick={() => void run(async () => { await portal('logout'); setSignedIn(false); setRows(null); setPick(null); setClip(null) })}>登出</button>
    </>}
    {error && <p role="alert">{error}</p>}
  </main>
}
