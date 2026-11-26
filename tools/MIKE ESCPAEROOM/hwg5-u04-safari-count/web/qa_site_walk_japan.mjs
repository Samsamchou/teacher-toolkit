// Safari Count local-preview walk: Japan (login -> puzzle -> count -> drag -> speak (stub score) -> like -> photo game -> stamp) + teacher page.
// Usage: node qa-safari/walk.mjs <outDir>
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const OUT = process.argv[2], BASE = 'http://127.0.0.1:3011'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, permissions: ['microphone'] })
const page = await ctx.newPage()
const errors = [], bad = []
// Expected: the teacher page asks /api/monster/session once on load; signed out, that is a 401 (same as the World Routines teacher page).
const expected = []
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('.mp4')) (r.status() === 401 && r.url().endsWith('/api/monster/session') ? expected : bad).push(`${r.status()} ${r.url()}`) })
let n = 0
const shot = async name => { await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}_${name}.png` }); console.log('shot', n, name) }
const btn = name => page.getByRole('button', { name })
const chip = async word => { await page.locator('.wr-chips button.wr-word:not([disabled])', { hasText: new RegExp(`^${word.replace(/'/g, "'")}$`) }).first().click() }
const expectText = async text => { await page.getByText(text).first().waitFor({ timeout: 8000 }) }

// Count from the picture (a clean film frame), not the emoji row (teacher 11/25).
async function countPicture(name) {
  const img = page.locator('img.sc-count-pic'); await img.waitFor({ timeout: 8000 })
  if (!(await img.getAttribute('src')).endsWith(name) || !(await img.evaluate(i => i.complete && i.naturalWidth > 0))) throw new Error('count picture ' + name)
  await expectText('Look at the picture and count')
}
// Story film: plays, Next waits for the end. atSec = a moment to screenshot (the like clue card is the last 3.2 s of the bears film).
async function watchFilm(name, shotName, atSec = 3) {
  const v = page.locator('.wr-video video'); await v.waitFor({ timeout: 8000 })
  if (!(await v.getAttribute('src')).endsWith(name)) throw new Error('film ' + (await v.getAttribute('src')))
  await page.waitForFunction(t => { const x = document.querySelector('.wr-video video'); return x && x.currentTime >= t }, atSec, { timeout: 20000 }); await shot(shotName)
  await page.waitForFunction(() => { const x = document.querySelector('.wr-video video'); return x && x.ended }, null, { timeout: 30000 })
  await btn(/Next/).click()
}

// Photo game (Godot, inside the iframe): play it like a pupil, as games/photo-count/tools/qa_web.py does —
// read window.__safari, tap Start, then in each of the 5 rounds tap the shutter when exactly the right number is in the frame.
const game = { stars: 0, score: 0 }
async function playGame() {
  const el = page.locator('iframe[title="Safari Photo game"]'); await el.waitFor({ timeout: 15000 })
  const frame = await (await el.elementHandle()).contentFrame()
  const st = () => frame.evaluate(() => window.__safari || null)
  const wait = async (cond, ms, what) => { const t0 = Date.now()
    while (Date.now() - t0 < ms) { const s = await st(); if (s && cond(s)) return s; await page.waitForTimeout(20) }
    throw new Error(`game: waiting for ${what}, last=${JSON.stringify(await st())}`) }
  const tap = async (s, [x, y]) => { const box = await el.boundingBox(), k = box.width / s.w; await page.mouse.click(box.x + x * k, box.y + y * k) }
  let s = await wait(s => s.state === 'TITLE', 90000, 'title'); await shot('game_title')
  await tap(s, [s.w / 2, s.h / 2 + 165]); await wait(s => s.state === 'INTRO', 10000, 'intro'); await shot('game_intro')
  for (let r = 1; r <= 5; r++) {
    s = await wait(s => s.state === 'PLAY' && s.round === r && !s.frozen, 20000, `round ${r}`)
    for (;;) {
      s = await wait(s => s.state !== 'PLAY' || (s.ok && !s.frozen), 60000, `exact count r${r}`); if (s.state !== 'PLAY') break
      await tap(s, s.shutter)
      s = await wait(s => s.state !== 'PLAY' || s.frozen, 3000, `photo r${r}`); if (s.state !== 'PLAY') break
      if (s.round !== r || s.photos >= r) break
      await wait(s => !s.frozen, 10000, `unfreeze r${r}`)
    }
    if (r === 1) await shot('game_photo1')
  }
  s = await wait(s => s.state === 'END', 30000, 'end'); await page.waitForTimeout(800); await shot('game_end')
  Object.assign(game, { stars: s.stars, score: s.score }); console.log('game', JSON.stringify({ photos: s.photos, score: s.score, stars: s.stars }))
}


await page.goto(`${BASE}/safari-count`)
await page.getByRole('button', { name: /Girl/ }).click()
await page.getByLabel(/Student ID/).fill('50198'); await btn(/Start the safari/).click(); await page.locator('.wr-map').waitFor()
await page.getByRole('button', { name: /Japan/ }).click()
await expectText('Welcome to Fuji Safari Park'); await expectText('How many ___ are there?')
if (/lion|horse/i.test(await page.locator('.sc-body').innerText())) throw new Error('animal shown before the puzzle'); await shot('jp_meet_lions')
await btn(/Open the puzzle/).click(); await page.frameLocator('iframe[title="Puzzle"]').locator('#ribbon').first().waitFor(); await shot('jp_puzzle_lions')
await page.getByLabel(/Answer/).fill('lions'); await btn(/Check/).click(); await btn(/Count them/).click()
await countPicture('japan-lions.jpg'); await shot('jp_count_lions')
await page.getByRole('button', { name: '5', exact: true }).click(); await expectText('Tap the words')
for (const w of ['many', 'lions', 'are', 'are', 'five']) await chip(w)
await shot('jp_drag_lions'); await btn(/Check 送出/).click()
await expectText('There are five lions.'); await btn(/Watch the story/).click(); await watchFilm('japan-lions.mp4', 'jp_film_lions')
await expectText("Let's get off the bus and go to the farm."); await shot('jp_meet_horses')
await btn(/Open the puzzle/).click(); await page.frameLocator('iframe[title="Puzzle"]').locator('#ribbon').first().waitFor(); await shot('jp_puzzle_horses')
await page.getByLabel(/Answer/).fill('HORSES'); await btn(/Check/).click(); await btn(/Count them/).click()
await countPicture('japan-horses.jpg'); await shot('jp_count_horses')
await page.getByRole('button', { name: '6', exact: true }).click(); await expectText('Say it!')
await btn(/Record/).click(); await page.waitForTimeout(2200); await btn(/Stop/).click()
await btn(/Send/).waitFor({ timeout: 8000 }); await btn(/Send/).click(); await expectText('Passed'); await shot('jp_speak_horses')
await btn(/Next 下一步/).click(); await expectText('There are six horses.')
await btn(/Watch the story/).click(); await watchFilm('japan-horses-clue-g.mp4', 'jp_film_horses_clue', 8.5)
await expectText('Does he like lions?'); await expectText('I like horses!'); await shot('jp_like')
for (const w of ['No', "doesn't", 'likes']) await chip(w)
await shot('jp_like_filled'); await btn(/Check 送出/).click()
await playGame()
await expectText('Japan ✓'); await shot('jp_stamp')
for (let i = 0; i < expected.length; i++) { const at = errors.findIndex(e => e.includes('status of 401')); if (at >= 0) errors.splice(at, 1) }
console.log('console errors:', errors.length, JSON.stringify(errors, null, 1))
console.log('bad responses:', bad.length, JSON.stringify(bad, null, 1))
await browser.close()
process.exit(errors.length || bad.length ? 1 : 0)
