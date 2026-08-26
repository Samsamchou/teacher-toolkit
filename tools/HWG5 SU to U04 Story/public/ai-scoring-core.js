const SCORE_FIELDS = ["accuracy", "fluency", "completeness", "total_score"];

export function buildScoringPrompt(targetText, focusRule) {
    return `你是一位嚴格且專業的台灣國小英語發音教練。
目標句子： "${targetText}"
這個句子的【嚴格發音評分重點】是： ${focusRule}

請聆聽學生的錄音，根據目標句子與上述嚴格重點，進行嚴格但適齡的評分。
少一個字或字尾沒有收音時，總分應明確扣分。
回饋使用 50 字以內、溫柔而具體的繁體中文，只指出一項最需要改善之處。`;
}

function requireText(value, fieldName) {
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(`AI 回傳缺少有效的 ${fieldName}。`);
    }
    return value.trim();
}

function requireScore(value, fieldName) {
    const score = Number(value);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
        throw new Error(`AI 回傳的 ${fieldName} 必須介於 0 到 100。`);
    }
    return Math.round(score);
}

export function parseAndValidateAiResult(rawText) {
    if (typeof rawText !== "string" || !rawText.trim()) {
        throw new Error("AI 沒有回傳評分內容。");
    }

    const cleaned = rawText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    let parsed;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("AI 回傳格式不是有效的 JSON。");
        parsed = JSON.parse(jsonMatch[0]);
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("AI 回傳的評分資料不是物件。");
    }

    const result = {
        transcript: requireText(parsed.transcript, "transcript"),
        feedback: requireText(parsed.feedback, "feedback")
    };
    SCORE_FIELDS.forEach((field) => {
        result[field] = requireScore(parsed[field], field);
    });
    return result;
}

export function calculateExpiryDate(now = new Date()) {
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 7);
    return expiresAt;
}

