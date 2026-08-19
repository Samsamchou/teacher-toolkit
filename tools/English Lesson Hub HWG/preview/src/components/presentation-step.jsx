import { useEffect, useState } from "react";
import { resolveTeacherMediaUrl } from "../lib/teacher-media-client.js";

function firstPdfPage(url) {
  const separator = url.includes("#") ? "&" : "#";
  return `${url}${separator}page=1&zoom=page-width`;
}

export function PresentationStep({ step }) {
  const uploadedPath = String(step.content?.uploadedMedia?.path || "");
  const [sourceUrl, setSourceUrl] = useState("");
  const [mediaError, setMediaError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    let active = true;
    setSourceUrl("");
    setMediaError("");
    if (!uploadedPath) return () => { active = false; };
    resolveTeacherMediaUrl(uploadedPath)
      .then((url) => { if (active) setSourceUrl(url); })
      .catch(() => { if (active) setMediaError("簡報教材暫時無法開啟，請重新整理後再試。"); });
    return () => { active = false; };
  }, [uploadedPath]);

  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    sync();
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  async function toggleFullscreen(event) {
    const stage = event.currentTarget.closest(".lesson-stage");
    if (!stage?.requestFullscreen) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen?.();
      else await stage.requestFullscreen();
    } catch {
      // The normal in-page projection layout remains available.
    }
  }

  if (!sourceUrl) {
    return <section className="content-card presentation-placeholder"><div className="content-card-heading"><span className="content-icon">🖥️</span><h2>{step.title}</h2></div><p>{mediaError || (uploadedPath ? "簡報教材載入中…" : "尚未上傳 PDF 簡報。請在 Teacher Studio 直接選擇檔案上傳。")}</p></section>;
  }

  return (
    <section className="embed-step presentation-step">
      <div className="content-card-heading">
        <div><span className="content-icon">🖥️</span><div><p className="eyebrow">PDF presentation · Page 1</p><h2>{step.content.displayName || step.title}</h2></div></div>
        <div className="presentation-actions">
          <button type="button" className="secondary-button projector-fullscreen-button" onClick={toggleFullscreen}>⛶ <span>{isFullscreen ? "縮小" : "全螢幕"}</span></button>
          <a className="secondary-button" href={sourceUrl} target="_blank" rel="noreferrer">新分頁開啟</a>
        </div>
      </div>
      <iframe title={step.content.displayName || step.title} src={firstPdfPage(sourceUrl)} loading="lazy" />
      <p className="embed-note">簡報會從第 1 頁開啟；全螢幕後按同一按鈕可回到一般 Lesson Flow 畫面。</p>
    </section>
  );
}
