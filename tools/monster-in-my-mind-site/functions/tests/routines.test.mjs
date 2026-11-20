import test from 'node:test'
import assert from 'node:assert/strict'
import { STATIONS, stationFor, spokenTimes, timeMatches, spokenTimeCorrect, speakingPassed, checkDragAnswer, parseRoutineResult } from '../routines-core.mjs'
import { parseResult } from '../core.mjs'

const says = (text, h, m) => timeMatches(spokenTimes(text), h, m)
test('ten stations: four drag, six speak, spoken answers contain no digits', () => {
  assert.equal(STATIONS.length, 10)
  assert.equal(STATIONS.filter(s => s.mode === 'drag').length, 4)
  assert.equal(STATIONS.filter(s => s.mode === 'speak').length, 6)
  for (const s of STATIONS) { assert.doesNotMatch(s.spoken, /\d/); assert.match(s.code, /^\d{4}$/); assert.equal(Number(s.code), s.hour * 100 + s.minute) }
})
test('every station accepts its own spoken sentence', () => {
  for (const s of STATIONS) assert.ok(says(s.spoken, s.hour, s.minute), s.spoken)
})
test('spoken time parser', () => {
  assert.ok(says('I go home at five thirty.', 17, 30))
  assert.ok(says('I go home at four forty-five', 16, 45))
  assert.ok(says('I go home at a quarter to five.', 16, 45))
  assert.ok(says('I get up at half past six', 6, 30))
  assert.ok(says('I get up at a quarter past six', 6, 15))
  assert.ok(says('I go to bed at ten to ten', 21, 50))
  assert.ok(says('I have lunch at twenty past twelve', 12, 20))
  assert.ok(says("I have dinner at seven o'clock.", 19, 0))
  assert.ok(says('I get up at six oh five', 6, 5))
  assert.ok(says('I have lunch at 12:15.', 12, 15))
  assert.ok(!says('I have lunch at twelve fifty.', 12, 15))
  assert.ok(!says('I have lunch at two fifteen.', 12, 15))
  assert.ok(!says('I have lunch.', 12, 15))
  assert.ok(!says('I go to bed at nine forty.', 21, 45))
})
test('transcript decides before the model said_time', () => {
  const japan = stationFor('japan')
  assert.equal(spokenTimeCorrect('I have lunch at twelve fifteen.', '', japan), true)
  assert.equal(spokenTimeCorrect('I have lunch at twelve fifty.', '12:15', japan), false)
  assert.equal(spokenTimeCorrect('I have lunch at noon-ish', '12:15', japan), true)
  assert.equal(spokenTimeCorrect('[inaudible]', '', japan), false)
})
test('pass needs 85 and the right time', () => {
  assert.equal(speakingPassed(85, true), true)
  assert.equal(speakingPassed(84, true), false)
  assert.equal(speakingPassed(99, false), false)
})
test('drag answers', () => {
  const taiwan = stationFor('taiwan')
  assert.deepEqual(checkDragAnswer(taiwan, ['time', 'have', 'breakfast'], '0645'), {slotsCorrect: true, codeCorrect: true})
  assert.deepEqual(checkDragAnswer(taiwan, ['color', 'have', 'breakfast'], '0645'), {slotsCorrect: false, codeCorrect: true})
  assert.deepEqual(checkDragAnswer(taiwan, ['time', 'have', 'breakfast'], '0646'), {slotsCorrect: true, codeCorrect: false})
  assert.throws(() => checkDragAnswer(stationFor('japan'), ['a', 'b', 'c'], '1215'))
  assert.throws(() => checkDragAnswer(taiwan, ['time'], '0645'))
})
test('routine result keeps said_time', () => {
  const raw = JSON.stringify({transcript: 'I have lunch at twelve fifteen.', said_time: '12:15', accuracy: 90, fluency: 80, completeness: 100, feedback: '很好'})
  const result = parseRoutineResult(raw, parseResult)
  assert.equal(result.said_time, '12:15'); assert.equal(result.total_score, 91)
})
