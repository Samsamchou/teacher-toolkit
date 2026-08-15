"use strict";

const { test, expect } = require("@playwright/test");
const config = require("../public/site-config.js");
const { openHome } = require("./helpers.cjs");

test("教師後台需要安全通行碼登入流程並可刪除本機測試資料", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Teacher workflow is verified once.");
  const studentId = "E2E-TEACHER";
  const dateKey = "2026-07-30";
  const firstTopic = config.topics[0].id;
  const secondTopic = config.topics[1].id;
  await openHome(page);
  await page.evaluate(() => window.firebaseReadyPromise);
  await page.evaluate(({ keys, studentId, dateKey, firstTopic, secondTopic }) => {
    window.db = null;
    window.auth = null;
    window.teacherSignIn = async () => true;
    window.signOutTeacher = async () => {};
    localStorage.setItem(keys.submissions, JSON.stringify([
      { studentId, dateKey, category: firstTopic, type: "handwriting", word: "apple", data: "data:image/png;base64,AA==", timestamp: 1 },
      { studentId, dateKey, category: secondTopic, type: "audio", word: "cat", score: 100, transcript: "cat", timestamp: 2 },
    ]));
    localStorage.setItem(keys.practiceResults, JSON.stringify([
      { studentId, dateKey, category: firstTopic, mode: 1, modeName: "看圖學單字", modeScore: 100, totalSlotScore: 40, timestamp: 3 },
      { studentId, dateKey, category: secondTopic, mode: 3, modeName: "聽音錄音", modeScore: 100, totalSlotScore: 100, timestamp: 4 },
    ]));
    localStorage.setItem(keys.stats, JSON.stringify([
      { studentId, dateKey, category: firstTopic, timestamp: 5 },
      { studentId, dateKey, category: secondTopic, timestamp: 6 },
    ]));
  }, { keys: config.localStorageKeys, studentId, dateKey, firstTopic, secondTopic });

  await page.getByTestId("teacher-button").click();
  await expect(page.getByTestId("teacher-login-dialog")).toBeVisible();
  await page.getByTestId("teacher-passcode").fill("e2e-test-passcode");
  await page.getByTestId("teacher-login-submit").click();
  await expect(page.locator('main[data-page="teacher"]')).toBeVisible();
  await expect(page.getByTestId("teacher-date")).toHaveText([dateKey]);
  await page.getByTestId("teacher-date").click();
  await page.getByTestId("teacher-student").click();
  await expect(page.getByTestId("teacher-topic")).toHaveText([firstTopic, secondTopic]);

  const first = page.getByTestId("teacher-topic").filter({ hasText: firstTopic });
  await first.click({ button: "right" });
  await expect(page.getByTestId("delete-dialog")).toBeVisible();
  await page.getByTestId("delete-yes").click();
  await expect(page.getByTestId("delete-notice")).toContainText("已刪除");

  const remaining = await page.evaluate((keys) => ({
    submissions: JSON.parse(localStorage.getItem(keys.submissions) || "[]"),
    results: JSON.parse(localStorage.getItem(keys.practiceResults) || "[]"),
    stats: JSON.parse(localStorage.getItem(keys.stats) || "[]"),
  }), config.localStorageKeys);
  for (const rows of Object.values(remaining)) {
    expect(rows.some((row) => row.category === firstTopic)).toBe(false);
    expect(rows.some((row) => row.category === secondTopic)).toBe(true);
  }
});
