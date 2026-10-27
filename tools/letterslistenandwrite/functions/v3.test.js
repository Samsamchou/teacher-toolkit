"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const v3 = require("./recognition-v3");
const { buildCases, board } = require("../scripts/synthetic-letters.cjs");

const cases = buildCases();

function geometryOf(target, strokes) {
  const sides = v3.splitSides(strokes);
  return {
    left: v3.checkGeometry("left", sides.left, target),
    right: v3.checkGeometry("right", sides.right, target.toLowerCase()),
  };
}

const ai = (left, right) => ({
  left: { candidates: left.map(([glyph, probability]) => ({ glyph, probability })) },
  right: { candidates: right.map(([glyph, probability]) => ({ glyph, probability })) },
  comment_zh: "",
});

test("neat and messy letters in the right place pass the grid check", () => {
  for (const c of cases.filter((x) => x.expect)) {
    const g = geometryOf(c.target, c.strokes);
    assert.ok(g.left.ok, `${c.group} ${c.target} left: ${g.left.issues} top=${g.left.box?.top.toFixed(3)} bottom=${g.left.box?.bottom.toFixed(3)}`);
    assert.ok(g.right.ok, `${c.group} ${c.target.toLowerCase()} right: ${g.right.issues} top=${g.right.box?.top.toFixed(3)} bottom=${g.right.box?.bottom.toFixed(3)}`);
  }
});

test("letters in the wrong size or place fail the grid check", () => {
  for (const c of cases.filter((x) => x.group === "wrong-position")) {
    const g = geometryOf(c.target, c.strokes);
    assert.ok(!(g.left.ok && g.right.ok), `${c.note} should fail`);
  }
});

test("same-shape letters: case comes from height, not from AI", () => {
  const strokes = board("C", "c", { seed: 5 });
  const r = v3.evaluateV3({ targetLetter: "C", strokes, ai: ai([["c", 80]], [["C", 70]]) });
  assert.equal(r.passed, true);
  const tall = board("C", "c", { seed: 5, right: { forceSpan: [0, 2] } });
  const r2 = v3.evaluateV3({ targetLetter: "C", strokes: tall, ai: ai([["C", 80]], [["c", 80]]) });
  assert.equal(r2.passed, false);
  assert.match(r2.feedback, /右邊.*中線和基線之間/);
});

test("different-shape letters need the right form on each side", () => {
  const strokes = board("A", "a", { seed: 9 });
  assert.equal(v3.evaluateV3({ targetLetter: "A", strokes, ai: ai([["A", 70]], [["a", 75]]) }).passed, true);
  const wrongCase = v3.evaluateV3({ targetLetter: "A", strokes, ai: ai([["a", 70]], [["a", 75]]) });
  assert.equal(wrongCase.passed, false);
  assert.match(wrongCase.feedback, /左邊要寫「大寫」/);
});

test("second choice wins only when the grid decides between two letters", () => {
  const strokes = board("H", "h", { seed: 3, messy: 1 });
  // AI unsure between n and h; h is tall so the grid supports h.
  assert.equal(v3.evaluateV3({ targetLetter: "H", strokes, ai: ai([["H", 80]], [["n", 50], ["h", 40]]) }).passed, true);
  // u vs v share a zone, so no tie-break.
  const uv = board("U", "u", { seed: 3 });
  assert.equal(v3.evaluateV3({ targetLetter: "U", strokes: uv, ai: ai([["U", 80]], [["v", 55], ["u", 40]]) }).passed, false);
  // "y" that never goes below the baseline: the grid rescues the u in AI's top 3.
  const shortU = board("U", "u", { seed: 6 });
  assert.equal(v3.evaluateV3({ targetLetter: "U", strokes: shortU, ai: ai([["U", 90]], [["y", 90], ["u", 5]]) }).passed, true);
  // A real y (going down to the bottom line) is not rescued.
  const realY = board("U", "y", { seed: 6 });
  assert.equal(v3.evaluateV3({ targetLetter: "U", strokes: realY, ai: ai([["U", 90]], [["y", 90], ["u", 5]]) }).passed, false);
  // A wrong case is never rescued by the tie-break.
  const aa = board("A", "a", { seed: 4 });
  assert.equal(v3.evaluateV3({ targetLetter: "A", strokes: aa, ai: ai([["a", 60], ["A", 35]], [["a", 80]]) }).passed, false);
});

test("wrong letters fail even when perfectly placed", () => {
  for (const c of cases.filter((x) => x.group === "wrong-letter")) {
    const wrongSeen = c.strokes.length ? "x" : "?";
    const r = v3.evaluateV3({ targetLetter: c.target, strokes: c.strokes, ai: ai([[wrongSeen.toUpperCase(), 80]], [[wrongSeen, 80]]) });
    if (c.target === "X") continue; // the fake AI answer happens to be the target
    assert.equal(r.passed, false, c.target);
  }
});

test("empty side fails with a clear message", () => {
  const strokes = board("B", "b", { seed: 2 }).slice(0, 3); // only the left B
  const r = v3.evaluateV3({ targetLetter: "B", strokes, ai: ai([["B", 90]], [["?", 90]]) });
  assert.equal(r.passed, false);
  assert.match(r.feedback, /右邊還沒有寫字/);
});

test("side images render as square SVG", () => {
  const svg = v3.sideSvg(v3.splitSides(board("Q", "q", { seed: 1 })).left);
  assert.match(svg, /^<svg[^>]+height="384"/);
  assert.match(svg, /polyline/);
});
