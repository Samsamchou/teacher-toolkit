import test from 'node:test';
import assert from 'node:assert/strict';
import {byteRange} from '../scripts/live-media-plugin.mjs';
test('video byte ranges support seek, suffix and bounds',()=>{
 assert.deepEqual(byteRange('bytes=0-99',1000),{start:0,end:99});
 assert.deepEqual(byteRange('bytes=500-',1000),{start:500,end:999});
 assert.deepEqual(byteRange('bytes=-50',1000),{start:950,end:999});
 assert.deepEqual(byteRange('bytes=950-9999',1000),{start:950,end:999});
 for(const value of ['bytes=1000-','bytes=9-2','bytes=-0','bytes=','bytes=0-2,4-6','bytes=9007199254740992-'])assert.equal(byteRange(value,1000),null);
});
