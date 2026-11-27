// Teacher "delete this pupil's record" for World Routines (I and he/she) and Safari Count (RDQ 2026-11-26).
// Only the progress document of one activity is removed; speaking recordings stay and expire after seven months as before.
// Every deletion is written to teacher_delete_log (activity, class, student ID, what was done), kept seven months.
import { expiryDate } from './core.mjs'
import { studentIdentity } from './portal-core.mjs'

export const DELETE_LOG = 'teacher_delete_log'
export const ACTIVITIES = ['routines-i', 'routines-hs', 'safari', 'safari2']

export function createStudentDelete({db, Timestamp}) {
  // body.confirm must repeat the student ID: the page asks the teacher to type it, and the server checks it again.
  async function remove(activity, progressCollection, body, fail, summarize) {
    if (!ACTIVITIES.includes(activity)) fail(400, '活動版本不正確。')
    let id; try { id = studentIdentity(body.studentId) } catch { fail(400, '學號格式不正確。') }
    if (typeof body.confirm !== 'string' || body.confirm.trim() !== id.studentId) fail(400, '請輸入相同的學號才能刪除。')
    const ref = db.doc(`${progressCollection}/` + id.studentKey), doc = await ref.get()
    if (!doc.exists) fail(404, '找不到這位學生在這個活動的紀錄。')
    const data = doc.data(), summary = summarize(data)
    await ref.delete()
    const deletedAt = Date.now()
    await db.doc(`${DELETE_LOG}/${activity}-${id.studentKey.slice(0, 16)}-${deletedAt}`).set({activity, studentId: id.studentId, classId: data.classId ?? id.classId,
      summary, deletedAt, expiresAt: Timestamp.fromDate(expiryDate())})
    return {deleted: true, studentId: id.studentId, summary}
  }
  // Newest first, at most 50; expired entries are removed while listing (no extra scheduled job).
  async function list(activity, fail) {
    if (!ACTIVITIES.includes(activity)) fail(400, '活動版本不正確。')
    const docs = (await db.collection(DELETE_LOG).where('activity', '==', activity).get()).docs
    const now = Date.now(), alive = []
    for (const d of docs) {
      const x = d.data()
      if (x.expiresAt?.toMillis() <= now) await d.ref.delete()
      else alive.push({studentId: x.studentId, classId: x.classId, summary: x.summary, deletedAt: x.deletedAt})
    }
    return {log: alive.sort((a, b) => b.deletedAt - a.deletedAt).slice(0, 50)}
  }
  return {remove, list}
}
