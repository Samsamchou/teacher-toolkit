import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script, runInNewContext } from "node:vm";

const indexPath = new URL("../public/index.html", import.meta.url);
const aiModulePath = new URL("../public/ai-scoring.js", import.meta.url);
const functionsPath = new URL("../functions/index.js", import.meta.url);
const recordingCorePath = new URL("../public/recording-reliability-core.js", import.meta.url);

test("保存重試的讀回必須由伺服器確認，拒絕快取與待寫入資料", async () => {
    const html = await readFile(indexPath, "utf8");
    const body = html.split("probeRecord: async () => {")[1].split("\n                }\n            }),")[0];
    assert.ok(body);
    for (const metadata of [
        {fromCache:true, hasPendingWrites:false},
        {fromCache:false, hasPendingWrites:true},
        {fromCache:false, hasPendingWrites:false}
    ]) {
        const probe = runInNewContext('(async () => {' + body + '})', {
            recordRef:{get:async options => {
                assert.equal(options.source, "server");
                return {exists:true,metadata,data:()=>({})};
            }},
            timeout:()=>new Promise(()=>{}),
            recordMatchesAttempt:()=>true,
            attempt:{},state:{}
        });
        if (metadata.fromCache || metadata.hasPendingWrites) {
            await assert.rejects(probe, error=>error.code === "unavailable");
        } else {
            assert.equal((await probe()).matches,true);
        }
    }
});

test("首頁內嵌程式可由 JavaScript 解析器完整解析", async () => {
    const html = await readFile(indexPath, "utf8");
    const match = html.match(/<script>\s*([\s\S]*?)<\/script>\s*<\/body>/);
    assert.ok(match?.[1], "找不到首頁主要內嵌程式");
    assert.doesNotThrow(() => new Script(match[1]));
});

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

test("錄音流程等待 Safari 完整收尾並提供記憶體重新送評", async () => {
    const html = await readFile(indexPath, "utf8");
    const recordingCore = await readFile(recordingCorePath, "utf8");
    assert.match(html, /HWG_RECORDING_RELIABILITY_READY/);
    assert.match(html, /recorder\.addEventListener\("stop"/);
    assert.match(html, /recorder\.start\(\);/);
    assert.doesNotMatch(html, /mediaRecorder\.start\(100\)/);
    assert.match(html, /重新送出評分（不必重錄）/);
    assert.match(html, /重新儲存紀錄（不重新評分）/);
    assert.match(html, /AI 評分完成；雲端保存尚未完成/);
    assert.match(html, /pagehide/);
    assert.match(html, /new Blob\(\[wavBuffer\], \{ type: "audio\/wav" \}\)/);
    assert.match(recordingCore, /createEphemeralRecordingStore/);
    assert.match(recordingCore, /encodeMonoPcm16Wav/);
    assert.match(recordingCore, /maxRetries/);

    const finalizeStart = html.indexOf("async function persistAndFinalizeAttempt");
    const persistCall = html.indexOf("await persistSuccessfulRecording", finalizeStart);
    const successCount = html.indexOf("markSuccessfulAttempt", persistCall);
    const completedDisplay = html.indexOf("評分與雲端保存完成", successCount);
    assert.ok(finalizeStart >= 0 && persistCall > finalizeStart && successCount > persistCall && completedDisplay > successCount);
    assert.doesNotMatch(html, /collection\("reading_records"\)\.add\(/);
    assert.match(html, /collection\("reading_records"\)\.doc\(state\.recordId\)/);
    assert.match(html, /collection\("persistence_events"\)/);
    assert.match(html, /teacher-persistence-summary/);

    const retryPersistenceStart = html.indexOf("async function retryPendingPersistence");
    const retryPersistenceEnd = html.indexOf("function displayResult", retryPersistenceStart);
    const retryPersistenceSource = html.slice(retryPersistenceStart, retryPersistenceEnd);
    assert.match(retryPersistenceSource, /persistAndFinalizeAttempt/);
    assert.doesNotMatch(retryPersistenceSource, /scoreAudio|canStartScoring|markSuccessfulAttempt/);
});
