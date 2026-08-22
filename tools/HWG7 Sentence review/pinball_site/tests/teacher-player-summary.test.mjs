import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const indexSource = await readFile(new URL("../index.html", import.meta.url), "utf8");

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, "missing start marker");
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, "missing end marker");
  return source.slice(start, end);
}

const helperSource = sliceBetween(
  indexSource,
  "function calculateTeacherPlayerSummary",
  "async function saveRecord",
);
const calculateTeacherPlayerSummary = new Function(
  helperSource + "\nreturn calculateTeacherPlayerSummary;",
)();

function completeRecord() {
  return {
    students: ["60130", "60131"],
    scores: { pink: 19, blue: 23 },
    turnSummaries: [
      { turnIndex: 0, studentCode: "60130", bestScore: 80 },
      { turnIndex: 1, studentCode: "60131", bestScore: 91 },
      { turnIndex: 2, studentCode: "60130", bestScore: 90 },
      { turnIndex: 3, studentCode: "60131", bestScore: 82 },
      { turnIndex: 4, studentCode: "60130", bestScore: 100 },
      { turnIndex: 5, studentCode: "60131", bestScore: 73 },
      { turnIndex: 6, studentCode: "60130", bestScore: 70 },
      { turnIndex: 7, studentCode: "60131", bestScore: 84 },
      { turnIndex: 8, studentCode: "60130", bestScore: 85 },
      { turnIndex: 9, studentCode: "60131", bestScore: 95 },
      { turnIndex: 10, studentCode: "60130", bestScore: 95 },
      { turnIndex: 11, studentCode: "60131", bestScore: 86 },
    ],
  };
}

test("teacher player summary averages six question best scores and maps team totals", () => {
  const record = completeRecord();
  assert.deepEqual(calculateTeacherPlayerSummary(record, "60130", 0), {
    complete: true,
    speechAverage: 87,
    marbleScore: 19,
  });
  assert.deepEqual(calculateTeacherPlayerSummary(record, "60131", 1), {
    complete: true,
    speechAverage: 85,
    marbleScore: 23,
  });
});

test("teacher player summary ignores attempt count and does not inflate duplicate turn indexes", () => {
  const record = completeRecord();
  record.turnSummaries.push({ turnIndex: 0, studentCode: "60130", bestScore: 80 });
  const summary = calculateTeacherPlayerSummary(record, "60130", 0);
  assert.equal(summary.complete, true);
  assert.equal(summary.speechAverage, 87);
});

test("teacher player summary rejects partial speech or marble data", () => {
  const missingSpeech = completeRecord();
  delete missingSpeech.turnSummaries[10].bestScore;
  assert.deepEqual(calculateTeacherPlayerSummary(missingSpeech, "60130", 0), {
    complete: false,
    speechAverage: null,
    marbleScore: null,
  });

  const missingMarble = completeRecord();
  delete missingMarble.scores.blue;
  assert.deepEqual(calculateTeacherPlayerSummary(missingMarble, "60131", 1), {
    complete: false,
    speechAverage: null,
    marbleScore: null,
  });
});

test("teacher cards use average, marble and incomplete labels instead of best score", () => {
  const cards = sliceBetween(indexSource, "teacher-player-summary-", "每次口說評測");
  assert.match(cards, /6 題口說平均：/u);
  assert.match(cards, /彈珠總分：/u);
  assert.match(cards, /資料不完整/u);
  assert.doesNotMatch(cards, /最佳/u);
});