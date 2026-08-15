"use strict";

const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.LOCAL_E2E_PORT || 8765);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const requestedTests = process.argv.slice(2);

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function probe() {
  return new Promise((resolve) => {
    const request = http.get(`${BASE_URL}/?v=e2e-health`, (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });
    request.setTimeout(1_000, () => request.destroy());
    request.on("error", () => resolve(false));
  });
}

async function waitForServer(server) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Local server exited before becoming ready (code ${server.exitCode}).`);
    }
    if (await probe()) return;
    await wait(250);
  }
  throw new Error(`Local server did not become ready at ${BASE_URL}.`);
}

function runPlaywright() {
  const cli = require.resolve("@playwright/test/cli");
  const env = { ...process.env, LOCAL_E2E_BASE_URL: BASE_URL };
  delete env.E2E_BASE_URL;
  const child = spawn(process.execPath, [cli, "test", ...requestedTests], {
    cwd: ROOT,
    env,
    stdio: "inherit",
    windowsHide: true,
  });
  return {
    child,
    completion: new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
    }),
  };
}

async function stopChild(child) {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  await Promise.race([exited, wait(3_000)]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

async function main() {
  const server = spawn(process.execPath, [path.join(ROOT, "serve-local.js")], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  server.stdout.on("data", (chunk) => process.stdout.write(chunk));
  server.stderr.on("data", (chunk) => process.stderr.write(chunk));

  let playwright;
  let exitCode = 1;
  try {
    await waitForServer(server);
    const run = runPlaywright();
    playwright = run.child;
    exitCode = await run.completion;
  } finally {
    await stopChild(playwright);
    await stopChild(server);
  }
  process.exitCode = exitCode;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
