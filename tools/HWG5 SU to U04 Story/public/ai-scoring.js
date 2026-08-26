import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app-check.js";
import { getAI, getGenerativeModel, AgentPlatformBackend, Schema } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-ai.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-functions.js";
import { buildScoringPrompt, parseAndValidateAiResult } from "./ai-scoring-core.js";

const appConfig = window.HWG_APP_CONFIG;
const isLocalDebug = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);

function finishInitialization(value, error = null) {
    window.HWG_AI_INIT_ERROR = error;
    document.documentElement.dataset.aiStatus = error ? "error" : "ready";
    document.documentElement.dataset.aiModel = value?.modelName || "";
    if (error) {
        document.documentElement.dataset.aiError = error.message || "unknown";
    } else {
        delete document.documentElement.dataset.aiError;
        console.log(`✅ Firebase AI Logic 已就緒：${value.modelName}`);
    }
    if (typeof window.__resolveHwgAiScoring === "function") {
        window.__resolveHwgAiScoring(value);
    }
}

try {
    if (!appConfig?.firebaseConfig || !appConfig?.aiModelName) {
        throw new Error("Firebase AI 公開設定不完整。");
    }

    const siteKey = String(appConfig.appCheckSiteKey || "").trim();
    const siteKeyIsPlaceholder = !siteKey || siteKey.startsWith("__");
    if (!isLocalDebug && siteKeyIsPlaceholder) {
        throw new Error("尚未設定正式 reCAPTCHA Enterprise App Check site key。");
    }

    if (isLocalDebug) {
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }

    const aiApp = initializeApp(appConfig.firebaseConfig, "hwg-ai-scoring");
    initializeAppCheck(aiApp, {
        provider: new ReCaptchaEnterpriseProvider(siteKeyIsPlaceholder ? "local-debug-site-key" : siteKey),
        isTokenAutoRefreshEnabled: true
    });

    const responseSchema = Schema.object({
        properties: {
            transcript: Schema.string({ description: "實際聽到的學生英語逐字稿" }),
            accuracy: Schema.number({ description: "0 到 100 的發音精準度" }),
            fluency: Schema.number({ description: "0 到 100 的流暢度" }),
            completeness: Schema.number({ description: "0 到 100 的完整度" }),
            total_score: Schema.number({ description: "0 到 100 的總分" }),
            feedback: Schema.string({ description: "50 字以內、繁體中文、只給一項改進建議" })
        }
    });

    const ai = getAI(aiApp, { backend: new AgentPlatformBackend() });
    const functions = getFunctions(aiApp, "asia-east1");
    const callSynthesizeSpeech = httpsCallable(functions, "synthesizeSpeech", {
        timeout: 30000
    });
    const model = getGenerativeModel(ai, {
        model: appConfig.aiModelName,
        generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema
        }
    });

    finishInitialization({
        modelName: appConfig.aiModelName,
        async speakText(text) {
            const normalizedText = String(text || "").replace(/\s+/g, " ").trim();
            if (!normalizedText || normalizedText.length > 500) {
                throw new Error("語音內容長度不正確。");
            }
            const result = await callSynthesizeSpeech({ text: normalizedText });
            const audioContent = result?.data?.audioContent;
            if (typeof audioContent !== "string" || !audioContent) {
                throw new Error("語音服務沒有回傳音訊。");
            }
            return audioContent;
        },
        async scoreAudio({ base64Audio, mimeType, targetText, focusRule }) {
            if (!base64Audio || !mimeType || !targetText) {
                throw new Error("評分請求缺少錄音或題目資料。");
            }
            const result = await model.generateContent([
                { text: buildScoringPrompt(targetText, focusRule || "請清楚完整朗讀句子。") },
                { inlineData: { mimeType, data: base64Audio } }
            ]);
            return parseAndValidateAiResult(result.response.text());
        }
    });
} catch (error) {
    console.error("Firebase AI Logic 初始化失敗：", error);
    finishInitialization(null, error);
}
