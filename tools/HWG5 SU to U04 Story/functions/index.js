import { logger } from "firebase-functions";
import { HttpsError, onCall } from "firebase-functions/v2/https";

let clientPromise;

async function getTextToSpeechClient() {
    if (!clientPromise) {
        clientPromise = import("@google-cloud/text-to-speech").then(({ default: textToSpeech }) => (
            new textToSpeech.TextToSpeechClient()
        ));
    }
    return clientPromise;
}

export const synthesizeSpeech = onCall({
    region: "asia-east1",
    enforceAppCheck: true,
    consumeAppCheckToken: false,
    timeoutSeconds: 30,
    memory: "256MiB",
    maxInstances: 5
}, async (request) => {
    const text = String(request.data?.text || "").replace(/\s+/g, " ").trim();
    if (!text || text.length > 500) {
        throw new HttpsError("invalid-argument", "語音內容必須介於 1 到 500 個字元。");
    }
    if (!/^[\p{L}\p{N}\p{P}\p{Zs}]+$/u.test(text)) {
        throw new HttpsError("invalid-argument", "語音內容包含不支援的控制字元。");
    }

    try {
        const client = await getTextToSpeechClient();
        const [response] = await client.synthesizeSpeech({
            input: { text },
            voice: {
                languageCode: "en-US",
                name: "en-US-Neural2-F"
            },
            audioConfig: {
                audioEncoding: "MP3",
                speakingRate: 0.92
            }
        });
        const audioContent = Buffer.from(response.audioContent || []).toString("base64");
        if (!audioContent) {
            throw new Error("Cloud Text-to-Speech returned empty audio.");
        }
        return { audioContent };
    } catch (error) {
        logger.error("Cloud Text-to-Speech synthesis failed", {
            code: error?.code,
            message: error?.message
        });
        throw new HttpsError("internal", "語音服務暫時無法使用，請稍後再試。");
    }
});
