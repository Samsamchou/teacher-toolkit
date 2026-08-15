"use strict";

const fs = require("fs");
const path = require("path");
const { expect } = require("@playwright/test");
const config = require("../public/site-config.js");

const ROOT = path.resolve(__dirname, "..");
const SCREENSHOT_DIR = path.join(ROOT, "audit", "screenshots");
const FIRST_TOPIC = config.topics[0].id;
const FIRST_WORD = config.topics[0].words[0];

function ensureScreenshotDir() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  return SCREENSHOT_DIR;
}

async function captureScreenshot(page, options) {
  try {
    await page.screenshot(options);
  } catch (error) {
    if (!/(UNKNOWN|EBUSY|EPERM|unknown error).*open/i.test(String(error))) throw error;
    await new Promise((resolve) => setTimeout(resolve, 250));
    await page.screenshot(options);
  }
}

async function installAudioMock(page, { fastSlot = false } = {}) {
  await page.addInitScript(({ shouldFastSlot }) => {
    class E2EAudio {
      constructor(src = "") {
        this.src = src;
        this.currentSrc = src;
        this.preload = "auto";
        this.paused = true;
        this.ended = false;
        this.onended = null;
        this.__timer = null;
      }

      play() {
        if (this.__timer) clearTimeout(this.__timer);
        this.paused = false;
        this.ended = false;
        this.__timer = setTimeout(() => {
          this.__timer = null;
          this.paused = true;
          this.ended = true;
          if (typeof this.onended === "function") this.onended();
        }, 12);
        return Promise.resolve();
      }

      pause() {
        if (this.__timer) clearTimeout(this.__timer);
        this.__timer = null;
        this.paused = true;
      }
    }

    Object.defineProperty(window, "Audio", {
      configurable: true,
      writable: true,
      value: E2EAudio
    });

    if (shouldFastSlot) {
      const originalSetInterval = window.setInterval.bind(window);
      window.setInterval = (callback, delay, ...args) =>
        originalSetInterval(callback, delay === 90 ? 2 : delay, ...args);
    }
  }, { shouldFastSlot: fastSlot });
}

async function openHome(page) {
  await page.goto("/?v=e2e-local", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: config.siteTitle })).toBeVisible();
  await page.waitForFunction(() =>
    typeof window.speechUrl === "function" &&
    typeof window.saveData === "function" &&
    typeof window.fetchData === "function" &&
    typeof window.deleteTeacherData === "function"
  );
}

async function startMode(page, { topic = FIRST_TOPIC, studentId = "E2E-STUDENT", mode = "看圖學單字", touch = false } = {}) {
  await openHome(page);
  const act = async (locator) => touch ? locator.tap() : locator.click();
  await act(page.getByTestId("topic-button").filter({ hasText: topic }));
  await page.getByTestId("student-id").fill(studentId);
  await act(page.getByTestId("start-button"));
  await expect(page.locator('main[data-page="modes"]')).toBeVisible();
  await act(page.getByTestId("mode-button").filter({ hasText: mode }));
  await expect(page.getByTestId("practice-card")).toBeVisible();
}

async function markFrontSentenceAndFlip(page, { touch = false } = {}) {
  const sentence = page.locator('[data-side="front"][data-audio="sentence"]');
  if (touch) await sentence.tap(); else await sentence.click();
  await expect(sentence).toContainText("已聽完例句");
  const card = page.getByTestId("practice-card");
  if (touch) await card.tap({ position: { x: 64, y: 64 } });
  else await card.click({ position: { x: 64, y: 64 } });
  await expect(card).toHaveAttribute("data-flipped", "true");
}

async function chooseLetter(page, letter) {
  const buttons = page.getByTestId("letter-pool").locator("button");
  const labels = await buttons.allTextContents();
  const index = labels.findIndex((label) => label === letter);
  if (index < 0) throw new Error(`Letter ${letter} is not available in the pool: ${labels.join("")}`);
  await buttons.nth(index).click();
}

module.exports = {
  ROOT,
  SCREENSHOT_DIR,
  FIRST_TOPIC,
  FIRST_WORD,
  captureScreenshot,
  chooseLetter,
  ensureScreenshotDir,
  installAudioMock,
  markFrontSentenceAndFlip,
  openHome,
  startMode
};
