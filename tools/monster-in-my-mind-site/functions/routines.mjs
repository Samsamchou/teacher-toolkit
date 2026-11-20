// World Routines Trip (HWG7 U04): student progress, drag answers, speaking assessment, teacher views.
import { hash, taipeiDay, expiryDate, validateAudio, parseResult } from './core.mjs'
import { diagnostic } from './assessment-provider.mjs'
import { studentIdentity, CLASSES } from './portal-core.mjs'
import { STATIONS, SPEAK_DAILY_LIMIT, stationFor, routineRecordId, routineQuotaId, spokenTimeCorrect, speakingPassed,
  checkDragAnswer, routinesScoringPrompt, parseRoutineResult } from './routines-core.mjs'

const schema = {type:'OBJECT', required:['transcript','said_time','accuracy','fluency','completeness','feedback'], properties:{
  transcript:{type:'STRING'}, said_time:{type:'STRING'}, accuracy:{type:'NUMBER'}, fluency:{type:'NUMBER'}, completeness:{type:'NUMBER'}, feedback:{type:'STRING'},
}}

export function createRoutines({db, bucket, Timestamp, HttpsError, member, safeInput, assess}) {
  const progressRef = studentKey => db.doc('routines_progress/' + studentKey)
  const view = data => Object.fromEntries(STATIONS.map(station => {
    const x = data?.stations?.[station.id] ?? {}
    return [station.id, {answered: Boolean(x.answeredAt), gameDone: Boolean(x.gameDoneAt), stars: x.stars ?? 0, score: x.score ?? null}]
  }))
  async function remaining(studentKey) {
    const quota = (await db.doc('routines_quotas/' + routineQuotaId(studentKey, taipeiDay())).get()).data()
    return Math.max(0, SPEAK_DAILY_LIMIT - (quota?.used ?? 0))
  }
  const identityFields = m => ({studentKey: m.studentKey, studentId: m.studentId ?? null, classId: m.classId ?? null})
  async function markAnswered(m, station, extra) {
    const ref = progressRef(m.studentKey)
    await db.runTransaction(async tx => {
      const doc = await tx.get(ref), stations = {...(doc.data()?.stations ?? {})}
      stations[station.id] = {...(stations[station.id] ?? {}), mode: station.mode, answeredAt: stations[station.id]?.answeredAt ?? Date.now(), ...extra}
      tx.set(ref, {...identityFields(m), stations, updatedAt: Date.now(), expiresAt: Timestamp.fromDate(expiryDate())})
    })
  }

  async function state(req) {
    const m = await member(req)
    const doc = await progressRef(m.studentKey).get()
    return {stations: view(doc.data()), remaining: await remaining(m.studentKey), studentId: m.studentId ?? null}
  }

  async function answer(req) {
    const m = await member(req), data = req.data ?? {}
    const station = safeInput(() => stationFor(data.station))
    const check = safeInput(() => checkDragAnswer(station, data.slots, data.code))
    const passed = check.slotsCorrect && check.codeCorrect
    if (passed) await markAnswered(m, station, {})
    return {...check, passed, sentence: passed ? station.spoken : null}
  }

  async function speak(req) {
    const m = await member(req), data = req.data ?? {}
    const station = safeInput(() => stationFor(data.station))
    if (station.mode !== 'speak') throw new HttpsError('invalid-argument', 'Invalid station mode')
    if (typeof data.attemptId !== 'string' || !/^[a-zA-Z0-9-]{16,64}$/.test(data.attemptId)) throw new HttpsError('invalid-argument', 'Invalid attempt ID')
    const audio = safeInput(() => validateAudio(data.audio))
    const day = taipeiDay(), quotaRef = db.doc('routines_quotas/' + routineQuotaId(m.studentKey, day))
    // Reserve one of today's 30 assessments before calling the model; give it back if the call fails.
    await db.runTransaction(async tx => {
      const used = (await tx.get(quotaRef)).data()?.used ?? 0
      if (used >= SPEAK_DAILY_LIMIT) throw new HttpsError('resource-exhausted', `今天已達 ${SPEAK_DAILY_LIMIT} 次口說評分上限，明天再試。`)
      tx.set(quotaRef, {used: used + 1, day, studentKey: m.studentKey, expiresAt: Timestamp.fromDate(expiryDate())})
    })
    let result
    try {
      result = await assess(routinesScoringPrompt(station.spoken), audio, schema, raw => parseRoutineResult(raw, parseResult))
    } catch (error) {
      diagnostic('routines', 'provider', error)
      await db.runTransaction(async tx => {
        const used = (await tx.get(quotaRef)).data()?.used ?? 1
        tx.set(quotaRef, {used: Math.max(0, used - 1)}, {merge: true})
      })
      throw new HttpsError('unavailable', 'AI 暫時無法評分，請稍後重送；不扣次數。')
    }
    const timeCorrect = spokenTimeCorrect(result.transcript, result.said_time, station)
    const passed = speakingPassed(result.total_score, timeCorrect)
    // Keep exactly two recordings per station: the passing attempt and the attempt just before it.
    const kind = passed ? 'pass' : 'prev'
    const id = routineRecordId(m.studentKey, station.id, kind), expiresAt = expiryDate()
    const audioPath = `routines-recordings/${m.studentKey}/${station.id}-${kind}.wav`
    const already = passed ? false : Boolean((await progressRef(m.studentKey).get()).data()?.stations?.[station.id]?.answeredAt)
    if (!already) {
      // After a pass, later practice attempts are scored but no longer replace the saved "previous" attempt.
      await bucket().file(audioPath).save(audio, {resumable: false, contentType: 'audio/wav', metadata: {metadata: {expiresAt: expiresAt.toISOString()}}})
      await db.doc('routines_records/' + id).set({...identityFields(m), station: station.id, kind, targetText: station.spoken, audioPath, audioHash: hash(audio),
        transcript: result.transcript, saidTime: result.said_time, accuracy: result.accuracy, fluency: result.fluency, completeness: result.completeness,
        total_score: result.total_score, feedback: result.feedback, timeCorrect, passed, day, createdAt: Date.now(), expiresAt: Timestamp.fromDate(expiresAt)})
    }
    if (passed) await markAnswered(m, station, {score: result.total_score})
    return {transcript: result.transcript, accuracy: result.accuracy, fluency: result.fluency, completeness: result.completeness, total_score: result.total_score,
      feedback: result.feedback, timeCorrect, passed, remaining: await remaining(m.studentKey), sentence: passed ? station.spoken : null}
  }

  async function gameDone(req) {
    const m = await member(req), data = req.data ?? {}
    const station = safeInput(() => stationFor(data.station))
    const stars = Number.isInteger(data.stars) ? Math.max(0, Math.min(3, data.stars)) : 0
    const gameScore = Number.isFinite(data.score) ? Math.max(0, Math.min(1000000, Math.round(data.score))) : 0
    // Minutes from entering the station to the stamp, measured on the pupil's device: a rough guide for lesson planning only.
    const minutes = Number.isFinite(data.minutes) ? Math.max(0, Math.min(600, Math.round(data.minutes * 10) / 10)) : null
    const ref = progressRef(m.studentKey)
    await db.runTransaction(async tx => {
      const doc = await tx.get(ref), stations = {...(doc.data()?.stations ?? {})}, current = stations[station.id]
      if (!current?.answeredAt) throw new HttpsError('failed-precondition', '請先完成這一站的解謎與作答。')
      stations[station.id] = {...current, gameDoneAt: current.gameDoneAt ?? Date.now(), stars: Math.max(current.stars ?? 0, stars), gameScore: Math.max(current.gameScore ?? 0, gameScore), minutes: current.minutes ?? minutes}
      tx.set(ref, {...doc.data(), stations, updatedAt: Date.now()})
    })
    return {stations: view((await ref.get()).data())}
  }

  // Teacher portal actions (already behind the six-digit PIN session). Returns undefined for other actions.
  async function teacherAction(action, body, fail) {
    if (action === 'routines') {
      if (!CLASSES.includes(body.classId)) fail(400, '請選擇班級。')
      const docs = await db.collection('routines_progress').where('classId', '==', body.classId).get()
      return {students: docs.docs.map(doc => { const x = doc.data(); return {studentId: x.studentId, updatedAt: x.updatedAt,
        stations: Object.fromEntries(STATIONS.map(station => { const s = x.stations?.[station.id] ?? {}
          return [station.id, {mode: station.mode, answered: Boolean(s.answeredAt), score: s.score ?? null, gameDone: Boolean(s.gameDoneAt), stars: s.stars ?? 0, gameScore: s.gameScore ?? 0, minutes: s.minutes ?? null}] }))} })
        .sort((a, b) => String(a.studentId).localeCompare(String(b.studentId))), stations: STATIONS.map(s => ({id: s.id, country: s.country, mode: s.mode}))}
    }
    if (action === 'routineRecords') {
      let id; try { id = studentIdentity(body.studentId) } catch { fail(400, '學號格式不正確。') }
      const station = STATIONS.find(x => x.id === body.station) ?? fail(400, '站別不正確。')
      const docs = await Promise.all(['prev', 'pass'].map(kind => db.doc('routines_records/' + routineRecordId(id.studentKey, station.id, kind)).get()))
      return {records: docs.filter(d => d.exists && d.data().expiresAt.toMillis() > Date.now()).map(d => { const x = d.data(); return {kind: x.kind, targetText: x.targetText,
        transcript: x.transcript, total_score: x.total_score, accuracy: x.accuracy, fluency: x.fluency, completeness: x.completeness, timeCorrect: x.timeCorrect, passed: x.passed, createdAt: x.createdAt} })}
    }
    if (action === 'routineRecording') {
      let id; try { id = studentIdentity(body.studentId) } catch { fail(400, '學號格式不正確。') }
      const station = STATIONS.find(x => x.id === body.station) ?? fail(400, '站別不正確。')
      if (!['prev', 'pass'].includes(body.kind)) fail(400, '錄音類別不正確。')
      const doc = await db.doc('routines_records/' + routineRecordId(id.studentKey, station.id, body.kind)).get()
      if (!doc.exists || doc.data().expiresAt.toMillis() <= Date.now()) fail(404, '錄音不存在或已到期。')
      const [audio] = await bucket().file(doc.data().audioPath).download()
      return {audio: audio.toString('base64')}
    }
    return undefined
  }

  async function purge() {
    for (let page = 0; page < 20; page++) {
      const batch = await db.collection('routines_records').where('expiresAt', '<=', Timestamp.now()).limit(100).get()
      if (batch.empty) break
      for (const doc of batch.docs) { await bucket().file(doc.data().audioPath).delete({ignoreNotFound: true}); await doc.ref.delete() }
    }
    for (const name of ['routines_progress', 'routines_quotas']) {
      const expired = await db.collection(name).where('expiresAt', '<=', Timestamp.now()).limit(400).get()
      if (!expired.empty) { const write = db.batch(); expired.docs.forEach(doc => write.delete(doc.ref)); await write.commit() }
    }
  }
  return {state, answer, speak, gameDone, teacherAction, purge}
}
