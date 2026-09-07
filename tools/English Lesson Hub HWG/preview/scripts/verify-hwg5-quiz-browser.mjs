import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

const baseUrl = process.argv[2] || "http://127.0.0.1:4174";
const reportPath = resolve(process.argv[3] || "audit/hwg5-u01-l1-vocabulary-quiz/browser-qa.json");
const screenshotPath = resolve(process.argv[4] || "audit/hwg5-u01-l1-vocabulary-quiz/first-question-1920x1080.png");
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const targetUrl = `${baseUrl.replace(/\/$/, "")}/?mode=student&book=hwg5&unit=u01&lesson=1`;

const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));

async function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolvePort(address.port));
    });
  });
}

async function fetchJsonWithRetry(url, attempts = 60) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
      lastError = new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
    }
    await wait(100);
  }
  throw lastError || new Error(`Unable to fetch ${url}`);
}

function cdpClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  let nextId = 1;
  const pending = new Map();
  const events = new Map();

  const opened = new Promise((resolveOpen, reject) => {
    socket.addEventListener("open", resolveOpen, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
      return;
    }
    for (const listener of events.get(message.method) || []) listener(message.params);
  });

  return {
    opened,
    close: () => socket.close(),
    on(method, listener) {
      const listeners = events.get(method) || [];
      listeners.push(listener);
      events.set(method, listeners);
    },
    async send(method, params = {}) {
      await opened;
      const id = nextId;
      nextId += 1;
      return new Promise((resolveRequest, reject) => {
        pending.set(id, { resolve: resolveRequest, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    }
  };
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Browser evaluation failed");
  return result.result.value;
}

const port = await freePort();
const userDataDir = await mkdtemp(resolve(tmpdir(), "lesson-hub-hwg5-chrome-"));
const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  "--window-size=1920,1080",
  targetUrl
], { stdio: "ignore" });

let client;
try {
  const targets = await fetchJsonWithRetry(`http://127.0.0.1:${port}/json/list`);
  const page = targets.find((target) => target.type === "page" && target.url.startsWith(baseUrl))
    || targets.find((target) => target.type === "page");
  if (!page?.webSocketDebuggerUrl) throw new Error("Chrome page target was not available");
  client = cdpClient(page.webSocketDebuggerUrl);
  await client.opened;
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false
  });
  await client.send("Page.navigate", { url: targetUrl });
  await wait(3000);

  const gate = await evaluate(client, `(() => ({
    title: document.title,
    bodyText: document.body.innerText,
    placeholder: document.querySelector('.student-id-input')?.getAttribute('placeholder') || '',
    hasStartButton: Boolean([...document.querySelectorAll('button')].find((button) => button.textContent.includes('Start Vocabulary Quiz'))),
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight
  }))()`);

  const normalizedGateText = gate.bodyText.toLowerCase();
  if (!normalizedGateText.includes("hwg5") || !normalizedGateText.includes("unit 1") || !normalizedGateText.includes("lesson 1")) throw new Error("Student route did not open HWG5 Unit 1 Lesson 1");
  if (gate.placeholder !== "50101") throw new Error(`Expected HWG5 placeholder 50101, found ${gate.placeholder}`);
  if (!gate.hasStartButton) throw new Error("Start Vocabulary Quiz button is missing");

  const started = await evaluate(client, `(() => {
    const input = document.querySelector('.student-id-input');
    const button = [...document.querySelectorAll('button')].find((item) => item.textContent.includes('Start Vocabulary Quiz'));
    if (!input || !button) return false;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '50101');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    button.click();
    return true;
  })()`);
  if (!started) throw new Error("Could not start the quiz");
  await wait(1500);

  const firstQuestion = await evaluate(client, `(async () => {
    const image = document.querySelector('.quiz-image-wrap img');
    const options = [...document.querySelectorAll('.quiz-option')].map((button) => button.textContent.trim());
    const audioPaths = [
      '/assets/hwg5-u01/audio/01-sunday.mp3',
      '/assets/hwg5-u01/audio/02-monday.mp3',
      '/assets/hwg5-u01/audio/03-tuesday.mp3',
      '/assets/hwg5-u01/audio/04-wednesday.mp3',
      '/assets/hwg5-u01/audio/05-thursday.mp3',
      '/assets/hwg5-u01/audio/06-friday.mp3',
      '/assets/hwg5-u01/audio/07-saturday.mp3'
    ];
    const context = new AudioContext();
    const audio = [];
    for (const path of audioPaths) {
      const response = await fetch(path);
      const bytes = await response.arrayBuffer();
      const decoded = await context.decodeAudioData(bytes.slice(0));
      audio.push({ path, status: response.status, bytes: bytes.byteLength, durationSeconds: Number(decoded.duration.toFixed(3)) });
    }
    await context.close();
    return {
      label: document.querySelector('.quiz-kicker')?.textContent.trim() || '',
      prompt: document.querySelector('.quiz-header h2')?.textContent.trim() || '',
      image: image ? {
        src: new URL(image.src).pathname,
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        renderedWidth: Number(image.getBoundingClientRect().width.toFixed(1)),
        renderedHeight: Number(image.getBoundingClientRect().height.toFixed(1))
      } : null,
      options,
      audio,
      bodyText: document.body.innerText,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight
    };
  })()`);

  if (firstQuestion.label !== "Look and Choose") throw new Error(`Unexpected first set label: ${firstQuestion.label}`);
  if (firstQuestion.prompt !== "Look at the picture. What day is it?") throw new Error(`Unexpected first prompt: ${firstQuestion.prompt}`);
  if (firstQuestion.image?.src !== "/assets/hwg5-u01/days/01-sunday.jpg") throw new Error(`Unexpected first image: ${firstQuestion.image?.src}`);
  if (!firstQuestion.image.complete || firstQuestion.image.naturalWidth !== 1488 || firstQuestion.image.naturalHeight !== 1072) throw new Error("Sunday image did not decode at the approved dimensions");
  if (firstQuestion.options.length !== 4 || !["Monday", "Sunday", "Friday", "Wednesday"].every((option) => firstQuestion.options.includes(option))) throw new Error("First question options differ from the approved bank");
  if (firstQuestion.audio.some((item) => item.status !== 200 || item.bytes <= 0 || item.durationSeconds <= 0)) throw new Error("One or more HWG5 MP3 assets failed browser decoding");
  if (firstQuestion.bodyText.includes("Which country") || firstQuestion.bodyText.includes("選出國家")) throw new Error("Country-specific copy leaked into the HWG5 quiz");

  const screenshot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await mkdir(dirname(screenshotPath), { recursive: true });
  await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));

  const report = {
    status: "PASS",
    targetUrl,
    viewport: { width: 1920, height: 1080 },
    gate,
    firstQuestion,
    firestoreSubmissionPerformed: false,
    screenshotPath
  };
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
} finally {
  client?.close();
  const chromeExited = new Promise((resolveExit) => chrome.once("exit", resolveExit));
  chrome.kill();
  await Promise.race([chromeExited, wait(3000)]);
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      await rm(userDataDir, { recursive: true, force: true });
      break;
    } catch (error) {
      if (error?.code !== "EBUSY" || attempt === 9) break;
      await wait(200);
    }
  }
}
