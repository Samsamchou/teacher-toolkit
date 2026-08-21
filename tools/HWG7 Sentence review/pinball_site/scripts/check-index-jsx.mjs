import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.resolve(scriptDir, "..", "index.html");
const html = await readFile(indexPath, "utf8");
const matches = [...html.matchAll(/<script\s+type=["']text\/babel["'][^>]*>([\s\S]*?)<\/script>/gi)];
if (matches.length !== 1) throw new Error(`Expected one text/babel script, found ${matches.length}`);

const response = await fetch("https://unpkg.com/@babel/standalone/babel.min.js");
if (!response.ok) throw new Error(`Unable to load Babel standalone: HTTP ${response.status}`);
const babelSource = await response.text();
const context = { console };
context.window = context;
context.self = context;
context.globalThis = context;
vm.runInNewContext(babelSource, context, { filename: "babel.min.js" });
const transformed = context.Babel.transform(matches[0][1], {
    filename: "index.inline.jsx",
    presets: ["react"],
    sourceType: "script"
});
if (!transformed?.code) throw new Error("Babel returned no transformed code.");
console.log(JSON.stringify({ ok: true, babelScripts: matches.length, jsxCharacters: matches[0][1].length, outputCharacters: transformed.code.length }));
