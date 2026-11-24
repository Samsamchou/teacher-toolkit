// he/she trip (/world-routines-he-she, 2026-11-24): its own bank, same rules; the original trip must not change.
import test from 'node:test'
import assert from 'node:assert/strict'
import { BANKS, STATIONS, variantFor, stationFor, spokenTimes, timeMatches, checkDragAnswer, routineRecordId, routineQuotaId, routinesScoringPrompt } from '../routines-core.mjs'
import { hash } from '../core.mjs'

const HS = BANKS.hs
test('he/she bank: same ten countries in the same order, four drag, six speak', () => {
  assert.deepEqual(HS.map(s => s.id), STATIONS.map(s => s.id))
  assert.equal(HS.filter(s => s.mode === 'drag').length, 4)
  for (const s of HS) {
    assert.doesNotMatch(s.spoken, /\d/); assert.match(s.code, /^\d{4}$/); assert.equal(Number(s.code), s.hour * 100 + s.minute)
    assert.match(s.question, /^This is [A-Z][a-z]+\. What time does (she|he) /)
    assert.ok(timeMatches(spokenTimes(s.spoken), s.hour, s.minute), s.spoken)
    assert.match(s.spoken, /^(She|He) (gets|takes|has|goes|plays|studies|does) /)
    assert.notEqual(s.puzzle, stationFor(s.id).puzzle, `${s.id}: puzzle type must differ from the I trip`)
  }
})
test('he/she drag answers, including the two-blank Singapore question', () => {
  const sg = stationFor('singapore', 'hs')
  assert.deepEqual(checkDragAnswer(sg, ['does', 'study'], '1600'), {slotsCorrect: true, codeCorrect: true})
  assert.equal(checkDragAnswer(sg, ['do', 'studies'], '1600').slotsCorrect, false)
  assert.throws(() => checkDragAnswer(sg, ['does', 'study', 'English'], '1600'))
  const tw = stationFor('taiwan', 'hs')
  assert.equal(checkDragAnswer(tw, ['does', 'get', 'up'], '0630').slotsCorrect, true)
  assert.equal(checkDragAnswer(tw, ['do', 'gets', 'up'], '0630').slotsCorrect, false)
  assert.equal(checkDragAnswer(tw, ['does', 'get', 'up'], '0645').codeCorrect, false)
})
test('variants: missing = original trip, hs, anything else refused', () => {
  assert.equal(variantFor(undefined), 'i'); assert.equal(variantFor('i'), 'i'); assert.equal(variantFor('hs'), 'hs')
  assert.throws(() => variantFor('x')); assert.throws(() => variantFor(1))
  assert.throws(() => stationFor('mars', 'hs'))
})
test('original trip ids and prompt unchanged; he/she ids separate; one shared daily quota', () => {
  assert.equal(routineRecordId('k', 'japan', 'pass'), hash('routine:k:japan:pass'))
  assert.notEqual(routineRecordId('k', 'japan', 'pass', 'hs'), routineRecordId('k', 'japan', 'pass'))
  assert.equal(routineQuotaId('k', '2026-11-24'), hash('routine-quota:k:2026-11-24'))
  assert.doesNotMatch(routinesScoringPrompt('I have lunch at twelve fifteen.'), /第三人稱/)
  assert.match(routinesScoringPrompt('She has lunch at eleven thirty.', 'hs'), /第三人稱單數/)
  assert.equal(routinesScoringPrompt('x'), routinesScoringPrompt('x', 'i'))
})
