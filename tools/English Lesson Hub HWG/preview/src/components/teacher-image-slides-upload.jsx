import { useState } from "react";
import { isFirebaseConfigured } from "../lib/firebase-client.js";
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

export function TeacherImageSlidesUpload({ lessonId, slides, slideAssets, onChange }) {
  const assets = normalizeSlideAssets(slides, slideAssets);
  const [busy, setBusy] = useState(false);
  const [busyIndex, setBusyIndex] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

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
      const nextAssets = assets.map((asset, assetIndex) => assetIndex === index ? uploaded : asset);
      updateAssets(nextAssets);
      setStatus(`第 ${index + 1} 張已上傳 ${uploaded.name}；雲端 Save Lesson 成功後會刪除被取代的舊圖。`);
    } catch (cause) {
      setError(teacherMediaUploadErrorMessage(cause));
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
      }
      updateAssets(nextAssets);
      setStatus(`已新增 ${files.length} 張圖片；請確認順序後按 Save Lesson。`);
    } catch (cause) {
      setError(teacherMediaUploadErrorMessage(cause));
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }

  function removeAsset(index) {
    if (busy) return;
   updateAssets(assets.filter((_, assetIndex) => assetIndex !== index));
    setStatus("已從 Lesson 移除；雲端 Save Lesson 成功後會由伺服器刪除舊圖。");
  }

  return (
    <div className="teacher-image-slides-upload">
      <div className="teacher-media-upload-heading">
        <strong>Image Slides 圖片上傳</strong>
        <span>PNG／JPG／WebP，單張上限 20 MB</span>
      </div>
      <p className="field-help">本機路徑無法跨瀏覽器使用；選取後會直接上傳並保留投影片順序。移除或替換後，雲端 Save Lesson 成功才會刪除舊圖；匿名瀏覽器不能直接刪除。</p>
      {!assets.length ? <p className="teacher-media-empty">尚未設定圖片；可先加入多張圖片。</p> : null}
      <div className="teacher-image-slide-list">
        {assets.map((asset, index) => (
          <div className="teacher-image-slide-row" key={`${sourceForAsset(asset)}-${index}`}>
            <span className="teacher-image-slide-number">{index + 1}</span>
            <span className="teacher-image-slide-name" title={sourceForAsset(asset)}>{asset.kind === "image" ? `${asset.name || "已上傳圖片"}（${formatBytes(asset.size)}）` : `待重新選取：${asset.source || "未設定"}`}</span>
            <label className="teacher-image-slide-picker">
              <span>{busyIndex === index ? `上傳中 ${progress}%` : "重新選取"}</span>
              <input type="file" accept={IMAGE_ACCEPT} onChange={(event) => replaceFile(index, event)} disabled={busy || !isFirebaseConfigured} />
            </label>
            <button type="button" className="danger-text-button" onClick={() => removeAsset(index)} disabled={busy}>移除</button>
          </div>
        ))}
      </div>
      {!isFirebaseConfigured ? <p className="teacher-media-status">本機預覽不會上傳圖片；請使用 Firebase 正式站。</p> : (
        <label className="teacher-image-add-picker">
          <span>＋ 加入圖片（可多選）</span>
          <input type="file" accept={IMAGE_ACCEPT} multiple onChange={appendFiles} disabled={busy} />
        </label>
      )}
      {status ? <p className="teacher-media-status">{status}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
