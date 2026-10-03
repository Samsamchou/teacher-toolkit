import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
async function envFile(path) {
  try {
    return Object.fromEntries((await readFile(resolve(root, path), 'utf8')).split(/\r?\n/)
      .filter(line => /^\w+=/.test(line)).map(line => {
        const at = line.indexOf('=');
        return [line.slice(0, at), line.slice(at + 1).trim().replace(/^(['"])(.*)\1$/, '$2')];
      }));
  } catch (e) { if (e.code === 'ENOENT') return {}; throw e; }
}
// Outputs only readiness booleans; never prints configuration values or secrets.
const web = { ...await envFile('.env.production'), ...process.env };
const backend = { ...await envFile('functions/.env'), ...await envFile('functions/.env.hwg7teaching') };
const checks = {
  firebaseTransport: web.VITE_LIVE_V2_TRANSPORT === 'firebase',
  appCheckSiteKeyPresent: Boolean(web.VITE_LIVE_APPCHECK_SITE_KEY),
  liveBackendEnabledLocally: backend.LIVE_V2_ENABLED === 'true',
  mediaBackendEnabledLocally: backend.LIVE_MEDIA_ENABLED === 'true',
  videoBackendEnabledLocally: backend.LIVE_VIDEO_ENABLED === 'true',
  videoWorkerUrlPresentLocally: Boolean(backend.LIVE_WORKER_URL),
};
console.log(JSON.stringify({ status: Object.values(checks).every(Boolean) ? 'LOCAL_CONFIG_PRESENT_NOT_DEPLOYMENT_PROOF' : 'BLOCKED_LOCAL_CONFIG', checks,
  pendingExternalChecks: ['App Check authorized domains and valid device token', 'deployed liveV2/liveMediaV2 and flags', 'authenticated video worker, bucket IAM and CORS', 'teacher login and student anonymous auth', 'separate publishing authorization', 'real Safari on different Wi-Fi: join, answer, result and video synchronization'] }, null, 2));
process.exitCode = Object.values(checks).every(Boolean) ? 0 : 1;
