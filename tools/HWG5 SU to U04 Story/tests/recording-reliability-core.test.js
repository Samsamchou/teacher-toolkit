import test from "node:test";
import assert from "node:assert/strict";
import {
    audioFileExtension,
    chooseRecorderMimeType,
    classifyScoringError,
    createEphemeralRecordingStore,
    encodeMonoPcm16Wav,
    inspectRecordedAudioBlob,
    normalizeAudioMimeType,
    retryWithBackoff
} from "../public/recording-reliability-core.js";

function fakeMp4Blob(size = 1024, type = "audio/mp4;codecs=mp4a.40.2") {
    const bytes = new Uint8Array(size);
    bytes.set([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20]);
    return new Blob([bytes], { type });
}

function fakeWebmBlob(size = 1024) {
    const bytes = new Uint8Array(size);
    bytes.set([0x1a, 0x45, 0xdf, 0xa3]);
    return new Blob([bytes], { type: "audio/webm;codecs=opus" });
}

test("依瀏覽器能力選擇錄音格式，舊版 Safari 回退到 MP4", () => {
    const safariRecorder = {
        isTypeSupported: (mimeType) => mimeType === "audio/mp4"
    };
    const modernRecorder = {
        isTypeSupported: (mimeType) => mimeType === "audio/webm;codecs=opus"
    };
    assert.equal(chooseRecorderMimeType(safariRecorder), "audio/mp4");
    assert.equal(chooseRecorderMimeType(modernRecorder), "audio/webm;codecs=opus");
    assert.equal(normalizeAudioMimeType("audio/mp4;codecs=mp4a.40.2"), "audio/mp4");
});

test("驗證 Safari MP4 與 WebM 容器，不接受過小或錯誤標頭", async () => {
    assert.deepEqual(
        await inspectRecordedAudioBlob(fakeMp4Blob(), { durationSeconds: 1.2 }),
        { ok: true, reason: "ok", mimeType: "audio/mp4", detectedMimeType: "audio/mp4", size: 1024, durationSeconds: 1.2 }
    );
    assert.equal((await inspectRecordedAudioBlob(fakeWebmBlob(), { durationSeconds: 1 })).ok, true);
    assert.equal((await inspectRecordedAudioBlob(new Blob([new Uint8Array(16)], { type: "audio/mp4" }))).reason, "audio-too-small");
    assert.equal((await inspectRecordedAudioBlob(new Blob([new Uint8Array(1024)], { type: "audio/mp4" }))).reason, "invalid-container");
});

test("將瀏覽器解碼後的聲道統一成可驗證的單聲道 PCM WAV", async () => {
    const left = new Float32Array([0, 0.5, -0.5, 1]);
    const right = new Float32Array([0, 0.25, -0.25, -1]);
    const wav = encodeMonoPcm16Wav([left, right], 48000);
    const blob = new Blob([wav], { type: "audio/wav" });
    const bytes = new Uint8Array(wav);
    assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), "RIFF");
    assert.equal(new TextDecoder().decode(bytes.slice(8, 12)), "WAVE");
    assert.equal(new DataView(wav).getUint16(22, true), 1);
    assert.equal(new DataView(wav).getUint32(24, true), 48000);
    assert.equal((await inspectRecordedAudioBlob(blob, { minBytes: 44, durationSeconds: 1 })).ok, true);
});

test("400 不重送，429、5xx、網路與逾時可以有限重送", () => {
    assert.equal(classifyScoringError(Object.assign(new Error("[400] invalid argument"), { code: "AI/fetch-error" })).retryable, false);
    assert.equal(classifyScoringError(new Error("[429] too many requests")).retryable, true);
    assert.equal(classifyScoringError(new Error("[503] unavailable")).retryable, true);
    assert.equal(classifyScoringError(Object.assign(new Error("AI 評分逾時"), { name: "TimeoutError" })).retryable, true);
    assert.equal(classifyScoringError(new TypeError("Failed to fetch")).retryable, true);
});

test("可恢復錯誤最多重送兩次，不可恢復錯誤立即停止", async () => {
    let retryableCalls = 0;
    const result = await retryWithBackoff(async () => {
        retryableCalls += 1;
        if (retryableCalls < 3) throw new Error("[503] unavailable");
        return "ok";
    }, { sleep: async () => {}, random: () => 0.5 });
    assert.equal(result, "ok");
    assert.equal(retryableCalls, 3);

    let invalidCalls = 0;
    await assert.rejects(() => retryWithBackoff(async () => {
        invalidCalls += 1;
        throw new Error("[400] invalid argument");
    }, { sleep: async () => {} }), /invalid argument/);
    assert.equal(invalidCalls, 1);
});

test("22 個工作階段的暫存與退避狀態彼此隔離", async () => {
    const sessions = Array.from({ length: 22 }, (_, index) => ({
        index,
        calls: 0,
        store: createEphemeralRecordingStore()
    }));
    for (const session of sessions) {
        session.store.set({
            attemptId: `attempt-${session.index}`,
            sentenceId: `sentence-${session.index}`,
            blob: fakeMp4Blob()
        });
    }

    const results = await Promise.all(sessions.map((session) => retryWithBackoff(async () => {
        session.calls += 1;
        if (session.calls === 1) throw new Error("[503] busy");
        return session.store.get().attemptId;
    }, { sleep: async () => {}, random: () => 0.5 })));

    assert.deepEqual(results, sessions.map((session) => `attempt-${session.index}`));
    assert.ok(sessions.every((session) => session.calls === 2));
    sessions[0].store.clear("attempt-0");
    assert.equal(sessions[0].store.get(), null);
    assert.equal(sessions[1].store.get().attemptId, "attempt-1");
});

test("同一裝置連續四題都只保留當題錄音，成功後立即清除", () => {
    const store = createEphemeralRecordingStore();
    for (let index = 1; index <= 4; index += 1) {
        const attempt = {
            attemptId: `attempt-${index}`,
            sentenceId: `sentence-${index}`,
            blob: fakeMp4Blob()
        };
        store.set(attempt);
        assert.equal(store.getForSentence(`sentence-${index}`), attempt);
        assert.equal(store.getForSentence(`sentence-${index + 1}`), null);
        store.clear(attempt.attemptId);
        assert.equal(store.get(), null);
    }
});

test("失敗錄音不會被錯誤的完成事件清除，新錄音可明確取代它", () => {
    const store = createEphemeralRecordingStore();
    store.set({ attemptId: "failed-1", sentenceId: "sentence-2", blob: fakeMp4Blob() });
    store.clear("another-attempt");
    assert.equal(store.get().attemptId, "failed-1");
    store.set({ attemptId: "new-recording", sentenceId: "sentence-2", blob: fakeMp4Blob() });
    assert.equal(store.get().attemptId, "new-recording");
});

test("Storage 副檔名跟隨實際音訊 MIME", () => {
    assert.equal(audioFileExtension("audio/mp4"), "m4a");
    assert.equal(audioFileExtension("audio/webm;codecs=opus"), "webm");
});
