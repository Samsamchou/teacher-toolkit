const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const base = "http://127.0.0.1:5183";
async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const output = path.join(process.cwd(), "qa-live-rewards");
  await fs.mkdir(output, { recursive: true });
  const errors = [],
    results = [];
  try {
    for (const game of process.env.REWARD_TEST_GAME === "plinkoh" ? ["plinkoh"] : ["basketball", "plinkoh", "slot"]) {
      const tc = await browser.newContext({
          viewport: { width: 1440, height: 1000 },
        }),
        sc = await browser.newContext({
          viewport: { width: 820, height: 1180 },
          hasTouch: true,
        });
      const t = await tc.newPage(),
        s = await sc.newPage();
      for (const p of [t, s]) p.on("pageerror", (e) => errors.push(e.message));
      await t.goto(base + "/lab");
      if (game === "basketball") {
        await t.getByRole("button", { name: "＋ 建立互動課程" }).click();
        await t
          .getByLabel("本堂課單人遊戲", { exact: true })
          .selectOption("slot");
        await t.getByRole("status").filter({ hasText: "已儲存" }).waitFor();
        assert.equal(
          await t.evaluate(async () => {
            const r = await (
              await import("/src/live/transport.mjs")
            ).api("decks");
            return r.decks.some((d) => d.rewardGame === "slot");
          }),
          true,
        );
      }
      const room = await t.evaluate(async (game) => {
        const { api } = await import("/src/live/transport.mjs"),
          { newBlock } = await import("/src/live/domain.mjs");
        const room = await api("create", null, {
          deck: {
            id: crypto.randomUUID(),
            title: "Reward browser QA " + game,
            rewardGame: game,
            blocks: [
              newBlock("choice", "q1"),
              newBlock("choice", "q2"),
              newBlock("open", "q3"),
              newBlock("cloud", "q4"),
            ],
          },
        });
        sessionStorage.setItem("hub-lab-active-room", room.code);
        return room;
      }, game);
      await t.reload();
      await t.getByRole("button", { name: "開始上課", exact: true }).waitFor();
      await s.goto(base + "/lab?join=" + room.code);
      await s.getByLabel("五位數學號").fill("50101");
      await s.getByRole("button", { name: "加入課堂", exact: true }).click();
      await t.getByRole("button", { name: "開放作答", exact: true }).click();
      await s.getByRole("button", { name: "A. Monday", exact: true }).click();
      await s.getByRole("button", { name: "提交答案", exact: true }).click();
      const panel = s.getByRole("region", { name: "單人課間遊戲" });
      await panel.waitFor();
      await panel.getByText("剩餘機會：2 次", { exact: true }).waitFor();
      const play = (dropZone = 3) =>
        game === "basketball"
          ? panel.getByRole("button", { name: /投籃 1 分/ })
          : panel.getByRole("button", {
              name: game === "plinkoh" ? `落球區 ${dropZone}` : "拉霸 SPIN",
              exact: true,
            });
      if (game === "plinkoh") {
        assert.equal(await panel.getByRole("button", { name: "放球 DROP" }).count(), 0);
        assert.equal(await panel.getByRole("button", { name: /^落球區 [1-5]$/ }).count(), 5);
        const launchInsideBoardTop = await panel.evaluate((section) => {
          const board = section.querySelector(".lh-reward-plink-board").getBoundingClientRect();
          const button = section.querySelector(".lh-reward-plink-launch button").getBoundingClientRect();
          return button.top >= board.top && button.bottom < board.top + board.height * 0.2;
        });
        assert.equal(launchInsideBoardTop, true);
      }
      await play().click();
      if (game === "plinkoh") {
        await s.waitForFunction(async (code) => {
          const reward = (await (await import("/src/live/transport.mjs")).api("snapshot", code)).reward;
          return reward.used === 1 && reward.last?.result?.zone === 3;
        }, room.code);
      }
      await t
        .getByRole("button", { name: "Eyes Up Front", exact: true })
        .click();
      await s.getByRole("heading", { name: "👀 Eyes Up Front" }).waitFor();
      assert.equal(await panel.count(), 0);
      const getReward = () =>
        s.evaluate(
          async (code) =>
            (
              await (
                await import("/src/live/transport.mjs")
              ).api("snapshot", code)
            ).reward,
          room.code,
        );
      const suspended = await getReward();
      assert.equal(suspended.used, 1);
      const seed = suspended.last.seed;
      await s.reload();
      await s.getByRole("heading", { name: "👀 Eyes Up Front" }).waitFor();
      await t.getByRole("button", { name: "繼續", exact: true }).click();
      await panel.waitFor();
      await panel.getByLabel("減少動畫").check();
      await s.waitForFunction(async (code) => {
        const r = (
          await (await import("/src/live/transport.mjs")).api("snapshot", code)
        ).reward;
        return !r.pending;
      }, room.code);
      assert.equal((await getReward()).last.seed, seed);
      assert.equal((await getReward()).used, 1);
      if (game === "plinkoh") await panel.getByLabel("減少動畫").uncheck();
      await play(5).click();
      await panel
        .getByRole("heading", { name: "機會已用完，請等待老師下一題。" })
        .waitFor();
      await s.reload();
      await panel
        .getByRole("heading", { name: "機會已用完，請等待老師下一題。" })
        .waitFor();
      assert.equal((await getReward()).used, 2);
      if (game === "plinkoh") assert.equal((await getReward()).last.result.zone, 5);
      await s.screenshot({
        path: path.join(output, game + "-tablet.png"),
        fullPage: true,
      });
      await s.setViewportSize({ width: 390, height: 844 });
      assert.equal(
        await s.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      await s.screenshot({
        path: path.join(output, game + "-phone.png"),
        fullPage: true,
      });
      await t.getByRole("button", { name: "下一頁", exact: true }).click();
      await t.getByRole("button", { name: "開放作答", exact: true }).click();
      await s.getByRole("button", { name: "B. Tuesday", exact: true }).click();
      await s.getByRole("button", { name: "提交答案", exact: true }).click();
      await panel.getByText("剩餘機會：1 次", { exact: true }).waitFor();
      await play(1).click();
      await panel
        .getByRole("heading", { name: "機會已用完，請等待老師下一題。" })
        .waitFor();
      if (game === "plinkoh") assert.equal((await getReward()).last.result.zone, 1);
      if (game === "slot") {
        await t.getByRole("button", { name: "下一頁", exact: true }).click();
        await t.getByRole("button", { name: "開放作答", exact: true }).click();
        await s.getByRole("textbox").fill("Hello teacher");
        await s.getByRole("button", { name: "提交答案", exact: true }).click();
        await s
          .getByText("等待教師／AI 評分，尚未發放本題遊戲機會。")
          .waitFor();
        assert.equal(await panel.count(), 0);
        await t
          .getByRole("button", { name: "判定未通過（1 次）", exact: true })
          .click();
        await panel.getByText("剩餘機會：1 次", { exact: true }).waitFor();
        await play().click();
        await panel
          .getByRole("heading", { name: "機會已用完，請等待老師下一題。" })
          .waitFor();
        await t
          .getByRole("button", { name: "判定通過（2 次）", exact: true })
          .click();
        await panel.getByText("剩餘機會：1 次", { exact: true }).waitFor();
        await t.getByRole("button", { name: "下一頁", exact: true }).click();
        await t.getByRole("button", { name: "開放作答", exact: true }).click();
        await s.getByRole("textbox").fill("blue");
        await s.getByRole("button", { name: "提交答案", exact: true }).click();
        await panel.getByText("剩餘機會：3 次", { exact: true }).waitFor();
      }
      t.once("dialog", (d) => d.accept());
      await t.getByRole("button", { name: "結束課堂", exact: true }).click();
      await s.getByRole("heading", { name: "今天辛苦了！" }).waitFor();
      assert.equal((await getReward()).remaining, 0);
      assert.equal(await panel.count(), 0);
      results.push({ game, passed: true });
      await tc.close();
      await sc.close();
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ results, errors, output }));
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
