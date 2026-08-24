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
          <input value={content.displayName || ""} onChange={(event) => onChange({ displayName: event.target.value })} placeholder="例如 Starter 課堂簡報" />
        </label>
        <label className="full-width">OneDrive Embed URL / iframe code
          <textarea
            value={draft}
            onChange={(event) => updateEmbedInput(event.target.value)}
            placeholder="貼入 PowerPoint for the web 官方 HTTPS Embed URL 或完整 iframe code"
            rows="4"
          />
        </label>
      </div>
      <div className={"powerpoint-link-status " + status} role="status">
        <span>{status === "valid" ? "可嵌入" : status === "warning" ? "需預覽" : status === "invalid" ? "格式有誤" : "尚未設定"}</span>
        <p>{parsed.message}</p>
        {parsed.kind === "valid" ? <a className="secondary-button" href={parsed.url} target="_blank" rel="noopener noreferrer">新分頁測試</a> : null}
      </div>
      <p className="field-help">只會儲存 Microsoft 官方 HTTPS URL；Lesson Hub 不會保存 Microsoft 帳密、Cookie 或 Token。一般 On Click 動畫可在播放畫面中測試，複雜 Trigger 仍以桌面 PowerPoint 為準。</p>
    </div>
  );
}
