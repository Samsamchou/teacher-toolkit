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
    logoutFunction: String(teacherPasscode.logoutFunction || "")
  }
};
const required = [
  config.functionsRegion,
  config.teacherPasscode.secretName,
  config.teacherPasscode.loginFunction,
  config.teacherPasscode.logoutFunction
];
if (required.some((value) => !value)) throw new Error("Missing teacher passcode Functions configuration in config/site-source.json.");
const output = `"use strict";\n\n// Generated from config/site-source.json by scripts/sync-functions-config.mjs.\nmodule.exports = Object.freeze(${JSON.stringify(config, null, 2)});\n`;
await writeFile(resolve(root, "functions/site-config.generated.cjs"), output, "utf8");
console.log(JSON.stringify({ status: "PASS", functionsRegion: config.functionsRegion, secretName: config.teacherPasscode.secretName, functions: [config.teacherPasscode.loginFunction, config.teacherPasscode.logoutFunction] }));