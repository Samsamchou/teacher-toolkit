/* eslint-disable jsx-a11y/media-has-caption -- Each student recording is shown next to its AI transcript; there is no separate caption file. */
// Safari Count teacher records at /safari-count/teacher (same six-digit PIN session as /teacher), built like RoutinesTeacher.
// One column per animal question (puzzle tries, count tries, drag ✓ or speaking score), the like question and the stamp.
import { useEffect, useRef, useState } from 'react'
import { portal } from '../services/firebase'
import { DeleteDialog, DeleteLog, downloadCsv, useStudentMenu, type DeleteEntry } from '../components/StudentDelete'
import '../routines/routines.css'
import './safari.css'

type ItemCell = { mode: 'drag' | 'speak'; puzzle: boolean; counted: boolean; answered: boolean; score: number | null; puzzleTries: number; countTries: number }
type Cell = { items: Record<string, ItemCell>; like: boolean; stamp: boolean; minutes: number | null; stars?: number; gameScore?: number }
type Row = { studentId: string; updatedAt: number; stations: Record<string, Cell> }
type Station = { id: string; order: number; country: string; items: { key: string; plural: string; mode: 'drag' | 'speak'; spoken: string }[] }
type Rec = { kind: 'prev' | 'pass'; targetText: string; transcript: string; total_score: number; accuracy: number; fluency: number; completeness: number
  numberOk: boolean; verbOk: boolean; nounOk: boolean; passed: boolean; createdAt: number }
const CLASSES = ['501', '502', '601', '602']
const when = (ms: number) => ms ? new Date(ms).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const stamps = (stations: Station[], r: Row) => stations.filter(s => r.stations[s.id]?.stamp).length

function itemText(c: ItemCell | undefined) {
  if (!c?.answered) return c?.counted ? '數完' : c?.puzzle ? '解謎完' : ''
  return c.mode === 'speak' ? `${c.score ?? '✓'}` : '✓'
}
const tries = (c: ItemCell | undefined) => c && (c.puzzleTries || c.countTries) ? `謎 ${c.puzzleTries} · 數 ${c.countTries}` : ''

function toCsv(stations: Station[], rows: Row[]) {
  const head = ['學號', '章數', ...stations.flatMap(s => [...s.items.flatMap(it => [`${s.country} ${it.plural}(${it.mode === 'speak' ? '口說分數' : '拖放'})`,
    `${s.country} ${it.plural} 解謎錯次`, `${s.country} ${it.plural} 數數錯次`]), `${s.country} like`, `${s.country} 蓋章`, `${s.country} 分鐘`, `${s.country} 拍照星星`, `${s.country} 拍照分數`]), '最後更新']
  const body = rows.map(r => [r.studentId, stamps(stations, r), ...stations.flatMap(s => { const c = r.stations[s.id]
    return [...s.items.flatMap(it => { const x = c?.items[it.key]
      return [!x?.answered ? '' : x.mode === 'speak' ? (x.score ?? '') : '過關', x?.puzzleTries ?? '', x?.countTries ?? ''] }),
    c?.like ? '過關' : '', c?.stamp ? '✓' : '', c?.minutes ?? '', c?.stamp ? (c.stars ?? '') : '', c?.stamp ? (c.gameScore ?? '') : ''] }), when(r.updatedAt)])
  return '﻿' + [head, ...body].map(line => line.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n')
}

export default function SafariTeacher({ version = 1 }: { version?: 1 | 2 }) {
  // Version 2 (/safari-count-2/teacher, 11/27): the same page on its own records (portal actions safari2...).
  const v2 = version === 2, act = (name: string) => v2 ? name.replace(/^safari/, 'safari2') : name, slug = v2 ? 'safari-count-2' : 'safari-count'
  const [signedIn, setSignedIn] = useState(false), [pin, setPin] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [classId, setClassId] = useState(''), [rows, setRows] = useState<Row[] | null>(null), [stations, setStations] = useState<Station[]>([])
  const [pick, setPick] = useState<{ studentId: string; station: string; item: string } | null>(null), [records, setRecords] = useState<Rec[] | null>(null)
  const [clip, setClip] = useState<{ kind: string; url: string } | null>(null)
  const [target, setTarget] = useState<string | null>(null), [log, setLog] = useState<DeleteEntry[] | null>(null), [notice, setNotice] = useState('')
  const lock = useRef(false), panel = useRef<HTMLElement>(null)
  const menu = useStudentMenu(id => { setNotice(''); setTarget(id) })
  useEffect(() => { if (pick) panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, [pick])
  useEffect(() => { portal('session').then(() => setSignedIn(true)).catch(() => {}) }, [])
  useEffect(() => { if (signedIn) portal<{ log: DeleteEntry[] }>(v2 ? 'safari2DeleteLog' : 'safariDeleteLog').then(d => setLog(d.log)).catch(() => {}) }, [signedIn, v2])
  useEffect(() => () => { if (clip) URL.revokeObjectURL(clip.url) }, [clip])
  async function run(action: () => Promise<void>) {
    if (lock.current) return
    lock.current = true; setBusy(true); setError('')
    try { await action() } catch (e) { setError(e instanceof Error ? e.message : '操作失敗。') } finally { lock.current = false; setBusy(false) }
  }
  // Teacher 11/26: back up this pupil's row as CSV, then delete their Safari progress (recordings stay).
  async function remove(studentId: string) {
    const row = rows?.find(r => r.studentId === studentId)
    if (row) downloadCsv(toCsv(stations, [row]), `${slug}-${studentId}-刪除前備份.csv`)
    const data = await portal<{ summary: string }>(act('safariDelete'), { studentId, confirm: studentId })
    setTarget(null); setNotice(`已刪除 ${studentId} 的紀錄（${data.summary}）。`)
    await loadClass(classId)
    setLog((await portal<{ log: DeleteEntry[] }>(act('safariDeleteLog'))).log)
  }
  async function loadClass(id: string) {
    setClassId(id); setPick(null); setRecords(null); setClip(null)
    const data = await portal<{ students: Row[]; stations: Station[] }>(act('safari'), { classId: id })
    setRows(data.students); setStations(data.stations)
  }
  async function openRecords(studentId: string, station: string, item: string) {
    setPick({ studentId, station, item }); setRecords(null); setClip(null)
    const data = await portal<{ records: Rec[] }>(act('safariRecords'), { studentId, station, item })
    setRecords(data.records.sort((a, b) => a.createdAt - b.createdAt))
  }
  async function play(kind: string) {
    const data = await portal<{ audio: string }>(act('safariRecording'), { ...pick!, kind })
    const bytes = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))
    setClip({ kind, url: URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' })) })
  }
  function download() {
    const url = URL.createObjectURL(new Blob([toCsv(stations, rows ?? [])], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = `${slug}-${classId}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const station = pick ? stations.find(s => s.id === pick.station) : null, item = station?.items.find(x => x.key === pick?.item)
  const done = rows ? rows.filter(r => stamps(stations, r) === stations.length).length : 0

  return <main className="teacher-page wr-teacher sc-teacher">
    <a href="/teacher">← 教師後台</a> · <a href={`/${slug}`}>Safari Count{v2 ? ' 2' : ''} 學生頁</a> · <a href={v2 ? '/safari-count/teacher' : '/safari-count-2/teacher'}>{v2 ? '看第 1 版紀錄' : '看第 2 版紀錄'}</a>
    <h1>🦓 Safari Count{v2 ? ' 2' : ''} · 野生動物數數紀錄{v2 ? '（第 2 版）' : ''}</h1>
    {!signedIn ? <form onSubmit={e => { e.preventDefault(); void run(async () => { try { await portal('login', { pin }); setSignedIn(true) } finally { setPin('') } }) }}>
      <label>六碼通行碼（和教師後台相同）<input type="password" inputMode="numeric" autoComplete="current-password" maxLength={6} value={pin} onChange={e => setPin(e.target.value)} /></label>
      <button className="primary-button" disabled={busy || !/^\d{6}$/.test(pin)}>登入</button>
    </form> : <>
      <p>每一隻動物一格：拖放題顯示 ✓；口說題顯示通過那次的 AI 分數（85 分以上，而且數量、are／&apos;s、名詞 -s 都對）；還沒作答會顯示「解謎完」或「數完」。
        小字是解謎和數數答錯的次數。點口說格子可以看「通過那次」和「通過前一次」的聽寫並播放錄音（保存七個月）。🐾 是蓋章。
        在學號上<b>按右鍵（iPad 長按）</b>可以刪除那位學生在 Safari Count 的進度。</p>
      <div className="teacher-toolbar" role="group" aria-label="班級">
        {CLASSES.map(id => <button key={id} className="student-row wr-class" aria-pressed={classId === id} disabled={busy} onClick={() => void run(() => loadClass(id))}>{id} 班</button>)}
        {rows && <button className="secondary-button" disabled={busy || !rows.length} onClick={download}>下載 CSV</button>}
      </div>
      {notice && <p className="sd-notice" role="status">{notice}</p>}
      {rows && <p role="status">{classId} 班：{rows.length} 位學生開始 Safari，{done} 位完成目前開放的 {stations.length} 國。</p>}
      {rows && rows.length > 0 && <div className="wr-table-wrap"><table className="wr-table">
        <thead><tr><th scope="col">學號</th><th scope="col">章</th>
          {stations.flatMap(s => [...s.items.map(it => <th scope="col" key={s.id + it.key}>{s.order}. {s.country} {it.plural}<small>{it.mode === 'speak' ? '🎙 口說' : '🧩 拖放'}</small></th>),
            <th scope="col" key={s.id + 'like'}>{s.country} like<small>🧩 拖放</small></th>, <th scope="col" key={s.id + 'stamp'}>{s.country} 🐾<small>分鐘 · 拍照★</small></th>])}
          <th scope="col">最後更新</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.studentId}>
          <th scope="row" {...menu(r.studentId)}>{r.studentId}</th><td>{stamps(stations, r)}</td>
          {stations.flatMap(s => { const c = r.stations[s.id]
            return [...s.items.map(it => { const x = c?.items[it.key], on = pick?.studentId === r.studentId && pick.station === s.id && pick.item === it.key
              return <td key={s.id + it.key} className={`${x?.answered ? 'ok' : ''}${on ? ' on' : ''}`}>
                {it.mode === 'speak' ? <button className="wr-cell" disabled={busy} aria-label={`${r.studentId} ${s.country} ${it.plural} 口說紀錄`}
                  onClick={() => void run(() => openRecords(r.studentId, s.id, it.key))}>{itemText(x) || '…'}</button> : itemText(x)}
                {tries(x) && <small>{tries(x)}</small>}</td> }),
            <td key={s.id + 'like'} className={c?.like ? 'ok' : ''}>{c?.like ? '✓' : ''}</td>,
            <td key={s.id + 'stamp'} className={c?.stamp ? 'stamped' : ''}>{c?.stamp ? `🐾${c.minutes != null ? ` ${Math.round(c.minutes)}分` : ''}${c.stars ? ` ${'★'.repeat(c.stars)}` : ''}` : ''}</td>] })}
          <td>{when(r.updatedAt)}</td></tr>)}</tbody>
      </table></div>}
      {rows && !rows.length && <p>這一班還沒有學生開始 Safari Count。</p>}
      {pick && station && item && <section ref={panel} className="section-block wr-records" aria-label="口說紀錄">
        <h2>{pick.studentId} · {station.order}. {station.country} {item.plural} 口說紀錄</h2>
        <p>目標句：{item.spoken}</p>
        {records === null ? <p>載入中…</p> : !records.length ? <p>這一題還沒有口說錄音。</p> : records.map(x => <article key={x.kind}>
          <h3>{x.kind === 'pass' ? '✅ 通過那次' : '通過前一次（或最近一次未通過）'} · {x.total_score} 分 · {when(x.createdAt)}</h3>
          <p>AI 聽到：{x.transcript}</p>
          <p>精準 {x.accuracy} · 流暢 {x.fluency} · 完整 {x.completeness} · 數量{x.numberOk ? '對' : '錯'} · are／&apos;s {x.verbOk ? '對' : '錯'} · 名詞 -s {x.nounOk ? '對' : '錯'}</p>
          <button className="secondary-button" disabled={busy} onClick={() => void run(() => play(x.kind))}>▶ 播放錄音</button>
          {clip?.kind === x.kind && <audio controls autoPlay src={clip.url} aria-label="學生錄音" />}
        </article>)}
      </section>}
      <DeleteLog log={log} />
      {target && <DeleteDialog studentId={target} activity={v2 ? 'Safari Count 2（第 2 版）' : 'Safari Count'} busy={busy} onCancel={() => setTarget(null)} onConfirm={() => void run(() => remove(target))} />}
      <button className="secondary-button" disabled={busy} onClick={() => void run(async () => { await portal('logout'); setSignedIn(false); setRows(null); setPick(null); setClip(null); setLog(null); setNotice('') })}>登出</button>
    </>}
    {error && <p role="alert">{error}</p>}
  </main>
}
