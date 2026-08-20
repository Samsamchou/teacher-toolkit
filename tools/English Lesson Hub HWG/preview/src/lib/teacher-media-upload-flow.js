const NETWORK_CODES = new Set(["storage/retry-limit-exceeded", "storage/unknown", "functions/unavailable"]);

export function teacherMediaUploadErrorMessage(error) {
  const code = String(error?.code || "");
  if (code === "teacher-media-unlock-required") return "圖片上傳尚未解鎖。請到 Results 建立並開啟一次性教師解鎖連結。";
  if (code === "teacher-media-unlock-expired") return "圖片上傳解鎖已過期。請重新建立並開啟一次性教師解鎖連結。";
  if (code === "teacher-media-storage-rules-denied") return "雲端圖片規則拒絕這次操作。請重新建立解鎖連結；若仍失敗，請保留此提示供檢查。";
  if (code === "storage/unauthenticated") return "匿名登入狀態已失效。請重新整理後，再開啟教師解鎖連結。";
  if (code === "storage/unauthorized") return "上傳權限仍未生效。請重新開啟教師解鎖連結；若仍失敗，請保留此提示供檢查。";
  if (code === "storage/canceled") return "已取消上傳。";
  if (code === "storage/quota-exceeded") return "雲端儲存空間不足，暫時無法上傳。";
  if (NETWORK_CODES.has(code)) return "上傳網路連線中斷，請確認網路後再試。";
  const message = String(error?.message || "").trim();
  const exposesStoragePath = /teacher-(?:media|image-slides)\//i.test(message);
  return !code && !exposesStoragePath && /[\u3400-\u9fff]/.test(message)
    ? message
    : "教材上傳暫時失敗，請確認網路後再試。";
}
