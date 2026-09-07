const AI_AUDIO_MIME_TYPES = new Set([
    "audio/aac",
    "audio/flac",
    "audio/m4a",
    "audio/mp3",
    "audio/mp4",
    "audio/mpeg",
    "audio/mpga",
    "audio/opus",
    "audio/pcm",
    "audio/wav",
    "audio/webm"
]);

export const MIN_RECORDED_AUDIO_BYTES = 512;
export const MAX_RECORDED_AUDIO_BYTES = 10 * 1024 * 1024;

export function normalizeAudioMimeType(value) {
    const mimeType = String(value || "").split(";", 1)[0].trim().toLowerCase();
    if (mimeType === "audio/x-m4a") return "audio/m4a";
    if (mimeType === "audio/x-wav") return "audio/wav";
    return mimeType;
}

export function chooseRecorderMimeType(MediaRecorderClass) {
    if (!MediaRecorderClass || typeof MediaRecorderClass.isTypeSupported !== "function") return "";
    const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4;codecs=mp4a.40.2",
        "audio/mp4"
    ];
    return candidates.find((mimeType) => MediaRecorderClass.isTypeSupported(mimeType)) || "";
}

function isWebmHeader(bytes) {
    return bytes.length >= 4 &&
        bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
}

function isMp4Header(bytes) {
    if (bytes.length < 12) return false;
    for (let index = 4; index <= Math.min(bytes.length - 4, 24); index += 1) {
        if (bytes[index] === 0x66 && bytes[index + 1] === 0x74 &&
            bytes[index + 2] === 0x79 && bytes[index + 3] === 0x70) return true;
    }
    return false;
}

function isWavHeader(bytes) {
    return bytes.length >= 12 &&
        bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45;
}

export function detectAudioContainerMimeType(headBytes) {
    const bytes = headBytes instanceof Uint8Array ? headBytes : new Uint8Array(headBytes || []);
    if (isWebmHeader(bytes)) return "audio/webm";
    if (isMp4Header(bytes)) return "audio/mp4";
    if (isWavHeader(bytes)) return "audio/wav";
    return "";
}

export async function inspectRecordedAudioBlob(blob, options = {}) {
    const minBytes = options.minBytes ?? MIN_RECORDED_AUDIO_BYTES;
    const maxBytes = options.maxBytes ?? MAX_RECORDED_AUDIO_BYTES;
    if (!blob || typeof blob.size !== "number" || typeof blob.slice !== "function") {
        return { ok: false, reason: "missing-audio", mimeType: "", size: 0 };
    }

    const size = blob.size;
    if (size < minBytes) {
        return { ok: false, reason: "audio-too-small", mimeType: normalizeAudioMimeType(blob.type), size };
    }
    if (size > maxBytes) {
        return { ok: false, reason: "audio-too-large", mimeType: normalizeAudioMimeType(blob.type), size };
    }

    const headBytes = new Uint8Array(await blob.slice(0, 32).arrayBuffer());
    const detectedMimeType = detectAudioContainerMimeType(headBytes);
    const declaredMimeType = normalizeAudioMimeType(blob.type);
    const mimeType = declaredMimeType || detectedMimeType;
    if (!AI_AUDIO_MIME_TYPES.has(mimeType)) {
        return { ok: false, reason: "unsupported-mime", mimeType, size };
    }
    if (["audio/webm", "audio/mp4", "audio/m4a", "audio/wav"].includes(mimeType) && !detectedMimeType) {
        return { ok: false, reason: "invalid-container", mimeType, size };
    }
    if (detectedMimeType && mimeType === "audio/webm" && detectedMimeType !== "audio/webm") {
        return { ok: false, reason: "mime-container-mismatch", mimeType, detectedMimeType, size };
    }
    if (detectedMimeType && ["audio/mp4", "audio/m4a"].includes(mimeType) && detectedMimeType !== "audio/mp4") {
        return { ok: false, reason: "mime-container-mismatch", mimeType, detectedMimeType, size };
    }
    if (detectedMimeType && mimeType === "audio/wav" && detectedMimeType !== "audio/wav") {
        return { ok: false, reason: "mime-container-mismatch", mimeType, detectedMimeType, size };
    }

    const durationSeconds = Number(options.durationSeconds);
    if (Number.isFinite(durationSeconds) && durationSeconds < 0.25) {
        return { ok: false, reason: "audio-too-short", mimeType, size, durationSeconds };
    }
    return { ok: true, reason: "ok", mimeType, detectedMimeType, size, durationSeconds };
}

export function encodeMonoPcm16Wav(channels, sampleRate) {
    if (!Array.isArray(channels) || channels.length === 0 || !channels.every((channel) => channel instanceof Float32Array)) {
        throw new TypeError("WAV 編碼需要至少一個 Float32Array 聲道。");
    }
    const frameLength = Math.min(...channels.map((channel) => channel.length));
    const normalizedSampleRate = Math.round(Number(sampleRate));
    if (!frameLength || !Number.isFinite(normalizedSampleRate) || normalizedSampleRate < 8000 || normalizedSampleRate > 192000) {
        throw new RangeError("WAV 的取樣率或音訊長度不正確。");
    }

    const bytesPerSample = 2;
    const dataSize = frameLength * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const writeAscii = (offset, text) => {
        for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
    };
    writeAscii(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeAscii(8, "WAVE");
    writeAscii(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, normalizedSampleRate, true);
    view.setUint32(28, normalizedSampleRate * bytesPerSample, true);
    view.setUint16(32, bytesPerSample, true);
    view.setUint16(34, 16, true);
    writeAscii(36, "data");
    view.setUint32(40, dataSize, true);

    for (let frame = 0; frame < frameLength; frame += 1) {
        let sample = 0;
        for (const channel of channels) sample += channel[frame];
        sample = Math.max(-1, Math.min(1, sample / channels.length));
        view.setInt16(44 + frame * bytesPerSample, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    }
    return buffer;
}

function numericStatus(error) {
    const candidates = [error?.status, error?.httpStatus, error?.customData?.httpStatus];
    for (const value of candidates) {
        const status = Number(value);
        if (Number.isInteger(status) && status >= 100 && status <= 599) return status;
    }
    const match = String(error?.message || error || "").match(/(?:\[|\b)([1-5][0-9]{2})(?:\]|\b)/);
    return match ? Number(match[1]) : null;
}

export function classifyScoringError(error) {
    const message = String(error?.message || error || "");
    const code = String(error?.code || "").toLowerCase();
    const status = numericStatus(error);
    const isTimeout = error?.name === "TimeoutError" || code.includes("timeout") || /\btimeout\b/i.test(message);
    const isNetwork = error instanceof TypeError ||
        code.includes("network") ||
        (code.includes("fetch-error") && !status) ||
        /network|failed to fetch|load failed/i.test(message);
    const retryableStatus = status === 429 || (status !== null && status >= 500);
    const retryable = retryableStatus || isTimeout || isNetwork;
    let category = "unknown";
    if (status === 400) category = "invalid-request";
    else if (status === 429) category = "rate-limited";
    else if (status !== null && status >= 500) category = "server";
    else if (isTimeout) category = "timeout";
    else if (isNetwork) category = "network";
    return { category, retryable, status, code };
}

export async function retryWithBackoff(task, options = {}) {
    const maxRetries = options.maxRetries ?? 2;
    const baseDelayMs = options.baseDelayMs ?? 800;
    const random = options.random || Math.random;
    const sleep = options.sleep || ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)));
    const shouldRetry = options.shouldRetry || ((error) => classifyScoringError(error).retryable);

    for (let attempt = 0; ; attempt += 1) {
        try {
            return await task(attempt);
        } catch (error) {
            if (attempt >= maxRetries || !shouldRetry(error)) throw error;
            const jitter = 0.8 + Math.max(0, Math.min(1, Number(random()))) * 0.4;
            const delayMs = Math.round(baseDelayMs * (2 ** attempt) * jitter);
            if (typeof options.onRetry === "function") {
                options.onRetry({ retryNumber: attempt + 1, delayMs, error: classifyScoringError(error) });
            }
            await sleep(delayMs);
        }
    }
}

export function audioFileExtension(mimeType) {
    const normalized = normalizeAudioMimeType(mimeType);
    if (normalized === "audio/webm") return "webm";
    if (["audio/mp4", "audio/m4a", "audio/aac"].includes(normalized)) return "m4a";
    if (normalized === "audio/wav") return "wav";
    if (["audio/mp3", "audio/mpeg", "audio/mpga"].includes(normalized)) return "mp3";
    if (normalized === "audio/opus") return "opus";
    if (normalized === "audio/flac") return "flac";
    return "audio";
}

export function createEphemeralRecordingStore() {
    let current = null;
    return Object.freeze({
        set(value) {
            if (!value?.attemptId || !value?.sentenceId || !value?.blob) {
                throw new Error("暫存錄音資料不完整。");
            }
            current = value;
            return current;
        },
        get() {
            return current;
        },
        getForSentence(sentenceId) {
            return current?.sentenceId === sentenceId ? current : null;
        },
        clear(attemptId = null) {
            if (!attemptId || current?.attemptId === attemptId) current = null;
        }
    });
}
