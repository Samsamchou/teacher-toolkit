// Read-only Firebase CLI adapters; never print or persist authentication data.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cli = 'C:/Users/User/AppData/Roaming/npm/node_modules/firebase-tools/lib/';
const project = 'hwg5-su-to-u04-story';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
async function main() {
  const phase = process.argv[2];
  if (!['before', 'rules', 'after'].includes(phase)) throw new Error('Invalid phase');
  const auth = require(cli + 'auth');
  const account = auth.getGlobalDefaultAccount();
  if (!account || account.user.email !== 'samchouou@gmail.com') throw new Error('Expected teacher CLI account required');
  await require(cli + 'requireAuth').requireAuth({project, ...account, nonInteractive:true});
  const rules = require(cli + 'gcp/rules');
  const releases = await rules.listAllReleases(project);
  const result = {phase, project, time:new Date().toISOString(), rules:[]};
  for (const [service, file] of [['cloud.firestore','firestore.rules'], ['firebase.storage','storage.rules']]) {
    const name = await rules.getLatestRulesetName(project, service, releases);
    if (!name) throw new Error('Missing rules release');
    const content = (await rules.getRulesetContent(name))[0].content;
    const local = fs.readFileSync(file,'utf8');
    result.rules.push({service, rulesetName:name, sha256:hash(content), matchesLocal:content === local});
    if (phase === 'before') fs.writeFileSync(path.join(__dirname, 'before-' + file), content);
  }
  const api = new (require(cli + 'firestore/api').FirestoreApi)();
  result.fieldOverrides = await api.listFieldOverrides(project, '(default)');
  const channel = await require(cli + 'hosting/api').getChannel(project, project, 'live');
  result.hosting = {name:channel?.name, releaseName:channel?.release?.name, versionName:channel?.release?.version?.name, releaseTime:channel?.release?.releaseTime};
  if (phase === 'after') {
    result.http = [];
    for (const file of ['index.html','recording-reliability-core.js','ai-scoring.js']) {
      const response = await fetch('https://' + project + '.web.app/' + (file === 'index.html' ? '' : file) + '?verify=20260908', {signal:AbortSignal.timeout(20000)});
      const bytes = Buffer.from(await response.arrayBuffer());
      result.http.push({file,status:response.status,bytes:bytes.length,sha256:hash(bytes),matchesLocal:hash(bytes) === hash(fs.readFileSync('public/' + file))});
    }
  }
  fs.writeFileSync(path.join(__dirname, 'production-' + phase + '.json'), JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
  if (phase !== 'before' && result.rules.some(r=>!r.matchesLocal)) process.exitCode=2;
  if (result.http?.some(r=>r.status!==200 || !r.matchesLocal)) process.exitCode=2;
}
main().catch(error => {console.error('Readback failed:', error.name, error.status || error.code || 'unknown'); process.exitCode=1;});
