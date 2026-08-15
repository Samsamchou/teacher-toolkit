"use strict";

const { defineConfig } = require("@playwright/test");

const localUrl = "http://127.0.0.1:8765";
const externalBaseURL = process.env.E2E_BASE_URL || process.env.LOCAL_E2E_BASE_URL;
const baseURL = externalBaseURL || localUrl;

module.exports = defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.cjs",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: "audit/playwright-results",
  reporter: [
    ["list"],
    ["html", { outputFolder: "audit/playwright-report", open: "never" }]
  ],
  use: {
    baseURL,
    channel: "chrome",
    headless: true,
    ignoreHTTPSErrors: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
    launchOptions: {
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream"
      ]
    }
  },
  webServer: externalBaseURL
    ? undefined
    : {
        command: "node serve-local.js",
        url: localUrl,
        reuseExistingServer: true,
        timeout: 30_000
      },
  projects: [
    {
      name: "desktop",
      use: {
        browserName: "chromium",
        viewport: { width: 1280, height: 900 }
      }
    },
    {
      name: "ipad-touch",
      use: {
        browserName: "chromium",
        viewport: { width: 820, height: 1180 },
        deviceScaleFactor: 2,
        hasTouch: true,
        isMobile: true,
        userAgent: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1"
      }
    },
    {
      name: "phone-touch",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        hasTouch: true,
        isMobile: true,
        userAgent: "Mozilla/5.0 (Linux; Android 15; Mobile) AppleWebKit/537.36 Chrome/138.0.0.0 Mobile Safari/537.36"
      }
    }
  ]
});
