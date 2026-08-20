import { deleteObject, getDownloadURL, getStorage, ref, uploadBytesResumable } from "firebase/storage";
import { ensureAnonymousSession, isFirebaseConfigured } from "./firebase-client.js";

export const TEACHER_MEDIA_MAX_BYTES = 500 * 1024 * 1024;
export const TEACHER_IMAGE_MAX_BYTES = 20 * 1024 * 1024;

const MEDIA_TYPES = Object.freeze({
  video: { extensions: [".mp4"], contentTypes: ["video/mp4"], label: "MP4 影片", maxBytes: TEACHER_MEDIA_MAX_BYTES },
  presentation: { extensions: [".pdf"], contentTypes: ["application/pdf"], label: "PDF 簡報", maxBytes: TEACHER_MEDIA_MAX_BYTES },
  image: { extensions: [".png", ".jpg", ".jpeg", ".webp"], contentTypes: ["image/png", "image/jpeg", "image/webp"], label: "圖片", maxBytes: TEACHER_IMAGE_MAX_BYTES }
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

function fileExtension(fileName, config) {
  const extension = String(fileName || "").toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || "";
  if (!config.extensions.includes(extension)) throw new Error(`只接受 ${config.label} 檔案。`);
  return extension;
}

function contentTypeForFile(file, extension, config) {
  const browserType = String(file.type || "").toLowerCase();
  if (browserType && config.contentTypes.includes(browserType)) return browserType;
  const byExtension = {
    ".mp4": "video/mp4",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp"
  };
  const resolved = byExtension[extension];
  if (!resolved || !config.contentTypes.includes(resolved)) throw new Error(`只接受 ${config.label} 檔案。`);
  return resolved;
}

function requireTeacherMediaPath(path) {
  const candidate = String(path || "");
  if (/^teacher-image-slides\/[a-z0-9-]{3,96}\/[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(candidate)) return candidate;
  if (/^teacher-media\/[a-z0-9-]{3,96}\/(video|presentation)\/[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(candidate)) return candidate;
  throw new Error("教材路徑無效，已停止操作。");
}

function isTeacherImagePath(path) {
  return String(path || "").startsWith("teacher-image-slides/");
}

async function directTeacherMediaStorage() {
  if (!isFirebaseConfigured) throw new Error("本機預覽不會上傳教材；請使用 Firebase 正式站。");
  await ensureAnonymousSession();
  return getStorage();
}

export function validateTeacherMediaFile(mediaType, file) {
  const config = mediaTypeConfig(mediaType);
  if (!file || typeof file.name !== "string") throw new Error(`請選擇 ${config.label} 檔案。`);
  const extension = fileExtension(file.name, config);
  const contentType = contentTypeForFile(file, extension, config);
  const size = Number(file.size || 0);
  if (!Number.isFinite(size) || size < 1) throw new Error("選取的檔案沒有可上傳內容。");
  if (size > config.maxBytes) throw new Error(`${config.label}單一檔案不可超過 ${mediaType === "image" ? "20 MB" : "500 MB"}。`);
  return { ...config, extension, contentType };
}

async function uploadOnce({ target, file, metadata, onProgress }) {
  const task = uploadBytesResumable(target, file, metadata);
  await new Promise((resolve, reject) => {
    task.on("state_changed", (snapshot) => {
      const total = Number(snapshot.totalBytes || 0);
      const progress = total ? Math.min(100, Math.round((Number(snapshot.bytesTransferred || 0) / total) * 100)) : 0;
      onProgress?.(progress);
    }, reject, resolve);
  });
  onProgress?.(100);
}

export async function uploadTeacherMedia({ lessonId, mediaType, file, onProgress }) {
  const config = validateTeacherMediaFile(mediaType, file);
  const storage = await directTeacherMediaStorage();
  const safeLessonId = safePathSegment(lessonId, "lesson").toLowerCase();
  const safeName = safePathSegment(file.name.replace(new RegExp(`${config.extension}$`, "i"), ""), "media");
  const nonce = typeof crypto?.randomUUID === "function" ? crypto.randomUUID().replaceAll("-", "").slice(0, 12) : Math.random().toString(36).slice(2, 14);
  const path = mediaType === "image"
    ? `teacher-image-slides/${safeLessonId}/${Date.now()}-${nonce}-${safeName}${config.extension}`
    : `teacher-media/${safeLessonId}/${mediaType}/${Date.now()}-${nonce}-${safeName}${config.extension}`;
  const target = ref(storage, path);
  const metadata = {
    contentType: config.contentType,
    customMetadata: { lessonId: safeLessonId, mediaType, originalName: encodeURIComponent(file.name) }
  };
  await uploadOnce({ target, file, metadata, onProgress });
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
  const candidate = requireTeacherMediaPath(path);
  if (isTeacherImagePath(candidate)) {
    throw new Error("Image Slides 舊圖只會在雲端 Save Lesson 成功後由伺服器刪除；瀏覽器不直接刪除。");
  }
  const storage = await directTeacherMediaStorage();
  return deleteObject(ref(storage, candidate));
}
