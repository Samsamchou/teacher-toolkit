// 二水 3D 英語闖關四套輪替（2026-11-01）：抽套規則＋每套題庫檔案齊全。
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { pickSet } from "../public/shared/quest-sets.mjs";
import { MISSIONS, QUEST_SETS } from "../public/shared/missions.mjs";

const pub = new URL("../public/", import.meta.url);
const S = (slug, saved = null) => ({ slug, short: slug, saved });
const prog = (o = {}) => ({ results: { a: { finalCorrect: true } }, updatedAt: "2026-11-01T01:00:00Z", ...o });

test("new student gets a random set", () => {
  const info = [S("a"), S("b"), S("c"), S("d")];
  assert.equal(pickSet(info, 0, () => 0).slug, "a");
  assert.equal(pickSet(info, 0, () => 0.99).slug, "d");
});

test("a set in progress is continued, not re-rolled", () => {
  const info = [S("a"), S("b", prog()), S("c", prog({ updatedAt: "2026-11-01T03:00:00Z" })), S("d")];
  for (const r of [0, 0.5, 0.99]) assert.equal(pickSet(info, 0, () => r).slug, "c");
});

test("completed sets are not drawn again until all four are done", () => {
  const done = prog({ completedAt: "2026-11-01T02:00:00Z" });
  const info = [S("a", done), S("b", done), S("c"), S("d", done)];
  for (const r of [0, 0.5, 0.99]) assert.equal(pickSet(info, 0, () => r).slug, "c");
});

test("after all four, replay avoids the set just finished", () => {
  const at = t => prog({ completedAt: `2026-11-0${t}T00:00:00Z` });
  const info = [S("a", at(1)), S("b", at(4)), S("c", at(2)), S("d", at(3))];
  for (const r of [0, 0.4, 0.7, 0.99]) assert.notEqual(pickSet(info, 0, () => r).slug, "b");
});

test("?set=N picks that set (teacher testing)", () => {
  const info = [S("a"), S("b", prog()), S("c"), S("d")];
  assert.equal(pickSet(info, 3).slug, "c");
  assert.equal(pickSet(info, 9).slug, "b");   // out of range → normal rule
});

for (const [grade, g] of Object.entries(QUEST_SETS)) {
  test(`${grade}: four sets, each registered and with a bank on disk`, async () => {
    assert.equal(g.sets.length, 4);
    for (const s of g.sets) {
      assert.ok(MISSIONS.some(m => m.slug === s.slug), `${s.slug} missing from MISSIONS (teacher dashboard)`);
      assert.match(s.slug, /^ershui-3d-quest(-[a-z0-9]{2,20})?$/u, "mission id must match the questProgress rule");
      const { BANK } = await import(new URL(`${s.slug}/data.js`, pub));
      assert.equal(BANK.mission, s.slug);
      assert.ok(BANK.items.length > 0 && BANK.items.length <= 60);
      const bank = JSON.parse(readFileSync(new URL(`${s.slug}/bank/bank.json`, pub), "utf8"));
      assert.ok(existsSync(new URL(`${s.slug}/bank/${bank.pak}`, pub)), `${s.slug} pak missing`);
      assert.equal(bank.items.length, BANK.items.length);
    }
  });
}

test("Wayground sets keep the Wayground question counts", async () => {
  const want = { hwg5u01: 44, hwg5u02: 44, hwg5r1: 40, hwg7u01: 44, hwg7u02: 44, hwg7r1: 40 };
  for (const [k, n] of Object.entries(want)) {
    const { BANK } = await import(new URL(`ershui-3d-quest-${k}/data.js`, pub));
    assert.equal(BANK.items.length, n, k);
  }
});

test("grade entry pages pass the four sets to the shared wrapper", () => {
  for (const [folder, g] of [["ershui-3d-quest", "hwg5"], ["ershui-3d-quest-hwg7", "hwg7"]]) {
    const html = readFileSync(new URL(`${folder}/index.html`, pub), "utf8");
    assert.match(html, new RegExp(`QUEST_SETS\\.${g}`));
    assert.match(html, /sets: G\.sets/);
  }
  // Ken's Jump Island shares the wrapper but must stay a single fixed bank
  const jump = readFileSync(new URL("ershui-3d-quest-jump/index.html", pub), "utf8");
  assert.doesNotMatch(jump, /sets:/);
});
