'use strict';
// Usage: node cloud.cjs before|after|deploy
// Reads Firebase metadata as u9431818@gmail.com; never prints tokens, env values or response bodies.
const fs = require('node:fs/promises'), path = require('node:path'), crypto = require('node:crypto'), { spawn } = require('node:child_process');
const auth = require('C:/Users/User/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js');
const cli = 'C:/Users/User/AppData/Roaming/npm/node_modules/firebase-tools/lib/bin/firebase.js';
const TEMP = process.env.TEMP;
const release = path.join(TEMP, process.env.LH_RELEASE), out = path.join(TEMP, process.env.LH_EVIDENCE);
const ACCOUNT = 'u9431818@gmail.com', PROJECT = 'hwg7teaching';
const canon = o => Array.isArray(o) ? o.map(canon) : o && typeof o === 'object' ? Object.fromEntries(Object.keys(o).sort().map(k => [k, canon(o[k])])) : o;
const hash = o => crypto.createHash('sha256').update(JSON.stringify(canon(o))).digest('hex');
const equivalent = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const account = auth.findAccountByEmail(ACCOUNT);
if (!account) throw Error('Personal Firebase login required');
async function headers() { const c = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase']); return { Authorization: 'Bearer ' + c.access_token }; }
async function read(url) { const r = await fetch(url, { headers: await headers(), signal: AbortSignal.timeout(60000) }); if (!r.ok) throw Error('Cloud metadata HTTP ' + r.status); return r.json(); }
const FN = 'https://cloudfunctions.googleapis.com/v2/projects/hwg7teaching/locations/asia-east1/functions';
async function snapshot() {
  const f = await read(FN);
  if (f.nextPageToken) throw Error('Unexpected function pagination');
  const functions = (f.functions || []).map(x => ({ name: x.name.split('/').at(-1), state: x.state, updateTime: x.updateTime, revision: x.serviceConfig?.revision, environmentHash: hash(x.serviceConfig?.environmentVariables || {}), secretBindingsHash: hash(x.serviceConfig?.secretEnvironmentVariables || []), source: x.buildConfig?.source?.storageSource })).sort((a, b) => a.name.localeCompare(b.name));
  const h = (await read('https://firebasehosting.googleapis.com/v1beta1/sites/lesson-hub-v03/releases?pageSize=1')).releases?.[0];
  const d = (await read('https://firebasehosting.googleapis.com/v1beta1/sites/hwg7teaching/releases?pageSize=1')).releases?.[0];
  return { timestamp: new Date().toISOString(), functions, hosting: { version: h?.version?.name, releaseTime: h?.releaseTime }, defaultHosting: { version: d?.version?.name, releaseTime: d?.releaseTime } };
}
async function download(fn, file) {
  const s = fn.buildConfig.source.storageSource;
  const r = await fetch('https://storage.googleapis.com/storage/v1/b/' + encodeURIComponent(s.bucket) + '/o/' + encodeURIComponent(s.object) + '?alt=media&generation=' + encodeURIComponent(s.generation), { headers: await headers() });
  if (!r.ok) throw Error('Cloud source HTTP ' + r.status);
  await fs.writeFile(path.join(out, file), Buffer.from(await r.arrayBuffer()));
}
async function run(args, file) {
  const stream = require('node:fs').createWriteStream(path.join(out, file), { flags: 'wx' });
  const p = spawn(process.execPath, args, { cwd: release, env: { ...process.env, FUNCTIONS_DISCOVERY_TIMEOUT: '60', NO_UPDATE_NOTIFIER: '1', FIREBASE_CLI_DISABLE_UPDATE_CHECK: 'true', CI: 'true' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  p.stdout.on('data', b => { process.stdout.write(b); stream.write(b); }); p.stderr.on('data', b => { process.stderr.write(b); stream.write(b); });
  const code = await new Promise((res, rej) => { p.once('error', rej); p.once('close', res); });
  await new Promise(r => stream.end(r));
  if (code !== 0) throw Error('Deployment command failed; further publishing halted');
}
async function main() {
  const phase = process.argv[2];
  if (phase === 'before') {
    const s = await snapshot();
    await fs.writeFile(path.join(out, 'cloud-before.json'), JSON.stringify(s, null, 2), { flag: 'wx' });
    await download(await read(FN + '/liveV2'), 'previous-liveV2-source.zip');
    console.log(JSON.stringify({ functions: s.functions.length, hosting: s.hosting.version, liveV2: s.functions.find(x => x.name === 'liveV2')?.revision }));
  } else if (phase === 'deploy') {
    const base = JSON.parse(await fs.readFile(path.join(out, 'cloud-before.json'), 'utf8'));
    const checks = (await fs.readFile(path.join(out, 'checks.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
    if (checks.some(c => c.exitCode !== 0 && c.check !== 'site-data' && c.check !== 'functions-tests')) throw Error('Formal checks incomplete');
    if ((await fs.readdir(path.join(release, 'functions'))).some(n => n === '.env' || n.startsWith('.env.'))) throw Error('Functions environment files must be absent');
    const before = await read(FN + '/liveV2');
    if (before.serviceConfig.revision !== base.functions.find(x => x.name === 'liveV2').revision) throw Error('Concurrent backend update detected');
    const hb = (await read('https://firebasehosting.googleapis.com/v1beta1/sites/lesson-hub-v03/releases?pageSize=1')).releases?.[0];
    if (hb?.version?.name !== base.hosting.version) throw Error('Concurrent Hosting update detected');
    await run([cli, 'deploy', '--only', 'functions:teacher-access:liveV2', '--project', PROJECT, '--account', ACCOUNT, '--non-interactive'], 'deploy-functions.log');
    const after = await read(FN + '/liveV2'), service = await read('https://run.googleapis.com/v2/' + after.serviceConfig.service);
    const be = before.serviceConfig.environmentVariables || {}, ae = after.serviceConfig.environmentVariables || {};
    const differences = [...new Set([...Object.keys(be), ...Object.keys(ae)])].filter(k => be[k] !== ae[k]).map(k => ({ name: k, classification: k === 'FIREBASE_CONFIG' && equivalent(JSON.parse(be[k] || '{}'), JSON.parse(ae[k] || '{}')) ? 'json-key-order' : 'unexpected' }));
    const runtimePreserved = Object.keys(be).filter(k => k.startsWith('LIVE_')).every(k => be[k] === ae[k]);
    const secretBindingsPreserved = equivalent(before.serviceConfig.secretEnvironmentVariables || [], after.serviceConfig.secretEnvironmentVariables || []);
    const ready = after.state === 'ACTIVE' && after.serviceConfig.revision !== before.serviceConfig.revision && service.latestCreatedRevision === service.latestReadyRevision && service.terminalCondition?.state === 'CONDITION_SUCCEEDED';
    const report = { oldRevision: before.serviceConfig.revision, revision: after.serviceConfig.revision, state: after.state, ready, runtimePreserved, secretBindingsPreserved, differences };
    await fs.writeFile(path.join(out, 'backend-readiness.json'), JSON.stringify(report, null, 2));
    if (!ready || !runtimePreserved || !secretBindingsPreserved || differences.some(x => x.classification === 'unexpected')) throw Error('Backend readiness/configuration failed; Hosting halted');
    console.log('BACKEND_READY ' + JSON.stringify(report));
    await download(after, 'deployed-liveV2-source.zip');
    console.log('BACKEND_SOURCE_DOWNLOADED');
  } else if (phase === 'hosting') {
    await run([cli, 'deploy', '--only', 'hosting:lesson-hub-v03', '--project', PROJECT, '--account', ACCOUNT, '--non-interactive'], 'deploy-hosting.log');
    console.log('HOSTING_DEPLOYED');
  } else if (phase === 'after') {
    const before = JSON.parse(await fs.readFile(path.join(out, 'cloud-before.json'), 'utf8')), s = await snapshot();
    const changed = s.functions.filter(x => before.functions.find(b => b.name === x.name)?.updateTime !== x.updateTime).map(x => x.name);
    const result = { ...s, functionsChanged: changed, otherFunctionsUnchanged: s.functions.length - changed.length, defaultHostingUnchanged: hash(s.defaultHosting) === hash(before.defaultHosting), dedicatedHostingChanged: s.hosting.version !== before.hosting.version };
    await fs.writeFile(path.join(out, 'cloud-after.json'), JSON.stringify(result, null, 2), { flag: 'wx' });
    console.log(JSON.stringify({ functionsChanged: changed, otherFunctionsUnchanged: result.otherFunctionsUnchanged, total: s.functions.length, hosting: s.hosting, defaultHostingUnchanged: result.defaultHostingUnchanged, liveV2: s.functions.find(x => x.name === 'liveV2')?.revision }));
    if (changed.length !== 1 || changed[0] !== 'liveV2' || !result.defaultHostingUnchanged || !result.dedicatedHostingChanged) process.exitCode = 1;
  } else throw Error('Invalid phase');
}
main().catch(e => { console.error(/^(Personal|Cloud|Concurrent|Deployment command|Backend readiness|Formal|Functions|Invalid|Unexpected)/.test(e.message || '') ? e.message : 'Cloud step failed; credentials and response bodies withheld'); process.exitCode = 1; });
