export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const REVEAL_MS = 8000;
export const DEFAULT_GAME = { id: 'scratch', name: 'Scratch & Reveal', description: 'A little mystery. A big discovery. Scratch to uncover your next classroom conversation.', url: '#scratch', order: 0, hidden: false, builtin: true };
export function moveItem(items, from, to) {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length) return [...items];
  const result = [...items]; result.splice(to, 0, result.splice(from, 1)[0]); return result;
}
export function safeUrl(input) {
  try { const url = new URL(input); if (url.protocol !== 'https:') throw 0; return url.href; }
  catch { throw new Error('Please enter a complete https:// game link.'); }
}
export function validateImage(file) {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error(`${file.name}: please use PNG, JPG or WebP.`);
  if (!file.size || file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name}: images must be between 1 byte and 20 MB.`);
}
export function normalizePoint(x, y, rect) { return { x: Math.max(0, Math.min(1, (x-rect.left)/rect.width)), y: Math.max(0, Math.min(1, (y-rect.top)/rect.height)) }; }
export function validateManifest(m) {
  if (!m || m.format !== 'classroom-club' || m.version !== 1 || !Array.isArray(m.images) || !Array.isArray(m.lessons) || !Array.isArray(m.games)) throw new Error('This is not a supported Classroom Club backup.');
  const ids = new Set();
  for (const img of m.images) {
    if (typeof img.id !== 'string' || !/^[\w-]{1,100}$/.test(img.id) || ids.has(img.id) || typeof img.name !== 'string' || !IMAGE_TYPES.includes(img.type) || !(img.size > 0 && img.size <= MAX_IMAGE_BYTES) || !Number.isFinite(img.width) || img.width <= 0 || !Number.isFinite(img.height) || img.height <= 0) throw new Error('The backup contains invalid or duplicate image records.');
    ids.add(img.id);
  }
  for (const lesson of m.lessons) {
    if (typeof lesson.name !== 'string' || !lesson.name.trim() || typeof lesson.gameId !== 'string' || !Array.isArray(lesson.imageIds) || lesson.imageIds.some(id => !ids.has(id))) throw new Error('A lesson in this backup references a missing image.');
  }
  for (const game of m.games) if (typeof game.name !== 'string' || !game.name.trim() || (game.id !== 'scratch' && !safeUrl(game.url))) throw new Error('Invalid game in backup.');
  return m;
}
export function fitSize(iw, ih, bw, bh) { const s = Math.min(bw/iw, bh/ih); return { width: iw*s, height: ih*s }; }
