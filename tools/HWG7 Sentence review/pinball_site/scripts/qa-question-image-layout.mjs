import { spawn } from "node:child_process";
import { once } from "node:events";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDir, "..");
const workspaceRoot = path.resolve(siteRoot, "..");
const outputDir = path.join(workspaceRoot, "qa", "question-image-layout-20260822");
const bank = JSON.parse(await readFile(path.join(siteRoot, "data", "hwg7-sentence-review.json"), "utf8"));
const questionIds = bank.questions.map(question => question.id);

const browserCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
].filter(Boolean);

const viewports = [
  {
    id: "windows-chrome-1366x768",
    label: "Windows Chrome 1366×768",
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
    mobile: false,
    touch: false
  },
  {
    id: "ipad-safari-landscape-1024x768",
    label: "iPad Safari 橫式尺寸模擬 1024×768",
    width: 1024,
    height: 768,
    deviceScaleFactor: 2,
    mobile: true,
    touch: true,
    userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  }
];

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function findFreePort() {
  const server = createNetServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function findBrowser() {
  for (const candidate of browserCandidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next installed browser.
    }
  }
  throw new Error("找不到可用的 Chrome 或 Edge 執行檔。");
}

async function waitUntil(check, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const value = await check();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await delay(120);
  }
  throw new Error(`${label}逾時${lastError ? `：${lastError.message}` : ""}`);
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    socket.addEventListener("message", event => {
      const raw = typeof event.data === "string"
        ? event.data
        : Buffer.from(event.data).toString("utf8");
      const message = JSON.parse(raw);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
      else pending.resolve(message.result || {});
    });
    socket.addEventListener("close", () => {
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error("Chrome DevTools 連線已關閉。"));
      }
      this.pending.clear();
    });
  }

  call(method, params = {}, timeoutMs = 30000) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} 在 ${timeoutMs}ms 內未完成`));
      }, timeoutMs);
      this.pending.set(id, { method, resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

async function openCdpClient(debugPort) {
  const response = await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: "PUT" });
  if (!response.ok) throw new Error(`無法建立 Chrome 分頁：HTTP ${response.status}`);
  const target = await response.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  return new CdpClient(socket);
}

async function evaluate(client, expression) {
  const response = await client.call("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.text || "瀏覽器 JavaScript 執行失敗");
  }
  return response.result?.value;
}

function layoutMetricsExpression() {
  return `(() => {
    const frame = document.querySelector('[data-testid="question-image-frame"]');
    const image = document.querySelector('[data-testid="question-image"]');
    const fallback = document.querySelector('[data-testid="question-image-fallback"]');
    const prompt = document.querySelector('[data-testid="question-prompt"]');
    const stem = document.querySelector('[data-testid="question-stem"]');
    const record = document.querySelector('[data-testid="speech-record-button"]');
    const scaffold = document.querySelector('[data-testid="answer-scaffold"]');
    const modelAudio = document.querySelector('.speech-model-audio-button');
    const panel = document.querySelector('[data-testid="control-panel"]');
    const qaRoot = document.querySelector('[data-layout-qa-question]');
    const rect = element => {
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return {
        top: Number(value.top.toFixed(2)),
        right: Number(value.right.toFixed(2)),
        bottom: Number(value.bottom.toFixed(2)),
        left: Number(value.left.toFixed(2)),
        width: Number(value.width.toFixed(2)),
        height: Number(value.height.toFixed(2))
      };
    };
    const within = value => Boolean(value)
      && value.top >= -0.5
      && value.left >= -0.5
      && value.bottom <= window.innerHeight + 0.5
      && value.right <= window.innerWidth + 0.5;
    const frameRect = rect(frame);
    const promptRect = rect(prompt);
    const stemRect = rect(stem);
    const recordRect = rect(record);
    const scaffoldRect = rect(scaffold);
    const panelRect = rect(panel);
    const follows = (first, second) => Boolean(
      first && second && (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING)
    );
    return {
      questionId: qaRoot?.getAttribute('data-layout-qa-question') || "",
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
      },
      frame: frameRect,
      prompt: promptRect,
      stem: stemRect,
      recordButton: recordRect,
      scaffold: scaffoldRect,
      scaffoldText: scaffold?.textContent?.trim() || "",
      hasScaffold: Boolean(scaffold),
      hasModelAudio: Boolean(modelAudio),
      panel: panelRect,
      image: image ? {
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        objectFit: getComputedStyle(image).objectFit
      } : null,
      fallbackVisible: Boolean(fallback),
      domOrder: follows(frame, stem) && follows(stem, record),
      visualOrder: Boolean(frameRect && promptRect && recordRect)
        && frameRect.bottom <= promptRect.top + 0.5
        && promptRect.bottom <= recordRect.top + 0.5,
      imageStemRecordInFirstViewport: within(frameRect) && within(stemRect) && within(recordRect),
      recordButtonHeightOk: Boolean(recordRect) && recordRect.height >= 55.5,
      imageFrameHeightOk: Boolean(frameRect) && frameRect.height <= 224.5,
      imageContained: !image || getComputedStyle(image).objectFit === "contain",

      panelAtTop: Boolean(panel) && panel.scrollTop === 0,
      panelScrollHeight: panel?.scrollHeight || 0,
      panelClientHeight: panel?.clientHeight || 0,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1
    };
  })()`;
}

function checksFor(metrics, expectedQuestionId) {
  const question = bank.questions.find(item => item.id === expectedQuestionId);
  const expectedScaffold = question?.answerPromptStructure || "";
  return {
    correctQuestion: metrics.questionId === expectedQuestionId,
    viewportExact: metrics.viewport.width > 0 && metrics.viewport.height > 0,
    domOrder: metrics.domOrder,
    visualOrder: metrics.visualOrder,
    imageStemRecordInFirstViewport: metrics.imageStemRecordInFirstViewport,
    recordButtonHeightOk: metrics.recordButtonHeightOk,
    imageFrameHeightOk: metrics.imageFrameHeightOk,
    imageContained: metrics.imageContained,
    modelAudioMatchesType: question?.type === "read_aloud" ? metrics.hasModelAudio : !metrics.hasModelAudio,
    scaffoldMatchesQuestion: expectedScaffold ? metrics.scaffoldText === expectedScaffold : !metrics.hasScaffold,
    panelAtTop: metrics.panelAtTop,
    noHorizontalOverflow: !metrics.horizontalOverflow,
    imageLoaded: Boolean(metrics.image?.complete && metrics.image?.naturalWidth > 0 && metrics.image?.naturalHeight > 0)
  };
}

async function configureViewport(client, viewport) {
  await client.call("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.deviceScaleFactor,
    mobile: viewport.mobile,
    screenWidth: viewport.width,
    screenHeight: viewport.height,
    screenOrientation: { type: "landscapePrimary", angle: 90 }
  });
  await client.call("Emulation.setTouchEmulationEnabled", {
    enabled: viewport.touch,
    maxTouchPoints: viewport.touch ? 5 : 1
  });
  if (viewport.userAgent) {
    await client.call("Emulation.setUserAgentOverride", {
      userAgent: viewport.userAgent,
      platform: "iPad"
    });
  }
}

async function waitForQuestionLayout(client, questionId) {
  const expected = JSON.stringify(questionId);
  await waitUntil(async () => evaluate(client, `(() => {
    const root = document.querySelector('[data-layout-qa-question=' + CSS.escape(${expected}) + ']');
    const frame = document.querySelector('[data-testid="question-image-frame"]');
    const stem = document.querySelector('[data-testid="question-stem"]');
    const record = document.querySelector('[data-testid="speech-record-button"]');
    const image = document.querySelector('[data-testid="question-image"]');
    const fallback = document.querySelector('[data-testid="question-image-fallback"]');
    return Boolean(root && frame && stem && record && (fallback || (image && image.complete && image.naturalWidth > 0)));
  })()`), 30000, `${questionId} 題目版面載入`);
}

async function captureViewport(client, baseUrl, viewport) {
  await configureViewport(client, viewport);
  const results = [];
  for (const questionId of questionIds) {
    const url = `${baseUrl}/?layoutQa=${encodeURIComponent(questionId)}`;
    const navigation = await client.call("Page.navigate", { url });
    if (navigation.errorText) throw new Error(`${questionId} 導覽失敗：${navigation.errorText}`);
    await waitForQuestionLayout(client, questionId);
    await delay(120);
    const metrics = await evaluate(client, layoutMetricsExpression());
    const checks = checksFor(metrics, questionId);
    const passed = Object.values(checks).every(Boolean);
    const screenshot = await client.call("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false
    }, 45000);
    const screenshotName = `${questionId}--${viewport.id}.png`;
    await writeFile(path.join(outputDir, screenshotName), Buffer.from(screenshot.data, "base64"));
    results.push({
      questionId,
      viewportId: viewport.id,
      viewportLabel: viewport.label,
      passed,
      checks,
      metrics,
      screenshot: screenshotName
    });
  }
  return results;
}

async function captureFallback(client, baseUrl, viewport) {
  await configureViewport(client, viewport);
  const questionId = "HWG7-SR-013";
  await client.call("Page.navigate", { url: `${baseUrl}/?layoutQa=${questionId}` });
  await waitForQuestionLayout(client, questionId);
  const before = await evaluate(client, layoutMetricsExpression());
  await evaluate(client, `(() => {
    const image = document.querySelector('[data-testid="question-image"]');
    if (!image) return false;
    image.src = '/images/hwg7-sentence-review/qa-missing-image.png';
    return true;
  })()`);
  await waitUntil(
    () => evaluate(client, "Boolean(document.querySelector('[data-testid=\"question-image-fallback\"]'))"),
    10000,
    "缺圖替代狀態"
  );
  const after = await evaluate(client, layoutMetricsExpression());
  const checks = {
    fallbackVisible: after.fallbackVisible,
    stableFrameHeight: Math.abs(after.frame.height - before.frame.height) <= 0.5,
    stablePromptTop: Math.abs(after.prompt.top - before.prompt.top) <= 0.5,
    stemAndRecordRemainVisible: after.imageStemRecordInFirstViewport
  };
  const screenshot = await client.call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false
  }, 45000);
  const screenshotName = `${questionId}--${viewport.id}--missing-image-fallback.png`;
  await writeFile(path.join(outputDir, screenshotName), Buffer.from(screenshot.data, "base64"));
  return {
    questionId,
    viewportId: viewport.id,
    passed: Object.values(checks).every(Boolean),
    checks,
    before: { frame: before.frame, prompt: before.prompt },
    after: { frame: after.frame, prompt: after.prompt },
    screenshot: screenshotName
  };
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await Promise.race([once(child, "exit").catch(() => {}), delay(2500)]);
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const browserPath = await findBrowser();
  const serverPort = await findFreePort();
  const debugPort = await findFreePort();
  const browserProfile = await mkdtemp(path.join(os.tmpdir(), "hwg7-layout-qa-"));
  let serverProcess = null;
  let browserProcess = null;
  let client = null;
  let serverOutput = "";
  let browserOutput = "";

  try {
    serverProcess = spawn(process.execPath, ["server.mjs"], {
      cwd: siteRoot,
      env: { ...process.env, PORT: String(serverPort) },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    serverProcess.stdout.on("data", chunk => { serverOutput += chunk.toString(); });
    serverProcess.stderr.on("data", chunk => { serverOutput += chunk.toString(); });

    const baseUrl = `http://127.0.0.1:${serverPort}`;
    await waitUntil(async () => {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(2000) });
      return response.ok;
    }, 15000, "本機網站啟動");

    browserProcess = spawn(browserPath, [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--hide-scrollbars",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${browserProfile}`,
      "about:blank"
    ], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    browserProcess.stdout.on("data", chunk => { browserOutput += chunk.toString(); });
    browserProcess.stderr.on("data", chunk => { browserOutput += chunk.toString(); });

    await waitUntil(async () => {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`, { signal: AbortSignal.timeout(2000) });
      return response.ok;
    }, 15000, "Headless Chrome 啟動");

    client = await openCdpClient(debugPort);
    await client.call("Page.enable");
    await client.call("Runtime.enable");

    const results = [];
    for (const viewport of viewports) {
      results.push(...await captureViewport(client, baseUrl, viewport));
    }
    const fallback = await captureFallback(client, baseUrl, viewports[1]);
    const passedCount = results.filter(result => result.passed).length;
    const report = {
      ok: passedCount === results.length && fallback.passed,
      generatedAt: new Date().toISOString(),
      engine: "Chromium headless via Chrome DevTools Protocol",
      limitation: "iPad 項目使用 Safari User-Agent、觸控與 1024×768 橫式尺寸模擬；不等同實體 iPad Safari，引擎實測留待部署後。",
      questionCount: questionIds.length,
      viewportCount: viewports.length,
      screenshotCount: results.length + 1,
      passedCount,
      failedCount: results.length - passedCount,
      viewports,
      results,
      missingImageFallback: fallback
    };
    await writeFile(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2) + "\n", "utf8");

    const summaryRows = viewports.map(viewport => {
      const viewportResults = results.filter(result => result.viewportId === viewport.id);
      return `| ${viewport.label} | ${viewportResults.filter(result => result.passed).length}/${viewportResults.length} | ${viewportResults.every(result => result.passed) ? "通過" : "未通過"} |`;
    });
    const summary = [
      "# HWG7 十三題圖片同屏 QA",
      "",
      `- 結果：**${report.ok ? "通過" : "未通過"}**`,
      `- 題目：${report.questionCount}`,
      `- 一般畫面截圖：${results.length}`,
      `- 缺圖替代截圖：1`,
      `- 說明：${report.limitation}`,
      "",
      "| 驗收尺寸 | 通過題數 | 狀態 |",
      "|---|---:|---|",
      ...summaryRows,
      "",
      `- 缺圖替代狀態：${fallback.passed ? "通過" : "未通過"}`,
      `- 完整數據：report.json`,
      ""
    ].join("\n");
    await writeFile(path.join(outputDir, "summary.md"), summary, "utf8");

    console.log(JSON.stringify({
      ok: report.ok,
      outputDir,
      questionCount: report.questionCount,
      viewportCount: report.viewportCount,
      screenshotCount: report.screenshotCount,
      passedCount: report.passedCount,
      failedCount: report.failedCount,
      fallbackPassed: fallback.passed
    }, null, 2));
    if (!report.ok) process.exitCode = 1;
  } finally {
    client?.close();
    await stopProcess(browserProcess);
    await stopProcess(serverProcess);
    const tempRoot = path.resolve(os.tmpdir()) + path.sep;
    if (path.resolve(browserProfile).startsWith(tempRoot)) {
      await rm(browserProfile, { recursive: true, force: true }).catch(() => {});
    }
    if (process.exitCode && serverOutput) {
      console.error(serverOutput.slice(-2000));
    }
    if (process.exitCode && browserOutput) {
      console.error(browserOutput.slice(-2000));
    }
  }
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
