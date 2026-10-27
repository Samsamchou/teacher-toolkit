"use strict";

// Synthetic children's handwriting for testing v3.
// Glyph templates use x in 0..1 (glyph width) and L in "line units":
// 0 = top line, 1 = midline, 2 = baseline, 3 = bottom line.

const LINE_Y = [0.08, 0.37, 0.68, 0.94];

function lineToY(L) {
  const clamped = Math.max(-0.3, Math.min(3.2, L));
  const i = Math.min(2, Math.max(0, Math.floor(clamped)));
  return LINE_Y[i] + (clamped - i) * (LINE_Y[i + 1] - LINE_Y[i]);
}

function arc(cx, cL, rx, rL, fromDeg, toDeg, steps = 18) {
  const points = [];
  for (let s = 0; s <= steps; s += 1) {
    const a = ((fromDeg + ((toDeg - fromDeg) * s) / steps) * Math.PI) / 180;
    points.push([cx + rx * Math.cos(a), cL - rL * Math.sin(a)]);
  }
  return points;
}

const bowl = (cx, cL, rx, rL) => arc(cx, cL, rx, rL, 60, 420, 24);

const S_SHAPE = [[0.9, 0.25], [0.6, 0], [0.25, 0], [0, 0.3], [0.15, 0.75], [0.5, 1], [0.85, 1.25], [1, 1.65], [0.7, 2], [0.3, 2], [0, 1.75]];
const scaleL = (points, from, to) => points.map(([x, L]) => [x, to + ((L - from) * (to === 1 ? 0.5 : 1))]);

const GLYPHS = {
  A: [[[0, 2], [0.5, 0], [1, 2]], [[0.22, 1.3], [0.78, 1.3]]],
  B: [[[0, 0], [0, 2]], [[0, 0], [0.6, 0], [0.85, 0.25], [0.85, 0.75], [0.6, 1], [0, 1]], [[0, 1], [0.65, 1], [0.95, 1.3], [0.95, 1.7], [0.65, 2], [0, 2]]],
  C: [arc(0.55, 1, 0.48, 1, 50, 310)],
  D: [[[0, 0], [0, 2]], [[0, 0], [0.5, 0], [0.95, 0.5], [0.95, 1.5], [0.5, 2], [0, 2]]],
  E: [[[0, 0], [0, 2]], [[0, 0], [0.9, 0]], [[0, 1], [0.75, 1]], [[0, 2], [0.9, 2]]],
  F: [[[0, 0], [0, 2]], [[0, 0], [0.9, 0]], [[0, 1], [0.75, 1]]],
  G: [arc(0.55, 1, 0.48, 1, 45, 330), [[0.55, 1.15], [0.98, 1.15], [0.98, 2]]],
  H: [[[0, 0], [0, 2]], [[1, 0], [1, 2]], [[0, 1], [1, 1]]],
  I: [[[0.5, 0], [0.5, 2]], [[0.1, 0], [0.9, 0]], [[0.1, 2], [0.9, 2]]],
  J: [[[0.2, 0], [1, 0]], [[0.7, 0], [0.7, 1.55], ...arc(0.4, 1.55, 0.3, 0.45, 0, -180, 10).slice(1)]],
  K: [[[0, 0], [0, 2]], [[0.9, 0], [0, 1.15]], [[0.3, 0.85], [0.95, 2]]],
  L: [[[0, 0], [0, 2], [0.85, 2]]],
  M: [[[0, 2], [0, 0], [0.5, 1.3], [1, 0], [1, 2]]],
  N: [[[0, 2], [0, 0], [1, 2], [1, 0]]],
  O: [arc(0.5, 1, 0.5, 1, 90, 450, 26)],
  P: [[[0, 0], [0, 2]], [[0, 0], [0.6, 0], [0.9, 0.3], [0.9, 0.75], [0.6, 1.05], [0, 1.05]]],
  Q: [arc(0.5, 1, 0.5, 1, 90, 450, 26), [[0.6, 1.5], [1.02, 2]]],
  R: [[[0, 0], [0, 2]], [[0, 0], [0.6, 0], [0.9, 0.3], [0.9, 0.75], [0.6, 1.05], [0, 1.05]], [[0.45, 1.05], [0.95, 2]]],
  S: [S_SHAPE],
  T: [[[0, 0], [1, 0]], [[0.5, 0], [0.5, 2]]],
  U: [[[0, 0], [0, 1.5], [0.2, 1.9], [0.5, 2], [0.8, 1.9], [1, 1.5], [1, 0]]],
  V: [[[0, 0], [0.5, 2], [1, 0]]],
  W: [[[0, 0], [0.25, 2], [0.5, 0.7], [0.75, 2], [1, 0]]],
  X: [[[0, 0], [1, 2]], [[1, 0], [0, 2]]],
  Y: [[[0, 0], [0.5, 1]], [[1, 0], [0.5, 1], [0.5, 2]]],
  Z: [[[0, 0], [1, 0], [0, 2], [1, 2]]],
  a: [bowl(0.42, 1.5, 0.42, 0.5), [[0.88, 1], [0.88, 2]]],
  b: [[[0, 0], [0, 2]], arc(0.48, 1.5, 0.48, 0.5, 180, 540, 24)],
  c: [arc(0.55, 1.5, 0.48, 0.5, 45, 315)],
  d: [arc(0.45, 1.5, 0.45, 0.5, 0, 360, 24), [[0.92, 0], [0.92, 2]]],
  e: [[[0.02, 1.5], [0.98, 1.5], ...arc(0.5, 1.5, 0.48, 0.5, 0, 315, 20).slice(1)]],
  f: [[[0.92, 0.15], [0.7, 0], [0.45, 0.08], [0.4, 0.4], [0.4, 2]], [[0.1, 1], [0.8, 1]]],
  g: [arc(0.45, 1.5, 0.43, 0.5, 0, 360, 24), [[0.9, 1], [0.9, 2.6], [0.7, 3], [0.3, 3], [0.05, 2.8]]],
  h: [[[0, 0], [0, 2]], [[0, 1.4], [0.3, 1.05], [0.65, 1], [0.92, 1.3], [0.92, 2]]],
  i: [[[0.5, 1], [0.5, 2]], [[0.5, 0.55]]],
  j: [[[0.65, 1], [0.65, 2.7], [0.45, 3], [0.12, 2.85]], [[0.65, 0.55]]],
  k: [[[0, 0], [0, 2]], [[0.8, 1], [0, 1.6]], [[0.3, 1.45], [0.88, 2]]],
  l: [[[0.5, 0], [0.5, 2]]],
  m: [[[0, 1], [0, 2]], [[0, 1.3], [0.2, 1.05], [0.42, 1.1], [0.5, 1.4], [0.5, 2]], [[0.5, 1.4], [0.7, 1.05], [0.9, 1.1], [1, 1.4], [1, 2]]],
  n: [[[0, 1], [0, 2]], [[0, 1.35], [0.3, 1.03], [0.7, 1.05], [0.95, 1.35], [0.95, 2]]],
  o: [arc(0.5, 1.5, 0.5, 0.5, 90, 450, 24)],
  p: [[[0, 1], [0, 3]], arc(0.5, 1.5, 0.5, 0.5, 180, 540, 24)],
  q: [arc(0.45, 1.5, 0.45, 0.5, 0, 360, 24), [[0.93, 1], [0.93, 3]]],
  r: [[[0, 1], [0, 2]], [[0, 1.4], [0.3, 1.05], [0.7, 1.02], [0.92, 1.15]]],
  s: [scaleL(S_SHAPE, 0, 1)],
  t: [[[0.4, 0.4], [0.4, 1.8], [0.55, 2], [0.88, 1.9]], [[0.05, 1], [0.82, 1]]],
  u: [[[0, 1], [0, 1.75], [0.25, 2], [0.65, 1.95], [0.92, 1.6]], [[0.92, 1], [0.92, 2]]],
  v: [[[0, 1], [0.5, 2], [1, 1]]],
  w: [[[0, 1], [0.25, 2], [0.5, 1.35], [0.75, 2], [1, 1]]],
  x: [[[0, 1], [1, 2]], [[1, 1], [0, 2]]],
  y: [[[0, 1], [0.5, 2]], [[1, 1], [0.2, 3]]],
  z: [[[0, 1], [1, 1], [0, 2], [1, 2]]],
  6: [[[0.8, 0], [0.35, 0.45], [0.05, 1.2], [0.1, 1.8], [0.5, 2], [0.9, 1.75], [0.88, 1.25], [0.5, 1.05], [0.08, 1.4]]],
};

const WIDTH = { M: 0.26, W: 0.27, m: 0.22, w: 0.22, I: 0.12, i: 0.04, l: 0.04, j: 0.1, f: 0.12, t: 0.13 };

// Small deterministic random generator so every run makes the same samples.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function densify(points, step = 0.006) {
  const out = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const n = Math.max(1, Math.ceil(Math.hypot((x1 - x0) * 4 / 3, y1 - y0) / step));
    for (let k = 1; k <= n; k += 1) out.push([x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n]);
  }
  return out;
}

/**
 * Render one glyph to strokes.
 * options: centerX, messy (0..1), seed, shiftL (move whole glyph in line units),
 *          stretchL (scale vertical span around its top), forceSpan [fromL, toL]
 */
function glyphStrokes(glyph, options = {}) {
  const template = GLYPHS[glyph];
  if (!template) throw new Error(`No template for ${glyph}`);
  const random = rng(options.seed ?? 1);
  const messy = options.messy ?? 0;
  const centerX = options.centerX ?? 0.25;
  const width = (WIDTH[glyph] ?? (/[A-Z]/.test(glyph) ? 0.21 : 0.17)) * (1 + (random() - 0.5) * 0.3 * messy);
  const tilt = (random() - 0.5) * 0.25 * messy; // radians
  const allL = template.flat().map(([, L]) => L);
  const minL = Math.min(...allL);
  const maxL = Math.max(...allL);
  const [spanFrom, spanTo] = options.forceSpan ?? [minL, maxL];
  const mapL = (L) => spanFrom + ((L - minL) / Math.max(0.001, maxL - minL)) * (spanTo - spanFrom) + (options.shiftL ?? 0);
  const wobbleA = random() * 6.28;
  const wobbleB = random() * 6.28;

  let t = 0;
  return template.map((strokeTemplate, strokeIndex) => {
    let points = strokeTemplate.map(([x, L]) => [centerX + (x - 0.5) * width, lineToY(mapL(L))]);
    // Open loops: trim the end of long curved strokes.
    if (messy > 0 && points.length > 12 && random() < 0.6 * messy) {
      points = points.slice(0, Math.round(points.length * (0.96 - 0.04 * random())));
    }
    const midY = (lineToY(mapL(minL)) + lineToY(mapL(maxL))) / 2;
    const dense = points.length === 1 ? points : densify(points);
    const shiftX = (random() - 0.5) * 0.012 * messy;
    const shiftY = (random() - 0.5) * 0.02 * messy;
    const out = dense.map(([x, y], index) => {
      const dy = y - midY;
      const wob = Math.sin(index * 0.35 + wobbleA + strokeIndex) * 0.006 * messy;
      const wobY = Math.cos(index * 0.29 + wobbleB) * 0.007 * messy;
      const jitter = () => (random() - 0.5) * 0.0012 * messy;
      t += 16;
      return {
        x: Math.min(1, Math.max(0, x + dy * tilt * 0.75 + wob + shiftX + jitter())),
        y: Math.min(1, Math.max(0, y + wobY + shiftY + jitter())),
        t,
      };
    });
    t += 250;
    return { points: out };
  });
}

function board(leftGlyph, rightGlyph, options = {}) {
  const left = glyphStrokes(leftGlyph, { centerX: 0.25, ...options, ...(options.left || {}) });
  const offset = left.length ? left[left.length - 1].points.at(-1).t + 400 : 0;
  const right = glyphStrokes(rightGlyph, { centerX: 0.75, ...options, seed: (options.seed ?? 1) + 7, ...(options.right || {}) })
    .map((stroke) => ({ points: stroke.points.map((p) => ({ ...p, t: p.t + offset })) }));
  return [...left, ...right];
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// Wrong glyphs from verification/negative-boards/manifest.json
const NEGATIVE_PAIRS = { A: "h", B: "o", C: "v", D: "l", E: "c", F: "t", G: "6", H: "x", I: "u", J: "r", K: "h", L: "o", M: "v", N: "l", O: "c", P: "t", Q: "6", R: "x", S: "u", T: "r", U: "h", V: "o", W: "v", X: "l", Y: "c", Z: "t" };

function buildCases() {
  const cases = [];
  ALPHABET.forEach((letter, index) => {
    // Neat, correct.
    cases.push({ group: "neat", target: letter, expect: true, strokes: board(letter, letter.toLowerCase(), { seed: 100 + index, messy: 0 }) });
    // Messy but correctly placed (two variants).
    for (const [variant, messy] of [["messy", 1], ["very-messy", 1.6]]) {
      cases.push({ group: variant, target: letter, expect: true, strokes: board(letter, letter.toLowerCase(), { seed: 300 + index * 3 + messy * 10, messy }) });
    }
    // Wrong letter (from the negative-board manifest), written in correct zones.
    const wrong = NEGATIVE_PAIRS[letter];
    const wrongUpper = wrong === "6" ? "6" : wrong.toUpperCase();
    cases.push({ group: "wrong-letter", target: letter, expect: false, strokes: board(wrongUpper, wrong, { seed: 600 + index, messy: 0.6 }) });
  });

  // Right letter, wrong size/position.
  const position = [
    ["C", "c written as tall as C", { right: { forceSpan: [0, 2] } }],
    ["O", "o written as tall as O", { right: { forceSpan: [0, 2] } }],
    ["S", "S written small like s", { left: { forceSpan: [1, 2] } }],
    ["V", "V written small like v", { left: { forceSpan: [1, 2] } }],
    ["A", "a written tall", { right: { forceSpan: [0, 2] } }],
    ["E", "e floating above baseline", { right: { shiftL: -0.45 } }],
    ["G", "g not reaching bottom line", { right: { forceSpan: [1, 2.05] } }],
    ["P", "p sitting on baseline", { right: { forceSpan: [1, 2] } }],
    ["H", "h only midline to base", { right: { forceSpan: [1, 2] } }],
    ["B", "B shifted down to bottom line", { left: { shiftL: 0.6 } }],
    ["Y", "y not descending", { right: { forceSpan: [1, 2] } }],
    ["D", "d short like a", { right: { forceSpan: [1, 2] } }],
  ];
  position.forEach(([letter, note, options], index) => {
    cases.push({ group: "wrong-position", note, target: letter, expect: false, strokes: board(letter, letter.toLowerCase(), { seed: 900 + index, messy: 0.5, ...options }) });
  });
  return cases;
}

module.exports = { GLYPHS, glyphStrokes, board, buildCases, lineToY, NEGATIVE_PAIRS };
