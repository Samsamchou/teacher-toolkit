import React, { useState, useRef, useEffect } from "react";
import { cloudMode } from "./transport.mjs";
export function AudioAnswer({ code, block, disabled, responses = [] }) {
  const [recording, setRecording] = useState(false),
    [blob, setBlob] = useState(null),
    [url, setUrl] = useState(""),
    [status, setStatus] = useState(""),
    [result, setResult] = useState(null),
    [busy, setBusy] = useState(false);
  const recorder = useRef(),
    stream = useRef(),
    timer = useRef(),
    attempt = useRef(crypto.randomUUID()),
    mounted = useRef(true);
  const saved = responses
    .filter((r) => r.blockId === block.id && r.ai)
    .sort((a, b) => b.submittedAt - a.submittedAt)[0];
  const passed = result?.passed || saved?.passed;
  useEffect(
    () => () => {
      mounted.current = false;
      clearTimeout(timer.current);
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  useEffect(() => {
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  async function start() {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const mime = ["audio/webm", "audio/mp4", "audio/ogg"].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      if (!mime) throw new Error("瀏覽器不支援錄音格式。");
      const parts = [];
      const r = new MediaRecorder(stream.current, { mimeType: mime });
      recorder.current = r;
      r.ondataavailable = (e) => {
        if (e.data.size) parts.push(e.data);
      };
      r.onstop = () => {
        stream.current.getTracks().forEach((t) => t.stop());
        clearTimeout(timer.current);
        if (mounted.current) {
          setBlob(new Blob(parts, { type: mime }));
          setRecording(false);
          setStatus("錄音已在本機，尚未送出。");
        }
      };
      attempt.current = crypto.randomUUID();
      setResult(null);
      setBlob(null);
      r.start();
      setRecording(true);
      timer.current = setTimeout(() => {
        if (r.state === "recording") r.stop();
      }, 60000);
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      setStatus(e.message);
    }
  }
  async function send() {
    setBusy(true);
    setStatus("正在送出；伺服器依序保存錄音、評分及保存紀錄…");
    try {
      const { functions, ensureAnonymousSession } =
        await import("../lib/firebase-client.js");
      const { httpsCallable } = await import("firebase/functions");
      await ensureAnonymousSession();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let text = "";
      for (const b of bytes) text += String.fromCharCode(b);
      const { data } = await httpsCallable(functions, "liveAudioV2", {
        timeout: 180000,
      })({
        code,
        blockId: block.id,
        attemptId: attempt.current,
        mimeType: blob.type,
        base64Audio: btoa(text),
      });
      setResult(data);
      setStatus("AI、錄音及紀錄均已由伺服器確認。");
    } catch (e) {
      setStatus(e.message + "；可用同一份錄音重試保存。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="lh-form">
      <p>朗讀：{block.text}</p>
      <p>80 分過關，每題每天最多 3 次；錄音與紀錄保存 7 個月。</p>
      {saved && (
        <p>
          已保存最高分 {saved.best}；
          {saved.passed ? "已過關" : "可以再練習，次數由伺服器確認。"}
        </p>
      )}
      <button
        disabled={disabled || recording || busy || passed}
        onClick={start}
      >
        開始錄音（最多 60 秒）
      </button>
      <button disabled={!recording} onClick={() => recorder.current.stop()}>
        停止錄音
      </button>
      {url && <audio controls src={url} />}
      {blob && (
        <button
          disabled={busy || !cloudMode || disabled || !!result}
          onClick={send}
        >
          送出／重試保存（同一錄音不重新評分）
        </button>
      )}
      {!cloudMode && <p>本機可錄音試聽；未啟用真實 AI，不產生模擬分數。</p>}
      <p role="status">{status}</p>
      {result && (
        <div>
          <strong>
            {result.best} 分 · {result.passed ? "已過關" : "再練習一次"}
          </strong>
          <p>{result.result.transcript}</p>
          <p>{result.result.feedback}</p>
        </div>
      )}
    </section>
  );
}
