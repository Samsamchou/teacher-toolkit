// 二水 3D 英語闖關四套輪替：決定這次玩哪一套（quest3d-app.mjs 使用；tests/quest-sets.test.mjs 測試）。
// info = [{ slug, short, saved }]，saved 是這位學生該套的進度（沒玩過是 null）。
// 規則（教師 2026-11-01 RDQ 確認）：
//   1. 網址 ?set=N（老師測試）→ 第 N 套
//   2. 有做到一半的套 → 接續最近更新的那一套（不讓學生換套逃題）
//   3. 還沒完成的套 → 隨機抽一套
//   4. 四套都完成 → 隨機重玩一套（避開最後完成的那一套），開新紀錄，教師後台看每套最高分
export function pickSet(info, forced = 0, rand = Math.random) {
  if (forced >= 1 && forced <= info.length) return info[forced - 1];
  const started = info.filter(i => i.saved && !i.saved.completedAt && Object.keys(i.saved.results || {}).length);
  if (started.length) return [...started].sort((a, b) => String(b.saved.updatedAt).localeCompare(String(a.saved.updatedAt)))[0];
  const notDone = info.filter(i => !i.saved?.completedAt);
  if (notDone.length) return notDone[Math.floor(rand() * notDone.length)];
  const last = [...info].sort((a, b) => String(b.saved.completedAt).localeCompare(String(a.saved.completedAt)))[0];
  const pool = info.length > 1 ? info.filter(i => i !== last) : info;
  return pool[Math.floor(rand() * pool.length)];
}
