import test from 'node:test';
import assert from 'node:assert/strict';
import { joinAccess } from '../src/live/join-access.mjs';
test('dedicated HTTPS cloud origins produce exact join link', () => {
  for (const host of ['lesson-hub-v03.web.app', 'lesson-hub-v03.firebaseapp.com', 'lesson-hub-v03--wayground-v2-20260924-my8u1xpl.web.app']) {
    assert.deepEqual(joinAccess(`https://${host}`, '012345', true), { url: `https://${host}/lab?join=012345`, shared: true });
  }
});
test('local transport never advertises cross-device QR', () => {
  assert.equal(joinAccess('https://lesson-hub-v03.web.app', '123456', false).shared, false);
});
test('local, private, unrelated and insecure origins cannot advertise cloud QR', () => {
  for (const origin of ['http://127.0.0.1:5186', 'https://localhost', 'https://192.168.1.20', 'https://school.local', 'https://example.com', 'http://lesson-hub-v03.web.app', 'https://lesson-hub-v03.web.app:5186', 'https://lesson-hub-v03.web.app.evil.test', 'https://lesson-hub-v03--unapproved-channel.web.app']) {
    assert.equal(joinAccess(origin, '123456', true).shared, false, origin);
  }
});
test('invalid codes and invalid URLs fail closed', () => {
  for (const code of ['12345', '1234567', '123456&other=1', null]) assert.equal(joinAccess('https://lesson-hub-v03.web.app', code, true).url, '');
  assert.deepEqual(joinAccess('not a url', '123456', true), { url: '', shared: false });
});
