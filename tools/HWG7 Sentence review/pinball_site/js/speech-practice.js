(function () {
    "use strict";

    const MIME_CANDIDATES = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus"
    ];

    function supportedMimeType() {
        if (!window.MediaRecorder) return "";
        return MIME_CANDIDATES.find(type => MediaRecorder.isTypeSupported(type)) || "";
    }

    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error("錄音檔讀取失敗。"));
            reader.onload = () => {
                const value = String(reader.result || "");
                resolve(value.includes(",") ? value.split(",")[1] : value);
            };
            reader.readAsDataURL(blob);
        });
    }

    function createRecorder({ questionType, onStatus, onComplete, onError }) {
        let recorder = null;
        let stream = null;
        let audioContext = null;
        let analyser = null;
        let intervalId = null;
        let chunks = [];
        let startedAt = 0;
        let voiceStartedAt = 0;
        let lastVoiceAt = 0;
        let aboveSince = 0;
        let silenceStartedAt = 0;
        let mediumPauses = 0;
        let longPauses = 0;
        let baselineSamples = [];
        let stopping = false;
        let cancelled = false;

        const waitLimitMs = questionType === "question_answer" ? 15000 : 12000;
        const hardLimitMs = questionType === "question_answer" ? 40000 : 30000;

        const cleanup = async () => {
            if (intervalId) clearInterval(intervalId);
            intervalId = null;
            if (stream) stream.getTracks().forEach(track => track.stop());
            stream = null;
            if (audioContext && audioContext.state !== "closed") {
                try { await audioContext.close(); } catch (_) { /* ignore cleanup error */ }
            }
            audioContext = null;
        };

        const stop = reason => {
            if (stopping || cancelled) return;
            stopping = true;
            onStatus?.({ state: "stopping", message: reason || "正在整理錄音..." });
            if (recorder && recorder.state !== "inactive") recorder.stop();
        };

        const cancel = async () => {
            if (cancelled) return;
            cancelled = true;
            stopping = true;
            if (recorder && recorder.state !== "inactive") {
                recorder.ondataavailable = null;
                recorder.onstop = null;
                recorder.onerror = null;
                try { recorder.stop(); } catch (_) { /* ignore cancellation race */ }
            }
            await cleanup();
        };

        const start = async () => {
            if (cancelled) return;
            if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
                onError?.(new Error("這個瀏覽器不支援錄音，請改用最新版 Safari 或 Chrome。"));
                return;
            }

            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
                if (cancelled) {
                    await cleanup();
                    return;
                }
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                audioContext = new AudioContextClass();
                if (audioContext.state === "suspended") await audioContext.resume();
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 2048;
                audioContext.createMediaStreamSource(stream).connect(analyser);

                const mimeType = supportedMimeType();
                recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
                chunks = [];
                recorder.ondataavailable = event => {
                    if (event.data?.size > 0) chunks.push(event.data);
                };
                recorder.onerror = event => {
                    onError?.(new Error(event.error?.message || "錄音發生錯誤。"));
                    cleanup();
                };
                recorder.onstop = async () => {
                    if (cancelled) {
                        await cleanup();
                        return;
                    }
                    const actualType = recorder.mimeType || mimeType || "audio/webm";
                    const blob = new Blob(chunks, { type: actualType });
                    const speechWindowMs = voiceStartedAt && lastVoiceAt
                        ? Math.max(0, lastVoiceAt - voiceStartedAt)
                        : 0;
                    await cleanup();
                    if (!voiceStartedAt || speechWindowMs < 300 || blob.size < 1000) {
                        onError?.(new Error("我沒有聽清楚。請靠近麥克風，再說一次吧！"));
                        return;
                    }
                    onComplete?.({
                        blob,
                        mimeType: actualType,
                        metrics: { speechWindowMs, mediumPauses, longPauses }
                    });
                };

                startedAt = performance.now();
                const samples = new Uint8Array(analyser.fftSize);
                recorder.start(250);
                onStatus?.({ state: "recording", message: "錄音中，請開始說英文。" });

                intervalId = setInterval(() => {
                    const now = performance.now();
                    analyser.getByteTimeDomainData(samples);
                    let sum = 0;
                    for (const value of samples) {
                        const normalized = (value - 128) / 128;
                        sum += normalized * normalized;
                    }
                    const level = Math.sqrt(sum / samples.length) * 100;
                    const calibrationMs = 350;
                    if (now - startedAt < calibrationMs) {
                        if (level < 12) baselineSamples.push(level);
                        return;
                    }
                    const baseline = baselineSamples.length
                        ? baselineSamples.reduce((total, value) => total + value, 0) / baselineSamples.length
                        : 0.5;
                    const threshold = Math.max(4, Math.min(12, baseline + 3.5));
                    const above = level > threshold;

                    if (above) {
                        if (!aboveSince) aboveSince = now;
                        if (now - aboveSince >= 150) {
                            if (!voiceStartedAt) voiceStartedAt = now;
                            if (silenceStartedAt && voiceStartedAt) {
                                const pause = now - silenceStartedAt;
                                if (pause >= 2500 && pause < 4000) longPauses += 1;
                                else if (pause >= 1200) mediumPauses += 1;
                            }
                            silenceStartedAt = 0;
                            lastVoiceAt = now;
                            onStatus?.({ state: "recording", message: "有聽到聲音，請繼續說。", level });
                        }
                    } else {
                        aboveSince = 0;
                        if (voiceStartedAt && !silenceStartedAt) silenceStartedAt = now;
                    }

                    if (!voiceStartedAt && now - startedAt >= waitLimitMs) {
                        stop("等待說話時間已到，正在檢查錄音...");
                    } else if (voiceStartedAt && now - lastVoiceAt >= 4000) {
                        stop("已偵測到4秒安靜，正在送出錄音...");
                    } else if (now - startedAt >= hardLimitMs) {
                        stop("已達錄音時間上限，正在檢查錄音...");
                    }
                }, 100);
            } catch (error) {
                await cleanup();
                if (cancelled) return;
                const message = error?.name === "NotAllowedError"
                    ? "麥克風權限尚未開啟，請允許後再試一次。"
                    : (error?.message || "無法啟動麥克風。");
                onError?.(new Error(message));
            }
        };

        return { start, stop: () => stop("已停止錄音，正在送出..."), cancel };
    }

    async function evaluateSpeech({ questionId, blob, mimeType, metrics, gameSessionId, turnIndex, attemptNumber, signal }) {
        const audioBase64 = await blobToBase64(blob);
        if (!window.HWG7AppApi?.post) throw new Error("網站 API 尚未載入，請重新整理後再試。");
        return window.HWG7AppApi.post("/api/evaluate-speech", {
            questionId,
            mimeType,
            audioBase64,
            metrics,
            gameSessionId,
            turnIndex,
            attemptNumber
        }, { signal });
    }

    window.SpeechPractice = { createRecorder, evaluateSpeech, supportedMimeType };
})();
