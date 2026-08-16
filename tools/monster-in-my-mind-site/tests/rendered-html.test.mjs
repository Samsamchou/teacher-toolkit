import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

const previewRoot = new URL('../app/_sites-preview/', import.meta.url)

async function render() {
  const workerUrl = new URL('../dist/server/index.js', import.meta.url)
  workerUrl.searchParams.set('test', `${process.pid}-${Date.now()}`)
  const { default: worker } = await import(workerUrl.href)

  return worker.fetch(
    new Request('http://localhost/', { headers: { accept: 'text/html' } }),
    {
      ASSETS: {
        fetch: async () => new Response('Not found', { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  )
}

test('server-renders the Monster in My Mind experience', async () => {
  const response = await render()
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type') ?? '', /^text\/html\b/i)

  const html = await response.text()
  assert.match(html, /Monster in My Mind/)
  assert.match(html, /What(?:&#x27;|')s bothering you\?/i)
  assert.match(html, /Make your worry a monster/i)
  assert.match(html, /START/)
  assert.match(html, /No name\. No score/i)
  assert.doesNotMatch(html, /Your site is taking shape/i)
  assert.doesNotMatch(html, /codex-preview/i)
})

test('starter preview is removed and site metadata is product-specific', async () => {
  await Promise.all([
    assert.rejects(access(new URL('SkeletonPreview.tsx', previewRoot))),
    assert.rejects(access(new URL('preview.css', previewRoot))),
  ])
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL('../app/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/layout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../package.json', import.meta.url), 'utf8'),
  ])

  assert.match(page, /MonsterApp/)
  assert.match(layout, /Monster in My Mind/)
  assert.doesNotMatch(layout, /codex-preview|_sites-preview|Starter Project/)
  assert.doesNotMatch(packageJson, /react-loading-skeleton/)
})
