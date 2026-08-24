import { useState } from "react";
import { parsePowerPointEmbedInput } from "../lib/powerpoint-embed.js";

export function PowerPointEmbedFields({ content, onChange }) {
  const [draft, setDraft] = useState(() => String(content.embedUrl || ""));
  const parsed = parsePowerPointEmbedInput(draft);
  const status = parsed.kind === "valid" && parsed.needsPreviewCheck ? "warning" : parsed.kind;

  function updateEmbedInput(value) {
    const next = parsePowerPointEmbedInput(value);
    const normalized = next.kind === "valid" ? next.url : value;
    setDraft(normalized);
    onChange({ embedUrl: next.kind === "valid" ? next.url : "" });
  }

  return (
    <div className="powerpoint-editor">
      <div className="form-grid compact-fields">
        <label>Display name
          <input value={content.displayName || ""} onChange={(event) => onChange({ displayName: event.target.value })} placeholder="例如 Starter 課堂線上簡報" />
        </label>
        <label className="full-width">Google Slides / Microsoft Embed URL / iframe code
          <textarea
            value={draft}
            onChange={(event) => updateEmbedInput(event.target.value)}
            placeholder="貼入 Google Slides 已發布 pubembed，或 Microsoft 官方 HTTPS Embed URL／iframe code"
            rows="4"
          />
        </label>
      </div>
      <div className={"powerpoint-link-status " + status} role="status">
        <span>{status === "valid" ? "可嵌入" : status === "warning" ? "需預覽" : status === "invalid" ? "格式有誤" : "尚未設定"}</span>
        <p>{parsed.message}</p>
        {parsed.kind === "valid" ? <a className="secondary-button" href={parsed.url} target="_blank" rel="noopener noreferrer">新分頁測試</a> : null}
      </div>
      <p className="field-help">Google Slides 只接受已發布的 docs.google.com/presentation/d/e/.../pubembed；一般 /edit 或未發布分享網址會拒絕。iframe 原始寬高不會固定套用，Lesson Hub 會以 100% × 100% 填滿投影區。網站不保存任何帳密、Cookie 或 Token。</p>
    </div>
  );
}
