"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "public", "site-config.js");
const destination = path.join(root, "functions", "site-config.generated.cjs");

if (!fs.existsSync(source)) {
  throw new Error(`Missing canonical site config: ${source}`);
}

if (!fs.existsSync(destination) || !fs.readFileSync(destination).equals(fs.readFileSync(source))) {
  throw new Error(`Generated Functions config is out of sync: ${path.relative(root, destination)}`);
}
console.log(`Verified ${path.relative(root, source)} matches ${path.relative(root, destination)}`);
