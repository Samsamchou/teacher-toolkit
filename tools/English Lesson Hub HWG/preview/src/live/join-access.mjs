// Only the dedicated Hosting origins may advertise internet classroom access.
export function joinAccess(origin, code, cloudMode) {
  if (!/^\d{6}$/.test(String(code))) return { url: '', shared: false };
  try {
    const parsed = new URL(origin);
    const url = `${parsed.origin}/lab?join=${code}`;
    const shared = cloudMode === true && parsed.protocol === 'https:' &&
      ['lesson-hub-v03.web.app', 'lesson-hub-v03.firebaseapp.com',
        'lesson-hub-v03--wayground-v2-20260924-my8u1xpl.web.app'].includes(parsed.hostname) && !parsed.port;
    return { url, shared };
  } catch { return { url: '', shared: false }; }
}
