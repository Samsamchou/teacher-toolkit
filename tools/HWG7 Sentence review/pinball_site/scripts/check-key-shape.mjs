import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(scriptDir, "..", "..", ".env.local");
const source = await readFile(envPath, "utf8");
const match = source.match(/^\s*OPENAI_API_KEY\s*=\s*(.*)\s*$/m);
if (!match) throw new Error("OPENAI_API_KEY entry missing");
let value = match[1].trim();
if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
}
console.log(JSON.stringify({
    present: true,
    length: value.length,
    ascii: /^[\x21-\x7e]+$/.test(value),
    startsLikeKey: value.startsWith("sk-"),
    hasWhitespace: /\s/.test(value),
    hasPlaceholder: /請|your|key_here|placeholder/i.test(value)
}));
