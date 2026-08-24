import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  QUESTION_ID_PATTERN,
  buildQuestionBankRegistry,
} from "../lib/question-bank.mjs";

const bank = JSON.parse(
  await readFile(new URL("../data/question-bank.json", import.meta.url), "utf8"),
);

test("multi-unit registry indexes every question under its declared unit and version", () => {
  const registry = buildQuestionBankRegistry(bank);
  assert.equal(registry.units.length, 2);
  assert.equal(registry.questions.length, 28);
  for (const unit of registry.units) {
    assert.ok(unit.questions.length >= 12);
    assert.ok(unit.typeCounts.read_aloud >= 6);
    assert.ok(unit.typeCounts.question_answer >= 6);
    for (const question of unit.questions) {
      assert.match(question.id, QUESTION_ID_PATTERN);
      assert.equal(question.unitId, unit.unitId);
      assert.equal(question.questionBankVersion, unit.questionBankVersion);
      assert.equal(registry.questionMap.get(question.id), question);
    }
  }
});

test("registry rejects a question placed under another unit", () => {
  const tampered = structuredClone(bank);
  tampered.units[0].questions[0].unitId = tampered.units[1].unitId;
  assert.throws(
    () => buildQuestionBankRegistry(tampered),
    /unitId does not match/u,
  );
});

test("registry rejects a question from another bank version", () => {
  const tampered = structuredClone(bank);
  tampered.units[0].questions[0].questionBankVersion = "stale-version";
  assert.throws(
    () => buildQuestionBankRegistry(tampered),
    /bank version does not match/u,
  );
});

test("registry rejects duplicate question IDs across units", () => {
  const tampered = structuredClone(bank);
  tampered.units[1].questions[0].id = tampered.units[0].questions[0].id;
  assert.throws(
    () => buildQuestionBankRegistry(tampered),
    /Duplicate question ID/u,
  );
});
