import { deleteObject, getDownloadURL, getStorage, ref, uploadBytesResumable } from "firebase/storage";
import { ensureAnonymousSession, isFirebaseConfigured } from "./firebase-client.js";

export const TEACHER_MEDIA_MAX_BYTES = 500 * 1024 * 1024;

const MEDIA_TYPES = Object.freeze({
  video: { extension: ".mp4", contentType: "video/mp4", label: "MP4 影片" },
  presentation: { extension: ".pdf", contentType: "application/pdf", label: "PDF 簡報" }
});

function safePathSegment(value, fallback) {
  const normalized = String(value || "").normalize("NFKD").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function mediaTypeConfig(mediaType) {
  const config = MEDIA_TYPES[mediaType];
  if (!config) throw new Error("不支援的教材格式。");
  return config;
}

function requireTeacherMediaPath(path) {
  const candidate = String(path || "");
  if (!/^teacher-media\/[a-z0-9-]{3,96}\/(video|presentation)\/[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(candidate)) {
    throw new Error("教材路徑無效，已停止操作。");
  }
  return candidate;
}

async function directTeacherMediaStorage() {
  if (!isFirebaseConfigured) throw new Error("本機預覽不會上傳教材；請使用 Firebase 正式站。");
  await ensureAnonymousSession();
  return getStorage();
}

export function validateTeacherMediaFile(mediaType, file) {
  const config = mediaTypeConfig(mediaType);
  if (!file || typeof file.name !== "string") throw new Error(`請選擇 ${config.label} 檔案。`);
  if (!file.name.toLowerCase().endsWith(config.extension)) throw new Error(`只接受 ${config.label} 檔案。`);
  const size = Number(file.size || 0);
  if (!Number.isFinite(size) || size < 1) throw new Error("選取的檔案沒有可上傳內容。");
  if (size > TEACHER_MEDIA_MAX_BYTES) throw new Error("單一教材檔不可超過 500 MB。");
  return config;
}

export async function uploadTeacherMedia({ lessonId, mediaType, file, onProgress }) {
  const config = validateTeacherMediaFile(mediaType, file);
  const storage = await directTeacherMediaStorage();
  const safeLessonId = safePathSegment(lessonId, "lesson").toLowerCase();
  const safeName = safePathSegment(file.name.replace(new RegExp(`${config.extension}$`, "i"), ""), "media");
  const nonce = typeof crypto?.randomUUID === "function" ? crypto.randomUUID().replaceAll("-", "").slice(0, 12) : Math.random().toString(36).slice(2, 14);
  const path = `teacher-media/${safeLessonId}/${mediaType}/${Date.now()}-${nonce}-${safeName}${config.extension}`;
  const target = ref(storage, path);
  const task = uploadBytesResumable(target, file, {
    contentType: config.contentType,
    customMetadata: {
      lessonId: safeLessonId,
      mediaType,
      originalName: encodeURIComponent(file.name)
    }
  });
  await new Promise((resolve, reject) => {
    task.on("state_changed", (snapshot) => {
      const total = Number(snapshot.totalBytes || 0);
      const progress = total ? Math.min(100, Math.round((Number(snapshot.bytesTransferred || 0) / total) * 100)) : 0;
      onProgress?.(progress);
    }, reject, resolve);
  });
  onProgress?.(100);
  return {
    kind: mediaType,
    path,
    name: file.name,
    size: Number(file.size || 0),
    contentType: config.contentType,
    uploadedAt: new Date().toISOString()
  };
}

export async function resolveTeacherMediaUrl(path) {
  const storage = await directTeacherMediaStorage();
  return getDownloadURL(ref(storage, requireTeacherMediaPath(path)));
}

export async function deleteTeacherMedia(path) {
  const storage = await directTeacherMediaStorage();
  await deleteObject(ref(storage, requireTeacherMediaPath(path)));
}
