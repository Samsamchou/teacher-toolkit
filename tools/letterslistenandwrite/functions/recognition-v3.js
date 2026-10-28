"use strict";

// v3 handwriting check: the program judges size/position on the four-line
// board from stroke coordinates, and AI only judges which letter it is.

// Guide lines as a fraction of canvas height (must match drawGuide in App.jsx).
const LINES = { top: 0.08, mid: 0.37, base: 0.68, bottom: 0.94 };
// ±0.10 of canvas height (about 1/3 of one line gap). Chosen by testing the
// 432 real attempts from 2026-07-21; 0.06 rejected too much correct writing.
const TOLERANCE = 0.1;
const CENTER_MARGIN = 0.08; // letters may cross the middle line a little (j hooks)
const DESCENDER_TOP_SLACK = 0.15; // children start the bowl of g/p/q/y low
const CANVAS_ASPECT = 4 / 3; // canvas is 4:3, strokes are normalized 0..1

// Zones: where the top and bottom of each letter form should be.
// tall = top line → baseline; small = midline → baseline;
// dotted = i/t, top above midline → baseline; descender = midline → bottom line;
// dottedDescender = j.
const LOWER_ZONES = {
  tall: "bdfhkl",
  dotted: "it",
  small: "aceomnrsuvwxz",
  descender: "gpqy",
  dottedDescender: "j",
};

const SAME_SHAPE = new Set("COSUVWXZKP".split(""));

function zoneOfGlyph(glyph) {
  if (/^[A-Z]$/.test(glyph)) return "tall";
  for (const [zone, letters] of Object.entries(LOWER_ZONES)) {
    if (letters.includes(glyph)) return zone;
  }
  return "unknown";
}

const ZONE_LABEL = {
  tall: "從頂線寫到基線",
  dotted: "從中線上方寫到基線",
  small: "寫在中線和基線之間",
  descender: "從中線寫到底線",
  dottedDescender: "從中線上方寫到底線",
};

// Allowed range for the top and bottom of the bounding box in each zone.
function zoneRange(zone) {
  const t = TOLERANCE;
  const baseRange = [LINES.base - t, LINES.base + t];
  const bottomRange = [LINES.bottom - t, 1];
  switch (zone) {
    case "tall":
      return { top: [0, LINES.top + t], bottom: baseRange, idealTop: LINES.top, idealBottom: LINES.base };
    case "dotted":
      return { top: [0, LINES.mid - 0.03], bottom: baseRange, idealTop: (LINES.top + LINES.mid) / 2, idealBottom: LINES.base };
    case "small":
      return { top: [LINES.mid - t, LINES.mid + t], bottom: baseRange, idealTop: LINES.mid, idealBottom: LINES.base };
    case "descender":
      return { top: [LINES.mid - t, LINES.mid + DESCENDER_TOP_SLACK], bottom: bottomRange, idealTop: LINES.mid, idealBottom: LINES.bottom };
    case "dottedDescender":
      return { top: [0, LINES.mid - 0.03], bottom: bottomRange, idealTop: (LINES.top + LINES.mid) / 2, idealBottom: LINES.bottom };
    default:
      return null;
  }
}

function inRange(value, [low, high]) {
  return value >= low && value <= high;
}

// Each stroke belongs to the half that holds its average x.
function splitSides(strokes) {
  const left = [];
  const right = [];
  for (const stroke of strokes || []) {
    const points = stroke?.points || [];
    if (!points.length) continue;
    const meanX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    (meanX < 0.5 ? left : right).push(stroke);
  }
  return { left, right };
}

function measureSide(strokes) {
  const points = strokes.flatMap((stroke) => stroke.points || []);
  if (!points.length) return null;
  let pathLength = 0;
  for (const stroke of strokes) {
    const p = stroke.points || [];
    for (let i = 1; i < p.length; i += 1) {
      pathLength += Math.hypot((p[i].x - p[i - 1].x) * CANVAS_ASPECT, p[i].y - p[i - 1].y);
    }
  }
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
    strokeCount: strokes.length,
    pointCount: points.length,
    pathLength,
  };
}

// Distance outside the allowed range, 0 when inside.
function outside(value, [low, high]) {
  if (value < low) return low - value;
  if (value > high) return value - high;
  return 0;
}

function checkGeometry(side, strokes, glyph) {
  const zone = zoneOfGlyph(glyph);
  const range = zoneRange(zone);
  const box = measureSide(strokes);
  const issues = [];
  if (!box || box.pathLength < 0.08) {
    return { ok: false, zone, box, score: 0, issues: ["empty"] };
  }
  const topOk = inRange(box.top, range.top);
  const bottomOk = inRange(box.bottom, range.bottom);
  if (!topOk) issues.push(box.top < range.top[0] ? "too-high" : "too-short-top");
  if (!bottomOk) issues.push(box.bottom > range.bottom[1] ? "too-low" : "too-short-bottom");
  const crossesCenter =
    side === "left" ? box.maxX > 0.5 + CENTER_MARGIN : box.minX < 0.5 - CENTER_MARGIN;
  if (crossesCenter) issues.push("crosses-center");

  const deviation =
    Math.abs(box.top - range.idealTop) + Math.abs(box.bottom - range.idealBottom);
  const penalty = outside(box.top, range.top) + outside(box.bottom, range.bottom);
  const score = Math.max(0, Math.round(100 - deviation * 250 - penalty * 400));
  return { ok: issues.length === 0, zone, box, score, issues };
}

// Glyphs AI may report that still count as the expected form.
function acceptedGlyphs(expected) {
  const set = new Set([expected]);
  const upper = expected.toUpperCase();
  if (SAME_SHAPE.has(upper)) {
    set.add(upper);
    set.add(upper.toLowerCase());
  }
  if (expected === "I") set.add("l");
  if (expected === "l") set.add("I");
  return set;
}

function normalizeCandidates(raw) {
  return (Array.isArray(raw) ? raw : [])
    .map((c) => ({
      glyph: String(c?.glyph ?? "?").slice(0, 1) || "?",
      probability: Math.max(0, Math.min(100, Math.round(Number(c?.probability) || 0))),
    }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 3);
}

// Decide whether the AI reading supports the expected glyph.
// firstFitsWriting(glyph) tells whether the writing's real height matches
// where that glyph should sit on the four lines.
function checkIdentity(candidates, expected, geometryOk, firstFitsWriting = () => true) {
  const accepted = acceptedGlyphs(expected);
  const [first] = candidates;
  if (!first || first.glyph === "?") {
    return { ok: false, rule: "unreadable", probability: 0, seen: first?.glyph || "?" };
  }
  if (accepted.has(first.glyph) && first.probability >= 30) {
    return { ok: true, rule: "top1", probability: first.probability, seen: first.glyph };
  }
  // The grid breaks the tie: AI's first choice is a different letter whose
  // height does not match the writing (e.g. "y" that never goes below the
  // baseline, "d" whose stem stays under the midline), while the expected
  // letter is in AI's top 3 and matches the writing's height.
  const rescue = candidates
    .slice(1)
    .find((candidate) => accepted.has(candidate.glyph) && candidate.probability >= 3);
  if (
    rescue &&
    geometryOk &&
    first.glyph.toLowerCase() !== expected.toLowerCase() &&
    !firstFitsWriting(first.glyph)
  ) {
    return { ok: true, rule: "zone-tiebreak", probability: rescue.probability, seen: rescue.glyph };
  }
  return { ok: false, rule: "mismatch", probability: 0, seen: first.glyph };
}

// ---------------------------------------------------------------------------
// Straight-line rules for letters whose shape depends on vertical lines.
// Angles are measured in real canvas proportions (width 4 : height 3).
// ---------------------------------------------------------------------------

const MAX_TILT_DEGREES = 15;
// M written as "ΛΛ" has both outer legs leaning inward. Measured on 7/21
// student writing: straight M legs add up to at most 14.5° of inward lean,
// ΛΛ-style M at least 21°.
const MAX_INWARD_LEAN_SUM = 18;

// Ramer–Douglas–Peucker: keep only the corners of a wobbly stroke.
function simplify(points, epsilon) {
  if (points.length < 3) return points;
  const [a, b] = [points[0], points[points.length - 1]];
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-9;
  let farthest = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const p = points[i];
    const distance =
      Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / length;
    if (distance > farthest) {
      farthest = distance;
      index = i;
    }
  }
  if (farthest <= epsilon) return [a, b];
  return [
    ...simplify(points.slice(0, index + 1), epsilon).slice(0, -1),
    ...simplify(points.slice(index), epsilon),
  ];
}

const tiltOf = (dx, dy) => (Math.atan2(Math.abs(dx), Math.abs(dy)) * 180) / Math.PI;

// Long straight pieces of a letter (each at least `minShare` of its height).
function longSegments(strokes, height, minShare = 0.45) {
  const segments = [];
  for (const stroke of strokes) {
    const points = (stroke.points || []).map((p) => [p.x * 4, p.y * 3]);
    const corners = simplify(points, height * 0.07);
    for (let i = 1; i < corners.length; i += 1) {
      const [x0, y0] = corners[i - 1];
      const [x1, y1] = corners[i];
      if (Math.hypot(x1 - x0, y1 - y0) < height * minShare) continue;
      // lean > 0: the top end is further right than the bottom end.
      const [top, bottom] = y0 < y1 ? [x0, x1] : [x1, x0];
      segments.push({
        midX: (x0 + x1) / 2,
        tilt: tiltOf(x1 - x0, y1 - y0),
        lean: top - bottom,
        span: Math.abs(y1 - y0) / height,
      });
    }
  }
  return segments;
}

// Direction of a cloud of points (principal axis), as tilt from vertical.
function principalTilt(points) {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p[0], 0) / n;
  const my = points.reduce((s, p) => s + p[1], 0) / n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const [x, y] of points) {
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
    sxy += (x - mx) * (y - my);
  }
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy); // axis angle from the x-axis
  return tiltOf(Math.cos(angle), Math.sin(angle));
}

// Returns { ok, issue, angles } for the uppercase letter on the left side.
function checkStrokeShape(letter, strokes) {
  const box = measureSide(strokes);
  if (!box) return { ok: true, issue: null, angles: [] };
  const height = (box.bottom - box.top) * 3;

  if (letter === "M") {
    // The first and last lines of M (the outer legs) must be vertical.
    const legs = longSegments(strokes, height).filter((s) => s.span >= 0.55);
    if (legs.length < 2) return { ok: true, issue: null, angles: [] };
    const sorted = [...legs].sort((a, b) => a.midX - b.midX);
    const left = sorted[0];
    const right = sorted[sorted.length - 1];
    const inwardSum = (left.lean > 0 ? left.tilt : 0) + (right.lean < 0 ? right.tilt : 0);
    const ok =
      left.tilt <= MAX_TILT_DEGREES &&
      right.tilt <= MAX_TILT_DEGREES &&
      inwardSum <= MAX_INWARD_LEAN_SUM;
    const angles = [left.tilt, right.tilt].map((a) => Math.round(a));
    return { ok, issue: ok ? null : "m-legs-slanted", angles };
  }

  if (letter === "Y") {
    // The stem of Y (lower part, below where the arms meet) must be vertical.
    const cut = box.top * 3 + height * 0.6;
    const points = strokes
      .flatMap((stroke) => stroke.points || [])
      .map((p) => [p.x * 4, p.y * 3])
      .filter(([, y]) => y >= cut);
    if (points.length < 4) return { ok: true, issue: null, angles: [] };
    const angle = Math.round(principalTilt(points));
    const ok = angle <= MAX_TILT_DEGREES;
    return { ok, issue: ok ? null : "y-stem-slanted", angles: [angle] };
  }

  return { ok: true, issue: null, angles: [] };
}

const SHAPE_FEEDBACK = {
  "m-legs-slanted": "左邊的大寫字母，最左邊和最右邊的兩條線要寫成垂直的直線，不能斜斜的。",
  "y-stem-slanted": "左邊的大寫字母，下半部那一筆要從中間垂直往下寫到基線，不能歪斜。",
};

function sideFeedback(sideName, geometry, identity, expected) {
  const label = sideName === "left" ? "左邊" : "右邊";
  if (geometry.issues.includes("empty")) return `${label}還沒有寫字，左右兩邊都要寫。`;
  if (!identity.ok) {
    if (identity.seen && identity.seen !== "?" && identity.seen.toLowerCase() === expected.toLowerCase()) {
      return sideName === "left" ? "左邊要寫「大寫」字母。" : "右邊要寫「小寫」字母。";
    }
    return null; // handled by the combined mismatch message
  }
  if (!geometry.ok) {
    const caseLabel = sideName === "left" ? "大寫" : "小寫";
    if (geometry.issues.includes("crosses-center")) {
      return `${label}的字超過中間的黃色虛線了，請寫在自己的格子裡。`;
    }
    return `${label}的字形對了，但大小或位置不對：這個${caseLabel}字母要${ZONE_LABEL[geometry.zone]}。`;
  }
  return null;
}

function evaluateV3({ targetLetter, strokes, ai }) {
  const upper = targetLetter.toUpperCase();
  const lower = targetLetter.toLowerCase();
  const sides = splitSides(strokes);
  const leftGeometry = checkGeometry("left", sides.left, upper);
  const rightGeometry = checkGeometry("right", sides.right, lower);
  const leftCandidates = normalizeCandidates(ai?.left?.candidates);
  const rightCandidates = normalizeCandidates(ai?.right?.candidates);
  const fits = (side, strokesOnSide) => (glyph) =>
    zoneOfGlyph(glyph) !== "unknown" && checkGeometry(side, strokesOnSide, glyph).ok;
  const leftIdentity = sides.left.length
    ? checkIdentity(leftCandidates, upper, leftGeometry.ok, fits("left", sides.left))
    : { ok: false, rule: "empty", probability: 0, seen: "?" };
  const rightIdentity = sides.right.length
    ? checkIdentity(rightCandidates, lower, rightGeometry.ok, fits("right", sides.right))
    : { ok: false, rule: "empty", probability: 0, seen: "?" };

  const leftShape = checkStrokeShape(upper, sides.left);

  const passed =
    leftGeometry.ok && rightGeometry.ok && leftIdentity.ok && rightIdentity.ok && leftShape.ok;

  const sideScore = (identity, geometry) =>
    identity.ok
      ? Math.round(Math.min(100, 55 + identity.probability * 0.45) * 0.7 + geometry.score * 0.3)
      : 0;
  const uppercaseScore = sideScore(leftIdentity, leftGeometry);
  const lowercaseScore = sideScore(rightIdentity, rightGeometry);
  const positionScore = Math.round((leftGeometry.score + rightGeometry.score) / 2);
  const confidence = Math.round(
    Math.min(leftCandidates[0]?.probability ?? 0, rightCandidates[0]?.probability ?? 0),
  );
  const overallScore = Math.round(
    uppercaseScore * 0.35 + lowercaseScore * 0.35 + positionScore * 0.3,
  );

  let feedback;
  if (passed) {
    feedback = "辨識成功！字母正確，大小與四線格位置也都對。";
  } else {
    const messages = [
      sideFeedback("left", leftGeometry, leftIdentity, upper),
      sideFeedback("right", rightGeometry, rightIdentity, lower),
    ].filter(Boolean);
    // Only mention line straightness once the letter itself is recognised.
    if (!leftShape.ok && leftIdentity.ok) messages.push(SHAPE_FEEDBACK[leftShape.issue]);
    const plainMismatch =
      (!leftIdentity.ok && !messages.some((m) => m.startsWith("左邊"))) ||
      (!rightIdentity.ok && !messages.some((m) => m.startsWith("右邊")));
    if (plainMismatch) {
      const show = (identity) => (identity.seen === "?" ? "看不出來的字" : identity.seen);
      messages.unshift(
        `AI 看到左邊像「${show(leftIdentity)}」、右邊像「${show(rightIdentity)}」，和語音內容不相同。請重新聽完音檔再寫。`,
      );
    }
    feedback = messages.join(" ");
  }

  const reading = (candidates) =>
    candidates.map((c) => `${c.glyph} ${c.probability}%`).join("、") || "無";

  return {
    passed,
    overallScore,
    uppercaseScore,
    lowercaseScore,
    positionScore,
    confidence,
    feedback,
    aiRecognition: `左：${reading(leftCandidates)}｜右：${reading(rightCandidates)}`,
    detail: {
      left: { geometry: leftGeometry, identity: leftIdentity, candidates: leftCandidates, shape: leftShape },
      right: { geometry: rightGeometry, identity: rightIdentity, candidates: rightCandidates },
    },
  };
}

// Pen strokes are drawn in writing order with these colors so the AI can see
// how the letter was built (K = 3 strokes, M = 1–2 strokes).
const STROKE_COLORS = ["#000000", "#1d4ed8", "#dc2626", "#15803d", "#9333ea", "#ea580c"];
const COLOR_NAMES = "black, blue, red, green, purple, orange";

// Draw one side's strokes on white. The crop keeps the full height of
// the four-line guide (drawn in light gray) so the AI can see how tall the
// letter is (a vs d, n vs h), but trims empty space left and right.
function sideSvg(strokes, height = 384, { colors = true } = {}) {
  const box = measureSide(strokes);
  // Work in canvas units where width = 4 and height = 3.
  const toUnits = (p) => [p.x * 4, p.y * 3];
  const minY = 0.02 * 3;
  const maxY = 0.99 * 3;
  const spanY = maxY - minY;
  const centerX = box ? ((box.minX + box.maxX) / 2) * 4 : 1;
  const letterWidth = box ? (box.maxX - box.minX) * 4 : 0;
  const spanX = Math.max(letterWidth * 1.5, spanY * 0.55);
  const originX = centerX - spanX / 2;
  const originY = minY;
  const scale = height / spanY;
  const width = Math.round(spanX * scale);
  const strokeWidth = Math.max(5, 0.1 * scale);
  const guide = (y, color, dash = "") =>
    `<line x1="0" x2="${width}" y1="${((y * 3 - originY) * scale).toFixed(1)}" y2="${((y * 3 - originY) * scale).toFixed(1)}" stroke="${color}" stroke-width="2"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
  const guides =
    guide(LINES.top, "#c4c4c4") +
    guide(LINES.mid, "#c4c4c4", "6 8") +
    guide(LINES.base, "#9fd8e6") +
    guide(LINES.bottom, "#c4c4c4");
  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/>${guides}`;
  if (!box) return `${head}</svg>`;
  const paths = strokes
    .map((stroke, strokeIndex) => {
      const color = colors
        ? STROKE_COLORS[Math.min(strokeIndex, STROKE_COLORS.length - 1)]
        : "#000000";
      const points = (stroke.points || []).map((p) => {
        const [x, y] = toUnits(p);
        return `${((x - originX) * scale).toFixed(1)},${((y - originY) * scale).toFixed(1)}`;
      });
      if (points.length === 1) points.push(points[0]);
      return `<polyline points="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="${strokeWidth.toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join("");
  return `${head}${paths}</svg>`;
}

const GLYPH_VALUES = [
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  ..."abcdefghijklmnopqrstuvwxyz".split(""),
  "?",
];

const candidatesSchema = {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,
    properties: {
      glyph: { type: "string", enum: GLYPH_VALUES },
      probability: { type: "integer", minimum: 0, maximum: 100 },
    },
    required: ["glyph", "probability"],
  },
};

const sideSchema = {
  type: "object",
  additionalProperties: false,
  properties: { candidates: candidatesSchema },
  required: ["candidates"],
};

// Both boxes in one request.
const IDENTITY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: { left: sideSchema, right: sideSchema, comment_zh: { type: "string" } },
  required: ["left", "right", "comment_zh"],
};

// One box per request.
const SINGLE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: { candidates: candidatesSchema, comment_zh: { type: "string" } },
  required: ["candidates", "comment_zh"],
};

const READING_RULES = [
  "Use the guide to read height: tall letters reach up to the top line, short letters stay between the midline and the baseline, and descenders (g j p q y) go below the baseline. For example a and d differ by whether the stem rises above the midline; n and h likewise.",
  "List the 3 most likely characters, most likely first, case-sensitive (A-Z or a-z), with probabilities 0-100 that sum to at most 100.",
  "Children's writing is wobbly: judge the letter by its structure (stems, bowls, loops, crossbars, dots, tails, number and direction of strokes), NOT by neatness. Slightly open loops, uneven lines, small gaps and tilt are normal. A wobbly line that runs in one direction is still one straight line.",
  "Distinguish the uppercase and lowercase FORMS where they differ (A/a, B/b, D/d, E/e, F/f, G/g, H/h, I/i, J/j, L/l, M/m, N/n, Q/q, R/r, T/t, Y/y). For C/c, O/o, S/s, U/u, V/v, W/w, X/x, Z/z, K/k, P/p either case is acceptable.",
  "Check orientation carefully: W opens upward (points at the bottom), M opens downward (points at the top); b/d and p/q are mirror images.",
  "Use ? as a candidate when the mark may be a digit, a scribble, an empty box, or not a letter. Never guess what the child was asked to write.",
];

function strokeNote(colors) {
  return colors
    ? `Each separate pen stroke is drawn in its own color in writing order (${COLOR_NAMES}).`
    : "";
}

function identityPrompt(leftStrokes, rightStrokes, { colors = true } = {}) {
  return [
    "You read handwriting by children aged 8-11 learning English letters.",
    "Image 1 is the LEFT box and Image 2 is the RIGHT box. Read each box on its own. Each box holds one handwritten mark on a four-line writing guide drawn in light gray: top line, dashed midline, light-blue baseline, bottom line.",
    strokeNote(colors),
    `The LEFT mark was written with ${leftStrokes} stroke(s); the RIGHT mark with ${rightStrokes} stroke(s).`,
    ...READING_RULES,
    "Do this for each box. comment_zh: one short Traditional Chinese sentence for the teacher describing the visible shapes in both boxes.",
  ].filter(Boolean).join(" ");
}

function singlePrompt(strokeCount, { colors = true } = {}) {
  return [
    "You read handwriting by children aged 8-11 learning English letters.",
    "The image holds one handwritten mark on a four-line writing guide drawn in light gray: top line, dashed midline, light-blue baseline, bottom line.",
    strokeNote(colors),
    `The mark was written with ${strokeCount} stroke(s).`,
    ...READING_RULES,
    "comment_zh: one short Traditional Chinese sentence for the teacher describing the visible shape.",
  ].filter(Boolean).join(" ");
}

module.exports = {
  LINES,
  TOLERANCE,
  zoneOfGlyph,
  zoneRange,
  splitSides,
  measureSide,
  checkGeometry,
  checkIdentity,
  checkStrokeShape,
  acceptedGlyphs,
  normalizeCandidates,
  evaluateV3,
  sideSvg,
  IDENTITY_SCHEMA,
  SINGLE_SCHEMA,
  identityPrompt,
  singlePrompt,
};
