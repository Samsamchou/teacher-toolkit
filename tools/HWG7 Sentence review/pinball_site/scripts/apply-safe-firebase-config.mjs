import { copyFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptsDir, "..");
const configRoot = path.join(siteRoot, "config");
const names = ["firebase.json", "firestore.rules", "storage.rules"];

for (const name of names) {
    const source = path.join(configRoot, name);
    const destination = path.join(siteRoot, name);
    await readFile(source);
    await copyFile(source, destination);
}

console.log(`Applied ${names.length} safe Firebase config files.`);
