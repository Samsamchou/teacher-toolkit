import assert from "node:assert/strict";

const baseUrl = `http://${process.env.FIREBASE_HOSTING_EMULATOR_HOST || "127.0.0.1:5000"}`;
const checks = [
    { path: "/", contains: "HWG Story Reading Practice" },
    { path: "/recording-reliability-core.js", contains: "encodeMonoPcm16Wav" },
    { path: "/ai-scoring.js", contains: "AgentPlatformBackend" }
];
const results = [];

for (const check of checks) {
    const response = await fetch(`${baseUrl}${check.path}`);
    const body = await response.text();
    assert.equal(response.status, 200, `${check.path} 應回傳 200`);
    assert.ok(body.includes(check.contains), `${check.path} 缺少預期內容`);
    results.push({
        path: check.path,
        status: response.status,
        bytes: Buffer.byteLength(body),
        contentType: response.headers.get("content-type")
    });
}

console.log(JSON.stringify(results));
