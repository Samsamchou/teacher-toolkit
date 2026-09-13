const {addMonths,planDeletion,runCleanup}=require('./retention-engine.cjs');const assert=require('node:assert/strict');
assert.equal(addMonths('2026-09-12T16:00:00.000Z').toISOString(),'2027-11-12T16:00:00.000Z');assert.equal(addMonths('2026-12-30T16:00:00.000Z').toISOString(),'2028-02-28T16:00:00.000Z');assert.equal(addMonths('2025-12-30T16:00:00.000Z').toISOString(),'2027-02-27T16:00:00.000Z');
const now=new Date('2027-11-13T00:00:00Z');const records=[{id:'a',ownerUid:'u',sessionId:'one',startedAt:'2026-09-12T00:00:00Z',recordedAt:'2027-11-12T00:00:00Z'},{id:'b',ownerUid:'u',sessionId:'one',startedAt:'2026-09-12T00:00:00Z'},{id:'c',ownerUid:'u',sessionId:'two',startedAt:'2026-10-01T00:00:00Z'},{id:'legacy',recordedAt:'2026-09-01T00:00:00Z'},{id:'missing',createdAt:'2026-09-01T00:00:00Z'}];
let p=planDeletion(records,[],now);assert.deepEqual(p.resultIds,['a','b','legacy','missing']);assert.equal(p.missingDateGroups,0);
p=planDeletion(records,[{id:'u_two',expiresAt:'2027-12-01T00:00:00Z'}],now);assert.ok(p.resultIds.includes('c'));assert.equal(p.markerIds.length,0);
p=planDeletion(records,[{id:'u_one',expiresAt:'2027-11-12T00:00:00Z'}],now);assert.deepEqual(p.markerIds,['u_one']);
console.log('PASS14 calendar months, Taiwan midnight, leap/month-end clamp, original start vs late upload, legacy fallback, all snapshots and marked deletion');
