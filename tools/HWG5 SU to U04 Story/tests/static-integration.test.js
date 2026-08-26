import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const indexPath = new URL("../public/index.html", import.meta.url);
const aiModulePath = new URL("../public/ai-scoring.js", import.meta.url);
const functionsPath = new URL("../functions/index.js", import.meta.url);

test("首頁改用 Firebase AI Logic 模組且不再直連 Generative Language REST", async () => {
    const html = await readFile(indexPath, "utf8");
    assert.match(html, /ai-scoring\.js/);
    assert.doesNotMatch(html, /generativelanguage\.googleapis\.com/i);
    assert.doesNotMatch(html, /GEMINI_API_KEY/);
    assert.doesNotMatch(html, /AQ\.[0-9A-Za-z_-]{20,}/);
});

test("AI 模組使用 App Check、穩定模型設定及結構化 JSON", async () => {
    const source = await readFile(aiModulePath, "utf8");
    assert.match(source, /ReCaptchaEnterpriseProvider/);
    assert.match(source, /AgentPlatformBackend/);
    assert.doesNotMatch(source, /GoogleAIBackend/);
    assert.match(source, /responseMimeType:\s*"application\/json"/);
    assert.match(source, /responseSchema/);
});

test("首頁顯示每題每日剩餘評分次數", async () => {
    const html = await readFile(indexPath, "utf8");
    assert.match(html, /remainingAttempts/);
    assert.match(html, /今天這一題還可評分/);
    assert.match(html, /每日最多/);
});

test("TTS 不再使用公開金鑰並改走 App Check Callable Function", async () => {
    const html = await readFile(indexPath, "utf8");
    const aiModule = await readFile(aiModulePath, "utf8");
    const functions = await readFile(functionsPath, "utf8");
    assert.doesNotMatch(html, /TTS_API_KEY/);
    assert.doesNotMatch(html, /texttospeech\.googleapis\.com/);
    assert.match(aiModule, /httpsCallable/);
    assert.match(aiModule, /synthesizeSpeech/);
    assert.match(functions, /enforceAppCheck:\s*true/);
    assert.match(functions, /getTextToSpeechClient/);
});
