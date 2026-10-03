import { validateVideoTrim } from './video.mjs';
// Shared, serializable presentation model. Never stores HTML or teacher notes.
export const CANVAS_VERSION = 1;
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const FONT_PRESETS = [
  { label: '標準', teacher: 40, student: 22 },
  { label: '大字', teacher: 48, student: 24 },
  { label: '特大', teacher: 64, student: 28 },
  { label: '強調', teacher: 80, student: 32 },
];
export const SLIDE_THEMES = [
  { id: 'whiteboard', name: '清爽白板', background: '#ffffff', ink: '#17324d', accent: '#2582bc' },
  { id: 'lavender', name: '柔紫課堂', background: '#ffffff', ink: '#40265a', accent: '#9b369e' },
  { id: 'forest', name: '森林學堂', background: '#f7f8e9', ink: '#193f35', accent: '#33816c' },
  { id: 'ocean', name: '海洋探索', background: '#edf8ff', ink: '#163b60', accent: '#237eaf' },
  { id: 'night', name: '深色舞台', background: '#19243d', ink: '#ffffff', accent: '#ffc75c' },
];
const clone = value => JSON.parse(JSON.stringify(value));
const number = (value, fallback) => Number.isFinite(value) ? value : fallback;
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const themeFor = id => SLIDE_THEMES.find(t => t.id === id) || SLIDE_THEMES[1];
export function studentSize(size) {
  return FONT_PRESETS.reduce((best, p) => Math.abs(p.teacher - size) < Math.abs(best.teacher - size) ? p : best).student;
}
const teacherSize = size => FONT_PRESETS.reduce((best, p) => Math.abs(p.teacher - size) < Math.abs(best.teacher - size) ? p : best).teacher;
export function plainText(element) {
  return (element.runs || []).map(r => r.text).join('');
}
export function compactRuns(runs) {
  const result = [];
  for (const run of runs) {
    if (!run.text) continue;
    const next = { text: String(run.text) };
    for (const key of ['color', 'bold', 'size']) if (run[key] !== undefined) next[key] = run[key];
    const previous = result.at(-1);
    if (previous && ['color', 'bold', 'size'].every(k => previous[k] === next[k])) previous.text += next.text;
    else result.push(next);
  }
  return result;
}
export function formatRuns(runs, start, end, style) {
  const length = runs.reduce((n, r) => n + r.text.length, 0);
  const from = clamp(Math.min(start, end), 0, length), to = clamp(Math.max(start, end), 0, length);
  if (from === to) return clone(runs);
  let offset = 0;
  const result = [];
  for (const run of runs) {
    const a = clamp(from - offset, 0, run.text.length), b = clamp(to - offset, 0, run.text.length);
    if (a) result.push({ ...run, text: run.text.slice(0, a) });
    if (b > a) result.push({ ...run, ...style, text: run.text.slice(a, b) });
    if (b < run.text.length) result.push({ ...run, text: run.text.slice(b) });
    offset += run.text.length;
  }
  return compactRuns(result);
}
export function newCanvas() { return { version: CANVAS_VERSION, theme: 'lavender', elements: [] }; }
export function textElement(id, text = '', order = 0) {
  return { id, kind: 'text', x: 8, y: 18 + (order % 4) * 12, w: 76, h: 18, z: order, size: 48, runs: text ? [{ text }] : [] };
}
export function mediaElement(asset, id, order = 0) {
  const audio = asset.kind === 'audio';
  return { id, kind: asset.kind, assetId: asset.id, x: audio ? 8 : 18, y: audio ? 75 : 22, w: audio ? 65 : 64, h: audio ? 10 : 60, z: order };
}
// Reading old slides adapts their presentation without mutating the stored source.
export function canvasFor(block) {
  if (block.slideCanvas?.version === CANVAS_VERSION) return clone(block.slideCanvas);
  const canvas = newCanvas();
  const original = {};
  for (const key of ['title', 'text', 'font', 'fontSize', 'color', 'bold', 'bullets', 'align', 'lineHeight', 'layout', 'objects', 'media', 'embed', 'syncVideoId']) {
    if (block[key] !== undefined) original[key] = clone(block[key]);
  }
  canvas.original = original;
  const ink = block.color && block.color !== '#17324d' ? { color: block.color } : {};
  if (block.title) canvas.elements.push({ ...textElement('legacy-title', block.title), x: 6, y: 5, w: 88, h: 12, size: 40, ...ink });
  if (block.text) canvas.elements.push({ ...textElement('legacy-body', block.text), x: 6, y: 19, w: 88, h: 24, size: teacherSize(number(block.fontSize, 48)), bold: !!block.bold, align: block.align || 'left', ...ink });
  for (const o of block.objects || []) {
    const element = { id: `legacy-${o.id}`, kind: o.kind, x: clamp(number(o.x, 10), 0, 95), y: clamp(44 + number(o.y, 10) * .5, 0, 95), w: clamp(number(o.w, 40), 5, 100), h: clamp(number(o.h, 20) * .5, 5, 55), z: number(o.z, 0) + 2, rotation: number(o.rotation, 0), size: teacherSize(number(o.size, 48)), bold: !!o.bold, align: o.align || 'left', ...(o.color ? { color: o.color } : {}) };
    element.w = Math.min(element.w, 100 - element.x); element.h = Math.min(element.h, 100 - element.y);
    if (o.kind === 'image') element.assetId = o.assetId;
    else element.runs = [{ text: o.text || '' }];
    canvas.elements.push(element);
  }
  const placed = new Set(canvas.elements.map(e => e.assetId).filter(Boolean));
  const remaining = (block.media || []).filter(a => !placed.has(a.id));
  remaining.forEach((asset, i) => {
    const single = remaining.length === 1 && !(block.objects || []).length;
    const element = { ...mediaElement(asset, `legacy-media-${i}`, canvas.elements.length), x: single ? 10 : 6 + (i % 3) * 30, y: single ? 45 : 45 + Math.floor(i / 3) * 12, w: single ? 80 : 28, h: single ? 49 : 11 };
    if (asset.kind === 'audio') element.h = Math.min(element.h, 10);
    canvas.elements.push(element);
  });
  if (block.embed) {
    const extras = canvas.elements.filter(e => !['legacy-title', 'legacy-body'].includes(e.id));
    if (extras.length) {
      // Give shared decks their own column instead of covering legacy objects.
      for (const e of extras) {
        e.x = 6 + e.x * .42; e.w *= .42;
        if (e.kind === 'text') e.h = Math.min(100 - e.y, Math.max(e.h, 18));
      }
    }
    canvas.elements.push({ id: 'legacy-embed', kind: 'embed', url: block.embed, x: extras.length ? 53 : 8, y: block.text || extras.length ? 45 : 20, w: extras.length ? 41 : 84, h: block.text || extras.length ? 49 : 72, z: canvas.elements.length });
  }
  return canvas;
}
export function applyTheme(block, theme) {
  if (block.type !== 'slide') return clone(block);
  return { ...clone(block), slideCanvas: { ...canvasFor(block), theme } };
}
export function restoreOriginal(block) {
  const original = block.slideCanvas?.original;
  if (!original) return clone(block);
  const result = { ...clone(block), ...clone(original) };
  delete result.slideCanvas;
  return result;
}
export function slideToQuestion(source, target) {
  const canvas = canvasFor(source);
  // Original notes remain private; only teaching content is copied into the stem.
  const result = { ...clone(target), title: source.title || '教材練習', media: clone(source.media || []), font: 'comic', fontSize: 24, color: '#17324d', questionCanvas: { version: CANVAS_VERSION, theme: canvas.theme, elements: clone(canvas.elements), mode: 'flow' }, hidden: true, conversionPending: true, conversionSourceId: source.id };
  if (['choice', 'multiselect'].includes(result.type)) { result.options = Array(result.type === 'multiselect' ? 4 : 3).fill(''); result.answer = []; }
  if (['blank', 'drag', 'dropdown'].includes(result.type)) { result.sentence = '{{b1}}'; result.blanks = [{ id: 'b1', answers: [''], distractors: [] }]; }
  if (result.type === 'order') result.items = ['', '', ''];
  if (result.type === 'label') { result.labels = [{ id: 'l1', text: '' }]; result.anchors = [{ id: 'a1', x: .5, y: .5, labelId: '', direction: 'down' }]; }
  if (result.type === 'hotspot') result.regions = result.regions.map(r => ({ ...r, correct: false }));
  if (result.type === 'category') { result.groups = ['', '']; result.items = ['', '', '']; result.mapping = [0, 0, 0]; }
  if (result.background) result.background = { assetId: source.media?.find(a => a.kind === 'image')?.id || '', alt: source.media?.find(a => a.kind === 'image')?.name || '' };
  if (result.type === 'audio') result.text = canvas.elements.filter(e => e.kind === 'text').map(plainText).join('\n');
  return result;
}
export function validateCanvas(canvas, media, checkEmbed) {
  const bad = message => { throw new Error(message); };
  if (canvas?.version !== CANVAS_VERSION || !SLIDE_THEMES.some(t => t.id === canvas.theme) || !Array.isArray(canvas.elements) || canvas.elements.length > 60) bad('投影片畫布版本、主題或物件數量無效。');
  const ids = new Set(); let total = 0;
  for (const e of canvas.elements) {
    if (typeof e.id !== 'string' || !/^[\w-]{1,150}$/.test(e.id) || ids.has(e.id) || !['text', 'image', 'audio', 'video', 'embed'].includes(e.kind)) bad('投影片物件無效或重複。');
    ids.add(e.id);
    if (![e.x, e.y, e.w, e.h].every(Number.isFinite) || e.x < 0 || e.y < 0 || e.w < 1 || e.h < 1 || e.x + e.w > 100.001 || e.y + e.h > 100.001 || !Number.isFinite(e.z) || e.z < 0 || e.z > 100 || (e.rotation !== undefined && (!Number.isFinite(e.rotation) || Math.abs(e.rotation) > 180))) bad('投影片物件位置超出畫布。');
    if (e.trim !== undefined && e.kind !== 'embed') bad('只有 YouTube 連結可以設定修剪範圍。');
    if (e.kind === 'embed') { if (typeof e.url !== 'string' || e.url.length > 4000) bad('教材連結無效。'); checkEmbed(e.url); validateVideoTrim(e.trim, e.url); }
    else if (e.kind !== 'text') { if (!media?.some(a => a.id === e.assetId && a.kind === e.kind)) bad('投影片引用的素材不存在。'); }
    else {
      if (!Array.isArray(e.runs) || e.runs.length > 1000 || e.size < 12 || e.size > 100 || !Number.isFinite(e.size)) bad('投影片文字格式無效。');
      if (e.align !== undefined && !['left', 'center', 'right'].includes(e.align)) bad('文字對齊方式無效。');
      for (const run of [{ ...e, text: '' }, ...e.runs]) {
        if (typeof run.text !== 'string' || (run.color !== undefined && !/^#[\da-f]{6}$/i.test(run.color)) || (run.bold !== undefined && typeof run.bold !== 'boolean') || (run.size !== undefined && (!Number.isFinite(run.size) || run.size < 12 || run.size > 100))) bad('投影片文字樣式無效。');
        total += run.text.length;
      }
    }
  }
  if (total > 24000) bad('一張投影片文字限 24,000 字元。');
  if (canvas.mode !== undefined && canvas.mode !== 'flow') bad('學生題幹配置無效。');
}
