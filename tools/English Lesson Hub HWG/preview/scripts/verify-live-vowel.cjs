const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const base = "http://127.0.0.1:5183";

async function fixtureImage(page, word, color) {
  const encoded = await page.evaluate(({ word, color }) => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 320, 200);
    ctx.fillStyle = "#10264c";
    ctx.font = "bold 50px sans-serif";
    ctx.fillText(word, 35, 115);
    return canvas.toDataURL("image/png").split(",")[1];
  }, { word, color });
  return { name: `${word}-synthetic.png`, mimeType: "image/png", buffer: Buffer.from(encoded, "base64") };
}

async function main() {
  const output = process.env.VOWEL_QA_OUT || await fs.mkdtemp(path.join(os.tmpdir(), "lesson-vowel-qa-"));
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const teacher = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const student = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const t = await teacher.newPage();
  const s = await student.newPage();
  const errors = [];
  t.on("pageerror", (error) => errors.push(`teacher: ${error.message}`));
  s.on("pageerror", (error) => errors.push(`student: ${error.message}`));
  t.on("console", (message) => {
    if (message.type() === "error" && /Encountered two children with the same key/.test(message.text()))
      errors.push(`teacher console: ${message.text()}`);
  });
  s.on("console", (message) => {
    if (message.type() === "error" && /Encountered two children with the same key/.test(message.text()))
      errors.push(`student console: ${message.text()}`);
  });
  try {
    await t.goto(`${base}/lab`);
    await t.getByRole("button", { name: "＋ 建立互動課程" }).click();
    await t.getByLabel("新增題型").selectOption("vowel");
    await t.getByRole("button", { name: "＋", exact: true }).click();
    const words = ["bike", "car", "train"];
    const colors = ["#b8d8ff", "#ffd3a8", "#b8efda"];
    for (let i = 0; i < words.length; i++) {
      const card = t.locator(".lh-vowel-editor .lh-vowel-card").nth(i);
      await card.getByRole("textbox", { name: `單字 ${i + 1}`, exact: true }).fill(words[i]);
      await card.locator('input[type="file"]').setInputFiles(
        await fixtureImage(t, words[i], colors[i]),
      );
      await card.getByRole("status").filter({ hasText: `第 ${i + 1} 張圖片已加入` }).waitFor();
      await card.locator("img").waitFor();
    }
    for (const [word, positions] of [["bike", [2, 4]], ["car", [2, 3]], ["train", [3, 4]]]) {
      const group = t.getByRole("group", { name: `${word} 的正確字母` });
      for (const position of positions)
        await group.getByRole("button", { name: new RegExp(`第 ${position} 個字母`) }).click();
    }
    await t.screenshot({ path: path.join(output, "teacher-three-words.png"), fullPage: true });
    await t.getByRole("status").filter({ hasText: "已儲存" }).waitFor();
    await t.getByRole("button", { name: "檢查並開始 Teacher-led →" }).click();
    const join = await t.getByRole("link", { name: "開學生入口" }).getAttribute("href");
    const code = new URL(join).searchParams.get("join");
    await s.goto(join);
    await s.getByLabel("五位數學號").fill("50101");
    await s.getByRole("button", { name: "加入課堂" }).click();
    await t.getByRole("button", { name: "開始上課" }).click();
    await t.getByRole("button", { name: "下一頁", exact: true }).click();
    await t.getByRole("button", { name: "開放作答" }).click();
    const key = (word, position) => s.getByRole("group", { name: `${word} 的字母` })
      .getByRole("button", { name: new RegExp(`${word} 第 ${position} 個字母`) });
    await key("bike", 1).click();
    await s.locator(".lh-vowel-key.is-wrong").waitFor();
    await s.screenshot({ path: path.join(output, "student-wrong-red.png"), fullPage: true });
    await key("bike", 2).click();
    await s.locator(".lh-vowel-key.is-correct").first().waitFor();
    await s.reload();
    await key("bike", 2).locator("span").waitFor();
    assert.equal(await s.locator(".lh-vowel-key.is-correct").count(), 1);
    const reduce = s.getByRole("button", { name: /減少動畫/ });
    await reduce.click();
    assert.equal(await s.locator(".lh-vowel-question.lh-vowel-reduce").count(), 1);
    await s.screenshot({ path: path.join(output, "student-reconnected-green.png"), fullPage: true });
    await t.getByRole("button", { name: "Eyes Up Front" }).click();
    await s.getByText("👀 Eyes Up Front").waitFor();
    await t.getByRole("button", { name: "繼續", exact: true }).click();
    await key("bike", 4).click();
    await key("car", 3).click();
    await key("car", 2).click();
    await key("train", 4).click();
    await key("train", 3).click();
    const state = await s.evaluate(async (code) => {
      const response = await fetch("/api/live", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Lab-Role": "student" },
        body: JSON.stringify({ action: "snapshot", code }),
      });
      if (!response.ok) throw new Error(`snapshot ${response.status}`);
      return response.json();
    }, code);
    assert.equal(JSON.stringify(state.block).includes("targets"), false);
    assert.equal(state.responses.length, 1);
    assert.equal(state.reward.earned, 2);
    assert.deepEqual(state.vowelProgress.completedWords, [true, true, true]);
    const teacherState = await t.evaluate(async (code) => {
      const response = await fetch("/api/live", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "report", code }),
      });
      if (!response.ok) throw new Error(`report ${response.status}`);
      return response.json();
    }, code);
    assert.equal(teacherState.report.length, 1);
    assert.equal(teacherState.report[0].score, 1);
    assert.equal(teacherState.report[0].max, 1);
    assert.equal(teacherState.report[0].submitted, 1);
    await s.screenshot({ path: path.join(output, "student-complete.png"), fullPage: true });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, code, images: 3, score: teacherState.report[0].score, reward: state.reward.earned, screenshots: output }));
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
