"use strict";

process.env.NODE_ENV = "test";

const test = require("node:test");
const assert = require("node:assert/strict");
const { __test } = require("./index.js");

const ALPHABET = Array.from({ length: 26 }, (_, index) =>
  String.fromCharCode(65 + index),
);

function strongBlind(leftLetter, rightLetter, leftCase = "uppercase") {
  return {
    left_letter: leftLetter,
    right_letter: rightLetter,
    left_case: leftCase,
    right_case: "lowercase",
    left_identity_score: 96,
    right_identity_score: 96,
    position_score: 94,
    confidence: 95,
  };
}

const strongReference = {
  upper_shape_score: 94,
  lower_shape_score: 94,
  upper_position_score: 92,
  lower_position_score: 92,
  confidence: 94,
};

function assess(targetLetter, blind, overrides = {}) {
  return __test.evaluateAssessment({
    targetLetter,
    blind,
    reference: strongReference,
    localLeftCoverage: 12,
    localRightCoverage: 12,
    localLeftPoints: 20,
    localRightPoints: 20,
    ...overrides,
  });
}

test("26 個目標字母都拒絕下一個字母的故意錯答", () => {
  for (let index = 0; index < ALPHABET.length; index += 1) {
    const target = ALPHABET[index];
    const wrong = ALPHABET[(index + 1) % ALPHABET.length];
    const result = assess(target, strongBlind(wrong, wrong));
    assert.equal(result.passed, false, `${target} 不可把 ${wrong}${wrong.toLowerCase()} 判為通過`);
    assert.equal(result.blindIdentityMatch, false);
  }
});

test("Nn 題目拒絕左小寫 h、右小寫 h", () => {
  const result = assess("N", strongBlind("H", "H", "lowercase"));
  assert.equal(result.passed, false);
  assert.equal(result.blindIdentityMatch, false);
});

test("只有盲辨識身分、大小寫、雙側筆跡與標準字卡都通過才放行", () => {
  const correct = assess("G", strongBlind("G", "G"));
  assert.equal(correct.passed, true);

  const missingRight = assess("G", strongBlind("G", "G"), {
    localRightCoverage: 0,
    localRightPoints: 0,
  });
  assert.equal(missingRight.passed, false);

  const weakReference = assess("G", strongBlind("G", "G"), {
    reference: {
      ...strongReference,
      lower_shape_score: 49,
    },
  });
  assert.equal(weakReference.passed, false);
});

test("teacher question sets are cleaned up before saving", () => {
  const set = __test.normalizeQuestionSet({
    name: "  b d p q  ",
    letters: ["q", "B", "d", "P", "B", "1", "ab"],
    order: "random",
  });
  assert.deepEqual(set, { name: "b d p q", letters: ["B", "D", "P", "Q"], order: "random", slotEvery: 3, active: true });
  assert.equal(__test.normalizeQuestionSet({ name: "x", letters: ALPHABET, slotEvery: 99 }).slotEvery, 26);
  assert.equal(__test.normalizeQuestionSet({ name: "x", letters: ALPHABET }).slotEvery, 5);
  assert.throws(() => __test.normalizeQuestionSet({ name: "", letters: ["A"] }));
  assert.throws(() => __test.normalizeQuestionSet({ name: "x", letters: [] }));
});
