import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

const input = process.stdin;
const output = process.stdout;
const bundledFirebaseCli = fileURLToPath(
  new URL("../../node_modules/.bin/firebase.cmd", import.meta.url),
);
const globalFirebaseCli = process.env.APPDATA
  ? join(process.env.APPDATA, "npm", "firebase.cmd")
  : "firebase.cmd";
const firebaseCli =
  process.argv[2] ??
  (existsSync(bundledFirebaseCli) ? bundledFirebaseCli : globalFirebaseCli);
const projectId = "hwclass-479d2";

const readHiddenPin = (label) =>
  new Promise((resolve, reject) => {
    let value = "";
    output.write(label);
    input.setRawMode(true);
    input.resume();
    input.setEncoding("utf8");

    const finish = () => {
      input.off("data", onData);
      input.setRawMode(false);
      output.write("\n");
      resolve(value);
    };

    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === "\u0003") {
          input.off("data", onData);
          input.setRawMode(false);
          output.write("\n");
          reject(new Error("cancelled"));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u0008" || character === "\u007f") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            output.write("\b \b");
          }
          continue;
        }
        if (/^[0-9]$/.test(character) && value.length < 6) {
          value += character;
          output.write("*");
        }
      }
    };

    input.on("data", onData);
  });

const setSecret = (name, value) => {
  const result = spawnSync(
    firebaseCli,
    [
      "functions:secrets:set",
      name,
      "--project",
      projectId,
      "--data-file=-",
      "--non-interactive",
    ],
    {
    input: `${value}\n`,
    stdio: ["pipe", "inherit", "inherit"],
    shell: process.platform === "win32",
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`無法設定 ${name}`);
};

if (!input.isTTY || typeof input.setRawMode !== "function") {
  console.error("請在互動式終端機執行。 / Run in an interactive terminal.");
  process.exitCode = 1;
} else {
  try {
    const first = await readHiddenPin("請輸入 6 位數教師通行碼：");
    const second = await readHiddenPin("請再次輸入確認：");
    if (!/^[0-9]{6}$/.test(first) || first !== second) {
      throw new Error("格式錯誤或兩次輸入不同");
    }

    output.write("正在安全設定正式環境 Secrets…\n");
    const pinHash = await bcrypt.hash(first, 12);
    setSecret("TEACHER_PIN_BCRYPT_HASH", pinHash);
    setSecret("RATE_LIMIT_IP_SALT", randomBytes(32).toString("base64url"));
    output.write("兩個 Secrets 已設定完成；通行碼與雜湊值均未顯示或寫入檔案。\n");
  } catch (error) {
    if (error instanceof Error && error.message !== "cancelled") {
      console.error(`設定失敗：${error.message}`);
    }
    process.exitCode = 1;
  } finally {
    if (input.isTTY) input.setRawMode(false);
    input.pause();
  }
}
