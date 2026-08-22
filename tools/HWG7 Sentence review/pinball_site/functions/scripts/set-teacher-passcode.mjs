import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createPasscodeConfig } from "../lib/teacher-auth.mjs";

function readHidden(label) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("此工具必須在互動式終端機執行，不能從參數、管線或環境變數讀取通行碼。");
  return new Promise((resolve, reject) => {
    let value = "";
    process.stdout.write(label);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    const cleanup = () => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    };
    const onData = chunk => {
      for (const character of chunk) {
        if (character === "\u0003") {
          cleanup();
          reject(new Error("已取消設定。"));
          return;
        }
        if (character === "\r" || character === "\n") {
          cleanup();
          resolve(value);
          return;
        }
        if (character === "\u007f" || character === "\b") {
          if (value.length) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }
          continue;
        }
        if (/\d/u.test(character) && value.length < 6) {
          value += character;
          process.stdout.write("•");
        }
      }
    };
    process.stdin.on("data", onData);
  });
}

const firebaseIndex = process.argv.indexOf("--firebase");
const firebaseProjectId = firebaseIndex >= 0 ? String(process.argv[firebaseIndex + 1] || "") : "";
if (process.argv.some(argument => /^--passcode/iu.test(argument))) throw new Error("禁止以命令列參數傳入通行碼。");
if (firebaseIndex >= 0 && !/^setencerevieworalpractice$/u.test(firebaseProjectId)) throw new Error("Firebase 目標必須明確為 setencerevieworalpractice。");

const first = await readHidden("輸入新的六碼教師通行碼：");
const second = await readHidden("再次輸入確認：");
if (!/^\d{6}$/u.test(first)) throw new Error("通行碼必須正好六碼數字。");
if (first !== second) throw new Error("兩次輸入不一致，未寫入任何設定。");
const config = await createPasscodeConfig(first);
const fingerprint = createHash("sha256").update(config.hashBase64).digest("hex").slice(0, 12);
first.replace(/./gu, "0");
second.replace(/./gu, "0");

if (firebaseIndex < 0) {
  const targetUrl = new URL("../../.local/teacher-auth.json", import.meta.url);
  await mkdir(new URL("../../.local/", import.meta.url), { recursive: true });
  await writeFile(targetUrl, `${JSON.stringify(config, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  console.log(`本機教師雜湊設定完成；fingerprint=${fingerprint}。未保存明碼。`);
} else {
  const [{ initializeApp, applicationDefault }, { getFirestore, FieldValue }] = await Promise.all([
    import("firebase-admin/app"),
    import("firebase-admin/firestore")
  ]);
  initializeApp({ credential: applicationDefault(), projectId: firebaseProjectId });
  await getFirestore().collection("privateConfig").doc("teacherAuth").set({
    ...config,
    configuredAt: FieldValue.serverTimestamp(),
    configuredBy: "interactive-local-tool"
  });
  console.log(`Firebase 教師雜湊設定完成；project=${firebaseProjectId}；fingerprint=${fingerprint}。未保存明碼。`);
}