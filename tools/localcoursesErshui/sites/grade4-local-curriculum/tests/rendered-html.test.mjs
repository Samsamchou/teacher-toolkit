import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("首頁具備四個在地課程單元與教師入口", () => {
  const page = read("app/page.tsx");
  const content = JSON.parse(read("content/site-content.json"));
  assert.equal(content.units.length, 4);
  for (const unit of content.units) {
    assert.match(page, /siteContent\.units\.map/);
    assert.ok(unit.displayName.length > 0);
  }
  assert.match(read("app/components/SiteHeader.tsx"), /教師後台/);
});

test("購票練習具備七步驟、七頁 PDF 與離線事件佇列", () => {
  const practice = read("app/units/train-tickets/TicketPractice.tsx");
  assert.match(practice, /const stages: Stage\[\]/);
  assert.match(practice, /pageCount", "7"/);
  assert.match(practice, /html2canvas/);
  assert.match(practice, /jsPDF/);
  assert.match(practice, /queueEvent/);
  assert.match(read("public/sw.js"), /CACHE_NAME/);
});

test("伺服器使用 D1、R2、嘗試權杖與教師白名單", () => {
  assert.match(read("lib/runtime.ts"), /EVIDENCE_BUCKET/);
  assert.match(read("lib/attempt-auth.ts"), /attempt_token_hash/);
  assert.match(read("lib/teacher-auth.ts"), /teacher_allowlist/);
  assert.match(read("app/api/attempts/[attemptId]/evidence/route.ts"), /\.put\(/);
});

test("教師後台有左右欄、事件動畫重播、PDF 與刪除功能", () => {
  const dashboard = read("app/teacher/TeacherDashboard.tsx");
  assert.match(dashboard, /dashboard-grid/);
  assert.match(dashboard, /EVENT REPLAY/);
  assert.match(dashboard, /查看七頁 PDF/);
  assert.match(dashboard, /method: "DELETE"/);
});

test("不蒐集姓名、電子郵件、付款或 IP 作為學生資料", () => {
  const attemptApi = read("app/api/attempts/route.ts");
  assert.doesNotMatch(attemptApi, /ip_address|student_name|phone|payment/i);
  assert.match(read("content/site-content.json"), /五位數學號/);
});
