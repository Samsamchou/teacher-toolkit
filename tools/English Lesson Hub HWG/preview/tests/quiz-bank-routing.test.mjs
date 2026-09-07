import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_QUESTION_BANK_ID,
  createSeedLessons,
  questionBankForQuizId,
  questionBanks
} from "../src/data/lesson-data.js";
import { migrateLessonState } from "../src/lib/lesson-migrations.js";

const HWG5_QUIZ_ID = "hwg5-u01-l1-vocabulary";
const HWG7_QUIZ_ID = "hwg7-u01-l1-vocabulary";

function quizStepFor(lesson) {
  return lesson.steps.find((step) => step.type === "vocabularyQuiz");
}

test("question-bank registry keeps HWG7 and routes HWG5 to its own 14 questions", () => {
  assert.deepEqual(Object.keys(questionBanks).sort(), [HWG5_QUIZ_ID, HWG7_QUIZ_ID].sort());
  assert.equal(DEFAULT_QUESTION_BANK_ID, HWG7_QUIZ_ID);
  assert.equal(questionBankForQuizId().lesson.quizId, HWG7_QUIZ_ID);
  assert.equal(questionBankForQuizId("unknown-quiz"), null);

  const hwg5Bank = questionBankForQuizId(HWG5_QUIZ_ID);
  assert.equal(hwg5Bank.lesson.series, "Here We Go 5");
  assert.deepEqual(hwg5Bank.questionSets.map((set) => [set.label, set.questions.length]), [
    ["Look and Choose", 7],
    ["Listen and Choose", 7]
  ]);
});

test("only HWG5 Unit 1 Lesson 1 gains the HWG5 quiz while HWG7 remains available", () => {
  const lessons = createSeedLessons();
  const enabledQuizLessons = lessons.filter((lesson) => quizStepFor(lesson)?.content?.quizEnabled);
  assert.deepEqual(enabledQuizLessons.map((lesson) => lesson.id).sort(), ["hwg5-u01-l01", "hwg7-u01-l01"]);
  assert.equal(quizStepFor(lessons.find((lesson) => lesson.id === "hwg5-u01-l01")).content.quizId, HWG5_QUIZ_ID);
  assert.equal(quizStepFor(lessons.find((lesson) => lesson.id === "hwg7-u01-l01")).content.quizId, HWG7_QUIZ_ID);
  assert.equal(quizStepFor(lessons.find((lesson) => lesson.id === "hwg5-u01-l02")).content.quizEnabled, false);
});

test("migration enables the HWG5 quiz without dropping an existing 14-step lesson", () => {
  const seeds = createSeedLessons();
  const targetSeed = seeds.find((lesson) => lesson.id === "hwg5-u01-l01");
  const stored = JSON.parse(JSON.stringify(targetSeed));
  stored.steps = [
    ...stored.steps,
    ...Array.from({ length: 7 }, (_, index) => ({
      id: `teacher-custom-${index + 1}`,
      type: "warmup",
      title: `Teacher custom ${index + 1}`,
      enabled: true,
      content: { body: `Keep ${index + 1}` }
    }))
  ];
  const storedQuiz = quizStepFor(stored);
  storedQuiz.enabled = false;
  storedQuiz.content = { quizEnabled: false };

  const migrated = migrateLessonState([stored], seeds);
  const target = migrated.find((lesson) => lesson.id === "hwg5-u01-l01");
  assert.equal(target.steps.length, 14);
  assert.equal(quizStepFor(target).enabled, true);
  assert.deepEqual(quizStepFor(target).content, {
    quizEnabled: true,
    quizId: HWG5_QUIZ_ID
  });
  assert.equal(target.steps.at(-1).content.body, "Keep 7");
});
