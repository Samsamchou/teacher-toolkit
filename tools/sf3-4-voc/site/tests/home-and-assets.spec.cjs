"use strict";

const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const config = require("../public/site-config.js");
const {
  captureScreenshot,
  ensureScreenshotDir,
  installAudioMock,
  openHome,
  startMode,
} = require("./helpers.cjs");

test("首頁依兩冊可變單元數排列，學號在主題下方", async ({ page }, testInfo) => {
  await openHome(page);
  await expect(page.getByTestId("topic-row-top").getByTestId("topic-button")).toHaveText(config.topicRows.top);
  await expect(page.getByTestId("topic-row-bottom").getByTestId("topic-button")).toHaveText(config.topicRows.bottom);

  const bottom = await page.getByTestId("topic-row-bottom").boundingBox();
  const input = await page.getByTestId("student-id").boundingBox();
  expect(input.y).toBeGreaterThan(bottom.y + bottom.height - 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

  await captureScreenshot(page, {
    path: path.join(ensureScreenshotDir(), `${testInfo.project.name}-home.png`),
    fullPage: true,
  });
});

test("所有設定圖片都存在且低於 320 KB", async ({ request }) => {
  const images = config.topics.flatMap((topic) => topic.words.map((word) => word.image));
  expect(images).toHaveLength(config.topics.flatMap((topic) => topic.words).length);
  for (const image of images) {
    const response = await request.get(image);
    expect(response.status(), image).toBe(200);
    expect(Number(response.headers()["content-length"] || (await response.body()).length), image).toBeLessThanOrEqual(320000);
  }
});

test("練習圖片在桌機、iPad、手機保持正方形與 contain", async ({ page }, testInfo) => {
  await installAudioMock(page);
  await startMode(page, { mode: "看圖學單字", touch: testInfo.project.name !== "desktop" });
  const image = page.locator(".vocab-image");
  await expect(image).toBeVisible();
  const details = await image.evaluate((node) => {
    const box = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      width: box.width,
      height: box.height,
      naturalWidth: node.naturalWidth,
      naturalHeight: node.naturalHeight,
      objectFit: style.objectFit,
    };
  });
  expect(details.naturalWidth).toBe(640);
  expect(details.naturalHeight).toBe(640);
  expect(details.objectFit).toBe("contain");
  expect(Math.abs(details.width - details.height)).toBeLessThanOrEqual(1);
});

test("模板沒有舊年級、舊 Firebase 或明碼教師密碼", async () => {
  const root = path.resolve(__dirname, "..");
  const textFiles = [
    "public/index.html",
    "public/site-config.js",
    "functions/index.js",
    "firestore.rules",
    "storage.rules",
    "firebase.json",
  ];
  const combined = textFiles.map((name) => fs.readFileSync(path.join(root, name), "utf8")).join("\n");
  for (const stale of require("../config/site-source.json").forbiddenStaleValues || []) {
    expect(combined).not.toContain(stale);
  }
  expect(combined).not.toMatch(/teacherAccess\.password(?!Prompt)/);
  expect(combined).not.toMatch(/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/);
});
