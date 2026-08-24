import { useEffect, useRef, useState } from "react";
import { desktopPowerPointUrl, parsePowerPointEmbedInput } from "../lib/powerpoint-embed.js";

export function PowerPointStep({ step }) {
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const parsed = parsePowerPointEmbedInput(step.content?.embedUrl || "");
  const title = step.content?.displayName || step.title;
  const desktopUrl = desktopPowerPointUrl(parsed.url);
  const providerLabel = parsed.provider === "google" ? "Google Slides（已發布）" : "PowerPoint for the web";

  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    sync();
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen?.();
      else await containerRef.current?.requestFullscreen?.();
    } catch {
      // The normal in-page projection layout remains available.
    }
  }

  if (parsed.kind !== "valid") {
    return (
      <section className="content-card powerpoint-placeholder">
        <div className="content-card-heading"><span className="content-icon">📊</span><h2>{title}</h2></div>
        <p>{parsed.kind === "empty" ? "尚未設定線上簡報。請在 Teacher Studio 貼上 Google Slides 已發布 pubembed，或 Microsoft 官方 Embed URL／iframe code。" : parsed.message}</p>
      </section>
    );
  }

  return (
    <section className="embed-step powerpoint-step" ref={containerRef}>
      <div className="content-card-heading">
        <div><span className="content-icon">📊</span><div><p className="eyebrow">{providerLabel}</p><h2>{title}</h2></div></div>
        <div className="presentation-actions powerpoint-actions">
          {parsed.needsPreviewCheck ? <span className="powerpoint-runtime-warning">需正式 Embed</span> : null}
          <button type="button" className="secondary-button projector-fullscreen-button" onClick={toggleFullscreen}>⛶ <span>{isFullscreen ? "縮小" : "全螢幕"}</span></button>
          <a className="secondary-button" href={parsed.url} target="_blank" rel="noopener noreferrer">新分頁</a>
          {desktopUrl ? <a className="secondary-button" href={desktopUrl} title="需要已安裝 Microsoft PowerPoint">桌面 PowerPoint</a> : null}
        </div>
      </div>
      <iframe
        title={title}
        src={parsed.url}
        loading="eager"
        allow="fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <p className="embed-note">{parsed.provider === "google"
        ? "先在投影片畫面內點一下，再用滑鼠左鍵播放已建立的動畫或換頁；也可使用全螢幕或新分頁投影。"
        : "先在投影片畫面內點一下，再用滑鼠左鍵播放 On Click 動畫或換頁。若顯示編輯頁或 Microsoft 拒絕內嵌，請重新取得正式 Embed code，或使用新分頁／桌面 PowerPoint。"}</p>
    </section>
  );
}
