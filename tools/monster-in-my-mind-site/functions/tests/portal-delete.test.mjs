// Teacher "delete this pupil" for World Routines I and he/she (2026-11-26): each trip deletes only its own progress.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createRoutines } from '../routines.mjs'
import { BANKS } from '../routines-core.mjs'
import { studentIdentity } from '../portal-core.mjs'
import { DELETE_LOG } from '../portal-delete.mjs'

function fakeCloud() {
  const docs = new Map()
  const Timestamp = {fromDate: d => ({toMillis: () => d.getTime()}), now: () => ({toMillis: () => Date.now()})}
  const snap = path => ({exists: docs.has(path), data: () => docs.get(path), ref: {delete: async () => docs.delete(path)}})
  const doc = path => ({path, get: async () => snap(path), set: async v => docs.set(path, v), delete: async () => docs.delete(path)})
  const db = {doc, collection: name => ({where: (field, _op, value) => ({get: async () => ({docs: [...docs.keys()].filter(k => k.startsWith(name + '/') && docs.get(k)[field] === value).map(snap)})})})}
  class HttpsError extends Error { constructor(code, msg) { super(msg); this.code = code } }
  return {docs, db, bucket: () => ({}), Timestamp, HttpsError}
}
const fail = (status, text) => { throw new Error(`${status} ${text}`) }

test('World Routines: delete one pupil in one trip only, log it, keep the other trip', async () => {
  const cloud = fakeCloud(), K = studentIdentity('60105').studentKey
  const routines = createRoutines({...cloud, member: async () => ({}), safeInput: fn => fn(), assess: async () => ({})})
  const [a, b] = BANKS.i
  cloud.docs.set('routines_progress/' + K, {studentId: '60105', classId: '601', stations: {[a.id]: {answeredAt: 1, gameDoneAt: 2}, [b.id]: {answeredAt: 3}}})
  cloud.docs.set('routines_hs_progress/' + K, {studentId: '60105', classId: '601', stations: {}})
  cloud.docs.set('routines_records/x', {studentKey: K})
  await assert.rejects(routines.teacherAction('routineDelete', {studentId: '60105'}, fail), /相同的學號/)
  await assert.rejects(routines.teacherAction('routineDelete', {studentId: 'abc', confirm: 'abc'}, fail), /學號格式/)
  const r = await routines.teacherAction('routineDelete', {studentId: '60105', confirm: '60105'}, fail)
  assert.deepEqual(r, {deleted: true, studentId: '60105', summary: '完成 1 站、作答 2 站'})
  assert.equal(cloud.docs.has('routines_progress/' + K), false)
  assert.ok(cloud.docs.has('routines_hs_progress/' + K)); assert.ok(cloud.docs.has('routines_records/x'))
  await assert.rejects(routines.teacherAction('routineDelete', {studentId: '60105', confirm: '60105'}, fail), /找不到/)
  assert.equal((await routines.teacherAction('routineDeleteLog', {variant: 'hs'}, fail)).log.length, 0)
  const hs = await routines.teacherAction('routineDelete', {variant: 'hs', studentId: '60105', confirm: '60105'}, fail)
  assert.equal(hs.summary, '完成 0 站、作答 0 站')
  const logI = (await routines.teacherAction('routineDeleteLog', {}, fail)).log, logHs = (await routines.teacherAction('routineDeleteLog', {variant: 'hs'}, fail)).log
  assert.deepEqual(logI.map(x => [x.studentId, x.classId]), [['60105', '601']]); assert.equal(logHs.length, 1)
  // Expired log entries are removed while listing.
  cloud.docs.set(`${DELETE_LOG}/old`, {activity: 'routines-i', studentId: '60101', classId: '601', summary: '', deletedAt: 1, expiresAt: cloud.Timestamp.fromDate(new Date(0))})
  assert.equal((await routines.teacherAction('routineDeleteLog', {}, fail)).log.length, 1)
  assert.equal(cloud.docs.has(`${DELETE_LOG}/old`), false)
})
