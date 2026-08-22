import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDir, "..");
const workspaceRoot = path.resolve(siteRoot, "..");
const outputDir = path.join(workspaceRoot, "qa", "live-deployment-20260822");
const baseUrl = process.env.LIVE_BASE_URL || "https://setencerevieworalpractice.web.app";
const liveSpeechAudioPath = process.env.LIVE_SPEECH_AUDIO_PATH || "";
const liveFullGameManifestPath = process.env.LIVE_FULL_GAME_MANIFEST || "";
const projectId = "setencerevieworalpractice";
const storageBucket = "setencerevieworalpractice.firebasestorage.app";
const bank = JSON.parse(await readFile(path.join(siteRoot, "data", "hwg7-sentence-review.json"), "utf8"));

const browserCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

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
    await delay(150);
  }
  throw new Error(`${label}逾時${lastError ? `：${lastError.message}` : ""}`);
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    socket.addEventListener("message", event => {
      const raw = typeof event.data === "string" ? event.data : Buffer.from(event.data).toString("utf8");
      const message = JSON.parse(raw);
      if (!message.id) {
        this.events.push({ method: message.method, params: message.params || {} });
        return;
      }
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

async function evaluate(client, expression, timeoutMs = 30000) {
  const response = await client.call("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  }, timeoutMs);
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text || "瀏覽器 JavaScript 執行失敗");
  }
  return response.result?.value;
}

async function captureScreenshot(client, name) {
  const screenshot = await client.call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  }, 45000);
  await writeFile(path.join(outputDir, name), Buffer.from(screenshot.data, "base64"));
  return name;
}

function responseEvents(client, fragment) {
  return client.events
    .filter(event => event.method === "Network.responseReceived" && event.params.response?.url?.includes(fragment))
    .map(event => ({ url: event.params.response.url, status: event.params.response.status }));
}

async function configureIpadLandscape(client) {
  await client.call("Emulation.setDeviceMetricsOverride", {
    width: 1024,
    height: 768,
    deviceScaleFactor: 2,
    mobile: true,
    screenWidth: 1024,
    screenHeight: 768,
    screenOrientation: { type: "landscapePrimary", angle: 90 },
  });
  await client.call("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await client.call("Emulation.setUserAgentOverride", {
    userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    platform: "iPad",
  });
}

async function runLiveFullGame(appCheckToken) {
  const manifest = JSON.parse(await readFile(liveFullGameManifestPath, "utf8"));
  if (!Array.isArray(manifest) || manifest.length !== 12) throw new Error("完整局 QA manifest 必須正好 12 題。");
  const students = ["99781", "99782"];
  let activeSessionId = "";
  const post = async (apiPath, body, timeoutMs = 90000) => {
    const response = await fetch(`${baseUrl}${apiPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: baseUrl, "X-Firebase-AppCheck": appCheckToken },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      const error = new Error(payload.message || `HTTP ${response.status}`);
      error.code = payload.error?.code || "request_failed";
      error.status = response.status;
      throw error;
    }
    return payload;
  };
  try {
    const session = await post("/api/game/start", { unitId: "hwg7-sr", students, requestId: `full-game-${randomUUID()}` });
    activeSessionId = session.gameSessionId;
    if (session.assignment?.phase !== "a_type1_b_type2" || session.assignment?.firstTurnType !== "read_aloud") {
      throw new Error("完整局 QA 初始題型不是 A 題型 1／B 題型 2。");
    }
    const results = [];
    const turnSummaries = [];
    for (let turnIndex = 0; turnIndex < manifest.length; turnIndex += 1) {
      const item = manifest[turnIndex];
      const expectedType = turnIndex % 2 === 0 ? "read_aloud" : "question_answer";
      if (item.questionType !== expectedType) throw new Error(`第 ${turnIndex + 1} 回合題型未交替。`);
      const audioBase64 = (await readFile(item.audioPath)).toString("base64");
      const evaluation = await post("/api/evaluate-speech", {
        questionId: item.questionId,
        mimeType: "audio/wav",
        audioBase64,
        gameSessionId: session.gameSessionId,
        turnIndex,
        attemptNumber: 1,
        metrics: { speechWindowMs: item.speechWindowMs || 3500, mediumPauses: 0, longPauses: 0 },
      });
      if (evaluation.valid !== true || evaluation.passed !== true || Number(evaluation.scores?.total) < 80 || evaluation.recordingStored !== true) {
        throw new Error(`${item.questionId} 正式評測未達標。`);
      }
      results.push({
        turnIndex,
        questionId: item.questionId,
        questionType: item.questionType,
        transcript: evaluation.transcript,
        totalScore: evaluation.scores.total,
        recordingStored: evaluation.recordingStored,
        transcriptionModel: evaluation.provider?.transcriptionModel || "",
      });
      turnSummaries.push({
        turnIndex,
        questionId: item.questionId,
        studentCode: students[turnIndex % 2],
        questionType: item.questionType,
        status: "passed",
        bestScore: evaluation.scores.total,
        attemptIds: [evaluation.attemptId],
      });
    }
    const completionBody = { gameSessionId: session.gameSessionId, result: { scores: { pink: 0, blue: 0 }, turnSummaries } };
    const completed = await post("/api/game/complete", completionBody);
    activeSessionId = "";
    const repeated = await post("/api/game/complete", completionBody);
    const next = await post("/api/game/start", { unitId: "hwg7-sr", students, requestId: `next-game-${randomUUID()}` });
    activeSessionId = next.gameSessionId;
    const abandoned = await post("/api/game/abandon", { gameSessionId: next.gameSessionId });
    activeSessionId = "";
    return {
      tested: true,
      ok: completed.flipped === true && completed.completedGameCount === 1 && repeated.flipped === false && repeated.idempotent === true && next.assignment?.phase === "a_type2_b_type1" && abandoned.status === "abandoned" && abandoned.flipped === false,
      completedGameCount: completed.completedGameCount,
      firstPhase: session.assignment.phase,
      repeatedIdempotent: repeated.idempotent === true,
      nextPhase: next.assignment?.phase || "",
      nextGameAbandoned: abandoned.status === "abandoned" && abandoned.flipped === false,
      attemptCount: results.length,
      recordingsStored: results.filter(result => result.recordingStored).length,
      results,
    };
  } catch (error) {
    if (activeSessionId) await post("/api/game/abandon", { gameSessionId: activeSessionId }).catch(() => {});
    return { tested: true, ok: false, error: { code: error.code || "", status: error.status || null, message: error.message || "" } };
  }
}

async function staticChecks() {
  const homeResponse = await fetch(`${baseUrl}/index.html`, { redirect: "follow" });
  const html = await homeResponse.text();
  const csp = homeResponse.headers.get("content-security-policy") || "";
  const headerChecks = {
    status200: homeResponse.status === 200,
    noStore: /no-store/iu.test(homeResponse.headers.get("cache-control") || ""),
    cspPresent: Boolean(csp),
    cspNoObjects: /object-src\s+'none'/iu.test(csp),
    cspRecaptchaScript: /script-src[^;]*https:\/\/www\.google\.com\/recaptcha\//iu.test(csp),
    cspRecaptchaConnect: /connect-src[^;]*https:\/\/www\.google\.com\/recaptcha\//iu.test(csp),
    cspRecaptchaFrame: /frame-src[^;]*https:\/\/www\.google\.com\/recaptcha\/[^;]*https:\/\/recaptcha\.google\.com\/recaptcha\//iu.test(csp),
    frameDenied: homeResponse.headers.get("x-frame-options") === "DENY",
    noSniff: homeResponse.headers.get("x-content-type-options") === "nosniff",
    referrerPolicy: homeResponse.headers.get("referrer-policy") === "same-origin",
    microphoneSelfOnly: /microphone=\(self\)/iu.test(homeResponse.headers.get("permissions-policy") || ""),
  };

  const imagePaths = [...new Set(bank.questions.map(question => question.image?.path).filter(Boolean))];
  const images = [];
  for (const imagePath of imagePaths) {
    const response = await fetch(new URL(imagePath, `${baseUrl}/`));
    const bytes = new Uint8Array(await response.arrayBuffer());
    images.push({
      path: imagePath,
      status: response.status,
      contentType: response.headers.get("content-type") || "",
      bytes: bytes.byteLength,
      ok: response.status === 200 && /^image\//iu.test(response.headers.get("content-type") || "") && bytes.byteLength > 1000,
    });
  }

  const missingAppCheck = await fetch(`${baseUrl}/api/game/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: baseUrl },
    body: JSON.stringify({ unitId: "hwg7-sr", students: ["99991", "99992"], requestId: "qa-no-app-check" }),
  });
  const missingAppCheckBody = await missingAppCheck.json().catch(() => ({}));
  const wrongOrigin = await fetch(`${baseUrl}/api/game/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.invalid" },
    body: JSON.stringify({ unitId: "hwg7-sr", students: ["99991", "99992"], requestId: "qa-wrong-origin" }),
  });
  const wrongOriginBody = await wrongOrigin.json().catch(() => ({}));
  const firestoreRead = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/practiceResults/qa-missing`);
  const storageList = await fetch(`https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o?prefix=recordings%2F`);

  return {
    headerChecks,
    htmlHasNoSecretMarker: !/sk-proj-|OPENAI_API_KEY\s*=/u.test(html),
    imageCount: images.length,
    images,
    missingAppCheck: { status: missingAppCheck.status, code: missingAppCheckBody.error?.code || "" },
    wrongOrigin: { status: wrongOrigin.status, code: wrongOriginBody.error?.code || "" },
    firestoreAnonymousStatus: firestoreRead.status,
    storageAnonymousStatus: storageList.status,
  };
}

async function browserChecks() {
  const browserPath = await findBrowser();
  const debugPort = await findFreePort();
  const browserProfile = await mkdtemp(path.join(os.tmpdir(), "hwg7-live-qa-"));
  let browserProcess = null;
  let client = null;
  let browserOutput = "";

  try {
    browserProcess = spawn(browserPath, [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--hide-scrollbars",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${browserProfile}`,
      "about:blank",
    ], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
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
    await client.call("Network.enable");
    await client.call("Log.enable");
    await client.call("Network.setCacheDisabled", { cacheDisabled: true });
    await client.call("Emulation.setDeviceMetricsOverride", {
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: 1366,
      screenHeight: 768,
    });

    const navigation = await client.call("Page.navigate", { url: `${baseUrl}/?liveQa=${Date.now()}` });
    if (navigation.errorText) throw new Error(`正式站導覽失敗：${navigation.errorText}`);
    await waitUntil(() => evaluate(client, "Boolean(window.HWG7AppApi && document.querySelector('h1'))"), 60000, "正式首頁載入");

    const desktopHome = await evaluate(client, `(() => {
      const text = document.body.innerText;
      const modeLabels = ["HWG7 SR", "HWG5 SR", "HWG8 SR", "HWG6 SR"];
      const modeButtons = [...document.querySelectorAll("button")].filter(button => modeLabels.some(label => button.innerText.includes(label)));
      const inputs = [...document.querySelectorAll('input[placeholder^="例如"]')];
      const start = [...document.querySelectorAll("button")].find(button => button.innerText.includes("進入遊戲頁面"));
      return {
        title: document.querySelector("h1")?.innerText || "",
        teacherButton: [...document.querySelectorAll("button")].some(button => button.innerText.includes("教師後台")),
        inputCount: inputs.length,
        modeLabels: modeButtons.map(button => modeLabels.find(label => button.innerText.includes(label))),
        readyCount: modeButtons.filter(button => !button.disabled).length,
        pendingCount: modeButtons.filter(button => button.disabled && button.innerText.includes("題庫準備中")).length,
        startDisabled: Boolean(start?.disabled),
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        hasExpectedSummary: text.includes("每局12題") && text.includes("每人6回合") && text.includes("80分達標"),
      };
    })()`);
    const desktopScreenshot = await captureScreenshot(client, "desktop-home-1366x768.png");

    await configureIpadLandscape(client);
    await client.call("Page.navigate", { url: `${baseUrl}/?liveQaIpad=${Date.now()}` });
    await waitUntil(() => evaluate(client, "Boolean(window.HWG7AppApi && document.querySelector('h1'))"), 60000, "iPad 橫式首頁載入");
    const ipadHome = await evaluate(client, `(() => {
      const teacher = [...document.querySelectorAll("button")].find(button => button.innerText.includes("教師後台"));
      const rect = teacher?.getBoundingClientRect();
      return {
        width: window.innerWidth,
        height: window.innerHeight,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        teacherButtonInViewport: Boolean(rect && rect.left >= 0 && rect.top >= 0 && rect.right <= window.innerWidth && rect.bottom <= window.innerHeight),
        inputCount: document.querySelectorAll('input[placeholder^="例如"]').length,
      };
    })()`);
    const ipadHomeScreenshot = await captureScreenshot(client, "ipad-landscape-home-1024x768.png");

    let fullGame = { tested: false };
    if (liveFullGameManifestPath) {
      const tokenResult = await evaluate(client, "firebase.appCheck().getToken(false)", 60000);
      if (!tokenResult?.token) throw new Error("無法取得完整局 QA 所需的 App Check token。");
      fullGame = await runLiveFullGame(tokenResult.token);
    }

    let speech = { tested: false };
    if (liveSpeechAudioPath) {
      const speechBase64 = JSON.stringify((await readFile(liveSpeechAudioPath)).toString("base64"));
      speech = await evaluate(client, `(async () => {
        let session = null;
        let outcome = { tested: true, ok: false };
        try {
          session = await window.HWG7AppApi.startGame({ unitId: "hwg7-sr", students: ["99881", "99882"] });
          if (session.assignment?.firstTurnType !== "read_aloud") throw new Error("QA pair did not receive read_aloud first.");
          const result = await window.HWG7AppApi.post("/api/evaluate-speech", {
            questionId: "HWG7-SR-013",
            mimeType: "audio/wav",
            audioBase64: ${speechBase64},
            gameSessionId: session.gameSessionId,
            turnIndex: 0,
            attemptNumber: 1,
            metrics: { speechWindowMs: 2600, mediumPauses: 0, longPauses: 0 },
          });
          outcome = {
            tested: true,
            ok: true,
            firstTurnType: session.assignment.firstTurnType,
            transcript: result.transcript || "",
            totalScore: result.scores?.total ?? null,
            passed: result.passed === true,
            valid: result.valid === true,
            recordingStored: result.recordingStored === true,
            transcriptionModel: result.provider?.transcriptionModel || "",
          };
        } catch (error) {
          outcome = { tested: true, ok: false, error: { code: error?.code || "", status: error?.status || null, message: error?.message || "" } };
        } finally {
          if (session?.gameSessionId) {
            try {
              const abandoned = await window.HWG7AppApi.abandonGame(session.gameSessionId);
              outcome.abandoned = abandoned?.status === "abandoned" && abandoned?.flipped === false;
            } catch (error) {
              outcome.abandoned = false;
              outcome.abandonError = error?.code || error?.message || "abandon_failed";
            }
          }
        }
        return outcome;
      })()`, 90000);
    }

    const valuesSet = await evaluate(client, `(() => {
      const inputs = [...document.querySelectorAll('input[placeholder^="例如"]')];
      if (inputs.length !== 2) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      [[inputs[0], "99991"], [inputs[1], "99992"]].forEach(([input, value]) => {
        setter.call(input, value);
        input.dispatchEvent(new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
      return true;
    })()`);
    if (!valuesSet) throw new Error("找不到兩個學生代碼欄位。");
    await waitUntil(() => evaluate(client, `(() => {
      const button = [...document.querySelectorAll("button")].find(item => item.innerText.includes("進入遊戲頁面"));
      return Boolean(button && !button.disabled);
    })()`), 10000, "開始按鈕啟用");
    await evaluate(client, `(() => {
      const button = [...document.querySelectorAll("button")].find(item => item.innerText.includes("進入遊戲頁面"));
      button.click();
      return true;
    })()`);

    try {
      await waitUntil(() => evaluate(client, `(() => {
        const text = document.body.innerText;
        const image = document.querySelector('[data-testid="question-image"]');
        return text.includes("99991") && text.includes("99992") && text.includes("第 1 回合") && image && image.complete && image.naturalWidth > 0;
      })()`), 90000, "App Check 開局與第一題圖片載入");
    } catch (error) {
      const page = await evaluate(client, `(() => ({
        text: document.body.innerText.slice(0, 3000),
        alert: document.querySelector('[role="alert"]')?.innerText || "",
        url: location.href,
      }))()`);
      const diagnostics = {
        error: error.message,
        page,
        startResponses: responseEvents(client, "/api/game/start"),
        consoleErrors: client.events
          .filter(event => event.method === "Runtime.consoleAPICalled" && event.params.type === "error")
          .map(event => event.params.args?.map(argument => argument.value || argument.description || "").join(" ") || "console error"),
        logEntries: client.events
          .filter(event => event.method === "Log.entryAdded")
          .map(event => ({ level: event.params.entry?.level || "", text: event.params.entry?.text || "", url: event.params.entry?.url || "" })),
        loadingFailures: client.events
          .filter(event => event.method === "Network.loadingFailed" && !event.params.canceled)
          .map(event => ({ errorText: event.params.errorText || "", type: event.params.type || "" })),
      };
      await captureScreenshot(client, "ipad-landscape-start-failed-1024x768.png");
      await writeFile(path.join(outputDir, "start-failure-diagnostics.json"), `${JSON.stringify(diagnostics, null, 2)}\n`, "utf8");
      console.error(JSON.stringify(diagnostics, null, 2));
      throw error;
    }
    await waitUntil(() => responseEvents(client, "/api/game/start").some(item => item.status === 200), 10000, "開局 API 200");
    const game = await evaluate(client, `(() => {
      const image = document.querySelector('[data-testid="question-image"]');
      const recordButton = document.querySelector('[data-testid="speech-record-button"]');
      const prompt = document.querySelector('[data-testid="question-stem"]');
      return {
        width: window.innerWidth,
        height: window.innerHeight,
        roundOne: document.body.innerText.includes("第 1 回合"),
        bothStudentsVisible: document.body.innerText.includes("99991") && document.body.innerText.includes("99992"),
        imageLoaded: Boolean(image && image.complete && image.naturalWidth > 0),
        imageSrc: image?.getAttribute("src") || "",
        imageAlt: image?.getAttribute("alt") || "",
        promptVisible: Boolean(prompt),
        recordButtonVisible: Boolean(recordButton),
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    })()`);
    const ipadGameScreenshot = await captureScreenshot(client, "ipad-landscape-game-first-question-1024x768.png");

    await evaluate(client, `(() => {
      const button = [...document.querySelectorAll("button")].find(item => item.innerText.trim() === "首頁");
      if (!button) return false;
      button.click();
      return true;
    })()`);
    await waitUntil(() => evaluate(client, "Boolean(document.querySelector('h1'))"), 10000, "回首頁");
    await waitUntil(() => responseEvents(client, "/api/game/abandon").some(item => item.status === 200), 30000, "放棄未完成局 API 200");

    const consoleErrors = client.events
      .filter(event => event.method === "Runtime.consoleAPICalled" && event.params.type === "error")
      .map(event => event.params.args?.map(argument => argument.value || argument.description || "").join(" ") || "console error");
    const logErrors = client.events
      .filter(event => event.method === "Log.entryAdded" && event.params.entry?.level === "error")
      .map(event => event.params.entry.text || "log error")
      .filter(text => !/favicon\.ico/iu.test(text));
    const loadingFailures = client.events
      .filter(event => event.method === "Network.loadingFailed" && !event.params.canceled)
      .map(event => event.params.errorText || "network loading failed");

    return {
      engine: "Chromium headless via Chrome DevTools Protocol",
      limitation: "iPad Safari 使用 1024×768 橫式尺寸、觸控與 Safari User-Agent 模擬；不是實體 iPad 的 WebKit 引擎。",
      desktopHome,
      ipadHome,
      fullGame,
      speech,
      game,
      startResponses: responseEvents(client, "/api/game/start"),
      abandonResponses: responseEvents(client, "/api/game/abandon"),
      consoleErrors,
      logErrors,
      loadingFailures,
      screenshots: [desktopScreenshot, ipadHomeScreenshot, ipadGameScreenshot],
    };
  } finally {
    client?.close();
    if (browserProcess && browserProcess.exitCode === null) {
      browserProcess.kill();
      await Promise.race([once(browserProcess, "exit").catch(() => {}), delay(2500)]);
    }
    await rm(browserProfile, { recursive: true, force: true }).catch(() => {});
    if (browserOutput && /DevToolsActivePort file doesn't exist/iu.test(browserOutput)) {
      throw new Error("隔離式 Chromium 無法建立除錯連線。");
    }
  }
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const staticResult = await staticChecks();
  const browserResult = await browserChecks();
  const checks = {
    securityHeaders: Object.values(staticResult.headerChecks).every(Boolean),
    noSecretMarker: staticResult.htmlHasNoSecretMarker,
    allImagesOnline: staticResult.imageCount === 13 && staticResult.images.every(image => image.ok),
    appCheckRequired: staticResult.missingAppCheck.status === 401 && staticResult.missingAppCheck.code === "app_check_required",
    wrongOriginRejected: staticResult.wrongOrigin.status === 403 && staticResult.wrongOrigin.code === "origin_not_allowed",
    firestoreDenied: staticResult.firestoreAnonymousStatus === 403,
    storageDenied: staticResult.storageAnonymousStatus === 403,
    desktopHomeReady: browserResult.desktopHome.teacherButton && browserResult.desktopHome.inputCount === 2 && browserResult.desktopHome.readyCount === 1 && browserResult.desktopHome.pendingCount === 3 && browserResult.desktopHome.startDisabled && !browserResult.desktopHome.horizontalOverflow && browserResult.desktopHome.hasExpectedSummary,
    ipadHomeReady: browserResult.ipadHome.width === 1024 && browserResult.ipadHome.height === 768 && browserResult.ipadHome.teacherButtonInViewport && browserResult.ipadHome.inputCount === 2 && !browserResult.ipadHome.horizontalOverflow,
    liveStartWithAppCheck: browserResult.startResponses.some(response => response.status === 200),
    firstQuestionReady: browserResult.game.roundOne && browserResult.game.bothStudentsVisible && browserResult.game.imageLoaded && browserResult.game.promptVisible && !browserResult.game.horizontalOverflow,
    incompleteGameAbandoned: browserResult.abandonResponses.some(response => response.status === 200),
    noBrowserErrors: browserResult.consoleErrors.length === 0 && browserResult.logErrors.length === 0 && browserResult.loadingFailures.length === 0,
  };
  if (liveSpeechAudioPath) {
    checks.liveSpeechEndToEnd = browserResult.speech.tested && browserResult.speech.ok && browserResult.speech.valid && browserResult.speech.passed && browserResult.speech.totalScore >= 80 && browserResult.speech.recordingStored && browserResult.speech.transcriptionModel === "gpt-4o-mini-transcribe" && browserResult.speech.abandoned;
  }
  if (liveFullGameManifestPath) {
    checks.liveFullGameCompletionAndFlip = browserResult.fullGame.tested && browserResult.fullGame.ok && browserResult.fullGame.attemptCount === 12 && browserResult.fullGame.recordingsStored === 12 && browserResult.fullGame.completedGameCount === 1 && browserResult.fullGame.repeatedIdempotent && browserResult.fullGame.nextPhase === "a_type2_b_type1" && browserResult.fullGame.nextGameAbandoned;
  }
  const report = {
    ok: Object.values(checks).every(Boolean),
    generatedAt: new Date().toISOString(),
    baseUrl,
    checks,
    static: staticResult,
    browser: browserResult,
  };
  await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    ok: report.ok,
    outputDir,
    passed: Object.values(checks).filter(Boolean).length,
    total: Object.keys(checks).length,
    failedChecks: Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name),
    imageCount: staticResult.imageCount,
    startStatus: browserResult.startResponses.at(-1)?.status || null,
    abandonStatus: browserResult.abandonResponses.at(-1)?.status || null,
    speech: browserResult.speech,
    fullGame: browserResult.fullGame,
    screenshots: browserResult.screenshots,
    limitation: browserResult.limitation,
  }, null, 2));
  if (!report.ok) process.exitCode = 1;
}

await main();
