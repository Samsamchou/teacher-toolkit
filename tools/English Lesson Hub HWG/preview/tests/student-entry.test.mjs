import assert from "node:assert/strict";
import test from "node:test";
import { buildStudentEntryUrl, parseStudentEntry, resolveStudentBaseUrl } from "../src/lib/student-entry.js";

test("student QR URL carries only mode, book, unit, and lesson", () => {
  const url = buildStudentEntryUrl({ baseUrl: "https://lesson-hub-v03.web.app/", bookId: "hwg7", unitId: "u01", lessonNumber: 1 });
  const parsed = new URL(url);
  assert.deepEqual([...parsed.searchParams.keys()].sort(), ["book", "lesson", "mode", "unit"]);
  assert.deepEqual(parseStudentEntry(parsed.search), { bookId: "hwg7", unitId: "u01", lessonNumber: 1 });
});

test("student QR rejects unsafe or incomplete route values", () => {
  assert.equal(parseStudentEntry("?mode=student&book=hwg7&unit=u01&lesson=0"), null);
  assert.equal(parseStudentEntry("?mode=student&book=hwg7&unit=u01"), null);
  assert.equal(buildStudentEntryUrl({ baseUrl: "javascript:alert(1)", bookId: "hwg7", unitId: "u01", lessonNumber: 1 }), "");
});

test("local preview requires a same-Wi-Fi LAN URL while production uses its origin", () => {
  assert.equal(resolveStudentBaseUrl({ origin: "http://127.0.0.1:4173", localLanBaseUrl: "" }), "");
  assert.equal(resolveStudentBaseUrl({ origin: "http://127.0.0.1:4173", localLanBaseUrl: "http://192.168.1.20:4173" }), "http://192.168.1.20:4173");
  assert.equal(resolveStudentBaseUrl({ origin: "https://lesson-hub-v03.web.app" }), "https://lesson-hub-v03.web.app");
});
