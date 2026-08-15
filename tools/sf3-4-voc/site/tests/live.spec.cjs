"use strict";

const { test, expect } = require("@playwright/test");
const config = require("../public/site-config.js");
const { openHome, startMode } = require("./helpers.cjs");

test.beforeEach(({}, testInfo) => {
  test.skip(!process.env.E2E_BASE_URL, "Set E2E_BASE_URL after explicit deployment approval.");
  test.skip(testInfo.project.name === "local-only", "Formal tests do not use local-only project.");
});

test("正式網址、首頁與兩冊單元排列正確", async ({ page }) => {
  await openHome(page);
  expect(new URL(page.url()).hostname).toBe(`${config.firebase.projectId}.web.app`);
  await expect(page.getByTestId("topic-row-top").getByTestId("topic-button")).toHaveText(config.topicRows.top);
  await expect(page.getByTestId("topic-row-bottom").getByTestId("topic-button")).toHaveText(config.topicRows.bottom);
});

test("正式 Firebase 匿名登入與 App Check 已就緒", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Firebase security smoke test runs once.");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const status = await page.evaluate(async () => {
    const ready = await window.firebaseReadyPromise;
    const headers = await window.appCheckHeaders();
    return {
      ready,
      anonymous: window.auth?.currentUser?.isAnonymous === true,
      appCheckHeader: typeof headers["X-Firebase-AppCheck"] === "string" && headers["X-Firebase-AppCheck"].length > 20,
    };
  });
  expect(status).toEqual({ ready: true, anonymous: true, appCheckHeader: true });
});

test("正式 App Check 可呼叫後端 OpenAI TTS", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Paid TTS smoke test runs once.");
  test.setTimeout(90000);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const audio = await page.evaluate(async () => {
    await window.firebaseReadyPromise;
    const objectUrl = await window.synthesizeSpeech("who", "word");
    const response = await fetch(objectUrl);
    const blob = await response.blob();
    URL.revokeObjectURL(objectUrl);
    return { ok: response.ok, size: blob.size, type: blob.type };
  });
  expect(audio.ok).toBe(true);
  expect(audio.size).toBeGreaterThan(1000);
  expect(audio.type).toContain("audio");
});

test("正式後端拒絕缺少 App Check 的 TTS 請求", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "App Check rejection test runs once.");
  const url = new URL(config.functionUrls.synthesizeSpeech);
  url.searchParams.set("text", "who");
  url.searchParams.set("speechType", "word");
  const response = await request.get(url.toString());
  expect(response.status()).toBe(401);
  await expect(response.json()).resolves.toMatchObject({ debugCode: "APP_CHECK_REQUIRED" });
});

test("正式 Hosting 可讀取全部圖片與教材 MP3", async ({ request }) => {
  test.setTimeout(180000);
  const words = config.topics.flatMap((topic) => topic.words);
  const assets = [
    ...new Set(words.flatMap((word) => [word.image, word.audio, ...(word.audioAlternates || [])]).filter(Boolean)),
  ];
  for (const asset of assets) {
    const response = await request.get(asset);
    expect(response.status(), asset).toBe(200);
    expect((await response.body()).length, asset).toBeGreaterThan(500);
  }
});

test("iPad 觸控可播放教材音訊或後端 TTS", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "ipad-touch", "Paid TTS smoke test runs once on iPad profile.");
  const firstTopic = config.topics[0];
  const firstWord = firstTopic.words[0];
  await startMode(page, { topic: firstTopic.id, mode: "看圖學單字", studentId: "LIVE-IPAD", touch: true });
  const expectedPath = firstWord.audio
    ? firstWord.audio
    : new URL(config.functionUrls.synthesizeSpeech).pathname;
  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return firstWord.audio ? url.pathname === expectedPath : url.pathname === expectedPath;
  });
  await page.locator('[data-side="front"][data-audio="word"]').tap();
  const response = await responsePromise;
  expect([200, 206]).toContain(response.status());
});

test("正式 HTTPS 網址可取得麥克風權限與有效音軌", async ({ page, context, baseURL }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Microphone permission is verified once.");
  await context.grantPermissions(["microphone"], { origin: new URL(baseURL).origin });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const result = await page.evaluate(async () => {
    const permission = await navigator.permissions.query({ name: "microphone" });
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const track = stream.getAudioTracks()[0];
    const details = { permission: permission.state, kind: track?.kind, readyState: track?.readyState };
    stream.getTracks().forEach((item) => item.stop());
    return details;
  });
  expect(result.permission).toBe("granted");
  expect(result.kind).toBe("audio");
});
