import { useEffect, useMemo, useState } from "react";
import {
  ensureTeacherMediaAccess,
  isFirebaseConfigured,
  subscribeTeacherMediaAccess,
  teacherMediaAccessSnapshot
} from "../lib/firebase-client.js";
import { uploadTeacherMedia } from "../lib/teacher-media-client.js";
import { teacherMediaUploadErrorMessage } from "../lib/teacher-media-upload-flow.js";

const IMAGE_ACCEPT = ".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp";

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
}

function normalizeSlideAssets(slides, slideAssets) {
  if (Array.isArray(slideAssets) && slideAssets.length) return slideAssets;
  return (Array.isArray(slides) ? slides : []).map((source) => ({ kind: "legacy", source: String(source || "") }));
}

function sourceForAsset(asset) {
  return asset?.kind === "image" ? String(asset.path || "") : String(asset?.source || "");
}
function teacherUnlockPageUrl() {
  if (typeof window === "undefined") return "#";
  const link = new URL(window.location.href);
  link.search = "";
  link.hash = "";
  link.searchParams.set("screen", "results");
  link.searchParams.set("mediaUnlock", "1");
  return link.toString();
}

function unlockPrompt(code) {
  return code === "teacher-media-unlock-expired"
    ? "圖片上傳解鎖已過期。請重新開啟教師解鎖頁。"
    : "圖片上傳尚未解鎖。請在教師專用頁面建立一次性解鎖連結。";
}

export function TeacherImageSlidesUpload({ lessonId, slides, slideAssets, onChange, onTrackUpload, onTrackRemoval }) {
  const assets = normalizeSlideAssets(slides, slideAssets);
  const [busy, setBusy] = useState(false);
  const [busyIndex, setBusyIndex] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [mediaAccess, setMediaAccess] = useState(() => teacherMediaAccessSnapshot());
  const [accessChecking, setAccessChecking] = useState(isFirebaseConfigured);
  const [accessErrorCode, setAccessErrorCode] = useState("");
  const unlockUrl = useMemo(teacherUnlockPageUrl, []);

  async function refreshAccess(forceRefresh = true) {
    if (!isFirebaseConfigured) return false;
    setAccessChecking(true);
    try {
      const access = await ensureTeacherMediaAccess({ forceRefresh });
      setMediaAccess(access);
      setAccessErrorCode("");
      return true;
    } catch (cause) {
      setMediaAccess(teacherMediaAccessSnapshot());
      setAccessErrorCode(String(cause?.code || "teacher-media-unlock-required"));
      return false;
    } finally {
      setAccessChecking(false);
    }
  }

  useEffect(() => {
    const unsubscribe = subscribeTeacherMediaAccess((access) => {
      setMediaAccess(access);
      if (access.active) setAccessErrorCode("");
    });
    refreshAccess(false);
    const handleFocus = () => refreshAccess(true);
    window.addEventListener("focus", handleFocus);
    return () => {
      unsubscribe();
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  useEffect(() => {
    if (!mediaAccess.expiresAt) return undefined;
    const delay = mediaAccess.expiresAt - Date.now() + 100;
    if (delay <= 0) {
      if (mediaAccess.active) setMediaAccess((current) => ({ ...current, active: false }));
      return undefined;
    }
    const timer = window.setTimeout(() => setMediaAccess((current) => ({ ...current, active: false })), delay);
    return () => window.clearTimeout(timer);
  }, [mediaAccess.active, mediaAccess.expiresAt]);

  function updateAssets(nextAssets) {
    onChange({
      slideAssets: nextAssets,
      slides: nextAssets.map(sourceForAsset),
      slidesFromQuestionBank: false
    });
  }

  async function uploadFileAt(index, file) {
    setBusy(true);
    setBusyIndex(index);
    setProgress(0);
    setStatus("");
    setError("");
    try {
      const uploaded = await uploadTeacherMedia({ lessonId, mediaType: "image", file, onProgress: setProgress });
      const previousPath = assets[index]?.kind === "image" ? assets[index].path : "";
      const nextAssets = assets.map((asset, assetIndex) => assetIndex === index ? uploaded : asset);
      updateAssets(nextAssets);
      onTrackUpload?.({ newPath: uploaded.path, previousPath });
      setStatus(`第 ${index + 1} 張已上傳 ${uploaded.name}。按下 Save Lesson 後才會清除被取代的舊檔。`);
    } catch (cause) {
      setError(teacherMediaUploadErrorMessage(cause));
      if (String(cause?.code || "").startsWith("teacher-media-unlock-")) {
        setAccessErrorCode(String(cause.code));
        setMediaAccess(teacherMediaAccessSnapshot());
      }
    } finally {
      setBusy(false);
      setBusyIndex(null);
    }
  }

  async function replaceFile(index, event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await uploadFileAt(index, file);
  }

  async function appendFiles(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    setBusy(true);
    setStatus("");
    setError("");
    try {
      let nextAssets = [...assets];
      for (const file of files) {
        const uploaded = await uploadTeacherMedia({ lessonId, mediaType: "image", file, onProgress: setProgress });
        nextAssets = [...nextAssets, uploaded];
        onTrackUpload?.({ newPath: uploaded.path, previousPath: "" });
      }
      updateAssets(nextAssets);
      setStatus(`已新增 ${files.length} 張圖片；請確認順序後按 Save Lesson。`);
    } catch (cause) {
      setError(teacherMediaUploadErrorMessage(cause));
      if (String(cause?.code || "").startsWith("teacher-media-unlock-")) {
        setAccessErrorCode(String(cause.code));
        setMediaAccess(teacherMediaAccessSnapshot());
      }
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }

  function removeAsset(index) {
    if (busy) return;
    const asset = assets[index];
    if (!window.confirm(`確定移除第 ${index + 1} 張圖片嗎？`)) return;
    if (asset?.kind === "image" && asset.path) onTrackRemoval?.(asset.path);
    updateAssets(assets.filter((_, assetIndex) => assetIndex !== index));
    setStatus("已排定移除；按下 Save Lesson 後才會刪除雲端圖片。");
  }

  return (
    <div className="teacher-image-slides-upload">
      <div className="teacher-media-upload-heading">
        <strong>Image Slides 圖片上傳</strong>
        <span>PNG／JPG／WebP，單張上限 20 MB</span>
      </div>
      <p className="field-help">本機路徑無法跨瀏覽器使用；請逐張選取原始圖片。上傳後會保留投影片順序，教師與學生都能從雲端讀取。</p>
      {isFirebaseConfigured && accessChecking ? <p className="teacher-media-status">正在檢查 Image Slides 上傳授權…</p> : null}
      {isFirebaseConfigured && !accessChecking && !mediaAccess.active ? (
        <div className="teacher-image-unlock-prompt">
          <div><strong>需要教師解鎖</strong><span>{unlockPrompt(accessErrorCode)}</span></div>
          <div className="teacher-image-unlock-actions">
            <a className="primary-button" href={unlockUrl} target="_blank" rel="noreferrer">開啟教師解鎖頁</a>
            <button className="secondary-button" type="button" onClick={() => refreshAccess(true)}>重新檢查授權</button>
          </div>
        </div>
      ) : null}
      {isFirebaseConfigured && mediaAccess.active ? <p className="teacher-media-status">圖片上傳已解鎖，可使用至 {new Date(mediaAccess.expiresAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}。</p> : null}
      {!assets.length ? <p className="teacher-media-empty">尚未設定圖片；可先加入多張圖片。</p> : null}
      <div className="teacher-image-slide-list">
        {assets.map((asset, index) => (
          <div className="teacher-image-slide-row" key={`${sourceForAsset(asset)}-${index}`}>
            <span className="teacher-image-slide-number">{index + 1}</span>
            <span className="teacher-image-slide-name" title={sourceForAsset(asset)}>{asset.kind === "image" ? `${asset.name || "已上傳圖片"}（${formatBytes(asset.size)}）` : `待重新選取：${asset.source || "未設定"}`}</span>
            <label className="teacher-image-slide-picker">
              <span>{busyIndex === index ? `上傳中 ${progress}%` : "重新選取"}</span>
              <input type="file" accept={IMAGE_ACCEPT} onChange={(event) => replaceFile(index, event)} disabled={busy || !isFirebaseConfigured || !mediaAccess.active} />
            </label>
            <button type="button" className="danger-text-button" onClick={() => removeAsset(index)} disabled={busy}>移除</button>
          </div>
        ))}
      </div>
      {!isFirebaseConfigured ? <p className="teacher-media-status">本機預覽不會上傳圖片；請使用 Firebase 正式站。</p> : (
        <label className="teacher-image-add-picker">
          <span>＋ 加入圖片（可多選）</span>
          <input type="file" accept={IMAGE_ACCEPT} multiple onChange={appendFiles} disabled={busy || !mediaAccess.active} />
        </label>
      )}
      {status ? <p className="teacher-media-status">{status}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
