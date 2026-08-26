import test from "node:test";
import assert from "node:assert/strict";
import { buildScoringPrompt, calculateExpiryDate, parseAndValidateAiResult } from "../public/ai-scoring-core.js";

test("評分提示包含目標句與發音重點", () => {
    const prompt = buildScoringPrompt("Thank you.", "Thank 的 th 要吐氣。");
    assert.match(prompt, /Thank you\./);
    assert.match(prompt, /th 要吐氣/);
    assert.match(prompt, /繁體中文/);
});

test("有效 JSON 會轉成相容的整數評分物件", () => {
    const result = parseAndValidateAiResult(JSON.stringify({
        transcript: "Thank you.",
        accuracy: 88.4,
        fluency: 91,
        completeness: 100,
        total_score: 92.2,
        feedback: "Thank 的 th 再多吐一點氣。"
    }));
    assert.deepEqual(result, {
        transcript: "Thank you.",
        feedback: "Thank 的 th 再多吐一點氣。",
        accuracy: 88,
        fluency: 91,
        completeness: 100,
        total_score: 92
    });
});

test("缺欄位或超出 0 到 100 時拒絕結果", () => {
    assert.throws(() => parseAndValidateAiResult(JSON.stringify({
        transcript: "Hi",
        feedback: "再試一次。",
        accuracy: 101,
        fluency: 80,
        completeness: 80,
        total_score: 80
    })), /accuracy/);
});

test("七個月到期日使用日曆月份計算", () => {
    assert.equal(calculateExpiryDate(new Date("2026-08-26T00:00:00+08:00")).toISOString(), "2027-03-25T16:00:00.000Z");
});
