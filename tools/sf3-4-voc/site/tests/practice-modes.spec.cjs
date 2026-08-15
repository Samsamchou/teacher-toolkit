"use strict";

const path = require("path");
const { test, expect } = require("@playwright/test");
const config = require("../public/site-config.js");
const {
  captureScreenshot,
  chooseLetter,
  ensureScreenshotDir,
  FIRST_TOPIC,
  FIRST_WORD,
  installAudioMock,
  markFrontSentenceAndFlip,
  startMode
} = require("./helpers.cjs");
const COMPLETION_TOPIC = config.topics.reduce(
  (largest, topic) => (topic.words.length > largest.words.length ? topic : largest),
  config.topics[0],
);
const escapedFirstWord = FIRST_WORD.en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("模式一要求正反面語音真正 ended 才能下一題", async ({ page }, testInfo) => {
  await installAudioMock(page);
  await startMode(page, { mode: "看圖學單字" });

  const card = page.getByTestId("practice-card");
  await card.click({ position: { x: 64, y: 64 } });
  await expect(page.getByText("⚠️ 請先在卡牌正面聽完整的單字和例句！", { exact: true })).toBeVisible();

  const frontWord = page.locator('[data-side="front"][data-audio="word"]');
  const frontSentence = page.locator('[data-side="front"][data-audio="sentence"]');
  await frontWord.click();
  await expect(frontWord).toContainText("已聽完單字");
  await frontSentence.click();
  await expect(frontSentence).toContainText("已聽完例句");
  await card.click({ position: { x: 64, y: 64 } });
  await expect(card).toHaveAttribute("data-flipped", "true");

  const backWord = page.locator('[data-side="back"][data-audio="word"]');
  const backSentence = page.locator('[data-side="back"][data-audio="sentence"]');
  await expect(page.getByTestId("next-button")).toHaveCount(0);
  await backWord.click();
  await expect(backWord).toContainText("已聽完單字");
  await backSentence.click();
  await expect(backSentence).toContainText("已聽完例句");
  await expect(page.getByTestId("next-button")).toBeVisible();

  const screenshotDir = ensureScreenshotDir();
  await captureScreenshot(page, {
    path: path.join(screenshotDir, `${testInfo.project.name}-practice-mode1.png`),
    fullPage: true
  });
});

test("模式二正面先顯示中文答案", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "One desktop assertion is sufficient.");
  await installAudioMock(page);
  await startMode(page, { mode: "中英配對" });
  await expect(page.getByTestId("practice-card")).toContainText(FIRST_WORD.zh);
  await expect(page.getByTestId("practice-card")).not.toContainText(FIRST_WORD.answer);
});

test("iPad 觸控可選主題、播放、翻卡且沒有水平溢位", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "ipad-touch", "Touch test belongs to the iPad project.");
  await installAudioMock(page);
  await startMode(page, { mode: "看圖學單字", touch: true, studentId: "E2E-IPAD" });

  const frontWord = page.locator('[data-side="front"][data-audio="word"]');
  const frontSentence = page.locator('[data-side="front"][data-audio="sentence"]');
  await frontWord.tap();
  await expect(frontWord).toContainText("已聽完單字");
  await frontSentence.tap();
  await expect(frontSentence).toContainText("已聽完例句");
  await page.getByTestId("practice-card").tap({ position: { x: 64, y: 64 } });
  await expect(page.getByTestId("practice-card")).toHaveAttribute("data-flipped", "true");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await captureScreenshot(page, {
    path: path.join(ensureScreenshotDir(), "ipad-touch-practice.png"),
    fullPage: true
  });
});

test("iPad 音訊載入失敗會顯示可重試訊息且不誤標為已聽完", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "ipad-touch", "Touch audio failure belongs to the iPad project.");
  await page.addInitScript(() => {
    class FailingAudio {
      constructor(src = "") { this.src = src; this.currentSrc = src; this.preload = "auto"; this.onerror = null; }
      play() { return Promise.reject(new Error("E2E audio load failure")); }
      pause() {}
    }
    Object.defineProperty(window, "Audio", { configurable: true, writable: true, value: FailingAudio });
  });
  await startMode(page, { mode: "看圖學單字", touch: true, studentId: "E2E-AUDIO-FAIL" });

  const frontWord = page.locator('[data-side="front"][data-audio="word"]');
  await frontWord.tap();
  await expect(page.getByText("⚠️ 單字音訊播放失敗，請檢查網路後再按一次。", { exact: true })).toBeVisible();
  await expect(frontWord).toHaveText("🔊 聽單字");
});

test("麥克風權限、錄音自動停止與 STT 成功流程", async ({ page, context, baseURL }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Microphone capture is verified once in Chromium.");
  await context.grantPermissions(["microphone"], { origin: new URL(baseURL).origin });
  await installAudioMock(page);
  await page.goto("/?v=e2e-microphone", { waitUntil: "domcontentloaded" });

  const permissionCheck = await page.evaluate(async () => {
    const permission = await navigator.permissions.query({ name: "microphone" });
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const track = stream.getAudioTracks()[0];
    const result = { permission: permission.state, kind: track?.kind, readyState: track?.readyState };
    stream.getTracks().forEach((item) => item.stop());
    return result;
  });
  expect(permissionCheck.permission).toBe("granted");
  expect(permissionCheck.kind).toBe("audio");

  await startMode(page, { mode: "聽音錄音", studentId: "E2E-MIC" });
  await markFrontSentenceAndFlip(page);

  await page.evaluate(() => {
    const noOpParam = { setValueAtTime() {}, exponentialRampToValueAtTime() {} };
    const connectable = () => ({ connect(target) { return target || this; } });

    class FakeAnalyser {
      constructor() { this.fftSize = 1024; this.reads = 0; }
      getByteTimeDomainData(buffer) {
        buffer.fill(this.reads < 2 ? 160 : 128);
        this.reads += 1;
      }
    }

    class FakeAudioContext {
      constructor() { this.sampleRate = 48_000; this.currentTime = 0; this.state = "running"; this.destination = {}; }
      createMediaStreamSource() { return connectable(); }
      createAnalyser() { return new FakeAnalyser(); }
      createBuffer(_channels, length) { return { getChannelData: () => new Float32Array(length) }; }
      createBufferSource() { return { ...connectable(), start() {}, stop() {}, buffer: null }; }
      createBiquadFilter() { return { ...connectable(), type: "bandpass", frequency: noOpParam, Q: { value: 0 } }; }
      createGain() { return { ...connectable(), gain: noOpParam }; }
      createOscillator() { return { ...connectable(), type: "sine", frequency: noOpParam, start() {}, stop() {} }; }
      resume() { return Promise.resolve(); }
      close() { return Promise.resolve(); }
    }

    class FakeMediaRecorder {
      constructor(stream) { this.stream = stream; this.state = "inactive"; this.mimeType = "audio/webm"; }
      start() { this.state = "recording"; }
      stop() {
        if (this.state !== "recording") return;
        this.state = "inactive";
        if (typeof this.ondataavailable === "function") {
          this.ondataavailable({ data: new Blob(["e2e-audio"], { type: this.mimeType }) });
        }
        setTimeout(() => this.onstop && this.onstop(), 0);
      }
    }

    const fakeTrack = { stop() {}, kind: "audio", readyState: "live" };
    navigator.mediaDevices.getUserMedia = async () => ({
      getTracks: () => [fakeTrack],
      getAudioTracks: () => [fakeTrack]
    });
    window.AudioContext = FakeAudioContext;
    window.webkitAudioContext = FakeAudioContext;
    window.MediaRecorder = FakeMediaRecorder;
    let now = Date.now();
    Date.now = () => { now += 1200; return now; };
    window.transcribe = async (payload) => {
      window.__lastTranscribePayload = payload;
      return {
        ok: true,
        score: 100,
        bestScore: 100,
        transcript: payload.word,
        feedback: "E2E 發音通過",
        passed: true
      };
    };
  });

  await page.getByTestId("record-button").click();
  await expect(page.getByText(new RegExp(`100分｜文字稿：${escapedFirstWord}`))).toBeVisible();
  await expect(page.getByTestId("next-button")).toBeVisible();
  const payload = await page.evaluate(() => window.__lastTranscribePayload);
  expect(payload.studentId).toBe("E2E-MIC");
  expect(payload.word).toBe(FIRST_WORD.en);
  expect(payload.audioDataUrl).toMatch(/^data:audio\/webm;base64,/);
});

test("離開錄音模式會停止 MediaRecorder、麥克風軌與 AudioContext", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Recording cleanup is verified once in Chromium.");
  await installAudioMock(page);
  await startMode(page, { mode: "聽音錄音", studentId: "E2E-MIC-CLEANUP" });
  await markFrontSentenceAndFlip(page);

  await page.evaluate(() => {
    window.__recordingCleanup = { recorderStops: 0, trackStops: 0, contextCloses: 0, transcribeCalls: 0 };
    const connectable = () => ({ connect(target) { return target || this; } });
    class EndlessAnalyser {
      constructor() { this.fftSize = 1024; }
      getByteTimeDomainData(buffer) { buffer.fill(160); }
    }
    class FakeAudioContext {
      constructor() { this.state = "running"; this.destination = {}; }
      createMediaStreamSource() { return connectable(); }
      createAnalyser() { return new EndlessAnalyser(); }
      resume() { return Promise.resolve(); }
      close() { window.__recordingCleanup.contextCloses += 1; this.state = "closed"; return Promise.resolve(); }
    }
    class FakeMediaRecorder {
      constructor(stream) { this.stream = stream; this.state = "inactive"; this.mimeType = "audio/webm"; }
      start() { this.state = "recording"; }
      stop() {
        if (this.state !== "recording") return;
        this.state = "inactive";
        window.__recordingCleanup.recorderStops += 1;
        setTimeout(() => this.onstop && this.onstop(), 0);
      }
    }
    const fakeTrack = { kind: "audio", readyState: "live", stop() { window.__recordingCleanup.trackStops += 1; this.readyState = "ended"; } };
    navigator.mediaDevices.getUserMedia = async () => ({ getTracks: () => [fakeTrack], getAudioTracks: () => [fakeTrack] });
    window.AudioContext = FakeAudioContext;
    window.webkitAudioContext = FakeAudioContext;
    window.MediaRecorder = FakeMediaRecorder;
    window.transcribe = async () => { window.__recordingCleanup.transcribeCalls += 1; throw new Error("STT must not run after exit"); };
  });

  await page.getByTestId("record-button").click();
  await expect(page.getByTestId("record-button")).toContainText("辨識中");
  await page.getByTestId("exit-practice").click();
  await expect(page.locator('main[data-page="modes"]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__recordingCleanup)).toEqual({
    recorderStops: 1,
    trackStops: 1,
    contextCloses: 1,
    transcribeCalls: 0
  });
});

test("麥克風權限等待中離開後，延遲回傳的音軌仍會立即停止", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Pending permission cleanup is verified once in Chromium.");
  await installAudioMock(page);
  await startMode(page, { mode: "聽音錄音", studentId: "E2E-MIC-PENDING" });
  await markFrontSentenceAndFlip(page);

  await page.evaluate(() => {
    window.__pendingMicCleanup = { trackStops: 0, recorderStarts: 0, transcribeCalls: 0 };
    class FakeAudioContext { constructor() { this.state = "running"; } resume() { return Promise.resolve(); } }
    class FakeMediaRecorder { constructor() { window.__pendingMicCleanup.recorderStarts += 1; } }
    const fakeTrack = { stop() { window.__pendingMicCleanup.trackStops += 1; } };
    const stream = { getTracks: () => [fakeTrack], getAudioTracks: () => [fakeTrack] };
    navigator.mediaDevices.getUserMedia = () => new Promise(resolve => { window.__resolvePendingMicrophone = () => resolve(stream); });
    window.AudioContext = FakeAudioContext;
    window.webkitAudioContext = FakeAudioContext;
    window.MediaRecorder = FakeMediaRecorder;
    window.transcribe = async () => { window.__pendingMicCleanup.transcribeCalls += 1; };
  });

  await page.getByTestId("record-button").click();
  await page.getByTestId("exit-practice").click();
  await expect(page.locator('main[data-page="modes"]')).toBeVisible();
  await page.evaluate(() => window.__resolvePendingMicrophone());
  await expect.poll(() => page.evaluate(() => window.__pendingMicCleanup)).toEqual({
    trackStops: 1,
    recorderStarts: 0,
    transcribeCalls: 0
  });
});

test("手寫 Canvas、OCR 與大小寫成功流程", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "OCR workflow is verified once.");
  await installAudioMock(page);
  await startMode(page, { mode: "手寫練習", studentId: "E2E-WRITE" });
  await markFrontSentenceAndFlip(page);
  await page.evaluate((expectedWord) => {
    window.db = null;
    window.auth = null;
    window.Tesseract.recognize = async () => ({ data: { text: expectedWord } });
  }, FIRST_WORD.en);

  const canvas = page.getByTestId("handwriting-canvas");
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + 40, box.y + 80);
  await page.mouse.down();
  await page.mouse.move(box.x + 220, box.y + 190, { steps: 8 });
  await page.mouse.up();
  await page.getByTestId("handwriting-submit").click();
  await expect(page.getByText(new RegExp(`辨識成功：${escapedFirstWord}`))).toBeVisible();
  await expect(page.getByTestId("next-button")).toBeVisible();
});

test("拼字錯序可重試、清除並保留專有名詞大寫", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Spelling retry is verified once.");
  await installAudioMock(page);
  await startMode(page, { mode: "聽音拼字", studentId: "E2E-SPELL" });
  await markFrontSentenceAndFlip(page);

  const target = FIRST_WORD.en;
  for (const letter of [...target].reverse()) await chooseLetter(page, letter);
  await expect(page.getByTestId("try-again-banner")).toBeVisible();
  await page.getByTestId("spelling-clear").click();
  await expect(page.getByTestId("spelling-answer")).toHaveText("");

  for (const letter of target) await chooseLetter(page, letter);
  await expect(page.getByText("🎉 拼對了！", { exact: true })).toBeVisible();
  await expect(page.getByTestId("next-button")).toBeVisible();
});

test("完成主題全部單字後可轉四次拉霸並保存結果", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Full completion path is verified once.");
  await installAudioMock(page, { fastSlot: true });
  await startMode(page, { topic: COMPLETION_TOPIC.id, mode: "看圖學單字", studentId: "E2E-SLOT" });
  await page.evaluate(() => { window.db = null; window.auth = null; });

  for (let index = 0; index < COMPLETION_TOPIC.words.length; index += 1) {
    const frontWord = page.locator('[data-side="front"][data-audio="word"]');
    const frontSentence = page.locator('[data-side="front"][data-audio="sentence"]');
    await frontWord.click();
    await expect(frontWord).toContainText("已聽完單字");
    await frontSentence.click();
    await expect(frontSentence).toContainText("已聽完例句");
    await page.getByTestId("practice-card").click({ position: { x: 64, y: 64 } });
    const backWord = page.locator('[data-side="back"][data-audio="word"]');
    const backSentence = page.locator('[data-side="back"][data-audio="sentence"]');
    await backWord.click();
    await expect(backWord).toContainText("已聽完單字");
    await backSentence.click();
    await expect(backSentence).toContainText("已聽完例句");
    await page.getByTestId("next-button").click();
  }

  await expect(page.getByRole("heading", { name: "獎勵拉霸機" })).toBeVisible();
  for (let left = 4; left >= 1; left -= 1) {
    await page.getByRole("button", { name: `SPIN（${left}次）` }).click();
    if (left > 1) await expect(page.getByRole("button", { name: `SPIN（${left - 1}次）` })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "完成闖關" })).toBeVisible();
  await page.getByRole("button", { name: "完成闖關" }).click();
  await expect(page.locator('main[data-page="modes"]')).toBeVisible();

  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "[]"), config.localStorageKeys.practiceResults);
  expect(stored.some((row) =>
    row.studentId === "E2E-SLOT" &&
    row.category === COMPLETION_TOPIC.id &&
    row.completedWords === COMPLETION_TOPIC.words.length
  )).toBe(true);
});
