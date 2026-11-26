// Safari Count local-preview walk: all six stations in map order with one student (Taiwan -> Australia),
// each: puzzle -> count picture -> drag -> film -> puzzle -> count -> speak (stub score) -> clue film -> like -> photo game -> stamp.
// Data comes from content/stations.json. Run from the C: build copy (needs @playwright/test):
//   node qa_site_walk_all.mjs <outDir> <stations.json>
import { chromium } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
const OUT = process.argv[2], BASE = 'http://127.0.0.1:3011'
const bank = JSON.parse(readFileSync(process.argv[3], 'utf8')); const STATIONS = bank.stations || bank
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, permissions: ['microphone'] })
const page = await ctx.newPage()
const errors = [], bad = []
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('.mp4')) bad.push(`${r.status()} ${r.url()}`) })
let n = 0
const shot = async name => { await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}_${name}.png` }); console.log('shot', n, name) }
const btn = name => page.getByRole('button', { name })
const chip = async word => { await page.locator('.wr-chips button.wr-word:not([disabled])', { hasText: new RegExp(`^${word}$`) }).first().click() }
const expectText = async text => { await page.getByText(text).first().waitFor({ timeout: 8000 }) }

async function countPicture(name) {
  const img = page.locator('img.sc-count-pic'); await img.waitFor({ timeout: 8000 })
  if (!(await img.getAttribute('src')).endsWith(name) || !(await img.evaluate(i => i.complete && i.naturalWidth > 0))) throw new Error('count picture ' + name)
}
async function watchFilm(name, shotName, fromEnd = 1.5) {
  const v = page.locator('.wr-video video'); await v.waitFor({ timeout: 8000 })
  if (!(await v.getAttribute('src')).endsWith(name)) throw new Error('film ' + (await v.getAttribute('src')))
  await page.waitForFunction(() => { const x = document.querySelector('.wr-video video'); return x && x.readyState >= 1 && x.duration > 0 }, null, { timeout: 15000 })
  if (!(await v.evaluate(x => x.videoWidth > 0))) throw new Error('film has no video ' + name)
  await page.waitForFunction(k => { const x = document.querySelector('.wr-video video'); return x && x.currentTime >= x.duration - k }, fromEnd, { timeout: 30000 }); await shot(shotName)
  await page.waitForFunction(() => { const x = document.querySelector('.wr-video video'); return x && x.ended }, null, { timeout: 30000 })
  await btn(/Next/).click()
}
const game = { stars: 0, score: 0 }
async function playGame(tag) {
  const el = page.locator('iframe[title="Safari Photo game"]'); await el.waitFor({ timeout: 15000 })
  const frame = await (await el.elementHandle()).contentFrame()
  const st = () => frame.evaluate(() => window.__safari || null)
  const wait = async (cond, ms, what) => { const t0 = Date.now()
    while (Date.now() - t0 < ms) { const s = await st(); if (s && cond(s)) return s; await page.waitForTimeout(20) }
    throw new Error(`game: waiting for ${what}, last=${JSON.stringify(await st())}`) }
  const tap = async (s, [x, y]) => { const box = await el.boundingBox(), k = box.width / s.w; await page.mouse.click(box.x + x * k, box.y + y * k) }
  let s = await wait(s => s.state === 'TITLE', 90000, 'title')
  await tap(s, [s.w / 2, s.h / 2 + 165]); await wait(s => s.state === 'INTRO', 10000, 'intro')
  for (let r = 1; r <= 5; r++) {
    s = await wait(s => s.state === 'PLAY' && s.round === r && !s.frozen, 20000, `round ${r}`)
    for (;;) {
      s = await wait(s => s.state !== 'PLAY' || (s.ok && !s.frozen), 60000, `exact count r${r}`); if (s.state !== 'PLAY') break
      await tap(s, s.shutter)
      s = await wait(s => s.state !== 'PLAY' || s.frozen, 3000, `photo r${r}`); if (s.state !== 'PLAY') break
      if (s.round !== r || s.photos >= r) break
      await wait(s => !s.frozen, 10000, `unfreeze r${r}`)
    }
    if (r === 1) await shot(`${tag}_game_photo1`)
  }
  s = await wait(s => s.state === 'END', 30000, 'end'); await page.waitForTimeout(800); await shot(`${tag}_game_end`)
  Object.assign(game, { stars: s.stars, score: s.score }); console.log(tag, 'game', JSON.stringify({ photos: s.photos, score: s.score, stars: s.stars }))
}

await page.goto(`${BASE}/safari-count`)
await page.getByRole('button', { name: /Girl/ }).click()
await page.getByLabel(/Student ID/).fill('50197'); await btn(/Start the safari/).click(); await page.locator('.wr-map').waitFor()
await shot('map_start')
const summary = []
for (const S of STATIONS) {
  const tag = S.id, t0 = Date.now()
  await page.getByRole('button', { name: new RegExp(S.country) }).click()
  await expectText(S.welcome.split('!')[0])
  for (const [i, it] of S.items.entries()) {
    await expectText('How many ___ are there?')
    if (new RegExp(`${it.word}`, 'i').test(await page.locator('.sc-body').innerText())) throw new Error(`${tag}: animal shown before the puzzle`)
    if (i === 0) await shot(`${tag}_meet`)
    await btn(/Open the puzzle/).click(); await page.frameLocator('iframe[title="Puzzle"]').locator('#ribbon').first().waitFor(); await shot(`${tag}_puzzle_${it.key}`)
    await page.getByLabel(/Answer/).fill(it.answer.toLowerCase()); await btn(/Check/).click(); await btn(/Count them/).click()
    await countPicture(`${tag}-${it.key}.jpg`); await shot(`${tag}_count_${it.key}`)
    await page.getByRole('button', { name: String(it.count), exact: true }).click()
    if (it.mode === 'drag') {
      await expectText('Tap the words')
      for (const w of it.drag.flatMap(l => l.slots)) await chip(w)
      await shot(`${tag}_drag_${it.key}`); await btn(/Check 送出/).click()
    } else {
      await expectText('Say it!')
      await btn(/Record/).click(); await page.waitForTimeout(2200); await btn(/Stop/).click()
      await btn(/Send/).waitFor({ timeout: 8000 }); await btn(/Send/).click(); await expectText('Passed'); await shot(`${tag}_speak_${it.key}`)
      await btn(/Next 下一步/).click()
    }
    await expectText(it.spoken); await btn(/Watch the story/).click()
    const last = i === S.items.length - 1
    await watchFilm(`${tag}-${it.key}${last ? '-clue-g' : ''}.mp4`, `${tag}_film_${it.key}${last ? '_clue' : ''}`, last ? 1.2 : 1.5)
  }
  await page.getByText(new RegExp(`Does (he|she) like ${S.like.animal}\\?`)).first().waitFor({ timeout: 8000 }); await expectText(S.like.clue)
  for (const w of S.like.drag.slots) await chip(w)
  await shot(`${tag}_like_filled`); await btn(/Check 送出/).click()
  await playGame(tag)
  await expectText(`${S.country} ✓`); await shot(`${tag}_stamp`)
  summary.push(`${tag} ok ${Math.round((Date.now() - t0) / 1000)} s, game ${game.score} ★${game.stars}`)
  const back = btn(/Map|地圖/); if (await back.count()) await back.first().click()
  await page.locator('.wr-map').waitFor({ timeout: 10000 })
}
await shot('map_end')
console.log(summary.join('\n'))
const errs = errors.filter(e => !e.includes('status of 401'))
console.log('console errors:', errs.length, JSON.stringify(errs, null, 1))
console.log('bad responses:', bad.length, JSON.stringify(bad, null, 1))
await browser.close()
process.exit(errs.length || bad.length ? 1 : 0)
