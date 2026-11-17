'use strict';
// Public read-back: small files by full-body SHA-256, large files by Hosting gzip-9 ETag + raw length.
const fs = require('node:fs'), fsp = require('node:fs/promises'), path = require('node:path'), zlib = require('node:zlib'), crypto = require('node:crypto');
require('node:dns').setDefaultResultOrder('ipv4first');
const T = process.env.TEMP, out = path.join(T, process.env.LH_EVIDENCE), dist = path.join(T, process.env.LH_RELEASE, 'dist');
const base = 'https://lesson-hub-v03.web.app', sha = b => crypto.createHash('sha256').update(b).digest('hex');
async function gz(file) { const h = crypto.createHash('sha256'); for await (const c of fs.createReadStream(file).pipe(zlib.createGzip({ level: 9 }))) h.update(c); return h.digest('hex'); }
async function main() {
  const manifest = (await fsp.readFile(path.join(out, 'dist-manifest.tsv'), 'utf8')).trim().split('\n').map(l => { const [p, b, s] = l.split('\t'); return { path: p, bytes: +b, sha256: s }; });
  const queue = [...manifest], records = [], stamp = Date.now();
  async function worker() {
    while (queue.length) {
      const e = queue.shift(); let entry;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const large = e.bytes > 1048576, url = base + '/' + e.path.split('/').map(encodeURIComponent).join('/') + '?release=' + stamp;
          const r = await fetch(url, { method: large ? 'HEAD' : 'GET', headers: large ? { 'Accept-Encoding': 'identity' } : undefined, signal: AbortSignal.timeout(60000) });
          if (large) {
            const etag = (r.headers.get('etag') || '').replace(/^"|"$/g, ''), len = Number(r.headers.get('content-length'));
            entry = { path: e.path, status: r.status, verification: 'hosting-gzip9-etag-and-raw-length', match: r.ok && len === e.bytes && (etag === e.sha256 || etag === await gz(path.join(dist, e.path))) };
          } else {
            const body = Buffer.from(await r.arrayBuffer());
            entry = { path: e.path, status: r.status, verification: 'downloaded-body-sha256', match: r.ok && body.length === e.bytes && sha(body) === e.sha256 };
          }
          if (entry.match) break;
        } catch { entry = { path: e.path, match: false, status: 'network-error' }; }
      }
      records.push(entry);
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  const index = manifest.find(e => e.path === 'index.html'), routes = [];
  for (const route of ['/', '/lab', '/lab?assignment=000000']) { const r = await fetch(base + route + (route.includes('?') ? '&' : '?') + 'release=' + stamp); routes.push({ route, status: r.status, match: r.ok && sha(Buffer.from(await r.arrayBuffer())) === index.sha256 }); }
  const init = await fetch(base + '/__/firebase/init.json'), projectOk = init.ok && (await init.json()).projectId === 'hwg7teaching';
  const failed = records.filter(x => !x.match);
  const result = { timestamp: new Date().toISOString(), files: records.length, passed: records.length - failed.length, failed, routes, projectOk, fullBody: records.filter(x => x.verification === 'downloaded-body-sha256').length, etag: records.filter(x => x.verification !== 'downloaded-body-sha256').length, artifacts: records.sort((a, b) => a.path.localeCompare(b.path)) };
  await fsp.writeFile(path.join(out, 'production-readback.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ files: result.files, passed: result.passed, failed: failed.map(x => x.path), fullBody: result.fullBody, etag: result.etag, routes, projectOk }));
  if (failed.length || routes.some(x => !x.match) || !projectOk) process.exitCode = 1;
}
main().catch(() => { console.error('Public readback failed'); process.exitCode = 1; });
