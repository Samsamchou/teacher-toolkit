// Safari Count (HWG5 U4): bank shape, server checks, speaking grammar check, and the whole Taiwan flow on an in-memory store.
import test from 'node:test'
import assert from 'node:assert/strict'
import { READY, STATIONS, stationFor, itemFor, publicStations, checkPuzzle, checkCount, checkDrag, spokenCountCheck, speakingPassed,
  safariScoringPrompt, stepAllowed, safariRecordId } from '../safari-core.mjs'
import { createSafari, STORE } from '../safari.mjs'
import { routineQuotaId } from '../routines-core.mjs'
import { taipeiDay } from '../core.mjs'
import { studentIdentity } from '../portal-core.mjs'

const TW = stationFor('taiwan'), PANDA = itemFor(TW, 'panda'), BEARS = itemFor(TW, 'bears')

test('bank: six countries in map order, Taiwan ready with one drag and one speak item', () => {
  assert.deepEqual(STATIONS.map(s => s.id), ['taiwan', 'japan', 'kenya', 'india', 'singapore', 'australia'])
  assert.equal(READY.length, 6) // 11/26 all six stations open
  for (const s of READY) {
    assert.equal(s.items.length, 2)
    for (const it of s.items) {
      assert.match(it.answer, /^[A-Z]+$/); assert.ok(it.count >= 1 && it.count <= 9)
      assert.match(it.question, new RegExp(`How many ${it.plural} are there\\?$`))
      assert.equal(it.spoken, it.count === 1 ? `There is one ${it.word}.` : it.spoken)
      if (it.drag) { const slots = it.drag.flatMap(l => l.slots); for (const d of it.distractors) assert.ok(!slots.includes(d), `distractor ${d} repeats an answer`) }
      assert.ok(it.picture, 'count picture')
      assert.deepEqual(spokenCountCheck(it.spoken, it), {numberOk: true, verbOk: true, nounOk: true}, it.spoken)
    }
  }
  assert.throws(() => stationFor('mars')) // unknown station
  assert.throws(() => itemFor(TW, 'koalas'))
  assert.equal(itemFor(TW, 'like'), null)
})

test('public view never carries answers, counts, slot orders or the like answer', () => {
  const view = JSON.stringify(publicStations())
  for (const key of ['"answer"', '"count"', '"spoken"', '"slots"', '"yes"', '"distractors"', '"emoji"', '"picture"']) assert.ok(!view.includes(key), key)
  const tw = publicStations()[0]
  assert.equal(tw.items[0].drag.chips.length, 9)
  assert.equal(tw.like.clue, 'I love pandas!')   // the buddy's words are the evidence for the like answer (teacher 11/25)
  assert.deepEqual([...tw.items[0].drag.chips].sort(), [...PANDA.drag.flatMap(l => l.slots), ...PANDA.distractors].sort())
  assert.equal(tw.items[1].drag, undefined)
  // The animal is hidden before the puzzle (teacher 11/25): no animal word outside the card name and the drag chips.
  assert.equal(tw.items[0].question, 'Look! How many ___ are there?'); assert.equal(tw.items[1].question, 'How many ___ are there?')
  for (const it of tw.items) { assert.equal(it.plural, undefined); assert.doesNotMatch(it.question, /panda|bear/i) }
  assert.ok(publicStations().every(s => !s.comingSoon && s.items.length === 2))
  // Japan (opened 11/25): the like answer is No, so the buddy's clue names the animal the buddy does like.
  const jp = publicStations()[1]
  assert.equal(jp.like.clue, 'I like horses!'); assert.equal(jp.like.sentence, '___, PRONOUN ___. Pronoun ___ horses.')
  assert.equal(jp.items[1].question, "Let's get off the bus and go to the farm. How many ___ are there?")
})

test('puzzle, count and drag checks', () => {
  assert.equal(checkPuzzle(PANDA, 'panda'), true); assert.equal(checkPuzzle(PANDA, ' P-a-n-d-a '), true)
  assert.equal(checkPuzzle(PANDA, 'pandas'), false); assert.equal(checkPuzzle(BEARS, 'BEAR'), false)
  assert.throws(() => checkPuzzle(PANDA, 5)); assert.throws(() => checkPuzzle(PANDA, 'x'.repeat(21)))
  assert.equal(checkCount(PANDA, 1), true); assert.equal(checkCount(BEARS, 2), true); assert.equal(checkCount(BEARS, 3), false)
  assert.throws(() => checkCount(BEARS, '2')); assert.throws(() => checkCount(BEARS, 2.5))
  assert.equal(checkDrag(TW, PANDA, ['many', 'pandas', 'are', 'is', 'one']), true)
  assert.equal(checkDrag(TW, PANDA, ['many', 'pandas', 'are', "'s", 'one']), false)
  assert.equal(checkDrag(TW, PANDA, ['many', 'panda', 'are', 'is', 'one']), false)
  assert.equal(checkDrag(TW, PANDA, ['many', 'pandas', 'are', 'are', 'one']), false)
  assert.throws(() => checkDrag(TW, PANDA, ['many']))
  assert.throws(() => checkDrag(TW, BEARS, ['a']))
  assert.equal(checkDrag(TW, null, ['Yes', 'does']), true); assert.equal(checkDrag(TW, null, ['Yes', 'do']), false)
})

test('speaking: number, are / is and the plural -s come from the transcript', () => {
  const ok = {numberOk: true, verbOk: true, nounOk: true}
  assert.deepEqual(spokenCountCheck('There are two bears.', BEARS), ok)
  assert.deepEqual(spokenCountCheck("there're 2 bears", BEARS), ok)
  assert.deepEqual(spokenCountCheck('There is two bears.', BEARS), {...ok, verbOk: false})
  assert.deepEqual(spokenCountCheck('There are two bear.', BEARS), {...ok, nounOk: false})
  assert.deepEqual(spokenCountCheck('There are three bears.', BEARS), {...ok, numberOk: false})
  assert.deepEqual(spokenCountCheck('[inaudible]', BEARS), {numberOk: false, verbOk: false, nounOk: false})
  assert.deepEqual(spokenCountCheck('There’s one panda.', PANDA), ok)
  assert.deepEqual(spokenCountCheck('There is one panda', PANDA), ok)
  assert.deepEqual(spokenCountCheck('There are one pandas.', PANDA), {numberOk: true, verbOk: false, nounOk: false})
  assert.deepEqual(spokenCountCheck('There is a panda.', PANDA), ok)   // teacher 11/25: "a" is right too
  assert.deepEqual(spokenCountCheck("There's a panda", PANDA), ok)
  assert.deepEqual(spokenCountCheck('There are a bears.', BEARS), {...ok, numberOk: false})
  assert.deepEqual(spokenCountCheck('There is two panda.', PANDA), {...ok, numberOk: false})
  assert.equal(speakingPassed(90, ok), true); assert.equal(speakingPassed(84, ok), false); assert.equal(speakingPassed(95, {...ok, nounOk: false}), false)
  assert.match(safariScoringPrompt(BEARS), /are 搭配複數名詞/); assert.match(safariScoringPrompt(PANDA), /There is（說 There's 也對）/)
  assert.match(safariScoringPrompt(BEARS), /There are two bears\./)
})

test('step order', () => {
  assert.equal(stepAllowed('count', TW, PANDA, {}), false)
  assert.equal(stepAllowed('count', TW, PANDA, {items: {panda: {puzzleAt: 1}}}), true)
  assert.equal(stepAllowed('answer', TW, PANDA, {items: {panda: {puzzleAt: 1}}}), false)
  assert.equal(stepAllowed('answer', TW, null, {items: {panda: {answeredAt: 1}}}), false)
  assert.equal(stepAllowed('stamp', TW, null, {items: {panda: {answeredAt: 1}, bears: {answeredAt: 1}}}), false)
  assert.equal(stepAllowed('stamp', TW, null, {items: {panda: {answeredAt: 1}, bears: {answeredAt: 1}}, likeAt: 1}), true)
})

// ---- In-memory Firestore / Storage, just enough for safari.mjs ----
function fakeCloud() {
  const docs = new Map(), files = new Map()
  const Timestamp = {fromDate: d => ({toMillis: () => d.getTime()}), now: () => ({toMillis: () => Date.now()})}
  // Deep copy of plain data; timestamps (objects with toMillis) are kept as they are.
  const copy = v => v && typeof v === 'object' && !v.toMillis ? (Array.isArray(v) ? v.map(copy) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copy(x)]))) : v
  const snap = (path) => ({exists: docs.has(path), data: () => docs.has(path) ? copy(docs.get(path)) : undefined, ref: {delete: async () => docs.delete(path)}})
  const doc = path => ({path, get: async () => snap(path), set: async (v, o) => docs.set(path, o?.merge ? {...docs.get(path), ...v} : v), delete: async () => docs.delete(path)})
  const db = {
    doc,
    runTransaction: async fn => fn({get: async ref => snap(ref.path), set: (ref, v, o) => docs.set(ref.path, o?.merge ? {...docs.get(ref.path), ...v} : v)}),
    collection: name => ({where: (field, _op, value) => ({get: async () => ({docs: [...docs.keys()].filter(k => k.startsWith(name + '/') && docs.get(k)[field] === value).map(snap)})})}),
  }
  const bucket = () => ({file: p => ({save: async b => files.set(p, b), download: async () => [files.get(p)]})})
  class HttpsError extends Error { constructor(code, msg) { super(msg); this.code = code } }
  return {docs, files, db, bucket, Timestamp, HttpsError}
}
function wav() {
  const n = 16000, b = Buffer.alloc(44 + n * 2)
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22)
  b.writeUInt32LE(16000, 24); b.writeUInt32LE(32000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(4000 * Math.sin(i / 5)), 44 + i * 2)
  return b.toString('base64')
}

test('Taiwan flow end to end: order enforced, speaking scored and recorded, teacher sees it', async () => {
  const cloud = fakeCloud()
  const m = studentIdentity('50107'), K = m.studentKey
  let heard = 'There is two bear.'
  const safari = createSafari({...cloud, member: async () => m, safeInput: fn => { try { return fn() } catch (e) { throw new cloud.HttpsError('invalid-argument', e.message) } },
    assess: async (_prompt, _audio, _schema, parse) => parse({transcript: heard, accuracy: 92, fluency: 90, completeness: 95, feedback: '很好！'})})
  const call = (fn, data) => safari[fn]({data})
  const s0 = await call('state', {})
  assert.equal(s0.remaining, 30); assert.equal(s0.progress.taiwan.items.panda.puzzle, false); assert.equal(s0.progress.taiwan.items.panda.scene, undefined)

  await assert.rejects(call('count', {station: 'taiwan', item: 'panda', count: 1}), /謎題/)
  assert.deepEqual(await call('puzzle', {station: 'taiwan', item: 'panda', guess: 'bear'}), {passed: false})
  assert.deepEqual(await call('puzzle', {station: 'taiwan', item: 'panda', guess: 'Panda'}), {passed: true, scene: {emoji: '🐼', count: 1, picture: 'taiwan-panda.jpg', question: 'Look! How many pandas are there?', plural: 'pandas'}})
  await assert.rejects(call('answer', {station: 'taiwan', item: 'panda', slots: ['many', 'pandas', 'are', 'is', 'one']}), /數一數/)
  assert.equal((await call('count', {station: 'taiwan', item: 'panda', count: 3})).passed, false)
  assert.equal((await call('count', {station: 'taiwan', item: 'panda', count: 1})).passed, true)
  assert.equal((await call('answer', {station: 'taiwan', item: 'panda', slots: ['many', 'pandas', 'are', "'s", 'one']})).passed, false)
  assert.deepEqual(await call('answer', {station: 'taiwan', item: 'panda', slots: ['many', 'pandas', 'are', 'is', 'one']}), {passed: true, sentence: 'There is one panda.'})

  await assert.rejects(call('answer', {station: 'taiwan', item: 'like', slots: ['Yes', 'does']}), /兩種動物/)
  await call('puzzle', {station: 'taiwan', item: 'bears', guess: 'BEARS'}); await call('count', {station: 'taiwan', item: 'bears', count: 2})
  await assert.rejects(call('speak', {station: 'taiwan', item: 'panda', attemptId: 'a'.repeat(20), audio: wav()}), /mode/)
  const r1 = await call('speak', {station: 'taiwan', item: 'bears', attemptId: 'a'.repeat(20), audio: wav()})
  assert.equal(r1.passed, false); assert.equal(r1.verbOk, false); assert.equal(r1.nounOk, false); assert.equal(r1.remaining, 29); assert.equal(r1.sentence, null)
  heard = 'There are two bears.'
  const r2 = await call('speak', {station: 'taiwan', item: 'bears', attemptId: 'b'.repeat(20), audio: wav()})
  assert.equal(r2.passed, true); assert.equal(r2.total_score, 93); assert.equal(r2.sentence, 'There are two bears.'); assert.equal(r2.remaining, 28)
  assert.equal(cloud.docs.get(`${STORE.quotas}/` + routineQuotaId(K, taipeiDay())).used, 2) // shared with World Routines
  assert.ok(cloud.files.has(`safari-recordings/${K}/taiwan-bears-prev.wav`)); assert.ok(cloud.files.has(`safari-recordings/${K}/taiwan-bears-pass.wav`))
  assert.ok(cloud.docs.has(`${STORE.records}/` + safariRecordId(K, 'taiwan', 'bears', 'pass')))

  await assert.rejects(call('stamp', {station: 'taiwan', minutes: 12}), /所有題目/)
  assert.equal((await call('answer', {station: 'taiwan', item: 'like', slots: ['No', 'doesn\'t']})).passed, false)
  assert.equal((await call('answer', {station: 'taiwan', item: 'like', slots: ['Yes', 'does']})).passed, true)
  const st = await call('stamp', {station: 'taiwan', minutes: 12.34, stars: 7, gameScore: 612.4})
  assert.equal(st.station.stamp, true); assert.equal(st.station.items.bears.score, 93)
  assert.equal(st.station.stars, 3); assert.equal(st.station.gameScore, 612) // stars clamped to 0-3
  const again = await call('stamp', {station: 'taiwan', stars: 1, gameScore: 300})   // replay keeps the best
  assert.equal(again.station.stars, 3); assert.equal(again.station.gameScore, 612)
  await assert.rejects(call('puzzle', {station: 'mars', item: 'zebras', guess: 'ZEBRAS'}), /Invalid station/)
  assert.equal(checkDrag(stationFor('india'), null, ['No', "doesn't", 'likes']), true)
  assert.equal(checkDrag(stationFor('kenya'), null, ['Yes', 'does']), true)
  assert.equal(checkDrag(stationFor('japan'), null, ['No', "doesn't", 'likes']), true)
  assert.equal(checkDrag(stationFor('japan'), null, ['No', "doesn't", 'like']), false)

  const fail = (status, text) => { throw new Error(`${status} ${text}`) }
  const t = await safari.teacherAction('safari', {classId: '501'}, fail)
  assert.equal(t.students.length, 1)
  const row = t.students[0].stations.taiwan
  assert.equal(row.items.panda.puzzleTries, 1); assert.equal(row.items.panda.countTries, 1); assert.equal(row.items.bears.score, 93)
  assert.equal(row.like, true); assert.equal(row.stamp, true); assert.equal(row.minutes, 12.3); assert.equal(row.stars, 3); assert.equal(row.gameScore, 612)
  assert.equal(await safari.teacherAction('routines', {}, fail), undefined)
  const recs = await safari.teacherAction('safariRecords', {studentId: '50107', station: 'taiwan', item: 'bears'}, fail)
  assert.deepEqual(recs.records.map(x => [x.kind, x.passed]).sort(), [['pass', true], ['prev', false]])
  await assert.rejects(safari.teacherAction('safariRecords', {studentId: '50107', station: 'taiwan', item: 'panda'}, fail), /題目/)
  const audio = await safari.teacherAction('safariRecording', {studentId: '50107', station: 'taiwan', item: 'bears', kind: 'pass'}, fail)
  assert.ok(audio.audio.length > 1000)

  // Teacher deletes the pupil (11/26): the typed ID must match, only safari_progress goes, recordings and other activities stay, the log keeps it.
  cloud.docs.set('routines_progress/' + K, {studentId: '50107', classId: '501', stations: {}})
  await assert.rejects(safari.teacherAction('safariDelete', {studentId: '50107', confirm: '50108'}, fail), /相同的學號/)
  await assert.rejects(safari.teacherAction('safariDelete', {studentId: '50199', confirm: '50199'}, fail), /找不到/)
  const del = await safari.teacherAction('safariDelete', {studentId: '50107', confirm: ' 50107 '}, fail)
  assert.equal(del.summary, '蓋章 1 國、作答 2 題')
  assert.equal(cloud.docs.has(`${STORE.progress}/` + K), false)
  assert.ok(cloud.docs.has('routines_progress/' + K))
  assert.ok(cloud.files.has(`safari-recordings/${K}/taiwan-bears-pass.wav`)); assert.ok(cloud.docs.has(`${STORE.records}/` + safariRecordId(K, 'taiwan', 'bears', 'pass')))
  assert.equal((await safari.teacherAction('safari', {classId: '501'}, fail)).students.length, 0)
  const log = await safari.teacherAction('safariDeleteLog', {}, fail)
  assert.deepEqual(log.log.map(x => [x.studentId, x.classId, x.summary]), [['50107', '501', '蓋章 1 國、作答 2 題']])
  assert.equal((await call('state', {})).progress.taiwan.items.panda.puzzle, false) // the pupil starts again
})
