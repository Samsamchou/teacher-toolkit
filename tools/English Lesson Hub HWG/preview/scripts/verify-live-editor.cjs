const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const output = await fs.mkdtemp(path.join(os.tmpdir(), "lesson-editor-qa-"));
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto("http://127.0.0.1:5183/lab");
    await page.getByRole("button", { name: "＋ 建立互動課程" }).click();
    await page.getByLabel("教材內容", { exact: true }).waitFor();
    assert.equal(await page.getByLabel("Google Slides／Canva 公開播放連結").count(), 1);
    assert.equal(await page.getByLabel("教師私有備註").count(), 1);
    await page.getByLabel("新增題型").selectOption("choice");
    await page.getByRole("button", { name: "＋", exact: true }).click();
    await page.getByRole("heading", { name: "選擇題", exact: true }).waitFor();
    for (const label of [
      "Google Slides／Canva 公開播放連結",
      "教師私有備註",
      "教材內容",
      "教材／題幹",
    ]) assert.equal(await page.getByLabel(label, { exact: true }).count(), 0, label);
    const secondsSelect = page.getByRole("combobox", { name: "作答時間" });
    const pointsSelect = page.getByRole("combobox", { name: "分數" });
    assert.deepEqual(
      await secondsSelect.locator("option").allTextContents(),
      ["1 分鐘", "2 分鐘", "3 分鐘", "5 分鐘", "10 分鐘", "15 分鐘"],
    );
    assert.deepEqual(
      await pointsSelect.locator("option").allTextContents(),
      Array.from({ length: 10 }, (_, i) => `${i + 1} 分`),
    );
    await secondsSelect.selectOption("900");
    await pointsSelect.selectOption("10");
    await page.getByRole("status").filter({ hasText: "草稿已儲存" }).waitFor();
    await page.waitForFunction(async () => {
      const { api } = await import("/src/live/transport.mjs");
      return (await api("decks")).decks.some((deck) =>
        deck.blocks.some((block) => block.type === "choice" && block.seconds === 900 && block.points === 10),
      );
    });
    await page.screenshot({ path: path.join(output, "choice-editor.png"), fullPage: true });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, editor: output, points: 10, seconds: 900 }));
  } finally {
    await browser.close();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
