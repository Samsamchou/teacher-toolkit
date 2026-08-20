const NETWORK_CODES = new Set(["storage/retry-limit-exceeded", "storage/unknown", "functions/unavailable"]);

export function teacherMediaUploadErrorMessage(error) {
  const code = String(error?.code || "");
  if (code === "storage/unauthenticated") return "匿名登入狀態已失效。請重新整理後再選取圖片。";
  if (code === "storage/unauthorized") return "雲端規則拒絕這次上傳。請確認圖片格式與 20 MB 上限，重新整理後再試。";
  if (code === "storage/canceled") return "已取消上傳。";
  if (code === "storage/quota-exceeded") return "雲端儲存空間不足，暫時無法上傳。";
  if (NETWORK_CODES.has(code)) return "上傳網路連線中斷，請確認網路後再試。";
  const message = String(error?.message || "").trim();
  const exposesStoragePath = /teacher-(?:media|image-slides)\//i.test(message);
  return !code && !exposesStoragePath && /[\u3400-\u9fff]/.test(message)
    ? message
    : "教材上傳暫時失敗，請確認網路後再試。";
}
