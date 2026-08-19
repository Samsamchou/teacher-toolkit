import { useRef, useState } from "react";
import { isFirebaseConfigured } from "../lib/firebase-client.js";
import { uploadTeacherMedia } from "../lib/teacher-media-client.js";
import { teacherMediaUploadErrorMessage } from "../lib/teacher-media-upload-flow.js";

const TYPE_COPY = {
  video: {
    accept: ".mp4,video/mp4",
    label: "上傳 MP4 影片",
    empty: "尚未上傳影片"
  },
  presentation: {
    accept: ".pdf,application/pdf",
    label: "上傳 PDF 簡報",
    empty: "尚未上傳 PDF 簡報"
  }
};

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
}

export function TeacherMediaUpload({ lessonId, mediaType, media, onChange, onTrackUpload, onTrackRemoval }) {
  const copy = TYPE_COPY[mediaType];
  const fileInput = useRef(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  async function uploadSelectedFile(file) {
    setError("");
    setStatus("");
    setProgress(0);
    try {
      const uploaded = await uploadTeacherMedia({
        lessonId,
        mediaType,
        file,
        onProgress: setProgress
      });
      onChange({ uploadedMedia: uploaded });
      onTrackUpload?.({ newPath: uploaded.path, previousPath: media?.path || "" });
      setStatus(`已上傳 ${uploaded.name}。按下 Save Lesson 後才會清除被取代的舊檔。`);
      return true;
    } catch (cause) {
      setError(teacherMediaUploadErrorMessage(cause));
      return false;
    }
  }

  async function uploadFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    await uploadSelectedFile(file);
    setBusy(false);
  }

  function removeMedia() {
    if (!media?.path || busy) return;
    if (!window.confirm(`確定移除雲端教材「${media.name || "目前檔案"}」嗎？`)) return;
    setError("");
    onTrackRemoval?.(media.path);
    onChange({ uploadedMedia: null });
    setStatus("已排定移除；按下 Save Lesson 後才會刪除雲端教材。")
  }

  return (
    <div className="teacher-media-upload">
      <div className="teacher-media-upload-heading">
        <strong>{copy.label}</strong>
        <span>上限 500 MB</span>
      </div>
      {media?.path ? <div className="teacher-media-current"><span>{media.name || "已上傳教材"}</span><small>{formatBytes(media.size)}</small><button type="button" className="danger-text-button" onClick={removeMedia} disabled={busy}>移除</button></div> : <p className="teacher-media-empty">{copy.empty}</p>}
      {!isFirebaseConfigured ? <p className="teacher-media-status">本機預覽不會上傳教材；請使用已部署的 Firebase 正式站。</p> : (
        <div className="teacher-media-actions">
          <input ref={fileInput} type="file" accept={copy.accept} onChange={uploadFile} disabled={busy} />
          {busy && progress > 0 && progress < 100 ? <span className="teacher-media-progress">上傳中 {progress}%</span> : null}
        </div>
      )}
      {status ? <p className="teacher-media-status">{status}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
