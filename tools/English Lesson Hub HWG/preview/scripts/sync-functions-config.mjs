import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = JSON.parse(await readFile(resolve(root, "config/site-source.json"), "utf8"));
const firebase = source.firebase || {};
const teacherPasscode = firebase.teacherPasscode || {};
const config = {
  functionsRegion: String(firebase.functionsRegion || ""),
  teacherPasscode: {
    secretName: String(teacherPasscode.secretName || ""),
    loginFunction: String(teacherPasscode.loginFunction || ""),
    logoutFunction: String(teacherPasscode.logoutFunction || ""),
    listFunction: String(teacherPasscode.listFunction || ""),
    recordExportFunction: String(teacherPasscode.recordExportFunction || ""),
    deleteFunction: String(teacherPasscode.deleteFunction || ""),
    sessionHours: Number(teacherPasscode.sessionHours || 0),
    resultLimit: Number(teacherPasscode.resultLimit || 0)
  }
};
const required = [
  config.functionsRegion,
  config.teacherPasscode.secretName,
  config.teacherPasscode.loginFunction,
  config.teacherPasscode.logoutFunction,
  config.teacherPasscode.listFunction,
  config.teacherPasscode.recordExportFunction,
  config.teacherPasscode.deleteFunction
];
if (required.some((value) => !value)) throw new Error("Missing teacher passcode Functions configuration in config/site-source.json.");
if (!Number.isInteger(config.teacherPasscode.sessionHours) || config.teacherPasscode.sessionHours < 1 || config.teacherPasscode.sessionHours > 24) throw new Error("Teacher Results session duration must be 1–24 hours.");
if (!Number.isInteger(config.teacherPasscode.resultLimit) || config.teacherPasscode.resultLimit < 1 || config.teacherPasscode.resultLimit > 5000) throw new Error("Teacher Results limit must be 1–5000.");
const output = `"use strict";\n\n// Generated from config/site-source.json by scripts/sync-functions-config.mjs.\nmodule.exports = Object.freeze(${JSON.stringify(config, null, 2)});\n`;
await writeFile(resolve(root, "functions/site-config.generated.cjs"), output, "utf8");
console.log(JSON.stringify({ status: "PASS", functionsRegion: config.functionsRegion, secretName: config.teacherPasscode.secretName, functions: [config.teacherPasscode.loginFunction, config.teacherPasscode.logoutFunction, config.teacherPasscode.listFunction, config.teacherPasscode.recordExportFunction, config.teacherPasscode.deleteFunction] }));