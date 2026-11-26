// Teacher "delete this pupil's record" (RDQ 2026-11-26), shared by the World Routines (I, he/she) and Safari Count teacher pages.
// Right click on a student ID (computer) or press and hold about 0.6 s (iPad) opens the dialog; the teacher must type the same ID.
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import './student-delete.css'

export type DeleteEntry = { studentId: string; classId: string; summary: string; deletedAt: number }
const when = (ms: number) => new Date(ms).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export function useStudentMenu(open: (studentId: string) => void) {
  const timer = useRef<number | null>(null)
  const clear = () => { if (timer.current) { window.clearTimeout(timer.current); timer.current = null } }
  useEffect(() => clear, [])
  return (studentId: string) => ({
    className: 'sd-id',
    title: '按右鍵（iPad 長按）可以刪除這位學生在這個活動的紀錄',
    onContextMenu: (e: MouseEvent) => { e.preventDefault(); clear(); open(studentId) },
    onPointerDown: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return
      clear(); timer.current = window.setTimeout(() => { timer.current = null; open(studentId) }, 600)
    },
    onPointerUp: clear, onPointerLeave: clear, onPointerCancel: clear,
  })
}

export function downloadCsv(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function DeleteDialog({ studentId, activity, busy, onCancel, onConfirm }: { studentId: string; activity: string; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  const [typed, setTyped] = useState(''), input = useRef<HTMLInputElement>(null)
  useEffect(() => { input.current?.focus() }, [])
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel() }
    window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc)
  }, [busy, onCancel])
  const match = typed.trim() === studentId
  return <div className="sd-backdrop">
    <section className="sd-dialog" role="dialog" aria-modal="true" aria-labelledby="sd-title">
      <h2 id="sd-title">刪除 {studentId} 的紀錄？</h2>
      <p>會刪掉這位學生在「{activity}」的<strong>進度和分數</strong>（過關、蓋章、星數、分鐘、提示數），學生再登入要從頭開始。刪掉的進度<strong>救不回來</strong>。</p>
      <p>口說錄音保留，七個月後自動刪除；其他活動的紀錄不受影響。按下刪除前會先下載這位學生的 CSV 備份。</p>
      <form onSubmit={e => { e.preventDefault(); if (match && !busy) onConfirm() }}>
        <label>請輸入學號 <b>{studentId}</b> 確認
          <input ref={input} inputMode="numeric" autoComplete="off" value={typed} onChange={e => setTyped(e.target.value)} /></label>
        <div className="sd-actions">
          <button type="button" className="secondary-button" disabled={busy} onClick={onCancel}>取消</button>
          <button type="submit" className="primary-button sd-danger" disabled={busy || !match}>確定刪除</button>
        </div>
      </form>
    </section>
  </div>
}

export function DeleteLog({ log }: { log: DeleteEntry[] | null }) {
  if (!log) return null
  return <section className="section-block sd-log" aria-label="刪除紀錄">
    <h2>刪除紀錄</h2>
    {!log.length ? <p>這個活動還沒有刪除過學生紀錄。</p> : <ul>{log.map(x => <li key={x.studentId + x.deletedAt}>{when(x.deletedAt)} · {x.classId} 班 · <b>{x.studentId}</b> · {x.summary}</li>)}</ul>}
    <p><small>最近 50 筆，保存七個月。</small></p>
  </section>
}
