// Safari Count (HWG5 U4) at /safari-count: student progress, server-side checks, speaking assessment, teacher views.
// Its own collections (safari_progress, safari_records) and storage folder (safari-recordings/). The daily speaking
// allowance is World Routines' routines_quotas document: one cost cap of 30 AI assessments per pupil per day for both.
import { hash, taipeiDay, expiryDate, validateAudio, parseResult } from './core.mjs'
import { diagnostic } from './assessment-provider.mjs'
import { studentIdentity, CLASSES } from './portal-core.mjs'
import { createStudentDelete } from './portal-delete.mjs'
import { SPEAK_DAILY_LIMIT, routineQuotaId } from './routines-core.mjs'
import { READY, stationFor, itemFor, publicStations, checkPuzzle, checkCount, checkDrag, sceneOf, spokenCountCheck, speakingPassed,
  safariScoringPrompt, SPEAK_SCHEMA, progressView, stationView, stepAllowed, safariRecordId, teacherCells, teacherStations } from './safari-core.mjs'

export const STORE = {progress: 'safari_progress', records: 'safari_records', audio: 'safari-recordings', quotas: 'routines_quotas'}

export function createSafari({db, bucket, Timestamp, HttpsError, member, safeInput, assess}) {
  const progressRef = studentKey => db.doc(`${STORE.progress}/` + studentKey)
  const removal = createStudentDelete({db, Timestamp})
  const identityFields = m => ({studentKey: m.studentKey, studentId: m.studentId ?? null, classId: m.classId ?? null})
  async function remaining(studentKey) {
    const quota = (await db.doc(`${STORE.quotas}/` + routineQuotaId(studentKey, taipeiDay())).get()).data()
    return Math.max(0, SPEAK_DAILY_LIMIT - (quota?.used ?? 0))
  }
  const target = data => {
    const station = safeInput(() => stationFor(data?.station))
    const item = safeInput(() => itemFor(station, data?.item))
    return {station, item}
  }
  // Read-check-write in one transaction: change(stationProgress) returns the new station progress, or throws.
  async function update(m, station, change) {
    const ref = progressRef(m.studentKey)
    let after
    await db.runTransaction(async tx => {
      const doc = await tx.get(ref), stations = {...(doc.data()?.stations ?? {})}
      after = change(structuredClone(stations[station.id] ?? {}))
      stations[station.id] = after
      tx.set(ref, {...identityFields(m), stations, updatedAt: Date.now(), expiresAt: Timestamp.fromDate(expiryDate())})
    })
    return after
  }
  const itemPatch = (x, key, patch) => ({...x, items: {...(x.items ?? {}), [key]: {...(x.items?.[key] ?? {}), ...patch(x.items?.[key] ?? {})}}})
  const order = (allowed, text) => { if (!allowed) throw new HttpsError('failed-precondition', text) }

  async function state(req) {
    const m = await member(req)
    const doc = await progressRef(m.studentKey).get()
    return {stations: publicStations(), progress: progressView(doc.data()), remaining: await remaining(m.studentKey), studentId: m.studentId ?? null}
  }

  async function puzzle(req) {
    const m = await member(req), {station, item} = target(req.data)
    if (!item) throw new HttpsError('invalid-argument', 'Invalid question')
    const passed = safeInput(() => checkPuzzle(item, req.data?.guess))
    const x = await update(m, station, x => itemPatch(x, item.key, p => p.puzzleAt ? {} : passed ? {puzzleAt: Date.now()} : {puzzleTries: (p.puzzleTries ?? 0) + 1}))
    return {passed, ...(x.items[item.key].puzzleAt ? {scene: sceneOf(item)} : {})}
  }

  async function count(req) {
    const m = await member(req), {station, item} = target(req.data)
    if (!item) throw new HttpsError('invalid-argument', 'Invalid question')
    const passed = safeInput(() => checkCount(item, req.data?.count))
    await update(m, station, x => {
      order(stepAllowed('count', station, item, x), '請先解開謎題。')
      return itemPatch(x, item.key, p => p.countAt ? {} : passed ? {countAt: Date.now()} : {countTries: (p.countTries ?? 0) + 1})
    })
    return {passed}
  }

  async function answer(req) {
    const m = await member(req), {station, item} = target(req.data)
    const passed = safeInput(() => checkDrag(station, item, req.data?.slots))
    await update(m, station, x => {
      order(stepAllowed('answer', station, item, x), item ? '請先數一數動物。' : '請先完成這一站的兩種動物。')
      if (!passed) return x
      return item ? itemPatch(x, item.key, p => p.answeredAt ? {} : {answeredAt: Date.now()}) : {...x, likeAt: x.likeAt ?? Date.now()}
    })
    return {passed, sentence: passed && item ? item.spoken : null}
  }

  async function speak(req) {
    const m = await member(req), data = req.data ?? {}, {station, item} = target(data)
    if (!item || item.mode !== 'speak') throw new HttpsError('invalid-argument', 'Invalid question mode')
    if (typeof data.attemptId !== 'string' || !/^[a-zA-Z0-9-]{16,64}$/.test(data.attemptId)) throw new HttpsError('invalid-argument', 'Invalid attempt ID')
    const audio = safeInput(() => validateAudio(data.audio))
    const before = (await progressRef(m.studentKey).get()).data()?.stations?.[station.id]
    order(stepAllowed('answer', station, item, before), '請先數一數動物。')
    const day = taipeiDay(), quotaRef = db.doc(`${STORE.quotas}/` + routineQuotaId(m.studentKey, day))
    // Reserve one of today's assessments before calling the model; give it back if the call fails.
    await db.runTransaction(async tx => {
      const used = (await tx.get(quotaRef)).data()?.used ?? 0
      if (used >= SPEAK_DAILY_LIMIT) throw new HttpsError('resource-exhausted', `今天已達 ${SPEAK_DAILY_LIMIT} 次口說評分上限，明天再試。`)
      tx.set(quotaRef, {used: used + 1, day, studentKey: m.studentKey, expiresAt: Timestamp.fromDate(expiryDate())})
    })
    let result
    try {
      result = await assess(safariScoringPrompt(item), audio, SPEAK_SCHEMA, raw => parseResult(raw))
    } catch (error) {
      diagnostic('safari', 'provider', error)
      await db.runTransaction(async tx => {
        const used = (await tx.get(quotaRef)).data()?.used ?? 1
        tx.set(quotaRef, {used: Math.max(0, used - 1)}, {merge: true})
      })
      throw new HttpsError('unavailable', 'AI 暫時無法評分，請稍後重送；不扣次數。')
    }
    const check = spokenCountCheck(result.transcript, item)
    const passed = speakingPassed(result.total_score, check)
    // Keep two recordings per question, like World Routines: the passing attempt and the attempt just before it.
    const kind = passed ? 'pass' : 'prev', already = Boolean(before?.items?.[item.key]?.answeredAt)
    if (!already) {
      const expiresAt = expiryDate(), audioPath = `${STORE.audio}/${m.studentKey}/${station.id}-${item.key}-${kind}.wav`
      await bucket().file(audioPath).save(audio, {resumable: false, contentType: 'audio/wav', metadata: {metadata: {expiresAt: expiresAt.toISOString()}}})
      await db.doc(`${STORE.records}/` + safariRecordId(m.studentKey, station.id, item.key, kind)).set({...identityFields(m), station: station.id, item: item.key, kind,
        targetText: item.spoken, audioPath, audioHash: hash(audio), transcript: result.transcript, accuracy: result.accuracy, fluency: result.fluency,
        completeness: result.completeness, total_score: result.total_score, feedback: result.feedback, ...check, passed, day, createdAt: Date.now(),
        expiresAt: Timestamp.fromDate(expiresAt)})
    }
    if (passed) await update(m, station, x => itemPatch(x, item.key, p => ({answeredAt: p.answeredAt ?? Date.now(), score: Math.max(p.score ?? 0, result.total_score)})))
    return {transcript: result.transcript, accuracy: result.accuracy, fluency: result.fluency, completeness: result.completeness, total_score: result.total_score,
      feedback: result.feedback, ...check, passed, remaining: await remaining(m.studentKey), sentence: passed ? item.spoken : null}
  }

  async function stamp(req) {
    const m = await member(req), data = req.data ?? {}
    const station = safeInput(() => stationFor(data.station))
    // Minutes from entering the station to the stamp, measured on the pupil's device: a rough guide for lesson planning only.
    const minutes = Number.isFinite(data.minutes) ? Math.max(0, Math.min(600, Math.round(data.minutes * 10) / 10)) : null
    // The photo game result is reported by the page (like World Routines' game): kept as the best of all plays.
    const stars = Number.isInteger(data.stars) ? Math.max(0, Math.min(3, data.stars)) : 0
    const gameScore = Number.isFinite(data.gameScore) ? Math.max(0, Math.min(1000, Math.round(data.gameScore))) : 0
    const x = await update(m, station, x => {
      order(stepAllowed('stamp', station, null, x), '請先完成這一站的所有題目。')
      return {...x, stampAt: x.stampAt ?? Date.now(), minutes: x.minutes ?? minutes, stars: Math.max(x.stars ?? 0, stars), gameScore: Math.max(x.gameScore ?? 0, gameScore)}
    })
    return {station: stationView(station, x)}
  }

  // Teacher portal actions (already behind the six-digit PIN session). Returns undefined for other actions.
  async function teacherAction(action, body, fail) {
    if (!['safari', 'safariRecords', 'safariRecording', 'safariDelete', 'safariDeleteLog'].includes(action)) return undefined
    // Delete one pupil's Safari progress (recordings stay); the log lists earlier deletions (teacher 11/26).
    if (action === 'safariDelete') return removal.remove('safari', STORE.progress, body, fail, x => {
      const s = x.stations ?? {}, items = READY.flatMap(st => st.items.map(it => s[st.id]?.items?.[it.key]?.answeredAt))
      return `蓋章 ${READY.filter(st => s[st.id]?.stampAt).length} 國、作答 ${items.filter(Boolean).length} 題`
    })
    if (action === 'safariDeleteLog') return removal.list('safari', fail)
    if (action === 'safari') {
      if (!CLASSES.includes(body.classId)) fail(400, '請選擇班級。')
      const docs = await db.collection(STORE.progress).where('classId', '==', body.classId).get()
      return {students: docs.docs.map(doc => { const x = doc.data()
        return {studentId: x.studentId, updatedAt: x.updatedAt, stations: Object.fromEntries(READY.map(s => [s.id, teacherCells(s, x.stations?.[s.id])]))} })
        .sort((a, b) => String(a.studentId).localeCompare(String(b.studentId))), stations: teacherStations()}
    }
    let id; try { id = studentIdentity(body.studentId) } catch { fail(400, '學號格式不正確。') }
    const station = READY.find(x => x.id === body.station) ?? fail(400, '站別不正確。')
    const item = station.items.find(x => x.key === body.item && x.mode === 'speak') ?? fail(400, '題目不正確。')
    if (action === 'safariRecords') {
      const docs = await Promise.all(['prev', 'pass'].map(kind => db.doc(`${STORE.records}/` + safariRecordId(id.studentKey, station.id, item.key, kind)).get()))
      return {records: docs.filter(d => d.exists && d.data().expiresAt.toMillis() > Date.now()).map(d => { const x = d.data()
        return {kind: x.kind, targetText: x.targetText, transcript: x.transcript, total_score: x.total_score, accuracy: x.accuracy, fluency: x.fluency,
          completeness: x.completeness, numberOk: x.numberOk, verbOk: x.verbOk, nounOk: x.nounOk, passed: x.passed, createdAt: x.createdAt} })}
    }
    if (!['prev', 'pass'].includes(body.kind)) fail(400, '錄音類別不正確。')
    const doc = await db.doc(`${STORE.records}/` + safariRecordId(id.studentKey, station.id, item.key, body.kind)).get()
    if (!doc.exists || doc.data().expiresAt.toMillis() <= Date.now()) fail(404, '錄音不存在或已到期。')
    const [audio] = await bucket().file(doc.data().audioPath).download()
    return {audio: audio.toString('base64')}
  }

  // Seven-month expiry, like World Routines (routines_quotas are purged by World Routines).
  async function purge() {
    for (let page = 0; page < 20; page++) {
      const batch = await db.collection(STORE.records).where('expiresAt', '<=', Timestamp.now()).limit(100).get()
      if (batch.empty) break
      for (const doc of batch.docs) { await bucket().file(doc.data().audioPath).delete({ignoreNotFound: true}); await doc.ref.delete() }
    }
    const expired = await db.collection(STORE.progress).where('expiresAt', '<=', Timestamp.now()).limit(400).get()
    if (!expired.empty) { const write = db.batch(); expired.docs.forEach(doc => write.delete(doc.ref)); await write.commit() }
  }
  return {state, puzzle, count, answer, speak, stamp, teacherAction, purge}
}
